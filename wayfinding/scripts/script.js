
function getQueryParam(name) {
    const p = new URLSearchParams(location.search).get(name);
    return p && decodeURIComponent(p);
}

async function loadAnimalConfig() {
    try {
        const res = await fetch('./data/animals.json', { cache: 'no-cache' });
        const cfg = await res.json();
        const id = getQueryParam('animalId');
        const list = Array.isArray(cfg.animals) ? cfg.animals : [];
        return list.find(a => a.id === id) || list[0] || null;
    } catch (e) {
        return null;
    }
}

window.onload = async () => {
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
                const cfg = Object.assign({ minAccuracy: 20, alpha: 0.25, minDelta: 1.0, emitIntervalMs: 800 }, opts || {});
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
            const pushStabilized = makeGpsStabilizer({ minAccuracy: 20, alpha: 0.25, minDelta: 1.0, emitIntervalMs: 800 });
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
                proximityEl.innerHTML = `${animal.name || 'Animal'}: ${Math.round(d)}m away<br>(acc ±${accuracy}m, eff ${effective}m) ${within ? '[WITHIN]' : '[OUTSIDE]'}`;
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

                    const pushForDispatch = makeGpsStabilizer({ minAccuracy: 20, alpha: 0.25, minDelta: 1.0, emitIntervalMs: 3000 });

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
                        }, function () { }, { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 });
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
                    }, function(){}, { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 });
                } catch (_) {}
            }
        }
    } catch (_) { /* noop */ }
};

var models = [];
var modelIndex = 0;
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
    entity.setAttribute('gltf-model', model.url);

    // derive a display name from the model info (before first comma)
    const name = (model.info && model.info.split(',')[0]) || 'Asset';
    entity.setAttribute('class', 'detectable');
    entity.setAttribute('data-asset-name', name);

    const div = document.querySelector('.instructions');
    div.innerText = 'Scanning the area...';
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
    const cfg = Object.assign({ sampleCount: 5, maxDriftMeters: 1.5, maxAccuracyMeters: 25, timeoutMs: 10000 }, options || {});
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

function fadeInGltf(entity, durationMs) {
    const duration = durationMs || 600;
    const start = performance.now();
    function setOpacityRecursive(obj3d, opacity) {
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
        }
    }
    // initialize to 0
    if (entity.object3D) setOpacityRecursive(entity.object3D, 0);
    requestAnimationFrame(tick);
}

function renderPlaces(places) {
    let scene = document.querySelector('a-scene');
    const actionButton = document.querySelector('button[data-action="camera-btn"]');
    const modal = document.getElementById('miniGameModal');
    const closeBtn = modal ? modal.querySelector('.modal__close') : null;
    const loaderOverlay = document.getElementById('sceneLoader');

    function showLoader() {
        if (loaderOverlay) loaderOverlay.classList.add('is-visible');
    }
    function hideLoader() {
        if (loaderOverlay) loaderOverlay.classList.remove('is-visible');
    }

    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;

        let model = document.createElement('a-entity');
        model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);

        // Defer GLTF load until GPS appears stable; append entity immediately (hidden by lack of model)
        model.setAttribute('animation-mixer', '');

        // New behavior: if active (enabled), tapping launches modal
        if (actionButton) {
            actionButton.addEventListener('click', function () {
                if (actionButton.disabled) return;
                if (modal) modal.hidden = false;
            });
        }

        scene.appendChild(model);

        const cameraGps = document.getElementById('mainCamera');
        if (cameraGps) {
            // Wait for stable GPS before loading the model, then fade it in
            showLoader();
            waitForStableGPS(cameraGps, { sampleCount: 7, maxDriftMeters: 1.0, maxAccuracyMeters: 20, timeoutMs: 10000 }, function () {
                setModel(models[modelIndex], model);
                model.addEventListener('model-loaded', function () {
                    fadeInGltf(model, 700);
                    setTimeout(hideLoader, 700);
                }, { once: true });
            });
        } else {
            // Fallback if no gps camera found
            showLoader();
            setModel(models[modelIndex], model);
            model.addEventListener('model-loaded', function () {
                fadeInGltf(model, 700);
                setTimeout(hideLoader, 700);
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
                infoDiv.innerText = 'You have found an ' + name;
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
                infoDiv.innerText = 'Scanning the area...';
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

    // Modal close handling
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function () {
            modal.hidden = true;
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.hidden = true; // click outside modal closes
        });
    }
}
