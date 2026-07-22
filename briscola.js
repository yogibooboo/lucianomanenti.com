/* ============================================================================
   BRISCOLA - Logica di Gioco (JavaScript)
   Briscola classica a 2 giocatori o a 4 (2 contro 2 a coppie): 3 carte a testa,
   briscola scoperta sotto il mazzo, pesca dopo ogni presa, 120 punti in palio.
   AI con euristiche di squadra, conteggio carte e finale calcolato (Difficile).
   Stile e struttura coerenti con gli altri giochi del sito (Scopa, Dama).
   ============================================================================ */

window.scriptVersion = '1.26';

// === TESTI MULTILINGUA ===
const BRISCOLA_LANG = (window.currentLang === 'en') ? {
    tuoTurno: 'Your turn — play a card',
    inizioTu: 'You lead the first trick',
    inizioAltro: function (nome) { return nome + ' leads the first trick'; },
    presaDi: function (nome, punti) { return nome + ' takes the trick' + (punti > 0 ? ' (' + punti + ' points)' : ''); },
    presaTua: function (punti) { return 'You take the trick' + (punti > 0 ? ' (' + punti + ' points)' : ''); },
    vittoria: 'YOU WIN!<br>Congratulations!',
    vittoriaCoppia: 'YOUR TEAM WINS!<br>Congratulations!',
    sconfitta: 'YOU LOSE!<br>Better luck next time',
    sconfittaCoppia: 'YOUR TEAM LOSES!<br>Better luck next time',
    patta: 'DRAW — 60 to 60!',
    riepilogo: function (diff, mie, sue) {
        return BRISCOLA_LANG.diffNames[diff] + ' — ' + (window._modalita4 ? 'Us' : 'You') + ': ' + mie + ' — ' + (window._modalita4 ? 'Them' : 'PC') + ': ' + sue;
    },
    resetChiedi: 'OK?',
    tu: 'You', pc: 'PC', noi: 'Us', loro: 'Them',
    diffNames: { facile: 'Beginner', medio: 'Medium', difficile: 'Expert' },
    mossaAnnullata: 'Move undone — your turn again',
    clicPerContinuare: 'Click anywhere to continue',
    mazzo: { francesi: 'Deck: French', napoletane: 'Deck: Neapolitan', bresciane: 'Deck: Brescian' }
} : {
    tuoTurno: 'Tocca a te — gioca una carta',
    inizioTu: 'Apri tu la prima presa',
    inizioAltro: function (nome) { return 'Apre ' + nome + ' la prima presa'; },
    presaDi: function (nome, punti) { return 'Presa di ' + nome + (punti > 0 ? ' (' + punti + ' punti)' : ''); },
    presaTua: function (punti) { return 'Presa tua' + (punti > 0 ? ' (' + punti + ' punti)' : ''); },
    vittoria: 'HAI VINTO!<br>Complimenti!',
    vittoriaCoppia: 'LA TUA COPPIA VINCE!<br>Complimenti!',
    sconfitta: 'HAI PERSO!<br>Andrà meglio la prossima volta',
    sconfittaCoppia: 'LA TUA COPPIA PERDE!<br>Andrà meglio la prossima volta',
    patta: 'PATTA — 60 a 60!',
    riepilogo: function (diff, mie, sue) {
        return BRISCOLA_LANG.diffNames[diff] + ' — ' + (window._modalita4 ? 'Noi' : 'Tu') + ': ' + mie + ' — ' + (window._modalita4 ? 'Loro' : 'PC') + ': ' + sue;
    },
    resetChiedi: 'OK?',
    tu: 'Tu', pc: 'PC', noi: 'Noi', loro: 'Loro',
    diffNames: { facile: 'Principiante', medio: 'Medio', difficile: 'Esperto' },
    mossaAnnullata: 'Mossa annullata — di nuovo il tuo turno',
    clicPerContinuare: 'Clicca per continuare',
    mazzo: { francesi: 'Mazzo: Francesi', napoletane: 'Mazzo: Napoletane', bresciane: 'Mazzo: Bresciane' }
};

// === COSTANTI DI GIOCO ===
// Forza delle carte nella presa (Asso > 3 > Re > Cavallo > Fante > 7..2)
const FORZA = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
// Punti delle carte (totale 120)
const PUNTI_CARTA = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 };
const SEMI = ['F', 'Q', 'C', 'P'];
const VALORI_SEMI = { F: 0, Q: 1, C: 2, P: 3 };

function puntiDi(c) { return PUNTI_CARTA[c.number] || 0; }

// === CLASSE CARTA (sprite condivisi con la Scopa) ===
class Carta {
    constructor(suit, number) {
        this.suit = suit;     // 'F', 'Q', 'C', 'P'
        this.number = number; // 1-7, 8=Fante/J, 9=Cavallo/Q, 10=Re/K
        this.id = number + '_' + suit;
    }

    getSpritePosition() {
        const tema = localStorage.getItem('briscola-deck-theme') || 'napoletane';
        const scala = (tema === 'bresciane') ? 1.2 : 1;
        const stepX = -88.75 * scala;
        const stepY = -120 * scala;

        let col = 0;
        if (this.number <= 7) {
            col = this.number - 1;
        } else {
            // 8=Fante, 9=Cavallo, 10=Re: colonne 10-12 in tutti i fogli sprite.
            // Anche nel bresciano, dove le colonne 7-9 sono l'8/9/10 numerici
            // che esistono solo nella Scopa bresciana a 52 carte
            col = this.number + 2;
        }

        const row = VALORI_SEMI[this.suit];
        let posX = stepX * col;
        let posY = stepY * row;
        if (tema === 'bresciane') posX -= 14.375 * scala;
        return { x: posX, y: posY };
    }
}

// === STATO GLOBALE ===
let modalita = 2;             // 2 o 4 giocatori
let difficolta = 'facile';
let mazzo = [];               // carte ancora da pescare
let briscolaCarta = null;     // la carta scoperta sotto il mazzo (null dopo la pesca)
let semeBriscola = null;
let mani = [];                // mani dei giocatori (0 = tu; 4p: 1 sx, 2 compagno, 3 dx)
let punti = [0, 0];           // punti delle due squadre (g % 2)
let carteVinte = [0, 0];      // numero di carte prese per squadra (solo informativo)
let tavolo = [];              // presa corrente: [{ g, carta }]
let turno = 0;
let primoDiMano = 0;
let visteIds = {};            // id delle carte già giocate (per il conteggio dell'AI)
let partitaFinita = false;
let animando = false;         // blocca l'input durante le animazioni
let stats = {};
let nomiGiocatori = [];       // [{nome, avatar}] per posto
let undoStack = [];           // storia degli snapshot salvati a inizio di ogni turno del giocatore
let maniScoperte = false;     // mostra le carte degli avversari (pratica/debug)
let segnaliAttivi = false;    // opzione di partita: indicatori fissi di briscole/carichi del compagno
let presaInAttesaClick = false; // tavolo pieno, in pausa: un click sul campo fa proseguire alla presa successiva

// Valori delle 5 briscole segnalabili, in ordine di forza decrescente (Asso -> Fante)
const VALORI_SEGNALE = [1, 3, 10, 9, 8];

// Sintesi della mano di g: quali delle 5 briscole principali possiede e quanti carichi (Assi/3 non di briscola)
function sintesiSegnale(g) {
    const mano = mani[g] || [];
    const briscole = {};
    VALORI_SEGNALE.forEach(function (v) { briscole[v] = false; });
    let carichi = 0;
    let haBriscola = false;
    mano.forEach(function (c) {
        if (c.suit === semeBriscola) {
            haBriscola = true;
            if (briscole.hasOwnProperty(c.number)) briscole[c.number] = true;
        } else if (c.number === 1 || c.number === 3) {
            carichi++;
        }
    });
    return { briscole: briscole, carichi: carichi, nessunaBriscola: !haBriscola };
}

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === AVVERSARI (avatar condivisi con la Scopa) ===
const AVATAR_POOL = [
    { nome: 'Anna', avatar: 'images/avatar/Anna.jpg' },
    { nome: 'Antonio', avatar: 'images/avatar/Antonio.jpg' },
    { nome: 'Carla', avatar: 'images/avatar/Carla.jpg' },
    { nome: 'Francesca', avatar: 'images/avatar/Francesca.jpg' },
    { nome: 'Giuseppe', avatar: 'images/avatar/Giuseppe.jpg' },
    { nome: 'Lucia', avatar: 'images/avatar/Lucia.jpg' },
    { nome: 'Marco', avatar: 'images/avatar/Marco.jpg' },
    { nome: 'Maria', avatar: 'images/avatar/Maria.jpg' },
    { nome: 'Paolo', avatar: 'images/avatar/Paolo.jpg' },
    { nome: 'Rocco', avatar: 'images/avatar/Rocco.jpg' },
    { nome: 'Sergio', avatar: 'images/avatar/Sergio.jpg' },
    { nome: 'Teresa', avatar: 'images/avatar/Teresa.jpg' }
];

function scegliNomi() {
    const pool = AVATAR_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const tu = { nome: BRISCOLA_LANG.tu, avatar: 'favicon/apple-touch-icon.png' };
    nomiGiocatori = modalita === 2 ? [tu, pool[0]] : [tu, pool[0], pool[1], pool[2]];
}

// === UTILITÀ DI GIOCO ===
function squadraDi(g) { return g % 2; }

function creaMazzo() {
    const m = [];
    for (const s of SEMI) for (let n = 1; n <= 10; n++) m.push(new Carta(s, n));
    for (let i = m.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
}

// La carta a batte la carta b (b è quella attualmente vincente)?
function batte(a, b) {
    if (a.suit === b.suit) return FORZA[a.number] > FORZA[b.number];
    return a.suit === semeBriscola;
}

// Indice (nel tavolo) della carta attualmente vincente
function idxVincente() {
    let best = 0;
    for (let k = 1; k < tavolo.length; k++) {
        if (batte(tavolo[k].carta, tavolo[best].carta)) best = k;
    }
    return best;
}

function puntiTavolo() {
    return tavolo.reduce(function (s, t) { return s + puntiDi(t.carta); }, 0);
}

// === INTELLIGENZA ARTIFICIALE ===
// Ordina per "sacrificabilità": prima i lisci non briscola, poi briscole basse,
// per ultimi i carichi; a parità decide la forza
function ordinaPerScarto(carte) {
    return carte.slice().sort(function (a, b) {
        const pa = puntiDi(a), pb = puntiDi(b);
        if (pa !== pb) return pa - pb;
        const ba = a.suit === semeBriscola ? 1 : 0, bb = b.suit === semeBriscola ? 1 : 0;
        if (ba !== bb) return ba - bb;
        return FORZA[a.number] - FORZA[b.number];
    });
}

// Conteggio carte (per il livello Difficile): carte non ancora viste da g
function carteFuori(g) {
    const fuori = [];
    for (const s of SEMI) {
        for (let n = 1; n <= 10; n++) {
            const id = n + '_' + s;
            if (visteIds[id]) continue;
            if (mani[g].some(function (c) { return c.id === id; })) continue;
            if (briscolaCarta && briscolaCarta.id === id) continue;
            if (tavolo.some(function (t) { return t.carta.id === id; })) continue;
            fuori.push({ suit: s, number: n });
        }
    }
    return fuori;
}

// Pressione di mano: punti che tengo in mano rapportati alle prese rimanenti.
// Una mano ingolfata di carichi verso il finale è una passività (andranno
// giocati per forza, spesso a condizioni pessime): pressione alta abbassa
// l'asticella per monetizzare subito. I punti di briscola pesano metà perché
// asso e 3 di briscola si difendono da soli
function pressioneMano(g) {
    let pts = 0;
    for (const c of mani[g]) pts += (c.suit === semeBriscola) ? puntiDi(c) * 0.5 : puntiDi(c);
    const prese = mani[g].length + Math.floor((mazzo.length + (briscolaCarta ? 1 : 0)) / modalita);
    return prese > 0 ? pts / prese : 0;
}

// La carta è la più forte rimasta del suo seme e non ci sono più briscole in giro?
function vincenteSicura(g, c) {
    const fuori = carteFuori(g);
    if (c.suit !== semeBriscola && fuori.some(function (f) { return f.suit === semeBriscola; })) return false;
    return !fuori.some(function (f) { return f.suit === c.suit && FORZA[f.number] > FORZA[c.number]; });
}

// Sintesi dei segnali del compagno di squadra, se l'opzione è attiva (solo 2 vs 2).
// L'AI vede esattamente ciò che mostra la griglia dei segnali: le 5 briscole
// principali e il numero di carichi, niente di più
function segnaleCompagno(g) {
    if (!segnaliAttivi || modalita !== 4) return null;
    return sintesiSegnale((g + 2) % 4);
}

// Scarto "intelligente": normalmente la carta più sacrificabile, ma non butta
// una briscola dominante (nessuna superiore in giro) per risparmiare i pochi
// punti di un fante, cavallo o re: verso il finale quella briscola vale una
// presa ricca garantita
function scartoAI(g) {
    const mano = mani[g];
    const scarto = ordinaPerScarto(mano)[0];
    if (difficolta === 'facile') return scarto;
    if (scarto.suit !== semeBriscola) return scarto;
    if (!vincenteSicura(g, scarto)) return scarto;
    let puntiFuori = 0;
    for (const f of carteFuori(g)) puntiFuori += puntiDi(f);
    if (briscolaCarta) puntiFuori += puntiDi(briscolaCarta);
    if (puntiFuori < 10) return scarto;
    const alternative = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) <= 4; });
    if (alternative.length) return ordinaPerScarto(alternative)[0];
    return scarto;
}

// Da ultimo di mano con presa certa ma la sola vincente è un carico di briscola
// (asso o 3): vale la pena spenderlo? Confronta il guadagno immediato con il
// valore atteso futuro della briscola, considerando le briscole superiori ancora
// in giro, i punti ancora in palio, quante prese mancano e dove sta il bottino
function convieneBriscolaCaraDaUltimo(g, carta, ptTavolo) {
    const sq = squadraDi(g);

    // La presa chiude la partita a nostro favore, o lasciarla regala il 61: prendo
    if (punti[sq] + ptTavolo + puntiDi(carta) > 60) return true;
    if (punti[1 - sq] + ptTavolo > 60) return true;
    // Presa ricca: vale sempre la spesa
    if (ptTavolo >= 10) return true;

    const fuori = carteFuori(g);
    // La mia briscola è ancora battibile? (conto anche la scoperta, che finirà in una mano)
    const battibile = fuori.some(function (f) { return f.suit === semeBriscola && FORZA[f.number] > FORZA[carta.number]; }) ||
        (briscolaCarta !== null && FORZA[briscolaCarta.number] > FORZA[carta.number]);

    // Punti ancora in palio (mani altrui + mazzo + briscola scoperta)
    let puntiFuori = 0;
    for (const f of fuori) puntiFuori += puntiDi(f);
    if (briscolaCarta) puntiFuori += puntiDi(briscolaCarta);

    // Prese rimanenti dopo questa
    const prese = (mani[g].length - 1) + Math.floor((mazzo.length + (briscolaCarta ? 1 : 0)) / modalita);

    // Finale scarno: poco da catturare o quasi finita, monetizzo ora
    if (prese <= 1 || puntiFuori <= 10) return true;

    // Battibile col mazzo agli sgoccioli: la metto al sicuro incassando
    if (battibile && mazzo.length + (briscolaCarta ? 1 : 0) <= modalita) return true;

    // Quota del bottino presumibilmente già nelle mani (subito catturabile)
    let carteAltrui = 0;
    for (let x = 0; x < modalita; x++) if (x !== g) carteAltrui += mani[x].length;
    const quotaInMano = fuori.length > 0 ? carteAltrui / fuori.length : 0;

    // Valore atteso di una presa futura fatta con questa briscola: se è dominante
    // potrò scegliermi la presa migliore, se è battibile dovrò accontentarmi
    const orizzonte = Math.min(1, prese / 4);
    const atteso = (battibile ? 0.15 : 0.25) * puntiFuori * (0.5 + 0.5 * quotaInMano) * orizzonte;
    // Incassare subito ha un premio di sicurezza se la briscola è battibile,
    // più la pressione di mano: coi punti che si accumulano e le prese che
    // scarseggiano, il valore dell'incasso certo cresce
    const bonusIncasso = (battibile ? 3 : 0) + pressioneMano(g);

    return ptTavolo + bonusIncasso >= atteso;
}

// Apertura della presa
function aperturaAI(g) {
    const mano = mani[g];
    // Difficile: se ho una vincente sicura con punti, incasso
    if (difficolta === 'difficile') {
        const sicure = mano.filter(function (c) { return puntiDi(c) > 0 && vincenteSicura(g, c); });
        if (sicure.length) return ordinaPerScarto(sicure)[sicure.length - 1];
    }
    // Segnali: il compagno ha l'asso di briscola (presa imbattibile),
    // gli apro con il mio carico migliore perché lo incassi lui
    const seg = segnaleCompagno(g);
    if (seg && seg.briscole[1]) {
        const carichi = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) > 0; });
        if (carichi.length) return ordinaPerScarto(carichi)[carichi.length - 1];
    }
    return ordinaPerScarto(mano)[0];
}

// Finale calcolato (solo 1vs1 Difficile, a mazzo esaurito le mani sono note)
function finaleEsatto(mia, sua, tavoloIniz, toccaAme) {
    // Ritorna il miglior differenziale di punti (miei - suoi) ottenibile
    function gioca(m, s, tav, tocca) {
        if (m.length === 0 && s.length === 0) return { diff: 0, carta: null };
        const attive = tocca === 0 ? m : s;
        let best = null;
        for (let i = 0; i < attive.length; i++) {
            const c = attive[i];
            const nuovoTav = tav.concat([{ g: tocca, carta: c }]);
            let esito;
            if (nuovoTav.length === 2) {
                const vince = batte(nuovoTav[1].carta, nuovoTav[0].carta) ? nuovoTav[1].g : nuovoTav[0].g;
                const pt = puntiDi(nuovoTav[0].carta) + puntiDi(nuovoTav[1].carta);
                const m2 = tocca === 0 ? m.filter(function (x) { return x !== c; }) : m;
                const s2 = tocca === 1 ? s.filter(function (x) { return x !== c; }) : s;
                const seguito = gioca(m2, s2, [], vince);
                esito = (vince === 0 ? pt : -pt) + seguito.diff;
            } else {
                const m2 = tocca === 0 ? m.filter(function (x) { return x !== c; }) : m;
                const s2 = tocca === 1 ? s.filter(function (x) { return x !== c; }) : s;
                const seguito = gioca(m2, s2, nuovoTav, 1 - tocca);
                esito = seguito.diff;
            }
            if (best === null || (tocca === 0 ? esito > best.diff : esito < best.diff)) {
                best = { diff: esito, carta: c };
            }
        }
        return best;
    }
    return gioca(mia, sua, tavoloIniz, toccaAme ? 0 : 1);
}

function scegliCartaAI(g) {
    const mano = mani[g];
    if (mano.length === 1) return mano[0];

    // Facile: una volta su tre gioca a caso
    if (difficolta === 'facile' && Math.random() < 0.35) {
        return mano[Math.floor(Math.random() * mano.length)];
    }

    // Finale perfetto: 1vs1 Difficile a mazzo esaurito (la mano avversaria è deducibile)
    if (difficolta === 'difficile' && modalita === 2 && mazzo.length === 0 && !briscolaCarta) {
        const avv = 1 - g;
        const manoAvv = mani[avv].slice();
        const tavAI = tavolo.map(function (t) { return { g: t.g === g ? 0 : 1, carta: t.carta }; });
        const esito = finaleEsatto(mano.slice(), manoAvv, tavAI, true);
        if (esito && esito.carta) return esito.carta;
    }

    if (tavolo.length === 0) return aperturaAI(g);

    const iv = idxVincente();
    const gv = tavolo[iv].g;
    const cartaVincente = tavolo[iv].carta;
    const ultimo = tavolo.length === modalita - 1;
    const ptTavolo = puntiTavolo();
    const compagnoVince = modalita === 4 && squadraDi(gv) === squadraDi(g);

    if (compagnoVince) {
        const pressione = pressioneMano(g);
        // Il compagno sta vincendo: se la sua presa è solida, carico punti.
        // A pressione alta considero solida anche una presa con briscola bassa:
        // meglio caricare ora che regalare i carichi nelle ultime prese
        const solida = ultimo ||
            (cartaVincente.suit === semeBriscola && FORZA[cartaVincente.number] >= 7) ||
            (difficolta === 'difficile' && vincenteSicura(g, cartaVincente)) ||
            (difficolta !== 'facile' && pressione >= 3 && cartaVincente.suit === semeBriscola);
        if (solida) {
            const carichi = mano.filter(function (c) { return puntiDi(c) > 0 && c.suit !== semeBriscola; });
            if (carichi.length) return ordinaPerScarto(carichi)[carichi.length - 1];
        }
        // Segnali: presa del compagno ricca ma non solida e ho l'asso di briscola:
        // la metto in sicurezza io (col segnale dell'asso il compagno mi ha
        // probabilmente aperto un carico proprio per questo)
        if (segnaliAttivi && !solida && ptTavolo >= 10) {
            const asso = mano.find(function (c) { return c.suit === semeBriscola && c.number === 1; });
            if (asso) return asso;
        }
        // Ho una carta con punti nel seme di apertura che rafforza la presa
        // debole del compagno: la gioco quando dopo di me parla un solo
        // avversario (se taglia, spende una briscola per pochi punti: costo
        // anche per lui) oppure quando la pressione di mano è alta
        if (difficolta !== 'facile' && (pressione >= 3 || tavolo.length === modalita - 2)) {
            const semeApertura = tavolo[0].carta.suit;
            const rinforzi = mano.filter(function (c) {
                return c.suit === semeApertura && c.suit !== semeBriscola &&
                    puntiDi(c) > 0 && batte(c, cartaVincente);
            });
            if (rinforzi.length) {
                return rinforzi.sort(function (a, b) { return puntiDi(b) - puntiDi(a); })[0];
            }
        }
        return scartoAI(g);
    }

    // Un avversario sta vincendo: valuto se prendere
    const vincenti = mano.filter(function (c) { return batte(c, cartaVincente); });
    const soglia = difficolta === 'facile' ? 6 : 3;
    const conviene = vincenti.length > 0 && (ptTavolo >= soglia || (ultimo && ptTavolo > 0));

    if (conviene) {
        if (ultimo) {
            // Ultimo a giocare: presa certa, uso la vincente che rende di più
            const nonBris = vincenti.filter(function (c) { return c.suit !== semeBriscola; });
            if (nonBris.length) {
                return nonBris.sort(function (a, b) { return puntiDi(b) - puntiDi(a) || FORZA[b.number] - FORZA[a.number]; })[0];
            }
            // Solo briscole: la minima che vince, ma con molti punti in palio anche un carico di briscola va bene
            const ordinate = vincenti.sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; });
            if (ptTavolo >= 10) {
                const conPunti = ordinate.filter(function (c) { return puntiDi(c) > 0; });
                if (conPunti.length && difficolta !== 'facile') return conPunti[conPunti.length - 1];
            }
            // La minima vincente è un carico di briscola (asso o 3): valuto se la
            // presa vale davvero la spesa, altrimenti lascio andare
            if (difficolta !== 'facile' && puntiDi(ordinate[0]) >= 10 &&
                !convieneBriscolaCaraDaUltimo(g, ordinate[0], ptTavolo)) {
                return scartoAI(g);
            }
            return ordinate[0];
        }
        // Non ultimo: rischio surtaglio, uso la vincente più economica (mai carichi se evitabile)
        const economiche = vincenti.slice().sort(function (a, b) {
            return puntiDi(a) - puntiDi(b) || FORZA[a.number] - FORZA[b.number];
        });
        const scelta = economiche[0];
        // Con pochi punti sul tavolo non spreco una briscola con punti —
        // ma se la mano è ingolfata di carichi tento comunque l'incasso
        if (puntiDi(scelta) >= 3 && ptTavolo < 10 && difficolta !== 'facile' && pressioneMano(g) < 3) {
            return scartoAI(g);
        }
        // Segnali: il compagno deve ancora giocare e ha segnalato l'asso di
        // briscola: può incassare lui, non spreco una mia briscola con punti
        const seg = segnaleCompagno(g);
        if (seg && seg.briscole[1] && puntiDi(scelta) >= 3 && scelta.suit === semeBriscola &&
            !tavolo.some(function (t) { return squadraDi(t.g) === squadraDi(g); })) {
            return scartoAI(g);
        }
        return scelta;
    }

    return scartoAI(g);
}

// === FLUSSO DI GIOCO ===
function nuovaPartita(diff, mod, segnali) {
    difficolta = diff;
    modalita = mod;
    segnaliAttivi = mod === 4 && !!segnali;
    window._modalita4 = mod === 4;
    localStorage.setItem('briscola-difficolta', diff);
    localStorage.setItem('briscola-modalita', mod);
    localStorage.setItem('briscola-segnali', segnaliAttivi ? '1' : '0');
    mazzo = creaMazzo();
    mani = [];
    for (let g = 0; g < modalita; g++) mani.push([mazzo.shift(), mazzo.shift(), mazzo.shift()]);
    briscolaCarta = mazzo.shift();
    semeBriscola = briscolaCarta.suit;
    punti = [0, 0];
    carteVinte = [0, 0];
    tavolo = [];
    visteIds = {};
    partitaFinita = false;
    animando = false;
    presaInAttesaClick = false;
    undoStack = [];
    maniScoperte = false;
    document.getElementById('btn-scoperte').classList.remove('attivo');
    document.getElementById('campogioco').classList.remove('mani-scoperte');
    primoDiMano = Math.floor(Math.random() * modalita);
    turno = primoDiMano;
    scegliNomi();
    chiudiModali();
    document.getElementById('campogioco').classList.toggle('quattro', modalita === 4);
    applicaTema();
    renderStats();
    renderTutto();
    setMessaggio(primoDiMano === 0 ? BRISCOLA_LANG.inizioTu : BRISCOLA_LANG.inizioAltro(nomiGiocatori[primoDiMano].nome));
    prossimaMossa();
}

// Testo "Presa di.../Presa tua" per la presa corrente, con relativi punti
function messaggioPresa() {
    const iv = idxVincente();
    const vincitore = tavolo[iv].g;
    const pt = puntiTavolo();
    return vincitore === 0 ? BRISCOLA_LANG.presaTua(pt) : BRISCOLA_LANG.presaDi(nomiGiocatori[vincitore].nome, pt);
}

// Evidenzia con il bordo ciano/nero la carta che sta vincendo la presa sul tavolo
function evidenziaCartaVincente() {
    const slotDi = modalita === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-sinistra', 2: 'slot-alto', 3: 'slot-destra' };
    const iv = idxVincente();
    const gv = tavolo[iv].g;
    document.getElementById(slotDi[gv]).querySelectorAll('.carta').forEach(function (el) {
        el.classList.add('cartavincente');
    });
}

function prossimaMossa() {
    if (partitaFinita) return;
    if (tavolo.length === modalita) {
        animando = true;
        // Le carte restano visibili in tavola finché il giocatore non clicca sul
        // campo di gioco: dà il tempo di capire chi ha preso e con cosa
        presaInAttesaClick = true;
        setMessaggio(messaggioPresa() + ' — ' + BRISCOLA_LANG.clicPerContinuare);
        evidenziaCartaVincente();
        aggiornaStatoUndoUI();
        return;
    }
    if (turno === 0) {
        animando = false;
        salvaPartita();
        setMessaggio(BRISCOLA_LANG.tuoTurno);
        aggiornaEvidenzaTurno();
        aggiornaStatoUndoUI();
        return;
    }
    animando = true;
    aggiornaEvidenzaTurno();
    aggiornaStatoUndoUI();
    setTimeout(function () {
        const carta = scegliCartaAI(turno);
        giocaCarta(turno, carta);
    }, 700 + Math.random() * 500);
}

function giocaCarta(g, carta) {
    const idx = mani[g].indexOf(carta);
    if (idx === -1) return;
    if (g === 0) creaUndoSnapshot();
    mani[g].splice(idx, 1);
    tavolo.push({ g: g, carta: carta });
    visteIds[carta.id] = true;
    riproduciAudio('sounds/scala40/cardplace1.mp3');
    renderTutto();
    turno = (turno + 1) % modalita;
    prossimaMossa();
}

function risolviPresa() {
    const iv = idxVincente();
    const vincitore = tavolo[iv].g;
    const sq = squadraDi(vincitore);
    const pt = puntiTavolo();
    const numCarte = tavolo.length;
    setMessaggio(messaggioPresa());

    animaPresaVerso(sq === 0 ? 'mazzetto-tu' : 'mazzetto-loro', function () {
        punti[sq] += pt;
        carteVinte[sq] += numCarte;
        tavolo = [];

        // Pesca: a partire dal vincitore; l'ultima carta pescata è la briscola scoperta
        let daPescare = [];
        for (let k = 0; k < modalita; k++) daPescare.push((vincitore + k) % modalita);
        for (const g of daPescare) {
            if (mazzo.length > 0) {
                mani[g].push(mazzo.shift());
            } else if (briscolaCarta) {
                mani[g].push(briscolaCarta);
                briscolaCarta = null;
            }
        }

        primoDiMano = vincitore;
        turno = vincitore;
        renderTutto();

        // Fine della mano: tutte le carte giocate
        if (mani.every(function (m) { return m.length === 0; })) {
            finePartita();
            return;
        }
        setTimeout(prossimaMossa, 500);
    });
}

// Anima le carte del tavolo che scivolano verso il mazzetto del vincitore della presa
function animaPresaVerso(idMazzetto, callback) {
    const campo = document.getElementById('campogioco');
    const dest = document.getElementById(idMazzetto);
    if (!campo || !dest) { callback(); return; }
    const scale = window.gameScale || 1;
    const campoRect = campo.getBoundingClientRect();
    const destRect = dest.getBoundingClientRect();
    const destX = (destRect.left - campoRect.left) / scale;
    const destY = (destRect.top - campoRect.top) / scale;

    const slotDi = modalita === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-sinistra', 2: 'slot-alto', 3: 'slot-destra' };
    const cloni = [];
    tavolo.forEach(function (t) {
        const slot = document.getElementById(slotDi[t.g]);
        const cartaEl = slot && slot.querySelector('.carta');
        if (!cartaEl) return;
        const r = cartaEl.getBoundingClientRect();
        const startX = (r.left - campoRect.left) / scale;
        const startY = (r.top - campoRect.top) / scale;
        const clone = cartaEl.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = startX + 'px';
        clone.style.top = startY + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = 200;
        clone.style.transition = 'left 0.5s ease-in, top 0.5s ease-in, opacity 0.5s ease-in 0.15s';
        campo.appendChild(clone);
        cartaEl.style.visibility = 'hidden';
        cloni.push({ clone: clone, destX: destX, destY: destY });
    });

    riproduciAudio('sounds/scala40/cardslide1.mp3');

    if (!cloni.length) { callback(); return; }

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            cloni.forEach(function (c) {
                c.clone.style.left = c.destX + 'px';
                c.clone.style.top = c.destY + 'px';
                c.clone.style.opacity = '0';
            });
        });
    });

    setTimeout(function () {
        cloni.forEach(function (c) { c.clone.remove(); });
        callback();
    }, 560);
}

function clickCartaGiocatore(carta) {
    if (partitaFinita || animando || turno !== 0) return;
    giocaCarta(0, carta);
}

// Click sul campo di gioco durante la pausa a fine presa: si prosegue
function clickCampoContinuaPresa() {
    if (!presaInAttesaClick) return;
    presaInAttesaClick = false;
    aggiornaStatoUndoUI();
    risolviPresa();
}

// === FINE PARTITA ===
function finePartita() {
    partitaFinita = true;
    undoStack = [];
    aggiornaStatoUndoUI();
    localStorage.removeItem('briscola-save');

    const mie = punti[0], sue = punti[1];
    let esito = mie > sue ? 'vinta' : (mie < sue ? 'persa' : 'patta');
    const s = stats[chiaveStats()];
    if (esito === 'vinta') { s.v++; riproduciAudio('sounds/scala40/tada.mp3'); }
    else if (esito === 'persa') { s.p++; riproduciAudio('sounds/scala40/haiperso.mp3'); }
    else { s.n++; riproduciAudio('sounds/scala40/dindon.mp3'); }
    salvaStats();
    renderStats();

    let msg;
    if (esito === 'patta') msg = BRISCOLA_LANG.patta;
    else if (esito === 'vinta') msg = modalita === 4 ? BRISCOLA_LANG.vittoriaCoppia : BRISCOLA_LANG.vittoria;
    else msg = modalita === 4 ? BRISCOLA_LANG.sconfittaCoppia : BRISCOLA_LANG.sconfitta;

    if (esito !== 'patta') setMessaggio(msg.replace('<br>', ' — '), esito === 'vinta' ? 'giallo' : 'rosso');
    else setMessaggio(msg);
    document.getElementById('fine-messaggio').innerHTML = msg;
    document.getElementById('fine-dettagli').textContent =
        BRISCOLA_LANG.riepilogo(difficolta, mie, sue);

    if (typeof gtag === 'function') {
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        gtag('event', prefix + 'game_' + (esito === 'vinta' ? 'won' : (esito === 'persa' ? 'lost' : 'draw')), {
            'event_category': 'Briscola',
            'difficulty': difficolta,
            'mode': modalita,
            'my_points': mie,
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
    }, 1400);
}

// === STATISTICHE (per difficoltà e modalità) ===
function chiaveStats() { return difficolta + (modalita === 4 ? '4' : ''); }

function caricaStats() {
    try { stats = JSON.parse(localStorage.getItem('briscola-stats')) || {}; }
    catch (e) { stats = {}; }
    ['facile', 'medio', 'difficile', 'facile4', 'medio4', 'difficile4'].forEach(function (k) {
        if (!stats[k]) stats[k] = { v: 0, p: 0, n: 0 };
    });
    renderStats();
}

function salvaStats() {
    try { localStorage.setItem('briscola-stats', JSON.stringify(stats)); } catch (e) { }
}

function renderStats() {
    const s = stats[chiaveStats()] || { v: 0, p: 0, n: 0 };
    document.getElementById('stat-diff').textContent =
        BRISCOLA_LANG.diffNames[difficolta].toUpperCase() + (modalita === 4 ? ' 2v2' : '');
    document.getElementById('stat-vinte').textContent = s.v;
    document.getElementById('stat-perse').textContent = s.p;
    document.getElementById('stat-patte').textContent = s.n;
}

function azzeraStats() {
    const btn = document.getElementById('btn-reset-stats');
    if (!btn._conferma) {
        btn._conferma = true;
        const testoOrig = btn.textContent;
        btn.textContent = BRISCOLA_LANG.resetChiedi;
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
    stats[chiaveStats()] = { v: 0, p: 0, n: 0 };
    salvaStats();
    renderStats();
}

// === PERSISTENZA ===
function serializzaCarta(c) { return c ? { s: c.suit, n: c.number } : null; }
function deserializzaCarta(o) { return o ? new Carta(o.s, o.n) : null; }

function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('briscola-save');
        return;
    }
    try {
        localStorage.setItem('briscola-save', JSON.stringify({
            mod: modalita, diff: difficolta, segnali: segnaliAttivi,
            mazzo: mazzo.map(serializzaCarta),
            bris: serializzaCarta(briscolaCarta),
            seme: semeBriscola,
            mani: mani.map(function (m) { return m.map(serializzaCarta); }),
            punti: punti, vinte: carteVinte,
            tavolo: tavolo.map(function (t) { return { g: t.g, c: serializzaCarta(t.carta) }; }),
            primo: primoDiMano, viste: visteIds,
            nomi: nomiGiocatori
        }));
    } catch (e) { }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('briscola-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s.mani || !s.seme) return false;
        modalita = s.mod === 4 ? 4 : 2;
        window._modalita4 = modalita === 4;
        difficolta = s.diff || 'facile';
        segnaliAttivi = modalita === 4 && !!s.segnali;
        mazzo = s.mazzo.map(deserializzaCarta);
        briscolaCarta = deserializzaCarta(s.bris);
        semeBriscola = s.seme;
        mani = s.mani.map(function (m) { return m.map(deserializzaCarta); });
        punti = s.punti || [0, 0];
        carteVinte = s.vinte || [0, 0];
        tavolo = (s.tavolo || []).map(function (t) { return { g: t.g, carta: deserializzaCarta(t.c) }; });
        primoDiMano = s.primo || 0;
        visteIds = s.viste || {};
        nomiGiocatori = s.nomi || [];
        if (!nomiGiocatori.length) scegliNomi();
        turno = 0; // si salva solo all'inizio del turno del giocatore
        partitaFinita = false;
        animando = false;
        return true;
    } catch (e) { return false; }
}

// === UNDO (storia degli snapshot, uno per ogni carta che giochi tu) ===
function creaUndoSnapshot() {
    undoStack.push({
        mazzo: mazzo.map(serializzaCarta),
        bris: serializzaCarta(briscolaCarta),
        seme: semeBriscola,
        mani: mani.map(function (m) { return m.map(serializzaCarta); }),
        punti: punti.slice(),
        vinte: carteVinte.slice(),
        tavolo: tavolo.map(function (t) { return { g: t.g, c: serializzaCarta(t.carta) }; }),
        primo: primoDiMano,
        viste: JSON.parse(JSON.stringify(visteIds))
    });
    aggiornaStatoUndoUI();
}

function eseguiUndo() {
    if (!undoStack.length || partitaFinita) return;
    const s = undoStack.pop();
    mazzo = s.mazzo.map(deserializzaCarta);
    briscolaCarta = deserializzaCarta(s.bris);
    semeBriscola = s.seme;
    mani = s.mani.map(function (m) { return m.map(deserializzaCarta); });
    punti = s.punti.slice();
    carteVinte = s.vinte.slice();
    tavolo = s.tavolo.map(function (t) { return { g: t.g, carta: deserializzaCarta(t.c) }; });
    primoDiMano = s.primo;
    visteIds = JSON.parse(JSON.stringify(s.viste));
    turno = 0;
    animando = false;
    presaInAttesaClick = false;
    document.querySelectorAll('.carta.cartavincente').forEach(function (el) { el.classList.remove('cartavincente'); });
    salvaPartita();
    renderTutto();
    setMessaggio(BRISCOLA_LANG.mossaAnnullata);
    aggiornaEvidenzaTurno();
    aggiornaStatoUndoUI();
    riproduciAudio('sounds/scala40/cardplace1.mp3');
}

function aggiornaStatoUndoUI() {
    const btn = document.getElementById('btn-undo');
    if (!btn) return;
    const abilitato = undoStack.length > 0 && !partitaFinita && (!animando || presaInAttesaClick);
    btn.disabled = !abilitato;
}

// === CARTE SCOPERTE (mostra temporaneamente le mani degli avversari) ===
function toggleManiScoperte() {
    maniScoperte = !maniScoperte;
    document.getElementById('btn-scoperte').classList.toggle('attivo', maniScoperte);
    document.getElementById('campogioco').classList.toggle('mani-scoperte', maniScoperte);
    renderTutto();
}

// === CAMBIO MAZZO (ciclo Francesi -> Napoletane -> Bresciane, come nella Scopa) ===
function cambiaMazzoCiclo() {
    const ordine = ['francesi', 'napoletane', 'bresciane'];
    const attuale = localStorage.getItem('briscola-deck-theme') || 'napoletane';
    const prossimo = ordine[(ordine.indexOf(attuale) + 1) % ordine.length];
    localStorage.setItem('briscola-deck-theme', prossimo);
    applicaTema();
    aggiornaLabelMazzo();
    renderTutto();
}

function aggiornaLabelMazzo() {
    const tema = localStorage.getItem('briscola-deck-theme') || 'napoletane';
    const btn = document.getElementById('btn-mazzo');
    if (btn) btn.textContent = BRISCOLA_LANG.mazzo[tema];
}

function riprendiPartita() {
    chiudiModali();
    document.getElementById('campogioco').classList.toggle('quattro', modalita === 4);
    undoStack = [];
    maniScoperte = false;
    document.getElementById('btn-scoperte').classList.remove('attivo');
    document.getElementById('campogioco').classList.remove('mani-scoperte');
    applicaTema();
    aggiornaLabelMazzo();
    renderStats();
    renderTutto();
    prossimaMossa();
}

// === RENDERING ===
function applicaTema() {
    const tema = localStorage.getItem('briscola-deck-theme') || 'napoletane';
    const cg = document.getElementById('campogioco');
    cg.classList.remove('napoletane', 'bresciane');
    if (tema !== 'francesi') cg.classList.add(tema);
}

function elementoCarta(carta, coperta, orizzontale) {
    const el = document.createElement('div');
    el.className = 'carta' + (coperta ? ' coperta' : '') + (orizzontale ? ' orizzontale' : '');
    if (!coperta && carta) {
        const pos = carta.getSpritePosition();
        el.style.backgroundPosition = pos.x + 'px ' + pos.y + 'px';
    }
    return el;
}

function renderMazzetto(id, n) {
    const cont = document.getElementById(id);
    if (!cont) return;
    let dorso = cont.querySelector('.carta');
    let count = cont.querySelector('.mazzetto-count');
    if (n > 0) {
        if (!dorso) {
            dorso = elementoCarta(null, true, true);
            cont.insertBefore(dorso, cont.firstChild);
        }
        if (!count) {
            count = document.createElement('div');
            count.className = 'mazzetto-count';
            cont.appendChild(count);
        }
        count.textContent = n;
    } else {
        if (dorso) dorso.remove();
        if (count) count.remove();
    }
}

function renderTutto() {
    // Mano del giocatore
    const manoTu = document.getElementById('mano-basso');
    manoTu.innerHTML = '';
    mani[0] && mani[0].forEach(function (c) {
        const el = elementoCarta(c, false, false);
        el.addEventListener('click', function () { clickCartaGiocatore(c); });
        manoTu.appendChild(el);
    });

    // Mani coperte degli altri giocatori
    const posti = modalita === 2 ? { 1: 'mano-alto' } : { 1: 'mano-sinistra', 2: 'mano-alto', 3: 'mano-destra' };
    ['mano-alto', 'mano-sinistra', 'mano-destra'].forEach(function (id) {
        document.getElementById(id).innerHTML = '';
    });
    for (const g in posti) {
        const cont = document.getElementById(posti[g]);
        const vert = posti[g] !== 'mano-alto';
        mani[g] && mani[g].forEach(function (c) {
            cont.appendChild(elementoCarta(maniScoperte ? c : null, !maniScoperte, vert));
        });
    }

    // Carte giocate sul tavolo
    const slotDi = modalita === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-sinistra', 2: 'slot-alto', 3: 'slot-destra' };
    ['slot-basso', 'slot-alto', 'slot-sinistra', 'slot-destra'].forEach(function (id) {
        document.getElementById(id).innerHTML = '';
    });
    tavolo.forEach(function (t, k) {
        const el = elementoCarta(t.carta, false, false);
        if (k === 0) el.classList.add('carta-apertura');
        document.getElementById(slotDi[t.g]).appendChild(el);
    });

    // Mazzo e briscola scoperta
    const mazzoBlocco = document.getElementById('mazzo-blocco');
    mazzoBlocco.innerHTML = '';
    if (briscolaCarta) {
        const bris = elementoCarta(briscolaCarta, false, true);
        bris.classList.add('carta-briscola');
        mazzoBlocco.appendChild(bris);
    }
    if (mazzo.length > 0) {
        const dorso = elementoCarta(null, true, false);
        dorso.classList.add('mazzo-dorso');
        mazzoBlocco.appendChild(dorso);
        const count = document.createElement('div');
        count.className = 'mazzo-count';
        count.textContent = mazzo.length + (briscolaCarta ? 1 : 0);
        mazzoBlocco.appendChild(count);
    }

    // Punteggi e info
    document.getElementById('punti-tu').textContent = punti[0];
    document.getElementById('punti-loro').textContent = punti[1];
    document.getElementById('label-tu').textContent = modalita === 4 ? BRISCOLA_LANG.noi : BRISCOLA_LANG.tu;
    document.getElementById('label-loro').textContent = modalita === 4 ? BRISCOLA_LANG.loro : BRISCOLA_LANG.pc;
    document.getElementById('mazzetto-tu-label').textContent = modalita === 4 ? BRISCOLA_LANG.noi : BRISCOLA_LANG.tu;
    document.getElementById('mazzetto-loro-label').textContent = modalita === 4 ? BRISCOLA_LANG.loro : BRISCOLA_LANG.pc;
    renderMazzetto('mazzetto-tu', carteVinte[0]);
    renderMazzetto('mazzetto-loro', carteVinte[1]);

    // Avatar e nomi
    renderAvatar();
    renderSegnaliCompagno();
    aggiornaEvidenzaTurno();
}

// Griglia 3x3 fissa: briscole possedute dal compagno IA (indice 2, solo modalità 4) e carichi
function renderSegnaliCompagno() {
    const cg = document.getElementById('campogioco');
    cg.classList.toggle('segnali-attivi', segnaliAttivi);
    if (modalita !== 4 || !segnaliAttivi) return;

    const sint = sintesiSegnale(2);
    document.querySelectorAll('#griglia-segnali-compagno .cella-briscola[data-valore]').forEach(function (el) {
        const v = parseInt(el.getAttribute('data-valore'), 10);
        el.classList.toggle('on', !!sint.briscole[v]);
    });
    document.getElementById('cella-no-briscole').classList.toggle('on', sint.nessunaBriscola);
    const monete = document.querySelectorAll('#griglia-segnali-compagno .cella-carico');
    monete.forEach(function (m, i) { m.classList.toggle('on', i < sint.carichi); });
}

function renderAvatar() {
    const posti = modalita === 2 ? { 1: 'avatar-alto' } : { 1: 'avatar-sinistra', 2: 'avatar-alto', 3: 'avatar-destra' };
    ['avatar-alto', 'avatar-sinistra', 'avatar-destra'].forEach(function (id) {
        const el = document.getElementById(id);
        el.style.display = 'none';
    });
    for (const g in posti) {
        const el = document.getElementById(posti[g]);
        if (!nomiGiocatori[g]) continue;
        el.style.display = 'flex';
        el.querySelector('img').src = nomiGiocatori[g].avatar;
        el.querySelector('.nome-avatar').textContent = nomiGiocatori[g].nome +
            (modalita === 4 && g === '2' ? ' ★' : '');
    }
}

function aggiornaEvidenzaTurno() {
    document.getElementById('campogioco').classList.toggle('turno-giocatore', turno === 0 && !animando && !partitaFinita);

    const posti = modalita === 2
        ? { 0: 'mano-basso', 1: 'mano-alto' }
        : { 0: 'mano-basso', 1: 'mano-sinistra', 2: 'mano-alto', 3: 'mano-destra' };
    ['mano-basso', 'mano-alto', 'mano-sinistra', 'mano-destra'].forEach(function (id) {
        document.getElementById(id).classList.remove('turno-attivo');
    });
    if (!partitaFinita) {
        const attivo = document.getElementById(posti[turno]);
        if (attivo) attivo.classList.add('turno-attivo');
    }
}

function setMessaggio(testo, stile) {
    const el = document.getElementById('messaggio-stato');
    el.innerHTML = testo;
    el.classList.remove('msg-giallo', 'msg-rosso');
    if (stile === 'giallo') el.classList.add('msg-giallo');
    if (stile === 'rosso') el.classList.add('msg-rosso');
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('finepartita').style.display = 'none';
    document.getElementById('modale-regole').style.display = 'none';
    document.getElementById('modale-info-segnali').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('briscola-difficolta') || 'facile');
    selezionaModalita(parseInt(localStorage.getItem('briscola-modalita'), 10) === 4 ? 4 : 2);
    selezionaMazzo(localStorage.getItem('briscola-deck-theme') || 'napoletane');
    const segnaliSalvati = localStorage.getItem('briscola-segnali') === '1';
    tempSegnali = segnaliSalvati;
    document.getElementById('chk-segnali').checked = segnaliSalvati;
}

let tempDifficolta = 'facile';
let tempModalita = 2;
let tempSegnali = false;
function selezionaDifficolta(diff) {
    tempDifficolta = diff;
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', d === diff);
    });
}
function selezionaModalita(mod) {
    tempModalita = mod;
    document.getElementById('btn-mod-2').classList.toggle('attiva', mod === 2);
    document.getElementById('btn-mod-4').classList.toggle('attiva', mod === 4);
    document.getElementById('opzione-segnali').style.display = mod === 4 ? 'flex' : 'none';
}
function toggleSegnaliOpzione(attivo) {
    tempSegnali = attivo;
}
function selezionaMazzo(tema) {
    localStorage.setItem('briscola-deck-theme', tema);
    ['francesi', 'napoletane', 'bresciane'].forEach(function (t) {
        document.getElementById('btn-deck-' + t).classList.toggle('attiva', t === tema);
    });
    applicaTema();
    aggiornaLabelMazzo();
}
function confermaEAvviaPartita() {
    nuovaPartita(tempDifficolta, tempModalita, tempSegnali);
}

function richiediNuovaPartita() {
    // Partita conclusa: il reload rinnova pubblicità, interstitial e statistiche
    if (partitaFinita) {
        location.reload();
        return;
    }
    if (!mani.length || mani.every(function (m) { return m.length === 0; })) {
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

function apriInfoSegnali() {
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-info-segnali').style.display = 'flex';
}

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initBriscola);
    } else {
        initBriscola();
    }
});

function initBriscola() {
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initBriscola();
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

    document.getElementById('btn-nuova-partita').addEventListener('click', function (e) { e.stopPropagation(); richiediNuovaPartita(); });
    document.getElementById('btn-regole-top').addEventListener('click', function (e) { e.stopPropagation(); apriRegole(); });
    document.getElementById('btn-info-segnali').addEventListener('click', function (e) { e.stopPropagation(); apriInfoSegnali(); });
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);
    document.getElementById('btn-reset-stats').addEventListener('click', function (e) { e.stopPropagation(); azzeraStats(); });
    document.getElementById('btn-undo').addEventListener('click', function (e) { e.stopPropagation(); eseguiUndo(); });
    document.getElementById('btn-scoperte').addEventListener('click', function (e) { e.stopPropagation(); toggleManiScoperte(); });
    document.getElementById('btn-mazzo').addEventListener('click', function (e) { e.stopPropagation(); cambiaMazzoCiclo(); });
    document.getElementById('campogioco').addEventListener('click', clickCampoContinuaPresa);
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        localStorage.removeItem('briscola-save');
        location.reload();
    });

    caricaStats();
    applicaTema();
    aggiornaLabelMazzo();
    aggiornaStatoUndoUI();

    if (caricaPartita()) {
        renderTutto();
        apriModaleInizio(true);
    } else {
        apriModaleInizio(false);
    }
}
