// Giro Easy · pista 3D · suoni della guida. Il motore è lo stesso del gioco vero (audio.js): registrazione di un monocilindrico 4 tempi in loop,
// sei marce con il taglio alla cambiata, colore della marmitta, basso sotto lo scarico, aspirazione, scoppiettii in rilascio. Poi gomma, vento, terra, botte.
let ctx = null, master = null, E = null, on = true, noiseBuf = null;
const GEARS = [0, .42, .72, 1.02, 1.34, 1.7, 9];
const EP = { rate: .72, body: 650, bark: 115, barkG: 9, nz: .9 };   // 4 tempi grosso, cupo e pieno (la Fake Domi è una 650)
export function setSound(v) { on = v; if (ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); }
function burst(dur, freq, q, vol, type, when = 0) { const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
export async function startSound() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = on ? 1 : 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; }
    const res = await fetch('../musica/motore.mp3?v=1061'), b = await ctx.decodeAudioData(await res.arrayBuffer());
    { const d = b.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i += 7) pk = Math.max(pk, Math.abs(d[i])); if (pk > 0) for (let c = 0; c < b.numberOfChannels; c++) { const x = b.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] *= .8 / pk; } }
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.loopStart = .06; src.loopEnd = b.duration - .06; src.playbackRate.value = .5;
    const bark = ctx.createBiquadFilter(); bark.type = 'peaking'; bark.frequency.value = EP.bark; bark.gain.value = EP.barkG; bark.Q.value = 1.4;
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 900; body.Q.value = 1.2;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38;
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .35);
    src.connect(bark); bark.connect(body); body.connect(hp); hp.connect(g); g.connect(master);
    const loopN = (rate, type, f, q, dest) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = 0; s.connect(fl); fl.connect(gg); gg.connect(dest); s.start(); return { f: fl, g: gg }; };
    const intake = loopN(1, 'bandpass', 1400, .9, g), tyre = loopN(.9, 'bandpass', 520, .7, master), wind = loopN(.7, 'bandpass', 700, .55, master), skid = loopN(1.1, 'bandpass', 950, 1.1, master);
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 45; const sg = ctx.createGain(); sg.gain.value = 0; sub.connect(sg); sg.connect(g); sub.start(); src.start();
    E = { src, bark, body, g, intake, tyre, wind, skid, sub, sg, rpm: .3, gear: 1, shiftT: 0, lastGas: false, popT: 0 };
  } catch (e) { /* senza audio si gioca lo stesso */ }
}
export function whip() { if (ctx && on) { burst(.11, 2600, .7, .22, 'bandpass'); burst(.07, 900, .8, .16, 'bandpass', .03); } }   // ramo in faccia
export function splash(k) { if (ctx && on) { burst(.5, 1400, .5, Math.min(.5, .15 + k * .4), 'bandpass'); burst(.3, 300, .6, Math.min(.5, k * .5), 'lowpass'); } }   // entrata in acqua
export function thud(k) {   // atterraggio o botta
  if (!ctx || !on || k < .12) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
  g.gain.setValueAtTime(Math.min(.8, k), t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g); g.connect(master); o.start(t); o.stop(t + .27); burst(.14, 700, .7, Math.min(.4, k * .5), 'lowpass');
}
// p: sp = velocità 0…2 (2 = velocità massima), gas, brk 0..1, slip (rad), air, off 0..1, rough (m), play
export function soundUpdate(dt, p) {
  if (!E) return; const e = E, t = ctx.currentTime, speed = p.play ? p.sp : 0, gas = !!p.gas, airborne = !!p.air, f60 = dt * 60;
  let gear = 1; while (gear < 6 && speed > GEARS[gear]) gear++;
  if (gear !== e.gear) { const up = gear > e.gear; e.gear = gear; if (up) { e.shiftT = .16; e.rpm *= .62; } }
  e.shiftT = Math.max(0, e.shiftT - dt);
  const lo = GEARS[gear - 1], hi = Math.min(GEARS[gear], 2.2), frac = Math.max(0, Math.min(1, (speed - lo) / Math.max(.2, hi - lo)));
  let target = .55 + frac * 1.9 + (gas ? .25 : 0) + (gas && Math.abs(p.slip) > .15 ? .5 : 0);   // di traverso col gas la ruota pattina: i giri salgono
  if (airborne) target = 2.9; if (speed < .05) target = .5;
  e.rpm += (target - e.rpm) * Math.min(1, (airborne ? .08 : .14) * f60);
  const load = e.shiftT > 0 ? .35 : (gas ? 1 : .72) * (airborne ? .6 : 1);
  e.src.playbackRate.setTargetAtTime((.5 + e.rpm * .43) * Math.sqrt(EP.rate), t, .04);
  e.body.frequency.setTargetAtTime((1000 + e.rpm * 1000 * load) * EP.body / 900, t, .05);   // meno acuti: deve sentirsi lo scarico, non un fruscio
  e.bark.frequency.setTargetAtTime((110 + e.rpm * 70) * EP.bark / 180, t, .08);
  e.g.gain.setTargetAtTime((.11 + load * .1) * (e.shiftT > 0 ? .55 : 1) * 2.1, t, .04);
  e.intake.f.frequency.setTargetAtTime(900 + e.rpm * 1300, t, .1); e.intake.g.gain.setTargetAtTime((.006 + e.rpm * .008) * EP.nz, t, .1);
  e.sub.frequency.setTargetAtTime(32 + e.rpm * 26, t, .06); e.sg.gain.setTargetAtTime((.07 + load * .08) * (e.shiftT > 0 ? .5 : 1), t, .06);
  const sp = Math.min(1.4, speed), wetK = Math.min(1, (p.wet || 0) * 5), rough = Math.min(1, p.rough * 14 + p.off * .6 + wetK * 1.2 + (p.surf === 'mud' ? .35 : 0));   // nell'acqua e nel fango si sente lo sciacquio
  e.tyre.f.frequency.setTargetAtTime((520 + rough * 700) * (.8 + sp * .25), t, .15); e.tyre.g.gain.setTargetAtTime(airborne || speed < .05 ? 0 : (.015 + rough * .045) * sp, t, airborne ? .03 : .12);
  const fast = Math.max(0, Math.min(1, (speed - .6) / .9)); e.wind.g.gain.setTargetAtTime(speed < .05 ? 0 : fast * fast * .03, t, .25); e.wind.f.frequency.setTargetAtTime(500 + fast * 900, t, .3);
  e.skid.g.gain.setTargetAtTime(airborne ? 0 : Math.min(1, Math.abs(p.slip) * 2.4) * Math.min(1, speed / .6) * .13 + p.brk * .03 * Math.min(1, speed), t, .04); e.skid.f.frequency.setTargetAtTime(750 + speed * 250, t, .1);
  e.popT -= dt;   // rilascio del gas a giri alti: scoppiettii allo scarico
  if (e.lastGas && !gas && e.rpm > 1.4 && e.popT <= 0 && on) { e.popT = .8; for (let i = 0; i < 3; i++) burst(.035, 400 + Math.random() * 300, 2, .16, 'bandpass', .05 + i * (.06 + Math.random() * .05)); }
  e.lastGas = gas;
}
