import { Enveloper } from '../src/'

type TestFn = (env: Enveloper, param: AudioParam, t: number) => void

export const testEnvelopes: { name: string; fn: TestFn }[] = []

const addTest = (name: string, fn: TestFn) => {
  testEnvelopes.push({ name, fn })
}

addTest('break', (env, param, t) => {
  env.startEnvelope(param, t)
})

addTest('sweep', (env, param, t) => {
  env.startEnvelope(param, t)
  env.addRamp(param, 0.5, 0.9)
  env.addSweep(param, -1, 0, 0.4)
})

addTest('ramps', (env, param, t) => {
  env.startEnvelope(param, t)
  for (let i = 0; i < 20; i++) {
    env.addRamp(param, 0.1, i % 2 ? 0.3 : 0.7)
  }
})

addTest('adsr', (env, param, t) => {
  env.startEnvelope(param, t)
  env.addRamp(param, 0.15, 1)
  env.addHold(param, 0.05)
  env.addRamp(param, 0.3, 0.5, true)
})

addTest('release', (env, param, t) => {
  env.startEnvelope(param, t)
  env.addSweep(param, -1, 0, 0.2)
})
