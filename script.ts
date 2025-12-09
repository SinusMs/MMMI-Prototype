import { GestureRecognizer, FilesetResolver, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import p5 from 'p5';


// Create task for image file processing:
const vision = await FilesetResolver.forVisionTasks(
    "mediapipe/wasm"
);
const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath: "mediapipe/gesture_recognizer.task"
    },
    numHands: 2,
    runningMode: 'VIDEO',
});

let vidSrc: p5.MediaElement<HTMLVideoElement> | null = null;
let canvasEl: HTMLCanvasElement = document.getElementById("p5sketch") as HTMLCanvasElement;
let result: GestureRecognizerResult | null = null;


const sketch = (sk: p5) => {
    sk.setup = () => {
        sk.createCanvas(640, 480, canvasEl); 
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc.elt.onloadeddata = predictWebcam;
    };
    
    sk.draw = () => {
        sk.background(200);
        sk.fill(255, 0, 0);
        if (result != null && result.gestures.length > 0) {
            let indexFingerTip = result.landmarks[0][8];
            sk.ellipse(sk.width * (1 - indexFingerTip.x), sk.height * indexFingerTip.y, 50, 50);
            let gesture = (result as GestureRecognizerResult).gestures[0][0].categoryName;
            sk.text(gesture, 10, 30);   
        }
    };
};
new p5(sketch);

function predictWebcam(): void {
    if (!vidSrc) return;
    result = gestureRecognizer.recognizeForVideo(vidSrc.elt, performance.now());
    vidSrc.elt.requestVideoFrameCallback(predictWebcam);
}
