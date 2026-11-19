// v154 · Notifiche: "X ti ha superato su <percorso>". Firebase Cloud Messaging (progetto giro-easy).
// La configurazione qui sotto è pubblica per natura (identifica l'app web, non dà accesso a niente).
const CFG = {
  apiKey: 'AIzaSyC1hehWPzoRZbsK5_QrMPFoSEIDe1CLZXM',
  authDomain: 'giro-easy.firebaseapp.com',
  projectId: 'giro-easy',
  storageBucket: 'giro-easy.firebasestorage.app',
  messagingSenderId: '882217994454',
  appId: '1:882217994454:web:1663fcab2dd51f27e4a177',
};
const VAPID = 'BCAeZaaANBWW_tUzhBvKOVC5nlhTbZpEQ74O0KXWHjeWYnlgZZPjrvG3nqW0KKCi9A3GcxzonEupDuRohZFPX2s';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const KEY = 'edt-push', DAYKEY = 'edt-push-day';

// v161 · true dentro l'app del Play Store (lì il permesso lo dà l'app, non il browser)
export const inApp = () => { try { if (document.referrer.startsWith('android-app://')) sessionStorage.setItem('edt-twa', '1'); return sessionStorage.getItem('edt-twa') === '1'; } catch { return false; } };
inApp();
export const supported = () => (location.protocol === 'https:' || location.hostname === 'localhost') && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
// 'no' = il telefono non le supporta (es. iPhone senza app sulla home) · 'denied' = bloccate · 'on' · 'off'
export function state() {
  if (!supported()) return 'no';
  if (Notification.permission === 'denied') return 'denied';
  let on = ''; try { on = localStorage.getItem(KEY) || ''; } catch {}
  return on && Notification.permission === 'granted' ? 'on' : 'off';
}

async function token() {
  const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-messaging.js')]);
  const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(() => navigator.serviceWorker.ready);
  return getToken(getMessaging(initializeApp(CFG)), { vapidKey: VAPID, serviceWorkerRegistration: reg });
}

// register(tok) = funzione che manda il token alla classifica (classifica.js)
export async function enable(register) {
  if (!supported()) return { ok: false, why: 'no' };
  // v161 · alcuni telefoni non rispondono mai alla richiesta (o la chiudono in silenzio): dopo 60 s vale come "non risposto"
  const perm = await Promise.race([Promise.resolve(Notification.requestPermission()).catch(() => 'default'), new Promise(ok => setTimeout(() => ok('default'), 60000))]);
  if (perm !== 'granted') return { ok: false, why: perm === 'denied' ? 'denied' : 'default' };
  // v161 · mai un'attesa senza fine: se Firebase o il service worker non rispondono in 25 s lo diciamo al giocatore
  const tok = await Promise.race([token(), new Promise((_, no) => setTimeout(() => no(new Error('tempo scaduto')), 25000))]);
  if (!tok) return { ok: false, why: 'token' };
  await register(tok, 1);
  try { localStorage.setItem(KEY, tok); localStorage.setItem(DAYKEY, new Date().toDateString()); } catch {}
  return { ok: true };
}

export async function disable(unregister) {
  let tok = ''; try { tok = localStorage.getItem(KEY) || ''; localStorage.removeItem(KEY); } catch {}
  if (tok) try { await unregister(tok); } catch {}
}

// una volta al giorno: il token può cambiare, lo ri-registriamo (col nome attuale del pilota)
export async function refresh(register) {
  if (state() !== 'on') return;
  try { if (localStorage.getItem(DAYKEY) === new Date().toDateString()) return; } catch { return; }
  try { const tok = await token(); if (tok) { await register(tok, 0); localStorage.setItem(KEY, tok); localStorage.setItem(DAYKEY, new Date().toDateString()); } } catch {}
}
