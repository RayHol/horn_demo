AFRAME.registerComponent('photographergamecamera', {
    schema: {
      // Game
      sceneID: {type: 'string', default: '#scene'},
      videoID: {type: 'string', default: '#camerafeed'},

      // Settings
      innerFocusRadius: {type: 'number', default: 0.04},
      outerFocusRadius: {type: 'number', default: 0.15},
      notinFocusRadius: {type: 'number', default: 0.4},
      innerFocusScoreMultiplier: {type: 'number', default: 3},
      outerFocusScoreMultiplier: {type: 'number', default: 2},
      focusLength: {type: 'number', default: 50},
      greatphotoScore: {type: 'number', default: 3},
      goodphotoScore: {type: 'number', default: 2},
      maxZoom: {type: 'number', default: 3},
      minZoom: {type: 'number', default: 1},
      zoomStep: {type: 'number', default: 0.5},
        
      // Testing
      debug: {type: 'boolean', default: false},
    },
    init: function () {
      // setup data stores
      this.innerfocusObjects = []
      this.outerfocusObjects = []
      this.notinfocusObjects = []
      
      this.score = 0
      this.zoom = 1
      // this.video = document.querySelector(this.data.videoID)
      // this.video.style.transform = 'scale(2) rotate(90)';
      // console.log(this.video.style.transform)
      
      // Add screenshot component to element
      document.querySelector(this.data.sceneID).setAttribute('screenshot', {
        width: Math.max(document.documentElement.clientWidth * 2 || 0, window.innerWidth * 2 || 0),
        height: Math.max(document.documentElement.clientHeight * 2 || 0, window.innerHeight * 2 || 0),
      })
      
      // Create inner camera focus hitbox
      this.innerfocus = document.createElement('a-entity')
      this.innerfocus.setAttribute('id', 'camerainnerfocus')
      this.innerfocus.setAttribute('position', '0 0 ' + (((this.data.focusLength / 2) * -1) -0.5) )
      this.innerfocus.setAttribute('rotation', '90 0 0')
      this.innerfocus.setAttribute('geometry', {
        primitive: 'cone',
        radiusTop: this.data.innerFocusRadius,
        radiusBottom: this.data.innerFocusRadius * 2 * this.data.focusLength,
        height: this.data.focusLength,
      })
      this.innerfocus.setAttribute('material', {
        color: 'red',
        transparent: true,
        opacity: this.data.debug?0.25:0,
      })
      if(!this.data.debug) {
        this.innerfocus.setAttribute('visible', false)
      }
      this.el.append(this.innerfocus)
      
      // Create outer camera focus hitbox
      this.outerfocus = document.createElement('a-entity')
      this.outerfocus.setAttribute('id', 'cameraouterfocus')
      this.outerfocus.setAttribute('position', '0 0 ' + (((this.data.focusLength / 2) * -1) -0.5) )
      this.outerfocus.setAttribute('rotation', '90 0 0')
      this.outerfocus.setAttribute('geometry', {
        primitive: 'cone',
        radiusTop: this.data.outerFocusRadius,
        radiusBottom: this.data.outerFocusRadius * 2 * this.data.focusLength,
        height: this.data.focusLength,
      })
      this.outerfocus.setAttribute('material', {
        color: 'yellow',
        transparent: true,
        opacity: this.data.debug?0.15:0,
      })
      if(!this.data.debug) {
        this.outerfocus.setAttribute('visible', false)
      }
      this.el.append(this.outerfocus)
      
      // Create camera not-in-focus hitbox
      this.notinfocus = document.createElement('a-entity')
      this.notinfocus.setAttribute('id', 'cameranotinfocus')
      this.notinfocus.setAttribute('position', '0 0 ' + (((this.data.focusLength / 2) * -1) -0.5) )
      this.notinfocus.setAttribute('rotation', '90 0 0')
      this.notinfocus.setAttribute('geometry', {
        primitive: 'cone',
        radiusTop: this.data.notinFocusRadius,
        radiusBottom: this.data.notinFocusRadius * 2 * this.data.focusLength,
        height: this.data.focusLength,
      })
      this.notinfocus.setAttribute('material', {
        color: 'grey',
        transparent: true,
        opacity: this.data.debug?0.15:0,
      })
      if(!this.data.debug) {
        this.notinfocus.setAttribute('visible', false)
      }
      this.el.append(this.notinfocus)
      
      // Add hitboxes to focus cones
      this.addFocusConeHitboxes()
      
      this.el.addEventListener('shutter', () => {
        // Calculate Score
        this.calculateScore()
        // Display score
        // if(this.score >= this.data.greatphotoScore) {
        //   window.alert('Great Photo! Score: ' + this.score)
        // } else if(this.score >= this.data.goodphotoScore) {
        //   window.alert('Good Photo! Score: ' + this.score)
        // } else {
        //   window.alert("The subject isn't in the focus, try again. Score: " + this.score)
        // }

        const continueButton = document.querySelector('#okbutton');
        
        if(this.score && (this.score <= 2 || this.score == 4 || this.score == 5)) {
          document.querySelector('#polaroid-note').innerHTML = 'Try to aim the camera so that the peacock is in the center'
          document.querySelector('#okbutton').classList.add('hidden')
        } else if(this.score == 3) {
          document.querySelector('#polaroid-note').innerHTML = 'Try to time the picture so the peacock is showing its feathers'
          document.querySelector('#okbutton').classList.add('hidden')
        } else if(this.score == 6) {
          document.querySelector('#polaroid-note').innerHTML = 'What a lovely picture! Lets save this one'
          document.querySelector('#okbutton').classList.remove('hidden')
        } else {
          document.querySelector('#polaroid-note').innerHTML = 'Hmmm Im not sure you got the peacock in frame, try again!'
          document.querySelector('#okbutton').classList.add('hidden')
        }
        
        // if score meets threshold, then take "screenshot"
        // if(this.score > 5) {
          this.stackedCanvas = this.stackCanvases(
            document.querySelector('#cameracanvas'), 
            document.querySelector('a-scene').components.screenshot.getCanvas('perspective'),
            document.querySelector('#outputcanvas')
          )
          // this.captureCanvas(this.stackedCanvas)
        // }
      })
      
      // Zoom Buttons
      this.el.addEventListener('zoomIn', () => {
        if(this.zoom < this.data.maxZoom) {
          this.zoom += this.data.zoomStep
          this.el.setAttribute('camera', {
            zoom: this.zoom,
          })
          this.innerfocus.setAttribute('geometry', {
            radiusTop: this.data.innerFocusRadius * (1 / this.zoom),
            radiusBottom: (this.data.innerFocusRadius * 2 * this.data.focusLength) * (1 / this.zoom),
          })
          this.outerfocus.setAttribute('geometry', {
            radiusTop: this.data.outerFocusRadius * (1 / this.zoom),
            radiusBottom: (this.data.outerFocusRadius * 2 * this.data.focusLength) * (1 / this.zoom),
          })
        }
      })
      this.el.addEventListener('zoomOut', () => {
        if(this.zoom > this.data.minZoom) {
          this.zoom -= this.data.zoomStep
          this.el.setAttribute('camera', {
            zoom: this.zoom,
          })
          this.innerfocus.setAttribute('geometry', {
            radiusTop: this.data.innerFocusRadius * (1 / this.zoom),
            radiusBottom: (this.data.innerFocusRadius * 2 * this.data.focusLength) * (1 / this.zoom),
          })
          this.outerfocus.setAttribute('geometry', {
            radiusTop: this.data.outerFocusRadius * (1 / this.zoom),
            radiusBottom: (this.data.outerFocusRadius * 2 * this.data.focusLength) * (1 / this.zoom),
          })
        }
      })
      
      // Add event listeners for updating focus contents
      this.innerfocus.addEventListener('collidestart', (e) => {
        this.innerfocusObjects.push(e.detail.targetEl)
      })
      this.innerfocus.addEventListener('collideend', (e) => {
        const index = this.innerfocusObjects.indexOf(e.detail.targetEl)
        const removed = this.innerfocusObjects.splice(index, 1)
      })
      
      this.outerfocus.addEventListener('collidestart', (e) => {
        this.outerfocusObjects.push(e.detail.targetEl)
      })
      this.outerfocus.addEventListener('collideend', (e) => {
        const index = this.outerfocusObjects.indexOf(e.detail.targetEl)
        const removed = this.outerfocusObjects.splice(index, 1)
      })
      
      this.notinfocus.addEventListener('collidestart', (e) => {
        this.notinfocusObjects.push(e.detail.targetEl)
      })
      this.notinfocus.addEventListener('collideend', (e) => {
        const index = this.notinfocusObjects.indexOf(e.detail.targetEl)
        const removed = this.notinfocusObjects.splice(index, 1)
      })

    },
    update: function (oldData) {

    },
    tick: function () {

    },
    addFocusConeHitboxes: function () {
      // Add hitboxes to focus cones
      this.innerfocus.setAttribute("ammo-body", {
        type: "static",
        mass: "5",
        emitCollisionEvents: true,
        collisionFilterGroup: 1,
        collisionFilterMask: 2,
      });
      this.innerfocus.setAttribute("ammo-shape", {
        type: "cone",
        fit: "all",
      });
      
      this.outerfocus.setAttribute("ammo-body", {
        type: "static",
        mass: "5",
        emitCollisionEvents: true,
        collisionFilterGroup: 1,
        collisionFilterMask: 2,
      });
      this.outerfocus.setAttribute("ammo-shape", {
        type: "cone",
        fit: "all",
      });
      
      this.notinfocus.setAttribute("ammo-body", {
        type: "static",
        mass: "5",
        emitCollisionEvents: true,
        collisionFilterGroup: 1,
        collisionFilterMask: 2,
      });
      this.notinfocus.setAttribute("ammo-shape", {
        type: "cone",
        fit: "all",
      });
    },
    stackCanvases: function (canvas1, canvas2, outputcanvas) {
      const outputcanvascontext = outputcanvas.getContext('2d');
      outputcanvascontext.canvas.width  = window.innerWidth * 2;
      outputcanvascontext.canvas.height = window.innerHeight * 2;
      outputcanvascontext.drawImage(canvas1, 0, 0);
      outputcanvascontext.drawImage(canvas2, 0, 0);
      return outputcanvas
    },
    captureCanvas: function (canvas) {
      // Hide UI
      
      // Take screenshot/capture canvas
      // saveCanvas(document.querySelector('a-scene').components.screenshot.getCanvas('perspective'))
      // saveCanvas(canvas)
      
      // document.querySelector('a-scene').components.screenshot.capture('perspective')
      
      // Show UI
    },
    calculateScore: function () {
      this.score = 0
      
      this.innerfocusObjects.forEach((subject) => {
        if(subject.components.photographersubject.posing) {
          this.score += subject.components.photographersubject.data.poseValue * this.data.innerFocusScoreMultiplier
        } else {
          this.score += subject.components.photographersubject.data.subjectValue * this.data.innerFocusScoreMultiplier
        }
      })
      
      this.outerfocusObjects.forEach((subject) => {
        if(this.innerfocusObjects.includes(subject)) {
          
        } else {
          if(subject.components.photographersubject.posing) {
            this.score += subject.components.photographersubject.data.poseValue * this.data.outerFocusScoreMultiplier
          } else {
            this.score += subject.components.photographersubject.data.subjectValue * this.data.outerFocusScoreMultiplier
          }
        }
      })
      
      this.notinfocusObjects.forEach((subject) => {
        if(this.innerfocusObjects.includes(subject) || this.outerfocusObjects.includes(subject)) {
          
        } else {
          if(subject.components.photographersubject.posing) {
            this.score += subject.components.photographersubject.data.poseValue
          } else {
            this.score += subject.components.photographersubject.data.subjectValue
          }
        }
      })
    },
})

AFRAME.registerComponent('photographersubject', {
    schema: {
      // Game
      sceneID: {type: 'string', default: '#scene'},

      // Settings
      subjectHitboxRadius: {type: 'number', default: 0.5},
      subjectHitboxOffset: {type: 'string', default: '0 0.4 0'},
      subjectValue: {type: 'number', default: 1},
      pose: {type: 'boolean', default: false},
      poseValue: {type: 'number', default: 2},
      poseAnimation: {type: 'string'},
      poseAnimationDuration: {type: 'number', default: 3}, // seconds
      poseMinWait: {type: 'number', default: 3}, // seconds
      poseMaxWait: {type: 'number', default: 6}, // seconds
        
      // Testing
      debug: {type: 'boolean', default: true},
    },
    init: function () {
      // Set up data stores
      this.posing = false
      
      // Give hitbox to subject
      this.el.setAttribute("ammo-body", {
        type: "static",
        mass: "5",
        collisionFilterGroup: 2,
        collisionFilterMask: 1,
      });
      this.el.setAttribute("ammo-shape", {
        type: "sphere",
        fit: "manual",
        sphereRadius: this.data.subjectHitboxRadius,
        offset: this.data.subjectHitboxOffset,
      });
      if(this.data.pose) {
        this.pose()
      }
    },
    update: function (oldData) {

    },
    tick: function () {

    },
    pose: function () {
      this.posing = true
      this.el.emit('pose') //emit a pose event to trigger an animation
      
      window.setTimeout(() => {
        this.posing = false
        if(this.data.pose) {
          window.setTimeout(() => {
            this.pose()
          }, this.randomBetween(this.data.poseMinWait * 1000, this.data.poseMaxWait * 1000))
        }
      }, this.data.poseAnimationDuration * 1000)
    },
    randomBetween: function(min, max) {
      return Math.random() * (max - min) + min;
    },
})