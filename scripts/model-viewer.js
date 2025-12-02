/**
 * Smartify Model Viewer Package
 * A lightweight 3D model viewer with AR functionality
 * Adapted for Horniman Animals App
 */

class SmartifyModelViewer {
  constructor(options = {}) {
    this.options = {
      container: options.container || 'body',
      modelSrc: options.modelSrc || '',
      iosSrc: options.iosSrc || '',
      backgroundColor: options.backgroundColor || '#FCF6EF',
      environmentImage: options.environmentImage || '',
      exposure: options.exposure || 1.0,
      shadowIntensity: options.shadowIntensity || 0.0,
      shadowSoftness: options.shadowSoftness || 1,
      autoRotate: options.autoRotate || false,
      cameraControls: options.cameraControls !== false,
      enablePan: options.enablePan !== false,
      fieldOfView: options.fieldOfView || '45deg',
      maxFieldOfView: options.maxFieldOfView || '45deg',
      cameraOrbit: options.cameraOrbit || '0deg 75deg 1.5m',
      cameraTarget: options.cameraTarget || '0m 0m 0m',
      interactionPrompt: options.interactionPrompt || 'none',
      arModes: options.arModes || 'webxr scene-viewer quick-look',
      showControls: options.showControls || false,
      showInstructions: options.showInstructions || false,
      customControls: options.customControls || [],
      onModelLoad: options.onModelLoad || null,
      onError: options.onError || null,
      onARStart: options.onARStart || null,
      onAREnd: options.onAREnd || null,
      ...options
    };

    this.viewer = null;
    this.container = null;
    this.controlsContainer = null;
    this.instructionsContainer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the model viewer
   */
  async init() {
    try {
      // Wait for model-viewer to be loaded
      await this.waitForModelViewer();
      
      // Get container element
      this.container = typeof this.options.container === 'string' 
        ? document.querySelector(this.options.container)
        : this.options.container;

      if (!this.container) {
        throw new Error('Container element not found');
      }

      // Create the viewer HTML structure
      this.createViewerHTML();
      
      // Initialize the model-viewer element
      this.initializeViewer();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Apply initial settings
      this.applySettings();
      
      this.isInitialized = true;
      
      if (this.options.onModelLoad) {
        this.options.onModelLoad(this.viewer);
      }
      
    } catch (error) {
      console.error('Failed to initialize Smartify Model Viewer:', error);
      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  /**
   * Wait for model-viewer custom element to be defined
   */
  async waitForModelViewer() {
    return new Promise((resolve) => {
      if (customElements.get('model-viewer')) {
        resolve();
      } else {
        customElements.whenDefined('model-viewer').then(resolve);
      }
    });
  }

  /**
   * Create the HTML structure for the viewer
   */
  createViewerHTML() {
    this.container.innerHTML = `
      <div class="smartify-viewer-container">
        <model-viewer 
          id="smartify-viewer" 
          class="smartify-model-viewer"
          data-js-focus-visible
          src="${this.options.modelSrc}"
          ${this.options.iosSrc ? `ios-src="${this.options.iosSrc}"` : ''}
          autoplay 
          camera-controls="${this.options.cameraControls}"
          enable-pan="${this.options.enablePan}" 
          field-of-view="${this.options.fieldOfView}" 
          max-field-of-view="${this.options.maxFieldOfView}" 
          interaction-prompt="${this.options.interactionPrompt}" 
          exposure="${this.options.exposure}"
          shadow-intensity="${this.options.shadowIntensity}"
          shadow-softness="${this.options.shadowSoftness}"
          camera-orbit="${this.options.cameraOrbit || '0deg 75deg 1.5m'}"
          camera-target="${this.options.cameraTarget || '0m 0m 0m'}"
          ar 
          ar-modes="${this.options.arModes}">
          <div slot="ar-button"></div>
        </model-viewer>
      </div>
    `;

    // Get references to elements
    this.viewer = this.container.querySelector('#smartify-viewer');
  }

  /**
   * Initialize the model-viewer element
   */
  initializeViewer() {
    if (!this.viewer) return;

    // Set initial properties
    this.viewer.src = this.options.modelSrc;
    if (this.options.iosSrc) {
      this.viewer.setAttribute('ios-src', this.options.iosSrc);
    }
    this.viewer.environmentImage = this.options.environmentImage;
    this.viewer.exposure = this.options.exposure;
    this.viewer.shadowIntensity = this.options.shadowIntensity;
    this.viewer.shadowSoftness = this.options.shadowSoftness;
    this.viewer.autoRotate = this.options.autoRotate;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.viewer) return;

    // Error handling
    this.viewer.addEventListener('error', (event) => {
      console.error('Model viewer error:', event.detail);
      if (this.options.onError) {
        this.options.onError(event.detail);
      }
    });

    // AR event listeners
    this.viewer.addEventListener('ar-status', (event) => {
      if (event.detail.status === 'session-started') {
        if (this.options.onARStart) {
          this.options.onARStart();
        }
      } else if (event.detail.status === 'session-ended') {
        if (this.options.onAREnd) {
          this.options.onAREnd();
        }
      }
    });
  }

  /**
   * Apply current settings to the viewer
   */
  applySettings() {
    if (!this.viewer) return;

    // Set background color
    if (this.container && this.container.parentElement) {
      this.container.parentElement.style.backgroundColor = this.options.backgroundColor;
    }
  }

  /**
   * Update viewer options
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (this.isInitialized) {
      this.applySettings();
    }
  }

  /**
   * Load a new model
   */
  loadModel(src) {
    if (this.viewer) {
      this.viewer.src = src;
      this.options.modelSrc = src;
    }
  }

  /**
   * Set environment image
   */
  setEnvironment(imageSrc) {
    if (this.viewer) {
      this.viewer.environmentImage = imageSrc;
      this.options.environmentImage = imageSrc;
    }
  }

  /**
   * Get the model-viewer element
   */
  getViewer() {
    return this.viewer;
  }

  /**
   * Destroy the viewer instance
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isInitialized = false;
  }
}

// Static method to initialize a new instance
SmartifyModelViewer.init = function(options) {
  const instance = new SmartifyModelViewer(options);
  return instance.init().then(() => instance);
};

// Make it available globally
window.SmartifyModelViewer = SmartifyModelViewer;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartifyModelViewer;
}

