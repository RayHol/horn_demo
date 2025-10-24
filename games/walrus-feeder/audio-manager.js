/**
 * Audio Manager for Walrus Feeder Game
 * Centralized audio system with randomization for sound variations
 */
class AudioManager {
  constructor() {
    this.sounds = {
      buttonTap: ['assets/audio/click.mp3'],
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
      bucketAppear: [
        'assets/audio/Walrus Game Bucket Sounds 1.mp3',
        'assets/audio/Walrus Game Bucket Sounds 2.mp3',
        'assets/audio/Walrus Game Bucket Sounds 3.mp3',
        'assets/audio/Walrus Game Bucket Sounds 4.mp3'
      ],
      foodLand: [
        'assets/audio/Walrus Game Bucket Sounds 1.mp3',
        'assets/audio/Walrus Game Bucket Sounds 2.mp3',
        'assets/audio/Walrus Game Bucket Sounds 3.mp3',
        'assets/audio/Walrus Game Bucket Sounds 4.mp3'
      ],
      walrusHappy: [
        'assets/audio/Walrus Happy 1.mp3',
        'assets/audio/Walrus Happy 2.mp3',
        'assets/audio/Walrus Happy 3.mp3',
        'assets/audio/Walrus Happy 4.mp3'
      ],
      walrusSad: [
        'assets/audio/Walrus Sad 1.mp3',
        'assets/audio/Walrus Sad 2.mp3',
        'assets/audio/Walrus Sad 3.mp3',
        'assets/audio/Walrus Sad 4.mp3',
        'assets/audio/Walrus Sad 5.mp3',
        'assets/audio/Walrus Sad 6.mp3',
        'assets/audio/Walrus Sad 7.mp3'
      ],
      tada: ['assets/audio/TaDA.wav']
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
          audio.crossOrigin = 'anonymous'; // Handle CORS issues
          
          // Ensure audio is loaded
          audio.addEventListener('canplaythrough', () => {
            console.log(`Audio loaded successfully: ${soundPath}`);
          });
          
          audio.addEventListener('error', (e) => {
            console.error(`Failed to load audio: ${soundPath}`, e);
          });
          
          audio.addEventListener('loadstart', () => {
            console.log(`Starting to load audio: ${soundPath}`);
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
    console.log(`Attempting to play sound: ${category}`);
    
    if (!this.initialized) {
      console.warn('Audio Manager not initialized, attempting to initialize...');
      await this.init();
      if (!this.initialized) {
        console.warn('Audio Manager still not initialized after init attempt');
        return;
      }
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
      const audio = this.audioElements[category][randomIndex];
      
      // Reset audio to beginning and set properties
      audio.currentTime = 0;
      audio.volume = volume !== null ? Math.max(0, Math.min(1, volume)) : this.volume;
      audio.loop = loop;
      
      // Store reference to looping audio for stopping later
      if (loop) {
        this.currentLoopingAudio = audio;
      }
      
      console.log(`Playing sound: ${category}, volume: ${audio.volume}, loop: ${loop}`);
      
      // Small delay to ensure audio context is ready
      setTimeout(() => {
        // Play the sound with better error handling
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn(`Failed to play sound ${category}:`, error);
          });
        }
      }, 10);
      
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
  console.log('DOM loaded, initializing AudioManager...');
  window.AudioManager.init();
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('DOM still loading, will initialize on DOMContentLoaded');
} else {
  console.log('DOM already loaded, initializing AudioManager immediately...');
  window.AudioManager.init();
}
