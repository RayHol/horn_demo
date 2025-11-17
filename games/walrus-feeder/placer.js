AFRAME.registerComponent('ar-place', {
    schema: {
        // Game Setup
        sceneID: {type: 'string', default: '#scene'},
        cameraID: {type: 'string', default: '#camera'},
        floorID: {type: 'string', default: '#floor'},
      
        // Events
        placeEvent: {type: 'string', default: 'placed'},
      
        // Settings
        enabled: {type: 'boolean', default: true},
        debug: {type: 'boolean', default: false},
    },
    init: function () {
        // States
        this.placed = false

        // Elements
        this.scene = document.querySelector(this.data.sceneID)
        this.camera = document.querySelector(this.data.cameraID)
        this.floor = document.querySelector(this.data.floorID)
      
        this.el.setAttribute('visible', false)
        
        this.floor.addEventListener("click", function(e){
          if(this.data.enabled) {
            this.el.setAttribute('visible', true)
            this.el.setAttribute('position', e.detail.intersection.point.x + ' ' + e.detail.intersection.point.y + ' ' + e.detail.intersection.point.z + ' ' )
            this.el.object3D.lookAt(this.camera.object3D.position.x, 0.5, this.camera.object3D.position.z)
            this.el.emit(this.data.placeEvent)
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
})