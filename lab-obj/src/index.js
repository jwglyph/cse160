import { setupWebGL, connectVariablesToGLSL, camera, projectionMatrix, viewMatrix, stats } from "./Setup";
import Model from "./Model";
import { Matrix4 } from "../lib/cuon-matrix";

// set up webgl variables
let gl = setupWebGL();
let program = connectVariablesToGLSL(gl);
gl.clearColor(0, 0, 0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// load obj
let teapot = new Model(gl, "teapot.obj");

// prettier-ignore
function renderAllShapes(time) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  stats.begin();

  // send uniforms to shader
  gl.uniformMatrix4fv(program.u_ProjectionMatrix, false, projectionMatrix.elements);
  gl.uniformMatrix4fv(program.u_ViewMatrix, false, viewMatrix.elements);
  gl.uniform3fv(program.u_CameraPos, camera.eye);

  // left teapot - orange
  teapot.color = [1.0, 0.5, 0.0, 1.0];
  teapot.matrix.setScale(0.45, 0.45, 0.45);
  teapot.matrix.translate(-6.0, 5.5, 7.0);
  teapot.matrix.rotate(130, 0, 1, 0);
  teapot.render(gl, program);

  // center teapot - purple
  teapot.color = [0.6, 0.1, 0.9, 1.0];
  teapot.matrix.setScale(0.7, 0.7, 0.7);
  teapot.matrix.rotate(150, 0, 1, 0);
  teapot.render(gl, program);

  // right teapot - cyan
  teapot.color = [0.0, 0.9, 0.8, 1.0];
  teapot.matrix.setScale(0.55, 0.55, 0.55);
  teapot.matrix.translate(5.0, 3.5, 4.0);
  teapot.matrix.rotate(170, 0, 1, 0);
  teapot.render(gl, program);

  stats.end();
  requestAnimationFrame(renderAllShapes);
}

renderAllShapes();
