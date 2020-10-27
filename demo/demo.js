

// page elements
var p = document.createElement('p')
p.innerHTML = 'Press/release spacebar to start/end an envelope'
var c = document.createElement('canvas')
c.width = 1000
c.height = 260
c.style.backgroundColor = 'black'
p.style.margin = c.style.margin = '20px 50px'
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
    env.addSweep(param, 0, 0, 0.4)
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
    sanityChecks.forEach(fn => fn(enveloper, ctx.createGain().gain))
}








// run some baseline tests
// note these only check library internals, not the actual param behavior
var sanityChecks = []
var assert = (a, b) => { if (Math.abs(a - b) > 0.01) throw '?' }
sanityChecks.push((env, param) => {
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
})
sanityChecks.push((env, param) => {
    env.initParam(param, 0)
    env.startEnvelope(param, 1)
    env.addSweep(param, 0, 1, 1)
    assert(0.950, env.getValueAtTime(param, 4))
    env.addHold(param, 1)
    env.addHold(param, 1)
    assert(0.632, env.getValueAtTime(param, 3))
    assert(0.632, env.getValueAtTime(param, 4))
})
sanityChecks.push((env, param) => {
    env.initParam(param, 0)
    env.startEnvelope(param, 1)
    env.addRamp(param, 1, 1)
    env.startEnvelope(param, 10)
    env.addRamp(param, 1, 0)
    assert(0, env.getValueAtTime(param, 1))
    assert(1, env.getValueAtTime(param, 2))
    assert(1, env.getValueAtTime(param, 5))
    assert(1, env.getValueAtTime(param, 10))
    assert(0, env.getValueAtTime(param, 11))
})






// add some test cases

// page elements
var div = document.createElement('div')
div.style.margin = '20px 50px'
document.body.appendChild(div)
div.innerHTML = 'ad-hoc test cases'

var addTest = (name, fn) => {
    var b = document.createElement('button')
    b.style.margin = '10px'
    b.style.padding = '10px'
    b.innerText = '' + name
    b.onclick = () => {
        if (!audio) initAudio()
        fn(audio.enveloper, audio.param, audio.ctx.currentTime + 0.1)
    }
    div.appendChild(b)
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
    for (var i = 0; i < 20; i++) {
        env.addRamp(param, 0.1, (i % 2) ? 0.3 : 0.7)
    }
})

function adsr(env, param, a, h, d, r) {
    env.addRamp(param, a, 1)
    env.addHold(param, h)
    env.addRamp(param, d, 0.8, true)
    env.addSweep(param, -1, 0, r)
}

addTest('adsr', (env, param, t) => {
    env.startEnvelope(param, t)
    adsr(env, param, 0.2, 0.2, 0.4, 0.4)
})

addTest('rel', (env, param, t) => {
    env.startEnvelope(param, t)
    adsr(env, param, 0.2, 0.2, 0.4, 0.4)
    env.startEnvelope(param, t + 0.2)
    env.addSweep(param, -1, 0, 0.2)
})

addTest('rel', (env, param, t) => {
    env.startEnvelope(param, t)
    adsr(env, param, 0.2, 0.2, 0.4, 0.4)
    env.startEnvelope(param, t + 0.4)
    env.addSweep(param, -1, 0, 0.2)
})

addTest('rel', (env, param, t) => {
    env.startEnvelope(param, t)
    adsr(env, param, 0.2, 0.2, 0.4, 0.4)
    env.startEnvelope(param, t + 0.8)
    env.addSweep(param, -1, 0, 0.2)
})


