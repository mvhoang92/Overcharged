import type { EntityKind, EntityTier, VehicleReq } from './types';

export interface ConveyorEntity {
  id: number;
  kind: EntityKind;
  tier: EntityTier;
  vehicleReq: VehicleReq;
  slot: number;
}

export interface ConveyorOpts {
  slots: number;
  shiftIntervalSec: number;
  random?: () => number;
}

export class ConveyorSystem {
  private list: ConveyorEntity[] = [];
  private nextId = 1;
  private shiftTimer = 0;
  private readonly opts: ConveyorOpts;
  private readonly random: () => number;

  constructor(opts: ConveyorOpts) {
    this.opts = opts;
    this.random = opts.random ?? Math.random;
  }

  get entities(): readonly ConveyorEntity[] {
    return this.list;
  }

  fill(): void {
    if (this.list.some((e) => e.slot === 0)) return;
    const kind: EntityKind = this.random() < 0.5 ? 'customer' : 'goods';
    const tier: EntityTier = this.random() < 0.25 ? 'vip' : 'normal';
    const vehicleReq: VehicleReq = this.random() < 0.5 ? 'car' : 'bike';
    this.list.push({ id: this.nextId++, kind, tier, vehicleReq, slot: 0 });
  }

  update(dtSec: number): ConveyorEntity[] {
    this.shiftTimer += dtSec;
    if (this.shiftTimer < this.opts.shiftIntervalSec) return [];
    this.shiftTimer -= this.opts.shiftIntervalSec;
    for (const e of this.list) e.slot += 1;
    const overflow: ConveyorEntity[] = [];
    this.list = this.list.filter((e) => {
      if (e.slot >= this.opts.slots) {
        overflow.push(e);
        return false;
      }
      return true;
    });
    return overflow;
  }

  take(id: number): ConveyorEntity | null {
    const idx = this.list.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    return this.list.splice(idx, 1)[0];
  }

  putBack(entity: ConveyorEntity): void {
    entity.slot = 0;
    this.list.push(entity);
  }
}
