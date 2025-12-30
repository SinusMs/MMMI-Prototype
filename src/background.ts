import p5 from "p5";
import vertSrc from '/star.vert?url&raw';
import fragSrc from '/star.frag?url&raw';
import * as Audio from './audioManager';

const SKETCH_SIZE = { x: 1920 - 16, y: 1080 - 16 };
export class Background {
    sk: p5;
    stars: { x: number, y: number, size: number, brightness: number, animationSeed: number }[] = [];
    gl: WebGLRenderingContext;
    shader: WebGLProgram;
    positionBuffer: WebGLBuffer;
    sizeBuffer: WebGLBuffer;
    brightnessBuffer: WebGLBuffer;
    animationSeedBuffer: WebGLBuffer;
    
    constructor(sk: p5) {
        this.sk = sk;
        this.gl = (sk as any)._renderer.GL;
        
        // Generate stars
        const numStars = 20000;
        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: sk.random(-SKETCH_SIZE.x / 2, SKETCH_SIZE.x / 2),
                y: sk.random(-SKETCH_SIZE.y / 2, SKETCH_SIZE.y / 2),
                size: sk.random(1.0, 4.0),
                brightness: sk.random(0.3, 1.0),
                animationSeed: sk.random(0, 1000)
            });
        }
        
        // Load and compile shaders
        this.shader = this.createShaderProgram();
        
        // Create buffers
        const positions = new Float32Array(this.stars.flatMap(s => [s.x, s.y, 0]));
        const sizes = new Float32Array(this.stars.map(s => s.size));
        const brightness = new Float32Array(this.stars.map(s => s.brightness));
        const animationSeed = new Float32Array(this.stars.map(s => s.animationSeed));
        
        this.positionBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        this.sizeBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.STATIC_DRAW);
        
        this.brightnessBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.brightnessBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, brightness, this.gl.STATIC_DRAW);

        this.animationSeedBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.animationSeedBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, animationSeed, this.gl.STATIC_DRAW);
    }
    
    createShaderProgram(): WebGLProgram {
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
        this.gl.shaderSource(vertShader, vertSrc);
        this.gl.compileShader(vertShader);
        
        if (!this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation error:', this.gl.getShaderInfoLog(vertShader));
        }
        
        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(fragShader, fragSrc);
        this.gl.compileShader(fragShader);
        
        if (!this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation error:', this.gl.getShaderInfoLog(fragShader));
        }
        
        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vertShader);
        this.gl.attachShader(program, fragShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Shader program linking error:', this.gl.getProgramInfoLog(program));
        }
        
        return program;
    }

    draw(): void {
        const gl = this.gl;
        const renderer = (this.sk as any)._renderer;
        
        // Save ALL current WebGL state
        const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const prevArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        const prevDepthTest = gl.getParameter(gl.DEPTH_TEST);
        const prevDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
        const prevBlend = gl.getParameter(gl.BLEND);
        
        // Disable all vertex attrib arrays to start clean
        const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        const enabledAttribs = [];
        for (let i = 0; i < maxAttribs; i++) {
            if (gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_ENABLED)) {
                enabledAttribs.push(i);
                gl.disableVertexAttribArray(i);
            }
        }
        
        gl.useProgram(this.shader);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Get attribute locations
        const posLoc = gl.getAttribLocation(this.shader, "aPosition");
        const sizeLoc = gl.getAttribLocation(this.shader, "aSize");
        const brightLoc = gl.getAttribLocation(this.shader, "aBrightness");
        const animSeedLoc = gl.getAttribLocation(this.shader, "aAnimationSeed");
        
        // Get uniform locations
        const mvMatrixLoc = gl.getUniformLocation(this.shader, "uModelViewMatrix");
        const projMatrixLoc = gl.getUniformLocation(this.shader, "uProjectionMatrix");
        const freqBandsLoc = gl.getUniformLocation(this.shader, "uFrequencyBands");
        const timeLoc = gl.getUniformLocation(this.shader, "uTime");
        
        // Set time uniform
        gl.uniform1f(timeLoc, this.sk.millis() / 10000);
        
        // Set audio frequency bands uniform
        gl.uniform1fv(freqBandsLoc, new Float32Array(Audio.getFrequencyBands()));
        
        // Set uniforms from p5's renderer
        gl.uniformMatrix4fv(mvMatrixLoc, false, renderer.uMVMatrix.mat4);
        gl.uniformMatrix4fv(projMatrixLoc, false, renderer.uPMatrix.mat4);
        
        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        
        // Bind size buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
        
        // Bind brightness buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
        gl.enableVertexAttribArray(brightLoc);
        gl.vertexAttribPointer(brightLoc, 1, gl.FLOAT, false, 0, 0);

        // Bind animation seed buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.animationSeedBuffer);
        gl.enableVertexAttribArray(animSeedLoc);
        gl.vertexAttribPointer(animSeedLoc, 1, gl.FLOAT, false, 0, 0);
        
        // Draw stars
        gl.drawArrays(gl.POINTS, 0, this.stars.length);
        
        // Disable our vertex attrib arrays
        gl.disableVertexAttribArray(posLoc);
        gl.disableVertexAttribArray(sizeLoc);
        gl.disableVertexAttribArray(brightLoc);
        
        // Restore all vertex attrib arrays
        for (let i = 0; i < maxAttribs; i++) {
            if (enabledAttribs.includes(i)) {
                gl.enableVertexAttribArray(i);
            }
        }
        if (prevBlend) gl.enable(gl.BLEND);
        else gl.disable(gl.BLEND);

        // Restore other WebGL state
        gl.bindBuffer(gl.ARRAY_BUFFER, prevArrayBuffer);
        gl.useProgram(prevProgram);
        if (prevDepthTest) gl.enable(gl.DEPTH_TEST);
        gl.depthMask(prevDepthMask);
    }
}   