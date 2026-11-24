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
V2 = 9   # versione della prova: si alza a ogni modifica dell'incastro


def rep(s, old, new, what):
    if old not in s:
        sys.exit('v2.py: non trovo il punto "%s" in game.js: il gioco e\' cambiato, va rivisto l\'incastro' % what)
    return s.replace(old, new, 1)


g = open(os.path.join(ROOT, 'game.js'), encoding='utf-8').read()

# 1) i moduli restano quelli della radice
g, n = re.subn(r"(from |import\()'\./", r"\1'../", g)
assert n >= 10, n

# 2) solo i tre percorsi rifatti (piu' la scuola), e la Salita Infame al posto di Dopo migliora
g = rep(g, "import * as D from '../duel.js", """for (const m of P.MODES) if (![0, 1, 9, 22].includes(m.id)) m.hidden = true;   // v2 · per ora solo i percorsi gia' rifatti in 3D
{ const m = P.MODES.find(x => x.id === 1); if (m) { m.name = 'Salita Infame'; m.short = 'INFAME'; m.desc = 'Il muro coi gradoni, la pietraia in salita, i tornanti di mulattiera e la cresta in single track. Poi giù a rotta di collo.'; } }
import * as D from '../duel.js""", 'import duel')

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
const NEXT_PISTA = { 0: 'g', 1: 'i', 9: 'x', 22: 's' }, NEXT_LIMIT = { 0: 150, 1: 172, 9: 128, 22: 900 };
const NEXT_BIKE = { edt250: 'enduro', gp125: 'hard300', trial: 'trial', ts300: 'hard300', mulo450: 'enduro', vintage: 'vintage', boanal: 'adventure', electric: 'electric', dakar: 'dakar', factory: 'dakar', pitbike: 'pitbike', bestia: 'bestia', fakedomi: 'fakedomi', hard300: 'hard300' };
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
  const q = new URLSearchParams({ embed: '1', pista: NEXT_PISTA[mode], moto: NEXT_BIKE[P.currentBike().id] || 'enduro', rider: profile.rider, num: String(profile.custom?.num || ''), mus: '0', st: JSON.stringify(st), prof: JSON.stringify({ v2: 1, up: upg }), casco: parts.casco?.color || '', fiamma: parts.fiamma?.color || '', v: 'v2-%d' }).toString();
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
  score = (d.beers | 0) * 100 + (ice ? d.drift | 0 : 0); driftScore = d.drift | 0;
  course = win ? GAME_LENGTH : GAME_LENGTH * .5;
  if (nextFrame) { nextFrame.style.display = 'none'; nextFrame.contentWindow?.postMessage({ t: 'edt-next-sleep' }, location.origin); }
  state = 'playing';
  try { finish(win, win ? '' : 'RITIRATO'); } finally { nextRes = null; }
}
addEventListener('message', e => { if (e.origin !== location.origin || state !== 'next') return; const d = e.data || {}; if (d.t === 'edt-next-run' || d.t === 'edt-next-quit') endNext(d); });
""" % V2

gh = hashlib.sha1(g.encode()).hexdigest()[:8]
open(os.path.join(ROOT, 'v2', 'game.js'), 'w', encoding='utf-8').write(g)

h = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
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
  S.getItem = function (k) { return g.call(this, P + k); }; S.setItem = function (k, v) { return s.call(this, P + k, v); }; S.removeItem = function (k) { return r.call(this, P + k); }; })();
</script>
"""
h = h.replace('<head>', '<head>\n' + head, 1) if '<head>' in h else sys.exit('v2.py: manca <head>')
open(os.path.join(ROOT, 'v2', 'index.html'), 'w', encoding='utf-8').write(h)
print('v2 pronta: game.js', gh, len(g), 'byte')
