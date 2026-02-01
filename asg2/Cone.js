// Cone class - non-cube primitive
// Cone goes from base at y=0 to tip at y=1

class Cone {
  constructor() {
    this.type = 'cone';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 8; // Number of segments around the cone
  }

  render() {
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var segments = this.segments;
    var angleStep = 360 / segments;

    // Draw the cone sides (triangles from base edge to tip)
    for (var i = 0; i < segments; i++) {
      var angle1 = i * angleStep;
      var angle2 = (i + 1) * angleStep;

      var rad1 = angle1 * Math.PI / 180;
      var rad2 = angle2 * Math.PI / 180;

      // Base points (y = 0, radius = 0.5)
      var x1 = 0.5 * Math.cos(rad1);
      var z1 = 0.5 * Math.sin(rad1);
      var x2 = 0.5 * Math.cos(rad2);
      var z2 = 0.5 * Math.sin(rad2);

      // Tip point (y = 1)
      var tipX = 0;
      var tipY = 1;
      var tipZ = 0;

      // Draw triangle from two base points to tip
      // Alternate shading for visibility
      var shade = 0.8 + 0.2 * (i % 2);
      gl.uniform4f(u_FragColor, rgba[0]*shade, rgba[1]*shade, rgba[2]*shade, rgba[3]);
      
      drawTriangle3D([
        x1, 0, z1,
        x2, 0, z2,
        tipX, tipY, tipZ
      ]);
    }

    // Draw the base (circle at y = 0)
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    for (var i = 0; i < segments; i++) {
      var angle1 = i * angleStep;
      var angle2 = (i + 1) * angleStep;

      var rad1 = angle1 * Math.PI / 180;
      var rad2 = angle2 * Math.PI / 180;

      var x1 = 0.5 * Math.cos(rad1);
      var z1 = 0.5 * Math.sin(rad1);
      var x2 = 0.5 * Math.cos(rad2);
      var z2 = 0.5 * Math.sin(rad2);

      // Triangle from center to edge
      drawTriangle3D([
        0, 0, 0,
        x2, 0, z2,
        x1, 0, z1
      ]);
    }
  }
}
