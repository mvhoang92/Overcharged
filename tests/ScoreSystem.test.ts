import { describe, it, expect } from 'vitest';
import { ScoreSystem } from '../src/core/ScoreSystem';

describe('ScoreSystem', () => {
  it('addDelivery adds points', () => {
    const s = new ScoreSystem();
    s.addDelivery(100);
    expect(s.score).toBe(100);
  });

  it('addPenalty subtracts pointsPerSec * dt', () => {
    const s = new ScoreSystem();
    s.addDelivery(100);
    s.addPenalty(5, 2);
    expect(s.score).toBe(90);
  });

  it('score never goes below 0', () => {
    const s = new ScoreSystem();
    s.addPenalty(5, 100);
    expect(s.score).toBe(0);
  });
});
