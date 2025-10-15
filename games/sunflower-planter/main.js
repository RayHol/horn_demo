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