import p5 from "p5";

const SKETCH_SIZE = { x: 1920 - 16, y: 1080 - 16 };
class Background {
    sk: p5;
    stars: { x: number, y: number, size: number, brightness: number }[] = [];
    constructor(sk: p5) {
        this.sk = sk;
    }

    draw(): void {

    }
}   