

// page elements
var p = document.createElement('p')
p.innerHTML = 'Press/release spacebar to start/end an envelope'
var c = document.createElement('canvas')
c.width = 1000
c.height = 260
c.style.backgroundColor = 'black'
p.style.margin = c.style.margin = '20px'
document.body.appendChild(p)
document.body.appendChild(c)




// trigger sound on spacebar, get analyzerNode and draw the envelope
document.addEventListener('keydown', ev => {
    if (ev.key !== ' ') return
    ev.preventDefault()
    playSound()
})
document.addEventListener('keyup', ev => {
    if (ev.key !== ' ') return
    stopSound()
})
var output
function drawLoop() {
    requestAnimationFrame(drawLoop)
    if (!audio) return
    if (!output) initOutput()
    audio.analyzer.getFloatTimeDomainData(output.data)
    var x = output.x
    var w = 2
    var max = output.data.reduce((v, acc) => Math.max(v, acc), 0) * 256
    output.drawCtx.fillStyle = '#000'
    output.drawCtx.fillRect(x, 0, w, c.height)
    output.drawCtx.fillStyle = '#FFF'
    output.drawCtx.fillRect(x, c.height - max, w, max)
    output.x = (x + w) % c.width
}
function initOutput() {
    var drawCtx = c.getContext('2d')
    drawCtx.fillStyle = '#000'
    drawCtx.fillRect(0, 0, c.width, c.height)
    var data = new Float32Array(256)
    output = { drawCtx, data, x: 2 }
}
drawLoop()







// audio code from here on
import Enveloper from '..'
var audio
var isDown = false
function playSound() {
    if (isDown) return
    isDown = true
    if (!audio) initAudio()
    var t = audio.ctx.currentTime + 0
    var env = audio.enveloper
    var param = audio.param
    env.startEnvelope(param, t)
    env.addRamp(param, 0.5, 1, false)
    env.addHold(param, 0.5)
    env.addRamp(param, 0.5, 0.5, true)
    env.addSweep(param, 0, 0.2, 2)
}
function stopSound() {
    isDown = false
    if (!audio) initAudio()
    var t = audio.ctx.currentTime + 0
    var env = audio.enveloper
    var param = audio.param
    env.startEnvelope(param, t)
    env.addSweep(param, 0, 0, 1)
}


function initAudio() {
    var ctx = new AudioContext()
    var osc = ctx.createOscillator()
    osc.start()
    var gain = ctx.createGain()
    var analyzer = ctx.createAnalyser()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.connect(analyzer)
    var param = gain.gain
    var enveloper = new Enveloper(ctx)
    enveloper.initParam(param, 0)
    audio = { ctx, enveloper, param, analyzer }
    sanityCheck(enveloper, ctx.createGain().gain)
}








// run some baseline tests
// note this only checks the internals, not the actual param behavior
function sanityCheck(env, param) {
    var assert = (a, b) => { if (Math.abs(a - b) > 0.01) throw '?' }
    env.initParam(param, 0)
    env.startEnvelope(param, 1)
    env.addHold(param, 1)
    env.addRamp(param, 1, 1)
    assert(0, env.getValueAtTime(param, 0))
    assert(0, env.getValueAtTime(param, 1))
    assert(0, env.getValueAtTime(param, 2))
    assert(0.5, env.getValueAtTime(param, 2.5))
    assert(1, env.getValueAtTime(param, 3))
    assert(1, env.getValueAtTime(param, 4))
    env.startEnvelope(param, 2.5)
    env.addHold(param, 1)
    env.addRamp(param, 0.5, 1)
    assert(0.25, env.getValueAtTime(param, 2.25))
    assert(0.5, env.getValueAtTime(param, 2.5))
    assert(0.5, env.getValueAtTime(param, 3.5))
    assert(0.75, env.getValueAtTime(param, 3.75))
    assert(1, env.getValueAtTime(param, 4))
    assert(1, env.getValueAtTime(param, 5))
}
