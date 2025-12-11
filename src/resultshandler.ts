import { GestureRecognizerResult } from '@mediapipe/tasks-vision';

export type Vector2 = {
    x: number,
    y: number
}

const MAX_BUFFER_SIZE = 4;
const EMA_ALPHA = 0.3; // Smoothing factor: 0 = no smoothing, 1 = no history

export class ResultsHandler {
    private buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] = [];
    private emaPosition: Vector2 | null = null;
    private emaVelocity: Vector2 = { x: 0, y: 0 };

    public getBuffer(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] {
        return this.buffer;
    }

    public getExtrapolatedHandPosition(): Vector2 | null {
        if (this.buffer.length === 0 || !this.emaPosition) {
            return null;
        }

        const latest = this.buffer[this.buffer.length - 1];
        const extrapolationTime = performance.now() - latest.timestamp;
        
        // Extrapolate using smoothed position and velocity
        return {
            x: this.emaPosition.x + this.emaVelocity.x * extrapolationTime,
            y: this.emaPosition.y + this.emaVelocity.y * extrapolationTime
        };
    }

    public getLatestResult(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null } | null { 
        if (this.buffer.length == 0) return null; 
        return this.buffer[this.buffer.length - 1]; 
    }

    public getGesture(): string {
        return this.getLatestResult()?.result?.gestures[0]?.at(0)?.categoryName || '';
    }

    public addResult(result: GestureRecognizerResult, timestamp: number): void {
        let handposition = this.calcHandPosition(result);
        if (!handposition) {
            this.buffer = [];
            return;
        }
        
        // Update EMA position and velocity
        if (handposition) {
            if (this.emaPosition === null) {
                // Initialize EMA with first position
                this.emaPosition = { ...handposition };
                this.emaVelocity = { x: 0, y: 0 };
            } else {
                // Calculate instantaneous velocity from last buffer entry
                const lastEntry = this.buffer[this.buffer.length - 1];
                if (lastEntry && lastEntry.handposition) {
                    const dt = timestamp - lastEntry.timestamp;
                    if (dt > 0) {
                        const instantVx = (handposition.x - lastEntry.handposition.x) / dt;
                        const instantVy = (handposition.y - lastEntry.handposition.y) / dt;
                        
                        // Update EMA velocity
                        this.emaVelocity.x = EMA_ALPHA * instantVx + (1 - EMA_ALPHA) * this.emaVelocity.x;
                        this.emaVelocity.y = EMA_ALPHA * instantVy + (1 - EMA_ALPHA) * this.emaVelocity.y;
                    }
                }
                
                // Update EMA position
                this.emaPosition.x = EMA_ALPHA * handposition.x + (1 - EMA_ALPHA) * this.emaPosition.x;
                this.emaPosition.y = EMA_ALPHA * handposition.y + (1 - EMA_ALPHA) * this.emaPosition.y;
            }
        }
        
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
