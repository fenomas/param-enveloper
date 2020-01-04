

export default class Enveloper {

    constructor(ctx) {
        this.ctx = ctx
        this.zeroRampTarget = 0.01
    }


    // one-time setup, will remove any existing envelope events
    initParam(param, baseValue) {
        var time = this.ctx.currentTime
        param.cancelScheduledValues(0)
        param.setValueAtTime(baseValue, 0)
        if (time > 0) param.setValueAtTime(baseValue, time)
        param.__paramEnveloperEvents = [
            new Event(HOLD, baseValue, baseValue, 0, time)
        ]
    }


    // starts a new envelope, canceling any subsequent events
    // existing event for that time will be edited to end early
    startEnvelope(param, time) {
        preprocessEvents(param, this.ctx.currentTime)
        time = Math.max(time, this.ctx.currentTime)
        extendEventsToTime(param, time)
        var events = param.__paramEnveloperEvents
        var curr = getEventActiveAtTime(events, time)
        // clear all events after curr
        events.length = events.indexOf(curr) + 1
        // modify curr event and fix param schedule
        if (time > 0) param.cancelScheduledValues(time)
        var val = getValueDuringEvent(curr, time)
        curr.t1 = time
        curr.v1 = val
        if (curr.type === HOLD) {
            // no schedule changes needed
        } else if (curr.type === RAMP_LINEAR) {
            param.linearRampToValueAtTime(val, time)
        } else if (curr.type === RAMP_EXPO) {
            param.exponentialRampToValueAtTime(val, time)
        } else if (curr.type === SWEEP) {
            // no schedule changes needed
        }

    }


    // adds a delay to the envelope, holding the previous value
    addHold(param, duration) {
        preprocessEvents(param, this.ctx.currentTime)
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        var v0 = last.v1
        var t0 = last.t1
        var v1 = v0
        var t1 = t0 + duration
        events.push(new Event(HOLD, v0, v1, t0, t1))
        param.setValueAtTime(v0, t1)
    }


    // adds a ramp up to the specified target
    addRamp(param, duration, target, exponential) {
        preprocessEvents(param, this.ctx.currentTime)
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        var v0 = last.v1
        var t0 = last.t1
        var v1 = target
        var t1 = t0 + duration
        if (exponential) {
            if (v1 === 0) v1 = this.zeroRampTarget
            param.exponentialRampToValueAtTime(v1, t1)
        } else {
            param.linearRampToValueAtTime(v1, t1)
        }
        var type = exponential ? RAMP_EXPO : RAMP_LINEAR
        events.push(new Event(type, v0, v1, t0, t1))
    }


    // adds an exponential sweep towards a target
    // for duration > 0, approaches (but will not reach) the target
    // otherwise, extends the envelope forever, approaching the target
    addSweep(param, duration, target, timeConstant) {
        preprocessEvents(param, this.ctx.currentTime)
        var events = param.__paramEnveloperEvents
        var last = events[events.length - 1]
        var v0 = last.v1
        var t0 = last.t1
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
    }


    // figure out the planned param value at the given time
    getValueAtTime(param, time) {
        preprocessEvents(param, this.ctx.currentTime)
        var events = param.__paramEnveloperEvents
        var ev = getEventActiveAtTime(events, time)
        if (time > ev.t1) return ev.v1
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


function preprocessEvents(param, currentTime) {
    var events = param.__paramEnveloperEvents
    var last = events[events.length - 1]
    // events that end before currentTime can no longer affect param
    var prunable = -1
    events.some((ev, i) => {
        if (ev.t1 <= currentTime) return true
        prunable = i
    })
    if (prunable >= 0) events.splice(0, prunable + 1)
    // if queue is now empty, extend it to currentTime
    if (events.length === 0) {
        var val = last.v1
        param.setValueAtTime(val, currentTime)
        events.push(new Event(HOLD, val, val, 0, currentTime))
    }
}

function extendEventsToTime(param, t) {
    // if event queue ends before t, extend it
    var events = param.__paramEnveloperEvents
    var last = events[events.length - 1]
    if (t <= last.t1) return
    var val = last.v1
    param.setValueAtTime(val, t)
    events.push(new Event(HOLD, val, val, last.t1, t))
}

function getEventActiveAtTime(events, t) {
    var result = null
    events.some(ev => {
        result = ev
        if (t < ev.t1) return true
    })
    if (!result) throw 'Internal problem, time not within event list'
    return result
}

function getValueDuringEvent(ev, time) {
    if (ev.type === HOLD) return ev.v0
    var dt = time - ev.t0
    if (ev.type === RAMP_LINEAR) {
        return calculateLinearRampValue(dt, ev.v0, ev.v1, ev.t0, ev.t1)
    }
    if (ev.type === RAMP_EXPO) {
        return calculateExpoRampValue(dt, ev.v0, ev.v1, ev.t0, ev.t1)
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

function calculateLinearRampValue(dt, v0, v1, t0, t1) {
    return v0 + (v1 - v0) * dt / (t1 - t0)
}

function calculateExpoRampValue(dt, v0, v1, t0, t1) {
    return v0 * Math.pow(v1 / v0, dt / (t1 - t0))
}

