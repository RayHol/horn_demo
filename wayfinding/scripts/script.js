
// Global variable to store current animal config
let currentAnimalConfig = null;

function getQueryParam(name) {
    const p = new URLSearchParams(location.search).get(name);
    return p && decodeURIComponent(p);
}

async function loadAnimalConfig() {
    try {
        // Switch between testing and production data by commenting/uncommenting the appropriate line:
        const res = await fetch('./data/animals.json', { cache: 'no-cache' }); // Production/Onsite
        // const res = await fetch('./data/testing.json', { cache: 'no-cache' }); // Testing/Home
        const cfg = await res.json();
        const id = getQueryParam('animalId');
        const list = Array.isArray(cfg.animals) ? cfg.animals : [];
        const animal = list.find(a => a.id === id) || list[0] || null;
        if (animal) {
            currentAnimalConfig = animal;
        }
        return animal;
    } catch (e) {
        return null;
    }
}

// Animal to Badge Mapping
function getBadgeDataForAnimal(animalName) {
    const badgeMap = {
        'Peacock': {
            badgeId: 'peacock',
            iconPath: '../assets/badges/icons/peacock-badge.svg',
            badgeName: 'Peacock Spotter',
            description: 'You found the magnificent peacock! A true explorer of the Horniman grounds.',
            gamePath: '../photographer-game.html'
        },
        'Walrus': {
            badgeId: 'walrus-ar',
            iconPath: '../assets/badges/icons/walrus-badge.svg',
            badgeName: 'Walrus Finder',
            description: 'You discovered the walrus! Great tracking skills on your adventure.',
            gamePath: '../walrus-game.html'
        },
        'Koala': {
            badgeId: 'koala',
            iconPath: '../assets/badges/icons/Koala.svg',
            badgeName: 'Koala Discoverer',
            description: 'You found the koala! Your keen eye spotted this hidden treasure.'
        },
        'Bee': {
            badgeId: 'bee-ar',
            iconPath: '../assets/badges/icons/bee-badge.svg',
            badgeName: 'Bee Hunter',
            description: 'You found the bee! A tiny but important discovery on your journey.',
            gamePath: '../sunflower-game.html'
        },
        'Clown Fish': {
            badgeId: 'clownfish-ar',
            iconPath: '../assets/badges/icons/clownfish-badge.svg',
            badgeName: 'Clownfish Seeker',
            description: 'You found the clownfish! A colorful addition to your collection.',
            gamePath: '../anemone-game.html'
        },
        'Platypus': {
            badgeId: 'platypus',
            iconPath: '../assets/badges/icons/platypus.svg',
            badgeName: 'Platypus Explorer',
            description: 'You found the platypus! One of nature\'s most unique creatures.'
        },
        'Cephalopod': {
            badgeId: 'cephalopod',
            iconPath: '../assets/badges/icons/Shelled Cephalopod.svg',
            badgeName: 'Cephalopod Collector',
            description: 'You found the cephalopod! A fascinating marine discovery.'
        },
        'Stag Beetle': {
            badgeId: 'stag-beetle',
            iconPath: '../assets/badges/icons/Stag Beetle.svg',
            badgeName: 'Beetle Spotter',
            description: 'You found the stag beetle! A small but impressive find.'
        },
        'Snowy Owl': {
            badgeId: 'snowy-owl',
            iconPath: '../assets/badges/icons/snowy owl.svg',
            badgeName: 'Owl Watcher',
            description: 'You found the snowy owl! A wise and majestic discovery.'
        },
        'Orangutan': {
            badgeId: 'orangutan',
            iconPath: '../assets/badges/icons/orangutan.svg',
            badgeName: 'Orangutan Tracker',
            description: 'You found the orangutan! A great ape discovery on your adventure.'
        },
        'Jellyfish': {
            badgeId: 'jellyfish-ar',
            iconPath: '../assets/badges/icons/jellyfish-badge.svg',
            badgeName: 'Jellyfish Finder',
            description: 'You found the jellyfish! A graceful and mesmerizing discovery.'
        },
        'Robin': {
            badgeId: 'robin',
            iconPath: '../assets/badges/icons/Robin.svg',
            badgeName: 'Robin Seeker',
            description: 'You found the robin! A cheerful bird to add to your collection.'
        }
    };
    
    // Return badge data or use placeholder
    const badgeData = badgeMap[animalName];
    if (badgeData) {
        return badgeData;
    }
    
    // Fallback to placeholder
    return {
        badgeId: animalName.toLowerCase().replace(/\s+/g, '-'),
        iconPath: '../assets/badges/icons/placeholder.svg',
        badgeName: animalName + ' Finder',
        description: 'You found ' + animalName + '! A great discovery on your adventure.'
    };
}

window.onload = async () => {
    // Initialize starburst backgrounds in overlays
    function initStarburstOverlay(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const overlay = container.querySelector('.starburst-background-overlay');
            if (overlay && !overlay.querySelector('img')) {
                const img = document.createElement('img');
                img.src = '../assets/Startburst.svg';
                img.alt = 'Starburst background';
                overlay.appendChild(img);
            }
        }
    }
    
    // Initialize when overlays are shown
    const observer = new MutationObserver(() => {
        initStarburstOverlay('badgeSplash');
        initStarburstOverlay('badgeCollection');
    });
    
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    
    // Initial check
    initStarburstOverlay('badgeSplash');
    initStarburstOverlay('badgeCollection');
    
    const button = document.querySelector('button[data-action="camera-btn"]');
    if (button) {
        button.innerText = '';
        button.disabled = true; // disabled until animal is found
    }

    // Load animal config (by id) and render
    const animal = await loadAnimalConfig();
    if (!animal) {
        console.error('No animal config found. Please ensure animals.json is available.');
        return;
    }

    // Build model descriptor from animal.model
    models = [
        {
            url: animal.model && animal.model.url ? animal.model.url : './assets/model/scene.glb',
            scale: animal.model && animal.model.scale ? animal.model.scale : '1 1 1',
            info: animal.name || 'Asset',
            rotation: animal.model && animal.model.rotation ? animal.model.rotation : '0 180 0',
            position: animal.model && animal.model.position ? animal.model.position : undefined
        }
    ];
    modelIndex = 0;

    const places = [ { name: animal.name || 'Animal', location: animal.location } ];
    renderPlaces(places);

    // Debug proximity UI: show distance, accuracy, effective
    try {
        const proximityEl = document.getElementById('proximityDebug');
        const cameraEl = document.getElementById('mainCamera');
        const radius = (animal && animal.radiusMeters) ? animal.radiusMeters : 10;
        if (proximityEl) proximityEl.innerText = 'Proximity: waiting for GPS…';
        if (proximityEl && animal && animal.location) {
            // Live GPS stabilizer (EMA + accuracy gating)
            function makeGpsStabilizer(opts) {
                const cfg = Object.assign({ minAccuracy: 20, alpha: 0.4, minDelta: 0.3, emitIntervalMs: 100 }, opts || {});
                let state = null; let lastEmit = 0;
                function dist(a, b) {
                    const toRad = d => d * Math.PI / 180; const R = 6371000;
                    const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
                    const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
                    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
                    return 2*R*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
                }
                return function push(raw, onEmit) {
                    if (!raw) return;
                    const acc = (raw.accuracy != null && isFinite(raw.accuracy)) ? raw.accuracy : Infinity;
                    if (acc > cfg.minAccuracy) return;
                    const sample = { lat: raw.latitude, lng: raw.longitude, acc: acc };
                    if (!state) { state = sample; onEmit && onEmit(state); lastEmit = Date.now(); return; }
                    state = { lat: state.lat + cfg.alpha * (sample.lat - state.lat), lng: state.lng + cfg.alpha * (sample.lng - state.lng), acc: (state.acc + sample.acc) / 2 };
                    const now = Date.now(); const moved = dist(state, sample);
                    if (moved < cfg.minDelta) return; if (now - lastEmit < cfg.emitIntervalMs) return; lastEmit = now; onEmit && onEmit(state);
                };
            }
            const pushStabilized = makeGpsStabilizer({ minAccuracy: 20, alpha: 0.4, minDelta: 0.3, emitIntervalMs: 100 });
            const VISIBILITY_THRESHOLD_METERS = 20; // Show model within 20 meters
            const GPS_ACCURACY_THRESHOLD = 30; // Hide model if GPS accuracy is worse than this (meters) - increased to be less restrictive
            const infoDiv = document.querySelector('.instructions');
            
            // Animation for scanning dots
            let dotCount = 0;
            
            function startScanningAnimation() {
                const infoDiv = document.querySelector('.instructions');
                if (!infoDiv) return;
                
                // Clear any existing animation
                if (scanningAnimationInterval) {
                    clearInterval(scanningAnimationInterval);
                }
                dotCount = 0;
                
                scanningAnimationInterval = setInterval(function() {
                    const infoDiv = document.querySelector('.instructions');
                    if (!infoDiv || infoDiv.classList.contains('instructions--found')) {
                        // Stop animation if element doesn't exist or animal is found
                        if (window.stopScanningAnimation) window.stopScanningAnimation();
                        return;
                    }
                    
                    // Check if we're still in scanning mode (not loading, calibrating, or too far)
                    const loaderOverlay = document.getElementById('sceneLoader');
                    const loaderVisible = loaderOverlay && loaderOverlay.classList.contains('is-visible');
                    const currentText = infoDiv.innerHTML || infoDiv.innerText;
                    
                    if (loaderVisible || currentText.includes('Calibrating GPS') || currentText.includes('too far away')) {
                        if (window.stopScanningAnimation) window.stopScanningAnimation();
                        return;
                    }
                    
                    // Cycle through dots: 1, 2, 3
                    dotCount = (dotCount % 3) + 1;
                    const dots = '.'.repeat(dotCount);
                    infoDiv.innerHTML = 'Scanning the area' + dots + '<br>look around the area to find the animals';
                }, 500); // Update every 500ms
            }
            
            function stopScanningAnimation() {
                if (scanningAnimationInterval) {
                    clearInterval(scanningAnimationInterval);
                    scanningAnimationInterval = null;
                }
            }
            
            // Make functions globally accessible
            window.startScanningAnimation = startScanningAnimation;
            window.stopScanningAnimation = stopScanningAnimation;
            const update = function (pos) {
                if (!pos) return;
                const lat = (pos.latitude != null) ? pos.latitude : pos.lat;
                const lng = (pos.longitude != null) ? pos.longitude : pos.lng;
                const accVal = (pos.accuracy != null && isFinite(pos.accuracy)) ? pos.accuracy : (pos.acc != null ? pos.acc : null);
                if (lat == null || lng == null) return;
                const d = haversineDistanceMeters({ lat: lat, lng: lng }, animal.location);
                const accuracy = accVal != null ? Math.max(0, Math.round(accVal)) : 0;
                const effective = Math.max(0, Math.round(d - (accVal != null ? accVal : 0)));
                const within = effective <= radius;
                proximityEl.innerHTML = `TESTING- ${animal.name || 'Animal'}: ${Math.round(d)}m away`;
                
                // Check GPS accuracy - fade out if accuracy is too low
                const gpsAccuracyLow = accVal != null && accVal > GPS_ACCURACY_THRESHOLD;
                
                // Distance-based visibility: show model within 20 meters, hide beyond
                if (currentModelEntity && currentModelEntity.object3D) {
                    const shouldBeVisible = d <= VISIBILITY_THRESHOLD_METERS && !gpsAccuracyLow;
                    
                    // Handle GPS calibration (low accuracy)
                    if (gpsAccuracyLow && isModelVisible && !isGpsCalibrating) {
                        // GPS accuracy dropped, fade out model
                        isGpsCalibrating = true;
                        isModelVisible = false;
                        fadeOutGltf(currentModelEntity, 500);
                    } else if (!gpsAccuracyLow && isGpsCalibrating) {
                        // GPS accuracy improved, can show model again if within range
                        isGpsCalibrating = false;
                        if (d <= VISIBILITY_THRESHOLD_METERS) {
                            isModelVisible = true;
                            fadeInGltf(currentModelEntity, 500);
                        }
                    }
                    
                    // Handle distance-based visibility (only if GPS is accurate)
                    if (!gpsAccuracyLow) {
                        if (shouldBeVisible && !isModelVisible && !isGpsCalibrating) {
                            // Fade in when entering 20 meter range
                            isModelVisible = true;
                            fadeInGltf(currentModelEntity, 500);
                        } else if (!shouldBeVisible && isModelVisible) {
                            // Fade out when leaving 20 meter range
                            isModelVisible = false;
                            fadeOutGltf(currentModelEntity, 500);
                        }
                    }
                }
                
                // Update instructions text based on distance and GPS accuracy
                // Only update if loader is not visible (loader visibility is handled by showLoader/hideLoader)
                if (infoDiv && !infoDiv.classList.contains('instructions--found')) {
                    // Check if loader is visible - if so, don't update text (it's handled by showLoader/hideLoader)
                    const loaderOverlay = document.getElementById('sceneLoader');
                    const loaderVisible = loaderOverlay && loaderOverlay.classList.contains('is-visible');
                    
                    // Skip text updates if loader is visible - it's already set to "Loading..." by showLoader()
                    if (loaderVisible) {
                        return; // Don't override the loading text
                    }
                    
                    if (gpsAccuracyLow) {
                        // GPS accuracy is low - show calibrating message
                        if (window.stopScanningAnimation) window.stopScanningAnimation(); // Stop animation when calibrating
                        const calibratingText = 'Calibrating GPS';
                        if (infoDiv.innerHTML !== calibratingText && infoDiv.innerText !== calibratingText) {
                            infoDiv.innerText = calibratingText;
                            infoDiv.classList.remove('instructions--found');
                            infoDiv.classList.add('instructions--not-found');
                        }
                    } else if (d > VISIBILITY_THRESHOLD_METERS) {
                        // User is too far away
                        if (window.stopScanningAnimation) window.stopScanningAnimation(); // Stop animation when too far
                        const tooFarText = 'You are too far away to see the animal';
                        if (infoDiv.innerHTML !== tooFarText && infoDiv.innerText !== tooFarText) {
                            infoDiv.innerText = tooFarText;
                            infoDiv.classList.remove('instructions--found');
                            infoDiv.classList.add('instructions--not-found');
                        }
                    } else {
                        // Loading complete, show scanning message
                        if (!infoDiv.classList.contains('instructions--found')) {
                            infoDiv.classList.remove('instructions--found');
                            infoDiv.classList.add('instructions--not-found');
                            // Start the scanning animation if not already running
                            if (!scanningAnimationInterval && window.startScanningAnimation) {
                                window.startScanningAnimation();
                            }
                        }
                    }
                }
            };
            if (cameraEl) {
                cameraEl.addEventListener('gps-camera-update-position', function (e) {
                    const detail = e && e.detail ? e.detail : null;
                    if (!detail || !detail.position) return;
                    pushStabilized(detail.position, update);
                });

                // Manual stabilized GPS feed to ensure periodic AR.js updates while moving
                try {
                    const dispatchGpsUpdate = function (lat, lng, acc) {
                        const evt = new CustomEvent('gps-camera-update-position', {
                            detail: { position: { latitude: lat, longitude: lng, accuracy: acc } }
                        });
                        cameraEl.dispatchEvent(evt);
                    };

                    const pushForDispatch = makeGpsStabilizer({ minAccuracy: 20, alpha: 0.4, minDelta: 0.3, emitIntervalMs: 150 });

                    if ('geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition(function (p) {
                            pushForDispatch({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }, function (u) {
                                dispatchGpsUpdate(u.lat, u.lng, u.acc);
                            });
                        });
                        navigator.geolocation.watchPosition(function (p) {
                            pushForDispatch({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }, function (u) {
                                dispatchGpsUpdate(u.lat, u.lng, u.acc);
                            });
                        }, function () { }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
                    }
                } catch (_) { }
            }
            // Fallback: geolocation directly (if permissions granted)
            if ('geolocation' in navigator) {
                try {
                    navigator.geolocation.getCurrentPosition(function(p){
                        pushStabilized({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }, update);
                    });
                    navigator.geolocation.watchPosition(function(p){
                        pushStabilized({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }, update);
                    }, function(){}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
                } catch (_) {}
            }
        }
    } catch (_) { /* noop */ }
};

var models = [];
var modelIndex = 0;
var currentModelEntity = null; // Store reference to the model entity for distance-based visibility
var isModelVisible = false; // Track current visibility state
var isFading = false; // Track if a fade animation is currently in progress
var isLoading = true; // Track if model is still loading
var isGpsCalibrating = false; // Track if GPS accuracy is low
var scanningAnimationInterval = null; // Store scanning animation interval globally
var setModel = function (model, entity) {
    if (model.scale) {
        entity.setAttribute('scale', model.scale);
    }

    if (model.rotation) {
        entity.setAttribute('rotation', model.rotation);
    }

    if (model.position) {
        entity.setAttribute('position', model.position);
    }

    // Attach model URL (actual load may be deferred by caller for stabilization)
    // Ensure the GLTF model is properly configured for raycaster detection
    entity.setAttribute('gltf-model', model.url);

    // derive a display name from the model info (before first comma)
    const name = (model.info && model.info.split(',')[0]) || 'Asset';
    entity.setAttribute('class', 'detectable');
    entity.setAttribute('data-asset-name', name);
    // Make sure the entity itself is raycastable
    entity.setAttribute('raycastable', '');
    
    // Add a collision box for raycaster detection - needed for models with large scales
    // Wait for model to load to ensure proper sizing
    entity.addEventListener('model-loaded', function() {
        // Parse the scale values
        const scaleValues = model.scale ? model.scale.split(' ').map(parseFloat) : [1, 1, 1];
        const maxScale = Math.max(...scaleValues);
        
        // For large-scaled models, we need a collision box that accounts for the scale
        // The box will be a child of the scaled entity, so it inherits the scale
        // We want an effective size that scales with the model size
        // For scale 10, we want effective size of ~15 units (1.5 * scale)
        // For scale 1, we want effective size of ~3 units
        // So: effectiveSize = max(3, maxScale * 1.5)
        const effectiveSize = Math.max(3, maxScale * 1.5);
        const boxSize = effectiveSize / maxScale;
        
        // Create invisible collision box
        const collisionBox = document.createElement('a-box');
        collisionBox.setAttribute('geometry', { 
            width: boxSize, 
            height: boxSize, 
            depth: boxSize 
        });
        collisionBox.setAttribute('material', { 
            visible: false, 
            transparent: true, 
            opacity: 0 
        });
        collisionBox.setAttribute('class', 'detectable');
        collisionBox.setAttribute('data-asset-name', name);
        collisionBox.setAttribute('position', '0 0 0');
        collisionBox.setAttribute('raycastable', '');
        
        entity.appendChild(collisionBox);
        
        console.log(`Collision box for ${name}: scale=${maxScale}, boxSize=${boxSize}, effectiveSize=${effectiveSize}`);
    }, { once: true });

    const div = document.querySelector('.instructions');
    div.innerText = 'Loading...';
    div.classList.remove('instructions--found');
    div.classList.add('instructions--not-found');
};

function haversineDistanceMeters(a, b) {
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

function waitForStableGPS(cameraEl, options, onStable) {
    const cfg = Object.assign({ sampleCount: 3, maxDriftMeters: 2.0, maxAccuracyMeters: 30, timeoutMs: 3000 }, options || {});
    const samples = [];
    let timeoutId = null;

    function handleUpdate(e) {
        const detail = e && e.detail ? e.detail : null;
        if (!detail || !detail.position) return;
        const pos = detail.position; // { latitude, longitude, accuracy? }
        const accuracy = detail.accuracy != null ? detail.accuracy : (pos.accuracy != null ? pos.accuracy : Infinity);
        samples.push({ lat: pos.latitude, lng: pos.longitude, accuracy: accuracy, t: Date.now() });
        if (samples.length > cfg.sampleCount) samples.shift();

        if (samples.length === cfg.sampleCount) {
            const avgAccuracy = samples.reduce((s, p) => s + (isFinite(p.accuracy) ? p.accuracy : cfg.maxAccuracyMeters + 1), 0) / cfg.sampleCount;
            let maxDrift = 0;
            for (let i = 1; i < samples.length; i++) {
                maxDrift = Math.max(maxDrift, haversineDistanceMeters(samples[i - 1], samples[i]));
            }
            if (maxDrift <= cfg.maxDriftMeters && avgAccuracy <= cfg.maxAccuracyMeters) {
                cleanup();
                onStable();
            }
        }
    }

    function cleanup() {
        cameraEl.removeEventListener('gps-camera-update-position', handleUpdate);
        if (timeoutId) clearTimeout(timeoutId);
    }

    cameraEl.addEventListener('gps-camera-update-position', handleUpdate);
    timeoutId = setTimeout(() => {
        // Fallback: proceed even if not fully stable after timeout
        cleanup();
        onStable();
    }, cfg.timeoutMs);
}

function setOpacityRecursive(obj3d, opacity) {
    if (!obj3d) return;
    obj3d.traverse(function (node) {
        if (node.isMesh) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(function (m) {
                if (!m) return;
                m.transparent = true;
                m.opacity = Math.max(0, Math.min(1, opacity));
            });
        }
    });
}

function fadeInGltf(entity, durationMs) {
    if (isFading) return; // Prevent overlapping animations
    isFading = true;
    const duration = durationMs || 600;
    const start = performance.now();
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        const obj = entity.object3D;
        if (obj) setOpacityRecursive(obj, eased);
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            // ensure fully opaque at end
            if (obj) setOpacityRecursive(obj, 1);
            isFading = false;
        }
    }
    // initialize to 0
    if (entity.object3D) setOpacityRecursive(entity.object3D, 0);
    requestAnimationFrame(tick);
}

function fadeOutGltf(entity, durationMs) {
    if (isFading) return; // Prevent overlapping animations
    isFading = true;
    const duration = durationMs || 600;
    const start = performance.now();
    const obj = entity.object3D;
    if (!obj) {
        isFading = false;
        return;
    }
    
    // Get current opacity from the first material we find
    let startOpacity = 1;
    obj.traverse(function (node) {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            if (materials.length > 0 && materials[0] && materials[0].opacity !== undefined) {
                startOpacity = materials[0].opacity;
                return;
            }
        }
    });
    
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        const opacity = startOpacity * (1 - eased); // Fade from current opacity to 0
        if (obj) setOpacityRecursive(obj, opacity);
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            // ensure fully transparent at end
            if (obj) setOpacityRecursive(obj, 0);
            isFading = false;
        }
    }
    requestAnimationFrame(tick);
}

function renderPlaces(places) {
    let scene = document.querySelector('a-scene');
    const actionButton = document.querySelector('button[data-action="camera-btn"]');
    const loaderOverlay = document.getElementById('sceneLoader');
    
    function showLoader() {
        const loader = document.getElementById('sceneLoader');
        if (loader) {
            loader.classList.add('is-visible');
        }
        // Update text immediately when loader is shown
        const infoDiv = document.querySelector('.instructions');
        if (infoDiv && !infoDiv.classList.contains('instructions--found')) {
            infoDiv.innerText = 'Loading...';
        }
    }
    function hideLoader() {
        const loader = document.getElementById('sceneLoader');
        if (loader) {
            loader.classList.remove('is-visible');
        }
        // Update text immediately when loader is hidden (only if not in special states)
        const infoDiv = document.querySelector('.instructions');
        if (infoDiv && !infoDiv.classList.contains('instructions--found')) {
            // Check if we should show a different message based on current state
            // The GPS update function will handle setting the correct message
            // But we can set a default here
            if (!isGpsCalibrating) {
                // Start scanning animation when loader is hidden
                if (window.startScanningAnimation) {
                    window.startScanningAnimation();
                }
            } else {
                // Stop animation if GPS is calibrating
                if (window.stopScanningAnimation) {
                    window.stopScanningAnimation();
                }
            }
        }
    }

    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;

        let model = document.createElement('a-entity');
        model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);

        // Defer GLTF load until GPS appears stable; append entity immediately (hidden by lack of model)
        model.setAttribute('animation-mixer', '');

        // New behavior: if active (enabled), tapping collects badge
        if (actionButton) {
            actionButton.addEventListener('click', function () {
                if (actionButton.disabled) return;
                if (currentAnimalConfig && currentAnimalConfig.name) {
                    showBadgeCollection(currentAnimalConfig.name);
                }
            });
        }

        scene.appendChild(model);

        // Store model reference globally for distance-based visibility control
        currentModelEntity = model;
        
        const cameraGps = document.getElementById('mainCamera');
        // Function to check initial distance and set visibility accordingly
        const checkInitialVisibility = function() {
            if (!model.object3D) return;
            
            // Try to get current GPS position to check initial distance
            const checkDistance = function() {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(function(p) {
                        if (!p || !p.coords) {
                            // No GPS available, hide model
                            setOpacityRecursive(model.object3D, 0);
                            isModelVisible = false;
                            return;
                        }
                        
                        const userPos = { lat: p.coords.latitude, lng: p.coords.longitude };
                        const animalPos = { lat: place.location.lat, lng: place.location.lng };
                        const distance = haversineDistanceMeters(userPos, animalPos);
                        const VISIBILITY_THRESHOLD_METERS = 20;
                        const GPS_ACCURACY_THRESHOLD = 30; // Same threshold as in update function
                        const accuracy = p.coords.accuracy != null ? p.coords.accuracy : Infinity;
                        const gpsAccuracyLow = accuracy > GPS_ACCURACY_THRESHOLD;
                        
                        if (distance <= VISIBILITY_THRESHOLD_METERS && !gpsAccuracyLow) {
                            // User is within range and GPS is accurate enough, show model immediately
                            setOpacityRecursive(model.object3D, 1);
                            isModelVisible = true;
                        } else {
                            // User is too far or GPS accuracy is low, hide model
                            setOpacityRecursive(model.object3D, 0);
                            isModelVisible = false;
                        }
                    }, function() {
                        // GPS error, hide model
                        if (model.object3D) {
                            setOpacityRecursive(model.object3D, 0);
                            isModelVisible = false;
                        }
                    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 2000 });
                } else {
                    // No geolocation support, hide model
                    if (model.object3D) {
                        setOpacityRecursive(model.object3D, 0);
                        isModelVisible = false;
                    }
                }
            };
            
            // Small delay to ensure model is fully loaded
            setTimeout(checkDistance, 50);
        };
        
        if (cameraGps) {
            // Wait for stable GPS before loading the model
            showLoader(); // This will show the loader and set text to "Loading..."
            waitForStableGPS(cameraGps, { sampleCount: 3, maxDriftMeters: 2.0, maxAccuracyMeters: 30, timeoutMs: 3000 }, function () {
                setModel(models[modelIndex], model);
                model.addEventListener('model-loaded', function () {
                    checkInitialVisibility();
                    isLoading = false; // Mark loading as complete
                    setTimeout(function() {
                        hideLoader(); // This will hide the loader and set text appropriately
                    }, 100);
                }, { once: true });
            });
        } else {
            // Fallback if no gps camera found
            showLoader(); // This will show the loader and set text to "Loading..."
            setModel(models[modelIndex], model);
            model.addEventListener('model-loaded', function () {
                checkInitialVisibility();
                isLoading = false; // Mark loading as complete
                setTimeout(function() {
                    hideLoader(); // This will hide the loader and set text appropriately
                }, 100);
            }, { once: true });
        }
    });

    // Set up raycaster hit detection from the center of the screen
    const cameraEl = document.getElementById('mainCamera');
    const infoDiv = document.querySelector('.instructions');

    if (cameraEl) {
        cameraEl.addEventListener('raycaster-intersection', (e) => {
            if (!e.detail || !e.detail.els || e.detail.els.length === 0) return;
            // Take the closest intersected element and bubble up to the parent that holds data-asset-name
            let el = e.detail.els[0];
            let cursor = el;
            while (cursor && !cursor.getAttribute('data-asset-name')) {
                cursor = cursor.parentEl;
            }
            if (cursor) {
                const name = cursor.getAttribute('data-asset-name') || 'Asset';
                if (window.stopScanningAnimation) window.stopScanningAnimation(); // Stop animation when animal is found
                const foundText = 'You have found the ' + name + '<br>Take a photo to collect a badge';
                // Always update to ensure text is current
                infoDiv.innerHTML = foundText;
                infoDiv.classList.remove('instructions--not-found');
                infoDiv.classList.add('instructions--found');
                if (actionButton) actionButton.disabled = false;
                
                // Expand cutout animation
                const cutout = document.getElementById('arCutout');
                const background = document.querySelector('.ar-overlay__background');
                if (cutout) cutout.classList.add('ar-cutout--found');
                if (background) background.classList.add('ar-background--found');
            }
        });

        cameraEl.addEventListener('raycaster-intersection-cleared', () => {
            const current = document.querySelector('[gps-entity-place]');
            if (current) {
                // Check if loader is visible
                const loaderOverlay = document.getElementById('sceneLoader');
                const loaderVisible = loaderOverlay && loaderOverlay.classList.contains('is-visible');
                
                // Only update text if not in a special state (loading, calibrating, etc.)
                if (!loaderVisible && !isGpsCalibrating) {
                    // Start scanning animation when returning to scanning state
                    if (!scanningAnimationInterval && window.startScanningAnimation) {
                        window.startScanningAnimation();
                    }
                } else if (loaderVisible) {
                    if (window.stopScanningAnimation) window.stopScanningAnimation(); // Stop animation when loading
                    // Always update to ensure text is current
                    infoDiv.innerText = 'Loading...';
                }
                infoDiv.classList.remove('instructions--found');
                infoDiv.classList.add('instructions--not-found');
                if (actionButton) actionButton.disabled = true;
                
                // Contract cutout animation
                const cutout = document.getElementById('arCutout');
                const background = document.querySelector('.ar-overlay__background');
                if (cutout) cutout.classList.remove('ar-cutout--found');
                if (background) background.classList.remove('ar-background--found');
            }
        });
    }

}

// Badge Collection Functions
function showBadgeCollection(animalName) {
    const badgeData = getBadgeDataForAnimal(animalName);
    
    // Add badge to collection
    addBadge(badgeData.badgeId);
    
    // Update userData
    try {
        let userData = JSON.parse(localStorage.getItem('userData') || 'null');
        if (!userData) {
            userData = {
                userId: Date.now().toString(36) + Math.random().toString(36).substr(2),
                created: new Date().toISOString(),
                progress: {
                    gamesCompleted: [],
                    badges: [],
                    badgeDates: {},
                    highScores: {}
                }
            };
        }
        if (!userData.progress) {
            userData.progress = { badges: [], badgeDates: {} };
        }
        if (!userData.progress.badges) {
            userData.progress.badges = [];
        }
        if (!userData.progress.badgeDates) {
            userData.progress.badgeDates = {};
        }
        
        if (!userData.progress.badges.includes(badgeData.badgeId)) {
            userData.progress.badges.push(badgeData.badgeId);
            userData.progress.badgeDates[badgeData.badgeId] = new Date().toISOString();
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Sync to Customer.io
            if (typeof updateBadgeInCustomerIO === 'function') {
                updateBadgeInCustomerIO(badgeData.badgeId);
            }
        }
    } catch (e) {
        console.warn('Error saving badge to userData:', e);
    }
    
    // Play tada sound
    const tadaAudio = document.getElementById('tada-audio');
    if (tadaAudio) {
        tadaAudio.play().catch(e => console.log('TaDA audio play failed:', e));
    }
    
    // Show badge splash
    const badgeSplash = document.getElementById('badgeSplash');
    const badgeSplashIcon = document.getElementById('badgeSplashIcon');
    if (badgeSplash && badgeSplashIcon) {
        badgeSplashIcon.src = badgeData.iconPath;
        badgeSplash.classList.remove('hidden');
    }
    
    // Auto-dismiss splash after 4 seconds and show detail screen
    setTimeout(() => {
        if (badgeSplash) {
            badgeSplash.classList.add('hidden');
        }
        const badgeCollection = document.getElementById('badgeCollection');
        const badgeDetailIcon = document.getElementById('badgeDetailIcon');
        const badgeDetailName = document.getElementById('badgeDetailName');
        const badgeDetailDescription = document.getElementById('badgeDetailDescription');
        const playGameButton = document.getElementById('playGameButton');
        
        if (badgeCollection && badgeDetailIcon && badgeDetailName && badgeDetailDescription) {
            badgeDetailIcon.src = badgeData.iconPath;
            badgeDetailName.textContent = badgeData.badgeName;
            badgeDetailDescription.textContent = badgeData.description;
            
            // Show/hide Play Game button based on whether game exists
            if (badgeData.gamePath && playGameButton) {
                playGameButton.style.display = 'flex';
                playGameButton.setAttribute('data-game-path', badgeData.gamePath);
            } else if (playGameButton) {
                playGameButton.style.display = 'none';
            }
            
            badgeCollection.classList.remove('hidden');
        }
    }, 4000);
}

function playGame() {
    const playGameButton = document.getElementById('playGameButton');
    if (playGameButton) {
        const gamePath = playGameButton.getAttribute('data-game-path');
        if (gamePath) {
            window.location.href = gamePath;
        }
    }
}

function goHome() {
    window.location.href = './wayfinding.html';
}

function addBadge(badgeId) {
    try {
        let collectedBadges = JSON.parse(localStorage.getItem('collectedBadges') || '[]');
        if (!collectedBadges.includes(badgeId)) {
            collectedBadges.push(badgeId);
            localStorage.setItem('collectedBadges', JSON.stringify(collectedBadges));
        }
    } catch (e) {
        console.warn('Error adding badge to localStorage:', e);
    }
}
