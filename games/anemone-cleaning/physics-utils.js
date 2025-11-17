AFRAME.registerComponent("ammo-gltf-mesh", {
  init() {
    this.el.addEventListener("model-loaded", () => {
      this.el.setAttribute("ammo-shape", {
        type: "mesh",
        margin: 0.02
      });
    })
  }
})

AFRAME.registerComponent("ammo-gltf-hull", {
  schema: {
    offset: {default: "0 0 0"},
  },
  init() {
    this.el.addEventListener("model-loaded", () => {
      this.el.setAttribute("ammo-shape", {
        type: "hacd",
        offset: this.data.offset
      });
    })
  }
})

AFRAME.registerComponent("no-collide-vr", {
  init() {
    this.el.sceneEl.addEventListener("enter-vr", () => {
      this.el.setAttribute('ammo-body', {
        disableCollision: true
      })
    })
    this.el.sceneEl.addEventListener("exit-vr", () => {
      this.el.setAttribute('ammo-body', {
        disableCollision: false
      })
    })
  }
})

AFRAME.registerComponent("no-collide-pc", {
  init() {
    this.el.sceneEl.addEventListener("enter-vr", () => {
      this.el.setAttribute('ammo-body', {
        disableCollision: false
      })
    })
    this.el.sceneEl.addEventListener("exit-vr", () => {
      this.el.setAttribute('ammo-body', {
        disableCollision: true
      })
    })
  }
})

AFRAME.registerComponent("bounce", {
  schema: {
    restitution: {default: 0.75},
  },
  init() {
    if(this.el.body){
      this.el.body.setRestitution(this.data.restitution)
    } else {
      this.el.addEventListener("body-loaded", () => {
        this.el.body.setRestitution(this.data.restitution)
      })
    }
  }
})

AFRAME.registerComponent("grip", {
  schema: {
    friction: {default: 0.75},
  },
  init() {
    if(this.el.body){
      this.el.body.setFriction(this.data.friction)
    } else {
      this.el.addEventListener("body-loaded", () => {
        this.el.body.setFriction(this.data.friction)
      })
    }
  }
})

AFRAME.registerComponent("sticky", {
  init() {
    this.el.setAttribute('ammo-body', {
      emitCollisionEvents: true
    })
    this.el.addEventListener("collidestart", (e) => {
      if(this.el.getAttribute('ammo-constraint')) {
        return;
      }
      this.zeroSpeed = new Ammo.btVector3(0, 0, 0)
      this.el.components["ammo-body"].body.setLinearVelocity(this.zeroSpeed)
      this.el.setAttribute('ammo-constraint', {
        type: 'lock',
        target: e.detail.targetEl
      })
      if(e.detail.targetEl.getAttribute('ammo-body').type === 'static'){
        this.el.setAttribute('ammo-body', {
          type: 'static'
        })
      }
    })
  }
})

AFRAME.registerComponent("temporary", {
  schema: {
    lifespan: {default: 10}
  },
  init() {
    const lifespanTicks = this.data.lifespan * 1000
    setTimeout(() => {  
      this.el.setAttribute('ammo-body', {
        disableCollision: true
      })
      this.el.object3D.visible = false
    }, lifespanTicks)
  }
})