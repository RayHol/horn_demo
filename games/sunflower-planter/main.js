const sceneEl=document.getElementById("scene");
const camera = document.getElementById("camera");
const shovel = document.getElementById("shovel");
const shovelPocket = document.getElementById("shovelcontainer");

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

window.flowersgrown = 0
window.currentMode = 2
function swapSeeds() {
  document.getElementById("seedButton").classList.remove('pulse')
  
  // Initialize audio context on first user interaction
  if (window.AudioManager) {
    window.AudioManager.initializeAudioContext();
  }
  
  // Play seed button sound at 50% volume
  if (window.AudioManager) {
    console.log('Playing seed button sound');
    window.AudioManager.playSound('seedButton', 0.35).catch(error => {
      console.warn('Failed to play seed button sound:', error);
    });
  } else {
    console.warn('AudioManager not available for seed button');
  }
    if(window.currentMode != 0) {
        if(window.currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        if(window.currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        window.currentMode = 0
        document.getElementById('seedpacketcontainer').emit('seedsEnter')
        document.getElementById('seedpacket').setAttribute('seedpacket', {
            enabled: true,
            }
        )
        document.getElementById('camera').setAttribute('watercan', {
            enabled: false,
            }
        )
        document.getElementById('camera').setAttribute('shovel', {
            enabled: false,
            }
        )
        document.getElementById('dragpad').classList.add('raycast')
    }
}
function swapWater() {
  // Check if watering can is currently animating
  const watercan = document.getElementById('wateringcan');
  if (watercan && watercan.getAttribute('watering') === 'true') {
    return; // Don't allow mode change while watering animation is playing
  }
  
  document.getElementById("waterButton").classList.remove('pulse')
  
  // Initialize audio context on first user interaction
  if (window.AudioManager) {
    window.AudioManager.initializeAudioContext();
  }
  
  // Play watering can pickup sound
  if (window.AudioManager) {
    console.log('Playing water pickup sound');
    window.AudioManager.playSound('waterPickup').catch(error => {
      console.warn('Failed to play water pickup sound:', error);
    });
  } else {
    console.warn('AudioManager not available for water pickup');
  }
    if(window.currentMode != 1) {
        if(window.currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(window.currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        window.currentMode = 1
        document.getElementById('wateringcancontainer').emit('waterEnter')
        document.getElementById('seedpacket').setAttribute('seedpacket', {
            enabled: false,
            }
        )
        document.getElementById('camera').setAttribute('watercan', {
            enabled: true,
            }
        )
        document.getElementById('camera').setAttribute('shovel', {
            enabled: false,
            }
        )
        document.getElementById('dragpad').classList.remove('raycast')
    }
}
function swapShovel() {
  document.getElementById("shovelButton").classList.remove('pulse')
  
  // Initialize audio context on first user interaction
  if (window.AudioManager) {
    window.AudioManager.initializeAudioContext();
  }
  
  // Play shovel button sound at 50% volume
  if (window.AudioManager) {
    console.log('Playing shovel button sound');
    window.AudioManager.playSound('shovelButton', 0.35).catch(error => {
      console.warn('Failed to play shovel button sound:', error);
    });
  } else {
    console.warn('AudioManager not available for shovel button');
  }
    if(window.currentMode != 2) {
        if(window.currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(window.currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        window.currentMode = 2
        document.getElementById('shovelcontainer').emit('shovelEnter')
        document.getElementById('seedpacket').setAttribute('seedpacket', {
            enabled: false,
            }
        )
        document.getElementById('camera').setAttribute('watercan', {
            enabled: false,
            }
        )
        document.getElementById('camera').setAttribute('shovel', {
            enabled: true,
            }
        )
        document.getElementById('dragpad').classList.remove('raycast')
    }
}

document.getElementById('scene').addEventListener('loaded', () => {
  console.log('assets loaded')
  const button = document.getElementById('closehowto');
  gameLoadedReady = true
  if (button && howToCloseReady) {
    button.disabled = false;
    button.innerHTML = "Let's Go!"
    button.classList.add('button-enabled');
    console.log('Let\'s go button enabled');
    document.getElementById('loadingOverlay').style.opacity = 0;
    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.add('hidden')
    }, 2000)
  } else {
    console.error('Button with ID "closehowto" not found');
  }
});