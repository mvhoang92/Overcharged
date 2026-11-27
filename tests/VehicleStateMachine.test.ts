import { describe, it, expect } from 'vitest';
import { VehicleStateMachine } from '../src/core/VehicleStateMachine';

describe('VehicleStateMachine', () => {
  it('starts raw: dirt 100, battery 0, not loaded', () => {
    const v = new VehicleStateMachine('bike');
    expect(v.dirt).toBe(100);
    expect(v.battery).toBe(0);
    expect(v.loadedWith).toBeNull();
    expect(v.state).toBe('raw');
  });

  it('scrub only works when location is wash', () => {
    const v = new VehicleStateMachine('bike');
    v.scrub(1);
    expect(v.dirt).toBe(100);
    v.location = 'wash';
    v.scrub(1);
    expect(v.dirt).toBeLessThan(100);
  });

  it('scrub clamps dirt at 0 and becomes clean', () => {
    const v = new VehicleStateMachine('bike');
    v.location = 'wash';
    v.scrub(10);
    expect(v.dirt).toBe(0);
    expect(v.state).toBe('clean');
  });

  it('charging increases battery and clamps at 100', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(10);
    expect(v.battery).toBe(100);
    expect(v.state).toBe('charged');
  });

  it('overcharges after grace period', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(8);
    expect(v.state).toBe('charged');
    v.update(3.1);
    expect(v.isOvercharged).toBe(true);
    expect(v.state).toBe('overcharged');
  });

  it('removing from charger stops overcharge', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(12);
    expect(v.isOvercharged).toBe(true);
    v.removeFromCharger();
    expect(v.isOvercharged).toBe(false);
  });

  it('canExport requires clean + full battery + loaded', () => {
    const v = new VehicleStateMachine('bike');
    v.location = 'wash';
    v.scrub(10);
    v.placeOnCharger();
    v.update(10);
    expect(v.canExport).toBe(false);
    v.loadedWith = { vehicleReq: 'bike', tier: 'normal' };
    expect(v.canExport).toBe(true);
    expect(v.state).toBe('loaded');
  });

  it('large dt does not overshoot values', () => {
    const v = new VehicleStateMachine('bike');
    v.location = 'wash';
    v.scrub(1000);
    expect(v.dirt).toBe(0);
    v.placeOnCharger();
    v.update(1000);
    expect(v.battery).toBe(100);
  });
});
