function randomBetween(min, max) {
    return Math.random() * (max - min) + min
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

AFRAME.registerComponent('hidermat', {
    init: function () {
        this.blendMode = THREE.SubtractiveBlending
        this.el.addEventListener('object3dset', this.applyHider.bind(this))
        this.el.addEventListener('loaded', this.applyHider.bind(this))
    },
    applyHider: function () {
        const mesh = this.el.getObject3D('mesh')
        const blendmode = this.blendMode

        if (!mesh) return

        mesh.traverse(function (node) {
        if (node.material) {
            node.material.blending = blendmode
            node.material.colorWrite = false
            node.material.needsUpdate = true
        }
        });
    }
});