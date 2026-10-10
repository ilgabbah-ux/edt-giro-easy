// EDT Giro Easy · Classifica del gruppo online.
// I punteggi finiscono nel foglio Google "Giro Easy · Classifica" (Drive → Progetti Claude → Gioco EDT Giro Easy)
// tramite l'app web Apps Script "Giro Easy Classifica". Un record per nome e per percorso, migliori 10.
export const API = window.EDT_BOARD_URL || 'https://script.google.com/macros/s/AKfycbxb8Ky6HSkHLF01ZT-ku_oGIVbS9Fl2pFT427gk38hx_mCL_DQn81IqEl3OtTKykeY/exec';
const NICK_KEY = 'edt-giro-easy-nick';

export const enabled = () => !API.includes('__DEPLOY_ID__');

// v79 · STAGIONI: in classifica contano solo i giri fatti con le regole attuali (velocità, punteggi, tempi massimi).
// Quando cambia qualcosa che sposta tempi o punti si alza "from" (e il numero della stagione): i giri vecchi
// restano nel foglio e si vedono nell'archivio. ACTIVE = percorsi nel menu (solo questi danno punti coppa).
export const SEASON = { n: 3, from: 81 };   // v81 · tempi massimi, compagni e punti di MontaFiga cambiati: stagione nuova
export const ACTIVE = '0,1,2,3,9,10,11,12,13,14';

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
async function call(params, keep = true) {
  if (!enabled()) throw new Error('off');
  const url = API + '?' + new URLSearchParams({ minv: SEASON.from, act: ACTIVE, ...params }).toString();
  let data;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);   // v57 · telefono con rete lenta: più pazienza
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow' }); clearTimeout(t);
    data = await r.json();
  } catch { data = await jsonp(url); }
  if (!data?.ok) throw new Error('risposta');
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

export function submit({ name, score, mode, rider, time, win, v, g }) {
  const p = { action: 'add', day: dayISO(), name: cleanNick(name), score: Math.round(score), mode, rider, time: Math.round((time || 0) * 10) / 10, win: win ? 1 : 0, v: v || '', g: g || '' };
  return call(p).then(d => { flushPending(); return d; }).catch(e => { queue(p); throw e; });
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
      try { await call(p); sent++; writePending(readPending().filter(x => !(x.name === p.name && x.mode === p.mode && x.score === p.score && x.day === p.day))); }
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
export function timesFor(data, mode) {
  if (mode === JUMP_MODE) return jumpsFor(data, mode);
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
