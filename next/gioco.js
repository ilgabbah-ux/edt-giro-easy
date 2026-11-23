// Giro Easy · pista vera in 3D · versione parallela, tappa 1: solo la guida (niente ostacoli, punti, classifica)
// La moto si muove davvero nel mondo: piega → gira → va dove punta il muso. La camera la insegue.
import * as T from '../three.module.min.js';
import { GLTFLoader } from '../GLTFLoader.js';
import { DRACOLoader } from '../DRACOLoader.js';
import { GIRO_EXTRA, forkAt, laneOff, laneSide, lat, SCUOLA, SCUOLA_EXTRA, DS, KIND, buildTrack, groundY, at, project, roughAt, widthAt, sideAt, kindAt, waterAt } from './pista.js?v=24';
import { startSound, soundUpdate, thud, setSound, whip, splash , say, preloadVoice, setBike } from './suono.js?v=14';
import { MOTO, motoById } from './moto.js?v=3';
import { makeRider } from './pilota.js?v=5';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = 'edt-next-';   // salvataggi separati dal gioco vero
const opt = (k, d) => { try { return localStorage.getItem(K + k) ?? d; } catch { return d; } };
const setOpt = (k, v) => { try { localStorage.setItem(K + k, v); } catch {} };
const BK = motoById(opt('moto', 'fakedomi')); setBike(BK.snd);   /* la moto scelta: modello, guida e voce */
const FIT = { y: 1.16 + BK.fit[3] - 1.11, z: .27 + (BK.fit[2] + .45) * .6, hx: BK.fit[0] - .46, hy: (BK.fit[1] - BK.fit[3]) - .22, hz: (BK.fit[2] + .45) * .4 };   /* dove siede e dove mette le mani il pilota, rispetto alla Fake Domi */
const O = { snd: opt('snd', '1') === '1', auto: opt('auto', '0') === '1', gas: opt('gas', 't'), sens: opt('sens', 'm'), inv: opt('inv', '0') === '1', cam: opt('cam', 'm') };

// ---------- scena ----------
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene();
const SKY = 0xbfd6e6;
scene.background = new T.Color(SKY); scene.fog = new T.Fog(0x9fb873, 260, 1500);   // foschia calda d'autunno, del colore della valle: il lontano sfuma nel panorama invece che nel grigio
const camera = new T.PerspectiveCamera(66, 1, .3, 1400);
scene.add(new T.HemisphereLight(0xdfeeff, 0x4a5a36, .95));
// sole basso d'autunno con ombre vere: la luce segue la moto e disegna le ombre solo nei 70 m intorno
const SUN_DIR = new T.Vector3(-.55, .78, .32).normalize(), sun = new T.DirectionalLight(0xfff0d0, 2.1); sun.position.copy(SUN_DIR); scene.add(sun, sun.target);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
{ const c = sun.shadow.camera; c.left = -38; c.right = 38; c.top = 38; c.bottom = -38; c.near = 1; c.far = 220; c.updateProjectionMatrix(); }
let pix = Math.min(2, window.devicePixelRatio || 1);
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(pix); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', () => { resize(); if (typeof tiltA0 !== 'undefined') tiltA0 = null; }); resize();   // girando il telefono si ritara anche lo sterzo

const tl = new T.TextureLoader();
const tex = (src, rx, ry) => { const t = tl.load(src); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; if (rx) t.repeat.set(rx, ry); t.anisotropy = 4; return t; };

// ---------- pista ----------
const SCHOOL = opt('pista', 's') === 's';   // si parte dalla scuola; finita quella, il giro
const tr = SCHOOL ? buildTrack(SCUOLA, SCUOLA_EXTRA) : buildTrack(undefined, GIRO_EXTRA);
for (const f of tr.forks) tr.logs.push({ s: f.s0 + 104, lane: 1 });   // sulla via EASY, dopo i due gradoni, un tronco   // sulla via EASY due tronchi (solo nella corsia di destra)
// BIRRE: sparse lungo il percorso fuori dalla linea più comoda, tre su ogni via EASY, nessuna in conigliera
{ let seed = 2024; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; tr.beers = [];
  if (!SCHOOL) { for (let s = 70; s < tr.len - 40; s += 55 + rnd() * 45) { if (tr.forks.some(f => s > f.s0 - 5 && s < f.s1 + 5)) continue; const hw = widthAt(tr, s) / 2; tr.beers.push({ s, d: (rnd() < .5 ? -1 : 1) * hw * (.35 + rnd() * .4) }); }
    for (const f of tr.forks) for (const o of [50, 74, 96, 118]) tr.beers.push({ s: f.s0 + o, d: laneOff(tr, f.s0 + o, 1) }); } }
const P = {};
const TEXF = { trail: 'trail_d', rock: 'mossrock_d', mud: 'mudtrack_d', cobble: 'rockwall_d', forest: 'forestfloor_d' }, TEXN = Object.keys(TEXF);
// rumore morbido (0..1) per rompere l'uniformità: chiazze, bordi frastagliati, ciuffi a gruppi
const hsh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hsh(xi, yi) * (1 - u) + hsh(xi + 1, yi) * u) * (1 - v) + (hsh(xi, yi + 1) * (1 - u) + hsh(xi + 1, yi + 1) * u) * v; };
const NRM = { trail: 'trail_n', rock: 'mossrock_n', mud: 'mudtrack_n', cobble: 'rockwall_n', forest: 'forestfloor_n' };
const ntex = src => { const t = tl.load(src); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; };
// sentiero: non un tappeto. Bordo frastagliato che sfuma nel terreno, due carreggiate più scure e battute, chiazze chiare e scure, rilievo della foto sotto il sole basso.
// Si costruisce a strisce: quella principale segue la via di destra, e in ogni bivio ce n'è una seconda per la via di sinistra
const ROADM = TEXN.map(k => k === 'mud' ? new T.MeshPhongMaterial({ map: tex('../img/tex/mudtrack_d.webp'), normalMap: ntex('../img/tex/mudtrack_n.webp'), normalScale: new T.Vector2(2.4, 2.4), shininess: 48, specular: 0x6a6258, vertexColors: true, transparent: true })
  : k === 'cobble' ? new T.MeshLambertMaterial({ map: tex('../img/tex/rockwall_d.webp'), color: 0xfff6e8, vertexColors: true, transparent: true })   /* l'acciottolato senza rilievo finto: con quello usciva quasi nero */
  : new T.MeshLambertMaterial({ map: tex(`../img/tex/${TEXF[k]}.webp`), normalMap: ntex(`../img/tex/${NRM[k]}.webp`), normalScale: new T.Vector2(1.6, 1.6), vertexColors: true, transparent: true }));
function roadStrip(sA, sB, side) {
  const RS = .5, n = Math.floor((sB - sA) / RS) + 1, cols = 11, pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i < n; i++) { const s = sA + i * RS, w = widthAt(tr, s), hw = w / 2, c0 = side * laneOff(tr, s, side), rag = (vn(s * .35, 3 + side) - .5) * .7 + (vn(s * 1.3, 9) - .5) * .35, ragL = (vn(s * .35, 17 + side) - .5) * .7 + (vn(s * 1.3, 23) - .5) * .35;
    for (let c = 0; c < cols; c++) { const sg = c < 5 ? -1 : 1, e = sg < 0 ? ragL : rag, edge = hw + e * (hw > 2 ? 1 : .5);
      const dl = c === 0 || c === 10 ? sg * (edge + .75) : c === 1 || c === 9 ? sg * (edge + .2) : c === 2 || c === 8 ? sg * (edge - .3) : (c - 5) / 2 * (hw - .5) * .8, d = c0 + dl;
      at(tr, s, d, P); pos.push(P.x, groundY(tr, s, d, true) + (c === 0 || c === 10 ? .05 : .03), P.z); uv.push(d / 7, s / 7);
      const a = Math.abs(dl), rut = Math.exp(-Math.pow((a - hw * .42) / (hw * .16), 2)), patch = .86 + .26 * vn(s * .11 + 5, d * .5) + .1 * (vn(s * .9, d * 1.7) - .5), mudK = kindAt(tr, s).tex === 'mud', wetK = tr.water.some(wt => s > wt.s0 - 1.6 && s < wt.s1 + 1.6 && Math.abs(d - (wt.off || 0)) < (wt.half || 99) + 1.3) ? .7 : 1, soft = side < 0 && c0 < -2 ? .8 : 1,
        k = patch * (1 - rut * (mudK ? .34 : .16)) * (kindAt(tr, s).tex === 'forest' ? 1.28 : 1) * wetK * (mudK ? .82 + .3 * vn(s * .5, d * .8 + 30) : 1) * soft;
      const al = c === 0 || c === 10 ? 0 : c === 1 || c === 9 ? .35 + .5 * vn(s * 2.1, c) : 1; col.push(k * (1 + rut * .03), k, k * (1 - rut * .05), al); } }
  const g = new T.BufferGeometry(); let cur = null, start = 0;
  for (let i = 0; i < n - 1; i++) { const tx = TEXN.indexOf(kindAt(tr, sA + (i + .5) * RS).tex); if (tx !== cur) { if (cur !== null) g.addGroup(start, idx.length - start, cur); cur = tx; start = idx.length; }
    for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; idx.push(a, a + 1, b, a + 1, b + 1, b); } }
  g.addGroup(start, idx.length - start, cur);
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 4)); g.setIndex(idx); g.computeVertexNormals();
  const road = new T.Mesh(g, ROADM); road.renderOrder = 1; scene.add(road);
}
roadStrip(0, tr.len, 1); for (const f of tr.forks) roadStrip(f.s0, f.s1, -1);
const sideLimit = (s, sign) => { const k = tr.k[Math.min(tr.n - 1, Math.round(s / DS))], sd = sideAt(tr, s); return k * sign > .002 ? Math.min(sd, .8 / Math.abs(k)) : sd; };
for (const sign of [-1, 1]) { // terreno ai lati: prato, e sottobosco nel single track e sulla mulattiera
  const VS = 1, n = Math.floor(tr.len / VS) + 1, cols = 8, pos = [], uv = [], vcol = [], idx = [], g = new T.BufferGeometry(); let cur = null, start = 0;
  for (let i = 0; i < n; i++) { const s = i * VS, hw = widthAt(tr, s) / 2, lim = Math.max(hw + 1, sideLimit(s, sign)); for (let c = 0; c < cols; c++) { const u = c / (cols - 1), d = sign * (laneOff(tr, s, sign) + hw - .3 + (lim - hw + .3) * u * u); at(tr, s, d, P); pos.push(P.x, groundY(tr, s, d, true) - (c ? 0 : .04), P.z); uv.push(d / 9, s / 9); const k = .74 + .36 * vn(s * .07 + 11, d * .09 + sign * 7) + .16 * (vn(s * .45, d * .5) - .5), br = vn(s * .05 + 40, d * .06); vcol.push(k * (1 + br * .12), k, k * (1 - br * .22)); } }
  for (let i = 0; i < n - 1; i++) { const kd = tr.kind[Math.min(tr.n - 1, Math.round((i + .5) * VS / DS))], mt = kd === 't' || kd === 'm' ? 1 : 0; if (mt !== cur) { if (cur !== null) g.addGroup(start, idx.length - start, cur); cur = mt; start = idx.length; }
    for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; if (sign > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); } }
  g.addGroup(start, idx.length - start, cur);
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('color', new T.Float32BufferAttribute(vcol, 3));
  scene.add(new T.Mesh(g, [new T.MeshLambertMaterial({ map: tex('../img/tex/meadow_d.webp'), normalMap: ntex('../img/tex/meadow_n.webp'), vertexColors: true }), new T.MeshLambertMaterial({ map: tex('../img/tex/forest_d.webp'), normalMap: ntex('../img/tex/forest_n.webp'), vertexColors: true })]));
}
for (const f of tr.forks) { // l'ISOLA di bosco tra le due vie del bivio
  const pos = [], uv = [], vcol = [], idx = [], cols = 9; let r = 0;
  for (let s = f.s0; s <= f.s1; s += 1) { const hw = widthAt(tr, s) / 2, dA = -(laneOff(tr, s, -1) - hw + .3), dB = laneOff(tr, s, 1) - hw + .3; if (dB - dA < .2) { r = 0; continue; }
    for (let c = 0; c < cols; c++) { const d = dA + (dB - dA) * c / (cols - 1); at(tr, s, d, P); pos.push(P.x, groundY(tr, s, d, true) - (c === 0 || c === cols - 1 ? .04 : 0), P.z); uv.push(d / 9, s / 9); const k = .7 + .36 * vn(s * .07 + 11, d * .09) + .16 * (vn(s * .45, d * .5) - .5); vcol.push(k, k, k * .85); }
    if (r) { const a = pos.length / 3 - 2 * cols; for (let c = 0; c < cols - 1; c++) idx.push(a + c, a + c + 1, a + c + cols, a + c + 1, a + c + cols + 1, a + c + cols); } r++; }
  const ig = new T.BufferGeometry(); ig.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); ig.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); ig.setAttribute('color', new T.Float32BufferAttribute(vcol, 3)); ig.setIndex(idx); ig.computeVertexNormals();
  scene.add(new T.Mesh(ig, new T.MeshLambertMaterial({ map: tex('../img/tex/forest_d.webp'), normalMap: ntex('../img/tex/forest_n.webp'), vertexColors: true, side: T.DoubleSide }))); }
{ // bordi mai uguali: ciuffi d'erba, piante basse e sassolini a gruppi lungo il sentiero (16 piante diverse dalla stessa foto), più fitti qua, niente là
  let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, cells = Array.from({ length: 16 }, () => []), stones = [];
  for (let s = 4; s < tr.len - 4; s += .45) { const kd = kindAt(tr, s); if (kd.name === 'guado') continue; const hw = widthAt(tr, s) / 2;
    for (const sg of [-1, 1]) { const dens = vn(s * .09 + sg * 20, 2) * (kd.name === 'pietraia' ? .35 : kd.name === 'fango' ? .6 : 1); if (rnd() > dens * 1.25 - .12) continue;
      const out = kd.name === 'mulattiera' ? -.15 - rnd() * .5 : -.25 + rnd() * rnd() * 3.2, d = sg * (laneOff(tr, s, sg) + hw + out), zone = vn(s * .04 + 60, sg * 3), row = zone < .4 ? (rnd() < .7 ? 0 : 1) : zone < .7 ? (rnd() < .5 ? 1 : 2) : (rnd() < .6 ? 3 : 2);
      cells[row * 4 + Math.floor(rnd() * 4)].push([s + rnd() * .4, d, (row < 2 ? .5 : .42) + rnd() * .5 + Math.max(0, out) * .12]);
      if (rnd() < .3) stones.push([s + rnd(), sg * (laneOff(tr, s, sg) + hw - .4 + rnd() * 1.6), .05 + rnd() * rnd() * .2]); } }
  const pm = new T.MeshBasicMaterial({ map: tex('../img/tex/plants.webp'), alphaTest: .4, side: T.DoubleSide, color: 0xc4ccb4 }), m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), e = new T.Euler();
  cells.forEach((list, ci) => { if (!list.length) return; const cx = ci % 4, cy = Math.floor(ci / 4), g1 = new T.PlaneGeometry(1, 1); { const uv = g1.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 4, 1 - (cy + 1 - uv.getY(i)) / 4); }
    const g2 = g1.clone().rotateY(Math.PI / 2), cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); cg.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2));
    cg.setAttribute('normal', new T.Float32BufferAttribute(new Array(24).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); cg.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
    const im = new T.InstancedMesh(cg, pm, list.length); im.userData.noShadow = 1; im.receiveShadow = true;
    list.forEach(([s, d, h], i) => { at(tr, s, d, P); q.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(h * 1.15, h, h * 1.15); ps.set(P.x, groundY(tr, s, d, true) + h * (cy < 2 ? .46 : .3), P.z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im); });
  const sm = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), new T.MeshLambertMaterial({ map: tex('../img/tex/mossrock_d.webp'), color: 0xbdb6aa }), stones.length); sm.userData.noShadow = 1; sm.receiveShadow = true;
  stones.forEach(([s, d, r], i) => { at(tr, s, d, P); e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); sc.set(r * (1 + rnd() * .6), r * .6, r * (1 + rnd() * .6)); ps.set(P.x, groundY(tr, s, d, true) + r * .15, P.z); m.compose(ps, q, sc); sm.setMatrixAt(i, m); }); scene.add(sm);
}
{ // fondovalle lontano e montagne all'orizzonte
  // PAESAGGIO intorno: non un piano verde ma colline di prato che seguono le quote del percorso, a chiazze, con boschi e radure
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, yMin = 1e9; for (let i = 0; i < tr.n; i++) { x0 = Math.min(x0, tr.x[i]); x1 = Math.max(x1, tr.x[i]); z0 = Math.min(z0, tr.z[i]); z1 = Math.max(z1, tr.z[i]); yMin = Math.min(yMin, tr.y[i]); }
  const M = 700, C = 14, nx = Math.ceil((x1 - x0 + 2 * M) / C) + 1, nz = Math.ceil((z1 - z0 + 2 * M) / C) + 1, pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), col = new Float32Array(nx * nz * 3), idx = [], hgt = new Float32Array(nx * nz), dst = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 - M + i * C, z = z0 - M + j * C; let bd = 1e12, bi = 0; for (let q = 0; q < tr.n; q += 3) { const dx = x - tr.x[q], dz = z - tr.z[q], dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = q; } }
    const d = Math.sqrt(bd), o = j * nx + i, far = Math.min(1, d / 260), rim = Math.max(0, (d - 430) / 270), hills = (vn(x * .006 + 3, z * .006) - .45) * 46 * far + (vn(x * .021, z * .021 + 9) - .5) * 9 * Math.min(1, d / 60);
    const y = tr.y[bi] * (1 - far * .75) + yMin * far * .75 - 2.6 - Math.min(d, 45) * .1 + hills - rim * rim * 90;   /* il bordo estremo del terreno scende sotto l'orizzonte: non si vede dove finisce */ hgt[o] = y; dst[o] = d;
    pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z; uv[o * 2] = x / 9; uv[o * 2 + 1] = z / 9; const k = .7 + .42 * vn(x * .012 + 50, z * .012) + .14 * (vn(x * .06, z * .06) - .5), dry = vn(x * .008 + 90, z * .008 + 4); const gr = Math.min(1, d / 120); col[o * 3] = k * (1 + dry * .12) * (1 - gr * .12); col[o * 3 + 1] = k * (1 + gr * .22); col[o * 3 + 2] = k * (1 - dry * .25) * (1 - gr * .25); }   /* lontano il prato è verde pieno, come quello dello sfondo */
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(pos, 3)); lg.setAttribute('uv', new T.BufferAttribute(uv, 2)); lg.setAttribute('color', new T.BufferAttribute(col, 3)); lg.setIndex(idx); lg.computeVertexNormals();
  const land = new T.Mesh(lg, new T.MeshLambertMaterial({ map: tex('../img/tex/meadow_d.webp'), normalMap: ntex('../img/tex/meadow_n.webp'), normalScale: new T.Vector2(1.5, 1.5), vertexColors: true })); land.userData.noShadow = 1; land.receiveShadow = true; scene.add(land);
  { // boschi lontani: macchie di abeti e larici sulle colline, radure in mezzo
    let seed = 515; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, lists = [[], [], []];
    for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) { const o = j * nx + i, d = dst[o]; if (d < 34 || d > 600 || rnd() < .45) continue; const x = pos[o * 3], z = pos[o * 3 + 2], wood = vn(x * .009 + 7, z * .009 + 2); if (wood < .42 && rnd() > .07) continue;   /* nei prati qualche albero isolato */
      const nT = wood > .62 ? 3 : wood > .5 ? 2 : 1; for (let t = 0; t < nT; t++) { if (rnd() > .8) continue; const fx = rnd(), fz = rnd(), y = hgt[o] * (1 - fx) * (1 - fz) + hgt[o + 1] * fx * (1 - fz) + hgt[o + nx] * (1 - fx) * fz + hgt[o + nx + 1] * fx * fz; lists[rnd() < .2 ? 2 : rnd() < .5 ? 1 : 0].push([x + (fx * 2.4 - .7) * C, y, z + (fz * 2.4 - .7) * C, 8 + rnd() * rnd() * 16]); } }
    const g1 = new T.PlaneGeometry(1, 2), g2 = g1.clone().rotateY(Math.PI / 2), tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); tg.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2)); tg.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
    const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    ['fir_a', 'fir_b', 'fir_gold'].forEach((f, k) => { const L = lists[k]; if (!L.length) return; const im = new T.InstancedMesh(tg, new T.MeshBasicMaterial({ map: tex(`../img/tex/${f}.webp`), alphaTest: .5, side: T.DoubleSide, color: 0xdcdcdc }), L.length); im.userData.noShadow = 1;
      L.forEach(([x, y, z, h], i) => { q.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(h * .5, h * .5, h * .5); ps.set(x, y + h * .5 - .4, z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im); }); }
  const base = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshLambertMaterial({ color: 0x6f8a3a })); base.rotation.x = -Math.PI / 2; base.position.set((x0 + x1) / 2, yMin - 30, (z0 + z1) / 2); base.userData.noShadow = 1; scene.add(base);
  const pano = tl.load('../img/pano-0.webp'); pano.colorSpace = T.SRGBColorSpace; pano.wrapS = T.MirroredRepeatWrapping; pano.repeat.x = 2;
  const cyl = new T.Mesh(new T.CylinderGeometry(1100, 1100, 1470, 48, 1, true), new T.MeshBasicMaterial({ map: pano, side: T.BackSide, fog: false, depthWrite: false }));
  cyl.position.y = 240; cyl.renderOrder = -1; scene.add(cyl); P.sky = cyl;
}
// increspature dell'acqua: una mappa del rilievo fatta al volo, che scorre piano. Il sole basso ci si riflette
const WATER_N = (() => { const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), im = x.createImageData(N, N), h = (u, v) => Math.sin(u * 6.283 * 3 + Math.sin(v * 6.283 * 2) * 1.3) * .5 + Math.sin(v * 6.283 * 5 + u * 6.283 * 2) * .3 + Math.sin((u + v) * 6.283 * 7) * .2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = i / N, v = j / N, dx = (h(u + 1 / N, v) - h(u - 1 / N, v)) * 3, dy = (h(u, v + 1 / N) - h(u, v - 1 / N)) * 3, l = Math.hypot(dx, dy, 1), o = (j * N + i) * 4; im.data[o] = (-dx / l * .5 + .5) * 255; im.data[o + 1] = (-dy / l * .5 + .5) * 255; im.data[o + 2] = (1 / l * .5 + .5) * 255; im.data[o + 3] = 255; }
  x.putImageData(im, 0, 0); const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
{ // acqua: il guado è acqua di torrente, verde e trasparente; le pozze nel fango sono acqua marrone e ferma. Bordi che sfumano sulla riva, riflesso del sole sulle increspature
  const mk = (color, opacity) => new T.MeshPhongMaterial({ color, transparent: true, opacity, depthWrite: false, vertexColors: true, shininess: 110, specular: 0xfff2d8, normalMap: WATER_N, normalScale: new T.Vector2(.5, .5) });
  const mGuado = mk(0x3f6f6a, .6), mPozza = mk(0x6e5b43, .93);   // il guado è trasparente: sotto si vedono i sassi del fondo
  for (const wt of tr.water) { const pos = [], idx = [], col = [], uv = [], nrm = []; let r = 0; const L = wt.s1 - wt.s0;
    for (let s = wt.s0; s <= wt.s1 + .01; s += .5) { const hw = wt.half || widthAt(tr, s) / 2 + 2.5, t = (s - wt.s0) / L, e = wt.half ? Math.sqrt(Math.max(.05, Math.sin(Math.PI * t))) : 1, c = wt.off || 0, endA = Math.min(1, Math.min(t, 1 - t) * L / 1.2), wob = 1 + (vn(s * .9, wt.s0) - .5) * .25;
      for (const [f, al] of [[-1, 0], [-.72, 1], [.72, 1], [1, 0]]) { at(tr, s, c + hw * e * f * wob, P); pos.push(P.x, wt.y, P.z); col.push(1, 1, 1, al * endA); uv.push(P.x / 2.6, P.z / 2.6); nrm.push(0, 1, 0); }
      if (r) { const a = (r - 1) * 4; for (let q = 0; q < 3; q++) idx.push(a + q, a + q + 1, a + q + 4, a + q + 1, a + q + 5, a + q + 4); } r++; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 4)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
    const m = new T.Mesh(g, wt.kind === 'guado' ? mGuado : mPozza); m.renderOrder = 2; m.userData.noShadow = 1; m.receiveShadow = true; scene.add(m); }
}
{ // macchia: cespugli a ridosso del sentiero (qualcuno ci entra) e rami bassi che sporgono. Niente fettuccia: è enduro nei boschi
  let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const leaf = new T.MeshBasicMaterial({ map: tex('../img/tex/tree_island.webp'), alphaTest: .45, side: T.DoubleSide, color: 0xd9e2cf });
  const g1 = new T.PlaneGeometry(1, 1); { const uv = g1.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, .32 + uv.getY(i) * .48); }   // solo la chioma della foto: col tronco sottile i cespugli sembravano sospesi in aria
  const g2 = g1.clone().rotateY(Math.PI / 2), cross = new T.BufferGeometry();
  cross.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); cross.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2)); cross.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
  const list = []; for (const sp of tr.spans) { const dense = sp.kind === 'b', some = sp.kind === 't' || sp.kind === 'm' || sp.kind === 'd' || sp.kind === 's'; if (!dense && !some) continue;
    for (let s = sp.s0 + 1; s < sp.s1 - 1; s += dense ? 1.7 : 5) for (const sg of [-1, 1]) { if (!dense && rnd() < .5) continue; const hw = widthAt(tr, s) / 2; const out = dense ? .55 + rnd() * rnd() * 4 : .3 + rnd() * 3; list.push([s + rnd(), sg * (laneOff(tr, s, sg) + hw + out), dense ? .55 + rnd() * .35 + Math.max(0, out - 1.2) * .6 : 1.1 + rnd() * 1.2]); } }   // bassi a ridosso del sentiero, più alti dietro: il sentiero e la moto devono restare visibili
  const im = new T.InstancedMesh(cross, leaf, list.length), m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), e = new T.Euler();
  list.forEach(([s, d, h], i) => { at(tr, s, d, P); q.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(h * 1.25, h, h * 1.25); ps.set(P.x, Math.min(groundY(tr, s, d, true), groundY(tr, s, d + .6, true), groundY(tr, s, d - .6, true)) + h * .2, P.z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im);
  // rami bassi: niente pali né sbarre. Un ramo che scende ad arco dal bosco sopra il sentiero (quattro pezzi di legno storti) carico di fronde fino ad altezza casco
  const N = tr.branches.length, bark = new T.MeshLambertMaterial({ color: 0x6b5540 }), wood = new T.InstancedMesh(new T.CylinderGeometry(.02, .035, 1, 5), bark, N * 4);
  const fg = new T.PlaneGeometry(1, 1); { const uv = fg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, .36 + uv.getY(i) * .44); } const frond = new T.InstancedMesh(fg, leaf, N * 9); let k = 0, w = 0; const A = new T.Vector3(), B = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
  for (const br of tr.branches) { const hw = widthAt(tr, br.s) / 2, d0 = br.side * (hw + 2.6), d1 = -br.side * br.reach, g0 = groundY(tr, br.s, 0, true), pt = t => { const d = d0 + (d1 - d0) * t, y = g0 + 4.4 - 2.55 * Math.pow(t, .6) + Math.sin(t * 9 + br.s) * .12; at(tr, br.s + Math.sin(t * 5 + br.s) * .35, d, P); return [P.x, y, P.z]; };
    for (let r = 0; r < 4; r++) { A.fromArray(pt(r / 4)); B.fromArray(pt((r + 1) / 4)); ps.copy(A).add(B).multiplyScalar(.5); const dir = B.clone().sub(A), L = dir.length(); q.setFromUnitVectors(UP, dir.normalize()); sc.set(1.6 - r * .35, L * 1.04, 1.6 - r * .35); m.compose(ps, q, sc); wood.setMatrixAt(w++, m); }
    for (let r = 0; r < 9; r++) { const t = .12 + .88 * (r + rnd() * .6) / 9.6, p = pt(Math.min(1, t)), sz = 1.1 + rnd() * .9; e.set((rnd() - .5) * .5, rnd() * 3.14, (rnd() - .5) * .5, 'YXZ'); q.setFromEuler(e); sc.set(sz * 1.2, sz * .8, 1); ps.set(p[0], p[1] - sz * .18 + (rnd() - .5) * .2, p[2]); m.compose(ps, q, sc); frond.setMatrixAt(k++, m); } }
  scene.add(wood, frond);
}
const ROCKS = [];   // i sassi grossi sono ostacoli veri: x, z, raggio, raggruppati ogni 8 m
{ // sassi: tanti nella pietraia (anche sul sentiero, piccoli), muretti a secco lungo la mulattiera, qualcuno nel guado
  let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, list = [];
  for (const sp of tr.spans) {
    if (sp.kind === 'p') for (let s = sp.s0 + 2; s < sp.s1 - 2; s += .9) { const hw = widthAt(tr, s) / 2, edge = rnd() < .45; const d = edge ? (rnd() < .5 ? -1 : 1) * (hw + rnd() * 5) : (rnd() - .5) * hw * 1.9; list.push([s, d, edge ? .35 + rnd() * .9 : .07 + rnd() * .13, 0]); }
    if (sp.kind === 'm') for (let s = sp.s0 + 1; s < sp.s1 - 1; s += .75) for (const sg of [-1, 1]) list.push([s, sg * (widthAt(tr, s) / 2 + .25 + rnd() * .2), .3 + rnd() * .22, sg > 0 ? .25 : 0]);
    if (sp.kind === 's') for (const f of tr.feat) if (f.kind === 'gradone' && f.s > sp.s0 && f.s < sp.s1) { const hw = widthAt(tr, f.s) / 2; for (let d = -hw - .6; d < hw + .6; d += .5 + rnd() * .25) list.push([f.s + 1.9 + rnd() * .5, d, .3 + rnd() * .16, -.12]); }   // il bordo di ogni gradone è una fila di pietre: si vede dove sale
    if (sp.kind === 'g') for (let s = sp.s0; s < sp.s1; s += 1.6) for (const sg of [-1, 1]) list.push([s, sg * (widthAt(tr, s) / 2 + .5 + rnd() * 3), .3 + rnd() * .5, 0]);
  }
  const geo = new T.DodecahedronGeometry(1, 0), im = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ map: tex('../img/tex/mossrock_d.webp'), color: 0xcfcac2 }), list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), ps = new T.Vector3();
  list.forEach(([s, d, r, up], i) => { at(tr, s, d, P); e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); sc.set(r * (.8 + rnd() * .5), r * (.55 + rnd() * .3), r * (.8 + rnd() * .5)); if (r > .5 && up === 0) (ROCKS[Math.floor(s / 8)] ||= []).push(P.x, P.z, r * .8); ps.set(P.x, P.y + r * .2 + up, P.z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im);
}
const TREES = [];   // tronchi contro cui si sbatte, raggruppati ogni 8 m di percorso
{ // alberi: modelli 3D fatti in Blender, resi da 4 lati e montati su 4 piani a stella. Quelli a ridosso del sentiero hanno il fusto nudo fino a 3,4 m e la chioma sopra la testa: nel bosco si passa tra i tronchi, non dentro i rami
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const LIFT = 3.4, V0 = .14, trunks = [];
  for (const [file, every, asp, h0, h1, wide] of [['abete', 3.2, .561, 7, 7, 0], ['larice', 8, .64, 7, 6, 0], ['alberello', 9, 1.684, 3.2, 2.6, 1]]) {
    const star = (hh, v0) => { const pos = [], uv = [], idx = [];
      for (let k = 0; k < 4; k++) { const g1 = new T.PlaneGeometry(asp, hh).rotateY(k * Math.PI / 4), u = g1.attributes.uv; pos.push(...g1.attributes.position.array); for (let i = 0; i < u.count; i++) uv.push((k + u.getX(i)) / 4, v0 + u.getY(i) * (1 - v0)); idx.push(...[...g1.index.array].map(v => v + k * 4)); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const tx = tex(`modelli/${file}.webp?v=1`); tx.wrapS = tx.wrapT = T.ClampToEdgeWrapping; const mat = new T.MeshBasicMaterial({ map: tx, alphaTest: .5, side: T.DoubleSide, color: 0xdcdcdc });
    const cap = Math.floor(tr.len / every) * 6, im = new T.InstancedMesh(star(1, 0), mat, cap), imH = new T.InstancedMesh(star(1 - V0, V0), mat, cap), m = new T.Matrix4(), qt = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    let q = 0, qh = 0; for (let s0 = 0; s0 < tr.len; s0 += every) { const kd = tr.kind[Math.min(tr.n - 1, Math.round(s0 / DS))], reps = kd === 't' ? 3 : kd === 'm' ? 2 : kd === 'p' || kd === 'g' ? 0 : 1;
      for (let r = 0; r < reps; r++) for (const sg of [-1, 1]) { if (q >= cap || qh >= cap) break; const s = s0 + rnd() * every, hw = widthAt(tr, s) / 2, lim = Math.max(hw + 1.2, sideLimit(s, sg) - 1); const near = kd === 't' ? 1.8 : kd === 'm' ? 1.6 : 2.5; const lo = laneOff(tr, s, sg), isl = lo > hw + near + 1 && rnd() < .8; let X = Math.min(lim, hw + near + rnd() * rnd() * (kd === 't' ? 11 : 20)); const hgt = h0 + rnd() * h1, ang = rnd() * 6.3, rad = asp * hgt * .5;
        if (wide) { if (isl) continue; X = Math.max(X, hw + rad + .6); if (X > lim + 6) continue; }   /* l'alberello è largo: sta abbastanza indietro da non coprire il sentiero, oppure non c'è */
        const d = isl ? sg * rnd() * (lo - hw - near) : sg * (lo + X), high = !wide && (isl || X - hw < rad + 1); at(tr, s, d, P); P.y = groundY(tr, s, d, true);
        { let bad = 0; const b0 = Math.floor(s / 8); for (let bb = b0 - 1; bb <= b0 + 1 && !bad; bb++) { const a = TREES[bb]; if (a) for (let i = 0; i < a.length; i += 2) if ((a[i] - P.x) ** 2 + (a[i + 1] - P.z) ** 2 < 2.9) { bad = 1; break; } } if (bad) continue; }
        (TREES[Math.floor(s / 8)] ||= []).push(P.x, P.z); qt.setFromAxisAngle(T.Object3D.DEFAULT_UP, ang); sc.set(hgt, hgt, hgt);
        if (high) { ps.set(P.x, P.y + LIFT + hgt * (1 - V0) * .5, P.z); m.compose(ps, qt, sc); imH.setMatrixAt(qh++, m); trunks.push(P.x, P.y, P.z, .13 + hgt * .012); }
        else { ps.set(P.x, P.y + hgt * .5 - .12, P.z); m.compose(ps, qt, sc); im.setMatrixAt(q++, m); } } }
    im.count = q; imH.count = qh; scene.add(im, imH);
  }
  { const n = trunks.length / 4, tm = new T.InstancedMesh(new T.CylinderGeometry(.42, .7, 1, 7, 1, true), new T.MeshLambertMaterial({ color: 0x7a5c44 }), n), m = new T.Matrix4(), qt = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    for (let i = 0; i < n; i++) { const r = trunks[i * 4 + 3], h = LIFT + 2.2; sc.set(r, h, r); ps.set(trunks[i * 4], trunks[i * 4 + 1] + h / 2 - .3, trunks[i * 4 + 2]); m.compose(ps, qt, sc); tm.setMatrixAt(i, m); } tm.castShadow = true; scene.add(tm); }
}
{ // partenza, arrivo e un cartello all'inizio di ogni tratto
  const board = (label, col, w, h) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 512, 96); x.fillStyle = '#111'; x.font = 'bold 60px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 256, 52);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, side: T.DoubleSide })); };
  const gate = (s, label) => { at(tr, s, 0, P); const w = widthAt(tr, s), grp = new T.Group(); grp.position.set(P.x, P.y, P.z); grp.rotation.y = -P.h;
    const mat = new T.MeshLambertMaterial({ color: 0x2a2a2a }); for (const sx of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.14, .14, 5.2, 8), mat); p.position.set(sx * (w / 2 + .6), 2.6, 0); grp.add(p); }
    const b = board(label, '#ffd400', w + 1.6, 1.5); b.position.y = 4.6; grp.add(b); scene.add(grp); };
  gate(14, SCHOOL ? 'SCUOLA DI ENDURO' : 'ENDURO DRINKING TEAM'); gate(tr.len - 14, SCHOOL ? 'FINE SCUOLA' : 'RIFUGIO · ARRIVO');
  // tronchi di traverso sul sentiero
  { const bark = new T.MeshLambertMaterial({ map: tex('../img/tex/forestfloor_d.webp'), color: 0x7a5a3c }); for (const lg of tr.logs) { const hw = widthAt(tr, lg.s) / 2, w = hw * 2 + 3, dc = lg.lane ? laneOff(tr, lg.s, 1) : 0; at(tr, lg.s, dc, P); const m = new T.Mesh(new T.CylinderGeometry(.21, .24, w, 10), bark); m.rotation.set(0, -P.h, Math.PI / 2, 'YXZ'); m.position.set(P.x, groundY(tr, lg.s, dc, true) + .2, P.z); scene.add(m); } }
  // cartelli del bivio: a sinistra la CONIGLIERA con le orecchie da coniglio, a destra la EASY
  for (const f of tr.forks) for (const [lab, sg, col] of [['CONIGLIERA', -1, '#f4f1e8'], ['EASY', 1, '#ffd400']]) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = col; x.fillRect(0, 96, 512, 160); x.strokeStyle = '#111'; x.lineWidth = 8; x.strokeRect(4, 100, 504, 152); x.fillStyle = '#111'; x.font = 'bold 82px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lab, 256, 150); x.font = 'bold 44px Impact, sans-serif'; x.fillText(sg < 0 ? '← molle e lenta' : 'hard, veloce, birre →', 256, 218);
    if (sg < 0) for (const ex of [200, 312]) { x.fillStyle = '#f4f1e8'; x.strokeStyle = '#111'; x.lineWidth = 7; x.beginPath(); x.ellipse(ex, 52, 30, 50, (ex < 256 ? -1 : 1) * .22, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#f2a5b4'; x.beginPath(); x.ellipse(ex, 58, 13, 32, (ex < 256 ? -1 : 1) * .22, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; const b = new T.Mesh(new T.PlaneGeometry(5.6, 2.8), new T.MeshBasicMaterial({ map: t, transparent: true, side: T.DoubleSide })); at(tr, f.s0 + 30, sg * 2.9 - 1.2, P); b.position.set(P.x, groundY(tr, f.s0 + 30, sg * 2.9 - 1.2, true) + 3, P.z); b.rotation.y = -P.h; scene.add(b);
    const pole = new T.Mesh(new T.CylinderGeometry(.06, .06, 2.4, 6), new T.MeshLambertMaterial({ color: 0x5a4632 })); pole.position.set(P.x, b.position.y - 1.6, P.z); scene.add(pole); }
  // birre: un boccale che gira e dondola a un metro da terra
  { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.font = '104px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🍺', 64, 70); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; const sm = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
    for (const b of tr.beers) { at(tr, b.s, b.d, P); b.m = new T.Sprite(sm); b.m.renderOrder = 6; b.m.scale.set(1.3, 1.3, 1); b.y = groundY(tr, b.s, b.d, true) + 1.05; b.m.position.set(P.x, b.y, P.z); scene.add(b.m); } }
}

// ---------- moto e pilota ----------
const bike = new T.Group(), leanG = new T.Group(), pitchG = new T.Group(); bike.add(leanG); leanG.add(pitchG); scene.add(bike);
// chi riceve e chi fa ombra: il terreno riceve; sassi, tronchi, pali, alberi e cespugli la fanno (alberi e cespugli con la sagoma della foto)
scene.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material], m = ms[0];
  if (o.userData.noShadow) return; if (m.isMeshLambertMaterial || m.isMeshPhongMaterial) { o.receiveShadow = true; const t = o.geometry.type; if (t === 'CylinderGeometry' || t === 'DodecahedronGeometry') o.castShadow = true; }
  else if (m.isMeshBasicMaterial && m.alphaTest > 0 && m.map) { o.castShadow = true; o.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: m.map, alphaTest: m.alphaTest, side: T.DoubleSide }); } });
// scia nell'acqua: anelli di schiuma bianca che si allargano e svaniscono dove passa la moto
const RINGS = Array.from({ length: 10 }, () => { const m = new T.Mesh(new T.RingGeometry(.8, 1, 24), new T.MeshBasicMaterial({ color: 0xf4f8f4, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.userData.noShadow = 1; scene.add(m); return m; }); let ringI = 0, ringT = 0;
function rings(dt) { ringT -= dt; if (S.wet > .03 && S.v > 1.5 && S.air <= 0 && ringT <= 0) { const wt = tr.water.find(w => S.s >= w.s0 && S.s <= w.s1); if (wt) { const r = RINGS[ringI++ % RINGS.length]; r.position.set(S.x, wt.y + .03, S.z); r.userData.a = 0; r.userData.k = Math.min(1, S.v / 12); r.visible = true; ringT = .09; } }
  for (const r of RINGS) if (r.visible) { r.userData.a += dt; const a = r.userData.a, s = .5 + a * (2.2 + r.userData.k * 2.5); r.scale.set(s, s, 1); r.material.opacity = Math.max(0, .5 - a * .6) * (.5 + r.userData.k * .5); if (a > .85) r.visible = false; } }
const blob = new T.Mesh(new T.CircleGeometry(.9, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .32, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.scale.set(.42, 1.25, 1); scene.add(blob);
let wheelF = null, wheelR = null, steerG = null;
{ const gltf = new GLTFLoader(), dl = new DRACOLoader(); dl.setDecoderPath('../draco/'); gltf.setDRACOLoader(dl);
  gltf.load(`../img/models/bike_${BK.glb}.glb?t=1`, g => { const get = n => g.scene.getObjectByName(n), body = get('bike_body'), wf = get('wheel_f'), wr = get('wheel_r');
    steerG = new T.Group(); wheelF = new T.Group(); wheelR = new T.Group(); wheelF.position.copy(wf.position); wheelR.position.copy(wr.position); P.wfY = wf.position.y; P.wrY = wr.position.y; wf.position.set(0, 0, 0); wr.position.set(0, 0, 0);
    P.parts = { body: body.clone(), wf: wf.clone(), wr: wr.clone(), pf: wheelF.position.clone(), pr: wheelR.position.clone() }; wheelF.add(wf); wheelR.add(wr); steerG.add(wheelF); pitchG.add(body, steerG, wheelR); pitchG.traverse(c => { if (c.isMesh) c.castShadow = true; }); });
  gltf.load('../img/models/rider_poses.glb?t=1', g => { const o = g.scene.getObjectByName('rider_sit'), mat = o.material.clone(); P.rMatRiv = o.material.clone();   /* il pilota porta il completo EDT grigio (texture dipinta in Blender sul modello); gli avversari restano a tinta unita */
    { const tj = tl.load('modelli/pilota-edt.webp?v=1'); tj.colorSpace = T.SRGBColorSpace; tj.flipY = false; tj.anisotropy = 4; mat.map = tj; mat.color.set(0xffffff); }
    const geo = o.geometry.clone(); geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(), o.quaternion, o.scale));
    P.rGeo = geo; P.rMat = mat; P.rider = makeRider(geo, mat); P.rider.root.position.set(0, FIT.y, FIT.z); pitchG.add(P.rider.root); P.rider.root.traverse(c => { if (c.isMesh) c.castShadow = true; });
    gltf.load('../img/models/helmet.glb?t=1', h => { let src = null; h.scene.traverse(c => { if (c.isMesh && !src) src = c; }); const hg = src.geometry.clone(); hg.applyMatrix4(src.matrixWorld); hg.rotateY(-Math.PI / 2); hg.computeBoundingBox();
      const bb = hg.boundingBox, sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), k = .3 / sz.x; hg.translate(-c.x, -c.y, -c.z); hg.scale(k, k, k);
      const hmR = src.material.clone(); P.helm = new T.Mesh(hg, src.material.clone()); P.helm.material.color.set(0x2a2a2e); P.helmRiv = hmR; P.helm.castShadow = true; pitchG.add(P.helm); P.ears = new T.Group(); for (const sx of [-1, 1]) { const e = new T.Mesh(new T.CapsuleGeometry(.035, .22, 4, 8), new T.MeshLambertMaterial({ color: 0xf6f2ea })); e.position.set(sx * .07, .27, 0); e.rotation.z = -sx * .28; P.ears.add(e); } P.ears.visible = false; P.helm.add(P.ears); }); });
}

// ---------- terra e polvere dalla ruota dietro ----------
const _cW = new T.Color(.86, .9, .9), _cM = new T.Color(.3, .23, .16), _cR = new T.Color(.6, .58, .54), _cD = new T.Color(.52, .42, .3);
const DN = 140, dPos = new Float32Array(DN * 3), dAge = new Float32Array(DN).fill(1), dVel = new Float32Array(DN * 3); let dNext = 0, dAcc = 0;
const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3)); dGeo.setAttribute('aAge', new T.BufferAttribute(dAge, 1));
const dMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uH: { value: 800 }, uC: { value: new T.Color(.52, .42, .3) } },
  vertexShader: 'attribute float aAge; varying float vA; uniform float uH; void main(){ vA = aAge; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (aAge >= 1. ? 0. : (.35 + aAge * 1.5) * uH / -mv.z); }',
  fragmentShader: 'varying float vA; uniform vec3 uC; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(uC, (1. - vA) * .6 * smoothstep(.5, .15, d)); }' });
const dPts = new T.Points(dGeo, dMat); dPts.frustumCulled = false; scene.add(dPts);
function dust(dt) {
  const wet = S.wet > .02, rate = state === 'play' && S.air <= 0 ? (wet ? S.v * 9 : Math.abs(S.slip) * 110 + (S.gasOn && S.v < 9 ? 45 * (S.thr || 0) : 0) + (S.spin || 0) * 160 + S.off * S.v * 2.5 + (S.gasOn ? S.v * (S.kd.name === 'fango' ? 1.6 : .35) + Math.max(0, S.grade) * 260 : 0)) : 0; dAcc += rate * dt;
  { const c = dMat.uniforms.uC.value, tx = S.kd.tex; if (wet) c.lerp(_cW, .2); else c.lerp(tx === 'mud' ? _cM : tx === 'rock' || tx === 'cobble' ? _cR : _cD, .08); }
  const bx = Math.sin(S.psi + S.slip), bz = -Math.cos(S.psi + S.slip);
  while (dAcc >= 1) { dAcc--; const i = dNext; dNext = (dNext + 1) % DN; dAge[i] = 0; dPos[i * 3] = S.x - bx * .75 + (Math.random() - .5) * .3; dPos[i * 3 + 1] = S.y + .15; dPos[i * 3 + 2] = S.z - bz * .75 + (Math.random() - .5) * .3;
    const k = 1.5 + Math.random() * 2.5; dVel[i * 3] = -bx * k + (Math.random() - .5) * 2 - Math.cos(S.psi) * S.slip * 3; dVel[i * 3 + 1] = (1 + Math.random() * 1.8) * (S.wet > .02 ? 2.2 : 1); dVel[i * 3 + 2] = -bz * k + (Math.random() - .5) * 2 - Math.sin(S.psi) * S.slip * 3; }
  for (let i = 0; i < DN; i++) if (dAge[i] < 1) { dAge[i] = Math.min(1, dAge[i] + dt * 1.5); dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt; dVel[i * 3 + 1] -= 2.5 * dt; }
  dGeo.attributes.position.needsUpdate = true; dGeo.attributes.aAge.needsUpdate = true; dMat.uniforms.uH.value = renderer.domElement.height;
}

// ---------- visiera: schizzi d'acqua e di fango, rami in faccia ----------
const lens = $('lens'), lx = lens.getContext('2d'), drops = []; let lensDirty = false;
const leafImg = new Image(); leafImg.src = '../img/tex/shrubs.webp';   // quattro rami veri con le foglie: sono loro che ti passano davanti agli occhi
function lensSize() { lens.width = Math.round(innerWidth / 2); lens.height = Math.round(innerHeight / 2); } addEventListener('resize', lensSize); lensSize();
function splat(kind, n, side = 0) { const W2 = lens.width, H2 = lens.height;
  for (let i = 0; i < n && drops.length < 90; i++) { if (kind === 'leaf') { const fromL = side < 0; drops.push({ k: 2, x: fromL ? -40 : W2 + 40, y: H2 * (.15 + Math.random() * .6), vx: (fromL ? 1 : -1) * W2 * (2.6 + Math.random() * 1.6), vy: (Math.random() - .5) * H2 * .5, r: H2 * (.1 + Math.random() * .14), a: .95, life: .6, rot: (Math.random() - .5) * 1.2, cell: Math.floor(Math.random() * 4), fl: fromL ? 1 : -1 }); }
    else { const big = Math.random() < .3; drops.push({ k: kind === 'mud' ? 1 : 0, x: Math.random() * W2, y: H2 * (.12 + Math.random() * .85), vx: 0, vy: H2 * (.02 + Math.random() * .06), r: H2 * (big ? .07 + Math.random() * .1 : .015 + Math.random() * .03), a: kind === 'mud' ? .92 : .8, life: 1.8 + Math.random() * 2.2, rot: Math.random() * 3 }); } } }
function lensDraw(dt) { if (!drops.length) { if (lensDirty) { lx.clearRect(0, 0, lens.width, lens.height); lensDirty = false; } return; }
  lx.clearRect(0, 0, lens.width, lens.height); lensDirty = true; const wind = 1 + S.v / 12;
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.life -= dt * (d.k === 2 ? 1 : wind * .5); if (d.life <= 0) { drops.splice(i, 1); continue; } d.x += d.vx * dt; d.y += d.vy * dt * (d.k === 2 ? 1 : wind);
    const al = d.a * Math.min(1, d.life * (d.k === 2 ? 6 : 1.4)); lx.save(); lx.translate(d.x, d.y); lx.rotate(d.rot);
    if (d.k === 2 && leafImg.complete && leafImg.naturalWidth) { const hw = leafImg.naturalWidth / 2, sz = d.r * 9; lx.scale(d.fl, 1); for (const [off, a2] of [[-.22, .3], [-.1, .55], [0, 1]]) { lx.globalAlpha = al * a2; lx.drawImage(leafImg, (d.cell % 2) * hw, Math.floor(d.cell / 2) * hw, hw, hw, -sz / 2 + off * sz, -sz / 2, sz, sz); } lx.globalAlpha = 1; }   /* tre copie in scia: il ramo passa veloce e sfocato */
    else if (d.k === 2) { lx.fillStyle = `rgba(46,84,34,${al})`; lx.beginPath(); lx.ellipse(0, 0, d.r * 2.6, d.r * .55, 0, 0, 7); lx.fill(); lx.fillStyle = `rgba(88,128,52,${al * .8})`; lx.beginPath(); lx.ellipse(d.r * .4, -d.r * .2, d.r * 1.7, d.r * .3, .3, 0, 7); lx.fill(); }
    else { const c = d.k ? '66,46,28' : '104,96,78'; const gr = lx.createRadialGradient(0, 0, d.r * .15, 0, 0, d.r); gr.addColorStop(0, `rgba(${c},${al})`); gr.addColorStop(.7, `rgba(${c},${al * .75})`); gr.addColorStop(1, `rgba(${c},0)`); lx.fillStyle = gr; lx.beginPath(); lx.ellipse(0, 0, d.r, d.r * (.75 + (d.rot % 1) * .5), 0, 0, 7); lx.fill();
      if (d.r > lens.height * .04) { lx.fillStyle = `rgba(${c},${al * .6})`; lx.fillRect(-d.r * .12, 0, d.r * .24, d.r * (1.2 + (3 - d.life) * .6)); } }   // la goccia grossa cola
    lx.restore(); } }

// ---------- comandi ----------
let steerIn = 0, tiltSteer = 0, tiltSeen = 0, tiltA0 = null, keyL = 0, keyR = 0, touchSteer = 0, braking = false, gasHeld = false, gasCmd = 0;
const D2R = Math.PI / 180;
addEventListener('deviceorientation', e => {
  if (e.gamma === null || e.gamma === undefined) return; tiltSeen = performance.now();
  // rotazione del telefono attorno allo schermo, misurata con la gravità (come nel gioco vero dalla v142)
  const bR = (e.beta || 0) * D2R, gR = (e.gamma || 0) * D2R, ux = -Math.sin(gR) * Math.cos(bR), uy = Math.sin(bR);
  if (Math.hypot(ux, uy) < .25) return;   // telefono piatto: la gravità non dice niente
  const upA = Math.atan2(ux, uy) / D2R; if (tiltA0 === null) tiltA0 = upA;
  let d = upA - tiltA0; if (d > 180) d -= 360; if (d < -180) d += 360;
  const raw = -d, dead = 2, full = { s: 26, m: 19, h: 13 }[O.sens] || 19;
  const lin = Math.abs(raw) < dead ? 0 : clamp((raw - Math.sign(raw) * dead) / (full - dead), -1, 1);
  tiltSteer += (Math.sign(lin) * Math.pow(Math.abs(lin), 1.25) - tiltSteer) * .35;
});
const askTilt = () => { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); };
addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keyL = 1; if (e.key === 'ArrowRight' || e.key === 'd') keyR = 1; if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 's') braking = true; if (e.key === 'ArrowUp' || e.key === 'w') { gasHeld = true; gasCmd = e.shiftKey ? .5 : 1; } if (e.key === 'r') restart(); });
addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keyL = 0; if (e.key === 'ArrowRight' || e.key === 'd') keyR = 0; if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 's') braking = false; if (e.key === 'ArrowUp' || e.key === 'w') gasHeld = false; });
// senza sensore (o da computer col mouse): metà schermo sinistra/destra
const touches = new Map();
canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, e.clientX); upd(); }); canvas.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) { touches.set(e.pointerId, e.clientX); upd(); } });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, e => { touches.delete(e.pointerId); upd(); });
function upd() { let v = 0; for (const x of touches.values()) v += x < innerWidth / 2 ? -1 : 1; touchSteer = clamp(v, -1, 1); }
const hold = (el, fn) => { el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); fn(true); }); for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, () => fn(false)); };
hold($('brake'), v => braking = v);
// GAS: tocchi il tasto dove capita ed è tutto aperto. Per dosare allontani il pollice da dove l'hai appoggiato, in qualsiasi direzione (in su, di lato: sotto c'è il bordo dello schermo); tornando indietro riapri.
// Corsa lunga (150 px) e più fine verso il basso del gas, dove serve precisione
{ const el = $('gasb'); let x0 = 0, y0 = 0; const set = e => { const r = Math.max(0, Math.hypot(e.clientX - x0, e.clientY - y0) - 14) / 150, k = clamp(1 - r, 0, 1); gasCmd = .15 + .85 * Math.pow(k, 1.25); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); gasHeld = true; x0 = e.clientX; y0 = e.clientY; gasCmd = 1; }); el.addEventListener('pointermove', e => { if (gasHeld) set(e); });
  for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, () => { gasHeld = false; gasCmd = 0; }); }

// ---------- fisica ----------
const G = 9.81, VMAX = 30 * BK.top;   // 108 km/h
const S = { x: 0, z: 0, y: 0, psi: 0, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: 0, s: 0, d: 0, off: 0, hit: 0, pitch: 0, grade: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0, by: 0, bvy: 0, comp: 0, cF: 0, cR: 0, rough: 0, grip: 1.1, wet: 0, kd: KIND.v };
let state = 'menu', t0 = 0, time = 0, cd = 0, best = parseFloat(opt('best3', '0')) || 0, wrong = 0;
// FANTASMA del giro migliore: posizione ogni decimo di secondo, salvata sul telefono insieme agli intertempi
const MED = [[108, 'ORO'], [122, 'ARGENTO'], [140, 'BRONZO']];
let ghost = null, rec = [], recT = 0, splits = [], bestSplits = []; try { const j = JSON.parse(opt('ghost3', 'null')); if (j && j.p) { ghost = j.p; bestSplits = j.s || []; } } catch {}
const ghostG = new T.Group(); ghostG.visible = false; scene.add(ghostG); { const gm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .32, depthWrite: false }); const b = new T.Mesh(new T.BoxGeometry(.34, .75, 1.7), gm); b.position.y = .75; const r = new T.Mesh(new T.CapsuleGeometry(.2, .6, 4, 8), gm); r.position.set(0, 1.45, .1); for (const z of [-.72, .72]) { const w = new T.Mesh(new T.CylinderGeometry(.32, .32, .12, 14), gm); w.rotation.z = Math.PI / 2; w.position.set(0, .32, z); ghostG.add(w); } ghostG.add(b, r); ghostG.traverse(o => { o.userData.noShadow = 1; o.renderOrder = 6; }); }   // dopo il sentiero, sennò il sentiero lo copre (era per questo che non si vedeva)
function ghostDraw() { ghostBuild(); if (state === 'play' && !SCHOOL) { if (time >= recT) { recT += .1; rec.push(+S.x.toFixed(2), +S.y.toFixed(2), +S.z.toFixed(2), +S.psi.toFixed(3), +S.lean.toFixed(2)); } }
  const on = ghost && state === 'play' && !SCHOOL; ghostG.visible = !!on; if (!on) return; const f = time * 10, i = Math.min(Math.floor(f), ghost.length / 5 - 2), u = Math.min(1, f - i), a = i * 5, b = a + 5; if (i < 0 || b + 4 >= ghost.length) { ghostG.visible = false; return; }
  ghostG.position.set(ghost[a] + (ghost[b] - ghost[a]) * u, ghost[a + 1] + (ghost[b + 1] - ghost[a + 1]) * u, ghost[a + 2] + (ghost[b + 2] - ghost[a + 2]) * u); ghostG.rotation.set(0, -(ghost[a + 3] + (ghost[b + 3] - ghost[a + 3]) * u), 0); ghostG.rotation.z = -(ghost[a + 4] || 0); ghostG.rotation.order = 'YXZ'; }
function glug() { thud(.2); }
// PILOTI EDT in pista: partono davanti a te e vanno col loro passo. Stessa moto, tuta di un altro colore, nome sopra il casco
const RIV = [{ name: 'LINUS', col: 0x2f6fd0, skill: .86, s0: 14 }, { name: 'COSTA', col: 0xd0342f, skill: .95, s0: 28 }, { name: 'MIRCO', col: 0x2fa84a, skill: 1.03, s0: 42 }]; let rivBuilt = false;
const KSPD = { v: 1, s: .78, d: .8, p: .68, g: .55, f: .55, m: .5, t: .5, b: .55 };
function rivReset() { for (const r of RIV) { r.s = 20 + r.s0; r.d = (r.s0 % 28 ? 1.4 : -1.4); r.v = 0; r.done = 0; r.lane = r.skill > 1 ? 1 : -1; r.lean = 0; r.h = tr.h[10]; r.dv = 0; r.pit = 0; r.line = r.skill > 1 ? .9 : r.skill > .9 ? -.2 : -1; } }
function rivBuild() { if (rivBuilt || SCHOOL || !P.parts || !P.rGeo || !P.helm) return; rivBuilt = true; rivReset();
  for (const r of RIV) { const gp = new T.Group(), b = P.parts.body.clone(), wf = P.parts.wf.clone(), wr = P.parts.wr.clone(); wf.position.copy(P.parts.pf); wr.position.copy(P.parts.pr); const m = P.rMatRiv.clone(); m.color.set(r.col); const rd = new T.Mesh(P.rGeo, m); rd.position.set(0, FIT.y, FIT.z); const hm = new T.Mesh(P.helm.geometry, P.helmRiv); hm.position.set(0, FIT.y + .67, FIT.z - .15);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.font = 'bold 44px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#111'; x.strokeText(r.name, 128, 34); x.fillStyle = '#fff'; x.fillText(r.name, 128, 34); const tt = new T.CanvasTexture(cv); tt.colorSpace = T.SRGBColorSpace; const lab = new T.Sprite(new T.SpriteMaterial({ map: tt, transparent: true, depthWrite: false })); lab.scale.set(1.9, .48, 1); lab.position.y = 2.45; lab.renderOrder = 6;
    gp.add(b, wf, wr, rd, hm, lab); gp.traverse(c => { if (c.isMesh) c.castShadow = true; }); scene.add(gp); r.g = gp; r.wf = wf; r.wr = wr; } }
let ghostBuilt = false;   /* il fantasma è la sagoma vera di moto e pilota, bianca e trasparente */
function ghostBuild() { if (ghostBuilt || !P.parts || !P.rGeo || !P.helm) return; ghostBuilt = true; const gm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .34, depthWrite: false, fog: false });
  ghostG.clear(); const b = P.parts.body.clone(), wf = P.parts.wf.clone(), wr = P.parts.wr.clone(); wf.position.copy(P.parts.pf); wr.position.copy(P.parts.pr); const rd = new T.Mesh(P.rGeo, gm); rd.position.set(0, FIT.y, FIT.z); const hm = new T.Mesh(P.helm.geometry, gm); hm.position.set(0, FIT.y + .67, FIT.z - .15);
  ghostG.add(b, wf, wr, rd, hm); ghostG.traverse(c => { if (c.isMesh) { c.material = gm; c.castShadow = false; c.userData.noShadow = 1; c.renderOrder = 6; } }); }
function rivStep(dt) { if (!rivBuilt) return; for (const r of RIV) { if (state === 'play' && !r.done) { const i = Math.min(tr.n - 1, Math.round(r.s / DS)); let km = 0; for (let q = 0; q <= 14; q += 2) km = Math.max(km, Math.abs(tr.k[Math.min(tr.n - 1, i + q)]));
      const vt = Math.min(24 * (KSPD[tr.kind[i]] || 1), km > .004 ? Math.sqrt(8.5 / km) : 99) * r.skill * (forkAt(tr, r.s) && r.lane < 0 ? .6 : 1); r.v += clamp(vt - r.v, -7 * dt, 4.2 * dt); r.s += r.v * dt;
      /* traiettoria: ognuno ha la sua linea, in curva stringe all'interno, e se ti trova davanti si sposta invece di venirti addosso. Di lato si muove solo quanto la velocità permette: da fermo non scarta */
      let ka = 0; for (let q = 2; q <= 10; q += 2) ka += tr.k[Math.min(tr.n - 1, i + q)]; ka /= 5; const hwR = widthAt(tr, r.s) / 2 - .75, lo = laneOff(tr, r.s, r.lane);
      let dT = lo > .5 ? r.lane * lo : clamp(r.line * Math.min(1, hwR) + clamp(ka * 45, -1, 1) * hwR * .7 + Math.sin(r.s * .021 + r.s0) * .3, -hwR, hwR);
      { const ahead = S.s - r.s; if (ahead > 0 && ahead < 9 && Math.abs(S.d - dT) < 1.3 && !(lo > .5)) dT = clamp(S.d + (r.d >= S.d ? 1.5 : -1.5), -hwR, hwR); }
      const dv = clamp((dT - r.d) * 1.6, -.22 * r.v, .22 * r.v); r.dv = (r.dv || 0) + (dv - (r.dv || 0)) * Math.min(1, dt * 4); r.d += r.dv * dt;
      r.lean += (clamp(tr.k[i] * r.v * r.v / G + r.dv * .12, -.75, .75) - r.lean) * Math.min(1, dt * 4);
      if (r.s >= tr.len - 14) { r.done = time; r.v = 0; }
      // se gli vai addosso: una spallata, perdi un po' di velocità
      if (Math.abs(r.s - S.s) < 1.7 && Math.abs(r.d - S.d) < .85 && !(S.bumpCd > 0) && !(S.fall > 0)) { S.bumpCd = .8; S.v = Math.min(S.v, Math.max(r.v * .9, 2)); S.hit = Math.max(S.hit, .5); thud(.5); S.psi += (S.d > r.d ? 1 : -1) * .12; } }
    { const sc = Math.min(r.s, tr.len - 1), i = Math.min(tr.n - 2, Math.floor(sc / DS)), u = sc / DS - i; let dh = tr.h[i + 1] - tr.h[i]; at(tr, sc, r.d, P); const y = groundY(tr, sc, r.d, true);
      /* la moto punta dove va: direzione del sentiero più lo scarto laterale, mai di traverso. Segue la pendenza e le ruote girano */
      const hT = tr.h[i] + dh * u + Math.atan2(r.dv || 0, Math.max(r.v, 3)); r.h = state === 'play' ? (r.h ?? hT) + (hT - (r.h ?? hT)) * Math.min(1, dt * 8) : hT;
      const yA = groundY(tr, Math.min(tr.len - 1, sc + .7), r.d, true), yB = groundY(tr, Math.max(0, sc - .7), r.d, true); r.pit = (r.pit || 0) + (Math.atan2(yA - yB, 1.4) - (r.pit || 0)) * Math.min(1, dt * 7);
      r.g.position.set(P.x, y, P.z); r.g.rotation.set(r.pit, -r.h, -r.lean, 'YXZ'); if (r.wf) { r.wf.rotation.x -= r.v * dt / .33; r.wr.rotation.x -= r.v * dt / .33; } } } }
const myPos = () => 1 + RIV.filter(r => r.done || r.s > S.s).length;
function place() { const s0 = 20; at(tr, s0, 0, P); Object.assign(S, { x: P.x, z: P.z, y: P.y, psi: P.h, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: Math.round(s0 / DS), s: s0, d: 0, off: 0, hit: 0, pitch: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0, by: P.y, bvy: 0, comp: 0, cF: 0, cR: 0, rough: 0, grip: 1.1, wet: 0 }); cam.h = P.h; cam.init = false; tiltA0 = null; tiltSteer = 0; }
// CADUTA: la moto va giù, striscia, e dopo un paio di secondi si riparte da fermi in mezzo al sentiero. Il tempo continua a correre.
function crash(side) { if (S.fall > 0 || S.safe > 0 || state !== 'play') return; S.fall = 2.3; S.fallSide = side || 1; S.falls = (S.falls || 0) + 1; S.hit = 1; S.air = 0; thud(1); $('msg').textContent = 'CADUTO!'; }
// contro un sasso o un tronco, piano: una botta sola, poi la moto gira lungo l'ostacolo e scivola via. Prima restava incastrata (rallentava a ogni istante finché ci stava contro)
function glance(nx, nz, dt) { const hx = Math.sin(S.psi), hz = -Math.cos(S.psi); if (hx * nx + hz * nz >= 0) return;   // se te ne stai già andando, niente
  let tx = -nz, tz = nx; { const th = tr.h[S.i], fx = S.off > .3 ? Math.sin(th) : hx, fz = S.off > .3 ? -Math.cos(th) : hz; if (fx * tx + fz * tz < 0) { tx = -tx; tz = -tz; } }   /* fuori pista si scivola attorno all'ostacolo nel verso del sentiero, così non si resta a rimbalzare tra due tronchi */ const want = Math.atan2(tx + nx * .35, -(tz + nz * .35)); let da = want - S.psi; da = Math.atan2(Math.sin(da), Math.cos(da)); S.psi += da * Math.min(1, dt * 12); S.lean *= 1 - Math.min(1, dt * 6);
  if (!(S.bumpCd > 0)) { S.v *= .5; S.hit = Math.max(S.hit, .5); thud(.4); } S.bumpCd = .6; S.v = Math.max(S.v, 1.2); }
function unstick(dt) { if (S.fall > 0 || state !== 'play') { S.stT = 0; return; }   /* incastrato: se continui a sbattere contro alberi o sassi per più di 2 secondi, ti rimetto sul sentiero */
  S.stT = S.bumpCd > 0 && S.v < 4 ? (S.stT || 0) + dt : Math.max(0, (S.stT || 0) - dt * 2); if (S.stT > 2) { S.stT = 0; getUp(); flash('RIMESSO IN PISTA', 1.4); } }
function getUp() { { const ls = laneSide(tr, S.s, S.d); at(tr, S.s, ls * laneOff(tr, S.s, ls), P); }   /* nel bivio si riparte nella propria corsia, non sui sassi in mezzo */ Object.assign(S, { x: P.x, z: P.z, psi: P.h, v: 0, lean: 0, leanV: 0, slip: 0, vy: 0, air: 0, fall: 0, safe: 1.5, overT: 0, brkAmt: 0 }); steerIn = 0; $('msg').textContent = ''; }
function step(dt) {
  if (S.fall > 0) { S.fall -= dt; if (S.fall <= 0) getUp(); } unstick(dt); S.safe = Math.max(0, (S.safe || 0) - dt); S.bumpCd = Math.max(0, (S.bumpCd || 0) - dt); const down = S.fall > 0;
  const pr = project(tr, S.x, S.z, S.i); S.i = pr.i; S.s = pr.s; S.d = pr.d; S.grade = pr.g;
  const HW = widthAt(tr, S.s) / 2, KD = kindAt(tr, S.s); S.kd = KD;
  const latA = Math.abs(lat(tr, S.s, S.d)), onTrack = latA <= HW + .2; S.off += ((onTrack ? 0 : clamp((latA - HW - .2) / 1.6, .12, 1)) - S.off) * Math.min(1, dt * 6);
  S.grip += (KD.grip - S.grip) * Math.min(1, dt * 5); S.wet = S.air > 0 ? 0 : waterAt(tr, S.s, S.d, groundY(tr, S.s, S.d, true));   // aderenza del fondo e profondità dell'acqua sotto le ruote
  // sterzo: il comando chiede una piega, la moto ci arriva con il suo peso (molla smorzata)
  const key = keyR - keyL, raw = performance.now() - tiltSeen < 700 && Math.abs(tiltSteer) > .001 ? tiltSteer : (key || touchSteer);
  let cmd = raw * (O.inv ? -1 : 1); if (assist) { const j = Math.min(tr.n - 1, S.i + Math.round(Math.max(6, S.v * .5) / DS)); let rel = tr.h[j] - S.psi; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); cmd = rel * 2.4 - S.d * .08; }   // scuola, prime stazioni: sterza da sola
  steerIn += (clamp(cmd, -1, 1) - steerIn) * Math.min(1, dt * (key ? 7 : 14));
  const tight = KD.name === 'single track' || KD.name === 'macchia' || KD.name === 'mulattiera', leanMax = (KD.name === 'single track' ? .96 : tight ? .88 : .82) - S.off * .2 + (BK.agile - 1) * .12,   // nello stretto la moto si butta giù di più e più in fretta: nel canale del sentiero c'è l'appoggio
   leanT = state === 'play' ? steerIn * leanMax * clamp(S.v / 6, .25, 1) : 0;
  if (down) { S.lean += (S.fallSide * 1.45 - S.lean) * Math.min(1, dt * 8); S.leanV = 0; } else { S.leanV += ((leanT - S.lean) * (tight ? 95 : 62) * BK.agile - S.leanV * (tight ? 14.5 : 11.5)) * dt; S.lean += S.leanV * dt; }
  // la piega fa girare: velocità di imbardata = g·tan(piega)/v, fino al limite di aderenza del fondo
  if (state === 'play') {
    if (S.wet > .03 && S.v > 4) { if (!S.inWater) { S.inWater = 1; splash(Math.min(1, S.v / 18)); splat('water', Math.round(8 + S.v * 1.6)); } S.splA = (S.splA || 0) + S.v * S.wet * 14 * dt; while (S.splA >= 1) { S.splA--; splat('water', 1); } } else if (S.wet < .01) S.inWater = 0;   // l'acqua ti arriva in faccia: più forte entri, meno vedi
    if (KD.name === 'fango' && S.off < .5 && S.v > 6) { S.mudA = (S.mudA || 0) + (Math.abs(S.slip) * 9 + (S.gasOn ? .7 : .2)) * dt; while (S.mudA >= 1) { S.mudA--; splat('mud', 1); } }
    for (const br of tr.branches) if (br.s > S.sPrev && br.s <= S.s) { const hw = widthAt(tr, br.s) / 2; if (S.d * br.side > -br.reach - .25) { const deep = clamp((S.d * br.side + br.reach + .25) / (hw + br.reach), .2, 1); splat('leaf', Math.round(2 + deep * 4), br.side); whip(); S.v *= 1 - .07 * deep; S.hit = Math.max(S.hit, .25 * deep); S.psi -= br.side * .03 * deep; } }   // ramo in faccia: non vedi, perdi un po' di velocità, la moto scarta
  }
  // tronco di traverso: con la ruota davanti alta (o in volo) lo scavalchi, piano ci sbatti e passi quasi da fermo, forte con la ruota a terra voli giù
  if (state === 'play' && !down) for (const lg of tr.logs) if (lg.s > S.sPrev && lg.s <= S.s && S.air <= 0 && (!lg.lane || (laneSide(tr, S.s, S.d) > 0 && lat(tr, S.s, S.d) < HW + 1.2))) { if ((S.wh || 0) > .2) { S.hit = Math.max(S.hit, .2); thud(.25); S.v *= .97; S.bvy += 1.2; } else if (S.v > 8) crash(Math.sign(S.lean) || 1); else { S.v *= .3; S.hit = Math.max(S.hit, .5); thud(.5); S.bvy += 1.6; } }
  // birre e bivi
  if (state === 'play' && !down) { for (const b of tr.beers) if (!b.got && Math.abs(b.s - S.s) < 1.8 && Math.abs(b.d - S.d) < 1.25) { b.got = 1; b.m.visible = false; S.beers = (S.beers || 0) + 1; glug(); flash('BIRRA! +100', .7); }
    const f = forkAt(tr, S.s), ls = laneSide(tr, S.s, S.d), lo = laneOff(tr, S.s, ls); S.soft = f && ls < 0 && lo > 3 ? 1 : 0;
    if (f && f.pick === undefined && lo > 5 && Math.abs(lat(tr, S.s, S.d)) < HW + 1) { f.pick = ls; if (f.pick < 0) { S.bunny = 14; S.conigli = (S.conigli || 0) + 1; flash('CONIGLIO!', 1.8); } else flash('EASY!', 1.2); } }
  S.bunny = Math.max(0, (S.bunny || 0) - dt);
  S.sPrev = S.s;
  const mu = (S.grip - S.off * .3 - Math.min(.25, S.wet * .8)), vEff = Math.max(S.v, 4.5);
  let om = G * Math.tan(S.lean) / vEff; const omMax = mu * G / vEff, over = Math.max(0, Math.abs(om) - omMax);
  if (over > 0) om = Math.sign(om) * (omMax + over * .25);   // oltre il limite la moto allarga
  // troppo piegato per il fondo che c'è (fango, pietre bagnate, erba): la gomma tiene mezzo secondo, poi la moto si stende
  { const ask = Math.tan(Math.abs(S.lean)) / Math.max(.3, mu); S.overT = (ask > 1.18 || Math.abs(S.slip) > .45 && S.off > .8) && S.v > 7 && S.air <= 0 && !down ? (S.overT || 0) + dt * (ask > 1.45 ? 1.6 : 1) : Math.max(0, (S.overT || 0) - dt * 2); if (S.overT > .6) crash(Math.sign(S.lean)); }
  if (down) om = S.fallSide * .5 * clamp(S.v / 6, 0, 1);
  // velocità: gas (automatico o tasto), freno, salita/discesa, attrito in piega, erba
  let kAhead = 0; { const far = Math.round(clamp(S.v * S.v / 15, 8, 64) / DS); for (let j = 2; j <= far; j += 2) { const kk = tr.k[Math.min(tr.n - 1, S.i + j)]; if (Math.abs(kk) > Math.abs(kAhead)) kAhead = kk; } }   // la curva più stretta nello spazio che serve per frenare
  const vSafe = Math.abs(kAhead) > .004 ? Math.sqrt(mu * G * .86 / Math.abs(kAhead)) : 99;
  const autoBrake = O.auto && S.v > vSafe + .5, brk = state === 'play' && (braking || autoBrake);
  // quanto stai frenando: il tasto tenuto premuto sale da poco a tutto in mezzo secondo (il freno automatico pinza a metà)
  S.brkAmt += ((braking ? 1 : autoBrake ? .5 : 0) - S.brkAmt) * Math.min(1, dt * (brk ? 2.4 : 7));
  // ENDURO: frenando col posteriore la moto si mette di traverso, tanto più quanto freni e quanto sterzi; il muso entra in curva prima
  const turnDir = Math.abs(steerIn) > .06 ? Math.sign(steerIn) : Math.abs(kAhead) > .006 ? Math.sign(kAhead) : 0;
  const brakeSlide = brk && S.v > 5 ? turnDir * Math.min(.62, S.brkAmt * (.2 + .55 * Math.abs(steerIn))) * clamp((S.v - 4) / 7, 0, 1) : 0;
  // manopola: quanto chiedi (0..1) e quanto il motore dà davvero (apre e chiude in un attimo, ma non a scatto)
  const want = state === 'play' && !brk && !down ? (O.gas === 'a' ? (S.v < vSafe + 1.5 ? 1 : 0) : gasHeld ? gasCmd : 0) : 0;
  // IMPENNATA: colpo di gas (chiudi e riapri subito) a bassa e media velocità e la ruota davanti si alza. La tieni su col gas, scende se chiudi o freni; troppo gas da piano e ti ribalti
  { const now = time, on = gasHeld && state === 'play'; if (on && !S.gasWas) S.prsT = now; if (!on && S.gasWas) { S.relT = now; S.heldT = now - (S.prsT ?? now); } if (on && !S.gasWas && now - (S.relT ?? -9) < .35 && (S.heldT || 0) > .5 && S.v > 3 && S.v < 19 && Math.abs(S.lean) < .4 && S.air <= 0 && !(S.wh > .05) && O.gas !== 'a') S.whV = 2.1 * (.7 + .3 * BK.wh); S.gasWas = on;
    S.wh = S.wh || 0; S.whV = S.whV || 0; if (S.wh > 0 || S.whV > 0) { S.whV += ((want > .35 ? 5 * (want - .35) * Math.max(0, 1 - S.v / 20) : -6) - 3.2 * S.wh - (brk ? 16 : 0) - S.whV * 2.4) * dt; S.wh += S.whV * dt;
      if (S.wh <= 0) { if (S.whV < -1.2) { S.hit = Math.max(S.hit, .3); thud(.3); } S.wh = 0; S.whV = 0; } if (S.wh > 1.22) { S.wh = 0; S.whV = 0; crash(0); } if (down || S.air > 0) { S.whV = Math.min(S.whV, 0) - 4 * dt; } } }
  S.thr = (S.thr || 0) + (want - (S.thr || 0)) * Math.min(1, dt * (want > (S.thr || 0) ? 14 : 20)); const thr = S.thr, gasOn = thr > .05;   // il gas automatico molla prima delle curve strette (non frena: quello lo fai tu)
  // trazione: la spinta chiesta contro quella che il fondo regge. Se apri troppo su fango, bagnato o salita la ruota gira a vuoto: spinge meno e il posteriore scappa
  const vTop0 = VMAX * (1 - S.off * .5) * (.3 + .7 * thr), push = Math.pow(thr, 1.35) * 11.5 * BK.acc * clamp(1.15 - S.v / vTop0, 0, 1), hold = Math.max(2, (mu * .92 - Math.abs(Math.tan(S.lean)) * .35) * G), spin = S.air > 0 ? 0 : clamp((push - hold) / hold, 0, 1);
  S.spin = (S.spin || 0) + (spin - (S.spin || 0)) * Math.min(1, dt * 9);
  const powerSlide = gasOn ? Math.sign(S.lean || steerIn) * (Math.max(0, Math.abs(S.lean) - .5) * .7 * thr * clamp(1.3 - S.v / 14, 0, 1) + S.spin * (.12 + Math.abs(S.lean) * .5)) : 0;   // in uscita, col gas e piegato, il posteriore scappa un po'
  const slipT = brakeSlide + powerSlide + (over > 0 ? Math.sign(om) * Math.min(.4, over * .9) : 0);
  S.slip += (slipT - S.slip) * Math.min(1, dt * (Math.abs(slipT) > Math.abs(S.slip) ? 6.5 : 3.2));
  om += S.slip * 1.7 * clamp(S.v / 11, .3, 1);   // di traverso la moto chiude la curva: è così che si imposta
  S.psi += om * dt * (1 - clamp((S.wh || 0) / .5, 0, 1) * .75);   // su una ruota la moto gira poco
  const gas = thr, vTop = vTop0 * (S.soft ? .5 : 1);
  let acc = Math.min(push, hold) * (1 - S.spin * .3) - (brk ? 4.5 + 8 * S.brkAmt : 0) - G * Math.sin(Math.atan(S.grade)) * (S.grade > 0 ? 2.3 / BK.climb : 1.25) - .0035 * S.v * S.v * (1 + S.off * 8) - (1 - thr) * (S.v > 2 ? 1.5 : .4) - Math.abs(Math.sin(S.lean)) * 1.1 - over * 3.5 - Math.abs(S.slip) * 2.2 - KD.drag * (1 - S.off) * clamp(S.v / 8, 0, 1.5) - S.off * (KD.tex === 'forest' || KD.name === 'macchia' ? 5 : 2.2) * clamp(S.v / 6, 0, 1) - S.wet * S.v * S.v * .055;   // fango e pietre frenano, l'acqua tanto più quanto è fonda e vai forte
  acc -= G * clamp(Math.tan(S.pitch) - S.grade, 0, .5) * 1.2 * (S.air > 0 ? 0 : 1) * (1 - clamp((S.wh || 0) / .3, 0, 1) * .8);   // gradoni e gobbe in salita mangiano velocità: se molli il gas ti fermi
  if (S.soft) acc -= 3.2 * clamp(S.v / 7, 0, 1.6);   // conigliera: fondo molle, si va piano
  if (down) acc = -9;
  if (state !== 'play') acc = -S.v * 3;
  S.v = Math.max(0, S.v + acc * dt); S.acc = (S.acc || 0) + (acc - (S.acc || 0)) * Math.min(1, dt * 8); S.brk = brk; S.gasOn = gasOn ? 1 : 0; S.over = over;
  // pilota: in piedi sul dritto, seduto in curva con la gamba interna fuori
  const straight = (Math.abs(steerIn) < (S.stand > .5 ? .24 : .12) && Math.abs(kAhead) < .008 && !brk && S.v > 8 || Math.abs(S.grade) > .1 && S.v > 4) && state === 'play';   // in salita e in discesa ripida si sta in piedi   // con un po' di margine: non si alza e siede di continuo
  S.stand += ((straight ? 1 : 0) - S.stand) * Math.min(1, dt * (straight ? 1.6 : 4));
  const dabOn = Math.abs(S.dab) > .3, dabT = Math.sign(S.lean + S.slip) * clamp((Math.abs(S.lean) - (dabOn ? .2 : .34)) / .14 + Math.abs(S.slip) * 3.5, 0, 1) * (S.v > 3 ? 1 : 0);   // esce in piega decisa e resta fuori finché non raddrizzi
  S.dab += (dabT - S.dab) * Math.min(1, dt * 4.5);
  S.fwd += ((brk ? .16 * S.brkAmt : -.03 - clamp(S.acc || 0, -2, 9) * .016) - clamp(S.grade, -.22, .22) * 1.3 - S.fwd) * Math.min(1, dt * 5);   // in salita il peso va avanti, in discesa indietro
  S.x += Math.sin(S.psi) * S.v * dt; S.z -= Math.cos(S.psi) * S.v * dt;
  // alberi: il tronco non si sposta. Forte si cade, piano ci si pianta contro
  if (!down && S.air <= 0) { const b0 = Math.floor(S.s / 8); for (let b = b0 - 1; b <= b0 + 1; b++) { const a = TREES[b]; if (!a) continue; for (let q = 0; q < a.length; q += 2) { const dx = S.x - a[q], dz = S.z - a[q + 1], dd = dx * dx + dz * dz; if (dd < .2) { const dist = Math.sqrt(dd) || .01, side = Math.sign(dx * Math.cos(S.psi) + dz * Math.sin(S.psi)) || 1;
    S.x = a[q] + dx / dist * .46; S.z = a[q + 1] + dz / dist * .46; if (S.v > 9) crash(side); else glance(dx / dist, dz / dist, dt); } } } }
  // sassi grossi: come i tronchi. Forte si cade, piano ci si ferma contro
  if (!down && S.air <= 0) { const b0 = Math.floor(S.s / 8); for (let b = b0 - 1; b <= b0 + 1; b++) { const a = ROCKS[b]; if (!a) continue; for (let q = 0; q < a.length; q += 3) { const dx = S.x - a[q], dz = S.z - a[q + 1], rr = a[q + 2] + .25, dd = dx * dx + dz * dz; if (dd < rr * rr) { const dist = Math.sqrt(dd) || .01;
    S.x = a[q] + dx / dist * rr; S.z = a[q + 1] + dz / dist * rr; if (S.v > 7) crash(Math.sign(dx * Math.cos(S.psi) + dz * Math.sin(S.psi)) || 1); else glance(dx / dist, dz / dist, dt); } } } }
  // bordi: dopo qualche metro di prato c'è la scarpata, si rimbalza dentro perdendo velocità
  const wall = KD.name === 'mulattiera', lim = wall ? HW - .12 : Math.max(HW + .6, Math.min(sideLimit(S.s, Math.sign(S.d) || 1) - 1.5, HW + (KD.name === 'single track' ? 4 : 9)));   // sulla mulattiera il muretto è il bordo
  const limF = lim + laneOff(tr, S.s, Math.sign(S.d) || 1); if (Math.abs(S.d) > limF) { const sg = Math.sign(S.d), push = Math.abs(S.d) - limF; S.x -= Math.cos(pr.h) * sg * push; S.z -= Math.sin(pr.h) * sg * push;
    let rel = S.psi - pr.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (rel * sg > 0) { const imp = Math.abs(Math.sin(rel)); if (!S.wall && imp > .5 && S.v > 9) crash(-sg); else if (!S.wall && imp > .3) { S.v *= 1 - imp * .3; S.hit = Math.max(S.hit, imp * .8); thud(imp * .6); }   // botta solo se ci arrivi storto
      S.psi -= rel * Math.min(1, dt * 9); S.v = Math.max(0, S.v - S.v * imp * 2.2 * dt - 1.5 * dt); S.lean *= 1 - Math.min(1, dt * 4); }   // poi la moto si raddrizza lungo il bordo e striscia, senza fermarsi
    S.wall = .15; } else S.wall = Math.max(0, (S.wall || 0) - dt);
  // altezza: le ruote seguono il fondo (profilo morbido), sui dossi presi forte la moto si stacca
  const gy = groundY(tr, S.s, S.d, true); S.rough = Math.abs(S.d) < HW + 1 ? roughAt(tr, S.s) : .02 * S.off;
  if (S.air <= 0) { const vyG = (gy - S.y) / dt; if ((vyG - S.vy) / dt < -G * 1.7 && S.v > 5 && S.vy > (Math.abs(lat(tr, S.s, S.d)) > HW ? 6 : 2.5)) { S.air = 1; S.airT = 0; } /* fuori dal sentiero il terreno è mosso ma non è un trampolino: le ruote lo seguono */ else { S.vy = vyG; S.y = gy; } }
  if (S.air > 0) { S.airT = (S.airT || 0) + dt; S.vy -= G * 1.7 * dt; S.y += S.vy * dt; if (S.y <= gy) { const imp = clamp(-S.vy / 8, 0, 1); S.y = gy; S.air = 0; const big = S.airT > .14 ? 1 : .25; if (imp > .8 && Math.abs(S.lean) > .4 && S.airT > .3) crash(Math.sign(S.lean)); S.hit = Math.max(S.hit, imp * big); S.bvy = S.vy * .9 * big; thud(imp * big); S.v *= 1 - imp * .06; S.vy = 0; } }
  S.hit = Math.max(0, S.hit - dt * 2.5);
  // sospensioni: la moto è una massa su una molla sopra le ruote. comp > 0 = schiacciata
  if (S.air > 0) { S.comp += ((S.airT > .1 ? -.09 : S.comp) - S.comp) * Math.min(1, dt * 8); S.by = S.y - S.comp; S.bvy = S.vy; }   // in aria le ruote scendono: sospensioni distese
  else { S.bvy += ((S.y - S.by) * 300 - (S.bvy - S.vy) * 19) * dt; S.by += S.bvy * dt; if (S.y - S.by > .2) { S.by = S.y - .2; S.bvy = Math.max(S.bvy, S.vy); } if (S.y - S.by < -.12) { S.by = S.y + .12; S.bvy = Math.min(S.bvy, S.vy); } }
  S.comp = S.y - S.by;
  const chat = S.rough * clamp(S.v / 10, 0, 1.3) * .45, tt = S.s * 2.1;   // legato ai metri fatti, non al tempo: sono le radici che passano sotto
  S.cF += (clamp(S.comp + .075 * S.brkAmt * (S.brk ? 1 : 0) - (gas ? .02 : 0) + chat * Math.sin(tt * 1.3) * 1.4, -.13, .21) - S.cF) * Math.min(1, dt * 30);   // forcella: affonda in frenata
  S.cR += (clamp(S.comp - .03 * S.brkAmt * (S.brk ? 1 : 0) + (gas ? .045 * clamp(1.2 - S.v / 15, 0, 1) : 0) + chat * Math.sin(tt * 1.1 + 2) * 1.4, -.13, .21) - S.cR) * Math.min(1, dt * 30);   // dietro: si siede col gas
  if (S.rough > .01) S.v = Math.max(0, S.v - S.rough * 14 * dt);
  const ahead = groundY(tr, S.s + .75, S.d, true), behind = groundY(tr, S.s - .75, S.d, true); S.pitch += (Math.atan2(ahead - behind, 1.5) - S.pitch) * Math.min(1, dt * (S.air > 0 ? 2 : 14));
  // senso di marcia e arrivo
  let rel = S.psi - pr.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); wrong = Math.abs(rel) > 1.9 ? wrong + dt : 0;
  if (state === 'play') { time += dt; if (!SCHOOL) { const si = tr.spans.findIndex(sp => S.s < sp.s1); if (si > (S.spanI || 0)) { S.spanI = si; splits.push(+time.toFixed(2)); const bs = bestSplits[splits.length - 1]; if (bs) { const dlt = time - bs; flash('INTERTEMPO ' + (dlt <= 0 ? '−' : '+') + Math.abs(dlt).toFixed(1) + ' s', 1.4); S.splitGood = dlt <= 0; } } } if (S.s >= tr.len - 14) finish(); }
}

// ---------- camera da inseguimento ----------
const cam = { h: 0, x: 0, y: 0, z: 0, roll: 0, fov: 66, init: false, dist: 0 };
function camUpdate(dt) {
  let dh = S.psi + S.slip * .12 - cam.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); cam.h += dh * Math.min(1, dt * 3.4);   // gira in ritardo: la moto entra in curva prima della camera
  const portrait = camera.aspect < .8, kc = { c: .8, m: 1, l: 1.3 }[O.cam] || 1, sp = S.v / VMAX;
  const distT = ((portrait ? 6.2 : 5.2) + sp * 2.1 - (S.brk ? .8 : 0)) * kc; cam.dist += (distT - cam.dist) * Math.min(1, dt * 2.2);
  const tx = S.x - Math.sin(cam.h) * cam.dist, tz = S.z + Math.cos(cam.h) * cam.dist;
  const pc = project(tr, tx, tz, S.i), ty = Math.max(groundY(tr, pc.s, pc.d) + 1.1, S.y + (portrait ? 2.9 : 2.15) * kc - S.pitch * 1.1);
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.z = tz; cam.init = true; cam.dist = distT; }
  cam.x = tx; cam.z = tz; cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  const sh = S.hit * .1 + S.off * .012 * sp; camera.position.set(cam.x + (Math.random() - .5) * sh, cam.y + (Math.random() - .5) * sh, cam.z);
  const la = 7 + sp * 6; camera.lookAt(S.x + Math.sin(S.psi) * la, S.y + 1.25 + S.pitch * la * .22, S.z - Math.cos(S.psi) * la);
  cam.roll += (-clamp(S.lean, -.82, .82) * .2 - cam.roll) * Math.min(1, dt * 5); camera.rotateZ(cam.roll);
  const fovT = (portrait ? 72 : 58) + sp * sp * 24; cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3); if (Math.abs(camera.fov - cam.fov) > .05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (cam.dbg) { const a = S.psi + cam.dbg; camera.position.set(S.x + Math.sin(a) * 4.4, S.y + 1.7, S.z - Math.cos(a) * 4.4); camera.lookAt(S.x, S.y + .95, S.z); }   // solo per le prove: vista da davanti
  P.sky.position.x = camera.position.x; P.sky.position.z = camera.position.z;
}
const RD = { off: 0 };
function draw(dt) {
  { const st = clamp(S.stand - Math.max(0, S.comp) * 2.5 + ((S.airT || 0) > .12 && S.air > 0 ? .6 : 0) + S.rough * 6, 0, 1); S.standV = (S.standV || 0) + (st - (S.standV || 0)) * Math.min(1, dt * 7); }   // il pilota si alza e si abbassa con calma, senza scatti
  const leanVis = clamp(S.lean * 1.12 + S.slip * .35, -1, 1) + (S.fall > 0 ? clamp(S.lean, -1.45, 1.45) * .3 : 0);   // la moto si butta giù più del pilota
  bike.position.set(S.x, S.y, S.z); bike.rotation.y = -(S.psi + S.slip); leanG.rotation.z = -leanVis; pitchG.rotation.x = S.pitch + (S.air > 0 ? clamp(-S.vy * .03, -.25, .3) : 0) - (S.cF - S.cR) / 1.45 + clamp(S.acc || 0, -6, 9) * .009 + (S.wh || 0); pitchG.position.y = -(S.cF + S.cR) / 2 + (S.y - groundY(tr, S.s, S.d, true)) * 0; pitchG.position.y += Math.sin(S.wh || 0) * .66; pitchG.position.z = (1 - Math.cos(S.wh || 0)) * .66;   /* l'impennata gira attorno alla ruota dietro */
  if (wheelF) { const r = S.v * dt / .4; wheelF.rotation.x -= r; wheelR.rotation.x -= S.brk && Math.abs(S.slip) > .12 ? r * .15 : r; steerG.rotation.y = clamp(S.slip * .9 - S.lean * .1, -.5, .5); wheelF.position.y = P.wfY + S.cF; wheelR.position.y = P.wrY + S.cR; }   // di traverso: ruota dietro quasi bloccata e controsterzo
  if (P.rider) { const r = P.rider.root;   // in caduta il pilota si stacca dalla moto, scivola avanti per conto suo e resta a terra; alla ripartenza torna in sella
    if (S.fall > 0 && !RD.off) { RD.p = r.position.clone(); RD.q = r.quaternion.clone(); RD.s = r.scale.clone(); scene.attach(r); RD.off = 1; RD.t = 0; RD.vx = Math.sin(S.psi) * (S.v * .9 + 2) + Math.cos(S.psi) * S.fallSide * 1.5; RD.vz = -Math.cos(S.psi) * (S.v * .9 + 2) + Math.sin(S.psi) * S.fallSide * 1.5; RD.h = S.psi; }
    if (RD.off && S.fall > 0) { RD.t += dt; const e = Math.min(1, RD.t * 2.2), ee = 1 - (1 - e) * (1 - e), f = 2.6 * ee, o = S.fallSide * 1.3 * ee;   // sbalzato avanti e di lato, poi striscia insieme alla moto
      r.position.x = S.x + Math.sin(RD.h) * f + Math.cos(RD.h) * o; r.position.z = S.z - Math.cos(RD.h) * f + Math.sin(RD.h) * o; const pj = project(tr, r.position.x, r.position.z, S.i);
      r.position.y += (groundY(tr, pj.s, pj.d, true) + .3 + Math.sin(Math.PI * e) * .5 - r.position.y) * Math.min(1, dt * 12); r.rotation.set(1.42 * ee, -RD.h + S.fallSide * 1.1 * ee, S.fallSide * .35 * ee, 'YXZ'); }
    if (RD.off && !(S.fall > 0)) { pitchG.add(r); r.position.copy(RD.p); r.quaternion.copy(RD.q); r.scale.copy(RD.s); RD.off = 0; } }
  if (P.rider) { const neck = P.rider.pose({ fwd: S.fwd, side: leanVis * .5, stand: S.standV, dab: S.dab, gas: S.gasOn, brake: S.brkAmt, vib: 0, hx: FIT.hx, hy: FIT.hy, hz: FIT.hz });
    if (P.helm) { pitchG.worldToLocal(neck); P.helm.position.set(neck.x, neck.y + .19, neck.z - .02); P.helm.rotation.set(S.fwd * .3, 0, leanVis * .35); } }
  if (P.ears) P.ears.visible = (S.bunny || 0) > 0; { const tt = performance.now() / 1000; for (const b of tr.beers) if (!b.got) b.m.position.y = b.y + Math.sin(tt * 3 + b.s) * .12; } ghostDraw(dt); rivBuild(); rivStep(dt);
  rings(dt); WATER_N.offset.x += dt * .018; WATER_N.offset.y += dt * .03; lensDraw(dt); dust(dt); soundUpdate(dt, { thr: S.thr || 0, spin: S.spin || 0, wet: S.wet, surf: S.kd.tex, sp: S.v / VMAX * 2, gas: S.gasOn, brk: S.brk ? S.brkAmt : 0, slip: S.slip, air: S.air > 0, off: S.off, rough: S.rough, play: state === 'play' });
  blob.position.set(S.x, groundY(tr, S.s, S.d, true) + .05, S.z); blob.rotation.z = -S.psi; blob.visible = !renderer.shadowMap.enabled; blob.material.opacity = S.air > 0 ? .16 : .32;
  { const fx = Math.sin(S.psi), fz = -Math.cos(S.psi); sun.target.position.set(Math.round(S.x + fx * 16), S.y, Math.round(S.z + fz * 16)); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 110); }
  camUpdate(dt); if (!window.__noRender) renderer.render(scene, camera);
}

// ---------- gioco ----------
const fmt = t => t.toFixed(1).replace('.', ',');
// ---------- scuola: stazioni ----------
let stI = null, stM = {}, flashT = 0, flashMsg = '';
function flash(m, t = 1.5) { flashMsg = m; flashT = t; }
function toStation(k, why) { const a = tr.stations[k], s = a.s0 + 3; tipSet(k, 0); at(tr, s, 0, P); Object.assign(S, { x: P.x, z: P.z, y: P.y, by: P.y, psi: P.h, v: 0, lean: 0, leanV: 0, slip: 0, vy: 0, bvy: 0, air: 0, fall: 0, safe: 1.5, wh: 0, whV: 0, thr: 0, i: Math.round(s / DS), s, sPrev: s, d: 0, overT: 0 }); steerIn = 0; cam.h = P.h; cam.init = false; stM = {}; if (why) flash(why, 2.2); }
let assist = false, vLast = -1;   // nelle prime stazioni della scuola la moto sta in strada da sola
const tipSet = (k, done) => { const a = tr.stations[k]; $('tip').innerHTML = '<b>' + (k + 1) + '/' + tr.stations.length + ' · ' + a.t + (done ? ' · FATTO!' : '') + '</b>' + (done ? 'Bravo. Vai avanti col GAS fino alla prossima.' : a.x); $('tip').classList.toggle('done', !!done); for (const id of ['gasb', 'brake']) $(id).classList.toggle('pulse', !done && a.hl === id); if (!done && vLast !== k) { vLast = k; say('v' + (k + 1)); } };
function school(dt) { flashT -= dt; if (!tr.stations || (state !== 'play' && state !== 'count')) { assist = false; return; }
  const k = tr.stations.findIndex(a => S.s >= a.s0 && S.s < a.s1);
  if (stI !== null && stI >= 0 && k !== stI && S.s >= tr.stations[stI].s1) { const a = tr.stations[stI], m = stM, ok = m.done || (a.goal === 'on' ? (m.off || 0) < 1.5 : a.goal === 'spin' ? (m.spin || 0) < 1.2 : a.goal === 'slide' ? !!m.braked && (m.off || 0) < 1.2 : a.goal === 'pass'); if (!ok) { toStation(stI, a.no); return; } if (!m.done) flash('BRAVO!', 1.2); }
  if (k !== stI) { stI = k; stM = {}; if (k >= 0) tipSet(k, 0); $('tip').classList.toggle('hidden', k < 0); if (k < 0) for (const id of ['gasb', 'brake']) $(id).classList.remove('pulse'); }
  assist = k >= 0 && !!tr.stations[k].auto;
  if (k >= 0 && state === 'play') { const a = tr.stations[k], m = stM; if (Math.abs(S.d) > widthAt(tr, S.s) / 2 + .3) m.off = (m.off || 0) + dt; if ((S.spin || 0) > .5) m.spin = (m.spin || 0) + dt; if (S.brk && S.v > 4) m.braked = 1; if ((S.thr || 0) > .25 && (S.thr || 0) < .75) m.half = (m.half || 0) + dt; m.wh = Math.max(m.wh || 0, S.wh || 0);
    if (S.v > 9) m.fast = 1; if (steerIn > .3) m.right = 1; if (steerIn < -.3) m.left = 1;
    if (!m.done && (a.goal === 'go' ? S.v > 8 : a.goal === 'stop' ? m.fast && S.v < 1.2 && S.brk : a.goal === 'half' ? (m.half || 0) >= 1 : a.goal === 'lean' ? m.left && m.right : a.goal === 'wh' ? (m.wh || 0) >= .4 : false)) { m.done = 1; flash('BRAVO!', 1.2); tipSet(k, 1); if (k > 0) say('si'); }
    if (S.fall > 0) m.fell = 1; else if (m.fell) toStation(k, a.no); } }
function hud() { $('spd').firstChild.nodeValue = Math.round(S.v * 3.6); $('tim').firstChild.nodeValue = fmt(time); $('bar').firstElementChild.style.width = clamp(S.s / (tr.len - 14) * 100, 0, 100) + '%';
  $('best').textContent = SCHOOL ? '' : (best ? 'RECORD ' + fmt(best) + ' s · ' : '') + '🍺 ' + (S.beers || 0) + (rivBuilt ? ' · POS ' + myPos() + '/' + (RIV.length + 1) : ''); $('gasb').classList.toggle('hidden', O.gas === 'a'); $('gasb').style.setProperty('--g', Math.round((S.thr || 0) * 100) + '%'); { const t = gasHeld ? 'GAS ' + Math.round(gasCmd * 100) + '%' : 'GAS'; if ($('gasb').textContent !== t) $('gasb').textContent = t; }
  if (state === 'play') { const t = S.fall > 0 ? 'CADUTO!' : flashT > 0 ? flashMsg : wrong > .8 ? 'GIRATI!' : time < .9 ? 'VIA!' : ''; if ($('msg').textContent !== t) $('msg').textContent = t; $('msg').classList.toggle('small', t.length > 9); } else $('msg').classList.remove('small'); }
function labels() { $('oAuto').textContent = 'FRENO AUTO: ' + (O.auto ? 'SÌ' : 'NO'); $('oGas').textContent = 'GAS: ' + (O.gas === 'a' ? 'AUTOMATICO' : 'COL TASTO'); $('oSens').textContent = 'STERZO: ' + ({ s: 'MORBIDO', m: 'MEDIO', h: 'RAPIDO' }[O.sens]); $('oInv').textContent = 'VERSO STERZO: ' + (O.inv ? 'INVERTITO' : 'NORMALE'); $('oSnd').textContent = 'SUONO: ' + (O.snd ? 'SÌ' : 'NO'); $('oCam').textContent = 'CAMERA: ' + ({ c: 'VICINA', m: 'MEDIA', l: 'LONTANA' }[O.cam]); }
{ const i0 = MOTO.indexOf(BK), go = k => { setOpt('moto', MOTO[(i0 + k + MOTO.length) % MOTO.length].id); location.reload(); }; $('mName').textContent = BK.name; $('mTxt').textContent = BK.txt; $('mPrev').onclick = () => go(-1); $('mNext').onclick = () => go(1);
  const bar = (n, v) => `<span>${n}</span><i><b style="width:${Math.round(clamp((v - .6) / .9, .08, 1) * 100)}%"></b></i>`; $('mStat').innerHTML = bar('VELOCITÀ', BK.top + .15) + bar('SPINTA', BK.acc) + bar('AGILITÀ', BK.agile) + bar('SALITA', BK.climb - .1) + bar('IMPENNATA', .55 + BK.wh * .5); if (SCHOOL) $('moto').classList.add('hidden'); }
$('oPista').textContent = 'PERCORSO: ' + (SCHOOL ? 'SCUOLA' : 'GIRO EASY'); $('oPista').onclick = () => { setOpt('pista', SCHOOL ? 'g' : 's'); location.reload(); };
if (SCHOOL) { $('ptxt').textContent = 'Scuola di enduro: si parte dalle basi, una cosa per volta. In basso leggi cosa fare. Se sbagli riparti da quel punto.'; $('tag').textContent = $('tag').textContent.replace('PERCORSO ENDURO', 'SCUOLA DI ENDURO'); }
$('oAuto').onclick = () => { O.auto = !O.auto; setOpt('auto', O.auto ? '1' : '0'); labels(); };
$('oGas').onclick = () => { O.gas = O.gas === 'a' ? 'm' : 'a'; setOpt('gas', O.gas); labels(); hud(); };
$('oSens').onclick = () => { O.sens = { s: 'm', m: 'h', h: 's' }[O.sens]; setOpt('sens', O.sens); labels(); };
$('oSnd').onclick = () => { O.snd = !O.snd; setOpt('snd', O.snd ? '1' : '0'); setSound(O.snd); labels(); };
$('oInv').onclick = () => { O.inv = !O.inv; setOpt('inv', O.inv ? '1' : '0'); labels(); };
$('oCam').onclick = () => { O.cam = { c: 'm', m: 'l', l: 'c' }[O.cam]; setOpt('cam', O.cam); labels(); };
function restart() { stI = null; stM = {}; vLast = -1; rec = []; recT = 0; splits = []; if (rivBuilt) rivReset(); S.beers = 0; S.falls = 0; S.conigli = 0; S.bunny = 0; S.spanI = 0; for (const b of tr.beers) { b.got = 0; b.m.visible = true; } for (const f of tr.forks) f.pick = undefined; if (SCHOOL) setTimeout(() => preloadVoice(['v1', 'v2', 'v3', 'v4', 'si', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'fine']), 300); if (SCHOOL) { O.gas = 't'; O.auto = false; $('tip').classList.add('hidden'); } place(); time = 0; state = 'count'; cd = 2.4; $('panel').classList.add('hide'); $('msg').textContent = '3'; }
function finish() { state = 'done'; if (SCHOOL) { setOpt('pista', 'g'); $('tip').classList.add('hidden'); $('pres').textContent = 'SCUOLA FINITA! Adesso il giro vero. Se vuoi una mano, nelle OPZIONI trovi freno automatico, gas automatico, sensibilità e verso dello sterzo, distanza della camera.'; $('go').textContent = 'VAI AL GIRO'; say('fine'); $('go').onclick = () => location.reload(); setTimeout(() => $('panel').classList.remove('hide'), 900); $('msg').textContent = 'PROMOSSO!'; return; }
  const isRec = !best || time < best; if (isRec) { best = time; setOpt('best3', String(time)); try { setOpt('ghost3', JSON.stringify({ p: rec, s: splits })); ghost = rec.slice(); bestSplits = splits.slice(); } catch {} }
  const med = (MED.find(m => time <= m[0]) || [0, ''])[1], nb = S.beers || 0, punti = nb * 100 + (med === 'ORO' ? 1000 : med === 'ARGENTO' ? 600 : med === 'BRONZO' ? 300 : 0) - (S.falls || 0) * 50 - (S.conigli || 0) * 150;
  $('pres').textContent = (rivBuilt ? ['PRIMO!', 'SECONDO', 'TERZO', 'ULTIMO'][RIV.filter(r => r.done).length] + ' · ' : '') + 'AL RIFUGIO IN ' + fmt(time) + ' s' + (isRec ? ' · RECORD!' : '') + (med ? ' · ' + med : '') + ' — 🍺 ' + nb + '/' + tr.beers.length + ' · cadute ' + (S.falls || 0) + (S.conigli ? ' · conigliere ' + S.conigli : '') + ' — ' + Math.max(0, punti) + ' PUNTI'; $('go').textContent = 'UN ALTRO GIRO'; setTimeout(() => $('panel').classList.remove('hide'), 900); $('msg').textContent = 'ARRIVATO!'; }
$('go').onclick = () => { askTilt(); startSound(); restart(); }; $('again').onclick = () => { askTilt(); startSound(); restart(); };
$('opts').onclick = () => { state = 'menu'; $('pres').textContent = ''; $('go').textContent = 'RIPARTI'; $('panel').classList.remove('hide'); };
setSound(O.snd); labels(); place(); hud();
document.addEventListener('visibilitychange', () => { if (document.hidden) setSound(false); else setSound(O.snd); });

let last = performance.now(), slow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const fdt = Math.min(.05, (now - last) / 1000); last = now; if (fdt <= 0) return;
  if (state === 'count') { cd -= fdt; $('msg').textContent = cd > 1.6 ? '3' : cd > .8 ? '2' : cd > 0 ? '1' : 'VIA!'; if (cd <= 0) { state = 'play'; time = 0; } }
  const n = Math.max(1, Math.round(fdt / (1 / 120))); for (let i = 0; i < n; i++) step(fdt / n);
  school(fdt); draw(fdt); hud();
  // telefoni lenti: si abbassa la risoluzione, mai la fluidità
  if (fdt > .03) { if (++slow > 40) { slow = 0; if (pix > 1.25) { pix = Math.max(1.25, pix - .25); resize(); } else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); } else if (pix > 1) { pix = 1; resize(); } } } else slow = Math.max(0, slow - 1);
}
requestAnimationFrame(frame);
window.__next = { renderer, scene, camera, S, tr, O, cam, restart, P, RD, laneOff, ROCKS, TREES, RIV, get state() { return state; }, steer(v) { keyL = v < 0 ? -v : 0; keyR = v > 0 ? v : 0; }, brake(v) { braking = v; }, gas(v) { gasHeld = v > 0; gasCmd = v; }, get time() { return time; } };
