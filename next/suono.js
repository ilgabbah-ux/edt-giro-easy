// Giro Easy · pista 3D · suoni della guida. Motore: due registrazioni di un mono 4 tempi (basso e alto regime) intonate sui giri e sfumate una nell'altra,
// sei marce con il taglio alla cambiata, colore della marmitta, basso sotto lo scarico, aspirazione, scoppiettii in rilascio. Poi gomma, vento, terra, botte.
let ctx = null, master = null, E = null, on = true, noiseBuf = null;
const GEARS = [0, .42, .72, 1.02, 1.34, 1.7, 9];
// Motore di ogni moto: due registrazioni vere a giri costanti (basso e alto regime) che si danno il cambio. f = scoppi al secondo della registrazione, len = durata del giro chiuso.
let EP = { lo: { url: 'suoni/fakedomi-basso.mp3?v=1', f: 31, len: 2.998526 }, hi: { url: 'suoni/fakedomi-alto.mp3?v=1', f: 55, len: 2.986032 }, x0: 36, x1: 48, nz: .6 };   // Fake Domi: mono 4 tempi 650
const mLevel = () => on ? (vSrc ? .4 : 1) : 0;   // mentre il Gabbah parla il motore si abbassa
export const speaking = () => !!vSrc;
export function setSound(v) { on = v; if (ctx) master.gain.setTargetAtTime(mLevel(), ctx.currentTime, .05); if (!on) hush(); }
// VOCE della scuola: le frasi del Gabbah, una per stazione. Si caricano alla prima richiesta; se ne parte una nuova la vecchia si zittisce
const VB = {}; let vSrc = null, vWant = '';
function hush() { if (vSrc) { try { vSrc.stop(); } catch {} vSrc = null; } if (ctx) master.gain.setTargetAtTime(mLevel(), ctx.currentTime, .15); }
export async function say(name) { vWant = name; hush(); if (!ctx || !on) return;
  try { if (!VB[name]) VB[name] = fetch('voce/' + name + '.mp3?v=1').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)); const buf = await VB[name]; if (vWant !== name || !on) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = 1.7; src.connect(g); g.connect(ctx.destination); vSrc = src; master.gain.setTargetAtTime(mLevel(), ctx.currentTime, .12);
    src.onended = () => { if (vSrc === src) { vSrc = null; master.gain.setTargetAtTime(mLevel(), ctx.currentTime, .3); } }; src.start(); } catch {} }
export function preloadVoice(names) { if (ctx) for (const n of names) if (!VB[n]) VB[n] = fetch('voce/' + n + '.mp3?v=1').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).catch(() => null); }
function burst(dur, freq, q, vol, type, when = 0) { const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
const SETS = {   /* registrazioni vere: due tempi e bicilindrico, basso e alto regime, tagliate a giro chiuso */
  '2t': { lo: { url: 'suoni/2t-lo.mp3?v=1', f: 52, len: 1.056984 }, hi: { url: 'suoni/2t-hi.mp3?v=1', f: 46, len: 2.52898 } },
  tw: { lo: { url: 'suoni/tw-lo.mp3?v=1', f: 48, len: .66 }, hi: { url: 'suoni/tw-hi.mp3?v=1', f: 56, len: .58 } } };
export function setBike(p) { EP = { ...EP, fm: 1, bf: 1, pk: null, el: 0, ...p, ...(SETS[p.smp] || {}) }; }   /* la voce della moto scelta: stessi campioni veri, ma scoppi, timbro e risonanza suoi. L'elettrica non ha scoppi: fischia */
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
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = EP.pk ? EP.pk[0] : 1000; pk.gain.value = EP.pk ? EP.pk[1] : 0; pk.Q.value = EP.pk ? EP.pk[2] : 1;
    lo.g.connect(body); hi.g.connect(body); body.connect(pk); pk.connect(hp); hp.connect(g); g.connect(master);
    /* elettrica: niente sibilo a dente di sega. Un motore elettrico è un tono pulito che sale con la velocità, un ronzio basso quando spinge e il fruscio di catena e gomme */
    let el = null; if (EP.el) { const mk = (type, gain) => { const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = type; g1.gain.value = gain; o.connect(g1); o.start(); return [o, g1]; };
      const [o1, g1] = mk('sine', 1), [o2, g2] = mk('triangle', .28), [o3, g3] = mk('sine', .0), ef = ctx.createBiquadFilter(), eg = ctx.createGain(); ef.type = 'lowpass'; ef.frequency.value = 1900; ef.Q.value = .5; eg.gain.value = 0; g1.connect(ef); g2.connect(ef); g3.connect(ef); ef.connect(eg); eg.connect(master);
      const nb = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 2.2; const ng = ctx.createGain(); ng.gain.value = 0; ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start();
      el = { o1, o2, o3, g3, eg, nf, ng, lv: 0 }; }
    const loopN = (rate, type, f, q, dest) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = 0; s.connect(fl); fl.connect(gg); gg.connect(dest); s.start(); return { f: fl, g: gg }; };
    const intake = loopN(1, 'bandpass', 1400, .9, g), tyre = loopN(.9, 'bandpass', 520, .7, master), wind = loopN(.7, 'bandpass', 700, .55, master), skid = loopN(1.1, 'bandpass', 950, 1.1, master);
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 45; const sg = ctx.createGain(); sg.gain.value = 0; sub.connect(sg); sg.connect(g); sub.start(); lo.s.start(); hi.s.start();
    E = { el, lo, hi, body, g, intake, tyre, wind, skid, sub, sg, rpm: .3, gear: 1, shiftT: 0, lastGas: false, popT: 0 };
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
  if (!E) return; const e = E, t = ctx.currentTime, speed = p.play ? p.sp : 0, gas = !!p.gas, thr = p.thr == null ? (gas ? 1 : 0) : p.thr, spin = p.spin || 0, airborne = !!p.air, f60 = dt * 60;
  let gear = 1; while (gear < 6 && speed > GEARS[gear]) gear++;
  if (gear !== e.gear) { const up = gear > e.gear; e.gear = gear; if (up) { e.shiftT = .16; e.rpm *= .62; } }
  e.shiftT = Math.max(0, e.shiftT - dt);
  const lo = GEARS[gear - 1], hi = Math.min(GEARS[gear], 2.2), frac = Math.max(0, Math.min(1, (speed - lo) / Math.max(.2, hi - lo)));
  let target = .55 + frac * 1.9 + thr * .3 + (gas && Math.abs(p.slip) > .15 ? .5 * thr : 0) + spin * .9;   // di traverso col gas la ruota pattina: i giri salgono
  if (airborne) target = 2.9; if (speed < .05) target = .5;
  e.rpm += (target - e.rpm) * Math.min(1, (airborne ? .08 : .24) * f60);
  const load = e.shiftT > 0 ? .35 : (.5 + .5 * thr) * (airborne ? .6 : 1);
  const r = e.rpm, F = r < .8 ? 14 + Math.max(0, r - .5) / .3 * 12 : 26 + (r - .8) * 19.5;   // scoppi al secondo: 14 al minimo (1700 giri), 26 appena si parte, 65 tirata (7800 giri)
  const k = Math.max(0, Math.min(1, (F - EP.x0) / (EP.x1 - EP.x0)));
  const Fb = F * (EP.fm || 1); e.lo.s.playbackRate.setTargetAtTime(Fb / e.lo.f, t, .04); e.hi.s.playbackRate.setTargetAtTime(Fb / e.hi.f, t, .04);
  if (e.el) { const x = e.el, v = Math.min(2, speed), fe = 170 + v * 430, on = Math.min(1, v * 3 + thr * 1.5); x.lv += ((.0035 + thr * .013 + v * .003) * on - x.lv) * Math.min(1, dt * 6);
    x.o1.frequency.setTargetAtTime(fe, t, .09); x.o2.frequency.setTargetAtTime(fe * 1.5, t, .09); x.o3.frequency.setTargetAtTime(fe * .25, t, .09); x.g3.gain.setTargetAtTime(thr * .9, t, .1); x.eg.gain.setTargetAtTime(x.lv, t, .05);
    x.nf.frequency.setTargetAtTime(500 + v * 900, t, .1); x.ng.gain.setTargetAtTime(Math.min(1, v) * .012 + thr * v * .006, t, .12); }
  e.lo.g.gain.setTargetAtTime(Math.cos(k * Math.PI / 2), t, .05); e.hi.g.gain.setTargetAtTime(Math.sin(k * Math.PI / 2), t, .05);
  e.body.frequency.setTargetAtTime((1400 + F * 40 + load * 3200) * (EP.bf || 1), t, .05);   // a gas aperto lo scarico si apre, in rilascio si chiude
  e.g.gain.setTargetAtTime(EP.el ? 0 : (.3 + load * .45) * (e.shiftT > 0 ? .55 : 1), t, .04);
  e.intake.f.frequency.setTargetAtTime(900 + e.rpm * 1300, t, .1); e.intake.g.gain.setTargetAtTime((.006 + e.rpm * .008) * EP.nz, t, .1);
  e.sub.frequency.setTargetAtTime(Fb, t, .06); e.sg.gain.setTargetAtTime((.02 + load * .03) * (e.shiftT > 0 ? .5 : 1), t, .06);
  const sp = Math.min(1.4, speed), wetK = Math.min(1, (p.wet || 0) * 5), rough = Math.min(1, p.rough * 14 + p.off * .6 + wetK * 1.2 + (p.surf === 'mud' ? .35 : 0));   // nell'acqua e nel fango si sente lo sciacquio
  e.tyre.f.frequency.setTargetAtTime((520 + rough * 700) * (.8 + sp * .25), t, .15); e.tyre.g.gain.setTargetAtTime(airborne || speed < .05 ? 0 : (.015 + rough * .045) * sp, t, airborne ? .03 : .12);
  const fast = Math.max(0, Math.min(1, (speed - .6) / .9)); e.wind.g.gain.setTargetAtTime(speed < .05 ? 0 : fast * fast * .03, t, .25); e.wind.f.frequency.setTargetAtTime(500 + fast * 900, t, .3);
  e.skid.g.gain.setTargetAtTime(airborne ? 0 : Math.min(1, Math.abs(p.slip) * 2.4) * Math.min(1, speed / .6) * .13 + p.brk * .03 * Math.min(1, speed), t, .04); e.skid.f.frequency.setTargetAtTime(750 + speed * 250, t, .1);
  e.popT -= dt;   // rilascio del gas a giri alti: scoppiettii allo scarico
  if (e.lastGas && !gas && e.rpm > 1.4 && e.popT <= 0 && on) { e.popT = .8; for (let i = 0; i < 3; i++) burst(.035, 400 + Math.random() * 300, 2, .16, 'bandpass', .05 + i * (.06 + Math.random() * .05)); }
  e.lastGas = gas;
}
