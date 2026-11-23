// Giro Easy · pista 3D · pilota con ossa e IK (stesso scheletro del gioco vero: mani sulle manopole, piedi sulle pedane)
import * as T from '../three.module.min.js';
const RJ = { root: [0, .12, -.02], spine: [0, .25, -.06], chest: [0, .38, -.12], neck: [0, .5, -.19], head: [0, .6, -.2] };
for (const [sd, n] of [[1, 'R'], [-1, 'L']]) Object.assign(RJ, { ['hip' + n]: [sd * .1, .06, -.04], ['knee' + n]: [sd * .18, -.27, -.31], ['ankle' + n]: [sd * .2, -.62, -.22], ['toe' + n]: [sd * .2, -.7, -.36],
  ['shoulder' + n]: [sd * .17, .45, -.16], ['elbow' + n]: [sd * .33, .31, -.36], ['wrist' + n]: [sd * .41, .25, -.52], ['hand' + n]: [sd * .43, .24, -.59] });
const RV = k => new T.Vector3(...RJ[k]);
const _ikA = new T.Vector3(), _ikB = new T.Vector3(), _ikC = new T.Vector3(), _ikE = new T.Vector3(), _ikd = new T.Vector3(), _ikpl = new T.Vector3(), _ikqa = new T.Quaternion(), _ikws = new T.Vector3(), _el = new T.Vector3();
function aimBone(bone, childRest, targetW) {
  bone.updateWorldMatrix(true, false); bone.getWorldPosition(_ikC); bone.parent.getWorldQuaternion(_ikqa).invert();
  _ikd.subVectors(targetW, _ikC).normalize().applyQuaternion(_ikqa); bone.quaternion.setFromUnitVectors(_ikB.copy(childRest).normalize(), _ikd);
}
function ik2(a, b, endRest, target, poleW) {
  a.quaternion.identity(); b.quaternion.identity(); a.updateWorldMatrix(true, true);
  a.getWorldPosition(_ikA); a.getWorldScale(_ikws); const sc = _ikws.x;
  const l1 = b.position.length() * sc, l2 = endRest.length() * sc;
  const T0 = _ikE.copy(target); let dist = T0.distanceTo(_ikA); const maxL = (l1 + l2) * .999;
  if (dist > maxL) { T0.sub(_ikA).setLength(maxL).add(_ikA); dist = maxL; }
  dist = Math.max(dist, Math.abs(l1 - l2) + 1e-3);
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const dir = _ikd.subVectors(T0, _ikA).normalize();
  const pole = _ikpl.subVectors(poleW, _ikA); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
  _el.copy(_ikA).addScaledVector(dir, x).addScaledVector(pole, h);
  aimBone(a, b.position, _el); a.updateWorldMatrix(false, true); aimBone(b, endRest, T0);
}
function buildRig(geo, mat) {
  const defs = [['root', null, 'root', 'spine'], ['spine', 'root', 'spine', 'chest'], ['chest', 'spine', 'chest', 'neck'], ['neck', 'chest', 'neck', 'head']];
  for (const n of 'RL') defs.push(['clav' + n, 'chest', 'chest', 'shoulder' + n], ['uarm' + n, 'clav' + n, 'shoulder' + n, 'elbow' + n], ['farm' + n, 'uarm' + n, 'elbow' + n, 'wrist' + n], ['hand' + n, 'farm' + n, 'wrist' + n, 'hand' + n],
    ['thigh' + n, 'root', 'hip' + n, 'knee' + n], ['shin' + n, 'thigh' + n, 'knee' + n, 'ankle' + n], ['foot' + n, 'shin' + n, 'ankle' + n, 'toe' + n]);
  const bones = {}, list = [];
  for (const [n, par, at] of defs) { const bn = new T.Bone(); bn.name = n; const pos = RV(at); if (par) pos.sub(RV(defs.find(d => d[0] === par)[2])); bn.position.copy(pos); (par ? bones[par] : null)?.add(bn); bones[n] = bn; list.push(bn); }
  const segs = defs.map(d => [list.findIndex(bn => bn.name === d[0]), RV(d[2]), RV(d[3])]); segs.push([list.findIndex(bn => bn.name === 'root'), RV('hipR'), RV('hipL')]);
  const P = geo.attributes.position, n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), v = new T.Vector3(), ab = new T.Vector3(), q = new T.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i); let d1 = 1e9, d2 = 1e9, b1 = 0, b2 = 0;
    for (const [bi, A, B] of segs) { ab.subVectors(B, A); const tt = Math.max(0, Math.min(1, q.subVectors(v, A).dot(ab) / ab.lengthSq())); const d = q.copy(A).addScaledVector(ab, tt).distanceTo(v);
      if (d < d1) { if (b1 !== bi) { d2 = d1; b2 = b1; } d1 = d; b1 = bi; } else if (d < d2 && bi !== b1) { d2 = d; b2 = bi; } }
    const w2 = Math.max(0, 1 - (d2 - d1) / .05) * .5; si[i * 4] = b1; si[i * 4 + 1] = b2; sw[i * 4] = 1 - w2; sw[i * 4 + 1] = w2;
  }
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
  const mesh = new T.SkinnedMesh(geo, mat); mesh.add(bones.root); mesh.bind(new T.Skeleton(list)); mesh.frustumCulled = false;
  const rest = {}; for (const bn of list) rest[bn.name] = bn.position.clone();
  return { mesh, bones, rest };
}
// root = gruppo fisso sul telaio (mani e piedi restano lì), pivot = il busto che si sposta sopra la moto
export function makeRider(geo, mat) {
  const root = new T.Group(), pivot = new T.Group(); root.add(pivot); const rig = buildRig(geo, mat); pivot.add(rig.mesh);
  const B = rig.bones, R = rig.rest, tg = new T.Vector3(), pw = new T.Vector3(), neck = new T.Vector3(), e = new T.Euler();
  // p: fwd (busto avanti<0 / indietro>0), side (busto di lato, nel verso opposto alla piega = pilota dritto), stand 0..1, dab (-1 gamba sinistra fuori … +1 destra), gas, brake, vib
  function pose(p) {
    const st = p.stand;
    pivot.position.set(p.side * -.16, st * .2, -st * .1 + p.fwd * .1); pivot.rotation.set(p.fwd - st * .22, 0, p.side);
    B.spine.quaternion.setFromEuler(e.set(p.fwd * .4 - st * .06, 0, p.side * .5)); B.chest.quaternion.setFromEuler(e.set(-.32 + st * .1, 0, 0)); B.chest.scale.set(.86, 1.1, .84); B.spine.scale.set(.92, 1.04, .9);
    B.neck.quaternion.setFromEuler(e.set(-p.fwd * .6 + .12 + st * .2, 0, -p.side * .6));
    root.updateMatrixWorld(true);
    for (const [n, sd] of [['R', 1], ['L', -1]]) {
      const outer = Math.max(0, -sd * p.dab), vib = 0;
      tg.copy(RV('wrist' + n)); tg.x += sd * (p.hx || 0); tg.y += p.hy || 0; tg.z += p.hz || 0; root.localToWorld(tg);   /* le mani vanno al manubrio della moto scelta */
      pw.copy(RV('elbow' + n)); pw.x += sd * (.5 + outer * .25); pw.y += .1 + .18 * st + outer * .3 + vib * .5; pw.z += .1; rig.mesh.localToWorld(pw);   // gomiti alti e in fuori; in curva quello esterno sale
      ik2(B['uarm' + n], B['farm' + n], R['hand' + n], tg, pw);
      B['hand' + n].rotation.set((sd > 0 ? p.gas * .4 : 0) - p.brake * .2, 0, 0);
      const out = Math.max(0, sd * p.dab);   // gamba interna fuori: avanti e di lato, piede vicino a terra, pronto ad appoggiare
      tg.copy(RV('ankle' + n)); if (out > 0) { tg.x += sd * .46 * out; tg.y += -.04 * out; tg.z += -.66 * out; } root.localToWorld(tg);
      pw.copy(RV('knee' + n)); pw.x += sd * (out * .5 - .06); pw.y += .05 + out * .25; pw.z += -.5; rig.mesh.localToWorld(pw);
      ik2(B['thigh' + n], B['shin' + n], R['foot' + n], tg, pw);
      B['foot' + n].rotation.set(out * -.5, 0, 0);
    }
    B.neck.getWorldPosition(neck); return neck;
  }
  return { root, pivot, rig, pose };
}
