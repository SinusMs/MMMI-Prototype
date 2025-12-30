import p5 from "p5";
import { Vector2 } from "./utils";
import * as Color from './colors';

export class CursorParticleSystem {
    sk: p5;
    particles: Particle[] = [];
    particlesToEmit: number = 0;
    prevHandPos: Vector2 | null = null;

    particlesPerSecond: number = 7;
    particlesPerPixel: number = 0.07;
    emitterRadius: number = 40;

    constructor(sk: p5) {
        this.sk = sk;
    }

    evaluate(gesture: string, handposition: Vector2 | null = { x: this.sk.mouseX, y: this.sk.mouseY }): void {
        let movementDistance = handposition == null || this.prevHandPos == null ? 0 :
            Math.hypot(handposition.x - this.prevHandPos.x, handposition.y - this.prevHandPos.y);
        if (this.prevHandPos == null && handposition) this.particlesToEmit += 10;
        this.prevHandPos = handposition;

        if (handposition){
            this.particlesToEmit += this.particlesPerPixel * movementDistance;
            this.particlesToEmit += this.particlesPerSecond * (this.sk.deltaTime / 1000);
            let integralParticlesToEmit = Math.floor(this.particlesToEmit);
            this.particlesToEmit -= integralParticlesToEmit;
            if (gesture == "Closed_Fist") {
                integralParticlesToEmit *= 2;
                for (let i = 0; i < integralParticlesToEmit; i++) {
                    let lifeTime = 0.5;
                    let position = p5.Vector.random2D().mult(Math.random() * this.emitterRadius * 0.75);
                    let velocity = position.copy().mult(10);
                    let acceleration = velocity.copy().mult(-2 / lifeTime);
                    this.particles.push(new Particle(
                        this.sk,
                        lifeTime,
                        10 + Math.random() * 5,
                        this.sk.createVector(handposition.x, handposition.y).add(position), 
                        velocity,
                        acceleration
                    ));
                }
            }
            else {
                for (let i = 0; i < integralParticlesToEmit; i++) {
                    let pos = p5.Vector.random2D().mult(Math.random() * this.emitterRadius);
                    this.particles.push(new Particle(
                        this.sk,
                        0.5,
                        10 + Math.random() * 10,
                        this.sk.createVector(handposition.x, handposition.y).add(pos), 
                        this.sk.createVector(
                            (Math.random() - 0.5) * 2 * 10, 
                            (Math.random() - 0.5) * 2 * 10
                        ),
                        p5.Vector.random2D().mult(10)
                    ));
                }
            }
        }

        for (let particle of this.particles) {
            particle.evaluate();
        }

        this.particles = this.particles.filter(particle => !particle.isDead());
    }

    draw(): void {
        for (let particle of this.particles) {
            particle.draw();
        }
    }
}

class Particle {
    sk: p5;
    maxlifeTime: number;
    size: number;
    position: p5.Vector;
    velocity: p5.Vector;
    acceleration: p5.Vector = p5.Vector.random2D().mult(10);
    scale: number = 1;
    lifeTime: number;

    constructor(sk: p5, maxlifeTime: number, size: number, position: p5.Vector, velocity: p5.Vector, acceleration: p5.Vector) {
        this.sk = sk;
        this.maxlifeTime = maxlifeTime;
        this.size = size;
        this.position = position;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.lifeTime = 0;
    }

    evaluate(): void {
        let deltaTimeSec = this.sk.deltaTime / 1000;
        this.velocity = this.velocity.add(p5.Vector.mult(this.acceleration, deltaTimeSec));
        this.position.x += this.velocity.x * deltaTimeSec;
        this.position.y += this.velocity.y * deltaTimeSec;
        this.scale = expEase(this.lifeTime / this.maxlifeTime, 2);
        this.lifeTime += deltaTimeSec;
    }

    draw(): void {
        this.sk.push();
        this.sk.noStroke();
        this.sk.fill(Color.light)
        this.sk.ellipse(this.position.x, this.position.y, this.size * this.scale, this.size * this.scale, 4);
        this.sk.pop();
    }

    isDead(): boolean {
        return this.lifeTime >= this.maxlifeTime;
    }
}


function expEase(t: number, exp: number = 6): number {
    t = Math.min(Math.max(t, 0), 1);
    return 1 - Math.pow(2 * (t - 0.5), exp);
}