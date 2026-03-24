import { describe, it, expect } from 'vitest';

// Test the spring math directly (extracted from the hook for testability)
function springStep(
  px: number, py: number, pz: number,
  vx: number, vy: number, vz: number,
  tx: number, ty: number, tz: number,
  dt: number,
  stiffness: number,
  damping: number,
): { px: number; py: number; pz: number; vx: number; vy: number; vz: number } {
  const fx = stiffness * (tx - px) - damping * vx;
  const fy = stiffness * (ty - py) - damping * vy;
  const fz = stiffness * (tz - pz) - damping * vz;
  vx += fx * dt;
  vy += fy * dt;
  vz += fz * dt;
  px += vx * dt;
  py += vy * dt;
  pz += vz * dt;
  return { px, py, pz, vx, vy, vz };
}

describe('spring3D math', () => {
  it('converges toward target', () => {
    let state = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    for (let i = 0; i < 200; i++) {
      state = springStep(state.px, state.py, state.pz, state.vx, state.vy, state.vz, 1, 2, 3, 0.016, 120, 14);
    }
    expect(state.px).toBeCloseTo(1, 1);
    expect(state.py).toBeCloseTo(2, 1);
    expect(state.pz).toBeCloseTo(3, 1);
  });

  it('velocity settles to near zero', () => {
    let state = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    for (let i = 0; i < 200; i++) {
      state = springStep(state.px, state.py, state.pz, state.vx, state.vy, state.vz, 1, 0, 0, 0.016, 120, 14);
    }
    expect(Math.abs(state.vx)).toBeLessThan(0.01);
  });

  it('overshoots slightly (spring behavior)', () => {
    let maxX = 0;
    let state = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    for (let i = 0; i < 100; i++) {
      state = springStep(state.px, state.py, state.pz, state.vx, state.vy, state.vz, 1, 0, 0, 0.016, 120, 14);
      maxX = Math.max(maxX, state.px);
    }
    // Should overshoot past 1.0 slightly
    expect(maxX).toBeGreaterThan(1.0);
  });

  it('higher damping reduces overshoot', () => {
    let maxLow = 0, maxHigh = 0;
    let stateLow = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    let stateHigh = { px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 };
    for (let i = 0; i < 100; i++) {
      stateLow = springStep(stateLow.px, stateLow.py, stateLow.pz, stateLow.vx, stateLow.vy, stateLow.vz, 1, 0, 0, 0.016, 120, 10);
      stateHigh = springStep(stateHigh.px, stateHigh.py, stateHigh.pz, stateHigh.vx, stateHigh.vy, stateHigh.vz, 1, 0, 0, 0.016, 120, 20);
      maxLow = Math.max(maxLow, stateLow.px);
      maxHigh = Math.max(maxHigh, stateHigh.px);
    }
    expect(maxHigh).toBeLessThan(maxLow);
  });
});
