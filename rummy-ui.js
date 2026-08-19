// rummy-ui.js v2.7
// Gin Rummy — rendering, event handling, language, modals

'use strict';

(function () {
    var Core = window.RummyCore;
    var Game = window.RummyGame;
    var game = Game.game;

    // ─── LANGUAGE ────────────────────────────────────────────────────────────

    function setLanguage(lang) {
        window.currentLang = lang;
        localStorage.setItem('userLanguage', lang);
        updateUILabels();
        if (game.fase && game.fase !== 'attesa') {
            render();
        }
    }

    function updateUILabels() {
        var ids = [
            'label-avversario', 'label-giocatore', 'label-mazzo', 'label-scarti',
            'label-knock', 'label-gin',
            'modal-nuova-titolo', 'label-variante', 'label-gin-classico',
            'label-oklahoma-gin', 'label-tipo-partita', 'label-mano-singola',
            'label-partita-punti', 'btn-inizia',
            'modal-conferma-titolo', 'label-conferma-abbandono', 'btn-conferma-no', 'btn-conferma-si',
            'modal-vittoria-titolo', 'label-complimenti', 'label-punteggio-finale-v', 'btn-nuova-v',
            'modal-sconfitta-titolo', 'label-peccato', 'label-punteggio-finale-p', 'btn-nuova-s',
            'label-layoff-istr', 'btn-conferma-layoff',
            'btn-istruzioni',
            'label-privacy', 'label-gestisci-cookie', 'label-chi-sono',
            'label-tuoi-meld', 'label-tuo-deadwood', 'label-avv-meld', 'label-avv-deadwood',
            'label-risultato'
        ];
        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = Core.t(id);
        });

        // Update link-giochi
        var linkMap = {
            'link-burraco': Core.t('link-burraco'),
            'link-scala40': Core.t('link-scala40'),
            'link-machiavelli': Core.t('link-machiavelli'),
            'link-home': Core.t('link-home')
        };
        Object.keys(linkMap).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = linkMap[id];
        });

        // Reset "prossima mano" label (solo se non siamo in attesa del click finale)
        var lblProssima = document.getElementById('btn-prossima-mano-lbl');
        if (lblProssima && !_pendingFinePartita) lblProssima.textContent = Core.t('btn-prossima-mano-lbl');

        // Active lang button
        ['it', 'en'].forEach(function (l) {
            var btn = document.getElementById('btn-lang-' + l);
            if (btn) btn.classList.toggle('active', l === window.currentLang);
        });
    }

    // ─── CARD RENDERING ──────────────────────────────────────────────────────

    var SPRITE_URL = 'images/scala40/conjollyplus.png';
    var SPRITE_SEL_URL = 'images/scala40/conjollyselplus.png';

    function creaCarta(card, options) {
        options = options || {};
        var div = document.createElement('div');
        div.className = 'carta';
        if (options.hidden) {
            div.classList.add('carta-coperta');
            var pos = Core.cardBackSpritePos();
            div.style.backgroundImage = 'url(' + SPRITE_URL + ')';
            div.style.backgroundPosition = '-' + pos.x + 'px -' + pos.y + 'px';
        } else {
            var pos2 = Core.cardSpritePos(card.rank, card.suit);
            var spriteUrl = options.selected ? SPRITE_SEL_URL
                          : options.green    ? SPRITE_GREEN_URL
                          : options.blu      ? SPRITE_BLU_URL
                          : SPRITE_URL;
            div.style.backgroundImage = 'url(' + spriteUrl + ')';
            div.style.backgroundPosition = '-' + pos2.x + 'px -' + pos2.y + 'px';
            div.setAttribute('data-id', card.id);
            div.setAttribute('title', Core.cardLabel(card));
        }
        if (options.cssClass) div.classList.add(options.cssClass);
        return div;
    }

    // ─── SELECTION STATE ─────────────────────────────────────────────────────

    var selectedCardId = null; // currently selected card id (for discard)
    var trascinamento = null;  // drag state

    // Multi-split state
    var _allSplits    = [];
    var _splitIdx     = 0;
    var _colorMode    = true;
    var _handKey      = '';    // cache key to avoid recomputing every render

    var _scoperte     = false; // mostra carte avversario scoperte
    var _forcedDraw   = false; // giocatore deve pescare dal mazzo (entrambi hanno passato upcard)
    var _pendingKnock = false; // KNOCK premuto: la prossima selezione carta esegue il knock
    var _pendingGin   = false; // GIN premuto: la prossima selezione carta esegue il gin
    var _pendingFinePartita = null; // 'giocatore'|'avversario' se stiamo mostrando le carte dell'ultima mano
    var _suoni        = {};

    function _playSound(nome) {
        var a = _suoni[nome];
        if (!a) return;
        a.currentTime = 0;
        a.play().catch(function () {});
    }

    function toggleSeleziona(cardId) {
        if (selectedCardId === cardId) {
            selectedCardId = null;
            renderManoGiocatore();
            aggiornaBottoni();
            return;
        }
        selectedCardId = cardId;
        if (_pendingKnock || _pendingGin) {
            var isGin = _pendingGin;
            _pendingKnock = false;
            _pendingGin   = false;
            _eseguiBussa(isGin, cardId);
            return;
        }
        renderManoGiocatore();
        aggiornaBottoni();
    }

    function _eseguiBussa(isGin, cardId) {
        var res = Game.bussa(isGin, cardId);
        if (!res.ok) {
            if (res.msg === 'deadwood-too-high') mostraToast(Core.t('toast-non-puoi-bussare') + game.knockThreshold);
            selectedCardId = null;
            renderManoGiocatore();
            aggiornaBottoni();
            return;
        }
        if (isGin) {
            _playSound('gin');
            mostraToast(Core.t('toast-gin'));
        } else {
            _playSound('knock');
        }
        selectedCardId = null;
        render();
        _gestisciFine(res);
    }

    // Layoff selection
    var layoffSelected = new Set();

    function toggleLayoff(cardId) {
        if (layoffSelected.has(cardId)) {
            layoffSelected.delete(cardId);
        } else {
            layoffSelected.add(cardId);
        }
        renderLayoffPanel();
    }

    // ─── RENDER ──────────────────────────────────────────────────────────────

    function render() {
        renderManoAvversario();
        renderMazzo();
        renderScarti();
        renderManoGiocatore();
        aggiornaStato();
        aggiornaBottoni();
        aggiornaPunteggi();
        aggiornaDealer();
    }

    function renderManoAvversario() {
        var container = document.getElementById('carte-avversario');
        if (!container) return;
        container.innerHTML = '';
        game.manoAvversario.forEach(function (card) {
            container.appendChild(creaCarta(_scoperte ? card : null, { hidden: !_scoperte }));
        });
        var ncarte = document.getElementById('ncarte-avversario');
        if (ncarte) ncarte.textContent = game.manoAvversario.length;
    }

    function renderMazzo() {
        var el = document.getElementById('mazzo');
        if (!el) return;
        el.innerHTML = '';
        if (game.mazzo.length > 0) {
            var topMazzo = _scoperte ? game.mazzo[game.mazzo.length - 1] : null;
            el.appendChild(creaCarta(topMazzo, { hidden: !_scoperte }));
        }
        var cnt = document.getElementById('mazzo-count');
        if (cnt) cnt.textContent = game.mazzo.length;
    }

    function renderScarti() {
        var el = document.getElementById('scarti');
        if (!el) return;
        el.innerHTML = '';
        var top = Game.topScarto();
        if (top) {
            var div = creaCarta(top);
            div.setAttribute('data-id', top.id);
            el.appendChild(div);
        }
        var cnt = document.getElementById('scarti-count');
        if (cnt) cnt.textContent = game.scarti.length;
    }

    var SPRITE_BLU_URL   = 'images/scala40/conjollyselblu.png';
    var SPRITE_GREEN_URL = 'images/scala40/conjollyselgreen.png';

    function _aggiornaSplits() {
        var key = game.manoGiocatore.map(function (c) { return c.id; }).join(',');
        if (key === _handKey) return;
        _handKey = key;

        var allMelds = Core.trovaTuttiMeld(game.manoGiocatore);
        var splits   = Core.trovaTuttiSplitDistinti(game.manoGiocatore);

        // Filtro 1: nessun meld valido rimane completamente inutilizzato nel deadwood
        var massimali = splits.filter(function (sp) {
            return allMelds.every(function (meld) {
                var tutteDeadwood = meld.every(function (c) { return !sp.meldIdSet.has(c.id); });
                return !tutteDeadwood;
            });
        });

        // Filtro 2: nessun meld usato può essere esteso con carte del deadwood dello stesso split.
        // Es: tris(7♦7♣7♥) con 7♠ nel deadwood è non-massimale perché esiste poker(7♠7♦7♣7♥).
        var deadwooodIds = function (sp) { return new Set(sp.deadwood.map(function (c) { return c.id; })); };
        var massimali2 = massimali.filter(function (sp) {
            var dwIds = deadwooodIds(sp);
            return sp.melds.every(function (meld) {
                var meldIds = new Set(meld.map(function (c) { return c.id; }));
                // cerca un supermeld che contiene tutte le carte di meld + almeno una carta del deadwood
                var hasSuperMeld = allMelds.some(function (big) {
                    if (big.length <= meld.length) return false;
                    var allPresent = meld.every(function (c) {
                        return big.some(function (bc) { return bc.id === c.id; });
                    });
                    if (!allPresent) return false;
                    // le carte extra del big meld devono essere tutte nel deadwood corrente
                    return big.every(function (bc) { return meldIds.has(bc.id) || dwIds.has(bc.id); });
                });
                return !hasSuperMeld;
            });
        });

        _allSplits = massimali2.length > 0 ? massimali2 : (massimali.length > 0 ? massimali : splits);
        _splitIdx  = 0;
    }

    function renderManoGiocatore() {
        var container = document.getElementById('carte-giocatore');
        if (!container) return;
        container.innerHTML = '';

        _aggiornaSplits();

        var curSplit   = _allSplits[_splitIdx] || { meldIdSet: new Set(), deadwoodPoints: 0 };
        var curMeldIds = curSplit.meldIdSet || new Set();

        // Verde = carta contesa: è in un meld del split corrente MA in un MELD DIVERSO in almeno un altro split.
        // Azzurro = carta stabile: è in un meld e non appare in meld diversi in altri split.
        var ambigiueIds = new Set();
        if (_colorMode && _allSplits.length > 1) {
            curSplit.melds.forEach(function (meld) {
                var meldKey = meld.map(function (c) { return c.id; }).sort(function (a, b) { return a - b; }).join(',');
                meld.forEach(function (card) {
                    _allSplits.forEach(function (sp, idx) {
                        if (idx === _splitIdx) return;
                        sp.melds.forEach(function (otherMeld) {
                            if (otherMeld.some(function (c) { return c.id === card.id; })) {
                                var otherKey = otherMeld.map(function (c) { return c.id; }).sort(function (a, b) { return a - b; }).join(',');
                                if (otherKey !== meldKey) ambigiueIds.add(card.id);
                            }
                        });
                    });
                });
            });
        }

        game.manoGiocatore.forEach(function (card) {
            var isSelected = card.id === selectedCardId;
            var inMeld     = _colorMode && curMeldIds.has(card.id);
            var isGreen    = inMeld && ambigiueIds.has(card.id);
            var isBlu      = inMeld && !isGreen;
            var div = creaCarta(card, { selected: isSelected, blu: isBlu, green: isGreen });
            div.addEventListener('click', function () {
                if (game.turno !== 'giocatore') return;
                if (game.fase === 'scarta') toggleSeleziona(card.id);
            });
            container.appendChild(div);
        });

        _renderDeadwoodInfo();
    }

    function _renderDeadwoodInfo() {
        var el = document.getElementById('deadwood-info');
        if (!el) return;

        if (_allSplits.length === 0) { el.textContent = 'Deadwood: 0'; return; }

        var html = 'Deadwood: ';
        _allSplits.forEach(function (sp, idx) {
            var active = idx === _splitIdx;
            html += '<span class="dw-option' + (active ? ' dw-active' : '') + '" data-idx="' + idx + '">'
                  + sp.deadwoodPoints + '</span> ';
        });
        if (_colorMode) {
            html += '<span class="dw-option dw-off">OFF</span>';
        } else {
            html += '<span class="dw-option dw-on">ON</span>';
        }
        el.innerHTML = html;

        // Attach click handlers — NON resettare _handKey così _aggiornaSplits salta e _splitIdx è preservato
        el.querySelectorAll('.dw-option[data-idx]').forEach(function (span) {
            span.addEventListener('click', function () {
                _splitIdx = parseInt(this.getAttribute('data-idx'), 10);
                renderManoGiocatore();
            });
        });
        var offBtn = el.querySelector('.dw-off, .dw-on');
        if (offBtn) {
            offBtn.addEventListener('click', function () {
                _colorMode = !_colorMode;
                renderManoGiocatore();
            });
        }
    }

    function aggiornaDealer() {
        var badgeG = document.getElementById('dealer-badge-giocatore');
        var badgeA = document.getElementById('dealer-badge-avversario');
        if (badgeG) badgeG.style.display = game.dealer === 'giocatore' ? 'block' : 'none';
        if (badgeA) badgeA.style.display = game.dealer === 'avversario' ? 'block' : 'none';
    }

    function aggiornaStato() {
        var el = document.getElementById('stato-gioco');
        if (!el) return;
        var key;
        if (game.fase === 'upcard' && game.turno === 'giocatore') {
            key = _forcedDraw ? 'stato-upcard-forzata' : (game.dealer === 'avversario' ? 'stato-upcard-nondealer' : 'stato-upcard-dealer');
        } else if (game.fase === 'upcard') {
            key = 'stato-avversario';
        } else if (game.fase === 'pesca' && game.turno === 'giocatore') {
            key = 'stato-tuo-turno';
        } else if (game.fase === 'scarta' && game.turno === 'giocatore') {
            key = 'stato-pesca-fatta';
        } else if (game.turno === 'avversario') {
            key = 'stato-avversario';
        } else if (game.fase === 'layoff') {
            key = 'stato-layoff';
        } else {
            key = 'stato-fine';
        }
        el.textContent = Core.t(key);

        // Titolo gioco
        var titoloNome = document.getElementById('titolo-nome');
        if (titoloNome) {
            titoloNome.textContent = game.variante === 'oklahoma' ? 'Oklahoma Gin' : 'Gin Rummy';
        }

        // Oklahoma threshold
        var ogEl = document.getElementById('oklahoma-soglia');
        if (ogEl) {
            ogEl.style.display = 'block';
            var prefix = game.variante === 'oklahoma' ? Core.t('label-oklahoma') : Core.t('label-soglia-knock');
            ogEl.textContent = prefix + game.knockThreshold;
        }
    }

    function aggiornaBottoni() {
        var btnKnock  = document.getElementById('btn-knock');
        var btnGin    = document.getElementById('btn-gin');
        var btnScarta = document.getElementById('btn-scarta');
        var btnPrendi = document.getElementById('btn-prendi-upcard');
        var btnPassa  = document.getElementById('btn-passa-upcard');

        var isUpcard = game.fase === 'upcard' && game.turno === 'giocatore';
        if (btnPrendi) {
            btnPrendi.style.display = isUpcard ? 'inline-block' : 'none';
            // In forced-draw state, change label to PESCA
            var prendiSpan = btnPrendi.querySelector('span') || btnPrendi;
            prendiSpan.textContent = _forcedDraw ? Core.t('btn-pesca-forzata') : Core.t('btn-prendi-upcard');
        }
        if (btnPassa)  btnPassa.style.display  = (isUpcard && !_forcedDraw) ? 'inline-block' : 'none';

        if (btnKnock) {
            btnKnock.classList.toggle('visibile', !isUpcard && Game.canKnock() && !Game.canGin());
            btnKnock.classList.toggle('armed', _pendingKnock);
        }
        if (btnGin) {
            btnGin.classList.toggle('visibile', !isUpcard && Game.canGin());
            btnGin.classList.toggle('armed', _pendingGin);
        }

        if (btnScarta) {
            var canDiscard = game.turno === 'giocatore' && game.fase === 'scarta' && selectedCardId !== null;
            btnScarta.classList.toggle('attivo', canDiscard);
        }
    }

    function aggiornaPunteggi() {
        var gEl = document.getElementById('punti-giocatore');
        var aEl = document.getElementById('punti-avversario');
        var lEl = document.getElementById('punti-limite');
        if (gEl) gEl.textContent = game.puntiGiocatore;
        if (aEl) aEl.textContent = game.puntiAvversario;
        if (lEl) {
            var limDiv = document.getElementById('punteggio-limite');
            if (game.tipoPartita === 'torneo') {
                if (lEl) lEl.textContent = game.limitePartita;
                if (limDiv) limDiv.style.display = 'block';
            } else {
                if (limDiv) limDiv.style.display = 'none';
            }
        }
    }

    // ─── KNOCK/GIN PANEL ─────────────────────────────────────────────────────

    function mostraKnockPanel(risultato) {
        var panel = document.getElementById('area-meld');
        if (!panel) return;

        // Helper: ordina le carte di un meld per rank (scale in ordine crescente)
        function meldOrdinato(meld) {
            return meld.slice().sort(function (a, b) { return a.rank - b.rank; });
        }

        // Helper: renderizza melds + deadwood in un container
        // Le carte attaccate (layoffCards) vengono mostrate con un badge "attaccata"
        function renderMeldContainer(el, meldsData) {
            el.innerHTML = '';
            var layoffIds = new Set((meldsData.layoffCards || []).map(function (c) { return c.id; }));

            meldsData.melds.forEach(function (meld) {
                var gruppo = document.createElement('div');
                gruppo.className = 'meld-gruppo';
                meldOrdinato(meld).forEach(function (card) {
                    var wrap = document.createElement('div');
                    wrap.className = 'meld-card-wrap';
                    wrap.appendChild(creaCarta(card, { cssClass: 'meld-card' }));
                    if (layoffIds.has(card.id)) {
                        var badge = document.createElement('span');
                        badge.className = 'layoff-badge';
                        badge.textContent = Core.t('label-layoff-attaccate');
                        wrap.appendChild(badge);
                    }
                    gruppo.appendChild(wrap);
                });
                el.appendChild(gruppo);
            });
            if (meldsData.deadwood && meldsData.deadwood.length > 0) {
                meldsData.deadwood.forEach(function (card) {
                    el.appendChild(creaCarta(card, { cssClass: 'deadwood-card' }));
                });
            }
        }

        // Adjust section labels based on who knocked
        var isPlayerKnocker = game.knocker === 'giocatore';
        var labelKnocker = document.getElementById('label-tuoi-meld');
        var labelDef     = document.getElementById('label-avv-meld');
        if (labelKnocker) labelKnocker.textContent = isPlayerKnocker ? Core.t('label-tuoi-meld') : Core.t('label-avv-meld');
        if (labelDef)     labelDef.textContent     = isPlayerKnocker ? Core.t('label-avv-meld') : Core.t('label-tuoi-meld');

        var knockerMeldEl = document.getElementById('knocker-melds');
        if (knockerMeldEl) renderMeldContainer(knockerMeldEl, game.knockerMelds);

        var defMeldEl = document.getElementById('defender-melds');
        if (defMeldEl) renderMeldContainer(defMeldEl, game.defenderMelds);

        // Risultato dettagliato
        var risEl = document.getElementById('meld-risultato');
        if (risEl && risultato) {
            var kdw = game.knockerMelds.deadwoodPoints;
            var ddw = game.defenderMelds.deadwoodPoints;
            var diff = Math.abs(ddw - kdw);
            var lines = [];

            var knockerName  = game.knocker === 'giocatore' ? Core.t('label-tu') : Core.t('label-amico');
            var difensoreName = game.knocker === 'giocatore' ? Core.t('label-amico') : Core.t('label-tu');
            lines.push(Core.t('label-dead-knocker') + ' (' + knockerName + ') <b>' + kdw + '</b>');
            lines.push(Core.t('label-dead-difensore') + ' (' + difensoreName + ') <b>' + ddw + '</b>');
            lines.push(Core.t('label-differenza') + ' <b>' + diff + '</b>');
            if (risultato.gin)      lines.push(Core.t('label-gin-bonus')  + ': <b>+' + Core.GIN_BONUS + '</b>');
            if (risultato.undercut) lines.push(Core.t('label-undercut')   + ': <b>+' + Core.UNDERCUT_BONUS + '</b>');
            lines.push(Core.t('label-punti-guadagnati') + ' <b>' + risultato.points + '</b>');

            // Totale partita
            var ptG = game.puntiGiocatore, ptA = game.puntiAvversario;
            var limiteStr = game.tipoPartita === 'torneo' ? ' (fino a ' + game.limitePartita + ')' : '';
            lines.push(Core.t('label-totale-partita') + ' <b>' +
                Core.t('label-tu') + ' ' + ptG + ' — ' + Core.t('label-amico') + ' ' + ptA + '</b>' + limiteStr);

            risEl.innerHTML = lines.join('<br>');
        }

        var esitoEl = document.getElementById('meld-esito-finale');
        if (esitoEl) esitoEl.style.display = 'none';

        var layoffHint = document.getElementById('label-layoff-istr');
        var btnConferma = document.getElementById('btn-conferma-layoff');
        var btnProssima = document.getElementById('btn-prossima-mano');
        // Fase layoff (risultato=null, giocatore bussa): mostra CONFERMA
        // Fase risultati (risultato!=null): mostra solo PROSSIMA MANO
        var isLayoffPhase = !risultato && game.knocker === 'giocatore';
        if (layoffHint) layoffHint.parentElement.style.display = isLayoffPhase ? '' : 'none';
        if (btnConferma) btnConferma.style.display = isLayoffPhase ? '' : 'none';
        if (btnProssima) btnProssima.style.display = isLayoffPhase ? 'none' : 'inline-block';

        panel.classList.add('visibile');
    }

    function nascondiKnockPanel() {
        var panel = document.getElementById('area-meld');
        if (panel) panel.classList.remove('visibile');
        layoffSelected.clear();
    }

    function renderLayoffPanel() {
        // Render defender deadwood with layoff selection highlight
        var defMeldEl = document.getElementById('defender-melds');
        if (!defMeldEl || game.fase !== 'layoff') return;
        defMeldEl.innerHTML = '';

        game.defenderMelds.melds.forEach(function (meld) {
            var gruppo = document.createElement('div');
            gruppo.className = 'meld-gruppo';
            meld.forEach(function (card) {
                gruppo.appendChild(creaCarta(card, { cssClass: 'meld-card' }));
            });
            defMeldEl.appendChild(gruppo);
        });

        game.defenderMelds.deadwood.forEach(function (card) {
            var div = creaCarta(card, {
                cssClass: layoffSelected.has(card.id) ? 'layoff-candidate' : 'deadwood-card'
            });
            div.addEventListener('click', function () { toggleLayoff(card.id); });
            defMeldEl.appendChild(div);
        });
    }

    // ─── TOAST ───────────────────────────────────────────────────────────────

    function mostraToast(msg, duration) {
        var toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('visibile');
        setTimeout(function () { toast.classList.remove('visibile'); }, duration || 2500);
    }

    // ─── MODALS ──────────────────────────────────────────────────────────────

    function mostraModal(id) {
        var schermo = document.getElementById('schermo');
        var modal = document.getElementById(id);
        if (schermo) schermo.style.display = 'block';
        if (modal) modal.style.display = 'block';
    }

    function nascondiModal(id) {
        var schermo = document.getElementById('schermo');
        var modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        // Hide screen only if no other modal is open
        var anyOpen = document.querySelectorAll('.modal[style*="block"]').length > 0;
        if (!anyOpen && schermo) schermo.style.display = 'none';
    }

    function mostraModalNuova() {
        updateUILabels();
        _ripristinaPrefsModal();
        mostraModal('modal-nuova');
    }

    function _ripristinaPrefsModal() {
        var radioVariante = document.querySelector('input[name="variante"][value="' + game.variante + '"]');
        if (radioVariante) radioVariante.checked = true;
        var radioTipo = document.querySelector('input[name="tipo-partita"][value="' + game.tipoPartita + '"]');
        if (radioTipo) radioTipo.checked = true;
        var selLimite = document.getElementById('sel-limite-partita');
        if (selLimite) {
            var limStr = String(game.limitePartita);
            var opt = selLimite.querySelector('option[value="' + limStr + '"]');
            if (opt) {
                selLimite.value = limStr;
            } else {
                selLimite.value = 'custom';
                var inpCustom = document.getElementById('inp-limite-custom');
                if (inpCustom) inpCustom.value = limStr;
                var divCustom = document.getElementById('div-limite-custom');
                if (divCustom) divCustom.style.display = '';
            }
        }
    }

    function mostraModalFine(partitaFinita, vincitorePartita, risultato) {
        if (partitaFinita) {
            nascondiModal('modal-nuova');
            _pendingFinePartita = vincitorePartita;
            var lblNext = document.getElementById('btn-prossima-mano-lbl');
            if (lblNext) lblNext.textContent = Core.t('btn-nuova-v');
            var infoMazziere = document.getElementById('info-prossimo-mazziere');
            if (infoMazziere) infoMazziere.style.display = 'none';
            mostraKnockPanel(risultato);
            // Mostra HAI VINTO / HAI PERSO nel pannello carte
            var esitoEl = document.getElementById('meld-esito-finale');
            if (esitoEl) {
                var vinto = vincitorePartita === 'giocatore';
                esitoEl.textContent = Core.t(vinto ? 'meld-esito-vinto' : 'meld-esito-perso');
                esitoEl.className = vinto ? 'vinto' : 'perso';
                esitoEl.style.display = '';
            }
        } else {
            mostraKnockPanel(risultato);
        }
    }

    // ─── EVENT HANDLERS ──────────────────────────────────────────────────────

    function setupEventi() {
        // Lang switcher
        ['it', 'en'].forEach(function (l) {
            var btn = document.getElementById('btn-lang-' + l);
            if (btn) btn.addEventListener('click', function () { setLanguage(l); });
        });

        // Draw from deck
        var btnMazzo = document.getElementById('mazzo');
        if (btnMazzo) {
            btnMazzo.addEventListener('click', function () {
                if (game.turno !== 'giocatore' || game.fase !== 'pesca') return;
                _pescaDalMazzoConAnim();
            });
        }

        // Click su scarti: pesca (fase pesca/upcard) OPPURE scarta carta selezionata (fase scarta)
        var elScarti = document.getElementById('scarti');
        if (elScarti) {
            elScarti.addEventListener('click', function () {
                if (game.turno !== 'giocatore') return;
                if ((game.fase === 'upcard' && !_forcedDraw) || game.fase === 'pesca') {
                    _pescaDagliScartiConAnim();
                } else if (game.fase === 'scarta' && selectedCardId !== null) {
                    _scartaCartaId(selectedCardId);
                }
            });
        }

        // Discard selected card (button)
        var btnScarta = document.getElementById('btn-scarta');
        if (btnScarta) {
            btnScarta.addEventListener('click', function () {
                if (selectedCardId === null) { mostraToast(Core.t('toast-pesca-prima')); return; }
                _scartaCartaId(selectedCardId);
            });
        }

        // Tasto destro su area vuota contenitore giocatore → pesca dal mazzo
        var areaGiocatore = document.getElementById('area-giocatore');
        if (areaGiocatore) {
            areaGiocatore.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                if (game.turno !== 'giocatore' || game.fase !== 'pesca') return;
                if (e.target.closest('.carta')) return;
                _pescaDalMazzoConAnim();
            });
        }

        // Drag + right-click (globali)
        document.addEventListener('mousedown', _onMouseDown);
        document.addEventListener('mousemove', _onMouseMove);
        document.addEventListener('mouseup',   _onMouseUp);
        document.addEventListener('contextmenu', _onRightClick);

        // Knock
        var btnKnock = document.getElementById('btn-knock');
        if (btnKnock) {
            btnKnock.addEventListener('click', function () {
                if (game.fase !== 'scarta' || game.turno !== 'giocatore') {
                    mostraToast(Core.t('toast-scarta-prima'));
                    return;
                }
                if (selectedCardId) {
                    // Carta già selezionata: bussa subito
                    _pendingKnock = false;
                    _pendingGin   = false;
                    _eseguiBussa(false, selectedCardId);
                } else {
                    // Arma il knock: la prossima carta selezionata busserà
                    _pendingKnock = true;
                    _pendingGin   = false;
                    mostraToast(Core.t('toast-seleziona-scarto'));
                    aggiornaBottoni();
                }
            });
        }

        // Gin
        var btnGin = document.getElementById('btn-gin');
        if (btnGin) {
            btnGin.addEventListener('click', function () {
                if (game.fase !== 'scarta' || game.turno !== 'giocatore') return;
                if (selectedCardId) {
                    _pendingKnock = false;
                    _pendingGin   = false;
                    _eseguiBussa(true, selectedCardId);
                } else {
                    _pendingGin   = true;
                    _pendingKnock = false;
                    mostraToast(Core.t('toast-seleziona-scarto'));
                    aggiornaBottoni();
                }
            });
        }

        // Confirm layoff
        var btnConferma = document.getElementById('btn-conferma-layoff');
        if (btnConferma) {
            btnConferma.addEventListener('click', function () {
                var res = Game.confermaLayoff(Array.from(layoffSelected));
                nascondiKnockPanel();
                if (res.ok) _gestisciFine(res);
            });
        }

        // Upcard: PRENDI (o PESCA in caso di pesca forzata)
        var btnPrendi = document.getElementById('btn-prendi-upcard');
        if (btnPrendi) {
            btnPrendi.addEventListener('click', function () {
                if (game.fase !== 'upcard' || game.turno !== 'giocatore') return;
                if (_forcedDraw) {
                    _forcedDraw = false;
                    _pescaDalMazzoConAnim();
                } else {
                    _pescaDagliScartiConAnim();
                }
            });
        }

        // Upcard: PASSA
        var btnPassa = document.getElementById('btn-passa-upcard');
        if (btnPassa) {
            btnPassa.addEventListener('click', function () {
                if (game.fase !== 'upcard' || game.turno !== 'giocatore') return;
                var res = Game.passaUpcard();
                if (!res.ok) return;
                _playSound('passa');
                render();
                if (res.next === 'ai-dealer-decides') {
                    _aiUpcardConAnim(false);
                } else if (res.next === 'ai-forced-draw') {
                    mostraToast(Core.t('stato-upcard-forzata'), 2000);
                    _aiUpcardConAnim(true);
                }
            });
        }

        // Prossima mano button
        var btnNext = document.getElementById('btn-prossima-mano');
        if (btnNext) {
            btnNext.addEventListener('click', function () {
                localStorage.setItem('_rummy_resume', JSON.stringify({
                    variante: game.variante,
                    tipoPartita: game.tipoPartita,
                    limitePartita: game.limitePartita,
                    puntiGiocatore: game.puntiGiocatore,
                    puntiAvversario: game.puntiAvversario
                }));
                location.reload();
            });
        }

        // New game button. Ricarica la pagina, quindi la partita in corso e' persa
        // senza rimedio: a partita viva si passa dalla modale di conferma (che porta
        // anche il banner di fine partita), altrimenti si va dritti.
        function _eseguiNuovaPartita() {
            localStorage.setItem('_rummy_prefs', JSON.stringify({
                variante: game.variante,
                tipoPartita: game.tipoPartita,
                limitePartita: game.limitePartita
            }));
            location.reload();
        }

        var btnNuova = document.getElementById('btn-nuova');
        if (btnNuova) btnNuova.addEventListener('click', function () {
            if (game.fase === 'attesa' || game.fase === 'fine') {
                _eseguiNuovaPartita();
                return;
            }
            mostraModal('modal-conferma-nuova');
            if (typeof setupAmazonFinishBanner === 'function') {
                setupAmazonFinishBanner('modal-conferma-nuova', {
                    modalStyle: { overflow: 'visible' },
                    targetTop: 375,
                    applyModalTop: false,
                    bannerHeight: 250,
                    bannerTopOffset: 265,
                    bannerWidth: 700,
                    leftOffset: -160
                });
            }
        });

        var btnConfNo = document.getElementById('btn-conferma-no');
        if (btnConfNo) btnConfNo.addEventListener('click', function () {
            nascondiModal('modal-conferma-nuova');
            // Il banner resterebbe parcheggiato nella modale nascosta: con AdSense
            // reale e' un'unita' servita ma invisibile, meglio rimuoverla.
            var vecchio = document.querySelector('#modal-conferma-nuova .finish-banner');
            if (vecchio) vecchio.remove();
        });
        var btnConfSi = document.getElementById('btn-conferma-si');
        if (btnConfSi) btnConfSi.addEventListener('click', _eseguiNuovaPartita);

        // Scoperte toggle
        var btnScoperte = document.getElementById('btn-scoperte');
        if (btnScoperte) {
            btnScoperte.addEventListener('click', function () {
                _scoperte = !_scoperte;
                btnScoperte.classList.toggle('attivo', _scoperte);
                render();
            });
        }

        // Start button in new game modal
        var btnInizia = document.getElementById('btn-inizia');
        if (btnInizia) {
            btnInizia.addEventListener('click', function () {
                var varianteEl = document.querySelector('input[name="variante"]:checked');
                var tipoEl = document.querySelector('input[name="tipo-partita"]:checked');
                var selLimite = document.getElementById('sel-limite-partita');
                var variante = varianteEl ? varianteEl.value : 'classico';
                var tipo = tipoEl ? tipoEl.value : 'torneo';
                var limite = Core.GAME_TARGET;
                if (selLimite) {
                    if (selLimite.value === 'custom') {
                        var inpCustom = document.getElementById('inp-limite-custom');
                        limite = inpCustom ? parseInt(inpCustom.value, 10) : Core.GAME_TARGET;
                        if (isNaN(limite) || limite < 10) limite = Core.GAME_TARGET;
                    } else {
                        limite = parseInt(selLimite.value, 10);
                        if (isNaN(limite)) limite = Core.GAME_TARGET;
                    }
                }
                nascondiModal('modal-nuova');
                Game.nuovaPartita(variante, tipo, limite);
                selectedCardId = null;
                _pendingKnock = false; _pendingGin = false;
                layoffSelected.clear();
                _forcedDraw = false;
                _scoperte = false;
                var btnSc = document.getElementById('btn-scoperte');
                if (btnSc) btnSc.classList.remove('attivo');
                nascondiKnockPanel();
                render();
                _animaDeal(function () { _avviaFaseUpcard(); });
            });
        }

        // Limit select custom option
        var selLimite = document.getElementById('sel-limite-partita');
        var divCustom = document.getElementById('div-limite-custom');
        if (selLimite && divCustom) {
            selLimite.addEventListener('change', function () {
                divCustom.style.display = this.value === 'custom' ? '' : 'none';
            });
            var inpCustom = document.getElementById('inp-limite-custom');
            if (inpCustom) {
                inpCustom.addEventListener('change', function () {
                    // Create/update option dynamically
                    var val = parseInt(this.value, 10);
                    if (isNaN(val) || val < 10) return;
                    var opt = selLimite.querySelector('option[value="custom"]');
                    if (opt) {
                        // We'll read inp-limite-custom at start time
                    }
                });
            }
        }

        // New game from victory/defeat modal
        ['btn-nuova-v', 'btn-nuova-s'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', function () {
                localStorage.setItem('_rummy_resume', JSON.stringify({
                    variante: game.variante,
                    tipoPartita: game.tipoPartita,
                    limitePartita: game.limitePartita,
                    puntiGiocatore: game.puntiGiocatore,
                    puntiAvversario: game.puntiAvversario
                }));
                location.reload();
            });
        });

        // Ordina per numero
        var btnOrdinaNum = document.getElementById('btn-ordina-numero');
        if (btnOrdinaNum) {
            btnOrdinaNum.addEventListener('click', function () {
                game.manoGiocatore.sort(function (a, b) {
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return a.suit - b.suit;
                });
                renderManoGiocatore();
            });
        }

        // Ordina per seme
        var btnOrdinaSeme = document.getElementById('btn-ordina-seme');
        if (btnOrdinaSeme) {
            btnOrdinaSeme.addEventListener('click', function () {
                game.manoGiocatore.sort(function (a, b) {
                    if (a.suit !== b.suit) return a.suit - b.suit;
                    return a.rank - b.rank;
                });
                renderManoGiocatore();
            });
        }

        // Undo
        var btnUndo = document.getElementById('btn-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', function () {
                if (Game.undo()) {
                    selectedCardId = null;
                    _pendingKnock = false; _pendingGin = false;
                    render();
                }
            });
        }

        // Instructions — opens rules page
        var btnIstr = document.getElementById('btn-istruzioni');
        if (btnIstr) btnIstr.addEventListener('click', function () {
            var lang = window.currentLang || 'en';
            var url = lang === 'it' ? 'regole-rummy.html' : 'regole-rummy-en.html';
            window.open(url, '_blank');
        });
    }

    // ─── RIORDINA MANO ───────────────────────────────────────────────────────

    function _riordina(fromId, toId) {
        var mano = game.manoGiocatore;
        var fromIdx = mano.findIndex(function (c) { return c.id === fromId; });
        var toIdx   = mano.findIndex(function (c) { return c.id === toId; });
        if (fromIdx === -1 || toIdx === -1) { render(); return; }
        var card = mano.splice(fromIdx, 1)[0];
        mano.splice(toIdx, 0, card);
        render();
    }

    // ─── ANIMAZIONE VOLO CARTA ────────────────────────────────────────────────

    var ANIM_DURATION = 400; // ms

    // fromEl può essere un Element oppure un DOMRect già catturato
    function _animaVolo(fromEl, toEl, card, faceUp, onComplete) {
        if (!fromEl || !toEl) { if (onComplete) onComplete(); return; }
        var fromR = (typeof fromEl.getBoundingClientRect === 'function') ? fromEl.getBoundingClientRect() : fromEl;
        var toR   = (typeof toEl.getBoundingClientRect   === 'function') ? toEl.getBoundingClientRect()   : toEl;
        if (!fromR.width && !fromR.height) { if (onComplete) onComplete(); return; }

        var el = creaCarta(faceUp ? card : null, { hidden: !faceUp });
        el.style.position   = 'fixed';
        el.style.left       = fromR.left + 'px';
        el.style.top        = fromR.top  + 'px';
        el.style.width      = '71px';
        el.style.height     = '96px';
        el.style.margin     = '0';
        el.style.zIndex     = '99999';
        el.style.pointerEvents = 'none';
        el.style.transition = 'left ' + ANIM_DURATION + 'ms ease, top ' + ANIM_DURATION + 'ms ease';
        document.body.appendChild(el);

        // force reflow before starting transition
        el.getBoundingClientRect();

        // Se toR è una carta esatta (71×96), punta direttamente; altrimenti centra nel container
        var exactTarget = toR.width <= 71 && toR.height <= 96;
        el.style.left = exactTarget ? toR.left + 'px' : (toR.left + toR.width  / 2 - 35) + 'px';
        el.style.top  = exactTarget ? toR.top  + 'px' : (toR.top  + toR.height / 2 - 48) + 'px';

        var done = false;
        el.addEventListener('transitionend', function () {
            if (done) return; done = true;
            el.remove();
            if (onComplete) onComplete();
        }, { once: true });
        // safety timeout in case transitionend doesn't fire
        setTimeout(function () {
            if (done) return; done = true;
            el.remove();
            if (onComplete) onComplete();
        }, ANIM_DURATION + 200);
    }

    // ─── PESCA/SCARTO CON ANIMAZIONE ─────────────────────────────────────────

    function _pescaDalMazzoConAnim() {
        var fromEl = document.getElementById('mazzo');
        var fromR  = fromEl ? fromEl.getBoundingClientRect() : null;
        var res = Game.pescaDalMazzo();
        if (!res.ok) return;
        _playSound('pesca');
        selectedCardId = null;
        _pendingKnock = false; _pendingGin = false;
        // Render completo: la carta appare nella posizione finale
        render();
        // Trova l'elemento della carta appena pescata e nascondilo
        var cardEl = document.querySelector('#carte-giocatore .carta[data-id="' + res.card.id + '"]');
        if (cardEl) cardEl.style.visibility = 'hidden';
        var toR = cardEl ? cardEl.getBoundingClientRect() : null;
        _animaVolo(fromR, { left: toR ? toR.left : 0, top: toR ? toR.top : 0, width: 71, height: 96 }, null, false, function () {
            if (cardEl) cardEl.style.visibility = '';
        });
    }

    function _pescaDagliScartiConAnim() {
        var fromEl  = document.getElementById('scarti');
        var fromR   = fromEl ? fromEl.getBoundingClientRect() : null;
        var topCard = Game.topScarto();
        var res = Game.pescaDagliScarti();
        if (!res.ok) return;
        _playSound('pesca');
        selectedCardId = null;
        _pendingKnock = false; _pendingGin = false;
        render();
        var cardEl = document.querySelector('#carte-giocatore .carta[data-id="' + res.card.id + '"]');
        if (cardEl) cardEl.style.visibility = 'hidden';
        var toR = cardEl ? cardEl.getBoundingClientRect() : null;
        _animaVolo(fromR, { left: toR ? toR.left : 0, top: toR ? toR.top : 0, width: 71, height: 96 }, topCard, true, function () {
            if (cardEl) cardEl.style.visibility = '';
        });
    }

    // ─── SCARTO HELPER ───────────────────────────────────────────────────────

    function _scartaCartaId(cardId) {
        // Cattura rect e dati PRIMA di modificare il DOM
        var cardEl   = document.querySelector('.carta[data-id="' + cardId + '"]');
        var fromR    = cardEl ? cardEl.getBoundingClientRect() : null;
        var cardData = game.manoGiocatore.find(function (c) { return c.id === cardId; });
        var toEl     = document.getElementById('scarti');

        var res = Game.scarta(cardId);
        if (!res.ok) {
            if (res.msg === 'cannot-discard-just-drawn') mostraToast(Core.t('toast-no-scarti-pescati'));
            return;
        }
        _playSound('scarta');
        selectedCardId = null;
        renderManoGiocatore();
        _animaVolo(fromR, toEl, cardData, true, function () {
            render();
            // aiTurn parte solo dopo che l'animazione scarto è completata
        });
        Game.aiTurn({
            onDraw: function (drawInfo, next) {
                var fromEl = drawInfo.from === 'scarti'
                    ? document.getElementById('scarti')
                    : document.getElementById('mazzo');
                var toEl = document.getElementById('area-avversario');
                // lo stato è già aggiornato: renderizza solo mazzo/scarti prima dell'animazione
                renderMazzo();
                renderScarti();
                _playSound('pesca');
                _animaVolo(fromEl, toEl, drawInfo.card, drawInfo.from === 'scarti', function () {
                    renderManoAvversario();
                    next();
                });
            },
            onDiscard: function (card, next) {
                var fromEl = document.getElementById('area-avversario');
                var toEl   = document.getElementById('scarti');
                _playSound('scarta');
                _animaVolo(fromEl, toEl, card, true, function () {
                    render();
                    next();
                });
            }
        }, function (aiResult) {
            render();
            _gestisciAiResult(aiResult);
        });
    }

    function _gestisciAiResult(res) {
        if (!res || !res.ok) return;
        if (res.risultato) _gestisciFine(res);
    }

    // ─── DRAG & DROP ─────────────────────────────────────────────────────────

    function _cardFromEl(el) {
        if (!el) return null;
        var cartaEl = el.closest ? el.closest('.carta[data-id]') : null;
        if (!cartaEl) return null;
        var id = parseInt(cartaEl.getAttribute('data-id'), 10);
        return { el: cartaEl, card: game.manoGiocatore.find(function (c) { return c.id === id; }) };
    }

    function _onMouseDown(e) {
        if (e.button !== 0) return;
        if (game.turno !== 'giocatore') return;
        if (game.fase !== 'scarta' && game.fase !== 'pesca') return;
        var hit = _cardFromEl(e.target);
        if (!hit || !hit.card) return;
        trascinamento = { card: hit.card, el: hit.el, startX: e.clientX, startY: e.clientY, moved: false, fantasma: null };
    }

    function _onMouseMove(e) {
        if (!trascinamento) return;
        var dx = e.clientX - trascinamento.startX;
        var dy = e.clientY - trascinamento.startY;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        trascinamento.moved = true;

        if (!trascinamento.fantasma) {
            var rect = trascinamento.el.getBoundingClientRect();
            trascinamento.offsetX = e.clientX - rect.left;
            trascinamento.offsetY = e.clientY - rect.top;

            var f = document.createElement('div');
            f.style.cssText = 'position:fixed;z-index:50000;pointer-events:none;border-radius:5px;box-shadow:5px 5px 20px rgba(0,0,0,0.5);';
            f.style.width  = rect.width  + 'px';
            f.style.height = rect.height + 'px';
            var pos = Core.cardSpritePos(trascinamento.card.rank, trascinamento.card.suit);
            var scaleX = rect.width  / Core.CARD_W;
            var scaleY = rect.height / Core.CARD_H;
            f.style.backgroundImage = 'url(images/scala40/conjollyselplus.png)';
            f.style.backgroundSize  = (1233 * scaleX) + 'px ' + (384 * scaleY) + 'px';
            f.style.backgroundPosition = (-pos.x * scaleX) + 'px ' + (-pos.y * scaleY) + 'px';
            document.body.appendChild(f);
            trascinamento.fantasma = f;
            trascinamento.el.style.visibility = 'hidden';
        }

        trascinamento.fantasma.style.left = (e.clientX - trascinamento.offsetX) + 'px';
        trascinamento.fantasma.style.top  = (e.clientY - trascinamento.offsetY) + 'px';

        // Evidenzia scarti se ci siamo sopra
        var elScarti = document.getElementById('scarti');
        if (elScarti) {
            var r = elScarti.getBoundingClientRect();
            var over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            elScarti.classList.toggle('drop-target', over);
        }
    }

    function _onMouseUp(e) {
        if (!trascinamento) return;
        if (trascinamento.fantasma) trascinamento.fantasma.remove();
        trascinamento.el.style.visibility = '';
        var elScarti = document.getElementById('scarti');
        var elScartiWrap = document.getElementById('scarti-wrap');
        if (elScarti) elScarti.classList.remove('drop-target');

        if (!trascinamento.moved) {
            // Click semplice: lascia gestire al click handler sulla carta
            trascinamento = null;
            return;
        }

        // Hit test con elementFromPoint (più robusto di getBoundingClientRect su elementi senza dimensione)
        var elUnder = document.elementFromPoint(e.clientX, e.clientY);
        var suScarti = elScarti && (elScarti === elUnder || elScarti.contains(elUnder))
                    || elScartiWrap && (elScartiWrap === elUnder || elScartiWrap.contains(elUnder));

        var cardId = trascinamento.card.id;
        trascinamento = null;

        if (suScarti && game.fase === 'scarta') {
            if (_pendingKnock || _pendingGin) {
                var isGin = _pendingGin;
                _pendingKnock = false; _pendingGin = false;
                _eseguiBussa(isGin, cardId);
            } else {
                _scartaCartaId(cardId);
            }
        } else {
            // Controlla se rilasciata su un'altra carta della mano → riordina
            var elUnder2 = document.elementFromPoint(e.clientX, e.clientY);
            var cartaDest = elUnder2 ? elUnder2.closest('.carta[data-id]') : null;
            var container = document.getElementById('carte-giocatore');
            if (cartaDest && container && container.contains(cartaDest)) {
                var destId = parseInt(cartaDest.getAttribute('data-id'), 10);
                if (destId !== cardId) {
                    _riordina(cardId, destId);
                    return;
                }
            }
            render();
        }
    }

    function _onRightClick(e) {
        e.preventDefault();
        if (game.turno !== 'giocatore' || game.fase !== 'scarta') return;
        var hit = _cardFromEl(e.target);
        if (!hit || !hit.card) return;
        if (_pendingGin) {
            _pendingGin = false; _pendingKnock = false;
            _eseguiBussa(true, hit.card.id);
        } else if (_pendingKnock) {
            _pendingKnock = false; _pendingGin = false;
            _eseguiBussa(false, hit.card.id);
        } else {
            _scartaCartaId(hit.card.id);
        }
    }

    function _gestisciFine(res) {
        if (!res || !res.risultato) return;
        var r = res.risultato;
        if (r.gin) {
            _playSound('gin');
            mostraToast(Core.t('toast-gin'), 3000);
        } else {
            if (game.knocker === 'avversario') _playSound('knock');
            if (r.undercut) mostraToast(Core.t('toast-undercut'), 3000);
        }

        aggiornaPunteggi();

        if (res.partitaFinita) {
            _playSound(res.vincitorePartita === 'giocatore' ? 'vittoria' : 'sconfitta');
            setTimeout(function () {
                mostraModalFine(true, res.vincitorePartita, r);
            }, 1200);
        } else {
            // Show knock panel summary — player must click "next hand" to continue
            _aggiornaInfoProssimoMazziere(r);
            mostraKnockPanel(r);
            var btnNext = document.getElementById('btn-prossima-mano');
            if (btnNext) btnNext.style.display = 'inline-block';
        }
    }

    // Mostra nel pannello knock chi sarà il mazziere della prossima mano
    function _aggiornaInfoProssimoMazziere(r) {
        var el = document.getElementById('info-prossimo-mazziere');
        if (!el) return;
        var vincitore = r && r.winner === 'knocker' ?
            (game.knocker === 'giocatore' ? Core.t('label-tu') : Core.t('label-amico')) :
            (game.knocker === 'giocatore' ? Core.t('label-amico') : Core.t('label-tu'));
        el.textContent = Core.t('label-prossimo-mazziere') + ' ' + vincitore;
        el.style.display = 'block';
    }

    // Animazione AI upcard (presa o pesca forzata), poi turno AI normale se ha preso
    function _aiUpcardConAnim(forced) {
        Game.aiUpcardTurn(forced, function (aiRes) {
            if (aiRes.next === 'player-dealer-decides') {
                // AI (non-dealer) ha passato → tocca al giocatore (dealer)
                _playSound('passa');
                mostraToast(Core.t('toast-ai-passa'), 2000);
                render();
            } else if (aiRes.next === 'player-forced-draw') {
                // AI (dealer) ha passato → giocatore (non-dealer) deve pescare dal mazzo
                _playSound('passa');
                _forcedDraw = true;
                mostraToast(Core.t('stato-upcard-forzata'), 2000);
                render();
            } else if (aiRes.card) {
                // AI ha preso la upcard → animazione scarti→avversario
                var fromEl = document.getElementById('scarti');
                var fromR  = fromEl ? fromEl.getBoundingClientRect() : null;
                _playSound('pesca');
                mostraToast(Core.t('toast-ai-prende'), 1500);
                renderScarti();
                _animaVolo(fromR, document.getElementById('area-avversario'), aiRes.card, true, function () {
                    renderManoAvversario();
                    // ora l'AI deve scartare (turno già gestito da aiUpcardTurn→_aiDiscard)
                    render();
                    _gestisciAiResult(aiRes);
                });
            } else if (forced) {
                // AI pesca forzata dal mazzo → animazione mazzo→avversario, poi scarto
                var fromMazzoEl = document.getElementById('mazzo');
                var fromMazzoR  = fromMazzoEl ? fromMazzoEl.getBoundingClientRect() : null;
                _playSound('pesca');
                renderMazzo();
                _animaVolo(fromMazzoR, document.getElementById('area-avversario'), null, false, function () {
                    renderManoAvversario();
                    if (aiRes.aiScartata) {
                        // Anima lo scarto: avversario → scarti
                        var toScartiEl = document.getElementById('scarti');
                        _playSound('scarta');
                        _animaVolo(document.getElementById('area-avversario'), toScartiEl, aiRes.aiScartata, true, function () {
                            render();
                            _gestisciAiResult(aiRes);
                        });
                    } else {
                        render();
                        _gestisciAiResult(aiRes);
                    }
                });
            } else {
                render();
                _gestisciAiResult(aiRes);
            }
        });
    }

    // ─── SORT ANIMATION ──────────────────────────────────────────────────────

    function _animaSort(onComplete) {
        var carteEl = document.getElementById('carte-giocatore');
        if (!carteEl) { onComplete(); return; }

        // Cattura posizioni correnti per id
        var oldRects = {};
        carteEl.querySelectorAll('.carta[data-id]').forEach(function (el) {
            oldRects[el.getAttribute('data-id')] = el.getBoundingClientRect();
        });

        // Ordina e re-renderizza
        game.manoGiocatore.sort(function (a, b) {
            return a.rank !== b.rank ? a.rank - b.rank : a.suit - b.suit;
        });
        renderManoGiocatore();

        // Trova le carte che si sono spostate
        var moved = [];
        carteEl.querySelectorAll('.carta[data-id]').forEach(function (el) {
            var id  = el.getAttribute('data-id');
            var old = oldRects[id];
            var cur = el.getBoundingClientRect();
            if (!old || (Math.abs(old.left - cur.left) < 2 && Math.abs(old.top - cur.top) < 2)) return;
            var card = game.manoGiocatore.find(function (c) { return String(c.id) === id; });
            moved.push({ el: el, oldR: old, card: card });
        });

        if (moved.length === 0) { onComplete(); return; }

        _playSound('ordina');
        var done = 0;
        moved.forEach(function (item) {
            item.el.style.visibility = 'hidden';
            _animaVolo(item.oldR, item.el, item.card, true, function () {
                item.el.style.visibility = '';
                done++;
                if (done === moved.length) onComplete();
            });
        });
    }

    // ─── DEAL ANIMATION ──────────────────────────────────────────────────────

    function _animaDeal(onComplete) {
        var mazzoEl = document.getElementById('mazzo');
        if (!mazzoEl) { onComplete(); return; }

        var carteGiocatoreEl  = document.getElementById('carte-giocatore');
        var carteAvversarioEl = document.getElementById('carte-avversario');
        if (!carteGiocatoreEl || !carteAvversarioEl) { onComplete(); return; }

        // Carte già nel DOM in ordine di distribuzione (casuale): cattura rect e ref elementi
        var playerCardEls   = Array.from(carteGiocatoreEl.querySelectorAll('.carta'));
        var opponentCardEls = Array.from(carteAvversarioEl.querySelectorAll('.carta'));

        // Sequenza: non-mazziere prima, alternando
        var nonDealer = game.dealer === 'giocatore' ? 'avversario' : 'giocatore';
        var gi = 0, ai = 0;
        var sequence = [];
        for (var i = 0; i < 20; i++) {
            var target   = (i % 2 === 0) ? nonDealer : game.dealer;
            var isPlayer = target === 'giocatore';
            var cardEl   = isPlayer ? playerCardEls[gi] : opponentCardEls[ai];
            sequence.push({
                rect:   cardEl ? cardEl.getBoundingClientRect() : null,
                cardEl: cardEl,
                faceUp: isPlayer,
                card:   isPlayer ? game.manoGiocatore[gi] : null
            });
            if (isPlayer) gi++; else ai++;
        }

        // Nascondi tutte le carte
        playerCardEls.forEach(function (el)   { el.style.visibility = 'hidden'; });
        opponentCardEls.forEach(function (el) { el.style.visibility = 'hidden'; });

        var STAGGER = 75;
        var landed = 0;
        var total = sequence.length;

        _playSound('deal');

        function onCardLanded(cardEl) {
            if (cardEl) cardEl.style.visibility = '';
            landed++;
            if (landed < total) return;
            // Ferma il suono deal e anima il sort
            if (_suoni.deal) { _suoni.deal.pause(); _suoni.deal.currentTime = 0; }
            _animaSort(onComplete);
        }

        sequence.forEach(function (item, idx) {
            if (!item.rect) { setTimeout(function () { onCardLanded(null); }, idx * STAGGER); return; }
            setTimeout(function () {
                _animaVolo(mazzoEl, item.rect, item.card, item.faceUp, function () {
                    onCardLanded(item.cardEl);
                });
            }, idx * STAGGER);
        });

        if (total === 0) onComplete();
    }

    // ─── UPCARD PHASE ────────────────────────────────────────────────────────

    // Avvia la fase upcard: se tocca all'AI, la fa decidere con animazione
    function _avviaFaseUpcard() {
        if (game.fase !== 'upcard') return;
        var mazziere = game.dealer === 'giocatore' ? Core.t('label-tu') : Core.t('label-amico');
        mostraToast(Core.t('label-mazziere') + ': ' + mazziere, 2500);
        if (game.turno !== 'avversario') return; // tocca al giocatore, la UI mostra i bottoni
        _aiUpcardConAnim(false);
    }

    // ─── INIT ────────────────────────────────────────────────────────────────

    function init() {
        _suoni = {
            deal:      document.getElementById('snd-deal'),
            pesca:     document.getElementById('snd-pesca'),
            scarta:    document.getElementById('snd-scarta'),
            ordina:    document.getElementById('snd-ordina'),
            passa:     document.getElementById('snd-passa'),
            knock:     document.getElementById('snd-knock'),
            gin:       document.getElementById('snd-gin'),
            vittoria:  document.getElementById('snd-vittoria'),
            sconfitta: document.getElementById('snd-sconfitta')
        };
        setupEventi();
        updateUILabels();

        var resumeStr = localStorage.getItem('_rummy_resume');
        if (resumeStr) {
            localStorage.removeItem('_rummy_resume');
            try {
                var resume = JSON.parse(resumeStr);
                Game.nuovaPartita(resume.variante, resume.tipoPartita, resume.limitePartita);
                game.puntiGiocatore = resume.puntiGiocatore || 0;
                game.puntiAvversario = resume.puntiAvversario || 0;
                aggiornaPunteggi();
                render();
                _animaDeal(function () { _avviaFaseUpcard(); });
            } catch (e) {
                mostraModalNuova();
            }
        } else {
            var prefsStr = localStorage.getItem('_rummy_prefs');
            if (prefsStr) {
                localStorage.removeItem('_rummy_prefs');
                try {
                    var prefs = JSON.parse(prefsStr);
                    game.variante = prefs.variante || 'classico';
                    game.tipoPartita = prefs.tipoPartita || 'torneo';
                    game.limitePartita = prefs.limitePartita || 100;
                } catch (e) {}
            }
            mostraModalNuova();
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var lang = window.currentLang;
        if (!lang) {
            lang = localStorage.getItem('userLanguage');
            if (!lang) {
                var urlParams = new URLSearchParams(window.location.search);
                lang = urlParams.get('lang');
            }
        }
        if (!lang) lang = 'en';
        window.currentLang = lang;
        if (typeof window.waitForInterstitial === 'function') {
            window.waitForInterstitial(init);
        } else {
            init();
        }
    });

    window.addEventListener('load', function () {
        // layout/ads handled by game-layout.js
    });

    // Expose for debugging
    window._rummyUI = { render: render, setLanguage: setLanguage, getGame: function() { return game; } };

})();
