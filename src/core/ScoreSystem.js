export class ScoreSystem {
    constructor() {
        this.score = 0;
    }
    addDelivery(points) {
        this.score += points;
    }
    addPenalty(pointsPerSec, dtSec) {
        this.score = Math.max(0, this.score - pointsPerSec * dtSec);
    }
}
