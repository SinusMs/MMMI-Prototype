import { GestureRecognizerResult } from '@mediapipe/tasks-vision';

export type Vector2 = {
    x: number,
    y: number
}

const MAX_BUFFER_SIZE = 3;
export class ResultsHandler {
    private buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] = [];

    public getBuffer(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] {
        return this.buffer;
    }

    public getExtrapolatedHandPosition(): Vector2 | null {
        if (this.buffer.length === 0) return null;
        
        const latest = this.buffer[this.buffer.length - 1];
        if (!latest.handposition) return null;
        
        // If we only have one sample, return it as-is
        if (this.buffer.length === 1) {
            return latest.handposition;
        }
        
        // If we have two samples, use linear extrapolation
        if (this.buffer.length === 2) {
            const previous = this.buffer[0];
            if (!previous.handposition) return latest.handposition;
            
            const dt = latest.timestamp - previous.timestamp;
            if (dt <= 0) return latest.handposition;
            
            const vx = (latest.handposition.x - previous.handposition.x) / dt;
            const vy = (latest.handposition.y - previous.handposition.y) / dt;
            
            const extrapolationTime = performance.now() - latest.timestamp;
            
            return {
                x: latest.handposition.x + vx * extrapolationTime,
                y: latest.handposition.y + vy * extrapolationTime
            };
        }
        
        // Quadratic extrapolation with 3 samples (captures acceleration)
        const p2 = latest.handposition;
        const t2 = latest.timestamp;
        
        const p1 = this.buffer[this.buffer.length - 2].handposition;
        const t1 = this.buffer[this.buffer.length - 2].timestamp;
        
        const p0 = this.buffer[this.buffer.length - 3].handposition;
        const t0 = this.buffer[this.buffer.length - 3].timestamp;
        
        if (!p0 || !p1) return p2;
        
        const dt1 = t1 - t0;
        const dt2 = t2 - t1;
        
        if (dt1 <= 0 || dt2 <= 0) return p2;
        
        // Calculate velocities between samples
        const v1x = (p1.x - p0.x) / dt1;
        const v1y = (p1.y - p0.y) / dt1;
        
        const v2x = (p2.x - p1.x) / dt2;
        const v2y = (p2.y - p1.y) / dt2;
        
        // Calculate acceleration (change in velocity)
        const ax = (v2x - v1x) / ((dt1 + dt2) / 2);
        const ay = (v2y - v1y) / ((dt1 + dt2) / 2);
        
        // Extrapolate to current time using position, velocity, and acceleration
        const extrapolationTime = performance.now() - t2;
        
        return {
            x: p2.x + v2x * extrapolationTime + 0.5 * ax * extrapolationTime * extrapolationTime,
            y: p2.y + v2y * extrapolationTime + 0.5 * ay * extrapolationTime * extrapolationTime
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
