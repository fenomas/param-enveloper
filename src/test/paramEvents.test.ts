import { describe, it } from 'node:test'
import { strictEqual, ok } from 'node:assert'

import { ParamEvent, getEventIndexAtTime, getValueDuringEvent } from '../paramEvent'

// convert these eventually
const expect = (a: unknown) => ({
  toBe: (b: unknown) => strictEqual(a, b),
  toBeCloseTo: (b: number) => ok(Math.abs((a as number) - b) < 0.01),
})

//
//
//

describe('getEventIndexAtTime', () => {
  const makeMockEvents = () => [
    new ParamEvent('HOLD', 0, 1, 10, 11),
    new ParamEvent('HOLD', 1, 2, 11, 12),
    new ParamEvent('HOLD', 2, 3, 12, 13),
    new ParamEvent('HOLD', 3, 4, 13, 14),
    new ParamEvent('HOLD', 4, 5, 14, 15),
  ]

  it('should handle empty event lists', () => {
    expect(getEventIndexAtTime([], 0)).toBe(-1)
  })

  it('should otherwise work correctly', () => {
    const events = makeMockEvents()
    // events cover the time span: (t0, t1]
    expect(getEventIndexAtTime(events, 3)).toBe(-1)
    expect(getEventIndexAtTime(events, 10)).toBe(-1)
    expect(getEventIndexAtTime(events, 10.5)).toBe(0)
    expect(getEventIndexAtTime(events, 12)).toBe(1)
    expect(getEventIndexAtTime(events, 12.5)).toBe(2)
    expect(getEventIndexAtTime(events, 12.999)).toBe(2)
    expect(getEventIndexAtTime(events, 13)).toBe(2)
    expect(getEventIndexAtTime(events, 15)).toBe(4)
    expect(getEventIndexAtTime(events, 15.001)).toBe(-1)
    expect(getEventIndexAtTime(events, 20)).toBe(-1)
  })
})

//
//
//

describe('getValueDuringEvent', () => {
  it('should work for HOLD events', () => {
    const ev = new ParamEvent('HOLD', 5, 5, 10, 11)
    expect(getValueDuringEvent(ev, 0)).toBe(5)
    expect(getValueDuringEvent(ev, 10)).toBe(5)
    expect(getValueDuringEvent(ev, 100)).toBe(5)
  })

  it('should work for SWEEP events', () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
    const [v0, tgt, t0, t1, k] = [0, 5, 10, 12, 1]
    const ev = new ParamEvent('SWEEP', v0, v0, t0, t1)
    ev.k = k
    ev.tgt = tgt
    expect(getValueDuringEvent(ev, t0)).toBe(v0)
    expect(getValueDuringEvent(ev, t0 + 0.5 * k)).toBeCloseTo(0.393 * tgt)
    expect(getValueDuringEvent(ev, t0 + 1 * k)).toBeCloseTo(0.632 * tgt)
    expect(getValueDuringEvent(ev, t0 + 3 * k)).toBeCloseTo(0.95 * tgt)
  })

  it('should work for RAMP_LINEAR events', () => {
    const [v0, v1, t0, t1] = [0, 5, 10, 12]
    const ev = new ParamEvent('RAMP_LINEAR', v0, v1, t0, t1)
    expect(getValueDuringEvent(ev, t0)).toBe(v0)
    expect(getValueDuringEvent(ev, t1)).toBe(v1)
    expect(getValueDuringEvent(ev, (t0 + t1) / 2)).toBeCloseTo((v0 + v1) / 2)
  })

  it('should work for RAMP_EXPONENTIAL events', () => {
    const [v0, v1, t0, t1] = [440, 880, 10, 12]
    const ev = new ParamEvent('RAMP_EXPO', v0, v1, t0, t1)
    expect(getValueDuringEvent(ev, t0)).toBe(v0)
    expect(getValueDuringEvent(ev, t1)).toBe(v1)
    expect(getValueDuringEvent(ev, (t0 + t1) / 2)).toBeCloseTo(622.25)
  })
})
