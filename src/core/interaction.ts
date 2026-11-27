export interface Point {
  x: number;
  z: number;
}

export function nearestWithin<T extends Point>(from: Point, items: T[], range: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const item of items) {
    const d = Math.hypot(item.x - from.x, item.z - from.z);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}
