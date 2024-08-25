import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';

import { Enveloper } from '../index';

// convert these eventually
const expect = (a: unknown) => ({
  toBe: (b: unknown) => strictEqual(a, b),
  toBeCloseTo: (b: unknown) => ok(Math.abs((a as number) - (b as number)) < 0.001),
});

//
//    MOCKS
//

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const mockAudioParam = () =>
  ({
    value: 0,
    setValueAtTime: noop,
    setTargetAtTime: noop,
    cancelScheduledValues: noop,
    linearRampToValueAtTime: noop,
    exponentialRampToValueAtTime: noop,
  } as unknown as AudioParam);

const mockAudioContext = () =>
  ({
    currentTime: 0,
  } as unknown as AudioContext);

//
//
//

describe('Enveloper', () => {
  it('should init normally', () => {
    const env = new Enveloper(mockAudioContext());
    const param = mockAudioParam();

    env.initParam(param, 0);
    expect(env.getValueAtTime(param, 0)).toBeCloseTo(0);
    expect(env.getValueAtTime(param, 10)).toBeCloseTo(0);
    env.initParam(param, 1);
    expect(env.getValueAtTime(param, 0)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 10)).toBeCloseTo(1);
  });

  it('should support basic envelopes', () => {
    const env = new Enveloper(mockAudioContext());
    const param = mockAudioParam();

    env.initParam(param, 0);
    env.startEnvelope(param, 1);
    env.addHold(param, 1);
    env.addRamp(param, 1, 1);
    expect(env.getValueAtTime(param, 0)).toBeCloseTo(0);
    expect(env.getValueAtTime(param, 1)).toBeCloseTo(0);
    expect(env.getValueAtTime(param, 2)).toBeCloseTo(0);
    expect(env.getValueAtTime(param, 2.5)).toBeCloseTo(0.5);
    expect(env.getValueAtTime(param, 3)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(1);
  });

  it('should support separated envelopes', () => {
    const env = new Enveloper(mockAudioContext());
    const param = mockAudioParam();

    env.initParam(param, 0);
    env.startEnvelope(param, 1);
    env.addRamp(param, 1, 1);
    env.startEnvelope(param, 10);
    env.addHold(param, 1);
    env.addRamp(param, 1, 2);
    expect(env.getValueAtTime(param, 0)).toBeCloseTo(0);
    expect(env.getValueAtTime(param, 5)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 10)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 10.5)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 11)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 11.5)).toBeCloseTo(1.5);
    expect(env.getValueAtTime(param, 12)).toBeCloseTo(2);
    expect(env.getValueAtTime(param, 20)).toBeCloseTo(2);
  });

  it('should support envelopes during envelopes', () => {
    const env = new Enveloper(mockAudioContext());
    const param = mockAudioParam();

    env.initParam(param, 0);
    env.startEnvelope(param, 1);
    env.addHold(param, 1);
    env.addRamp(param, 1, 1);

    env.startEnvelope(param, 2.5);
    env.addHold(param, 1);
    env.addRamp(param, 0.5, 1);
    expect(env.getValueAtTime(param, 2.25)).toBeCloseTo(0.25);
    expect(env.getValueAtTime(param, 2.5)).toBeCloseTo(0.5);
    expect(env.getValueAtTime(param, 3.5)).toBeCloseTo(0.5);
    expect(env.getValueAtTime(param, 3.75)).toBeCloseTo(0.75);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(1);
    expect(env.getValueAtTime(param, 5)).toBeCloseTo(1);
  });

  it('should support holds or new envelopes during infinite sweeps', () => {
    const env = new Enveloper(mockAudioContext());
    const param = mockAudioParam();

    env.initParam(param, 0);
    env.startEnvelope(param, 1);
    env.addSweep(param, 0, 1, 1);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(0.95);
    env.addHold(param, 1);
    env.addHold(param, 1);
    expect(env.getValueAtTime(param, 3)).toBeCloseTo(0.632);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(0.632);

    env.initParam(param, 0);
    env.startEnvelope(param, 1);
    env.addSweep(param, -1, 1, 1);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(0.95);
    env.startEnvelope(param, 2);
    expect(env.getValueAtTime(param, 3)).toBeCloseTo(0.632);
    expect(env.getValueAtTime(param, 4)).toBeCloseTo(0.632);
  });
});
