AFRAME.registerComponent("throw-seed", {
  schema: {
    buttonID: {
      type: "string",
      default: "",
    },
    modelID: {
      type: "string",
      default: "",
    },
    soilID: {
      type: "string",
      default: "",
    },
    power: {
      default: 10,
    },
    enabled: {
      default: true,
    },
  },
  init() {
    const button = document.querySelector(this.data.buttonID);
    let planted = false;
    button.addEventListener("click", () => {
      if (this.data.enabled) {
        let newSeed = document.createElement("a-entity");
        newSeed.setAttribute("gltf-model", this.data.modelID);
        newSeed.setAttribute("position", {
          x: this.el.object3D.position.x,
          y: this.el.object3D.position.y - 0.1,
          z: this.el.object3D.position.z,
        });
        newSeed.setAttribute("rotation", { x: 0, y: 45, z: 0 });
        newSeed.setAttribute("scale", "4 4 4");
        newSeed.classList.add("seed");
        newSeed.setAttribute("ammo-body", {
          type: "dynamic",
          mass: "5",
        });
        newSeed.setAttribute("ammo-shape", {
          type: "box",
          fit: "manual",
          halfExtents: "0.02 0.035 0.02",
          offset: "0.01 0 0",
        });
        this.el.sceneEl.appendChild(newSeed);

        newSeed.addEventListener("body-loaded", () => {
          var velocity = new Ammo.btVector3();
          const projectileWorldDirection = new THREE.Vector3();
          this.el.object3D.getWorldDirection(projectileWorldDirection);
          velocity.setValue(
            projectileWorldDirection.x * -1 * this.data.power,
            projectileWorldDirection.y * -1 * this.data.power,
            projectileWorldDirection.z * -1 * this.data.power
          );
          var axis = new THREE.Vector3(1, 0, 0);
          var angle = THREE.MathUtils.degToRad(45);
          projectileWorldDirection.applyAxisAngle(axis, angle);
          newSeed.components["ammo-body"].body.setLinearVelocity(velocity);
        });

        setTimeout(() => {
          if (newSeed.parentNode !== null) {
            newSeed?.parentNode.removeChild(newSeed);
          }
        }, 1500);
      }
    });
  },
});

AFRAME.registerComponent("watercan", {
  schema: {
    buttonID: {
      type: "string",
      default: "",
    },
    wateringCanID: {
      type: "string",
      default: "",
    },
    raycasterID: {
      type: "string",
      default: "",
    },
    enabled: {
      default: true,
    },
  },
  init() {
    const button = document.querySelector(this.data.buttonID);
    const raycaster = document.querySelector(this.data.raycasterID);
    const watercan = document.querySelector(this.data.wateringCanID);
    const scene = document.querySelector("a-scene");
    const pocket = document.getElementById("wateringcancontainer");
    const bee = document.getElementById("bee-holder");
    button.addEventListener("click", () => {
      if (this.data.enabled && watercan.getAttribute("watering") == "false") {
        let target = raycaster.components.raycaster.intersectedEls[0];
        if (
          target &&
          target.getAttribute("planted") == "true" &&
          target.getAttribute("watered") != "2"
        ) {
          watercan.setAttribute("watering", true);
          scene.object3D.attach(watercan.object3D);
          let worldPosition = new THREE.Vector3();
          target.object3D.getWorldPosition(worldPosition);
          watercan.object3D.position.setX(worldPosition.x + 0.15);
          watercan.object3D.position.setZ(worldPosition.z + 0.15);
          watercan.object3D.position.setY(0.5);
          watercan.emit("water");
          setTimeout(() => {
            watercan.emit("stopwater");
          }, 1800);
          setTimeout(() => {
            target.setAttribute(
              "watered",
              Number(target.getAttribute("watered")) + 1
            );
            console.log(target.getAttribute("watered"));
            if (target.getAttribute("watered") == 1) {
              target.querySelector(".shoot").emit("water1");
              document.getElementById("hint").innerHTML =
                "Nice! It just needs a bit more water.";
            } else if (target.getAttribute("watered") == 2) {
              target.querySelector(".shoot").emit("water2");
              target.querySelector(".sunflower").emit("water2");
              target
                .querySelector(".sunflower")
                .setAttribute("visible", "true");
              if (flowersgrown < 3) {
                document.getElementById("hint").innerHTML =
                  "Congrats! You grew a sunflower. Grow 3 to try and attract a bee";
              } else {
              }
              flowersgrown++;
              if (flowersgrown == 3) {
                setTimeout(() => {
                  bee.object3D.position.setX(worldPosition.x);
                  bee.object3D.position.setZ(worldPosition.z);
                  bee.object3D.position.setY(0.5);
                  bee.emit("enter");
                  document.getElementById("hint").innerHTML =
                    "Look, a bee showed up!";

                  setTimeout(() => {
                    openCongratulations();
                  }, 8500);
                }, 1000);
              }
            }
            watercan.setAttribute("watering", false);
            pocket.object3D.attach(watercan.object3D);
            watercan.object3D.position.setX(0);
            watercan.object3D.position.setZ(0);
            watercan.object3D.position.setY(0);
          }, 3000);
        }
      }
    });
  },
});

AFRAME.registerComponent("shovel", {
  schema: {
    buttonID: {
      type: "string",
      default: "",
    },
    shovelID: {
      type: "string",
      default: "",
    },
    raycasterID: {
      type: "string",
      default: "",
    },
    enabled: {
      default: true,
    },
  },
  init() {
    const button = document.querySelector(this.data.buttonID);
    const raycaster = document.querySelector(this.data.raycasterID);
    const shovel = document.querySelector(this.data.shovelID);
    const scene = document.querySelector("a-scene");
    const pocket = document.getElementById("shovelcontainer");
    shovel.digging = false;
    button.addEventListener("click", () => {
      if (
        this.data.enabled &&
        raycaster.components.raycaster.intersections !== undefined &&
        raycaster.components.raycaster.intersections.length > 0 &&
        shovel.digging == false
      ) {
        shovel.digging = true;
        scene.object3D.attach(shovel.object3D);
        shovel.object3D.position.setX(
          raycaster.components.raycaster.intersections[0].point.x
        );
        shovel.object3D.position.setZ(
          raycaster.components.raycaster.intersections[0].point.z
        );
        shovel.object3D.position.setY(0.15);

        shovel.emit("dig");

        let dirt = spawnDirt(
          raycaster.components.raycaster.intersections[0].point.x +
            " " +
            raycaster.components.raycaster.intersections[0].point.y +
            " " +
            raycaster.components.raycaster.intersections[0].point.z
        );

        setTimeout(() => {
          dirt.emit("dig1");
        }, 500);

        setTimeout(() => {
          dirt.emit("dig2");
        }, 2500);

        setTimeout(() => {
          shovel.digging = false;
          pocket.object3D.attach(shovel.object3D);
          shovel.object3D.position.setX(0);
          shovel.object3D.position.setZ(0);
          shovel.object3D.position.setY(0);
          shovel.setAttribute("rotation", "20 90 0");
          dirt.setAttribute("ammo-shape", {
            type: "sphere",
            fit: "manual",
            sphereRadius: "0.15",
          });
          document.getElementById("hint").innerHTML =
            "Great, you dug a hole. Now you can plant a seed! Select the bag of seeds and tap to try and throw one into the dirt.";
        }, 4000);
      }
    });
  },
});

function spawnDirt(position) {
  let dirt = document.createElement("a-entity");
  dirt.classList.add("waterable");
  dirt.classList.add("raycast");
  dirt.setAttribute("position", position);
  dirt.setAttribute("scale", "0 0 0");
  dirt.setAttribute("gltf-model", "#soil-glb");
  dirt.setAttribute("ammo-body", {
    type: "kinematic",
    emitCollisionEvents: "true",
    disableCollision: "true",
  });
  dirt.setAttribute("animation__dirtgrow1", {
    property: "scale",
    from: "0 0 0",
    to: "1.5 1.5 1.5",
    dur: "1000",
    startEvents: "dig1",
  });
  dirt.setAttribute("animation__dirtgrow2", {
    property: "scale",
    from: "1.5 1.5 1.5",
    to: "3 3 3",
    dur: "1000",
    startEvents: "dig2",
  });
  sceneEl.append(dirt);

  let shoot = document.createElement("a-entity");
  shoot.classList.add("shoot");
  shoot.setAttribute("geometry", {
    primitive: "cylinder",
    radius: "0.005",
    height: "0.04",
  });
  shoot.setAttribute("material", "color: green;");
  shoot.setAttribute("visible", "false");
  shoot.setAttribute("animation__planted", {
    property: "scale",
    from: "0 0 0",
    to: "0.4 0.4 0.4",
    dur: "1000",
    startEvents: "planted",
  });
  shoot.setAttribute("animation__watered1", {
    property: "scale",
    from: "0.4 0.4 0.4",
    to: "0.8 0.8 0.8",
    dur: "1000",
    startEvents: "water1",
  });
  shoot.setAttribute("animation__watered2", {
    property: "scale",
    from: "0.8 0.8 0.8",
    to: "0 0 0",
    dur: "1000",
    delay: "300",
    startEvents: "water2",
  });
  dirt.append(shoot);

  let sunflower = document.createElement("a-entity");
  sunflower.classList.add("sunflower");
  sunflower.setAttribute("gltf-model", "#sunflower-glb");
  sunflower.setAttribute("rotate-to-follow", {
    target: "#camera",
  });
  sunflower.setAttribute("visible", "false");
  sunflower.setAttribute("animation__watered", {
    property: "scale",
    from: "0 0 0",
    to: "0.8 0.8 0.8",
    dur: "3000",
    startEvents: "water2",
  });
  dirt.append(sunflower);

  dirt.addEventListener("collidestart", (e) => {
    if (dirt.planted != true && e.detail.targetEl.classList.contains("seed")) {
      dirt.planted = true;
      dirt.setAttribute("planted", true);
      dirt.querySelector(".shoot").emit("planted");
      dirt.querySelector(".shoot").setAttribute("visible", "true");
      document.getElementById("hint").innerHTML =
        "You planted a seed, now it needs water. Select the watering can, aim the circle at the seedling, and tap to water it.";
      setTimeout(() => {
        e.detail.targetEl.parentNode.removeChild(e.detail.targetEl);
      }, 50);
    }
  });

  return dirt;
}
