## param-enveloper

----

Finally, a sane way to do complex envelopes in Web Audio.

This is a small library for automating changes to a Web Audio 
[AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
object. It lets you schedule any series of ramps, sweeps, and delays,
and then later cancel at any arbitrary time and schedule new changes, 
*without* causing discontinuities (i.e. audible clicks).

(That may not sound like much, but suffice to say that the standard 
WebAudio API makes it very difficult, and this library makes it very easy.)

[Live demo](http://andyhall.github.io/param-enveloper/)

## Example

```js
var A=0.1, H=0.01, S=0.5, D=0.2, R=0.5  // or whatever
var param = masterVolumeNode.gain

// play a note by making an ADHSR envelope...
enveloper.startEnvelope(param, startTime)
enveloper.addRamp(param, A, 1)
enveloper.addHold(param, H)
enveloper.addSweep(param, -1, S, D)

// later, when the note release is triggered..
enveloper.startEnvelope(param, releaseTime)
enveloper.addRamp(param, R, 0, true)
```

The second call to `startEnvelope` calculates what value the param is 
scheduled to have at `releaseTime` and edits the current envelope so as to 
end cleanly at that value. Thus the subsequent release ramp runs without discontinuities, even if the release happened during the attack ramp or whatever.


## Usage

Install via npm:

```sh
npm i --save param-enveloper
```

```js
import Enveloper from 'param-enveloper'
var enveloper = new Enveloper(audioCtx)
enveloper.initParam(param, baseValue)
// ...
```

## API

 * `var env = new Enveloper(ctx)`  
   Constructor takes an `AudioContext` reference.

 * `env.initParam(param, baseValue)`  
   Any param to be automated should be initted once. `baseValue` is the value the param will initially transition from.

 * `env.startEnvelope(param, time)`  
   Start a new envelope from `time`, canceling any subsequent changes. 
   If an envelope was already scheduled, it will be edited to end at whatever 
   value it would have had at the specified time.

 * `env.addHold(param, duration)`  
   Hold the current value for the given duration.

 * `env.addRamp(param, duration, target, isExponential)`  
   Ramp from the current value to a new target. By default ramps are linear; set the final argument to true for an exponential ramp.

 * `env.addSweep(param, duration, target, timeConst)`  
   Adds a sweep towards the given target value. Remember that sweeps approach the specified target value, but never completely reach it.  
   If `duration` is a positive number, the sweep will last for the specified time and then end. Otherwise, the sweep will continue forever or until a new envelope is started (with `startEnvelope`).

 * `env.getValueAtTime(param, time)`  
   Queries what value the param is scheduled to have at a given time. Useful for 
   e.g. making an attack ramp whose duration depends on the value started from.


## Notes

To hack on this, use the local npm `build` / `start` scripts. 
If you don't have webpack installed globally, you'll need to do 
`npm i -D webpack webpack-cli webpack-dev-server` or similar.

Currently this lib doesn't do any heavy error checking - 
doing unexpected things (e.g. starting an envelope in the past before `audioCtx.currentTime`) may throw errors or have undefined behavior.

----

## By

Made with 🍺 by [Andy Hall](https://twitter.com/fenomas). 
License is ISC.
