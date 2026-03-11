// =============================================================================
// Assignment 5 – Mystic Village (Expanded) | Three.js Scene
// Jacky Wu – CSE 160, Spring 2025
// =============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// ---------------------------------------------------------------------------
// Scene, Camera, Renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc8d8e8, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(18, 14, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.target.set(0, 1, 0);

// ---------------------------------------------------------------------------
// LIGHTS – 3 different types
// ---------------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0x5566aa, 0.4));

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
dirLight.position.set(10, 15, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 80;
dirLight.shadow.camera.left = -35; dirLight.shadow.camera.right = 35;
dirLight.shadow.camera.top = 35;   dirLight.shadow.camera.bottom = -35;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const spotLight = new THREE.SpotLight(0xffaa44, 30, 22, Math.PI / 5, 0.6, 1.5);
spotLight.position.set(-3, 5.5, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(1024, 1024);
scene.add(spotLight);
spotLight.target.position.set(-3, 0, 0);
scene.add(spotLight.target);

// ---------------------------------------------------------------------------
// SKY
// ---------------------------------------------------------------------------
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);
const sunPos = new THREE.Vector3();
const skyU = sky.material.uniforms;
skyU['turbidity'].value = 8; skyU['rayleigh'].value = 2.5;
skyU['mieCoefficient'].value = 0.005; skyU['mieDirectionalG'].value = 0.82;
sunPos.setFromSphericalCoords(1, THREE.MathUtils.degToRad(85), THREE.MathUtils.degToRad(200));
skyU['sunPosition'].value.copy(sunPos);
const pmrem = new THREE.PMREMGenerator(renderer);
const skyRT = pmrem.fromScene(sky);
scene.environment = skyRT.texture;

// ---------------------------------------------------------------------------
// Procedural Textures
// ---------------------------------------------------------------------------
function mkTex(draw, size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

const grassTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2000; i++) { ctx.fillStyle = `hsl(${108 + Math.random()*30},${40+Math.random()*30}%,${22+Math.random()*22}%)`; ctx.fillRect(Math.random()*s, Math.random()*s, 1+Math.random()*2, 1+Math.random()*2); }
}, 512); grassTex.repeat.set(16, 16);

const woodTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#7a5a20'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) { ctx.fillStyle = `hsl(32,${35+Math.random()*25}%,${28+Math.random()*16}%)`; ctx.fillRect(0, y, s, 2+Math.random()*2); }
});
const stoneTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#777'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) { const g = 90+Math.random()*110; ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(Math.random()*s, Math.random()*s, 6+Math.random()*18, 6+Math.random()*18); }
});
const brickTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#7a3a1a'; ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < s/18+1; row++) { const off=(row%2)*18; for (let col=-1; col < s/36+2; col++) { ctx.fillStyle = `hsl(${12+Math.random()*12},${48+Math.random()*22}%,${28+Math.random()*16}%)`; ctx.fillRect(col*36+off+1, row*18+1, 34, 16); }}
});
const roofTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#6b2020'; ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < s; row += 12) { const off=(Math.floor(row/12)%2)*16; for (let col=-16; col < s+16; col += 32) { ctx.fillStyle = `hsl(${Math.random()*8},${40+Math.random()*20}%,${25+Math.random()*12}%)`; ctx.beginPath(); ctx.arc(col+off, row, 16, 0, Math.PI, false); ctx.fill(); }}
});
const cobbleTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#665544'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) { const g=80+Math.random()*80; ctx.fillStyle=`rgb(${g+10},${g},${g-10})`; ctx.beginPath(); ctx.ellipse(Math.random()*s, Math.random()*s, 6+Math.random()*8, 5+Math.random()*6, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill(); }
});
const thatchTex = mkTex((ctx, s) => {
    ctx.fillStyle = '#a08040'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) { ctx.strokeStyle=`hsl(38,${30+Math.random()*30}%,${35+Math.random()*25}%)`; ctx.lineWidth=1+Math.random(); ctx.beginPath(); ctx.moveTo(0,y); for (let x=0;x<s;x+=8) ctx.lineTo(x,y+(Math.random()-0.5)*3); ctx.stroke(); }
});

const grassMat = new THREE.MeshStandardMaterial({ map: grassTex });
const brickMat = new THREE.MeshStandardMaterial({ map: brickTex });
const woodMat  = new THREE.MeshStandardMaterial({ map: woodTex });
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex });
const roofMat  = new THREE.MeshStandardMaterial({ map: roofTex });
const cobbleMat= new THREE.MeshStandardMaterial({ map: cobbleTex });
const thatchMat= new THREE.MeshStandardMaterial({ map: thatchTex });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, map: woodTex });

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------
let shapeCount = 0;
function addShape(mesh) { mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); shapeCount++; return mesh; }
function addS(mesh, g) { mesh.castShadow=true; mesh.receiveShadow=true; g.add(mesh); shapeCount++; return mesh; }

// ===========================================================================
//                        POSITION MAP (all major items)
// ===========================================================================
// Plaza:       (0, 0)          radius 5
// House SW:    (-7, -6)        ~3.2×3.2
// House SE:    (7, -7)         ~3.2×3.2
// House NW:    (-9, 5)         ~3.5×3.2
// House E:     (10, 3)         ~3.8×3.5  ← moved from (8,3) to avoid stall
// Chapel:      (0, -14)        ~4×6
// Stall 1:     (5.5, 1)        ~2.5×1.2  ← shifted z from 2→1
// Stall 2:     (-5.5, 2)       ~2.5×1.2
// Stall 3:     (2, 6)          ~2.5×1.2
// Pond:        (-4, 14)        radius 2  ← moved from (-3,11) outside fences
// Well:        (3, 9)
// Windmill:    (-16, -8)
// Watchtower:  (16, -10)
// Bridge:      (16, 0) rotY=PI/2  stream x=7→25 z=-1.5→1.5
// Garden:      (13, 3)
// Cart:        (-6, -13)       ← moved from (-12,-13) away from walls
// N fences:    z=10, from -10→-4 and 4→10
// S fences:    z=-11, from -10→-4 and 4→10
// Stone walls: (±15, ±13)
// ===========================================================================

// ---------------------------------------------------------------------------
// GROUND
// ---------------------------------------------------------------------------
addShape(new THREE.Mesh(new THREE.BoxGeometry(70, 0.4, 70), grassMat)).position.y = -0.2;

// ---------------------------------------------------------------------------
// VILLAGE PLAZA
// ---------------------------------------------------------------------------
addShape(new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.08, 32), cobbleMat)).position.set(0, 0.04, 0);

// ---------------------------------------------------------------------------
// HOUSES
// ---------------------------------------------------------------------------
function buildHouse(x, z, rotY = 0, opts = {}) {
    const g = new THREE.Group();
    const w = opts.width||3.2, h = opts.height||2.6, d = opts.depth||3.2;
    const wM = opts.wallMat||brickMat, rM = opts.roofMat||roofMat;
    addS(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wM), g).position.y = h/2;
    const roof = addS(new THREE.Mesh(new THREE.ConeGeometry(w*0.88,1.6,4), rM), g);
    roof.position.y = h+0.8; roof.rotation.y = Math.PI/4;
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.6,1.3,0.12), darkWoodMat), g).position.set(0,0.65,d/2+0.06);
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.75,0.08,0.14), darkWoodMat), g).position.set(0,1.35,d/2+0.06);
    const winM = new THREE.MeshStandardMaterial({color:0x88bbee, emissive:0x223344, emissiveIntensity:0.3});
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.12), winM), g).position.set(-w/2+0.5,h*0.6,d/2+0.06);
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.12), winM), g).position.set(w/2-0.5,h*0.6,d/2+0.06);
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.5), winM), g).position.set(w/2+0.06,h*0.6,0);
    addS(new THREE.Mesh(new THREE.BoxGeometry(0.5,1.6,0.5), stoneMat), g).position.set(w/2-0.5,h+0.8,-d/2+0.5);
    addS(new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.15,d+0.3), stoneMat), g).position.y = 0.075;
    g.position.set(x,0,z); g.rotation.y = rotY; scene.add(g);
}

buildHouse(-7, -6, 0.2);                                                        // SW
buildHouse(7, -7, -0.3);                                                        // SE
buildHouse(-9, 5, 0.6, { wallMat: stoneMat, roofMat: thatchMat, width: 3.5 });  // NW
buildHouse(8, 6, 0, { width: 3.8, depth: 3.5, height: 3 });                  // E ← moved from (8,3)

// ---------------------------------------------------------------------------
// CHAPEL
// ---------------------------------------------------------------------------
const chapel = new THREE.Group();
addS(new THREE.Mesh(new THREE.BoxGeometry(4,3.5,6), stoneMat), chapel).position.y = 1.75;
addS(new THREE.Mesh(new THREE.BoxGeometry(4.4,0.3,6.4), roofMat), chapel).position.y = 3.65;
addS(new THREE.Mesh(new THREE.BoxGeometry(1.5,3,1.5), stoneMat), chapel).position.set(0,5,-2);
addS(new THREE.Mesh(new THREE.ConeGeometry(1.0,2.5,4), roofMat), chapel).position.set(0,7.75,-2);
addS(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.7,6), new THREE.MeshStandardMaterial({color:0xccaa44})), chapel).position.set(0,9.35,-2);
const crossArm = addS(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,6), new THREE.MeshStandardMaterial({color:0xccaa44})), chapel);
crossArm.position.set(0,9.5,-2); crossArm.rotation.z = Math.PI/2;
addS(new THREE.Mesh(new THREE.BoxGeometry(1.0,2.0,0.12), darkWoodMat), chapel).position.set(0,1,3.06);
addS(new THREE.Mesh(new THREE.SphereGeometry(0.5,16,16), new THREE.MeshStandardMaterial({color:0xaaddff, emissive:0x334466, emissiveIntensity:0.5})), chapel).position.set(0,2.8,3.06);
chapel.position.set(0,0,-14); scene.add(chapel);

// ---------------------------------------------------------------------------
// MARKET STALLS — shifted away from house E
// ---------------------------------------------------------------------------
function buildStall(x, z, rotY=0, color=0xcc4444) {
    const g = new THREE.Group();
    addS(new THREE.Mesh(new THREE.BoxGeometry(2.5,1.0,1.2), woodMat), g).position.y = 0.5;
    [[-1.1,-0.5],[1.1,-0.5],[-1.1,0.5],[1.1,0.5]].forEach(([px,pz])=>{
        addS(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.5,6), woodMat), g).position.set(px,1.25,pz);
    });
    addS(new THREE.Mesh(new THREE.BoxGeometry(2.8,0.06,1.5), new THREE.MeshStandardMaterial({color, side:THREE.DoubleSide})), g).position.y = 2.5;
    addS(new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), new THREE.MeshStandardMaterial({color:0xff6622})), g).position.set(-0.4,1.15,0);
    addS(new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), new THREE.MeshStandardMaterial({color:0xdd2222})), g).position.set(0.2,1.15,0);
    g.position.set(x,0,z); g.rotation.y = rotY; scene.add(g);
}
buildStall(5.5, 0, -0.3, 0xcc4444);   // ← z from 2→0 so it doesn't clip house E
buildStall(-5.5, 2, 0.4, 0x4488cc);
buildStall(1.5, 6, 0.1, 0x44aa44);

// ---------------------------------------------------------------------------
// TREES — removed (15,1) that was inside the bridge stream
// ---------------------------------------------------------------------------
function buildTree(x, z, type='cone', scale=1) {
    const g = new THREE.Group();
    addS(new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale,0.18*scale,1.8*scale,8), woodMat), g).position.y = 0.9*scale;
    if (type==='cone') addS(new THREE.Mesh(new THREE.ConeGeometry(1.1*scale,2.4*scale,8), new THREE.MeshStandardMaterial({color:0x1d7a2f})), g).position.y = 2.8*scale;
    else addS(new THREE.Mesh(new THREE.SphereGeometry(1.0*scale,10,8), new THREE.MeshStandardMaterial({color:0x2e8b57})), g).position.y = 2.5*scale;
    g.position.set(x,0,z); scene.add(g);
}
[
    [-12,9,'cone',1.1],  [-10,12,'sphere',0.9], [-14,5,'cone',1.2],
    [-13,-2,'sphere',1.0], [-15,1,'cone',0.8],  [-14,-6,'cone',1.1],
    [13,10,'cone',1.0],  [15,6,'sphere',1.2],   [13,-2,'cone',0.9],   // (15,1)→(15,6) away from bridge
    [17,4,'sphere',0.8], [11,12,'cone',1.3],     [14,-5,'sphere',1.0], // (15,1)→(17,4)
    [-8,14,'cone',1.1],  [0,16,'sphere',0.9],    [6,14,'cone',1.0],
    [3,-15,'cone',1.2],  [-5,-14,'sphere',1.0],  [-10,-12,'cone',0.9],
    [10,-12,'sphere',1.1], [0,-16,'cone',1.0],
].forEach(([x,z,type,scale])=>buildTree(x,z,type,scale));

// ---------------------------------------------------------------------------
// FENCES — at z=10 (north) and z=-11 (south)
// Pond is now at z=14, well outside the fence line
// ---------------------------------------------------------------------------
function buildFenceSegment(x1,z1,x2,z2,posts=5) {
    for (let i=0; i<posts; i++) {
        const t = i/(posts-1);
        addShape(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.0,6), woodMat))
            .position.set(x1+(x2-x1)*t, 0.5, z1+(z2-z1)*t);
    }
    for (let r=0; r<2; r++) {
        const dx=x2-x1, dz=z2-z1, len=Math.sqrt(dx*dx+dz*dz);
        const rail = addShape(new THREE.Mesh(new THREE.BoxGeometry(len,0.06,0.06), woodMat));
        rail.position.set((x1+x2)/2, 0.35+r*0.35, (z1+z2)/2);
        rail.rotation.y = -Math.atan2(dz, dx);
    }
}
buildFenceSegment(-10, 10, -4, 10, 5);   // North-left
buildFenceSegment(4, 10, 10, 10, 5);     // North-right
buildFenceSegment(-10, -11, -4, -11, 5); // South-left
buildFenceSegment(4, -11, 10, -11, 5);   // South-right

// ---------------------------------------------------------------------------
// BRIDGE
// ---------------------------------------------------------------------------
const bridgeGroup = new THREE.Group();
addS(new THREE.Mesh(new THREE.BoxGeometry(3,0.05,18), new THREE.MeshStandardMaterial({color:0x3388bb,transparent:true,opacity:0.7,metalness:0.1,roughness:0.2})), bridgeGroup).position.set(0,0.02,0);
addS(new THREE.Mesh(new THREE.BoxGeometry(4.5,0.25,3), woodMat), bridgeGroup).position.y = 0.35;
addS(new THREE.Mesh(new THREE.BoxGeometry(0.08,0.7,3), woodMat), bridgeGroup).position.set(-2.1,0.8,0);
addS(new THREE.Mesh(new THREE.BoxGeometry(0.08,0.7,3), woodMat), bridgeGroup).position.set(2.1,0.8,0);
[[-2.1,-1.2],[-2.1,1.2],[2.1,-1.2],[2.1,1.2]].forEach(([bx,bz])=>{
    addS(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.1,6), woodMat), bridgeGroup).position.set(bx,0.9,bz);
});
bridgeGroup.position.set(16,0,0); bridgeGroup.rotation.y = Math.PI/2; scene.add(bridgeGroup);

// ---------------------------------------------------------------------------
// POND — moved to z=14, well outside fences (was z=11, clipping fence z=10)
// ---------------------------------------------------------------------------
const pondRim = addShape(new THREE.Mesh(new THREE.TorusGeometry(2.0,0.25,10,28), stoneMat));
pondRim.rotation.x = -Math.PI/2; pondRim.position.set(-4, 0.15, 14);
const waterMat = new THREE.MeshStandardMaterial({color:0x3388bb,transparent:true,opacity:0.65,metalness:0.1,roughness:0.2});
addShape(new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,0.06,28), waterMat)).position.set(-4, 0.06, 14);

// ---------------------------------------------------------------------------
// WINDMILL
// ---------------------------------------------------------------------------
const windmillGroup = new THREE.Group();
addS(new THREE.Mesh(new THREE.CylinderGeometry(0.7,1.0,4.5,8), stoneMat), windmillGroup).position.y = 2.25;
addS(new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), new THREE.MeshStandardMaterial({color:0x444444})), windmillGroup).position.set(0,4.2,1.05);
const bladesGroup = new THREE.Group();
bladesGroup.position.set(0,4.2,1.1);
for (let i=0; i<4; i++) {
    const arm = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28,2.2,0.04), woodMat);
    blade.castShadow=true; blade.position.y=1.1;
    arm.add(blade); arm.rotation.z=(Math.PI/2)*i; bladesGroup.add(arm); shapeCount++;
}
windmillGroup.add(bladesGroup); windmillGroup.position.set(-16,0,-8); scene.add(windmillGroup);

// ---------------------------------------------------------------------------
// WATCHTOWER
// ---------------------------------------------------------------------------
const tower = new THREE.Group();
addS(new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,6,8), stoneMat), tower).position.y = 3;
addS(new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,0.2,8), woodMat), tower).position.y = 6.1;
addS(new THREE.Mesh(new THREE.ConeGeometry(2.0,1.5,8), roofMat), tower).position.y = 7.05;
for (let i=0;i<4;i++) { const a=(Math.PI/2)*i+Math.PI/4; addS(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.6,6), woodMat), tower).position.set(Math.cos(a)*1.5,6.9,Math.sin(a)*1.5); }
tower.position.set(16,0,-10); scene.add(tower);

// ---------------------------------------------------------------------------
// LAMP POSTS
// ---------------------------------------------------------------------------
const lampMats = [];
[[-4,-1],[4,-4],[5,-2],[-7,8],[0,-9]].forEach(([lx,lz])=>{
    addShape(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.07,3.2,6), new THREE.MeshStandardMaterial({color:0x2a2a2a}))).position.set(lx,1.6,lz);
    const lm = new THREE.MeshStandardMaterial({color:0xffcc55,emissive:0xffaa22,emissiveIntensity:1.5});
    lampMats.push(lm);
    addShape(new THREE.Mesh(new THREE.SphereGeometry(0.18,10,10), lm)).position.set(lx,3.3,lz);
});

// ---------------------------------------------------------------------------
// WELL
// ---------------------------------------------------------------------------
const wellGroup = new THREE.Group();
addS(new THREE.Mesh(new THREE.TorusGeometry(0.6,0.15,8,16), stoneMat), wellGroup).position.y = 0.6;
addS(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.6,6), woodMat), wellGroup).position.set(-0.45,1.2,0);
addS(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.6,6), woodMat), wellGroup).position.set(0.45,1.2,0);
addS(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.08,0.5), woodMat), wellGroup).position.y = 2.05;
addS(new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,0.2,8), woodMat), wellGroup).position.y = 0.8;
wellGroup.position.set(3,0,9); scene.add(wellGroup);

// ---------------------------------------------------------------------------
// BARRELS & CRATES
// ---------------------------------------------------------------------------
function addBarrel(x,z,rotX=0) { const b=addShape(new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.28,0.7,10), woodMat)); b.position.set(x,0.35,z); b.rotation.x=rotX; }
function addCrate(x,z,s=0.5) { addShape(new THREE.Mesh(new THREE.BoxGeometry(s,s,s), woodMat)).position.set(x,s/2,z); }
addBarrel(-6,-3.5); addBarrel(-6.3,-3.0); addBarrel(-5.7,-3.8,0.3);
addCrate(8.5,-5,0.5); addCrate(8.8,-4.5,0.45); addCrate(8.5,-4.5,0.6); addCrate(9.1,-5,0.4);

// ---------------------------------------------------------------------------
// ROCKS
// ---------------------------------------------------------------------------
[[11,14],[11.8,14.5],[12.4,13.8],[-12,-4],[-11.5,-3.5],[0,16],[-1,15.5],[14,7],[15,7.5]].forEach(([rx,rz])=>{
    const r=addShape(new THREE.Mesh(new THREE.DodecahedronGeometry(0.25+Math.random()*0.35,0), stoneMat));
    r.position.set(rx,0.2,rz); r.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);
});

// ---------------------------------------------------------------------------
// GARDEN — at (13,3), safely away from house E at (10,3)
// ---------------------------------------------------------------------------
const gardenGroup = new THREE.Group();
addS(new THREE.Mesh(new THREE.BoxGeometry(3,0.15,1), new THREE.MeshStandardMaterial({color:0x4a3520})), gardenGroup).position.set(0,0.075,0);
addS(new THREE.Mesh(new THREE.BoxGeometry(3,0.15,1), new THREE.MeshStandardMaterial({color:0x4a3520})), gardenGroup).position.set(0,0.075,1.4);
[0xff6699,0xffcc33,0xff4444,0xaa55ff,0xff8844,0x44aaff,0xff6699,0xffcc33].forEach((col,i)=>{
    addS(new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6), new THREE.MeshStandardMaterial({color:col})), gardenGroup)
        .position.set(-1.2+i*0.35, 0.25, Math.random()>0.5?0:1.4);
});
gardenGroup.position.set(13,0,8); scene.add(gardenGroup);

// ---------------------------------------------------------------------------
// CART — moved to (-6,-13), well away from all walls/fences
// Handle now overlaps cart body so it's connected
// Wheels: no rotation = vertical in XY plane, parallel to cart sides
// ---------------------------------------------------------------------------
const cartGroup = new THREE.Group();
// Body: x spans -1 to 1 in local coords
addS(new THREE.Mesh(new THREE.BoxGeometry(2,0.6,1.2), woodMat), cartGroup).position.set(0,0.7,0);
// Side walls
addS(new THREE.Mesh(new THREE.BoxGeometry(2,0.4,0.06), woodMat), cartGroup).position.set(0,1.2,0.57);
addS(new THREE.Mesh(new THREE.BoxGeometry(2,0.4,0.06), woodMat), cartGroup).position.set(0,1.2,-0.57);

// Wheels — default torus is a vertical ring in XY plane. No rotation needed.
const wheelMat = new THREE.MeshStandardMaterial({color:0x3a2a10});
addS(new THREE.Mesh(new THREE.TorusGeometry(0.35,0.06,8,16), wheelMat), cartGroup).position.set(-0.5,0.35,0.66);
addS(new THREE.Mesh(new THREE.TorusGeometry(0.35,0.06,8,16), wheelMat), cartGroup).position.set(-0.5,0.35,-0.66);

// Handle: starts at x=0.9 (overlapping cart body edge at x=1) so it's connected
// Cylinder is length 1.8, tilted 25° forward
const handle = addS(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.8,6), woodMat), cartGroup);
handle.position.set(1.7, 0.45, 0);
handle.rotation.z = -Math.PI / 2.5;   // tilted ~72° from vertical = nearly horizontal pointing forward

cartGroup.position.set(-6,0,-13); cartGroup.rotation.y = 0.3; scene.add(cartGroup);

// ---------------------------------------------------------------------------
// STONE WALLS — at ±15, ±13 (cart is at -6,-13 = well clear)
// ---------------------------------------------------------------------------
function buildWall(x,z,len,rotY=0) { const w=addShape(new THREE.Mesh(new THREE.BoxGeometry(len,1.2,0.5), stoneMat)); w.position.set(x,0.6,z); w.rotation.y=rotY; }
buildWall(-15,-13,6,0.1); buildWall(15,-13,6,-0.1);
buildWall(-15,13,6,-0.1); buildWall(15,13,6,0.1);

// ---------------------------------------------------------------------------
// FLOATING MAGIC ORBS
// ---------------------------------------------------------------------------
const orbs = [];
[0x44aaff,0xff66aa,0x66ffaa,0xffaa44].forEach((col,i)=>{
    const orb = addShape(new THREE.Mesh(new THREE.SphereGeometry(0.2,16,16), new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.8,transparent:true,opacity:0.85})));
    orb.userData = {baseX:Math.cos((Math.PI/2)*i)*4, baseZ:Math.sin((Math.PI/2)*i)*4, phase:i*1.5};
    orbs.push(orb);
});

console.log(`Total primary shapes: ${shapeCount}`);

// ---------------------------------------------------------------------------
// TEXTURED 3D MODEL — centered on plaza
// ---------------------------------------------------------------------------
const gltfLoader = new GLTFLoader();
gltfLoader.load('model.glb', (gltf)=>{
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const sz = box.getSize(new THREE.Vector3());
    model.scale.setScalar(2.0/Math.max(sz.x,sz.y,sz.z));
    model.position.set(0,0,0);
    model.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    scene.add(model); hideLoading();
}, undefined, ()=>{
    const objLoader = new OBJLoader();
    objLoader.load('teapot.obj', obj=>{
        obj.traverse(c=>{if(c.isMesh){c.material=new THREE.MeshPhysicalMaterial({color:0xc8a050,metalness:0.6,roughness:0.25,clearcoat:0.4});c.castShadow=true;c.receiveShadow=true;}});
        obj.scale.setScalar(0.6); obj.position.set(0,0,0); scene.add(obj); hideLoading();
    }, undefined, ()=>{
        const fb=new THREE.Mesh(new THREE.TorusKnotGeometry(0.6,0.2,80,16), new THREE.MeshPhysicalMaterial({color:0xcc8833,metalness:0.7,roughness:0.15,clearcoat:0.6}));
        fb.position.set(0,1.2,0); fb.castShadow=true; scene.add(fb); hideLoading();
    });
});

// ---------------------------------------------------------------------------
// PARTICLE FIREFLIES
// ---------------------------------------------------------------------------
const PARTICLE_COUNT = 250;
const particleGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PARTICLE_COUNT*3), pVel = [];
for (let i=0;i<PARTICLE_COUNT;i++) {
    pPos[i*3]=(Math.random()-0.5)*50; pPos[i*3+1]=0.5+Math.random()*6; pPos[i*3+2]=(Math.random()-0.5)*50;
    pVel.push({x:(Math.random()-0.5)*0.012, z:(Math.random()-0.5)*0.012, phase:Math.random()*Math.PI*2});
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particleMat = new THREE.PointsMaterial({color:0xffffaa,size:0.12,transparent:true,opacity:0.85,sizeAttenuation:true,depthWrite:false});
scene.add(new THREE.Points(particleGeo, particleMat));

// ---------------------------------------------------------------------------
function hideLoading() { const el=document.getElementById('loading'); if(el){el.classList.add('hidden'); setTimeout(()=>el.remove(),700);} }
setTimeout(hideLoading, 4000);

// ---------------------------------------------------------------------------
// ANIMATION
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    bladesGroup.rotation.z = t*0.6;
    orbs.forEach(o=>{const d=o.userData; o.position.set(d.baseX+Math.sin(t*0.5+d.phase)*2, 2.5+Math.sin(t*0.8+d.phase)*1.2, d.baseZ+Math.cos(t*0.5+d.phase)*2);});
    const pa = particleGeo.attributes.position.array;
    for (let i=0;i<PARTICLE_COUNT;i++) {
        const v=pVel[i], idx=i*3;
        pa[idx]+=v.x+Math.sin(t*0.8+v.phase)*0.003;
        pa[idx+1]+=Math.sin(t*1.5+v.phase)*0.006;
        pa[idx+2]+=v.z+Math.cos(t*0.8+v.phase)*0.003;
        if(pa[idx]>25)pa[idx]=-25; if(pa[idx]<-25)pa[idx]=25;
        if(pa[idx+2]>25)pa[idx+2]=-25; if(pa[idx+2]<-25)pa[idx+2]=25;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleMat.opacity = 0.55+Math.sin(t*3)*0.3;
    waterMat.opacity = 0.55+Math.sin(t*2.5)*0.12;
    lampMats.forEach((lm,i)=>{lm.emissiveIntensity=1.2+Math.sin(t*12+i*2)*0.3+Math.sin(t*7.3+i)*0.15;});
    spotLight.intensity = 28+Math.sin(t*1.2)*5;
    controls.update();
    renderer.render(scene, camera);
}
window.addEventListener('resize', ()=>{camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight);});
animate();
