import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 1. SCENE SETUP
const container = document.getElementById('community-canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 25);

// 2. RENDERER (Matching your high-quality settings)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// 3. LIGHTING & ENVIRONMENT (Exact match to Home/Fitness)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xffffff, 0x269c42, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 15, 8);
scene.add(dirLight);
// 4. LOAD MODELS & DECORATE
const loader = new GLTFLoader();
// Updated array to include all 5 signs
const models = ['Bien 1.glb', 'Bien 2.glb', 'Bien 3.glb', 'Bien 4.glb', 'Bien 5.glb'];
const signs = [];

function spawnSign(modelPath, x, y, z, scale) {
    loader.load(modelPath, (gltf) => {
        const sign = gltf.scene;
        sign.position.set(x, y, z);
        sign.scale.set(scale, scale, scale);
        
        // Random rotation for natural look
        sign.rotation.y = Math.random() * Math.PI;
        sign.rotation.z = (Math.random() - 0.5) * 0.2;

        sign.userData.floatOffset = Math.random() * Math.PI * 2;
        
        scene.add(sign);
        signs.push(sign);
    });
}

// --- NEW POSITIONING FOR ALL 5 SIGNS ---

// LEFT SIDE (Decorating the 1fr column area)
spawnSign('Bien 1.glb', -16, 7, 0, 2.2);   // Top Left
spawnSign('Bien 4.glb', -13, -2, 1, 1.8);  // Mid Left
spawnSign('Bien 2.glb', -15, -9, -2, 2.0); // Bottom Left

// RIGHT SIDE (Decorating the 1fr column area)
spawnSign('Bien 3.glb', 16, 6, -1, 2.1);   // Top Right
spawnSign('Bien 5.glb', 14, 0, 2, 1.9);    // Mid Right
spawnSign('Bien 1.glb', 17, -7, 0, 2.3);   // Bottom Right

// BACKGROUND (Deep space behind the 2fr center text)
spawnSign('Bien 2.glb', -5, 12, -8, 1.5);  // High Back Left
spawnSign('Bien 4.glb', 6, 11, -10, 1.7);  // High Back Right
spawnSign('Bien 5.glb', 0, -12, -5, 1.4);  // Low Center Back
// 5. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    signs.forEach((sign) => {
        // Subtle floating movement
        sign.position.y += Math.sin(time + sign.userData.floatOffset) * 0.005;
        // Subtle rotation
        sign.rotation.y += 0.005;
    });

    renderer.render(scene, camera);
}

// 6. RESIZE HANDLER
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();