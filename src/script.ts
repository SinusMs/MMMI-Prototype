import p5 from 'p5';
import { ResultsHandler } from './resultshandler';

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
    sk.setup = () => {
        sk.createCanvas(640, 480, canvasEl); 
        sk.frameRate(60);
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = recoginzeGestures;
    };
    
    sk.draw = () => {
        let t0 = performance.now();
        sk.background(200);
        sk.fill(255, 0, 0);
        sk.text(results.getGesture(), 10, 30);
        let handposition = results.getExtrapolatedHandPosition();
        if (handposition) {
            sk.ellipse(sk.width * (1 - handposition.x), sk.height * handposition.y, 10, 10);
        }
        sk.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 50);
        sk.text("video processing time: " + vidProcessingTime.toFixed(1).padStart(4, '0') + " ms", 10, 60);
        sk.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 70);
    };
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
