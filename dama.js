/* ============================================================================
   DAMA ITALIANA - Logica di Gioco (JavaScript)
   Regole FID: presa obbligatoria con precedenze, la pedina non cattura la dama,
   la promozione interrompe la presa. Avversario computer con negamax alpha-beta.
   Stile e struttura coerenti con gli altri giochi del sito (Sudoku, Scopa).
   ============================================================================ */

window.scriptVersion = '1.0';

// === TESTI MULTILINGUA ===
const DAMA_LANG = (window.currentLang === 'en') ? {
    tuoTurno: 'Your turn',
    tuoTurnoCattura: 'Your turn — capture is mandatory!',
    prosegui: 'Multiple capture: keep jumping with the same piece',
    computerPensa: 'The computer is thinking...',
    promozione: 'Promoted to king!',
    vittoria: 'YOU WIN!<br>Congratulations!',
    sconfitta: 'YOU LOSE!<br>Better luck next time',
    patta: 'DRAW!<br>Well fought game',
    pattaMosse: 'Draw: too many moves without captures or pawn moves',
    suggerita: 'Suggested move highlighted',
    generazione: 'Setting up the board...',
    resetChiedi: 'OK?',
    bianco: 'White', nero: 'Black',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    riepilogo: function (diff, mosse, sugg) {
        return DAMA_LANG.diffNames[diff] + ' — Moves: ' + mosse + ' — Hints: ' + sugg;
    }
} : {
    tuoTurno: 'Tocca a te',
    tuoTurnoCattura: 'Tocca a te — la presa è obbligatoria!',
    prosegui: 'Presa multipla: continua a saltare con lo stesso pezzo',
    computerPensa: 'Il computer sta pensando...',
    promozione: 'Promozione a dama!',
    vittoria: 'HAI VINTO!<br>Complimenti!',
    sconfitta: 'HAI PERSO!<br>Andrà meglio la prossima volta',
    patta: 'PATTA!<br>Partita combattuta',
    pattaMosse: 'Patta: troppe mosse senza prese né spostamenti di pedine',
    suggerita: 'Mossa consigliata evidenziata',
    generazione: 'Preparazione della scacchiera...',
    resetChiedi: 'OK?',
    bianco: 'Bianco', nero: 'Nero',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    riepilogo: function (diff, mosse, sugg) {
        return DAMA_LANG.diffNames[diff] + ' — Mosse: ' + mosse + ' — Suggerimenti: ' + sugg;
    }
};

// === CONFIGURAZIONE AI PER DIFFICOLTÀ ===
// depth: profondità di ricerca; jitter: rumore casuale sui punteggi (mosse "umane")
const DAMA_AI = {
    facile: { depth: 2, jitter: 60 },
    medio: { depth: 5, jitter: 10 },
    difficile: { depth: 8, jitter: 0 }
};

// === STATO GLOBALE ===
// Scacchiera 8x8 come array di 64: 0 vuota, 1 pedina bianca, 2 dama bianca,
// -1 pedina nera, -2 dama nera. Riga 0 in alto; il Bianco parte in basso.
// Le case scure (giocabili) sono quelle con (riga+colonna) pari.
let board = [];
let giocatore = 1;          // 1 = il giocatore umano ha il Bianco, -1 il Nero
let turno = 1;              // di chi è il turno (1 bianco, -1 nero)
let difficolta = 'facile';
let partitaFinita = false;
let mosseGiocate = 0;       // semimosse totali della partita
let mosseSterili = 0;       // semimosse senza prese né mosse di pedina (per la patta)
let suggCount = 0;
let pila = [];              // snapshot per undo: { board, mosseSterili, mosseGiocate }
let computerPensando = false;

// Stato dell'interazione durante il turno del giocatore
let mosseCorrenti = [];     // mosse legali del giocatore in questo turno
let pezzoSel = -1;          // casella del pezzo selezionato (-1 nessuno)
let seqAttive = [];         // sequenze del pezzo selezionato compatibili coi passi fatti
let passoCorrente = 0;      // quanti passi della sequenza sono già stati eseguiti
let inCatena = false;       // true a metà di una presa multipla (non si può cambiare pezzo)

// Statistiche vinte/perse/patte per difficoltà (persistenti)
let stats = {};

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === UTILITÀ SCACCHIERA ===
function rigaDi(i) { return Math.floor(i / 8); }
function colDi(i) { return i % 8; }
function casaScura(i) { return (rigaDi(i) + colDi(i)) % 2 === 0; }
function segno(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }

const DIR_TUTTE = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
function direzioniPezzo(p) {
    if (Math.abs(p) === 2) return DIR_TUTTE;
    return p > 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function boardIniziale() {
    const b = new Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
        if (!casaScura(i)) continue;
        const r = rigaDi(i);
        if (r <= 2) b[i] = -1;      // Nero in alto
        else if (r >= 5) b[i] = 1;  // Bianco in basso
    }
    return b;
}

// === GENERAZIONE MOSSE (regole FID dama italiana) ===
// Una mossa: { from, passi: [caselle toccate], catture: [{idx, val}], promozione }

function mosseSemplici(b, colore) {
    const out = [];
    for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (segno(p) !== colore) continue;
        const r = rigaDi(i), c = colDi(i);
        const dirs = direzioniPezzo(p);
        for (let d = 0; d < dirs.length; d++) {
            const nr = r + dirs[d][0], nc = c + dirs[d][1];
            if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
            const j = nr * 8 + nc;
            if (b[j] !== 0) continue;
            const promo = Math.abs(p) === 1 && ((p > 0 && nr === 0) || (p < 0 && nr === 7));
            out.push({ from: i, passi: [j], catture: [], promozione: promo });
        }
    }
    return out;
}

// Sequenze di cattura per il pezzo in "from" (ricorsione con marcatura 9 = già preso)
function cattureDaPezzo(b0, from) {
    const p = b0[from];
    const isDama = Math.abs(p) === 2;
    const seqs = [];
    const b = b0.slice();
    b[from] = 0; // il pezzo è "in mano" durante la catena

    function ricorri(pos, passi, catture) {
        const r = rigaDi(pos), c = colDi(pos);
        const dirs = direzioniPezzo(p);
        let continuata = false;
        for (let d = 0; d < dirs.length; d++) {
            const or_ = r + dirs[d][0], oc = c + dirs[d][1];
            const lr = r + 2 * dirs[d][0], lc = c + 2 * dirs[d][1];
            if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
            const over = or_ * 8 + oc, land = lr * 8 + lc;
            const q = b[over];
            if (q === 0 || q === 9 || segno(q) === segno(p)) continue;
            if (!isDama && Math.abs(q) === 2) continue; // la pedina non può catturare la dama
            if (b[land] !== 0) continue;
            continuata = true;
            b[over] = 9; // marcato: non ricatturabile né attraversabile
            passi.push(land);
            catture.push({ idx: over, val: q });
            // Promozione in corsa: la presa si interrompe (regola italiana)
            if (!isDama && ((p > 0 && lr === 0) || (p < 0 && lr === 7))) {
                seqs.push({ from: from, passi: passi.slice(), catture: catture.slice(), promozione: true });
            } else {
                ricorri(land, passi, catture);
            }
            passi.pop();
            catture.pop();
            b[over] = q;
        }
        if (!continuata && catture.length > 0) {
            const promo = !isDama && ((p > 0 && rigaDi(pos) === 0) || (p < 0 && rigaDi(pos) === 7));
            seqs.push({ from: from, passi: passi.slice(), catture: catture.slice(), promozione: promo });
        }
    }

    ricorri(from, [], []);
    return seqs;
}

// Precedenze FID sulla scelta della presa:
// 1) massimo numero di pezzi; 2) a parità, presa con la dama;
// 3) a parità, massimo numero di dame catturate; 4) a parità, dama incontrata prima
function filtraPrecedenze(seqs, b) {
    let best = seqs;
    // 1. numero di pezzi catturati
    const maxN = Math.max.apply(null, best.map(s => s.catture.length));
    best = best.filter(s => s.catture.length === maxN);
    // 2. cattura con la dama
    if (best.some(s => Math.abs(b[s.from]) === 2)) {
        best = best.filter(s => Math.abs(b[s.from]) === 2);
    }
    // 3. numero di dame catturate
    const nDame = s => s.catture.filter(ct => Math.abs(ct.val) === 2).length;
    const maxDame = Math.max.apply(null, best.map(nDame));
    best = best.filter(s => nDame(s) === maxDame);
    // 4. dama incontrata prima: confronto lessicografico dei flag "è dama" in sequenza
    if (maxDame > 0 && best.length > 1) {
        const flags = s => s.catture.map(ct => (Math.abs(ct.val) === 2 ? 1 : 0));
        let rif = flags(best[0]);
        for (let k = 1; k < best.length; k++) {
            const f = flags(best[k]);
            for (let j = 0; j < f.length; j++) {
                if (f[j] !== rif[j]) { if (f[j] > rif[j]) rif = f; break; }
            }
        }
        best = best.filter(s => {
            const f = flags(s);
            for (let j = 0; j < f.length; j++) if (f[j] !== rif[j]) return false;
            return true;
        });
    }
    return best;
}

function mosseLegali(b, colore) {
    let catture = [];
    for (let i = 0; i < 64; i++) {
        if (segno(b[i]) === colore) {
            const s = cattureDaPezzo(b, i);
            for (let k = 0; k < s.length; k++) catture.push(s[k]);
        }
    }
    if (catture.length > 0) return filtraPrecedenze(catture, b);
    return mosseSemplici(b, colore);
}

// Applica una mossa a una copia della scacchiera e la restituisce
function applica(b0, m) {
    const b = b0.slice();
    let p = b[m.from];
    b[m.from] = 0;
    for (let k = 0; k < m.catture.length; k++) b[m.catture[k].idx] = 0;
    const dest = m.passi[m.passi.length - 1];
    const rd = rigaDi(dest);
    if (Math.abs(p) === 1 && ((p > 0 && rd === 0) || (p < 0 && rd === 7))) p = 2 * segno(p);
    b[dest] = p;
    return b;
}

// === VALUTAZIONE E RICERCA (negamax con potatura alpha-beta) ===
function valuta(b) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
        const v = b[i];
        if (v === 0) continue;
        const r = rigaDi(i), c = colDi(i);
        const centro = (c >= 2 && c <= 5) ? 3 : 0;
        if (v === 1) s += 100 + (7 - r) * 4 + (r === 7 ? 6 : 0) + centro;
        else if (v === -1) s -= 100 + r * 4 + (r === 0 ? 6 : 0) + centro;
        else if (v === 2) s += 320 + centro * 2;
        else s -= 320 + centro * 2;
    }
    return s;
}

function negamax(b, colore, depth, alpha, beta, ply) {
    const mosse = mosseLegali(b, colore);
    if (mosse.length === 0) return -10000 + ply; // chi non può muovere perde
    const inCattura = mosse[0].catture.length > 0;
    // Estensione delle catture: non ci si ferma a metà di uno scambio
    if ((depth <= 0 && !inCattura) || ply > 24) return colore * valuta(b);
    let best = -Infinity;
    for (let k = 0; k < mosse.length; k++) {
        const v = -negamax(applica(b, mosse[k]), -colore, depth - 1, -beta, -alpha, ply + 1);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
    }
    return best;
}

// Sceglie la mossa del colore indicato al livello di difficoltà dato
function scegliMossa(b, colore, diff) {
    const cfg = DAMA_AI[diff];
    const mosse = mosseLegali(b, colore);
    if (mosse.length === 0) return null;
    if (mosse.length === 1) return mosse[0];
    let migliore = mosse[0], migliorV = -Infinity;
    for (let k = 0; k < mosse.length; k++) {
        let v = -negamax(applica(b, mosse[k]), -colore, cfg.depth - 1, -Infinity, Infinity, 1);
        if (cfg.jitter > 0) v += (Math.random() - 0.5) * 2 * cfg.jitter;
        if (v > migliorV) { migliorV = v; migliore = mosse[k]; }
    }
    return migliore;
}

// === PERSISTENZA ===
function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('dama-save');
        return;
    }
    try {
        localStorage.setItem('dama-save', JSON.stringify({
            board: board, gioc: giocatore, diff: difficolta,
            sterili: mosseSterili, mosse: mosseGiocate, sugg: suggCount
        }));
    } catch (e) { /* storage pieno o bloccato: pazienza */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('dama-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.board || s.board.length !== 64) return false;
        board = s.board;
        giocatore = s.gioc;
        difficolta = s.diff || 'facile';
        mosseSterili = s.sterili || 0;
        mosseGiocate = s.mosse || 0;
        suggCount = s.sugg || 0;
        turno = giocatore; // si salva solo all'inizio del turno del giocatore
        partitaFinita = false;
        pila = [];
        return true;
    } catch (e) { return false; }
}

// === STATISTICHE VINTE/PERSE/PATTE ===
function caricaStats() {
    try { stats = JSON.parse(localStorage.getItem('dama-stats')) || {}; }
    catch (e) { stats = {}; }
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        if (!stats[d]) stats[d] = { v: 0, p: 0, n: 0 };
    });
    renderStats();
}

function salvaStats() {
    try { localStorage.setItem('dama-stats', JSON.stringify(stats)); } catch (e) { }
}

function renderStats() {
    const s = stats[difficolta] || { v: 0, p: 0, n: 0 };
    document.getElementById('stat-diff').textContent = DAMA_LANG.diffNames[difficolta].toUpperCase();
    document.getElementById('stat-vinte').textContent = s.v;
    document.getElementById('stat-perse').textContent = s.p;
    document.getElementById('stat-patte').textContent = s.n;
}

function azzeraStats() {
    const btn = document.getElementById('btn-reset-stats');
    if (!btn._conferma) {
        btn._conferma = true;
        const testoOrig = btn.textContent;
        btn.textContent = DAMA_LANG.resetChiedi;
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
// Il giocatore vede sempre i propri pezzi in basso: se ha il Nero la vista è ruotata
function idxVista(i) { return giocatore === 1 ? i : 63 - i; }

function costruisciScacchiera() {
    const sc = document.getElementById('scacchiera');
    sc.innerHTML = '';
    for (let v = 0; v < 64; v++) {
        const casa = document.createElement('div');
        casa.className = 'casa';
        casa.id = 'casa-' + v; // id in coordinate di vista
        casa.addEventListener('click', function () { clickCasa(idxVista(v)); });
        sc.appendChild(casa);
    }
    renderScacchiera();
}

function renderScacchiera() {
    for (let v = 0; v < 64; v++) {
        const i = idxVista(v);
        const casa = document.getElementById('casa-' + v);
        casa.className = 'casa ' + (casaScura(i) ? 'scura' : 'chiara');
        casa.innerHTML = '';
        const p = board[i];
        if (p !== 0 && p !== 9) {
            const pezzo = document.createElement('div');
            pezzo.className = 'pezzo ' + (p > 0 ? 'bianco' : 'nero') + (Math.abs(p) === 2 ? ' regina' : '');
            casa.appendChild(pezzo);
        }
    }
    renderInfo();
}

function evidenzia(idx, classe) {
    const v = giocatore === 1 ? idx : 63 - idx;
    const casa = document.getElementById('casa-' + v);
    if (casa) casa.classList.add(classe);
}

function pulisciEvidenziazioni() {
    document.querySelectorAll('#scacchiera .casa').forEach(function (c) {
        c.classList.remove('selezionabile', 'selezionata', 'destinazione', 'suggerita');
    });
}

function renderInfo() {
    let nb = 0, nn = 0;
    for (let i = 0; i < 64; i++) {
        if (segno(board[i]) === 1) nb++;
        else if (segno(board[i]) === -1) nn++;
    }
    document.getElementById('info-difficolta').textContent = DAMA_LANG.diffNames[difficolta];
    document.getElementById('info-colore').textContent = giocatore === 1 ? DAMA_LANG.bianco : DAMA_LANG.nero;
    document.getElementById('info-pezzi').textContent =
        (giocatore === 1 ? nb + ' - ' + nn : nn + ' - ' + nb);
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
    mosseCorrenti = mosseLegali(board, giocatore);
    if (mosseCorrenti.length === 0) { finePartita('persa'); return; }
    pezzoSel = -1;
    seqAttive = [];
    passoCorrente = 0;
    inCatena = false;
    pila.push({ board: board.slice(), sterili: mosseSterili, mosse: mosseGiocate });
    document.getElementById('btn-annulla').disabled = (pila.length <= 1);
    salvaPartita();
    const conCatture = mosseCorrenti[0].catture.length > 0;
    setMessaggio(conCatture ? DAMA_LANG.tuoTurnoCattura : DAMA_LANG.tuoTurno, conCatture ? 'giallo' : undefined);
    pulisciEvidenziazioni();
    mosseCorrenti.forEach(function (m) { evidenzia(m.from, 'selezionabile'); });
}

function clickCasa(i) {
    if (partitaFinita || computerPensando || turno !== giocatore) return;

    // A metà di una presa multipla si può solo proseguire la catena
    if (inCatena) {
        gestisciPasso(i);
        return;
    }

    // Selezione o cambio del pezzo
    const mieSeqs = mosseCorrenti.filter(function (m) { return m.from === i; });
    if (mieSeqs.length > 0) {
        pezzoSel = i;
        seqAttive = mieSeqs;
        passoCorrente = 0;
        riproduciAudio('sounds/scala40/tick.mp3');
        pulisciEvidenziazioni();
        mosseCorrenti.forEach(function (m) { evidenzia(m.from, 'selezionabile'); });
        evidenzia(i, 'selezionata');
        seqAttive.forEach(function (m) { evidenzia(m.passi[0], 'destinazione'); });
        return;
    }

    // Click su una destinazione del pezzo selezionato
    if (pezzoSel >= 0) gestisciPasso(i);
}

function gestisciPasso(i) {
    const compatibili = seqAttive.filter(function (m) { return m.passi[passoCorrente] === i; });
    if (compatibili.length === 0) return;
    seqAttive = compatibili;

    // Esegui il passo sulla scacchiera: sposta il pezzo, togli l'eventuale preso
    const posAttuale = passoCorrente === 0 ? seqAttive[0].from : seqAttive[0].passi[passoCorrente - 1];
    board[i] = board[posAttuale];
    board[posAttuale] = 0;
    if (seqAttive[0].catture.length > passoCorrente) {
        const presa = seqAttive[0].catture[passoCorrente];
        board[presa.idx] = 0;
        riproduciAudio('sounds/scala40/cardslide1.mp3');
    } else {
        riproduciAudio('sounds/scala40/cardplace1.mp3');
    }
    passoCorrente++;

    const completa = seqAttive.every(function (m) { return m.passi.length === passoCorrente; });
    if (completa) {
        finalizzaMossa(seqAttive[0], i);
    } else {
        // Presa multipla: continua con lo stesso pezzo
        inCatena = true;
        pezzoSel = i;
        renderScacchiera();
        pulisciEvidenziazioni();
        evidenzia(i, 'selezionata');
        seqAttive.forEach(function (m) { evidenzia(m.passi[passoCorrente], 'destinazione'); });
        setMessaggio(DAMA_LANG.prosegui, 'giallo');
    }
}

function finalizzaMossa(mossa, dest) {
    // Promozione
    const p = board[dest];
    const rd = rigaDi(dest);
    if (Math.abs(p) === 1 && ((p > 0 && rd === 0) || (p < 0 && rd === 7))) {
        board[dest] = 2 * segno(p);
        riproduciAudio('sounds/scala40/magic.mp3');
        setMessaggio(DAMA_LANG.promozione, 'giallo');
    }
    mosseGiocate++;
    if (mossa.catture.length > 0 || Math.abs(p) === 1) mosseSterili = 0;
    else mosseSterili++;

    inCatena = false;
    pezzoSel = -1;
    renderScacchiera();
    pulisciEvidenziazioni();

    if (controllaFineDopoMossa(-giocatore)) return;
    setTimeout(turnoComputer, 350);
}

// === TURNO DEL COMPUTER ===
function turnoComputer() {
    turno = -giocatore;
    computerPensando = true;
    setMessaggio(DAMA_LANG.computerPensa);
    setTimeout(function () {
        const mossa = scegliMossa(board, -giocatore, difficolta);
        if (!mossa) { computerPensando = false; finePartita('vinta'); return; }
        animaMossaComputer(mossa, 0);
    }, 120);
}

function animaMossaComputer(mossa, passo) {
    const posAttuale = passo === 0 ? mossa.from : mossa.passi[passo - 1];
    const dest = mossa.passi[passo];
    board[dest] = board[posAttuale];
    board[posAttuale] = 0;
    if (mossa.catture.length > passo) {
        board[mossa.catture[passo].idx] = 0;
        riproduciAudio('sounds/scala40/cardslide1.mp3');
    } else {
        riproduciAudio('sounds/scala40/cardplace1.mp3');
    }
    renderScacchiera();
    pulisciEvidenziazioni();
    evidenzia(mossa.from, 'suggerita');
    evidenzia(dest, 'selezionata');

    if (passo + 1 < mossa.passi.length) {
        setTimeout(function () { animaMossaComputer(mossa, passo + 1); }, 420);
        return;
    }

    // Mossa completata: promozione e contatori
    const p = board[dest];
    const rd = rigaDi(dest);
    let eraPedina = Math.abs(p) === 1;
    if (eraPedina && ((p > 0 && rd === 0) || (p < 0 && rd === 7))) {
        board[dest] = 2 * segno(p);
        riproduciAudio('sounds/scala40/magic.mp3');
        renderScacchiera();
    }
    mosseGiocate++;
    if (mossa.catture.length > 0 || eraPedina) mosseSterili = 0;
    else mosseSterili++;
    computerPensando = false;

    if (controllaFineDopoMossa(giocatore)) return;
    setTimeout(turnoGiocatore, 250);
}

// Controlli di fine partita PRIMA di passare il turno a "prossimo".
// Ritorna true se la partita è terminata.
function controllaFineDopoMossa(prossimo) {
    let pezziProssimo = 0;
    for (let i = 0; i < 64; i++) if (segno(board[i]) === prossimo) pezziProssimo++;
    if (pezziProssimo === 0 || mosseLegali(board, prossimo).length === 0) {
        finePartita(prossimo === giocatore ? 'persa' : 'vinta');
        return true;
    }
    if (mosseSterili >= 80) {
        setMessaggio(DAMA_LANG.pattaMosse);
        finePartita('patta');
        return true;
    }
    return false;
}

// === FINE PARTITA ===
function finePartita(esito) {
    partitaFinita = true;
    localStorage.removeItem('dama-save');
    pulisciEvidenziazioni();

    const s = stats[difficolta];
    if (esito === 'vinta') { s.v++; riproduciAudio('sounds/scala40/tada.mp3'); }
    else if (esito === 'persa') { s.p++; riproduciAudio('sounds/scala40/haiperso.mp3'); }
    else { s.n++; riproduciAudio('sounds/scala40/dindon.mp3'); }
    salvaStats();
    renderStats();

    const msg = esito === 'vinta' ? DAMA_LANG.vittoria : (esito === 'persa' ? DAMA_LANG.sconfitta : DAMA_LANG.patta);
    if (esito !== 'patta') setMessaggio(msg.replace('<br>', ' — '), esito === 'vinta' ? 'giallo' : 'rosso');
    document.getElementById('fine-messaggio').innerHTML = msg;
    document.getElementById('fine-dettagli').textContent =
        DAMA_LANG.riepilogo(difficolta, Math.ceil(mosseGiocate / 2), suggCount);

    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_' + (esito === 'vinta' ? 'won' : (esito === 'persa' ? 'lost' : 'draw')), {
            'event_category': 'Dama',
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
    mosseSterili = snap.sterili;
    mosseGiocate = snap.mosse;
    riproduciAudio('sounds/scala40/slitta.mp3');
    renderScacchiera();
    turnoGiocatore();
}

// === SUGGERIMENTO ===
function suggerimento() {
    if (partitaFinita || computerPensando || turno !== giocatore || inCatena) return;
    const mossa = scegliMossa(board, giocatore, 'medio');
    if (!mossa) return;
    suggCount++;
    riproduciAudio('sounds/scala40/tick.mp3');
    pulisciEvidenziazioni();
    mosseCorrenti.forEach(function (m) { evidenzia(m.from, 'selezionabile'); });
    evidenzia(mossa.from, 'suggerita');
    evidenzia(mossa.passi[mossa.passi.length - 1], 'destinazione');
    setMessaggio(DAMA_LANG.suggerita, 'giallo');
}

// === NUOVA PARTITA ===
function nuovaPartita(diff, colore) {
    difficolta = diff;
    giocatore = colore;
    localStorage.setItem('dama-difficolta', diff);
    localStorage.setItem('dama-colore', colore === 1 ? 'bianco' : 'nero');
    board = boardIniziale();
    turno = 1;
    partitaFinita = false;
    mosseGiocate = 0;
    mosseSterili = 0;
    suggCount = 0;
    pila = [];
    computerPensando = false;
    inCatena = false;
    pezzoSel = -1;
    chiudiModali();
    renderStats();
    renderScacchiera();
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
    selezionaDifficolta(localStorage.getItem('dama-difficolta') || 'facile');
    selezionaColore(localStorage.getItem('dama-colore') === 'nero' ? -1 : 1);
}

function riprendiPartita() {
    chiudiModali();
    renderStats();
    renderScacchiera();
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
        window.waitForInterstitial(initDama);
    } else {
        initDama();
    }
});

function initDama() {
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initDama();
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
    // "Vedi la scacchiera": chiude modale, schermo e banner; per ripartire
    // resta il pulsante NUOVA PARTITA nella colonna a destra
    document.getElementById('btn-vedi-scacchiera').addEventListener('click', chiudiModali);
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        localStorage.removeItem('dama-save');
        location.reload();
    });

    caricaStats();

    if (caricaPartita()) {
        costruisciScacchiera();
        apriModaleInizio(true);
    } else {
        board = boardIniziale();
        costruisciScacchiera();
        apriModaleInizio(false);
    }
}
