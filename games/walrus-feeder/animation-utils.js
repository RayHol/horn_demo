AFRAME.registerComponent("animation-events", {
  schema: {
    events: {default: ['event']},
    animations: {default: ['animations']},
    loops: {default: ['once']},
    clamps: {default: [false]},
    crossfade: {default: 0.15}
  },
  init() {
    this.data.events.forEach((event, index) => {
      this.el.addEventListener(event, function(e){
        // Play animation
        this.el.removeAttribute('animation-mixer')
        this.el.setAttribute('animation-mixer', {
					clip: this.data.animations[index],
					loop: this.data.loops[index],
					timeScale: 1,
          crossFadeDuration: this.data.crossfade,
          clampWhenFinished: this.data.clamps[index],
          startAt: 0
				})
      }.bind(this))
    }, this)
  }
})