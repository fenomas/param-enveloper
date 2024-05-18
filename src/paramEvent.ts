/**
 *
 *      Management of param events and event lists
 *
 */

type EventType = 'HOLD' | 'SWEEP' | 'RAMP_LINEAR' | 'RAMP_EXPO';

export class ParamEvent {
  type: EventType;
  v0: number;
  v1: number;
  t0: number;
  t1: number;
  k: number;
  tgt: number;

  constructor(type: EventType, v0: number, v1: number, t0: number, t1: number) {
    this.type = type;
    this.v0 = +v0;
    this.v1 = +v1;
    this.t0 = +t0;
    this.t1 = +t1;
    this.k = 0.1;
    this.tgt = 0.1;
  }

  toString() {
    return `ParamEvent(${this.type}, t:${this.t0}~${this.t1} v:${this.v0}~${this.v1})`;
  }
}

/**
 * Get index of event that given time occurs during.
 * Assumes that events cover the span (t0, t1].
 */
export function getEventIndexAtTime(events: ParamEvent[], time: number) {
  if (events.length === 0) return -1;
  if (time <= events[0].t0) return -1;
  return events.findIndex((ev) => time <= ev.t1);
}

/**
 * Interpolate value mid-way through an event.
 */
export function getValueDuringEvent(ev: ParamEvent, time: number) {
  const dt = time - ev.t0;
  switch (ev.type) {
    case 'HOLD':
      return ev.v0;
    case 'SWEEP':
      return calculateSweepValue(dt, ev.v0, ev.tgt, ev.k);
    case 'RAMP_LINEAR':
      return calculateLinearRampValue(dt, ev.v0, ev.v1, ev.t1 - ev.t0);
    case 'RAMP_EXPO':
      return calculateExpoRampValue(dt, ev.v0, ev.v1, ev.t1 - ev.t0);
  }
}

/**
 *
 *          util
 *
 */

function calculateSweepValue(dt = 0.1, v0 = 0, v1 = 1, timeConst = 0.1) {
  return v1 + (v0 - v1) * Math.exp(-dt / timeConst);
}

function calculateLinearRampValue(dt = 0.1, v0 = 0, v1 = 0, duration = 1) {
  return v0 + ((v1 - v0) * dt) / duration;
}

function calculateExpoRampValue(dt = 0.1, v0 = 0, v1 = 0, duration = 1) {
  return v0 * Math.pow(v1 / v0, dt / duration);
}
