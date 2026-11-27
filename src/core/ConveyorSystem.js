export class ConveyorSystem {
    constructor(opts) {
        this.list = [];
        this.nextId = 1;
        this.shiftTimer = 0;
        this.opts = opts;
        this.random = opts.random ?? Math.random;
    }
    get entities() {
        return this.list;
    }
    fill() {
        if (this.list.some((e) => e.slot === 0))
            return;
        const kind = this.random() < 0.5 ? 'customer' : 'goods';
        const tier = this.random() < 0.25 ? 'vip' : 'normal';
        const vehicleReq = this.random() < 0.5 ? 'car' : 'bike';
        this.list.push({ id: this.nextId++, kind, tier, vehicleReq, slot: 0 });
    }
    update(dtSec) {
        this.shiftTimer += dtSec;
        if (this.shiftTimer < this.opts.shiftIntervalSec)
            return [];
        this.shiftTimer -= this.opts.shiftIntervalSec;
        for (const e of this.list)
            e.slot += 1;
        const overflow = [];
        this.list = this.list.filter((e) => {
            if (e.slot >= this.opts.slots) {
                overflow.push(e);
                return false;
            }
            return true;
        });
        return overflow;
    }
    take(id) {
        const idx = this.list.findIndex((e) => e.id === id);
        if (idx === -1)
            return null;
        return this.list.splice(idx, 1)[0];
    }
    putBack(entity) {
        entity.slot = 0;
        this.list.push(entity);
    }
}
