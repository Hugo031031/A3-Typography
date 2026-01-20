import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 1. SCENE SETUP
const container = document.getElementById('community-canvas-container');
const scene = new THREE.Scene();

// 2. CREATE A PLACEHOLDER CAMERA
let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// 3. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// 4. LIGHTING & ENVIRONMENT
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x269c42, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 15, 8);
scene.add(dirLight);

// --- ANIMATION SYSTEM SETUP ---
let mixer; // The manager for all animations
const clock = new THREE.Clock(); // Tracks time for smooth playback

// 5. LOAD MODEL & EXTRACT CAMERA & ANIMATIONS
const loader = new GLTFLoader();

loader.load('Bientonghop2.glb', (gltf) => {
    const mainModel = gltf.scene;
    scene.add(mainModel);

    // --- PLAY BLENDER ANIMATIONS ---
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(mainModel);
        
        // Play all animation clips found in the file
        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
        });
        console.log(`Playing ${gltf.animations.length} animations from Blender`);
    }

    // --- FIND BLENDER CAMERA ---
    if (gltf.cameras && gltf.cameras.length > 0) {
        camera = gltf.cameras[0];
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        console.log("Using Blender Camera:", camera.name);
    } else {
        console.warn("No camera found in GLB. Using default Three.js camera.");
        camera.position.set(0, 0, 25);
    }
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

// 6. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    // Update the animation mixer every frame
    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

// 7. RESIZE HANDLER
window.addEventListener('resize', () => {
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
