import p5 from 'p5';
import { ResultsHandler } from './resultshandler';
import { Interactable, DraggableEllipse, Slider, Button, Wheel } from './interactable';
import * as Audio from './audioManager'

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let results: ResultsHandler = new ResultsHandler();
let vidProcessingTime: number = -1;

const worker = new Worker(new URL('./gesture-worker.js', import.meta.url));
worker.onmessage = (e) => {
    const { type, data } = e.data;
    switch (type) {
        case "init-done":
            break;
        case "result":
            results.addResult(data.result, performance.now());
            vidProcessingTime = performance.now() - data.t0;
            break;
        default:
            console.warn("Unknown message type from worker: ", type), e.data;
    }
};
worker.postMessage({ type: "init" });

const sketch = (sk: p5) => {
    let interactables: Interactable[] = [];

    sk.mousePressed = async () => {
        await Audio.initAudio();
        Audio.startLoop();
        Audio.setLoopVolume(0, 0.1);
        Audio.setLoopVolume(1, 0.1);
        Audio.setLoopVolume(2, 0.1);
        Audio.setLoopVolume(3, 0.1);
    }

    sk.setup = () => {
        sk.createCanvas(1920 - 16, 1080 - 16, canvasEl); 
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
        sk.fill(47, 79, 79);
        let handposition = results.getExtrapolatedHandPosition();
        if (handposition) {
            sk.ellipse(sk.width * (1 - handposition.x), sk.height * handposition.y, 10, 10);
            vidSrc?.hide();
            sk.line(sk.width * (1 - handposition.x), 0, sk.width * (1 - handposition.x), sk.height);
            sk.line(0, handposition.y * sk.height, sk.width, handposition.y * sk.height);   
        }
        else vidSrc?.show();

        for (let interactable of interactables) { 
            if (handposition) interactable.evaluate(results.getGesture(), handposition!);
            interactable.draw();
            sk.fill(47, 79, 79);
        }

        sk.text(results.getGesture(), 10, 30);
        sk.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 50);
        sk.text("video processing time: " + vidProcessingTime.toFixed(1).padStart(4, '0') + " ms", 10, 60);
        sk.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 70);
        sk.text("hand position: " + (handposition ? `(${(handposition.x * sk.width).toFixed(0)}, ${(handposition.y * sk.height).toFixed(0)})` : "N/A"), 10, 80);
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
        vidSrc!.elt.requestVideoFrameCallback(recoginzeGestures);
    });
}
