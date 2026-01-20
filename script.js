
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'; 

const cssBackgroundColor = getComputedStyle(document.body).backgroundColor;

// 1. SCENE
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(cssBackgroundColor, 22, 60);

// 2. CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Target position for the "Miniature" look
const initialCameraPos = new THREE.Vector3(19, 7, 0); 
camera.position.copy(initialCameraPos);

// 3. RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; 
renderer.outputColorSpace = THREE.SRGBColorSpace; 
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
document.getElementById('canvas-container').appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// 4. POST-PROCESSING
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);

// --- ADD THIS LINE ---
outlinePass.hiddenEdgeColor.setHex(0xffffff); // Make hidden parts white too
// ---------------------

outlinePass.visibleEdgeColor.setHex(0xffffff);
outlinePass.edgeStrength = 4;
composer.addPass(outlinePass);
composer.addPass(new OutputPass());

// 5. LIGHTING
scene.add(new THREE.HemisphereLight(0xffffff, 0x269c42, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 15, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// 6. LOAD MODEL
const loader = new GLTFLoader();
let parkModel = null; 

loader.load('model.glb', (gltf) => {
    parkModel = gltf.scene;
    
    // SCALE SET TO 0.55 AS REQUESTED
    const s = 0.8;
    parkModel.scale.set(s,s,s);

    parkModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // POSITIONED HIGHER (Was -3.5, now -2.2)
    parkModel.position.y = -2.7;
    parkModel.position.z = -1.6;
    parkModel.rotation.y = Math.PI / 4;
    scene.add(parkModel);
});

// 7. CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.zoomSpeed = 4;
controls.minDistance = 10; 

// --- CHANGE THIS LINE ---
// This calculates the exact distance of your starting point (approx 21.2 units)
controls.maxDistance = initialCameraPos.length(); 
// ------------------------

controls.maxPolarAngle = Math.PI / 2 - 0.1; 

let isInteracting = false;
controls.addEventListener('start', () => { isInteracting = true; });
controls.addEventListener('end', () => { isInteracting = false; });

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// 8. ANIMATION LOOP
const spherical = new THREE.Spherical();
const targetSpherical = new THREE.Spherical().setFromVector3(initialCameraPos);
const shakingObjects = [];

function triggerShake(object) {
    // 1. If it's already shaking, ignore
    if (shakingObjects.includes(object)) return;

    // 2. Save the original rotation so we can return to it later
    // We store it in 'userData' so it sticks with the specific tree
    if (!object.userData.initialRotation) {
        object.userData.initialRotation = object.rotation.clone();
    }

    object.userData.shakeStart = performance.now();
    
    // 3. Add to the list so the animate loop knows to update it
    shakingObjects.push(object);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.002;

    if (parkModel) {
        // Subtle idle rotation
        parkModel.rotation.y = (Math.PI / 4) + Math.sin(time * 0.4) * 0.05;

        // SLOW RESET LOGIC
        if (!isInteracting) {
            spherical.setFromVector3(camera.position);
            
            // Lerp value changed to 0.005 for a very slow return speed
            spherical.theta = THREE.MathUtils.lerp(spherical.theta, targetSpherical.theta, 0.005);
            spherical.phi = THREE.MathUtils.lerp(spherical.phi, targetSpherical.phi, 0.005);
            
            camera.position.setFromSpherical(spherical);
        }

       // Raycasting
      // ... inside animate() function ...

    // Raycasting
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([parkModel], true);

    if (intersects.length > 0) {
        // --- SCENARIO 1: MOUSE IS OVER THE MODEL ---
        
        // 1. Highlight the model
        outlinePass.selectedObjects = [parkModel];
        document.body.style.cursor = 'pointer';
        
        // 2. ENABLE ZOOM (Disables Page Scroll automatically)
        controls.enableZoom = true;
        
    } else {
        // --- SCENARIO 2: MOUSE IS OVER EMPTY SPACE ---
        
        // 1. Remove highlight
        outlinePass.selectedObjects = [];
        document.body.style.cursor = 'default';
        
        // 2. DISABLE ZOOM (Allows Page Scroll to work)
        controls.enableZoom = false;
    }

    // ... rest of animate() ...
    }

    controls.update();
    composer.render();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
let isDragging = false;
controls.addEventListener('change', () => { isDragging = true; });
controls.addEventListener('start', () => { isDragging = false; });

window.addEventListener('click', (event) => {
    // If user was rotating the camera, don't click
    if (isDragging) return;

    // Raycast to find what was clicked
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([parkModel], true);

    if (intersects.length > 0) {
        let hitObj = intersects[0].object;

        // 1. Check for Hitbox (Bicycle logic)
        if (hitObj.userData.outlineTarget) {
            hitObj = hitObj.userData.outlineTarget;
        } 
        // 2. Otherwise traverse up to finding the main object
        else {
            while (hitObj.parent && hitObj.parent !== parkModel) {
                hitObj = hitObj.parent;
            }
        }

        // 3. Optional: Only shake if the name contains "Tree"
        // Remove this if-statement if you want EVERYTHING to shake
        if (hitObj.name.toLowerCase().includes('tree')) {
            triggerShake(hitObj);
        } else {
            // If you want everything (benches, bike) to shake, just call this:
            triggerShake(hitObj); 
        }
    }
});
// ... (End of your existing animate function) ...

const phrases = [
    "Một… hai… một… hai",
    "Anh có yêu em không?",
    "Của tụi con hết 62k",
    "Chờ xíu mát rồi về",
    "CHUYỀN QUA ĐÂY LẸ LÊN",
    "Mát quáaaa",
    "Chạy chi rồi té",
    "Ủa nay làm bài sao",
    "Má đi đứng kiểu gì zậy má",
    "Trời ơi nóng quá đi mất",
    "Đi vòng nữa không",
"Ba ơi coi nè",
"Ê ra kia ngồi đi",
"Mua nước uống không",
"Đợi đủ người rồi đi",
"Chỗ này mát nè",
"Đứng sát vô coi",
"Ngồi xuống nghỉ đi",
"Tí nữa chụp hình tiếp",
"Đừng đẩy bạn vậy",
"Qua bên này nè",
"Ở đây đợi nha"

];
const container = document.getElementById('ambient-text-container');
// --- 🛣️ 4-LANE HIGHWAY SYSTEM (UPDATED) ---
// Moved lanes much closer to the edge to avoid the model.
// ... (phrases array and container stay the same) ...

// --- 🛣️ 4-LANE HIGHWAY SYSTEM ---
const laneConfig = [
    // LEFT SIDE
    { id: 0, side: 'left', minX: 1, maxX: 8 },    // Outer Left (Safe for Mobile)
    { id: 1, side: 'left', minX: 10, maxX: 18 },  // Inner Left (Desktop Only)
    
    // RIGHT SIDE
    { id: 2, side: 'right', minX: 1, maxX: 8 },   // Outer Right (Safe for Mobile)
    { id: 3, side: 'right', minX: 10, maxX: 18 }  // Inner Right (Desktop Only)
];

let laneLocks = [0, 0, 0, 0]; 

function spawnAmbientText() {
    if (!container) return;

    const now = Date.now();
    const isMobile = window.innerWidth < 768;

    // 1. FILTER LANES
    // If Mobile: Only use Lane 0 and 2 (The Outer Lanes).
    // If Desktop: Use all lanes.
    const activeLanes = isMobile 
        ? [laneConfig[0], laneConfig[2]] 
        : laneConfig;

    // 2. FIND OPEN LANES
    const openLanes = activeLanes.filter(lane => now > laneLocks[lane.id]);

    if (openLanes.length === 0) return;

    const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
    const el = document.createElement('div');
    el.classList.add('ambient-sentence');
    el.innerText = phrases[Math.floor(Math.random() * phrases.length)];

    // POSITIONING
    const randomX = lane.minX + Math.random() * (lane.maxX - lane.minX);

    if (lane.side === 'left') {
        el.classList.add('bubble-left');
        el.style.left = randomX + '%';
        el.style.textAlign = 'left';
    } else {
        el.classList.add('bubble-right');
        el.style.right = randomX + '%';
        el.style.left = 'auto'; 
        el.style.textAlign = 'right';
    }

    const topPos = 40 + Math.random() * 35; 
    el.style.top = topPos + '%';

  // 6. STYLE & DURATION
    
    // --- LARGER TEXT FOR DESKTOP ---
    // Old: 0.7 + 0.2 (0.7rem - 0.9rem)
    // New: 1.1 + 0.4 (1.1rem - 1.5rem)
    const size = 0.7 + Math.random() * 0.5; 
    el.style.fontSize = size + 'rem';
    
    // Fast Speed: 3s to 5s
    const duration = 3 + Math.random() * 2; 
    el.style.animation = `floatUpFade ${duration}s ease-out forwards`;
    container.appendChild(el);

    laneLocks[lane.id] = now + (duration * 1000); 

    setTimeout(() => {
        el.remove();
    }, duration * 1000);
}

setInterval(spawnAmbientText, 100);