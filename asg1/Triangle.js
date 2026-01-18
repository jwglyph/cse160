class Triangle {
  constructor(position, color, size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render() {
    gl.uniform4f(u_FragColor, ...this.color);

    const d = this.size / 200.0;
    const [x, y] = this.position;
    
    const h = d * Math.sqrt(3) / 2;
    drawTriangle([x, y + h/2, x - d/2, y - h/2, x + d/2, y - h/2]);
  }
}

function drawTriangle(vertices) {
  const n = 3;

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}
