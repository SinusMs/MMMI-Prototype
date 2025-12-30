precision highp float;

attribute vec3 aPosition;
attribute float aSize;
attribute float aBrightness;

varying float vBrightness;
varying float vSize;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    vBrightness = aBrightness;
    vSize = aSize;
    gl_PointSize = aSize;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0); 
}
