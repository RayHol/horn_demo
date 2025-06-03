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

let flowersgrown = 0
let currentMode = 2
function swapSeeds() {
  document.getElementById("seedButton").classList.remove('pulse')
    if(currentMode != 0) {
        if(currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        if(currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        currentMode = 0
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
  document.getElementById("waterButton").classList.remove('pulse')
    if(currentMode != 1) {
        if(currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        currentMode = 1
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
    if(currentMode != 2) {
        if(currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        currentMode = 2
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