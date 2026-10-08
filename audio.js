// EDT Giro Easy · v18
// Audio: incitamenti MP3 (mai sovrapposti), motore sintetizzato ed effetti.
// Tutto parte dopo il primo tocco dell'utente, come richiedono i browser.

import { VOCI } from './voci.js?v=36';
import { VOCI_PILOTI } from './voci-piloti.js?v=36';

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
export function preloadExtras() { if (ctx) for (const k of Object.keys(EXTRA)) loadExtra(k); }

export const sfx = {
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

// ---------- Motore ----------
// Due oscillatori a dente di sega con filtro: il regime segue velocità, gas e turbo.
export function engineStart() {
  if (!enabled || !ensure() || engine) return;
  const t = ctx.currentTime;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'square';
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 6;
  lfo.frequency.value = 23; lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfoGain.connect(o2.frequency);
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = 4;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.075, t + .3);
  const g2 = ctx.createGain(); g2.gain.value = .45;
  o1.connect(filter); o2.connect(g2); g2.connect(filter); filter.connect(g); g.connect(duckBus);
  o1.start(); o2.start(); lfo.start();
  engine = { o1, o2, lfo, filter, g, rpm: 0 };
  engineUpdate(.2, false, false, false);
}
export function engineUpdate(speed, gas, turbo, airborne) {
  if (!engine || !ctx) return;
  const target = Math.min(1.6, speed * (gas ? 1.12 : 1) * (turbo ? 1.25 : 1) + (airborne ? .35 : 0));
  engine.rpm += (target - engine.rpm) * .12;
  const f = 48 + engine.rpm * 62;
  const t = ctx.currentTime;
  engine.o1.frequency.setTargetAtTime(f, t, .05);
  engine.o2.frequency.setTargetAtTime(f * .5, t, .05);
  engine.lfo.frequency.setTargetAtTime(14 + engine.rpm * 22, t, .1);
  engine.filter.frequency.setTargetAtTime(420 + engine.rpm * 900 + (turbo ? 700 : 0), t, .06);
}
export function engineStop() {
  if (!engine || !ctx) return;
  const e = engine; engine = null;
  const t = ctx.currentTime;
  e.g.gain.cancelScheduledValues(t);
  e.g.gain.setTargetAtTime(0.0001, t, .12);
  setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.lfo.stop(); } catch {} }, 700);
}
