export function nearestWithin(from, items, range) {
    let best = null;
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
