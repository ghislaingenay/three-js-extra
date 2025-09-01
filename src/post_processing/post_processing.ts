import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";
import canvas from "../utils/canvas";
//  EffectComposer will handle all the process of creating the render targets,
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
//first pass called RenderPass. This pass is in charge of the first render of our scene, but instead of doing it in the canvas, it will happen in a render target created inside the EffectComposer:
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import {
  DotScreenPass,
  GammaCorrectionShader,
  GlitchPass,
  RGBShiftShader,
  ShaderPass,
  SMAAPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
/**
 * Base
 */
// Debug
const gui = new GUI();
// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();
const textureLoader = new THREE.TextureLoader();

/**
 * Update all materials
 */
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial
    ) {
      child.material.envMapIntensity = 2.5;
      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
  "/post_processing/textures/environmentMaps/0/px.jpg",
  "/post_processing/textures/environmentMaps/0/nx.jpg",
  "/post_processing/textures/environmentMaps/0/py.jpg",
  "/post_processing/textures/environmentMaps/0/ny.jpg",
  "/post_processing/textures/environmentMaps/0/pz.jpg",
  "/post_processing/textures/environmentMaps/0/nz.jpg",
]);

scene.background = environmentMap;
scene.environment = environmentMap;

/**
 * Models
 */
gltfLoader.load(
  "/post_processing/models/DamagedHelmet/glTF/DamagedHelmet.gltf",
  (gltf) => {
    gltf.scene.scale.set(2, 2, 2);
    gltf.scene.rotation.y = Math.PI * 0.5;
    scene.add(gltf.scene);

    updateAllMaterials();
  }
);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(0.25, 3, -2.25);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.resolution.set(sizes.width, sizes.height);

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(4, 1, -4);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Post processing
 */

const TintShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: null },
  },
  vertexShader: `
      varying vec2 vUv;
        void main()
        {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            vUv = uv;
        }
    `,
  fragmentShader: `
        varying vec2 vUv;
         uniform sampler2D tDiffuse;
              uniform vec3 uTint;
        void main()
        {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb += uTint;
            gl_FragColor = color;
        }
    `,
};

const DisplacementShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uNormalMap: { value: null },
  },
  vertexShader: `
        varying vec2 vUv;

        void main()
        {

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            vUv = uv;
        }
    `,
  fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D uNormalMap;
        // uniform float uTime;

        varying vec2 vUv;

        void main()
        {
            //vec2 newUv = vec2(vUv.x, vUv.y + sin(vUv.x * 10.0) * 0.1);
            vec3 normalColor = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0; // go to -1 to +1
            vec2 newUv = vUv + normalColor.rg * 0.1;
            vec4 color = texture2D(tDiffuse, newUv);

            vec3 lightDirection = normalize(vec3(-1.0,1.0,0.0));
            float lightness = clamp(dot(normalColor, lightDirection),0.0,1.0);
            color += lightness * 2.0;

            gl_FragColor = color;
        }
    `,
};

// render target
const renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
  samples: renderer.getPixelRatio() === 1 ? 2 : 0, // antialias => find smallest value that still look good
});
const effectComposer = new EffectComposer(renderer, renderTarget);
effectComposer.setSize(sizes.width, sizes.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

// DotScreenPass
// Apply kind of black and white raster effect on the scene
const dotScreenPass = new DotScreenPass();
dotScreenPass.enabled = false;
effectComposer.addPass(dotScreenPass);

// Glitch pass
// Apply a glitch effect on the scene
const glitchPass = new GlitchPass();
// glitchPass.goWild = true;
glitchPass.enabled = false;
effectComposer.addPass(glitchPass);

// RGBShiftPass
// Apply a RGB shift effect on the scene
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.enabled = false;
effectComposer.addPass(rgbShiftPass);

const tintPass = new ShaderPass(TintShader);
tintPass.uniforms.uTint.value = new THREE.Vector3(0.1, 0, 0);
tintPass.enabled = false;
effectComposer.addPass(tintPass);

gui
  .add(tintPass.material.uniforms.uTint.value, "x")
  .min(-1)
  .max(1)
  .step(0.001)
  .name("red");
gui
  .add(tintPass.material.uniforms.uTint.value, "y")
  .min(-1)
  .max(1)
  .step(0.001)
  .name("green");
gui
  .add(tintPass.material.uniforms.uTint.value, "z")
  .min(-1)
  .max(1)
  .step(0.001)
  .name("blue");

// Displacemnt pass
const displacementPass = new ShaderPass(DisplacementShader);
displacementPass.material.uniforms.uNormalMap.value = textureLoader.load(
  "/post_processing/textures/interfaceNormalMap.png "
);
effectComposer.addPass(displacementPass);

// Unreal Bloom Pass
const unrealBloomPass = new UnrealBloomPass(sizes.resolution, 0.3, 1, 0.05);
unrealBloomPass.enabled = true;
effectComposer.addPass(unrealBloomPass);

gui.add(unrealBloomPass, "enabled").name("Unreal Bloom");
gui.add(unrealBloomPass, "strength").min(0).max(2).step(0.001);
gui.add(unrealBloomPass, "radius").min(0).max(1).step(0.001);
gui.add(unrealBloomPass, "threshold").min(0).max(1).step(0.001);

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
gammaCorrectionPass.enabled = true;
effectComposer.addPass(gammaCorrectionPass);

// SMAA pass = antialiasing for older browser
if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
  const smaaPass = new SMAAPass();
  smaaPass.enabled = true;
  effectComposer.addPass(smaaPass);
}

window.addEventListener("resize", () => {
  // Update effect composer renderer
  effectComposer.setSize(window.innerWidth, window.innerHeight);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // displacementPass.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  // renderer.render(scene, camera);
  effectComposer.render();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};
export default tick;
