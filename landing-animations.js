/**
 * Landing Page Animation Controller
 * Dynamically creates and manages 27 animated background layers
 */

class LandingAnimationController {
    constructor() {
        this.container = document.getElementById('landing-background');
        this.layers = [];
        this.animationComplete = false;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Landing background container not found');
            return;
        }
        
        this.createLayers();
        this.setupEventListeners();
    }
    
    createLayers() {
        // Create 27 layer divs
        for (let i = 1; i <= 27; i++) {
            const layer = document.createElement('div');
            layer.className = `landing-layer layer-${i}`;
            layer.setAttribute('data-layer', i);
            
            // Remove debug styling - show actual images
            
            this.container.appendChild(layer);
            this.layers.push(layer);
        }
        
        console.log(`Created ${this.layers.length} animation layers`);
        
        // Debug: Log container info
        console.log('Container:', this.container);
        console.log('Container children:', this.container.children.length);
    }
    
    setupEventListeners() {
        // Add event listeners for animation completion
        this.layers.forEach((layer, index) => {
            layer.addEventListener('animationend', (e) => {
                this.onLayerAnimationComplete(e.target, index + 1);
            });
        });
        
        // Start continuous animations for animals after all layers are in place
        setTimeout(() => {
            this.startContinuousAnimations();
        }, 5000); // 5 seconds after page load
    }
    
    onLayerAnimationComplete(layer, layerNumber) {
        console.log(`Layer ${layerNumber} animation completed`);
        
        // Add continuous animation classes for animals
        if (layerNumber === 25) { // Butterfly
            layer.classList.add('entered');
        } else if (layerNumber === 26) { // Fox
            layer.classList.add('entered');
        } else if (layerNumber === 27) { // Bee
            layer.classList.add('entered');
        }
        
        // Check if all layers are complete
        if (layerNumber === 27) {
            this.animationComplete = true;
            console.log('All layer animations completed');
        }
    }
    
    startContinuousAnimations() {
        // Ensure all animal layers have their continuous animations
        const butterfly = document.querySelector('.layer-25');
        const fox = document.querySelector('.layer-26');
        const bee = document.querySelector('.layer-27');
        
        if (butterfly) butterfly.classList.add('entered');
        if (fox) fox.classList.add('entered');
        if (bee) bee.classList.add('entered');
        
        console.log('Continuous animations started');
    }
    
    // Method to restart animations (useful for testing)
    restartAnimations() {
        this.layers.forEach(layer => {
            layer.style.animation = 'none';
            layer.offsetHeight; // Trigger reflow
            layer.style.animation = null;
            layer.classList.remove('entered');
        });
        
        // Restart after a brief delay
        setTimeout(() => {
            this.layers.forEach((layer, index) => {
                const layerNumber = index + 1;
                if (layerNumber >= 25) { // Animals
                    setTimeout(() => {
                        layer.classList.add('entered');
                    }, 2000);
                }
            });
        }, 100);
    }
    
    // Method to pause/resume animations
    pauseAnimations() {
        this.layers.forEach(layer => {
            layer.style.animationPlayState = 'paused';
        });
    }
    
    resumeAnimations() {
        this.layers.forEach(layer => {
            layer.style.animationPlayState = 'running';
        });
    }
    
    // Method to check if animations are complete
    isAnimationComplete() {
        return this.animationComplete;
    }
    
    // Method to get animation progress (0-1)
    getAnimationProgress() {
        const completedLayers = this.layers.filter(layer => 
            layer.classList.contains('entered') || 
            layer.style.opacity === '1'
        ).length;
        
        return completedLayers / this.layers.length;
    }
    
    // Debug method to check layer visibility
    debugLayers() {
        console.log('=== LAYER DEBUG INFO ===');
        console.log('Container position:', this.container.getBoundingClientRect());
        console.log('Container z-index:', window.getComputedStyle(this.container).zIndex);
        
        this.layers.forEach((layer, index) => {
            const rect = layer.getBoundingClientRect();
            const styles = window.getComputedStyle(layer);
            console.log(`Layer ${index + 1}:`, {
                position: rect,
                zIndex: styles.zIndex,
                opacity: styles.opacity,
                backgroundImage: styles.backgroundImage,
                display: styles.display,
                visibility: styles.visibility
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.landingAnimation = new LandingAnimationController();
    
    // Expose methods globally for debugging
    window.restartLandingAnimation = () => window.landingAnimation.restartAnimations();
    window.pauseLandingAnimation = () => window.landingAnimation.pauseAnimations();
    window.resumeLandingAnimation = () => window.landingAnimation.resumeAnimations();
    window.debugLandingLayers = () => window.landingAnimation.debugLayers();
    
    console.log('Landing animation controller initialized');
});

// Handle page visibility changes to pause/resume animations
document.addEventListener('visibilitychange', () => {
    if (window.landingAnimation) {
        if (document.hidden) {
            window.landingAnimation.pauseAnimations();
        } else {
            window.landingAnimation.resumeAnimations();
        }
    }
});

// Performance optimization: Reduce animations on low-end devices
if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.addEventListener('DOMContentLoaded', () => {
        // Reduce animation complexity for low-end devices
        const style = document.createElement('style');
        style.textContent = `
            .landing-layer {
                animation-duration: 0.5s !important;
            }
            .layer-25.entered {
                animation-duration: 3s !important;
            }
            .layer-26.entered {
                animation-duration: 4s !important;
            }
            .layer-27.entered {
                animation-duration: 6s !important;
            }
        `;
        document.head.appendChild(style);
        console.log('Reduced animation complexity for low-end device');
    });
}
