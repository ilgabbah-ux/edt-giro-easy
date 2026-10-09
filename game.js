// EDT Giro Easy · v18 — logica di gioco, interfaccia e condivisione
import { iceBend, JUMP_DURATION, JUMP_HEIGHT, SUPER_JUMP, OBSTACLE_HEIGHT, GAME_LENGTH, SECTIONS, clearsObstacle, isPerfectJump, jumpHeight, routeAt, paceFor, makeRng, setLayout, randomLayout, layoutSegments, SECTION_NAMES } from './physics.js?v=64';
import { createWorld } from './scene3d.js?v=64';
import * as A from './audio.js?v=64';
import * as P from './progress.js?v=64';
import { FOTO } from './piloti.js?v=64';
import { createMud } from './mudfx.js?v=64';
import { icon, iconize, iconizeEl } from './icons.js?v=64';
import * as C from './classifica.js?v=64';

const $ = id => document.getElementById(id);
const canvas = $('canvas');
let world = null, worldError = null;
try { world = createWorld(canvas); window.__world = world; } catch (e) { worldError = e; console.error('3D non disponibile', e); }
// v52 · moto in anteprima nel garage (gira da sola, si può trascinare per girarla)
let preview = null;
try { preview = world?.makePreview?.(document.getElementById('bikepreview')); } catch (e) { console.warn('anteprima moto non disponibile', e); }
{ const pv = document.getElementById('bikepreview'); let px0 = null;
  if (pv) { pv.addEventListener('pointerdown', e => { px0 = e.clientX; try { pv.setPointerCapture(e.pointerId); } catch {} });
    pv.addEventListener('pointermove', e => { if (px0 === null) return; preview?.spin((e.clientX - px0) * .012); px0 = e.clientX; });
    for (const ev of ['pointerup', 'pointercancel']) pv.addEventListener(ev, () => px0 = null); } }

// ---------- Piloti (abbinamenti foto conservati dalla v14) ----------
const RIDERS = ['Il Gabbah', 'Angelo', 'Miti', 'Claudio', 'Max', 'Purcello', 'Ciprian', 'Costa', 'Linus', 'Mirco', 'Luigi', 'Renard', 'Paletta', 'Andrea', 'Brizio', 'Sergio', 'Albo', 'Alex', 'Albertone', 'Erika', 'Maggie', 'Guccio'];
const PHOTOS = { 'Il Gabbah': 'gabbah', 'Angelo': 'angelo', 'Linus': 'linus', 'Costa': 'costa', 'Purcello': 'purcello', 'Renard': 'renard', 'Miti': 'miti', 'Mirco': 'mirco', 'Max': 'max', 'Paletta': 'paletta',
  'Claudio': 'claudio', 'Ciprian': 'ciprian', 'Luigi': 'luigi', 'Andrea': 'andrea', 'Brizio': 'brizio', 'Sergio': 'sergio', 'Albo': 'albo', 'Alex': 'alex', 'Erika': 'erika-face', 'Albertone': 'albertone', 'Maggie': 'maggie', 'Guccio': 'guccio' };
// Piloti con la loro voce (battute registrate su ElevenLabs): partenza, botta, arrivo.
const RIDER_VOICE = { 'Il Gabbah': 'gabbah', 'Angelo': 'angelo', 'Miti': 'miti', 'Costa': 'costa', 'Linus': 'linus', 'Purcello': 'purcello', 'Mirco': 'mirco', 'Renard': 'renard' };
const riderVoice = () => RIDER_VOICE[profile.rider];
let lastRiderHit = -99;
function riderLine(kind) {
  const rv = riderVoice(); if (!rv) return false;
  lastVoice = performance.now() / 1000;
  // v48 · Il Gabbah dopo una botta dice "Dopo migliora!" (registrazione nuova in arrivo: per ora solo la scritta)
  if (rv === 'gabbah' && kind === 'hit') bigCall('DOPO MIGLIORA!');   // v56 · ora con la sua voce (ElevenLabs, ILGABBAH)
  A.sayRider(rv + '_' + kind);
  return true;
}
// Abilità speciale di ogni pilota: cambia davvero il modo di giocare.
const SKILLS = {
  'Il Gabbah': { id: 'steady', icon: '🧭', name: 'Guida / tour operator', desc: 'Porta il gruppo: la combo dura 2 s in più e un errore la dimezza invece di azzerarla.' },
  'Angelo': { id: 'stones', icon: '🪨', name: 'Amico delle pietre', desc: 'Le rocce e i gradoni non gli costano la moto: lo rallentano e basta.' },
  'Miti': { id: 'drifter', icon: '⛸️', name: 'Re delle derapate', desc: 'Sul ghiaccio le derapate valgono il 50% in più.' },
  'Claudio': { id: 'sommelier', icon: '🍷', name: 'Sommelier', desc: 'Il vino dura il doppio e con il vino le birre valgono il triplo.' },
  'Max': { id: 'turbo', icon: '⚡', name: 'Turbo facile', desc: 'Il turbo si carica il 40% più in fretta.' },
  'Purcello': { id: 'nose', icon: '🍑', name: 'Ingroppatore', desc: 'Si attacca a tutto: prende le birre anche dalla corsia accanto.' },
  'Ciprian': { id: 'climb', icon: '⛰️', name: 'Salitone', desc: 'In salita non perde velocità, come se tenesse sempre il gas.' },
  'Costa': { id: 'amphibious', icon: '🐸', name: 'Anfibio', desc: 'Le pozzanghere non lo rallentano e non gli rompono la combo.' },
  'Linus': { id: 'scrub', icon: '🌀', name: 'Scrubber', desc: 'Due scrub per salto e punti tripli.' },
  'Mirco': { id: 'lion', icon: '🦁', name: 'Giovane leone', desc: 'Parte con una moto in più.' },
  'Luigi': { id: 'downhill', icon: '🔧', name: 'Spedivellatore', desc: 'In discesa spedivella: va il 25% più forte e fa punti doppi.' },
  'Renard': { id: 'veteran', icon: '👴', name: 'Il vecchio', desc: '+4 s di tempo massimo e 1 s in più di protezione dopo un urto.' },
  'Paletta': { id: 'spring', icon: '🐰', name: 'Bunny boy', desc: 'Salta come un coniglio: salti più alti del 15% e più lunghi del 10%.' },
  'Andrea': { id: 'precise', icon: '✴️', name: 'Precisione', desc: 'Salti perfetti molto più facili e pagati il doppio.' },
  'Brizio': { id: 'wheelie', icon: '🤘', name: 'Re dell’impennata', desc: 'Impennate fino a 6 s, punti doppi, Yee-haw a ogni impennata.' },
  'Sergio': { id: 'schettino', icon: '⚓', name: 'Capitan Schettino', desc: 'Abbandona la nave per primo: dopo ogni botta riparte con 2 s di turbo.' },
  'Alex': { id: 'rocket', icon: '🚀', name: 'Partenza a razzo', desc: 'Parte con il turbo già carico e nei primi 8 s va il 10% più forte.' },
  'Albertone': { id: 'tank', icon: '🐻', name: 'Carrarmato', desc: 'Le botte lo fermano la metà del tempo e la protezione dopo un urto dura 1 s in più.' },
  'Erika': { id: 'angel', icon: '💘', name: 'Ci pensa Giacu', desc: 'La prima botta di ogni giro non le costa la moto: arriva Giacu e la rimette in sella.' },
  'Maggie': { id: 'sprint', icon: '💨', name: 'Sprint finale', desc: 'Nell’ultimo quarto di giro va il 10% più forte e fa punti doppi.' },
  'Guccio': { id: 'blessed', icon: '⛪', name: 'Benedetto da San Braulio', desc: 'La grappa dura il 50% in più e gli ricarica metà turbo.' },
  'Albo': { id: 'dry', icon: '🚱', name: 'Acqua? Mai', desc: 'Immune alla bottiglia d’acqua: la spacca e fa punti.' },
};
let skill = '';
const has = id => skill === id;
const photoURL = name => PHOTOS[name] ? (FOTO[PHOTOS[name]] || 'piloti/' + PHOTOS[name] + '.jpg') : null;
function avatarHTML(name, cls = '') {
  const url = photoURL(name);
  return url
    ? `<span class="avatar ${cls}"><img src="${url}" alt="Foto di ${name}"></span>`
    : `<span class="avatar initials ${cls}" aria-label="${name}">${name.replace('Il ', '').slice(0, 2).toUpperCase()}</span>`;
}

// ---------- Stato ----------
const profile = P.profile;
if (!RIDERS.includes(profile.rider)) profile.rider = RIDERS[0];
let mode = Math.min(P.MODES.length - 1, Math.max(0, profile.mode | 0));
if (P.MODES[mode]?.hidden) mode = 0;   // v59 · percorso tolto: si torna al Giro easy
if (!P.isUnlocked(P.MODES[mode])) mode = 0;
// ---------- Tracciato del percorso scelto ----------
let runSeed = 1;
function layoutFor(m, fresh = false) {
  const md = P.MODES[m];
  if (md.random === 'daily') return randomLayout(makeRng(P.todayKey() * 7 + 13));
  if (md.random === 'run') { if (fresh) runSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0; return randomLayout(makeRng(runSeed)); }
  return md.layout;
}
const SEG_SHORT = ['BOSCO', 'POZZE', 'SALITA', 'MULA'];
function renderTrackbar() {
  const segs = layoutSegments();
  $('trackbar').querySelectorAll('.seg').forEach(e => e.remove());
  const html = segs.map(g => `<span class="seg s${g.t}${g.climb && g.t !== 2 ? ' up' : ''}${g.down ? ' down' : ''}" style="flex:${(g.to - g.from).toFixed(2)}" title="${g.name}">${P.MODES[mode].ice || P.MODES[mode].id >= 10 ? (g.to - g.from > 5 ? g.name.split(' ')[0] : '') : g.to - g.from > 9 ? SECTION_NAMES[g.t].split(' ')[0] : g.to - g.from > 5 ? SEG_SHORT[g.t] : ''}</span>`).join('');
  $('trackbar').insertAdjacentHTML('afterbegin', html);
}
function applyLayout(fresh = false) { setLayout(layoutFor(mode, fresh)); renderTrackbar(); }
// Mini-altimetria per le schede dei percorsi.
function stripHTML(layout) {
  const tot = layout.reduce((a, x) => a + x.len, 0);
  return `<span class="strip">${layout.map(x => `<i class="s${x.t}${x.climb && x.t !== 2 ? ' up' : ''}${x.down ? ' down' : ''}" style="flex:${(x.len / tot * 100).toFixed(1)}"></i>`).join('')}</span>`;
}
const ghostKey = () => P.MODES[mode].leap ? null : P.MODES[mode].random === 'daily' ? 'd' + P.todayKey() : P.MODES[mode].random ? null : String(mode);
let state = 'ready';
let lane = 1, px = 1, jump = 0, jumpBuffer = 0, elapsed = 0, score = 0, lives = 3, objects = [], spawn = 0, invincible = 0, last = 0, roadTime = 0;
let toastTime = 0, gas = false, wet = 0, routePhase = -1, countdown = 0, countStep = 0;
let combo = 0, comboTime = 0, charge = 0, turbo = 0, magnet = 0, wave = 0, prevSafe = 1, lastBigLog = -9, fxSerial = 0, fxKind = 'coin';
let lean = 0, bodyLean = 0, suspension = 0, springVelocity = 0, wheelPhase = 0, whip = 0, scrubbed = 0, shake = 0, speedNow = 1;
let rng = Math.random, run = null, announced = new Set(), missionCheck = 0, lastCheer = -10;
// v16: percorso a distanza con tempo massimo, moto con dinamica laterale, caduta e rallentatore.
// Fantasma del record: dove eri, secondo per secondo, nel tuo giro migliore arrivato al rifugio.
const GHOST_KEY = 'edt-ghost-v1';
let ghosts = {}; try { ghosts = JSON.parse(localStorage.getItem(GHOST_KEY) || '{}') || {}; } catch { ghosts = {}; }
let ghostSplits = [], ghostPassed = false, ghostNextSplit = 0;
function ghostCourse(t) {
  const k = ghostKey(), g = k && ghosts[k]; if (!g || !g.splits?.length) return null;
  const i = t * 2, a = Math.floor(i);
  if (a >= g.splits.length - 1) return GAME_LENGTH;
  return g.splits[a] + (g.splits[a + 1] - g.splits[a]) * (i - a);
}
let course = 0, vx = 0, crash = 0, stun = 0, slowmo = 0, slowScale = 1, timeLimit = 70, kmh = 0, warned = false;
const courseLength = diff => 60 * (1 + diff * .35) + 16; // distanza del percorso (unità di strada)
// v17: birre, vino (calamita), grappa (super salto), acqua (malus), orecchie da coniglio, impennata, discese.
let grappa = 0, waterT = 0, earsT = 0, earsPermanent = false, errors = 0;
let wheelie = false, wheelieHeld = false, wheelieT = 0, wheelieCD = 0, lastYee = -10, downAnnounced = false, lastSpecial = -9;
let jumpDur = JUMP_DURATION, jumpH = JUMP_HEIGHT;
let bs = {}; // v44 · caratteristiche della moto scelta in officina
// v46 · Ice Scrofy: derapate sul ghiaccio con le gomme chiodate
let slalomN = 0, lastFord = -9, lastAnimal = -9;
// v58 · ogni percorso ha la sua immagine (img/track-N.webp); alcune sono illustrazioni dedicate
const TRACK_ART_FILE = { 2: 'angelo-suuuka', 9: 'ice-scrofy', 13: 'anti-gev', 14: 'gusta-ranch' };
const psOf = m => Math.max(1, P.SHOWN().indexOf(m) + 1);   // v59 · numero di prova speciale contando solo i percorsi in menu
const trackArtOf = m => 'img/' + (TRACK_ART_FILE[m.id] || 'track-' + m.id) + '.webp?v=64';
// v57 · Anti-GEV: jeep delle Guardie Ecologiche Volontarie a bordo pista (z in metri davanti alla moto, negativo = davanti)
// v59 · salto di Angelo
let leapMul = 1, leapZRate = .5, leapFree = 1, canyonX0 = null, canyonLen = 400;
let leap = false, leapState = 0, leapPow = 0, leapPitch = 0, leapW = 0, leapStartT = 0, leapStartKmh = 0, leapDist = 0, leapBest = 0, lastHopAt = -9, leapEndT = 0, leapPerfect = false;
let gev = false, gevZ = 8, gevThrow = 4, gevArm = 0, gevLost = 0, gevGone = false, gevShout = 0, gevSide = 1, gevFine = 0;
const GEV_SHOUTS = ['📢 FERMO! GUARDIE ECOLOGICHE!', '📢 ACCOSTI LA MOTO!', '📢 DOCUMENTI E LIBRETTO!', '📢 QUI NON SI PUÒ PASSARE!', '📢 HA VISTO IL CARTELLO?', '📢 SCENDA DALLA MOTO!'];
const GEV_SOFT = new Set(['coin', 'helmet', 'wine', 'grappa', 'water', 'sgap', 'shortcut', 'gate', 'ramp', 'ford']);
// v48 · fantasma del primo nella classifica del gruppo
let gGhost = null, gGhostPassed = false;
// v50 · guida libera: la moto va dove la porti (niente più corsie fisse).
// steer = -1..1 (frecce, pulsanti, dito tenuto a lato, joypad) · aimPx = punto dove andare (mouse, dito trascinato).
let keyAt = { l: 0, r: 0 }, btnAt = { l: 0, r: 0 };
const TAP_MS = 190;   // tocco breve = una corsia intera (come prima); tenuto = sterzo libero
let keyL = false, keyR = false, btnL = false, btnR = false, zoneSteer = 0, padSteer = 0, aimPx = null, lastSteerDir = 0, edgeT = 0, lastEdgeMsg = -9;
const steerNow = () => Math.max(-1, Math.min(1, (keyR ? 1 : 0) - (keyL ? 1 : 0) + (btnR ? 1 : 0) - (btnL ? 1 : 0) + zoneSteer + padSteer + tiltSteer));
// v62 · sterzo inclinando il telefono (giroscopio): si attiva dal menu; lo "zero" è la posizione del telefono al via.
let tiltOn = false, tiltSteer = 0, tiltZero = null, tiltRaw = 0;
try { tiltOn = localStorage.getItem('edt-tilt') === '1'; } catch {}
function tiltAngle(e) {
  const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  if (a === 90) return e.beta;          // orizzontale, tasto home a destra
  if (a === -90 || a === 270) return -e.beta;
  return e.gamma;                       // verticale
}
window.addEventListener('deviceorientation', e => {
  if (!tiltOn || e.gamma === null) { tiltSteer = 0; return; }
  tiltRaw = tiltAngle(e) || 0;
  if (tiltZero === null) tiltZero = tiltRaw;
  const d = tiltRaw - tiltZero, dead = 3, full = 18;   // 3° di zona morta, sterzata piena a 18°
  tiltSteer = Math.abs(d) < dead ? 0 : Math.max(-1, Math.min(1, (d - Math.sign(d) * dead) / (full - dead)));
});
async function setTilt(on) {
  if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { toast('📱 PERMESSO AL GIROSCOPIO NEGATO', 'red'); on = false; } } catch { on = false; }
  }
  tiltOn = on; tiltZero = null; tiltSteer = 0;
  try { localStorage.setItem('edt-tilt', on ? '1' : '0'); } catch {}
  return on;
}
let throttleSlip = 0, overT = 0, wasSweet = false, gasLock = false, gasDownAt = 0, noClimbT = 0;
let ice = false, drift = 0, driftT = 0, driftSum = 0, driftPend = 0, driftChain = 0, driftGap = 9, driftScore = 0, driftBest = 0, driftCount = 0, snowT = 0, bendNow = 0, lastWall = -9;
// v41 · avversari EDT in pista, scorciatoie di Angelo e meteo che cambia
let rivals = [], lastSuka = -99, shortcutsDone = 0, nextShortcut = 0, shownPos = '';
let weather = { rain: 0, fog: 0, dusk: 0 }, weatherPlan = [], weatherSaid = '', lastRainMud = 0;
const curLift = () => jumpHeight(jump, jumpDur, jumpH);
// Potenziamenti dell'officina (letti a inizio giro) e premi del rifugio.
let up = { engine: 0, susp: 0, tank: 0, tyres: 0, helmet: 0, nose: 0, balance: 0, grit: 0 }, maxLives = 3, startBoosts = [];
const turboMax = () => 3 + up.tank * .4;
const comboMax = () => 4.5 + up.grit * .5 + (has('steady') ? 2 : 0) + (bs.combo || 0);
function breakCombo() { if (has('steady')) { combo = Math.floor(combo / 2); comboTime = combo ? comboMax() : 0; } else combo = comboTime = 0; }
const earsOn = () => earsPermanent || earsT > 0;

const newRun = () => ({ caps: 0, airCaps: 0, jumps: 0, perfect: 0, scrubs: 0, near: 0, maxMult: 1, turbos: 0, splashes: 0, hits: 0, magnets: 0, helmets: 0, grappas: 0, waters: 0, wheelies: 0, wheelieMax: 0, errors: 0, score: 0, ramps: 0, cleanSectors: 0 });

// ---------- Audio e incitamenti ----------
A.setEnabled(profile.sound !== false);
// Le voci MP3 sono preziose: almeno 12 s tra una voce e l'altra e 30 s prima di ripetere la stessa.
let lastVoice = -99; const lastClip = {};
function voice(text, force = false) {
  const key = /gas/i.test(text) ? 'gas' : /così|cosi/i.test(text) ? 'success' : 'vai';
  const now = performance.now() / 1000;
  if (!force && (now - lastVoice < 12 || now - (lastClip[key] ?? -99) < 30)) return;
  lastVoice = now; lastClip[key] = now;
  A.speak(text);
}
function cheer(text, force = false, withVoice = false) {
  if (!force && elapsed - lastCheer < 5) return;
  lastCheer = elapsed;
  toast(text);
  if (withVoice) voice(text);
}

// ---------- Messaggi a schermo ----------
// I messaggi scorrono in una colonna a sinistra, sotto il punteggio: la strada al centro resta libera.
let lastToast = '', lastToastAt = 0;
function toast(t, kind = '') {
  const now = performance.now();
  if (t === lastToast && now - lastToastAt < 1500) return;
  lastToast = t; lastToastAt = now;
  const feed = $('feed');
  while (feed.childElementCount >= 2) feed.firstElementChild.remove();   // v48 · al massimo 2 avvisi alla volta
  const el = document.createElement('div');
  el.className = 'msg ' + kind;
  el.innerHTML = iconize(t);
  feed.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 2100);
  toastTime = 2.2;
}
// Scritta enorme al centro (Campa giù!): ha un suo livello, non viene coperta dagli altri messaggi.
function bigCall(text) {
  const el = $('bigcall'); if (!el) return;
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function pop(text, kind = 'gold') {
  const layer = $('pops');
  while (layer.childElementCount > 2) layer.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'pop ' + kind;
  el.innerHTML = iconize(text);
  layer.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function flash(kind) {
  const g = $('game');
  g.classList.remove('flash-hit', 'flash-gold', 'flash-blue');
  void g.offsetWidth;
  g.classList.add('flash-' + kind);
}

// ---------- HUD ----------
let shownScore = -1, shownLives = -1;
function multiplier() { return Math.min(4, 1 + Math.floor(combo / 3)); }
let lastPU = '', segErrors = 0;
function hud() {
  const s = Math.floor(score);
  if (s !== shownScore) {
    $('score').textContent = String(s).padStart(5, '0');
    if (s - shownScore > 40) { $('scorebox').classList.remove('bump'); void $('scorebox').offsetWidth; $('scorebox').classList.add('bump'); }
    shownScore = s;
  }
  if (lives !== shownLives) {
    shownLives = lives;
    $('lives').innerHTML = Array.from({ length: Math.max(3, maxLives) }, (_, i) => `<i class="helmet ${i < lives ? '' : 'lost'}"></i>`).join('');
    $('lives').setAttribute('aria-label', lives + ' moto rimaste');
  }
  const live = state === 'playing' || state === 'countdown' || state === 'paused';
  $('posbox').hidden = !live || !rivals.length;
  if (live && rivals.length) { const p = racePos() + '°' + (ice ? '❄' : ''); if (p !== shownPos) { shownPos = p; $('pos').textContent = p; $('posof').textContent = 'DI ' + (rivals.length + 1); $('posbox').classList.remove('bump'); void $('posbox').offsetWidth; $('posbox').classList.add('bump'); } }
  const m = multiplier();
  $('multiplier').textContent = '×' + m;
  $('combocount').textContent = combo ? combo + ' IN SERIE' : 'COMBO';
  $('combobox').className = 'combobox m' + m + (comboTime > 0 && combo ? '' : ' idle');
  $('combotimer').style.transform = `scaleX(${combo ? comboTime / comboMax() : 0})`;
  const fill = turbo > 0 ? turbo / turboMax() * 100 : charge;
  $('chargefill').style.width = fill + '%';
  $('boost').disabled = state !== 'playing' || charge < 100 || turbo > 0;
  $('boost').classList.toggle('ready', charge >= 100 && turbo <= 0 && state === 'playing');
  $('boostlabel').textContent = turbo > 0 ? 'GAAAS! ×2' : charge >= 100 ? 'TURBO PRONTO' : 'TURBO ' + Math.floor(charge) + '%';
  $('jump').classList.toggle('airborne', jump > 0);
  $('game').classList.toggle('boosting', state === 'playing' && turbo > 0);
  $('game').classList.toggle('magnet', state === 'playing' && magnet > 0);
  $('game').classList.toggle('grappa', state === 'playing' && grappa > 0);
  $('game').classList.toggle('watery', state === 'playing' && waterT > 0);
  $('wheelie').classList.toggle('active', wheelie);
  $('wheelie').textContent = wheelie ? 'YEE-HAW! ' + wheelieT.toFixed(1) + 's' : 'IMPENNA';
  const left = Math.max(0, (state === 'ready' ? P.MODES[mode].limit : timeLimit) - elapsed);
  $('timer').textContent = left < 10 && state === 'playing' ? left.toFixed(1) : Math.ceil(left);
  $('timerbox').classList.toggle('final', state === 'playing' && left <= 10);
  $('trackmarker').style.left = (course / GAME_LENGTH * 100) + '%';
  $('pacemarker').style.left = Math.min(100, elapsed / timeLimit * 100) + '%';
  const gcHud = state === 'playing' || state === 'paused' ? ghostCourse(elapsed) : null;
  $('ghostmarker').hidden = gcHud === null;
  if (!gGhost || !(state === 'playing' || state === 'paused' || state === 'countdown')) $('gghost').hidden = true;
  if (gcHud !== null) { $('ghostmarker').style.left = (gcHud / GAME_LENGTH * 100) + '%'; $('ghostmarker').title = 'Record di ' + ghosts[ghostKey()].rider + ': ' + ghosts[ghostKey()].time.toFixed(1) + 's'; }
  $('trackbar').classList.toggle('behind', state === 'playing' && elapsed / timeLimit > course / GAME_LENGTH);
  $('kmh').textContent = kmh;
  const route = routeAt(course, roadTime * 19.5);
  document.querySelectorAll('#trackbar .seg').forEach((el, i) => el.classList.toggle('active', i === route.seg && state !== 'ready'));
  $('tracklabel').textContent = route.name + (wet > 0 ? ' · IMPANTANATO' : route.grade > .05 ? ' · SALITA ' + Math.round(route.grade * 100) + '%' : route.grade < -.05 ? ' · DISCESA ' + Math.round(-route.grade * 100) + '%' : '');
  const needGas = state === 'playing' && (ice || route.climb > .05 || route.rough > .05);
  $('gas').hidden = !needGas;
  $('gas').classList.toggle('held', gas);
  $('gas').setAttribute('aria-pressed', String(gas));
  $('gas').textContent = ice ? (overT > .1 ? 'TROPPO! MOLLA' : gas ? 'TRAVERSO!' : 'GAS = DERAPA') : gasLock ? '🔒 GAS BLOCCATO' : gas ? 'GAS APERTO!' : 'TIENI GAS';
  $('gas').classList.toggle('locked', gasLock);
  if (leap && live) {   // v59 · riquadro del salto: assetto della moto e metri
    $('driftbox').hidden = false;
    $('driftlabel').textContent = leapState === 2 ? 'IN VOLO · MUSO SU!' : leapState >= 3 ? 'SALTO' : 'VELOCITÀ DI RINCORSA';
    $('driftpts').textContent = leapState >= 2 ? (leapState === 2 ? leapDist : leapBest).toFixed(1).replace('.', ',') + ' m' : kmh + ' km/h';
    $('driftneedle').style.transform = `rotate(${(leapState === 2 ? -leapPitch * 70 : 0).toFixed(1)}deg)`;
    $('driftbox').classList.toggle('on', leapState === 2);
    $('driftbox').classList.toggle('sweet', leapState === 2 && Math.abs(leapPitch) < .5);
    $('driftchain').textContent = leapPerfect ? 'STACCO ★' : '';
  } else $('driftbox').hidden = !ice || !live;
  if (ice && live) {
    $('driftpts').textContent = driftT > 0 ? '+' + Math.round(driftPend).toLocaleString('it-IT') : Math.round(driftScore).toLocaleString('it-IT');
    $('driftlabel').textContent = driftT > 0 ? 'IN DERAPATA' : 'PUNTI DERAPATA';
    $('driftbox').classList.toggle('on', driftT > 0);
    $('driftbox').classList.toggle('sweet', driftT > 0 && Math.abs(drift) >= .3 && Math.abs(drift) <= .62);
    $('driftneedle').style.transform = `rotate(${(drift * 75).toFixed(1)}deg)`;
    $('driftchain').textContent = '×' + driftMult().toFixed(2).replace(/0$/, '').replace('.', ',');
  }
  const pu = [];
  if (magnet > 0) pu.push(`<span class="pu wine">🍷 VINO ${magnet.toFixed(1)}s</span>`);
  if (grappa > 0) pu.push(`<span class="pu grappa">🔥 GRAPPA ${grappa.toFixed(1)}s</span>`);
  if (waterT > 0) pu.push(`<span class="pu water">💧 ACQUA ${waterT.toFixed(1)}s</span>`);
  if (earsOn() && state === 'playing') pu.push('<span class="pu ears">🐰 ORECCHIE</span>');
  const html = pu.join('');
  if (lastPU !== html) { lastPU = html; $('powerups').innerHTML = iconize(html); }
}

// ---------- Punti e combo ----------
function reward(points, label, kind = 'coin', chain = true) {
  if (chain) { combo++; comboTime = comboMax(); }
  const m = multiplier();
  if (run) run.maxMult = Math.max(run.maxMult, m);
  const earned = Math.round(points * m * (turbo > 0 ? 2 : 1) * (1 + (bs.points || 0)));
  score += earned;
  if (turbo <= 0) charge = Math.min(100, charge + ({ jump: 20, perfect: 26, trick: 10, near: 8, smash: 0 }[kind] ?? 6) * (1 + up.tank * .1) * (has('turbo') ? 1.4 : 1) * (1 + (bs.turbo || 0)));
  fxKind = kind; fxSerial++;
  pop(label + ' +' + earned, kind === 'jump' || kind === 'perfect' ? 'white' : kind === 'trick' ? 'blue' : kind === 'near' ? 'small' : 'gold');
  if (kind === 'perfect') cheer('SÌÌÌ, COSÌ SI FA!', false, true);
  else if (chain && combo > 0 && combo % 9 === 0) { cheer('NON MOLLARE!', true); flash('gold'); }
  if (chain && combo === 9) toast('COMBO ×4 — MANICO VERO!', 'gold');
}

function boost() {
  if (state !== 'playing' || charge < 100 || turbo > 0) return;
  charge = 0; turbo = turboMax(); run.turbos++;
  toast('DAI GAS CICCIO!'); voice('Dai gas Ciccio!');
  A.sfx.turbo(); flash('gold'); shake = .5;
  hud();
}

// ---------- Avvio, conto alla rovescia, fine ----------
function setDisabled(v) {
  document.querySelectorAll('[data-rider],[data-livery]').forEach(b => b.disabled = v);
}
function resetRun() {
  gas = false; wet = 0; routePhase = -1; lane = px = 1; jump = jumpBuffer = elapsed = score = spawn = invincible = 0; lives = 3; objects = [];
  combo = comboTime = charge = turbo = magnet = wave = 0; prevSafe = 1; lastBigLog = -9; lastCheer = -10; roadTime = 0;
  lean = bodyLean = suspension = springVelocity = wheelPhase = whip = shake = 0; scrubbed = 0;
  ghostSplits = [0]; ghostPassed = false; ghostNextSplit = .5; course = vx = crash = stun = slowmo = kmh = 0; slowScale = 1; warned = false; timeLimit = P.MODES[mode].limit; skill = SKILLS[profile.rider]?.id || ''; if (has('veteran')) timeLimit += 4;
  grappa = waterT = earsT = errors = wheelieT = wheelieCD = segErrors = 0; earsPermanent = wheelie = wheelieHeld = downAnnounced = false; lastYee = -10; lastSpecial = -9; lastRiderHit = -99;
  jumpDur = JUMP_DURATION; jumpH = JUMP_HEIGHT;
  for (const k of Object.keys(up)) up[k] = P.upgradeLevel(k);
  maxLives = 3 + (up.helmet >= 2 ? 1 : 0) + (up.helmet >= 4 ? 1 : 0) + (has('lion') ? 1 : 0);
  const b = P.takeBoosts(); startBoosts = [];
  if (b.helmet) { maxLives++; startBoosts.push('CASCO DI SCORTA'); }
  lives = maxLives;
  if (b.turbo) { charge = 100; startBoosts.push('TURBO CARICO'); }
  if (has('rocket')) charge = 100;
  if (b.grappa) { grappa = 6; startBoosts.push('GRAPPA DEL RIFUGISTA'); }
  if (b.wine) { magnet = 7 + up.nose; startBoosts.push('BOTTIGLIA DI ROSSO'); }
  run = newRun(); announced = new Set(); shownScore = -1; shownLives = -1; mudFx.clear();
  rng = mode === 3 ? makeRng(P.todayKey()) : makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  applyLayout(true);
  bs = P.currentStats();
  ice = !!P.MODES[mode].ice;
  slalomN = 0; lastFord = lastAnimal = -9; setupGroupGhost();
  if (P.MODES[mode].ranch) objects.push({ l: -2.6, z: .78, type: 'farm', hit: false });   // v59 · la cascina del Gusta Ranch alla partenza
  leap = !!P.MODES[mode].leap; canyonX0 = null; leapMul = 1; leapZRate = .5; leapFree = 1; leapState = 0; leapPitch = leapW = leapDist = leapBest = 0; lastHopAt = -9; leapEndT = 0; leapPerfect = false;
  gev = !!P.MODES[mode].gev; gevZ = 9; gevThrow = 4.5; gevArm = gevLost = 0; gevGone = false; gevShout = 0; gevSide = 1; gevFine = 0;
  keyL = keyR = btnL = btnR = false; zoneSteer = padSteer = 0; aimPx = null; lastSteerDir = 0; edgeT = 0;
  throttleSlip = overT = noClimbT = 0; wasSweet = gasLock = false;
  drift = driftT = driftSum = driftPend = driftChain = driftScore = driftBest = driftCount = snowT = bendNow = 0; driftGap = 9; lastWall = -9;
  setupRace();
}
function start() {
  if (!world) return;
  if (touchDevice) goFull();
  if (!fsOK && isIOS && !standalone && !iosHinted) { iosHinted = true; setTimeout(() => toast('SCHERMO INTERO: CONDIVIDI → AGGIUNGI A HOME'), 4200); }
  A.unlock(); A.stopVoice(); A.preloadExtras(); if (riderVoice()) A.preloadRider(riderVoice());
  A.preloadRivals(Object.values(RIDER_VOICE)); A.preloadSong(mode);
  resetRun();
  state = 'countdown'; countdown = 3.2; countStep = 4;
  { const md = P.MODES[mode], ti = $('trackintro');   // v58 · cartolina del percorso durante il via
    ti.innerHTML = `<img src="${trackArtOf(md)}" alt=""><div><span>PS${psOf(md)} · ${md.limit} s</span><b>${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name}</b><small>${md.desc}</small></div>`;
    ti.className = 'trackintro'; void ti.offsetWidth; ti.className = 'trackintro show'; }
  $('overlay').classList.add('hidden');
  setMenu(false);
  $('pops').innerHTML = '';
  $('pause').innerHTML = icon('pause'); $('pause').setAttribute('aria-label', 'Pausa');
  setDisabled(true);
  A.engineStart();
  startMusic();
  hud();
}
// v38 · una colonna sonora per percorso; la Sfida del giorno cambia tonalità ogni giorno, Giro a caso ogni giro.
function startMusic() {
  const md = P.MODES[mode];
  const transpose = md.random === 'daily' ? (P.todayKey() % 5) - 2 : md.random === 'run' ? Math.floor(Math.random() * 5) - 2 : 0;
  A.musicStart(mode, { transpose });
}
function go() {
  state = 'playing'; tiltZero = null;   // v62 · lo zero del giroscopio è la posizione al VIA
  $('countdown').className = 'countdown go';
  $('trackintro').className = 'trackintro out';
  $('countdown').textContent = 'VIA!';
  setTimeout(() => { if (state !== 'countdown') $('countdown').className = 'countdown'; }, 700);
  toast('VAI CICCIO!'); if (!riderLine('start')) voice('Vai Ciccio!', true);
  if (startBoosts.length) setTimeout(() => toast('🎁 ' + startBoosts.join(' · '), 'green'), 1500);
  if (gev) { setTimeout(() => { if (state === 'playing') { bigCall('ARRIVANO LE GEV!'); A.sfx.whistle(); } }, 900); setTimeout(() => { if (state === 'playing') toast(`HAI ${lives} TENTATIVI: FINITI QUELLI ARRIVA LA MULTA`, 'red'); }, 2600); }
}

function finish(win, reason = '') {
  state = 'ended';
  A.engineStop(); A.stopVoice(); A.musicStop();
  setDisabled(false);
  if (ice) endDrift(true);
  const timeBonus = win && !leap ? Math.round((timeLimit - elapsed) * (ice ? 40 : 100)) : 0;
  if (win) score += lives * 250 + timeBonus;
  if (leap) score = win ? Math.round(leapBest * 100) + (leapPerfect ? 500 : 0) : 0;   // v59 · al Taglio di Angelo conta solo il salto: 100 punti a metro (+500 stacco perfetto)
  run.timeLeft = win ? Math.floor(timeLimit - elapsed) : 0;
  run.finishTime = win ? elapsed : 0;
  run.timeBonus = timeBonus; run.reason = reason;
  if (win && ghostKey() && (!ghosts[ghostKey()] || elapsed < ghosts[ghostKey()].time)) {
    ghostSplits.push(GAME_LENGTH);
    ghosts[ghostKey()] = { time: +elapsed.toFixed(2), rider: profile.rider, splits: ghostSplits.map(v => +v.toFixed(2)) };
    try { localStorage.setItem(GHOST_KEY, JSON.stringify(ghosts)); } catch {}
    run.ghostRecord = true;
  }
  run.position = rivals.length ? racePos() : 0;
  if (win && run.position === 1 && !leap) score += 500;
  score = Math.floor(score);
  run.score = score;
  const finished = win ? 1 : 0;
  Object.assign(run, {
    mode, rider: profile.rider,
    clean: finished && run.hits === 0 ? 1 : 0,
    dry: finished && run.splashes === 0 ? 1 : 0,
    angeloFinish: finished && mode === 2 ? 1 : 0,
    dailyFinish: finished && mode === 3 ? 1 : 0,
    drift: ice ? Math.round(driftScore) : 0,
  });
  const res = P.recordRun(run);
  if (gev && !win) {   // v57 · fermato dalle GEV: multa in birre
    gevFine = Math.min(20, P.profile.beers); P.profile.beers -= gevFine; P.save(); res.wallet = P.profile.beers;
  }
  hud();
  $('banner').classList.remove('show');
  renderResult(win, res, reason, timeBonus);
  if (gev) A.sfx.whistle();
  if (win || res.isRecord) { A.sfx.fanfare(); if (win) setTimeout(() => { if (!riderLine('win')) voice('Sììì, così si fa!', true); }, 900); }
  else A.sfx.lose();
  renderSide();
}

function pause() {
  if (state === 'playing' || state === 'countdown') {
    gas = false; A.stopVoice(); A.engineStop(); A.musicStop();
    state = 'paused';
    $('overlay').classList.remove('hidden'); $('coach').classList.remove('show');
    $('card').innerHTML = `<div class="eyebrow">SOSTA TECNICA</div><h1>ASPETTIAMO<br><em>IL GRUPPO.</em></h1>
      <p>Nessuno resta indietro.</p>
      <button class="primary" id="resume"><span>RIPARTIAMO</span>${icon('chevrons')}</button><br>
      <button class="secondary" id="musictoggle" type="button">${A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO'}</button>
      <button class="secondary" id="quit">ABBANDONA IL GIRO</button>`;
    $('resume').onclick = pause;
    $('musictoggle').onclick = () => { A.setMusic(!A.isMusicOn()); $('musictoggle').innerHTML = iconize(A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO'); };
    $('quit').onclick = () => { state = 'ready'; setDisabled(false); renderReady(); };
    $('pause').innerHTML = icon('play'); $('pause').setAttribute('aria-label', 'Riprendi');
    hud();
  } else if (state === 'paused') {
    if (touchDevice) goFull();
    state = countdown > 0 ? 'countdown' : 'playing';
    A.engineStart(); startMusic();
    $('overlay').classList.add('hidden');
    $('pause').innerHTML = icon('pause'); $('pause').setAttribute('aria-label', 'Pausa');
    hud();
  }
}

// ---------- Comandi ----------
function move(d) {
  if (state !== 'playing') return;
  const from = aimPx ?? Math.round(px);
  aimPx = Math.max(0, Math.min(2, Math.round(from) + d));
}
// Scrub: sterzare in volo (cambio di direzione mentre sei in aria).
function scrubCheck(dir) {
  if (dir && dir !== lastSteerDir && jump > 0 && scrubbed < (has('scrub') ? 2 : 1) && curLift() > .6) {
    scrubbed++; whip = dir; run.scrubs++;
    A.sfx.scrub();
    reward(has('scrub') ? 180 : 60, 'SCRUB!', 'trick', false);
  }
  lastSteerDir = dir;
}
// Sterzo libero: velocità laterale verso quella voluta, con accelerazione (più lenta su sassi e fango).
function steerStep(dt, route) {
  const st = steerNow();
  if (st) aimPx = null;
  const maxLat = 4.1 * (1 + (bs.steer || 0)) * (1 + up.tyres * .05) * (touchDevice ? 1.08 : 1) * (1 - route.rough * .18) * (1 - weather.rain * .12) * (has('mule') && route.rough > .4 ? 1.3 : 1);
  const want = st ? st * maxLat : aimPx !== null ? Math.max(-maxLat, Math.min(maxLat, (aimPx - px) * 7.5)) : 0;
  const acc = (17 - route.rough * 4) * (wet > 0 ? .6 : 1) * (1 + (bs.steer || 0) * .5);
  vx += (want - vx) * Math.min(1, dt * acc);
  px += vx * dt;
  if (aimPx !== null && Math.abs(aimPx - px) < .02 && Math.abs(vx) < .15) { px += (aimPx - px) * .5; }
  const dir = st || (aimPx !== null && Math.abs(aimPx - px) > .25 ? Math.sign(aimPx - px) : 0);
  scrubCheck(dir);
  // bordi della pista: la fettuccia ti tiene dentro e rallenta un attimo
  if (px < -.45 || px > 2.45) {
    px = Math.max(-.45, Math.min(2.45, px)); vx = 0; edgeT = .35;
    if (elapsed - lastEdgeMsg > 3) { lastEdgeMsg = elapsed; pop('FETTUCCIA!', 'small'); }
  }
  edgeT = Math.max(0, edgeT - dt);
}
function takeoff() {
  const sup = grappa > 0;
  jumpDur = (sup ? SUPER_JUMP.duration : JUMP_DURATION) * (1 + up.susp * .03); jumpH = (sup ? SUPER_JUMP.height : JUMP_HEIGHT) * (1 + up.susp * .05) * (has('spring') ? 1.15 : 1) * (1 + (bs.jump || 0)); if (has('spring')) jumpDur *= 1.1;
  jump = jumpDur; scrubbed = 0; A.sfx.jump();
  if (wheelie) endWheelie(false);
}
function hop() {
  if (state !== 'playing') return;
  lastHopAt = elapsed;
  if (leap && leapState === 2) return;   // v59 · in volo dal trampolino non si risalta
  if (jump <= 0) takeoff();
  else if (jump < .18) jumpBuffer = .2; // premuto un attimo prima di atterrare: salta appena tocca terra
}

// Impennata: tieni premuto IMPENNA (o S / freccia giù). Più dura, più punti; oltre 3 secondi la ruota torna giù.
function startWheelie() {
  wheelieHeld = true;
  if (state !== 'playing' || jump > 0 || wheelie || wheelieCD > 0 || crash > 0) return;
  wheelie = true; wheelieT = 0; run.wheelies++;
  A.sfx.wheelie();
  if (elapsed - lastYee > (has('wheelie') ? 2 : 8)) { lastYee = elapsed; A.say('yeehaw'); pop('YEE-HAW!', 'white'); }
}
function endWheelie(tooLong) {
  if (!wheelie) return;
  wheelie = false; wheelieCD = .5;
  run.wheelieMax = Math.max(run.wheelieMax, wheelieT);
  if (wheelieT > .4) reward(Math.round(wheelieT * 110), 'IMPENNATA ' + wheelieT.toFixed(1).replace('.', ',') + 's', 'trick');
  if (tooLong) pop('TROPPO LUNGA! GIÙ LA RUOTA', 'small');
}
function stopWheelieInput() { wheelieHeld = false; }

// Errori (urti e pozzanghere): dopo più di 3, orecchie da coniglio fino al rifugio.
// Orecchie da coniglio fino al rifugio al 3° errore (urti, pozzanghere, acqua) o quando resta l'ultima moto.
function mistake() {
  errors++; run.errors = errors;
  if (!earsPermanent && (errors >= 3 || lives === 1)) {
    earsPermanent = true; A.sfx.ears();
    setTimeout(() => toast(lives === 1 ? '🐰 ULTIMA MOTO: ORECCHIE DA CONIGLIO!' : '🐰 TRE ERRORI: ORECCHIE DA CONIGLIO!', 'pink'), 900);
  }
}

// v49 · GAS: tieni premuto = gas finché tieni; un tocco veloce = GAS BLOCCATO fino alla fine della salita (sul ghiaccio solo tenuto: va dosato)
$('gas').onpointerdown = e => { e.preventDefault(); if (state === 'playing') { gas = true; gasDownAt = performance.now(); $('gas').setPointerCapture(e.pointerId); } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('gas').addEventListener(ev, () => {
  if (!gasDownAt) return;
  const tap = performance.now() - gasDownAt < 230; gasDownAt = 0;
  if (tap && !ice && state === 'playing') { gasLock = !gasLock; noClimbT = 0; if (gasLock) toast('🔒 GAS BLOCCATO: TOCCA ANCORA PER MOLLARE', 'green'); }
  gas = gasLock;
});
window.addEventListener('keyup', e => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key) && keyL) { keyL = false; if (performance.now() - keyAt.l < TAP_MS) move(-1); }
  if (['ArrowRight', 'd', 'D'].includes(e.key) && keyR) { keyR = false; if (performance.now() - keyAt.r < TAP_MS) move(1); } if (e.key.toLowerCase() === 'w') gas = false; if (['s', 'S', 'ArrowDown'].includes(e.key)) stopWheelieInput(); });
window.addEventListener('blur', () => { gas = false; keyL = keyR = btnL = btnR = false; zoneSteer = 0; if (state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'playing' || state === 'countdown')) pause(); });
$('left').onpointerdown = e => { e.preventDefault(); btnL = true; btnAt.l = performance.now(); try { $('left').setPointerCapture(e.pointerId); } catch {} };
$('right').onpointerdown = e => { e.preventDefault(); btnR = true; btnAt.r = performance.now(); try { $('right').setPointerCapture(e.pointerId); } catch {} };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('left').addEventListener(ev, () => { if (btnL && performance.now() - btnAt.l < TAP_MS) move(-1); btnL = false; });
  $('right').addEventListener(ev, () => { if (btnR && performance.now() - btnAt.r < TAP_MS) move(1); btnR = false; });
}
$('jump').onpointerdown = e => { e.preventDefault(); hop(); };
$('boost').onpointerdown = e => { e.preventDefault(); boost(); };
$('wheelie').onpointerdown = e => { e.preventDefault(); $('wheelie').setPointerCapture(e.pointerId); startWheelie(); };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('wheelie').addEventListener(ev, stopWheelieInput);
$('pause').onclick = pause;
$('sound').onclick = () => {
  const on = !A.isEnabled();
  A.unlock(); A.setEnabled(on); profile.sound = on; P.save();
  syncSound();
  if (on) { A.sfx.click(); if (state === 'playing') A.engineStart(); } else A.engineStop();
};
function syncSound() {
  const on = A.isEnabled();
  $('sound').classList.toggle('off', !on);
  $('sound').innerHTML = icon(on ? 'speaker' : 'mute');
  $('sound').setAttribute('aria-pressed', String(on));
  $('sound').setAttribute('aria-label', on ? 'Disattiva audio e incitamenti' : 'Attiva audio e incitamenti');
  $('sound').title = on ? 'Audio attivo' : 'Audio disattivato';
}
syncSound();
// v34 · Schermo intero: su telefono e tablet parte da solo quando si accende la moto.
const fsTarget = $('game');
let iosHinted = false;
const fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const touchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const inFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function goFull() {
  if (!fsOK || inFull()) return;
  try {
    const r = (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget, { navigationUI: 'hide' });
    r?.catch?.(() => {});
  } catch {}
}
function exitFull() { if (inFull()) try { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); } catch {} }
if (!fsOK) $('fullscreen').hidden = $('ovfull').hidden = true;
// v47 · schermo intero anche dai menu (officina, classifica, risultati): pulsante fisso in alto a destra
$('ovfull').onclick = () => { if (inFull()) exitFull(); else goFull(); };
// v48 · i pannelli a destra (pilota, garage, classifica, come si sopravvive) si aprono a tutto schermo con un tocco
// e hanno il pulsante per tornare al menu principale.
let maxPanel = null;
function openPanel(sec) {
  if (maxPanel) closePanel(false);
  maxPanel = sec; sec.classList.add('panelmax'); document.body.classList.add('panelopen');
  sec.scrollTop = 0;
  if (fsOK) try { const r = (sec.requestFullscreen || sec.webkitRequestFullscreen).call(sec, { navigationUI: 'hide' }); r?.catch?.(() => {}); } catch {}
  A.unlock(); A.sfx.click();
}
function closePanel(toMenu = true) {
  const sec = maxPanel; if (!sec) return;
  maxPanel = null; sec.classList.remove('panelmax'); document.body.classList.remove('panelopen');
  if (inFull()) exitFull();
  if (toMenu) {
    if (state === 'ready' || state === 'ended') { state = 'ready'; renderReady(); }
    setTimeout(() => window.scrollTo({ top: Math.max(0, $('game').getBoundingClientRect().top + window.scrollY - 6), behavior: 'auto' }), 350);
  }
}
document.querySelectorAll('aside > .panel').forEach(sec => {
  const bar = document.createElement('div'); bar.className = 'panelbar';
  bar.innerHTML = `<button type="button" class="panelback">⬅ MENU PRINCIPALE</button><button type="button" class="icon panelexp" aria-label="Apri a schermo intero" title="Apri a schermo intero">${icon('expand')}</button>`;
  sec.prepend(bar);
  bar.querySelector('.panelexp').onclick = () => maxPanel === sec ? closePanel() : openPanel(sec);
  bar.querySelector('.panelback').onclick = () => closePanel(true);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && maxPanel) closePanel(true); });
// v53 · i pannelli a lato sono schede: se ne vede una alla volta
function showHub(name) {
  $('hub').dataset.hub = name;
  document.querySelectorAll('[data-hubtab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.hubtab === name)));
  try { localStorage.setItem('edt-hub', name); } catch {}
  if (name === 'garage') preview?.refresh?.();
}
document.querySelectorAll('[data-hubtab]').forEach(b => b.onclick = () => { if (maxPanel) closePanel(false); showHub(b.dataset.hubtab); A.sfx.click(); });
try { const h = localStorage.getItem('edt-hub'); if (h && document.querySelector(`[data-hubtab="${h}"]`)) showHub(h); } catch {}
$('fullscreen').onclick = () => { if (inFull()) exitFull(); else goFull(); };
function onFsChange() {
  if (!inFull() && maxPanel && fsOK) closePanel(true);
  document.body.classList.toggle('isfull', inFull());
  $('ovfull').innerHTML = icon(inFull() ? 'shrink' : 'expand'); $('ovfull').setAttribute('aria-label', inFull() ? 'Esci dallo schermo intero' : 'Schermo intero');
  if (state === 'ready' && !$('shoptitle') && $('start')) renderReady();
  setTimeout(() => world?.resize(), 60); setTimeout(() => world?.resize(), 400);
  if (!inFull() && state === 'playing' && touchDevice) pause();
}
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (k.toLowerCase() === 'w') { e.preventDefault(); if (state === 'playing') gas = true; return; }
  if (['s', 'S', 'ArrowDown'].includes(k)) { e.preventDefault(); if (!e.repeat) startWheelie(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'p', 'P', 'Shift', 'b', 'B', 'Enter'].includes(k)) {
    if (k === 'Enter' && document.activeElement && document.activeElement.tagName === 'BUTTON' && state !== 'playing') return;
    e.preventDefault();
    if (e.repeat) return;
    if (['ArrowLeft', 'a', 'A'].includes(k)) { keyL = true; keyAt.l = performance.now(); }
    if (['ArrowRight', 'd', 'D'].includes(k)) { keyR = true; keyAt.r = performance.now(); }
    if ([' ', 'ArrowUp', 'Enter'].includes(k)) { if (state === 'ready' || state === 'ended') start(); else hop(); }
    if (k.toLowerCase() === 'p') pause();
    if (k === 'Shift' || k.toLowerCase() === 'b') boost();
  }
});

let touch = null;
// ---------- Mouse (PC): la moto segue il puntatore ----------
// Muovi il mouse a destra/sinistra = corsia · clic sinistro = salto · tasto destro tenuto = GAS in salita
// (impennata in piano) · rotellina o clic centrale = turbo.
let mouseOn = false, rightHeld = false, lastWheel = 0;
// Mouse: la moto va dove punti (centro dello schermo = centro pista).
function mouseAim(x) {
  const r = canvas.getBoundingClientRect(), u = (x - r.left) / r.width;
  return Math.max(-.4, Math.min(2.4, 1 + (u - .5) * 4.4));
}
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || state !== 'playing') return;
  if (!mouseOn) { mouseOn = true; $('game').classList.add('mouseon'); }
  aimPx = mouseAim(e.clientX);
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
// v35 · tenendo premuto su telefono non deve aprirsi il menu di Chrome (Scarica/Stampa/Condividi).
['contextmenu', 'selectstart', 'dragstart'].forEach(t => $('game').addEventListener(t, e => { if (!e.target.closest?.('input, textarea, a[href]')) e.preventDefault(); }, true));
// v36 · Chrome Android apre il menu della pagina con la pressione lunga anche così: si blocca alla radice.
// touchstart annullato su comandi e strada = niente pressione lunga (i comandi vanno con i pointer event).
const noLongPress = e => { if (e.cancelable) e.preventDefault(); };
[canvas, document.querySelector('.controls'), $('gas')].forEach(el => el && ['touchstart', 'touchmove', 'touchend'].forEach(t => el.addEventListener(t, noLongPress, { passive: false })));
window.addEventListener('contextmenu', e => { if (state === 'playing' || state === 'countdown' || e.target.closest?.('.game, .controls')) { e.preventDefault(); e.stopPropagation(); } }, true);
canvas.addEventListener('wheel', e => { if (state !== 'playing') return; e.preventDefault(); const now = performance.now(); if (now - lastWheel > 400) { lastWheel = now; boost(); } }, { passive: false });
function rightDown() {
  rightHeld = true;
  const r = routeAt(course, roadTime * 19.5);
  if (ice || r.climb > .05 || r.rough > .05) gas = true; else startWheelie();
}
function rightUp() { if (!rightHeld) return; rightHeld = false; gas = false; stopWheelieInput(); }
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 2) rightUp(); });
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') {
    e.preventDefault();
    if (state !== 'playing') return;
    mouseOn = true; $('game').classList.add('mouseon');
    if (e.button === 0) hop();
    else if (e.button === 2) rightDown();
    else if (e.button === 1) boost();
    return;
  }
  // v44 · Touch più sensibile: tocca a sinistra/destra = corsia subito; trascina il dito = una corsia ogni ~1 cm
  // (anche più corsie di fila, senza staccare il dito); scorri in su = salto immediato; tocco al centro = salto.
  if (state !== 'playing') return;
  const r = canvas.getBoundingClientRect(), u = (e.clientX - r.left) / r.width;
  // v50 · guida libera: tieni il dito a sinistra/destra = sterzi finché tieni; trascina = la moto segue il dito
  touch = { x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, t: performance.now(), id: e.pointerId, zone: u < .36 ? -1 : u > .64 ? 1 : 0, drag: false, jumped: false, startPx: px };
  zoneSteer = touch.zone;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('pointercancel', () => { touch = null; zoneSteer = 0; });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' || !touch || e.pointerId !== touch.id || state !== 'playing') return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.ay;
  // trascinando: la moto segue il dito (circa 1 corsia ogni 2,7 cm di schermo... in proporzione alla larghezza)
  if (touch.drag || (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - touch.y) * .8)) {
    if (!touch.drag) { touch.drag = true; touch.startPx = px; touch.x = e.clientX; }
    zoneSteer = 0;
    const lanePx = Math.max(60, canvas.getBoundingClientRect().width * .2);
    aimPx = Math.max(-.4, Math.min(2.4, touch.startPx + (e.clientX - touch.x) / lanePx));
  }
  // scatto in su: salto subito, senza aspettare che il dito si stacchi
  if (!touch.jumped && e.clientY - touch.ay < -38 && Math.abs(e.clientY - touch.ay) > Math.abs(e.clientX - touch.ax) * 1.2) { touch.jumped = true; touch.drag = true; hop(); }
});
canvas.addEventListener('pointerup', e => {
  if (e.pointerType === 'mouse') { if (e.button === 2) rightUp(); return; }
  if (!touch || e.pointerId !== touch.id) return;
  zoneSteer = 0;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y, quick = performance.now() - touch.t < 600;
  if (!touch.drag && touch.zone && performance.now() - touch.t < TAP_MS + 30) move(touch.zone);   // tocco breve a lato = una corsia
  if (!touch.drag) {
    if (dy > 40 && Math.abs(dy) > Math.abs(dx)) { startWheelie(); setTimeout(stopWheelieInput, 1400); } // in giù: impennata
    else if (!touch.zone && quick && Math.abs(dx) < 18 && Math.abs(dy) < 18) hop();       // tocco al centro: salto
  }
  touch = null;
});

// ---------- Joypad (Xbox/PlayStation/Switch su PC, Android, iPad) ----------
// Stick o croce = corsia · A/✕ = salta (e parti) · B/○ = impenna · RT/R2 = gas · X/□ o RB = turbo · Start = pausa.
const padPrev = {};
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const b = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > .5));
    const ax = pad.axes[0] || 0;
    const now = { left: b(14) || ax < -.55, right: b(15) || ax > .55, a: b(0), b: b(1), x: b(2) || b(5), rt: b(7) || b(6), start: b(9) };
    const prev = padPrev[pad.index] || {};
    const pressed = k => now[k] && !prev[k];
    padSteer = Math.abs(ax) > .18 ? Math.max(-1, Math.min(1, (Math.abs(ax) - .18) / .62 * Math.sign(ax))) : b(14) ? -1 : b(15) ? 1 : 0;   // v50 · stick analogico
    if (pressed('a')) { if (state === 'ready' || state === 'ended') start(); else hop(); }
    if (pressed('b')) startWheelie();
    if (!now.b && prev.b) stopWheelieInput();
    if (pressed('x')) boost();
    if (state === 'playing' && now.rt !== !!prev.rt) gas = now.rt;
    if (pressed('start')) pause();
    padPrev[pad.index] = now;
  }
}
window.addEventListener('gamepadconnected', () => toast('🎮 JOYPAD COLLEGATO: A SALTA · B IMPENNA · RT GAS', 'green'));

// ---------- Ondate di ostacoli ----------
// Ogni fila lascia sempre una corsia libera, indicata dalle birre. Ogni sezione ha i suoi ostacoli.
const SECTION_OBS = [
  ['log', 'rock', 'root', 'stump', 'stump'],   // sottobosco: tronchi, radici, ceppi
  ['puddle', 'hay', 'puddle', 'log'],          // pozzanghere: pozze e balle di fieno
  ['step', 'rock', 'cairn', 'step'],           // salitone: gradoni, massi, ometti di pietra
  ['rock', 'step', 'goat', 'root', 'goat'],    // mulattiera: sassi, gradoni, capre
];
function pick(list) { return list[Math.floor(rng() * list.length)]; }
// v46 · Ice Scrofy: poche file di ostacoli (balle di fieno e pupazzi di neve), birre e "porte" da passare in derapata.
function spawnIceWave() {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  let safe = Math.floor(rng() * 3);
  if (safe === prevSafe && rng() < .5) safe = (safe + 1 + Math.floor(rng() * 2)) % 3;
  prevSafe = safe;
  if (wave > 0 && rng() < .55) add(safe, .08, 'gate');
  for (let i = 0; i < 3; i++) add(safe, (wave > 0 && i === 0 ? .0 : .08) - i * .1, i === 1 && wave > 3 && lives < maxLives && rng() < .08 ? 'helmet' : 'coin');
  if (wave > 1) {
    const other = (safe + 1 + Math.floor(rng() * 2)) % 3;
    add(other, .08, rng() < .5 ? 'snowman' : 'hay');
    if (wave > 4 && rng() < .3) add(3 - safe - other, -.06, rng() < .5 ? 'snowman' : 'hay');
  }
  wave++;
}
// v46 · MontaFiga: slalom continuo tra gli alberi, il varco si sposta di una corsia a ogni fila.
function spawnSlalomWave() {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  let g = prevSafe + (rng() < .5 ? -1 : 1);
  if (g < 0) g = 1; if (g > 2) g = 1;
  if (wave < 2) g = 1;
  prevSafe = g;
  for (let l = 0; l < 3; l++) if (l !== g) add(l, .08, 'tree', { lean: (rng() - .5) * .3 });
  add(g, .08, 'sgap');
  add(g, .02, 'coin'); add(g, -.06, 'coin');
  if (wave > 3 && rng() < .07) add(g, -.12, lives < maxLives ? 'helmet' : 'wine');
  wave++;
}
// v46 · Valle Argentera: guado su tutta la pista (da saltare) e animali selvatici che attraversano.
function spawnWildSpecial(section) {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  if ((section === 1 || rng() < .3) && wave - lastFord > 2 && rng() < .45) {
    lastFord = wave;
    add(1, .08, 'ford');
    for (let k = -2; k <= 2; k++) { const dz = k * .05, lift = 2.05 * Math.max(0, Math.cos(dz / .5 / JUMP_DURATION * Math.PI)) + .1; add(prevSafe, .08 - dz, 'coin', { air: true, lift: Math.max(.35, lift) }); }
    if (wave - lastAnimal > 3) toast('GUADO! SALTA O TI BAGNI I PIEDI', 'blue');
    wave++; return true;
  }
  if (wave - lastAnimal > 2 && rng() < .32) {
    lastAnimal = wave;
    const type = pick(['ibex', 'ibex', 'chamois', 'chamois', 'goat']);
    const lEnd = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1, k = dir * 2.4 / .83;
    add(lEnd - (.91 - .08) * k, .08, type, { roll: true, lEnd, k, cross: dir });
    const beerLane = (lEnd + 1 + Math.floor(rng() * 2)) % 3;
    add(beerLane, .02, 'coin'); add(beerLane, -.08, 'coin');
    toast({ ibex: 'STAMBECCO IN PISTA!', chamois: 'CAMOSCIO! OCCHIO!', goat: 'CAPRA SELVATICA!' }[type], 'gold');
    prevSafe = beerLane; wave++; return true;
  }
  return false;
}
function spawnWave() {
  if (leap) return spawnLeapWave();
  if (ice) return spawnIceWave();
  if (P.MODES[mode].slalom) return spawnSlalomWave();
  if (P.MODES[mode].wild && wave > 1 && spawnWildSpecial(routeAt(course, roadTime * 19.5).id)) return;
  const r = routeAt(course, roadTime * 19.5), section = r.id, diff = P.MODES[mode].difficulty;
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  const md = P.MODES[mode];
  const obs = () => pick(md.obs?.[section] || SECTION_OBS[section]);
  const zSpeed = (1 + diff * .35 + elapsed / 100) * speedNow * 19.5 / 55;

  // Mulattiera: frana! Un sasso rotola giù dalla parete e attraversa le corsie.
  if (section === 3 && wave > 1 && wave - lastSpecial > 2 && rng() < .3 + diff * .07) {
    lastSpecial = wave;
    const lEnd = Math.floor(rng() * 3), k = 3.2 / .83;
    add(lEnd - (.91 - .08) * k, .08, 'rollRock', { roll: true, lEnd, k });
    const beerLane = (lEnd + 1 + Math.floor(rng() * 2)) % 3;
    add(beerLane, .02, 'coin'); add(beerLane, -.08, 'coin');
    toast('FRANA! OCCHIO AI SASSI', 'red');
    prevSafe = beerLane; wave++;
    return;
  }

  // Rampa: sulla linea buona, con una fila di birre al volo. Le altre corsie sono chiuse.
  if (!md.ranch && section !== 3 && wave > 3 && wave - lastBigLog > 2 && rng() < .13) {
    lastBigLog = wave;
    const l = prevSafe;
    add(l, .08, 'ramp');
    for (let k = 1; k <= 5; k++) {
      const dz = k * .055, dt = dz / zSpeed, ph = Math.min(1, dt / 1.45);
      add(l, .08 - dz, 'coin', { air: true, lift: Math.max(.6, Math.sin(ph * Math.PI) * 3.0 + .1) });
    }
    for (let o = 0; o < 3; o++) if (o !== l) add(o, -.06, obs());
    wave++;
    return;
  }

  // Tronco di traverso: si passa solo saltando, con birre al volo come premio.
  if (!md.ranch && (section === 0 || section === 2) && wave > 2 && wave - lastBigLog > 3 && rng() < .2 + diff * .04) {
    lastBigLog = wave;
    add(1, .08, 'bigLog');
    for (let k = -2; k <= 2; k++) {
      const dz = k * .05, dt = dz / zSpeed;
      const lift = 2.05 * Math.max(0, Math.cos(dt / JUMP_DURATION * Math.PI)) + .1;
      add(prevSafe, .08 - dz, 'coin', { air: true, lift: Math.max(.35, lift) });
    }
    wave++;
    return;
  }

  // Chicane: due file sfalsate, la linea buona si sposta di una corsia a metà ondata. In mulattiera è più frequente.
  if (section !== 1 && wave > (section === 3 ? 1 : 5) && rng() < (section === 3 ? .34 : .16) + diff * .05) {
    const s1 = prevSafe, s2 = s1 === 1 ? (rng() < .5 ? 0 : 2) : 1;
    for (let l = 0; l < 3; l++) if (l !== s1) add(l, .08, obs());
    add(s1, -.14, obs());
    if (rng() < .3 + diff * .2 + (section === 3 ? .25 : 0)) add(3 - s1 - s2, -.14, obs());
    add(s1, .08, 'coin'); add(s1, -.02, 'coin'); add(s2, -.14, 'coin'); add(s2, -.24, 'coin');
    prevSafe = s2; wave++;
    return;
  }

  let safe;
  if (section === 3) {
    // Mulattiera: la linea buona cambia sempre, ma resta raggiungibile.
    safe = prevSafe === 1 ? (rng() < .5 ? 0 : 2) : 1;
  } else {
    safe = Math.floor(rng() * 3);
    if (safe === prevSafe && rng() < .5) safe = (safe + 1 + Math.floor(rng() * 2)) % 3;
  }
  prevSafe = safe;
  const other = (safe + 1 + Math.floor(rng() * 2)) % 3, third = 3 - safe - other;

  // Birre sulla linea buona; in mezzo a volte un bonus (casco, vino, grappa).
  // A volte l'ultima è una bottiglia d'acqua: da saltare o schivare.
  const waterChance = md.ranch ? 0 : wave > 2 ? .1 + diff * .03 + (section === 3 ? .1 : 0) : 0;
  for (let i = 0; i < 3; i++) {
    let type = 'coin';
    if (i === 1 && wave > 3) {
      const roll = rng();
      if (lives < 3 && roll < .06) type = 'helmet';
      else if (roll > .94) type = 'wine';
      else if (roll > (has('grappino') ? .82 : .9)) type = 'grappa';
    }
    if (i === 2 && rng() < waterChance) type = 'water';
    add(safe, .08 - i * .10, type);
  }

  const thirdChance = .4 + diff * .17 + (md.dense || 0);
  add(other, .08, obs());
  if (section === 3) {
    add(third, .08, obs());
    if (rng() < .35 + diff * .1) add(other, -.12, obs()); // seconda fila sfalsata
  } else if (rng() < thirdChance + (section === 1 ? .2 : 0)) add(third, .08, obs());
  if (!md.ranch && section !== 3 && rng() < .06) add(third, -.05, 'water'); // acqua "trappola" su un'altra corsia
  wave++;
}

// ---------- v59 · Il taglio di Angelo: rincorsa, trampolino, salto nel vuoto ----------
function spawnLeapWave() {
  // v64 · partenza, discesa a tutta sulle frecce di spinta, poi il burrone (niente rampa: finisce la montagna)
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  if (leapState === 0 && course > 26) {
    leapState = 1; add(1, .08, 'bigRamp');
    canyonX0 = roadTime * 19.5 + (.91 - .08) * 55;
    canyonLen = 400;   // finché non stacchi il burrone non finisce
    for (let k = 1; k <= 3; k++) add(1, .08 + k * .08, 'speedpad');
    toast('🏔 ARRIVA IL BURRONE: GAS A TUTTA, CI VOLI SOPRA!', 'gold'); wave++; return;
  }
  if (leapState >= 1) return;
  const l = wave < 2 ? 1 : Math.max(0, Math.min(2, prevSafe + (rng() < .5 ? -1 : 1)));
  prevSafe = l;
  add(l, .08, 'speedpad');
  const o = (l + 1 + Math.floor(rng() * 2)) % 3;
  add(o, .02, 'coin'); add(o, -.06, 'coin');
  if (wave > 2 && rng() < .18) add(o, -.14, 'grappa');
  wave++;
}
function leapTakeoff() {
  const perfect = elapsed - lastHopAt < .5;
  leapStartKmh = Math.max(20, kmh); leapPerfect = perfect;
  const k = Math.max(0, Math.min(1.6, (leapStartKmh - 35) / 50)) * (perfect ? 1.12 : 1) * (turbo > 0 ? 1.08 : 1);
  const v = Math.max(8, leapZRate * 55) * .42;   // unità di mondo al secondo in volo (scorrimento rallentato)
  jumpDur = Math.max(2.2 + k * 2.2, 30 / v);
  jumpH = 7 + k * 9; jump = jumpDur; scrubbed = 0;
  canyonLen = Math.max(20, v * jumpDur - 12);   // il bordo opposto arriva poco prima di dove atterri
  if (wheelie) endWheelie(false);
  leapState = 2; leapStartT = elapsed; leapPitch = .1; leapW = 0;
  objects = objects.filter(o => o.type === 'bigRamp');
  // campo di pietroni dove atterri: due corsie piene, una libera col bersaglio verde. Si sceglie sterzando in volo.
  leapFree = Math.floor(rng() * 3);
  const zLand = .91 - v / 55 * jumpDur;
  for (let r = -3; r <= 3; r++) {
    const z = zLand + r * .04;
    for (let l = 0; l < 3; l++) if (l !== leapFree) objects.push({ l, z: z + (rng() - .5) * .015, type: 'boulder', hit: false });
  }
  objects.push({ l: leapFree, z: zLand, type: 'landpad', hit: false });
  A.sfx.jump(); A.sfx.turbo(); shake = .6; flash('gold');
  bigCall(perfect ? 'STACCO PERFETTO!' : 'NEL VUOTO!');
  setTimeout(() => { if (leapState === 2) toast('LANCETTA NEL VERDE: GAS = MUSO SU, MOLLA = MUSO GIÙ · VAI SUL BERSAGLIO VERDE', 'gold'); }, 400);
}
function leapStep(dt) {
  if (leapState < 2) leapMul = Math.max(1, Math.min(1.75, leapMul + dt * (gas || turbo > 0 ? .04 : -.02)));   // la discesa spinge, col gas di più
  if (leapState === 2 && jump > 0) {
    // v64 · assetto semplice: col gas (o impenna) il muso sale, mollando scende piano. Verde = |muso| < 0,5
    const up = gas || wheelieHeld;
    leapPitch = Math.max(-1.2, Math.min(1.2, leapPitch + (up ? .5 : -.3) * dt));
    leapDist = (elapsed - leapStartT) * leapStartKmh / 3.6;
  }
  if (leapState === 2 && jump <= 0) {   // atterraggio
    leapState = 3; leapEndT = elapsed + 2.6;
    const m = Math.round(leapDist * 10) / 10, upright = Math.abs(leapPitch) < .5, clear = Math.abs(px - leapFree) < .6;
    if (upright && clear && crash <= 0) {
      leapBest = m; run.leap = m;
      reward(Math.round(m * 120) + (leapPerfect ? 1500 : 0), `IN PIEDI! ${m.toFixed(1).replace('.', ',')} m`, 'perfect');
      bigCall(`${m.toFixed(1).replace('.', ',')} METRI!`); A.sfx.perfect(); flash('gold');
    } else {
      run.leap = 0;
      if (crash <= 0) { lives--; run.hits++; crash = 1; stun = .9; shake = 1; A.sfx.hit(); flash('hit'); mistake(); }
      bigCall(!clear ? 'SUI PIETRONI!' : leapPitch > 0 ? 'DI CODA!' : 'DI MUSO!');
      toast(!clear ? 'SALTO NULLO: ATTERRA SUL BERSAGLIO VERDE' : 'SALTO NULLO: LANCETTA NEL VERDE QUANDO TOCCHI', 'red');
      if (lives <= 0) { hud(); finish(false); return; }
    }
  }
  if (leapState === 3 && elapsed >= leapEndT) { leapState = 4; finish(leapBest > 0); }
}

// ---------- v57 · Anti-GEV: la jeep delle Guardie Ecologiche Volontarie ----------
// Tiene il passo a bordo pista e lancia birilli, copertoni, cartelli e transenne sulla tua corsia.
// Col turbo o con la grappa la semini per qualche secondo; quando prendi una botta ti si avvicina.
function gevStep(dt, diff) {
  if (turbo > 0 || grappa > 0) gevLost = 2.5; else gevLost = Math.max(0, gevLost - dt);
  const tgt = gevLost > 0 ? 34 : crash > 0 ? -5 : -10 + Math.sin(elapsed * .6) * 3;
  gevZ += (tgt - gevZ) * Math.min(1, dt * (tgt > gevZ ? .8 : .55));
  if (gevLost > 0 && gevZ > 10 && !gevGone) { gevGone = true; reward(200, 'SEMINATE LE GEV!', 'trick', false); }
  if (gevZ < -4 && gevGone) { gevGone = false; toast('🚙 LE GEV SONO DI NUOVO QUI!', 'red'); A.sfx.whistle(); }
  gevArm = Math.max(0, gevArm - dt);
  gevThrow -= dt;
  if (gevThrow <= 0) {
    gevThrow = 1;
    if (gevZ < -6 && course > 2 && course < GAME_LENGTH * .95) { gevThrowNow(); gevThrow = Math.max(1.8, 3.4 - course * .012 - diff * .25) + rng() * 1.3; }
  }
  if (gevZ < -6 && elapsed - gevShout > 8 && rng() < dt * .5) { gevShout = elapsed; toast(pick(GEV_SHOUTS), 'gold'); A.sfx.whistle(); }
}
function gevThrowNow() {
  const target = Math.max(0, Math.min(2, Math.round(px))), zT = .14, zJ = .91 + gevZ / 55;
  // mai tutte e tre le corsie chiuse: se serve, la fila che c'era su un'altra corsia sparisce e restano le birre
  const hard = objects.filter(o => !GEV_SOFT.has(o.type) && Math.abs(o.z - zT) < .12);
  const blocked = new Set(hard.map(o => Math.round(o.lT ?? o.l))); blocked.add(target);
  if (blocked.size >= 3) {
    const free = [0, 1, 2].filter(l => l !== target)[Math.floor(rng() * 2)];
    objects = objects.filter(o => !(hard.includes(o) && Math.round(o.lT ?? o.l) === free));
    objects.push({ l: free, z: zT, type: 'coin', hit: false });
  }
  const type = pick(['cone', 'cone', 'tyre', 'tyre', 'sign', 'barrier']);
  objects.push({ l: 1 + gevSide * 2.15, z: zJ, type, hit: false, fly: .9, flyT: .9, l0: 1 + gevSide * 2.15, lT: target, z0: zJ, zT, lift: 1.5 });
  gevArm = .6; run.gevThrows = (run.gevThrows || 0) + 1;
  toast({ cone: '⚠ BIRILLO IN ARRIVO!', tyre: '⚠ TI TIRANO UN COPERTONE!', sign: '⚠ CARTELLO DI DIVIETO IN PISTA!', barrier: '⚠ TRANSENNA IN ARRIVO!' }[type], 'red');
}
function gevVerbale() {
  const n = String(1000 + Math.floor(Math.random() * 9000));
  return `<div class="verbale"><div class="vtop"><b>VERBALE N. EDT/${n}</b><span>GUARDIE ECOLOGICHE VOLONTARIE</span></div>
    <div class="vrow"><small>TRASGRESSORE</small><b>${profile.rider}</b></div>
    <div class="vrow"><small>VIOLAZIONE</small><b>Fuoristrada con eccesso di divertimento${run.caps ? ` e trasporto di ${run.caps} birre` : ''}</b></div>
    <div class="vrow"><small>SANZIONE</small><b>${gevFine ? gevFine + ' 🍺 sequestrate' : 'nessuna birra da sequestrare (che tristezza)'}</b></div>
    <i class="vfirma">Firma della GEV: illeggibile</i></div>`;
}

// ---------- v41 · Avversari, scorciatoie, meteo ----------
const RIVAL_LIVERIES = [
  { plastic: '#ff6a13', accent: '#1d2b52', jersey: '#ff7a1f', pants: '#1d2b52', helmet: '#ff7a1f' },
  { plastic: '#1d5fd1', accent: '#f2f2ee', jersey: '#1d5fd1', pants: '#f2f2ee', helmet: '#f2f2ee' },
  { plastic: '#2f9e44', accent: '#efe9d4', jersey: '#2f9e44', pants: '#202a20', helmet: '#efe9d4' },
  { plastic: '#d01f2a', accent: '#f4f4f0', jersey: '#f4f4f0', pants: '#d01f2a', helmet: '#d01f2a' },
  { plastic: '#f2f2ee', accent: '#6c2bd9', jersey: '#6c2bd9', pants: '#1c1c1c', helmet: '#f2f2ee' },
];
function setupRace() {
  // Tre compagni di giro: uno parte dietro (e ti passerà con un bel "Suuuka!"), due davanti.
  const others = RIDERS.filter(r => r !== profile.rider).sort(() => rng() - .5).slice(0, 3);
  const starts = [-7, 26, 58], skills = [1.09, 1.04, .99];   // v48 · un filo più forti (salite più dure anche per loro)
  rivals = P.MODES[mode].leap ? [] : others.map((name, i) => ({ name, gap: starts[i], lane: [2, 0, 2][i], lx: [2, 0, 2][i], skill: skills[i] + (rng() - .5) * .05, ahead: starts[i] > 0, laneT: 2 + rng() * 3, livery: RIVAL_LIVERIES[(i + Math.floor(rng() * 5)) % 5], number: RIDERS.indexOf(name) + 1, lean: 0 }));
  coachStep = 0; coachOn = ice ? !P.profile.iceTutorial52 : !P.profile.tutorialDone; $('coach')?.classList.remove('show');
  lastSuka = -99; shortcutsDone = 0; nextShortcut = 14 + rng() * 8; shownPos = '';
  // Meteo: un cambio a metà giro (pioggia, nebbia o tramonto), diverso a ogni gara; la Sfida del giorno è uguale per tutti.
  const kinds = ['rain', 'fog', 'dusk'], k = kinds[Math.floor(rng() * 3)];
  const at = 14 + rng() * 14;
  weatherPlan = [{ kind: k, from: at, to: at + 16 + rng() * 8 }];
  if (mode === 5) weatherPlan.push({ kind: 'rain', from: 6, to: 22 });        // il pantano: piove sempre un po'
  if (mode === 2 || mode === 8) weatherPlan.push({ kind: 'dusk', from: 30, to: 999 }); // Angelo e Morte: arriva il buio
  if (P.MODES[mode].rainy) weatherPlan = [{ kind: 'rain', from: 0, to: 999 }, { kind: 'fog', from: 20 + rng() * 15, to: 45 + rng() * 10 }];
  if (ice) {
    // sul ghiaccio niente pioggia: al massimo nebbia o il sole che cala dietro al lago
    weatherPlan = [{ kind: rng() < .5 ? 'fog' : 'dusk', from: at, to: at + 18 }];
    const targets = [17000, 13600, 10500];   // v50 · guida libera: ≈ 9.000 · 6.800 · 4.800 punti a fine gara
    rivals.forEach((r, i) => { r.drift = 0; r.dTarget = targets[i] * (.92 + rng() * .16); r.driftAhead = false; r.slip = 3 + rng() * 6; });
  }
  weather = { rain: 0, fog: 0, dusk: 0 }; weatherSaid = '';
}
function rivalSay(r) {
  if (elapsed - lastSuka < 3.5) return;
  lastSuka = elapsed;
  const key = RIDER_VOICE[r.name];
  A.sayRival(key ? key + '_suka' : 'suka');
}
function updateRivals(dt, travelStep, route, diff) {
  const base = (1 + diff * .35 + elapsed / 100) * 19.5;
  for (const r of rivals) {
    // ritmo del compagno: segue la pendenza come te (sempre col gas aperto), con un "elastico" per restare in gara
    const rr = routeAt(course, (roadTime * 19.5) + r.gap);
    let pace = paceFor(rr, true, 0, 0) * r.skill * (1 - rr.rough * .06);
    if (r.gap > 70) pace *= .88; else if (r.gap < -30) pace *= 1.25;
    // v45 · anche i compagni danno gas: ogni tanto uno scatto di turbo
    r.turboT = (r.turboT ?? 6 + rng() * 10) - dt;
    if (r.turboT < 0) { pace *= 1.3; if (r.turboT < -2.5) r.turboT = 8 + rng() * 10; }
    if (elapsed < 2.5) pace *= .9 + elapsed * .04;
    const prev = r.gap;
    r.gap += (dt * base * pace) - travelStep;
    // cambi di corsia: mai addosso al giocatore quando lo affianca
    r.laneT -= dt;
    if (r.laneT <= 0) { r.laneT = 2.5 + rng() * 4; r.lane = Math.floor(rng() * 3); }
    if (Math.abs(r.gap) < 4 && r.lane === lane) r.lane = lane === 1 ? (rng() < .5 ? 0 : 2) : 1;
    const before = r.lx; r.lx += (r.lane - r.lx) * Math.min(1, dt * 2.6); r.lean = (r.lx - before) / Math.max(dt, .001);
    if (ice) {
      // punti derapata dei compagni: più nelle curve, ogni tanto ne buttano via una
      const bendR = Math.abs(iceBend((roadTime * 19.5) + r.gap));
      r.drift += dt * r.dTarget / (P.MODES[mode].limit * .82 * 1.16) * (.4 + bendR * 1.2) * (.85 + Math.sin(elapsed * .7 + r.number) * .15);
      r.slip -= dt; if (r.slip <= 0) { r.slip = 5 + rng() * 8; r.drift = Math.max(0, r.drift - 150 - rng() * 200); }
      const ahead = r.drift > driftScore;
      if (ahead && !r.driftAhead && elapsed > 3) { pop(r.name.toUpperCase() + ': SUUUKA! PIÙ TRAVERSO DI TE', 'white'); rivalSay(r); }
      else if (!ahead && r.driftAhead) { pop('PIÙ DERAPATE DI ' + r.name.toUpperCase() + '!', 'gold'); A.sfx.near(); run.passes = (run.passes || 0) + 1; }
      r.driftAhead = ahead;
      continue;
    }
    // sorpassi
    if (prev < 0 && r.gap >= 0) { // ti passa lui
      pop(r.name.toUpperCase() + ': SUUUKA!', 'white'); rivalSay(r); suuka();
    } else if (prev > 0 && r.gap <= 0) { // lo passi tu
      score += 250; run.passes = (run.passes || 0) + 1; pop('SORPASSO SU ' + r.name.toUpperCase() + ' +250', 'gold'); A.sfx.near();
    }
  }
}
function setupGroupGhost() {
  gGhost = null; gGhostPassed = false;
  if (ice || P.MODES[mode].random === 'run' || P.MODES[mode].leap) return;
  const top = (C.cached()?.boards?.[mode] || []).find(e => e.g && e.g.length > 8);
  if (!top) return;
  const pts = C.decodeGhost(top.g); if (pts.length < 5) return;
  gGhost = { name: top.n, pts, rider: top.r, entry: { name: '👻 ' + top.n.toUpperCase(), ghost: true, gap: 0, lane: 1, lx: 1, lean: 0, number: Math.max(1, RIDERS.indexOf(top.r) + 1), livery: { plastic: '#f2c230', accent: '#ffffff', jersey: '#f2c230', pants: '#202020', helmet: '#ffffff' } } };
}
function groupGhostCourse(t) {
  if (!gGhost) return null;
  const p = gGhost.pts, a = Math.floor(t);
  if (a >= p.length - 1) return p[p.length - 1];
  return p[a] + (p[a + 1] - p[a]) * (t - a);
}
function updateGroupGhost() {
  if (!gGhost) return;
  const gc = groupGhostCourse(elapsed), e = gGhost.entry;
  const before = e.lx;
  e.gap = (gc - course) / GAME_LENGTH * courseLength(P.MODES[mode].difficulty) * 19.5;
  e.lx = 1 + Math.sin(elapsed * .45 + 1) * .85; e.lean = (e.lx - before) * 60;
  if (!gGhostPassed && elapsed > 3 && course > gc + .3) { gGhostPassed = true; pop('👻 HAI PASSATO IL FANTASMA DI ' + gGhost.name.toUpperCase() + '!', 'gold'); A.sfx.near(); }
  if (gGhostPassed && course < gc - 1.5) { gGhostPassed = false; pop('👻 ' + gGhost.name.toUpperCase() + ' TI HA RIPRESO', 'small'); }
  $('gghost').hidden = false; $('gghost').style.left = Math.min(100, gc / GAME_LENGTH * 100) + '%'; $('gghost').title = 'Fantasma di ' + gGhost.name + ' (1° nel gruppo)';
}
function racePos() { return ice ? 1 + rivals.filter(r => r.drift > driftScore).length : 1 + rivals.filter(r => r.gap > 0).length; }

// ---------- v46 · Derapate sul ghiaccio ----------
const DRIFT_NAMES = [[1600, 'TRAVERSO LEGGENDARIO'], [900, 'DERAPATONA'], [420, 'BEL TRAVERSO'], [0, 'DERAPATINA']];
function endDrift(ok) {
  if (driftT <= 0) return;
  const t = driftT, avg = driftSum / Math.max(.001, driftT);
  let pts = driftPend;
  driftT = driftSum = driftPend = 0; driftGap = 0;
  if (!ok) { if (pts > 60) { pop('DERAPATA BUTTATA! −' + Math.round(pts), 'small'); } driftChain = 0; return; }
  if (t < .35 || pts < 25) return;
  let tag = '';
  if (avg >= .3 && avg <= .62) { pts *= 1.3; tag = ' PULITA'; }       // angolo giusto: la derapata "bella"
  else if (avg > .72) { pts *= .85; tag = ' (TROPPO DI TRAVERSO)'; }
  pts = Math.round(pts * (1 + (bs.points || 0)));
  driftScore += pts; score += pts; driftCount++; driftBest = Math.max(driftBest, pts);
  run.drifts = driftCount; run.driftBest = driftBest;
  driftChain = Math.min(8, driftChain + 1);
  if (turbo <= 0) charge = Math.min(100, charge + Math.min(30, pts / 40) * (1 + (bs.turbo || 0)));
  const name = DRIFT_NAMES.find(([v]) => pts >= v)[1];
  pop(name + tag + ' +' + pts.toLocaleString('it-IT'), pts >= 900 ? 'gold' : 'blue');
  fxKind = 'trick'; fxSerial++;
  if (pts >= 1600) { cheer('MA CHE TRAVERSO!', false, true); flash('gold'); }
  if (driftChain === 4) toast('❄ CATENA DI DERAPATE ×1,6', 'blue');
  if (driftChain === 8) toast('❄ CATENA ×2,2 — RE DEL GHIACCIO!', 'gold');
}
const driftMult = () => (1 + Math.min(8, driftChain) * .15) * (has('drifter') ? 1.5 : 1);   // v59 · Miti re delle derapate
// v49 · derapata vera: il GAS si dosa. Tenendolo premuto la ruota dietro slitta sempre di più (angolo che cresce),
// lasciandolo l'angolo torna giù. Zona verde = punti pieni; troppo traverso → la moto scivola fuori e alla fine TESTACODA.
// v52 · derapata come sul ghiaccio vero: il GAS fa uscire il posteriore (muso verso l'interno della curva),
// lo STERZO gira il muso; per tenere la linea si dosa il gas e si controsterza. drift = angolo del muso rispetto alla pista.
function iceStep(dt) {
  const grip = Math.min(.8, bs.grip || 0);
  bendNow = iceBend(roadTime * 19.5);   // + = la curva spinge verso destra
  if (gas && jump <= 0 && crash <= 0) throttleSlip = Math.min(1, throttleSlip + dt * (.9 + (bs.drift || 0) * .3));
  else throttleSlip = Math.max(0, throttleSlip - dt * (1.6 + grip * .8));
  let st = steerNow(); if (st) aimPx = null;
  else if (aimPx !== null) st = Math.max(-1, Math.min(1, (aimPx - px) * 1.3 - vx * .3));
  const yawT = Math.max(-1.1, Math.min(1.1, st * (.32 + .55 * throttleSlip) - bendNow * (.18 + .5 * throttleSlip)));
  drift += (yawT - drift) * Math.min(1, dt * (2.6 + grip * 2 + (gas ? 0 : 1.5)));
  // la traiettoria segue il muso ma la curva spinge fuori; i chiodi danno aderenza (la moto risponde prima)
  const lat = 4.2 * Math.min(1.2, speedNow);
  const vxT = (drift + bendNow * .45) * lat;
  vx += (vxT - vx) * Math.min(1, dt * (2.1 + grip * 2.2));
  px += vx * dt;
  scrubCheck(Math.abs(st) > .3 ? Math.sign(st) : 0);
  // muro di neve ai bordi: si rimbalza, si rallenta e la derapata va persa
  if (px < -.42 || px > 2.42) {
    px = Math.max(-.42, Math.min(2.42, px)); vx = -vx * .25; snowT = .7; throttleSlip *= .3;
    if (elapsed - lastWall > .8) { lastWall = elapsed; endDrift(false); fxKind = 'snow'; fxSerial++; shake = Math.max(shake, .45); A.sfx.splash(); toast('❄ NEL MURO DI NEVE!', 'blue'); mistake(); if (navigator.vibrate) try { navigator.vibrate(40); } catch {} }
  }
  // testacoda: troppo di traverso troppo a lungo
  if (Math.abs(drift) > .88 + grip * .06 && jump <= 0) overT += dt; else overT = Math.max(0, overT - dt * 2);
  if (overT > .45) {
    overT = 0; endDrift(false); throttleSlip = 0; drift *= .2; stun = .6; snowT = .4; shake = Math.max(shake, .6);
    fxKind = 'snow'; fxSerial++; A.sfx.hit(); toast('🌀 TESTACODA! MOLLA UN PO’ IL GAS', 'red'); mistake();
    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch {}
  }
  const q = Math.abs(drift), sweet = q >= .3 && q <= .62;
  const active = jump <= 0 && crash <= 0 && snowT <= 0 && q > .2 && throttleSlip > .2 && speedNow > .45;   // senza gas non è derapata
  if (active) {
    if (driftT === 0) A.sfx.scrub();
    driftT += dt; driftSum += q * dt;
    driftPend += dt * Math.min(q, .7) * 260 * speedNow * driftMult() * (1 + (bs.drift || 0) * .3) * (sweet ? 1.25 : q > .7 ? .7 : 1);
    driftGap = 0;
    if (sweet && !wasSweet && touchDevice && navigator.vibrate) try { navigator.vibrate(6); } catch {}
  } else {
    if (driftT > 0) endDrift(true);
    driftGap += dt; if (driftGap > 1.8 && driftChain) driftChain = 0;
  }
  wasSweet = active && sweet;
  snowT = Math.max(0, snowT - dt);
}
// Scorciatoia: bivio su una corsia laterale con il cartello del "taglio".
function spawnShortcut() {
  const l = rng() < .5 ? 0 : 2;
  objects.push({ l, z: -.05, type: 'shortcut', hit: false });
  toast('BIVIO! TAGLIO DI ANGELO A ' + (l === 0 ? 'SINISTRA' : 'DESTRA'), 'gold');
}
function takeShortcut() {
  shortcutsDone++;
  const jumpWorld = courseLength(P.MODES[mode].difficulty) * 19.5 * .07;   // salta il 7% del giro
  roadTime += jumpWorld / 19.5;
  for (const r of rivals) r.gap -= jumpWorld;
  objects = objects.filter(o => o.z > .95);   // il taglio è pulito: niente ostacoli subito dopo
  spawn = 1.2;
  score += 400; run.shortcuts = (run.shortcuts || 0) + 1;
  flash('gold'); shake = Math.max(shake, .5);
  bigCall('IL TAGLIO!');
  angelo();
  A.sayRival('angelo_taglio');
}
let angeloTimer = 0, suukaAt = -99;
// v53 · quando un compagno ti passa compare il bollino "Angelo Suuuka"
function suuka() {
  const el = $('suuka'); if (!el || elapsed - suukaAt < 8) return; suukaAt = elapsed;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function angelo() {
  const el = $('angelo'); if (!el) return;
  const img = el.querySelector('img');
  if (!img.src && FOTO['angelo-face']) img.src = FOTO['angelo-face'];
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(angeloTimer); angeloTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
const WEATHER_MSG = { rain: '🌧 ARRIVA LA PIOGGIA! FANGO OVUNQUE', fog: '🌫 NEBBIA IN QUOTA! OCCHI APERTI', dusk: '🌇 SI FA SERA… ACCENDI IL CERVELLO' };
function updateWeather(dt) {
  const target = { rain: 0, fog: 0, dusk: 0 };
  for (const w of weatherPlan) if (elapsed >= w.from && elapsed < w.to) {
    target[w.kind] = Math.max(target[w.kind], w.kind === 'dusk' ? Math.min(1, (elapsed - w.from) / 20) : 1);
    if (weatherSaid !== w.kind + w.from) { weatherSaid = w.kind + w.from; toast(WEATHER_MSG[w.kind], w.kind === 'rain' ? 'blue' : 'gold'); }
  }
  for (const k of ['rain', 'fog', 'dusk']) weather[k] += (target[k] - weather[k]) * Math.min(1, dt * .5);
  // sotto la pioggia ogni tanto arriva uno schizzo sull'obiettivo
  if (weather.rain > .5 && elapsed - lastRainMud > 5 + Math.random() * 4) { lastRainMud = elapsed; mud(.22); }
}

// ---------- v45 · Seconda possibilità e allenatore per il primo giro ----------
const CONTINUE_COST = 25;
let continueTimer = 0;
function offerContinue() {
  state = 'continue'; gas = false; A.engineStop(); A.musicStop(); $('coach').classList.remove('show');
  if (wheelie) endWheelie(false);
  $('overlay').classList.remove('hidden');
  let left = 6;
  const draw = () => {
    $('card').innerHTML = `<div class="santino"><img src="img/san-miti.webp" alt="San Miti, protettore dell'EDT" width="427" height="640"><div>
      <div class="eyebrow">MOTO A TERRA · ULTIMA POSSIBILITÀ</div>
      <h1>SAN MITI<br><em>TI RIMETTE IN SELLA.</em></h1>
      <p>Il protettore dell'EDT ti fa ripartire da qui con una moto per <b>${CONTINUE_COST} 🍺</b> (ne hai ${P.profile.beers}). Una grazia per giro.</p></div></div>
      <div class="actions"><button class="primary big" id="contyes"><span>CONTINUA · ${left}</span>${icon('chevrons')}</button>
      <button class="secondary" id="contno">BASTA COSÌ</button></div>`;
    iconizeEl($('card'));
    $('contyes').onclick = () => { clearInterval(continueTimer); doContinue(); };
    $('contno').onclick = () => { clearInterval(continueTimer); finish(false); };
  };
  draw();
  clearInterval(continueTimer);
  continueTimer = setInterval(() => { left--; if (state !== 'continue') { clearInterval(continueTimer); return; } if (left <= 0) { clearInterval(continueTimer); finish(false); } else draw(); }, 1000);
}
function doContinue() {
  if (state !== 'continue') return;
  P.profile.beers -= CONTINUE_COST; P.save();
  run.continued = true; lives = 1; invincible = 3; crash = 0; stun = 0; shownLives = -1;
  objects = objects.filter(o => o.z > .95 || o.z < .5);
  $('overlay').classList.add('hidden');
  state = 'playing'; A.engineStart(); startMusic(); if (touchDevice) goFull();
  toast('⛑ DI NUOVO IN SELLA! NON SPRECARLA', 'green'); hud();
}
// Primo giro in assoluto: consigli grandi al centro, uno alla volta.
const COACH = () => touchDevice ? [
  [0.6, '👆 TIENI IL DITO A SINISTRA O A DESTRA<br>(o trascinalo): la moto va dove vuoi'],
  [4.8, '🍺 SEGUI LE BIRRE:<br>indicano la linea libera'],
  [9.2, '🪵 OSTACOLO? SCORRI IN SU<br>o tocca al centro per saltare'],
  [14, '⚡ TURBO PIENO? premi TURBO<br>e spacca tutto'],
  [19, '⛰ SALITA? UN TOCCO SU GAS<br>e resta bloccato fino in cima'],
] : [
  [0.6, '⬅ ➡ TIENI LE FRECCE o muovi il MOUSE<br>per sterzare'],
  [4.8, '🍺 SEGUI LE BIRRE:<br>indicano la linea libera'],
  [9.2, '🪵 OSTACOLO? SPAZIO o CLIC<br>per saltare'],
  [14, '⚡ TURBO PIENO? premi B<br>o la rotellina'],
];
let coachStep = 0, coachOn = false;
const ICE_COACH = () => [
  [0.8, '❄ SUL GHIACCIO LA MOTO SCIVOLA: CAMBIA CORSIA IN ANTICIPO'],
  [5, touchDevice ? '🔥 GAS IN CURVA: IL POSTERIORE ESCE · CONTROSTERZA PER TENERE LA LINEA' : '🔥 W IN CURVA: IL POSTERIORE ESCE · CONTROSTERZA CON LE FRECCE'],
  [10, '🎯 GAS + STERZO: TIENI L’AGO NEL VERDE E LA MOTO IN PISTA'],
  [15, '🌀 TROPPO GAS = SCIVOLI FUORI E FAI TESTACODA'],
  [20, '🚩 PASSA LE PORTE BLU DI TRAVERSO PER IL BONUS'],
];
function coachUpdate() {
  if (!coachOn) return;
  const list = ice ? ICE_COACH() : COACH();
  if (coachStep < list.length && elapsed >= list[coachStep][0]) {
    const el = $('coach'); el.innerHTML = list[coachStep][1].replace('<br>', ' '); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    coachStep++;
    if (coachStep >= list.length) { coachOn = false; if (ice) P.profile.iceTutorial52 = true; else P.profile.tutorialDone = true; P.save(); }
  }
}

// ---------- Ciclo di gioco ----------
function update(dt) {
  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown);
    if (n !== countStep && n > 0 && n <= 3) {
      countStep = n;
      $('countdown').textContent = n; $('countdown').className = 'countdown';
      void $('countdown').offsetWidth; $('countdown').className = 'countdown show';
      A.sfx.count(false);
    }
    if (countdown <= 0) { countdown = 0; A.sfx.count(true); go(); }
    A.engineUpdate(.15 + Math.sin(performance.now() / 180) * .1 + .1, false, false, false);
    wheelPhase += dt * 20;
    hud();
    return;
  }
  if (state !== 'playing') return;
  // Rallentatore breve su salti perfetti e cadute.
  if (slowmo > 0) { slowmo -= dt; dt *= slowScale; }
  const diff = P.MODES[mode].difficulty;
  elapsed = Math.min(timeLimit, elapsed + dt);
  turbo = Math.max(0, turbo - dt); wet = Math.max(0, wet - dt); magnet = Math.max(0, magnet - dt);
  crash = Math.max(0, crash - dt * 1.5); stun = Math.max(0, stun - dt);
  grappa = Math.max(0, grappa - dt); waterT = Math.max(0, waterT - dt); earsT = Math.max(0, earsT - dt);
  wheelieCD = Math.max(0, wheelieCD - dt);
  if (wheelie) {
    if (!wheelieHeld || jump > 0 || crash > 0) endWheelie(false);
    else {
      wheelieT += dt; score += dt * 60 * multiplier() * (1 + up.balance * .15) * (has('wheelie') ? 2 : 1);
      if (turbo <= 0) charge = Math.min(100, charge + dt * 9);
      if (wheelieT >= 3.2 + up.balance * .5 + (has('wheelie') ? 2.8 : 0) + (bs.wheelie || 0)) endWheelie(true);
    }
  }
  shake = Math.max(0, shake - dt * 2.4);
  whip *= Math.pow(.02, dt);
  jumpBuffer = Math.max(0, jumpBuffer - dt);

  const route = routeAt(course, roadTime * 19.5);
  const speed = paceFor(route, gas || has('climb'), turbo, has('amphibious') ? 0 : wet) * (has('downhill') ? 1 + route.down * .25 : 1) * (has('mule') ? 1 + route.rough * .08 : 1) * (stun > 0 ? .45 : 1) * (waterT > 0 ? .62 : 1) * (wheelie ? 1.08 : 1) * (has('rocket') && elapsed < 8 ? 1.1 : 1) * (has('sprint') && course > GAME_LENGTH * .75 ? 1.1 : 1) * (snowT > 0 ? .62 : 1) * (edgeT > 0 ? .85 : 1) * (leap ? leapMul * (leapState >= 2 ? .42 : 1) : 1);   // v62 · Taglio di Angelo: la discesa ti fa prendere velocità
  // Discesa: "Campa giù!"
  if (route.down > .45 && !downAnnounced) { downAnnounced = true; if (profile.rider === 'Mirco') riderLine('start'); else A.say('campa'); bigCall('CAMPA GIÙ!'); }
  if (route.down < .15) downAnnounced = false;
  speedNow = speed;
  if (route.seg !== routePhase) {
    const prevSeg = layoutSegments()[routePhase];
    if (routePhase >= 0) flash('gold');
    // Controllo orario: settore senza errori = +1 secondo sul tempo massimo (v48).
    if (prevSeg && errors === segErrors && state === 'playing') { timeLimit += 1; run.cleanSectors = (run.cleanSectors || 0) + 1; A.sfx.mission(); toast('⏱ SETTORE PULITO +1 s', 'green'); }
    segErrors = errors;
    routePhase = route.seg;
    const cur = layoutSegments()[route.seg];
    const hints = ['SOTTOBOSCO! OCCHIO AI TRONCHI', 'POZZANGHERE! SCHIVA O SALTA', 'SALITONE HARD! TIENI GAS', 'MULATTIERA HARD! SEGUI LE BIRRE'];
    const named = P.MODES[mode].id >= 10;
    const text = named ? cur.name + '!' : ice ? '❄ ' + cur.name + (cur.name.startsWith('CURV') || cur.name.startsWith('ESSE') ? '! GAS IN CURVA = TRAVERSO' : '!') : cur.t === 3 && cur.climb ? 'MULATTIERA IN SALITA! GAS E SANGUE FREDDO' : hints[cur.t];
    if (prevSeg && (ice || named ? prevSeg.name !== cur.name : prevSeg.t !== cur.t || prevSeg.climb !== cur.climb)) cheer(text, true, !ice && (cur.t === 2 || (cur.t === 3 && cur.climb)));
  }
  score += dt * 12 * (turbo > 0 ? 2 : 1) * (has('downhill') && route.down > .4 ? 2 : 1) * (has('sprint') && course > GAME_LENGTH * .75 ? 2 : 1);
  // In mulattiera non si va più veloci: è stretta, sassosa e con ondate più dure.
  const travelStep = dt * (1 + diff * .35 + elapsed / 100) * speed * 19.5 * (1 - route.rough * .06) * (1 + up.engine * .025) * (1 + (bs.speed || 0)) * (1 + (bs.climb || 0) * Math.max(0, route.grade));
  roadTime += travelStep / 19.5;
  if (leap && leapState < 2 && dt > 0) leapZRate = travelStep / 55 / dt;
  course = Math.min(GAME_LENGTH, roadTime / courseLength(diff) * GAME_LENGTH);
  kmh = Math.round(travelStep / dt / 19.5 * 31);
  if (leap && leapState === 2) kmh = Math.round(leapStartKmh);   // v64 · in volo il mondo scorre più piano (si vede l'atterraggio), la velocità resta quella dello stacco
  updateRivals(dt, travelStep, route, diff);
  updateWeather(dt);
  updateGroupGhost();
  if (gasLock) { noClimbT = route.climb > .05 || route.rough > .05 ? 0 : noClimbT + dt; if (noClimbT > 2.5) { gasLock = false; if (!gasDownAt) gas = false; } }
  coachUpdate();
  if (gev) gevStep(dt, diff);
  if (leap) { leapStep(dt); if (state !== 'playing') return; }
  if (!ice && !P.MODES[mode].slalom && !P.MODES[mode].ranch && !P.MODES[mode].leap && shortcutsDone < 2 && elapsed > nextShortcut && course > 12 && course < GAME_LENGTH * .8 && route.id !== 3) { nextShortcut = elapsed + 18 + rng() * 10; spawnShortcut(); }
  while (elapsed >= ghostNextSplit) { ghostSplits.push(course); ghostNextSplit += .5; }
  const gc = ghostCourse(elapsed);
  if (gc !== null && !ghostPassed && elapsed > 3 && course > gc + .4) { ghostPassed = true; pop('👻 SUPERATO IL FANTASMA!', 'white'); }
  if (gc !== null && ghostPassed && course < gc - 1.5) ghostPassed = false;
  if (!warned && timeLimit - elapsed <= 10) { warned = true; toast('ULTIMI 10 SECONDI! DAI GAS!', 'red'); voice('Dai gas Ciccio!'); }
  comboTime = Math.max(0, comboTime - dt);
  if (comboTime === 0) combo = 0;

  // Spostamento laterale a molla: la moto accelera, piega e si raddrizza in modo naturale.
  const kLat = (118 - route.rough * 32) * (touchDevice ? 1.35 : 1) * (1 - weather.rain * .18) * (1 + up.tyres * .08) * (1 + (bs.steer || 0)) * (has('mule') && route.rough > .4 ? 1.35 : 1), cLat = 2 * Math.sqrt(kLat) * .9;
  if (ice) iceStep(dt);
  else steerStep(dt, route);
  { const nl = Math.max(0, Math.min(2, Math.round(px))); if (nl !== lane) { lane = nl; A.sfx.lane(lane); } }
  const wasAirborne = jump > 0;
  jump = Math.max(0, jump - dt);
  if (wasAirborne && jump === 0) {
    springVelocity = 95; A.sfx.land(); shake = Math.max(shake, .25); if (touchDevice && navigator.vibrate) try { navigator.vibrate(12); } catch {}
    if (jumpBuffer > 0) { jumpBuffer = 0; takeoff(); }
  }
  const bump = jump > 0 ? 0 : Math.sin(roadTime * 27) * (18 + route.rough * 40);
  springVelocity += (bump - suspension * 150 - springVelocity * 13) * dt;
  suspension += springVelocity * dt;
  wheelPhase += dt * (180 + diff * 45) * speed;
  invincible = Math.max(0, invincible - dt);
  toastTime -= dt;
  if (toastTime < 0) $('banner').classList.remove('show');
  A.engineUpdate(speed * (1 + elapsed / 200) * (ice ? 1 + throttleSlip * .55 : 1), gas, turbo > 0, jump > 0 || (ice && throttleSlip > .5));   // v49 · sul ghiaccio la ruota pattina: giri alti
  A.musicIntensity(turbo > 0 ? 1 : .35 + (multiplier() - 1) * .15);

  spawn -= dt * speed;
  if (spawn <= 0) {
    spawn = ice ? 2.2 - Math.min(.5, course * .006) : P.MODES[mode].slalom ? Math.max(.78, 1.05 - course * .004) : Math.max(.95, (1.8 - diff * .16 - course * .002) * (route.id === 3 ? .8 : 1));
    spawnWave();
  }

  const lift = curLift(), phase = jump > 0 ? 1 - jump / jumpDur : 0;
  const pull = magnet > 0 ? 1.7 : 0;
  for (const o of objects) {
    o.z += travelStep / 55;
    if (o.fly > 0) {   // v57 · oggetto lanciato dalla jeep delle GEV: vola a parabola fino alla corsia
      o.z0 += travelStep / 55; o.zT += travelStep / 55; o.fly = Math.max(0, o.fly - dt);
      const k = 1 - o.fly / o.flyT;
      o.z = o.z0 + (o.zT - o.z0) * k; o.l = o.l0 + (o.lT - o.l0) * k; o.lift = (1 - k) * 1.5 + 4.4 * k * (1 - k);
      if (o.fly === 0) { o.lift = 0; o.landed = true; A.sfx.land(); }
    }
    if (o.roll) o.l = o.lEnd - (.91 - o.z) * o.k;
    if (o.hit || o.z < .91) continue;
    o.hit = true;
    const gap = o.type === 'bigLog' || o.type === 'ford' ? 0 : Math.abs(px - o.l);
    if (o.type === 'sgap') {
      if (Math.abs(px - o.l) < .5 && crash <= 0) { slalomN++; run.slaloms = Math.max(run.slaloms || 0, slalomN); reward(60 + Math.min(slalomN, 12) * 15, slalomN >= 5 ? 'SLALOM ×' + slalomN + '!' : 'SLALOM!', 'trick', false); if (slalomN === 10) cheer('SEI UN CANGURO DEL BOSCO!', false, true); }
      else slalomN = 0;
      o.collected = true; continue;
    }
    if (o.type === 'ford') {
      o.collected = true;
      if (lift > .55) { run.jumps++; reward(200, 'GUADO SALTATO!', 'jump'); }
      else if (has('amphibious')) { reward(90, 'ANFIBIO!', 'trick'); mud(.35); fxKind = 'splash'; fxSerial++; A.sfx.splash(); }
      else { wet = 1.5 - up.tyres * .15; mud(.7); fxKind = 'splash'; fxSerial++; A.sfx.splash(); flash('blue'); run.splashes++; toast('NEL GUADO! SCARPONI PIENI D’ACQUA', 'blue'); }
      continue;
    }
    if (o.type === 'gate') {
      if (Math.abs(px - o.l) < .75 && crash <= 0) {
        o.collected = true;
        if (driftT > 0 && Math.abs(drift) > .22) { driftPend += 260 * driftMult(); A.sfx.perfect(); pop('PORTA IN TRAVERSO! ❄', 'gold'); fxKind = 'trick'; fxSerial++; if (touchDevice && navigator.vibrate) try { navigator.vibrate([8, 30, 8]); } catch {} }
        else { score += 50; A.sfx.near(); pop('PORTA +50 · PASSALA DI TRAVERSO!', 'small'); }
      }
      continue;
    }
    if (o.type === 'shortcut') { if (Math.abs(px - o.l) < .6 && crash <= 0) { o.collected = true; takeShortcut(); return; } continue; }
    if (o.type === 'landpad' || (o.type === 'boulder' && leap)) continue;   // v64 · i pietroni si valutano all'atterraggio (corsia)
    if (o.type === 'speedpad') {   // v62 · freccia di spinta: più velocità per il salto
      if (Math.abs(px - o.l) < .6 && jump <= 0) { o.collected = true; leapMul = Math.min(2.1, leapMul + .1); A.sfx.turbo(); shake = Math.max(shake, .2); pop('SPINTA! ' + Math.round(kmh + 6) + ' km/h', 'gold'); fxKind = 'trick'; fxSerial++; }
      continue;
    }
    if (o.type === 'bigRamp') { o.collected = true; if (leapState === 1) leapTakeoff(); continue; }
    if (o.type === 'ramp') {
      // Rampa di terra: se ci passi sopra a terra, decolli con un salto lunghissimo.
      if (gap < .5 && jump <= 0 && crash <= 0) {
        if (wheelie) endWheelie(false);
        jumpDur = 1.45 * (1 + up.susp * .03); jumpH = 3.0 * (1 + up.susp * .05) * (1 + (bs.jump || 0)); jump = jumpDur; scrubbed = 0;
        A.sfx.jump(); run.ramps = (run.ramps || 0) + 1; shake = Math.max(shake, .3);
        reward(120, 'RAMPA!', 'trick');
      }
      continue;
    }
    if (o.type === 'coin') {
      const val = magnet > 0 ? (has('sommelier') ? 3 : 2) : 1;
      if (o.air) {
        if (gap < .5 && lift > .8) { o.collected = true; run.caps++; run.airCaps++; A.sfx.air(); reward(150 * val, 'BIRRA AL VOLO!', 'coin'); }
      } else if (gap < .4 + up.nose * .05 || gap < pull || (has('nose') && gap < 1.05)) {
        o.collected = true; run.caps++; A.sfx.beer(); reward(100 * val, combo >= 2 ? 'COMBO!' : 'BIRRA!');
      }
    } else if (o.type === 'helmet' || o.type === 'wine' || o.type === 'grappa') {
      if (gap < .5 || gap < pull) {
        o.collected = true; fxKind = 'power'; fxSerial++;
        if (o.type === 'helmet') {
          A.sfx.power(); flash('blue'); run.helmets++;
          if (lives < maxLives) { lives++; toast('CASCO DI SCORTA! +1 MOTO', 'green'); }
          else { score += 300; pop('CASCO +300', 'blue'); }
        } else if (o.type === 'wine') {
          A.sfx.wine(); flash('wine'); run.magnets++; magnet = (7 + up.nose) * (has('sommelier') ? 2 : 1);
          toast('🍷 VINO ROSSO! BIRRE ATTIRATE E DOPPIE', 'wine');
        } else {
          A.sfx.grappa(); flash('gold'); run.grappas++; grappa = has('grappino') ? 12 : has('blessed') ? 9 : 6; shake = .4;
          if (has('blessed')) charge = Math.min(100, charge + 50);
          toast('🔥 GRAPPA! SUPER SALTO E INVINCIBILE', 'gold'); braulio();
        }
      }
    } else if (o.type === 'water') {
      if (gap < .42 && has('dry')) { o.collected = true; reward(150, 'ACQUA? MAI!', 'trick', false); A.sfx.hit(); }
      else if (gap < .42 && lift < OBSTACLE_HEIGHT.water + .06 && turbo <= 0 && grappa <= 0) {
        o.collected = true; run.waters++; mistake();
        waterT = 3; earsT = Math.max(earsT, 8); breakCombo(); charge = Math.max(0, charge - 30);
        fxKind = 'splash'; fxSerial++; A.sfx.water(); A.say('acqua'); flash('blue');
        toast('💧 ACQUA?! ORECCHIE DA CONIGLIO!', 'blue');
      } else if (gap < .42) { o.collected = true; reward(80, lift > .5 ? 'ACQUA SALTATA!' : 'ACQUA SPACCATA!', 'near', false); }
    } else if (gap < (ice ? .33 : .37)) {   // v49 · ostacoli un filo più tolleranti (sul ghiaccio ancora di più)
      if (turbo > 0 || grappa > 0) { o.collected = true; reward(50, grappa > 0 ? 'GRAPPA POWER!' : 'GAS A MARTELLO!', 'smash', false); shake = Math.max(shake, .35); }
      else if (clearsObstacle(o.type, lift)) {
        run.jumps++;
        const perfect = has('precise') ? phase > .2 && phase < .8 : isPerfectJump(phase);
        const base = o.type === 'rock' || o.type === 'rollRock' || o.type === 'ibex' ? 200 : o.type === 'bigLog' ? 250 : o.type === 'goat' ? 220 : 150;
        const names = { rock: 'ROCCIA SUPERATA!', puddle: 'ASCIUTTO!', step: 'GRADONE SUPERATO!', bigLog: 'TRONCO VOLATO!', goat: 'CAPRA SALTATA!', hay: 'SOPRA IL FIENO!', stump: 'CEPPO SUPERATO!', cairn: 'OMETTO SALTATO!', rollRock: 'SCHIVATA LA FRANA!', ibex: 'STAMBECCO SALTATO!', chamois: 'CAMOSCIO SALTATO!', marmot: 'MARMOTTA SALVA!', snowman: 'PUPAZZO SALTATO!', cone: 'BIRILLO SALTATO!', tyre: 'COPERTONE SALTATO!', sign: 'DIVIETO IGNORATO!', barrier: 'TRANSENNA VOLATA!' };
        if (perfect) { run.perfect++; A.sfx.perfect(); if (touchDevice && navigator.vibrate) try { navigator.vibrate([10, 40, 10]); } catch {} reward(Math.round(base * (has('precise') ? 2 : 1.5)), 'SALTO PERFETTO!', 'perfect'); flash('gold'); slowmo = .3; slowScale = .45; }
        else reward(base, names[o.type] || 'BEL SALTO!', 'jump');
      } else if (wheelie && (o.type === 'root' || o.type === 'puddle')) {
        reward(140, o.type === 'root' ? 'IMPENNATA SULLA RADICE!' : 'IMPENNATA NELLA POZZA!', 'trick'); if (o.type === 'puddle') mud(.35);
      } else if (o.type === 'puddle' && has('amphibious')) {
        reward(90, 'ANFIBIO!', 'trick'); mud(.35); fxKind = 'splash'; fxSerial++; A.sfx.splash();
      } else if (o.type === 'puddle') {
        wet = 1.8 - up.tyres * .2; breakCombo(); run.splashes++; mud(); mistake();
        fxKind = 'splash'; fxSerial++; A.sfx.splash(); flash('blue');
        toast('PLOF! FANGO FINO AL CASCO', 'blue');
      } else if (invincible <= 0 && has('stones') && (o.type === 'rock' || o.type === 'step' || o.type === 'cairn' || o.type === 'rollRock')) {
        // v59 · Angelo, amico delle pietre: la roccia lo rallenta ma non gli costa la moto
        invincible = 1; crash = .5; stun = .5; shake = .5; breakCombo(); mistake(); A.sfx.hit(); fxKind = 'hit'; fxSerial++;
        toast('🪨 AMICO DELLE PIETRE: SOLO UN BACIO', 'green');
      } else if (invincible <= 0 && has('angel') && !run.angelUsed) {
        // v49 · Erika: la prima botta del giro non costa la moto
        run.angelUsed = true; invincible = 1.6; crash = .6; stun = .4; shake = .7; jump = 0; breakCombo(); mistake();
        fxKind = 'hit'; fxSerial++; A.sfx.hit(); flash('hit');
        if (o.type === 'log' || o.type === 'bigLog' || o.type === 'tree') erika();
        toast('💘 CI PENSA GIACU! MOTO SALVA', 'green');
      } else if (invincible <= 0) {
        if (elapsed - lastRiderHit > 5) { lastRiderHit = elapsed; riderLine('hit'); }
        if (ice) endDrift(false);
        lives--; run.hits++; invincible = 1.5 + up.helmet * .25 + (has('veteran') ? 1 : 0) + (bs.protect || 0); breakCombo(); charge = Math.max(0, charge - 20); mistake();
        fxKind = 'hit'; fxSerial++; shake = 1; A.sfx.hit(); flash('hit');
        // v58 · dopo una botta la fila subito dopo si apre: niente botte a catena mentre la moto riparte
        for (const q of objects) if (q !== o && !q.hit && q.z > .66 && q.z < .91 && OBSTACLE_HEIGHT[q.type] !== undefined && q.type !== 'water') q.collected = true;
        crash = 1; stun = .9 * (bs.protect ? .7 : 1) * (has('tank') ? .5 : 1); if (has('tank')) invincible += 1; slowmo = .35; slowScale = .4; jump = 0;
        if (wheelie) endWheelie(false);
        const lines = { rock: 'NON ERA UN SASSOLINO.', bigLog: 'IL TRONCO HA VINTO.', goat: 'LA CAPRA NON SI È SPOSTATA.', hay: 'FIENO DAPPERTUTTO.', rollRock: 'TRAVOLTO DALLA FRANA.', stump: 'CEPPO 1 — PILOTA 0.', cairn: 'HAI SMONTATO L’OMETTO.', ibex: 'LO STAMBECCO HA LE CORNA DURE.', chamois: 'IL CAMOSCIO TI GUARDA MALE.', marmot: 'LA MARMOTTA FISCHIA. DI RABBIA.', tree: 'L’ALBERO NON SI SPOSTA.', snowman: 'PUPAZZO ESPLOSO.', boulder: 'DRITTO SUL PIETRONE.', cone: 'BIRILLO DELLE GEV IN FACCIA.', tyre: 'COPERTONE DELLE GEV.', sign: 'DIVIETO DI TRANSITO… ANCHE PER TE.', barrier: 'LA TRANSENNA DELLE GEV HA VINTO.' };
        if (o.type === 'tree') slalomN = 0;
        // v49 · Erika anche su ogni albero di MontaFiga
        if (o.type === 'log' || o.type === 'bigLog' || o.type === 'tree') erika(); else toast(lines[o.type] || 'DOPO MIGLIORA… DICONO.', 'red');
        if (navigator.vibrate) try { navigator.vibrate(120); } catch {}
        if (has('schettino') && lives > 0) { turbo = Math.max(turbo, 2); setTimeout(() => toast('⚓ CAPITAN SCHETTINO ABBANDONA LA NAVE!', 'gold'), 600); }
        if (gev && lives > 0) setTimeout(() => toast(lives === 1 ? '🚨 ULTIMO TENTATIVO! POI È MULTA' : `🚨 TENTATIVI RIMASTI: ${lives}`, 'red'), 700);
        if (lives <= 0) { hud(); if (!run.continued && P.profile.beers >= CONTINUE_COST) offerContinue(); else finish(false); return; }
      }
    } else if (o.type !== 'puddle' && gap < (has('fox') ? .9 : .68) && invincible <= 0 && o.type !== 'bigLog') {
      run.near++; A.sfx.near(); reward(has('fox') ? 105 : 35, 'PER UN PELO!', 'near', false);
    }
  }
  objects = objects.filter(o => o.z < 1.13 && !o.collected);

  missionCheck -= dt;
  if (missionCheck <= 0) {
    missionCheck = .3;
    run.score = Math.floor(score);
    for (const m of profile.missions) {
      if (announced.has(m.id) || ['clean', 'dry', 'angelo', 'daily'].includes(m.id)) continue;
      if (P.missionProgress(m, run) >= m.target) { announced.add(m.id); A.sfx.mission(); toast('✔ MISSIONE: ' + P.missionText(m).toUpperCase(), 'green'); }
    }
  }

  hud();
  if (course >= GAME_LENGTH && !leap) finish(true);
  else if (leap && course >= GAME_LENGTH && leapState < 2) finish(false, 'time');
  else if (elapsed >= timeLimit) finish(false, 'time');
}

// Schizzi di fango sullo schermo dopo una pozzanghera.
const mudFx = createMud($('game'));
// Tronco preso in pieno: spunta Erika.
let erikaTimer = 0;
// v55 · San Braulio benedice ogni grappa (al massimo una volta ogni 12 s)
let braulioTimer = 0, braulioAt = -99;
function braulio() {
  const el = $('braulio'); if (!el || elapsed - braulioAt < 12) return; braulioAt = elapsed;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(braulioTimer); braulioTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
function erika() {
  const el = $('erika'); if (!el) return;
  const img = el.querySelector('img');
  if (!img.src && FOTO['erika-face']) img.src = FOTO['erika-face'];
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(erikaTimer); erikaTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
function mud(intensity = 1) { mudFx.splash(intensity); }
function mudOld() {
  const layer = $('mud');
  layer.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('i');
    const size = 50 + Math.random() * 110;
    Object.assign(b.style, { width: size + 'px', height: size * (.7 + Math.random() * .5) + 'px', left: Math.random() * 92 + '%', top: (Math.random() < .5 ? Math.random() * 30 : 55 + Math.random() * 35) + '%', animationDelay: Math.random() * .1 + 's' });
    layer.appendChild(b);
  }
  layer.classList.remove('show'); void layer.offsetWidth; layer.classList.add('show');
}

function drawState() {
  return ({
    mode, state, lane, px, vx, jump, lift: curLift(), jumpPhase: jump > 0 ? 1 - jump / jumpDur : 0, elapsed: course,
    wheelie: wheelie ? 1 : 0, ears: earsOn(), grappa, water: waterT,
    courseScale: GAME_LENGTH / (courseLength(P.MODES[mode].difficulty) * 19.5), objects, invincible, roadTime, wheelPhase, turbo, combo, fxKind, fxSerial,
    gas, wet, magnet, whip, shake, crash, speed: speedNow,
    riderName: profile.rider, riderNumber: RIDERS.indexOf(profile.rider) + 1,
    livery: P.currentLivery(), preset: P.MODES[mode].sky, bikeLook: P.currentBike().look, parts: P.currentParts(), sight: bs.sight || 0,
    leapPitch: leap && leapState === 2 ? leapPitch : undefined, leapCam: leap && leapState === 2, canyon: leap && canyonX0 !== null ? { x0: canyonX0, len: canyonLen } : null,
    gev: gev ? { L: 1 + gevSide * 2.15, z: gevZ, arm: gevArm, t: elapsed } : null,
    ice, drift, driftOn: driftT > 0, snowHit: snowT, studs: P.currentParts().studs,
    rivals: (state === 'playing' || state === 'paused' || state === 'countdown' || state === 'ended' || state === 'continue') ? (gGhost && state !== 'ended' ? [...rivals, gGhost.entry] : rivals) : [], weather,
  });
}
function draw() { world?.render(drawState()); }

function frame(t) {
  // v43 · fino a 15 fotogrammi al secondo il gioco va alla stessa velocità (prima sotto i 25 rallentava)
  const dt = Math.min(.066, (t - last) / 1000 || 0);
  last = t;
  pollPad();
  update(dt);
  mudFx.update(dt);
  if (state === 'ready' || state === 'ended') roadTime += dt * .25; // il sentiero scorre piano dietro ai menu
  draw();
  requestAnimationFrame(frame);
}

// ---------- Schermate ----------
function levelBar(info) {
  return `<div class="levelbar"><span>LIV ${info.level} · ${info.grade.toUpperCase()}</span><i><b style="width:${Math.round(info.pct * 100)}%"></b></i><small>${info.into}/${info.need} XP</small></div>`;
}
function missionsHTML(runStats = null) {
  return P.ensureMissions().map(m => {
    const p = P.missionProgress(m, runStats);
    return `<li><span class="mtext">${P.missionText(m)}</span><span class="mprog">${m.target > 1 ? (Number.isInteger(p) ? p : p.toFixed(1)) + '/' + m.target : ''}</span><span class="mxp">+${P.missionXp(m)} XP</span></li>`;
  }).join('');
}
function setMenu(on) { $('game').classList.toggle('menu', on); if (on) $('coach')?.classList.remove('show'); }

// ---------- Officina: si spendono le birre per potenziare moto e pilota ----------
let shopTab = 'upg';
function statBars(st) {
  const rows = [['VELOCITÀ', st.speed || 0, .08], ['SALTO', st.jump || 0, .18], ['STERZO', st.steer || 0, .2], ['TURBO', st.turbo || 0, .25]];
  return `<div class="bstats">${rows.map(([n, v, max]) => `<span class="bs"><small>${n}</small><span class="bar"><span class="fill ${v > 0 ? 'up' : v < 0 ? 'down' : ''}" style="width:${Math.max(8, Math.min(100, Math.round(50 + v / max * 50)))}%"></span></span></span>`).join('')}${st.wheelie ? '<span class="bnote">+' + String(st.wheelie).replace('.', ',') + ' s impennata</span>' : ''}${st.climb ? '<span class="bnote">forte in salita</span>' : ''}</div>`;
}
function renderShop(back, tab = shopTab) {
  shopTab = tab;
  state = 'ready'; setMenu(true);
  $('overlay').classList.remove('hidden');
  const lvlNow = P.levelInfo().level;
  const card = (u) => {
    const lvl = P.upgradeLevel(u.id), cost = P.upgradeCost(u.id), can = cost != null && P.profile.beers >= cost;
    return `<div class="upg ${lvl >= P.MAX_UPGRADE ? 'max' : ''}">
      <span class="ui">${u.icon}</span>
      <span class="ut"><b>${u.name}</b><small>${u.desc}</small><i class="pips">${Array.from({ length: P.MAX_UPGRADE }, (_, k) => `<u class="${k < lvl ? 'on' : ''}"></u>`).join('')}</i></span>
      <button type="button" class="buy" data-buy="${u.id}" ${can ? '' : 'disabled'}>${cost == null ? 'MAX' : cost + ' 🍺'}</button>
    </div>`;
  };
  const cur = P.currentBike();
  const bikeCard = b => {
    const owned = P.ownsBike(b.id), inUse = cur.id === b.id, locked = lvlNow < b.level, can = owned || (!locked && P.profile.beers >= b.price);
    const label = inUse ? 'IN SELLA' : owned ? 'USA' : locked ? '🔒 LIV ' + b.level : b.price + ' 🍺';
    return `<div class="upg bikecard ${inUse ? 'max' : ''} ${b.boanal ? 'boanal' : ''}"><span class="ui bimg"><img src="img/bike-${b.id}.webp?v=64" alt="${b.name}" loading="lazy"></span>
      <span class="ut"><b>${b.name}</b><small>${b.desc}</small>${statBars(b.stats)}</span>
      <button type="button" class="buy" data-bike="${b.id}" ${inUse || !can ? 'disabled' : ''}>${label}</button></div>`;
  };
  const parts = P.currentParts();
  const partRow = p => `<div class="ugroup">${p.name}</div><div class="chips">${p.items.map(it => {
    const owned = P.ownsPart(p.slot, it.id), on = parts[p.slot].id === it.id, can = owned || P.profile.beers >= it.price;
    return `<button type="button" class="chip ${on ? 'on' : ''} ${it.boanal ? 'boanal' : ''}" data-part="${p.slot}:${it.id}" ${!on && !can ? 'disabled' : ''}>${it.color ? `<i style="background:${it.color}"></i>` : ''}<span>${it.name}${it.stats ? `<em class="chipstat">${P.statLabel(it.stats)}</em>` : ''}</span><small>${on ? '✔' : owned ? 'USA' : it.price + ' 🍺'}</small></button>`;
  }).join('')}</div>`;
  const studs = P.PARTS.find(p => p.slot === 'studs');
  const studCard = it => {
    const owned = P.ownsPart('studs', it.id), on = parts.studs.id === it.id, can = owned || P.profile.beers >= it.price;
    const g = it.stats?.grip || 0, d = it.stats?.drift || 0;
    return `<div class="upg bikecard ${on ? 'max' : ''} ${it.boanal ? 'boanal' : ''}"><span class="ui">${it.boanal ? '💎' : it.id === 'none' ? '🛞' : '❄'}</span>
      <span class="ut"><b>${it.name}</b><small>${it.desc || ''}</small><div class="bstats"><span class="bs"><small>GRIP</small><span class="bar"><span class="fill ${g ? 'up' : ''}" style="width:${Math.max(8, Math.round(g / .72 * 100))}%"></span></span></span><span class="bs"><small>DERAPATA</small><span class="bar"><span class="fill ${d ? 'up' : ''}" style="width:${Math.max(8, Math.round(d / .5 * 100))}%"></span></span></span></div></span>
      <button type="button" class="buy" data-part="studs:${it.id}" ${on || !can ? 'disabled' : ''}>${on ? 'MONTATI' : owned ? 'MONTA' : it.price + ' 🍺'}</button></div>`;
  };
  const tabs = [['upg', '🔧 POTENZIAMENTI'], ['bikes', '🏍 MOTO'], ['parts', '🎨 ACCESSORI'], ['ice', '❄ CHIODI']];
  $('card').innerHTML = `<div class="eyebrow">OFFICINA EDT · SPENDI LE BIRRE</div>
    <h1 class="shoptitle">${tab === 'ice' ? 'CHIODI PER<br><em>ICE SCROPHY.</em>' : tab === 'bikes' ? 'SCEGLI<br><em>LA MOTO.</em>' : tab === 'parts' ? 'FALLA<br><em>TUA.</em>' : 'POTENZIA<br><em>MOTO E PILOTA.</em>'}</h1>
    <div class="wallet">🍺 <b>${P.profile.beers}</b> birre in cassa<small class="insella">In sella: ${cur.icon} ${cur.name}</small>${Object.keys(P.currentStats()).length ? `<small class="totstat">In gara: ${P.statLabel(P.currentStats())}</small>` : ''}</div>
    <div class="shoptabs">${tabs.map(([k, n]) => `<button type="button" class="${k === tab ? 'active' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
    ${tab === 'upg' ? ['MOTO', 'PILOTA'].map(g => `<div class="ugroup">${g}</div><div class="upgs">${P.UPGRADES.filter(u => u.group === g).map(card).join('')}</div>`).join('')
      : tab === 'bikes' ? `<div class="upgs">${P.BIKES.map(bikeCard).join('')}</div><p class="tip">Ogni moto cambia davvero la guida. I potenziamenti valgono per tutte.</p>`
      : tab === 'ice' ? `<div class="upgs">${studs.items.map(studCard).join('')}</div><p class="tip">I chiodi contano solo su Ice Scrofy: <b>grip</b> = la moto tiene la linea e non finisce nel muro di neve; <b>derapata</b> = più punti per ogni traverso.</p>`
      : `${P.PARTS.filter(p => !p.ice).map(partRow).join('')}<p class="tip">Gli accessori si vedono sulla moto (e dietro a questo menu). Una volta comprati restano tuoi.</p>`}
    <p class="tip">Le birre si guadagnano raccogliendole in gara (+20 se arrivi al rifugio, +10 per ogni missione).</p>
    <div class="actions"><button class="primary big" id="shopgo">PARTI</button><button class="secondary" id="shopback">INDIETRO</button></div>`;
  iconizeEl($('card'));
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { A.sfx.click(); renderShop(back, b.dataset.tab); });
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    if (P.buyUpgrade(b.dataset.buy)) { A.unlock(); A.sfx.power(); renderShop(back); renderSide(); }
  });
  document.querySelectorAll('[data-bike]').forEach(b => b.onclick = () => {
    const was = P.ownsBike(b.dataset.bike);
    if (P.buyBike(b.dataset.bike)) { A.unlock(); was ? A.sfx.click() : A.sfx.power(); if (!was) toast('🏍 NUOVA MOTO: ' + P.currentBike().name.toUpperCase(), 'gold'); renderShop(back); renderSide(); }
  });
  document.querySelectorAll('[data-part]').forEach(b => b.onclick = () => {
    const [slot, id] = b.dataset.part.split(':'), was = P.ownsPart(slot, id);
    if (P.buyPart(slot, id)) { A.unlock(); was ? A.sfx.click() : A.sfx.power(); renderShop(back); renderSide(); }
  });
  $('shopgo').onclick = start;
  $('shopback').onclick = back;
}
function renderReady() {
  state = 'ready';
  applyLayout(false);
  setMenu(true);
  turbo = 0; elapsed = 0; course = 0;
  $('overlay').classList.remove('hidden');
  $('countdown').className = 'countdown';
  $('trackintro').className = 'trackintro';
  const info = P.levelInfo(), md = P.MODES[mode], best = P.bestFor(mode);
  // v53 · menu ordinato: testata, pilota, percorso scelto in evidenza, partenza, azioni rapide, elenco percorsi a scorrimento
  const sk = SKILLS[profile.rider] || {};
  const missions = P.ensureMissions();
  const trackArt = trackArtOf;
  const art = trackArt(md);
  $('card').innerHTML = `
    <div class="menuhead">
      <img class="menushield" src="img/edt-shield.webp" alt="" width="453" height="520">
      <div><div class="eyebrow"><span class="ebar"></span>ENDURO DRINKING TEAM · STAGIONE ${new Date().getFullYear()}</div>
      <h1 class="title"><span class="t1">TRANQUILLI,</span><span class="t2">È UN GIRO <em>EASY.</em></span></h1></div>
    </div>
    <div class="profilerow">
      <button class="pilotchip" id="pilotchip" type="button"><span class="platenum">${String(RIDERS.indexOf(profile.rider) + 1).padStart(2, '0')}</span>${avatarHTML(profile.rider)}<span class="pctext"><small>PILOTA · TOCCA PER CAMBIARE</small><b>${profile.rider}</b><em class="skillline"><span class="noicx">${sk.icon || ''}</span> ${sk.name || ''}</em></span></button>
      <div class="lvlbox"><span class="lvlnum"><small>LIV</small>${info.level}</span><span class="lvltext"><b>${info.grade.toUpperCase()}</b><i><u style="width:${Math.round(info.pct * 100)}%"></u></i><small>${info.into}/${info.need} XP</small></span></div>
    </div>
    <div class="trackhero sky${md.sky ?? 0} ${md.ice ? 'icy' : ''} ${art ? 'hasart' : ''}">
      ${art ? `<img class="trackart" src="${art}" alt="" onerror="if(!this.dataset.r){this.dataset.r=1;setTimeout(()=>this.src=this.src+'&r='+Date.now(),1500)}">` : ''}
      <div class="thtext"><span class="ps">PS${psOf(md)} · ${md.limit} s</span><b>${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name}</b><small>${md.desc}</small>
      ${md.random === 'run' ? '<span class="strip rnd"><i></i></span>' : stripHTML(md.layout || layoutFor(md.id))}
      <span class="record">${icon('trophy')} ${best ? `RECORD ${md.id === 3 ? 'DI OGGI' : ''}: <b>${best.toLocaleString('it-IT')}</b>` : 'NESSUN RECORD: È IL MOMENTO'}</span></div>
    </div>
    <button class="primary big startbtn" id="start"><span class="st"><span>ACCENDI LA MOTO</span><small>${P.pendingBoosts().length ? '🎁 ' + P.pendingBoosts().map(k => P.PRIZES.find(x => x.id === k)?.name).join(' · ') : A.STYLES[mode].name}</small></span>${icon('chevrons')}</button>
    <div class="quickrow">
      <button class="qbtn" id="openshop" type="button"><span class="qi">🔧</span><b>OFFICINA</b><small>${P.profile.beers} 🍺</small></button>
      ${C.enabled() ? '<button class="qbtn" id="opengroup" type="button"><span class="qi">🏆</span><b>CLASSIFICA</b><small id="grouplead">del gruppo</small></button>' : ''}
      <button class="qbtn" id="openmissions" type="button" aria-expanded="false"><span class="qi">🏁</span><b>MISSIONI</b><small>${missions.length} attive</small></button>
    </div>
    <div class="missions" id="missionbox" hidden><ul>${missionsHTML()}</ul></div>
    <div class="mhead tracks">${icon('flag')} CAMBIA PERCORSO <button class="linkbtn alltracks" id="alltracks" type="button">📋 TUTTI I TRACCIATI ›</button></div>
    <div class="modes" role="radiogroup" aria-label="Percorso">
      ${P.SHOWN().map(m => { const open = P.isUnlocked(m, info.level), ta = trackArt(m); return `<button type="button" role="radio" class="mode sky${m.sky ?? 0} ${m.id === mode ? 'active' : ''} ${m.id === 3 ? 'daily' : ''} ${m.ice ? 'icy' : ''} ${open ? '' : 'locked'}" data-mode="${m.id}" aria-checked="${m.id === mode}" ${open ? '' : 'aria-disabled="true"'}>
        ${ta ? `<img class="modeart" src="${ta}" alt="" onerror="if(!this.dataset.r){this.dataset.r=1;setTimeout(()=>this.src=this.src+'&r='+Date.now(),1500)}">` : ''}<span class="ps">PS${psOf(m)}</span><b>${m.id === 3 ? 'SFIDA ' + P.todayLabel() : m.short}</b><small>${open ? '⏱ ' + m.limit + ' s' : '🔒 LIV ' + m.unlock}</small></button>`; }).join('')}
    </div>
    <div class="menufoot">
      <button class="mini" id="testvoci" type="button">🔊 PROVA VOCI</button><button class="mini" id="musicmenu" type="button">${A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO'}</button>${touchDevice ? `<button class="mini ${tiltOn ? 'on' : ''}" id="tiltmenu" type="button">📱 STERZO INCLINANDO: ${tiltOn ? 'SÌ' : 'NO'}</button>` : ''}
      ${inFull() ? '<button class="mini" id="homebtn" type="button">🏠 ESCI DA SCHERMO INTERO</button>' : ''}
    </div>
    <p class="tip"><span class="desktophint">🖱 Mouse: muovi per sterzare · clic salta · destro gas · rotellina turbo — oppure ← → · SPAZIO · W · B</span><span class="mobilehint">👆 Tieni il dito a sinistra/destra o trascinalo per sterzare · tocca al centro per saltare</span></p>`;
  $('openmissions').onclick = () => { const box = $('missionbox'), open = box.hidden; box.hidden = !open; $('openmissions').setAttribute('aria-expanded', String(open)); $('openmissions').classList.toggle('on', open); A.sfx.click(); };
  requestAnimationFrame(() => { const act = document.querySelector('.modes .mode.active'); if (act) act.parentElement.scrollLeft = act.offsetLeft - act.parentElement.clientWidth / 2 + act.offsetWidth / 2; });
  iconizeEl($('card'));
  $('start').onclick = start;
  $('openshop').onclick = () => renderShop(renderReady);
  $('alltracks').onclick = () => { A.sfx.click(); renderTracks(renderReady); };
  if ($('tiltmenu')) $('tiltmenu').onclick = async () => { const on = await setTilt(!tiltOn); $('tiltmenu').textContent = '📱 STERZO INCLINANDO: ' + (on ? 'SÌ' : 'NO'); $('tiltmenu').classList.toggle('on', on); if (on) toast('📱 INCLINA IL TELEFONO A DESTRA E SINISTRA PER STERZARE', 'green'); };
  $('musicmenu').onclick = () => {
    A.unlock(); A.setMusic(!A.isMusicOn()); $('musicmenu').innerHTML = iconize(A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO');
    if (A.isMusicOn()) { startMusic(); setTimeout(() => { if (state === 'ready') A.musicStop(); }, 6000); } else A.musicStop();
  };
  if ($('opengroup')) {
    $('opengroup').onclick = () => { showHub('classifica'); renderGroup(renderReady, mode); };
    C.load().then(d => { const top = d.boards?.[mode]?.[0]; if ($('grouplead')) $('grouplead').textContent = top ? `1° ${top.n} · ${top.s.toLocaleString('it-IT')}` : 'nessuno ancora: vai!'; }).catch(() => {});
  }
  $('testvoci').onclick = () => {
    const names = { vai: 'Vai Ciccio!', success: 'Così si fa!', gas: 'Dai gas!', yeehaw: 'Yee-haw!', campa: 'Campa giù!', fine: 'Fatto' };
    $('testvoci').disabled = true;
    A.unlock();
    A.testVoices((k, ok, st) => {
      $('testvoci').innerHTML = iconize(k === 'fine' ? '🔊 PROVA VOCI' : `🔊 ${names[k]}${ok ? '' : ' (manca)'}${st !== 'running' ? ' · audio ' + st : ''}`);
      if (k === 'fine') $('testvoci').disabled = false;
    });
  };
  // v43 · a schermo intero il pannello piloti/garage/classifica non si vede: si esce e si va lì.
  const toPage = sel => { const go = () => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (inFull()) { exitFull(); setTimeout(go, 350); } else go(); };
  $('pilotchip').onclick = () => { showHub('pilota'); if (inFull()) exitFull(); setTimeout(() => openPanel(document.querySelector('.riderpanel')), inFull() ? 250 : 0); };
  if ($('homebtn')) $('homebtn').onclick = () => { if (inFull()) exitFull(); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 350); };
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    const m = P.MODES[Number(b.dataset.mode)];
    if (!P.isUnlocked(m)) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); toast('🔒 PERCORSO BLOCCATO: ARRIVA AL LIVELLO ' + m.unlock, 'red'); return; }
    mode = m.id; profile.mode = mode; P.save(); A.sfx.click();
    renderReady(); renderSide();
  });
  setDisabled(false);
  hud();
}

// Classifica derapate di Ice Scrofy (tu + i tre compagni).
function iceTable(win) {
  const rows = [{ n: profile.rider, d: Math.round(driftScore), me: true }, ...rivals.map(r => ({ n: r.name, d: Math.round(r.drift) }))].sort((a, b) => b.d - a.d);
  return `<br>❄ <b>${run.position}° su ${rows.length}</b> nella gara di derapate${run.position === 1 && win ? ' · re del ghiaccio +500' : ''}<span class="icetable">${rows.map((r, i) => `<span class="${r.me ? 'me' : ''}"><i>${i + 1}°</i>${r.n}<b>${r.d.toLocaleString('it-IT')}</b></span>`).join('')}</span>`;
}
function renderResult(win, res, reason = '', timeBonus = 0) {
  const rank = win ? (score >= 30000 ? 'LEGGENDA EDT' : score >= 15000 ? 'MANICO DEL GIORNO' : 'MISSIONE COMPIUTA') : 'GIRO DIVERSAMENTE EASY';
  const md = P.MODES[mode];
  const xpTotal = res.scoreXp + res.missionsXp;
  $('overlay').classList.remove('hidden');
  setMenu(true);
  $('card').innerHTML = `
    <div class="eyebrow">${rank} · ${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name.toUpperCase()}</div>
    <div class="resulthead">${avatarHTML(profile.rider, 'big')}<h1>${leap ? (win ? `${leapBest.toFixed(1).replace('.', ',')} METRI<br><em>IN PIEDI!</em>` : 'SALTO<br><em>NULLO.</em>') : gev ? (win ? 'SEMINATE<br><em>LE GEV!</em>' : reason === 'time' ? 'TI HANNO<br><em>RAGGIUNTO.</em>' : 'MULTA!<br><em>VERBALE EDT.</em>') : ice && win && run.position === 1 ? 'RE DEL<br><em>GHIACCIO!</em>' : win ? 'COSÌ<br><em>SI FA!</em>' : reason === 'time' ? 'FUORI TEMPO<br><em>MASSIMO.</em>' : 'COLPA<br><em>DI ANGELO.</em>'}</h1></div>
    <div class="scoreticket ${res.isRecord ? 'record' : ''}"><b id="finalscore">0</b><span>PUNTI EDT</span>${res.isRecord ? '<i class="stamp">NUOVO RECORD!</i>' : ''}</div>
    ${gev && !win ? gevVerbale() : ''}<p class="resulttext">${gev && win ? '<b>Niente verbali, più boccali!</b> ' : ''}${profile.rider} ${gev && !win ? `è stato fermato dalle GEV al ${Math.floor(course / GAME_LENGTH * 100)}% del percorso.` : win ? `è arrivato al rifugio in <b>${elapsed.toFixed(1).replace('.', ',')} s</b>${timeBonus ? ` · bonus tempo +${timeBonus.toLocaleString('it-IT')}` : ''}.` : reason === 'time' ? `si è fermato al ${Math.floor(course / GAME_LENGTH * 100)}% del percorso. Al rifugio hanno già chiuso la cucina.` : 'ci ha creduto fino all’ultimo. “Dopo migliora”, dicevano.'}
      ${ice ? iceTable(win) : ''}${run.position && !ice ? `<br>🏁 <b>${run.position}° su ${rivals.length + 1}</b> nel gruppo${run.position === 1 && win ? ' · primo al rifugio +500' : ''}${run.shortcuts ? ' · ' + run.shortcuts + (run.shortcuts > 1 ? ' tagli' : ' taglio') + ' di Angelo' : ''}` : ''}      ${res.position ? `<br><b>${res.position}° su questo telefono</b>` : ''}${earsPermanent ? '<br>🐰 Finito con le orecchie da coniglio (più di 3 errori).' : ''}${run.ghostRecord ? '<br>👻 Miglior tempo al rifugio: ' + run.finishTime.toFixed(1) + 's — il tuo fantasma ti aspetta al prossimo giro.' : ''}${!res.isRecord && res.previousBest ? ` · record: ${res.previousBest.toLocaleString('it-IT')}` : ''}</p>
    <div class="resultstats">
      <div><b>${run.caps}</b><small>BIRRE</small></div>
      ${ice ? `<div><b>${driftCount}</b><small>DERAPATE</small></div><div><b>${driftBest.toLocaleString('it-IT')}</b><small>LA PIÙ BELLA</small></div>` : `<div><b>${run.jumps}</b><small>SALTI</small></div>`}
      <div><b>${run.wheelieMax ? run.wheelieMax.toFixed(1).replace('.', ',') + 's' : run.perfect}</b><small>${run.wheelieMax ? 'IMPENNATA' : 'PERFETTI'}</small></div>
      <div><b>×${run.maxMult}</b><small>COMBO MAX</small></div>
      <div><b>${win ? elapsed.toFixed(1).replace('.', ',') + 's' : Math.floor(course / GAME_LENGTH * 100) + '%'}</b><small>${win ? 'TEMPO' : 'PERCORSO'}</small></div>
    </div>
    ${res.completed.length ? `<div class="donelist">${res.completed.map(c => `<div><span>✔ ${c.text}</span><b>+${c.xp} XP</b></div>`).join('')}</div>` : ''}
    <div class="loot">
      <div class="beerline">🍺 <b>+${res.beersEarned}</b> birre portate al rifugio <small>in cassa: ${res.wallet} 🍺</small></div>
      ${res.prize ? `<div class="prize"><span class="pi">${res.prize.icon}</span><span><small>PREMIO DEL RIFUGIO</small><b>${res.prize.name}${res.prize.amount ? ' +' + res.prize.amount + ' 🍺' : ''}</b>${res.prize.amount ? '' : '<em>' + res.prize.desc + ' (prossimo giro)</em>'}</span></div>` : `<div class="noprize">Arriva al rifugio per vincere un premio.</div>`}
    </div>
    <div class="xpline">+${xpTotal} XP ${res.after.level > res.before.level ? `· <b class="lvup">LIVELLO ${res.after.level}: ${res.after.grade.toUpperCase()}!</b>` : ''}</div>
    ${levelBar(res.after)}
    ${res.after.level > res.before.level ? P.SHOWN().filter(m => m.unlock > res.before.level && m.unlock <= res.after.level).map(m => `<div class="unlock track"><i class="ic-holder">🏁</i><span>NUOVO PERCORSO SBLOCCATO: <b>${m.name}</b></span></div>`).join('') : ''}
    ${res.unlocked.map(l => `<div class="unlock"><i style="--a:${l.plastic};--b:${l.accent}"></i><span>NUOVA LIVREA SBLOCCATA: <b>${l.name}</b> · sceglila nel garage</span></div>`).join('')}
    ${C.enabled() && score > 0 ? '<div class="groupres" id="groupres"></div>' : ''}
    <div class="actions">
      <button class="primary big" id="again"><span>UN ALTRO GIRO</span>${icon('chevrons')}</button>
      <button class="secondary hot" id="shareScore">SFIDA IL GRUPPO</button>
      <button class="secondary shopsec" id="shopres">🔧 OFFICINA</button>
      <button class="secondary" id="menu">MENU</button>
    </div>`;
  iconizeEl($('card'));
  $('again').onclick = start;
  $('menu').onclick = renderReady;
  $('shopres').onclick = () => renderShop(renderReady);
  $('shareScore').onclick = () => shareScore(win, res);
  const bindResult = () => { $('again').onclick = start; $('menu').onclick = renderReady; $('shopres').onclick = () => renderShop(renderReady); $('shareScore').onclick = () => shareScore(win, res); if ($('finalscore')) $('finalscore').textContent = score.toLocaleString('it-IT'); if ($('groupres') && lastGroupRun) groupResult(lastGroupRun); };
  resultSnapshot = { html: $('card').innerHTML, bind: bindResult };
  const gOK = win && !ice && P.MODES[mode].random !== 'run';
  if ($('groupres')) groupResult({ score, mode, rider: profile.rider, time: win ? elapsed : 0, win, g: gOK ? C.encodeGhost([...ghostSplits, GAME_LENGTH]) : '' });
  // Conteggio animato del punteggio
  const target = score, t0 = performance.now();
  const tick = now => {
    const k = Math.min(1, (now - t0) / 1100), v = Math.floor(target * (1 - Math.pow(1 - k, 3)));
    const el = $('finalscore'); if (!el) return;
    el.textContent = v.toLocaleString('it-IT');
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  if (win || res.isRecord) confetti();
}

// ---------- Classifica del gruppo (online) ----------
const MODE_LABEL = m => m === 3 ? 'SFIDA ' + P.todayLabel() : P.MODES[m].short;
function groupListHTML(list, me = '') {
  if (!list?.length) return '<li class="empty">Ancora nessuno qui: il primo posto è libero.</li>';
  const mine = C.cleanNick(me).toLowerCase();
  return list.map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${mine && e.n.toLowerCase() === mine ? 'me' : ''}"><span class="pos">${i + 1}</span>${RIDERS.includes(e.r) ? avatarHTML(e.r, 'tiny') : '<i class="noav"></i>'}<span class="who">${e.n}${e.r && e.r !== e.n ? `<small>${e.r}</small>` : ''}</span><span class="when">${e.bt ? '⏱ ' + C.fmtTime(e.bt) : e.w && e.t ? '⏱ ' + C.fmtTime(e.t) : ''}</span><b>${e.s.toLocaleString('it-IT')}</b></li>`).join('');
}
// v48 · classifica dei tempi migliori al rifugio
function timeListHTML(list, me = '') {
  if (!list?.length) return '<li class="empty">Nessuno è ancora arrivato al rifugio qui.</li>';
  const mine = C.cleanNick(me).toLowerCase();
  return list.slice(0, 10).map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${mine && e.n.toLowerCase() === mine ? 'me' : ''}"><span class="pos">${i + 1}</span>${RIDERS.includes(e.r) ? avatarHTML(e.r, 'tiny') : '<i class="noav"></i>'}<span class="who">${e.n}${e.r && e.r !== e.n ? `<small>${e.r}</small>` : ''}</span><span class="when">${e.s ? e.s.toLocaleString('it-IT') + ' pt' : ''}</span><b>⏱ ${C.fmtTime(e.t)}</b></li>`).join('');
}
let groupKind = 'score';
// Riquadro nel risultato: invia il punteggio col nome salvato, oppure chiede il nome la prima volta.
let lastGroupRun = null;
function groupResult(runInfo) {
  lastGroupRun = runInfo;
  const box = $('groupres'); if (!box) return;
  const nick = C.getNick();
  if (!nick) {
    box.innerHTML = `<div class="ghead">🏆 CLASSIFICA DEL GRUPPO</div>
      <p>Metti il tuo nome: il punteggio va nella classifica di tutto l'EDT.</p>
      <form class="nickrow" id="nickform"><input id="nickin" maxlength="16" autocomplete="nickname" placeholder="Il tuo nome" value="${C.cleanNick(profile.rider)}"><button class="primary" type="submit"><span>INVIA</span></button></form>`;
    $('nickform').onsubmit = e => { e.preventDefault(); const n = C.cleanNick($('nickin').value); if (!n) return; C.setNick(n); groupResult(runInfo); };
    return;
  }
  const show = d => {
    if (!$('groupres')) return;
    const pos = C.positionOf(d, runInfo.mode, nick), list = d.boards?.[runInfo.mode] || [];
    const best = list.find(e => e.n.toLowerCase() === nick.toLowerCase());
    $('groupres').innerHTML = `<div class="ghead">🏆 CLASSIFICA DEL GRUPPO · ${MODE_LABEL(runInfo.mode)}</div>
      <p class="gpos">${pos ? `<b>${nick}</b> è <b class="big">${pos}°</b>${best && best.s > runInfo.score ? ` (record ${best.s.toLocaleString('it-IT')})` : ''}` : `<b>${nick}</b>: fuori dai primi 10. Dopo migliora!`}</p>${(() => { const tl = C.timesFor(d, runInfo.mode), ti = tl.findIndex(e => e.n.toLowerCase() === nick.toLowerCase()); return ti >= 0 ? `<p class="gpos">⏱ Tempi migliori: <b>${ti + 1}°</b> con ${C.fmtTime(tl[ti].t)}${tl[0] && ti > 0 ? ` (1° ${tl[0].n}: ${C.fmtTime(tl[0].t)})` : ''}</p>` : ''; })()}
      <ol class="board gboard">${groupListHTML(list.slice(0, 5), nick)}</ol>
      <div class="grow"><button class="secondary" type="button" id="gall">TUTTA LA CLASSIFICA</button><button class="linkbtn" type="button" id="gnick">non sei ${nick}?</button></div>`;
    $('gall').onclick = () => renderGroup(() => renderResultAgain(), runInfo.mode);
    $('gnick').onclick = () => { C.setNick(''); groupResult({ ...runInfo, sent: null }); };
  };
  if (runInfo.sent && runInfo.sentAs === nick) { show(runInfo.sent); return; }
  box.innerHTML = `<div class="ghead">🏆 CLASSIFICA DEL GRUPPO · ${MODE_LABEL(runInfo.mode)}</div><p class="gwait">Invio il punteggio di <b>${nick}</b>…</p>`;
  const { sent, sentAs, ...payload } = runInfo;
  C.submit({ ...payload, name: nick, v: String(GAME_VERSION) }).then(d => {
    runInfo.sent = d; runInfo.sentAs = nick; lastGroupRun = runInfo;
    show(d); renderSide();
  }).catch(() => {
    if (!$('groupres')) return;
    $('groupres').innerHTML = `<div class="ghead">🏆 CLASSIFICA DEL GRUPPO</div><p>La classifica non risponde (rete lenta o assente). <b>Punteggio messo da parte</b>: parte da solo appena c'è rete.</p><button class="secondary" type="button" id="gretry">RIPROVA ADESSO</button>`;
    $('gretry').onclick = () => groupResult(runInfo);
  });
}
let resultSnapshot = null;
function renderResultAgain() { if (resultSnapshot) { state = 'ended'; setMenu(true); $('overlay').classList.remove('hidden'); $('card').innerHTML = resultSnapshot.html; resultSnapshot.bind(); } else renderReady(); }
// Schermata con tutte le classifiche del gruppo, un percorso per scheda.
// ---------- v61 · Sezione Tracciati: tutti i percorsi con le loro caratteristiche ----------
const TRACK_INFO = {
  0: { tipo: 'Il classico', ostacoli: 'Tronchi, radici, ceppi, pozzanghere, gradoni, sassi e capre', speciale: 'Rampe con le birre al volo, tronco di traverso da saltare, il taglio delle 16.00', consiglio: 'Segui le birre: segnano sempre la corsia libera.' },
  1: { tipo: 'Due salitoni e due mulattiere', ostacoli: 'Più fango, pozze, gradoni, sassi e frane', speciale: 'Salite dure: senza GAS ti pianti', consiglio: 'Un tocco su GAS in salita lo blocca aperto.' },
  2: { tipo: 'Gara di salto', ostacoli: 'Sassi e gradoni nella rincorsa, rocce nella zona di atterraggio', speciale: 'Trampolino nel vuoto: vince il salto più lungo atterrato in piedi (100 punti a metro)', consiglio: 'Turbo prima del trampolino, SALTA sul bordo, poi GAS o IMPENNA per tenere il muso su.' },
  3: { tipo: 'Tracciato del giorno', ostacoli: 'Cambiano ogni giorno', speciale: 'Uguale per tutti: classifica che si azzera a mezzanotte', consiglio: 'Primo giro per imparare il tracciato, secondo per fare il tempo.' },
  9: { tipo: 'Pista di ghiaccio a curve', ostacoli: 'Pupazzi di neve e balle di fieno', speciale: 'Vince chi derapa di più e meglio: punti derapata, porte da passare di traverso', consiglio: 'GAS in curva per mettere la moto di traverso e controsterza. Monta le gomme chiodate.' },
  10: { tipo: 'Bagnatissimo e hard', ostacoli: 'Pietraie bagnate, gradoni viscidi, pozze, radici', speciale: 'Diluvio continuo: si sterza peggio', consiglio: 'Gomme tassellate e niente frenesia: una corsia alla volta.' },
  11: { tipo: 'Valle alpina selvaggia', ostacoli: 'Sassi, ometti di pietra, marmotte', speciale: 'Guadi su tutta la pista da saltare e stambecchi, camosci e capre che attraversano', consiglio: 'Al guado salta: se no scarponi pieni d’acqua.' },
  12: { tipo: 'Slalom nel bosco', ostacoli: 'Alberi in pista: non si saltano, si schivano', speciale: 'Varco che cambia corsia a ogni fila: bonus slalom a catena. A ogni albero preso arriva Erika', consiglio: 'Guarda due file avanti, non quella davanti alla ruota.' },
  13: { tipo: 'Fuga dalle GEV', ostacoli: 'Birilli, copertoni, cartelli e transenne lanciati dalla jeep', speciale: 'Le moto sono i tentativi: finiti quelli (o il tempo) arriva la multa', consiglio: 'Turbo o grappa per seminare la jeep.' },
  14: { tipo: 'Fango puro', ostacoli: 'Pozzanghere e alberi, nient’altro', speciale: 'Partenza dalla cascina del Gusta Ranch sulle colline', consiglio: 'Le pozze rallentano, gli alberi fanno male: scegli il male minore.' },
};
function renderTracks(back) {
  if (state !== 'ended') state = 'ready';
  setMenu(true); $('overlay').classList.remove('hidden');
  const info = P.levelInfo(), stars = d => '★'.repeat(d + 1) + '☆'.repeat(2 - d);
  $('card').innerHTML = `<div class="eyebrow">ENDURO DRINKING TEAM · ${P.SHOWN().length} PROVE SPECIALI</div>
    <h1 class="shoptitle">TUTTI I<br><em>TRACCIATI.</em></h1>
    <div class="tracklist">${P.SHOWN().map(m => { const ti = TRACK_INFO[m.id] || {}, open = P.isUnlocked(m, info.level), best = P.bestFor(m.id);
      return `<button type="button" class="trackcard ${m.id === mode ? 'active' : ''} ${open ? '' : 'locked'}" data-track="${m.id}">
        <span class="tcart"><img src="${trackArtOf(m)}" alt="" loading="lazy">${open ? '' : `<i class="tclock">🔒 LIV ${m.unlock}</i>`}</span>
        <span class="tcbody"><span class="ps">PS${psOf(m)} · ${ti.tipo || ''}</span><b>${m.id === 3 ? 'Sfida del giorno' : m.name}</b><small>${m.desc}</small>
        <span class="tcfacts"><span>⏱ <b>${m.limit} s</b></span><span>🔥 <b>${stars(m.difficulty || 0)}</b></span><span>🔓 <b>LIV ${m.unlock || 1}</b></span><span>🏆 <b>${best ? best.toLocaleString('it-IT') : '—'}</b></span></span>
        <span class="tcrow"><em>Ostacoli</em>${ti.ostacoli || ''}</span>
        <span class="tcrow"><em>Speciale</em>${ti.speciale || ''}</span>
        <span class="tcrow"><em>Consiglio</em>${ti.consiglio || ''}</span>
        <span class="tcrow"><em>Musica</em>🎵 ${A.STYLES[m.id]?.name || ''}</span></span></button>`; }).join('')}</div>
    <div class="actions"><button class="primary" id="tback"><span>⬅ MENU PRINCIPALE</span></button></div>`;
  document.querySelectorAll('[data-track]').forEach(b => b.onclick = () => {
    const m = P.MODES[Number(b.dataset.track)];
    if (!P.isUnlocked(m, info.level)) { toast(`🔒 SI SBLOCCA AL LIVELLO ${m.unlock}`, 'red'); return; }
    mode = m.id; profile.mode = mode; P.save(); A.sfx.click(); applyLayout(); renderSide(); back();
  });
  $('tback').onclick = back;
  $('card').scrollTop = 0;
}
function renderGroup(back, m = mode) {
  if (state !== 'ended') state = 'ready';
  setMenu(true); $('overlay').classList.remove('hidden');
  const nick = C.getNick();
  const draw = (d, err) => {
    $('card').innerHTML = `<div class="eyebrow">ENDURO DRINKING TEAM · TUTTI I TELEFONI</div>
      <h1 class="shoptitle">CLASSIFICA<br><em>DEL GRUPPO.</em></h1>
      <div class="boardtabs gtabs">${P.SHOWN().map(x => `<button type="button" class="${x.id === m ? 'active' : ''}" data-gmode="${x.id}">${x.id === 3 ? 'OGGI' : x.short}</button>`).join('')}</div>
      <div class="kindtabs"><button type="button" class="${groupKind === 'score' ? 'active' : ''}" data-gkind="score">🏆 PUNTI</button><button type="button" class="${groupKind === 'time' ? 'active' : ''}" data-gkind="time">⏱ TEMPI MIGLIORI</button></div>
      <p class="gsub">PS${psOf(P.MODES[m])} · ${m === 3 ? 'Sfida del ' + P.todayLabel() + ' (si azzera ogni giorno)' : P.MODES[m].name} · migliori 10, un record a testa</p>
      ${err ? '<p class="gwait">Classifica non raggiungibile: controlla la rete.</p>' : d ? `<ol class="board gboard ${groupKind === 'time' ? 'timeboard' : ''}">${groupKind === 'time' ? timeListHTML(C.timesFor(d, m), nick) : groupListHTML(d.boards?.[m], nick)}</ol>` : '<p class="gwait">Carico la classifica…</p>'}
      <p class="note">${nick ? `In classifica come <b>${nick}</b>.` : 'Il tuo nome lo scegli alla fine del primo giro.'}</p>
      <div class="actions"><button class="primary" id="gback"><span>INDIETRO</span></button><button class="secondary" id="greload">AGGIORNA</button></div>`;
    iconizeEl($('card'));
    document.querySelectorAll('[data-gmode]').forEach(b => b.onclick = () => { m = Number(b.dataset.gmode); draw(C.cached()); });
    document.querySelectorAll('[data-gkind]').forEach(b => b.onclick = () => { groupKind = b.dataset.gkind; draw(C.cached()); });
    $('gback').onclick = back;
    $('greload').onclick = () => { draw(null); C.load(true).then(x => draw(x)).catch(() => draw(null, true)); };
  };
  draw(C.cached());
  C.load().then(d => draw(d)).catch(() => { if (!C.cached()) draw(null, true); });
}

function confetti() {
  const layer = $('confetti');
  layer.innerHTML = '';
  const colors = ['#ffcf16', '#e3301c', '#ffffff', '#3ee28f', '#ff8b4f'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * .6) + 's';
    c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
    c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    c.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
    layer.appendChild(c);
  }
  setTimeout(() => layer.innerHTML = '', 3800);
}

// ---------- Pannello laterale: pilota, garage, classifica ----------
const GAME_VERSION = 64;
// v57 · invia i punteggi rimasti in sospeso (all'avvio, quando torna la rete e ogni 2 minuti)
setTimeout(() => C.flushPending().then(n => { if (n) { toast(`🏆 INVIATI ${n} PUNTEGGI RIMASTI IN SOSPESO`, 'green'); renderSide(); } }).catch(() => {}), 4000);
window.addEventListener('online', () => C.flushPending().catch(() => {}));
setInterval(() => { if (state !== 'playing' && C.pendingCount()) C.flushPending().catch(() => {}); }, 120000);
$('edition').textContent = 'GIRO EASY · V' + GAME_VERSION;   // il numero in alto segue sempre la versione
let boardMode = null, boardSrc = 'group', sideLoadedAt = 0;
function renderSide() {
  $('ridergrid').innerHTML = RIDERS.map((name, i) => `<button type="button" class="rideroption" data-rider="${name}" aria-pressed="${name === profile.rider}" aria-label="Scegli ${name}">
    ${avatarHTML(name)}<span class="name">${name.replace('Il ', '')}</span><span class="skill" title="${SKILLS[name]?.desc || ''}"><span class="noicx">${SKILLS[name]?.icon || ''}</span> ${SKILLS[name]?.name || ''}</span><span class="num">#${String(i + 1).padStart(2, '0')}</span>${RIDER_VOICE[name] ? '<i class="voiced" title="Parla con la sua voce">' + icon('speaker') + '</i>' : ''}</button>`).join('');
  document.querySelectorAll('[data-rider]').forEach(b => b.onclick = () => {
    if (state === 'playing' || state === 'paused' || state === 'countdown') return;
    profile.rider = b.dataset.rider; P.save(); A.unlock(); if (riderVoice()) { A.preloadRider(riderVoice()); riderLine('start'); } else A.sfx.click();
    renderSide(); if (state === 'ready') renderReady();
    if (window.matchMedia('(max-width: 900px)').matches) $('game').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const info = P.levelInfo(), current = P.currentLivery();
  $('garagelevel').innerHTML = levelBar(info) + `<button class="shopside" id="shopside" type="button">🔧 Officina · ${P.profile.beers} 🍺 in cassa</button><button class="shopside bikeside" id="bikeside" type="button">${P.currentBike().icon} In sella: <b>${P.currentBike().name}</b> · cambia moto e accessori</button>`;
  iconizeEl($('ridergrid')); iconizeEl($('garagelevel'));
  const fromPanel = fn => { const was = !!maxPanel; if (was) closePanel(false); fn(); setTimeout(() => { $('game').scrollIntoView({ behavior: 'auto', block: 'start' }); if (was && touchDevice) goFull(); }, was ? 300 : 0); };
  $('shopside').onclick = () => { if (state === 'ready' || state === 'ended') fromPanel(() => renderShop(renderReady)); };
  $('bikeside').onclick = () => { if (state === 'ready' || state === 'ended') fromPanel(() => renderShop(renderReady, 'bikes')); };
  $('liveries').innerHTML = P.LIVERIES.map(l => {
    const locked = l.level > info.level;
    return `<button type="button" class="livery ${l.id === current.id ? 'active' : ''}" data-livery="${l.id}" ${locked ? 'aria-disabled="true"' : ''} title="${locked ? 'Si sblocca al livello ' + l.level : l.name}">
      <i style="--a:${l.plastic};--b:${l.accent};--c:${l.jersey}"><b class="lvicon">${l.icon || ''}</b></i><span>${locked ? '🔒 LIV ' + l.level : l.name}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-livery]').forEach(b => b.onclick = () => {
    if (state === 'playing' || state === 'paused' || state === 'countdown') return;
    const l = P.LIVERIES.find(x => x.id === b.dataset.livery);
    if (l.level > P.levelInfo().level) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
    profile.livery = l.id; P.save(); A.sfx.click(); renderSide();
  });

  const bm = boardMode ?? mode;
  $('boardtabs').innerHTML = P.SHOWN().map(m => `<button type="button" class="${m.id === bm ? 'active' : ''}" data-board="${m.id}">${m.id === 3 ? 'OGGI' : m.short}</button>`).join('');
  document.querySelectorAll('[data-board]').forEach(b => b.onclick = () => { boardMode = Number(b.dataset.board); renderSide(); });
  const group = boardSrc === 'group' && C.enabled();
  document.querySelectorAll('[data-src]').forEach(b => { b.classList.toggle('active', b.dataset.src === (group ? 'group' : 'local')); b.onclick = () => { boardSrc = b.dataset.src; renderSide(); }; });
  $('boardsrc').hidden = !C.enabled();
  $('boardtitle').textContent = group ? 'Chi comanda nel gruppo' : 'Chi comanda su questo telefono';
  $('boardnote').textContent = group ? 'Classifica di tutto l’EDT: un record a testa, migliori 10 per percorso.' : 'Classifica salvata solo su questo dispositivo: passate il telefono al prossimo.';
  if (group) {
    const d = C.cached();
    $('board').innerHTML = d ? groupListHTML(d.boards?.[bm], C.getNick()) : '<li class="empty">Carico la classifica del gruppo…</li>';
    if (!d || sideLoadedAt < Date.now() - 60000) { sideLoadedAt = Date.now(); C.load().then(() => renderSide()).catch(() => { if (!C.cached()) $('board').innerHTML = '<li class="empty">Classifica del gruppo non raggiungibile.</li>'; }); }
  } else {
    const list = P.boardFor(bm);
    $('board').innerHTML = list.length
      ? list.map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''}"><span class="pos">${i + 1}</span>${avatarHTML(e.name, 'tiny')}<span class="who">${e.name}</span><span class="when">${e.date}</span><b>${e.score.toLocaleString('it-IT')}</b></li>`).join('')
      : `<li class="empty">Ancora nessun giro qui. Passa il telefono e iniziate la sfida.</li>`;
  }
  iconizeEl($('liveries'));
  if ($('previewname')) $('previewname').textContent = current.name + ' · ' + P.currentBike().name;
  if ($('bikestrip')) {   // v62 · tutte le moto del garage, quella in sella evidenziata
    const cur = P.currentBike().id, lv = P.levelInfo().level;
    $('bikestrip').innerHTML = P.BIKES.map(b => { const own = P.ownsBike(b.id), on = b.id === cur;
      const tag = on ? 'IN SELLA' : own ? 'TOCCA PER USARE' : lv < b.level ? '🔒 LIV ' + b.level : b.price + ' 🍺';
      return `<button type="button" class="bk ${on ? 'on' : ''} ${own ? 'own' : 'lock'}" data-bike="${b.id}" aria-pressed="${on}"><img src="img/bike-${b.id}.webp?v=64" alt="" loading="lazy"><b>${b.name}</b><small>${tag}</small></button>`; }).join('');
    $('bikestrip').querySelectorAll('.bk').forEach(el => el.onclick = () => {
      const id = el.dataset.bike;
      if (state === 'playing' || state === 'paused' || state === 'countdown') return;
      if (P.ownsBike(id)) { P.buyBike(id); A.sfx.click(); renderSide(); }
      else if (state === 'ready' || state === 'ended') fromPanel(() => renderShop(renderReady, 'bikes'));
    });
  }
  if ($('bikephoto')) { const bid = P.currentBike().id; if ($('bikephoto').dataset.bike !== bid) { $('bikephoto').dataset.bike = bid; $('bikephoto').innerHTML = `<img src="img/bike-${bid}.webp?v=64" alt="${P.currentBike().name}"><span>${P.currentBike().icon} ${P.currentBike().name}</span>`; } }
}

// ---------- Condivisione ----------
// Su un hosting proprio è l'indirizzo della pagina; nella versione link Claude lo imposta index.html.
const publicGameURL = window.EDT_PUBLIC_URL || new URL('./', window.location.href).href;
function status(t) { $('sharestatus').textContent = t; }
async function shareText(text) {
  $('sharefallback').hidden = true;
  if (navigator.share && !window.EDT_TEXT_SHARE) {
    try { await navigator.share({ title: 'Giro Easy · Enduro Drinking Team', text, url: publicGameURL }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text + ' ' + publicGameURL); status('Link e messaggio copiati: incollali nel gruppo.'); return; }
  } catch {}
  const out = $('sharefallback'); out.hidden = false; out.value = text + ' ' + publicGameURL; out.focus(); out.select();
  status('Copia questo messaggio e incollalo nel gruppo.');
}
$('sharelink').onclick = $('sharelink2').onclick = () => shareText('Tranquilli, è un giro easy! Scegli il tuo pilota EDT e prova ad arrivare al rifugio. Vai Ciccio!');

function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
// Crea l'immagine del punteggio da mandare nel gruppo.
async function scoreCard(win, res) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  try { await document.fonts?.load('80px Anton'); } catch {}
  const F = n => n + 'px Anton, Impact, sans-serif';
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1a17'); g.addColorStop(1, '#0d0f0d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Logo
  const logo = await loadImage('edt-logo.png');
  if (logo) { const w = 430, h = w * logo.height / logo.width; x.fillStyle = '#fff'; roundRect(x, W / 2 - w / 2 - 14, 46, w + 28, h + 28, 22); x.fill(); x.drawImage(logo, W / 2 - w / 2, 60, w, h); }
  // Foto del pilota
  const cy = 488, R = 112;
  const photo = photoURL(profile.rider) ? await loadImage(photoURL(profile.rider)) : null;
  x.save(); x.beginPath(); x.arc(W / 2, cy, R, 0, Math.PI * 2); x.closePath(); x.fillStyle = '#3a312a'; x.fill(); x.clip();
  if (photo) x.drawImage(photo, W / 2 - R, cy - R, R * 2, R * 2);
  else { x.fillStyle = '#ffcf16'; x.font = F(100); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(profile.rider.replace('Il ', '').slice(0, 2).toUpperCase(), W / 2, cy + 6); x.textBaseline = 'alphabetic'; }
  x.restore();
  x.lineWidth = 10; x.strokeStyle = '#ffcf16'; x.beginPath(); x.arc(W / 2, cy, R + 3, 0, Math.PI * 2); x.stroke();
  x.textAlign = 'center';
  x.fillStyle = '#fff3de'; x.font = F(64); x.fillText(profile.rider.toUpperCase(), W / 2, cy + R + 82);
  // Fascia gialla con il punteggio
  const by = 850;
  x.save(); x.translate(W / 2, by); x.rotate(-.07); x.fillStyle = '#ffcf16'; x.fillRect(-W, -125, W * 2, 250); x.fillStyle = '#e3301c'; x.fillRect(-W, 125, W * 2, 24);
  x.fillStyle = '#1b1712'; x.font = F(196); x.fillText(score.toLocaleString('it-IT'), 0, 62);
  x.font = '800 30px monospace'; x.fillText('PUNTI EDT', 0, 106);
  x.restore();
  const md = P.MODES[mode];
  x.font = F(42); x.fillStyle = res.isRecord ? '#ffcf16' : '#fff3de';
  x.fillText((md.id === 3 ? 'SFIDA DEL GIORNO ' + P.todayLabel() : md.name.toUpperCase()) + (res.isRecord ? ' · NUOVO RECORD!' : ''), W / 2, 1060);
  x.font = 'bold 32px Arial'; x.fillStyle = '#d9cdb8';
  x.fillText(`${run.caps} birre · ${run.jumps} salti · ${run.perfect} perfetti · combo ×${run.maxMult}`, W / 2, 1112);
  x.fillStyle = '#ffcf16'; x.font = F(80);
  x.fillText(win ? 'CHI MI BATTE?' : 'DOPO MIGLIORA…', W / 2, 1232);
  x.fillStyle = '#9f9686'; x.font = 'bold 28px Arial'; x.fillText('Giro Easy · Enduro Drinking Team · Sterrare humanum est', W / 2, 1296);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

async function shareScore(win, res) {
  const md = P.MODES[mode];
  const text = `${profile.rider} ha fatto ${score.toLocaleString('it-IT')} punti a Giro Easy EDT (${md.id === 3 ? 'Sfida del ' + P.todayLabel() : md.name})${res.isRecord ? ' — NUOVO RECORD' : ''}. Chi mi batte?`;
  if (window.EDT_TEXT_SHARE) { await shareText(text); return; }
  try {
    const blob = await scoreCard(win, res);
    const file = blob && new File([blob], 'giro-easy-edt.png', { type: 'image/png' });
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Giro Easy · EDT', text: text + ' ' + publicGameURL });
      return;
    }
    if (blob) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'giro-easy-edt.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  await shareText(text);
  status('Immagine del punteggio salvata: allegala nel gruppo insieme al messaggio.');
}

// ---------- Avvio ----------
P.ensureMissions();
iconizeEl(document.querySelector('.howpanel'));
// ---------- App installabile (Android, PC, iPhone) e funzionamento offline ----------
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.EDT_PUBLIC_URL) {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  // v39 · quando arriva una versione nuova del gioco, la pagina si ricarica da sola (solo se non stai correndo).
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadSW || reloaded) return;
    const go = () => { if (reloaded) return; if (state === 'ready' || state === 'ended') { reloaded = true; location.reload(); } else setTimeout(go, 2000); };
    go();
  });
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; $('installapp').hidden = true; closeInstallHelp(); });
const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(navigator.userAgent);
// Il pulsante c'è sempre sul sito (non nella versione link Claude, dove installare non è possibile).
$('installapp').hidden = standalone || !!window.EDT_PUBLIC_URL;
$('installapp').innerHTML = icon('pin') + '<span>INSTALLA</span>';
function closeInstallHelp() { $('installhelp')?.remove(); }
function installHelp() {
  closeInstallHelp();
  const steps = isIOS
    ? ['Apri questa pagina con <b>Safari</b>.', 'Tocca il pulsante <b>Condividi</b> (il quadrato con la freccia in su).', 'Scorri e scegli <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.']
    : isAndroid
      ? ['Apri questa pagina con <b>Chrome</b>.', 'Tocca il menu <b>⋮</b> in alto a destra.', 'Scegli <b>Aggiungi a schermata Home</b> → <b>Installa</b> (o <b>Crea scorciatoia</b>) e conferma.', 'Se la notifica resta ferma su <b>«Installazione in corso…»</b>, chiudila e scegli <b>Crea scorciatoia</b>: funziona uguale.']
      : ['Usa <b>Chrome</b> o <b>Edge</b>.', 'Clicca l\'icona <b>Installa</b> a destra nella barra degli indirizzi (un monitor con la freccia), oppure menu <b>⋮</b> → <b>Trasmetti, salva e condividi</b> → <b>Installa pagina come app</b>.', 'Conferma con <b>Installa</b>.'];
  const el = document.createElement('div');
  el.id = 'installhelp'; el.className = 'installhelp';
  el.innerHTML = `<div class="ihcard"><div class="eyebrow"><span class="ebar"></span>GIRO EASY COME UN'APP</div><h3>Installa il gioco</h3><ol>${steps.map(x => '<li>' + x + '</li>').join('')}</ol><p>Dopo lo trovi tra le app e si apre a schermo intero. Non serve installare per giocare: premi <b>ACCENDI LA MOTO</b> e il gioco va da solo a tutto schermo.</p><button class="primary" type="button" id="ihclose"><span>HO CAPITO</span></button></div>`;
  document.body.appendChild(el);
  el.onclick = e => { if (e.target === el) closeInstallHelp(); };
  $('ihclose').onclick = closeInstallHelp;
}
$('installapp').onclick = async () => {
  if (installEvt) {
    try { installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; if (r?.outcome === 'accepted') { $('installapp').hidden = true; return; } }
    catch { installEvt = null; }
  }
  installHelp();
};
syncSound(); $('fullscreen').innerHTML = icon('expand'); $('ovfull').innerHTML = icon('expand'); $('pause').innerHTML = icon('pause');
$('sharelink').innerHTML = icon('share') + '<span>CONDIVIDI NEL GRUPPO</span>';
renderSide();
renderReady();
if (worldError) {
  $('card').innerHTML = '<div class="eyebrow">GRAFICA 3D NON DISPONIBILE</div><h1>APRI NEL<br><em>BROWSER.</em></h1><p>Apri il gioco in Chrome o Safari con la grafica WebGL attiva, poi ricarica la pagina.</p>';
} else {
  requestAnimationFrame(frame);
}
window.addEventListener('resize', () => world?.resize());
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (state === 'playing') pause(); toast('Grafica interrotta: ricarica la pagina.'); });

// Pannello di diagnosi: apri il link con #debug alla fine.
if (/debug/.test(location.hash)) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99;max-width:96vw;background:#000d;color:#7f7;font:11px/1.3 monospace;padding:8px;border:1px solid #7f7;border-radius:6px;pointer-events:none;white-space:pre-wrap';
  document.body.appendChild(box);
  setInterval(() => {
    const d = A.debugInfo(), r = routeAt(course, roadTime * 19.5);
    box.textContent = `AUDIO ${d.state} · suono ${d.enabled ? 'ON' : 'OFF'}\nvoci: ${d.voci}\nextra: ${d.extra}\nstato ${state} · percorso ${course.toFixed(1)} · discesa ${r.down.toFixed(2)} · annunciata ${downAnnounced} · impennata ${wheelie}\n` + d.log.join('\n');
  }, 250);
}

// Aggancio per i test automatici (non usato dal gioco).
window.__edt = { get state() { return state; }, get ice() { return ice; }, get drift() { return drift; }, get driftScore() { return driftScore; }, get driftPend() { return driftPend; }, get driftChain() { return driftChain; }, get bend() { return bendNow; }, get snowT() { return snowT; }, get throttleSlip() { return throttleSlip; }, setAim(v) { aimPx = v; }, get gasLock() { return gasLock; }, setMode(v) { mode = v; }, audio: A, get rivals() { return rivals; }, get weather() { return weather; }, spawnShortcut, takeShortcut, setWeather(k, v) { weatherPlan = [{ kind: k, from: 0, to: 999 }]; weather[k] = v; }, angelo, get elapsed() { return elapsed; }, get course() { return course; }, get vx() { return vx; }, setCourse(v) { roadTime = v / GAME_LENGTH * courseLength(P.MODES[mode].difficulty); course = v; }, get score() { return score; }, get lives() { return lives; },
  get objects() { return objects; }, get jump() { return jump; }, get px() { return px; }, get run() { return run; }, get lane() { return lane; },
  get wave() { return wave; }, get combo() { return combo; }, get charge() { return charge; }, setElapsed(v) { elapsed = v; }, hop, move, start, pause, finish, boost, update, go, setGas(v) { gas = v; }, startWheelie, stopWheelieInput, get wheelieOn() { return wheelie; }, get ears() { return earsOn(); }, get errors() { return errors; }, setGrappa(v) { grappa = v; }, forceTurbo() { charge = 100; boost(); }, mud, erika, frames(n, fn, every = 1) { for (let i = 0; i < n; i++) { fn?.(i); update(1 / 60); mudFx.update(1 / 60); if (i % every === every - 1) world.render({ ...drawState(), dt: every / 60 }); } } };
