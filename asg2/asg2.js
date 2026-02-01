// ================================================================
// Vertex shader program
// ================================================================
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }
`;

// ================================================================
// Fragment shader program
// ================================================================
const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// ================================================================
// Global Variables
// ================================================================
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// Global rotation angles (controlled by sliders or mouse)
let g_globalAngleX = 0;
let g_globalAngleY = 0;

// Joint angles (controlled by sliders)
let g_frontLeftLegAngle = 0;
let g_frontLeftFootAngle = 0;
let g_frontRightLegAngle = 0;
let g_frontRightFootAngle = 0;
let g_backLeftLegAngle = 0;
let g_backLeftFootAngle = 0;
let g_backRightLegAngle = 0;
let g_backRightFootAngle = 0;
let g_tailAngle = 0;
let g_headAngle = 0;
let g_earAngle = 0;

// Track if sliders are being manually controlled
let g_manualFrontLeftLeg = false;
let g_manualFrontLeftFoot = false;
let g_manualTail = false;

// Animation
let g_animation = false;
let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;

// Mouse control
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Performance display
let g_lastFPSUpdate = 0;
let g_displayedFPS = 0;
let g_displayedMS = 0;

// Poke animation
let g_pokeAnimation = false;
let g_pokeStartTime = 0;

// ================================================================
// Setup Functions
// ================================================================
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get WebGL context');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to init shaders');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get u_GlobalRotateMatrix');
    return;
  }

  // Set initial identity matrix
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// ================================================================
// UI Setup
// ================================================================
function addActionsForHtmlUI() {
  // Animation buttons
  document.getElementById('animOnBtn').onclick = function() { g_animation = true; };
  document.getElementById('animOffBtn').onclick = function() { g_animation = false; };

  // Global rotation sliders
  document.getElementById('angleX').addEventListener('input', function() {
    g_globalAngleX = this.value;
    document.getElementById('angleXVal').textContent = this.value;
  });

  document.getElementById('angleY').addEventListener('input', function() {
    g_globalAngleY = this.value;
    document.getElementById('angleYVal').textContent = this.value;
  });

  // Joint angle sliders - mark as manually controlled when touched
  document.getElementById('frontLeftLeg').addEventListener('input', function() {
    g_frontLeftLegAngle = parseFloat(this.value);
    g_manualFrontLeftLeg = true;
    document.getElementById('frontLeftLegVal').textContent = this.value;
  });

  document.getElementById('frontLeftFoot').addEventListener('input', function() {
    g_frontLeftFootAngle = parseFloat(this.value);
    g_manualFrontLeftFoot = true;
    document.getElementById('frontLeftFootVal').textContent = this.value;
  });

  document.getElementById('tailAngle').addEventListener('input', function() {
    g_tailAngle = parseFloat(this.value);
    g_manualTail = true;
    document.getElementById('tailAngleVal').textContent = this.value;
  });

  // Reset joints back to animation control
  document.getElementById('resetJointsBtn').onclick = function() {
    g_manualFrontLeftLeg = false;
    g_manualFrontLeftFoot = false;
    g_manualTail = false;
    // Reset slider displays
    document.getElementById('frontLeftLeg').value = 0;
    document.getElementById('frontLeftLegVal').textContent = '0';
    document.getElementById('frontLeftFoot').value = 0;
    document.getElementById('frontLeftFootVal').textContent = '0';
    document.getElementById('tailAngle').value = 0;
    document.getElementById('tailAngleVal').textContent = '0';
  };

  // Mouse control for rotation
  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) {
      // Shift-click: trigger poke animation (goat headbutt!)
      g_pokeAnimation = true;
      g_pokeStartTime = performance.now() / 1000.0;
    } else {
      g_mouseDown = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
    }
  };

  canvas.onmouseup = function(ev) {
    g_mouseDown = false;
  };

  canvas.onmousemove = function(ev) {
    if (g_mouseDown) {
      let deltaX = ev.clientX - g_lastMouseX;
      let deltaY = ev.clientY - g_lastMouseY;
      
      g_globalAngleY -= deltaX * 0.5;
      g_globalAngleX -= deltaY * 0.5;
      
      // Clamp angles
      g_globalAngleX = Math.max(-180, Math.min(180, g_globalAngleX));
      g_globalAngleY = Math.max(-180, Math.min(180, g_globalAngleY));
      
      // Update sliders
      document.getElementById('angleX').value = g_globalAngleX;
      document.getElementById('angleY').value = g_globalAngleY;
      document.getElementById('angleXVal').textContent = Math.round(g_globalAngleX);
      document.getElementById('angleYVal').textContent = Math.round(g_globalAngleY);
      
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
    }
  };
}

// ================================================================
// Animation
// ================================================================
function updateAnimationAngles() {
  if (g_animation) {
    // Walking animation - legs move in opposite pairs
    // Only animate joints that aren't manually controlled
    if (!g_manualFrontLeftLeg) {
      g_frontLeftLegAngle = 20 * Math.sin(g_seconds * 4);
    }
    g_frontRightLegAngle = -20 * Math.sin(g_seconds * 4);
    g_backLeftLegAngle = -20 * Math.sin(g_seconds * 4);
    g_backRightLegAngle = 20 * Math.sin(g_seconds * 4);
    
    // Feet/hooves have slight delay
    if (!g_manualFrontLeftFoot) {
      g_frontLeftFootAngle = 10 * Math.sin(g_seconds * 4 - 0.5);
    }
    g_frontRightFootAngle = -10 * Math.sin(g_seconds * 4 - 0.5);
    g_backLeftFootAngle = -10 * Math.sin(g_seconds * 4 - 0.5);
    g_backRightFootAngle = 10 * Math.sin(g_seconds * 4 - 0.5);
    
    // Tail wagging (short quick wags)
    if (!g_manualTail) {
      g_tailAngle = 15 * Math.sin(g_seconds * 6);
    }
    
    // Head bobbing slightly while walking
    g_headAngle = 5 * Math.sin(g_seconds * 4);
    
    // Ears flop
    g_earAngle = 8 * Math.sin(g_seconds * 5);
  }
  
  // Poke animation (shift-click) - Goat headbutt!
  if (g_pokeAnimation) {
    let pokeTime = performance.now() / 1000.0 - g_pokeStartTime;
    if (pokeTime < 1.0) {
      // Rear back then headbutt forward
      if (pokeTime < 0.3) {
        g_headAngle = -30 * (pokeTime / 0.3); // Rear back
      } else if (pokeTime < 0.5) {
        g_headAngle = -30 + 60 * ((pokeTime - 0.3) / 0.2); // Headbutt!
      } else {
        g_headAngle = 30 - 30 * ((pokeTime - 0.5) / 0.5); // Return
      }
      g_tailAngle = 30 * Math.sin(pokeTime * 15);
    } else {
      g_pokeAnimation = false;
    }
  }
}

// ================================================================
// Render Scene - GOAT
// ================================================================
function renderScene() {
  let startTime = performance.now();

  // Set up global rotation matrix
  var globalRotMat = new Matrix4();
  globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
  globalRotMat.rotate(g_globalAngleY, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear canvas
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Goat colors
  const BODY_COLOR = [0.9, 0.88, 0.85, 1.0];      // Off-white/cream
  const DARK_COLOR = [0.4, 0.35, 0.3, 1.0];       // Dark brown (hooves, horns)
  const FACE_COLOR = [0.85, 0.82, 0.78, 1.0];     // Slightly darker cream
  const BEARD_COLOR = [0.95, 0.93, 0.9, 1.0];     // Light beard

  // ============ BODY ============
  var body = new Cube();
  body.color = BODY_COLOR;
  body.matrix.translate(-0.25, -0.05, -0.12);
  body.matrix.scale(0.5, 0.28, 0.24);
  body.render();

  // ============ NECK ============
  var neck = new Cube();
  neck.color = BODY_COLOR;
  neck.matrix.translate(0.18, 0.05, -0.08);
  neck.matrix.rotate(20, 0, 0, 1); // Angled up
  neck.matrix.scale(0.12, 0.22, 0.16);
  neck.render();

  // ============ HEAD ============
  var headMat = new Matrix4();
  headMat.translate(0.28, 0.22, -0.07);
  headMat.rotate(g_headAngle, 0, 0, 1);
  
  var head = new Cube();
  head.color = FACE_COLOR;
  head.matrix.set(headMat);
  head.matrix.scale(0.18, 0.14, 0.14);
  head.render();

  // ============ SNOUT/MUZZLE ============
  var snout = new Cube();
  snout.color = FACE_COLOR;
  snout.matrix.set(headMat);
  snout.matrix.translate(0.14, -0.02, 0.02);
  snout.matrix.scale(0.1, 0.08, 0.1);
  snout.render();

  // ============ NOSE ============
  var nose = new Cube();
  nose.color = [0.3, 0.25, 0.2, 1.0]; // Dark nose
  nose.matrix.set(headMat);
  nose.matrix.translate(0.23, 0.0, 0.04);
  nose.matrix.scale(0.02, 0.04, 0.06);
  nose.render();

  // ============ BEARD (goat signature!) ============
  var beard = new Cube();
  beard.color = BEARD_COLOR;
  beard.matrix.set(headMat);
  beard.matrix.translate(0.12, -0.08, 0.04);
  beard.matrix.scale(0.06, 0.1, 0.06);
  beard.render();

  // ============ LEFT HORN (3 segments - 3rd level joint!) ============
  // Horn base
  var hornLBaseMat = new Matrix4(headMat);
  hornLBaseMat.translate(0.08, 0.14, 0.0);
  hornLBaseMat.rotate(-20, 0, 0, 1); // Angle back
  hornLBaseMat.rotate(-15, 1, 0, 0); // Angle outward
  
  var hornLBase = new Cube();
  hornLBase.color = DARK_COLOR;
  hornLBase.matrix.set(hornLBaseMat);
  hornLBase.matrix.scale(0.03, 0.08, 0.03);
  hornLBase.render();

  // Horn middle (2nd level)
  var hornLMidMat = new Matrix4(hornLBaseMat);
  hornLMidMat.translate(0.0, 0.08, 0.0);
  hornLMidMat.rotate(-25, 0, 0, 1); // Curve back more
  
  var hornLMid = new Cube();
  hornLMid.color = [0.5, 0.45, 0.4, 1.0];
  hornLMid.matrix.set(hornLMidMat);
  hornLMid.matrix.scale(0.025, 0.07, 0.025);
  hornLMid.render();

  // Horn tip (3rd level!)
  var hornLTipMat = new Matrix4(hornLMidMat);
  hornLTipMat.translate(0.0, 0.07, 0.0);
  hornLTipMat.rotate(-20, 0, 0, 1);
  
  // Horn tip (3rd level!) - CONE primitive for pointy tip!
  var hornLTip = new Cone();
  hornLTip.color = [0.6, 0.55, 0.5, 1.0];
  hornLTip.matrix.set(hornLTipMat);
  hornLTip.matrix.translate(0.012, 0, 0.012); // Center over the horn segment
  hornLTip.matrix.scale(0.03, 0.05, 0.03);
  hornLTip.render();

  // ============ RIGHT HORN (3 segments) ============
  var hornRBaseMat = new Matrix4(headMat);
  hornRBaseMat.translate(0.08, 0.14, 0.14);
  hornRBaseMat.rotate(-20, 0, 0, 1);
  hornRBaseMat.rotate(15, 1, 0, 0); // Angle outward other direction
  
  var hornRBase = new Cube();
  hornRBase.color = DARK_COLOR;
  hornRBase.matrix.set(hornRBaseMat);
  hornRBase.matrix.scale(0.03, 0.08, 0.03);
  hornRBase.render();

  var hornRMidMat = new Matrix4(hornRBaseMat);
  hornRMidMat.translate(0.0, 0.08, 0.0);
  hornRMidMat.rotate(-25, 0, 0, 1);
  
  var hornRMid = new Cube();
  hornRMid.color = [0.5, 0.45, 0.4, 1.0];
  hornRMid.matrix.set(hornRMidMat);
  hornRMid.matrix.scale(0.025, 0.07, 0.025);
  hornRMid.render();

  var hornRTipMat = new Matrix4(hornRMidMat);
  hornRTipMat.translate(0.0, 0.07, 0.0);
  hornRTipMat.rotate(-20, 0, 0, 1);
  
  // Right horn tip - CONE primitive!
  var hornRTip = new Cone();
  hornRTip.color = [0.6, 0.55, 0.5, 1.0];
  hornRTip.matrix.set(hornRTipMat);
  hornRTip.matrix.translate(0.012, 0, 0.012); // Center over the horn segment
  hornRTip.matrix.scale(0.03, 0.05, 0.03);
  hornRTip.render();

  // ============ LEFT EAR ============
  var earLeft = new Cube();
  earLeft.color = FACE_COLOR;
  earLeft.matrix.set(headMat);
  earLeft.matrix.translate(0.02, 0.08, -0.04);
  earLeft.matrix.rotate(g_earAngle - 30, 1, 0, 0); // Flop down and out
  earLeft.matrix.rotate(-20, 0, 0, 1);
  earLeft.matrix.scale(0.04, 0.03, 0.08);
  earLeft.render();

  // ============ RIGHT EAR ============
  var earRight = new Cube();
  earRight.color = FACE_COLOR;
  earRight.matrix.set(headMat);
  earRight.matrix.translate(0.02, 0.08, 0.14);
  earRight.matrix.rotate(-g_earAngle + 30, 1, 0, 0); // Flop other direction
  earRight.matrix.rotate(-20, 0, 0, 1);
  earRight.matrix.scale(0.04, 0.03, 0.08);
  earRight.render();

  // ============ EYES ============
  var eyeLeft = new Cube();
  eyeLeft.color = [0.1, 0.1, 0.1, 1.0];
  eyeLeft.matrix.set(headMat);
  eyeLeft.matrix.translate(0.15, 0.08, 0.0);
  eyeLeft.matrix.scale(0.02, 0.03, 0.02);
  eyeLeft.render();

  var eyeRight = new Cube();
  eyeRight.color = [0.1, 0.1, 0.1, 1.0];
  eyeRight.matrix.set(headMat);
  eyeRight.matrix.translate(0.15, 0.08, 0.12);
  eyeRight.matrix.scale(0.02, 0.03, 0.02);
  eyeRight.render();

  // ============ TAIL (short, upward) ============
  var tailMat = new Matrix4();
  tailMat.translate(-0.25, 0.15, 0.0);
  tailMat.rotate(-45 + g_tailAngle, 0, 0, 1); // Points up
  
  var tail = new Cube();
  tail.color = BODY_COLOR;
  tail.matrix.set(tailMat);
  tail.matrix.scale(0.08, 0.04, 0.04);
  tail.matrix.translate(-1, 0, -0.5);
  tail.render();

  // ============ FRONT LEFT LEG ============
  var fLLegUpperMat = new Matrix4();
  fLLegUpperMat.translate(0.12, -0.05, -0.1);
  fLLegUpperMat.rotate(g_frontLeftLegAngle, 0, 0, 1);
  
  var fLLegUpper = new Cube();
  fLLegUpper.color = BODY_COLOR;
  fLLegUpper.matrix.set(fLLegUpperMat);
  fLLegUpper.matrix.scale(0.06, 0.18, 0.06);
  fLLegUpper.matrix.translate(-0.5, -1, 0);
  fLLegUpper.render();

  // Lower leg (2nd level)
  var fLLegLowerMat = new Matrix4(fLLegUpperMat);
  fLLegLowerMat.translate(0.0, -0.18, 0.0);
  fLLegLowerMat.rotate(g_frontLeftFootAngle, 0, 0, 1);
  
  var fLLegLower = new Cube();
  fLLegLower.color = BODY_COLOR;
  fLLegLower.matrix.set(fLLegLowerMat);
  fLLegLower.matrix.scale(0.05, 0.14, 0.05);
  fLLegLower.matrix.translate(-0.5, -1, 0.1);
  fLLegLower.render();

  // Hoof
  var fLHoof = new Cube();
  fLHoof.color = DARK_COLOR;
  fLHoof.matrix.set(fLLegLowerMat);
  fLHoof.matrix.translate(-0.025, -0.17, 0.005);
  fLHoof.matrix.scale(0.05, 0.03, 0.05);
  fLHoof.render();

  // ============ FRONT RIGHT LEG ============
  var fRLegUpperMat = new Matrix4();
  fRLegUpperMat.translate(0.12, -0.05, 0.04);
  fRLegUpperMat.rotate(g_frontRightLegAngle, 0, 0, 1);
  
  var fRLegUpper = new Cube();
  fRLegUpper.color = BODY_COLOR;
  fRLegUpper.matrix.set(fRLegUpperMat);
  fRLegUpper.matrix.scale(0.06, 0.18, 0.06);
  fRLegUpper.matrix.translate(-0.5, -1, 0);
  fRLegUpper.render();

  var fRLegLowerMat = new Matrix4(fRLegUpperMat);
  fRLegLowerMat.translate(0.0, -0.18, 0.0);
  fRLegLowerMat.rotate(g_frontRightFootAngle, 0, 0, 1);
  
  var fRLegLower = new Cube();
  fRLegLower.color = BODY_COLOR;
  fRLegLower.matrix.set(fRLegLowerMat);
  fRLegLower.matrix.scale(0.05, 0.14, 0.05);
  fRLegLower.matrix.translate(-0.5, -1, 0.1);
  fRLegLower.render();

  var fRHoof = new Cube();
  fRHoof.color = DARK_COLOR;
  fRHoof.matrix.set(fRLegLowerMat);
  fRHoof.matrix.translate(-0.025, -0.17, 0.005);
  fRHoof.matrix.scale(0.05, 0.03, 0.05);
  fRHoof.render();

  // ============ BACK LEFT LEG ============
  var bLLegUpperMat = new Matrix4();
  bLLegUpperMat.translate(-0.18, -0.05, -0.1);
  bLLegUpperMat.rotate(g_backLeftLegAngle, 0, 0, 1);
  
  var bLLegUpper = new Cube();
  bLLegUpper.color = BODY_COLOR;
  bLLegUpper.matrix.set(bLLegUpperMat);
  bLLegUpper.matrix.scale(0.06, 0.18, 0.06);
  bLLegUpper.matrix.translate(-0.5, -1, 0);
  bLLegUpper.render();

  var bLLegLowerMat = new Matrix4(bLLegUpperMat);
  bLLegLowerMat.translate(0.0, -0.18, 0.0);
  bLLegLowerMat.rotate(g_backLeftFootAngle, 0, 0, 1);
  
  var bLLegLower = new Cube();
  bLLegLower.color = BODY_COLOR;
  bLLegLower.matrix.set(bLLegLowerMat);
  bLLegLower.matrix.scale(0.05, 0.14, 0.05);
  bLLegLower.matrix.translate(-0.5, -1, 0.1);
  bLLegLower.render();

  var bLHoof = new Cube();
  bLHoof.color = DARK_COLOR;
  bLHoof.matrix.set(bLLegLowerMat);
  bLHoof.matrix.translate(-0.025, -0.17, 0.005);
  bLHoof.matrix.scale(0.05, 0.03, 0.05);
  bLHoof.render();

  // ============ BACK RIGHT LEG ============
  var bRLegUpperMat = new Matrix4();
  bRLegUpperMat.translate(-0.18, -0.05, 0.04);
  bRLegUpperMat.rotate(g_backRightLegAngle, 0, 0, 1);
  
  var bRLegUpper = new Cube();
  bRLegUpper.color = BODY_COLOR;
  bRLegUpper.matrix.set(bRLegUpperMat);
  bRLegUpper.matrix.scale(0.06, 0.18, 0.06);
  bRLegUpper.matrix.translate(-0.5, -1, 0);
  bRLegUpper.render();

  var bRLegLowerMat = new Matrix4(bRLegUpperMat);
  bRLegLowerMat.translate(0.0, -0.18, 0.0);
  bRLegLowerMat.rotate(g_backRightFootAngle, 0, 0, 1);
  
  var bRLegLower = new Cube();
  bRLegLower.color = BODY_COLOR;
  bRLegLower.matrix.set(bRLegLowerMat);
  bRLegLower.matrix.scale(0.05, 0.14, 0.05);
  bRLegLower.matrix.translate(-0.5, -1, 0.1);
  bRLegLower.render();

  var bRHoof = new Cube();
  bRHoof.color = DARK_COLOR;
  bRHoof.matrix.set(bRLegLowerMat);
  bRHoof.matrix.translate(-0.025, -0.17, 0.005);
  bRHoof.matrix.scale(0.05, 0.03, 0.05);
  bRHoof.render();

  // Performance measurement (update every 100ms so it's readable)
  let duration = performance.now() - startTime;
  let now = performance.now();
  if (now - g_lastFPSUpdate > 100) {
    g_displayedMS = Math.round(duration);
    g_displayedFPS = Math.round(1000 / duration);
    g_lastFPSUpdate = now;
  }
  document.getElementById('performance').textContent = 
    g_displayedMS + ' ms | ' + g_displayedFPS + ' fps';
}

// ================================================================
// Animation Loop (tick)
// ================================================================
function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  
  updateAnimationAngles();
  renderScene();
  
  requestAnimationFrame(tick);
}

// ================================================================
// Main
// ================================================================
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  // Set clear color (sky blue background)
  gl.clearColor(0.5, 0.7, 0.9, 1.0);

  // Start animation loop
  tick();
}
