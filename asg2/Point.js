class Point {
  constructor(position, color, size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render() {
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniform1f(u_Size, this.size);
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
