/* ============================================================================
   MULINO (Nine Men's Morris) - Logica di Gioco (JavaScript)
   Tre fasi: piazzamento delle 9 pedine, spostamento sulle linee, volo a 3 pedine.
   Chi chiude un mulino cattura una pedina avversaria (non da un mulino, salvo
   che siano tutte in mulino). Avversario computer con negamax alpha-beta.
   Stile e struttura coerenti con gli altri giochi del sito (Dama, Sudoku, Scopa).
   ============================================================================ */

window.scriptVersion = '1.0';

// === TESTI MULTILINGUA ===
const MULINO_LANG = (window.currentLang === 'en') ? {
    tuoTurnoPiazza: 'Your turn — place a piece',
    tuoTurnoMuovi: 'Your turn — move a piece along a line',
    tuoTurnoVola: 'Your turn — you have 3 pieces: fly anywhere!',
    tuoTurnoCattura: 'Mill closed! Remove an opponent piece',
    computerPensa: 'The computer is thinking...',
    computerMulino: 'The computer closed a mill and removed one of your pieces',
    vittoria: 'YOU WIN!<br>Congratulations!',
    sconfitta: 'YOU LOSE!<br>Better luck next time',
    patta: 'DRAW!<br>Well fought game',
    pattaMosse: 'Draw: too many moves without mills or captures',
    pattaRipetizione: 'Draw by threefold repetition of the position',
    vintoPezzi: 'opponent down to 2 pieces',
    vintoBloccato: 'opponent has no legal moves',
    persoPezzi: 'you are down to 2 pieces',
    persoBloccato: 'you have no legal moves',
    suggerita: 'Suggested move highlighted',
    resetChiedi: 'OK?',
    bianco: 'White', nero: 'Black',
    fasePiazza: 'Placing', faseMuovi: 'Moving', faseVola: 'Flying',
    daPiazzare: 'To place',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    riepilogo: function (diff, mosse, sugg) {
        return MULINO_LANG.diffNames[diff] + ' — Moves: ' + mosse + ' — Hints: ' + sugg;
    }
} : {
    tuoTurnoPiazza: 'Tocca a te — piazza una pedina',
    tuoTurnoMuovi: 'Tocca a te — muovi una pedina lungo una linea',
    tuoTurnoVola: 'Tocca a te — sei a 3 pedine: puoi volare ovunque!',
    tuoTurnoCattura: 'Mulino chiuso! Togli una pedina avversaria',
    computerPensa: 'Il computer sta pensando...',
    computerMulino: 'Il computer ha chiuso un mulino e ti ha tolto una pedina',
    vittoria: 'HAI VINTO!<br>Complimenti!',
    sconfitta: 'HAI PERSO!<br>Andrà meglio la prossima volta',
    patta: 'PATTA!<br>Partita combattuta',
    pattaMosse: 'Patta: troppe mosse senza mulini né catture',
    pattaRipetizione: 'Patta per triplice ripetizione della posizione',
    vintoPezzi: 'avversario ridotto a 2 pedine',
    vintoBloccato: 'avversario senza mosse legali',
    persoPezzi: 'sei rimasto con 2 pedine',
    persoBloccato: 'non hai più mosse legali',
    suggerita: 'Mossa consigliata evidenziata',
    resetChiedi: 'OK?',
    bianco: 'Bianco', nero: 'Nero',
    fasePiazza: 'Piazzamento', faseMuovi: 'Spostamento', faseVola: 'Volo',
    daPiazzare: 'Da piazzare',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    riepilogo: function (diff, mosse, sugg) {
        return MULINO_LANG.diffNames[diff] + ' — Mosse: ' + mosse + ' — Suggerimenti: ' + sugg;
    }
};

// === CONFIGURAZIONE AI PER DIFFICOLTÀ ===
// depth: profondità di ricerca; jitter: rumore casuale sui punteggi (mosse "umane")
const MULINO_AI = {
    facile: { depth: 1, jitter: 90 },
    medio: { depth: 4, jitter: 12 },
    difficile: { depth: 6, jitter: 0 }
};

// === GEOMETRIA DEL TABELLONE ===
// 24 posizioni numerate per anelli: 0-7 anello esterno, 8-15 anello di mezzo,
// 16-23 anello interno. Dentro ogni anello si parte dall'angolo in alto a
// sinistra e si procede in senso orario:
//    0 --- 1 --- 2        angolo, lato, angolo
//    |  8--9--10 |        (gli indici "lato" 1,3,5,7 sono i punti di mezzo)
//    | 16-17-18  |
//    7 15 23  19 11
//    | 22-21-20  |
//    | 14-13-12  |
//    6 --- 5 --- 4
const MULINO_COORD = [
    // anello esterno (raggio 3 sulla griglia 0..6)
    [0, 0], [3, 0], [6, 0], [6, 3], [6, 6], [3, 6], [0, 6], [0, 3],
    // anello di mezzo (raggio 2)
    [1, 1], [3, 1], [5, 1], [5, 3], [5, 5], [3, 5], [1, 5], [1, 3],
    // anello interno (raggio 1)
    [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [2, 3]
];

// Le 16 linee da tre: 8 lungo i lati degli anelli + 4 radiali sugli spigoli
// orizzontali/verticali che collegano i tre anelli.
const MULINO_LINEE = [
    // anello esterno
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    // anello di mezzo
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    // anello interno
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    // raccordi radiali fra i tre anelli, sempre elencati dall'esterno
    // verso l'interno: l'ordine conta, perché le adiacenze si ricavano
    // dalle coppie consecutive di ogni linea.
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]
];

// Adiacenze ricavate una volta sola dalle linee: due punti sono adiacenti se
// consecutivi in una linea da tre.
const MULINO_ADIACENTI = (function () {
    const adj = [];
    for (let i = 0; i < 24; i++) adj.push([]);
    MULINO_LINEE.forEach(function (l) {
        [[l[0], l[1]], [l[1], l[2]]].forEach(function (coppia) {
            if (adj[coppia[0]].indexOf(coppia[1]) < 0) adj[coppia[0]].push(coppia[1]);
            if (adj[coppia[1]].indexOf(coppia[0]) < 0) adj[coppia[1]].push(coppia[0]);
        });
    });
    return adj;
})();

// Per ogni posizione, le linee che la contengono (accelera il test dei mulini)
const MULINO_LINEE_DI = (function () {
    const out = [];
    for (let i = 0; i < 24; i++) {
        out.push(MULINO_LINEE.filter(function (l) { return l.indexOf(i) >= 0; }));
    }
    return out;
})();

// === STATO GLOBALE ===
// board: array di 24 — 0 vuoto, 1 pedina bianca, -1 pedina nera
let board = [];
let giocatore = 1;          // 1 = il giocatore umano ha il Bianco, -1 il Nero
let turno = 1;              // di chi è il turno (1 bianco, -1 nero)
let difficolta = 'facile';
let partitaFinita = false;
let mosseGiocate = 0;       // semimosse totali della partita
let mosseSterili = 0;       // semimosse senza mulini né catture (per la patta)
let suggCount = 0;
let pila = [];              // snapshot per undo
let computerPensando = false;
let ripetizioni = {};       // conteggio delle posizioni viste (patta per ripetizione)

// Pedine ancora da piazzare, per colore (9 a testa)
let daPiazzare = { 1: 9, '-1': 9 };

// Stato dell'interazione durante il turno del giocatore
let pezzoSel = -1;          // posizione del pezzo selezionato (-1 nessuno)
let inCattura = false;      // true quando il giocatore deve togliere una pedina

// Statistiche vinte/perse/patte per difficoltà (persistenti)
let stats = {};

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === UTILITÀ DI GIOCO ===
function contaPezzi(b, colore) {
    let n = 0;
    for (let i = 0; i < 24; i++) if (b[i] === colore) n++;
    return n;
}

// Il colore in "pos" fa parte di un mulino?
function inMulino(b, pos, colore) {
    const linee = MULINO_LINEE_DI[pos];
    for (let k = 0; k < linee.length; k++) {
        const l = linee[k];
        if (b[l[0]] === colore && b[l[1]] === colore && b[l[2]] === colore) return true;
    }
    return false;
}

// Piazzare/spostare "colore" in "pos" chiuderebbe un mulino?
// Si valuta sulla board già aggiornata con la pedina in pos.
function chiudeMulino(b, pos, colore) {
    return inMulino(b, pos, colore);
}

// Fase del colore: 'piazza' finché ha pedine in mano, 'vola' a 3 pedine, else 'muovi'
function faseDi(b, colore, riserva) {
    if (riserva[colore] > 0) return 'piazza';
    if (contaPezzi(b, colore) <= 3) return 'vola';
    return 'muovi';
}

// Pedine avversarie catturabili: quelle fuori dai mulini; se sono tutte in
// mulino allora si può prendere da un mulino (regola standard).
function catturabili(b, avversario) {
    const libere = [], tutte = [];
    for (let i = 0; i < 24; i++) {
        if (b[i] !== avversario) continue;
        tutte.push(i);
        if (!inMulino(b, i, avversario)) libere.push(i);
    }
    return libere.length > 0 ? libere : tutte;
}

// === GENERAZIONE MOSSE ===
// Una mossa: { from: -1 se piazzamento, to, cattura: pos o -1, mulino: bool }
// Le mosse che chiudono un mulino sono espanse in una variante per ogni
// possibile cattura, così la ricerca valuta anche QUALE pedina togliere.

function mosseLegali(b, colore, riserva) {
    const out = [];
    const fase = faseDi(b, colore, riserva);
    const avversario = -colore;

    function aggiungi(from, to) {
        const prova = b.slice();
        if (from >= 0) prova[from] = 0;
        prova[to] = colore;
        if (chiudeMulino(prova, to, colore)) {
            const prede = catturabili(prova, avversario);
            if (prede.length === 0) {
                out.push({ from: from, to: to, cattura: -1, mulino: true });
                return;
            }
            prede.forEach(function (p) {
                out.push({ from: from, to: to, cattura: p, mulino: true });
            });
        } else {
            out.push({ from: from, to: to, cattura: -1, mulino: false });
        }
    }

    if (fase === 'piazza') {
        for (let i = 0; i < 24; i++) if (b[i] === 0) aggiungi(-1, i);
        return out;
    }

    for (let i = 0; i < 24; i++) {
        if (b[i] !== colore) continue;
        if (fase === 'vola') {
            for (let j = 0; j < 24; j++) if (b[j] === 0) aggiungi(i, j);
        } else {
            const adj = MULINO_ADIACENTI[i];
            for (let k = 0; k < adj.length; k++) if (b[adj[k]] === 0) aggiungi(i, adj[k]);
        }
    }
    return out;
}

// Applica una mossa su una copia, restituendo { board, riserva }
function applica(b0, riserva0, colore, m) {
    const b = b0.slice();
    const riserva = { 1: riserva0[1], '-1': riserva0['-1'] };
    if (m.from >= 0) b[m.from] = 0;
    else riserva[colore]--;
    b[m.to] = colore;
    if (m.cattura >= 0) b[m.cattura] = 0;
    return { board: b, riserva: riserva };
}

// === VALUTAZIONE E RICERCA (negamax con potatura alpha-beta) ===
// Punteggio dal punto di vista del Bianco (colore 1).

function contaMulini(b, colore) {
    let n = 0;
    MULINO_LINEE.forEach(function (l) {
        if (b[l[0]] === colore && b[l[1]] === colore && b[l[2]] === colore) n++;
    });
    return n;
}

// Configurazioni a due pedine su una linea con la terza casella libera:
// sono i mulini "aperti", minaccia concreta al turno successivo.
function contaMinacce(b, colore) {
    let n = 0;
    MULINO_LINEE.forEach(function (l) {
        let mie = 0, vuote = 0;
        for (let k = 0; k < 3; k++) {
            if (b[l[k]] === colore) mie++;
            else if (b[l[k]] === 0) vuote++;
        }
        if (mie === 2 && vuote === 1) n++;
    });
    return n;
}

// Mobilità: caselle libere raggiungibili dalle proprie pedine
function contaMobilita(b, colore) {
    let n = 0;
    for (let i = 0; i < 24; i++) {
        if (b[i] !== colore) continue;
        const adj = MULINO_ADIACENTI[i];
        for (let k = 0; k < adj.length; k++) if (b[adj[k]] === 0) n++;
    }
    return n;
}

function valuta(b, riserva) {
    const pb = contaPezzi(b, 1) + riserva[1];
    const pn = contaPezzi(b, -1) + riserva['-1'];

    // Sconfitta per pedine esaurite (solo a piazzamento concluso)
    if (riserva[1] === 0 && contaPezzi(b, 1) <= 2) return -100000;
    if (riserva['-1'] === 0 && contaPezzi(b, -1) <= 2) return 100000;

    let s = 0;
    s += 100 * (pb - pn);
    s += 26 * (contaMulini(b, 1) - contaMulini(b, -1));
    s += 14 * (contaMinacce(b, 1) - contaMinacce(b, -1));
    s += 3 * (contaMobilita(b, 1) - contaMobilita(b, -1));
    return s;
}

function negamax(b, riserva, colore, depth, alpha, beta, ply) {
    const mosse = mosseLegali(b, colore, riserva);

    // Nessuna mossa disponibile: chi non può muovere perde
    if (mosse.length === 0) return -100000 + ply;

    if (depth <= 0) return colore * valuta(b, riserva);

    // Verifica di sconfitta per pedine esaurite prima di scendere
    if (riserva[colore] === 0 && contaPezzi(b, colore) <= 2) return -100000 + ply;

    let best = -Infinity;
    // Ordinamento: prima le mosse che catturano, migliora la potatura
    mosse.sort(function (x, y) { return (y.cattura >= 0 ? 1 : 0) - (x.cattura >= 0 ? 1 : 0); });

    for (let i = 0; i < mosse.length; i++) {
        const st = applica(b, riserva, colore, mosse[i]);
        const v = -negamax(st.board, st.riserva, -colore, depth - 1, -beta, -alpha, ply + 1);
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

function scegliMossa(b, riserva, colore, diff) {
    const cfg = MULINO_AI[diff] || MULINO_AI.facile;
    const mosse = mosseLegali(b, colore, riserva);
    if (mosse.length === 0) return null;

    /* Le prime mosse del piazzamento hanno un fattore di ramificazione enorme
       (fino a 24 caselle quasi tutte equivalenti per simmetria) e la ricerca
       profonda costerebbe secondi senza cambiare la scelta: si riduce la
       profondità finché il tabellone è molto libero. */
    let depth = cfg.depth;
    if (mosse.length > 18) depth = Math.min(depth, 3);
    else if (mosse.length > 13) depth = Math.min(depth, 4);

    let best = null, bestVal = -Infinity;
    for (let i = 0; i < mosse.length; i++) {
        const st = applica(b, riserva, colore, mosse[i]);
        let v = -negamax(st.board, st.riserva, -colore, depth - 1, -Infinity, Infinity, 1);
        if (cfg.jitter > 0) v += (Math.random() - 0.5) * cfg.jitter;
        if (v > bestVal) { bestVal = v; best = mosse[i]; }
    }
    return best;
}

// === PERSISTENZA ===
function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('mulino-save');
        return;
    }
    try {
        localStorage.setItem('mulino-save', JSON.stringify({
            board: board, gioc: giocatore, diff: difficolta,
            sterili: mosseSterili, mosse: mosseGiocate, sugg: suggCount,
            rb: daPiazzare[1], rn: daPiazzare['-1'], rip: ripetizioni
        }));
    } catch (e) { /* storage pieno o bloccato: pazienza */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('mulino-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.board || s.board.length !== 24) return false;
        board = s.board;
        giocatore = s.gioc;
        difficolta = s.diff || 'facile';
        mosseSterili = s.sterili || 0;
        mosseGiocate = s.mosse || 0;
        suggCount = s.sugg || 0;
        daPiazzare = { 1: s.rb || 0, '-1': s.rn || 0 };
        ripetizioni = s.rip || {};
        turno = giocatore; // si salva solo all'inizio del turno del giocatore
        partitaFinita = false;
        pila = [];
        inCattura = false;
        pezzoSel = -1;
        return true;
    } catch (e) { return false; }
}

// === STATISTICHE VINTE/PERSE/PATTE ===
function caricaStats() {
    try { stats = JSON.parse(localStorage.getItem('mulino-stats')) || {}; }
    catch (e) { stats = {}; }
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        if (!stats[d]) stats[d] = { v: 0, p: 0, n: 0 };
    });
    renderStats();
}

function salvaStats() {
    try { localStorage.setItem('mulino-stats', JSON.stringify(stats)); } catch (e) { }
}

function renderStats() {
    const s = stats[difficolta] || { v: 0, p: 0, n: 0 };
    document.getElementById('stat-diff').textContent = MULINO_LANG.diffNames[difficolta].toUpperCase();
    document.getElementById('stat-vinte').textContent = s.v;
    document.getElementById('stat-perse').textContent = s.p;
    document.getElementById('stat-patte').textContent = s.n;
}

function azzeraStats() {
    const btn = document.getElementById('btn-reset-stats');
    if (!btn._conferma) {
        btn._conferma = true;
        const testoOrig = btn.textContent;
        btn.textContent = MULINO_LANG.resetChiedi;
        btn.classList.add('conferma');
        btn._timer = setTimeout(function () {
            btn._conferma = false;
            btn.textContent = testoOrig;
            btn.classList.remove('conferma');
        }, 2500);
        return;
    }
    clearTimeout(btn._timer);
    btn._conferma = false;
    btn.textContent = '⟲';
    btn.classList.remove('conferma');
    stats[difficolta] = { v: 0, p: 0, n: 0 };
    salvaStats();
    renderStats();
}

// === RENDERING ===
// Il tabellone non è una griglia di caselle ma 24 nodi su coordinate assolute:
// si disegnano prima le linee (segmenti degli anelli e raccordi) e poi i nodi.
const LATO_TAB = 420;          // lato utile del tabellone in px (area occupata dai 24 punti)
const PASSO_TAB = LATO_TAB / 6; // distanza fra due punti adiacenti della griglia 0..6
// Cornice di legno fra il bordo di #tabellone e il quadrato esterno del disegno.
// Insieme agli 8px del bordo scuro vale un passo di griglia, cioè esattamente la
// distanza fra il quadrato esterno e quello di mezzo: così lo stacco fra la
// cornice e il primo quadrato è pari a quello fra due quadrati concentrici.
// Il bordo va scalato perché è ciò che l'occhio legge come limite del tabellone.
// Va sommata qui e non messa come padding CSS: i figli in posizione assoluta si
// riferiscono al padding box, quindi un padding li lascerebbe comunque a filo
// del bordo in alto e a sinistra, scentrando il disegno.
const BORDO_TAB = 8;                          // deve combaciare col border-width in CSS
const MARGINE_TAB = PASSO_TAB - BORDO_TAB;    // 70 - 8 = 62

function xDi(pos) { return MARGINE_TAB + MULINO_COORD[pos][0] * PASSO_TAB; }
function yDi(pos) { return MARGINE_TAB + MULINO_COORD[pos][1] * PASSO_TAB; }

function costruisciTabellone() {
    const tab = document.getElementById('tabellone');
    tab.innerHTML = '';

    // Linee: un div per ogni segmento fra punti consecutivi di ciascuna linea
    MULINO_LINEE.forEach(function (l) {
        [[l[0], l[1]], [l[1], l[2]]].forEach(function (seg) {
            const x1 = xDi(seg[0]), y1 = yDi(seg[0]);
            const x2 = xDi(seg[1]), y2 = yDi(seg[1]);
            const linea = document.createElement('div');
            linea.className = 'linea';
            if (y1 === y2) {
                linea.style.left = Math.min(x1, x2) + 'px';
                linea.style.top = (y1 - 1) + 'px';
                linea.style.width = Math.abs(x2 - x1) + 'px';
                linea.style.height = '3px';
            } else {
                linea.style.left = (x1 - 1) + 'px';
                linea.style.top = Math.min(y1, y2) + 'px';
                linea.style.width = '3px';
                linea.style.height = Math.abs(y2 - y1) + 'px';
            }
            tab.appendChild(linea);
        });
    });

    // Nodi cliccabili
    for (let i = 0; i < 24; i++) {
        const nodo = document.createElement('div');
        nodo.className = 'nodo';
        nodo.id = 'nodo-' + i;
        nodo.style.left = xDi(i) + 'px';
        nodo.style.top = yDi(i) + 'px';
        (function (idx) {
            nodo.addEventListener('click', function () { clickNodo(idx); });
        })(i);
        tab.appendChild(nodo);
    }
    renderTabellone();
}

function renderTabellone() {
    for (let i = 0; i < 24; i++) {
        const nodo = document.getElementById('nodo-' + i);
        if (!nodo) continue;
        nodo.className = 'nodo';
        nodo.innerHTML = '';
        if (board[i] !== 0) {
            const pezzo = document.createElement('div');
            pezzo.className = 'pezzo ' + (board[i] > 0 ? 'bianco' : 'nero');
            if (inMulino(board, i, board[i])) pezzo.classList.add('in-mulino');
            nodo.appendChild(pezzo);
        }
    }
    renderInfo();
}

function evidenzia(pos, classe) {
    const nodo = document.getElementById('nodo-' + pos);
    if (nodo) nodo.classList.add(classe);
}

function pulisciEvidenziazioni() {
    document.querySelectorAll('#tabellone .nodo').forEach(function (n) {
        n.classList.remove('selezionabile', 'selezionata', 'destinazione', 'suggerita', 'catturabile');
    });
}

function renderInfo() {
    const miei = contaPezzi(board, giocatore) + daPiazzare[giocatore];
    const suoi = contaPezzi(board, -giocatore) + daPiazzare[-giocatore];
    const fase = faseDi(board, giocatore, daPiazzare);
    const nomiFase = { piazza: MULINO_LANG.fasePiazza, muovi: MULINO_LANG.faseMuovi, vola: MULINO_LANG.faseVola };

    document.getElementById('info-difficolta').textContent = MULINO_LANG.diffNames[difficolta];
    document.getElementById('info-colore').textContent = giocatore === 1 ? MULINO_LANG.bianco : MULINO_LANG.nero;
    document.getElementById('info-pezzi').textContent = miei + ' - ' + suoi;
    document.getElementById('info-fase').textContent = nomiFase[fase];
    document.getElementById('info-riserva').textContent =
        daPiazzare[giocatore] + ' - ' + daPiazzare[-giocatore];

    // Riserve grafiche: pedine ancora da piazzare accanto al tabellone
    renderRiserva('riserva-giocatore', daPiazzare[giocatore], giocatore);
    renderRiserva('riserva-computer', daPiazzare[-giocatore], -giocatore);
}

function renderRiserva(idEl, quante, colore) {
    const el = document.getElementById(idEl);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < quante; i++) {
        const p = document.createElement('div');
        p.className = 'pezzo-riserva ' + (colore > 0 ? 'bianco' : 'nero');
        el.appendChild(p);
    }
}

function setMessaggio(testo, stile) {
    const el = document.getElementById('messaggio-stato');
    el.innerHTML = testo;
    el.classList.remove('msg-giallo', 'msg-rosso');
    if (stile === 'giallo') el.classList.add('msg-giallo');
    if (stile === 'rosso') el.classList.add('msg-rosso');
}

// === TURNO DEL GIOCATORE ===
function turnoGiocatore() {
    turno = giocatore;
    pezzoSel = -1;
    inCattura = false;
    pulisciEvidenziazioni();

    // Patta per ripetizione / mosse sterili viene controllata a fine mossa;
    // qui si verifica solo che il giocatore abbia mosse disponibili.
    const mosse = mosseLegali(board, giocatore, daPiazzare);
    if (mosse.length === 0) { finePartita('persa', MULINO_LANG.persoBloccato); return; }
    if (daPiazzare[giocatore] === 0 && contaPezzi(board, giocatore) <= 2) {
        finePartita('persa', MULINO_LANG.persoPezzi); return;
    }

    pila.push({
        board: board.slice(),
        rb: daPiazzare[1], rn: daPiazzare['-1'],
        sterili: mosseSterili, mosse: mosseGiocate
    });
    if (pila.length > 40) pila.shift();
    salvaPartita();

    const fase = faseDi(board, giocatore, daPiazzare);
    if (fase === 'piazza') setMessaggio(MULINO_LANG.tuoTurnoPiazza);
    else if (fase === 'vola') setMessaggio(MULINO_LANG.tuoTurnoVola, 'giallo');
    else setMessaggio(MULINO_LANG.tuoTurnoMuovi);

    evidenziaOrigini(mosse);
    renderTabellone();
    aggiornaBottoni();
}

// Evidenzia i punti da cui si può iniziare la mossa
function evidenziaOrigini(mosse) {
    const visti = {};
    mosse.forEach(function (m) {
        const k = m.from >= 0 ? m.from : m.to;
        if (visti[k]) return;
        visti[k] = true;
        evidenzia(k, 'selezionabile');
    });
}

function clickNodo(i) {
    if (partitaFinita || computerPensando || turno !== giocatore) return;

    // Fase di cattura: si clicca la pedina avversaria da togliere
    if (inCattura) {
        const prede = catturabili(board, -giocatore);
        if (prede.indexOf(i) < 0) return;
        board[i] = 0;
        inCattura = false;
        riproduciAudio('sounds/scala40/cardslide1.mp3');
        pulisciEvidenziazioni();
        renderTabellone();
        concludiMossaGiocatore(true);
        return;
    }

    const mosse = mosseLegali(board, giocatore, daPiazzare);
    const fase = faseDi(board, giocatore, daPiazzare);

    // Piazzamento: un solo click sulla casella libera
    if (fase === 'piazza') {
        const m = mosse.filter(function (x) { return x.to === i; })[0];
        if (!m) return;
        eseguiMossaGiocatore(m);
        return;
    }

    // Spostamento: primo click sul proprio pezzo, secondo sulla destinazione
    if (board[i] === giocatore) {
        const partenze = mosse.filter(function (x) { return x.from === i; });
        if (partenze.length === 0) return;
        pezzoSel = i;
        pulisciEvidenziazioni();
        evidenziaOrigini(mosse);
        evidenzia(i, 'selezionata');
        const visti = {};
        partenze.forEach(function (x) {
            if (visti[x.to]) return;
            visti[x.to] = true;
            evidenzia(x.to, 'destinazione');
        });
        riproduciAudio('sounds/scala40/tick.mp3');
        return;
    }

    if (pezzoSel < 0) return;
    const m = mosse.filter(function (x) { return x.from === pezzoSel && x.to === i; })[0];
    if (!m) return;
    eseguiMossaGiocatore(m);
}

// Esegue la parte "spostamento/piazzamento"; se chiude un mulino passa alla
// scelta della pedina da catturare, altrimenti conclude subito la mossa.
function eseguiMossaGiocatore(m) {
    if (m.from >= 0) board[m.from] = 0;
    else daPiazzare[giocatore]--;
    board[m.to] = giocatore;
    pezzoSel = -1;
    pulisciEvidenziazioni();
    renderTabellone();

    if (m.mulino) {
        const prede = catturabili(board, -giocatore);
        if (prede.length > 0) {
            inCattura = true;
            riproduciAudio('sounds/scala40/magic.mp3');
            setMessaggio(MULINO_LANG.tuoTurnoCattura, 'giallo');
            prede.forEach(function (p) { evidenzia(p, 'catturabile'); });
            aggiornaBottoni();
            return;
        }
    }
    riproduciAudio('sounds/scala40/cardplace1.mp3');
    concludiMossaGiocatore(m.mulino);
}

function concludiMossaGiocatore(conMulino) {
    mosseGiocate++;
    if (conMulino) mosseSterili = 0; else mosseSterili++;
    if (controllaFineDopoMossa(-giocatore)) return;
    setTimeout(turnoComputer, 300);
}

// === TURNO DEL COMPUTER ===
function turnoComputer() {
    turno = -giocatore;
    computerPensando = true;
    pezzoSel = -1;
    pulisciEvidenziazioni();
    setMessaggio(MULINO_LANG.computerPensa);
    aggiornaBottoni();

    setTimeout(function () {
        const mossa = scegliMossa(board, daPiazzare, -giocatore, difficolta);
        if (!mossa) {
            computerPensando = false;
            finePartita('vinta', MULINO_LANG.vintoBloccato);
            return;
        }
        eseguiMossaComputer(mossa);
    }, 150);
}

function eseguiMossaComputer(m) {
    const avv = -giocatore;
    if (m.from >= 0) board[m.from] = 0;
    else daPiazzare[avv]--;
    board[m.to] = avv;

    renderTabellone();
    pulisciEvidenziazioni();
    if (m.from >= 0) evidenzia(m.from, 'suggerita');
    evidenzia(m.to, 'selezionata');
    riproduciAudio('sounds/scala40/cardplace1.mp3');

    if (m.cattura >= 0) {
        // La cattura si mostra con un attimo di ritardo, così si vede cosa sparisce
        setTimeout(function () {
            evidenzia(m.cattura, 'catturabile');
            setTimeout(function () {
                board[m.cattura] = 0;
                riproduciAudio('sounds/scala40/cardslide1.mp3');
                renderTabellone();
                setMessaggio(MULINO_LANG.computerMulino, 'rosso');
                chiudiMossaComputer(true);
            }, 450);
        }, 250);
        return;
    }
    chiudiMossaComputer(false);
}

function chiudiMossaComputer(conMulino) {
    mosseGiocate++;
    if (conMulino) mosseSterili = 0; else mosseSterili++;
    computerPensando = false;
    if (controllaFineDopoMossa(giocatore)) return;
    setTimeout(turnoGiocatore, 300);
}

// Controlli di fine partita PRIMA di passare il turno a "prossimo".
// Ritorna true se la partita è terminata.
function controllaFineDopoMossa(prossimo) {
    // Sconfitta per pedine ridotte a 2 (solo a piazzamento concluso)
    if (daPiazzare[prossimo] === 0 && contaPezzi(board, prossimo) <= 2) {
        finePartita(prossimo === giocatore ? 'persa' : 'vinta',
            prossimo === giocatore ? MULINO_LANG.persoPezzi : MULINO_LANG.vintoPezzi);
        return true;
    }
    // Sconfitta per blocco totale
    if (mosseLegali(board, prossimo, daPiazzare).length === 0) {
        finePartita(prossimo === giocatore ? 'persa' : 'vinta',
            prossimo === giocatore ? MULINO_LANG.persoBloccato : MULINO_LANG.vintoBloccato);
        return true;
    }
    // Patta per stallo prolungato senza mulini
    if (mosseSterili >= 60) {
        setMessaggio(MULINO_LANG.pattaMosse);
        finePartita('patta', MULINO_LANG.pattaMosse);
        return true;
    }
    // Patta per triplice ripetizione (solo a piazzamento concluso)
    if (daPiazzare[1] === 0 && daPiazzare['-1'] === 0) {
        const chiave = board.join('') + '|' + prossimo;
        ripetizioni[chiave] = (ripetizioni[chiave] || 0) + 1;
        if (ripetizioni[chiave] >= 3) {
            setMessaggio(MULINO_LANG.pattaRipetizione);
            finePartita('patta', MULINO_LANG.pattaRipetizione);
            return true;
        }
    }
    return false;
}

// === FINE PARTITA ===
function finePartita(esito, motivo) {
    partitaFinita = true;
    localStorage.removeItem('mulino-save');
    pulisciEvidenziazioni();
    inCattura = false;
    aggiornaBottoni();

    const s = stats[difficolta];
    if (esito === 'vinta') { s.v++; riproduciAudio('sounds/scala40/tada.mp3'); }
    else if (esito === 'persa') { s.p++; riproduciAudio('sounds/scala40/haiperso.mp3'); }
    else { s.n++; riproduciAudio('sounds/scala40/dindon.mp3'); }
    salvaStats();
    renderStats();

    const msg = esito === 'vinta' ? MULINO_LANG.vittoria : (esito === 'persa' ? MULINO_LANG.sconfitta : MULINO_LANG.patta);
    if (esito !== 'patta') setMessaggio(msg.replace('<br>', ' — '), esito === 'vinta' ? 'giallo' : 'rosso');
    document.getElementById('fine-messaggio').innerHTML = msg;
    document.getElementById('fine-dettagli').textContent =
        (motivo ? motivo + ' — ' : '') + MULINO_LANG.riepilogo(difficolta, Math.ceil(mosseGiocate / 2), suggCount);

    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_' + (esito === 'vinta' ? 'won' : (esito === 'persa' ? 'lost' : 'draw')), {
            'event_category': 'Mulino',
            'difficulty': difficolta,
            'moves': Math.ceil(mosseGiocate / 2),
            'hints': suggCount,
            'version': window.scriptVersion || 'unknown'
        });
    }

    setTimeout(function () {
        document.getElementById('schermo').style.display = 'block';
        document.getElementById('finepartita').style.display = 'flex';
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('finepartita', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 1000);
}

// === UNDO (annulla l'ultima tua mossa e la risposta del computer) ===
function annullaMossa() {
    if (partitaFinita || computerPensando || turno !== giocatore) return;
    if (pila.length <= 1) return;
    pila.pop();               // stato all'inizio del turno corrente
    const snap = pila.pop();  // stato all'inizio del turno precedente
    board = snap.board.slice();
    daPiazzare = { 1: snap.rb, '-1': snap.rn };
    mosseSterili = snap.sterili;
    mosseGiocate = snap.mosse;
    inCattura = false;
    pezzoSel = -1;
    riproduciAudio('sounds/scala40/slitta.mp3');
    renderTabellone();
    turnoGiocatore();
}

// === SUGGERIMENTO ===
function suggerimento() {
    if (partitaFinita || computerPensando || turno !== giocatore) return;
    if (inCattura) {
        // In fase di cattura il suggerimento indica la preda migliore:
        // si preferisce spezzare una minaccia avversaria.
        const prede = catturabili(board, -giocatore);
        if (prede.length === 0) return;
        let best = prede[0], bestVal = Infinity;
        prede.forEach(function (p) {
            const prova = board.slice();
            prova[p] = 0;
            const v = giocatore * valuta(prova, daPiazzare);
            if (-v < bestVal) { bestVal = -v; best = p; }
        });
        suggCount++;
        riproduciAudio('sounds/scala40/tick.mp3');
        evidenzia(best, 'suggerita');
        setMessaggio(MULINO_LANG.suggerita, 'giallo');
        return;
    }
    const mossa = scegliMossa(board, daPiazzare, giocatore, 'medio');
    if (!mossa) return;
    suggCount++;
    riproduciAudio('sounds/scala40/tick.mp3');
    pulisciEvidenziazioni();
    evidenziaOrigini(mosseLegali(board, giocatore, daPiazzare));
    if (mossa.from >= 0) evidenzia(mossa.from, 'suggerita');
    evidenzia(mossa.to, 'destinazione');
    setMessaggio(MULINO_LANG.suggerita, 'giallo');
}

// I bottoni azione non hanno senso mentre pensa il computer o durante la cattura
function aggiornaBottoni() {
    const attivo = !partitaFinita && !computerPensando && turno === giocatore;
    document.getElementById('btn-annulla').disabled = !attivo || inCattura || pila.length <= 1;
    document.getElementById('btn-hint').disabled = !attivo;
}

// === NUOVA PARTITA ===
function nuovaPartita(diff, colore) {
    difficolta = diff;
    giocatore = colore;
    localStorage.setItem('mulino-difficolta', diff);
    localStorage.setItem('mulino-colore', colore === 1 ? 'bianco' : 'nero');
    board = new Array(24).fill(0);
    daPiazzare = { 1: 9, '-1': 9 };
    turno = 1;
    partitaFinita = false;
    mosseGiocate = 0;
    mosseSterili = 0;
    suggCount = 0;
    pila = [];
    ripetizioni = {};
    computerPensando = false;
    inCattura = false;
    pezzoSel = -1;
    chiudiModali();
    renderStats();
    renderTabellone();
    // Muove sempre per primo il Bianco
    if (giocatore === 1) turnoGiocatore();
    else turnoComputer();
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('finepartita').style.display = 'none';
    document.getElementById('modale-regole').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('mulino-difficolta') || 'facile');
    selezionaColore(localStorage.getItem('mulino-colore') === 'nero' ? -1 : 1);
}

function riprendiPartita() {
    chiudiModali();
    renderStats();
    renderTabellone();
    turnoGiocatore();
}

let tempDifficolta = 'facile';
let tempColore = 1;
function selezionaDifficolta(diff) {
    tempDifficolta = diff;
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', d === diff);
    });
}
function selezionaColore(colore) {
    tempColore = colore;
    document.getElementById('btn-col-bianco').classList.toggle('attiva', colore === 1);
    document.getElementById('btn-col-nero').classList.toggle('attiva', colore === -1);
}
function confermaEAvviaPartita() {
    nuovaPartita(tempDifficolta, tempColore);
}

function richiediNuovaPartita() {
    // Partita conclusa: il reload rinnova pubblicità, interstitial e statistiche
    // di pagina (al ricaricamento appare direttamente la scelta della difficoltà)
    if (partitaFinita) {
        location.reload();
        return;
    }
    if (board.length === 0 || mosseGiocate === 0) {
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

function apriRegole() {
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-regole').style.display = 'flex';
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
    }
});

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initMulino);
    } else {
        initMulino();
    }
});

function initMulino() {
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initMulino();
            }
        }, 100);
        return;
    }

    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }
    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }

    document.getElementById('btn-annulla').addEventListener('click', annullaMossa);
    document.getElementById('btn-hint').addEventListener('click', suggerimento);
    document.getElementById('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    document.getElementById('btn-regole-top').addEventListener('click', apriRegole);
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);
    document.getElementById('btn-reset-stats').addEventListener('click', azzeraStats);
    // "Vedi il tabellone": chiude modale, schermo e banner; per ripartire
    // resta il pulsante NUOVA PARTITA nella colonna a destra
    document.getElementById('btn-vedi-tabellone').addEventListener('click', chiudiModali);
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        localStorage.removeItem('mulino-save');
        location.reload();
    });

    caricaStats();

    if (caricaPartita()) {
        costruisciTabellone();
        apriModaleInizio(true);
    } else {
        board = new Array(24).fill(0);
        daPiazzare = { 1: 9, '-1': 9 };
        costruisciTabellone();
        apriModaleInizio(false);
    }
}
