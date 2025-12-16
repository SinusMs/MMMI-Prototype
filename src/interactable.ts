import { Vector2 } from "./resultshandler";
import p5 from "p5";

function dist(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

function lerpScalar(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

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

    normalizedToScreenPos(normalizedPos: { x: number, y: number }): Vector2 {
        return {
            x: this.sk.width * (1 - normalizedPos.x),
            y: normalizedPos.y * this.sk.height
        };
    }
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
            dist(this.normalizedToScreenPos(this.position), this.normalizedToScreenPos(handposition)) <= this.radius;
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
        this.sk.ellipse(this.sk.width * (1 - this.position.x), this.sk.height * this.position.y, this.radius * 2, this.radius * 2);
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
        const handScreenPos = this.normalizedToScreenPos(handposition);
        let overlapping: boolean = 
            dist(this.knobPos(), handScreenPos) <= this.knobRadius;
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
                const tx = handScreenPos.x - this.p1.x;
                const ty = handScreenPos.y - this.p1.y;
                
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
