class Circle {
  constructor(position, color, size, segments) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.segments = segments;
  }

  render() {
    gl.uniform4f(u_FragColor, ...this.color);

    const [x, y] = this.position;
    const r = this.size / 200.0;
    const step = (2 * Math.PI) / this.segments;

    for (let i = 0; i < this.segments; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;

      const x1 = x + r * Math.cos(a1);
      const y1 = y + r * Math.sin(a1);
      const x2 = x + r * Math.cos(a2);
      const y2 = y + r * Math.sin(a2);

      drawTriangle([x, y, x1, y1, x2, y2]);
    }
  }
}
