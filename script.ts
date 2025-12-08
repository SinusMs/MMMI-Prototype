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
let videoReady = false;


const sketch = (sk: p5) => {
    sk.setup = () => {
        sk.createCanvas(640, 480, canvasEl); 
        vidSrc = sk.createCapture(sk.VIDEO) as p5.MediaElement<HTMLVideoElement>;
        vidSrc!.elt.onloadeddata = () => {
            console.log("Webcam ready:", vidSrc!.elt.videoWidth, vidSrc!.elt.videoHeight);
            videoReady = true;
        };
    };
    
    sk.draw = () => {
        sk.background(200);
        sk.fill(255, 0, 0);
        if (videoReady) {
            let result = predictWebcam();
            if (result != null && result.gestures.length > 0) {
                let indexFingerTip = result.landmarks[0][8];
                sk.ellipse(sk.width * (1 - indexFingerTip.x), sk.height * indexFingerTip.y, 50, 50);
                let gesture = (result as GestureRecognizerResult).gestures[0][0].categoryName;
                sk.text(gesture, 10, 30);
                console.log(result);
            }
        }
    };
};
new p5(sketch);


let lastVideoTime = -1;
function predictWebcam(): GestureRecognizerResult | null {
    if (!vidSrc) return null;
    const webcamElement = vidSrc?.elt as HTMLVideoElement;
    // Now let's start detecting the stream.
    if (vidSrc.elt.currentTime !== lastVideoTime) {
        lastVideoTime = vidSrc.elt.currentTime;
        return gestureRecognizer.recognizeForVideo(webcamElement, performance.now());
    }
    return null;
}
