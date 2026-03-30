// rummy-game.js v1.0
// Gin Rummy — game state management, AI opponent

'use strict';

(function () {
    var Core = window.RummyCore;

    // ─── GAME STATE ──────────────────────────────────────────────────────────

    var game = {
        fase: 'attesa',        // 'attesa' | 'upcard' | 'pesca' | 'scarta' | 'layoff' | 'fine'
        variante: 'classico',  // 'classico' | 'oklahoma'
        tipoPartita: 'torneo', // 'singola' | 'torneo'
        limitePartita: 100,

        mazzo: [],
        scarti: [],            // discard pile, last = top

        manoGiocatore: [],
        manoAvversario: [],

        turno: 'giocatore',    // 'giocatore' | 'avversario'

        // Per il turno corrente
        pescato: false,        // has current player drawn this turn?
        ultimaPescataScarti: null, // card drawn from discard (can't be discarded same turn)

        // Oklahoma: knock threshold set from first upcard
        knockThreshold: Core.KNOCK_THRESHOLD,

        // Stato knock/gin
        knocker: null,         // 'giocatore' | 'avversario'
        isGin: false,

        // Melds calcolati per la fase layoff
        knockerMelds: null,    // { melds, deadwood, deadwoodPoints }
        defenderMelds: null,

        // Punteggi partita
        puntiGiocatore: 0,
        puntiAvversario: 0,
        manoCorrente: 0,

        // Dealer
        dealer: null,              // 'giocatore' | 'avversario' — chi distribuisce questa mano
        ultimoVincitoreMano: null, // determina il mazziere della mano successiva

        // Storico undo (solo ultima mossa del giocatore)
        _undoState: null
    };

    // ─── NEW HAND ────────────────────────────────────────────────────────────

    function nuovaMano() {
        game._undoState = null;

        var deck = Core.mescola(Core.creaMazzo());

        // Deal 10 cards each
        game.manoGiocatore = deck.splice(0, 10);
        game.manoAvversario = deck.splice(0, 10);
        _sortAI();

        // Remaining deck and first upcard
        game.mazzo = deck;
        game.scarti = [game.mazzo.pop()];

        game.pescato = false;
        game.ultimaPescataScarti = null;
        game.knocker = null;
        game.isGin = false;
        game.knockerMelds = null;
        game.defenderMelds = null;

        // Oklahoma: threshold = rank of first upcard (capped at 10; A=1 means gin only)
        if (game.variante === 'oklahoma') {
            game.knockThreshold = Core.knockThresholdOklahoma(game.scarti[0].rank);
        } else {
            game.knockThreshold = Core.KNOCK_THRESHOLD;
        }

        // Dealer: winner of last hand, or random for first hand
        game.dealer = game.ultimoVincitoreMano || (Math.random() < 0.5 ? 'giocatore' : 'avversario');
        var nonDealer = game.dealer === 'giocatore' ? 'avversario' : 'giocatore';

        // Non-dealer has first option on upcard
        game.fase = 'upcard';
        game.turno = nonDealer;
        game.manoCorrente++;
    }

    function nuovaPartita(variante, tipoPartita, limitePartita) {
        game.variante = variante || 'classico';
        game.tipoPartita = tipoPartita || 'torneo';
        game.limitePartita = limitePartita || Core.GAME_TARGET;
        game.puntiGiocatore = 0;
        game.puntiAvversario = 0;
        game.manoCorrente = 0;
        game.ultimoVincitoreMano = null; // prima mano: mazziere casuale
        nuovaMano();
    }

    // ─── UNDO SUPPORT ────────────────────────────────────────────────────────

    function _salvaStatoUndo() {
        game._undoState = {
            mazzo: game.mazzo.slice(),
            scarti: game.scarti.slice(),
            manoGiocatore: game.manoGiocatore.slice(),
            manoAvversario: game.manoAvversario.slice(),
            fase: game.fase,
            pescato: game.pescato,
            ultimaPescataScarti: game.ultimaPescataScarti
        };
    }

    function undo() {
        if (!game._undoState) return false;
        game.mazzo = game._undoState.mazzo;
        game.scarti = game._undoState.scarti;
        game.manoGiocatore = game._undoState.manoGiocatore;
        game.manoAvversario = game._undoState.manoAvversario;
        game.fase = game._undoState.fase;
        game.pescato = game._undoState.pescato;
        game.ultimaPescataScarti = game._undoState.ultimaPescataScarti;
        game._undoState = null;
        return true;
    }

    // ─── PLAYER ACTIONS ──────────────────────────────────────────────────────

    // Draw from deck (also used for forced draw in fase=upcard when both players passed)
    function pescaDalMazzo() {
        var isForcedUpcard = game.fase === 'upcard' && game.turno === 'giocatore';
        if (game.turno !== 'giocatore' || (game.fase !== 'pesca' && !isForcedUpcard)) return { ok: false, msg: 'not-your-turn' };
        if (game.mazzo.length === 0) {
            // Reshuffle discard pile (keep top card)
            var top = game.scarti.pop();
            game.mazzo = Core.mescola(game.scarti);
            game.scarti = [top];
        }
        _salvaStatoUndo();
        var card = game.mazzo.pop();
        game.manoGiocatore.push(card);
        game.pescato = true;
        game.ultimaPescataScarti = null;
        game.fase = 'scarta';
        return { ok: true, card: card };
    }

    // Player passes on taking the upcard (fase=upcard only)
    function passaUpcard() {
        if (game.fase !== 'upcard' || game.turno !== 'giocatore') return { ok: false };
        if (game.dealer === 'avversario') {
            // Player is non-dealer → AI (dealer) gets to decide
            game.turno = 'avversario';
            return { ok: true, next: 'ai-dealer-decides' };
        } else {
            // Player is dealer; AI (non-dealer) already passed → player passes too
            // Non-dealer (AI) must draw from deck — handled by aiUpcardTurn(true)
            game.turno = 'avversario';
            return { ok: true, next: 'ai-forced-draw' };
        }
    }

    // Draw from discard pile (also used for taking upcard in fase=upcard)
    function pescaDagliScarti() {
        var isUpcard = game.fase === 'upcard';
        if (!isUpcard && game.fase !== 'pesca') return { ok: false, msg: 'not-your-turn' };
        if (game.turno !== 'giocatore') return { ok: false, msg: 'not-your-turn' };
        if (game.scarti.length === 0) return { ok: false, msg: 'no-discard' };
        if (!isUpcard) _salvaStatoUndo();
        var card = game.scarti.pop();
        game.manoGiocatore.push(card);
        game.pescato = true;
        game.ultimaPescataScarti = card;
        game.fase = 'scarta';
        return { ok: true, card: card };
    }

    // Discard a card
    function scarta(cardId) {
        if (game.turno !== 'giocatore' || game.fase !== 'scarta') return { ok: false, msg: 'not-your-turn' };
        var idx = game.manoGiocatore.findIndex(function (c) { return c.id === cardId; });
        if (idx === -1) return { ok: false, msg: 'card-not-found' };

        // Cannot discard the card just drawn from discard pile
        if (game.ultimaPescataScarti && game.ultimaPescataScarti.id === cardId) {
            return { ok: false, msg: 'cannot-discard-just-drawn' };
        }

        var card = game.manoGiocatore.splice(idx, 1)[0];
        game.scarti.push(card);
        game.pescato = false;
        game.ultimaPescataScarti = null;
        game.fase = 'pesca';
        game.turno = 'avversario';
        return { ok: true };
    }

    // Player knocks or gins — discardId is the card to discard as part of the knock
    function bussa(isGin, discardId) {
        if (game.turno !== 'giocatore' || game.fase !== 'scarta') {
            return { ok: false, msg: 'must-draw-first' };
        }
        if (!discardId) return { ok: false, msg: 'select-discard' };

        var discardIdx = game.manoGiocatore.findIndex(function (c) { return c.id === discardId; });
        if (discardIdx === -1) return { ok: false, msg: 'card-not-found' };

        // Compute melds on the 10 remaining cards (excluding the discard)
        var handWithout = game.manoGiocatore.filter(function (c) { return c.id !== discardId; });
        var split = Core.calcolaOptimalMelds(handWithout);

        if (isGin) {
            if (split.deadwoodPoints !== 0) return { ok: false, msg: 'not-gin' };
        } else {
            if (split.deadwoodPoints > game.knockThreshold) {
                return { ok: false, msg: 'deadwood-too-high', dw: split.deadwoodPoints };
            }
        }

        // Actually discard the knock card
        _salvaStatoUndo();
        var discardCard = game.manoGiocatore.splice(discardIdx, 1)[0];
        game.scarti.push(discardCard);

        game.knocker = 'giocatore';
        game.isGin = isGin;
        game.knockerMelds = split;

        var defMelds0 = Core.calcolaOptimalMelds(game.manoAvversario);
        if (isGin) {
            game.defenderMelds = defMelds0;
            return _concludiMano();
        }

        // Auto layoff: apply optimal layoff, record which cards were attached
        var layoff = Core.applicaLayoff(split.melds, defMelds0.deadwood);
        var defDwPoints = layoff.remaining.reduce(function (s, c) { return s + c.points; }, 0);
        var layoffApplied = defMelds0.deadwood.filter(function (c) {
            return !layoff.remaining.some(function (r) { return r.id === c.id; });
        });
        game.defenderMelds = {
            melds: defMelds0.melds,
            deadwood: layoff.remaining,
            deadwoodPoints: defDwPoints,
            layoffCards: layoffApplied
        };
        return _concludiMano();
    }

    // Confirm layoff (called after UI layoff selection)
    function confermaLayoff(layoffCardIds) {
        if (game.fase !== 'layoff') return { ok: false };

        var defenderDeadwood = game.defenderMelds.deadwood;

        // Apply layoffs to knocker melds
        var layoffCards = layoffCardIds.map(function (id) {
            return defenderDeadwood.find(function (c) { return c.id === id; });
        }).filter(Boolean);

        var layoffResult = Core.applicaLayoff(game.knockerMelds.melds, layoffCards);
        var finalDefDw = defenderDeadwood.filter(function (c) {
            return !layoffCardIds.includes(c.id);
        });
        // Re-add non-laid-off cards to remaining
        finalDefDw = finalDefDw.concat(layoffResult.remaining.filter(function (c) {
            return !finalDefDw.find(function (d) { return d.id === c.id; });
        }));

        // Recalculate defender deadwood points
        var defDwPoints = finalDefDw.reduce(function (s, c) { return s + c.points; }, 0);

        // Cards that were successfully laid off = original deadwood not in finalDefDw
        var layoffApplied = defenderDeadwood.filter(function (c) {
            return !finalDefDw.some(function (d) { return d.id === c.id; });
        });

        game.defenderMelds = {
            melds: game.defenderMelds.melds,
            deadwood: finalDefDw,
            deadwoodPoints: defDwPoints,
            layoffCards: layoffApplied
        };

        return _concludiMano();
    }

    function _concludiMano() {
        var risultato = Core.calcolaRisultato(game.knockerMelds, game.defenderMelds, game.isGin);

        if (risultato.winner === 'knocker') {
            if (game.knocker === 'giocatore') {
                game.puntiGiocatore += risultato.points;
            } else {
                game.puntiAvversario += risultato.points;
            }
        } else {
            // Defender wins
            if (game.knocker === 'giocatore') {
                game.puntiAvversario += risultato.points;
            } else {
                game.puntiGiocatore += risultato.points;
            }
        }

        game.fase = 'fine';

        // Il vincitore della mano diventa mazziere della prossima
        game.ultimoVincitoreMano = risultato.winner === 'knocker' ? game.knocker :
            (game.knocker === 'giocatore' ? 'avversario' : 'giocatore');

        var partitaFinita = false;
        var vincitorePartita = null;

        if (game.tipoPartita === 'torneo') {
            if (game.puntiGiocatore >= game.limitePartita) {
                partitaFinita = true;
                vincitorePartita = 'giocatore';
            } else if (game.puntiAvversario >= game.limitePartita) {
                partitaFinita = true;
                vincitorePartita = 'avversario';
            }
        } else {
            // singola: partita finita dopo una mano
            partitaFinita = true;
            vincitorePartita = risultato.winner === 'knocker' ? game.knocker :
                (game.knocker === 'giocatore' ? 'avversario' : 'giocatore');
        }

        return {
            ok: true,
            risultato: risultato,
            puntiGiocatore: game.puntiGiocatore,
            puntiAvversario: game.puntiAvversario,
            partitaFinita: partitaFinita,
            vincitorePartita: vincitorePartita
        };
    }

    // ─── AI OPPONENT ─────────────────────────────────────────────────────────

    // Delay for AI moves (ms)
    var AI_DELAY = 700;

    // hooks: { onDraw(drawInfo, next), onDiscard(card, next) } — opzionali per animazioni
    function _aiTurn(hooksOrDone, onDone) {
        var hooks, done;
        if (typeof hooksOrDone === 'function') { hooks = {}; done = hooksOrDone; }
        else { hooks = hooksOrDone || {}; done = onDone; }

        if (game.turno !== 'avversario') return;

        setTimeout(function () {
            var drawInfo = _aiDraw();
            var afterDraw = function () {
                setTimeout(function () {
                    var result = _aiDiscard();
                    if (hooks.onDiscard && result.aiScartata) {
                        hooks.onDiscard(result.aiScartata, function () { done(result); });
                    } else {
                        done(result);
                    }
                }, hooks.onDraw ? 100 : AI_DELAY);
            };
            if (hooks.onDraw) {
                hooks.onDraw(drawInfo, afterDraw);
            } else {
                afterDraw();
            }
        }, AI_DELAY);
    }

    function _sortAI() {
        game.manoAvversario.sort(function (a, b) {
            return a.rank !== b.rank ? a.rank - b.rank : a.suit - b.suit;
        });
    }

    // AI draw: pick up discard if it forms a meld; otherwise draw from deck
    // Returns { from: 'mazzo'|'scarti', card }
    function _aiDraw() {
        if (game.scarti.length > 0) {
            var topDiscard = game.scarti[game.scarti.length - 1];
            var testHand = game.manoAvversario.concat([topDiscard]);
            var withDiscard = Core.calcolaOptimalMelds(testHand);
            var withoutDiscard = Core.calcolaOptimalMelds(game.manoAvversario);

            if (withDiscard.deadwoodPoints < withoutDiscard.deadwoodPoints) {
                game.scarti.pop();
                game.manoAvversario.push(topDiscard);
                _sortAI();
                return { from: 'scarti', card: topDiscard };
            }
        }

        // Draw from deck
        if (game.mazzo.length === 0) {
            var top = game.scarti.pop();
            game.mazzo = Core.mescola(game.scarti);
            game.scarti = [top];
        }
        var drawn = game.mazzo.pop();
        game.manoAvversario.push(drawn);
        _sortAI();
        return { from: 'mazzo', card: drawn };
    }

    // AI discard: find best discard (minimizes deadwood on remaining 10 cards)
    // Also checks if it can knock/gin after discarding
    function _aiDiscard() {
        // Try each possible discard, compute melds on remaining 10 cards
        var bestDiscard = null;
        var bestDeadwood = Infinity;
        var bestSplit = null;

        game.manoAvversario.forEach(function (card) {
            var hand10 = game.manoAvversario.filter(function (c) { return c.id !== card.id; });
            var split10 = Core.calcolaOptimalMelds(hand10);
            if (split10.deadwoodPoints < bestDeadwood) {
                bestDeadwood = split10.deadwoodPoints;
                bestDiscard = card;
                bestSplit = split10;
            }
        });

        var discardIdx = game.manoAvversario.findIndex(function (c) { return c.id === bestDiscard.id; });

        // Can gin? (0 deadwood on 10-card hand after discard)
        if (bestDeadwood === 0) {
            game.manoAvversario.splice(discardIdx, 1);
            game.scarti.push(bestDiscard);
            game.knocker = 'avversario';
            game.isGin = true;
            game.knockerMelds = bestSplit;
            game.defenderMelds = Core.calcolaOptimalMelds(game.manoGiocatore);
            return _concludiMano();
        }

        // Can knock? — auto layoff, show result to player
        if (bestDeadwood <= game.knockThreshold) {
            game.manoAvversario.splice(discardIdx, 1);
            game.scarti.push(bestDiscard);
            game.knocker = 'avversario';
            game.isGin = false;
            game.knockerMelds = bestSplit;
            var defMelds0 = Core.calcolaOptimalMelds(game.manoGiocatore);
            var layoff = Core.applicaLayoff(bestSplit.melds, defMelds0.deadwood);
            var defDwPoints = layoff.remaining.reduce(function (s, c) { return s + c.points; }, 0);
            var layoffApplied = defMelds0.deadwood.filter(function (c) {
                return !layoff.remaining.some(function (r) { return r.id === c.id; });
            });
            game.defenderMelds = {
                melds: defMelds0.melds,
                deadwood: layoff.remaining,
                deadwoodPoints: defDwPoints,
                layoffCards: layoffApplied
            };
            return _concludiMano();
        }

        // Normal discard: use the card that minimizes remaining deadwood
        game.manoAvversario.splice(discardIdx, 1);
        game.scarti.push(bestDiscard);

        game.fase = 'pesca';
        game.turno = 'giocatore';
        return { ok: true, aiScartata: bestDiscard };
    }

    // ─── AI UPCARD PHASE ─────────────────────────────────────────────────────

    // AI handles its upcard decision (or forced draw).
    // forced=true → AI must draw from deck (no choice).
    // Calls onDone(result) when done.
    function _aiUpcardTurn(forced, onDone) {
        setTimeout(function () {
            if (forced) {
                // Forced draw from deck
                if (game.mazzo.length === 0) {
                    var top = game.scarti.pop();
                    game.mazzo = Core.mescola(game.scarti);
                    game.scarti = [top];
                }
                game.manoAvversario.push(game.mazzo.pop());
                _sortAI();
                setTimeout(function () { onDone(_aiDiscard()); }, AI_DELAY);
                return;
            }

            // AI decides: take upcard?
            var shouldTake = false;
            if (game.scarti.length > 0) {
                var topCard = game.scarti[game.scarti.length - 1];
                var withCard  = Core.calcolaOptimalMelds(game.manoAvversario.concat([topCard]));
                var without   = Core.calcolaOptimalMelds(game.manoAvversario);
                shouldTake = withCard.deadwoodPoints < without.deadwoodPoints;
            }

            if (shouldTake) {
                var takenCard = game.scarti.pop();
                game.manoAvversario.push(takenCard);
                _sortAI();
                setTimeout(function () {
                    var discardRes = _aiDiscard();
                    discardRes.card = takenCard; // la carta presa per l'animazione
                    onDone(discardRes);
                }, AI_DELAY);
            } else {
                // AI passes
                var nonDealer = game.dealer === 'giocatore' ? 'avversario' : 'giocatore';
                if (game.turno === nonDealer) {
                    // AI is non-dealer → dealer (player) gets to decide
                    game.turno = 'giocatore';
                    onDone({ ok: true, next: 'player-dealer-decides' });
                } else {
                    // AI is dealer → player (non-dealer) already passed → player must draw from deck
                    // Leave state in 'upcard' phase, turno=giocatore, so UI can show a button
                    game.turno = 'giocatore';
                    onDone({ ok: true, next: 'player-forced-draw' });
                }
            }
        }, AI_DELAY);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    function topScarto() {
        return game.scarti.length > 0 ? game.scarti[game.scarti.length - 1] : null;
    }

    function canKnock() {
        if (game.turno !== 'giocatore' || game.fase !== 'scarta') return false;
        return game.manoGiocatore.some(function (c) {
            var hand = game.manoGiocatore.filter(function (x) { return x.id !== c.id; });
            return Core.calcolaOptimalMelds(hand).deadwoodPoints <= game.knockThreshold;
        });
    }

    function canGin() {
        if (game.turno !== 'giocatore' || game.fase !== 'scarta') return false;
        return game.manoGiocatore.some(function (c) {
            var hand = game.manoGiocatore.filter(function (x) { return x.id !== c.id; });
            return Core.calcolaOptimalMelds(hand).deadwoodPoints === 0;
        });
    }

    function getPlayerSplit() {
        return Core.calcolaOptimalMelds(game.manoGiocatore);
    }

    // ─── EXPORTS ─────────────────────────────────────────────────────────────

    window.RummyGame = {
        game: game,
        nuovaPartita: nuovaPartita,
        nuovaMano: nuovaMano,
        undo: undo,

        passaUpcard: passaUpcard,
        pescaDalMazzo: pescaDalMazzo,
        pescaDagliScarti: pescaDagliScarti,
        scarta: scarta,
        bussa: bussa,
        confermaLayoff: confermaLayoff,

        aiTurn: _aiTurn,
        aiUpcardTurn: _aiUpcardTurn,

        topScarto: topScarto,
        canKnock: canKnock,
        canGin: canGin,
        getPlayerSplit: getPlayerSplit
    };

})();
