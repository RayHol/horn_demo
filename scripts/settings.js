// Shared Settings Module
// Provides centralized settings management across all pages

(function() {
    'use strict';

    // Settings configuration
    let settingsConfig = {
        onHowToPlay: null,
        nicknameElementId: 'userNickname'
    };

    /**
     * Initialize settings on a page
     * @param {Object} config - Configuration object
     * @param {Function} config.onHowToPlay - Callback function for "How to play" button
     * @param {string} [config.nicknameElementId='userNickname'] - ID of element to display nickname
     */
    function initSettings(config) {
        if (config) {
            settingsConfig = Object.assign({}, settingsConfig, config);
        }

        // Setup close button
        const closeButton = document.querySelector('#settingsOverlay .close-button');
        if (closeButton) {
            closeButton.addEventListener('click', hideSettings);
        }

        // Setup how to play button
        const howToPlayButton = document.querySelector('#settingsOverlay .how-to-play-button');
        if (howToPlayButton) {
            howToPlayButton.addEventListener('click', function() {
                hideSettings();
                if (settingsConfig.onHowToPlay && typeof settingsConfig.onHowToPlay === 'function') {
                    settingsConfig.onHowToPlay();
                }
            });
        }

        // Setup toggle buttons
        const hapticsToggle = document.getElementById('hapticsToggle');
        if (hapticsToggle) {
            hapticsToggle.addEventListener('click', toggleHapticsSetting);
        }

        const audioToggle = document.getElementById('audioToggle');
        if (audioToggle) {
            audioToggle.addEventListener('click', toggleAudioSetting);
        }

        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('click', toggleMusicSetting);
        }
    }

    /**
     * Show settings overlay
     */
    function showSettings() {
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            // Remove any existing animation classes
            overlay.classList.remove('hiding');
            // Show overlay and add showing class to trigger animation
            overlay.style.display = 'flex';
            // Force reflow to ensure display change is applied
            overlay.offsetHeight;
            overlay.classList.add('showing');
            updateNickname();
            updateSettingsToggles();
        }
    }

    /**
     * Hide settings overlay
     */
    function hideSettings() {
        // Trigger haptic feedback
        if (typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            // Remove showing class and add hiding class to trigger exit animation
            overlay.classList.remove('showing');
            overlay.classList.add('hiding');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('hiding');
            }, 300); // Match animation duration
        }
    }

    /**
     * Update nickname display in settings
     */
    function updateNickname() {
        const userData = JSON.parse(localStorage.getItem('userData') || 'null');
        const nicknameElement = document.getElementById(settingsConfig.nicknameElementId);
        
        if (nicknameElement) {
            if (userData && userData.nickname) {
                nicknameElement.textContent = userData.nickname;
            } else {
                nicknameElement.textContent = 'Guest';
            }
        }
    }

    /**
     * Update settings toggle states based on localStorage
     */
    function updateSettingsToggles() {
        // Wait a moment for haptic system to initialize
        setTimeout(() => {
            // Update haptics toggle
            const hapticsToggle = document.getElementById('hapticsToggle');
            if (hapticsToggle) {
                let enabled = true; // default
                // First try to get from haptic system directly
                if (window.hapticSystem && window.hapticSystem.hapticsEnabled !== undefined) {
                    enabled = window.hapticSystem.hapticsEnabled;
                } else if (typeof isHapticsEnabled === 'function') {
                    enabled = isHapticsEnabled();
                } else {
                    // Fallback: check localStorage directly
                    try {
                        const stored = localStorage.getItem('haptic_hapticsEnabled');
                        enabled = stored === null ? true : stored === 'true';
                    } catch (e) {
                        enabled = true;
                    }
                }
                // Remove disabled class first, then add it if needed
                hapticsToggle.classList.remove('disabled');
                if (!enabled) {
                    hapticsToggle.classList.add('disabled');
                }
            }

            // Update audio toggle
            const audioToggle = document.getElementById('audioToggle');
            if (audioToggle) {
                let enabled = true; // default
                // Priority 1: Check localStorage directly (most reliable source of truth)
                try {
                    const stored = localStorage.getItem('haptic_audioEnabled');
                    if (stored !== null) {
                        enabled = stored === 'true';
                    } else {
                        // If not in localStorage, check haptic system
                        if (window.hapticSystem && window.hapticSystem.audioEnabled !== undefined) {
                            enabled = window.hapticSystem.audioEnabled;
                        } else if (typeof isAudioEnabled === 'function') {
                            enabled = isAudioEnabled();
                        }
                    }
                } catch (e) {
                    // Fallback: check haptic system
                    if (window.hapticSystem && window.hapticSystem.audioEnabled !== undefined) {
                        enabled = window.hapticSystem.audioEnabled;
                    } else if (typeof isAudioEnabled === 'function') {
                        enabled = isAudioEnabled();
                    }
                }
                // Remove disabled class first, then add it if needed
                audioToggle.classList.remove('disabled');
                if (!enabled) {
                    audioToggle.classList.add('disabled');
                }
            }

            // Update music toggle
            const musicToggle = document.getElementById('musicToggle');
            if (musicToggle) {
                let enabled = true; // default
                try {
                    const stored = localStorage.getItem('haptic_musicEnabled');
                    if (stored !== null) {
                        enabled = stored === 'true';
                    } else {
                        if (window.hapticSystem && window.hapticSystem.musicEnabled !== undefined) {
                            enabled = window.hapticSystem.musicEnabled;
                        } else if (typeof isMusicEnabled === 'function') {
                            enabled = isMusicEnabled();
                        }
                    }
                } catch (e) {
                    if (window.hapticSystem && window.hapticSystem.musicEnabled !== undefined) {
                        enabled = window.hapticSystem.musicEnabled;
                    } else if (typeof isMusicEnabled === 'function') {
                        enabled = isMusicEnabled();
                    }
                }
                musicToggle.classList.remove('disabled');
                if (!enabled) {
                    musicToggle.classList.add('disabled');
                }
            }
        }, 150); // Slightly longer delay to ensure haptic system is ready
    }

    /**
     * Toggle haptics setting
     */
    function toggleHapticsSetting() {
        if (typeof toggleHaptics === 'function') {
            const enabled = toggleHaptics();
            const hapticsToggle = document.getElementById('hapticsToggle');
            if (hapticsToggle) {
                hapticsToggle.classList.toggle('disabled', !enabled);
            }
            // Trigger haptic feedback to show it's working (if enabled)
            if (enabled && typeof triggerHaptic === 'function') {
                triggerHaptic('single');
            }
        } else {
            // Fallback: toggle localStorage directly
            try {
                const stored = localStorage.getItem('haptic_hapticsEnabled');
                const current = stored === null ? true : stored === 'true';
                const newValue = !current;
                localStorage.setItem('haptic_hapticsEnabled', newValue.toString());
                const hapticsToggle = document.getElementById('hapticsToggle');
                if (hapticsToggle) {
                    hapticsToggle.classList.toggle('disabled', !newValue);
                }
                // Try to update haptic system if available
                if (window.hapticSystem) {
                    window.hapticSystem.hapticsEnabled = newValue;
                }
            } catch (e) {
                console.warn('Failed to toggle haptics:', e);
            }
        }
    }

    /**
     * Toggle audio setting
     */
    function toggleAudioSetting() {
        // Always read current state from localStorage first (source of truth)
        let currentValue = true;
        try {
            const stored = localStorage.getItem('haptic_audioEnabled');
            currentValue = stored === null ? true : stored === 'true';
        } catch (e) {
            // Fallback to haptic system
            if (window.hapticSystem && window.hapticSystem.audioEnabled !== undefined) {
                currentValue = window.hapticSystem.audioEnabled;
            } else if (typeof isAudioEnabled === 'function') {
                currentValue = isAudioEnabled();
            }
        }
        
        const newValue = !currentValue;
        
        // Update localStorage first (source of truth)
        try {
            localStorage.setItem('haptic_audioEnabled', newValue.toString());
        } catch (e) {
            console.warn('Failed to save audio preference:', e);
        }
        
        // Update haptic system if available
        if (window.hapticSystem) {
            window.hapticSystem.audioEnabled = newValue;
            if (typeof window.hapticSystem.savePreference === 'function') {
                window.hapticSystem.savePreference('audioEnabled', newValue);
            }
        }
        
        // Update global audio manager
        if (window.globalAudioManager) {
            window.globalAudioManager.audioEnabled = newValue;
            window.globalAudioManager.muted = !newValue;
            window.globalAudioManager.audioElements.forEach(audio => {
                window.globalAudioManager.updateAudioElement(audio);
            });
        }
        
        // Update UI
        const audioToggle = document.getElementById('audioToggle');
        if (audioToggle) {
            audioToggle.classList.remove('disabled');
            if (!newValue) {
                audioToggle.classList.add('disabled');
            }
        }
        
        // Play a test sound if audio was enabled
        if (newValue && typeof triggerHaptic === 'function') {
            triggerHaptic('single');
        }
    }

    /**
     * Toggle music setting
     */
    function toggleMusicSetting() {
        // Always read current state from localStorage first (source of truth)
        let currentValue = true;
        try {
            const stored = localStorage.getItem('haptic_musicEnabled');
            currentValue = stored === null ? true : stored === 'true';
        } catch (e) {
            // Fallback to haptic system
            if (window.hapticSystem && window.hapticSystem.musicEnabled !== undefined) {
                currentValue = window.hapticSystem.musicEnabled;
            } else if (typeof isMusicEnabled === 'function') {
                currentValue = isMusicEnabled();
            }
        }
        
        const newValue = !currentValue;
        
        // Update localStorage first (source of truth)
        try {
            localStorage.setItem('haptic_musicEnabled', newValue.toString());
        } catch (e) {
            console.warn('Failed to save music preference:', e);
        }
        
        // Update haptic system if available
        if (window.hapticSystem) {
            window.hapticSystem.musicEnabled = newValue;
            if (typeof window.hapticSystem.savePreference === 'function') {
                window.hapticSystem.savePreference('musicEnabled', newValue);
            }
        }
        
        // Update global music manager
        if (window.globalMusicManager) {
            window.globalMusicManager.musicEnabled = newValue;
            window.globalMusicManager.muted = !newValue;
            window.globalMusicManager.musicElements.forEach(music => {
                window.globalMusicManager.updateMusicElement(music);
            });
        }
        
        // Update UI
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.classList.remove('disabled');
            if (!newValue) {
                musicToggle.classList.add('disabled');
            }
        }
    }

    // Export functions to global scope
    window.initSettings = initSettings;
    window.showSettings = showSettings;
    window.hideSettings = hideSettings;
    window.updateSettingsToggles = updateSettingsToggles;
    window.toggleHapticsSetting = toggleHapticsSetting;
    window.toggleAudioSetting = toggleAudioSetting;
    window.toggleMusicSetting = toggleMusicSetting;

})();

