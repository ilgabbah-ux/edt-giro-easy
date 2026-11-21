// Giro Easy · pista 3D · suoni della guida. Motore: due registrazioni di un mono 4 tempi (basso e alto regime) intonate sui giri e sfumate una nell'altra,
// sei marce con il taglio alla cambiata, colore della marmitta, basso sotto lo scarico, aspirazione, scoppiettii in rilascio. Poi gomma, vento, terra, botte.
let ctx = null, master = null, E = null, on = true, noiseBuf = null;
const GEARS = [0, .42, .72, 1.02, 1.34, 1.7, 9];
// Motore di ogni moto: due registrazioni vere a giri costanti (basso e alto regime) che si danno il cambio. f = scoppi al secondo della registrazione, len = durata del giro chiuso.
const EP = { lo: { url: 'suoni/fakedomi-basso.mp3?v=1', f: 31, len: 2.998526 }, hi: { url: 'suoni/fakedomi-alto.mp3?v=1', f: 55, len: 2.986032 }, x0: 36, x1: 48, nz: .6 };   // Fake Domi: mono 4 tempi 650
export function setSound(v) { on = v; if (ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); }
function burst(dur, freq, q, vol, type, when = 0) { const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
export async function startSound() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = on ? 1 : 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime, load = async (o) => { const b = await ctx.decodeAudioData(await (await fetch(o.url)).arrayBuffer()), s = ctx.createBufferSource(), gg = ctx.createGain(); s.buffer = b; s.loop = true; s.loopStart = .2; s.loopEnd = .2 + o.len; s.playbackRate.value = .5; gg.gain.value = 0; s.connect(gg); return { s, g: gg, f: o.f }; };
    const [lo, hi] = await Promise.all([load(EP.lo), load(EP.hi)]);
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 2500; body.Q.value = .7;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .35);
    lo.g.connect(body); hi.g.connect(body); body.connect(hp); hp.connect(g); g.connect(master);
    const loopN = (rate, type, f, q, dest) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = 0; s.connect(fl); fl.connect(gg); gg.connect(dest); s.start(); return { f: fl, g: gg }; };
    const intake = loopN(1, 'bandpass', 1400, .9, g), tyre = loopN(.9, 'bandpass', 520, .7, master), wind = loopN(.7, 'bandpass', 700, .55, master), skid = loopN(1.1, 'bandpass', 950, 1.1, master);
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 45; const sg = ctx.createGain(); sg.gain.value = 0; sub.connect(sg); sg.connect(g); sub.start(); lo.s.start(); hi.s.start();
    E = { lo, hi, body, g, intake, tyre, wind, skid, sub, sg, rpm: .3, gear: 1, shiftT: 0, lastGas: false, popT: 0 };
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
  const r = e.rpm, F = r < .8 ? 14 + Math.max(0, r - .5) / .3 * 12 : 26 + (r - .8) * 19.5;   // scoppi al secondo: 14 al minimo (1700 giri), 26 appena si parte, 65 tirata (7800 giri)
  const k = Math.max(0, Math.min(1, (F - EP.x0) / (EP.x1 - EP.x0)));
  e.lo.s.playbackRate.setTargetAtTime(F / e.lo.f, t, .04); e.hi.s.playbackRate.setTargetAtTime(F / e.hi.f, t, .04);
  e.lo.g.gain.setTargetAtTime(Math.cos(k * Math.PI / 2), t, .05); e.hi.g.gain.setTargetAtTime(Math.sin(k * Math.PI / 2), t, .05);
  e.body.frequency.setTargetAtTime(1400 + F * 40 + load * 3200, t, .05);   // a gas aperto lo scarico si apre, in rilascio si chiude
  e.g.gain.setTargetAtTime((.3 + load * .45) * (e.shiftT > 0 ? .55 : 1), t, .04);
  e.intake.f.frequency.setTargetAtTime(900 + e.rpm * 1300, t, .1); e.intake.g.gain.setTargetAtTime((.006 + e.rpm * .008) * EP.nz, t, .1);
  e.sub.frequency.setTargetAtTime(F, t, .06); e.sg.gain.setTargetAtTime((.02 + load * .03) * (e.shiftT > 0 ? .5 : 1), t, .06);
  const sp = Math.min(1.4, speed), wetK = Math.min(1, (p.wet || 0) * 5), rough = Math.min(1, p.rough * 14 + p.off * .6 + wetK * 1.2 + (p.surf === 'mud' ? .35 : 0));   // nell'acqua e nel fango si sente lo sciacquio
  e.tyre.f.frequency.setTargetAtTime((520 + rough * 700) * (.8 + sp * .25), t, .15); e.tyre.g.gain.setTargetAtTime(airborne || speed < .05 ? 0 : (.015 + rough * .045) * sp, t, airborne ? .03 : .12);
  const fast = Math.max(0, Math.min(1, (speed - .6) / .9)); e.wind.g.gain.setTargetAtTime(speed < .05 ? 0 : fast * fast * .03, t, .25); e.wind.f.frequency.setTargetAtTime(500 + fast * 900, t, .3);
  e.skid.g.gain.setTargetAtTime(airborne ? 0 : Math.min(1, Math.abs(p.slip) * 2.4) * Math.min(1, speed / .6) * .13 + p.brk * .03 * Math.min(1, speed), t, .04); e.skid.f.frequency.setTargetAtTime(750 + speed * 250, t, .1);
  e.popT -= dt;   // rilascio del gas a giri alti: scoppiettii allo scarico
  if (e.lastGas && !gas && e.rpm > 1.4 && e.popT <= 0 && on) { e.popT = .8; for (let i = 0; i < 3; i++) burst(.035, 400 + Math.random() * 300, 2, .16, 'bandpass', .05 + i * (.06 + Math.random() * .05)); }
  e.lastGas = gas;
}
