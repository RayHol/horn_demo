// Wayfinding map with GPS tracking, proximity detection, and AR integration
(function() {
    'use strict';

    // Configuration flags (can be toggled via long-press on help button)
    let USE_FAKE_LOCATION = false; // Set to true for testing with fake coordinates
    let BYPASS_COORDINATE_SYSTEM = false; // Set to true to allow coordinates outside map bounds to still be mapped (for testing)
    const MAP_LOCKED = false; // Set to true to lock map position (future use)
    
    // Fake location coordinates (for testing - should be within GPS bounds)
    const FAKE_LOCATION = {
        lat: 55.748105,
        lng: -4.643886,
        accuracy: 5
    };

    // DOM elements
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');
    const userLocationDot = document.getElementById('userLocationDot');
    const userLocationAccuracyCircle = document.getElementById('userLocationAccuracyCircle');
    const animalHotspots = document.getElementById('animalHotspots');
    const proximityNotification = document.getElementById('proximityNotification');
    const openCameraBtn = document.getElementById('openCameraBtn');
    const recenterBtn = document.getElementById('recenterBtn');
    const helpButton = document.getElementById('helpButton');
    const backButton = document.getElementById('backButton');
    const instructionsOverlay = document.getElementById('instructionsOverlay');
    const instructionsClose = document.getElementById('instructionsClose');
    const leaveConfirmationOverlay = document.getElementById('leaveConfirmationOverlay');
    const leaveConfirmClose = document.getElementById('leaveConfirmClose');
    const leaveConfirmButton = document.getElementById('leaveConfirmButton');
    const boundaryWarningOverlay = document.getElementById('boundaryWarningOverlay');
    const boundaryWarningClose = document.getElementById('boundaryWarningClose');

    // State
    let watchId = null;
    let fakeLocationInterval = null; // Store interval ID for fake location updates
    let animals = [];
    let audio = null;
    let currentUserLocation = null;
    let currentAnimal = null;
    let proximityState = null; // 'in-range', 'nearby', or null
    let audioPrimed = false; // Track if audio has been primed with user interaction
    let instructionsDismissed = false; // Track if instructions overlay has been dismissed
    let boundaryWarningDismissed = false; // Track if boundary warning has been dismissed
    let isOutsideBounds = false; // Track if user is currently outside map bounds
    
    // User location centering state
    let userLocationJitter = { x: 0, y: 0 }; // Small random offset for natural movement
    let targetJitter = { x: 0, y: 0 }; // Target jitter position for smooth transitions
    let lastJitterUpdate = 0;
    let lastSignificantLocationChange = Date.now(); // Track when location last changed significantly
    const JITTER_UPDATE_INTERVAL = 2000; // Update jitter target every 2 seconds
    const MAX_JITTER_RADIUS = 8; // Maximum pixels of jitter (small area)
    const JITTER_SMOOTHING = 0.1; // Smoothing factor for jitter transitions
    const STATIONARY_TIME_THRESHOLD = 3000; // Milliseconds - reduce jitter after being still this long

    // Cooldown functions (from proximity.js)
    function lastKey(id) { 
        return `nearby-last-${id}`; 
    }
    
    function shouldTrigger(id, cooldownMin) {
        const last = parseInt(localStorage.getItem(lastKey(id)) || '0', 10);
        return (Date.now() - last) > (cooldownMin * 60 * 1000);
    }
    
    function markTriggered(id) { 
        localStorage.setItem(lastKey(id), String(Date.now())); 
    }

    // GPS Stabilizer (from proximity.js)
    // Enhanced with stationary detection to reduce jitter when user is still
    function makeGpsStabilizer(opts) {
        const cfg = Object.assign({
            minAccuracy: 30,
            alpha: 0.45,
            minDelta: 0.2,
            emitIntervalMs: 120,
            stationaryThreshold: 1.0, // Meters - if movement is less than this, consider stationary
            stationaryTime: 3000 // Milliseconds - how long to be stationary before applying higher threshold
        }, opts || {});
        let state = null;
        let lastEmit = 0;
        let lastSignificantMove = 0; // Track when user last moved significantly
        let stationarySince = null; // Track when user became stationary

        function dist(a, b) {
            const toRad = d => d * Math.PI / 180;
            const R = 6371000;
            const dLat = toRad(b.lat - a.lat);
            const dLng = toRad(b.lng - a.lng);
            const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
            const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
            return 2*R*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
        }

        return function push(raw, onEmit) {
            if (!raw) return;
            const acc = (raw.accuracy != null && isFinite(raw.accuracy)) ? raw.accuracy : Infinity;
            if (acc > cfg.minAccuracy) return;
            const sample = { lat: raw.latitude, lng: raw.longitude, acc: acc };

            if (!state) {
                state = sample;
                onEmit && onEmit(state);
                lastEmit = Date.now();
                lastSignificantMove = Date.now();
                return;
            }
            
            const previousState = { ...state };
            state = {
                lat: state.lat + cfg.alpha * (sample.lat - state.lat),
                lng: state.lng + cfg.alpha * (sample.lng - state.lng),
                acc: (state.acc + sample.acc) / 2
            };

            const now = Date.now();
            const moved = dist(previousState, sample);
            
            // Check if user is moving significantly
            if (moved >= cfg.stationaryThreshold) {
                // User is moving - reset stationary tracking
                lastSignificantMove = now;
                stationarySince = null;
            } else {
                // User appears stationary
                if (stationarySince === null) {
                    stationarySince = now;
                }
            }
            
            // Use higher threshold if user has been stationary for a while
            const timeSinceLastMove = now - lastSignificantMove;
            const isStationary = timeSinceLastMove >= cfg.stationaryTime;
            const effectiveMinDelta = isStationary ? Math.max(cfg.minDelta, cfg.stationaryThreshold * 0.5) : cfg.minDelta;
            
            // Only emit if movement exceeds threshold
            if (moved < effectiveMinDelta) return;
            if (now - lastEmit < cfg.emitIntervalMs) return;
            
            lastEmit = now;
            onEmit && onEmit(state);
        };
    }

    // Haversine distance calculation
    function haversineMeters(a, b) {
        const toRad = (d) => d * Math.PI / 180;
        const R = 6371000;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const sinDLat = Math.sin(dLat / 2);
        const sinDLng = Math.sin(dLng / 2);
        const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
        const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        return R * c;
    }

    // Load animals from JSON
    async function loadAnimals() {
        try {
            // Switch between testing and production data by commenting/uncommenting the appropriate line:
            const res = await fetch('./data/animals.json', { cache: 'no-cache' }); // Production/Onsite
            // const res = await fetch('./data/testing.json', { cache: 'no-cache' }); // Testing/Home
            const cfg = await res.json();
            animals = Array.isArray(cfg.animals) ? cfg.animals : [];
            renderAnimalHotspots();
        } catch (err) {
            console.error('Failed to load animals.json:', err);
        }
    }

    // Audio and haptics
    function ensureAudio() {
        if (!audio) {
            audio = new Audio('./Geo-pin-app/assets/bell.mp3');
            audio.volume = 0.5;
        }
        return audio;
    }

    function vibrate() {
        // Only vibrate if user has interacted with the page
        if (!audioPrimed) return;
        
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([100, 200, 100]);
            } catch (err) {
                console.log('Vibration failed:', err);
            }
        } else {
            console.log('Vibration not supported');
        }
    }
    
    // Prime audio with user interaction (required by browsers)
    function primeAudio() {
        if (audioPrimed) return;
        
        try {
            const audioObj = ensureAudio();
            if (audioObj) {
                // Play and immediately pause to "prime" the audio
                audioObj.play().then(() => {
                    audioObj.pause();
                    audioObj.currentTime = 0;
                    audioPrimed = true;
                }).catch(() => {
                    // Audio priming failed, will try again on next interaction
                });
            }
        } catch (err) {
            // Ignore errors during priming
        }
    }

    // Interactive Map class (adapted from temp/map.html)
    class InteractiveMap {
        constructor() {
            this.mapContainer = mapContainer;
            this.mapImage = mapImage;
            
            // Map state
            this.scale = 0.35;
            this.minScale = 0.15;
            this.maxScale = 1;
            this.translateX = 0;
            this.translateY = 0;
            
            // Animation state
            this.targetScale = this.scale;
            this.targetTranslateX = this.translateX;
            this.targetTranslateY = this.translateY;
            this.animationSpeed = 0.25; // Increased for smoother, faster response
            
            // Touch/Drag state
            this.isDragging = false;
            this.lastTouchX = 0;
            this.lastTouchY = 0;
            this.lastTouchDistance = 0;
            
            // Auto-recenter state
            this.userHasManuallyMoved = false;
            this.autoRecenterEnabled = true;
            this.isAutoRecenterActive = false;
            this.keepUserCentered = true; // Keep user location centered on map
            this.cannotCenterAtBoundary = false; // Track when we can't center due to boundary limits
            
            this.init();
            this.updateTransform();
            this.startAnimationLoop();
        }
        
        init() {
            if (MAP_LOCKED) {
                // Disable pan/zoom if map is locked
                return;
            }

            // Mouse events
            this.mapContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.mapContainer.addEventListener('wheel', this.handleWheel.bind(this));
            
            // Touch events
            this.mapContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            this.mapContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.mapContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            
            // Prevent context menu
            this.mapContainer.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        handleMouseDown(e) {
            this.isDragging = true;
            this.lastTouchX = e.clientX;
            this.lastTouchY = e.clientY;
            this.mapImage.classList.add('dragging');
            e.preventDefault();
        }
        
        handleMouseMove(e) {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - this.lastTouchX;
            const deltaY = e.clientY - this.lastTouchY;
            
            // Only mark as manual if there's actual movement
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                this.userHasManuallyMoved = true;
            }
            
            this.targetTranslateX += deltaX;
            this.targetTranslateY += deltaY;
            
            this.lastTouchX = e.clientX;
            this.lastTouchY = e.clientY;
            
            e.preventDefault();
        }
        
        handleMouseUp(e) {
            this.isDragging = false;
            this.mapImage.classList.remove('dragging');
        }
        
        handleWheel(e) {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale + delta));
            
            if (newScale !== this.targetScale) {
                // Zooming doesn't disable auto-recenter - only panning does
                
                const rect = this.mapContainer.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const scaleDiff = newScale - this.targetScale;
                this.targetTranslateX -= (mouseX - centerX) * scaleDiff;
                this.targetTranslateY -= (mouseY - centerY) * scaleDiff;
                
                this.targetScale = newScale;
            }
        }
        
        handleTouchStart(e) {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastTouchX = e.touches[0].clientX;
                this.lastTouchY = e.touches[0].clientY;
                this.mapImage.classList.add('dragging');
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.mapImage.classList.remove('dragging');
                
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                this.lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) + 
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
            }
            
            e.preventDefault();
        }
        
        handleTouchMove(e) {
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - this.lastTouchX;
                const deltaY = e.touches[0].clientY - this.lastTouchY;
                
                // Only mark as manual if there's actual movement
                if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                    this.userHasManuallyMoved = true;
                }
                
                this.targetTranslateX += deltaX;
                this.targetTranslateY += deltaY;
                
                this.lastTouchX = e.touches[0].clientX;
                this.lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // Pinch zoom doesn't disable auto-recenter - only panning does
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) + 
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                if (this.lastTouchDistance > 0) {
                    const scaleChange = currentDistance / this.lastTouchDistance;
                    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale * scaleChange));
                    
                    if (newScale !== this.targetScale) {
                        const rect = this.mapContainer.getBoundingClientRect();
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        
                        const touchCenterX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
                        const touchCenterY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
                        
                        const scaleDiff = newScale - this.targetScale;
                        this.targetTranslateX -= (touchCenterX - centerX) * scaleDiff;
                        this.targetTranslateY -= (touchCenterY - centerY) * scaleDiff;
                        
                        this.targetScale = newScale;
                    }
                }
                
                this.lastTouchDistance = currentDistance;
            }
            
            e.preventDefault();
        }
        
        handleTouchEnd(e) {
            this.isDragging = false;
            this.mapImage.classList.remove('dragging');
            this.lastTouchDistance = 0;
        }
        
        updateTransform() {
            this.scale += (this.targetScale - this.scale) * this.animationSpeed;
            this.translateX += (this.targetTranslateX - this.translateX) * this.animationSpeed;
            this.translateY += (this.targetTranslateY - this.translateY) * this.animationSpeed;
            
            const containerRect = this.mapContainer.getBoundingClientRect();
            const imageRect = this.mapImage.getBoundingClientRect();
            
            const scaledWidth = imageRect.width * this.scale;
            const scaledHeight = imageRect.height * this.scale;
            
            const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2 + 250);
            const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2 + 250);
            
            // During auto-recenter, be more lenient with bounds to allow recentering even at max zoom
            // Use a larger tolerance when at max zoom (when scale is close to maxScale)
            const isNearMaxZoom = this.targetScale >= this.maxScale * 0.95;
            const baseTolerance = this.isAutoRecenterActive ? 1.5 : 1.0;
            const zoomTolerance = isNearMaxZoom ? 2.0 : 1.0;
            const boundsTolerance = this.isAutoRecenterActive ? baseTolerance * zoomTolerance : 1.0;
            const effectiveMaxTranslateX = maxTranslateX * boundsTolerance;
            const effectiveMaxTranslateY = maxTranslateY * boundsTolerance;
            
            if (Math.abs(this.targetTranslateX) > effectiveMaxTranslateX) {
                this.targetTranslateX = this.targetTranslateX > 0 ? effectiveMaxTranslateX : -effectiveMaxTranslateX;
            }
            
            if (Math.abs(this.targetTranslateY) > effectiveMaxTranslateY) {
                this.targetTranslateY = this.targetTranslateY > 0 ? effectiveMaxTranslateY : -effectiveMaxTranslateY;
            }
            
            if (Math.abs(this.translateX) > maxTranslateX) {
                this.translateX = this.translateX > 0 ? maxTranslateX : -maxTranslateX;
            }
            
            if (Math.abs(this.translateY) > maxTranslateY) {
                this.translateY = this.translateY > 0 ? maxTranslateY : -maxTranslateY;
            }
            
            this.mapImage.style.transform = `translate(-50%, -50%) translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
            
            // Update positions of overlays when map transforms
            updateOverlayPositions();
        }
        
        startAnimationLoop() {
            const self = this;
            const animate = () => {
                // Always update user location dot position in animation loop for smooth updates
                // Only update if we have the necessary elements
                if (userLocationDot && currentUserLocation && self.mapContainer && self.mapImage) {
                    // Always ensure dot is visible
                    userLocationDot.style.display = 'block';
                    
                    let dotX, dotY;
                    
                    if (self.keepUserCentered && !self.userHasManuallyMoved && !self.cannotCenterAtBoundary) {
                        // Auto-centering mode: update jitter and position at center
                        updateUserLocationJitter();
                        const containerRect = self.mapContainer.getBoundingClientRect();
                        const centerX = containerRect.width / 2;
                        const centerY = containerRect.height / 2;
                        dotX = centerX + userLocationJitter.x;
                        dotY = centerY + userLocationJitter.y;
                        userLocationDot.style.left = dotX + 'px';
                        userLocationDot.style.top = dotY + 'px';
                    } else {
                        // Manual mode: show actual GPS location on map
                        // Only try if mapInstance is available (for coordinate conversion)
                        if (mapInstance) {
                            try {
                                const coords = gpsToScreenCoordinates(currentUserLocation.lat, currentUserLocation.lng, true);
                                // Ensure coordinates are valid numbers
                                if (coords && isFinite(coords.x) && isFinite(coords.y)) {
                                    dotX = coords.x;
                                    dotY = coords.y;
                                    userLocationDot.style.left = dotX + 'px';
                                    userLocationDot.style.top = dotY + 'px';
                                }
                            } catch (e) {
                                // If coordinate conversion fails, don't update position
                                console.warn('Failed to update user location dot position:', e);
                            }
                        }
                    }
                    
                    // Update accuracy circle position and size in animation loop
                    if (userLocationAccuracyCircle && dotX !== undefined && dotY !== undefined && currentUserLocation) {
                        userLocationAccuracyCircle.style.left = dotX + 'px';
                        userLocationAccuracyCircle.style.top = dotY + 'px';
                        userLocationAccuracyCircle.style.display = 'block';
                        
                        // Convert GPS accuracy (meters) to screen pixels (diameter)
                        const accuracyMeters = currentUserLocation.accuracy || currentUserLocation.acc || 10;
                        const diameterPixels = metersToScreenPixels(accuracyMeters, currentUserLocation.lat);
                        
                        if (diameterPixels > 0 && isFinite(diameterPixels)) {
                            // Ensure minimum size for visibility
                            const minSize = 40; // Minimum 40px diameter
                            const size = Math.max(minSize, diameterPixels);
                            userLocationAccuracyCircle.style.width = size + 'px';
                            userLocationAccuracyCircle.style.height = size + 'px';
                        }
                    }
                }
                self.updateTransform();
                
                // Update hotspot positions smoothly every frame for fixed appearance
                updateHotspotPositions();
                
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }

        // Get current map transform for coordinate conversion
        getMapTransform() {
            const containerRect = this.mapContainer.getBoundingClientRect();
            const imageRect = this.mapImage.getBoundingClientRect();
            const imageCenterX = containerRect.width / 2;
            const imageCenterY = containerRect.height / 2;
            
            // Use natural image dimensions if available, otherwise use displayed dimensions
            const naturalWidth = this.mapImage.naturalWidth || imageRect.width;
            const naturalHeight = this.mapImage.naturalHeight || imageRect.height;
            
            return {
                centerX: imageCenterX + this.translateX,
                centerY: imageCenterY + this.translateY,
                scale: this.scale,
                imageWidth: naturalWidth,
                imageHeight: naturalHeight,
                displayedWidth: imageRect.width,
                displayedHeight: imageRect.height
            };
        }

        // Recenter map to user's current location
        recenterToUserLocation(userLocation, resetManualFlag = false) {
            if (!userLocation) return;
            
            // Get current screen position of user location (where it would be without centering)
            const currentCoords = gpsToScreenCoordinates(userLocation.lat, userLocation.lng, true);
            
            // Get container dimensions
            const containerRect = this.mapContainer.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            
            // Calculate the difference between current position and center (with jitter)
            const targetX = centerX + userLocationJitter.x;
            const targetY = centerY + userLocationJitter.y;
            const deltaX = targetX - currentCoords.x;
            const deltaY = targetY - currentCoords.y;
            
            // Adjust target translation to move user location to center
            this.targetTranslateX += deltaX;
            this.targetTranslateY += deltaY;
            
            // Reset manual movement flag if requested (e.g., when user clicks recenter button)
            if (resetManualFlag) {
                this.userHasManuallyMoved = false;
            }
        }

        // Check if user location is near edge and auto-recenter if needed
        // Now also handles keeping user centered when keepUserCentered is true
        checkAndAutoRecenter(userLocation) {
            if (!userLocation || !this.autoRecenterEnabled) {
                return;
            }
            
            // If keepUserCentered is enabled and user hasn't manually moved, always keep user centered
            if (this.keepUserCentered && !this.userHasManuallyMoved) {
                // Get current screen position of user location (where it would be without centering)
                const currentCoords = gpsToScreenCoordinates(userLocation.lat, userLocation.lng, true);
                
                // Get container dimensions
                const containerRect = this.mapContainer.getBoundingClientRect();
                const centerX = containerRect.width / 2;
                const centerY = containerRect.height / 2;
                
                // Calculate the difference between current position and center (with jitter)
                const targetX = centerX + userLocationJitter.x;
                const targetY = centerY + userLocationJitter.y;
                const deltaX = targetX - currentCoords.x;
                const deltaY = targetY - currentCoords.y;
                
                // Use a smaller adjustment factor for smoother, less jerky movement
                // The animation speed will handle the smooth interpolation
                const centeringFactor = 0.15; // Reduced from 0.3 for smoother movement
                const newTranslateX = this.targetTranslateX + deltaX * centeringFactor;
                const newTranslateY = this.targetTranslateY + deltaY * centeringFactor;
                
                // Check if we can actually move that far (check against map bounds)
                const imageRect = this.mapImage.getBoundingClientRect();
                const scaledWidth = imageRect.width * this.targetScale;
                const scaledHeight = imageRect.height * this.targetScale;
                
                const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2 + 250);
                const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2 + 250);
                
                // Use tolerance for auto-recenter
                const isNearMaxZoom = this.targetScale >= this.maxScale * 0.95;
                const baseTolerance = 1.5;
                const zoomTolerance = isNearMaxZoom ? 2.0 : 1.0;
                const boundsTolerance = baseTolerance * zoomTolerance;
                const effectiveMaxTranslateX = maxTranslateX * boundsTolerance;
                const effectiveMaxTranslateY = maxTranslateY * boundsTolerance;
                
                // Check if the new translation would exceed bounds
                const wouldExceedX = Math.abs(newTranslateX) > effectiveMaxTranslateX;
                const wouldExceedY = Math.abs(newTranslateY) > effectiveMaxTranslateY;
                
                if (wouldExceedX || wouldExceedY) {
                    // Can't fully center - map is at boundary limits
                    // Still try to move as close as possible, but show actual location
                    this.isAutoRecenterActive = false;
                    this.cannotCenterAtBoundary = true;
                    
                    // Clamp to maximum allowed translation
                    if (wouldExceedX) {
                        this.targetTranslateX = newTranslateX > 0 ? effectiveMaxTranslateX : -effectiveMaxTranslateX;
                    } else {
                        this.targetTranslateX = newTranslateX;
                    }
                    
                    if (wouldExceedY) {
                        this.targetTranslateY = newTranslateY > 0 ? effectiveMaxTranslateY : -effectiveMaxTranslateY;
                    } else {
                        this.targetTranslateY = newTranslateY;
                    }
                    return;
                }
                
                // We can center, so proceed
                this.isAutoRecenterActive = true;
                this.cannotCenterAtBoundary = false;
                this.targetTranslateX = newTranslateX;
                this.targetTranslateY = newTranslateY;
                return;
            }
            
            // Original edge-based recentering logic (when keepUserCentered is false)
            if (this.userHasManuallyMoved) {
                return;
            }
            
            // Get current screen position of user location
            const currentCoords = gpsToScreenCoordinates(userLocation.lat, userLocation.lng, true);
            
            // Get container dimensions
            const containerRect = this.mapContainer.getBoundingClientRect();
            const width = containerRect.width;
            const height = containerRect.height;
            
            // Calculate edge thresholds (10% from each edge)
            const edgeThreshold = 0.1;
            const leftThreshold = width * edgeThreshold;
            const rightThreshold = width * (1 - edgeThreshold);
            const topThreshold = height * edgeThreshold;
            const bottomThreshold = height * (1 - edgeThreshold);
            
            // Check if user location is near any edge
            const nearLeftEdge = currentCoords.x < leftThreshold;
            const nearRightEdge = currentCoords.x > rightThreshold;
            const nearTopEdge = currentCoords.y < topThreshold;
            const nearBottomEdge = currentCoords.y > bottomThreshold;
            
            // If near any edge, recenter
            if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge) {
                // Mark that we're actively auto-recentering
                this.isAutoRecenterActive = true;
                
                const centerX = width / 2;
                const centerY = height / 2;
                
                // Calculate the difference between current position and center
                const deltaX = centerX - currentCoords.x;
                const deltaY = centerY - currentCoords.y;
                
                // Smoothly adjust target translation to move user location toward center
                // Use a smaller adjustment for smoother auto-recentering
                this.targetTranslateX += deltaX * 0.1;
                this.targetTranslateY += deltaY * 0.1;
            } else {
                // Not near edge, so we're not actively auto-recentering
                this.isAutoRecenterActive = false;
            }
        }
    }

    // Global map instance
    let mapInstance = null;

    // Convert GPS to screen coordinates
    // @param {boolean} forUserLocation - If true, uses bypass mode for user location when enabled
    function gpsToScreenCoordinates(lat, lng, forUserLocation = false) {
        if (!mapInstance) return { x: 0, y: 0 };
        
        // Convert GPS to map pixel coordinates (using map image pixel dimensions)
        // This will work even if coordinates are outside bounds - it will just calculate
        // normalized coordinates that may be negative or > 1, which is fine
        const mapPixels = MapConfig.gpsToMapPixels(lat, lng);
        
        // Get map transform
        const transform = mapInstance.getMapTransform();
        
        // Convert map pixels to screen coordinates
        // The image is centered at (centerX, centerY) and scaled by `scale`
        // Map pixels are relative to the natural image size
        const offsetX = (mapPixels.x - transform.imageWidth / 2) * transform.scale;
        const offsetY = (mapPixels.y - transform.imageHeight / 2) * transform.scale;
        
        const screenX = transform.centerX + offsetX;
        const screenY = transform.centerY + offsetY;
        
        return { x: screenX, y: screenY };
    }

    // Convert GPS accuracy (meters) to screen pixels (diameter)
    function metersToScreenPixels(meters, centerLat) {
        if (!mapInstance || !meters || meters <= 0) return 0;
        
        // Calculate the distance in meters that corresponds to the map's width
        const bounds = MapConfig.gpsBounds;
        const toRad = (d) => d * Math.PI / 180;
        const R = 6371000; // Earth radius in meters
        
        // Calculate distance across map width at the center latitude
        const lat1 = toRad(centerLat);
        const dLng = toRad(bounds.east - bounds.west);
        const mapWidthMeters = Math.abs(Math.cos(lat1) * R * dLng);
        
        // Get map transform
        const transform = mapInstance.getMapTransform();
        
        // Calculate pixels per meter
        const mapWidthPixels = transform.imageWidth * transform.scale;
        const pixelsPerMeter = mapWidthPixels / mapWidthMeters;
        
        // Return diameter in pixels (accuracy is radius, so multiply by 2)
        return meters * pixelsPerMeter * 2;
    }

    // Update user location jitter for natural movement
    // Reduces jitter when user is stationary
    function updateUserLocationJitter() {
        const now = Date.now();
        const timeSinceLastMove = now - lastSignificantLocationChange;
        const isStationary = timeSinceLastMove >= STATIONARY_TIME_THRESHOLD;
        
        // Update target jitter position periodically
        if (now - lastJitterUpdate >= JITTER_UPDATE_INTERVAL) {
            lastJitterUpdate = now;
            
            // Reduce or eliminate jitter when stationary
            if (isStationary) {
                // Gradually reduce jitter to zero when stationary
                targetJitter.x = 0;
                targetJitter.y = 0;
            } else {
                // Generate random jitter target within a small radius when moving
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * MAX_JITTER_RADIUS;
                targetJitter.x = Math.cos(angle) * radius;
                targetJitter.y = Math.sin(angle) * radius;
            }
        }
        
        // Smoothly interpolate current jitter toward target
        // Use faster smoothing when stationary to reduce jitter quicker
        const smoothing = isStationary ? JITTER_SMOOTHING * 2 : JITTER_SMOOTHING;
        userLocationJitter.x += (targetJitter.x - userLocationJitter.x) * smoothing;
        userLocationJitter.y += (targetJitter.y - userLocationJitter.y) * smoothing;
    }

    // Update user location dot
    function updateUserLocation(location) {
        if (!location) return;
        
        // Check if location has changed significantly
        if (currentUserLocation) {
            const distance = haversineMeters(
                { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
                { lat: location.lat, lng: location.lng }
            );
            // If moved more than 1 meter, update the significant movement timestamp
            if (distance >= 1.0) {
                lastSignificantLocationChange = Date.now();
            }
        } else {
            // First location update
            lastSignificantLocationChange = Date.now();
        }
        
        currentUserLocation = location;
        
        // Update jitter for natural movement
        updateUserLocationJitter();
        
        // Get container dimensions
        const containerRect = mapContainer ? mapContainer.getBoundingClientRect() : null;
        if (!containerRect || !userLocationDot) return;
        
        // Check if map instance is ready
        if (!mapInstance) return;
        
        // Check if user has manually moved the map
        const userHasManuallyMoved = mapInstance.userHasManuallyMoved || false;
        const keepUserCentered = mapInstance.keepUserCentered !== false;
        const cannotCenterAtBoundary = mapInstance.cannotCenterAtBoundary || false;
        
        // Always ensure dot is visible
        userLocationDot.style.display = 'block';
        
        // Determine position for both dot and accuracy circle
        let dotX, dotY;
        
        // If user has manually moved, auto-centering is disabled, or we can't center at boundary, show actual GPS location
        if (userHasManuallyMoved || !keepUserCentered || cannotCenterAtBoundary) {
            // Convert GPS coordinates to screen position (actual location on map)
            try {
                const coords = gpsToScreenCoordinates(location.lat, location.lng, true);
                // Ensure coordinates are valid numbers
                if (coords && isFinite(coords.x) && isFinite(coords.y)) {
                    dotX = coords.x;
                    dotY = coords.y;
                    userLocationDot.style.left = dotX + 'px';
                    userLocationDot.style.top = dotY + 'px';
                }
            } catch (e) {
                console.warn('Failed to convert GPS to screen coordinates:', e);
            }
        } else {
            // Auto-centering mode: position dot at center with jitter
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            dotX = centerX + userLocationJitter.x;
            dotY = centerY + userLocationJitter.y;
            userLocationDot.style.left = dotX + 'px';
            userLocationDot.style.top = dotY + 'px';
        }
        
        // Update accuracy circle position and size
        if (userLocationAccuracyCircle && dotX !== undefined && dotY !== undefined) {
            userLocationAccuracyCircle.style.left = dotX + 'px';
            userLocationAccuracyCircle.style.top = dotY + 'px';
            userLocationAccuracyCircle.style.display = 'block';
            
            // Convert GPS accuracy (meters) to screen pixels (diameter)
            const accuracyMeters = location.accuracy || location.acc || 10; // Default to 10m if not provided
            const diameterPixels = metersToScreenPixels(accuracyMeters, location.lat);
            
            if (diameterPixels > 0 && isFinite(diameterPixels)) {
                // Ensure minimum size for visibility
                const minSize = 40; // Minimum 40px diameter
                const size = Math.max(minSize, diameterPixels);
                userLocationAccuracyCircle.style.width = size + 'px';
                userLocationAccuracyCircle.style.height = size + 'px';
            }
        }
        
        // Check if user is outside map bounds
        checkBoundaryWarning(location);
        
        // Check if we need to auto-recenter (this will move the map to keep user centered)
        mapInstance.checkAndAutoRecenter(location);
    }

    // Check if user is at map boundaries and show warning
    function checkBoundaryWarning(location) {
        if (!location || !MapConfig) return;
        
        // Check if location is outside map bounds
        const withinBounds = MapConfig.isWithinBounds(location.lat, location.lng);
        
        // Only show warning if user has dismissed instructions (to avoid showing multiple overlays)
        if (!instructionsDismissed) return;
        
        // Show warning when leaving bounds, hide when returning
        if (!withinBounds && !isOutsideBounds) {
            // User just left the bounds
            isOutsideBounds = true;
            if (!boundaryWarningDismissed && boundaryWarningOverlay) {
                boundaryWarningOverlay.classList.remove('hidden');
            }
        } else if (withinBounds && isOutsideBounds) {
            // User returned to bounds
            isOutsideBounds = false;
            if (boundaryWarningOverlay) {
                boundaryWarningOverlay.classList.add('hidden');
                // Reset dismissed flag when they return, so it shows again if they leave
                boundaryWarningDismissed = false;
            }
        }
    }

    // Hide boundary warning overlay
    function hideBoundaryWarning() {
        if (boundaryWarningOverlay) {
            boundaryWarningOverlay.classList.add('hidden');
            boundaryWarningDismissed = true;
        }
    }

    // Store hotspot element references for smooth updates
    const hotspotElements = new Map(); // Map<animalId, HTMLElement>
    
    // Render animal hotspots (only creates DOM elements, doesn't update positions)
    function renderAnimalHotspots() {
        if (!animalHotspots) return;
        
        // Clear existing hotspots that are no longer in the animals array
        const currentAnimalIds = new Set(animals.map(a => a.id));
        hotspotElements.forEach((element, animalId) => {
            if (!currentAnimalIds.has(animalId)) {
                element.remove();
                hotspotElements.delete(animalId);
            }
        });
        
        // Create or update hotspots
        animals.forEach(animal => {
            let hotspot = hotspotElements.get(animal.id);
            
            if (!hotspot) {
                // Create new hotspot element
                hotspot = document.createElement('div');
                hotspot.className = 'animal-hotspot';
                hotspot.dataset.animalId = animal.id;
                
                const pin = document.createElement('div');
                pin.className = 'animal-pin';
                
                const label = document.createElement('div');
                label.className = 'animal-pin-label';
                label.textContent = animal.name;
                
                hotspot.appendChild(pin);
                hotspot.appendChild(label);
                animalHotspots.appendChild(hotspot);
                
                hotspotElements.set(animal.id, hotspot);
            }
            // Position will be updated in updateHotspotPositions()
        });
    }
    
    // Update hotspot positions smoothly (called every frame)
    function updateHotspotPositions() {
        if (!mapInstance || !animalHotspots) return;
        
        hotspotElements.forEach((hotspot, animalId) => {
            const animal = animals.find(a => a.id === animalId);
            if (!animal) return;
            
            try {
                // Animal hotspots always use real positioning
                const coords = gpsToScreenCoordinates(animal.location.lat, animal.location.lng, false);
                if (coords && isFinite(coords.x) && isFinite(coords.y)) {
                    hotspot.style.left = coords.x + 'px';
                    hotspot.style.top = coords.y + 'px';
                }
            } catch (e) {
                // Silently handle coordinate conversion errors
            }
        });
    }

    // Update overlay positions when map transforms
    function updateOverlayPositions() {
        if (currentUserLocation) {
            updateUserLocation(currentUserLocation);
        }
        // Update hotspot positions smoothly instead of re-rendering
        updateHotspotPositions();
    }

    // Proximity detection and notifications
    function checkProximity(userLocation) {
        let nearest = null;
        let nearestDistance = Infinity;
        let inRangeAnimal = null;
        let inRangeDistance = Infinity;
        let nearbyAnimal = null;
        let nearbyDistance = Infinity;

        animals.forEach(animal => {
            const distance = haversineMeters(userLocation, animal.location);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = animal;
            }
            
            // Check 10m range (in range)
            if (distance <= 10 && distance < inRangeDistance) {
                inRangeDistance = distance;
                inRangeAnimal = animal;
            }
            
            // Check 10-25m range (nearby)
            if (distance > 10 && distance <= 25 && distance < nearbyDistance) {
                nearbyDistance = distance;
                nearbyAnimal = animal;
            }
        });

        // Handle proximity states
        if (inRangeAnimal) {
            if (proximityState !== 'in-range' || currentAnimal?.id !== inRangeAnimal.id) {
                handleInRange(inRangeAnimal, inRangeDistance);
            }
        } else if (nearbyAnimal) {
            if (proximityState !== 'nearby' || currentAnimal?.id !== nearbyAnimal.id) {
                handleNearby(nearbyAnimal, nearbyDistance);
            }
        } else {
            if (proximityState !== null) {
                clearProximityState();
            }
        }
    }

    function handleInRange(animal, distance) {
        const isFirstTime = proximityState !== 'in-range' || currentAnimal?.id !== animal.id;
        proximityState = 'in-range';
        currentAnimal = animal;
        
        // Only show notifications if instructions have been dismissed
        if (!instructionsDismissed) {
            // Still track the state, but don't show UI yet
            return;
        }
        
        // Show notification and camera button
        showInRangeNotifications(animal, isFirstTime);
    }
    
    // Separate function to show the actual notifications (called when instructions are dismissed)
    function showInRangeNotifications(animal, isFirstTime) {
        // Show notification
        if (proximityNotification) {
            proximityNotification.textContent = `An animal is nearby: ${animal.name}. Open the camera to scan the area.`;
            proximityNotification.className = 'proximity-notification show';
        }
        
        // Show and enable camera button
        if (openCameraBtn) {
            openCameraBtn.classList.add('show');
            openCameraBtn.disabled = false;
            // Remove any existing onclick handler first
            openCameraBtn.onclick = null;
            // Set new onclick handler with current animal
            openCameraBtn.onclick = function() {
                window.location.href = `./animalsAR.html?animalId=${encodeURIComponent(animal.id)}`;
            };
        }
        
        // Trigger sound and vibration when notification appears
        // Always trigger on first entry, otherwise respect cooldown
        const cd = (animal.ping && animal.ping.cooldownMinutes) ? animal.ping.cooldownMinutes : 15;
        if (isFirstTime || shouldTrigger(animal.id, cd)) {
            triggerNotificationSoundAndVibration(animal);
        }
    }
    
    // Function to show notifications if already in range when instructions are dismissed
    function checkAndShowNotificationsIfInRange() {
        if (!instructionsDismissed || !currentUserLocation) return;
        
        // If we're already in range, show the notifications now
        if (proximityState === 'in-range' && currentAnimal) {
            showInRangeNotifications(currentAnimal, true);
        } else if (proximityState === 'nearby' && currentAnimal) {
            // If we're in nearby range, show that notification
            showNearbyNotifications(currentAnimal);
        } else {
            // Otherwise re-check proximity to trigger notifications
            checkProximity(currentUserLocation);
        }
    }
    
    function triggerNotificationSoundAndVibration(animal) {
        // Only play if audio has been primed (user has interacted)
        if (!audioPrimed) {
            // Try to prime now (might work if there was recent interaction)
            primeAudio();
            return; // Skip this trigger if not primed yet
        }
        
        // Play sound
        try {
            const audioObj = ensureAudio();
            if (audioObj) {
                audioObj.currentTime = 0; // Reset to start
                audioObj.play().catch(err => {
                    console.log('Audio play failed:', err);
                });
            }
        } catch (err) {
            console.log('Audio error:', err);
        }
        
        // Vibrate
        vibrate();
        
        // Mark as triggered
        markTriggered(animal.id);
    }

    function handleNearby(animal, distance) {
        proximityState = 'nearby';
        currentAnimal = animal;
        
        // Only show notifications if instructions have been dismissed
        if (!instructionsDismissed) {
            return; // Don't show anything until user dismisses instructions
        }
        
        // Show softer notification
        if (proximityNotification) {
            proximityNotification.textContent = `You are near ${animal.name}. Move closer to unlock it.`;
            proximityNotification.className = 'proximity-notification show nearby';
        }
        
        // Hide camera button
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
        }
    }
    
    function showNearbyNotifications(animal) {
        // Show softer notification
        if (proximityNotification) {
            proximityNotification.textContent = `You are near ${animal.name}. Move closer to unlock it.`;
            proximityNotification.className = 'proximity-notification show nearby';
        }
        
        // Hide camera button
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
        }
    }

    function clearProximityState() {
        proximityState = null;
        currentAnimal = null;
        
        // Hide notification
        if (proximityNotification) {
            proximityNotification.classList.remove('show');
        }
        
        // Hide camera button and clear onclick
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
            openCameraBtn.onclick = null;
        }
    }

    // GPS position handler
    // Reduced emitIntervalMs for more frequent updates and smoother movement
    // Enhanced with stationary detection to reduce jitter when still
    const pushStabilized = makeGpsStabilizer({ 
        minAccuracy: 30, 
        alpha: 0.45, 
        minDelta: 0.2, 
        emitIntervalMs: 80,
        stationaryThreshold: 1.0, // Consider stationary if movement < 1 meter
        stationaryTime: 3000 // Apply higher threshold after 3 seconds of being still
    });

    function onPosition(pos) {
        // Set location permission flag for animalsAR.html
        try {
            localStorage.setItem('geopin-location-permission', 'granted');
        } catch (_) {}
        
        // Use the actual GPS coordinates (will be fake GPS if set in browser)
        // In fake location mode, we just allow coordinates outside bounds to be mapped
        pushStabilized(pos.coords, handleStabilizedLocation);
    }

    function handleStabilizedLocation(location) {
        updateUserLocation(location);
        checkProximity(location);
    }

    function onError(err) {
        console.error('Location error:', err);
        if (USE_FAKE_LOCATION) {
            // Fallback to hardcoded fake location if GPS fails in fake mode
            handleStabilizedLocation({ lat: FAKE_LOCATION.lat, lng: FAKE_LOCATION.lng, acc: FAKE_LOCATION.accuracy });
        }
    }

    // Stop GPS tracking
    function stopTracking() {
        // Clear real GPS watch
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        // Clear fake location interval
        if (fakeLocationInterval !== null) {
            clearInterval(fakeLocationInterval);
            fakeLocationInterval = null;
        }
    }

    // Start GPS tracking
    function startTracking() {
        // Stop any existing tracking first
        stopTracking();

        if (!('geolocation' in navigator)) {
            console.error('Geolocation not supported');
            if (USE_FAKE_LOCATION) {
                // Set permission flag even for fake location
                try {
                    localStorage.setItem('geopin-location-permission', 'granted');
                } catch (_) {}
                handleStabilizedLocation({ lat: FAKE_LOCATION.lat, lng: FAKE_LOCATION.lng, acc: FAKE_LOCATION.accuracy });
            }
            return;
        }

        // Always use real geolocation API (which will return fake GPS if set in browser)
        // In fake location mode, we just allow coordinates outside map bounds to be mapped
        const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        watchId = navigator.geolocation.watchPosition(onPosition, onError, opts);
        
        if (USE_FAKE_LOCATION) {
            // Set permission flag for fake location mode
            try {
                localStorage.setItem('geopin-location-permission', 'granted');
            } catch (_) {}
        }
    }

    // Toggle fake location mode (called by long-press on help button)
    function toggleFakeLocationMode() {
        USE_FAKE_LOCATION = !USE_FAKE_LOCATION;
        BYPASS_COORDINATE_SYSTEM = USE_FAKE_LOCATION; // Enable coordinate bypass when fake location is enabled
        
        // Restart tracking with new mode
        startTracking();
        
        // Show notification
        if (proximityNotification) {
            const modeText = USE_FAKE_LOCATION ? 'TEST MODE: Fake location enabled - coordinates outside bounds will be mapped' : 'REAL MODE: Using real GPS';
            proximityNotification.textContent = modeText;
            proximityNotification.className = 'proximity-notification show';
            
            // Hide notification after 3 seconds
            setTimeout(() => {
                if (proximityNotification.textContent === modeText) {
                    proximityNotification.classList.remove('show');
                }
            }, 3000);
        }
        
        console.log(`Fake location mode: ${USE_FAKE_LOCATION ? 'ON' : 'OFF'}, Coordinate bypass: ${BYPASS_COORDINATE_SYSTEM ? 'ON' : 'OFF'}`);
    }

    // Instructions overlay
    function showInstructions() {
        if (instructionsOverlay) {
            instructionsOverlay.classList.remove('hidden');
        }
    }

    function hideInstructions() {
        if (instructionsOverlay) {
            instructionsOverlay.classList.add('hidden');
            instructionsDismissed = true; // Mark instructions as dismissed
            try {
                localStorage.setItem('wayfinding-instructions-shown', 'true');
            } catch (_) {}
            
            // Check if user is already in range and show notifications
            checkAndShowNotificationsIfInRange();
        }
    }

    // Leave confirmation overlay
    function showLeaveConfirmation() {
        if (leaveConfirmationOverlay) {
            leaveConfirmationOverlay.classList.remove('hidden');
        }
    }

    function hideLeaveConfirmation() {
        if (leaveConfirmationOverlay) {
            leaveConfirmationOverlay.classList.add('hidden');
        }
    }

    function checkInstructionsShown() {
        try {
            const shown = localStorage.getItem('wayfinding-instructions-shown') === 'true';
            if (!shown) {
                showInstructions();
            }
        } catch (_) {
            // If localStorage fails, show instructions
            showInstructions();
        }
    }

    // Orientation manager (from temp/map.html)
    class OrientationManager {
        constructor() {
            this.orientationOverlay = document.getElementById('orientationOverlay');
            if (this.orientationOverlay) {
                this.orientationOverlay.classList.add('hidden');
            }
            this.init();
        }
        
        init() {
            this.checkOrientation();
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.checkOrientation(), 100);
            });
            window.addEventListener('resize', () => {
                setTimeout(() => this.checkOrientation(), 100);
            });
        }
        
        checkOrientation() {
            let isLandscape = false;
            
            if (screen.orientation && typeof screen.orientation.angle === 'number') {
                isLandscape = screen.orientation.angle === 90 || screen.orientation.angle === 270;
            } else if (window.innerWidth > window.innerHeight + 100) {
                isLandscape = true;
            } else if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
                isLandscape = true;
            } else {
                isLandscape = window.innerWidth > window.innerHeight + 200;
            }
            
            if (isLandscape) {
                if (this.orientationOverlay) {
                    this.orientationOverlay.classList.remove('hidden');
                }
            } else {
                if (this.orientationOverlay) {
                    this.orientationOverlay.classList.add('hidden');
                }
            }
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize map
        mapInstance = new InteractiveMap();
        
        // Initialize orientation manager
        new OrientationManager();
        
        // Load animals and render hotspots
        loadAnimals();
        
        // Setup instructions overlay and long-press detection
        if (helpButton) {
            let longPressTimer = null;
            let longPressTriggered = false;
            let touchStartTime = 0;
            const LONG_PRESS_DURATION = 800; // 800ms for long press
            
            // Prevent context menu and text selection
            helpButton.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
            
            // Handle click (short press) - works for both mouse and touch
            helpButton.addEventListener('click', (e) => {
                // Only show instructions if it wasn't a long press
                if (!longPressTriggered) {
                    showInstructions();
                }
                longPressTriggered = false;
            });
            
            // Handle touch start (for mobile)
            helpButton.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
                longPressTriggered = false;
                longPressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    toggleFakeLocationMode();
                }, LONG_PRESS_DURATION);
            }, { passive: true });
            
            // Handle touch end/cancel (for mobile)
            helpButton.addEventListener('touchend', (e) => {
                const touchDuration = Date.now() - touchStartTime;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                // If it was a long press, prevent the click from firing
                if (longPressTriggered || touchDuration >= LONG_PRESS_DURATION) {
                    e.preventDefault();
                    longPressTriggered = false; // Reset for next interaction
                }
            }, { passive: false });
            
            helpButton.addEventListener('touchcancel', (e) => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                longPressTriggered = false;
            }, { passive: false });
            
            // Handle mouse down (for desktop)
            helpButton.addEventListener('mousedown', (e) => {
                longPressTriggered = false;
                longPressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    toggleFakeLocationMode();
                }, LONG_PRESS_DURATION);
            });
            
            // Handle mouse up/leave (for desktop)
            helpButton.addEventListener('mouseup', (e) => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
            
            helpButton.addEventListener('mouseleave', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                // Reset long press if mouse leaves
                longPressTriggered = false;
            });
        }
        if (instructionsClose) {
            instructionsClose.addEventListener('click', () => {
                // Prime audio when user clicks "Got It!" button
                primeAudio();
                hideInstructions();
            });
        }

        // Setup back button - show leave confirmation overlay
        if (backButton) {
            backButton.addEventListener('click', () => {
                showLeaveConfirmation();
            });
        }

        // Setup leave confirmation overlay buttons
        if (leaveConfirmClose) {
            leaveConfirmClose.addEventListener('click', () => {
                // Close overlay and stay on page
                hideLeaveConfirmation();
            });
        }

        if (leaveConfirmButton) {
            leaveConfirmButton.addEventListener('click', () => {
                // Navigate to index page
                window.location.href = './index.html';
            });
        }

        // Setup recenter button
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                if (mapInstance && currentUserLocation) {
                    // Reset manual movement flag so auto-recenter can work again
                    mapInstance.recenterToUserLocation(currentUserLocation, true);
                }
            });
        }

        // Setup boundary warning close button
        if (boundaryWarningClose) {
            boundaryWarningClose.addEventListener('click', () => {
                hideBoundaryWarning();
            });
        }
        
        // Check if instructions should be shown
        checkInstructionsShown();
        
        // Check if instructions were already shown (from localStorage)
        try {
            const alreadyShown = localStorage.getItem('wayfinding-instructions-shown') === 'true';
            if (alreadyShown) {
                instructionsDismissed = true; // Allow notifications if instructions were already shown
            }
        } catch (_) {}
        
        // Start GPS tracking
        startTracking();
        
        // Update overlay positions periodically (in case map image loads later)
        const imageLoadCheck = setInterval(() => {
            if (mapImage.complete && mapImage.naturalWidth > 0) {
                // Update map config with actual image dimensions
                if (MapConfig && MapConfig.updateDimensionsFromImage) {
                    MapConfig.updateDimensionsFromImage(mapImage);
                }
                renderAnimalHotspots();
                clearInterval(imageLoadCheck);
            }
        }, 100);
        
        // Also update when image loads
        mapImage.addEventListener('load', () => {
            // Update map config with actual image dimensions
            if (MapConfig && MapConfig.updateDimensionsFromImage) {
                MapConfig.updateDimensionsFromImage(mapImage);
            }
            renderAnimalHotspots();
        });
    });
})();

