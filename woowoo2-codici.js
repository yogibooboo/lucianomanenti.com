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
window.W2DATI = window.W2DATI || { ordine: [], liv: {} };

// Da dove si entra e dove si esce. Ogni voce e' l'elenco degli stati del
// pezzo: uno scambio ne ha due, il dritto e il deviato, un binario fisso uno
// solo. `EO' vuol dire che collega est e ovest, `NE' nord ed est.
window.W2DATI.rotta = {"0":["EO","NS"],"1":["NS","ES"],"2":["NS","SO"],"3":["NS","NE"],"4":["NS","NO"],"5":["EO","SO"],"6":["EO","NO"],"7":["EO","ES"],"8":["EO","NE"],"9":["EO","EO"],"10":["NS","NS"],"22":["EO"],"23":["NS"],"24":["ES"],"25":["SO"],"26":["NE"],"27":["NO"],"40":["EO"]};

// I pezzi che si manovrano: cliccandoci sopra passano da uno stato all'altro
// e il treno cambia strada.
window.W2DATI.scambio = [0,1,2,3,4,5,6,7,8];

// I semafori. Si cliccano uguale, ma quello che cambia e' il via libera.
window.W2DATI.segnale = [9,10];

// Le stazioni, e da che lato si affacciano sui binari: `O' apre a ovest.
window.W2DATI.staz = {"28":"O","29":"S","30":"E","31":"N"};

// La casella nera del tabellone, quella che porta la targa.
window.W2DATI.info = 37;
