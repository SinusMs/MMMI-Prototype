import p5 from 'p5';
import { ResultsHandler } from './resultshandler';
import { Interactable, DraggableEllipse, Slider, Button, Wheel } from './interactable';
import * as Audio from './audioManager'
import { handToScreenSpace } from './utils';

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
    let interactables: Interactable[] = [];
    let textGraphics: p5.Graphics;

    sk.mousePressed = async () => {
        await Audio.initAudio();
        Audio.startLoop();
        Audio.setLoopVolume(0, 0.1);
        Audio.setLoopVolume(1, 0.1);
        Audio.setLoopVolume(2, 0.1);
        Audio.setLoopVolume(3, 0.1);
    }

    sk.setup = () => {
        sk.createCanvas(1920 - 16, 1080 - 16, sk.WEBGL, canvasEl); 
        sk.setAttributes({ antialias: true });
        
        textGraphics = sk.createGraphics(1920 - 16, 1080 - 16);
        textGraphics.textSize(16);
        textGraphics.fill(47, 79, 79);
        
        sk.frameRate(60);
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = recoginzeGestures;

        interactables.push(new DraggableEllipse(sk, { x: 0.1, y: 0.3 }, 100));
        interactables.push(new Slider(sk, { x: sk.width - 500, y: sk.height - 100 }, { x: sk.width - 500, y: sk.height - (sk.height - 100) }, 0.5));
        interactables.push(new Button(sk, { x: 200, y: 200 }, 80));
        interactables.push(new Wheel(sk, { x: 1000, y: 500 },200,260, 0.25));
    };
    
    sk.draw = () => {
        let t0 = performance.now();
        sk.clear();

        // Transform origin to top-left corner (like p5's 2D mode)
        sk.translate(-sk.width / 2, -sk.height / 2);
        
        sk.fill(47, 79, 79);
        let handposition = results.getExtrapolatedHandPosition();
        if (handposition) {
            const handScreenPos = handToScreenSpace(handposition, sk);
            sk.ellipse(handScreenPos.x, handScreenPos.y, 10, 10);
            vidSrc?.hide();
            sk.line(handScreenPos.x, 0, handScreenPos.x, sk.height);
            sk.line(0, handScreenPos.y, sk.width, handScreenPos.y);   
        }
        else vidSrc?.show();

        for (let interactable of interactables) { 
            if (handposition) interactable.evaluate(results.getGesture(), handposition!);
            interactable.draw();
            sk.fill(47, 79, 79);
        }

        textGraphics.clear();
        textGraphics.fill(47, 79, 79);
        textGraphics.text(results.getGesture(), 10, 30);
        textGraphics.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 50);
        textGraphics.text("total video processing time: " + vidProcessingTime.toFixed(1).padStart(4, '0') + " ms", 10, 70);
        textGraphics.text("recognize time: " + recognizeTime.toFixed(1).padStart(4, '0') + " ms", 10, 90);
        textGraphics.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 110);
        textGraphics.text("hand position: " + (handposition ? `(${handToScreenSpace(handposition, sk).x.toFixed(0)}, ${handToScreenSpace(handposition, sk).y.toFixed(0)})` : "N/A"), 10, 130);
        
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
