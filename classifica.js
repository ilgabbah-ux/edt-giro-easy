// EDT Giro Easy · Classifica del gruppo online.
// I punteggi finiscono nel foglio Google "Giro Easy · Classifica" (Drive → Progetti Claude → Gioco EDT Giro Easy)
// tramite l'app web Apps Script "Giro Easy Classifica". Un record per nome e per percorso, migliori 10.
export const API = window.EDT_BOARD_URL || 'https://script.google.com/macros/s/AKfycbxb8Ky6HSkHLF01ZT-ku_oGIVbS9Fl2pFT427gk38hx_mCL_DQn81IqEl3OtTKykeY/exec';
const NICK_KEY = 'edt-giro-easy-nick', CODE_KEY = 'edt-giro-easy-code';
// v89 · codice pilota: il primo telefono che usa un nome lo "prenota" col suo codice; gli altri devono conoscere il codice
export function getCode() {
  try { let c = localStorage.getItem(CODE_KEY); if (!c) { c = Array.from({ length: 6 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join(''); localStorage.setItem(CODE_KEY, c); } return c; } catch { return ''; }
}
export function setCode(c) { c = String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12); if (c.length >= 4) try { localStorage.setItem(CODE_KEY, c); } catch {} return c; }

export const enabled = () => !API.includes('__DEPLOY_ID__');

// v108.3 · DUE CLASSIFICHE: quella dell'EDT (amici, con la parola segreta o il link d'invito) e quella di tutti gli altri.
// Nel codice c'è solo l'impronta della parola segreta, non la parola.
const EDT_KEY = 'edt-giro-easy-edt', EDT_HASH = 'f401ff4b20bae3a7f9c17d26ba1cba27acde4f08843f12de8a1c7413c8ba2473';
export function isEdt() { try { return localStorage.getItem(EDT_KEY) === '1'; } catch { return false; } }
export function edtDecided() { try { return localStorage.getItem(EDT_KEY) !== null; } catch { return true; } }
export function setEdt(on) { try { localStorage.setItem(EDT_KEY, on ? '1' : '0'); } catch {} cache = null; cacheAt = 0; }
export const myGrp = () => isEdt() ? 'edt' : 'pub';
const normWord = w => String(w || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
export async function checkSecret(w) {
  const n = normWord(w); if (!n || !crypto?.subtle) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('edt|' + n));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') === EDT_HASH;
}
// il link d'invito porta la parola (codificata): si manda solo nel gruppo WhatsApp dell'EDT
export const inviteParam = w => btoa(normWord(w)).replace(/=+$/, '');
export async function joinFromInvite(param) { try { const ok = await checkSecret(atob(param)); if (ok) setEdt(true); return ok; } catch { return false; } }
let lastSecret = '';
export const rememberSecret = w => { lastSecret = normWord(w); try { localStorage.setItem('edt-giro-easy-inv', inviteParam(w)); } catch {} };
export const myInvite = () => { try { return localStorage.getItem('edt-giro-easy-inv') || ''; } catch { return ''; } };
// classifica dell'altro gruppo, solo da guardare (non tocca la cache del proprio)
const other = {};
export function loadGroup(g) { if (g === myGrp()) return load(); if (other[g] && Date.now() - other[g].at < 45000) return Promise.resolve(other[g].d); return call({ action: 'top', day: dayISO(), grp: g }, false).then(d => { other[g] = { d, at: Date.now() }; return d; }); }
export const cachedGroup = g => g === myGrp() ? cache : other[g]?.d || null;

// v79 · STAGIONI: in classifica contano solo i giri fatti con le regole attuali (velocità, punteggi, tempi massimi).
// Quando cambia qualcosa che sposta tempi o punti si alza "from" (e il numero della stagione): i giri vecchi
// restano nel foglio e si vedono nell'archivio. ACTIVE = percorsi nel menu (solo questi danno punti coppa).
export const SEASON = { n: 11, from: 149 };   // v149 · martedì 11/11: moto con ruoli diversi (punti forti e deboli veri), stagione 11     // v107 · lunedì 19/10: scia, salto tollerante, botte meno punitive, gas in salita: stagione 10   // v97 · moto e accessori nuovi più forti: stagione nuova   // v96 · lunedì 12/10: potenziamenti speciali dell'officina, stagione nuova
export const ACTIVE = '0,1,2,3,9,10,11,12,13,14,15,16,17,18,20,21';   // v132 · 18 Leventino, 20 Mirco e Gabbah Fest   // v127 · 17 = Christmas Madness (solo a Natale)
export const FALLS_MODE = 19;   // v122 · classifica delle cadute: riga col totale di cadute del pilota nel campo punti (lo script la tratta come un percorso in più, fuori dalla coppa)

export function dayISO(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function getNick() { try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; } }
export function setNick(n) { try { localStorage.setItem(NICK_KEY, n); } catch {} }
export function cleanNick(n) { return String(n || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }

let cache = null, cacheAt = 0, inflight = null;
export const cached = () => cache;

// fetch normale; se il browser lo blocca (es. dentro cornici con regole strette) si prova con JSONP.
function jsonp(url, ms = 20000) {
  return new Promise((resolve, reject) => {
    const cb = '__edtcb' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const done = (fn, v) => { clearTimeout(t); delete window[cb]; s.remove(); fn(v); };
    const t = setTimeout(() => done(reject, new Error('timeout')), ms);
    window[cb] = data => done(resolve, data);
    s.onerror = () => done(reject, new Error('script'));
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(s);
  });
}
function splitAv(o, d = 0) {
  if (!o || typeof o !== 'object' || d > 6) return;
  if (Array.isArray(o)) { o.forEach(x => splitAv(x, d + 1)); return; }
  if (typeof o.r === 'string') { const m = /^(.*)~(\d{1,2})$/.exec(o.r); if (m) { o.r = m[1]; o.av = +m[2]; } }
  for (const k in o) if (o[k] && typeof o[k] === 'object') splitAv(o[k], d + 1);
}
async function call(params, keep = true) {
  if (!enabled()) throw new Error('off');
  const url = API + '?' + new URLSearchParams({ minv: SEASON.from, act: ACTIVE, grp: myGrp(), ...params }).toString();
  let data;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);   // v57 · telefono con rete lenta: più pazienza
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow' }); clearTimeout(t);
    data = await r.json();
  } catch { data = await jsonp(url); }
  if (!data?.ok) throw new Error('risposta');
  if (data.fv) syncPhotos(data.fv);   // v126 · foto profilo: versioni dal server, le foto nuove si scaricano a parte
  splitAv(data);   // v125 · «Nome~7» nel campo pilota = pilota creato col casco n. 7
  if (data.edtName && !isEdt()) { try { localStorage.setItem(EDT_KEY, '1'); } catch {} data.joinedEdt = true; }   // v108.5 · pilota EDT riconosciuto dal nome: entra da solo nella classifica EDT
  if (!keep) return data;
  if (!('minv' in data)) delete data.week;   // script vecchio: niente stagioni, niente coppa (non sarebbe giusta)
  cache = data; cacheAt = Date.now();
  return data;
}

export function load(force = false) {
  if (!force && cache && Date.now() - cacheAt < 45000) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = call({ action: 'top', day: dayISO() }).finally(() => { inflight = null; });
  return inflight;
}

// archivio: classifiche di tutte le stagioni (giri di ogni versione), non tocca la cache della stagione
let archive = null;
export const cachedArchive = () => archive;
export function loadArchive() { return archive ? Promise.resolve(archive) : call({ action: 'top', day: dayISO(), minv: 0 }, false).then(d => (archive = d)); }

// v108.6 · contatore giocatori: aperture e primi giri del giorno (una volta al giorno per telefono), telefoni nuovi, giri finiti.
// Nessun dato personale: solo un codice a caso del telefono.
function devId() { try { let d = localStorage.getItem('edt-dev'); if (!d) { d = Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join(''); localStorage.setItem('edt-dev', d); } return d; } catch { return ''; } }
// v116 · provenienza: i link dei post hanno ?da=ig / tt / yt / fb / wa (gruppo WhatsApp) / amici (cartolina condivisa).
// La prima provenienza resta salvata sul telefono; se riapri da un altro link conta quello di oggi. Nessun dato personale.
const SRC_OK = /^[a-z]{2,6}$/;
let srcNow = '';
try { const q = (new URLSearchParams(location.search).get('da') || '').toLowerCase(); if (SRC_OK.test(q)) { srcNow = q; if (!localStorage.getItem('edt-src')) localStorage.setItem('edt-src', q); } } catch {}
export function source() { if (srcNow) return srcNow; try { const s = localStorage.getItem('edt-src') || ''; return SRC_OK.test(s) ? s : ''; } catch { return ''; } }
export function hit(kind, v = '') {
  if (!enabled()) return;
  try {
    if (kind !== 'run') { const k = 'edt-hit-' + kind, day = dayISO(); if (localStorage.getItem(k) === day) return; localStorage.setItem(k, day); }
    const id = devId(); if (!id) return;
    const src = source(); if (src) v = String(v).slice(0, 4) + '-' + src;   // v116 · da quale canale arriva (nella colonna Versione, es. 115-ig)
    fetch(API + '?' + new URLSearchParams({ action: 'hit', kind, id, grp: myGrp(), v, day: dayISO() }).toString(), { mode: 'no-cors', keepalive: true }).catch(() => {});
  } catch {}
}
export function submit({ name, score, mode, rider, time, win, v, g, b }) {
  const p = { action: 'add', day: dayISO(), name: cleanNick(name), score: Math.round(score), mode, rider, time: Math.round((time || 0) * 10) / 10, win: win ? 1 : 0, v: v || '', g: g || '', b: b ?? '', k: getCode() };
  return call(p).then(d => { if (d.taken) { hold(p); return d; } unhold(p); flushPending(); if (heldCount()) flushHeld(); return d; }).catch(e => { queue(p); throw e; });
}
// v108 · giri rifiutati perché il nome è di un altro telefono: restano da parte e partono appena metti il codice pilota (o cambi nome)
const HELD_KEY = 'edt-giro-easy-held';
function readHeld() { try { return JSON.parse(localStorage.getItem(HELD_KEY) || '[]'); } catch { return []; } }
function writeHeld(list) { try { localStorage.setItem(HELD_KEY, JSON.stringify(list.slice(-15))); } catch {} }
function hold(p) { const list = readHeld(); if (!list.some(x => x.mode === p.mode && x.score === p.score && x.day === p.day)) list.push(p); writeHeld(list); }
export const heldCount = () => readHeld().length;
function unhold(p) { writeHeld(readHeld().filter(x => !(x.mode === p.mode && x.score === p.score && x.day === p.day))); }
export async function flushHeld() {
  if (!enabled()) return { sent: 0, left: heldCount() };
  const nick = getNick(); let sent = 0;
  for (const p of readHeld()) {
    try {
      const d = await call({ ...p, name: nick || p.name, k: getCode() });
      if (d.taken) break;   // codice ancora sbagliato: restano tutti da parte
      sent++; writeHeld(readHeld().filter(x => !(x.mode === p.mode && x.score === p.score && x.day === p.day)));
    } catch { break; }
  }
  return { sent, left: heldCount() };
}
// v57 · punteggi non inviati (rete assente o lenta): restano sul telefono e partono da soli appena la classifica risponde.
const PEND_KEY = 'edt-giro-easy-pending';
function readPending() { try { return JSON.parse(localStorage.getItem(PEND_KEY) || '[]'); } catch { return []; } }
function writePending(list) { try { localStorage.setItem(PEND_KEY, JSON.stringify(list.slice(-15))); } catch {} }
function queue(p) { const list = readPending(); if (!list.some(x => x.name === p.name && x.mode === p.mode && x.score === p.score && x.day === p.day)) list.push(p); writePending(list); }
export const pendingCount = () => readPending().length;
let flushing = false;
export async function flushPending() {
  if (flushing || !enabled()) return 0;
  const list = readPending(); if (!list.length) return 0;
  flushing = true; let sent = 0;
  try {
    for (const p of list) {
      try { const d = await call({ ...p, k: getCode() }); if (!d.taken) sent++; else hold(p); writePending(readPending().filter(x => !(x.name === p.name && x.mode === p.mode && x.score === p.score && x.day === p.day))); }
      catch { break; }
    }
  } finally { flushing = false; }
  return sent;
}

// v48 · fantasma: posizione sul percorso (0-60) ogni secondo, 2 caratteri base36 a campione (valore ×10).
export function encodeGhost(splits) { return splits.filter((_, i) => i % 2 === 0).map(v => Math.max(0, Math.min(1295, Math.round(v * 10))).toString(36).padStart(2, '0')).join(''); }
export function decodeGhost(g) { const out = []; for (let i = 0; i + 1 < (g || '').length; i += 2) out.push(parseInt(g.slice(i, i + 2), 36) / 10); return out; }

// v48 · tempi migliori (solo giri arrivati al rifugio): dal server, o ricavati dai record se lo script è vecchio.
export const JUMP_MODE = 2;
// v67 · Angelo Potter: classifica del salto più lungo (metri nel campo tempo, punteggi che finiscono per 7)
export function jumpsFor(data, mode = JUMP_MODE) {
  return (data?.boards?.[mode] || []).filter(e => e.w && e.t > 0 && e.s % 10 === 7).map(e => ({ ...e, t: e.t })).sort((a, b) => b.t - a.t);
}
export const fmtJump = m => (Math.round(m * 10) / 10).toFixed(1).replace('.', ',') + ' m';
// v92 · Ice Scrofy: classifica dei metri fatti di traverso (nel campo tempo, il più alto vince)
export const ICE_MODE = 9;
export const fmtMetres = m => Math.round(m).toLocaleString('it-IT') + ' m';
export function metresFor(data, mode = ICE_MODE) {
  if (data?.times?.[mode] && data.iceDesc) return data.times[mode];
  const best = {};
  for (const e of data?.boards?.[mode] || []) if (e.t > 0) { const k = e.n.toLowerCase(); if (!best[k] || e.t > best[k].t) best[k] = e; }
  return Object.values(best).sort((a, b) => b.t - a.t);
}
export function timesFor(data, mode) {
  if (mode === JUMP_MODE) return jumpsFor(data, mode);
  if (mode === ICE_MODE) return metresFor(data, mode);
  if (data?.times?.[mode]) return data.times[mode];
  return (data?.boards?.[mode] || []).filter(e => e.w && (e.bt || e.t)).map(e => ({ ...e, t: e.bt || e.t })).sort((a, b) => a.t - b.t);
}
export const fmtTime = t => (Math.round(t * 10) / 10).toFixed(1).replace('.', ',') + ' s';

// Posizione di un nome nella classifica di un percorso (1 = primo), 0 se fuori dai 10.
export function positionOf(data, mode, name) {
  const list = data?.boards?.[mode] || [];
  const i = list.findIndex(e => e.n.toLowerCase() === cleanNick(name).toLowerCase());
  return i + 1;
}

// v126 · FOTO PROFILO (visibili a tutti). Il server manda fv = {nome: versione}; qui si tengono le foto già scaricate
// (localStorage, max 120) e si chiedono solo quelle nuove o cambiate. photoOf(nome) → dataURL o ''.
const PH_KEY = 'edt-giro-easy-foto';
let phMem = null, phVers = {}, phBusy = false;
function phRead() { if (phMem) return phMem; try { phMem = JSON.parse(localStorage.getItem(PH_KEY) || '{}'); } catch { phMem = {}; } return phMem; }
function phWrite() { try { const e = Object.entries(phMem); localStorage.setItem(PH_KEY, JSON.stringify(Object.fromEntries(e.slice(-120)))); } catch {} }
// v146 · foto segnalate da questo telefono: non si vedono più qui (e il server le nasconde a tutti dopo 3 segnalazioni)
const hiddenPh = () => { try { return JSON.parse(localStorage.getItem('edt-ph-hide') || '[]'); } catch { return []; } };
export function photoOf(name) { const k = String(name || '').toLowerCase(), c = phRead()[k]; if (hiddenPh().includes(k)) return ''; return c && phVers[k] && c.v === phVers[k] ? c.d : ''; }
export function reportPhoto(name) {
  const k = String(name || '').toLowerCase(); if (!k) return;
  try { const h = hiddenPh(); if (!h.includes(k)) { h.push(k); localStorage.setItem('edt-ph-hide', JSON.stringify(h.slice(-200))); } } catch {}
  if (!enabled()) return;
  try { fetch(API + '?' + new URLSearchParams({ action: 'segnala', n: k, id: devId() || '' }).toString(), { mode: 'no-cors', keepalive: true }).catch(() => {}); } catch {}
}
const phListeners = new Set();
export const onPhotos = fn => phListeners.add(fn);
function syncPhotos(fv) {
  phVers = fv || {}; const have = phRead();
  for (const k of Object.keys(have)) if (!phVers[k]) delete have[k];   // foto tolta dal server
  const need = Object.keys(phVers).filter(k => !have[k] || have[k].v !== phVers[k]).slice(0, 40);
  if (!need.length || phBusy || !enabled()) { phListeners.forEach(f => f()); return; }
  phBusy = true;
  const url = API + '?' + new URLSearchParams({ action: 'foto', n: need.join(',') }).toString();
  fetch(url, { redirect: 'follow' }).then(r => r.json()).catch(() => jsonp(url)).then(d => {
    Object.entries(d?.f || {}).forEach(([k, o]) => { if (o && /^data:image\/jpeg;base64,/.test(o.d)) have[k] = { v: o.v, d: o.d }; });
    phWrite(); phListeners.forEach(f => f());
  }).catch(() => {}).finally(() => { phBusy = false; });
}
// carica (img = dataURL JPEG) o toglie (img = '') la foto del nome in classifica; serve il codice pilota del telefono
export function uploadPhoto(name, img) {
  if (!enabled()) return Promise.resolve(false);
  const body = JSON.stringify({ action: 'foto', name: cleanNick(name), k: getCode(), img: img || '' });
  return fetch(API, { method: 'POST', mode: 'no-cors', body }).then(() => { const k = cleanNick(name).toLowerCase(); if (img) { phRead()[k] = { v: -1, d: img }; } else delete phRead()[k]; phWrite(); cache = null; return true; }).catch(() => false);
}

// v149 · PROGRESSI NEL CLOUD: livello, birre, officina e garage legati a nome + codice pilota (foglio "Progressi Giro Easy").
// Su un telefono nuovo bastano nome e codice per riaverli. Se il server è vecchio non risponde "ge": il gioco non mostra niente.
const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function packData(obj) {
  const txt = new TextEncoder().encode(JSON.stringify(obj));
  if (window.CompressionStream) { const cs = new Blob([txt]).stream().pipeThrough(new CompressionStream('deflate-raw')); return 'z' + b64u(new Uint8Array(await new Response(cs).arrayBuffer())); }
  return 'j' + b64u(txt);
}
export async function unpackData(s) {
  const raw = unb64u(String(s).slice(1));
  if (s[0] === 'z') { const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(ds).text()); }
  return JSON.parse(new TextDecoder().decode(raw));
}
export async function cloudSave(data, lv, beers) {
  const name = getNick(); if (!enabled() || !name || !data || data.length > 48000) return { skip: true };
  const body = JSON.stringify({ action: 'gesave', name, k: getCode(), data, lv: String(lv || 0), beers: String(beers || 0) });
  try { const r = await fetch(API, { method: 'POST', body, redirect: 'follow' }); const d = await r.json(); return d && d.ge ? d : { unsupported: true }; }
  catch { try { await fetch(API, { method: 'POST', mode: 'no-cors', body }); return { sent: true }; } catch { return { err: true }; } }
}
export async function cloudLoad(name, code) {
  const d = await call({ action: 'geload', name: cleanNick(name), k: String(code || getCode()).trim().toLowerCase() }, false);
  return d && d.ge ? d : { unsupported: true };
}
// v149 · SEGNALA UN PROBLEMA: arriva nel foglio "Problemi" con modello del telefono, versione e fluidità
export function sendProblem(text, extra = {}) {
  const body = JSON.stringify({ action: 'problema', text: String(text || '').slice(0, 1000), name: getNick(), dev: devId(), ua: navigator.userAgent, ...extra });
  return fetch(API, { method: 'POST', mode: 'no-cors', body }).then(() => true).catch(() => false);
}
export const deviceId = () => devId();
