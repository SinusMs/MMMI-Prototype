import p5 from 'p5';
import { ResultsHandler } from './resultshandler';

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let results: ResultsHandler = new ResultsHandler();
let recTime: number = -1;
let bmpTime: number = -1;

const worker = new Worker(new URL('./gesture-worker.js', import.meta.url));
worker.onmessage = (e) => {
    const { type, data } = e.data;
    switch (type) {
        case "init-done":
            break;
        case "result":
            results.addResult(data.result, performance.now());
            recTime = data.dtime;
            break;
        default:
            console.warn("Unknown message type from worker: ", type), e.data;
    }
};
worker.postMessage({ type: "init" });

const sketch = (sk: p5) => {
    sk.setup = () => {
        sk.createCanvas(640, 480, canvasEl); 
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = recoginzeGestures;
    };
    
    sk.draw = () => {
        let t0 = performance.now();
        sk.background(200);
        sk.fill(255, 0, 0);
        let result = results.getLatestResult();
        if (result) {
            let handPosition = result.handposition;
            if (handPosition)
                sk.ellipse(sk.width * (1 - handPosition.x), sk.height * handPosition.y, 50, 50);
            sk.text(results.getGesture(), 10, 30);
        }
        sk.text("framerate: " + sk.frameRate().toFixed(1) + " fps", 10, 50);
        sk.text("recognize time: " + recTime.toFixed(1).padStart(4, '0') + " ms", 10, 60);
        sk.text("draw time: " + (performance.now() - t0).toFixed(1).padStart(4, '0')+ " ms", 10, 70);
        sk.text("bitmap time: " + bmpTime.toFixed(1).padStart(4, '0')+ " ms", 10, 80);
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
                }
            },
            [bmp]
        );
        bmpTime = performance.now() - t0;
        vidSrc!.elt.requestVideoFrameCallback(recoginzeGestures);
    });
}
