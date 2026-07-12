'use strict';

// ─── COSTANTI ────────────────────────────────────────────────────────────────

const S40_SUITS   = ['C', 'Q', 'F', 'P'];  // Cuori, Quadri, Fiori, Picche
const S40_JOKER   = 'J';
const S40_RANKS   = 13;     // 1 (Asso) … 13 (Re)
const S40_DECKS   = 2;
const S40_TOTAL   = 108;    // 2 × (52 + 2 joker)

const MELD_TRIS   = 'tris';   // tre o più carte dello stesso valore
const MELD_SCALA  = 'scala';  // tre o più carte dello stesso seme in sequenza

// Punti per calcolo IA
const AI_PTS = {
    IN_TRIS:          100,
    ATTACKABLE:        50,
    PAIR:              40,
    HALF_PAIR:         20,
    SAME_RANK:         30,
    JOKER:            200,
    JOKER_RECOVERABLE: 150
};

// ─── I18N ─────────────────────────────────────────────────────────────────────

const s40i18n = {
    it: {
        undo:          'UNDO',
        opponents:     'AVVERSARI',
        face_up:       'SCOPERTE',
        deck:          'mazzo',
        discards:      'scarti',
        new_game:      'NUOVA',
        turn:          'TURNO DI: ',
        player:        'giocatore',
        opponent:      'avversario',
        cannot_empty:  'non puoi rimanere senza carte',
        draw_first:    'pesca prima di scartare',
        you_win:       'HAI VINTO!',
        you_lose:      'HAI PERSO',
        score_limit:   'Limite punti:',
        total:         'Totale:',
    },
    en: {
        undo:          'UNDO',
        opponents:     'OPPONENTS',
        face_up:       'FACE UP',
        deck:          'deck',
        discards:      'discards',
        new_game:      'NEW',
        turn:          'TURN OF: ',
        player:        'player',
        opponent:      'opponent',
        cannot_empty:  'you cannot remain without cards',
        draw_first:    'draw before discarding',
        you_win:       'YOU WIN!',
        you_lose:      'YOU LOSE',
        score_limit:   'Score limit:',
        total:         'Total:',
    }
};

function s40t(key) {
    const lang = document.documentElement.lang || 'it';
    return (s40i18n[lang] && s40i18n[lang][key]) ? s40i18n[lang][key] : (s40i18n.it[key] || key);
}

// ─── CLASSE CARD ──────────────────────────────────────────────────────────────

class Card {
    constructor(suit, rank, back, id) {
        this.id   = id;
        this.suit = suit;   // 'C' 'Q' 'F' 'P' 'J'
        this.rank = rank;   // 1-13, oppure 0=jolly-rosso, 1=jolly-nero (solo per J)
        this.back = back;   // 0=rosso, 1=blu
    }

    get isJoker()  { return this.suit === S40_JOKER; }
    get isAce()    { return this.rank === 1; }
    get isKing()   { return this.rank === 13; }

    // Valore in punti (calcolato a fine partita)
    get points() {
        if (this.isJoker) return 30;
        if (this.rank >= 10) return 10;
        return this.rank; // Asso=1 … 9=9
    }

    // Chiave per il foglio sprite: stessa convenzione della versione attuale
    get spriteKey() {
        if (this.isJoker) return this.rank === 0 ? 'J50' : 'J51';
        return this.suit + this.rank;
    }

    toString() { return `Card(${this.spriteKey} back=${this.back} id=${this.id})`; }
}

// ─── CREAZIONE MAZZO ──────────────────────────────────────────────────────────

/**
 * Restituisce un array di 108 oggetti Card (2 mazzi da 52 + 2 jolly ciascuno).
 * L'indice nell'array coincide con l'id della carta.
 */
function buildDeck() {
    const cards = [];
    let id = 0;
    for (let back = 0; back < S40_DECKS; back++) {
        for (const suit of S40_SUITS) {
            for (let rank = 1; rank <= S40_RANKS; rank++) {
                cards.push(new Card(suit, rank, back, id++));
            }
        }
        cards.push(new Card(S40_JOKER, 0, back, id++)); // Jolly rosso
        cards.push(new Card(S40_JOKER, 1, back, id++)); // Jolly nero
    }
    return cards; // length === 108
}

/** Fisher-Yates shuffle in-place su un array di id (numeri). */
function shuffleIds(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ─── VALIDAZIONE CALATE ───────────────────────────────────────────────────────

/**
 * Verifica se una lista di Card forma un tris valido.
 *
 * Regole (dal codice originale):
 *  - Massimo 4 carte in totale (una per seme)
 *  - Tutti i non-jolly devono avere lo stesso valore (rank)
 *  - Tutti i non-jolly devono avere semi DIVERSI (no due carte identiche da doppio mazzo)
 *  - Al massimo 2 jolly
 *  - Non può essere composto solo da jolly
 */
function isTrisValid(cards) {
    if (cards.length < 3 || cards.length > 4) return false;

    const nonJokers  = cards.filter(c => !c.isJoker);
    const jokerCount = cards.length - nonJokers.length;

    if (nonJokers.length === 0) return false;   // solo jolly
    if (jokerCount > 2)         return false;   // max 2 jolly

    const rank      = nonJokers[0].rank;
    const usedSuits = {};

    for (const c of nonJokers) {
        if (c.rank !== rank)       return false;  // valori diversi
        if (usedSuits[c.suit])     return false;  // seme già usato
        usedSuits[c.suit] = true;
    }
    return true;
}

/**
 * Verifica se una lista di Card forma una scala valida.
 *
 * Regole (dal codice originale):
 *  - Tutti i non-jolly dello stesso seme
 *  - Nessun rank duplicato tra i non-jolly
 *  - I non-jolly formano una sequenza consecutiva; i jolly riempiono i buchi
 *  - Wrap Re-Asso ammesso (Q-K-A è valido); Asso-2 dopo Re NON ammesso
 */
function isScalaValid(cards) {
    if (cards.length < 3) return false;

    const nonJokers  = cards.filter(c => !c.isJoker);
    const jokerCount = cards.length - nonJokers.length;

    if (nonJokers.length === 0) return false;

    // Stesso seme per tutti i non-jolly
    const suit = nonJokers[0].suit;
    if (!nonJokers.every(c => c.suit === suit)) return false;

    // Ordina per rank
    const sorted = nonJokers.slice().sort((a, b) => a.rank - b.rank);

    // Nessun rank duplicato
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].rank === sorted[i - 1].rank) return false;
    }

    // Conta i buchi tra rank consecutivi
    function countGaps(ranks) {
        let g = 0;
        for (let i = 1; i < ranks.length; i++) g += ranks[i] - ranks[i - 1] - 1;
        return g;
    }

    const ranks = sorted.map(c => c.rank);

    // Caso standard (Asso in testa)
    if (countGaps(ranks) <= jokerCount) return true;

    // Wrap Re-Asso: Asso (1) trattato come 14 dopo il Re (13)
    // Valido solo se il gruppo contiene sia l'Asso che il Re
    if (ranks[0] === 1 && ranks[ranks.length - 1] === 13) {
        // Sposta l'Asso in coda come rank 14
        const wrapped = [...ranks.slice(1), 14];
        if (countGaps(wrapped) <= jokerCount) return true;
    }

    return false;
}

/** Calcola i punti di una lista di Card per un giocatore (mano o calata). */
function calcPoints(cards) {
    return cards.reduce((sum, c) => sum + c.points, 0);
}

// Esporta globalmente (non usiamo moduli ES per compatibilità con lo stack attuale)
window.S40Core = {
    buildDeck, shuffleIds, s40t,
    isTrisValid, isScalaValid, calcPoints,
    MELD_TRIS, MELD_SCALA, AI_PTS
};
