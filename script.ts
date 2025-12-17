import { GestureRecognizer, FilesetResolver, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import p5 from 'p5';
import * as Tone from 'tone';
import { initAudio, startLoop, stopLoop, setLoopVolume, setEffectValue, triggerSample } from './audioManager';


// ===================================================================
// SHADER DEFINITIONS
// ===================================================================

const vertShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
`;

const fragShader = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

#define M_PI 3.1415926535897932384626433832795
#define M_TWO_PI (2.0 * M_PI)

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898,12.1414))) * 83758.5453);
}

float noise(vec2 n) {
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n);
    vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

vec3 ramp(float t) {
    return t <= .5 ? vec3( 1. - t * 1.4, .2, 1.05 ) / t : vec3( .3 * (1. - t) * 2., .2, 1.05 ) / t;
}

vec2 polarMap(vec2 uv, float shift, float inner) {
    uv = vec2(0.5) - uv;
    float px = 1.0 - fract(atan(uv.y, uv.x) / 6.28 + 0.25) + shift;
    float py = (sqrt(uv.x * uv.x + uv.y * uv.y) * (1.0 + inner * 2.0) - inner) * 2.0;
    return vec2(px, py);
}

float fire(vec2 n) {
    return noise(n) + noise(n * 2.1) * .6 + noise(n * 5.4) * .42;
}

float shade(vec2 uv, float t) {
    uv.x += uv.y < .5 ? 23.0 + t * .035 : -11.0 + t * .03;
    uv.y = abs(uv.y - .5);
    uv.x *= 35.0;
    float q = fire(uv - t * .013) / 2.0;
    vec2 r = vec2(fire(uv + q / 2.0 + t - uv.x - uv.y), fire(uv + q - t));
    return pow((r.y + r.y) * max(.0, uv.y) + .1, 4.0);
}

vec3 color(float grad) {
    // iMouse logic removed/fixed for stability
    float m2 = 1.15; 
    grad = sqrt(grad);
    vec3 color = vec3(1.0 / (pow(vec3(0.5, 0.0, .1) + 2.61, vec3(2.0))));
    vec3 color2 = color;
    color = ramp(grad);
    color /= (m2 + max(vec3(0.0), color));
    return color;
}

void main() {
    // Fixed m1 value (simulation iMouse.z < 0.0001)
    float m1 = 3.6;
    
    float t = u_time;
    vec2 uv = gl_FragCoord.xy / u_resolution.yy;
    float ff = 1.0 - uv.y;
    uv.x -= (u_resolution.x / u_resolution.y - 1.0) / 2.0;
    vec2 uv2 = uv;
    uv2.y = 1.0 - uv2.y;
    
    uv = polarMap(uv, 1.3, m1);
    uv2 = polarMap(uv2, 1.9, m1);

    vec3 c1 = color(shade(uv, t)) * ff;
    vec3 c2 = color(shade(uv2, t)) * (1.0 - ff);
    
    gl_FragColor = vec4(c1 + c2, 1.0);
}
`;


const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// Layout Grid
const FADER_START_X = 100;
const FADER_WIDTH = 80;
const FADER_HEIGHT = 300;
const FADER_SPACING = 200;

const KNOB_X_START = 1050; 
const KNOB_SPACING_Y = 220;
const KNOB_SIZE = 140;

const BUTTON_Y = 550; 
const BUTTON_SIZE = 100;

// Trigger States
let triggerStates: boolean[] = [false, false, false, false, false];

// ZUSTANDSVARIABLEN
let faderValues = [0.0, 0.0, 0.0, 0.0]; 
let effectValues = {
    reverb: 0.0,
    delay: 0.0,
    filter: 0.5
};

// Tracking
let activeControl: { type: 'fader' | 'knob', index: number | string } | null = null;

// MediaPipe & Globals
let gestureRecognizer: GestureRecognizer | null = null;
let vidSrc: any = null;
let result: GestureRecognizerResult | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let customFont: any = null;

// SHADER GLOBALS
let bgShader: p5.Shader;
let shaderLayer: p5.Graphics;

// ===================================================================
// MAIN P5 SKETCH
// ===================================================================

const sketch = (sk: p5) => {

    sk.setup = async () => {
        // Haupt-Canvas bleibt im Default Modus (P2D), wichtig für Koordinaten!
        sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, canvasEl);
        
        // 1. Shader Layer initialisieren (WEBGL Mode)
        shaderLayer = sk.createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT, sk.WEBGL);
        bgShader = shaderLayer.createShader(vertShader, fragShader);

        try {
            customFont = await sk.loadFont('fonts/Arial.ttf'); 
            if (customFont) sk.textFont(customFont);
        } catch(e) { console.log("Font fallback"); }

        vidSrc = sk.createCapture(sk.VIDEO);
        vidSrc.size(CANVAS_WIDTH, CANVAS_HEIGHT);
        vidSrc.hide();
        
        if (vidSrc.elt) {
             vidSrc.elt.onloadeddata = predictWebcam;
        }
    };

    sk.draw = () => {
        // --- 0. Shader Hintergrund Rendern ---
        shaderLayer.shader(bgShader);
        bgShader.setUniform('u_resolution', [CANVAS_WIDTH *1.5, CANVAS_HEIGHT*1.5]);
        bgShader.setUniform('u_time', sk.millis() / 1000.0);
        
        // Ein Rechteck über den gesamten Shader-Layer zeichnen, damit der Shader läuft
        shaderLayer.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Das Shader-Bild als Hintergrund zeichnen
        sk.image(shaderLayer, CANVAS_WIDTH / 8, 0 - CANVAS_HEIGHT / 8);

        // Optional: Halbtransparenter Overlay, damit UI besser lesbar ist
        sk.fill(0, 0, 0, 100); 
        sk.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);


        // Lade-Screen Check
        if (!vidSrc || !vidSrc.elt || vidSrc.elt.readyState < 2) {
            drawLoadingScreen(sk);
            return;
        }

        // --- 1. Hand Tracking Daten ---
        let handX = -100;
        let handY = -100;
        let isFist = false;

        if (result && result.landmarks && result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            handX = (1 - lm[8].x) * CANVAS_WIDTH; 
            handY = lm[8].y * CANVAS_HEIGHT;

            // Fist detection
            const thumbTip = lm[4];
            const indexTip = lm[8];
            const distance = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
            
            if (distance < 0.05) { 
                isFist = true;
            }
        }

        // --- 2. Logik: Interaktion ---
        handleInteractions(sk, handX, handY, isFist);

        // --- 3. Rendering (UI über dem Shader) ---
        
        // Trennlinien
        sk.stroke(200, 50); // Heller für besseren Kontrast auf dunklem Shader
        sk.strokeWeight(2);
        sk.line(0, 480, 900, 480); 
        sk.line(900, 0, 900, 720); 

        // Fader (Samples 1-4)
        for (let i = 0; i < 4; i++) {
            drawFader(sk, i, FADER_START_X + (i * FADER_SPACING), 150, faderValues[i]);
        }

        // Effekte (Rechts)
        drawKnob(sk, 'Reverb', KNOB_X_START, 100, effectValues.reverb, '#00ffff');
        drawKnob(sk, 'Delay', KNOB_X_START, 100 + KNOB_SPACING_Y, effectValues.delay, '#00ffff');
        // Filter: Spezieller Knob
        drawFilterKnob(sk, 'Filter', KNOB_X_START, 100 + KNOB_SPACING_Y * 2, effectValues.filter);

        // Buttons
        drawButton(sk, 0, 180, BUTTON_Y, '#0085C7', triggerStates[0]); // Blau
        drawButton(sk, 1, 400, BUTTON_Y, '#333333', triggerStates[1]); // Schwarz
        drawButton(sk, 2, 620, BUTTON_Y, '#EE334E', triggerStates[2]); // Rot
        drawButton(sk, 3, 290, BUTTON_Y + 90, '#FCB131', triggerStates[3]); // Gelb
        drawButton(sk, 4, 510, BUTTON_Y + 90, '#00A651', triggerStates[4]); // Grün

        sk.fill(200);
        sk.noStroke();
        sk.textSize(16);
        sk.textAlign(sk.CENTER);
        sk.text("Sample Triggers", 400, 700);

        drawCursor(sk, handX, handY, isFist);
    };

    // ... Restliche Event Listener (mousePressed, keyPressed) bleiben gleich ...
    sk.mousePressed = async () => {
        await initAudio();
        startLoop(); 
    };
    
    sk.keyPressed = () => {
        if(sk.key === ' ') stopLoop();
        if(sk.key === 's') startLoop();
    };
};

// ===================================================================
// INTERAKTIONS LOGIK
// ===================================================================

function handleInteractions(sk: p5, x: number, y: number, isFist: boolean) {
    // RESET BEIM LOSLASSEN (Hand offen)
    if (!isFist) {
        // Spezialfall: Filter springt zurück auf Neutral (Mitte)
        if (activeControl && activeControl.type === 'knob' && activeControl.index === 'filter') {
            effectValues.filter = 0.5;
            setEffectValue('filter', 0.5);
        }

        activeControl = null;
        for(let i=0; i<triggerStates.length; i++) triggerStates[i] = false;
        return;
    }

    // WENN AKTIV GEGRIFFEN
    if (activeControl) {
        if (activeControl.type === 'fader') {
            const idx = activeControl.index as number;
            const faderTop = 150;
            const faderBottom = 150 + FADER_HEIGHT;
            let rawVal = sk.map(y, faderBottom, faderTop, 0, 1, true);
            faderValues[idx] = rawVal;
            setLoopVolume(idx, rawVal);
        }
        else if (activeControl.type === 'knob') {
            const name = activeControl.index as string;
            
            let centerY = 0;
            if(name === 'reverb') centerY = 100;
            if(name === 'delay') centerY = 100 + KNOB_SPACING_Y;
            if(name === 'filter') centerY = 100 + KNOB_SPACING_Y * 2;
            
            let val = sk.map(y, centerY + 100, centerY - 100, 0, 1, true);
            
            if (name === 'filter') {
               effectValues.filter = val;
               setEffectValue('filter', val);
            } else if (name === 'reverb') {
                effectValues.reverb = val;
                setEffectValue('reverb', val);
            } else if (name === 'delay') {
                effectValues.delay = val;
                setEffectValue('delay', val);
            }
        }
        return; 
    }

    // NEUE KOLLISION (nur wenn noch nichts gegriffen)

    // Fader
    for (let i = 0; i < 4; i++) {
        const fx = FADER_START_X + (i * FADER_SPACING);
        const fy = 150;
        const valY = fy + FADER_HEIGHT - (faderValues[i] * FADER_HEIGHT);
        
        if (sk.dist(x, y, fx + FADER_WIDTH/2, valY) < 60) {
            activeControl = { type: 'fader', index: i };
            return;
        }
    }

    // Knobs
    const checkKnob = (name: string, ky: number) => {
        if (sk.dist(x, y, KNOB_X_START, ky) < KNOB_SIZE/2 + 20) {
            activeControl = { type: 'knob', index: name };
        }
    };
    checkKnob('reverb', 100);
    checkKnob('delay', 100 + KNOB_SPACING_Y);
    checkKnob('filter', 100 + KNOB_SPACING_Y * 2);
    if (activeControl) return;

    // Buttons
    const checkBtn = (idx: number, bx: number, by: number) => {
        if (sk.dist(x, y, bx, by) < BUTTON_SIZE/2) {
            if (!triggerStates[idx]) { 
                triggerStates[idx] = true;
                triggerSample(idx); 
            }
        }
    };
    
    checkBtn(0, 180, BUTTON_Y);
    checkBtn(1, 400, BUTTON_Y);
    checkBtn(2, 620, BUTTON_Y);
    checkBtn(3, 290, BUTTON_Y + 90);
    checkBtn(4, 510, BUTTON_Y + 90);
}


// ===================================================================
// UI RENDERING
// ===================================================================

function drawFader(sk: p5, index: number, x: number, y: number, val: number) {
    sk.push();
    sk.fill(255);
    sk.noStroke();
    sk.textSize(16);
    sk.textAlign(sk.LEFT);
    sk.text(`Sample ${index + 1}`, x, y - 15);

    sk.noFill();
    sk.stroke(60);
    sk.strokeWeight(2);
    sk.rect(x, y, FADER_WIDTH, FADER_HEIGHT);

    let ctx = (sk as any).drawingContext;
    let gradient = ctx.createLinearGradient(x, y + FADER_HEIGHT, x, y);
    gradient.addColorStop(0, '#4B0082'); 
    gradient.addColorStop(1, '#9d4edd'); 
    
    ctx.fillStyle = gradient;
    
    let fillH = val * FADER_HEIGHT;
    sk.noStroke();
    sk.rect(x, y + FADER_HEIGHT - fillH, FADER_WIDTH, fillH);

    let handleY = y + FADER_HEIGHT - fillH;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = "white";
    
    sk.fill(255);
    sk.ellipse(x + FADER_WIDTH/2, handleY, FADER_WIDTH + 10); 
    
    ctx.shadowBlur = 0; 

    sk.fill('#9d4edd');
    sk.textAlign(sk.CENTER);
    sk.text(`${Math.round(val * 100)}%`, x + FADER_WIDTH/2, y + FADER_HEIGHT + 25);
    sk.pop();
}

function drawKnob(sk: p5, label: string, x: number, y: number, val: number, activeColor: string) {
    sk.push();
    sk.fill(255);
    sk.noStroke();
    sk.textSize(16);
    sk.textAlign(sk.CENTER);
    sk.text(label, x, y - KNOB_SIZE/2 - 15);

    sk.fill(20);
    sk.stroke(40);
    sk.strokeWeight(2);
    sk.ellipse(x, y, KNOB_SIZE);

    sk.noFill();
    sk.stroke(activeColor);
    sk.strokeWeight(6);
    
    let startAngle = sk.radians(135);
    let endAngle = sk.radians(405);
    let currentAngle = sk.map(val, 0, 1, startAngle, endAngle);
    
    sk.stroke(40);
    sk.arc(x, y, KNOB_SIZE - 10, KNOB_SIZE - 10, startAngle, endAngle);
    
    let ctx = (sk as any).drawingContext;
    ctx.shadowBlur = 10;
    ctx.shadowColor = activeColor;
    
    sk.stroke(activeColor);
    sk.arc(x, y, KNOB_SIZE - 10, KNOB_SIZE - 10, startAngle, currentAngle);
    
    ctx.shadowBlur = 0;

    let px = x + sk.cos(currentAngle) * (KNOB_SIZE/2 - 15);
    let py = y + sk.sin(currentAngle) * (KNOB_SIZE/2 - 15);
    sk.stroke(255);
    sk.strokeWeight(2);
    sk.line(x, y, px, py);

    sk.fill(activeColor);
    sk.noStroke();
    sk.textSize(20);
    sk.text(`${Math.round(val * 100)}%`, x, y + 5);
    sk.pop();
}

function drawFilterKnob(sk: p5, label: string, x: number, y: number, val: number) {
    sk.push();
    
    sk.fill(255);
    sk.noStroke();
    sk.textSize(16);
    sk.textAlign(sk.CENTER);
    sk.text(label, x, y - KNOB_SIZE/2 - 15);

    sk.fill(20);
    sk.stroke(40);
    sk.strokeWeight(2);
    sk.ellipse(x, y, KNOB_SIZE);

    let startAngle = sk.radians(135);
    let endAngle = sk.radians(405);
    let midAngle = sk.radians(270); // Norden
    
    let currentAngle = sk.map(val, 0, 1, startAngle, endAngle);
    let ctx = (sk as any).drawingContext;

    sk.noFill();
    sk.strokeWeight(6);

    // Initialwert ist 0.5 (Mitte)
    if (val < 0.48) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff4444";
        sk.stroke('#ff4444');
        sk.arc(x, y, KNOB_SIZE-10, KNOB_SIZE-10, currentAngle, midAngle);
    } else if (val > 0.52) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#4444ff";
        sk.stroke('#4444ff');
        sk.arc(x, y, KNOB_SIZE-10, KNOB_SIZE-10, midAngle, currentAngle);
    } else {
        // Mitte
        sk.fill(255);
        sk.noStroke();
        sk.circle(x, y - (KNOB_SIZE/2 - 10), 10);
    }
    
    ctx.shadowBlur = 0;

    let px = x + sk.cos(currentAngle) * (KNOB_SIZE/2 - 15);
    let py = y + sk.sin(currentAngle) * (KNOB_SIZE/2 - 15);
    sk.stroke(255);
    sk.strokeWeight(2);
    sk.line(x, y, px, py);

    sk.noStroke();
    sk.textSize(14);
    sk.textAlign(sk.LEFT);
    sk.fill('#ff4444'); sk.text("Low", x - 60, y + 60);
    sk.textAlign(sk.RIGHT);
    sk.fill('#4444ff'); sk.text("Hi", x + 60, y + 60);
    
    sk.textAlign(sk.CENTER);
    sk.fill(255);
    if(val < 0.49) sk.text(`Low ${Math.round((0.5-val)*200)}%`, x, y + 20);
    else if (val > 0.51) sk.text(`Hi ${Math.round((val-0.5)*200)}%`, x, y + 20);
    else sk.text("Neutral", x, y + 20);

    sk.pop();
}

function drawButton(sk: p5, index: number, x: number, y: number, color: string, isActive: boolean) {
    sk.push();
    
    let size = isActive ? BUTTON_SIZE + 10 : BUTTON_SIZE;
    let ctx = (sk as any).drawingContext;
    
    if (isActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
    }

    sk.noFill();
    sk.stroke(color);
    sk.strokeWeight(8);
    sk.ellipse(x, y, size);
    
    ctx.shadowBlur = 0;

    sk.fill(color);
    sk.noStroke();
    sk.textSize(30);
    sk.textStyle(sk.BOLD);
    sk.textAlign(sk.CENTER, sk.CENTER);
    sk.text(index + 1, x, y);

    sk.pop();
}

function drawCursor(sk: p5, x: number, y: number, isFist: boolean) {
    sk.push();
    if (isFist) {
        sk.fill(255, 0, 0); 
        sk.noStroke();
        sk.circle(x, y, 15);
        
        sk.noFill();
        sk.stroke(255, 0, 0);
        sk.strokeWeight(2);
        sk.circle(x, y, 30);
    } else {
        sk.fill(0, 255, 0); 
        sk.noStroke();
        sk.circle(x, y, 10);
    }
    sk.pop();
}

function drawLoadingScreen(sk: p5) {
    sk.fill(255);
    sk.textSize(20);
    sk.textAlign(sk.CENTER, sk.CENTER);
    sk.text("Kamera wird initialisiert...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

// ===================================================================
// INIT
// ===================================================================

async function main() {
    try {
        const vision = await FilesetResolver.forVisionTasks("public/mediapipe/wasm");
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, { 
            baseOptions: {
                modelAssetPath: "public/mediapipe/gesture_recognizer.task" 
            },
            numHands: 1, 
            runningMode: 'VIDEO',
        });
        
        new p5(sketch);
        
    } catch (e) {
        console.error("Setup Fehler:", e);
    }
}

main();

function predictWebcam() {
    if (!vidSrc || !vidSrc.elt || !gestureRecognizer) return;
    result = gestureRecognizer.recognizeForVideo(vidSrc.elt, performance.now());
    window.requestAnimationFrame(predictWebcam);
}