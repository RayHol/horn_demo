/**
 * Haptic Feedback Utility
 * Provides haptic feedback functionality for iOS and other devices
 * Supports multiple patterns: 'single', 'double', 'triple', 'long', 'pattern'
 * 
 * Usage:
 *   triggerHaptic('single');   // Single tap haptic
 *   triggerHaptic('double');   // Double tap haptic
 *   triggerHaptic('triple');   // Triple tap haptic
 *   triggerHaptic('long');     // Long vibration
 *   triggerHaptic('pattern');  // Custom pattern
 */

(function() {
    'use strict';

    class HapticFeedback {
        constructor() {
            this.supportInfo = this.detectSupport();
            
            // Gesture credits system for iOS programmatic haptics
            // Focus on maintaining gesture context through call chain rather than arbitrary timeouts
            this.gestureCredits = 0;
            this.lastUserInteraction = 0;
            this.userInteractionTimeout = 30000; // 30 seconds - more realistic window for iOS haptics
            this.switchPool = [];
            
            // Create hidden switches container if it doesn't exist
            this.ensureHiddenSwitchesContainer();
            
            // Pre-create switch pool for better performance
            this.createSwitchPool();
            
            // Set up event listeners to track user interactions
            this.setupInteractionTracking();
            
            // Create debug UI
            this.createDebugUI();
            
            // Update debug UI periodically to show time changes
            setInterval(() => {
                this.updateDebugUI();
            }, 1000); // Update every second
        }

        detectSupport() {
            const userAgent = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(userAgent);
            const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/.test(userAgent);
            const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
            
            // Detect iOS version
            const iosVersionMatch = userAgent.match(/OS (\d+)_(\d+)/);
            const iosVersion = iosVersionMatch ? 
                parseFloat(`${iosVersionMatch[1]}.${iosVersionMatch[2]}`) : null;

            // Check for switch support
            const testInput = document.createElement('input');
            testInput.type = 'checkbox';
            const hasSwitchSupport = 'switch' in testInput;

            // Check Vibration API
            const hasVibrationAPI = 'vibrate' in navigator;

            return {
                isIOS,
                isIOSWebView,
                isSafari,
                iosVersion,
                hasSwitchSupport,
                hasVibrationAPI,
                canUseHaptics: (isIOS && isSafari && hasSwitchSupport) || hasVibrationAPI
            };
        }

        ensureHiddenSwitchesContainer() {
            // Create container if it doesn't exist
            let container = document.getElementById('haptic-hidden-switches');
            if (!container) {
                container = document.createElement('div');
                container.id = 'haptic-hidden-switches';
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.opacity = '0';
                // Don't use pointer-events: none - we need labels to be clickable for iOS haptics
                // Instead, position off-screen but allow pointer events
                container.style.width = '1px';
                container.style.height = '1px';
                container.style.overflow = 'hidden';
                document.body.appendChild(container);
            }
            this.switchContainer = container;
        }

        createSwitchPool() {
            if (!this.switchContainer) {
                this.ensureHiddenSwitchesContainer();
            }
            
            const container = this.switchContainer;
            const poolSize = 20; // Create a pool of switches for reuse
            
            for (let i = 0; i < poolSize; i++) {
                const switchElement = document.createElement('input');
                switchElement.type = 'checkbox';
                switchElement.setAttribute('switch', '');
                switchElement.id = `haptic-pool-${i}`;
                
                const label = document.createElement('label');
                label.setAttribute('for', switchElement.id);
                // Don't use display: none - iOS needs the label to be accessible for haptics
                // Instead, position it off-screen but keep it in the flow
                label.style.position = 'absolute';
                label.style.left = '-9999px';
                label.style.width = '1px';
                label.style.height = '1px';
                label.style.overflow = 'hidden';
                
                container.appendChild(switchElement);
                container.appendChild(label);
                
                this.switchPool.push({
                    switch: switchElement,
                    label: label,
                    inUse: false
                });
            }
        }

        setupInteractionTracking() {
            // Track all user interactions to build gesture credits
            // This enables programmatic haptics on iOS by maintaining gesture context
            // iOS requires maintaining connection to user gestures through the call chain
            const events = ['touchstart', 'touchend', 'touchmove', 'click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'pointerdown', 'pointerup'];
            
            // Use capture phase to catch events early in the event chain
            events.forEach(eventType => {
                document.addEventListener(eventType, (e) => {
                    this.recordUserInteraction(eventType, e);
                }, { passive: true, capture: true });
            });
            
            // Also track on window level to catch all interactions
            window.addEventListener('touchstart', (e) => {
                this.recordUserInteraction('touchstart', e);
            }, { passive: true });
            
            window.addEventListener('click', (e) => {
                this.recordUserInteraction('click', e);
            }, { passive: true });
        }

        recordUserInteraction(eventType, event) {
            const now = Date.now();
            this.lastUserInteraction = now;
            
            // Increment credits for each interaction
            // Touch events are most important for mobile devices
            if (eventType === 'touchstart' || eventType === 'touchend') {
                this.gestureCredits += 2; // Bonus for touch events (primary on mobile)
            } else {
                this.gestureCredits += 1;
            }
            
            // Cap credits at a reasonable maximum to prevent unbounded growth
            // But allow enough credits for multiple haptic calls
            if (this.gestureCredits > 100) {
                this.gestureCredits = 100;
            }
            
            // Update debug UI
            this.updateDebugUI();
        }

        isUserInteractionRecent() {
            return (Date.now() - this.lastUserInteraction) < this.userInteractionTimeout;
        }

        async triggerIOSSwitchHaptic(pattern) {
            // Check if we have recent user interaction (iOS prefers recent gestures)
            // Maintaining gesture context through the call chain is key
            if (!this.isUserInteractionRecent()) {
                return false; // No recent interaction - iOS may block this
            }

            // Check gesture credits (must have credits to spend)
            if (this.gestureCredits <= 0) {
                return false; // No credits available - user needs to interact first
            }

            // Find available switch from pool
            const availableSwitch = this.switchPool.find(item => !item.inUse);
            if (!availableSwitch) {
                return false; // No switches available
            }

            try {
                availableSwitch.inUse = true;
                this.gestureCredits--; // Spend one credit
                this.updateDebugUI(); // Update debug display

                const switchCount = this.getPatternSwitchCount(pattern);
                const delay = this.getPatternDelay(pattern);

                // Debug: Log switch and label elements
                console.log('Triggering iOS haptic:', {
                    switch: availableSwitch.switch,
                    label: availableSwitch.label,
                    switchChecked: availableSwitch.switch.checked,
                    labelFor: availableSwitch.label.getAttribute('for'),
                    switchId: availableSwitch.switch.id
                });

                for (let i = 0; i < switchCount; i++) {
                    // First ensure the switch is not checked
                    if (availableSwitch.switch.checked) {
                        availableSwitch.switch.checked = false;
                    }
                    
                    // Try multiple methods to trigger the haptic
                    let hapticTriggered = false;
                    
                    // Method 1: Direct label click (most reliable)
                    try {
                        availableSwitch.label.click();
                        hapticTriggered = true;
                        console.log('Haptic trigger attempt:', i + 1, 'via label.click()');
                    } catch (e) {
                        console.warn('Label click failed:', e);
                    }
                    
                    // Method 2: MouseEvent dispatch
                    if (!hapticTriggered) {
                        try {
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                buttons: 1
                            });
                            availableSwitch.label.dispatchEvent(clickEvent);
                            hapticTriggered = true;
                            console.log('Haptic trigger attempt:', i + 1, 'via MouseEvent');
                        } catch (e) {
                            console.warn('MouseEvent dispatch failed:', e);
                        }
                    }
                    
                    // Method 3: Direct switch click as last resort
                    if (!hapticTriggered) {
                        try {
                            availableSwitch.switch.click();
                            console.log('Haptic trigger attempt:', i + 1, 'via switch.click()');
                        } catch (e) {
                            console.warn('Switch click failed:', e);
                        }
                    }
                    
                    // Reset switch state after brief moment
                    setTimeout(() => {
                        if (availableSwitch.switch.checked) {
                            availableSwitch.switch.checked = false;
                            // Click again to reset
                            try {
                                availableSwitch.label.click();
                            } catch (e) {
                                // Ignore reset errors
                            }
                        }
                    }, 50);

                    if (i < switchCount - 1) {
                        await this.sleep(delay);
                    }
                }

                // Release switch back to pool after a delay
                setTimeout(() => {
                    availableSwitch.inUse = false;
                }, 500);

                console.log('iOS switch haptic sequence completed');
                return true;
            } catch (error) {
                availableSwitch.inUse = false;
                console.error('iOS switch haptic failed:', error);
                return false;
            }
        }

        getPatternSwitchCount(pattern) {
            switch (pattern) {
                case 'single': return 1;
                case 'double': return 2;
                case 'triple': return 3;
                case 'long': return 1; // Long is handled differently
                case 'pattern': return 5;
                default: return 1;
            }
        }

        getPatternDelay(pattern) {
            switch (pattern) {
                case 'double': return 100;
                case 'triple': return 150;
                case 'pattern': return 200;
                default: return 100;
            }
        }

        async triggerVibrationAPI(pattern) {
            if (!navigator.vibrate) {
                return false;
            }

            try {
                let vibrationPattern;
                
                switch (pattern) {
                    case 'single':
                        vibrationPattern = [200];
                        break;
                    case 'double':
                        vibrationPattern = [100, 100, 100];
                        break;
                    case 'triple':
                        vibrationPattern = [100, 100, 100, 100, 100];
                        break;
                    case 'long':
                        vibrationPattern = [800];
                        break;
                    case 'pattern':
                        vibrationPattern = [200, 100, 100, 100, 200, 100, 300];
                        break;
                    default:
                        vibrationPattern = [200];
                }

                navigator.vibrate(vibrationPattern);
                return true;
            } catch (error) {
                console.warn('Vibration API failed:', error);
                return false;
            }
        }

        playAudioFeedback(pattern) {
            try {
                // Create different audio frequencies for different patterns
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                const frequencies = {
                    single: [800],
                    double: [800, 600],
                    triple: [800, 600, 400],
                    long: [400],
                    pattern: [800, 600, 400, 600, 800]
                };

                const freqs = frequencies[pattern] || [800];
                const duration = pattern === 'long' ? 800 : 100;

                freqs.forEach((freq, index) => {
                    setTimeout(() => {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                        oscillator.type = 'sine';
                        
                        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + duration / 1000);
                    }, index * 150);
                });
                
                return true;
            } catch (error) {
                console.warn('Audio feedback failed:', error);
                return false;
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async trigger(pattern) {
            // Update debug UI before triggering
            this.updateDebugUI();
            
            // Validate pattern
            const validPatterns = ['single', 'double', 'triple', 'long', 'pattern'];
            if (!validPatterns.includes(pattern)) {
                console.warn(`Invalid haptic pattern: ${pattern}. Valid patterns are: ${validPatterns.join(', ')}`);
                return;
            }
            
            // For iOS: Try switch method first if we have recent interaction and credits
            // This provides the best haptic experience on iOS
            if (this.supportInfo.isIOS && this.supportInfo.isSafari && this.supportInfo.hasSwitchSupport) {
                const success = await this.triggerIOSSwitchHaptic(pattern);
                if (success) {
                    this.updateDebugUI('iOS Switch Haptic');
                    return;
                }
            }
            
            // Fallback to Vibration API (works programmatically on iOS and Android)
            // This is used when:
            // - No recent user interaction (programmatic call)
            // - No gesture credits available
            // - Switch method not available
            if (this.supportInfo.hasVibrationAPI) {
                const success = await this.triggerVibrationAPI(pattern);
                if (success) {
                    this.updateDebugUI('Vibration API');
                    return;
                }
            }
            
            // Final fallback to audio
            this.playAudioFeedback(pattern);
            this.updateDebugUI('Audio Fallback');
        }

        createDebugUI() {
            // Wait for body to be available
            if (!document.body) {
                // If body doesn't exist yet, wait for it
                setTimeout(() => this.createDebugUI(), 100);
                return;
            }
            
            // Check if debug UI already exists
            if (document.getElementById('haptic-debug-ui')) {
                this.debugContainer = document.getElementById('haptic-debug-ui');
                return;
            }
            
            // Create toggle button
            const toggleButton = document.createElement('div');
            toggleButton.id = 'haptic-debug-toggle';
            toggleButton.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 30px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #FFD700;
                border-radius: 50%;
                cursor: pointer;
                z-index: 99998;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFD700;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s ease;
            `;
            toggleButton.textContent = 'H';
            toggleButton.title = 'Toggle Haptic Debug UI';
            toggleButton.style.display = 'none'; // Hidden by default
            toggleButton.addEventListener('click', () => {
                this.toggleDebugUI();
            });
            document.body.appendChild(toggleButton);
            this.debugToggleButton = toggleButton;
            
            // Create debug container
            const debugContainer = document.createElement('div');
            debugContainer.id = 'haptic-debug-ui';
            debugContainer.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 12px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.6;
                z-index: 99999;
                max-width: 280px;
                border: 2px solid #333;
            `;
            
            debugContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #FFD700;">Haptic Debug</div>
                    <div id="haptic-debug-close" style="cursor: pointer; color: #fff; font-size: 14px; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.2);" title="Close">✕</div>
                </div>
                <div id="haptic-debug-enabled">Enabled: Checking...</div>
                <div id="haptic-debug-ios">iOS Support: Checking...</div>
                <div id="haptic-debug-credits">Credits: 0</div>
                <div id="haptic-debug-recent">Recent Interaction: No</div>
                <div id="haptic-debug-can-trigger">Can Trigger: No</div>
                <div id="haptic-debug-method" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">Last Method: -</div>
            `;
            
            // Add close button handler
            const closeButton = debugContainer.querySelector('#haptic-debug-close');
            closeButton.addEventListener('click', () => {
                this.toggleDebugUI();
            });
            
            debugContainer.style.display = 'none'; // Hidden by default
            document.body.appendChild(debugContainer);
            this.debugContainer = debugContainer;
            
            // Initial update
            this.updateDebugUI();
        }

        showDebugToggle() {
            if (this.debugToggleButton) {
                this.debugToggleButton.style.display = 'flex';
            }
        }

        hideDebugToggle() {
            if (this.debugToggleButton) {
                this.debugToggleButton.style.display = 'none';
                // Also hide debug UI if it's open
                if (this.debugContainer) {
                    this.debugContainer.style.display = 'none';
                }
            }
        }

        toggleDebugUI() {
            if (!this.debugContainer || !this.debugToggleButton) return;
            
            const isVisible = this.debugContainer.style.display !== 'none';
            
            if (isVisible) {
                // Hide debug UI, show toggle button
                this.debugContainer.style.display = 'none';
                this.debugToggleButton.style.display = 'flex';
            } else {
                // Show debug UI, hide toggle button
                this.debugContainer.style.display = 'block';
                this.debugToggleButton.style.display = 'none';
                // Update UI when showing
                this.updateDebugUI();
            }
        }

        updateDebugUI(lastMethod = null) {
            if (!this.debugContainer) return;
            
            const isEnabled = this.supportInfo.canUseHaptics;
            const isIOS = this.supportInfo.isIOS;
            const isSafari = this.supportInfo.isSafari;
            const hasSwitchSupport = this.supportInfo.hasSwitchSupport;
            const hasVibrationAPI = this.supportInfo.hasVibrationAPI;
            const recentInteraction = this.isUserInteractionRecent();
            const timeSinceInteraction = this.lastUserInteraction ? 
                Math.floor((Date.now() - this.lastUserInteraction) / 1000) : 'Never';
            const canTrigger = recentInteraction && this.gestureCredits > 0;
            
            // Update enabled status
            const enabledEl = document.getElementById('haptic-debug-enabled');
            if (enabledEl) {
                enabledEl.textContent = `Enabled: ${isEnabled ? '✅ Yes' : '❌ No'}`;
                enabledEl.style.color = isEnabled ? '#4CAF50' : '#F44336';
            }
            
            // Update iOS support
            const iosEl = document.getElementById('haptic-debug-ios');
            if (iosEl) {
                let iosStatus = '';
                if (isIOS && isSafari) {
                    iosStatus = `✅ iOS Safari (Switch: ${hasSwitchSupport ? 'Yes' : 'No'}, Vibration: ${hasVibrationAPI ? 'Yes' : 'No'})`;
                } else if (isIOS) {
                    iosStatus = `⚠️ iOS (Not Safari)`;
                } else {
                    iosStatus = `ℹ️ Not iOS (Vibration: ${hasVibrationAPI ? 'Yes' : 'No'})`;
                }
                iosEl.textContent = `Platform: ${iosStatus}`;
                iosEl.style.color = isIOS && isSafari && hasSwitchSupport ? '#4CAF50' : '#FF9800';
            }
            
            // Update credits
            const creditsEl = document.getElementById('haptic-debug-credits');
            if (creditsEl) {
                creditsEl.textContent = `Credits: ${this.gestureCredits}`;
                creditsEl.style.color = this.gestureCredits > 0 ? '#4CAF50' : '#F44336';
            }
            
            // Update recent interaction
            const recentEl = document.getElementById('haptic-debug-recent');
            if (recentEl) {
                if (recentInteraction) {
                    recentEl.textContent = `Recent Interaction: ✅ Yes (${timeSinceInteraction}s ago)`;
                    recentEl.style.color = '#4CAF50';
                } else {
                    recentEl.textContent = `Recent Interaction: ❌ No (${timeSinceInteraction !== 'Never' ? timeSinceInteraction + 's ago' : 'Never'})`;
                    recentEl.style.color = '#F44336';
                }
            }
            
            // Update can trigger
            const canTriggerEl = document.getElementById('haptic-debug-can-trigger');
            if (canTriggerEl) {
                if (canTrigger) {
                    canTriggerEl.textContent = `Can Trigger: ✅ Yes (iOS Switch)`;
                    canTriggerEl.style.color = '#4CAF50';
                } else if (hasVibrationAPI) {
                    canTriggerEl.textContent = `Can Trigger: ⚠️ Yes (Vibration API)`;
                    canTriggerEl.style.color = '#FF9800';
                } else {
                    canTriggerEl.textContent = `Can Trigger: ❌ No`;
                    canTriggerEl.style.color = '#F44336';
                }
            }
            
            // Update last method
            if (lastMethod) {
                const methodEl = document.getElementById('haptic-debug-method');
                if (methodEl) {
                    methodEl.textContent = `Last Method: ${lastMethod}`;
                    methodEl.style.color = '#2196F3';
                }
            }
        }
    }

    // Initialize the haptic feedback system
    let hapticSystem = null;

    // Initialize function
    function initializeHapticSystem() {
        if (!hapticSystem) {
            try {
                hapticSystem = new HapticFeedback();
            } catch (error) {
                console.error('Failed to initialize haptic feedback system:', error);
            }
        }
    }

    // Global function for triggering haptics
    function triggerHaptic(pattern) {
        // Ensure system is initialized
        if (!hapticSystem) {
            initializeHapticSystem();
        }
        
        if (hapticSystem) {
            hapticSystem.trigger(pattern);
        } else {
            console.warn('Haptic feedback system not available');
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHapticSystem);
    } else {
        // DOM is already ready
        initializeHapticSystem();
    }

    // Attach to window object for maximum reliability
    window.triggerHaptic = triggerHaptic;

    // Also expose the class for advanced usage if needed
    window.HapticFeedback = HapticFeedback;

    // Expose debug toggle functions
    window.showHapticDebug = function() {
        if (hapticSystem) {
            hapticSystem.showDebugToggle();
        }
    };

    window.hideHapticDebug = function() {
        if (hapticSystem) {
            hapticSystem.hideDebugToggle();
        }
    };

})();

