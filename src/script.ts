import p5 from 'p5';
import { ResultsHandler } from './resultshandler';
import * as Audio from './audioManager'
import { UI } from './ui';

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let results: ResultsHandler = new ResultsHandler();
let vidProcessingTime: number = -1;
let recognizeTime: number = -1;

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
    
    sk.mousePressed = async () => {
        await Audio.initAudio();
        Audio.startLoop();
        ui?.evaluate("", { x: 0, y: 0 });
    }
    
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
    };
    
    sk.draw = () => {
        let t0 = performance.now();
        sk.clear();

        // Transform origin to top-left corner (like p5's 2D mode)
        sk.translate(-sk.width / 2, -sk.height / 2);
        
        sk.fill(47, 79, 79);
        let handposition = results.getExtrapolatedHandPosition();
        if (handposition) vidSrc?.hide();
        else vidSrc?.show();

        ui.evaluate(results.getGesture(), handposition);
        ui.draw();

        textGraphics.clear();
        textGraphics.fill(47, 79, 79);
        textGraphics.text(results.getGesture(), 10, 30);
        textGraphics.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 50);
        textGraphics.text("total video processing time: " + vidProcessingTime.toFixed(1).padStart(4, '0') + " ms", 10, 70);
        textGraphics.text("recognize time: " + recognizeTime.toFixed(1).padStart(4, '0') + " ms", 10, 90);
        textGraphics.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 110);
        textGraphics.text("hand position: " + (handposition ? `(${handposition.x.toFixed(0)}, ${handposition.y.toFixed(0)})` : "N/A"), 10, 130);
        
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
