
var DEBUG = 0



/*
 * 
 *      notes:
 *  works by storing an array of event data objects on the param
 *  note that each event's end time (t1) is what WebAudio cares about,
 *      so: events cover the time span: (t0, t1]
 *  also note webaudio doesn't like two events at the same time 
 *      (except: setValueAtTime SHOULD coincide with end of previous event)
 * 
*/



export default class Enveloper {

    constructor(ctx) {
        this.ctx = ctx
        this.zeroRampTarget = 0.001
    }


    // one-time setup, will remove any existing envelope events
    initParam(param, baseValue) {
        param.cancelScheduledValues(0)
        // tack internal data onto param object
        param.__paramEnveloperEvents = [
            new Event(HOLD, baseValue, baseValue, 0, 0),
        ]
        param.setValueAtTime(baseValue, 0)
        debug('init:  param base set to', baseValue, 'time 0')
    }



    // starts a new envelope, canceling any subsequent events
    // existing event for that time will be edited to end early
    startEnvelope(param, time) {
        var now = this.ctx.currentTime
        if (!(time > now)) time = now
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        // prune events too old to affect the parameter
        pruneEventsBefore(events, now)
        // if nothing remains, or if envelope starts after 
        // last known event, just add a hold and exit
        if (events.length === 0 || time > last.t1) {
            var lastVal = last.v1
            events.push(new Event(HOLD, lastVal, lastVal, 0, time))
            param.setValueAtTime(lastVal, time)
            debug('start:  fresh envelope, value', lastVal, ' from time', time)
            return
        }
        // otherwise: envelope starts during an existing event
        var curr = getEventActiveAtTime(events, time)
        if (!curr) throw 'event list conformance bug, should not happen!'
        // prune any event data after curr
        events.length = events.indexOf(curr) + 1
        // if env start coincides with curr end, then no new events to schedule
        // cancel AFTER t1, so that its end event sticks around
        if (time === curr.t1) {
            param.cancelScheduledValues(time + 0.0001)
            debug('start:  envelope begins: value', last.v1, 'from time', time)
            return
        }
        // otherwise cancel from time exactly
        param.cancelScheduledValues(time)
        // edit curr's to end at correct time and value
        var val = getValueDuringEvent(curr, time)
        curr.v1 = val
        curr.t1 = time
        // and finally, reschedule its end event
        debug('start:  envelope begins: value', val, 'from time', time)
        if (curr.type === HOLD) {
            param.setValueAtTime(val, time)
            debug('--set value', val, 'time', time)
        } else if (curr.type === RAMP_LINEAR) {
            param.linearRampToValueAtTime(val, time)
            debug('--ramp to', val, 'time', time)
        } else if (curr.type === RAMP_EXPO) {
            val = val || this.zeroRampTarget
            param.exponentialRampToValueAtTime(val, time)
            debug('--exp ramp to', val, 'time', time)
        } else if (curr.type === SWEEP) {
            param.setValueAtTime(val, time)
            debug('--set value', val, 'time', time)
        }
    }


    // adds a delay to the envelope, holding the previous value
    addHold(param, duration) {
        if (!(duration > 0)) return
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        if (last.t1 === Infinity) {
            // hold after an open sweep is a special case, treat it like a new envelope
            var breakTime = last.t0 + duration
            debug('hold:   during sweep, start new envelope from time:', breakTime)
            this.startEnvelope(param, breakTime)
        } else {
            var v0 = last.v1
            var t0 = last.t1
            var v1 = v0
            var t1 = t0 + duration
            events.push(new Event(HOLD, v0, v1, t0, t1))
            param.setValueAtTime(v1, t1)
            debug('hold:   val', v1, 'until time', t1)
        }
    }


    // adds a ramp up to the specified target
    addRamp(param, duration, target, exponential) {
        // web audio API doesn't like coincident events
        var minDur = 0.0001
        if (!(duration > minDur)) duration = minDur
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        var v0 = last.v1
        var t0 = last.t1
        if (last.t1 === Infinity) throw 'Error - change scheduled after a sweep with infinite duration'
        var v1 = target
        var t1 = t0 + duration
        if (exponential) {
            v0 = v0 || this.zeroRampTarget
            v1 = v1 || this.zeroRampTarget
            param.exponentialRampToValueAtTime(v1, t1)
        } else {
            param.linearRampToValueAtTime(v1, t1)
        }
        var type = exponential ? RAMP_EXPO : RAMP_LINEAR
        events.push(new Event(type, v0, v1, t0, t1))
        debug('ramp:  to val', v1, 'time', t1, exponential ? 'exp' : 'linear')
    }



    // adds an exponential sweep towards a target
    // for duration > 0, approaches (but will not reach) the target
    // otherwise, extends the envelope forever, approaching the target
    addSweep(param, duration, target, timeConstant) {
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        var v0 = last.v1
        var t0 = last.t1
        if (last.t1 === Infinity) throw 'Error - change scheduled after a sweep with infinite duration'
        param.setTargetAtTime(target, t0, timeConstant)
        var t1, v1
        if (duration > 0) {
            t1 = t0 + duration
            v1 = calculateSweepValue(duration, v0, target, timeConstant)
        } else {
            t1 = Infinity
            v1 = target
        }
        var ev = new Event(SWEEP, v0, v1, t0, t1)
        ev.k = timeConstant
        ev.tgt = target
        events.push(ev)
        debug('sweep: to target', target, 'const', timeConstant, 'from time', t0, 'to', t1)
    }


    // figure out the planned param value at the given time
    getValueAtTime(param, time) {
        var events = param.__paramEnveloperEvents
        var ev = getEventActiveAtTime(events, time)
        if (!ev) return events[events.length - 1].v1
        return getValueDuringEvent(ev, time)
    }


}






/*
 * 
 *          Event list management
 * 
*/

// event type enums
var HOLD = 1
var SWEEP = 2
var RAMP_LINEAR = 3
var RAMP_EXPO = 4

function Event(type, v0, v1, t0, t1) {
    this.type = type
    this.v0 = +v0
    this.v1 = +v1
    this.t0 = +t0
    this.t1 = +t1
    this.k = 0.1
    this.tgt = 0.1
}


function pruneEventsBefore(events, time) {
    // prune events that END BEFORE specified time
    while (events.length > 0 && events[0].t1 < time) {
        events.shift()
    }
}

function getEventActiveAtTime(events, t) {
    for (var i = 0; i < events.length; i++) {
        if (t > events[i].t1) continue
        return events[i]
    }
    return null
}

function getValueDuringEvent(ev, time) {
    if (ev.type === HOLD) return ev.v0
    var dt = time - ev.t0
    if (ev.type === RAMP_LINEAR) {
        return calculateLinearRampValue(dt, ev.v0, ev.v1, ev.t1 - ev.t0)
    }
    if (ev.type === RAMP_EXPO) {
        return calculateExpoRampValue(dt, ev.v0, ev.v1, ev.t1 - ev.t0)
    }
    if (ev.type === SWEEP) {
        return calculateSweepValue(dt, ev.v0, ev.tgt, ev.k)
    }
}







/*
 * 
 *          util
 * 
*/

function calculateSweepValue(dt, v0, v1, timeConst) {
    return v1 + (v0 - v1) * Math.exp(-dt / timeConst)
}

function calculateLinearRampValue(dt, v0, v1, duration) {
    return v0 + (v1 - v0) * dt / duration
}

function calculateExpoRampValue(dt, v0, v1, duration) {
    return v0 * Math.pow(v1 / v0, dt / duration)
}






// debuggin'
var debug = (DEBUG) ? function () {
    console.log.apply(console, Array.prototype.slice.apply(arguments).map(v => {
        return (typeof v === 'number') ? Math.round(v * 10000) / 10000 : v
    }))
} : () => { }
