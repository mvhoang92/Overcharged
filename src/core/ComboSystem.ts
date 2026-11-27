import { CONFIG } from '../config';

export class ComboSystem {
  streak = 0;

  get multiplier(): number {
    const tiers = CONFIG.comboMultipliers;
    return tiers[Math.min(this.streak, tiers.length - 1)];
  }

  onDelivery(): void {
    this.streak += 1;
  }

  onMiss(): void {
    this.streak = 0;
  }
}
