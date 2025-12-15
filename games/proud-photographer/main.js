// Video Background
const constraints = {
    video: {
      facingMode: 'environment',
      height: 1080,
      width: 1920
    }
};
const video = document.querySelector('#camerafeed');
video.setAttribute('autoplay', '');
video.setAttribute('muted', '');
video.setAttribute('playsinline', '');
navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {video.srcObject = stream});

const cameracanvas = document.querySelector('#cameracanvas');
const context = cameracanvas.getContext('2d')
setInterval(() => {
  draw(video, context);
}, 100);
function draw(video, context) {
    context.canvas.width  = window.innerWidth * 2;
    context.canvas.height = window.innerHeight * 2;
    context.drawImage(video, 0, 0, window.innerWidth * 2, window.innerHeight * 2);
}

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

let gameStarted = false
let cameraReady = false

document.querySelector('#savebutton').addEventListener('click', function(){
    saveCanvas(document.querySelector('#outputcanvas'), 'HornimanPeacock')
});

document.querySelector('#retrybutton').addEventListener('click', function(){
    document.querySelector('#polaroid-container').classList.add('polaroid-above')
    document.querySelector('#darkfilter').style.opacity = 0
    cameraReady = true
});

document.querySelector('#okbutton').addEventListener('click', function(){
    document.querySelector('#polaroid-container').classList.add('polaroid-above')
    document.querySelector('#darkfilter').style.opacity = 0
    setTimeout(() => {
      openCongratulations()
    }, 750);
});

function saveCanvas(canvas, imagename) {
  // var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
  // window.location.href=image; // it will save locally 
  
  let canvasImage = canvas.toDataURL('image/png');
    
  // this can be used to download any image from webpage to local disk
  let xhr = new XMLHttpRequest();
  xhr.responseType = 'blob';
  xhr.onload = function () {
      let a = document.createElement('a');
      a.href = window.URL.createObjectURL(xhr.response);
      a.download = imagename?imagename:'photograph' + '.png';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    xhr.open('GET', canvasImage); // This is to download the canvas Image
    xhr.send();
}

let peacock = document.querySelector('#peacock')
let looped = false

// Init game when peacock placed
peacock.addEventListener('placed', () => {
  gameStarted = true
  cameraReady = true
  document.querySelector('#peacock-call-sfx').emit('startsound')
  document.querySelector('#hint').innerHTML = "Snap a pic of the peacock displaying its full plumage."
  document.querySelector('#placezone').setAttribute('visible', false)
  document.querySelector('#peacock').setAttribute('ar-place', {
    enabled: false,
  })
  window.setTimeout(() => {
    document.querySelector('#peacock-call-sfx').emit('startsound')
  }, 7500)
  window.setTimeout(() => {
    document.querySelector('#peacock-call-sfx').emit('startsound')
    console.log('now posing')
    peacock.components.photographersubject.posing = true
  }, 8500)
  window.setTimeout(() => {
    console.log('stopped posing')
    peacock.components.photographersubject.posing = false
    looped = false
  }, 11000)
  // document.querySelector('#camera').emit('enter')
  // document.querySelector('#peacockHint').classList.add('hidden')
})

peacock.addEventListener('animation-loop', () => {
  if(!looped) {
    console.log('looped!')
    looped = true
    if(gameStarted) {
      window.setTimeout(() => {
        document.querySelector('#peacock-call-sfx').emit('startsound')
      }, 7500)
      window.setTimeout(() => {
        if(gameStarted) {
          document.querySelector('#peacock-call-sfx').emit('startsound')
          console.log('now posing')
          peacock.components.photographersubject.posing = true
        }
      }, 8500)
      window.setTimeout(() => {
        console.log('stopped posing')
        peacock.components.photographersubject.posing = false
        looped = false
      }, 11000)
    }
  }
})

// Camera buttons event handler
function cameraButton() {
  if(cameraReady) {
    cameraReady = false
    document.querySelector('#polaroid-snap-sfx').emit('startsound')
    setTimeout(() => {
      document.querySelector('#flashfilter').classList.add('flash')
      document.querySelector('#camera').emit('shutter')
    }, 250)
    setTimeout(() => {
      document.querySelector('#polaroid-print-sfx').emit('startsound')
      document.querySelector('#darkfilter').style.opacity = 1   
      document.querySelector('#flashfilter').classList.remove('flash')
    }, 1000)
    setTimeout(() => {
      document.querySelector('#polaroid-container').classList.remove('polaroid-above')
    }, 2000)
  }
}
// function zoomInButton() {
//   document.querySelector('#camera').emit('zoomIn')
// }
// function zoomOutButton() {
//   document.querySelector('#camera').emit('zoomOut')
// }

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