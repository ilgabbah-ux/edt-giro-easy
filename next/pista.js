// Giro Easy · pista vera in 3D (versione parallela) · geometria della pista, senza grafica: la usano sia la fisica sia il disegno
// Percorso da enduro: tratti larghi e veloci, salita, pietraia, discesa, guado, fango con le pozze, mulattiera a tornanti, single track nel bosco.
export const DS = 2;           // passo dei punti della linea di mezzeria (m)
export const FS = .25;         // passo del profilo del fondo (m)
// tipi di tratto: larghezza del sentiero, terreno ai lati, aderenza, attrito, quanto è sconnesso, immagine del fondo
export const KIND = {
  v: { name: 'veloce', w: 10, side: 26, grip: 1.12, drag: 0, rough: 0, tex: 'trail', tape: 1 },
  s: { name: 'salita', w: 6.5, side: 22, grip: 1.05, drag: 0, rough: .012, tex: 'trail', tape: 1 },
  d: { name: 'discesa', w: 6.5, side: 22, grip: 1.0, drag: 0, rough: .014, tex: 'trail', tape: 1 },
  p: { name: 'pietraia', w: 6, side: 20, grip: .86, drag: .5, rough: .075, tex: 'rock', tape: 0 },
  g: { name: 'guado', w: 7, side: 20, grip: .8, drag: 0, rough: .01, tex: 'rock', tape: 0 },
  f: { name: 'fango', w: 7, side: 22, grip: .68, drag: 1.3, rough: .015, tex: 'mud', tape: 1 },
  m: { name: 'mulattiera', w: 5.2, side: 7.5, grip: 1.0, drag: .15, rough: .03, tex: 'cobble', tape: 0 },
  b: { name: 'macchia', w: 3.2, side: 12, grip: .98, drag: .15, rough: .02, tex: 'forest', tape: 0 },
  t: { name: 'single track', w: 2.6, side: 13, grip: 1.38, drag: 0, rough: .018, tex: 'forest', tape: 0 },
};
// [lunghezza m, raggio m (+ destra, − sinistra, 0 = dritto), pendenza %, tipo]
export const GIRO_EASY = [
  [80, 0, 0, 'v'], [90, 80, 1, 'v'], [60, 0, 2, 'v'], [100, -70, 2, 'v'], [70, 0, -1, 'v'], [80, 60, -2, 'v'],
  [50, 0, 16, 's'], [32, -20, 24, 's'], [52, 0, 30, 's'], [33, 22, 24, 's'], [40, 0, 12, 's'],
  [70, 0, 1, 'p'], [50, -40, 0, 'p'],
  [50, 0, -13, 'd'], [31, 24, -19, 'd'], [37, -22, -17, 'd'], [22, 0, -12, 'd'], [40, 0, -8, 'd'],
  [26, 0, 0, 'g'], [40, 60, 1, 'f'], [50, 0, 0, 'f'],
  [35, 0, 10, 'm'], [31, -17, 14, 'm'], [35, 0, 15, 'm'], [31, 17, 14, 'm'], [35, 0, 12, 'm'], [28, -18, 9, 'm'], [30, 0, 5, 'm'],
  [40, 0, 2, 't'], [23, 15, 0, 't'], [23, -14, -2, 't'], [12, 0, -1, 't'], [35, 22, -3, 't'], [30, -20, -2, 't'], [40, 25, 0, 't'], [30, -22, -3, 't'], [40, 0, -4, 't'],
  [40, 0, -1, 'b'], [45, 30, 0, 'b'], [40, -28, 0, 'b'], [35, 0, 0, 'b'],
  [60, 0, -2, 'v'], [90, -75, -1, 'v'], [110, 0, 0, 'v'],
];
// BIVI del Giro Easy: il sentiero si allarga e in mezzo c'è una fila di sassi. A sinistra la CONIGLIERA (molle, lenta, zero rischi), a destra la EASY (tronchi e sassi, ma veloce e con le birre)
export const GIRO_EXTRA = { forks: [[262, 412, 15, 9], [1822, 1962, 15, 9]] };   // da, a, quanto si allontana la conigliera (a sinistra), quanto la Easy (a destra)
// TAPPA 2 · SALITA INFAME: dal fondovalle su per il muro coi gradoni, pietraia in salita, i tornanti della mulattiera, la cresta in single track, poi giù a rotta di collo fino al guado e alla volata
export const SALITA_INFAME = [
  [70, 0, 0, 'v'], [80, -70, 2, 'v'], [70, 0, 4, 'v'], [60, 55, 5, 'v'],
  [45, 0, 16, 's'], [30, 18, 26, 's'], [60, 0, 34, 's'], [28, -18, 28, 's'], [45, 0, 18, 's'],
  [60, 0, 8, 'p'], [45, 35, 10, 'p'], [50, 0, 6, 'p'],
  [32, 0, 12, 'm'], [28, 16, 15, 'm'], [30, 0, 16, 'm'], [28, -16, 15, 'm'], [30, 0, 14, 'm'], [28, 17, 13, 'm'], [30, 0, 10, 'm'], [27, -17, 8, 'm'], [30, 0, 5, 'm'],
  [50, 0, 2, 't'], [25, -16, 1, 't'], [25, 15, 0, 't'], [30, -20, 1, 't'], [35, 24, 0, 't'], [40, 0, -1, 't'],
  [60, 0, 0, 'v'], [70, 80, -1, 'v'],
  [45, 0, -14, 'd'], [30, -20, -20, 'd'], [40, 22, -18, 'd'], [28, -18, -21, 'd'], [36, 20, -17, 'd'], [40, 0, -12, 'd'],
  [50, 0, -6, 'b'], [40, 26, -5, 'b'], [40, -24, -4, 'b'], [35, 0, -3, 'b'],
  [28, 0, 0, 'g'], [45, -50, 0, 'f'], [55, 0, 1, 'f'], [26, 0, 0, 'g'],
  [40, 0, -8, 'd'], [30, 22, -12, 'd'], [35, 0, -9, 'd'],
  [70, 0, -2, 'v'], [90, -70, -1, 'v'], [120, 0, 0, 'v'],
];
export const SALITA_EXTRA = { forks: [[100, 240, 15, 9], [1935, 2075, 15, 9]] };
// SCUOLA DI ENDURO: un percorso corto a stazioni, ognuna insegna una cosa. Ogni ostacolo nuovo si aggiunge prima qui.
export const SCUOLA = [
  [150, 0, 0, 'v'], [140, 0, 0, 'v'], [140, 0, 0, 'v'], [36, 30, 0, 'v'], [36, -30, 0, 'v'], [36, 30, 0, 'v'], [36, -30, 0, 'v'], [26, 0, 0, 'v'],
  [60, 0, 0, 'f'],
  [40, 0, 0, 'v'], [30, 13, 0, 'v'], [30, 0, 0, 'v'],
  [80, 0, 0, 'v'],
  [80, 0, 0, 'v'],
  [40, 0, 8, 's'], [50, 0, 20, 's'], [20, 0, 6, 's'], [30, 0, 0, 'v'],
  [50, 0, 0, 'p'], [50, 0, 0, 'b'],
  [30, 0, 0, 't'], [23, 15, 0, 't'], [23, -14, 0, 't'], [30, 0, 0, 't'],
  [50, 0, 0, 'v'],
];
export const SCUOLA_EXTRA = { plain: true, logs: [860, 905], steps: [968, 976, 984, 992],
  // Una cosa per volta, dalle basi. Nelle prime tre stazioni la moto sta in strada da sola (auto): prima si impara gas e freno, poi lo sterzo.
  // goal: go = prendere velocità, stop = fermarsi col freno, half = gas a metà, lean = piegare da una parte e dall'altra (si passano appena fatti); gli altri si giudicano a fine stazione. hl = tasto da far lampeggiare
  stations: [
    { s0: 0, s1: 90, goal: 'go', auto: 1, hl: 'gasb', t: 'PARTI', x: 'Tieni premuto il tasto giallo GAS, in basso a destra. La moto parte e per ora sta in strada da sola.', no: 'TIENI PREMUTO IL GAS' },
    { s0: 90, s1: 230, goal: 'stop', auto: 1, hl: 'brake', t: 'FRENA', x: 'Molla il gas e tieni premuto il tasto rosso FRENO, in basso a sinistra, finché la moto è ferma.', no: 'TIENI PREMUTO IL FRENO' },
    { s0: 230, s1: 330, goal: 'half', auto: 1, hl: 'gasb', t: 'DOSA IL GAS', x: 'Riparti col GAS. Poi, senza staccare il pollice, fallo scorrere via dal punto di appoggio: il gas cala (lo leggi sul tasto). Torna indietro: riapre. Tienilo a metà per un secondo.', no: 'POLLICE SUL GAS E FALLO SCORRERE' },
    { s0: 330, s1: 430, goal: 'lean', t: 'STERZA', x: 'Adesso guidi tu. Inclina il telefono come un manubrio: prima a destra, poi a sinistra. (Senza sensore: tocca il lato destro o sinistro dello schermo.)', no: 'INCLINA A DESTRA E A SINISTRA' },
    { s0: 430, s1: 592, goal: 'on', t: 'SLALOM', x: 'Segui le curve inclinando il telefono. Resta sul sentiero.', no: 'RESTA SUL SENTIERO' },
    { s0: 592, s1: 665, goal: 'spin', t: 'FANGO', x: 'Nel fango apri poco: a tutto gas la ruota pattina e non vai avanti. Fai scorrere il pollice finché leggi 40–50%.', no: 'MENO GAS NEL FANGO' },
    { s0: 665, s1: 760, goal: 'slide', hl: 'brake', t: 'CURVA STRETTA', x: 'Arriva una curva stretta a destra: frena prima, poi inclina. Frenando in curva la moto va di traverso e chiude.', no: 'FRENA PRIMA, POI STERZA' },
    { s0: 760, s1: 840, goal: 'wh', hl: 'gasb', t: 'IMPENNATA', x: 'Tieni il GAS premuto, poi stacca il pollice e ripremi subito. La ruota davanti si alza.', no: 'TIENI IL GAS, POI STACCA E RIPREMI SUBITO' },
    { s0: 840, s1: 920, goal: 'pass', t: 'TRONCHI', x: 'Due tronchi. Arriva piano (sotto i 60) e impenna appena prima: lo scavalchi. Con la ruota a terra e forte, cadi.', no: 'IMPENNA PRIMA DEL TRONCO' },
    { s0: 920, s1: 1050, goal: 'pass', t: 'SALITA', x: 'Gas pieno e non mollare. Sui gradoni di pietra alza la ruota davanti.', no: 'GAS PIENO, NON MOLLARE' },
    { s0: 1050, s1: 1160, goal: 'pass', t: 'SASSI E RAMI', x: 'Vai piano. Sassi grossi e alberi si schivano; i rami in faccia ti tolgono la vista.', no: 'PIANO: SCHIVA I SASSI GROSSI' },
    { s0: 1160, s1: 1266, goal: 'pass', hl: 'brake', t: 'SINGLE TRACK', x: 'Stretto tra gli alberi: frena prima della curva, piega tutto, gas in uscita.', no: 'FRENA PRIMA DELLA CURVA' },
  ] };
const smooth = (a, n) => a.map((_, i) => { let s = 0, c = 0; for (let k = -n; k <= n; k++) { s += a[Math.max(0, Math.min(a.length - 1, i + k))]; c++; } return s / c; });
export function buildTrack(segs = GIRO_EASY, extra = {}) {
  let k = [], g = [], w = [], sd = [], kind = [];
  for (const [len, r, gr, kd] of segs) for (let s = 0; s < len; s += DS) { k.push(r ? 1 / r : 0); g.push(gr / 100); w.push(KIND[kd].w); sd.push(KIND[kd].side); kind.push(kd); }
  k = smooth(k, 4); g = smooth(g, 8); w = smooth(w, 6); sd = smooth(sd, 6);
  // mai uguale: la larghezza respira lungo tutto il percorso (strettoie e slarghi), anche dentro lo stesso tratto
  w = w.map((v, i) => { const s = i * DS, kk = kind[i] === 'm' || kind[i] === 't' || kind[i] === 'b' ? .55 : 1; return Math.max(1.9, v * (1 + kk * (.22 * Math.sin(s * .041 + 1) + .13 * Math.sin(s * .097 + 2.3) + .07 * Math.sin(s * .23)))); });
  for (const [a, b] of (extra.forks || [])) for (let i = 0; i < w.length; i++) { const s = i * DS, t = Math.max(0, Math.min(1, Math.min(s - a, b - s) / 14)); if (t > 0) w[i] += (5.4 - w[i]) * t * t * (3 - 2 * t); }   /* nel bivio ogni via è un sentiero stretto */
  const n = k.length, x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), h = new Float32Array(n);
  let px = 0, pz = 0, py = 0, ph = 0;
  for (let i = 0; i < n; i++) { x[i] = px; z[i] = pz; y[i] = py; h[i] = ph; ph += k[i] * DS; px += Math.sin(ph) * DS; pz -= Math.cos(ph) * DS; py += g[i] * DS; }
  const tr = { n, x, z, y, h, k: Float32Array.from(k), g: Float32Array.from(g), w: Float32Array.from(w), side: Float32Array.from(sd), kind, len: (n - 1) * DS, water: [], branches: [], logs: (extra.logs || []).map(s => ({ s })), stations: extra.stations || null, forks: (extra.forks || []).map(([s0, s1, DL, DR]) => ({ s0, s1, DL, DR })), plain: !!extra.plain, steps: extra.steps || null, jumps: extra.jumps || [] };
  // tratti (inizio, fine, tipo) per il disegno e per i cartelli
  tr.spans = []; for (let i = 0; i < n; i++) { const L = tr.spans[tr.spans.length - 1]; if (L && L.kind === kind[i]) L.s1 = (i + 1) * DS; else tr.spans.push({ kind: kind[i], s0: i * DS, s1: (i + 1) * DS }); }
  addGround(tr); return tr;
}
// il fondo: dossi, canali, gobbe (profilo morbido: ci si salta) e quanto è sconnesso (fa lavorare le ruote). Il guado e le pozze sono conche con l'acqua dentro.
function addGround(tr) {
  const m = Math.ceil(tr.len / FS) + 2, bump = new Float32Array(m), rough = new Float32Array(m), feat = [];
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const put = (s, len, fn) => { for (let i = Math.max(0, Math.floor(s / FS)); i <= Math.ceil((s + len) / FS) && i < m; i++) { const u = (i * FS - s) / len; if (u >= 0 && u <= 1) fn(i, u, Math.sin(Math.PI * u)); } };
  for (let i = 0; i < m; i++) rough[i] = KIND[tr.kind[Math.min(tr.n - 1, Math.floor(i * FS / DS))]].rough;
  for (const sp of tr.spans) {
    const L = sp.s1 - sp.s0;
    if (sp.kind === 'g') {   // guado: si scende nel torrente e si risale
      put(sp.s0 + 2, L - 4, (i, u) => { bump[i] -= .55 * Math.pow(Math.sin(Math.PI * u), .7); });
      tr.water.push({ s0: sp.s0 + 3.5, s1: sp.s1 - 3.5, half: 0, depth: .55, kind: 'guado' });
    } else if (sp.kind === 'f') {   // fango: tre o quattro pozze
      for (let s = sp.s0 + 8; s < sp.s1 - 12; s += 17 + rnd() * 8) { const len = 6 + rnd() * 3; put(s, len, (i, u, e) => { bump[i] -= .2 * e * e; }); tr.water.push({ s0: s + 1.2, s1: s + len - 1.2, half: 2.4, off: (rnd() - .5) * 2.2, depth: .2, kind: 'pozza' }); }
    } else if (sp.kind === 'v' || sp.kind === 's' || sp.kind === 'd') {   // dossi, canali e gobbe
      const kinds = sp.kind === 'v' ? ['dosso', 'gobbe', 'dosso'] : sp.kind === 's' ? ['canale', 'gradino'] : ['dosso', 'canale'];
      const stp = tr.steps ? tr.steps.filter(s => s > sp.s0 && s < sp.s1) : []; if (!tr.steps) for (let s = sp.s0 + 88; s < sp.s0 + 126; s += 7.5) stp.push(s);
      if (sp.kind === 's') for (const s of stp) { feat.push({ s, kind: 'gradone' }); put(s, 6, (i, u) => { bump[i] += .42 * (u < .3 ? u / .3 : 1 - (u - .3) / .7); }); }   // gradoni sul pezzo più ripido: salgono di colpo e scendono piano
      let q = 0; if (!tr.plain) for (let s = sp.s0 + 34; s < sp.s1 - 30; s += 44 + rnd() * 30) {
        const kd = kinds[q++ % kinds.length], tight = Math.abs(tr.k[Math.min(tr.n - 1, Math.round(s / DS))]) > .025 ? .55 : 1; feat.push({ s, kind: kd });
        if (kd === 'dosso') put(s, 6.5, (i, u, e) => { bump[i] += .45 * tight * e * e; });
        else if (kd === 'canale') put(s, 4, (i, u, e) => { bump[i] -= .22 * tight * e * e; });
        else if (kd === 'gradino') put(s, 5, (i, u, e) => { bump[i] += .28 * tight * e * e * (u < .5 ? 1 : .5); });
        else put(s, 15, (i, u, e) => { bump[i] += .2 * tight * Math.pow(Math.sin(Math.PI * u * 3), 2) * Math.min(1, e * 3); });
      }
    } else if (sp.kind === 'p') {   // pietraia: lastre e scalini
      for (let s = sp.s0 + 6; s < sp.s1 - 8; s += 7 + rnd() * 6) { const a = (.06 + rnd() * .09) * (rnd() > .4 ? 1 : -1); put(s, 3.5 + rnd() * 2, (i, u, e) => { bump[i] += a * e; }); }
    } else if (sp.kind === 'm') {   // mulattiera: canalette di scolo di traverso
      for (let s = sp.s0 + 12; s < sp.s1 - 6; s += 19 + rnd() * 6) put(s, 2.4, (i, u, e) => { bump[i] += .08 * e * e; });
    } else if (sp.kind === 'b') {   // macchia: rami bassi che sporgono, una volta da una parte e una dall'altra
      let sg = 1; for (let s = sp.s0 + 9; s < sp.s1 - 5; s += 8 + rnd() * 7) { tr.branches.push({ s, side: sg, reach: .15 + rnd() * .5 }); sg = rnd() < .75 ? -sg : sg; }
    } else if (sp.kind === 't') {   // single track: radici e piccoli dossi naturali
      for (let s = sp.s0 + 10; s < sp.s1 - 8; s += 21 + rnd() * 12) put(s, 5, (i, u, e) => { bump[i] += .16 * e * e; });
    }
  }
  /* DOSSI DA SALTO: una rampa che sale sempre più ripida per 11 m e poi cade in 4. Presa forte si stacca e si vola; presa piano si scavalca */
  for (const s of tr.jumps) { feat.push({ s: s + 11, kind: 'salto' }); put(s, 15, (i, u) => { const a = u / .733; bump[i] += 1.0 * (a < 1 ? a * a : Math.pow(1 - (u - .733) / .267, 1.5)); }); }
  tr.bump = bump; tr.rough = rough; tr.feat = feat;
  for (const wt of tr.water) { const sm = (wt.s0 + wt.s1) / 2; wt.y = centerY(tr, sm) + prof(bump, sm) + wt.depth * (wt.kind === 'guado' ? .62 : .7); }
}
const prof = (a, s) => { const f = Math.max(0, Math.min(a.length - 1.001, s / FS)), i = f | 0; return a[i] + (a[i + 1] - a[i]) * (f - i); };
const lerpA = (a, s, n) => { const f = Math.max(0, Math.min(n - 1.001, s / DS)), i = f | 0; return a[i] + (a[i + 1] - a[i]) * (f - i); };
const centerY = (tr, s) => lerpA(tr.y, s, tr.n);
export const roughAt = (tr, s) => prof(tr.rough, s);
export const widthAt = (tr, s) => lerpA(tr.w, s, tr.n);
export const sideAt = (tr, s) => lerpA(tr.side, s, tr.n);
export const kindAt = (tr, s) => KIND[tr.kind[Math.max(0, Math.min(tr.n - 1, Math.round(s / DS)))]];
// profondità dell'acqua in un punto (0 = asciutto)
export function waterAt(tr, s, d, gy) { for (const wt of tr.water) if (s > wt.s0 && s < wt.s1 && (!wt.half || Math.abs(d - (wt.off || 0)) < wt.half)) return Math.max(0, wt.y - gy); return 0; }
const noise = (a, b) => Math.sin(a * .071 + b * .13) * .5 + Math.sin(a * .023 - b * .051 + 1.7) * .5;
// altezza del terreno a distanza s lungo la pista e d di lato (+ = destra). smoothOnly = senza il sassolino fine (per la fisica)
// BIVI VERI: dentro un bivio il sentiero si sdoppia. Le due vie si allontanano dalla linea di mezzo (una a sinistra, una a destra), in mezzo resta un'isola di bosco, poi si riuniscono.
const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const forkAt = (tr, s) => tr.forks.find(f => s > f.s0 && s < f.s1);
export function laneOff(tr, s, side) { const f = forkAt(tr, s); return f ? sm((s - f.s0) / 40) * sm((f.s1 - s) / 40) * (side < 0 ? f.DL : f.DR) : 0; }   // di quanto è spostata la via di quel lato
export const laneSide = (tr, s, d) => d >= (laneOff(tr, s, 1) - laneOff(tr, s, -1)) / 2 ? 1 : -1;   // su quale via sei (la più vicina): 1 destra, -1 sinistra
export const lat = (tr, s, d) => Math.min(Math.abs(d - laneOff(tr, s, 1)), Math.abs(d + laneOff(tr, s, -1)));   // distanza dal centro della via più vicina: continua anche in mezzo all'isola
export function groundY(tr, s, d, smoothOnly) {
  const yc = centerY(tr, s), kk = lerpA(tr.k, s, tr.n), hw = widthAt(tr, s) / 2, kd = kindAt(tr, s);
  const fkk = forkAt(tr, s), a = Math.abs(lat(tr, s, d)), out = Math.max(0, a - hw);
  let fstep = 0; if (fkk && d > 0) for (const q of [fkk.s0 + 64, fkk.s0 + 84]) { const u = (s - q) / 5; if (u > 0 && u < 1) fstep += .3 * (u < .3 ? u / .3 : 1 - (u - .3) / .7) * Math.max(0, 1 - out / 1.5); }   // sulla via Easy due gradoni
  const rut = (-.04 * Math.pow(Math.cos(Math.min(a, hw) * Math.PI / (hw * 2) * 2.2), 2) + Math.sin(s * .9 + d) * .01) * Math.max(0, 1 - out / 1.5);
  const bank = -d * Math.max(-.07, Math.min(.07, kk * 2.2)) * Math.min(1, hw / Math.max(a, .01)) * (.6 + .4 * Math.max(0, 1 - out / 2)) * (fkk ? 0 : 1);   /* niente scalino sul bordo: uscendo non si decolla */
  // ai lati: prato che sale dolce; sulla mulattiera un lato è la scarpata a monte e l'altro scende; nel single track il sottobosco è mosso
  let side = out * out * .012 * (1 + noise(s, d) * .9) + out * .05 * noise(s * 1.7, d * 2 + 9);
  if (kd.name === 'mulattiera') side = out * (d > 0 ? .3 : -.2) + out * .08 * noise(s * 2, d * 3);
  else if (kd.name === 'single track') side = out * .1 * noise(s * 2.3, d * 2.1 + 4) + out * out * .008;
  const fade = Math.max(0, 1 - out / 3), rg = smoothOnly ? 0 : prof(tr.rough, s) * (Math.sin(s * 7.3 + d * 5.1) + Math.sin(s * 11.7 - d * 3.3)) * .5;
  if (fkk) { const isl = Math.min(d + laneOff(tr, s, -1), laneOff(tr, s, 1) - d); if (isl > hw) side += 2.1 * sm((isl - hw - .4) / 4.5); }   // l'isola tra le due vie è un dosso di bosco: da una via non si vede l'altra
  return yc + rut + bank + side + fstep + (prof(tr.bump, s) + rg) * fade;
}
// punto del mondo a (s, d)
export function at(tr, s, d, out = {}) {
  const f = Math.max(0, Math.min(tr.n - 1.001, s / DS)), i = f | 0, t = f - i;
  const hx = tr.h[i] + (tr.h[i + 1] - tr.h[i]) * t;
  out.x = tr.x[i] + (tr.x[i + 1] - tr.x[i]) * t + Math.cos(hx) * d; out.z = tr.z[i] + (tr.z[i + 1] - tr.z[i]) * t + Math.sin(hx) * d;
  out.h = hx; out.y = groundY(tr, s, d); return out;
}
// dal mondo alla pista: cerca il punto più vicino partendo dall'ultimo indice conosciuto
export function project(tr, px, pz, hint = 0) {
  let best = hint, bd = 1e9;
  for (let i = Math.max(0, hint - 10); i <= Math.min(tr.n - 2, hint + 16); i++) { const dx = px - tr.x[i], dz = pz - tr.z[i], d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = i; } }
  let i = best; const tx = Math.sin(tr.h[i]), tz = -Math.cos(tr.h[i]);
  let along = (px - tr.x[i]) * tx + (pz - tr.z[i]) * tz;
  if (along < 0 && i > 0) { i--; along += DS; }
  const d = (px - tr.x[best]) * Math.cos(tr.h[best]) + (pz - tr.z[best]) * Math.sin(tr.h[best]);
  const s = Math.max(0, i * DS + Math.max(0, Math.min(DS, along)));
  const f = Math.min(tr.n - 1.001, s / DS), j = f | 0, t = f - j;
  return { i: best, s, d, h: tr.h[j] + (tr.h[j + 1] - tr.h[j]) * t, k: tr.k[j] + (tr.k[j + 1] - tr.k[j]) * t, g: tr.g[j] + (tr.g[j + 1] - tr.g[j]) * t };
}
