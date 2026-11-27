import { describe, it, expect } from 'vitest';
import { ComboSystem } from '../src/core/ComboSystem';

describe('ComboSystem', () => {
  it('starts at multiplier 1', () => {
    const c = new ComboSystem();
    expect(c.streak).toBe(0);
    expect(c.multiplier).toBe(1);
  });

  it('multiplier grows with streak', () => {
    const c = new ComboSystem();
    c.onDelivery();
    expect(c.multiplier).toBe(1.5);
    c.onDelivery();
    expect(c.multiplier).toBe(2);
    c.onDelivery();
    expect(c.multiplier).toBe(3);
    c.onDelivery();
    expect(c.multiplier).toBe(5);
  });

  it('multiplier caps at 5', () => {
    const c = new ComboSystem();
    for (let i = 0; i < 10; i++) c.onDelivery();
    expect(c.multiplier).toBe(5);
  });

  it('miss resets streak', () => {
    const c = new ComboSystem();
    c.onDelivery();
    c.onDelivery();
    c.onMiss();
    expect(c.streak).toBe(0);
    expect(c.multiplier).toBe(1);
  });
});
