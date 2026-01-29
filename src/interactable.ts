import p5 from "p5";
import { Vector2, lerp, lerpScalar, dist, TwoHandsData } from "./utils.ts";
import * as Color from './colors';

export abstract class Interactable {
    sk: p5;
    hovering: boolean = false;
    grabbed: boolean = false;
    drag: number = 0.1;
    // Track which hand is interacting (null if none, 'left' or 'right')
    activeHand: 'left' | 'right' | null = null;

    constructor(sk: p5) {
        this.sk = sk;
    }

    abstract evaluate(twoHandsData: TwoHandsData): void;
    abstract draw(): void;
}

export class DraggableEllipse extends Interactable {
    radius: number;
    position: Vector2;

    constructor(sk: p5, position: Vector2, radius: number) {
        super(sk);
        this.position = position;
        this.radius = radius;
    }

    evaluate(twoHandsData: TwoHandsData): void {
        // Check both hands for interaction
        const checkHand = (handData: { position: Vector2 | null, gesture: string }, handId: 'left' | 'right') => {
            if (!handData.position) return false;
            
            const overlapping = dist(this.position, handData.position) <= this.radius;
            
            if (handData.gesture == "Closed_Fist" && overlapping) {
                if (!this.grabbed) {
                    this.grabbed = true;
                    this.activeHand = handId;
                }
                return this.activeHand === handId;
            }
            return false;
        };

        const leftInteracting = checkHand(twoHandsData.left, 'left');
        const rightInteracting = checkHand(twoHandsData.right, 'right');
        
        // If neither hand has a fist gesture, release grab
        if (twoHandsData.left.gesture !== "Closed_Fist" && twoHandsData.right.gesture !== "Closed_Fist") {
            this.grabbed = false;
            this.activeHand = null;
        }
        
        // Check hovering for both hands
        this.hovering = false;
        if (twoHandsData.left.position && dist(this.position, twoHandsData.left.position) <= this.radius) {
            this.hovering = true;
        }
        if (twoHandsData.right.position && dist(this.position, twoHandsData.right.position) <= this.radius) {
            this.hovering = true;
        }
        
        // Update position based on active hand
        if (this.grabbed && this.activeHand) {
            const activeHandData = this.activeHand === 'left' ? twoHandsData.left : twoHandsData.right;
            if (activeHandData.position) {
                this.position = lerp(this.position, activeHandData.position, this.drag);
            }
        }
    }

    draw(): void {
        this.sk.ellipse(this.position.x, this.position.y, this.radius * 2, this.radius * 2);
    }
}


export class Slider extends Interactable {
    p1: Vector2;
    p2: Vector2;
    p1p2: Vector2;
    fill: number;
    sliderThickness: number = 40;
    knobRadius: number;
    defaultKnobRadius: number;
    activeKnobRadius: number;
    knobPos = () => lerp(this.p1, this.p2, this.fill);
    callback: ((value: number) => void) | null = null;

    constructor(sk: p5, p1: Vector2, p2: Vector2, fill: number = 0.5, callback: ((value: number) => void) | null = null, sliderThickness: number = 40) {
        super(sk);
        this.p1 = p1;
        this.p2 = p2;
        this.p1p2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        this.fill = fill;
        this.callback = callback;
        this.callback?.(fill);
        this.sliderThickness = sliderThickness;
        this.defaultKnobRadius = sliderThickness / 2 + 3;
        this.knobRadius = this.defaultKnobRadius;
        this.activeKnobRadius = this.defaultKnobRadius + 7;
    }

    evaluate(twoHandsData: TwoHandsData): void {
        const knobPos = this.knobPos();
        
        // Check both hands for interaction
        const checkHand = (handData: { position: Vector2 | null, gesture: string }, handId: 'left' | 'right') => {
            if (!handData.position) return false;
            
            const overlapping = dist(knobPos, handData.position) <= this.activeKnobRadius;
            
            if (handData.gesture == "Closed_Fist" && overlapping) {
                if (!this.grabbed) {
                    this.grabbed = true;
                    this.activeHand = handId;
                }
                return this.activeHand === handId;
            }
            return false;
        };

        const leftInteracting = checkHand(twoHandsData.left, 'left');
        const rightInteracting = checkHand(twoHandsData.right, 'right');
        
        // If neither hand has a fist gesture, release grab
        if (twoHandsData.left.gesture !== "Closed_Fist" && twoHandsData.right.gesture !== "Closed_Fist") {
            this.grabbed = false;
            this.activeHand = null;
        }
        
        // Check hovering for both hands
        this.hovering = false;
        if (twoHandsData.left.position && dist(knobPos, twoHandsData.left.position) <= this.activeKnobRadius) {
            this.hovering = true;
        }
        if (twoHandsData.right.position && dist(knobPos, twoHandsData.right.position) <= this.activeKnobRadius) {
            this.hovering = true;
        }
        
        this.knobRadius = this.hovering || this.grabbed ? this.activeKnobRadius : this.defaultKnobRadius;
        
        if (this.grabbed && this.activeHand) {
            const activeHandData = this.activeHand === 'left' ? twoHandsData.left : twoHandsData.right;
            if (activeHandData.position) {
                // Project hand position onto the line segment p1p2
                const lenSquared = this.p1p2.x * this.p1p2.x + this.p1p2.y * this.p1p2.y;
                
                if (lenSquared > 0) {
                    // Vector from p1 to hand position
                    const tx = activeHandData.position.x - this.p1.x;
                    const ty = activeHandData.position.y - this.p1.y;
                    
                    // Project onto line
                    let t = (tx * this.p1p2.x + ty * this.p1p2.y) / lenSquared;
                    
                    // Update fill with interpolation for smoothness and clamp to [0, 1]
                    this.fill = Math.max(0, Math.min(1, lerpScalar(this.fill, t, this.drag)));
                }
            }
        }
        this.callback?.(this.fill);
    }

    draw(): void {
        this.sk.push();
        this.sk.strokeWeight(this.sliderThickness);
        this.sk.stroke(Color.blue400)
        this.sk.line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        this.sk.strokeWeight(0);
        this.sk.fill(this.grabbed ? Color.accent3 : Color.blue500)
        this.sk.ellipse(this.knobPos().x, this.knobPos().y, this.knobRadius * 2, this.knobRadius * 2, 64);
        this.sk.pop();
    }
}


export class Button extends Interactable {
    position: Vector2;
    radius: number;
    defaultRadius: number;
    hoverRadius: number;
    outline: number = 6;
    private wasGrabbed: boolean = false;
    callback: (() => void) | null = null;

    constructor(sk: p5, position: Vector2, radius: number, callback: (() => void) | null = null) {
        super(sk);
        this.position = position;
        this.radius = radius;
        this.defaultRadius = radius;
        this.hoverRadius = radius + 10;
        this.callback = callback;
    }

    evaluate(twoHandsData: TwoHandsData): void {
        // Check both hands for interaction
        const checkHand = (handData: { position: Vector2 | null, gesture: string }, handId: 'left' | 'right') => {
            if (!handData.position) return { overlapping: false, shouldTrigger: false };
            
            const overlapping = dist(this.position, handData.position) <= this.hoverRadius;
            
            if (handData.gesture == "Closed_Fist" && overlapping) {
                const shouldTrigger = !this.wasGrabbed;
                if (!this.grabbed) {
                    this.grabbed = true;
                    this.activeHand = handId;
                    this.wasGrabbed = true;
                }
                return { overlapping: true, shouldTrigger: shouldTrigger && this.activeHand === handId };
            }
            return { overlapping, shouldTrigger: false };
        };

        const leftResult = checkHand(twoHandsData.left, 'left');
        const rightResult = checkHand(twoHandsData.right, 'right');
        
        // Trigger callback if either hand triggered
        if (leftResult.shouldTrigger || rightResult.shouldTrigger) {
            this.callback?.();
        }
        
        // If neither hand has a fist gesture, release grab
        if (twoHandsData.left.gesture !== "Closed_Fist" && twoHandsData.right.gesture !== "Closed_Fist") {
            this.grabbed = false;
            this.wasGrabbed = false;
            this.activeHand = null;
        }
        
        // Check hovering and grabbed state for both hands
        this.hovering = leftResult.overlapping || rightResult.overlapping;
        
        // Update grabbed based on active hand
        if (this.activeHand) {
            const activeHandData = this.activeHand === 'left' ? twoHandsData.left : twoHandsData.right;
            if (activeHandData.position) {
                this.grabbed = dist(this.position, activeHandData.position) <= this.hoverRadius && 
                              activeHandData.gesture === "Closed_Fist";
            }
        }

        this.radius = this.grabbed ? this.defaultRadius : this.hovering ? this.hoverRadius : this.defaultRadius;
    }

    draw(): void {
        this.sk.push();
        this.sk.strokeWeight(this.outline);
        this.sk.stroke(Color.blue400);
        this.sk.fill(this.grabbed ? Color.accent3 : Color.blue500);
        this.sk.ellipse(this.position.x, this.position.y, this.radius * 2, this.radius * 2, 48);
        this.sk.pop();
    }
}

export class Wheel extends Interactable {
    position: Vector2;
    radius: number;
    defaultRadius: number;
    activeRadius: number;
    fill: number;
    startFill: number;
    start: number;
    end: number;
    private lastAngle: number | null = null;
    private grabStartFill: number = 0;
    private accumulatedRotation: number = 0;
    callback: ((value: number) => void) | null = null;

    constructor(sk: p5, position: Vector2, radius: number, fill: number = 0.5, start: number = 0, end: number = 2 * Math.PI, callback: ((value: number) => void) | null = null) {
        super(sk);
        this.position = position;
        this.radius = radius;
        this.defaultRadius = radius;
        this.activeRadius = radius + 10;
        this.fill = fill;
        this.startFill = fill;
        this.start = start;
        this.end = end;
        this.callback = callback;
        this.callback?.(fill);
    }

    evaluate(twoHandsData: TwoHandsData): void {
        const calculateAngle = (pos: Vector2) => {
            let angle = Math.atan2(pos.x - this.position.x, -(pos.y - this.position.y));
            return angle < 0 ? angle + 2 * Math.PI : angle;
        };
        
        // Check both hands for interaction
        const checkHand = (handData: { position: Vector2 | null, gesture: string }, handId: 'left' | 'right') => {
            if (!handData.position) return { overlapping: false, shouldGrab: false };
            
            const distFromCenter = dist(this.position, handData.position);
            const overlapping = distFromCenter <= this.activeRadius;
            
            if (handData.gesture == "Closed_Fist" && overlapping) {
                if (!this.grabbed) {
                    return { overlapping: true, shouldGrab: true, angle: calculateAngle(handData.position) };
                } else if (this.activeHand === handId) {
                    return { overlapping: true, shouldGrab: false, angle: calculateAngle(handData.position) };
                }
            }
            return { overlapping, shouldGrab: false };
        };

        const leftResult = checkHand(twoHandsData.left, 'left');
        const rightResult = checkHand(twoHandsData.right, 'right');
        
        // Check hovering for both hands
        this.hovering = leftResult.overlapping || rightResult.overlapping;
        this.radius = this.grabbed || this.hovering ? this.activeRadius : this.defaultRadius;
        
        // Handle grab initiation
        if (leftResult.shouldGrab) {
            this.grabbed = true;
            this.activeHand = 'left';
            this.lastAngle = leftResult.angle!;
            this.grabStartFill = this.fill;
            this.accumulatedRotation = 0;
        } else if (rightResult.shouldGrab) {
            this.grabbed = true;
            this.activeHand = 'right';
            this.lastAngle = rightResult.angle!;
            this.grabStartFill = this.fill;
            this.accumulatedRotation = 0;
        }
        
        // Handle rotation while grabbed
        if (this.grabbed && this.activeHand && this.lastAngle !== null) {
            const activeHandData = this.activeHand === 'left' ? twoHandsData.left : twoHandsData.right;
            
            if (activeHandData.gesture === "Closed_Fist" && activeHandData.position) {
                const currentAngle = calculateAngle(activeHandData.position);
                let angleDiff = currentAngle - this.lastAngle;
                
                // Normalize to shortest path for this frame only
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // Accumulate rotation to allow continuous rotation beyond 180°
                this.accumulatedRotation += angleDiff;
                this.lastAngle = currentAngle;
                
                const targetFill = Math.max(0, Math.min(1, this.grabStartFill + this.accumulatedRotation / (this.end - this.start)));
                this.fill = lerpScalar(this.fill, targetFill, this.drag);
            } else {
                // Release if hand stops making fist gesture
                this.grabbed = false;
                this.lastAngle = null;
                this.activeHand = null;
            }
        }
        
        // Release if neither hand has fist gesture
        if (twoHandsData.left.gesture !== "Closed_Fist" && twoHandsData.right.gesture !== "Closed_Fist") {
            this.grabbed = false;
            this.lastAngle = null;
            this.activeHand = null;
        }
        
        this.callback?.(this.fill);
    }

    draw(): void {
        this.sk.push();
        // Draw the circle
        this.sk.strokeWeight(0);
        this.sk.fill(Color.blue500)
        this.sk.ellipse(this.position.x, this.position.y, this.radius * 2, this.radius * 2, 64);
    
        // Calculate angles
        const currentAngle = this.start + this.fill * (this.end - this.start);
        const startAngle = this.start + this.startFill * (this.end - this.start);

        const strokeWeight = 10;
        const arcSpaceToCenter = this.radius - strokeWeight - 10;
        this.sk.strokeWeight(strokeWeight);
        
        // Draw the arc showing difference from startFill
        this.sk.noFill();
        if (this.fill - 0.005 > this.startFill) {
            this.sk.stroke(Color.accent1); // Red
            this.sk.arc(this.position.x, this.position.y, arcSpaceToCenter * 2, arcSpaceToCenter * 2, 
                        startAngle - Math.PI / 2, currentAngle - Math.PI / 2);
        } else if (this.fill + 0.005 < this.startFill) {
            this.sk.stroke(Color.accent5); // Blue
            this.sk.arc(this.position.x, this.position.y, arcSpaceToCenter * 2, arcSpaceToCenter * 2, 
                        currentAngle - Math.PI / 2, startAngle - Math.PI / 2);
        }
  
        // Draw the clock hand
        const handInset = 15;
        const handX = this.position.x + Math.sin(currentAngle) * (arcSpaceToCenter - strokeWeight - handInset);
        const handY = this.position.y - Math.cos(currentAngle) * (arcSpaceToCenter - strokeWeight - handInset);
        
        this.sk.stroke(this.grabbed ? Color.accent3 : Color.blue400);
        this.sk.line(this.position.x, this.position.y, handX, handY);
        this.sk.pop();
    }

}