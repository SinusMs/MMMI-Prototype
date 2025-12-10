import { GestureRecognizerResult } from '@mediapipe/tasks-vision';

export type Vector2 = {
    x: number,
    y: number
}

const MAX_BUFFER_SIZE = 3;
export class ResultsHandler {
    private buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] = [];

    public getLatestResult(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null } | null { 
        if (this.buffer.length == 0) return null; 
        return this.buffer[this.buffer.length - 1]; 
    }

    public getGesture(): string {
        return this.getLatestResult()?.result?.gestures[0]?.at(0)?.categoryName || '';
    }

    public addResult(result: GestureRecognizerResult, timestamp: number): void {
        let handposition = this.calcHandPosition(result);
        this.buffer.push({ result, timestamp, handposition }); 
        if (this.buffer.length > MAX_BUFFER_SIZE) {
            this.buffer.shift();
        }
    }

    private calcHandPosition(result: GestureRecognizerResult): Vector2 | null {
        const pts = result.landmarks[0];
        if (!pts) return null;
        let x = 0, y = 0;
        for (let i = 0; i < pts.length; i++) {
            x += pts[i].x;
            y += pts[i].y;
        }
        const n = pts.length;
        return { x: x / n, y: y / n };
    }
}
