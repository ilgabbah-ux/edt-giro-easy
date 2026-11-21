// Giro Easy · pista vera in 3D · versione parallela, tappa 1: solo la guida (niente ostacoli, punti, classifica)
// La moto si muove davvero nel mondo: piega → gira → va dove punta il muso. La camera la insegue.
import * as T from '../three.module.min.js';
import { GLTFLoader } from '../GLTFLoader.js';
import { DRACOLoader } from '../DRACOLoader.js';
import { DS, KIND, buildTrack, groundY, at, project, roughAt, widthAt, sideAt, kindAt, waterAt } from './pista.js?v=10';
import { startSound, soundUpdate, thud, setSound, whip, splash } from './suono.js?v=9';
import { makeRider } from './pilota.js?v=4';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = 'edt-next-';   // salvataggi separati dal gioco vero
const opt = (k, d) => { try { return localStorage.getItem(K + k) ?? d; } catch { return d; } };
const setOpt = (k, v) => { try { localStorage.setItem(K + k, v); } catch {} };
const O = { snd: opt('snd', '1') === '1', auto: opt('auto', '1') === '1', gas: opt('gas', 'a'), sens: opt('sens', 'm'), inv: opt('inv', '0') === '1', cam: opt('cam', 'm') };

// ---------- scena ----------
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene();
const SKY = 0xbfd6e6;
scene.background = new T.Color(SKY); scene.fog = new T.Fog(0xcfdde4, 90, 430);
const camera = new T.PerspectiveCamera(66, 1, .3, 1400);
scene.add(new T.HemisphereLight(0xdfeeff, 0x4a5a36, 1.15));
const sun = new T.DirectionalLight(0xfff0d0, 1.6); sun.position.set(-.5, 1, .35); scene.add(sun);
let pix = Math.min(2, window.devicePixelRatio || 1);
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(pix); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const tl = new T.TextureLoader();
const tex = (src, rx, ry) => { const t = tl.load(src); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; if (rx) t.repeat.set(rx, ry); t.anisotropy = 4; return t; };

// ---------- pista ----------
const tr = buildTrack();
const P = {};
const TEXF = { trail: 'trail_d', rock: 'mossrock_d', mud: 'mudtrack_d', cobble: 'rockwall_d', forest: 'forestfloor_d' }, TEXN = Object.keys(TEXF);
{ // sentiero: una fila ogni mezzo metro, largo quanto il tratto; ogni tipo di fondo ha la sua foto
  const RS = .5, n = Math.floor(tr.len / RS) + 1, cols = 7, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) { const s = i * RS, w = widthAt(tr, s); for (let c = 0; c < cols; c++) { const d = -w / 2 + w * c / (cols - 1); at(tr, s, d, P); pos.push(P.x, P.y + .02, P.z); uv.push(d / 7, s / 7); } }
  const g = new T.BufferGeometry(); let cur = null, start = 0;
  for (let i = 0; i < n - 1; i++) { const tx = TEXN.indexOf(kindAt(tr, (i + .5) * RS).tex); if (tx !== cur) { if (cur !== null) g.addGroup(start, idx.length - start, cur); cur = tx; start = idx.length; }
    for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; idx.push(a, a + 1, b, a + 1, b + 1, b); } }
  g.addGroup(start, idx.length - start, cur);
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, TEXN.map(k => new T.MeshLambertMaterial({ map: tex(`../img/tex/${TEXF[k]}.webp`), color: k === 'cobble' ? 0xd8d2c8 : 0xffffff }))));
}
// quanto ci si può allontanare di lato senza che il terreno si accavalli all'interno delle curve
const sideLimit = (s, sign) => { const k = tr.k[Math.min(tr.n - 1, Math.round(s / DS))], sd = sideAt(tr, s); return k * sign > .002 ? Math.min(sd, .8 / Math.abs(k)) : sd; };
for (const sign of [-1, 1]) { // terreno ai lati: prato, e sottobosco nel single track e sulla mulattiera
  const VS = 1, n = Math.floor(tr.len / VS) + 1, cols = 8, pos = [], uv = [], idx = [], g = new T.BufferGeometry(); let cur = null, start = 0;
  for (let i = 0; i < n; i++) { const s = i * VS, hw = widthAt(tr, s) / 2, lim = Math.max(hw + 1, sideLimit(s, sign)); for (let c = 0; c < cols; c++) { const u = c / (cols - 1), d = sign * (hw - .3 + (lim - hw + .3) * u * u); at(tr, s, d, P); pos.push(P.x, P.y - (c ? 0 : .04), P.z); uv.push(d / 9, s / 9); } }
  for (let i = 0; i < n - 1; i++) { const kd = tr.kind[Math.min(tr.n - 1, Math.round((i + .5) * VS / DS))], mt = kd === 't' || kd === 'm' ? 1 : 0; if (mt !== cur) { if (cur !== null) g.addGroup(start, idx.length - start, cur); cur = mt; start = idx.length; }
    for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; if (sign > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); } }
  g.addGroup(start, idx.length - start, cur);
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, [new T.MeshLambertMaterial({ map: tex('../img/tex/meadow_d.webp') }), new T.MeshLambertMaterial({ map: tex('../img/tex/forest_d.webp') })]));
}
{ // fondovalle lontano e montagne all'orizzonte
  const base = new T.Mesh(new T.PlaneGeometry(5000, 5000), new T.MeshLambertMaterial({ color: 0x5c7a3c })); base.rotation.x = -Math.PI / 2; base.position.set(0, -12, -500); scene.add(base);
  const pano = tl.load('../img/pano-0.webp'); pano.colorSpace = T.SRGBColorSpace; pano.wrapS = T.MirroredRepeatWrapping; pano.repeat.x = 2;
  const cyl = new T.Mesh(new T.CylinderGeometry(1100, 1100, 1470, 48, 1, true), new T.MeshBasicMaterial({ map: pano, side: T.BackSide, fog: false, depthWrite: false }));
  cyl.position.y = 240; cyl.renderOrder = -1; scene.add(cyl); P.sky = cyl;
}
{ // acqua: il guado (tutta la larghezza) e le pozze nel fango
  const mat = new T.MeshBasicMaterial({ color: 0x6f8f8c, transparent: true, opacity: .72, depthWrite: false });
  for (const wt of tr.water) { const pos = [], idx = []; let r = 0;
    for (let s = wt.s0; s <= wt.s1 + .01; s += .5) { const hw = wt.half || widthAt(tr, s) / 2 + 2.5, e = wt.half ? Math.sqrt(Math.max(.05, Math.sin(Math.PI * (s - wt.s0) / (wt.s1 - wt.s0)))) : 1, c = wt.off || 0;
      at(tr, s, c - hw * e, P); pos.push(P.x, wt.y, P.z); at(tr, s, c + hw * e, P); pos.push(P.x, wt.y, P.z); if (r) { const a = (r - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } r++; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const m = new T.Mesh(g, mat); m.renderOrder = 2; scene.add(m); }
}
{ // macchia: cespugli a ridosso del sentiero (qualcuno ci entra) e rami bassi che sporgono. Niente fettuccia: è enduro nei boschi
  let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const leaf = new T.MeshBasicMaterial({ map: tex('../img/tex/tree_island.webp'), alphaTest: .45, side: T.DoubleSide, color: 0xd9e2cf });
  const g1 = new T.PlaneGeometry(1, 1); { const uv = g1.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, .32 + uv.getY(i) * .48); }   // solo la chioma della foto: col tronco sottile i cespugli sembravano sospesi in aria
  const g2 = g1.clone().rotateY(Math.PI / 2), cross = new T.BufferGeometry();
  cross.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); cross.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2)); cross.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
  const list = []; for (const sp of tr.spans) { const dense = sp.kind === 'b', some = sp.kind === 't' || sp.kind === 'm' || sp.kind === 'd' || sp.kind === 's'; if (!dense && !some) continue;
    for (let s = sp.s0 + 1; s < sp.s1 - 1; s += dense ? 1.7 : 5) for (const sg of [-1, 1]) { if (!dense && rnd() < .5) continue; const hw = widthAt(tr, s) / 2; const out = dense ? .55 + rnd() * rnd() * 4 : .3 + rnd() * 3; list.push([s + rnd(), sg * (hw + out), dense ? .55 + rnd() * .35 + Math.max(0, out - 1.2) * .6 : 1.1 + rnd() * 1.2]); } }   // bassi a ridosso del sentiero, più alti dietro: il sentiero e la moto devono restare visibili
  const im = new T.InstancedMesh(cross, leaf, list.length), m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), e = new T.Euler();
  list.forEach(([s, d, h], i) => { at(tr, s, d, P); q.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(h * 1.25, h, h * 1.25); ps.set(P.x, groundY(tr, s, d, true) + h * .4, P.z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im);
  const bm = new T.InstancedMesh(new T.PlaneGeometry(1, 1), leaf, tr.branches.length * 2); let k = 0;
  for (const br of tr.branches) { const hw = widthAt(tr, br.s) / 2, d0 = br.side * (hw + .8), d1 = -br.side * br.reach, len = Math.abs(d1 - d0), mid = (d0 + d1) / 2;
    for (let r = 0; r < 2; r++) { at(tr, br.s + r * .5, mid, P); e.set(-Math.PI / 2 + (r ? .5 : -.35), -P.h, br.side * .16, 'YXZ'); q.setFromEuler(e); sc.set(len * 1.15, 2.4, 1); ps.set(P.x, P.y + 1.75 + r * .25, P.z); m.compose(ps, q, sc); bm.setMatrixAt(k++, m); } }
  scene.add(bm);
}
{ // sassi: tanti nella pietraia (anche sul sentiero, piccoli), muretti a secco lungo la mulattiera, qualcuno nel guado
  let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, list = [];
  for (const sp of tr.spans) {
    if (sp.kind === 'p') for (let s = sp.s0 + 2; s < sp.s1 - 2; s += .9) { const hw = widthAt(tr, s) / 2, edge = rnd() < .45; const d = edge ? (rnd() < .5 ? -1 : 1) * (hw + rnd() * 5) : (rnd() - .5) * hw * 1.9; list.push([s, d, edge ? .35 + rnd() * .9 : .07 + rnd() * .13, 0]); }
    if (sp.kind === 'm') for (let s = sp.s0 + 1; s < sp.s1 - 1; s += .75) for (const sg of [-1, 1]) list.push([s, sg * (widthAt(tr, s) / 2 + .25 + rnd() * .2), .3 + rnd() * .22, sg > 0 ? .25 : 0]);
    if (sp.kind === 'g') for (let s = sp.s0; s < sp.s1; s += 1.6) for (const sg of [-1, 1]) list.push([s, sg * (widthAt(tr, s) / 2 + .5 + rnd() * 3), .3 + rnd() * .5, 0]);
  }
  const geo = new T.DodecahedronGeometry(1, 0), im = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ map: tex('../img/tex/mossrock_d.webp'), color: 0xcfcac2 }), list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), ps = new T.Vector3();
  list.forEach(([s, d, r, up], i) => { at(tr, s, d, P); e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); sc.set(r * (.8 + rnd() * .5), r * (.55 + rnd() * .3), r * (.8 + rnd() * .5)); ps.set(P.x, P.y + r * .2 + up, P.z); m.compose(ps, q, sc); im.setMatrixAt(i, m); }); scene.add(im);
}
{ // alberi: due piani incrociati con la foto dell'abete. Nel single track sono fitti e a un passo dal sentiero
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [file, every] of [['fir_a', 4], ['fir_b', 6], ['fir_gold', 11], ['fir_c', 9]]) {
    const g1 = new T.PlaneGeometry(1, 2), g2 = g1.clone().rotateY(Math.PI / 2), g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3));
    g.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2));
    g.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
    const cap = Math.floor(tr.len / every) * 6, im = new T.InstancedMesh(g, new T.MeshBasicMaterial({ map: tex(`../img/tex/${file}.webp`), alphaTest: .5, side: T.DoubleSide, color: 0xe6e6e6 }), cap), m = new T.Matrix4(), qt = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    let q = 0; for (let s0 = 0; s0 < tr.len; s0 += every) { const kd = tr.kind[Math.min(tr.n - 1, Math.round(s0 / DS))], reps = kd === 't' ? 3 : kd === 'm' ? 2 : kd === 'p' || kd === 'g' ? 0 : 1;
      for (let r = 0; r < reps; r++) for (const sg of [-1, 1]) { if (q >= cap) break; const s = s0 + rnd() * every, hw = widthAt(tr, s) / 2, lim = Math.max(hw + 1.2, sideLimit(s, sg) - 1); const near = kd === 't' ? 1.1 : kd === 'm' ? 1.6 : 2.5; const d = sg * Math.min(lim, hw + near + rnd() * rnd() * (kd === 't' ? 11 : 20)); at(tr, s, d, P);
        const hgt = 7 + rnd() * 7; qt.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(hgt * .5, hgt * .5, hgt * .5); ps.set(P.x, P.y + hgt * .5 - .3, P.z); m.compose(ps, qt, sc); im.setMatrixAt(q++, m); } }
    im.count = q; scene.add(im);
  }
}
{ // partenza, arrivo e un cartello all'inizio di ogni tratto
  const board = (label, col, w, h) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 512, 96); x.fillStyle = '#111'; x.font = 'bold 60px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 256, 52);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, side: T.DoubleSide })); };
  const gate = (s, label) => { at(tr, s, 0, P); const w = widthAt(tr, s), grp = new T.Group(); grp.position.set(P.x, P.y, P.z); grp.rotation.y = -P.h;
    const mat = new T.MeshLambertMaterial({ color: 0x2a2a2a }); for (const sx of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.14, .14, 5.2, 8), mat); p.position.set(sx * (w / 2 + .6), 2.6, 0); grp.add(p); }
    const b = board(label, '#ffd400', w + 1.6, 1.5); b.position.y = 4.6; grp.add(b); scene.add(grp); };
  gate(14, 'ENDURO DRINKING TEAM'); gate(tr.len - 14, 'RIFUGIO · ARRIVO');
  for (const sp of tr.spans.slice(1)) { const s = sp.s0 - 6; at(tr, s, widthAt(tr, s) / 2 + 1.2, P); const b = board(KIND[sp.kind].name.toUpperCase(), '#f4f1e8', 2.6, .5); b.position.set(P.x, P.y + 1.5, P.z); b.rotation.y = -P.h; scene.add(b);
    const pole = new T.Mesh(new T.CylinderGeometry(.04, .04, 1.4, 5), new T.MeshLambertMaterial({ color: 0x5a4632 })); pole.position.set(P.x, P.y + .7, P.z); scene.add(pole); }
}

// ---------- moto e pilota ----------
const bike = new T.Group(), leanG = new T.Group(), pitchG = new T.Group(); bike.add(leanG); leanG.add(pitchG); scene.add(bike);
const blob = new T.Mesh(new T.CircleGeometry(.9, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .32, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.scale.set(.42, 1.25, 1); scene.add(blob);
let wheelF = null, wheelR = null, steerG = null;
{ const gltf = new GLTFLoader(), dl = new DRACOLoader(); dl.setDecoderPath('../draco/'); gltf.setDRACOLoader(dl);
  gltf.load('../img/models/bike_fakedomi.glb?t=1', g => { const get = n => g.scene.getObjectByName(n), body = get('bike_body'), wf = get('wheel_f'), wr = get('wheel_r');
    steerG = new T.Group(); wheelF = new T.Group(); wheelR = new T.Group(); wheelF.position.copy(wf.position); wheelR.position.copy(wr.position); P.wfY = wf.position.y; P.wrY = wr.position.y; wf.position.set(0, 0, 0); wr.position.set(0, 0, 0);
    wheelF.add(wf); wheelR.add(wr); steerG.add(wheelF); pitchG.add(body, steerG, wheelR); });
  gltf.load('../img/models/rider_poses.glb?t=1', g => { const o = g.scene.getObjectByName('rider_sit'), mat = o.material.clone(); mat.color.set(0xf0c81e);
    const geo = o.geometry.clone(); geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(), o.quaternion, o.scale));
    P.rider = makeRider(geo, mat); P.rider.root.position.set(0, 1.16, .27); pitchG.add(P.rider.root);
    gltf.load('../img/models/helmet.glb?t=1', h => { let src = null; h.scene.traverse(c => { if (c.isMesh && !src) src = c; }); const hg = src.geometry.clone(); hg.applyMatrix4(src.matrixWorld); hg.rotateY(-Math.PI / 2); hg.computeBoundingBox();
      const bb = hg.boundingBox, sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), k = .3 / sz.x; hg.translate(-c.x, -c.y, -c.z); hg.scale(k, k, k);
      P.helm = new T.Mesh(hg, src.material); pitchG.add(P.helm); }); });
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
  const wet = S.wet > .02, rate = state === 'play' && S.air <= 0 ? (wet ? S.v * 9 : Math.abs(S.slip) * 110 + (S.gasOn && S.v < 9 ? 45 : 0) + S.off * S.v * 2.5 + (S.gasOn ? S.v * (S.kd.name === 'fango' ? 1.6 : .35) + Math.max(0, S.grade) * 260 : 0)) : 0; dAcc += rate * dt;
  { const c = dMat.uniforms.uC.value, tx = S.kd.tex; if (wet) c.lerp(_cW, .2); else c.lerp(tx === 'mud' ? _cM : tx === 'rock' || tx === 'cobble' ? _cR : _cD, .08); }
  const bx = Math.sin(S.psi + S.slip), bz = -Math.cos(S.psi + S.slip);
  while (dAcc >= 1) { dAcc--; const i = dNext; dNext = (dNext + 1) % DN; dAge[i] = 0; dPos[i * 3] = S.x - bx * .75 + (Math.random() - .5) * .3; dPos[i * 3 + 1] = S.y + .15; dPos[i * 3 + 2] = S.z - bz * .75 + (Math.random() - .5) * .3;
    const k = 1.5 + Math.random() * 2.5; dVel[i * 3] = -bx * k + (Math.random() - .5) * 2 - Math.cos(S.psi) * S.slip * 3; dVel[i * 3 + 1] = (1 + Math.random() * 1.8) * (S.wet > .02 ? 2.2 : 1); dVel[i * 3 + 2] = -bz * k + (Math.random() - .5) * 2 - Math.sin(S.psi) * S.slip * 3; }
  for (let i = 0; i < DN; i++) if (dAge[i] < 1) { dAge[i] = Math.min(1, dAge[i] + dt * 1.5); dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt; dVel[i * 3 + 1] -= 2.5 * dt; }
  dGeo.attributes.position.needsUpdate = true; dGeo.attributes.aAge.needsUpdate = true; dMat.uniforms.uH.value = renderer.domElement.height;
}

// ---------- visiera: schizzi d'acqua e di fango, rami in faccia ----------
const lens = $('lens'), lx = lens.getContext('2d'), drops = []; let lensDirty = false;
function lensSize() { lens.width = Math.round(innerWidth / 2); lens.height = Math.round(innerHeight / 2); } addEventListener('resize', lensSize); lensSize();
function splat(kind, n, side = 0) { const W2 = lens.width, H2 = lens.height;
  for (let i = 0; i < n && drops.length < 90; i++) { if (kind === 'leaf') { const fromL = side < 0; drops.push({ k: 2, x: fromL ? -40 : W2 + 40, y: H2 * (.15 + Math.random() * .6), vx: (fromL ? 1 : -1) * W2 * (2.6 + Math.random() * 1.6), vy: (Math.random() - .5) * H2 * .5, r: H2 * (.1 + Math.random() * .14), a: .92, life: .55, rot: Math.random() * 3 }); }
    else { const big = Math.random() < .3; drops.push({ k: kind === 'mud' ? 1 : 0, x: Math.random() * W2, y: H2 * (.12 + Math.random() * .85), vx: 0, vy: H2 * (.02 + Math.random() * .06), r: H2 * (big ? .07 + Math.random() * .1 : .015 + Math.random() * .03), a: kind === 'mud' ? .92 : .8, life: 1.8 + Math.random() * 2.2, rot: Math.random() * 3 }); } } }
function lensDraw(dt) { if (!drops.length) { if (lensDirty) { lx.clearRect(0, 0, lens.width, lens.height); lensDirty = false; } return; }
  lx.clearRect(0, 0, lens.width, lens.height); lensDirty = true; const wind = 1 + S.v / 12;
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.life -= dt * (d.k === 2 ? 1 : wind * .5); if (d.life <= 0) { drops.splice(i, 1); continue; } d.x += d.vx * dt; d.y += d.vy * dt * (d.k === 2 ? 1 : wind);
    const al = d.a * Math.min(1, d.life * (d.k === 2 ? 6 : 1.4)); lx.save(); lx.translate(d.x, d.y); lx.rotate(d.rot);
    if (d.k === 2) { lx.fillStyle = `rgba(46,84,34,${al})`; lx.beginPath(); lx.ellipse(0, 0, d.r * 2.6, d.r * .55, 0, 0, 7); lx.fill(); lx.fillStyle = `rgba(88,128,52,${al * .8})`; lx.beginPath(); lx.ellipse(d.r * .4, -d.r * .2, d.r * 1.7, d.r * .3, .3, 0, 7); lx.fill(); }
    else { const c = d.k ? '66,46,28' : '104,96,78'; const gr = lx.createRadialGradient(0, 0, d.r * .15, 0, 0, d.r); gr.addColorStop(0, `rgba(${c},${al})`); gr.addColorStop(.7, `rgba(${c},${al * .75})`); gr.addColorStop(1, `rgba(${c},0)`); lx.fillStyle = gr; lx.beginPath(); lx.ellipse(0, 0, d.r, d.r * (.75 + (d.rot % 1) * .5), 0, 0, 7); lx.fill();
      if (d.r > lens.height * .04) { lx.fillStyle = `rgba(${c},${al * .6})`; lx.fillRect(-d.r * .12, 0, d.r * .24, d.r * (1.2 + (3 - d.life) * .6)); } }   // la goccia grossa cola
    lx.restore(); } }

// ---------- comandi ----------
let steerIn = 0, tiltSteer = 0, tiltSeen = 0, tiltA0 = null, keyL = 0, keyR = 0, touchSteer = 0, braking = false, gasHeld = false;
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
addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keyL = 1; if (e.key === 'ArrowRight' || e.key === 'd') keyR = 1; if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 's') braking = true; if (e.key === 'ArrowUp' || e.key === 'w') gasHeld = true; if (e.key === 'r') restart(); });
addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a') keyL = 0; if (e.key === 'ArrowRight' || e.key === 'd') keyR = 0; if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 's') braking = false; if (e.key === 'ArrowUp' || e.key === 'w') gasHeld = false; });
// senza sensore (o da computer col mouse): metà schermo sinistra/destra
const touches = new Map();
canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, e.clientX); upd(); }); canvas.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) { touches.set(e.pointerId, e.clientX); upd(); } });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, e => { touches.delete(e.pointerId); upd(); });
function upd() { let v = 0; for (const x of touches.values()) v += x < innerWidth / 2 ? -1 : 1; touchSteer = clamp(v, -1, 1); }
const hold = (el, fn) => { el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); fn(true); }); for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, () => fn(false)); };
hold($('brake'), v => braking = v); hold($('gasb'), v => gasHeld = v);

// ---------- fisica ----------
const G = 9.81, VMAX = 30;   // 108 km/h
const S = { x: 0, z: 0, y: 0, psi: 0, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: 0, s: 0, d: 0, off: 0, hit: 0, pitch: 0, grade: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0, by: 0, bvy: 0, comp: 0, cF: 0, cR: 0, rough: 0, grip: 1.1, wet: 0, kd: KIND.v };
let state = 'menu', t0 = 0, time = 0, cd = 0, best = parseFloat(opt('best', '0')) || 0, wrong = 0;
function place() { const s0 = 20; at(tr, s0, 0, P); Object.assign(S, { x: P.x, z: P.z, y: P.y, psi: P.h, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: Math.round(s0 / DS), s: s0, d: 0, off: 0, hit: 0, pitch: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0, by: P.y, bvy: 0, comp: 0, cF: 0, cR: 0, rough: 0, grip: 1.1, wet: 0 }); cam.h = P.h; cam.init = false; tiltA0 = null; tiltSteer = 0; }
// CADUTA: la moto va giù, striscia, e dopo un paio di secondi si riparte da fermi in mezzo al sentiero. Il tempo continua a correre.
function crash(side) { if (S.fall > 0 || S.safe > 0 || state !== 'play') return; S.fall = 2.3; S.fallSide = side || 1; S.falls = (S.falls || 0) + 1; S.hit = 1; S.air = 0; thud(1); $('msg').textContent = 'CADUTO!'; }
function getUp() { at(tr, S.s, 0, P); Object.assign(S, { x: P.x, z: P.z, psi: P.h, v: 0, lean: 0, leanV: 0, slip: 0, vy: 0, air: 0, fall: 0, safe: 1.5, overT: 0, brkAmt: 0 }); steerIn = 0; $('msg').textContent = ''; }
function step(dt) {
  if (S.fall > 0) { S.fall -= dt; if (S.fall <= 0) getUp(); } S.safe = Math.max(0, (S.safe || 0) - dt); const down = S.fall > 0;
  const pr = project(tr, S.x, S.z, S.i); S.i = pr.i; S.s = pr.s; S.d = pr.d; S.grade = pr.g;
  const HW = widthAt(tr, S.s) / 2, KD = kindAt(tr, S.s); S.kd = KD;
  const onTrack = Math.abs(S.d) <= HW + .2; S.off += ((onTrack ? 0 : clamp((Math.abs(S.d) - HW - .2) / 1.6, .12, 1)) - S.off) * Math.min(1, dt * 6);
  S.grip += (KD.grip - S.grip) * Math.min(1, dt * 5); S.wet = S.air > 0 ? 0 : waterAt(tr, S.s, S.d, groundY(tr, S.s, S.d, true));   // aderenza del fondo e profondità dell'acqua sotto le ruote
  // sterzo: il comando chiede una piega, la moto ci arriva con il suo peso (molla smorzata)
  const key = keyR - keyL, raw = performance.now() - tiltSeen < 700 && Math.abs(tiltSteer) > .001 ? tiltSteer : (key || touchSteer);
  steerIn += (clamp(raw * (O.inv ? -1 : 1), -1, 1) - steerIn) * Math.min(1, dt * (key ? 7 : 14));
  const leanMax = .82 - S.off * .2, leanT = state === 'play' ? steerIn * leanMax * clamp(S.v / 6, .25, 1) : 0;
  if (down) { S.lean += (S.fallSide * 1.45 - S.lean) * Math.min(1, dt * 8); S.leanV = 0; } else { S.leanV += ((leanT - S.lean) * 62 - S.leanV * 11.5) * dt; S.lean += S.leanV * dt; }
  // la piega fa girare: velocità di imbardata = g·tan(piega)/v, fino al limite di aderenza del fondo
  if (state === 'play') {
    if (S.wet > .03 && S.v > 4) { if (!S.inWater) { S.inWater = 1; splash(Math.min(1, S.v / 18)); splat('water', Math.round(8 + S.v * 1.6)); } S.splA = (S.splA || 0) + S.v * S.wet * 14 * dt; while (S.splA >= 1) { S.splA--; splat('water', 1); } } else if (S.wet < .01) S.inWater = 0;   // l'acqua ti arriva in faccia: più forte entri, meno vedi
    if (KD.name === 'fango' && S.off < .5 && S.v > 6) { S.mudA = (S.mudA || 0) + (Math.abs(S.slip) * 9 + (S.gasOn ? .7 : .2)) * dt; while (S.mudA >= 1) { S.mudA--; splat('mud', 1); } }
    for (const br of tr.branches) if (br.s > S.sPrev && br.s <= S.s) { const hw = widthAt(tr, br.s) / 2; if (S.d * br.side > -br.reach - .25) { const deep = clamp((S.d * br.side + br.reach + .25) / (hw + br.reach), .2, 1); splat('leaf', Math.round(2 + deep * 4), br.side); whip(); S.v *= 1 - .07 * deep; S.hit = Math.max(S.hit, .25 * deep); S.psi -= br.side * .03 * deep; } }   // ramo in faccia: non vedi, perdi un po' di velocità, la moto scarta
  }
  S.sPrev = S.s;
  const mu = (S.grip - S.off * .3 - Math.min(.25, S.wet * .8)), vEff = Math.max(S.v, 4.5);
  let om = G * Math.tan(S.lean) / vEff; const omMax = mu * G / vEff, over = Math.max(0, Math.abs(om) - omMax);
  if (over > 0) om = Math.sign(om) * (omMax + over * .25);   // oltre il limite la moto allarga
  // troppo piegato per il fondo che c'è (fango, pietre bagnate, erba): la gomma tiene mezzo secondo, poi la moto si stende
  { const ask = Math.tan(Math.abs(S.lean)) / Math.max(.3, mu + S.off * .15); S.overT = ask > 1.22 && S.v > 7 && S.air <= 0 && !down ? (S.overT || 0) + dt * (ask > 1.45 ? 1.6 : 1) : Math.max(0, (S.overT || 0) - dt * 2); if (S.overT > .6) crash(Math.sign(S.lean)); }
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
  const gasOn = state === 'play' && !brk && !down && (O.gas === 'a' || gasHeld);
  const powerSlide = gasOn ? Math.sign(S.lean) * Math.max(0, Math.abs(S.lean) - .5) * .7 * clamp(1.3 - S.v / 14, 0, 1) : 0;   // in uscita, col gas e piegato, il posteriore scappa un po'
  const slipT = brakeSlide + powerSlide + (over > 0 ? Math.sign(om) * Math.min(.4, over * .9) : 0);
  S.slip += (slipT - S.slip) * Math.min(1, dt * (Math.abs(slipT) > Math.abs(S.slip) ? 6.5 : 3.2));
  om += S.slip * 1.7 * clamp(S.v / 11, .3, 1);   // di traverso la moto chiude la curva: è così che si imposta
  S.psi += om * dt;
  const gas = gasOn ? 1 : 0, vTop = VMAX * (1 - S.off * .5);
  let acc = gas * 9.5 * clamp(1.12 - S.v / vTop, 0, 1) - (brk ? 4.5 + 8 * S.brkAmt : 0) - G * Math.sin(Math.atan(S.grade)) * (S.grade > 0 ? 2.3 : 1.25) - .0035 * S.v * S.v * (1 + S.off * 8) - (gas ? 0 : .8) - Math.abs(Math.sin(S.lean)) * 1.1 - over * 3.5 - Math.abs(S.slip) * 2.2 - KD.drag * (1 - S.off) * clamp(S.v / 8, 0, 1.5) - S.wet * S.v * S.v * .055;   // fango e pietre frenano, l'acqua tanto più quanto è fonda e vai forte
  acc -= G * clamp(Math.tan(S.pitch) - S.grade, 0, .5) * 1.2 * (S.air > 0 ? 0 : 1);   // gradoni e gobbe in salita mangiano velocità: se molli il gas ti fermi
  if (down) acc = -9;
  if (state !== 'play') acc = -S.v * 3;
  S.v = Math.max(0, S.v + acc * dt); S.brk = brk; S.gasOn = gas; S.over = over;
  // pilota: in piedi sul dritto, seduto in curva con la gamba interna fuori
  const straight = (Math.abs(steerIn) < (S.stand > .5 ? .24 : .12) && Math.abs(kAhead) < .008 && !brk && S.v > 8 || Math.abs(S.grade) > .1 && S.v > 4) && state === 'play';   // in salita e in discesa ripida si sta in piedi   // con un po' di margine: non si alza e siede di continuo
  S.stand += ((straight ? 1 : 0) - S.stand) * Math.min(1, dt * (straight ? 1.6 : 4));
  const dabOn = Math.abs(S.dab) > .3, dabT = Math.sign(S.lean + S.slip) * clamp((Math.abs(S.lean) - (dabOn ? .2 : .34)) / .14 + Math.abs(S.slip) * 3.5, 0, 1) * (S.v > 3 ? 1 : 0);   // esce in piega decisa e resta fuori finché non raddrizzi
  S.dab += (dabT - S.dab) * Math.min(1, dt * 4.5);
  S.fwd += ((brk ? .16 * S.brkAmt : gas && S.v < VMAX * .7 ? -.14 : -.04) - clamp(S.grade, -.22, .22) * 1.3 - S.fwd) * Math.min(1, dt * 5);   // in salita il peso va avanti, in discesa indietro
  S.x += Math.sin(S.psi) * S.v * dt; S.z -= Math.cos(S.psi) * S.v * dt;
  // bordi: dopo qualche metro di prato c'è la scarpata, si rimbalza dentro perdendo velocità
  const wall = KD.name === 'mulattiera', lim = wall ? HW - .12 : Math.max(HW + .6, Math.min(sideLimit(S.s, Math.sign(S.d) || 1) - 1.5, HW + (KD.name === 'single track' ? 4 : 9)));   // sulla mulattiera il muretto è il bordo
  if (Math.abs(S.d) > lim) { const sg = Math.sign(S.d), push = Math.abs(S.d) - lim; S.x -= Math.cos(pr.h) * sg * push; S.z -= Math.sin(pr.h) * sg * push;
    let rel = S.psi - pr.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (rel * sg > 0) { const imp = Math.abs(Math.sin(rel)); if (!S.wall && imp > .5 && S.v > 9) crash(-sg); else if (!S.wall && imp > .3) { S.v *= 1 - imp * .3; S.hit = Math.max(S.hit, imp * .8); thud(imp * .6); }   // botta solo se ci arrivi storto
      S.psi -= rel * Math.min(1, dt * 9); S.v = Math.max(0, S.v - S.v * imp * 2.2 * dt - 1.5 * dt); S.lean *= 1 - Math.min(1, dt * 4); }   // poi la moto si raddrizza lungo il bordo e striscia, senza fermarsi
    S.wall = .15; } else S.wall = Math.max(0, (S.wall || 0) - dt);
  // altezza: le ruote seguono il fondo (profilo morbido), sui dossi presi forte la moto si stacca
  const gy = groundY(tr, S.s, S.d, true); S.rough = Math.abs(S.d) < HW + 1 ? roughAt(tr, S.s) : .02 * S.off;
  if (S.air <= 0) { const vyG = (gy - S.y) / dt; if ((vyG - S.vy) / dt < -G * 1.7 && S.v > 5 && S.vy > 2.5) { S.air = 1; S.airT = 0; } else { S.vy = vyG; S.y = gy; } }
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
  if (state === 'play') { time += dt; if (S.s >= tr.len - 14) finish(); }
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
  cam.roll += (-S.lean * .2 - cam.roll) * Math.min(1, dt * 5); camera.rotateZ(cam.roll);
  const fovT = (portrait ? 72 : 58) + sp * sp * 24; cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3); if (Math.abs(camera.fov - cam.fov) > .05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (cam.dbg) { const a = S.psi + cam.dbg; camera.position.set(S.x + Math.sin(a) * 4.4, S.y + 1.7, S.z - Math.cos(a) * 4.4); camera.lookAt(S.x, S.y + .95, S.z); }   // solo per le prove: vista da davanti
  P.sky.position.x = camera.position.x; P.sky.position.z = camera.position.z;
}
function draw(dt) {
  { const st = clamp(S.stand - Math.max(0, S.comp) * 2.5 + ((S.airT || 0) > .12 && S.air > 0 ? .6 : 0) + S.rough * 6, 0, 1); S.standV = (S.standV || 0) + (st - (S.standV || 0)) * Math.min(1, dt * 7); }   // il pilota si alza e si abbassa con calma, senza scatti
  const leanVis = clamp(S.lean * 1.12 + S.slip * .35, -1, 1) + (S.fall > 0 ? clamp(S.lean, -1.45, 1.45) * .3 : 0);   // la moto si butta giù più del pilota
  bike.position.set(S.x, S.y, S.z); bike.rotation.y = -(S.psi + S.slip); leanG.rotation.z = -leanVis; pitchG.rotation.x = S.pitch + (S.air > 0 ? clamp(-S.vy * .03, -.25, .3) : 0) - (S.cF - S.cR) / 1.45; pitchG.position.y = -(S.cF + S.cR) / 2 + (S.y - groundY(tr, S.s, S.d, true)) * 0;
  if (wheelF) { const r = S.v * dt / .4; wheelF.rotation.x -= r; wheelR.rotation.x -= S.brk && Math.abs(S.slip) > .12 ? r * .15 : r; steerG.rotation.y = clamp(S.slip * .9 - S.lean * .1, -.5, .5); wheelF.position.y = P.wfY + S.cF; wheelR.position.y = P.wrY + S.cR; }   // di traverso: ruota dietro quasi bloccata e controsterzo
  if (P.rider) { const neck = P.rider.pose({ fwd: S.fwd, side: leanVis * .5, stand: S.standV, dab: S.dab, gas: S.gasOn, brake: S.brkAmt, vib: 0 });
    if (P.helm) { pitchG.worldToLocal(neck); P.helm.position.set(neck.x, neck.y + .19, neck.z - .02); P.helm.rotation.set(S.fwd * .3, 0, leanVis * .35); } }
  lensDraw(dt); dust(dt); soundUpdate(dt, { wet: S.wet, surf: S.kd.tex, sp: S.v / VMAX * 2, gas: S.gasOn, brk: S.brk ? S.brkAmt : 0, slip: S.slip, air: S.air > 0, off: S.off, rough: S.rough, play: state === 'play' });
  blob.position.set(S.x, groundY(tr, S.s, S.d, true) + .05, S.z); blob.rotation.z = -S.psi; blob.material.opacity = S.air > 0 ? .16 : .32;
  camUpdate(dt); if (!window.__noRender) renderer.render(scene, camera);
}

// ---------- gioco ----------
const fmt = t => t.toFixed(1).replace('.', ',');
function hud() { $('spd').firstChild.nodeValue = Math.round(S.v * 3.6); $('tim').firstChild.nodeValue = fmt(time); $('bar').firstElementChild.style.width = clamp(S.s / (tr.len - 14) * 100, 0, 100) + '%';
  $('best').textContent = best ? 'RECORD ' + fmt(best) + ' s' : ''; $('gasb').classList.toggle('hidden', O.gas === 'a');
  if (state === 'play') $('msg').textContent = wrong > .8 ? 'GIRATI!' : time < .9 ? 'VIA!' : ''; }
function labels() { $('oAuto').textContent = 'FRENO AUTO: ' + (O.auto ? 'SÌ' : 'NO'); $('oGas').textContent = 'GAS: ' + (O.gas === 'a' ? 'AUTOMATICO' : 'COL TASTO'); $('oSens').textContent = 'STERZO: ' + ({ s: 'MORBIDO', m: 'MEDIO', h: 'RAPIDO' }[O.sens]); $('oInv').textContent = 'VERSO STERZO: ' + (O.inv ? 'INVERTITO' : 'NORMALE'); $('oSnd').textContent = 'SUONO: ' + (O.snd ? 'SÌ' : 'NO'); $('oCam').textContent = 'CAMERA: ' + ({ c: 'VICINA', m: 'MEDIA', l: 'LONTANA' }[O.cam]); }
$('oAuto').onclick = () => { O.auto = !O.auto; setOpt('auto', O.auto ? '1' : '0'); labels(); };
$('oGas').onclick = () => { O.gas = O.gas === 'a' ? 'm' : 'a'; setOpt('gas', O.gas); labels(); hud(); };
$('oSens').onclick = () => { O.sens = { s: 'm', m: 'h', h: 's' }[O.sens]; setOpt('sens', O.sens); labels(); };
$('oSnd').onclick = () => { O.snd = !O.snd; setOpt('snd', O.snd ? '1' : '0'); setSound(O.snd); labels(); };
$('oInv').onclick = () => { O.inv = !O.inv; setOpt('inv', O.inv ? '1' : '0'); labels(); };
$('oCam').onclick = () => { O.cam = { c: 'm', m: 'l', l: 'c' }[O.cam]; setOpt('cam', O.cam); labels(); };
function restart() { place(); time = 0; state = 'count'; cd = 2.4; $('panel').classList.add('hide'); $('msg').textContent = '3'; }
function finish() { state = 'done'; const rec = !best || time < best; if (rec) { best = time; setOpt('best', String(time)); }
  $('pres').textContent = 'AL RIFUGIO IN ' + fmt(time) + ' s' + (rec ? ' · RECORD!' : ''); $('go').textContent = 'UN ALTRO GIRO'; setTimeout(() => $('panel').classList.remove('hide'), 900); $('msg').textContent = 'ARRIVATO!'; }
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
  draw(fdt); hud();
  // telefoni lenti: si abbassa la risoluzione, mai la fluidità
  if (fdt > .03) { if (++slow > 40 && pix > 1) { pix = Math.max(1, pix - .25); slow = 0; resize(); } } else slow = Math.max(0, slow - 1);
}
requestAnimationFrame(frame);
window.__next = { S, tr, O, cam, restart, get state() { return state; }, steer(v) { keyL = v < 0 ? -v : 0; keyR = v > 0 ? v : 0; }, brake(v) { braking = v; }, get time() { return time; } };
