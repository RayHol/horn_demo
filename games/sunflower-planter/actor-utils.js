AFRAME.registerComponent("rotate-to-follow", {
	schema: {
    target: {
      type: 'string'
    },
    speed: {
      default: 0.1
    },
    enabled: {
      default: true
    }
  },
  tick: function () {
    if(this.data.enabled){
      // target position
      const targetPosition = new THREE.Vector3()
      this.targetEl.object3D.getWorldPosition(targetPosition)
      // quaternion a
      const currentQuaternion = new THREE.Quaternion() 
      this.el.object3D.getWorldQuaternion(currentQuaternion)
      // quaternion b
      this.el.object3D.lookAt(targetPosition.x, 0.2, targetPosition.z)
      const newQuaternion = new THREE.Quaternion() 
      this.el.object3D.getWorldQuaternion(newQuaternion)
      // slerp quaternion
      currentQuaternion.slerp(newQuaternion, this.data.speed)
      this.el.object3D.setRotationFromQuaternion(currentQuaternion)
    }
  },
  update() {
    this.targetEl = document.querySelector(this.data.target)
  },
	init() {
    this.targetEl = document.querySelector(this.data.target)
	}
})