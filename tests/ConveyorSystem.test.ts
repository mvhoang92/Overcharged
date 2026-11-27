import { describe, it, expect } from 'vitest';
import { ConveyorSystem } from '../src/core/ConveyorSystem';

const opts = { slots: 3, shiftIntervalSec: 1, random: () => 0 };

describe('ConveyorSystem', () => {
  it('fill spawns one entity at slot 0', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    expect(c.entities.length).toBe(1);
    expect(c.entities[0].slot).toBe(0);
  });

  it('fill does not spawn when slot 0 is occupied', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    c.fill();
    expect(c.entities.length).toBe(1);
  });

  it('update shifts entities after shiftInterval', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    c.update(0.5);
    expect(c.entities[0].slot).toBe(0);
    c.update(0.6);
    expect(c.entities[0].slot).toBe(1);
  });

  it('entity overflowing last slot is returned and removed', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    c.update(1);
    c.update(1);
    const overflow = c.update(1);
    expect(overflow.length).toBe(1);
    expect(c.entities.length).toBe(0);
  });

  it('take removes entity by id', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    const id = c.entities[0].id;
    expect(c.take(id)).not.toBeNull();
    expect(c.take(id)).toBeNull();
    expect(c.entities.length).toBe(0);
  });

  it('putBack returns entity to slot 0', () => {
    const c = new ConveyorSystem(opts);
    c.fill();
    const entity = c.take(c.entities[0].id)!;
    c.putBack(entity);
    expect(c.entities.length).toBe(1);
    expect(c.entities[0].slot).toBe(0);
  });

  it('spawns deterministic kind/tier/req from random', () => {
    const c = new ConveyorSystem({ ...opts, random: () => 0.1 });
    c.fill();
    expect(c.entities[0].kind).toBe('customer');
    expect(c.entities[0].tier).toBe('vip');
    expect(c.entities[0].vehicleReq).toBe('car');
  });
});
