import { CONFIG } from '../config';
export class VehicleStateMachine {
    constructor(type) {
        this.dirt = 100;
        this.battery = 0;
        this.location = 'floor';
        this.overchargeTimer = 0;
        this.loadedWith = null;
        this.exported = false;
        this.type = type;
    }
    get state() {
        if (this.exported)
            return 'exported';
        if (this.location === 'wash' && this.dirt > 0)
            return 'washing';
        if (this.location === 'charger' && this.battery < 100)
            return 'charging';
        if (this.isOvercharged)
            return 'overcharged';
        if (this.dirt === 0 && this.battery >= 100 && this.loadedWith)
            return 'loaded';
        if (this.location === 'charger' && this.battery >= 100)
            return 'charged';
        if (this.dirt === 0)
            return 'clean';
        return 'raw';
    }
    get isOvercharged() {
        return this.location === 'charger' && this.battery >= 100 && this.overchargeTimer <= 0;
    }
    get canExport() {
        return this.dirt === 0 && this.battery >= 100 && this.loadedWith !== null && !this.exported;
    }
    scrubTap() {
        if (this.location !== 'wash')
            return;
        this.dirt = Math.max(0, this.dirt - CONFIG.scrubPerTap);
    }
    placeOnCharger() {
        this.location = 'charger';
        if (this.battery >= 100)
            this.overchargeTimer = CONFIG.overchargeGraceSec;
    }
    removeFromCharger() {
        if (this.location === 'charger')
            this.location = 'floor';
        this.overchargeTimer = CONFIG.overchargeGraceSec;
    }
    update(dtSec) {
        if (this.location !== 'charger' || this.exported)
            return;
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
