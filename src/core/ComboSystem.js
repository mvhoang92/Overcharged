import { CONFIG } from '../config';
export class ComboSystem {
    constructor() {
        this.streak = 0;
    }
    get multiplier() {
        const tiers = CONFIG.comboMultipliers;
        return tiers[Math.min(this.streak, tiers.length - 1)];
    }
    onDelivery() {
        this.streak += 1;
    }
    onMiss() {
        this.streak = 0;
    }
}
