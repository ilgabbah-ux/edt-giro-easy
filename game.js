// EDT Giro Easy · v18 — logica di gioco, interfaccia e condivisione
import { iceBend, ranchBend, trackShape, JUMP_DURATION, JUMP_HEIGHT, SUPER_JUMP, OBSTACLE_HEIGHT, GAME_LENGTH, SECTIONS, clearsObstacle, isPerfectJump, jumpHeight, routeAt, paceFor, makeRng, setLayout, randomLayout, layoutSegments, SECTION_NAMES } from './physics.js?v=107.9';
import { createWorld } from './scene3d.js?v=107.9';
import * as A from './audio.js?v=107.9';
import * as P from './progress.js?v=107.9';
import { createMud } from './mudfx.js?v=107.9';
import { TRACK_INFO, DAILY_RULES } from './percorsi.js?v=107.9';   // v89 · schede dei percorsi e regole del giorno in un file a parte
import { icon, iconize, iconizeEl } from './icons.js?v=107.9';
import * as C from './classifica.js?v=107.9';
import * as D from './duel.js?v=107.9';

const $ = id => document.getElementById(id);
const canvas = $('canvas');
let world = null, worldError = null;
// v89 · foto dei piloti caricate dopo il menu: il gioco si apre prima, poi le iniziali diventano foto
let FOTO = {};
import('./piloti.js?v=107.9').then(m => {
  FOTO = m.FOTO; world?.setGustaFace?.(FOTO.gusta);
  document.querySelectorAll('.avatar.initials[aria-label]').forEach(el => { const n = el.getAttribute('aria-label'), u = photoURL(n); if (u) { el.classList.remove('initials'); el.innerHTML = `<img src="${u}" alt="Foto di ${n}">`; } });
}).catch(() => {});
try { world = createWorld(canvas); window.__world = world; } catch (e) { worldError = e; console.error('3D non disponibile', e); }
// v52 · moto in anteprima nel garage (gira da sola, si può trascinare per girarla)
let preview = null;
try { preview = world?.makePreview?.(document.getElementById('bikepreview')); } catch (e) { console.warn('anteprima moto non disponibile', e); }
{ const pv = document.getElementById('bikepreview'); let px0 = null;
  if (pv) { pv.addEventListener('pointerdown', e => { px0 = e.clientX; try { pv.setPointerCapture(e.pointerId); } catch {} });
    pv.addEventListener('pointermove', e => { if (px0 === null) return; preview?.spin((e.clientX - px0) * .012); px0 = e.clientX; });
    for (const ev of ['pointerup', 'pointercancel']) pv.addEventListener(ev, () => px0 = null); } }

// ---------- Piloti (abbinamenti foto conservati dalla v14) ----------
const RIDERS = ['Il Gabbah', 'Angelo', 'Miti', 'Claudio', 'Max', 'Purcello', 'Ciprian', 'Costa', 'Linus', 'Mirco', 'Luigi', 'Renard', 'Paletta', 'Andrea', 'Brizio', 'Sergio', 'Albo', 'Alex', 'Albertone', 'Erika', 'Maggie', 'Guccio', 'Gusta', 'Daniel', 'Siro'];
const PHOTOS = { 'Il Gabbah': 'gabbah', 'Angelo': 'angelo', 'Linus': 'linus', 'Costa': 'costa', 'Purcello': 'purcello', 'Renard': 'renard', 'Miti': 'miti', 'Mirco': 'mirco', 'Max': 'max', 'Paletta': 'paletta',
  'Claudio': 'claudio', 'Ciprian': 'ciprian', 'Luigi': 'luigi', 'Andrea': 'andrea', 'Brizio': 'brizio', 'Sergio': 'sergio', 'Albo': 'albo', 'Alex': 'alex', 'Erika': 'erika-face', 'Albertone': 'albertone', 'Maggie': 'maggie', 'Guccio': 'guccio', 'Gusta': 'gusta', 'Daniel': 'daniel', 'Siro': 'siro' };
// Piloti con la loro voce (battute registrate su ElevenLabs): partenza, botta, arrivo.
const RIDER_VOICE = { 'Il Gabbah': 'gabbah', 'Angelo': 'angelo', 'Miti': 'miti', 'Costa': 'costa', 'Linus': 'linus', 'Purcello': 'purcello', 'Mirco': 'mirco', 'Renard': 'renard', 'Gusta': 'gusta', 'Alex': 'alex', 'Erika': 'erika', 'Maggie': 'maggie' };   // v107.3 · voci clonate di Alex ed Erika (+ Giacu che la rimette in sella)
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
  'Maggie': { id: 'sprint', icon: '⚡', name: 'Sprint finale', desc: 'Nell’ultimo quarto di giro va il 10% più forte e fa punti doppi.' },
  'Guccio': { id: 'blessed', icon: '⛪', name: 'Benedetto da San Braulio', desc: 'La grappa dura il 50% in più e gli ricarica metà turbo.' },
  'Gusta': { id: 'mulcher', icon: '🚜', name: 'Trinciatutto', desc: 'Alberi, tronchi e ceppi non gli costano la moto: li trincia e fa punti. Al Gusta Ranch la sua trincia lo lascia passare.' },
  'Daniel': { id: 'slip', icon: '⚡', name: 'Re della scia', desc: 'Prende la scia anche da lontano e più larga, in scia va più forte e il sorpasso in scia vale +600.' },
  'Siro': { id: 'nimble', icon: '🛞', name: 'Sgusciante', desc: 'Sterza il 25% più rapido ovunque: cambia corsia in un lampo e passa nei buchi.' },
  'Albo': { id: 'dry', icon: '🚱', name: 'Acqua? Mai', desc: 'Immune alla bottiglia d’acqua: la spacca e fa punti.' },
};
let skill = '';
const has = id => skill === id;
const photoURL = name => PHOTOS[name] ? (FOTO[PHOTOS[name]] || null) : null;
// v107.1 · schede piloti "ufficiali": ritratto da studio, numero di gara, fascia col nome, abilità con icona a linea
const SKILL_IC = { steady: 'compass', stones: 'rock', drifter: 'snow', sommelier: 'wine', turbo: 'bolt', nose: 'magnet', climb: 'mountain', amphibious: 'wave', scrub: 'scrub', lion: 'helmetplus', downhill: 'downhill', veteran: 'stopwatch', spring: 'spring', precise: 'target', wheelie: 'wheelie', schettino: 'anchor', rocket: 'rocket', tank: 'shield', angel: 'heart', sprint: 'flag', blessed: 'chapel', mulcher: 'tractor', dry: 'nowater', slip: 'chevrons', nimble: 'tyre' };
function riderCardHTML(name, i) {
  const k = PHOTOS[name], sk = SKILLS[name] || {}, nm = name.replace('Il ', '');
  const pic = k ? `<img class="rc-photo" src="img/piloti/${k}.webp" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=window.__edtFoto('${k}')">` : `<span class="rc-photo rc-initials">${nm.slice(0, 2).toUpperCase()}</span>`;
  return `${pic}<span class="rc-num">${String(i + 1).padStart(2, '0')}</span><span class="rc-tag">IN SELLA</span>
    <span class="rc-bar"><b class="rc-name">${name.startsWith('Il ') ? '<small>IL</small>' : ''}${nm}</b><span class="rc-skill" title="${sk.desc || ''}">${icon(SKILL_IC[sk.id] || 'star')}<span>${sk.name || ''}</span></span></span>`;
}
window.__edtFoto = k => FOTO[k] || '';
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
// v106.5 · link "batti il mio fantasma": ?fantasma=Nome&p=percorso
let ghostWant = null;
{ const q = new URLSearchParams(location.search), n = (q.get('fantasma') || '').slice(0, 24), m = +q.get('p');
  if (n && P.MODES[m] && !P.MODES[m].hidden) { ghostWant = { n, m }; mode = m; setTimeout(() => { if (state === 'ready') toast('👻 ' + n.toUpperCase() + ' TI SFIDA SU ' + P.MODES[m].name.toUpperCase() + ': PREMI VIA E BATTI IL SUO FANTASMA', 'gold'); }, 2500); } }
// ---------- Tracciato del percorso scelto ----------
let runSeed = 1;
function layoutFor(m, fresh = false) {
  const md = P.MODES[m];
  if (md.random === 'daily') return randomLayout(makeRng(P.todayKey() * 7 + 13));
  if (md.random === 'run') { if (fresh) runSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0; return randomLayout(makeRng(runSeed)); }
  return variantLayout(md.layout, variantOf(m));
}
// v97 · VARIANTE DELLA SETTIMANA: ogni lunedì i percorsi fissi cambiano ordine dei tratti e curve (uguale per tutti)
const VARIANT_NAMES = ['A', 'B', 'C'];
function variantOf(m) { const md = P.MODES[m]; if (!md?.layout || md.ice || md.leap || md.random) return 0; return ((P.weekKey() % 9973) + m * 31) % 3; }
function variantLayout(layout, v) {
  if (!v || !layout || layout.length < 3) return layout;
  const first = layout[0], rest = layout.slice(1);
  if (v === 1) return [first, ...rest.slice().reverse()];
  const k = Math.ceil(rest.length / 2), rot = rest.slice(k).concat(rest.slice(0, k));
  return [first, ...rot.map(x => (x.t === 0 || x.t === 1) && !x.climb ? { ...x, down: x.down ? 0 : 1 } : x)];
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
const ghostKey = () => P.MODES[mode].leap ? null : P.MODES[mode].random === 'daily' ? 'd' + P.todayKey() : P.MODES[mode].random ? null : String(mode) + (variantOf(mode) ? 'v' + variantOf(mode) : '');
let state = 'ready';
let lane = 1, px = 1, jump = 0, jumpBuffer = 0, elapsed = 0, score = 0, lives = 3, objects = [], spawn = 0, invincible = 0, last = 0, roadTime = 0;
let toastTime = 0, gas = false, wet = 0, routePhase = -1, countdown = 0, countStep = 0;
let combo = 0, comboTime = 0, charge = 0, turbo = 0, magnet = 0, wave = 0, prevSafe = 1, lastBigLog = -9, fxSerial = 0, fxKind = 'coin';
let speedSm = .4, lean = 0, bodyLean = 0, suspension = 0, springVelocity = 0, wheelPhase = 0, whip = 0, scrubbed = 0, shake = 0, speedNow = 1;
let timeOfDay = '', heroDir = '', slideT = 0, speedFx = null;
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
let slalomN = 0, lastFord = -9, lastAnimal = -9, turboReadyT = 0;
// v84 · Dopo migliora: la salita si fa dosando il gas (trazione); se ti pianti si spinge la moto
let grip = .5, stallT = 0, stalled = false, pushP = 0, spinMsgAt = -9, tractOn = false;
let desert = false, sandT = 0, sandStuck = false, flat = false, fixP = 0;   // v106.7 · Desertone: sabbia sulle dune e gomma bucata
let wasTract = false, lastWaveFlash = -9, barT = 0, barsLeft = 0, nextBar = 0;   // v84 · sosta al bar (Giro easy)
// v84 · Sfida del giorno: una regola diversa ogni giorno, uguale per tutti
const dailyRule = () => DAILY_RULES[(window.__edtDay ?? P.todayKey()) % DAILY_RULES.length];
const rule = id => mode === 3 && dailyRule().id === id;
const feat = k => !!P.MODES[mode][k] || rule(k);
// v58 · ogni percorso ha la sua immagine (img/track-N.webp); alcune sono illustrazioni dedicate
const TRACK_ART_FILE = { 2: 'angelo-potter', 9: 'ice-scrofy', 13: 'anti-gev', 14: 'gusta-ranch' };
const psOf = m => Math.max(1, P.SHOWN().indexOf(m) + 1);   // v59 · numero di prova speciale contando solo i percorsi in menu
const trackArtOf = m => 'img/' + (TRACK_ART_FILE[m.id] || 'track-' + m.id) + '.webp?t=1';
// v57 · Anti-GEV: jeep delle Guardie Ecologiche Volontarie a bordo pista (z in metri davanti alla moto, negativo = davanti)
// v59 · salto di Angelo
let leapMul = 1, leapZRate = .5, leapFree = 1, canyonX0 = null, canyonLen = 400, canyonLand = 0, leapTurbo = false, leapV = 10;
let leap = false, leapState = 0, leapPow = 0, leapPitch = 0, leapW = 0, leapStartT = 0, leapStartKmh = 0, leapDist = 0, leapBest = 0, lastHopAt = -9, leapEndT = 0, leapPerfect = false;
let gev = false, gevZ = 8, gevThrow = 4, gevArm = 0, gevLost = 0, gevGone = false, gevShout = 0, gevSide = 1, gevFine = 0;
const GEV_SHOUTS = ['📢 FERMO! GUARDIE ECOLOGICHE!', '📢 ACCOSTI LA MOTO!', '📢 DOCUMENTI E LIBRETTO!', '📢 QUI NON SI PUÒ PASSARE!', '📢 HA VISTO IL CARTELLO?', '📢 SCENDA DALLA MOTO!'];
const GEV_SOFT = new Set(['pigpen', 'hayCart', 'forkShort', 'forkSafe', 'gevmark', 'bar', 'coin', 'helmet', 'wine', 'grappa', 'water', 'sgap', 'shortcut', 'gate', 'ramp', 'ford']);
// v48 · fantasma del primo nella classifica del gruppo
let gGhost = null, gGhostPassed = false;
// v50 · guida libera: la moto va dove la porti (niente più corsie fisse).
// steer = -1..1 (frecce, pulsanti, dito tenuto a lato, joypad) · aimPx = punto dove andare (mouse, dito trascinato).
let keyAt = { l: 0, r: 0 }, btnAt = { l: 0, r: 0 };
const TAP_MS = 190;   // tocco breve = una corsia intera (come prima); tenuto = sterzo libero
let keyL = false, keyR = false, btnL = false, btnR = false, zoneSteer = 0, padSteer = 0, aimPx = null, lastSteerDir = 0, edgeT = 0, lastEdgeMsg = -9;
const steerNow = () => Math.max(-1, Math.min(1, (keyR ? 1 : 0) - (keyL ? 1 : 0) + (btnR ? 1 : 0) - (btnL ? 1 : 0) + zoneSteer + padSteer + tiltSteer));
// v62 · sterzo inclinando il telefono (giroscopio): si attiva dal menu; lo "zero" è la posizione del telefono al via.
// v106.2 · vibrazione del telefono mentre giochi (Android: l'iPhone non la permette alle pagine web). Si spegne dal menu.
let hapticOn = true, lastBuzz = 0, rumbleT = 0;
try { hapticOn = localStorage.getItem('edt-vibra') !== '0'; } catch {}
function buzz(p) {
  if (!hapticOn || !navigator.vibrate) return false;
  const now = performance.now();
  // impulsi troppo corti molti telefoni li ignorano: minimo 22 ms e un filo più forti
  const pat = (Array.isArray(p) ? p : [p]).map((v, i) => i % 2 ? v : Math.max(22, Math.round(v * 1.4)));
  if (pat.length === 1 && pat[0] < 60 && now - lastBuzz < 70) return false;
  lastBuzz = now; try { return navigator.vibrate(pat); } catch { return false; }
}
let tiltOn = false, tiltSteer = 0, tiltZero = null, tiltRaw = 0;
try { const st = localStorage.getItem('edt-tilt'); tiltOn = st === '1' || (st === null && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)); } catch {}   // v101.1 · sul telefono si sterza inclinando di serie (chi l'ha spento resta senza)
function tiltAngle(e) {
  const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  if (a === 90) return e.beta;          // orizzontale, tasto home a destra
  if (a === -90 || a === 270) return -e.beta;
  return e.gamma;                       // verticale
}
let tiltSeen = 0, tiltOriSeen = 0;
function tiltApply(raw) {
  tiltRaw = raw;
  if (tiltZero === null) tiltZero = tiltRaw;
  const d = tiltRaw - tiltZero, dead = 3, full = 16;   // 3° di zona morta, sterzata piena a 16°
  // v106.2 · curva più dolce al centro (correzioni fini precise) e filtro sul tremolio del sensore
  const lin = Math.abs(d) < dead ? 0 : Math.max(-1, Math.min(1, (d - Math.sign(d) * dead) / (full - dead)));
  const tgt = Math.sign(lin) * Math.pow(Math.abs(lin), 1.35);
  tiltSteer = Math.abs(tgt) < .02 ? 0 : tiltSteer + (tgt - tiltSteer) * .45;
}
// v102.2 · sterzo "a volante" in qualunque posizione: si misura la rotazione del telefono attorno all'asse dello schermo
// rispetto a come lo tenevi al VIA (quaternioni, niente angoli di Eulero). Così funziona anche sdraiati a letto
// o col telefono sopra la faccia, dove gamma/beta non cambiano e alpha sì.
const D2R = Math.PI / 180;
function oriQuat(a, b, g) {   // W3C: Z(alpha) · X'(beta) · Y''(gamma)
  const ca = Math.cos(a * D2R / 2), sa = Math.sin(a * D2R / 2), cb = Math.cos(b * D2R / 2), sb = Math.sin(b * D2R / 2), cg = Math.cos(g * D2R / 2), sg = Math.sin(g * D2R / 2);
  return [ca * cb * cg - sa * sb * sg, ca * sb * cg - sa * cb * sg, ca * cb * sg + sa * sb * cg, ca * sb * sg + sa * cb * cg];   // w, x, y, z
}
let tiltQ0 = null;
function twistDeg(q) {   // rotazione attorno all'asse z del telefono rispetto al riferimento tiltQ0
  const [w0, x0, y0, z0] = tiltQ0, [w, x, y, z] = q;
  const rw = w0 * w + x0 * x + y0 * y + z0 * z, rz = w0 * z - z0 * w - x0 * y + y0 * x;   // conj(q0) · q
  let d = 2 * Math.atan2(rz, rw) / D2R; if (d > 180) d -= 360; if (d < -180) d += 360; return d;
}
window.addEventListener('deviceorientation', e => {
  if (e.gamma === null || e.gamma === undefined) return;
  tiltSeen = tiltOriSeen = performance.now();
  const q = oriQuat(e.alpha || 0, e.beta || 0, e.gamma || 0);
  if (tiltZero === null || !tiltQ0) tiltQ0 = q;
  const raw = -twistDeg(q);   // a destra = come girare un volante verso destra
  if (!tiltOn) { tiltSteer = 0; tiltRaw = raw; return; }
  tiltApply(raw);
});
// v65 · riserva: alcuni telefoni non mandano l'orientamento ma solo l'accelerometro (gravità)
window.addEventListener('devicemotion', e => {
  const g = e.accelerationIncludingGravity; if (!g || g.x === null || g.x === undefined) return;
  tiltSeen = performance.now();
  if (!tiltOn) { tiltSteer = 0; return; }
  if (performance.now() - tiltOriSeen < 600) return;   // l'orientamento c'è: uso quello
  const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  const ax = a === 90 ? g.y : (a === -90 || a === 270) ? -g.y : -g.x;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? -1 : 1;   // v106.5 · anche iPad (si presenta come Mac)
  tiltApply(Math.asin(Math.max(-1, Math.min(1, ios * ax / 9.81))) * 180 / Math.PI);
});
// v65 · iPhone: dopo un ricaricamento il permesso ai sensori va richiesto di nuovo con un tocco
// v106.5 · su iPhone il permesso vale solo da un tocco "completo" (touchend/click), non da pointerdown
const askTilt = () => {
  if (tiltOn && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function' && performance.now() - tiltSeen > 1000)
    DeviceOrientationEvent.requestPermission().catch(() => {});
};
for (const ev of ['touchend', 'click']) document.addEventListener(ev, askTilt, { passive: true });
setInterval(() => {   // v66 · il pulsante del menu mostra se il telefono manda l'inclinazione
  const b = document.getElementById('tiltmenu'); if (!b || !b.offsetParent) return;
  const live = performance.now() - tiltSeen < 1200;
  b.textContent = '📱 STERZO INCLINANDO: ' + (tiltOn ? 'SÌ' + (live ? ' · ' + Math.round(tiltRaw) + '°' : ' · NESSUN SEGNALE') : 'NO');
}, 300);
async function setTilt(on) {
  if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { toast('📱 PERMESSO AL GIROSCOPIO NEGATO', 'red'); on = false; } } catch { on = false; }
  }
  tiltOn = on; tiltZero = null; tiltSteer = 0;
  if (on) setTimeout(() => {   // v65 · se il telefono non manda i sensori lo dico chiaramente
    if (!tiltOn) return;
    if (performance.now() - tiltSeen > 1500) toast(window.top !== window ? '📱 QUI I SENSORI SONO BLOCCATI: APRI IL GIOCO DAL SITO ilgabbah-ux.github.io/edt-giro-easy' : '📱 IL TELEFONO NON MANDA I DATI DI INCLINAZIONE (CONTROLLA I PERMESSI DEI SENSORI DI MOVIMENTO)', 'red');
    else toast('📱 INCLINAZIONE OK: ' + Math.round(tiltRaw) + '°', 'gold');
  }, 1600);
  try { localStorage.setItem('edt-tilt', on ? '1' : '0'); } catch {}
  return on;
}
let wasClimb = false, throttleSlip = 0, overT = 0, wasSweet = false, gasLock = false, gasDownAt = 0, noClimbT = 0;
let ice = false, drift = 0, driftT = 0, driftSum = 0, driftPend = 0, driftChain = 0, driftGap = 9, driftScore = 0, driftBest = 0, driftCount = 0, snowT = 0, bendNow = 0, lastWall = -9, driftM = 0, driftMP = 0;   // v92 · metri percorsi di traverso
// v41 · avversari EDT in pista, scorciatoie di Angelo e meteo che cambia
let draftT = 0, draftR = null, draftSaid = -9, lastDraftAt = -9, catchT = 0;   // v107 · scia dietro ai compagni e rimonta
let rivals = [], lastSuka = -99, shortcutsDone = 0, nextShortcut = 0, shownPos = '';
let weather = { rain: 0, fog: 0, dusk: 0, night: 0, flash: 0 }, nextFlash = 5, weatherPlan = [], weatherSaid = '', lastRainMud = 0;
const curLift = () => jumpHeight(jump, jumpDur, jumpH);
// Potenziamenti dell'officina (letti a inizio giro) e premi del rifugio.
let up = { engine: 0, susp: 0, tank: 0, tyres: 0, helmet: 0, nose: 0, balance: 0, grit: 0, clutch: 0, ecu: 0, damper: 0, skid: 0, wings: 0, camel: 0, eyes: 0 }, skidLeft = 0, maxLives = 3, startBoosts = [];
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
// v89 · un avviso alla volta: coda con priorità (rosso > oro > resto), i vecchi scadono
const toastQ = []; let toastBusy = false;
function toast(t, kind = '') {
  const now = performance.now();
  if (t === lastToast && now - lastToastAt < 1500) return;
  if (toastQ.some(q => q.t === t)) return;
  lastToast = t; lastToastAt = now;
  toastQ.push({ t, kind, at: now, pri: kind === 'red' ? 3 : kind === 'gold' ? 2 : 1 });
  toastQ.sort((a, b) => b.pri - a.pri || a.at - b.at);
  if (toastQ.length > 3) toastQ.length = 3;
  pumpToast();
}
function pumpToast() {
  if (toastBusy) return;
  const now = performance.now();
  while (toastQ.length && now - toastQ[0].at > 4500) toastQ.shift();
  if (!toastQ.length) return;
  const { t, kind } = toastQ.shift();
  const feed = $('feed');
  feed.replaceChildren();
  const el = document.createElement('div');
  el.className = 'msg ' + kind;
  el.innerHTML = iconize(t);
  feed.appendChild(el);
  toastBusy = true; toastTime = 2.2;
  const hold = toastQ.length ? 1500 : 2100;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); toastBusy = false; pumpToast(); }, 300); }, hold);
}
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
  $('boostlabel').textContent = turbo > 0 ? (ice ? 'TRAVERSO ×2' : 'GAAAS! ×2') : ice && charge >= 100 ? 'TURBO TRAVERSO' : charge >= 100 ? 'TURBO PRONTO' : 'TURBO ' + Math.floor(charge) + '%';
  $('jump').classList.toggle('airborne', jump > 0);
  $('game').classList.toggle('boosting', state === 'playing' && (turbo > 0 || (has('sprint') && course > GAME_LENGTH * .75)));   // v96 · anche lo sprint finale di Maggie
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
  if (!gGhost || !(state === 'playing' || state === 'paused' || state === 'countdown')) { $('gghost').hidden = true; $('ghostchip').hidden = true; }
  if (gcHud !== null) { $('ghostmarker').style.left = (gcHud / GAME_LENGTH * 100) + '%'; $('ghostmarker').title = 'Record di ' + ghosts[ghostKey()].rider + ': ' + ghosts[ghostKey()].time.toFixed(1) + 's'; }
  $('trackbar').classList.toggle('behind', state === 'playing' && elapsed / timeLimit > course / GAME_LENGTH);
  $('kmh').textContent = Math.round(kmh * 1.45);   // v89 · scala del tachimetro più realistica (solo visualizzazione)
  const route = routeAt(course, roadTime * 19.5);
  document.querySelectorAll('#trackbar .seg').forEach((el, i) => el.classList.toggle('active', i === route.seg && state !== 'ready'));
  $('tracklabel').textContent = route.name + (wet > 0 ? ' · IMPANTANATO' : route.grade > .05 ? ' · SALITA ' + Math.round(route.grade * 100) + '%' : route.grade < -.05 ? ' · DISCESA ' + Math.round(-route.grade * 100) + '%' : '');
  const needGas = state === 'playing' && (ice || route.climb > .05 || route.rough > .05);
  $('gas').hidden = !needGas;
  $('gas').classList.toggle('held', gas);
  $('gas').setAttribute('aria-pressed', String(gas));
  $('gas').textContent = stalled || (desert && sandStuck) ? 'SPINGI! TOCCA TOCCA' : desert && flat ? 'FORATO' : desert && (routeAt(course, roadTime * 19.5).climb > .3) && !gas ? 'GAS O TI INSABBI' : ice ? (overT > .1 ? 'TROPPO! MOLLA' : gas ? 'TRAVERSO!' : 'GAS = DERAPA') : gasLock ? '🔒 GAS BLOCCATO' : gas ? 'GAS APERTO!' : 'TIENI GAS';
  $('gas').classList.toggle('locked', gasLock);
  { const warn = tractOn && state === 'playing' && !stalled && (grip > .94 || grip < .2); $('gas').classList.toggle('warn', warn); if (tractOn && state === 'playing' && !stalled) $('gas').textContent = grip > .94 ? 'PATTINA: MOLLA!' : grip < .2 ? 'DAI GAS!' : gas ? 'COSÌ! DOSA' : 'GAS'; }
  { const tb = $('tractbox'); if (tb) { tb.hidden = !(tractOn && state === 'playing'); if (!tb.hidden) { tb.style.setProperty('--g', grip.toFixed(3)); tb.className = 'tractbox ' + (stalled ? 'stall' : grip > .94 ? 'spin' : grip < .12 ? 'low' : grip >= .28 && grip <= .84 ? 'ok' : ''); tb.querySelector('b').textContent = stalled ? 'SPINGI!' : grip > .94 ? 'PATTINA' : grip < .12 ? 'SI PIANTA' : grip >= .28 && grip <= .84 ? 'TRAZIONE' : 'GAS'; } } }
  if (leap && live) {   // v59 · riquadro del salto: assetto della moto e metri
    $('driftbox').hidden = false;
    $('driftlabel').textContent = leapState === 2 ? 'IN VOLO · MUSO SU!' : leapState >= 3 ? 'SALTO' : 'VELOCITÀ DI RINCORSA';
    $('driftpts').textContent = leapState >= 2 ? (leapState === 2 ? leapDist : leapBest).toFixed(1).replace('.', ',') + ' m' : Math.round(kmh * 1.45) + ' km/h';
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
    $('driftchain').textContent = '×' + driftMult().toFixed(2).replace(/0$/, '').replace('.', ',') + ' · ' + Math.round(driftM + driftMP) + ' m';
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
  const earned = Math.round(points * m * (turbo > 0 ? 2 : 1) * (1 + (bs.points || 0)) * (rule('jumps') && (kind === 'jump' || kind === 'perfect' || kind === 'trick') ? 2 : 1));
  score += earned;
  if ((kind === 'perfect' || ((kind === 'jump' || kind === 'trick' || kind === 'smash') && earned >= 150)) && !/COMBO|BIRR|BRAVO/.test(label)) markHighlight(label, earned * (kind === 'perfect' ? 1.6 : 1));   // v107.2 · solo i momenti da far vedere (niente combo e birre)
  if (turbo <= 0) charge = Math.min(100, charge + ({ jump: 20, perfect: 26, trick: 10, near: 8, smash: 0 }[kind] ?? 6) * (1 + up.tank * .1) * (has('turbo') ? 1.4 : 1) * (1 + (bs.turbo || 0)));
  fxKind = kind; fxSerial++;
  pop(label + ' +' + earned, kind === 'jump' || kind === 'perfect' ? 'white' : kind === 'trick' ? 'blue' : kind === 'near' ? 'small' : 'gold');
  if (kind === 'perfect') cheer('SÌÌÌ, COSÌ SI FA!', false, true);
  else if (chain && combo > 0 && combo % 9 === 0) { cheer('NON MOLLARE!', true); flash('gold'); }
  if (chain && combo === 9) toast('COMBO ×4 — MANICO VERO!', 'gold');
}

function boost() {
  if (state !== 'playing' || charge < 100 || turbo > 0 || rule('noturbo')) return;
  charge = 0; turbo = turboMax(); run.turbos++;
  if (ice) { toast('❄ TURBO TRAVERSO: DERAPATE ×2 E NIENTE TESTACODA', 'gold'); bigCall('TURBO TRAVERSO!'); } else { toast('DAI GAS CICCIO!'); voice('Dai gas Ciccio!'); }
  A.sfx.turbo(); buzz([40, 40, 70]); flash('gold'); shake = .5;
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
  replayBuf = []; recClock = 0; recLast = 0; replay = null; highlights = []; hlPend = [];
  ghostSplits = [0]; ghostPassed = false; ghostNextSplit = .5; course = vx = crash = stun = slowmo = kmh = 0; slowScale = 1; warned = false; timeLimit = P.MODES[mode].limit; skill = SKILLS[profile.rider]?.id || ''; if (has('veteran')) timeLimit += 4;
  grappa = waterT = earsT = errors = wheelieT = wheelieCD = segErrors = 0; earsPermanent = wheelie = wheelieHeld = downAnnounced = false; lastYee = -10; lastSpecial = -9; lastRiderHit = -99;
  jumpDur = JUMP_DURATION; jumpH = JUMP_HEIGHT;
  for (const k of Object.keys(up)) { const l = P.upgradeLevel(k); up[k] = l <= P.LEGEND_FROM ? l : P.LEGEND_FROM + (l - P.LEGEND_FROM) * .4; }   // v106.6 · livelli Leggenda: +0,4 l'uno
  skidLeft = up.skid >= 5 ? 2 : up.skid > 0 ? 1 : 0;   // v96 · paramotore
  maxLives = 3 + (up.helmet >= 2 ? 1 : 0) + (up.helmet >= 4 ? 1 : 0) + (has('lion') ? 1 : 0);
  const b = P.takeBoosts(); startBoosts = [];
  if (b.helmet) { maxLives++; startBoosts.push('CASCO DI SCORTA'); }
  lives = maxLives;
  if (b.turbo) { charge = 100; startBoosts.push('TURBO CARICO'); }
  if (has('rocket')) charge = 100;
  if (b.grappa) { grappa = 6; startBoosts.push('GRAPPA DEL RIFUGISTA'); }
  if (b.wine) { magnet = 7 + up.nose; startBoosts.push('BOTTIGLIA DI ROSSO'); }
  toastQ.length = 0; run = newRun(); announced = new Set(); shownScore = -1; shownLives = -1; mudFx.clear();
  rng = duel?.racing ? makeRng(duel.seed) : mode === 3 ? makeRng(P.todayKey()) : makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  applyLayout(true);
  bs = P.currentStats();
  ice = !!P.MODES[mode].ice; desert = !!P.MODES[mode].desert; sandT = 0; sandStuck = flat = false; fixP = 0;
  slalomN = 0; draftT = catchT = 0; draftR = null; draftSaid = lastDraftAt = -9; lastFord = lastAnimal = lastTractor = -9; grip = .5; stallT = 0; stalled = false; pushP = 0; tractOn = false; wasTract = false; lastWaveFlash = -9; barT = 0; barsLeft = P.MODES[mode].vigne ? 1 : rule('bar') ? 2 : 0; nextBar = 15 + rng() * 8; setupGroupGhost();
  if (P.MODES[mode].ranch) objects.push({ l: -2.6, z: .78, type: 'farm', hit: false });   // v59 · la cascina del Gusta Ranch alla partenza
  leap = !!P.MODES[mode].leap; canyonX0 = null; canyonLand = 0; leapTurbo = false; leapMul = 1; leapZRate = .5; leapFree = 1; leapState = 0; leapPitch = leapW = leapDist = leapBest = 0; lastHopAt = -9; leapEndT = 0; leapPerfect = false;
  gev = !!P.MODES[mode].gev; gevZ = 9; gevThrow = 4.5; gevArm = gevLost = 0; gevGone = false; gevShout = 0; gevSide = 1; gevFine = 0;
  keyL = keyR = btnL = btnR = false; zoneSteer = padSteer = 0; aimPx = null; lastSteerDir = 0; edgeT = 0;
  throttleSlip = overT = noClimbT = 0; wasSweet = gasLock = wasClimb = false;
  drift = driftT = driftSum = driftPend = driftChain = driftScore = driftBest = driftCount = snowT = bendNow = driftM = driftMP = 0; corner = { t: 0, in: 0, s: 0, out: 0 }; cornerLine = 0; speedSm = .4; driftGap = 9; lastWall = -9;
  setupRace();
  if (rule('rush')) timeLimit -= 4;
  if (duel?.racing) { rivals = [duel.entry]; gGhost = null; duel.opp.c = 0; duel.opp.end = null; duel.me = null; duel.ahead = false; Object.assign(duel.entry, { gap: 0, lx: 1, lift: 0 }); }
}
function start() {
  world?.preloadObstacles?.();   // v107.2 · al primo giro arrivano i modelli degli ostacoli
  if (!world) return;
  if (touchDevice) goFull();
  if (!fsOK && isIOS && !standalone && !iosHinted) { iosHinted = true; setTimeout(() => toast('SCHERMO INTERO: CONDIVIDI → AGGIUNGI A HOME'), 4200); }
  A.unlock(); A.stopVoice(); A.preloadExtras(); if (riderVoice()) A.preloadRider(riderVoice());
  A.preloadRivals(Object.values(RIDER_VOICE)); A.preloadSong(mode);
  resetRun();
  state = 'countdown'; countdown = 3.2; countStep = 4; holePre = holeDone = false;
  setTimeout(() => { if (state === 'countdown') toast('🚀 TOCCA SALTA AL VIA = PARTENZA A RAZZO', 'gold'); }, 600);
  // v89 · primo giro su un percorso: il consiglio della sua meccanica sta nella cartolina del via (sparisce al VIA, non copre la gara)
  let firstTip = '';
  { const seen = P.profile.seenTracks || (P.profile.seenTracks = {}); if (!seen[mode] && TRACK_INFO[mode]?.consiglio) { seen[mode] = 1; P.save(); firstTip = TRACK_INFO[mode].consiglio; countdown += 2.5; } }   // 2,5 s in più prima del 3-2-1 per leggerlo
  { const md = P.MODES[mode], ti = $('trackintro');   // v58 · cartolina del percorso durante il via
    ti.innerHTML = `<img src="${trackArtOf(md)}" alt=""><div><span>PS${psOf(md)} · ${md.limit} s</span><b>${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name}</b>${variantOf(md.id) ? `<em class="tivar">🔄 VARIANTE ${VARIANT_NAMES[variantOf(md.id)]} DELLA SETTIMANA</em>` : ''}${timeOfDay ? `<em class="tivar">${timeOfDay}</em>` : ''}${md.id === P.weeklyTrack() ? '<em class="tivar">🔥 PERCORSO DELLA SETTIMANA: BIRRE ×2</em>' : ''}${runPlan?.flash ? `<em class="tiflash">🎯 SFIDA LAMPO: ${runPlan.flash.text} (+${FLASH_BEERS} 🍺)</em>` : ''}<small>${md.id === 3 ? dailyRule().icon + ' REGOLA DI OGGI: ' + dailyRule().name + ' — ' + dailyRule().desc : md.desc}</small>${gGhost ? `<em class="tighost">👻 CORRI CONTRO IL FANTASMA DI ${gGhost.name.toUpperCase()} (${gGhost.challenge ? 'TI HA SFIDATO' : '1° NEL GRUPPO'}${gGhost.time ? ' · ' + C.fmtTime(gGhost.time) : ''})</em>` : ''}${firstTip ? `<em class="titip">💡 PRIMO GIRO QUI: ${firstTip}</em>` : ''}</div>`;
    ti.className = 'trackintro'; void ti.offsetWidth; ti.className = 'trackintro show'; }
  $('overlay').classList.add('hidden');
  setMenu(false);
  $('pops').innerHTML = '';
  $('pause').innerHTML = icon('pause'); $('pause').setAttribute('aria-label', 'Pausa');
  setDisabled(true);
  (A.setEngineProfile(P.currentBike().id), A.engineStart());
  startMusic();
  hud();
}
// v38 · una colonna sonora per percorso; la Sfida del giorno cambia tonalità ogni giorno, Giro a caso ogni giro.
function startMusic() {
  const md = P.MODES[mode];
  const transpose = md.random === 'daily' ? (P.todayKey() % 5) - 2 : md.random === 'run' ? Math.floor(Math.random() * 5) - 2 : 0;
  A.musicStart(duel?.racing ? A.DUEL_STYLE : mode, { transpose });   // v105.4 · nel duello suona "Angelo vs Gabbah"
}
function go() {
  state = 'playing'; tiltZero = null;   // v62 · lo zero del giroscopio è la posizione al VIA
  if (tiltOn) { let seen = '1'; try { seen = localStorage.getItem('edt-tilt-hint'); localStorage.setItem('edt-tilt-hint', '1'); } catch {} if (!seen) setTimeout(() => toast('📱 INCLINA IL TELEFONO PER STERZARE · SI SPEGNE DAL MENU', 'green'), 900); }
  if (holePre) setTimeout(() => { if (state === 'playing' && !holeDone) holeshot(); }, 0);
  $('countdown').className = 'countdown go';
  $('trackintro').className = 'trackintro out';
  $('countdown').textContent = 'VIA!'; buzz(90);
  if (isChamp() && !run.champSaid) { run.champSaid = 1; setTimeout(() => toast('👑 CASCO D’ORO: HAI VINTO LA COPPA DELLA SETTIMANA SCORSA', 'gold'), 1400); }
  setTimeout(() => { if (state !== 'countdown') $('countdown').className = 'countdown'; }, 700);
  toast('VAI CICCIO!'); if (!riderLine('start')) voice('Vai Ciccio!', true);
  if (touchDevice && !tiltOn) { let seen = '1'; try { seen = localStorage.getItem('edt-tilt-tip'); localStorage.setItem('edt-tilt-tip', '1'); } catch {} if (!seen) setTimeout(() => toast('📱 PUOI STERZARE INCLINANDO: ATTIVALO DALLA PAUSA', 'gold'), 3500); }   // v107.6
  if (startBoosts.length) setTimeout(() => toast('🎁 ' + startBoosts.join(' · '), 'green'), 1500);
  if (gev) { setTimeout(() => { if (state === 'playing') { bigCall('ARRIVANO LE GEV!'); A.sfx.whistle(); } }, 900); setTimeout(() => { if (state === 'playing') toast(`HAI ${lives} TENTATIVI: FINITI QUELLI ARRIVA LA MULTA`, 'red'); }, 2600); }
}

// v98 · finestre in primo piano (video, podio, sorpasso): dentro il gioco, che sul telefono e a schermo intero copre il resto della pagina
function topLayer() { return document.fullscreenElement || document.webkitFullscreenElement || $('game') || document.body; }
function finish(win, reason = '') {
  if (win && state === 'playing') { course = GAME_LENGTH; checkFlash(); }   // v97 · la sfida lampo 'seconda metà pulita' si chiude all'arrivo
  if ($('flashchip')) $('flashchip').hidden = true;
  forkHud(0); $('speedfx')?.classList.remove('on');
  if (duel?.racing) { duel.me = { s: Math.round(score), w: win ? 1 : 0, tm: +elapsed.toFixed(2), c: +course.toFixed(2), j: leap ? leapBest : 0 }; D.send({ t: 'end', ...duel.me }); }
  state = 'ended';
  A.engineStop(); A.stopVoice(); A.musicStop();
  setDisabled(false);
  if (ice) endDrift(true);
  const timeBonus = win && !leap ? Math.round((timeLimit - elapsed) * (ice ? 40 : 100)) : 0;
  if (win) score += lives * 250 + timeBonus;
  if (leap) score = win ? Math.round(leapBest * 100) + (leapPerfect ? 500 : 0) + 7 : 0;   // v67 · il 7 finale segna i punteggi col salto in metri nel campo tempo   // v59 · al Taglio di Angelo conta solo il salto: 100 punti a metro (+500 stacco perfetto)
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
  run.km = Math.round(roadTime * 19.5) / 1000;   // v96 · per le statistiche
  const res = P.recordRun(run);
  { const dw = derbyCheck(win); if (dw) { P.profile.beers += dw.beers; P.profile.derbyDay = P.todayKey(); P.save(); res.wallet = P.profile.beers; res.derby = dw; if (dw.jab) setTimeout(() => toast('⚔ ' + dw.jab.toUpperCase(), 'gold'), 1800); } }
  if (gev && !win) {   // v57 · fermato dalle GEV: multa in birre
    gevFine = Math.min(20, P.profile.beers); P.profile.beers -= gevFine; P.save(); res.wallet = P.profile.beers;
  }
  hud();
  $('banner').classList.remove('show');
  renderResult(win, res, reason, timeBonus);
  if (!tut) { const chest = P.claimDaily() || pendingChest; pendingChest = null; if (chest) setTimeout(() => { if (state === 'ended' && !$('chestpop')) showChest(chest); else pendingChest = chest; }, win ? 2200 : 1100); }
  if (gev) A.sfx.whistle();
  if (win) buzz([60, 70, 60, 70, 160]);
  if (win) celebrate(P.currentParts().festa?.id);
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
      ${touchDevice ? `<button class="secondary" id="tiltpause" type="button">📱 STERZO INCLINANDO: ${tiltOn ? 'SÌ' : 'NO'}</button>` : ''}
      <button class="secondary" id="quit">ABBANDONA IL GIRO</button>`;
    $('resume').onclick = pause;
    $('musictoggle').onclick = () => { A.setMusic(!A.isMusicOn()); $('musictoggle').innerHTML = iconize(A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO'); };
    if ($('tiltpause')) $('tiltpause').onclick = async () => { const on = await setTilt(!tiltOn); $('tiltpause').innerHTML = iconize('📱 STERZO INCLINANDO: ' + (on ? 'SÌ' : 'NO')); if (on) toast('📱 INCLINA IL DISPOSITIVO A DESTRA E SINISTRA PER STERZARE', 'green'); };   // v107.6 · il giroscopio si accende anche dalla pausa
    $('quit').onclick = () => { state = 'ready'; setDisabled(false); renderReady(); };
    $('pause').innerHTML = icon('play'); $('pause').setAttribute('aria-label', 'Riprendi');
    hud();
  } else if (state === 'paused') {
    if (touchDevice) goFull();
    state = countdown > 0 ? 'countdown' : 'playing';
    (A.setEngineProfile(P.currentBike().id), A.engineStart()); startMusic();
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
// v105 · Gusta Ranch (v106.1 · tutti i tracciati veri): le curve si fanno davvero (v105.1 · niente spinta automatica: la moto la guidi solo tu).
// La corda (corsia interna) è più corta e veloce, l'esterno è largo e lento; a fine curva un premio se hai tenuto la corda.
let corner = { t: 0, in: 0, s: 0, out: 0 }, cornerLine = 0;
function curBend() { const md = P.MODES[mode], ts = md.ranch ? null : trackShape(mode, variantOf(mode), courseLength(md.difficulty) * 19.5); return md.ranch ? ranchBend(roadTime * 19.5) : ts ? ts.bend(roadTime * 19.5) : 0; }
function ranchCorner(dt) {
  const b = curBend(), k = Math.abs(b);
  if (k > .55 && crash <= 0) {
    const inside = b > 0 ? 0 : 2, d = Math.abs(px - inside);
    cornerLine = d < .6 ? 1 : d > 1.35 ? -1 : 0;
    if (!corner.t) { corner.s = Math.sign(b); corner.in = corner.out = 0; }
    corner.t += dt; if (cornerLine > 0) corner.in += dt; if (cornerLine < 0) corner.out += dt;
  } else {
    cornerLine = 0;
    if (corner.t > 1.4) {
      const q = corner.in / corner.t;
      if (q > .7) { reward(Math.round(50 + q * 70), q > .9 ? 'CORDA PERFETTA!' : 'BELLA CORDA!', 'trick', false); run.corners = (run.corners || 0) + 1; if (q > .9) A.sfx.scrub(); }
      else if (corner.out / corner.t > .6) pop('LARGO… TIENI LA CORDA', 'small');
    }
    corner.t = 0;
  }
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
  const maxLat = 4.1 * (1 + (bs.steer || 0)) * (1 + up.tyres * .05) * (touchDevice ? 1.08 : 1) * (1 - route.rough * .18) * (1 - weather.rain * .12) * (has('mule') && route.rough > .4 ? 1.3 : 1) * (has('nimble') ? 1.25 : 1);
  // v106.2 · senza comandi la moto si assesta piano al centro della corsia più vicina (niente più "a metà" tra due corsie)
  const want = st ? st * maxLat : aimPx !== null ? Math.max(-maxLat, Math.min(maxLat, (aimPx - px) * 7.5)) : (Math.round(Math.max(0, Math.min(2, px))) - px) * 2.6;
  const acc = (14 - route.rough * 3.5) * (wet > 0 ? .6 : 1) * (1 + (bs.steer || 0) * .5);
  vx += (want - vx) * Math.min(1, dt * acc);
  px += vx * dt;
  if (barT > 0) px += Math.sin(elapsed * 4.2) * 1.8 * (1 - up.damper * .12) * dt * Math.min(1, barT);   // v84 · dopo la birra la moto balla
  { const slick = Math.max(wet > 0 ? 1 : 0, route.wet * weather.rain, route.wet * .35);   // v104 · sul fango e nelle pozze la moto scivola un filo di lato: va tenuta
    if (slick > .05 && jump <= 0) { slideT += dt; px += (Math.sin(slideT * 3.1) + Math.sin(slideT * 7.3) * .4) * .28 * slick * (1 - up.tyres * .12) * dt; } }
  if (!ice && !leap) ranchCorner(dt);   // v106.1 · la corda conta su tutti i tracciati veri, non solo al Gusta Ranch
  if (aimPx !== null && Math.abs(aimPx - px) < .02 && Math.abs(vx) < .15) { px += (aimPx - px) * .5; }
  const dir = st || (aimPx !== null && Math.abs(aimPx - px) > .25 ? Math.sign(aimPx - px) : 0);
  scrubCheck(dir);
  // bordi della pista: la fettuccia ti tiene dentro e rallenta un attimo
  if (px < -.45 || px > 2.45) {
    px = Math.max(-.45, Math.min(2.45, px)); vx = 0; edgeT = .35;
    if (elapsed - lastEdgeMsg > 3) { lastEdgeMsg = elapsed; pop('FETTUCCIA!', 'small'); if (touchDevice && navigator.vibrate) try { buzz(15); } catch {} }
  }
  edgeT = Math.max(0, edgeT - dt);
}
function takeoff() {
  const sup = grappa > 0;
  jumpDur = (sup ? SUPER_JUMP.duration : JUMP_DURATION) * (1 + up.susp * .03); jumpH = (sup ? SUPER_JUMP.height : JUMP_HEIGHT) * (1 + up.susp * .05) * (has('spring') ? 1.15 : 1) * (1 + (bs.jump || 0)); if (has('spring')) jumpDur *= 1.1;
  jump = jumpDur; scrubbed = 0; A.sfx.jump(); buzz(18);
  if (wheelie) endWheelie(false);
}
// v78 · PARTENZA A RAZZO: tocca SALTA proprio al VIA (da mezzo secondo prima a mezzo secondo dopo) = turbo e +150
let holePre = false, holeDone = false;
function holeshot() {
  holeDone = true; holePre = false; turbo = Math.max(turbo, 2.2 + up.clutch * .3); score += 150; run.holeshot = 1;
  A.sfx.turbo(); buzz([40, 40, 70]); shake = Math.max(shake, .25); bigCall('PARTENZA A RAZZO!'); pop('+150 PARTENZA', 'gold'); markHighlight('PARTENZA A RAZZO!', 700); fxKind = 'trick'; fxSerial++;
}
// v107 · SALTO TOLLERANTE: se un ostacolo saltabile ti arriva addosso a terra, hai ancora 0,12 s per premere SALTA
const GRACE = .1;
function graceWait(o) {
  const h = OBSTACLE_HEIGHT[o.type];
  if (h === undefined || h + .06 > JUMP_HEIGHT || leap || o.fly > 0) return false;
  if (turbo > 0 || grappa > 0 || invincible > 0 || crash > 0 || (wheelie && (o.type === 'root' || o.type === 'puddle'))) return false;
  if (o.graceAt === undefined) { if (jump > 0) return false; o.graceAt = elapsed; }
  if (jump > 0 && elapsed - o.graceAt > 0 && jumpDur - jump < GRACE + .02) { o.graceJump = true; return false; }   // ha saltato durante la tolleranza
  if (elapsed - o.graceAt < GRACE && jump <= 0) { o.hit = false; return true; }   // aspetta ancora un attimo
  return false;
}
function hop() {
  if (state === 'countdown') { if (countdown < .5 + up.clutch * .1 && !holeDone) holePre = true; return; }
  if (state !== 'playing') return;
  if (flat) {   // v106.7 · cambio della camera d'aria: ogni tocco è un pezzo del lavoro
    fixP += 1 / 6; A.sfx.click?.(); shake = Math.max(shake, .12); buzz(15);
    const steps = ['SMONTI LA RUOTA', 'TOGLI IL COPERTONE', 'CAMERA NUOVA', 'RIMONTI', 'GONFI', 'STRINGI I DADI'];
    if (fixP >= .999) { flat = false; fixP = 0; toast('✅ CAMERA D’ARIA CAMBIATA: VAI!', 'green'); reward(60, 'MECCANICO DEL DESERTO!', 'trick', false); }
    else toast('🔧 ' + steps[Math.min(5, Math.round(fixP * 6) - 1)] + ' · ' + Math.round(fixP * 6) + '/6', 'gold');
    return;
  }
  if (sandStuck) {   // v106.7 · fuori dalla sabbia a spinte
    pushP += .2; shake = Math.max(shake, .2); A.sfx.click?.(); buzz(12);
    if (pushP >= 1) { sandStuck = false; sandT = 0; reward(80, 'FUORI DALLA SABBIA!', 'trick', false); toast('💪 FUORI! E ADESSO GAS', 'green'); }
    else toast('💪 SPINGI! ' + Math.round(pushP * 100) + '%', 'gold');
    return;
  }
  if (stalled) {   // v84 · moto piantata in salita: ogni tocco è una spinta
    pushP += .2; shake = Math.max(shake, .2); A.sfx.click?.();
    if (pushP >= 1) { stalled = false; grip = .5; stallT = 0; reward(100, 'SPINTA EROICA!', 'trick', false); toast('💪 RIPARTITO! DOSA IL GAS', 'green'); }
    else toast('💪 SPINGI! ' + Math.round(pushP * 100) + '%', 'gold');
    return;
  }
  if (!holeDone && elapsed < .5 + up.clutch * .1) { holeshot(); return; }
  lastHopAt = elapsed;
  if (leap && leapState === 2) return;   // v59 · in volo dal trampolino non si risalta
  if (jump <= 0) takeoff();
  else if (jump < .24) jumpBuffer = .26;   // v107 · buffer più largo // premuto un attimo prima di atterrare: salta appena tocca terra
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
  errors++; run.errors = errors; if (course > GAME_LENGTH / 2) run.errors2 = (run.errors2 || 0) + 1;
  if (!earsPermanent && (errors >= 3 || lives === 1)) {
    earsPermanent = true; A.sfx.ears();
    setTimeout(() => toast(lives === 1 ? '🐰 ULTIMA MOTO: ORECCHIE DA CONIGLIO!' : '🐰 TRE ERRORI: ORECCHIE DA CONIGLIO!', 'pink'), 900);
  }
}

// v49 · GAS: tieni premuto = gas finché tieni; un tocco veloce = GAS BLOCCATO fino alla fine della salita (sul ghiaccio solo tenuto: va dosato)
$('gas').onpointerdown = e => { e.preventDefault(); if (state === 'playing' && (stalled || sandStuck || flat)) { hop(); return; }   // v107.9 · moto piantata: anche il tasto GAS spinge (prima serviva SALTA e su iPad non si capiva)
  if (state === 'playing') { gas = true; gasDownAt = performance.now(); $('gas').setPointerCapture(e.pointerId); } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('gas').addEventListener(ev, () => {
  if (!gasDownAt) return;
  const tap = performance.now() - gasDownAt < 230; gasDownAt = 0;
  if (tap && !ice && !feat('traction') && state === 'playing') { gasLock = !gasLock; noClimbT = 0; if (gasLock) toast('🔒 GAS BLOCCATO: TOCCA ANCORA PER MOLLARE', 'green'); }
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
  if (on) { A.sfx.click(); if (state === 'playing') (A.setEngineProfile(P.currentBike().id), A.engineStart()); } else A.engineStop();
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
// v106.6 · il pulsante dello schermo intero sparisce quando scorri le schede (copriva i prezzi in officina)
$('overlay').addEventListener('scroll', e => { const y = e.target.scrollTop || 0; $('overlay').classList.toggle('scrolled', y > 30); }, { capture: true, passive: true });
new MutationObserver(() => $('overlay').classList.remove('scrolled')).observe($('card'), { childList: true });
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
  // v106.2 · ogni tanto una fila di tre porte che attraversa la pista: prese tutte di traverso valgono un premio grosso
  if (wave > 2 && wave - (run.gateSeqW ?? -9) > 3 && rng() < .3) {
    run.gateSeqW = wave; const dir = rng() < .5 ? 1 : -1, id = wave;
    for (let i = 0; i < 3; i++) add(dir > 0 ? i : 2 - i, .08 - i * .26, 'gate', { seq: id });
    prevSafe = dir > 0 ? 2 : 0; toast('⛳ SLALOM DI PORTE: PRENDILE TUTTE E 3 DI TRAVERSO', 'blue'); wave++; return;
  }
  if (wave > 0 && rng() < .55) add(safe, .08, 'gate');
  for (let i = 0; i < 3; i++) add(safe, (wave > 0 && i === 0 ? .0 : .08) - i * .1, i === 1 && wave > 3 && lives < maxLives && rng() < .08 ? 'helmet' : 'coin');
  // v88 · niente ostacoli: sul ghiaccio si derapa e basta (il pericolo è il muro di neve nei curvoni)
  wave++;
}
// v46 · MontaFiga: slalom continuo tra gli alberi, il varco si sposta di una corsia a ogni fila.
function spawnSlalomWave() {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  let g = prevSafe + (rng() < .5 ? -1 : 1);
  if (g < 0) g = 1; if (g > 2) g = 1;
  if (wave > 6 && prevSafe !== 1 && rng() < .3) g = 2 - prevSafe;   // v89 · ogni tanto il varco salta da un lato all'altro
  if (wave < 2) g = 1;
  prevSafe = g;
  for (let l = 0; l < 3; l++) if (l !== g) add(l, .08, 'tree', { lean: (rng() - .5) * .3 });
  add(g, .08, 'sgap');
  if (wave % 3 !== 2) add(g, .02, 'coin');   // v89 · MontaFiga: birre su due file ogni tre (faceva quasi il doppio dei punti degli altri percorsi)   // v81 · MontaFiga: meno birre (dava il doppio dei punti degli altri percorsi)
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
// v106.7 · Desertone: i cammelli attraversano la pista (uno o una piccola carovana), non si saltano
let lastCamel = -9;
function spawnDesertSpecial() {
  if (wave - lastCamel < 3 || rng() > .3) return false;
  lastCamel = wave;
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  const dir = rng() < .5 ? 1 : -1, n = rng() < .4 ? 2 : 1, first = Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) { const lEnd = i ? (first + 1 + Math.floor(rng() * 2)) % 3 : first, k = dir * 2.0 / .83; add(lEnd - (.91 - (.08 - i * .2)) * k, .08 - i * .2, 'camel', { roll: true, lEnd, k, cross: dir }); }
  const beerLane = [0, 1, 2].find(l => l !== first) ?? 1;
  add(beerLane, .02, 'coin'); add(beerLane, -.08, 'coin');
  toast(n > 1 ? '🐪 CAROVANA DI CAMMELLI IN PISTA!' : '🐪 CAMMELLO IN PISTA!', 'gold');
  prevSafe = beerLane; wave++; return true;
}
function puncture() {
  if (flat) return;
  flat = true; fixP = 0; run.flats = (run.flats || 0) + 1; breakCombo(); mistake(); A.sfx.hit(); shake = Math.max(shake, .5); buzz([40, 60, 40]);
  bigCall('FORATO!'); toast('🔧 CAMBIA LA CAMERA D’ARIA: TOCCA SALTA 6 VOLTE', 'red');
}
// v81 · Gusta Ranch: il Gusta passa con il trattore e la trincia di traverso alla pista, a dare fastidio
let lastTractor = -9;
function spawnRanchSpecial(force = false) {
  if (!force && (wave < 2 || wave - lastTractor < 4 || rng() > .42)) return false;
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  lastTractor = wave;
  const lEnd = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1, k = dir * 1.9 / .83;
  add(lEnd - (.91 - .08) * k, .08, 'trincia', { roll: true, lEnd, k, cross: dir });
  const beerLane = (lEnd + 1 + Math.floor(rng() * 2)) % 3;
  add(beerLane, .02, 'coin'); add(beerLane, -.08, 'coin');
  toast('🚜 ARRIVA IL GUSTA CON LA TRINCIA!', 'gold'); gustaPop(); A.sfx.horn?.(); setTimeout(() => A.sayRival('gusta_trincia'), 450);   // v83 · con la sua voce (ElevenLabs)
  prevSafe = beerLane; wave++; return true;
}
let gustaAt = -99, gustaTimer = 0;
function gustaPop(line) {
  const el = $('gustapop'); if (!el || elapsed - gustaAt < 9) return; gustaAt = elapsed;
  const img = el.querySelector('img'); if (!img.src && FOTO.gusta) img.src = FOTO.gusta;
  el.querySelector('.bubble').textContent = line || 'LEVATI DAI PIEDI CHE TRINCIO TUTTO!';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(gustaTimer); gustaTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- v97 · GIRO SEMPRE DIVERSO: imprevisti, bivi, tratti flow e pietraia, sfida lampo ----------
let runPlan = null, forkPath = null, forkInfo = null;   // v103 · bivio vero: la strada si divide in due rami (sinistra e destra) che poi si ricongiungono
const FLASH_POOL = [
  { id: 'jumps', text: 'Fai 6 salti', goal: 6, val: () => run.jumps },
  { id: 'combo', text: 'Arriva a combo ×5', goal: 5, val: () => run.maxMult },
  { id: 'climbcaps', text: 'Prendi 5 birre in salita', goal: 5, val: () => run.climbCaps || 0 },
  { id: 'air', text: 'Prendi 3 birre al volo', goal: 3, val: () => run.airCaps },
  { id: 'short', text: 'Prendi la pietraia a un bivio', goal: 1, val: () => run.forkShort || 0 },
  { id: 'clean2', text: 'Seconda metà del giro senza errori', goal: 1, val: () => course >= GAME_LENGTH - .3 && !run.errors2 ? 1 : 0 },
];
const FLASH_BEERS = 15;
function makeRunPlan() {
  const md = P.MODES[mode], plan = { events: [], forks: [], zones: [], gold: [], flash: null, flashDone: false };
  forkPath = null; forkInfo = null; forkHud(0); $('flashchip')?.classList.remove('done');
  if (!md.leap) {   // v104 · boccali d'oro: posti fissi per tutta la settimana (uguali per tutti), quelli già trovati non tornano
    const gr = makeRng(P.weekKey() * 31 + md.id * 977), found = P.goldFound(md.id), spots = ['left', 'air', 'right'].sort(() => gr() - .5);
    plan.gold = [0, 1, 2].map(i => ({ i, at: 8 + i * 15 + gr() * 11, kind: spots[i], l: spots[i] === 'left' ? -.38 : spots[i] === 'right' ? 2.38 : Math.floor(gr() * 3) })).filter(g => !found[g.i]);
  }
  if (md.ice || md.leap || md.slalom) return plan;
  const pool = FLASH_POOL.filter(f => f.id !== 'climbcaps' || layoutSegments().some(g => g.climb > .3));
  plan.flash = pool[Math.floor(rng() * pool.length)];
  if (md.gev) { plan.flash = pool.find(f => f.id === 'combo'); const nb = 1 + (rng() < .5 ? 1 : 0); for (let i = 0; i < nb; i++) plan.events.push({ kind: 'blocco', at: 14 + (i + .3 + rng() * .4) * (34 / nb) }); return plan; }
  // v103 · imprevisti tipici di ogni percorso: almeno uno a giro, poi quelli di sempre
  const own = { 0: ['vendemmia'], 10: ['tombini', 'ondata'], 11: ['mucche', 'elicottero'], 15: ['cinghiali', 'cervo'] }[md.id] || [];
  const kinds = md.ranch ? ['galline', 'rotoballe', 'porcile', 'carro', 'pioggia'] : ['gregge', 'albero', 'frana', 'pioggia', 'dolmen'];   // v102 · al Gusta Ranch: ignoranza pura
  if (!md.ranch) kinds.push('trattore');
  if (!md.wild && !md.ranch) kinds.push('guado');
  if (feat('night') || md.rainy) kinds.splice(kinds.indexOf('pioggia'), 1);
  const n = md.ranch ? 3 + (rng() < .5 ? 1 : 0) : 2 + (rng() < .5 ? 1 : 0);
  const firstOwn = own.length ? own[Math.floor(rng() * own.length)] : null, ownSlot = Math.floor(rng() * n);
  if (own.length) for (const k of own) if (k !== firstOwn) kinds.push(k);
  for (let i = 0; i < n; i++) { const k = i === ownSlot && firstOwn ? firstOwn : kinds.splice(Math.floor(rng() * kinds.length), 1)[0]; plan.events.push({ kind: k, at: 9 + (i + .2 + rng() * .6) * (40 / n) }); }
  const near = (at, d) => plan.events.some(e => Math.abs(e.at - at) < d) || plan.forks.some(f => Math.abs(f.at - at) < d + 4) || plan.zones.some(z => at > z.from - d && at < z.to + d);
  const nf = 1 + (rng() < .45 ? 1 : 0);
  for (let i = 0; i < nf; i++) { let at = 0, tries = 0; do { at = 15 + rng() * 32; } while (++tries < 40 && near(at, 5)); if (!near(at, 5) || !i) plan.forks.push({ at }); }
  plan.forks.sort((a, b) => a.at - b.at);
  for (const kind of ['flow', 'pietraia']) { let at = 0, tries = 0; do { at = 11 + rng() * 40; } while (++tries < 40 && near(at, 4)); plan.zones.push({ kind, from: at, to: at + 4 + rng() * 1.5, said: false }); }
  return plan;
}
function spawnEvent(kind) {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  const beer = l => { add(l, .02, 'coin'); add(l, -.08, 'coin'); prevSafe = l; };
  if (kind === 'pioggia') { weatherPlan.push({ kind: 'rain', from: elapsed, to: elapsed + 14 }); toast('🌧 ACQUAZZONE IMPROVVISO! FANGO OVUNQUE', 'blue'); return false; }
  if (kind === 'trattore') return spawnRanchSpecial(true);
  if (kind === 'guado') {
    add(1, .08, 'ford');
    for (let k = -2; k <= 2; k++) { const dz = k * .05, lift = 2.05 * Math.max(0, Math.cos(dz / .5 / JUMP_DURATION * Math.PI)) + .1; add(prevSafe, .08 - dz, 'coin', { air: true, lift: Math.max(.35, lift) }); }
    toast('🌊 GUADO IMPROVVISO! SALTA O TI BAGNI I PIEDI', 'blue'); wave++; return true;
  }
  // v102 · Gusta Ranch: galline in fuga, rotoballe lanciate dal Gusta, il porcile, il carro del fieno
  if (kind === 'galline') {
    const free = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1; let i = 0;
    for (let l = 0; l < 3; l++) if (l !== free) for (let h = 0; h < 2; h++) { const k = dir * (2.3 + h * .5) / .83; add(l - (.91 - .08) * k, .08 - i * .05 - h * .03, 'hen', { roll: true, lEnd: l, k, cross: dir }); i++; }
    beer(free); toast('🐔 GALLINE IN FUGA! COCCODÈ!', 'gold'); A.sfx.horn?.(); wave++; return true;
  }
  if (kind === 'rotoballe') {
    for (let i = 0; i < 2; i++) { const lEnd = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1, k = dir * 2.8 / .83; add(lEnd - (.91 - .08) * k, .08 - i * .18, 'rollHay', { roll: true, lEnd, k, cross: dir }); }
    toast('🌾 IL GUSTA TI TIRA LE ROTOBALLE!', 'red'); gustaPop('TIÈ, BECCATI LA ROTOBALLA!'); wave++; return true;
  }
  if (kind === 'porcile') {
    add(1, .08, 'pigpen');
    for (let k = -2; k <= 2; k++) { const dz = k * .05, lift = 2.05 * Math.max(0, Math.cos(dz / .5 / JUMP_DURATION * Math.PI)) + .1; add(prevSafe, .08 - dz, 'coin', { air: true, lift: Math.max(.35, lift) }); }
    toast('🐷 IL PORCILE DEL GUSTA! SALTALO… O BUTTATI DENTRO', 'gold'); wave++; return true;
  }
  if (kind === 'carro') {
    const l = Math.floor(rng() * 3); add(l, .08, 'hayCart');
    for (let k = 1; k <= 5; k++) add(l, .08 - k * .055, 'coin', { air: true, lift: 1.2 + Math.sin(k / 6 * Math.PI) * 2.6 });
    toast('🌾 CARRO DEL FIENO! PRENDILO IN PIENO E VOLA', 'gold'); prevSafe = l; wave++; return true;
  }
  // v103 · imprevisti dei singoli percorsi
  if (kind === 'vendemmia') {
    const free = Math.floor(rng() * 3);
    for (let l = 0; l < 3; l++) if (l !== free) { add(l, .08, 'grapeCrate'); if (rng() < .6) add(l, -.12, 'grapeCrate'); }
    beer(free); add(free, -.18, 'coin'); toast('🍇 VENDEMMIA! CASSETTE D’UVA IN PISTA', 'gold'); wave++; return true;
  }
  if (kind === 'mucche') {
    const free = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1; let i = 0;
    for (let l = 0; l < 3; l++) if (l !== free) { const k = dir * 1.5 / .83; add(l - (.91 - .08) * k, .08 - i * .1, 'cow', { roll: true, lEnd: l, k, cross: dir }); i++; }
    beer(free); toast('🐄 MANDRIA AL PASCOLO! LE MUCCHE NON SI SALTANO', 'red'); A.sfx.horn?.(); wave++; return true;
  }
  if (kind === 'elicottero') {
    add(1, .02, 'heli');
    const l = Math.floor(rng() * 3); for (let k = 0; k < 6; k++) add(l, .0 - k * .06, 'coin', { air: k % 2 === 1, lift: 1.4 });
    bigCall('🚁 SOCCORSO ALPINO!'); toast('🚁 L’ELICOTTERO VI LANCIA LE BIRRE!', 'gold'); prevSafe = l; wave++; return true;
  }
  if (kind === 'tombini') {
    for (let r = 0; r < 2; r++) { const free = Math.floor(rng() * 3); for (let l = 0; l < 3; l++) if (l !== free) add(l, .08 - r * .2, 'manhole'); add(free, .08 - r * .2, 'coin'); }
    toast('🕳 SALTANO I TOMBINI! OCCHIO AI BUCHI', 'red'); wave++; return true;
  }
  if (kind === 'ondata') {
    add(1, .08, 'pigpen', { sludge: true });
    for (let k = -2; k <= 2; k++) { const dz = k * .05, lift = 2.05 * Math.max(0, Math.cos(dz / .5 / JUMP_DURATION * Math.PI)) + .1; add(prevSafe, .08 - dz, 'coin', { air: true, lift: Math.max(.35, lift) }); }
    toast('💩 ONDATA DI FANGO DALLA FOGNA! SALTALA', 'gold'); wave++; return true;
  }
  if (kind === 'cinghiali') {
    const dir = rng() < .5 ? 1 : -1, free = Math.floor(rng() * 3); let i = 0;
    for (let l = 0; l < 3; l++) if (l !== free) for (let h = 0; h < 2; h++) { const k = dir * (2.6 + h * .4) / .83; add(l - (.91 - .08) * k, .08 - i * .06 - h * .04, 'boar', { roll: true, lEnd: l, k, cross: dir }); i++; }
    beer(free); toast('🐗 CINGHIALI IN PISTA!', 'red'); wave++; return true;
  }
  if (kind === 'cervo') {
    const dir = rng() < .5 ? 1 : -1, lEnd = 1, k = dir * 3.4 / .83; add(lEnd - (.91 - .08) * k, .08, 'deer', { roll: true, lEnd, k, cross: dir });
    bigCall('🦌 UN CERVO NEL FARO!'); wave++; return true;
  }
  if (kind === 'dolmen') {   // v103 · i dolmen di Costa: due pietroni preistorici in pista, una sola corsia libera
    const free = Math.floor(rng() * 3);
    for (let l = 0; l < 3; l++) if (l !== free) add(l, .08 - (l % 2) * .06, 'dolmen');
    run.dolmens = (run.dolmens || 0) + 1; beer(free); toast('🗿 I DOLMEN DI COSTA! NON SI SALTANO, SI SCHIVANO', 'red'); wave++; return true;
  }
  if (kind === 'blocco') {
    const free = Math.floor(rng() * 3);
    for (let r = 0; r < 2; r++) for (let l = 0; l < 3; l++) if (l !== free) add(l, .08 - r * .14, 'barrier');
    beer(free); toast('🚧 POSTO DI BLOCCO DELLE GEV! PASSA DOVE C’È IL BUCO', 'red'); A.sfx.whistle?.(); wave++; return true;
  }
  if (kind === 'gregge') {
    const free = Math.floor(rng() * 3), dir = rng() < .5 ? 1 : -1; let i = 0;
    for (let l = 0; l < 3; l++) if (l !== free) { const k = dir * 2 / .83; add(l - (.91 - .08) * k, .08 - i * .07, 'goat', { roll: true, lEnd: l, k, cross: dir }); i++; }
    beer(free); toast('🐐 GREGGE IN PISTA! PASSA DOVE C’È LA BIRRA', 'gold'); wave++; return true;
  }
  if (kind === 'albero') {
    const free = Math.floor(rng() * 3);
    for (let l = 0; l < 3; l++) if (l !== free) { add(l, .08, 'tree', { lean: (l - free) * .4 }); add(l, -.06, 'log'); }
    beer(free); toast('🌲 ALBERO CADUTO! UNA SOLA CORSIA LIBERA', 'red'); wave++; return true;
  }
  if (kind === 'frana') {
    for (let i = 0; i < 2; i++) { const lEnd = Math.floor(rng() * 3), k = 3.2 / .83; add(lEnd - (.91 - .08) * k, .08 - i * .16, 'rollRock', { roll: true, lEnd, k }); }
    toast('⛰ FRANA! DUE SASSI IN ARRIVO', 'red'); wave++; return true;
  }
  return false;
}
function spawnFork(ss) {
  const shortSide = ss || (rng() < .5 ? -1 : 1), t0 = roadTime * 19.5, x0 = t0 + (.91 - .04) * 55, len = 5 / GAME_LENGTH * courseLength(P.MODES[mode].difficulty) * 19.5;
  objects = objects.filter(o => o.z > .3 || o.type === 'coin' || o.type === 'goldMug');   // v106.2 · prima del bivio: niente ostacoli fino al cartello
  objects.push({ l: 1, z: .04, type: 'forkSplit', shortSide, hit: false });
  forkInfo = { x0, x1: x0 + len, side: 0, shortSide };
  const side = d => d < 0 ? 'SINISTRA' : 'DESTRA';
  forkHud(shortSide); bigCall('🔀 BIVIO: SCEGLI IL LATO!');
  wave++;
}
function takeFork(kind) {
  for (const o of objects) if (o.type === 'forkShort' || o.type === 'forkSafe') o.collected = true;
  forkPath = { kind, until: course + 5 };
  objects = objects.filter(o => o.z > .8);
  if (kind === 'short') { run.forkShort = (run.forkShort || 0) + 1; bigCall('🪨 PIETRAIA CORTA!'); A.sfx.near(); }
  else { bigCall('🍺 STRADA LUNGA'); A.sfx.beer(); }
}
function spawnRockWave(dense) {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  let free = prevSafe + (rng() < .5 ? -1 : 1); if (free < 0) free = 1; if (free > 2) free = 1; prevSafe = free;
  for (let l = 0; l < 3; l++) if (l !== free) { add(l, .08, 'rock'); if (dense && rng() < .5) add(l, -.04, 'rock'); }
  add(free, .06, 'coin'); wave++;
}
function spawnFlowWave() {
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  const l = prevSafe;
  add(l, .08, 'ramp');
  for (let k = 1; k <= 4; k++) add(l, .08 - k * .055, 'coin', { air: true, lift: Math.max(.6, Math.sin(Math.min(1, k / 5) * Math.PI) * 2.6 + .1) });
  wave++;
}
function spawnBeerLine() {
  const l = prevSafe = (prevSafe + (rng() < .5 ? 0 : rng() < .5 ? 1 : 2)) % 3;
  for (let i = 0; i < 3; i++) objects.push({ l, z: .08 - i * .1, type: 'coin', hit: false });
  wave++;
}
// pianificazione del giro, chiamata da spawnWave: true = l'ondata l'ha già fatta lei
function planWave() {
  if (!runPlan) return false;
  if (forkInfo && roadTime * 19.5 > forkInfo.x1 + 60) forkInfo = null;
  if (forkPath) {
    if (course >= forkPath.until) {
      if (forkPath.kind === 'short') { const jw = courseLength(P.MODES[mode].difficulty) * 19.5 * .045; roadTime += jw / 19.5; for (const r of rivals) r.gap -= jw; score += 300; pop('⏱ PIETRAIA SUPERATA: SEI PIÙ AVANTI! +300', 'gold'); }
      forkPath = null;
    } else { if (forkPath.kind === 'short') spawnRockWave(true); else spawnBeerLine(); return true; }
  }
  if (runPlan.forks.length && course >= runPlan.forks[0].at) { const f = runPlan.forks.shift(); spawnFork(f.shortSide); return true; }
  if (runPlan.events.length && course >= runPlan.events[0].at) { const ev = runPlan.events.shift(); if (spawnEvent(ev.kind)) return true; }
  const zone = runPlan.zones.find(z => course >= z.from && course < z.to);
  if (zone) {
    if (!zone.said) { zone.said = true; toast(zone.kind === 'flow' ? '🌊 TRATTO FLOW: DOSSI E SALTI IN FILA' : '🪨 PIETRAIA TECNICA: OCCHIO ALLE LINEE', zone.kind === 'flow' ? 'green' : 'red'); }
    if (zone.kind === 'flow') spawnFlowWave(); else spawnRockWave(false);
    return true;
  }
  return false;
}
// v103 · bivio annunciato prima: cartello a schermo con i due lati finché non scegli
function forkHud(ss) {
  const h = $('forkhud'); if (!h) return;
  if (!ss) { h.hidden = true; return; }
  const lab = sd => sd === ss ? '<b>PIETRAIA</b><small>⏱ CORTA · DURA</small>' : '<b>STRADA LUNGA</b><small>🍺 PULITA · BIRRE</small>';
  h.innerHTML = `<span class="fh ${ss < 0 ? 'short' : 'long'}"><i>◀</i>${lab(-1)}</span><span class="fhc">🔀 BIVIO</span><span class="fh ${ss > 0 ? 'short' : 'long'}">${lab(1)}<i>▶</i></span>`;
  h.hidden = false;
}
function forkWarn() {
  const f = runPlan?.forks?.[0];
  if (f && !f.warned && course >= f.at - 2.5) { f.warned = true; f.shortSide = f.shortSide || (rng() < .5 ? -1 : 1); forkHud(f.shortSide); bigCall('🔀 BIVIO IN ARRIVO!'); A.sfx.click?.(); }
  const h = $('forkhud'); if (!h || h.hidden) return;
  if (forkInfo?.side) { forkHud(0); return; }
  const ss = f?.shortSide || forkInfo?.shortSide || 1, sel = px < .97 ? -1 : px > 1.03 ? 1 : -ss, sp = h.querySelectorAll('.fh');
  if (sp.length === 2) { sp[0].classList.toggle('sel', sel < 0); sp[1].classList.toggle('sel', sel > 0); }
}
function checkFlash() {
  forkWarn();
  const f = runPlan?.flash; if (!f || runPlan.flashDone) return;
  const v = f.val(), ch = $('flashchip');
  if (ch) { ch.hidden = state !== 'playing'; ch.innerHTML = `🎯 ${f.text}<b>${Math.min(v, f.goal)}/${f.goal}</b>`; }
  if (v >= f.goal) { runPlan.flashDone = true; run.caps += FLASH_BEERS; run.flash = f.text; flash('gold'); A.sfx.perfect?.(); bigCall('🎯 SFIDA LAMPO!'); toast(`🎯 SFIDA LAMPO FATTA: ${f.text.toUpperCase()} · +${FLASH_BEERS} 🍺`, 'gold'); if (ch) ch.classList.add('done'); }
}
function duelNoPlan() { return false; }
// v106.2 · gli ostacoli compaiono più lontano (≈63 m invece di ≈45 m): mezzo secondo in più per vederli e decidere.
// Le distanze tra loro non cambiano; restano dove sono i cartelli legati al paesaggio (bivio) e le cose lanciate.
const Z_AHEAD = .32, Z_FIXED = new Set(['forkSplit', 'forkShort', 'forkSafe', 'heli', 'gevmark', 'landpad', 'mboard', 'bigRamp', 'speedpad']);
function spawnWave() {
  if (tut || (coachOn && !ice && !leap && !duel?.racing)) return;   // v107.2 · giro guidato: niente ostacoli finché non hai provato le mosse
  const before = new Set(objects);
  spawnWaveCore();
  if (leap) return;
  for (const o of objects) if (!before.has(o) && !o.fly && !o.of && !Z_FIXED.has(o.type)) o.z -= Z_AHEAD;
}
function spawnWaveCore() {
  if (leap) return spawnLeapWave();
  if (P.MODES[mode].ranch && spawnRanchSpecial()) return;
  if (ice) return spawnIceWave();
  if (P.MODES[mode].slalom) return spawnSlalomWave();
  if (P.MODES[mode].gev && !duelNoPlan() && runPlan?.events.length && course >= runPlan.events[0].at) { const ev = runPlan.events.shift(); if (spawnEvent(ev.kind)) { checkFlash(); return; } }
  if (!P.MODES[mode].gev && !duelNoPlan() && planWave()) { checkFlash(); return; }
  checkFlash();
  { const rr = routeAt(course, roadTime * 19.5);   // v85 · in salita con la trazione si pensa solo al gas: niente ostacoli, solo birre
    if (feat('traction') && (rr.climb > .3 || rr.grade > .04) && !leap) { const l = Math.floor(rng() * 3); for (let i = 0; i < 3; i++) objects.push({ l, z: -.08 * i, type: 'coin', hit: false }); wave++; return; } }
  if (P.MODES[mode].wild && wave > 1 && spawnWildSpecial(routeAt(course, roadTime * 19.5).id)) return;
  if (desert && wave > 1 && spawnDesertSpecial()) return;
  const r = routeAt(course, roadTime * 19.5), section = r.id, diff = P.MODES[mode].difficulty;
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  const md = P.MODES[mode];
  const obs = () => pick(md.obs?.[section] || SECTION_OBS[section]);
  const zSpeed = (1 + diff * .35 + elapsed / 100) * speedNow * 19.5 / 55;

  // Mulattiera: frana! Un sasso rotola giù dalla parete e attraversa le corsie.
  if (section === 3 && !md.desert && wave > 1 && wave - lastSpecial > 2 && rng() < .3 + diff * .07) {
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
  if (!md.ranch && !md.desert && (section === 0 || section === 2) && wave > 2 && wave - lastBigLog > 3 && rng() < .2 + diff * .04) {
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
  // v91 · di notte un lampo illumina la fila nuova appena compare in fondo (al massimo uno ogni 2 s)
  if (weather.night > .5 && !weather.lamp && elapsed - lastWaveFlash > 2) { lastWaveFlash = elapsed; weather.flash = Math.max(weather.flash, .8); nextFlash = Math.max(nextFlash, 3); setTimeout(() => A.sfx.thunder?.(), 350 + Math.random() * 500); }
  wave++;
}

// ---------- v59 · Il taglio di Angelo: rincorsa, trampolino, salto nel vuoto ----------
function spawnLeapWave() {
  // v64 · partenza, discesa a tutta sulle frecce di spinta, poi il burrone (niente rampa: finisce la montagna)
  const add = (l, z, type, extra = {}) => objects.push({ l, z, type, hit: false, ...extra });
  if (leapState === 0 && course > 9) {
    leapState = 1; add(1, .08, 'bigRamp');
    canyonX0 = roadTime * 19.5 + (.91 - .08) * 55;
    canyonLen = 400;   // finché non stacchi il burrone non finisce
    for (let k = 1; k <= 3; k++) add(1, .08 + k * .08, 'speedpad');
    toast(charge >= 100 && turbo <= 0 ? '🏔 IL BURRONE! ACCENDI IL TURBO ADESSO E VOLA LONTANO!' : '🏔 ARRIVA IL BURRONE: PRENDI LE ULTIME SCOPE E VOLA!', 'gold'); if (charge >= 100 && turbo <= 0) bigCall('TURBO ADESSO!'); wave++; return;
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
  leapPerfect = perfect; leapTurbo = turbo > 0;
  leapStartKmh = Math.max(20, kmh * (leapTurbo ? .8 : 1));   // v86 · il turbo allunga il salto, ma senza raddoppiarlo
  const k = Math.max(0, Math.min(1.6, (leapStartKmh - 35) / 50)) * (perfect ? 1.12 : 1) * (leapTurbo ? 1.1 : 1);   // v86 · stacco col turbo acceso
  const v = Math.max(8, leapZRate * 55) * .42;   // unità di mondo al secondo in volo (scorrimento rallentato)
  leapV = v;   // v87 · in volo il mondo scorre a velocità fissa: si arriva sempre dove previsto, anche se il turbo finisce a metà volo
  jumpDur = Math.max(2.2 + k * 2.2, 30 / v);
  jumpH = 3.5 + k * 5.5; jump = jumpDur; scrubbed = 0;
  // v86 · burrone di larghezza fissa: chi salta di più atterra più in là sul pendio, oltre i cartelli dei metri
  const Dw = v * jumpDur, mPerU = (leapStartKmh / 3.6) / v;
  canyonLand = Dw; canyonLen = Math.max(14, Math.min(Dw - 8, 24));
  if (wheelie) endWheelie(false);
  leapState = 2; leapStartT = elapsed; leapPitch = .1; leapW = 0;
  objects = objects.filter(o => o.type === 'bigRamp');
  // campo di pietroni dove atterri: due corsie piene, una libera col bersaglio verde. Si sceglie sterzando in volo.
  leapFree = Math.floor(rng() * 3);
  const zLand = .91 - v / 55 * jumpDur;
  for (let r = -3; r <= 3; r++) {
    const z = zLand + r * .04;
    for (let l = 0; l < 3; l++) if (l !== leapFree) objects.push({ l, z: z + (rng() - .5) * .015, type: 'boulder', hit: false });   // v69 · due corsie piene di pietroni, la terza libera fino in fondo
  }
  objects.push({ l: leapFree, z: zLand, type: 'landpad', hit: false });
  // cartelli dei metri lungo il pendio d'arrivo (ogni 5 m), più quello del tuo record
  const rec = Math.floor(Math.max(0, (P.bestFor(mode) || 0) - 7) / 100);
  let side = 0;
  for (let d = Math.ceil((canyonLen + 2) * mPerU / 5) * 5; d <= (Dw + 18) * mPerU && side < 40; d += 5) objects.push({ l: side++ % 2 ? 3.1 : -1.1, z: .91 - d / mPerU / 55, type: 'mboard', m: d, hit: false });
  if (rec > 0 && rec / mPerU > canyonLen) objects.push({ l: -1.6, z: .91 - rec / mPerU / 55, type: 'mboard', m: rec, rec: true, hit: false });
  A.sfx.jump(); A.sfx.turbo(); shake = .6; flash('gold');
  bigCall(leapTurbo ? 'STACCO COL TURBO!' : perfect ? 'STACCO PERFETTO!' : 'NEL VUOTO!');
  setTimeout(() => { if (leapState === 2) toast('LANCETTA NEL VERDE: GAS = MUSO SU, MOLLA = MUSO GIÙ · VAI SUL BERSAGLIO VERDE', 'gold'); }, 400);
}
function leapStep(dt) {
  if (leapState < 2) leapMul = Math.max(1, Math.min(1.75, leapMul + dt * (turbo > 0 ? .08 : gas ? .04 : -.02)));   // v86 · col turbo la rincorsa sale di più   // la discesa spinge, col gas di più
  if (leapState === 2 && jump > 0) {
    // v64 · assetto semplice: col gas (o impenna) il muso sale, mollando scende piano. Verde = |muso| < 0,5
    const up = gas || wheelieHeld;
    leapPitch = Math.max(-1.2, Math.min(1.2, leapPitch + (up ? .5 : -.3) * dt));
    if (up.wings) leapPitch -= leapPitch * Math.min(1, dt * up.wings * .12);   // v96 · ali: si raddrizza da sola
    leapDist = (elapsed - leapStartT) * leapStartKmh / 3.6;
  }
  if (leapState === 2 && jump <= 0) {   // atterraggio
    leapState = 3; leapEndT = elapsed + 2.6;
    const m = Math.round(leapDist * 10) / 10, upright = Math.abs(leapPitch) < .5 + up.wings * .03, clear = Math.abs(px - leapFree) < .6 + up.wings * .06;
    if (upright && clear && crash <= 0) {
      leapBest = m; run.leap = m;
      reward(Math.round(m * 120) + (leapPerfect ? 1500 : 0), `IN PIEDI! ${m.toFixed(1).replace('.', ',')} m`, 'perfect');
      shake = Math.min(1.4, .45 + m / 70); A.sfx.land(); mud(Math.min(.8, .2 + m / 150)); if (navigator.vibrate) try { buzz(Math.min(120, 30 + m)); } catch {}   // v86 · più lungo il volo, più botta all'atterraggio
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
    if (gevZ < -6 && course > 2 && course < GAME_LENGTH * .95) { gevThrowNow(); gevThrow = Math.max(2.3, 3.6 - course * .012 - diff * .25) + rng() * 1.3; }
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
  const thrown = { l: 1 + gevSide * 2.15, z: zJ, type, hit: false, fly: .9, flyT: .9, l0: 1 + gevSide * 2.15, lT: target, z0: zJ, zT, lift: 1.5 };
  objects.push(thrown, { l: target, z: zT, type: 'gevmark', hit: false, of: thrown });   // v89 · cerchio rosso a terra dove cadrà l'oggetto
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
  // v107.4 · derby del giorno: i due piloti del derby sono sempre tra i compagni (senza toccare il caso, così la sfida del giorno resta uguale per tutti)
  const dz = P.MODES[mode].leap || duel?.racing ? [] : derbyPair().filter(n => n !== profile.rider);
  dz.forEach((n, k) => { const j = others.indexOf(n); if (j >= 0) others.splice(j, 1); others.splice(1 + k, 0, n); });
  others.length = 3;
  const starts = [-7, 26, 58], lvSoft = P.levelInfo().level <= 2 ? .955 : P.levelInfo().level <= 4 ? .98 : 1, skills = [1.09, 1.04, .99].map(k => k * lvSoft);   // v81 · ai primi livelli i compagni vanno un filo più piano   // v48 · un filo più forti (salite più dure anche per loro)
  rivals = P.MODES[mode].leap ? [] : others.map((name, i) => ({ name, gap: starts[i], lane: [2, 0, 2][i], lx: [2, 0, 2][i], skill: skills[i] + (rng() - .5) * .05, ahead: starts[i] > 0, laneT: 2 + rng() * 3, livery: RIVAL_LIVERIES[(i + Math.floor(rng() * 5)) % 5], number: RIDERS.indexOf(name) + 1, lean: 0 }));
  for (const r of rivals) if (dz.includes(r.name)) r.derby = true;
  for (const r of rivals) if (r.name === 'Maggie') r.livery = { plastic: '#f3a6c6', accent: '#5a3426', jersey: '#f4f1ec', pants: '#6b4030', helmet: '#f3a6c6' };   // v107.5 · Maggie con la sua tuta bianca, marrone e rosa
  { const ch = champRival(); for (const r of rivals) if (r.name === ch) { r.champ = true; r.livery = { ...r.livery, helmet: '#e3b021' }; } }   // v107.3 · il pilota del campione della settimana corre col casco d'oro
  coachStep = 0; tut = null; tutPulse(null); coachOn = ice ? !P.profile.iceTutorial52 : !P.profile.tutorialDone; $('coach')?.classList.remove('show');
  lastSuka = -99; shortcutsDone = 0; nextShortcut = 14 + rng() * 8; shownPos = '';
  // Meteo: un cambio a metà giro (pioggia, nebbia o tramonto), diverso a ogni gara; la Sfida del giorno è uguale per tutti.
  const kinds = ['rain', 'fog', 'dusk'], k = kinds[Math.floor(rng() * 3)];
  const at = 14 + rng() * 14;
  weatherPlan = [{ kind: k, from: at, to: at + 16 + rng() * 8 }];
  if (mode === 5) weatherPlan.push({ kind: 'rain', from: 6, to: 22 });        // il pantano: piove sempre un po'
  if (mode === 2 || mode === 8) weatherPlan.push({ kind: 'dusk', from: 30, to: 999 }); // Angelo e Morte: arriva il buio
  if (P.MODES[mode].rainy) weatherPlan = [{ kind: 'rain', from: 0, to: 999 }, { kind: 'fog', from: 20 + rng() * 15, to: 45 + rng() * 10 }];
  if (rule('rain')) weatherPlan = [{ kind: 'rain', from: 0, to: 999 }];
  if (rule('fog')) weatherPlan = [{ kind: 'fog', from: 0, to: 999 }];
  if (feat('night')) weatherPlan.push({ kind: 'night', from: 0, to: 999 });   // v84 · MotoFogna (e la notturna del giorno)
  // v97 · ora e meteo diversi a ogni giro: tramonto o nebbia del mattino a caso, così lo stesso percorso cambia faccia
  timeOfDay = '';
  if (!P.MODES[mode].ice && !P.MODES[mode].leap && !feat('night') && !P.MODES[mode].rainy && mode !== 3 && !weatherPlan.length) {
    const r = rng();
    if (r < .22) { weatherPlan.push({ kind: 'dusk', from: 0, to: 999 }); timeOfDay = '🌅 GIRO AL TRAMONTO'; }
    else if (r < .38) { weatherPlan.push({ kind: 'fog', from: 0, to: 12 + rng() * 10 }); timeOfDay = '🌫 NEBBIA DEL MATTINO'; }
  }
  if (rule('noturbo')) rivals.forEach(r => r.skill *= .96);
  if (ice) {
    // sul ghiaccio niente pioggia: al massimo nebbia o il sole che cala dietro al lago
    weatherPlan = [{ kind: rng() < .5 ? 'fog' : 'dusk', from: at, to: at + 18 }];
    const targets = [23000, 18400, 14200];   // v88 · curvoni a U: si derapa di più, anche i compagni   // v50 · guida libera: ≈ 9.000 · 6.800 · 4.800 punti a fine gara
    rivals.forEach((r, i) => { r.drift = 0; r.dTarget = targets[i] * (.92 + rng() * .16); r.driftAhead = false; r.slip = 3 + rng() * 6; });
  }
  runPlan = makeRunPlan();
  weather = { rain: 0, fog: 0, dusk: 0, night: 0, flash: 0, lamp: feat('frontali') ? 1 : 0 }; weatherSaid = ''; nextFlash = 4 + rng() * 4;
  for (const w of weatherPlan) if (w.from === 0 && w.kind !== 'dusk') weather[w.kind] = 1;   // v84 · meteo da inizio gara: già pieno al via
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
    if (r.duel) continue;   // v68 · l'avversario dal vivo si muove da solo
    // ritmo del compagno: segue la pendenza come te (sempre col gas aperto), con un "elastico" per restare in gara
    const rr = routeAt(course, (roadTime * 19.5) + r.gap);
    let pace = paceFor(rr, true, 0, 0) * r.skill * (1 - rr.rough * .06);
    if (r.gap > 70) pace *= .85; else if (r.gap > 40) pace *= .92; else if (r.gap < -30) pace *= 1.25;   // v107 · se ti staccano troppo rallentano prima: resti in gara
    // v45 · anche i compagni danno gas: ogni tanto uno scatto di turbo
    r.turboT = (r.turboT ?? 6 + rng() * 10) - dt;
    if (r.turboT < 0) { pace *= 1.3; if (r.turboT < -2.5) r.turboT = 8 + rng() * 10; }
    if (elapsed < 2.5) pace *= .9 + elapsed * .04;
    const prev = r.gap;
    if (tut && tut.r !== r) { r.gap += 0; continue; }   // v107.2 · durante il giro guidato i compagni ti aspettano
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
      if (ahead && !r.driftAhead && elapsed > 3) { pop(r.name.toUpperCase() + (r.name === 'Maggie' ? ': CHE CAPRA! PIÙ TRAVERSO DI TE' : ': SUUUKA! PIÙ TRAVERSO DI TE'), 'white'); rivalSay(r); }
      else if (!ahead && r.driftAhead) { pop('PIÙ DERAPATE DI ' + r.name.toUpperCase() + '!', 'gold'); A.sfx.near(); run.passes = (run.passes || 0) + 1; }
      r.driftAhead = ahead;
      continue;
    }
    // sorpassi
    if (prev < 0 && r.gap >= 0) { // ti passa lui
      pop(r.name.toUpperCase() + (r.name === 'Maggie' ? ': CHE CAPRA!' : ': SUUUKA!'), 'white'); rivalSay(r); if (r.name !== 'Maggie') suuka();
      if (r.champ && !r.champSaid1) { r.champSaid1 = 1; setTimeout(() => toast('👑 ' + rpick(CHAMP_PASS_ME).replace('{n}', r.name.toUpperCase()), 'gold'), 900); }
    } else if (prev > 0 && r.gap <= 0) { // lo passi tu
      if (r.champ && !r.champSaid2) { r.champSaid2 = 1; run.champPass = 1; setTimeout(() => toast('👑 ' + rpick(CHAMP_PASSED).replace('{n}', r.name.toUpperCase()), 'green'), 700); }
      const sc = elapsed - lastDraftAt < 1.2, scv = has('slip') ? 600 : 400; score += sc ? scv : 250; run.passes = (run.passes || 0) + 1; if (sc) run.draftPasses = (run.draftPasses || 0) + 1; pop(sc ? '⚡ SORPASSO IN SCIA SU ' + r.name.toUpperCase() + ' +' + scv : 'SORPASSO SU ' + r.name.toUpperCase() + ' +250', 'gold'); markHighlight(sc ? 'SORPASSO IN SCIA SU ' + r.name.toUpperCase() : 'SORPASSO SU ' + r.name.toUpperCase(), sc ? 1300 : 800); A.sfx.near(); if (sc) buzz([10, 30, 10]);
    }
  }
}
function setupGroupGhost() {
  gGhost = null; gGhostPassed = false;
  if (ice || P.MODES[mode].random === 'run' || P.MODES[mode].leap) return;
  const bl = C.cached()?.boards?.[mode] || [];
  const want = ghostWant && ghostWant.m === mode ? bl.find(e => e.g && e.g.length > 8 && e.n.toLowerCase() === ghostWant.n.toLowerCase()) : null;   // v106.5 · sfida da link
  const top = want || bl.find(e => e.g && e.g.length > 8);
  if (!top) return;
  const pts = C.decodeGhost(top.g); if (pts.length < 5) return;
  gGhost = { name: top.n, pts, rider: top.r, time: top.bt || top.t || 0, entry: { name: '👻 ' + top.n.toUpperCase(), ghost: true, gap: 0, lane: 1, lx: 1, lean: 0, number: Math.max(1, RIDERS.indexOf(top.r) + 1), livery: { plastic: '#f2c230', accent: '#ffffff', jersey: '#f2c230', pants: '#202020', helmet: '#ffffff' } } };
  if (gGhost) gGhost.challenge = !!want;
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
  e.lx = 1 + Math.sin(elapsed * .3 + 1) * .7; e.lean = (e.lx - before) * 60;
  // v97 · distacco in secondi dal fantasma: quando lui era nel punto dove sei tu adesso
  { const p = gGhost.pts; let a = 0; while (a < p.length - 1 && p[a + 1] < course) a++;
    const tg = a >= p.length - 1 ? p.length - 1 : a + Math.max(0, Math.min(1, (course - p[a]) / Math.max(.001, p[a + 1] - p[a])));
    const gap = elapsed - tg, ch = $('ghostchip');
    if (elapsed > 1.5) { ch.hidden = false; ch.className = 'ghostchip ' + (gap > 0 ? 'behind' : 'ahead'); ch.innerHTML = `👻 ${gGhost.name.toUpperCase()}<b>${gap > 0 ? '+' : '−'}${Math.abs(gap).toFixed(1).replace('.', ',')} s</b>`; } }
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
  const mp = driftMP; driftMP = 0;
  driftT = driftSum = driftPend = 0; driftGap = 0;
  if (ok) { driftM += mp; run.driftM = driftM; }
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
  { const ahead = iceBend(roadTime * 19.5 + 40); if (Math.abs(ahead) > 1.45 && elapsed - (run.uCallAt ?? -99) > 6) { run.uCallAt = elapsed; bigCall('TORNANTE A ' + (ahead > 0 ? 'SINISTRA' : 'DESTRA') + '!'); toast('↩ CURVONE A U: ENTRA DI TRAVERSO E TIENI IL GAS', 'blue'); } }   // v88
  if (gas && jump <= 0 && crash <= 0) throttleSlip = Math.min(1, throttleSlip + dt * (.9 + (bs.drift || 0) * .3) * (turbo > 0 ? 1.6 : 1));   // v106.3 · col turbo traverso la ruota parte prima
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
  // v106.2 · cuscino di neve: vicino al bordo la neve frena e rimanda verso il centro (il muro vero arriva solo se insisti)
  { const edge = px < -.16 ? px + .16 : px > 2.16 ? px - 2.16 : 0;
    if (edge) { vx -= edge * 20 * dt; vx *= 1 - Math.min(.5, 1.6 * dt); snowT = Math.max(snowT, .12); throttleSlip *= 1 - Math.min(.5, 2 * dt);   /* nella neve morbida niente punti derapata */ if (elapsed - lastWall > 1.2 && elapsed - (run.edgeWarn ?? -9) > 1.6) { run.edgeWarn = elapsed; pop('❄ BORDO! CONTROSTERZA', 'small'); if (touchDevice && navigator.vibrate) try { buzz(10); } catch {} } } }
  scrubCheck(Math.abs(st) > .3 ? Math.sign(st) : 0);
  // muro di neve ai bordi: si rimbalza, si rallenta e la derapata va persa
  if (px < -.42 || px > 2.42) {
    px = Math.max(-.42, Math.min(2.42, px)); vx = -vx * .25; snowT = .7 * (1 - up.damper * .08); throttleSlip *= .3;
    if (elapsed - lastWall > .8) { lastWall = elapsed; endDrift(false); fxKind = 'snow'; fxSerial++; shake = Math.max(shake, .45); A.sfx.splash(); toast('❄ NEL MURO DI NEVE!', 'blue'); mistake(); if (navigator.vibrate) try { buzz(40); } catch {} }
  }
  // testacoda: troppo di traverso troppo a lungo
  if (Math.abs(drift) > .88 + grip * .06 + up.damper * .03 + Math.max(0, Math.abs(bendNow) - .8) * .35 && jump <= 0 && turbo <= 0) overT += dt; else overT = Math.max(0, overT - dt * 2);
  if (overT > .62) {   // v106.2 · un filo più di margine prima del testacoda (il pulsante avvisa: TROPPO! MOLLA)
    overT = 0; endDrift(false); throttleSlip = 0; drift *= .2; stun = .6; snowT = .4; shake = Math.max(shake, .6);
    fxKind = 'snow'; fxSerial++; A.sfx.hit(); toast('🌀 TESTACODA! MOLLA UN PO’ IL GAS', 'red'); mistake();
    if (navigator.vibrate) try { buzz([30, 40, 30]); } catch {}
  }
  const q = Math.abs(drift), sweet = q >= .3 && q <= .62;
  const active = jump <= 0 && crash <= 0 && snowT <= 0 && q > .2 && throttleSlip > .2 && speedNow > .45;   // senza gas non è derapata
  if (active) {
    if (driftT === 0) A.sfx.scrub();
    driftT += dt; driftSum += q * dt; if (q >= .3) driftMP += dt * kmh * 1.45 / 3.6;   // contano solo i metri fatti davvero di traverso (e solo se la derapata va a buon fine)
    const uTurn = Math.abs(bendNow) > 1.2;   // v106.2 · nei tornanti a U la derapata vale una volta e mezza
    if (uTurn && elapsed - (run.uZoneAt ?? -9) > 4) { run.uZoneAt = elapsed; pop('🔥 TORNANTE ×1,5', 'gold'); }
    driftPend += dt * Math.min(q, .7) * 260 * speedNow * driftMult() * (1 + (bs.drift || 0) * .3) * (sweet ? 1.25 : q > .7 ? .7 : 1) * (uTurn ? 1.5 : 1) * (turbo > 0 ? 2 : 1);
    driftGap = 0;
    if (sweet && !wasSweet && touchDevice && navigator.vibrate) try { buzz(6); } catch {}
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
// v84 · sosta al bar: si passa sotto il tendone, birra al volo e punti, ma per qualche secondo la moto balla
function spawnBar() {
  const l = rng() < .5 ? 0 : 2;
  objects.push({ l, z: -.05, type: 'bar', hit: false });
  toast('🍺 BAR A ' + (l === 0 ? 'SINISTRA' : 'DESTRA') + ': PASSA SOTTO PER UNA BIONDA', 'gold');
}
function takeBar() {
  barT = 4.5; run.caps += 5; run.bars = (run.bars || 0) + 1;
  A.sfx.beer(); reward(500, 'SOSTA AL BAR!', 'trick', false);
  flash('gold'); bigCall('🍺 ALLA SALUTE!');
  setTimeout(() => { if (state === 'playing') toast('🥴 OCCHIO: LA MOTO BALLA UN PO’', 'gold'); }, 700);
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
const WEATHER_MSG = { rain: '🌧 ARRIVA LA PIOGGIA! FANGO OVUNQUE', fog: '🌫 NEBBIA IN QUOTA! OCCHI APERTI', dusk: '🌇 SI FA SERA… ACCENDI IL CERVELLO', night: '🌑 NOTTE FONDA: SI VEDE SOLO COL FARO' };
function updateWeather(dt) {
  const target = { rain: 0, fog: 0, dusk: 0, night: 0 };
  for (const w of weatherPlan) if (elapsed >= w.from && elapsed < w.to) {
    target[w.kind] = Math.max(target[w.kind], w.kind === 'dusk' ? Math.min(1, (elapsed - w.from) / 20) : 1);
    if (weatherSaid !== w.kind + w.from) { weatherSaid = w.kind + w.from; toast(WEATHER_MSG[w.kind], w.kind === 'rain' ? 'blue' : 'gold'); }
  }
  for (const w of weatherPlan) {   // v104 · il meteo si annuncia prima e si saluta quando passa
    if (w.kind === 'rain' && w.from > 2 && !w.warned && elapsed >= w.from - 3 && elapsed < w.from) { w.warned = 1; toast('⛈ TEMPORALE IN ARRIVO: SI SENTE TUONARE', 'blue'); A.sfx.thunder?.(); }
    if ((w.kind === 'rain' || w.kind === 'fog') && w.to < 900 && !w.cleared && elapsed >= w.to && elapsed - w.to < 2) { w.cleared = 1; toast(w.kind === 'rain' ? '☀ SCHIARITA! MA IL FANGO RESTA' : '☀ LA NEBBIA SI ALZA', 'gold'); }
  }
  for (const k of ['rain', 'fog', 'dusk', 'night']) weather[k] += (target[k] - weather[k]) * Math.min(1, dt * .5);
  // v84 · fulmini nel buio: lampo che illumina tutto e tuono subito dopo
  weather.flash = Math.max(0, weather.flash - dt * (3 - up.eyes * .3));
  if (weather.night > .5 && weather.rain > .3) { nextFlash -= dt; if (nextFlash <= 0) { nextFlash = 6 + Math.random() * 5; weather.flash = 1; setTimeout(() => { if (weather.flash < .5) weather.flash = .6; }, 120); setTimeout(() => A.sfx.thunder?.(), 500 + Math.random() * 600); } }
  // sotto la pioggia ogni tanto arriva uno schizzo sull'obiettivo
  if (weather.rain > .5 && weather.night < .5 && elapsed - lastRainMud > 5 + Math.random() * 4) { lastRainMud = elapsed; mud(.22); }
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
  state = 'playing'; (A.setEngineProfile(P.currentBike().id), A.engineStart()); startMusic(); if (touchDevice) goFull();
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
// v107.2 · PRIMO GIRO GUIDATO: ogni passo aspetta che tu faccia la mossa; il gioco prepara la situazione e il cronometro resta fermo
let tut = null;
function tutSay(html, hold = true) {
  const el = $('coach'); el.innerHTML = html; el.classList.remove('show', 'hold'); void el.offsetWidth; el.classList.add(hold ? 'hold' : 'show');
}
function tutPulse(id) { for (const b of ['jump', 'boost', 'left', 'right']) $(b)?.classList.toggle('tutpulse', b === id || (id === 'steer' && (b === 'left' || b === 'right'))); }
function tutStart() {
  tut = { step: 0, t: 0, px0: px, tries: 0, log: null, jumps0: run.jumps };
  objects = objects.filter(o => OBSTACLE_HEIGHT[o.type] === undefined && o.type !== 'tree');   // pista pulita per le prove
  tutSay(`<b class="tstep">1/4</b> ${icon('chevrons')} ${touchDevice ? 'STERZA: TIENI IL DITO A SINISTRA O A DESTRA' : 'STERZA CON LE FRECCE ← →'}`); tutPulse('steer');
}
function tutEnd() {
  tut = null; tutPulse(null); coachOn = false; P.profile.tutorialDone = true; P.save();
  tutSay(`${icon('flag')} SEI PRONTO! ADESSO È GARA VERA`, false); A.sfx.mission?.();
}
function tutUpdate(dt) {
  const T = tut; T.t += dt; timeLimit += dt;   // il giro guidato non consuma il tempo
  if (T.step === 0) {
    if ((Math.abs(px - T.px0) > .8 && T.t > 2) || T.t > 8) { T.step = 1; T.t = 0; tutSay(`<b class="tstep">2/4</b> ${icon('log')} TRONCO IN ARRIVO: ${touchDevice ? 'TOCCA SALTA' : 'PREMI SPAZIO'} QUANDO TI ARRIVA SOTTO`); tutPulse('jump'); }
  } else if (T.step === 1) {
    if (!T.log) { T.log = { l: Math.round(px), z: -.05, type: 'log', hit: false }; objects.push(T.log); T.jumps0 = run.jumps; }
    else if (T.log.z > .86 && run.jumps === T.jumps0 && jump <= 0 && !T.miss) { invincible = Math.max(invincible, .5); T.miss = true; }   // mancato: niente botta, si riprova
    else if (T.log.z > 1 || T.log.collected || T.log.hit && T.log.z > .95) {
      if (run.jumps > T.jumps0) { T.step = 2; T.t = 0; reward(100, 'BRAVO!', 'trick', false); tutPulse(null);
        const r = [...rivals].filter(r => !r.duel).sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))[0];
        if (r) { r.gap = 11; r.lane = Math.round(px); r.lx = r.lane; r.laneT = 9; T.r = r; tutSay(`<b class="tstep">3/4</b> ${icon('bolt')} METTITI DIETRO ${/^[AEIOU]/i.test(r.name) ? 'AD' : 'A'} ${r.name.toUpperCase()}, NELLA SUA CORSIA: PRENDI LA SCIA`); }
        else { T.step = 3; }
      } else { T.log = null; T.miss = false; T.tries++; tutSay(`<b class="tstep">2/4</b> ${icon('log')} RIPROVA: ${touchDevice ? 'TOCCA SALTA' : 'PREMI SPAZIO'} UN ATTIMO PRIMA DEL TRONCO`); if (T.tries > 2) { T.step = 2; T.t = 9; } }
    }
  } else if (T.step === 2) {
    if (T.r) { T.r.laneT = Math.max(T.r.laneT, 2); if (T.r.gap < 6) T.r.gap += dt * 6; }   // il compagno ti aspetta finché non sei in scia
    if (draftT > .6 && !T.inDraft) { T.inDraft = true; T.t = 0; tutSay(`<b class="tstep">3/4</b> ${icon('bolt')} SEI IN SCIA: VAI PIÙ FORTE!`); }
    if ((T.inDraft && T.t > 2.4) || T.t > 12) { T.step = 3; T.t = 0; }
  } else if (T.step === 3) {
    if (T.t < .1) { charge = 100; tutSay(`<b class="tstep">4/4</b> ${icon('rocket')} TURBO PIENO: ${touchDevice ? 'TOCCA TURBO' : 'PREMI B'}`); tutPulse('boost'); }
    if ((turbo > 0 && T.t > 1.2) || T.t > 10) tutEnd();
  }
}
function coachUpdate() {
  if (!coachOn) return;
  if (!ice && !leap && !duel?.racing) { if (!tut && elapsed > .8) tutStart(); if (tut) tutUpdate(lastDt); return; }
  const list = ice ? ICE_COACH() : COACH();
  if (coachStep < list.length && elapsed >= list[coachStep][0]) {
    const el = $('coach'); el.innerHTML = list[coachStep][1].replace('<br>', ' '); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    coachStep++;
    if (coachStep >= list.length) { coachOn = false; if (ice) P.profile.iceTutorial52 = true; else P.profile.tutorialDone = true; P.save(); }
  }
}

// ---------- Ciclo di gioco ----------
let lastDt = 1 / 60;
function update(dt) {
  lastDt = dt;
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
  if (runPlan?.gold?.length && course >= runPlan.gold[0].at && !duel) { const g = runPlan.gold.shift(); objects.push({ l: g.l, z: .02, type: 'goldMug', hit: false, gi: g.i, air: g.kind === 'air', lift: g.kind === 'air' ? 1.65 : .35 }); }
  // Rallentatore breve su salti perfetti e cadute.
  if (slowmo > 0) { slowmo -= dt; dt *= slowScale; }
  const diff = P.MODES[mode].difficulty;
  elapsed = Math.min(timeLimit, elapsed + dt);
  turbo = Math.max(0, turbo - dt); wet = Math.max(0, wet - dt); magnet = Math.max(0, magnet - dt);
  { const sf = speedFx || (speedFx = $('speedfx')); const on = turbo > 0 || grappa > 0; if (sf && sf.classList.contains('on') !== on) sf.classList.toggle('on', on); }   // v104 · scie di velocità col turbo
  // v81 · insegna il turbo: chi non lo usa arriva ultimo senza capire perché
  if (charge >= 100 && turbo <= 0 && state === 'playing' && !(leap && leapState >= 2)) {
    turboReadyT += dt;
    if (turboReadyT < dt * 1.5 && (P.profile.turboTaught || 0) < 3) { P.profile.turboTaught = (P.profile.turboTaught || 0) + 1; P.save(); bigCall('TURBO PRONTO!'); toast(ice ? '⚡ TURBO TRAVERSO PRONTO: DERAPATE ×2 PER QUALCHE SECONDO' : touchDevice ? '⚡ TOCCA IL PULSANTE TURBO: VAI IL DOPPIO PIÙ FORTE' : '⚡ TURBO PRONTO: TASTO B, ROTELLINA O PULSANTE TURBO', 'gold'); }
    if (turboReadyT > 6 && !run.turboNag && !leap) { run.turboNag = 1; toast('⚡ IL TURBO È CARICO: USALO, I COMPAGNI LO FANNO!', 'gold'); }
  } else turboReadyT = 0;
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
  // v84 · trazione (Dopo migliora): gas sempre aperto = la ruota pattina; poco gas = ti pianti; giusto = vai più forte
  let tractMul = 1;
  tractOn = feat('traction') && (route.climb > .3 || route.grade > .04) && !leap;
  if (tractOn && !wasTract) objects = objects.filter(o => o.z > .75 || o.type === 'coin' || o.type === 'farm' || o.type === 'goldMug');   // v85 · inizio salita: pista sgombra
  wasTract = tractOn;
  if (tractOn && !run.tractHint) { run.tractHint = 1; bigCall('SALITA: DOSA IL GAS!'); toast('⛽ APRI E CHIUDI IL GAS: TIENI LA LANCETTA NEL VERDE', 'gold'); }
  if (tractOn && !stalled) {
    grip = Math.max(0, Math.min(1, grip + (gas ? .36 : -.6) * dt));
    if (grip > .94) { tractMul = .72; if (elapsed - spinMsgAt > 2.5) { spinMsgAt = elapsed; toast('🔥 PATTINA! MOLLA UN FILO IL GAS', 'red'); } }
    else if (grip < .12 - up.ecu * .015) { tractMul = .45; stallT += dt; if (stallT > 2.2 + up.ecu * .15) { stalled = true; pushP = 0; breakCombo(); bigCall('SPINGI! DOPO MIGLIORA!'); toast('👆 PIANTATO! TOCCA PIÙ VOLTE GAS O SALTA PER SPINGERE', 'gold'); } }
    else { stallT = 0; if (grip >= .28 - up.ecu * .03 && grip <= .84 + up.ecu * .03) { tractMul = 1.08; score += dt * 40; } }
  } else if (!tractOn) { grip += (.5 - grip) * Math.min(1, dt * 2); stallT = 0; stalled = false; }
  if (stalled) tractMul = .04;
  // v106.7 · Desertone: sulle dune senza gas la moto affonda e si pianta; con la gomma a terra si sta fermi a ripararla
  if (desert && state === 'playing') {
    const dune = route.climb > .3 || route.grade > .03;
    if (dune && !run.duneHint) { run.duneHint = 1; bigCall('DUNA: GAS APERTO!'); toast('🏜 SULLE DUNE TIENI IL GAS (TOCCA GAS PER BLOCCARLO) O TI INSABBI', 'gold'); }
    if (dune && !gas && !sandStuck && jump <= 0 && turbo <= 0) sandT += dt; else sandT = Math.max(0, sandT - dt * 1.5);
    if (sandT > .15 && !sandStuck) tractMul *= Math.max(.3, 1 - sandT * .5);
    if (sandT > 1.5 && !sandStuck) { sandStuck = true; pushP = 0; breakCombo(); A.sfx.splash(); bigCall('INSABBIATO!'); toast('👆 TOCCA SALTA PER SPINGERE FUORI LA MOTO', 'gold'); buzz(60); }
    if (sandStuck) tractMul = .03;
    if (flat) tractMul = 0;
  }
  if (rule('noturbo')) charge = 0;
  if (barT > 0) barT = Math.max(0, barT - dt);
  if (has('sprint') && course > GAME_LENGTH * .75 && !run.sprintCall && state === 'playing') { run.sprintCall = 1; bigCall('SPRINT FINALE!'); toast('⚡ ULTIMO QUARTO: +10% VELOCITÀ E PUNTI DOPPI', 'gold'); A.sfx.turbo(); A.sayRider?.('maggie_sprint'); }   // v96
  // v107 · SCIA: stai dietro a un compagno, nella sua corsia, e vai più forte (poi lo passi)
  { let dr = null;
    if (!ice && !leap && crash <= 0) for (const r of rivals) if (r.gap > 2.5 && r.gap < (has('slip') ? 26 : 17) && Math.abs(r.lx - px) < (has('slip') ? .8 : .55)) { dr = r; break; }
    draftT = dr ? draftT + dt : Math.max(0, draftT - dt * 2.5); if (dr) draftR = dr;
    if (draftT > .5) { lastDraftAt = elapsed; if (elapsed - draftSaid > 6) { draftSaid = elapsed; pop('⚡ IN SCIA A ' + draftR.name.toUpperCase() + '!', 'white'); buzz(10); } }
    // v107 · RIMONTA: ultimo e staccato (dopo una botta) = un filo di spinta per rientrare in gara
    const ahead = rivals.filter(r => r.gap > 0 && !r.duel), far = !ice && !leap && rivals.length && ahead.length === rivals.length && Math.min(...ahead.map(r => r.gap)) > 30;
    catchT = far ? Math.min(1, catchT + dt * .5) : Math.max(0, catchT - dt); }
  const speedT = (draftT > .5 ? (has('slip') ? 1.1 : 1.07) : 1) * (1 + catchT * .05) * tractMul * paceFor(route, gas || has('climb'), ice ? 0 : turbo, has('amphibious') ? 0 : wet) * (has('downhill') ? 1 + route.down * .25 : 1) * (has('mule') ? 1 + route.rough * .08 : 1) * (stun > 0 ? .45 : 1) * (waterT > 0 ? .62 : 1) * (wheelie ? 1.08 : 1) * (has('rocket') && elapsed < 8 ? 1.1 : 1) * (has('sprint') && course > GAME_LENGTH * .75 ? 1.1 : 1) * (snowT > 0 ? .62 : 1) * (edgeT > 0 ? .85 : 1) * (cornerLine > 0 ? 1.07 : cornerLine < 0 ? .93 : 1) * (leap ? leapMul * (leapState >= 2 ? .42 : 1) : 1);   // v62 · Taglio di Angelo: la discesa ti fa prendere velocità
  // Discesa: "Campa giù!"
  if (route.down > .45 && !downAnnounced) { downAnnounced = true; if (profile.rider === 'Mirco') riderLine('start'); else A.say('campa'); bigCall('CAMPA GIÙ!'); }
  if (route.down < .15) downAnnounced = false;
  // v105.4 · la moto ha massa: col gas prende velocità in un attimo ma non di colpo, mollando rallenta gradualmente; i colpi frenano subito
  if (leap || stun > 0 || waterT > 0 || snowT > 0) speedSm = Math.min(speedSm, speedT);
  speedSm += (speedT - speedSm) * Math.min(1, dt * (speedT > speedSm ? 2.2 : 3.2));
  if (leap) speedSm = speedT;
  const speed = speedSm;
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
  const travelStep = leap && leapState === 2 ? dt * leapV : dt * (1.1 + diff * .35 + elapsed / 118) * speed * 19.5 * (1 - route.rough * .06) * (1 + up.engine * .025) * (1 + (bs.speed || 0)) * (1 + (bs.climb || 0) * Math.max(0, route.grade));
  roadTime += travelStep / 19.5;
  if (leap && leapState < 2 && dt > 0) leapZRate = travelStep / 55 / dt;
  course = Math.min(GAME_LENGTH, roadTime / courseLength(diff) * GAME_LENGTH);
  kmh = Math.round(travelStep / dt / 19.5 * 31);
  if (leap && leapState === 2) kmh = Math.round(leapStartKmh);   // v64 · in volo il mondo scorre più piano (si vede l'atterraggio), la velocità resta quella dello stacco
  updateRivals(dt, travelStep, route, diff);
  updateWeather(dt);
  updateGroupGhost();
  updateDuel(dt);
  // v105.5 · salite più semplici: all'inizio di ogni salita il gas si apre da solo (resta il tasto per mollarlo);
  // al Dopo migliora la trazione resta da dosare, ma con una zona verde più larga e la ruota che risponde più piano
  { const climbNow = state === 'playing' && !ice && !feat('traction') && (route.climb > .05 || route.rough > .05);
    if (climbNow && !wasClimb && !gasLock && !gasDownAt) { gasLock = true; gas = true; noClimbT = 0; if (!run.autoGasHint) { run.autoGasHint = 1; toast('⛽ IN SALITA IL GAS VA DA SOLO · TOCCA PER MOLLARE', 'green'); } }
    wasClimb = climbNow; }
  if (gasLock) { noClimbT = route.climb > .05 || route.rough > .05 ? 0 : noClimbT + dt; if (noClimbT > 2.5) { gasLock = false; if (!gasDownAt) gas = false; } }
  coachUpdate();
  if (gev) gevStep(dt, diff);
  if (leap) { leapStep(dt); if (state !== 'playing') return; }
  if (!ice && !P.MODES[mode].slalom && !P.MODES[mode].ranch && !P.MODES[mode].leap && shortcutsDone < 2 && elapsed > nextShortcut && course > 12 && !objects.some(o => o.type === 'bar' && !o.hit) && course < GAME_LENGTH * .8 && route.id !== 3) { nextShortcut = elapsed + 18 + rng() * 10; spawnShortcut(); }
  if (barsLeft > 0 && !leap && elapsed > nextBar && course > 10 && course < GAME_LENGTH * .85 && !objects.some(o => o.type === 'shortcut' && !o.hit)) { barsLeft--; nextBar = elapsed + 16 + rng() * 6; spawnBar(); }
  while (elapsed >= ghostNextSplit) { ghostSplits.push(course); ghostNextSplit += .5; }
  const gc = ghostCourse(elapsed);
  if (gc !== null && !ghostPassed && elapsed > 3 && course > gc + .4) { ghostPassed = true; pop('👻 SUPERATO IL FANTASMA!', 'white'); }
  if (gc !== null && ghostPassed && course < gc - 1.5) ghostPassed = false;
  if (!warned && timeLimit - elapsed <= 10) { warned = true; toast('ULTIMI 10 SECONDI! DAI GAS!', 'red'); voice('Dai gas Ciccio!'); }
  comboTime = Math.max(0, comboTime - dt);
  if (comboTime === 0) combo = 0;

  // Spostamento laterale a molla: la moto accelera, piega e si raddrizza in modo naturale.
  const kLat = (118 - route.rough * 32) * (touchDevice ? 1.35 : 1) * (1 - weather.rain * .18) * (1 + up.tyres * .08) * (1 + (bs.steer || 0)) * (has('mule') && route.rough > .4 ? 1.35 : 1) * (has('nimble') ? 1.25 : 1), cLat = 2 * Math.sqrt(kLat) * .9;
  if (ice) iceStep(dt);
  else steerStep(dt, route);
  { const ts = P.MODES[mode].ranch ? null : trackShape(mode, variantOf(mode), courseLength(P.MODES[mode].difficulty) * 19.5), ahead = P.MODES[mode].ranch ? ranchBend(roadTime * 19.5 + 45) : ts ? ts.bend(roadTime * 19.5 + 45) : 0;   // v103 · tornanti annunciati su tutti i tracciati veri
    if (Math.abs(ahead) > 1.45 && elapsed - (run.uCallAt ?? -99) > 5) { run.uCallAt = elapsed; bigCall(P.MODES[mode].ranch ? 'TORNANTE A ' + (ahead < 0 ? 'DESTRA' : 'SINISTRA') + '!' : 'TORNANTE ' + (ahead < 0 ? 'A DESTRA!' : 'A SINISTRA!')); if (!run.cordaHint || P.MODES[mode].ranch) { run.cordaHint = 1; toast((ahead < 0 ? '↱' : '↰') + ' STAI ALL’INTERNO: LA CORDA È PIÙ VELOCE', 'blue'); } } }   // v102 · l'anello dei tornanti
  { const nl = Math.max(0, Math.min(2, Math.round(px))); if (nl !== lane) { lane = nl; A.sfx.lane(lane); } }
  const wasAirborne = jump > 0;
  jump = Math.max(0, jump - dt);
  if (wasAirborne && jump === 0) {
    springVelocity = 95; A.sfx.land(); shake = Math.max(shake, .25); if (touchDevice && navigator.vibrate) try { buzz(12); } catch {}
    if (jumpBuffer > 0) { jumpBuffer = 0; takeoff(); }
  }
  const bump = jump > 0 ? 0 : Math.sin(roadTime * 27) * (18 + route.rough * 40);
  // v106.2 · sui sassi, nel fango e in derapata il telefono "trema" piano col terreno
  { const rr = ice ? (driftT > 0 ? .55 : 0) : Math.max(route.rough, route.wet * .5, wet > 0 ? .6 : 0); rumbleT -= dt;
    if (rr > .25 && jump <= 0 && crash <= 0 && speed > .3 && rumbleT <= 0) { rumbleT = .42 - rr * .15; buzz(10 + rr * 10); } }
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
    spawn = ice ? 2.2 - Math.min(.5, course * .006) : P.MODES[mode].slalom ? Math.max(.72, 1.0 - course * .004) : Math.max(.95, (1.8 - diff * .16 - course * .002) * (route.id === 3 ? .8 : 1));
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
    if (o.type === 'gevmark' && o.of) { o.z = o.of.zT; if (!o.of.fly) o.collected = true; }
    if (o.type === 'trincia' && !o.sprayed && o.z > .8 && Math.abs(px - o.l) < 1.5) { o.sprayed = 1; mud(.3); }   // v81 · la trincia spara erba e terra
    if (o.hit || o.z < .91) continue;
    o.hit = true;
    const gap = o.type === 'bigLog' || o.type === 'ford' || o.type === 'pigpen' ? 0 : o.type === 'trincia' ? Math.max(0, Math.abs(px - o.l) - .28) : Math.abs(px - o.l);   // v81 · il trattore è largo
    if (o.type === 'sgap') {
      if (Math.abs(px - o.l) < .5 && crash <= 0) { slalomN++; run.slaloms = Math.max(run.slaloms || 0, slalomN); reward(10 + Math.min(slalomN, 10) * 3, slalomN >= 5 ? 'SLALOM ×' + slalomN + '!' : 'SLALOM!', 'trick', false); if (slalomN === 10) cheer('SEI UN CANGURO DEL BOSCO!', false, true); }
      else slalomN = 0;
      o.collected = true; continue;
    }
    if (o.type === 'pigpen') {   // v102 · il porcile: saltarlo paga, ma buttarsi dentro col gas è ignoranza pura (e paga lo stesso)
      o.collected = true;
      if (lift > .55) { run.jumps++; reward(220, o.sludge ? 'ONDATA SALTATA!' : 'PORCILE SALTATO!', 'jump'); }
      else { reward(160, o.sludge ? 'NELLA FOGNA FINO AL CASCO!' : 'IGNORANZA PURA! 🐷', 'trick'); mud(1); fxKind = 'splash'; fxSerial++; A.sfx.splash(); flash('gold'); run.splashes++; toast(o.sludge ? '💩 CHE PROFUMO… LAVATI PRIMA DEL RIFUGIO' : '🐷 SEI PIÙ SPORCO DEI MAIALI', 'gold'); }
      continue;
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
        if (driftT > 0 && Math.abs(drift) > .22 && o.seq) { const k = run.gateSeq?.id === o.seq ? run.gateSeq.n + 1 : 1; run.gateSeq = { id: o.seq, n: k }; if (k === 3) { driftPend += 900 * driftMult(); bigCall('SLALOM DI PORTE PERFETTO!'); flash('gold'); } }
        if (driftT > 0 && Math.abs(drift) > .22) { driftPend += 260 * driftMult(); A.sfx.perfect(); pop('PORTA IN TRAVERSO! ❄', 'gold'); fxKind = 'trick'; fxSerial++; if (touchDevice && navigator.vibrate) try { buzz([8, 30, 8]); } catch {} }
        else { score += 50; A.sfx.near(); pop('PORTA +50 · PASSALA DI TRAVERSO!', 'small'); }
      }
      continue;
    }
    if (o.type === 'bar') { if (Math.abs(px - o.l) < .6 && crash <= 0) { o.collected = true; takeBar(); } continue; }
    if (o.type === 'shortcut') { if (Math.abs(px - o.l) < .6 && crash <= 0) { o.collected = true; takeShortcut(); return; } continue; }
    if (o.type === 'forkShort' || o.type === 'forkSafe') { if (Math.abs(px - o.l) < .6 && crash <= 0 && !o.collected) takeFork(o.type === 'forkShort' ? 'short' : 'safe'); continue; }
    if (o.type === 'goldMug') {   // v104 · boccale d'oro: sul bordo della fettuccia o in aria (serve un salto)
      const near = Math.abs(px - o.l) < (o.air ? .5 : .32);
      if (near && (!o.air || lift > 1.15) && crash <= 0) {
        o.collected = true; const n = P.findGold(mode, o.gi); run.gold = (run.gold || 0) + 1; run.caps += 10; score += 1000;
        A.sfx.power(); A.sfx.perfect?.(); flash('gold'); fxKind = 'power'; fxSerial++; slowmo = .25; slowScale = .5;
        bigCall(`🏆 BOCCALE D'ORO ${n}/3!`); markHighlight('BOCCALE D’ORO ' + n + '/3!', 1800); toast(n === 3 ? '🏆 TUTTI E 3 I BOCCALI D’ORO DI QUESTO PERCORSO! +10 🍺' : '🏆 BOCCALE D’ORO TROVATO! +1000 · +10 🍺', 'gold');
        if (touchDevice && navigator.vibrate) try { buzz([20, 50, 20, 50, 60]); } catch {}
      } else { o.collected = true; if (!run.goldMiss) { run.goldMiss = 1; pop(o.air ? '🏆 BOCCALE D’ORO IN ARIA: SALTA!' : '🏆 BOCCALE D’ORO SUL BORDO!', 'gold'); } }
      continue;
    }
    if (o.type === 'heli') continue;
    if (o.type === 'forkSplit') {   // v103 · al bivio decide da che parte sei: a sinistra o a destra del cartello (al centro tiri dritto sulla strada lunga)
      o.collected = true; const side = px < .97 ? -1 : px > 1.03 ? 1 : -o.shortSide; if (touchDevice && navigator.vibrate) try { buzz(20); } catch {}
      if (forkInfo) forkInfo.side = side; takeFork(side === o.shortSide ? 'short' : 'safe'); continue;
    }
    if (o.type === 'landpad' || o.type === 'mboard' || o.type === 'gevmark' || (o.type === 'boulder' && leap)) continue;   // v64 · i pietroni si valutano all'atterraggio (corsia)
    if (o.type === 'speedpad') {   // v67 · scopa volante di Angelo Potter: più velocità per il salto
      if (Math.abs(px - o.l) < .6) { o.collected = true; leapMul = Math.min(2.2, leapMul + .12); if (turbo <= 0) charge = Math.min(100, charge + 30); A.sfx.turbo(); shake = Math.max(shake, .2); pop('🧹 SCOPA! ' + Math.round(kmh * 1.45 * 1.07) + ' km/h', 'gold'); fxKind = 'trick'; fxSerial++; }
      continue;
    }
    if (o.type === 'bigRamp') { o.collected = true; if (leapState === 1) leapTakeoff(); continue; }
    if (o.type === 'ramp' || o.type === 'hayCart') {
      // Rampa di terra: se ci passi sopra a terra, decolli con un salto lunghissimo. v102 · il carro del fieno ti lancia ancora più su
      if (gap < .5 && jump <= 0 && crash <= 0) {
        if (wheelie) endWheelie(false);
        const cart = o.type === 'hayCart';
        jumpDur = (cart ? 1.7 : 1.45) * (1 + up.susp * .03); jumpH = (cart ? 3.8 : 3.0) * (1 + up.susp * .05) * (1 + (bs.jump || 0)); jump = jumpDur; scrubbed = 0;
        A.sfx.jump(); run.ramps = (run.ramps || 0) + 1; shake = Math.max(shake, .3);
        reward(cart ? 250 : 120, cart ? 'DECOLLO DAL CARRO DEL FIENO!' : 'RAMPA!', 'trick');
      }
      continue;
    }
    if (o.type === 'coin') {
      const val = magnet > 0 ? (has('sommelier') ? 3 : 2) : 1;
      if (o.air) {
        if (gap < .5 && lift > .8) { o.collected = true; run.caps++; run.airCaps++; A.sfx.air(); reward(150 * val, 'BIRRA AL VOLO!', 'coin'); }
      } else if (gap < .4 + up.nose * .05 || gap < pull || (has('nose') && gap < 1.05)) {
        o.collected = true; run.caps++; A.sfx.beer(); buzz(9); reward(100 * val, combo >= 2 ? 'COMBO!' : 'BIRRA!');
        if (routeAt(course, roadTime * 19.5).climb > .3) run.climbCaps = (run.climbCaps || 0) + 1;
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
    } else if (o.type === 'thorns') {   // v106.7 · spine del Desertone: saltale o buchi
      if (gap < .42 && graceWait(o)) continue;
      if (gap < .42) { o.collected = true;
        if (o.graceJump || clearsObstacle('thorns', lift)) { run.jumps++; reward(120, 'SPINE SALTATE!', 'jump'); }
        else if (grappa > 0 || turbo > 0 || crash > 0 || invincible > 0) reward(30, 'SPINE SCHIVATE', 'near', false);
        else puncture(); }
    } else if (o.type === 'water') {
      if (gap < .42 && has('dry')) { o.collected = true; reward(150, 'ACQUA? MAI!', 'trick', false); A.sfx.hit(); }
      else if (gap < .42 && lift < OBSTACLE_HEIGHT.water + .06 && turbo <= 0 && grappa <= 0) {
        o.collected = true; run.waters++; mistake();
        waterT = 3 * (1 - up.camel * .15); earsT = Math.max(earsT, 8); if (up.camel < 3) breakCombo(); charge = Math.max(0, charge - 30 * (1 - up.camel * .15));
        fxKind = 'splash'; fxSerial++; A.sfx.water(); A.say('acqua'); flash('blue');
        toast('💧 ACQUA?! ORECCHIE DA CONIGLIO!', 'blue');
      } else if (gap < .42) { o.collected = true; reward(80, lift > .5 ? 'ACQUA SALTATA!' : 'ACQUA SPACCATA!', 'near', false); }
    } else if (gap < (ice ? .33 : .37) && graceWait(o)) { continue;
    } else if (o.graceJump && gap < (ice ? .33 : .37)) {   // v107 · salto al volo: premuto un attimo in ritardo, vale lo stesso
      o.collected = true; run.jumps++; run.lateJumps = (run.lateJumps || 0) + 1; reward(o.type === 'puddle' ? 60 : 100, o.type === 'puddle' ? 'ASCIUTTO AL VOLO!' : 'SALTO AL VOLO!', 'jump');
    } else if (gap < (ice ? .33 : .37)) {   // v49 · ostacoli un filo più tolleranti (sul ghiaccio ancora di più)
      if (turbo > 0 || grappa > 0) { o.collected = true; reward(50, grappa > 0 ? 'GRAPPA POWER!' : 'GAS A MARTELLO!', 'smash', false); shake = Math.max(shake, .35); }
      else if (clearsObstacle(o.type, lift)) {
        run.jumps++;
        const perfect = has('precise') ? phase > .2 && phase < .8 : isPerfectJump(phase);
        const base = o.type === 'rock' || o.type === 'rollRock' || o.type === 'rollHay' || o.type === 'ibex' ? 200 : o.type === 'bigLog' ? 250 : o.type === 'goat' ? 220 : 150;
        const names = { rock: 'ROCCIA SUPERATA!', puddle: 'ASCIUTTO!', step: 'GRADONE SUPERATO!', bigLog: 'TRONCO VOLATO!', goat: 'CAPRA SALTATA!', hen: 'GALLINA SALTATA!', grapeCrate: 'CASSETTA SALTATA!', dolmen: 'DOLMEN VOLATO!', manhole: 'TOMBINO SALTATO!', boar: 'CINGHIALE SALTATO!', barrier: 'BLOCCO SALTATO!', rollHay: 'ROTOBALLA SALTATA!', hay: 'SOPRA IL FIENO!', stump: 'CEPPO SUPERATO!', cairn: 'OMETTO SALTATO!', rollRock: 'SCHIVATA LA FRANA!', ibex: 'STAMBECCO SALTATO!', chamois: 'CAMOSCIO SALTATO!', marmot: 'MARMOTTA SALVA!', snowman: 'PUPAZZO SALTATO!', cone: 'BIRILLO SALTATO!', tyre: 'COPERTONE SALTATO!', sign: 'DIVIETO IGNORATO!', barrier: 'TRANSENNA VOLATA!' };
        if (perfect) { run.perfect++; A.sfx.perfect(); if (touchDevice && navigator.vibrate) try { buzz([10, 40, 10]); } catch {} reward(Math.round(base * (has('precise') ? 2 : 1.5)), 'SALTO PERFETTO!', 'perfect'); flash('gold'); slowmo = .3; slowScale = .45; }
        else { reward(base, names[o.type] || 'BEL SALTO!', 'jump'); if (touchDevice && navigator.vibrate) try { buzz(8); } catch {} }
      } else if (wheelie && (o.type === 'root' || o.type === 'puddle')) {
        reward(140, o.type === 'root' ? 'IMPENNATA SULLA RADICE!' : 'IMPENNATA NELLA POZZA!', 'trick'); if (o.type === 'puddle') mud(.35);
      } else if (o.type === 'puddle' && has('amphibious')) {
        reward(90, 'ANFIBIO!', 'trick'); mud(.35); fxKind = 'splash'; fxSerial++; A.sfx.splash();
      } else if (o.type === 'puddle') {
        wet = 1.8 - up.tyres * .2; breakCombo(); run.splashes++; mud(); mistake();
        fxKind = 'splash'; fxSerial++; A.sfx.splash(); flash('blue');
        toast('PLOF! FANGO FINO AL CASCO', 'blue');
      } else if (has('mulcher') && ((o.type === 'tree' && P.MODES[mode].ranch) || o.type === 'log' || o.type === 'stump' || o.type === 'bigLog' || o.type === 'trincia')) {
        // v81 · Gusta, trinciatutto: legno trinciato, niente botta (lo rallenta un attimo)
        o.collected = true; stun = Math.max(stun, .25); shake = Math.max(shake, .4); A.sfx.hit(); fxKind = 'smash'; fxSerial++; mud(.25);
        reward(120, o.type === 'trincia' ? 'IL TRATTORE È SUO!' : '🚜 TRINCIATO!', 'smash', false);
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
        if (A.hasRiderVoice?.('giacu_save')) { lastRiderHit = elapsed; A.sayRider('erika_hit'); setTimeout(() => A.sayRider('giacu_save'), 1700); }
      } else if (invincible <= 0 && skidLeft > 0) {
        // v96 · paramotore: la botta si prende ma la moto resta
        skidLeft--; invincible = 1.4; crash = .5; stun = .45; shake = .7; jump = 0; breakCombo(); mistake(); A.sfx.hit(); fxKind = 'hit'; fxSerial++; flash('hit');
        if (ice) endDrift(false);
        toast('🛡 PARAMOTORE: MOTO SALVA' + (skidLeft ? ' (NE RESTA UNO)' : ''), 'green');
      } else if (invincible <= 0) {
        if (elapsed - lastRiderHit > 5) { lastRiderHit = elapsed; riderLine('hit'); }
        if (ice) endDrift(false);
        markHighlight('BOTTA!', 650);
        lives--; run.hits++; invincible = 1.5 + up.helmet * .25 + (has('veteran') ? 1 : 0) + (bs.protect || 0); breakCombo(); charge = Math.max(0, charge - 10); mistake();
        fxKind = 'hit'; fxSerial++; shake = 1; A.sfx.hit(); flash('hit');
        // v58 · dopo una botta la fila subito dopo si apre: niente botte a catena mentre la moto riparte
        for (const q of objects) if (q !== o && !q.hit && q.z > .66 && q.z < .91 && OBSTACLE_HEIGHT[q.type] !== undefined && q.type !== 'water') q.collected = true;
        crash = 1; stun = .65 * (bs.protect ? .7 : 1) * (has('tank') ? .5 : 1); if (has('tank')) invincible += 1; slowmo = .35; slowScale = .4; jump = 0;
        if (wheelie) endWheelie(false);
        if (o.type === 'dolmen') run.dolmenHit = 1;
        const lines = { trincia: 'TRINCIATO DAL GUSTA.', rock: 'NON ERA UN SASSOLINO.', bigLog: 'IL TRONCO HA VINTO.', goat: 'LA CAPRA NON SI È SPOSTATA.', hen: 'COCCODÈ. PIUME OVUNQUE.', grapeCrate: 'MOSTO DAPPERTUTTO.', dolmen: 'IL DOLMEN DI COSTA NON SI SPOSTA.', cow: 'MUUU. LA MUCCA HA VINTO.', manhole: 'DENTRO IL TOMBINO.', boar: 'IL CINGHIALE NON PERDONA.', deer: 'CORNA DEL CERVO.', rollHay: 'ARROTOBALLATO DAL GUSTA.', hay: 'FIENO DAPPERTUTTO.', rollRock: 'TRAVOLTO DALLA FRANA.', stump: 'CEPPO 1 — PILOTA 0.', cairn: 'HAI SMONTATO L’OMETTO.', ibex: 'LO STAMBECCO HA LE CORNA DURE.', chamois: 'IL CAMOSCIO TI GUARDA MALE.', marmot: 'LA MARMOTTA FISCHIA. DI RABBIA.', tree: 'L’ALBERO NON SI SPOSTA.', snowman: 'PUPAZZO ESPLOSO.', boulder: 'DRITTO SUL PIETRONE.', cone: 'BIRILLO DELLE GEV IN FACCIA.', tyre: 'COPERTONE DELLE GEV.', sign: 'DIVIETO DI TRANSITO… ANCHE PER TE.', barrier: 'LA TRANSENNA DELLE GEV HA VINTO.' };
        if (o.type === 'tree') slalomN = 0;
        // v49 · Erika anche su ogni albero di MontaFiga
        if (o.type === 'log' || o.type === 'bigLog' || o.type === 'tree') erika(); else toast(lines[o.type] || 'DOPO MIGLIORA… DICONO.', 'red');
        if (navigator.vibrate) try { buzz(120); } catch {}
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
function mud(intensity = 1) { mudFx.splash(intensity * (weather.night > .5 ? .4 : 1)); }   // v91 · di notte meno fango sullo schermo: si deve vedere la pista
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
    mode, vigne: !!P.MODES[mode].vigne, ranch: !!P.MODES[mode].ranch, fork: forkInfo, state, lane, px, vx: vx + (barT > 0 ? Math.sin(elapsed * 4.2) * 2.2 * Math.min(1, barT) : 0), jump, lift: curLift(), jumpPhase: jump > 0 ? 1 - jump / jumpDur : 0, elapsed: course,
    wheelie: wheelie ? 1 : 0, ears: earsOn(), grappa, water: waterT,
    courseScale: GAME_LENGTH / (courseLength(P.MODES[mode].difficulty) * 19.5), objects, invincible, roadTime, wheelPhase, turbo, combo, fxKind, fxSerial,
    gas, wet, magnet, whip, shake, crash, speed: speedNow,
    riderName: profile.rider, riderNumber: RIDERS.indexOf(profile.rider) + 1,
    livery: raceLivery(), preset: P.MODES[mode].sky, bikeLook: P.currentBike().look, bikeId: P.currentBike().id, parts: P.currentParts(), sight: (bs.sight || 0) + up.eyes * .06, eyes: up.eyes,
    leapPitch: leap && leapState === 2 ? leapPitch : undefined, leapCam: leap && leapState === 2, canyon: leap && canyonX0 !== null ? { x0: canyonX0, len: canyonLen, land: canyonLand } : null,
    gev: gev ? { L: 1 + gevSide * 2.15, z: gevZ, arm: gevArm, t: elapsed } : null,
    ice, drift, driftOn: driftT > 0, snowHit: snowT, studs: P.currentParts().studs, variant: variantOf(mode),
    rivals: (state === 'playing' || state === 'paused' || state === 'countdown' || state === 'ended' || state === 'continue') ? (gGhost && state !== 'ended' ? [...rivals, gGhost.entry] : rivals) : [], weather,
  });
}
function draw() { const s = drawState(); world?.render(s); if (state === 'playing') recordReplay(s); }

// v97 · REPLAY: gli ultimi 10 secondi del giro (fotografie dello stato a 30 al secondo), da rivedere e da mandare come video
const REPLAY_SEC = 10;
let replayBuf = [], recClock = 0, recLast = 0, replay = null;
function cloneSnap(s) {
  return { ...s, objects: (s.objects || []).map(o => ({ ...o })), rivals: (s.rivals || []).map(r => ({ ...r })), gev: s.gev && { ...s.gev }, canyon: s.canyon && { ...s.canyon }, weather: s.weather && { ...s.weather }, parts: s.parts && { ...s.parts } };
}
function recordReplay(s) {
  const now = performance.now() / 1000;
  if (now - recLast < 1 / 30) return;
  const step = Math.min(now - recLast, .1); recLast = now;
  pushSnap(s, step);
}
function pushSnap(s, step) {
  recClock += step;
  replayBuf.push({ t: recClock, s: cloneSnap(s) });
  while (replayBuf.length && replayBuf[0].t < recClock - REPLAY_SEC) replayBuf.shift();
  for (const p of hlPend.splice(0)) {   // v107.2 · un momento forte finito: si tengono i suoi 4 s per la clip
    if (recClock < p.at + HL_POST) { hlPend.push(p); continue; }
    const frames = replayBuf.filter(f => f.t >= p.at - HL_PRE && f.t <= p.at + HL_POST);
    if (frames.length < 40) continue;
    const near = highlights.find(h => Math.abs(h.at - p.at) < 3.2);
    if (near) { if (near.w >= p.w) continue; highlights.splice(highlights.indexOf(near), 1); }
    highlights.push({ ...p, frames });
    if (highlights.length > 3) highlights.splice(highlights.indexOf(highlights.reduce((a, b) => a.w <= b.w ? a : b)), 1);
  }
}
// v107.2 · CLIP DEL GIRO: i momenti forti (salti perfetti, sorpassi, boccali, botte…) diventano un video verticale da condividere
const HL_PRE = 2.6, HL_POST = 1.4;
let highlights = [], hlPend = [];
function markHighlight(label, w) {
  if (state !== 'playing' || replay || clip) return;
  const last = hlPend[hlPend.length - 1];
  if (last && recClock - last.at < 1.2) { if (w > last.w) Object.assign(last, { label, w }); return; }
  hlPend.push({ label, w, at: recClock });
}
const replayReady = () => replayBuf.length > 30;
function startReplay(rec = false) {
  if (!replayReady() || replay) return;
  replay = { t: replayBuf[0].t, i: 0, speed: 1, rec: rec ? makeRecorder() : null };
  if (rec && !replay.rec) { replay = null; toast('📵 QUESTO TELEFONO NON SA REGISTRARE IL VIDEO', 'red'); return; }
  $('overlay').classList.add('hidden');
  const b = $('replaybar'); b.hidden = false; b.classList.toggle('rec', !!rec);
  $('rpslow').hidden = !!rec; $('rpslow').textContent = '🐢 RALLENTA';
  $('rplabel').textContent = rec ? '● REC' : '🎬 REPLAY';
  A.sfx.click?.();
}
function replayStep(dt) {
  const r = replay; r.t += dt * r.speed;
  while (r.i < replayBuf.length - 1 && replayBuf[r.i + 1].t <= r.t) r.i++;
  const snap = replayBuf[r.i].s;
  world?.render(snap);
  if (r.rec) r.rec.frame();
  $('rpfill').style.width = Math.min(100, (r.t - replayBuf[0].t) / (replayBuf[replayBuf.length - 1].t - replayBuf[0].t) * 100) + '%';
  if (r.i >= replayBuf.length - 1) endReplay();
}
function endReplay(cancel = false) {
  const r = replay; if (!r) return;
  replay = null; $('replaybar').hidden = true;
  if (r.rec) r.rec.stop(cancel);
  renderResultAgain();
}
// video: la scena 3D più una fascia EDT, disegnate su una tela 2D che il telefono registra
function makeRecorder() {
  if (!window.MediaRecorder || !canvas.captureStream) return null;
  const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const type = types.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
  if (!type) return null;
  const W = Math.min(720, canvas.width), H = Math.round(W * canvas.height / canvas.width) & ~1;
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
  const g = c2.getContext('2d');
  const stream = c2.captureStream(30), chunks = [];
  let mr; try { mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3500000 }); } catch { return null; }
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const info = lastVideoInfo();
  mr.start(250);
  let cancelled = false;
  mr.onstop = () => { if (cancelled || !chunks.length) return; const ext = type.includes('mp4') ? 'mp4' : 'webm'; offerVideo(new File(chunks, 'giro-easy-replay.' + ext, { type: type.split(';')[0] }), info); };
  return {
    frame() {
      g.drawImage(canvas, 0, 0, W, H);
      const fh = Math.round(H * .13), fs = Math.round(fh * .34);
      const gr = g.createLinearGradient(0, H - fh * 1.6, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)');
      g.fillStyle = gr; g.fillRect(0, H - fh * 1.6, W, fh * 1.6);
      g.fillStyle = '#ffcf16'; g.font = `900 ${fs}px Anton, Impact, sans-serif`; g.textBaseline = 'alphabetic';
      g.fillText('EDT · GIRO EASY', fs * .6, H - fh * .55);
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(fs * .62)}px system-ui, sans-serif`;
      g.fillText(info.line, fs * .6, H - fh * .12);
      g.fillStyle = '#e3301c'; g.beginPath(); g.arc(W - fs * 2.9, fs * 1.05, fs * .22, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `900 ${Math.round(fs * .6)}px system-ui, sans-serif`; g.fillText('REPLAY', W - fs * 2.5, fs * 1.25);
    },
    stop(cancel) { cancelled = cancel; try { mr.stop(); } catch {} },
  };
}
function lastVideoInfo() {
  const md = P.MODES[mode], who = C.getNick() || profile.rider;
  const res = ice ? Math.round(driftM) + ' m di traverso' : leap ? C.fmtJump(leapBest || 0) : run.finishTime ? run.finishTime.toFixed(1).replace('.', ',') + ' s' : score.toLocaleString('it-IT') + ' punti';
  return { line: `${who} · ${md.id === 3 ? 'Sfida del giorno' : md.name} · ${res}`, text: `🎬 ${who} su ${md.id === 3 ? 'Sfida del giorno' : md.name}: ${res}. Guarda che giro! Prova a fare meglio 👉 ` };
}

// ----- v107.2 · clip verticale: intro con la scheda del pilota, i 3 momenti migliori, l'arrivo, il risultato -----
let clip = null;
const CLIP_W = 720, CLIP_H = 1280;
function clipSegments() {
  const segs = [{ kind: 'intro', dur: 1.8 }];
  const hl = [...highlights].sort((a, b) => a.at - b.at);
  for (const h of hl) segs.push({ kind: 'play', frames: h.frames, label: h.label });
  const lastAt = hl.length ? hl[hl.length - 1].at + HL_POST : -99;
  const tail = replayBuf.filter(f => f.t >= Math.max(lastAt, recClock - (hl.length ? 3.2 : 9)));
  if (tail.length > 30) segs.push({ kind: 'play', frames: tail, label: hl.length ? (run.finishTime ? 'AL RIFUGIO!' : 'FINALE') : '' });
  segs.push({ kind: 'outro', dur: 3 });
  return segs;
}
async function startClip() {
  if (!replayReady() || replay || clip) return;
  const sid = duel?.racing ? A.DUEL_STYLE : mode;
  if (!A.clipSongReady(sid)) { toast('PREPARO LA CANZONE PER LA CLIP…', 'gold'); await Promise.race([A.preloadSong(sid), new Promise(r => setTimeout(r, 6000))]); if (replay || clip) return; }
  if (!window.MediaRecorder || !canvas.captureStream) { toast('📵 QUESTO TELEFONO NON SA REGISTRARE IL VIDEO', 'red'); return; }
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const type = types.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
  if (!type) { toast('📵 QUESTO TELEFONO NON SA REGISTRARE IL VIDEO', 'red'); return; }
  const c2 = document.createElement('canvas'); c2.width = CLIP_W; c2.height = CLIP_H;
  const g = c2.getContext('2d');
  const vs = c2.captureStream(30), song = A.clipAudio(duel?.racing ? A.DUEL_STYLE : mode);
  const stream = new MediaStream([...vs.getVideoTracks(), ...(song ? song.stream.getAudioTracks() : [])]);
  let mr; try { mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4500000 }); } catch { song?.stop(); toast('📵 QUESTO TELEFONO NON SA REGISTRARE IL VIDEO', 'red'); return; }
  const chunks = []; mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const info = clipInfo();
  const photo = new Image(); const k = PHOTOS[profile.rider]; if (k) { photo.src = 'img/piloti/' + k + '.webp'; photo.onerror = () => { photo.onerror = null; photo.src = FOTO[k] || ''; }; }
  const segs = clipSegments(), total = segs.reduce((a, s) => a + (s.dur || (s.frames[s.frames.length - 1].t - s.frames[0].t)), 0);
  clip = { segs, si: 0, t: 0, all: 0, total, g, c2, mr, chunks, info, photo, song, type, cancelled: false };
  mr.onstop = () => { const c = clip || {}; song?.stop(); if (c.cancelled || !chunks.length) return; const ext = type.includes('mp4') ? 'mp4' : 'webm'; offerVideo(new File(chunks, 'giro-easy-clip.' + ext, { type: type.split(';')[0] }), info); };
  $('overlay').classList.add('hidden');
  const b = $('replaybar'); b.hidden = false; b.classList.add('rec'); $('rpslow').hidden = true; $('rplabel').textContent = '● CLIP';
  mr.start(250); A.sfx.click?.();
}
function clipInfo() {
  const md = P.MODES[mode], who = C.getNick() || profile.rider, i = RIDERS.indexOf(profile.rider);
  const big = ice ? Math.round(driftM) + ' m' : leap ? C.fmtJump(leapBest || 0) : run.finishTime ? run.finishTime.toFixed(1).replace('.', ',') + ' s' : score.toLocaleString('it-IT');
  const sub = ice ? 'DI TRAVERSO' : leap ? 'DI SALTO' : run.finishTime ? 'AL RIFUGIO' : 'PUNTI EDT';
  return { who, rider: profile.rider, num: String(i + 1).padStart(2, '0'), skill: SKILLS[profile.rider]?.name || '', track: md.id === 3 ? 'Sfida del giorno' : md.name,
    big, sub, pos: run.position && !ice && !leap ? run.position + '° SU ' + (rivals.length + 1) : '', pts: Math.floor(score).toLocaleString('it-IT'),
    line: `${who} · ${md.id === 3 ? 'Sfida del giorno' : md.name} · ${big}`, text: `🎬 ${who} su ${md.id === 3 ? 'Sfida del giorno' : md.name}: ${big}${run.position && !ice && !leap ? ' (' + run.position + '°)' : ''}. Battimi se ci riesci 👉 ` };
}
function clipStep(dt) {
  const c = clip, seg = c.segs[c.si];
  c.t += dt; c.all += dt;
  let lt = c.t, done = false;
  if (seg.kind === 'play') {
    const f0 = seg.frames[0].t, f1 = seg.frames[seg.frames.length - 1].t;
    let i = 0; while (i < seg.frames.length - 1 && seg.frames[i + 1].t - f0 <= lt) i++;
    world?.render(seg.frames[i].s);
    done = lt >= f1 - f0;
  } else {
    const ref = (c.segs.find(s => s.kind === 'play') || {}).frames, last = [...c.segs].reverse().find(s => s.kind === 'play')?.frames;
    const fr = seg.kind === 'intro' ? ref?.[0] : last?.[last.length - 1];
    if (fr) world?.render(fr.s);
    done = lt >= seg.dur;
  }
  clipDraw(c, seg, lt);
  $('rpfill').style.width = Math.min(100, c.all / c.total * 100) + '%';
  if (seg.kind === 'outro' && lt > seg.dur - 1) c.song?.fade(1);
  if (done) { c.si++; c.t = 0; if (c.si >= c.segs.length) endClip(false); }
}
function endClip(cancel) {
  const c = clip; if (!c) return;
  c.cancelled = cancel; clip = null; $('replaybar').hidden = true; $('replaybar').classList.remove('rec');
  try { c.mr.stop(); } catch {} if (cancel) c.song?.stop();
  renderResultAgain();
}
// disegno della clip (tela 720×1280): la scena 3D ritagliata in verticale + grafica EDT
function clipDraw(c, seg, lt) {
  const g = c.g, W = CLIP_W, H = CLIP_H, sw = canvas.width, sh = canvas.height;
  let cw = sw, ch = sh; if (sw / sh > W / H) cw = sh * W / H; else ch = sw * H / W;
  g.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
  const Y = '#ffcf16', R = '#e3301c', D = 'Anton, Impact, sans-serif', U = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  const grad = (y0, y1, a0, a1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(10,10,8,${a0})`); gr.addColorStop(1, `rgba(10,10,8,${a1})`); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); };
  const slant = (x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x + h * .35, y); g.lineTo(x + w, y); g.lineTo(x + w - h * .35, y + h); g.lineTo(x, y + h); g.closePath(); g.fill(); };
  g.textBaseline = 'alphabetic';
  if (seg.kind === 'play') {
    grad(0, 190, .75, 0); grad(H - 330, H, 0, .85);
    // testata: EDT e numero del pilota
    slant(28, 40, 300, 54, Y); g.fillStyle = '#111'; g.font = `italic 400 34px ${D}`; g.fillText('EDT · GIRO EASY', 52, 80);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `italic 400 58px ${D}`; g.fillText(c.info.num, W - 30, 96);
    g.font = `italic 700 26px ${U}`; g.fillStyle = Y; g.fillText(c.info.rider.toUpperCase(), W - 30, 128); g.textAlign = 'left';
    // didascalia del momento
    if (seg.label) {
      const a = ease(lt / .35), x = -60 + a * 60;
      g.globalAlpha = a; g.font = `italic 400 ${seg.label.length > 22 ? 52 : 64}px ${D}`;
      const tw = Math.min(W - 60, g.measureText(seg.label).width + 70);
      slant(x + 24, H - 290, tw, 86, R); g.fillStyle = '#fff'; g.fillText(seg.label, x + 56, H - 224); g.globalAlpha = 1;
    }
    g.font = `italic 700 30px ${U}`; g.fillStyle = '#fffd'; g.fillText(c.info.track.toUpperCase(), 40, H - 120);
    g.fillStyle = Y; g.fillRect(40, H - 104, 120, 6);
  } else {
    g.fillStyle = 'rgba(12,12,10,.72)'; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = .12; g.fillStyle = Y; g.translate(W * .62, 0); g.rotate(.32); g.fillRect(0, -200, 70, H * 1.6); g.restore();
    const a = ease(lt / .5);
    if (seg.kind === 'intro') {
      // scheda del pilota
      const px = 110, py = 210 + (1 - a) * 60, pw = 500, ph = 560;
      g.globalAlpha = a;
      g.save(); g.beginPath(); g.moveTo(px, py); g.lineTo(px + pw, py); g.lineTo(px + pw, py + ph - 40); g.lineTo(px + pw - 40, py + ph); g.lineTo(px, py + ph); g.closePath(); g.clip();
      g.fillStyle = '#1a1b17'; g.fillRect(px, py, pw, ph);
      if (c.photo.complete && c.photo.naturalWidth) g.drawImage(c.photo, px, py, pw, pw);
      const gr = g.createLinearGradient(0, py + pw * .55, 0, py + pw); gr.addColorStop(0, 'rgba(20,21,18,0)'); gr.addColorStop(1, 'rgba(20,21,18,1)'); g.fillStyle = gr; g.fillRect(px, py, pw, pw);
      g.restore();
      g.fillStyle = R; g.fillRect(px, py + pw - 6, pw, 8);
      g.textAlign = 'right'; g.lineWidth = 3; g.strokeStyle = '#fff'; g.font = `italic 400 120px ${D}`; g.strokeText(c.info.num, px + pw - 22, py + 120); g.textAlign = 'left';
      g.fillStyle = '#fff'; g.font = `italic 400 76px ${D}`; g.fillText(c.info.rider.toUpperCase(), px + 24, py + ph + 20 - 4);
      g.fillStyle = Y; g.font = `italic 700 30px ${U}`; g.fillText(c.info.skill.toUpperCase(), px + 26, py + ph + 62);
      g.globalAlpha = ease((lt - .3) / .5);
      slant(60, 1010, 600, 70, Y); g.fillStyle = '#111'; g.font = `italic 400 44px ${D}`; g.fillText(c.info.track.toUpperCase().slice(0, 24), 96, 1061);
      g.fillStyle = '#fff'; g.font = `italic 700 30px ${U}`; g.fillText('ENDURO DRINKING TEAM · GIRO EASY', 64, 1130);
      g.globalAlpha = 1;
    } else {
      g.globalAlpha = a;
      g.fillStyle = Y; g.font = `italic 700 38px ${U}`; g.fillText(c.info.track.toUpperCase(), 60, 300);
      g.fillStyle = '#fff'; g.font = `italic 400 ${c.info.big.length > 8 ? 150 : 190}px ${D}`; g.fillText(c.info.big, 52, 500);
      g.fillStyle = Y; g.font = `italic 400 48px ${D}`; g.fillText(c.info.sub, 60, 566);
      if (c.info.pos) { slant(50, 620, 360, 96, R); g.fillStyle = '#fff'; g.font = `italic 400 64px ${D}`; g.fillText(c.info.pos, 90, 690); }
      g.fillStyle = '#fffc'; g.font = `italic 700 34px ${U}`; g.fillText(c.info.who.toUpperCase() + ' · ' + c.info.pts + ' PUNTI', 60, 780);
      g.globalAlpha = ease((lt - .6) / .5);
      slant(40, 930, 640, 120, Y); g.fillStyle = '#111'; g.font = `italic 400 66px ${D}`; g.fillText('BATTIMI SE CI RIESCI', 80, 1012);
      g.fillStyle = '#fff'; g.font = `700 30px ${U}`; g.fillText(publicGameURL.replace(/^https?:\/\//, '').replace(/\/$/, ''), 60, 1110);
      g.globalAlpha = 1;
    }
  }
}
let replayFile = null;
function offerVideo(file, info) {
  replayFile = { file, info };
  const el = document.createElement('div'); el.className = 'podium vidready'; el.id = 'vidready';
  const url = URL.createObjectURL(file);
  el.innerHTML = `<div class="podbox"><small>IL TUO REPLAY</small><b class="podtitle">VIDEO PRONTO</b>
    <video src="${url}" autoplay loop muted playsinline></video>
    <button class="primary" type="button" id="vidshare"><span>📲 MANDALO NEL GRUPPO</span></button>
    <div class="grow"><a class="linkbtn" id="vidsave" href="${url}" download="${file.name}">salva sul telefono</a><button class="linkbtn" type="button" id="vidclose">chiudi</button></div></div>`;
  topLayer().appendChild(el);
  $('vidclose').onclick = () => { el.remove(); URL.revokeObjectURL(url); };
  $('vidshare').onclick = async () => {
    // v98 · prima il solo video (+ testo), che Android e WhatsApp accettano; se il telefono rifiuta: salva il video e apre WhatsApp col messaggio pronto
    const text = info.text + publicGameURL;
    for (const data of [{ files: [file], text }, { files: [file] }]) {
      if (!navigator.share || !navigator.canShare?.(data)) continue;
      try { await navigator.share(data); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    $('vidsave').click();
    toast('💾 VIDEO SALVATO: SCEGLI IL GRUPPO E ALLEGALO DALLA GALLERIA', 'green');
    setTimeout(() => { const a = document.createElement('a'); a.href = waLink(text); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }, 1200);
  };
}
document.addEventListener('click', e => {
  const id = e.target.closest?.('button')?.id;
  if (id === 'replaybtn') startReplay(false);
  else if (id === 'replayvid') startClip();
  else if (id === 'rpclose') { if (clip) endClip(true); else endReplay(true); }
  else if (id === 'rpslow' && replay) { replay.speed = replay.speed === 1 ? .4 : 1; $('rpslow').textContent = replay.speed === 1 ? '🐢 RALLENTA' : '▶ VELOCITÀ NORMALE'; }
});

function frame(t) {
  // v43 · fino a 15 fotogrammi al secondo il gioco va alla stessa velocità (prima sotto i 25 rallentava)
  const dt = Math.min(.066, (t - last) / 1000 || 0);
  last = t;
  pollPad();
  if (replay) { replayStep(dt); mudFx.update(dt); requestAnimationFrame(frame); return; }
  if (clip) { clipStep(dt); mudFx.update(dt); requestAnimationFrame(frame); return; }
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
      <span class="ut"><b>${u.name}</b><small>${u.desc}</small><i class="pips">${Array.from({ length: P.MAX_UPGRADE }, (_, k) => `<u class="${k < lvl ? 'on' : ''} ${k >= P.LEGEND_FROM ? 'leg' : ''}"></u>`).join('')}</i>${lvl >= P.LEGEND_FROM ? `<em class="legtag">${lvl >= P.MAX_UPGRADE ? 'LEGGENDA COMPLETA' : lvl > P.LEGEND_FROM ? 'LEGGENDA ' + (lvl - P.LEGEND_FROM) + '/3' : 'PROSSIMO: LIVELLI LEGGENDA'}</em>` : ''}</span>
      <button type="button" class="buy" data-buy="${u.id}" ${can ? '' : 'disabled'}>${cost == null ? 'MAX' : cost + ' 🍺'}</button>
    </div>`;
  };
  const cur = P.currentBike();
  const bikeCard = b => {
    const owned = P.ownsBike(b.id), inUse = cur.id === b.id, locked = lvlNow < b.level, can = owned || (!locked && P.profile.beers >= b.price);
    const label = inUse ? 'IN SELLA' : owned ? 'USA' : locked ? '🔒 LIV ' + b.level : b.price + ' 🍺';
    return `<div class="upg bikecard ${inUse ? 'max' : ''} ${b.boanal ? 'boanal' : ''}"><span class="ui bimg"><img src="img/bike-${b.id}.webp?t=1" alt="${b.name}" loading="lazy"></span>
      <span class="ut"><b>${b.name}</b><small>${b.desc}</small>${statBars(b.stats)}</span>
      <button type="button" class="buy" data-bike="${b.id}" ${inUse || !can ? 'disabled' : ''}>${label}</button></div>`;
  };
  const parts = P.currentParts();
  const partRow = p => `<div class="ugroup">${p.name}</div><div class="chips">${p.items.map(it => {
    const owned = P.ownsPart(p.slot, it.id), on = parts[p.slot].id === it.id, can = owned || P.profile.beers >= it.price;
    return `<button type="button" class="chip ${on ? 'on' : ''} ${it.boanal || it.factory ? 'boanal' : ''}" data-part="${p.slot}:${it.id}" ${!on && !can ? 'disabled' : ''}>${it.color ? `<i style="background:${it.color}"></i>` : ''}<span>${it.name}${it.stats ? `<em class="chipstat">${P.statLabel(it.stats)}</em>` : ''}</span><small>${on ? '✔' : owned ? 'USA' : it.price + ' 🍺'}</small></button>`;
  }).join('')}</div>`;
  const studs = P.PARTS.find(p => p.slot === 'studs');
  const studCard = it => {
    const owned = P.ownsPart('studs', it.id), on = parts.studs.id === it.id, can = owned || P.profile.beers >= it.price;
    const g = it.stats?.grip || 0, d = it.stats?.drift || 0;
    return `<div class="upg bikecard ${on ? 'max' : ''} ${it.boanal || it.factory ? 'boanal' : ''}"><span class="ui">${it.factory ? '🏁' : it.boanal ? '💎' : it.id === 'none' ? '🛞' : '❄'}</span>
      <span class="ut"><b>${it.name}</b><small>${it.desc || ''}</small><div class="bstats"><span class="bs"><small>GRIP</small><span class="bar"><span class="fill ${g ? 'up' : ''}" style="width:${Math.min(100, Math.max(8, Math.round(g / .8 * 100)))}%"></span></span></span><span class="bs"><small>DERAPATA</small><span class="bar"><span class="fill ${d ? 'up' : ''}" style="width:${Math.min(100, Math.max(8, Math.round(d / .62 * 100)))}%"></span></span></span></div></span>
      <button type="button" class="buy" data-part="studs:${it.id}" ${on || !can ? 'disabled' : ''}>${on ? 'MONTATI' : owned ? 'MONTA' : it.price + ' 🍺'}</button></div>`;
  };
  const tabs = [['upg', '🔧 POTENZIAMENTI'], ['bikes', '🏍 MOTO'], ['parts', '🎨 ACCESSORI'], ['ice', '❄ CHIODI'], ['style', '✨ STILE']];
  $('card').innerHTML = `<div class="eyebrow">OFFICINA EDT · SPENDI LE BIRRE</div>
    <h1 class="shoptitle">${tab === 'style' ? 'FATTI<br><em>NOTARE.</em>' : tab === 'ice' ? 'CHIODI PER<br><em>ICE SCROPHY.</em>' : tab === 'bikes' ? 'SCEGLI<br><em>LA MOTO.</em>' : tab === 'parts' ? 'FALLA<br><em>TUA.</em>' : 'POTENZIA<br><em>MOTO E PILOTA.</em>'}</h1>
    <div class="wallet">🍺 <b>${P.profile.beers}</b> birre in cassa<small class="insella">In sella: ${cur.icon} ${cur.name}</small>${Object.keys(P.currentStats()).length ? `<small class="totstat">In gara: ${P.statLabel(P.currentStats())}</small>` : ''}</div>
    <div class="shoptabs">${tabs.map(([k, n]) => `<button type="button" class="${k === tab ? 'active' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
    ${tab === 'upg' ? ['MOTO', 'PILOTA', 'SPECIALI'].map(g => `<div class="ugroup">${g === 'SPECIALI' ? 'SPECIALI · PER CHI HA FINITO TUTTO' : g}</div><div class="upgs">${P.UPGRADES.filter(u => u.group === g).map(card).join('')}</div>`).join('')
      : tab === 'bikes' ? `<div class="upgs">${P.BIKES.map(bikeCard).join('')}</div><p class="tip">Ogni moto cambia davvero la guida. I potenziamenti valgono per tutte.</p>`
      : tab === 'style' ? `${P.PARTS.filter(p => p.style).map(partRow).join('')}<p class="tip">Lo stile non dà vantaggi in gara: si vede e basta (in gara, nel garage e al traguardo).</p>
        <div class="ugroup">🏆 COLLEZIONI · COMPLETALE PER UN TITOLO E UN PREMIO</div><div class="colls">${P.COLLECTIONS.map(c => { const pr = P.collectionProgress(c), done = pr.have >= pr.tot; return `<div class="coll ${done ? 'done' : ''}"><span class="ci">${c.icon}</span><span class="ct"><b>${c.name}</b><small>${c.desc} · premio ${c.prize} 🍺</small><span class="cbar"><span style="width:${Math.round(pr.have / pr.tot * 100)}%"></span></span></span><em>${done ? '✔' : pr.have + '/' + pr.tot}</em></div>`; }).join('')}</div>`
      : tab === 'ice' ? `<div class="upgs">${studs.items.map(studCard).join('')}</div><p class="tip">I chiodi contano solo su Ice Scrofy: <b>grip</b> = la moto tiene la linea e non finisce nel muro di neve; <b>derapata</b> = più punti per ogni traverso.</p>`
      : `${P.PARTS.filter(p => !p.ice && !p.style).map(partRow).join('')}<p class="tip">Gli accessori si vedono sulla moto (e dietro a questo menu). Una volta comprati restano tuoi.</p>`}
    <p class="tip">Le birre si guadagnano raccogliendole in gara (+20 se arrivi al rifugio, +10 per ogni missione). Sul <b>percorso della settimana</b> (${P.MODES.find(m => m.id === P.weeklyTrack())?.name}) valgono il doppio.</p>
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
  { const got = P.claimCollections(); if (got.length) { const c = got[0]; A.sfx.fanfare?.(); bigCall(c.icon + ' COLLEZIONE COMPLETA!'); toast(`🏅 ${c.name.toUpperCase()}: +${c.prize} 🍺 E IL TITOLO ACCANTO AL PILOTA`, 'gold'); renderShop(back); } }
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
  const heroList = P.SHOWN().filter(m => P.isUnlocked(m, info.level));
  const heroLead = d => { const top = d?.boards?.[mode]?.[0]; return top ? `👑 1° NEL GRUPPO: <b>${top.n}</b> · ${top.s.toLocaleString('it-IT')}` : '👑 NESSUNO IN CLASSIFICA: IL PRIMO SEI TU'; };
  $('card').innerHTML = `
    <div class="menuhead">
      <img class="menushield" src="img/edt-shield.webp" alt="" width="453" height="520">
      <div><div class="eyebrow"><span class="ebar"></span>ENDURO DRINKING TEAM · STAGIONE ${new Date().getFullYear()}</div>
      <h1 class="title"><span class="t1">TRANQUILLI,</span><span class="t2">È UN GIRO <em>EASY.</em></span></h1></div>
    </div>
    <div class="profilerow">
      <button class="pilotchip" id="pilotchip" type="button"><span class="platenum">${String(RIDERS.indexOf(profile.rider) + 1).padStart(2, '0')}</span>${avatarHTML(profile.rider)}<span class="pctext"><small>PILOTA · TOCCA PER CAMBIARE</small><b>${profile.rider}</b><em class="skillline"><span class="noicx">${sk.icon || ''}</span> ${sk.name || ''}</em>${P.bestTitle() ? `<em class="colltitle">${P.bestTitle()}</em>` : ''}</span></button>
      <div class="lvlbox"><span class="lvlnum"><small>LIV</small>${info.level}</span><span class="lvltext"><b>${info.grade.toUpperCase()}</b><i><u style="width:${Math.round(info.pct * 100)}%"></u></i><small>${info.into}/${info.need} XP</small></span></div>
    </div>
    <div class="trackhero sky${md.sky ?? 0} ${md.ice ? 'icy' : ''} ${art ? 'hasart' : ''} ${heroDir ? 'in' + heroDir : ''}" id="trackhero">
      ${art ? `<img class="trackart" src="${art}" alt="" onerror="if(!this.dataset.r){this.dataset.r=1;setTimeout(()=>this.src=this.src+'&r='+Date.now(),1500)}">` : ''}
      <div class="thtext"><span class="ps">PS${psOf(md)} · ${md.limit} s</span><b>${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name}</b><small>${md.id === 3 ? `<span class="dayrule">${dailyRule().icon} REGOLA DI OGGI: ${dailyRule().name}</span> ${dailyRule().desc}` : md.desc}</small>
      <span class="thchips"><span title="Difficoltà">🔥 ${'★'.repeat((md.difficulty || 0) + 1) + '☆'.repeat(2 - (md.difficulty || 0))}</span>${md.id === P.weeklyTrack() ? '<span class="wkchip">🔥 PERCORSO DELLA SETTIMANA · BIRRE ×2</span>' : ''}${variantOf(md.id) ? `<span class="var">🔄 VARIANTE ${VARIANT_NAMES[variantOf(md.id)]} DELLA SETTIMANA</span>` : ''}${!md.leap ? `<span class="gold" title="Boccali d’oro nascosti questa settimana">🏆 ${P.goldFound(md.id).filter(Boolean).length}/3 BOCCALI D’ORO</span>` : ''}${TRACK_INFO[md.id]?.tipo ? `<span class="tipo">${TRACK_INFO[md.id].tipo.split(' (')[0]}</span>` : ''}</span>
      ${md.random === 'run' ? '<span class="strip rnd"><i></i></span>' : stripHTML(layoutFor(md.id))}
      <span class="record">${icon('trophy')} ${best ? `RECORD ${md.id === 3 ? 'DI OGGI' : ''}: <b>${best.toLocaleString('it-IT')}</b>` : 'NESSUN RECORD: È IL MOMENTO'}</span>
      ${C.enabled() ? `<span class="thlead" id="thlead">${heroLead(C.cached())}</span>` : ''}</div>
      ${heroList.length > 1 ? `<button class="thnav prev" id="thprev" type="button" aria-label="Percorso precedente">‹</button><button class="thnav next" id="thnext" type="button" aria-label="Percorso successivo">›</button>
      <div class="thdots" aria-hidden="true">${heroList.map(m => `<i class="${m.id === mode ? 'on' : ''}"></i>`).join('')}</div>` : ''}
    </div>
    <button class="primary big startbtn" id="start"><span class="st"><span>ACCENDI LA MOTO</span><small>${P.pendingBoosts().length ? '🎁 ' + P.pendingBoosts().map(k => P.PRIZES.find(x => x.id === k)?.name).join(' · ') : (A.STYLES[mode] || A.STYLES[0]).name}</small></span>${icon('chevrons')}</button>
    <button class="secondary duelbtn" id="duelbtn" type="button">⚔️ SFIDA 1 CONTRO 1 DAL VIVO${duel && D.isOn() ? ' · CON ' + duel.opp.n.toUpperCase() : ''}</button>
    ${dailyChipHTML()}
    ${P.MODES[mode].leap ? '' : derbyChipHTML()}
    ${C.enabled() ? '<div class="potw" id="potw" hidden></div><button class="rivalbar" id="rivalbar" type="button" hidden></button>' : ''}
    ${C.enabled() ? '<button class="cupbar" id="cupbar" type="button" hidden><span class="cupi">🏆</span><span class="cupt"><small>COPPA DELLA SETTIMANA</small><b id="cuplead">…</b><em id="cupme"></em></span><span class="cupx" id="cupprev"></span></button>' : ''}
    <div class="quickrow">
      <button class="qbtn" id="opengarage" type="button"><span class="qi">🎨</span><b>GARAGE</b><small>livree e moto</small></button>
      <button class="qbtn" id="openshop" type="button"><span class="qi">🔧</span><b>OFFICINA</b><small>${P.profile.beers} 🍺</small></button>
      ${C.enabled() ? '<button class="qbtn" id="opengroup" type="button"><span class="qi">🏆</span><b>CLASSIFICA</b><small id="grouplead">del gruppo</small></button>' : ''}
      <button class="qbtn" id="openmissions" type="button" aria-expanded="false"><span class="qi">🏁</span><b>MISSIONI</b><small>${missions.length} attive · 🗓 ${P.weeklyMissions().filter(m => m.done).length}/3</small></button>
    </div>
    <div class="missions" id="missionbox" hidden><ul>${missionsHTML()}</ul><button class="linkbtn statsbtn" type="button" id="openstats">📊 STATISTICHE E TROFEI ›</button><div class="wkhead">🗓 MISSIONI DELLA SETTIMANA · uguali per tutti, cambiano il lunedì</div><ul class="weekly">${P.weeklyMissions().map(m => `<li class="${m.done ? 'done' : ''}"><span class="mtext">${m.done ? '✔ ' : ''}${m.text}</span><span class="mxp">+${m.beers} 🍺</span></li>`).join('')}</ul></div>
    <div class="mhead tracks">${icon('flag')} CAMBIA PERCORSO <button class="linkbtn alltracks" id="alltracks" type="button">📋 TUTTI I TRACCIATI ›</button></div>
    <div class="modes" role="radiogroup" aria-label="Percorso">
      ${P.SHOWN().map(m => { const open = P.isUnlocked(m, info.level), ta = trackArt(m); return `<button type="button" role="radio" class="mode sky${m.sky ?? 0} ${m.id === mode ? 'active' : ''} ${m.id === 3 ? 'daily' : ''} ${m.ice ? 'icy' : ''} ${open ? '' : 'locked'}" data-mode="${m.id}" aria-checked="${m.id === mode}" ${open ? '' : 'aria-disabled="true"'}>
        ${ta ? `<img class="modeart" loading="lazy" decoding="async" src="${ta}" alt="" onerror="if(!this.dataset.r){this.dataset.r=1;setTimeout(()=>this.src=this.src+'&r='+Date.now(),1500)}">` : ''}<span class="ps">PS${psOf(m)}</span><b>${m.id === 3 ? 'SFIDA ' + P.todayLabel() : m.short}</b><small>${open ? '⏱ ' + m.limit + ' s' : '🔒 LIV ' + m.unlock}</small>${m.id === P.weeklyTrack() ? '<i class="wktrack">🔥 BIRRE ×2</i>' : ''}</button>`; }).join('')}
    </div>
    <div class="menufoot">
      <button class="mini" id="testvoci" type="button">🔊 PROVA VOCI</button><button class="mini" id="musicmenu" type="button">${A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO'}</button>${touchDevice ? `<button class="mini ${tiltOn ? 'on' : ''}" id="tiltmenu" type="button">📱 STERZO INCLINANDO: ${tiltOn ? 'SÌ' : 'NO'}</button>` : ''}${touchDevice && navigator.vibrate ? `<button class="mini ${hapticOn ? 'on' : ''}" id="vibramenu" type="button">📳 VIBRAZIONE: ${hapticOn ? 'SÌ' : 'NO'}</button>` : ''}
      ${inFull() ? '<button class="mini" id="homebtn" type="button">🏠 ESCI DA SCHERMO INTERO</button>' : ''}
    </div>
    <p class="tip"><span class="desktophint">🖱 Mouse: muovi per sterzare · clic salta · destro gas · rotellina turbo — oppure ← → · SPAZIO · W · B</span><span class="mobilehint">👆 Tieni il dito a sinistra/destra o trascinalo per sterzare · tocca al centro per saltare</span></p>`;
  if ($('openstats')) $('openstats').onclick = () => { A.sfx.click(); showStats(); };
  $('openmissions').onclick = () => { const box = $('missionbox'), open = box.hidden; box.hidden = !open; $('openmissions').setAttribute('aria-expanded', String(open)); $('openmissions').classList.toggle('on', open); A.sfx.click(); };
  requestAnimationFrame(() => { const act = document.querySelector('.modes .mode.active'); if (act) act.parentElement.scrollLeft = act.offsetLeft - act.parentElement.clientWidth / 2 + act.offsetWidth / 2; });
  iconizeEl($('card'));
  $('start').onclick = () => { if (duel) duel.racing = false; start(); };
  $('duelbtn').onclick = () => { A.sfx.click(); renderDuel(); };
  $('openshop').onclick = () => renderShop(renderReady);
  $('opengarage').onclick = () => { A.sfx.click(); showHub('garage'); const sec = document.querySelector('[data-hub="garage"]'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('alltracks').onclick = () => { A.sfx.click(); renderTracks(renderReady); };
  if ($('vibramenu')) $('vibramenu').onclick = () => { hapticOn = !hapticOn; try { localStorage.setItem('edt-vibra', hapticOn ? '1' : '0'); } catch {} $('vibramenu').textContent = '📳 VIBRAZIONE: ' + (hapticOn ? 'SÌ' : 'NO'); $('vibramenu').classList.toggle('on', hapticOn); if (hapticOn) buzz([40, 50, 40]); };
  if ($('tiltmenu')) $('tiltmenu').onclick = async () => { const on = await setTilt(!tiltOn); $('tiltmenu').textContent = '📱 STERZO INCLINANDO: ' + (on ? 'SÌ' : 'NO'); $('tiltmenu').classList.toggle('on', on); if (on) toast('📱 INCLINA IL TELEFONO A DESTRA E SINISTRA PER STERZARE', 'green'); };
  $('musicmenu').onclick = () => {
    A.unlock(); A.setMusic(!A.isMusicOn()); $('musicmenu').innerHTML = iconize(A.isMusicOn() ? '🎵 MUSICA: SÌ' : '🔇 MUSICA: NO');
    if (A.isMusicOn()) { startMusic(); setTimeout(() => { if (state === 'ready') A.musicStop(); }, 6000); } else A.musicStop();
  };
  if ($('opengroup')) {
    $('opengroup').onclick = () => { showHub('classifica'); renderGroup(renderReady, mode); };
    C.load().then(d => { const top = d.boards?.[mode]?.[0]; if ($('thlead')) $('thlead').innerHTML = heroLead(d); if ($('grouplead')) $('grouplead').textContent = top ? `1° ${top.n} · ${top.s.toLocaleString('it-IT')}` : 'nessuno ancora: vai!'; cupBar(d); rivalBar(d); setTimeout(() => checkOvertakes(d), 400); }).catch(() => {});
    rivalBar(C.cached());
    if ($('cupbar')) { cupBar(C.cached()); $('cupbar').onclick = () => { A.sfx.click(); showHub('classifica'); renderGroup(renderReady, 'cup'); }; }
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
  // v103 · scheda percorso scorrevole: frecce o swipe per cambiare percorso
  const heroGo = dir => {
    const i = heroList.findIndex(m => m.id === mode), n = heroList[(i + dir + heroList.length) % heroList.length];
    if (!n || n.id === mode) return;
    mode = n.id; profile.mode = mode; P.save(); A.sfx.click(); heroDir = dir > 0 ? 'r' : 'l';
    renderReady(); renderSide(); heroDir = '';
  };
  if ($('thprev')) { $('thprev').onclick = () => heroGo(-1); $('thnext').onclick = () => heroGo(1); }
  const th = $('trackhero');
  if (th && heroList.length > 1) {
    let sx = 0, sy = 0, on = false;
    th.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = true; }, { passive: true });
    th.addEventListener('touchend', e => { if (!on) return; on = false; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) heroGo(dx < 0 ? 1 : -1); }, { passive: true });
  }
  setDisabled(false);
  hud();
}

// Classifica derapate di Ice Scrofy (tu + i tre compagni).
function iceTable(win) {
  const rows = [{ n: profile.rider, d: Math.round(driftScore), me: true }, ...rivals.map(r => ({ n: r.name, d: Math.round(r.drift) }))].sort((a, b) => b.d - a.d);
  return `<br>❄ <b>${run.position}° su ${rows.length}</b> nella gara di derapate${run.position === 1 && win ? ' · re del ghiaccio +500' : ''}<span class="icetable">${rows.map((r, i) => `<span class="${r.me ? 'me' : ''}"><i>${i + 1}°</i>${r.n}<b>${r.d.toLocaleString('it-IT')}</b></span>`).join('')}</span>`;
}
// v107.6 · risultati: MENU e UN ALTRO GIRO sempre in alto (su tablet i bottoni in fondo restavano fuori schermo)
document.addEventListener('click', e => {
  if (state !== 'ended') return;
  if (e.target.closest('#resmenu')) { A.sfx.click(); renderReady(); }
  else if (e.target.closest('#resagain')) $('again')?.click();
});
function renderResult(win, res, reason = '', timeBonus = 0) {
  const rank = win ? (score >= 30000 ? 'LEGGENDA EDT' : score >= 15000 ? 'MANICO DEL GIORNO' : 'MISSIONE COMPIUTA') : 'GIRO DIVERSAMENTE EASY';
  const md = P.MODES[mode];
  const xpTotal = res.scoreXp + res.missionsXp;
  $('overlay').classList.remove('hidden');
  setMenu(true);
  $('card').innerHTML = `
    <div class="restop"><button class="resmenu" id="resmenu" type="button">⬅ MENU</button><button class="resagain" id="resagain" type="button">UN ALTRO GIRO ›</button></div>
    <div class="eyebrow">${rank} · ${md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name.toUpperCase()}</div>
    <div class="resulthead">${avatarHTML(profile.rider, 'big')}<h1>${leap ? (win ? `${leapBest.toFixed(1).replace('.', ',')} METRI<br><em>IN PIEDI!</em>` : 'SALTO<br><em>NULLO.</em>') : gev ? (win ? 'SEMINATE<br><em>LE GEV!</em>' : reason === 'time' ? 'TI HANNO<br><em>RAGGIUNTO.</em>' : 'MULTA!<br><em>VERBALE EDT.</em>') : ice && win && run.position === 1 ? 'RE DEL<br><em>GHIACCIO!</em>' : win ? 'COSÌ<br><em>SI FA!</em>' : reason === 'time' ? 'FUORI TEMPO<br><em>MASSIMO.</em>' : 'COLPA<br><em>DI ANGELO.</em>'}</h1></div>
    <div class="scoreticket ${res.isRecord ? 'record' : ''}"><b id="finalscore">0</b><span>PUNTI EDT</span>${res.isRecord ? '<i class="stamp">NUOVO RECORD!</i>' : ''}</div>
    ${gev && !win ? gevVerbale() : ''}<p class="resulttext">${gev && win ? '<b>Niente verbali, più boccali!</b> ' : ''}${profile.rider} ${gev && !win ? `è stato fermato dalle GEV al ${Math.floor(course / GAME_LENGTH * 100)}% del percorso.` : win ? `è arrivato al rifugio in <b>${elapsed.toFixed(1).replace('.', ',')} s</b>${timeBonus ? ` · bonus tempo +${timeBonus.toLocaleString('it-IT')}` : ''}.` : reason === 'time' ? `si è fermato al ${Math.floor(course / GAME_LENGTH * 100)}% del percorso. Al rifugio hanno già chiuso la cucina.` : 'ci ha creduto fino all’ultimo. “Dopo migliora”, dicevano.'}
      ${ice ? iceTable(win) : ''}${run.position && !ice ? `<br>🏁 <b>${run.position}° su ${rivals.length + 1}</b> nel gruppo${run.position === 1 && win ? ' · primo al rifugio +500' : ''}${run.shortcuts ? ' · ' + run.shortcuts + (run.shortcuts > 1 ? ' tagli' : ' taglio') + ' di Angelo' : ''}` : ''}      ${res.position ? `<br><b>${res.position}° su questo telefono</b>` : ''}${earsPermanent ? '<br>🐰 Finito con le orecchie da coniglio (più di 3 errori).' : ''}${run.ghostRecord ? '<br>👻 Miglior tempo al rifugio: ' + run.finishTime.toFixed(1).replace('.', ',') + ' s — il tuo fantasma ti aspetta al prossimo giro.' : ''}${!res.isRecord && res.previousBest ? ` · record: ${res.previousBest.toLocaleString('it-IT')}` : ''}</p>
    <div class="resultstats">
      <div><b>${run.caps}</b><small>BIRRE</small></div>
      ${ice ? `<div><b>${driftCount}</b><small>DERAPATE</small></div><div><b>${driftBest.toLocaleString('it-IT')}</b><small>LA PIÙ BELLA</small></div><div><b>${Math.round(driftM)} m</b><small>DI TRAVERSO</small></div>` : `<div><b>${run.jumps}</b><small>SALTI</small></div>`}
      <div><b>${run.wheelieMax ? run.wheelieMax.toFixed(1).replace('.', ',') + 's' : run.perfect}</b><small>${run.wheelieMax ? 'IMPENNATA' : 'PERFETTI'}</small></div>
      <div><b>×${run.maxMult}</b><small>COMBO MAX</small></div>
      <div><b>${win ? elapsed.toFixed(1).replace('.', ',') + 's' : Math.floor(course / GAME_LENGTH * 100) + '%'}</b><small>${win ? 'TEMPO' : 'PERCORSO'}</small></div>
    </div>
    ${res.weeklyDone?.length ? `<div class="donelist weeklydone">${res.weeklyDone.map(c => `<div><span>🗓 MISSIONE DELLA SETTIMANA: ${c.text}</span><b>+${c.beers} 🍺</b></div>`).join('')}</div>` : ''}
    ${res.completed.length ? `<div class="donelist">${res.completed.map(c => `<div><span>✔ ${c.text}</span><b>+${c.xp} XP</b></div>`).join('')}</div>` : ''}
    <div class="loot">
      ${res.derby ? `<div class="derbywin">⚔ <span>DERBY DEL GIORNO VINTO: ${res.derby.text}</span><b>+${res.derby.beers} 🍺</b></div>` : ''}
      <div class="beerline">🍺 <b>+${res.beersEarned}</b> birre portate al rifugio${res.weeklyX2 ? ' <em class="wkx2">🔥 ×2 PERCORSO DELLA SETTIMANA</em>' : ''} <small>in cassa: ${res.wallet} 🍺</small></div>
      ${res.prize ? `<div class="prize"><span class="pi">${res.prize.icon}</span><span><small>PREMIO DEL RIFUGIO</small><b>${res.prize.name}${res.prize.amount ? ' +' + res.prize.amount + ' 🍺' : ''}</b>${res.prize.amount ? '' : '<em>' + res.prize.desc + ' (prossimo giro)</em>'}</span></div>` : `<div class="noprize">Arriva al rifugio per vincere un premio.</div>`}
    </div>
    <div class="xpline">+${xpTotal} XP ${res.after.level > res.before.level ? `· <b class="lvup">LIVELLO ${res.after.level}: ${res.after.grade.toUpperCase()}!</b>` : ''}</div>
    ${levelBar(res.after)}
    ${res.after.level > res.before.level ? P.SHOWN().filter(m => m.unlock > res.before.level && m.unlock <= res.after.level).map(m => `<div class="unlock track"><i class="ic-holder">🏁</i><span>NUOVO PERCORSO SBLOCCATO: <b>${m.name}</b></span></div>`).join('') : ''}
    ${(res.trophiesNew || []).map(t => `<div class="unlock trophy"><i class="ic-holder">${t.icon}</i><span>NUOVO TROFEO: <b>${t.name}</b> · ${t.desc}</span></div>`).join('')}
    ${res.unlocked.map(l => `<div class="unlock"><i style="--a:${l.plastic};--b:${l.accent}"></i><span>NUOVA LIVREA SBLOCCATA: <b>${l.name}</b> · sceglila nel garage</span></div>`).join('')}
    ${duel?.racing ? '<div class="duelres" id="duelres"></div>' : ''}
    ${C.enabled() && score > 0 ? '<div class="groupres" id="groupres"></div>' : ''}
    <button class="cardprev" id="cardprev" type="button"><img alt="Cartolina del risultato" src="${cardURL || 'data:,'}"><span><b>📸 LA TUA CARTOLINA</b><small>Toccala e mandala nel gruppo WhatsApp: risultato, posizione e link per giocare.</small></span></button>
    <div class="actions">
      <button class="primary big" id="again"><span>UN ALTRO GIRO</span>${icon('chevrons')}</button>
      <button class="secondary hot" id="shareScore">📸 MANDA LA CARTOLINA</button>
      ${ghostChallengeHTML(score)}
      ${replayReady() ? '<button class="secondary replaybtn" id="replaybtn" type="button">🎬 RIVEDI GLI ULTIMI 10 s</button><button class="secondary replaybtn hot" id="replayvid" type="button">🎥 CLIP DEL GIRO (VIDEO PER LE STORIE)</button>' : ''}
      <button class="secondary shopsec" id="shopres">🔧 OFFICINA</button>
      <button class="secondary" id="menu">MENU</button>
    </div>`;
  iconizeEl($('card'));
  $('again').onclick = () => { if (duel?.racing && D.isOn()) renderDuel(); else { if (duel) duel.racing = false; start(); } };
  drawDuelResult();
  $('menu').onclick = renderReady;
  $('shopres').onclick = () => renderShop(renderReady);
  $('shareScore').onclick = $('cardprev').onclick = () => shareScore(win, res);
  cardCtx = { win, res }; refreshCardPreview();
  const bindResult = () => { $('cardprev').onclick = () => shareScore(win, res); refreshCardPreview(); $('again').onclick = () => { if (duel?.racing && D.isOn()) renderDuel(); else { if (duel) duel.racing = false; start(); } }; drawDuelResult(); $('menu').onclick = renderReady; $('shopres').onclick = () => renderShop(renderReady); $('shareScore').onclick = () => shareScore(win, res); if ($('finalscore')) $('finalscore').textContent = score.toLocaleString('it-IT'); if ($('groupres') && lastGroupRun) groupResult(lastGroupRun); };
  resultSnapshot = { html: $('card').innerHTML, bind: bindResult };
  const gOK = win && !ice && P.MODES[mode].random !== 'run';
  if ($('groupres')) groupResult({ score, mode, rider: profile.rider, time: ice ? Math.round(driftM * 10) / 10 : win ? (leap ? leapBest : elapsed) : 0, win, g: gOK ? C.encodeGhost([...ghostSplits, GAME_LENGTH]) : '' });
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
function groupListHTML(list, me = '', m = -1) {
  if (!list?.length) return '<li class="empty">Ancora nessuno qui: il primo posto è libero.</li>';
  const mine = C.cleanNick(me).toLowerCase();
  return list.map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${mine && e.n.toLowerCase() === mine ? 'me' : ''}"><span class="pos">${i + 1}</span>${RIDERS.includes(e.r) ? avatarHTML(e.r, 'tiny') : '<i class="noav"></i>'}<span class="who">${e.n}${crownOf(e.n)}${e.r && e.r !== e.n ? `<small>${e.r}</small>` : ''}${e.b != null ? `<small class="bikelv" title="livello moto${e.b >= 75 ? ' · livelli Leggenda' : ''}">${e.b >= 120 ? '👑' : e.b >= 100 ? '💎' : e.b >= 76 ? '🏅' : '🔧'}${e.b}</small>` : ''}</span><span class="when">${m === C.ICE_MODE && e.t ? '🌀 ' + C.fmtMetres(e.t) : m === C.JUMP_MODE && e.s % 10 === 7 && e.w && e.t ? '📏 ' + C.fmtJump(e.t) : e.bt ? '⏱ ' + C.fmtTime(e.bt) : e.w && e.t ? '⏱ ' + C.fmtTime(e.t) : ''}</span><b>${e.s.toLocaleString('it-IT')}</b></li>`).join('');
}
// v48 · classifica dei tempi migliori al rifugio
function timeListHTML(list, me = '', m = -1) {
  const jumpB = m === C.JUMP_MODE, iceB = m === C.ICE_MODE, fmt = jumpB ? C.fmtJump : iceB ? C.fmtMetres : C.fmtTime;
  if (!list?.length) return `<li class="empty">${jumpB ? 'Nessun salto atterrato in piedi qui.' : iceB ? 'Nessuna derapata in classifica qui.' : 'Nessuno è ancora arrivato al rifugio qui.'}</li>`;
  const mine = C.cleanNick(me).toLowerCase();
  return list.slice(0, 10).map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${mine && e.n.toLowerCase() === mine ? 'me' : ''}"><span class="pos">${i + 1}</span>${RIDERS.includes(e.r) ? avatarHTML(e.r, 'tiny') : '<i class="noav"></i>'}<span class="who">${e.n}${e.r && e.r !== e.n ? `<small>${e.r}</small>` : ''}</span><span class="when">${e.s ? e.s.toLocaleString('it-IT') + ' pt' : ''}</span><b>${jumpB ? '📏' : iceB ? '🌀' : '⏱'} ${fmt(e.t)}</b></li>`).join('');
}
let groupKind = 'score';
// v78 · Coppa della settimana: punti 10-8-6-5-4-3-2-1 ai primi 8 di ogni percorso (settimana da lunedì a domenica)
const CUP_PTS = [10, 8, 6, 5, 4, 3, 2, 1];
function cupDaysLeft() { const d = new Date().getDay(); return d === 0 ? 0 : 7 - d; }
function cupMine(w, nick = C.getNick()) { if (!w || !nick) return null; const i = w.list.findIndex(e => e.n.toLowerCase() === nick.toLowerCase()); return i >= 0 ? { pos: i + 1, ...w.list[i] } : null; }
function cupListHTML(list, me = '') {
  if (!list?.length) return '<li class="empty">Questa settimana nessuno ha ancora corso: la coppa è libera.</li>';
  const mine = C.cleanNick(me).toLowerCase();
  return list.slice(0, 15).map((e, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${mine && e.n.toLowerCase() === mine ? 'me' : ''}"><span class="pos">${i + 1}</span>${RIDERS.includes(e.r) ? avatarHTML(e.r, 'tiny') : '<i class="noav"></i>'}<span class="who">${e.n}${e.r && e.r !== e.n ? `<small>${e.r}</small>` : ''}</span><span class="when">${e.w ? '🥇×' + e.w + ' · ' : ''}${e.c} ${e.c === 1 ? 'percorso' : 'percorsi'}</span><b>${e.p} pt</b></li>`).join('');
}
function cupBar(d) {
  const bar = $('cupbar'); if (!bar) return;
  const w = d?.week; if (!w) { bar.hidden = true; potwCard(null); return; }
  bar.hidden = false;
  const lead = w.list[0], me = cupMine(w), left = cupDaysLeft();
  $('cuplead').textContent = lead ? `1° ${lead.n} · ${lead.p} pt` : 'nessuno ancora: prendila tu!';
  $('cupme').textContent = (me ? `tu ${me.pos}° · ${me.p} pt · ` : '') + (left ? `finisce tra ${left} ${left === 1 ? 'giorno' : 'giorni'}` : 'ultimo giorno!');
  $('cupprev').innerHTML = '';
  potwCard(w);
  showPodium(w);
}
// v96 · statistiche di sempre del pilota
function showStats() {
  const st = P.stats(), f = n => Math.round(n || 0).toLocaleString('it-IT');
  const rows = [['🏁', 'Gare', f(st.runs)], ['🥇', 'Vittorie', f(st.wins)], ['🏆', 'Podi', f(st.podi)], ['🛖', 'Arrivi al rifugio', f(st.finished)],
    ['🛣', 'Chilometri', (st.km || 0).toFixed(1).replace('.', ',') + ' km'], ['🦘', 'Salti', f(st.jumps)], ['🍺', 'Birre raccolte', f(st.caps)], ['⚡', 'Turbo usati', f(st.turbos)],
    ['🚀', 'Partenze a razzo', f(st.holeshots)], ['🍻', 'Soste al bar', f(st.bars)], ['💥', 'Botte prese', f(st.hits)], ['🗓', 'Missioni settimanali', f(st.weekly)],
    ['🌀', 'Metri di derapata (totale)', f(st.driftM) + ' m'], ['❄', 'Derapata più lunga in un giro', f(st.bestDrift) + ' m'], ['📏', 'Salto più lungo', (st.bestLeap || 0).toFixed(1).replace('.', ',') + ' m'], ['🌲', 'Slalom più lungo', '×' + f(st.bestSlalom)]];
  const best = Object.entries(st.best || {}).map(([m, t]) => `<li><span>${P.MODES[m]?.name || m}</span><b>⏱ ${String(t).replace('.', ',')} s</b></li>`).join('');
  const el = document.createElement('div'); el.className = 'podium'; el.id = 'statsbox';
  el.innerHTML = `<div class="podbox statsbox"><small>${profile.rider.toUpperCase()}${C.getNick() ? ' · ' + C.getNick() : ''}</small><b class="podtitle">STATISTICHE</b>
    <ul class="statgrid">${rows.map(r => `<li><i>${r[0]}</i><span>${r[1]}</span><b>${r[2]}</b></li>`).join('')}</ul>
    ${best ? `<div class="wkhead">⏱ TEMPI MIGLIORI AL RIFUGIO</div><ul class="statbest">${best}</ul>` : ''}
    <div class="wkhead">🏅 BACHECA TROFEI · ${P.TROPHIES.filter(t => P.trophies()[t.id]).length}/${P.TROPHIES.length}</div>
    <ul class="trophies">${P.TROPHIES.map(t => { const d = P.trophies()[t.id]; return `<li class="${d ? 'got' : ''}"><i>${t.icon}</i><b>${t.name}</b><small>${t.desc}</small></li>`; }).join('')}</ul>
    <div class="wkhead">🏆 BOCCALI D’ORO · questa settimana ${P.goldWeekTotal()} · in tutto ${P.profile.goldTotal || 0}</div>
    ${st.runs ? '' : '<p>Si contano da questa versione in poi: fai un giro!</p>'}
    <button class="primary" type="button" id="statsok"><span>CHIUDI</span></button></div>`;
  topLayer().appendChild(el); $('statsok').onclick = () => el.remove();
}
// v96 · podio del lunedì: alla prima apertura della settimana i primi 3 della coppa appena finita
function showPodium(w) {
  if (!w?.prev3?.length || state !== 'ready') return;
  let seen = ''; try { seen = localStorage.getItem('edt-podio') || ''; } catch {}
  if (seen === w.from) return;
  try { localStorage.setItem('edt-podio', w.from); } catch {}
  const order = [1, 0, 2].filter(i => w.prev3[i]), me = C.getNick().toLowerCase();
  const el = document.createElement('div'); el.className = 'podium'; el.id = 'podium';
  el.innerHTML = `<div class="podbox"><small>COPPA DELLA SETTIMANA SCORSA</small><b class="podtitle">IL PODIO</b>
    <div class="podsteps">${order.map(i => { const e = w.prev3[i]; return `<div class="pstep p${i + 1} ${e.n.toLowerCase() === me ? 'me' : ''}">${RIDERS.includes(e.r) ? avatarHTML(e.r) : '<i class="noav"></i>'}<b>${e.n}</b><em>${e.p} pt</em><span>${['🥇', '🥈', '🥉'][i]}</span></div>`; }).join('')}</div>
    <p>${w.prev3[0].n} porta la 👑 accanto al nome per tutta la settimana. Nuova coppa: si riparte da zero!</p>
    <a class="wabtn" target="_blank" rel="noopener" href="${waLink('🏆 Coppa della settimana di Giro Easy: ' + w.prev3.map((e, i) => ['🥇', '🥈', '🥉'][i] + ' ' + e.n + ' (' + e.p + ' pt)').join(' · ') + '. Da oggi si riparte da zero, chi la vince questa settimana? 👉 ' + publicGameURL)}">📲 MANDA IL PODIO AL GRUPPO</a>
    <button class="primary" type="button" id="podok"><span>VAI!</span></button></div>`;
  topLayer().appendChild(el);
  A.sfx.perfect?.();
  $('podok').onclick = () => el.remove();
}
// v106.6 · festa al traguardo (stile comprato in officina): coriandoli, pioggia di birre o fuochi d'artificio
function celebrate(kind) {
  if (!kind || kind === 'nessuna') return;
  const g = $('game'), box = document.createElement('div'); box.className = 'festa festa-' + kind;
  const cols = ['#ffc61a', '#111', '#e93825', '#fff'];
  for (let i = 0; i < (kind === 'fuochi' ? 12 : 42); i++) {
    const e = document.createElement('i');
    if (kind === 'fuochi') { e.style.left = (10 + Math.random() * 80) + '%'; e.style.top = (8 + Math.random() * 40) + '%'; e.style.setProperty('--c', ['#ffc61a', '#ff5a3a', '#5fd4ff', '#b45cff', '#46ff5a'][i % 5]); e.style.animationDelay = (i * .3) + 's'; }
    else { e.style.left = Math.random() * 100 + '%'; e.style.animationDelay = (Math.random() * 1.6) + 's'; e.style.animationDuration = (2 + Math.random() * 1.6) + 's'; if (kind === 'birre') e.innerHTML = icon('beer'); else e.style.background = cols[i % 4]; }
    box.appendChild(e);
  }
  g.appendChild(box); setTimeout(() => box.remove(), 5200);
}
// v106.5 · "batti il mio fantasma": link per WhatsApp; chi lo apre corre contro il tuo fantasma su quel percorso
function ghostChallengeHTML(sc) {
  const md = P.MODES[mode], nick = C.getNick();
  if (!C.enabled() || !nick || sc <= 0 || duel?.racing || md.ice || md.leap || md.random) return '';
  const url = publicGameURL + '?fantasma=' + encodeURIComponent(nick) + '&p=' + mode;
  const text = `👻 ${nick} ti sfida su ${trackName(mode)} a Giro Easy: il suo record è in classifica. Batti il suo fantasma 👉 ${url}`;
  return `<a class="secondary wabtn ghostbtn" target="_blank" rel="noopener" href="${waLink(text)}">👻 SFIDA UN AMICO A BATTERE IL TUO FANTASMA</a>`;
}
// v107.3 · Forziere del giorno: al primo giro di ogni giorno birre gratis, di più se torni tutti i giorni di fila
const dotsHTML = (n, now = 0) => `<span class="chdots">${P.CHEST.map((b, i) => `<i class="${i < n ? 'on' : ''} ${i === now - 1 ? 'now' : ''}" title="giorno ${i + 1}: +${b}"><u>${i + 1}</u></i>`).join('')}</span>`;
function dailyChipHTML() {
  const d = P.dailyInfo(), shirt = P.LIVERIES.find(l => l.streak), needShirt = shirt && !P.liveryOpen(shirt);
  const sub = d.done ? `Preso! Torna domani: <b>+${P.CHEST[Math.min(d.next + 1, P.CHEST.length) - 1]} 🍺</b>` : `Fai un giro oggi e prendi <b>+${d.beers} 🍺</b>`;
  const note = d.lost ? `Ieri non sei passato: serie azzerata (eri a ${d.lost})` : needShirt ? `${shirt.streak} giorni di fila = la maglia “Sono un endurista semplice”` : d.done ? `${d.streak} ${d.streak === 1 ? 'giorno' : 'giorni'} di fila` : d.streak ? `${d.streak} ${d.streak === 1 ? 'giorno' : 'giorni'} di fila: non spezzare la serie` : '7 giorni di fila = +120 🍺 al giorno';
  // v107.4 · promemoria: se hai una serie aperta e oggi non hai ancora corso, il riquadro lo dice chiaro; da 3 giorni ti puoi vantare nel gruppo
  const risk = !d.done && d.streak >= 2, brag = d.done && d.streak >= 3;
  const note2 = risk ? `Oggi o perdi la serie di ${d.streak} giorni!` : note;
  const wa = brag ? `<a class="chwa" target="_blank" rel="noopener" href="${waLink(`🎁 Sono a ${d.streak} giorni di fila sul Giro Easy dell'EDT. Voi a quanti siete? 👉 ${publicGameURL}`)}">VANTATI</a>` : '';
  return `<div class="dailychip ${d.done ? 'done' : 'ready'} ${risk ? 'risk' : ''}" id="dailychip"><span class="chi">🎁</span><span class="cht"><small>${risk ? 'SERIE IN PERICOLO' : 'FORZIERE DEL GIORNO'}</small><b>${sub}</b><em>${note2}</em></span>${wa}${dotsHTML(d.done ? d.streak : d.streak, d.done ? 0 : d.next)}</div>`;
}
let pendingChest = null;
function showChest(c) {
  if (!c) return;
  const el = document.createElement('div'); el.className = 'podium chestpop'; el.id = 'chestpop';
  el.innerHTML = `<div class="podbox chestbox"><small>${c.n === 1 ? 'PRIMO GIRO DI OGGI' : c.n + ' GIORNI DI FILA'}</small><b class="podtitle">FORZIERE DEL GIORNO</b>
    <div class="chest"><i class="lid"></i><i class="box"></i><span class="chbeer">+${c.beers} 🍺</span></div>
    ${dotsHTML(c.n, c.n)}
    ${c.lost ? `<p class="chlost">Ieri hai saltato: la serie da ${c.lost} giorni è ripartita da 1.</p>` : ''}
    ${c.fresh.length ? `<div class="chshirt"><img src="img/maglia-${c.fresh[0].shirt || 'semplice'}.webp" alt=""><span>MAGLIA SBLOCCATA: <b>${c.fresh[0].name.toUpperCase()}</b><small>la trovi nel garage, tra le livree</small></span></div>` : ''}
    <p>Torna domani: <b>+${c.tomorrow} 🍺</b>. Se salti un giorno si riparte da capo. <small>In cassa: ${c.wallet} 🍺</small></p>
    <button class="primary" type="button" id="chestok"><span>${c.fresh.length ? 'LA METTO SUBITO' : 'ALLA SALUTE'}</span></button></div>`;
  topLayer().appendChild(el); iconizeEl(el);
  A.sfx.perfect?.(); buzz([40, 60, 40, 60, 120]);
  requestAnimationFrame(() => el.classList.add('open'));
  $('chestok').onclick = () => { if (c.fresh.length) { profile.livery = c.fresh[0].id; P.save(); } el.remove(); A.sfx.click(); renderSide(); };
}
// v107.4 · DERBY DEL GIORNO: due piloti EDT a sorte (uguali per tutti), sempre in gara; batterli dà birre una volta al giorno
function derbyPair(day = P.todayKey()) {
  const n = RIDERS.length; let h = day % 2147483647; const nx = () => (h = (h * 48271) % 2147483647) / 2147483647;
  nx(); nx(); const a = Math.floor(nx() * n); let b = Math.floor(nx() * (n - 1)); if (b >= a) b++;
  return [RIDERS[a], RIDERS[b]];
}
const DERBY_JAB = ['{w} offre il giro di birre a {l}', '{l} dice che la moto tirava a destra', '{l} stasera paga pegno', '{w} comanda, {l} spinge', '{l} chiede la rivincita al bar'];
function derbyCheck(win) {
  if (!win || P.profile.derbyDay === P.todayKey()) return null;
  const pair = derbyPair(), me = pair.includes(profile.rider), opp = rivals.filter(r => r.derby);
  if (!opp.length) return null;
  const beat = r => ice ? r.drift < driftScore : r.gap < 0;
  if (!opp.every(beat)) return null;
  const nm = n => n.replace(/^Il /, '');
  return me ? { beers: 30, text: (nm(profile.rider) + ' BATTE ' + nm(opp[0].name)).toUpperCase(), jab: dayPick(DERBY_JAB).replace('{w}', nm(profile.rider)).replace('{l}', nm(opp[0].name)) }
    : { beers: 20, text: 'DAVANTI A ' + opp.map(r => nm(r.name).toUpperCase()).join(' E '), jab: '' };
}
function derbyChipHTML() {
  const [a, b] = derbyPair(), me = profile.rider === a ? b : profile.rider === b ? a : null, done = P.profile.derbyDay === P.todayKey();
  const nm = n => n.replace(/^Il /, '');
  const sub = done ? 'Vinto oggi: torna domani per il prossimo derby' : me ? `Sei nel derby: arriva davanti a ${nm(me)} e prendi <b>+30 🍺</b>` : `Arriva al rifugio davanti a tutti e due: <b>+20 🍺</b>`;
  return `<div class="derbychip ${done ? 'done' : ''}" id="derbychip">${avatarHTML(a)}<span class="dzvs">VS</span>${avatarHTML(b)}<span class="dzt"><small>DERBY DEL GIORNO</small><b>${nm(a)} contro ${nm(b)}</b><em>${sub}</em></span></div>`;
}
// v107.4 · rivale personale: il compagno che ti sta subito davanti nella classifica del gruppo, col suo fantasma da battere
function rivalBar(d) {
  const el = $('rivalbar'); if (!el) return;
  const md = P.MODES[mode], bl = d?.boards?.[mode] || [], nick = C.cleanNick(C.getNick() || '').toLowerCase();
  if (!bl.length || md.leap) { el.hidden = true; return; }
  const i = nick ? bl.findIndex(e => e.n.toLowerCase() === nick) : -1, mine = i >= 0 ? bl[i] : null;
  let r, txt;
  const pts = n => Math.round(n).toLocaleString('it-IT'), what = md.ice ? 'punti derapata' : 'punti';
  if (i === 0) { r = bl[1]; if (!r) { el.hidden = true; return; } txt = `<small>SEI 1° SU ${md.short}</small><b>${r.n} ti insegue</b><em>è a ${pts(mine.s - r.s)} ${what} da te: difendi il trono</em>`; }
  else if (i > 0) { r = bl[i - 1]; txt = `<small>IL TUO RIVALE SU ${md.short} · SEI ${i + 1}°</small><b>${r.n} ${i}°</b><em>ti mancano ${pts(r.s - mine.s + 1)} ${what} per passarlo</em>`; }
  else { r = bl[Math.min(bl.length, 10) - 1]; txt = `<small>NON SEI ANCORA IN CLASSIFICA SU ${md.short}</small><b>Batti ${r.n}</b><em>ultimo dei primi ${Math.min(bl.length, 10)} con ${pts(r.s)} ${what}</em>`; }
  const ghost = !!(r.g && r.g.length > 8 && !md.ice && md.random !== 'run');
  el.hidden = false;
  el.innerHTML = `${RIDERS.includes(r.r) ? avatarHTML(r.r) : '<i class="noav"></i>'}<span class="rvt">${txt}</span><span class="rvgo">${ghost && i !== 0 ? '👻 SFIDA IL SUO FANTASMA' : 'VAI'}</span>`;
  iconizeEl(el);
  el.onclick = () => { if (state !== 'ready' && state !== 'ended') return; A.sfx.click(); if (ghost && i !== 0) ghostWant = { n: r.n, m: mode }; if (duel) duel.racing = false; start(); };
}
// v107.3 · Pilota della settimana con sfottò: scheda nel menu, casco d'oro anche al suo pilota quando è tra i compagni
const rpick = a => a[Math.floor(Math.random() * a.length)];
const dayPick = a => a[P.todayKey() % a.length];
const champRival = () => { const p = C.cached()?.week?.prev; return p && !isChamp() && p.r !== profile.rider ? p.r : ''; };
const CHAMP_PASS_ME = ['{n} COL CASCO D’ORO TI SALUTA DA DAVANTI', '{n}: “IL CASCO D’ORO NON SI PRESTA”', 'TI HA PASSATO IL CAMPIONE: ORA SAI PERCHÉ HA VINTO', '{n} TI HA LASCIATO IL FANGO DEL CAMPIONE'];
const CHAMP_PASSED = ['HAI PASSATO IL CASCO D’ORO! {n} STASERA OFFRE LUI', 'SORPASSO SUL CAMPIONE: {n} DICE CHE AVEVA IL SOLE NEGLI OCCHI', '{n} DIETRO DI TE: IL CASCO D’ORO PESA, EH?', 'IL CAMPIONE DELLA SETTIMANA TI VEDE LA TARGA'];
const POTW_JAB = [
  '{n} ha vinto la coppa. Dice che è talento, il gruppo dice culo.',
  '{n} gira col casco d’oro: si vede da lontano, così sai chi superare.',
  'Una settimana da re per {n}. Poi torna a spingere in salita come tutti.',
  '{n} ha vinto perché voi eravate al bar. Rimediate.',
  'Il casco d’oro di {n} pesa tre etti in più: approfittatene in salita.',
  '{n} è il pilota della settimana. Ha già chiesto lo sconto al bar.',
  'Battere {n} questa settimana non dà punti in più, ma lo sfottò vale doppio.',
];
const POTW_ME = [
  'Sei tu. Goditela: questa settimana tutti corrono per batterti.',
  'Casco d’oro in testa fino a domenica. Vedi di non cadere davanti a tutti.',
  'Re del gruppo per sette giorni. Al bar offri tu, è la regola.',
  'Sei il pilota della settimana: ogni sorpasso che prendi lo sanno tutti.',
];
function potwCard(w) {
  const el = $('potw'); if (!el) return;
  const c = w?.prev; if (!c) { el.hidden = true; return; }
  const me = isChamp(), line = (me ? dayPick(POTW_ME) : dayPick(POTW_JAB)).replace(/\{n\}/g, c.n);
  const wa = me ? `👑 Questa settimana il pilota della settimana di Giro Easy sono io (${c.p} punti coppa). Casco d’oro in testa: chi mi batte? 👉 ${publicGameURL}`
    : `👑 ${c.n}, goditi il casco d’oro finché dura: questa settimana la coppa di Giro Easy te la porto via io. 👉 ${publicGameURL}`;
  el.hidden = false; el.classList.toggle('mine', me);
  el.innerHTML = `<span class="potwav">${RIDERS.includes(c.r) ? avatarHTML(c.r) : '<i class="noav"></i>'}<i class="potwcrown">👑</i></span>
    <span class="potwt"><small>PILOTA DELLA SETTIMANA${me ? ' · SEI TU' : ''}</small><b>${c.n}</b><em>${c.p} pt coppa${c.w ? ' · ' + c.w + ' ' + (c.w === 1 ? 'percorso vinto' : 'percorsi vinti') : ''} · casco d’oro fino a domenica</em><q>${line}</q></span>
    <a class="potwwa" target="_blank" rel="noopener" href="${waLink(wa)}">${me ? 'VANTATI NEL GRUPPO' : 'SFOTTILO NEL GRUPPO'}</a>`;
  iconizeEl(el);
}
// v106.5 · chi ha vinto la coppa della settimana scorsa corre col casco d'oro per tutta la settimana
const isChamp = () => { try { return !!crownOf(C.getNick()); } catch { return false; } };
function raceLivery() { const l = P.currentLivery(), c = P.currentParts().casco; return isChamp() ? { ...l, id: l.id + '-oro', helmet: '#e3b021' } : c?.color ? { ...l, id: l.id + '-' + c.id, helmet: c.color } : l; }
const crownOf = n => { const p = C.cached()?.week?.prev; return p && n && p.n.toLowerCase() === String(n).toLowerCase() ? ' 👑' : ''; };
// v97 · WhatsApp: messaggio pronto quando superi qualcuno, e avviso nel menu quando qualcuno supera te
const waLink = text => 'https://wa.me/?text=' + encodeURIComponent(text);
const trackName = m => m === 3 ? 'la Sfida del giorno' : P.MODES[m].name;
function waBrag(d, runInfo, nick, beforeList) {
  const list = (d.boards?.[runInfo.mode] || []).map(e => e.n), me = nick.toLowerCase();
  const pos = list.findIndex(n => n.toLowerCase() === me) + 1, oldPos = beforeList.findIndex(n => n.toLowerCase() === me) + 1;
  if (!pos || (oldPos && pos >= oldPos)) return;
  // chi era davanti a me prima e ora è dietro
  const passed = list.slice(pos).filter(n => { const i = beforeList.findIndex(b => b.toLowerCase() === n.toLowerCase()); return i >= 0 && (!oldPos || i < oldPos - 1); });
  if (!passed.length || !$('groupres')) return;
  const v = passed[0], pts = runInfo.score.toLocaleString('it-IT');
  const text = pos === 1 ? `👑 ${nick} ha appena preso il 1° posto su ${trackName(runInfo.mode)} a Giro Easy con ${pts} punti! ${v}, sei dietro: vieni a riprendertelo 👉 ${publicGameURL}`
    : `🏁 ${nick} ha superato ${passed.join(', ')} su ${trackName(runInfo.mode)} a Giro Easy: ora è ${pos}° con ${pts} punti. Chi lo ferma? 👉 ${publicGameURL}`;
  const a = document.createElement('a'); a.className = 'wabtn'; a.href = waLink(text); a.target = '_blank'; a.rel = 'noopener';
  a.textContent = `📲 DILLO AL GRUPPO: HAI SUPERATO ${v.toUpperCase()}${passed.length > 1 ? ' E ALTRI ' + (passed.length - 1) : ''}`;
  $('groupres').appendChild(a);
  myPositions(d, true);
}
// posizioni salvate sul telefono, per accorgersi al prossimo avvio se qualcuno ti è passato davanti
const MYPOS_KEY = 'edt-mypos';
function myPositions(d, save) {
  const nick = C.getNick().toLowerCase(); if (!nick || !d?.boards) return null;
  let old = {}; try { old = JSON.parse(localStorage.getItem(MYPOS_KEY) || '{}') || {}; } catch {}
  const now = {};
  for (const m of C.ACTIVE.split(',').map(Number)) { const list = (d.boards[m] || []).map(e => e.n); const i = list.findIndex(n => n.toLowerCase() === nick); if (i >= 0) now[m] = list.slice(0, i); }
  if (save) try { localStorage.setItem(MYPOS_KEY, JSON.stringify(now)); } catch {}
  return { old, now };
}
function checkOvertakes(d) {
  if (state !== 'ready' || $('podium') || $('overtake')) return;
  const r = myPositions(d, false); if (!r) return;
  let hit = null;
  for (const m in r.old) {
    const before = r.old[m].map(n => n.toLowerCase()), above = r.now[m];
    const newcomers = above ? above.filter(n => !before.includes(n.toLowerCase())) : [];
    if (newcomers.length) { hit = { m: +m, who: newcomers[0], pos: above.length + 1 }; break; }
    if (!above && r.old[m]) { hit = { m: +m, who: null, pos: 0 }; break; }
  }
  myPositions(d, true);
  if (!hit || !P.MODES[hit.m]) return;
  const nick = C.getNick();
  const text = hit.who ? `😤 ${hit.who} mi ha superato su ${trackName(hit.m)} a Giro Easy… goditela finché dura, me lo riprendo! 👉 ${publicGameURL}` : `😤 Mi hanno buttato fuori dai primi 10 su ${trackName(hit.m)} a Giro Easy. Non finisce qui! 👉 ${publicGameURL}`;
  const el = document.createElement('div'); el.className = 'overtake'; el.id = 'overtake';
  el.innerHTML = `<button class="ox" type="button" id="otx" aria-label="Chiudi">✕</button>
    <p>😱 ${hit.who ? `<b>${hit.who}</b> ti ha superato` : 'Sei uscito dai primi 10'} su <b>${trackName(hit.m)}</b></p>
    <small>${hit.pos ? `Ora sei ${hit.pos}° nella classifica del gruppo.` : 'Torna in classifica!'}</small>
    <div class="orow"><a class="wabtn" href="${waLink(text)}" target="_blank" rel="noopener">📲 RISPONDI NEL GRUPPO</a><button class="primary" type="button" id="otgo"><span>▶ RIPRENDITELO</span></button></div>`;
  topLayer().appendChild(el);
  $('otx').onclick = () => el.remove();
  $('otgo').onclick = () => { el.remove(); if (P.isUnlocked(P.MODES[hit.m])) { mode = hit.m; profile.mode = mode; P.save(); renderReady(); } };
}
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
      <p class="gpos">${pos ? `<b>${nick}</b> è <b class="big">${pos}°</b>${best && best.s > runInfo.score ? ` (record ${best.s.toLocaleString('it-IT')})` : ''}` : `<b>${nick}</b>: fuori dai primi 10. Dopo migliora!`}</p>${(() => { const tl = C.timesFor(d, runInfo.mode), ti = tl.findIndex(e => e.n.toLowerCase() === nick.toLowerCase()); const jb = runInfo.mode === C.JUMP_MODE, ib = runInfo.mode === C.ICE_MODE, fm = jb ? C.fmtJump : ib ? C.fmtMetres : C.fmtTime; return ti >= 0 ? `<p class="gpos">${jb ? '📏 Salto più lungo' : ib ? '🌀 Metri di derapata' : '⏱ Tempi migliori'}: <b>${ti + 1}°</b> con ${fm(tl[ti].t)}${tl[0] && ti > 0 ? ` (1° ${tl[0].n}: ${fm(tl[0].t)})` : ''}</p>` : ''; })()}
${(() => { const me = cupMine(d.week, nick); return me ? `<p class="gpos">🏆 Coppa della settimana: <b>${me.pos}°</b> con ${me.p} pt${d.week.list[0] && me.pos > 1 ? ` (1° ${d.week.list[0].n}: ${d.week.list[0].p} pt)` : ''}</p>` : ''; })()}
      <ol class="board gboard">${groupListHTML(list.slice(0, 5), nick, runInfo.mode)}</ol>
      <div class="grow"><button class="secondary" type="button" id="gall">TUTTA LA CLASSIFICA</button><button class="linkbtn" type="button" id="gnick">non sei ${nick}?</button></div>
      <p class="gcode">🔑 Il tuo codice pilota: <b>${C.getCode()}</b> · ti serve per usare il nome <b>${nick}</b> su un altro telefono.</p>`;
    $('gall').onclick = () => renderGroup(() => renderResultAgain(), runInfo.mode);
    $('gnick').onclick = () => { C.setNick(''); groupResult({ ...runInfo, sent: null }); };
  };
  if (runInfo.sent && runInfo.sentAs === nick) { show(runInfo.sent); return; }
  box.innerHTML = `<div class="ghead">🏆 CLASSIFICA DEL GRUPPO · ${MODE_LABEL(runInfo.mode)}</div><p class="gwait">Invio il punteggio di <b>${nick}</b>…</p>`;
  const { sent, sentAs, ...payload } = runInfo;
  const beforeList = (C.cached()?.boards?.[runInfo.mode] || []).map(e => e.n);
  C.submit({ ...payload, name: nick, v: String(GAME_VERSION), b: P.UPGRADES.reduce((a, u) => a + P.upgradeLevel(u.id), 0) }).then(d => {
    if (d.taken) {   // v89 · nome già prenotato da un altro telefono
      if (!$('groupres')) return;
      $('groupres').innerHTML = `<div class="ghead">🔒 NOME GIÀ USATO</div><p><b>${nick}</b> è già il nome di un altro pilota del gruppo. Se sei tu, scrivi il tuo <b>codice pilota</b> (lo trovi in classifica sul telefono dove giochi di solito); altrimenti cambia nome.</p>
        <form class="nickrow" id="codeform"><input id="codein" maxlength="12" autocomplete="off" placeholder="codice pilota"><button class="primary" type="submit"><span>ENTRA</span></button></form>
        <div class="grow"><button class="linkbtn" type="button" id="gnick2">cambia nome</button></div>`;
      $('codeform').onsubmit = e => { e.preventDefault(); if (C.setCode($('codein').value).length >= 4) groupResult({ ...runInfo, sent: null }); };
      $('gnick2').onclick = () => { C.setNick(''); groupResult({ ...runInfo, sent: null }); };
      return;
    }
    runInfo.sent = d; runInfo.sentAs = nick; lastGroupRun = runInfo;
    show(d); renderSide(); refreshCardPreview(); waBrag(d, runInfo, nick, beforeList);
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
let groupArch = false;   // v79 · archivio delle stagioni passate
function renderGroup(back, m = mode) {
  if (state !== 'ended') state = 'ready';
  setMenu(true); $('overlay').classList.remove('hidden');
  const nick = C.getNick();
  const draw = (d0, err) => {
    const d = groupArch ? C.cachedArchive() : d0;
    if (groupArch && m === 'cup') m = mode;
    $('card').innerHTML = `<div class="eyebrow">ENDURO DRINKING TEAM · TUTTI I TELEFONI</div>
      <h1 class="shoptitle">CLASSIFICA<br><em>DEL GRUPPO.</em></h1>
      <div class="seasontabs"><button type="button" class="${groupArch ? '' : 'active'}" data-season="now">STAGIONE ${C.SEASON.n} · DALLA V${C.SEASON.from}</button><button type="button" class="${groupArch ? 'active' : ''}" data-season="arch">📜 ARCHIVIO</button></div>
      <p class="note seasonnote">${groupArch ? 'Archivio: giri di tutte le versioni, anche con regole diverse (velocità, punti e tempi massimi cambiati). Solo per ricordo: <b>non si confrontano</b>.' : `Contano solo i giri fatti con le regole di adesso (dalla versione ${C.SEASON.from}), così tempi e punti si confrontano con lo stesso metro.`}</p>
      <div class="boardtabs gtabs">${groupArch ? '' : `<button type="button" class="cuptab ${m === 'cup' ? 'active' : ''}" data-gmode="cup">🏆 COPPA</button>`}${P.SHOWN().map(x => `<button type="button" class="${x.id === m ? 'active' : ''}" data-gmode="${x.id}">${x.id === 3 ? 'OGGI' : x.short}</button>`).join('')}</div>
      ${m === 'cup' ? (() => { const w = d?.week, me = cupMine(w, nick); return `<p class="gsub">COPPA DELLA SETTIMANA${w ? ` · dal ${w.from.slice(8)}/${w.from.slice(5, 7)} al ${w.to.slice(8)}/${w.to.slice(5, 7)}` : ''} · si azzera ogni lunedì</p>
      <p class="note cupnote">In ogni percorso i primi 8 della settimana prendono <b>10-8-6-5-4-3-2-1</b> punti coppa: vince chi ne somma di più. Più percorsi fai, più punti puoi prendere.${w?.prev ? `<br>👑 Vincitore della settimana scorsa: <b>${w.prev.n}</b> (${w.prev.p} pt)` : ''}${me ? `<br>Tu sei <b>${me.pos}°</b> con <b>${me.p} pt</b>.` : ''}</p>
      ${err ? '<p class="gwait">Classifica non raggiungibile: controlla la rete.</p>' : !d ? '<p class="gwait">Carico la coppa…</p>' : w ? `<ol class="board gboard">${cupListHTML(w.list, nick)}</ol>` : '<p class="gwait">La coppa si accende appena è aggiornato lo script della classifica.</p>'}`; })() : `<div class="kindtabs"><button type="button" class="${groupKind === 'score' ? 'active' : ''}" data-gkind="score">🏆 PUNTI</button><button type="button" class="${groupKind === 'time' ? 'active' : ''}" data-gkind="time">${m === C.JUMP_MODE ? '📏 SALTO PIÙ LUNGO' : m === C.ICE_MODE ? '🌀 METRI DI DERAPATA' : '⏱ TEMPI MIGLIORI'}</button></div>
      <p class="gsub">PS${psOf(P.MODES[m])} · ${m === 3 ? 'Sfida del ' + P.todayLabel() + ' (si azzera ogni giorno)' : P.MODES[m].name} · migliori 10, un record a testa</p>
      ${err ? '<p class="gwait">Classifica non raggiungibile: controlla la rete.</p>' : d ? `<ol class="board gboard ${groupKind === 'time' ? 'timeboard' : ''}">${groupKind === 'time' ? timeListHTML(C.timesFor(d, m), nick, m) : groupListHTML(d.boards?.[m], nick, m)}</ol>` : '<p class="gwait">Carico la classifica…</p>'}`}
      <p class="note">${nick ? `In classifica come <b>${nick}</b>.` : 'Il tuo nome lo scegli alla fine del primo giro.'}</p>
      <div class="actions"><button class="primary" id="gback"><span>INDIETRO</span></button><button class="secondary" id="greload">AGGIORNA</button></div>`;
    iconizeEl($('card'));
    document.querySelectorAll('[data-gmode]').forEach(b => b.onclick = () => { m = b.dataset.gmode === 'cup' ? 'cup' : Number(b.dataset.gmode); draw(C.cached()); });
    document.querySelectorAll('[data-gkind]').forEach(b => b.onclick = () => { groupKind = b.dataset.gkind; draw(C.cached()); });
    document.querySelectorAll('[data-season]').forEach(b => b.onclick = () => {
      groupArch = b.dataset.season === 'arch'; A.sfx.click();
      if (groupArch && !C.cachedArchive()) { draw(null); C.loadArchive().then(() => draw(C.cached())).catch(() => draw(null, true)); } else draw(C.cached());
    });
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
const GAME_VERSION = 107.9;
// v57 · invia i punteggi rimasti in sospeso (all'avvio, quando torna la rete e ogni 2 minuti)
setTimeout(() => C.flushPending().then(n => { if (n) { toast(`🏆 INVIATI ${n} PUNTEGGI RIMASTI IN SOSPESO`, 'green'); renderSide(); } }).catch(() => {}), 4000);
window.addEventListener('online', () => C.flushPending().catch(() => {}));
setInterval(() => { if (state !== 'playing' && C.pendingCount()) C.flushPending().catch(() => {}); }, 120000);
$('edition').textContent = 'GIRO EASY · V' + GAME_VERSION;   // il numero in alto segue sempre la versione
let boardMode = null, boardSrc = 'group', sideLoadedAt = 0;
function renderSide() {
  $('ridergrid').innerHTML = RIDERS.map((name, i) => `<button type="button" class="rideroption" data-rider="${name}" aria-pressed="${name === profile.rider}" aria-label="Scegli ${name}">
    ${riderCardHTML(name, i)}${RIDER_VOICE[name] ? '<i class="voiced" title="Parla con la sua voce">' + icon('speaker') + '</i>' : ''}</button>`).join('');
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
    const locked = !P.liveryOpen(l, info.level), why = l.streak ? `Si sblocca tornando ${l.streak} giorni di fila (forziere del giorno)` : 'Si sblocca al livello ' + l.level;
    return `<button type="button" class="livery ${l.id === current.id ? 'active' : ''} ${l.shirt ? 'shirt' : ''}" data-livery="${l.id}" ${locked ? 'aria-disabled="true"' : ''} title="${locked ? why : l.name}">
      <i style="--a:${l.plastic};--b:${l.accent};--c:${l.jersey}">${l.shirt ? `<img class="lvshirt" src="img/maglia-${l.shirt}.webp" alt="" loading="lazy">` : `<b class="lvicon">${l.icon || ''}</b>`}</i><span>${locked ? (l.streak ? '🔒 ' + l.streak + ' GIORNI DI FILA' : '🔒 LIV ' + l.level) : l.name}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-livery]').forEach(b => b.onclick = () => {
    if (state === 'playing' || state === 'paused' || state === 'countdown') return;
    const l = P.LIVERIES.find(x => x.id === b.dataset.livery);
    if (!P.liveryOpen(l)) { if (l.streak) toast('TORNA ' + l.streak + ' GIORNI DI FILA E LA MAGLIA È TUA (OGGI: ' + P.dailyInfo().streak + ')'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
    profile.livery = l.id; P.save(); A.sfx.click(); renderSide();
  });

  const bm = boardMode ?? mode;
  $('boardtabs').innerHTML = P.SHOWN().map(m => `<button type="button" class="${m.id === bm ? 'active' : ''}" data-board="${m.id}">${m.id === 3 ? 'OGGI' : m.short}</button>`).join('');
  document.querySelectorAll('[data-board]').forEach(b => b.onclick = () => { boardMode = Number(b.dataset.board); renderSide(); });
  const group = boardSrc === 'group' && C.enabled();
  document.querySelectorAll('[data-src]').forEach(b => { b.classList.toggle('active', b.dataset.src === (group ? 'group' : 'local')); b.onclick = () => { boardSrc = b.dataset.src; renderSide(); }; });
  $('boardsrc').hidden = !C.enabled();
  $('boardtitle').textContent = group ? 'Chi comanda nel gruppo' : 'Chi comanda su questo telefono';
  $('boardnote').textContent = group ? `Classifica di tutto l’EDT · stagione ${C.SEASON.n} (giri dalla versione ${C.SEASON.from}): un record a testa, migliori 10 per percorso.` : 'Classifica salvata solo su questo dispositivo: passate il telefono al prossimo.';
  if (group) {
    const d = C.cached();
    $('board').innerHTML = d ? groupListHTML(d.boards?.[bm], C.getNick(), bm) : '<li class="empty">Carico la classifica del gruppo…</li>';
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
      return `<button type="button" class="bk ${on ? 'on' : ''} ${own ? 'own' : 'lock'}" data-bike="${b.id}" aria-pressed="${on}"><img src="img/bike-${b.id}.webp?t=1" alt="" loading="lazy"><b>${b.name}</b><small>${tag}</small></button>`; }).join('');
    $('bikestrip').querySelectorAll('.bk').forEach(el => el.onclick = () => {
      const id = el.dataset.bike;
      if (state === 'playing' || state === 'paused' || state === 'countdown') return;
      if (P.ownsBike(id)) { P.buyBike(id); A.sfx.click(); renderSide(); }
      else if (state === 'ready' || state === 'ended') fromPanel(() => renderShop(renderReady, 'bikes'));
    });
  }
  if ($('bikephoto')) { const bid = P.currentBike().id; if ($('bikephoto').dataset.bike !== bid) { $('bikephoto').dataset.bike = bid; $('bikephoto').innerHTML = `<img src="img/bike-${bid}.webp?t=1" alt="${P.currentBike().name}"><span>${P.currentBike().icon} ${P.currentBike().name}</span>`; } }
}

// ---------- v68 · Sfida 1 contro 1 dal vivo ----------
let duel = null;
const duelInfo = () => { const l = P.currentLivery(); return { t: 'hi', n: C.cleanNick(C.getNick() || profile.rider), r: profile.rider, num: RIDERS.indexOf(profile.rider) + 1, liv: { plastic: l.plastic, accent: l.accent, jersey: l.jersey, pants: l.pants, helmet: l.helmet } }; };
function duelNew() {
  duel = { racing: false, seed: 0, status: '', opp: { n: 'AVVERSARIO', r: '', c: 0, x: 1, l: 0, end: null }, me: null, ahead: false, lastSend: 0, lastMsg: 0,
    entry: { name: 'AVVERSARIO', duel: true, gap: 0, lane: 1, lx: 1, lean: 0, lift: 0, number: 2, livery: { plastic: '#1e7fd8', accent: '#ffffff', jersey: '#1e7fd8', pants: '#202020', helmet: '#ffffff' } } };
}
D.on('open', () => { if (!duel) duelNew(); duel.status = 'ok'; D.send(duelInfo()); A.sfx.perfect?.(); if (state === 'ready' || state === 'ended') renderDuel(); });
D.on('close', () => {
  if (!duel) return; duel.status = 'lost';
  if (state === 'playing') toast('⚔️ ' + duel.opp.n.toUpperCase() + ' SI È SCOLLEGATO', 'red');
  if (duel.racing && state === 'playing') { duel.entry.gap = -999; }
  if (state === 'ready' && $('duelcard')) renderDuel();
});
D.on('data', d => {
  if (!duel) duelNew();
  duel.lastMsg = performance.now();
  if (d.t === 'hi') {
    duel.opp.n = String(d.n || 'AVVERSARIO').slice(0, 16); duel.opp.r = d.r || '';
    Object.assign(duel.entry, { name: '⚔️ ' + duel.opp.n.toUpperCase(), number: Math.max(1, Math.min(99, d.num | 0)) || 2 });
    if (d.liv) duel.entry.livery = { ...duel.entry.livery, ...d.liv };
    if ($('duelcard')) renderDuel();
  } else if (d.t === 'go') {
    if (D.getRole() !== 'guest') return;
    if (state === 'playing' || state === 'countdown') return;
    duelGo(d.mode, d.seed);
  } else if (d.t === 'p') {
    Object.assign(duel.opp, { c: +d.c || 0, x: +d.x || 1, l: +d.l || 0, k: d.k | 0 });
  } else if (d.t === 'end') {
    duel.opp.end = d;
    if (state === 'playing') toast('⚔️ ' + duel.opp.n.toUpperCase() + (d.w ? ' HA FINITO: ' + (P.MODES[mode].leap ? C.fmtJump(d.j) : (+d.tm).toFixed(1).replace('.', ',') + ' s') : ' È FUORI GARA'), d.w ? 'gold' : 'green');
    drawDuelResult();
  } else if (d.t === 'menu') {
    if ($('duelcard')) renderDuel();
  }
});
function duelGo(m, seed) {
  if (!P.MODES[m] || !P.isUnlocked(P.MODES[m])) { toast('⚔️ QUEL PERCORSO NON È ANCORA SBLOCCATO QUI', 'red'); }
  mode = m; profile.mode = m; P.save(); duel.racing = true; duel.seed = seed >>> 0;
  start();
}
function updateDuel() {
  if (!duel?.racing) return;
  const now = performance.now(), e = duel.entry, o = duel.opp;
  if (state === 'playing' && now - duel.lastSend > 90) { duel.lastSend = now; D.send({ t: 'p', c: +course.toFixed(3), x: +px.toFixed(3), l: +curLift().toFixed(2), k: kmh }); }
  const before = e.lx;
  e.gap = (o.c - course) / GAME_LENGTH * courseLength(P.MODES[mode].difficulty) * 19.5;
  e.lx += (o.x - e.lx) * .35; e.lean = (e.lx - before) * 60; e.lift = o.l || 0;
  if (state !== 'playing' || elapsed < 2) return;
  const ahead = course > o.c;
  if (ahead && !duel.ahead) { pop('⚔️ SORPASSO SU ' + o.n.toUpperCase() + '!', 'gold'); A.sfx.near(); }
  else if (!ahead && duel.ahead) pop('⚔️ ' + o.n.toUpperCase() + ' TI HA PASSATO!', 'white');
  duel.ahead = ahead;
}
function duelWinner(a, b) {   // +1 vince a, -1 vince b
  const md = P.MODES[mode];
  if (md.leap) return a.j === b.j ? 0 : a.j > b.j ? 1 : -1;
  if (md.ice) return a.s === b.s ? 0 : a.s > b.s ? 1 : -1;
  if (a.w && b.w) return a.tm === b.tm ? 0 : a.tm < b.tm ? 1 : -1;
  if (a.w !== b.w) return a.w ? 1 : -1;
  if (Math.abs(a.c - b.c) > .05) return a.c > b.c ? 1 : -1;
  return a.s === b.s ? 0 : a.s > b.s ? 1 : -1;
}
function drawDuelResult() {
  const box = $('duelres'); if (!box || !duel) return;
  const me = duel.me, op = duel.opp.end, n = duel.opp.n.toUpperCase(), md = P.MODES[mode];
  const val = x => md.leap ? (x.j ? C.fmtJump(x.j) : 'salto nullo') : md.ice ? x.s.toLocaleString('it-IT') + ' pt' : x.w ? (+x.tm).toFixed(1).replace('.', ',') + ' s al rifugio' : 'fuori gara (' + Math.round(x.c / GAME_LENGTH * 100) + '%)';
  if (!me) { box.innerHTML = ''; return; }
  if (!op) { box.innerHTML = `<div class="dhead">⚔️ SFIDA CON ${n}</div><p>Tu: <b>${val(me)}</b> · aspetto ${n}…</p>`; return; }
  const r = duelWinner(me, op);
  box.innerHTML = `<div class="dhead ${r > 0 ? 'win' : r < 0 ? 'lose' : ''}">⚔️ ${r > 0 ? 'HAI VINTO LA SFIDA!' : r < 0 ? n + ' HA VINTO' : 'PAREGGIO!'}</div>
    <p>Tu: <b>${val(me)}</b> · ${n}: <b>${val(op)}</b></p>
    <button class="primary" type="button" id="duelagain">${D.getRole() === 'host' ? '⚔️ RIVINCITA' : '⚔️ TORNA ALLA SFIDA'}</button>`;
  if (r > 0) A.sfx.fanfare?.();
  $('duelagain').onclick = () => renderDuel();
}
function renderDuel() {
  if (state === 'playing' || state === 'countdown') return;
  if (state !== 'ended') state = 'ready';
  setMenu(true); $('overlay').classList.remove('hidden');
  if (!duel) duelNew();
  const on = D.isOn(), host = D.getRole() === 'host', md = P.MODES[mode], n = duel.opp.n.toUpperCase();
  const shareURL = publicGameURL + '?sfida=' + D.getCode();
  const modes = P.SHOWN().filter(m => P.isUnlocked(m));
  $('card').innerHTML = `<div id="duelcard" class="duelcard"><div class="eyebrow">ENDURO DRINKING TEAM · DAL VIVO</div>
    <h1>SFIDA<br><em>1 CONTRO 1.</em></h1>
    ${on ? `<div class="duelvs"><span>${avatarHTML(profile.rider)}<b>TU</b></span><i>VS</i><span>${RIDERS.includes(duel.opp.r) ? avatarHTML(duel.opp.r) : '<i class="noav"></i>'}<b>${n}</b></span></div>
      ${host ? `<label class="duelpick">PERCORSO <select id="duelmode">${modes.map(m => `<option value="${m.id}" ${m.id === mode ? 'selected' : ''}>PS${psOf(m)} · ${m.name}</option>`).join('')}</select></label>
        <button class="primary big" id="duelgo" type="button"><span>PARTIAMO!</span>${icon('chevrons')}</button>
        <p class="tip">Partite insieme dopo il 3-2-1. Vince chi arriva prima al rifugio (al ghiaccio chi fa più punti derapata, ad Angelo Potter il salto più lungo).</p>`
      : `<p class="duelwait">Collegato con <b>${n}</b>. Aspetta che faccia partire la gara: il percorso lo sceglie lui.</p>`}`
    : D.getRole() === 'host' ? `<p class="duelwait">Manda questo codice all'amico: lo inserisce in <b>SFIDA 1 CONTRO 1</b>, oppure apre il link.</p>
      <div class="duelcode">${D.getCode()}</div>
      <div class="grow"><button class="secondary" id="duelshare" type="button">📤 MANDA IL LINK</button></div>
      <p class="tip">Aspetto che si colleghi… (tieni aperta questa schermata)</p>`
    : `<button class="primary big" id="duelhost" type="button"><span>CREA LA SFIDA</span>${icon('chevrons')}</button>
      <div class="dueljoin"><input id="duelin" maxlength="4" placeholder="CODICE" autocomplete="off" autocapitalize="characters" value="${duel.pending || ''}"><button class="secondary" id="dueljoin" type="button">ENTRA</button></div>
      <p class="duelstat" id="duelstat">${duel.status === 'lost' ? 'Collegamento perso. Rifate la sfida.' : duel.status === 'err' ? duel.err : ''}</p>
      <p class="tip">Serve internet su tutti e due i telefoni. Il collegamento è diretto tra i telefoni: su alcune reti (es. certe linee mobili o Wi-Fi aziendali) può non riuscire; in quel caso provate un'altra rete.</p>`}
    <div class="actions"><button class="secondary" id="duelback" type="button">⬅ MENU</button>${on || D.getRole() ? '<button class="linkbtn" id="duelquit" type="button">chiudi la sfida</button>' : ''}</div></div>`;
  iconizeEl($('card'));
  $('duelback').onclick = renderReady;
  if ($('duelquit')) $('duelquit').onclick = () => { D.close(); duel = null; renderDuel(); };
  if ($('duelhost')) $('duelhost').onclick = async () => {
    $('duelhost').disabled = true; $('duelstat').textContent = 'Creo la sfida…';
    try { await D.host(); duel.status = 'wait'; renderDuel(); }
    catch (e) { duel.status = 'err'; duel.err = 'Non riesco a creare la sfida: controlla la rete e riprova.'; renderDuel(); }
  };
  if ($('dueljoin')) $('dueljoin').onclick = async () => {
    const c = $('duelin').value.trim().toUpperCase(); if (c.length !== 4) { $('duelstat').textContent = 'Il codice è di 4 lettere.'; return; }
    $('dueljoin').disabled = true; $('duelstat').textContent = 'Mi collego a ' + c + '…';
    try { await D.join(c); }
    catch (e) { D.close(); duel.status = 'err'; duel.err = 'Sfida ' + c + ' non trovata o rete bloccata. Controlla il codice (chi l’ha creata deve tenere aperta la schermata).'; renderDuel(); }
  };
  if ($('duelshare')) $('duelshare').onclick = async () => {
    const text = '⚔️ Ti sfido a Giro Easy! Codice ' + D.getCode() + ' · ' + shareURL;
    try { if (navigator.share) await navigator.share({ title: 'Sfida Giro Easy', text, url: shareURL }); else { await navigator.clipboard.writeText(text); toast('LINK COPIATO', 'green'); } } catch {}
  };
  if ($('duelgo')) $('duelgo').onclick = () => {
    const m = +$('duelmode').value, seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    D.send({ t: 'go', mode: m, seed }); duelGo(m, seed);
  };
}
// link d'invito: ?sfida=ABCD apre la sfida e si collega da solo
{ const q = new URLSearchParams(location.search).get('sfida'); if (q && /^[A-Za-z]{4}$/.test(q)) { setTimeout(() => { duelNew(); duel.pending = q.toUpperCase(); renderDuel(); $('duelin') && ($('duelin').value = duel.pending); $('dueljoin')?.click(); }, 1200); } }

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
// v78 · cartolina del risultato: locandina del percorso, foto del pilota, risultato grande, posizioni (gara, gruppo, coppa) e link
function cardFacts(win, res) {
  const md = P.MODES[mode], f = [];
  if (run.position && !leap) f.push([`${run.position}°`, ice ? `SU ${rivals.length + 1} NELLE DERAPATE` : `SU ${rivals.length + 1} IN GARA`]);
  const d = lastGroupRun?.sent, nick = C.getNick();
  if (d && nick) {
    const gp = C.positionOf(d, md.id, nick); if (gp) f.push([`${gp}°`, 'NEL GRUPPO']);
    const me = cupMine(d.week, nick); if (me) f.push([`${me.pos}°`, 'COPPA SETTIMANA']);
  }
  if (res.isRecord) f.push(['★', 'NUOVO RECORD']);
  if (f.length < 3) f.push([String(run.caps), 'BIRRE']);
  if (f.length < 3) f.push([String(run.jumps), 'SALTI']);
  return f.slice(0, 3);
}
async function scoreCard(win, res) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), md = P.MODES[mode];
  try { await document.fonts?.load('80px Anton'); } catch {}
  const F = n => n + 'px Anton, Impact, sans-serif', B = n => `800 ${n}px "Barlow Condensed", Arial Narrow, Arial, sans-serif`;
  x.fillStyle = '#12110f'; x.fillRect(0, 0, W, H);
  // locandina del percorso in alto, sfumata nel fondo
  const art = await loadImage(trackArtOf(md));
  if (art) { const ah = 820, sc = Math.max(W / art.width, ah / art.height), w = art.width * sc, h = art.height * sc; x.drawImage(art, (W - w) / 2, (ah - h) * .35, w, h); }
  let g = x.createLinearGradient(0, 380, 0, 860); g.addColorStop(0, '#12110f00'); g.addColorStop(1, '#12110f'); x.fillStyle = g; x.fillRect(0, 380, W, 480);
  g = x.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#000a'); g.addColorStop(1, '#0000'); x.fillStyle = g; x.fillRect(0, 0, W, 200);
  // logo e prova speciale
  const logo = await loadImage('edt-logo.png');
  if (logo) { const w = 250, h = w * logo.height / logo.width; x.fillStyle = '#fff'; roundRect(x, 36, 36, w + 24, h + 24, 18); x.fill(); x.drawImage(logo, 48, 48, w, h); }
  x.textAlign = 'right'; x.fillStyle = '#ffcf16'; x.font = B(38); x.fillText(`PS${psOf(md)} · ${md.limit} s`, W - 44, 80);
  x.fillStyle = '#fff'; x.font = F(56); x.fillText((md.id === 3 ? 'SFIDA DEL ' + P.todayLabel() : md.name).toUpperCase(), W - 44, 146);
  // pilota
  const cy = 760, cx = 190, R = 118;
  const photo = photoURL(profile.rider) ? await loadImage(photoURL(profile.rider)) : null;
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.closePath(); x.fillStyle = '#3a312a'; x.fill(); x.clip();
  if (photo) x.drawImage(photo, cx - R, cy - R, R * 2, R * 2);
  else { x.fillStyle = '#ffcf16'; x.font = F(100); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(profile.rider.replace('Il ', '').slice(0, 2).toUpperCase(), cx, cy + 6); x.textBaseline = 'alphabetic'; }
  x.restore(); x.lineWidth = 10; x.strokeStyle = '#ffcf16'; x.beginPath(); x.arc(cx, cy, R + 4, 0, Math.PI * 2); x.stroke();
  x.textAlign = 'left'; x.fillStyle = '#fff3de'; x.font = F(70); x.fillText(profile.rider.toUpperCase(), cx + R + 36, cy - 6);
  const nick = C.getNick(); x.fillStyle = '#b9ad98'; x.font = B(34); x.fillText((nick && nick.toLowerCase() !== profile.rider.toLowerCase() ? nick + ' · ' : '') + (SKILLS[profile.rider]?.name || 'Enduro Drinking Team'), cx + R + 38, cy + 44);
  // risultato grande sulla fascia gialla
  const head = leap ? (win ? leapBest.toFixed(1).replace('.', ',') + ' M' : 'SALTO NULLO') : ice ? Math.round(driftScore).toLocaleString('it-IT') : win ? elapsed.toFixed(1).replace('.', ',') + ' s' : Math.floor(course / GAME_LENGTH * 100) + '%';
  const sub = leap ? (win ? 'SALTO ATTERRATO IN PIEDI' : 'DI MUSO O SUI PIETRONI') : ice ? 'PUNTI DERAPATA' : win ? 'ARRIVATO AL RIFUGIO' : gev ? 'FERMATO DALLE GEV' : 'DEL PERCORSO, POI È FINITA';
  const by = 1000;
  x.save(); x.translate(W / 2, by); x.rotate(-.045); x.fillStyle = '#ffcf16'; x.fillRect(-W, -112, W * 2, 224); x.fillStyle = '#e3301c'; x.fillRect(-W, 112, W * 2, 18);
  x.textAlign = 'center'; x.fillStyle = '#1b1712'; x.font = F(head.length > 8 ? 130 : 168); x.fillText(head, 0, 50);
  x.font = B(34); x.fillText(sub + ' · ' + score.toLocaleString('it-IT') + ' PUNTI EDT', 0, 96);
  x.restore();
  // tre caselle: posizione in gara, nel gruppo, coppa (o birre e salti)
  const facts = cardFacts(win, res), bw = 300, gap = 30, x0 = (W - (bw * 3 + gap * 2)) / 2;
  facts.forEach(([v, l], i) => { const bx = x0 + i * (bw + gap); x.fillStyle = '#ffffff14'; roundRect(x, bx, 1160, bw, 96, 14); x.fill(); x.textAlign = 'center'; x.fillStyle = '#ffcf16'; x.font = F(50); x.fillText(v, bx + bw / 2, 1214); x.fillStyle = '#d9cdb8'; x.font = B(24); x.fillText(l, bx + bw / 2, 1244); });
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = F(46); x.fillText(win ? 'CHI MI BATTE?' : 'DOPO MIGLIORA…', W / 2, 1306);
  x.fillStyle = '#9f9686'; x.font = B(26); x.fillText(publicGameURL.replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, 1338);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
// anteprima della cartolina nella schermata del risultato
let cardCtx = null, cardURL = '';
async function refreshCardPreview() {
  if (!cardCtx || !$('cardprev')) return;
  try {
    const blob = await scoreCard(cardCtx.win, cardCtx.res); if (!blob || !$('cardprev')) return;
    const old = cardURL; cardURL = URL.createObjectURL(blob);
    const img = $('cardprev').querySelector('img'); if (img) img.src = cardURL;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 3000);
  } catch {}
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

async function shareScore(win, res) {
  const md = P.MODES[mode];
  const what = leap && win ? `ha saltato ${leapBest.toFixed(1).replace('.', ',')} metri` : win && !ice ? `è arrivato al rifugio in ${elapsed.toFixed(1).replace('.', ',')} s (${score.toLocaleString('it-IT')} punti)` : `ha fatto ${score.toLocaleString('it-IT')} punti`;
  const text = `${profile.rider} ${what} a Giro Easy EDT (${md.id === 3 ? 'Sfida del ' + P.todayLabel() : md.name})${res.isRecord ? ' — NUOVO RECORD' : ''}. Chi mi batte?`;
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
  // v107.2 · alla prima visita il gioco offline si prepara dopo, così non ruba rete al caricamento della prima partita
  const reg = () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  if (hadSW) reg(); else setTimeout(reg, 20000);
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
  topLayer().appendChild(el);
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
window.__edt = { get state() { return state; }, get cornerLine() { return cornerLine; }, get rb() { return curBend(); }, get px() { return px; }, get duel() { return duel; }, get ice() { return ice; }, get drift() { return drift; }, get driftScore() { return driftScore; }, get driftPend() { return driftPend; }, get driftChain() { return driftChain; }, get bend() { return bendNow; }, get snowT() { return snowT; }, get throttleSlip() { return throttleSlip; }, setAim(v) { aimPx = v; }, get gasLock() { return gasLock; }, setMode(v) { mode = v; }, audio: A, get rivals() { return rivals; }, get weather() { return weather; }, spawnShortcut, takeShortcut, setWeather(k, v) { weatherPlan = [{ kind: k, from: 0, to: 999 }]; weather[k] = v; }, angelo, get elapsed() { return elapsed; }, get course() { return course; }, get vx() { return vx; }, setCourse(v) { roadTime = v / GAME_LENGTH * courseLength(P.MODES[mode].difficulty); course = v; }, get score() { return score; }, get lives() { return lives; },
  get objects() { return objects; }, get barT() { return barT; }, showPodium, showStats, get leapState() { return leapState; }, get leapBest() { return leapBest; }, get leapDist() { return leapDist; }, get leapPitch() { return leapPitch; }, get canyonLen() { return canyonLen; }, get turbo() { return turbo; }, get dailyRule() { return dailyRule(); }, spawnBar, get grip() { return grip; }, get stalled() { return stalled; }, get flat() { return flat; }, get sandStuck() { return sandStuck; }, get tractOn() { return tractOn; }, get jump() { return jump; }, get px() { return px; }, get run() { return run; }, get lane() { return lane; },
  get wave() { return wave; }, get combo() { return combo; }, get charge() { return charge; }, setElapsed(v) { elapsed = v; }, hop, move, start, pause, finish, boost, update, go, setGas(v) { gas = v; }, startWheelie, stopWheelieInput, get wheelieOn() { return wheelie; }, get ears() { return earsOn(); }, get errors() { return errors; }, setGrappa(v) { grappa = v; }, forceTurbo() { charge = 100; boost(); }, mud, mudClear() { mudFx.clear(); }, erika, get replayN() { return replayBuf.length; }, get runPlan() { return runPlan; }, get forkPath() { return forkPath; }, replay: startReplay, recFake() { pushSnap(drawState(), 1 / 30); }, get highlights() { return highlights.map(h => ({ label: h.label, w: Math.round(h.w), n: h.frames.length })); }, startClip, frames(n, fn, every = 1) { for (let i = 0; i < n; i++) { fn?.(i); update(1 / 60); mudFx.update(1 / 60); if (i % every === every - 1) world.render({ ...drawState(), dt: every / 60 }); } } };

// v96 · i comandi di prova (__edt) esistono solo in locale o con ?dev=1: dal sito pubblico non si possono usare per truccare i giri
{ const DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]dev=1(&|$)/.test(location.search);
  if (!DEV) { try { delete window.__edt; delete window.__world; } catch {} } }
