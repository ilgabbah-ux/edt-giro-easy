// EDT Giro Easy · v18 — mondo 3D (Three.js locale)
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { JUMP_DURATION, JUMP_HEIGHT, jumpHeight, routeAt, sectionWeights, terrainHeight, terrainGrade } from './physics.js?v=35';
import * as T from './three.module.min.js';

// Atmosfere: una per percorso. "sky" = colori del cielo, "light" = luce della scena.
const PRESETS = [
  { name: 'Mattina limpida', top: '#2b78bd', horizon: '#cfe4e6', sunDir: [-.55, .5, -.67], sunColor: '#fff3d2', clouds: .42, cloud: '#ffffff',
    light: '#fff1d6', lightI: 3.4, hemiSky: '#cfe8ff', hemiGround: '#5d4a30', hemiI: 1.75, fog: '#c9dcd9', fogNear: 75, fogFar: 205, exposure: 1.05, ridge: '#7d9798' },
  { name: 'Pomeriggio dorato', top: '#3b6fab', horizon: '#f6d7a5', sunDir: [-.72, .26, -.64], sunColor: '#ffd08a', clouds: .55, cloud: '#ffeacc',
    light: '#ffcc8a', lightI: 3.6, hemiSky: '#ffe3ba', hemiGround: '#5b4128', hemiI: 1.55, fog: '#e9d1a8', fogNear: 70, fogFar: 200, exposure: 1.06, ridge: '#9b8f84' },
  { name: 'Tramonto di Angelo', top: '#272c63', horizon: '#ff8b4f', sunDir: [-.32, .09, -.94], sunColor: '#ff7436', clouds: .62, cloud: '#ff9d7c',
    light: '#ffa066', lightI: 3.0, hemiSky: '#ffb391', hemiGround: '#3a2934', hemiI: 1.35, fog: '#d58a68', fogNear: 60, fogFar: 190, exposure: 1.08, ridge: '#6c5a6e' },
  { name: 'Cielo d’autunno', top: '#58809e', horizon: '#e2e6dc', sunDir: [.5, .42, -.75], sunColor: '#fff8e6', clouds: .82, cloud: '#f4f4f0',
    light: '#fff6e4', lightI: 3.0, hemiSky: '#e4eef2', hemiGround: '#5a4b37', hemiI: 1.85, fog: '#d5ddd6', fogNear: 65, fogFar: 195, exposure: 1.04, ridge: '#7e8d90' },
];

export function createWorld(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new T.Scene();
  scene.fog = new T.Fog('#c9dcd9', 75, 205);

  // ---------- Cielo: gradiente, sole e nuvole procedurali ----------
  const skyUniforms = {
    uTop: { value: new T.Color() }, uHorizon: { value: new T.Color() }, uSunDir: { value: new T.Vector3() },
    uSun: { value: new T.Color() }, uCloud: { value: new T.Color() }, uClouds: { value: .5 }, uTime: { value: 0 },
  };
  const sky = new T.Mesh(new T.SphereGeometry(300, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vDir;uniform vec3 uTop,uHorizon,uSunDir,uSun,uCloud;uniform float uClouds,uTime;
      float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);
        vec3 col=mix(uHorizon,uTop,pow(h,.5));
        float sd=max(dot(d,normalize(uSunDir)),0.);
        col+=uSun*pow(sd,10.)*.28+uSun*pow(sd,90.)*.5+uSun*smoothstep(.9985,.9993,sd)*1.4;
        vec2 uv=d.xz/(d.y+.16)*1.6+vec2(uTime*.012,uTime*.004);
        float c=smoothstep(.5,.82,fbm(uv))*uClouds*smoothstep(.0,.18,d.y);
        vec3 cc=mix(uCloud,uCloud*.72,smoothstep(.6,.95,fbm(uv*1.8+3.)));cc+=uSun*pow(sd,6.)*.35;
        col=mix(col,cc,c*.88);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -100;
  scene.add(sky);

  const camera = new T.PerspectiveCamera(53, 1, .1, 400);
  camera.position.set(0, 3.4, 7.7);

  const hemi = new T.HemisphereLight('#c1e6ff', '#59472e', 1.9);
  scene.add(hemi);
  const sun = new T.DirectionalLight('#ffe1aa', 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 24, bottom: -14, near: 1, far: 90 });
  sun.shadow.bias = -.00035; sun.shadow.normalBias = .025; sun.shadow.radius = 2;
  scene.add(sun, sun.target);

  // ---------- Materiali ----------
  const mat = (c, roughness = .85, metalness = 0) => new T.MeshStandardMaterial({ color: c, roughness, metalness });
  const dirt = mat('#ad936a'), verge = mat('#758151'), grass = mat('#6b8a55'), bark = mat('#594637'), pine = mat('#30594c'), pineLight = mat('#3e6d56'),
    stone = mat('#8d9185'), rubber = mat('#182025'), treadMat = mat('#2b3030'), alloy = mat('#a3b7bb', .3, .7), black = mat('#243138'),
    spring = mat('#e93825', .35), white = mat('#eee8d8', .42), gold = mat('#bc983f', .25, .65);
  // Materiali della livrea (cambiano colore in base alla scelta nel garage).
  const plastic = mat('#e93825', .35), accent = mat('#fcd326', .5), jerseyMat = mat('#fcd326', .6), pantsMat = mat('#243138', .8), helmetMat = mat('#eee8d8', .35);

  function mesh(g, m, parent = scene) { const x = new T.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; parent.add(x); return x; }
  function box(w, h, d, m, p, x = 0, y = 0, z = 0) { const o = mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * .24), m, p); o.position.set(x, y, z); return o; }
  function ball(rx, ry, rz, m, p, x = 0, y = 0, z = 0) { const o = mesh(new T.SphereGeometry(1, 24, 16), m, p); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o; }
  function rod(a, b, r, m, p) {
    const va = new T.Vector3(...a), vb = new T.Vector3(...b), d = vb.clone().sub(va);
    const o = mesh(new T.CylinderGeometry(r, r, d.length(), 12), m, p);
    o.position.copy(va.add(vb).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return o;
  }
  let seed = 73;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // ---------- Texture procedurali ----------
  const tc = document.createElement('canvas'); tc.width = tc.height = 256;
  const cx = tc.getContext('2d');
  cx.fillStyle = '#b5a077'; cx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4400; i++) { const l = rand(); cx.fillStyle = l < .5 ? 'rgba(62,44,29,.15)' : 'rgba(242,223,183,.22)'; cx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 2); }
  for (const x of [48, 128, 208]) {
    cx.beginPath();
    for (let y = 0; y <= 256; y += 4) { const xx = x + Math.sin(y / 256 * Math.PI * 2) * 4; y === 0 ? cx.moveTo(xx, y) : cx.lineTo(xx, y); }
    cx.strokeStyle = 'rgba(56,39,23,.19)'; cx.lineWidth = 13; cx.stroke();
    cx.strokeStyle = 'rgba(228,210,172,.16)'; cx.lineWidth = 3; cx.stroke();
  }
  for (let i = 0; i < 130; i++) { const x = rand() * 256, y = rand() * 256; cx.fillStyle = 'rgba(45,36,24,.24)'; cx.beginPath(); cx.ellipse(x, y, rand() * 2.4 + .6, rand() * 1.3 + .4, rand() * 3, 0, Math.PI * 2); cx.fill(); }
  const gravel = new T.CanvasTexture(tc);
  gravel.wrapS = gravel.wrapT = T.RepeatWrapping; gravel.colorSpace = T.SRGBColorSpace; gravel.repeat.set(1, 30); gravel.anisotropy = 4;
  dirt.map = gravel; dirt.bumpMap = gravel; dirt.bumpScale = .07;

  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  const gx = gc.getContext('2d');
  gx.fillStyle = '#7d9a5e'; gx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const g = 90 + rand() * 80;
    gx.strokeStyle = `rgba(${(g * .55) | 0},${g | 0},${(g * .42) | 0},.55)`;
    gx.lineWidth = 1 + rand();
    const x = rand() * 256, y = rand() * 256;
    gx.beginPath(); gx.moveTo(x, y); gx.lineTo(x + (rand() - .5) * 4, y - 3 - rand() * 6); gx.stroke();
  }
  for (let i = 0; i < 60; i++) { gx.fillStyle = 'rgba(70,58,38,.25)'; gx.beginPath(); gx.arc(rand() * 256, rand() * 256, 2 + rand() * 6, 0, Math.PI * 2); gx.fill(); }
  const grassTex = new T.CanvasTexture(gc);
  grassTex.wrapS = grassTex.wrapT = T.RepeatWrapping; grassTex.colorSpace = T.SRGBColorSpace; grassTex.repeat.set(14, 34); grassTex.anisotropy = 4;
  grass.map = grassTex;

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  const glowTex = glowTexture();

  // ---------- Terreno ----------
  const segments = 200, lanes = 10;
  const positions = new Float32Array((segments + 1) * (lanes + 1) * 3), uv = new Float32Array((segments + 1) * (lanes + 1) * 2), indices = [];
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= lanes; j++) {
    const k = i * (lanes + 1) + j; uv[k * 2] = j / lanes; uv[k * 2 + 1] = i / segments;
    if (i < segments && j < lanes) indices.push(k, k + 1, k + lanes + 1, k + 1, k + lanes + 2, k + lanes + 1);
  }
  function strip(material) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(positions.slice(), 3));
    g.setAttribute('uv', new T.BufferAttribute(uv.slice(), 2));
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(positions.length).fill(1), 3));
    material.vertexColors = true; g.setIndex(indices);
    const o = mesh(g, material); o.castShadow = false; return o;
  }
  const road = strip(dirt), left = strip(grass), right = strip(grass), edges = [strip(verge), strip(verge)];
  let trail = { grade: 0, width: 1, rough: 0, climb: 0, wet: 0 };
  const spacing = () => 2.5 * trail.width;
  const center = (z, t) => Math.sin((t - z) * .021) * 3.8 - Math.sin(t * .021) * 3.8 + trail.rough * (Math.sin((t - z) * .062) - Math.sin(t * .062)) * 2.6;
  const height = (z, t) => terrainHeight(z, t, trail);
  const slope = (z, t) => terrainGrade(z, t, trail);
  function bank(w, z) {
    const edge = 4.65 * trail.width, d = Math.max(0, Math.abs(w) - edge);
    const soft = d * (.06 + Math.sin(z * .045 + w * .09) * .025);
    const cliff = w < 0 ? Math.min(16, d * .95) : -Math.min(23, d * 1.65);
    return soft * (1 - trail.rough) + cliff * trail.rough;
  }
  const dirtA = new T.Color('#ad936a'), dirtWet = new T.Color('#7d6446'), dirtRock = new T.Color('#9d9e96');
  const grassA = new T.Color('#8fae6a'), grassRock = new T.Color('#848a80');
  const DIRT_COLS = ['#8c6b48', '#6f5538', '#b79c6b', '#9d9e96'].map(c => new T.Color(c));
  const GRASS_COLS = ['#6f8f4f', '#8cbf5f', '#b3ad62', '#868c80'].map(c => new T.Color(c));
  const VERGE_COLS = ['#5f6e3c', '#6d8a45', '#9a8e52', '#767971'].map(c => new T.Color(c));
  const fogBase = { near: 75, far: 205 };
  function blend(target, cols, w) { target.setRGB(0, 0, 0); for (let i = 0; i < 4; i++) { target.r += cols[i].r * w[i]; target.g += cols[i].g * w[i]; target.b += cols[i].b * w[i]; } }
  function terrain(t) {
    for (const [o, from, to] of [[road, -4.65, 4.65], [left, -70, -5.15], [right, 5.15, 70], [edges[0], -5.15, -4.65], [edges[1], 4.65, 5.15]]) {
      const a = o.geometry.attributes.position, col = o.geometry.attributes.color;
      for (let i = 0; i <= segments; i++) {
        const z = 14 - i, c = center(z, t), h = height(z, t);
        for (let j = 0; j <= lanes; j++) {
          const wf = from === -70 ? from : from * trail.width, wt = to === 70 ? to : to * trail.width;
          const w = wf + (wt - wf) * j / lanes, k = i * (lanes + 1) + j;
          const hill = bank(w, z);
          const rut = o === road ? trail.rough * (Math.cos(w * 5.8) * .025 + Math.sin((t - z) * 1.2 + w) * .022) : 0;
          a.setXYZ(k, c + w, h + hill + rut, z);
          const noise = Math.sin((t - z) * .21 + w * .84) * Math.cos((t - z) * .083 - w * 1.7);
          const tint = o === road ? .93 + noise * .07 : .86 + noise * .14;
          col.setXYZ(k, tint, tint, o === road ? tint : tint * .94);
        }
      }
      a.needsUpdate = true; col.needsUpdate = true; o.geometry.computeVertexNormals();
    }
    gravel.offset.y = (t * 30 / 200) % 1;
    grassTex.offset.y = (t * 34 / 200) % 1;
    // Colori del terreno per sezione: terra scura di bosco, fango, ocra di pascolo, pietra.
    const W = trail.w || [1, 0, 0, 0];
    blend(dirt.color, DIRT_COLS, W);
    dirt.roughness = .85 - trail.wet * .35;
    blend(grass.color, GRASS_COLS, W);
    blend(verge.color, VERGE_COLS, W);
    scene.fog.near = fogBase.near * (1 - W[0] * .2); scene.fog.far = fogBase.far * (1 - W[0] * .12);
    dirt.bumpScale = .07 + trail.rough * .16;
  }

  // ---------- Paesaggi per sezione (instanced: leggero sui telefoni) ----------
  // Ogni elemento sa in che sezione si trova lungo la strada: sottobosco fitto, prati umidi
  // con canneti e staccionate, pascoli alpini con larici dorati, mulattiera di pietra con piloni.
  const dummy = new T.Object3D();
  const wrapZ = (base, t) => 12 - (((base - t) % 180 + 180) % 180);
  let curCourse = 0, courseScale = .05;
  // Densità di un elemento a quota z: somma dei pesi di sezione per la densità in quella sezione.
  const dens = (z, D) => { const w = sectionWeights(curCourse - z * courseScale); return w[0] * D[0] + w[1] * D[1] + w[2] * D[2] + w[3] * D[3]; };
  const vis = (z, D, h) => Math.max(0, Math.min(1, (dens(z, D) - h) * 5));
  const put = (m, i) => { dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); };
  const ground = (z, t, w) => height(z, t) + bank(w, z);

  // Pini (sottobosco)
  const branchShape = [[0, -2.4], [1.6, -2.25], [.7, -.82], [1.28, -1.05], [.46, .35], [.9, .10], [0, 2.4]].map(([x, y]) => new T.Vector2(x, y));
  const pineGeometry = new T.LatheGeometry(branchShape, 16);
  const PINES = 110;
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(.12, .23, 3, 8), bark, PINES);
  const crowns = new T.InstancedMesh(pineGeometry, pine, PINES);
  const tops = new T.InstancedMesh(new T.ConeGeometry(1.18, 3.7, 12), pineLight, PINES);
  const treeData = Array.from({ length: PINES }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 6 + Math.pow(rand(), 1.3) * 28, z: rand() * 180, scale: .65 + rand() * 1.1, rot: rand() * 6, h: rand() * .95 }));
  const PINE_D = [1, .18, .2, .18];

  // Latifoglie autunnali (pozzanghere e margini del bosco)
  const LEAFY = 54;
  const birchTrunks = new T.InstancedMesh(new T.CylinderGeometry(.09, .15, 3.2, 8), mat('#d9d4c7', .7), LEAFY);
  const leafCrowns = new T.InstancedMesh(new T.IcosahedronGeometry(1.5, 1), new T.MeshStandardMaterial({ roughness: .9, flatShading: true }), LEAFY);
  const leafData = Array.from({ length: LEAFY }, (_, i) => ({ side: i % 2 ? -1 : 1, off: 8 + rand() * 24, z: rand() * 180, scale: .7 + rand() * .7, rot: rand() * 6, h: rand() * .95 }));
  const autumn = ['#d98b25', '#e3b23c', '#b9532a', '#8aa04a', '#c96f2a', '#e8c95a'];
  leafData.forEach((d, i) => leafCrowns.setColorAt(i, new T.Color(autumn[i % autumn.length])));
  const LEAF_D = [.45, .85, .08, 0];

  // Larici dorati (salitone): coni stretti color oro d'ottobre
  const LARCH = 70;
  const larchTrunks = new T.InstancedMesh(new T.CylinderGeometry(.08, .17, 2.4, 6), bark, LARCH);
  const larchCrowns = new T.InstancedMesh(new T.ConeGeometry(1, 4.6, 9, 3), new T.MeshStandardMaterial({ roughness: .85, flatShading: true }), LARCH);
  const larchData = Array.from({ length: LARCH }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 6.5 + Math.pow(rand(), 1.2) * 30, z: rand() * 180, scale: .6 + rand() * .8, h: rand() * .95 }));
  const larchCols = ['#e0a526', '#d38b1c', '#eac04a', '#c9781c', '#b9a23a'];
  larchData.forEach((d, i) => larchCrowns.setColorAt(i, new T.Color(larchCols[i % larchCols.length])));
  const LARCH_D = [.03, .08, 1, .3];

  const rocks = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), stone, 60);
  const rockData = Array.from({ length: 60 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: i * 3.03, off: (i % 7) * .47, big: rand() }));
  for (const item of [trunks, crowns, tops, rocks, birchTrunks, leafCrowns, larchTrunks, larchCrowns]) { item.castShadow = true; item.receiveShadow = true; scene.add(item); }

  function instances(t) {
    const shrink = 1 - trail.rough * .45;
    treeData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * shrink * vis(z, PINE_D, d.h);
      dummy.rotation.set(0, d.rot, 0); dummy.scale.setScalar(s);
      for (const [m, yy] of [[trunks, 1.5], [crowns, 4.0], [tops, 6]]) { dummy.position.set(x, y + yy * s, z); put(m, i); }
    });
    leafData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * vis(z, LEAF_D, d.h);
      dummy.rotation.set(0, d.rot, 0); dummy.scale.setScalar(s);
      dummy.position.set(x, y + 1.6 * s, z); put(birchTrunks, i);
      dummy.scale.set(s, s * 1.15, s); dummy.position.set(x, y + 3.9 * s, z); put(leafCrowns, i);
    });
    larchData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * vis(z, LARCH_D, d.h);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(s);
      dummy.position.set(x, y + 1.2 * s, z); put(larchTrunks, i);
      dummy.scale.set(s * .9, s, s * .9); dummy.position.set(x, y + 3.9 * s, z); put(larchCrowns, i);
    });
    rockData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * (5.2 * trail.width + d.off);
      // Sul salitone i sassi diventano massi.
      const k = 1 + dens(z, [0, 0, 1.6, .6]) * d.big;
      dummy.position.set(center(z, t) + w + d.side * (k - 1) * .8, ground(z, t, w) + .23 * k, z);
      dummy.rotation.set(i * .8, i, 0); dummy.scale.set((.35 + (i % 4) * .16) * k, (.28 + (i % 3) * .25) * k, .6 * k); put(rocks, i);
    });
    for (const o of [trunks, crowns, tops, rocks, birchTrunks, leafCrowns, larchTrunks, larchCrowns]) o.instanceMatrix.needsUpdate = true;
  }

  // Ciuffi d'erba, felci, canne, fiori, funghi, cespugli
  const bladeGeo = new T.BufferGeometry();
  {
    const v = [];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, r = .12, lx = Math.cos(a) * r, lz = Math.sin(a) * r, tx = Math.cos(a) * .32, tz = Math.sin(a) * .32;
      const px = Math.cos(a + 1.57) * .05, pz = Math.sin(a + 1.57) * .05;
      v.push(lx - px, 0, lz - pz, lx + px, 0, lz + pz, tx, .55 + (k % 2) * .2, tz);
    }
    bladeGeo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    bladeGeo.computeVertexNormals();
  }
  const TUFTS = 220;
  const tufts = new T.InstancedMesh(bladeGeo, new T.MeshStandardMaterial({ color: '#ffffff', roughness: .9, side: T.DoubleSide }), TUFTS);
  const tuftData = Array.from({ length: TUFTS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 4.9 + Math.pow(rand(), 1.6) * 9, z: rand() * 180, s: .7 + rand() * .8, r: rand() * 6 }));
  tuftData.forEach((d, i) => tufts.setColorAt(i, new T.Color().setHSL(.2 + rand() * .07, .45, .32 + rand() * .14)));
  tufts.receiveShadow = true; scene.add(tufts);
  // Felci del sottobosco: ciuffi larghi e bassi, verde scuro.
  const FERNS = 110;
  const ferns = new T.InstancedMesh(bladeGeo, new T.MeshStandardMaterial({ color: '#3f6b35', roughness: .85, side: T.DoubleSide }), FERNS);
  const fernData = Array.from({ length: FERNS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 5 + Math.pow(rand(), 1.4) * 10, z: rand() * 180, s: 1.6 + rand() * 1.4, r: rand() * 6, h: rand() * .9 }));
  scene.add(ferns);
  // Canneti delle pozzanghere: ciuffi alti e sottili.
  const REEDS = 110;
  const reeds = new T.InstancedMesh(bladeGeo, new T.MeshStandardMaterial({ color: '#b5b05a', roughness: .8, side: T.DoubleSide }), REEDS);
  const reedData = Array.from({ length: REEDS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 5.3 + Math.pow(rand(), 1.2) * 11, z: rand() * 180, s: .8 + rand() * .6, r: rand() * 6, h: rand() * .9 }));
  scene.add(reeds);
  const FLOWERS = 120;
  const flowers = new T.InstancedMesh(new T.IcosahedronGeometry(.07, 0), new T.MeshStandardMaterial({ roughness: .6 }), FLOWERS);
  const flowerColors = ['#ffffff', '#ffd84a', '#b58cff', '#ff7a7a', '#7fb3ff'];
  const flowerData = Array.from({ length: FLOWERS }, (_, i) => ({ side: i % 2 ? -1 : 1, off: 5.2 + rand() * 8, z: rand() * 180, h: rand() * .9 }));
  flowerData.forEach((d, i) => flowers.setColorAt(i, new T.Color(flowerColors[i % flowerColors.length])));
  scene.add(flowers);
  // Funghi del sottobosco: gambo chiaro e cappello rosso a pois.
  const SHROOMS = 36;
  const stemGeo = new T.CylinderGeometry(.05, .07, .22, 8); stemGeo.translate(0, .11, 0);
  const capGeo = new T.SphereGeometry(.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); capGeo.translate(0, .2, 0);
  const shroomStems = new T.InstancedMesh(stemGeo, mat('#efe6d2', .8), SHROOMS);
  const shroomCaps = new T.InstancedMesh(capGeo, mat('#d0301f', .5), SHROOMS);
  const shroomData = Array.from({ length: SHROOMS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 5 + rand() * 4, z: rand() * 180, s: .8 + rand() * 1.2, h: rand() * .9 }));
  scene.add(shroomStems, shroomCaps);
  const shrubs = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), mat('#567342'), 100);
  shrubs.receiveShadow = true; scene.add(shrubs);

  // Pozzanghere: stagni ai lati, staccionata di legno e balle di fieno nei prati.
  const PONDS = 14;
  const pondMat = new T.MeshStandardMaterial({ color: '#4f8fa0', roughness: .05, metalness: .35, transparent: true, opacity: .9 });
  const ponds = new T.InstancedMesh(new T.CircleGeometry(1, 24), pondMat, PONDS);
  const pondData = Array.from({ length: PONDS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 9 + rand() * 9, z: i * 12.8 + rand() * 4, sx: 2.5 + rand() * 3, sz: 3 + rand() * 4, h: rand() * .7 }));
  ponds.receiveShadow = true; scene.add(ponds);
  const FENCE = 44;
  const posts = new T.InstancedMesh(new T.BoxGeometry(.13, 1.1, .13), bark, FENCE);
  const rails = new T.InstancedMesh(new T.BoxGeometry(.06, .09, 1), mat('#8a6a46', .9), FENCE * 2);
  posts.castShadow = rails.castShadow = true; scene.add(posts, rails);
  const HAYS = 16;
  const hayGeo = new T.CylinderGeometry(.75, .75, 1.2, 18); hayGeo.rotateZ(Math.PI / 2);
  const hayMat = mat('#d6b04c', .95);
  const hays = new T.InstancedMesh(hayGeo, hayMat, HAYS);
  const hayData = Array.from({ length: HAYS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 10 + rand() * 14, z: i * 11.3 + rand() * 5, r: rand() * 3, h: rand() * .7 }));
  hays.castShadow = hays.receiveShadow = true; scene.add(hays);
  // Salitone: ometti di pietra lungo il pascolo.
  const CAIRNS = 18;
  const cairnGeo = (() => {
    const parts = [[.42, .16, 0], [.33, .14, .27], [.25, .12, .5], [.16, .1, .69]];
    const geos = parts.map(([r, h, y]) => { const g = new T.DodecahedronGeometry(1, 0); g.scale(r, h * 1.6, r * .9); g.translate((y * 7 % 2 - 1) * .03, y + h, 0); return g; });
    return mergeGeometries(geos);
  })();
  const cairns = new T.InstancedMesh(cairnGeo, stone, CAIRNS);
  const cairnData = Array.from({ length: CAIRNS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 6 + rand() * 10, z: i * 10.1 + rand() * 5, s: .8 + rand() * .8, h: rand() * .8 }));
  cairns.castShadow = true; scene.add(cairns);
  // Mulattiera: piloni votivi (muro bianco, tetto di lose, nicchia blu).
  const SHRINES = 4;
  const shrineBody = new T.InstancedMesh(new T.BoxGeometry(.9, 2.1, .7), mat('#e9e2d2', .9), SHRINES);
  const shrineRoof = new T.InstancedMesh((() => { const g = new T.ConeGeometry(.8, .55, 4); g.rotateY(Math.PI / 4); g.scale(1, 1, .85); return g; })(), mat('#5f6264', .9), SHRINES);
  const shrineNiche = new T.InstancedMesh(new T.BoxGeometry(.5, .6, .05), mat('#3d63a8', .6), SHRINES);
  shrineBody.castShadow = shrineRoof.castShadow = true; scene.add(shrineBody, shrineRoof, shrineNiche);

  function vergeDetails(t) {
    const keep = 1 - trail.rough * .75;
    tuftData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * (d.off * (trail.width * .5 + .5));
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .02, z);
      dummy.rotation.set(0, d.r, 0); dummy.scale.set(d.s, d.s * keep, d.s); put(tufts, i);
    });
    fernData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [1, .15, 0, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .03, z);
      dummy.rotation.set(0, d.r, 0); dummy.scale.set(d.s * v, d.s * .7 * v, d.s * v); put(ferns, i);
    });
    reedData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [0, 1, .05, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .03, z);
      dummy.rotation.set(0, d.r, 0); dummy.scale.set(d.s * .7 * v, d.s * 3 * v, d.s * .7 * v); put(reeds, i);
    });
    flowerData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [.2, .7, 1, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) + .32, z);
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(v); put(flowers, i);
    });
    shroomData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [1, .05, 0, 0], d.h) * d.s;
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .02, z);
      dummy.rotation.set(0, i, (i % 3 - 1) * .15); dummy.scale.setScalar(v); put(shroomStems, i); put(shroomCaps, i);
    });
    for (let i = 0; i < 100; i++) {
      const z = wrapZ(i * 1.81, t), side = i % 2 ? 1 : -1, w = side * (5.1 * trail.width + (i % 4) * .54), size = (.20 + (i % 5) * .055) * (1 - trail.rough * .65);
      dummy.position.set(center(z, t) + w, ground(z, t, w) + size * .35, z);
      dummy.rotation.set(i * .1, i * 2, 0); dummy.scale.set(size * 1.8, size * .8, size); put(shrubs, i);
    }
    pondData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [0, 1, 0, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) + .04, z);
      dummy.rotation.set(-Math.PI / 2, 0, i); dummy.scale.set(d.sx * v, d.sz * v, 1); put(ponds, i);
    });
    for (let i = 0; i < FENCE; i++) {
      const z = wrapZ(i * 4.1, t), z2 = z - 4.1, w = 6.4 * trail.width, v = vis(z, [0, 1, .15, 0], .35);
      const x = center(z, t) + w, y = ground(z, t, w), x2 = center(z2, t) + w, y2 = ground(z2, t, w);
      dummy.position.set(x, y + .5 * v, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(v); put(posts, i);
      const len = Math.hypot(x2 - x, z2 - z, y2 - y);
      for (const [k, hh] of [[0, .45], [1, .85]]) {
        dummy.position.set((x + x2) / 2, (y + y2) / 2 + hh * v, (z + z2) / 2);
        dummy.rotation.set(Math.atan2(y2 - y, z - z2), Math.atan2(x - x2, z - z2), 0, 'YXZ');
        dummy.scale.set(v, v, len * v); put(rails, i * 2 + k); dummy.rotation.order = 'XYZ';
      }
    }
    hayData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [0, 1, .2, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) + .7 * v, z);
      dummy.rotation.set(0, d.r, 0); dummy.scale.setScalar(v); put(hays, i);
    });
    cairnData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [0, 0, 1, .4], d.h) * d.s;
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .05, z);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(v); put(cairns, i);
    });
    for (let i = 0; i < SHRINES; i++) {
      const z = wrapZ(i * 45 + 20, t), w = 5.3 * trail.width + 1.2, v = vis(z, [0, 0, 0, 1], .3);
      const x = center(z, t) + w, y = ground(z, t, w);
      dummy.rotation.set(0, -.4, 0); dummy.scale.setScalar(v);
      dummy.position.set(x, y + 1.05 * v, z); put(shrineBody, i);
      dummy.position.set(x, y + 2.37 * v, z); put(shrineRoof, i);
      dummy.position.set(x - .2 * v, y + 1.5 * v, z - .26 * v); put(shrineNiche, i);
    }
    for (const m of [tufts, ferns, reeds, flowers, shroomStems, shroomCaps, shrubs, ponds, posts, rails, hays, cairns, shrineBody, shrineRoof, shrineNiche]) m.instanceMatrix.needsUpdate = true;
  }

  // Mulattiera: lastricato, muretto a secco e pareti di roccia.
  const paving = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), mat('#a5aaa5'), 180);
  const wall = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), mat('#717972'), 120);
  const cliff = new T.InstancedMesh(new T.DodecahedronGeometry(1, 1), mat('#7c847e'), 54);
  paving.receiveShadow = wall.receiveShadow = cliff.receiveShadow = true;
  scene.add(paving, wall, cliff);
  function muleScenery(t) {
    paving.visible = wall.visible = cliff.visible = trail.rough > .01;
    if (!paving.visible) return;
    for (let i = 0; i < 180; i++) {
      const z = wrapZ(i * 1.02, t), w = Math.sin(i * 83.3) * 2.12;
      dummy.position.set(center(z, t) + w, height(z, t) - .02, z);
      dummy.rotation.set(Math.atan(slope(z, t)), i * 2.3, 0);
      dummy.scale.set(.18 + (i % 4) * .06, (.04 + (i % 3) * .012) * trail.rough, .22 + (i % 3) * .07);
      dummy.updateMatrix(); paving.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 120; i++) {
      const z = wrapZ(Math.floor(i / 3) * 4.5, t), level = i % 3;
      dummy.position.set(center(z, t) - 4.65 * trail.width - .45, height(z, t) + .22 + level * .49, z);
      dummy.rotation.set(0, i * .37, 0); dummy.scale.set(.58, .34 * trail.rough, 1.18); dummy.updateMatrix(); wall.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 54; i++) {
      const z = wrapZ(Math.floor(i / 3) * 10, t), layer = i % 3, w = -4.65 * trail.width - 1.5 - layer * 2.0;
      dummy.position.set(center(z, t) + w, height(z, t) + bank(w, z) + .15, z);
      dummy.rotation.set(.15 * Math.sin(i), i * .67, .24);
      dummy.scale.set(1.2 + layer * .4, (.8 + layer * .55) * trail.rough, 2.1 + (i % 4) * .25);
      dummy.updateMatrix(); cliff.setMatrixAt(i, dummy.matrix);
    }
    paving.instanceMatrix.needsUpdate = wall.instanceMatrix.needsUpdate = cliff.instanceMatrix.needsUpdate = true;
  }

  // ---------- Montagne: due creste con foschia ----------
  const ridges = [];
  function makeRidge(zStart, depth, base, amp, phase, cols) {
    const pos = [], idx = [], heights = [];
    for (let j = 0; j <= 14; j++) for (let i = 0; i <= 90; i++) {
      const x = -260 + i * 5.8, z = zStart - j * depth;
      const crest = Math.pow(Math.sin(j / 14 * Math.PI), 1.15);
      const peaks = amp + amp * .55 * Math.sin(x * .037 + phase) + amp * .35 * Math.sin(x * .101 + phase * 2) + amp * .2 * Math.cos(x * .19 + phase);
      const y = base + crest * peaks;
      pos.push(x, y, z); heights.push(y);
      if (j < 14 && i < 90) { const k = j * 91 + i; idx.push(k, k + 1, k + 91, k + 1, k + 92, k + 91); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pos.length), 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
    m.userData = { heights, cols };
    scene.add(m); ridges.push(m);
  }
  makeRidge(-235, 8, 4, 50, 2.1, { snow: 70, haze: .38 });
  makeRidge(-140, 6, 2, 26, .4, { snow: 999, haze: .12 });
  // Montagne non illuminate: l'ombreggiatura è calcolata qui, così restano leggibili con ogni cielo.
  function paintRidges(p) {
    const horizon = new T.Color(p.horizon), base = new T.Color(p.ridge), snow = new T.Color('#f4f6f2'), dark = new T.Color(p.ridge).multiplyScalar(.55);
    const light = new T.Vector3(p.sunDir[0], Math.max(.35, p.sunDir[1]), .4).normalize(), n = new T.Vector3();
    for (const r of ridges) {
      const c = r.geometry.attributes.color, nr = r.geometry.attributes.normal, { heights, cols } = r.userData, tmp = new T.Color();
      for (let i = 0; i < heights.length; i++) {
        const y = heights[i];
        n.fromBufferAttribute(nr, i);
        const shade = .5 + .75 * Math.max(0, n.dot(light));
        tmp.copy(r === ridges[1] ? dark : base).multiplyScalar(shade * (.92 + .1 * Math.sin(i * 1.7)));
        if (y > cols.snow) tmp.lerp(snow.clone().multiplyScalar(.75 + shade * .3), Math.min(1, (y - cols.snow) / 9));
        tmp.lerp(horizon, cols.haze + (1 - Math.min(1, y / 70)) * .18);
        c.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      c.needsUpdate = true;
    }
  }

  // Unisce più geometrie (posizione, normali, uv) in una sola.
  function mergeGeometries(geos) {
    let vc = 0, ic = 0;
    for (const g of geos) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uvs = new Float32Array(vc * 2), idx = new Uint32Array(ic);
    let vo = 0, io = 0;
    for (const g of geos) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
      if (g.attributes.uv) uvs.set(g.attributes.uv.array, vo * 2);
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
      else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
      vo += n;
    }
    const m = new T.BufferGeometry();
    m.setAttribute('position', new T.BufferAttribute(pos, 3)); m.setAttribute('normal', new T.BufferAttribute(nor, 3)); m.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    m.setIndex(new T.BufferAttribute(idx, 1)); return m;
  }
  // Unisce i pezzi fissi di un gruppo per materiale: stessa grafica, molte meno chiamate di disegno.
  function mergeGroup(group) {
    const buckets = new Map();
    for (const child of [...group.children]) {
      if (!child.isMesh || child.userData.keep || Array.isArray(child.material)) continue;
      child.updateMatrix();
      const g = child.geometry.clone(); g.applyMatrix4(child.matrix);
      if (!buckets.has(child.material)) buckets.set(child.material, { geos: [], cast: false });
      const b = buckets.get(child.material); b.geos.push(g); b.cast ||= child.castShadow;
      group.remove(child);
    }
    for (const [material, b] of buckets) {
      let vc = 0, ic = 0;
      for (const g of b.geos) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uvs = new Float32Array(vc * 2), idx = new Uint32Array(ic);
      const hasColor = b.geos.every(g => g.attributes.color), col = hasColor ? new Float32Array(vc * 3) : null;
      let vo = 0, io = 0;
      for (const g of b.geos) {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
        if (g.attributes.uv) uvs.set(g.attributes.uv.array, vo * 2);
        if (col) col.set(g.attributes.color.array, vo * 3);
        if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
        else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
        vo += n; g.dispose();
      }
      const merged = new T.BufferGeometry();
      merged.setAttribute('position', new T.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new T.BufferAttribute(nor, 3));
      merged.setAttribute('uv', new T.BufferAttribute(uvs, 2));
      if (col) merged.setAttribute('color', new T.BufferAttribute(col, 3));
      merged.setIndex(new T.BufferAttribute(idx, 1));
      const m = new T.Mesh(merged, material); m.castShadow = b.cast; m.receiveShadow = true; group.add(m);
    }
  }

  // ---------- Moto da enduro (rig articolato) ----------
  // bike: posizione, piega e imbardata · pitch: beccheggio e impennata
  // chassis: parte sospesa (si abbassa e beccheggia con le sospensioni)
  // front: sterzo con forcella, manubrio e ruota anteriore · rider/upper/body/head: pilota
  const bike = new T.Group(); scene.add(bike);
  const pitch = new T.Group(); bike.add(pitch);
  const chassis = new T.Group(); pitch.add(chassis);
  const STEER_Z = -.62;
  const front = new T.Group(); front.position.set(0, 0, STEER_Z); chassis.add(front);
  const F = (x, y, z) => [x, y, z - STEER_Z];
  const wheels = [];
  function wheel(parent, x, y, z) {
    const root = new T.Group(); root.position.set(x, y, z); parent.add(root);
    const torus = mesh(new T.TorusGeometry(.36, .115, 12, 32), rubber, root); torus.rotation.y = Math.PI / 2;
    const rim = mesh(new T.TorusGeometry(.29, .024, 8, 32), alloy, root); rim.rotation.y = Math.PI / 2;
    rod([-.10, 0, 0], [.10, 0, 0], .075, alloy, root);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rod([0, 0, 0], [0, Math.cos(a) * .29, Math.sin(a) * .29], .009, alloy, root); }
    for (let i = 0; i < 22; i++) { const a = i * Math.PI * 2 / 22; for (const side of [-1, 1]) { const lug = box(.09, .06, .095, treadMat, root, side * .07, Math.cos(a) * .465, Math.sin(a) * .465); lug.rotation.x = a; } }
    wheels.push(root); return root;
  }
  const rearWheel = wheel(pitch, 0, .47, .82);
  const frontWheel = wheel(front, 0, .47, -.86 - STEER_Z);
  // Telaio, forcellone, mono, motore, serbatoio, sella
  rod([-.13, .48, .82], [-.13, .72, -.2], .035, alloy, chassis); rod([.13, .48, .82], [.13, .72, -.2], .035, alloy, chassis);
  rod([0, .64, .2], [0, 1.12, .46], .055, gold, chassis);
  for (let i = 0; i < 7; i++) { const coil = mesh(new T.TorusGeometry(.071, .014, 5, 10), spring, chassis); coil.position.set(0, .77 + i * .041, .25 + i * .018); coil.rotation.x = Math.PI / 2; }
  for (const side of [-1, 1]) {
    rod(F(side * .14, .62, -.81), F(side * .14, 1.28, -.59), .032, gold, front);
    rod(F(side * .14, .48, -.86), F(side * .14, .87, -.73), .045, alloy, front);
    rod([side * .18, .67, .16], [side * .15, 1.16, -.40], .035, plastic, chassis);
    rod([side * .18, .67, .16], [side * .14, 1.0, .53], .035, plastic, chassis);
  }
  ball(.22, .26, .24, alloy, chassis, 0, .73, -.1);
  for (let i = 0; i < 5; i++) box(.40, .018, .32, black, chassis, 0, .69 + i * .055, -.1);
  ball(.24, .25, .34, plastic, chassis, 0, 1.12, -.29);
  const seat = box(.26, .10, .82, black, chassis, 0, 1.24, .22); seat.rotation.x = -.08;
  const tail = box(.29, .055, .66, plastic, chassis, 0, 1.22, .85); tail.rotation.x = .13;
  const brakeLightMat = new T.MeshStandardMaterial({ color: '#fc441f', roughness: .3, emissive: '#ff2a00', emissiveIntensity: .3 });
  box(.17, .06, .035, brakeLightMat, chassis, 0, 1.17, 1.13);
  const fender = box(.25, .06, .85, plastic, front, ...F(0, 1.02, -.92)); fender.rotation.x = -.05;
  for (const side of [-1, 1]) { const panel = box(.055, .29, .43, white, chassis, side * .24, 1.04, .43); panel.rotation.x = .12; box(.06, .22, .28, plastic, chassis, side * .26, 1.12, -.33); }
  rod([.25, .95, .25], [.31, 1.16, .87], .075, alloy, chassis); rod([.31, 1.16, .86], [.31, 1.18, .96], .058, black, chassis);
  rod(F(0, 1.27, -.61), F(0, 1.48, -.55), .04, alloy, front); rod(F(-.48, 1.47, -.55), F(.48, 1.47, -.55), .027, alloy, front);
  for (const side of [-1, 1]) { rod(F(side * .34, 1.47, -.55), F(side * .48, 1.47, -.55), .04, black, front); ball(.14, .06, .09, plastic, front, ...F(side * .48, 1.49, -.61)); }
  const numberPlate = box(.26, .30, .055, white, front, ...F(0, 1.37, -.68)); numberPlate.rotation.x = -.18;
  box(.32, .045, .42, alloy, chassis, 0, .48, -.1);
  for (const side of [-1, 1]) { box(.07, .27, .29, black, chassis, side * .21, 1.01, -.35); for (let i = 0; i < 5; i++) box(.08, .016, .26, alloy, chassis, side * .22, .91 + i * .046, -.35); }
  const rearDisc = mesh(new T.TorusGeometry(.15, .023, 6, 20), alloy, rearWheel); rearDisc.rotation.y = Math.PI / 2; rearDisc.position.x = .115;
  const frontDisc = mesh(new T.TorusGeometry(.17, .02, 6, 22), alloy, frontWheel); frontDisc.rotation.y = Math.PI / 2; frontDisc.position.x = -.115;

  // Fiamma di scarico del turbo.
  const flameMat = new T.MeshBasicMaterial({ color: '#ffb12b', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
  const flame = new T.Mesh(new T.ConeGeometry(.09, .55, 10, 1, true), flameMat);
  flame.rotation.x = -Math.PI / 2; flame.position.set(.31, 1.18, 1.22); flame.userData.keep = true; chassis.add(flame);
  const flameCore = new T.Mesh(new T.ConeGeometry(.05, .32, 8, 1, true), new T.MeshBasicMaterial({ color: '#fff4c4', transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  flameCore.rotation.x = -Math.PI / 2; flameCore.position.set(.31, 1.18, 1.1); flameCore.userData.keep = true; chassis.add(flameCore);

  // Pilota: gambe sulle pedane (fisse), busto che si alza, braccia e cosce che si adattano.
  const rider = new T.Group(); chassis.add(rider);
  const upper = new T.Group(); rider.add(upper);
  ball(.23, .17, .21, pantsMat, upper, 0, 1.39, .27);
  const body = new T.Group(); body.position.set(0, 1.42, .25); upper.add(body);
  const B = (x, y, z) => [x, y - 1.42, z - .25];
  const jersey = ball(.28, .36, .18, jerseyMat, body, ...B(0, 1.77, .18)); jersey.rotation.x = -.23;
  const anchor = (parent, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const joints = [];
  for (const side of [-1, 1]) {
    ball(.10, .32, .17, black, body, ...B(side * .24, 1.75, .19));
    rod([side * .35, 1.12, .07], [side * .31, .83, .22], .09, white, rider);
    box(.14, .10, .30, black, rider, side * .31, .78, .11);
    joints.push({
      side,
      hip: anchor(upper, side * .16, 1.43, .27), knee: anchor(rider, side * .35, 1.12, .07),
      shoulder: anchor(body, ...B(side * .23, 1.97, .09)), grip: anchor(front, ...F(side * .43, 1.49, -.53)),
    });
  }
  const head = new T.Group(); head.position.set(...B(0, 2.17, .035)); body.add(head);
  ball(.225, .245, .24, helmetMat, head, 0, 0, 0);
  ball(.235, .10, .12, black, head, 0, -.01, -.17);
  box(.40, .025, .29, accent, head, 0, .16, -.16);
  ball(.17, .14, .20, accent, head, 0, .15, .015);
  box(.20, .12, .15, helmetMat, head, 0, -.15, -.20);
  for (const side of [-1, 1]) box(.025, .085, .24, black, head, side * .216, 0, .03);
  const strapMat = mat('#313b39', .75), bootTrim = mat('#b6b7a8', .5);
  for (const side of [-1, 1]) {
    rod(B(side * .20, 2.00, .30), B(side * .21, 1.58, .32), .025, strapMat, body);
    rod(B(side * .12, 2.06, .19), B(side * .20, 2.00, .30), .029, strapMat, body);
    box(.12, .05, .025, accent, body, ...B(side * .19, 1.64, .35));
    for (let i = 0; i < 3; i++) box(.15, .026, .025, bootTrim, rider, side * .31, .87 + i * .068, .30);
    ball(.11, .10, .12, accent, rider, side * .35, 1.14, .03);
  }
  // Arti dinamici: cilindri unitari orientati ogni fotogramma tra due giunti.
  const unitCyl = r => new T.CylinderGeometry(r, r, 1, 12);
  const limbs = [];
  for (const j of joints) {
    j.thigh = mesh(unitCyl(.105), pantsMat, rider); j.thigh.userData.keep = true;
    j.upperArm = mesh(unitCyl(.085), jerseyMat, rider); j.upperArm.userData.keep = true;
    j.forearm = mesh(unitCyl(.075), black, rider); j.forearm.userData.keep = true;
    j.glove = ball(.08, .08, .075, black, rider); j.glove.userData.keep = true;
    j.elbowBall = ball(.08, .08, .08, jerseyMat, rider); j.elbowBall.userData.keep = true;
    limbs.push(j);
  }
  const _a = new T.Vector3(), _b = new T.Vector3(), _e = new T.Vector3(), _up = new T.Vector3(0, 1, 0), _d = new T.Vector3();
  function placeLimb(m, a, b) {
    _d.subVectors(b, a); const len = _d.length();
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(_up, _d.normalize());
    m.scale.set(1, len, 1);
  }
  function updateLimbs() {
    bike.updateMatrixWorld(true);
    for (const j of limbs) {
      const hip = rider.worldToLocal(j.hip.getWorldPosition(_a));
      const knee = rider.worldToLocal(j.knee.getWorldPosition(_b));
      placeLimb(j.thigh, hip, knee);
      const sh = rider.worldToLocal(j.shoulder.getWorldPosition(_a));
      const grip = rider.worldToLocal(j.grip.getWorldPosition(_b));
      // Gomito: a metà tra spalla e mano, spinto in fuori e verso l'alto (posizione d'attacco).
      _e.copy(sh).lerp(grip, .5); _e.x += j.side * .13; _e.y += .06;
      const reach = sh.distanceTo(grip); _e.z += Math.max(0, .62 - reach) * .4;
      placeLimb(j.upperArm, sh, _e); placeLimb(j.forearm, _e, grip);
      j.glove.position.copy(grip); j.elbowBall.position.copy(_e);
    }
  }
  for (let i = 0; i < 14; i++) { const z = .13 + i * .051; box(.028, .022, .047, alloy, chassis, -.18, .49, z); }
  const sprocket = mesh(new T.TorusGeometry(.18, .028, 8, 28), alloy, rearWheel); sprocket.rotation.y = Math.PI / 2; sprocket.position.x = -.13;
  for (const side of [-1, 1]) { const stripe = box(.028, .012, .47, accent, chassis, side * .09, 1.263, .79); stripe.rotation.x = .13; box(.052, .13, .055, spring, front, ...F(side * .145, .57, -.85)); }

  // Nome e numero sulla schiena della maglia.
  const textCanvas = document.createElement('canvas'); textCanvas.width = 256; textCanvas.height = 128;
  const textCtx = textCanvas.getContext('2d');
  const decalTexture = new T.CanvasTexture(textCanvas); decalTexture.colorSpace = T.SRGBColorSpace;
  const decal = mesh(new T.PlaneGeometry(.37, .185), new T.MeshStandardMaterial({ map: decalTexture, roughness: 1 }), body);
  decal.position.set(...B(0, 1.80, .356)); decal.rotation.x = .2; decal.userData.keep = true;
  for (const g of [...wheels, chassis, front, rider, upper, body, head]) mergeGroup(g);

  // Orecchie da coniglio sul casco (troppi errori o acqua bevuta).
  const ears = new T.Group(); ears.position.set(0, .16, .06); head.add(ears); ears.visible = false;
  const earMat = mat('#f6f2ea', .75), earInner = mat('#f3a6c4', .6);
  const earPivots = [];
  for (const side of [-1, 1]) {
    const pv = new T.Group(); pv.position.set(side * .1, .05, 0); ears.add(pv);
    ball(.1, .44, .05, earMat, pv, 0, .42, 0);
    ball(.06, .33, .02, earInner, pv, 0, .42, -.04);
    ball(.06, .33, .02, earInner, pv, 0, .42, .04);
    pv.userData.side = side; earPivots.push(pv);
  }
  let earsScale = 0;

  // Stato dinamico della moto (molle e smorzatori, aggiornato in render).
  const dyn = { pitch: 0, pitchV: 0, cf: 0, vf: 0, cr: 0, vr: 0, stand: 0, steer: 0, crashSpin: 0, lastJump: 0, wheelie: 0 };
  let decalKey = '';
  function paintDecal(name, number, bg) {
    const key = name + number + bg; if (key === decalKey) return; decalKey = key;
    const c = new T.Color(bg), lum = c.r * .3 + c.g * .59 + c.b * .11;
    textCtx.fillStyle = bg; textCtx.fillRect(0, 0, 256, 128);
    textCtx.fillStyle = lum > .45 ? '#172127' : '#f7f3e6';
    textCtx.textAlign = 'center';
    textCtx.font = '900 62px Arial'; textCtx.fillText(String(number).padStart(2, '0'), 128, 62);
    textCtx.font = '900 25px Arial'; textCtx.fillText(name.toUpperCase(), 128, 106, 240);
    decalTexture.needsUpdate = true;
  }
  let liveryKey = '';
  function applyLivery(l) {
    if (!l || l.id === liveryKey) return; liveryKey = l.id;
    plastic.color.set(l.plastic); accent.color.set(l.accent); jerseyMat.color.set(l.jersey); pantsMat.color.set(l.pants); helmetMat.color.set(l.helmet);
    decalKey = '';
  }

  // ---------- Ostacoli, tappi e power-up ----------
  const capTexture = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(54, 50, 6, 64, 64, 64); g.addColorStop(0, '#fff3a6'); g.addColorStop(.6, '#ffcf16'); g.addColorStop(1, '#c48a0c');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#d6371f'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#d6371f'; x.font = '900 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EDT', 64, 66);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  const capGeometry = (() => {
    const g = new T.CylinderGeometry(.36, .36, .1, 42, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r > .3) { const a = Math.atan2(z, x), k = Math.round(a / (Math.PI * 2 / 42)); const f = (k % 2 ? 1.09 : .97); p.setXYZ(i, x * f, p.getY(i), z * f); }
    }
    g.computeVertexNormals(); return g;
  })();
  const capSide = new T.MeshStandardMaterial({ color: '#e0a92a', roughness: .3, metalness: .75 });
  const capFace = new T.MeshStandardMaterial({ map: capTexture, roughness: .35, metalness: .35, emissive: '#4a3300', emissiveIntensity: .35 });
  const glowMats = {
    coin: new T.SpriteMaterial({ map: glowTex, color: '#ffd23a', transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }),
    helmet: new T.SpriteMaterial({ map: glowTex, color: '#55ffb0', transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false }),
    wine: new T.SpriteMaterial({ map: glowTex, color: '#ff2a5a', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false }),
    grappa: new T.SpriteMaterial({ map: glowTex, color: '#4fb8ff', transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false }),
  };
  glowMats.coin.color.set('#ffae1f');
  // Materiali di birre, bottiglie e nuovi ostacoli.
  const glassMat = new T.MeshStandardMaterial({ color: '#f6efd9', roughness: .05, metalness: .1, transparent: true, opacity: .38 });
  const beerMat = new T.MeshStandardMaterial({ color: '#f0a51a', roughness: .25, emissive: '#7a3f00', emissiveIntensity: .35 });
  const foamMat = mat('#fffaf0', .9);
  const wineGlass = new T.MeshStandardMaterial({ color: '#173a1f', roughness: .12, metalness: .2 });
  const wineLabel = mat('#8e1538', .6), labelCream = mat('#efe3c4', .8);
  const grappaGlass = new T.MeshStandardMaterial({ color: '#e8f6f6', roughness: .04, transparent: true, opacity: .45 });
  const grappaLiquid = new T.MeshStandardMaterial({ color: '#f3e7b2', roughness: .1, emissive: '#3d3510', emissiveIntensity: .3 });
  const goldCap = mat('#d9a826', .3, .7);
  const waterPlastic = new T.MeshStandardMaterial({ color: '#a9dcff', roughness: .1, transparent: true, opacity: .6 });
  const waterCap = mat('#1e6fd9', .4), waterLabel = mat('#ffffff', .6);
  const dangerRing = new T.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: .6, side: T.DoubleSide, depthWrite: false });
  const hayObs = mat('#dcb553', .95), twine = mat('#8f6a2c', .9), goatWhite = mat('#ece6da', .85), goatDark = mat('#3b332c', .8), hornMat = mat('#9c8a6a', .6);
  // Bottiglie al tornio: profilo (raggio, altezza).
  const lathe = (pts, seg = 18) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
  const WINE_BOTTLE = lathe([[0, 0], [.13, 0], [.135, .04], [.135, .5], [.11, .58], [.05, .66], [.045, .82], [.052, .84], [0, .85]]);
  const GRAPPA_BOTTLE = lathe([[0, 0], [.09, 0], [.095, .03], [.095, .62], [.07, .7], [.035, .76], [.035, .92], [0, .93]]);
  const WATER_BOTTLE = lathe([[0, 0], [.12, 0], [.13, .05], [.12, .12], [.13, .19], [.12, .26], [.13, .33], [.13, .42], [.09, .5], [.045, .55], [0, .56]]);
  const ringMat = new T.MeshBasicMaterial({ color: '#f5bc4a', transparent: true, opacity: .55, side: T.DoubleSide, depthWrite: false });
  const detailedRockGeometry = new T.IcosahedronGeometry(.65, 3);
  {
    const rp = detailedRockGeometry.attributes.position;
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i); const n = 1 + .08 * Math.sin(x * 19 + z * 27 + y * 7); rp.setXYZ(i, x * n, y * .77 + .51, z * n * .87); }
    detailedRockGeometry.computeVertexNormals();
    const rc = new Float32Array(rp.count * 3);
    for (let i = 0; i < rp.count; i++) { const a = .70 + .14 * Math.sin(rp.getX(i) * 18 + rp.getY(i) * 13) + .05 * Math.cos(rp.getZ(i) * 31); rc.set([a * .92, a * .98, a], i * 3); }
    detailedRockGeometry.setAttribute('color', new T.BufferAttribute(rc, 3));
  }
  const detailedStone = new T.MeshStandardMaterial({ color: '#b7c0c3', roughness: .94, vertexColors: true });
  const logCap = mat('#cda66c'), puddleRim = mat('#66503b', .9), puddleWater = mat('#5c949a', .08, .45), ripple = mat('#bdddd9', .22);
  const helmetShell = mat('#3ee28f', .3, .2), visorMat = mat('#1b2328', .2, .4), peakMat = mat('#ffffff', .4), magnetRed = mat('#e8263c', .35), magnetTip = mat('#dfe6ea', .25, .8);

  const rampDirt = mat('#7b5a38', .95), rampWood = mat('#b98a52', .8), rampLip = new T.MeshStandardMaterial({ color: '#ffd400', roughness: .6, emissive: '#3a2f00', emissiveIntensity: .25 });
  const obstacleMap = new Map(), pools = {};
  function hazardRing(g, r) { const ring = mesh(new T.RingGeometry(r, r + .08, 28), ringMat, g); ring.rotation.x = -Math.PI / 2; ring.position.y = .015; ring.castShadow = false; }
  function makeObstacle(type) {
    if (pools[type]?.length) return pools[type].pop();
    const g = new T.Group(); g.userData.type = type;
    if (type === 'rock') {
      mesh(detailedRockGeometry, detailedStone, g); hazardRing(g, .66);
    } else if (type === 'log' || type === 'bigLog') {
      const inner = new T.Group(); g.add(inner); g.userData.inner = inner;
      const len = type === 'bigLog' ? 1 : 1.65, rr = type === 'bigLog' ? .34 : .30;
      const m = mesh(new T.CylinderGeometry(rr, rr + .04, len, 14), bark, inner); m.rotation.z = Math.PI / 2; m.position.y = .32;
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; rod([-len / 2 + .02, .32 + Math.cos(a) * rr, Math.sin(a) * rr], [len / 2 - .02, .32 + Math.cos(a) * rr, Math.sin(a) * rr], .026, black, inner); }
      for (const side of [-1, 1]) { const cap = mesh(new T.CircleGeometry(rr - .03, 20), logCap, inner); cap.rotation.y = side * Math.PI / 2; cap.position.set(side * (len / 2 + .002), .32, 0); }
      if (type === 'bigLog') {
        // Cartello "SALTA!" sul tronco di traverso.
        const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
        x.fillStyle = '#ffcf16'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#1b1b1b';
        for (let i = -1; i < 9; i++) { x.beginPath(); x.moveTo(i * 32, 64); x.lineTo(i * 32 + 16, 64); x.lineTo(i * 32 + 40, 0); x.lineTo(i * 32 + 24, 0); x.fill(); }
        x.fillStyle = '#1b1b1b'; x.fillRect(70, 10, 116, 44); x.fillStyle = '#ffcf16'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.fillText('SALTA!', 128, 45);
        const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
        const sign = mesh(new T.PlaneGeometry(1.4, .35), new T.MeshBasicMaterial({ map: tx }), g); sign.position.set(0, .95, 0); sign.castShadow = false;
        for (const s of [-1, 1]) rod([s * .55, .55, 0], [s * .55, .8, 0], .03, black, g);
        g.userData.sign = sign;
      }
    } else if (type === 'root') {
      for (let i = 0; i < 3; i++) { const r = mesh(new T.CylinderGeometry(.08, .13, 1.7, 12), bark, g); r.rotation.z = Math.PI / 2; r.rotation.y = (i - 1) * .17; r.position.set(0, .12 + i * .06, (i - 1) * .23); }
    } else if (type === 'step') {
      box(1.55, .56, .65, detailedStone, g, 0, .28, 0);
      for (let i = 0; i < 3; i++) ball(.22, .09, .29, stone, g, (i - 1) * .44, .52, .02);
    } else if (type === 'puddle') {
      const rim = mesh(new T.CylinderGeometry(.91, .98, .028, 32), puddleRim, g); rim.scale.z = 1.22; rim.position.y = .008;
      const water = mesh(new T.CylinderGeometry(.83, .86, .015, 40), puddleWater, g); water.scale.z = 1.28; water.position.y = .035;
      for (let i = 0; i < 3; i++) { const rp = mesh(new T.TorusGeometry(.22 + i * .20, .01, 4, 40), ripple, g); rp.rotation.x = Math.PI / 2; rp.scale.y = 1.24; rp.position.set(.03, .049, 0); rp.castShadow = false; }
    } else if (type === 'coin') {
      // Boccale di birra con schiuma: si legge bene anche da lontano.
      const spin = new T.Group(); spin.position.y = 1.1; g.add(spin); g.userData.spin = spin;
      const mug = new T.Group(); mug.scale.setScalar(1.25); mug.position.y = -.3; spin.add(mug);
      mesh(new T.CylinderGeometry(.205, .19, .44, 18), beerMat, mug).position.y = .25;
      const glass = mesh(new T.CylinderGeometry(.235, .22, .52, 18, 1, true), glassMat, mug); glass.position.y = .27; glass.castShadow = false;
      mesh(new T.CylinderGeometry(.22, .22, .05, 18), glassMat, mug).position.y = .02;
      mesh(new T.CylinderGeometry(.24, .23, .09, 18), foamMat, mug).position.y = .52;
      for (let i = 0; i < 5; i++) { const a = i * 1.3; ball(.08, .07, .08, foamMat, mug, Math.cos(a) * .15, .58, Math.sin(a) * .15); }
      ball(.06, .1, .05, foamMat, mug, .2, .44, .08);
      const handle = mesh(new T.TorusGeometry(.13, .035, 8, 16, Math.PI), glassMat, mug); handle.rotation.z = -Math.PI / 2; handle.position.set(.24, .28, 0);
      const glow = new T.Sprite(glowMats.coin); glow.scale.setScalar(1.6); glow.position.y = 1.1; g.add(glow);
    } else if (type === 'helmet') {
      const spin = new T.Group(); spin.position.y = 1.15; g.add(spin); g.userData.spin = spin;
      ball(.34, .36, .36, helmetShell, spin);
      ball(.35, .14, .2, visorMat, spin, 0, -.02, -.22);
      box(.5, .03, .32, peakMat, spin, 0, .2, -.2);
      const glow = new T.Sprite(glowMats.helmet); glow.scale.setScalar(2); glow.position.y = 1.15; g.add(glow);
    } else if (type === 'wine') {
      // Bottiglia di rosso: verde scuro, etichetta bordeaux.
      const spin = new T.Group(); spin.position.y = .7; g.add(spin); g.userData.spin = spin;
      const b = new T.Group(); b.scale.setScalar(1.15); spin.add(b);
      mesh(WINE_BOTTLE, wineGlass, b);
      mesh(new T.CylinderGeometry(.138, .138, .2, 18, 1, true), wineLabel, b).position.y = .28;
      mesh(new T.CylinderGeometry(.139, .139, .06, 18, 1, true), labelCream, b).position.y = .28;
      mesh(new T.CylinderGeometry(.055, .052, .1, 12), wineLabel, b).position.y = .8;
      const glow = new T.Sprite(glowMats.wine); glow.scale.setScalar(2.1); glow.position.y = 1.15; g.add(glow);
    } else if (type === 'grappa') {
      // Grappa: bottiglia slanciata trasparente, tappo dorato, alone blu "da fuoco".
      const spin = new T.Group(); spin.position.y = .65; g.add(spin); g.userData.spin = spin;
      const b = new T.Group(); b.scale.setScalar(1.15); spin.add(b);
      mesh(new T.CylinderGeometry(.08, .08, .5, 14), grappaLiquid, b).position.y = .28;
      const gl = mesh(GRAPPA_BOTTLE, grappaGlass, b); gl.castShadow = false;
      mesh(new T.CylinderGeometry(.045, .042, .09, 12), goldCap, b).position.y = .95;
      mesh(new T.CylinderGeometry(.097, .097, .12, 16, 1, true), labelCream, b).position.y = .4;
      const glow = new T.Sprite(glowMats.grappa); glow.scale.setScalar(2.2); glow.position.y = 1.15; g.add(glow);
    } else if (type === 'water') {
      // Bottiglia d'acqua: da evitare! Cerchio rosso a terra come avviso.
      const spin = new T.Group(); spin.position.y = 0; g.add(spin); g.userData.spin = spin; g.userData.still = true;
      const pb = mesh(WATER_BOTTLE, waterPlastic, spin); pb.scale.setScalar(1.05); pb.castShadow = false;
      mesh(new T.CylinderGeometry(.134, .134, .12, 16, 1, true), waterLabel, spin).position.y = .24;
      mesh(new T.CylinderGeometry(.05, .05, .07, 12), waterCap, spin).position.y = .6;
      const ring = mesh(new T.RingGeometry(.42, .5, 28), dangerRing, g); ring.rotation.x = -Math.PI / 2; ring.position.y = .015; ring.castShadow = false;
    } else if (type === 'stump') {
      mesh(new T.CylinderGeometry(.36, .44, .55, 14), bark, g).position.y = .275;
      mesh(new T.CylinderGeometry(.34, .34, .02, 18), logCap, g).position.y = .555;
      for (let i = 0; i < 2; i++) { const r = mesh(new T.TorusGeometry(.12 + i * .1, .012, 4, 20), black, g); r.rotation.x = Math.PI / 2; r.position.y = .567; }
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4; rod([Math.cos(a) * .3, .12, Math.sin(a) * .3], [Math.cos(a) * .62, 0, Math.sin(a) * .62], .06, bark, g); }
      hazardRing(g, .62);
    } else if (type === 'hay') {
      const h = mesh(new T.CylinderGeometry(.4, .4, 1.5, 18), hayObs, g); h.rotation.z = Math.PI / 2; h.position.y = .4;
      for (const x of [-.4, .4]) { const t2 = mesh(new T.TorusGeometry(.405, .02, 6, 24), twine, g); t2.rotation.y = Math.PI / 2; t2.position.set(x, .4, 0); }
      for (const x of [-.751, .751]) { const c = mesh(new T.CircleGeometry(.38, 18), twine, g); c.rotation.y = Math.sign(x) * Math.PI / 2; c.position.set(x, .4, 0); }
    } else if (type === 'cairn') {
      const c = mesh(cairnGeo, stone, g); c.scale.setScalar(1.1); hazardRing(g, .55);
    } else if (type === 'goat') {
      // Capra di traverso sul sentiero, con corna e barbetta.
      ball(.42, .26, .21, goatWhite, g, 0, .6, 0);
      for (const [x, z] of [[-.28, -.11], [-.28, .11], [.27, -.11], [.27, .11]]) rod([x, .5, z], [x, .02, z], .04, goatDark, g);
      ball(.14, .15, .12, goatWhite, g, .46, .8, 0);
      ball(.08, .07, .08, goatDark, g, .58, .76, 0);
      for (const z of [-.06, .06]) { rod([.46, .92, z], [.36, 1.1, z * 1.6], .025, hornMat, g); ball(.06, .03, .025, goatWhite, g, .43, .88, z * 2.4); }
      rod([.55, .68, 0], [.53, .58, 0], .02, goatDark, g);
      rod([-.4, .68, 0], [-.48, .78, 0], .025, goatWhite, g);
      hazardRing(g, .6);
    } else if (type === 'ramp') {
      // Rampa di terra battuta con tavole e bordo giallo-nero: si prende in pieno per volare.
      const sh = new T.Shape(); sh.moveTo(1.0, 0); sh.lineTo(-.55, .62); sh.lineTo(-.75, .62); sh.lineTo(-.75, 0); sh.closePath();
      const geo = new T.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(.75, 0, 0);
      mesh(geo, rampDirt, g);
      for (let i = 0; i < 5; i++) { const k = i / 4, pl = box(1.52, .035, .2, rampWood, g, 0, .03 + k * .56, .82 - k * 1.34); pl.rotation.x = -Math.atan2(.62, 1.55); }
      box(1.56, .1, .12, rampLip, g, 0, .64, -.6);
      for (const sx of [-1, 1]) rod([sx * .8, .0, -.66], [sx * .8, 1.05, -.66], .035, black, g);
      const fl = box(.32, .2, .02, rampLip, g, -.66, .95, -.66); fl.castShadow = false;
    } else if (type === 'rollRock') {
      const inner = new T.Group(); inner.position.y = .55; g.add(inner); g.userData.roller = inner;
      const r = mesh(detailedRockGeometry, detailedStone, inner); r.position.y = -.55; r.scale.setScalar(.9);
      hazardRing(g, .62);
    }
    mergeGroup(g); if (g.userData.inner) mergeGroup(g.userData.inner); if (g.userData.spin) for (const c of g.userData.spin.children) if (c.isGroup) mergeGroup(c); if (g.userData.spin) mergeGroup(g.userData.spin); if (g.userData.roller) mergeGroup(g.userData.roller);
    return g;
  }

  // ---------- Particelle: terra dalla ruota, schizzi, scintille ----------
  const PARTS = 70;
  const partMat = new T.MeshStandardMaterial({ color: '#8b6f4a', roughness: 1 });
  const parts = new T.InstancedMesh(new T.IcosahedronGeometry(.07, 0), partMat, PARTS);
  parts.castShadow = false; scene.add(parts);
  const pData = Array.from({ length: PARTS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }));
  let pNext = 0, emitAcc = 0;
  function emit(x, y, z, vx, vy, vz, s = 1) { const p = pData[pNext]; pNext = (pNext + 1) % PARTS; Object.assign(p, { life: 1, x, y, z, vx, vy, vz, s }); }

  // Solco della gomma dietro la moto: segue le traiettorie reali tra le corsie.
  const TRACKS = 56;
  const trackMat = new T.MeshBasicMaterial({ color: '#3b2a1a', transparent: true, opacity: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const trackGeo = new T.PlaneGeometry(.17, 1); trackGeo.rotateX(-Math.PI / 2);
  const tracks = new T.InstancedMesh(trackGeo, trackMat, TRACKS); tracks.renderOrder = 1; scene.add(tracks);
  const trackHist = [];
  const dustMaterial = new T.MeshBasicMaterial({ color: '#ceba8c', transparent: true, opacity: .22, depthWrite: false });
  const dust = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), dustMaterial, 24); scene.add(dust);

  const sparkMaterial = new T.MeshBasicMaterial({ color: '#ffdb43', transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending });
  const sparks = new T.InstancedMesh(new T.OctahedronGeometry(.07, 0), sparkMaterial, 26); scene.add(sparks);
  let lastEvent = 0, eventAt = -100, eventX = 0, eventY = 1.1;

  const auraMaterial = new T.MeshBasicMaterial({ color: '#ffd438', transparent: true, opacity: .58, depthWrite: false, blending: T.AdditiveBlending });
  const aura = mesh(new T.TorusGeometry(.85, .032, 6, 36), auraMaterial, bike); aura.rotation.x = Math.PI / 2; aura.position.y = .07; aura.castShadow = aura.receiveShadow = false;
  const magnetAura = mesh(new T.TorusGeometry(1.25, .025, 6, 40), new T.MeshBasicMaterial({ color: '#d4145a', transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending }), bike);
  magnetAura.rotation.x = Math.PI / 2; magnetAura.position.y = .1; magnetAura.castShadow = magnetAura.receiveShadow = false;

  // ---------- Paletti, arrivo e rifugio ----------
  const markers = new T.InstancedMesh(new T.BoxGeometry(.10, 1.1, .10), white, 36);
  const pennants = new T.InstancedMesh(new T.BoxGeometry(.38, .28, .035), plastic, 36);
  scene.add(markers, pennants);
  // Fettuccia bianco-rossa tra i paletti e frecce gialle del percorso, come in una vera gara di enduro.
  const tapeCanvas = document.createElement('canvas'); tapeCanvas.width = 128; tapeCanvas.height = 8;
  { const c = tapeCanvas.getContext('2d'); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f2f2ee' : '#e3261c'; c.fillRect(i * 16, 0, 16, 8); } }
  const tapeTex = new T.CanvasTexture(tapeCanvas); tapeTex.colorSpace = T.SRGBColorSpace; tapeTex.wrapS = T.RepeatWrapping; tapeTex.repeat.set(2, 1);
  const tapeGeo = new T.PlaneGeometry(1, .07); tapeGeo.translate(.5, 0, 0);
  const tapes = new T.InstancedMesh(tapeGeo, new T.MeshBasicMaterial({ map: tapeTex, side: T.DoubleSide }), 144); tapes.frustumCulled = false; scene.add(tapes);
  const arrowCanvas = document.createElement('canvas'); arrowCanvas.width = arrowCanvas.height = 128;
  { const c = arrowCanvas.getContext('2d'); c.fillStyle = '#ffd400'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeRect(4, 4, 120, 120);
    c.fillStyle = '#111'; c.beginPath(); c.moveTo(22, 52); c.lineTo(70, 52); c.lineTo(70, 28); c.lineTo(110, 64); c.lineTo(70, 100); c.lineTo(70, 76); c.lineTo(22, 76); c.closePath(); c.fill(); }
  const arrowTex = new T.CanvasTexture(arrowCanvas); arrowTex.colorSpace = T.SRGBColorSpace;
  const arrows = new T.InstancedMesh(new T.PlaneGeometry(.55, .55), new T.MeshBasicMaterial({ map: arrowTex, side: T.DoubleSide }), 18); arrows.frustumCulled = false; scene.add(arrows);

  const finish = new T.Group(); scene.add(finish);
  for (const s of [-1, 1]) box(.2, 4.2, .2, bark, finish, s * 4.4, 2.1, 0);
  box(9, .22, .22, bark, finish, 0, 4.15, 0);
  const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 1024; bannerCanvas.height = 128;
  const bc = bannerCanvas.getContext('2d');
  for (let i = 0; i < 32; i++) { bc.fillStyle = i % 2 ? '#191b19' : '#f4f0e4'; bc.fillRect(i * 32, 0, 32, 20); bc.fillRect(i * 32 + 16 * (i % 2 ? -1 : 1), 108, 32, 20); }
  bc.fillStyle = '#191b19'; bc.fillRect(0, 20, 1024, 88);
  bc.fillStyle = '#ffce22'; bc.font = '900 64px Arial'; bc.textAlign = 'center'; bc.fillText('RIFUGIO EDT • COSÌ SI FA!', 512, 86);
  const bt = new T.CanvasTexture(bannerCanvas); bt.colorSpace = T.SRGBColorSpace;
  const sign = mesh(new T.PlaneGeometry(8.5, 1.06), new T.MeshStandardMaterial({ map: bt, side: T.DoubleSide }), finish); sign.position.set(0, 3.55, .05);
  // Il rifugio: muri in legno, tetto in pietra, porta e panca.
  const hut = new T.Group(); hut.position.set(7.5, 0, -6); hut.rotation.y = -.5; finish.add(hut);
  box(5.2, 2.6, 4, mat('#8a5a35', .9), hut, 0, 1.3, 0);
  box(5.4, .5, 4.2, mat('#77736a', .95), hut, 0, .25, 0);
  const roof = mesh(new T.ConeGeometry(4.3, 2.1, 4, 1), mat('#5c5f62', .9), hut); roof.position.y = 3.6; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .85);
  box(1, 1.7, .1, mat('#4a2f1c'), hut, -.8, .95, -2.02);
  for (const x of [.9, 1.9]) box(.7, .6, .08, mat('#f6d27a', .3), hut, x - .2, 1.6, -2.02);
  box(2, .12, .5, bark, hut, -.2, .55, -2.6);
  mergeGroup(hut); mergeGroup(finish);

  // ---------- Atmosfera ----------
  let presetIndex = -1;
  function applyPreset(i) {
    if (i === presetIndex) return; presetIndex = i;
    const p = PRESETS[i] || PRESETS[0];
    skyUniforms.uTop.value.set(p.top); skyUniforms.uHorizon.value.set(p.horizon);
    skyUniforms.uSunDir.value.set(...p.sunDir).normalize(); skyUniforms.uSun.value.set(p.sunColor);
    skyUniforms.uCloud.value.set(p.cloud); skyUniforms.uClouds.value = p.clouds;
    scene.fog.color.set(p.fog); fogBase.near = p.fogNear; fogBase.far = p.fogFar;
    sun.color.set(p.light); sun.intensity = p.lightI;
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiI;
    renderer.toneMappingExposure = p.exposure;
    paintRidges(p);
  }
  applyPreset(0);

  // ---------- Qualità adattiva: se il telefono fatica, alleggerisce ----------
  let frameAvg = 16, frames = 0, quality = 0, lastNow = performance.now();
  function adaptQuality() {
    const now = performance.now(), dt = now - lastNow; lastNow = now;
    if (dt > 200) return;
    frameAvg += (dt - frameAvg) * .05; frames++;
    if (frames > 120 && frameAvg > 27 && quality < 3) {
      frames = 0; quality++;
      if (quality === 1) { pixelRatio = Math.min(pixelRatio, 1.15); renderer.setPixelRatio(pixelRatio); resize(); }
      if (quality === 2) { sun.shadow.mapSize.set(768, 768); sun.shadow.map?.dispose(); sun.shadow.map = null; tufts.visible = false; }
      if (quality === 3) { pixelRatio = .85; renderer.setPixelRatio(pixelRatio); resize(); }
    }
  }

  let camLift = 0, camX = 0, lastRender = performance.now(), wasAir = false, shakeX = 0, shakeY = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < .8 ? 68 : 53;
    camera.updateProjectionMatrix();
  }

  // ---------- Atmosfera per sezione: foglie che cadono, pioggia, pollini/polvere ----------
  const LEAVES = 70, DROPS = 260, MOTES = 90;
  const leafGeo = new T.PlaneGeometry(.2, .13);
  const leafMat = new T.MeshLambertMaterial({ side: T.DoubleSide, transparent: true, opacity: 1 });
  const fallLeaves = new T.InstancedMesh(leafGeo, leafMat, LEAVES); fallLeaves.frustumCulled = false; scene.add(fallLeaves);
  const leafCols = ['#d9822b', '#b5481f', '#e8b23a', '#8f3a1c', '#c96a24'];
  const fl = Array.from({ length: LEAVES }, (_, i) => ({ x: (Math.random() - .5) * 26, y: Math.random() * 9, z: -Math.random() * 46 + 6, ph: Math.random() * 6, sp: .6 + Math.random() * .7 }));
  fl.forEach((d, i) => fallLeaves.setColorAt(i, new T.Color(leafCols[i % leafCols.length])));
  const rainPos = new Float32Array(DROPS * 6);
  const rainGeo = new T.BufferGeometry(); rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
  const rainMat = new T.LineBasicMaterial({ color: '#d8e6f0', transparent: true, opacity: 0, depthWrite: false });
  const rain = new T.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);
  const rd = Array.from({ length: DROPS }, () => ({ x: (Math.random() - .5) * 30, y: Math.random() * 12, z: -Math.random() * 50 + 6 }));
  const motePos = new Float32Array(MOTES * 3);
  const moteGeo = new T.BufferGeometry(); moteGeo.setAttribute('position', new T.BufferAttribute(motePos, 3));
  const moteMat = new T.PointsMaterial({ color: '#fff3c4', size: .09, transparent: true, opacity: 0, depthWrite: false });
  const motes = new T.Points(moteGeo, moteMat); motes.frustumCulled = false; scene.add(motes);
  const md = Array.from({ length: MOTES }, () => ({ x: (Math.random() - .5) * 22, y: .3 + Math.random() * 5, z: -Math.random() * 34 + 4, ph: Math.random() * 6 }));
  let ambLastT = null;
  function ambient(dt, t, W, live) {
    const move = ambLastT === null ? 0 : Math.max(0, Math.min(3, t - ambLastT)); ambLastT = t;
    const now = performance.now() / 1000;
    const leafAmt = Math.min(1, W[0] + W[1] * .35);
    fallLeaves.visible = leafAmt > .03;
    if (fallLeaves.visible) {
      const n = Math.round(LEAVES * leafAmt);
      fl.forEach((d, i) => {
        d.y -= dt * d.sp; d.z += move; d.x += Math.sin(now * 1.3 + d.ph) * dt * .6;
        if (d.y < -.2 || d.z > 8) { d.y = 6 + Math.random() * 4; d.z = -10 - Math.random() * 36; d.x = (Math.random() - .5) * 26; }
        dummy.position.set(d.x, d.y + height(d.z, t), d.z);
        dummy.rotation.set(now * 2 * d.sp + d.ph, now * 1.4 + d.ph, Math.sin(now + d.ph));
        dummy.scale.setScalar(i < n ? 1 : 0.0001); dummy.updateMatrix(); fallLeaves.setMatrixAt(i, dummy.matrix);
      });
      fallLeaves.instanceMatrix.needsUpdate = true;
    }
    rainMat.opacity = Math.min(.7, W[1] * .75);
    rain.visible = rainMat.opacity > .02;
    if (rain.visible) {
      rd.forEach((d, i) => {
        d.y -= dt * 17; d.z += move;
        if (d.y < -1 || d.z > 8) { d.y = 8 + Math.random() * 5; d.z = -Math.random() * 46 + 4; d.x = (Math.random() - .5) * 30; }
        const k = i * 6, base = height(d.z, t);
        rainPos[k] = d.x; rainPos[k + 1] = d.y + base; rainPos[k + 2] = d.z;
        rainPos[k + 3] = d.x - .05; rainPos[k + 4] = d.y + base + .55; rainPos[k + 5] = d.z - .25 - move * .05;
      });
      rainGeo.attributes.position.needsUpdate = true;
    }
    moteMat.opacity = Math.min(.8, (W[2] + W[3]) * .85);
    moteMat.color.set(W[3] > W[2] ? '#e6d2a4' : '#fff3c4');
    motes.visible = moteMat.opacity > .03;
    if (motes.visible) {
      md.forEach((d, i) => {
        d.z += move * .9; d.y += Math.sin(now * .9 + d.ph) * dt * .25; d.x += Math.cos(now * .7 + d.ph) * dt * .3;
        if (d.z > 6) { d.z = -26 - Math.random() * 10; d.x = (Math.random() - .5) * 22; d.y = .3 + Math.random() * 5; }
        motePos[i * 3] = d.x; motePos[i * 3 + 1] = d.y + height(d.z, t); motePos[i * 3 + 2] = d.z;
      });
      moteGeo.attributes.position.needsUpdate = true;
    }
  }

  function render(s) {
    const now = performance.now(), fdt = Math.min(.05, s.dt || (now - lastRender) / 1000); lastRender = now;
    adaptQuality();
    applyPreset(s.preset ?? 0);
    applyLivery(s.livery);
    paintDecal(s.riderName || 'EDT', s.riderNumber || 1, s.livery?.jersey || '#fcd326');
    skyUniforms.uTime.value = now / 1000;

    const t = s.roadTime * 19.5;
    const live = s.state === 'playing' || s.state === 'paused' || s.state === 'countdown';
    const boostAmount = live ? (s.turbo || 0) : 0;
    trail = routeAt(s.elapsed || 0, t);
    terrain(t); instances(t); muleScenery(t); vergeDetails(t);
    ambient(fdt, t, trail.w, live);

    // Moto e pilota: molle-smorzatori per sospensioni, beccheggio e postura.
    curCourse = s.elapsed || 0; courseScale = s.courseScale || .05;
    const lift = s.lift ?? jumpHeight(s.jump), airborne = Math.min(1.3, lift / JUMP_HEIGHT);
    const playing = s.state === 'playing';
    const vx = s.vx || 0, crash = s.crash || 0, whip = s.whip || 0;
    const phase = s.jump > 0 ? (s.jumpPhase ?? 1 - s.jump / JUMP_DURATION) : 0;
    const justLanded = playing && dyn.lastJump > 0 && s.jump <= 0;
    dyn.lastJump = s.jump;
    const grade = Math.atan(trail.grade);
    const bumpAmp = playing ? .012 + trail.rough * .05 + (s.wet > 0 ? .025 : 0) : .004;
    const bumpAt = d => bumpAmp * (Math.sin(d * 1.9) + .6 * Math.sin(d * 3.7 + 1) + .3 * Math.sin(d * 7.3));
    const transfer = boostAmount > 0 ? .035 : s.gas ? .015 : 0;
    const tf = s.jump > 0 ? -.075 : bumpAt(t + .86) - transfer;
    const tr = s.jump > 0 ? -.075 : bumpAt(t - .82) + transfer;
    if (justLanded) { dyn.vf += 1.7; dyn.vr += 2.1; dyn.brake = 1; }
    if (crash > .95) { dyn.vf += 2.4; dyn.vr += 1.2; dyn.brake = 1; }
    for (let k = 0; k < 2; k++) {
      const h = fdt / 2;
      dyn.vf += ((tf - dyn.cf) * 260 - dyn.vf * 19) * h; dyn.cf += dyn.vf * h;
      dyn.vr += ((tr - dyn.cr) * 240 - dyn.vr * 18) * h; dyn.cr += dyn.vr * h;
    }
    dyn.cf = Math.max(-.09, Math.min(.17, dyn.cf)); dyn.cr = Math.max(-.09, Math.min(.17, dyn.cr));
    const comp = (dyn.cf + dyn.cr) / 2;
    chassis.position.y = -comp;
    chassis.rotation.x = (dyn.cr - dyn.cf) / 1.68;
    frontWheel.position.y = .47 + dyn.cf;

    // Beccheggio: muso su allo stacco, giù all'atterraggio; impennata quando parte il turbo.
    let air = s.jump > 0 ? .3 * Math.cos(phase * Math.PI) : 0;
    if (air < 0) air *= .4;
    const wheelieTarget = playing && s.jump <= 0 ? (s.wheelie ? .58 : boostAmount > 2.0 ? .42 : boostAmount > 0 ? .08 : s.gas && trail.climb > .3 ? .05 : 0) : 0;
    dyn.wheelie += (wheelieTarget - dyn.wheelie) * Math.min(1, fdt * (wheelieTarget > dyn.wheelie ? 12 : 4));
    const crashPitch = crash > 0 ? Math.sin(crash * 18) * crash * .25 : 0;
    const pitchTarget = air + dyn.wheelie + crashPitch;
    dyn.pitchV += ((pitchTarget - dyn.pitch) * 95 - dyn.pitchV * 13) * fdt;
    dyn.pitch += dyn.pitchV * fdt;
    pitch.rotation.x = grade + dyn.pitch;
    const wheelieLift = s.jump <= 0 ? .82 * Math.sin(Math.max(0, dyn.pitch)) : 0;
    const noseDown = Math.max(0, -dyn.pitch) * .86;
    pitch.position.y = wheelieLift;

    // Piega e sterzo dalla velocità laterale; colpo di frusta (whip) in volo; sbandata nella caduta.
    const lean = Math.max(-.48, Math.min(.48, -vx * .15)) + whip * .35 + (crash > 0 ? Math.sin(crash * 25) * crash * .4 : 0);
    dyn.steer += (Math.max(-.38, Math.min(.38, -vx * .11)) - dyn.steer) * Math.min(1, fdt * 14);
    bike.position.set((s.px - 1) * spacing(), lift + .06 * Math.abs(trail.grade) + noseDown, 0);
    bike.rotation.z = lean;
    bike.rotation.y = -vx * .045 + whip * .55;
    front.rotation.y = dyn.steer + (s.jump > 0 ? whip * -.3 : 0);
    const blink = Math.floor(s.invincible * 12) % 2 === 0;
    bike.visible = s.invincible <= 0 || crash > 0 || blink;

    // Postura: in piedi su salti, salitoni e mulattiera; ammortizza con le gambe all'atterraggio.
    const standTarget = crash > 0 ? 0 : s.jump > 0 ? 1 : (trail.rough > .4 || trail.climb > .4) ? .85 : s.gas ? .6 : boostAmount > 0 ? .45 : .12;
    dyn.stand += (standTarget - dyn.stand) * Math.min(1, fdt * 6);
    const bounce = crash > 0 ? Math.sin((1 - crash) * Math.PI) * .32 : 0;
    upper.position.set(lean * -.08, dyn.stand * .17 - Math.max(0, comp) * .9 + bounce, -dyn.stand * .07 - boostAmount * .015);
    body.rotation.x = -.12 * dyn.stand - grade * .2 - boostAmount * .05 - (s.gas ? .08 : 0) - dyn.pitch * .45 + crash * .5 + (s.wheelie ? .32 : 0);
    body.rotation.z = lean * .35 - whip * .3 + (crash > 0 ? Math.sin(crash * 20) * crash * .3 : 0);
    head.rotation.y = dyn.steer * .9;
    head.rotation.x = -(body.rotation.x + grade + dyn.pitch) * .55;
    dyn.brake = Math.max(0, (dyn.brake || 0) - fdt * 2.5);
    brakeLightMat.emissiveIntensity = .3 + dyn.brake * 2.2;
    const spin = t / .475;
    frontWheel.rotation.x = -spin;
    rearWheel.rotation.x = -spin - (boostAmount > 2.2 ? (now / 40) : 0);
    // Orecchie: spuntano con un "pop", ondeggiano col movimento, si afflosciano con l'acqua.
    ears.visible = !!s.ears || earsScale > .02;
    earsScale += ((s.ears ? 1 : 0) - earsScale) * Math.min(1, fdt * 8);
    ears.scale.set(earsScale, earsScale * (1 + Math.sin(now / 90) * .04), earsScale);
    for (const pv of earPivots) {
      const sd = pv.userData.side;
      pv.rotation.z = -sd * (.16 + Math.sin(now / 230 + sd) * .07) - lean * .5;
      pv.rotation.x = .1 + (s.water > 0 ? .35 + Math.sin(now / 160) * .1 : 0) + dyn.pitchV * .015 + (s.jump > 0 ? -.2 : 0);
    }
    updateLimbs();

    flame.visible = flameCore.visible = boostAmount > 0 || (s.grappa || 0) > 0;
    flameMat.color.set(boostAmount > 0 ? '#ffb12b' : '#3fa9ff');
    if (flame.visible) { const f = .8 + Math.random() * .5; flame.scale.set(1, f, 1); flameCore.scale.set(1, f * .9, 1); }

    // Ostacoli
    const keep = new Set(s.objects);
    for (const [o, m] of obstacleMap) if (!keep.has(o)) { scene.remove(m); (pools[o.type] ||= []).push(m); obstacleMap.delete(o); }
    for (const o of s.objects) {
      let m = obstacleMap.get(o);
      if (!m) { m = makeObstacle(o.type); scene.add(m); obstacleMap.set(o, m); }
      const z = (o.z - .91) * 55;
      let lx = (o.l - 1) * spacing();
      if (o.type === 'coin' && s.magnet > 0 && o.z > .62 && !o.air) lx += ((s.px - 1) * spacing() - lx) * Math.min(1, (o.z - .62) / .29);
      if (o.type === 'bigLog') lx = 0;
      m.position.set(center(z, t) + lx, height(z, t) + (o.lift || 0), z);
      m.rotation.x = Math.atan(slope(z, t));
      if (m.userData.spin) {
        m.userData.spin.rotation.y = s.roadTime * (m.userData.still ? .6 : 3) + o.l;
        if (!m.userData.still) m.userData.spin.position.y = (o.type === 'coin' ? 1.1 : o.type === 'wine' ? .7 : o.type === 'grappa' ? .65 : 1.15) + Math.sin(s.roadTime * 6 + o.z * 20) * .06;
      }
      if (m.userData.roller) m.userData.roller.rotation.z = -o.z * 26;
      if (o.type === 'bigLog') { const len = spacing() * 2 + 2.2; m.userData.inner.scale.x = len; }
    }

    // Terra dalla ruota posteriore: più gas, più terra.
    const onGround = s.state === 'playing' && s.jump <= 0;
    const muddy = trail.wet > .3 || s.wet > 0;
    partMat.color.set(muddy ? '#5b4630' : trail.rough > .5 ? '#8f8f88' : '#9b7f56');
    if (onGround) {
      emitAcc += fdt * (26 + (s.gas ? 18 : 0) + boostAmount * 10) * (s.speed || 1);
      while (emitAcc > 1) {
        emitAcc--;
        const side = (Math.random() - .5) * .3;
        emit(bike.position.x + side, .25, 1.15, side * 4 + (Math.random() - .5) * 1.4, 2.4 + Math.random() * 2.6, 5 + Math.random() * 4, .7 + Math.random() * .8);
      }
    }
    if (wasAir && s.jump <= 0 && s.state === 'playing') {
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; emit(bike.position.x + Math.cos(a) * .4, .15, Math.sin(a) * .5, Math.cos(a) * 3.5, 1 + Math.random() * 1.5, Math.sin(a) * 2 + 2, 1.3); }
      shakeY = .12;
    }
    wasAir = s.jump > 0;
    for (let i = 0; i < PARTS; i++) {
      const p = pData[i];
      if (p.life > 0) {
        p.life -= fdt * 1.6; p.vy -= 14 * fdt; p.x += p.vx * fdt; p.y += p.vy * fdt; p.z += p.vz * fdt;
        const ground = height(p.z, t);
        if (p.y < ground + .03) { p.y = ground + .03; p.vy *= -.25; p.vx *= .6; p.vz *= .6; }
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.x * 9, p.z * 7, 0); dummy.scale.setScalar(Math.max(0, p.life) * p.s);
      } else { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0); }
      dummy.updateMatrix(); parts.setMatrixAt(i, dummy.matrix);
    }
    parts.instanceMatrix.needsUpdate = true;

    // Solchi
    if (s.state === 'playing') {
      if (!trackHist.length || t - trackHist[trackHist.length - 1].d > .32) trackHist.push({ d: t, x: bike.position.x, air: s.jump > 0 });
      if (trackHist.length > TRACKS + 1) trackHist.shift();
    } else if (s.state === 'ready' || s.state === 'countdown') trackHist.length = 0;
    for (let i = 0; i < TRACKS; i++) {
      const a = trackHist[trackHist.length - 1 - i], b = trackHist[trackHist.length - 2 - i];
      if (!a || !b || a.air || b.air) { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); tracks.setMatrixAt(i, dummy.matrix); continue; }
      const za = t - a.d, zb = t - b.d, zm = (za + zb) / 2;
      const xa = center(za, t) + a.x, xb = center(zb, t) + b.x;
      dummy.position.set((xa + xb) / 2, height(zm, t) + .025, zm);
      dummy.rotation.set(Math.atan(slope(zm, t)), Math.atan2(xa - xb, zb - za), 0, 'YXZ');
      dummy.scale.set(1, 1, Math.hypot(xb - xa, zb - za) + .02);
      dummy.updateMatrix(); tracks.setMatrixAt(i, dummy.matrix);
      dummy.rotation.order = 'XYZ';
    }
    tracks.instanceMatrix.needsUpdate = true;
    trackMat.opacity = trail.rough > .5 ? .14 : trail.wet > .3 ? .42 : .3;

    dustMaterial.color.set(muddy ? '#9a8a74' : '#ceba8c');
    dust.visible = onGround;
    for (let i = 0; i < 24; i++) {
      const age = (s.roadTime * 1.7 + i / 24) % 1;
      dummy.position.set(bike.position.x + Math.sin(i * 23) * age * .9, height(1 + age * 3.2, t) + .1 + age * .4, 1 + age * 3.6);
      dummy.rotation.set(i, age * 2, i); dummy.scale.setScalar(.05 + age * .32); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < 36; i++) {
      const z = wrapZ(i * 5.1, t), side = i % 2 ? 1 : -1, x = center(z, t) + side * 5.0 * trail.width, y = height(z, t);
      dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.position.set(x, y + .55, z); dummy.updateMatrix(); markers.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x - side * .12, y + .95, z); dummy.rotation.y = side * .2 + Math.sin(now / 300 + i) * .15; dummy.updateMatrix(); pennants.setMatrixAt(i, dummy.matrix);
    }
    markers.instanceMatrix.needsUpdate = pennants.instanceMatrix.needsUpdate = true;
    let tn = 0, an = 0;
    for (let i = 0; i < 36; i++) {
      const z = wrapZ(i * 5.1, t), side = i % 2 ? 1 : -1, x = center(z, t) + side * 5.0 * trail.width, y = height(z, t);
      for (let j = 0; j < 4; j++) {
        // quattro campate fino al paletto successivo dello stesso lato, con un filo di "pancia"
        const z1 = z - j * 2.55, z2 = z1 - 2.55, sag = k => .86 - Math.sin(k / 4 * Math.PI) * .12;
        const x1 = center(z1, t) + side * 5.0 * trail.width, y1 = height(z1, t) + sag(j);
        const x2 = center(z2, t) + side * 5.0 * trail.width, y2 = height(z2, t) + sag(j + 1);
        const dx = x2 - x1, dy = y2 - y1, dzz = z2 - z1, len = Math.hypot(dx, dy, dzz);
        dummy.position.set(x1, y1, z1); dummy.scale.set(len, 1, 1);
        dummy.rotation.set(0, Math.atan2(-dzz, dx), Math.asin(dy / len), 'YZX'); dummy.updateMatrix(); tapes.setMatrixAt(tn++, dummy.matrix);
        dummy.rotation.order = 'XYZ';
      }
      if (i % 4 === 1 && an < 18) {
        const turn = Math.sign(center(z - 14, t) - center(z - 6, t)) || 1;
        dummy.position.set(x + side * .02, y + 1.25, z + .06); dummy.rotation.set(0, 0, 0); dummy.scale.set(turn, 1, 1); dummy.updateMatrix(); arrows.setMatrixAt(an++, dummy.matrix);
      }
    }
    tapes.count = tn; arrows.count = an;
    tapes.instanceMatrix.needsUpdate = arrows.instanceMatrix.needsUpdate = true;

    aura.visible = boostAmount > 0 || (s.grappa || 0) > 0; aura.scale.setScalar(1 + Math.sin(now / 60) * .08);
    auraMaterial.color.set(boostAmount > 0 ? '#ffd438' : '#4fb8ff');
    magnetAura.visible = (s.magnet || 0) > 0; magnetAura.scale.setScalar(1 + Math.sin(now / 90) * .1); magnetAura.rotation.z = now / 400;

    // Scintille / schizzi sugli eventi
    if (s.fxSerial !== undefined && s.fxSerial !== lastEvent) {
      lastEvent = s.fxSerial; eventAt = now; eventX = bike.position.x; eventY = s.fxKind === 'splash' ? .4 : 1.1 + lift;
      sparkMaterial.color.set(s.fxKind === 'hit' ? '#ff5a39' : s.fxKind === 'splash' ? '#93d9e4' : s.fxKind === 'power' ? '#7dffc4' : s.fxKind === 'jump' ? '#ffffff' : '#ffe04b');
      if (s.fxKind === 'splash') for (let i = 0; i < 26; i++) emit(bike.position.x + (Math.random() - .5), .2, (Math.random() - .5), (Math.random() - .5) * 6, 3 + Math.random() * 4, (Math.random() - .2) * 4, 1.4);
    }
    const age = (now - eventAt) / 520;
    sparks.visible = live && age >= 0 && age < 1;
    if (sparks.visible) {
      sparkMaterial.opacity = (1 - age) * .95;
      for (let i = 0; i < 26; i++) {
        const a = i * Math.PI * 2 / 26, r = age * (1.1 + (i % 3) * .45);
        dummy.position.set(eventX + Math.cos(a) * r, eventY + Math.sin(a) * r * .8 + age * (1 - age), .2 + Math.sin(i * 3) * r * .5);
        dummy.rotation.set(age * 3, i, age * 2); dummy.scale.setScalar(1.2 - age * .8); dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    }

    // Arrivo al rifugio negli ultimi secondi
    const remain = Math.max(0, 60 - (s.elapsed || 0)), gz = remain < 4 ? -remain * 17 : -175;
    finish.position.set(center(gz, t), height(gz, t), gz);
    finish.visible = remain < 5;

    // Telecamera: orizzonte stabile, scossoni su colpi e atterraggi.
    const shakeIn = s.shake || 0;
    shakeX += ((Math.random() - .5) * shakeIn * .5 - shakeX) * .5;
    shakeY = shakeY * .82 + (Math.random() - .5) * shakeIn * .3;
    // In verticale (telefono) la telecamera arretra e sale: tre corsie visibili e moto sopra i comandi.
    const portrait = camera.aspect < .8;
    const baseFov = portrait ? 68 : 53;
    const targetFov = baseFov + trail.climb * 10 + (boostAmount > 0 ? 9 : 0) + trail.down * 6;
    if (Math.abs(camera.fov - targetFov) > .01) { camera.fov += (targetFov - camera.fov) * .07; camera.updateProjectionMatrix(); }
    camX += (bike.position.x * (portrait ? .55 : .30) - camX) * .06;
    // Schermi bassi (telefono in orizzontale): moto più in alto, sopra i comandi.
    const short = !portrait && canvas.clientHeight < 520;
    const camY = portrait ? 5.9 : short ? 5.0 : 4.6, camZ = portrait ? 10.2 : 7.9, lookY = portrait ? -.6 : short ? -1.5 : .3, lookZ = portrait ? -9 : -10;
    camera.position.set(camX + .55 * trail.rough + shakeX, camY + airborne * .3 + trail.climb * (portrait ? .2 : 1.2) + shakeY, camZ + trail.climb * 1.3 - boostAmount * .15);
    camLift += (Math.max(0, lift - 1.1) * .8 - camLift) * .12;
    camera.lookAt(bike.position.x * (portrait ? .4 : .16), lookY + camLift + Math.max(0, trail.grade) * (portrait ? 1.3 : .6) + Math.min(0, trail.grade) * 2.0 + trail.climb * (portrait ? .7 : .1), lookZ);
    camera.rotateZ(bike.rotation.z * .06);
    sky.position.copy(camera.position);
    sun.target.position.set(bike.position.x, 0, -6);
    const L = PRESETS[presetIndex] || PRESETS[0];
    sun.position.set(bike.position.x - 12, 24, 3).add(new T.Vector3(L.sunDir[0] * 6, 0, 0));
    renderer.render(scene, camera);
  }

  resize();
  return { resize, render, renderer, scene, camera, bike, presets: PRESETS };
}
