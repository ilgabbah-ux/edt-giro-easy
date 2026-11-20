// Giro Easy · pista vera in 3D (versione parallela, tappa 1) · geometria della pista, senza grafica: la usano sia la fisica sia il disegno
export const W = 8;            // larghezza del sentiero (m)
export const DS = 2;           // passo dei punti della linea di mezzeria (m)
export const SIDE = 26;        // quanto terreno c'è ai lati (m)
// [lunghezza m, raggio m (+ destra, − sinistra, 0 = dritto), pendenza %]
export const GIRO_EASY = [
  [70, 0, 0], [70, 60, 2], [40, 0, 3], [80, -45, 4], [50, 0, -2], [60, 35, -5], [30, 0, 0], [40, -24, 2], [40, 24, 3],
  [60, 0, 6], [40, -18, 7], [60, 0, 5], [40, 18, 6], [70, 0, 2], [90, 70, -3], [60, -40, -6], [40, 30, -6], [80, 0, -4],
  [70, -55, 0], [45, 26, 2], [45, -26, 2], [100, 0, 0],
];
const smooth = (a, n) => a.map((_, i) => { let s = 0, c = 0; for (let k = -n; k <= n; k++) { const v = a[Math.max(0, Math.min(a.length - 1, i + k))]; s += v; c++; } return s / c; });
export function buildTrack(segs = GIRO_EASY) {
  let k = [], g = [];
  for (const [len, r, gr] of segs) for (let s = 0; s < len; s += DS) { k.push(r ? 1 / r : 0); g.push(gr / 100); }
  k = smooth(k, 5); g = smooth(g, 9);
  const n = k.length, x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), h = new Float32Array(n);
  let px = 0, pz = 0, py = 0, ph = 0;
  for (let i = 0; i < n; i++) { x[i] = px; z[i] = pz; y[i] = py; h[i] = ph; ph += k[i] * DS; px += Math.sin(ph) * DS; pz -= Math.cos(ph) * DS; py += g[i] * DS; }
  return { n, x, z, y, h, k: Float32Array.from(k), g: Float32Array.from(g), len: (n - 1) * DS };
}
const noise = (a, b) => Math.sin(a * .071 + b * .13) * .5 + Math.sin(a * .023 - b * .051 + 1.7) * .5;
// altezza del terreno a distanza s lungo la pista e d di lato (+ = destra): sentiero quasi piatto con due solchi, poi il prato che sale e scende
export function groundY(tr, s, d) {
  const f = Math.max(0, Math.min(tr.n - 1.001, s / DS)), i = f | 0, t = f - i;
  const yc = tr.y[i] + (tr.y[i + 1] - tr.y[i]) * t, kk = tr.k[i] + (tr.k[i + 1] - tr.k[i]) * t;
  const a = Math.abs(d), out = Math.max(0, a - W / 2);
  const rut = a < W / 2 ? -.05 * Math.cos(d * 1.55) * Math.cos(d * 1.55) + Math.sin(s * .9 + d) * .012 : 0;
  const bank = -d * Math.max(-.07, Math.min(.07, kk * 2.2));           // curva un po' sopraelevata: l'esterno è più alto
  const side = out * out * .012 * (1 + noise(s, d) * .9) + out * .05 * noise(s * 1.7, d * 2 + 9);
  return yc + rut + bank * Math.min(1, W / 2 / Math.max(a, .01)) * (a < W / 2 ? 1 : .6) + side;
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
