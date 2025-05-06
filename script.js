import * as THREE from 'three';
// Optional: Import OrbitControls if you want mouse control for debugging
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM Elements ---
const container = document.getElementById('scene-container');
const loadingScreen = document.getElementById('loading-screen');
const contentSections = document.querySelectorAll('.content-section');

if (!container) {
    console.error("Scene container not found!");
    // Handle error appropriately
}

// --- Basic Scene Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050515, 5, 50); // Add fog for depth

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 15); // Initial camera position

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha true for transparent background if needed
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for high DPI screens
container.appendChild(renderer.domElement);

// Optional: Orbit Controls for debugging camera positioning
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x404060, 1); // Soft ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight(0x6fa8dc, 3, 30); // Blueish light
pointLight1.position.set(-5, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x93c47d, 2, 25); // Greenish light
pointLight2.position.set(8, -3, 8);
scene.add(pointLight2);

// --- 3D Objects ---
const objects = []; // To hold objects we might animate globally

// Central Object (e.g., a Torus Knot)
const centralGeo = new THREE.TorusKnotGeometry(2, 0.5, 150, 20);
const centralMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 0.5 // Requires an environment map for best effect (more advanced)
});
const centralObject = new THREE.Mesh(centralGeo, centralMat);
centralObject.position.set(0, 1, 0); // Position it slightly up
scene.add(centralObject);
objects.push(centralObject);

// Particle System (for visual interest)
const particleCount = 500;
const particlesGeo = new THREE.BufferGeometry();
const posArray = new Float32Array(particleCount * 3); // x, y, z for each particle
const colorsArray = new Float32Array(particleCount * 3); // r, g, b for each particle

const colorInside = new THREE.Color(0x6fa8dc); // Blue
const colorOutside = new THREE.Color(0x93c47d); // Green

for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = Math.random() * 15 + 5; // Spread particles out
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 20;

    posArray[i3] = Math.cos(angle) * radius;     // x
    posArray[i3 + 1] = height;                     // y
    posArray[i3 + 2] = Math.sin(angle) * radius; // z

    // Color based on distance (optional gradient effect)
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, Math.sqrt(radius / 20)); // Lerp towards outside color

    colorsArray[i3] = mixedColor.r;
    colorsArray[i3 + 1] = mixedColor.g;
    colorsArray[i3 + 2] = mixedColor.b;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

const particlesMat = new THREE.PointsMaterial({
    size: 0.15,
    sizeAttenuation: true, // Points smaller further away
    vertexColors: true,    // Use colors defined in geometry
    blending: THREE.AdditiveBlending, // Nice glow effect
    transparent: true,
    depthWrite: false // Prevent particles blocking closer objects sometimes
});
const particleSystem = new THREE.Points(particlesGeo, particlesMat);
scene.add(particleSystem);
objects.push(particleSystem); // Add for potential global animations


// --- Scroll Variables ---
let currentScrollY = window.scrollY;
let targetScrollY = window.scrollY;
const scrollLerpFactor = 0.08; // Smoothing factor for scroll position
let currentSectionIndex = 0;

// --- Camera Path (Example: Simple movement + rotation) ---
// Define target states for the camera at different scroll points (0 to 1)
const cameraPath = [
    { scroll: 0.0, pos: new THREE.Vector3(0, 2, 15), lookAt: new THREE.Vector3(0, 1, 0) }, // Start
    { scroll: 0.3, pos: new THREE.Vector3(0, 1, 8), lookAt: new THREE.Vector3(0, 1, 0) },  // Zoom into central object
    { scroll: 0.6, pos: new THREE.Vector3(-8, 3, 8), lookAt: new THREE.Vector3(0, 0, 0) }, // Move side/up, look broader
    { scroll: 1.0, pos: new THREE.Vector3(0, 5, 20), lookAt: new THREE.Vector3(0, 0, 0) }   // Zoom out further
];


// --- Animation & Scroll Logic ---

function updateCameraAndObjects(scrollPercent) {
    // --- Camera Movement ---
    // Find the two points in the path surrounding the current scrollPercent
    let startPoint, endPoint;
    for (let i = 0; i < cameraPath.length - 1; i++) {
        if (scrollPercent >= cameraPath[i].scroll && scrollPercent <= cameraPath[i+1].scroll) {
            startPoint = cameraPath[i];
            endPoint = cameraPath[i+1];
            break;
        }
    }

    if (startPoint && endPoint) {
        // Calculate interpolation factor between the two points
        const segmentScroll = (scrollPercent - startPoint.scroll) / (endPoint.scroll - startPoint.scroll);

        // Interpolate camera position using LERP
        camera.position.lerpVectors(startPoint.pos, endPoint.pos, segmentScroll);

        // Interpolate lookAt target
        const lookAtTarget = new THREE.Vector3().lerpVectors(startPoint.lookAt, endPoint.lookAt, segmentScroll);
        camera.lookAt(lookAtTarget);
    } else {
        // Fallback if outside defined path (e.g., stay at start or end)
        if (scrollPercent <= cameraPath[0].scroll) {
            camera.position.copy(cameraPath[0].pos);
            camera.lookAt(cameraPath[0].lookAt);
        } else {
             const lastPoint = cameraPath[cameraPath.length - 1];
             camera.position.copy(lastPoint.pos);
             camera.lookAt(lastPoint.lookAt);
        }
    }


    // --- Object Animations Based on Scroll ---

    // Example: Rotate the central object more as we approach section 2
    const section2Start = 0.15;
    const section2End = 0.45;
    if (scrollPercent > section2Start && scrollPercent < section2End) {
        const section2Progress = (scrollPercent - section2Start) / (section2End - section2Start);
        centralObject.rotation.y = THREE.MathUtils.lerp(0, Math.PI * 1.5, section2Progress);
        centralObject.rotation.x = THREE.MathUtils.lerp(0, Math.PI * 0.5, section2Progress);
    } else if (scrollPercent <= section2Start) {
        centralObject.rotation.y = 0;
        centralObject.rotation.x = 0;
    } else { // Keep rotating after passing section 2 maybe?
         centralObject.rotation.y = Math.PI * 1.5 + (scrollPercent - section2End) * Math.PI * 0.5;
         centralObject.rotation.x = Math.PI * 0.5;
    }


    // Example: Make particles more active around section 3
    const section3Start = 0.5;
    const section3End = 0.75;
    let particleSpeedFactor = 0.01; // Base speed
    if (scrollPercent > section3Start && scrollPercent < section3End) {
         const section3Progress = (scrollPercent - section3Start) / (section3End - section3Start);
         particleSpeedFactor = THREE.MathUtils.lerp(0.01, 0.1, section3Progress); // Increase speed
         // Could also change particle size or color here
    }
    // Apply continuous rotation to particles based on the factor
    particleSystem.rotation.y += 0.001 * (particleSpeedFactor / 0.01); // Rotate faster when active
    particleSystem.rotation.x += 0.0005 * (particleSpeedFactor / 0.01);


    // --- Section Visibility ---
    // Determine which section is currently most visible based on scroll
    // This is a simplified approach; Intersection Observer API is more robust
    const viewportCenter = targetScrollY + window.innerHeight / 2;
    let closestSectionIndex = 0;
    let minDistance = Infinity;

    contentSections.forEach((section, index) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionCenter = sectionTop + sectionHeight / 2;
        const distance = Math.abs(viewportCenter - sectionCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestSectionIndex = index;
        }
    });

    // Update visibility classes only if the section changed
    if (closestSectionIndex !== currentSectionIndex) {
         contentSections[currentSectionIndex].classList.remove('is-visible');
         contentSections[closestSectionIndex].classList.add('is-visible');
         currentSectionIndex = closestSectionIndex;
    }

}


// --- Main Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Smoothly interpolate the scroll position
    targetScrollY = window.scrollY;
    currentScrollY = THREE.MathUtils.lerp(currentScrollY, targetScrollY, scrollLerpFactor);

    // Calculate normalized scroll percentage (0 to 1)
    const scrollableHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = scrollableHeight > 0 ? currentScrollY / scrollableHeight : 0;

    // Update 3D elements based on smoothed scroll position
    updateCameraAndObjects(scrollPercent);

    // Optional: Add continuous subtle animations independent of scroll
    centralObject.rotation.z += 0.001; // Slow constant spin

    // Update controls if using OrbitControls for debugging
    // controls.update();

    // Render the scene
    renderer.render(scene, camera);
}

// --- Event Listeners ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Recalculate section visibility on resize might be needed if layout changes drastically
}

window.addEventListener('resize', onWindowResize);

// --- Initialization ---
function init() {
    // Hide loading screen after a short delay (or use THREE.LoadingManager)
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500); // Adjust delay as needed

    // Set initial section visibility
    contentSections[0].classList.add('is-visible');

    // Start the animation loop
    animate();
}

// --- Handle Potential Errors ---
try {
   init();
} catch (error) {
    console.error("An error occurred during initialization:", error);
    // Display a user-friendly error message on the page
    loadingScreen.innerHTML = "<p>Sorry, an error occurred loading the experience.</p>";
    loadingScreen.style.opacity = '1'; // Ensure error is visible
    loadingScreen.classList.remove('hidden');
}