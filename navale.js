/* ============================================================================
   BATTAGLIA NAVALE (solitario logico) - Logica di Gioco (JavaScript)
   Una flotta nota e' nascosta in una griglia. I numeri a bordo di ogni riga e
   di ogni colonna dicono quante caselle di nave contengono. Non si spara: si
   deduce. Ogni schema ha una sola disposizione possibile.
   Stile e struttura coerenti con Calcolo Enigmatico, Campo Minato e Quadrati.
   ============================================================================ */

// === TESTI MULTILINGUA ===
const NAV_LANG = (window.currentLang === 'en') ? {
    partitaInCorso: 'Game in progress — good luck!',
    generazione: 'Generating puzzle...',
    generazioneAttendere: 'Please wait',
    generazioneFallita: 'Could not build a puzzle. Please try again.',
    schemaErrori: 'The grid is full but the fleet does not match',
    hintErrore: 'The highlighted square is <b>wrong</b>.',
    hintDeduzione: 'The highlighted square can be <b>deduced</b> from the numbers.',
    btnApplica: 'FILL IN THE SQUARE',
    btnCancellaErrore: 'CLEAR THE MISTAKE',
    hintPenalita: 'Penalty: +10 s now, +20 s more for the Explanation or filling it in (once).',
    vittoria: 'CONGRATULATIONS!<br>Fleet found!',
    tempo: 'Time',
    errori: 'Mistakes',
    suggerimenti: 'Hints',
    resetChiedi: 'OK?',
    nuovoRecord: ' — NEW ALL-TIME BEST!',
    flotta: 'Fleet',
    restano: 'Left',
    diffNames: {
        piccola: 'Small grid', media: 'Medium grid', grande: 'Large grid'
    },
    naveNomi: { 4: 'Battleship', 3: 'Cruiser', 2: 'Destroyer', 1: 'Submarine' },
    // Spiegazioni del suggerimento: una per tipo di deduzione
    spiegaRigaPiena: function (n, tipo) {
        return 'In ' + (tipo === 'riga' ? 'this row' : 'this column') + ' the ' + n +
            ' remaining squares are exactly the ones still free: they must all be ship.';
    },
    spiegaRigaVuota: function (tipo) {
        return 'The count for ' + (tipo === 'riga' ? 'this row' : 'this column') +
            ' is already complete: every other square must be water.';
    },
    spiegaDiagonale: 'Ships never touch, not even at a corner: the square diagonally next to a ship must be water.',
    spiegaContorno: 'This ship is complete: all the squares around it must be water.',
    spiegaUnica: 'Trying the other value here leaves the puzzle with no solution: only this one works.',
    riepilogo: function (diff, tempo, errori, hints) {
        return NAV_LANG.diffNames[diff] + ' — ' + NAV_LANG.tempo + ': ' + tempo +
            ' — ' + NAV_LANG.errori + ': ' + errori + ' — ' + NAV_LANG.suggerimenti + ': ' + hints;
    }
} : {
    partitaInCorso: 'Partita in corso — buona fortuna!',
    generazione: 'Generazione dello schema...',
    generazioneAttendere: 'Attendere',
    generazioneFallita: 'Non è stato possibile preparare lo schema. Riprova.',
    schemaErrori: 'La griglia è piena ma la flotta non torna',
    hintErrore: 'La casella evidenziata è <b>sbagliata</b>.',
    hintDeduzione: 'La casella evidenziata è <b>deducibile</b> dai numeri.',
    btnApplica: 'SEGNA LA CASELLA',
    btnCancellaErrore: 'CANCELLA L\'ERRORE',
    hintPenalita: 'Penalit&agrave;: +10 s ora, +20 s per la Spiegazione o per segnarla (una volta sola).',
    vittoria: 'COMPLIMENTI!<br>Flotta trovata!',
    tempo: 'Tempo',
    errori: 'Errori',
    suggerimenti: 'Suggerimenti',
    resetChiedi: 'OK?',
    nuovoRecord: ' — NUOVO RECORD ASSOLUTO!',
    flotta: 'Flotta',
    restano: 'Restano',
    diffNames: {
        piccola: 'Griglia piccola', media: 'Griglia media', grande: 'Griglia grande'
    },
    naveNomi: { 4: 'Corazzata', 3: 'Incrociatore', 2: 'Cacciatorpediniere', 1: 'Sottomarino' },
    spiegaRigaPiena: function (n, tipo) {
        return 'In questa ' + (tipo === 'riga' ? 'riga' : 'colonna') + ' le ' + n +
            ' caselle che mancano sono esattamente quelle ancora libere: sono tutte nave.';
    },
    spiegaRigaVuota: function (tipo) {
        return 'Il conto di questa ' + (tipo === 'riga' ? 'riga' : 'colonna') +
            ' è già completo: tutte le altre caselle sono per forza acqua.';
    },
    spiegaDiagonale: 'Le navi non si toccano mai, nemmeno per un angolo: la casella in diagonale a una nave è per forza acqua.',
    spiegaContorno: 'Questa nave è completa: tutte le caselle che la circondano sono acqua.',
    spiegaUnica: 'Provando l\'altro valore lo schema resta senza soluzione: solo questo funziona.',
    riepilogo: function (diff, tempo, errori, hints) {
        return NAV_LANG.diffNames[diff] + ' — ' + NAV_LANG.tempo + ': ' + tempo +
            ' — ' + NAV_LANG.errori + ': ' + errori + ' — ' + NAV_LANG.suggerimenti + ': ' + hints;
    }
};

// === CONFIGURAZIONE DEI LIVELLI ===
// I livelli cambiano la dimensione della griglia e la flotta, non il tipo di
// ragionamento: le deduzioni sono sempre le stesse (conteggi di riga e colonna,
// navi che non si toccano, contorno d'acqua). Una griglia piu' grande vuol dire
// piu' incroci da tenere insieme, quindi catene deduttive piu' lunghe.
//
// La flotta e' elencata per lunghezza decrescente, come nella tradizione: la
// nave piu' lunga e' quella che si incastra peggio, e piazzarla per prima
// riduce di molto i tentativi a vuoto del generatore.
//   piccola  6x6  -> 3+2+2+1+1+1     = 10 caselle su 36 (28%)
//   media    8x8  -> 4+3+3+2+2+2+1+1+1+1 = 20 su 64 (31%)
//   grande  10x10 -> 4+4+3+3+3+2+2+2+2+1+1+1+1 = 29 su 100 (29%)
// La densita' e' tenuta vicina al 30% in tutti e tre: sotto, lo schema si
// risolve quasi tutto con le righe a zero; sopra, le navi si incastrano cosi'
// tanto che il generatore fatica a trovare disposizioni uniche.
const NAV_LIVELLI = {
    // La cella e' tarata sulla fascia della griglia (640x500): spostando flotta
    // e messaggio fuori dai fianchi del mare si e' liberata larghezza, e le
    // caselle sono cresciute di conseguenza. Restano un paio di pixel di margine
    // rispetto al massimo teorico, cosi' il mare non tocca i bordi della fascia.
    piccola: { lato: 6, flotta: [3, 2, 2, 1, 1, 1], cella: 68 },
    media: { lato: 8, flotta: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], cella: 52 },
    grande: { lato: 10, flotta: [4, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1], cella: 42 }
};
const NAV_LIVELLO_DEF = 'media';

// === PENALITÀ SUL TEMPO (secondi aggiunti al cronometro) ===
const PENALITA_AIUTO = 10;         // apertura del suggerimento (casella evidenziata)
const PENALITA_AIUTO_EXTRA = 20;   // spiegazione o applicazione (una volta sola)
const PENALITA_ERRORE = 30;        // segno sbagliato rispetto alla soluzione

// === CODICI DELLE CASELLE ===
// Soluzione: 0 = acqua, 1 = nave. Griglia del giocatore: tre stati, perche'
// "non lo so ancora" e "e' acqua" sono due cose diverse ed e' proprio la
// differenza su cui si ragiona.
const VUOTO = 0, ACQUA = 1, NAVE = 2;

// === STATO GLOBALE ===
let lato = 8;
let flotta = [];           // lunghezze delle navi, decrescenti
let cellaPx = 44;
let soluzione = [];        // matrice latoxlato: 0 acqua, 1 nave
let griglia = [];          // matrice latoxlato: VUOTO/ACQUA/NAVE (il giocatore)
let contiRighe = [];       // quante caselle di nave per riga
let contiColonne = [];     // quante caselle di nave per colonna
let rivelate = [];         // caselle date in partenza: non si toccano
// Quali acque le ha messe l'opzione e non il giocatore. Serve per rifarle da
// zero a ogni mossa senza cancellare quelle segnate a mano: una volta scritte
// nella griglia le due sono identiche, e senza questa memoria un'acqua messa
// dal giocatore in un punto che le regole non impongono sparirebbe al primo
// click successivo.
let autoAcqua = [];

let difficolta = NAV_LIVELLO_DEF;
let erroriCount = 0;
let hintCount = 0;
let secondi = 0;
let timerId = null;
let cronologia = [];       // stack per undo: { r, c, prec }
let partitaFinita = false;
let ultimoMouseX = -1;
let ultimoMouseY = -1;

// Caselle gia' costate un errore: senza memoria, togliere e rimettere lo stesso
// segno sbagliato accumulerebbe penalita' a vuoto (stessa scelta del Calcolo).
let cellePunite = {};

// Opzioni persistenti
let opzErrori = true;        // segnala subito i segni sbagliati
let opzAutoAcqua = false;    // annerisce da se' il contorno delle navi complete

let records = {};

// Bersaglio del Suggerimento a due fasi: { tipo, r, c, valore, motivo }
let hintTarget = null;

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

function rnd(n) { return Math.floor(Math.random() * n); }

function matriceVuota(n, v) {
    const m = [];
    for (let r = 0; r < n; r++) m.push(new Array(n).fill(v));
    return m;
}

function dentro(r, c) { return r >= 0 && r < lato && c >= 0 && c < lato; }

// === GENERATORE ===
// Piazza la flotta a caso, poi verifica che i conti di riga e colonna che ne
// derivano ammettano una sola disposizione. Le navi non si toccano nemmeno di
// diagonale: e' la regola che rende lo schema deducibile, perche' ogni nave
// trovata annerisce d'acqua tutto il suo contorno.

// La nave sta nella griglia e non tocca nessun'altra nave (nemmeno per un
// angolo)? Si controlla l'intero rettangolo che la circonda.
function puoPiazzare(m, r, c, len, orizzontale) {
    const dr = orizzontale ? 0 : 1, dc = orizzontale ? 1 : 0;
    const rf = r + dr * (len - 1), cf = c + dc * (len - 1);
    if (!dentro(r, c) || !dentro(rf, cf)) return false;
    for (let i = -1; i <= len; i++) {
        for (let j = -1; j <= 1; j++) {
            const rr = r + dr * i + (orizzontale ? j : 0);
            const cc = c + dc * i + (orizzontale ? 0 : j);
            if (dentro(rr, cc) && m[rr][cc] === 1) return false;
        }
    }
    return true;
}

function scriviNave(m, r, c, len, orizzontale, v) {
    const dr = orizzontale ? 0 : 1, dc = orizzontale ? 1 : 0;
    for (let i = 0; i < len; i++) m[r + dr * i][c + dc * i] = v;
}

// Dispone tutta la flotta a caso. Torna la matrice o null se non ci riesce
// entro i tentativi concessi: con navi lunghe su griglia piccola capita, e
// riprovare da capo costa meno che tornare indietro nave per nave.
function disponiFlotta() {
    for (let tentativo = 0; tentativo < 200; tentativo++) {
        const m = matriceVuota(lato, 0);
        let ok = true;
        for (const len of flotta) {
            let piazzata = false;
            for (let t = 0; t < 300 && !piazzata; t++) {
                const orizzontale = (len === 1) ? true : (rnd(2) === 0);
                const r = rnd(lato), c = rnd(lato);
                if (puoPiazzare(m, r, c, len, orizzontale)) {
                    scriviNave(m, r, c, len, orizzontale, 1);
                    piazzata = true;
                }
            }
            if (!piazzata) { ok = false; break; }
        }
        if (ok) return m;
    }
    return null;
}

function contiDa(m) {
    const cr = new Array(lato).fill(0), cc = new Array(lato).fill(0);
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            if (m[r][c] === 1) { cr[r]++; cc[c]++; }
        }
    }
    return { righe: cr, colonne: cc };
}

// === CONTEGGIO DELLE SOLUZIONI ===
// Enumera le disposizioni della flotta compatibili con i conti, fermandosi a
// `limite`. Serve sia a garantire l'unicita' dello schema sia al motore dei
// suggerimenti, che chiede "se qui ci fosse l'altro valore, resterebbe
// risolvibile?".
//
// Si procede nave per nave, dalla piu' lunga. Le navi della stessa lunghezza
// sono intercambiabili: per non contare N! volte la stessa disposizione, a
// parita' di lunghezza si impone un ordine di piazzamento crescente sulla
// posizione. Senza questo accorgimento uno schema unico risulterebbe multiplo
// e il generatore scarterebbe tutto.
//
// Tetto di nodi esplorati per singola chiamata. Senza, sulla griglia 10x10 una
// sola chiamata puo' girare per minuti: la scadenza del generatore veniva
// controllata solo fra un tentativo e l'altro, quindi non serviva a nulla e in
// pagina avrebbe congelato la scheda. Superato il tetto la chiamata si ferma e
// lo dichiara con `interrotto`: chi la usa deve trattare il risultato come
// "non lo so", mai come "non ci sono altre soluzioni".
// I tre tetti della generazione. I valori stretti di prima (400k nodi, 6s
// totali, 2,5s di sfoltimento) tagliavano lo sfoltimento a meta' sulla 10x10 e
// lasciavano in tavola rivelate che si potevano togliere. Misurati i tempi veri
// in pagina, si e' visto che largheggiare costa poco: 6x6 e 8x8 stanno sotto i
// 25 ms, e la 10x10 sta di norma su 1-3 secondi (il caso peggiore osservato e'
// 7-11 secondi, raro). In cambio lo sfoltimento arriva in fondo e la 10x10
// scopre 4-10 caselle su 29 invece di piu' della meta'.
// I tetti restano perche' sono la rete di sicurezza contro il caso patologico:
// non servono piu' a limitare l'attesa normale, ma a garantire che una ricerca
// impazzita si fermi comunque. Il costo dell'attesa e' coperto dall'avviso
// grande dentro la modale, non dal tetto.
const MAX_NODI = 20000000;
const MS_GENERAZIONE = 120000;
const MS_SFOLTIMENTO = 90000;

function contaDisposizioni(cr, cc, limite, fissi) {
    let nodi = 0;
    let interrotto = false;
    const m = matriceVuota(lato, 0);
    // Quanto manca ancora a ogni riga/colonna: si scala man mano che si piazza,
    // ed e' quello che permette di potare presto i rami senza speranza.
    const restaR = cr.slice(), restaC = cc.slice();
    let trovate = 0;
    let ultima = null;

    // Vincoli imposti dall'esterno (motore dei suggerimenti): caselle che
    // DEVONO essere nave o acqua. Si tengono in due matrici invece che in una
    // lista perche' vanno consultate a ogni piazzamento: controllarli solo
    // sulla disposizione finita vorrebbe dire esplorare per intero rami che si
    // potevano scartare alla prima nave.
    const obbNave = matriceVuota(lato, 0);   // qui ci deve essere nave
    const obbAcqua = matriceVuota(lato, 0);  // qui non ci puo' essere nave
    let naviObbligate = 0;
    if (fissi) {
        for (const v of fissi) {
            if (v.val === NAVE) { obbNave[v.r][v.c] = 1; naviObbligate++; }
            else obbAcqua[v.r][v.c] = 1;
        }
    }

    // Caselle ancora disponibili per riga e per colonna. E' la potatura che
    // conta davvero: senza, una riga che chiede 3 caselle ma ne ha una sola
    // libera resta "possibile" fino in fondo e ci si esplora sotto un albero
    // intero. Una casella smette di essere disponibile quando ci finisce sopra
    // una nave, quando diventa acqua di contorno di una nave, o quando e'
    // acqua obbligata da un vincolo esterno.
    const liberoR = new Array(lato).fill(0);
    const liberoC = new Array(lato).fill(0);
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            if (!obbAcqua[r][c]) { liberoR[r]++; liberoC[c]++; }
        }
    }

    // Quante caselle di nave restano da piazzare dopo la nave i-esima
    const codaFlotta = new Array(flotta.length + 1).fill(0);
    for (let i = flotta.length - 1; i >= 0; i--) codaFlotta[i] = codaFlotta[i + 1] + flotta[i];

    // Quante navi gia' piazzate "occupano" una casella, o come scafo o come
    // contorno. Serve un contatore e non un flag: il contorno di due navi
    // vicine si sovrappone, e scalando liberoR/liberoC a ogni sovrapposizione
    // il conto delle caselle disponibili scendeva sotto il vero, facendo
    // scartare rami perfettamente validi (il generatore restituiva 0 soluzioni
    // anche su schemi che una soluzione ce l'avevano di sicuro).
    const occ = matriceVuota(lato, 0);

    // Occupa (d=+1) o libera (d=-1) una casella. liberoR/liberoC cambiano solo
    // sul primo occupante e sull'ultimo che se ne va.
    function tocca(r, c, d) {
        if (d > 0) {
            occ[r][c]++;
            if (occ[r][c] === 1) { liberoR[r]--; liberoC[c]--; }
        } else {
            occ[r][c]--;
            if (occ[r][c] === 0) { liberoR[r]++; liberoC[c]++; }
        }
    }

    // Percorre le caselle del contorno di una nave (esclusa la nave stessa)
    function perContorno(r, c, len, orizzontale, fn) {
        const dr = orizzontale ? 0 : 1, dc = orizzontale ? 1 : 0;
        for (let i = -1; i <= len; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i >= 0 && i < len && j === 0) continue;   // e' la nave, non il contorno
                const rr = r + dr * i + (orizzontale ? j : 0);
                const cc2 = c + dc * i + (orizzontale ? 0 : j);
                if (dentro(rr, cc2)) fn(rr, cc2);
            }
        }
    }

    // Caselle rivelate non ancora coperte da una nave. Controllarle solo sulla
    // disposizione finita era il vero collo di bottiglia: piu' caselle si
    // rivelavano piu' la ricerca RALLENTAVA, perche' i vincoli non tagliavano
    // nulla e si esploravano per intero sottoalberi gia' condannati. Qui invece
    // ogni piazzamento aggiorna il conto e i rami senza speranza cadono subito.
    let scoperte = naviObbligate;

    // Il ramo puo' ancora chiudersi? Ogni riga deve poter contenere quello che
    // le manca, la somma di cio' che manca deve coincidere con le navi non
    // ancora piazzate, e le rivelate ancora scoperte devono poter essere
    // coperte da quello che resta.
    function possibileAncora(indiceNave) {
        // Non basteranno le caselle di nave rimaste a coprire le rivelate
        if (scoperte > codaFlotta[indiceNave]) return false;
        let sommaR = 0;
        for (let r = 0; r < lato; r++) {
            if (restaR[r] < 0 || restaR[r] > liberoR[r]) return false;
            sommaR += restaR[r];
        }
        for (let c = 0; c < lato; c++) {
            if (restaC[c] < 0 || restaC[c] > liberoC[c]) return false;
        }
        return sommaR === codaFlotta[indiceNave];
    }

    // Una rivelata che finisce nel contorno di una nave non potra' mai piu'
    // essere coperta: quel ramo e' morto, e accorgersene qui evita di
    // esplorarlo tutto.
    function contornoUccideRivelata(r, c, len, orizzontale) {
        let morto = false;
        perContorno(r, c, len, orizzontale, function (rr, cc2) {
            if (obbNave[rr][cc2] && m[rr][cc2] !== 1) morto = true;
        });
        return morto;
    }

    function rec(i, minPos) {
        if (trovate >= limite || interrotto) return;
        if (++nodi > MAX_NODI) { interrotto = true; return; }
        if (!possibileAncora(i)) return;
        if (i === flotta.length) {
            // Tutte le caselle obbligate a nave devono essere state coperte.
            // Le obbligate ad acqua lo sono gia' per costruzione: quelle
            // caselle non vengono mai scelte.
            if (scoperte > 0) return;
            trovate++;
            ultima = m.map(function (rr) { return rr.slice(); });
            return;
        }

        const len = flotta[i];
        // Navi uguali: si piazzano in ordine di posizione crescente, cosi' ogni
        // disposizione viene generata una volta sola (vedi il commento sopra).
        const stessaLunghezza = (i > 0 && flotta[i - 1] === len);
        const partenza = stessaLunghezza ? minPos : 0;

        for (let pos = partenza; pos < lato * lato; pos++) {
            const r = Math.floor(pos / lato), c = pos % lato;
            // Il sottomarino ha un solo orientamento: contarlo due volte
            // duplicherebbe ogni disposizione che lo contiene.
            const orientamenti = (len === 1) ? [true] : [true, false];
            for (const orizzontale of orientamenti) {
                if (!puoPiazzare(m, r, c, len, orizzontale)) continue;

                const dr = orizzontale ? 0 : 1, dc = orizzontale ? 1 : 0;
                let scarta = false;
                for (let k = 0; k < len; k++) {
                    const rr = r + dr * k, cc2 = c + dc * k;
                    // Sopra un'acqua obbligata non ci va niente, e la riga o la
                    // colonna devono avere ancora posto nel loro conto.
                    if (obbAcqua[rr][cc2] || restaR[rr] <= 0 || restaC[cc2] <= 0) { scarta = true; break; }
                }
                if (scarta) continue;
                if (naviObbligate > 0 && contornoUccideRivelata(r, c, len, orizzontale)) continue;

                // Piazza: nave, conti, e disponibilita' di nave + contorno
                scriviNave(m, r, c, len, orizzontale, 1);
                let copre = 0;
                for (let k = 0; k < len; k++) {
                    const rr = r + dr * k, cc2 = c + dc * k;
                    restaR[rr]--; restaC[cc2]--;
                    tocca(rr, cc2, 1);
                    if (obbNave[rr][cc2]) copre++;
                }
                scoperte -= copre;
                const toccate = [];
                perContorno(r, c, len, orizzontale, function (rr, cc2) {
                    // Un'acqua obbligata e' gia' fuori dal conto delle libere in
                    // partenza: passarla a tocca() la toglierebbe una seconda volta.
                    if (obbAcqua[rr][cc2]) return;
                    toccate.push([rr, cc2]);
                    tocca(rr, cc2, 1);
                });

                rec(i + 1, pos + 1);

                for (const t of toccate) tocca(t[0], t[1], -1);
                scoperte += copre;
                for (let k = 0; k < len; k++) {
                    const rr = r + dr * k, cc2 = c + dc * k;
                    restaR[rr]++; restaC[cc2]++;
                    tocca(rr, cc2, -1);
                }
                scriviNave(m, r, c, len, orizzontale, 0);

                if (trovate >= limite || interrotto) return;
            }
        }
    }

    rec(0, 0);
    return { sol: trovate, mappa: ultima, interrotto: interrotto };
}

// Genera uno schema con disposizione unica. Se i conti da soli non bastano si
// scoprono alcune caselle in partenza: e' quello che fanno anche gli schemi
// stampati, e resta un puzzle onesto perche' le caselle rivelate sono parte
// dell'enunciato, non un aiuto pagato.
function generaPuzzle() {
    const scadenza = Date.now() + MS_GENERAZIONE;   // tetto di sicurezza: non bloccare la pagina
    while (Date.now() < scadenza) {
        const m = disponiFlotta();
        if (!m) continue;
        const conti = contiDa(m);

        let riv = matriceVuota(lato, 0);
        let r = contaDisposizioni(conti.righe, conti.colonne, 2, null);
        // Ricerca troncata: non sappiamo se lo schema sia unico, e uno schema
        // ambiguo sarebbe irrisolvibile per deduzione. Si ributta via.
        if (r.interrotto) continue;
        if (r.sol === 0) continue;   // non dovrebbe accadere: la flotta piazzata e' una soluzione

        if (r.sol === 1) {
            return { sol: m, cr: conti.righe, cc: conti.colonne, riv: riv };
        }

        // Piu' di una disposizione: si scoprono caselle finche' non ne resta una
        // sola. Si sceglie a caso fra le caselle di nave, che sono l'informazione
        // che vale di piu': una casella d'acqua in mezzo al mare non restringe
        // quasi nulla.
        const candidate = [];
        for (let rr = 0; rr < lato; rr++)
            for (let cc2 = 0; cc2 < lato; cc2++)
                if (m[rr][cc2] === 1) candidate.push({ r: rr, c: cc2 });
        for (let i = candidate.length - 1; i > 0; i--) {
            const j = rnd(i + 1);
            [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        }

        // Scoprire una casella alla volta e ricontare ogni volta e' la strada
        // ovvia ma e' anche la piu' cara: dimostrare "esattamente una" costa
        // molto piu' che trovarne due, e sulla griglia grande i conti da soli
        // non bastano praticamente mai, quindi si pagava quel conto caro a ogni
        // singolo passo e la generazione non arrivava in fondo.
        // Si fa il contrario: si scopre subito un blocco di caselle, che rende
        // lo schema unico quasi sempre, e poi si tolgono a una a una quelle di
        // cui si puo' fare a meno. Le rimozioni che falliscono costano poco
        // (si trovano subito due soluzioni), e lo schema finale resta minimale.
        // Il blocco iniziale si misura sulle caselle di nave, non sul numero di
        // navi: quello che rende unico lo schema e' la frazione di scafo
        // scoperta. Meta' e' sovrabbondante quasi sempre, ed e' voluto: lo
        // sfoltimento subito dopo rimette a posto, e partire abbondanti costa
        // molto meno che partire scarsi e non arrivare mai all'unicita'.
        // La frazione cresce con la griglia: piu' e' grande, piu' disposizioni
        // diverse reggono gli stessi conti, e partire scarsi vuol dire buttare
        // via tentativo dopo tentativo. Sul 10x10 il blocco al 70% e' anche il
        // piu' rapido per tentativo, non solo il piu' fortunato: con meno
        // vincoli la ricerca esplora molto di piu' prima di decidere.
        const fraz = (lato >= 10) ? 0.7 : (lato >= 8 ? 0.6 : 0.5);
        const caselleNave = candidate.length;
        const partenza = Math.max(2, Math.round(caselleNave * fraz));
        const scelte = candidate.slice(0, Math.min(partenza, candidate.length));
        const fissiDa = function (lista) {
            return lista.map(function (x) { return { r: x.r, c: x.c, val: NAVE }; });
        };

        let base = contaDisposizioni(conti.righe, conti.colonne, 2, fissiDa(scelte));
        if (base.interrotto || base.sol !== 1) continue;   // blocco iniziale insufficiente: si rigenera

        // Sfoltimento: una rivelata si toglie solo se senza di lei lo schema
        // resta unico. Un conteggio troncato vale come "non si puo' togliere":
        // meglio una rivelata in piu' che uno schema ambiguo.
        //
        // Lo sfoltimento costa una ricerca completa per casella, ed e' la voce
        // piu' cara di tutta la generazione: sulla griglia grande da sola
        // sforava il tetto dei 6 secondi. Si smette quando il tempo e' finito
        // invece di andare fino in fondo: qualche rivelata in piu' rende lo
        // schema un filo piu' facile, ma lo schema resta corretto e unico,
        // mentre sforare il tetto significherebbe far attendere il giocatore.
        // Allo sfoltimento si concede una fetta del tempo, non tutto: e' una
        // rifinitura, non una condizione di correttezza, e lo schema e' gia'
        // valido e unico prima di cominciare. Meglio consegnarlo subito con
        // qualche rivelata in piu' che far aspettare il giocatore per averne
        // due in meno.
        const fineSfoltimento = Math.min(scadenza, Date.now() + MS_SFOLTIMENTO);
        let tenute = scelte.slice();
        for (let k = scelte.length - 1; k >= 0; k--) {
            if (Date.now() >= fineSfoltimento) break;
            const senza = tenute.filter(function (x) { return x !== scelte[k]; });
            if (!senza.length) continue;
            const p = contaDisposizioni(conti.righe, conti.colonne, 2, fissiDa(senza));
            if (!p.interrotto && p.sol === 1) tenute = senza;
        }

        for (const t of tenute) riv[t.r][t.c] = 1;
        return { sol: m, cr: conti.righe, cc: conti.colonne, riv: riv };
    }
    return null;
}

// === PERSISTENZA (riprendi la partita dopo un reload) ===
function matriceToStr(m) {
    return m.map(function (r) { return r.join(''); }).join('|');
}
function strToMatrice(s) {
    return s.split('|').map(function (r) {
        return r.split('').map(function (ch) { return parseInt(ch, 10) || 0; });
    });
}

function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('navale-save');
        return;
    }
    try {
        localStorage.setItem('navale-save', JSON.stringify({
            diff: difficolta,
            lato: lato,
            sol: matriceToStr(soluzione),
            gri: matriceToStr(griglia),
            riv: matriceToStr(rivelate),
            // Senza questa, al riavvio le acque messe dall'opzione passerebbero
            // per segnate a mano e non verrebbero piu' ripulite quando smettono
            // di essere giustificate.
            aut: matriceToStr(autoAcqua),
            cr: contiRighe,
            cc: contiColonne,
            sec: secondi,
            err: erroriCount,
            hint: hintCount,
            punite: Object.keys(cellePunite)
        }));
    } catch (e) { /* storage pieno o disabilitato: si continua senza salvataggio */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('navale-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.sol || !s.gri || !s.cr) return false;

        difficolta = NAV_LIVELLI[s.diff] ? s.diff : NAV_LIVELLO_DEF;
        const liv = NAV_LIVELLI[difficolta];
        lato = s.lato | 0;
        // Un salvataggio di un'edizione con griglie diverse va scartato invece
        // di produrre una griglia storta.
        if (lato !== liv.lato) return false;
        flotta = liv.flotta.slice();
        cellaPx = liv.cella;

        soluzione = strToMatrice(s.sol);
        griglia = strToMatrice(s.gri);
        rivelate = s.riv ? strToMatrice(s.riv) : matriceVuota(lato, 0);
        autoAcqua = s.aut ? strToMatrice(s.aut) : matriceVuota(lato, 0);
        if (soluzione.length !== lato || griglia.length !== lato) return false;

        contiRighe = s.cr;
        contiColonne = s.cc;
        secondi = s.sec || 0;
        erroriCount = s.err || 0;
        hintCount = s.hint || 0;
        cellePunite = {};
        (s.punite || []).forEach(function (k) { cellePunite[k] = true; });
        cronologia = [];
        partitaFinita = false;
        hintTarget = null;
        return true;
    } catch (e) {
        return false;
    }
}

// Avviso di attesa dentro la modale di avvio. Il testo sta su due righe (titolo
// piu' "attendere"), quindi si costruisce qui una volta sola: era gia' scritto
// in due punti diversi, e tenerli separati voleva dire poterli far divergere.
// Le due stringhe passano da textContent, non da innerHTML: sono testo del
// dizionario, non marcatura, e comporre HTML a mano qui sarebbe un'abitudine
// sbagliata su un contenuto che un domani potrebbe non essere piu' costante.
function mostraAvvisoGenerazione() {
    const avviso = document.getElementById('msg-generazione');
    if (!avviso) return;
    avviso.textContent = NAV_LANG.generazione;
    const sotto = document.createElement('span');
    sotto.className = 'msg-gen-attendere';
    sotto.textContent = NAV_LANG.generazioneAttendere;
    avviso.appendChild(sotto);
    avviso.classList.remove('msg-errore');
    avviso.style.display = 'block';
}

// === AVVIO NUOVA PARTITA ===
function nuovaPartita(diff) {
    if (!NAV_LIVELLI[diff]) diff = NAV_LIVELLO_DEF;
    difficolta = diff;
    localStorage.setItem('navale-difficolta', diff);

    const liv = NAV_LIVELLI[diff];
    lato = liv.lato;
    flotta = liv.flotta.slice();
    cellaPx = liv.cella;

    setMessaggio(NAV_LANG.generazione);
    // L'avviso vero e' quello dentro la modale: #messaggio-stato sta nel campo
    // di gioco, che fino a chiudiModali() e' coperto dalla modale stessa.
    mostraAvvisoGenerazione();

    // setTimeout per lasciare aggiornare il messaggio prima del calcolo
    setTimeout(function () {
        const gen = generaPuzzle();
        if (!gen) {
            const avvisoKo = document.getElementById('msg-generazione');
            if (avvisoKo) {
                // textContent sovrascrive anche il sottotitolo "attendere": qui
                // non si sta piu' aspettando niente, resta solo l'errore.
                avvisoKo.textContent = NAV_LANG.generazioneFallita;
                avvisoKo.classList.add('msg-errore');
            }
            setMessaggio(NAV_LANG.generazioneFallita, 'rosso');
            return;
        }

        soluzione = gen.sol;
        contiRighe = gen.cr;
        contiColonne = gen.cc;
        rivelate = gen.riv;
        griglia = matriceVuota(lato, VUOTO);
        autoAcqua = matriceVuota(lato, 0);
        // Le caselle scoperte in partenza fanno parte dell'enunciato: si
        // mostrano gia' segnate e non si possono cambiare.
        for (let r = 0; r < lato; r++)
            for (let c = 0; c < lato; c++)
                if (rivelate[r][c]) griglia[r][c] = NAVE;
        // Le caselle scoperte sono navi a tutti gli effetti, quindi l'acqua che
        // impongono e' dovuta gia' dalla prima schermata. Senza questa chiamata
        // l'opzione partiva accesa ma muta: cominciava a lavorare solo al primo
        // click del giocatore, e fino a quel momento le diagonali attorno alle
        // caselle dell'enunciato restavano vuote come se non le imponesse nessuno.
        rigeneraAutoAcqua();

        erroriCount = 0;
        hintCount = 0;
        secondi = 0;
        cronologia = [];
        cellePunite = {};
        partitaFinita = false;
        hintTarget = null;
        chiudiPannelloHint();

        const avvisoOk = document.getElementById('msg-generazione');
        if (avvisoOk) avvisoOk.style.display = 'none';
        chiudiModali();
        costruisciGriglia();
        renderTutto();
        avviaTimer();
        salvaPartita();
        setMessaggio(NAV_LANG.partitaInCorso);
        riproduciAudio('sounds/scala40/ding.mp3');
    }, 50);
}

// === TIMER ===
function avviaTimer() {
    if (timerId) clearInterval(timerId);
    aggiornaTimer();
    timerId = setInterval(function () {
        if (partitaFinita) return;
        secondi++;
        aggiornaTimer();
        if (secondi % 15 === 0) salvaPartita();   // salvataggio periodico del tempo
    }, 1000);
}

function formattaTempo(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function aggiornaTimer() {
    document.getElementById('info-tempo').textContent = formattaTempo(secondi);
}

// === RECORD (giornaliero / settimanale / assoluto, per difficoltà) ===
function chiaveGiorno(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function chiaveOggi() { return chiaveGiorno(new Date()); }

// Lunedì della settimana corrente, come chiave della settimana
function chiaveSettimana() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return chiaveGiorno(d);
}

function caricaRecords() {
    try {
        records = JSON.parse(localStorage.getItem('navale-records') || '{}') || {};
    } catch (e) {
        records = {};
    }
}

function salvaRecords() {
    try {
        localStorage.setItem('navale-records', JSON.stringify(records));
    } catch (e) { /* storage non disponibile */ }
}

function aggiornaRecords(sec) {
    const r = records[difficolta] || (records[difficolta] = {});
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();
    let nuovoAssoluto = false;

    if (!r.daily || r.daily.key !== oggi || sec < r.daily.sec) r.daily = { key: oggi, sec: sec };
    if (!r.weekly || r.weekly.key !== settimana || sec < r.weekly.sec) r.weekly = { key: settimana, sec: sec };
    if (!r.all || sec < r.all.sec) { r.all = { sec: sec, date: oggi }; nuovoAssoluto = true; }

    salvaRecords();
    renderRecord();
    return nuovoAssoluto;
}

function renderRecord() {
    const r = records[difficolta] || {};
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();
    document.getElementById('record-diff').textContent = NAV_LANG.diffNames[difficolta] || '';
    document.getElementById('record-oggi').textContent =
        (r.daily && r.daily.key === oggi) ? formattaTempo(r.daily.sec) : '--:--';
    document.getElementById('record-settimana').textContent =
        (r.weekly && r.weekly.key === settimana) ? formattaTempo(r.weekly.sec) : '--:--';
    document.getElementById('record-assoluto').textContent =
        r.all ? formattaTempo(r.all.sec) : '--:--';
}

// Azzeramento a due passi del singolo record: il primo click chiede conferma
// per 3 secondi, il secondo azzera. Senza conferma un click per sbaglio
// cancellerebbe lo storico di mesi.
function azzeraRecordSingolo(e) {
    const btn = e.currentTarget;
    const tipo = btn.dataset.tipo;
    if (!btn._timerConferma) {
        btn.textContent = NAV_LANG.resetChiedi;
        btn.classList.add('conferma');
        btn._timerConferma = setTimeout(function () {
            btn.textContent = '⟲';
            btn.classList.remove('conferma');
            btn._timerConferma = null;
        }, 3000);
    } else {
        clearTimeout(btn._timerConferma);
        btn._timerConferma = null;
        if (records[difficolta]) delete records[difficolta][tipo];
        salvaRecords();
        renderRecord();
        btn.textContent = '⟲';
        btn.classList.remove('conferma');
    }
}

// === COSTRUZIONE DELLA GRIGLIA ===
// Una griglia (lato+1)x(lato+1): la prima riga e la prima colonna ospitano i
// conti, il resto e' il mare. I conti stanno DENTRO la stessa griglia CSS e non
// in barre separate, cosi' restano allineati alle celle qualunque sia il lato.
function costruisciGriglia() {
    const g = document.getElementById('griglia-navale');
    g.innerHTML = '';
    const intest = Math.round(cellaPx * 0.62);
    g.style.gridTemplateColumns = intest + 'px repeat(' + lato + ', ' + cellaPx + 'px)';
    g.style.gridTemplateRows = intest + 'px repeat(' + lato + ', ' + cellaPx + 'px)';

    // Angolo in alto a sinistra: resta vuoto
    const angolo = document.createElement('div');
    angolo.className = 'nav-angolo';
    g.appendChild(angolo);

    // Intestazione delle colonne
    for (let c = 0; c < lato; c++) {
        const th = document.createElement('div');
        th.className = 'nav-conto nav-conto-col';
        th.id = 'conto-col-' + c;
        th.textContent = contiColonne[c];
        g.appendChild(th);
    }

    for (let r = 0; r < lato; r++) {
        const th = document.createElement('div');
        th.className = 'nav-conto nav-conto-rig';
        th.id = 'conto-rig-' + r;
        th.textContent = contiRighe[r];
        g.appendChild(th);

        for (let c = 0; c < lato; c++) {
            const cel = document.createElement('button');
            cel.className = 'nav-cella';
            cel.id = 'cel-' + r + '-' + c;
            cel.style.fontSize = Math.round(cellaPx * 0.5) + 'px';
            (function (rr, cc) {
                // Sinistro: acqua. Destro: nave. Sono i due gesti del gioco e
                // stanno sui due tasti, senza modi da armare: qui il valore da
                // segnare e' sempre uno dei due, quindi un selettore di modo
                // (come quello del Calcolo) sarebbe un passaggio in piu' a vuoto.
                // L'acqua sta sul sinistro perche' e' il segno che si mette piu'
                // spesso: risolvendo si annerisce molta piu' acqua di quanta nave
                // si trovi, e il gesto piu' frequente va sul tasto piu' comodo.
                cel.addEventListener('click', function () { clickCella(rr, cc, ACQUA); });
                cel.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    clickCella(rr, cc, NAVE);
                });
            })(r, c);
            g.appendChild(cel);
        }
    }
}

// === REGOLE DI DISEGNO DELLE NAVI ===
// Una casella di nave si disegna in base ai vicini: un sottomarino e' un
// tondo, una nave lunga ha due estremita' arrotondate e il corpo squadrato.
// E' la stessa convenzione degli schemi stampati e si legge molto meglio di
// tanti quadrati uguali.
function formaNave(r, c) {
    const su = dentro(r - 1, c) && griglia[r - 1][c] === NAVE;
    const giu = dentro(r + 1, c) && griglia[r + 1][c] === NAVE;
    const sx = dentro(r, c - 1) && griglia[r][c - 1] === NAVE;
    const dx = dentro(r, c + 1) && griglia[r][c + 1] === NAVE;

    if (!su && !giu && !sx && !dx) return 'sub';
    if (sx && dx) return 'oriz';
    if (su && giu) return 'vert';
    if (dx) return 'sx';     // estremita' sinistra di una nave orizzontale
    if (sx) return 'dx';
    if (giu) return 'top';
    if (su) return 'bot';
    return 'sub';
}

// === CONTEGGI E STATO DELLE RIGHE ===
function contaInRiga(r, val) {
    let n = 0;
    for (let c = 0; c < lato; c++) if (griglia[r][c] === val) n++;
    return n;
}

function contaInColonna(c, val) {
    let n = 0;
    for (let r = 0; r < lato; r++) if (griglia[r][c] === val) n++;
    return n;
}

// Quante caselle di nave restano da trovare in tutto.
// Al primo render la difficolta' e' gia' scelta (quindi `lato` e `flotta` ci
// sono) ma la partita no, e `griglia` e' ancora vuota: senza questa guardia si
// leggeva griglia[0][0] di un array inesistente e partiva un TypeError in
// console prima ancora che il giocatore vedesse la schermata iniziale.
function naviRimaste() {
    const totale = flotta.reduce(function (a, b) { return a + b; }, 0);
    if (!griglia.length) return totale;
    let messe = 0;
    for (let r = 0; r < lato; r++)
        for (let c = 0; c < lato; c++)
            if (griglia[r][c] === NAVE) messe++;
    return totale - messe;
}

// === INTERAZIONE ===
// Il click e' un ciclo su un solo valore: premere di nuovo sullo stesso segno lo
// toglie. Cosi' il sinistro fa acqua/vuoto e il destro nave/vuoto, senza modi da
// armare e senza un terzo gesto per cancellare.
function clickCella(r, c, valore) {
    if (partitaFinita) return;
    // Le caselle dell'enunciato non si toccano: cambiarle vorrebbe dire
    // cancellare parte del testo del problema.
    if (rivelate[r][c]) {
        riproduciAudio('sounds/scala40/knock.mp3');
        return;
    }

    const prec = griglia[r][c];
    const nuovo = (prec === valore) ? VUOTO : valore;

    cronologia.push({ r: r, c: c, prec: prec });
    if (cronologia.length > 400) cronologia.shift();
    griglia[r][c] = nuovo;

    // Segno sbagliato rispetto alla soluzione: conta come errore, con penalita'.
    // Si paga solo quando il segno viene messo (non quando si cancella) e una
    // volta sola per casella, altrimenti clicca-e-riclicca gonfierebbe il
    // contatore all'infinito.
    if (opzErrori && nuovo !== VUOTO && segnoErrato(r, c, nuovo) && !cellePunite[r + '-' + c]) {
        cellePunite[r + '-' + c] = true;
        erroriCount++;
        applicaPenalita(PENALITA_ERRORE, 'cel-' + r + '-' + c);
    }

    if (nuovo === NAVE) riproduciAudio('sounds/scala40/carta.mp3');

    // Acqua automatica: le diagonali di una nave e le righe/colonne che hanno
    // gia' tutte le loro navi sono acqua per forza. Segnarle a mano e' lavoro
    // meccanico, non deduzione. E' un'opzione perche' a qualcuno piace farlo a
    // mano: di default e' spenta.
    //
    // Si passa sempre da rigeneraAutoAcqua() e non da un'aggiunta incrementale
    // perche' non conta solo il caso "ho messo una nave": togliere un segno puo'
    // rendere ingiustificata un'acqua messa prima, e marcare acqua a mano puo'
    // completare una linea. L'unico modo corretto in tutti i casi e' ributtare
    // le acque automatiche e rifarle dallo stato attuale.
    if (opzAutoAcqua) rigeneraAutoAcqua();

    annullaSuggerimento(true);
    renderTutto();
    salvaPartita();
    controllaVittoria();
}

// Un segno e' errato se contraddice la soluzione
function segnoErrato(r, c, val) {
    if (!opzErrori) return false;
    const vero = soluzione[r][c] === 1 ? NAVE : ACQUA;
    return val !== vero;
}

// Le quattro diagonali di una casella di nave sono acqua per forza: le navi non
// si toccano nemmeno per un angolo. Vale a prescindere dal fatto che la nave sia
// completa, quindi si puo' segnare subito.
function annerisciContorno(r, c) {
    const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const d of diag) {
        const rr = r + d[0], cc = c + d[1];
        if (!dentro(rr, cc)) continue;
        if (griglia[rr][cc] !== VUOTO) continue;
        if (rivelate[rr][cc]) continue;
        // Non passa da cronologia come mossa a se': e' una conseguenza della
        // mossa appena fatta, e l'undo di quella deve toglierla insieme. Ci pensa
        // rigeneraAutoAcqua(), che rifa' tutte le acque automatiche da zero.
        griglia[rr][cc] = ACQUA;
        autoAcqua[rr][cc] = 1;
    }
}

// Una riga che ha gia' tutte le sue caselle di nave e' acqua per il resto: non
// c'e' niente da dedurre, e lasciarlo fare a mano e' solo lavoro meccanico.
// Non si guarda MAI la soluzione: si applica alla lettera quello che il
// giocatore ha marcato. Se ha sbagliato, l'acqua parte lo stesso e l'annulla la
// riporta indietro. Confrontare con la soluzione trasformerebbe l'opzione in un
// rilevatore d'errori mascherato: dal fatto che l'acqua non parte il giocatore
// dedurrebbe di aver sbagliato, cioe' l'informazione che la casella "segnala
// subito le caselle sbagliate" fa pagare con una penalita'.
function annerisciLineePiene() {
    let cambiato = false;
    for (let r = 0; r < lato; r++) {
        if (contaInRiga(r, NAVE) !== contiRighe[r]) continue;
        for (let c = 0; c < lato; c++) {
            if (griglia[r][c] !== VUOTO || rivelate[r][c]) continue;
            griglia[r][c] = ACQUA;
            autoAcqua[r][c] = 1;
            cambiato = true;
        }
    }
    for (let c = 0; c < lato; c++) {
        if (contaInColonna(c, NAVE) !== contiColonne[c]) continue;
        for (let r = 0; r < lato; r++) {
            if (griglia[r][c] !== VUOTO || rivelate[r][c]) continue;
            griglia[r][c] = ACQUA;
            autoAcqua[r][c] = 1;
            cambiato = true;
        }
    }
    return cambiato;
}

// Rifa' da zero le acque automatiche: si cancellano tutte e si riapplicano a
// partire dalle navi rimaste. Cosi' un undo che toglie una nave ripulisce anche
// il contorno che aveva generato, senza toccare le acque segnate a mano.
// Le acque a mano non sono distinguibili da quelle automatiche una volta
// scritte, quindi la ricostruzione si basa su un principio semplice: un'acqua
// in diagonale a una nave e' comunque corretta e puo' restare.
//
// Le due regole si rincorrono: un contorno puo' completare una riga, e l'acqua
// di una riga piena non aggiunge navi ma il giro va rifatto lo stesso perche'
// la prima passata sulle colonne girava su dati gia' vecchi. Si ripete finche'
// non cambia piu' niente. Il ciclo termina per forza: ogni giro che continua ha
// scritto almeno una casella VUOTO->ACQUA e le caselle sono finite; il tetto
// esplicito e' solo una cintura di sicurezza, non lo si raggiunge mai.
// Butta via le acque messe dall'opzione e le rifa' dallo stato attuale. Quelle
// segnate a mano restano dove sono: non le ha messe l'opzione e non e' compito
// suo toglierle. Serve rifarle tutte da zero, e non aggiungerne di nuove e
// basta, perche' una mossa puo' anche RENDERE INGIUSTIFICATA un'acqua di prima
// (si toglie una nave, e il suo contorno non ha piu' motivo di esistere).
function rigeneraAutoAcqua() {
    if (!opzAutoAcqua) return;
    for (let r = 0; r < lato; r++)
        for (let c = 0; c < lato; c++)
            if (autoAcqua[r][c]) { autoAcqua[r][c] = 0; if (!rivelate[r][c]) griglia[r][c] = VUOTO; }
    ricalcolaAutoAcqua();
}

function ricalcolaAutoAcqua() {
    if (!opzAutoAcqua) return;
    for (let giro = 0; giro < lato * lato; giro++) {
        for (let r = 0; r < lato; r++)
            for (let c = 0; c < lato; c++)
                if (griglia[r][c] === NAVE) annerisciContorno(r, c);
        if (!annerisciLineePiene()) return;
    }
}

// === UNDO ===
function annullaMossa() {
    if (partitaFinita || cronologia.length === 0) return;
    const s = cronologia.pop();
    griglia[s.r][s.c] = s.prec;
    // L'acqua automatica che quella mossa aveva generato non e' piu'
    // giustificata: si ricostruisce dallo stato rimasto.
    rigeneraAutoAcqua();
    // La penalita' gia' pagata non si restituisce e cellePunite non si tocca:
    // e' la memoria di uno sbaglio pagato, e riavvolgerla farebbe pagare due
    // volte lo stesso errore a chi annulla e rimette lo stesso segno.
    annullaSuggerimento(true);
    renderTutto();
    salvaPartita();
}

// === RENDERING ===
function renderGriglia() {
    // Le navi finite si colorano a parte: il giocatore vede a colpo d'occhio
    // cosa ha gia' chiuso e cosa e' ancora un troncone da allungare. Il calcolo
    // e' per gruppo, non per casella, quindi si fa una volta sola qui invece di
    // ripeterlo dentro al doppio ciclo.
    //
    // "Finita" vuol dire chiusa DAL GIOCATORE, cioe' con l'acqua ai capi
    // segnata da lui o il bordo. Non vuol dire "i numeri non le lascerebbero
    // spazio per crescere": quella e' una deduzione che potrebbe non aver
    // ancora fatto, e colorarla gliela regalerebbe.
    const chiuse = matriceVuota(lato, 0);
    gruppiNave().forEach(function (g) {
        if (!g.finita) return;
        g.celle.forEach(function (p) { chiuse[p.r][p.c] = 1; });
    });

    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            const el = document.getElementById('cel-' + r + '-' + c);
            if (!el) continue;
            const v = griglia[r][c];
            let cls = 'nav-cella';
            if (v === NAVE) cls += ' nave forma-' + formaNave(r, c);
            if (v === NAVE && chiuse[r][c]) cls += ' nave-finita';
            else if (v === ACQUA) cls += ' acqua';
            if (rivelate[r][c]) cls += ' rivelata';
            if (v !== VUOTO && segnoErrato(r, c, v)) cls += ' errata';
            if (hintTarget && hintTarget.r === r && hintTarget.c === c) {
                cls += (hintTarget.tipo === 'errore') ? ' suggerita-errore' : ' suggerita';
            }
            el.className = cls;
            // Il simbolo dell'acqua e' un punto: le navi sono disegnate dal CSS
            // (forma piena), l'acqua no, e una casella completamente vuota di
            // segni non si distinguerebbe da una ancora da decidere.
            el.textContent = (v === ACQUA) ? '·' : '';
        }
    }
    renderConti();
}

// I conti si spengono quando la riga e' completa e diventano rossi quando e'
// sforata: e' la spia che dice dove si sta sbagliando senza rivelare quale
// casella. A differenza della segnalazione errori, questa non guarda la
// soluzione, solo l'aritmetica, quindi resta sempre attiva.
function renderConti() {
    for (let r = 0; r < lato; r++) {
        const el = document.getElementById('conto-rig-' + r);
        if (!el) continue;
        const navi = contaInRiga(r, NAVE);
        const libere = contaInRiga(r, VUOTO);
        el.classList.toggle('conto-fatto', navi === contiRighe[r]);
        el.classList.toggle('conto-sforato', navi > contiRighe[r] ||
            navi + libere < contiRighe[r]);
    }
    for (let c = 0; c < lato; c++) {
        const el = document.getElementById('conto-col-' + c);
        if (!el) continue;
        const navi = contaInColonna(c, NAVE);
        const libere = contaInColonna(c, VUOTO);
        el.classList.toggle('conto-fatto', navi === contiColonne[c]);
        el.classList.toggle('conto-sforato', navi > contiColonne[c] ||
            navi + libere < contiColonne[c]);
    }
}

// Elenco della flotta con le navi gia' trovate barrate. Il riconoscimento e'
// puramente geometrico: si cercano gruppi di caselle di nave contigue che siano
// completi (circondati d'acqua o dal bordo). Una nave "quasi" completa non si
// conta, altrimenti l'elenco direbbe che l'incrociatore c'e' quando sul mare
// c'e' un pezzo di corazzata.
// Una nave e' chiusa quando in testa e in coda non puo' piu' allungarsi: le
// caselle ai due capi sono acqua segnata o bordo. Bastano i due capi, non serve
// guardare i fianchi: un vicino laterale sarebbe finito nello stesso gruppo
// (sono contigui in orizzontale/verticale), quindi se il gruppo e' una linea
// retta i fianchi sono gia' o vuoti o acqua, e in nessuno dei due casi la nave
// puo' crescere in lunghezza.
function gruppoChiuso(gruppo) {
    const orizzontale = gruppo.length === 1 || gruppo[0].r === gruppo[1].r;
    const rr = gruppo.map(p => p.r), cc = gruppo.map(p => p.c);
    const capi = orizzontale
        ? [{ r: rr[0], c: Math.min.apply(null, cc) - 1 }, { r: rr[0], c: Math.max.apply(null, cc) + 1 }]
        : [{ r: Math.min.apply(null, rr) - 1, c: cc[0] }, { r: Math.max.apply(null, rr) + 1, c: cc[0] }];
    // Il sottomarino (una casella sola) non ha un asse: puo' crescere in tutte e
    // quattro le direzioni, quindi vanno controllate tutte.
    if (gruppo.length === 1) {
        const p = gruppo[0];
        capi.push({ r: p.r - 1, c: p.c }, { r: p.r + 1, c: p.c });
    }
    return capi.every(function (p) {
        return !dentro(p.r, p.c) || griglia[p.r][p.c] === ACQUA;
    });
}

// Tutti i gruppi contigui di caselle segnate come nave, ognuno con il verdetto
// se e' una nave finita. La scansione e' una sola e serve sia all'elenco della
// flotta sia alla colorazione sulla griglia: erano due giri identici sulla
// stessa matrice, e tenerli separati voleva dire poterli far divergere.
function gruppiNave() {
    const visto = matriceVuota(lato, 0);
    const gruppi = [];
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            if (griglia[r][c] !== NAVE || visto[r][c]) continue;
            // Percorre il gruppo in orizzontale e in verticale
            const celle = [];
            const coda = [{ r: r, c: c }];
            visto[r][c] = 1;
            while (coda.length) {
                const p = coda.pop();
                celle.push(p);
                const vicini = [[p.r - 1, p.c], [p.r + 1, p.c], [p.r, p.c - 1], [p.r, p.c + 1]];
                for (const v of vicini) {
                    if (!dentro(v[0], v[1])) continue;
                    if (griglia[v[0]][v[1]] !== NAVE || visto[v[0]][v[1]]) continue;
                    visto[v[0]][v[1]] = 1;
                    coda.push({ r: v[0], c: v[1] });
                }
            }
            // Il gruppo deve essere una linea retta: una L o una T non e' una
            // nave, e segnarla come tale nasconderebbe l'errore al giocatore.
            const righe = new Set(celle.map(p => p.r));
            const colonne = new Set(celle.map(p => p.c));
            const ortogonale = (righe.size === 1 || colonne.size === 1);
            // E deve essere CHIUSO: le caselle ai capi o sono acqua segnata, o
            // sono fuori griglia. Un gruppo da 2 con una casella ancora libera
            // accanto puo' benissimo essere il tronco di un incrociatore, e
            // darlo per finito direbbe al giocatore "quella nave finisce li'" -
            // che e' una delle deduzioni che deve fare lui. Peggio: se ha
            // sbagliato, glielo confermerebbe.
            gruppi.push({ celle: celle, finita: ortogonale && gruppoChiuso(celle) });
        }
    }
    return gruppi;
}

function naviTrovate() {
    return gruppiNave().filter(function (g) { return g.finita; })
        .map(function (g) { return g.celle.length; });
}

function renderFlotta() {
    const cont = document.getElementById('lista-flotta');
    if (!cont) return;
    cont.innerHTML = '';

    // Le navi trovate si spuntano dall'elenco per lunghezza, partendo dalle piu'
    // lunghe: cosi' un gruppo da 3 spunta l'incrociatore e non tre sottomarini.
    const trovate = naviTrovate().slice().sort(function (a, b) { return b - a; });
    const restanti = flotta.slice();
    const fatte = new Array(flotta.length).fill(false);
    for (const len of trovate) {
        const i = restanti.indexOf(len);
        if (i >= 0 && !fatte[i]) { fatte[i] = true; restanti[i] = -1; }
    }

    // Ogni nave e' disegnata per conto suo e si spegne quando viene trovata,
    // invece di scrivere "2/4" accanto a una sagoma sola: il giocatore vede
    // quante e quali navi restano senza dover leggere un numero e ricostruirsi
    // la flotta a mente. Le navi uguali restano raggruppate perche' una fila di
    // sagome tutte identiche, senza stacchi, si legge male.
    const indici = flotta.map(function (len, i) { return i; })
        .sort(function (a, b) { return flotta[b] - flotta[a] || a - b; });

    let gruppo = null;
    let lunghezzaGruppo = -1;
    indici.forEach(function (i) {
        const len = flotta[i];
        if (len !== lunghezzaGruppo) {
            gruppo = document.createElement('div');
            gruppo.className = 'flotta-gruppo';
            cont.appendChild(gruppo);
            lunghezzaGruppo = len;
        }

        const sagoma = document.createElement('div');
        sagoma.className = 'flotta-sagoma' + (fatte[i] ? ' trovata' : '');
        for (let k = 0; k < len; k++) {
            const q = document.createElement('span');
            q.className = 'flotta-q';
            if (len === 1) q.classList.add('q-sub');
            else if (k === 0) q.classList.add('q-sx');
            else if (k === len - 1) q.classList.add('q-dx');
            sagoma.appendChild(q);
        }
        gruppo.appendChild(sagoma);
    });
}

function renderInfo() {
    document.getElementById('info-errori').textContent = erroriCount;
    document.getElementById('info-restano').textContent = Math.max(0, naviRimaste());
    aggiornaTimer();
    renderRecord();
}

function renderTutto() {
    if (!soluzione.length) { renderInfo(); return; }
    renderGriglia();
    renderFlotta();
    renderInfo();
}

// stile opzionale: 'giallo' (suggerimento) o 'rosso' (errore)
function setMessaggio(testo, stile) {
    const el = document.getElementById('messaggio-stato');
    if (!el) return;
    el.textContent = testo;
    el.classList.remove('msg-giallo', 'msg-rosso');
    if (stile === 'giallo') el.classList.add('msg-giallo');
    if (stile === 'rosso') el.classList.add('msg-rosso');
}

// === SUGGERIMENTO (didattico, a due fasi) ===
// Cerca la prossima deduzione, preferendo quelle che si spiegano con una regola
// semplice. L'ordine non e' casuale: e' l'ordine in cui le userebbe un
// risolutore umano, e la spiegazione che ne esce insegna una tecnica invece di
// limitarsi a scoprire una casella.
function trovaDeduzione() {
    // Priorita' 1: un segno sbagliato gia' sulla griglia. Continuare a dedurre
    // da una base sbagliata porta solo in un vicolo cieco.
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            const v = griglia[r][c];
            if (v === VUOTO || rivelate[r][c]) continue;
            const vero = soluzione[r][c] === 1 ? NAVE : ACQUA;
            if (v !== vero) {
                return { tipo: 'errore', r: r, c: c, valore: vero, motivo: 'errore' };
            }
        }
    }

    // Priorita' 2: riga o colonna il cui conto e' gia' completo -> il resto e'
    // acqua. E' la deduzione piu' immediata di tutte.
    for (let r = 0; r < lato; r++) {
        if (contaInRiga(r, NAVE) === contiRighe[r] && contaInRiga(r, VUOTO) > 0) {
            for (let c = 0; c < lato; c++) {
                if (griglia[r][c] === VUOTO) {
                    return { tipo: 'deduzione', r: r, c: c, valore: ACQUA,
                             motivo: 'rigaVuota', dir: 'riga' };
                }
            }
        }
    }
    for (let c = 0; c < lato; c++) {
        if (contaInColonna(c, NAVE) === contiColonne[c] && contaInColonna(c, VUOTO) > 0) {
            for (let r = 0; r < lato; r++) {
                if (griglia[r][c] === VUOTO) {
                    return { tipo: 'deduzione', r: r, c: c, valore: ACQUA,
                             motivo: 'rigaVuota', dir: 'colonna' };
                }
            }
        }
    }

    // Priorita' 3: alla riga mancano tante caselle quante ne restano libere ->
    // sono tutte nave.
    for (let r = 0; r < lato; r++) {
        const mancano = contiRighe[r] - contaInRiga(r, NAVE);
        const libere = contaInRiga(r, VUOTO);
        if (mancano > 0 && mancano === libere) {
            for (let c = 0; c < lato; c++) {
                if (griglia[r][c] === VUOTO) {
                    return { tipo: 'deduzione', r: r, c: c, valore: NAVE,
                             motivo: 'rigaPiena', dir: 'riga', quante: mancano };
                }
            }
        }
    }
    for (let c = 0; c < lato; c++) {
        const mancano = contiColonne[c] - contaInColonna(c, NAVE);
        const libere = contaInColonna(c, VUOTO);
        if (mancano > 0 && mancano === libere) {
            for (let r = 0; r < lato; r++) {
                if (griglia[r][c] === VUOTO) {
                    return { tipo: 'deduzione', r: r, c: c, valore: NAVE,
                             motivo: 'rigaPiena', dir: 'colonna', quante: mancano };
                }
            }
        }
    }

    // Priorita' 4: casella in diagonale a una nave -> acqua per forza.
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            if (griglia[r][c] !== VUOTO) continue;
            const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            for (const d of diag) {
                const rr = r + d[0], cc = c + d[1];
                if (dentro(rr, cc) && griglia[rr][cc] === NAVE) {
                    return { tipo: 'deduzione', r: r, c: c, valore: ACQUA,
                             motivo: 'diagonale' };
                }
            }
        }
    }

    // Priorita' 5: nessuna regola immediata. Si prova casella per casella se
    // l'altro valore lascia lo schema senza soluzione: e' la deduzione per
    // assurdo, piu' costosa ma sempre valida. Il conteggio si ferma alla prima
    // soluzione trovata, quindi il costo resta accettabile.
    const fissiBase = [];
    for (let r = 0; r < lato; r++)
        for (let c = 0; c < lato; c++)
            if (griglia[r][c] !== VUOTO) fissiBase.push({ r: r, c: c, val: griglia[r][c] });

    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            if (griglia[r][c] !== VUOTO) continue;
            const vero = soluzione[r][c] === 1 ? NAVE : ACQUA;
            const altro = (vero === NAVE) ? ACQUA : NAVE;
            const prova = fissiBase.concat([{ r: r, c: c, val: altro }]);
            const res = contaDisposizioni(contiRighe, contiColonne, 1, prova);
            // sol===0 vale come dimostrazione solo se la ricerca e' finita
            // davvero: se e' stata troncata, "non ho trovato soluzioni" non
            // significa "non ce ne sono" e il suggerimento sarebbe una bugia.
            if (res.sol === 0 && !res.interrotto) {
                return { tipo: 'deduzione', r: r, c: c, valore: vero, motivo: 'unica' };
            }
        }
    }

    // Ripiego: la prima casella libera. Non dovrebbe servire (lo schema ha una
    // sola soluzione, quindi una deduzione c'e' sempre), ma meglio indicare una
    // casella valida che non rispondere.
    for (let r = 0; r < lato; r++)
        for (let c = 0; c < lato; c++)
            if (griglia[r][c] === VUOTO) {
                return { tipo: 'deduzione', r: r, c: c,
                         valore: soluzione[r][c] === 1 ? NAVE : ACQUA, motivo: 'unica' };
            }
    return null;
}

function spiegaDeduzione(d) {
    switch (d.motivo) {
        case 'rigaVuota': return NAV_LANG.spiegaRigaVuota(d.dir);
        case 'rigaPiena': return NAV_LANG.spiegaRigaPiena(d.quante, d.dir);
        case 'diagonale': return NAV_LANG.spiegaDiagonale;
        case 'contorno': return NAV_LANG.spiegaContorno;
        default: return NAV_LANG.spiegaUnica;
    }
}

function suggerimento() {
    if (partitaFinita || !soluzione.length) return;
    if (hintTarget) { chiudiPannelloHint(); hintTarget = null; renderTutto(); return; }

    setMessaggio(NAV_LANG.generazione === null ? '' : NAV_LANG.partitaInCorso);
    const ded = trovaDeduzione();
    if (!ded) return;

    hintCount++;
    applicaPenalita(PENALITA_AIUTO, 'btn-hint');
    hintTarget = {
        tipo: ded.tipo, r: ded.r, c: ded.c, valore: ded.valore,
        motivo: ded.motivo, dir: ded.dir, quante: ded.quante, extraPagato: false
    };
    apriPannelloHint();
    renderTutto();
    salvaPartita();
}

function apriPannelloHint() {
    const pann = document.getElementById('pannello-hint');
    document.getElementById('hint-testo').innerHTML =
        (hintTarget.tipo === 'errore') ? NAV_LANG.hintErrore : NAV_LANG.hintDeduzione;
    document.getElementById('hint-penalita').innerHTML = NAV_LANG.hintPenalita;
    document.getElementById('btn-hint-applica').textContent =
        (hintTarget.tipo === 'errore') ? NAV_LANG.btnCancellaErrore : NAV_LANG.btnApplica;
    document.getElementById('btn-hint-spiega').disabled = false;
    pann.classList.add('aperto');
}

function chiudiPannelloHint() {
    const p = document.getElementById('pannello-hint');
    if (p) p.classList.remove('aperto');
}

// Annulla il suggerimento in corso. Con `silenzioso` non ridisegna (lo fa il chiamante).
function annullaSuggerimento(silenzioso) {
    if (!hintTarget) return;
    hintTarget = null;
    chiudiPannelloHint();
    if (!silenzioso) renderTutto();
}

// La penalita' extra si paga una sola volta per suggerimento, anche usando sia
// la Spiegazione sia l'applicazione.
function pagaExtraAiuto() {
    if (!hintTarget || hintTarget.extraPagato) return;
    hintTarget.extraPagato = true;
    applicaPenalita(PENALITA_AIUTO_EXTRA, 'btn-hint-spiega');
}

function mostraSpiegazioneHint() {
    if (!hintTarget) return;
    pagaExtraAiuto();
    document.getElementById('hint-testo').innerHTML = spiegaDeduzione(hintTarget);
    document.getElementById('btn-hint-spiega').disabled = true;
}

function applicaHint() {
    if (!hintTarget) return;
    pagaExtraAiuto();
    const r = hintTarget.r, c = hintTarget.c, val = hintTarget.valore;
    const tipo = hintTarget.tipo;
    annullaSuggerimento(true);
    document.getElementById('btn-hint-spiega').disabled = false;

    cronologia.push({ r: r, c: c, prec: griglia[r][c] });
    if (tipo === 'errore') {
        // Toglie il segno sbagliato e lascia la casella libera: il suggerimento
        // dice che li' si e' sbagliato, non cosa va messo.
        griglia[r][c] = VUOTO;
    } else {
        griglia[r][c] = val;
    }
    // Vale anche quando il suggerimento TOGLIE un segno sbagliato: quel segno
    // poteva aver generato acqua automatica che ora non ha piu' motivo di stare.
    rigeneraAutoAcqua();

    renderTutto();
    salvaPartita();
    controllaVittoria();
}

// === PENALITÀ SUL TEMPO ===
function applicaPenalita(sec, idElemento) {
    secondi += sec;
    aggiornaTimer();
    let x = ultimoMouseX, y = ultimoMouseY;
    if (x < 0 || y < 0) {
        const el = idElemento && document.getElementById(idElemento);
        if (el) {
            const rr = el.getBoundingClientRect();
            x = rr.left + rr.width / 2;
            y = rr.top + rr.height / 2;
        }
    }
    if (x >= 0 && y >= 0) mostraPenalita(x, y, sec);
}

function mostraPenalita(x, y, sec) {
    const sprite = document.createElement('div');
    sprite.className = 'penalita-volante';
    sprite.textContent = '+' + sec + 's';
    sprite.style.left = x + 'px';
    sprite.style.top = y + 'px';
    document.body.appendChild(sprite);
    setTimeout(function () { sprite.remove(); }, 2600);
}

// === VITTORIA ===
// Si vince quando tutte le caselle di nave della soluzione sono segnate come
// nave, e nessun'altra lo e'. Le caselle d'acqua non devono essere
// necessariamente annerite tutte: annerirle e' un aiuto alla lettura, non parte
// della soluzione, e obbligare a riempirle sarebbe lavoro meccanico.
function controllaVittoria() {
    let mancanti = 0, sbagliate = 0;
    for (let r = 0; r < lato; r++) {
        for (let c = 0; c < lato; c++) {
            const vera = soluzione[r][c] === 1;
            const messa = griglia[r][c] === NAVE;
            if (vera && !messa) mancanti++;
            if (!vera && messa) sbagliate++;
        }
    }
    if (mancanti > 0) return;
    if (sbagliate > 0) {
        setMessaggio(NAV_LANG.schemaErrori, 'rosso');
        riproduciAudio('sounds/scala40/knock.mp3');
        return;
    }

    partitaFinita = true;
    if (timerId) clearInterval(timerId);
    localStorage.removeItem('navale-save');
    riproduciAudio('sounds/scala40/tada.mp3');

    const nuovoRecordAssoluto = aggiornaRecords(secondi);
    document.getElementById('vittoria-messaggio').innerHTML = NAV_LANG.vittoria;
    document.getElementById('vittoria-dettagli').textContent =
        NAV_LANG.riepilogo(difficolta, formattaTempo(secondi), erroriCount, hintCount) +
        (nuovoRecordAssoluto ? NAV_LANG.nuovoRecord : '');

    // Analytics fine partita
    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_won', {
            'event_category': 'BattagliaNavale',
            'difficulty': difficolta,
            'time_seconds': secondi,
            'mistakes': erroriCount,
            'hints': hintCount,
            'version': window.scriptVersion || 'unknown'
        });
    }

    setTimeout(function () {
        document.getElementById('schermo').style.display = 'block';
        document.getElementById('haivinto').style.display = 'flex';
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('haivinto', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,   // posizione gia' definita nel CSS
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 800);
}

// "Vedi lo schema": toglie di mezzo la modale per lasciar guardare la griglia
// risolta, e lascia in basso i due comandi essenziali.
function vediSchema() {
    document.getElementById('haivinto').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });

    let pannello = document.getElementById('navale-minimal-win-panel');
    if (!pannello) {
        pannello = document.createElement('div');
        pannello.id = 'navale-minimal-win-panel';
        pannello.innerHTML =
            '<button type="button" class="btn-min-1">' +
            (window.currentLang === 'en' ? 'NEW GAME' : 'NUOVA PARTITA') + '</button>' +
            '<button type="button" class="btn-min-2">' +
            (window.currentLang === 'en' ? 'BACK TO RESULT' : 'TORNA AL RISULTATO') + '</button>';
        document.getElementById('campogioco').appendChild(pannello);
        pannello.querySelector('.btn-min-1').addEventListener('click', function () { location.reload(); });
        pannello.querySelector('.btn-min-2').addEventListener('click', tornaAlRisultato);
    }
    pannello.style.display = 'flex';
}

function tornaAlRisultato() {
    const pannello = document.getElementById('navale-minimal-win-panel');
    if (pannello) pannello.style.display = 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('haivinto').style.display = 'flex';
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('haivinto').style.display = 'none';
    const minimal = document.getElementById('navale-minimal-win-panel');
    if (minimal) minimal.style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    const avviso = document.getElementById('msg-generazione');
    if (avviso) { avviso.style.display = 'none'; avviso.classList.remove('msg-errore'); }
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('navale-difficolta') || NAV_LIVELLO_DEF);
}

function riprendiPartita() {
    chiudiModali();
    avviaTimer();
    setMessaggio(NAV_LANG.partitaInCorso);
}

let tempDifficolta = NAV_LIVELLO_DEF;
function selezionaDifficolta(diff) {
    if (!NAV_LIVELLI[diff]) diff = NAV_LIVELLO_DEF;
    tempDifficolta = diff;
    Object.keys(NAV_LIVELLI).forEach(function (d) {
        const b = document.getElementById('btn-diff-' + d);
        if (b) b.classList.toggle('attiva', d === diff);
    });
}

function confermaEAvviaPartita() {
    nuovaPartita(tempDifficolta);
}

function richiediNuovaPartita() {
    if (partitaFinita || !soluzione.length) {
        apriModaleInizio(false);
        return;
    }
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('confermatermina').style.display = 'flex';
    if (typeof setupAmazonFinishBanner === 'function') {
        setupAmazonFinishBanner('confermatermina', {
            modalStyle: { overflow: 'visible' },
            targetTop: 470,
            applyModalTop: false,
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

// === TASTIERA ===
document.addEventListener('keydown', function (e) {
    if (partitaFinita) return;
    const schermo = document.getElementById('schermo');
    if (schermo && schermo.style.display === 'block') return;
    if (e.altKey) return;

    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        annullaMossa();
        return;
    }
    if (e.ctrlKey) return;

    if (e.key.toLowerCase() === 'h') {
        suggerimento();
        return;
    }
});

// Traccia il cursore per posizionare lo sprite "+Ns" delle penalita'
document.addEventListener('mousemove', function (e) {
    ultimoMouseX = e.clientX;
    ultimoMouseY = e.clientY;
});

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initNavale);
    } else {
        initNavale();
    }
});

function initNavale() {
    // Se l'overlay dell'interstitial e' presente a schermo, aspetta la chiusura
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initNavale();
            }
        }, 100);
        return;
    }

    if (window.initAudioToggle) window.initAudioToggle('#btn-audio');
    if (typeof adjustLayout === 'function') adjustLayout();

    // Riquadro affiliati sotto NUOVA PARTITA. Parte da qui e non da
    // DOMContentLoaded perche' initNavale attende la chiusura dell'interstitial:
    // ruotare mentre l'overlay copre la pagina conterebbe impression mai viste.
    // Non e' AdSense, quindi la rotazione automatica e' legittima.
    if (typeof setupRotatingAffiliateBanner === 'function') {
        const boxAff = document.getElementById('banner-rotante');
        if (boxAff) setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
    }

    document.getElementById('btn-annulla').addEventListener('click', annullaMossa);
    document.getElementById('btn-hint').addEventListener('click', suggerimento);
    document.getElementById('btn-hint-spiega').addEventListener('click', mostraSpiegazioneHint);
    document.getElementById('btn-hint-applica').addEventListener('click', applicaHint);
    document.getElementById('btn-hint-chiudi').addEventListener('click', function () { annullaSuggerimento(); });
    document.getElementById('btn-vedi-schema').addEventListener('click', vediSchema);
    document.getElementById('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);
    document.querySelectorAll('.btn-reset-record').forEach(function (btn) {
        btn.addEventListener('click', azzeraRecordSingolo);
    });

    // Il tasto destro sulla griglia segna l'acqua: il menu del browser in mezzo
    // al mare sarebbe solo un intralcio.
    const g = document.getElementById('griglia-navale');
    if (g) g.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    caricaRecords();

    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        if (timerId) clearInterval(timerId);   // evita che il salvataggio periodico ricrei la partita
        localStorage.removeItem('navale-save');
        location.reload();
    });

    // Opzione segnalazione errori (persistente)
    opzErrori = localStorage.getItem('navale-opt-errori') !== '0';
    const chkErrori = document.getElementById('chk-errori');
    chkErrori.checked = opzErrori;
    chkErrori.addEventListener('change', function () {
        opzErrori = this.checked;
        localStorage.setItem('navale-opt-errori', opzErrori ? '1' : '0');
        if (soluzione.length) renderTutto();
    });

    // Opzione acqua automatica (persistente). Accendendola a partita in corso si
    // applica subito a quello che c'e' gia' sulla griglia.
    //
    // Chiave nuova: prima l'opzione faceva solo le diagonali, adesso anche le
    // righe/colonne complete, quindi il significato del valore salvato e'
    // cambiato. Il vecchio valore si eredita una volta sola invece di azzerarlo:
    // l'opzione nasceva spenta, quindi chi ce l'aveva accesa l'aveva scelta
    // apposta e ritrovarsela spenta sarebbe stata una sorpresa peggiore.
    const vecchiaScelta = localStorage.getItem('navale-opt-autoacqua');
    const nuovaScelta = localStorage.getItem('navale-opt-acquasicura');
    opzAutoAcqua = (nuovaScelta !== null) ? (nuovaScelta === '1') : (vecchiaScelta === '1');
    if (nuovaScelta === null) {
        localStorage.setItem('navale-opt-acquasicura', opzAutoAcqua ? '1' : '0');
        localStorage.removeItem('navale-opt-autoacqua');
    }
    const chkAuto = document.getElementById('chk-auto-acqua');
    chkAuto.checked = opzAutoAcqua;
    chkAuto.addEventListener('change', function () {
        opzAutoAcqua = this.checked;
        localStorage.setItem('navale-opt-acquasicura', opzAutoAcqua ? '1' : '0');
        if (soluzione.length) {
            if (opzAutoAcqua) {
                ricalcolaAutoAcqua();
            } else {
                // Spegnendola si ritirano le acque che aveva messo lei: erano un
                // servizio dell'opzione, non deduzioni del giocatore, e lasciarle
                // li' vorrebbe dire tenersi l'aiuto dopo averlo rifiutato.
                for (let r = 0; r < lato; r++)
                    for (let c = 0; c < lato; c++)
                        if (autoAcqua[r][c]) {
                            autoAcqua[r][c] = 0;
                            if (!rivelate[r][c]) griglia[r][c] = VUOTO;
                        }
            }
            renderTutto();
            salvaPartita();
        }
    });

    if (caricaPartita()) {
        costruisciGriglia();
        renderTutto();       // mostra lo schema salvato dietro al modale
        apriModaleInizio(true);
    } else {
        renderInfo();
        apriModaleInizio(false);
    }
}
