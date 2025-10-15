AFRAME.registerComponent('throwergame', {
    schema: {
        // Game Setup
        sceneID: {type: 'string', default: '#scene'},
        cameraID: {type: 'string', default: '#camera'},
        floorID: {type: 'string', default: '#floor'},
        backID: {type: 'string', default: '#back'},
        throwableGLTF: {type: 'string'},
        throwableScale: {type: 'string', default: '1 1 1'},

        // Throw Settings
        dragAccuracy: {type: 'number', default: 10},
        speedModifier: {type: 'number', default: 1.75},
        maxspeed: {type: 'number', default: 3.75},
      
        // Throwable Settings
        deleteOnMiss: {type: 'boolean', default: false},
        deleteOnCatch: {type: 'boolean', default: true},
      
        // Outputs
        hitEvent: {type: 'string', default: 'hit'},
        missEvent: {type: 'string', default: 'miss'},
        readyEvent: {type: 'string', default: 'ready'},
      
        // Settings
        enabled: {type: 'boolean', default: true},
        debug: {type: 'boolean', default: false},
        startOnLoad: {type: 'boolean', default: true}
    },
    init: function () {
        // Clean up any existing elements first
        this.cleanup()
        
        // States
        this.padtouched = false
        this.currentItem
        this.positionArray = []

        // Elements
        this.scene = document.querySelector(this.data.sceneID)
        this.camera = document.querySelector(this.data.cameraID)
        this.floor = document.querySelector(this.data.floorID)
        this.back = document.querySelector(this.data.backID)
        
        // Create Catchbox
        if(this.data.startOnLoad) {
          this.scene.addEventListener("loaded", function(e){
            this.el.setAttribute('visible', this.data.debug)
            this.el.setAttribute('geometry', {
                primitive: 'cylinder',
                radius: 0.35,
                height: 0.55,
            })
            this.el.setAttribute('ammo-body', {
                type: 'static',
                disableCollision: true,
                emitCollisionEvents: true,
            })
            this.el.setAttribute('ammo-shape', {
                type: 'cylinder',
            })
            this.el.classList.add('raycast')
          }.bind(this)); 
        } else {
          this.el.setAttribute('visible', this.data.debug)
          this.el.setAttribute('geometry', {
              primitive: 'cylinder',
              radius: 0.35,
              height: 0.55,
          })
          this.el.setAttribute('ammo-body', {
              type: 'static',
              disableCollision: true,
              emitCollisionEvents: true,
          })
          this.el.setAttribute('ammo-shape', {
              type: 'cylinder',
          })
          this.el.classList.add('raycast')
        }
        

        // Create dragpad
        this.dragpad = document.createElement('a-entity')
        this.dragpad.setAttribute('id', 'dragpad')
        this.dragpad.setAttribute('position', '0 -0.2 -0.5')
        this.dragpad.setAttribute('rotation', '-50 0 0')
        this.dragpad.setAttribute('scale', '0.2 0.1 0.2')
        this.dragpad.setAttribute('geometry', {
            primitive: 'box',
        })
        this.dragpad.setAttribute('material', {
            transparent: true,
            opacity: 0,
            color: 'white'
        })
        this.dragpad.setAttribute('visible', false)
        this.camera.append(this.dragpad)
        this.dragpad.classList.add('raycast')

        // Create hand selection indicator as 2D UI element
        this.handIndicator = document.createElement('div')
        this.handIndicator.id = 'hand-indicator'
        this.handIndicator.style.position = 'fixed'
        this.handIndicator.style.width = '60px'
        this.handIndicator.style.height = '60px'
        this.handIndicator.style.backgroundImage = 'url(assets/HandSelect.png)'
        this.handIndicator.style.backgroundSize = 'contain'
        this.handIndicator.style.backgroundRepeat = 'no-repeat'
        this.handIndicator.style.backgroundPosition = 'center'
        this.handIndicator.style.pointerEvents = 'none'
        this.handIndicator.style.zIndex = '1000'
        this.handIndicator.style.transition = 'all 1s ease-in-out'
        this.handIndicator.style.left = '50%'
        this.handIndicator.style.top = '75%'
        this.handIndicator.style.transform = 'translate(-50%, -50%)'
        document.body.appendChild(this.handIndicator)

        // Create "Drag to feed" text indicator
        this.dragText = document.createElement('div')
        this.dragText.id = 'drag-text'
        this.dragText.textContent = 'Drag to feed'
        this.dragText.style.position = 'fixed'
        this.dragText.style.left = '50%'
        this.dragText.style.top = '60%'
        this.dragText.style.transform = 'translate(-50%, -50%)'
        this.dragText.style.color = '#fff'
        this.dragText.style.fontSize = '18px'
        this.dragText.style.fontWeight = 'bold'
        this.dragText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)'
        this.dragText.style.pointerEvents = 'none'
        this.dragText.style.zIndex = '1001'
        this.dragText.style.transition = 'opacity 1s ease-in-out'
        this.dragText.style.opacity = '0'
        document.body.appendChild(this.dragText)

        // Start the animation loop
        this.animateHandIndicator()

        // Drag-Pad events
        this.dragpad.addEventListener("mousedown", function(){
          if(this.data.enabled) {
            this.positionArray = []
            this.padtouched = true
            this.el.emit(this.data.readyEvent)
            this.dragpad.setAttribute('scale', '0.6 1.2 0.1')
            
            // Hide hand indicator and text on first interaction
            if(this.handIndicator) {
              this.handIndicator.style.display = 'none'
            }
            if(this.dragText) {
              this.dragText.style.display = 'none'
            }
            
            this.currentItem = this.createItem()
          }
        }.bind(this));
        this.dragpad.addEventListener("mouseup", function(e) {
            if(this.padtouched) {
            this.padtouched = false
            this.launchItem(this.currentItem)
            this.dragpad.setAttribute('scale', '0.2 0.1 0.1')
            }
        }.bind(this));

        this.el.addEventListener("collidestart", function(e){
            if(!e.detail.targetEl.hitfloor && !e.detail.targetEl.hitTarget) {
              this.el.emit(this.data.hitEvent)
              e.detail.targetEl.hitTarget = true
              if(this.data.deleteOnCatch) {
                e.detail.targetEl?.parentNode.removeChild(e.detail.targetEl);
              }
            }
        }.bind(this));    
      
        this.floor.addEventListener("collidestart", function(e){
          if(!e.detail.targetEl.hitfloor && !e.detail.targetEl.hitTarget) {
            this.el.emit(this.data.missEvent)
            e.detail.targetEl.hitfloor = true
            if(this.data.deleteOnMiss) {
              e.detail.targetEl?.parentNode.removeChild(e.detail.targetEl);
            }
          }
        }.bind(this)); 
      
        this.back.addEventListener("collidestart", function(e){
          if(!e.detail.targetEl.hitfloor && !e.detail.targetEl.hitTarget) {
            this.el.emit(this.data.missEvent)
            e.detail.targetEl.hitfloor = true
            if(this.data.deleteOnMiss) {
              e.detail.targetEl?.parentNode.removeChild(e.detail.targetEl);
            }
          }
        }.bind(this));
    },

    animateHandIndicator: function() {
        if(this.handIndicator && this.handIndicator.style.display !== 'none') {
            // Start at bottom (75%) and show text once
            this.handIndicator.style.top = '75%'
            if(this.dragText.style.opacity === '0') {
                this.dragText.style.opacity = '1'
            }
            setTimeout(() => {
                if(this.handIndicator && this.handIndicator.style.display !== 'none') {
                    // Animate up only about 1/4 distance (to 65%)
                    this.handIndicator.style.top = '65%'
                    setTimeout(() => {
                        if(this.handIndicator && this.handIndicator.style.display !== 'none') {
                            // Instantly reset to start position (text stays visible)
                            this.handIndicator.style.top = '75%'
                            setTimeout(() => {
                                this.animateHandIndicator()
                            }, 1000)
                        }
                    }, 1000)
                }
            }, 1000)
        }
    },

    cleanup: function() {
        // Remove existing dragpad
        const existingDragpad = document.getElementById('dragpad')
        if (existingDragpad) {
            existingDragpad.remove()
        }
        
        // Remove existing hand indicator
        const existingHandIndicator = document.getElementById('hand-indicator')
        if (existingHandIndicator) {
            existingHandIndicator.remove()
        }
        
        // Remove existing drag text
        const existingDragText = document.getElementById('drag-text')
        if (existingDragText) {
            existingDragText.remove()
        }
    },

    remove: function() {
        this.cleanup()
    },

    update: function (oldData) {
        // Handle changes to throwableGLTF
        if (oldData.throwableGLTF !== this.data.throwableGLTF) {
            // Reset the component state
            this.padtouched = false
            this.currentItem = null
            this.positionArray = []
            
            // Re-enable if needed
            if (this.data.enabled) {
                this.el.setAttribute('visible', this.data.debug)
            }
        }
        
        // Handle enabled state changes
        if (oldData.enabled !== this.data.enabled) {
            this.el.setAttribute('visible', this.data.enabled && this.data.debug)
        }
    },
    tick: function () {
        if(this.padtouched) {
            if(this.scene.components["raycaster"].getIntersection(this.dragpad) === null) {
                this.padtouched = false
                this.launchItem(this.currentItem)
                this.dragpad.setAttribute('scale', '0.2 0.1 0.2')
            } else {
                const currentIntersection = this.scene.components["raycaster"].getIntersection(this.dragpad).point
            
                // Move current food under cursor      
                this.scene.object3D.attach(this.currentItem.object3D);
                this.currentItem.object3D.position.setX(currentIntersection.x)
                this.currentItem.object3D.position.setY(currentIntersection.y)
                this.currentItem.object3D.position.setZ(currentIntersection.z)
                
                // Record position & time
                this.positionArray.push({pos: currentIntersection, time: Date.now()})
            }
        }
    },
    createItem: function () {
      let item = document.createElement("a-entity");
      if(this.data.throwableGLTF) {
        item.setAttribute("gltf-model", this.data.throwableGLTF);
      } else {
        item.setAttribute("geometry", {
          primitive: "sphere",
          radius: 0.1
        });
      }
      item.setAttribute("scale", this.data.throwableScale);
      this.scene.appendChild(item);

      return item //pass item reference to whatever called the function
    },

    launchItem: function (item) {
        let accuracy
        if(this.positionArray?.length > 10) {
            accuracy = this.data.dragAccuracy
        } else {
            accuracy = this.positionArray.length
        }
          
        // calculate vector from start pos to end pos    
        let dir = new THREE.Vector3();
        dir.subVectors(this.positionArray[this.positionArray.length-1].pos, this.positionArray[this.positionArray.length-accuracy].pos).normalize();
        
        // calculate speed from position data
        const distance = Math.abs(this.positionArray[this.positionArray.length-1].pos.distanceTo(this.positionArray[this.positionArray.length-accuracy].pos))
        const time = this.positionArray[this.positionArray.length-1].time - this.positionArray[this.positionArray.length-accuracy].time
        let speed = (distance / time) * 1000
        if(speed >= this.data.maxspeed) {
          speed = this.data.maxspeed
        }
      
        // apply speed as force when body loaded
        item.addEventListener("body-loaded", function(e){
          let velocity = new Ammo.btVector3();
          velocity.setValue(
            dir.x * speed * this.data.speedModifier,
            dir.y * speed * this.data.speedModifier,
            dir.z * speed * this.data.speedModifier
          );
          item.components["ammo-body"].body.setLinearVelocity(velocity);
        }.bind(this));
      
        // apply physics
        item.setAttribute("ammo-body", {
          type: "dynamic",
          mass: "5",
          emitCollisionEvents: true,
        });
        item.setAttribute("ammo-shape", {
          type: "box",
        });
        
        // start despawn timer
        setTimeout(() => {
          if (item.parentNode !== null) {
            item?.parentNode.removeChild(item);
          }
        }, 1500);
    },
})