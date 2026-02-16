// World.js - Main application for CSE160 Assignment 3: Virtual World

// ============================================================
// Shader source code
// ============================================================
const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_BaseColor;
  uniform float u_TexColorWeight;
  uniform int u_WhichTexture;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  void main() {
    vec4 texColor;
    if (u_WhichTexture == 0) {
      texColor = texture2D(u_Sampler0, v_UV);
    } else if (u_WhichTexture == 1) {
      texColor = texture2D(u_Sampler1, v_UV);
    } else if (u_WhichTexture == 2) {
      texColor = texture2D(u_Sampler2, v_UV);
    } else if (u_WhichTexture == 3) {
      texColor = texture2D(u_Sampler3, v_UV);
    } else {
      texColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
    gl_FragColor = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texColor;
  }
`;

// ============================================================
// Global variables
// ============================================================
let canvas, gl;
let camera;

// Shader locations
let a_Position, a_UV;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_TexColorWeight, u_WhichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;

// Buffers
let g_vertexBuffer, g_uvBuffer;

// World data
let g_map = [];
const MAP_SIZE = 32;

// Batched world geometry - pre-sorted by texture for minimal draw calls
let g_batchByTex = [null, null, null, null]; // {verts, uvs, count} per texture
let g_worldDirty = true;

// Performance
let g_lastFrameTime = 0;
let g_fps = 0;

// Game state
let g_treasures = [];
let g_treasuresFound = 0;
let g_totalTreasures = 0;
let g_gameWon = false;
let g_messageTimer = 0;
let g_messageText = "";

// Goat animal
let g_goatPos = { x: 17, y: 0, z: 14 };
let g_goatAngle = 0;
let g_goatLegAngle = 0;
let g_goatLegDir = 1;
let g_goatFacing = 0;          // current facing angle in radians
let g_goatTargetFacing = 0;    // target angle to turn toward
let g_goatSpeed = 0.02;
let g_goatWanderTimer = 0;     // frames until next direction change
let g_goatWalking = true;

// Keys held
let g_keysDown = {};

// Mouse
let g_mouseSensitivity = 0.15;

// ============================================================
// 32x32 World Map - values are wall heights (0-4)
// ============================================================
function initWorldMap() {
  // Initialize empty map
  for (let i = 0; i < MAP_SIZE; i++) {
    g_map[i] = [];
    for (let j = 0; j < MAP_SIZE; j++) {
      g_map[i][j] = 0;
    }
  }

  // Build border walls (height 4)
  for (let i = 0; i < MAP_SIZE; i++) {
    g_map[i][0] = 4;
    g_map[i][MAP_SIZE-1] = 4;
    g_map[0][i] = 4;
    g_map[MAP_SIZE-1][i] = 4;
  }

  // Room 1 - Entrance hall (bottom-left)
  for (let i = 2; i < 10; i++) { g_map[i][10] = 3; }
  for (let j = 2; j < 10; j++) { g_map[10][j] = 3; }
  g_map[6][10] = 0; // Doorway

  // Room 2 - Garden courtyard (top-left)
  for (let i = 2; i < 15; i++) { g_map[i][20] = 2; }
  for (let j = 12; j < 20; j++) { g_map[15][j] = 2; }
  g_map[8][20] = 0; // Doorway
  g_map[15][16] = 0; // Doorway

  // Room 3 - Tower (top-right)
  for (let i = 20; i < 28; i++) { g_map[i][20] = 4; g_map[i][28] = 4; }
  for (let j = 20; j < 28; j++) { g_map[20][j] = 4; g_map[28][j] = 4; }
  g_map[24][20] = 0; // Entrance
  // Inner tower pillar
  g_map[23][23] = 4; g_map[23][25] = 4;
  g_map[25][23] = 4; g_map[25][25] = 4;

  // Maze section (center)
  for (let i = 12; i < 20; i++) { g_map[i][12] = 2; }
  for (let j = 5; j < 12; j++) { g_map[18][j] = 2; }
  g_map[15][12] = 0; // Opening
  g_map[18][8] = 0;  // Opening

  // Scattered structures
  // Small house
  for (let i = 25; i < 30; i++) { g_map[i][5] = 3; g_map[i][10] = 3; }
  for (let j = 5; j < 10; j++) { g_map[25][j] = 3; g_map[30][j] = 3; }
  g_map[27][5] = 0; // Door

  // Some single pillars for decoration
  g_map[5][15] = 1; g_map[7][15] = 1; g_map[9][15] = 1;
  g_map[5][17] = 1; g_map[7][17] = 1; g_map[9][17] = 1;

  // Winding path walls
  for (let i = 12; i < 18; i++) { g_map[i][25] = 1; }
  for (let j = 25; j < 30; j++) { g_map[12][j] = 1; }
  g_map[14][25] = 0;

  // Some height variety
  g_map[3][3] = 2; g_map[3][4] = 1; g_map[4][3] = 1;
  g_map[14][7] = 3; g_map[15][7] = 2; g_map[16][7] = 1;

  // Step pyramid
  g_map[22][12] = 4;
  g_map[21][12] = 3; g_map[23][12] = 3; g_map[22][11] = 3; g_map[22][13] = 3;
  g_map[20][12] = 2; g_map[24][12] = 2; g_map[22][10] = 2; g_map[22][14] = 2;
  g_map[21][11] = 2; g_map[21][13] = 2; g_map[23][11] = 2; g_map[23][13] = 2;

  // Place treasures (gold blocks hidden around the world at ground level)
  g_treasures = [
    { x: 4, y: 0, z: 5, found: false },   // Hidden in entrance hall corner
    { x: 23, y: 0, z: 24, found: false },  // Inside tower room
    { x: 27, y: 0, z: 8, found: false },   // Inside small house
    { x: 8, y: 0, z: 16, found: false },   // Between pillar decorations
    { x: 16, y: 0, z: 8, found: false },   // Dead end in maze area
  ];
  g_totalTreasures = g_treasures.length;
  g_treasuresFound = 0;
}

// ============================================================
// Procedural Texture Generation
// ============================================================
function generateTexture(type, size) {
  size = size || 64;
  let canvas2d = document.createElement('canvas');
  canvas2d.width = size;
  canvas2d.height = size;
  let ctx = canvas2d.getContext('2d');
  let imgData = ctx.createImageData(size, size);
  let data = imgData.data;

  // Simple seeded random for consistency
  let seed = 12345;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  if (type === 'dirt') {
    // Brown dirt texture with specks
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let i = (y * size + x) * 4;
        let v = rand();
        let r = 120 + v * 40;
        let g = 80 + v * 30;
        let b = 40 + v * 20;
        // Add darker spots
        if (rand() < 0.08) { r -= 30; g -= 20; b -= 15; }
        // Add lighter specks
        if (rand() < 0.05) { r += 20; g += 15; b += 10; }
        data[i]   = Math.min(255, Math.max(0, r));
        data[i+1] = Math.min(255, Math.max(0, g));
        data[i+2] = Math.min(255, Math.max(0, b));
        data[i+3] = 255;
      }
    }
  } else if (type === 'grass') {
    // Green grass texture with variation
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let i = (y * size + x) * 4;
        let v = rand();
        let r = 60 + v * 30;
        let g = 140 + v * 40;
        let b = 40 + v * 20;
        // Grass blade patterns
        if (rand() < 0.1) { g += 25; }
        if (rand() < 0.06) { r -= 10; g -= 15; b -= 5; }
        data[i]   = Math.min(255, Math.max(0, r));
        data[i+1] = Math.min(255, Math.max(0, g));
        data[i+2] = Math.min(255, Math.max(0, b));
        data[i+3] = 255;
      }
    }
  } else if (type === 'stone') {
    // Gray stone texture
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let i = (y * size + x) * 4;
        let v = rand();
        let base = 128 + v * 40 - 20;
        // Crack lines
        let crack = (Math.sin(x * 0.5 + rand() * 2) + Math.sin(y * 0.3 + rand())) * 10;
        base += crack;
        if (rand() < 0.05) base -= 25;
        data[i]   = Math.min(255, Math.max(0, base));
        data[i+1] = Math.min(255, Math.max(0, base - 5));
        data[i+2] = Math.min(255, Math.max(0, base + 3));
        data[i+3] = 255;
      }
    }
  } else if (type === 'gold') {
    // Gold/treasure texture
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let i = (y * size + x) * 4;
        let v = rand();
        let shine = Math.sin(x * 0.3) * Math.sin(y * 0.3) * 20;
        data[i]   = Math.min(255, Math.max(0, 220 + v * 35 + shine));
        data[i+1] = Math.min(255, Math.max(0, 180 + v * 30 + shine));
        data[i+2] = Math.min(255, Math.max(0, 40 + v * 20));
        data[i+3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas2d;
}

// ============================================================
// WebGL Initialization
// ============================================================
function initShaders(gl, vshader, fshader) {
  let vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vshader);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
    return false;
  }

  let fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fshader);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
    return false;
  }

  let program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Shader link error:', gl.getProgramInfoLog(program));
    return false;
  }
  gl.useProgram(program);
  gl.program = program;
  return true;
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('Failed to get WebGL context');
    return false;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5, 0.7, 1.0, 1.0); // Light blue sky color
  return true;
}

function connectVariablesToGLSL() {
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_TexColorWeight = gl.getUniformLocation(gl.program, 'u_TexColorWeight');
  u_WhichTexture = gl.getUniformLocation(gl.program, 'u_WhichTexture');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');

  // Create buffers
  g_vertexBuffer = gl.createBuffer();
  g_uvBuffer = gl.createBuffer();
}

function initTextures() {
  // Generate procedural textures
  let textures = [
    { canvas: generateTexture('dirt', 64), unit: gl.TEXTURE0, sampler: u_Sampler0, idx: 0 },
    { canvas: generateTexture('grass', 64), unit: gl.TEXTURE1, sampler: u_Sampler1, idx: 1 },
    { canvas: generateTexture('stone', 64), unit: gl.TEXTURE2, sampler: u_Sampler2, idx: 2 },
    { canvas: generateTexture('gold', 64), unit: gl.TEXTURE3, sampler: u_Sampler3, idx: 3 },
  ];

  for (let t of textures) {
    let texture = gl.createTexture();
    gl.activeTexture(t.unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.canvas);
    gl.uniform1i(t.sampler, t.idx);
  }
}

// ============================================================
// Cube geometry - unit cube [0,1]^3 with UV coordinates
// ============================================================
// Returns { vertices: Float32Array, uvs: Float32Array } for a unit cube
// 36 vertices (6 faces * 2 triangles * 3 vertices)
function getCubeData() {
  let v = new Float32Array([
    // Front face
    0,0,1, 1,0,1, 1,1,1,   0,0,1, 1,1,1, 0,1,1,
    // Back face
    1,0,0, 0,0,0, 0,1,0,   1,0,0, 0,1,0, 1,1,0,
    // Top face
    0,1,1, 1,1,1, 1,1,0,   0,1,1, 1,1,0, 0,1,0,
    // Bottom face
    0,0,0, 1,0,0, 1,0,1,   0,0,0, 1,0,1, 0,0,1,
    // Right face
    1,0,1, 1,0,0, 1,1,0,   1,0,1, 1,1,0, 1,1,1,
    // Left face
    0,0,0, 0,0,1, 0,1,1,   0,0,0, 0,1,1, 0,1,0,
  ]);

  let uv = new Float32Array([
    // Front
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
    // Back
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
    // Top
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
    // Bottom
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
    // Right
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
    // Left
    0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
  ]);

  return { vertices: v, uvs: uv };
}

// ============================================================
// Build batched world geometry for performance
// ============================================================
function buildWorldGeometry() {
  let cubeData = getCubeData();
  let cubeVerts = cubeData.vertices;
  let cubeUVs = cubeData.uvs;
  let numCubeVerts = 36;

  // Collect vertices grouped by texture ID
  let buckets = [ [], [], [], [] ]; // verts per texture
  let uvBuckets = [ [], [], [], [] ];

  // Wall cubes from map
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      let h = g_map[x][z];
      for (let y = 0; y < h; y++) {
        // Simple occlusion: skip cubes fully surrounded
        let exposed = (y === h-1) ||
          (x === 0 || g_map[x-1][z] <= y) ||
          (x === MAP_SIZE-1 || g_map[x+1][z] <= y) ||
          (z === 0 || g_map[x][z-1] <= y) ||
          (z === MAP_SIZE-1 || g_map[x][z+1] <= y) ||
          (y === 0);
        if (!exposed) continue;

        let texID;
        if (h >= 4) texID = 2; // Stone for tall walls
        else texID = 0; // Dirt for all other walls

        let bv = buckets[texID], buv = uvBuckets[texID];
        for (let v = 0; v < numCubeVerts; v++) {
          bv.push(cubeVerts[v*3] + x, cubeVerts[v*3+1] + y, cubeVerts[v*3+2] + z);
          buv.push(cubeUVs[v*2], cubeUVs[v*2+1]);
        }
      }
    }
  }

  // Add treasure cubes (gold texture = 3)
  for (let t of g_treasures) {
    if (t.found) continue;
    let bv = buckets[3], buv = uvBuckets[3];
    for (let v = 0; v < numCubeVerts; v++) {
      bv.push(cubeVerts[v*3] + t.x, cubeVerts[v*3+1] + t.y, cubeVerts[v*3+2] + t.z);
      buv.push(cubeUVs[v*2], cubeUVs[v*2+1]);
    }
  }

  // Convert to typed arrays and cache
  for (let i = 0; i < 4; i++) {
    if (buckets[i].length > 0) {
      g_batchByTex[i] = {
        verts: new Float32Array(buckets[i]),
        uvs: new Float32Array(uvBuckets[i]),
        count: buckets[i].length / 3
      };
    } else {
      g_batchByTex[i] = null;
    }
  }

  g_worldDirty = false;
}

// ============================================================
// Drawing functions
// ============================================================
function drawCube(gl, M, color, texWeight, texID) {
  let cubeData = getCubeData();

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_TexColorWeight, texWeight);
  gl.uniform1i(u_WhichTexture, texID);

  // Position
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // UV
  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.uvs, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawBatchedWorld() {
  if (g_worldDirty) {
    buildWorldGeometry();
  }

  let identityMatrix = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);

  // Draw one batch per texture type (max 4 draw calls for entire world)
  for (let texID = 0; texID < 4; texID++) {
    let batch = g_batchByTex[texID];
    if (!batch) continue;

    gl.uniform1f(u_TexColorWeight, 1.0);
    gl.uniform4f(u_BaseColor, 1.0, 1.0, 1.0, 1.0);
    gl.uniform1i(u_WhichTexture, texID);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, batch.count);
  }
}

function drawGround() {
  let M = new Matrix4();
  M.setTranslate(0, -0.5, 0);
  M.scale(MAP_SIZE, 0.5, MAP_SIZE);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_BaseColor, 0.3, 0.6, 0.2, 1.0);
  gl.uniform1f(u_TexColorWeight, 1.0);
  gl.uniform1i(u_WhichTexture, 1); // Grass texture

  let cubeData = getCubeData();
  // Scale UVs for ground tiling
  let uvs = new Float32Array(cubeData.uvs.length);
  for (let i = 0; i < cubeData.uvs.length; i++) {
    uvs[i] = cubeData.uvs[i] * MAP_SIZE; // Tile the texture
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawSky() {
  let M = new Matrix4();
  M.setTranslate(-500, -200, -500);
  M.scale(1000, 1000, 1000);
  // Sky uses base color only (no texture)
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_BaseColor, 0.53, 0.81, 0.92, 1.0); // Sky blue
  gl.uniform1f(u_TexColorWeight, 0.0); // Pure base color
  gl.uniform1i(u_WhichTexture, 0);

  let cubeData = getCubeData();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.uvs, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ============================================================
// Draw Goat - ported from ASG2 with proper hierarchical joints
// ============================================================
function drawGoat() {
  // --- Wandering AI / Celebration ---
  g_goatAngle += 0.5;
  let walkTime = g_goatAngle * 0.02;
  let celebrateY = 0; // extra Y offset for jumping

  if (g_gameWon) {
    // CELEBRATION: spin in place and bounce up and down
    g_goatFacing += 0.08; // spin fast
    celebrateY = Math.abs(Math.sin(walkTime * 5)) * 1.2; // bouncy jump
    g_goatLegAngle += g_goatLegDir * 3;
    if (g_goatLegAngle > 35 || g_goatLegAngle < -35) g_goatLegDir *= -1;
    g_goatWalking = true;
  } else {
    g_goatWanderTimer--;

    // Pick a new random direction periodically
    if (g_goatWanderTimer <= 0) {
      g_goatTargetFacing = Math.random() * Math.PI * 2;
      g_goatWanderTimer = 120 + Math.floor(Math.random() * 240); // 2-6 seconds
      g_goatWalking = Math.random() > 0.2; // 80% chance to walk, 20% to pause
    }

    // Smoothly turn toward target facing
    let angleDiff = g_goatTargetFacing - g_goatFacing;
    // Wrap to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    g_goatFacing += angleDiff * 0.05; // smooth turn

    // Move forward if walking
    if (g_goatWalking) {
      let dx = Math.cos(g_goatFacing) * g_goatSpeed;
      let dz = -Math.sin(g_goatFacing) * g_goatSpeed;
      let nx = g_goatPos.x + dx;
      let nz = g_goatPos.z + dz;

      // Wall collision check (with margin)
      let margin = 0.5;
      let gx1 = Math.floor(nx - margin), gx2 = Math.floor(nx + margin);
      let gz1 = Math.floor(nz - margin), gz2 = Math.floor(nz + margin);
      let blocked = false;
      for (let cx = gx1; cx <= gx2; cx++) {
        for (let cz = gz1; cz <= gz2; cz++) {
          if (cx < 1 || cx >= MAP_SIZE-1 || cz < 1 || cz >= MAP_SIZE-1) { blocked = true; break; }
          if (g_map[cx] && g_map[cx][cz] > 0) { blocked = true; break; }
        }
        if (blocked) break;
      }

      if (!blocked) {
        g_goatPos.x = nx;
        g_goatPos.z = nz;
      } else {
        // Hit a wall, pick a new direction immediately
        g_goatTargetFacing = g_goatFacing + Math.PI * 0.5 + Math.random() * Math.PI;
        g_goatWanderTimer = 60 + Math.floor(Math.random() * 120);
      }

      g_goatLegAngle += g_goatLegDir * 1.5;
      if (g_goatLegAngle > 20 || g_goatLegAngle < -20) g_goatLegDir *= -1;
    } else {
      // Idle: slowly return legs to neutral
      g_goatLegAngle *= 0.9;
    }
  }

  let gx = g_goatPos.x;
  let gz = g_goatPos.z;
  let facing = g_goatFacing * 180 / Math.PI;

  // Walking animation values
  let walkSpeed = walkTime * 4;
  let legScale = g_goatWalking ? 1.0 : Math.abs(g_goatLegAngle) / 20;
  let celebScale = g_gameWon ? 1.5 : 1.0; // exaggerated legs when celebrating
  let fLLeg = 20 * Math.sin(walkSpeed) * legScale * celebScale;
  let fRLeg = -20 * Math.sin(walkSpeed) * legScale * celebScale;
  let bLLeg = -20 * Math.sin(walkSpeed) * legScale * celebScale;
  let bRLeg = 20 * Math.sin(walkSpeed) * legScale * celebScale;
  let fLFoot = 10 * Math.sin(walkSpeed - 0.5) * legScale * celebScale;
  let fRFoot = -10 * Math.sin(walkSpeed - 0.5) * legScale * celebScale;
  let bLFoot = -10 * Math.sin(walkSpeed - 0.5) * legScale * celebScale;
  let bRFoot = 10 * Math.sin(walkSpeed - 0.5) * legScale * celebScale;
  let tailAng = g_gameWon ? 40 * Math.sin(walkTime * 12) : 15 * Math.sin(walkTime * 6);
  let headAng = g_gameWon ? 20 * Math.sin(walkSpeed * 2) : 5 * Math.sin(walkSpeed) * legScale;
  let earAng = g_gameWon ? 20 * Math.sin(walkTime * 10) : 8 * Math.sin(walkTime * 5);

  // Scale factor to make the goat visible in world (ASG2 goat is ~0.5 units)
  let S = 2.0;

  // Base matrix: position in world, rotate to face direction, scale up
  // ASG2 lowest point (hoof bottom) is at y=-0.40, offset to sit on ground
  let base = new Matrix4();
  base.setTranslate(gx, 0.40 * S + celebrateY, gz);
  base.rotate(facing, 0, 1, 0);
  base.scale(S, S, S);

  // Goat colors from ASG2
  const BODY  = [0.9, 0.88, 0.85, 1.0];
  const DARK  = [0.4, 0.35, 0.3, 1.0];
  const FACE  = [0.85, 0.82, 0.78, 1.0];
  const BEARD = [0.95, 0.93, 0.9, 1.0];

  // Helper: create matrix relative to base
  function b() { return new Matrix4(base); }
  function fromMat(m) { return new Matrix4(m); }

  // ---- BODY ----
  let M = b();
  M.translate(-0.25, -0.05, -0.12);
  M.scale(0.5, 0.28, 0.24);
  drawCube(gl, M, BODY, 0.0, 0);

  // ---- NECK ----
  M = b();
  M.translate(0.18, 0.05, -0.08);
  M.rotate(20, 0, 0, 1);
  M.scale(0.12, 0.22, 0.16);
  drawCube(gl, M, BODY, 0.0, 0);

  // ---- HEAD (with head bob) ----
  let headMat = b();
  headMat.translate(0.28, 0.22, -0.07);
  headMat.rotate(headAng, 0, 0, 1);

  M = fromMat(headMat);
  M.scale(0.18, 0.14, 0.14);
  drawCube(gl, M, FACE, 0.0, 0);

  // Snout
  M = fromMat(headMat);
  M.translate(0.14, -0.02, 0.02);
  M.scale(0.1, 0.08, 0.1);
  drawCube(gl, M, FACE, 0.0, 0);

  // Nose
  M = fromMat(headMat);
  M.translate(0.23, 0.0, 0.04);
  M.scale(0.02, 0.04, 0.06);
  drawCube(gl, M, [0.3, 0.25, 0.2, 1.0], 0.0, 0);

  // Beard
  M = fromMat(headMat);
  M.translate(0.12, -0.08, 0.04);
  M.scale(0.06, 0.1, 0.06);
  drawCube(gl, M, BEARD, 0.0, 0);

  // Eyes
  M = fromMat(headMat);
  M.translate(0.15, 0.08, 0.0);
  M.scale(0.02, 0.03, 0.02);
  drawCube(gl, M, [0.1, 0.1, 0.1, 1.0], 0.0, 0);

  M = fromMat(headMat);
  M.translate(0.15, 0.08, 0.12);
  M.scale(0.02, 0.03, 0.02);
  drawCube(gl, M, [0.1, 0.1, 0.1, 1.0], 0.0, 0);

  // Left ear
  M = fromMat(headMat);
  M.translate(0.02, 0.08, -0.04);
  M.rotate(earAng - 30, 1, 0, 0);
  M.rotate(-20, 0, 0, 1);
  M.scale(0.04, 0.03, 0.08);
  drawCube(gl, M, FACE, 0.0, 0);

  // Right ear
  M = fromMat(headMat);
  M.translate(0.02, 0.08, 0.14);
  M.rotate(-earAng + 30, 1, 0, 0);
  M.rotate(-20, 0, 0, 1);
  M.scale(0.04, 0.03, 0.08);
  drawCube(gl, M, FACE, 0.0, 0);

  // ---- HORNS (left) - 3 segments ----
  let hornLBase = fromMat(headMat);
  hornLBase.translate(0.08, 0.14, 0.0);
  hornLBase.rotate(-20, 0, 0, 1);
  hornLBase.rotate(-15, 1, 0, 0);
  M = fromMat(hornLBase);
  M.scale(0.03, 0.08, 0.03);
  drawCube(gl, M, DARK, 0.0, 0);

  let hornLMid = fromMat(hornLBase);
  hornLMid.translate(0.0, 0.08, 0.0);
  hornLMid.rotate(-25, 0, 0, 1);
  M = fromMat(hornLMid);
  M.scale(0.025, 0.07, 0.025);
  drawCube(gl, M, [0.5, 0.45, 0.4, 1.0], 0.0, 0);

  M = fromMat(hornLMid);
  M.translate(0.0, 0.07, 0.0);
  M.rotate(-20, 0, 0, 1);
  M.scale(0.02, 0.05, 0.02);
  drawCube(gl, M, [0.6, 0.55, 0.5, 1.0], 0.0, 0);

  // ---- HORNS (right) - 3 segments ----
  let hornRBase = fromMat(headMat);
  hornRBase.translate(0.08, 0.14, 0.14);
  hornRBase.rotate(-20, 0, 0, 1);
  hornRBase.rotate(15, 1, 0, 0);
  M = fromMat(hornRBase);
  M.scale(0.03, 0.08, 0.03);
  drawCube(gl, M, DARK, 0.0, 0);

  let hornRMid = fromMat(hornRBase);
  hornRMid.translate(0.0, 0.08, 0.0);
  hornRMid.rotate(-25, 0, 0, 1);
  M = fromMat(hornRMid);
  M.scale(0.025, 0.07, 0.025);
  drawCube(gl, M, [0.5, 0.45, 0.4, 1.0], 0.0, 0);

  M = fromMat(hornRMid);
  M.translate(0.0, 0.07, 0.0);
  M.rotate(-20, 0, 0, 1);
  M.scale(0.02, 0.05, 0.02);
  drawCube(gl, M, [0.6, 0.55, 0.5, 1.0], 0.0, 0);

  // ---- TAIL ----
  M = b();
  M.translate(-0.25, 0.15, 0.0);
  M.rotate(-45 + tailAng, 0, 0, 1);
  M.scale(0.08, 0.04, 0.04);
  M.translate(-1, 0, -0.5);
  drawCube(gl, M, BODY, 0.0, 0);

  // ---- FRONT LEFT LEG (upper + lower + hoof) ----
  let fLLegUpper = b();
  fLLegUpper.translate(0.12, -0.05, -0.1);
  fLLegUpper.rotate(fLLeg, 0, 0, 1);
  M = fromMat(fLLegUpper);
  M.scale(0.06, 0.18, 0.06);
  M.translate(-0.5, -1, 0);
  drawCube(gl, M, BODY, 0.0, 0);

  let fLLegLower = fromMat(fLLegUpper);
  fLLegLower.translate(0.0, -0.18, 0.0);
  fLLegLower.rotate(fLFoot, 0, 0, 1);
  M = fromMat(fLLegLower);
  M.scale(0.05, 0.14, 0.05);
  M.translate(-0.5, -1, 0.1);
  drawCube(gl, M, BODY, 0.0, 0);

  M = fromMat(fLLegLower);
  M.translate(-0.025, -0.17, 0.005);
  M.scale(0.05, 0.03, 0.05);
  drawCube(gl, M, DARK, 0.0, 0);

  // ---- FRONT RIGHT LEG ----
  let fRLegUpper = b();
  fRLegUpper.translate(0.12, -0.05, 0.04);
  fRLegUpper.rotate(fRLeg, 0, 0, 1);
  M = fromMat(fRLegUpper);
  M.scale(0.06, 0.18, 0.06);
  M.translate(-0.5, -1, 0);
  drawCube(gl, M, BODY, 0.0, 0);

  let fRLegLower = fromMat(fRLegUpper);
  fRLegLower.translate(0.0, -0.18, 0.0);
  fRLegLower.rotate(fRFoot, 0, 0, 1);
  M = fromMat(fRLegLower);
  M.scale(0.05, 0.14, 0.05);
  M.translate(-0.5, -1, 0.1);
  drawCube(gl, M, BODY, 0.0, 0);

  M = fromMat(fRLegLower);
  M.translate(-0.025, -0.17, 0.005);
  M.scale(0.05, 0.03, 0.05);
  drawCube(gl, M, DARK, 0.0, 0);

  // ---- BACK LEFT LEG ----
  let bLLegUpper = b();
  bLLegUpper.translate(-0.18, -0.05, -0.1);
  bLLegUpper.rotate(bLLeg, 0, 0, 1);
  M = fromMat(bLLegUpper);
  M.scale(0.06, 0.18, 0.06);
  M.translate(-0.5, -1, 0);
  drawCube(gl, M, BODY, 0.0, 0);

  let bLLegLower = fromMat(bLLegUpper);
  bLLegLower.translate(0.0, -0.18, 0.0);
  bLLegLower.rotate(bLFoot, 0, 0, 1);
  M = fromMat(bLLegLower);
  M.scale(0.05, 0.14, 0.05);
  M.translate(-0.5, -1, 0.1);
  drawCube(gl, M, BODY, 0.0, 0);

  M = fromMat(bLLegLower);
  M.translate(-0.025, -0.17, 0.005);
  M.scale(0.05, 0.03, 0.05);
  drawCube(gl, M, DARK, 0.0, 0);

  // ---- BACK RIGHT LEG ----
  let bRLegUpper = b();
  bRLegUpper.translate(-0.18, -0.05, 0.04);
  bRLegUpper.rotate(bRLeg, 0, 0, 1);
  M = fromMat(bRLegUpper);
  M.scale(0.06, 0.18, 0.06);
  M.translate(-0.5, -1, 0);
  drawCube(gl, M, BODY, 0.0, 0);

  let bRLegLower = fromMat(bRLegUpper);
  bRLegLower.translate(0.0, -0.18, 0.0);
  bRLegLower.rotate(bRFoot, 0, 0, 1);
  M = fromMat(bRLegLower);
  M.scale(0.05, 0.14, 0.05);
  M.translate(-0.5, -1, 0.1);
  drawCube(gl, M, BODY, 0.0, 0);

  M = fromMat(bRLegLower);
  M.translate(-0.025, -0.17, 0.005);
  M.scale(0.05, 0.03, 0.05);
  drawCube(gl, M, DARK, 0.0, 0);
}

// ============================================================
// Crosshair overlay
// ============================================================
function drawCrosshair() {
  // Draw a simple + crosshair in the center using a 2D overlay
  let ctx = document.getElementById('overlay').getContext('2d');
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  let cx = ctx.canvas.width / 2;
  let cy = ctx.canvas.height / 2;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  // Draw game UI
  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.fillText(`FPS: ${g_fps}`, 10, 20);
  ctx.fillText(`Treasures: ${g_treasuresFound}/${g_totalTreasures}`, 10, 40);

  let ex = camera.eye.elements[0].toFixed(1);
  let ey = camera.eye.elements[1].toFixed(1);
  let ez = camera.eye.elements[2].toFixed(1);
  ctx.fillText(`Pos: (${ex}, ${ey}, ${ez})`, 10, 60);

  if (g_gameWon) {
    ctx.fillStyle = 'gold';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU FOUND ALL TREASURES!', cx, 50);
    ctx.font = '18px monospace';
    ctx.fillText('The goat is celebrating! Look for the spinning goat!', cx, 80);
    ctx.textAlign = 'left';
  }

  if (g_messageTimer > 0) {
    g_messageTimer--;
    ctx.fillStyle = 'yellow';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(g_messageText, cx, cy + 40);
    ctx.textAlign = 'left';
  }

  // Controls help
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '12px monospace';
  let helpY = ctx.canvas.height - 80;
  ctx.fillText('WASD: Move | Q/E: Rotate | Mouse: Look', 10, helpY);
  ctx.fillText('Left Click: Place Block | Shift+Click: Delete Block', 10, helpY + 16);
  ctx.fillText('Click canvas to lock mouse pointer', 10, helpY + 32);
  ctx.fillText('Find all 5 golden treasures hidden in the world!', 10, helpY + 48);
  ctx.fillText('The wandering goat is the same hierarchical model from ASG2!', 10, helpY + 64);
}

// ============================================================
// Main rendering loop
// ============================================================
function renderScene() {
  // Update FPS
  let now = performance.now();
  let dt = now - g_lastFrameTime;
  g_lastFrameTime = now;
  g_fps = Math.round(1000 / dt);

  // Handle continuous key input
  handleKeys();

  // Check treasure proximity
  checkTreasures();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set camera matrices
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  // Draw sky first (disable depth write so it's always behind)
  gl.depthMask(false);
  drawSky();
  gl.depthMask(true);

  // Draw ground
  drawGround();

  // Draw batched world
  drawBatchedWorld();

  // Draw goat
  drawGoat();

  // Draw crosshair overlay
  drawCrosshair();

  requestAnimationFrame(renderScene);
}

// ============================================================
// Game logic
// ============================================================
function checkTreasures() {
  let ex = camera.eye.elements[0];
  let ez = camera.eye.elements[2];

  for (let t of g_treasures) {
    if (t.found) continue;
    let dx = ex - (t.x + 0.5);
    let dz = ez - (t.z + 0.5);
    let dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 1.5) {
      t.found = true;
      g_treasuresFound++;
      g_worldDirty = true;
      g_messageText = `Treasure found! (${g_treasuresFound}/${g_totalTreasures})`;
      g_messageTimer = 120; // 2 seconds at 60fps
      if (g_treasuresFound === g_totalTreasures) {
        g_gameWon = true;
      }
    }
  }
}

// ============================================================
// Input handling
// ============================================================
function handleKeys() {
  if (g_keysDown['w'] || g_keysDown['W']) camera.moveForward();
  if (g_keysDown['s'] || g_keysDown['S']) camera.moveBackwards();
  if (g_keysDown['a'] || g_keysDown['A']) camera.moveLeft();
  if (g_keysDown['d'] || g_keysDown['D']) camera.moveRight();
  if (g_keysDown['q'] || g_keysDown['Q']) camera.panLeft();
  if (g_keysDown['e'] || g_keysDown['E']) camera.panRight();
}

function setupInputHandlers() {
  // Keyboard
  document.addEventListener('keydown', function(ev) {
    g_keysDown[ev.key] = true;
  });
  document.addEventListener('keyup', function(ev) {
    g_keysDown[ev.key] = false;
  });

  // Mouse look (pointer lock)
  canvas.addEventListener('click', function(ev) {
    if (!document.pointerLockElement) {
      canvas.requestPointerLock();
    } else {
      // Handle block placement
      handleBlockAction(ev);
    }
  });

  canvas.addEventListener('contextmenu', function(ev) {
    ev.preventDefault();
    if (document.pointerLockElement) {
      handleBlockDelete();
    }
  });

  document.addEventListener('mousemove', function(ev) {
    if (document.pointerLockElement === canvas) {
      let dx = ev.movementX;
      let dy = ev.movementY;
      camera.panLeft(-dx * g_mouseSensitivity);
      camera.panUp(-dy * g_mouseSensitivity);
    }
  });
}

function handleBlockAction(ev) {
  if (ev.button === 0) {
    if (ev.shiftKey) {
      // Shift + left click = delete block
      handleBlockDelete();
    } else {
      // Left click = place block
      let target = camera.getTargetBlock();
      if (target) {
        let x = target.x, z = target.z;
        if (x >= 0 && x < MAP_SIZE && z >= 0 && z < MAP_SIZE) {
          let px = Math.floor(camera.eye.elements[0]);
          let pz = Math.floor(camera.eye.elements[2]);
          if (x === px && z === pz) return;
          if (g_map[x][z] < 4) {
            g_map[x][z]++;
            g_worldDirty = true;
            g_messageText = "Block placed!";
            g_messageTimer = 30;
          }
        }
      }
    }
  }
}

function handleBlockDelete() {
  let target = camera.getTargetBlock();
  if (target) {
    let x = target.x, z = target.z;
    if (x >= 0 && x < MAP_SIZE && z >= 0 && z < MAP_SIZE) {
      if (g_map[x][z] > 0) {
        g_map[x][z]--;
        g_worldDirty = true;
        g_messageText = "Block deleted!";
        g_messageTimer = 30;
      }
    }
  }
}

// ============================================================
// Main entry point
// ============================================================
function main() {
  if (!setupWebGL()) return;
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders');
    return;
  }
  connectVariablesToGLSL();
  initTextures();
  initWorldMap();

  camera = new Camera(canvas);

  setupInputHandlers();

  g_lastFrameTime = performance.now();
  renderScene();
}
