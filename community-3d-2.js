import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// 1. SCENE SETUP
const container = document.getElementById('community-canvas-container');
const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// 2. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// 3. LIGHTING (Bright & Even)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 15, 8);
scene.add(dirLight);

const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
frontLight.position.set(0, 0, 20);
scene.add(frontLight);

// 4. POST-PROCESSING (Pink Glow)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
const pinkColor = new THREE.Color(0xf386ce);
outlinePass.visibleEdgeColor.set(pinkColor);
outlinePass.hiddenEdgeColor.set(pinkColor);
outlinePass.edgeStrength = 10;
outlinePass.edgeThickness = 4;
composer.addPass(outlinePass);
composer.addPass(new OutputPass());

// 5. VARIABLES
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mainModel = null;
let signs = []; 

// 6. LOAD MODEL
const loader = new GLTFLoader();

loader.load('Bientonghop2.glb', (gltf) => {
    mainModel = gltf.scene;
    scene.add(mainModel);

    // --- SETUP SIGNS ---
    mainModel.children.forEach((child) => {
        if (child.isMesh || (child.isGroup && !child.isCamera && !child.isLight)) {
            
            // 1. Fix Materials (Double Sided)
            child.traverse((node) => {
                if (node.isMesh) node.material.side = THREE.DoubleSide;
            });

            // 2. Initialize Physics Data
            child.userData = {
                // Current velocity of the spin
                spinVelocity: 0,
                // Target rotation (we want it to return to angle 0 eventually)
                baseRotationY: child.rotation.y, 
                isSpinning: false
            };
            
            signs.push(child);
        }
    });

    if (gltf.cameras && gltf.cameras.length > 0) {
        camera = gltf.cameras[0];
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderPass.camera = camera;
        outlinePass.renderCamera = camera;
    }
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

// 7. CLICK INTERACTION (The Slap)
window.addEventListener('click', () => {
    if (!mainModel) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(signs, true);

    if (intersects.length > 0) {
        let clickedSign = intersects[0].object;
        while (clickedSign.parent && clickedSign.parent !== mainModel) {
            clickedSign = clickedSign.parent;
        }

        // --- ADD SPIN FORCE ---
        // Give it a big push (random direction)
        const force = 0.5 + Math.random() * 0.5;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        clickedSign.userData.spinVelocity = force * direction;
        clickedSign.userData.isSpinning = true;
    }
});

// 8. MOUSE MOVE
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// 9. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    // --- SPIN PHYSICS ---
    if (signs.length > 0) {
        signs.forEach(sign => {
            const data = sign.userData;

            if (data.isSpinning || Math.abs(data.spinVelocity) > 0.001) {
                // Apply Velocity
                sign.rotation.y += data.spinVelocity;

                // Friction (Slow down)
                data.spinVelocity *= 0.95;

                // Stop if very slow
                if (Math.abs(data.spinVelocity) < 0.001) {
                    data.spinVelocity = 0;
                    data.isSpinning = false;
                }
            }
        });
    }

    // --- OUTLINE LOGIC ---
    if (mainModel) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(signs, true);
        if (intersects.length > 0) {
            let hoveredObj = intersects[0].object;
            while (hoveredObj.parent && hoveredObj.parent !== mainModel) { hoveredObj = hoveredObj.parent; }
            outlinePass.selectedObjects = [hoveredObj];
            document.body.style.cursor = 'pointer';
        } else {
            outlinePass.selectedObjects = [];
            document.body.style.cursor = 'default';
        }
    }

    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
