const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

let g_selectedColor = [1, 0, 0, 1]; // red
let g_selectedSize = 10;
let g_shapesList = [];
let g_mouseDown = false;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedType = POINT;
let g_selectedSegments = 10;

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to init shaders");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
  if (!u_Size) {
    console.log("Failed to get u_Size");
    return
  }
}

function convertCoordinatesEventToGL(ev) {
  const rect = ev.target.getBoundingClientRect();
  let x = ev.clientX - rect.left;
  let y = ev.clientY - rect.top;

  x = (x - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - y) / (canvas.height / 2);
  return [x, y];
}

function updateColorFromSliders() {
  const r = parseFloat(document.getElementById("red").value) / 100;
  const g = parseFloat(document.getElementById("green").value) / 100;
  const b = parseFloat(document.getElementById("blue").value) / 100;
  g_selectedColor = [r, g, b, 1];
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}

function handleClicks(ev) {
  const [x, y] = convertCoordinatesEventToGL(ev);
  
  let shape;
  if (g_selectedType === POINT) {
    shape = new Point([x, y], [...g_selectedColor], g_selectedSize);
  } else if (g_selectedType === TRIANGLE) {
    shape = new Triangle([x, y], [...g_selectedColor], g_selectedSize);
  } else {
    shape = new Circle([x, y], [...g_selectedColor], g_selectedSize, g_selectedSegments);
  }

  g_shapesList.push(shape);
  renderAllShapes();
}

function updateSizeFromSlider() {
  g_selectedSize = parseFloat(document.getElementById("size").value);
}

function clearCanvas() {
  g_shapesList = [];
  renderAllShapes();
}

function setColor(r, g, b, a=1) {
  gl.uniform4f(u_FragColor, r, g, b, a);
}

// draws rectangle using 2 triangles
function drawRect(x1, y1, x2, y2) {
  // (x1,y1) bottom-left, (x2,y2) top-right
  drawTriangle([x1, y1,  x2, y1,  x2, y2]);
  drawTriangle([x1, y1,  x2, y2,  x1, y2]);
}

function drawCircleTriangles(cx, cy, r, segments) {
  const step = (2 * Math.PI) / segments;
  for (let i = 0; i < segments; i++) {
    const a1 = i * step;
    const a2 = (i + 1) * step;

    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);

    drawTriangle([cx, cy, x1, y1, x2, y2]);
  }
}

function drawMyPicture() {
  renderAllShapes();

  // --- House base (blue rectangle: 2 triangles)
  setColor(0.05, 0.20, 0.95, 1);
  drawRect(-0.45, -1.0, 0.35, -0.15); // base

  // --- Roof (red triangle + a couple extra triangles to make it "filled" larger)
  setColor(1.0, 0.15, 0.05, 1);
  // big roof triangle
  drawTriangle([-0.55, -0.15,  0.45, -0.15,  -0.05, 0.55]);
  // small filler triangles to add detail
  drawTriangle([-0.55, -0.15,  -0.30, 0.10,  -0.05, 0.55]);
  drawTriangle([0.45, -0.15,   0.20, 0.10,   -0.05, 0.55]);

  // --- Door (dark rectangle: 2 triangles)
  setColor(0.35, 0.10, 0.20, 1);
  drawRect(-0.35, -1.0, -0.12, -0.55);

  // --- Window (yellow square split into 4 panes
  setColor(1.0, 0.95, 0.10, 1);
  // panes: split into 4 small squares
  drawRect(0.06, -0.54, 0.16, -0.44);
  drawRect(0.17, -0.54, 0.27, -0.44);
  drawRect(0.06, -0.65, 0.16, -0.55);
  drawRect(0.17, -0.65, 0.27, -0.55);

  // --- Smiley sun/face
  // big yellow face circle
  setColor(1.0, 1.0, 0.0, 1);
  drawCircleTriangles(0.60, 0.70, 0.17, 36);

  // Eyes (black tiny circles)
  setColor(0, 0, 0, 1);
  drawCircleTriangles(0.54, 0.76, 0.03, 10);
  drawCircleTriangles(0.67, 0.76, 0.03, 10);

  // Nose (orange small triangle)
  setColor(1.0, 0.65, 0.0, 1);
  drawTriangle([0.60, 0.72,  0.57, 0.67,  0.63, 0.67]);

  // Smile dots (red mini circles - a few)
  setColor(1.0, 0.0, 0.0, 1);
  const dots = [
    [0.52, 0.65], [0.55, 0.62], [0.58, 0.60],
    [0.62, 0.60], [0.65, 0.62], [0.68, 0.65],
  ];
  for (const [x, y] of dots) {
    drawCircleTriangles(x, y, 0.015, 8);
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  canvas.onmousedown = function(ev) {
    g_mouseDown = true;
    handleClicks(ev); // draw immediately on press
  };

  canvas.onmouseup = function() {
    g_mouseDown = false;
  };

  canvas.onmouseleave = function() {
    g_mouseDown = false;
  };

  canvas.onmousemove = function(ev) {
    if (g_mouseDown) {
      handleClicks(ev); // draw while dragging
    }
  };

  ["red", "green", "blue"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateColorFromSliders);
  });
  updateColorFromSliders();

  document.getElementById("size").addEventListener("input", updateSizeFromSlider);
  updateSizeFromSlider();

  document.getElementById("refPic").onclick = () => {
    const img = document.getElementById("refImg");
    img.style.display = (img.style.display === "none") ? "block" : "none";
  };

  document.getElementById("clear").onclick = clearCanvas;
  document.getElementById("drawPic").onclick = drawMyPicture;
  document.getElementById("pointBtn").onclick = () => g_selectedType = POINT;
  document.getElementById("triBtn").onclick = () => g_selectedType = TRIANGLE;
  document.getElementById("circBtn").onclick = () => g_selectedType = CIRCLE;
  document.getElementById("segments").addEventListener("input", () => {
    g_selectedSegments = parseInt(document.getElementById("segments").value);
  });
  g_selectedSegments = parseInt(document.getElementById("segments").value);
}
