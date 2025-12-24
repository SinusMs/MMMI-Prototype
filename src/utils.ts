export function dist(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export function lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

export function lerpScalar(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export type Vector2 = {
    x: number,
    y: number
}
