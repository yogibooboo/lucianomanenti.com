/* ============================================================================
   IL GIOCO DEI QUADRATI (Dots and Boxes) - Logica di Gioco (JavaScript)
   A turno si traccia un lato fra due puntini; chi chiude il quarto lato di un
   quadretto lo conquista, ci mette la propria iniziale e rigioca. Vince chi ne
   conquista di piu'.
   Tre formati predefiniti piu' uno libero, avversario controllato dal computer
   con tre livelli di forza.
   Stile e struttura coerenti con Campo Minato, Sudoku e Calcolo Enigmatico.
   ============================================================================ */

// === TESTI MULTILINGUA ===
const QUAD_LANG = (window.currentLang === 'en') ? {
    turnoTuo: 'Your turn — draw a line',
    turnoTuoBis: 'You closed a box: play again!',
    turnoPc: 'The computer is thinking...',
    vittoria: 'YOU WIN!',
    sconfitta: 'THE COMPUTER WINS',
    pareggio: 'A DRAW',
    statoVinta: 'You win!',
    statoPersa: 'The computer wins',
    statoPari: 'Nobody wins: a draw',
    tu: 'You',
    pc: 'Computer',
    caselle: 'Boxes',
    turno: 'Turn',
    resetChiedi: 'OK?',
    nuovoRecord: ' — BEST SCORE YET!',
    diffNames: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
    formatoNames: { piccolo: 'Small', medio: 'Medium', grande: 'Large', libero: 'Custom' },
    vinte: 'Won',
    giocate: 'Played',
    scarto: 'Best',
    riepilogo: function (tu, pc) {
        return QUAD_LANG.tu + ' ' + tu + ' — ' + QUAD_LANG.pc + ' ' + pc;
    },
    regalate: function (n) {
        return n === 1 ? '1 box given away' : n + ' boxes given away';
    }
} : {
    turnoTuo: 'Tocca a te — traccia un lato',
    turnoTuoBis: 'Hai chiuso una casella: giochi ancora!',
    turnoPc: 'Il computer sta pensando...',
    vittoria: 'HAI VINTO!',
    sconfitta: 'VINCE IL COMPUTER',
    pareggio: 'PAREGGIO',
    statoVinta: 'Hai vinto!',
    statoPersa: 'Vince il computer',
    statoPari: 'Nessuno vince: pareggio',
    tu: 'Tu',
    pc: 'Computer',
    caselle: 'Caselle',
    turno: 'Turno',
    resetChiedi: 'OK?',
    nuovoRecord: ' — MIGLIOR PUNTEGGIO!',
    diffNames: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
    formatoNames: { piccolo: 'Piccolo', medio: 'Medio', grande: 'Grande', libero: 'Libero' },
    vinte: 'Vinte',
    giocate: 'Giocate',
    scarto: 'Miglior',
    riepilogo: function (tu, pc) {
        return QUAD_LANG.tu + ' ' + tu + ' — ' + QUAD_LANG.pc + ' ' + pc;
    },
    regalate: function (n) {
        return n === 1 ? '1 casella regalata' : n + ' caselle regalate';
    }
};

// === CONFIGURAZIONE DEI FORMATI ===
// Righe e colonne sono i QUADRETTI, non i puntini: i puntini sono sempre uno in
// piu' per lato. Il passo NON e' scritto qui: lo calcola passoPerGriglia() dallo
// spazio disponibile, uguale per i formati fissi e per quello libero. Fissarlo a
// mano faceva quadretti piu' piccoli del necessario (il 5x5 stava a 92 quando
// ce ne stavano 109) e lasciava la griglia piccola in mezzo all'area vuota.
const QUAD_FORMATI = {
    piccolo: { righe: 5,  colonne: 5 },
    medio:   { righe: 8,  colonne: 8 },
    grande:  { righe: 11, colonne: 11 }
};

// Limiti del formato libero. Il minimo e' 3: sotto, la partita si decide alla
// prima mossa e non c'e' gioco. Il massimo e' 14 in larghezza e 12 in altezza,
// oltre i quali il passo scenderebbe sotto i 38px e i lati diventerebbero
// difficili da centrare col mouse.
const QUAD_LIBERO_MIN = 3;
const QUAD_LIBERO_MAX_COL = 14;
const QUAD_LIBERO_MAX_RIG = 12;

// Spazio a disposizione della griglia, in px sul campo 1024x750. Serve a
// calcolare il passo del formato libero: vedi passoPerGriglia().
const QUAD_AREA_W = 620;
const QUAD_AREA_H = 545;

// Passo massimo che fa stare una griglia rxc nell'area disponibile. I lati
// occupano (n) passi piu' il diametro di un puntino ai due estremi.
// Il minimo di 34 tiene i lati cliccabili col mouse sulle griglie grandi. Il
// massimo di 110 serve solo alle griglie minuscole del formato libero: un 3x3
// arriverebbe a 181 e farebbe quadretti sproporzionati rispetto al resto del
// campo. Per tutti gli altri formati e' l'area stessa a limitare il passo.
function passoPerGriglia(r, c) {
    const passo = Math.min(QUAD_AREA_W / c, QUAD_AREA_H / r);
    return Math.max(34, Math.min(110, Math.floor(passo)));
}

// === STATO GLOBALE ===
let righe = 5, colonne = 5, passo = 92;
let formato = 'piccolo';
let difficolta = 'facile';
// I lati sono due matrici distinte: orizzontali (righe+1) x colonne, verticali
// righe x (colonne+1). Ogni elemento vale 0 se libero, 1 se tracciato dal
// giocatore, 2 se dal computer.
let latiH = [];
let latiV = [];
// Proprietario di ogni quadretto: 0 = ancora aperto, 1 = giocatore, 2 = computer
let caselle = [];
let puntiTu = 0, puntiPc = 0;
let turno = 1;             // 1 = giocatore, 2 = computer
let partitaFinita = false;
let esito = 0;             // 1 = vinta, 2 = persa, 3 = pari
let pcSta = false;         // true mentre il computer sta muovendo: blocca i click
let ultimoLato = null;     // {tipo,r,c} dell'ultima mossa, per evidenziarla
let ultimaCasellaPc = null; // {r,c} ultima casella chiusa dal computer: gli fa
                            // percorrere la catena in ordine invece di saltare
                            // da un capo all'altro del tavolo (solo estetica)
let regalate = 0;          // caselle che il computer ha preso subito dopo una tua mossa
let records = {};          // { facile: { gioc, vinte, scarto }, ... }

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === UTILITA' SUI LATI E SULLE CASELLE ===
function totaleCaselle() { return righe * colonne; }

// I quattro lati di un quadretto, come riferimenti {tipo,r,c}
function latiDi(r, c) {
    return [
        { tipo: 'h', r: r,     c: c },   // sopra
        { tipo: 'h', r: r + 1, c: c },   // sotto
        { tipo: 'v', r: r,     c: c },   // sinistra
        { tipo: 'v', r: r,     c: c + 1 } // destra
    ];
}

function valoreLato(l) {
    return (l.tipo === 'h') ? latiH[l.r][l.c] : latiV[l.r][l.c];
}

function scriviLato(l, v) {
    if (l.tipo === 'h') latiH[l.r][l.c] = v; else latiV[l.r][l.c] = v;
}

// Quanti lati ha gia' un quadretto (0..4)
function latiChiusi(r, c) {
    let n = 0;
    const ls = latiDi(r, c);
    for (let i = 0; i < 4; i++) if (valoreLato(ls[i])) n++;
    return n;
}

// I quadretti toccati da un lato: uno se sta sul bordo, due altrimenti
function caselleDelLato(l) {
    const out = [];
    if (l.tipo === 'h') {
        if (l.r > 0) out.push({ r: l.r - 1, c: l.c });
        if (l.r < righe) out.push({ r: l.r, c: l.c });
    } else {
        if (l.c > 0) out.push({ r: l.r, c: l.c - 1 });
        if (l.c < colonne) out.push({ r: l.r, c: l.c });
    }
    return out;
}

// Tutti i lati ancora liberi
function latiLiberi() {
    const out = [];
    for (let r = 0; r <= righe; r++)
        for (let c = 0; c < colonne; c++)
            if (!latiH[r][c]) out.push({ tipo: 'h', r: r, c: c });
    for (let r = 0; r < righe; r++)
        for (let c = 0; c <= colonne; c++)
            if (!latiV[r][c]) out.push({ tipo: 'v', r: r, c: c });
    return out;
}

// === PARTITA ===
function nuovaPartita(fmt, diff, rLib, cLib) {
    formato = fmt;
    difficolta = diff;

    if (fmt === 'libero') {
        righe = Math.max(QUAD_LIBERO_MIN, Math.min(QUAD_LIBERO_MAX_RIG, rLib | 0));
        colonne = Math.max(QUAD_LIBERO_MIN, Math.min(QUAD_LIBERO_MAX_COL, cLib | 0));
    } else {
        const cfg = QUAD_FORMATI[fmt];
        righe = cfg.righe; colonne = cfg.colonne;
    }
    passo = passoPerGriglia(righe, colonne);

    latiH = [];
    for (let r = 0; r <= righe; r++) latiH.push(new Array(colonne).fill(0));
    latiV = [];
    for (let r = 0; r < righe; r++) latiV.push(new Array(colonne + 1).fill(0));
    caselle = [];
    for (let r = 0; r < righe; r++) caselle.push(new Array(colonne).fill(0));

    puntiTu = 0; puntiPc = 0;
    turno = 1;
    partitaFinita = false;
    esito = 0;
    pcSta = false;
    ultimoLato = null;
    ultimaCasellaPc = null;
    regalate = 0;

    costruisciGriglia();
    renderTutto();
    setMessaggio(QUAD_LANG.turnoTuo);
    salvaPartita();
}

// Traccia un lato e assegna le caselle eventualmente chiuse.
// Torna quante caselle ha chiuso: se > 0 chi ha mosso gioca ancora.
function tracciaLato(l, chi) {
    scriviLato(l, chi);
    ultimoLato = { tipo: l.tipo, r: l.r, c: l.c };

    let chiuse = 0;
    const tocca = caselleDelLato(l);
    for (let i = 0; i < tocca.length; i++) {
        const q = tocca[i];
        if (!caselle[q.r][q.c] && latiChiusi(q.r, q.c) === 4) {
            caselle[q.r][q.c] = chi;
            chiuse++;
            if (chi === 1) puntiTu++; else puntiPc++;
            // Da dove riparte il computer alla prossima chiusura: serve solo a
            // fargli percorrere la catena invece di saltare da una parte
            // all'altra (vedi chiusuraPiuVicina).
            if (chi === 2) ultimaCasellaPc = { r: q.r, c: q.c };
        }
    }
    return chiuse;
}

function tutteChiuse() {
    return (puntiTu + puntiPc) >= totaleCaselle();
}

// === COSTRUZIONE E RENDER DELLA GRIGLIA ===
// La griglia e' fatta di elementi assoluti dentro un contenitore dimensionato
// sul passo: puntini agli incroci, lati fra i puntini, caselle nei riquadri.
// I lati hanno un'area cliccabile piu' generosa del tratto disegnato (vedi il
// CSS): con passo 48 un tratto da 6px sarebbe difficile da centrare.
function costruisciGriglia() {
    const g = document.getElementById('griglia-quadrati');
    g.innerHTML = '';
    g.style.width = (colonne * passo) + 'px';
    g.style.height = (righe * passo) + 'px';
    // Il reticolo del foglio a quadretti (vedi CSS) va tenuto alla misura della
    // partita: un quadretto disegnato = una casella di gioco. Se restasse fisso
    // sembrerebbe una seconda griglia sovrapposta a quella dei punti.
    g.style.backgroundSize = passo + 'px ' + passo + 'px';

    // Caselle (sotto a tutto: sono lo sfondo che si colora)
    for (let r = 0; r < righe; r++) {
        for (let c = 0; c < colonne; c++) {
            const d = document.createElement('div');
            d.className = 'casella-quad';
            d.id = 'q-' + r + '-' + c;
            d.style.left = (c * passo) + 'px';
            d.style.top = (r * passo) + 'px';
            d.style.width = passo + 'px';
            d.style.height = passo + 'px';
            d.style.fontSize = Math.round(passo * 0.42) + 'px';
            g.appendChild(d);
        }
    }

    // Lati orizzontali
    for (let r = 0; r <= righe; r++) {
        for (let c = 0; c < colonne; c++) {
            const d = document.createElement('div');
            d.className = 'lato-quad lato-h';
            d.id = 'h-' + r + '-' + c;
            d.style.left = (c * passo) + 'px';
            d.style.top = (r * passo) + 'px';
            d.style.width = passo + 'px';
            agganciaLato(d, { tipo: 'h', r: r, c: c });
            g.appendChild(d);
        }
    }

    // Lati verticali
    for (let r = 0; r < righe; r++) {
        for (let c = 0; c <= colonne; c++) {
            const d = document.createElement('div');
            d.className = 'lato-quad lato-v';
            d.id = 'v-' + r + '-' + c;
            d.style.left = (c * passo) + 'px';
            d.style.top = (r * passo) + 'px';
            d.style.height = passo + 'px';
            agganciaLato(d, { tipo: 'v', r: r, c: c });
            g.appendChild(d);
        }
    }

    // Puntini sopra a tutto: sono il riferimento visivo della griglia
    for (let r = 0; r <= righe; r++) {
        for (let c = 0; c <= colonne; c++) {
            const d = document.createElement('div');
            d.className = 'puntino-quad';
            d.style.left = (c * passo) + 'px';
            d.style.top = (r * passo) + 'px';
            g.appendChild(d);
        }
    }
}

function agganciaLato(el, l) {
    el.addEventListener('click', function () { clickLato(l); });
}

function renderTutto() {
    for (let r = 0; r <= righe; r++)
        for (let c = 0; c < colonne; c++)
            renderLato({ tipo: 'h', r: r, c: c });
    for (let r = 0; r < righe; r++)
        for (let c = 0; c <= colonne; c++)
            renderLato({ tipo: 'v', r: r, c: c });
    for (let r = 0; r < righe; r++)
        for (let c = 0; c < colonne; c++)
            renderCasella(r, c);
    renderInfo();
}

function renderLato(l) {
    const el = document.getElementById(l.tipo + '-' + l.r + '-' + l.c);
    if (!el) return;
    const v = valoreLato(l);
    el.className = 'lato-quad lato-' + l.tipo +
        (v === 1 ? ' tuo' : v === 2 ? ' pc' : '') +
        (v ? ' tracciato' : '');
    // L'ultima mossa e' evidenziata: su una griglia grande, con il computer che
    // muove da solo, senza un segnale non si capisce dove sia intervenuto.
    if (ultimoLato && ultimoLato.tipo === l.tipo && ultimoLato.r === l.r && ultimoLato.c === l.c) {
        el.classList.add('ultimo');
    }
}

function renderCasella(r, c) {
    const el = document.getElementById('q-' + r + '-' + c);
    if (!el) return;
    const v = caselle[r][c];
    el.className = 'casella-quad' + (v === 1 ? ' tua' : v === 2 ? ' pc' : '');
    // L'iniziale dentro la casella, come sul foglio a quadretti. Non e' solo
    // decorazione: distingue i due giocatori anche a colori invertiti o per chi
    // non distingue bene il rosso dal blu.
    el.textContent = v ? (v === 1 ? QUAD_LANG.tu.charAt(0) : QUAD_LANG.pc.charAt(0)) : '';
}

function renderInfo() {
    document.getElementById('info-tu').textContent = puntiTu;
    document.getElementById('info-pc').textContent = puntiPc;
    document.getElementById('info-formato').textContent = etichettaFormato();

    // Di chi e' il turno, scritto e colorato: e' l'informazione che serve piu'
    // spesso ed e' la prima che si perde quando il computer incatena piu' mosse.
    const t = document.getElementById('info-turno');
    if (partitaFinita) {
        t.textContent = '—';
        t.className = 'info-valore';
    } else {
        t.textContent = (turno === 1) ? QUAD_LANG.tu : QUAD_LANG.pc;
        t.className = 'info-valore ' + (turno === 1 ? 'turno-tuo' : 'turno-pc');
    }

    // Il punteggio in testa si evidenzia: su una griglia grande contare le
    // caselle a occhio e' scomodo proprio quando la partita si fa tesa.
    document.getElementById('info-tu').className =
        'info-valore' + (puntiTu > puntiPc ? ' in-testa' : '');
    document.getElementById('info-pc').className =
        'info-valore' + (puntiPc > puntiTu ? ' in-testa' : '');
}

function etichettaFormato() {
    if (formato === 'libero') return righe + '×' + colonne;
    return QUAD_LANG.formatoNames[formato];
}

function setMessaggio(txt) {
    document.getElementById('messaggio-stato').innerHTML = txt;
}

// === INTERAZIONE ===
function clickLato(l) {
    if (partitaFinita || pcSta || turno !== 1) return;
    if (valoreLato(l)) return;

    // Quante caselle il computer potra' prendere subito dopo questa mossa: serve
    // solo alla statistica di fine partita, non cambia il gioco.
    const primaAperte = quanteRegalabili();

    const chiuse = tracciaLato(l, 1);
    riproduciAudio(chiuse ? 'audio/tris.mp3' : 'audio/carta.mp3');

    if (chiuse === 0) {
        const dopoAperte = quanteRegalabili();
        if (dopoAperte > primaAperte) regalate += (dopoAperte - primaAperte);
    }

    renderTutto();
    salvaPartita();

    if (tutteChiuse()) { finePartita(); return; }

    if (chiuse > 0) {
        setMessaggio(QUAD_LANG.turnoTuoBis);
        return;              // chi chiude jgioca ancora
    }

    turno = 2;
    renderInfo();
    avviaTurnoPc();
}

// Quante caselle sono a un lato dalla chiusura: e' quello che l'avversario di
// turno puo' incassare subito.
function quanteRegalabili() {
    let n = 0;
    for (let r = 0; r < righe; r++)
        for (let c = 0; c < colonne; c++)
            if (!caselle[r][c] && latiChiusi(r, c) === 3) n++;
    return n;
}

// === TURNO DEL COMPUTER ===
// Il computer muove con una pausa: una risposta istantanea rende difficile
// seguire cosa e' successo, soprattutto quando incatena molte chiusure.
function avviaTurnoPc() {
    if (partitaFinita) return;
    pcSta = true;
    setMessaggio(QUAD_LANG.turnoPc);
    setTimeout(mossaPc, 420);
}

function mossaPc() {
    if (partitaFinita) { pcSta = false; return; }

    const l = scegliMossaPc();
    if (!l) { pcSta = false; finePartita(); return; }

    const chiuse = tracciaLato(l, 2);
    riproduciAudio(chiuse ? 'audio/tris.mp3' : 'audio/carta.mp3');
    renderTutto();
    salvaPartita();

    if (tutteChiuse()) { pcSta = false; finePartita(); return; }

    if (chiuse > 0) {
        // Ha chiuso: rigioca, con la stessa pausa.
        setTimeout(mossaPc, 380);
        return;
    }

    pcSta = false;
    turno = 1;
    renderInfo();
    setMessaggio(QUAD_LANG.turnoTuo);
}

// === INTELLIGENZA DEL COMPUTER ===
// Tre livelli. Tutti e tre chiudono le caselle disponibili, perche' un computer
// che si dimentica di incassare non sembra facile, sembra rotto. La differenza
// sta in cosa fanno quando NON c'e' niente da chiudere.
function scegliMossaPc() {
    const liberi = latiLiberi();
    if (!liberi.length) return null;

    // 1. C'e' una casella da chiudere? Si chiude sempre.
    //    Al livello difficile con una riserva: vedi mossaDifficile().
    if (difficolta === 'difficile') return mossaDifficile(liberi);

    const chiude = liberi.filter(function (l) { return chiudeQualcosa(l); });
    if (chiude.length) return chiusuraPiuVicina(chiude);

    if (difficolta === 'facile') {
        // Sceglie a caso fra i lati che non regalano nulla; se sono tutti
        // regalabili, sceglie a caso e basta. Non ragiona sulle catene.
        const sicuri = liberi.filter(function (l) { return !regalaCasella(l); });
        const pool = sicuri.length ? sicuri : liberi;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Livello medio: evita di regalare finche' puo', ma quando e' costretto
    // sceglie il regalo piu' piccolo senza ragionare sulle conseguenze.
    return mossaMedia(liberi);
}

// Fra piu' lati che chiudono, quello piu' vicino all'ultima casella conquistata.
// E' una scelta puramente estetica e non tocca la forza del computer: le caselle
// che incassa sono comunque tutte quelle disponibili, cambia solo l'ORDINE in
// cui le prende. Prendendole a caso sembrava che saltasse da una parte all'altra
// del tavolo; percorrendo la catena come farebbe una mano umana si capisce cosa
// sta succedendo, che e' importante soprattutto quando ne chiude dieci di fila.
// La distanza e' quella di Chebyshev (il massimo fra dx e dy): con la diagonale
// che costa come un passo dritto, le caselle in diagonale contano come adiacenti
// e la sequenza non fa deviazioni innaturali agli angoli delle catene.
function chiusuraPiuVicina(chiude) {
    if (!ultimaCasellaPc || chiude.length === 1) return chiude[0];

    let migliore = chiude[0], minDist = Infinity;
    for (let i = 0; i < chiude.length; i++) {
        const tocca = caselleDelLato(chiude[i]);
        // Un lato puo' chiudere due caselle: vale la piu' vicina delle due.
        for (let j = 0; j < tocca.length; j++) {
            const q = tocca[j];
            if (caselle[q.r][q.c] || latiChiusi(q.r, q.c) !== 3) continue;
            const d = Math.max(Math.abs(q.r - ultimaCasellaPc.r),
                               Math.abs(q.c - ultimaCasellaPc.c));
            if (d < minDist) { minDist = d; migliore = chiude[i]; }
        }
    }
    return migliore;
}

// Il lato chiude almeno una casella?
function chiudeQualcosa(l) {
    const tocca = caselleDelLato(l);
    for (let i = 0; i < tocca.length; i++) {
        const q = tocca[i];
        if (!caselle[q.r][q.c] && latiChiusi(q.r, q.c) === 3) return true;
    }
    return false;
}

// Il lato porta una casella a tre lati, cioe' la offre all'avversario?
function regalaCasella(l) {
    const tocca = caselleDelLato(l);
    for (let i = 0; i < tocca.length; i++) {
        const q = tocca[i];
        if (!caselle[q.r][q.c] && latiChiusi(q.r, q.c) === 2) return true;
    }
    return false;
}

// LIVELLO MEDIO: fra i lati che regalano, prende quello che apre la catena piu'
// corta. E' il ragionamento naturale di chi gioca bene senza conoscere la
// teoria: "se devo dare qualcosa, do il meno possibile".
function mossaMedia(liberi) {
    const sicuri = liberi.filter(function (l) { return !regalaCasella(l); });
    if (sicuri.length) return sicuri[Math.floor(Math.random() * sicuri.length)];

    let migliore = null, minCosto = Infinity;
    for (let i = 0; i < liberi.length; i++) {
        const costo = costoDelRegalo(liberi[i]);
        if (costo < minCosto) { minCosto = costo; migliore = liberi[i]; }
    }
    return migliore || liberi[0];
}

// Quante caselle incassa l'avversario se gli si concede questo lato, supponendo
// che incassi tutto quello che puo' (senza le finezze del sacrificio).
function costoDelRegalo(l) {
    const salvaH = latiH.map(function (r) { return r.slice(); });
    const salvaV = latiV.map(function (r) { return r.slice(); });
    const salvaQ = caselle.map(function (r) { return r.slice(); });

    scriviLato(l, 2);
    let presa = 0, ancora = true;
    while (ancora) {
        ancora = false;
        for (let r = 0; r < righe && !ancora; r++) {
            for (let c = 0; c < colonne && !ancora; c++) {
                if (!caselle[r][c] && latiChiusi(r, c) === 3) {
                    const ls = latiDi(r, c);
                    for (let k = 0; k < 4; k++) if (!valoreLato(ls[k])) scriviLato(ls[k], 1);
                    caselle[r][c] = 1;
                    presa++;
                    ancora = true;
                }
            }
        }
    }

    latiH = salvaH; latiV = salvaV; caselle = salvaQ;
    return presa;
}

// LIVELLO DIFFICILE: teoria delle catene.
// Il punto del gioco non e' prendere le caselle, ma decidere CHI sara' costretto
// ad aprire la catena successiva. Chi apre per primo, di solito, le regala tutte.
// Due mosse fanno la differenza rispetto al livello medio:
//   1. il sacrificio (all-but-two): quando si incassa una catena lunga, si
//      lasciano indietro le ultime due caselle per costringere l'avversario ad
//      aprire quella dopo;
//   2. la scelta dell'apertura: quando si e' costretti ad aprire, si apre la
//      catena piu' corta.
function mossaDifficile(liberi) {
    // 1. Ci sono caselle da chiudere?
    const chiude = liberi.filter(function (l) { return chiudeQualcosa(l); });
    if (chiude.length) {
        const cat = catenaCorrente();
        // Sacrificio (all-but-two): invece di incassare anche le ultime due
        // caselle della catena, si traccia il lato che le separa. Si regalano
        // due punti, ma resta l'avversario a dover aprire la catena successiva
        // e a regalarla tutta.
        //
        // Il momento conta quanto la mossa: il sacrificio si offre SOLO quando
        // della catena restano esattamente 2 caselle. Farlo prima significa
        // regalare tutto il resto della catena, che e' il contrario di cio' che
        // serve. Quindi finche' la catena e' lunga si incassa normalmente, e la
        // decisione torna qui a ogni chiusura, con la catena via via piu' corta.
        //
        // E anche a 2 caselle non e' automatico: conviene solo se la catena che
        // l'avversario sara' costretto ad aprire vale piu' delle 2 caselle
        // regalate. A inizio partita non c'e' ancora nessuna catena formata, il
        // conto vale 0 e il sacrificio giustamente non si fa.
        if (cat && cat.lunghezza === 2 && cat.sacrificio && convieneSacrificare()) {
            return cat.sacrificio;
        }
        return chiusuraPiuVicina(chiude);
    }

    // 2. Nessuna casella da chiudere: si cerca un lato che non regali nulla.
    const sicuri = liberi.filter(function (l) { return !regalaCasella(l); });
    if (sicuri.length) {
        // Fra i lati sicuri conviene quello che lascia il conto delle catene
        // dalla parte giusta. Con poche catene si valuta davvero; se sono tante
        // il calcolo non paga e basta un lato sicuro qualsiasi.
        return miglioreLatoSicuro(sicuri);
    }

    // 3. Costretti ad aprire. Non basta guardare quanto costa il regalo di
    //    adesso: quello che decide il finale e' il saldo di tutto quello che
    //    resta. Aprire una catena da 3 puo' essere meglio che aprirne una da 2,
    //    se dopo quella da 2 tocca ancora a me aprire la successiva.
    //
    //    Il conto e' quello classico: regalo la catena che apro, poi i ruoli si
    //    invertono e sul resto del campo tocca all'avversario aprire per primo.
    //
    //    Il saldo completo costa caro (per ogni lato si simula tutto il seguito),
    //    e su una griglia grande, con molti lati ancora liberi, una singola mossa
    //    arrivava a diversi secondi: il gioco sembrava piantato. Ma il conto fine
    //    serve solo nel finale, quando le catene sono formate e le aperture sono
    //    poche; prima le alternative si equivalgono e basta il costo immediato.
    //    Sopra la soglia si usa quindi la valutazione economica, che da' lo
    //    stesso risultato in una frazione del tempo.
    const SOGLIA_SALDO = 40;   // lati candidati oltre i quali si passa al conto rapido

    // Si valutano solo i lati che aprono davvero: gli altri, se ci fossero, non
    // sarebbero finiti qui (a questo punto ogni mossa regala qualcosa).
    let migliore = null;
    if (liberi.length <= SOGLIA_SALDO) {
        let minSaldo = Infinity;
        for (let i = 0; i < liberi.length; i++) {
            const saldo = saldoDopoApertura(liberi[i]);
            if (saldo < minSaldo) { minSaldo = saldo; migliore = liberi[i]; }
        }
    } else {
        let minCosto = Infinity;
        for (let i = 0; i < liberi.length; i++) {
            const costo = costoDelRegalo(liberi[i]);
            if (costo < minCosto) { minCosto = costo; migliore = liberi[i]; }
        }
    }
    return migliore || liberi[0];
}

// Quanto mi costa, a saldo, aprire con questo lato: le caselle che l'avversario
// incassa subito, meno quelle che poi incassero' io quando tocchera' a lui
// aprire la catena successiva. Piu' e' basso, meglio e'.
function saldoDopoApertura(l) {
    const salvaH = latiH.map(function (r) { return r.slice(); });
    const salvaV = latiV.map(function (r) { return r.slice(); });
    const salvaQ = caselle.map(function (r) { return r.slice(); });

    scriviLato(l, 2);
    // L'avversario incassa la catena che gli ho aperto
    let suo = 0, ancora = true;
    while (ancora) {
        ancora = false;
        for (let r = 0; r < righe && !ancora; r++) {
            for (let c = 0; c < colonne && !ancora; c++) {
                if (!caselle[r][c] && latiChiusi(r, c) === 3) {
                    const ls = latiDi(r, c);
                    for (let k = 0; k < 4; k++) if (!valoreLato(ls[k])) scriviLato(ls[k], 1);
                    caselle[r][c] = 1;
                    suo++;
                    ancora = true;
                }
            }
        }
    }
    // Ora tocca a lui aprire: la prossima catena la incasso io. Vale quanto la
    // piu' corta ancora da aprire (e' quella che sceglierebbe un avversario che
    // ragiona come me).
    const mio = valoreProssimaCatena();

    latiH = salvaH; latiV = salvaV; caselle = salvaQ;
    return suo - mio;
}

// Descrive la catena di caselle che si sta incassando: quante ne sono in fila e
// qual e' il lato che, invece di chiudere tutto, ne lascia due all'avversario.
//
// La catena si percorre di casella in casella attraverso i lati ancora aperti.
// Attenzione al conteggio dei lati: la casella di partenza ne ha 3 (e' pronta),
// tutte quelle a valle ne hanno 2, perche' il lato che le collega alla
// precedente e' ancora da tracciare. Una casella con meno di 2 lati non fa parte
// della catena: e' terreno aperto, e li' la catena finisce.
function catenaCorrente() {
    // Casella pronta da chiudere: e' da li' che parte la catena.
    let start = null;
    for (let r = 0; r < righe && !start; r++)
        for (let c = 0; c < colonne && !start; c++)
            if (!caselle[r][c] && latiChiusi(r, c) === 3) start = { r: r, c: c };
    if (!start) return null;

    const visti = {};
    const percorso = [];      // le caselle della catena, in ordine
    const ponti = [];         // ponti[i] = lato fra percorso[i] e percorso[i+1]
    let cur = start;

    while (cur) {
        const k = cur.r + ',' + cur.c;
        if (visti[k]) break;              // anello: si e' tornati al punto di partenza
        visti[k] = true;
        percorso.push(cur);

        // Il lato aperto che porta alla prossima casella della catena. Si prende
        // il PRIMO che va bene e ci si ferma: cercandoli tutti, su una casella
        // con due uscite si terrebbe la seconda e si perderebbe il ramo giusto.
        const ls = latiDi(cur.r, cur.c);
        let prossima = null, latoPonte = null;
        for (let i = 0; i < 4 && !prossima; i++) {
            if (valoreLato(ls[i])) continue;
            const vicine = caselleDelLato(ls[i]);
            for (let j = 0; j < vicine.length && !prossima; j++) {
                const v = vicine[j];
                if (v.r === cur.r && v.c === cur.c) continue;
                if (caselle[v.r][v.c]) continue;
                if (visti[v.r + ',' + v.c]) continue;
                // Prosegue la catena se ha 2 lati chiusi (casella di corridoio)
                // oppure 3 (l'altra estremita' della catena, gia' pronta come la
                // casella di partenza). Con meno di 2 e' terreno aperto e la
                // catena finisce qui.
                const n = latiChiusi(v.r, v.c);
                if (n === 2 || n === 3) { prossima = v; latoPonte = ls[i]; }
            }
        }
        if (prossima) ponti.push(latoPonte);
        cur = prossima;
    }

    // Il sacrificio: invece di incassare anche le ultime due caselle, si traccia
    // il ponte che le separa. Cosi' l'avversario le prende (due sole) ma resta
    // lui a dover aprire la catena successiva, che di solito ne vale di piu'.
    // Serve il ponte fra le ULTIME due caselle del percorso: e' l'ultimo ponte
    // attraversato, e c'e' solo se la catena e' lunga almeno 2.
    const ultimoPonte = ponti.length ? ponti[ponti.length - 1] : null;

    return {
        lunghezza: percorso.length,
        sacrificio: (percorso.length >= 2 && ultimoPonte && !valoreLato(ultimoPonte)) ? ultimoPonte : null
    };
}

// Il sacrificio conviene? Si confrontano le due strade a conti fatti, invece di
// fidarsi di una regola a occhio come "la catena e' lunga, quindi sacrifico".
//
//   PRENDO TUTTO: incasso le caselle della catena, poi tocca ancora a me e non
//     ho piu' niente da chiudere: sono io a dover aprire la prossima catena e la
//     regalo tutta all'avversario.
//   SACRIFICO: gli lascio le ultime 2 caselle, ma poi tocca a lui aprire, e la
//     prossima catena la incasso io.
//
// La differenza fra le due e' quanto vale la catena successiva: se e' piu' lunga
// di 2, sacrificare conviene. A inizio partita non esiste ancora nessuna catena
// formata, il valore e' 0, e il conto dice giustamente di non sacrificare.
function convieneSacrificare() {
    // Guadagno del sacrificio: mi tengo la catena successiva invece di
    // regalarla, al prezzo delle 2 caselle che lascio adesso.
    return valoreProssimaCatena() > 2;
}

// Quanto vale la catena che qualcuno dovra' aprire dopo questa: si misura la
// piu' corta fra quelle ancora da aprire, perche' e' quella che verrebbe aperta
// per prima. Zero se non ce n'e' ancora nessuna formata.
function valoreProssimaCatena() {
    // Si simula: dopo aver incassato tutta la catena in corso, quante caselle
    // costerebbe l'apertura piu' economica rimasta? E' esattamente il conto che
    // gia' fa costoDelRegalo, applicato al tavolo ripulito dalla catena attuale.
    const salvaH = latiH.map(function (r) { return r.slice(); });
    const salvaV = latiV.map(function (r) { return r.slice(); });
    const salvaQ = caselle.map(function (r) { return r.slice(); });

    // Incasso per intero la catena in corso, cosi' resta solo il resto del campo
    let ancora = true;
    while (ancora) {
        ancora = false;
        for (let r = 0; r < righe && !ancora; r++) {
            for (let c = 0; c < colonne && !ancora; c++) {
                if (!caselle[r][c] && latiChiusi(r, c) === 3) {
                    const ls = latiDi(r, c);
                    for (let k = 0; k < 4; k++) if (!valoreLato(ls[k])) scriviLato(ls[k], 2);
                    caselle[r][c] = 2;
                    ancora = true;
                }
            }
        }
    }

    // Ora cerco quanto costa l'apertura piu' economica fra quelle che aprono
    // DAVVERO qualcosa. Vanno guardati solo i lati che regalano: gli altri
    // costano zero per definizione, e prendendo il minimo su tutti si otterrebbe
    // sempre zero finche' resta in giro una mossa neutra qualsiasi.
    // Zero come risultato ha allora il significato giusto: non c'e' ancora
    // nessuna catena formata da far aprire all'avversario.
    let minimo = 0;
    const liberi = latiLiberi();
    let trovata = false;
    for (let i = 0; i < liberi.length; i++) {
        if (!regalaCasella(liberi[i])) continue;
        const costo = costoDelRegalo(liberi[i]);
        if (!trovata || costo < minimo) { minimo = costo; trovata = true; }
    }
    if (!trovata) minimo = 0;

    latiH = salvaH; latiV = salvaV; caselle = salvaQ;
    return minimo;
}

// Fra i lati che non regalano nulla, preferisce quelli che portano una casella
// da 0 a 1 lato invece che da 1 a 2: e' il modo di consumare mosse neutre senza
// avvicinare il momento in cui si sara' costretti ad aprire.
function miglioreLatoSicuro(sicuri) {
    let migliore = null, minPeso = Infinity;
    for (let i = 0; i < sicuri.length; i++) {
        const l = sicuri[i];
        let peso = 0;
        const tocca = caselleDelLato(l);
        for (let j = 0; j < tocca.length; j++) {
            const q = tocca[j];
            if (!caselle[q.r][q.c]) peso += latiChiusi(q.r, q.c);
        }
        if (peso < minPeso) { minPeso = peso; migliore = l; }
    }
    return migliore || sicuri[0];
}

// === FINE PARTITA ===
function finePartita() {
    partitaFinita = true;
    pcSta = false;
    localStorage.removeItem('quadrati-save');

    esito = (puntiTu > puntiPc) ? 1 : (puntiPc > puntiTu) ? 2 : 3;
    renderInfo();

    setMessaggio(esito === 1 ? QUAD_LANG.statoVinta :
                 esito === 2 ? QUAD_LANG.statoPersa : QUAD_LANG.statoPari);
    riproduciAudio(esito === 1 ? 'audio/applausi.mp3' : 'audio/lacrimosa.mp3');

    const nuovoRecord = aggiornaRecords();
    setTimeout(function () { mostraFine(nuovoRecord); }, 700);
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('modale-fine').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
}

function apriModaleInizio(mostraRiprendi) {
    chiudiModali();
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
}

function mostraFine(nuovoRecord) {
    document.getElementById('fine-messaggio').innerHTML =
        esito === 1 ? QUAD_LANG.vittoria :
        esito === 2 ? QUAD_LANG.sconfitta : QUAD_LANG.pareggio;

    let dett = QUAD_LANG.riepilogo(puntiTu, puntiPc);
    if (regalate > 0) dett += '<br><span class="fine-nota">' + QUAD_LANG.regalate(regalate) + '</span>';
    if (nuovoRecord) dett += '<br>' + QUAD_LANG.nuovoRecord;
    document.getElementById('fine-dettagli').innerHTML = dett;

    const box = document.getElementById('modale-fine');
    box.className = 'form-quadrati modale-fine ' +
        (esito === 1 ? 'esito-vittoria' : esito === 2 ? 'esito-sconfitta' : 'esito-pari');
    document.getElementById('schermo').style.display = 'block';
    box.style.display = 'flex';
    if (typeof setupAmazonFinishBanner === 'function') {
        setupAmazonFinishBanner('modale-fine', {
            modalStyle: { overflow: 'visible' },
            targetTop: 420,
            applyModalTop: false,
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

// === SALVATAGGIO ===
// I lati si salvano come stringhe di cifre 0/1/2, una per lato: su una griglia
// 11x11 sono 264 lati, che in JSON come array sarebbero molto piu' pesanti.
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
        localStorage.removeItem('quadrati-save');
        return;
    }
    try {
        localStorage.setItem('quadrati-save', JSON.stringify({
            fmt: formato,
            diff: difficolta,
            rig: righe,
            col: colonne,
            h: matriceToStr(latiH),
            v: matriceToStr(latiV),
            q: matriceToStr(caselle),
            tu: puntiTu,
            pc: puntiPc,
            trn: turno,
            reg: regalate
        }));
    } catch (e) { /* storage pieno o disabilitato: si continua senza salvataggio */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('quadrati-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.h || !s.v || !s.q) return false;

        righe = s.rig | 0;
        colonne = s.col | 0;
        if (righe < QUAD_LIBERO_MIN || colonne < QUAD_LIBERO_MIN) return false;
        if (righe > QUAD_LIBERO_MAX_RIG || colonne > QUAD_LIBERO_MAX_COL) return false;

        formato = s.fmt || 'libero';
        difficolta = QUAD_LANG.diffNames[s.diff] ? s.diff : 'medio';
        passo = passoPerGriglia(righe, colonne);

        latiH = strToMatrice(s.h);
        latiV = strToMatrice(s.v);
        caselle = strToMatrice(s.q);
        // Le dimensioni devono corrispondere: un salvataggio di una versione con
        // formati diversi va scartato invece di produrre una griglia storta.
        if (latiH.length !== righe + 1 || latiV.length !== righe || caselle.length !== righe) return false;

        puntiTu = s.tu | 0;
        puntiPc = s.pc | 0;
        regalate = s.reg | 0;
        // Se era il turno del computer si riprende dal giocatore: il computer non
        // aveva ancora mosso e ripartire da lui, dopo un ricaricamento, farebbe
        // muovere due volte di fila senza che si capisca perche'.
        turno = 1;
        partitaFinita = false;
        esito = 0;
        pcSta = false;
        ultimoLato = null;
        ultimaCasellaPc = null;
        return true;
    } catch (e) {
        return false;
    }
}

function riprendiPartita() {
    chiudiModali();
    costruisciGriglia();
    renderTutto();
    setMessaggio(QUAD_LANG.turnoTuo);
}

// === RECORD (per livello di difficolta') ===
// Qui non c'e' un tempo da battere: il tempo dipende soprattutto da quanto ci
// mette l'avversario, e giocare in fretta e' il modo migliore per regalare
// caselle. Si tiene quindi il bilancio delle partite e il miglior scarto.
function caricaRecords() {
    try {
        records = JSON.parse(localStorage.getItem('quadrati-records') || '{}') || {};
    } catch (e) {
        records = {};
    }
}

function salvaRecords() {
    try {
        localStorage.setItem('quadrati-records', JSON.stringify(records));
    } catch (e) { /* storage non disponibile */ }
}

function aggiornaRecords() {
    const r = records[difficolta] || (records[difficolta] = { gioc: 0, vinte: 0, scarto: null });
    r.gioc = (r.gioc || 0) + 1;
    if (esito === 1) r.vinte = (r.vinte || 0) + 1;

    // Il miglior scarto si registra solo sulle vittorie: "miglior risultato" con
    // un numero negativo sarebbe una contraddizione.
    let nuovo = false;
    if (esito === 1) {
        const scarto = puntiTu - puntiPc;
        if (r.scarto === null || r.scarto === undefined || scarto > r.scarto) {
            r.scarto = scarto;
            nuovo = true;
        }
    }

    salvaRecords();
    renderRecord();
    return nuovo;
}

function renderRecord() {
    const r = records[difficolta] || {};
    document.getElementById('record-diff').textContent = QUAD_LANG.diffNames[difficolta];
    document.getElementById('record-vinte').textContent = (r.vinte || 0);
    document.getElementById('record-giocate').textContent = (r.gioc || 0);
    document.getElementById('record-scarto').textContent =
        (r.scarto === null || r.scarto === undefined) ? '--' : '+' + r.scarto;
}

// Azzeramento dei record con conferma, come negli altri giochi: il primo click
// chiede conferma, il secondo azzera. Senza conferma un click per sbaglio
// cancellerebbe lo storico di mesi.
let confermaReset = null;
function azzeraRecordSingolo(e) {
    const btn = e.currentTarget;
    if (confermaReset !== btn) {
        ripristinaBottoniReset();
        confermaReset = btn;
        btn.dataset.testo = btn.textContent;
        btn.textContent = QUAD_LANG.resetChiedi;
        btn.classList.add('conferma');
        setTimeout(function () {
            if (confermaReset === btn) ripristinaBottoniReset();
        }, 3000);
        return;
    }
    ripristinaBottoniReset();
    delete records[difficolta];
    salvaRecords();
    renderRecord();
}

function ripristinaBottoniReset() {
    document.querySelectorAll('.btn-reset-record').forEach(function (b) {
        if (b.dataset.testo) { b.textContent = b.dataset.testo; delete b.dataset.testo; }
        b.classList.remove('conferma');
    });
    confermaReset = null;
}

// === SCELTE DEL MODALE DI AVVIO ===
// I default valgono solo alla prima visita: chi ha gia' giocato ritrova le sue
// ultime scelte (vedi caricaPreferenze()). Il livello parte da 'facile' perche'
// gia' il medio non regala mai niente finche' puo', ed e' un avversario duro per
// chi il gioco delle catene non lo conosce.
let tempFormato = 'piccolo';
let tempDifficolta = 'facile';
let tempRighe = 0, tempColonne = 0;   // 0 = usa i valori scritti nell'HTML

// Le preferenze del modale stanno in una chiave a parte: 'quadrati-save' e' la
// partita in corso e viene cancellata a fine partita, quindi non puo' ricordare
// le scelte da una partita all'altra.
function caricaPreferenze() {
    try {
        const p = JSON.parse(localStorage.getItem('quadrati-pref') || '{}') || {};
        if (QUAD_LANG.diffNames[p.diff]) tempDifficolta = p.diff;
        if (p.fmt === 'libero' || QUAD_FORMATI[p.fmt]) tempFormato = p.fmt;
        if (p.rig) tempRighe = p.rig | 0;
        if (p.col) tempColonne = p.col | 0;
    } catch (e) { /* preferenze illeggibili: restano i default */ }
}

function salvaPreferenze() {
    try {
        localStorage.setItem('quadrati-pref', JSON.stringify({
            fmt: tempFormato,
            diff: tempDifficolta,
            rig: parseInt(document.getElementById('sel-righe').value, 10) || 0,
            col: parseInt(document.getElementById('sel-colonne').value, 10) || 0
        }));
    } catch (e) { /* storage pieno o negato: si gioca lo stesso */ }
}

function selezionaFormato(f) {
    tempFormato = f;
    document.querySelectorAll('[id^="btn-fmt-"]').forEach(function (b) {
        b.classList.toggle('attiva', b.id === 'btn-fmt-' + f);
    });
    // I due selettori righe/colonne servono solo al formato libero: mostrarli
    // sempre farebbe credere che valgano anche per i tre formati fissi.
    document.getElementById('opzione-libero').style.display = (f === 'libero') ? 'block' : 'none';
    aggiornaAnteprimaLibero();
}

function selezionaDifficolta(d) {
    tempDifficolta = d;
    document.querySelectorAll('[id^="btn-diff-"]').forEach(function (b) {
        b.classList.toggle('attiva', b.id === 'btn-diff-' + d);
    });
}

// Quante caselle vengono fuori dalla scelta corrente: si vede prima di iniziare
// che una 12x14 e' una partita molto lunga.
function aggiornaAnteprimaLibero() {
    const r = parseInt(document.getElementById('sel-righe').value, 10);
    const c = parseInt(document.getElementById('sel-colonne').value, 10);
    const el = document.getElementById('libero-totale');
    if (el) el.textContent = (r * c);
}

function confermaEAvviaPartita() {
    chiudiModali();
    salvaPreferenze();
    const r = parseInt(document.getElementById('sel-righe').value, 10);
    const c = parseInt(document.getElementById('sel-colonne').value, 10);
    nuovaPartita(tempFormato, tempDifficolta, r, c);
}

// === AVVIO ===
function init() {
    caricaRecords();

    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);

    document.querySelectorAll('.btn-reset-record').forEach(function (b) {
        b.addEventListener('click', azzeraRecordSingolo);
    });

    document.getElementById('sel-righe').addEventListener('change', aggiornaAnteprimaLibero);
    document.getElementById('sel-colonne').addEventListener('change', aggiornaAnteprimaLibero);

    // NUOVA PARTITA a partita in corso chiede conferma: un click per sbaglio
    // butterebbe via una partita lunga.
    document.getElementById('btn-nuova-partita').addEventListener('click', function () {
        if (partitaFinita || (puntiTu + puntiPc === 0 && !ultimoLato)) {
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
    });
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        chiudiModali();
        localStorage.removeItem('quadrati-save');
        apriModaleInizio(false);
    });

    const ripresa = caricaPartita();
    if (ripresa) {
        costruisciGriglia();
        renderTutto();
    }
    renderRecord();
    // Le preferenze si leggono dopo caricaPartita(), che tocca solo lo stato
    // della partita: qui si decide solo cosa mostrare preselezionato nel modale.
    caricaPreferenze();
    if (tempRighe) document.getElementById('sel-righe').value = tempRighe;
    if (tempColonne) document.getElementById('sel-colonne').value = tempColonne;
    selezionaFormato(tempFormato);
    selezionaDifficolta(tempDifficolta);
    apriModaleInizio(ripresa);

    // Riquadro affiliati sotto NUOVA PARTITA. Parte da init() e non dal load
    // perche' init() gira dopo la chiusura dell'interstitial: ruotare mentre
    // l'overlay copre la pagina conterebbe impression mai viste.
    // Non e' AdSense, quindi la rotazione automatica e' legittima.
    if (typeof setupRotatingAffiliateBanner === 'function') {
        const boxAff = document.getElementById('banner-rotante');
        if (boxAff) setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
    }
}

// waitForInterstitial e' fornito da game-layout.js: se e' dovuto un interstitial
// lo mostra e poi chiama init(), altrimenti chiama init() subito.
window.addEventListener('load', function () {
    if (typeof window.waitForInterstitial === 'function') window.waitForInterstitial(init);
    else init();
});
