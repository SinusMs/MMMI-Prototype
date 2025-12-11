import { Vector2 } from "./resultshandler";
import p5 from "p5";

export abstract class Interactable {
    sk: p5;
    position: Vector2;
    hovering: boolean = false;
    grabbed: boolean = false;
    prevHandposition: Vector2 | null = null;

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
    hovering: boolean = false;
    grabbed: boolean = false;
    prevHandposition: Vector2 | null = null;
    radius: number;

    constructor(sk: p5, position: Vector2, radius: number) {
        super(sk, position);
        this.radius = radius;
    }

    evaluate(gesture: string, handposition: Vector2): void {
        let overlapping: boolean = 
            dist(this.normalizedToScreenPos(this.position), this.normalizedToScreenPos(handposition)) <= this.radius;
        if (overlapping) {
            this.hovering = true;
            if (gesture == "Closed_Fist") {
                this.grabbed = true;
            } 
            else {
                this.grabbed = false;
            }
        } 
        else if (gesture != "Closed_Fist" || !this.grabbed) {
            this.grabbed = false;
            this.hovering = false;
        }
        
        if (this.grabbed && this.prevHandposition) {
            this.position.x += handposition.x - this.prevHandposition.x;
            this.position.y += handposition.y - this.prevHandposition.y;
        }
        this.prevHandposition = handposition;
    }

    draw(): void {
        this.sk.ellipse(this.sk.width * (1 - this.position.x), this.sk.height * this.position.y, this.radius * 2, this.radius * 2);
    }
}

function dist(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

