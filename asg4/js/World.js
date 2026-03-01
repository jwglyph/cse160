// World.js - ASG4: Lighting (Phong Shader, Spotlight, OBJ, Normal Viz)

// ============================================================
// Shader source code - Phong Lighting
// ============================================================
const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
    v_WorldPos = (u_ModelMatrix * a_Position).xyz;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  uniform vec4 u_BaseColor;
  uniform float u_TexColorWeight;
  uniform int u_WhichTexture;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;

  uniform bool u_LightingOn;
  uniform bool u_NormalViz;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_CameraPos;

  // Spotlight
  uniform bool u_SpotLightOn;
  uniform vec3 u_SpotLightPos;
  uniform vec3 u_SpotLightDir;
  uniform float u_SpotLightCutoff;
  uniform vec3 u_SpotLightColor;

  void main() {
    // Normal visualization mode
    if (u_NormalViz) {
      gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
      return;
    }

    // Get base/texture color
    vec4 texColor;
    if (u_WhichTexture == 0) { texColor = texture2D(u_Sampler0, v_UV); }
    else if (u_WhichTexture == 1) { texColor = texture2D(u_Sampler1, v_UV); }
    else if (u_WhichTexture == 2) { texColor = texture2D(u_Sampler2, v_UV); }
    else if (u_WhichTexture == 3) { texColor = texture2D(u_Sampler3, v_UV); }
    else { texColor = vec4(1.0); }

    vec4 baseCol = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texColor;

    if (!u_LightingOn) {
      gl_FragColor = baseCol;
      return;
    }

    // --- Phong Lighting ---
    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_CameraPos - v_WorldPos);

    // Ambient
    vec3 ambient = 0.15 * baseCol.rgb;

    // --- Point Light ---
    vec3 L = normalize(u_LightPos - v_WorldPos);
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = diff * u_LightColor * baseCol.rgb;

    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(V, R), 0.0), 32.0);
    vec3 specular = spec * u_LightColor * 0.5;

    vec3 result = ambient + diffuse + specular;

    // --- Spot Light ---
    if (u_SpotLightOn) {
      vec3 SL = normalize(u_SpotLightPos - v_WorldPos);
      float theta = dot(SL, normalize(-u_SpotLightDir));
      if (theta > u_SpotLightCutoff) {
        float intensity = (theta - u_SpotLightCutoff) / (1.0 - u_SpotLightCutoff);
        intensity = clamp(intensity, 0.0, 1.0);
        float sDiff = max(dot(N, SL), 0.0);
        vec3 sR = reflect(-SL, N);
        float sSpec = pow(max(dot(V, sR), 0.0), 32.0);
        result += intensity * (sDiff * u_SpotLightColor * baseCol.rgb + sSpec * u_SpotLightColor * 0.5);
      }
    }

    gl_FragColor = vec4(result, baseCol.a);
  }
`;

// ============================================================
// Global variables
// ============================================================
let canvas, gl;
let camera;

// Shader locations
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_TexColorWeight, u_WhichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_LightingOn, u_NormalViz, u_LightPos, u_LightColor, u_CameraPos;
let u_SpotLightOn, u_SpotLightPos, u_SpotLightDir, u_SpotLightCutoff, u_SpotLightColor;

// Buffers
let g_vertexBuffer, g_uvBuffer, g_normalBuffer;

// World data
let g_map = [];
const MAP_SIZE = 32;
let g_batchByTex = [null, null, null, null];
let g_worldDirty = true;

// Performance
let g_lastFrameTime = 0;
let g_fps = 0;

// Lighting state
let g_lightingOn = true;
let g_normalViz = false;
let g_lightPos = [16, 5, 16];
let g_lightColor = [1.0, 1.0, 1.0];
let g_lightAngle = 0;
let g_lightAnimOn = true;
let g_lightSliderX = 16;
let g_lightSliderY = 5;
let g_lightSliderZ = 16;

// Spotlight state
let g_spotLightOn = false;
let g_spotLightPos = [16, 8, 16];
let g_spotLightDir = [0, -1, 0];
let g_spotLightCutoff = 0.9; // cos(~25 degrees)
let g_spotLightColor = [1.0, 1.0, 0.8];

// Sphere data
let g_sphereVerts = null;
let g_sphereUVs = null;
let g_sphereNormals = null;
let g_sphereIndices = null;
let g_sphereIndexBuffer = null;

// OBJ model data
let g_objVerts = null;
let g_objNormals = null;
let g_objUVs = null;
let g_objLoaded = false;

// Goat animal
let g_goatPos = { x: 17, y: 0, z: 14 };
let g_goatAngle = 0;
let g_goatLegAngle = 0;
let g_goatLegDir = 1;
let g_goatFacing = 0;
let g_goatTargetFacing = 0;
let g_goatSpeed = 0.02;
let g_goatWanderTimer = 0;
let g_goatWalking = true;

// Keys held
let g_keysDown = {};
let g_mouseSensitivity = 0.15;

// ============================================================
// Sphere generation
// ============================================================
function generateSphere(radius, widthSeg, heightSeg) {
  let vertices = [], normals = [], uvs = [], indices = [];
  let grid = [];
  let index = 0;

  for (let j = 0; j <= heightSeg; j++) {
    let row = [];
    let v = j / heightSeg;
    for (let i = 0; i <= widthSeg; i++) {
      let u = i / widthSeg;
      let x = -radius * Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);
      let y = radius * Math.cos(v * Math.PI);
      let z = radius * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);
      vertices.push(x, y, z);
      let len = Math.sqrt(x*x + y*y + z*z);
      if (len > 0) { normals.push(x/len, y/len, z/len); }
      else { normals.push(0, 1, 0); }
      uvs.push(u, 1 - v);
      row.push(index++);
    }
    grid.push(row);
  }

  for (let j = 0; j < heightSeg; j++) {
    for (let i = 0; i < widthSeg; i++) {
      let a = grid[j][i + 1];
      let b = grid[j][i];
      let c = grid[j + 1][i];
      let d = grid[j + 1][i + 1];
      if (j !== 0) indices.push(a, b, d);
      if (j !== heightSeg - 1) indices.push(b, c, d);
    }
  }

  g_sphereVerts = new Float32Array(vertices);
  g_sphereNormals = new Float32Array(normals);
  g_sphereUVs = new Float32Array(uvs);
  g_sphereIndices = new Uint16Array(indices);
}

// ============================================================
// OBJ Loader
// ============================================================
function parseOBJ(text) {
  let positions = [[0,0,0]]; // 1-indexed
  let normals_arr = [[0,0,0]];
  let outVerts = [], outNorms = [], outUVs = [];

  let lines = text.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('v ')) {
      let parts = line.split(/\s+/);
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith('vn ')) {
      let parts = line.split(/\s+/);
      normals_arr.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith('f ')) {
      let parts = line.split(/\s+/).slice(1);
      let faceVerts = [];
      for (let p of parts) {
        let indices = p.split('/');
        let vi = parseInt(indices[0]);
        let ni = indices[2] ? parseInt(indices[2]) : 0;
        faceVerts.push({ v: vi, n: ni });
      }
      // Triangulate (fan)
      for (let i = 1; i < faceVerts.length - 1; i++) {
        let tri = [faceVerts[0], faceVerts[i], faceVerts[i+1]];
        for (let t of tri) {
          let pos = positions[t.v] || [0,0,0];
          outVerts.push(pos[0], pos[1], pos[2]);
          if (t.n > 0 && normals_arr[t.n]) {
            let n = normals_arr[t.n];
            outNorms.push(n[0], n[1], n[2]);
          } else {
            outNorms.push(0, 1, 0);
          }
          outUVs.push(0, 0);
        }
      }
    }
  }

  g_objVerts = new Float32Array(outVerts);
  g_objNormals = new Float32Array(outNorms);
  g_objUVs = new Float32Array(outUVs);
  g_objLoaded = true;
  console.log('OBJ loaded:', outVerts.length / 3, 'vertices');
}

// Embedded simple OBJ: a low-poly diamond/crystal shape
function loadBuiltinOBJ() {
  let objText = `
v 0 1.5 0
v 1 0 0
v 0 0 1
v -1 0 0
v 0 0 -1
v 0 -0.5 0
vn 0.5774 0.5774 0.5774
vn -0.5774 0.5774 0.5774
vn -0.5774 0.5774 -0.5774
vn 0.5774 0.5774 -0.5774
vn 0.5774 -0.5774 0.5774
vn -0.5774 -0.5774 0.5774
vn -0.5774 -0.5774 -0.5774
vn 0.5774 -0.5774 -0.5774
f 1//1 2//1 3//1
f 1//2 3//2 4//2
f 1//3 4//3 5//3
f 1//4 5//4 2//4
f 6//5 3//5 2//5
f 6//6 4//6 3//6
f 6//7 5//7 4//7
f 6//8 2//8 5//8
`;
  parseOBJ(objText);
}

// ============================================================
// 32x32 World Map
// ============================================================
function initWorldMap() {
  for (let i = 0; i < MAP_SIZE; i++) { g_map[i] = []; for (let j = 0; j < MAP_SIZE; j++) g_map[i][j] = 0; }
  for (let i = 0; i < MAP_SIZE; i++) { g_map[i][0]=4; g_map[i][MAP_SIZE-1]=4; g_map[0][i]=4; g_map[MAP_SIZE-1][i]=4; }
  for (let i=2;i<10;i++) g_map[i][10]=3;
  for (let j=2;j<10;j++) g_map[10][j]=3;
  g_map[6][10]=0;
  for (let i=2;i<15;i++) g_map[i][20]=2;
  for (let j=12;j<20;j++) g_map[15][j]=2;
  g_map[8][20]=0; g_map[15][16]=0;
  for (let i=20;i<28;i++) { g_map[i][20]=4; g_map[i][28]=4; }
  for (let j=20;j<28;j++) { g_map[20][j]=4; g_map[28][j]=4; }
  g_map[24][20]=0;
  g_map[23][23]=4; g_map[23][25]=4; g_map[25][23]=4; g_map[25][25]=4;
  for (let i=12;i<20;i++) g_map[i][12]=2;
  for (let j=5;j<12;j++) g_map[18][j]=2;
  g_map[15][12]=0; g_map[18][8]=0;
  for (let i=25;i<30;i++) { g_map[i][5]=3; g_map[i][10]=3; }
  for (let j=5;j<10;j++) { g_map[25][j]=3; g_map[30>31?31:30][j]=3; }
  g_map[27][5]=0;
  g_map[5][15]=1; g_map[7][15]=1; g_map[9][15]=1;
  g_map[5][17]=1; g_map[7][17]=1; g_map[9][17]=1;
  for (let i=12;i<18;i++) g_map[i][25]=1;
  for (let j=25;j<30;j++) g_map[12][j]=1;
  g_map[14][25]=0;
  g_map[3][3]=2; g_map[3][4]=1; g_map[4][3]=1;
  g_map[14][7]=3; g_map[15][7]=2; g_map[16][7]=1;
  g_map[22][12]=4;
  g_map[21][12]=3; g_map[23][12]=3; g_map[22][11]=3; g_map[22][13]=3;
  g_map[20][12]=2; g_map[24][12]=2; g_map[22][10]=2; g_map[22][14]=2;
  g_map[21][11]=2; g_map[21][13]=2; g_map[23][11]=2; g_map[23][13]=2;
}

// ============================================================
// Procedural Texture Generation
// ============================================================
function generateTexture(type, size) {
  size = size || 64;
  let c2d = document.createElement('canvas'); c2d.width = size; c2d.height = size;
  let ctx = c2d.getContext('2d');
  let imgData = ctx.createImageData(size, size);
  let data = imgData.data;
  let seed = 12345;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let i = (y * size + x) * 4;
      let v = rand();
      if (type === 'dirt') {
        data[i]=Math.min(255,120+v*40); data[i+1]=Math.min(255,80+v*30); data[i+2]=Math.min(255,40+v*20);
        if(rand()<0.08){data[i]-=30;data[i+1]-=20;data[i+2]-=15;}
      } else if (type === 'grass') {
        data[i]=Math.min(255,60+v*30); data[i+1]=Math.min(255,140+v*40); data[i+2]=Math.min(255,40+v*20);
        if(rand()<0.1) data[i+1]+=25;
      } else if (type === 'stone') {
        let base=128+v*40-20; data[i]=Math.min(255,Math.max(0,base)); data[i+1]=Math.min(255,Math.max(0,base-5)); data[i+2]=Math.min(255,Math.max(0,base+3));
      } else if (type === 'gold') {
        let shine=Math.sin(x*0.3)*Math.sin(y*0.3)*20;
        data[i]=Math.min(255,220+v*35+shine); data[i+1]=Math.min(255,180+v*30+shine); data[i+2]=Math.min(255,40+v*20);
      }
      data[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return c2d;
}

// ============================================================
// WebGL Initialization
// ============================================================
function compileShaders(gl, vshader, fshader) {
  let vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vshader); gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) { console.error('VS:', gl.getShaderInfoLog(vs)); return false; }
  let fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fshader); gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) { console.error('FS:', gl.getShaderInfoLog(fs)); return false; }
  let program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error('Link:', gl.getProgramInfoLog(program)); return false; }
  gl.useProgram(program); gl.program = program;
  return true;
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.error('No WebGL'); return false; }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5, 0.7, 1.0, 1.0);
  return true;
}

function connectVariablesToGLSL() {
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_TexColorWeight = gl.getUniformLocation(gl.program, 'u_TexColorWeight');
  u_WhichTexture = gl.getUniformLocation(gl.program, 'u_WhichTexture');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_LightingOn = gl.getUniformLocation(gl.program, 'u_LightingOn');
  u_NormalViz = gl.getUniformLocation(gl.program, 'u_NormalViz');
  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_SpotLightOn = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
  u_SpotLightPos = gl.getUniformLocation(gl.program, 'u_SpotLightPos');
  u_SpotLightDir = gl.getUniformLocation(gl.program, 'u_SpotLightDir');
  u_SpotLightCutoff = gl.getUniformLocation(gl.program, 'u_SpotLightCutoff');
  u_SpotLightColor = gl.getUniformLocation(gl.program, 'u_SpotLightColor');

  g_vertexBuffer = gl.createBuffer();
  g_uvBuffer = gl.createBuffer();
  g_normalBuffer = gl.createBuffer();
  g_sphereIndexBuffer = gl.createBuffer();
}

function initTextures() {
  let textures = [
    { canvas: generateTexture('dirt',64), unit: gl.TEXTURE0, sampler: u_Sampler0, idx: 0 },
    { canvas: generateTexture('grass',64), unit: gl.TEXTURE1, sampler: u_Sampler1, idx: 1 },
    { canvas: generateTexture('stone',64), unit: gl.TEXTURE2, sampler: u_Sampler2, idx: 2 },
    { canvas: generateTexture('gold',64), unit: gl.TEXTURE3, sampler: u_Sampler3, idx: 3 },
  ];
  for (let t of textures) {
    let texture = gl.createTexture();
    gl.activeTexture(t.unit); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.canvas);
    gl.uniform1i(t.sampler, t.idx);
  }
}

// ============================================================
// Cube geometry with normals
// ============================================================
function getCubeData() {
  let v = new Float32Array([
    0,0,1, 1,0,1, 1,1,1,  0,0,1, 1,1,1, 0,1,1,   // Front
    1,0,0, 0,0,0, 0,1,0,  1,0,0, 0,1,0, 1,1,0,   // Back
    0,1,1, 1,1,1, 1,1,0,  0,1,1, 1,1,0, 0,1,0,   // Top
    0,0,0, 1,0,0, 1,0,1,  0,0,0, 1,0,1, 0,0,1,   // Bottom
    1,0,1, 1,0,0, 1,1,0,  1,0,1, 1,1,0, 1,1,1,   // Right
    0,0,0, 0,0,1, 0,1,1,  0,0,0, 0,1,1, 0,1,0,   // Left
  ]);
  let uv = new Float32Array([
    0,0,1,0,1,1, 0,0,1,1,0,1,  0,0,1,0,1,1, 0,0,1,1,0,1,
    0,0,1,0,1,1, 0,0,1,1,0,1,  0,0,1,0,1,1, 0,0,1,1,0,1,
    0,0,1,0,1,1, 0,0,1,1,0,1,  0,0,1,0,1,1, 0,0,1,1,0,1,
  ]);
  // Normals per face (6 verts per face)
  let n = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,       // Front
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,  // Back
    0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0,        // Top
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,  // Bottom
    1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0,        // Right
    -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0,  // Left
  ]);
  return { vertices: v, uvs: uv, normals: n };
}

// ============================================================
// Set normal matrix from model matrix
// ============================================================
function setNormalMatrix(modelMatrix) {
  let normalMat = new Matrix4(modelMatrix);
  normalMat.invert();
  normalMat.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMat.elements);
}

// ============================================================
// Drawing functions
// ============================================================
function drawCube(gl, M, color, texWeight, texID) {
  let cubeData = getCubeData();
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_TexColorWeight, texWeight);
  gl.uniform1i(u_WhichTexture, texID);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.uvs, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.normals, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawSphere(gl, M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform1i(u_WhichTexture, -1);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_sphereVerts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_sphereUVs, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_sphereNormals, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_sphereIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_sphereIndices, gl.STATIC_DRAW);

  gl.drawElements(gl.TRIANGLES, g_sphereIndices.length, gl.UNSIGNED_SHORT, 0);
}

function drawOBJModel(gl, M, color) {
  if (!g_objLoaded) return;
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform1i(u_WhichTexture, -1);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_objVerts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_objUVs, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_objNormals, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, g_objVerts.length / 3);
}

// ============================================================
// Batched world geometry with normals
// ============================================================
function buildWorldGeometry() {
  let cubeData = getCubeData();
  let cubeVerts = cubeData.vertices, cubeUVs = cubeData.uvs, cubeNorms = cubeData.normals;
  let numV = 36;
  let buckets = [[],[],[],[]], uvBuckets = [[],[],[],[]], normBuckets = [[],[],[],[]];

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      let h = g_map[x][z];
      for (let y = 0; y < h; y++) {
        let exposed = (y===h-1)||(x===0||g_map[x-1][z]<=y)||(x===MAP_SIZE-1||g_map[x+1][z]<=y)||(z===0||g_map[x][z-1]<=y)||(z===MAP_SIZE-1||g_map[x][z+1]<=y)||(y===0);
        if (!exposed) continue;
        let texID = h >= 4 ? 2 : 0;
        for (let v = 0; v < numV; v++) {
          buckets[texID].push(cubeVerts[v*3]+x, cubeVerts[v*3+1]+y, cubeVerts[v*3+2]+z);
          uvBuckets[texID].push(cubeUVs[v*2], cubeUVs[v*2+1]);
          normBuckets[texID].push(cubeNorms[v*3], cubeNorms[v*3+1], cubeNorms[v*3+2]);
        }
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    if (buckets[i].length > 0) {
      g_batchByTex[i] = {
        verts: new Float32Array(buckets[i]),
        uvs: new Float32Array(uvBuckets[i]),
        normals: new Float32Array(normBuckets[i]),
        count: buckets[i].length / 3
      };
    } else { g_batchByTex[i] = null; }
  }
  g_worldDirty = false;
}

function drawBatchedWorld() {
  if (g_worldDirty) buildWorldGeometry();
  let identityMatrix = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);
  setNormalMatrix(identityMatrix);

  for (let texID = 0; texID < 4; texID++) {
    let batch = g_batchByTex[texID];
    if (!batch) continue;
    gl.uniform1f(u_TexColorWeight, 1.0);
    gl.uniform4f(u_BaseColor, 1,1,1,1);
    gl.uniform1i(u_WhichTexture, texID);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, batch.count);
  }
}

function drawGround() {
  let M = new Matrix4();
  M.setTranslate(0, -0.5, 0);
  M.scale(MAP_SIZE, 0.5, MAP_SIZE);
  let cubeData = getCubeData();
  let uvs = new Float32Array(cubeData.uvs.length);
  for (let i = 0; i < cubeData.uvs.length; i++) uvs[i] = cubeData.uvs[i] * MAP_SIZE;

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4f(u_BaseColor, 0.3,0.6,0.2,1);
  gl.uniform1f(u_TexColorWeight, 1.0);
  gl.uniform1i(u_WhichTexture, 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData.normals, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawSky() {
  let M = new Matrix4();
  M.setTranslate(-500, -200, -500);
  M.scale(1000, 1000, 1000);
  drawCube(gl, M, [0.53, 0.81, 0.92, 1.0], 0.0, -1);
}

// ============================================================
// Goat (from ASG3, with normals)
// ============================================================
function drawGoat() {
  g_goatAngle += 0.5;
  let walkTime = g_goatAngle * 0.02;

  g_goatWanderTimer--;
  if (g_goatWanderTimer <= 0) {
    g_goatTargetFacing = Math.random() * Math.PI * 2;
    g_goatWanderTimer = 120 + Math.floor(Math.random() * 240);
    g_goatWalking = Math.random() > 0.2;
  }
  let angleDiff = g_goatTargetFacing - g_goatFacing;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  g_goatFacing += angleDiff * 0.05;

  if (g_goatWalking) {
    let dx = Math.cos(g_goatFacing) * g_goatSpeed;
    let dz = -Math.sin(g_goatFacing) * g_goatSpeed;
    let nx = g_goatPos.x + dx, nz = g_goatPos.z + dz;
    let margin = 0.5, blocked = false;
    let gx1=Math.floor(nx-margin),gx2=Math.floor(nx+margin),gz1=Math.floor(nz-margin),gz2=Math.floor(nz+margin);
    for(let cx=gx1;cx<=gx2;cx++){for(let cz=gz1;cz<=gz2;cz++){if(cx<1||cx>=MAP_SIZE-1||cz<1||cz>=MAP_SIZE-1){blocked=true;break;}if(g_map[cx]&&g_map[cx][cz]>0){blocked=true;break;}}if(blocked)break;}
    if(!blocked){g_goatPos.x=nx;g_goatPos.z=nz;}else{g_goatTargetFacing=g_goatFacing+Math.PI*0.5+Math.random()*Math.PI;g_goatWanderTimer=60+Math.floor(Math.random()*120);}
    g_goatLegAngle += g_goatLegDir * 1.5;
    if (g_goatLegAngle > 20 || g_goatLegAngle < -20) g_goatLegDir *= -1;
  } else { g_goatLegAngle *= 0.9; }

  let gx=g_goatPos.x, gz=g_goatPos.z, facing=g_goatFacing*180/Math.PI;
  let walkSpeed=walkTime*4, legScale=g_goatWalking?1.0:Math.abs(g_goatLegAngle)/20;
  let fLLeg=20*Math.sin(walkSpeed)*legScale, fRLeg=-20*Math.sin(walkSpeed)*legScale;
  let bLLeg=-20*Math.sin(walkSpeed)*legScale, bRLeg=20*Math.sin(walkSpeed)*legScale;
  let fLFoot=10*Math.sin(walkSpeed-0.5)*legScale, fRFoot=-10*Math.sin(walkSpeed-0.5)*legScale;
  let bLFoot=-10*Math.sin(walkSpeed-0.5)*legScale, bRFoot=10*Math.sin(walkSpeed-0.5)*legScale;
  let tailAng=15*Math.sin(walkTime*6), headAng=5*Math.sin(walkSpeed)*legScale, earAng=8*Math.sin(walkTime*5);
  let S = 2.0;

  let base = new Matrix4();
  base.setTranslate(gx, 0.40*S, gz);
  base.rotate(facing, 0, 1, 0);
  base.scale(S, S, S);

  const BODY=[0.9,0.88,0.85,1], DARK=[0.4,0.35,0.3,1], FACE=[0.85,0.82,0.78,1], BEARD=[0.95,0.93,0.9,1];
  function b(){return new Matrix4(base);} function fromMat(m){return new Matrix4(m);}

  let M;
  // Body
  M=b(); M.translate(-0.25,-0.05,-0.12); M.scale(0.5,0.28,0.24); drawCube(gl,M,BODY,0,0);
  // Neck
  M=b(); M.translate(0.18,0.05,-0.08); M.rotate(20,0,0,1); M.scale(0.12,0.22,0.16); drawCube(gl,M,BODY,0,0);
  // Head
  let headMat=b(); headMat.translate(0.28,0.22,-0.07); headMat.rotate(headAng,0,0,1);
  M=fromMat(headMat); M.scale(0.18,0.14,0.14); drawCube(gl,M,FACE,0,0);
  M=fromMat(headMat); M.translate(0.14,-0.02,0.02); M.scale(0.1,0.08,0.1); drawCube(gl,M,FACE,0,0);
  M=fromMat(headMat); M.translate(0.23,0.0,0.04); M.scale(0.02,0.04,0.06); drawCube(gl,M,[0.3,0.25,0.2,1],0,0);
  M=fromMat(headMat); M.translate(0.12,-0.08,0.04); M.scale(0.06,0.1,0.06); drawCube(gl,M,BEARD,0,0);
  M=fromMat(headMat); M.translate(0.15,0.08,0.0); M.scale(0.02,0.03,0.02); drawCube(gl,M,[0.1,0.1,0.1,1],0,0);
  M=fromMat(headMat); M.translate(0.15,0.08,0.12); M.scale(0.02,0.03,0.02); drawCube(gl,M,[0.1,0.1,0.1,1],0,0);
  // Ears
  M=fromMat(headMat); M.translate(0.02,0.08,-0.04); M.rotate(earAng-30,1,0,0); M.rotate(-20,0,0,1); M.scale(0.04,0.03,0.08); drawCube(gl,M,FACE,0,0);
  M=fromMat(headMat); M.translate(0.02,0.08,0.14); M.rotate(-earAng+30,1,0,0); M.rotate(-20,0,0,1); M.scale(0.04,0.03,0.08); drawCube(gl,M,FACE,0,0);
  // Horns
  let hLB=fromMat(headMat); hLB.translate(0.08,0.14,0.0); hLB.rotate(-20,0,0,1); hLB.rotate(-15,1,0,0);
  M=fromMat(hLB); M.scale(0.03,0.08,0.03); drawCube(gl,M,DARK,0,0);
  let hLM=fromMat(hLB); hLM.translate(0,0.08,0); hLM.rotate(-25,0,0,1);
  M=fromMat(hLM); M.scale(0.025,0.07,0.025); drawCube(gl,M,[0.5,0.45,0.4,1],0,0);
  M=fromMat(hLM); M.translate(0,0.07,0); M.rotate(-20,0,0,1); M.scale(0.02,0.05,0.02); drawCube(gl,M,[0.6,0.55,0.5,1],0,0);
  let hRB=fromMat(headMat); hRB.translate(0.08,0.14,0.14); hRB.rotate(-20,0,0,1); hRB.rotate(15,1,0,0);
  M=fromMat(hRB); M.scale(0.03,0.08,0.03); drawCube(gl,M,DARK,0,0);
  let hRM=fromMat(hRB); hRM.translate(0,0.08,0); hRM.rotate(-25,0,0,1);
  M=fromMat(hRM); M.scale(0.025,0.07,0.025); drawCube(gl,M,[0.5,0.45,0.4,1],0,0);
  M=fromMat(hRM); M.translate(0,0.07,0); M.rotate(-20,0,0,1); M.scale(0.02,0.05,0.02); drawCube(gl,M,[0.6,0.55,0.5,1],0,0);
  // Tail
  M=b(); M.translate(-0.25,0.15,0); M.rotate(-45+tailAng,0,0,1); M.scale(0.08,0.04,0.04); M.translate(-1,0,-0.5); drawCube(gl,M,BODY,0,0);
  // Legs (front left)
  let fLL=b(); fLL.translate(0.12,-0.05,-0.1); fLL.rotate(fLLeg,0,0,1);
  M=fromMat(fLL); M.scale(0.06,0.18,0.06); M.translate(-0.5,-1,0); drawCube(gl,M,BODY,0,0);
  let fLLo=fromMat(fLL); fLLo.translate(0,-0.18,0); fLLo.rotate(fLFoot,0,0,1);
  M=fromMat(fLLo); M.scale(0.05,0.14,0.05); M.translate(-0.5,-1,0.1); drawCube(gl,M,BODY,0,0);
  M=fromMat(fLLo); M.translate(-0.025,-0.17,0.005); M.scale(0.05,0.03,0.05); drawCube(gl,M,DARK,0,0);
  // Legs (front right)
  let fRL=b(); fRL.translate(0.12,-0.05,0.04); fRL.rotate(fRLeg,0,0,1);
  M=fromMat(fRL); M.scale(0.06,0.18,0.06); M.translate(-0.5,-1,0); drawCube(gl,M,BODY,0,0);
  let fRLo=fromMat(fRL); fRLo.translate(0,-0.18,0); fRLo.rotate(fRFoot,0,0,1);
  M=fromMat(fRLo); M.scale(0.05,0.14,0.05); M.translate(-0.5,-1,0.1); drawCube(gl,M,BODY,0,0);
  M=fromMat(fRLo); M.translate(-0.025,-0.17,0.005); M.scale(0.05,0.03,0.05); drawCube(gl,M,DARK,0,0);
  // Legs (back left)
  let bLL=b(); bLL.translate(-0.18,-0.05,-0.1); bLL.rotate(bLLeg,0,0,1);
  M=fromMat(bLL); M.scale(0.06,0.18,0.06); M.translate(-0.5,-1,0); drawCube(gl,M,BODY,0,0);
  let bLLo=fromMat(bLL); bLLo.translate(0,-0.18,0); bLLo.rotate(bLFoot,0,0,1);
  M=fromMat(bLLo); M.scale(0.05,0.14,0.05); M.translate(-0.5,-1,0.1); drawCube(gl,M,BODY,0,0);
  M=fromMat(bLLo); M.translate(-0.025,-0.17,0.005); M.scale(0.05,0.03,0.05); drawCube(gl,M,DARK,0,0);
  // Legs (back right)
  let bRL=b(); bRL.translate(-0.18,-0.05,0.04); bRL.rotate(bRLeg,0,0,1);
  M=fromMat(bRL); M.scale(0.06,0.18,0.06); M.translate(-0.5,-1,0); drawCube(gl,M,BODY,0,0);
  let bRLo=fromMat(bRL); bRLo.translate(0,-0.18,0); bRLo.rotate(bRFoot,0,0,1);
  M=fromMat(bRLo); M.scale(0.05,0.14,0.05); M.translate(-0.5,-1,0.1); drawCube(gl,M,BODY,0,0);
  M=fromMat(bRLo); M.translate(-0.025,-0.17,0.005); M.scale(0.05,0.03,0.05); drawCube(gl,M,DARK,0,0);
}

// ============================================================
// Draw light marker
// ============================================================
function drawLightMarker() {
  let M = new Matrix4();
  M.setTranslate(g_lightPos[0]-0.15, g_lightPos[1]-0.15, g_lightPos[2]-0.15);
  M.scale(0.3, 0.3, 0.3);
  // Draw without lighting
  gl.uniform1i(u_LightingOn, 0);
  drawCube(gl, M, [1.0, 1.0, 0.0, 1.0], 0.0, -1);
  gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
}

// ============================================================
// Overlay (HUD)
// ============================================================
function drawOverlay() {
  let ctx = document.getElementById('overlay').getContext('2d');
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  let cx = ctx.canvas.width/2, cy = ctx.canvas.height/2;
  ctx.strokeStyle='white'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx-10,cy); ctx.lineTo(cx+10,cy); ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy+10); ctx.stroke();
  ctx.fillStyle='white'; ctx.font='14px monospace';
  ctx.fillText(`FPS: ${g_fps}`, 10, 20);
  ctx.fillText('WASD: Move | Mouse: Look | Q/E: Rotate', 10, ctx.canvas.height - 10);
}

// ============================================================
// Main render loop
// ============================================================
function renderScene() {
  let now = performance.now();
  let dt = now - g_lastFrameTime;
  g_lastFrameTime = now;
  g_fps = Math.round(1000 / dt);

  handleKeys();

  // Animate light
  if (g_lightAnimOn) {
    g_lightAngle += 0.5;
    let r = 10;
    g_lightPos[0] = 16 + r * Math.cos(g_lightAngle * Math.PI / 180);
    g_lightPos[2] = 16 + r * Math.sin(g_lightAngle * Math.PI / 180);
    g_lightPos[1] = g_lightSliderY;
    // Update slider displays
    let slX = document.getElementById('lightX');
    let slZ = document.getElementById('lightZ');
    if (slX) slX.value = g_lightPos[0].toFixed(1);
    if (slZ) slZ.value = g_lightPos[2].toFixed(1);
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set camera
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  // Set lighting uniforms
  gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(u_NormalViz, g_normalViz ? 1 : 0);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_CameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);

  // Spotlight uniforms
  gl.uniform1i(u_SpotLightOn, g_spotLightOn ? 1 : 0);
  gl.uniform3f(u_SpotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  gl.uniform3f(u_SpotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
  gl.uniform1f(u_SpotLightCutoff, g_spotLightCutoff);
  gl.uniform3f(u_SpotLightColor, g_spotLightColor[0], g_spotLightColor[1], g_spotLightColor[2]);

  // Draw sky (no depth write)
  gl.depthMask(false);
  drawSky();
  gl.depthMask(true);

  // Draw ground
  drawGround();

  // Draw world walls
  drawBatchedWorld();

  // Draw goat
  drawGoat();

  // Draw spheres
  let M = new Matrix4();
  M.setTranslate(10, 1.5, 14);
  M.scale(1.5, 1.5, 1.5);
  drawSphere(gl, M, [0.9, 0.2, 0.1, 1.0]);

  M = new Matrix4();
  M.setTranslate(20, 1.0, 14);
  drawSphere(gl, M, [0.2, 0.5, 0.9, 1.0]);

  // Draw OBJ model
  if (g_objLoaded) {
    M = new Matrix4();
    M.setTranslate(14, 1.5, 16);
    M.scale(0.8, 0.8, 0.8);
    drawOBJModel(gl, M, [0.7, 0.3, 0.9, 1.0]);
  }

  // Draw light marker
  drawLightMarker();

  // Draw spotlight marker if on
  if (g_spotLightOn) {
    let M2 = new Matrix4();
    M2.setTranslate(g_spotLightPos[0]-0.1, g_spotLightPos[1]-0.1, g_spotLightPos[2]-0.1);
    M2.scale(0.2, 0.2, 0.2);
    gl.uniform1i(u_LightingOn, 0);
    drawCube(gl, M2, [1.0, 0.5, 0.0, 1.0], 0.0, -1);
    gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  }

  drawOverlay();
  requestAnimationFrame(renderScene);
}

// ============================================================
// Input handling
// ============================================================
function handleKeys() {
  if (g_keysDown['w']||g_keysDown['W']) camera.moveForward();
  if (g_keysDown['s']||g_keysDown['S']) camera.moveBackwards();
  if (g_keysDown['a']||g_keysDown['A']) camera.moveLeft();
  if (g_keysDown['d']||g_keysDown['D']) camera.moveRight();
  if (g_keysDown['q']||g_keysDown['Q']) camera.panLeft();
  if (g_keysDown['e']||g_keysDown['E']) camera.panRight();
}

function setupInputHandlers() {
  document.addEventListener('keydown', function(ev) { g_keysDown[ev.key] = true; });
  document.addEventListener('keyup', function(ev) { g_keysDown[ev.key] = false; });
  canvas.addEventListener('click', function() { if (!document.pointerLockElement) canvas.requestPointerLock(); });
  document.addEventListener('mousemove', function(ev) {
    if (document.pointerLockElement === canvas) {
      camera.panLeft(-ev.movementX * g_mouseSensitivity);
      camera.panUp(-ev.movementY * g_mouseSensitivity);
    }
  });
}

// ============================================================
// UI Setup
// ============================================================
function setupUI() {
  document.getElementById('btnLighting').onclick = function() {
    g_lightingOn = !g_lightingOn;
    this.textContent = 'Lighting: ' + (g_lightingOn ? 'ON' : 'OFF');
  };
  document.getElementById('btnNormals').onclick = function() {
    g_normalViz = !g_normalViz;
    this.textContent = 'Normals: ' + (g_normalViz ? 'ON' : 'OFF');
  };
  document.getElementById('btnSpotlight').onclick = function() {
    g_spotLightOn = !g_spotLightOn;
    this.textContent = 'Spotlight: ' + (g_spotLightOn ? 'ON' : 'OFF');
  };
  document.getElementById('btnLightAnim').onclick = function() {
    g_lightAnimOn = !g_lightAnimOn;
    this.textContent = 'Light Anim: ' + (g_lightAnimOn ? 'ON' : 'OFF');
  };

  document.getElementById('lightX').oninput = function() {
    if (!g_lightAnimOn) g_lightPos[0] = parseFloat(this.value);
  };
  document.getElementById('lightY').oninput = function() {
    g_lightSliderY = parseFloat(this.value);
    g_lightPos[1] = g_lightSliderY;
  };
  document.getElementById('lightZ').oninput = function() {
    if (!g_lightAnimOn) g_lightPos[2] = parseFloat(this.value);
  };

  document.getElementById('lightR').oninput = function() { g_lightColor[0] = parseFloat(this.value); };
  document.getElementById('lightG').oninput = function() { g_lightColor[1] = parseFloat(this.value); };
  document.getElementById('lightB').oninput = function() { g_lightColor[2] = parseFloat(this.value); };

  document.getElementById('spotX').oninput = function() { g_spotLightPos[0] = parseFloat(this.value); };
  document.getElementById('spotY').oninput = function() { g_spotLightPos[1] = parseFloat(this.value); };
  document.getElementById('spotZ').oninput = function() { g_spotLightPos[2] = parseFloat(this.value); };

  // OBJ file upload
  document.getElementById('objFile').onchange = function(ev) {
    let file = ev.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) { parseOBJ(e.target.result); };
    reader.readAsText(file);
  };
}

// ============================================================
// Main
// ============================================================
function main() {
  if (!setupWebGL()) return;
  if (!compileShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) { console.error('Shader fail'); return; }
  connectVariablesToGLSL();
  initTextures();
  initWorldMap();
  generateSphere(1.0, 20, 20);
  loadBuiltinOBJ();

  camera = new Camera(canvas);
  setupInputHandlers();
  setupUI();

  g_lastFrameTime = performance.now();
  renderScene();
}
