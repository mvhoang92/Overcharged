export class ScoreSystem {
  score = 0;

  addDelivery(points: number): void {
    this.score += points;
  }

  addPenalty(pointsPerSec: number, dtSec: number): void {
    this.score = Math.max(0, this.score - pointsPerSec * dtSec);
  }
}
