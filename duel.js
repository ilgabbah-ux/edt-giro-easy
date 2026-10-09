// v68 · Sfida 1 contro 1 dal vivo: collegamento diretto tra due telefoni (WebRTC tramite PeerJS).
// Chi crea la sfida riceve un codice di 4 lettere; l'altro lo inserisce. Niente account, niente server nostro:
// il "centralino" pubblico di PeerJS serve solo a far trovare i due telefoni, poi i dati vanno diretti.
const PREFIX = 'edt-giroeasy-v1-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
let lib = null, peer = null, conn = null, handlers = {}, role = null, code = '';

function loadLib() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (lib) return lib;
  lib = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('./peerjs.min.js', import.meta.url).href;
    s.onload = () => window.Peer ? res(window.Peer) : rej(new Error('peerjs'));
    s.onerror = () => { lib = null; rej(new Error('peerjs')); };
    document.head.appendChild(s);
  });
  return lib;
}
const emit = (ev, ...a) => { try { handlers[ev]?.(...a); } catch (e) { console.warn('duel', ev, e); } };
export const on = (ev, fn) => { handlers[ev] = fn; };
export const isOn = () => !!conn && conn.open;
export const getRole = () => role;
export const getCode = () => code;

function wire(c) {
  conn = c;
  c.on('open', () => emit('open'));
  c.on('data', d => { if (d && typeof d === 'object') emit('data', d); });
  c.on('close', () => { if (conn === c) { conn = null; emit('close'); } });
  c.on('error', e => emit('error', e));
}
function newCode() { let s = ''; for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; return s; }

// Crea la sfida: risolve con il codice da mandare all'amico.
export async function host() {
  const Peer = await loadLib();
  close();
  role = 'host';
  for (let tries = 0; tries < 4; tries++) {
    code = newCode();
    const p = new Peer(PREFIX + code, { debug: 0, ...(window.EDT_PEER_OPTS || {}) });
    const ok = await new Promise(res => { p.on('open', () => res(true)); p.on('error', e => res(e?.type === 'unavailable-id' ? false : e)); });
    if (ok === true) {
      peer = p;
      p.on('connection', c => { if (conn && conn.open) { c.close(); return; } wire(c); });
      p.on('disconnected', () => { try { p.reconnect(); } catch {} });
      return code;
    }
    try { p.destroy(); } catch {}
    if (ok !== false) throw ok;
  }
  throw new Error('codice');
}
// Entra nella sfida di un amico con il suo codice.
export async function join(c) {
  const Peer = await loadLib();
  close();
  role = 'guest'; code = String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const p = new Peer({ debug: 0, ...(window.EDT_PEER_OPTS || {}) }); peer = p;
  await new Promise((res, rej) => { p.on('open', res); p.on('error', rej); });
  const cn = p.connect(PREFIX + code, { reliable: true });
  wire(cn);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 12000);
    cn.on('open', () => { clearTimeout(t); res(); });
    p.on('error', e => { clearTimeout(t); rej(e); });
  });
}
export function send(d) { if (conn && conn.open) try { conn.send(d); } catch {} }
export function close() {
  try { conn?.close(); } catch {}
  try { peer?.destroy(); } catch {}
  conn = null; peer = null; role = null;
}
