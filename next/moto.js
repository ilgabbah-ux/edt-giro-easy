// Le moto della pista 3D. Ognuna ha il suo modello, la sua guida e la sua voce.
// fit = [manubrio x, y, z, sella]: dove il pilota mette le mani e il sedere
// top velocità massima · acc spinta · agile quanto si butta in piega · wh quanto impenna facile · climb quanto sale
// snd: fm scoppi (più alto = motore più piccolo o due tempi), bf timbro (aperto/cupo), nz aspirazione, pk risonanza dello scarico, el elettrica
export const MOTO = [
  { id: 'fakedomi', name: 'FAKE DOMI', glb: 'fakedomi', fit: [.46, 1.33, -.45, 1.11], txt: "La moto del Gabbah. Mono 650: tira come un trattore, in curva pesa.", top: 1, acc: 1, agile: 1, wh: 1, climb: 1.1, snd: {} },
  { id: 'enduro', name: 'EDT 250 4T', glb: 'enduro', fit: [.44, 1.42, -.2, 1.106], txt: "La enduro di tutti i giorni: leggera e facile, fa tutto.", top: .95, acc: .95, agile: 1.12, wh: 1.1, climb: 1, snd: { fm: 1.3, bf: 1.2, nz: .8 } },
  { id: 'hard300', name: 'HARD ENDURO 300', glb: 'hard300', fit: [.46, 1.36, -.41, 1.065], txt: "Due tempi da Erzberg: sale ovunque e impenna con niente.", top: .97, acc: 1.15, agile: 1.15, wh: 1.5, climb: 1.35, snd: { smp: '2t', fm: 1.75, bf: 1.3, nz: 1.3 } },
  { id: 'trial', name: 'TRIAL DI GIACU', glb: 'trial', fit: [.5, 1.45, -.27, .99], txt: "Lenta sul dritto, ma sale sui muri e gira su se stessa.", top: .78, acc: 1.05, agile: 1.3, wh: 1.6, climb: 1.5, snd: { smp: '2t', fm: 1.3, bf: .8, nz: .6 } },
  { id: 'pitbike', name: 'PIT BIKE DI SIRO', glb: 'pitbike', fit: [.44, 1.2, -.3, .903], txt: "Minimoto ridicola: agilissima e sempre su una ruota, sul dritto la passano tutti.", top: .72, acc: .85, agile: 1.35, wh: 1.7, climb: .8, snd: { fm: 1.9, bf: 1.7, nz: 1.6 } },
  { id: 'adventure', name: 'T7 BO-ANAL', glb: 'adventure', fit: [.5, 1.5, -.25, 1.011], txt: "Bicilindrica da viaggio: veloce e comoda, nello stretto è un armadio.", top: 1.1, acc: 1.1, agile: .9, wh: .9, climb: 1.1, snd: { smp: 'tw', fm: 1.5, bf: 1, nz: .9 } },
  { id: 'dakar', name: 'RALLY DAKAR 450', glb: 'dakar', fit: [.4, 1.31, -.24, 1.063], txt: "Fatta per il deserto: lunga e velocissima, in curva ci pensa su.", top: 1.15, acc: 1.05, agile: .85, wh: .8, climb: 1.05, snd: { fm: 1.12, bf: 1.1 } },
  { id: 'bestia', name: 'LA BESTIA 690', glb: 'bestia', fit: [.5, 1.49, -.34, 1.173], txt: "La più potente: sul dritto non la prende nessuno, poi bisogna fermarla.", top: 1.18, acc: 1.2, agile: .8, wh: 1, climb: 1.15, snd: { fm: .88, bf: .85, nz: .7 } },
  { id: 'vintage', name: "VECCHIA GLORIA '89", glb: 'vintage', fit: [.47, 1.39, -.26, .921], txt: "Due tempi di una volta: fuma, vibra e va piano. Ma che stile.", top: .9, acc: .88, agile: .95, wh: .8, climb: .9, snd: { smp: '2t', fm: 1.5, bf: .7, nz: 1.5, pk: [1300, 5, 2] } },
  { id: 'electric', name: 'LA SILENZIOSA', glb: 'electric', fit: [.46, 1.43, -.29, 1.133], txt: "Elettrica: niente marce e niente rumore, scatta subito.", top: 1.05, acc: 1.3, agile: 1.05, wh: 1.2, climb: 1.2, snd: { el: 1, nz: .3 } },
];
export const motoById = id => MOTO.find(m => m.id === id) || MOTO[0];
