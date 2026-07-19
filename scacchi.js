/* ============================================================================
   SCACCHI - Logica di Gioco (JavaScript)
   Regole complete tramite chess.js (arrocco, en passant, promozione, matto,
   stallo, ripetizioni). Avversario: motore Stockfish in un Web Worker locale.
   Stile e struttura coerenti con gli altri giochi del sito (Dama, Sudoku).
   ============================================================================ */

window.scriptVersion = '1.0';

// === TESTI MULTILINGUA ===
const SCACCHI_LANG = (window.currentLang === 'en') ? {
    tuoTurno: 'Your turn',
    tuoTurnoScacco: 'Your turn — you are in CHECK!',
    computerPensa: 'The computer is thinking...',
    scaccoAlComputer: 'Check!',
    promozioneScegli: 'Choose the promotion piece',
    vittoria: 'CHECKMATE — YOU WIN!<br>Congratulations!',
    sconfitta: 'CHECKMATE — YOU LOSE!<br>Better luck next time',
    pattaStallo: 'DRAW — Stalemate',
    pattaRipetizione: 'DRAW — Threefold repetition',
    pattaMateriale: 'DRAW — Insufficient material',
    patta50: 'DRAW — Fifty-move rule',
    patta: 'DRAW!',
    suggerita: 'Suggested move highlighted',
    caricamentoMotore: 'Loading the chess engine...',
    resetChiedi: 'OK?',
    bianco: 'White', nero: 'Black',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    riepilogo: function (nomeLiv, mosse, sugg) {
        return nomeLiv + ' — Moves: ' + mosse + ' — Hints: ' + sugg;
    }
} : {
    tuoTurno: 'Tocca a te',
    tuoTurnoScacco: 'Tocca a te — sei sotto SCACCO!',
    computerPensa: 'Il computer sta pensando...',
    scaccoAlComputer: 'Scacco!',
    promozioneScegli: 'Scegli il pezzo per la promozione',
    vittoria: 'SCACCO MATTO — HAI VINTO!<br>Complimenti!',
    sconfitta: 'SCACCO MATTO — HAI PERSO!<br>Andrà meglio la prossima volta',
    pattaStallo: 'PATTA — Stallo',
    pattaRipetizione: 'PATTA — Triplice ripetizione',
    pattaMateriale: 'PATTA — Materiale insufficiente',
    patta50: 'PATTA — Regola delle 50 mosse',
    patta: 'PATTA!',
    suggerita: 'Mossa consigliata evidenziata',
    caricamentoMotore: 'Caricamento del motore scacchistico...',
    resetChiedi: 'OK?',
    bianco: 'Bianco', nero: 'Nero',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    riepilogo: function (nomeLiv, mosse, sugg) {
        return nomeLiv + ' — Mosse: ' + mosse + ' — Suggerimenti: ' + sugg;
    }
};

// === CONFIGURAZIONE MOTORE ===
// Il livello è lo "Skill Level" UCI di Stockfish (0-20), impostabile anche
// direttamente col cursore; i tre pulsanti sono scorciatoie sui valori preset.
const SKILL_PRESET = { facile: 0, medio: 8, difficile: 20 };

// Fascia di difficoltà per statistiche e nome, in base allo skill
function bucketSkill(s) { return s <= 5 ? 'facile' : (s <= 13 ? 'medio' : 'difficile'); }

// Tempo di riflessione proporzionale al livello (200ms a skill 0, 1200ms a skill 20)
function movetimePerSkill(s) { return 200 + s * 50; }

// === STATO GLOBALE ===
let game = null;              // istanza Chess (chess.js)
let giocatore = 'w';          // colore del giocatore umano: 'w' | 'b'
let skillCorrente = 0;        // Skill Level del motore per la partita in corso (0-20)
let difficolta = 'facile';    // fascia derivata dallo skill (per statistiche e nome)
let partitaFinita = false;
let suggCount = 0;
let computerPensando = false;
let selezionata = null;       // casella selezionata es. 'e2'
let destinazioni = [];        // mosse verbose legali dalla casella selezionata
let ultimaMossa = null;       // { from, to } per l'evidenziazione
let promozionePendente = null; // { from, to } in attesa della scelta del pezzo
let stats = {};

// Simboli dei pezzi (glifi pieni per entrambi i colori, colorati via CSS)
const SIMBOLI = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === MOTORE STOCKFISH (Web Worker) ===
let sf = null;
let sfCallback = null;

function initMotore() {
    sf = new Worker('stockfish-10.js');
    sf.onmessage = function (e) {
        const line = '' + e.data;
        if (line.indexOf('bestmove') === 0) {
            const mv = line.split(' ')[1];
            const cb = sfCallback;
            sfCallback = null;
            if (cb) cb(mv);
        }
    };
    sf.postMessage('uci');
}

// Chiede al motore la mossa migliore per la posizione data
function chiediMossaMotore(fen, skill, movetime, cb) {
    sfCallback = cb;
    sf.postMessage('setoption name Skill Level value ' + skill);
    sf.postMessage('position fen ' + fen);
    sf.postMessage('go movetime ' + movetime);
}

// === PERSISTENZA ===
function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('scacchi-save');
        return;
    }
    try {
        localStorage.setItem('scacchi-save', JSON.stringify({
            pgn: game.pgn(), gioc: giocatore, skill: skillCorrente, sugg: suggCount
        }));
    } catch (e) { }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('scacchi-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        const g = new Chess();
        if (s.pgn && !g.load_pgn(s.pgn)) return false;
        game = g;
        giocatore = s.gioc === 'b' ? 'b' : 'w';
        skillCorrente = typeof s.skill === 'number' ? s.skill : 0;
        difficolta = bucketSkill(skillCorrente);
        suggCount = s.sugg || 0;
        partitaFinita = false;
        // Si salva solo all'inizio del turno del giocatore
        if (game.turn() !== giocatore) return false;
        const h = game.history({ verbose: true });
        ultimaMossa = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
        return true;
    } catch (e) { return false; }
}

// === STATISTICHE VINTE/PERSE/PATTE ===
function caricaStats() {
    try { stats = JSON.parse(localStorage.getItem('scacchi-stats')) || {}; }
    catch (e) { stats = {}; }
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        if (!stats[d]) stats[d] = { v: 0, p: 0, n: 0 };
    });
    renderStats();
}

function salvaStats() {
    try { localStorage.setItem('scacchi-stats', JSON.stringify(stats)); } catch (e) { }
}

function renderStats() {
    const s = stats[difficolta] || { v: 0, p: 0, n: 0 };
    document.getElementById('stat-diff').textContent = SCACCHI_LANG.diffNames[difficolta].toUpperCase();
    document.getElementById('stat-vinte').textContent = s.v;
    document.getElementById('stat-perse').textContent = s.p;
    document.getElementById('stat-patte').textContent = s.n;
}

function azzeraStats() {
    const btn = document.getElementById('btn-reset-stats');
    if (!btn._conferma) {
        btn._conferma = true;
        const testoOrig = btn.textContent;
        btn.textContent = SCACCHI_LANG.resetChiedi;
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
// Il giocatore vede sempre i propri pezzi in basso: col Nero la vista è ruotata.
// v = indice di vista 0-63 (riga per riga dall'alto); ritorna la casella es. 'e4'
function casaDaVista(v) {
    const r = Math.floor(v / 8), c = v % 8;
    if (giocatore === 'w') return FILES[c] + (8 - r);
    return FILES[7 - c] + (r + 1);
}

function vistaDaCasa(sq) {
    const c = FILES.indexOf(sq[0]), rank = parseInt(sq[1], 10);
    if (giocatore === 'w') return (8 - rank) * 8 + c;
    return (rank - 1) * 8 + (7 - c);
}

function costruisciScacchiera() {
    const sc = document.getElementById('scacchiera');
    sc.innerHTML = '';
    for (let v = 0; v < 64; v++) {
        const casa = document.createElement('div');
        casa.className = 'casa';
        casa.id = 'casa-' + v;
        casa.addEventListener('click', (function (vv) {
            return function () { clickCasa(casaDaVista(vv)); };
        })(v));
        sc.appendChild(casa);
    }
    renderScacchiera();
}

function renderScacchiera() {
    const posizione = game.board(); // [riga 8 ... riga 1], ognuna array di 8 (a-h)
    for (let v = 0; v < 64; v++) {
        const sq = casaDaVista(v);
        const c = FILES.indexOf(sq[0]), rank = parseInt(sq[1], 10);
        const pezzo = posizione[8 - rank][c];
        const casa = document.getElementById('casa-' + v);
        const chiara = (c + rank) % 2 === 1;
        casa.className = 'casa ' + (chiara ? 'chiara' : 'scura');
        casa.innerHTML = '';
        if (pezzo) {
            const el = document.createElement('span');
            el.className = 'pezzo ' + (pezzo.color === 'w' ? 'bianco' : 'nero');
            el.textContent = SIMBOLI[pezzo.type];
            casa.appendChild(el);
        }
    }
    // Evidenzia l'ultima mossa e l'eventuale re sotto scacco
    if (ultimaMossa) {
        aggiungiClasse(ultimaMossa.from, 'ultima-mossa');
        aggiungiClasse(ultimaMossa.to, 'ultima-mossa');
    }
    if (game.in_check()) {
        const reSq = trovaRe(game.turn());
        if (reSq) aggiungiClasse(reSq, 'scacco');
    }
    renderInfo();
    renderMosse();
    renderCatture();
}

function trovaRe(colore) {
    const b = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.type === 'k' && p.color === colore) return FILES[c] + (8 - r);
        }
    }
    return null;
}

function aggiungiClasse(sq, classe) {
    const casa = document.getElementById('casa-' + vistaDaCasa(sq));
    if (casa) casa.classList.add(classe);
}

function pulisciEvidenziazioni() {
    document.querySelectorAll('#scacchiera .casa').forEach(function (c) {
        c.classList.remove('selezionata', 'destinazione', 'cattura', 'suggerita');
    });
}

// Nome del livello: preset se coincide, altrimenti il numero di skill
function nomeLivello(skill) {
    if (skill === SKILL_PRESET.facile) return SCACCHI_LANG.diffNames.facile;
    if (skill === SKILL_PRESET.medio) return SCACCHI_LANG.diffNames.medio;
    if (skill === SKILL_PRESET.difficile) return SCACCHI_LANG.diffNames.difficile;
    return (window.currentLang === 'en' ? 'Level ' : 'Livello ') + skill;
}

function renderInfo() {
    document.getElementById('info-difficolta').textContent = nomeLivello(skillCorrente);
    document.getElementById('info-colore').textContent = giocatore === 'w' ? SCACCHI_LANG.bianco : SCACCHI_LANG.nero;
    document.getElementById('info-mosse').textContent = Math.ceil(game.history().length / 2);
}

// Pezzi catturati dalle due parti, con vantaggio materiale in punti
const VALORI_PEZZI = { p: 1, n: 3, b: 3, r: 5, q: 9 };
function renderCatture() {
    const h = game.history({ verbose: true });
    const preseGiocatore = [], preseComputer = [];
    for (let i = 0; i < h.length; i++) {
        if (!h[i].captured) continue;
        if (h[i].color === giocatore) preseGiocatore.push(h[i].captured);
        else preseComputer.push(h[i].captured);
    }
    const ordina = function (arr) { return arr.sort(function (a, b) { return VALORI_PEZZI[b] - VALORI_PEZZI[a]; }); };
    const glifi = function (arr, colore) {
        return ordina(arr).map(function (t) {
            return '<span class="pezzo-preso ' + colore + '">' + SIMBOLI[t] + '</span>';
        }).join('');
    };
    // I pezzi presi dal giocatore sono del colore del computer, e viceversa
    document.getElementById('catture-mie').innerHTML = glifi(preseGiocatore, giocatore === 'w' ? 'nero' : 'bianco');
    document.getElementById('catture-sue').innerHTML = glifi(preseComputer, giocatore === 'w' ? 'bianco' : 'nero');
    const punti = function (arr) { return arr.reduce(function (s, t) { return s + VALORI_PEZZI[t]; }, 0); };
    const diff = punti(preseGiocatore) - punti(preseComputer);
    document.getElementById('vantaggio-mio').textContent = diff > 0 ? '+' + diff : '';
    document.getElementById('vantaggio-suo').textContent = diff < 0 ? '+' + (-diff) : '';
}

// Lista delle mosse in notazione algebrica, a coppie numerate
function renderMosse() {
    const h = game.history();
    let html = '';
    for (let i = 0; i < h.length; i += 2) {
        html += '<span class="num-mossa">' + (i / 2 + 1) + '.</span> ' + h[i] + ' ' + (h[i + 1] || '') + '  ';
    }
    const el = document.getElementById('lista-mosse');
    el.innerHTML = html || '<span style="color:#8fb89f;">--</span>';
    el.scrollTop = el.scrollHeight;
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
    if (controllaFinePartita()) return;
    computerPensando = false;
    selezionata = null;
    destinazioni = [];
    document.getElementById('btn-annulla').disabled = game.history().length < 2;
    salvaPartita();
    const inScacco = game.in_check();
    setMessaggio(inScacco ? SCACCHI_LANG.tuoTurnoScacco : SCACCHI_LANG.tuoTurno, inScacco ? 'rosso' : undefined);
}

function clickCasa(sq) {
    if (partitaFinita || computerPensando || promozionePendente) return;
    if (game.turn() !== giocatore) return;

    // Click su una destinazione legale del pezzo selezionato?
    if (selezionata) {
        const mossa = destinazioni.find(function (m) { return m.to === sq; });
        if (mossa) {
            if (mossa.promotion) {
                promozionePendente = { from: selezionata, to: sq };
                apriScegliPromozione();
                return;
            }
            eseguiMossaGiocatore({ from: selezionata, to: sq });
            return;
        }
    }

    // Selezione (o cambio) di un proprio pezzo
    const pezzo = game.get(sq);
    if (pezzo && pezzo.color === giocatore) {
        if (selezionata === sq) { // deseleziona
            selezionata = null;
            destinazioni = [];
            pulisciEvidenziazioni();
            return;
        }
        selezionata = sq;
        destinazioni = game.moves({ square: sq, verbose: true });
        riproduciAudio('sounds/scala40/tick.mp3');
        pulisciEvidenziazioni();
        aggiungiClasseSel(sq, 'selezionata');
        destinazioni.forEach(function (m) {
            aggiungiClasseSel(m.to, m.captured ? 'cattura' : 'destinazione');
        });
    }
}

function aggiungiClasseSel(sq, classe) {
    const casa = document.getElementById('casa-' + vistaDaCasa(sq));
    if (casa) casa.classList.add(classe);
}

function eseguiMossaGiocatore(m) {
    const mossa = game.move(m);
    if (!mossa) return;
    ultimaMossa = { from: mossa.from, to: mossa.to };
    selezionata = null;
    destinazioni = [];
    suonaMossa(mossa);
    pulisciEvidenziazioni();
    renderScacchiera();
    if (controllaFinePartita()) return;
    setTimeout(turnoComputer, 250);
}

function suonaMossa(mossa) {
    if (mossa.flags.indexOf('p') !== -1 || mossa.flags.indexOf('k') !== -1 || mossa.flags.indexOf('q') !== -1) {
        riproduciAudio('sounds/scala40/magic.mp3');   // promozione o arrocco
    } else if (mossa.captured) {
        riproduciAudio('sounds/scala40/cardslide1.mp3');
    } else {
        riproduciAudio('sounds/scala40/cardplace1.mp3');
    }
    if (game.in_check() && !game.in_checkmate()) {
        setTimeout(function () { riproduciAudio('sounds/scala40/knock.mp3'); }, 220);
    }
}

// === SCELTA DELLA PROMOZIONE ===
function apriScegliPromozione() {
    const modale = document.getElementById('scegli-promozione');
    // Mostra i simboli del colore del giocatore
    modale.querySelectorAll('button').forEach(function (b) {
        b.querySelector('span').className = 'pezzo ' + (giocatore === 'w' ? 'bianco' : 'nero');
    });
    document.getElementById('schermo').style.display = 'block';
    modale.style.display = 'flex';
}

function scegliPromozione(tipo) {
    const p = promozionePendente;
    promozionePendente = null;
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('scegli-promozione').style.display = 'none';
    if (p) eseguiMossaGiocatore({ from: p.from, to: p.to, promotion: tipo });
}

// === TURNO DEL COMPUTER ===
function turnoComputer() {
    if (partitaFinita) return;
    computerPensando = true;
    setMessaggio(SCACCHI_LANG.computerPensa);
    chiediMossaMotore(game.fen(), skillCorrente, movetimePerSkill(skillCorrente), function (mv) {
        if (partitaFinita || !mv || mv === '(none)') { computerPensando = false; return; }
        const mossa = game.move({
            from: mv.slice(0, 2), to: mv.slice(2, 4),
            promotion: mv.length > 4 ? mv[4] : undefined
        });
        computerPensando = false;
        if (!mossa) return; // non dovrebbe accadere: il motore gioca solo mosse legali
        ultimaMossa = { from: mossa.from, to: mossa.to };
        suonaMossa(mossa);
        pulisciEvidenziazioni();
        renderScacchiera();
        turnoGiocatore();
    });
}

// === FINE PARTITA ===
// Ritorna true se la partita è terminata (e gestisce modale/statistiche)
function controllaFinePartita() {
    if (partitaFinita) return true;
    let esito = null, msg = null;
    if (game.in_checkmate()) {
        // Chi deve muovere è mattato
        esito = game.turn() === giocatore ? 'persa' : 'vinta';
        msg = esito === 'vinta' ? SCACCHI_LANG.vittoria : SCACCHI_LANG.sconfitta;
    } else if (game.in_stalemate()) {
        esito = 'patta'; msg = SCACCHI_LANG.pattaStallo;
    } else if (game.in_threefold_repetition()) {
        esito = 'patta'; msg = SCACCHI_LANG.pattaRipetizione;
    } else if (game.insufficient_material()) {
        esito = 'patta'; msg = SCACCHI_LANG.pattaMateriale;
    } else if (game.in_draw()) {
        esito = 'patta'; msg = SCACCHI_LANG.patta50;
    }
    if (!esito) return false;

    partitaFinita = true;
    localStorage.removeItem('scacchi-save');
    pulisciEvidenziazioni();

    const s = stats[difficolta];
    if (esito === 'vinta') { s.v++; riproduciAudio('sounds/scala40/tada.mp3'); }
    else if (esito === 'persa') { s.p++; riproduciAudio('sounds/scala40/haiperso.mp3'); }
    else { s.n++; riproduciAudio('sounds/scala40/dindon.mp3'); }
    salvaStats();
    renderStats();

    if (esito !== 'patta') setMessaggio(msg.replace('<br>', ' — '), esito === 'vinta' ? 'giallo' : 'rosso');
    else setMessaggio(msg);
    document.getElementById('fine-messaggio').innerHTML = msg;
    document.getElementById('fine-dettagli').textContent =
        SCACCHI_LANG.riepilogo(nomeLivello(skillCorrente), Math.ceil(game.history().length / 2), suggCount);

    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_' + (esito === 'vinta' ? 'won' : (esito === 'persa' ? 'lost' : 'draw')), {
            'event_category': 'Scacchi',
            'difficulty': difficolta,
            'skill': skillCorrente,
            'moves': Math.ceil(game.history().length / 2),
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
    }, 1200);
    return true;
}

// === UNDO (annulla la tua ultima mossa e la risposta del computer) ===
function annullaMossa() {
    if (partitaFinita || computerPensando || promozionePendente) return;
    if (game.turn() !== giocatore || game.history().length < 2) return;
    game.undo();
    game.undo();
    const h = game.history({ verbose: true });
    ultimaMossa = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
    selezionata = null;
    destinazioni = [];
    riproduciAudio('sounds/scala40/slitta.mp3');
    pulisciEvidenziazioni();
    renderScacchiera();
    turnoGiocatore();
}

// === SUGGERIMENTO (chiede al motore a piena forza) ===
function suggerimento() {
    if (partitaFinita || computerPensando || promozionePendente) return;
    if (game.turn() !== giocatore) return;
    computerPensando = true; // blocca l'input mentre il motore calcola
    setMessaggio(SCACCHI_LANG.computerPensa);
    chiediMossaMotore(game.fen(), 20, 500, function (mv) {
        computerPensando = false;
        if (partitaFinita || !mv || mv === '(none)') return;
        suggCount++;
        riproduciAudio('sounds/scala40/tick.mp3');
        pulisciEvidenziazioni();
        aggiungiClasse(mv.slice(0, 2), 'suggerita');
        aggiungiClasse(mv.slice(2, 4), 'suggerita');
        setMessaggio(SCACCHI_LANG.suggerita, 'giallo');
    });
}

// === NUOVA PARTITA ===
function nuovaPartita(skill, colore) {
    skillCorrente = skill;
    difficolta = bucketSkill(skill);
    giocatore = colore;
    localStorage.setItem('scacchi-skill', skill);
    localStorage.setItem('scacchi-colore', colore);
    game = new Chess();
    partitaFinita = false;
    suggCount = 0;
    computerPensando = false;
    selezionata = null;
    destinazioni = [];
    ultimaMossa = null;
    promozionePendente = null;
    sf.postMessage('ucinewgame');
    chiudiModali();
    renderStats();
    costruisciScacchiera(); // ricostruita per orientare la vista al colore scelto
    if (giocatore === 'w') turnoGiocatore();
    else turnoComputer();
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('finepartita').style.display = 'none';
    document.getElementById('modale-regole').style.display = 'none';
    document.getElementById('scegli-promozione').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    const salvato = parseInt(localStorage.getItem('scacchi-skill'), 10);
    impostaSkillUI(isNaN(salvato) ? 0 : Math.max(0, Math.min(20, salvato)));
    selezionaColore(localStorage.getItem('scacchi-colore') === 'b' ? 'b' : 'w');
}

function riprendiPartita() {
    chiudiModali();
    renderStats();
    costruisciScacchiera();
    turnoGiocatore();
}

let tempSkill = 0;
let tempColore = 'w';

// Sincronizza pulsanti preset, cursore ed etichetta con lo skill scelto
function impostaSkillUI(skill) {
    tempSkill = skill;
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', SKILL_PRESET[d] === skill);
    });
    document.getElementById('slider-skill').value = skill;
    document.getElementById('skill-valore').textContent = skill;
}

function selezionaDifficolta(diff) {
    impostaSkillUI(SKILL_PRESET[diff]);
}
function selezionaColore(colore) {
    tempColore = colore;
    document.getElementById('btn-col-bianco').classList.toggle('attiva', colore === 'w');
    document.getElementById('btn-col-nero').classList.toggle('attiva', colore === 'b');
}
function confermaEAvviaPartita() {
    nuovaPartita(tempSkill, tempColore);
}

function richiediNuovaPartita() {
    // Partita conclusa: il reload rinnova pubblicità, interstitial e statistiche
    // di pagina (al ricaricamento appare direttamente la scelta della difficoltà)
    if (partitaFinita) {
        location.reload();
        return;
    }
    if (!game || game.history().length === 0) {
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
        window.waitForInterstitial(initScacchi);
    } else {
        initScacchi();
    }
});

function initScacchi() {
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initScacchi();
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

    setMessaggio(SCACCHI_LANG.caricamentoMotore);
    initMotore();

    document.getElementById('btn-annulla').addEventListener('click', annullaMossa);
    document.getElementById('btn-hint').addEventListener('click', suggerimento);
    document.getElementById('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    document.getElementById('btn-regole-top').addEventListener('click', apriRegole);
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);
    document.getElementById('btn-reset-stats').addEventListener('click', azzeraStats);
    document.getElementById('slider-skill').addEventListener('input', function () {
        impostaSkillUI(parseInt(this.value, 10));
    });
    // "Vedi la scacchiera": chiude modale, schermo e banner; per ripartire
    // resta il pulsante NUOVA PARTITA nella colonna a destra
    document.getElementById('btn-vedi-scacchiera').addEventListener('click', chiudiModali);
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        localStorage.removeItem('scacchi-save');
        location.reload();
    });

    caricaStats();

    if (caricaPartita()) {
        costruisciScacchiera();
        apriModaleInizio(true);
    } else {
        game = new Chess();
        costruisciScacchiera();
        apriModaleInizio(false);
    }
}
