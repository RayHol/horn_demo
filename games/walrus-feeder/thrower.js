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
        this.dragpad.setAttribute('position', '0 -0.25 -0.5')
        this.dragpad.setAttribute('rotation', '-50 0 0')
        this.dragpad.setAttribute('scale', '0.2 0.2 0.1')
        this.dragpad.setAttribute('geometry', {
            primitive: 'box',
        })
        this.dragpad.setAttribute('material', {
            transparent: true,
            opacity: this.data.debug?0.5:0,
        })
        this.dragpad.setAttribute('visible', this.data.debug)
        this.camera.append(this.dragpad)
        this.dragpad.classList.add('raycast')

        // Drag-Pad events
        this.dragpad.addEventListener("mousedown", function(){
          if(this.data.enabled) {
            this.positionArray = []
            this.padtouched = true
            this.el.emit(this.data.readyEvent)
            this.dragpad.setAttribute('scale', '0.6 1.2 0.1')
            
            this.currentItem = this.createItem()
          }
        }.bind(this));
        this.dragpad.addEventListener("mouseup", function(e) {
            if(this.padtouched) {
            this.padtouched = false
            this.launchItem(this.currentItem)
            this.dragpad.setAttribute('scale', '0.2 0.2 0.1')
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
    update: function (oldData) {

    },
    tick: function () {
        if(this.padtouched) {
            if(this.scene.components["raycaster"].getIntersection(this.dragpad) === null) {
                this.padtouched = false
                this.launchItem(this.currentItem)
                this.dragpad.setAttribute('scale', '0.2 0.2 0.1')
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