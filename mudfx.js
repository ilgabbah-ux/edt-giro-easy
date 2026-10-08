// EDT Giro Easy · v28
// Fango sull'obiettivo: schizzi irregolari, goccioline e colature che scendono
// e coprono davvero la visuale per qualche secondo, poi si asciugano.

const COLORS = [['#2f2113', '#5b4129', '#7a5a37'], ['#33240f', '#634722', '#8a6a3d'], ['#2a1d12', '#4f3a26', '#6d5236']];

function rnd(a, b) { return a + Math.random() * (b - a); }

// Disegna una volta sola lo schizzo su un canvas fuori schermo.
function makeSplat(r) {
  const pad = r * 2.4, size = Math.ceil(pad * 2);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), cx = size / 2, cy = size / 2;
  const [dark, mid, light] = COLORS[Math.floor(Math.random() * COLORS.length)];
  // Contorno irregolare, smussato.
  const n = 30, pts = [];
  let prev = 1;
  for (let i = 0; i < n; i++) { prev = prev * .55 + rnd(.62, 1.22) * .45; pts.push(prev); }
  const shape = (scale) => {
    x.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, k = pts[i % n] * r * scale;
      const px = cx + Math.cos(a) * k, py = cy + Math.sin(a) * k * .92;
      if (i === 0) x.moveTo(px, py); else {
        const a0 = (i - .5) / n * Math.PI * 2, k0 = (pts[i % n] + pts[(i - 1) % n]) / 2 * r * scale * 1.04;
        x.quadraticCurveTo(cx + Math.cos(a0) * k0, cy + Math.sin(a0) * k0 * .92, px, py);
      }
    }
    x.closePath();
  };
  // Goccioline e strisce intorno.
  const drops = Math.round(rnd(7, 16));
  for (let i = 0; i < drops; i++) {
    const a = rnd(0, Math.PI * 2), d = r * rnd(1.05, 2.15), dr = r * rnd(.04, .17);
    x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(a);
    x.fillStyle = Math.random() < .5 ? mid : dark; x.globalAlpha = rnd(.75, .95);
    x.beginPath(); x.ellipse(0, 0, dr * rnd(1, 2.4), dr, 0, 0, Math.PI * 2); x.fill();
    if (Math.random() < .45) { x.beginPath(); x.ellipse(-dr * 2.6, 0, dr * 1.4, dr * .45, 0, 0, Math.PI * 2); x.fill(); }
    x.restore();
  }
  x.globalAlpha = 1;
  // Corpo dello schizzo.
  shape(1);
  const g = x.createRadialGradient(cx - r * .2, cy - r * .25, r * .1, cx, cy, r * 1.15);
  g.addColorStop(0, light); g.addColorStop(.45, mid); g.addColorStop(1, dark);
  x.fillStyle = g; x.globalAlpha = .96; x.fill();
  x.lineWidth = Math.max(1.5, r * .04); x.strokeStyle = 'rgba(20,12,6,.55)'; x.stroke();
  // Grumi e sabbia.
  x.globalAlpha = .5;
  for (let i = 0; i < r * .9; i++) {
    const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * r * .85;
    x.fillStyle = Math.random() < .5 ? light : dark;
    x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd(.6, 2.2) * Math.max(1, r / 60), 0, Math.PI * 2); x.fill();
  }
  // Riflessi bagnati.
  x.globalAlpha = .28; x.fillStyle = '#fff6e0';
  for (let i = 0; i < 3; i++) {
    x.beginPath(); x.ellipse(cx + rnd(-.45, .2) * r, cy + rnd(-.5, .1) * r, r * rnd(.08, .2), r * rnd(.03, .07), rnd(-.8, -.3), 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  return { canvas: c, half: size / 2, color: mid, dark };
}

export function createMud(host) {
  const cv = document.createElement('canvas');
  cv.className = 'mudfx';
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1, splats = [], film = 0, dirty = false;

  function resize() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    dirty = true;
  }
  resize();
  window.addEventListener('resize', resize);

  // intensity 1 = pozzanghera presa in pieno; .35 = spruzzo leggero.
  function splash(intensity = 1) {
    if (!w || cv.width < 2) resize();
    const m = Math.min(w, h), count = Math.round((5 + Math.random() * 4) * intensity + 1);
    for (let i = 0; i < count; i++) {
      const big = i < 2 * intensity;
      const r = m * (big ? rnd(.11, .19) : rnd(.035, .09)) * (.7 + intensity * .3);
      // Il fango arriva dalla ruota davanti: più in basso e verso il centro.
      const x = w * (.5 + (Math.random() - .5) * (big ? .7 : 1.05));
      const y = h * (big ? rnd(.32, .82) : rnd(.08, .95));
      const s = makeSplat(r);
      const drips = [];
      const nd = Math.random() < .75 ? Math.floor(rnd(1, 3.5)) : 0;
      for (let k = 0; k < nd; k++) drips.push({ dx: rnd(-.55, .55) * r, wd: r * rnd(.07, .15), len: 0, max: r * rnd(.8, 2.4), sp: r * rnd(.25, .7), wob: rnd(0, 6) });
      splats.push({ ...s, x, y, r, t: -i * .025, life: rnd(4.2, 6) * (.7 + intensity * .3), drips });
    }
    film = Math.min(.42, film + .3 * intensity);
    if (splats.length > 40) splats.splice(0, splats.length - 40);
    dirty = true;
  }

  function update(dt) {
    if (!splats.length && film <= 0) { if (dirty) { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; } return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    film = Math.max(0, film - dt * .07);
    if (film > 0) {
      const g = ctx.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .15, w / 2, h * .55, Math.max(w, h) * .75);
      g.addColorStop(0, `rgba(74,52,30,${film * .55})`); g.addColorStop(1, `rgba(52,36,20,${film})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    for (const s of splats) {
      s.t += dt;
      if (s.t < 0) continue;
      const left = s.life - s.t;
      const alpha = Math.max(0, Math.min(1, left / 1.4));
      const pop = Math.min(1, .45 + s.t / .1 * .55);
      ctx.globalAlpha = alpha;
      // Colature: scendono piano, con una goccia in fondo.
      for (const d of s.drips) {
        d.len = Math.min(d.max, d.len + d.sp * dt * (1 - d.len / d.max * .6));
        const x0 = s.x + d.dx + Math.sin(s.t * 1.3 + d.wob) * d.wd * .3, y0 = s.y;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.moveTo(x0 - d.wd / 2, y0); ctx.lineTo(x0 + d.wd / 2, y0);
        ctx.lineTo(x0 + d.wd * .32, y0 + s.r * .6 + d.len); ctx.lineTo(x0 - d.wd * .32, y0 + s.r * .6 + d.len); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x0, y0 + s.r * .6 + d.len, d.wd * .55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,215,.22)'; ctx.fillRect(x0 - d.wd * .18, y0 + s.r * .5, d.wd * .12, d.len * .8);
      }
      const sz = s.half * 2 * pop;
      ctx.drawImage(s.canvas, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    splats = splats.filter(s => s.t < s.life);
    dirty = true;
  }

  function clear() { splats = []; film = 0; dirty = true; update(0); }
  return { splash, update, clear, get active() { return splats.length > 0; } };
}
