export interface Point {
  x: number;
  z: number;
}

export interface Positioned {
  position: Point;
}

export function nearestWithin<T extends Positioned>(from: Point, items: T[], range: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const item of items) {
    const p = item.position;
    const d = Math.hypot(p.x - from.x, p.z - from.z);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}
