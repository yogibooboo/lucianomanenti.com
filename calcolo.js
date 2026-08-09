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
    nuovoRecord: ' — NEW ALL-TIME BEST!',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    riepilogo: function (diff, tempo, errori, hints) {
        return CALC_LANG.diffNames[diff] + ' — ' + CALC_LANG.tempo + ': ' + tempo +
            ' — ' + CALC_LANG.errori + ': ' + errori + ' — ' + CALC_LANG.suggerimenti + ': ' + hints;
    }
} : {
    scegliLettera: 'Scegli una lettera e assegnale una cifra',
    partitaInCorso: 'Partita in corso — buona fortuna!',
    generazione: 'Generazione dello schema...',
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
    nuovoRecord: ' — NUOVO RECORD ASSOLUTO!',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    riepilogo: function (diff, tempo, errori, hints) {
        return CALC_LANG.diffNames[diff] + ' — ' + CALC_LANG.tempo + ': ' + tempo +
            ' — ' + CALC_LANG.errori + ': ' + errori + ' — ' + CALC_LANG.suggerimenti + ': ' + hints;
    }
};

// === CONFIGURAZIONE DIFFICOLTÀ (numero di lettere distinte in gioco) ===
// Più lettere = più cifre da dedurre = schema più impegnativo.
const CALC_LETTERE = { facile: [3, 4], medio: [5, 6], difficile: [7, 8] };

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

// Modo attivo dei radio button: cosa fa il click su un incrocio della matrice
let modoMatrice = 'escludi';
let difficolta = 'facile';
let erroriCount = 0;
let hintCount = 0;
let secondi = 0;
let ultimoMouseX = -1;
let ultimoMouseY = -1;
let timerId = null;
let cronologia = [];       // stack per undo: { lettera, cifraPrec }
let partitaFinita = false;

// Opzione di segnalazione errori (persistente in localStorage)
let opzErrori = true;      // evidenzia le cifre sbagliate rispetto alla soluzione

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
function generaMatrice(maxVal, opsR, opsC) {
    for (let t = 0; t < 4000; t++) {
        const A = 1 + rnd(maxVal), B = 1 + rnd(maxVal), D = 1 + rnd(maxVal), E = 1 + rnd(maxVal);
        const C = applica(A, opsR[0], B), F = applica(D, opsR[1], E);
        const G = applica(A, opsC[0], D), H = applica(B, opsC[1], E);
        if (C === null || F === null || G === null || H === null) continue;
        if (C <= 0 || F <= 0 || G <= 0 || H <= 0) continue;
        const I1 = applica(G, opsR[2], H), I2 = applica(C, opsC[2], F);
        if (I1 === null || I2 === null || I1 !== I2 || I1 <= 0) continue;
        const v = [A, B, C, D, E, F, G, H, I1];
        if (v.some(x => x > 999)) continue;
        return v;
    }
    return null;
}

// Scarta gli schemi che non insegnano nulla: troppe moltiplicazioni per 1,
// divisioni x:x, pochi operatori diversi o troppi valori ripetuti.
function schemaInteressante(v, opsR, opsC) {
    const [A, B, C, D, E, F] = v;
    const trii = [
        [v[0], opsR[0], v[1]], [v[3], opsR[1], v[4]], [v[6], opsR[2], v[7]],
        [v[0], opsC[0], v[3]], [v[1], opsC[1], v[4]], [v[2], opsC[2], v[5]]
    ];
    let banali = 0;
    for (const [x, op, y] of trii) {
        if ((op === 'x' || op === ':') && (x === 1 || y === 1)) banali++;
        if (op === ':' && x === y) banali++;
    }
    if (banali > 1) return false;
    if (new Set([...opsR, ...opsC]).size < 3) return false;
    if (new Set(v).size < 5) return false;
    if (!v.some(x => x >= 10)) return false;
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
function generaPuzzle(minLettere, maxLettere) {
    const scadenza = Date.now() + 6000; // tetto di sicurezza: non bloccare la pagina
    while (Date.now() < scadenza) {
        const opsR = [OPS[rnd(4)], OPS[rnd(4)], OPS[rnd(4)]];
        const opsC = [OPS[rnd(4)], OPS[rnd(4)], OPS[rnd(4)]];
        const v = generaMatrice(60, opsR, opsC);
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
            sec: secondi, diff: difficolta, err: erroriCount, hint: hintCount
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
        difficolta = s.diff || 'facile';
        erroriCount = s.err || 0;
        hintCount = s.hint || 0;
        return true;
    } catch (e) {
        return false;
    }
}

// === AVVIO NUOVA PARTITA ===
function nuovaPartita(diff) {
    difficolta = diff;
    localStorage.setItem('calcolo-difficolta', diff);
    setMessaggio(CALC_LANG.generazione);

    // setTimeout per lasciare aggiornare il messaggio prima del calcolo
    setTimeout(function () {
        const range = CALC_LETTERE[diff];
        let gen = generaPuzzle(range[0], range[1]);
        // Ripiego: se il livello richiesto non produce nulla entro il tetto di
        // tempo, allarga la forbice invece di lasciare la pagina senza schema
        if (!gen) gen = generaPuzzle(3, 8);
        if (!gen) { setMessaggio(CALC_LANG.generazione, 'rosso'); return; }

        celle = gen.celle;
        opsRighe = gen.opsR;
        opsColonne = gen.opsC;
        patterns = gen.patterns;
        lettere = gen.lettere;
        soluzioneMappa = gen.mappa;
        assegnazioni = {};
        esclusioni = {};
        lettere.forEach(function (l) { esclusioni[l] = new Array(10).fill(ESCL_NO); });

        letteraSelezionata = null;
        selezioneAutomatica = false;
        erroriCount = 0;
        hintCount = 0;
        secondi = 0;
        cronologia = [];
        partitaFinita = false;
        hintTarget = null;
        chiudiPannelloHint();

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

// Aggiorna i record con il tempo di vittoria; ritorna true se è nuovo record assoluto
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
    document.getElementById('record-diff').textContent = CALC_LANG.diffNames[difficolta];
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
                el.addEventListener('click', function () { clickCella(idx); });
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
            cont.appendChild(el);
        }
    }
}

function simboloOp(op) {
    if (op === 'x') return '×';
    if (op === ':') return '÷';
    if (op === '-') return '−';
    return op;
}

// Costruisce la matrice delle possibilità: una riga per lettera, una colonna
// per cifra (0-9), più l'intestazione delle cifre e la casella della lettera.
function costruisciLegenda() {
    const cont = document.getElementById('matrice-esclusioni');
    cont.innerHTML = '';
    cont.style.gridTemplateColumns = '44px repeat(10, 30px)';

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
            cel.addEventListener('click', function () { clickMatrice(l, d); });
            cont.appendChild(cel);
        }
    });
}

// Il click su un incrocio fa quello che dice il radio button attivo:
// escludere la combinazione, assegnarla, oppure ripulire la casella.
function clickMatrice(l, d) {
    if (partitaFinita) return;
    if (!esclusioni[l]) esclusioni[l] = new Array(10).fill(ESCL_NO);

    if (modoMatrice === 'assegna') {
        // Assegnare significa scrivere la cifra nella griglia: passa dal motore
        // normale, che conta gli errori e propaga le esclusioni di riflesso
        if (assegnazioni[l] === d) return;
        letteraSelezionata = l;
        selezioneAutomatica = false;
        esclusioni[l][d] = ESCL_NO;
        assegnaCifra(d);
        return;
    }

    if (modoMatrice === 'cancella') {
        if (assegnazioni[l] === d) {
            // togliere l'assegnazione ripulisce anche le esclusioni che aveva generato
            letteraSelezionata = l;
            selezioneAutomatica = false;
            cancellaCifra();
            return;
        }
        if (esclusioni[l][d] === ESCL_NO) return;
        esclusioni[l][d] = ESCL_NO;
        renderTutto();
        salvaPartita();
        return;
    }

    // modo "escludi": è un interruttore sulla sola annotazione a mano.
    // Le esclusioni automatiche non si tolgono da qui: dipendono dall'assegnazione.
    if (assegnazioni[l] === d) return;
    if (esclusioni[l][d] === ESCL_AUTO) return;
    esclusioni[l][d] = esclusioni[l][d] === ESCL_MANO ? ESCL_NO : ESCL_MANO;
    renderTutto();
    salvaPartita();
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
            html += '<span class="' + cls + '">' + (c === undefined ? l : c) + '</span>';
        });
        cella.innerHTML = html;
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
            cel.textContent = assegnata ? '●' :
                (stato === ESCL_MANO ? '×' : (stato === ESCL_AUTO ? '·' : ''));
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
    ['escludi', 'assegna', 'cancella'].forEach(function (m) {
        const el = document.getElementById('modo-' + m);
        if (el) el.classList.toggle('attivo', modoMatrice === m);
    });
    const mat = document.getElementById('matrice-esclusioni');
    if (mat) mat.className = 'modo-' + modoMatrice;
}

function renderInfo() {
    document.getElementById('info-errori').textContent = erroriCount;
    document.getElementById('info-difficolta').textContent = CALC_LANG.diffNames[difficolta];
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

// Click su una cella della griglia: seleziona la prima lettera non ancora
// assegnata che vi compare (o l'ultima, se sono tutte assegnate)
function clickCella(i) {
    if (partitaFinita) return;
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

    // Passa in automatico alla prossima lettera ancora senza cifra
    const prossima = lettere.find(x => assegnazioni[x] === undefined);
    letteraSelezionata = prossima !== undefined ? prossima : null;
    selezioneAutomatica = (letteraSelezionata !== null);

    renderTutto();
    salvaPartita();
    controllaVittoria();
}

// Toglie la cifra alla lettera selezionata
function cancellaCifra() {
    if (partitaFinita || letteraSelezionata === null) return;
    if (assegnazioni[letteraSelezionata] === undefined) return;
    salvaSnapshot(letteraSelezionata);
    delete assegnazioni[letteraSelezionata];
    // le esclusioni che quell'assegnazione aveva propagato non valgono più
    ricalcolaEsclusioniAuto();
    renderTutto();
    salvaPartita();
}

// === UNDO ===
// Si salva anche l'intera matrice delle esclusioni: un'assegnazione ne propaga
// diverse, e l'undo deve riportare le annotazioni esattamente com'erano.
function salvaSnapshot(l) {
    const esclPrec = {};
    lettere.forEach(function (x) {
        esclPrec[x] = (esclusioni[x] || new Array(10).fill(ESCL_NO)).slice();
    });
    cronologia.push({ lettera: l, cifraPrec: assegnazioni[l], esclPrec: esclPrec });
    if (cronologia.length > 200) cronologia.shift();
}

function annullaMossa() {
    if (partitaFinita || cronologia.length === 0) return;
    const s = cronologia.pop();
    if (s.cifraPrec === undefined) delete assegnazioni[s.lettera];
    else assegnazioni[s.lettera] = s.cifraPrec;
    if (s.esclPrec) esclusioni = s.esclPrec;
    letteraSelezionata = s.lettera;
    selezioneAutomatica = true;
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
        letteraSelezionata = l;
        selezioneAutomatica = true;
        renderTutto();
        salvaPartita();
        return;
    }

    // Assegna la cifra corretta senza contarla come errore
    salvaSnapshot(l);
    assegnazioni[l] = soluzioneMappa[l];
    if (esclusioni[l]) esclusioni[l][soluzioneMappa[l]] = ESCL_NO;
    propagaEsclusioni(l, soluzioneMappa[l]);
    const prossima = lettere.find(x => assegnazioni[x] === undefined);
    letteraSelezionata = prossima !== undefined ? prossima : null;
    selezioneAutomatica = (letteraSelezionata !== null);
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
    if (timerId) clearInterval(timerId);
    localStorage.removeItem('calcolo-save');
    riproduciAudio('sounds/scala40/tada.mp3');

    const nuovoRecordAssoluto = aggiornaRecords(secondi);
    document.getElementById('vittoria-messaggio').innerHTML = CALC_LANG.vittoria;
    document.getElementById('vittoria-dettagli').textContent =
        CALC_LANG.riepilogo(difficolta, formattaTempo(secondi), erroriCount, hintCount) +
        (nuovoRecordAssoluto ? CALC_LANG.nuovoRecord : '');

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
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('calcolo-difficolta') || 'facile');
}

function riprendiPartita() {
    chiudiModali();
    avviaTimer();
    setMessaggio(CALC_LANG.partitaInCorso);
}

let tempDifficolta = 'facile';
function selezionaDifficolta(diff) {
    tempDifficolta = diff;
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', d === diff);
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

// Traccia il cursore per posizionare lo sprite "+Ns" delle penalità
document.addEventListener('mousemove', function (e) {
    ultimoMouseX = e.clientX;
    ultimoMouseY = e.clientY;
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

    // Radio button del modo: decidono cosa fa il click su un incrocio
    document.querySelectorAll('input[name="modo-matrice"]').forEach(function (r) {
        r.addEventListener('change', function () {
            if (this.checked) { modoMatrice = this.value; renderModo(); }
        });
    });
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

    // Se esiste una partita salvata chiedi se riprenderla, altrimenti mostra il modale iniziale
    if (caricaPartita()) {
        costruisciGriglia();
        costruisciLegenda();
        renderTutto(); // mostra lo schema salvato dietro al modale
        apriModaleInizio(true);
    } else {
        renderInfo();
        apriModaleInizio(false);
    }
}
