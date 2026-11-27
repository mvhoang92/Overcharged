import { describe, it, expect } from 'vitest';
import { nearestWithin } from '../src/core/interaction';

describe('nearestWithin', () => {
  it('returns nearest item within range', () => {
    const items = [{ position: { x: 10, z: 0 } }, { position: { x: 50, z: 0 } }];
    expect(nearestWithin({ x: 0, z: 0 }, items, 60)).toBe(items[0]);
  });

  it('returns null when nothing in range', () => {
    expect(nearestWithin({ x: 0, z: 0 }, [{ position: { x: 100, z: 0 } }], 60)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(nearestWithin({ x: 0, z: 0 }, [], 60)).toBeNull();
  });

  it('first item wins on tie', () => {
    const items = [{ position: { x: 10, z: 0 } }, { position: { x: -10, z: 0 } }];
    expect(nearestWithin({ x: 0, z: 0 }, items, 60)).toBe(items[0]);
  });
});
