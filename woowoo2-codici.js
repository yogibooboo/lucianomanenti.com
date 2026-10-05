// woowoo2 - i codici delle piastrelle: cosa fa ogni numero del tabellone.
// Non sono quadri, sono geometria di ferrovia: dicono che da una certa
// casella si entra da est e si esce a sud, che un'altra e' una stazione che
// apre a nord, quali numeri si possono manovrare e quali sono semafori.
// Servono a qualunque tracciato, nostro o no, e per questo stanno qui e non
// insieme ai quadri estratti dal dischetto.
//
// Il contenitore se lo fa da solo se non lo trova gia' pronto. Cosi' il
// giorno che il dischetto non ci sara', il gioco avra' lo stesso di che
// disegnare. Se invece c'e', e' stato caricato PRIMA di questo file e qui
// non si tocca: si aggiungono solo le tabelle. L'ordine dei due <script>
// conta, ed e' quello.
//
// IL NUMERO E' LA COLONNA DELLA TAVOLA DI PIASTRELLE. Il motore disegna con
// drawImage(atlante, cod*cella, stato*cella, ...) e non c'e' nessuna tabella
// di mezzo: cambiare un numero qui vuol dire spostare una colonna nei PNG.
// L'ordine e' il nostro, quello della tavolozza dell'editor, e non ha buchi:
//    0  prato
//    1  dritto EO
//    2  dritto NS
//    3  curva ES
//    4  curva SO
//    5  curva NE
//    6  curva NO
//    7  ponte EO
//    8  incrocio piano EO/NS
//    9  scambio NS/ES
//   10  scambio NS/SO
//   11  scambio NS/NE
//   12  scambio NS/NO
//   13  scambio EO/SO
//   14  scambio EO/NO
//   15  scambio EO/ES
//   16  scambio EO/NE
//   17  segnale EO
//   18  segnale NS
//   19  stazione, bocca a O
//   20  stazione, bocca a S
//   21  stazione, bocca a E
//   22  stazione, bocca a N
//   23  tabellone (campo info)
//   24  trattore e pecore
//   25  fienile
//   26  stagno
//   27  alberi
//   28  fiume NS
//   29  stagno con isola
//   30  aia recintata
window.W2DATI = window.W2DATI || { ordine: [], liv: {} };

// Da dove si entra e dove si esce. Ogni voce e' l'elenco degli stati del
// pezzo: uno scambio ne ha due, il dritto e il deviato, un binario fisso uno
// solo. `EO' vuol dire che collega est e ovest, `NE' nord ed est.
window.W2DATI.rotta = {"1":["EO"],"2":["NS"],"3":["ES"],"4":["SO"],"5":["NE"],"6":["NO"],"7":["EO"],"8":["EO","NS"],"9":["NS","ES"],"10":["NS","SO"],"11":["NS","NE"],"12":["NS","NO"],"13":["EO","SO"],"14":["EO","NO"],"15":["EO","ES"],"16":["EO","NE"],"17":["EO","EO"],"18":["NS","NS"]};

// I pezzi che si manovrano: cliccandoci sopra passano da uno stato all'altro
// e il treno cambia strada.
window.W2DATI.scambio = [8,9,10,11,12,13,14,15,16];

// I semafori. Si cliccano uguale, ma quello che cambia e' il via libera.
window.W2DATI.segnale = [17,18];

// Le stazioni, e da che lato si affacciano sui binari: `O' apre a ovest.
window.W2DATI.staz = {"19":"O","20":"S","21":"E","22":"N"};

// La casella nera del tabellone: ormai e' solo paesaggio.
window.W2DATI.info = 23;
