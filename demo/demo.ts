import { Enveloper } from '../src/'
import { testEnvelopes } from './testEnvelopes'

/*
 *
 *
 *      document setup before user input
 *
 *
 */

globalThis?.document?.addEventListener('DOMContentLoaded', () => {
  // page elements
  document.body.style.padding = '1rem'
  document.body.style.font = '17px sans-serif'
  const p = document.createElement('p')
  p.innerHTML = 'Press/release spacebar to start/end an envelope'
  const c = document.createElement('canvas')
  c.width = 800
  c.height = 260
  c.style.backgroundColor = 'black'
  document.body.appendChild(p)
  document.body.appendChild(c)
  document.addEventListener('keydown', initAudio)
  document.addEventListener('click', initAudio)

  // buttons that apply test envelopes
  const div = document.createElement('div')
  div.style.margin = '20px 50px'
  document.body.appendChild(div)
  div.innerHTML = 'ad-hoc test cases'

  testEnvelopes.forEach(({ name, fn }) => {
    const b = document.createElement('button')
    b.style.margin = '10px'
    b.style.padding = '10px'
    b.innerText = '' + name
    b.onclick = () => {
      onUserInput()
      if (audio) fn(audio.enveloper, audio.param, audio.ctx.currentTime + 0.1)
    }
    div.appendChild(b)
  })
})

/*
 *
 *
 *      audio setup - runs on user input event
 *
 *
 */

let audio: {
  ctx: AudioContext
  enveloper: Enveloper
  param: AudioParam
} | null = null

function onUserInput() {
  if (audio) return
  initAudio()
}

function initAudio() {
  document.removeEventListener('keydown', initAudio)
  document.removeEventListener('click', initAudio)

  //
  // CORE AUDIO SETUP
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const master = ctx.createGain()
  const analyzer = ctx.createAnalyser()

  osc.start()
  osc.connect(gain)
  gain.connect(master)
  master.connect(ctx.destination)
  gain.connect(analyzer)
  master.gain.setValueAtTime(0.5, 0)

  const enveloper = new Enveloper(ctx)
  const param = gain.gain
  enveloper.initParam(param, 0)
  enveloper.startEnvelope(param, 0)
  enveloper.addRamp(param, 0.04, 0.5)
  enveloper.addSweep(param, 0.5, 0, 0.5)

  audio = { ctx, enveloper, param }

  //
  // ANALYZER SETUP
  const canvas = document.querySelector('canvas') as HTMLCanvasElement
  const drawCtx = canvas.getContext('2d') as CanvasRenderingContext2D
  drawCtx.fillStyle = '#000'
  drawCtx.fillRect(0, 0, canvas.width, canvas.height)
  const data = new Float32Array(256)
  let x = 2

  const drawLoop = () => {
    requestAnimationFrame(drawLoop)
    analyzer.getFloatTimeDomainData(data)
    const w = 1
    const max = data.reduce((v, acc) => Math.max(v, acc), 0) * 256
    drawCtx.fillStyle = '#000'
    drawCtx.fillRect(x, 0, w, canvas.height)
    drawCtx.fillStyle = '#FFF'
    drawCtx.fillRect(x, canvas.height - max, w, max)
    x = (x + w) % canvas.width
  }
  drawLoop()

  //
  // trigger sound on spacebar, get analyzerNode and draw the envelope
  let isDown = false
  const playSound = () => {
    if (isDown) return
    isDown = true
    testEnvelopes.at(-2)?.fn(enveloper, param, ctx.currentTime + 0.01)
  }
  const stopSound = () => {
    isDown = false
    testEnvelopes.at(-1)?.fn(enveloper, param, ctx.currentTime + 0.01)
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== ' ') return
    ev.preventDefault()
    playSound()
  })
  document.addEventListener('keyup', (ev) => {
    if (ev.key !== ' ') return
    stopSound()
  })
}
