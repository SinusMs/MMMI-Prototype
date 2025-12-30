import { GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { Vector2, TwoHandsData, HandData } from './utils.ts';

const MAX_BUFFER_SIZE = 3;

// Cap acceleration to prevent overshoot (normalized coordinates per ms²)
// More aggressive: 0.00001 (allows more prediction)
// Very conservative: 0.000002 (minimal overshoot risk)
const MAX_ACCELERATION = 0.000003; 
const SKETCH_SIZE: Vector2 = { x: 1920 - 16, y: 1080 - 16 };

export class ResultsHandler {
    private leftBuffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] = [];
    private rightBuffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] = [];

    private handToScreenSpace(normalizedPos: { x: number, y: number }): Vector2 {
        return {
            x: SKETCH_SIZE.x * (1 - normalizedPos.x),
            y: normalizedPos.y * SKETCH_SIZE.y
        };
    }

    public getBuffer(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] {
        // Return combined buffer for backward compatibility if needed
        return [...this.leftBuffer, ...this.rightBuffer];
    }

    public getLeftBuffer(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] {
        return this.leftBuffer;
    }

    public getRightBuffer(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[] {
        return this.rightBuffer;
    }

    private getExtrapolatedHandPositionFromBuffer(buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[]): Vector2 | null {
        if (buffer.length === 0) return null;
        
        const latest = buffer[buffer.length - 1];
        if (!latest.handposition) return null;
        
        // If we only have one sample, return it as-is
        if (buffer.length === 1) {
            return this.handToScreenSpace(latest.handposition);
        }
        
        // If we have two samples, use linear extrapolation
        if (buffer.length === 2) {
            const previous = buffer[0];
            if (!previous.handposition) return this.handToScreenSpace(latest.handposition);
            
            const dt = latest.timestamp - previous.timestamp;
            if (dt <= 0) return this.handToScreenSpace(latest.handposition);
            
            const vx = (latest.handposition.x - previous.handposition.x) / dt;
            const vy = (latest.handposition.y - previous.handposition.y) / dt;
            
            const extrapolationTime = performance.now() - latest.timestamp;
            
            return this.handToScreenSpace({
                x: latest.handposition.x + vx * extrapolationTime,
                y: latest.handposition.y + vy * extrapolationTime
            });
        }
        
        // Quadratic extrapolation with 3 samples (captures acceleration)
        const p2 = latest.handposition;
        const t2 = latest.timestamp;
        
        const p1 = buffer[buffer.length - 2].handposition;
        const t1 = buffer[buffer.length - 2].timestamp;
        
        const p0 = buffer[buffer.length - 3].handposition;
        const t0 = buffer[buffer.length - 3].timestamp;
        
        if (!p0 || !p1) return this.handToScreenSpace(p2);
        
        const dt1 = t1 - t0;
        const dt2 = t2 - t1;
        
        if (dt1 <= 0 || dt2 <= 0) return this.handToScreenSpace(p2);
        
        // Calculate velocities between samples
        const v1x = (p1.x - p0.x) / dt1;
        const v1y = (p1.y - p0.y) / dt1;
        
        const v2x = (p2.x - p1.x) / dt2;
        const v2y = (p2.y - p1.y) / dt2;
        
        // Calculate acceleration (change in velocity)
        let ax = (v2x - v1x) / ((dt1 + dt2) / 2);
        let ay = (v2y - v1y) / ((dt1 + dt2) / 2);
        
        // Cap acceleration to prevent overshoot
        const accelMag = Math.sqrt(ax * ax + ay * ay);
        if (accelMag > MAX_ACCELERATION) {
            const scale = MAX_ACCELERATION / accelMag;
            ax *= scale;
            ay *= scale;
        }
        
        // Extrapolate to current time using position, velocity, and acceleration
        const extrapolationTime = performance.now() - t2;
        
        let normalizedPos: Vector2 = {
            x: p2.x + v2x * extrapolationTime + 0.5 * ax * extrapolationTime * extrapolationTime,
            y: p2.y + v2y * extrapolationTime + 0.5 * ay * extrapolationTime * extrapolationTime
        };

        return this.handToScreenSpace(normalizedPos);
    }

    public getExtrapolatedHandPosition(): Vector2 | null {
        // For backward compatibility, return right hand (or left if right not available)
        const rightPos = this.getExtrapolatedHandPositionFromBuffer(this.rightBuffer);
        if (rightPos) return rightPos;
        return this.getExtrapolatedHandPositionFromBuffer(this.leftBuffer);
    }

    public getTwoHandsData(): TwoHandsData {
        return {
            left: {
                position: this.getExtrapolatedHandPositionFromBuffer(this.leftBuffer),
                gesture: this.getGestureFromBuffer(this.leftBuffer)
            },
            right: {
                position: this.getExtrapolatedHandPositionFromBuffer(this.rightBuffer),
                gesture: this.getGestureFromBuffer(this.rightBuffer)
            }
        };
    }

    private getLatestResultFromBuffer(buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[]): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null } | null {
        if (buffer.length == 0) return null;
        return buffer[buffer.length - 1];
    }

    public getLatestResult(): { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null } | null { 
        // For backward compatibility, return right hand result or left if right not available
        const rightResult = this.getLatestResultFromBuffer(this.rightBuffer);
        if (rightResult) return rightResult;
        return this.getLatestResultFromBuffer(this.leftBuffer);
    }

    private getGestureFromBuffer(buffer: { result: GestureRecognizerResult, timestamp: number, handposition: Vector2 | null }[]): string {
        const latestResult = this.getLatestResultFromBuffer(buffer);
        return latestResult?.result?.gestures[0]?.at(0)?.categoryName || '';
    }

    public getGesture(): string {
        // For backward compatibility, return right hand gesture or left if right not available
        const rightGesture = this.getGestureFromBuffer(this.rightBuffer);
        if (rightGesture) return rightGesture;
        return this.getGestureFromBuffer(this.leftBuffer);
    }

    public addResult(result: GestureRecognizerResult, timestamp: number): void {
        // MediaPipe can detect multiple hands. Separate them into left and right buffers
        // result.handedness gives us information about which hand (Left/Right)
        
        // Clear buffers first - we'll repopulate based on current frame
        const tempLeftBuffer = [...this.leftBuffer];
        const tempRightBuffer = [...this.rightBuffer];
        
        // Check if we have any hands in this frame
        if (!result.landmarks || result.landmarks.length === 0) {
            this.leftBuffer = [];
            this.rightBuffer = [];
            return;
        }

        // Process each detected hand
        let leftHandProcessed = false;
        let rightHandProcessed = false;
        
        for (let i = 0; i < result.landmarks.length; i++) {
            const handedness = result.handednesses?.[i]?.[0]?.categoryName;
            const handposition = this.calcHandPositionFromLandmarks(result.landmarks[i]);
            
            if (!handposition) continue;
            
            // Create a result object for this specific hand
            const handResult: GestureRecognizerResult = {
                landmarks: [result.landmarks[i]],
                worldLandmarks: result.worldLandmarks ? [result.worldLandmarks[i]] : [],
                handedness: result.handedness ? [result.handedness[i]] : [],
                handednesses: result.handednesses ? [result.handednesses[i]] : [],
                gestures: result.gestures ? [result.gestures[i]] : []
            };
            
            const bufferEntry = { result: handResult, timestamp, handposition };
            
            // MediaPipe's handedness is from the perspective of the person in the image
            // "Left" means the person's left hand, which appears on the right in a mirrored camera
            if (handedness === 'Left') {
                if (!leftHandProcessed) {
                    tempLeftBuffer.push(bufferEntry);
                    if (tempLeftBuffer.length > MAX_BUFFER_SIZE) {
                        tempLeftBuffer.shift();
                    }
                    leftHandProcessed = true;
                }
            } else if (handedness === 'Right') {
                if (!rightHandProcessed) {
                    tempRightBuffer.push(bufferEntry);
                    if (tempRightBuffer.length > MAX_BUFFER_SIZE) {
                        tempRightBuffer.shift();
                    }
                    rightHandProcessed = true;
                }
            }
        }
        
        // If a hand wasn't detected in this frame, clear its buffer
        this.leftBuffer = leftHandProcessed ? tempLeftBuffer : [];
        this.rightBuffer = rightHandProcessed ? tempRightBuffer : [];
    }

    private calcHandPositionFromLandmarks(landmarks: any[]): Vector2 | null {
        const pts = [
            landmarks?.at(0),
            landmarks?.at(1),
            landmarks?.at(5),
            landmarks?.at(9),
            landmarks?.at(17),
            landmarks?.at(13)
        ];
        let x = 0, y = 0;
        for (let i = 0; i < pts.length; i++) {
            if (!pts[i]) return null;
            x += pts[i]!.x;
            y += pts[i]!.y;
        }
        const n = pts.length;
        return { x: x / n, y: y / n };
    }
}
