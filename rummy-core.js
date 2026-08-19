// rummy-core.js v1.2
// Gin Rummy — card definitions, meld detection, deadwood calculation

'use strict';

// ─── CARD DEFINITIONS ───────────────────────────────────────────────────────

// Suits: 0=Hearts, 1=Diamonds, 2=Clubs, 3=Spades
// Ranks: 1=Ace … 13=King
// Sprite layout (conjollyplus.png): col = rank-1, row = suit index

var SUITS = ['H', 'D', 'C', 'S'];
var SUIT_NAMES = {
    it: ['Cuori', 'Quadri', 'Fiori', 'Picche'],
    en: ['Hearts', 'Diamonds', 'Clubs', 'Spades']
};
var RANK_NAMES = {
    it: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    en: ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
};

// Point value of a card (deadwood counting)
function cardPoints(rank) {
    if (rank >= 10) return 10;
    return rank; // Ace = 1, 2-9 = face value
}

// Build a standard 52-card deck
// Each card: { id, suit, rank, points }
function creaMazzo() {
    var deck = [];
    var id = 0;
    for (var s = 0; s < 4; s++) {
        for (var r = 1; r <= 13; r++) {
            deck.push({
                id: id++,
                suit: s,
                rank: r,
                points: cardPoints(r)
            });
        }
    }
    return deck;
}

// Shuffle an array in-place (Fisher-Yates)
function mescola(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// ─── MELD DETECTION ─────────────────────────────────────────────────────────

// A SET: 3 or 4 cards of the same rank, different suits
function isSet(cards) {
    if (cards.length < 3 || cards.length > 4) return false;
    var rank = cards[0].rank;
    var suits = new Set();
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].rank !== rank) return false;
        suits.add(cards[i].suit);
    }
    return suits.size === cards.length;
}

// A RUN: 3+ consecutive ranks of the same suit
function isRun(cards) {
    if (cards.length < 3) return false;
    var suit = cards[0].suit;
    var ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; });
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].suit !== suit) return false;
    }
    for (var j = 1; j < ranks.length; j++) {
        if (ranks[j] !== ranks[j - 1] + 1) return false;
    }
    return true;
}

function isMeld(cards) {
    return isSet(cards) || isRun(cards);
}

// ─── OPTIMAL MELD FINDER ─────────────────────────────────────────────────────
// Given a hand of cards, find the grouping of melds that minimises deadwood.
// Returns { melds: [[card,…],…], deadwood: [card,…] }

function _combinations(arr, k) {
    var result = [];
    function combo(start, chosen) {
        if (chosen.length === k) { result.push(chosen.slice()); return; }
        for (var i = start; i < arr.length; i++) {
            chosen.push(arr[i]);
            combo(i + 1, chosen);
            chosen.pop();
        }
    }
    combo(0, []);
    return result;
}

// Find all valid melds (size 3 up to hand size) within a set of cards
function trovaTuttiMeld(cards) {
    var melds = [];
    for (var k = 3; k <= cards.length; k++) {
        _combinations(cards, k).forEach(function (combo) {
            if (isMeld(combo)) melds.push(combo);
        });
    }
    return melds;
}

// Returns deadwood total of a hand split into (melds, deadwood)
function _deadwoodOf(deadwoodCards) {
    return deadwoodCards.reduce(function (s, c) { return s + c.points; }, 0);
}

// Recursive: given remaining cards and already-used card IDs, find best meld combo
function _bestSplit(remaining, usedIds, allMelds) {
    var best = { melds: [], deadwood: remaining, dw: _deadwoodOf(remaining) };

    for (var i = 0; i < allMelds.length; i++) {
        var meld = allMelds[i];
        // Check if all cards in this meld are still available
        var available = true;
        for (var j = 0; j < meld.length; j++) {
            if (usedIds.has(meld[j].id)) { available = false; break; }
        }
        if (!available) continue;

        // Use this meld
        var newUsed = new Set(usedIds);
        meld.forEach(function (c) { newUsed.add(c.id); });
        var newRemaining = remaining.filter(function (c) { return !newUsed.has(c.id); });

        var sub = _bestSplit(newRemaining, newUsed, allMelds);
        var totalDw = sub.dw;
        if (totalDw < best.dw) {
            best = {
                melds: [meld].concat(sub.melds),
                deadwood: sub.deadwood,
                dw: totalDw
            };
        }
    }

    return best;
}

// Find ALL distinct splits grouped by deadwoodPoints.
// Returns array of { melds, deadwood, deadwoodPoints, meldIdSet } sorted by deadwoodPoints asc.
function trovaTuttiSplitDistinti(hand) {
    var allMelds = trovaTuttiMeld(hand);
    var splits = [];
    var seen = new Set(); // chiave = composizione meld, per evitare duplicati

    function explore(remaining, usedIds, currentMelds, minIdx) {
        // Chiave canonica: meld ordinati per lista di id
        var key = currentMelds.map(function (m) {
            return m.map(function (c) { return c.id; }).sort(function (a, b) { return a - b; }).join(',');
        }).sort().join('|');

        if (!seen.has(key)) {
            seen.add(key);
            var meldIdSet = new Set();
            currentMelds.forEach(function (m) { m.forEach(function (c) { meldIdSet.add(c.id); }); });
            splits.push({
                melds: currentMelds.slice(),
                deadwood: remaining.slice(),
                deadwoodPoints: _deadwoodOf(remaining),
                meldIdSet: meldIdSet
            });
        }

        for (var i = minIdx; i < allMelds.length; i++) {
            var meld = allMelds[i];
            var ok = true;
            for (var j = 0; j < meld.length; j++) {
                if (usedIds.has(meld[j].id)) { ok = false; break; }
            }
            if (!ok) continue;
            var newUsed = new Set(usedIds);
            meld.forEach(function (c) { newUsed.add(c.id); });
            var newRem = remaining.filter(function (c) { return !newUsed.has(c.id); });
            explore(newRem, newUsed, currentMelds.concat([meld]), i + 1);
        }
    }

    explore(hand, new Set(), [], 0);
    return splits.sort(function (a, b) { return a.deadwoodPoints - b.deadwoodPoints; });
}

// Main: find optimal meld arrangement for a hand
// Returns { melds, deadwood, deadwoodPoints }
function calcolaOptimalMelds(hand) {
    var allMelds = trovaTuttiMeld(hand);
    var split = _bestSplit(hand, new Set(), allMelds);
    return {
        melds: split.melds,
        deadwood: split.deadwood,
        deadwoodPoints: split.dw
    };
}

// ─── LAYOFF ──────────────────────────────────────────────────────────────────
// After a knock, the non-knocking player can lay off deadwood onto the knocker's melds.
// Returns new melds array with layoffs applied, and remaining deadwood.

function applicaLayoff(knockerMelds, defenderDeadwood) {
    var melds = knockerMelds.map(function (m) { return m.slice(); }); // deep copy
    var remaining = defenderDeadwood.slice();
    var changed = true;

    while (changed) {
        changed = false;
        var stillRemaining = [];
        for (var i = 0; i < remaining.length; i++) {
            var card = remaining[i];
            var laid = false;
            for (var m = 0; m < melds.length; m++) {
                var candidate = melds[m].concat([card]);
                if (isMeld(candidate)) {
                    melds[m] = candidate;
                    laid = true;
                    changed = true;
                    break;
                }
            }
            if (!laid) stillRemaining.push(card);
        }
        remaining = stillRemaining;
    }

    return { melds: melds, remaining: remaining };
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
// knocking player deadwood < 10 → knock
// knocking player deadwood = 0 → gin (no layoffs allowed)
// undercut: defender ends with ≤ knocker deadwood → defender wins +25 + difference
// gin bonus: +25

var KNOCK_THRESHOLD = 10; // can knock when deadwood ≤ 10
var GIN_BONUS = 25;
var UNDERCUT_BONUS = 25;
var GAME_TARGET = 100; // points to win the game (standard)

// oklahoma gin: first upcard rank = knock threshold for that hand
function knockThresholdOklahoma(firstUpcardRank) {
    return Math.min(firstUpcardRank, 10); // Ace = 1 (no knock possible unless gin)
}

// Calculate hand result after layoff
// Returns { winner: 'knocker'|'defender', points, gin, undercut }
function calcolaRisultato(knocker, defender, isGin) {
    // knocker split already optimal
    var knockerDw = knocker.deadwoodPoints;
    var defenderResult;

    if (isGin) {
        // No layoff
        defenderResult = { remaining: defender.deadwood, dw: defender.deadwoodPoints };
    } else {
        var layoff = applicaLayoff(knocker.melds, defender.deadwood);
        var defDw = _deadwoodOf(layoff.remaining);
        defenderResult = { remaining: layoff.remaining, dw: defDw };
    }

    var defenderDw = defenderResult.dw;

    if (isGin) {
        return {
            winner: 'knocker',
            points: defenderDw + GIN_BONUS,
            gin: true,
            undercut: false
        };
    }

    if (defenderDw <= knockerDw) {
        // Undercut
        return {
            winner: 'defender',
            points: UNDERCUT_BONUS + (knockerDw - defenderDw),
            gin: false,
            undercut: true
        };
    }

    return {
        winner: 'knocker',
        points: defenderDw - knockerDw,
        gin: false,
        undercut: false
    };
}

// ─── TRANSLATIONS ────────────────────────────────────────────────────────────

var TRANSLATIONS = {
    it: {
        // UI labels
        'label-avversario':   'Amico',
        'label-giocatore':    'Tu',
        'label-mazzo':        'Mazzo',
        'label-scarti':       'Scarti',
        'label-knock':        'BUSSARE',
        'label-gin':          'GIN!',
        'label-pass':         'Passa',
        'label-pesca-mazzo':  'Pesca dal mazzo',
        'label-pesca-scarti': 'Pesca dagli scarti',
        'label-oklahoma':     'Oklahoma: soglia ',
        'label-soglia-knock': 'Soglia: ',

        // Stato gioco
        'stato-tuo-turno':    'Tuo turno — pesca una carta',
        'stato-pesca-fatta':  'Tuo turno — scarta una carta',
        'stato-avversario':   'Turno avversario…',
        'stato-layoff':       'Scarica le tue carte sui meld',
        'stato-fine':         '',

        // Fase upcard iniziale
        'stato-upcard-nondealer': 'Vuoi la prima carta scoperta?',
        'stato-upcard-dealer':    'L\'avversario ha passato. Vuoi la carta?',
        'stato-upcard-forzata':   'Tutti hanno passato — pesca obbligatoria!',
        'btn-prendi-upcard':      'PRENDI',
        'btn-pesca-forzata':      'PESCA',
        'btn-passa-upcard':       'PASSA',
        'label-mazziere':         'Mazziere',
        'toast-mazziere-tu':      'Sei il mazziere',
        'toast-mazziere-amico':   'L\'amico è il mazziere',
        'label-prossimo-mazziere':'Prossima mano — mazziere:',
        'label-tu':               'Tu',
        'label-amico':            'Amico',
        'toast-ai-passa':         'L\'amico ha passato',
        'toast-ai-prende':        'L\'amico ha preso la carta',

        // Modali
        'modal-nuova-titolo':      'Nuova Partita',
        'label-variante':          'Variante:',
        'label-gin-classico':      'Gin Rummy classico',
        'label-oklahoma-gin':      'Oklahoma Gin',
        'label-tipo-partita':      'Tipo partita:',
        'label-mano-singola':      'Mano singola',
        'label-partita-punti':     'Partita a punti fino a:',
        'btn-inizia':              'INIZIA',

        'modal-conferma-titolo':   'Nuova Partita',
        'label-conferma-abbandono':'Vuoi davvero abbandonare la partita in corso?',
        'btn-conferma-no':         'NO, CONTINUA',
        'btn-conferma-si':         'SÌ, NUOVA PARTITA',

        'modal-vittoria-titolo':   'HAI VINTO!',
        'label-complimenti':       'Complimenti!',
        'label-punteggio-finale-v':'Punteggio finale:',
        'btn-nuova-v':             'NUOVA PARTITA',

        'modal-sconfitta-titolo':  'HAI PERSO',
        'label-peccato':           'Peccato!',
        'label-punteggio-finale-p':'Punteggio finale:',
        'btn-nuova-s':             'NUOVA PARTITA',

        'meld-esito-vinto':        'HAI VINTO!',
        'meld-esito-perso':        'HAI PERSO',
        'btn-prossima-mano-lbl':   'PROSSIMA MANO',
        'label-layoff-istr':       'Puoi scaricare le tue carte sui meld dell\'avversario',
        'btn-conferma-layoff':     'CONFERMA',

        'label-gin-bonus':         'Bonus Gin',
        'label-undercut':          'Undercut',
        'label-punti-guadagnati':  'Punti mano:',
        'label-dead-knocker':      'Deadwood bussante:',
        'label-dead-difensore':    'Deadwood difensore:',
        'label-differenza':        'Differenza:',
        'label-totale-partita':    'Totale partita:',

        // Istruzioni
        'btn-istruzioni':          'REGOLE',

        // Link giochi
        'link-burraco':     'Burraco',
        'link-scala40':     'Scala 40',
        'link-machiavelli': 'Machiavelli',
        'link-home':        'TUTTI I GIOCHI',

        // Legal
        'label-privacy':           'Privacy Policy',
        'label-gestisci-cookie':   'Gestisci Cookie',
        'label-chi-sono':          'Chi Sono',

        // Meld panel
        'label-tuoi-meld':         'I tuoi meld',
        'label-tuo-deadwood':      'Tue carte sciolte',
        'label-avv-meld':          'Meld amico',
        'label-layoff-attaccate':  'Attaccate:',
        'label-avv-deadwood':      'Carte sciolte avv.',
        'label-risultato':         'Risultato mano',

        // Toast/info
        'toast-gin':               'GIN! Nessun deadwood!',
        'toast-knock':             'Bussata con ',
        'toast-ai-bussa':          'L\'amico ha bussato!',
        'toast-undercut':          'Undercut! L\'avversario vince!',
        'toast-non-puoi-bussare':  'Non puoi bussare: deadwood > ',
        'toast-pesca-prima':       'Devi prima pescare una carta',
        'toast-no-scarti-pescati': 'Non puoi scartare una carta appena pescata dagli scarti',
        'toast-scarta-prima':      'Devi scartare una carta per bussare',
        'toast-seleziona-scarto':  'Seleziona la carta da scartare per bussare'
    },
    en: {
        'label-avversario':   'Friend',
        'label-giocatore':    'You',
        'label-mazzo':        'Deck',
        'label-scarti':       'Discard',
        'label-knock':        'KNOCK',
        'label-gin':          'GIN!',
        'label-pass':         'Pass',
        'label-pesca-mazzo':  'Draw from deck',
        'label-pesca-scarti': 'Draw from discard',
        'label-oklahoma':     'Oklahoma: threshold ',
        'label-soglia-knock': 'Threshold: ',

        'stato-tuo-turno':    'Your turn — draw a card',
        'stato-pesca-fatta':  'Your turn — discard a card',
        'stato-avversario':   'Opponent\'s turn…',
        'stato-layoff':       'Lay off your cards onto melds',
        'stato-fine':         '',

        // Upcard phase
        'stato-upcard-nondealer': 'Take the first upcard?',
        'stato-upcard-dealer':    'Opponent passed. Take the upcard?',
        'stato-upcard-forzata':   'Both passed — mandatory draw!',
        'btn-prendi-upcard':      'TAKE',
        'btn-pesca-forzata':      'DRAW',
        'btn-passa-upcard':       'PASS',
        'label-mazziere':         'Dealer',
        'toast-mazziere-tu':      'You are the dealer',
        'toast-mazziere-amico':   'Friend is the dealer',
        'label-prossimo-mazziere':'Next hand — dealer:',
        'label-tu':               'You',
        'label-amico':            'Friend',
        'toast-ai-passa':         'Friend passed',
        'toast-ai-prende':        'Friend took the card',

        'modal-nuova-titolo':      'New Game',
        'label-variante':          'Variant:',
        'label-gin-classico':      'Classic Gin Rummy',
        'label-oklahoma-gin':      'Oklahoma Gin',
        'label-tipo-partita':      'Game type:',
        'label-mano-singola':      'Single hand',
        'label-partita-punti':     'Points match up to:',
        'btn-inizia':              'START',

        'modal-conferma-titolo':   'New Game',
        'label-conferma-abbandono':'Do you really want to abandon the current game?',
        'btn-conferma-no':         'NO, CONTINUE',
        'btn-conferma-si':         'YES, NEW GAME',

        'modal-vittoria-titolo':   'YOU WON!',
        'label-complimenti':       'Congratulations!',
        'label-punteggio-finale-v':'Final score:',
        'btn-nuova-v':             'NEW GAME',

        'modal-sconfitta-titolo':  'YOU LOST',
        'label-peccato':           'Bad luck!',
        'label-punteggio-finale-p':'Final score:',
        'btn-nuova-s':             'NEW GAME',

        'meld-esito-vinto':        'YOU WON!',
        'meld-esito-perso':        'YOU LOST',
        'btn-prossima-mano-lbl':   'NEXT HAND',
        'label-layoff-istr':       'You can lay off your cards onto the opponent\'s melds',
        'btn-conferma-layoff':     'CONFIRM',

        'label-gin-bonus':         'Gin bonus',
        'label-undercut':          'Undercut',
        'label-punti-guadagnati':  'Hand points:',
        'label-dead-knocker':      'Knocker deadwood:',
        'label-dead-difensore':    'Defender deadwood:',
        'label-differenza':        'Difference:',
        'label-totale-partita':    'Match total:',

        'btn-istruzioni':          'RULES',

        'link-burraco':     'Burraco',
        'link-scala40':     'Scala 40',
        'link-machiavelli': 'Machiavelli',
        'link-home':        'ALL GAMES',

        'label-privacy':           'Privacy Policy',
        'label-gestisci-cookie':   'Manage Cookies',
        'label-chi-sono':          'About Me',

        'label-tuoi-meld':         'Your melds',
        'label-tuo-deadwood':      'Your deadwood',
        'label-avv-meld':          'Friend melds',
        'label-layoff-attaccate':  'Attached:',
        'label-avv-deadwood':      'Opponent deadwood',
        'label-risultato':         'Hand result',

        'toast-gin':               'GIN! No deadwood!',
        'toast-knock':             'Knock with ',
        'toast-ai-bussa':          'Friend knocked!',
        'toast-undercut':          'Undercut! Opponent wins!',
        'toast-non-puoi-bussare':  'Can\'t knock: deadwood > ',
        'toast-pesca-prima':       'You must draw a card first',
        'toast-no-scarti-pescati': 'You cannot discard a card just drawn from the discard pile',
        'toast-scarta-prima':      'You must discard before knocking',
        'toast-seleziona-scarto':  'Select the card to discard for knocking'
    }
};

function t(key) {
    var lang = window.currentLang || 'en';
    var dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    return dict[key] !== undefined ? dict[key] : key;
}

// ─── CARD DISPLAY HELPERS ────────────────────────────────────────────────────

// Returns CSS background-position for the sprite
// Sprite: 17 columns (ranks 1-13 + back col 16), 4 rows (suits 0-3)
// Card size in sprite: 71×96 px
var CARD_W = 71;
var CARD_H = 96;

function cardSpritePos(rank, suit) {
    var col = rank - 1; // 0-indexed
    var row = suit;
    return {
        x: col * CARD_W,
        y: row * CARD_H
    };
}

function cardBackSpritePos() {
    return { x: 16 * CARD_W, y: 0 };
}

// Build a human-readable card label ("A♥", "10♠", …)
var SUIT_SYMBOLS = ['♥', '♦', '♣', '♠'];
function cardLabel(card) {
    var lang = window.currentLang || 'en';
    return RANK_NAMES[lang][card.rank] + SUIT_SYMBOLS[card.suit];
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

window.RummyCore = {
    // Deck
    creaMazzo: creaMazzo,
    mescola: mescola,
    cardPoints: cardPoints,

    // Meld detection
    isSet: isSet,
    isRun: isRun,
    isMeld: isMeld,
    trovaTuttiMeld: trovaTuttiMeld,
    calcolaOptimalMelds: calcolaOptimalMelds,

    // Scoring
    applicaLayoff: applicaLayoff,
    calcolaRisultato: calcolaRisultato,
    KNOCK_THRESHOLD: KNOCK_THRESHOLD,
    GIN_BONUS: GIN_BONUS,
    UNDERCUT_BONUS: UNDERCUT_BONUS,
    GAME_TARGET: GAME_TARGET,
    knockThresholdOklahoma: knockThresholdOklahoma,

    // Display
    cardSpritePos: cardSpritePos,
    cardBackSpritePos: cardBackSpritePos,
    cardLabel: cardLabel,
    CARD_W: CARD_W,
    CARD_H: CARD_H,
    SUIT_SYMBOLS: SUIT_SYMBOLS,

    // i18n
    t: t,
    TRANSLATIONS: TRANSLATIONS,

    // Multi-split
    trovaTuttiSplitDistinti: trovaTuttiSplitDistinti
};
