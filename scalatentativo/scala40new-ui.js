'use strict';

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
//
// Il campo di gioco (#campogioco) è 1000 × 750 px (scalato da game-layout.js).
// Le zone vengono calcolate in funzione del numero di giocatori.
//
//  Con 2 giocatori (1 umano + 1 AI):
//    ┌──────────────────────────────────────────────────────────┐
//    │  mazzo  scarti    [turno]                                │  row 0  y≈10
//    │  ── mano avversario 1 ──────────────────────────────     │  row 1  y≈140
//    │  ── calate avversario 1 ────────────────────────────     │  row 2  y≈230
//    │  ── calate giocatore ───────────────────────────────     │  row 3  y≈320
//    │  ── mano giocatore ─────────────────────────────────     │  row 4  y≈430
//    └──────────────────────────────────────────────────────────┘
//
//  Con 3-4 giocatori le righe si comprimono proporzionalmente.
//

// Sprite sheet: ogni cella è 71×96 px. Colonne = valore (1-13), poi jolly.
// Righe = seme: F=0 Q=1 C=2 P=3 (jolly: riga 0=rosso, riga 1=nero).
const _SPRITE_W  = 71;
const _SPRITE_H  = 96;
const _SUIT_ROW  = { C: 2, Q: 1, F: 0, P: 3 };
const _CARD_ANIM = 220; // ms CSS transition

// ─── S40UI ────────────────────────────────────────────────────────────────────

class S40UI {
    /**
     * @param {S40Game} game
     * @param {HTMLElement} campo  — elemento #campogioco
     */
    constructor(game, campo) {
        this.game   = game;
        this.campo  = campo;

        // Map id → HTMLElement
        this._els    = new Map();
        // Set di id selezionati
        this._sel    = new Set();
        // Drag state
        this._drag   = null;

        // Impostazioni layout
        this._cardW  = 71;
        this._cardH  = 96;

        // Zone calcolate in _buildLayout()
        this._zones  = null;

        // Sprite images
        this._imgNorm = null;
        this._imgSel  = null;

        // Flag: se true il prossimo render ridisegna anche le posizioni
        this._dirty  = true;
    }

    // ── Inizializzazione ──────────────────────────────────────────────────────

    init() {
        this._loadImages();
        this._createCardEls();
        this._buildLayout();
        this._bindEvents();
        this.render();
    }

    _loadImages() {
        this._imgNorm = new Image();
        this._imgNorm.src = 'images/scala40/conjollyplus.png';

        this._imgSel = new Image();
        this._imgSel.src = 'images/scala40/conjollyselplus.png';
    }

    _createCardEls() {
        const { allCards } = this.game;
        for (const card of allCards) {
            const el = document.createElement('div');
            el.className = 'kcard';
            el.dataset.id = card.id;
            el.style.position  = 'absolute';
            el.style.width     = this._cardW + 'px';
            el.style.height    = this._cardH + 'px';
            el.style.backgroundImage = 'url(images/scala40/conjollyplus.png)';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.cursor    = 'pointer';
            el.style.userSelect = 'none';
            el.style.transition = `left ${_CARD_ANIM}ms, top ${_CARD_ANIM}ms`;
            this.campo.appendChild(el);
            this._els.set(card.id, el);
        }
    }

    // ── Layout ────────────────────────────────────────────────────────────────

    /**
     * Costruisce l'array _zones: una zona per ogni gruppo logico.
     * Ogni zona: { x, y, dx, dy }
     *   x,y   = posizione del primo elemento
     *   dx    = passo orizzontale tra carte nella stessa zona
     *   dy    = passo verticale (0 per mano/calate, >0 solo mazzo)
     */
    _buildLayout() {
        const n  = this.game.session.numPlayers; // 2-4
        const cW = this._cardW;
        const cH = this._cardH;

        // Le carte di mano/calate occupano x: 10..750 (750px utili).
        // La colonna destra (x>770) è riservata a mazzo e scarti.
        const handAreaW = 750;

        // Passo orizzontale tra le carte in mano (13 carte in handAreaW)
        const handDx = Math.floor((handAreaW - cW) / 12);  // ≈ 56px

        // Mazzo e scarti in colonna a destra, centrati verticalmente
        const mazzoX  = 875;
        const scartiX = 785;
        const pilaY   = 300; // centro-campo verticale
        this._mazzoZone  = { x: mazzoX,  y: pilaY, dx: 0.2, dy: 0.2 };
        this._scartiZone = { x: scartiX, y: pilaY, dx: 0,   dy: 0   };

        // Le righe giocatore occupano tutta l'altezza del campo (700px).
        // Ogni giocatore ha 2 righe: mano + calate.
        const totalH  = 700;
        const numRows = n * 2;
        const rowH    = Math.floor(totalH / numRows);
        const pad     = Math.floor((rowH - cH) / 2);

        // Per ogni giocatore: zona mano e zona calate.
        // Umano (p=0) in basso; AI in ordine dall'alto.
        this._handZones = [];
        this._meldZones = [];

        for (let p = 0; p < n; p++) {
            let handRow, meldRow;
            if (p === 0) {
                handRow = numRows - 1;   // ultima riga
                meldRow = numRows - 2;   // penultima
            } else {
                handRow = (p - 1) * 2;       // AI dall'alto
                meldRow = (p - 1) * 2 + 1;
            }

            this._handZones.push({ x: 10, y: handRow * rowH + pad, dx: handDx, dy: 0 });
            this._meldZones.push({ x: 10, y: meldRow * rowH + pad, dx: 0,      dy: 0 });
        }

        this._rowH    = rowH;
        this._handDx  = handDx;
    }

    // ── Render principale ─────────────────────────────────────────────────────

    render() {
        const s = this.game.state;

        // Nasconde tutte le carte (le riposiziona in seguito)
        for (const el of this._els.values()) {
            el.style.display = 'none';
            el.style.zIndex  = '0';
        }

        // Mazzo (solo visibile top)
        const stock = s.stock;
        for (let i = 0; i < stock.length; i++) {
            this._placeCard(stock[i], this._mazzoZone, i, false);
        }

        // Scarti (top = l'ultima, face-up)
        const discard = s.discard;
        for (let i = 0; i < discard.length; i++) {
            const faceUp = (i === discard.length - 1);
            this._placeCard(discard[i], this._scartiZone, i, faceUp);
        }

        // Mani e calate di ogni giocatore
        for (let p = 0; p < s.players.length; p++) {
            const player    = s.players[p];
            const isHuman   = (p === 0);
            const handZone  = this._handZones[p];
            const meldZone  = this._meldZones[p];

            // Mano
            for (let i = 0; i < player.hand.length; i++) {
                this._placeCard(player.hand[i], handZone, i, isHuman);
            }

            // Calate: ogni calata parte da un offset x diverso
            const meldDx  = Math.floor(this._cardW * 0.65); // ≈ 46px: carte leggibili
            const meldGap = 20;                              // spazio tra calate diverse
            let meldOffsetX = 0;
            for (let m = 0; m < player.melds.length; m++) {
                const meld = player.melds[m];
                for (let c = 0; c < meld.cards.length; c++) {
                    const zone = {
                        x:  meldZone.x + meldOffsetX,
                        y:  meldZone.y,
                        dx: meldDx,
                        dy: 0,
                    };
                    this._placeCard(meld.cards[c], zone, c, true);
                }
                meldOffsetX += (meld.cards.length - 1) * meldDx + this._cardW + meldGap;
            }
        }

        // Selezione visiva
        for (const id of this._sel) {
            const el = this._els.get(id);
            if (el) el.classList.add('kcard-sel');
        }

        this._renderHUD();
        this._dirty = false;
    }

    // ── Posizionamento singola carta ──────────────────────────────────────────

    _placeCard(id, zone, index, faceUp) {
        const el   = this._els.get(id);
        const card = this.game.card(id);
        if (!el || !card) return;

        const x = zone.x + index * zone.dx;
        const y = zone.y + index * zone.dy;

        el.style.display  = 'block';
        el.style.left     = x + 'px';
        el.style.top      = y + 'px';
        el.style.zIndex   = String(index + 1);

        this._applySprite(el, card, faceUp);
    }

    _applySprite(el, card, faceUp) {
        let bx, by;
        const sw = _SPRITE_W, sh = _SPRITE_H;

        if (faceUp) {
            if (card.isJoker) {
                bx = -sw * 13;
                by = -sh * card.rank; // 0 = rosso, 1 = nero
            } else {
                bx = -sw * (card.rank - 1);
                by = -sh * (_SUIT_ROW[card.suit] || 0);
            }
        } else {
            // Retro: colonna 16, riga = back (0=rosso, 1=blu)
            bx = -sw * 16;
            by = -sh * card.back;
        }

        const sel = this._sel.has(card.id);
        el.style.backgroundImage = sel
            ? 'url(images/scala40/conjollyselplus.png)'
            : 'url(images/scala40/conjollyplus.png)';
        el.style.backgroundPosition = bx + 'px ' + by + 'px';
        el.style.backgroundSize     = 'auto';

        el.classList.toggle('kcard-sel', sel);
    }

    // ── HUD (turno, punti mano, punteggio totale) ─────────────────────────────

    _renderHUD() {
        const s    = this.game.state;
        const sess = this.game.session;
        const { calcPoints, s40t } = window.S40Core;

        // HUD turno (toolbar destra)
        let hud = document.getElementById('s40-hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 's40-hud';
            hud.style.cssText = [
                'position:absolute', 'top:10px', 'left:420px',
                'color:#fff', 'font:bold 13px Arial', 'z-index:500',
                'pointer-events:none', 'line-height:20px',
            ].join(';');
            this.campo.appendChild(hud);
        }

        const cp    = s.currentPlayer;
        const whose = cp === 0 ? s40t('player') : (s40t('opponent') + ' ' + cp);
        let html = s40t('turn') + '<b>' + whose + '</b>';
        hud.innerHTML = html;

        // Etichette per ogni giocatore (mano e calate)
        for (let p = 0; p < sess.numPlayers; p++) {
            const player = s.players[p];
            const pts    = calcPoints(this.game.cards(player.hand));
            const label  = p === 0 ? s40t('player') : (s40t('opponent') + ' ' + p);
            const badge  = player.has40 ? ' <span class="badge-40">40</span>' : '';
            const active = (cp === p);

            // Etichetta zona mano
            let lbl = document.getElementById('s40-lbl-hand-' + p);
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 's40-lbl-hand-' + p;
                lbl.className = 'etichetta-player';
                lbl.style.left = '760px';
                this.campo.appendChild(lbl);
            }
            lbl.style.top   = (this._handZones[p].y + 2) + 'px';
            lbl.innerHTML   = label + badge + ' (' + pts + ' pt)';
            lbl.classList.toggle('turno-attivo', active);

            // Etichetta zona calate
            let lbl2 = document.getElementById('s40-lbl-meld-' + p);
            if (!lbl2) {
                lbl2 = document.createElement('div');
                lbl2.id = 's40-lbl-meld-' + p;
                lbl2.className = 'etichetta-player';
                lbl2.style.left = '760px';
                this.campo.appendChild(lbl2);
            }
            lbl2.style.top  = (this._meldZones[p].y + 2) + 'px';
            lbl2.innerHTML  = (p === 0 ? 'le tue calate' : 'calate avv.' + p)
                            + ' &nbsp;[' + s40t('score_limit') + ' ' + sess.scoreLimit + ']';
        }

        // Etichette mazzo / scarti
        let lblM = document.getElementById('s40-lbl-mazzo');
        if (!lblM) {
            lblM = document.createElement('div');
            lblM.id = 's40-lbl-mazzo';
            lblM.className = 'etichetta-player';
            lblM.style.left = (this._mazzoZone.x) + 'px';
            this.campo.appendChild(lblM);
        }
        lblM.style.top  = (this._mazzoZone.y + this._cardH + 4) + 'px';
        lblM.textContent = s40t('deck') + ' (' + s.stock.length + ')';

        let lblS = document.getElementById('s40-lbl-scarti');
        if (!lblS) {
            lblS = document.createElement('div');
            lblS.id = 's40-lbl-scarti';
            lblS.className = 'etichetta-player';
            lblS.style.left = (this._scartiZone.x) + 'px';
            this.campo.appendChild(lblS);
        }
        lblS.style.top  = (this._scartiZone.y + this._cardH + 4) + 'px';
        lblS.textContent = s40t('discards') + ' (' + s.discard.length + ')';
    }

    // ── Selezione carte ───────────────────────────────────────────────────────

    _toggleSelect(id) {
        const s = this.game.state;
        const hand = s.players[0].hand;
        if (!hand.includes(id)) return; // solo carte in mano del giocatore

        if (this._sel.has(id)) {
            this._sel.delete(id);
        } else {
            this._sel.add(id);
        }
    }

    clearSelection() {
        this._sel.clear();
        this.render();
    }

    get selectedIds() {
        return Array.from(this._sel);
    }

    // ── Event binding ─────────────────────────────────────────────────────────

    _bindEvents() {
        // Delegazione: un solo listener su #campogioco
        this.campo.addEventListener('click', (e) => this._onClick(e));
        this.campo.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._onClick(e.changedTouches[0] || e.touches[0] || e);
        }, { passive: false });
    }

    _onClick(e) {
        const target = e.target || e;
        if (!target || !target.dataset) return;
        const id = parseInt(target.dataset.id, 10);
        if (isNaN(id)) {
            this._handleZoneClick(e);
            return;
        }
        this._handleCardClick(id, e);
    }

    /** Click su una carta: selezione, pesca, scarta a seconda del contesto. */
    _handleCardClick(id, e) {
        const g = this.game;
        const s = g.state;

        // Non è il turno del giocatore
        if (s.currentPlayer !== 0) return;

        const inHand    = s.players[0].hand.includes(id);
        const inDiscard = s.discard.length > 0 && s.discard[s.discard.length - 1] === id;
        const inStock   = s.stock.includes(id);

        // Pesca dal mazzo
        if (inStock && !s.hasDrawn) {
            g.saveUndo();
            g.drawFromStock();
            this._sel.clear();
            this.render();
            return;
        }

        // Pesca dagli scarti
        if (inDiscard && !s.hasDrawn) {
            g.saveUndo();
            g.drawFromDiscard();
            this._sel.clear();
            this.render();
            return;
        }

        // Carta in mano: seleziona / deseleziona
        if (inHand && s.hasDrawn) {
            this._toggleSelect(id);
            this.render();
        }
    }

    /** Click su zone non-carta: mazzo, scarta, calata. */
    _handleZoneClick(e) {
        // Qui si possono gestire click su zone specifiche (mazzo vuoto, area scarti)
        // Per ora demandato all'esterno tramite API pubblica
    }

    // ── API pubblica per il controller esterno ────────────────────────────────

    /**
     * Tenta di calare le carte selezionate come nuova calata.
     * Salva l'undo PRIMA della modifica; se la calata è invalida, cancella il salvataggio.
     * Restituisce { ok, reason }.
     */
    laySelectedMeld() {
        if (this._sel.size < 3) return { ok: false, reason: 'invalid_meld' };
        this.game.saveUndo();                          // salva stato pre-modifica
        const result = this.game.layMeld(this.selectedIds);
        if (result.ok) {
            this._sel.clear();
        } else {
            this.game.undo.discardLast();              // operazione fallita: scarta lo snapshot
        }
        this.render();
        return result;
    }

    /**
     * Scarta la carta selezionata (deve essere esattamente 1).
     * Restituisce { ok, reason, [total] }.
     */
    discardSelected() {
        if (this._sel.size !== 1) return { ok: false, reason: 'no_selection' };
        const [id] = this._sel;
        this.game.saveUndo();
        const result = this.game.discard(id);
        if (result.ok) {
            this._sel.clear();
        } else {
            this.game.undo.discardLast();  // lo stato non è cambiato, scarta lo snapshot
        }
        this.render();
        return result;
    }

    /**
     * Esegue undo e ridisegna.
     */
    doUndo() {
        const ok = this.game.doUndo();
        this._sel.clear();
        this.render();
        return ok;
    }

    /**
     * Nuovo round.
     */
    newRound() {
        this.game.newRound();
        this._sel.clear();
        this._buildLayout();
        this.render();
    }

    destroy() {
        for (const el of this._els.values()) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        ['s40-hud', 's40-lbl-mazzo', 's40-lbl-scarti'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        for (let p = 0; p < 4; p++) {
            ['s40-lbl-hand-' + p, 's40-lbl-meld-' + p].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }
        this._els.clear();
    }
}

window.S40UI = S40UI;
