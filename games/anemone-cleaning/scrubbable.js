AFRAME.registerComponent('scrubbable', {
    schema: {
        // Game Setup
        sceneID: {type: 'string', default: '#scene'},
        cameraID: {type: 'string', default: '#camera'},
        floorID: {type: 'string', default: '#floor'},
      
        // Scrubbable Settings
        deleteOnFinished: {type: 'boolean', default: true},
      
        // Outputs
        milestone1Event: {type: 'string', default: 'milestone1'},
        milestone1Value: {type: 'number', default: 50},
        milestone2Event: {type: 'string', default: 'milestone2'},
        milestone2Value: {type: 'number', default: 100},
        milestone3Event: {type: 'string', default: 'milestone3'},
        milestone3Value: {type: 'number', default: 150},
        finishedEvent: {type: 'string', default: 'finished'},
        finishedValue: {type: 'number', default: 200},
      
        // Settings
        enabled: {type: 'boolean', default: true},
        debug: {type: 'boolean', default: false},
    },
    init: function () {
      // States
      this.screentouched = false
      this.positionArray = []
      this.scrubbedTicks = 0
      this.milestone = 0
      
      // Elements
      this.scene = document.querySelector(this.data.sceneID)
      this.camera = document.querySelector(this.data.cameraID)
      this.floor = document.querySelector(this.data.floorID)
      
      // Add raycast check class
      this.el.classList.add('raycast')
      
      // Touch Listeners
      this.scene.addEventListener("mousedown", function(){
          if(this.data.enabled) {
            this.positionArray = []
            this.screentouched = true
          }
        }.bind(this));
        this.scene.addEventListener("mouseup", function(e) {
            if(this.screentouched) {
              this.screentouched = false
            }
        }.bind(this));
    },
    update: function (oldData) {

    },
    tick: function () {
        if(this.screentouched) {
            if(this.scene.components["raycaster"].getIntersection(this.el) === null) {
            } else {
              const currentIntersection = this.scene.components["raycaster"].getIntersection(this.el).point
              // Record position & time
              this.positionArray.push({pos: currentIntersection, time: Date.now()})
              // Calculate speed of movement using previous position
              if(this.positionArray.length > 1) {
                const distance = Math.abs(this.positionArray[this.positionArray.length-1].pos.distanceTo(this.positionArray[this.positionArray.length-2].pos))
                const time = this.positionArray[this.positionArray.length-1].time - this.positionArray[this.positionArray.length-2].time
                let speed = (distance / time) * 1000
                if(speed > 0) {
                  this.scrubbedTicks++
                  
                  // Check milestone events
                  switch(this.milestone) {
                    case 0:
                      if(this.scrubbedTicks >= this.data.milestone1Value) {
                        this.el.emit(this.data.milestone1Event)
                        console.log(this.data.milestone1Event)
                        this.milestone++
                      }
                      break;
                    case 1:
                      if(this.scrubbedTicks >= this.data.milestone2Value) {
                        this.el.emit(this.data.milestone2Event)
                        console.log(this.data.milestone2Event)
                        this.milestone++
                      }
                      break;
                    case 2:
                      if(this.scrubbedTicks >= this.data.milestone3Value) {
                        this.el.emit(this.data.milestone3Event)
                        console.log(this.data.milestone3Event)
                        this.milestone++
                      }
                      break;
                    case 3:
                      if(this.scrubbedTicks >= this.data.finishedValue) {
                        this.el.emit(this.data.finishedEvent)
                        console.log(this.data.finishedEvent)
                        this.milestone++
                      }
                      break;
                    default:
                      // code block
                  }
                }
              }
            }
        }
    },
})