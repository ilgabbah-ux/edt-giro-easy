#!/usr/bin/env python3
"""Costruisce v2/: il gioco uscito tale e quale (menu, garage, officina, profilo) con la guida nuova in 3D al posto della gara.

Non tocca il gioco in uso: legge i file della radice e scrive solo v2/index.html e v2/game.js.
Tutto il resto (stili, immagini, audio, gli altri moduli) e' quello della radice, tramite <base href="../">.
La guida nuova e' la pagina next/ aperta in un riquadro a tutto schermo con ?embed=1.

Uso: python3 tools/v2.py   (da rifare ogni volta che cambia il gioco della radice)
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, 'v2'), exist_ok=True)
V2 = 24   # versione della prova: si alza a ogni modifica dell'incastro


def rep(s, old, new, what):
    if old not in s:
        sys.exit('v2.py: non trovo il punto "%s" in game.js: il gioco e\' cambiato, va rivisto l\'incastro' % what)
    return s.replace(old, new, 1)


g = open(os.path.join(ROOT, 'game.js'), encoding='utf-8').read()

# 1) i moduli restano quelli della radice
g, n = re.subn(r"(from |import\()'\./", r"\1'../", g)
assert n >= 10, n

# 2) solo i tre percorsi rifatti (piu' la scuola), e la Salita Infame al posto di Dopo migliora
g = rep(g, "import * as D from '../duel.js", """for (const m of P.MODES) if (![0, 1, 9, 14, 17, 18, 20, 21, 22].includes(m.id)) m.hidden = true;   // v2 · per ora solo i percorsi gia' rifatti in 3D
{ const L = { 0: 150, 1: 172, 9: 136, 14: 132, 17: 148, 18: 190, 20: 145, 21: 220 }; for (const m of P.MODES) if (L[m.id]) m.limit = L[m.id]; }   // v2 · tempi dei percorsi nuovi: cosi' tempo massimo, stelle e missioni parlano dei tempi veri della pista 3D
{ const m = P.MODES.find(x => x.id === 1); if (m) { m.name = 'Salita Infame'; m.short = 'INFAME'; m.desc = 'Il muro coi gradoni, la pietraia in salita, i tornanti di mulattiera e la cresta in single track. Poi giù a rotta di collo.'; } }
import * as D from '../duel.js""", 'import duel')

g = rep(g, "<div><b>${run.jumps}</b><small>SALTI</small></div>", "<div><b>${run.jumps}</b><small>${NEXT_PISTA[mode] !== undefined ? 'TRONCHI' : 'SALTI'}</small></div>", 'tronchi')

# 2b) la Shadow chiodata in garage: moto bonus, si sblocca con una medaglia su Ice Scrofy
g = rep(g, "import * as D from '../duel.js", """if (!P.BIKES.some(b => b.id === 'shadow')) P.BIKES.push({ id: 'shadow', name: 'Shadow chiodata', price: 0, level: 99, icon: '❄', top: true, shadow: true, desc: 'La Shadow chiodata dell’EDT: bobber bicilindrico con l’estintore al posto del serbatoio e le gomme piene di viti. Pesante e lenta a girare, ma sul ghiaccio morde come nessuna. Si sblocca con una medaglia su Ice Scrofy.', ideal: 'Ice Scrofy', stats: { speed: .02, steer: -.15, climb: -.1, grip: .14, drift: .3 }, look: { paint: { plastic: '#b3221b', accent: '#e8eef0', side: '#b3221b', frame: '#b3221b', seat: '#151515', ink: '#e8eef0' }, scale: 1, big: true } });
import * as D from '../duel.js""", 'import duel (shadow)')
g = g.replace("locked ? '🔒 LIV ' + b.level", "b.shadow && !owned ? '🔒 MEDAGLIA SU ICE' : locked ? '🔒 LIV ' + b.level")
g = g.replace("lv < b.level ? '🔒 LIV ' + b.level", "b.shadow ? '🔒 MEDAGLIA SU ICE' : lv < b.level ? '🔒 LIV ' + b.level")
g = rep(g, "import('../scene3d.js", "import('./scene3d.js", 'import scene3d')

# 3) la gara: parte la guida nuova
g = rep(g, "function start() {\n", """function start() {
  if (NEXT_PISTA[mode] !== undefined && !duel?.racing) { startNext(); return; }   // v2 · questi percorsi si corrono con la guida nuova
""", 'start()')
g = rep(g, "  run.position = rivals.length ? racePos() : 0;", "  run.position = nextRes ? nextRes.pos : rivals.length ? racePos() : 0;", 'posizione in finish()')
g = rep(g, "function frame(t) {\n", """function frame(t) {
  if (state === 'next') { last = t; requestAnimationFrame(frame); return; }   // v2 · mentre si corre nella guida nuova il gioco vecchio sta fermo
""", 'frame()')

# 4) aggiornamento automatico: guarda la sua pagina, non quella della radice
g = rep(g, "fetch('./index.html?u=' + Date.now(), { cache: 'no-store' })", "fetch('v2/index.html?u=' + Date.now(), { cache: 'no-store' })", 'controllo aggiornamenti')

g += r"""

// ================= v2 · INCASTRO DELLA GUIDA NUOVA =================
// Il gioco resta questo. Per i percorsi rifatti la gara si corre nella pista 3D (cartella next/, aperta a tutto schermo con ?embed=1):
// le passiamo pilota, moto, accessori e potenziamenti; a fine gara lei ci rimanda tempo, birre, cadute e posizione e si torna ai risultati veri.
const NEXT_PISTA = { 0: 'g', 1: 'i', 9: 'x', 14: 'r', 17: 'c', 18: 'l', 20: 'f', 21: 'v', 22: 's' }, NEXT_LIMIT = { 0: 150, 1: 172, 9: 136, 14: 132, 17: 148, 18: 190, 20: 145, 21: 220, 22: 900 };
const NEXT_BIKE = { edt250: 'enduro', gp125: 'hard300', trial: 'trial', ts300: 'hard300', mulo450: 'enduro', vintage: 'vintage', boanal: 'adventure', electric: 'electric', dakar: 'dakar', factory: 'dakar', pitbike: 'pitbike', bestia: 'bestia', fakedomi: 'fakedomi', hard300: 'hard300', shadow: 'shadow' };
let nextRes = null, nextFrame = null, nextCfg = '';
function startNext() {
  quietMenu = false; A.unlock(); A.stopVoice();
  if (touchDevice) goFull();
  resetRun(); perfRun = null; nextRes = null;
  timeLimit = NEXT_LIMIT[mode]; rookieT = 0;
  state = 'next';
  $('overlay').classList.add('hidden'); setMenu(false); $('pops').innerHTML = ''; setDisabled(true);
  startMusic();
  const st = P.currentStats(), parts = P.currentParts(), upg = {}; for (const u of P.UPGRADES) upg[u.id] = Math.min(5, P.upgradeLevel(u.id));
  const q = new URLSearchParams({ embed: '1', pista: NEXT_PISTA[mode], moto: NEXT_BIKE[P.currentBike().id] || 'enduro', rider: profile.rider, num: String(profile.custom?.num || ''), mus: '0', shadow: '1', st: JSON.stringify(st), prof: JSON.stringify({ v2: 1, up: upg }), casco: parts.casco?.color || '', fiamma: parts.fiamma?.color || '', v: 'v2-%d' }).toString();
  const host = fsTarget || document.fullscreenElement || document.webkitFullscreenElement || document.body;   // dentro l'elemento che va a schermo intero, altrimenti resterebbe sotto
  if (nextFrame && nextCfg === q && nextFrame.isConnected) { if (nextFrame.parentNode !== host) host.appendChild(nextFrame); nextFrame.style.display = 'block'; nextFrame.contentWindow.postMessage({ t: 'edt-next-restart' }, location.origin); nextFrame.focus(); return; }
  nextFrame?.remove(); nextCfg = q;
  nextFrame = document.createElement('iframe'); nextFrame.id = 'nextrun'; nextFrame.allow = 'autoplay; fullscreen; accelerometer; gyroscope'; nextFrame.setAttribute('allowfullscreen', '');
  nextFrame.style.cssText = 'position:fixed;inset:0;width:100%%;height:100%%;border:0;z-index:2147483000;background:#0b0c0b';
  nextFrame.src = 'next/index.html?' + q; host.appendChild(nextFrame); nextFrame.focus();
}
function endNext(d) {
  const win = d.t === 'edt-next-run';
  nextRes = { pos: win ? d.pos | 0 : 0 };
  elapsed = +d.time || 0; roadTime = elapsed;
  run.caps += d.beers | 0; run.hits = d.falls | 0;
  lives = Math.max(0, maxLives - (d.falls | 0));
  run.wheelieMax = +d.impennata || 0; run.splashes = d.pozze | 0; run.cleanSectors = d.settori | 0;   // per le missioni: impennata piu' lunga, pozzanghere prese, tratti senza cadute
  run.jumps = d.tronchi | 0;   // i tronchi passati in impennata prendono il posto dei salti (300 punti l'uno)
  score = (d.beers | 0) * 100 + (d.tronchi | 0) * 300 + (ice ? d.drift | 0 : 0); driftScore = d.drift | 0;
  course = win ? GAME_LENGTH : GAME_LENGTH * .5;
  if (nextFrame) { nextFrame.style.display = 'none'; nextFrame.contentWindow?.postMessage({ t: 'edt-next-sleep' }, location.origin); }
  if (win && mode === 9 && elapsed <= NEXT_LIMIT[9] && !P.ownsBike('shadow')) { P.profile.owned['bike:shadow'] = true; P.save(); setTimeout(() => toast('🔓 SBLOCCATA LA SHADOW CHIODATA: È IN GARAGE', 'gold'), 2600); }   // medaglia su Ice Scrofy = Shadow chiodata
  state = 'playing';
  try { finish(win, win ? '' : 'RITIRATO'); } finally { nextRes = null; }
}
addEventListener('message', e => { if (e.origin !== location.origin || state !== 'next') return; const d = e.data || {}; if (d.t === 'edt-next-run' || d.t === 'edt-next-quit') endNext(d); });
""" % V2

# 5) il 3D del gioco con la Shadow tra i modelli del garage
sc = open(os.path.join(ROOT, 'scene3d.js'), encoding='utf-8').read()
sc, n = re.subn(r"(from |import\()'\./", r"\1'../", sc)
assert n >= 5, n
for old, new, what in [("fakedomi: 'fakedomi', electric: 'electric',", "fakedomi: 'fakedomi', shadow: 'shadow', electric: 'electric',", 'BIKE_GLB'), ("fakedomi: [.46, 1.33, -.45, 1.11] };", "fakedomi: [.46, 1.33, -.45, 1.11], shadow: [.47, 1.22, -.32, .8] };", 'BIKE_FIT')]:
    if old not in sc: sys.exit('v2.py: non trovo %s in scene3d.js' % what)
    sc = sc.replace(old, new, 1)
sh = hashlib.sha1(sc.encode()).hexdigest()[:8]
open(os.path.join(ROOT, 'v2', 'scene3d.js'), 'w', encoding='utf-8').write(sc)
g = re.sub(r"import\('\./scene3d\.js\?v=[0-9a-z]+'\)", "import('./scene3d.js?v=" + sh + "')", g)
# progress.js: copia con le missioni adattate alla guida nuova (lo importa solo game.js)
pr = open(os.path.join(ROOT, 'progress.js'), encoding='utf-8').read()
for old, new, what in [
    ("{ id: 'jumps', kind: 'run', stat: 'jumps', tiers: [6, 10, 14], xp: 140, text: n => `Supera ${n} ostacoli saltando` },", "{ id: 'jumps', kind: 'run', stat: 'jumps', tiers: [2, 3, 4], xp: 140, text: n => `Passa ${n} tronchi in impennata` },   // v2 · i tronchi al posto dei salti", 'missione salti'),
    ("  { id: 'perfect', kind: 'run', stat: 'perfect', tiers: [2, 4, 6], xp: 160, text: n => `Fai ${n} salti perfetti` },\n", "", 'missione perfetti'),
    ("  { id: 'combo', kind: 'run', stat: 'maxMult', tiers: [3, 4, 4], xp: 150, text: n => `Arriva alla combo ×${n}` },\n", "", 'missione combo'),
    ("  { id: 'scrub', kind: 'run', stat: 'scrubs', tiers: [2, 4, 7], xp: 140, text: n => `Fai ${n} scrub (sterza mentre sei in volo)` },\n", "", 'missione scrub'),
    ("  { id: 'near', kind: 'run', stat: 'near', tiers: [3, 5, 8], xp: 130, text: n => `Passa \"per un pelo\" ${n} volte` },\n", "", 'missione per un pelo'),
    ("  { id: 'turbo', kind: 'run', stat: 'turbos', tiers: [1, 2, 3], xp: 120, text: n => n === 1 ? 'Usa il turbo' : `Usa il turbo ${n} volte in un giro` },\n", "", 'missione turbo'),
    ("  { id: 'air', kind: 'run', stat: 'airCaps', tiers: [3, 6, 9], xp: 150, text: n => `Prendi ${n} birre al volo` },\n", "", 'missione birre al volo'),
    ("  { id: 'angelo', kind: 'run', stat: 'angeloFinish', tiers: [1, 1, 1], xp: 250, text: () => 'Arriva al rifugio sul Taglio di Angelo' },\n", "", 'missione angelo'),
    ("  { id: 'daily', kind: 'run', stat: 'dailyFinish', tiers: [1, 1, 1], xp: 220, text: () => 'Completa la Sfida del giorno' },\n", "", 'missione sfida del giorno'),
    ("  { id: 'grappa', kind: 'run', stat: 'grappas', tiers: [1, 1, 2], xp: 130, text: n => n === 1 ? 'Prendi una grappa' : `Prendi ${n} grappe in un giro` },\n", "", 'missione grappa'),
    ("  { id: 'ramps', kind: 'run', stat: 'ramps', tiers: [1, 3, 5], xp: 140, text: n => n === 1 ? 'Vola da una rampa' : `Vola da ${n} rampe in un giro` },\n", "", 'missione rampe'),
    ("stat: 'caps', tiers: [40, 70, 100]", "stat: 'caps', tiers: [15, 25, 35]", 'birre in un giro'),
    ("stat: 'cleanSectors', tiers: [2, 4, 6]", "stat: 'cleanSectors', tiers: [4, 7, 10]", 'settori puliti'),
    ("{ id: 'perfect', name: 'Fai 3 salti perfetti in un giro', icon: 'star' },", "{ id: 'perfect', name: 'Passa 2 tronchi in impennata in un giro', icon: 'star' },", 'missione pilota nuovo'),
]:
    if old not in pr: sys.exit('v2.py: non trovo %s in progress.js' % what)
    pr = pr.replace(old, new, 1)
ph = hashlib.sha1(pr.encode()).hexdigest()[:8]
_x = "export const isUnlocked = (m, level = levelInfo().level) => (m.event !== 'xmas' || xmasOn()) && level >= (m.unlock || 1);"
if _x not in pr: sys.exit('v2.py: non trovo isUnlocked in progress.js')
pr = pr.replace(_x, "export const isUnlocked = (m, level = levelInfo().level) => m.event === 'xmas' || level >= (m.unlock || 1);   // v2 · prova: la Christmas Madness e' aperta subito, senza aspettare il 1 dicembre")
_x = "export const lockText = m => m.event === 'xmas' && !xmasOn() ? 'ARRIVA IL 1° DICEMBRE' : 'LIV ' + (m.unlock || 1);"
if _x not in pr: sys.exit('v2.py: non trovo lockText in progress.js')
pr = pr.replace(_x, "export const lockText = m => 'LIV ' + (m.unlock || 1);")
ph = hashlib.sha1(pr.encode()).hexdigest()[:8]
open(os.path.join(ROOT, 'v2', 'progress.js'), 'w', encoding='utf-8').write(pr)
g, n = re.subn(r"from '\.\./progress\.js\?v=[0-9a-z]+'", "from './progress.js?v=" + ph + "'", g)
assert n == 1, n
g = rep(g, "if (run.perfect >= 3) starterTick('perfect');", "if (run.jumps >= 2) starterTick('perfect');", 'starter tronchi')
g = rep(g, "<div><b>${run.wheelieMax ? run.wheelieMax.toFixed(1).replace('.', ',') + 's' : run.perfect}</b><small>${run.wheelieMax ? 'IMPENNATA' : 'PERFETTI'}</small></div>", "${NEXT_PISTA[mode] !== undefined && !run.wheelieMax ? '' : `<div><b>${run.wheelieMax ? run.wheelieMax.toFixed(1).replace('.', ',') + 's' : run.perfect}</b><small>${run.wheelieMax ? 'IMPENNATA' : 'PERFETTI'}</small></div>`}", 'via perfetti')
g = rep(g, "<div><b>×${run.maxMult}</b><small>COMBO MAX</small></div>", "${NEXT_PISTA[mode] !== undefined ? '' : `<div><b>×${run.maxMult}</b><small>COMBO MAX</small></div>`}", 'via combo')
gh = hashlib.sha1(g.encode()).hexdigest()[:8]
open(os.path.join(ROOT, 'v2', 'game.js'), 'w', encoding='utf-8').write(g)

h = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
h, n = re.subn(r'href="progress\.js\?v=[0-9a-z]+"', 'href="v2/progress.js?v=' + ph + '"', h); assert n == 1, n
m = re.search(r'game\.js\?v=([0-9a-z]+)', h)
h = h.replace('game.js?v=' + m.group(1), 'v2/game.js?v=' + gh)
head = """<base href="../">
<meta name="robots" content="noindex">
<script>
// v2 · PROVA: il gioco uscito con la guida nuova. Non scrive nella classifica vera e tiene i suoi salvataggi separati
// (alla prima apertura copia quelli del gioco vero, cosi' ritrovi pilota, moto e birre; da li' in poi non li tocca piu').
window.EDT_BOARD_URL = 'https://invalid.invalid/exec';
(function () { var P = 'v2:', S = Storage.prototype, g = S.getItem, s = S.setItem, r = S.removeItem;
  try { if (!g.call(localStorage, P + '__copiato')) { var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(P) !== 0 && k.indexOf('edt-next-') !== 0) ks.push(k); }
      ks.forEach(function (k) { if (g.call(localStorage, P + k) === null) s.call(localStorage, P + k, g.call(localStorage, k)); }); s.call(localStorage, P + '__copiato', '1'); } } catch (e) {}
  try { if (!g.call(localStorage, P + '__rec0')) { var K = P + 'edt-giro-easy-v15', d = JSON.parse(g.call(localStorage, K) || 'null'); if (d) { ['0', '1', '9', '18'].forEach(function (m) { ['best', 'board', 'stars'].forEach(function (f) { if (d[f]) delete d[f][m]; }); }); s.call(localStorage, K, JSON.stringify(d)); } s.call(localStorage, P + '__rec0', '1'); } } catch (e) {}   /* con la guida nuova record, classifica del telefono e stelle dei percorsi rifatti ripartono da zero (una volta sola) */
  try { if (!g.call(localStorage, P + '__rec14')) { var K = P + 'edt-giro-easy-v15', d = JSON.parse(g.call(localStorage, K) || 'null'); if (d) { ['14'].forEach(function (m) { ['best', 'board', 'stars'].forEach(function (f) { if (d[f]) delete d[f][m]; }); }); s.call(localStorage, K, JSON.stringify(d)); } s.call(localStorage, P + '__rec14', '1'); } } catch (e) {}
  try { if (!g.call(localStorage, P + '__rec3')) { var K = P + 'edt-giro-easy-v15', d = JSON.parse(g.call(localStorage, K) || 'null'); if (d) { ['17', '20', '21'].forEach(function (m) { ['best', 'board', 'stars'].forEach(function (f) { if (d[f]) delete d[f][m]; }); }); s.call(localStorage, K, JSON.stringify(d)); } s.call(localStorage, P + '__rec3', '1'); } } catch (e) {}
  try { if (!g.call(localStorage, P + '__rec9')) { var K = P + 'edt-giro-easy-v15', d = JSON.parse(g.call(localStorage, K) || 'null'); if (d) { ['9'].forEach(function (m) { ['best', 'board', 'stars'].forEach(function (f) { if (d[f]) delete d[f][m]; }); }); s.call(localStorage, K, JSON.stringify(d)); } s.call(localStorage, P + '__rec9', '1'); } } catch (e) {}   /* Ice Scrofy rallentata: i tempi vecchi non valgono piu' */
  S.getItem = function (k) { return g.call(this, P + k); }; S.setItem = function (k, v) { return s.call(this, P + k, v); }; S.removeItem = function (k) { return r.call(this, P + k); }; })();
</script>
"""
h = h.replace('<head>', '<head>\n' + head, 1) if '<head>' in h else sys.exit('v2.py: manca <head>')
open(os.path.join(ROOT, 'v2', 'index.html'), 'w', encoding='utf-8').write(h)
print('v2 pronta: game.js', gh, len(g), 'byte')
