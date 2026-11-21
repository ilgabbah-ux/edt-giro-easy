// Giro Easy · pista 3D · suoni della guida: motore vero (la registrazione del gioco) intonato col regime e con le marce, gomma che gratta, vento, botte
let ctx = null, eng = null, on = true, ready = false, noise = null;
const GEARS = [0, 6.5, 11, 15.5, 22.5];
export function setSound(v) { on = v; if (ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); }
let master = null, rpm = .3;
export async function startSound() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; noise = nb;
    const mk = (type, f, q) => { const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(master); src.start(); return { fl, g }; };
    const skid = mk('bandpass', 950, .9), wind = mk('lowpass', 420, .3), dirt = mk('bandpass', 260, .7);
    eng = { skid, wind, dirt };
    const res = await fetch('../musica/motore.mp3?v=1061'); const b = await ctx.decodeAudioData(await res.arrayBuffer());
    const d = b.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i += 7) pk = Math.max(pk, Math.abs(d[i]));
    if (pk > 0) for (let c = 0; c < b.numberOfChannels; c++) { const x = b.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] *= .8 / pk; }
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.playbackRate.value = .6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; const g = ctx.createGain(); g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(master); src.start(); Object.assign(eng, { src, lp, g }); ready = true;
  } catch (e) { /* senza audio si gioca lo stesso */ }
}
export function thud(k) {   // atterraggio o botta
  if (!ctx || !on || k < .08) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
  g.gain.setValueAtTime(Math.min(.9, k * 1.1), t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g); g.connect(master); o.start(t); o.stop(t + .27);
  const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; const g2 = ctx.createGain(); g2.gain.setValueAtTime(Math.min(.5, k * .6), t); g2.gain.exponentialRampToValueAtTime(.001, t + .14); s.connect(f); f.connect(g2); g2.connect(master); s.start(t, Math.random()); s.stop(t + .16);
}
// p: v (m/s), gas 0/1, brk 0..1, slip (rad), air (bool), off 0..1, rough (m), play (bool)
export function soundUpdate(dt, p) {
  if (!ctx || !eng) return; const t = ctx.currentTime;
  let gi = 1; while (gi < GEARS.length - 1 && p.v > GEARS[gi]) gi++;
  const lo = GEARS[gi - 1], hi = GEARS[gi]; let target = p.play ? .32 + .68 * Math.max(0, Math.min(1, (p.v - lo * .55) / (hi - lo * .55))) : .12;
  if (p.air && p.gas) target = 1.05;                        // in aria la ruota gira a vuoto
  if (Math.abs(p.slip) > .15 && p.gas) target = Math.min(1.1, target + .25);   // traverso col gas: il motore sale
  if (!p.gas) target *= .86;
  rpm += (target - rpm) * Math.min(1, dt * (target > rpm ? 5 : 3.2));
  if (ready) { eng.src.playbackRate.setTargetAtTime(.5 + rpm * 1.05, t, .03); eng.lp.frequency.setTargetAtTime(700 + rpm * 2600 + (p.gas ? 900 : 0), t, .05); eng.g.gain.setTargetAtTime(p.play ? (p.gas ? .62 : .3) : .18, t, .06); }
  const sk = p.air ? 0 : Math.min(1, Math.abs(p.slip) * 2.4) * Math.min(1, p.v / 9) + p.brk * .12 * Math.min(1, p.v / 12);
  eng.skid.g.gain.setTargetAtTime(sk * .2, t, .04); eng.skid.fl.frequency.setTargetAtTime(700 + p.v * 30, t, .1);
  eng.wind.g.gain.setTargetAtTime(Math.min(.22, p.v * p.v / 2400), t, .15); eng.wind.fl.frequency.setTargetAtTime(300 + p.v * 22, t, .2);
  eng.dirt.g.gain.setTargetAtTime(p.air ? 0 : Math.min(.3, (p.rough * 3 + p.off * .12 + .02) * Math.min(1, p.v / 8)), t, .05);
}
