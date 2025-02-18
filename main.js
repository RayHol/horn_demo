const sceneEl=document.getElementById("scene");

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
    if(currentMode != 0) {
        if(currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        if(currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        currentMode = 0
        document.getElementById('seedpacketcontainer').emit('seedsEnter')
        document.getElementById('throwButton').innerHTML = 'Throw Seed'
        document.getElementById('camera').setAttribute('throw-seed', {
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
    }
}
function swapWater() {
    if(currentMode != 1) {
        if(currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(currentMode == 2) {
            document.getElementById('shovelcontainer').emit('shovelLeave')
        }
        currentMode = 1
        document.getElementById('wateringcancontainer').emit('waterEnter')
        document.getElementById('throwButton').innerHTML = 'Water Target'
        document.getElementById('camera').setAttribute('throw-seed', {
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
    }
}
function swapShovel() {
    if(currentMode != 2) {
        if(currentMode == 0) {
            document.getElementById('seedpacketcontainer').emit('seedsLeave')
        }
        if(currentMode == 1) {
            document.getElementById('wateringcancontainer').emit('waterLeave')
        }
        currentMode = 2
        document.getElementById('shovelcontainer').emit('shovelEnter')
        document.getElementById('throwButton').innerHTML = 'Dig Hole'
        document.getElementById('camera').setAttribute('throw-seed', {
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
    }
}