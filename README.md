## param-enveloper

---

Hey look, finally a sane way to use parameters in Web Audio.

This is a small library for automating changes to an
[AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
(like a signal's gain or frequency).
It lets you schedule any series of ramps, sweeps, and delays, at arbitrary times,
_without_ causing discontinuities (i.e. audible clicks or glitches).

(That may not sound like much, but suffice to say that the
WebAudio API makes it very difficult, and this library makes it very easy.)

[Live demo](http://fenomas.github.io/param-enveloper/)

## Example

```ts
import { Enveloper } from 'param-enveloper';

const env = new Enveloper(myAudioContext);

// initialize a param, with starting value=0 since this is a gain node
const param = masterVolume.gain;
env.initParam(param, 0);

// to play a note, first declare the time it starts:
env.startEnvelope(param, startTime);

// then schedule an AHDSR envelope
env.addRamp(param, A, 1);
env.addHold(param, H);
env.addSweep(param, D, S, 0.2);

// later to release the note, start a new envelope and schedule an exponential ramp to 0
env.startEnvelope(param, releaseTime);
env.addRamp(param, R, 0, true);

// you can also query the scheduled param value at arbitrary times:
console.log(env.getValueAtTime(param, ctx.currentTime + 0.5))
```

The special sauce here is that you can start a new envelope any time
(in response to user input, etc), and the param events you schedule afterwards will
sound fine even if the new envelope starts in the middle of an ongoing ramp/sweep/etc.

## Usage

Install via npm/yarn/bun:

```sh
npm i --save param-enveloper
```

```ts
import { Enveloper } from 'param-enveloper';
var enveloper = new Enveloper(audioCtx);
enveloper.initParam(param, baseValue);
// ...
```

## API

The API is documented in JSDoc comments; consult your local tooltip for details.

```ts
import { Enveloper } from 'param-enveloper';

class Enveloper {
  constructor(ctx: AudioContext);
  initParam(audioParam: AudioParam, initialValue = 0);
  startEnvelope(audioParam: AudioParam, time = 0);
  addHold(audioParam: AudioParam, duration: number);
  addRamp(audioParam: AudioParam, duration: number, target: number, exponential = false);
  addSweep(audioParam: AudioParam, duration: number, target: number, timeConstant: number);
  getValueAtTime(audioParam: AudioParam, time: number);
}
```

## Notes

To hack on this, use the local npm `build` / `start` scripts.

Currently this library doesn't do much heavy error checking -
doing unexpected things (e.g. scheduling events in the past)
might throw errors or have undefined behavior.

---

## By

Made with 🍺 by [andy](https://fenomas.com).
License is ISC.
