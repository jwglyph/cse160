import { initShaders } from "../lib/cuon-utils";
import { Matrix4 } from "../lib/cuon-matrix";
import { VSHADER_SOURCE, FSHADER_SOURCE } from "./shaders";
import Stats from "stats.js";

// prettier-ignore
export const camera = {
  eye:      [0, 4, -4],
  at:       [0, 1, 0],
  up:       [0, 1, 0],
};

// calculate view and projection matrices
// prettier-ignore
export const viewMatrix = new Matrix4().setLookAt(...camera.eye,  ...camera.at,  ...camera.up);
export const projectionMatrix = new Matrix4().setPerspective(90, 1, 0.1, 200);

export function setupWebGL() {
    let canvas = document.getElementById("webgl");
    let gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log("Failed to get the rendering context for WebGL");
        return;
    }

    gl.enable(gl.DEPTH_TEST);

    return gl;
}

export function connectVariablesToGLSL(gl) {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log("Failed to intialize shaders.");
        return;
    }

    // prettier-ignore
    let program = {
      a_Position:         gl.getAttribLocation (gl.program, "a_Position"),
      a_Normal:           gl.getAttribLocation (gl.program, "a_Normal"),
      u_ModelMatrix:      gl.getUniformLocation(gl.program, "u_ModelMatrix"),
      u_ProjectionMatrix: gl.getUniformLocation(gl.program, "u_ProjectionMatrix"),
      u_ViewMatrix:       gl.getUniformLocation(gl.program, "u_ViewMatrix"),
      u_NormalMatrix:     gl.getUniformLocation(gl.program, "u_NormalMatrix"),
      u_CameraPos:        gl.getUniformLocation(gl.program, "u_CameraPos"),
      u_FragColor:        gl.getUniformLocation(gl.program, "u_FragColor"),
    };

    return program;
}

// set up FPS Monitor, check out https://github.com/mrdoob/stats.js/ for more info
export let stats = new Stats();
stats.dom.style.left = "auto";
stats.dom.style.right = "0";
stats.showPanel(0);
document.body.appendChild(stats.dom);
