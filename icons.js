// EDT Giro Easy · v28
// Icone vettoriali disegnate per il gioco (al posto delle emoji, che cambiano aspetto su ogni telefono).
// Tracciato 24×24: linee = contorno, classe "f" = parti piene.

const P = {
  beer: '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 10.5h2a2.5 2.5 0 0 1 2.5 2.5v1.5A2.5 2.5 0 0 1 17 17h-2"/><path class="f" d="M4.3 8.6c-.6-2.3 1.2-3.9 3-3.3.6-1.6 3-2.1 4.3-.8 1.4-1 3.9-.2 3.9 2 .6.6.5 1.6 0 2.1z"/><path d="M8.5 12v5.5M11.5 12v5.5"/>',
  wine: '<path d="M7.5 3h9l-.6 5.5a3.9 3.9 0 0 1-7.8 0z"/><path class="f" d="M8.3 7.2h7.4l-.2 1.4a3.5 3.5 0 0 1-7 0z"/><path d="M12 12.4V20M8.5 21h7"/>',
  flame: '<path d="M12 2.5c.8 3.4 5.6 5.4 5.6 11a5.6 5.6 0 0 1-11.2 0c0-3 1.7-4.5 2.4-6.6 1.2 1.2 1.7 2.6 1.6 4 1.6-1.9 2-4.6 1.6-8.4z"/><path class="f" d="M12 21a2.6 2.6 0 0 1-2.6-2.7c0-1.6 1.3-2.4 1.8-3.8.9.9 3.4 2 3.4 3.8A2.6 2.6 0 0 1 12 21z"/>',
  drop: '<path d="M12 2.8c3.3 4.7 6.3 8 6.3 11.4a6.3 6.3 0 0 1-12.6 0c0-3.4 3-6.7 6.3-11.4z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
  water: '<path d="M10 2.5h4v2.8l1.6 2.2v12.3A1.7 1.7 0 0 1 13.9 21.5h-3.8a1.7 1.7 0 0 1-1.7-1.7V7.5L10 5.3z"/><path class="f" d="M8.6 11h6.8v4.6H8.6z"/>',
  nowater: '<path d="M10 2.5h4v2.8l1.6 2.2v12.3A1.7 1.7 0 0 1 13.9 21.5h-3.8a1.7 1.7 0 0 1-1.7-1.7V7.5L10 5.3z"/><path d="M4 4l16 16"/>',
  rabbit: '<path d="M9.3 9.6C7.4 6.6 7.3 2.4 8.9 2.2c1.7-.2 2.4 3.8 2 7.3M14.7 9.6c1.9-3 2-7.2.4-7.4-1.7-.2-2.4 3.8-2 7.3"/><circle cx="12" cy="15.3" r="5.8"/><path class="f" d="M9.6 14.4a.9.9 0 1 0 0 .01zM14.4 14.4a.9.9 0 1 0 0 .01zM11 17h2l-1 1z"/>',
  wrench: '<path d="M14.6 6.1a4.4 4.4 0 0 0-5.7 5.6L2.8 17.8a1.9 1.9 0 0 0 2.7 2.7l6.1-6.1a4.4 4.4 0 0 0 5.6-5.7l-2.6 2.6-2.5-.6-.6-2.5z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"/><circle cx="12" cy="12" r="6.6"/>',
  shock: '<path d="M12 2v3M12 19v3"/><rect x="9.3" y="5" width="5.4" height="3" rx="1"/><rect x="9.3" y="16" width="5.4" height="3" rx="1"/><path d="M8 9.5l8 1.5-8 1.5 8 1.5-8 1.5"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12"/><path class="f" d="M6 5.5h6v4H6z"/><path d="M14 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8.5L18.5 6"/>',
  tyre: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/>',
  helmet: '<path d="M3 15.5a9 9 0 0 1 17.6-2.6L21 16h-8.3l-2 4.5H5a2 2 0 0 1-2-2z"/><path d="M12.7 16H21v1.4a2.6 2.6 0 0 1-2.6 2.6h-7.6"/><path d="M6.5 8.3c3-2.2 7.3-2.2 10 .2"/>',
  helmetplus: '<path d="M3 15.5a9 9 0 0 1 17.6-2.6L21 16h-8.3l-2 4.5H5a2 2 0 0 1-2-2z"/><path d="M12.7 16H21v1.4a2.6 2.6 0 0 1-2.6 2.6h-7.6"/><path d="M9 7.5v5M6.5 10h5"/>',
  gift: '<rect x="3" y="8" width="18" height="4.2" rx="1"/><path d="M5 12.2V21h14v-8.8M12 8v13"/><path d="M12 8C10.4 4.4 6.5 4 6.5 6.3 6.5 8 9.3 8 12 8c2.7 0 5.5 0 5.5-1.7C17.5 4 13.6 4.4 12 8z"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.8"/><path d="M12 13.5V9.2M9.8 2.5h4.4M12 2.5v3.2M18.6 6.4 20 5"/>',
  ghost: '<path d="M5.5 21V10.5a6.5 6.5 0 0 1 13 0V21l-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6-2.1-1.6z"/><path class="f" d="M9.7 10.6a1.2 1.2 0 1 0 0 .01zM14.3 10.6a1.2 1.2 0 1 0 0 .01z"/>',
  bolt: '<path class="f" d="M13.6 2 4.8 13.6h6.4L10.3 22l8.9-11.7h-6.5z"/>',
  speaker: '<path class="f" d="M3.5 9h4l5-4.2v14.4l-5-4.2h-4z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2"/>',
  mute: '<path class="f" d="M3.5 9h4l5-4.2v14.4l-5-4.2h-4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  wheelie: '<circle cx="6" cy="17.5" r="3.5"/><circle cx="17.6" cy="9.4" r="3.5"/><path d="M6 17.5l4.6-3.4h3.6l3.4-4.7M13 10.3l2.6-2.4h1.8M9.6 14.1 8.6 10.6l3.6-1.8"/><path class="f" d="M11.4 5.4a1.6 1.6 0 1 0 0 .01z"/>',
  rock: '<path d="M2.5 19.5 5.6 11l4.2-3.6 5.1 1.1 3.4 4 3.2 7z"/><path d="M9.8 7.4 11 13l3.3 2.2M11 13l-3.4 2.3"/>',
  mountain: '<path d="M2 20 9.2 7.5l4 6.4 2.8-3.8L22 20z"/><path class="f" d="M9.2 7.5 7.1 11.2l1.5-.7.9 1 1.4-1.1z"/>',
  downhill: '<path d="M3 5.5 21 18.5H3z"/><path d="M9 4.5l6 4.3M13 5.8l2 3-3.6.4"/>',
  target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><path class="f" d="M12 10.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z"/>',
  star: '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  spring: '<path d="M4 20h16M7 16.5h10M8.5 13h7M7 9.5h10M8.5 6h7"/><path d="M12 2.5v3.5"/>',
  scrub: '<path d="M4 17c3-.6 4.7-4.8 8-4.8s3.6 3 6.2 1.8C21 12.7 20 8 17 7"/><path d="M14.5 5.2 17 7l-2 2.4"/>',
  eye: '<path d="M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.1"/>',
  wave: '<path d="M2.5 9c2.4 0 2.4-2 4.8-2s2.4 2 4.7 2 2.4-2 4.7-2 2.4 2 4.8 2M2.5 15c2.4 0 2.4-2 4.8-2s2.4 2 4.7 2 2.4-2 4.7-2 2.4 2 4.8 2"/>',
  rocket: '<path d="M12 2.5c3.6 2.3 5.2 6 4.6 11.2H7.4C6.8 8.5 8.4 4.8 12 2.5z"/><path d="M7.4 13.7 4.5 17l3.6.2M16.6 13.7l2.9 3.3-3.6.2"/><circle cx="12" cy="8.6" r="1.6"/><path class="f" d="M10 15.2h4l-.6 3.4-1.4 2.9-1.4-2.9z"/>',
  radar: '<path d="M12 21a1.4 1.4 0 1 0 0-.01z"/><path d="M8.6 16.6a4.8 4.8 0 0 1 6.8 0M5.6 13.6a9 9 0 0 1 12.8 0M2.6 10.6a13.2 13.2 0 0 1 18.8 0"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  play: '<path class="f" d="M7 4.5v15l12-7.5z"/>',
  flag: '<path d="M5 21.5V3"/><path d="M5 4h14v9H5"/><path class="f" d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z"/>',
  trophy: '<path d="M7 3.5h10v5.3a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.2a3.3 3.3 0 0 0 3.3 4.4M17 5.5h2.8a3.3 3.3 0 0 1-3.3 4.4M12 13.8v3.7M8 21h8M9.2 17.5h5.6v3.5H9.2z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  share: '<path d="M4 12.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6.5M12 3.5v12M7.3 8 12 3.5 16.7 8"/>',
  chevrons: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
  log: '<rect x="2.5" y="8.5" width="16.5" height="8" rx="4"/><ellipse cx="19" cy="12.5" rx="2.5" ry="4"/><path d="M6.5 11h6M8.5 14h6"/>',
  pad: '<path d="M7 8h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.4a2.5 2.5 0 0 1-4.3.9L14.5 16h-5L8 18.1a2.5 2.5 0 0 1-4.3-.9l-1-3.4A4.5 4.5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><path class="f" d="M15.5 11.3a.9.9 0 1 0 0 .01zM17.5 13.3a.9.9 0 1 0 0 .01z"/>',
  mouse: '<rect x="6" y="2.5" width="12" height="19" rx="6"/><path d="M12 6.5v3.5"/>',
  pin: '<path d="M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10.5" r="2.4"/>',
};

export function icon(name, cls = '') {
  const d = P[name];
  return d ? `<svg class="ic ic-${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>` : '';
}

// Emoji → icona del gioco.
const MAP = {
  '🍺': 'beer', '🍷': 'wine', '🔥': 'flame', '💧': 'water', '🐰': 'rabbit', '🔧': 'wrench', '🎁': 'gift', '⏱': 'stopwatch',
  '👻': 'ghost', '⚡': 'bolt', '🔊': 'speaker', '🤠': 'wheelie', '🪨': 'rock', '⛰': 'mountain', '🎯': 'target', '🦘': 'spring',
  '🐸': 'wave', '🌀': 'scrub', '🦁': 'helmetplus', '⬇': 'downhill', '🦊': 'eye', '🧓': 'stopwatch', '🚱': 'nowater', '🚀': 'rocket',
  '✴': 'star', '⚙': 'gear', '🪝': 'shock', '⛽': 'fuel', '🛞': 'tyre', '⛑': 'helmet', '👃': 'radar', '🔒': 'lock', '✔': 'check', '▶': 'play', '🏁': 'flag', '🏆': 'trophy', '🪵': 'log', '🎮': 'pad', '🖱': 'mouse',
};
const RE = new RegExp('(' + Object.keys(MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\uFE0F?', 'gu');
export function iconize(html) { return String(html).replace(RE, (m, e) => icon(MAP[e])); }
export function iconName(emoji) { return MAP[String(emoji).replace('️', '')] || ''; }

// Sostituisce le emoji dentro un elemento già costruito (testi interni del gioco).
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function iconizeEl(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) { RE.lastIndex = 0; if (RE.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode); }
  for (const n of nodes) {
    const span = document.createElement('span');
    span.className = 'icx';
    span.innerHTML = iconize(esc(n.nodeValue));
    n.replaceWith(span);
  }
}
