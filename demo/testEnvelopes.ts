import { Enveloper } from '..';

type TestFn = (env: Enveloper, param: AudioParam, t: number) => void;

export const testEnvelopes: { name: string; fn: TestFn }[] = [];

const addTest = (name: string, fn: TestFn) => {
  testEnvelopes.push({ name, fn });
};

addTest('break', (env, param, t) => {
  env.startEnvelope(param, t);
});

addTest('sweep', (env, param, t) => {
  env.startEnvelope(param, t);
  env.addRamp(param, 0.5, 0.9);
  env.addSweep(param, -1, 0, 0.4);
});

addTest('ramps', (env, param, t) => {
  env.startEnvelope(param, t);
  for (let i = 0; i < 20; i++) {
    env.addRamp(param, 0.1, i % 2 ? 0.3 : 0.7);
  }
});

function adsr(env: Enveloper, param: AudioParam, a = 0, h = 0, d = 0, r = 0) {
  env.addRamp(param, a, 1);
  env.addHold(param, h);
  env.addRamp(param, d, 0.8, true);
  env.addSweep(param, -1, 0, r);
}

addTest('adsr', (env, param, t) => {
  env.startEnvelope(param, t);
  adsr(env, param, 0.1, 0.1, 0.4, 0.5);
});

addTest('release', (env, param, t) => {
  env.startEnvelope(param, t);
  env.addSweep(param, -1, 0, 0.2);
});
