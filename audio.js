// EDT Giro Easy · v18
// Audio: incitamenti MP3 (mai sovrapposti), motore sintetizzato ed effetti.
// Tutto parte dopo il primo tocco dell'utente, come richiedono i browser.

import { VOCI } from './voci.js?v=77';
import { VOCI_PILOTI } from './voci-piloti.js?v=77';

const VOICE_FILES = {
  vai: 'audio/vai-ciccio.mp3',
  success: 'audio/cosi-si-fa.mp3',
  gas: 'audio/dai-gas.mp3',
};

let ctx = null, master = null, sfxBus = null, voiceBus = null;
let enabled = true;
const buffers = new Map();
let loading = null, voiceSource = null, voiceGeneration = 0;
let engine = null, noiseBuffer = null, duckBus = null, voiceEnd = 0;
const VOICE_URLS = { vai: 'audio/vai-ciccio.mp3', success: 'audio/cosi-si-fa.mp3', gas: 'audio/dai-gas.mp3', yeehaw: 'audio/voce-yeehaw.mp3', campa: 'audio/voce-campa-giu.mp3' };
// Riproduce una voce: ferma l'eventuale voce precedente e abbassa motore ed effetti per la sua durata.
function playVoice(buf) {
  stopVoice();
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(voiceBus);
  voiceSource = src; voiceEnd = ctx.currentTime + buf.duration;
  const t0 = ctx.currentTime;
  src.onended = () => { dbg('fine voce dopo ' + (ctx.currentTime - t0).toFixed(2) + 's'); if (voiceSource === src) voiceSource = null; };
  src.start();
  const t = ctx.currentTime;
  duckBus.gain.cancelScheduledValues(t);
  duckBus.gain.setTargetAtTime(.28, t, .03);
  duckBus.gain.setTargetAtTime(1, t + buf.duration, .2);
}
// Diagnosi (pannello #debug): ultimi eventi audio.
const dlog = [];
function dbg(msg) { dlog.push((performance.now() / 1000).toFixed(1) + ' ' + msg); if (dlog.length > 8) dlog.shift(); }
export function debugInfo() {
  return { state: ctx ? ctx.state : 'nessun contesto', enabled, voci: [...buffers.keys()].join(','), extra: Object.entries(extraState).map(([k, v]) => k + ':' + (v ? 'ok' : v === null ? 'NO' : '?')).join(' '), log: dlog };
}
const voiceBusy = () => voiceSource && ctx && ctx.currentTime < voiceEnd;
// Piano B se il contesto audio non parte (alcuni browser): elemento <audio> classico.
function playHtml(key) {
  try { const a = new Audio(VOCI[key] ? 'data:audio/mpeg;base64,' + VOCI[key] : VOICE_URLS[key]); a.volume = 1; a.play().catch(() => {}); } catch {}
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // iPhone/iPad: senza questo, con l'interruttore del silenzioso attivo il gioco resta muto.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    // duckBus: motore ed effetti passano di qui e si abbassano mentre parla una voce.
    duckBus = ctx.createGain(); duckBus.gain.value = 1; duckBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .55; sfxBus.connect(duckBus);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.35; voiceBus.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlock() {
  if (!ensure()) return;
  loadVoices().catch(() => {});
}

export function setEnabled(v) {
  enabled = v;
  if (master) master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, .03);
  if (!v) stopVoice();
}
export function isEnabled() { return enabled; }

function loadVoices() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(VOICE_FILES).map(async ([key, url]) => {
    if (VOCI[key]) {
      const bin = atob(VOCI[key]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buffers.set(key, await ctx.decodeAudioData(bytes.buffer));
      return;
    }
    const res = await fetch(url);
    if (!res.ok) throw Error('audio');
    const buf = await res.arrayBuffer();
    buffers.set(key, await ctx.decodeAudioData(buf));
  })).catch(e => { loading = null; throw e; });
  return loading;
}

export function stopVoice() {
  voiceGeneration++;
  if (voiceSource) { try { voiceSource.stop(); } catch {} voiceSource = null; }
}

// Sceglie la clip in base al testo dell'incitamento. Non sovrappone mai le voci.
export async function speak(text) {
  if (!enabled || !ensure()) return false;
  const generation = voiceGeneration;
  try {
    const key = /gas/i.test(text) ? 'gas' : /così|cosi/i.test(text) ? 'success' : 'vai';
    dbg('speak ' + key + ' ' + ctx.state);
    if (ctx.state !== 'running') { playHtml(key); return true; }
    await loadVoices();
    if (!enabled || generation !== voiceGeneration || voiceBusy()) return false;
    playVoice(buffers.get(key));
    return true;
  } catch { return false; }
}

// ---------- Effetti ----------
function env(node, t, a, peak, d) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(freq, dur = .1, type = 'triangle', vol = .25, when = 0, slideTo = null) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(g, t, .006, vol, dur);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + dur + .05);
}
function noise(dur = .2, freq = 1200, q = 1, vol = .3, type = 'bandpass', when = 0, sweepTo = null) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain(); env(g, t, .005, vol, dur);
  src.connect(f); f.connect(g); g.connect(sfxBus);
  src.start(t, Math.random() * .5); src.stop(t + dur + .05);
}

// ---------- Voci extra: "Campa giù!" e "Yee-haw!" ----------
// Se esistono audio/campa-giu.mp3 e audio/yeehaw.mp3 li usa; altrimenti la voce sintetica del dispositivo.
const EXTRA = {
  campa: { file: 'audio/voce-campa-giu.mp3', text: 'Campa giù!', lang: 'it-IT', pitch: .85, rate: 1.15 },
  yeehaw: { file: 'audio/voce-yeehaw.mp3', text: 'Yee-haaaw!', lang: 'en-US', pitch: 1.5, rate: 1.05 },
  acqua: { file: null, text: 'Acqua?! Ma sei matto?', lang: 'it-IT', pitch: 1.1, rate: 1.2 },
};
const extraState = {};
async function loadExtra(key) {
  if (extraState[key] !== undefined) return extraState[key];
  extraState[key] = null;
  // Voci incorporate: decodifica diretta, senza rete.
  if (VOCI[key]) {
    try {
      const bin = atob(VOCI[key]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      extraState[key] = await ctx.decodeAudioData(bytes.buffer);
      return extraState[key];
    } catch (e) { console.warn('EDT voce incorporata non decodificata:', key, e); }
  }
  if (!EXTRA[key].file) return null;
  try {
    const res = await fetch(EXTRA[key].file, { method: 'GET' });
    if (!res.ok) { console.warn('EDT voce non trovata:', EXTRA[key].file, res.status); return null; }
    extraState[key] = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch (e) { extraState[key] = null; console.warn('EDT voce non caricata:', key, e); }
  return extraState[key];
}
// Senza un MP3 registrato non usiamo voci sintetiche (suonano finte): solo un effetto sonoro.
function fallbackSfx(key) {
  if (key === 'yeehaw') { noise(.08, 3000, 1, .35, 'highpass'); tone(700, .18, 'sine', .14, .08, 1400); tone(1400, .22, 'sine', .12, .26, 900); }
  else if (key === 'campa') { tone(1500, .55, 'sine', .14, 0, 380); noise(.5, 900, .7, .12, 'bandpass', 0, 300); }
  else if (key === 'acqua') sfx.water();
}
let lastSay = 0;
export async function say(key) {
  dbg('say ' + key + ' (audio ' + (enabled ? 'on' : 'off') + ', ' + (ctx ? ctx.state : '-') + ')');
  if (!enabled || !ensure() || !EXTRA[key]) return;
  const now = performance.now();
  if (now - lastSay < 1200) return;
  lastSay = now;
  let buf = extraState[key];
  if (buf === undefined || (buf === null && VOCI[key])) { extraState[key] = undefined; buf = await loadExtra(key); }
  if (ctx.state !== 'running' && VOICE_URLS[key]) { dbg('-> html ' + key); playHtml(key); }
  else if (buf) { dbg('-> play ' + key + ' ' + buf.duration.toFixed(2) + 's'); playVoice(buf); }
  else { dbg('-> NESSUN BUFFER ' + key); fallbackSfx(key); }
}
// Prova voci: le fa sentire tutte una dopo l'altra (pulsante nel menu).
export async function testVoices(onStep) {
  if (!ensure()) return;
  try { await ctx.resume(); } catch {}
  await loadVoices().catch(() => {});
  for (const k of Object.keys(EXTRA)) await loadExtra(k);
  const seq = [['vai', buffers.get('vai')], ['success', buffers.get('success')], ['gas', buffers.get('gas')], ['yeehaw', extraState.yeehaw], ['campa', extraState.campa]];
  for (const [k, b] of seq) {
    onStep?.(k, !!b, ctx.state);
    dbg('prova ' + k + ' ' + (b ? b.duration.toFixed(2) + 's' : 'MANCANTE') + ' ' + ctx.state);
    if (b) { playVoice(b); await new Promise(r => setTimeout(r, b.duration * 1000 + 350)); }
  }
  onStep?.('fine', true, ctx.state);
}
// ---------- Battute dei piloti (voci registrate su ElevenLabs) ----------
// Chiavi: <pilota>_start (partenza), <pilota>_hit (botta), <pilota>_win (arrivo).
const riderBuf = new Map();
export const hasRiderVoice = key => !!VOCI_PILOTI[key];
function decodeRider(key) {
  if (riderBuf.has(key)) return riderBuf.get(key);
  if (!ctx || !VOCI_PILOTI[key]) return Promise.resolve(null);
  const p = (async () => {
    const bin = atob(VOCI_PILOTI[key]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try { return await ctx.decodeAudioData(bytes.buffer); } catch { return null; }
  })();
  riderBuf.set(key, p);
  return p;
}
export function preloadRider(id) { if (ensure()) for (const k of ['start', 'hit', 'win']) decodeRider(id + '_' + k); }
export async function sayRider(key) {
  if (!enabled || !ensure() || !VOCI_PILOTI[key]) return false;
  dbg('pilota ' + key);
  if (ctx.state !== 'running') { try { const a = new Audio('data:audio/mpeg;base64,' + VOCI_PILOTI[key]); a.play().catch(() => {}); } catch {} return true; }
  const buf = await decodeRider(key);
  if (!buf || !enabled) return false;
  playVoice(buf);
  return true;
}
// v41 · battute degli avversari ("Suuuka!") e di Angelo sul taglio: non interrompono una voce già in corso
// e, se manca la clip del pilota, usano quella generica.
export async function sayRival(key) {
  if (!enabled || !ensure()) return false;
  const k = VOCI_PILOTI[key] ? key : key.endsWith('_suka') && VOCI_PILOTI.suka ? 'suka' : null;
  if (!k) { if (key.includes('suka')) { tone(320, .5, 'sawtooth', .1, 0, 180); } return false; }
  if (voiceBusy()) return false;
  if (ctx.state !== 'running') { try { const a = new Audio('data:audio/mpeg;base64,' + VOCI_PILOTI[k]); a.play().catch(() => {}); } catch {} return true; }
  const buf = await decodeRider(k);
  if (!buf || !enabled) return false;
  playVoice(buf);
  return true;
}
export function preloadRivals(names) { if (ensure()) { for (const n of names) decodeRider(n + '_suka'); decodeRider('suka'); decodeRider('angelo_taglio'); } }
export function preloadExtras() { if (ctx) for (const k of Object.keys(EXTRA)) loadExtra(k); }

export const sfx = {
  whistle() { tone(2850, .09, 'sine', .11); tone(3150, .09, 'sine', .11, .11); tone(2850, .3, 'sine', .11, .22, 3200); },   // v57 · fischietto delle GEV
  cap(mult = 1) { const b = 880 * Math.pow(1.06, mult * 2); tone(b, .07, 'square', .07); tone(b * 1.5, .12, 'triangle', .12, .05); },
  air() { tone(1320, .08, 'square', .07); tone(1760, .16, 'triangle', .12, .06); },
  jump() { noise(.28, 600, .7, .14, 'bandpass', 0, 2200); },
  land() { noise(.16, 220, .8, .35, 'lowpass'); tone(70, .14, 'sine', .3); },
  perfect() { [0, 4, 7, 12].forEach((s, i) => tone(660 * Math.pow(2, s / 12), .12, 'square', .08, i * .055)); },
  scrub() { noise(.22, 3000, 1.5, .12, 'bandpass', 0, 900); tone(990, .1, 'triangle', .1, .04); },
  near() { noise(.18, 2500, 2, .1, 'highpass'); },
  hit() { noise(.45, 400, .6, .55, 'lowpass', 0, 120); tone(110, .35, 'sawtooth', .18, 0, 45); },
  splash() { noise(.5, 1400, .8, .32, 'bandpass', 0, 350); },
  turbo() { tone(180, .6, 'sawtooth', .14, 0, 720); noise(.6, 800, .5, .18, 'bandpass', 0, 4000); },
  power() { [0, 5, 9, 12, 17].forEach((s, i) => tone(520 * Math.pow(2, s / 12), .1, 'triangle', .16, i * .05)); },
  lane(l) { tone(200 + l * 50, .045, 'triangle', .06); },
  count(final) { tone(final ? 880 : 440, final ? .45 : .18, 'square', .1); },
  mission() { [0, 7, 12].forEach((s, i) => tone(700 * Math.pow(2, s / 12), .16, 'triangle', .16, i * .08)); },
  fanfare() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, s / 12), .2, 'square', .09, i * .11)); },
  lose() { [7, 4, 0, -5].forEach((s, i) => tone(330 * Math.pow(2, s / 12), .24, 'triangle', .14, i * .16)); },
  click() { tone(600, .04, 'square', .05); },
  beer() { noise(.09, 2400, 3, .1, 'bandpass'); tone(520, .07, 'sine', .14, .02, 380); tone(880, .1, 'triangle', .1, .07); },
  wine() { [0, 3, 7, 10, 15].forEach((s, i) => tone(392 * Math.pow(2, s / 12), .18, 'triangle', .14, i * .06)); },
  grappa() { tone(220, .5, 'sawtooth', .12, 0, 880); noise(.5, 600, .6, .2, 'bandpass', 0, 5000); [0, 7, 12, 19].forEach((s, i) => tone(523 * Math.pow(2, s / 12), .14, 'square', .08, .2 + i * .06)); },
  water() { [12, 7, 3, 0, -5].forEach((s, i) => tone(440 * Math.pow(2, s / 12), .16, 'sine', .14, i * .09)); },
  ears() { tone(1200, .08, 'sine', .12, 0, 2400); tone(1600, .1, 'sine', .1, .1, 3000); },
  wheelie() { tone(140, .5, 'sawtooth', .1, 0, 420); },
};

// ---------- Motore (v38) ----------
// Monocilindrico da enduro 4T: un ciclo di scoppi registrato in un buffer (scoppio + risonanza dello scarico
// + rumore), suonato in loop con playbackRate = regime. Sopra: aspirazione/catena, distorsione dello scarico,
// marce con cambiata (taglio di gas e calo di giri), "bap-bap" in rilascio e fuori giri in volo.
const FIRE_HZ = 25;          // frequenza di scoppio del buffer a playbackRate 1 (≈3000 giri/min)
let engineBuf = null;
function makeEngineBuffer() {
  const sr = ctx.sampleRate, cycles = 12, per = Math.round(sr / FIRE_HZ), n = per * cycles;
  const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  let lp = 0;
  for (let c = 0; c < cycles; c++) {
    const amp = .82 + Math.random() * .3, ph = Math.random() * .4, res = 95 + Math.random() * 18;
    for (let i = 0; i < per; i++) {
      const t = i / sr, k = c * per + i;
      // scoppio: impulso rapido che decade + risonanza della marmitta + "cra" di rumore filtrato
      const env = Math.exp(-t * 55), env2 = Math.exp(-t * 140);
      const thump = Math.sin(2 * Math.PI * (FIRE_HZ * 1.6) * t + ph) * env;
      const ring = Math.sin(2 * Math.PI * res * t) * env * .55 + Math.sin(2 * Math.PI * res * 2.03 * t) * env2 * .25;
      lp += ((Math.random() * 2 - 1) - lp) * .18;
      d[k] = (thump * 1.1 + ring + lp * env * 1.6 + lp * .05) * amp;
    }
  }
  // giunture morbide tra ultimo e primo ciclo
  for (let i = 0; i < 64; i++) { const a = i / 64; d[n - 64 + i] = d[n - 64 + i] * (1 - a) + d[i] * a; }
  return b;
}
function shaperCurve(k = 6) {
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}
const GEARS = [0, .42, .72, 1.02, 1.34, 1.7, 9];   // soglie di velocità per marcia (1ª…6ª)
export function engineStart() {
  if (!enabled || !ensure() || engine) return;
  if (!engineBuf) engineBuf = makeEngineBuffer();
  const t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = engineBuf; src.loop = true; src.playbackRate.value = .5;
  const drive = ctx.createGain(); drive.gain.value = 1.4;
  const shaper = ctx.createWaveShaper(); shaper.curve = shaperCurve(4); shaper.oversample = '2x';
  const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 900; body.Q.value = 1.2;
  const bark = ctx.createBiquadFilter(); bark.type = 'peaking'; bark.frequency.value = 180; bark.gain.value = 5; bark.Q.value = 1.4;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .35);
  src.connect(drive); drive.connect(shaper); shaper.connect(bark); bark.connect(body); body.connect(hp); hp.connect(g); g.connect(duckBus);
  // aspirazione + catena: rumore filtrato che sale con i giri
  const nz = ctx.createBufferSource(); nz.buffer = noiseBuffer; nz.loop = true;
  const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = .9;
  const ng = ctx.createGain(); ng.gain.value = .0;
  nz.connect(nf); nf.connect(ng); ng.connect(g);
  src.start(); nz.start();
  engine = { src, drive, body, bark, g, nf, ng, nz, rpm: .3, gear: 1, shiftT: 0, lastGas: false, popT: 0 };
  engineUpdate(.2, false, false, false);
}
export function engineUpdate(speed, gas, turbo, airborne) {
  if (!engine || !ctx) return;
  const e = engine, t = ctx.currentTime;
  // marcia in base alla velocità; cambiata = breve taglio e giri che scendono
  let gear = 1; while (gear < 6 && speed > GEARS[gear]) gear++;
  if (gear !== e.gear) {
    const up = gear > e.gear; e.gear = gear;
    if (up) { e.shiftT = .16; e.rpm *= .62; }
  }
  e.shiftT = Math.max(0, e.shiftT - 1 / 60);
  const lo = GEARS[gear - 1], hi = Math.min(GEARS[gear], 2.2);
  const frac = Math.max(0, Math.min(1, (speed - lo) / Math.max(.2, hi - lo)));
  let target = .55 + frac * 1.9 + (gas ? .25 : 0) + (turbo ? .35 : 0);
  if (airborne) target = 2.9;                       // in aria la ruota gira libera: fuori giri
  if (speed < .05) target = .5;                     // minimo
  e.rpm += (target - e.rpm) * (airborne ? .08 : .14);
  const load = e.shiftT > 0 ? .35 : (gas || turbo ? 1 : .72) * (airborne ? .6 : 1);
  e.src.playbackRate.setTargetAtTime(e.rpm, t, .04);
  e.body.frequency.setTargetAtTime(500 + e.rpm * 900 * load + (turbo ? 900 : 0), t, .05);
  e.bark.frequency.setTargetAtTime(110 + e.rpm * 70, t, .08);
  e.drive.gain.setTargetAtTime(.9 + load * 1.8, t, .05);
  e.g.gain.setTargetAtTime((.11 + load * .1) * (e.shiftT > 0 ? .55 : 1), t, .04);
  e.nf.frequency.setTargetAtTime(900 + e.rpm * 1300, t, .1);
  e.ng.gain.setTargetAtTime(.012 + e.rpm * .018 + (turbo ? .03 : 0), t, .1);
  // rilascio del gas a giri alti: scoppiettii allo scarico
  e.popT -= 1 / 60;
  if (e.lastGas && !gas && e.rpm > 1.4 && e.popT <= 0) { e.popT = .8; for (let i = 0; i < 3; i++) noise(.035, 400 + Math.random() * 300, 2, .16, 'bandpass', .05 + i * (.06 + Math.random() * .05)); }
  e.lastGas = gas;
}
export function engineStop() {
  if (!engine || !ctx) return;
  const e = engine; engine = null;
  const t = ctx.currentTime;
  e.src.playbackRate.setTargetAtTime(.35, t, .25);
  e.g.gain.cancelScheduledValues(t);
  e.g.gain.setTargetAtTime(0.0001, t + .1, .18);
  setTimeout(() => { try { e.src.stop(); e.nz.stop(); } catch {} }, 1200);
}

// ---------- Musica (v38) ----------
// Una colonna sonora diversa per ogni percorso, generata dal vivo: batteria, basso, chitarra distorta e
// un riff. Si abbassa quando parlano le voci; si spegne col pulsante dell'audio o con MUSICA nella pausa.
const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);
// Ogni stile: bpm, tonalità (MIDI della tonica), giro di accordi [semitoni, 'm'|'M'], ritmi su 16 sedicesimi.
// k cassa · s rullante · h charleston (o = aperto) · b basso (x tonica, o ottava, 5 quinta) · g chitarra
// (x stoppata, X accordo lungo) · l riff (cifre = nota dell'accordo 0..4, - = tieni).
export const STYLES = [
  { name: 'Giro easy · rock della domenica', bpm: 126, root: 40, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [5, 'M']],
    k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: 'x.x.x.x.x.x.x.o.', g: 'X.......X...x.x.', l: '0...2...4.3.2...', swing: 0 },
  { name: 'Dopo migliora · punk da sterrato', bpm: 168, root: 45, prog: [[0, 'M'], [0, 'M'], [5, 'M'], [7, 'M']],
    k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: 'xxxxxxxxxxxxxxxx', g: 'xxxxxxxxxxxxxxxx', l: '', swing: 0 },
  { name: 'Il taglio di Angelo · rock scuro', bpm: 138, root: 40, prog: [[0, 'm'], [0, 'm'], [3, 'M'], [-2, 'M']],
    k: 'x..x..x...x..x..', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: 'x..x..x...x..x..', g: 'x..x..x...X.....', l: '0.0.3.0.2.0.1...', swing: 0 },
  { name: 'Sfida del giorno · funk del rifugio', bpm: 112, root: 43, prog: [[0, 'm'], [5, 'M'], [0, 'm'], [7, 'm']],
    k: 'x.....x...x.....', s: '....x..x.x..x...', h: 'xxoxxxoxxxoxxxox', b: 'x..o..x.x.5..o..', g: '..x...x...x.x...', l: '4.3.2...0...2.3.', swing: .12 },
  { name: 'Il muro dell’Assietta · epica in salita', bpm: 92, root: 38, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [0, 'm']],
    k: 'x.x.....x.x.x...', s: '........x.......', h: 'x...x...x...x...', b: 'x---------------', g: 'X---------------', l: '0---2---4---3-2-', swing: 0 },
  { name: 'Il pantano · blues paludoso', bpm: 96, root: 40, prog: [[0, 'M'], [5, 'M'], [0, 'M'], [7, 'M']],
    k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.xx.xx.xx.xx.x.', b: 'x.x.o.x.5.x.o.x.', g: 'x.x.x.x.x.x.x.x.', l: '..3.2.0...0.2...', swing: .22 },
  { name: 'Mulattiera infinita · polka alpina', bpm: 150, root: 43, prog: [[0, 'M'], [7, 'M'], [7, 'M'], [0, 'M']],
    k: 'x...x...x...x...', s: '..x...x...x...x.', h: '................', b: 'x...5...x...5...', g: '..x...x...x...x.', l: '0.1.2.3.4.3.2.1.', swing: 0 },
  { name: 'Giro a caso · synth da notturna', bpm: 116, root: 45, prog: [[0, 'm'], [-4, 'M'], [-7, 'M'], [-2, 'M']],
    k: 'x...x...x...x...', s: '....x.......x...', h: '..o...o...o...o.', b: 'xoxoxoxoxoxoxoxo', g: 'X.......X.......', l: '0.2.4.2.3.2.4.2.', swing: 0 },
  { name: 'Il giro della morte · metal', bpm: 184, root: 38, prog: [[0, 'm'], [1, 'M'], [0, 'm'], [-2, 'M']],
    k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x...x...x...x...', b: 'xxxxxxxxxxxxxxxx', g: 'xxx.xxx.xx.xX---', l: '', swing: 0 },
  { name: 'Ice Scrofy · eurodance sul ghiaccio', bpm: 134, root: 42, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [-7, 'M']],
    k: 'x...x...x...x...', s: '....x.......x...', h: '..o...o...o...o.', b: '.x.x.x.x.x.x.x.x', g: '', l: '0.2.4.3.4.2.4.2.', swing: 0 },
  { name: 'MotoFogna · grunge di fango', bpm: 88, root: 38, prog: [[0, 'm'], [1, 'M'], [-2, 'M'], [0, 'm']],
    k: 'x..x....x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: 'x---..x-x---..x.', g: 'X-----..X---x.x.', l: '', swing: .08 },
  { name: 'Valle Argentera · folk di montagna', bpm: 122, root: 43, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
    k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', b: 'x...5...x...5.o.', g: '..x.x...x.x...x.', l: '0.1.2...4.3.2...', swing: .1 },
  { name: 'MontaFiga · surf tra gli alberi', bpm: 172, root: 40, prog: [[0, 'M'], [5, 'M'], [0, 'M'], [7, 'M']],
    k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', b: 'x.o.x.o.x.o.x.o.', g: 'x.xxx.xxx.xxx.xx', l: '4.3.2.1.0.1.2.3.', swing: 0 },
  // v57 · Anti-GEV: la canzone vera del GaBbAH. Finché l'MP3 non è caricato suona un rock veloce di riserva.
  { name: 'Supereroi contro le GEV · Il GaBbAH', file: 'musica/supereroi-contro-le-gev.mp3', bpm: 160, root: 40, prog: [[0, 'M'], [-2, 'M'], [3, 'M'], [5, 'M']],
    k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: 'x.x.x.x.x.x.x.x.', g: 'x.xxx.xxx.xxx.xx', l: '', swing: 0 },
];
// v59 · canzoni vere del GaBbAH per quasi tutti i percorsi (il ritmo sintetico resta come riserva finché l'MP3 non è caricato)
STYLES[14] = { ...STYLES[0] };   // Gusta Ranch
const SONGS = {
  0: ['vai-ciccio', 'Vai Ciccio · Il GaBbAH'],
  1: ['lenduro-non-e-reato', 'L’enduro non è reato · Il GaBbAH'],
  2: ['angelo-potter', 'Angelo Potter · Il GaBbAH'],
  3: ['enduro-is-not-a-crime', 'Enduro is not a crime · Il GaBbAH'],
  9: ['suka-suka', 'Suka Suka · Il GaBbAH'],
  10: ['hell-can-wait', 'Hell can wait · Il GaBbAH'],
  11: ['kick-up-the-dust', 'Kick up the dust · Il GaBbAH'],
  14: ['gusta-ranch', 'Gusta Ranch'],
};
for (const [i, [f, n]] of Object.entries(SONGS)) STYLES[i] = { ...STYLES[i], file: 'musica/' + f + '.mp3', name: n };
// v57 · brani registrati (MP3): caricati una volta sola; la canzone riparte da dove si era fermata al giro prima.
const songBuf = {}, songPos = {};
async function loadSong(file) {
  if (songBuf[file] !== undefined) return songBuf[file];
  songBuf[file] = null;
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(res.status);
    songBuf[file] = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch (e) { songBuf[file] = undefined; console.warn('EDT canzone non caricata:', file, e); }
  return songBuf[file];
}
export function preloadSong(styleId) { const st = STYLES[styleId % STYLES.length]; if (st?.file && ensure()) loadSong(st.file); }
function playSong(m) {
  const buf = songBuf[m.style.file];
  if (!buf || music !== m || m.src) return;
  clearInterval(m.timer); m.timer = 0;   // basta riserva: parte la canzone vera
  let off = songPos[m.style.file] || 0; if (off > buf.duration - 20) off = 0;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(SONG_VOL, ctx.currentTime, .25);
  src.connect(g); g.connect(musicBus); src.start(ctx.currentTime + .03, off);
  m.src = src; m.songGain = g; m.songT0 = ctx.currentTime + .03 - off;
}
function stopSong(m, fade) {
  if (!m.src) return;
  const buf = songBuf[m.style.file];
  if (buf) songPos[m.style.file] = (ctx.currentTime - m.songT0) % buf.duration;
  const src = m.src, g = m.songGain; m.src = null;
  if (fade) { g.gain.setTargetAtTime(0, ctx.currentTime, .3); setTimeout(() => { try { src.stop(); } catch {} }, 1400); }
  else try { src.stop(); } catch {}
}
const SONG_VOL = 1.35;
let musicBus = null, gtrIn = null, music = null, musicOn = true;
try { musicOn = localStorage.getItem('edt-music') !== '0'; } catch {}
export const isMusicOn = () => musicOn;
export function setMusic(v) {
  musicOn = v; try { localStorage.setItem('edt-music', v ? '1' : '0'); } catch {}
  if (musicBus) musicBus.gain.setTargetAtTime(v ? MUSIC_VOL : 0, ctx.currentTime, .1);
}
const MUSIC_VOL = .34;
function musicGraph() {
  if (musicBus) return;
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0;
  musicBus.connect(duckBus);
  gtrIn = ctx.createGain(); gtrIn.gain.value = 2.2;
  const sh = ctx.createWaveShaper(); sh.curve = shaperCurve(9); sh.oversample = '4x';
  const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3200; cab.Q.value = .8;
  const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 800; mid.gain.value = -5;
  const out = ctx.createGain(); out.gain.value = .16;
  gtrIn.connect(sh); sh.connect(mid); mid.connect(cab); cab.connect(out); out.connect(musicBus);
}
function chordTones(root, q) { return [0, q === 'm' ? 3 : 4, 7, 12, q === 'm' ? 15 : 16].map(x => root + x); }
function mKick(t, v = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
  g.gain.setValueAtTime(.9 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .28);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .3);
}
function mNoise(t, dur, f, type, vol, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(musicBus); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
function mSnare(t) { mNoise(t, .16, 1900, 'bandpass', .5, .7); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + .08); g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .12); }
function mHat(t, open) { mNoise(t, open ? .22 : .045, 8000, 'highpass', open ? .16 : .12); }
function mBass(t, midi, dur) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = NOTE(midi);
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur); f.Q.value = 3;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.42, t + .008); g.gain.setTargetAtTime(.0001, t + dur * .85, .03);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + .15);
}
function mGtr(t, root, dur, muted) {
  // power chord: tonica + quinta + ottava, due oscillatori leggermente stonati per corda
  for (const iv of [0, 7, 12]) for (const det of [-6, 7]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = NOTE(root + 12 + iv); o.detune.value = det;
    const len = muted ? Math.min(dur, .09) : dur;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .006);
    g.gain.setTargetAtTime(.0001, t + len * .8, muted ? .02 : .08);
    o.connect(g); g.connect(gtrIn); o.start(t); o.stop(t + len + .3);
  }
}
function mLead(t, midi, dur, wave) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = wave; o.frequency.value = NOTE(midi);
  const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.5; vg.gain.value = 4; v.connect(vg); vg.connect(o.detune);
  f.type = 'lowpass'; f.frequency.value = 2600;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .01); g.gain.setTargetAtTime(.0001, t + dur * .85, .05);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); v.start(t); o.stop(t + dur + .3); v.stop(t + dur + .3);
}
function holdLen(str, i, step) { let n = 1; while (str[i + n] === '-') n++; return n * step; }
// legato: la nota dura fino alla successiva della stessa riga (massimo `max` sedicesimi)
function untilNext(str, i, step, max = 4) { let n = 1; while (n < max && i + n < 16 && (str[i + n] === '.' || str[i + n] === '-')) n++; return n * step; }
function scheduleStep(m, i, t) {
  const st = m.style, step = m.step, bar = Math.floor(m.n / 16) % st.prog.length;
  const [off, q] = st.prog[bar], root = st.root + off + (m.transpose || 0), tones = chordTones(root, q);
  const fill = m.n % 64 >= 60;                         // ogni 4 battute un piccolo stacco di rullante
  const intense = m.intensity;
  if (st.k[i] === 'x' && !(fill && i > 12)) mKick(t, .9);
  if (st.s[i] === 'x' || (fill && i >= 12)) mSnare(t);
  if (intense > .3 || st.h.trim()) { if (st.h[i] === 'x') mHat(t, false); else if (st.h[i] === 'o') mHat(t, true); }
  const bc = st.b[i];
  if (bc && bc !== '.' && bc !== '-') mBass(t, root - 12 + (bc === 'o' ? 12 : bc === '5' ? 7 : 0), untilNext(st.b, i, step, 4) * .95);
  const gc = st.g[i];
  if (gc === 'x' || gc === 'X') mGtr(t, root, gc === 'X' ? untilNext(st.g, i, step, 16) : step, gc === 'x');
  const lc = st.l[i];
  if (lc && /\d/.test(lc) && (intense > .45 || m.n % 32 >= 16)) mLead(t, tones[Number(lc)] + 12, untilNext(st.l, i, step, 4) * .9, st === STYLES[7] || st === STYLES[9] ? 'square' : 'triangle');
  if (m.n % 64 === 0 && m.n > 0) mNoise(t, 1.2, 6000, 'highpass', .12);   // piatto a inizio frase
}
export function musicStart(styleId = 0, opts = {}) {
  if (!ensure()) return;
  musicGraph();
  musicStop(true);
  const style = STYLES[styleId % STYLES.length];
  const m = { style, n: 0, step: 60 / style.bpm / 4, next: ctx.currentTime + .08, transpose: opts.transpose || 0, intensity: .5, timer: 0 };
  m.timer = setInterval(() => {
    if (!ctx || music !== m) return;
    while (m.next < ctx.currentTime + .14) {
      const i = m.n % 16, sw = (i % 2 === 1) ? style.swing * m.step * 2 : 0;
      scheduleStep(m, i, m.next + sw);
      m.next += m.step; m.n++;
    }
  }, 30);
  music = m;
  if (style.file) { if (songBuf[style.file]) playSong(m); else loadSong(style.file).then(() => playSong(m)); }
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, ctx.currentTime, .2);
}
export function musicIntensity(x) { if (music) music.intensity = Math.max(0, Math.min(1, x)); }
export function musicStop(now = false) {
  if (!music) return;
  const m = music; music = null;
  stopSong(m, !now);
  if (now) { clearInterval(m.timer); return; }
  musicBus.gain.setTargetAtTime(0, ctx.currentTime, .35);
  setTimeout(() => { clearInterval(m.timer); if (!music && musicBus) musicBus.gain.value = musicOn ? MUSIC_VOL : 0; }, 1500);
}
export const musicPlaying = () => !!music;
