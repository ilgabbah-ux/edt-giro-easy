// EDT Giro Easy · v18
// Fisica condivisa da logica di gioco e grafica: traiettoria del salto,
// altezze reali degli ostacoli, profilo del terreno e sezioni del percorso.

export const JUMP_DURATION = 1.05;
export const JUMP_HEIGHT = 2.05;
export const GAME_LENGTH = 60;
// Super salto della grappa.
export const SUPER_JUMP = { duration: 1.4, height: 3.0 };

// Altezza (in metri di scena) che il salto deve superare per ogni ostacolo.
export const OBSTACLE_HEIGHT = {
  rock: 1.02,
  log: .68,
  bigLog: .68,
  mud: .08,
  puddle: .08,
  root: .36,
  step: .60,
  stump: .55,     // ceppo (sottobosco)
  hay: .78,       // balla di fieno (pozzanghere)
  cairn: .70,     // ometto di pietra (salitone)
  goat: .85,      // capra (mulattiera)
  rollRock: .90,  // sasso che rotola giù dalla frana (mulattiera)
  water: .50,     // bottiglia d'acqua: da evitare o saltare
  snowman: .92,   // v46 · pupazzo di neve (Ice Scrophy)
  ibex: .95,      // v46 · stambecco (Valle Argentera)
  chamois: .85,   // v46 · camoscio
  marmot: .38,    // v46 · marmotta
  boulder: 2.4,   // v62 · pietrone della zona di atterraggio (non si salta)
  cone: .52,      // v57 · birillo lanciato dalle GEV
  tyre: .50,      // v57 · copertone lanciato dalle GEV
  sign: .92,      // v57 · cartello di divieto lanciato dalle GEV
  barrier: .80,   // v57 · transenna lanciata dalle GEV
  trincia: 2.6,   // v81 · trattore con la trincia del Gusta (non si salta)
};

export function jumpHeight(remaining, duration = JUMP_DURATION, height = JUMP_HEIGHT) {
  if (remaining <= 0 || remaining >= duration) return 0;
  return Math.sin((duration - remaining) / duration * Math.PI) * height;
}

export function clearsObstacle(type, lift) {
  return Object.hasOwn(OBSTACLE_HEIGHT, type) && lift >= OBSTACLE_HEIGHT[type] + .06;
}

// "Salto perfetto": l'ostacolo passa sotto la moto vicino al punto più alto.
export function isPerfectJump(phase) {
  return phase > .34 && phase < .66;
}

// Sezioni del percorso, in "secondi di percorso" (0-60 = dalla partenza al rifugio).
// Ogni percorso è una sequenza di tratti: t = tipo di paesaggio (0 sottobosco, 1 pozzanghere,
// 2 salitone, 3 mulattiera), len = lunghezza, più opzioni: climb (salita), down (discesa), rough (sassi/stretto).
export const SECTION_NAMES = ['SOTTOBOSCO', 'POZZANGHERE', 'SALITONE HARD', 'MULATTIERA'];
export const SECTIONS = [
  { id: 0, from: 0, to: 12, name: 'SOTTOBOSCO' },
  { id: 1, from: 12, to: 26, name: 'POZZANGHERE' },
  { id: 2, from: 26, to: 43, name: 'SALITONE HARD' },
  { id: 3, from: 43, to: 60, name: 'MULATTIERA' },
];
export const CLASSIC_LAYOUT = [
  { t: 0, len: 7.5 }, { t: 0, len: 4.5, down: 1 }, { t: 1, len: 7.5 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 1.5 },
  { t: 2, len: 17 }, { t: 3, len: 17 },
];

const smooth = (a, b, x) => {
  const v = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return v * v * (3 - 2 * v);
};

const BASE = [{ climb: 0, rough: 0, wet: 0 }, { climb: 0, rough: 0, wet: 1 }, { climb: 1, rough: 0, wet: 0 }, { climb: 0, rough: 1, wet: 0 }];
let segs = [];
// Imposta il percorso: i tratti vengono riscalati per sommare GAME_LENGTH.
export function setLayout(layout = CLASSIC_LAYOUT) {
  const total = layout.reduce((a, x) => a + x.len, 0);
  let from = 0;
  segs = layout.map((x, i) => {
    const len = x.len / total * GAME_LENGTH, b = BASE[x.t];
    const seg = {
      i, t: x.t, from, to: from + len,
      climb: x.climb ?? b.climb, rough: x.rough ?? b.rough, wet: x.wet ?? b.wet, down: x.down || 0,
      name: x.name || (x.t === 3 && x.climb ? 'MULATTIERA IN SALITA' : x.t === 3 && x.down ? 'MULATTIERA IN DISCESA' : SECTION_NAMES[x.t]),
    };
    from += len;
    return seg;
  });
  return segs;
}
export function layoutSegments() { return segs; }
setLayout();

function segAt(sec) {
  for (const s of segs) if (sec < s.to) return s;
  return segs[segs.length - 1];
}
// Valore che cambia dolcemente da un tratto all'altro (rampa di ±h secondi sul confine).
function blend(sec, key, h = 1) {
  let v = segs[0][key];
  for (let i = 1; i < segs.length; i++) {
    const d = segs[i][key] - segs[i - 1][key];
    if (d) v += d * smooth(segs[i].from - h, segs[i].from + h, sec);
  }
  return v;
}

// Profilo continuo nello spazio: rampe ripide seguite da ripiani visibili.
function ascent(x) {
  const cycle = Math.floor(x / 90), u = x - cycle * 90;
  return x * .08 + cycle * 25 + 25 * smooth(14, 62, u);
}
function mule(x) {
  return x * .18 + Math.sin(x * .19) * .65 + Math.sin(x * .47) * .18;
}
function elevation(x, r) {
  return Math.sin(x * .034) * .8 + ascent(x) * r.climb + mule(x) * r.rough * (1 - (r.down || 0)) - x * .21 * (r.down || 0);
}

export function terrainHeight(z, t, r) {
  return elevation(t - z, r) - elevation(t, r);
}
export function terrainGrade(z, t, r) {
  return (terrainHeight(z - .2, t, r) - terrainHeight(z + .2, t, r)) / .4;
}

// Peso (0-1) di sottobosco, pozzanghere, salitone e mulattiera in un punto del percorso.
export function sectionWeights(seconds) {
  const w = [0, 0, 0, 0];
  w[segs[0].t] = 1;
  for (let i = 1; i < segs.length; i++) {
    if (segs[i].t === segs[i - 1].t) continue;
    const k = smooth(segs[i].from - 1, segs[i].from + 1, seconds);
    if (k <= 0) break;
    w[segs[i - 1].t] -= k; w[segs[i].t] += k;
  }
  return w.map(v => Math.max(0, Math.min(1, v)));
}

export function routeAt(seconds, travel = 0) {
  const seg = segAt(seconds);
  const climb = Math.max(0, Math.min(1, blend(seconds, 'climb', 1.5)));
  const rough = Math.max(0, Math.min(1, blend(seconds, 'rough', 1.5)));
  const route = {
    id: seg.t,
    seg: seg.i,
    name: seg.name,
    climb,
    width: 1 - rough * .48,
    rough,
    wet: Math.max(0, Math.min(1, blend(seconds, 'wet'))),
    down: Math.max(0, Math.min(1, blend(seconds, 'down', .75))),
    w: sectionWeights(seconds),
  };
  route.grade = terrainGrade(0, travel, route);
  return route;
}

// Percorso casuale riproducibile (Sfida del giorno, Giro a caso).
export function randomLayout(rng) {
  const out = [{ t: 0, len: 4 + rng() * 3 }];
  let total = out[0].len, prev = 0;
  while (total < 60) {
    let t = Math.floor(rng() * 4);
    if (t === prev && rng() < .6) t = (t + 1 + Math.floor(rng() * 3)) % 4;
    const seg = { t, len: 5 + rng() * 8 };
    if ((t === 0 || t === 1) && rng() < .4) seg.down = 1;
    if (t === 3 && rng() < .35) seg.climb = 1;
    out.push(seg); total += seg.len; prev = t;
  }
  return out;
}

// Velocità relativa: la salita frena molto senza GAS o turbo, la discesa spinge.
export function paceFor(route, gas, turbo, wet) {
  return (turbo > 0 ? 1.42 : 1) * (wet > 0 ? .62 : 1) *
    (1 - Math.max(0, route.grade) * ((gas || turbo > 0) ? .16 : .8)) *   // v48 · salite più dure: senza gas si pianta
    (1 + Math.max(0, -route.grade) * .45);
}

// v88 · Ice Scrofy: solo curve. Una sequenza di curvoni, esse e tornanti a U (curvatura lunga e forte) da fare in derapata.
// iceBend = curvatura normalizzata (+ = spinge verso destra, 1 ≈ le vecchie curve più strette, 1,6 = tornante).
// iceShape = spostamento laterale (doppio integrale della curvatura); iceHeading = la sua pendenza (la camera la segue).
const IK = .0102;
const ICE_SEGS = [   // [lunghezza, curvatura]
  [45, 0], [55, .8], [40, -.8], [30, 0], [110, 1.6], [25, 0], [45, -1], [45, 1], [45, -1], [25, 0],
  [120, -1.6], [30, 0], [60, 1.2], [20, 0], [60, -1.2], [25, 0], [95, 1.5], [15, 0], [95, -1.5], [30, 0],
  [40, .9], [40, -.9], [40, .9], [25, 0], [130, 1.6], [30, 0], [70, -1.3], [70, 1.3], [25, 0], [120, -1.6], [35, 0],
];
const ICE_STEP = .5, ICE_X0 = -400, ICE_N = 7200;
const iceK = new Float32Array(ICE_N), iceH = new Float64Array(ICE_N), iceP = new Float64Array(ICE_N);
(() => {
  const tot = ICE_SEGS.reduce((a, s) => a + s[0], 0), RAMP = 14;
  const kAt = x => {   // curvatura con raccordi morbidi tra un tratto e l'altro
    let u = ((x % tot) + tot) % tot, i = 0;
    while (u >= ICE_SEGS[i][0]) { u -= ICE_SEGS[i][0]; i = (i + 1) % ICE_SEGS.length; }
    const cur = ICE_SEGS[i][1], prev = ICE_SEGS[(i - 1 + ICE_SEGS.length) % ICE_SEGS.length][1];
    if (u >= RAMP) return cur;
    const w = u / RAMP, sm = w * w * (3 - 2 * w); return prev + (cur - prev) * sm;
  };
  for (let i = 0; i < ICE_N; i++) iceK[i] = kAt(ICE_X0 + i * ICE_STEP);
  for (let i = 1; i < ICE_N; i++) { iceH[i] = iceH[i - 1] - iceK[i] * IK * ICE_STEP; iceP[i] = iceP[i - 1] + iceH[i] * ICE_STEP; }
})();
const iceIdx = x => { const f = (x - ICE_X0) / ICE_STEP; const i = Math.max(0, Math.min(ICE_N - 2, Math.floor(f))); return [i, Math.max(0, Math.min(1, f - i))]; };
export function iceBend(x) { const [i, f] = iceIdx(x); return iceK[i] + (iceK[i + 1] - iceK[i]) * f; }
export function iceShape(x) { const [i, f] = iceIdx(x); return iceP[i] + (iceP[i + 1] - iceP[i]) * f; }
export function iceHeading(x) { const [i, f] = iceIdx(x); return iceH[i] + (iceH[i + 1] - iceH[i]) * f; }

// Generatore pseudo-casuale riproducibile (per la Sfida del giorno).
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
