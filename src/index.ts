import { ParamEvent, getEventIndexAtTime, getValueDuringEvent } from './paramEvent';

/** An AudioParam decorated with an event queue */
type DecoratedParam = AudioParam & {
  __paramEnveloperEvents: ParamEvent[];
};

function maybeInitParam(param: AudioParam | DecoratedParam) {
  if ((param as DecoratedParam).__paramEnveloperEvents) return param as DecoratedParam;

  param.cancelScheduledValues(0);
  (param as DecoratedParam).__paramEnveloperEvents = [
    new ParamEvent('HOLD', param.value, param.value, 0, 0),
  ];
  return param as DecoratedParam;
}

/*
 *
 *
 *
 *          PARAM-ENVELOPER
 *
 *  Notes:
 *
 *  - works by storing an array of event data objects on the param object
 *  - conformance: event array should never be empty, except during updates
 *  - each event's end time (t1) is what WebAudio cares about
 *    - so: events cover the time span: (t0, t1]
 *  - webaudio doesn't like two events at the same time
 *    - except: setValueAtTime SHOULD coincide with end of previous event
 *
 */

/**
 * A utility class for scheduling envelopes on AudioParams.
 * @param ctx - the AudioContext your AudioParams belong to
 */
export class Enveloper {
  ctx: AudioContext | OfflineAudioContext;
  zeroRampTarget: number;

  constructor(ctx: AudioContext | OfflineAudioContext) {
    this.ctx = ctx;
    this.zeroRampTarget = 0.001;
  }

  /**
   * Initialize an AudioParam. This will remove any existing events. This is optional;
   * if you skip it then any envelopes will start from the param's current value.
   *
   * @param initialValue - the value the param should have before any envelopes start
   */
  initParam(audioParam: AudioParam, initialValue = 0) {
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;

    param.cancelScheduledValues(0);
    events.length = 0;
    param.setValueAtTime(initialValue, 0);
    events.push(new ParamEvent('HOLD', initialValue, initialValue, 0, 0));
  }

  /**
   * Starts a new envelope at the given time.
   * This will interrupt any ongoing envelope, and cancel its future events.
   */
  startEnvelope(audioParam: AudioParam, time = 0) {
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;
    
    const last = events.at(-1);
    const now = this.ctx.currentTime;
    const env_t0 = Math.max(time, now);
    if (!last) return warnAboutInternalError();

    // bookkeeping: prune any unneeded event data in the past
    if (now >= last.t1) {
      events.length = 0;
    } else {
      const nowIx = getEventIndexAtTime(events, now);
      if (nowIx > 0) events.splice(0, nowIx);
    }

    // if pruned event list is empty, just hold until envelope starts
    if (events.length === 0) {
      events.push(new ParamEvent('HOLD', last.v1, last.v1, 0, env_t0));
      param.setValueAtTime(last.v1, env_t0);
      debug('start:  fresh envelope, value', last.v1, ' from time', env_t0);
      return;
    }

    // if envelope starts after the last scheduled event, also hold until then
    const currIx = getEventIndexAtTime(events, env_t0);
    if (currIx < 0) {
      events.push(new ParamEvent('HOLD', last.v1, last.v1, 0, env_t0));
      param.setValueAtTime(last.v1, env_t0);
      debug('start:  envelope begins: value', last.v1, 'from time', env_t0);
      return;
    }

    // remaining case: envelope starts during a scheduled event, so prune later data
    const curr = events[currIx] as ParamEvent;
    events.length = currIx + 1;

    // if curr event ends right as envelope starts, leave its end event and schedule nothing
    if (curr.t1 === env_t0) {
      param.cancelScheduledValues(env_t0 + 0.0001);
      debug('start:  envelope begins: value', last.v1, 'from time', env_t0);
      return;
    }

    // otherwise: edit current event to end at envelope's starting time
    const env_v0 = getValueDuringEvent(curr, env_t0);
    curr.t1 = env_t0;
    curr.v1 = env_v0;

    // and finally, cancel later events and reschedule ending of current one
    param.cancelScheduledValues(env_t0);
    debug('start:  envelope begins: value', curr.v1, 'from time', env_t0);
    if (curr.type === 'HOLD') {
      param.setValueAtTime(env_v0, env_t0);
      debug('--set value', env_v0, 'time', env_t0);
    } else if (curr.type === 'RAMP_LINEAR') {
      param.linearRampToValueAtTime(env_v0, env_t0);
      debug('--ramp to', env_v0, 'time', env_t0);
    } else if (curr.type === 'RAMP_EXPO') {
      const rampV0 = env_v0 || this.zeroRampTarget;
      param.exponentialRampToValueAtTime(rampV0, env_t0);
      debug('--exp ramp to', rampV0, 'time', env_t0);
    } else if (curr.type === 'SWEEP') {
      param.setValueAtTime(env_v0, env_t0);
      debug('--set value', env_v0, 'time', env_t0);
    }
  }

  /**
   * Add a delay to the envelope, holding the current value for some duration.
   */
  addHold(audioParam: AudioParam, duration: number) {
    if (!(duration > 0)) return warnAboutDuration(duration);
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;
    const last = events[events.length - 1];
    if (!last) return warnAboutInternalError();

    if (last.t1 === Infinity) {
      // unlike other events, treat a hold after an infinite sweep as starting a new envelope
      const breakTime = last.t0 + duration;
      debug('hold:   during sweep, start new envelope from time:', breakTime);
      this.startEnvelope(param, breakTime);
      return;
    }

    const v0 = last.v1;
    const t0 = last.t1;
    const v1 = v0;
    const t1 = t0 + duration;
    events.push(new ParamEvent('HOLD', v0, v1, t0, t0 + duration));
    param.setValueAtTime(v1, t1);
    debug('hold:   val', v1, 'until time', t1);
  }

  /**
   * Add a linear or exponential ramp up to a target value.
   */
  addRamp(audioParam: AudioParam, duration: number, target: number, exponential = false) {
    if (!(duration > 0)) return warnAboutDuration(duration);
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;
    const last = events[events.length - 1];
    if (!last) return warnAboutInternalError();
    if (last.t1 === Infinity) return warnAboutIgnoredEvent();

    const t0 = last.t1;
    const t1 = t0 + duration;
    let v0 = last.v1;
    let v1 = target;
    if (exponential) {
      if (v0 === 0) v0 = this.zeroRampTarget;
      if (v1 === 0) v1 = this.zeroRampTarget;
      param.exponentialRampToValueAtTime(v1, t1);
    } else {
      param.linearRampToValueAtTime(v1, t1);
    }
    const type = exponential ? 'RAMP_EXPO' : 'RAMP_LINEAR';
    events.push(new ParamEvent(type, v0, v1, t0, t1));
    debug('ramp:   to val', v1, 'time', t1, exponential ? 'exp' : 'linear');
  }

  /**
   * Adds an exponential sweep towards a target.
   *  - When duration > 0, approaches target (but will reach some value shy of it)
   *  - Otherwise: schedules an infinite sweep towards target.
   * Note: an infinite sweep ends the envelope, and no more ramps/sweeps can be
   * scheduled after it. For subsequent param changes, start a new envelope.
   */
  addSweep(audioParam: AudioParam, duration: number, target: number, timeConstant: number) {
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;
    const last = events[events.length - 1];
    if (!last) return warnAboutInternalError();
    if (last.t1 === Infinity) return warnAboutIgnoredEvent();

    // audioparam event:
    const t0 = last.t1;
    const v0 = last.v1;
    param.setTargetAtTime(target, t0, timeConstant);

    // for envelope event, if finite duration then calculate end value
    const ev = new ParamEvent('SWEEP', v0, target, t0, Infinity);
    ev.k = timeConstant;
    ev.tgt = target;
    if (duration > 0 && isFinite(duration)) {
      ev.t1 = t0 + duration;
      ev.v1 = getValueDuringEvent(ev, ev.t1);
    }
    events.push(ev);
    debug(`sweep: to tgt ${target} const ${timeConstant} from t ${t0} to ${ev.t1}`);
  }

  /**
   * Interpolate out the planned param value at the given time.
   * This is useful if e.g. you want to schedule an attack ramp whose duration
   * depends on the starting value of the param.
   */
  getValueAtTime(audioParam: AudioParam, time: number) {
    const param = maybeInitParam(audioParam);
    const events = param.__paramEnveloperEvents;
    const ix = getEventIndexAtTime(events, time);
    if (ix < 0) {
      if (events[0] && time <= events[0].t0) return events[0].v0;
      return (events.at(-1) as ParamEvent).v1;
    }
    if (events[ix]) return getValueDuringEvent(events[ix], time);
    warnAboutInternalError();
    return 0;
  }
}

// helpers
function warnAboutIgnoredEvent() {
  console.warn('ParamEnveloper: ignoring event scheduled after an infinite sweep');
}
function warnAboutDuration(dur: number) {
  console.warn('ParamEnveloper: ignoring event invalid duration', dur);
}
function warnAboutInternalError() {
  console.warn('ParamEnveloper: internal error! Event queue was empty');
}

// debuggin'
const DEBUG = false;
const debug = DEBUG
  ? function (...args: (string | number)[]) {
      console.log(
        ...args.map((v: string | number) => {
          return typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
        }),
      );
    }
  : // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {};
