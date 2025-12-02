// Minimal proximity watcher that pings when user is near any configured animal
// Data source: ../../data/animals.json
(function () {
    const statusEl = document.getElementById('status');
    const enableBtn = document.getElementById('enableBtn');
    const modal = document.getElementById('nearbyModal');
    const modalText = document.getElementById('nearbyText');
    const startArBtn = document.getElementById('startArBtn');
    const closeBtn = modal ? modal.querySelector('.modal__close') : null;

    let watchId = null;
    let animals = [];
    let audio = null;

    // Live GPS stabilizer (EMA + accuracy gating)
    function makeGpsStabilizer(opts) {
        const cfg = Object.assign({
            minAccuracy: 30,      // accept slightly worse fixes for responsiveness
            alpha: 0.45,          // more responsive smoothing
            minDelta: 0.2,        // react to small movements
            emitIntervalMs: 120   // near-realtime updates
        }, opts || {});
        let state = null;
        let lastEmit = 0;

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
                return;
            }
            state = {
                lat: state.lat + cfg.alpha * (sample.lat - state.lat),
                lng: state.lng + cfg.alpha * (sample.lng - state.lng),
                acc: (state.acc + sample.acc) / 2
            };

            const now = Date.now();
            const moved = dist(state, sample);
            if (moved < cfg.minDelta) return;
            if (now - lastEmit < cfg.emitIntervalMs) return;
            lastEmit = now;
            onEmit && onEmit(state);
        };
    }

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function lastKey(id) { return `nearby-last-${id}`; }
    function shouldTrigger(id, cooldownMin) {
        const last = parseInt(localStorage.getItem(lastKey(id)) || '0', 10);
        return (Date.now() - last) > (cooldownMin * 60 * 1000);
    }
    function markTriggered(id) { localStorage.setItem(lastKey(id), String(Date.now())); }

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

    async function loadAnimals() {
        // Switch between testing and production data by commenting/uncommenting the appropriate line:
        const res = await fetch('../../data/animals.json', { cache: 'no-cache' }); // Production/Onsite
        // const res = await fetch('../../data/testing.json', { cache: 'no-cache' }); // Testing/Home
        const cfg = await res.json();
        animals = Array.isArray(cfg.animals) ? cfg.animals : [];
    }

    function ensureAudio() {
        if (!audio) {
            audio = new Audio('../../assets/wayfinding/audio/bell.mp3');
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
        if ('vibrate' in navigator) {
            try { navigator.vibrate([100, 200, 100]); } catch (_) {}
        }
    }

    function showModalFor(animal) {
        if (!modal) return;
        modalText.textContent = `An animal is nearby: ${animal.name}`;
        modal.hidden = false;
        // Close handlers
        if (closeBtn) closeBtn.onclick = function () { modal.hidden = true; };
        modal.onclick = function (e) { if (e.target === modal) modal.hidden = true; };
    }

    function ping(animal) {
        // Check if audio is enabled before playing
        const audioEnabled = (typeof window.isAudioEnabled === 'function') ? window.isAudioEnabled() : true;
        
        // sound (only if audio is enabled)
        if (audioEnabled) {
            try { ensureAudio().play().catch(function () {}); } catch (_) {}
        }
        // vibrate
        vibrate();
        // modal
        showModalFor(animal);
        // cooldown mark
        const cd = (animal.ping && animal.ping.cooldownMinutes) ? animal.ping.cooldownMinutes : 15;
        markTriggered(animal.id);
        setTimeout(function () { /* noop, separation for readability */ }, cd * 1000);
    }

    const pushStabilized = makeGpsStabilizer({ minAccuracy: 30, alpha: 0.45, minDelta: 0.2, emitIntervalMs: 120 });

    function onPosition(pos) {
        // Immediate raw UI for responsiveness
        try {
            setStatus(`Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)} (raw ±${Math.round(pos.coords.accuracy||0)}m)`);
        } catch(_) {}
        pushStabilized(pos.coords, function (u) {
            setStatus(`Lat: ${u.lat.toFixed(6)}, Lng: ${u.lng.toFixed(6)} (±${Math.round(u.acc)}m)`);
            let nearest = null;
            let nearestD = Infinity;
            let bestCandidate = null;
            let bestCandidateD = Infinity;
            animals.forEach(function (a) {
                const d = haversineMeters(u, a.location);
                if (d < nearestD) { nearestD = d; nearest = a; }
                const r = a.radiusMeters || 100;
                if (d <= r && d < bestCandidateD) { bestCandidate = a; bestCandidateD = d; }
                const cd = (a.ping && a.ping.cooldownMinutes) ? a.ping.cooldownMinutes : 15;
                if (d <= r && shouldTrigger(a.id, cd)) { ping(a); }
            });
            updateStartArStatus(nearest, nearestD, u.acc);
            if (bestCandidate) { enableStartAr(bestCandidate); } else { disableStartAr(); }
        });
    }

    function enableStartAr(animal) {
        if (!startArBtn) return;
        startArBtn.disabled = false;
        startArBtn.onclick = function () {
            window.location.href = `./animalsAR.html?animalId=${encodeURIComponent(animal.id)}`;
        };
    }

    function updateStartArStatus(nearest, nearestD, acc) {
        var hint = document.getElementById('arHint');
        if (!hint) return;
        if (!nearest) { hint.textContent = 'Get near a location to enable'; return; }
        var accuracy = isFinite(acc) ? Math.max(0, Math.round(acc)) : 0;
        var effective = Math.max(0, Math.round(nearestD - (isFinite(acc) ? acc : 0)));
        hint.textContent = `${nearest.name}: ${Math.round(nearestD)}m away (acc ±${accuracy}m, eff ${effective}m)`;
    }

    function disableStartAr() {
        if (!startArBtn) return;
        startArBtn.disabled = true;
        startArBtn.onclick = null;
    }

    function onError(err) {
        setStatus('Location error: ' + (err && err.message ? err.message : 'Unknown'));
    }

    async function start() {
        try {
            await loadAnimals();
        } catch (_) {
            setStatus('Failed to load animals.json');
        }

        if (!('geolocation' in navigator)) {
            setStatus('Geolocation not supported');
            return;
        }

        // Prime audio on user gesture
        try { ensureAudio().play().then(function(){ audio.pause(); audio.currentTime = 0; }).catch(function(){}); } catch (_) {}

        const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        watchId = navigator.geolocation.watchPosition(onPosition, onError, opts);
        setStatus('Location tracking active');
        if (enableBtn) enableBtn.disabled = true;
    }

    function stop() {
        if (watchId != null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        setStatus('Location tracking disabled');
        if (enableBtn) enableBtn.disabled = false;
    }

    if (enableBtn) {
        enableBtn.addEventListener('click', function () {
            if (watchId == null) start(); else stop();
        });
    }

    // Auto-start if permission was previously granted from the Start page
    try {
        if (localStorage.getItem('geopin-location-permission') === 'granted') {
            // Defer to ensure DOM ready
            setTimeout(function(){ start(); }, 0);
        }
    } catch (_) {}
})();


