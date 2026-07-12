'use strict';

// ─── UNDO MANAGER ─────────────────────────────────────────────────────────────

class UndoManager {
    constructor() {
        this._stack = [];
    }

    save(state) {
        this._stack.push(JSON.stringify(state));
    }

    undo() {
        if (this._stack.length === 0) return null;
        return JSON.parse(this._stack.pop());
    }

    // Rimuove l'ultimo snapshot senza ripristinarlo (per annullare un save() su operazione fallita)
    discardLast() { if (this._stack.length > 0) this._stack.pop(); }

    canUndo() { return this._stack.length > 0; }
    clear()   { this._stack = []; }
    get depth() { return this._stack.length; }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function _removeId(arr, id) {
    const i = arr.indexOf(id);
    if (i !== -1) arr.splice(i, 1);
}

function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ─── S40GAME ──────────────────────────────────────────────────────────────────

/**
 * Core game engine for Scala 40.
 *
 * Architecture
 * ─────────────
 * this.allCards  — 108 Card objects, indexed by id. Built once, never modified.
 * this.state     — pure JSON-serialisable object containing ONLY numbers/booleans/
 *                  strings (no Card references). Safe to JSON.stringify at any time.
 * this.session   — cross-round data (totals, limit, player count). NOT in undo.
 * this.undo      — UndoManager that snapshots/restores this.state.
 *
 * State shape
 * ─────────────
 * {
 *   stock   : [id, ...],          // mazzo (top = last element)
 *   discard : [id, ...],          // scarti (top = last element)
 *   players : [                   // index 0 = human
 *     {
 *       hand  : [id, ...],        // mano
 *       melds : [                 // calate sul tavolo
 *         { type: 'tris'|'scala', cards: [id, ...] },
 *         ...
 *       ],
 *       has40 : false,            // ha calato almeno 40 punti questo round
 *     },
 *     ...
 *   ],
 *   currentPlayer : 0,
 *   hasDrawn      : false,        // il giocatore corrente ha già pescato
 *   phase         : 'deal'|'play'|'over',
 * }
 */
class S40Game {
    constructor(numPlayers) {
        if (numPlayers < 2 || numPlayers > 4) throw new Error('numPlayers must be 2-4');
        this.allCards = window.S40Core.buildDeck();  // 108 Card objects, id = index
        this.undo     = new UndoManager();

        this.session = {
            numPlayers,
            scores:     new Array(numPlayers).fill(0),
            scoreLimit: 150,
            roundCount: 0,
        };

        this.state = null;
        this.newRound();
    }

    // ── Card lookup ──────────────────────────────────────────────────────────

    /** Return the Card object for a given id. */
    card(id) { return this.allCards[id]; }

    /** Convert an array of IDs to an array of Card objects. */
    cards(ids) { return ids.map(id => this.allCards[id]); }

    // ── State initialisation ─────────────────────────────────────────────────

    newRound() {
        this.undo.clear();
        this.session.roundCount++;

        // Build a shuffled array of all 108 IDs
        const ids = this.allCards.map(c => c.id);
        window.S40Core.shuffleIds(ids);
        window.S40Core.shuffleIds(ids); // shuffle twice for good measure

        const n = this.session.numPlayers;

        // Deal 13 cards to each player (human face-up, AI face-down — UI concern)
        const players = [];
        for (let p = 0; p < n; p++) {
            players.push({ hand: ids.splice(0, 13), melds: [], has40: false });
        }

        // One face-up card starts the discard pile
        const firstDiscard = ids.splice(0, 1);

        this.state = {
            stock:         ids,         // remaining cards
            discard:       firstDiscard,
            players,
            currentPlayer: 0,
            hasDrawn:      false,
            phase:         'play',
        };

        // Sort human hand
        this._sortHand(0);
    }

    // ── Undo ────────────────────────────────────────────────────────────────

    saveUndo() {
        this.undo.save(this.state);
    }

    doUndo() {
        const prev = this.undo.undo();
        if (prev) this.state = prev;
        return prev !== null;
    }

    // ── Hand sorting ─────────────────────────────────────────────────────────

    /** Sort a player's hand: by rank, then by suit (jokers last). */
    _sortHand(playerIndex) {
        const hand = this.state.players[playerIndex].hand;
        hand.sort((a, b) => {
            const ca = this.card(a), cb = this.card(b);
            // Jokers always last
            if (ca.isJoker && !cb.isJoker) return  1;
            if (!ca.isJoker && cb.isJoker) return -1;
            if (ca.rank !== cb.rank) return ca.rank - cb.rank;
            // Same rank: sort by suit order C Q F P
            const suitOrder = { C: 0, Q: 1, F: 2, P: 3 };
            return (suitOrder[ca.suit] || 0) - (suitOrder[cb.suit] || 0);
        });
    }

    /** Sort a player's hand suit-first (useful for spotting runs). */
    sortHandBySuit(playerIndex) {
        const hand = this.state.players[playerIndex].hand;
        const suitOrder = { C: 0, Q: 1, F: 2, P: 3, J: 4 };
        hand.sort((a, b) => {
            const ca = this.card(a), cb = this.card(b);
            const sd = (suitOrder[ca.suit] || 0) - (suitOrder[cb.suit] || 0);
            if (sd !== 0) return sd;
            return ca.rank - cb.rank;
        });
    }

    // ── Draw phase ───────────────────────────────────────────────────────────

    /**
     * Draw the top card from the stock.
     * Se il mazzo è vuoto, rimescola gli scarti (tranne la carta in cima) nel mazzo.
     * Returns the card id drawn, or null if impossible.
     */
    drawFromStock() {
        const s = this.state;
        if (s.hasDrawn) return null;

        // Rimescola gli scarti nel mazzo se necessario
        if (s.stock.length === 0) {
            if (s.discard.length <= 1) return null;  // solo la carta in cima agli scarti → impossibile
            const topDiscard = s.discard.pop();       // tieni la carta visibile
            s.stock = s.discard.splice(0);            // sposta tutto il resto nel mazzo
            s.discard = [topDiscard];
            window.S40Core.shuffleIds(s.stock);
        }

        if (s.stock.length === 0) return null;

        const id = s.stock.pop();
        s.players[s.currentPlayer].hand.push(id);
        s.hasDrawn = true;
        return id;
    }

    /**
     * Draw the top card from the discard pile (solo la carta in cima, come in Scala 40).
     * Returns the card id taken, or null if not allowed.
     */
    drawFromDiscard() {
        const s = this.state;
        if (s.hasDrawn)             return null;
        if (s.discard.length === 0) return null;

        const id = s.discard.pop();   // prende solo la carta in cima
        s.players[s.currentPlayer].hand.push(id);
        s.hasDrawn = true;
        return id;
    }

    // ── Discard phase ─────────────────────────────────────────────────────────

    /**
     * Discard a card from the current player's hand.
     * Returns { ok: true } on success, or { ok: false, reason, [total] } on failure.
     *
     * Controllo 40 punti:
     *   Se il giocatore non ha ancora aperto (has40=false) ma ha calate sul tavolo,
     *   verifica che il totale punti delle calate sia ≥ 40.
     *   Se < 40 restituisce { ok: false, reason: 'need_40_on_discard', total } senza
     *   modificare lo stato: il giocatore può usare UNDO per annullare le calate.
     */
    discard(cardId) {
        const s      = this.state;
        const player = s.players[s.currentPlayer];
        const hand   = player.hand;

        if (!s.hasDrawn)           return { ok: false, reason: 'draw_first' };
        if (!hand.includes(cardId)) return { ok: false, reason: 'card_not_in_hand' };
        if (hand.length === 1)      return { ok: false, reason: 'cannot_empty' };

        // Verifica 40 punti se il giocatore ha calate ma non ha ancora aperto
        if (!player.has40 && player.melds.length > 0) {
            const { calcPoints } = window.S40Core;
            const meldTotal = player.melds.reduce(
                (sum, m) => sum + calcPoints(this.cards(m.cards)), 0
            );
            if (meldTotal < 40) {
                return { ok: false, reason: 'need_40_on_discard', total: meldTotal };
            }
            player.has40 = true;  // apertura confermata
        }

        _removeId(hand, cardId);
        s.discard.push(cardId);

        if (hand.length === 0) {
            s.phase = 'over';
            return { ok: true };
        }

        this._advanceTurn();
        return { ok: true };
    }

    _advanceTurn() {
        const s = this.state;
        s.hasDrawn      = false;
        s.currentPlayer = (s.currentPlayer + 1) % this.session.numPlayers;
    }

    // ── Meld operations ──────────────────────────────────────────────────────

    /**
     * Lay down a new meld (calata) from the current player's hand.
     * cardIds : array of ids to meld
     * Returns { ok: true, meldIndex } or { ok: false, reason }
     */
    layMeld(cardIds) {
        const s = this.state;
        const player = s.players[s.currentPlayer];

        if (!s.hasDrawn) return { ok: false, reason: 'draw_first' };

        // All cards must be in hand
        for (const id of cardIds) {
            if (!player.hand.includes(id)) return { ok: false, reason: 'card_not_in_hand' };
        }

        const cardObjs = this.cards(cardIds);
        const { isTrisValid, isScalaValid, MELD_TRIS, MELD_SCALA } = window.S40Core;

        let type;
        if      (isTrisValid(cardObjs))  type = MELD_TRIS;
        else if (isScalaValid(cardObjs)) type = MELD_SCALA;
        else return { ok: false, reason: 'invalid_meld' };

        // Nota: il controllo dei 40 punti avviene in discard(), non qui.
        // Il giocatore può calare più combinazioni nel turno; solo allo scarto
        // si verifica che il totale delle calate nuove raggiunga i 40 punti.

        // Remove cards from hand
        for (const id of cardIds) _removeId(player.hand, id);

        // Order the meld cards consistently
        const ordered = this._orderMeld(cardIds, type);
        const meldIndex = player.melds.length;
        player.melds.push({ type, cards: ordered });

        if (player.hand.length === 0) s.phase = 'over';

        return { ok: true, meldIndex };
    }

    /**
     * Attach a card from the current player's hand to an existing meld.
     * meldRef  : { playerIndex, meldIndex }
     * cardId   : id of card to attach
     * position : 'left' | 'right' | 'replace' (for joker replacement)
     * Returns { ok: true } or { ok: false, reason }
     */
    attachToMeld(meldRef, cardId, position) {
        const s = this.state;
        const currentPlayer = s.players[s.currentPlayer];

        if (!s.hasDrawn)                  return { ok: false, reason: 'draw_first' };
        if (!currentPlayer.has40)         return { ok: false, reason: 'need_40_first' };
        if (!currentPlayer.hand.includes(cardId)) return { ok: false, reason: 'card_not_in_hand' };
        if (currentPlayer.hand.length === 1)      return { ok: false, reason: 'cannot_empty' };

        const targetPlayer = s.players[meldRef.playerIndex];
        const meld         = targetPlayer.melds[meldRef.meldIndex];
        if (!meld) return { ok: false, reason: 'meld_not_found' };

        const { isTrisValid, isScalaValid } = window.S40Core;

        // Build the trial card list based on position
        let trial;
        if (position === 'left')  trial = [cardId, ...meld.cards];
        else                      trial = [...meld.cards, cardId];

        const trialObjs = this.cards(trial);
        const valid = meld.type === 'tris'
            ? isTrisValid(trialObjs)
            : isScalaValid(trialObjs);

        if (!valid) return { ok: false, reason: 'invalid_attach' };

        _removeId(currentPlayer.hand, cardId);
        if (position === 'left') meld.cards.unshift(cardId);
        else                     meld.cards.push(cardId);

        if (currentPlayer.hand.length === 0) s.phase = 'over';

        return { ok: true };
    }

    /**
     * Replace a joker in a meld with a natural card from the current player's hand.
     * The displaced joker goes to the player's hand.
     * Returns { ok: true, jokerReturned: id } or { ok: false, reason }
     */
    replaceJoker(meldRef, jokerPositionInMeld, replacementCardId) {
        const s = this.state;
        const currentPlayer = s.players[s.currentPlayer];

        if (!s.hasDrawn)          return { ok: false, reason: 'draw_first' };
        if (!currentPlayer.has40) return { ok: false, reason: 'need_40_first' };
        if (!currentPlayer.hand.includes(replacementCardId)) return { ok: false, reason: 'card_not_in_hand' };

        const targetPlayer = s.players[meldRef.playerIndex];
        const meld         = targetPlayer.melds[meldRef.meldIndex];
        if (!meld) return { ok: false, reason: 'meld_not_found' };

        const jokerId = meld.cards[jokerPositionInMeld];
        if (!this.card(jokerId).isJoker) return { ok: false, reason: 'not_a_joker' };

        // Trial: swap joker with replacement
        const trial = [...meld.cards];
        trial[jokerPositionInMeld] = replacementCardId;

        const { isTrisValid, isScalaValid } = window.S40Core;
        const trialObjs = this.cards(trial);
        const valid = meld.type === 'tris'
            ? isTrisValid(trialObjs)
            : isScalaValid(trialObjs);

        if (!valid) return { ok: false, reason: 'invalid_replace' };

        // Commit
        _removeId(currentPlayer.hand, replacementCardId);
        meld.cards[jokerPositionInMeld] = replacementCardId;
        currentPlayer.hand.push(jokerId);  // joker returns to hand

        return { ok: true, jokerReturned: jokerId };
    }

    // ── Scoring ──────────────────────────────────────────────────────────────

    /**
     * Score the current round. Call when phase === 'over'.
     * Returns an array of round deltas (positive = penalty for losers).
     * The winner (empty hand) scores 0; others score their hand total.
     */
    scoreRound() {
        const s = this.state;
        const { calcPoints } = window.S40Core;
        const deltas = [];

        for (const player of s.players) {
            deltas.push(calcPoints(this.cards(player.hand)));
        }

        for (let i = 0; i < this.session.numPlayers; i++) {
            this.session.scores[i] += deltas[i];
        }

        return deltas;
    }

    /** Return index of player(s) who have exceeded the score limit (game over). */
    eliminatedPlayers() {
        return this.session.scores
            .map((score, i) => ({ score, i }))
            .filter(({ score }) => score >= this.session.scoreLimit)
            .map(({ i }) => i);
    }

    // ── AI helpers ─────────────────────────────────────────────────────────────

    /**
     * Score each card in `hand` for AI discard decision.
     * Returns array of { id, score } sorted best-to-keep first (highest score = keep).
     */
    scoreHandForAI(playerIndex) {
        const s    = this.state;
        const hand = s.players[playerIndex].hand;
        const { AI_PTS, isTrisValid, isScalaValid } = window.S40Core;

        const scores = hand.map(id => ({ id, score: 0 }));

        // For each card, evaluate potential in combinations
        for (const entry of scores) {
            const c = this.card(entry.id);

            if (c.isJoker) { entry.score += AI_PTS.JOKER; continue; }

            // Check pairs and tris potential with other hand cards
            const sameRank  = hand.filter(id2 => !this.card(id2).isJoker && this.card(id2).rank === c.rank && id2 !== entry.id);
            const sameSuit  = hand.filter(id2 => !this.card(id2).isJoker && this.card(id2).suit === c.suit && id2 !== entry.id);

            if (sameRank.length >= 2) entry.score += AI_PTS.IN_TRIS;
            else if (sameRank.length === 1) {
                entry.score += AI_PTS.PAIR;
                // Bonus if the pair could complete a tris (there's another of the same rank in melds on table)
                const inMelds = s.players.some(p =>
                    p.melds.some(m => m.type === 'tris' && m.cards.some(id2 => this.card(id2).rank === c.rank))
                );
                if (inMelds) entry.score += AI_PTS.ATTACKABLE;
            }

            // Run potential (adjacent same-suit cards)
            const adjacent = sameSuit.filter(id2 => Math.abs(this.card(id2).rank - c.rank) <= 2);
            if (adjacent.length > 0) entry.score += AI_PTS.HALF_PAIR * adjacent.length;
        }

        return scores.sort((a, b) => b.score - a.score);
    }

    /**
     * Simple AI turn: draw from stock, lay any valid melds, discard worst card.
     * Returns a log of actions for UI animation.
     */
    aiTurn() {
        const s  = this.state;
        const pi = s.currentPlayer;

        this.saveUndo();
        const log = [];

        // Pesca
        const drawn = this.drawFromStock();
        log.push({ action: 'draw', from: 'stock', card: drawn });

        // Snapshot dopo la pesca (per eventuale rollback calate)
        const snapAfterDraw = _deepClone(s);

        // Tenta calate
        const meldsLaid = this._aiLayMelds(pi);
        log.push(...meldsLaid);

        // Se il giocatore AI non ha ancora aperto, verifica il totale calate
        const player = s.players[pi];
        if (!player.has40 && player.melds.length > 0) {
            const { calcPoints } = window.S40Core;
            const meldTotal = player.melds.reduce(
                (sum, m) => sum + calcPoints(this.cards(m.cards)), 0
            );
            if (meldTotal < 40) {
                // Rollback: ripristina stato dopo la pesca (senza calate)
                this.state = snapAfterDraw;
                log.splice(1);  // tieni solo la voce 'draw'
            }
            // Se >= 40: discard() imposterà has40=true
        }

        // Scarta la carta peggiore
        if (s.phase !== 'over') {
            const ranked    = this.scoreHandForAI(pi);
            const toDiscard = ranked[ranked.length - 1].id;
            this.discard(toDiscard);
            log.push({ action: 'discard', card: toDiscard });
        }

        return log;
    }

    /** Attempt to lay valid melds for an AI player. Internal. */
    _aiLayMelds(playerIndex) {
        const log  = [];
        const { isTrisValid, isScalaValid } = window.S40Core;
        const player = this.state.players[playerIndex];

        let changed = true;
        while (changed) {
            changed = false;
            const hand = [...player.hand];

            // Try all combinations of 3+ cards
            for (let size = hand.length; size >= 3; size--) {
                const combo = this._findValidCombo(hand, size, isTrisValid, isScalaValid);
                if (combo) {
                    const result = this.layMeld(combo);
                    if (result.ok) {
                        log.push({ action: 'meld', cards: combo, meldIndex: result.meldIndex });
                        changed = true;
                        break;
                    }
                }
            }
        }
        return log;
    }

    /** Brute-force find first valid combo of `size` cards from `hand`. */
    _findValidCombo(hand, size, isTrisValid, isScalaValid) {
        const { calcPoints } = window.S40Core;
        const n = hand.length;
        if (size > n) return null;

        const combo = (arr, k) => {
            if (k === 0) return [[]];
            if (arr.length < k) return [];
            const [first, ...rest] = arr;
            return [
                ...combo(rest, k - 1).map(c => [first, ...c]),
                ...combo(rest, k),
            ];
        };

        for (const subset of combo(hand, size)) {
            const cards = this.cards(subset);
            if (isTrisValid(cards) || isScalaValid(cards)) {
                // For first meld, check 40-point threshold
                const player = this.state.players[this.state.currentPlayer];
                if (!player.has40 && calcPoints(cards) < 40) continue;
                return subset;
            }
        }
        return null;
    }

    // ── Internal utilities ────────────────────────────────────────────────────

    /** Order meld cards: tris by rank then suit; scala by rank. */
    _orderMeld(ids, type) {
        const sorted = [...ids];
        const suitOrder = { C: 0, Q: 1, F: 2, P: 3, J: 4 };
        if (type === 'tris') {
            sorted.sort((a, b) => {
                const ca = this.card(a), cb = this.card(b);
                if (ca.isJoker) return  1;
                if (cb.isJoker) return -1;
                return (suitOrder[ca.suit] || 0) - (suitOrder[cb.suit] || 0);
            });
        } else {
            // scala: sort by rank (jokers sort by their gap position — UI handles display)
            sorted.sort((a, b) => {
                const ca = this.card(a), cb = this.card(b);
                if (ca.isJoker && cb.isJoker) return 0;
                if (ca.isJoker) return 0;  // joker stays in its dropped position
                if (cb.isJoker) return 0;
                return ca.rank - cb.rank;
            });
        }
        return sorted;
    }
}

// ─── Export ────────────────────────────────────────────────────────────────────

window.S40Game    = S40Game;
window.UndoManager = UndoManager;
