importScripts('/MMMI-Prototype/mediapipe/vision_bundle.js');

let recognizer = null;

self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === "init") {
        console.log("gesture-worker: loading mediapipe modules (UMD)...");
        const { GestureRecognizer, FilesetResolver } = self.TasksVision;

        console.log("gesture-worker: resolving vision fileset...");
        const vision = await FilesetResolver.forVisionTasks("/MMMI-Prototype/mediapipe/wasm");
        recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "/MMMI-Prototype/mediapipe/gesture_recognizer.task",
                delegate: "GPU"
            },
            numHands: 2,
            runningMode: 'VIDEO',
        });
        self.postMessage({ type: "init-done" });
    }

    if (type === "frame" && recognizer) {
        const t0 = performance.now();
        const { bitmap } = data;
        if (!bitmap) {
            self.postMessage({ type: "error", data: { error: "Missing bitmap in frame message" } });
            return;
        }
        const result = recognizer.recognizeForVideo(bitmap, performance.now());

        // Release the bitmap to avoid memory leaks
        bitmap.close();

        self.postMessage({
            type: "result",
            data: {
                result,
                dtime: performance.now() - t0
            }
        });
    }
};

console.log("gesture worker loaded.")