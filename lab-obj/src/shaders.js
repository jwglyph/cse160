export const VSHADER_SOURCE = `
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ProjectionMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_NormalMatrix;

    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    
    varying vec3 v_Position;
    varying vec3 v_Normal;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
    }`;

export const FSHADER_SOURCE = `
    precision highp float;
    varying vec3 v_Position;
    varying vec3 v_Normal;

    uniform vec4 u_FragColor;
    uniform vec3 u_CameraPos;

    float getFakeLight() {
        return clamp(dot(normalize(vec3(16.0, 14.0, -13.0) - v_Position), normalize(v_Normal)), 0.0, 1.0);
    }

    void main() {
        gl_FragColor = vec4(u_FragColor.rgb * getFakeLight(), 1.0);            
    }`;
