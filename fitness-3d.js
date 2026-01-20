import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 1. SETUP SCENE
const container = document.getElementById('fitness-canvas-container');
const scene = new THREE.Scene();

// 2. CAMERA
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 20;

// 3. RENDERER
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// 4. LIGHTING
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x269c42, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 15, 8);
scene.add(dirLight);

// 5. VARIABLES
const loader = new GLTFLoader();
let ball;

const BASE_SPEED = 0.15; 
let velocity = new THREE.Vector3(BASE_SPEED, BASE_SPEED, 0); 
const rotationSpeed = { x: 0.03, y: 0.05 };

// -- DRAG VARIABLES --
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); 
let isDragging = false;
let previousMousePosition = new THREE.Vector3();

// -- GOAL VARIABLES --
let isGoalOpen = false;
let isGoalSequenceActive = false; 

// -- CHEERING VARIABLES --
let lastCheerTime = 0; 
const cheerPhrases = [
    "SÚT ĐI!", "LÀM LIỀN!", "VÔ ĐÓ!", "TỰ TIN!", "NHANH!", "SÚT MẠNH!",
    "LÀM TỚI!", "NGAY!", "VÔ LIỀN!", "ĐƯỢC ĐÓ!", "BÂY GIỜ!", "LÀM ĐI!"
];

// 6. LOAD FOOTBALL
loader.load('football.glb', (gltf) => {
    ball = gltf.scene;
    
    // --- CENTER THE BALL ON LOAD ---
    ball.position.set(0, 0, 0); 
    ball.scale.set(0.8, 0.8, 0.8);
    
    ball.traverse((child) => {
        if (child.isMesh) child.userData.isBall = true;
    });
    scene.add(ball);
}, undefined, (error) => {
    console.error('An error occurred loading the football:', error);
});

// 7. MOUSE HANDLERS
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', () => {
    if (!ball || isGoalSequenceActive) return; 
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ball, true);

    if (intersects.length > 0) {
        isDragging = true;
        isGoalOpen = true; 

        document.body.style.cursor = 'grabbing';
        container.style.zIndex = "5"; 
        
        const layout = document.querySelector('.fitness-layout');
        if(layout) layout.classList.add('rumble');
        
        raycaster.ray.intersectPlane(dragPlane, previousMousePosition);
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
        container.style.zIndex = "-1";

        const layout = document.querySelector('.fitness-layout');
        if(layout) layout.classList.remove('rumble');

        const currentSpeed = velocity.length();
        if (currentSpeed < BASE_SPEED) {
            velocity.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize().multiplyScalar(BASE_SPEED);
        } else {
            velocity.clampLength(0, 0.8);
        }
        rotationSpeed.x = velocity.y * 0.2;
        rotationSpeed.y = velocity.x * 0.2;
    }
});

// 8. TEXT SPAWNER
function spawnImpactText(x3d, y3d, text) {
    if (velocity.length() < 0.05) return;
    const vec = new THREE.Vector3(x3d, y3d, 0);
    vec.project(camera);
    const x = (vec.x * .5 + .5) * window.innerWidth;
    const y = (-(vec.y * .5) + .5) * window.innerHeight;
    createFloatingText(x, y, text, 'bounce');
}

function spawnEncouragement() {
    const now = Date.now();
    if (now - lastCheerTime < 50) return;
    lastCheerTime = now;
    const side = Math.random() > 0.5 ? 'left' : 'right';
    let x, y;
    if (side === 'left') {
        x = Math.random() * (window.innerWidth * 0.2); 
    } else {
        x = (window.innerWidth * 0.8) + (Math.random() * (window.innerWidth * 0.2));
    }
    y = Math.random() * window.innerHeight;
    const text = cheerPhrases[Math.floor(Math.random() * cheerPhrases.length)];
    createFloatingText(x, y, text, 'shake');
}

function createFloatingText(x, y, text, type) {
    const el = document.createElement('div');
    el.classList.add('impact-text');
    el.classList.add(type); 
    el.innerText = text;
    const randomSize = (Math.random() * 1.5 + 1).toFixed(1);
    el.style.fontSize = `${randomSize}rem`;
    if (type === 'shake') {
        const rot = Math.random() * 30 - 15;
        el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    }
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1200);
}

const expressions = [
    "Đá qua đây coi!", "Truyền lẹ lên đi!", "Mất bóng rồi kìa má!", "Chạy thêm xíu nữa đi!",
    "Kèm người vô coi!", "Trống trơn kìa!", "Ê ê tao nè!", "SÚT ĐI trời ơi!",
    "Đừng ham banh quá!", "Về thủ đi!", "Áp sát vô đi!", "Coi chừng sau lưng!",
    "Giữ banh lại xíu!", "Chuyền gọn thôi!", "Bật tường nè!", "Thủ môn ra luôn!"
];

// 9. GOAL & RESET LOGIC
function handleGoal() {
    if(isGoalSequenceActive) return; 
    isGoalSequenceActive = true;
    
    // Hide ball and stop physics
    ball.scale.set(0, 0, 0);
    ball.position.set(0, 0, 0);
    velocity.set(0, 0, 0);

    const layout = document.querySelector('.fitness-layout');
    if(layout) layout.classList.add('hidden');

    document.querySelectorAll('.goal-text').forEach(el => el.remove());

    const vaoText = document.createElement('div');
    vaoText.classList.add('goal-text');
    vaoText.innerText = "VÀOOO";
    document.body.appendChild(vaoText);

    spawnGoalConfetti();

    setTimeout(() => {
        vaoText.remove();
        if(layout) layout.classList.remove('hidden');
        resetBallAnimation();
    }, 3000); 
}

function spawnGoalConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('goal-confetti');
        confetti.innerText = "VÀO";
        const size = (Math.random() * 1.5 + 0.5).toFixed(1); 
        confetti.style.fontSize = `${size}rem`;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 600; 
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const rot = Math.random() * 360;
        confetti.style.setProperty('--tx', `${tx}px`);
        confetti.style.setProperty('--ty', `${ty}px`);
        confetti.style.setProperty('--rot', `${rot}deg`);
        document.body.appendChild(confetti);
        setTimeout(() => { confetti.remove(); }, 4500);
    }
}

function resetBallAnimation() {
    // --- ENSURE CENTERED BEFORE GROWING ---
    if(ball) ball.position.set(0, 0, 0); 
    
    let scale = 0;
    const growInterval = setInterval(() => {
        scale += 0.05;
        if (scale >= 0.8) {
            scale = 0.8;
            clearInterval(growInterval);
            isGoalOpen = false; 
            isGoalSequenceActive = false; 
            velocity.set(BASE_SPEED, BASE_SPEED, 0); 
        }
        if(ball) ball.scale.set(scale, scale, scale);
    }, 16);
}

// 10. BOUNDARIES
function getVisiblePlane() {
    const distance = camera.position.z; 
    const vFOV = THREE.MathUtils.degToRad(camera.fov); 
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * camera.aspect;
    return { width, height };
}

// 11. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    if (ball) {
        if (isDragging) {
            raycaster.setFromCamera(mouse, camera);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, target);
            if (target) {
                velocity.subVectors(target, ball.position);
                ball.position.copy(target);
                previousMousePosition.copy(target);
            }
            ball.rotation.x += 0.05;
            ball.rotation.y += 0.05;
            spawnEncouragement();
        } else {
            const currentSpeed = velocity.length();
            if (currentSpeed > BASE_SPEED) {
                velocity.multiplyScalar(0.98); 
            } else if (currentSpeed < BASE_SPEED - 0.01) {
                if (currentSpeed === 0) {
                    velocity.set(BASE_SPEED, BASE_SPEED, 0);
                } else {
                    velocity.setLength(BASE_SPEED);
                }
            }

            ball.position.add(velocity);
            ball.rotation.x += rotationSpeed.x;
            ball.rotation.y += rotationSpeed.y;
            rotationSpeed.x *= 0.99;
            rotationSpeed.y *= 0.99;

            const { width, height } = getVisiblePlane();
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const radius = 1.5; 
            const textPadding = 4.0;
            const isFast = currentSpeed > BASE_SPEED + 0.05;
            const bounciness = isFast ? 0.8 : 1.0;

            if (ball.position.x + radius > halfWidth) {
                ball.position.x = halfWidth - radius;
                velocity.x *= -bounciness; 
                rotationSpeed.x = Math.random() * 0.1;
                spawnImpactText(halfWidth - textPadding, ball.position.y, expressions[Math.floor(Math.random() * expressions.length)]);
            } else if (ball.position.x - radius < -halfWidth) {
                ball.position.x = -halfWidth + radius;
                velocity.x *= -bounciness; 
                rotationSpeed.x = Math.random() * 0.1;
                spawnImpactText(-halfWidth + textPadding, ball.position.y, expressions[Math.floor(Math.random() * expressions.length)]);
            }

            if (ball.position.y + radius > halfHeight) {
                if (isGoalOpen) {
                    if (ball.position.y > halfHeight + 3 && !isGoalSequenceActive) {
                        handleGoal(); 
                    }
                } else {
                    ball.position.y = halfHeight - radius;
                    velocity.y *= -bounciness; 
                    rotationSpeed.y = Math.random() * 0.1;
                    spawnImpactText(ball.position.x, halfHeight - textPadding, expressions[Math.floor(Math.random() * expressions.length)]);
                }
            } else if (ball.position.y - radius < -halfHeight) {
                ball.position.y = -halfHeight + radius;
                velocity.y *= -bounciness; 
                rotationSpeed.y = Math.random() * 0.1;
                spawnImpactText(ball.position.x, -halfHeight + textPadding, expressions[Math.floor(Math.random() * expressions.length)]);
            }
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();