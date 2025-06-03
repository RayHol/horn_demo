AFRAME.registerComponent("animation-system", {
	schema: {
		button: {
			type: "string",
			default: "",
		},
	},
	init() {
		this.el.addEventListener("model-loaded", () => {
			this.animationList = this.el.object3D.children[0].animations;
			console.log(this.animationList)
			this.el.setAttribute("animation-mixer", {
				clip: "Animation",
				clampWhenFinished: false,
				loop: "repeat",
				repetitions: "infinity"
			});
		});
		// document
		// 	.getElementById(this.data.button)
		// 	.addEventListener("click", () => {
		// 	this.el.setAttribute("animation-mixer", {
		// 		clip: this.animationList[this.animationIndex].name,
		// 		clampWhenFinished: true,
		// 		loop: 'once',
		// 		repetitions: 1,
		// 		timeScale: 1,
		// 		startFrame: 0
		// 	});
		// 	this.animationIndex++;
		// 	if (this.animationIndex === this.animationList.length) {
		// 		this.animationIndex = 0;
		// 	}
		// });
	},
});

AFRAME.registerComponent("ar-place-once", {
	init() {
	this.el.addEventListener("ar-hit-test-select", () => {
		this.el.setAttribute("ar-hit-test", {
		enabled: false,
		});
		document.getElementById('hint').innerHTML = 'Throw a seed into the soil'
	});
	},
});

AFRAME.registerComponent("show-on-place-ar", {
	schema: {
		// parent: {
		// 	type: "string",
		// 	default: "",
		// },
		htmlID: {
			type: "string",
			default: "",
		},
	},
	init() {
		// const parent = document.querySelector(this.data.parent)
		this.el.sceneEl.addEventListener("ar-hit-test-select", () => {
			// this.el.setAttribute("visible", "true")
			// this.el.object3D.position.x = parent.object3D.position.x
			// this.el.object3D.position.y = parent.object3D.position.y
			// this.el.object3D.position.z = parent.object3D.position.z
			if(this.data.htmlID){
				document.querySelector(this.data.htmlID).style.display = "block"
			}
			this.el.setAttribute("visible", true)
		})
		// console.log(document.querySelector(this.data.htmlID))
		// document.querySelector(this.data.htmlID).style.display = "block"
	},
});

AFRAME.registerComponent("preview-spin", {
	init() {
	this.enabled = true
	this.el.object3D.position.set(0, 0, -3)
	this.el.sceneEl.addEventListener("ar-hit-test-start", () => {
		this.enabled = false
		this.el.object3D.rotation.set(0, 0, 0)
		this.el.object3D.position.set(0, 0, 0)
	})
	},
	tick: function() {
	if(this.enabled){
		this.el.object3D.rotateY(0.1 * Math.PI/180)
	}
	}
});

AFRAME.registerComponent('no-culling', {
  schema: {
    default: ''
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this))
  },
  update() {
    this.el.object3D.traverse(function (o) {
      o.frustumCulled = false
    }.bind(this))
  }
})

AFRAME.registerComponent("button-enter-ar", {
	schema: {
		buttonID: {
			type: "string",
			default: "",
		},
	},
  init() {
		const button = document.querySelector(this.data.buttonID)
    button.addEventListener("click", evt => {
			var soundtrack = document.querySelector("#soundtrack")
			soundtrack.components.sound.playSound();
      try {
        this.el.sceneEl.enterAR();
			button.style.display = "none"
			document.getElementById('help').style.display = "none"
      } catch (error) {
        alert(error)
      }
    })
  }
})