let canvas;
let ctx;

function main() {  
  // Retrieve <canvas> element
  canvas = document.getElementById('canvas');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return; 
  } 

  // Get the rendering context for 2DCG
  ctx = canvas.getContext('2d');
  clearCanvas();
}

function clearCanvas() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const x = v.elements[0] * 20;
  const y = v.elements[1] * 20;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + x, cy - y);
  ctx.stroke();
}

function handleDrawEvent() {
  clearCanvas();
  
  let x1 = parseFloat(document.getElementById("v1x").value);
  let y1 = parseFloat(document.getElementById("v1y").value);
  let v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");

  let x2 = parseFloat(document.getElementById("v2x").value);
  let y2 = parseFloat(document.getElementById("v2y").value);
  let v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  clearCanvas();

  let x1 = parseFloat(document.getElementById("v1x").value);
  let y1 = parseFloat(document.getElementById("v1y").value);
  let v1 = new Vector3([x1, y1, 0]);

  let x2 = parseFloat(document.getElementById("v2x").value);
  let y2 = parseFloat(document.getElementById("v2y").value);
  let v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  let op = document.getElementById("op").value;
  let s = parseFloat(document.getElementById("scalar").value);

  if (op === "add") {
    let v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3, "green");
  } else if (op === "sub") {
    let v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (op === "mul") {
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.mul(s);
    v4.mul(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "div") {
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.div(s);
    v4.div(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "mag") {
    console.log("v1 magnitude:", v1.magnitude());
    console.log("v2 magnitude:", v2.magnitude());
  } else if (op === "norm") {
    console.log("v1 magnitude:", v1.magnitude());
    console.log("v2 magnitude:", v2.magnitude());

    v1.normalize();
    v2.normalize();

    drawVector(v1, "green");
    drawVector(v2, "green");
  } else if (op === "angle") {
    const ang = angleBetween(v1, v2);
    console.log("angle between (degrees):", ang);
  } else if (op === "area") {
    let crossVec = Vector3.cross(v1, v2);
    let area = crossVec.magnitude() / 2;
    console.log("triangle area:", area);
  }
}

function angleBetween(v1, v2) {
  const dot = Vector3.dot(v1, v2);
  const m1 = v1.magnitude();
  const m2 = v2.magnitude();

  if (m1 === 0 || m2 === 0) return 0;

  let cosA = dot / (m1 * m2);
  cosA = Math.max(-1, Math.min(1, cosA));

  const angleRad = Math.acos(cosA);
  const angleDeg = angleRad * 180 / Math.PI;
  return angleDeg;
}
