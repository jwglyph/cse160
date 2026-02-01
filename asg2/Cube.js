// Cube class - based on Circle class structure from asg1
// Has type, color, matrix fields and a render() function

class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    var rgba = this.color;

    // Pass the color to u_FragColor
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    
    // Pass the matrix to u_ModelMatrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Draw each face of the cube
    // Cube goes from (0,0,0) to (1,1,1)
    
    // Front face (z = 0)
    drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
    drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);

    // Back face (z = 1)
    drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
    drawTriangle3D([0,0,1,  1,1,1,  0,1,1]);

    // Top face (y = 1)
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
    drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

    // Bottom face (y = 0)
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
    drawTriangle3D([0,0,0,  1,0,0,  1,0,1]);

    // Right face (x = 1)
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);
    drawTriangle3D([1,0,0,  1,1,0,  1,1,1]);

    // Left face (x = 0)
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);
    drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);
  }
}
