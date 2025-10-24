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

// Init game when walrus placed
document.querySelector('#animal').addEventListener('placed', () => {
  console.log('placed!')
  document.querySelector('#throwergame').setAttribute('throwergame', {
    throwableGLTF: '#clam-glb',
    throwableScale: '1.2 1.2 1.2',
    startOnLoad: false,
  })
  document.querySelector('#placezone').setAttribute('visible', false)
  document.querySelector('#animal').setAttribute('ar-place', {
    enabled: false,
  })
  document.querySelector('#bucket').emit('enter')
  
  // Play bucket appearance sound
  if (window.AudioManager) {
    console.log('Playing bucket appearance sound');
    window.AudioManager.playSound('bucketAppear').catch(error => {
      console.warn('Failed to play bucket appearance sound:', error);
    });
  } else {
    console.warn('AudioManager not available for bucket appearance sound');
  }
  
  document.querySelector('#walrusHint').classList.add('hidden')
  document.querySelector('#back').setAttribute('ammo-body', {
    type: 'static',
    disableCollision: true,
    emitCollisionEvents: true
  })
  document.querySelector('#back').setAttribute('ammo-shape', {
    type: 'box',
  })
})

// Thrower game hit and miss listener
window.catchCounter = 0
document.querySelector('#throwergame').addEventListener('hit', () => {
  document.querySelector('#animal').emit('eat')
  
  // Play food landing and walrus happy sounds
  if (window.AudioManager) {
    console.log('AudioManager found, playing food landing and walrus happy sounds');
    window.AudioManager.playSound('foodLand').catch(error => {
      console.warn('Failed to play food landing sound:', error);
    });
    window.AudioManager.playSound('walrusHappy').catch(error => {
      console.warn('Failed to play walrus happy sound:', error);
    });
  } else {
    console.warn('AudioManager not available for catch sounds');
  }
  
  window.catchCounter++
  switch(window.catchCounter) {
      case 1:
        document.querySelector('#throwergame').setAttribute('throwergame', {
          throwableGLTF: '#cod-glb',
          throwableScale: '1 1 1'
        })
        document.querySelector('#clamImg').classList.remove('obscured')
        break;
      case 2:
        document.querySelector('#throwergame').setAttribute('throwergame', {
          throwableGLTF: '#shrimp-glb',
          throwableScale: '2.5 2.5 2.5'
        })
        document.querySelector('#codImg').classList.remove('obscured')
        break;
      case 3:
        document.querySelector('#throwergame').setAttribute('throwergame', {
          throwableGLTF: '#mussel-glb',
          throwableScale: '2 2 2'
        })
        document.querySelector('#shrimpImg').classList.remove('obscured')
        break;
      case 4:
        document.querySelector('#throwergame').setAttribute('throwergame', {
          throwableGLTF: '#clam-glb',
          throwableScale: '1 1 1'
        })
        document.querySelector('#musselImg').classList.remove('obscured')
        setTimeout(() => {
          openCongratulations()
        }, 5000);
        break;
      default:
        document.querySelector('#throwergame').setAttribute('throwergame', {
          throwableGLTF: '#clam-glb',
          throwableScale: '1 1 1'
        })
        break;
  }
})
document.querySelector('#throwergame').addEventListener('miss', () => {
  document.querySelector('#animal').emit('drop')
  
  // Play walrus sad sound
  if (window.AudioManager) {
    console.log('AudioManager found, playing walrus sad sound');
    window.AudioManager.playSound('walrusSad').catch(error => {
      console.warn('Failed to play walrus sad sound:', error);
    });
  } else {
    console.warn('AudioManager not available for miss sound');
  }
  
  setTimeout(() => {
    document.querySelector('#throwergame').setAttribute('throwergame', {
      enabled: true,
    })
  }, 500);
})

document.querySelector('#animal').addEventListener('ready', () => {
  document.querySelector('#throwergame').setAttribute('throwergame', {
    enabled: false,
  })
})

// Activate idle animation after either above event finishes
document.querySelector('#animal').addEventListener('animation-finished', (e) => {
  if(e.detail.action._clip.name === 'Eating' || e.detail.action._clip.name === 'Miss') {
    // document.querySelector('#animal').removeAttribute('animation-mixer')
    // let mixer = document.querySelector('#animal').components["animation-mixer"].mixer;
    // mixer.setTime(0);
    document.querySelector('#animal').setAttribute('animation-mixer', {
      clip: 'Idle',
      loop: "repeat",
      timeScale: 1,
      crossFadeDuration: 0.15,
      clampWhenFinished: false,
      startAt: 0
    })
    document.querySelector('#throwergame').setAttribute('throwergame', {
      enabled: true,
    })
  }
})