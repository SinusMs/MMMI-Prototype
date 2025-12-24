import p5 from "p5";
import { Vector2, lerp, lerpScalar, dist } from "./utils.ts";

export abstract class Interactable {
    sk: p5;
    hovering: boolean = false;
    grabbed: boolean = false;
    drag: number = 0.1;

    constructor(sk: p5) {
        this.sk = sk;
    }

    abstract evaluate(gesture: string, handposition: Vector2): void;
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

    evaluate(gesture: string, handposition: Vector2): void {
        let overlapping: boolean = 
            dist(this.position, handposition) <= this.radius;
        if (gesture == "Closed_Fist") {
            if (overlapping) this.grabbed = true;
        } else {
            this.grabbed = false;
        }
        this.hovering = overlapping;
        
        if (this.grabbed) {
            this.position = lerp(this.position, handposition, this.drag);
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
    knobRadius: number = 20;
    knobPos = () => lerp(this.p1, this.p2, this.fill);

    constructor(sk: p5, p1: Vector2, p2: Vector2, fill: number = 0.5) {
        super(sk);
        this.p1 = p1;
        this.p2 = p2;
        this.p1p2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        this.fill = fill;
    }

    evaluate(gesture: string, handposition: Vector2): void {
        let overlapping: boolean = 
            dist(this.knobPos(), handposition) <= this.knobRadius;
        if (gesture == "Closed_Fist") {
            if (overlapping) this.grabbed = true;
        } else {
            this.grabbed = false;
        }
        this.hovering = overlapping;
        
        if (this.grabbed) {
            
            // Project hand position onto the line segment p1p2
            const lenSquared = this.p1p2.x * this.p1p2.x + this.p1p2.y * this.p1p2.y;
            
            if (lenSquared > 0) {
                // Vector from p1 to hand position
                const tx = handposition.x - this.p1.x;
                const ty = handposition.y - this.p1.y;
                
                // Project onto line
                let t = (tx * this.p1p2.x + ty * this.p1p2.y) / lenSquared;
                
                // Update fill with interpolation for smoothness and clamp to [0, 1]
                this.fill = Math.max(0, Math.min(1, lerpScalar(this.fill, t, this.drag)));
            }
        }
    }

    draw(): void {
        this.sk.line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        this.sk.circle(this.knobPos().x, this.knobPos().y, this.knobRadius * 2);
    }
}


export class Button extends Interactable {
    position: Vector2;
    radius: number;
    toggled: boolean = false;
    private wasGrabbed: boolean = false;

    constructor(sk: p5, position: Vector2, radius: number) {
        super(sk);
        this.position = position;
        this.radius = radius;
    }

    evaluate(gesture: string, handposition: Vector2): void {
        let overlapping: boolean = dist(this.position, handposition) <= this.radius;
        
        if (gesture == "Closed_Fist") {
            if (overlapping && !this.wasGrabbed) {
                this.toggled = !this.toggled;
                this.wasGrabbed = true;
            }
            this.grabbed = overlapping;
        } else {
            this.grabbed = false;
            this.wasGrabbed = false;
        }
        this.hovering = overlapping;
    }

    draw(): void {
        if (this.toggled) {
            this.sk.fill(100, 200, 100); 
        } else {
            this.sk.fill(200, 100, 100); 
        }
        
        this.sk.circle(this.position.x, this.position.y, this.radius * 2);
    }
}

export class Wheel extends Interactable {
    position: Vector2;
    innerRadius: number;
    outerRadius: number;
    fill: number;
    start: number;
    end: number;
    private lastAngle: number | null = null;
    private grabStartFill: number = 0;
    private accumulatedRotation: number = 0;

    constructor(sk: p5, position: Vector2, innerRadius: number, outerRadius: number, fill: number = 0.5, start: number = 0, end: number = 2 * Math.PI) {
        super(sk);
        this.position = position;
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;
        this.fill = fill;
        this.start = start;
        this.end = end;
    }

    evaluate(gesture: string, handposition: Vector2): void {
        const distFromCenter = dist(this.position, handposition);
        const overlapping = distFromCenter >= this.innerRadius && distFromCenter <= this.outerRadius;
        
        this.hovering = overlapping;
        
        const calculateAngle = (pos: Vector2) => {
            let angle = Math.atan2(pos.x - this.position.x, -(pos.y - this.position.y));
            return angle < 0 ? angle + 2 * Math.PI : angle;
        };
        
        if (gesture == "Closed_Fist") {
            if (!this.grabbed && overlapping) {
                this.grabbed = true;
                this.lastAngle = calculateAngle(handposition);
                this.grabStartFill = this.fill;
                this.accumulatedRotation = 0;
            }
            
            if (this.grabbed && this.lastAngle !== null) {
                const currentAngle = calculateAngle(handposition);
                let angleDiff = currentAngle - this.lastAngle;
                
                // Normalize to shortest path for this frame only
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // Accumulate rotation to allow continuous rotation beyond 180°
                this.accumulatedRotation += angleDiff;
                this.lastAngle = currentAngle;
                
                const targetFill = Math.max(0, Math.min(1, this.grabStartFill + this.accumulatedRotation / (this.end - this.start)));
                this.fill = lerpScalar(this.fill, targetFill, this.drag);
            }
        } else {
            this.grabbed = false;
            this.lastAngle = null;
        }
    }

    draw(): void {
        this.sk.push();
        // Draw the ring
        this.sk.noFill();
        this.sk.strokeWeight(this.outerRadius - this.innerRadius);
        this.sk.ellipse(this.position.x, this.position.y, (this.innerRadius + ((this.outerRadius - this.innerRadius) / 2)) * 2, (this.innerRadius + ((this.outerRadius - this.innerRadius) / 2)) * 2, 50);
    
        // Draw the knob to show rotation
        const knobRadius = (this.outerRadius - this.innerRadius) / 2;
        const knobDistance = (this.innerRadius + this.outerRadius) / 2;
        
        // Calculate knob position based on fill, mapped to [start, end] range
        const angle = this.start + this.fill * (this.end - this.start);
        const knobX = this.position.x + Math.sin(angle) * knobDistance;
        const knobY = this.position.y - Math.cos(angle) * knobDistance;
        
        this.sk.fill(150);
        if (this.hovering) {
            this.sk.strokeWeight(3);
        } else {
            this.sk.strokeWeight(1);
        }
        this.sk.circle(knobX, knobY, knobRadius * 2);
        this.sk.pop();
    }

}