// EDT Giro Easy · v18 — mondo 3D (Three.js locale)
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { GLTFLoader } from './GLTFLoader.js';
import { OBSTACLE_HEIGHT, iceShape, iceBend, iceHeading, ranchShape, ranchHeading, ranchBend, trackShape, GAME_LENGTH, JUMP_DURATION, JUMP_HEIGHT, jumpHeight, routeAt, sectionWeights, terrainHeight, terrainGrade } from './physics.js?v=105.3';
import * as T from './three.module.min.js';
import { RIDER_PARTS } from './pilota3d.js?v=105.3';

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
  // v46 · Ice Scrophy: cielo d'inverno terso, luce fredda e bassa, foschia azzurra
  { name: 'Gelo di Scrophy', top: '#3f7fc4', horizon: '#e4f1f8', sunDir: [-.6, .22, -.77], sunColor: '#fff4e0', clouds: .3, cloud: '#ffffff',
    light: '#f4f8ff', lightI: 3.3, hemiSky: '#e2f0ff', hemiGround: '#a8bccb', hemiI: 2.0, fog: '#dbe8f0', fogNear: 70, fogFar: 200, exposure: 1.0, ridge: '#9fb3c2', snowLine: -99, ice: true },
  // v46 · MotoFogna: diluvio, cielo piombo, luce bassa
  { name: 'Diluvio della Fogna', top: '#4a545c', horizon: '#9aa3a3', sunDir: [.4, .5, -.75], sunColor: '#d8dcd6', clouds: .95, cloud: '#8c9496',
    light: '#dfe3dc', lightI: 2.4, hemiSky: '#b9c2c4', hemiGround: '#3c3426', hemiI: 1.6, fog: '#8f9897', fogNear: 45, fogFar: 160, exposure: 1.02, ridge: '#5d6866' },
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
  // v71 · plastiche e casco laccati (vernice trasparente), come le moto vere delle foto del garage
  const pmat = (c, r = .32) => new T.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: .8, clearcoatRoughness: .12 });
  const plastic = pmat('#e93825'), accent = pmat('#fcd326', .4), jerseyMat = mat('#fcd326', .6), pantsMat = mat('#243138', .8), helmetMat = pmat('#eee8d8', .25), sidePanel = pmat('#eee8d8', .35);
  // v44 · accessori dell'officina: materiali propri così si possono ricolorare/mostrare a parte
  const rimMat = mat('#a3b7bb', .3, .7), pipeMat = mat('#a3b7bb', .3, .7), seatMat = mat('#243138', .85), guardMat = mat('#1b1b1b', .5);
  const lampMat = new T.MeshStandardMaterial({ color: '#fffbe8', roughness: .2, emissive: '#fff4c8', emissiveIntensity: 1.2 }), vintageMat = mat('#c9a43a', .3, .7);

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
  const forkRoads = [strip(dirt), strip(dirt)], forkIsland = strip(grass);   // v103 · i due rami del bivio e l'isola d'erba in mezzo
  for (const o of [...forkRoads, forkIsland]) o.visible = false;
  let trail = { grade: 0, width: 1, rough: 0, climb: 0, wet: 0 };
  const spacing = () => 2.5 * trail.width;
  let iceMode = false, iceKey = null, groundMaps = null;
  let ranchLook = false, camRoll = 0, camTurn = 0, bikeTurn = 0;   // v102 · Gusta Ranch nell'Astigiano
  let curveA = 3.8, curveF = .021;   // v97 · curve diverse per la variante della settimana
  const RANCH_SHAPE = { shape: ranchShape, heading: ranchHeading, bend: ranchBend };
  let curShape = null;   // v103 · tracciato vero del percorso (Gusta Ranch e gli altri): la vista segue la direzione della pista
  const baseCenter = (z, t) => iceMode ? (iceShape(t - z) - iceShape(t) + iceHeading(t) * z) * 2 : curShape ? (curShape.shape(t - z) - curShape.shape(t) + curShape.heading(t) * z) * 2 + trail.rough * (Math.sin((t - z) * .062) - Math.sin(t * .062)) * 1.2 : Math.sin((t - z) * curveF) * curveA - Math.sin(t * curveF) * curveA + trail.rough * (Math.sin((t - z) * .062) - Math.sin(t * .062)) * 2.6;   // v88 · sul ghiaccio la vista segue la direzione della pista: si vede solo la curva
  // v103 · bivio vero: tra x0 e x1 la strada si divide; g = distanza tra i due rami. Scelto il ramo, la "nostra" strada si sposta da quella parte
  let forkF = null;
  const forkGap = x => { const F = forkF; if (!F || x < F.x0 || x > F.x1) return 0; const u = (x - F.x0) / (F.x1 - F.x0), a = Math.min(1, u / .22), b = Math.min(1, (1 - u) / .22); return 22 * a * a * (3 - 2 * a) * b * b * (3 - 2 * b); };
  const forkShift = (z, t) => forkF && forkF.side ? forkF.side * (forkGap(t - z) - forkGap(t)) / 2 : 0;
  const center = (z, t) => baseCenter(z, t) + forkShift(z, t);
  // v64 · burrone del Taglio di Angelo: la montagna finisce e il terreno sprofonda (la moto resta alla quota del bordo)
  let canyon = null;
  const CANYON_D = 52, CANYON_DROP = 14;   // profondità del burrone e quanto più in basso si atterra
  const canyonDepth = x => {   // quota assoluta in più (negativa) del terreno nel punto x del percorso
    if (!canyon) return 0;
    const u = x - canyon.x0; if (u < 0) return 0;
    if (u > canyon.len) return -CANYON_DROP;
    const wall = Math.min(1, u / 2.5, (canyon.len - u) / 2.5);
    const k = wall * wall * (3 - 2 * wall);
    return -CANYON_D * k - CANYON_DROP * (1 - k) * (u > canyon.len / 2 ? 1 : 0);
  };
  const canyonRef = t => {   // la quota di riferimento della moto scende piano mentre vola sopra il burrone
    if (!canyon) return 0;
    const u = t - canyon.x0, L = canyon.land || canyon.len + 12; if (u <= 0) return 0; if (u >= L) return -CANYON_DROP;
    const k = u / L; return -CANYON_DROP * k * k;
  };
  const inCanyon = x => canyon && x - canyon.x0 > 1.5 && x - canyon.x0 < canyon.len - 1.5;
  const height = (z, t) => terrainHeight(z, t, trail) + canyonDepth(t - z) - canyonRef(t);
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
  // v70 · materiali fotografati dal vero (Poly Haven, CC0): sentiero sassoso, prato con rocce. Se non arrivano resta la grafica disegnata.
  const roadMaps = [gravel], grassMaps = [grassTex];
  const texLoader = new T.TextureLoader();
  function photoTex(name, rx, ry, color, done) {
    let left = 2; const out = {};
    const fin = () => { if (--left === 0) done(out); };
    for (const [k, suf] of [['map', 'd'], ['normalMap', 'n']]) texLoader.load(`img/tex/${name}_${suf}.webp?t=1`, t => {
      t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if (color) t.colorSpace = T.SRGBColorSpace; if (k === 'map') t.colorSpace = T.SRGBColorSpace; else t.colorSpace = T.NoColorSpace;
      out[k] = t; fin();
    }, undefined, () => { left = -99; });
  }
  photoTex('trail', 4, 90, true, ({ map, normalMap }) => {
    // v71 · niente effetto "tappeto": sassi in scala vera (ripetizione fitta), seconda lettura della texture a scala diversa
    // mescolata con una macchia larga (spezza la ripetizione), solchi delle ruote più scuri e bordi che sfumano nell'erba
    dirt.map = map; dirt.normalMap = normalMap; dirt.normalScale.set(1.25, 1.25); dirt.bumpMap = null;
    dirt.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
        vec2 uvA = vMapUv;
        vec4 tA = texture2D( map, uvA );
        vec4 tB = texture2D( map, uvA * vec2( .43, .41 ) + vec2( .37, .11 ) );
        float macro = texture2D( map, uvA * vec2( .031, .017 ) ).g;
        float m = smoothstep( .3, .7, macro );
        vec4 sampledDiffuseColor = mix( tA, tB, m );
        float a = clamp( uvA.x / 4.0, 0.0, 1.0 );
        float rut = exp( -pow( ( a - .36 ) / .045, 2.0 ) ) + exp( -pow( ( a - .64 ) / .045, 2.0 ) );
        float edge = smoothstep( .0, .1, a ) * smoothstep( 1.0, .9, a );
        sampledDiffuseColor.rgb *= ( 1.0 - rut * .3 ) * ( .72 + macro * .56 );
        sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb * vec3( .78, .8, .62 ), sampledDiffuseColor.rgb, edge );
        diffuseColor *= sampledDiffuseColor;
      `);
    };
    dirt.needsUpdate = true;
    roadMaps.length = 0; roadMaps.push(map, normalMap);
    ['#b8a58f', '#8f7b66', '#e8dccb', '#d8d4ce'].forEach((c, i) => DIRT_COLS[i].set(c));
    if (iceMode) { iceKey = null; setIce(true); }   // v93 · se la foto arriva quando sei già sul ghiaccio, la neve resta
  });
  photoTex('meadow', 10, 30, true, ({ map, normalMap }) => {
    grass.map = map; grass.normalMap = normalMap; grass.normalScale.set(.8, .8); grass.needsUpdate = true;
    verge.map = map; verge.normalMap = normalMap; verge.needsUpdate = true;
    grassMaps.length = 0; grassMaps.push(map, normalMap);
    ['#9db08a', '#b8d39b', '#e2dcb0', '#c0c3bb'].forEach((c, i) => GRASS_COLS[i].set(c));
    if (iceMode) { iceKey = null; setIce(true); }   // v93
    ['#8d9b70', '#a4bd84', '#d6cc9c', '#b4b6ae'].forEach((c, i) => VERGE_COLS[i].set(c));
  });

  function blend(target, cols, w) { target.setRGB(0, 0, 0); for (let i = 0; i < 4; i++) { target.r += cols[i].r * w[i]; target.g += cols[i].g * w[i]; target.b += cols[i].b * w[i]; } }
  function forkStrips(t) {
    const F = forkF, on = !!F && (forkGap(t + 190) > 0 || forkGap(t) > 0 || (t + 190 > F.x0 && t - 14 < F.x1));
    for (const o of [...forkRoads, forkIsland]) o.visible = on;
    if (!on) return;
    const W = 5.15 * trail.width;
    const fill = (o, side) => {   // side: -1/+1 ramo, 0 isola
      const a = o.geometry.attributes.position, col = o.geometry.attributes.color;
      const shortRoad = side !== 0 && side === F.shortSide;
      for (let i = 0; i <= segments; i++) {
        const z = 14 - i, x = t - z, g = forkGap(x), c = center(z, t), base = c - (F.side ? F.side * g / 2 : 0), h = height(z, t);
        const hide = side !== 0 ? (g <= 0 || (F.side && side === F.side)) : g / 2 - W <= 0;
        for (let j = 0; j <= lanes; j++) {
          const k = i * (lanes + 1) + j, u = j / lanes;
          let wx;
          if (side !== 0) wx = base + side * g / 2 + (-W + 2 * W * u);
          else { const half = Math.max(0, g / 2 - W + .3); wx = base - half + 2 * half * u; }
          const w = wx - c;
          a.setXYZ(k, wx, hide ? h - 30 : h + bank(w, z) + (side ? .05 : .08), z);
          const tint = shortRoad ? .82 : 1;
          col.setXYZ(k, tint, tint, shortRoad ? tint * 1.04 : tint);
        }
      }
      a.needsUpdate = true; col.needsUpdate = true; o.geometry.computeVertexNormals();
    };
    fill(forkRoads[0], -1); fill(forkRoads[1], 1); fill(forkIsland, 0);
  }
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
    forkStrips(t);
    for (const m of roadMaps) m.offset.y = (t * m.repeat.y / 200) % 1;
    for (const m of grassMaps) m.offset.y = (t * m.repeat.y / 200) % 1;
    // Colori del terreno per sezione: terra scura di bosco, fango, ocra di pascolo, pietra.
    const W = trail.w || [1, 0, 0, 0];
    blend(dirt.color, DIRT_COLS, W);
    dirt.roughness = .85 - trail.wet * .35;
    blend(grass.color, GRASS_COLS, W);
    blend(verge.color, VERGE_COLS, W);
    scene.fog.near = fogBase.near * (1 - W[0] * .2); scene.fog.far = fogBase.far * (1 - W[0] * .12);
    dirt.bumpScale = .07 + trail.rough * .16;
    if (iceMode) {
      // pista di ghiaccio lucido, bordi e prati sotto la neve
      iceTex.offset.y = (t * 10 / 200) % 1;
      dirt.color.set('#d6ecf6'); dirt.roughness = .16; dirt.metalness = .08; dirt.bumpScale = .02;
      grass.color.set('#f2f7fa'); verge.color.set('#dde9ef');
      scene.fog.near = fogBase.near; scene.fog.far = fogBase.far;
    } else dirt.metalness = 0;
  }
  // v66 · il burrone visto dall'alto: fondovalle dipinto (bosco, prati, torrente) e parete di roccia di fronte, senza nebbia
  const valleyTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d');
    x.fillStyle = '#2f4a2c'; x.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 2600; i++) { const r = 4 + Math.random() * 13; x.fillStyle = `hsl(${95 + Math.random() * 40},${25 + Math.random() * 25}%,${12 + Math.random() * 16}%)`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 1024, r, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `hsla(${70 + Math.random() * 30},35%,${38 + Math.random() * 12}%,.55)`; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 1024, 30 + Math.random() * 60, 18 + Math.random() * 40, Math.random() * 3, 0, 7); x.fill(); }
    x.lineCap = 'round';
    for (const [w, col] of [[30, '#c9c2ae'], [18, '#4f8fb0'], [8, '#8fc4dc']]) { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); for (let y = -10; y <= 1034; y += 8) { const xx = 256 + Math.sin(y * .011) * 120 + Math.sin(y * .029) * 40; y < 0 ? x.moveTo(xx, y) : x.lineTo(xx, y); } x.stroke(); }
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(160,150,135,${.3 + Math.random() * .4})`; x.fillRect(Math.random() * 512, Math.random() * 1024, 2 + Math.random() * 5, 2 + Math.random() * 4); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  })();
  const rockTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9a9386'); g.addColorStop(.6, '#706a60'); g.addColorStop(1, '#3a3631'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++) { const r = 3 + Math.random() * 16, l = 30 + Math.random() * 40; x.fillStyle = `hsla(${25 + Math.random() * 20},${6 + Math.random() * 10}%,${l}%,${.25 + Math.random() * .35})`; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 256, r * (1 + Math.random()), r * (.4 + Math.random() * .5), 0, 0, 7); x.fill(); }
    for (let i = 0; i < 18; i++) { x.strokeStyle = 'rgba(30,26,22,.55)'; x.lineWidth = 1.5 + Math.random() * 2; x.beginPath(); let px = Math.random() * 512, py = Math.random() * 120; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (Math.random() - .5) * 30; py += 8 + Math.random() * 18; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 9; i++) { const y = 20 + Math.random() * 220; x.fillStyle = 'rgba(40,36,32,.35)'; x.fillRect(0, y, 512, 2 + Math.random() * 3); x.fillStyle = 'rgba(210,200,185,.18)'; x.fillRect(0, y - 2, 512, 2); }
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${60 + Math.random() * 30},${90 + Math.random() * 30},${45 + Math.random() * 20},${.5 + Math.random() * .3})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 26, 4 + Math.random() * 9, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.anisotropy = 4; return t;
  })();
  const valleyMat = new T.MeshLambertMaterial({ map: valleyTex, fog: false, color: '#d8dccf' });
  const valley = new T.Mesh(new T.PlaneGeometry(420, 1), valleyMat); valley.rotation.x = -Math.PI / 2; valley.visible = false; valley.receiveShadow = false; scene.add(valley);
  const wallMat = new T.MeshLambertMaterial({ map: rockTex, fog: false, side: T.DoubleSide });
  texLoader.load('img/tex/rockwall_d.webp?t=1', t => { t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; wallMat.map = t; wallMat.needsUpdate = true; rockTexPhoto = t; });
  let rockTexPhoto = null;
  const farWall = new T.Mesh(new T.PlaneGeometry(420, 1), wallMat); farWall.visible = false; scene.add(farWall);
  function placeCanyon(t) {
    const on = !!canyon; valley.visible = farWall.visible = on;
    if (!on) return;
    const ref = canyonRef(t), zNear = t - canyon.x0, zFar = t - (canyon.x0 + canyon.len), floorY = -CANYON_D - ref + 1.5;
    const L = Math.max(1, zNear - zFar);
    valley.scale.set(1, L + 6, 1); valley.position.set(0, floorY, (zNear + zFar) / 2);
    valleyTex.repeat.set(420 / 160, (L + 6) / 320); valleyTex.offset.y = (-(canyon.x0) / 320) % 1;
    const topF = -CANYON_DROP - ref, hF = topF - floorY;
    farWall.scale.set(1, hF * 1.08, 1); farWall.rotation.x = -.38; farWall.position.set(0, floorY + hF / 2, zFar + 1.2 + hF * .2);
    rockTex.repeat.set(420 / 45, 1); if (rockTexPhoto) rockTexPhoto.repeat.set(420 / 30, Math.max(1, hF / 30));
  }
  // texture del ghiaccio: graffi bianchi dei chiodi su fondo azzurro
  const iceTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#e9f5fb'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${150 + Math.random() * 60},${200 + Math.random() * 40},255,${.15 + Math.random() * .3})`; x.lineWidth = .6 + Math.random() * 2.2; x.beginPath(); const sx = Math.random() * 256, sy = Math.random() * 256; x.moveTo(sx, sy); x.bezierCurveTo(sx + (Math.random() - .5) * 40, sy + 40, sx + (Math.random() - .5) * 60, sy + 90, sx + (Math.random() - .5) * 50, sy + 140); x.stroke(); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.repeat.set(3, 10); t.anisotropy = 4; return t;
  })();
  function setIce(on) {
    if (on === iceKey) return; iceKey = on; iceMode = on;
    // inverno: latifoglie e larici spogli, abeti con la neve in cima, niente erba
    leafCrowns.visible = !on && !leafOK; larchCrowns.visible = !on && !larchOK; leafCards.visible = !on && leafOK; larchCards.visible = !on && larchOK; if (typeof islandCards !== "undefined") islandCards.visible = !on && islandOK;
    if (on) groundMaps = { d: dirt.map, g: grass.map, v: verge.map, dn: dirt.normalMap, gn: grass.normalMap, vn: verge.normalMap };
    else if (!groundMaps) groundMaps = { d: dirt.map, g: grass.map, v: verge.map, dn: dirt.normalMap, gn: grass.normalMap, vn: verge.normalMap };
    dirt.map = on ? iceTex : groundMaps.d; grass.map = on ? null : groundMaps.g; verge.map = on ? null : groundMaps.v;
    dirt.normalMap = on ? null : groundMaps.dn; grass.normalMap = on ? null : groundMaps.gn; verge.normalMap = on ? null : groundMaps.vn;
    dirt.needsUpdate = grass.needsUpdate = verge.needsUpdate = true;
    pine.color.set(on ? '#2c4a44' : '#30594c'); pineLight.color.set(on ? '#eef4f7' : '#3e6d56');
    tufts.visible = !on && quality < 2;
    ferns.visible = flowers.visible = !on; shroomStems.visible = shroomCaps.visible = false;   // v72 · niente funghi giganti da cartone
    shrubs.material.color.set(on ? '#e6eef2' : '#ffffff');
    rockMat.vertexColors = !on; rockMat.color.set(on ? '#dde6ea' : '#ffffff'); rockMat.needsUpdate = true;   // v101 · sassi innevati su Ice Scrofy
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
  const ground = (z, t, w) => height(z, t) + bank(w, z) - (inCanyon(t - z) ? 400 : 0);   // nel burrone niente alberi a mezz'aria

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

  // v101 · sassi veri: forma irregolare con facce spaccate, base piatta, licheni e muschio sopra (colori nei vertici)
  const rockGeo = (() => {
    const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new T.Vector3(), col = [];
    const n3 = (x, y, z) => Math.sin(x * 2.1 + y * 1.3) * .5 + Math.sin(y * 3.7 - z * 2.3) * .3 + Math.sin(z * 5.3 + x * 4.1) * .2;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const d = 1 + n3(v.x, v.y, v.z) * .22;
      v.multiplyScalar(d); v.y *= .62; if (v.y < -.28) v.y = -.28 + (v.y + .28) * .15;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    const ng = g.toNonIndexed(); ng.computeVertexNormals();
    const q = ng.attributes.position, nn = ng.attributes.normal, c = new T.Color();
    for (let i = 0; i < q.count; i += 3) {   // un colore per faccia: grigio-marrone che varia, muschio sulle facce verso l'alto
      const ny = (nn.getY(i) + nn.getY(i + 1) + nn.getY(i + 2)) / 3, yy = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3, r = Math.sin(i * 12.9898) * 43758.5453 % 1;
      if (ny > .55 && yy > .05 && r > -.35) c.set(r > .3 ? '#6f7f4a' : '#7d8a52'); else if (yy < -.2) c.set('#5d5a50'); else c.setHSL(.09 + r * .03, .07 + Math.abs(r) * .06, .40 + r * .07, T.SRGBColorSpace);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    }
    ng.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return ng;
  })();
  const rockMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true });
  const rocks = new T.InstancedMesh(rockGeo, rockMat, 60);
  const wetRockMat = new T.MeshStandardMaterial({ color: '#5e625b', roughness: .35, metalness: .1, flatShading: true });   // sassi bagnati nel guado: scuri e lucidi, niente muschio
  const rockData = Array.from({ length: 60 }, (_, i) => ({ side: i % 2 ? 1 : -1, z: i * 3.03, off: (i % 7) * .47, big: rand() }));
  for (const item of [trunks, crowns, tops, rocks, birchTrunks, leafCrowns, larchTrunks, larchCrowns]) { item.castShadow = true; item.receiveShadow = true; scene.add(item); }
  // v70 · abeti veri: modelli Poly Haven (CC0) renderizzati in Blender e messi in pista come sagome incrociate
  const cardGeo = (() => {
    const g = new T.BufferGeometry(), P = [], U = [], I = [];
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      const b = P.length / 3;
      P.push(-.5 * ax, 0, -.5 * az, .5 * ax, 0, .5 * az, .5 * ax, 2, .5 * az, -.5 * ax, 2, -.5 * az);
      U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  const cardMat = (tint) => new T.MeshLambertMaterial({ color: tint, alphaTest: .42, side: T.DoubleSide, transparent: false });
  const firA = new T.InstancedMesh(cardGeo, cardMat('#9fb08c'), PINES), firB = new T.InstancedMesh(cardGeo, cardMat('#93a885'), PINES);
  for (const m of [firA, firB]) { m.visible = false; m.frustumCulled = false; scene.add(m); }
  { const c = new T.Color(); for (let i = 0; i < PINES; i++) { const r = (Math.sin(i * 91.7) * 43758.5) % 1; c.setRGB(.86 + r * .14, .9 + r * .1, .84 + Math.abs(r) * .12); firA.setColorAt(i, c); firB.setColorAt(i, c); } }   // v101 · abeti di toni diversi, il bosco non sembra copiato
  let firOK = false;
  const zeroM = new T.Matrix4().makeScale(0, 0, 0);
  for (const [m, k] of [[firA, 'a'], [firB, 'b']]) texLoader.load(`img/tex/fir_${k}.webp?t=1`, t => {
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; m.material.map = t; m.material.needsUpdate = true; m.userData.ok = true;
    if (firA.userData.ok && firB.userData.ok) { firOK = true; firA.visible = firB.visible = true; trunks.visible = crowns.visible = tops.visible = false; }
  });
  // larici dorati e latifoglie d'autunno: stesso albero vero, colorato in Blender/foto
  const larchCards = new T.InstancedMesh(cardGeo, cardMat('#ffffff'), LARCH), leafCards = new T.InstancedMesh(cardGeo, cardMat('#ffffff'), LEAFY);
  for (const m of [larchCards, leafCards]) { m.visible = false; m.frustumCulled = false; scene.add(m); }
  let larchOK = false, leafOK = false;
  texLoader.load('img/tex/fir_gold.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; larchCards.material.map = t; larchCards.material.needsUpdate = true; larchOK = true; larchCards.visible = !iceMode; larchTrunks.visible = larchCrowns.visible = false; });
  texLoader.load('img/tex/fir_rust.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; leafCards.material.map = t; leafCards.material.needsUpdate = true; leafOK = true; leafCards.visible = !iceMode; birchTrunks.visible = leafCrowns.visible = false; });

  // v105 · modelli veri (Poly Haven, CC0) alleggeriti in Blender: rocce col muschio e albero da foto
  const gltf = new GLTFLoader();
  let rockVar = null;
  gltf.load('img/models/rock_moss_set_01.glb', g => {
    const list = []; g.scene.traverse(o => { if (o.isMesh) list.push(o); });
    rockVar = list.map(o => {
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); const b = geo.boundingBox, sz = new T.Vector3(); b.getSize(sz); const c = new T.Vector3(); b.getCenter(c);
      geo.translate(-c.x, -b.min.y - sz.y * .18, -c.z); geo.scale(2 / Math.max(sz.x, sz.z), 2 / Math.max(sz.x, sz.z), 2 / Math.max(sz.x, sz.z));
      const m = new T.InstancedMesh(geo, o.material, Math.ceil(60 / list.length) + 1); m.castShadow = m.receiveShadow = true; m.count = 0; scene.add(m); return m;
    });
    rocks.visible = false;
    // v105 · muretti a secco e pareti della mulattiera fatti con le stesse rocce vere (centrate, raggio 1 come le vecchie forme)
    const centered = (o) => { const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); const b = geo.boundingBox, c = new T.Vector3(), sz = new T.Vector3(); b.getCenter(c); b.getSize(sz); geo.translate(-c.x, -c.y, -c.z); const k = 2 / Math.max(sz.x, sz.y, sz.z); geo.scale(k, k * 1.3, k); return geo; };
    wall.geometry = centered(list[1 % list.length]); wall.material = list[1 % list.length].material;
    cliff.geometry = centered(list[0]); cliff.material = list[0].material; wall.castShadow = cliff.castShadow = true;
  });
  { let left = 2; const pm = new T.MeshStandardMaterial({ color: '#d4d2c8', roughness: .9 });   // lastricato: pietra vera
    texLoader.load('img/tex/mossrock_d.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; pm.map = t; if (--left === 0) { paving.material = pm; } });
    texLoader.load('img/tex/mossrock_n.webp?t=1', t => { pm.normalMap = t; if (--left === 0) { paving.material = pm; } }); }
  const islandCards = new T.InstancedMesh(cardGeo, cardMat('#ffffff'), LEAFY); islandCards.visible = false; islandCards.frustumCulled = false; scene.add(islandCards);
  let islandOK = false;
  texLoader.load('img/tex/tree_island.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; islandCards.material.map = t; islandCards.material.needsUpdate = true; islandOK = true; islandCards.visible = !iceMode; });
  function instances(t) {
    const shrink = 1 - trail.rough * .45;
    treeData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * shrink * vis(z, PINE_D, d.h) * (ranchLook && i % 4 ? 0 : 1);   // v102 · nell'astigiano pochi abeti
      dummy.rotation.set(0, d.rot, 0); dummy.scale.setScalar(s);
      for (const [m, yy] of [[trunks, 1.5], [crowns, 4.0], [tops, 6]]) { dummy.position.set(x, y + yy * s, z); put(m, i); }
      if (firOK) { const card = i % 2 ? firB : firA, other = i % 2 ? firA : firB; dummy.position.set(x, y - .15, z); dummy.scale.setScalar(4.6 * s); put(card, i); other.setMatrixAt(i, zeroM); }
    });
    leafData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * vis(z, LEAF_D, d.h);
      dummy.rotation.set(0, d.rot, 0); dummy.scale.setScalar(s);
      dummy.position.set(x, y + 1.6 * s, z); put(birchTrunks, i);
      dummy.scale.set(s, s * 1.15, s); dummy.position.set(x, y + 3.9 * s, z); put(leafCrowns, i);
      if (islandOK && i % 2 === 0) { dummy.position.set(x, y - .1, z); dummy.scale.set(4.6 * s, 2.3 * s, 4.6 * s); put(islandCards, i); if (leafOK) leafCards.setMatrixAt(i, zeroM); }
      else { if (islandOK) islandCards.setMatrixAt(i, zeroM); if (leafOK) { dummy.position.set(x, y - .1, z); dummy.scale.setScalar(3.4 * s); put(leafCards, i); } }
    });
    larchData.forEach((d, i) => {
      const z = wrapZ(d.z, t), x = center(z, t) + d.side * d.off, y = ground(z, t, d.side * d.off);
      const s = d.scale * vis(z, LARCH_D, d.h) * (ranchLook ? 0 : 1);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(s);
      dummy.position.set(x, y + 1.2 * s, z); put(larchTrunks, i);
      dummy.scale.set(s * .9, s, s * .9); dummy.position.set(x, y + 3.9 * s, z); put(larchCrowns, i);
      if (larchOK) { dummy.position.set(x, y - .1, z); dummy.scale.setScalar(3.6 * s); put(larchCards, i); }
    });
    rockData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * (5.2 * trail.width + d.off);
      // Sul salitone i sassi diventano massi.
      const k = 1 + dens(z, [0, 0, 1.6, .6]) * d.big;
      dummy.position.set(center(z, t) + w + d.side * (k - 1) * .8, ground(z, t, w) + .14 * k, z);
      dummy.rotation.set(Math.sin(i) * .12, i * 2.3, Math.cos(i * 1.7) * .12); dummy.scale.set((.35 + (i % 4) * .16) * k, (.28 + (i % 3) * .25) * k, .6 * k); put(rocks, i);
      if (rockVar) { const v = rockVar[i % rockVar.length], j = Math.floor(i / rockVar.length); dummy.position.y -= .14 * k; const sc = (.3 + (i % 4) * .1) * k; dummy.scale.set(sc, sc * (.8 + (i % 3) * .2), sc); put(v, j); v.count = Math.max(v.count, j + 1); }
    });
    for (const o of [trunks, crowns, tops, rocks, birchTrunks, leafCrowns, larchTrunks, larchCrowns, firA, firB, larchCards, leafCards, islandCards]) o.instanceMatrix.needsUpdate = true;
    if (rockVar) for (const v of rockVar) v.instanceMatrix.needsUpdate = true;
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
  // v73 · ciuffi d'erba veri: tanti fili sottili dipinti su sagome incrociate (al posto dei triangoli)
  const grassCardTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
    let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 64; i++) {   // v80 · meno fili e altezze più varie: da lontano non sembrano più blocchetti
      const bx = 14 + r() * 228, h = 40 + Math.pow(r(), .7) * 210, lean = (r() - .5) * 110, w = 1.6 + r() * 3;
      const g = 95 + r() * 90, col = `rgb(${(g * .62) | 0},${g | 0},${(g * .36) | 0})`;
      const grd = x.createLinearGradient(0, 256, 0, 256 - h); grd.addColorStop(0, 'rgb(118,128,66)'); grd.addColorStop(.35, col); grd.addColorStop(1, `rgb(${(g * .85) | 0},${(g * 1.05) | 0},${(g * .5) | 0})`);
      x.fillStyle = grd; x.beginPath(); x.moveTo(bx - w, 256); x.quadraticCurveTo(bx + lean * .4, 256 - h * .6, bx + lean, 256 - h); x.quadraticCurveTo(bx + lean * .4 + w * .4, 256 - h * .6, bx + w, 256); x.fill();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const grassCardGeo = (() => {
    const g = new T.BufferGeometry(), P = [], U = [], I = [];
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3, cx = Math.cos(a) * .32, cz = Math.sin(a) * .32, b = P.length / 3;
      P.push(-cx, 0, -cz, cx, 0, cz, cx, .62, cz, -cx, .62, -cz); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I);
    g.setAttribute('normal', new T.Float32BufferAttribute(new Array(P.length).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    return g;
  })();
  const grassCardMat = c => new T.MeshLambertMaterial({ color: c, map: grassCardTex, alphaTest: .45, side: T.DoubleSide, emissive: '#3a4520', emissiveIntensity: .55 });
  const TUFTS = 220;
  const tufts = new T.InstancedMesh(grassCardGeo, grassCardMat('#ffffff'), TUFTS);
  const tuftData = Array.from({ length: TUFTS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 4.9 + Math.pow(rand(), 1.6) * 9, z: rand() * 180, s: .7 + rand() * .8, r: rand() * 6 }));
  tuftData.forEach((d, i) => tufts.setColorAt(i, new T.Color().setHSL(.2 + rand() * .06, .25, .75 + rand() * .2)));
  tufts.receiveShadow = true; scene.add(tufts);
  // Felci del sottobosco: ciuffi larghi e bassi, verde scuro.
  const FERNS = 110;
  const ferns = new T.InstancedMesh(grassCardGeo, grassCardMat('#6f9c5a'), FERNS);
  const fernData = Array.from({ length: FERNS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 5 + Math.pow(rand(), 1.4) * 10, z: rand() * 180, s: 1.6 + rand() * 1.4, r: rand() * 6, h: rand() * .9 }));
  scene.add(ferns);
  // Canneti delle pozzanghere: ciuffi alti e sottili.
  const REEDS = 110;
  const reeds = new T.InstancedMesh(grassCardGeo, grassCardMat('#e0d48a'), REEDS);
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
  scene.add(shroomStems, shroomCaps); shroomStems.visible = shroomCaps.visible = false;
  const shrubs = new T.InstancedMesh(grassCardGeo, grassCardMat('#7f9a62'), 100);   // v73 · cespugli d'erba alta al posto delle palle verdi
  shrubs.receiveShadow = true; scene.add(shrubs);

  // v105 · piante vere (Poly Haven, CC0) renderizzate in Blender: atlante di foto con erba, tarassaco, felci e erbacce, una cella per ciuffo
  function atlasify(m, n, cellOf, url) {
    const g = m.geometry.clone(), N = m.count, a = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const c = cellOf(i); a[i * 2] = c % n; a[i * 2 + 1] = n - 1 - Math.floor(c / n); }
    g.setAttribute('aCell', new T.InstancedBufferAttribute(a, 2)); m.geometry = g;
    const mt = m.material; mt.userData.n = n;
    mt.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;').replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (vMapUv + aCell) / ${n}.0;\n#endif`); };
    texLoader.load(url, t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; mt.map = t; mt.emissiveIntensity = .12; if (m !== shrubs) mt.color.set('#ffffff'); mt.alphaTest = .5; mt.needsUpdate = true;
      const c = new T.Color(); for (let i = 0; i < N; i++) m.setColorAt(i, c.setRGB(.92 + Math.random() * .12, .95 + Math.random() * .1, .9 + Math.random() * .1)); m.instanceColor.needsUpdate = true; });
  }
  atlasify(tufts, 4, i => i % 10 < 7 ? i % 5 : 5 + i % 3, 'img/tex/plants.webp?t=1');
  atlasify(ferns, 4, i => 8 + i % 8, 'img/tex/plants.webp?t=1');
  atlasify(reeds, 4, i => i % 5, 'img/tex/plants.webp?t=1');
  atlasify(shrubs, 2, i => i % 4, 'img/tex/shrubs.webp?t=1');
  // Pozzanghere: stagni ai lati, staccionata di legno e balle di fieno nei prati.
  const PONDS = 14;
  const pondMat = new T.MeshStandardMaterial({ color: '#4f8fa0', roughness: .05, metalness: .35, transparent: true, opacity: .9 });
  // v97 · stagni a forma irregolare (non più ovali allungati) con la riva di fango bagnato
  const pondBlob = k => { const sh = new T.Shape(), N = 40; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = 1 + k + .16 * Math.sin(a * 3 + 1) + .09 * Math.sin(a * 5 + 2) + .05 * Math.sin(a * 9); const x = Math.cos(a) * r, y = Math.sin(a) * r * .85; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } return new T.ShapeGeometry(sh); };
  const ponds = new T.InstancedMesh(pondBlob(0), pondMat, PONDS);
  const pondShore = new T.InstancedMesh(pondBlob(.22), new T.MeshStandardMaterial({ color: '#4a3b2b', roughness: .6 }), PONDS);
  const pondData = Array.from({ length: PONDS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 9 + rand() * 9, z: i * 12.8 + rand() * 4, sx: 2.4 + rand() * 2.6, sz: 2.2 + rand() * 2.4, h: rand() * .7 }));
  ponds.receiveShadow = true; pondShore.receiveShadow = true; scene.add(ponds, pondShore);
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
      dummy.position.set(center(z, t) + w, ground(z, t, w) - .03, z);
      dummy.rotation.set(0, i * 2, 0); dummy.scale.set(size * 4.2, size * 3.2, size * 4.2); put(shrubs, i);
    }
    pondData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, v = vis(z, [0, 1, 0, 0], d.h);
      dummy.position.set(center(z, t) + w, ground(z, t, w) + .04, z);
      dummy.rotation.set(-Math.PI / 2, 0, i); dummy.scale.set(d.sx * v, d.sz * v, 1); put(ponds, i);
      dummy.position.y -= .025; put(pondShore, i);
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
    for (const m of [tufts, ferns, reeds, flowers, shroomStems, shroomCaps, shrubs, ponds, pondShore, posts, rails, hays, cairns, shrineBody, shrineRoof, shrineNiche]) m.instanceMatrix.needsUpdate = true;
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

  // v84 · Giro easy tra le vigne: filari di viti ai lati (pali, chiome e grappoli)
  const VROWS = 8, VPER = 72, VSTEP = 180 / VPER;
  // v105 · filari veri: foto di un filare di Nebbiolo (generata con Higgsfield, scontornata) su due pareti parallele per ogni tratto
  const vineGeo = (() => {
    const g = new T.BufferGeometry(), P = [], U = [], I = [], L = VSTEP * 1.02, H = 1.95;
    const quad = (x, u0) => { const o = P.length / 3; P.push(x, 0, -L / 2, x, 0, L / 2, x, H, L / 2, x, H, -L / 2); U.push(u0, 0, u0 + .5, 0, u0 + .5, 1, u0, 1); I.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    quad(-.16, 0); quad(.16, .5);
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
  })();
  const vineMat = new T.MeshLambertMaterial({ alphaTest: .5, side: T.DoubleSide, color: '#ffffff' });
  const vineLeaf = new T.InstancedMesh(vineGeo, vineMat, VROWS * VPER);
  vineLeaf.castShadow = true; vineLeaf.receiveShadow = true; scene.add(vineLeaf); vineLeaf.visible = false;
  let vineOK = false;
  texLoader.load('img/tex/vine_row.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.wrapS = T.RepeatWrapping; vineMat.map = t; vineMat.needsUpdate = true; vineOK = true; });
  { const c = new T.Color(); for (let i = 0; i < VROWS * VPER; i++) { const r = Math.abs(Math.sin(i * 12.9898) * 43758.5) % 1; vineLeaf.setColorAt(i, c.setRGB(.9 + r * .14, .92 + r * .1, .88 + r * .1)); } }
  function vineyard(t, on) {
    vineLeaf.visible = on && vineOK;
    if (!on || !vineOK) return;
    for (let r = 0; r < VROWS; r++) {
      const side = r % 2 ? 1 : -1, w = side * (6.2 + Math.floor(r / 2) * 2.3) * (trail.width * .5 + .5);
      for (let k = 0; k < VPER; k++) {
        const i = r * VPER + k, z = wrapZ(k * VSTEP + r * .7, t), x = center(z, t) + w, y = ground(z, t, w);
        const z2 = z - .5, x2 = center(z2, t) + w, yaw = Math.atan2(x - x2, z - z2);
        dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, .92 + ((k * 7 + r * 3) % 5) * .04, k % 2 ? 1 : -1);
        dummy.position.set(x, y - .05, z); put(vineLeaf, i);
      }
    }
    vineLeaf.instanceMatrix.needsUpdate = true;
  }

  // v102 · Gusta Ranch sulle colline dell'Astigiano: noccioleti in filari, cascine e campanili sui bricchi
  const HAZ = 96, hazelData = Array.from({ length: HAZ }, (_, i) => ({ side: i % 2 ? 1 : -1, row: Math.floor(i / 24), z: (i % 24) * 7.5 + rand() * 1.5, s: .8 + rand() * .45 }));
  const hazelCrown = new T.InstancedMesh((() => { const g = new T.IcosahedronGeometry(1, 1); g.scale(1.5, 1.15, 1.5); return g; })(), new T.MeshStandardMaterial({ roughness: .9, flatShading: true }), HAZ);
  const hazelTrunk = new T.InstancedMesh(new T.CylinderGeometry(.09, .16, 1.4, 6), bark, HAZ);
  { const cols = ['#6f8a3c', '#7d963f', '#9aa047', '#b9a346', '#87913a']; const c = new T.Color(); for (let i = 0; i < HAZ; i++) hazelCrown.setColorAt(i, c.set(cols[i % cols.length])); }
  const FARMS = 7, farmData = Array.from({ length: FARMS }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 46 + rand() * 30, z: i * 25.7 + rand() * 8, tower: i % 3 === 0, rot: rand() * 6 }));
  const farmWall = new T.InstancedMesh(new T.BoxGeometry(7, 3.4, 4.2), new T.MeshStandardMaterial({ color: '#e0c08e', roughness: .95 }), FARMS);
  const farmRoof = new T.InstancedMesh((() => { const g = new T.CylinderGeometry(0, 3.3, 1.5, 4, 1); g.rotateY(Math.PI / 4); g.scale(1.55, 1, .95); return g; })(), new T.MeshStandardMaterial({ color: '#a8482e', roughness: .9, flatShading: true }), FARMS);
  const towerBody = new T.InstancedMesh(new T.BoxGeometry(1.5, 9, 1.5), new T.MeshStandardMaterial({ color: '#c98d5e', roughness: .95 }), FARMS);
  const towerTop = new T.InstancedMesh((() => { const g = new T.ConeGeometry(1.2, 2.4, 4); g.rotateY(Math.PI / 4); return g; })(), new T.MeshStandardMaterial({ color: '#8f3f2a', roughness: .9, flatShading: true }), FARMS);
  for (const m of [hazelCrown, hazelTrunk, farmWall, farmRoof, towerBody, towerTop]) { m.castShadow = m !== farmWall; m.receiveShadow = true; m.visible = false; scene.add(m); }
  function astigiano(t, on) {
    for (const m of [hazelCrown, hazelTrunk, farmWall, farmRoof, towerBody, towerTop]) m.visible = on;
    if (!on) return;
    hazelData.forEach((d, i) => {
      const off = (25 + d.row * 4.2) * (trail.width * .5 + .5), z = wrapZ(d.z, t), w = d.side * off, x = center(z, t) + w, y = ground(z, t, w);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(d.s); dummy.position.set(x, y + .7 * d.s, z); put(hazelTrunk, i);
      dummy.position.set(x, y + 1.9 * d.s, z); put(hazelCrown, i);
    });
    farmData.forEach((d, i) => {
      const z = wrapZ(d.z, t), w = d.side * d.off, x = center(z, t) + w, y = ground(z, t, w);
      dummy.rotation.set(0, d.rot, 0); dummy.scale.setScalar(1);
      dummy.position.set(x, y + 1.6, z); put(farmWall, i); dummy.position.set(x, y + 4.05, z); put(farmRoof, i);
      if (d.tower) { dummy.position.set(x + 4.6, y + 4.5, z + 1.2); put(towerBody, i); dummy.position.set(x + 4.6, y + 10.2, z + 1.2); put(towerTop, i); }
      else { dummy.scale.setScalar(0); put(towerBody, i); put(towerTop, i); }
    });
    for (const m of [hazelCrown, hazelTrunk, farmWall, farmRoof, towerBody, towerTop]) m.instanceMatrix.needsUpdate = true;
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
  // v61 · fondale dipinto (panorama generato con Higgsfield) per ogni tracciato, dietro le colline vicine
  const PANO_R = 262, PANO_ARC = Math.PI * .85, PANO_H = 165;
  const panoFade = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#000'); g.addColorStop(.1, '#fff'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const t = new T.CanvasTexture(c); return t; })();
  const panoMat = new T.MeshBasicMaterial({ color: '#ffffff', side: T.BackSide, fog: false, transparent: true, alphaMap: panoFade, depthWrite: false, opacity: 0 });
  const pano = new T.Mesh(new T.CylinderGeometry(PANO_R, PANO_R, PANO_H, 64, 1, true, Math.PI - PANO_ARC / 2, PANO_ARC), panoMat);
  pano.renderOrder = -90; pano.visible = false; scene.add(pano);
  const panoTex = {}; let panoMode = -1;
  function setPano(mode) {
    if (mode === panoMode) return; panoMode = mode;
    const show = t => { if (panoMode !== mode) return; panoMat.map = t; panoMat.needsUpdate = true; pano.visible = !!t; panoMat.opacity = 1; ridges[0].visible = !t; };
    if (panoTex[mode] !== undefined) { show(panoTex[mode]); return; }
    panoTex[mode] = null; show(null);
    new T.TextureLoader().load('img/pano-' + mode + '.webp?t=1', t => {
      t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.x = -1; t.anisotropy = 4;
      panoTex[mode] = t; show(t);
    }, undefined, () => { panoTex[mode] = null; });
  }
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
        const sl = p.ice ? Math.min(cols.snow, 2) : cols.snow;
        if (y > sl) tmp.lerp(snow.clone().multiplyScalar(.75 + shade * .3), Math.min(1, (y - sl) / 9));
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
  // v53 · ruote vere: copertone a sezione squadrata (tornito), tasselli sfalsati su tre file, cerchio a canale, mozzo e raggi incrociati
  const tyreGeo = (() => {
    const pts = [], R = .475, r0 = .30, w = .125;
    // profilo (raggio, larghezza) del copertone: spalla arrotondata, battistrada piatto
    const prof = [[r0, -w * .62], [r0 + .03, -w * .9], [R - .06, -w], [R - .02, -w * .92], [R, -w * .6], [R + .004, 0], [R, w * .6], [R - .02, w * .92], [R - .06, w], [r0 + .03, w * .9], [r0, w * .62]];
    for (const [rr, xx] of prof) pts.push(new T.Vector2(rr, xx));
    const g = new T.LatheGeometry(pts, 40); g.rotateZ(Math.PI / 2); return g;
  })();
  const rimGeo = (() => {
    const pts = [[.262, -.07], [.30, -.075], [.305, -.062], [.27, -.05], [.262, 0], [.27, .05], [.305, .062], [.30, .075], [.262, .07]].map(([a, b]) => new T.Vector2(a, b));
    const g = new T.LatheGeometry(pts, 40); g.rotateZ(Math.PI / 2); return g;
  })();
  const knobGeo = new RoundedBoxGeometry(.07, .05, .075, 1, .014);
  const hubMat = mat('#2c3236', .35, .6);
  // v80 · unisce in un solo pezzo tutti i figli di un gruppo che hanno lo stesso materiale (tasselli, raggi…):
  // stesso aspetto, molti meno oggetti da disegnare per fotogramma (prima ogni ruota erano ~110 pezzi).
  function mergeByMaterial(root, min = 3) {
    const groups = new Map();
    for (const o of root.children) if (o.isMesh && !o.isInstancedMesh && !o.userData.keep && !o.name && !o.children.length) { if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); }
    for (const [m, list] of groups) {
      if (list.length < min) continue;
      const parts = list.map(o => { o.updateMatrix(); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrix); return g; });
      const n = parts.reduce((t, g) => t + g.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let off = 0;
      for (const g of parts) {
        const c = g.attributes.position.count;
        pos.set(g.attributes.position.array, off * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
        off += c; g.dispose();
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      for (const o of list) root.remove(o);
      mesh(geo, m, root);
    }
  }
  function wheel(parent, x, y, z) {
    const root = new T.Group(); root.position.set(x, y, z); parent.add(root);
    mesh(tyreGeo, rubber, root);
    mesh(rimGeo, rimMat, root);
    rod([-.105, 0, 0], [.105, 0, 0], .062, hubMat, root);
    for (const side of [-1, 1]) { const fl = mesh(new T.CylinderGeometry(.085, .085, .018, 20), alloy, root); fl.rotation.z = Math.PI / 2; fl.position.x = side * .075; }
    for (let i = 0; i < 18; i++) {
      const a = i * Math.PI * 2 / 18, side = i % 2 ? 1 : -1, b = a + side * .28;
      rod([side * .075, Math.cos(a) * .075, Math.sin(a) * .075], [side * .035, Math.cos(b) * .27, Math.sin(b) * .27], .0065, alloy, root);
    }
    for (let i = 0; i < 26; i++) {
      const a = i * Math.PI * 2 / 26;
      const rows = i % 2 ? [-.075, .075] : [0];
      for (const off of rows) { const k = mesh(knobGeo, treadMat, root); k.position.set(off, Math.cos(a) * .487, Math.sin(a) * .487); k.rotation.x = a; }
      for (const side of [-1, 1]) { const k = mesh(knobGeo, treadMat, root); k.scale.set(.7, .8, .8); k.position.set(side * .118, Math.cos(a + .12) * .455, Math.sin(a + .12) * .455); k.rotation.set(a + .12, 0, side * .5); }
    }
    mergeByMaterial(root);
    wheels.push(root); return root;
  }
  // Pezzi sagomati: un profilo laterale (z, y) estruso lungo x e smussato, centrato su x.
  function sideShape(path, depth, m, p, x = 0, bevel = .018, steps = 1) {
    const s = new T.Shape(); path(s);
    const g = new T.ExtrudeGeometry(s, { depth, steps, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
    const o = mesh(g, m, p); o.position.x = x; return o;
  }
  // v76 · plastiche "modellate": profilo laterale (z, y) + sezione arrotondata (superellisse) che cambia lungo la moto.
  // Niente più lastre estruse: serbatoio, sella, fianchetti e convogliatori hanno fianchi bombati come quelli veri.
  // hw(t) = mezza larghezza (t: 0 davanti → 1 dietro) · n = squadratura della sezione (2 ellisse, 4 quasi box)
  // topNarrow = quanto si stringe in alto · bulge(t, ys) = spostamento laterale (curva la lastra verso l'esterno)
  function loftShape(path, hw, m, p, o = {}) {
    const { n = 2.4, seg = 34, rings = 22, x = 0, bulge = null, topNarrow = 0, endRound = .3 } = o;
    const s = new T.Shape(); path(s);
    const poly = s.getPoints(10);
    let z0 = Infinity, z1 = -Infinity; for (const q of poly) { z0 = Math.min(z0, q.x); z1 = Math.max(z1, q.x); }
    const slice = z => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a.x - z) * (b.x - z) <= 0 && a.x !== b.x) { const y = a.y + (b.y - a.y) * (z - a.x) / (b.x - a.x); lo = Math.min(lo, y); hi = Math.max(hi, y); } } return lo <= hi ? [lo, hi] : [0, 0]; };
    const e = 2 / n, sp = v => Math.sign(v) * Math.pow(Math.abs(v), e);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = .5 - .5 * Math.cos(Math.PI * i / seg), z = z0 + (z1 - z0) * (.004 + .992 * t);
      const [lo, hi] = slice(z), yc = (lo + hi) / 2, hy = (hi - lo) / 2;
      const w = hw(t) * Math.max(.2, Math.pow(Math.sin(Math.PI * t), endRound));
      for (let j = 0; j <= rings; j++) {
        const a = -Math.PI / 2 + j / rings * Math.PI * 2, ys = sp(Math.sin(a));
        let xx = sp(Math.cos(a)) * w * (1 - topNarrow * Math.max(0, ys));
        if (bulge) xx += bulge(t, ys);
        const y = yc + ys * hy; pos.push(x + xx, y, z); uv.push(z, y);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rings; j++) { const a = i * (rings + 1) + j, b = a + rings + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return mesh(g, m, p);
  }
  // parafanghi a sezione curva (scendono ai lati come quelli veri)
  function bendFender(o, k) { const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i); a.setY(i, a.getY(i) - k * x * x); } a.needsUpdate = true; o.geometry.computeVertexNormals(); return o; }
  // Profilo frontale (x, y) estruso lungo z: tabella portanumero, piastre.
  function frontShape(path, depth, m, p, bevel = .012) {
    const s = new T.Shape(); path(s);
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
    g.translate(0, 0, -depth / 2); return mesh(g, m, p);
  }
  const tube = (pts, r, m, p, seg = 32) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v => new T.Vector3(...v))), seg, r, 10), m, p);
  const rearWheel = wheel(pitch, 0, .47, .82); rearWheel.name = 'wheelR';
  const frontWheel = wheel(front, 0, .47, -.86 - STEER_Z); frontWheel.name = 'wheelF';
  // v46 · chiodi sulle gomme (Ice Scrophy): si vedono solo se montati in officina
  const studMat = new T.MeshStandardMaterial({ color: '#c9d2d6', roughness: .25, metalness: .85, emissive: '#000000' });
  const studGeo = new T.ConeGeometry(.022, .07, 5);
  const studSets = [rearWheel, frontWheel].map(w => {
    const inst = new T.InstancedMesh(studGeo, studMat, 44); inst.name = 'fx'; inst.castShadow = false;
    const d = new T.Object3D();
    for (let i = 0; i < 22; i++) for (const side of [0, 1]) {
      const a = i * Math.PI * 2 / 22 + side * .14;
      d.position.set((side ? 1 : -1) * .07, Math.cos(a) * .5, Math.sin(a) * .5); d.rotation.set(a, 0, 0); d.updateMatrix(); inst.setMatrixAt(i * 2 + side, d.matrix);
    }
    inst.visible = false; w.add(inst); return inst;
  });
  // v53 · Telaio, forcellone, mono, motore, serbatoio, sella: pezzi sagomati e smussati, non più blocchetti
  const frameMat = mat('#22272b', .38, .55), engMat = mat('#3b4146', .42, .55), forkMat = mat('#1d2124', .3, .6);
  const ZF = z => z - STEER_Z; // z del mondo → z locale dello sterzo
  for (const side of [-1, 1]) {
    tube([[side * .045, 1.2, -.56], [side * .11, 1.12, -.36], [side * .135, .99, -.06], [side * .135, .83, .14], [side * .12, .67, .2]], .03, frameMat, chassis);
    tube([[side * .04, 1.1, -.6], [side * .075, .82, -.54], [side * .1, .53, -.4], [side * .11, .46, -.08], [side * .12, .56, .17]], .024, frameMat, chassis);
    tube([[side * .125, .94, .1], [side * .125, 1.1, .5], [side * .1, 1.18, .86]], .019, frameMat, chassis, 16);
    // forcellone rastremato
    sideShape(s => { s.moveTo(.13, .74); s.lineTo(.84, .52); s.quadraticCurveTo(.91, .47, .84, .42); s.lineTo(.15, .6); s.quadraticCurveTo(.07, .67, .13, .74); }, .035, alloy, chassis, side * .14, .012);
    // radiatori con griglia
    box(.06, .3, .27, black, chassis, side * .17, 1.0, -.38);
    for (let i = 0; i < 6; i++) box(.07, .012, .25, alloy, chassis, side * .175, .88 + i * .045, -.38);
    // convogliatori del radiatore (portano la grafica laterale)
    loftShape(s => { s.moveTo(-.66, 1.25); s.quadraticCurveTo(-.48, 1.32, -.24, 1.28); s.lineTo(-.06, 1.2); s.quadraticCurveTo(.02, 1.15, -.05, 1.1); s.lineTo(-.24, 1.0); s.quadraticCurveTo(-.42, .86, -.57, .85); s.quadraticCurveTo(-.71, .87, -.71, 1.02); s.quadraticCurveTo(-.71, 1.19, -.66, 1.25); }, () => .017, plastic, chassis, { x: side * .214, n: 3, endRound: .5, bulge: (t, ys) => side * .022 * (1 - ys * ys * .8) * Math.sin(Math.PI * t) });   // v76 · convogliatori bombati   // v74 · convogliatori aderenti al serbatoio (prima sporgevano come ali)
    // fianchetti posteriori
    loftShape(s => { s.moveTo(.02, 1.21); s.lineTo(.7, 1.23); s.quadraticCurveTo(.78, 1.21, .71, 1.13); s.lineTo(.27, .9); s.quadraticCurveTo(.13, .84, .07, .93); s.lineTo(.0, 1.1); s.quadraticCurveTo(-.01, 1.19, .02, 1.21); }, () => .02, sidePanel, chassis, { x: side * .196, n: 3, endRound: .5, bulge: (t, ys) => side * .014 * (1 - ys * ys) * Math.sin(Math.PI * t) });   // v76 · fianchetti bombati
    // pedane
    rod([side * .1, .62, .13], [side * .29, .63, .13], .024, alloy, chassis);
  }
  rod([0, 1.04, -.635], [0, 1.31, -.565], .052, frameMat, chassis); // canotto di sterzo
  // monoammortizzatore: stelo, molla e serbatoio
  { const a = new T.Vector3(0, .62, .3), b = new T.Vector3(0, 1.08, .06), d = b.clone().sub(a).normalize();
    rod(a.toArray(), b.toArray(), .03, gold, chassis);
    for (let i = 0; i < 9; i++) { const c = mesh(new T.TorusGeometry(.068, .013, 6, 14), spring, chassis); c.position.copy(a).lerp(b, .22 + i * .065); c.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d); }
    rod([0, 1.0, .1], [0, 1.08, -.06], .045, black, chassis); }
  // motore: carter sagomato, coperchi, cilindro alettato inclinato
  sideShape(s => { s.moveTo(-.36, .53); s.lineTo(.1, .5); s.quadraticCurveTo(.2, .52, .2, .63); s.lineTo(.18, .79); s.quadraticCurveTo(.12, .87, 0, .85); s.lineTo(-.3, .81); s.quadraticCurveTo(-.43, .72, -.36, .53); }, .22, engMat, chassis, 0, .03);
  { const c = mesh(new T.CylinderGeometry(.13, .14, .05, 28), alloy, chassis); c.rotation.z = Math.PI / 2; c.position.set(.15, .67, -.1); }
  { const c = mesh(new T.CylinderGeometry(.1, .11, .05, 24), alloy, chassis); c.rotation.z = Math.PI / 2; c.position.set(-.15, .65, -.14); }
  { const base = new T.Vector3(0, .8, -.2), ax = new T.Vector3(0, Math.cos(.38), -Math.sin(.38));
    // v77 · cilindro tondo con alette a disco (prima erano parallelepipedi)
    const cyl = mesh(new T.CylinderGeometry(.092, .1, .3, 24), engMat, chassis); cyl.position.copy(base.clone().addScaledVector(ax, .15)); cyl.rotation.x = -.38;
    for (let i = 0; i < 6; i++) { const f = mesh(new T.CylinderGeometry(.13 - i * .006, .13 - i * .006, .012, 24), alloy, chassis); f.position.copy(base.clone().addScaledVector(ax, .04 + i * .045)); f.rotation.x = -.38; f.scale.z = .9; }
    const hc = box(.21, .07, .2, black, chassis, ...base.clone().addScaledVector(ax, .33).toArray()); hc.rotation.x = -.38; }
  // paramotore
  sideShape(s => { s.moveTo(-.44, .58); s.quadraticCurveTo(-.4, .42, -.2, .42); s.lineTo(.12, .44); s.lineTo(.15, .52); s.lineTo(-.36, .6); s.lineTo(-.44, .58); }, .27, alloy, chassis, 0, .012);
  // serbatoio e sella lunga piatta da enduro
  // v76 · serbatoio a goccia (largo in basso, stretto in alto) e sella stretta davanti, larga dietro, con bordo arrotondato
  loftShape(s => { s.moveTo(-.65, 1.17); s.quadraticCurveTo(-.58, 1.31, -.38, 1.325); s.quadraticCurveTo(-.14, 1.325, -.02, 1.24); s.lineTo(-.05, 1.04); s.quadraticCurveTo(-.3, .98, -.57, 1.02); s.lineTo(-.65, 1.17); }, t => .15 - .045 * t, plastic, chassis, { n: 2.5, topNarrow: .35, endRound: .35 });
  loftShape(s => { s.moveTo(-.44, 1.26); s.quadraticCurveTo(-.32, 1.36, -.06, 1.335); s.lineTo(.56, 1.345); s.quadraticCurveTo(.73, 1.35, .79, 1.28); s.lineTo(.75, 1.2); s.lineTo(-.2, 1.2); s.quadraticCurveTo(-.37, 1.2, -.44, 1.26); }, t => .075 + .06 * Math.min(1, t / .4), seatMat, chassis, { n: 3.4, topNarrow: .12, endRound: .2, seg: 40 });
  // parafango posteriore a coda alta
  bendFender(sideShape(s => { s.moveTo(.5, 1.25); s.lineTo(.95, 1.27); s.quadraticCurveTo(1.17, 1.3, 1.31, 1.37); s.lineTo(1.31, 1.33); s.quadraticCurveTo(1.16, 1.23, .95, 1.19); s.lineTo(.5, 1.17); s.lineTo(.5, 1.25); }, .25, plastic, chassis, 0, .018, 8), 3.2);
  const brakeLightMat = new T.MeshStandardMaterial({ color: '#fc441f', roughness: .3, emissive: '#ff2a00', emissiveIntensity: .3 });
  box(.15, .05, .04, brakeLightMat, chassis, 0, 1.19, 1.16);
  // scarico 4 tempi: collettore curvo e silenziatore
  const exhaustParts = [tube([[.05, .97, -.4], [.12, .8, -.47], [.21, .71, -.3], [.25, .78, 0], [.28, .95, .3], [.29, 1.04, .45]], .033, alloy, chassis, 40),
    rod([.29, 1.04, .43], [.31, 1.17, 1.06], .075, pipeMat, chassis), rod([.31, 1.17, 1.05], [.315, 1.18, 1.13], .052, black, chassis)];
  // v97 · elettrica: pacco batterie al posto del motore (niente scarico)
  const battMat = mat('#2b3640', .45, .35), battGreen = new T.MeshStandardMaterial({ color: '#19c37d', roughness: .35, emissive: '#0c6b42', emissiveIntensity: .6 });
  for (const m of exhaustParts) m.userData.keep = true;   // fuori dall'unione delle geometrie: si devono poter nascondere
  const battery = new T.Group(); chassis.add(battery); battery.visible = false;
  box(.25, .3, .5, battMat, battery, 0, .68, -.1); box(.256, .035, .5, battGreen, battery, 0, .74, -.1); box(.2, .05, .2, mat('#14181c', .6), battery, 0, .85, -.05); battery.traverse(o => { if (o.isMesh) o.userData.keep = true; });
  // forcella a steli rovesciati, piastre, parafango, tabella e manubrio
  for (const side of [-1, 1]) {
    const zAt = y => ZF(-.86 + (y - .48) * .3375);
    rod([side * .14, .86, zAt(.86)], [side * .14, 1.36, zAt(1.36)], .05, forkMat, front);
    rod([side * .14, .49, zAt(.49)], [side * .14, .9, zAt(.9)], .036, gold, front);
    box(.07, .12, .1, alloy, front, side * .14, .5, zAt(.5));
  }
  for (const [y, w] of [[1.17, .42], [1.33, .4]]) { const c = box(w, .05, .13, alloy, front, 0, y, ZF(-.86 + (y - .48) * .3375) + .02); c.rotation.x = .32; }
  bendFender(sideShape(s => { s.moveTo(ZF(-1.3), 1.03); s.quadraticCurveTo(ZF(-1.0), 1.09, ZF(-.64), 1.04); s.lineTo(ZF(-.52), .99); s.lineTo(ZF(-.56), .96); s.quadraticCurveTo(ZF(-.95), 1.03, ZF(-1.3), .985); s.lineTo(ZF(-1.3), 1.03); }, .18, plastic, front, 0, .016, 8), 4.2);
  { const np = frontShape(s => { s.moveTo(-.15, .13); s.quadraticCurveTo(0, .21, .15, .13); s.lineTo(.11, -.15); s.quadraticCurveTo(0, -.2, -.11, -.15); s.lineTo(-.15, .13); }, .02, sidePanel, front); np.position.set(...F(0, 1.37, -.70)); np.rotation.x = .3; }
  rod(F(0, 1.34, -.56), F(0, 1.46, -.55), .035, alloy, front);
  tube([F(-.48, 1.5, -.5), F(-.3, 1.475, -.55), F(0, 1.465, -.565), F(.3, 1.475, -.55), F(.48, 1.5, -.5)], .022, alloy, front, 24);
  box(.17, .05, .06, accent, front, ...F(0, 1.49, -.565));
  for (const side of [-1, 1]) rod(F(side * .36, 1.485, -.535), F(side * .5, 1.5, -.5), .036, black, front);
  const rearDisc = mesh(new T.CylinderGeometry(.15, .15, .01, 30), alloy, rearWheel); rearDisc.rotation.z = Math.PI / 2; rearDisc.position.x = .1;
  const frontDisc = mesh(new T.CylinderGeometry(.17, .17, .01, 30), alloy, frontWheel); frontDisc.rotation.z = Math.PI / 2; frontDisc.position.x = -.1;
  box(.04, .1, .08, black, front, -.13, .62, ZF(-.76));

  // Fiamma di scarico del turbo.
  const flameMat = new T.MeshBasicMaterial({ color: '#ffb12b', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
  const flame = new T.Mesh(new T.ConeGeometry(.09, .55, 10, 1, true), flameMat);
  flame.rotation.x = -Math.PI / 2; flame.position.set(.31, 1.18, 1.22); flame.userData.keep = true; flame.name = 'fx'; chassis.add(flame);
  const flameCore = new T.Mesh(new T.ConeGeometry(.05, .32, 8, 1, true), new T.MeshBasicMaterial({ color: '#fff4c4', transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  flameCore.rotation.x = -Math.PI / 2; flameCore.position.set(.31, 1.18, 1.1); flameCore.userData.keep = true; flameCore.name = 'fx'; chassis.add(flameCore);

  // Pilota: gambe sulle pedane (fisse), busto che si alza, braccia e cosce che si adattano.
  const rider = new T.Group(); rider.name = 'rider'; chassis.add(rider);
  const upper = new T.Group(); rider.add(upper);
  ball(.18, .14, .17, pantsMat, upper, 0, 1.41, .27);   // v72 · proporzioni da pilota vero (prima era tutto gonfio)
  const body = new T.Group(); body.position.set(0, 1.42, .25); upper.add(body);
  const B = (x, y, z) => [x, y - 1.42, z - .25];
  // v53 · busto a capsula, spalle con paraspalle, collare e casco da cross con mentoniera, maschera e frontino
  const jersey = mesh(new T.CapsuleGeometry(.155, .3, 8, 18), jerseyMat, body); jersey.position.set(...B(0, 1.76, .19)); jersey.scale.set(1.3, 1, .78); jersey.rotation.x = -.26;
  { const back = mesh(new T.CapsuleGeometry(.12, .22, 6, 14), jerseyMat, body); back.position.set(...B(0, 1.66, .25)); back.scale.set(1.35, 1, .7); back.rotation.x = -.3; }
  const anchor = (parent, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const joints = [];
  // v97 · pezzi modellati in Blender (casco, maschera, stivali): geometrie compresse in pilota3d.js
  const partGeo = (() => { const cache = {}; return (part, m) => {
    const k = part + '/' + m; if (cache[k]) return cache[k];
    const [nv, ni, b64] = RIDER_PARTS[part][m], bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const pos = new Int16Array(bin.slice(0, nv * 6)), nor = new Int8Array(bin.slice(nv * 6, nv * 9)), idx = new Uint16Array(bin.slice(nv * 9, nv * 9 + ni * 2));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(Float32Array.from(pos, v => v / 8192), 3));
    g.setAttribute('normal', new T.BufferAttribute(Float32Array.from(nor, v => v / 127), 3));
    g.setIndex(new T.BufferAttribute(idx, 1)); g.computeBoundingSphere();
    return (cache[k] = g); }; })();
  const strapMat = mat('#313b39', .75), bootTrim = mat('#b6b7a8', .5), lensMat = new T.MeshStandardMaterial({ color: '#2a8fc4', roughness: .08, metalness: .7, emissive: '#0b3550', emissiveIntensity: .4 });
  for (const side of [-1, 1]) {
    ball(.095, .06, .105, black, body, ...B(side * .19, 1.95, .15));
    // stivali: gambale e piede sagomati
    // v94 · gamba sotto il ginocchio in un gruppo che ruota sul ginocchio: in derapata la gamba interna esce verso il ghiaccio
    const legPivot = new T.Group(); legPivot.position.set(side * .33, 1.08, .08); rider.add(legPivot);
    const legIn = new T.Group(); legIn.position.set(-side * .33, -1.08, -.08); legPivot.add(legIn);
    { const boot = new T.Group(); boot.position.set(side * .31, .74, .15); boot.rotation.x = -.3; boot.scale.set(-side, 1.06, 1); legIn.add(boot);   // v97 · stivale da cross modellato in Blender: gambale, piede, suola, parastinco e 4 fibbie
      for (const [m, mt] of [['boot', white], ['sole', black], ['accent', accent], ['buckle', alloy]]) mesh(partGeo('boot', m), mt, boot); }
    joints.push({
      side, legPivot, legIn, out: 0,
      hip: anchor(upper, side * .16, 1.43, .27), knee: anchor(legIn, side * .35, 1.12, .07),
      shoulder: anchor(body, ...B(side * .23, 1.97, .09)), grip: anchor(front, ...F(side * .43, 1.49, -.53)),
    });
  }
  { const nb = mesh(new T.TorusGeometry(.105, .032, 8, 20), black, body); nb.position.set(...B(0, 2.02, .13)); nb.rotation.x = Math.PI / 2 - .3; }
  const head = new T.Group(); head.position.set(...B(0, 2.17, .035)); body.add(head);
  // v72 · casco da cross in scala vera: calotta, mentoniera sporgente, frontino, maschera con elastico
  // v97 · casco da cross modellato in Blender: calotta con mentoniera a becco, frontino nervato, maschera con elastico, grafica nel colore della livrea
  const helmGroup = new T.Group(); helmGroup.position.set(0, -.01, .01); head.add(helmGroup);
  { const hg = helmGroup; for (const [m, mt] of [['helmet', helmetMat], ['accent', accent], ['black', black], ['lens', lensMat]]) mesh(partGeo('helmet', m), mt, hg); }
  // v97 · action cam sul casco: cinese, GoPro, Action360 EDT (il top, su un'asticella con due obiettivi)
  const camModels = {};
  { const camBlack = mat('#151515', .4), camGrey = mat('#4a4d50', .5), camLens = new T.MeshStandardMaterial({ color: '#0c1a22', roughness: .05, metalness: .8 }), camGold = mat('#f2c230', .3, .4);
    const mk = id => { const g = new T.Group(); g.name = 'fxcam'; g.position.set(0, .178, -.035); g.visible = false; head.add(g); camModels[id] = g; return g; };
    { const g = mk('cinese'); box(.052, .036, .042, camGrey, g, 0, .02, 0); const l = mesh(new T.CylinderGeometry(.011, .011, .012, 12), camLens, g); l.rotation.x = Math.PI / 2; l.position.set(.012, .02, -.026); }
    { const g = mk('gopro'); box(.046, .042, .034, camBlack, g, 0, .024, 0); const l = mesh(new T.CylinderGeometry(.013, .014, .014, 14), camLens, g); l.rotation.x = Math.PI / 2; l.position.set(.01, .026, -.022); box(.014, .006, .006, mat('#e8e8e8', .4), g, -.012, .044, -.012); }
    { const g = mk('action360'); mesh(new T.CylinderGeometry(.005, .005, .07, 8), camBlack, g).position.y = .035; box(.03, .05, .026, camBlack, g, 0, .09, 0); box(.032, .008, .028, camGold, g, 0, .118, 0);
      for (const sd of [-1, 1]) { const l = mesh(new T.SphereGeometry(.011, 12, 8), camLens, g); l.position.set(0, .094, sd * .014); } }
  }
  for (const side of [-1, 1]) {
    box(.1, .04, .02, accent, body, ...B(side * .15, 1.58, .33));
    const lg = joints.find(j => j.side === side).legIn;
    ball(.075, .095, .07, accent, lg, side * .345, 1.13, .03);
  }
  // Arti dinamici: cilindri unitari orientati ogni fotogramma tra due giunti.
  const unitCyl = r => new T.CylinderGeometry(r, r, 1, 12);
  const limbs = [];
  for (const j of joints) {
    j.thigh = mesh(new T.CylinderGeometry(.078, .098, 1, 12), pantsMat, rider); j.thigh.userData.keep = true;
    j.upperArm = mesh(new T.CylinderGeometry(.06, .07, 1, 12), jerseyMat, rider); j.upperArm.userData.keep = true;
    j.forearm = mesh(new T.CylinderGeometry(.047, .058, 1, 12), jerseyMat, rider); j.forearm.userData.keep = true;
    j.glove = ball(.055, .05, .07, black, rider); j.glove.userData.keep = true;
    { const cuff = mesh(new T.CylinderGeometry(1.08, 1.08, .55, 14), accent, j.glove); cuff.rotation.x = Math.PI / 2; cuff.position.z = .85; cuff.userData.keep = true; }   // v89 · polsino del guanto
    j.elbowBall = ball(.066, .066, .07, accent, rider);   // v89 · gomitiere col colore della livrea j.elbowBall.userData.keep = true;
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
      _e.copy(sh).lerp(grip, .5); _e.x += j.side * .19; _e.y += .11;   // v97 · gomiti alti e larghi, come i piloti veri
      const reach = sh.distanceTo(grip); _e.z += Math.max(0, .62 - reach) * .4;
      placeLimb(j.upperArm, sh, _e); placeLimb(j.forearm, _e, grip);
      j.glove.position.copy(grip); j.elbowBall.position.copy(_e);
    }
  }
  // v105 · pilota vero: modello generato (Higgsfield), scheletrato e messo in posa in Blender (seduto e in piedi sulle pedane).
  // Il casco resta quello modellato (con livrea, telecamere e orecchie): segue il collo del modello. Maglia e pantaloni prendono i colori della livrea.
  const riderJerseyTint = { value: new T.Color('#ffffff') }, riderPantsTint = { value: new T.Color('#ffffff') };
  let riderGlb = null, riderBaseMat = null;
  // materiale del pilota con maglia e pantaloni colorati (uniform proprie: una per il giocatore, una per ogni compagno)
  function riderMat(uJ, uP) {
    const m = riderBaseMat.clone();
    m.onBeforeCompile = sh => {
      sh.uniforms.uJ = uJ; sh.uniforms.uP = uP;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uJ; uniform vec3 uP; varying float vH;')
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
{ float lo = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)), hi = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
  float pm = smoothstep(.25, .45, lo) * (1.0 - smoothstep(.05, .12, (hi - lo) / max(hi, .01) * .5));
  vec3 tint = mix(uP, uJ, smoothstep(.06, .12, vH));
  diffuseColor.rgb = mix(diffuseColor.rgb, tint * (.3 + .8 * lo), pm); }`);
    };
    m.customProgramCacheKey = () => 'riderPose';
    return m;
  }
  const HIP = new T.Vector3(0, 1.43, .27), NECK = { sit: new T.Vector3(0, .503, -.193), stand: new T.Vector3(0, .446, -.269) };
  // v105.3 · seduto ↔ in piedi in modo continuo: la posa in piedi è un morph della posa seduta (stesso modello), niente più scatti
  const riderPivot = new T.Group(); riderPivot.position.copy(HIP); upper.add(riderPivot);
  gltf.load('img/models/rider_poses.glb?t=1', g => {
    const sit = g.scene.getObjectByName('rider_sit'), stand = g.scene.getObjectByName('rider_stand');
    riderBaseMat = sit.material; const m = riderMat(riderJerseyTint, riderPantsTint);
    const bake = o => { const gg = o.geometry.clone(); gg.applyMatrix4(new T.Matrix4().compose(new T.Vector3(), o.quaternion, o.scale)); return gg; };
    const gs = bake(sit), gt = bake(stand);
    let mesh;
    if (gs.attributes.position.count === gt.attributes.position.count) {
      gs.morphAttributes.position = [gt.attributes.position]; gs.morphAttributes.normal = [gt.attributes.normal]; gs.morphTargetsRelative = false;
      mesh = new T.Mesh(gs, m);
    } else mesh = new T.Mesh(gs, m);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.keep = true; riderPivot.add(mesh);
    riderGlb = { sit: mesh, stand: mesh, mesh, morph: !!gs.morphAttributes.position }; customKey = '';
  });
  // v105 · casco vero (generato con Higgsfield): calotta, frontino e maschera; la calotta prende il colore del casco della livrea
  const helmTint = { value: new T.Color('#ffffff') };
  let helmGlb = null;
  gltf.load('img/models/helmet.glb?t=1', g => {
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld); geo.rotateY(-Math.PI / 2);   // nel modello il viso guarda verso -x
    const old = []; helmGroup.traverse(o => { if (o.isMesh) old.push(o); });
    const tb = new T.Box3(); for (const o of old) { o.geometry.computeBoundingBox(); tb.union(o.geometry.boundingBox); }
    geo.computeBoundingBox(); const hb = geo.boundingBox, ts = tb.getSize(new T.Vector3()), hs = hb.getSize(new T.Vector3());
    const k = ts.x / hs.x * 1.05, hc = hb.getCenter(new T.Vector3()), tc = tb.getCenter(new T.Vector3());
    geo.translate(-hc.x, -hc.y, -hc.z); geo.scale(k, k, k); geo.translate(tc.x, tc.y, tc.z - .01);
    const m = src.material.clone(); tintable(m, helmTint);
    const mesh = new T.Mesh(geo, m); mesh.castShadow = true; mesh.userData.helmGlb = true; mesh.userData.keep = true;
    for (const o of old) o.visible = false;
    helmGroup.add(mesh); helmGlb = mesh; customKey = '';
  }, undefined, e => console.warn('helmet glb', e));
  const _neck = new T.Vector3();
  const _n2 = new T.Vector3();
  function syncRiderModel(standing, leanX = 0, leanZ = 0) {
    if (!riderGlb) return;
    const hideTree = o => { for (const c of o.children) { if (c === head || c === riderPivot || c.name === 'fx') continue; if (c.isMesh) c.visible = false; hideTree(c); } };
    hideTree(rider);
    const w = Math.max(0, Math.min(1, (standing - .1) / .8)), k = w * w * (3 - 2 * w);
    if (riderGlb.morph) riderGlb.mesh.morphTargetInfluences[0] = k;
    // il busto segue la guida: avanti col gas, indietro in impennata, di lato in piega (piccoli angoli attorno al bacino)
    riderPivot.rotation.set(leanX, 0, leanZ);
    // casco sul collo del modello
    rider.updateMatrixWorld(true); _neck.copy(NECK.sit).lerp(_n2.copy(NECK.stand), k).applyEuler(riderPivot.rotation).add(HIP); upper.localToWorld(_neck); body.worldToLocal(_neck);
    head.position.set(_neck.x, _neck.y + .11, _neck.z + .01); head.scale.setScalar(.88);
  }

  for (let i = 0; i < 14; i++) { const z = .13 + i * .051; box(.028, .022, .047, alloy, chassis, -.18, .49, z); }
  const sprocket = mesh(new T.TorusGeometry(.18, .028, 8, 28), alloy, rearWheel); sprocket.rotation.y = Math.PI / 2; sprocket.position.x = -.13;
  for (const side of [-1, 1]) { const stripe = box(.028, .012, .4, accent, chassis, side * .07, 1.285, .8); stripe.rotation.x = .04; box(.052, .13, .055, spring, front, ...F(side * .145, .57, -.85)); }

  // Nome e numero sulla schiena della maglia.
  const textCanvas = document.createElement('canvas'); textCanvas.width = 256; textCanvas.height = 128;
  const textCtx = textCanvas.getContext('2d');
  const decalTexture = new T.CanvasTexture(textCanvas); decalTexture.colorSpace = T.SRGBColorSpace;
  const decal = mesh(new T.PlaneGeometry(.37, .185), new T.MeshStandardMaterial({ map: decalTexture, roughness: 1 }), body);
  decal.position.set(...B(0, 1.80, .318)); decal.rotation.x = .2; decal.userData.keep = true; decal.name = 'decal';
  // v44 · pezzi opzionali: paramani, faro, espansione del 2 tempi, doppio ammortizzatore vintage, grafiche
  for (const side of [-1, 1]) { const hg = box(.06, .13, .24, guardMat, front, ...F(side * .52, 1.5, -.66)); hg.rotation.y = side * .35; hg.rotation.z = side * -.2; }
  { const hl = mesh(new T.CylinderGeometry(.062, .068, .05, 28), lampMat, front); hl.rotation.x = Math.PI / 2 + .3; hl.scale.set(1.3, 1, 1); hl.position.set(...F(0, 1.30, -.725)); }   // v77 · faro ovale
  // v71 · T7 BO-anal: cupolino da rally con doppio faro e parabrezza alto (solo su quella moto)
  const rallyLamp = lampMat.clone(), rallyMat = pmat('#f2f4f8', .3), screenMat = new T.MeshPhysicalMaterial({ color: '#3a4a5a', roughness: .05, metalness: .1, transparent: true, opacity: .45, clearcoat: 1 });
  { const fa = frontShape(s => { s.moveTo(-.2, -.2); s.lineTo(.2, -.2); s.lineTo(.23, .12); s.quadraticCurveTo(0, .24, -.23, .12); s.lineTo(-.2, -.2); }, .05, rallyMat, front, .02); fa.position.set(...F(0, 1.42, -.735)); fa.rotation.x = .3;
    const sc = frontShape(s => { s.moveTo(-.17, 0); s.lineTo(.17, 0); s.lineTo(.13, .34); s.quadraticCurveTo(0, .38, -.13, .34); s.lineTo(-.17, 0); }, .012, screenMat, front, .004); sc.position.set(...F(0, 1.6, -.69)); sc.rotation.x = .42;
    for (const sd of [-1, 1]) box(.09, .07, .03, rallyLamp, front, ...F(sd * .075, 1.36, -.77));
    for (const sd of [-1, 1]) { const w = sideShape(s => { s.moveTo(-.74, 1.05); s.quadraticCurveTo(-.62, 1.34, -.4, 1.36); s.lineTo(-.2, 1.3); s.lineTo(-.3, 1.08); s.quadraticCurveTo(-.5, .98, -.74, 1.05); }, .03, rallyMat, chassis, sd * .27, .014); } }
  // v84 · faro vero: luce a cono che illumina la strada davanti di notte
  const headlight = new T.SpotLight('#fff3d6', 0, 38, .5, .55, 1.4); headlight.position.set(...F(0, 1.32, -.78)); front.add(headlight);
  const headTarget = new T.Object3D(); headTarget.position.set(...F(0, -.6, -14)); front.add(headTarget); headlight.target = headTarget; headlight.visible = false; headlight.name = 'fx';
  // v97 · frontale sul casco (Notturna con le frontali): segue lo sguardo, cioè lo sterzo
  const headLamp = new T.SpotLight('#fff4dc', 0, 48, .34, .55, 1.25); headLamp.position.set(0, .09, -.17); head.add(headLamp);
  const headLampT = new T.Object3D(); headLampT.position.set(0, -2.1, -14); head.add(headLampT); headLamp.target = headLampT; headLamp.visible = false; headLamp.name = 'fx';
  const headLampGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#fff4dc', transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }));
  headLampGlow.scale.set(.32, .22, 1); headLampGlow.position.set(0, .09, -.19); headLampGlow.visible = false; headLampGlow.name = 'fx'; head.add(headLampGlow);
  let lampOpt = false;
  const lampGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#fff2c0', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false }));
  lampGlow.scale.set(.9, .6, 1); lampGlow.position.set(...F(0, 1.30, -.78)); lampGlow.userData.keep = true; lampGlow.name = 'fxlamp'; front.add(lampGlow);
  const chamberMat = new T.MeshStandardMaterial({ color: '#a3b7bb', roughness: .3, metalness: .7 });
  { const curve = new T.CatmullRomCurve3([new T.Vector3(.1, .86, -.42), new T.Vector3(.16, .58, -.36), new T.Vector3(.22, .56, -.05), new T.Vector3(.27, .7, .25), new T.Vector3(.29, .92, .42)]);
    const tube = mesh(new T.TubeGeometry(curve, 24, .07, 8), chamberMat, chassis); tube.castShadow = true; }
  for (const side of [-1, 1]) { rod([side * .17, .62, .8], [side * .17, 1.16, .6], .045, vintageMat, chassis); for (let i = 0; i < 5; i++) { const c = mesh(new T.TorusGeometry(.06, .012, 4, 10), vintageMat, chassis); c.position.set(side * .17, .72 + i * .08, .76 - i * .03); c.rotation.x = Math.PI / 2 - .35; } }
  const decalCanvas = document.createElement('canvas'); decalCanvas.width = 256; decalCanvas.height = 128;
  const sideDecalTex = new T.CanvasTexture(decalCanvas); sideDecalTex.colorSpace = T.SRGBColorSpace;
  const sideDecalMat = new T.MeshStandardMaterial({ map: sideDecalTex, transparent: true, roughness: .5 });
  for (const side of [-1, 1]) { const pl = mesh(new T.PlaneGeometry(.38, .26), sideDecalMat, chassis); pl.position.set(side * .262, 1.1, -.38); pl.rotation.y = side * Math.PI / 2; pl.castShadow = false; pl.userData.keep = true; pl.name = 'sidedecal'; }
  // v71 · riflessi veri su vernice e metallo: una piccola "stanza luminosa" (cielo, terra, pannelli di luce) trasformata in mappa d'ambiente
  const envTex = (() => {
    try {
      const es = new T.Scene();
      const g = new T.SphereGeometry(10, 32, 16), cols = [];
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; const c = y > 0 ? new T.Color('#bcd6f0').lerp(new T.Color('#5b8fd0'), y) : new T.Color('#6b5a44').lerp(new T.Color('#2a241c'), -y); cols.push(c.r, c.g, c.b); }
      g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      es.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
      for (const [x, y, z, w, h, k] of [[0, 8, 0, 9, 9, 2.4], [7, 3, 4, 3, 5, 1.6], [-7, 2.5, -3, 4, 3, 1.1]]) { const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k * .96), side: T.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); es.add(p); }
      const pm = new T.PMREMGenerator(renderer); const t = pm.fromScene(es, .02).texture; pm.dispose(); return t;
    } catch (e) { return null; }
  })();
  if (envTex) for (const [m, k] of [[plastic, .9], [accent, .9], [helmetMat, .9], [sidePanel, .9], [alloy, 1.2], [rimMat, 1.2], [pipeMat, 1.3], [gold, 1.1], [frameMat, .8], [engMat, .7], [forkMat, .9], [chamberMat, 1.2], [vintageMat, 1.2], [hubMat, .8], [studMat, 1], [seatMat, .35], [black, .4], [spring, .7], [lensMat, 1.2], [guardMat, .5], [rallyMat, .9], [screenMat, 1.2]]) { m.envMap = envTex; m.envMapIntensity = k; m.needsUpdate = true; }
  for (const g of [...wheels, chassis, front, rider, upper, body, head]) mergeGroup(g);
  let electricNow = false;
  const meshesWith = m => { const out = []; bike.traverse(o => { if (o.isMesh && o.material === m) out.push(o); }); return out; };
  let customKey = '';
  function paintSideDecal(kind, a, b) {
    const x = decalCanvas.getContext('2d'); x.clearRect(0, 0, 256, 128);
    if (kind === 'stripes') { x.fillStyle = a; x.fillRect(0, 34, 256, 22); x.fillStyle = b; x.fillRect(0, 62, 256, 10); x.fillStyle = a; x.fillRect(0, 78, 256, 6); }
    else if (kind === 'flames') { x.fillStyle = '#ff6a13'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, 30 + i * 12); x.quadraticCurveTo(120 + i * 18, 10 + i * 14, 250 - i * 22, 40 + i * 10); x.quadraticCurveTo(140, 70 + i * 6, 0, 60 + i * 12); x.fill(); } x.fillStyle = '#ffd400'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, 50 + i * 12); x.quadraticCurveTo(100 + i * 12, 40 + i * 12, 180 - i * 20, 60 + i * 8); x.quadraticCurveTo(100, 80, 0, 74 + i * 10); x.fill(); } }
    else if (kind === 'boanal') { const gr = x.createLinearGradient(0, 20, 0, 110); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.5, '#f2c230'); gr.addColorStop(1, '#a8770c'); x.fillStyle = '#111'; x.fillRect(0, 22, 256, 84); x.fillStyle = gr; x.font = 'italic 900 52px Arial'; x.textAlign = 'center'; x.fillText('BO-anal', 128, 72); x.font = '900 18px Arial'; x.fillText('SPECIAL PARTS', 128, 98); }
    else if (kind === 'factory') { x.fillStyle = '#151515'; x.fillRect(0, 26, 256, 76); x.fillStyle = '#f2c230'; x.fillRect(0, 26, 256, 6); x.fillRect(0, 96, 256, 6); x.font = 'italic 900 40px Arial'; x.textAlign = 'center'; x.fillText('EDT FACTORY', 128, 80); }
    else if (kind === 'edt') { x.fillStyle = b; x.font = 'italic 900 78px Arial'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#111'; x.strokeText('EDT', 128, 96); x.fillText('EDT', 128, 96); }
    sideDecalTex.needsUpdate = true;
  }
  function applyCustom(look = {}, parts = {}, livery = {}) {
    const key = JSON.stringify([look, parts.rims?.id, parts.pipe?.id, parts.guards?.id, parts.seat?.id, parts.decal?.id, parts.light?.id, parts.studs?.id, parts.cam?.id, livery.id]);
    if (key === customKey) return; customKey = key;
    rimMat.color.set(parts.rims?.color || '#a3b7bb'); rimMat.metalness = parts.rims?.id === 'black' ? .3 : .7;
    pipeMat.color.set(parts.pipe?.color || '#a3b7bb'); chamberMat.color.copy(pipeMat.color); pipeMat.metalness = chamberMat.metalness = parts.pipe?.id === 'carbon' ? .2 : .75; pipeMat.roughness = chamberMat.roughness = parts.pipe?.id === 'chrome' ? .08 : .3;
    seatMat.color.set(parts.seat?.color || '#243138');
    if (parts.guards?.color) guardMat.color.set(parts.guards.color);
    for (const m of meshesWith(guardMat)) m.visible = !!parts.guards?.color;
    const lamp = parts.light?.id === 'led' || parts.light?.id === 'boanal' || parts.light?.id === 'factory' || !!look.vintage || !!look.boanal || !!look.rally;
    for (const m of meshesWith(lampMat)) m.visible = lamp;
    lampGlow.visible = lamp; lampOpt = lamp;
    for (const m of meshesWith(chamberMat)) m.visible = !!look.twoStroke && !look.electric;
    electricNow = !!look.electric; battery.visible = electricNow;
    for (const m of exhaustParts) if (m) m.visible = !electricNow;
    for (const m of meshesWith(engMat)) m.visible = !electricNow;
    for (const m of meshesWith(vintageMat)) m.visible = !!look.vintage;
    for (const m of meshesWith(seatMat)) m.visible = !look.trial;
    const st = parts.studs?.id || 'none';
    for (const sset of studSets) sset.visible = st !== 'none';
    if (st !== 'none') { studMat.color.set(parts.studs.color || '#c9d2d6'); studMat.emissive.set(st === 'icefury' ? '#1a6f9a' : st === 'boanal' ? '#5a4200' : st === 'factory' ? '#8a6400' : '#000000'); studMat.metalness = st === 'puntine' ? .3 : .85; }
    const dk = look.boanal && (parts.decal?.id || 'none') === 'none' ? 'boanal' : parts.decal?.id || 'none';
    bike.traverse(o => { if (o.name === 'sidedecal') o.visible = dk !== 'none'; });
    if (dk !== 'none') paintSideDecal(dk, livery.accent || '#fcd326', livery.helmet || '#ffffff');
    // v71 · con la livrea "EDT Classica" ogni moto ha i colori di fabbrica delle foto del garage
    const paint = look.paint && (!livery.id || livery.id === 'edt') ? look.paint : null;
    if (paint) {
      const pt = paint.pattern ? patternTex(paint.pattern, paint.plastic, paint.ink) : null; if (pt) pt.repeat.set(1.25, 1.25);   // grafiche di fabbrica più grandi e leggibili
      setMap(plastic, pt, paint.plastic);
      accent.color.set(paint.accent); sidePanel.color.set(paint.side); frameMat.color.set(paint.frame);
      if (!parts.seat?.color) seatMat.color.set(paint.seat || '#243138');
      if (paint.rims && (!parts.rims || parts.rims.id === 'silver')) { rimMat.color.set(paint.rims); rimMat.metalness = .55; }
    } else { sidePanel.color.set('#eee8d8'); frameMat.color.set('#22272b'); }
    for (const m of meshesWith(rallyMat)) m.visible = !!(look.boanal || look.rally);
    for (const m of meshesWith(screenMat)) m.visible = !!(look.boanal || look.rally);
    for (const m of meshesWith(rallyLamp)) m.visible = !!(look.boanal || look.rally);
    for (const [k, g] of Object.entries(camModels)) g.visible = (parts.cam?.id || 'none') === k;   // v97 · action cam sul casco
    bike.scale.setScalar(look.scale || 1);
  }

  // Orecchie da coniglio sul casco (troppi errori o acqua bevuta).
  const ears = new T.Group(); ears.name = 'fx'; ears.position.set(0, .16, .06); head.add(ears); ears.visible = false;
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
  const dyn = { yaw: 0, pitch: 0, pitchV: 0, cf: 0, vf: 0, cr: 0, vr: 0, stand: 0, steer: 0, crashSpin: 0, lastJump: 0, wheelie: 0, fwd: 20, latA: 0, leanV: 0, leanR: 0 };
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
  // v52 · fantasie delle livree (mucca, leopardo, mimetica, fiori, bolle, scacchi, righe, schizzi) disegnate su canvas
  const patternCache = new Map();
  function patternTex(kind, base, ink) {
    const key = kind + base + ink; if (patternCache.has(key)) return patternCache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = base; x.fillRect(0, 0, 256, 256); x.fillStyle = ink; x.strokeStyle = ink;
    const blob = (cx, cy, rad, n = 9) => { x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = rad * (.65 + r() * .5); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); };
    if (kind === 'mucca') for (let i = 0; i < 7; i++) blob(r() * 256, r() * 256, 26 + r() * 30, 11);
    else if (kind === 'bolle') { x.globalAlpha = .55; for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(r() * 256, r() * 256, 2 + r() * 9, 0, Math.PI * 2); x.lineWidth = 2; x.stroke(); } x.globalAlpha = .9; x.fillRect(0, 0, 256, 34); }
    else if (kind === 'righe') { x.lineWidth = 22; for (let i = -256; i < 512; i += 56) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); } }
    else if (kind === 'leopardo') for (let i = 0; i < 34; i++) { const cx = r() * 256, cy = r() * 256, rad = 9 + r() * 8; x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, rad, r() * 2, r() * 2 + 4.6); x.stroke(); x.globalAlpha = .35; blob(cx, cy, rad * .6, 7); x.globalAlpha = 1; }
    else if (kind === 'camo') { const tones = [ink, '#7d8a52', '#3d2f1e']; for (let i = 0; i < 40; i++) { x.fillStyle = tones[i % 3]; blob(r() * 256, r() * 256, 14 + r() * 26, 10); } }
    else if (kind === 'fiori') for (let i = 0; i < 26; i++) { const cx = r() * 256, cy = r() * 256, rad = 6 + r() * 5; x.fillStyle = ink; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.beginPath(); x.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, rad * .6, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#f2c230'; x.beginPath(); x.arc(cx, cy, rad * .45, 0, Math.PI * 2); x.fill(); }
    else if (kind === 'schizzi') for (let i = 0; i < 22; i++) { const cx = r() * 256, cy = r() * 256; blob(cx, cy, 6 + r() * 16, 13); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + (r() - .5) * 50, cy + (r() - .5) * 50, 1.5 + r() * 3, 0, Math.PI * 2); x.fill(); } }
    else if (kind === 'scacchi') for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) if ((i + k) % 2) x.fillRect(i * 32, k * 32, 32, 32);
    // v71 · grafiche di fabbrica delle moto (come nelle foto del garage)
    else if (kind === 'fiamme') { for (let i = 0; i < 7; i++) { const y0 = 20 + i * 34; x.beginPath(); x.moveTo(0, y0); for (let k = 0; k <= 8; k++) { const xx = k * 32, a = Math.sin(k * 1.3 + i) * 10; x.quadraticCurveTo(xx + 16, y0 - 22 + a, xx + 32, y0 + a * .4); } x.lineTo(256, y0 + 18); x.lineTo(0, y0 + 16); x.fill(); } }
    else if (kind === 'mx') { for (let i = 0; i < 6; i++) { const y = r() * 256, w = 14 + r() * 30; x.beginPath(); x.moveTo(-20, y); x.lineTo(150 + r() * 120, y - 40 - r() * 30); x.lineTo(170 + r() * 120, y - 40 - r() * 30 + w); x.lineTo(-20, y + w * 1.4); x.fill(); } x.globalAlpha = .35; for (let i = 0; i < 16; i++) { x.beginPath(); const px = r() * 256, py = r() * 256; x.moveTo(px, py); x.lineTo(px + 40, py - 18); x.lineTo(px + 46, py - 10); x.lineTo(px + 6, py + 8); x.fill(); } x.globalAlpha = 1; }
    else if (kind === 'tigre') for (let i = 0; i < 14; i++) { const px = i * 20 + r() * 8; x.beginPath(); x.moveTo(px, 0); x.quadraticCurveTo(px + 22, 70 + r() * 40, px + 6, 140); x.quadraticCurveTo(px + 30, 200, px + 10, 256); x.lineTo(px + 18, 256); x.quadraticCurveTo(px + 38, 200, px + 14, 140); x.quadraticCurveTo(px + 30, 70, px + 9, 0); x.fill(); }
    else if (kind === 'righina') { x.fillRect(0, 96, 256, 40); x.fillStyle = '#ffffff'; x.fillRect(0, 140, 256, 8); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 4;
    patternCache.set(key, t); return t;
  }
  function setMap(m, tex, color) { m.userData.base = color; const had = !!m.map; m.map = tex || null; m.color.set(tex ? '#ffffff' : color); if (had !== !!tex) m.needsUpdate = true; }
  function applyLivery(l) {
    if (!l || l.id === liveryKey) return; liveryKey = l.id;
    setMap(plastic, l.pattern ? patternTex(l.pattern, l.plastic, l.ink || '#111') : null, l.plastic);
    setMap(jerseyMat, l.pattern && l.jerseyPattern ? patternTex(l.pattern, l.jersey, l.ink || '#111') : null, l.jersey);
    accent.color.set(l.accent); pantsMat.color.set(l.pants); helmetMat.color.set(l.helmet);
    decalKey = '';
  }
  // v105 · moto vere: modelli generati (Higgsfield) e sistemati in Blender, una per tipo di moto.
  // Le ruote restano quelle procedurali (girano e sterzano); il resto della moto procedurale si nasconde.
  // Le plastiche del modello prendono il colore della livrea.
  const BIKE_GLB = { edt250: 'enduro', gp125: 'enduro', ts300: 'enduro', mulo450: 'enduro', factory: 'enduro', trial: 'trial', vintage: 'vintage', boanal: 'adventure', electric: 'electric', dakar: 'dakar' };
  // misure prese dai modelli: manubrio (mezza larghezza, altezza, z) e sella, per mettere mani e sedere al posto giusto
  const BIKE_FIT = { enduro: [.44, 1.42, -.2, 1.106], trial: [.5, 1.45, -.27, .99], vintage: [.47, 1.39, -.26, .921], adventure: [.5, 1.5, -.25, 1.011], electric: [.46, 1.43, -.29, 1.133], dakar: [.4, 1.31, -.24, 1.063] };   // [manubrio x, y, z, sella sotto il sedere]
  const glbCache = {}, glbWait = {}, bikeTint = { value: new T.Color('#ffffff') };
  let procBike = null, glbNow = null, glbWant = null;
  function procBikeParts() {
    if (procBike) return procBike;
    const skip = new Set([rider, rearWheel, frontWheel]); procBike = [];
    const walk = o => { for (const c of o.children) { if (skip.has(c) || c.name === 'fx' || c.name === 'sidedecal' || c.userData.glb) continue; if (c.isMesh) procBike.push(c); walk(c); } };
    walk(pitch); return procBike;
  }
  // plastiche: le parti bianche e non metalliche della texture prendono il colore della livrea
  function tintable(m, u = bikeTint) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uTint = u;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTint;')
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
{ float lo = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)), hi = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
  float pm = smoothstep(.3, .5, lo) * (1.0 - smoothstep(.05, .12, (hi - lo) / max(hi, .01) * .5));
  diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (.35 + .75 * lo), pm); }`);
    };
    m.customProgramCacheKey = () => 'bikeTint';
    m.needsUpdate = true;
  }
  function loadBikeGlb(key, cb) {
    if (glbCache[key] === 'loading') { glbWait[key].push(cb); return; }
    if (glbCache[key]) { cb(glbCache[key]); return; }
    glbCache[key] = 'loading'; glbWait[key] = [cb];
    gltf.load(`img/models/bike_${key}.glb?t=1`, g => {
      const get = n => g.scene.getObjectByName(n);
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (!o.material.userData.tint) { o.material.userData.tint = true; tintable(o.material); } } });
      const wrM = get('wheel_r'), wfM = get('wheel_f'), body = get('bike_body');
      const rAxle = wrM.position.clone(), fAxle = wfM.position.clone();
      wrM.position.set(0, 0, 0); wfM.position.set(0, 0, 0); wrM.removeFromParent(); wfM.removeFromParent(); body.removeFromParent();
      glbCache[key] = { body, wr: wrM, wf: wfM, rAxle, fAxle }; for (const f of glbWait[key]) f(glbCache[key]);
    }, undefined, e => { console.warn('bike glb', e); glbCache[key] = null; });
  }
  function setBikeModel(id) {
    const key = BIKE_GLB[id] || null; glbWant = key;
    if (key === (glbNow && glbNow.key)) return;
    if (glbNow) { for (const g of glbNow.parts) g.removeFromParent(); glbNow = null; for (const m of procBikeParts()) m.visible = true; rearWheel.visible = frontWheel.visible = true; customKey = ''; }
    if (!key) return;
    const use = g => {
      if (glbWant !== key) return;
      const body = g.body.clone(true), wr = new T.Group(), wf = new T.Group();
      wr.position.set(0, g.rAxle.y, g.rAxle.z); wr.add(g.wr.clone(true)); pitch.add(wr);
      wf.position.set(0, g.fAxle.y, g.fAxle.z - STEER_Z); wf.add(g.wf.clone(true)); front.add(wf);
      body.userData.glb = wr.userData.glb = wf.userData.glb = true; procBikeParts(); chassis.add(body);
      glbNow = { key, parts: [body, wr, wf], wr, wf, r: g.rAxle.y };
      customKey = '';
    };
    loadBikeGlb(key, use);
  }
  const riderY0 = rider.position.y;
  loadBikeGlb('enduro', () => {});   // i compagni usano la moto vera: la carichiamo subito
  function syncBikeModel() {
    helmTint.value.set(helmetMat.map && helmetMat.userData.base ? helmetMat.userData.base : helmetMat.color);
    if (riderGlb) { if (jerseyMat.map && jerseyMat.userData.base) riderJerseyTint.value.set(jerseyMat.userData.base); else riderJerseyTint.value.copy(jerseyMat.color); riderPantsTint.value.copy(pantsMat.color); }
    const fit = glbNow && BIKE_FIT[glbNow.key];
    rider.position.y = riderY0 + (fit ? (riderGlb ? fit[3] + .118 - 1.43 : fit[3] - 1.24) : 0); rider.position.z = 0;
    for (const j of joints) { if (!j.grip0) j.grip0 = j.grip.position.clone(); if (fit) j.grip.position.set(j.side * fit[0], fit[1], fit[2] - STEER_Z); else j.grip.position.copy(j.grip0); }
    if (!glbNow) return;
    for (const m of procBikeParts()) m.visible = false;
    rearWheel.visible = frontWheel.visible = false;
    if (plastic.map && plastic.userData.base) bikeTint.value.set(plastic.userData.base); else bikeTint.value.copy(plastic.color);
  }

  // v52 · anteprima della moto nel garage: una piccola scena a parte che gira su sé stessa con livrea e accessori scelti
  function makePreview(cv) {
    if (!cv) return null;
    let r2;
    try { r2 = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { return null; }
    r2.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r2.outputColorSpace = T.SRGBColorSpace; r2.toneMapping = T.ACESFilmicToneMapping; r2.toneMappingExposure = 1.15;
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight('#ffffff', '#4a4038', 2.3));
    const dl = new T.DirectionalLight('#fff4e0', 3); dl.position.set(3, 6, 4); sc.add(dl);
    const rim = new T.DirectionalLight('#9fd0ff', 1.4); rim.position.set(-4, 3, -3); sc.add(rim);
    const cam = new T.PerspectiveCamera(30, 1, .1, 60);
    const holder = new T.Group(); sc.add(holder);
    const floor = new T.Mesh(new T.CircleGeometry(1.9, 48), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .35, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; sc.add(floor);
    let key = '', model = null, ang = .7, vis = true, raf = 0, last = 0;
    const hideMats = new Set([flameMat, flameCore.material, magnetAura.material, auraMaterial]);
    function rebuild() {
      if (model) holder.remove(model);
      model = bike.clone(true); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.copy(bike.scale); model.visible = true;
      model.traverse(o => { if (o.name === 'fx' || (o.material && hideMats.has(o.material))) o.visible = false; });
      holder.add(model);
    }
    function tick(t) {
      raf = 0; if (!vis || document.hidden) return;
      if (t - last > 30) {
        last = t;
        const k = customKey + '|' + liveryKey + '|' + decalKey; if (k !== key) { key = k; rebuild(); }
        const w = cv.clientWidth, h = cv.clientHeight;
        if (w && h && (cv.width !== Math.round(w * r2.getPixelRatio()) || cv.height !== Math.round(h * r2.getPixelRatio()))) { r2.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
        const d = cam.aspect < 1.2 ? 6.6 : 5.6; cam.position.set(Math.sin(.6) * d, 2.3, Math.cos(.6) * d); cam.lookAt(0, 1.05, 0);
        ang += .018; holder.rotation.y = ang;
        r2.render(sc, cam);
      }
      raf = requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(tick); }).observe(cv);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf) raf = requestAnimationFrame(tick); });
    raf = requestAnimationFrame(tick);
    return { refresh() { key = ''; }, spin(v) { ang += v; } };
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
  const ranchLogoMat = new T.MeshBasicMaterial({ transparent: true, alphaTest: .05, side: T.DoubleSide, depthWrite: false });   // v102 · logo "Mud, beer & glory"
  texLoader.load('img/gusta-ranch-logo.webp?t=1', t => { t.colorSpace = T.SRGBColorSpace; ranchLogoMat.map = t; ranchLogoMat.needsUpdate = true; });
  const henWhite = mat('#f3efe6', .85), henRed = mat('#a5512a', .8), henComb = mat('#d4241c', .6), henBeak = mat('#e8b02a', .6);   // v102
  const crateWood = mat('#b98a52', .9), grapeMat = mat('#4a2a5c', .5), grapeGreen = mat('#a7b54a', .5), cowWhite = mat('#f1ede4', .8), cowBlack = mat('#22201e', .8), cowPink = mat('#e7a99c', .7), boarFur = mat('#3e2f24', .95), tuskMat = mat('#efe6cf', .5), deerFur = mat('#9a6237', .85), deerLight = mat('#e2c9a3', .85), ironMat = mat('#2c2f31', .45, .6), heliRed = mat('#d0242a', .45, .2), heliWhite = mat('#f2f2f2', .5), heliGlass = mat('#1d2b38', .15, .3), eyeShine = new T.MeshBasicMaterial({ color: '#e8ff9a' }), dolmenStone = mat('#77756e', .98), goldMat = new T.MeshStandardMaterial({ color: '#ffc21a', roughness: .22, metalness: .9, emissive: '#8a5a00', emissiveIntensity: .9 }), goldFoam = mat('#fffdf2', .6), lichen = mat('#5f6b2f', .95);   // v103 · occhi che brillano nel faro
  const pigPink = mat('#e9a49a', .7), pigNose = mat('#d17d78', .6), pigMudDark = mat('#4a3423', .5), cartWood = mat('#7b5434', .9);
  const hayRollSide = mat('#d9b35a', .95), hayRollEnd = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#d2ab52'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#a07b30'; x.lineWidth = 3; x.beginPath(); for (let a = 0; a < 40; a += .1) { const r = a * 1.55; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.stroke(); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({ map: t, roughness: .95 }); })();
  const pigMudMat = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    const band = (w, fill) => { x.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64; x.lineTo(u * 512, (.5 - w - .04 * Math.sin(u * 19) - .03 * Math.sin(u * 47)) * 256); } for (let i = 64; i >= 0; i--) { const u = i / 64; x.lineTo(u * 512, (.5 + w + .04 * Math.sin(u * 23 + 1) + .03 * Math.sin(u * 41)) * 256); } x.closePath(); x.fillStyle = fill; x.fill(); };
    for (let k = 8; k >= 0; k--) band(.3 + k * .018, `rgba(60,40,24,${k ? .12 : .9})`);
    band(.2, 'rgba(44,30,18,.9)');
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(${90 + Math.random() * 40},${70 + Math.random() * 30},${45 + Math.random() * 20},${.3 + Math.random() * .4})`; x.beginPath(); x.ellipse(Math.random() * 512, 70 + Math.random() * 116, 2 + Math.random() * 10, 1 + Math.random() * 4, Math.random() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(190,200,190,.18)'; x.beginPath(); x.ellipse(Math.random() * 512, 100 + Math.random() * 56, 8 + Math.random() * 20, 2 + Math.random() * 4, 0, 0, 7); x.fill(); }   // riflessi nelle pozze
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    return new T.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: .35, metalness: .05, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); })();
  const hayObs = mat('#dcb553', .95), twine = mat('#8f6a2c', .9), goatWhite = mat('#ece6da', .85), goatDark = mat('#3b332c', .8), hornMat = mat('#9c8a6a', .6);
  const tractorGreen = mat('#2f7d32', .45), tractorYellow = mat('#f2c230', .4), mulchOrange = mat('#e86a1c', .45), cabGlass = new T.MeshStandardMaterial({ color: '#9fc4d8', roughness: .1, metalness: .2, transparent: true, opacity: .45 }), gustaShirt = mat('#3c6e2a', .8);   // v81 · trattore del Gusta
  // v82 · faccia del Gusta (testone tondo col bordo verde) sul trattore: la foto arriva dal gioco con setGustaFace
  const gustaFaceCanvas = document.createElement('canvas'); gustaFaceCanvas.width = gustaFaceCanvas.height = 256;
  const gustaFaceTex = new T.CanvasTexture(gustaFaceCanvas); gustaFaceTex.colorSpace = T.SRGBColorSpace;
  function setGustaFace(url) {
    if (!url) return; const img = new Image();
    img.onload = () => { const x = gustaFaceCanvas.getContext('2d'); x.clearRect(0, 0, 256, 256); x.save(); x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2); x.clip(); x.drawImage(img, 0, 0, 256, 256); x.restore(); x.lineWidth = 12; x.strokeStyle = '#6fbf3a'; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.stroke(); gustaFaceTex.needsUpdate = true; };
    img.src = url;
  }
  // Bottiglie al tornio: profilo (raggio, altezza).
  const lathe = (pts, seg = 18) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
  const WINE_BOTTLE = lathe([[0, 0], [.13, 0], [.135, .04], [.135, .5], [.11, .58], [.05, .66], [.045, .82], [.052, .84], [0, .85]]);
  const GRAPPA_BOTTLE = lathe([[0, 0], [.09, 0], [.095, .03], [.095, .62], [.07, .7], [.035, .76], [.035, .92], [0, .93]]);
  const WATER_BOTTLE = lathe([[0, 0], [.12, 0], [.13, .05], [.12, .12], [.13, .19], [.12, .26], [.13, .33], [.13, .42], [.09, .5], [.045, .55], [0, .56]]);
  const ringMat = new T.MeshBasicMaterial({ color: '#f5bc4a', transparent: true, opacity: .55, side: T.DoubleSide, depthWrite: false });
  const reflMat = new T.SpriteMaterial({ map: glowTex, color: '#ffb02e', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });   // v91
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
  // v70 · roccia fotografata (Poly Haven) su massi e pietroni
  photoTex('rockwall', 1, 1, true, ({ map, normalMap }) => {
    for (const m of [detailedStone, stone]) { m.map = map; m.normalMap = normalMap; m.normalScale?.set(1.2, 1.2); m.color.set(m === stone ? '#d8d6d0' : '#e8e8e4'); m.needsUpdate = true; }
  });
  const logCap = mat('#cda66c'), puddleRim = mat('#66503b', .9), puddleWater = mat('#5c949a', .08, .45), ripple = mat('#bdddd9', .22);
  const helmetShell = mat('#3ee28f', .3, .2), visorMat = mat('#1b2328', .2, .4), peakMat = mat('#ffffff', .4), magnetRed = mat('#e8263c', .35), magnetTip = mat('#dfe6ea', .25, .8);

  const rampDirt = mat('#7b5a38', .95), rampWood = mat('#b98a52', .8), rampLip = new T.MeshStandardMaterial({ color: '#ffd400', roughness: .6, emissive: '#3a2f00', emissiveIntensity: .25 });
  const obstacleMap = new Map(), pools = {};
  // v97 · acqua del guado con la corrente disegnata (la texture scorre di traverso alla pista)
  const fordTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#3f6e6c'; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 70; i++) { const y = Math.random() * 128, len = 30 + Math.random() * 90, a = .08 + Math.random() * .22; x.strokeStyle = `rgba(230,245,250,${a})`; x.lineWidth = 1 + Math.random() * 2.5; x.beginPath(); const x0 = Math.random() * 256; x.moveTo(x0, y); x.bezierCurveTo(x0 + len * .3, y - 3, x0 + len * .6, y + 3, x0 + len, y); x.stroke(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(20,50,60,${.15 + Math.random() * .2})`; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 128, 6 + Math.random() * 18, 2 + Math.random() * 4, 0, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = T.SRGBColorSpace; return t; })();
  const fordWater = new T.MeshStandardMaterial({ map: fordTex, color: '#d6ebe4', roughness: .05, metalness: .3, transparent: true, opacity: .8 }), fordFoam = mat('#eef6f7', .6);
  const fordFoamT = new T.MeshStandardMaterial({ color: '#f2f8f9', roughness: .5, transparent: true, opacity: .75, depthWrite: false });
  const fordBank = mat('#3f3226', .55), mossStone = mat('#6d7a55', .9), fordGravel = mat('#8b7f6a', .95);
  const fordDeep = new T.MeshStandardMaterial({ map: fordTex, color: '#7fa7a4', roughness: .04, metalness: .35, transparent: true, opacity: .8, depthWrite: false });   // v101 · canale più profondo al centro del guado
  for (const m of [fordWater, fordFoamT, fordBank, fordGravel, fordDeep]) { m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4; }   // sempre sopra il terreno, anche dove la mesh del suolo sale
  // v101 · guado naturale: un'unica "decalcomania" dipinta (fango bagnato sfumato, greto, acqua bassa ai bordi e più scura al centro) + velo d'acqua che scorre, mascherato sulla stessa forma
  const fordDecals = [];
  function fordDecal() {
    if (fordDecals.length >= 3) return fordDecals[Math.floor(Math.random() * fordDecals.length)];
    const W = 1024, H = 256, s = Math.random() * 100;
    const zc = x => .5 + .07 * Math.sin(x * 9.4 + s) + .03 * Math.sin(x * 23 + s * 2);
    const hw = x => .25 + .045 * Math.sin(x * 15 + s * 3) + .02 * Math.sin(x * 41 + s) + .09 * Math.exp(-Math.pow((x - .5) / .06, 2));
    const band = (c, w, fill) => { c.beginPath(); for (let i = 0; i <= 128; i++) { const x = i / 128; c.lineTo(x * W, (zc(x) - w(x)) * H); } for (let i = 128; i >= 0; i--) { const x = i / 128; c.lineTo(x * W, (zc(x) + w(x)) * H); } c.closePath(); c.fillStyle = fill; c.fill(); };
    const g = document.createElement('canvas'); g.width = W; g.height = H; const c = g.getContext('2d');
    for (let k = 10; k >= 1; k--) band(c, x => hw(x) + .022 * k, `rgba(52,40,28,${.1})`);   // fango bagnato che sfuma nel terreno
    for (let i = 0; i < 260; i++) { const x = Math.random(), side = Math.random() < .5 ? -1 : 1, z = zc(x) + side * (hw(x) + Math.random() * .1); c.fillStyle = `rgba(${150 + Math.random() * 50},${140 + Math.random() * 40},${120 + Math.random() * 30},${.5 + Math.random() * .4})`; c.beginPath(); c.ellipse(x * W, z * H, 1.5 + Math.random() * 4, 1 + Math.random() * 3, Math.random() * 3, 0, 7); c.fill(); }   // greto di sassolini
    for (let k = 0; k < 6; k++) band(c, x => hw(x) - .012 * k, `rgba(${70 - k * 6},${110 - k * 6},${105 - k * 4},${.35 + k * .1})`);   // acqua bassa → profonda
    for (let i = 0; i < 70; i++) { const x = Math.random(), z = zc(x) + (Math.random() - .5) * 1.6 * hw(x); c.fillStyle = `rgba(30,45,40,${.18 + Math.random() * .2})`; c.beginPath(); c.ellipse(x * W, z * H, 3 + Math.random() * 9, 2 + Math.random() * 5, Math.random() * 3, 0, 7); c.fill(); }   // sassi sul fondo
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mc = m.getContext('2d'); mc.fillStyle = '#000'; mc.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) band(mc, x => hw(x) - .014 * k, 'rgba(255,255,255,.2)');
    const tex = cv => { const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; };
    const d = { ground: tex(g), mask: new T.CanvasTexture(m) }; fordDecals.push(d); return d;
  }
  let fordGeoCache = null;
  function fordGeos() {
    if (fordGeoCache) return fordGeoCache;
    const edge = (x, sgn, k) => { const taper = 1 - .6 * Math.pow(Math.max(0, Math.abs(x) - .4) / .1, 2); return sgn * (3.4 + k + 1.3 * Math.exp(-Math.pow(x / .09, 2)) + .55 * Math.sin(x * 14 + sgn * 1.3) + .22 * Math.sin(x * 37 + 2 * sgn) + .08 * Math.sin(x * 91)) * taper + 2.2 * Math.sin(x * 7.5) + .8 * Math.sin(x * 17); };   // torrente che arriva dal prato, serpeggia e riparte   // largo in pista, si stringe ai lati e serpeggia
    const shape = k => { const sh = new T.Shape(), N = 60; sh.moveTo(-.5, edge(-.5, -1, k));
      for (let i = 1; i <= N; i++) { const x = -.5 + i / N; sh.lineTo(x, edge(x, -1, k)); }
      for (let i = N; i >= 0; i--) { const x = -.5 + i / N; sh.lineTo(x, edge(x, 1, k)); }
      const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); return g; };
    const foam = (() => { const parts = []; for (const sgn of [-1, 1]) { const sh = new T.Shape(), N = 60; sh.moveTo(-.5, edge(-.5, sgn, -.02));
      for (let i = 1; i <= N; i++) { const x = -.5 + i / N; sh.lineTo(x, edge(x, sgn, -.02)); }
      for (let i = N; i >= 0; i--) { const x = -.5 + i / N; sh.lineTo(x, edge(x, sgn, -.1 - .04 * Math.sin(x * 37))); }
      const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); parts.push(g); } return mergeGeometries(parts); })();
    const wake = (() => { const sh = new T.Shape(); sh.moveTo(-.1, 0); sh.quadraticCurveTo(.2, .18, 1, .05); sh.lineTo(1, -.05); sh.quadraticCurveTo(.2, -.18, -.1, 0); const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.scale(.25, 1, 1); return g; })();
    return (fordGeoCache = { water: shape(0), bank: shape(.75), gravel: shape(1.5), deep: shape(-2.1), foam, wake });
  }
  const ibexFur = mat('#8a6a48', .9), chamFur = mat('#4a3526', .9), marmotFur = mat('#9a7650', .95);
  const snowMat = mat('#f6f9fb', .7), carrotMat = mat('#f07a1c', .6), scarfMat = mat('#d0242a', .8);
  const gateWhite = mat('#f4f6f8', .5), gateBlue = new T.MeshStandardMaterial({ color: '#1e7fd8', roughness: .6, side: T.DoubleSide }), gateRing = new T.MeshBasicMaterial({ color: '#5fd4ff', transparent: true, opacity: .75, depthWrite: false });
  const gevOrange = mat('#ff6a10', .5), gevWhite = mat('#f4f4f0', .5), gevBlack = mat('#1d2226', .7), gevRed = mat('#c81f19', .5);
  // v57 · jeep delle Guardie Ecologiche Volontarie, con la guardia che sbraita dal finestrino col megafono
  let gevJeep = null;
  function makeJeep() {
    const J = new T.Group(), body = new T.Group(); J.add(body);
    const green = mat('#3f5b2c', .55, .1), dark = mat('#26341c', .7), glassM = new T.MeshStandardMaterial({ color: '#9fc4d0', roughness: .1, metalness: .3, transparent: true, opacity: .55 });
    const skin = mat('#e0a27e', .7), shirt = mat('#4b6a33', .8), beret = mat('#2f4a22', .8), mega = mat('#f1c21b', .4), chrome = mat('#c9d2d4', .25, .8);
    box(1.9, .75, 3.9, green, body, 0, .95, 0);                 // scocca
    box(1.86, .7, 1.9, green, body, 0, 1.6, .35);               // abitacolo
    box(1.7, .55, .06, glassM, body, 0, 1.68, -.62);            // parabrezza
    for (const sd of [-1, 1]) box(.05, .45, 1.4, glassM, body, sd * .94, 1.7, .4);
    box(1.95, .14, .3, dark, body, 0, .62, -2.0); box(1.95, .14, .3, dark, body, 0, .62, 2.0);   // paraurti
    for (const sd of [-1, 1]) { const l = mesh(new T.CircleGeometry(.13, 16), new T.MeshBasicMaterial({ color: '#fff6c8' }), body); l.position.set(sd * .62, 1.05, -1.96); l.rotation.y = Math.PI; }
    const grill = box(1.1, .45, .05, dark, body, 0, 1.0, -1.96);
    // logo GEV sulle portiere
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#f2c21b'; x.beginPath(); x.moveTo(10, 8); x.lineTo(118, 8); x.lineTo(118, 96); x.lineTo(64, 152); x.lineTo(10, 96); x.closePath(); x.fill();
    x.fillStyle = '#2f6a2a'; x.beginPath(); x.moveTo(22, 20); x.lineTo(106, 20); x.lineTo(106, 92); x.lineTo(64, 138); x.lineTo(22, 92); x.closePath(); x.fill();
    x.fillStyle = '#f2c21b'; x.beginPath(); x.moveTo(64, 30); x.lineTo(84, 74); x.lineTo(44, 74); x.fill();
    x.font = '900 30px Arial'; x.textAlign = 'center'; x.fillText('GEV', 64, 110);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    for (const sd of [-1, 1]) { const d = mesh(new T.PlaneGeometry(.5, .62), new T.MeshBasicMaterial({ map: tx, transparent: true }), body); d.position.set(sd * .96, 1.0, .3); d.rotation.y = sd * Math.PI / 2; d.castShadow = false; }
    // ruotone
    const wheels = [];
    for (const [wx, wz] of [[-.95, -1.3], [.95, -1.3], [-.95, 1.35], [.95, 1.35]]) {
      const w = new T.Group(); w.position.set(wx, .45, wz); body.add(w);
      const tr = mesh(new T.CylinderGeometry(.45, .45, .34, 18), rubber, w); tr.rotation.z = Math.PI / 2;
      const rm = mesh(new T.CylinderGeometry(.24, .24, .36, 12), chrome, w); rm.rotation.z = Math.PI / 2;
      wheels.push(w);
    }
    const spare = mesh(new T.CylinderGeometry(.42, .42, .28, 18), rubber, body); spare.rotation.x = Math.PI / 2; spare.position.set(0, 1.2, 2.1);
    // lampeggiante arancione sul tetto
    box(1.7, .06, 1.6, dark, body, 0, 1.97, .35);
    const beacon = mesh(new T.CylinderGeometry(.11, .13, .16, 12), new T.MeshBasicMaterial({ color: '#ff9a1a' }), body); beacon.position.set(0, 2.08, .1); beacon.castShadow = false;
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ff8a10', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false }));
    glow.scale.set(1.4, 1.4, 1); glow.position.set(0, 2.1, .1); body.add(glow);
    // la guardia: si sporge dal finestrino verso la pista (lato sinistro della jeep)
    const guard = new T.Group(); guard.position.set(-.95, 1.55, .05); body.add(guard);
    ball(.24, .3, .2, shirt, guard, 0, 0, 0);
    ball(.17, .19, .17, skin, guard, -.08, .38, 0);
    const bt = ball(.2, .07, .2, beret, guard, -.1, .55, 0); bt.rotation.z = .25;
    box(.06, .04, .02, mega, guard, -.24, .55, -.05);
    const arm = new T.Group(); arm.position.set(-.18, .1, -.05); guard.add(arm);
    rod([0, 0, 0], [-.42, .1, -.12], .065, shirt, arm);
    ball(.07, .07, .07, skin, arm, -.45, .1, -.13);
    const horn = mesh(new T.ConeGeometry(.15, .34, 14, 1, true), mega, guard); horn.rotation.z = Math.PI / 2; horn.position.set(-.2, .4, -.22); horn.material.side = T.DoubleSide;
    const blob = new T.Mesh(new T.PlaneGeometry(2.4, 4.4), new T.MeshBasicMaterial({ color: '#000', alphaMap: glowTex, transparent: true, opacity: .5, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = .03; J.add(blob);
    J.userData = { body, wheels, arm, beacon, glow, guard };
    scene.add(J);
    return J;
  }
  function renderJeep(g, t, now, live) {
    if (!g) { if (gevJeep) gevJeep.visible = false; return; }
    const J = gevJeep ||= makeJeep(), u = J.userData, z = g.z;
    J.visible = z < 14 && z > -140;
    if (!J.visible) return;
    J.position.set(center(z, t) + (g.L - 1) * spacing(), height(z, t), z);
    J.rotation.set(0, Math.sin(now / 700) * .04, 0);
    u.body.rotation.x = Math.atan(slope(z, t)) + Math.sin(now / 95) * .012;
    u.body.position.y = Math.abs(Math.sin(now / 120)) * .05;
    for (const w of u.wheels) w.rotation.x = -t / .45;
    const on = Math.floor(now / 220) % 2 === 0;
    u.glow.material.opacity = on ? .95 : .15; u.beacon.material.color.set(on ? '#ffb02a' : '#7a3a08');
    // braccio: lancio (si carica indietro e scatta in avanti) oppure dito puntato che si agita
    u.arm.rotation.set(g.arm > 0 ? (g.arm > .35 ? .9 : -1.2) : Math.sin(now / 140) * .25, 0, g.arm > 0 ? -.4 : Math.sin(now / 90) * .15);
    u.guard.rotation.z = Math.sin(now / 180) * .08;
    if (live && Math.random() < .6) emit(J.position.x + (Math.random() - .5), height(z + 2, t) + .2, z + 2.2, (Math.random() - .5) * 2, 1.5 + Math.random() * 2, 3 + Math.random() * 3, .9);
  }
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
    } else if (type === 'shortcut') {
      // Bivio del "taglio": arco di legno sulla corsia con il cartello giallo, frecce e nastro.
      const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
      x.fillStyle = '#ffcf16'; x.fillRect(0, 0, 512, 160); x.strokeStyle = '#111'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 148);
      x.fillStyle = '#111'; x.font = '900 70px Arial'; x.textAlign = 'center'; x.fillText('TAGLIO', 256, 82);
      x.font = '900 34px Arial'; x.fillText('DELLE 16.00 ▲', 256, 132);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) { box(.16, 3.1, .16, rampWood, g, sd * 1.05, 1.55, 0); }
      box(2.4, .14, .18, rampWood, g, 0, 3.05, 0);
      const sign = mesh(new T.PlaneGeometry(1.9, .6), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); sign.position.set(0, 2.62, .1); sign.castShadow = false;
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffd400', transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
      glow.scale.set(3.2, 1.6, 1); glow.position.set(0, 2.62, .2); g.add(glow);
      for (const sd of [-1, 1]) { const arrow = mesh(new T.ConeGeometry(.18, .4, 4), rampLip, g); arrow.rotation.x = -Math.PI / 2; arrow.position.set(sd * .6, .25, -.5); }
    } else if (type === 'forkSplit') {
      // v103 · portale del bivio sopra la pista: a sinistra e a destra i due rami (si sceglie la parte, poi la strada si divide davvero)
      const c = document.createElement('canvas'); c.width = 1024; c.height = 200; const x = c.getContext('2d');
      g.userData.paint = shortSide => {
        for (const [sd, x0] of [[-1, 0], [1, 512]]) {
          const sh = sd === shortSide; x.fillStyle = sh ? '#c8321f' : '#1f6b34'; x.fillRect(x0, 0, 512, 200);
          x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 58px Arial';
          x.fillText((sd < 0 ? '◀ ' : '') + (sh ? 'PIETRAIA' : 'STRADA LUNGA') + (sd > 0 ? ' ▶' : ''), x0 + 256, 88);
          x.font = '900 36px Arial'; x.fillText(sh ? '⏱ CORTA · DURA' : '🍺 PULITA · BIRRE', x0 + 256, 150);
        }
        x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(6, 6, 1012, 188); x.beginPath(); x.moveTo(512, 0); x.lineTo(512, 200); x.stroke();
        tx.needsUpdate = true;
      };
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) box(.18, 4.6, .18, rampWood, g, sd * 5.2, 2.3, 0);
      box(10.6, .2, .2, rampWood, g, 0, 4.5, 0);
      const sign = mesh(new T.PlaneGeometry(9.6, 1.9), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); sign.position.set(0, 3.45, .1); sign.castShadow = false; sign.userData.keep = true;
      for (let i = 0; i < 5; i++) { const r = mesh(rockGeo, rockMat, g); r.scale.setScalar(.35 + (i % 3) * .12); r.position.set(-.8 + i * .4, .1, -2 - i * .9); }   // la punta dell'isola in mezzo
      { // v103 · cartello a frecce giallo-nero sulla punta dell'isola: si capisce subito che la strada si divide
        const cc = document.createElement('canvas'); cc.width = 512; cc.height = 160; const q = cc.getContext('2d');
        q.fillStyle = '#ffd400'; q.fillRect(0, 0, 512, 160); q.fillStyle = '#111';
        for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const cx = 256 + sd * (60 + k * 62); q.beginPath(); q.moveTo(cx + sd * 26, 80); q.lineTo(cx - sd * 14, 20); q.lineTo(cx - sd * 40, 20); q.lineTo(cx, 80); q.lineTo(cx - sd * 40, 140); q.lineTo(cx - sd * 14, 140); q.closePath(); q.fill(); }
        const ct = new T.CanvasTexture(cc); ct.colorSpace = T.SRGBColorSpace;
        const chev = mesh(new T.PlaneGeometry(3.2, 1), new T.MeshBasicMaterial({ map: ct, side: T.DoubleSide }), g); chev.position.set(0, 1.05, -.6); chev.castShadow = false;
        for (const sd of [-1, 1]) box(.12, 1.1, .12, rampWood, g, sd * 1.4, .55, -.65);
      }
    } else if (type === 'forkShort' || type === 'forkSafe') {
      // v97 · bivio: due cartelli su pali, pietraia corta (rischio) o strada lunga con le birre
      const sh = type === 'forkShort', c = document.createElement('canvas'); c.width = 512; c.height = 200; const x = c.getContext('2d');
      x.fillStyle = sh ? '#c8321f' : '#1f6b34'; x.fillRect(0, 0, 512, 200); x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(6, 6, 500, 188);
      x.fillStyle = '#fff'; x.font = '900 64px Arial'; x.textAlign = 'center'; x.fillText(sh ? 'PIETRAIA' : 'STRADA LUNGA', 256, 86);
      x.font = '900 40px Arial'; x.fillText(sh ? '⏱ CORTA · DURA' : '🍺 PULITA · BIRRE', 256, 150);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) box(.14, 3.3, .14, rampWood, g, sd * 1.05, 1.65, 0);
      const sign = mesh(new T.PlaneGeometry(2.5, .98), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); sign.position.set(0, 2.85, .08); sign.castShadow = false;
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: sh ? '#ff6a4a' : '#5dff8a', transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false })); glow.scale.set(3.6, 1.8, 1); glow.position.set(0, 2.85, .2); g.add(glow);
      const arrow = mesh(new T.ConeGeometry(.22, .5, 4), sh ? mat('#c8321f', .6) : mat('#1f6b34', .6), g); arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, .3, -.6);
      if (sh) for (let i = 0; i < 4; i++) { const r = mesh(new T.IcosahedronGeometry(.18 + i * .04, 0), stone, g); r.position.set(-.9 + i * .6, .12, -1.2 - (i % 2) * .5); }
    } else if (type === 'bar') {
      // v84 · sosta al bar del Giro easy: arco con tendone a righe, insegna e bancone con le birre
      const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
      x.fillStyle = '#1d5a2c'; x.fillRect(0, 0, 512, 160); x.strokeStyle = '#ffd36a'; x.lineWidth = 10; x.strokeRect(6, 6, 500, 148);
      x.fillStyle = '#ffd36a'; x.font = '900 78px Arial'; x.textAlign = 'center'; x.fillText('BAR', 256, 86);
      x.fillStyle = '#ffffff'; x.font = '900 32px Arial'; x.fillText('BIRRA FRESCA AL VOLO', 256, 134);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) box(.16, 3.1, .16, rampWood, g, sd * 1.05, 1.55, 0);
      const red = mat('#d0301f', .7), white = mat('#f4f0e6', .7);
      for (let i = 0; i < 6; i++) { const st = box(.4, .1, 1.1, i % 2 ? white : red, g, -1 + i * .4, 3.2, .1); st.rotation.x = -.35; }
      const sign = mesh(new T.PlaneGeometry(1.9, .6), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); sign.position.set(0, 2.55, .12); sign.castShadow = false;
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffd36a', transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false }));
      glow.scale.set(3.2, 1.6, 1); glow.position.set(0, 2.55, .2); g.add(glow);
      for (const sd of [-1, 1]) {
        box(.9, .9, .5, rampWood, g, sd * 1.75, .45, 0);
        for (let k = 0; k < 2; k++) { mesh(new T.CylinderGeometry(.09, .085, .22, 12), beerMat, g).position.set(sd * 1.75 + (k - .5) * .3, 1.02, 0); mesh(new T.CylinderGeometry(.1, .1, .05, 12), foamMat, g).position.set(sd * 1.75 + (k - .5) * .3, 1.15, 0); }
      }
    } else if (type === 'mboard') {
      // v86 · cartello dei metri sul pendio d'arrivo del Taglio di Angelo
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      const board = mesh(new T.PlaneGeometry(2.2, 1.1), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); board.position.y = 2.6; board.castShadow = false;
      for (const sd of [-1, 1]) box(.12, 2.4, .12, rampWood, g, sd * .9, 1.2, -.05);
      g.userData.draw = (m, rec) => {
        x.fillStyle = rec ? '#d0301f' : '#ffcf16'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#111'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118);
        x.fillStyle = rec ? '#fff' : '#111'; x.textAlign = 'center'; x.font = '900 ' + (rec ? 44 : 72) + 'px Arial';
        if (rec) { x.fillText('RECORD', 128, 56); x.font = '900 44px Arial'; x.fillText(m + ' m', 128, 106); } else x.fillText(m + ' m', 128, 90);
        tx.needsUpdate = true; g.userData.m = m + (rec ? 'r' : '');
      };

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
    } else if (type === 'tree') {
      // v46 · MontaFiga: abete in mezzo alla pista (non si salta: si schiva)
      if (firOK) {   // v70 · abete vero (sagoma dal modello Poly Haven)
        const c = new T.Mesh(cardGeo, (Math.random() < .5 ? firA : firB).material); c.scale.setScalar(2.6); c.rotation.y = Math.random() * 3; g.add(c);
        mesh(new T.CylinderGeometry(.14, .22, 1.2, 8), bark, g).position.y = .6;
        hazardRing(g, .62);
      } else {
      mesh(new T.CylinderGeometry(.16, .26, 1.6, 9), bark, g).position.y = .8;
      const c1 = mesh(new T.ConeGeometry(.72, 2.1, 10), pine, g); c1.position.y = 2.1;
      const c2 = mesh(new T.ConeGeometry(.55, 1.7, 10), pineLight, g); c2.position.y = 3.0;
      const c3 = mesh(new T.ConeGeometry(.34, 1.2, 9), pine, g); c3.position.y = 3.75;
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + .5; rod([Math.cos(a) * .15, .15, Math.sin(a) * .15], [Math.cos(a) * .5, 0, Math.sin(a) * .5], .05, bark, g); }
      hazardRing(g, .62);
      }
    } else if (type === 'ford') {
      // v46 · guado: torrente che attraversa tutta la pista, con sassi e schiuma
      // v97 · guado vero: bordi irregolari, sponde di fango bagnato, corrente che scorre, sassi affioranti con la schiuma a valle
      const inner = new T.Group(); g.add(inner); g.userData.inner = inner;   // allargato su tutta la pista (solo in x)
      g.rotation.y = (Math.random() - .5) * .3;   // il torrente non taglia mai la pista a squadra
      const D = fordDecal(), G = fordGeos();
      const gm = new T.MeshStandardMaterial({ map: D.ground, transparent: true, depthWrite: false, roughness: .55, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      const fg = new T.PlaneGeometry(1, 12, 1, 30).rotateX(-Math.PI / 2); g.userData.fgeo = fg; g.userData.stones = [];   // v101 · la superficie segue il terreno (niente pezzi sepolti)
      const gp = mesh(fg, gm, inner); gp.position.y = 0; gp.receiveShadow = true; gp.castShadow = false;
      const wm = new T.MeshStandardMaterial({ map: fordTex, alphaMap: D.mask, color: '#d6ebe4', transparent: true, depthWrite: false, roughness: .04, metalness: .35, opacity: .75, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
      const wp = mesh(fg, wm, inner); wp.position.y = .02; wp.castShadow = false;
      const seed = Math.random() * 100;
      for (let i = 0; i < 30; i++) {
        const x = (i - 15) * .5 + Math.sin(seed + i * 7.3) * .3, z = Math.sin(seed * .7 + i * 3.1) * 2.2 + (i % 5 === 0 ? (i % 2 ? 3.3 : -3.3) : 0), sz = .14 + Math.abs(Math.sin(seed + i * 2.2)) * .26;
        const r = mesh(rockGeo, wetRockMat, g); r.scale.set(sz * 1.3, sz * 1.15, sz); r.position.set(x, .07 + sz * .12, z); r.rotation.y = i; g.userData.stones.push([r, z, sz * .12]);
        if (i % 2 === 0) { const fm = mesh(G.wake, fordFoamT, g); r.userData.wake = fm; fm.position.set(x + sz * 1.6, .1, z); fm.scale.set(sz * 6, 1, sz * 4); fm.castShadow = false; }
      }
    } else if (type === 'ibex' || type === 'chamois') {
      // v46 · stambecco (corna grandi a falce) e camoscio (corna a uncino, maschera bianca e nera)
      const ib = type === 'ibex', fur = ib ? ibexFur : chamFur, sc = ib ? 1.1 : .95;
      const inner = new T.Group(); inner.scale.setScalar(sc); g.add(inner);
      g.userData.inner = inner; ball(.45, .27, .22, fur, inner, 0, .66, 0);
      for (const [x, z] of [[-.3, -.11], [-.3, .11], [.29, -.11], [.29, .11]]) rod([x, .55, z], [x, .02, z], .045, goatDark, inner);
      ball(.15, .16, .12, ib ? fur : goatWhite, inner, .5, .88, 0);
      ball(.08, .07, .08, goatDark, inner, .62, .84, 0);
      if (ib) for (const z of [-.06, .06]) { const c = new T.CatmullRomCurve3([new T.Vector3(.48, .98, z), new T.Vector3(.4, 1.25, z * 1.4), new T.Vector3(.2, 1.38, z * 1.8), new T.Vector3(.02, 1.22, z * 2)]); mesh(new T.TubeGeometry(c, 10, .035, 6), hornMat, inner); }
      else for (const z of [-.05, .05]) { const c = new T.CatmullRomCurve3([new T.Vector3(.5, .98, z), new T.Vector3(.52, 1.18, z), new T.Vector3(.44, 1.24, z)]); mesh(new T.TubeGeometry(c, 8, .022, 6), goatDark, inner); box(.02, .12, .05, goatDark, inner, .58, .9, z * 1.6); }
      rod([-.44, .7, 0], [-.52, .76, 0], .03, fur, inner);
      hazardRing(g, .62);
    } else if (type === 'trincia') {
      // v81 · trattore del Gusta con la trincia: muso verso +x (attraversa la pista), ruote grandi dietro, trincia arancione che gira
      const inner = new T.Group(); inner.scale.setScalar(1.35); g.add(inner); g.userData.inner = inner;
      const green = tractorGreen, dark = goatDark;
      box(1.5, .55, .7, green, inner, .15, .75, 0);                       // cofano e corpo
      box(.5, .3, .62, green, inner, .78, .7, 0);                          // muso
      box(.06, .26, .5, black, inner, 1.04, .7, 0);                        // griglia
      // v82 · trattore scoperto: si vede il Gusta alla guida (testone con la sua foto), roll-bar e volante
      box(.34, .12, .5, black, inner, -.42, 1.08, 0);                      // sedile
      box(.08, .4, .5, black, inner, -.6, 1.3, 0);                         // schienale
      for (const z of [-.42, .42]) rod([-.72, 1.0, z], [-.72, 2.15, z], .04, black, inner);   // roll-bar
      rod([-.72, 2.15, -.42], [-.72, 2.15, .42], .04, black, inner);
      rod([.05, 1.0, 0], [-.12, 1.42, 0], .025, black, inner);              // piantone
      { const sw = mesh(new T.TorusGeometry(.17, .025, 6, 18), black, inner); sw.position.set(-.13, 1.45, 0); sw.rotation.y = Math.PI / 2; sw.rotation.x = .5; }
      ball(.2, .3, .24, gustaShirt, inner, -.42, 1.42, 0);                 // busto
      for (const z of [-.17, .17]) rod([-.42, 1.58, z], [-.14, 1.46, z * .8], .06, gustaShirt, inner);   // braccia al volante
      const face = new T.Sprite(new T.SpriteMaterial({ map: gustaFaceTex, depthWrite: false })); face.scale.set(.95, .95, 1); face.position.set(-.42, 2.02, 0); inner.add(face);
      rod([.5, 1.0, .2], [.5, 1.62, .2], .045, black, inner);              // marmitta
      for (const z of [-.47, .47]) {
        const rw = mesh(new T.CylinderGeometry(.62, .62, .34, 22), rubber, inner); rw.rotation.x = Math.PI / 2; rw.position.set(-.45, .62, z);
        const rh = mesh(new T.CylinderGeometry(.34, .34, .36, 16), tractorYellow, inner); rh.rotation.x = Math.PI / 2; rh.position.set(-.45, .62, z);
        const fw = mesh(new T.CylinderGeometry(.36, .36, .26, 18), rubber, inner); fw.rotation.x = Math.PI / 2; fw.position.set(.7, .36, z * .92);
        const fh = mesh(new T.CylinderGeometry(.18, .18, .28, 12), tractorYellow, inner); fh.rotation.x = Math.PI / 2; fh.position.set(.7, .36, z * .92);
      }
      // trincia dietro, larga quanto il trattore, con il rullo a mazze che gira
      box(.5, .5, 1.5, mulchOrange, inner, -1.25, .42, 0);
      const roller = new T.Group(); roller.position.set(-1.25, .26, 0); inner.add(roller); g.userData.roller = roller;
      for (let i = 0; i < 6; i++) { const b = box(.08, .3, 1.3, dark, roller, 0, 0, 0); b.rotation.x = 0; b.rotation.z = i * Math.PI / 3; }
      // cartello col nome sopra la cabina
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 72; const sx = sc.getContext('2d');
      sx.fillStyle = '#1d3d12'; sx.fillRect(0, 0, 256, 72); sx.fillStyle = '#ffd23a'; sx.font = 'italic 900 44px Arial'; sx.textAlign = 'center'; sx.fillText('GUSTA', 128, 52);
      const st = new T.CanvasTexture(sc); st.colorSpace = T.SRGBColorSpace;
      const sign = new T.Sprite(new T.SpriteMaterial({ map: st, depthWrite: false })); sign.scale.set(1.4, .4, 1); sign.position.set(-.42, 2.78, 0); inner.add(sign);
      hazardRing(g, 1.1);
    } else if (type === 'marmot') {
      // v46 · marmotta in piedi a fischiare
      ball(.2, .26, .18, marmotFur, g, 0, .26, 0);
      ball(.13, .12, .12, marmotFur, g, 0, .58, .03);
      ball(.06, .05, .05, goatDark, g, 0, .58, .14);
      for (const x of [-.07, .07]) ball(.035, .03, .03, goatDark, g, x, .62, .12);
      for (const x of [-.11, .11]) ball(.04, .04, .03, marmotFur, g, x, .69, 0);
      ball(.06, .05, .2, marmotFur, g, 0, .06, -.24);
      hazardRing(g, .4);
    } else if (type === 'snowman') {
      // v46 · pupazzo di neve in mezzo alla pista di ghiaccio
      ball(.46, .42, .46, snowMat, g, 0, .4, 0); ball(.34, .32, .34, snowMat, g, 0, 1.02, 0); ball(.24, .23, .24, snowMat, g, 0, 1.5, 0);
      const nose = mesh(new T.ConeGeometry(.05, .26, 8), carrotMat, g); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.5, .33);
      for (const x of [-.08, .08]) ball(.03, .03, .03, black, g, x, 1.58, .21);
      for (let i = 0; i < 3; i++) ball(.035, .035, .035, black, g, 0, .92 + i * .12, .33 - Math.abs(i - 1) * .02);
      const sc = mesh(new T.TorusGeometry(.25, .06, 6, 18), scarfMat, g); sc.rotation.x = Math.PI / 2; sc.position.y = 1.3;
      box(.08, .26, .06, scarfMat, g, .16, 1.15, .2);
      for (const sd of [-1, 1]) rod([sd * .3, 1.05, 0], [sd * .72, 1.35, 0], .022, bark, g);
      mesh(new T.CylinderGeometry(.17, .19, .22, 14), black, g).position.y = 1.78;
      mesh(new T.CylinderGeometry(.27, .27, .03, 16), black, g).position.y = 1.68;
      hazardRing(g, .6);
    } else if (type === 'gate') {
      // v46 · porta del ghiaccio: due paletti con le bandierine e lo striscione "DI TRAVERSO!"
      const c = document.createElement('canvas'); c.width = 512; c.height = 112; const x = c.getContext('2d');
      x.fillStyle = '#1e7fd8'; x.fillRect(0, 0, 512, 112); x.fillStyle = '#ffffff'; for (let i = 0; i < 16; i++) x.fillRect(i * 32, i % 2 ? 0 : 100, 32, 12);
      x.font = 'italic 900 58px Arial'; x.textAlign = 'center'; x.fillText('DI TRAVERSO!', 256, 76);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) {
        rod([sd * 1.05, 0, 0], [sd * 1.05, 2.5, 0], .045, gateWhite, g);
        for (let k = 0; k < 4; k++) box(.1, .3, .1, k % 2 ? gateWhite : gateBlue, g, sd * 1.05, .3 + k * .55, 0);
        const fl = mesh(new T.PlaneGeometry(.5, .32), gateBlue, g); fl.position.set(sd * 1.33, 2.32, 0); fl.castShadow = false;
      }
      const ban = mesh(new T.PlaneGeometry(2.1, .46), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); ban.position.set(0, 2.18, 0); ban.castShadow = false;
      const ring = mesh(new T.RingGeometry(.85, .98, 28), gateRing, g); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; ring.castShadow = false;
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
    } else if (type === 'speedpad') {
      // v67 · scopa volante di Angelo Potter: manico di legno, saggina con le fasce dorate, scia luminosa
      const spin = new T.Group(); spin.position.y = 1.15; g.add(spin); g.userData.spin = spin;
      spin.scale.setScalar(1.6);
      const wood = mat('#7a4424', .55), straw = mat('#c8964a', .9), band = mat('#d9b04a', .3, .7);
      const h = mesh(new T.CylinderGeometry(.04, .05, 1.7, 10), wood, spin); h.rotation.z = Math.PI / 2; h.position.x = -.2;
      const br = mesh(new T.ConeGeometry(.24, .62, 14, 1, true), straw, spin); br.rotation.z = Math.PI / 2; br.position.x = .85;
      const core = mesh(new T.CylinderGeometry(.075, .2, .5, 12), straw, spin); core.rotation.z = Math.PI / 2; core.position.x = .82;
      for (const bx of [.6, .68]) { const b = mesh(new T.TorusGeometry(.085, .022, 6, 16), band, spin); b.rotation.y = Math.PI / 2; b.position.x = bx; }
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffd36a', transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false }));
      glow.scale.set(2.6, 1.3, 1); glow.position.set(0, 1.15, 0); g.add(glow);
      const trail = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#fff2b0', transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false }));
      trail.scale.set(1.2, .5, 1); trail.position.set(0, .05, 0); g.add(trail);
    } else if (type === 'landpad') {
      // v62 · bersaglio verde: la corsia libera per atterrare
      const ring = mesh(new T.RingGeometry(.55, .8, 32), new T.MeshBasicMaterial({ color: '#3ddc84', transparent: true, opacity: .85, side: T.DoubleSide, depthWrite: false }), g); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; ring.castShadow = false;
      const dot = mesh(new T.CircleGeometry(.25, 24), new T.MeshBasicMaterial({ color: '#3ddc84', transparent: true, opacity: .85, depthWrite: false }), g); dot.rotation.x = -Math.PI / 2; dot.position.y = .045; dot.castShadow = false;
      const beam = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#3ddc84', transparent: true, opacity: .7, blending: T.AdditiveBlending, depthWrite: false }));
      beam.scale.set(1.2, 6, 1); beam.position.set(0, 3, 0); g.add(beam);
    } else if (type === 'boulder') {
      // v62 · pietrone della zona di atterraggio
      const r = mesh(detailedRockGeometry, detailedStone, g); r.scale.set(2.1, 2.3, 1.9); r.position.y = .2;
      hazardRing(g, 1.0);
    } else if (type === 'bigRamp') {
      // v64 · il bordo del burrone: niente rampa, solo lo striscione del Taglio di Angelo tra due pali e i sassi sul ciglio
      const inner = new T.Group(); g.add(inner); g.userData.inner = inner;
      const wood = mat('#8a5a32', .85);
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
      x.fillStyle = '#141414'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#ffcf16'; x.font = '900 58px Arial'; x.textAlign = 'center'; x.fillText('ANGELO POTTER', 256, 70);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      const ban = mesh(new T.PlaneGeometry(7.2, 1.3), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); ban.position.set(0, 5.4, 1.2); ban.castShadow = false;
      for (const sd of [-1, 1]) box(.22, 6, .22, wood, g, sd * 3.7, 3, 1.2);
      for (let i = 0; i < 9; i++) { const r = mesh(detailedRockGeometry, detailedStone, g); const sx = (i - 4) * 1.9; r.position.set(sx + Math.sin(i * 7) * .3, -.1, .6 + Math.cos(i * 3) * .3); r.scale.setScalar(.5 + (i % 3) * .2); }
    } else if (type === 'farm') {
      // v59 · la cascina del Gusta Ranch: casa lunga, tetto di coppi, portico ad archi, fieno e insegna
      const wall = mat('#e8d3a8', .9), roof = mat('#b4532a', .8), wood = mat('#6b4423', .9), dark = mat('#2a1e16', .9), hay = mat('#e0b64a', 1);
      box(9, 3.4, 4.2, wall, g, 0, 1.7, 0);
      const r1 = box(9.6, .25, 2.6, roof, g, 0, 3.9, -1.05); r1.rotation.x = .5;
      const r2 = box(9.6, .25, 2.6, roof, g, 0, 3.9, 1.05); r2.rotation.x = -.5;
      for (let i = 0; i < 4; i++) { box(1.5, 2.1, .2, dark, g, -3.2 + i * 2.1, 1.05, 2.12); }
      for (let i = 0; i < 5; i++) box(.4, 2.4, .4, wall, g, -4.2 + i * 2.1, 1.2, 2.3);
      for (let i = 0; i < 3; i++) { box(.9, .8, .2, dark, g, -3 + i * 3, 2.75, 2.12); box(1.1, .1, .3, wood, g, -3 + i * 3, 2.3, 2.15); }
      for (const [x, z] of [[5.6, 1.6], [6.6, .6], [5.9, -.6], [6.2, 2.8]]) { const h = mesh(new T.CylinderGeometry(.75, .75, 1.2, 16), hay, g); h.rotation.z = Math.PI / 2; h.position.set(x, .75, z); }
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#3a2414'; x.fillRect(0, 0, 512, 128); x.strokeStyle = '#e0a03a'; x.lineWidth = 10; x.strokeRect(6, 6, 500, 116);
      x.fillStyle = '#ffb12b'; x.font = '900 74px Arial'; x.textAlign = 'center'; x.fillText('GUSTA RANCH', 256, 92);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      for (const sd of [-1, 1]) box(.2, 3.4, .2, wood, g, 5.2 + sd * 1.6, 1.7, 4.6);
      const sign = mesh(new T.PlaneGeometry(3.4, .85), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); sign.position.set(5.2, 3.0, 4.7); sign.rotation.y = .5; sign.castShadow = false;
      { const lg = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), ranchLogoMat); lg.position.set(5.2, 4.75, 4.72); lg.rotation.y = .5; lg.userData.keep = true; g.add(lg); }   // v102 · il logo vero del Gusta Ranch sopra l'insegna
      g.rotation.y = .25;
    } else if (type === 'cone') {
      // v57 · birillo lanciato dalle GEV
      box(.6, .06, .6, gevBlack, g, 0, .03, 0);
      mesh(new T.ConeGeometry(.27, .66, 18), gevOrange, g).position.y = .38;
      for (const [y, r] of [[.3, .2], [.5, .13]]) { const b = mesh(new T.CylinderGeometry(r, r + .03, .07, 18), gevWhite, g); b.position.y = y; }
      hazardRing(g, .5);
    } else if (type === 'tyre') {
      // v57 · copertone di jeep lanciato dalle GEV
      const t1 = mesh(new T.TorusGeometry(.33, .15, 10, 24), rubber, g); t1.position.y = .48;
      const hub = mesh(new T.CylinderGeometry(.2, .2, .16, 16), alloy, g); hub.rotation.x = Math.PI / 2; hub.position.y = .48;
      hazardRing(g, .55);
    } else if (type === 'sign') {
      // v57 · cartello di divieto di transito su cavalletto
      const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#d7261e'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(128, 128, 92, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1b1b1b'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.fillText('MOTO', 128, 118); x.font = '900 30px Arial'; x.fillText('VIETATE', 128, 160);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      const d = mesh(new T.CircleGeometry(.36, 32), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide }), g); d.position.set(0, 1.05, .03); d.castShadow = false;
      mesh(new T.CylinderGeometry(.37, .37, .03, 32), gevRed, g).rotation.x = Math.PI / 2; g.children[g.children.length - 1].position.set(0, 1.05, 0);
      rod([0, 0, 0], [0, 1.05, 0], .035, gevBlack, g);
      for (const a of [0, 2.1, 4.2]) rod([0, .35, 0], [Math.sin(a) * .38, 0, Math.cos(a) * .38], .025, gevBlack, g);
      hazardRing(g, .55);
    } else if (type === 'barrier') {
      // v57 · transenna bianca e rossa
      const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#d7261e'; x.beginPath(); x.moveTo(i * 32 - 16, 32); x.lineTo(i * 32 + 16, 32); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32, 0); x.fill(); }
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      box(1.6, .2, .06, new T.MeshStandardMaterial({ map: tx, roughness: .6 }), g, 0, .66, 0);
      box(1.6, .12, .05, gevWhite, g, 0, .3, 0);
      for (const sd of [-1, 1]) { box(.07, .78, .07, gevWhite, g, sd * .72, .39, 0); box(.12, .05, .55, gevBlack, g, sd * .72, .03, 0); }
      hazardRing(g, .7);
    } else if (type === 'hen') {
      // v102 · gallina in fuga: corpo bianco o rosso, cresta, becco, zampe gialle
      const red = Math.random() < .4, body = red ? henRed : henWhite;
      ball(.2, .17, .14, body, g, 0, .27, 0); ball(.1, .1, .09, body, g, .17, .4, 0);
      ball(.07, .05, .02, henComb, g, .19, .5, 0); ball(.035, .025, .025, henBeak, g, .27, .4, 0); ball(.03, .04, .015, henComb, g, .24, .34, 0);
      const tail = ball(.1, .12, .08, body, g, -.19, .36, 0); tail.rotation.z = .6;
      for (const z of [-.05, .05]) rod([.02, .14, z], [.04, 0, z], .015, henBeak, g);
      for (const z of [-.13, .13]) { const w = ball(.13, .07, .02, body, g, -.02, .3, z); w.rotation.x = z > 0 ? -.5 : .5; }
      g.scale.setScalar(1.7);   // grandi abbastanza da vederle arrivare
    } else if (type === 'rollHay') {
      // v102 · rotoballa che rotola di traverso (la tira il Gusta)
      const inner = new T.Group(); inner.position.y = .62; g.add(inner); g.userData.roller = inner;
      const c = mesh(new T.CylinderGeometry(.62, .62, 1.15, 22), hayRollSide, inner); c.rotation.x = Math.PI / 2;
      for (const z of [-.58, .58]) { const e = mesh(new T.CircleGeometry(.6, 22), hayRollEnd, inner); e.position.z = z; e.rotation.y = z > 0 ? 0 : Math.PI; }
      for (const z of [-.25, .25]) { const t2 = mesh(new T.TorusGeometry(.625, .018, 6, 28), twine, inner); t2.position.z = z; }
      hazardRing(g, .7);
    } else if (type === 'hayCart') {
      // v102 · carro del fieno: pianale, ruote e il mucchio di fieno inclinato che fa da rampa
      const sh = new T.Shape(); sh.moveTo(1.15, 0); sh.quadraticCurveTo(.1, .25, -.7, 1.05); sh.lineTo(-1.15, 1.0); sh.lineTo(-1.15, 0); sh.closePath();
      const geo = new T.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }); geo.rotateY(-Math.PI / 2); geo.translate(.75, .32, 0);
      mesh(geo, hayObs, g);
      box(1.7, .12, 2.5, cartWood, g, 0, .3, -.15);
      for (const x of [-.9, .9]) for (const z of [-1.1, .75]) { const w = mesh(new T.CylinderGeometry(.34, .34, .1, 14), cartWood, g); w.rotation.z = Math.PI / 2; w.position.set(x, .34, z); }
      for (const x of [-.87, .87]) box(.06, .5, 2.4, cartWood, g, x, .6, -.2);
      rod([0, .3, 1.1], [0, .25, 1.9], .04, cartWood, g);
      for (const x of [-.55, 0, .55]) box(.4, .06, .3, twine, g, x, 1.38, -1.0);
    } else if (type === 'pigpen') {
      // v102 · il porcile del Gusta: fango di traverso a tutta la pista, maiali che ci sguazzano ai lati, staccionata
      const inner = new T.Group(); g.add(inner); g.userData.inner = inner;
      g.rotation.y = (Math.random() - .5) * .25;
      const fg = new T.PlaneGeometry(1, 9, 1, 24).rotateX(-Math.PI / 2); g.userData.fgeo = fg; g.userData.stones = [];
      const pm = mesh(fg, pigMudMat, inner); pm.castShadow = false;
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const pig = new T.Group(); g.add(pig); const x = sx * (4.6 + k * 1.6), z = (k - .5) * 2.2 + Math.random() * .6;
          pig.position.set(x, 0, z); pig.rotation.y = Math.random() * 6;
          ball(.52, .34, .32, pigPink, pig, 0, .42, 0); ball(.22, .2, .2, pigPink, pig, .5, .5, 0);
          ball(.07, .07, .09, pigNose, pig, .7, .47, 0); for (const z2 of [-.11, .11]) { const e = ball(.08, .1, .03, pigPink, pig, .48, .7, z2); e.rotation.x = z2 * 3; }
          for (const [lx, lz] of [[.3, .17], [.3, -.17], [-.3, .17], [-.3, -.17]]) rod([lx, .2, lz], [lx, 0, lz], .06, pigPink, pig);
          ball(.4, .1, .3, pigMudDark, pig, -.05, .58, .05);   // fango sulla schiena
          mergeGroup(pig); g.userData.stones.push([pig, z, 0]);
        }
        for (let k = 0; k < 4; k++) { const post = box(.12, 1, .12, cartWood, g, sx * 3.9, .5, -3.6 + k * 2.4); g.userData.stones.push([post, -3.6 + k * 2.4, .5]); }
        const rail = box(.08, .1, 7.4, cartWood, g, sx * 3.9, .8, 0); g.userData.stones.push([rail, 0, .8]);
      }
    } else if (type === 'grapeCrate') {
      // v103 · cassette della vendemmia impilate, piene d'uva
      for (const [x, y, z] of [[-.32, 0, 0], [.32, 0, 0], [0, .3, .05]]) {
        const c = new T.Group(); c.position.set(x, y, z); g.add(c);
        box(.58, .04, .4, crateWood, c, 0, .02, 0); for (const sd of [-1, 1]) { box(.58, .26, .03, crateWood, c, 0, .15, sd * .19); box(.03, .26, .4, crateWood, c, sd * .28, .15, 0); }
        for (let k = 0; k < 6; k++) ball(.09, .08, .08, Math.random() < .6 ? grapeMat : grapeGreen, c, -.18 + (k % 3) * .18, .28, k < 3 ? -.08 : .08);
      }
      g.scale.setScalar(1.45); hazardRing(g, .55);
    } else if (type === 'cow') {
      // v103 · mucca al pascolo che attraversa (bianca a macchie nere, campanaccio)
      ball(.78, .42, .36, cowWhite, g, 0, 1.05, 0);
      for (const [x, y, z, r] of [[.2, 1.25, .3, .22], [-.35, 1.1, -.32, .2], [-.1, .9, .34, .16], [.4, 1.2, -.3, .15]]) ball(r, r * .8, .06, cowBlack, g, x, y, z);
      for (const [x, z] of [[-.5, -.2], [-.5, .2], [.5, -.2], [.5, .2]]) rod([x, .8, z], [x, 0, z], .07, cowWhite, g);
      ball(.24, .22, .2, cowWhite, g, .88, 1.25, 0); ball(.14, .11, .15, cowPink, g, 1.06, 1.15, 0);
      for (const z of [-.14, .14]) rod([.85, 1.42, z], [.82, 1.55, z * 1.9], .03, hornMat, g);
      ball(.08, .1, .08, mat('#c9a13a', .4, .6), g, .78, .92, 0);
      rod([-.78, 1.15, 0], [-.88, .7, 0], .03, cowWhite, g);
    } else if (type === 'manhole') {
      // v103 · tombino saltato: buco nero a terra, coperchio di ghisa sollevato e vapore
      const hole = mesh(new T.CircleGeometry(.48, 24), new T.MeshBasicMaterial({ color: '#050505' }), g); hole.rotation.x = -Math.PI / 2; hole.position.y = .03; hole.castShadow = false;
      const rim = mesh(new T.TorusGeometry(.5, .06, 6, 24), ironMat, g); rim.rotation.x = Math.PI / 2; rim.position.y = .04;
      const lid = mesh(new T.CylinderGeometry(.48, .48, .06, 24), ironMat, g); lid.position.set(.15, .42, -.1); lid.rotation.set(.9, 0, .5);
      const steam = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#cfd8d2', transparent: true, opacity: .35, depthWrite: false })); steam.scale.set(1.2, 1.8, 1); steam.position.y = .9; g.add(steam);
      hazardRing(g, .62);
    } else if (type === 'boar') {
      // v103 · cinghiale che attraversa di notte
      ball(.5, .32, .26, boarFur, g, 0, .5, 0); ball(.2, .2, .18, boarFur, g, .48, .5, 0); ball(.12, .1, .1, boarFur, g, .66, .44, 0);
      for (const z of [-.06, .06]) rod([.68, .4, z], [.74, .5, z * 2], .02, tuskMat, g);
      for (const [x, z] of [[-.3, -.12], [-.3, .12], [.3, -.12], [.3, .12]]) rod([x, .35, z], [x, 0, z], .05, boarFur, g);
      box(.7, .1, .04, boarFur, g, -.05, .84, 0);
      for (const z of [-.09, .09]) ball(.055, .055, .055, eyeShine, g, .6, .6, z);
      { const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#d8ff7a', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); gl.scale.set(.7, .4, 1); gl.position.set(.66, .6, 0); g.add(gl); }
      g.scale.setScalar(1.25);
      hazardRing(g, .62);
    } else if (type === 'deer') {
      // v103 · cervo che salta la pista nel faro
      ball(.62, .32, .26, deerFur, g, 0, 1.15, 0); ball(.3, .16, .2, deerLight, g, -.05, 1.0, 0);
      for (const [x, z] of [[-.42, -.12], [-.42, .12], [.42, -.12], [.42, .12]]) rod([x, 1.0, z], [x + (x > 0 ? .25 : -.25), .15, z], .045, deerFur, g);
      rod([.5, 1.3, 0], [.72, 1.75, 0], .1, deerFur, g); ball(.2, .14, .13, deerFur, g, .82, 1.82, 0); for (const z of [-.09, .09]) ball(.06, .06, .06, eyeShine, g, .9, 1.88, z);
      { const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#d8ff7a', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); gl.scale.set(.8, .45, 1); gl.position.set(.95, 1.88, 0); g.add(gl); }
      for (const z of [-.08, .08]) { rod([.76, 1.95, z], [.7, 2.4, z * 3], .025, hornMat, g); rod([.72, 2.2, z * 2], [.9, 2.35, z * 3.5], .02, hornMat, g); rod([.7, 2.3, z * 2.6], [.55, 2.5, z * 4], .02, hornMat, g); }
    } else if (type === 'goldMug') {
      // v104 · boccale d'oro nascosto: d'oro massiccio, schiuma, alone che si vede da lontano
      const spin = new T.Group(); spin.position.y = 1.15; g.add(spin); g.userData.spin = spin;
      const cup = mesh(new T.CylinderGeometry(.3, .26, .62, 20, 1, true), goldMat, spin); cup.material.side = T.DoubleSide;
      const bot = mesh(new T.CylinderGeometry(.27, .27, .05, 20), goldMat, spin); bot.position.y = -.3;
      ball(.31, .12, .31, goldFoam, spin, 0, .32, 0);
      const h = mesh(new T.TorusGeometry(.17, .045, 8, 16, Math.PI), goldMat, spin); h.rotation.z = -Math.PI / 2; h.position.x = .3;
      for (const y of [-.2, .18]) { const r = mesh(new T.TorusGeometry(.29, .025, 6, 22), goldMat, spin); r.rotation.x = Math.PI / 2; r.position.y = y; }
      spin.scale.setScalar(1.25);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffd23a', transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false })); glow.scale.set(2.6, 2.6, 1); glow.position.y = 1.15; g.add(glow);
      const beam = mesh(new T.CylinderGeometry(.05, .3, 6, 10, 1, true), new T.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), g); beam.position.y = 3.6; beam.castShadow = false;
    } else if (type === 'dolmen') {
      // v103 · dolmen di Costa: due lastroni dritti e il lastrone di copertura, muschio e cartello
      const slab = (w, h, d, x, y, z, rx = 0, rz = 0) => { const o = mesh(new T.BoxGeometry(w, h, d, 3, 3, 2), dolmenStone, g); o.position.set(x, y, z); o.rotation.set(rx, 0, rz);
        const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (1 + (Math.random() - .5) * .14), pa.getY(i) * (1 + (Math.random() - .5) * .08), pa.getZ(i) * (1 + (Math.random() - .5) * .2)); o.geometry.computeVertexNormals(); return o; };
      slab(.5, 1.6, 1.3, -.6, .8, 0, 0, .05); slab(.5, 1.5, 1.2, .62, .75, .05, 0, -.06);
      slab(2.1, .55, 1.8, 0, 1.78, 0, .05, -.06);
      for (const [x, z, r] of [[-.3, .3, .18], [.4, -.4, .14], [.1, .55, .12]]) ball(r * 1.6, .06, r, lichen, g, x, 2.04, z);
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#6b4a2a'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#ffe9b0'; x.font = '900 30px Arial'; x.textAlign = 'center'; x.fillText('DOLMEN DI COSTA', 128, 43);
      const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; const pl = mesh(new T.PlaneGeometry(.9, .23), new T.MeshBasicMaterial({ map: tx }), g); pl.position.set(0, .55, .62); pl.castShadow = false;
      rod([-.5, 0, .62], [-.5, .5, .62], .03, cartWood, g); rod([.5, 0, .62], [.5, .5, .62], .03, cartWood, g);
      hazardRing(g, .85);
    } else if (type === 'heli') {
      // v103 · elicottero del soccorso alpino che passa sopra la pista
      const body = new T.Group(); body.position.y = 7.5; g.add(body); g.userData.heli = body;
      ball(1.3, .8, .75, heliRed, body, 0, 0, 0); ball(.7, .55, .6, heliGlass, body, .7, .15, 0);
      rod([-1, .1, 0], [-3.4, .45, 0], .16, heliRed, body); box(.1, .9, .5, heliWhite, body, -3.4, .7, 0);
      box(2.2, .06, .08, ironMat, body, 0, -.95, .55); box(2.2, .06, .08, ironMat, body, 0, -.95, -.55);
      for (const z of [-.55, .55]) for (const x of [-.6, .6]) rod([x, -.6, z * .8], [x, -.95, z], .03, ironMat, body);
      const rotor = new T.Group(); rotor.position.y = .95; body.add(rotor); g.userData.rotor = rotor;
      for (const a of [0, Math.PI / 2]) { const bl = box(5.4, .04, .22, ironMat, rotor, 0, 0, 0); bl.rotation.y = a; }
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.font = '900 40px Arial'; x.textAlign = 'center'; x.fillText('118', 128, 48);
      const tx = new T.CanvasTexture(c); for (const sd of [-1, 1]) { const pl = mesh(new T.PlaneGeometry(.9, .22), new T.MeshBasicMaterial({ map: tx, transparent: true, side: T.DoubleSide }), body); pl.position.set(-.2, .05, sd * .76); }
    } else if (type === 'rollRock') {
      const inner = new T.Group(); inner.position.y = .55; g.add(inner); g.userData.roller = inner;
      const r = mesh(detailedRockGeometry, detailedStone, inner); r.position.y = -.55; r.scale.setScalar(.9);
      hazardRing(g, .62);
    }
    mergeGroup(g); if (g.userData.inner) mergeGroup(g.userData.inner); if (g.userData.spin) for (const c of g.userData.spin.children) if (c.isGroup) mergeGroup(c); if (g.userData.spin) mergeGroup(g.userData.spin); if (g.userData.roller) mergeGroup(g.userData.roller);
    return g;
  }

  // ---------- Particelle: terra dalla ruota, schizzi, scintille ----------
  const PARTS = 150;
  const partMat = new T.MeshStandardMaterial({ color: '#6e5638', roughness: 1, flatShading: true });   // v72 · zolle di terra più scure e spigolose
  const parts = new T.InstancedMesh(new T.IcosahedronGeometry(.07, 0), partMat, PARTS);
  parts.castShadow = false; scene.add(parts);
  const pData = Array.from({ length: PARTS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }));
  let pNext = 0, emitAcc = 0;
  // v95 · nuvoletta di neve sollevata dalla ruota dietro in derapata (sprite morbidi che si allargano e svaniscono)
  const PUFFS = 16, puffs = [];
  for (let i = 0; i < PUFFS; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#a9bccb', transparent: true, opacity: 0, depthWrite: false })); sp.visible = false; scene.add(sp); puffs.push({ sp, life: 0, vx: 0, vy: 0, vz: 0 }); }
  let puffNext = 0, puffAcc = 0;
  function puff(x, y, z, vx, vy, vz) { const p = puffs[puffNext]; puffNext = (puffNext + 1) % PUFFS; Object.assign(p, { life: 1, vx, vy, vz }); p.sp.position.set(x, y, z); p.sp.visible = true; }
  function updatePuffs(dt) {
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt * 1.3;
      if (p.life <= 0) { p.sp.visible = false; continue; }
      p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5;
      const k = 1 - p.life, sc = .9 + k * 3.4;
      p.sp.scale.set(sc * 1.4, sc, 1); p.sp.material.opacity = .95 * Math.min(1, p.life * 1.6) * Math.min(1, k * 6);
    }
  }
  function emit(x, y, z, vx, vy, vz, s = 1) { const p = pData[pNext]; pNext = (pNext + 1) % PARTS; Object.assign(p, { life: 1, x, y, z, vx, vy, vz, s }); }

  // Solco della gomma dietro la moto: segue le traiettorie reali tra le corsie.
  const TRACKS = 56;
  const trackMat = new T.MeshBasicMaterial({ color: '#3b2a1a', transparent: true, opacity: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const trackGeo = new T.PlaneGeometry(.2, 1); trackGeo.rotateX(-Math.PI / 2);
  const tracks = new T.InstancedMesh(trackGeo, trackMat, TRACKS); tracks.renderOrder = 1; scene.add(tracks);
  const trackHist = [];
  // v72 · polvere morbida (nuvolette sfumate rivolte alla camera) al posto delle palle grigie trasparenti
  const dustMaterial = new T.MeshBasicMaterial({ color: '#ceba8c', alphaMap: glowTex, transparent: true, opacity: .13, depthWrite: false, fog: true });
  // v80 · ombra morbida sotto la moto: la tiene "appoggiata" sul sentiero (si allarga e sbiadisce in salto)
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const blobMat = new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: .5, depthWrite: false, fog: false, toneMapped: false });
  const blobGeo = new T.PlaneGeometry(1.05, 2.5); blobGeo.rotateX(-Math.PI / 2);
  const blob = new T.Mesh(blobGeo, blobMat); blob.renderOrder = 1; scene.add(blob);
  const dust = new T.InstancedMesh(new T.PlaneGeometry(1, 1), dustMaterial, 24); dust.frustumCulled = false; dust.renderOrder = 2; scene.add(dust);

  const sparkMaterial = new T.MeshBasicMaterial({ color: '#ffdb43', transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending });
  const sparks = new T.InstancedMesh(new T.OctahedronGeometry(.07, 0), sparkMaterial, 26); scene.add(sparks);
  let lastEvent = 0, eventAt = -100, eventX = 0, eventY = 1.1;

  const auraMaterial = new T.MeshBasicMaterial({ color: '#ffd438', transparent: true, opacity: .58, depthWrite: false, blending: T.AdditiveBlending });
  const aura = mesh(new T.TorusGeometry(.85, .032, 6, 36), auraMaterial, bike); aura.name = 'fx'; aura.rotation.x = Math.PI / 2; aura.position.y = .07; aura.castShadow = aura.receiveShadow = false;
  const magnetAura = mesh(new T.TorusGeometry(1.25, .025, 6, 40), new T.MeshBasicMaterial({ color: '#d4145a', transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending }), bike);
  magnetAura.name = 'fx'; magnetAura.rotation.x = Math.PI / 2; magnetAura.position.y = .1; magnetAura.castShadow = magnetAura.receiveShadow = false;

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

  // v102 · arrivo del Gusta Ranch: il falò con la griglia, la tavolata e il gruppo che festeggia
  const ranchFinish = new T.Group(); ranchFinish.visible = false; scene.add(ranchFinish);
  { const lg = new T.Mesh(new T.PlaneGeometry(2.9, 2.9), ranchLogoMat); lg.position.set(0, 5.65, .08); ranchFinish.add(lg); }
  const flames = [];
  {
    const R = ranchFinish, wood = mat('#6b4a2e', .9), glowM = new T.SpriteMaterial({ map: glowTex, color: '#ffae3a', transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false });
    for (const sx of [-1, 1]) box(.2, 4.2, .2, wood, R, sx * 4.4, 2.1, 0);
    box(9, .22, .22, wood, R, 0, 4.15, 0);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#7a2e1c'; x.fillRect(0, 0, 1024, 128); x.fillStyle = '#ffd36a'; x.font = '900 62px Arial'; x.textAlign = 'center'; x.fillText('GUSTA RANCH • TUTTI AL FALÒ!', 512, 84);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const sg = mesh(new T.PlaneGeometry(8.5, 1.06), new T.MeshStandardMaterial({ map: t, side: T.DoubleSide }), R); sg.position.set(0, 3.55, .05);
    // falò: tronchi a capanna, sassi intorno, fiamme e bagliore
    const fire = new T.Group(); fire.position.set(0, 0, -9); fire.scale.setScalar(2); R.add(fire);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; rod([Math.cos(a) * .9, .05, Math.sin(a) * .9], [0, 1.5, 0], .1, wood, fire); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const st = ball(.2, .14, .18, stone, fire, Math.cos(a) * 1.25, .1, Math.sin(a) * 1.25); st.rotation.y = a; }
    for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.ConeGeometry(.55 - i * .1, 1.6 + i * .3, 7), new T.MeshBasicMaterial({ color: i % 2 ? '#ffcf4a' : '#ff7a1c', transparent: true, opacity: .9, depthWrite: false, fog: false })); f.position.set((i - 1.5) * .12, .9 + i * .1, (i % 2 - .5) * .15); fire.add(f); flames.push(f); }
    const glow = new T.Sprite(glowM); glow.scale.set(5, 5, 1); glow.position.y = 1.4; fire.add(glow); flames.push(glow);
    // griglia con la carne e il fumo
    const grill = new T.Group(); grill.position.set(-3.6, 0, -11); R.add(grill);
    box(1.8, .3, .8, mat('#2a2a2a', .5, .4), grill, 0, .95, 0);
    for (const [gx, gz] of [[-.8, -.3], [.8, -.3], [-.8, .3], [.8, .3]]) rod([gx, 0, gz], [gx, .85, gz], .04, black, grill);
    for (let i = 0; i < 6; i++) ball(.14, .05, .09, mat('#8a3b22', .6), grill, -.6 + i * .24, 1.13, (i % 2 - .5) * .3);
    for (let i = 0; i < 3; i++) { const p = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#d8d4cc', transparent: true, opacity: .35, depthWrite: false })); p.scale.setScalar(1.2 + i * .6); p.position.set(0, 1.6 + i * .8, 0); grill.add(p); flames.push(p); }
    // tavolata con panche, bottiglie e bicchieri
    const table = new T.Group(); table.position.set(3.9, 0, -12); table.rotation.y = -.2; R.add(table);
    box(4.2, .1, 1, mat('#9a6b3e', .85), table, 0, .9, 0);
    for (const tx of [-1.8, 1.8]) for (const tz of [-.35, .35]) rod([tx, 0, tz], [tx, .86, tz], .05, wood, table);
    for (const bz of [-.95, .95]) { box(4, .08, .35, wood, table, 0, .48, bz); for (const tx of [-1.7, 1.7]) rod([tx, 0, bz], [tx, .45, bz], .04, wood, table); }
    for (let i = 0; i < 6; i++) { const b = mesh(new T.CylinderGeometry(.05, .07, .38, 8), mat(i % 2 ? '#2f5a28' : '#5b1d22', .3), table); b.position.set(-1.6 + i * .64, 1.14, (i % 2 - .5) * .3); }
    // il gruppo che festeggia: braccia al cielo con le maglie EDT
    const shirts = ['#fcd326', '#151515', '#fcd326', '#d42a1e', '#fcd326', '#1f3fbf'], skin = mat('#e0b089', .7), pants = mat('#2b3138', .8);
    for (let i = 0; i < 6; i++) {
      const p = new T.Group(), a = Math.PI + .25 + i / 5 * (Math.PI - .5); p.position.set(Math.cos(a) * 3.7, 0, -9 + Math.sin(a) * 3.7); p.rotation.y = -a + Math.PI / 2; R.add(p);
      const sh = mat(shirts[i], .7);
      for (const lx of [-.12, .12]) rod([lx, 0, 0], [lx, .85, 0], .09, pants, p);
      mesh(new T.CapsuleGeometry(.25, .5, 4, 10), sh, p).position.y = 1.25;
      ball(.19, .21, .19, skin, p, 0, 1.85, 0);
      const up = i % 2 === 0;
      for (const ax of [-1, 1]) rod([ax * .28, 1.45, 0], up ? [ax * .45, 2.2, 0] : [ax * .38, .95, .15], .07, sh, p);
      if (i === 1 || i === 4) { const mug = mesh(new T.CylinderGeometry(.07, .07, .16, 8), mat('#f2c230', .3), p); mug.position.set(.47, 2.28, 0); }
      p.userData.bob = i; flames.push(p);
    }
  }

  // ---------- v41 · Avversari EDT: copie della moto con livrea, numero e nome propri ----------
  const rivalModels = new Map();
  const rivalTyre = new T.TorusGeometry(.38, .12, 6, 22), rivalRim = new T.TorusGeometry(.29, .025, 4, 18);
  const rivalSpokes = (() => { const g = new T.CylinderGeometry(.01, .01, .58, 3); const gs = []; for (let i = 0; i < 4; i++) { const c = g.clone(); c.rotateX(i * Math.PI / 4); gs.push(c); } return mergeGeometries(gs); })();
  const rivalMats = ['plastic', 'accent', 'jersey', 'pants', 'helmet'];
  // v105 · compagni con moto e pilota veri (stessi modelli del giocatore), ognuno con le sue tinte
  const rivalGlbReady = () => !!(riderGlb && helmGlb && glbCache.enduro && glbCache.enduro !== 'loading');
  function makeRivalGlb(r) {
    const G = glbCache.enduro, fit = BIKE_FIT.enduro;
    const bT = { value: new T.Color(r.livery.plastic) }, jT = { value: new T.Color(r.livery.jersey) }, pT = { value: new T.Color(r.livery.pants) };
    const mats = new Map();
    const bm = src => { if (!mats.has(src)) { const m = src.clone(); tintable(m, bT); mats.set(src, m); } return mats.get(src); };
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const add = (src, parent) => { const o = src.clone(true); o.traverse(c => { if (c.isMesh) { c.material = bm(c.material); c.castShadow = false; c.receiveShadow = false; } }); parent.add(o); return o; };
    add(G.body, body);
    const wheelsOut = [];
    for (const [w, a] of [[G.wr, G.rAxle], [G.wf, G.fAxle]]) { const h = new T.Group(); h.position.set(0, a.y, a.z); body.add(h); add(w, h); wheelsOut.push(h); }
    // pilota seduto in sella
    const ry = riderY0 + fit[3] + .118 - 1.43;
    const rm = new T.Mesh(riderGlb.mesh.geometry, riderMat(jT, pT)); rm.position.set(HIP.x, HIP.y + ry, HIP.z); body.add(rm); if (rm.morphTargetInfluences) rm.morphTargetInfluences[0] = .25;
    // casco: copia di quello del giocatore con il colore del compagno, sul collo del modello
    const helm = pmat(r.livery.helmet, .25), acc = pmat(r.livery.accent, .4);
    if (envTex) for (const m of [helm, acc]) { m.envMap = envTex; m.envMapIntensity = .9; }
    const tb = new T.Group(); tb.position.set(0, 1.42 + ry, .25); tb.rotation.x = -.14; body.add(tb);
    const h = head.clone(true); tb.add(h);
    const hT = { value: new T.Color(r.livery.helmet) };
    h.traverse(o => { if (o.name === 'fx' || o.name === 'fxcam') o.visible = false; if (o.isMesh && o.userData.helmGlb) { o.material = o.material.clone(); tintable(o.material, hT); o.castShadow = false; return; } if (o.isMesh) { if (o.material === helmetMat) o.material = helm; else if (o.material === accent) o.material = acc; else if (o.material === plastic) o.material = bm(o.material); o.castShadow = false; } });
    body.updateMatrixWorld(true);
    const nk = NECK.sit.clone().add(HIP); nk.y += ry; body.localToWorld(nk); tb.worldToLocal(nk);
    h.position.set(nk.x, nk.y + .11, nk.z + .01); h.rotation.set(0, 0, 0); h.scale.setScalar(.88);
    return finishRival(r, root, body, wheelsOut, false);
  }
  function makeRival(r) {
    if (rivalGlbReady()) return makeRivalGlb(r);
    const g = bike.clone(true);
    const m = { plastic: pmat(r.livery.plastic), accent: pmat(r.livery.accent, .4), jersey: mat(r.livery.jersey, .6), pants: mat(r.livery.pants, .8), helmet: pmat(r.livery.helmet, .25) };
    if (envTex) for (const k of ['plastic', 'accent', 'helmet']) { m[k].envMap = envTex; m[k].envMapIntensity = .9; }   // v73 · compagni con la stessa vernice lucida del giocatore
    const swap = { [plastic.uuid]: m.plastic, [accent.uuid]: m.accent, [jerseyMat.uuid]: m.jersey, [pantsMat.uuid]: m.pants, [helmetMat.uuid]: m.helmet };
    // nome e numero sulla schiena
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = r.livery.jersey; x.fillRect(0, 0, 256, 128);
    const col = new T.Color(r.livery.jersey), lum = col.r * .3 + col.g * .59 + col.b * .11;
    x.fillStyle = lum > .45 ? '#172127' : '#f7f3e6'; x.textAlign = 'center';
    x.font = '900 62px Arial'; x.fillText(String(r.number).padStart(2, '0'), 128, 62);
    x.font = '900 25px Arial'; x.fillText(r.name.toUpperCase(), 128, 106, 240);
    const dt = new T.CanvasTexture(c); dt.colorSpace = T.SRGBColorSpace;
    g.traverse(o => {
      if (o.name === 'fx' || o.name === 'fxcam') o.visible = false;
      if (o.isMesh && o.name === 'decal') o.material = new T.MeshStandardMaterial({ map: dt, roughness: 1 });
      else if (o.isMesh && swap[o.material.uuid]) o.material = swap[o.material.uuid];
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
    });
    // targhetta col nome sopra il pilota
    const tc2 = document.createElement('canvas'); tc2.width = 256; tc2.height = 64; const y = tc2.getContext('2d');
    y.fillStyle = 'rgba(12,13,11,.82)'; y.beginPath(); y.roundRect(4, 6, 248, 52, 14); y.fill();
    y.fillStyle = r.livery.plastic; y.fillRect(4, 6, 12, 52);
    y.fillStyle = '#fff'; y.font = 'italic 900 34px Arial'; y.textAlign = 'center'; y.fillText(r.name.toUpperCase(), 134, 45, 220);
    const tag = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(tc2), depthWrite: false, transparent: true }));
    tag.material.map.colorSpace = T.SRGBColorSpace; tag.scale.set(1.5, .375, 1); tag.position.set(0, 3.0, 0); tag.renderOrder = 5; g.add(tag);
    // v43 · prestazioni: tutta la moto (tranne le ruote) diventa pochi pezzi, uno per materiale, senza ombre vere.
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.children[0].rotation.set(0, 0, 0); g.children[0].position.set(0, 0, 0);
    g.traverse(o => { if (o.name === 'wheelR' || o.name === 'wheelF') o.rotation.x = 0; });
    g.updateMatrixWorld(true);
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const buckets = new Map(), wheelObjs = [];
    g.traverse(o => { if (o.name === 'wheelR' || o.name === 'wheelF') wheelObjs.push(o); });
    const hiddenOrWheel = o => { for (let p = o; p && p !== g; p = p.parent) { if (!p.visible) return true; if (p.name === 'wheelR' || p.name === 'wheelF') return true; } return false; };
    g.traverse(o => {
      if (!o.isMesh || o.isSprite || hiddenOrWheel(o)) return;
      const gp = o.geometry.parameters || {}, gt = o.geometry.type;
      const geo = (gt === 'SphereGeometry' ? new T.SphereGeometry(gp.radius, 10, 7)
        : gt === 'CylinderGeometry' ? new T.CylinderGeometry(gp.radiusTop, gp.radiusBottom, gp.height, 6)
        : gt === 'TorusGeometry' ? new T.TorusGeometry(gp.radius, gp.tube, 4, 12)
        : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.uv) geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(geo);
    });
    for (const [material, geos] of buckets) { const m = new T.Mesh(mergeGeometries(geos), material); geos.forEach(x => x.dispose()); m.castShadow = false; m.receiveShadow = false; body.add(m); }
    const wheelsOut = [];
    // ruote leggere: gomma tassellata finta, cerchio e mozzo (poche centinaia di triangoli)
    for (const w of wheelObjs) {
      const pos = new T.Vector3(); w.getWorldPosition(pos);
      const holder = new T.Group(); holder.position.copy(pos); body.add(holder); w.parent.remove(w);
      const wl = new T.Group(); holder.add(wl);
      const tyre = new T.Mesh(rivalTyre, rubber); tyre.rotation.y = Math.PI / 2; wl.add(tyre);
      const rim = new T.Mesh(rivalRim, alloy); rim.rotation.y = Math.PI / 2; wl.add(rim);
      const spokes = new T.Mesh(rivalSpokes, alloy); wl.add(spokes);
      wheelsOut.push(wl);
    }
    tag.parent?.remove(tag); root.add(tag);
    return finishRival(r, root, body, wheelsOut, true, tag);
  }
  function rivalTag(r) {
    const tc2 = document.createElement('canvas'); tc2.width = 256; tc2.height = 64; const y = tc2.getContext('2d');
    y.fillStyle = 'rgba(12,13,11,.82)'; y.beginPath(); y.roundRect(4, 6, 248, 52, 14); y.fill();
    y.fillStyle = r.livery.plastic; y.fillRect(4, 6, 12, 52);
    y.fillStyle = '#fff'; y.font = 'italic 900 34px Arial'; y.textAlign = 'center'; y.fillText(r.name.toUpperCase(), 134, 45, 220);
    const tag = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(tc2), depthWrite: false, transparent: true }));
    tag.material.map.colorSpace = T.SRGBColorSpace; tag.scale.set(1.5, .375, 1); tag.position.set(0, 3.0, 0); tag.renderOrder = 5;
    return tag;
  }
  function finishRival(r, root, body, wheelsOut, proc, tag) {
    if (!tag) { tag = rivalTag(r); root.add(tag); }
    const blob = new T.Mesh(new T.PlaneGeometry(1.3, 2.7), new T.MeshBasicMaterial({ color: '#000', alphaMap: glowTex, transparent: true, opacity: .45, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = .03; root.add(blob);
    // v97 · frontale dei compagni: lucina sul casco e chiazza di luce sul sentiero davanti
    const rLamp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#fff2cc', transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }));
    rLamp.scale.set(.75, .55, 1); rLamp.position.set(0, 2.05, -.25); rLamp.visible = false; root.add(rLamp);
    const rPool = new T.Mesh(new T.PlaneGeometry(2.6, 6), new T.MeshBasicMaterial({ color: '#ffe7b0', alphaMap: glowTex, transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false }));
    rPool.rotation.x = -Math.PI / 2; rPool.position.set(0, .05, -4.2); rPool.visible = false; root.add(rPool);
    const model = { g: root, pitch: body, wheels: wheelsOut, tag, phase: Math.random() * 10, ghost: !!r.ghost, lamp: [rLamp, rPool], proc };
    if (r.ghost) {
      // v48 · fantasma del primo in classifica: moto e pilota trasparenti e dorati, senza ombra
      blob.visible = false;
      root.traverse(o => { if (o.isMesh && o !== blob) { const ob = o.material.onBeforeCompile, ck = o.material.customProgramCacheKey; o.material = o.material.clone(); o.material.onBeforeCompile = ob; o.material.customProgramCacheKey = ck; o.material.transparent = true; o.material.opacity = .5; o.material.depthWrite = false; if (o.material.emissive) { o.material.emissive.set('#f2c230'); o.material.emissiveIntensity = .6; } o.castShadow = false; } });
    }
    scene.add(root);
    return model;
  }
  function renderRivals(list, t, now, live) {
    const seen = new Set();
    for (const r of list || []) {
      seen.add(r.name);
      let m = rivalModels.get(r.name);
      if (m && m.proc && rivalGlbReady()) { scene.remove(m.g); m = null; }   // arrivati i modelli veri: rifà il compagno
      if (!m) { m = makeRival(r); rivalModels.set(r.name, m); }
      const z = -r.gap;
      m.g.visible = z < 11 && z > -175;
      if (m.lamp) for (const o of m.lamp) o.visible = !!weatherNow.lamp;
      if (!m.g.visible) continue;
      const lx = (r.lx - 1) * spacing();
      m.g.position.set(center(z, t) + lx, height(z, t) + (r.lift || 0) + Math.abs(Math.sin(now / 90 + m.phase)) * .02, z);
      // v96 · sul ghiaccio i compagni seguono la direzione della pista nel punto in cui sono, col muso dentro la curva e piegati verso l'interno
      const rBend = iceMode ? iceBend(t + r.gap) : 0, rHead = iceMode ? -Math.atan((center(z - .6, t) - center(z + .6, t)) / 1.2) : 0;
      const rYaw = iceMode ? rHead + rBend * .35 - (r.lean || 0) * .12 : curShape ? -Math.atan((center(z - .6, t) - center(z + .6, t)) / 1.2) - (r.lean || 0) * .05 : -(r.lean || 0) * .05;   // v102.1 · al Gusta Ranch i compagni seguono i tornanti
      m.g.rotation.set(0, rYaw, curShape ? Math.max(-.5, Math.min(.5, curShape.bend(t + r.gap) * .32)) : iceMode ? Math.max(-.6, Math.min(.6, rBend * .45)) : Math.max(-.4, Math.min(.4, -(r.lean || 0) * .12)));   // v94 · anche i compagni piegati in derapata
      m.pitch.rotation.x = Math.atan(slope(z, t)) + Math.sin(now / 160 + m.phase) * .015;
      m.pitch.position.y = 0;
      for (const w of m.wheels) w.rotation.x = -(t + r.gap) / .475 * (m.proc ? 1 : 1.23);
      m.tag.visible = z > -60;
      // terra dalla ruota dietro
      if (live && !m.ghost && Math.random() < .5) emit(m.g.position.x + (Math.random() - .5) * .3, height(z, t) + .25, z + 1.1, (Math.random() - .5) * 1.5, 2 + Math.random() * 2.2, 4 + Math.random() * 3, .6 + Math.random() * .6);
    }
    for (const [name, m] of rivalModels) if (!seen.has(name)) { scene.remove(m.g); rivalModels.delete(name); }
  }

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
  // v41 · meteo che cambia durante il giro: pioggia (buio e grigio), nebbia (visibilità corta), tramonto (luce arancio).
  const _c1 = new T.Color(), _c2 = new T.Color(), DUSK = { top: new T.Color('#1f2452'), hor: new T.Color('#ff8a4a'), sun: new T.Color('#ff7a3a'), fog: new T.Color('#b97a62') }, GREY = new T.Color('#9aa3a8');
  function applyWeather(w, sight = 0) {
    const p = PRESETS[presetIndex] || PRESETS[0];
    const rain = w?.rain || 0, fog = (w?.fog || 0) * (1 - sight * .45), dusk = w?.dusk || 0;
    skyUniforms.uTop.value.set(p.top).lerp(DUSK.top, dusk * .8).lerp(GREY, rain * .55);
    skyUniforms.uHorizon.value.set(p.horizon).lerp(DUSK.hor, dusk * .7).lerp(GREY, Math.max(rain * .5, fog * .6));
    skyUniforms.uSun.value.set(p.sunColor).lerp(DUSK.sun, dusk);
    skyUniforms.uClouds.value = Math.min(1, p.clouds + rain * .5 + fog * .2);
    scene.fog.color.set(p.fog).lerp(DUSK.fog, dusk * .6).lerp(GREY, Math.max(rain * .55, fog * .75));
    scene.fog.near *= 1 - fog * .75 - rain * .25; scene.fog.far *= 1 - fog * .62 - rain * .2;
    sun.color.set(p.light).lerp(DUSK.sun, dusk * .7);
    sun.intensity = p.lightI * (1 - rain * .5 - fog * .3 - dusk * .35);
    hemi.intensity = p.hemiI * (1 - rain * .2 - dusk * .3);
    renderer.toneMappingExposure = p.exposure * (1 - dusk * .12 - rain * .05);
    // v84 · notte (MotoFogna): buio vero, si vede solo col faro; i fulmini illuminano tutto per un attimo
    const night = w?.night || 0, flash = w?.flash || 0;
    if (night > 0) {
      skyUniforms.uTop.value.lerp(NIGHT.top, night * .95); skyUniforms.uHorizon.value.lerp(NIGHT.hor, night * .9); skyUniforms.uSun.value.lerp(NIGHT.top, night);
      scene.fog.color.lerp(NIGHT.fog, night * .9);
      sun.intensity *= 1 - night * .9; hemi.intensity *= 1 - night * .78;
      renderer.toneMappingExposure *= 1 - night * .2;
    }
    if (flash > 0) {
      skyUniforms.uTop.value.lerp(FLASH, flash * .8); skyUniforms.uHorizon.value.lerp(FLASH, flash * .9); scene.fog.color.lerp(FLASH, flash * .6);
      hemi.intensity += flash * 9; sun.intensity += flash * 5; renderer.toneMappingExposure *= 1 + flash * .9;   // v91 · lampo più forte: si vede tutta la pista
    }
    headlight.intensity = night * 55 + (w?.fog || 0) * night * 10; headlight.visible = night > .02;
    reflMat.opacity = Math.min(1, night * .9); ringMat.opacity = .55 + night * .4;
    const lamp = w?.lamp || 0;   // v97 · notturna con le frontali: buio pesto, la luce vera è quella sul casco
    if (lamp) {
      skyUniforms.uTop.value.set('#010205'); skyUniforms.uHorizon.value.set('#05070b'); skyUniforms.uSun.value.set('#010205'); skyUniforms.uCloud.value.set('#0a0c12'); skyUniforms.uClouds.value = .35;
      scene.fog.color.set('#020304'); scene.fog.near = 6; scene.fog.far = 62;
      sun.intensity *= .15; hemi.intensity *= .22;
      headlight.intensity = 14; reflMat.opacity = .28; ringMat.opacity = .35;
    }
    headLamp.visible = headLampGlow.visible = lamp > 0; headLamp.intensity = lamp * 120;
    for (const r of ridges) r.material.color.setScalar(lamp ? .07 : 1);   // v91 · di notte ostacoli e cerchi a terra si vedono
  }
  const NIGHT = { top: new T.Color('#05070d'), hor: new T.Color('#141a26'), fog: new T.Color('#0b0e14') }, FLASH = new T.Color('#dfe8ff');

  // ---------- Qualità adattiva: se il telefono fatica, alleggerisce ----------
  let frameAvg = 16, frames = 0, quality = 0, lastNow = performance.now(), goodFrames = 0;
  // v101 · il livello raggiunto resta salvato: i telefoni lenti partono già leggeri, senza scatti nei primi secondi; un livello in più (4) spegne le ombre
  const QKEY = 'edt-quality', saveQ = q => { try { localStorage.setItem(QKEY, String(q)); } catch {} };
  function stepQuality(q) {
    if (q === 1) { pixelRatio = Math.min(pixelRatio, 1.15); renderer.setPixelRatio(pixelRatio); resize(); }
    if (q === 2) { sun.shadow.mapSize.set(768, 768); sun.shadow.map?.dispose(); sun.shadow.map = null; tufts.visible = false; }
    if (q === 3) { pixelRatio = .85; renderer.setPixelRatio(pixelRatio); resize(); }
    if (q === 4) { pixelRatio = .75; renderer.setPixelRatio(pixelRatio); resize(); sun.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
  }
  function adaptQuality() {
    const now = performance.now(), dt = now - lastNow; lastNow = now;
    if (dt > 200) return;
    frameAvg += (dt - frameAvg) * .05; frames++;
    if (frames > 120 && frameAvg > 27 && quality < 4) { frames = 0; goodFrames = 0; quality++; stepQuality(quality); saveQ(quality); }
    if (quality > 0 && frameAvg < 18) { if (++goodFrames === 900) saveQ(quality - 1); } else goodFrames = 0;   // va liscio da un pezzo: la prossima volta si riparte un gradino più su
  }
  queueMicrotask(() => { let q = 0; try { q = Math.min(4, +localStorage.getItem(QKEY) || 0); } catch {} while (quality < q) stepQuality(++quality); });

  let leapFollow = 0, camLift = 0, camX = 0, lastRender = performance.now(), wasAir = false, shakeX = 0, shakeY = 0;

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
  let ambLastT = null, weatherNow = { rain: 0, fog: 0, dusk: 0 };
  function ambient(dt, t, W, live) {
    const move = ambLastT === null ? 0 : Math.max(0, Math.min(3, t - ambLastT)); ambLastT = t;
    const now = performance.now() / 1000;
    const leafAmt = iceMode ? 0 : Math.min(1, W[0] + W[1] * .35);
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
    rainMat.opacity = Math.min(.8, Math.max(W[1] * .75, weatherNow.rain * .8));
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
    moteMat.opacity = iceMode ? .95 : Math.min(.8, (W[2] + W[3]) * .85);
    moteMat.color.set(iceMode ? '#ffffff' : W[3] > W[2] ? '#e6d2a4' : '#fff3c4'); moteMat.size = iceMode ? .13 : .09;
    motes.visible = moteMat.opacity > .03;
    if (motes.visible) {
      md.forEach((d, i) => {
        d.z += move * .9; d.y += Math.sin(now * .9 + d.ph) * dt * .25 - (iceMode ? dt * 1.1 : 0); d.x += Math.cos(now * .7 + d.ph) * dt * .3;
        if (d.z > 6 || d.y < .05) { d.z = -26 - Math.random() * 10; d.x = (Math.random() - .5) * 22; d.y = .3 + Math.random() * 5; }
        motePos[i * 3] = d.x; motePos[i * 3 + 1] = d.y + height(d.z, t); motePos[i * 3 + 2] = d.z;
      });
      moteGeo.attributes.position.needsUpdate = true;
    }
  }

  function render(s) {
    curveA = [3.8, 4.9, 3.1][s.variant || 0]; curveF = [.021, .027, .016][s.variant || 0];
    const now = performance.now(), fdt = Math.min(.07, s.dt || (now - lastRender) / 1000); lastRender = now;
    adaptQuality();
    applyPreset(s.preset ?? 0);
    setPano(s.mode ?? 0);
    setIce(!!(PRESETS[s.preset ?? 0] || {}).ice);
    applyLivery(s.livery);
    setBikeModel(s.bikeId);
    applyCustom(s.bikeLook, s.parts, s.livery);
    syncBikeModel();
    paintDecal(s.riderName || 'EDT', s.riderNumber || 1, s.livery?.jersey || '#fcd326');
    skyUniforms.uTime.value = now / 1000;

    canyon = s.canyon || null;
    placeCanyon(s.roadTime * 19.5);
    const t = s.roadTime * 19.5;
    const live = s.state === 'playing' || s.state === 'paused' || s.state === 'countdown';
    const boostAmount = live ? (s.turbo || 0) : 0;
    trail = routeAt(s.elapsed || 0, t);
    ranchLook = !!s.ranch; curShape = ranchLook ? RANCH_SHAPE : s.ice ? null : trackShape(s.mode, s.variant || 0, GAME_LENGTH / (s.courseScale || .04)); forkF = s.fork || null; terrain(t); instances(t); muleScenery(t); vergeDetails(t); vineyard(t, !!s.vigne || ranchLook); astigiano(t, ranchLook);
    weatherNow = s.weather || weatherNow;
    applyWeather(s.weather, s.sight || 0);
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
    const pitchTarget = s.leapPitch !== undefined ? s.leapPitch : air + dyn.wheelie + crashPitch;   // v59 · in volo dal trampolino l'assetto lo decide il pilota
    dyn.pitchV += ((pitchTarget - dyn.pitch) * 95 - dyn.pitchV * 13) * fdt;
    dyn.pitch += dyn.pitchV * fdt;
    pitch.rotation.x = grade + dyn.pitch;
    const wheelieLift = s.jump <= 0 ? .82 * Math.sin(Math.max(0, dyn.pitch)) : 0;
    const noseDown = Math.max(0, -dyn.pitch) * .86;
    pitch.position.y = wheelieLift;

    // Piega e sterzo dalla velocità laterale; colpo di frusta (whip) in volo; sbandata nella caduta.
    // v105.3 · moto vera: il muso punta dove la moto sta andando (velocità laterale rispetto a quella in avanti),
    // la piega nasce dall'accelerazione laterale (come in curva) e oscilla su una molla, lo sterzo segue la rotazione del muso
    if (fdt > 0) { const fw = dyn.lastT !== undefined ? (t - dyn.lastT) / fdt : 20; if (fw > 0 && fw < 200) dyn.fwd += (Math.max(8, fw) - dyn.fwd) * Math.min(1, fdt * 3); }
    dyn.lastT = t;
    const latV = vx * spacing(), latA = fdt > 0 ? (latV - (dyn.lastLatV ?? latV)) / fdt : 0; dyn.lastLatV = latV;
    dyn.latA += (latA - dyn.latA) * Math.min(1, fdt * 9);
    const leanT = Math.max(-.5, Math.min(.5, -(latV * .06 + dyn.latA * .012)));
    dyn.leanV += ((leanT - dyn.leanR) * 70 - dyn.leanV * 11) * fdt; dyn.leanR += dyn.leanV * fdt;
    const lean = Math.max(-.55, Math.min(.55, dyn.leanR)) + whip * .35 + (crash > 0 ? Math.sin(crash * 25) * crash * .4 : 0);
    const velYaw = -Math.atan2(latV, dyn.fwd) * .85;
    dyn.steer += (Math.max(-.32, Math.min(.32, (velYaw - (dyn.prevVelYaw ?? velYaw)) / Math.max(fdt, .001) * .1 + velYaw * .25)) - dyn.steer) * Math.min(1, fdt * 12); dyn.prevVelYaw = velYaw;
    bike.position.set((s.px - 1) * spacing(), lift + .06 * Math.abs(trail.grade) + noseDown, 0);
    { const gy = height(0, t), air = Math.max(0, bike.position.y - gy); blob.visible = !s.leap || air < 6; blob.position.set(bike.position.x, gy + .035, .02); const k = 1 + air * .35; blob.scale.set(k, 1, k); blobMat.opacity = .5 / (1 + air * .9); }
    // v46 · sul ghiaccio la moto va di traverso (il posteriore scivola) e il pilota controsterza
    // v105.2 · curve vere: la moto punta dove va la pista pochi metri avanti (solo grafica: la posizione la decidi tu)
    bikeTurn += ((curShape && s.state === 'playing' && s.jump <= 0 ? -Math.atan((center(-4.6, t) - center(-3.4, t)) / 1.2) * .75 : 0) - bikeTurn) * Math.min(1, fdt * 5);
    dyn.yaw += (((s.ice ? -(s.drift || 0) * .85 : velYaw + bikeTurn)) - dyn.yaw) * Math.min(1, fdt * 10);
    // v94 · derapata vera: moto piegata dentro la curva (fino a ~40°), pilota più dritto della moto, gamba interna fuori
    const ranchLeanT = curShape && s.jump <= 0 && crash <= 0 ? Math.max(-.55, Math.min(.55, curShape.bend(t + 6) * .32)) : 0;   // v102.1 · Gusta Ranch: nei tornanti il pilota piega la moto dentro la curva, come su Ice Scrofy
    const iceLeanT = s.ice && s.jump <= 0 && crash <= 0 ? Math.max(-.7, Math.min(.7, dyn.yaw * .85)) : ranchLeanT;
    dyn.iceLean = (dyn.iceLean || 0) + (iceLeanT - (dyn.iceLean || 0)) * Math.min(1, fdt * 7);
    bike.rotation.z = lean + dyn.iceLean;
    bike.rotation.y = dyn.yaw + whip * .55;
    front.rotation.y = s.ice ? Math.max(-.55, Math.min(.55, (s.drift || 0) * .7)) : dyn.steer + (s.jump > 0 ? whip * -.3 : 0);
    const blink = Math.floor(s.invincible * 12) % 2 === 0;
    bike.visible = s.invincible <= 0 || crash > 0 || blink;

    // Postura: in piedi su salti, salitoni e mulattiera; ammortizza con le gambe all'atterraggio.
    const standTarget = crash > 0 ? 0 : s.jump > 0 ? 1 : (trail.rough > .4 || trail.climb > .4) ? .85 : s.gas ? .6 : boostAmount > 0 ? .45 : .12;
    dyn.stand += (standTarget - dyn.stand) * Math.min(1, fdt * 6);
    const bounce = crash > 0 ? Math.sin((1 - crash) * Math.PI) * .32 : 0;
    upper.position.set(lean * -.08, dyn.stand * .17 - Math.max(0, comp) * .9 + bounce, -dyn.stand * .07 - boostAmount * .015);
    body.rotation.x = -.08 - .3 * dyn.stand - grade * .2 - boostAmount * .05 - (s.gas ? .06 : 0) - dyn.pitch * .45 + crash * .5 + (s.wheelie ? .32 : 0);
    syncRiderModel(dyn.stand, Math.max(-.22, Math.min(.18, (body.rotation.x + .08 + .3 * dyn.stand) * .45)), Math.max(-.2, Math.min(.2, lean * .25 - dyn.iceLean * .2)));
    body.rotation.z = lean * .35 - dyn.iceLean * .45 - whip * .3 + (crash > 0 ? Math.sin(crash * 20) * crash * .3 : 0);
    head.rotation.y = dyn.steer * .9 + dyn.iceLean * .9;   // lo sguardo va verso l'uscita della curva
    { const inner = dyn.iceLean > 0 ? -1 : 1, deep = Math.min(1, Math.max(0, (Math.abs(dyn.iceLean) - .12) / .3));
      for (const j of limbs) {
        const tgt = s.ice && s.driftOn && s.jump <= 0 && j.side === inner ? deep : 0;
        j.out += (tgt - j.out) * Math.min(1, fdt * (tgt > j.out ? 9 : 6));
        j.legPivot.position.set(j.side * (.33 + .12 * j.out), 1.08 - .1 * j.out, .08 - .42 * j.out);
        j.legPivot.rotation.set(1.45 * j.out, 0, j.side * .55 * j.out);   // stivale avanti, verso la ruota davanti, e in fuori
      } }
    head.rotation.x = -(body.rotation.x + grade + dyn.pitch) * .55;
    dyn.brake = Math.max(0, (dyn.brake || 0) - fdt * 2.5);
    brakeLightMat.emissiveIntensity = Math.max(.3 + dyn.brake * 2.2, (weatherNow.dusk || 0) * 1.6 + (weatherNow.fog || 0) * 1.2);
    fordTex.offset.x = (now / 1000 * .22) % 1;   // v97 · la corrente del guado scorre
    const spin = t / .475;
    frontWheel.rotation.x = -spin;
    rearWheel.rotation.x = -spin - (boostAmount > 2.2 ? (now / 40) : 0);
    if (glbNow) { glbNow.wf.rotation.x = frontWheel.rotation.x * 1.23; glbNow.wr.rotation.x = rearWheel.rotation.x * 1.23; }
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
    renderRivals(s.rivals, t, now, s.state === 'playing');
    renderJeep(s.gev, t, now, s.state === 'playing');
    lampGlow.material.opacity = .45 + (weatherNow.dusk || 0) * .5 + (weatherNow.fog || 0) * .4;
    lampGlow.visible = lampOpt || (weatherNow.night || 0) > .1;   // v84 · di notte il faro è sempre acceso

    flame.visible = flameCore.visible = !electricNow && (boostAmount > 0 || (s.grappa || 0) > 0);
    flameMat.color.set(boostAmount > 0 ? '#ffb12b' : '#3fa9ff');
    if (flame.visible) { const f = .8 + Math.random() * .5; flame.scale.set(1, f, 1); flameCore.scale.set(1, f * .9, 1); }

    // Ostacoli
    const keep = new Set(s.objects);
    for (const [o, m] of obstacleMap) if (!keep.has(o)) { scene.remove(m); (pools[o.type] ||= []).push(m); obstacleMap.delete(o); }
    for (const o of s.objects) {
      let m = obstacleMap.get(o);
      if (!m) {
        m = makeObstacle(o.type); scene.add(m); obstacleMap.set(o, m);
        // v91 · catarifrangente: di notte ogni ostacolo ha un bagliore ambra che il faro fa risaltare
        if (OBSTACLE_HEIGHT[o.type] !== undefined && !m.userData.refl) { const r = new T.Sprite(reflMat); r.scale.set(1.5, .75, 1); r.position.y = Math.min(2.2, OBSTACLE_HEIGHT[o.type] + .3); r.name = 'fx'; m.add(r); m.userData.refl = r; }
      }
      if (o.type === 'mboard' && m.userData.m !== o.m + (o.rec ? 'r' : '')) m.userData.draw(o.m, o.rec);
      if (o.type === 'forkSplit' && m.userData.painted !== o.shortSide) { m.userData.painted = o.shortSide; m.userData.paint(o.shortSide); }
      const z = (o.z - .91) * 55;
      let lx = (o.l - 1) * spacing();
      if (o.type === 'coin' && s.magnet > 0 && o.z > .62 && !o.air) lx += ((s.px - 1) * spacing() - lx) * Math.min(1, (o.z - .62) / .29);
      if (o.type === 'bigLog' || o.type === 'ford' || o.type === 'pigpen' || o.type === 'bigRamp' || o.type === 'forkSplit') lx = 0;
      m.position.set(center(z, t) + lx, height(z, t) + (o.lift || 0), z);
      m.rotation.x = Math.atan(slope(z, t));
      if (m.userData.spin) {
        m.userData.spin.rotation.y = s.roadTime * (m.userData.still ? .6 : 3) + o.l;
        if (!m.userData.still) m.userData.spin.position.y = (o.type === 'coin' ? 1.1 : o.type === 'wine' ? .7 : o.type === 'grappa' ? .65 : 1.15) + Math.sin(s.roadTime * 6 + o.z * 20) * .06;
      }
      if (m.userData.roller) m.userData.roller.rotation.z = -o.z * 26;
      if (o.type === 'bigLog') { const len = spacing() * 2 + 2.2; m.userData.inner.scale.x = len; }
      if (o.type === 'ford' || o.type === 'pigpen') { m.userData.inner.scale.x = o.type === 'ford' ? spacing() * 2 + 30 : spacing() * 2 + 6.5;   // v97 · il torrente continua nel prato · v102 il porcile copre la pista
        m.rotation.x = 0; const h0 = height(z, t), pos = m.userData.fgeo.attributes.position;   // v101 · guado appoggiato sul terreno vero, anche su dossi e cunette
        for (let i = 0; i < pos.count; i++) pos.setY(i, height(z + pos.getZ(i), t) - h0 + .06);
        pos.needsUpdate = true; for (const [r, rz, ry] of m.userData.stones) { r.position.y = height(z + rz, t) - h0 + .05 + ry; if (r.userData.wake) r.userData.wake.position.y = r.position.y - ry + .05; } }
      if (o.type === 'pigpen' && m.userData.sludge !== !!o.sludge) { m.userData.sludge = !!o.sludge; for (const [r] of m.userData.stones) r.visible = !o.sludge; }   // v103 · ondata di fango della Fogna: senza maiali né staccionata
      if (m.userData.rotor) { m.userData.rotor.rotation.y = s.roadTime * 40; m.userData.heli.position.x = (o.z - .5) * 6; m.userData.heli.rotation.z = .12; m.userData.heli.position.y = 7.5 + Math.sin(s.roadTime * 2) * .3; }
      if (o.cross) m.rotation.y = o.cross > 0 ? 0 : Math.PI;
      else if (o.type === 'ibex' || o.type === 'chamois' || o.type === 'marmot') m.rotation.y = 0;
      if (o.lean !== undefined && o.type === 'tree') m.rotation.z = o.lean * .3;
      if (o.flyT) { m.rotation.z = o.fly * 9; m.rotation.y = o.fly * 5; }   // v57 · gli oggetti lanciati dalle GEV girano in aria
    }

    // Terra dalla ruota posteriore: più gas, più terra.
    const onGround = s.state === 'playing' && s.jump <= 0;
    const muddy = trail.wet > .3 || s.wet > 0;
    partMat.color.set(iceMode ? '#a9c4d8' : muddy ? '#5b4630' : trail.rough > .5 ? '#8f8f88' : '#9b7f56');
    updatePuffs(fdt);
    if (onGround && iceMode && s.driftOn && Math.abs(s.drift || 0) > .25) {
      puffAcc += fdt * (8 + Math.abs(s.drift) * 10);
      while (puffAcc > 1) { puffAcc--; const dir = -Math.sign(s.drift || 1);   // il posteriore esce dal lato opposto al muso
        puff(bike.position.x + dir * (.35 + Math.random() * .3), height(1, t) + .35, 1.05 + Math.random() * .3, dir * (1.6 + Math.random() * 1.4), .5 + Math.random() * .6, 2.5 + Math.random() * 2); }
    }
    if (onGround && iceMode && s.driftOn) {
      // ghiaccio grattato dai chiodi: spruzzo laterale bianco durante la derapata
      const n = 2 + Math.round(Math.abs(s.drift || 0) * 5);
      for (let i = 0; i < n * 2; i++) { const dir = -Math.sign(s.drift || 1); emit(bike.position.x + dir * (.45 + Math.random() * .3), .15, .95 + Math.random() * .2, dir * (3.5 + Math.random() * 4), 1.2 + Math.random() * 2.6, 3 + Math.random() * 4, .9 + Math.random() * .9); }   // v94 · scia di schegge di ghiaccio dalla ruota dietro
    }
    if (s.snowHit > .6) for (let i = 0; i < 6; i++) emit(bike.position.x + (Math.random() - .5), .4, (Math.random() - .5), (Math.random() - .5) * 7, 3 + Math.random() * 4, (Math.random() - .3) * 4, 1.5);
    if (onGround) {
      emitAcc += fdt * (30 + (s.gas ? 34 : 0) + boostAmount * 14) * (s.speed || 1) * (muddy ? 1.3 : 1);
      while (emitAcc > 1) {
        emitAcc--;
        const side = (Math.random() - .5) * .3;
        const roost = s.gas || boostAmount > 0 ? 1.35 : 1;
        emit(bike.position.x + side, .25, 1.15, side * 4 + (Math.random() - .5) * 1.6, (2.4 + Math.random() * 2.8) * roost, (5 + Math.random() * 4) * roost, (.7 + Math.random() * .9) * (muddy ? 1.25 : 1));
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
    trackMat.color.set(iceMode ? '#5f86a0' : '#3b2a1a');   // v89 · sul ghiaccio i segni dei chiodi sono grigio-azzurri e si vedono
    trackMat.opacity = iceMode ? .62 : trail.rough > .5 ? .14 : trail.wet > .3 ? .42 : .3;

    dustMaterial.color.set(iceMode ? '#f4fbff' : muddy ? '#9a8a74' : '#ceba8c');
    dust.visible = onGround;
    for (let i = 0; i < 24; i++) {
      const age = (s.roadTime * 1.7 + i / 24) % 1;
      dummy.position.set(bike.position.x + Math.sin(i * 23) * (.1 + age * .9), height(1 + age * 3.2, t) + .1 + age * .18, 1.25 + age * 3.4);
      dummy.quaternion.copy(camera.quaternion); dummy.rotateZ(i * 1.7); const sz = age < .07 ? 0 : (.1 + age * .6) * (1 - age * age * .7); dummy.scale.set(sz * 1.5, sz * .7, sz); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix);   // v80 · polvere bassa e schiacciata, non più bolle
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
      if (s.fxKind === 'snow') for (let i = 0; i < 30; i++) emit(bike.position.x + (Math.random() - .5), .3, (Math.random() - .5), (Math.random() - .5) * 8, 3 + Math.random() * 5, (Math.random() - .2) * 4, 1.6);
      sparkMaterial.color.set(s.fxKind === 'snow' ? '#e8f8ff' : s.fxKind === 'hit' ? '#ff5a39' : s.fxKind === 'splash' ? '#93d9e4' : s.fxKind === 'power' ? '#7dffc4' : s.fxKind === 'jump' ? '#ffffff' : '#ffe04b');
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
    finish.visible = remain < 5 && !ranchLook;
    ranchFinish.visible = remain < 5 && ranchLook;
    if (ranchFinish.visible) { ranchFinish.position.copy(finish.position); ranchFinish.rotation.copy(finish.rotation); const k = now / 1000;
      for (const f of flames) { if (f.userData.bob !== undefined) f.position.y = Math.max(0, Math.sin(k * 7 + f.userData.bob * 1.3)) * .25; else if (f.isSprite && f.material.color.r < .9) { f.position.y += .01; if (f.position.y > 4) f.position.y = 1.6; } else f.scale.y = .85 + Math.sin(k * 13 + f.position.x * 40) * .18; } }   // v102 · fiamme che ballano, fumo che sale, gruppo che salta

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
    // v51 · in salita sul telefono in orizzontale la camera resta bassa e guarda più su: si vede la strada che arriva
    camera.position.set(camX + .55 * trail.rough + shakeX, camY + airborne * .3 + trail.climb * (portrait ? .2 : short ? .25 : 1.2) + shakeY, camZ + trail.climb * (short ? .6 : 1.3) - boostAmount * .15);
    camLift += (Math.max(0, lift - 1.1) * .8 - camLift) * .12;
    leapFollow += ((s.leapCam ? lift * .9 : 0) - leapFollow) * .15; if (leapFollow > .01) { camera.position.y += leapFollow; camera.position.z += leapFollow * .55; }   // v86 · in volo la camera si allarga: si vede il vuoto
    // v105.2 · in curva la camera guarda dove va la pista (come seguire la moto da dietro) e si sposta un filo verso l'esterno
    camTurn += ((curShape && s.state !== 'menu' ? center(-12, t) * .8 : 0) - camTurn) * Math.min(1, fdt * 3);
    camera.position.x -= camTurn * .18;
    camera.lookAt(bike.position.x * (portrait ? .4 : .16) + camTurn, lookY + leapFollow * .55 + camLift + Math.max(0, trail.grade) * (portrait ? 1.3 : short ? 1.5 : .6) + Math.min(0, trail.grade) * 2.0 + trail.climb * (portrait ? .7 : short ? .45 : .1), lookZ);
    camera.rotateZ(bike.rotation.z * .06);
    camRoll += ((curShape && s.state === 'playing' ? Math.max(-.06, Math.min(.06, curShape.bend(t + 18) * .035)) : 0) - camRoll) * .04; camera.rotateZ(camRoll);   // v104 · nelle curve dei tracciati veri la camera si inclina con la pista
    if (s.ice) camera.rotateZ(-(s.drift || 0) * .045);   // v49 · la camera segue un filo la derapata
    sky.position.copy(camera.position);
    ridges[1].visible = !pano.visible;   // v62 · la cresta vicina copriva il fondale con una sagoma piatta grigia: col panorama resta solo il fondale
    if (pano.visible) {   // v61 · il fondale segue la camera; si attenua con nebbia e pioggia
      pano.position.set(camera.position.x, camera.position.y - 14 + PANO_H * .1, camera.position.z);
      panoMat.opacity += ((1 - (weatherNow.fog || 0) * .7 - (weatherNow.rain || 0) * .25) - panoMat.opacity) * .05;
      panoMat.color.setScalar(Math.min(1.25, (1 - (weatherNow.dusk || 0) * .35 - (weatherNow.rain || 0) * .2) * (1 - (weatherNow.night || 0) * .62) * (1 - (weatherNow.lamp || 0) * .88) + (weatherNow.flash || 0) * .9));   // v84 · di notte il fondale si spegne, col lampo si accende
    }
    sun.target.position.set(bike.position.x, 0, -6);
    const L = PRESETS[presetIndex] || PRESETS[0];
    sun.position.set(bike.position.x - 12, 24, 3).add(new T.Vector3(L.sunDir[0] * 6, 0, 0));
    renderer.render(scene, camera);
  }

  resize();
  return { resize, render, renderer, scene, camera, bike, presets: PRESETS, makePreview, setGustaFace };
}
