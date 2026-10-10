// EDT Giro Easy · v89 · dati dei percorsi separati da game.js: schede (tipo, ostacoli, speciale, consiglio)
// e regole della Sfida del giorno. Solo dati, niente logica.

export const DAILY_RULES = [
  { id: 'noturbo', icon: '🚫', name: 'NIENTE TURBO', desc: 'Oggi il turbo è rotto: solo gas e manico (i compagni vanno un filo più piano).' },
  { id: 'jumps', icon: '🦘', name: 'SALTI DOPPI', desc: 'Ogni salto e ogni trick vale il doppio.' },
  { id: 'rain', icon: '🌧', name: 'DILUVIO', desc: 'Piove dall’inizio alla fine: fango dappertutto.' },
  { id: 'fog', icon: '🌫', name: 'NEBBIA FITTA', desc: 'Nebbia per tutto il giro: segui le fettucce.' },
  { id: 'night', icon: '🌑', name: 'NOTTURNA', desc: 'Si corre di notte: si vede solo col faro.' },
  { id: 'traction', icon: '⛽', name: 'SALITE VERE', desc: 'In salita gas dosato come a Dopo migliora: troppo pattina, poco ti pianti.' },
  { id: 'bar', icon: '🍺', name: 'GIRO DEI BAR', desc: 'Due soste al bar: birre e punti, ma poi la moto balla.' },
  { id: 'rush', icon: '⏱', name: 'DI CORSA', desc: 'Tempo limite 4 secondi più corto.' },
];

export const TRACK_INFO = {
  0: { tipo: 'Il classico tra le vigne', ostacoli: 'Tronchi, radici, ceppi, pozzanghere, gradoni, sassi e capre', speciale: 'Filari di viti, sosta al bar (+500 e 5 birre, ma la moto balla), il taglio delle 16.00', consiglio: 'Al bar passa sotto il tendone, poi correggi lo sbandamento col manubrio.' },
  1: { tipo: 'Salitoni col gas dosato', ostacoli: 'Più fango, pozze, gradoni, sassi e frane', speciale: 'In salita conta la trazione: tieni la lancetta nel verde. Gas sempre aperto = la ruota pattina; poco gas = ti pianti e devi spingere la moto', consiglio: 'In salita apri e chiudi il gas a ritmo, non tenerlo sempre premuto.' },
  2: { tipo: 'Gara di salto nel burrone', ostacoli: 'Nessuno in discesa; pietroni nella zona di atterraggio', speciale: 'Scope volanti che danno velocità: più veloce arrivi al bordo, più lontano voli. Classifica anche del salto più lungo', consiglio: 'Prendi tutte le scope tenendo il GAS, poi in volo lancetta nel verde e corsia del bersaglio verde.' },
  3: { tipo: 'Tracciato del giorno', ostacoli: 'Cambiano ogni giorno', speciale: 'Uguale per tutti, con una regola diversa ogni giorno (niente turbo, salti doppi, diluvio, notturna…): classifica che si azzera a mezzanotte', consiglio: 'Primo giro per imparare il tracciato, secondo per fare il tempo.' },
  9: { tipo: 'Pista di ghiaccio a curve', ostacoli: 'Nessuno: il pericolo è il muro di neve nei curvoni', speciale: 'Curvoni, esse e tornanti a U: punti derapata e porte da passare di traverso', consiglio: 'GAS in curva per mettere la moto di traverso e controsterza. Monta le gomme chiodate.' },
  10: { tipo: 'Notte e diluvio', ostacoli: 'Pietraie bagnate, gradoni viscidi, pozze, radici', speciale: 'Buio vero: vedi solo dove arriva il faro, i fulmini illuminano tutto per un attimo. Il fanale LED dell’officina aiuta', consiglio: 'Guarda il cono del faro e approfitta dei lampi per leggere la pista lontana.' },
  11: { tipo: 'Valle alpina selvaggia', ostacoli: 'Sassi, ometti di pietra, marmotte', speciale: 'Guadi su tutta la pista da saltare e stambecchi, camosci e capre che attraversano', consiglio: 'Al guado salta: se no scarponi pieni d’acqua.' },
  12: { tipo: 'Slalom nel bosco', ostacoli: 'Alberi in pista: non si saltano, si schivano', speciale: 'Varco che cambia corsia a ogni fila: bonus slalom a catena. A ogni albero preso arriva Erika', consiglio: 'Guarda due file avanti, non quella davanti alla ruota.' },
  13: { tipo: 'Fuga dalle GEV', ostacoli: 'Birilli, copertoni, cartelli e transenne lanciati dalla jeep', speciale: 'Le moto sono i tentativi: finiti quelli (o il tempo) arriva la multa', consiglio: 'Turbo o grappa per seminare la jeep.' },
  14: { tipo: 'Fango e trattori', ostacoli: 'Pozzanghere, balle di fieno, ceppi e qualche albero', speciale: 'Il Gusta passa di traverso con il trattore e la trincia: non si salta, si schiva. Partenza dalla cascina sulle colline', consiglio: 'Quando senti arrivare il Gusta, vai sulla corsia delle birre.' },
};
