/**
 * Audio Manager for Sunflower Planter Game
 * Centralized audio system with randomization for sound variations
 */
class AudioManager {
  constructor() {
    this.sounds = {
      buttonTap: ['assets/audio/click.mp3'],
      shovelButton: ['assets/audio/Digging 1.mp3'],
      seedButton: ['assets/audio/Seed Miss 1.mp3'],
      dig: [
        'assets/audio/Digging 3.mp3',
        'assets/audio/Digging 3 V2.mp3',
        'assets/audio/Digging 3 V3.mp3',
        'assets/audio/Digging 3 V4.mp3'
      ],
      digSecond: [
        'assets/audio/Digging 3.mp3',
        'assets/audio/Digging 3 V2.mp3',
        'assets/audio/Digging 3 V3.mp3',
        'assets/audio/Digging 3 V4.mp3'
      ],
      throwWhoosh: [
        'assets/audio/Throwing Whoosh 1.mp3',
        'assets/audio/Throwing Whoosh 2.mp3',
        'assets/audio/Throwing Whoosh 3.mp3',
        'assets/audio/Throwing Whoosh 4.mp3',
        'assets/audio/Throwing Whoosh 5.mp3',
        'assets/audio/Throwing Whoosh 6.mp3',
        'assets/audio/Throwing Whoosh 7.mp3',
        'assets/audio/Throwing Whoosh 8.mp3',
        'assets/audio/Throwing Whoosh 9.mp3'
      ],
      seedLand: [
        'assets/audio/Seed Land 1.mp3',
        'assets/audio/Seed Land 2.mp3',
        'assets/audio/Seed Land 3.mp3'
      ],
      waterPickup: [
        'assets/audio/Watering Can Pickup 1.mp3',
        'assets/audio/Watering Can Pickup 2.mp3'
      ],
      waterPour: [
        'assets/audio/Watering Can Pour 1.mp3',
        'assets/audio/Watering Can Pour 2.mp3',
        'assets/audio/Watering Can Pour 3.mp3',
        'assets/audio/Watering Can Pour 4.mp3',
        'assets/audio/Watering Can Pour 5.mp3'
      ],
      saplingGrow: [
        'assets/audio/Sunflower Sapling Grow 1.mp3',
        'assets/audio/Sunflower Sapling Grow 2.mp3',
        'assets/audio/Sunflower Sapling Grow 3.mp3'
      ],
      sunflowerComplete: [
        'assets/audio/Sunflower Complete 1.mp3',
        'assets/audio/Sunflower Complete 2.mp3',
        'assets/audio/Sunflower Complete 3.mp3'
      ],
      beeBuzz: [
        'assets/audio/Sunflower Game Bee 1.mp3',
        'assets/audio/Sunflower Game Bee 2.mp3'
      ],
      tada: ['assets/audio/tada.mp3']
    };
    
    this.audioElements = {};
    this.volume = 0.7;
    this.initialized = false;
    this.audioContext = null;
  }

  /**
   * Initialize the audio manager and preload sounds
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Initialize audio context for better browser compatibility
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        this.audioContext = new (AudioContext || webkitAudioContext)();
      }
      
      // Preload all audio files
      for (const category in this.sounds) {
        this.audioElements[category] = [];
        for (const soundPath of this.sounds[category]) {
          const audio = new Audio(soundPath);
          audio.preload = 'auto';
          audio.volume = this.volume;
          audio._originalVolume = this.volume; // Store original volume for global audio manager
          audio.crossOrigin = 'anonymous'; // Handle CORS issues
          
          // Register with global audio manager so it respects the audio toggle
          if (typeof window.registerAudio === 'function') {
            window.registerAudio(audio);
          }
          
          // Ensure audio is loaded
          audio.addEventListener('canplaythrough', () => {
            console.log(`Audio loaded: ${soundPath}`);
          });
          
          audio.addEventListener('error', (e) => {
            console.warn(`Failed to load audio: ${soundPath}`, e);
          });
          
          this.audioElements[category].push(audio);
        }
      }
      
      this.initialized = true;
      console.log('Audio Manager initialized successfully');
    } catch (error) {
      console.warn('Audio Manager initialization failed:', error);
    }
  }

  /**
   * Resume audio context if suspended (required for user interaction)
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Force audio context initialization (call on first user interaction)
   */
  async initializeAudioContext() {
    if (!this.audioContext) {
      try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
          this.audioContext = new (AudioContext || webkitAudioContext)();
        }
      } catch (error) {
        console.warn('Failed to create audio context:', error);
      }
    }
    
    await this.resumeAudioContext();
  }

  /**
   * Play a random sound from the specified category
   * @param {string} category - The sound category to play
   * @param {number} volume - Optional volume override (0-1)
   * @param {boolean} loop - Whether to loop the sound (default: false)
   */
  async playSound(category, volume = null, loop = false) {
    // Check if audio is enabled before playing
    const audioEnabled = (typeof window.isAudioEnabled === 'function') ? window.isAudioEnabled() : true;
    if (!audioEnabled) {
      return; // Don't play if audio is disabled
    }
    
    if (!this.initialized) {
      console.warn('Audio Manager not initialized');
      return;
    }

    if (!this.audioElements[category] || this.audioElements[category].length === 0) {
      console.warn(`No sounds found for category: ${category}`);
      return;
    }

    try {
      // Initialize and resume audio context if needed
      await this.initializeAudioContext();
      
      // Get random sound from category
      const randomIndex = Math.floor(Math.random() * this.audioElements[category].length);
      const originalAudio = this.audioElements[category][randomIndex];
      
      // Create a new audio instance to avoid conflicts with overlapping sounds
      const audio = new Audio(originalAudio.src);
      const baseVolume = volume !== null ? Math.max(0, Math.min(1, volume)) : this.volume;
      audio._originalVolume = baseVolume; // Store original volume
      audio.volume = baseVolume;
      audio.loop = loop;
      
      // Register dynamically created audio with global audio manager
      if (typeof window.registerAudio === 'function') {
        window.registerAudio(audio);
      }
      
      // Store reference to looping audio for stopping later
      if (loop) {
        this.currentLoopingAudio = audio;
      }
      
      // Play the sound with better error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Failed to play sound ${category}:`, error);
        });
      }
      
    } catch (error) {
      console.warn(`Error playing sound ${category}:`, error);
    }
  }

  /**
   * Set the global volume for all sounds
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update all existing audio elements
    for (const category in this.audioElements) {
      this.audioElements[category].forEach(audio => {
        audio.volume = this.volume;
      });
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAllSounds() {
    for (const category in this.audioElements) {
      this.audioElements[category].forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }

  /**
   * Stop the currently looping audio
   */
  stopLoopingAudio() {
    if (this.currentLoopingAudio) {
      this.currentLoopingAudio.pause();
      this.currentLoopingAudio.currentTime = 0;
      this.currentLoopingAudio.loop = false;
      this.currentLoopingAudio = null;
    }
  }
}

// Create global instance
window.AudioManager = new AudioManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AudioManager.init();
});
