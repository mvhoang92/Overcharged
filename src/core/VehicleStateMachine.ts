import { CONFIG } from '../config';
import type { EntityTier, VehicleLocation, VehicleReq, VehicleState, VehicleType } from './types';

export interface LoadedInfo {
  vehicleReq: VehicleReq;
  tier: EntityTier;
}

export class VehicleStateMachine {
  readonly type: VehicleType;
  dirt = 100;
  battery = 0;
  location: VehicleLocation = 'floor';
  overchargeTimer = 0;
  loadedWith: LoadedInfo | null = null;
  exported = false;

  constructor(type: VehicleType) {
    this.type = type;
  }

  get state(): VehicleState {
    if (this.exported) return 'exported';
    if (this.location === 'wash' && this.dirt > 0) return 'washing';
    if (this.location === 'charger' && this.battery < 100) return 'charging';
    if (this.isOvercharged) return 'overcharged';
    if (this.dirt === 0 && this.battery >= 100 && this.loadedWith) return 'loaded';
    if (this.location === 'charger' && this.battery >= 100) return 'charged';
    if (this.dirt === 0) return 'clean';
    return 'raw';
  }

  get isOvercharged(): boolean {
    return this.location === 'charger' && this.battery >= 100 && this.overchargeTimer <= 0;
  }

  get canExport(): boolean {
    return this.dirt === 0 && this.battery >= 100 && this.loadedWith !== null && !this.exported;
  }

  scrubTap(): void {
    if (this.location !== 'wash') return;
    this.dirt = Math.max(0, this.dirt - CONFIG.scrubPerTap);
  }

  placeOnCharger(): void {
    this.location = 'charger';
    if (this.battery >= 100) this.overchargeTimer = CONFIG.overchargeGraceSec;
  }

  removeFromCharger(): void {
    if (this.location === 'charger') this.location = 'floor';
    this.overchargeTimer = CONFIG.overchargeGraceSec;
  }

  update(dtSec: number): void {
    if (this.location !== 'charger' || this.exported) return;
    if (this.battery < 100) {
      const timeToFull = (100 - this.battery) / CONFIG.chargeRatePerSec;
      if (dtSec < timeToFull) {
        this.battery += CONFIG.chargeRatePerSec * dtSec;
        return;
      }
      this.battery = 100;
      this.overchargeTimer = CONFIG.overchargeGraceSec;
      dtSec -= timeToFull;
    }
    this.overchargeTimer = Math.max(0, this.overchargeTimer - dtSec);
  }
}
