precision highp float;

varying float vBrightness;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float alpha = vBrightness * (1.0 - smoothstep(0.0, 0.5, dist));
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
