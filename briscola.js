/* ============================================================================
   BRISCOLA - Logica di Gioco (JavaScript)
   Briscola classica a 2 giocatori o a 4 (2 contro 2 a coppie): 3 carte a testa,
   briscola scoperta sotto il mazzo, pesca dopo ogni presa, 120 punti in palio.
   AI con euristiche di squadra, conteggio carte e finale calcolato (Difficile).
   Stile e struttura coerenti con gli altri giochi del sito (Scopa, Dama).
   ============================================================================ */

window.scriptVersion = '1.53';

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
let modalita = 4;             // 2 o 4 giocatori (1v1 temporaneamente disattivato: default 2v2)
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
// Scala di valore per il rango di una briscola tra quelle ancora in campo (non
// uscite), dalla più forte rimasta (1a posizione) alla più debole rimasta (10a).
const VALORE_RANGO_BRISCOLA = [8, 4, 3, 2, 2, 1, 1, 1, 0, 0];

// Posizione (0-based) di una carta di briscola tra tutte le briscole ancora in
// campo (non uscite), dalla più forte (rango 0) alla più debole. Usato sia per
// il valore di scarto sia per decidere se una briscola è "sacrificabile" per prendere.
function rangoBriscola(carta, g) {
    // Il rango misura quanto è alta questa briscola tra tutte quelle ANCORA IN GIOCO,
    // cioè non ancora viste. Vanno incluse anche le altre briscole nella mano del
    // giocatore stesso (es. il proprio Asso quando si valuta il Re): sono ancora da
    // giocare e restano il riferimento di forza, quindi non devono "promuovere"
    // artificialmente le briscole inferiori facendole sembrare più preziose.
    const altreInMano = (g !== undefined ? mani[g] : []).filter(function (c) {
        return c.suit === semeBriscola && c.number !== carta.number;
    });
    const rimaste = [carta]
        .concat(carteFuori(g).filter(function (c) { return c.suit === semeBriscola; }))
        .concat(altreInMano);
    rimaste.sort(function (a, b) { return FORZA[b.number] - FORZA[a.number]; });
    return rimaste.findIndex(function (c) { return c.number === carta.number; });
}

// Valore "artificiale" di sacrificio di una carta di briscola ai fini di
// ordinaPerScarto: al valore nominale in punti si somma quanto è rara/preziosa
// rispetto alle briscole ancora in circolazione, più un bonus se è l'unica in
// mano al giocatore o se il compagno ha segnalato di non averne. Il risultato
// resta comparabile direttamente coi punti nominali di un liscio non-briscola.
function valoreScartoBriscola(carta, g) {
    const rango = rangoBriscola(carta, g);
    let valore = puntiDi(carta) + VALORE_RANGO_BRISCOLA[Math.min(rango, VALORE_RANGO_BRISCOLA.length - 1)];

    const unicaInMano = mani[g].filter(function (c) { return c.suit === semeBriscola; }).length === 1;
    if (unicaInMano) valore += 2;

    if (modalita === 4) {
        const seg = segnaleCompagno(g);
        if (seg && seg.nessunaBriscola) valore += 1;
    }

    return valore;
}

// Ordina per "sacrificabilità": valore minore prima. Per i lisci non-briscola
// il valore è semplicemente i punti nominali; per le briscole il valore tiene
// conto anche di quanto sono rare/preziose rispetto a quelle ancora in campo
// (vedi valoreScartoBriscola), non solo del loro valore nominale in punti.
function ordinaPerScarto(carte, g) {
    return carte.slice().sort(function (a, b) {
        const va = (g !== undefined && a.suit === semeBriscola) ? valoreScartoBriscola(a, g) : puntiDi(a);
        const vb = (g !== undefined && b.suit === semeBriscola) ? valoreScartoBriscola(b, g) : puntiDi(b);
        if (va !== vb) return va - vb; // Valore minore prima: mai regalare un carico per risparmiare una briscola/liscio a basso valore
        const ba = a.suit === semeBriscola ? 1 : 0, bb = b.suit === semeBriscola ? 1 : 0;
        if (ba !== bb) return ba - bb; // A parità di valore, non-briscola prima delle briscole
        return FORZA[a.number] - FORZA[b.number]; // Forza minore prima
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

// Una briscola giocata dal compagno è una presa SICURA (imprendibile) dal punto di
// vista di g? Lo è se nessuna briscola più forte è ancora minacciosa: le briscole
// superiori già uscite, in fondo al mazzo o in mano mia/tavolo sono già escluse da
// carteFuori; qui escludiamo anche quelle in mano al compagno di squadra, perché
// non verranno mai usate contro di noi. Restano minacciose solo le briscole superiori
// potenzialmente in mano agli avversari.
function briscolaCompagnoSicura(g, c) {
    if (c.suit !== semeBriscola) return vincenteSicura(g, c);
    let minacce = carteFuori(g).filter(function (f) { return f.suit === semeBriscola && FORZA[f.number] > FORZA[c.number]; });
    if (modalita === 4) {
        const comp = (g + 2) % 4;
        minacce = minacce.filter(function (f) {
            return !mani[comp].some(function (m) { return m.suit === semeBriscola && m.number === f.number; });
        });
    }
    return minacce.length === 0;
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
    const scarto = ordinaPerScarto(mano, g)[0];
    if (difficolta === 'facile') return scarto;
    if (scarto.suit !== semeBriscola) return scarto;
    if (!vincenteSicura(g, scarto)) return scarto;
    let puntiFuori = 0;
    for (const f of carteFuori(g)) puntiFuori += puntiDi(f);
    if (briscolaCarta) puntiFuori += puntiDi(briscolaCarta);
    if (puntiFuori < 10) return scarto;
    const alternative = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) <= 4; });
    if (alternative.length) return ordinaPerScarto(alternative, g)[0];
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
        if (sicure.length) return ordinaPerScarto(sicure, g)[sicure.length - 1];
    }
    // Segnali: il compagno ha l'asso di briscola (presa imbattibile),
    // gli apro con il mio carico migliore perché lo incassi lui
    const seg = segnaleCompagno(g);
    if (seg && seg.briscole[1]) {
        const carichi = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) > 0; });
        if (carichi.length) return ordinaPerScarto(carichi, g)[carichi.length - 1];
    }
    return ordinaPerScarto(mano, g)[0];
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

// ==================== MOTORE IA UMANO MASTER ====================
// Struttura Deduttiva e Posizionale basata sul Documento Strategico doc/briscola-ai-strategia.md

let deduzioniAvversari = {}; // Tracciamento deduttivo: deduzioniAvversari[g] = { senzaBriscole: true/false }

function azzeraDeduzioni() {
    deduzioniAvversari = {};
}

// Determina la posizione nel turno corrente (1: Primo/Apertura, 2: Secondo, 3: Terzo, 4: Quarto/Ultimo)
function calcolaPosizioneInMano(g) {
    if (modalita === 2) {
        return tavolo.length === 0 ? 1 : 4;
    }
    return tavolo.length + 1;
}

function scegliCartaAI(g) {
    const mano = mani[g];
    if (!mano || mano.length === 0) return null;
    if (mano.length === 1) return mano[0];

    // Facile: una volta su tre gioca a caso
    if (difficolta === 'facile' && Math.random() < 0.35) {
        return mano[Math.floor(Math.random() * mano.length)];
    }

    // Finale perfetto: 1vs1 a mazzo esaurito (la mano avversaria è deducibile)
    if (difficolta === 'difficile' && modalita === 2 && mazzo.length === 0 && !briscolaCarta) {
        const avv = 1 - g;
        const manoAvv = mani[avv].slice();
        const tavAI = tavolo.map(function (t) { return { g: t.g === g ? 0 : 1, carta: t.carta }; });
        const esito = finaleEsatto(mano.slice(), manoAvv, tavAI, true);
        if (esito && esito.carta) {
            console.log('[Minimax Finale] Giocatore ' + g + ' sceglie ' + esito.carta.number + ' ' + esito.carta.suit + ' (Differenziale atteso: ' + (esito.diff > 0 ? '+' : '') + esito.diff + ' pts)');
            return esito.carta;
        }
    }

    const pos = calcolaPosizioneInMano(g);
    let scelta = null;

    if (pos === 1) {
        scelta = ruoloPrimoDiMano(g);
    } else if (pos === 2) {
        scelta = ruoloSecondoDiMano(g);
    } else if (pos === 3) {
        scelta = ruoloTerzoDiMano(g);
    } else {
        scelta = ruoloQuartoDiMano(g);
    }

    return scelta || ordinaPerScarto(mano, g)[0];
}

// ---------------- 1. RUOLO PRIMO DI MANO (Apertura) ----------------
function ruoloPrimoDiMano(g) {
    const mano = mani[g];
    let scelta = null;
    let motivo = '';

    // MANOVRA ULTIMA PESCA: Se il mazzo ha 2 carte (ultima pesca) e la briscola scoperta è un carico/figura importante
    if (mazzo.length === 0 && briscolaCarta !== null) {
        const ptBriscolaInTavola = puntiDi(briscolaCarta);
        const briscolaImportante = ptBriscolaInTavola >= 4 || FORZA[briscolaCarta.number] >= 8;
        if (briscolaImportante) {
            const nonBris = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) === 0; });
            if (nonBris.length) {
                scelta = ordinaPerScarto(nonBris, g)[0];
                motivo = 'Manovra Ultima Pesca: cede l\'apertura con liscio per pescare la briscola ' + briscolaCarta.number + ' ' + briscolaCarta.suit;
            }
        }
    }

    // 1. MAI aprire di Asso o 3 non-briscola (salvo briscole totalmente morte)
    const briscoleFuori = carteFuori(g).some(function (f) { return f.suit === semeBriscola; });

    // 2. Se abbiamo lisci (non-briscola con 0 pt): scegli il liscio del seme di cui DETIENI tu il carico (Asso/3) o i cui carichi sono morti!
    if (!scelta) {
        const lisci = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) === 0; });
        if (lisci.length) {
            const lisciSicuri = lisci.filter(function (c) {
                const detieneCarico = mano.some(function (m) { return m.suit === c.suit && puntiDi(m) >= 10; });
                const caricoMorto = !carteFuori(g).some(function (f) { return f.suit === c.suit && puntiDi(f) >= 10; });
                return detieneCarico || caricoMorto;
            });
            if (lisciSicuri.length) {
                scelta = ordinaPerScarto(lisciSicuri, g)[0];
                motivo = 'Apertura su seme protetto (carico proprio in mano o carico morto): cede la presa per essere Posizione 4 al turno dopo';
            } else {
                scelta = ordinaPerScarto(lisci, g)[0];
                motivo = 'Apertura di liscio non-briscola per saggiare il campo';
            }
        }
    }

    // 3. Se non abbiamo lisci (solo carichi non-briscola e briscole): gioca il carico non-briscola più basso (Fante/Cavallo) per cedere il pallino
    if (!scelta) {
        const nonBris = mano.filter(function (c) { return c.suit !== semeBriscola; });
        if (nonBris.length) {
            const carichiEconomici = nonBris.slice().sort(function (a, b) { return puntiDi(a) - puntiDi(b) || FORZA[a.number] - FORZA[b.number]; });
            if (!briscoleFuori && vincenteSicura(g, carichiEconomici[0])) {
                scelta = carichiEconomici[0];
                motivo = 'Incasso sicuro di apertura: briscole esaurite e carta imbattibile';
            } else {
                scelta = carichiEconomici[0];
                motivo = 'Assenza di lisci: cede la mano col carico non-briscola minore per passare in Posizione 4 al turno dopo';
            }
        }
    }

    // 4. Se la mano ha SOLO briscole: gioca la briscola più bassa in assoluto (MAI Asso o 3)
    if (!scelta) {
        const briscoleOrdinate = mano.slice().sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; });
        scelta = briscoleOrdinate[0];
        motivo = 'Mano di sole briscole: apertura d\'obbligo con la briscola minima';
    }

    console.log('[Master AI] Giocatore ' + g + ' (Primo) apre con ' + scelta.number + ' ' + scelta.suit + ' — ' + motivo);
    return scelta;
}

// Soglia "presa magra": conviene prendere questa presa con questa carta vincente specifica?
// - Figura non-briscola: conviene se ptTavolo + punti della figura >= 4 (il guadagno netto conta)
// - Briscola normale (né 3 né Asso): conviene se ptTavolo >= 7 (senza contare il valore della briscola)
// - 3 o Asso di briscola: soglia più alta, conviene solo se ptTavolo >= 10 (non si sacrificano i carichi facilmente)
function conviensePrendereConCarta(carta, ptTavolo) {
    if (carta.suit !== semeBriscola) return (ptTavolo + puntiDi(carta)) >= 4;
    if (carta.number === 3 || carta.number === 1) return ptTavolo >= 10;
    return ptTavolo >= 7;
}

// Soglia "presa magra" specifica per il Quarto di mano: qui l'unico costo di
// prendere con una briscola è quello posizionale/di risorsa (rischio di
// contro-taglio zero, ma la squadra diventa Primo di mano al turno dopo), quindi
// una briscola ormai "di scarto" rispetto alle mani rimaste può essere usata a
// soglie di punti più basse della soglia standard (conviensePrendereConCarta).
// - Rango: posizione tra le briscole ancora in campo (0 = più forte rimasta).
// - maniRimaste: mani future dopo quella corrente, mazzo.length / modalita.
// - ptTavolo >= 5: usabile solo se la briscola non servirà comunque più (rango > maniRimaste).
// - ptTavolo >= 7: usabile se il rango è già basso (>= 4, dal quarto rango in poi)
//   OPPURE se comunque non servirà più (rango > maniRimaste) — vale la condizione più permissiva.
// - Caso speciale 3 di briscola "a rischio": se l'Asso di briscola non è ancora
//   uscito e non è né nella nostra mano né in quella del compagno, il 3 rischia di
//   essere mangiato in futuro e vale la pena incassarlo con ptTavolo >= 7 a prescindere dal rango.
function convienePrenderePosizione4Con(carta, ptTavolo, g) {
    if (carta.suit !== semeBriscola) return true; // il chiamante filtra già le non-briscola a costo zero
    if (carta.number === 3) {
        const idAsso = '1_' + semeBriscola;
        const assoInGiro = !visteIds[idAsso] && !mani[g].some(function (c) { return c.suit === semeBriscola && c.number === 1; })
            && (modalita !== 4 || !mani[(g + 2) % 4].some(function (c) { return c.suit === semeBriscola && c.number === 1; }));
        if (assoInGiro && ptTavolo >= 7) return true;
    }
    const maniRimaste = Math.floor(mazzo.length / modalita);
    const rango = rangoBriscola(carta, g);
    if (ptTavolo >= 7 && (rango >= 4 || rango > maniRimaste)) return true;
    if (ptTavolo >= 5 && rango > maniRimaste) return true;
    return conviensePrendereConCarta(carta, ptTavolo);
}

// ---------------- 2. RUOLO SECONDO DI MANO (Il Ponte) ----------------
function ruoloSecondoDiMano(g) {
    const mano = mani[g];
    const cartaApertura = tavolo[0].carta;
    const ptTavolo = puntiTavolo();
    const seg = segnaleCompagno(g);
    let scelta = null;
    let motivo = '';

    const compagnoHaCarichi = seg && seg.carichi > 0;
    const compagnoHaAssoBriscola = seg && seg.briscole[1];
    const compagnoHaBriscola = seg && (!seg.nessunaBriscola || Object.values(seg.briscole).some(Boolean));

    // TATTICA 1: "Invito al Carico" -> Se l'apertura è magra (< 7 pt) e il compagno ha segnalato CARICHI:
    if (compagnoHaCarichi && ptTavolo < 7) {
        // Cerca ESCLUSIVAMENTE una vera figura (Re=10, Cavallo=9, Fante=8) dello stesso seme dell'apertura
        const figureSeme = mano.filter(function (c) {
            return c.suit === cartaApertura.suit && c.number >= 8 && c.number <= 10 && batte(c, cartaApertura);
        });
        if (figureSeme.length) {
            scelta = figureSeme.sort(function (a, b) { return puntiDi(a) - puntiDi(b); })[0];
            motivo = 'Invito al Carico: prende con figura (' + scelta.number + ') dello stesso seme per fare da canestro al carico del compagno';
        } else {
            const briscoleMano = mano.filter(function (c) { return c.suit === semeBriscola; });
            const carteImportantiCompagno = seg ? (seg.carichi + (seg.briscole[1] ? 1 : 0) + (seg.briscole[3] ? 1 : 0)) : 0;
            const urgenza = carteImportantiCompagno >= 2 || briscoleMano.length > 1;

            if (urgenza && briscoleMano.length > 1) {
                // Con più di una briscola in mano possiamo permetterci di sacrificarne una piccola:
                // solo se il suo rango tra le briscole ancora in campo è oltre le 3 più forti rimaste.
                const briscolePiccole = briscoleMano.filter(function (c) {
                    // rangoBriscola include anche le altre briscole in mano (ancora in gioco):
                    // con più briscole in mano una piccola risulta correttamente "oltre le 3 più forti".
                    return rangoBriscola(c, g) >= 3;
                });
                if (briscolePiccole.length) {
                    scelta = briscolePiccole.sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; })[0];
                    motivo = 'Invito al Carico: taglia con briscola piccola (rango debole, non l\'unica in mano) per fare da canestro al compagno';
                }
            }
            if (!scelta && !urgenza) {
                // Nessuna urgenza: proviamo comunque una presa "leggera" con carta normale fino al Re,
                // senza sacrificare la briscola.
                const carteSeme = mano.filter(function (c) {
                    return c.suit === cartaApertura.suit && c.suit !== semeBriscola && puntiDi(c) <= 4 && batte(c, cartaApertura);
                });
                if (carteSeme.length) {
                    scelta = carteSeme.sort(function (a, b) { return puntiDi(b) - puntiDi(a); })[0];
                    motivo = 'Invito al Carico: prende con carta normale fino al Re (nessuna urgenza, non spreca la briscola)';
                }
            }
        }
    }

    // TATTICA 2: "Strozzare col 3" o col Carico dello stesso seme.
    // Il compagno deve avere una briscola per coprire l'eventuale taglio
    // dell'avversario successivo: senza copertura lo strozzo è un azzardo,
    // indipendentemente da quale carico si stia giocando.
    if (!scelta && cartaApertura.suit !== semeBriscola && (compagnoHaBriscola || compagnoHaAssoBriscola)) {
        const carichiSeme = mano.filter(function (c) { return c.suit === cartaApertura.suit && puntiDi(c) >= 10 && batte(c, cartaApertura); });
        if (carichiSeme.length) {
            const caricoStrozzo = carichiSeme[0];
            // Il contro-strozzo con l'asso dello stesso seme minaccia solo il 3
            // (l'asso è già la carta più alta, nessuno può strozzarlo a sua volta)
            const rischioControstrozzo = caricoStrozzo.number === 3 &&
                carteFuori(g).some(function (f) { return f.suit === cartaApertura.suit && f.number === 1; });

            if (!rischioControstrozzo) {
                scelta = caricoStrozzo;
                motivo = 'Strozzo in Posizione 2: cala il carico del seme aperto col compagno in copertura briscola';
            }
        }
    }

    // TATTICA 3: Risposta standard di Posizione 2 (Prende se la presa conviene per la carta usata, altrimenti scarta per non regalare la Posizione 4)
    if (!scelta) {
        const vincenti = mano.filter(function (c) { return batte(c, cartaApertura); });
        if (vincenti.length) {
            // Un carico (Asso/3) dello stesso seme dell'apertura NON va calato come presa
            // standard in Posizione 2 se restano briscole tra gli avversari che seguono
            // (pos.3 e pos.4 potrebbero tagliarlo catturando 10-11 punti): lo si cala solo
            // tramite la TATTICA 2, con la copertura di briscola del compagno. Le figure
            // piccole (F/C/K) restano invece giocabili, perché il danno di un taglio è contenuto.
            // (A fine partita, quando non ci sono più briscole in giro, il carico ridiventa sicuro.)
            const briscoleInGiro = carteFuori(g).some(function (c) { return c.suit === semeBriscola; });
            const nonBris = vincenti.filter(function (c) {
                if (c.suit === semeBriscola) return false;
                if ((c.number === 1 || c.number === 3) && briscoleInGiro) return false; // carico esposto al taglio
                return true;
            });
            if (nonBris.length) {
                const candidata = nonBris.sort(function (a, b) { return puntiDi(a) - puntiDi(b) || FORZA[a.number] - FORZA[b.number]; })[0];
                if (conviensePrendereConCarta(candidata, ptTavolo)) {
                    scelta = candidata;
                    motivo = 'Prende presa conveniente con carta vincente non-briscola';
                }
            }
            if (!scelta) {
                const briscoleVincenti = vincenti.filter(function (c) { return c.suit === semeBriscola; }).sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; });
                if (briscoleVincenti.length && conviensePrendereConCarta(briscoleVincenti[0], ptTavolo)) {
                    scelta = briscoleVincenti[0];
                    motivo = 'Prende presa conveniente con la briscola vincente più economica';
                }
            }
        }
    }

    // TATTICA 4: Presa magra (non conviene prendere) e niente segnali attivi -> Scarta liscio per cedere la mano.
    // "Cedere" deve davvero cedere: se la carta di scarto standard vincerebbe comunque la presa,
    // le si preferisce un'alternativa non vincente, a meno che il sacrificio di punti superi la
    // piccola soglia tollerata (4 pt), nel qual caso tanto vale incassare.
    // ECCEZIONE: se lo scarto vincente è una NON-briscola (vince a costo briscola zero), cedere
    // non serve a "non sprecare briscole" (non se ne spende alcuna). Cercare a tutti i costi di
    // cedere finirebbe per REGALARE all'avversario i punti dello scarto alternativo: meglio
    // incassare direttamente con la carta non-briscola. Il ramo "cede davvero" resta quindi
    // riservato al caso in cui lo scarto che vince sia una briscola (risorsa da non buttare).
    if (!scelta) {
        const scartoStandard = scartoAI(g);
        if (batte(scartoStandard, cartaApertura) && scartoStandard.suit === semeBriscola) {
            const nonVincenti = mano.filter(function (c) { return !batte(c, cartaApertura); });
            if (nonVincenti.length) {
                const alternativa = ordinaPerScarto(nonVincenti, g)[0];
                const sacrificio = puntiDi(alternativa) - puntiDi(scartoStandard);
                if (sacrificio <= 4) {
                    scelta = alternativa;
                    motivo = 'Presa magra: cede davvero la mano con carta non vincente (sacrificio ' + Math.max(sacrificio, 0) + ' pt)';
                }
            }
        }
        if (!scelta && batte(scartoStandard, cartaApertura) && scartoStandard.suit !== semeBriscola) {
            scelta = scartoStandard;
            motivo = 'Presa a costo briscola zero: incassa con la carta non-briscola vincente invece di regalare punti cedendo';
        }
        if (!scelta) {
            scelta = scartoStandard;
            motivo = 'Presa magra: cede la mano scartando per conquistar la Posizione 4 al turno dopo';
        }
    }

    console.log('[Master AI] Giocatore ' + g + ' (Secondo) gioca ' + scelta.number + ' ' + scelta.suit + ' — ' + motivo);
    return scelta;
}

// ---------------- 3. RUOLO TERZO DI MANO (Risposta dopo l'Apertura del Compagno) ----------------
function ruoloTerzoDiMano(g) {
    const mano = mani[g];
    const iv = idxVincente();
    const gv = tavolo[iv].g;
    const cartaVincente = tavolo[iv].carta;
    const ptTavolo = puntiTavolo();
    const compagnoVince = modalita === 4 && squadraDi(gv) === squadraDi(g);
    let scelta = null;
    let motivo = '';

    if (compagnoVince) {
        // Il compagno sta vincendo. Se vince con una briscola, il Terzo carica punti
        // sfruttando il vantaggio, dosando in base alla sicurezza della presa:
        //  - presa SICURA (nessuna briscola più alta minacciosa in mano avversaria):
        //    carica il massimo dei punti possibile, carichi Asso/3 compresi.
        //  - presa NON sicura (un avversario dietro potrebbe tagliare più alto):
        //    carica al massimo una figura da <= 4 punti (mai carichi, che verrebbero
        //    regalati al taglio); preferendo la figura più alta entro il limite.
        // Se invece il compagno vince con una carta NON-briscola, la presa non è mai
        // solida (il Quarto può ancora tagliare): si mette una figura <= 4 pt (mai un carico)
        // SOLO se il Terzo può prendere lui in squadra con una carta dello stesso seme
        // d'apertura che batte. Con carte di solo seme diverso non carica: scarta il liscio minore.
        const puntiNonBris = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) > 0; });
        if (cartaVincente.suit === semeBriscola) {
            const sicura = briscolaCompagnoSicura(g, cartaVincente);
            const candidati = sicura ? puntiNonBris : puntiNonBris.filter(function (c) { return puntiDi(c) <= 4; });
            if (candidati.length) {
                scelta = candidati.sort(function (a, b) { return puntiDi(b) - puntiDi(a); })[0];
                motivo = 'Carica ' + puntiDi(scelta) + ' punti sulla briscola ' + (sicura ? 'SICURA' : 'non sicura (max 4)') + ' del compagno';
            }
        } else {
            // Il compagno vince con una carta NON-briscola: la presa non è mai davvero al
            // sicuro, perché l'ultimo di mano (Quarto avversario) può ancora tagliare con
            // una briscola e portare via tutto. Mettere punti su questa presa ha senso SOLO
            // se il Terzo può PRENDERE lui in squadra, cioè ha una carta dello STESSO seme
            // della vincente (= seme d'apertura) che la batte: così la presa resta nostra a
            // costo briscola zero e la vinco io. In tal caso si usa una FIGURA da <= 4 punti
            // (mai un carico Asso/3, che verrebbe regalato al taglio), la più alta entro il limite.
            // Se invece il Terzo ha solo carte di seme DIVERSO dall'apertura, non prende nulla:
            // caricarci una figura la regalerebbe al taglio del Quarto come un carico. Meglio
            // scartare il liscio di minor valore (fall-through allo scartoAI più sotto).
            const presaStessoSeme = mano.filter(function (c) {
                return c.suit === cartaVincente.suit && c.suit !== semeBriscola
                    && FORZA[c.number] > FORZA[cartaVincente.number]
                    && puntiDi(c) > 0 && puntiDi(c) <= 4;
            }).sort(function (a, b) { return puntiDi(b) - puntiDi(a) || FORZA[a.number] - FORZA[b.number]; });
            if (presaStessoSeme.length) {
                scelta = presaStessoSeme[0];
                motivo = 'Presa già nostra: incassa in squadra con ' + scelta.number + scelta.suit
                    + ' (stesso seme, ' + puntiDi(scelta) + ' punti, figura <= 4: mai un carico sotto rischio taglio del Quarto)';
            }
        }
        if (!scelta) {
            scelta = scartoAI(g);
            motivo = 'Il compagno sta vincendo la presa: scarta il liscio meno utile';
        }
    } else {
        const vincenti = mano.filter(function (c) { return batte(c, cartaVincente); });

        // "Sospetto carico": se l'avversario che precede sta vincendo avendo TAGLIATO con
        // una briscola un'apertura non-briscola magra (< 7 pt), è probabile che stesse
        // invitando il proprio compagno (il Quarto di mano) a scaricarci sopra un carico.
        // Il terzo di mano alza allora di 5 punti la valutazione della presa, per decidere
        // se valga la pena strozzare prima che arrivi il carico. È solo un sospetto (non una
        // certezza), quindi il bonus è modesto e non tocca la protezione dei carichi (§soglia >=10).
        const cartaApertura = tavolo[0].carta;
        const sospettoCarico = cartaVincente.suit === semeBriscola
            && cartaApertura.suit !== semeBriscola
            && puntiDi(cartaApertura) < 7;
        const ptValutazione = sospettoCarico ? ptTavolo + 5 : ptTavolo;

        // Se il terzo non ha lisci non-briscola da scartare, la sua alternativa allo strozzo
        // sarebbe comunque buttare una briscola: in tal caso prendere con una briscola normale
        // (non carico) costa solo la DIFFERENZA rispetto alla briscola che scarterebbe, un
        // sacrificio modesto. Allentiamo quindi il vincolo di convenienza sulle briscole normali.
        const scartoSarebbeBriscola = !mano.some(function (c) { return c.suit !== semeBriscola; });

        // I carichi (Asso e 3) di seme non-briscola non vanno mai rischiati per prendere
        // in questa posizione: il Quarto di mano potrebbe ancora avere una briscola e
        // tagliare la presa, indipendentemente da quanti punti ci sono in palio. Le figure
        // più piccole (F/C/K) restano invece giocabili, così come le briscole piccole.
        const quartoHaBriscole = !deduzioniAvversari[(g + 1) % 4] || !deduzioniAvversari[(g + 1) % 4].senzaBriscole;
        const vincentiSicure = vincenti.filter(function (c) {
            if (c.suit !== semeBriscola && (c.number === 1 || c.number === 3) && quartoHaBriscole) return false;
            return true;
        });

        if (vincentiSicure.length) {
            const nonBris = vincentiSicure.filter(function (c) { return c.suit !== semeBriscola; });
            if (nonBris.length) {
                const candidata = nonBris.sort(function (a, b) { return puntiDi(a) - puntiDi(b) || FORZA[a.number] - FORZA[b.number]; })[0];
                if (conviensePrendereConCarta(candidata, ptValutazione)) {
                    scelta = candidata;
                    motivo = 'Terzo di mano: prende presa conveniente con carta vincente non-briscola' + (sospettoCarico ? ' (sospetto carico dietro la briscola avversaria)' : '');
                }
            }
            if (!scelta) {
                const briscoleVincenti = vincentiSicure.filter(function (c) { return c.suit === semeBriscola; }).sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; });
                if (briscoleVincenti.length) {
                    const briscolaScelta = briscoleVincenti[0];
                    const eCarico = briscolaScelta.number === 1 || briscolaScelta.number === 3;
                    // Briscola normale: conviene se la valutazione la giustifica, OPPURE se il terzo
                    // butterebbe comunque una briscola (costo differenziale minimo) e c'è un sospetto
                    // carico in gioco. I carichi di briscola restano vincolati alla soglia alta.
                    const prendiBriscola = eCarico
                        ? conviensePrendereConCarta(briscolaScelta, ptValutazione)
                        : (conviensePrendereConCarta(briscolaScelta, ptValutazione) || (scartoSarebbeBriscola && sospettoCarico));
                    if (prendiBriscola) {
                        scelta = briscolaScelta;
                        motivo = 'Terzo di mano: prende con la briscola vincente più economica'
                            + (scartoSarebbeBriscola && sospettoCarico && !eCarico ? ' (scarto obbligato di briscola: strozza il sospetto carico a costo differenziale minimo)' : (sospettoCarico ? ' (sospetto carico dietro la briscola avversaria)' : ''));
                    }
                }
            }
        }
        if (!scelta) {
            const scartoStandard = scartoAI(g);
            // "Cede davvero" solo se lo scarto che vince è una briscola (risorsa da non buttare).
            // Se vince a costo briscola zero (non-briscola), cedere regalerebbe i punti dello scarto
            // alternativo all'avversario: meglio incassare direttamente (vedi §Posizione 2).
            if (batte(scartoStandard, cartaVincente) && scartoStandard.suit === semeBriscola) {
                const nonVincenti = mano.filter(function (c) { return !batte(c, cartaVincente); });
                if (nonVincenti.length) {
                    const alternativa = ordinaPerScarto(nonVincenti, g)[0];
                    const sacrificio = puntiDi(alternativa) - puntiDi(scartoStandard);
                    if (sacrificio <= 4) {
                        scelta = alternativa;
                        motivo = 'Terzo di mano: presa magra, cede davvero con carta non vincente (sacrificio ' + Math.max(sacrificio, 0) + ' pt)';
                    }
                }
            }
            if (!scelta && batte(scartoStandard, cartaVincente) && scartoStandard.suit !== semeBriscola) {
                scelta = scartoStandard;
                motivo = 'Terzo di mano: presa a costo briscola zero, incassa con la carta non-briscola vincente invece di regalare punti cedendo';
            }
            if (!scelta) {
                scelta = scartoStandard;
                motivo = 'Presa magra o rischio controstrozzo: scarto strategico';
            }
        }
    }

    console.log('[Master AI] Giocatore ' + g + ' (Terzo) gioca ' + scelta.number + ' ' + scelta.suit + ' — ' + motivo);
    return scelta;
}

// ---------------- 4. RUOLO QUARTO DI MANO (La Ghigliottina / Informazione Totale) ----------------
function ruoloQuartoDiMano(g) {
    const mano = mani[g];
    const iv = idxVincente();
    const gv = tavolo[iv].g;
    const cartaVincente = tavolo[iv].carta;
    const ptTavolo = puntiTavolo();
    const compagnoVince = modalita === 4 && squadraDi(gv) === squadraDi(g);
    let scelta = null;
    let motivo = '';

    if (compagnoVince) {
        const carichi = mano.filter(function (c) { return c.suit !== semeBriscola && puntiDi(c) > 0; });
        if (carichi.length) {
            scelta = carichi.sort(function (a, b) { return puntiDi(b) - puntiDi(a); })[0];
            motivo = 'Quarto di mano: carica il massimo di punti (' + puntiDi(scelta) + ' pt) sulla presa vincente del compagno';
        } else {
            scelta = ordinaPerScarto(mano, g)[0];
            motivo = 'Quarto di mano: scarica liscio sulla presa del compagno';
        }
    } else {
        const vincenti = mano.filter(function (c) { return batte(c, cartaVincente); });
        const nonBris = vincenti.filter(function (c) { return c.suit !== semeBriscola; });

        if (nonBris.length) {
            // Quarto di mano, presa vincibile con una NON-BRISCOLA (costo briscola zero).
            // Prendere da ultimo ha però un costo POSIZIONALE: si resta Primo di mano al turno
            // dopo. Conviene solo se il bilancio dei punti supera una soglia minima (4). Il
            // bilancio somma tre componenti (i punti della carta giocata si contano perché
            // è una non-briscola: resta nostra, la vinco io — per le briscole NON si sommerebbe):
            //  - ptTavolo: i punti già sul tavolo da incassare;
            //  - puntiDi(carta con cui prendo): la carta di più valore (se prendo, massimizzo l'incasso);
            //  - costo di cessione: se NON prendessi dovrei comunque scartare qualcosa; se il mio
            //    scarto minimo vale punti, cedendo li regalerei, quindi vanno sommati al guadagno.
            // Se il bilancio è < soglia (es. presa a 0 punti con lisci puri da cedere), si cede.
            const SOGLIA_PRESA_Q4 = 4;
            const migliorePresa = nonBris.sort(function (a, b) { return puntiDi(b) - puntiDi(a) || FORZA[b.number] - FORZA[a.number]; })[0];
            const nonVincentiQ = mano.filter(function (c) { return !batte(c, cartaVincente); });
            const costoCessione = nonVincentiQ.length ? puntiDi(ordinaPerScarto(nonVincentiQ, g)[0]) : 0;
            const bilancio = ptTavolo + puntiDi(migliorePresa) + costoCessione;
            if (bilancio >= SOGLIA_PRESA_Q4) {
                scelta = migliorePresa;
                motivo = 'Quarto di mano: incassa con non-briscola ' + scelta.number + ' ' + scelta.suit
                    + ' (bilancio ' + bilancio + ' pt = tavolo ' + ptTavolo + ' + carta ' + puntiDi(migliorePresa) + ' + costo-cessione ' + costoCessione + ' >= ' + SOGLIA_PRESA_Q4 + ', costo briscola zero)';
            }
            // else: bilancio sotto soglia -> non prende, cade nel ramo di cessione finale.
        }
        if (!scelta && !nonBris.length && vincenti.length) {
            const briscoleVincenti = vincenti.sort(function (a, b) { return FORZA[a.number] - FORZA[b.number]; })
                .filter(function (c) { return convienePrenderePosizione4Con(c, ptTavolo, g); });
            if (briscoleVincenti.length) {
                scelta = briscoleVincenti[0];
                motivo = 'Quarto di mano: cattura la presa con la briscola vincente più sacrificabile (rango/mani rimaste/punti in gioco)';
            }
        }
        if (!scelta) {
            scelta = ordinaPerScarto(mano, g)[0];
            motivo = 'Quarto di mano su presa magra: non spreca briscole pregiate e cede la presa per far aprire l\'avversario al turno dopo';
        }
    }

    console.log('[Master AI] Giocatore ' + g + ' (Quarto) gioca ' + scelta.number + ' ' + scelta.suit + ' — ' + motivo);
    return scelta;
}

// === FLUSSO DI GIOCO ===
let motoreAI = localStorage.getItem('briscola-motore-ai') || 'euristico';

function nuovaPartita(diff, mod) {
    difficolta = 'difficile'; // Livelli temporaneamente disattivati in fase di debug: sempre Esperto (ignora diff)
    modalita = mod;
    segnaliAttivi = (mod === 4);
    motoreAI = tempMotoreAI;
    window._modalita4 = mod === 4;
    localStorage.setItem('briscola-difficolta', diff);
    localStorage.setItem('briscola-modalita', mod);
    localStorage.setItem('briscola-segnali', '1');
    localStorage.setItem('briscola-motore-ai', motoreAI);
    azzeraDeduzioni();
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
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
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
    // Deduzione "senzaBriscole" disattivata: il meccanismo non veniva mai
    // rielaborato dopo le giocate/pescate successive del giocatore osservato,
    // restando valido per tutta la partita anche quando ormai obsoleto.

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
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
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
        difficolta = 'difficile'; // Livelli temporaneamente disattivati in fase di debug: sempre Esperto
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
    const posti = modalita === 2 ? { 1: 'mano-alto' } : { 1: 'mano-destra', 2: 'mano-alto', 3: 'mano-sinistra' };
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
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
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
    aggiornaRegistriDebug();
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

// Etichette brevi per numero carta, nell'ordine di forza decrescente usato nei registri
const ETICHETTA_NUMERO = { 1: 'A', 3: '3', 10: 'K', 9: 'Q', 8: 'J', 7: '7', 6: '6', 5: '5', 4: '4', 2: '2' };
const ORDINE_REGISTRO = [1, 3, 10, 9, 8, 7, 6, 5, 4, 2];

// Sigla visibile del seme nel registro debug. Il codice interno (F/Q/C/P) è
// astratto: il seme reale dipende dal foglio sprite del mazzo scelto.
// - Napoletane/Bresciane (semi italiani):  C=coppe, Q=denari, F=spade, P=bastoni
//   Sigle IT ed EN identiche: coppe=C, denari=D, spade=S, bastoni=B
// - Francesi (semi francesi):  C=cuori, Q=quadri, F=fiori, P=picche
//   Sigle IT: C/Q/F/P (cuori/quadri/fiori/picche)
//   Sigle EN: hearts=H, diamonds=D, clubs=C, spades=S
const SIGLE_SEME = {
    italiane: { it: { C: 'C', Q: 'D', F: 'S', P: 'B' }, en: { C: 'C', Q: 'D', F: 'S', P: 'B' } },
    francesi: { it: { C: 'C', Q: 'Q', F: 'F', P: 'P' }, en: { C: 'H', Q: 'D', F: 'C', P: 'S' } }
};

function siglaSeme(codice) {
    const tema = localStorage.getItem('briscola-deck-theme') || 'napoletane';
    const famiglia = (tema === 'francesi') ? 'francesi' : 'italiane';
    const lingua = (window.currentLang === 'en') ? 'en' : 'it';
    return SIGLE_SEME[famiglia][lingua][codice] || codice;
}

// Registro di debug: mostra quali briscole sono già uscite (giocate o nel piatto)
// e quali carichi (Asso/3) degli altri semi sono già usciti. Si basa su visteIds,
// che include ogni carta effettivamente giocata durante la partita.
function aggiornaRegistriDebug() {
    const regBriscole = document.getElementById('registro-briscole');
    const regCarichi = document.getElementById('registro-carichi');
    if (!regBriscole || !regCarichi) return;

    regBriscole.innerHTML = '';
    ORDINE_REGISTRO.forEach(function (n) {
        const id = n + '_' + semeBriscola;
        const inFondoAlMazzo = briscolaCarta && briscolaCarta.id === id;
        const span = document.createElement('span');
        span.className = 'reg-carta' + (visteIds[id] ? '' : (inFondoAlMazzo ? ' in-fondo' : ' disponibile'));
        span.textContent = ETICHETTA_NUMERO[n];
        span.title = ETICHETTA_NUMERO[n] + ' di briscola' + (inFondoAlMazzo ? ' (in fondo al mazzo)' : '');
        regBriscole.appendChild(span);
    });

    regCarichi.innerHTML = '';
    SEMI.filter(function (s) { return s !== semeBriscola; }).forEach(function (s) {
        [1, 3].forEach(function (n) {
            const id = n + '_' + s;
            const span = document.createElement('span');
            span.className = 'reg-carta' + (visteIds[id] ? '' : ' disponibile');
            span.textContent = ETICHETTA_NUMERO[n] + siglaSeme(s);
            span.title = ETICHETTA_NUMERO[n] + ' di ' + siglaSeme(s);
            regCarichi.appendChild(span);
        });
    });
}

function renderAvatar() {
    const posti = modalita === 2 ? { 1: 'avatar-alto' } : { 1: 'avatar-destra', 2: 'avatar-alto', 3: 'avatar-sinistra' };
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
        : { 0: 'mano-basso', 1: 'mano-destra', 2: 'mano-alto', 3: 'mano-sinistra' };
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
    selezionaDifficolta('difficile'); // Livelli temporaneamente disattivati in fase di debug: sempre Esperto
    selezionaMotoreAI(localStorage.getItem('briscola-motore-ai') || 'euristico');
    selezionaModalita(4); // 1v1 temporaneamente disattivato: forza sempre 2v2 ignorando la preferenza salvata
    selezionaMazzo(localStorage.getItem('briscola-deck-theme') || 'napoletane');
}

let tempDifficolta = 'difficile'; // Livelli temporaneamente disattivati in fase di debug: default Esperto
let tempModalita = 4; // 1v1 temporaneamente disattivato: default 2v2
let tempSegnali = true;
let tempMotoreAI = 'euristico';

function selezionaDifficolta(diff) {
    tempDifficolta = diff;
    ['facile', 'medio', 'difficile'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', d === diff);
    });
}
function selezionaMotoreAI(m) {
    tempMotoreAI = m;
    ['euristico', 'montecarlo', 'legacy'].forEach(function (key) {
        const el = document.getElementById('btn-ai-' + key);
        if (el) el.classList.toggle('attiva', key === m);
    });
}
function selezionaModalita(mod) {
    tempModalita = mod;
    document.getElementById('btn-mod-2').classList.toggle('attiva', mod === 2);
    document.getElementById('btn-mod-4').classList.toggle('attiva', mod === 4);
    const opz = document.getElementById('opzione-segnali');
    if (opz) opz.style.display = mod === 4 ? 'flex' : 'none';
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

    function addEv(id, type, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(type, fn);
    }

    addEv('btn-nuova-partita', 'click', function (e) { e.stopPropagation(); richiediNuovaPartita(); });
    addEv('btn-regole-top', 'click', function (e) { e.stopPropagation(); apriRegole(); });
    addEv('btn-info-segnali', 'click', function (e) { e.stopPropagation(); apriInfoSegnali(); });
    addEv('btn-riprendi', 'click', riprendiPartita);
    addEv('btn-reset-stats', 'click', function (e) { e.stopPropagation(); azzeraStats(); });
    addEv('btn-undo', 'click', function (e) { e.stopPropagation(); eseguiUndo(); });
    addEv('btn-scoperte', 'click', function (e) { e.stopPropagation(); toggleManiScoperte(); });
    addEv('btn-mazzo', 'click', function (e) { e.stopPropagation(); cambiaMazzoCiclo(); });
    addEv('campogioco', 'click', clickCampoContinuaPresa);
    addEv('btn-no-continua', 'click', chiudiModali);
    addEv('btn-si-termina', 'click', function () {
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
