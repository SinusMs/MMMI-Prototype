import { GestureRecognizer, FilesetResolver, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import p5 from 'p5';
import { ResultsHandler } from './resultshandler';

// Create task for image file processing:
const vision = await FilesetResolver.forVisionTasks(
    "mediapipe/wasm"
);
const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath: "mediapipe/gesture_recognizer.task",
        delegate: "GPU"
    },
    numHands: 2,
    runningMode: 'VIDEO',
});

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let results: ResultsHandler = new ResultsHandler();
let recTime: number = -1;
let addTime: number = -1;


const sketch = (sk: p5) => {
    sk.setup = () => {
        sk.createCanvas(640, 480, canvasEl); 
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = recoginzeGestures;
    };
    
    sk.draw = () => {
        sk.background(200);
        sk.fill(255, 0, 0);
        let result = results.getLatestResult();
        if (result) {
            let handPosition = result.handposition;
            if (handPosition)
                sk.ellipse(sk.width * (1 - handPosition.x), sk.height * handPosition.y, 50, 50);
            sk.text(results.getGesture(), 10, 30);
            sk.text("recognize Time: " + recTime.toFixed(1), 10, 50);
            sk.text("add Time: " + addTime, 10, 60);
        }
    };
};
new p5(sketch);

function recoginzeGestures() {
    if (!vidSrc) return;
    let timestamp = performance.now();
    let t0 = performance.now()
    let res = gestureRecognizer.recognizeForVideo(vidSrc.elt, timestamp);
    recTime = performance.now() - t0;
    let t1 = performance.now();
    results.addResult(res, timestamp);
    addTime = performance.now() - t1;
    vidSrc.elt.requestVideoFrameCallback(recoginzeGestures);
}
