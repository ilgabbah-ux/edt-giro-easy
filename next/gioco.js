// Giro Easy · pista vera in 3D · versione parallela, tappa 1: solo la guida (niente ostacoli, punti, classifica)
// La moto si muove davvero nel mondo: piega → gira → va dove punta il muso. La camera la insegue.
import * as T from '../three.module.min.js';
import { GLTFLoader } from '../GLTFLoader.js';
import { DRACOLoader } from '../DRACOLoader.js';
import { W, DS, SIDE, buildTrack, groundY, at, project } from './pista.js?v=1';
import { makeRider } from './pilota.js?v=2';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = 'edt-next-';   // salvataggi separati dal gioco vero
const opt = (k, d) => { try { return localStorage.getItem(K + k) ?? d; } catch { return d; } };
const setOpt = (k, v) => { try { localStorage.setItem(K + k, v); } catch {} };
const O = { auto: opt('auto', '1') === '1', gas: opt('gas', 'a'), sens: opt('sens', 'm'), inv: opt('inv', '0') === '1', cam: opt('cam', 'm') };

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
{ // sentiero
  const n = tr.n, cols = 5, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) for (let c = 0; c < cols; c++) { const d = -W / 2 + W * c / (cols - 1); at(tr, i * DS, d, P); pos.push(P.x, P.y + .02, P.z); uv.push(c / (cols - 1), i * DS / 7); }
  for (let i = 0; i < n - 1; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: tex('../img/tex/trail_d.webp') })));
}
// quanto ci si può allontanare di lato senza che il terreno si accavalli all'interno delle curve
const sideLimit = (s, sign) => { const k = tr.k[Math.min(tr.n - 1, Math.round(s / DS))]; return k * sign > .002 ? Math.min(SIDE, .8 / Math.abs(k)) : SIDE; };
for (const sign of [-1, 1]) { // prati ai lati
  const n = tr.n, cols = 7, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) { const lim = sideLimit(i * DS, sign); for (let c = 0; c < cols; c++) { const u = c / (cols - 1), d = sign * (W / 2 + (lim - W / 2) * u * u); at(tr, i * DS, d, P); pos.push(P.x, P.y, P.z); uv.push(d / 9, i * DS / 9); } }
  for (let i = 0; i < n - 1; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + cols; if (sign > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: tex('../img/tex/meadow_d.webp') })));
}
{ // fondovalle lontano e montagne all'orizzonte
  const base = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshLambertMaterial({ color: 0x5c7a3c })); base.rotation.x = -Math.PI / 2; base.position.set(300, -9, -280); scene.add(base);
  const pano = tl.load('../img/pano-0.webp'); pano.colorSpace = T.SRGBColorSpace; pano.wrapS = T.MirroredRepeatWrapping; pano.repeat.x = 2;
  const cyl = new T.Mesh(new T.CylinderGeometry(1100, 1100, 1470, 48, 1, true), new T.MeshBasicMaterial({ map: pano, side: T.BackSide, fog: false, depthWrite: false }));
  cyl.position.y = 240; cyl.renderOrder = -1; scene.add(cyl); P.sky = cyl;
}
{ // paletti e fettuccia ai bordi
  const n = Math.floor(tr.len / 8), post = new T.InstancedMesh(new T.CylinderGeometry(.045, .045, 1.1, 5), new T.MeshLambertMaterial({ color: 0xf2f2f2 }), n * 2), m = new T.Matrix4();
  let q = 0; for (let i = 0; i < n; i++) for (const sg of [-1, 1]) { at(tr, i * 8, sg * (W / 2 + .35), P); m.makeTranslation(P.x, P.y + .55, P.z); post.setMatrixAt(q++, m); }
  scene.add(post);
  for (const sg of [-1, 1]) { const pos = [], uv = [], idx = []; for (let i = 0; i < tr.n; i++) { at(tr, i * DS, sg * (W / 2 + .35), P); pos.push(P.x, P.y + .92, P.z, P.x, P.y + 1.02, P.z); uv.push(i * DS / .8, 0, i * DS / .8, 1); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 4; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 4); x.fillStyle = '#d6332b'; x.fillRect(0, 0, 8, 4);
    const t = new T.CanvasTexture(cv); t.wrapS = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter;
    scene.add(new T.Mesh(g, new T.MeshBasicMaterial({ map: t, side: T.DoubleSide }))); }
}
{ // alberi: due piani incrociati con la foto dell'abete
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [file, every] of [['fir_a', 5], ['fir_b', 7], ['fir_gold', 13]]) {
    const g1 = new T.PlaneGeometry(1, 2), g2 = g1.clone().rotateY(Math.PI / 2), g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3));
    g.setAttribute('uv', new T.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2));
    g.setAttribute('normal', new T.Float32BufferAttribute(new Array(24).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    g.setIndex([...g1.index.array, ...[...g2.index.array].map(v => v + 4)]);
    const cnt = Math.floor(tr.len / every) * 2, im = new T.InstancedMesh(g, new T.MeshBasicMaterial({ map: tex(`../img/tex/${file}.webp`), alphaTest: .5, side: T.DoubleSide, color: 0xe6e6e6 }), cnt), m = new T.Matrix4(), qt = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    let q = 0; for (let i = 0; i < cnt / 2; i++) for (const sg of [-1, 1]) { const s = i * every + rnd() * every, lim = sideLimit(s, sg); const d = sg * Math.min(lim - 1, W / 2 + 2.5 + rnd() * rnd() * 20); at(tr, s, d, P);
      const hgt = 7 + rnd() * 7; qt.setFromAxisAngle(T.Object3D.DEFAULT_UP, rnd() * 6.3); sc.set(hgt * .5, hgt * .5, hgt * .5); ps.set(P.x, P.y + hgt * .5 - .3, P.z); m.compose(ps, qt, sc); im.setMatrixAt(q++, m); }
    im.count = q; scene.add(im);
  }
}
{ // partenza e arrivo
  const gate = (s, col, label) => { at(tr, s, 0, P); const grp = new T.Group(); grp.position.set(P.x, P.y, P.z); grp.rotation.y = -P.h;
    const mat = new T.MeshLambertMaterial({ color: 0x2a2a2a }); for (const sx of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.14, .14, 5.2, 8), mat); p.position.set(sx * (W / 2 + .6), 2.6, 0); grp.add(p); }
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 512, 96); x.fillStyle = '#111'; x.font = 'bold 64px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 256, 52);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; const b = new T.Mesh(new T.PlaneGeometry(W + 1.6, 1.5), new T.MeshBasicMaterial({ map: t, side: T.DoubleSide })); b.position.y = 4.6; grp.add(b); scene.add(grp); };
  gate(14, '#ffd400', 'ENDURO DRINKING TEAM'); gate(tr.len - 14, '#ffd400', 'RIFUGIO · ARRIVO');
}

// ---------- moto e pilota ----------
const bike = new T.Group(), leanG = new T.Group(), pitchG = new T.Group(); bike.add(leanG); leanG.add(pitchG); scene.add(bike);
const blob = new T.Mesh(new T.CircleGeometry(.9, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .32, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.scale.set(.42, 1.25, 1); scene.add(blob);
let wheelF = null, wheelR = null, steerG = null;
{ const gltf = new GLTFLoader(), dl = new DRACOLoader(); dl.setDecoderPath('../draco/'); gltf.setDRACOLoader(dl);
  gltf.load('../img/models/bike_fakedomi.glb?t=1', g => { const get = n => g.scene.getObjectByName(n), body = get('bike_body'), wf = get('wheel_f'), wr = get('wheel_r');
    steerG = new T.Group(); wheelF = new T.Group(); wheelR = new T.Group(); wheelF.position.copy(wf.position); wheelR.position.copy(wr.position); wf.position.set(0, 0, 0); wr.position.set(0, 0, 0);
    wheelF.add(wf); wheelR.add(wr); steerG.add(wheelF); pitchG.add(body, steerG, wheelR); });
  gltf.load('../img/models/rider_poses.glb?t=1', g => { const o = g.scene.getObjectByName('rider_sit'), mat = o.material.clone(); mat.color.set(0xf0c81e);
    const geo = o.geometry.clone(); geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(), o.quaternion, o.scale));
    P.rider = makeRider(geo, mat); P.rider.root.position.set(0, 1.16, .27); pitchG.add(P.rider.root);
    gltf.load('../img/models/helmet.glb?t=1', h => { let src = null; h.scene.traverse(c => { if (c.isMesh && !src) src = c; }); const hg = src.geometry.clone(); hg.applyMatrix4(src.matrixWorld); hg.rotateY(-Math.PI / 2); hg.computeBoundingBox();
      const bb = hg.boundingBox, sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), k = .3 / sz.x; hg.translate(-c.x, -c.y, -c.z); hg.scale(k, k, k);
      P.helm = new T.Mesh(hg, src.material); pitchG.add(P.helm); }); });
}

// ---------- terra e polvere dalla ruota dietro ----------
const DN = 90, dPos = new Float32Array(DN * 3), dAge = new Float32Array(DN).fill(1), dVel = new Float32Array(DN * 3); let dNext = 0, dAcc = 0;
const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3)); dGeo.setAttribute('aAge', new T.BufferAttribute(dAge, 1));
const dMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uH: { value: 800 } },
  vertexShader: 'attribute float aAge; varying float vA; uniform float uH; void main(){ vA = aAge; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (aAge >= 1. ? 0. : (.35 + aAge * 1.5) * uH / -mv.z); }',
  fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(.52, .42, .3, (1. - vA) * .55 * smoothstep(.5, .15, d)); }' });
const dPts = new T.Points(dGeo, dMat); dPts.frustumCulled = false; scene.add(dPts);
function dust(dt) {
  const rate = state === 'play' && S.air <= 0 ? Math.abs(S.slip) * 110 + (S.gasOn && S.v < 9 ? 45 : 0) + S.off * S.v * 2.5 + (S.gasOn ? S.v * .35 : 0) : 0; dAcc += rate * dt;
  const bx = Math.sin(S.psi + S.slip), bz = -Math.cos(S.psi + S.slip);
  while (dAcc >= 1) { dAcc--; const i = dNext; dNext = (dNext + 1) % DN; dAge[i] = 0; dPos[i * 3] = S.x - bx * .75 + (Math.random() - .5) * .3; dPos[i * 3 + 1] = S.y + .15; dPos[i * 3 + 2] = S.z - bz * .75 + (Math.random() - .5) * .3;
    const k = 1.5 + Math.random() * 2.5; dVel[i * 3] = -bx * k + (Math.random() - .5) * 2 - Math.cos(S.psi) * S.slip * 3; dVel[i * 3 + 1] = 1 + Math.random() * 1.8; dVel[i * 3 + 2] = -bz * k + (Math.random() - .5) * 2 - Math.sin(S.psi) * S.slip * 3; }
  for (let i = 0; i < DN; i++) if (dAge[i] < 1) { dAge[i] = Math.min(1, dAge[i] + dt * 1.5); dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt; dVel[i * 3 + 1] -= 2.5 * dt; }
  dGeo.attributes.position.needsUpdate = true; dGeo.attributes.aAge.needsUpdate = true; dMat.uniforms.uH.value = renderer.domElement.height;
}

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
  tiltSteer += (Math.sign(lin) * Math.pow(Math.abs(lin), 1.25) - tiltSteer) * .5;
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
const G = 9.81, VMAX = 21.5;   // 77 km/h
const S = { x: 0, z: 0, y: 0, psi: 0, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: 0, s: 0, d: 0, off: 0, hit: 0, pitch: 0, grade: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0 };
let state = 'menu', t0 = 0, time = 0, cd = 0, best = parseFloat(opt('best', '0')) || 0, wrong = 0;
function place() { const s0 = 20; at(tr, s0, 0, P); Object.assign(S, { x: P.x, z: P.z, y: P.y, psi: P.h, v: 0, lean: 0, leanV: 0, steer: 0, slip: 0, air: 0, vy: 0, i: Math.round(s0 / DS), s: s0, d: 0, off: 0, hit: 0, pitch: 0, brkAmt: 0, stand: 0, dab: 0, fwd: 0 }); cam.h = P.h; cam.init = false; tiltA0 = null; tiltSteer = 0; }
function step(dt) {
  const pr = project(tr, S.x, S.z, S.i); S.i = pr.i; S.s = pr.s; S.d = pr.d; S.grade = pr.g;
  const onTrack = Math.abs(S.d) <= W / 2 + .2; S.off += ((onTrack ? 0 : 1) - S.off) * Math.min(1, dt * 6);
  // sterzo: il comando chiede una piega, la moto ci arriva con il suo peso (molla smorzata)
  const key = keyR - keyL, raw = performance.now() - tiltSeen < 700 && Math.abs(tiltSteer) > .001 ? tiltSteer : (key || touchSteer);
  steerIn += (clamp(raw * (O.inv ? -1 : 1), -1, 1) - steerIn) * Math.min(1, dt * (key ? 7 : 14));
  const leanMax = .82 - S.off * .2, leanT = state === 'play' ? steerIn * leanMax * clamp(S.v / 6, .25, 1) : 0;
  S.leanV += ((leanT - S.lean) * 62 - S.leanV * 11.5) * dt; S.lean += S.leanV * dt;
  // la piega fa girare: velocità di imbardata = g·tan(piega)/v, fino al limite di aderenza del fondo
  const mu = (1.12 - S.off * .42), vEff = Math.max(S.v, 4.5);
  let om = G * Math.tan(S.lean) / vEff; const omMax = mu * G / vEff, over = Math.max(0, Math.abs(om) - omMax);
  if (over > 0) om = Math.sign(om) * (omMax + over * .25);   // oltre il limite la moto allarga
  // velocità: gas (automatico o tasto), freno, salita/discesa, attrito in piega, erba
  const kAhead = tr.k[Math.min(tr.n - 1, S.i + Math.round(clamp(S.v * 1.1, 8, 30) / DS))], vSafe = Math.abs(kAhead) > .004 ? Math.sqrt(mu * G * .86 / Math.abs(kAhead)) : 99;
  const autoBrake = O.auto && S.v > vSafe + .5, brk = state === 'play' && (braking || autoBrake);
  // quanto stai frenando: il tasto tenuto premuto sale da poco a tutto in mezzo secondo (il freno automatico pinza a metà)
  S.brkAmt += ((braking ? 1 : autoBrake ? .5 : 0) - S.brkAmt) * Math.min(1, dt * (brk ? 2.4 : 7));
  // ENDURO: frenando col posteriore la moto si mette di traverso, tanto più quanto freni e quanto sterzi; il muso entra in curva prima
  const turnDir = Math.abs(steerIn) > .06 ? Math.sign(steerIn) : Math.abs(kAhead) > .006 ? Math.sign(kAhead) : 0;
  const brakeSlide = brk && S.v > 5 ? turnDir * Math.min(.62, S.brkAmt * (.2 + .55 * Math.abs(steerIn))) * clamp((S.v - 4) / 7, 0, 1) : 0;
  const gasOn = state === 'play' && !brk && (O.gas === 'a' || gasHeld);
  const powerSlide = gasOn ? Math.sign(S.lean) * Math.max(0, Math.abs(S.lean) - .5) * .7 * clamp(1.3 - S.v / 14, 0, 1) : 0;   // in uscita, col gas e piegato, il posteriore scappa un po'
  const slipT = brakeSlide + powerSlide + (over > 0 ? Math.sign(om) * Math.min(.4, over * .9) : 0);
  S.slip += (slipT - S.slip) * Math.min(1, dt * (Math.abs(slipT) > Math.abs(S.slip) ? 6.5 : 3.2));
  om += S.slip * 1.7 * clamp(S.v / 11, .3, 1);   // di traverso la moto chiude la curva: è così che si imposta
  S.psi += om * dt;
  const gas = gasOn ? 1 : 0, vTop = VMAX * (1 - S.off * .5);
  let acc = gas * 7.2 * clamp(1.15 - S.v / vTop, 0, 1) - (brk ? 4.5 + 8 * S.brkAmt : 0) - G * Math.sin(Math.atan(S.grade)) * .75 - .007 * S.v * S.v * (1 + S.off * 5) - (gas ? 0 : .8) - Math.abs(Math.sin(S.lean)) * 1.6 - over * 3.5 - Math.abs(S.slip) * 2.2;
  if (state !== 'play') acc = -S.v * 3;
  S.v = Math.max(0, S.v + acc * dt); S.brk = brk; S.gasOn = gas; S.over = over;
  // pilota: in piedi sul dritto, seduto in curva con la gamba interna fuori
  const straight = Math.abs(steerIn) < .16 && Math.abs(kAhead) < .008 && !brk && S.v > 8 && state === 'play';
  S.stand += ((straight ? 1 : 0) - S.stand) * Math.min(1, dt * (straight ? 2.2 : 5));
  const dabT = Math.sign(S.lean + S.slip) * clamp((Math.abs(S.lean) - .22) / .2 + Math.abs(S.slip) * 3.5, 0, 1) * (S.v > 3 ? 1 : 0);
  S.dab += (dabT - S.dab) * Math.min(1, dt * 6);
  S.fwd += ((brk ? .16 * S.brkAmt : gas && S.v < VMAX * .7 ? -.14 : -.04) - S.fwd) * Math.min(1, dt * 5);
  S.x += Math.sin(S.psi) * S.v * dt; S.z -= Math.cos(S.psi) * S.v * dt;
  // bordi: dopo qualche metro di prato c'è la scarpata, si rimbalza dentro perdendo velocità
  const lim = Math.min(sideLimit(S.s, Math.sign(S.d) || 1) - 1.5, W / 2 + 9);
  if (Math.abs(S.d) > lim) { const sg = Math.sign(S.d), push = Math.abs(S.d) - lim; S.x -= Math.cos(pr.h) * sg * push; S.z -= Math.sin(pr.h) * sg * push; let rel = S.psi - pr.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); if (rel * sg > 0) { S.psi = pr.h + rel * .4; S.v *= 1 - Math.min(.5, Math.abs(rel)); S.hit = 1; } }
  // altezza: la moto segue il terreno, sui dossi veloci si stacca
  const gy = groundY(tr, S.s, S.d);
  if (S.air <= 0) { const vyG = (gy - S.y) / dt; if (S.vy - vyG > 2.2 && S.v > 9) { S.air = 1; } else { S.vy = vyG; S.y = gy; } }
  if (S.air > 0) { S.vy -= G * 1.5 * dt; S.y += S.vy * dt; if (S.y <= gy) { S.y = gy; S.air = 0; S.hit = Math.max(S.hit, clamp(-S.vy / 9, 0, 1)); S.vy = 0; } }
  S.hit = Math.max(0, S.hit - dt * 2.5);
  const ahead = groundY(tr, S.s + 1.2, S.d), behind = groundY(tr, S.s - 1.2, S.d); S.pitch += (Math.atan2(ahead - behind, 2.4) - S.pitch) * Math.min(1, dt * 9);
  // senso di marcia e arrivo
  let rel = S.psi - pr.h; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); wrong = Math.abs(rel) > 1.9 ? wrong + dt : 0;
  if (state === 'play') { time += dt; if (S.s >= tr.len - 14) finish(); }
}

// ---------- camera da inseguimento ----------
const cam = { h: 0, x: 0, y: 0, z: 0, roll: 0, fov: 66, init: false, dist: 0 };
function camUpdate(dt) {
  let dh = S.psi + S.slip * .12 - cam.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); cam.h += dh * Math.min(1, dt * 3.4);   // gira in ritardo: la moto entra in curva prima della camera
  const portrait = camera.aspect < .8, kc = { c: .8, m: 1, l: 1.3 }[O.cam] || 1, sp = S.v / VMAX;
  const distT = ((portrait ? 6.4 : 5.6) + sp * 1.7 - (S.brk ? .8 : 0)) * kc; cam.dist += (distT - cam.dist) * Math.min(1, dt * 2.2);
  const tx = S.x - Math.sin(cam.h) * cam.dist, tz = S.z + Math.cos(cam.h) * cam.dist;
  const pc = project(tr, tx, tz, S.i), ty = Math.max(groundY(tr, pc.s, pc.d) + 1.1, S.y + (portrait ? 3.1 : 2.5) * kc - S.pitch * 2.2);
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.z = tz; cam.init = true; cam.dist = distT; }
  cam.x = tx; cam.z = tz; cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  const sh = S.hit * .12 + S.off * .03 * sp; camera.position.set(cam.x + (Math.random() - .5) * sh, cam.y + (Math.random() - .5) * sh, cam.z);
  const la = 7 + sp * 6; camera.lookAt(S.x + Math.sin(S.psi) * la, S.y + 1.25 + S.pitch * la * .6, S.z - Math.cos(S.psi) * la);
  cam.roll += (-S.lean * .2 - cam.roll) * Math.min(1, dt * 5); camera.rotateZ(cam.roll);
  const fovT = (portrait ? 74 : 60) + sp * sp * 16; cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3); if (Math.abs(camera.fov - cam.fov) > .05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (cam.dbg) { const a = S.psi + cam.dbg; camera.position.set(S.x + Math.sin(a) * 4.4, S.y + 1.7, S.z - Math.cos(a) * 4.4); camera.lookAt(S.x, S.y + .95, S.z); }   // solo per le prove: vista da davanti
  P.sky.position.x = camera.position.x; P.sky.position.z = camera.position.z;
}
function draw(dt) {
  const leanVis = clamp(S.lean * 1.12 + S.slip * .35, -1, 1);   // la moto si butta giù più del pilota
  bike.position.set(S.x, S.y, S.z); bike.rotation.y = -(S.psi + S.slip); leanG.rotation.z = -leanVis; pitchG.rotation.x = S.pitch + (S.air > 0 ? clamp(-S.vy * .03, -.25, .3) : 0) - (S.brk ? .035 * S.brkAmt : 0) + (S.gasOn ? .02 : 0);
  if (wheelF) { const r = S.v * dt / .4; wheelF.rotation.x -= r; wheelR.rotation.x -= S.brk && Math.abs(S.slip) > .12 ? r * .15 : r; steerG.rotation.y = clamp(S.slip * .9 - S.lean * .1, -.5, .5); }   // di traverso: ruota dietro quasi bloccata e controsterzo
  if (P.rider) { const neck = P.rider.pose({ fwd: S.fwd, side: leanVis * .5, stand: S.stand, dab: S.dab, gas: S.gasOn, brake: S.brkAmt, vib: S.off * .04 + S.hit * .05 });
    if (P.helm) { pitchG.worldToLocal(neck); P.helm.position.set(neck.x, neck.y + .19, neck.z - .02); P.helm.rotation.set(S.fwd * .3, 0, leanVis * .35); } }
  dust(dt);
  blob.position.set(S.x, groundY(tr, S.s, S.d) + .04, S.z); blob.rotation.z = -S.psi; blob.material.opacity = S.air > 0 ? .16 : .32;
  camUpdate(dt); renderer.render(scene, camera);
}

// ---------- gioco ----------
const fmt = t => t.toFixed(1).replace('.', ',');
function hud() { $('spd').firstChild.nodeValue = Math.round(S.v * 3.6); $('tim').firstChild.nodeValue = fmt(time); $('bar').firstElementChild.style.width = clamp(S.s / (tr.len - 14) * 100, 0, 100) + '%';
  $('best').textContent = best ? 'RECORD ' + fmt(best) + ' s' : ''; $('gasb').classList.toggle('hidden', O.gas === 'a');
  if (state === 'play') $('msg').textContent = wrong > .8 ? 'GIRATI!' : time < .9 ? 'VIA!' : ''; }
function labels() { $('oAuto').textContent = 'FRENO AUTO: ' + (O.auto ? 'SÌ' : 'NO'); $('oGas').textContent = 'GAS: ' + (O.gas === 'a' ? 'AUTOMATICO' : 'COL TASTO'); $('oSens').textContent = 'STERZO: ' + ({ s: 'MORBIDO', m: 'MEDIO', h: 'RAPIDO' }[O.sens]); $('oInv').textContent = 'VERSO STERZO: ' + (O.inv ? 'INVERTITO' : 'NORMALE'); $('oCam').textContent = 'CAMERA: ' + ({ c: 'VICINA', m: 'MEDIA', l: 'LONTANA' }[O.cam]); }
$('oAuto').onclick = () => { O.auto = !O.auto; setOpt('auto', O.auto ? '1' : '0'); labels(); };
$('oGas').onclick = () => { O.gas = O.gas === 'a' ? 'm' : 'a'; setOpt('gas', O.gas); labels(); hud(); };
$('oSens').onclick = () => { O.sens = { s: 'm', m: 'h', h: 's' }[O.sens]; setOpt('sens', O.sens); labels(); };
$('oInv').onclick = () => { O.inv = !O.inv; setOpt('inv', O.inv ? '1' : '0'); labels(); };
$('oCam').onclick = () => { O.cam = { c: 'm', m: 'l', l: 'c' }[O.cam]; setOpt('cam', O.cam); labels(); };
function restart() { place(); time = 0; state = 'count'; cd = 2.4; $('panel').classList.add('hide'); $('msg').textContent = '3'; }
function finish() { state = 'done'; const rec = !best || time < best; if (rec) { best = time; setOpt('best', String(time)); }
  $('pres').textContent = 'AL RIFUGIO IN ' + fmt(time) + ' s' + (rec ? ' · RECORD!' : ''); $('go').textContent = 'UN ALTRO GIRO'; setTimeout(() => $('panel').classList.remove('hide'), 900); $('msg').textContent = 'ARRIVATO!'; }
$('go').onclick = () => { askTilt(); restart(); }; $('again').onclick = () => { askTilt(); restart(); };
$('opts').onclick = () => { state = 'menu'; $('pres').textContent = ''; $('go').textContent = 'RIPARTI'; $('panel').classList.remove('hide'); };
labels(); place(); hud();

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
