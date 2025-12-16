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
export abstract class Interactable {
    sk: p5;
    position: Vector2;
    hovering: boolean = false;
    grabbed: boolean = false;
    prevHandposition: Vector2 | null = null;
    drag: number = 0.1;

    constructor(sk: p5, position: Vector2 = { x: 0, y: 0 }) {
        this.sk = sk;
        this.position = position;
    }

    abstract evaluate(gesture: string, handposition: Vector2): void;
    abstract draw(): void;

    normalizedToScreenPos(normalizedPos: { x: number, y: number }): Vector2 {
        return {
            x: normalizedPos.x * this.sk.width,
            y: normalizedPos.y * this.sk.height
        };
    }
}

export class DraggableEllipse extends Interactable {
    radius: number;

    constructor(sk: p5, position: Vector2, radius: number) {
        super(sk, position);
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
        
        if (this.grabbed && this.prevHandposition) {
            this.position = lerp(this.position, handposition, this.drag);
        }
        this.prevHandposition = handposition;
    }

    draw(): void {
        this.sk.ellipse(this.sk.width * (1 - this.position.x), this.sk.height * this.position.y, this.radius * 2, this.radius * 2);
    }
}
