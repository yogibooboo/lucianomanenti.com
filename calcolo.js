/* ============================================================================
   CALCOLO ENIGMATICO - Logica di Gioco (JavaScript)
   Matrice 3x3 di numeri: ogni cifra è sostituita da una lettera, e a lettera
   uguale corrisponde cifra uguale. Le tre operazioni orizzontali e le tre
   verticali devono tornare tutte. Soluzione (mappa lettera->cifra) unica.
   Stile e struttura coerenti con Sudoku e con gli altri giochi del sito.
   ============================================================================ */

// === TESTI MULTILINGUA ===
const CALC_LANG = (window.currentLang === 'en') ? {
    scegliLettera: 'Pick a letter and assign it a digit',
    partitaInCorso: 'Game in progress — good luck!',
    generazione: 'Generating puzzle...',
    generazioneFallita: 'Could not build a puzzle. Please try again.',
    // Separatore decimale del display della calcolatrice: i conti si fanno
    // sempre col punto, cambia solo come si legge.
    decimale: '.',
    schemaErrori: 'All letters are assigned but the sums do not work out',
    cifraOccupata: function (l) { return 'Digit already assigned to ' + l; },
    hintErrore: 'The highlighted letter has the <b>wrong</b> digit.',
    hintDeduzione: 'The highlighted letter can be <b>deduced</b> from the visible numbers.',
    btnApplica: 'ASSIGN THE DIGIT',
    btnCancellaErrore: 'CLEAR THE MISTAKE',
    hintPenalita: 'Penalty: +10 s now, +20 s more for the Explanation or assigning it (once).',
    spiegaUnica: function (l, d) {
        return 'Letter ' + l + ' can only be ' + d + ': every other digit breaks at least one of the six operations, given what you already placed.';
    },
    spiegaColonna: function (l, d) {
        return 'Look at the units column: it forces ' + l + ' = ' + d + ', because no other digit makes the last digit of the result come out right.';
    },
    vittoria: 'CONGRATULATIONS!<br>Puzzle solved!',
    tempo: 'Time',
    errori: 'Mistakes',
    suggerimenti: 'Hints',
    resetChiedi: 'OK?',
    // Un record per periodo: si annuncia solo il piu' alto dei tre battuti.
    record: {
        all: '🏆 NEW ALL-TIME BEST!',
        weekly: '🏆 BEST OF THE WEEK!',
        daily: '🏆 BEST OF TODAY!'
    },
    // Neutral names: levels change how wide the numbers are, and wider numbers
    // are not proven to be harder. Older keys stay listed so a game or a record
    // saved by a previous edition still shows a name instead of "undefined".
    diffNames: {
        piccoli: 'Small numbers', medi: 'Medium numbers', grandi: 'Large numbers',
        standard: 'Cross Figure', facile: 'Easy', medio: 'Medium', difficile: 'Hard'
    },
    riepilogo: function (diff, tempo, errori, hints) {
        return CALC_LANG.diffNames[diff] + ' — ' + CALC_LANG.tempo + ': ' + tempo +
            ' — ' + CALC_LANG.errori + ': ' + errori + ' — ' + CALC_LANG.suggerimenti + ': ' + hints;
    }
} : {
    scegliLettera: 'Scegli una lettera e assegnale una cifra',
    partitaInCorso: 'Partita in corso — buona fortuna!',
    generazione: 'Generazione dello schema...',
    generazioneFallita: 'Non è stato possibile preparare lo schema. Riprova.',
    // Vedi il dizionario inglese
    decimale: ',',
    schemaErrori: 'Tutte le lettere sono assegnate ma i conti non tornano',
    cifraOccupata: function (l) { return 'Cifra già assegnata a ' + l; },
    hintErrore: 'La lettera evidenziata ha la cifra <b>sbagliata</b>.',
    hintDeduzione: 'La lettera evidenziata è <b>deducibile</b> dai numeri visibili.',
    btnApplica: 'ASSEGNA LA CIFRA',
    btnCancellaErrore: 'CANCELLA L\'ERRORE',
    hintPenalita: 'Penalit&agrave;: +10 s ora, +20 s per la Spiegazione o l\'assegnazione (una volta sola).',
    spiegaUnica: function (l, d) {
        return 'La lettera ' + l + ' può valere solo ' + d + ': ogni altra cifra manda in errore almeno una delle sei operazioni, viste le assegnazioni già fatte.';
    },
    spiegaColonna: function (l, d) {
        return 'Guarda la colonna delle unità: impone ' + l + ' = ' + d + ', perché nessun\'altra cifra fa tornare l\'ultima cifra del risultato.';
    },
    vittoria: 'COMPLIMENTI!<br>Schema risolto!',
    tempo: 'Tempo',
    errori: 'Errori',
    suggerimenti: 'Suggerimenti',
    resetChiedi: 'OK?',
    // Un record per periodo: si annuncia solo il piu' alto dei tre battuti.
    record: {
        all: '🏆 NUOVO RECORD ASSOLUTO!',
        weekly: '🏆 RECORD DELLA SETTIMANA!',
        daily: '🏆 RECORD DI OGGI!'
    },
    // Nomi neutri: i livelli cambiano l'ampiezza dei numeri, e non è dimostrato
    // che numeri più grandi rendano lo schema più difficile. Le chiavi vecchie
    // restano elencate perché una partita o un record salvato da un'edizione
    // precedente mostri comunque un nome invece di "undefined".
    diffNames: {
        piccoli: 'Numeri piccoli', medi: 'Numeri medi', grandi: 'Numeri grandi',
        standard: 'Calcolo Enigmatico', facile: 'Facile', medio: 'Medio', difficile: 'Difficile'
    },
    riepilogo: function (diff, tempo, errori, hints) {
        return CALC_LANG.diffNames[diff] + ' — ' + CALC_LANG.tempo + ': ' + tempo +
            ' — ' + CALC_LANG.errori + ': ' + errori + ' — ' + CALC_LANG.suggerimenti + ': ' + hints;
    }
};

// === CONFIGURAZIONE DEI LIVELLI ===
// I livelli cambiano l'ampiezza dei numeri, non il numero di lettere in gioco:
// quelle restano 8-10 dappertutto. Le vecchie forbici strette (3-4 e 5-6
// lettere) erano sbagliate proprio li': con poche lettere la matrice delle
// possibilita' resta monca, perche' una colonna con una sola casella libera non
// dimostra niente - quella cifra potrebbe non comparire affatto nello schema.
// Il ragionamento per colonna vale solo con (quasi) tutte e dieci le cifre, e
// quindi il numero di lettere non e' una manopola utilizzabile.
//
// I nomi sono neutri di proposito. Numeri piu' grandi vogliono dire piu' cifre
// visibili, cioe' piu' vincoli e piu' appigli: uno schema con numeri grandi e'
// piu' laborioso da calcolare ma non per forza piu' difficile da dedurre, e il
// verso potrebbe perfino essere l'opposto. Finche' non lo si misura davvero
// (lunghezza delle catene deduttive) le etichette dicono cosa cambia, non
// promettono un ordine di difficolta' che non e' stato verificato.
//
// Le soglie sono scelte su una misura di 25 schemi ciascuna (celle per numero
// di cifre, e costo di generazione):
//   piccoli  60/999  -> 1c 31%  2c 62%  3c  7%  4c  0%   485 ms
//   medi    150/9999 -> 1c 12%  2c 48%  3c 31%  4c  8%   653 ms
//   grandi  300/9999 -> 1c  7%  2c 40%  3c 40%  4c 12%   719 ms
// "grandi" e' la taratura vicina agli schemi della Settimana Enigmistica, dove
// prevalgono i numeri di tre cifre e ogni tanto ne compare uno di quattro;
// "piccoli" e' il comportamento storico del gioco.
const CALC_LIVELLI = {
    piccoli: { maxVal: 60, maxCella: 999 },
    medi: { maxVal: 150, maxCella: 9999 },
    grandi: { maxVal: 300, maxCella: 9999 }
};
const CALC_LIVELLO_DEF = 'medi';

// Lettere in gioco: uguali per tutti i livelli, per il motivo detto sopra.
const CALC_LETTERE_MIN = 8;
const CALC_LETTERE_MAX = 10;

// Lettere usate per mascherare le cifre, in ordine di assegnazione
const ALFABETO = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M'];

// === PENALITÀ SUL TEMPO (secondi aggiunti al cronometro) ===
const PENALITA_AIUTO = 10;         // apertura del suggerimento (lettera evidenziata)
const PENALITA_AIUTO_EXTRA = 20;   // spiegazione o assegnazione (una volta sola)
const PENALITA_ERRORE = 30;        // cifra sbagliata segnalata dal confronto con la soluzione

const OPS = ['+', '-', 'x', ':'];

// === STATO GLOBALE ===
// Le 9 celle della matrice, in ordine: A B C / D E F / G H I
// dove C = A op B, F = D op E, I = G op H (righe)
//   e  G = A op D, H = B op E, I = C op F (colonne)
let celle = [];            // 9 numeri della soluzione
let opsRighe = [];         // 3 operatori delle righe
let opsColonne = [];       // 3 operatori delle colonne
let patterns = [];         // 9 array di indici-lettera: la maschera di ogni cella
let lettere = [];          // lettere in gioco, es. ['A','B','C','D']
let soluzioneMappa = {};   // lettera -> cifra (la soluzione)
let assegnazioni = {};     // lettera -> cifra scelta dal giocatore (undefined = vuota)

let letteraSelezionata = null;
// true quando la selezione l'ha scelta il gioco (dopo un'assegnazione), non l'utente:
// in quel caso il click sulla lettera evidenziata la conferma invece di deselezionarla
let selezioneAutomatica = false;

// Matrice delle possibilità: esclusioni[lettera] = array di 10 codici.
//   ESCL_NO   = incrocio ancora libero
//   ESCL_MANO = esclusione segnata dal giocatore
//   ESCL_AUTO = esclusione dedotta dal gioco quando si assegna una cifra
// Le due esclusioni si distinguono a vista: quelle automatiche sono conseguenza
// di un'assegnazione, non un ragionamento del giocatore.
const ESCL_NO = 0, ESCL_MANO = 1, ESCL_AUTO = 2;
let esclusioni = {};
// Incroci "lettera-cifra" gia' costati un errore per un'esclusione sbagliata.
// Serve a non ripunire lo stesso sbaglio: l'esclusione e' un interruttore, e
// senza memoria bastava togliere e rimettere per accumulare penalita' a vuoto.
let esclusioniPunite = {};

// Modo attivo dei radio button: cosa fa il click su un incrocio della matrice
let modoMatrice = 'escludi';
let difficolta = CALC_LIVELLO_DEF;
let erroriCount = 0;
let hintCount = 0;
let secondi = 0;
let ultimoMouseX = -1;
let ultimoMouseY = -1;
let timerId = null;
let cronologia = [];       // stack per undo: { lettera, cifraPrec }
let calcAperta = false;    // calcolatrice a schermo: dirotta la tastiera (vedi === CALCOLATRICE ===)
let partitaFinita = false;

// Opzione di segnalazione errori (persistente in localStorage)
let opzErrori = true;      // evidenzia le cifre sbagliate rispetto alla soluzione

// Opzione "sbarra le colonne delle cifre assenti" (persistente in localStorage).
// Come opzErrori si può accendere e spegnere durante la partita: spegnendola le
// colonne tornano libere, perché sono esclusioni automatiche e si ricostruiscono
// da zero a ogni ricalcolo.
let opzSbarraAssenti = false;

// Record dei tempi migliori per difficoltà (persistenti in localStorage)
let records = {};

// Bersaglio corrente del Suggerimento a due fasi: { tipo: 'errore'|'deduzione', lettera, cifra }
let hintTarget = null;

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === MOTORE ARITMETICO ===
function applica(a, op, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case 'x': return a * b;
        case ':': return (b !== 0 && a % b === 0) ? a / b : null;
    }
    return null;
}

function rnd(n) { return Math.floor(Math.random() * n); }

// Verifica le sei operazioni su nove valori concreti
function verificaSchema(v, opsR, opsC) {
    const [A, B, C, D, E, F, G, H, I] = v;
    return applica(A, opsR[0], B) === C &&
        applica(D, opsR[1], E) === F &&
        applica(G, opsR[2], H) === I &&
        applica(A, opsC[0], D) === G &&
        applica(B, opsC[1], E) === H &&
        applica(C, opsC[2], F) === I;
}

// === GENERATORE ===
// Sceglie A,B,D,E e gli operatori, deriva C,F,G,H e verifica che la riga e la
// colonna finali chiudano sullo stesso valore I.
function generaMatrice(maxVal, maxCella, opsR, opsC) {
    for (let t = 0; t < 4000; t++) {
        const A = 1 + rnd(maxVal), B = 1 + rnd(maxVal), D = 1 + rnd(maxVal), E = 1 + rnd(maxVal);
        const C = applica(A, opsR[0], B), F = applica(D, opsR[1], E);
        const G = applica(A, opsC[0], D), H = applica(B, opsC[1], E);
        if (C === null || F === null || G === null || H === null) continue;
        if (C <= 0 || F <= 0 || G <= 0 || H <= 0) continue;
        const I1 = applica(G, opsR[2], H), I2 = applica(C, opsC[2], F);
        if (I1 === null || I2 === null || I1 !== I2 || I1 <= 0) continue;
        const v = [A, B, C, D, E, F, G, H, I1];
        if (v.some(x => x > maxCella)) continue;
        return v;
    }
    return null;
}

// Le sei operazioni dello schema come terne di indici di cella:
// tre righe e tre colonne, nell'ordine operando-operando-risultato.
const TERNE_OPERAZIONI = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // righe
    [0, 3, 6], [1, 4, 7], [2, 5, 8]    // colonne
];

// Operatore di ciascuna delle sei operazioni, nello stesso ordine
function operatoriSchema(opsR, opsC) {
    return [opsR[0], opsR[1], opsR[2], opsC[0], opsC[1], opsC[2]];
}

// Scarta gli schemi che non insegnano nulla: troppe moltiplicazioni per 1,
// divisioni x:x, pochi operatori diversi o troppi valori ripetuti.
function schemaInteressante(v, opsR, opsC) {
    const ops = operatoriSchema(opsR, opsC);
    let banali = 0;
    TERNE_OPERAZIONI.forEach(function (t, i) {
        const x = v[t[0]], y = v[t[1]], op = ops[i];
        if ((op === 'x' || op === ':') && (x === 1 || y === 1)) banali++;
        if (op === ':' && x === y) banali++;
    });
    if (banali > 1) return false;
    if (new Set([...opsR, ...opsC]).size < 3) return false;
    if (new Set(v).size < 5) return false;
    if (!v.some(x => x >= 10)) return false;
    return true;
}

// Scarta gli schemi in cui due delle sei operazioni, per il giocatore, sono la
// stessa cosa. Va eseguito DOPO la costruzione dei pattern, perche' il confronto
// deve avvenire sulle lettere: e' quello che si vede sullo schema, e due celle
// con valori diversi possono mostrare la stessa struttura.
//
// Due casi, entrambi visti in partita:
//  - simmetria diagonale: lo schema e' specchiato sulla diagonale, quindi ogni
//    riga ripete la colonna corrispondente e le sei equazioni diventano tre;
//  - stessa operazione con uno zero in coda: DD x A = BB affiancata da
//    A0 x EC = FA0 e' la stessa moltiplicazione scalata per dieci, e non
//    aggiunge nessun vincolo nuovo;
//  - stessa relazione scritta al contrario: BE : D = C sulla riga e C x D = BE
//    sulla colonna sono la stessa uguaglianza, e chi risolve la prima ha gia'
//    risolto la seconda.
// In tutti questi casi il giocatore crede di avere sei indizi e ne ha meno.
function operazioniDistinte(pat, lettere, mappa, opsR, opsC) {
    const ops = operatoriSchema(opsR, opsC);
    // Testo di una cella in lettere, es. [0,2] -> "AC"
    const testo = pat.map(p => p.map(i => lettere[i]).join(''));
    // Stessa cosa senza gli zeri in coda: riconosce le operazioni che
    // differiscono solo per un fattore dieci. Lo zero non e' il carattere "0"
    // ma la lettera a cui e' toccata la cifra 0, e cambia da schema a schema.
    const senzaZeri = pat.map(function (p) {
        const l = p.slice();
        while (l.length && mappa[lettere[l[l.length - 1]]] === 0) l.pop();
        return l.map(i => lettere[i]).join('');
    });

    // Firma di un'operazione ridotta alla relazione che esprime davvero.
    // Ogni uguaglianza si puo' scrivere in tre modi, e sono lo stesso vincolo:
    //     x + y = z   <=>   z - y = x   <=>   z - x = y
    //     x * y = z   <=>   z : y = x   <=>   z : x = y
    // Riportando sottrazioni e divisioni alla forma diretta, e ordinando i due
    // operandi (che commutano), le tre scritture collassano sulla stessa
    // stringa. Cosi' BE : D = C e C x D = BE si riconoscono come una sola.
    function canonica(t, op) {
        const [a, b, c] = t;
        if (op === '-') return '+|' + [c, b].sort().join('&') + '|' + a;
        if (op === ':') return 'x|' + [c, b].sort().join('&') + '|' + a;
        return op + '|' + [a, b].sort().join('&') + '|' + c;
    }

    const viste = new Set();
    const visteScalate = new Set();
    for (let i = 0; i < TERNE_OPERAZIONI.length; i++) {
        const [a, b, c] = TERNE_OPERAZIONI[i];
        const firma = canonica([testo[a], testo[b], testo[c]], ops[i]);
        if (viste.has(firma)) return false;
        viste.add(firma);
        const ridotta = canonica([senzaZeri[a], senzaZeri[b], senzaZeri[c]], ops[i]);
        if (senzaZeri[a] + senzaZeri[b] + senzaZeri[c] !== '' &&
            visteScalate.has(ridotta)) return false;
        visteScalate.add(ridotta);
    }
    return true;
}

function cifreUsate(v) {
    const s = new Set();
    v.forEach(n => String(n).split('').forEach(ch => s.add(ch)));
    return s;
}

// Conta le mappe lettera->cifra che soddisfano lo schema, fermandosi a `limite`.
// `fisse` (opzionale) vincola alcune lettere a una cifra: serve sia per l'unicità
// sia per il motore dei suggerimenti.
function contaSoluzioni(pat, opsR, opsC, nLettere, limite, fisse) {
    let sol = 0;
    let ultimaMappa = null;
    const perm = new Array(nLettere).fill(-1);
    const usata = new Array(10).fill(ESCL_NO);

    if (fisse) {
        for (const idx in fisse) {
            const d = fisse[idx];
            if (usata[d]) return { sol: 0, mappa: null }; // due lettere sulla stessa cifra
            usata[d] = true;
            perm[idx] = d;
        }
    }

    function valuta(p) {
        let s = '';
        for (const i of p) s += perm[i];
        if (s.length > 1 && s[0] === '0') return null; // niente zeri iniziali
        return parseInt(s, 10);
    }

    function rec(i) {
        if (sol >= limite) return;
        if (i === nLettere) {
            const v = [];
            for (const p of pat) {
                const n = valuta(p);
                if (n === null) return;
                v.push(n);
            }
            if (verificaSchema(v, opsR, opsC)) {
                sol++;
                ultimaMappa = perm.slice();
            }
            return;
        }
        if (perm[i] >= 0) { rec(i + 1); return; } // lettera già fissata
        for (let d = 0; d <= 9; d++) {
            if (usata[d]) continue;
            usata[d] = true; perm[i] = d;
            rec(i + 1);
            usata[d] = false; perm[i] = -1;
        }
    }
    rec(0);
    return { sol, mappa: ultimaMappa };
}

// Genera uno schema completo con mappa lettera->cifra unica.
function generaPuzzle(minLettere, maxLettere, maxVal, maxCella) {
    const scadenza = Date.now() + 6000; // tetto di sicurezza: non bloccare la pagina
    while (Date.now() < scadenza) {
        const opsR = [OPS[rnd(4)], OPS[rnd(4)], OPS[rnd(4)]];
        const opsC = [OPS[rnd(4)], OPS[rnd(4)], OPS[rnd(4)]];
        const v = generaMatrice(maxVal, maxCella, opsR, opsC);
        if (!v || !schemaInteressante(v, opsR, opsC)) continue;

        const cifre = Array.from(cifreUsate(v)).sort();
        if (cifre.length < minLettere || cifre.length > maxLettere) continue;

        // Mescola l'associazione cifra->lettera, così la stessa cifra non ha
        // sempre la stessa lettera da uno schema all'altro
        const lett = ALFABETO.slice(0, cifre.length);
        const ordine = lett.slice();
        for (let i = ordine.length - 1; i > 0; i--) {
            const j = rnd(i + 1);
            [ordine[i], ordine[j]] = [ordine[j], ordine[i]];
        }
        const cifraDiLettera = {};   // lettera -> cifra
        const letteraDiCifra = {};   // cifra   -> lettera
        cifre.forEach(function (ch, i) {
            cifraDiLettera[ordine[i]] = parseInt(ch, 10);
            letteraDiCifra[ch] = ordine[i];
        });

        // pattern per indice di lettera, nell'ordine di `lett`
        const pat = v.map(n => String(n).split('').map(ch => lett.indexOf(letteraDiCifra[ch])));
        // Il controllo sui doppioni sta qui e non in schemaInteressante perche'
        // ha bisogno dei pattern, che esistono solo da questa riga in poi.
        if (!operazioniDistinte(pat, lett, cifraDiLettera, opsR, opsC)) continue;
        const r = contaSoluzioni(pat, opsR, opsC, lett.length, 2, null);
        if (r.sol !== 1) continue;

        return {
            celle: v, opsR: opsR, opsC: opsC,
            patterns: pat, lettere: lett, mappa: cifraDiLettera
        };
    }
    return null;
}

// === RENDERING DELLE CELLE ===
// Testo di una cella: le lettere ancora senza cifra restano lettere,
// quelle assegnate mostrano la cifra scelta.
function testoCella(i) {
    return patterns[i].map(function (idx) {
        const l = lettere[idx];
        const c = assegnazioni[l];
        return (c === undefined) ? l : String(c);
    }).join('');
}

// Una cella è "risolta" quando tutte le sue lettere hanno una cifra
function cellaCompleta(i) {
    return patterns[i].every(idx => assegnazioni[lettere[idx]] !== undefined);
}

// Valore numerico corrente di una cella, o null se incompleta / con zero iniziale
function valoreCella(i) {
    if (!cellaCompleta(i)) return null;
    const s = patterns[i].map(idx => assegnazioni[lettere[idx]]).join('');
    if (s.length > 1 && s[0] === '0') return null;
    return parseInt(s, 10);
}

// Stato di un'operazione: 'vuota' (dati insufficienti), 'ok', 'errata'
function statoOperazione(i1, op, i2, i3) {
    const a = valoreCella(i1), b = valoreCella(i2), c = valoreCella(i3);
    if (a === null || b === null || c === null) return 'vuota';
    return (applica(a, op, b) === c) ? 'ok' : 'errata';
}

// Le sei operazioni dello schema, come terne di indici di cella
function listaOperazioni() {
    return [
        { idx: [0, 1, 2], op: opsRighe[0], tipo: 'riga', n: 0 },
        { idx: [3, 4, 5], op: opsRighe[1], tipo: 'riga', n: 1 },
        { idx: [6, 7, 8], op: opsRighe[2], tipo: 'riga', n: 2 },
        { idx: [0, 3, 6], op: opsColonne[0], tipo: 'colonna', n: 0 },
        { idx: [1, 4, 7], op: opsColonne[1], tipo: 'colonna', n: 1 },
        { idx: [2, 5, 8], op: opsColonne[2], tipo: 'colonna', n: 2 }
    ];
}

// === PERSISTENZA (riprendi la partita dopo un reload) ===
function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('calcolo-save');
        return;
    }
    try {
        localStorage.setItem('calcolo-save', JSON.stringify({
            celle: celle, opsR: opsRighe, opsC: opsColonne,
            pat: patterns, lett: lettere, map: soluzioneMappa, ass: assegnazioni,
            // le esclusioni si salvano come stringhe di cifre 0/1/2, una per lettera
            // (0 = libero, 1 = escluso a mano, 2 = escluso di riflesso)
            escl: lettere.map(function (l) {
                const r = esclusioni[l] || [];
                let s = '';
                for (let d = 0; d <= 9; d++) s += (r[d] || ESCL_NO);
                return s;
            }),
            sec: secondi, diff: difficolta, err: erroriCount, hint: hintCount,
            // incroci gia' penalizzati: senza questi, ricaricando la pagina lo
            // stesso sbaglio si potrebbe far pagare una seconda volta
            punite: Object.keys(esclusioniPunite)
        }));
    } catch (e) { /* storage pieno o disabilitato: si continua senza salvataggio */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('calcolo-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.celle || s.celle.length !== 9 || !s.lett || !s.lett.length) return false;
        celle = s.celle;
        opsRighe = s.opsR;
        opsColonne = s.opsC;
        patterns = s.pat;
        lettere = s.lett;
        soluzioneMappa = s.map;
        assegnazioni = s.ass || {};
        esclusioni = {};
        lettere.forEach(function (l, i) {
            const riga = s.escl && s.escl[i];
            esclusioni[l] = riga ? riga.split('').map(ch => parseInt(ch, 10) || ESCL_NO)
                                 : new Array(10).fill(ESCL_NO);
        });
        secondi = s.sec || 0;
        difficolta = s.diff || CALC_LIVELLO_DEF;
        erroriCount = s.err || 0;
        hintCount = s.hint || 0;
        esclusioniPunite = {};
        (s.punite || []).forEach(function (k) { esclusioniPunite[k] = true; });
        return true;
    } catch (e) {
        return false;
    }
}

// === AVVIO NUOVA PARTITA ===
function nuovaPartita(diff) {
    // Livello sconosciuto (chiamata senza argomento, o una chiave di
    // un'edizione precedente rimasta in localStorage): si ricade sul livello di
    // mezzo. Senza questa guardia difficolta' finiva per valere la stringa
    // "undefined", e l'intestazione dei record restava senza nome.
    if (!CALC_LIVELLI[diff]) diff = CALC_LIVELLO_DEF;
    difficolta = diff;
    localStorage.setItem('calcolo-difficolta', diff);
    setMessaggio(CALC_LANG.generazione);
    // L'avviso vero e' quello dentro la modale: #messaggio-stato sta nel campo
    // di gioco, che fino a chiudiModali() e' coperto dalla modale stessa.
    const avviso = document.getElementById('msg-generazione');
    if (avviso) {
        avviso.textContent = CALC_LANG.generazione;
        avviso.classList.remove('msg-errore');
        avviso.style.display = 'block';
    }

    // setTimeout per lasciare aggiornare il messaggio prima del calcolo
    setTimeout(function () {
        const liv = CALC_LIVELLI[diff] || CALC_LIVELLI[CALC_LIVELLO_DEF];
        let gen = generaPuzzle(CALC_LETTERE_MIN, CALC_LETTERE_MAX, liv.maxVal, liv.maxCella);
        // Ripiego: se non esce nulla entro il tetto di tempo si scende a 7
        // lettere, non piu' in basso. Sotto quella soglia la matrice tornerebbe
        // monca, che e' proprio il motivo per cui il numero di lettere non viene
        // usato come manopola: meglio riprovare che servire uno schema con meta'
        // degli indizi. L'ampiezza dei numeri resta quella del livello scelto.
        if (!gen) gen = generaPuzzle(7, CALC_LETTERE_MAX, liv.maxVal, liv.maxCella);
        // Falliti sia il tentativo normale sia il ripiego a 7 lettere: la modale
        // resta aperta, quindi l'avviso va cambiato in messaggio d'errore. Prima
        // qui si rimostrava "Generazione dello schema...", che sembrava un lavoro
        // ancora in corso invece di uno stop.
        if (!gen) {
            if (avviso) {
                avviso.textContent = CALC_LANG.generazioneFallita;
                avviso.classList.add('msg-errore');
            }
            setMessaggio(CALC_LANG.generazioneFallita, 'rosso');
            return;
        }

        celle = gen.celle;
        opsRighe = gen.opsR;
        opsColonne = gen.opsC;
        patterns = gen.patterns;
        lettere = gen.lettere;
        soluzioneMappa = gen.mappa;
        assegnazioni = {};
        esclusioni = {};
        esclusioniPunite = {};
        lettere.forEach(function (l) { esclusioni[l] = new Array(10).fill(ESCL_NO); });
        preescludiCifreAssenti();

        letteraSelezionata = null;
        selezioneAutomatica = false;
        erroriCount = 0;
        hintCount = 0;
        secondi = 0;
        cronologia = [];
        partitaFinita = false;
        hintTarget = null;
        chiudiPannelloHint();

        if (avviso) avviso.style.display = 'none';
        chiudiModali();
        costruisciGriglia();
        costruisciLegenda();
        renderTutto();
        avviaTimer();
        salvaPartita();
        setMessaggio(CALC_LANG.partitaInCorso);
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
        if (secondi % 15 === 0) salvaPartita(); // salvataggio periodico del tempo
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

function chiaveOggi() {
    return chiaveGiorno(new Date());
}

// Lunedì della settimana corrente, come chiave della settimana
function chiaveSettimana() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return chiaveGiorno(d);
}

function caricaRecords() {
    try {
        records = JSON.parse(localStorage.getItem('calcolo-records') || '{}') || {};
    } catch (e) {
        records = {};
    }
}

function salvaRecords() {
    try {
        localStorage.setItem('calcolo-records', JSON.stringify(records));
    } catch (e) { /* storage non disponibile */ }
}

// Aggiorna i record con il tempo di vittoria e dice quali dei tre sono caduti.
// I flag si calcolano PRIMA di sovrascrivere, e "battuto" vuol dire battuto
// davvero: per il giorno e per la settimana serve un tempo precedente dello
// stesso periodo, altrimenti la prima vittoria della giornata griderebbe al
// record solo per essere arrivata per prima, e l'annuncio perderebbe valore.
// Il record assoluto fa eccezione: la prima vittoria in assoluto e', a tutti
// gli effetti, il miglior tempo di sempre.
function aggiornaRecords(sec) {
    const r = records[difficolta] || (records[difficolta] = {});
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();

    const battuti = {
        all: !r.all || sec < r.all.sec,
        weekly: !!(r.weekly && r.weekly.key === settimana && sec < r.weekly.sec),
        daily: !!(r.daily && r.daily.key === oggi && sec < r.daily.sec)
    };

    if (!r.daily || r.daily.key !== oggi || sec < r.daily.sec) r.daily = { key: oggi, sec: sec };
    if (!r.weekly || r.weekly.key !== settimana || sec < r.weekly.sec) r.weekly = { key: settimana, sec: sec };
    if (!r.all || sec < r.all.sec) r.all = { sec: sec, date: oggi };

    salvaRecords();
    renderRecord();
    return battuti;
}

function renderRecord() {
    const r = records[difficolta] || {};
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();
    // I record sono per livello: senza il nome non si capirebbe a quale si
    // riferiscono, e i tempi di livelli diversi non sono confrontabili.
    document.getElementById('record-diff').textContent = CALC_LANG.diffNames[difficolta] || '';
    document.getElementById('record-oggi').textContent =
        (r.daily && r.daily.key === oggi) ? formattaTempo(r.daily.sec) : '--:--';
    document.getElementById('record-settimana').textContent =
        (r.weekly && r.weekly.key === settimana) ? formattaTempo(r.weekly.sec) : '--:--';
    document.getElementById('record-assoluto').textContent =
        r.all ? formattaTempo(r.all.sec) : '--:--';
}

// Azzeramento a due passi del singolo record (daily/weekly/all) della difficoltà
// visualizzata: il primo click chiede conferma per 3 secondi, il secondo azzera
function azzeraRecordSingolo(e) {
    const btn = e.currentTarget;
    const tipo = btn.dataset.tipo;
    if (!btn._timerConferma) {
        btn.textContent = CALC_LANG.resetChiedi;
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

// === RENDERING ===
// La griglia è 5x5: celle-numero alle posizioni pari, operatori e segni "="
// nelle posizioni dispari, esattamente come nello schema della rivista.
function costruisciGriglia() {
    const cont = document.getElementById('griglia-calcolo');
    cont.innerHTML = '';

    // riga r della matrice -> riga 0,2,4 della griglia visiva
    for (let gr = 0; gr < 5; gr++) {
        for (let gc = 0; gc < 5; gc++) {
            const el = document.createElement('div');
            if (gr % 2 === 0 && gc % 2 === 0) {
                // cella-numero
                const idx = (gr / 2) * 3 + (gc / 2);
                el.className = 'cella-calcolo';
                el.id = 'cella-' + idx;
                el.addEventListener('click', function (e) { clickCella(idx, e); });
            } else if (gr % 2 === 0 && gc % 2 === 1) {
                // operatore di riga (colonna 1) oppure segno "=" (colonna 3)
                el.className = 'segno-calcolo';
                el.textContent = (gc === 1) ? simboloOp(opsRighe[gr / 2]) : '=';
                if (gc === 3) el.classList.add('segno-uguale');
            } else if (gr % 2 === 1 && gc % 2 === 0) {
                // operatore di colonna (riga 1) oppure segno "=" (riga 3)
                el.className = 'segno-calcolo';
                el.textContent = (gr === 1) ? simboloOp(opsColonne[gc / 2]) : '=';
                if (gr === 3) el.classList.add('segno-uguale');
            } else {
                el.className = 'vuoto-calcolo';
            }
            // I due punti hanno molto meno inchiostro di ×, − e +: senza un
            // ritocco di corpo si perderebbero fra le celle.
            if (el.textContent === ':') el.classList.add('segno-divisione');
            cont.appendChild(el);
        }
    }
}

function simboloOp(op) {
    if (op === 'x') return '×';
    // I due punti al posto del ÷: a 21px il segno di divisione e' un piu'
    // con due puntini sopra e sotto, e nello schema si scambiava per un +.
    if (op === ':') return ':';
    if (op === '-') return '−';
    return op;
}

// Costruisce la matrice delle possibilità: una riga per lettera, una colonna
// per cifra (0-9), più l'intestazione delle cifre e la casella della lettera.
function costruisciLegenda() {
    const cont = document.getElementById('matrice-esclusioni');
    cont.innerHTML = '';
    // Caselle passate da 30x22 a 53x31: la matrice si prende tutta la larghezza
    // del pannello (640px) da quando titolo e modi sono stati spostati di fianco
    // alla griglia. È lo strumento su cui si clicca decine di volte a partita,
    // quindi è qui che serve il bersaglio grande, specie col dito su un touch.
    cont.style.gridTemplateColumns = '52px repeat(10, 53px)';

    // Riga di intestazione: angolo vuoto + le dieci cifre
    const angolo = document.createElement('div');
    angolo.className = 'mat-angolo';
    cont.appendChild(angolo);
    for (let d = 0; d <= 9; d++) {
        const th = document.createElement('div');
        th.className = 'mat-intestazione';
        th.id = 'mat-col-' + d;
        th.textContent = d;
        cont.appendChild(th);
    }

    // Una riga per ogni lettera in gioco
    lettere.forEach(function (l) {
        const nome = document.createElement('button');
        nome.className = 'btn-lettera';
        nome.id = 'btn-lettera-' + l;
        nome.innerHTML = '<span class="lettera-nome">' + l + '</span>' +
            '<span class="lettera-cifra"></span>';
        nome.addEventListener('click', function () { selezionaLettera(l); });
        cont.appendChild(nome);

        for (let d = 0; d <= 9; d++) {
            const cel = document.createElement('button');
            cel.className = 'mat-cella';
            cel.id = 'mat-' + l + '-' + d;
            // Coordinata in filigrana (es. "A5"): sta in un attributo e non nel
            // contenuto perché renderLegenda riscrive textContent a ogni render
            // e cancellerebbe qualunque figlio. La disegna il ::before del CSS.
            cel.dataset.coord = l + d;
            cel.addEventListener('click', function () { clickMatrice(l, d); });
            // Tasto destro: assegna direttamente, senza passare dal pulsante
            // "Assegna". E' la scorciatoia per chi sa gia' cosa vuole fare, e
            // non tocca il modo attivo: finito il click si resta dov'eravamo.
            cel.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                clickMatrice(l, d, true);
            });
            cont.appendChild(cel);
        }
    });
}

// Il click su un incrocio fa quello che dice il radio button attivo: escludere
// la combinazione oppure assegnarla. Il modo "cancella" non esiste piu': ogni
// segno si toglie ricliccandoci sopra, che e' il gesto che il giocatore prova
// per primo, e un modo apposta non serviva a niente.
// `forzaAssegna` arriva dal tasto destro: assegna comunque, qualunque sia il
// modo attivo, senza dover prima armare "Assegna".
function clickMatrice(l, d, forzaAssegna) {
    if (partitaFinita) return;
    if (!esclusioni[l]) esclusioni[l] = new Array(10).fill(ESCL_NO);

    // Riclick su un'assegnazione: la toglie, in qualunque modo si sia. Vale sia
    // per quelle giuste sia per quelle sbagliate, cosi' il comportamento non
    // lascia capire di striscio se la cifra era quella buona.
    if (assegnazioni[l] === d) {
        letteraSelezionata = l;
        selezioneAutomatica = false;
        cancellaCifra(true);      // ripulisce anche le esclusioni che aveva generato
        return;
    }

    if (modoMatrice === 'assegna' || forzaAssegna) {
        // Una lettera gia' assegnata non si sposta su un'altra cifra: prima si
        // annulla ricliccando sulla sua casella. Senza questa guardia un click
        // distratto cambierebbe un'assegnazione ragionata senza chiedere nulla.
        if (assegnazioni[l] !== undefined) return;
        // Col destro si assegna anche sopra una casella gia' barrata a mano: il
        // gesto e' esplicito, e il giocatore sta correggendo un'esclusione che
        // ora sa sbagliata. La × sparisce da se' con l'assegnazione.
        // Assegnare significa scrivere la cifra nella griglia: passa dal motore
        // normale, che conta gli errori e propaga le esclusioni di riflesso
        letteraSelezionata = l;
        selezioneAutomatica = false;
        // Se sotto c'era una × messa a mano, la cancello ma me ne ricordo: e'
        // l'assegnazione a farla sparire, quindi deve tornare col suo undo.
        const esclSoppressa = esclusioni[l][d] === ESCL_MANO ? d : null;
        esclusioni[l][d] = ESCL_NO;
        assegnaCifra(d);   // è lui che riporta il modo a "escludi"
        if (esclSoppressa !== null && cronologia.length) {
            cronologia[cronologia.length - 1].esclSoppressa = esclSoppressa;
        }
        return;
    }

    // modo "escludi": è un interruttore sulla sola annotazione a mano.
    // Le esclusioni automatiche non si tolgono da qui: dipendono dall'assegnazione.
    if (esclusioni[l][d] === ESCL_AUTO) return;
    const poneEsclusione = esclusioni[l][d] !== ESCL_MANO;
    salvaSnapshotEsclusione(l, d, esclusioni[l][d]);
    esclusioni[l][d] = poneEsclusione ? ESCL_MANO : ESCL_NO;

    // Escludere la cifra giusta e' un errore come assegnarne una sbagliata: la
    // casella diventa rossa, e quel rosso e' a tutti gli effetti un aiuto (dice
    // che li' sotto c'e' la soluzione), quindi si paga. Vale solo con la
    // segnalazione errori attiva: spenta, la casella non si colora e non c'e'
    // nessun aiuto da pagare. Si conta solo quando l'esclusione viene messa e
    // solo la prima volta per casella, altrimenti clicca-e-riclicca sulla stessa
    // cifra gonfierebbe il contatore all'infinito.
    if (poneEsclusione && esclusioneErrata(l, d) && !esclusioniPunite[l + '-' + d]) {
        esclusioniPunite[l + '-' + d] = true;
        erroriCount++;
        applicaPenalita(PENALITA_ERRORE, 'mat-' + l + '-' + d);
    }

    renderTutto();
    salvaPartita();
}

// Cambia il modo di click da codice, tenendo allineato il radio button.
function impostaModo(m) {
    modoMatrice = m;
    const r = document.querySelector('input[name="modo-matrice"][value="' + m + '"]');
    if (r) r.checked = true;
    renderModo();
}

// Assegnare una cifra esclude di riflesso il resto della riga e della colonna:
// è l'annotazione che il giocatore farebbe comunque a mano, ma marcata come
// automatica per distinguerla dalle esclusioni che ha ragionato lui.
function propagaEsclusioni(l, d) {
    lettere.forEach(function (altra) {
        if (!esclusioni[altra]) esclusioni[altra] = new Array(10).fill(ESCL_NO);
        if (altra === l) {
            // la lettera assegnata esclude tutte le altre cifre
            for (let x = 0; x <= 9; x++) {
                if (x !== d && esclusioni[altra][x] === ESCL_NO) esclusioni[altra][x] = ESCL_AUTO;
            }
        } else if (esclusioni[altra][d] === ESCL_NO) {
            // le altre lettere non possono più usare quella cifra
            esclusioni[altra][d] = ESCL_AUTO;
        }
    });
}

// Opzione "sbarra le cifre assenti": marca come già escluse le colonne delle
// cifre che nello schema non compaiono affatto. Serve a rendere legittimo il
// ragionamento per colonna, che senza questo è zoppo: una colonna con una sola
// casella libera non dimostra niente finché quella cifra potrebbe non essere in
// gioco. Con le colonne morte sbarrate, la matrice torna un quadrato pieno.
// Va da sé che è un aiuto: di default è spenta. Si può accendere e spegnere in
// qualunque momento dal pannello dei controlli.
function preescludiCifreAssenti() {
    if (!opzSbarraAssenti) return;
    const inGioco = new Set(lettere.map(l => soluzioneMappa[l]));
    for (let d = 0; d <= 9; d++) {
        if (inGioco.has(d)) continue;
        lettere.forEach(function (l) {
            if (esclusioni[l][d] === ESCL_NO) esclusioni[l][d] = ESCL_AUTO;
        });
    }
}

// Toglie le esclusioni automatiche non più giustificate da nessuna assegnazione:
// si ricalcolano da zero, così cancellare una cifra ripulisce i suoi riflessi
// senza toccare le esclusioni segnate a mano.
function ricalcolaEsclusioniAuto() {
    lettere.forEach(function (l) {
        if (!esclusioni[l]) esclusioni[l] = new Array(10).fill(ESCL_NO);
        for (let d = 0; d <= 9; d++) {
            if (esclusioni[l][d] === ESCL_AUTO) esclusioni[l][d] = ESCL_NO;
        }
    });
    // Le colonne morte rientrano nel ricalcolo: sono anche loro esclusioni
    // automatiche, e senza questa riga il primo annullamento le cancellerebbe.
    preescludiCifreAssenti();
    lettere.forEach(function (l) {
        if (assegnazioni[l] !== undefined) propagaEsclusioni(l, assegnazioni[l]);
    });
}

// Una lettera è errata se ha una cifra diversa da quella della soluzione
function letteraErrata(l) {
    if (!opzErrori) return false;
    const c = assegnazioni[l];
    return c !== undefined && c !== soluzioneMappa[l];
}

function renderGriglia() {
    for (let i = 0; i < 9; i++) {
        const cella = document.getElementById('cella-' + i);
        if (!cella) continue;
        // Ogni carattere è un suo <span>, così si può evidenziare la lettera selezionata
        let html = '';
        patterns[i].forEach(function (idx) {
            const l = lettere[idx];
            const c = assegnazioni[l];
            let cls = 'ch';
            if (c === undefined) cls += ' ch-lettera';
            else cls += ' ch-cifra';
            if (l === letteraSelezionata) cls += ' ch-selezionata';
            if (letteraErrata(l)) cls += ' ch-errata';
            if (hintTarget && hintTarget.lettera === l) {
                cls += (hintTarget.tipo === 'errore') ? ' ch-suggerita-errore' : ' ch-suggerita';
            }
            // La lettera sta anche in un attributo: serve al click per sapere
            // su quale carattere si e' premuto davvero, non solo su quale cella
            html += '<span class="' + cls + '" data-l="' + l + '">' +
                    (c === undefined ? l : c) + '</span>';
        });
        cella.innerHTML = html;
        // La cella è larga 112px al netto dei bordi: a 34px per carattere i
        // numeri di quattro cifre ci stanno appena, e con la lettera in corsivo
        // o l'alone della selezione arrivano a toccare i bordi. Il CSS stringe
        // il testo in base a questa classe invece di allargare la griglia, che
        // è incastrata in un campo di dimensioni fisse.
        cella.classList.toggle('cella-4ch', patterns[i].length >= 4);
        cella.classList.toggle('completa', cellaCompleta(i));
    }
    renderSegni();
}

// Colora i segni "=" secondo lo stato dell'operazione: verde se torna, rosso se no
function renderSegni() {
    const cont = document.getElementById('griglia-calcolo');
    const figli = cont.children;
    const stati = {};
    listaOperazioni().forEach(function (o) {
        stati[o.tipo + o.n] = statoOperazione(o.idx[0], o.op, o.idx[1], o.idx[2]);
    });
    for (let gr = 0; gr < 5; gr++) {
        for (let gc = 0; gc < 5; gc++) {
            const el = figli[gr * 5 + gc];
            if (!el || !el.classList.contains('segno-uguale')) continue;
            let stato = 'vuota';
            if (gr % 2 === 0 && gc === 3) stato = stati['riga' + (gr / 2)];
            if (gc % 2 === 0 && gr === 3) stato = stati['colonna' + (gc / 2)];
            el.classList.toggle('op-ok', stato === 'ok');
            el.classList.toggle('op-errata', stato === 'errata');
        }
    }
}

function renderLegenda() {
    lettere.forEach(function (l) {
        const btn = document.getElementById('btn-lettera-' + l);
        if (!btn) return;
        const c = assegnazioni[l];
        btn.querySelector('.lettera-cifra').textContent = (c === undefined) ? '?' : c;
        btn.classList.toggle('selezionata', l === letteraSelezionata);
        btn.classList.toggle('assegnata', c !== undefined);
        btn.classList.toggle('errata', letteraErrata(l));
        btn.classList.toggle('suggerita', !!(hintTarget && hintTarget.lettera === l));

        // Stato di ogni incrocio della riga
        const escl = esclusioni[l] || [];
        for (let d = 0; d <= 9; d++) {
            const cel = document.getElementById('mat-' + l + '-' + d);
            if (!cel) continue;
            const assegnata = (c === d);
            const stato = escl[d] || ESCL_NO;
            cel.classList.toggle('mat-assegnata', assegnata);
            cel.classList.toggle('mat-esclusa', !assegnata && stato === ESCL_MANO);
            // Esclusione dedotta dall'assegnazione: segno diverso, più tenue
            cel.classList.toggle('mat-esclusa-auto', !assegnata && stato === ESCL_AUTO);
            cel.classList.toggle('mat-riga-sel', l === letteraSelezionata);
            // Segnala assegnazioni ed esclusioni sbagliate, se l'opzione è attiva
            cel.classList.toggle('mat-errata', assegnata && letteraErrata(l));
            cel.classList.toggle('mat-escl-errata',
                !assegnata && stato === ESCL_MANO && esclusioneErrata(l, d));
            // Il segno dell'esclusione automatica è un pallino piccolo e non
            // un punto mediano: quest'ultimo si appoggia alla linea di base e
            // nella casella si leggeva come un granello fuori centro.
            cel.textContent = assegnata ? '●' :
                (stato === ESCL_MANO ? '×' : (stato === ESCL_AUTO ? '•' : ''));
            // L'unica cifra rimasta possibile su una riga: si evidenzia da sé
            cel.classList.toggle('mat-unica', !assegnata && stato === ESCL_NO &&
                c === undefined && contaPossibili(l) === 1);
        }
    });
    // Intestazione di colonna: spenta quando quella cifra è già stata presa
    for (let d = 0; d <= 9; d++) {
        const th = document.getElementById('mat-col-' + d);
        if (!th) continue;
        const presa = lettere.some(l => assegnazioni[l] === d);
        th.classList.toggle('col-presa', presa);
    }
}

// Quante cifre restano possibili per una lettera, secondo le esclusioni segnate
function contaPossibili(l) {
    const escl = esclusioni[l] || [];
    let n = 0;
    for (let d = 0; d <= 9; d++) if ((escl[d] || ESCL_NO) === ESCL_NO) n++;
    return n;
}

// Un'esclusione segnata a mano è sbagliata se toglie proprio la cifra giusta
function esclusioneErrata(l, d) {
    if (!opzErrori) return false;
    return soluzioneMappa[l] === d;
}

// Evidenzia il modo attivo, così si vede a colpo d'occhio cosa farà il click
function renderModo() {
    ['escludi', 'assegna'].forEach(function (m) {
        const el = document.getElementById('modo-' + m);
        if (el) el.classList.toggle('attivo', modoMatrice === m);
    });
    const mat = document.getElementById('matrice-esclusioni');
    if (mat) mat.className = 'modo-' + modoMatrice;
    // Anche il pannello porta il modo: la cornice rossa del modo "assegna" sta
    // sul bordo esterno, che e' suo e non della griglia interna.
    const pan = document.getElementById('pannello-legenda');
    if (pan) pan.classList.toggle('pannello-assegna',
                                  modoMatrice === 'assegna' && !partitaFinita);
    aggiornaSprite();
}

// Pallino che segue il puntatore quando il modo "assegna" è armato: dato che il
// modo torna da solo a "escludi" dopo ogni assegnazione, senza un segno addosso
// al cursore è facile non accorgersi di com'è messo. È lo stesso simbolo della
// voce "Assegna" nella legenda.
function aggiornaSprite() {
    let sp = document.getElementById('sprite-assegna');
    if (!sp) {
        // Creato da codice invece che nei due file HTML: è un elemento di pura
        // presentazione e così non può disallinearsi tra italiano e inglese.
        sp = document.createElement('div');
        sp.id = 'sprite-assegna';
        sp.textContent = '●';
        document.body.appendChild(sp);
    }
    const armato = modoMatrice === 'assegna' && !partitaFinita;
    sp.classList.toggle('visibile', armato);
    // Fuori dal modo assegna lo sprite non deve restare dov'era: al prossimo
    // armamento riapparirebbe per un istante nel punto vecchio.
    if (!armato) sp.style.transform = 'translate(-9999px, -9999px)';
}

function renderInfo() {
    document.getElementById('info-errori').textContent = erroriCount;
    // Con un livello solo il nome della difficolta' non direbbe niente: al suo
    // posto il dato che cambia davvero da schema a schema, cioe' quante lettere
    // (e quindi quante cifre distinte) sono in gioco.
    document.getElementById('info-difficolta').textContent = lettere.length || '--';
    aggiornaTimer();
    renderRecord();
}

function renderTutto() {
    if (!lettere.length) { renderInfo(); return; }
    renderGriglia();
    renderLegenda();
    renderModo();
    renderInfo();
}

// stile opzionale: 'giallo' (suggerimento) o 'rosso' (errore); default pillola verde scuro
function setMessaggio(testo, stile) {
    const el = document.getElementById('messaggio-stato');
    el.textContent = testo;
    el.classList.remove('msg-giallo', 'msg-rosso');
    if (stile === 'giallo') el.classList.add('msg-giallo');
    if (stile === 'rosso') el.classList.add('msg-rosso');
}

// === INTERAZIONE ===
function selezionaLettera(l) {
    if (partitaFinita) return;
    // Il toggle vale solo su una selezione voluta dall'utente: se la lettera era
    // stata evidenziata dal gioco, cliccarla la conferma (è il gesto naturale)
    if (letteraSelezionata === l && !selezioneAutomatica) {
        letteraSelezionata = null;
    } else {
        letteraSelezionata = l;
    }
    selezioneAutomatica = false;
    renderTutto();
}

// Click su una cella della griglia: seleziona il carattere su cui si e' premuto.
// Ogni carattere e' un <span> con la sua lettera in `data-l`, quindi in una
// cella come FACH si prende davvero la H se si clicca la H. Solo se il click
// cade a fianco dei caratteri (il padding della cella) si ricade sulla prima
// lettera ancora senza cifra, o sull'ultima se sono tutte assegnate.
function clickCella(i, e) {
    if (partitaFinita) return;
    const span = e && e.target && e.target.closest ? e.target.closest('.ch') : null;
    if (span && span.dataset.l) {
        selezionaLettera(span.dataset.l);
        return;
    }
    const idxLettere = patterns[i];
    let scelta = null;
    for (const idx of idxLettere) {
        const l = lettere[idx];
        if (assegnazioni[l] === undefined) { scelta = l; break; }
    }
    if (scelta === null) scelta = lettere[idxLettere[idxLettere.length - 1]];
    selezionaLettera(scelta);
}

// Assegna una cifra alla lettera selezionata
function assegnaCifra(d) {
    if (partitaFinita || letteraSelezionata === null) return;
    const l = letteraSelezionata;

    // La cifra è già di un'altra lettera: rifiuta, è un vincolo del gioco
    for (const altra of lettere) {
        if (altra !== l && assegnazioni[altra] === d) {
            setMessaggio(CALC_LANG.cifraOccupata(altra), 'rosso');
            riproduciAudio('sounds/scala40/knock.mp3');
            return;
        }
    }

    salvaSnapshot(l);
    assegnazioni[l] = d;
    // ricalcolo e non semplice propagazione: se la lettera aveva già un'altra
    // cifra, le esclusioni automatiche della precedente vanno ritirate
    ricalcolaEsclusioniAuto();
    annullaSuggerimento(true);

    // Cifra sbagliata rispetto alla soluzione: conta come errore, con penalità
    if (opzErrori && d !== soluzioneMappa[l]) {
        erroriCount++;
        applicaPenalita(PENALITA_ERRORE, 'btn-lettera-' + l);
    }

    // Fatta l'assegnazione non si evidenzia più niente. Prima si saltava in
    // automatico alla prossima lettera libera, ma quell'evidenziazione arrivava
    // senza che il giocatore l'avesse chiesta e sembrava un suggerimento del
    // gioco: la selezione ora nasce solo da un click esplicito sulla lettera.
    letteraSelezionata = null;
    selezioneAutomatica = false;

    // Il modo "assegna" è monostabile: fatta l'assegnazione si torna a
    // "escludi". Sta qui e non nel gestore del click perché valga per tutte le
    // strade che portano a un'assegnazione: matrice, tastiera e suggerimento.
    if (modoMatrice === 'assegna') impostaModo('escludi');

    renderTutto();
    salvaPartita();
    controllaVittoria();
}

// Toglie la cifra alla lettera selezionata.
// `daMatrice` dice che la selezione era solo il mezzo tecnico per arrivare qui
// (riclick sull'incrocio col destro): in quel caso la lettera non deve restare
// evidenziata, come già non resta dopo un'assegnazione o un annullamento. Con
// una cifra sbagliata la cosa si notava piu' di tutte, perche' la lettera era
// appena diventata rossa e restava poi accesa in giallo dappertutto. Dalla
// tastiera invece la selezione e' voluta e resta: si e' li' per riscrivere.
function cancellaCifra(daMatrice) {
    if (partitaFinita || letteraSelezionata === null) return;
    if (assegnazioni[letteraSelezionata] === undefined) return;
    salvaSnapshot(letteraSelezionata);
    delete assegnazioni[letteraSelezionata];
    // le esclusioni che quell'assegnazione aveva propagato non valgono più
    ricalcolaEsclusioniAuto();
    // Un suggerimento che puntava a questa lettera ha finito il suo compito:
    // lasciarlo acceso terrebbe la lettera evidenziata a vuoto.
    annullaSuggerimento(true);
    if (daMatrice) {
        letteraSelezionata = null;
        selezioneAutomatica = false;
    }
    renderTutto();
    salvaPartita();
}

// === UNDO ===
// Una pila sola, in ordine di click: assegnazioni ed esclusioni a mano stanno
// nello stesso stack e si annullano a ritroso nell'ordine in cui sono state
// fatte. Sono le due cose che il giocatore "fa", e separarle vorrebbe dire
// chiedergli di ricordare quale delle due sta per tornare indietro.
//
// Nessuno snapshot della matrice: le esclusioni automatiche non si salvano
// perche' si rigenerano da ricalcolaEsclusioniAuto() a partire dalle
// assegnazioni, e quelle a mano tornano indietro una alla volta con la propria
// voce. Prima invece ogni assegnazione fotografava l'intera matrice e l'undo la
// rimetteva in blocco: cosi' annullare un'assegnazione cancellava anche tutte le
// esclusioni ragionate dopo di essa.
function salvaSnapshot(l) {
    cronologia.push({ tipo: 'assegna', lettera: l, cifraPrec: assegnazioni[l] });
    if (cronologia.length > 200) cronologia.shift();
}

// Anche togliere un'esclusione e' una mossa da annullare: `statoPrec` copre da
// solo i due versi dell'interruttore.
function salvaSnapshotEsclusione(l, d, statoPrec) {
    cronologia.push({ tipo: 'esclusione', lettera: l, cifra: d, statoPrec: statoPrec });
    if (cronologia.length > 200) cronologia.shift();
}

function annullaMossa() {
    if (partitaFinita || cronologia.length === 0) return;
    const s = cronologia.pop();

    if (s.tipo === 'esclusione') {
        // Solo la casella toccata torna com'era. La penalita' eventualmente pagata
        // non si restituisce, e esclusioniPunite non si tocca: e' la memoria di
        // uno sbaglio gia' pagato, e riavvolgerla farebbe pagare due volte lo
        // stesso errore a chi annulla e rimette la stessa esclusione.
        if (esclusioni[s.lettera]) esclusioni[s.lettera][s.cifra] = s.statoPrec;
    } else {
        if (s.cifraPrec === undefined) delete assegnazioni[s.lettera];
        else assegnazioni[s.lettera] = s.cifraPrec;
        // Le esclusioni di riflesso si ricavano dalle assegnazioni rimaste: quelle
        // messe a mano restano dove sono.
        ricalcolaEsclusioniAuto();
        // La × che l'assegnazione aveva coperto torna al suo posto.
        if (s.esclSoppressa !== undefined && esclusioni[s.lettera] &&
            esclusioni[s.lettera][s.esclSoppressa] === ESCL_NO) {
            esclusioni[s.lettera][s.esclSoppressa] = ESCL_MANO;
        }
    }

    // Nessuna evidenziazione: l'undo riporta indietro la mossa, non indica una
    // lettera su cui lavorare.
    letteraSelezionata = null;
    selezioneAutomatica = false;
    annullaSuggerimento(true);
    renderTutto();
    salvaPartita();
}

// === SUGGERIMENTO (didattico, a due fasi) ===
// Cerca una lettera la cui cifra sia univocamente determinata dalle assegnazioni
// già fatte: si prova ogni cifra alternativa e si guarda se lo schema resta risolvibile.
function trovaDeduzione() {
    // Priorità 1: una lettera con cifra sbagliata
    for (const l of lettere) {
        const c = assegnazioni[l];
        if (c !== undefined && c !== soluzioneMappa[l]) {
            return { tipo: 'errore', lettera: l, cifra: soluzioneMappa[l] };
        }
    }

    // Priorità 2: una lettera ancora vuota che ammette una sola cifra possibile,
    // date le assegnazioni correnti (tutte corrette, visto il controllo sopra)
    const fisseBase = {};
    lettere.forEach(function (l, i) {
        if (assegnazioni[l] !== undefined) fisseBase[i] = assegnazioni[l];
    });

    for (let i = 0; i < lettere.length; i++) {
        const l = lettere[i];
        if (assegnazioni[l] !== undefined) continue;
        let possibili = 0;
        for (let d = 0; d <= 9 && possibili < 2; d++) {
            const fisse = Object.assign({}, fisseBase);
            fisse[i] = d;
            const r = contaSoluzioni(patterns, opsRighe, opsColonne, lettere.length, 1, fisse);
            if (r.sol > 0) possibili++;
        }
        if (possibili === 1) {
            return { tipo: 'deduzione', lettera: l, cifra: soluzioneMappa[l] };
        }
    }

    // Ripiego: la prima lettera vuota (c'è sempre una deduzione, ma se il calcolo
    // sopra non la isola si indica comunque una lettera valida)
    const vuota = lettere.find(x => assegnazioni[x] === undefined);
    if (vuota !== undefined) {
        return { tipo: 'deduzione', lettera: vuota, cifra: soluzioneMappa[vuota] };
    }
    return null;
}

function spiegaDeduzione(ded) {
    if (ded.tipo === 'errore') {
        return CALC_LANG.spiegaUnica(ded.lettera, ded.cifra);
    }
    return CALC_LANG.spiegaUnica(ded.lettera, ded.cifra);
}

function suggerimento() {
    if (partitaFinita || !lettere.length) return;
    if (hintTarget) { chiudiPannelloHint(); return; }

    const ded = trovaDeduzione();
    if (!ded) return;

    hintCount++;
    applicaPenalita(PENALITA_AIUTO, 'btn-hint');
    hintTarget = { tipo: ded.tipo, lettera: ded.lettera, cifra: ded.cifra, extraPagato: false };
    letteraSelezionata = ded.lettera;
    selezioneAutomatica = true;
    apriPannelloHint();
    renderTutto();
    salvaPartita();
}

function apriPannelloHint() {
    // Occupano lo stesso spazio: vedi apriCalcolatrice()
    if (calcAperta) chiudiCalcolatrice();
    const pann = document.getElementById('pannello-hint');
    document.getElementById('hint-testo').innerHTML =
        (hintTarget.tipo === 'errore') ? CALC_LANG.hintErrore : CALC_LANG.hintDeduzione;
    document.getElementById('hint-penalita').innerHTML = CALC_LANG.hintPenalita;
    document.getElementById('btn-hint-applica').textContent =
        (hintTarget.tipo === 'errore') ? CALC_LANG.btnCancellaErrore : CALC_LANG.btnApplica;
    pann.classList.add('aperto');
}

function chiudiPannelloHint() {
    document.getElementById('pannello-hint').classList.remove('aperto');
}

// Annulla il suggerimento in corso. Con `silenzioso` non ridisegna (lo fa il chiamante).
function annullaSuggerimento(silenzioso) {
    if (!hintTarget) return;
    hintTarget = null;
    chiudiPannelloHint();
    if (!silenzioso) renderTutto();
}

// La penalità extra si paga una sola volta per suggerimento, anche usando
// sia la Spiegazione sia l'assegnazione
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
    const l = hintTarget.lettera;
    const tipo = hintTarget.tipo;
    annullaSuggerimento(true);
    document.getElementById('btn-hint-spiega').disabled = false;

    if (tipo === 'errore') {
        salvaSnapshot(l);
        delete assegnazioni[l];
        ricalcolaEsclusioniAuto();
        // La cifra sbagliata è stata tolta: la lettera torna libera come le
        // altre e non resta evidenziata.
        letteraSelezionata = null;
        selezioneAutomatica = false;
        renderTutto();
        salvaPartita();
        return;
    }

    // Assegna la cifra corretta senza contarla come errore
    salvaSnapshot(l);
    assegnazioni[l] = soluzioneMappa[l];
    if (esclusioni[l]) esclusioni[l][soluzioneMappa[l]] = ESCL_NO;
    propagaEsclusioni(l, soluzioneMappa[l]);
    letteraSelezionata = null;
    selezioneAutomatica = false;
    renderTutto();
    salvaPartita();
    controllaVittoria();
}

// === CALCOLATRICE ===
// Serve per i conti che a mente costano davvero: una moltiplicazione 2x2 cifre,
// una divisione, quando manca un solo numero per chiudere una riga. Si apre, si
// fa il conto e si chiude, quindi non ha memoria e non si salva da nessuna
// parte: al reload riparte da zero come qualunque calcolatrice spenta.
// Non e' un aiuto e non entra nelle statistiche: non dice niente sullo schema,
// fa solo l'aritmetica che il giocatore farebbe su un foglio.
// (calcAperta e' dichiarata con le altre globali in cima: la leggono anche
// apriPannelloHint e il gestore della tastiera, che stanno piu' su.)
let calcCorrente = '0';    // numero in digitazione, come stringa
let calcAccumulato = null; // primo operando in attesa
let calcOperatore = null;  // operatore in attesa
let calcNuovoNumero = true; // il prossimo tasto-cifra ricomincia da capo

// Il display non e' un campo di testo: i numeri lunghi si leggono meglio se il
// separatore e' quello della lingua, ma i conti si fanno sempre col punto.
function calcFormatta(txt) {
    return CALC_LANG.decimale === ',' ? txt.replace('.', ',') : txt;
}

function calcMostra() {
    const num = document.getElementById('calc-numero');
    const op = document.getElementById('calc-operazione');
    if (!num) return;
    num.textContent = calcFormatta(calcCorrente);
    // Riga di servizio: ricorda cosa si sta facendo mentre si digita il secondo
    // operando, altrimenti dopo tre tasti non si sa piu' se era un x o un +.
    if (op) {
        const segni = { '+': '+', '-': '−', 'x': '×', ':': ':' };
        op.textContent = (calcAccumulato !== null && calcOperatore)
            ? calcFormatta(calcArrotonda(calcAccumulato)) + ' ' + segni[calcOperatore] : '';
    }
}

// Il risultato si taglia a 10 cifre significative: senza, 1:3 riempie il display
// di 3 e i numeri dello schema (al massimo 4 cifre) diventano illeggibili.
function calcArrotonda(v) {
    if (!isFinite(v)) return '∞';
    const s = parseFloat(v.toPrecision(10)).toString();
    return s.length > 14 ? v.toExponential(6) : s;
}

function calcApplica(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === 'x') return a * b;
    if (op === ':') return b === 0 ? NaN : a / b;
    return b;
}

function calcTasto(t) {
    if (t >= '0' && t <= '9') {
        calcCorrente = (calcNuovoNumero || calcCorrente === '0') ? t : calcCorrente + t;
        calcNuovoNumero = false;
    } else if (t === ',') {
        if (calcNuovoNumero) { calcCorrente = '0.'; calcNuovoNumero = false; }
        else if (calcCorrente.indexOf('.') < 0) calcCorrente += '.';
    } else if (t === 'C') {
        calcCorrente = '0'; calcAccumulato = null; calcOperatore = null; calcNuovoNumero = true;
    } else if (t === 'back') {
        // Cancella l'ultima cifra digitata. Su un risultato appena calcolato non
        // ha senso rosicchiare le cifre una a una: azzera e basta.
        if (calcNuovoNumero) calcCorrente = '0';
        else calcCorrente = calcCorrente.length > 1 ? calcCorrente.slice(0, -1) : '0';
        if (calcCorrente === '' || calcCorrente === '-') calcCorrente = '0';
    } else if (t === 'sqrt') {
        const v = parseFloat(calcCorrente);
        calcCorrente = v < 0 ? 'ERR' : calcArrotonda(Math.sqrt(v));
        calcNuovoNumero = true;
    } else if (t === '+' || t === '-' || t === 'x' || t === ':') {
        const v = parseFloat(calcCorrente);
        if (!isNaN(v)) {
            // Operatori in catena: 2 x 3 x 4 chiude il primo prodotto e tiene il
            // secondo in attesa, come su una calcolatrice vera.
            calcAccumulato = (calcAccumulato !== null && calcOperatore && !calcNuovoNumero)
                ? calcApplica(calcAccumulato, v, calcOperatore) : v;
            calcCorrente = calcArrotonda(calcAccumulato);
        }
        calcOperatore = t;
        calcNuovoNumero = true;
    } else if (t === '=') {
        const v = parseFloat(calcCorrente);
        if (calcAccumulato !== null && calcOperatore && !isNaN(v)) {
            const r = calcApplica(calcAccumulato, v, calcOperatore);
            calcCorrente = isNaN(r) ? 'ERR' : calcArrotonda(r);
        }
        calcAccumulato = null; calcOperatore = null; calcNuovoNumero = true;
    }
    calcMostra();
}

function apriCalcolatrice() {
    // Calcolatrice e suggerimento occupano lo stesso spazio: l'ultimo che si
    // apre chiude l'altro, altrimenti si sovrappongono e non si capisce quale
    // dei due sta rispondendo ai tasti.
    annullaSuggerimento(true);
    // annullaSuggerimento esce subito se non c'e' un hint in corso, ma il pannello
    // puo' essere aperto lo stesso: qui lo chiudo comunque, altrimenti i due
    // riquadri finiscono uno sopra l'altro nello stesso posto.
    chiudiPannelloHint();
    calcAperta = true;
    calcCorrente = '0'; calcAccumulato = null; calcOperatore = null; calcNuovoNumero = true;
    document.getElementById('pannello-calc').classList.add('aperto');
    calcMostra();
    renderTutto();
}

function chiudiCalcolatrice() {
    calcAperta = false;
    document.getElementById('pannello-calc').classList.remove('aperto');
    renderTutto();
}

// === PENALITÀ SUL TEMPO ===
function applicaPenalita(sec, idElemento) {
    secondi += sec;
    aggiornaTimer();
    let x = ultimoMouseX, y = ultimoMouseY;
    if (x < 0 || y < 0) {
        const el = idElemento && document.getElementById(idElemento);
        if (el) {
            const r = el.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
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
function controllaVittoria() {
    // Tutte le lettere devono avere una cifra
    for (const l of lettere) {
        if (assegnazioni[l] === undefined) return;
    }
    // ...e tutte le operazioni devono tornare
    const ops = listaOperazioni();
    for (const o of ops) {
        if (statoOperazione(o.idx[0], o.op, o.idx[1], o.idx[2]) !== 'ok') {
            setMessaggio(CALC_LANG.schemaErrori, 'rosso');
            riproduciAudio('sounds/scala40/knock.mp3');
            return;
        }
    }

    partitaFinita = true;
    aggiornaSprite();   // a partita finita il pallino non deve restare appeso al cursore
    if (timerId) clearInterval(timerId);
    localStorage.removeItem('calcolo-save');
    riproduciAudio('sounds/scala40/tada.mp3');

    // Dei tre record si annuncia solo il piu' alto caduto: dire insieme
    // "assoluto" e "di oggi" non aggiunge niente, l'assoluto li implica.
    const battuti = aggiornaRecords(secondi);
    const record = battuti.all ? 'all' : (battuti.weekly ? 'weekly' : (battuti.daily ? 'daily' : null));

    document.getElementById('vittoria-messaggio').innerHTML = CALC_LANG.vittoria;
    document.getElementById('vittoria-dettagli').textContent =
        CALC_LANG.riepilogo(difficolta, formattaTempo(secondi), erroriCount, hintCount);

    // Il record non e' piu' una coda del riepilogo: ha una fascia sua, e la
    // modale cresce verso il basso per farle posto (il bordo alto resta dov'e',
    // perche' sopra ci sta il banner).
    const fascia = document.getElementById('vittoria-record');
    fascia.textContent = record ? CALC_LANG.record[record] : '';
    fascia.style.display = record ? 'block' : 'none';
    document.getElementById('haivinto').classList.toggle('con-record', !!record);

    // Analytics fine partita
    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_won', {
            'event_category': 'CalcoloEnigmatico',
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
        // L'applauso parte con la modale, non con il tada' della vittoria:
        // sovrapposti si impastano, e cosi' il secondo suono arriva insieme
        // alla fascia dorata che lo spiega.
        if (record) riproduciAudio('sounds/scala40/applause.mp3');
        // Banner pubblicitario sopra la modale di vittoria (come in Sudoku)
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('haivinto', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false, // posizione già definita nel CSS
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 800);
}

// "Vedi lo schema": toglie di mezzo la modale di vittoria per lasciar guardare
// la matrice risolta, e lascia in basso i due comandi essenziali (come il
// "vedi carte" di Scala 40).
function vediSchema() {
    document.getElementById('haivinto').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    // il banner della modale non deve restare sospeso sul campo vuoto
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });

    let pannello = document.getElementById('calcolo-minimal-win-panel');
    if (!pannello) {
        pannello = document.createElement('div');
        pannello.id = 'calcolo-minimal-win-panel';
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

// Riapre la modale di vittoria dal pannellino in basso
function tornaAlRisultato() {
    const pannello = document.getElementById('calcolo-minimal-win-panel');
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
    const minimal = document.getElementById('calcolo-minimal-win-panel');
    if (minimal) minimal.style.display = 'none';
    // Rimuove i banner delle modali per evitare annunci obsoleti alla riapertura
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    // L'avviso di attesa (o l'errore di una generazione fallita) appartiene al
    // tentativo precedente: la modale si riapre sempre pulita.
    const avviso = document.getElementById('msg-generazione');
    if (avviso) { avviso.style.display = 'none'; avviso.classList.remove('msg-errore'); }
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('calcolo-difficolta') || CALC_LIVELLO_DEF);
}

function riprendiPartita() {
    chiudiModali();
    avviaTimer();
    setMessaggio(CALC_LANG.partitaInCorso);
}

let tempDifficolta = CALC_LIVELLO_DEF;
function selezionaDifficolta(diff) {
    // Un livello di un'edizione precedente salvato in localStorage (facile,
    // medio, difficile, standard) non esiste piu' con quel nome: si ricade sul
    // livello di mezzo invece di lasciare la scelta a vuoto.
    if (!CALC_LIVELLI[diff]) diff = CALC_LIVELLO_DEF;
    tempDifficolta = diff;
    Object.keys(CALC_LIVELLI).forEach(function (d) {
        const b = document.getElementById('btn-diff-' + d);
        if (b) b.classList.toggle('attiva', d === diff);
    });
}

function confermaEAvviaPartita() {
    nuovaPartita(tempDifficolta);
}

function richiediNuovaPartita() {
    // Se non c'è una partita in corso (o è finita), vai diretto alla scelta difficoltà
    if (partitaFinita || !lettere.length) {
        apriModaleInizio(false);
        return;
    }
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('confermatermina').style.display = 'flex';
    // Banner pubblicitario sopra la modale (stessa struttura di Sudoku)
    if (typeof setupAmazonFinishBanner === 'function') {
        setupAmazonFinishBanner('confermatermina', {
            modalStyle: { overflow: 'visible' },
            targetTop: 470,
            applyModalTop: false, // posizione già definita nel CSS
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

// === TASTIERA ===
document.addEventListener('keydown', function (e) {
    if (partitaFinita) return;
    // Ignora la tastiera quando un modale è aperto (schermo overlay visibile)
    const schermo = document.getElementById('schermo');
    if (schermo && schermo.style.display === 'block') return;
    // Non interferire con le scorciatoie di sistema (Ctrl+Alt+S/Q/P del layout)
    if (e.altKey) return;

    // Con la calcolatrice aperta la tastiera e' sua: le cifre finiscono nel
    // display, non sulle lettere dello schema. Chi ha le mani sui tasti per
    // digitare un conto non deve passare al mouse.
    if (calcAperta) {
        const k = e.key;
        let t = null;
        if (k >= '0' && k <= '9') t = k;
        else if (k === '+') t = '+';
        else if (k === '-') t = '-';
        else if (k === '*' || k.toLowerCase() === 'x') t = 'x';
        else if (k === '/' || k === ':') t = ':';
        else if (k === ',' || k === '.') t = ',';
        else if (k === 'Enter' || k === '=') t = '=';
        else if (k === 'Backspace') t = 'back';
        else if (k === 'Delete' || k.toLowerCase() === 'c') t = 'C';
        else if (k === 'Escape') { chiudiCalcolatrice(); e.preventDefault(); return; }
        if (t !== null) { e.preventDefault(); calcTasto(t); }
        return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        annullaMossa();
        return;
    }
    if (e.ctrlKey) return;

    if (e.key >= '0' && e.key <= '9') {
        assegnaCifra(parseInt(e.key, 10));
        return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        cancellaCifra();
        return;
    }
    // Una lettera in gioco la seleziona direttamente
    const k = e.key.toUpperCase();
    if (lettere.indexOf(k) >= 0) {
        selezionaLettera(k);
        return;
    }
    // Frecce: scorre le lettere della legenda
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ||
        e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!lettere.length) return;
        const avanti = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
        let pos = lettere.indexOf(letteraSelezionata);
        if (pos < 0) pos = avanti ? -1 : 0;
        pos = (pos + (avanti ? 1 : -1) + lettere.length) % lettere.length;
        letteraSelezionata = lettere[pos];
        renderTutto();
    }
});

// Traccia il cursore per posizionare lo sprite "+Ns" delle penalità e il
// pallino del modo "assegna". Sta in document.body con coordinate di viewport,
// come le penalità: così non deve fare i conti con la scala del campo.
document.addEventListener('mousemove', function (e) {
    ultimoMouseX = e.clientX;
    ultimoMouseY = e.clientY;
    if (modoMatrice === 'assegna' && !partitaFinita) {
        const sp = document.getElementById('sprite-assegna');
        if (sp) sp.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)';
    }
});

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initCalcolo);
    } else {
        initCalcolo();
    }
});

function initCalcolo() {
    // Se l'overlay dell'interstitial è presente a schermo, aspetta la sua chiusura
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initCalcolo();
            }
        }, 100);
        return;
    }

    // Inizializzazione audio toggle
    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }

    // Assicuriamoci che il layout si adegui
    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }

    // Riquadro affiliati sotto NUOVA PARTITA. Parte da qui e non da
    // DOMContentLoaded perche' initCalcolo attende la chiusura dell'interstitial:
    // ruotare mentre l'overlay copre la pagina conterebbe impression mai viste.
    // Non e' AdSense, quindi la rotazione automatica e' legittima.
    if (typeof setupRotatingAffiliateBanner === 'function') {
        const boxAff = document.getElementById('banner-rotante');
        if (boxAff) {
            setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
        }
    }

    // Radio button del modo: decidono cosa fa il click su un incrocio
    document.querySelectorAll('input[name="modo-matrice"]').forEach(function (r) {
        r.addEventListener('change', function () {
            if (this.checked) { modoMatrice = this.value; renderModo(); }
        });
    });
    // Sui due modi il tasto destro non deve aprire il menu del browser: su
    // "Assegna" e' la scorciatoia annunciata dall'etichetta, e il menu di
    // sistema in mezzo alla matrice sarebbe solo un intralcio.
    ['modo-escludi', 'modo-assegna'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    document.getElementById('btn-annulla').addEventListener('click', annullaMossa);
    document.getElementById('btn-hint').addEventListener('click', suggerimento);
    document.getElementById('btn-hint-spiega').addEventListener('click', mostraSpiegazioneHint);
    document.getElementById('btn-hint-applica').addEventListener('click', applicaHint);
    document.getElementById('btn-hint-chiudi').addEventListener('click', function () { annullaSuggerimento(); });
    document.getElementById('btn-calcolatrice').addEventListener('click', function () {
        if (calcAperta) chiudiCalcolatrice(); else apriCalcolatrice();
    });
    document.getElementById('btn-calc-chiudi').addEventListener('click', chiudiCalcolatrice);
    document.querySelectorAll('#calc-tasti .calc-t').forEach(function (b) {
        b.addEventListener('click', function () { calcTasto(b.dataset.calc); });
    });
    document.getElementById('btn-vedi-schema').addEventListener('click', vediSchema);
    document.getElementById('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);
    document.querySelectorAll('.btn-reset-record').forEach(function (btn) {
        btn.addEventListener('click', azzeraRecordSingolo);
    });

    // Record dei tempi migliori
    caricaRecords();

    // Modale conferma abbandono: il reload fa passare da interstitial, statistiche
    // di pagina e refresh della pubblicità nelle sidebar (come nei giochi di carte)
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        if (timerId) clearInterval(timerId); // evita che il salvataggio periodico ricrei la partita
        localStorage.removeItem('calcolo-save');
        location.reload();
    });

    // Opzione segnalazione errori (persistente)
    opzErrori = localStorage.getItem('calcolo-opt-errori') !== '0';
    const chkErrori = document.getElementById('chk-errori');
    chkErrori.checked = opzErrori;
    chkErrori.addEventListener('change', function () {
        opzErrori = this.checked;
        localStorage.setItem('calcolo-opt-errori', opzErrori ? '1' : '0');
        if (lettere.length) renderTutto();
    });

    // Opzione colonne sbarrate (persistente). Si può cambiare a partita in corso:
    // il ricalcolo rifà le esclusioni automatiche da zero, quindi accenderla le
    // aggiunge e spegnerla le toglie, senza toccare quelle segnate a mano.
    opzSbarraAssenti = localStorage.getItem('calcolo-opt-sbarra') === '1';
    const chkSbarra = document.getElementById('chk-sbarra-assenti');
    chkSbarra.checked = opzSbarraAssenti;
    chkSbarra.addEventListener('change', function () {
        opzSbarraAssenti = this.checked;
        localStorage.setItem('calcolo-opt-sbarra', opzSbarraAssenti ? '1' : '0');
        if (lettere.length) {
            ricalcolaEsclusioniAuto();
            renderTutto();
            salvaPartita();
        }
    });

    // Se esiste una partita salvata chiedi se riprenderla, altrimenti mostra il modale iniziale
    if (caricaPartita()) {
        costruisciGriglia();
        costruisciLegenda();
        // Riallinea le colonne all'opzione di adesso: la partita può essere stata
        // salvata con l'impostazione opposta, o addirittura prima che esistesse.
        ricalcolaEsclusioniAuto();
        renderTutto(); // mostra lo schema salvato dietro al modale
        apriModaleInizio(true);
    } else {
        renderInfo();
        apriModaleInizio(false);
    }
}
