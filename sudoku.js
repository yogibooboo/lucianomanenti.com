/* ============================================================================
   SUDOKU - Logica di Gioco (JavaScript)
   Generatore con soluzione unica, note a matita, undo, suggerimenti.
   Stile e struttura coerenti con gli altri giochi del sito (Scopa, Burraco).
   ============================================================================ */

// Articolo determinativo per il numero, nelle spiegazioni in italiano ("l'8" vs "il 6")
function art(val) { return (val === 1 || val === 8) ? 'l\'' : 'il '; }

// === TESTI MULTILINGUA ===
const SUDOKU_LANG = (window.currentLang === 'en') ? {
    scegliCasella: 'Select a cell and enter a number',
    matitaOn: 'Pencil mode ON — enter notes',
    matitaOff: 'Pencil mode OFF',
    partitaInCorso: 'Game in progress — good luck!',
    generazione: 'Generating puzzle...',
    schemaErrori: 'The grid is complete but contains mistakes',
    hintErrore: 'The highlighted cell contains a <b>mistake</b>.',
    hintDeduzione: 'The highlighted cell can be <b>deduced</b> from the visible numbers.',
    hintRivela: 'No simple deduction exists: the highlighted cell is the one with the fewest candidates.',
    btnApplica: 'FILL IT IN',
    btnCancellaErrore: 'ERASE THE MISTAKE',
    btnRivela: 'REVEAL THE NUMBER',
    spiegaNudo: function (val) { return 'This cell can only contain ' + val + ': it\'s the only candidate left, given the numbers already placed in its row, column and box.'; },
    spiegaNascostoRiga: function (val) { return 'In this row, ' + val + ' can only go in this cell: every other empty cell in the row already rules it out.'; },
    spiegaNascostoCol: function (val) { return 'In this column, ' + val + ' can only go in this cell: every other empty cell in the column already rules it out.'; },
    spiegaNascostoBox: function (val) { return 'In this 3×3 box, ' + val + ' can only go in this cell: every other empty cell in the box already rules it out.'; },
    vittoria: 'CONGRATULATIONS!<br>Puzzle solved!',
    tempo: 'Time',
    errori: 'Mistakes',
    suggerimenti: 'Hints',
    resetChiedi: 'OK?',
    nuovoRecord: ' — NEW ALL-TIME BEST!',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    riepilogo: function (diff, tempo, errori, hints) {
        return SUDOKU_LANG.diffNames[diff] + ' — ' + SUDOKU_LANG.tempo + ': ' + tempo +
            ' — ' + SUDOKU_LANG.errori + ': ' + errori + ' — ' + SUDOKU_LANG.suggerimenti + ': ' + hints;
    }
} : {
    scegliCasella: 'Seleziona una casella e inserisci un numero',
    matitaOn: 'Modalità matita ATTIVA — inserisci note',
    matitaOff: 'Modalità matita disattivata',
    partitaInCorso: 'Partita in corso — buona fortuna!',
    generazione: 'Generazione dello schema...',
    schemaErrori: 'Lo schema è completo ma contiene errori',
    hintErrore: 'La casella evidenziata contiene un <b>errore</b>.',
    hintDeduzione: 'La casella evidenziata è <b>deducibile</b> dai numeri visibili.',
    hintRivela: 'Non esiste una deduzione semplice: la casella evidenziata è quella con meno candidati.',
    btnApplica: 'INSERISCI IL NUMERO',
    btnCancellaErrore: 'CANCELLA L\'ERRORE',
    btnRivela: 'RIVELA IL NUMERO',
    spiegaNudo: function (val) { return 'In questa casella può andare solo ' + art(val) + val + ': è l\'unico candidato rimasto, dati i numeri già presenti su riga, colonna e riquadro.'; },
    spiegaNascostoRiga: function (val) { return 'In questa riga ' + art(val) + val + ' può andare solo qui: tutte le altre caselle vuote della riga lo escludono già.'; },
    spiegaNascostoCol: function (val) { return 'In questa colonna ' + art(val) + val + ' può andare solo qui: tutte le altre caselle vuote della colonna lo escludono già.'; },
    spiegaNascostoBox: function (val) { return 'In questo riquadro 3×3 ' + art(val) + val + ' può andare solo qui: tutte le altre caselle vuote del riquadro lo escludono già.'; },
    vittoria: 'COMPLIMENTI!<br>Schema completato!',
    tempo: 'Tempo',
    errori: 'Errori',
    suggerimenti: 'Suggerimenti',
    resetChiedi: 'OK?',
    nuovoRecord: ' — NUOVO RECORD ASSOLUTO!',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    riepilogo: function (diff, tempo, errori, hints) {
        return SUDOKU_LANG.diffNames[diff] + ' — ' + SUDOKU_LANG.tempo + ': ' + tempo +
            ' — ' + SUDOKU_LANG.errori + ': ' + errori + ' — ' + SUDOKU_LANG.suggerimenti + ': ' + hints;
    }
};

// === CONFIGURAZIONE DIFFICOLTÀ (numero di caselle iniziali rivelate) ===
const SUDOKU_CLUES = { facile: 40, medio: 32, difficile: 26 };

// === STATO GLOBALE ===
let soluzione = [];        // 81 valori 1-9: la soluzione completa
let iniziale = [];         // 81 valori: schema di partenza (0 = vuota)
let griglia = [];          // 81 valori: stato corrente (0 = vuota)
let note = [];             // 81 array di booleani [10] per le note a matita
let selezionata = -1;      // indice cella selezionata (0-80), -1 = nessuna
let numeroArmato = 0;      // numero "in mano" (1-9), 0 = nessuno; si piazza cliccando una cella vuota
let ultimoPiazzamentoArmato = -1; // indice dell'ultima cella riempita in modalità armata, ricliccabile per svuotarla
let cellaArmante = -1;     // indice della cella piena cliccata per armare il numero corrente, -1 se armato da numpad/tastiera; è il bersaglio di Cancella in modalità armata
let matitaAttiva = false;
let difficolta = 'facile';
let erroriCount = 0;
let hintCount = 0;
let secondi = 0;
let timerId = null;
let cronologia = [];       // stack per undo: { idx, valPrec, notePrec, noteAltrui }
let partitaFinita = false;

// Opzioni di segnalazione errori (persistenti in localStorage)
let opzConflitti = true;      // evidenzia gli errori evidenti (conflitti con i numeri visibili)
let opzTuttiErrori = false;   // evidenzia tutti gli errori (confronto con la soluzione)

// Record dei tempi migliori per difficoltà (persistenti in localStorage)
let records = {};             // { facile: { daily:{key,sec}, weekly:{key,sec}, all:{sec,date} }, ... }

// Bersaglio corrente del Suggerimento a due fasi: { tipo: 'errore'|'deduzione'|'rivela', idx }
let hintTarget = null;

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === UTILITÀ ===
function riga(i) { return Math.floor(i / 9); }
function colonna(i) { return i % 9; }
function blocco(i) { return Math.floor(riga(i) / 3) * 3 + Math.floor(colonna(i) / 3); }

// Indici della stessa riga/colonna/blocco di i (esclusa i)
function celleCollegate(i) {
    const r = riga(i), c = colonna(i);
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    const set = new Set();
    for (let k = 0; k < 9; k++) {
        set.add(r * 9 + k);
        set.add(k * 9 + c);
        set.add((br + Math.floor(k / 3)) * 9 + (bc + k % 3));
    }
    set.delete(i);
    return Array.from(set);
}

function mescola(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// === GENERATORE ===
// Riempie una griglia vuota con backtracking randomizzato → soluzione completa
function generaSoluzione() {
    const board = new Array(81).fill(0);

    function valido(idx, val) {
        const collegate = celleCollegate(idx);
        for (let k = 0; k < collegate.length; k++) {
            if (board[collegate[k]] === val) return false;
        }
        return true;
    }

    function riempi(idx) {
        if (idx === 81) return true;
        const numeri = mescola([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let n = 0; n < 9; n++) {
            if (valido(idx, numeri[n])) {
                board[idx] = numeri[n];
                if (riempi(idx + 1)) return true;
                board[idx] = 0;
            }
        }
        return false;
    }

    riempi(0);
    return board;
}

// Conta le soluzioni di uno schema (si ferma a "limite" per efficienza)
function contaSoluzioni(board, limite) {
    let count = 0;

    function solve() {
        if (count >= limite) return;
        // Trova la cella vuota con meno candidati (euristica MRV)
        let migliore = -1, candidatiMigliori = null;
        for (let i = 0; i < 81; i++) {
            if (board[i] !== 0) continue;
            const usati = new Set();
            const collegate = celleCollegate(i);
            for (let k = 0; k < collegate.length; k++) {
                if (board[collegate[k]] !== 0) usati.add(board[collegate[k]]);
            }
            const candidati = [];
            for (let v = 1; v <= 9; v++) if (!usati.has(v)) candidati.push(v);
            if (candidati.length === 0) return; // vicolo cieco
            if (candidatiMigliori === null || candidati.length < candidatiMigliori.length) {
                migliore = i;
                candidatiMigliori = candidati;
                if (candidati.length === 1) break;
            }
        }
        if (migliore === -1) { count++; return; } // completa
        for (let k = 0; k < candidatiMigliori.length; k++) {
            board[migliore] = candidatiMigliori[k];
            solve();
            if (count >= limite) { board[migliore] = 0; return; }
        }
        board[migliore] = 0;
    }

    solve();
    return count;
}

// Rimuove caselle dalla soluzione mantenendo l'unicità della soluzione
// Verifica che lo schema sia interamente risolvibile con le sole deduzioni
// semplici usate dal Suggerimento (singoli nudi/nascosti e coppie nude)
function risolvibileLogicamente(puzzle) {
    const b = puzzle.slice();
    for (;;) {
        const cand = calcolaCandidati(b);
        let ded = cercaSingoli(cand);
        if (!ded) {
            for (let iter = 0; iter < 5 && !ded; iter++) {
                if (!applicaCoppie(cand)) break;
                ded = cercaSingoli(cand);
            }
        }
        if (!ded) return b.every(v => v !== 0);
        b[ded.idx] = ded.val;
    }
}

// Verifica se lo schema si conclude con i soli singoli nascosti (unico posto
// per un numero in una riga/colonna/riquadro): è esattamente la deduzione che
// l'evidenziazione del numero armato mostra a colpo d'occhio, quindi questi
// schemi si risolvono meccanicamente armando i numeri a rotazione
function risolvibileConSoliNascosti(puzzle) {
    const b = puzzle.slice();
    for (;;) {
        const cand = calcolaCandidati(b);
        const unita = listaUnita();
        let ded = null;
        for (let u = 0; u < unita.length && !ded; u++) {
            for (let v = 1; v <= 9 && !ded; v++) {
                const posti = unita[u].filter(i => cand[i] && cand[i].indexOf(v) !== -1);
                if (posti.length === 1) ded = { idx: posti[0], val: v };
            }
        }
        if (!ded) return b.every(x => x !== 0);
        b[ded.idx] = ded.val;
    }
}

function generaPuzzle(clues, soloLogico) {
    const sol = generaSoluzione();
    const puzzle = sol.slice();
    const ordine = mescola(Array.from({ length: 81 }, (_, i) => i));
    let rimaste = 81;

    for (let k = 0; k < ordine.length && rimaste > clues; k++) {
        const idx = ordine[k];
        const backup = puzzle[idx];
        puzzle[idx] = 0;
        // La rimozione è valida solo se lo schema resta a soluzione unica e,
        // per i livelli "soloLogico", risolvibile con sole deduzioni semplici
        if (contaSoluzioni(puzzle.slice(), 2) !== 1 ||
            (soloLogico && !risolvibileLogicamente(puzzle))) {
            puzzle[idx] = backup;
        } else {
            rimaste--;
        }
    }
    return { soluzione: sol, puzzle: puzzle };
}

// === PERSISTENZA (riprendi la partita dopo un reload) ===
function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('sudoku-save');
        return;
    }
    try {
        localStorage.setItem('sudoku-save', JSON.stringify({
            sol: soluzione, ini: iniziale, gri: griglia,
            note: note.map(n => n.join('')),
            sec: secondi, diff: difficolta, err: erroriCount, hint: hintCount
        }));
    } catch (e) { /* storage pieno o disabilitato: si continua senza salvataggio */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('sudoku-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.sol || s.sol.length !== 81 || !s.gri || s.gri.length !== 81) return false;
        soluzione = s.sol;
        iniziale = s.ini;
        griglia = s.gri;
        note = s.note.map(str => str.split('').map(ch => ch === '1'));
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
    localStorage.setItem('sudoku-difficolta', diff);
    setMessaggio(SUDOKU_LANG.generazione);

    // setTimeout per lasciare aggiornare il messaggio prima del calcolo
    setTimeout(function () {
        // Facile e Medio: schemi sempre concludibili con sole deduzioni semplici.
        // Medio in più non deve essere risolvibile con i soli singoli nascosti,
        // altrimenti si conclude meccanicamente armando i numeri a rotazione:
        // se lo è, lo si rigenera (con un tetto di tentativi, ~85% di scarti)
        let gen = generaPuzzle(SUDOKU_CLUES[diff], diff !== 'difficile');
        if (diff === 'medio') {
            for (let t = 0; t < 30 && risolvibileConSoliNascosti(gen.puzzle); t++) {
                gen = generaPuzzle(SUDOKU_CLUES[diff], true);
            }
        }
        soluzione = gen.soluzione;
        iniziale = gen.puzzle.slice();
        griglia = gen.puzzle.slice();
        note = Array.from({ length: 81 }, () => new Array(10).fill(false));
        selezionata = -1;
        numeroArmato = 0;
        ultimoPiazzamentoArmato = -1;
        cellaArmante = -1;
        matitaAttiva = false;
        aggiornaSpriteCursore();
        erroriCount = 0;
        hintCount = 0;
        secondi = 0;
        cronologia = [];
        partitaFinita = false;
        hintTarget = null;
        chiudiPannelloHint();

        document.getElementById('btn-matita').classList.remove('attivo');
        chiudiModali();
        renderTutto();
        avviaTimer();
        salvaPartita();
        setMessaggio(SUDOKU_LANG.partitaInCorso);
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
        records = JSON.parse(localStorage.getItem('sudoku-records') || '{}') || {};
    } catch (e) {
        records = {};
    }
}

function salvaRecords() {
    try {
        localStorage.setItem('sudoku-records', JSON.stringify(records));
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
    document.getElementById('record-diff').textContent = SUDOKU_LANG.diffNames[difficolta];
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
        btn.textContent = SUDOKU_LANG.resetChiedi;
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

function aggiornaTimer() {
    document.getElementById('info-tempo').textContent = formattaTempo(secondi);
}

// === RENDERING ===
function costruisciGriglia() {
    const cont = document.getElementById('griglia-sudoku');
    cont.innerHTML = '';
    for (let i = 0; i < 81; i++) {
        const cella = document.createElement('div');
        cella.className = 'cella-sudoku';
        cella.id = 'cella-' + i;
        const c = colonna(i), r = riga(i);
        if (c === 2 || c === 5) cella.classList.add('blocco-dx');
        if (r === 2 || r === 5) cella.classList.add('blocco-giu');
        if (c === 8) cella.classList.add('ultima-col');
        if (r === 8) cella.classList.add('ultima-riga');
        cella.addEventListener('click', (function (idx) {
            return function () { selezionaCella(idx); };
        })(i));
        cont.appendChild(cella);
    }
}

// Vero se il valore della cella è in conflitto con un numero visibile
// nella stessa riga, colonna o riquadro (errore "evidente")
function conflittoVisibile(i) {
    const v = griglia[i];
    const collegate = celleCollegate(i);
    for (let k = 0; k < collegate.length; k++) {
        if (griglia[collegate[k]] === v) return true;
    }
    return false;
}

// Stabilisce se la cella va segnalata come errata in base alle opzioni attive
function cellaErrata(i) {
    if (griglia[i] === 0 || iniziale[i] !== 0) return false;
    if (opzTuttiErrori && griglia[i] !== soluzione[i]) return true;
    if (opzConflitti && conflittoVisibile(i)) return true;
    return false;
}

function renderCella(i) {
    const cella = document.getElementById('cella-' + i);
    cella.classList.toggle('data', iniziale[i] !== 0);
    cella.classList.toggle('errata', cellaErrata(i));

    if (griglia[i] !== 0) {
        cella.textContent = griglia[i];
    } else if (note[i].some(Boolean)) {
        let html = '<div class="note-grid">';
        for (let v = 1; v <= 9; v++) {
            html += '<span>' + (note[i][v] ? v : '') + '</span>';
        }
        html += '</div>';
        cella.innerHTML = html;
    } else {
        cella.textContent = '';
    }
}

function renderEvidenziazioni() {
    const valSel = (selezionata >= 0) ? griglia[selezionata] : numeroArmato;
    let collegate = new Set();
    if (selezionata >= 0) {
        collegate = new Set(celleCollegate(selezionata));
    } else if (numeroArmato !== 0) {
        for (let i = 0; i < 81; i++) {
            if (griglia[i] === numeroArmato) celleCollegate(i).forEach(function (j) { collegate.add(j); });
        }
    }
    for (let i = 0; i < 81; i++) {
        const cella = document.getElementById('cella-' + i);
        cella.classList.toggle('selezionata', i === selezionata);
        cella.classList.toggle('cella-armante', selezionata < 0 && i === cellaArmante);
        cella.classList.toggle('armata', selezionata < 0 && numeroArmato !== 0 && griglia[i] === numeroArmato);
        cella.classList.toggle('evidenziata', collegate.has(i));
        cella.classList.toggle('stesso-numero',
            valSel !== 0 && i !== selezionata && griglia[i] === valSel);
        // In modalità armata, le celle piene con un altro numero e non toccate
        // da nessuna riga/colonna/box del numero armato risaltano meno: grigie
        cella.classList.toggle('non-collegata-armata',
            selezionata < 0 && numeroArmato !== 0 && griglia[i] !== 0 &&
            griglia[i] !== numeroArmato && !collegate.has(i));
        cella.classList.toggle('suggerita',
            !!(hintTarget && hintTarget.idx === i && hintTarget.tipo !== 'errore'));
        cella.classList.toggle('suggerita-errore',
            !!(hintTarget && hintTarget.idx === i && hintTarget.tipo === 'errore'));
    }
    for (let v = 1; v <= 9; v++) {
        document.getElementById('btn-num-' + v).classList.toggle('armato', v === numeroArmato);
    }
}

function renderNumpad() {
    const conteggi = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) {
        if (griglia[i] !== 0) conteggi[griglia[i]]++;
    }
    for (let v = 1; v <= 9; v++) {
        const btn = document.getElementById('btn-num-' + v);
        const restanti = 9 - conteggi[v];
        btn.classList.toggle('esaurito', restanti <= 0);
        btn.querySelector('.num-count').textContent = restanti > 0 ? restanti : '';
    }
}

function renderInfo() {
    document.getElementById('info-errori').textContent = erroriCount;
    document.getElementById('info-difficolta').textContent = SUDOKU_LANG.diffNames[difficolta];
    aggiornaTimer();
    renderRecord();
}

function renderTutto() {
    for (let i = 0; i < 81; i++) renderCella(i);
    renderEvidenziazioni();
    renderNumpad();
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
function selezionaCella(i) {
    if (partitaFinita) return;

    // Cella vuota con una cella selezionata in corso: selezione normale (navigazione manuale)
    if (griglia[i] === 0 && selezionata >= 0) {
        selezionata = (selezionata === i) ? -1 : i;
        renderEvidenziazioni();
        return;
    }

    // Cella vuota con un numero armato (numpad o cella piena) e nessuna selezione: piazza subito
    if (griglia[i] === 0 && numeroArmato !== 0) {
        selezionata = i;
        inserisciNumero(numeroArmato);
        selezionata = -1;
        ultimoPiazzamentoArmato = i;
        renderEvidenziazioni();
        return;
    }

    // Ricliccando proprio l'ultima cella piazzata in modalità armata, se il numero
    // è segnalato come errato, la si svuota invece di armarne il numero: un "annulla"
    // mirato al piazzamento sbagliato appena fatto. Se invece è corretto, si arma
    // normalmente: cancellare un numero giusto per un semplice reclick sarebbe ambiguo
    if (griglia[i] !== 0 && i === ultimoPiazzamentoArmato && cellaErrata(i)) {
        selezionata = i;
        cancellaCella();
        selezionata = -1;
        renderEvidenziazioni();
        return;
    }

    // Cella piena: arma/disarma sempre il suo numero, mai una scrittura,
    // anche se un'altra cella era selezionata; la matita si disattiva di conseguenza
    if (griglia[i] !== 0) {
        const disarmo = (numeroArmato === griglia[i]);
        numeroArmato = disarmo ? 0 : griglia[i];
        selezionata = -1;
        ultimoPiazzamentoArmato = -1;
        cellaArmante = disarmo ? -1 : i;
        matitaAttiva = false;
        document.getElementById('btn-matita').classList.remove('attivo');
        renderEvidenziazioni();
        aggiornaSpriteCursore();
        return;
    }

    // Cella vuota, nessun numero armato: selezione normale
    selezionata = (selezionata === i) ? -1 : i;
    renderEvidenziazioni();
}

// Click su un numero del numpad (o tasto numerico): se c'è una cella vuota
// selezionata inserisce subito, altrimenti arma/disarma il numero per il piazzamento
// successivo su una cella vuota (o, con la matita attiva, per aggiungere/togliere la nota)
function clickNumero(val) {
    if (partitaFinita) return;
    if (selezionata >= 0 && griglia[selezionata] === 0) {
        inserisciNumero(val);
        return;
    }
    numeroArmato = (numeroArmato === val) ? 0 : val;
    selezionata = -1;
    ultimoPiazzamentoArmato = -1;
    cellaArmante = -1; // armato da numpad/tastiera: nessuna cella di riferimento per Cancella
    renderEvidenziazioni();
    aggiornaSpriteCursore();
}

function inserisciNumero(val) {
    if (partitaFinita || selezionata < 0) return;
    const i = selezionata;
    if (iniziale[i] !== 0) return; // le caselle di partenza non si toccano

    annullaSuggerimento(); // ogni mossa manuale invalida il suggerimento in corso

    if (matitaAttiva) {
        if (griglia[i] !== 0) return;
        salvaSnapshot(i, []);
        note[i][val] = !note[i][val];
        renderCella(i);
        salvaPartita();
        return;
    }

    if (griglia[i] === val) return; // nessun cambiamento

    if (i === ultimoPiazzamentoArmato) ultimoPiazzamentoArmato = -1;

    // Verifica in anticipo se il numero verrà segnalato come errato
    const valPrec = griglia[i];
    griglia[i] = val;
    const segnalato = cellaErrata(i);
    griglia[i] = valPrec;

    // Ripulisce le note del valore nelle celle collegate (con snapshot per undo),
    // ma non se il numero è segnalato come sbagliato: la pulizia partirebbe da
    // una premessa errata e distruggerebbe note ancora valide
    const noteRipulite = [];
    if (!segnalato) {
        const collegate = celleCollegate(i);
        for (let k = 0; k < collegate.length; k++) {
            const j = collegate[k];
            if (griglia[j] === 0 && note[j][val]) {
                noteRipulite.push(j);
            }
        }
    }
    salvaSnapshot(i, noteRipulite);

    griglia[i] = val;
    note[i] = new Array(10).fill(false);
    noteRipulite.forEach(function (j) { note[j][val] = false; });

    // L'errore viene conteggiato solo se una delle opzioni attive lo rende visibile
    if (segnalato) {
        erroriCount++;
        riproduciAudio('sounds/scala40/knock.mp3');
    } else {
        riproduciAudio('sounds/scala40/cardplace1.mp3');
    }

    // Un inserimento può cambiare i conflitti anche nelle altre celle: ridisegna tutto
    renderTutto();

    if (!segnalato) {
        const cella = document.getElementById('cella-' + i);
        cella.classList.add('lampeggia');
        setTimeout(function () {
            const c = document.getElementById('cella-' + i);
            if (c) c.classList.remove('lampeggia');
        }, 500);
    }

    salvaPartita();
    controllaVittoria();
}

function cancellaCella() {
    if (partitaFinita) return;
    // In modalità armata non c'è una cella "selezionata": il bersaglio di Cancella
    // diventa la cella piena che ha armato il numero corrente (evidenziata in giallo)
    const i = (selezionata >= 0) ? selezionata : cellaArmante;
    if (i < 0) return;
    if (iniziale[i] !== 0) return; // solo i numeri di partenza sono intoccabili
    if (griglia[i] === 0 && !note[i].some(Boolean)) return;

    if (i === ultimoPiazzamentoArmato) ultimoPiazzamentoArmato = -1;
    if (i === cellaArmante) { cellaArmante = -1; numeroArmato = 0; }

    annullaSuggerimento();
    salvaSnapshot(i, []);
    griglia[i] = 0;
    note[i] = new Array(10).fill(false);
    // La rimozione può risolvere conflitti in altre celle: ridisegna tutto
    renderTutto();
    salvaPartita();
}

// === UNDO ===
function salvaSnapshot(i, noteAltruiIdx) {
    cronologia.push({
        idx: i,
        valPrec: griglia[i],
        notePrec: note[i].slice(),
        noteAltrui: noteAltruiIdx.map(function (j) { return { j: j, note: note[j].slice() }; })
    });
    if (cronologia.length > 200) cronologia.shift();
}

function annullaMossa() {
    if (partitaFinita || cronologia.length === 0) return;
    annullaSuggerimento();
    const m = cronologia.pop();
    if (m.idx === ultimoPiazzamentoArmato) ultimoPiazzamentoArmato = -1;
    griglia[m.idx] = m.valPrec;
    note[m.idx] = m.notePrec;
    m.noteAltrui.forEach(function (o) {
        note[o.j] = o.note;
    });
    renderTutto();
    salvaPartita();
    riproduciAudio('sounds/scala40/cardslide1.mp3');
}

// === SUGGERIMENTO (didattico, a due fasi) ===
// Calcola i candidati di ogni cella vuota in base ai soli numeri visibili
function calcolaCandidati(board) {
    const b = board || griglia;
    const cand = new Array(81).fill(null);
    for (let i = 0; i < 81; i++) {
        if (b[i] !== 0) continue;
        const usati = new Set();
        const collegate = celleCollegate(i);
        for (let k = 0; k < collegate.length; k++) {
            if (b[collegate[k]] !== 0) usati.add(b[collegate[k]]);
        }
        const c = [];
        for (let v = 1; v <= 9; v++) if (!usati.has(v)) c.push(v);
        cand[i] = c;
    }
    return cand;
}

// Le 27 unità del sudoku (9 righe, 9 colonne, 9 riquadri) come liste di indici
function listaUnita() {
    const unita = [];
    for (let r = 0; r < 9; r++) unita.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
    for (let c = 0; c < 9; c++) unita.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const u = [];
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push((br * 3 + r) * 9 + (bc * 3 + c));
            unita.push(u);
        }
    }
    return unita;
}

// Cerca un singolo scoperto (1 solo candidato) o nascosto (unico posto per un numero)
// Ritorna anche il tipo di deduzione, per poter spiegare il "perché" nel suggerimento
function cercaSingoli(cand) {
    for (let i = 0; i < 81; i++) {
        if (cand[i] && cand[i].length === 1) return { idx: i, val: cand[i][0], tipo: 'nudo' };
    }
    const unita = listaUnita();
    for (let u = 0; u < unita.length; u++) {
        // Le prime 9 unità della lista sono le righe, le successive 9 le colonne, le ultime 9 i riquadri
        const tipoUnita = u < 9 ? 'riga' : (u < 18 ? 'colonna' : 'riquadro');
        for (let v = 1; v <= 9; v++) {
            const posti = unita[u].filter(i => cand[i] && cand[i].indexOf(v) !== -1);
            if (posti.length === 1) return { idx: posti[0], val: v, tipo: 'nascosto', unita: tipoUnita };
        }
    }
    return null;
}

// Elimina i candidati bloccati dalle coppie nude; ritorna true se ha cambiato qualcosa
function applicaCoppie(cand) {
    let cambiato = false;
    const unita = listaUnita();
    for (let u = 0; u < unita.length; u++) {
        const vuote = unita[u].filter(i => cand[i]);
        for (let a = 0; a < vuote.length; a++) {
            if (cand[vuote[a]].length !== 2) continue;
            for (let b = a + 1; b < vuote.length; b++) {
                if (cand[vuote[b]].length !== 2) continue;
                if (cand[vuote[a]][0] !== cand[vuote[b]][0] || cand[vuote[a]][1] !== cand[vuote[b]][1]) continue;
                const v1 = cand[vuote[a]][0], v2 = cand[vuote[a]][1];
                for (let k = 0; k < vuote.length; k++) {
                    const j = vuote[k];
                    if (j === vuote[a] || j === vuote[b]) continue;
                    const prima = cand[j].length;
                    cand[j] = cand[j].filter(v => v !== v1 && v !== v2);
                    if (cand[j].length !== prima) cambiato = true;
                }
            }
        }
    }
    return cambiato;
}

// Trova una cella deducibile logicamente dai numeri visibili (singoli, poi coppie)
function trovaDeduzione() {
    const cand = calcolaCandidati();
    let ded = cercaSingoli(cand);
    if (ded) return ded;
    for (let iter = 0; iter < 5; iter++) {
        if (!applicaCoppie(cand)) break;
        ded = cercaSingoli(cand);
        if (ded) return ded;
    }
    return null;
}

// Genera il testo che spiega perché la cella dedotta deve contenere quel valore
function spiegaDeduzione(ded) {
    if (ded.tipo === 'nudo') return SUDOKU_LANG.spiegaNudo(ded.val);
    if (ded.unita === 'riga') return SUDOKU_LANG.spiegaNascostoRiga(ded.val);
    if (ded.unita === 'colonna') return SUDOKU_LANG.spiegaNascostoCol(ded.val);
    return SUDOKU_LANG.spiegaNascostoBox(ded.val);
}

function annullaSuggerimento() {
    if (!hintTarget) return;
    const cella = document.getElementById('cella-' + hintTarget.idx);
    if (cella) cella.classList.remove('suggerita', 'suggerita-errore');
    hintTarget = null;
    chiudiPannelloHint();
    setMessaggio(SUDOKU_LANG.partitaInCorso);
}

// Pannello verticale che copre la colonna dei tasti: testo + Spiegazione/Applica/Chiudi
function apriPannelloHint() {
    const testo = document.getElementById('hint-testo');
    const btnSpiega = document.getElementById('btn-hint-spiega');
    const btnApplica = document.getElementById('btn-hint-applica');
    if (hintTarget.tipo === 'errore') {
        testo.innerHTML = SUDOKU_LANG.hintErrore;
        btnSpiega.style.display = 'none';
        btnApplica.textContent = SUDOKU_LANG.btnCancellaErrore;
    } else if (hintTarget.tipo === 'deduzione') {
        testo.innerHTML = SUDOKU_LANG.hintDeduzione;
        btnSpiega.style.display = '';
        btnApplica.textContent = SUDOKU_LANG.btnApplica;
    } else { // rivela
        testo.innerHTML = SUDOKU_LANG.hintRivela;
        btnSpiega.style.display = 'none';
        btnApplica.textContent = SUDOKU_LANG.btnRivela;
    }
    document.getElementById('pannello-hint').classList.add('aperto');
}

function chiudiPannelloHint() {
    const pan = document.getElementById('pannello-hint');
    if (pan) pan.classList.remove('aperto');
}

// Pulsante "Spiegazione": mostra il ragionamento (e quindi il numero) nel pannello
function mostraSpiegazioneHint() {
    if (!hintTarget || hintTarget.tipo !== 'deduzione') return;
    riproduciAudio('sounds/scala40/tick.mp3');
    document.getElementById('hint-testo').innerHTML = spiegaDeduzione(hintTarget.ded);
    document.getElementById('btn-hint-spiega').style.display = 'none';
}

// Pulsante "Applica": riempie la casella dedotta/rivelata, o cancella l'errore
function applicaHint() {
    if (!hintTarget) return;
    if (hintTarget.tipo === 'errore') {
        // Cancella il numero errato (non conta come suggerimento)
        const idx = hintTarget.idx;
        salvaSnapshot(idx, []);
        griglia[idx] = 0;
        note[idx] = new Array(10).fill(false);
        hintTarget = null;
        chiudiPannelloHint();
        selezionata = idx;
        riproduciAudio('sounds/scala40/cardslide1.mp3');
        renderTutto();
        setMessaggio(SUDOKU_LANG.partitaInCorso);
        salvaPartita();
    } else if (hintTarget.tipo === 'deduzione') {
        riempiDaSuggerimento(hintTarget.idx, hintTarget.val);
    } else { // rivela
        riempiDaSuggerimento(hintTarget.idx, soluzione[hintTarget.idx]);
    }
}

function riempiDaSuggerimento(idx, val) {
    // Ripulisce le note del valore nelle celle collegate, come un inserimento normale
    const noteRipulite = [];
    const collegate = celleCollegate(idx);
    for (let k = 0; k < collegate.length; k++) {
        const j = collegate[k];
        if (griglia[j] === 0 && note[j][val]) noteRipulite.push(j);
    }
    salvaSnapshot(idx, noteRipulite);
    griglia[idx] = val;
    note[idx] = new Array(10).fill(false);
    noteRipulite.forEach(function (j) { note[j][val] = false; });
    hintCount++;
    hintTarget = null;
    chiudiPannelloHint();
    selezionata = idx;
    riproduciAudio('sounds/scala40/magic.mp3');
    renderTutto();
    setMessaggio(SUDOKU_LANG.partitaInCorso);
    salvaPartita();
    controllaVittoria();
}

function suggerimento() {
    if (partitaFinita) return;

    // Priorità 1: se ci sono errori (anche non segnalati), il suggerimento indica
    // il primo errore — una deduzione su premesse sbagliate sarebbe fuorviante
    let erroreIdx = -1;
    for (let k = 0; k < 81; k++) {
        if (iniziale[k] === 0 && griglia[k] !== 0 && griglia[k] !== soluzione[k]) { erroreIdx = k; break; }
    }
    if (erroreIdx !== -1) {
        hintTarget = { tipo: 'errore', idx: erroreIdx };
        selezionata = erroreIdx;
        riproduciAudio('sounds/scala40/tick.mp3');
        renderEvidenziazioni();
        apriPannelloHint();
        return;
    }

    // Priorità 2: cella deducibile con tecniche semplici
    const ded = trovaDeduzione();
    if (ded) {
        hintTarget = { tipo: 'deduzione', idx: ded.idx, val: ded.val, ded: ded };
        selezionata = ded.idx;
        riproduciAudio('sounds/scala40/tick.mp3');
        renderEvidenziazioni();
        apriPannelloHint();
        return;
    }

    // Ultima spiaggia: nessuna deduzione semplice — rivela la cella con meno candidati
    const cand = calcolaCandidati();
    let idx = -1;
    for (let k = 0; k < 81; k++) {
        if (cand[k] && (idx === -1 || cand[k].length < cand[idx].length)) idx = k;
    }
    if (idx === -1) return; // griglia piena
    hintTarget = { tipo: 'rivela', idx: idx };
    selezionata = idx;
    riproduciAudio('sounds/scala40/tick.mp3');
    renderEvidenziazioni();
    apriPannelloHint();
}

// === MATITA ===
function toggleMatita() {
    matitaAttiva = !matitaAttiva;
    document.getElementById('btn-matita').classList.toggle('attivo', matitaAttiva);
    setMessaggio(matitaAttiva ? SUDOKU_LANG.matitaOn : SUDOKU_LANG.matitaOff);
    // La matita e il numero armato sono due modalità di piazzamento alternative:
    // tenerle attive insieme renderebbe ambiguo il click su una casella vuota
    if (matitaAttiva && numeroArmato !== 0) {
        numeroArmato = 0;
        renderEvidenziazioni();
    }
    aggiornaSpriteCursore();
}

// === SPRITE AL CURSORE (numero armato / matita) ===
// Solo per dispositivi con mouse vero: su touch non c'è un cursore da seguire e lo sprite darebbe solo fastidio
const haCursoreMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function aggiornaSpriteCursore() {
    const sprite = document.getElementById('sprite-cursore');
    if (!sprite || !haCursoreMouse) return;
    if (matitaAttiva) {
        sprite.textContent = '✏️';
        sprite.classList.add('visibile');
    } else if (numeroArmato !== 0) {
        sprite.textContent = numeroArmato;
        sprite.classList.add('visibile');
    } else {
        sprite.classList.remove('visibile');
    }
}

document.addEventListener('mousemove', function (e) {
    const sprite = document.getElementById('sprite-cursore');
    if (!sprite || !sprite.classList.contains('visibile')) return;
    sprite.style.left = e.clientX + 'px';
    sprite.style.top = e.clientY + 'px';
});

// === VITTORIA ===
function controllaVittoria() {
    for (let i = 0; i < 81; i++) {
        if (griglia[i] === 0) return; // schema non ancora completo
    }
    for (let i = 0; i < 81; i++) {
        if (griglia[i] !== soluzione[i]) {
            // Completo ma sbagliato: avvisa senza rivelare dove sono gli errori
            setMessaggio(SUDOKU_LANG.schemaErrori, 'rosso');
            riproduciAudio('sounds/scala40/knock.mp3');
            return;
        }
    }
    partitaFinita = true;
    if (timerId) clearInterval(timerId);
    localStorage.removeItem('sudoku-save');
    riproduciAudio('sounds/scala40/tada.mp3');

    const nuovoRecordAssoluto = aggiornaRecords(secondi);
    document.getElementById('vittoria-messaggio').innerHTML = SUDOKU_LANG.vittoria;
    document.getElementById('vittoria-dettagli').textContent =
        SUDOKU_LANG.riepilogo(difficolta, formattaTempo(secondi), erroriCount, hintCount) +
        (nuovoRecordAssoluto ? SUDOKU_LANG.nuovoRecord : '');

    // Analytics fine partita
    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_won', {
            'event_category': 'Sudoku',
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
        // Banner pubblicitario sopra la modale di vittoria (come in Klondike)
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

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('haivinto').style.display = 'none';
    document.getElementById('modale-regole').style.display = 'none';
    // Rimuove i banner delle modali per evitare annunci obsoleti alla riapertura
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('sudoku-difficolta') || 'facile');
}

function riprendiPartita() {
    chiudiModali();
    avviaTimer();
    setMessaggio(SUDOKU_LANG.partitaInCorso);
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
    if (partitaFinita || griglia.length === 0) {
        apriModaleInizio(false);
        return;
    }
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('confermatermina').style.display = 'flex';
    // Banner pubblicitario sopra la modale (stessa struttura di Klondike)
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

function apriRegole() {
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-regole').style.display = 'flex';
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

    if (e.key >= '1' && e.key <= '9') {
        clickNumero(parseInt(e.key, 10));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        cancellaCella();
    } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'm') {
        toggleMatita();
    } else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault();
        if (selezionata < 0) { selezionaCella(40); return; } // centro griglia
        let r = riga(selezionata), c = colonna(selezionata);
        if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
        if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
        selezionata = r * 9 + c;
        renderEvidenziazioni();
    }
});

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initSudoku);
    } else {
        initSudoku();
    }
});

function initSudoku() {
    // Se l'overlay dell'interstitial è presente a schermo, aspetta la sua chiusura
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initSudoku();
            }
        }, 100);
        return;
    }

    costruisciGriglia();

    // Inizializzazione audio toggle
    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }

    // Assicuriamoci che il layout si adegui
    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }

    // Pulsanti pannello
    for (let v = 1; v <= 9; v++) {
        document.getElementById('btn-num-' + v).addEventListener('click', (function (val) {
            return function () { clickNumero(val); };
        })(v));
    }
    document.getElementById('btn-matita').addEventListener('click', toggleMatita);
    document.getElementById('btn-cancella').addEventListener('click', cancellaCella);
    document.getElementById('btn-annulla').addEventListener('click', annullaMossa);
    document.getElementById('btn-hint').addEventListener('click', suggerimento);
    document.getElementById('btn-hint-spiega').addEventListener('click', mostraSpiegazioneHint);
    document.getElementById('btn-hint-applica').addEventListener('click', applicaHint);
    document.getElementById('btn-hint-chiudi').addEventListener('click', annullaSuggerimento);
    document.getElementById('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    document.getElementById('btn-regole-top').addEventListener('click', apriRegole);
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
        localStorage.removeItem('sudoku-save');
        location.reload();
    });

    // Opzioni segnalazione errori (persistenti)
    opzConflitti = localStorage.getItem('sudoku-opt-conflitti') !== '0';
    opzTuttiErrori = localStorage.getItem('sudoku-opt-tutti-errori') === '1';
    const chkConflitti = document.getElementById('chk-conflitti');
    const chkTutti = document.getElementById('chk-tutti-errori');
    chkConflitti.checked = opzConflitti;
    chkTutti.checked = opzTuttiErrori;
    chkConflitti.addEventListener('change', function () {
        opzConflitti = this.checked;
        localStorage.setItem('sudoku-opt-conflitti', opzConflitti ? '1' : '0');
        if (griglia.length === 81) renderTutto();
    });
    chkTutti.addEventListener('change', function () {
        opzTuttiErrori = this.checked;
        localStorage.setItem('sudoku-opt-tutti-errori', opzTuttiErrori ? '1' : '0');
        if (griglia.length === 81) renderTutto();
    });

    // Se esiste una partita salvata chiedi se riprenderla, altrimenti mostra il modale iniziale
    if (caricaPartita()) {
        renderTutto(); // mostra lo schema salvato dietro al modale
        apriModaleInizio(true);
    } else {
        renderInfo();
        apriModaleInizio(false);
    }
}
