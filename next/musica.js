// Le canzoni del gioco: solo Il GaBbAH, le stesse 25 del gioco in uso (stanno in ../musica, non sono copiate)
export const CANZONI = [
  ['giro-easy', 'Giro Easy'], ['salita-infame', 'Salita Infame'], ['brindisi-easy', 'Brindisi Easy'], ['bosco-veloce', 'Bosco Veloce'], ['vai-ciccio', 'Vai Ciccio'],
  ['lenduro-non-e-reato', 'L’enduro non è reato'], ['enduro-is-not-a-crime', 'Enduro is not a crime'], ['suka-suka', 'Suka Suka'], ['supereroi-contro-le-gev', 'Supereroi contro le GEV'],
  ['costa-vs-linus', 'Costa vs Linus'], ['sergione-vs-renard', 'EDT Battle: Sergione vs Renard'], ['angelo-vs-gabbah', 'Angelo vs Gabbah'], ['angelo-potter', 'Angelo Potter'],
  ['hell-can-wait', 'Hell can wait'], ['kick-up-the-dust', 'Kick up the dust'], ['same-blood', 'Same Blood'], ['ethereal-hammer', 'Ethereal Hammer'],
  ['re-dell-ignoranza', 'Il Re dell’Ignoranza'], ['bosco-dell-ignoranza', 'Il Bosco dell’Ignoranza'], ['gusta-ranch', 'Gusta Ranch'], ['gas-a-martello', 'Gas a martello (Gusta Ranch Reloaded)'],
  ['mirco-e-gabbah-fest-v2', 'Mirco e Gabbah Fest Edition'], ['leventino-2026', 'Leventino 2026'], ['orto-bio', 'Orto Bio'], ['christmas-madness', 'Christmas Madness'],
];
export const titolo = f => (CANZONI.find(c => c[0] === f) || ['', ''])[1];
let a = null, cur = '', base = .5, duck = 1, on = true;
const vol = () => { if (a) a.volume = Math.max(0, Math.min(1, base * duck)); };
// suona una canzone (in streaming, senza caricarla tutta in memoria). from = da che secondo parte se è una canzone diversa da quella che sta già andando
export function suona(file, v = .5, from = 0) { base = v; if (!on || !file) return; if (!a) { a = new Audio(); a.loop = true; a.preload = 'auto'; }
  if (cur !== file) { cur = file; a.src = '../musica/' + file + '.mp3'; if (from > 0) a.addEventListener('loadedmetadata', () => { try { if (a.duration > from + 20) a.currentTime = from; } catch {} }, { once: true }); }
  vol(); a.play().catch(() => {}); }
export function volume(v) { base = v; vol(); }
export function abbassa(d) { if (d !== duck) { duck = d; vol(); } }   /* quando parla un pilota la musica va sotto */
export function ferma() { sospesa = false; if (a) a.pause(); }
export function musicaOn(v) { on = v; if (!on) ferma(); }
export const inOnda = () => (a && !a.paused ? cur : '');
/* v169 · app in secondo piano (tasto home, altra app, schermo spento): la canzone si ferma e riparte solo quando torni, se stava suonando.
   Prima si fermava solo il motore e la musica continuava fuori dal gioco */
let sospesa = false;
const via = () => { if (a && !a.paused) { a.pause(); sospesa = true; } };
const torna = () => { if (sospesa && on && a && !document.hidden) { sospesa = false; a.play().catch(() => {}); } };
document.addEventListener('visibilitychange', () => { if (document.hidden) via(); else torna(); });
addEventListener('pagehide', via); addEventListener('freeze', via);
addEventListener('pointerdown', torna, { capture: true, passive: true });   /* se il telefono non la lascia ripartire da sola, riparte al primo tocco */
