/**
 * DOMINO LUCIANO - Motore di Gioco Completo
 * lucianomanenti.com
 */

(function () {
    'use strict';

    // ─── LOCALIZZAZIONE / TESTI ───────────────────────────────────────────
    var lang = window.currentLang || 'it';
    var isEn = lang === 'en';

    var TXT = {
        title: isEn ? 'Domino Luciano' : 'Domino Luciano',
        drawMode: isEn ? 'Draw Domino' : 'Domino a Pesca',
        blockMode: isEn ? 'Block Domino' : 'Domino a Blocchi',
        yourTurn: isEn ? 'Your Turn' : 'Tocca a te',
        cpuTurn: isEn ? "Computer's Turn" : 'Tocca al Computer',
        drawBtn: isEn ? '🎲 Draw' : '🎲 Pesca',
        passBtn: isEn ? '✋ Pass' : '✋ Passa',
        selectEnd: isEn ? 'Choose which end to attach the tile to:' : 'Scegli a quale estremità collegare la tessera:',
        noMovesDraw: isEn ? 'No playable tiles! Draw from the boneyard.' : 'Nessuna mossa! Pesca dal piatto.',
        noMovesPass: isEn ? 'No playable tiles! Pass your turn.' : 'Nessuna mossa! Passa la mano.',
        cpuDrew: isEn ? 'The computer drew a tile.' : 'Il computer ha pescato una tessera.',
        cpuPassed: isEn ? 'The computer passed.' : 'Il computer ha passato la mano.',
        dominoWin: isEn ? 'DOMINO! You won the round!' : 'DOMINO! Hai vinto la manche!',
        dominoCpuWin: isEn ? 'DOMINO! The computer won the round.' : 'DOMINO! Il computer ha vinto la manche.',
        blockedWin: isEn ? 'Round blocked! You have fewer pips and won!' : 'Gioco bloccato! Hai meno puntini e vinci!',
        blockedLoss: isEn ? 'Round blocked! Computer has fewer pips.' : 'Gioco bloccato! Il computer ha meno puntini.',
        blockedTie: isEn ? 'Round blocked! Equal pips: Tie.' : 'Gioco bloccato! Parità di puntini: Pareggio.',
        matchWon: isEn ? 'CONGRATULATIONS! You won the match!' : 'COMPLIMENTI! Hai vinto la partita!',
        matchLost: isEn ? 'MATCH OVER! The computer won.' : 'PARTITA CONCLUSA! Ha vinto il computer.',
        roundSummary: isEn ? 'Round %r ended: %p pips scored.' : 'Manche %r terminata: %p punti assegnati.',
        hintSuggested: isEn ? 'Suggested move: tile [%a|%b]' : 'Mossa consigliata: tessera [%a|%b]',
        noHint: isEn ? 'No valid moves to suggest.' : 'Nessuna mossa giocabile al momento.',
        tilePlayed: isEn ? 'Tile played: [%a|%b]' : 'Tessera giocata: [%a|%b]'
    };

    // ─── CONFIGURAZIONE & STATO ──────────────────────────────────────────
    var CONFIG = {
        mode: 'draw',       // 'draw' o 'block'
        targetScore: 50,    // 50, 100, oppure 1 (partita singola)
        difficulty: 'medio' // 'facile', 'medio', 'difficile'
    };

    var STATE = {
        deck: [],           // 28 tessere create
        boneyard: [],       // Tessere nel monte / piatto
        playerHand: [],     // Tessere del giocatore
        cpuHand: [],        // Tessere del computer
        boardChain: [],     // Catena di tessere sul tavolo
        turn: 'player',     // 'player' o 'cpu'
        roundNumber: 1,
        playerScore: 0,
        cpuScore: 0,
        selectedTileIndex: null,
        gameOver: false,
        roundOver: false,
        cpuFaceUp: false,
        historyStack: [],   // Per funzione Annulla (Undo)
        cpuMissingSuits: {}, // Memorizza i semi che il giocatore umano non ha
        isAnimating: false
    };

    // Audio Context per effetti sonori autentici
    var audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSoundClack() {
        if (window.audioMuted) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var now = ctx.currentTime;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

            gain.gain.setValueAtTime(0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);

            // Secondo click rapido per effetto risonanza osso/avorio
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(580, now + 0.01);
            osc2.frequency.exponentialRampToValueAtTime(140, now + 0.05);
            gain2.gain.setValueAtTime(0.4, now + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.01);
            osc2.stop(now + 0.065);
        } catch (e) {
            // Audio fallback
        }
    }

    function playSoundKnock() {
        if (window.audioMuted) return;
        var snd = new Audio('sounds/scala40/knock.mp3');
        snd.volume = 0.6;
        snd.play().catch(function () {});
    }

    function playSoundWin() {
        if (window.audioMuted) return;
        var snd = new Audio('sounds/scala40/tada.mp3');
        snd.volume = 0.8;
        snd.play().catch(function () {});
    }

    function playSoundLoss() {
        if (window.audioMuted) return;
        var snd = new Audio('sounds/scala40/haiperso.mp3');
        snd.volume = 0.8;
        snd.play().catch(function () {});
    }

    // ─── GENERATORE TESSERE DOMINO (28 TESSERE) ──────────────────────────
    function createFullDeck() {
        var deck = [];
        var id = 0;
        for (var i = 0; i <= 6; i++) {
            for (var j = i; j <= 6; j++) {
                deck.push({
                    id: 'tile_' + id++,
                    a: i,
                    b: j,
                    isDouble: i === j,
                    totalPips: i + j
                });
            }
        }
        return deck;
    }

    function shuffleArray(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }

    // ─── RENDERING GRAFICO TESSERA CON PUNTINI INCISI ────────────────────
    // Matrice puntini 3x3 standard per dadi/domino
    var PIP_PATTERNS = {
        0: [],
        1: [4],
        2: [2, 6],
        3: [2, 4, 6],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8]
    };

    function renderHalfFace(value) {
        var half = document.createElement('div');
        half.className = 'domino-half';
        var activePips = PIP_PATTERNS[value] || [];

        for (var idx = 0; idx < 9; idx++) {
            var cell = document.createElement('div');
            cell.style.width = '100%';
            cell.style.height = '100%';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';

            if (activePips.indexOf(idx) !== -1) {
                var pip = document.createElement('div');
                pip.className = 'domino-pip';
                cell.appendChild(pip);
            }
            half.appendChild(cell);
        }
        return half;
    }

    function createTileElement(tile, orientation, isBack) {
        var el = document.createElement('div');
        el.className = 'domino-tile ' + (orientation || 'vertical');
        el.dataset.tileId = tile.id;

        if (isBack) {
            el.classList.add('tile-back');
            return el;
        }

        var halfA = renderHalfFace(tile.a);
        var divider = document.createElement('div');
        divider.className = 'domino-divider';
        var halfB = renderHalfFace(tile.b);

        var spinner = document.createElement('div');
        spinner.className = 'domino-spinner';

        el.appendChild(halfA);
        el.appendChild(divider);
        el.appendChild(spinner);
        el.appendChild(halfB);

        return el;
    }

    // ─── LOGICA DEL TAVOLO (CATENA E DISPOSIZIONE A SERPENTE) ───────────
    // Il tavolo ha dimensione 992 x 380 px.
    // Le tessere sul tavolo hanno dimensione: orizzontale 72x36 px, verticale (doppi) 36x72 px.
    function computeBoardLayout(chainParam) {
        var chain = chainParam || STATE.boardChain;
        if (!chain || chain.length === 0) return;

        var W = 992;
        var H = 380;
        var startX = W / 2;
        var centerY = H / 2;

        // Se è presente solo la prima tessera
        if (chain.length === 1) {
            var first = chain[0];
            first.orientation = first.isDouble ? 'vertical' : 'horizontal';
            first.x = startX - (first.isDouble ? 18 : 36);
            first.y = centerY - (first.isDouble ? 36 : 18);
            first.renderA = first.leftVal;
            first.renderB = first.rightVal;
            return;
        }

        // Troviamo l'indice della tessera iniziale (seed)
        var seedIndex = 0;
        for (var i = 0; i < chain.length; i++) {
            if (chain[i].isSeed) { seedIndex = i; break; }
        }

        // Posizioniamo il seed al centro
        var seed = chain[seedIndex];
        seed.orientation = seed.isDouble ? 'vertical' : 'horizontal';
        seed.x = startX - (seed.isDouble ? 18 : 36);
        seed.y = centerY - (seed.isDouble ? 36 : 18);
        seed.renderA = seed.leftVal;
        seed.renderB = seed.rightVal;

        // ─── 1. RAMO SINISTRA (da seedIndex - 1 a 0) ───
        var curRowCenterY_L = centerY;
        var curLeftX = seed.x;
        var curRightX_L = null;
        var dir_L = -1; // -1 = verso sinistra, 1 = verso destra nella riga sopra

        for (var l = seedIndex - 1; l >= 0; l--) {
            var tL = chain[l];

            if (dir_L === -1) {
                // Avanzamento a sinistra nella riga centrale
                if (curLeftX < 110) {
                    // Curva verso l'alto (tessera verticale di raccordo)
                    var nextRowCenterY = curRowCenterY_L - 74;
                    tL.orientation = 'vertical';
                    // La tessera verticale (36x72) si posiziona a sinistra dell'ultima tessera
                    tL.x = curLeftX - 36 - 2;
                    // Il suo mezzo inferiore (curRowCenterY_L - 18 .. curRowCenterY_L + 18) tocca la riga centrale
                    tL.y = curRowCenterY_L + 18 - 72; // = curRowCenterY_L - 54
                    tL.renderA = tL.leftVal;  // top (verso riga superiore)
                    tL.renderB = tL.rightVal; // bottom (verso riga centrale)
                    curRowCenterY_L = nextRowCenterY;
                    // La riga superiore parte allineata a sinistra con la tessera verticale
                    curRightX_L = tL.x;
                    dir_L = 1; // ora ci si muove a destra nella riga sopra!
                } else {
                    tL.orientation = tL.isDouble ? 'vertical' : 'horizontal';
                    var tw = tL.isDouble ? 36 : 72;
                    tL.x = curLeftX - tw - 2;
                    tL.y = curRowCenterY_L - (tL.isDouble ? 36 : 18);
                    tL.renderA = tL.leftVal;
                    tL.renderB = tL.rightVal;
                    curLeftX = tL.x;
                }
            } else if (dir_L === 1) {
                // Avanzamento a destra nella riga superiore
                tL.orientation = tL.isDouble ? 'vertical' : 'horizontal';
                var tw = tL.isDouble ? 36 : 72;
                // La prima tessera si appoggia sopra il raccordo (curRightX_L), le successive a distanza di 2px
                tL.x = (curRightX_L === chain[l + 1].x) ? curRightX_L : (curRightX_L + 2);
                tL.y = curRowCenterY_L - (tL.isDouble ? 36 : 18);
                if (tL.isDouble) {
                    tL.renderA = tL.leftVal;
                    tL.renderB = tL.rightVal;
                } else {
                    tL.renderA = tL.rightVal; // attach (left)
                    tL.renderB = tL.leftVal;  // free (right)
                }
                curRightX_L = tL.x + tw;
            }
        }

        // ─── 2. RAMO DESTRA (da seedIndex + 1 a chain.length - 1) ───
        var curRowCenterY_R = centerY;
        var curRightX = seed.x + (seed.isDouble ? 36 : 72);
        var curLeftX_R = null;
        var dir_R = 1; // 1 = verso destra, -1 = verso sinistra nella riga inferiore

        for (var r = seedIndex + 1; r < chain.length; r++) {
            var tR = chain[r];

            if (dir_R === 1) {
                // Avanzamento a destra nella riga centrale
                if (curRightX > W - 110) {
                    // Curva verso il basso (tessera verticale di raccordo)
                    var nextRowCenterY = curRowCenterY_R + 74;
                    tR.orientation = 'vertical';
                    // La tessera verticale (36x72) si posiziona a destra dell'ultima tessera
                    tR.x = curRightX + 2;
                    // Il suo mezzo superiore (curRowCenterY_R - 18 .. curRowCenterY_R + 18) tocca la riga centrale
                    tR.y = curRowCenterY_R - 18;
                    tR.renderA = tR.leftVal;  // top (verso riga centrale)
                    tR.renderB = tR.rightVal; // bottom (verso riga inferiore)
                    curRowCenterY_R = nextRowCenterY;
                    // La riga inferiore parte allineata a destra con il bordo destro della tessera verticale
                    curLeftX_R = tR.x + 36;
                    dir_R = -1; // ora ci si muove a sinistra nella riga sotto!
                } else {
                    tR.orientation = tR.isDouble ? 'vertical' : 'horizontal';
                    var tw = tR.isDouble ? 36 : 72;
                    tR.x = curRightX + 2;
                    tR.y = curRowCenterY_R - (tR.isDouble ? 36 : 18);
                    tR.renderA = tR.leftVal;
                    tR.renderB = tR.rightVal;
                    curRightX = tR.x + tw;
                }
            } else if (dir_R === -1) {
                // Avanzamento a sinistra nella riga inferiore
                tR.orientation = tR.isDouble ? 'vertical' : 'horizontal';
                var tw = tR.isDouble ? 36 : 72;
                // La prima tessera si appoggia sotto il raccordo (curLeftX_R - tw), le successive a distanza di 2px
                var isFirstInRow = (curLeftX_R === chain[r - 1].x + 36);
                tR.x = isFirstInRow ? (curLeftX_R - tw) : (curLeftX_R - tw - 2);
                tR.y = curRowCenterY_R - (tR.isDouble ? 36 : 18);
                if (tR.isDouble) {
                    tR.renderA = tR.leftVal;
                    tR.renderB = tR.rightVal;
                } else {
                    tR.renderA = tR.rightVal; // free (left)
                    tR.renderB = tR.leftVal;  // attach (right)
                }
                curLeftX_R = tR.x;
            }
        }
    }

    // ─── RENDERING INTERFACCIA TAVOLO ───────────────────────────────────
    function renderBoard() {
        var container = document.getElementById('chain-container');
        if (!container) return;
        container.innerHTML = '';

        computeBoardLayout();

        // Disegna tessere della catena
        for (var i = 0; i < STATE.boardChain.length; i++) {
            var bTile = STATE.boardChain[i];
            var el = createTileElement(
                {
                    id: bTile.id,
                    a: (bTile.renderA !== undefined ? bTile.renderA : bTile.leftVal),
                    b: (bTile.renderB !== undefined ? bTile.renderB : bTile.rightVal)
                },
                bTile.orientation || 'horizontal',
                false
            );
            el.classList.add('board-tile');
            el.style.left = (bTile.x || 0) + 'px';
            el.style.top = (bTile.y || 0) + 'px';
            container.appendChild(el);
        }

        // Se il giocatore ha una tessera selezionata, mostra i target sulle estremità
        if (STATE.turn === 'player' && STATE.selectedTileIndex !== null && !STATE.roundOver) {
            var selectedTile = STATE.playerHand[STATE.selectedTileIndex];
            if (selectedTile && STATE.boardChain.length > 0) {
                var ends = getPlayableEndsForTile(selectedTile);
                if (ends.left) {
                    var leftTile = STATE.boardChain[0];
                    createDropTarget(
                        leftTile.x + (leftTile.orientation === 'vertical' ? 18 : 36),
                        leftTile.y + (leftTile.orientation === 'vertical' ? 36 : 18),
                        'left'
                    );
                }
                if (ends.right) {
                    var rightTile = STATE.boardChain[STATE.boardChain.length - 1];
                    createDropTarget(
                        rightTile.x + (rightTile.orientation === 'vertical' ? 18 : 36),
                        rightTile.y + (rightTile.orientation === 'vertical' ? 36 : 18),
                        'right'
                    );
                }
            }
        }
    }

    function createDropTarget(x, y, endSide) {
        var container = document.getElementById('chain-container');
        var target = document.createElement('div');
        target.className = 'drop-target';
        target.style.left = x + 'px';
        target.style.top = y + 'px';
        target.title = isEn ? 'Play tile here' : 'Gioca la tessera qui';
        target.onclick = function (e) {
            e.stopPropagation();
            if (STATE.selectedTileIndex !== null) {
                playPlayerMove(STATE.selectedTileIndex, endSide);
            }
        };
        container.appendChild(target);
    }

    // ─── RENDERING MANI (GIOCATORE E CPU) ───────────────────────────────
    function renderHands() {
        // Mano Giocatore
        var playerHandEl = document.getElementById('player-hand-container');
        if (playerHandEl) {
            playerHandEl.innerHTML = '';
            var canAnyMove = false;

            for (var i = 0; i < STATE.playerHand.length; i++) {
                (function (idx) {
                    var tile = STATE.playerHand[idx];
                    var isPlayable = STATE.turn === 'player' && isTilePlayable(tile);
                    if (isPlayable) canAnyMove = true;

                    var el = createTileElement(tile, 'vertical', false);

                    if (STATE.turn === 'player') {
                        if (isPlayable) {
                            el.classList.add('playable');
                        } else {
                            el.classList.add('unplayable');
                        }
                    }

                    if (STATE.selectedTileIndex === idx) {
                        el.classList.add('selected');
                    }

                    el.onclick = function () {
                        if (STATE.turn !== 'player' || STATE.roundOver) return;
                        onPlayerTileClick(idx);
                    };

                    playerHandEl.appendChild(el);
                })(i);
            }
        }

        // Mano CPU (Tessere coperte o scoperte)
        var cpuHandEl = document.getElementById('cpu-hand-container');
        if (cpuHandEl) {
            cpuHandEl.innerHTML = '';
            var isCpuHidden = !STATE.cpuFaceUp && !STATE.roundOver;
            for (var c = 0; c < STATE.cpuHand.length; c++) {
                var cEl = createTileElement(STATE.cpuHand[c], 'vertical', isCpuHidden);
                cpuHandEl.appendChild(cEl);
            }
        }

        // Aggiorna tessere coperte del monte e controlli
        renderBoneyard();
    }

    function getRemainingBoneyardCount() {
        var count = 0;
        for (var i = 0; i < STATE.boneyard.length; i++) {
            if (STATE.boneyard[i] !== null && STATE.boneyard[i] !== undefined) count++;
        }
        return count;
    }

    function getCoordsRelativeToCampogioco(el) {
        var campogioco = document.getElementById('campogioco');
        if (!campogioco || !el) return { x: 0, y: 0, width: 36, height: 72 };
        var cRect = campogioco.getBoundingClientRect();
        var eRect = el.getBoundingClientRect();
        var scale = window.gameScale || (cRect.width / 1024) || 1;
        return {
            x: (eRect.left - cRect.left) / scale,
            y: (eRect.top - cRect.top) / scale,
            width: eRect.width / scale,
            height: eRect.height / scale
        };
    }

    function animateTileFlight(startCoords, targetCoords, tileData, orientation, isFaceDown, onComplete) {
        var campogioco = document.getElementById('campogioco');
        if (!campogioco) {
            if (onComplete) onComplete();
            return;
        }

        var duration = 360;
        var animTile = createTileElement(
            tileData || { a: 0, b: 0, id: 'flight_tile' },
            orientation || 'vertical',
            isFaceDown !== undefined ? isFaceDown : false
        );

        animTile.className += ' animating-flight-tile';
        animTile.style.position = 'absolute';
        animTile.style.left = startCoords.x + 'px';
        animTile.style.top = startCoords.y + 'px';
        animTile.style.width = (startCoords.width || (orientation === 'horizontal' ? 72 : 36)) + 'px';
        animTile.style.height = (startCoords.height || (orientation === 'horizontal' ? 36 : 72)) + 'px';
        animTile.style.margin = '0';
        animTile.style.transformOrigin = 'center center';
        animTile.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.2, 0.9, 0.25, 1), width ' + duration + 'ms ease, height ' + duration + 'ms ease';

        campogioco.appendChild(animTile);

        // Force reflow
        void animTile.offsetWidth;

        var deltaX = targetCoords.x - startCoords.x;
        var deltaY = targetCoords.y - startCoords.y;

        animTile.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
        if (targetCoords.width) animTile.style.width = targetCoords.width + 'px';
        if (targetCoords.height) animTile.style.height = targetCoords.height + 'px';

        setTimeout(function () {
            if (animTile.parentNode) {
                animTile.parentNode.removeChild(animTile);
            }
            if (onComplete) onComplete();
        }, duration + 30);
    }

    function getBoardTileDestination(tile, side) {
        var chainClone = JSON.parse(JSON.stringify(STATE.boardChain));
        var dummyTile = {
            id: tile.id,
            a: tile.a,
            b: tile.b,
            isDouble: tile.isDouble
        };

        if (chainClone.length === 0) {
            dummyTile.leftVal = tile.a;
            dummyTile.rightVal = tile.b;
            dummyTile.isSeed = true;
            chainClone.push(dummyTile);
        } else {
            var openVals = getBoardOpenValues();
            if (side === 'left') {
                var targetVal = openVals.left;
                var attachVal = (tile.b === targetVal) ? tile.b : tile.a;
                var freeVal = (attachVal === tile.b) ? tile.a : tile.b;
                dummyTile.leftVal = freeVal;
                dummyTile.rightVal = attachVal;
                chainClone.unshift(dummyTile);
            } else {
                var targetVal = openVals.right;
                var attachVal = (tile.a === targetVal) ? tile.a : tile.b;
                var freeVal = (attachVal === tile.a) ? tile.b : tile.a;
                dummyTile.leftVal = attachVal;
                dummyTile.rightVal = freeVal;
                chainClone.push(dummyTile);
            }
        }

        computeBoardLayout(chainClone);

        var placed = null;
        for (var i = 0; i < chainClone.length; i++) {
            if (chainClone[i].id === tile.id) {
                placed = chainClone[i];
                break;
            }
        }

        if (!placed) {
            return { x: 476, y: 172, width: 36, height: 72, orientation: 'vertical', renderA: tile.a, renderB: tile.b };
        }

        var isHoriz = placed.orientation === 'horizontal';
        return {
            x: 16 + (placed.x || 0),
            y: 130 + (placed.y || 0),
            width: isHoriz ? 72 : 36,
            height: isHoriz ? 36 : 72,
            orientation: placed.orientation || 'horizontal',
            renderA: placed.renderA !== undefined ? placed.renderA : placed.leftVal,
            renderB: placed.renderB !== undefined ? placed.renderB : placed.rightVal
        };
    }

    function renderBoneyard() {
        var count = getRemainingBoneyardCount();
        var boneyardCountEl = document.getElementById('boneyard-count');
        if (boneyardCountEl) {
            boneyardCountEl.textContent = count;
        }

        var gridEl = document.getElementById('boneyard-tiles-container');
        if (gridEl) {
            gridEl.innerHTML = '';
            var canDraw = (STATE.turn === 'player' && !STATE.roundOver && !STATE.isAnimating && CONFIG.mode === 'draw' && count > 0 && !playerHasValidMoves());
            var mustPass = (STATE.turn === 'player' && !STATE.roundOver && !STATE.isAnimating && !playerHasValidMoves() && (CONFIG.mode !== 'draw' || count === 0));

            var btnPassa = document.getElementById('btn-pesca-passa');
            if (btnPassa) {
                if (mustPass) {
                    btnPassa.style.display = 'inline-block';
                    btnPassa.disabled = false;
                    btnPassa.textContent = TXT.passBtn;
                } else {
                    btnPassa.style.display = 'none';
                }
            }

            for (var i = 0; i < 14; i++) {
                (function (idx) {
                    var slotEl = document.createElement('div');
                    slotEl.className = 'boneyard-slot';
                    slotEl.id = 'boneyard-slot-' + idx;

                    var tileData = STATE.boneyard[idx];
                    if (!tileData) {
                        slotEl.classList.add('empty-slot');
                    } else {
                        var bTile = document.createElement('div');
                        bTile.className = 'domino-tile tile-back boneyard-tile';
                        bTile.dataset.boneyardIndex = idx;

                        if (canDraw) {
                            bTile.classList.add('can-draw');
                            bTile.title = isEn ? 'Click to draw this tile' : 'Clicca per pescare questa tessera';
                            bTile.onclick = function (e) {
                                e.stopPropagation();
                                pescaTesseraDalMonte(idx);
                            };
                        } else {
                            if (CONFIG.mode === 'block') {
                                bTile.title = isEn ? 'Block mode: no drawing allowed' : 'Modalità a Chiusura: pesca non consentita';
                            } else if (playerHasValidMoves()) {
                                bTile.title = isEn ? 'Play a tile from your hand' : 'Gioca una tessera dalla tua mano';
                            } else {
                                bTile.title = isEn ? 'Boneyard' : 'Monte';
                            }
                        }
                        slotEl.appendChild(bTile);
                    }
                    gridEl.appendChild(slotEl);
                })(i);
            }
        }

        var valScoreP = document.getElementById('stat-punti-tu');
        var valScoreC = document.getElementById('stat-punti-cpu');
        var valTurn = document.getElementById('stat-turno');
        var valRound = document.getElementById('stat-manche');

        if (valScoreP) valScoreP.textContent = STATE.playerScore;
        if (valScoreC) valScoreC.textContent = STATE.cpuScore;
        if (valRound) valRound.textContent = STATE.roundNumber;

        if (valTurn) {
            if (STATE.roundOver) {
                valTurn.textContent = isEn ? 'Round Over' : 'Fine Manche';
                valTurn.className = 'info-pill-val gold';
            } else if (STATE.turn === 'player') {
                valTurn.textContent = isEn ? 'YOU' : 'TU';
                valTurn.className = 'info-pill-val turn-you';
            } else {
                valTurn.textContent = 'CPU';
                valTurn.className = 'info-pill-val turn-cpu';
            }
        }

        var undoBtn = document.getElementById('btn-undo');
        if (undoBtn) {
            undoBtn.disabled = STATE.historyStack.length === 0 || STATE.turn !== 'player' || STATE.roundOver || STATE.isAnimating;
        }
    }

    function setStatusMessage(msg, isHighlight) {
        var el = document.getElementById('messaggio-stato-domino');
        if (!el) return;
        el.textContent = msg;
        if (isHighlight) {
            el.classList.add('evidenziato');
        } else {
            el.classList.remove('evidenziato');
        }
    }

    // ─── VERIFICA MOSSE VALIDE E CONVERSIONE ESTREMITÀ ──────────────────
    function getBoardOpenValues() {
        if (STATE.boardChain.length === 0) return null;
        var leftEnd = STATE.boardChain[0].leftVal;
        var rightEnd = STATE.boardChain[STATE.boardChain.length - 1].rightVal;
        return { left: leftEnd, right: rightEnd };
    }

    function isTilePlayable(tile) {
        if (STATE.boardChain.length === 0) return true;
        var ends = getBoardOpenValues();
        return tile.a === ends.left || tile.b === ends.left || tile.a === ends.right || tile.b === ends.right;
    }

    function getPlayableEndsForTile(tile) {
        if (STATE.boardChain.length === 0) {
            return { left: true, right: true };
        }
        var ends = getBoardOpenValues();
        var canLeft = (tile.a === ends.left || tile.b === ends.left);
        var canRight = (tile.a === ends.right || tile.b === ends.right);
        return { left: canLeft, right: canRight };
    }

    function playerHasValidMoves() {
        if (STATE.boardChain.length === 0) return STATE.playerHand.length > 0;
        for (var i = 0; i < STATE.playerHand.length; i++) {
            if (isTilePlayable(STATE.playerHand[i])) return true;
        }
        return false;
    }

    function cpuHasValidMoves() {
        if (STATE.boardChain.length === 0) return STATE.cpuHand.length > 0;
        for (var i = 0; i < STATE.cpuHand.length; i++) {
            if (isTilePlayable(STATE.cpuHand[i])) return true;
        }
        return false;
    }

    // ─── GESTIONE INTERAZIONE GIOCATORE ─────────────────────────────────
    function onPlayerTileClick(index) {
        if (STATE.turn !== 'player' || STATE.roundOver || STATE.isAnimating) return;

        var tile = STATE.playerHand[index];
        if (!tile || !isTilePlayable(tile)) return;

        // Se la scacchiera è vuota (prima mossa)
        if (STATE.boardChain.length === 0) {
            playPlayerMove(index, 'first');
            return;
        }

        var ends = getPlayableEndsForTile(tile);

        // Se compatibile solo a sinistra
        if (ends.left && !ends.right) {
            playPlayerMove(index, 'left');
            return;
        }

        // Se compatibile solo a destra
        if (!ends.left && ends.right) {
            playPlayerMove(index, 'right');
            return;
        }

        // Se compatibile con entrambi gli estremi
        if (ends.left && ends.right) {
            // Se entrambi i valori aperti sono identici, giocare su uno o l'altro è equivalente
            var openVals = getBoardOpenValues();
            if (openVals.left === openVals.right) {
                playPlayerMove(index, 'right');
                return;
            }

            // Altrimenti chiediamo di scegliere l'estremo evidenziando i target
            STATE.selectedTileIndex = (STATE.selectedTileIndex === index) ? null : index;
            setStatusMessage(TXT.selectEnd, true);
            renderHands();
            renderBoard();
        }
    }

    function saveHistorySnapshot() {
        var snapshot = {
            boneyard: JSON.parse(JSON.stringify(STATE.boneyard)),
            playerHand: JSON.parse(JSON.stringify(STATE.playerHand)),
            cpuHand: JSON.parse(JSON.stringify(STATE.cpuHand)),
            boardChain: JSON.parse(JSON.stringify(STATE.boardChain)),
            turn: STATE.turn
        };
        STATE.historyStack.push(snapshot);
        if (STATE.historyStack.length > 15) STATE.historyStack.shift();
    }

    function playPlayerMove(handIndex, side) {
        if (STATE.isAnimating || STATE.turn !== 'player' || STATE.roundOver) return;

        saveHistorySnapshot();

        var playerHandEl = document.getElementById('player-hand-container');
        var handTileEl = playerHandEl ? playerHandEl.children[handIndex] : null;
        var startCoords = handTileEl ? getCoordsRelativeToCampogioco(handTileEl) : { x: 500, y: 640, width: 38, height: 76 };

        var tile = STATE.playerHand.splice(handIndex, 1)[0];
        STATE.selectedTileIndex = null;

        var targetCoords = getBoardTileDestination(tile, side);

        STATE.isAnimating = true;
        renderHands(); 

        animateTileFlight(
            startCoords,
            targetCoords,
            { a: targetCoords.renderA, b: targetCoords.renderB, id: tile.id },
            targetCoords.orientation,
            false,
            function () {
                attachTileToBoard(tile, side);
                playSoundClack();
                STATE.isAnimating = false;

                renderBoard();
                renderHands();

                // Controllo vittoria o fine manche
                if (STATE.playerHand.length === 0) {
                    handleRoundEnd('player_domino');
                    return;
                }

                if (checkGameBlocked()) {
                    handleRoundEnd('blocked');
                    return;
                }

                // Passa il turno alla CPU
                STATE.turn = 'cpu';
                setStatusMessage(TXT.cpuTurn, false);
                renderHands();

                setTimeout(executeCpuTurn, 700);
            }
        );
    }

    function attachTileToBoard(tile, side) {
        if (STATE.boardChain.length === 0) {
            STATE.boardChain.push({
                id: tile.id,
                a: tile.a,
                b: tile.b,
                leftVal: tile.a,
                rightVal: tile.b,
                isDouble: tile.isDouble,
                isSeed: true
            });
            return;
        }

        var openVals = getBoardOpenValues();

        if (side === 'left') {
            // Collegamento a sinistra (testa)
            var targetVal = openVals.left;
            var attachVal = (tile.b === targetVal) ? tile.b : tile.a;
            var freeVal = (attachVal === tile.b) ? tile.a : tile.b;

            STATE.boardChain.unshift({
                id: tile.id,
                a: freeVal,
                b: attachVal,
                leftVal: freeVal,
                rightVal: attachVal,
                isDouble: tile.isDouble
            });
        } else {
            // Collegamento a destra (coda)
            var targetVal = openVals.right;
            var attachVal = (tile.a === targetVal) ? tile.a : tile.b;
            var freeVal = (attachVal === tile.a) ? tile.b : tile.a;

            STATE.boardChain.push({
                id: tile.id,
                a: attachVal,
                b: freeVal,
                leftVal: attachVal,
                rightVal: freeVal,
                isDouble: tile.isDouble
            });
        }
    }

    // ─── AZIONI PESCA E PASSA ───────────────────────────────────────────
    function pescaTesseraDalMonte(index) {
        if (STATE.isAnimating || STATE.turn !== 'player' || STATE.roundOver) return;
        if (CONFIG.mode !== 'draw' || !STATE.boneyard[index]) return;
        if (playerHasValidMoves()) {
            setStatusMessage(isEn ? 'You have playable tiles in hand!' : 'Hai tessere giocabili in mano!', true);
            return;
        }

        saveHistorySnapshot();

        var slotEl = document.getElementById('boneyard-slot-' + index);
        var startCoords = slotEl ? getCoordsRelativeToCampogioco(slotEl) : { x: 50, y: 600, width: 36, height: 72 };

        var drawn = STATE.boneyard[index];
        STATE.boneyard[index] = null;

        var playerHandEl = document.getElementById('player-hand-container');
        var handCoords = playerHandEl ? getCoordsRelativeToCampogioco(playerHandEl) : { x: 500, y: 620, width: 300, height: 80 };
        var targetX = handCoords.x + Math.min(handCoords.width, (STATE.playerHand.length * 46));
        var targetY = handCoords.y + 4;

        STATE.isAnimating = true;
        renderBoneyard();

        animateTileFlight(
            startCoords,
            { x: targetX, y: targetY, width: 38, height: 76 },
            drawn,
            'vertical',
            false,
            function () {
                STATE.playerHand.push(drawn);
                playSoundClack();
                STATE.isAnimating = false;
                setStatusMessage(isEn ? 'You drew a tile.' : 'Hai pescato una tessera.', false);
                renderHands();
                renderBoard();

                if (playerHasValidMoves()) {
                    setStatusMessage(TXT.yourTurn, true);
                } else if (getRemainingBoneyardCount() > 0) {
                    setStatusMessage(isEn ? 'No playable moves! Pick another tile.' : 'Nessuna mossa valida! Pesca un\'altra tessera.', true);
                } else {
                    setStatusMessage(isEn ? 'Boneyard empty! Pass the turn.' : 'Monte esaurito! Passa il turno.', true);
                }
            }
        );
    }
    window.pescaTesseraDalMonte = pescaTesseraDalMonte;

    window.eseguiPescaOPassa = function () {
        if (STATE.isAnimating || STATE.turn !== 'player' || STATE.roundOver) return;

        if (CONFIG.mode === 'draw' && getRemainingBoneyardCount() > 0 && !playerHasValidMoves()) {
            for (var i = 0; i < STATE.boneyard.length; i++) {
                if (STATE.boneyard[i]) {
                    pescaTesseraDalMonte(i);
                    return;
                }
            }
        } else if (!playerHasValidMoves()) {
            playSoundKnock();
            setStatusMessage(isEn ? 'You passed the turn.' : 'Hai passato il turno.', false);

            if (checkGameBlocked()) {
                handleRoundEnd('blocked');
                return;
            }

            STATE.turn = 'cpu';
            renderHands();
            setTimeout(executeCpuTurn, 700);
        }
    };

    // ─── INTELLIGENZA ARTIFICIALE CPU ───────────────────────────────────
    function executeCpuTurn() {
        if (STATE.roundOver || STATE.isAnimating) return;

        // Se la catena è vuota
        if (STATE.boardChain.length === 0) {
            var bestIdx = 0;
            var bestPips = -1;
            for (var i = 0; i < STATE.cpuHand.length; i++) {
                var t = STATE.cpuHand[i];
                var score = (t.isDouble ? 100 : 0) + t.totalPips;
                if (score > bestPips) {
                    bestPips = score;
                    bestIdx = i;
                }
            }
            var cpuHandEl = document.getElementById('cpu-hand-container');
            var startCoords = cpuHandEl && cpuHandEl.children[bestIdx] ? getCoordsRelativeToCampogioco(cpuHandEl.children[bestIdx]) : { x: 500, y: 50, width: 38, height: 76 };

            var tile = STATE.cpuHand.splice(bestIdx, 1)[0];
            var targetCoords = getBoardTileDestination(tile, 'first');

            STATE.isAnimating = true;
            renderHands();

            animateTileFlight(
                startCoords,
                targetCoords,
                tile,
                targetCoords.orientation,
                false,
                function () {
                    attachTileToBoard(tile, 'first');
                    playSoundClack();
                    STATE.isAnimating = false;
                    renderBoard();
                    renderHands();
                    onCpuMoveFinished();
                }
            );
            return;
        }

        // Cerca tutte le mosse valide della CPU
        var validMoves = [];
        for (var c = 0; c < STATE.cpuHand.length; c++) {
            var cTile = STATE.cpuHand[c];
            var ends = getPlayableEndsForTile(cTile);
            if (ends.left) validMoves.push({ index: c, tile: cTile, side: 'left' });
            if (ends.right) validMoves.push({ index: c, tile: cTile, side: 'right' });
        }

        if (validMoves.length > 0) {
            var chosenMove = chooseBestCpuMove(validMoves);
            var cpuHandEl = document.getElementById('cpu-hand-container');
            var startCoords = cpuHandEl && cpuHandEl.children[chosenMove.index] ? getCoordsRelativeToCampogioco(cpuHandEl.children[chosenMove.index]) : { x: 500, y: 50, width: 38, height: 76 };

            var playedTile = STATE.cpuHand.splice(chosenMove.index, 1)[0];
            var targetCoords = getBoardTileDestination(playedTile, chosenMove.side);

            STATE.isAnimating = true;
            renderHands();

            animateTileFlight(
                startCoords,
                targetCoords,
                { a: targetCoords.renderA, b: targetCoords.renderB, id: playedTile.id },
                targetCoords.orientation,
                false,
                function () {
                    attachTileToBoard(playedTile, chosenMove.side);
                    playSoundClack();
                    STATE.isAnimating = false;
                    setStatusMessage(TXT.tilePlayed.replace('%a', playedTile.a).replace('%b', playedTile.b), false);
                    renderBoard();
                    renderHands();
                    onCpuMoveFinished();
                }
            );
        } else {
            // Nessuna mossa valida: pesca o passa
            if (CONFIG.mode === 'draw' && getRemainingBoneyardCount() > 0) {
                var avail = [];
                for (var b = 0; b < STATE.boneyard.length; b++) {
                    if (STATE.boneyard[b]) avail.push(b);
                }
                var cpuSlot = avail[Math.floor(Math.random() * avail.length)];
                var slotEl = document.getElementById('boneyard-slot-' + cpuSlot);
                var startCoords = slotEl ? getCoordsRelativeToCampogioco(slotEl) : { x: 50, y: 600, width: 36, height: 72 };

                var drawn = STATE.boneyard[cpuSlot];
                STATE.boneyard[cpuSlot] = null; // Lascia il buco

                var cpuHandEl = document.getElementById('cpu-hand-container');
                var cpuHandCoords = cpuHandEl ? getCoordsRelativeToCampogioco(cpuHandEl) : { x: 500, y: 50, width: 300, height: 80 };
                var targetX = cpuHandCoords.x + Math.min(cpuHandCoords.width, (STATE.cpuHand.length * 46));
                var targetY = cpuHandCoords.y;

                STATE.isAnimating = true;
                renderBoneyard();

                animateTileFlight(
                    startCoords,
                    { x: targetX, y: targetY, width: 38, height: 76 },
                    drawn,
                    'vertical',
                    !STATE.cpuFaceUp,
                    function () {
                        STATE.cpuHand.push(drawn);
                        playSoundClack();
                        STATE.isAnimating = false;
                        setStatusMessage(TXT.cpuDrew, false);
                        renderHands();
                        renderBoard();
                        setTimeout(executeCpuTurn, 600);
                    }
                );
            } else {
                playSoundKnock();
                setStatusMessage(TXT.cpuPassed, false);

                if (checkGameBlocked()) {
                    handleRoundEnd('blocked');
                    return;
                }

                STATE.turn = 'player';
                renderHands();
                setStatusMessage(TXT.yourTurn, true);
            }
        }
    }

    function chooseBestCpuMove(moves) {
        if (CONFIG.difficulty === 'facile') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Valutazione euristica per Medio e Difficile
        var bestScore = -9999;
        var bestMove = moves[0];

        for (var i = 0; i < moves.length; i++) {
            var m = moves[i];
            var t = m.tile;
            var score = 0;

            // Preferisci scaricare tessere pesanti e doppi
            score += t.totalPips * 3;
            if (t.isDouble) score += 20;

            if (CONFIG.difficulty === 'difficile') {
                // Valuta che estremo lascia libero
                var freeEndVal = (m.side === 'left') ? (t.a === getBoardOpenValues().left ? t.b : t.a) : (t.a === getBoardOpenValues().right ? t.b : t.a);

                // Se sappiamo che il giocatore non ha questo seme, assegna un bonus alto (blocco!)
                if (STATE.cpuMissingSuits[freeEndVal]) {
                    score += 45;
                }

                // Conteggio di quanti compagni per quel numero ha ancora in mano la CPU
                for (var h = 0; h < STATE.cpuHand.length; h++) {
                    if (h !== m.index) {
                        var other = STATE.cpuHand[h];
                        if (other.a === freeEndVal || other.b === freeEndVal) score += 8;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }
        }
        return bestMove;
    }

    function onCpuMoveFinished() {
        renderBoard();
        renderHands();

        if (STATE.cpuHand.length === 0) {
            handleRoundEnd('cpu_domino');
            return;
        }

        if (checkGameBlocked()) {
            handleRoundEnd('blocked');
            return;
        }

        STATE.turn = 'player';
        renderHands();
        setStatusMessage(TXT.yourTurn, true);
    }

    // ─── CONTROLLO BLOCCO / STALLO ──────────────────────────────────────
    function checkGameBlocked() {
        if (CONFIG.mode === 'draw' && getRemainingBoneyardCount() > 0) return false;
        return !playerHasValidMoves() && !cpuHasValidMoves();
    }

    // ─── FINE MANCHE E CALCOLO PUNTEGGI ─────────────────────────────────
    function getHandPipsSum(hand) {
        var sum = 0;
        for (var i = 0; i < hand.length; i++) {
            sum += hand[i].totalPips;
        }
        return sum;
    }

    function handleRoundEnd(reason) {
        STATE.roundOver = true;
        var pSum = getHandPipsSum(STATE.playerHand);
        var cSum = getHandPipsSum(STATE.cpuHand);

        var roundWinner = null;
        var pointsWon = 0;
        var modalMsg = '';
        var modalDetail = '';

        if (reason === 'player_domino') {
            roundWinner = 'player';
            pointsWon = cSum;
            modalMsg = isEn ? 'DOMINO! YOU WON!' : 'DOMINO! HAI VINTO LA MANCHE!';
            modalDetail = isEn ?
                ('Computer had ' + cSum + ' pips left in hand. You gain +' + pointsWon + ' points!') :
                ('Il Computer aveva ' + cSum + ' puntini rimasti in mano. Guadagni +' + pointsWon + ' punti!');
            playSoundWin();
        } else if (reason === 'cpu_domino') {
            roundWinner = 'cpu';
            pointsWon = pSum;
            modalMsg = isEn ? 'ROUND OVER! Computer Won' : 'MANCHE CONCLUSA! Ha vinto il Computer';
            modalDetail = isEn ?
                ('You had ' + pSum + ' pips left in hand. Computer gains +' + pointsWon + ' points.') :
                ('Avevi ' + pSum + ' puntini rimasti in mano. Il Computer guadagna +' + pointsWon + ' punti.');
            playSoundLoss();
        } else {
            // Gioco bloccato (chiusura)
            if (pSum < cSum) {
                roundWinner = 'player';
                pointsWon = cSum - pSum;
                modalMsg = isEn ? 'BLOCKED! You had fewer pips!' : 'GIOCO BLOCCATO! Hai meno puntini!';
                modalDetail = isEn ?
                    ('You: ' + pSum + ' pips vs Computer: ' + cSum + ' pips. You gain +' + pointsWon + ' points!') :
                    ('Tu: ' + pSum + ' puntini vs Computer: ' + cSum + ' puntini. Guadagni +' + pointsWon + ' punti!');
                playSoundWin();
            } else if (cSum < pSum) {
                roundWinner = 'cpu';
                pointsWon = pSum - cSum;
                modalMsg = isEn ? 'BLOCKED! Computer had fewer pips' : 'GIOCO BLOCCATO! Il Computer ha meno puntini';
                modalDetail = isEn ?
                    ('Computer: ' + cSum + ' pips vs You: ' + pSum + ' pips. Computer gains +' + pointsWon + ' points.') :
                    ('Computer: ' + cSum + ' puntini vs Tu: ' + pSum + ' puntini. Il Computer guadagna +' + pointsWon + ' punti.');
                playSoundLoss();
            } else {
                modalMsg = isEn ? 'BLOCKED! Equal pips: Tie!' : 'GIOCO BLOCCATO! Pareggio!';
                modalDetail = isEn ?
                    ('Both players have ' + pSum + ' pips. No points awarded.') :
                    ('Entrambi i giocatori hanno ' + pSum + ' puntini. Nessun punto assegnato.');
            }
        }

        var pPrev = STATE.playerScore;
        var cPrev = STATE.cpuScore;
        var pRound = (roundWinner === 'player' ? pointsWon : 0);
        var cRound = (roundWinner === 'cpu' ? pointsWon : 0);

        STATE.playerScore += pRound;
        STATE.cpuScore += cRound;

        var scoreData = {
            pPrev: pPrev,
            cPrev: cPrev,
            pRound: pRound,
            cRound: cRound,
            pTotal: STATE.playerScore,
            cTotal: STATE.cpuScore,
            target: CONFIG.targetScore
        };

        renderHands();

        // Controllo se il match è terminato (target score raggiunto o partita singola)
        var isMatchFinished = false;
        var matchWinner = null;

        if (CONFIG.targetScore === 1) {
            isMatchFinished = true;
            matchWinner = roundWinner;
        } else {
            if (STATE.playerScore >= CONFIG.targetScore || STATE.cpuScore >= CONFIG.targetScore) {
                isMatchFinished = true;
                matchWinner = (STATE.playerScore >= STATE.cpuScore) ? 'player' : 'cpu';
            }
        }

        showRoundEndModal(modalMsg, modalDetail, isMatchFinished, matchWinner, scoreData);
    }

    function showRoundEndModal(msg, detail, isMatchOver, matchWinner, scoreData) {
        var overlay = document.getElementById('schermo');
        var modal = document.getElementById('modale-fine-manche');
        var msgEl = document.getElementById('fine-messaggio');
        var detailEl = document.getElementById('fine-dettagli');
        var tableContainer = document.getElementById('fine-tabella-container');
        var btnNext = document.getElementById('btn-prossima-manche');

        if (msgEl) msgEl.textContent = msg;
        if (detailEl) detailEl.textContent = detail;

        if (tableContainer && scoreData) {
            var targetTxt = scoreData.target > 1 ? (' (Target: ' + scoreData.target + ')') : '';
            var pRoundTxt = (scoreData.pRound > 0 ? ('+' + scoreData.pRound) : (scoreData.pRound + ''));
            var cRoundTxt = (scoreData.cRound > 0 ? ('+' + scoreData.cRound) : (scoreData.cRound + ''));

            tableContainer.innerHTML =
                '<table class="tabella-punti-domino">' +
                '  <thead>' +
                '    <tr>' +
                '      <th style="text-align: left; padding-left: 14px;">' + (isEn ? 'SCORE' : 'PUNTEGGI') + '</th>' +
                '      <th><span class="val-tu">👤 ' + (isEn ? 'YOU' : 'TU') + '</span></th>' +
                '      <th><span class="val-cpu">💻 CPU</span></th>' +
                '    </tr>' +
                '  </thead>' +
                '  <tbody>' +
                '    <tr>' +
                '      <td class="lbl-riga">' + (isEn ? 'Previous Score' : 'Punteggio Precedente') + '</td>' +
                '      <td>' + scoreData.pPrev + '</td>' +
                '      <td>' + scoreData.cPrev + '</td>' +
                '    </tr>' +
                '    <tr>' +
                '      <td class="lbl-riga">' + (isEn ? 'This Round' : 'Punti Questa Manche') + '</td>' +
                '      <td class="val-manche">' + pRoundTxt + '</td>' +
                '      <td class="val-manche">' + cRoundTxt + '</td>' +
                '    </tr>' +
                '    <tr class="riga-totale">' +
                '      <td class="lbl-riga">' + (isEn ? 'Total Score' : 'Punteggio Totale') + targetTxt + '</td>' +
                '      <td class="val-tot val-tu">' + scoreData.pTotal + '</td>' +
                '      <td class="val-tot val-cpu">' + scoreData.cTotal + '</td>' +
                '    </tr>' +
                '  </tbody>' +
                '</table>';
        }

        if (btnNext) {
            if (isMatchOver) {
                btnNext.textContent = isEn ? 'NEW MATCH 🔄' : 'NUOVA PARTITA 🔄';
                btnNext.onclick = function () {
                    location.reload();
                };
            } else {
                btnNext.textContent = isEn ? 'NEXT ROUND ➡️' : 'PROSSIMA MANCHE ➡️';
                btnNext.onclick = function () {
                    startNextRound();
                };
            }
        }

        if (overlay) overlay.style.display = 'block';
        if (modal) {
            modal.style.display = 'flex';
            if (typeof setupAmazonFinishBanner === 'function') {
                setupAmazonFinishBanner('modale-fine-manche', {
                    modalStyle: { overflow: 'visible' },
                    targetTop: 420,
                    applyModalTop: false,
                    bannerHeight: 300,
                    bannerTopOffset: 325,
                    leftOffset: 0
                });
            }
        }
    }

    // ─── ANNULLA MOSSA (UNDO) & SUGGERIMENTO (HINT) ──────────────────────
    window.annullaUltimaMossa = function () {
        if (STATE.historyStack.length === 0 || STATE.turn !== 'player' || STATE.roundOver) return;

        var prev = STATE.historyStack.pop();
        STATE.boneyard = prev.boneyard;
        STATE.playerHand = prev.playerHand;
        STATE.cpuHand = prev.cpuHand;
        STATE.boardChain = prev.boardChain;
        STATE.turn = 'player';
        STATE.selectedTileIndex = null;

        renderBoard();
        renderHands();
        setStatusMessage(isEn ? 'Last turn undone.' : 'Ultima mossa annullata.', true);
    };

    window.mostraSuggerimento = function () {
        if (STATE.turn !== 'player' || STATE.roundOver) return;

        var playableIndices = [];
        for (var i = 0; i < STATE.playerHand.length; i++) {
            if (isTilePlayable(STATE.playerHand[i])) playableIndices.push(i);
        }

        if (playableIndices.length === 0) {
            setStatusMessage(TXT.noHint, true);
            return;
        }

        // Trova la tessera consigliata (doppio o più alta)
        var bestIdx = playableIndices[0];
        var bestScore = -1;
        for (var k = 0; k < playableIndices.length; k++) {
            var idx = playableIndices[k];
            var t = STATE.playerHand[idx];
            var sc = (t.isDouble ? 50 : 0) + t.totalPips;
            if (sc > bestScore) {
                bestScore = sc;
                bestIdx = idx;
            }
        }

        var recTile = STATE.playerHand[bestIdx];
        setStatusMessage(
            TXT.hintSuggested.replace('%a', recTile.a).replace('%b', recTile.b),
            true
        );

        // Evidenzia visivamente la tessera consigliata
        var handTiles = document.querySelectorAll('#player-hand-container .domino-tile');
        if (handTiles[bestIdx]) {
            handTiles[bestIdx].classList.add('hint-highlight');
            setTimeout(function () {
                if (handTiles[bestIdx]) handTiles[bestIdx].classList.remove('hint-highlight');
            }, 1800);
        }
    };

    // ─── INIZIALIZZAZIONE & AVVIO PARTITA ────────────────────────────────
    function startNextRound() {
        var overlay = document.getElementById('schermo');
        var modal = document.getElementById('modale-fine-manche');
        if (overlay) overlay.style.display = 'none';
        if (modal) modal.style.display = 'none';

        STATE.roundNumber++;
        STATE.roundOver = false;
        STATE.boardChain = [];
        STATE.historyStack = [];
        STATE.selectedTileIndex = null;
        STATE.cpuMissingSuits = {};

        distributeTiles();
    }

    function distributeTiles() {
        var deck = shuffleArray(createFullDeck());
        STATE.playerHand = deck.splice(0, 7);
        STATE.cpuHand = deck.splice(0, 7);
        STATE.boneyard = deck;

        // Determina chi inizia: chi possiede il doppio più alto (o la tessera con valore più alto)
        var pBestDouble = -1;
        var cBestDouble = -1;

        for (var p = 0; p < STATE.playerHand.length; p++) {
            if (STATE.playerHand[p].isDouble && STATE.playerHand[p].a > pBestDouble) {
                pBestDouble = STATE.playerHand[p].a;
            }
        }
        for (var c = 0; c < STATE.cpuHand.length; c++) {
            if (STATE.cpuHand[c].isDouble && STATE.cpuHand[c].a > cBestDouble) {
                cBestDouble = STATE.cpuHand[c].a;
            }
        }

        if (pBestDouble > cBestDouble) {
            STATE.turn = 'player';
        } else if (cBestDouble > pBestDouble) {
            STATE.turn = 'cpu';
        } else {
            // Se nessuno ha doppi, confronta la tessera con somma più alta
            var pMax = Math.max.apply(null, STATE.playerHand.map(function (t) { return t.totalPips; }));
            var cMax = Math.max.apply(null, STATE.cpuHand.map(function (t) { return t.totalPips; }));
            STATE.turn = (pMax >= cMax) ? 'player' : 'cpu';
        }

        renderBoard();
        renderHands();

        if (STATE.turn === 'player') {
            setStatusMessage(TXT.yourTurn + ' (Inizi tu)', true);
        } else {
            setStatusMessage(TXT.cpuTurn + ' (Inizia la CPU)', false);
            setTimeout(executeCpuTurn, 900);
        }
    }

    window.selezionaModalita = function (mode) {
        CONFIG.mode = mode;
        var btnPesca = document.getElementById('btn-mode-pesca');
        var btnBlocchi = document.getElementById('btn-mode-blocchi');
        if (btnPesca) btnPesca.classList.toggle('attiva', mode === 'draw');
        if (btnBlocchi) btnBlocchi.classList.toggle('attiva', mode === 'block');
    };

    window.selezionaTarget = function (target) {
        CONFIG.targetScore = target;
        var b1 = document.getElementById('btn-tgt-1');
        var b50 = document.getElementById('btn-tgt-50');
        var b100 = document.getElementById('btn-tgt-100');
        if (b1) b1.classList.toggle('attiva', target === 1);
        if (b50) b50.classList.toggle('attiva', target === 50);
        if (b100) b100.classList.toggle('attiva', target === 100);
    };

    window.selezionaDifficolta = function (diff) {
        CONFIG.difficulty = diff;
        var bf = document.getElementById('btn-diff-facile');
        var bm = document.getElementById('btn-diff-medio');
        var bd = document.getElementById('btn-diff-difficile');
        if (bf) bf.classList.toggle('attiva', diff === 'facile');
        if (bm) bm.classList.toggle('attiva', diff === 'medio');
        if (bd) bd.classList.toggle('attiva', diff === 'difficile');
    };

    window.toggleManiScoperte = function () {
        STATE.cpuFaceUp = !STATE.cpuFaceUp;
        var btn = document.getElementById('btn-scoperte');
        if (btn) {
            btn.classList.toggle('attivo', STATE.cpuFaceUp);
            if (isEn) {
                btn.textContent = STATE.cpuFaceUp ? '👁 Face Down' : '👁 Face Up';
            } else {
                btn.textContent = STATE.cpuFaceUp ? '👁 Coperte' : '👁 Scoperte';
            }
        }
        renderHands();
    };

    window.confermaEAvviaPartita = function () {
        var overlay = document.getElementById('schermo');
        var modal = document.getElementById('modale-inizio');
        if (overlay) overlay.style.display = 'none';
        if (modal) modal.style.display = 'none';

        var badge = document.getElementById('modalita-badge');
        if (badge) {
            badge.textContent = (CONFIG.mode === 'draw' ? TXT.drawMode : TXT.blockMode) +
                (CONFIG.targetScore > 1 ? (' • ' + CONFIG.targetScore + ' pt') : (' • ' + (isEn ? 'Single' : 'Singola')));
        }

        STATE.playerScore = 0;
        STATE.cpuScore = 0;
        STATE.roundNumber = 1;
        STATE.roundOver = false;
        STATE.boardChain = [];
        STATE.historyStack = [];
        STATE.cpuFaceUp = false;

        var btnScoperte = document.getElementById('btn-scoperte');
        if (btnScoperte) {
            btnScoperte.classList.remove('attivo');
            btnScoperte.textContent = isEn ? '👁 Face Up' : '👁 Scoperte';
        }

        distributeTiles();
    };

    window.apriConfermaNuova = function () {
        var overlay = document.getElementById('schermo');
        var modal = document.getElementById('confermatermina');
        if (overlay) overlay.style.display = 'block';
        if (modal) {
            modal.style.display = 'flex';
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
    };

    window.chiudiModali = function () {
        var overlay = document.getElementById('schermo');
        var modals = document.querySelectorAll('.form-domino');
        if (overlay) overlay.style.display = 'none';
        for (var i = 0; i < modals.length; i++) {
            modals[i].style.display = 'none';
        }
    };

    // Toggle Audio
    function setupAudioButton() {
        var btnAudio = document.getElementById('btn-audio');
        if (!btnAudio) return;

        function updateAudioUI() {
            if (window.audioMuted) {
                btnAudio.classList.add('muted');
            } else {
                btnAudio.classList.remove('muted');
            }
        }
        updateAudioUI();

        btnAudio.onclick = function () {
            window.audioMuted = !window.audioMuted;
            localStorage.setItem('site-audio-muted', window.audioMuted ? 'true' : 'false');
            updateAudioUI();
        };
    }

    // Init al caricamento pagina
    window.addEventListener('DOMContentLoaded', function () {
        setupAudioButton();

        // Mostra modale iniziale di scelta opzioni
        var overlay = document.getElementById('schermo');
        var modal = document.getElementById('modale-inizio');
        if (overlay) overlay.style.display = 'block';
        if (modal) modal.style.display = 'flex';

        // Tasti di scelta rapida (Z = Undo, H = Hint)
        document.addEventListener('keydown', function (e) {
            if (e.key === 'z' || e.key === 'Z') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.annullaUltimaMossa();
                }
            } else if (e.key === 'h' || e.key === 'H') {
                window.mostraSuggerimento();
            }
        });
    });

    // Esponi STATE e funzioni di debug per test runtime
    window._domino = {
        STATE: STATE,
        CONFIG: CONFIG,
        computeBoardLayout: computeBoardLayout,
        renderBoard: renderBoard,
        renderHands: renderHands,
        playPlayerMove: playPlayerMove,
        attachTileToBoard: attachTileToBoard,
        getBoardOpenValues: getBoardOpenValues
    };

})();
