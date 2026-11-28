// Giro Easy · pista vera in 3D (versione parallela) · geometria della pista, senza grafica: la usano sia la fisica sia il disegno
// Percorso da enduro: tratti larghi e veloci, salita, pietraia, discesa, guado, fango con le pozze, mulattiera a tornanti, single track nel bosco.
export const DS = 2;           // passo dei punti della linea di mezzeria (m)
export const FS = .25;         // passo del profilo del fondo (m)
// tipi di tratto: larghezza del sentiero, terreno ai lati, aderenza, attrito, quanto è sconnesso, immagine del fondo
export const KIND = {
  v: { name: 'veloce', w: 10, side: 26, grip: 1.12, drag: 0, rough: 0, tex: 'trail', tape: 1 },
  s: { name: 'salita', w: 6.5, side: 22, grip: 1.05, drag: 0, rough: .012, tex: 'trail', tape: 1 },
  d: { name: 'discesa', w: 6.5, side: 22, grip: 1.0, drag: 0, rough: .014, tex: 'trail', tape: 1 },
  p: { name: 'pietraia', w: 5.4, side: 20, grip: .78, drag: .72, rough: .115, tex: 'rock', tape: 0 },
  g: { name: 'guado', w: 7, side: 20, grip: .8, drag: 0, rough: .01, tex: 'rock', tape: 0 },
  f: { name: 'fango', w: 7, side: 22, grip: .68, drag: 1.3, rough: .015, tex: 'mud', tape: 1 },
  m: { name: 'mulattiera', w: 5.2, side: 7.5, grip: 1.0, drag: .15, rough: .05, tex: 'cobble', tape: 0 },
  i: { name: 'ghiaccio', w: 9, side: 3.2, grip: .85, drag: 0, rough: .006, tex: 'ice', tape: 0 },   /* Ice Scrofy: neve battuta e ghiaccio, gomme chiodate. Tiene poco: si gira di traverso */
  r: { name: 'risaia', w: 6.5, side: 7, grip: 1.05, drag: 0, rough: .01, tex: 'trail', tape: 0 },   /* Leventino: l'argine di terra battuta tra due camere di risaia allagate */
  j: { name: 'ghiaccio vivo', w: 7, side: 3.4, grip: .55, drag: 0, rough: .004, tex: 'ice', tape: 1 },   /* Christmas Madness: lastre di ghiaccio senza chiodi, si va dritti e piano */
  q: { name: 'ranch', w: 7, side: 3.4, grip: 1.0, drag: .12, rough: .014, tex: 'mud', tape: 1 },   /* Gusta Ranch: anello di terra smossa e fango in mezzo al prato */
  u: { name: 'duna', w: 13, side: 3.4, grip: .8, drag: .55, rough: .008, tex: 'sand', tape: 0 },   /* Desertone: sabbia molle delle dune, la moto galleggia solo col gas aperto */
  h: { name: 'sabbia molle', w: 9.5, side: 3.4, grip: .78, drag: .75, rough: .006, tex: 'sand', tape: 0 },   /* Desertone: chiazze di sabbia molle in mezzo alla pista battuta. Larghe come la pista, ma la moto ci affonda: si passano col gas aperto */
  k: { name: 'pista sabbiosa', w: 9.5, side: 3.4, grip: .92, drag: .16, rough: .012, tex: 'sand', tape: 0 },   /* Desertone: la pista battuta tra una duna e l'altra */
  e: { name: 'mulattiera esposta', w: 3.0, side: 9, grip: 1.0, drag: .15, rough: .05, tex: 'cobble', tape: 0 },   /* Angelo Potter: mulattiera stretta scavata nel fianco della montagna, da una parte la roccia e dall'altra il vuoto */
  z: { name: 'pietraia esposta', w: 3.0, side: 9, grip: .8, drag: .42, rough: .11, tex: 'rock', tape: 0 },   /* Angelo Potter: tratti di sassi smossi sulla mulattiera, la moto scalcia verso il vuoto */
  a: { name: 'punto di Angelo', w: 2.3, side: 9, grip: 1.0, drag: .15, rough: .04, tex: 'cobble', tape: 0 },   /* il passaggio piu stretto, col masso sotto */
  b: { name: 'macchia', w: 3.2, side: 12, grip: .98, drag: .15, rough: .02, tex: 'forest', tape: 0 },
  t: { name: 'single track', w: 2.6, side: 13, grip: 1.38, drag: 0, rough: .018, tex: 'forest', tape: 0 },
};
// [lunghezza m, raggio m (+ destra, − sinistra, 0 = dritto), pendenza %, tipo]
export const GIRO_EASY = [
  [80, 0, 0, 'v'], [90, 80, 1, 'v'], [60, 0, 2, 'v'], [100, -70, 2, 'v'], [70, 0, -1, 'v'], [80, 60, -2, 'v'],
  [50, 0, 16, 's'], [32, -20, 24, 's'], [52, 0, 30, 's'], [33, 22, 24, 's'], [40, 0, 12, 's'],
  [70, 0, 1, 'p'], [50, -40, 0, 'p'],
  [50, 0, -13, 'd'], [31, 24, -19, 'd'], [37, -22, -17, 'd'], [22, 0, -12, 'd'], [40, 0, -8, 'd'],
  [26, 0, 0, 'g'], [40, 60, 1, 'f'], [50, 0, 0, 'f'],
  [35, 0, 10, 'm'], [31, -17, 14, 'm'], [35, 0, 15, 'm'], [31, 17, 14, 'm'], [35, 0, 12, 'm'], [28, -18, 9, 'm'], [30, 0, 5, 'm'],
  [40, 0, 2, 't'], [23, 15, 0, 't'], [23, -14, -2, 't'], [12, 0, -1, 't'], [35, 22, -3, 't'], [30, -20, -2, 't'], [40, 25, 0, 't'], [30, -22, -3, 't'], [40, 0, -4, 't'],
  [40, 0, -1, 'b'], [45, 30, 0, 'b'], [40, -28, 0, 'b'], [35, 0, 0, 'b'],
  [60, 0, -2, 'v'], [90, -75, -1, 'v'], [110, 0, 0, 'v'],
];
// BIVI del Giro Easy: il sentiero si allarga e in mezzo c'è una fila di sassi. A sinistra la CONIGLIERA (molle, lenta, zero rischi), a destra la EASY (tronchi e sassi, ma veloce e con le birre)
export const GIRO_EXTRA = { forks: [[262, 412, 15, 9], [1822, 1962, 8, 18]], logs: [1370, 1420, 1540, 1590] };   // da, a, quanto si allontana la conigliera (a sinistra), quanto la Easy (a destra)
// TAPPA 2 · SALITA INFAME: dal fondovalle su per il muro coi gradoni, pietraia in salita, i tornanti della mulattiera, la cresta in single track, poi giù a rotta di collo fino al guado e alla volata
export const SALITA_INFAME = [   // si sale quasi sempre: 1,2 km di salita vera, col muro al 40%
  [70, 0, 3, 'v'], [80, -70, 7, 'v'], [70, 0, 10, 'v'], [60, 55, 12, 'v'],
  [50, 0, 20, 's'], [36, 18, 30, 's'], [80, 0, 40, 's'], [36, -18, 33, 's'], [55, 0, 24, 's'],
  [60, 0, 14, 'p'], [45, 35, 16, 'p'], [50, 0, 12, 'p'],
  [32, 0, 17, 'm'], [28, 16, 20, 'm'], [30, 0, 22, 'm'], [28, -16, 20, 'm'], [30, 0, 19, 'm'], [28, 17, 18, 'm'], [30, 0, 16, 'm'], [27, -17, 13, 'm'], [30, 0, 9, 'm'],
  [50, 0, 6, 't'], [25, -16, 5, 't'], [25, 15, 4, 't'], [30, -20, 4, 't'], [35, 24, 2, 't'], [40, 0, 0, 't'],
  [60, 0, 0, 'v'], [70, 80, -1, 'v'],
  [45, 0, -16, 'd'], [30, -20, -22, 'd'], [40, 22, -20, 'd'], [28, -18, -23, 'd'], [36, 20, -19, 'd'], [40, 0, -14, 'd'],
  [50, 0, -6, 'b'], [40, 26, -5, 'b'], [40, -24, -4, 'b'], [35, 0, -3, 'b'],
  [28, 0, 0, 'g'], [45, -50, 0, 'f'], [55, 0, 1, 'f'], [26, 0, 0, 'g'],
  [40, 0, -8, 'd'], [30, 22, -12, 'd'], [35, 0, -9, 'd'],
  [70, 0, -2, 'v'], [90, -70, -1, 'v'], [120, 0, 0, 'v'],
];
export const SALITA_EXTRA = { forks: [[100, 240, 10, 15], [2010, 2150, 19, 8]], logs: [985, 1030, 1110, 1150] };
// LEVENTINO · Sostegno (Biella). Ricavato dalla traccia vera del Leventino 2025 (77 km, GPX di Wikiloc) ristretta a 2,7 km: stesso ordine e stesse proporzioni di salite e pianura.
// Partenza dal paese, giù al torrente, prima salita sulle Terre Rosse (612 m veri) con la mulattiera degli Alpini, giù, le risaie del fondovalle con gli argini a gomito, la collina di mezzo, altre risaie, la seconda salita (624 m veri) e l'arrivo.
export const LEVENTINO = [[60,0,2,'v'],[45,60,3,'v'],[50,-70,-9,'d'],[45,0,-10,'b'],[36,40,-11,'b'],[22,0,0,'g'],
  [40,0,14,'s'],[28,18,22,'s'],[45,0,28,'s'],[26,0,18,'m'],[27,-17,20,'m'],[26,0,20,'m'],[27,17,14,'m'],
  [30,0,2,'t'],[24,-16,0,'t'],[24,15,-1,'t'],[26,0,-1,'t'],
  [35,0,-20,'d'],[28,22,-25,'d'],[40,0,-27,'d'],[28,-20,-20,'d'],[20,0,-8,'d'],
  [50,0,-3,'v'],[60,90,-4,'v'],[45,0,-3,'p'],[36,45,-5,'p'],[40,0,-12,'d'],[36,-30,-9,'d'],[30,0,-3,'v'],
  [70,0,0,'r'],[22,14,0,'r'],[44,0,0,'r'],[22,-14,0,'r'],[56,0,0,'f'],[22,14,0,'r'],[36,0,0,'r'],[22,0,0,'g'],[70,0,0,'r'],
  [34,0,12,'s'],[34,-40,-9,'d'],
  [44,0,22,'s'],[28,18,24,'m'],[32,0,22,'m'],[24,0,2,'t'],[36,0,-22,'d'],[28,-20,-24,'d'],[36,0,-18,'d'],[36,0,-10.5,'d'],
  [60,0,0,'r'],[22,14,0,'r'],[50,0,0,'f'],[62,0,0,'r'],
  [50,0,4,'v'],[70,70,5,'v'],[40,0,6,'v'],
  [40,0,14,'s'],[34,20,24,'s'],[60,0,30,'s'],[34,-18,22,'s'],[36,0,6,'p'],[36,0,2,'p'],[30,0,0,'t'],[24,-15,0,'t'],[24,15,-2,'t'],
  [36,0,-20,'d'],[28,20,-26,'d'],[40,0,-26,'d'],[28,-22,-18,'d'],[30,0,-9,'d'],
  [50,0,-2,'v'],[100,0,0,'v']];
// VIETNAM EDITION: lo stesso Leventino sotto il diluvio. Gli argini dritti e i pezzi in piano diventano fango con le pozze
export const LEVENTINO_VIET = LEVENTINO.map(([l, r, g, k], i) => [l, r, g, i > 1 && ((k === 'r' && !r) || (k === 'v' && Math.abs(g) < 5)) ? 'f' : k]);   /* i primi cento metri restano di terra buona: si parte lanciati, non nel fango */
export const LEVENTINO_EXTRA = { forks: [[1934, 2078, 10, 14]], logs: [182, 866, 2298, 2334]   /* tutti su rettilinei dove si vedono da lontano, mai dietro una curva */, paddy: [[1040, 1396], [1736, 1922]], ristoro: 1350 };   /* paddy: da dove a dove si corre in mezzo alle risaie (argine stretto, acqua ai lati) */
// SCUOLA DI ENDURO: un percorso corto a stazioni, ognuna insegna una cosa. Ogni ostacolo nuovo si aggiunge prima qui.
export const SCUOLA = [
  [150, 0, 0, 'v'], [140, 0, 0, 'v'], [140, 0, 0, 'v'], [36, 30, 0, 'v'], [36, -30, 0, 'v'], [36, 30, 0, 'v'], [36, -30, 0, 'v'], [26, 0, 0, 'v'],
  [60, 0, 0, 'f'],
  [40, 0, 0, 'v'], [30, 13, 0, 'v'], [30, 0, 0, 'v'],
  [80, 0, 0, 'v'],
  [80, 0, 0, 'v'],
  [40, 0, 8, 's'], [50, 0, 20, 's'], [20, 0, 6, 's'], [30, 0, 0, 'v'],
  [50, 0, 0, 'p'], [50, 0, 0, 'b'],
  [30, 0, 0, 't'], [23, 15, 0, 't'], [23, -14, 0, 't'], [30, 0, 0, 't'],
  [50, 0, 0, 'v'],
];
export const SCUOLA_EXTRA = { plain: true, logs: [860, 905], steps: [968, 976, 984, 992],
  // Una cosa per volta, dalle basi. Nelle prime tre stazioni la moto sta in strada da sola (auto): prima si impara gas e freno, poi lo sterzo.
  // goal: go = prendere velocità, stop = fermarsi col freno, half = gas a metà, lean = piegare da una parte e dall'altra (si passano appena fatti); gli altri si giudicano a fine stazione. hl = tasto da far lampeggiare
  stations: [
    { s0: 0, s1: 90, goal: 'go', auto: 1, hl: 'gasb', t: 'PARTI', x: 'Tieni premuto il tasto giallo GAS, in basso a destra. La moto parte e per ora sta in strada da sola.', no: 'TIENI PREMUTO IL GAS' },
    { s0: 90, s1: 230, goal: 'stop', auto: 1, hl: 'brake', t: 'FRENA', x: 'Molla il gas e tieni premuto il tasto rosso FRENO, in basso a sinistra, finché la moto è ferma.', no: 'TIENI PREMUTO IL FRENO' },
    { s0: 230, s1: 330, goal: 'half', auto: 1, hl: 'gasb', t: 'DOSA IL GAS', x: 'Riparti col GAS. Poi, senza staccare il pollice, fallo scorrere via dal punto di appoggio: il gas cala (lo leggi sul tasto). Torna indietro: riapre. Tienilo a metà per un secondo.', no: 'POLLICE SUL GAS E FALLO SCORRERE' },
    { s0: 330, s1: 430, goal: 'lean', t: 'STERZA', x: 'Adesso guidi tu. Inclina il telefono come un manubrio: prima a destra, poi a sinistra. (Senza sensore: tocca il lato destro o sinistro dello schermo.)', no: 'INCLINA A DESTRA E A SINISTRA' },
    { s0: 430, s1: 592, goal: 'on', t: 'SLALOM', x: 'Segui le curve inclinando il telefono. Resta sul sentiero.', no: 'RESTA SUL SENTIERO' },
    { s0: 592, s1: 665, goal: 'spin', t: 'FANGO', x: 'Nel fango apri poco: a tutto gas la ruota pattina e non vai avanti. Fai scorrere il pollice finché leggi 40–50%.', no: 'MENO GAS NEL FANGO' },
    { s0: 665, s1: 760, goal: 'slide', hl: 'brake', t: 'CURVA STRETTA', x: 'Arriva una curva stretta a destra: frena prima, poi inclina. Frenando in curva la moto va di traverso e chiude.', no: 'FRENA PRIMA, POI STERZA' },
    { s0: 760, s1: 840, goal: 'wh', hl: 'gasb', t: 'IMPENNATA', x: 'Tieni il GAS e fai scorrere il pollice in SU: la ruota davanti si alza. Per rifarla riporta giù il dito e tira di nuovo su.', no: 'TIENI IL GAS E TIRA SU IL POLLICE' },
    { s0: 840, s1: 920, goal: 'pass', t: 'TRONCHI', x: 'Due tronchi. Arriva piano (sotto i 60) e appena prima tira su il pollice sul GAS: impenni e lo scavalchi. Con la ruota a terra e forte, cadi.', no: 'POLLICE IN SU SUL GAS PRIMA DEL TRONCO' },
    { s0: 920, s1: 1050, goal: 'pass', t: 'SALITA', x: 'Gas pieno e non mollare. Sui gradoni di pietra alza la ruota davanti.', no: 'GAS PIENO, NON MOLLARE' },
    { s0: 1050, s1: 1160, goal: 'pass', t: 'SASSI E RAMI', x: 'Vai piano. Sassi grossi e alberi si schivano; i rami in faccia ti tolgono la vista.', no: 'PIANO: SCHIVA I SASSI GROSSI' },
    { s0: 1160, s1: 1266, goal: 'pass', hl: 'brake', t: 'SINGLE TRACK', x: 'Stretto tra gli alberi: frena prima della curva, piega tutto, gas in uscita.', no: 'FRENA PRIMA DELLA CURVA' },
  ] };
// ICE SCROFY (Pragelato): il circuito vero, ricalcato dalla foto dal drone e dal tracciato azzurro del video del Gabbah.
// Punti in metri (x verso destra della foto, z verso il basso), nel verso di marcia: giù per il Rettilineo del Fulmine, Curvone Derapage, su per il Rettilineo della Furia,
// tornante in alto, Esse di Gusta, Esse della Tagliola, Curva del Destino, risalita e Curva della Puntura. Scala del gioco: 1 m = 5,6 pixel della foto a metà risoluzione (la pista vera è circa 2,5 volte più piccola)
export const ICE_PTS = [[20.71,-78.57],[25.18,-60.71],[27.86,-42.86],[30.54,-25.0],[33.21,-7.14],[36.79,10.71],[42.14,28.57],[47.5,41.07],[51.96,55.36],[53.21,69.64],[51.07,82.14],[45.71,91.07],[34.11,96.07],[15.36,97.32],[-4.29,95.54],[-20.36,90.18],[-32.86,79.46],[-42.14,64.29],[-46.25,46.43],[-47.14,28.57],[-46.25,10.71],[-45.0,-7.14],[-43.57,-25.0],[-42.14,-42.86],[-40.36,-60.71],[-38.21,-78.57],[-33.75,-92.86],[-26.61,-101.79],[-17.68,-105.71],[-10.54,-105.0],[-6.43,-100.36],[-5.54,-91.96],[-6.07,-83.57],[-8.21,-75.89],[-14.11,-69.64],[-21.25,-66.43],[-26.61,-62.5],[-29.64,-55.36],[-30.71,-42.86],[-30.18,-32.14],[-28.39,-21.43],[-24.82,-10.71],[-19.46,-0.89],[-11.43,7.14],[-3.39,13.39],[4.64,19.64],[8.21,26.79],[6.43,32.5],[-0.71,36.07],[-9.64,39.29],[-15.0,44.64],[-17.14,51.79],[-15.0,58.93],[-8.75,63.04],[-0.36,62.86],[8.21,59.82],[13.93,53.57],[17.68,45.0],[20.71,37.5],[23.39,28.57],[23.93,19.64],[21.79,10.71],[18.04,5.0],[13.57,0.0],[6.43,-8.57],[-2.14,-17.5],[-11.07,-26.43],[-18.21,-33.57],[-20.36,-40.18],[-18.21,-45.71],[-11.79,-49.64],[-4.29,-52.68],[1.96,-57.14],[5.89,-62.5],[6.79,-69.64],[5.18,-75.89],[4.11,-80.0],[6.79,-83.57],[12.14,-84.82],[17.14,-82.5]];
export const ICE_ZONE = [[0, 'RETTILINEO DEL FULMINE'], [11, 'CURVONE DERAPAGE'], [18, 'RETTILINEO DELLA FURIA'], [27, 'TORNANTE DEL TORRENTE'], [32, 'ESSE DI GUSTA'], [41, 'ESSE DELLA TAGLIOLA'], [48, 'CURVA DEL DESTINO'], [58, 'RISALITA DELLA TAGLIOLA'], [68, 'CURVA DELLA PUNTURA']];   /* da che punto di controllo comincia ogni tratto */
// CIRCUITO: la linea di mezzeria è una curva chiusa che passa per i punti. Il giro viene diviso in passi uguali (circa DS) e la pista nasce lunga un giro: così si disegna una volta sola.
// Poi unroll() la srotola per il numero di giri: stessi posti, distanza che continua a crescere. Per il gioco è un percorso normale con partenza e arrivo.
// GUSTA RANCH: il circuito vero, ricalcato dalla mappa del Gabbah (linea blu). Un giro e circa 1030 m; si gira in senso orario: dalla PARTENZA A a sinistra su per la salita del lato cascina, poi il lato alto, giu a destra e il rientro dalla PARTENZA B (a tre quarti di giro).
export const GUSTA_PTS = [[-93.9,32.0],[-96.4,31.8],[-109.5,31.7],[-123.4,30.8],[-135.9,26.3],[-145.6,16.8],[-151.0,4.7],[-153.0,-8.9],[-150.6,-22.1],[-142.2,-32.8],[-131.1,-40.8],[-118.8,-45.8],[-111.1,-55.4],[-104.3,-65.6],[-91.1,-67.9],[-78.8,-72.4],[-68.4,-81.9],[-58.5,-91.6],[-46.4,-97.0],[-32.5,-97.9],[-18.4,-97.2],[-4.5,-96.0],[9.1,-94.2],[22.6,-91.9],[35.6,-88.6],[48.2,-84.3],[61.1,-80.6],[72.4,-74.8],[75.8,-62.4],[74.9,-48.4],[74.1,-34.4],[72.3,-20.7],[67.8,-8.2],[60.7,3.3],[59.2,13.6],[70.9,17.6],[84.5,19.5],[98.0,21.8],[111.6,23.6],[125.6,23.2],[137.9,18.3],[149.8,13.6],[161.7,18.6],[171.6,28.0],[169.9,37.8],[157.1,41.3],[143.0,41.9],[128.7,42.1],[114.5,42.6],[100.3,42.9],[86.0,42.7],[71.7,42.4],[58.0,40.8],[44.8,38.0],[31.5,35.1],[18.4,32.0],[5.7,28.0],[-7.0,23.8],[-19.6,19.5],[-32.1,15.4],[-44.9,13.2],[-58.8,12.6],[-71.8,15.1],[-70.8,21.7],[-57.8,24.6],[-44.0,26.2],[-35.6,32.6],[-32.5,40.3],[-19.6,39.3],[-6.0,38.7],[5.1,44.6],[3.6,55.4],[-8.0,61.6],[-21.5,63.1],[-34.6,60.2],[-46.0,53.0],[-57.2,45.2],[-68.9,38.8],[-81.4,34.2]];
export const GUSTA_ELEV = [[0, 0], [20, 0], [215, 26], [300, 26], [420, 6], [640, 2], [1030, 0]];
export const GUSTA_KINDS = [[0, 'q'], [303, 'd'], [415, 'q'], [750, 't']];   /* da che metro del giro comincia ogni fondo: salita e cima in terra, la discesa stretta, il giro basso, il single track nel bosco */   /* quota lungo il giro (m): il lato della cascina si fa in salita, poi si scende piano fino alla partenza */
// CHRISTMAS MADNESS: il Gusta Ranch girato al contrario (antiorario). Si parte subito nel single track del bosco, poi il giro basso con due lastre di ghiaccio, la stretta diventa una salita, in cima la terza lastra e giu per il lato della cascina
// IL DESERTONE: il giro tra le dune dell'Erg Chigaga ricalcato dalla traccia GPS del viaggio in Marocco del Gabbah (tolte le soste, ingrandito del 30%). Quote vere delle dune, accentuate una volta e mezza
export const DESERTO_PTS = [[0,0],[-26,-48],[-76,-54],[-130,-57],[-176,-83],[-170,-123],[-169,-178],[-197,-217],[-241,-245],[-269,-290],[-320,-309],[-360,-293],[-357,-244],[-372,-213],[-423,-233],[-458,-275],[-504,-302],[-524,-251],[-558,-227],[-555,-173],[-546,-124],[-583,-95],[-620,-61],[-623,-27],[-569,-32],[-516,-42],[-463,-57],[-444,-41],[-475,2],[-510,45],[-521,94],[-482,133],[-443,171],[-436,216],[-430,262],[-389,233],[-400,180],[-399,126],[-390,72],[-372,21],[-352,-30],[-315,-61],[-273,-44],[-306,-5],[-320,48],[-276,66],[-228,43],[-200,31],[-175,79],[-150,128],[-125,176]];
export const DESERTO_Y = [0.0,1.7,6.7,12.8,18.1,19.8,21.6,23.2,26.7,26.4,22.8,19.0,20.6,21.1,17.5,13.1,8.0,10.9,11.1,19.1,25.2,27.1,29.0,31.5,31.7,33.0,35.0,35.2,31.8,26.5,21.6,18.0,14.8,14.4,16.8,15.9,14.5,16.1,18.1,24.3,28.1,25.3,18.0,21.4,20.1,20.1,18.7,16.8,13.4,10.0,6.7];   /* quota di ogni punto, in metri sopra il punto piu basso */
// ANTI-GEV: percorso inventato apposta, tutto nel bosco del parco. Pezzi larghi dove le guardie possono saltare fuori (e tu schivarle) alternati a macchia e single track dove nascondersi non serve: li' si va piano
export const ANTIGEV = [
  [70, 0, 0, 'v'], [60, 50, 1, 'v'], [60, 0, -2, 'v'], [70, -45, -3, 'v'], [70, 0, -2, 'v'],
  [40, 30, 0, 'b'], [30, -25, 1, 'b'], [40, 0, 0, 't'], [30, 18, 0, 't'], [30, -18, 0, 't'],
  [70, 0, 2, 'v'], [80, 60, 3, 'v'], [50, 0, 14, 's'], [40, -24, 20, 's'], [60, 0, 16, 's'],
  [40, 26, 10, 'm'], [40, 0, 6, 'm'], [60, -40, 0, 'v'], [80, 0, -2, 'v'], [24, 0, 0, 'g'],
  [70, 0, 2, 'v'], [60, 45, 0, 'f'], [60, 0, 0, 'f'], [70, -55, 1, 'v'], [40, 0, 0, 'b'],
  [30, 20, 0, 't'], [30, -16, 0, 't'], [40, 0, -1, 't'], [70, 0, -14, 'd'], [40, 22, -20, 'd'],
  [70, 0, -16, 'd'], [40, -26, -8, 'd'], [90, 0, -2, 'v'], [70, 70, 0, 'v'], [60, 0, 3, 'p'],
  [50, -35, 2, 'p'], [80, 0, 0, 'v'], [60, 40, -1, 'v'], [40, 0, 0, 'b'], [40, -20, 0, 'b'],
  [90, 0, 0, 'v'], [70, -60, 1, 'v'], [120, 0, 0, 'v'],
];
export const ANTIGEV_EXTRA = { logs: [330, 372, 1338, 1376] };
// CEF ADVENTURE: da Piacenza a Rapallo. Ricavato dalla traccia vera (CEF ADVENTURE 19 ANDATA NEW.gpx, 183 km, dai 438 m della Val Nure ai 1405 m del crinale fino al mare): stessa pianta in piccolo, stesso profilo in scala, tornanti addolciti perche' i rami non si tocchino. Non e' un anello: si parte in collina e si arriva sulla spiaggia, dove si dorme in tenda
export const CEF = [
  [60, 0, 6, 'v'], [66, -44, 20, 's'], [48, 0, 14, 'v'], [59, 55, 8, 'v'], [44, 33, -6, 't'], [17, 0, -16, 'd'],
  [58, 58, -9, 'v'], [65, 0, -2, 't'], [43, -30, 20, 'm'], [49, -34, 16, 'm'], [24, 16, -5, 't'], [41, 47, -16, 'd'],
  [22, 0, 0, 'g'], [27, -18, 12, 't'], [34, 0, 12, 'v'], [39, 26, -2, 'b'], [26, 0, -2, 'v'], [24, -16, 16, 'm'],
  [60, 41, -16, 'd'], [50, 45, 10, 'v'], [37, 0, 5, 't'], [64, -70, -1, 'v'], [95, 0, -4, 'f'], [44, 50, 16, 's'],
  [32, 23, 16, 'm'], [105, 0, -8, 't'], [50, -37, 20, 's'], [27, 0, 20, 's'], [26, -17, 16, 'm'], [23, 16, 16, 'm'],
  [42, 0, 12, 'p'], [53, -57, 18, 's'], [44, -54, -8, 'p'], [85, 0, -16, 'd'], [46, 40, -16, 'd'], [24, -16, -10, 'd'],
  [37, -33, -5, 'b'], [26, 0, 0, 'g'], [34, 23, 16, 'm'], [44, 45, 20, 's'], [13, 0, 20, 's'], [46, 31, 13, 'v'],
  [45, -37, -16, 'd'], [28, 0, -16, 'd'], [36, -70, -16, 'd'], [24, 16, -10, 'd'], [39, -47, -16, 'd'], [26, 0, 0, 'g'],
  [60, -70, 10, 'v'], [95, 0, 20, 's'], [62, 55, 20, 's'], [23, 0, -11, 'v'], [47, 50, -16, 'd'], [14, 0, 13, 'v'],
  [30, -20, 8, 't'], [33, -30, -1, 't'], [24, 16, 5, 't'], [27, -18, -10, 't'], [102, 0, -16, 'd'], [61, 70, -12, 'v'],
  [47, -40, -16, 'd'], [71, 0, -16, 'd'], [99, 66, -4, 'v'], [177, 0, -9, 'd'], [36, -28, -6, 'k'], [95, 0, -4, 'k'],
];
export const CEF_EXTRA = { logs: [384, 874, 1180] };
// NOTTURNA CON LE FRONTALI: un serpentone tutto nel bosco, fatto apposta. Dalla radura col falo' si sale in mulattiera fino alla cresta sotto la luna, si scende al guado e al fango, poi macchia stretta, pietraia e le esse finali fino al falo' d'arrivo
export const NOTTE = [
  [60, 0, 0, 'v'], [50, 35, 1, 't'], [40, -22, 2, 't'], [40, 22, 2, 't'], [50, 0, 6, 's'],
  [45, -28, 12, 's'], [60, 0, 10, 'm'], [40, 24, 6, 'm'], [70, 0, 2, 'v'], [50, -40, 0, 'v'],
  [50, 0, -10, 'd'], [40, 26, -14, 'd'], [40, -26, -10, 'd'], [30, 0, -2, 't'], [24, 0, 0, 'g'],
  [50, 0, 1, 'f'], [50, 30, 0, 'f'], [40, 0, 0, 'b'], [36, -18, 0, 'b'], [36, 18, 0, 'b'],
  [36, -18, 0, 't'], [60, 0, 3, 'v'], [60, -45, 4, 'v'], [50, 0, 8, 'p'], [40, 30, 4, 'p'],
  [60, 0, 0, 't'], [40, -20, -4, 't'], [40, 20, -6, 'd'], [60, 0, -8, 'd'], [50, -35, -2, 'v'],
  [40, 0, 0, 't'], [30, 16, 0, 't'], [30, -16, 0, 't'], [30, 16, 0, 't'], [80, 0, 0, 'v'],
  [60, 50, 0, 'v'], [100, 0, 0, 'v'],
];
export const NOTTE_EXTRA = { logs: [648, 1172, 1414] };
// ANGELO POTTER: la mulattiera del dirupo. Una lunga traversata a mezza costa: la parete sempre a sinistra, il vuoto sempre a destra. Niente tornanti sovrapposti: la montagna e' una sola e si legge bene. A meta' il punto di Angelo
export const POTTER = [
  [50, 0, 2, 'm'], [60, 0, 14, 'e'], [35, -30, 20, 'e'], [45, 0, -7, 'e'], [40, 28, -11, 'e'],
  [55, 0, 9, 'z'], [30, 24, 22, 'e'], [50, 0, 12, 'e'], [38, -26, -8, 'e'], [40, 0, -10, 'e'],
  [40, 0, 3, 'a'], [30, -22, 20, 'e'], [55, 0, 13, 'e'], [42, 26, -9, 'e'], [50, 0, 7, 'z'],
  [30, 22, 22, 'e'], [45, 0, 18, 'e'], [36, -24, -6, 'e'], [50, 0, 10, 'e'], [60, 0, 2, 'm'],
];   /* saliscendi veri: strappi al 20-22%, discese fino all'11%, il punto di Angelo in fondo a una discesa */
export const POTTER_EXTRA = { logs: [166, 340, 541, 796] };   /* quattro tronchi di traverso sui rettilinei: si saltano d'impennata */
export const POTTER_CLIFF = (() => { const out = []; let c = 0, side = 1; for (const [l, r, g, k] of POTTER) { if (k === 'e' || k === 'a' || k === 'z') out.push([c, c + l, side]); c += l; if (r && Math.abs(r) <= 9) side = -side; } return out; })();   /* da che parte e' il vuoto, pezzo per pezzo: a ogni tornante cambia lato */
export const GUSTA_PTS_R = [GUSTA_PTS[0], ...GUSTA_PTS.slice(1).reverse()];
export const GUSTA_ELEV_R = [[0, 0], [348, 2], [568, 6], [688, 26], [773, 26], [968, 0], [988, 0]];
export const GUSTA_KINDS_XMAS = [[0, 't'], [238, 'q'], [298, 'j'], [388, 'q'], [483, 'j'], [533, 'q'], [573, 's'], [692, 'j'], [766, 'q']];
export function buildCircuit(pts, kd = 'i', laps = 2, start = 0, zones = [], elev = null, kinds = null) {
  if (kd === 'i') pts = pts.map(q => [q[0] * 1.3, q[1] * 1.3]);   /* Ice Scrofy ingrandita del 30%: pista e tornanti più larghi senza che i rami si tocchino */
  const N = pts.length, cr = (a, b, c, d, t) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t), D = [], own = [];
  for (let q = 0; q < N; q++) { const i = (q + start) % N; for (let t = 0; t < 1; t += 1 / 48) { D.push([cr(pts[(i + N - 1) % N][0], pts[i][0], pts[(i + 1) % N][0], pts[(i + 2) % N][0], t), cr(pts[(i + N - 1) % N][1], pts[i][1], pts[(i + 1) % N][1], pts[(i + 2) % N][1], t)]); own.push(i); } }
  if (kd === 'i' || kinds) { const M0 = D.length, O = 14, RMIN = 9;   /* tornanti un po più aperti: dove il raggio scende sotto i 7 metri la linea si rilassa verso la corda, il resto del disegno non si tocca */
    for (let it = 0, mv = 1; it < 2500 && mv; it++) for (let i = (mv = 0); i < M0; i++) { const a = D[(i - O + M0) % M0], b = D[i], c = D[(i + O) % M0], ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]), ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
      if (ar > 1e-6 && ab * bc * ca / (4 * ar) < RMIN) { b[0] += ((a[0] + c[0]) / 2 - b[0]) * .25; b[1] += ((a[1] + c[1]) / 2 - b[1]) * .25; mv = 1; } } }
  const M = D.length, cum = [0]; for (let i = 0; i < M; i++) { const a = D[i], b = D[(i + 1) % M]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[M], m = Math.round(L / DS), st = L / m, x = new Float32Array(m + 1), z = new Float32Array(m + 1), h = new Float32Array(m + 1), zi = new Int16Array(m + 1); let j = 0;
  for (let i = 0; i < m; i++) { const t = i * st; while (cum[j + 1] < t) j++; const u = (t - cum[j]) / (cum[j + 1] - cum[j]), a = D[j], b = D[(j + 1) % M]; x[i] = (a[0] + (b[0] - a[0]) * u) * DS / st; z[i] = (a[1] + (b[1] - a[1]) * u) * DS / st; zi[i] = own[j]; }
  x[m] = x[0]; z[m] = z[0]; zi[m] = zi[0];
  for (let i = 0; i < m; i++) { let a = Math.atan2(x[i + 1] - x[i], -(z[i + 1] - z[i])); if (i) { while (a - h[i - 1] > Math.PI) a -= 2 * Math.PI; while (a - h[i - 1] < -Math.PI) a += 2 * Math.PI; } h[i] = a; }
  { let d = h[0] - h[m - 1]; const turn = Math.round((h[m - 1] - h[0]) / (2 * Math.PI)) * 2 * Math.PI; h[m] = h[0] + turn; }   /* a fine giro la direzione è quella di partenza più i giri completi fatti */
  const n = m + 1, k = new Float32Array(n), K = KIND[kd]; for (let i = 0; i < m; i++) k[i] = (h[i + 1] - h[i]) / DS; k[m] = k[0];
  { const c = Float32Array.from(k); for (let i = 0; i < n; i++) k[i] = (c[(i + m - 1) % m] + 2 * c[i % m] + c[(i + 1) % m]) / 4; }
  const kAbs = i => { let a = 0; for (let j = -5; j <= 5; j++) a += Math.abs(k[((i + j) % m + m) % m]); return a / 11; };   /* nelle curve strette la pista si allarga fino a una volta e mezza: spazio per girare */
  const w = new Float32Array(n), sd = new Float32Array(n), kind = []; for (let i = 0; i < n; i++) { const s = (i % m) * DS; const q = zi[i % m], big = kd === 'i' && q >= 10 && q <= 18 ? Math.min(1, Math.min(q - 9.5, 18.5 - q) / 2.5) : 0; w[i] = K.w * (1 + .1 * Math.sin(s * 2 * Math.PI / (m * DS) * 3 + 1) + .05 * Math.sin(s * 2 * Math.PI / (m * DS) * 7)) * (1 + .45 * big) * (1 + .25 * Math.min(1, Math.max(0, (kAbs(i) - .05) / .08))); sd[i] = K.side; if (kinds) { let kq = kd; for (const [s0, kk] of kinds) if (s >= s0) kq = kk; if (kq !== kd) { w[i] *= (kq === 'd' || kq === 's' ? 4.3 : KIND[kq].w) / K.w; kind.push(kq); continue; } }   /* circuito con fondi diversi: cambia la larghezza, i bordi restano stretti perche i rami sono vicini */   /* il Curvone Derapage è largo quasi il doppio: è lo spiazzo dove si gira di traverso */ kind.push(kd); }
  const tr = { n, x, z, y: new Float32Array(n), h, k, g: new Float32Array(n), w, side: sd, kind, len: m * DS, water: [], branches: [], logs: [], stations: null, forks: [], plain: false, steps: [], jumps: [], circuit: { laps, m, lap: m * DS, turn: h[m] - h[0], zi, zones } };
  if (elev) { const L = m * DS, f = s => { s = ((s % L) + L) % L; for (let q = 0; q < elev.length - 1; q++) { const a = elev[q], b = elev[q + 1], b0 = q === elev.length - 2 ? L : b[0]; if (s <= b0) { const t = (s - a[0]) / Math.max(1e-6, b0 - a[0]); return a[1] + (b[1] - a[1]) * t; } } return 0; };   /* profilo di quota chiuso su se stesso, addolcito su 30 metri */
    for (let i = 0; i < n; i++) { let a = 0; for (let j = -15; j <= 15; j++) a += f((i + j) * DS); tr.y[i] = a / 31; } tr.y[m] = tr.y[0]; for (let i = 0; i < n; i++) tr.g[i] = (tr.y[(i + 1) % m] - tr.y[(i - 1 + m) % m]) / (2 * DS); }
  if (kinds) { const c = Float32Array.from(w); for (let i = 0; i < n; i++) { let a = 0; for (let j = -4; j <= 4; j++) a += c[((i + j) % m + m) % m]; w[i] = a / 9; } }
  tr.spans = []; for (let i = 0; i < m; i++) { const Lq = tr.spans[tr.spans.length - 1]; if (Lq && Lq.kind === kind[i]) Lq.s1 = (i + 1) * DS; else tr.spans.push({ kind: kind[i], s0: i * DS, s1: (i + 1) * DS }); } addGround(tr); return tr;
}
export function unroll(tr) { const c = tr.circuit; if (!c || c.done) return; c.done = 1; const m = c.m, L = c.laps, n = m * L + 1, til = (a, T, add = 0) => { const o = new T(n); for (let i = 0; i < n; i++) o[i] = a[i % m] + add * Math.floor(i / m); return o; };
  tr.x = til(tr.x, Float32Array); tr.z = til(tr.z, Float32Array); tr.y = til(tr.y, Float32Array); tr.h = til(tr.h, Float32Array, c.turn); tr.k = til(tr.k, Float32Array); tr.g = til(tr.g, Float32Array); tr.w = til(tr.w, Float32Array); tr.side = til(tr.side, Float32Array);
  const k0 = tr.kind, sp0 = tr.spans; tr.kind = Array.from({ length: n }, (_, i) => k0[i % m]); c.zi = til(c.zi, Int16Array);
  const fm = Math.round(c.lap / FS), bt = a => { const o = new Float32Array(fm * L + 2); for (let i = 0; i < o.length; i++) o[i] = a[i % fm]; return o; }; tr.bump = bt(tr.bump); tr.rough = bt(tr.rough);
  tr.n = n; tr.len = (n - 1) * DS; tr.spans = []; for (let j = 0; j < L; j++) for (const s of sp0) tr.spans.push({ kind: s.kind, s0: s.s0 + j * c.lap, s1: s.s1 + j * c.lap }); }
export const paddyAt = (tr, s) => { let v = 0; for (const [a, b] of tr.paddy) { const t = Math.min(s - a, b - s) / 14; if (t > 0) v = Math.max(v, t >= 1 ? 1 : t * t * (3 - 2 * t)); } return v; };   /* 0 fuori dalle risaie, 1 in mezzo */
export const zoneAt = (tr, s) => { const c = tr.circuit; if (!c) return ''; const q = c.zi[Math.min(tr.n - 1, Math.round(s / DS))]; let nm = ''; for (const [a, t] of c.zones) if (q >= a) nm = t; return nm; };
const smooth = (a, n) => a.map((_, i) => { let s = 0, c = 0; for (let k = -n; k <= n; k++) { s += a[Math.max(0, Math.min(a.length - 1, i + k))]; c++; } return s / c; });
export function buildTrack(segs = GIRO_EASY, extra = {}) {
  let k = [], g = [], w = [], sd = [], kind = [];
  for (const [len, r, gr, kd] of segs) for (let s = 0; s < len; s += DS) { k.push(r ? 1 / r : 0); g.push(gr / 100); w.push(KIND[kd].w); sd.push(KIND[kd].side); kind.push(kd); }
  for (const [a, b] of (extra.paddy || [])) for (let i = Math.round(a / DS); i < Math.min(sd.length, Math.round(b / DS)); i++) sd[i] = 7;   /* in risaia anche il fango e il fosso hanno l'argine stretto */
  k = smooth(k, 4); g = smooth(g, 8); w = smooth(w, 6); sd = smooth(sd, 6);
  // mai uguale: la larghezza respira lungo tutto il percorso (strettoie e slarghi), anche dentro lo stesso tratto
  w = w.map((v, i) => { const s = i * DS, kk = kind[i] === 'm' || kind[i] === 't' || kind[i] === 'b' ? .55 : 1; return Math.max(1.9, v * (1 + kk * (.22 * Math.sin(s * .041 + 1) + .13 * Math.sin(s * .097 + 2.3) + .07 * Math.sin(s * .23)))); });
  for (const [a, b] of (extra.forks || [])) for (let i = 0; i < w.length; i++) { const s = i * DS, t = Math.max(0, Math.min(1, Math.min(s - a, b - s) / 14)); if (t > 0) w[i] += (5.4 - w[i]) * t * t * (3 - 2 * t); }   /* nel bivio ogni via è un sentiero stretto */
  const n = k.length, x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), h = new Float32Array(n);
  let px = 0, pz = 0, py = 0, ph = 0;
  for (let i = 0; i < n; i++) { x[i] = px; z[i] = pz; y[i] = py; h[i] = ph; ph += k[i] * DS; px += Math.sin(ph) * DS; pz -= Math.cos(ph) * DS; py += g[i] * DS; }
  const tr = { n, x, z, y, h, k: Float32Array.from(k), g: Float32Array.from(g), w: Float32Array.from(w), side: Float32Array.from(sd), kind, len: (n - 1) * DS, water: [], branches: [], logs: (extra.logs || []).map(s => ({ s })), stations: extra.stations || null, forks: (extra.forks || []).map(([s0, s1, DL, DR]) => ({ s0, s1, DL, DR })), plain: !!extra.plain, steps: extra.steps || null, jumps: extra.jumps || [], paddy: extra.paddy || [], ristoro: extra.ristoro || 0 };
  // tratti (inizio, fine, tipo) per il disegno e per i cartelli
  tr.spans = []; for (let i = 0; i < n; i++) { const L = tr.spans[tr.spans.length - 1]; if (L && L.kind === kind[i]) L.s1 = (i + 1) * DS; else tr.spans.push({ kind: kind[i], s0: i * DS, s1: (i + 1) * DS }); }
  addGround(tr); return tr;
}
// il fondo: dossi, canali, gobbe (profilo morbido: ci si salta) e quanto è sconnesso (fa lavorare le ruote). Il guado e le pozze sono conche con l'acqua dentro.
function addGround(tr) {
  const m = Math.ceil(tr.len / FS) + 2, bump = new Float32Array(m), rough = new Float32Array(m), feat = [];
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const put = (s, len, fn) => { for (let i = Math.max(0, Math.floor(s / FS)); i <= Math.ceil((s + len) / FS) && i < m; i++) { const u = (i * FS - s) / len; if (u >= 0 && u <= 1) fn(i, u, Math.sin(Math.PI * u)); } };
  for (let i = 0; i < m; i++) rough[i] = KIND[tr.kind[Math.min(tr.n - 1, Math.floor(i * FS / DS))]].rough;
  for (const sp of tr.spans) {
    const L = sp.s1 - sp.s0;
    if (sp.kind === 'g') {   // guado: si scende nel torrente e si risale
      put(sp.s0 + 2, L - 4, (i, u) => { bump[i] -= .55 * Math.pow(Math.sin(Math.PI * u), .7); });
      tr.water.push({ s0: sp.s0 + 3.5, s1: sp.s1 - 3.5, half: 0, depth: .55, kind: 'guado' });
    } else if (sp.kind === 'f') {   // fango: tre o quattro pozze
      for (let s = sp.s0 + 8; s < sp.s1 - 12; s += 17 + rnd() * 8) { const len = 6 + rnd() * 3; put(s, len, (i, u, e) => { bump[i] -= .2 * e * e; }); tr.water.push({ s0: s + 1.2, s1: s + len - 1.2, half: 2.4, off: (rnd() - .5) * 2.2, depth: .2, kind: 'pozza' }); }
    } else if (sp.kind === 'v' || sp.kind === 's' || sp.kind === 'd') {   // dossi, canali e gobbe
      const kinds = sp.kind === 'v' ? ['dosso', 'gobbe', 'dosso'] : sp.kind === 's' ? ['canale', 'gradino'] : ['dosso', 'canale'];
      const stp = tr.steps ? tr.steps.filter(s => s > sp.s0 && s < sp.s1) : []; if (!tr.steps) for (let s = sp.s0 + 88; s < sp.s0 + 126; s += 7.5) stp.push(s);
      if (sp.kind === 's') for (const s of stp) { feat.push({ s, kind: 'gradone' }); put(s, 6, (i, u) => { bump[i] += .42 * (u < .3 ? u / .3 : 1 - (u - .3) / .7); }); }   // gradoni sul pezzo più ripido: salgono di colpo e scendono piano
      let q = 0; if (!tr.plain) for (let s = sp.s0 + 34; s < sp.s1 - 30; s += 44 + rnd() * 30) {
        const kd = kinds[q++ % kinds.length], tight = Math.abs(tr.k[Math.min(tr.n - 1, Math.round(s / DS))]) > .025 ? .55 : 1; feat.push({ s, kind: kd });
        if (kd === 'dosso') put(s, 6.5, (i, u, e) => { bump[i] += .45 * tight * e * e; });
        else if (kd === 'canale') put(s, 4, (i, u, e) => { bump[i] -= .22 * tight * e * e; });
        else if (kd === 'gradino') put(s, 5, (i, u, e) => { bump[i] += .28 * tight * e * e * (u < .5 ? 1 : .5); });
        else put(s, 15, (i, u, e) => { bump[i] += .2 * tight * Math.pow(Math.sin(Math.PI * u * 3), 2) * Math.min(1, e * 3); });
      }
    } else if (sp.kind === 'q') {   // ranch: dossi di terra e tre pozze di fango a giro
      for (let s = sp.s0 + 46; s < sp.s1 - 40; s += 58 + rnd() * 34) { if (tr.g[Math.min(tr.n - 1, Math.round(s / DS))] > .05) continue; const tight = Math.abs(tr.k[Math.min(tr.n - 1, Math.round(s / DS))]) > .025 ? .5 : 1; put(s, 6.5, (i, u, e) => { bump[i] += .34 * tight * e * e; }); }
      for (const s of [470, 560, 690]) if (s > sp.s0 + 4 && s < sp.s1 - 12) { put(s, 8, (i, u, e) => { bump[i] -= .2 * e * e; }); tr.water.push({ s0: s + 1.2, s1: s + 6.8, half: 2.3, off: (rnd() - .5) * 2, depth: .2, kind: 'pozza' }); }
    } else if (sp.kind === 'z') {   // pietraia esposta: scalini fitti
      for (let s = sp.s0 + 4; s < sp.s1 - 4; s += 4.5 + rnd() * 3) put(s, 2.4, (i, u, e) => { bump[i] += .2 * e * e; });
    } else if (sp.kind === 'e') {   // mulattiera esposta: gradini di pietra e sassi smossi
      for (let s = sp.s0 + 8; s < sp.s1 - 6; s += 9 + rnd() * 7) put(s, 2.2, (i, u, e) => { bump[i] += .1 * e * e; });
    } else if (sp.kind === 'r') {   // risaia: ogni tanto il ponticello di terra sopra un fosso
      for (let s = sp.s0 + 26; s < sp.s1 - 16; s += 38 + rnd() * 16) put(s, 5, (i, u, e) => { bump[i] += .13 * e * e; });
    } else if (sp.kind === 'p') {   // pietraia: lastre e scalini
      for (let s = sp.s0 + 6; s < sp.s1 - 8; s += 4.5 + rnd() * 4.5) { const a = (.1 + rnd() * .14) * (rnd() > .4 ? 1 : -1); put(s, 2.8 + rnd() * 2, (i, u, e) => { bump[i] += a * e; }); }
    } else if (sp.kind === 'm') {   // mulattiera: canalette di scolo di traverso
      for (let s = sp.s0 + 12; s < sp.s1 - 6; s += 19 + rnd() * 6) put(s, 2.4, (i, u, e) => { bump[i] += .08 * e * e; });
      for (let s = sp.s0 + 5; s < sp.s1 - 5; s += 8 + rnd() * 6) { const a = (.05 + rnd() * .05) * (rnd() > .5 ? 1 : -1); put(s, 1.6 + rnd() * 1.4, (i, u, e) => { bump[i] += a * e; }); }   /* lastre smosse e avvallamenti: un po' di sconnesso, niente di cattivo */
    } else if (sp.kind === 'b') {   // macchia: rami bassi che sporgono, una volta da una parte e una dall'altra
      let sg = 1; for (let s = sp.s0 + 9; s < sp.s1 - 5; s += 8 + rnd() * 7) { tr.branches.push({ s, side: sg, reach: .15 + rnd() * .5 }); sg = rnd() < .75 ? -sg : sg; }
    } else if (sp.kind === 't') {   // single track: radici e piccoli dossi naturali
      for (let s = sp.s0 + 10; s < sp.s1 - 8; s += 21 + rnd() * 12) put(s, 5, (i, u, e) => { bump[i] += .16 * e * e; });
    }
  }
  /* DOSSI DA SALTO: una rampa che sale sempre più ripida per 11 m e poi cade in 4. Presa forte si stacca e si vola; presa piano si scavalca */
  for (const s of tr.jumps) { feat.push({ s: s + 11, kind: 'salto' }); put(s, 15, (i, u) => { const a = u / .733; bump[i] += 1.0 * (a < 1 ? a * a : Math.pow(1 - (u - .733) / .267, 1.5)); }); }
  tr.bump = bump; tr.rough = rough; tr.feat = feat;
  for (const wt of tr.water) { const sm = (wt.s0 + wt.s1) / 2; wt.y = centerY(tr, sm) + prof(bump, sm) + wt.depth * (wt.kind === 'guado' ? .62 : .7); }
}
const prof = (a, s) => { const f = Math.max(0, Math.min(a.length - 1.001, s / FS)), i = f | 0; return a[i] + (a[i + 1] - a[i]) * (f - i); };
const lerpA = (a, s, n) => { const f = Math.max(0, Math.min(n - 1.001, s / DS)), i = f | 0; return a[i] + (a[i + 1] - a[i]) * (f - i); };
const centerY = (tr, s) => lerpA(tr.y, s, tr.n);
export const roughAt = (tr, s) => prof(tr.rough, s);
export const widthAt = (tr, s) => lerpA(tr.w, s, tr.n);
export const sideAt = (tr, s) => lerpA(tr.side, s, tr.n);
export const kindAt = (tr, s) => KIND[tr.kind[Math.max(0, Math.min(tr.n - 1, Math.round(s / DS)))]];
// profondità dell'acqua in un punto (0 = asciutto)
export function waterAt(tr, s, d, gy) { for (const wt of tr.water) if (s > wt.s0 && s < wt.s1 && (!wt.half || Math.abs(d - (wt.off || 0)) < wt.half)) return Math.max(0, wt.y - gy); return 0; }
const noise = (a, b) => Math.sin(a * .071 + b * .13) * .5 + Math.sin(a * .023 - b * .051 + 1.7) * .5;
// altezza del terreno a distanza s lungo la pista e d di lato (+ = destra). smoothOnly = senza il sassolino fine (per la fisica)
// BIVI VERI: dentro un bivio il sentiero si sdoppia. Le due vie si allontanano dalla linea di mezzo (una a sinistra, una a destra), in mezzo resta un'isola di bosco, poi si riuniscono.
const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const forkAt = (tr, s) => tr.forks.find(f => s > f.s0 && s < f.s1);
export function laneOff(tr, s, side) { const f = forkAt(tr, s); return f ? sm((s - f.s0) / 40) * sm((f.s1 - s) / 40) * (side < 0 ? f.DL : f.DR) : 0; }   // di quanto è spostata la via di quel lato
export const laneSide = (tr, s, d) => d >= (laneOff(tr, s, 1) - laneOff(tr, s, -1)) / 2 ? 1 : -1;   // su quale via sei (la più vicina): 1 destra, -1 sinistra
export const lat = (tr, s, d) => Math.min(Math.abs(d - laneOff(tr, s, 1)), Math.abs(d + laneOff(tr, s, -1)));   // distanza dal centro della via più vicina: continua anche in mezzo all'isola
export function groundY(tr, s, d, smoothOnly) {
  const yc = centerY(tr, s), kk = lerpA(tr.k, s, tr.n), hw = widthAt(tr, s) / 2, kd = kindAt(tr, s);
  const fkk = forkAt(tr, s), a = Math.abs(lat(tr, s, d)), out = Math.max(0, a - hw);
  let fstep = 0; if (fkk && d > 0) for (const q of [fkk.s0 + 64, fkk.s0 + 84]) { const u = (s - q) / 5; if (u > 0 && u < 1) fstep += .3 * (u < .3 ? u / .3 : 1 - (u - .3) / .7) * Math.max(0, 1 - out / 1.5); }   // sulla via Easy due gradoni
  const rut = (-.04 * Math.pow(Math.cos(Math.min(a, hw) * Math.PI / (hw * 2) * 2.2), 2) + Math.sin(s * .9 + d) * .01) * Math.max(0, 1 - out / 1.5);
  const bank = -d * Math.max(-.07, Math.min(.07, kk * 2.2)) * Math.min(1, hw / Math.max(a, .01)) * (.6 + .4 * Math.max(0, 1 - out / 2)) * (fkk ? 0 : 1);   /* niente scalino sul bordo: uscendo non si decolla */
  // ai lati: prato che sale dolce; sulla mulattiera un lato è la scarpata a monte e l'altro scende; nel single track il sottobosco è mosso
  let side = out * out * .012 * (1 + noise(s, d) * .9) + out * .05 * noise(s * 1.7, d * 2 + 9);
  if (kd.name === 'mulattiera') side = out * (d > 0 ? .3 : -.2) + out * .08 * noise(s * 2, d * 3);
  else if (kd.name === 'ghiaccio') side = .55 * Math.pow(Math.sin(Math.PI * Math.min(1, out / 3)), 1.2) - .1 * Math.min(1, out / 3.2);   /* sponda di neve spalata ai bordi, poi la piana */
  else if (kd.name === 'single track') side = out * .1 * noise(s * 2.3, d * 2.1 + 4) + out * out * .008;
  if (tr.paddy && tr.paddy.length) { const pd = paddyAt(tr, s); if (pd > 0) side = side * (1 - pd) - Math.min(out, 3.2) * .3 * pd; }   /* l'argine scende nell'acqua della risaia */
  const fade = Math.max(0, 1 - out / 3), rg = smoothOnly ? 0 : prof(tr.rough, s) * (Math.sin(s * 7.3 + d * 5.1) + Math.sin(s * 11.7 - d * 3.3)) * .5;
  if (fkk) { const isl = Math.min(d + laneOff(tr, s, -1), laneOff(tr, s, 1) - d); if (isl > hw) side += 2.1 * sm((isl - hw - .4) / 4.5); }   // l'isola tra le due vie è un dosso di bosco: da una via non si vede l'altra
  return yc + rut + bank + side + fstep + (prof(tr.bump, s) + rg) * fade;
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
