import { Vector2, TwoHandsData } from "./utils";
import p5 from "p5";
import * as Audio from './audioManager'
import { Interactable, Slider, Button, Wheel } from './interactable';
import * as Color from './colors';
import { CursorParticleSystem } from "./particlesystem";

const padding = { x: 120, y: 120 };
export class UI {
    sk: p5;
    sliderBox: Box;
    buttonBox: Box;
    wheelBox: Box;
    interactables: Interactable[];
    twoHandsData: TwoHandsData = {
        left: { position: null, gesture: '' },
        right: { position: null, gesture: '' }
    };
    cursorParticleSystem: CursorParticleSystem;

    constructor(sk: p5) {
        this.sk = sk;
        this.sliderBox = new Box(
            { x: padding.x, y: padding.y },
            { x: 1400, y: 600 }
        );
        this.buttonBox = new Box(
            { x: padding.x, y: 600 },
            { x: 1400, y: sk.height - padding.y }
        );
        this.wheelBox = new Box(
            { x: 1400, y: padding.y },
            { x: sk.width - padding.x, y: sk.height - padding.y }
        );

        this.interactables = [];

        const sliderThickness = 100;
        let minX = this.sliderBox.minX() + sliderThickness / 2;
        let maxX = this.sliderBox.maxX() - sliderThickness / 2;
        let step = (maxX - minX) / (Audio.loopPaths.length - 1);
        let minY = this.sliderBox.minY() + sliderThickness / 2;
        let maxY = this.sliderBox.maxY() - sliderThickness / 2;
        for (let i = 0; i < Audio.loopPaths.length; i++) {
            this.interactables.push(new Slider(sk, 
                { x: minX + i * step, y: maxY }, 
                { x: minX + i * step, y: minY }, 
                0.0,
                (value: number) => Audio.setLoopVolume(i, value),
                sliderThickness
            ));
        }

        const buttonRadius = 70;
        minX = this.buttonBox.minX() + buttonRadius;
        maxX = this.buttonBox.maxX() - buttonRadius;
        step = (maxX - minX) / (Audio.samplePaths.length - 1);
        let centerY = this.buttonBox.minY() + (this.buttonBox.maxY() - this.buttonBox.minY()) / 2;
        let offsetY: number = this.buttonBox.maxY() - centerY - buttonRadius;
        for (let i = 0; i < Audio.samplePaths.length; i++) {
            offsetY *= -1;
            this.interactables.push(new Button(sk, 
                { 
                    x: minX + i * step, 
                    y: centerY + offsetY
                }, 
                buttonRadius,
                () => Audio.triggerSample(i)
            ));
        }


        const radius = 110;
        const wheelConfigs = {
            'reverb': { fill: 0.0, start: - Math.PI * 0.7, end: Math.PI * 0.7 },
            'delay': { fill: 0.0, start: - Math.PI * 0.7, end: Math.PI * 0.7 },
            'filter': { fill: 0.5, start: - Math.PI * 0.7, end: Math.PI * 0.7 },
        }
        minY = this.wheelBox.minY() + radius;
        maxY = this.wheelBox.maxY() - radius;
        step = (maxY - minY) / (Object.keys(wheelConfigs).length - 1);
        for (let i = 0; i < Object.keys(wheelConfigs).length; i++) {
            const type = Object.keys(wheelConfigs)[i] as 'reverb' | 'delay' | 'filter';
            pushWheel(
                this.interactables,
                type,
                { 
                    x: this.wheelBox.maxX() - radius,
                    y: minY + i * step
                },
                wheelConfigs[type].fill,
                wheelConfigs[type].start,
                wheelConfigs[type].end
            );
        }

        function pushWheel(
            interactables: Interactable[],
            effectType: 'reverb' | 'delay' | 'filter',
            position: Vector2,
            fill: number,
            start: number,
            end: number
        ) {
            interactables.push(new Wheel(sk, 
                position,
                radius,
                fill,
                start,
                end,
                (value: number) => Audio.setEffectValue(effectType, value)
            ));
        }

        this.cursorParticleSystem = new CursorParticleSystem(sk);
    }

    public evaluate(twoHandsData: TwoHandsData): void {
        this.twoHandsData = twoHandsData;
        this.cursorParticleSystem.evaluate(twoHandsData);
        for (const interactable of this.interactables) {
            interactable.evaluate(twoHandsData);
        }
    }

    public draw(debug: boolean = false): void {
        this.sk.push();
        for (const interactable of this.interactables) {
            interactable.draw();
        }
        this.cursorParticleSystem.draw();
        if (debug) {
            this.sliderBox.draw(this.sk);
            this.buttonBox.draw(this.sk);
            this.wheelBox.draw(this.sk);
            // Draw debug visualization for left hand
            if (this.twoHandsData.left.position) {
                this.sk.push();
                this.sk.stroke(Color.accent5); // Blue for left hand
                this.sk.fill(Color.accent5);
                this.sk.line(this.twoHandsData.left.position.x, 0, this.twoHandsData.left.position.x, this.sk.height);
                this.sk.line(0, this.twoHandsData.left.position.y, this.sk.width, this.twoHandsData.left.position.y);
                this.sk.ellipse(this.twoHandsData.left.position.x, this.twoHandsData.left.position.y, 10, 10);
                this.sk.pop();
            }
            // Draw debug visualization for right hand
            if (this.twoHandsData.right.position) {
                this.sk.push();
                this.sk.stroke(Color.accent1); // Red for right hand
                this.sk.fill(Color.accent1);
                this.sk.line(this.twoHandsData.right.position.x, 0, this.twoHandsData.right.position.x, this.sk.height);
                this.sk.line(0, this.twoHandsData.right.position.y, this.sk.width, this.twoHandsData.right.position.y);
                this.sk.ellipse(this.twoHandsData.right.position.x, this.twoHandsData.right.position.y, 10, 10);
                this.sk.pop();
            }
        }
        this.sk.pop();
    }
}

class Box {
    p1: Vector2;
    p2: Vector2;
    padding: number = 40;

    constructor(p1: Vector2, p2: Vector2) {
        this.p1 = p1;
        this.p2 = p2;
    }

    draw(sk: p5): void {
        sk.push();
        sk.rectMode(sk.CORNERS);
        sk.stroke(Color.debug2);
        sk.noFill();
        sk.rect(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        sk.rect(this.p1.x + this.padding, this.p1.y + this.padding, this.p2.x - this.padding, this.p2.y - this.padding);
        sk.circle(this.p1.x, this.p1.y, 10);
        sk.circle(this.p2.x, this.p2.y, 10);
        sk.pop();
    }

    minX(): number {
        return Math.min(this.p1.x, this.p2.x) + this.padding;
    }

    maxX(): number {
        return Math.max(this.p1.x, this.p2.x) - this.padding;
    }

    minY(): number {
        return Math.min(this.p1.y, this.p2.y) + this.padding;
    }

    maxY(): number {
        return Math.max(this.p1.y, this.p2.y) - this.padding;
    }
}