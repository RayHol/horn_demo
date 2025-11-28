// Wayfinding map with GPS tracking, proximity detection, and AR integration
(function() {
    'use strict';

    // Environment state (can be toggled via long-press on help button)
    let currentEnvironment = 'production'; // 'production' or 'testing'
    const MAP_LOCKED = false; // Set to true to lock map position (future use)
    const ENVIRONMENT_STORAGE_KEY = 'wayfinding-environment';
    
    /**
     * Load saved environment from localStorage
     * @returns {string} 'production' or 'testing'
     */
    function loadSavedEnvironment() {
        try {
            const saved = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
            if (saved === 'testing' || saved === 'production') {
                return saved;
            }
        } catch (_) {
            // localStorage not available or error
        }
        return 'production'; // Default to production
    }
    
    /**
     * Save current environment to localStorage
     */
    function saveEnvironment() {
        try {
            localStorage.setItem(ENVIRONMENT_STORAGE_KEY, currentEnvironment);
        } catch (_) {
            // localStorage not available or error
        }
    }

    // DOM elements
    const mapContainer = document.getElementById('mapContainer');
    const mapImage = document.getElementById('mapImage');
    const userLocationDot = document.getElementById('userLocationDot');
    const userLocationAccuracyCircle = document.getElementById('userLocationAccuracyCircle');
    const userLocationHeading = document.getElementById('userLocationHeading');
    const animalHotspots = document.getElementById('animalHotspots');
    const proximityNotification = document.getElementById('proximityNotification'); // Keep for backwards compatibility
    const openCameraBtn = document.getElementById('openCameraBtn'); // Keep for backwards compatibility
    const animalNearbyPopup = document.getElementById('animalNearbyPopup');
    const animalNearbyClose = document.getElementById('animalNearbyClose');
    const animalNearbyTitle = document.getElementById('animalNearbyTitle');
    const animalNearbyMessage = document.getElementById('animalNearbyMessage');
    const animalNearbyOpenCamera = document.getElementById('animalNearbyOpenCamera');
    const recenterBtn = document.getElementById('recenterBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const helpButton = document.getElementById('helpButton');
    const backButton = document.getElementById('backButton');
    const instructionsOverlay = document.getElementById('instructionsOverlay');
    const instructionsClose = document.getElementById('instructionsClose');
    const leaveConfirmationOverlay = document.getElementById('leaveConfirmationOverlay');
    const leaveConfirmClose = document.getElementById('leaveConfirmClose');
    const leaveConfirmButton = document.getElementById('leaveConfirmButton');
    const boundaryWarningOverlay = document.getElementById('boundaryWarningOverlay');
    const boundaryWarningClose = document.getElementById('boundaryWarningClose');
    const animalDetailPopup = document.getElementById('animalDetailPopup');
    const animalDetailClose = document.getElementById('animalDetailClose');
    const animalDetailTitle = document.getElementById('animalDetailTitle');
    const animalDetailMessage = document.getElementById('animalDetailMessage');
    const animalDetailDirections = document.getElementById('animalDetailDirections');
    const animalDetailDetails = document.getElementById('animalDetailDetails');
    const directionsPopup = document.getElementById('directionsPopup');
    const directionsClose = document.getElementById('directionsClose');
    const directionsTitle = document.getElementById('directionsTitle');
    const directionsMessage = document.getElementById('directionsMessage');
    const animalDetailsOverlay = document.getElementById('animalDetailsOverlay');
    const animalDetailsBackButton = document.getElementById('animalDetailsBackButton');
    const animalDetailsIcon = document.getElementById('animalDetailsIcon');
    const animalDetailsName = document.getElementById('animalDetailsName');
    const animalDetailsDate = document.getElementById('animalDetailsDate');
    const animalDetailsDescription = document.getElementById('animalDetailsDescription');
    const animalDetailsPlayGameButton = document.getElementById('animalDetailsPlayGameButton');

    // State
    let watchId = null;
    let fakeLocationInterval = null; // Store interval ID for fake location updates
    let animals = [];
    let audio = null;
    let currentUserLocation = null;
    let currentHeading = null; // Device heading in degrees (0-360, where 0 is North)
    let currentAnimal = null;
    let proximityState = null; // 'in-range', 'nearby', or null
    let audioPrimed = false; // Track if audio has been primed with user interaction
    let instructionsDismissed = false; // Track if instructions overlay has been dismissed
    
    // Message buffer for heading debug (stores messages even when debug UI isn't visible)
    const headingDebugMessages = [];
    const MAX_BUFFERED_MESSAGES = 10;
    
    // Helper function to initialize heading debug UI (hides haptic info, shows heading section)
    function initHeadingDebugUI() {
        try {
            const debugUI = document.getElementById('haptic-debug-ui');
            if (!debugUI) return;
            
            // Hide all haptic debug info elements
            const hapticInfoElements = [
                'haptic-debug-enabled',
                'haptic-debug-ios',
                'haptic-debug-credits',
                'haptic-debug-recent',
                'haptic-debug-can-trigger',
                'haptic-debug-method'
            ];
            hapticInfoElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = 'none';
                }
            });
            
            // Create or get heading debug element
            let headingDebugEl = debugUI.querySelector('#haptic-debug-heading');
            const isNew = !headingDebugEl;
            if (!headingDebugEl) {
                headingDebugEl = document.createElement('div');
                headingDebugEl.id = 'haptic-debug-heading';
                headingDebugEl.style.cssText = 'color: #fff; font-size: 11px; line-height: 1.3; margin-top: 4px;';
                headingDebugEl.innerHTML = '<div style="font-weight: bold; color: #4CAF50; margin-bottom: 4px; font-size: 11px;">Heading Debug:</div>';
                // Insert after the title row
                const titleRow = debugUI.querySelector('div:first-child');
                if (titleRow) {
                    debugUI.insertBefore(headingDebugEl, titleRow.nextSibling);
                } else {
                    debugUI.appendChild(headingDebugEl);
                }
            }
            
            // Only clear and rebuild if this is a new element or if we have buffered messages to display
            // Otherwise, preserve existing messages (they'll be updated by logToHapticDebug)
            if (isNew) {
                // Clear any placeholder and display buffered messages
                const existingMessages = headingDebugEl.querySelectorAll('div:not(:first-child)');
                existingMessages.forEach(msg => msg.remove());
                
                // Display buffered messages (keep last 3)
                const messagesToShow = headingDebugMessages.slice(-3);
                if (messagesToShow.length === 0) {
                    // Only show "Initializing..." if there are no messages
                    const statusMsg = document.createElement('div');
                    statusMsg.style.cssText = 'color: #ccc; font-size: 10px; margin: 1px 0;';
                    statusMsg.textContent = 'Initializing...';
                    headingDebugEl.appendChild(statusMsg);
                } else {
                    messagesToShow.forEach(msg => {
                        const logEntry = document.createElement('div');
                        logEntry.style.cssText = 'color: #ccc; font-size: 10px; margin: 1px 0;';
                        logEntry.textContent = msg;
                        headingDebugEl.appendChild(logEntry);
                    });
                }
            }
            
            headingDebugEl.style.display = 'block';
        } catch (e) {
            // Silently fail
        }
    }
    
    // Helper function to log to heading debug UI
    // Keeps messages short and only shows recent entries
    function logToHapticDebug(message) {
        try {
            console.log(`[Heading Debug] ${message}`);
            
            // Always add to buffer (even if debug UI isn't visible)
            headingDebugMessages.push(message);
            if (headingDebugMessages.length > MAX_BUFFERED_MESSAGES) {
                headingDebugMessages.shift(); // Remove oldest
            }
            
            const debugUI = document.getElementById('haptic-debug-ui');
            if (!debugUI || debugUI.style.display === 'none') {
                // Debug UI not visible, but message is buffered - will show when UI opens
                console.log(`[Heading Debug] UI not visible, buffered. Buffer size: ${headingDebugMessages.length}`);
                return;
            }
            
            // Ensure heading debug UI is initialized
            initHeadingDebugUI();
            
            // Get heading debug element
            const headingDebugEl = debugUI.querySelector('#haptic-debug-heading');
            if (!headingDebugEl) return;
            
            // Remove "Initializing..." if present
            const existingMessages = headingDebugEl.querySelectorAll('div:not(:first-child)');
            existingMessages.forEach(msg => {
                if (msg.textContent === 'Initializing...') {
                    msg.remove();
                }
            });
            
            // Add new message
            const logEntry = document.createElement('div');
            logEntry.style.cssText = 'color: #ccc; font-size: 10px; margin: 1px 0;';
            logEntry.textContent = message;
            headingDebugEl.appendChild(logEntry);
            
            // Keep only last 3 log entries (excluding the title)
            const entries = headingDebugEl.querySelectorAll('div:not(:first-child)');
            if (entries.length > 3) {
                entries[0].remove();
            }
        } catch (e) {
            // Silently fail
        }
    }
    
    // Hook into haptic debug UI to initialize heading debug when shown
    (function() {
        // Override showHapticDebug to initialize heading debug
        const originalShowHapticDebug = window.showHapticDebug;
        if (originalShowHapticDebug) {
            window.showHapticDebug = function() {
                console.log('[Heading Debug] showHapticDebug() called');
                originalShowHapticDebug();
                setTimeout(() => {
                    console.log(`[Heading Debug] Initializing UI. Buffer has ${headingDebugMessages.length} messages, watchId=${watchId}`);
                    initHeadingDebugUI();
                    // If no messages in buffer, log current status
                    if (headingDebugMessages.length === 0) {
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                        const isAndroid = /Android/.test(navigator.userAgent);
                        const hasOrientation = 'DeviceOrientationEvent' in window;
                        const hasPermission = typeof DeviceOrientationEvent !== 'undefined' && 
                                             typeof DeviceOrientationEvent.requestPermission === 'function';
                        if (watchId === null) {
                            logToHapticDebug('Tracking not started');
                        } else if (hasPermission) {
                            logToHapticDebug('iOS: Check permission');
                        } else if (hasOrientation) {
                            logToHapticDebug(isAndroid ? 'Android: Using GPS' : 'Other: Listening');
                        } else {
                            logToHapticDebug('No orientation API');
                        }
                    } else {
                        // Messages exist in buffer, they should be displayed by initHeadingDebugUI
                        console.log(`[Heading Debug] Displaying ${headingDebugMessages.length} buffered messages`);
                    }
                }, 50);
            };
        }
        
        // Also watch for debug UI visibility changes
        const checkDebugUI = setInterval(() => {
            const debugUI = document.getElementById('haptic-debug-ui');
            if (debugUI && debugUI.style.display !== 'none') {
                initHeadingDebugUI();
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkDebugUI), 10000);
    })();
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

    // Load animals from JSON based on current environment
    async function loadAnimals(environment = null) {
        const env = environment || currentEnvironment;
        const jsonFile = env === 'testing' ? './data/testing.json' : './data/animals.json';
        try {
            const res = await fetch(jsonFile, { cache: 'no-cache' });
            const cfg = await res.json();
            animals = Array.isArray(cfg.animals) ? cfg.animals : [];
            renderAnimalHotspots();
        } catch (err) {
            console.error(`Failed to load ${jsonFile}:`, err);
        }
    }

    // Get badge ID for an animal (matching getBadgeDataForAnimal from script.js)
    function getBadgeIdForAnimal(animalName) {
        const badgeMap = {
            'Peacock': 'peacock',
            'Walrus': 'walrus-ar',
            'Koala': 'koala',
            'Bee': 'bee-ar',
            'Clown Fish': 'clownfish-ar',
            'Platypus': 'platypus',
            'Cephalopod': 'cephalopod',
            'Stag Beetle': 'stag-beetle',
            'Snowy Owl': 'snowy-owl',
            'Orangutan': 'orangutan',
            'Jellyfish': 'jellyfish-ar',
            'Robin': 'robin'
        };
        
        return badgeMap[animalName] || animalName.toLowerCase().replace(/\s+/g, '-');
    }

    // Check if an animal has been found (collected)
    function isAnimalFound(animal) {
        if (!animal || !animal.name) return false;
        
        try {
            const badgeId = getBadgeIdForAnimal(animal.name);
            const collectedBadges = JSON.parse(localStorage.getItem('collectedBadges') || '[]');
            return collectedBadges.includes(badgeId);
        } catch (e) {
            console.warn('Error checking if animal is found:', e);
            return false;
        }
    }

    // Audio and haptics
    function ensureAudio() {
        if (!audio) {
            audio = new Audio('./Geo-pin-app/assets/bell.mp3');
            audio.volume = 0.5;
            audio._originalVolume = 0.5; // Store original volume for global audio manager
            // Register with global audio manager so it respects the audio toggle
            if (typeof window.registerAudio === 'function') {
                window.registerAudio(audio);
            }
        }
        return audio;
    }

    function vibrate() {
        // Only vibrate if user has interacted with the page
        if (!audioPrimed) return;
        
        // Use the haptic feedback script with 'long' pattern
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('long');
        } else {
            // Fallback to native vibration API if haptic script not loaded
            if ('vibrate' in navigator) {
                try {
                    navigator.vibrate([800]);
                } catch (err) {
                    console.log('Vibration failed:', err);
                }
            }
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
        
        // Programmatic zoom method for button controls
        zoom(delta) {
            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale + delta));
            
            if (newScale !== this.targetScale) {
                // Zooming doesn't disable auto-recenter - only panning does
                
                const rect = this.mapContainer.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Use center of map for zoom
                const scaleDiff = newScale - this.targetScale;
                this.targetTranslateX -= (rect.width / 2 - centerX) * scaleDiff;
                this.targetTranslateY -= (rect.height / 2 - centerY) * scaleDiff;
                
                this.targetScale = newScale;
            }
        }
        
        handleTouchStart(e) {
            // Check if touch is on an animal hotspot - if so, don't handle map dragging
            const target = e.target;
            if (target && (target.closest('.animal-hotspot') || target.classList.contains('animal-icon'))) {
                // Touch is on a hotspot, let the hotspot handle it
                return;
            }
            
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
            // Check if touch is on an animal hotspot - if so, don't handle map dragging
            const target = e.target;
            if (target && (target.closest('.animal-hotspot') || target.classList.contains('animal-icon'))) {
                // Touch is on a hotspot, let the hotspot handle it
                return;
            }
            
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
            // Cache container rect to avoid repeated getBoundingClientRect calls
            let cachedContainerRect = null;
            let lastContainerRectUpdate = 0;
            const CONTAINER_RECT_CACHE_MS = 16; // Update cache roughly once per frame at 60fps
            
            // Cache last dot position to avoid unnecessary style updates
            let lastDotX = null;
            let lastDotY = null;
            
            const animate = () => {
                // Update transform FIRST so position calculations use the latest transform values
                self.updateTransform();
                
                // Always update user location dot position in animation loop for smooth updates
                // Only update if we have the necessary elements
                if (userLocationDot && currentUserLocation && self.mapContainer && self.mapImage) {
                    // Always ensure dot is visible
                    userLocationDot.style.display = 'block';
                    
                    let dotX, dotY;
                    
                    // Update cached container rect periodically to avoid layout thrashing
                    const now = performance.now();
                    if (!cachedContainerRect || (now - lastContainerRectUpdate) > CONTAINER_RECT_CACHE_MS) {
                        cachedContainerRect = self.mapContainer.getBoundingClientRect();
                        lastContainerRectUpdate = now;
                    }
                    
                    if (self.keepUserCentered && !self.userHasManuallyMoved && !self.cannotCenterAtBoundary) {
                        // Auto-centering mode: update jitter and position at center
                        updateUserLocationJitter();
                        const centerX = cachedContainerRect.width / 2;
                        const centerY = cachedContainerRect.height / 2;
                        dotX = centerX + userLocationJitter.x;
                        dotY = centerY + userLocationJitter.y;
                        // Round to nearest pixel to avoid sub-pixel rendering issues
                        dotX = Math.round(dotX);
                        dotY = Math.round(dotY);
                    } else {
                        // Manual mode: show actual GPS location on map
                        // Only try if mapInstance is available (for coordinate conversion)
                        if (mapInstance) {
                            try {
                                // Pass cached container rect to avoid repeated getBoundingClientRect calls
                                const coords = gpsToScreenCoordinates(currentUserLocation.lat, currentUserLocation.lng, true, cachedContainerRect);
                                // Ensure coordinates are valid numbers
                                if (coords && isFinite(coords.x) && isFinite(coords.y)) {
                                    dotX = coords.x;
                                    dotY = coords.y;
                                    // Round to nearest pixel to avoid sub-pixel rendering issues
                                    dotX = Math.round(dotX);
                                    dotY = Math.round(dotY);
                                }
                            } catch (e) {
                                // If coordinate conversion fails, don't update position
                                console.warn('Failed to update user location dot position:', e);
                            }
                        }
                    }
                    
                    // Only update style if position actually changed (avoids unnecessary repaints)
                    if (dotX !== undefined && dotY !== undefined && (dotX !== lastDotX || dotY !== lastDotY)) {
                        userLocationDot.style.left = dotX + 'px';
                        userLocationDot.style.top = dotY + 'px';
                        lastDotX = dotX;
                        lastDotY = dotY;
                    }
                    
                    // Update accuracy circle position and size in animation loop
                    if (userLocationAccuracyCircle && dotX !== undefined && dotY !== undefined && currentUserLocation) {
                        // Round positions for accuracy circle too
                        userLocationAccuracyCircle.style.left = Math.round(dotX) + 'px';
                        userLocationAccuracyCircle.style.top = Math.round(dotY) + 'px';
                        userLocationAccuracyCircle.style.display = 'block';
                        
                        // Convert GPS accuracy (meters) to screen pixels (diameter)
                        const accuracyMeters = currentUserLocation.accuracy || currentUserLocation.acc || 10;
                        const diameterPixels = metersToScreenPixels(accuracyMeters, currentUserLocation.lat);
                        
                        if (diameterPixels > 0 && isFinite(diameterPixels)) {
                            // Ensure minimum size for visibility
                            const minSize = 40; // Minimum 40px diameter
                            const size = Math.max(minSize, diameterPixels);
                            // Round size to avoid sub-pixel rendering
                            userLocationAccuracyCircle.style.width = Math.round(size) + 'px';
                            userLocationAccuracyCircle.style.height = Math.round(size) + 'px';
                        }
                    }
                    
                    // Update heading triangle position to match dot position (it's now a sibling, not a child)
                    // BUT: Only set position, don't show it until we have a valid heading
                    if (userLocationHeading && dotX !== undefined && dotY !== undefined) {
                        // Only update if position changed (avoids unnecessary repaints)
                        const headingX = Math.round(dotX);
                        const headingY = Math.round(dotY);
                        const currentHeadingLeft = userLocationHeading.style.left;
                        const currentHeadingTop = userLocationHeading.style.top;
                        
                        if (currentHeadingLeft !== (headingX + 'px') || currentHeadingTop !== (headingY + 'px')) {
                            userLocationHeading.style.left = headingX + 'px';
                            userLocationHeading.style.top = headingY + 'px';
                        }
                    }
                }
                
                // Update hotspot positions smoothly every frame for fixed appearance
                updateHotspotPositions();
                
                // Update heading indicator rotation if available (after position is set)
                // This will only show the indicator if we have BOTH position AND heading
                if (currentHeading !== null && currentHeading !== undefined && userLocationHeading) {
                    updateHeadingIndicator(currentHeading);
                } else if (userLocationHeading) {
                    // If we don't have a heading yet, make sure indicator is hidden
                    // even if position is set
                    userLocationHeading.style.display = 'none';
                }
                
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }

        // Get current map transform for coordinate conversion
        // Uses cached values to avoid repeated getBoundingClientRect calls
        getMapTransform(cachedContainerRect = null) {
            // Use cached container rect if provided, otherwise get it fresh
            const containerRect = cachedContainerRect || this.mapContainer.getBoundingClientRect();
            const imageCenterX = containerRect.width / 2;
            const imageCenterY = containerRect.height / 2;
            
            // Use natural image dimensions - these are stable and don't change
            const naturalWidth = this.mapImage.naturalWidth || 0;
            const naturalHeight = this.mapImage.naturalHeight || 0;
            
            // Use the interpolated scale value directly (this.scale) which matches what's being rendered
            // This is more stable than calculating from getBoundingClientRect which can fluctuate
            // The scale is updated in updateTransform() which is called before position calculations
            const scaleToUse = this.scale;
            
            // If natural dimensions aren't available, we need to calculate from displayed size
            // But this should rarely happen if the image has loaded properly
            let imageWidth = naturalWidth;
            let imageHeight = naturalHeight;
            if (!imageWidth || !imageHeight) {
                // Fallback: calculate from displayed size and scale
                // This is less accurate but better than nothing
                const imageRect = this.mapImage.getBoundingClientRect();
                imageWidth = imageWidth || (imageRect.width / scaleToUse);
                imageHeight = imageHeight || (imageRect.height / scaleToUse);
            }
            
            return {
                centerX: imageCenterX + this.translateX,
                centerY: imageCenterY + this.translateY,
                scale: scaleToUse,
                imageWidth: imageWidth,
                imageHeight: imageHeight,
                displayedWidth: imageWidth * scaleToUse,
                displayedHeight: imageHeight * scaleToUse
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
    // @param {DOMRect} cachedContainerRect - Optional cached container rect to avoid repeated getBoundingClientRect calls
    function gpsToScreenCoordinates(lat, lng, forUserLocation = false, cachedContainerRect = null) {
        if (!mapInstance) return { x: 0, y: 0 };
        
        // Convert GPS to map pixel coordinates (using map image pixel dimensions)
        // This will work even if coordinates are outside bounds - it will just calculate
        // normalized coordinates that may be negative or > 1, which is fine
        const mapPixels = MapConfig.gpsToMapPixels(lat, lng);
        
        // Get map transform (pass cached container rect to avoid repeated getBoundingClientRect calls)
        const transform = mapInstance.getMapTransform(cachedContainerRect);
        
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
                    // Round to nearest pixel to avoid sub-pixel rendering issues
                    dotX = Math.round(dotX);
                    dotY = Math.round(dotY);
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
            // Round to nearest pixel to avoid sub-pixel rendering issues
            dotX = Math.round(dotX);
            dotY = Math.round(dotY);
            userLocationDot.style.left = dotX + 'px';
            userLocationDot.style.top = dotY + 'px';
        }
        
        // Update accuracy circle position and size
        if (userLocationAccuracyCircle && dotX !== undefined && dotY !== undefined) {
            // Round positions for accuracy circle too
            userLocationAccuracyCircle.style.left = Math.round(dotX) + 'px';
            userLocationAccuracyCircle.style.top = Math.round(dotY) + 'px';
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
        
        // Update heading triangle position to match dot position (it's now a sibling, not a child)
        // BUT: Only set position, don't show it until we have a valid heading
        if (userLocationHeading && dotX !== undefined && dotY !== undefined) {
            // Round positions and only update if changed (avoids unnecessary repaints)
            const headingX = Math.round(dotX);
            const headingY = Math.round(dotY);
            const currentHeadingLeft = userLocationHeading.style.left;
            const currentHeadingTop = userLocationHeading.style.top;
            
            if (currentHeadingLeft !== (headingX + 'px') || currentHeadingTop !== (headingY + 'px')) {
                userLocationHeading.style.left = headingX + 'px';
                userLocationHeading.style.top = headingY + 'px';
            }
            
            // If we don't have a heading yet, make sure indicator stays hidden
            // even if position is set
            if (currentHeading === null || currentHeading === undefined) {
                userLocationHeading.style.display = 'none';
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
        
        // Check if location is outside boundary warning bounds (separate from map alignment bounds)
        const withinBounds = MapConfig.isWithinBoundaryWarningBounds(location.lat, location.lng);
        
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
                hotspotPositions.delete(animalId); // Clean up position cache
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
                
                // Initialize with display block and hardware acceleration hints for iOS
                hotspot.style.display = 'block';
                hotspot.style.transform = 'translate(-50%, -50%) translateZ(0)';
                hotspot.style.willChange = 'transform, left, top';
                
                // Create icon element (img) or fallback to pin
                let iconElement;
                if (animal.icon && animal.icon.shadow && animal.icon.found) {
                    // Use animal icon
                    iconElement = document.createElement('img');
                    iconElement.className = 'animal-icon';
                    iconElement.alt = animal.name;
                    // Set initial icon based on found status
                    const isFound = isAnimalFound(animal);
                    iconElement.src = isFound ? animal.icon.found : animal.icon.shadow;
                    // Handle icon load errors with fallback
                    iconElement.onerror = function() {
                        console.warn(`Failed to load icon for ${animal.name} (${iconElement.src}), using fallback pin`);
                        // Replace with fallback pin
                        const fallbackPin = document.createElement('div');
                        fallbackPin.className = 'animal-pin';
                        if (iconElement.parentNode) {
                            iconElement.parentNode.replaceChild(fallbackPin, iconElement);
                        }
                    };
                } else {
                    // Fallback to default pin if no icon configuration
                    console.warn(`No icon configuration for ${animal.name}, using fallback pin`);
                    iconElement = document.createElement('div');
                    iconElement.className = 'animal-pin';
                }
                
                const label = document.createElement('div');
                label.className = 'animal-pin-label';
                label.textContent = animal.name;
                
                hotspot.appendChild(iconElement);
                hotspot.appendChild(label);
                animalHotspots.appendChild(hotspot);
                
                // Add click and touch handlers to show animal detail popup
                // Use both click and touchend for better mobile support
                let touchStartTime = 0;
                let touchStartPos = { x: 0, y: 0 };
                
                const handleHotspotTap = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Only show popup if it was a tap (not a drag)
                    const touchDuration = Date.now() - touchStartTime;
                    const touchDistance = Math.sqrt(
                        Math.pow(e.changedTouches?.[0]?.clientX - touchStartPos.x || 0, 2) +
                        Math.pow(e.changedTouches?.[0]?.clientY - touchStartPos.y || 0, 2)
                    );
                    
                    // If touch was quick (< 300ms) and didn't move much (< 10px), treat as tap
                    if (!e.changedTouches || (touchDuration < 300 && touchDistance < 10)) {
                        showAnimalDetailPopup(animal);
                    }
                };
                
                hotspot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showAnimalDetailPopup(animal);
                });
                
                hotspot.addEventListener('touchstart', (e) => {
                    touchStartTime = Date.now();
                    if (e.touches[0]) {
                        touchStartPos.x = e.touches[0].clientX;
                        touchStartPos.y = e.touches[0].clientY;
                    }
                    e.stopPropagation(); // Prevent map from handling this touch
                }, { passive: true });
                
                hotspot.addEventListener('touchend', handleHotspotTap, { passive: false });
                
                hotspotElements.set(animal.id, hotspot);
            } else {
                // Update existing hotspot - replace pin with icon if needed, or update icon
                if (animal.icon && animal.icon.shadow && animal.icon.found) {
                    let iconElement = hotspot.querySelector('.animal-icon');
                    const pinElement = hotspot.querySelector('.animal-pin');
                    
                    // If we have a pin but no icon, replace pin with icon
                    if (pinElement && !iconElement) {
                        iconElement = document.createElement('img');
                        iconElement.className = 'animal-icon';
                        iconElement.alt = animal.name;
                        const isFound = isAnimalFound(animal);
                        iconElement.src = isFound ? animal.icon.found : animal.icon.shadow;
                        // Handle icon load errors with fallback
                        iconElement.onerror = function() {
                            console.warn(`Failed to load icon for ${animal.name} (${iconElement.src}), keeping fallback pin`);
                            // Don't replace, just log the error
                        };
                        pinElement.replaceWith(iconElement);
                    } else if (iconElement && iconElement.tagName === 'IMG') {
                        // Update existing icon if found status changed
                        const isFound = isAnimalFound(animal);
                        const newSrc = isFound ? animal.icon.found : animal.icon.shadow;
                        // Get current src without full URL (just the path)
                        const currentSrc = iconElement.getAttribute('src') || '';
                        if (currentSrc !== newSrc) {
                            iconElement.src = newSrc;
                        }
                    }
                }
            }
            // Position will be updated in updateHotspotPositions()
        });
    }
    
    // Store last known positions to avoid unnecessary updates (iOS optimization)
    const hotspotPositions = new Map(); // Map<animalId, {x, y, visible}>
    
    // Update hotspot icons when collection status changes
    function updateHotspotIcons() {
        animals.forEach(animal => {
            const hotspot = hotspotElements.get(animal.id);
            if (hotspot && animal.icon && animal.icon.shadow && animal.icon.found) {
                const iconElement = hotspot.querySelector('.animal-icon');
                if (iconElement && iconElement.tagName === 'IMG') {
                    const isFound = isAnimalFound(animal);
                    const newSrc = isFound ? animal.icon.found : animal.icon.shadow;
                    const currentSrc = iconElement.getAttribute('src') || '';
                    if (currentSrc !== newSrc) {
                        iconElement.src = newSrc;
                    }
                }
            }
        });
    }

    // Show animal detail popup
    function showAnimalDetailPopup(animal) {
        if (!animal || !animalDetailPopup) return;
        
        const isFound = isAnimalFound(animal);
        
        // Update title
        if (animalDetailTitle) {
            animalDetailTitle.textContent = isFound ? animal.name : '???';
        }
        
        // Update message
        if (animalDetailMessage) {
            animalDetailMessage.textContent = isFound 
                ? "You've already discovered this animal! Want to visit it again?"
                : "What could this be?";
        }
        
        // Store current animal for button handlers
        if (animalDetailDirections) {
            animalDetailDirections.dataset.animalId = animal.id;
        }
        if (animalDetailDetails) {
            animalDetailDetails.dataset.animalId = animal.id;
        }
        
        // Show popup with slide-in animation
        animalDetailPopup.classList.remove('hidden');
        // Force reflow to ensure transition works
        animalDetailPopup.offsetHeight;
        animalDetailPopup.classList.add('show');
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Hide animal detail popup
    function hideAnimalDetailPopup() {
        if (!animalDetailPopup) return;
        
        animalDetailPopup.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (animalDetailPopup.classList.contains('show')) return; // If shown again, don't hide
            animalDetailPopup.classList.add('hidden');
        }, 300); // Match CSS transition duration
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Handle Directions button click
    function handleDirectionsClick(animalId) {
        if (!animalId) return;
        
        const animal = animals.find(a => a.id === animalId);
        if (!animal || !animal.location) return;
        
        // Calculate distance from user's current location to animal
        let distanceMeters = 0;
        if (currentUserLocation && currentUserLocation.lat && currentUserLocation.lng) {
            distanceMeters = haversineMeters(
                { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
                { lat: animal.location.lat, lng: animal.location.lng }
            );
        }
        
        // Format distance (show in meters if < 1000m, otherwise show in km)
        let distanceText;
        if (distanceMeters < 1000) {
            distanceText = `${Math.round(distanceMeters)}M AWAY`;
        } else {
            const distanceKm = (distanceMeters / 1000).toFixed(1);
            distanceText = `${distanceKm}KM AWAY`;
        }
        
        // Update directions popup content
        if (directionsTitle) {
            directionsTitle.textContent = distanceText;
        }
        
        if (directionsMessage) {
            directionsMessage.textContent = "Your route is ready. Head to the marked area to scan this animal.";
        }
        
        // Close detail popup first
        hideAnimalDetailPopup();
        
        // Wait for detail popup to close, then show directions popup
        setTimeout(() => {
            showDirectionsPopup();
        }, 300); // Match CSS transition duration
    }

    // Show directions popup
    function showDirectionsPopup() {
        if (!directionsPopup) return;
        
        directionsPopup.classList.remove('hidden');
        // Force reflow to ensure transition works
        directionsPopup.offsetHeight;
        directionsPopup.classList.add('show');
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Hide directions popup
    function hideDirectionsPopup() {
        if (!directionsPopup) return;
        
        directionsPopup.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (directionsPopup.classList.contains('show')) return; // If shown again, don't hide
            directionsPopup.classList.add('hidden');
        }, 300); // Match CSS transition duration
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Handle Details button click
    function handleDetailsClick(animalId) {
        if (!animalId) return;
        
        const animal = animals.find(a => a.id === animalId);
        if (!animal) return;
        
        // Close the detail popup first
        hideAnimalDetailPopup();
        
        // Show the animal details overlay
        showAnimalDetailsOverlay(animal);
    }

    // Show animal details overlay
    function showAnimalDetailsOverlay(animal) {
        if (!animal || !animalDetailsOverlay) return;
        
        // Get badge ID for the animal
        const badgeId = getBadgeIdForAnimal(animal.name);
        
        // Check if animal is found
        const isFound = isAnimalFound(animal);
        
        // Animal data - matching animals.html structure
        const animalData = {
            'peacock': {
                icon: '../assets/animals/found/peacock.svg',
                name: 'Peacock',
                description: 'You found the magnificent peacock! A true explorer of the Horniman grounds.',
                gamePath: '../games/proud-photographer/index.html'
            },
            'walrus-ar': {
                icon: '../assets/animals/found/walrus.svg',
                name: 'Walrus',
                description: 'You discovered the walrus! Great tracking skills on your adventure.',
                gamePath: '../games/walrus-feeder/index.html'
            },
            'koala': {
                icon: '../assets/animals/found/koala.svg',
                name: 'Koala',
                description: 'You found the koala! Your keen eye spotted this hidden treasure.'
            },
            'bee-ar': {
                icon: '../assets/animals/found/bee.svg',
                name: 'Bee',
                description: 'You found the bee! A tiny but important discovery on your journey.',
                gamePath: '../games/sunflower-planter/index.html'
            },
            'clownfish-ar': {
                icon: '../assets/animals/found/clownfish.svg',
                name: 'Clownfish',
                description: 'You found the clownfish! A colorful addition to your collection.',
                gamePath: '../games/anemone-cleaning/index.html'
            },
            'platypus': {
                icon: '../assets/animals/found/platypus.svg',
                name: 'Platypus',
                description: 'You found the platypus! One of nature\'s most unique creatures.'
            },
            'cephalopod': {
                icon: '../assets/animals/found/Shelled cephalopod.svg',
                name: 'Cephalopod',
                description: 'You found the cephalopod! A fascinating marine discovery.'
            },
            'stag-beetle': {
                icon: '../assets/animals/found/stag beetle.svg',
                name: 'Stag Beetle',
                description: 'You found the stag beetle! A small but impressive find.'
            },
            'snowy-owl': {
                icon: '../assets/animals/found/snowy owl.svg',
                name: 'Snowy Owl',
                description: 'You found the snowy owl! A wise and majestic discovery.'
            },
            'orangutan': {
                icon: '../assets/animals/found/orangutan.svg',
                name: 'Orangutan',
                description: 'You found the orangutan! A great ape discovery on your adventure.'
            },
            'jellyfish-ar': {
                icon: '../assets/animals/found/jellyfish.svg',
                name: 'Jellyfish',
                description: 'You found the jellyfish! A graceful and mesmerizing discovery.'
            },
            'robin': {
                icon: '../assets/animals/found/robin.svg',
                name: 'Robin',
                description: 'You found the robin! A cheerful bird to add to your collection.'
            }
        };
        
        const data = animalData[badgeId];
        if (!data) {
            console.warn(`No data found for animal with badge ID: ${badgeId}`);
            return;
        }
        
        // Update icon - use shadow icon if not found, found icon if found
        if (animalDetailsIcon) {
            if (isFound) {
                // Use found icon
                if (animal.icon && animal.icon.found) {
                    animalDetailsIcon.src = animal.icon.found.replace('../assets/', '../assets/');
                } else if (data.icon) {
                    animalDetailsIcon.src = data.icon;
                }
            } else {
                // Use shadow icon for unfound animals
                if (animal.icon && animal.icon.shadow) {
                    animalDetailsIcon.src = animal.icon.shadow.replace('../assets/', '../assets/');
                } else {
                    // Fallback if no shadow icon available
                    animalDetailsIcon.src = data.icon || '';
                }
            }
        }
        
        // Update name - show "???" if not found
        if (animalDetailsName) {
            animalDetailsName.textContent = isFound ? data.name : '???';
        }
        
        // Update date - only show if found
        if (animalDetailsDate) {
            if (isFound) {
                let collectionDate = null;
                try {
                    const userData = JSON.parse(localStorage.getItem('userData') || 'null');
                    if (userData && userData.progress && userData.progress.badgeDates && userData.progress.badgeDates[badgeId]) {
                        collectionDate = new Date(userData.progress.badgeDates[badgeId]);
                    }
                } catch (e) {
                    console.warn('Error retrieving animal date:', e);
                }
                
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
                
                if (collectionDate && !isNaN(collectionDate.getTime())) {
                    const month = monthNames[collectionDate.getMonth()];
                    const day = collectionDate.getDate();
                    const year = collectionDate.getFullYear();
                    animalDetailsDate.textContent = `Found in ${month} ${day}, ${year}`;
                } else {
                    // Fallback to current date if no stored date
                    const currentDate = new Date();
                    const month = monthNames[currentDate.getMonth()];
                    const day = currentDate.getDate();
                    const year = currentDate.getFullYear();
                    animalDetailsDate.textContent = `Found in ${month} ${day}, ${year}`;
                }
                animalDetailsDate.style.display = 'block';
            } else {
                // Hide date if not found
                animalDetailsDate.style.display = 'none';
            }
        }
        
        // Update description - show different message if not found
        if (animalDetailsDescription) {
            if (isFound) {
                animalDetailsDescription.textContent = data.description;
            } else {
                animalDetailsDescription.textContent = "You haven't found this animal yet. Keep exploring to find it!";
            }
        }
        
        // Show/hide Play Game button - only show if found and has game
        if (animalDetailsPlayGameButton) {
            if (data.gamePath && isFound) {
                animalDetailsPlayGameButton.classList.remove('hidden');
                animalDetailsPlayGameButton.setAttribute('data-game-path', data.gamePath);
            } else {
                animalDetailsPlayGameButton.classList.add('hidden');
            }
        }
        
        // Initialize starburst background if needed
        initStarburstOverlay();
        
        // Show overlay with slide-in animation
        animalDetailsOverlay.classList.remove('hidden');
        // Force reflow to ensure transition works
        animalDetailsOverlay.offsetHeight;
        animalDetailsOverlay.classList.add('show');
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Hide animal details overlay
    function hideAnimalDetailsOverlay() {
        if (!animalDetailsOverlay) return;
        
        // Remove show class to trigger slide-out animation
        animalDetailsOverlay.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (animalDetailsOverlay.classList.contains('show')) return; // If shown again, don't hide
            animalDetailsOverlay.classList.add('hidden');
        }, 300); // Match CSS transition duration
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Initialize starburst background overlay
    function initStarburstOverlay() {
        if (!animalDetailsOverlay) return;
        
        const overlay = animalDetailsOverlay.querySelector('.starburst-background-overlay');
        if (overlay && !overlay.querySelector('img')) {
            const img = document.createElement('img');
            img.src = '../assets/Startburst.svg';
            img.alt = 'Starburst background';
            overlay.appendChild(img);
        }
    }

    // Handle Play Game button click
    function handlePlayGame() {
        if (!animalDetailsPlayGameButton) return;
        
        const gamePath = animalDetailsPlayGameButton.getAttribute('data-game-path');
        if (gamePath) {
            // Trigger haptic feedback
            if (typeof triggerHaptic === 'function') {
                triggerHaptic('single');
            }
            window.location.href = gamePath;
        }
    }

    // Update hotspot positions smoothly (called every frame)
    function updateHotspotPositions() {
        if (!mapInstance || !animalHotspots) return;
        
        // Get container bounds for visibility checking
        const containerRect = mapContainer ? mapContainer.getBoundingClientRect() : null;
        const containerWidth = containerRect ? containerRect.width : window.innerWidth;
        const containerHeight = containerRect ? containerRect.height : window.innerHeight;
        
        hotspotElements.forEach((hotspot, animalId) => {
            const animal = animals.find(a => a.id === animalId);
            if (!animal) return;
            
            try {
                // Animal hotspots always use real positioning
                const coords = gpsToScreenCoordinates(animal.location.lat, animal.location.lng, false);
                if (coords && isFinite(coords.x) && isFinite(coords.y)) {
                    // Round to integers to avoid fractional pixel issues on iOS
                    const x = Math.round(coords.x);
                    const y = Math.round(coords.y);
                    
                    // Check if hotspot is within viewport bounds (with some margin for transform offset)
                    const margin = 50; // Account for transform translate(-50%, -50%)
                    const isVisible = x >= -margin && x <= containerWidth + margin &&
                                     y >= -margin && y <= containerHeight + margin;
                    
                    // Get last known position
                    const lastPos = hotspotPositions.get(animalId);
                    
                    // Only update if position changed or visibility changed (iOS optimization)
                    if (!lastPos || lastPos.x !== x || lastPos.y !== y || lastPos.visible !== isVisible) {
                        // Update position
                        hotspot.style.left = x + 'px';
                        hotspot.style.top = y + 'px';
                        hotspot.style.display = isVisible ? 'block' : 'none';
                        
                        // Store current position
                        hotspotPositions.set(animalId, { x, y, visible: isVisible });
                    }
                } else {
                    // Invalid coordinates - hide hotspot
                    const lastPos = hotspotPositions.get(animalId);
                    if (!lastPos || lastPos.visible !== false) {
                        hotspot.style.display = 'none';
                        hotspotPositions.set(animalId, { x: 0, y: 0, visible: false });
                    }
                }
            } catch (e) {
                // Silently handle coordinate conversion errors
                const lastPos = hotspotPositions.get(animalId);
                if (!lastPos || lastPos.visible !== false) {
                    hotspot.style.display = 'none';
                    hotspotPositions.set(animalId, { x: 0, y: 0, visible: false });
                }
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
        // Show new animal nearby popup
        if (animalNearbyPopup && animal && animal.name) {
            // Update title with animal name
            if (animalNearbyTitle) {
                animalNearbyTitle.textContent = `A ${animal.name.toUpperCase()} IS NEARBY!`;
            }
            
            // Update message
            if (animalNearbyMessage) {
                animalNearbyMessage.textContent = "Open the camera to scan the area.";
            }
            
            // Set up open camera button
            if (animalNearbyOpenCamera) {
                // Remove any existing onclick handler first
                animalNearbyOpenCamera.onclick = null;
                // Set new onclick handler with current animal
                animalNearbyOpenCamera.onclick = function() {
                    // Trigger short haptic feedback
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('single');
                    }
                    window.location.href = `./animalsAR.html?animalId=${encodeURIComponent(animal.id)}`;
                };
            }
            
            // Show popup with slide-in animation
            animalNearbyPopup.classList.remove('hidden');
            // Force reflow to ensure transition works
            animalNearbyPopup.offsetHeight;
            animalNearbyPopup.classList.add('show');
        }
        
        // Hide proximity notification when in range (popup shows instead)
        if (proximityNotification) {
            proximityNotification.classList.remove('show');
            proximityNotification.classList.add('hidden');
        }
        
        // Keep old button for backwards compatibility (hidden)
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
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
            // If we're in nearby range, recalculate distance and show that notification
            const distance = haversineMeters(currentUserLocation, currentAnimal.location);
            showNearbyNotifications(currentAnimal, distance);
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
        
        // Check if audio is enabled before playing
        const audioEnabled = (typeof window.isAudioEnabled === 'function') ? window.isAudioEnabled() : true;
        
        // Play sound (only if audio is enabled)
        if (audioEnabled) {
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
        
        // Hide animal nearby popup when not in range
        if (animalNearbyPopup) {
            hideAnimalNearbyPopup();
        }
        
        // Show proximity notification at top of screen
        showNearbyNotifications(animal, distance);
    }
    
    function showNearbyNotifications(animal, distance) {
        // Hide animal nearby popup when not in range
        if (animalNearbyPopup) {
            hideAnimalNearbyPopup();
        }
        
        // Show proximity notification at top of screen
        if (proximityNotification && animal) {
            proximityNotification.textContent = `You are near a ${animal.name}. Move closer to scan it!`;
            proximityNotification.classList.remove('hidden');
            proximityNotification.className = 'proximity-notification nearby show';
        }
        
        // Keep old button for backwards compatibility (hidden)
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
        }
    }

    function clearProximityState() {
        proximityState = null;
        currentAnimal = null;
        
        // Hide animal nearby popup
        if (animalNearbyPopup) {
            hideAnimalNearbyPopup();
        }
        
        // Hide proximity notification
        if (proximityNotification) {
            proximityNotification.classList.remove('show');
            proximityNotification.classList.add('hidden');
        }
        
        // Keep old button for backwards compatibility (hidden)
        if (openCameraBtn) {
            openCameraBtn.classList.remove('show');
            openCameraBtn.disabled = true;
            openCameraBtn.onclick = null;
        }
    }

    // Show animal nearby popup
    function showAnimalNearbyPopup() {
        if (!animalNearbyPopup) return;
        
        animalNearbyPopup.classList.remove('hidden');
        // Force reflow to ensure transition works
        animalNearbyPopup.offsetHeight;
        animalNearbyPopup.classList.add('show');
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Hide animal nearby popup
    function hideAnimalNearbyPopup() {
        if (!animalNearbyPopup) return;
        
        animalNearbyPopup.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (animalNearbyPopup.classList.contains('show')) return; // If shown again, don't hide
            animalNearbyPopup.classList.add('hidden');
        }, 300); // Match CSS transition duration
        
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    // Update heading indicator rotation
    // Cache last heading value to avoid unnecessary updates
    let lastHeadingValue = null;
    let hasReceivedFirstHeading = false; // Track if we've received the first valid heading
    
    function updateHeadingIndicator(heading) {
        if (!userLocationHeading) {
            return;
        }
        
        // If heading is null/undefined, hide the indicator
        if (heading === null || heading === undefined || isNaN(heading)) {
            userLocationHeading.style.display = 'none';
            userLocationHeading.style.opacity = '0';
            userLocationHeading.style.visibility = 'hidden';
            lastHeadingValue = null;
            hasReceivedFirstHeading = false;
            return;
        }
        
        // Ensure heading is a valid number between 0-360
        let normalizedHeading = Number(heading);
        if (isNaN(normalizedHeading)) {
            userLocationHeading.style.display = 'none';
            lastHeadingValue = null;
            hasReceivedFirstHeading = false;
            return;
        }
        
        // Normalize to 0-360 range
        normalizedHeading = normalizedHeading % 360;
        if (normalizedHeading < 0) {
            normalizedHeading = 360 + normalizedHeading;
        }
        
        // Round heading to nearest degree to avoid sub-degree flickering
        const roundedHeading = Math.round(normalizedHeading);
        
        // Check if position is set (required before showing)
        const currentLeft = userLocationHeading.style.left;
        const currentTop = userLocationHeading.style.top;
        
        if (!currentLeft || !currentTop) {
            // Position not set yet, hide until it's ready
            userLocationHeading.style.display = 'none';
            return;
        }
        
        // Mark that we've received the first valid heading
        if (!hasReceivedFirstHeading) {
            hasReceivedFirstHeading = true;
            
            // Log to haptic debug UI if available
            logToHapticDebug(`First heading: ${roundedHeading}° - Showing triangle`);
            
            // CRITICAL FIX: Use CSS custom property to set rotation BEFORE making visible
            // This ensures the rotation is in the CSS before the element is rendered
            // Set the CSS custom property first
            userLocationHeading.style.setProperty('--heading-rotation', `${roundedHeading}deg`);
            
            // Also set inline transform as fallback for browsers that don't support CSS variables in transform
            userLocationHeading.style.transform = `translate(-50%, -50%) translateY(-19px) rotate(${roundedHeading}deg) scale(1) translateZ(0)`;
            userLocationHeading.style.webkitTransform = `translate(-50%, -50%) translateY(-19px) rotate(${roundedHeading}deg) scale(1) translateZ(0)`;
            
            // Force a reflow to ensure CSS is applied
            void userLocationHeading.offsetHeight;
            
            // NOW make it visible - rotation is already set in CSS, so no flash at 0deg
            userLocationHeading.style.display = 'block';
            userLocationHeading.style.opacity = '1';
            userLocationHeading.style.visibility = 'visible';
            lastHeadingValue = roundedHeading;
            
            // Log to haptic debug UI if available
            logToHapticDebug(`Triangle visible at ${roundedHeading}°`);
            return;
        }
        
        // Only update if heading actually changed (avoids unnecessary repaints)
        if (roundedHeading === lastHeadingValue) {
            return;
        }
        
        // Update heading for subsequent changes
        // Rotate triangle to point in the direction of heading
        // Heading is in degrees (0-360, where 0 is North)
        // CSS rotate rotates clockwise, and 0 degrees points up (North)
        // The triangle is positioned outside the dot border with spacing (19px from center)
        // Use scale(1) and translateZ(0) to prevent scaling and ensure GPU acceleration
        // Position is set separately in animation loop, so we only update rotation here
        // Use rounded heading to avoid sub-degree flickering
        // Update CSS custom property for rotation
        userLocationHeading.style.setProperty('--heading-rotation', `${roundedHeading}deg`);
        // Also set inline transform as fallback
        userLocationHeading.style.transform = `translate(-50%, -50%) translateY(-19px) rotate(${roundedHeading}deg) scale(1) translateZ(0)`;
        // Also update webkit transform for better browser compatibility
        userLocationHeading.style.webkitTransform = `translate(-50%, -50%) translateY(-19px) rotate(${roundedHeading}deg) scale(1) translateZ(0)`;
        lastHeadingValue = roundedHeading;
    }
    
    // Handle device orientation for compass heading
    function handleDeviceOrientation(event) {
        let heading = null;
        let source = 'none';
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        // Log first event to see what we're getting
        if (!window._firstOrientationEventLogged) {
            window._firstOrientationEventLogged = true;
            const hasWebkit = event.webkitCompassHeading !== null && event.webkitCompassHeading !== undefined && !isNaN(event.webkitCompassHeading);
            logToHapticDebug(`Event: webkit=${hasWebkit ? Math.round(event.webkitCompassHeading) : 'no'}, alpha=${event.alpha !== null ? Math.round(event.alpha) : 'no'}`);
        }
        
        // CRITICAL: On iOS, webkitCompassHeading is the ACTUAL compass heading
        // event.alpha on iOS is device orientation, NOT compass heading
        // Always prioritize webkitCompassHeading if available (iOS Safari)
        if (event.webkitCompassHeading !== null && event.webkitCompassHeading !== undefined && !isNaN(event.webkitCompassHeading)) {
            heading = event.webkitCompassHeading;
            source = 'webkitCompassHeading';
        } 
            // On Android, calculate compass heading from device orientation
            // event.alpha on Android represents rotation around z-axis, but needs proper calculation
            else if (isAndroid && event.alpha !== null && event.alpha !== undefined && !isNaN(event.alpha)) {
            // Only use alpha if we don't have a recent GPS heading (GPS is more accurate when moving)
            // Check if we have a recent GPS heading (within last 3 seconds)
            const now = Date.now();
            if (window._lastGPSHeadingTime && (now - window._lastGPSHeadingTime) < 3000) {
                // GPS heading is recent, don't override it
                return;
            }
            
            // Calculate compass heading from device orientation
            // For Android, when device is held in portrait mode and relatively flat:
            // - alpha: rotation around z-axis (0-360, where 0 is when device points north)
            // - beta: tilt forward/backward (-180 to 180)
            // - gamma: tilt left/right (-90 to 90)
            
            // If device is relatively flat (beta and gamma close to 0), alpha can be used directly
            // But we need to normalize it properly
            let calculatedHeading = event.alpha;
            
            // Normalize alpha to 0-360 range
            if (calculatedHeading < 0) {
                calculatedHeading = 360 + calculatedHeading;
            }
            calculatedHeading = calculatedHeading % 360;
            
            // On some Android devices, alpha might need to be inverted or offset
            // Try to calibrate based on GPS heading if we have a reference
            // Store multiple calibration samples for better accuracy
            if (window._androidCalibrationSamples === undefined) {
                window._androidCalibrationSamples = [];
            }
            
            // Collect calibration samples when GPS heading is available
            if (window._lastGPSHeadingTime && lastGPSHeading !== null) {
                const timeSinceGPS = now - window._lastGPSHeadingTime;
                if (timeSinceGPS < 5000) {
                    // Calculate offset between GPS and alpha
                    let offset = lastGPSHeading - calculatedHeading;
                    // Normalize offset to -180 to 180 range
                    if (offset > 180) offset -= 360;
                    if (offset < -180) offset += 360;
                    
                    // Store sample (keep last 10 samples)
                    window._androidCalibrationSamples.push(offset);
                    if (window._androidCalibrationSamples.length > 10) {
                        window._androidCalibrationSamples.shift();
                    }
                    
                    // Calculate average offset from samples
                    const avgOffset = window._androidCalibrationSamples.reduce((a, b) => a + b, 0) / window._androidCalibrationSamples.length;
                    window._androidCalibrationOffset = avgOffset;
                    
                    if (window._androidCalibrationSamples.length === 1) {
                        logToHapticDebug(`Calibrating...`);
                    } else if (window._androidCalibrationSamples.length === 10) {
                        logToHapticDebug(`Calibrated: ${Math.round(avgOffset)}°`);
                    }
                }
            }
            
            // Apply calibration offset if available
            if (window._androidCalibrationOffset !== undefined) {
                calculatedHeading = (calculatedHeading + window._androidCalibrationOffset) % 360;
                if (calculatedHeading < 0) calculatedHeading += 360;
            }
            
            heading = calculatedHeading;
            source = 'alpha (Android)';
        }
        // On iOS, if webkitCompassHeading is missing, log once then exit
        else if (isIOS) {
            if (!window._iosHeadingWarningLogged) {
                window._iosHeadingWarningLogged = true;
                logToHapticDebug('iOS: No webkit');
            }
            return; // Exit early on iOS if no webkitCompassHeading
        }
        // On other platforms or if no heading data available, exit
        else {
            return;
        }
        
        // If we have a valid heading, process it
        if (heading !== null && heading !== undefined && !isNaN(heading)) {
            // Normalize to 0-360 range
            if (heading < 0) {
                heading = 360 + heading;
            }
            heading = heading % 360;
            
            // Store the heading
            currentHeading = heading;
            
            // Update heading indicator immediately (always update for smooth rotation)
            updateHeadingIndicator(currentHeading);
            
            // Only log heading changes (every 5 degrees or first time) to avoid spam but show more updates
            const roundedHeading = Math.round(heading);
            if (!window._lastLoggedHeading || Math.abs(roundedHeading - window._lastLoggedHeading) >= 5) {
                const sourceText = source === 'webkitCompassHeading' ? 'iOS' : 'Android';
                logToHapticDebug(`${roundedHeading}° (${sourceText})`);
                window._lastLoggedHeading = roundedHeading;
            }
        }
        
        // Log event properties only on first event to help debug
        if (!window._headingDebugLogged) {
            window._headingDebugLogged = true;
            if (isIOS) {
                logToHapticDebug(`iOS: webkit=${event.webkitCompassHeading}, acc=${event.webkitCompassAccuracy}`);
            } else if (isAndroid) {
                logToHapticDebug(`Android: alpha=${Math.round(event.alpha || 0)}, beta=${Math.round(event.beta || 0)}, gamma=${Math.round(event.gamma || 0)}`);
            }
        }
    }
    
    // Handle GPS heading from Geolocation API (works on Android when device is moving)
    let lastGPSHeading = null;
    function handleGPSHeading(coords) {
        // Log first GPS position to see if heading is available
        if (!window._firstGPSHeadingLogged) {
            window._firstGPSHeadingLogged = true;
            const hasHeading = coords && coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading) && coords.heading >= 0;
            logToHapticDebug(`GPS: heading=${hasHeading ? Math.round(coords.heading) : 'no'}`);
        }
        
        // GPS heading is only available when device is moving
        // coords.heading is the direction of travel in degrees (0-360, where 0 is North)
        if (coords && coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading) && coords.heading >= 0) {
            let heading = coords.heading;
            
            // Normalize to 0-360 range
            if (heading < 0) {
                heading = 360 + heading;
            }
            heading = heading % 360;
            
            // Store the heading
            currentHeading = heading;
            
            // Track when GPS heading was last updated (for Android alpha fallback)
            window._lastGPSHeadingTime = Date.now();
            
            // Update heading indicator (always update for smooth rotation)
            updateHeadingIndicator(currentHeading);
            
            // Only log heading changes (every 5 degrees or first time) to avoid spam but show more updates
            const roundedHeading = Math.round(heading);
            if (lastGPSHeading === null || Math.abs(roundedHeading - lastGPSHeading) >= 5) {
                logToHapticDebug(`${roundedHeading}° (GPS)`);
                lastGPSHeading = roundedHeading;
            }
        } else if (!window._gpsNoHeadingLogged) {
            window._gpsNoHeadingLogged = true;
            const isAndroid = /Android/.test(navigator.userAgent);
            if (isAndroid) {
                logToHapticDebug('GPS: No heading (using compass)');
            } else {
                logToHapticDebug('GPS: No heading (move device)');
            }
        }
    }
    
    // Start compass/heading tracking
    function startHeadingTracking() {
        console.log('[Heading] startHeadingTracking() called');
        
        // Ensure heading indicator is hidden and reset before starting
        if (userLocationHeading) {
            userLocationHeading.style.display = 'none';
            hasReceivedFirstHeading = false;
            lastHeadingValue = null;
        }
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        // Log that we're starting heading tracking
        const platform = isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other';
        console.log(`[Heading] Platform: ${platform}`);
        logToHapticDebug(`Starting... (${platform})`);
        
        // Check if DeviceOrientationEvent is supported
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            logToHapticDebug('iOS: Requesting...');
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        // Add listener - should fire immediately with current orientation
                        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
                        logToHapticDebug('iOS: Granted');
                    } else {
                        logToHapticDebug('iOS: Denied');
                        if (userLocationHeading) {
                            userLocationHeading.style.display = 'none';
                        }
                    }
                })
                .catch(err => {
                    logToHapticDebug(`iOS: Error ${err.message || ''}`);
                    if (userLocationHeading) {
                        userLocationHeading.style.display = 'none';
                    }
                });
        } else if ('DeviceOrientationEvent' in window) {
            // Android/other browsers - add listener (but won't use alpha, will use GPS heading)
            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
            if (isAndroid) {
                logToHapticDebug('Android: Waiting GPS');
            } else {
                logToHapticDebug('Other: Listening...');
            }
        } else {
            logToHapticDebug('No orientation API');
            if (userLocationHeading) {
                userLocationHeading.style.display = 'none';
            }
        }
    }
    
    // Stop compass/heading tracking
    function stopHeadingTracking() {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
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
        
        // Extract GPS heading if available (works on Android when device is moving)
        // GPS heading is the direction of travel, which is useful for compass heading
        // Always call handleGPSHeading to log diagnostic info, even if heading is null
        if (pos && pos.coords) {
            handleGPSHeading(pos.coords);
        }
        
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
        // Location errors are handled by the browser's geolocation API
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
        // Stop heading tracking
        stopHeadingTracking();
    }

    // Start GPS tracking
    function startTracking() {
        // Stop any existing tracking first
        stopTracking();

        if (!('geolocation' in navigator)) {
            console.error('Geolocation not supported');
            return;
        }

        // Use real geolocation API
        const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        watchId = navigator.geolocation.watchPosition(onPosition, onError, opts);
        
        // Start heading/compass tracking
        startHeadingTracking();
    }

    // Toggle between production and testing environments (called by long-press on help button)
    function toggleEnvironment() {
        // Toggle environment
        currentEnvironment = currentEnvironment === 'production' ? 'testing' : 'production';
        
        // Save to localStorage
        saveEnvironment();
        
        // Show notification briefly before reload
        if (proximityNotification) {
            const modeText = currentEnvironment === 'testing' 
                ? 'TESTING MODE: Reloading page...' 
                : 'PRODUCTION MODE: Reloading page...';
            proximityNotification.textContent = modeText;
            proximityNotification.className = 'proximity-notification show';
        }
        
        console.log(`Environment switched to: ${currentEnvironment.toUpperCase()}, reloading page...`);
        
        // Reload the page to ensure everything loads correctly with the new environment
        setTimeout(() => {
            window.location.reload();
        }, 500); // Small delay to show the notification
    }
    
    /**
     * Initialize environment from saved state or default to production
     */
    function initializeEnvironment() {
        // Load saved environment
        currentEnvironment = loadSavedEnvironment();
        
        // Update MapConfig with the loaded environment
        MapConfig.setEnvironment(currentEnvironment);
        
        console.log(`Environment initialized to: ${currentEnvironment.toUpperCase()}`);
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
        // Initialize environment from saved state or default to production
        initializeEnvironment();
        
        // Ensure heading indicator is hidden until we have a valid heading
        if (userLocationHeading) {
            userLocationHeading.style.display = 'none';
        }
        
        // Sync user data to Customer.io on page load (ensures latest badge status is synced)
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || 'null');
            if (userData && userData.userId && typeof syncUserToCustomerIO === 'function') {
                syncUserToCustomerIO(userData);
            }
        } catch (e) {
            console.warn('Error syncing to Customer.io on page load:', e);
        }
        
        // Initialize map
        mapInstance = new InteractiveMap();
        
        // Initialize orientation manager
        new OrientationManager();
        
        // Load animals and render hotspots (will use currentEnvironment)
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
                    // Trigger short haptic feedback
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('single');
                    }
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
                    // Trigger long haptic feedback for long press
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('long');
                    }
                    toggleEnvironment();
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
                    // Trigger long haptic feedback for long press
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('long');
                    }
                    toggleEnvironment();
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
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                // Prime audio when user clicks "Got It!" button
                primeAudio();
                hideInstructions();
            });
        }

        // Setup back button - show leave confirmation overlay
        if (backButton) {
            backButton.addEventListener('click', () => {
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                showLeaveConfirmation();
            });
        }

        // Setup leave confirmation overlay buttons
        if (leaveConfirmClose) {
            leaveConfirmClose.addEventListener('click', () => {
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                // Close overlay and stay on page
                hideLeaveConfirmation();
            });
        }

        if (leaveConfirmButton) {
            leaveConfirmButton.addEventListener('click', () => {
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                // Navigate to menu page
                window.location.href = '../menu.html';
            });
        }

        // Setup zoom buttons (after mapInstance is created)
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (!mapInstance) return;
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                mapInstance.zoom(0.1);
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (!mapInstance) return;
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                mapInstance.zoom(-0.1);
            });
        }

        // Setup recenter button
        if (recenterBtn) {
            let longPressTimer = null;
            let isLongPress = false;
            const longPressDuration = 500; // 500ms for long press

            // Normal click handler
            recenterBtn.addEventListener('click', (e) => {
                // Only recenter if it wasn't a long press
                if (!isLongPress && mapInstance && currentUserLocation) {
                    // Trigger short haptic feedback
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('single');
                    }
                    // Reset manual movement flag so auto-recenter can work again
                    mapInstance.recenterToUserLocation(currentUserLocation, true);
                }
                isLongPress = false; // Reset flag
            });

            // Long press detection
            recenterBtn.addEventListener('touchstart', (e) => {
                isLongPress = false;
                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    // Trigger long haptic feedback for long press
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('long');
                    }
                    // Show haptic debug toggle on long press
                    if (typeof window.showHapticDebug === 'function') {
                        window.showHapticDebug();
                    }
                }, longPressDuration);
            }, { passive: true });

            recenterBtn.addEventListener('touchend', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }, { passive: true });

            recenterBtn.addEventListener('touchcancel', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }, { passive: true });

            // Also support mouse events for desktop testing
            recenterBtn.addEventListener('mousedown', (e) => {
                isLongPress = false;
                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    // Trigger long haptic feedback for long press
                    if (typeof triggerHaptic === 'function') {
                        triggerHaptic('long');
                    }
                    // Show haptic debug toggle on long press
                    if (typeof window.showHapticDebug === 'function') {
                        window.showHapticDebug();
                    }
                }, longPressDuration);
            });

            recenterBtn.addEventListener('mouseup', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });

            recenterBtn.addEventListener('mouseleave', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
        }

        // Setup boundary warning close button
        if (boundaryWarningClose) {
            boundaryWarningClose.addEventListener('click', () => {
                // Trigger short haptic feedback
                if (typeof triggerHaptic === 'function') {
                    triggerHaptic('single');
                }
                hideBoundaryWarning();
            });
        }

        // Setup animal detail popup close button
        if (animalDetailClose) {
            animalDetailClose.addEventListener('click', () => {
                hideAnimalDetailPopup();
            });
        }

        // Setup animal detail popup buttons
        if (animalDetailDirections) {
            animalDetailDirections.addEventListener('click', () => {
                const animalId = animalDetailDirections.dataset.animalId;
                handleDirectionsClick(animalId);
            });
        }

        if (animalDetailDetails) {
            animalDetailDetails.addEventListener('click', () => {
                const animalId = animalDetailDetails.dataset.animalId;
                handleDetailsClick(animalId);
            });
        }

        // Close popup when clicking outside (on the overlay background)
        if (animalDetailPopup) {
            animalDetailPopup.addEventListener('click', (e) => {
                // Only close if clicking the popup background, not the content
                if (e.target === animalDetailPopup) {
                    hideAnimalDetailPopup();
                }
            });
        }

        // Setup directions popup close button
        if (directionsClose) {
            directionsClose.addEventListener('click', () => {
                hideDirectionsPopup();
            });
        }

        // Close directions popup when clicking outside (on the overlay background)
        if (directionsPopup) {
            directionsPopup.addEventListener('click', (e) => {
                // Only close if clicking the popup background, not the content
                if (e.target === directionsPopup) {
                    hideDirectionsPopup();
                }
            });
        }

        // Setup animal details overlay back button
        if (animalDetailsBackButton) {
            animalDetailsBackButton.addEventListener('click', () => {
                hideAnimalDetailsOverlay();
            });
        }

        // Setup animal details play game button
        if (animalDetailsPlayGameButton) {
            animalDetailsPlayGameButton.addEventListener('click', () => {
                handlePlayGame();
            });
        }

        // Setup animal nearby popup close button
        if (animalNearbyClose) {
            animalNearbyClose.addEventListener('click', () => {
                hideAnimalNearbyPopup();
            });
        }

        // Close animal nearby popup when clicking outside (on the overlay background)
        if (animalNearbyPopup) {
            animalNearbyPopup.addEventListener('click', (e) => {
                // Only close if clicking the popup background, not the content
                if (e.target === animalNearbyPopup) {
                    hideAnimalNearbyPopup();
                }
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
        
        // Listen for storage changes to update icons when animals are collected
        // This allows icons to update when badges are collected in other pages
        window.addEventListener('storage', (e) => {
            if (e.key === 'collectedBadges') {
                updateHotspotIcons();
            }
        });
        
        // Also listen for custom storage events (for same-tab updates)
        // Some browsers don't fire storage events for same-tab changes
        window.addEventListener('badgeCollected', () => {
            updateHotspotIcons();
        });
        
        // Periodically check for icon updates (fallback for browsers that don't support storage events)
        setInterval(() => {
            updateHotspotIcons();
        }, 2000); // Check every 2 seconds
    });
})();

