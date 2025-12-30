import p5 from 'p5';
import { ResultsHandler } from './resultshandler';
import * as Audio from './audioManager'
import { UI } from './ui';
import * as Color from './colors';
import { Background } from './background';

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let results: ResultsHandler = new ResultsHandler();
let vidProcessingTime: number = -1;
let recognizeTime: number = -1;
let debug: boolean = false;
let started: boolean = false;

const welcomePopup = document.getElementById('welcome-popup');
const startButton = document.getElementById('start-button');
if (startButton && welcomePopup) {
    startButton.addEventListener('click', async () => {
        started = true;
        welcomePopup.classList.add('hidden');
        await Audio.initAudio();
        Audio.startLoop();
    });
}

const worker = new Worker(new URL('./gesture-worker.js', import.meta.url));
worker.onmessage = (e) => {
    const { type, data } = e.data;
    switch (type) {
        case "init-done":
            break;
        case "result":
            results.addResult(data.result, performance.now());
            vidProcessingTime = performance.now() - data.t0;
            recognizeTime = data.recognizeTime;
            if (vidSrc) {
                vidSrc!.elt.requestVideoFrameCallback(recoginzeGestures);
            }
            break;
        default:
            console.warn("Unknown message type from worker: ", type), e.data;
    }
};
worker.postMessage({ type: "init" });

const sketch = (sk: p5) => {
    let textGraphics: p5.Graphics;
    let ui: UI;
    let bg: Background;
    
    sk.setup = () => {
        sk.createCanvas(1920 - 16, 1080 - 16, sk.WEBGL, canvasEl); 
        sk.setAttributes({ antialias: true });
        ui = new UI(sk);
        
        textGraphics = sk.createGraphics(1920 - 16, 1080 - 16);
        textGraphics.textSize(16);
        textGraphics.fill(47, 79, 79);
        
        sk.frameRate(60);
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = recoginzeGestures;
        bg = new Background(sk);
    };
    
    sk.draw = () => {
        let t0 = performance.now();
        sk.clear();
        
        bg.draw();
        // Transform origin to top-left corner (like p5's 2D mode)
        sk.translate(-sk.width / 2, -sk.height / 2);
        
        
        let twoHandsData = results.getTwoHandsData();
        let hasAnyHand = twoHandsData.left.position || twoHandsData.right.position;
        if (hasAnyHand) vidSrc?.hide();
        else vidSrc?.show();
        
        ui.evaluate(twoHandsData);
        ui.draw(debug);
        
        if (!debug) return;
        
        textGraphics.clear();
        textGraphics.fill(Color.debug1);
        textGraphics.text(`Left: ${twoHandsData.left.gesture}`, 10, 30);
        textGraphics.text(`Right: ${twoHandsData.right.gesture}`, 10, 50);
        textGraphics.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 70);
        textGraphics.text("total video processing time: " + vidProcessingTime.toFixed(1).padStart(4, '0') + " ms", 10, 90);
        textGraphics.text("recognize time: " + recognizeTime.toFixed(1).padStart(4, '0') + " ms", 10, 110);
        textGraphics.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 130);
        textGraphics.text("left hand: " + (twoHandsData.left.position ? `(${twoHandsData.left.position.x.toFixed(0)}, ${twoHandsData.left.position.y.toFixed(0)})` : "N/A"), 10, 150);
        textGraphics.text("right hand: " + (twoHandsData.right.position ? `(${twoHandsData.right.position.x.toFixed(0)}, ${twoHandsData.right.position.y.toFixed(0)})` : "N/A"), 10, 170);
        textGraphics.text("Frequency Bands: " + Audio.getFrequencyBands().map(f => f.toFixed(2)).join(", "), 10, 190);
        
        sk.push();
        sk.resetMatrix();
        sk.texture(textGraphics);
        sk.noStroke();
        sk.plane(sk.width, sk.height);
        sk.pop();
    };

    sk.keyPressed = () => {
        if (sk.key === 'f') {
            sk.fullscreen(!sk.fullscreen());
        }
        if (sk.key === 'd') {
            debug = !debug;
        }
        if (sk.keyCode == 13) {
            console.log("Enter pressed: Resetting audio settings.");
            for (let i = 0; i < Audio.loopPaths.length; i++) {
                Audio.setLoopVolume(i, 0.0);
            }
            Audio.setEffectValue("reverb", 0.0);
            Audio.setEffectValue("delay", 0.0);
            Audio.setEffectValue("filter", 0.5);
            ui = new UI(sk);
        }
    }
};
new p5(sketch);

function recoginzeGestures() {
    if (!vidSrc) return;
    const t0 = performance.now();
    const bitmap = createImageBitmap(vidSrc.elt);
    bitmap.then((bmp) => {
        worker.postMessage(
            {
                type: "frame",
                data: {
                    bitmap: bmp,
                    t0
                }
            },
            [bmp]
        );
    });
}
