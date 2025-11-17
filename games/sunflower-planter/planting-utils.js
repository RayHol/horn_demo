AFRAME.registerComponent("shovel", {
  init() {
    const sceneEl=document.getElementById("scene");
    const camera = document.getElementById("camera");
    const shovel = document.getElementById("shovel");
    const shovelPocket = document.getElementById("shovelcontainer");
    
    document.getElementById("floor").addEventListener("click", (e) => {
      if(window.currentMode === 2) {
        const hit = e.detail.intersection.object.el.id
        console.log(hit)
        const intersection = e.detail.intersection.point

        if(intersection && !shovel.digging && hit === "floor") {
          shovel.digging = true;
          sceneEl.object3D.attach(shovel.object3D);
          shovel.object3D.position.setX(
            intersection.x
          );
          shovel.object3D.position.setZ(
            intersection.z
          );
          shovel.object3D.position.setY(0.35);

          shovel.emit("dig");
          
          // Play digging sound
          if (window.AudioManager) {
            window.AudioManager.playSound('dig').catch(error => {
              console.warn('Failed to play dig sound:', error);
            });
          }

          let dirt = spawnDirt(
            intersection.x +
              " " +
            intersection.y +
            " " +
            intersection.z
          );

          setTimeout(() => {
            dirt.emit("dig1");
          }, 500);

          setTimeout(() => {
            // Play second digging sound just before second dirt animation
            if (window.AudioManager) {
              window.AudioManager.playSound('digSecond').catch(error => {
                console.warn('Failed to play second dig sound:', error);
              });
            }
            dirt.emit("dig2");
          }, 2500);

          setTimeout(() => {
            shovel.digging = false;
            shovelPocket.object3D.attach(shovel.object3D);
            shovel.object3D.position.setX(0);
            shovel.object3D.position.setZ(0);
            shovel.object3D.position.setY(0);
            shovel.setAttribute("rotation", "0 160 20");
            dirt.setAttribute("ammo-shape", {
              type: "sphere",
              fit: "manual",
              sphereRadius: "0.15",
            });
            document.getElementById("hint").innerHTML =
              "Great, you dug a hole. Now you can plant a seed! Select the bag of seeds and swipe from it to try and throw one into the dirt.";
            document.getElementById("seedButton").classList.add('pulse')
          }, 4000);
        }
      }
    });
  },
});

AFRAME.registerComponent("seedpacket", {
    schema: {
      // Game
      sceneID: {type: 'string', default: '#scene'},
      cameraID: {type: 'string', default: '#camera'},

      // Settings
      dragAccuracy: {type: 'number', default: 10},
      speedModifier: {type: 'number', default: 1.75},
      maxspeed: {type: 'number', default: 3.75},
      enabled: {type: 'boolean', default: false},

      // Testing
      debug: {type: 'boolean', default: false},
  },
  init() {
    const sceneEl = document.getElementById("scene");
    this.scene = document.getElementById("scene");
    const camera = document.getElementById("camera");
    const seedpacket = document.getElementById("seedpacket");
    const seedPocket = document.getElementById("seedpacketcontainer");
    
    // States
    this.padtouched = false
    this.currentItem = null
    this.positionArray = []
    
    // Create dragpad
    this.dragpad = document.createElement('a-entity')
    this.dragpad.setAttribute('id', 'dragpad')
    this.dragpad.setAttribute('position', '0 -0.15 -0.5')
    this.dragpad.setAttribute('rotation', '-50 0 0')
    this.dragpad.setAttribute('scale', '0.2 0.2 0.1')
    this.dragpad.setAttribute('geometry', {
        primitive: 'box',
    })
    this.dragpad.setAttribute('material', {
        transparent: true,
        opacity: this.data.debug?0.5:0,
    })
    this.dragpad.setAttribute('visible', this.data.debug?true:false)
    camera.append(this.dragpad)
    // this.dragpad.classList.add('raycast')

    // Drag-Pad events
    this.dragpad.addEventListener("mousedown", function(){
      if(this.data.enabled) {
        this.positionArray = []
        this.padtouched = true
        this.dragpad.setAttribute('scale', '0.6 1.2 0.1')

        this.currentItem = this.createItem()
      }
    }.bind(this));
    this.dragpad.addEventListener("mouseup", function(e) {
        if(this.padtouched && this.data.enabled) {
        this.padtouched = false
        this.launchItem(this.currentItem)
        this.dragpad.setAttribute('scale', '0.2 0.2 0.1')
        }
    }.bind(this));
    
//     document.getElementById("seedpacket").addEventListener("click", (e) => {
//       if(window.currentMode === 0) {
//         let newSeed = document.createElement("a-entity");
//         newSeed.setAttribute("gltf-model", "#seed-glb");
//         newSeed.setAttribute("position", {
//           x: camera.object3D.position.x,
//           y: camera.object3D.position.y - 0.1,
//           z: camera.object3D.position.z,
//         });
//         newSeed.setAttribute("rotation", { x: 0, y: 45, z: 0 });
//         newSeed.setAttribute("scale", "4 4 4");
//         newSeed.classList.add("seed");
//         newSeed.setAttribute("ammo-body", {
//           type: "dynamic",
//           mass: "5",
//         });
//         newSeed.setAttribute("ammo-shape", {
//           type: "box",
//           fit: "manual",
//           halfExtents: "0.02 0.035 0.02",
//           offset: "0.01 0 0",
//         });
//         sceneEl.appendChild(newSeed);

//         newSeed.addEventListener("body-loaded", () => {
//           var velocity = new Ammo.btVector3();
//           const projectileWorldDirection = new THREE.Vector3();
//           camera.object3D.getWorldDirection(projectileWorldDirection);
//           velocity.setValue(
//             projectileWorldDirection.x * -1 * 6,
//             projectileWorldDirection.y * -1 * 6,
//             projectileWorldDirection.z * -1 * 6
//           );
//           var axis = new THREE.Vector3(1, 0, 0);
//           var angle = THREE.MathUtils.degToRad(45);
//           projectileWorldDirection.applyAxisAngle(axis, angle);
//           newSeed.components["ammo-body"].body.setLinearVelocity(velocity);
          
//           seedpacket.emit('squeeze')
//         });

//         setTimeout(() => {
//           if (newSeed.parentNode !== null) {
//             newSeed?.parentNode.removeChild(newSeed);
//           }
//         }, 1500);
//       }
//     });
  },
  tick: function () {
    if(this.padtouched && this.data.enabled) {
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
        console.log(this.currentItem.object3D.position)

        // Record position & time
        this.positionArray.push({pos: currentIntersection, time: Date.now()})
      }
    }
  },
  createItem: function () {
    let item = document.createElement("a-entity");
    item.setAttribute("rotation", { x: 130, y: 45, z: 20 });
    item.setAttribute("scale", "4 4 4");
    item.classList.add("seed");
    item.setAttribute("gltf-model", "#seed-glb");
    this.scene.appendChild(item);
    
    console.log(item)

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
    
    // Play throwing whoosh sound
    if (window.AudioManager) {
      window.AudioManager.playSound('throwWhoosh').catch(error => {
        console.warn('Failed to play throw whoosh sound:', error);
      });
    }

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
    });
    item.setAttribute("ammo-shape", {
      type: "box",
      fit: "manual",
      halfExtents: "0.02 0.035 0.02",
      offset: "0.01 0 0",
    });

    // start despawn timer
    setTimeout(() => {
      if (item.parentNode !== null) {
        item?.parentNode.removeChild(item);
      }
    }, 1500);
  },
});

function spawnDirt(position) {
  const sceneEl=document.getElementById("scene");
  const camera = document.getElementById("camera");
  const seedPocket = document.getElementById("wateringcancontainer");
  const watercan = document.getElementById("wateringcan");
  const waterpour = watercan.querySelector("#waterpour");
  const scene = document.querySelector("a-scene");
  const waterpocket = document.getElementById("wateringcancontainer");
  const bee1 = document.getElementById("bee-holder1");
  const bee2 = document.getElementById("bee-holder2");
  const bee3 = document.getElementById("bee-holder3");
  
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
  shoot.setAttribute("scale", "0 0 0");
  shoot.setAttribute("gltf-model", "#seedling-glb");
  shoot.setAttribute("visible", "false");
  shoot.setAttribute("animation__planted", {
    property: "scale",
    from: "0 0 0",
    to: "0.75 0.75 0.75",
    dur: "1000",
    startEvents: "planted",
  });
  shoot.setAttribute("animation__watered1", {
    property: "scale",
    from: "0.75 0.75 0.75",
    to: "1.5 1.5 1.5",
    dur: "1000",
    startEvents: "water1",
  });
  shoot.setAttribute("animation__watered2", {
    property: "scale",
    from: "1.5 1.5 1.5",
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
      
      // Play success sound
      if (window.AudioManager) {
        window.AudioManager.playSound('seedLand').catch(error => {
          console.warn('Failed to play seed land sound:', error);
        });
      }
      
      document.getElementById("hint").innerHTML =
        "You planted a seed, now it needs water. Select the watering can using the button and tap the seedling you want to water.";
      document.getElementById("waterButton").classList.add('pulse')
      setTimeout(() => {
        e.detail.targetEl.parentNode.removeChild(e.detail.targetEl);
      }, 50);
    }
  });
  
  dirt.addEventListener("click", (e) => {
    const target = e.target
      if (
        target &&
        target.getAttribute("planted") == "true" &&
        target.getAttribute("watered") != "2" &&
        watercan.getAttribute("watering") !== "true"
      ) {
        watercan.setAttribute("watering", true);
        // Disable water button during animation
        const waterButton = document.getElementById('waterButton');
        if (waterButton) {
          waterButton.disabled = true;
        }
        scene.object3D.attach(watercan.object3D);
        let worldPosition = new THREE.Vector3();
        target.object3D.getWorldPosition(worldPosition);
        watercan.object3D.position.setX(worldPosition.x + 0.125);
        watercan.object3D.position.setZ(worldPosition.z + 0.125);
        watercan.object3D.position.setY(0.3);
        watercan.emit("water");
        
        // Play watering pour sound with slight delay to sync with animation
        setTimeout(() => {
          if (window.AudioManager) {
            window.AudioManager.playSound('waterPour').catch(error => {
              console.warn('Failed to play water pour sound:', error);
            });
          }
        }, 500);
        
        waterpour.setAttribute('scale', '0 0 0')
        waterpour.emit("show")
        waterpour.emit("grow");
        setTimeout(() => {
          watercan.emit("stopwater");
          waterpour.emit("fade");
        }, 2500);
        setTimeout(() => {
          target.setAttribute(
            "watered",
            Number(target.getAttribute("watered")) + 1
          );
          if (target.getAttribute("watered") == 1) {
            target.querySelector(".shoot").emit("water1");
            
            // Play sapling growth sound
            if (window.AudioManager) {
              window.AudioManager.playSound('saplingGrow').catch(error => {
                console.warn('Failed to play sapling grow sound:', error);
              });
            }
            
            document.getElementById("hint").innerHTML =
              "Nice! It just needs a bit more water.";
          } else if (target.getAttribute("watered") == 2) {
            target.querySelector(".shoot").emit("water2");
            target.querySelector(".sunflower").emit("water2");
            target
              .querySelector(".sunflower")
              .setAttribute("visible", "true");
              
            // Play sunflower completion sound
            if (window.AudioManager) {
              window.AudioManager.playSound('sunflowerComplete').catch(error => {
                console.warn('Failed to play sunflower complete sound:', error);
              });
            }
            if (window.flowersgrown < 3) {
              document.getElementById("hint").innerHTML =
                "Congrats! You grew a sunflower. Grow 3 to try and attract a bee";
              document.getElementById("shovelButton").classList.add('pulse')
            } else {
              
            }
            window.flowersgrown++;
            if (window.flowersgrown == 1) {
              bee1.object3D.position.setX(worldPosition.x);
              bee1.object3D.position.setZ(worldPosition.z);
              bee1.object3D.position.setY(0.7);
            }
            if (window.flowersgrown == 2) {
              bee2.object3D.position.setX(worldPosition.x);
              bee2.object3D.position.setZ(worldPosition.z);
              bee2.object3D.position.setY(0.7);
            }
            if (window.flowersgrown == 3) {
              setTimeout(() => {
                bee3.object3D.position.setX(worldPosition.x);
                bee3.object3D.position.setZ(worldPosition.z);
                bee3.object3D.position.setY(0.7);
                bee1.emit("enter");
                bee2.emit("enter");
                bee3.emit("enter");
                
                // Play bee buzz sound (looping)
                if (window.AudioManager) {
                  window.AudioManager.playSound('beeBuzz', null, true).catch(error => {
                    console.warn('Failed to play bee buzz sound:', error);
                  });
                }
                document.getElementById("hint").innerHTML =
                  "Look, a bee showed up!";
                document.getElementById("shovelButton").classList.remove('pulse')
                setTimeout(() => {
                  openCongratulations();
                }, 8500);
              }, 1000);
            }
          }
          watercan.setAttribute("watering", false);
          // Re-enable water button after animation
          const waterButton = document.getElementById('waterButton');
          if (waterButton) {
            waterButton.disabled = false;
          }
          waterpocket.object3D.attach(watercan.object3D);
          watercan.object3D.position.setX(0);
          watercan.object3D.position.setZ(0);
          watercan.object3D.position.setY(0);
        }, 3500);
      }
  });

  return dirt;
}