import { Vector2 } from "./utils";
import p5 from "p5";
import * as Audio from './audioManager'
import { Interactable, Slider, Button, Wheel } from './interactable';

const padding = { x: 120, y: 120 };
export class UI {
    sk: p5;
    sliderBox: Box;
    buttonBox: Box;
    wheelBox: Box;
    interactables: Interactable[];
    handposition: Vector2 | null = null;

    constructor(sk: p5) {
        this.sk = sk;
        this.sliderBox = new Box(
            { x: padding.x, y: padding.y },
            { x: 1300, y: 600 }
        );
        this.buttonBox = new Box(
            { x: padding.x, y: 600 },
            { x: 1300, y: sk.height - padding.y }
        );
        this.wheelBox = new Box(
            { x: 1300, y: padding.y },
            { x: sk.width - padding.x, y: sk.height - padding.y }
        );

        this.interactables = [];
        for (let i = 0; i < Audio.loopPaths.length; i++) {
            this.interactables.push(new Slider(sk, 
                { x: this.sliderBox.minX() + (i + 1) * (this.sliderBox.maxX() - this.sliderBox.minX()) / (Audio.loopPaths.length + 1), y: this.sliderBox.maxY() }, 
                { x: this.sliderBox.minX() + (i + 1) * (this.sliderBox.maxX() - this.sliderBox.minX()) / (Audio.loopPaths.length + 1), y: this.sliderBox.minY() }, 
                i == 1 ? 0.5 : 0.0,
                (value: number) => Audio.setLoopVolume(i, value)
            ));
        }

        for (let i = 0; i < Audio.samplePaths.length; i++) {
            this.interactables.push(new Button(sk, 
                { 
                    x: this.buttonBox.minX() + (i + 1) * (this.buttonBox.maxX() - this.buttonBox.minX()) / 6, 
                    y: this.buttonBox.minY() + (this.buttonBox.maxY() - this.buttonBox.minY()) / 2 
                }, 
                50,
                () => Audio.triggerSample(i)
            ));
        }

        for (let i = 0; i < 3; i++) {
            const effectTypes: ('reverb' | 'delay' | 'filter')[] = ['reverb', 'delay', 'filter'];
            this.interactables.push(new Wheel(sk, 
                { 
                    x: this.wheelBox.minX() + (this.wheelBox.maxX() - this.wheelBox.minX()) / 2,
                    y: this.wheelBox.minY() + (i + 1) * (this.wheelBox.maxY() - this.wheelBox.minY()) / 4
                }, 
                60, 
                100,
                0.0,
                0,
                2 * Math.PI,
                (value: number) => Audio.setEffectValue(effectTypes[i], value)
            ));
        }
    }

    public evaluate(gesture: string, handposition: Vector2 | null): void {
        this.handposition = handposition;
        if (!handposition) return;
        for (const interactable of this.interactables) {
            interactable.evaluate(gesture, handposition);
        }
    }

    public draw(): void {
        this.sliderBox.draw(this.sk);
        this.buttonBox.draw(this.sk);
        this.wheelBox.draw(this.sk);
        for (const interactable of this.interactables) {
            interactable.draw();
        }
        if (this.handposition) {
            this.sk.line(this.handposition.x, 0, this.handposition.x, this.sk.height);
            this.sk.line(0, this.handposition.y, this.sk.width, this.handposition.y);
            this.sk.ellipse(this.handposition.x, this.handposition.y, 10, 10);
        }
    }
}

class Box {
    p1: Vector2;
    p2: Vector2;

    constructor(p1: Vector2, p2: Vector2) {
        this.p1 = p1;
        this.p2 = p2;
    }

    draw(sk: p5): void {
        sk.push();
        sk.rectMode(sk.CORNERS);
        sk.stroke(300, 0, 0);
        sk.noFill();
        sk.rect(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        sk.circle(this.p1.x, this.p1.y, 10);
        sk.circle(this.p2.x, this.p2.y, 10);
        sk.pop();
    }

    minX(): number {
        return Math.min(this.p1.x, this.p2.x);
    }

    maxX(): number {
        return Math.max(this.p1.x, this.p2.x);
    }

    minY(): number {
        return Math.min(this.p1.y, this.p2.y);
    }

    maxY(): number {
        return Math.max(this.p1.y, this.p2.y);
    }
}