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
            // Get the original scale (default is 0.6 0.6 0.6)
            let originalScale = this.el.getAttribute('scale');
            let scaleX, scaleY, scaleZ;
            
            if (typeof originalScale === 'string') {
              const scaleArray = originalScale.split(' ');
              scaleX = parseFloat(scaleArray[0]) || 0.6;
              scaleY = parseFloat(scaleArray[1]) || 0.6;
              scaleZ = parseFloat(scaleArray[2]) || 0.6;
            } else if (originalScale && typeof originalScale === 'object') {
              scaleX = originalScale.x || 0.6;
              scaleY = originalScale.y || 0.6;
              scaleZ = originalScale.z || 0.6;
            } else {
              scaleX = scaleY = scaleZ = 0.6;
            }
            
            // Set initial scale to 0
            this.el.setAttribute('scale', '0 0 0');
            this.el.setAttribute('visible', true)
            this.el.setAttribute('position', e.detail.intersection.point.x + ' ' + e.detail.intersection.point.y + ' ' + e.detail.intersection.point.z + ' ' )
            this.el.object3D.lookAt(this.camera.object3D.position.x, 0.5, this.camera.object3D.position.z)
            
            // Calculate 110% scale
            const scale110X = scaleX * 1.1;
            const scale110Y = scaleY * 1.1;
            const scale110Z = scaleZ * 1.1;
            
            // First animation: grow from 0 to 110%
            this.el.setAttribute('animation__grow', {
              property: 'scale',
              to: scale110X + ' ' + scale110Y + ' ' + scale110Z,
              dur: 400,
              easing: 'easeOutCubic'
            });
            
            // Second animation: shrink from 110% to 100%
            setTimeout(() => {
              this.el.setAttribute('animation__shrink', {
                property: 'scale',
                to: scaleX + ' ' + scaleY + ' ' + scaleZ,
                dur: 300,
                easing: 'easeInCubic'
              });
            }, 400);
            
            this.el.emit(this.data.placeEvent)
          }
        }.bind(this));
    },
    update: function (oldData) {

    }
})