precision highp float;

varying float vBrightness;
varying float vSize;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Calculate how much 1 pixel represents in gl_PointCoord distance
    float pixelSize = 1.0 / vSize;
    // Anti-alias over 1 pixel at the edge
    float edge = 1.0 - smoothstep(0.5 - pixelSize, 0.5, dist);
    
    float alpha = vBrightness * edge;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
