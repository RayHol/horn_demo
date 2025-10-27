// Video Background
const constraints = {
    video: {
      facingMode: 'environment',
      height: 720,
      width: 1280
    }
};
const video = document.querySelector('video');
video.setAttribute('autoplay', '');
video.setAttribute('muted', '');
video.setAttribute('playsinline', '');
navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {video.srcObject = stream});

//Audio
function startAudio() {
  // Enable audio for iOS
  if (typeof enableAudio === 'function') {
    enableAudio();
  }

  // Also try to play audio directly as fallback for iOS
  const backgroundAudio = document.getElementById('background-mp3');
  if (backgroundAudio) {
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.5;
    backgroundAudio.play().catch(e => console.log('Direct background audio play failed:', e));
  }
}

let fingerDown = false
document.querySelector('#scene').addEventListener("mousedown", function(){
  playRandomCleaning()
  fingerDown = true
})
document.querySelector('#scene').addEventListener("mouseup", function(){
  fingerDown = false
})

setInterval(() => {
  if(fingerDown) {
    playRandomCleaning()
  }
}, 1250)

function playRandomCleaning() {
  let rand = randomInt(1, 3)
  document.querySelector('#cleaning-sfx-' + rand.toString()).emit('startsound')
}
function playRandomCleaned() {
  let rand = randomInt(1, 3)
  document.querySelector('#cleaned-sfx-' + rand.toString()).emit('startsound')
}

//Game

let cleanCount = 0;

const anemone = document.querySelector('#anemone')

// Test function for particles
window.testParticles = function() {
  console.log('Testing particles manually...');
  const particleEl = document.querySelector('#particle-a');
  console.log('Particle element:', particleEl);
  if (particleEl && particleEl.components['particle-effects']) {
    console.log('Component found, creating particles...');
    particleEl.components['particle-effects'].createDirtParticles();
  } else {
    console.log('Component not found. Available components:', particleEl ? Object.keys(particleEl.components) : 'Element not found');
  }
}

function anemoneCleaned() {
  playRandomCleaned()

  // Trigger hand fade-out animation
  const handImage = document.querySelector('#hand-image');
  if (handImage) {
    handImage.emit('zone2Finished');
  }
  // Hide instructions when zone is finished
  hideInstructions();

  cleanCount++
  if(cleanCount === 1) {
    document.querySelector('#hint').innerHTML = "Great! Let's get to work on the others."
  }
  if(cleanCount === 2) {
    document.querySelector('#hint').innerHTML = "Half way there, keep going!"
  }
  if(cleanCount === 3) {
    document.querySelector('#hint').innerHTML = "Just one more to go, don't stop now!"
  }
  if(cleanCount >= 4) {
    document.querySelector('#hint').innerHTML = "You did it, they're all clean!"
    setTimeout(() => {
      openCongratulations()
    }, 5000);
  }
}

document.querySelector('#dirt1').addEventListener('milestone1', () => {
  anemone.setAttribute('zone-textures', {
    a: 1
  })
})
document.querySelector('#dirt1').addEventListener('milestone2', () => {
  anemone.setAttribute('zone-textures', {
    a: 2
  })
})
document.querySelector('#dirt1').addEventListener('milestone3', () => {
  anemone.setAttribute('zone-textures', {
    a: 3
  })
})
document.querySelector('#dirt1').addEventListener('finished', () => {
  anemone.setAttribute('zone-textures', {
    a: 4
  })
  anemoneCleaned()
})

document.querySelector('#dirt2').addEventListener('milestone1', () => {
  anemone.setAttribute('zone-textures', {
    b: 1
  })
})
document.querySelector('#dirt2').addEventListener('milestone2', () => {
  anemone.setAttribute('zone-textures', {
    b: 2
  })
})
document.querySelector('#dirt2').addEventListener('milestone3', () => {
  anemone.setAttribute('zone-textures', {
    b: 3
  })
})
document.querySelector('#dirt2').addEventListener('finished', () => {
  anemone.setAttribute('zone-textures', {
    b: 4
  })
  anemoneCleaned()
})

document.querySelector('#dirt3').addEventListener('milestone1', () => {
  anemone.setAttribute('zone-textures', {
    c: 1
  })
})
document.querySelector('#dirt3').addEventListener('milestone2', () => {
  anemone.setAttribute('zone-textures', {
   ca: 2
  })
})
document.querySelector('#dirt3').addEventListener('milestone3', () => {
  anemone.setAttribute('zone-textures', {
    c: 3
  })
})
document.querySelector('#dirt3').addEventListener('finished', () => {
  anemone.setAttribute('zone-textures', {
    c: 4
  })
  anemoneCleaned()
})

document.querySelector('#dirt4').addEventListener('milestone1', () => {
  anemone.setAttribute('zone-textures', {
    d: 1
  })
})
document.querySelector('#dirt4').addEventListener('milestone2', () => {
  anemone.setAttribute('zone-textures', {
    d: 2
  })
})
document.querySelector('#dirt4').addEventListener('milestone3', () => {
  anemone.setAttribute('zone-textures', {
    d: 3
  })
})
document.querySelector('#dirt4').addEventListener('finished', () => {
  anemone.setAttribute('zone-textures', {
    d: 4
  })
  anemoneCleaned()
})

// Optimized particle system for texture transitions and cleaning effects
AFRAME.registerComponent('particle-effects', {
  schema: {
    zone: { type: 'string', default: 'a' },
    position: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
  },
  init: function () {
    this.particleSystem = null;
    this.isActive = false;
  },
  
  // Create floating dirt particles when texture changes
  createDirtParticles: function() {
    try {
      console.log('Creating dirt particles for zone:', this.data.zone);
      
      if (this.particleSystem && this.particleSystem.parentNode) {
        this.el.removeChild(this.particleSystem);
      }
      
      // Try particle-system component first
      this.particleSystem = document.createElement('a-entity');
    
    // Use fallback system for better underwater-style animation
    console.log('Using fallback particles for better underwater effect');
    this.createFallbackParticles();
    
    this.particleSystem.setAttribute('position', this.data.position);
    this.el.appendChild(this.particleSystem);
    
    console.log('Dirt particles created and added to scene');
    
    // Auto-remove after animation
    setTimeout(() => {
      if (this.particleSystem && this.particleSystem.parentNode) {
        this.el.removeChild(this.particleSystem);
        console.log('Dirt particles removed');
      }
    }, 3000);
    } catch (error) {
      console.log('Error creating dirt particles:', error);
    }
  },
  
  createFallbackParticles: function() {
    console.log('Creating underwater-style floating particles');
    // Create particles that float upward like underwater debris
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('a-plane');
      
      // Random dirt texture selection
      const dirtTextures = ['#dirt1-texture', '#dirt2-texture', '#dirt3-texture'];
      const randomTexture = dirtTextures[Math.floor(Math.random() * dirtTextures.length)];
      
      const size = 0.03 + Math.random() * 0.02;
      particle.setAttribute('width', size);
      particle.setAttribute('height', size);
      
      particle.setAttribute('material', {
        src: randomTexture,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
        shader: 'flat'
      });
      
      // Make particles always face camera (billboard effect)
      particle.setAttribute('look-at', '[camera]');
      
      // Start position with some spread
      const startX = (Math.random() - 0.5) * 0.4;
      const startY = Math.random() * 0.1;
      const startZ = (Math.random() - 0.5) * 0.4;
      
      particle.setAttribute('position', {
        x: startX,
        y: startY,
        z: startZ
      });
      
      // Underwater-style floating animation with gentle swaying
      const endX = startX + (Math.random() - 0.5) * 0.3;
      const endY = 1.5 + Math.random() * 1.5;
      const endZ = startZ + (Math.random() - 0.5) * 0.3;
      
      particle.setAttribute('animation', {
        property: 'position',
        to: `${endX} ${endY} ${endZ}`,
        dur: 3000 + Math.random() * 2000,
        easing: 'easeOutQuad'
      });
      
      // Gentle swaying motion
      particle.setAttribute('animation__sway', {
        property: 'position',
        to: `${endX + (Math.random() - 0.5) * 0.2} ${endY} ${endZ + (Math.random() - 0.5) * 0.2}`,
        dur: 2000 + Math.random() * 1000,
        delay: 1000,
        loop: true,
        direction: 'alternate'
      });
      
      // Fade out gradually
      particle.setAttribute('animation__fade', {
        property: 'opacity',
        to: 0,
        dur: 3000,
        delay: 1500
      });
      
      // Gentle rotation (Z-axis only for 2D planes)
      particle.setAttribute('animation__rotate', {
        property: 'rotation',
        to: `0 0 ${Math.random() * 360}`,
        dur: 4000 + Math.random() * 2000,
        loop: true
      });
      
      this.particleSystem.appendChild(particle);
    }
  },
  
  createSparkleFallback: function() {
    console.log('Creating celebration sparkle particles');
    // Create sparkle particles that celebrate cleaning completion
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('a-plane');
      
      // Star shape using a plane with texture
      const size = 0.02 + Math.random() * 0.03;
      particle.setAttribute('width', size);
      particle.setAttribute('height', size);
      
      // Yellow and gold colors
      const colors = ['#FFD700', '#FFA500', '#FFFF00', '#FFD700', '#FFC107'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Create a star with glow effect
      particle.setAttribute('material', {
        src: '#star-texture',
        color: randomColor,
        transparent: true,
        opacity: 0.9 + Math.random() * 0.1,
        shader: 'flat'
      });
      
      // Make particles always face camera (billboard effect)
      particle.setAttribute('look-at', '[camera]');
      
      // Add glow effect using multiple layers
      const glowLayer = document.createElement('a-plane');
      glowLayer.setAttribute('width', size * 1.5);
      glowLayer.setAttribute('height', size * 1.5);
      glowLayer.setAttribute('material', {
        src: '#star-texture',
        color: randomColor,
        transparent: true,
        opacity: 0.3,
        shader: 'flat'
      });
      glowLayer.setAttribute('look-at', '[camera]');
      particle.appendChild(glowLayer);
      
      // Start position with spread
      const startX = (Math.random() - 0.5) * 0.6;
      const startY = Math.random() * 0.3;
      const startZ = (Math.random() - 0.5) * 0.6;
      
      particle.setAttribute('position', {
        x: startX,
        y: startY,
        z: startZ
      });
      
      // Burst outward and upward
      const endX = startX + (Math.random() - 0.5) * 0.8;
      const endY = 2 + Math.random() * 2;
      const endZ = startZ + (Math.random() - 0.5) * 0.8;
      
      particle.setAttribute('animation', {
        property: 'position',
        to: `${endX} ${endY} ${endZ}`,
        dur: 2000 + Math.random() * 1500,
        easing: 'easeOutQuad'
      });
      
      // Enhanced twinkling effect with glow
      particle.setAttribute('animation__twinkle', {
        property: 'opacity',
        to: 0.2,
        dur: 200 + Math.random() * 300,
        loop: true,
        direction: 'alternate'
      });
      
      // Glow opacity animation for the glow layer
      glowLayer.setAttribute('animation__glow', {
        property: 'material.opacity',
        to: 0.6 + Math.random() * 0.3,
        dur: 300 + Math.random() * 400,
        loop: true,
        direction: 'alternate'
      });
      
      // Fade out
      particle.setAttribute('animation__fade', {
        property: 'opacity',
        to: 0,
        dur: 3000,
        delay: 2000
      });
      
      // Fast rotation for sparkle effect (Z-axis only for 2D stars)
      particle.setAttribute('animation__rotate', {
        property: 'rotation',
        to: `0 0 ${360 + Math.random() * 360}`,
        dur: 1000 + Math.random() * 500,
        loop: true
      });
      
      // Enhanced scale pulsing for dramatic sparkle
      particle.setAttribute('animation__pulse', {
        property: 'scale',
        to: `${1.5 + Math.random() * 0.5} ${1.5 + Math.random() * 0.5} ${1.5 + Math.random() * 0.5}`,
        dur: 400 + Math.random() * 300,
        loop: true,
        direction: 'alternate'
      });
      
      // Color shifting between yellow and gold tones
      particle.setAttribute('animation__colorShift', {
        property: 'material.color',
        to: colors[Math.floor(Math.random() * colors.length)],
        dur: 1000 + Math.random() * 1000,
        loop: true,
        direction: 'alternate'
      });
      
      this.particleSystem.appendChild(particle);
    }
  },
  
  // Create sparkle particles when section is fully cleaned
  createSparkleParticles: function() {
    try {
      console.log('Creating sparkle particles for zone:', this.data.zone);
      
      if (this.particleSystem && this.particleSystem.parentNode) {
        this.el.removeChild(this.particleSystem);
      }
    
    this.particleSystem = document.createElement('a-entity');
    
    // Use fallback system for sparkles
    console.log('Using fallback sparkle particles');
    this.createSparkleFallback();
    
      this.particleSystem.setAttribute('position', this.data.position);
      this.el.appendChild(this.particleSystem);
      
      console.log('Sparkle particles created and added to scene');
      
      // Auto-remove after animation
      setTimeout(() => {
        if (this.particleSystem && this.particleSystem.parentNode) {
          this.el.removeChild(this.particleSystem);
          console.log('Sparkle particles removed');
        }
      }, 4000);
    } catch (error) {
      console.log('Error creating sparkle particles:', error);
    }
  }
});

AFRAME.registerComponent('zone-textures', {
  schema: {
    a:  { type: 'int', default: 1 },
    b:  { type: 'int', default: 1 },
    c:  { type: 'int', default: 1 },
    d:  { type: 'int', default: 1 },
  },
  init: function () {
    // Preload all textures to prevent flashing when switching
    // This caches textures in memory for instant swapping
    this.textureCache = {};
    this.loadTextures();
    
    // Store previous texture states to detect changes
    this.previousStates = { a: 1, b: 1, c: 1, d: 1 };
    
    this.el.addEventListener('object3dset', this.updateTexture.bind(this))
    this.el.addEventListener('loaded', this.updateTexture.bind(this))
  },
  
  // Preload all texture variations to eliminate flashing
  loadTextures: function() {
    const loader = new THREE.TextureLoader();
    const texturePaths = [
      'assets/AneTexture_dirty.png',
      'assets/AneTexture_stilldirty.png', 
      'assets/AneTexture_almostclean.png',
      'assets/AneTexture_clean.png'
    ];
    
    // Load each texture and cache it with its corresponding level number
    texturePaths.forEach((path, index) => {
      this.textureCache[index + 1] = loader.load(path);
    });
  },
  
  update: function () {
    console.log('updated component values')
    this.updateTexture()
  },
  
  updateTexture: function () {
    const mesh = this.el.getObject3D('mesh')

    if (!mesh) return

    // Check for texture changes and trigger particle effects
    this.checkForTextureChanges();

    mesh.traverse(function (node) {
      if (node.material) {
        
        // Use cached textures for instant swapping - no more flashing!
        if(node.name.includes('An_A')) {
          node.material.map = this.textureCache[this.data.a];
        }
        if(node.name.includes('An_B')) {
          node.material.map = this.textureCache[this.data.b];
        }
        if(node.name.includes('An_C')) {
          node.material.map = this.textureCache[this.data.c];
        }
        if(node.name.includes('An_D')) {
          node.material.map = this.textureCache[this.data.d];
        }
        
        // Ensure material updates with new texture
        node.material.needsUpdate = true;
      }
    }.bind(this));
  },
  
  // Detect texture changes and trigger appropriate particle effects
  checkForTextureChanges: function() {
    try {
      const zones = ['a', 'b', 'c', 'd'];
      
      zones.forEach(zone => {
        const currentState = this.data[zone];
        const previousState = this.previousStates[zone];
        
        // If texture changed, trigger particle effect
        if (currentState !== previousState) {
          console.log(`Zone ${zone} changed from ${previousState} to ${currentState}`);
          
          // Find the particle effects component for this zone
          const particleEl = document.querySelector(`#particle-${zone}`);
          
          if (particleEl && particleEl.components['particle-effects']) {
            console.log('Particle effects component found, triggering particles');
            // If reached clean state (4), show sparkles
            if (currentState === 4) {
              particleEl.components['particle-effects'].createSparkleParticles();
            } else {
              // Otherwise show floating dirt particles
              particleEl.components['particle-effects'].createDirtParticles();
            }
          } else {
            console.log('Particle effects component not found for zone:', zone);
          }
          
          // Update previous state
          this.previousStates[zone] = currentState;
        }
      });
    } catch (error) {
      console.log('Error in particle effects:', error);
      // Don't let particle errors break the main functionality
    }
  },
  
  // Test function to manually trigger particles (for debugging)
  testParticles: function() {
    console.log('Testing particles...');
    const particleEl = document.querySelector('#particle-a');
    if (particleEl && particleEl.components['particle-effects']) {
      particleEl.components['particle-effects'].createDirtParticles();
    } else {
      console.log('Particle element not found or component not loaded');
    }
  }
});

// Instruction text fade functions
function showInstructions() {
  const instructions = document.querySelector('#instructions');
  if (instructions) {
    instructions.style.opacity = '1';
  }
}

function hideInstructions() {
  const instructions = document.querySelector('#instructions');
  if (instructions) {
    instructions.style.opacity = '0';
  }
}

// Lock camera rotation to prevent touch/mouse rotation on Android
function lockCameraRotation() {
  const camera = document.querySelector('#camera');
  if (camera) {
    // Ensure look-controls is properly configured to prevent rotation
    const lookControls = camera.components['look-controls'];
    if (lookControls) {
      // Disable all rotation methods
      lookControls.enabled = true;
      // Set specific rotation limits
      camera.setAttribute('look-controls', {
        'magicWindowTrackingEnabled': true,
        'touchEnabled': false,
        'mouseEnabled': false,
        'reverseMouseDrag': false,
        'reverseTouchDrag': false
      });
    }
  }
}

// Call on scene ready to ensure camera is locked
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(lockCameraRotation, 100);
  setTimeout(lockCameraRotation, 500);
  setTimeout(lockCameraRotation, 1000);
});

// Also lock camera rotation after A-Frame scene is ready
window.addEventListener('load', () => {
  setTimeout(lockCameraRotation, 100);
  setTimeout(lockCameraRotation, 500);
  setTimeout(lockCameraRotation, 1000);
});
