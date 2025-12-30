import p5 from "p5";
import vertSrc from '/star.vert?url&raw';
import fragSrc from '/star.frag?url&raw';

const SKETCH_SIZE = { x: 1920 - 16, y: 1080 - 16 };
export class Background {
    sk: p5;
    stars: { x: number, y: number, size: number, brightness: number }[] = [];
    gl: WebGLRenderingContext;
    shader: WebGLProgram;
    positionBuffer: WebGLBuffer;
    sizeBuffer: WebGLBuffer;
    brightnessBuffer: WebGLBuffer;
    
    constructor(sk: p5) {
        this.sk = sk;
        this.gl = (sk as any)._renderer.GL;
        
        // Generate stars
        const numStars = 3000;
        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: sk.random(-SKETCH_SIZE.x / 2, SKETCH_SIZE.x / 2),
                y: sk.random(-SKETCH_SIZE.y / 2, SKETCH_SIZE.y / 2),
                size: sk.random(0.5, 4.5),
                brightness: sk.random(0.3, 1.0)
            });
        }
        
        // Load and compile shaders
        this.shader = this.createShaderProgram();
        
        // Create buffers
        const positions = new Float32Array(this.stars.flatMap(s => [s.x, s.y, 0]));
        const sizes = new Float32Array(this.stars.map(s => s.size));
        const brightness = new Float32Array(this.stars.map(s => s.brightness));
        
        this.positionBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        this.sizeBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.STATIC_DRAW);
        
        this.brightnessBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.brightnessBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, brightness, this.gl.STATIC_DRAW);
    }
    
    createShaderProgram(): WebGLProgram {
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
        this.gl.shaderSource(vertShader, vertSrc);
        this.gl.compileShader(vertShader);
        
        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(fragShader, fragSrc);
        this.gl.compileShader(fragShader);
        
        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vertShader);
        this.gl.attachShader(program, fragShader);
        this.gl.linkProgram(program);
        
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
        
        // Get uniform locations
        const mvMatrixLoc = gl.getUniformLocation(this.shader, "uModelViewMatrix");
        const projMatrixLoc = gl.getUniformLocation(this.shader, "uProjectionMatrix");
        
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