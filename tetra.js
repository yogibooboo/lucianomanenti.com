/**
 * TETRA LUCIANO - Motore di Gioco Completo
 * lucianomanenti.com
 */

(function () {
    'use strict';

    // ─── LOCALIZZAZIONE / TESTI ───────────────────────────────────────────
    var lang = window.currentLang || 'it';
    var isEn = lang === 'en';

    var TXT = {
        title: isEn ? 'Tetra Luciano' : 'Tetra Luciano',
        modeMarathon: isEn ? 'Marathon' : 'Maratona',
        modeSprint: isEn ? 'Sprint (40 Lines)' : 'Sprint 40 Righe',
        modeUltra: isEn ? 'Ultra (2 Min)' : 'Ultra (2 Minuti)',
        paused: isEn ? 'PAUSED' : 'IN PAUSA',
        resumed: isEn ? 'Game Resumed' : 'Gioco Ripreso',
        gameOver: isEn ? 'GAME OVER' : 'PARTITA TERMINATA',
        sprintComplete: isEn ? 'SPRINT COMPLETED!' : 'SPRINT COMPLETATO!',
        ultraComplete: isEn ? 'TIME UP! ULTRA COMPLETED' : 'TEMPO SCADUTO! ULTRA CONCLUSO',
        newRecord: isEn ? '🏆 NEW RECORD!' : '🏆 NUOVO RECORD!',
        tetraClear: isEn ? 'TETRA!' : 'TETRA!',
        tspin: isEn ? 'T-SPIN!' : 'T-SPIN!',
        backToBack: isEn ? 'BACK TO BACK!' : 'CONSECUTIVO!',
        single: isEn ? 'Single' : 'Singola',
        double: isEn ? 'Double' : 'Doppia',
        triple: isEn ? 'Triple' : 'Tripla',
        levelUp: isEn ? 'LEVEL UP!' : 'LIVELLO SUPERATO!'
    };

    // ─── CONFIGURAZIONE DEI TETRAMINI E COLORI ────────────────────────────
    var COLS = 10;
    var ROWS = 20;
    var BLOCK_SIZE = 28; // Dimensione base render (280x560 canvas)

    // Palette colori brillanti, vivaci e luminosi con rilievi 3D
    var PIECE_COLORS = {
        I: { main: '#00e5ff', light: '#80f3ff', dark: '#00b4d8', shadow: '#0077b6' }, // Cyan brillante
        J: { main: '#3867d6', light: '#70a1ff', dark: '#1e3799', shadow: '#0c2461' }, // Blu vivace
        L: { main: '#ff9f1a', light: '#ffd32a', dark: '#ff6348', shadow: '#eb2f06' }, // Arancione caldo
        O: { main: '#ffd700', light: '#fff59d', dark: '#ffb300', shadow: '#f57c00' }, // Giallo oro luminoso
        S: { main: '#2ed573', light: '#7bed9f', dark: '#26af61', shadow: '#1e824c' }, // Verde smeraldo brillante
        T: { main: '#a55eea', light: '#d980fa', dark: '#8854d0', shadow: '#575fcf' }, // Viola acceso
        Z: { main: '#ff4757', light: '#ff7675', dark: '#eb2f06', shadow: '#b33939' }  // Rosso rubino vivace
    };

    // Matrici forme 4x4 o 3x3 o 2x2
    var SHAPES = {
        I: [
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
            [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
        ],
        J: [
            [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
            [[0, 1, 0], [0, 1, 0], [1, 1, 0]]
        ],
        L: [
            [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
            [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
            [[1, 1, 0], [0, 1, 0], [0, 1, 0]]
        ],
        O: [
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]]
        ],
        S: [
            [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
            [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
            [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
        ],
        T: [
            [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
            [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
        ],
        Z: [
            [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
            [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
            [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
        ]
    };

    // Super Rotation System (SRS) Wall Kicks
    var KICKS_JLSTZ = {
        '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    };

    var KICKS_I = {
        '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    };

    // ─── AUDIO SYNTHESIZER & SFX ──────────────────────────────────────────
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

    function playTone(freq, duration, type, startVol, endVol, decayType) {
        if (window.audioMuted) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var now = ctx.currentTime;

            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(startVol !== undefined ? startVol : 0.3, now);
            if (decayType === 'linear') {
                gain.gain.linearRampToValueAtTime(endVol || 0.001, now + duration);
            } else {
                gain.gain.exponentialRampToValueAtTime(endVol || 0.001, now + duration);
            }

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    var SFX = {
        move: function () {
            playTone(320, 0.04, 'triangle', 0.15, 0.01);
        },
        rotate: function () {
            if (window.audioMuted) return;
            try {
                var ctx = getAudioCtx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                var now = ctx.currentTime;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.07);
            } catch (e) {}
        },
        drop: function () {
            playTone(180, 0.05, 'triangle', 0.25, 0.01);
        },
        hardDrop: function () {
            if (window.audioMuted) return;
            try {
                var ctx = getAudioCtx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                var now = ctx.currentTime;
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.13);
            } catch (e) {}
        },
        hold: function () {
            playTone(550, 0.08, 'sine', 0.25, 0.01);
        },
        lineClear: function (lines) {
            if (window.audioMuted) return;
            var freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            var count = Math.min(lines, 4);
            for (var i = 0; i < count; i++) {
                (function (idx) {
                    setTimeout(function () {
                        playTone(freqs[idx], 0.15, 'sine', 0.35, 0.01);
                    }, idx * 60);
                })(i);
            }
        },
        tetraClear: function () {
            if (window.audioMuted) return;
            var notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            notes.forEach(function (n, i) {
                setTimeout(function () {
                    playTone(n, 0.22, 'triangle', 0.45, 0.01);
                }, i * 70);
            });
        },
        levelUp: function () {
            if (window.audioMuted) return;
            var chords = [440, 554.37, 659.25, 880];
            chords.forEach(function (f, i) {
                setTimeout(function () {
                    playTone(f, 0.25, 'sine', 0.4, 0.01);
                }, i * 80);
            });
        },
        gameOver: function () {
            if (window.audioMuted) return;
            var freqs = [350, 300, 250, 180];
            freqs.forEach(function (f, i) {
                setTimeout(function () {
                    playTone(f, 0.25, 'sawtooth', 0.3, 0.01);
                }, i * 120);
            });
        }
    };

    // ─── STATO GLOBALE DI GIOCO ───────────────────────────────────────────
    var CONFIG = {
        mode: 'marathon',    // 'marathon', 'sprint', 'ultra'
        startLevel: 1,
        ghostEnabled: true
    };

    var STATE = {
        grid: [],            // Matrice 20x10 (null se vuoto, o tipo pezzo 'I', 'T', ecc.)
        currentPiece: null,  // { type, rotation, x, y }
        holdPiece: null,     // Tipo pezzo tenuto
        canHold: true,       // Si può scambiare solo 1 volta per pezzo
        bag: [],             // 7-bag randomizer
        nextQueue: [],       // Prossimi 4 pezzi
        score: 0,
        lines: 0,
        level: 1,
        combo: -1,
        backToBack: false,
        stats: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 },
        isPlaying: false,
        isPaused: false,
        isGameOver: false,
        lastDropTime: 0,
        lockTimer: null,
        lockDelay: 500,      // 500ms lock delay standard
        lockResets: 0,       // Max 15 aggiustamenti
        maxLockResets: 15,
        clearingLines: [],   // Linee in fase di animazione
        clearAnimTime: 0,
        startTime: 0,
        elapsedTime: 0,
        timerInterval: null,
        particles: []        // Effetti particelle drop / clear
    };

    // Canvas e contesti 2D
    var canvas = null;
    var ctx = null;
    var holdCanvas = null;
    var holdCtx = null;
    var nextCanvas = null;
    var nextCtx = null;

    // ─── GESTIONE RECORD STILE SUDOKU (GIORNALIERO / SETTIMANALE / ASSOLUTO) ───
    var recordsData = {}; // { marathon: { daily:{key,val}, weekly:{key,val}, all:{val,date} }, ... }
    var STORAGE_RECORD_KEY = 'tetra_luciano_multi_records';

    function chiaveGiorno(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function chiaveOggi() {
        return chiaveGiorno(new Date());
    }

    function chiaveSettimana() {
        var d = new Date();
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return chiaveGiorno(d);
    }

    function caricaRecords() {
        try {
            recordsData = JSON.parse(localStorage.getItem(STORAGE_RECORD_KEY) || '{}') || {};
        } catch (e) {
            recordsData = {};
        }

        // Migrazione dai vecchi record se presenti
        ['marathon', 'sprint', 'ultra'].forEach(function (m) {
            if (!recordsData[m]) {
                var oldVal = localStorage.getItem('luciano_tetra_record_' + m);
                if (oldVal) {
                    var numVal = m === 'sprint' ? parseFloat(oldVal) : parseInt(oldVal, 10);
                    if (numVal > 0) {
                        recordsData[m] = {
                            daily: { key: chiaveOggi(), val: numVal },
                            weekly: { key: chiaveSettimana(), val: numVal },
                            all: { val: numVal, date: chiaveOggi() }
                        };
                    }
                }
            }
        });
    }

    function salvaRecords() {
        try {
            localStorage.setItem(STORAGE_RECORD_KEY, JSON.stringify(recordsData));
        } catch (e) {}
    }

    function formatRecordVal(mode, val) {
        if (!val || val === 0) return mode === 'sprint' ? '--:--' : '0';
        if (mode === 'sprint') {
            return formatTime(val);
        }
        return String(val);
    }

    function aggiornaRecords(mode, currentVal) {
        if (!recordsData[mode]) recordsData[mode] = {};
        var r = recordsData[mode];
        var oggi = chiaveOggi();
        var settimana = chiaveSettimana();
        var isSprint = (mode === 'sprint');
        var isNewRecordAll = false;

        // Migliore: per sprint è il tempo minore (min), per marathon/ultra è il punteggio maggiore (max)
        var isBetter = function (val, recVal) {
            if (recVal === undefined || recVal === null || recVal === 0) return true;
            return isSprint ? (val < recVal) : (val > recVal);
        };

        if (!r.daily || r.daily.key !== oggi || isBetter(currentVal, r.daily.val)) {
            r.daily = { key: oggi, val: currentVal };
        }
        if (!r.weekly || r.weekly.key !== settimana || isBetter(currentVal, r.weekly.val)) {
            r.weekly = { key: settimana, val: currentVal };
        }
        if (!r.all || isBetter(currentVal, r.all.val)) {
            r.all = { val: currentVal, date: oggi };
            isNewRecordAll = true;
        }

        salvaRecords();
        renderRecords();
        return isNewRecordAll;
    }

    function getBestRecord(mode) {
        var r = recordsData[mode || CONFIG.mode];
        if (!r || !r.all) return 0;
        return r.all.val || 0;
    }

    function renderRecords() {
        var mode = CONFIG.mode;
        var r = recordsData[mode] || {};
        var oggi = chiaveOggi();
        var settimana = chiaveSettimana();

        var badgeMode = document.getElementById('record-mode-lbl');
        if (badgeMode) {
            badgeMode.textContent = (mode === 'marathon' ? 'MARATONA' : (mode === 'sprint' ? 'SPRINT (40 R)' : 'ULTRA (2 MIN)'));
        }

        var elOggi = document.getElementById('record-oggi');
        var elSettimana = document.getElementById('record-settimana');
        var elAssoluto = document.getElementById('record-assoluto');
        var elStatRecord = document.getElementById('stat-record');

        var dailyVal = (r.daily && r.daily.key === oggi) ? r.daily.val : 0;
        var weeklyVal = (r.weekly && r.weekly.key === settimana) ? r.weekly.val : 0;
        var allVal = r.all ? r.all.val : 0;

        if (elOggi) elOggi.textContent = formatRecordVal(mode, dailyVal);
        if (elSettimana) elSettimana.textContent = formatRecordVal(mode, weeklyVal);
        if (elAssoluto) elAssoluto.textContent = formatRecordVal(mode, allVal);
        if (elStatRecord) elStatRecord.textContent = formatRecordVal(mode, allVal);
    }

    function azzeraRecordSingolo(e) {
        var btn = e.currentTarget;
        var tipo = btn.dataset.tipo;
        var mode = CONFIG.mode;

        if (!btn._timerConferma) {
            btn.textContent = isEn ? 'Sure?' : 'Confermi?';
            btn.classList.add('conferma');
            btn._timerConferma = setTimeout(function () {
                btn.innerHTML = '&#10226;';
                btn.classList.remove('conferma');
                btn._timerConferma = null;
            }, 3000);
        } else {
            clearTimeout(btn._timerConferma);
            btn._timerConferma = null;
            if (recordsData[mode]) {
                delete recordsData[mode][tipo];
            }
            salvaRecords();
            renderRecords();
            btn.innerHTML = '&#10226;';
            btn.classList.remove('conferma');
        }
    }

    // ─── LOGICA 7-BAG RANDOMIZER ──────────────────────────────────────────
    function createNewBag() {
        var pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        // Fisher-Yates shuffle
        for (var i = pieces.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = pieces[i];
            pieces[i] = pieces[j];
            pieces[j] = temp;
        }
        return pieces;
    }

    function getNextPieceType() {
        if (STATE.bag.length === 0) {
            STATE.bag = createNewBag();
        }
        return STATE.bag.pop();
    }

    function refillNextQueue() {
        while (STATE.nextQueue.length < 5) {
            STATE.nextQueue.push(getNextPieceType());
        }
    }

    // ─── GESTIONE MATRICE & COLLISIONI ────────────────────────────────────
    function createEmptyGrid() {
        var g = [];
        for (var r = 0; r < ROWS; r++) {
            g[r] = [];
            for (var c = 0; c < COLS; c++) {
                g[r][c] = null;
            }
        }
        return g;
    }

    function getPieceMatrix(type, rotation) {
        var shapes = SHAPES[type];
        return shapes[rotation % shapes.length];
    }

    function isValidPosition(type, rotation, x, y, customGrid) {
        var m = getPieceMatrix(type, rotation);
        var g = customGrid || STATE.grid;
        var size = m.length;

        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (m[r][c]) {
                    var newX = x + c;
                    var newY = y + r;

                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return false;
                    }
                    if (newY >= 0 && g[newY][newX] !== null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // Calcolo Ghost Piece (proiezione a terra)
    function getGhostY() {
        if (!STATE.currentPiece) return 0;
        var p = STATE.currentPiece;
        var ghostY = p.y;
        while (isValidPosition(p.type, p.rotation, p.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    // ─── FORMULA GRAVITÀ E VELOCITÀ ───────────────────────────────────────
    function getGravityInterval(level) {
        var lvl = Math.min(Math.max(level, 1), 20);
        var frames = Math.pow(0.8 - ((lvl - 1) * 0.007), lvl - 1) * 60;
        return Math.max((frames / 60) * 1000, 25);
    }

    // ─── GENERAZIONE NUOVO PEZZO ──────────────────────────────────────────
    function spawnPiece() {
        refillNextQueue();
        var type = STATE.nextQueue.shift();
        refillNextQueue();

        var m = getPieceMatrix(type, 0);
        var size = m.length;
        var spawnX = Math.floor((COLS - size) / 2);
        var spawnY = (type === 'I') ? -1 : 0;

        STATE.currentPiece = {
            type: type,
            rotation: 0,
            x: spawnX,
            y: spawnY,
            lastMoveWasRotate: false
        };
        STATE.canHold = true;
        STATE.lockResets = 0;
        clearLockTimer();

        // Incrementa statistiche
        STATE.stats[type]++;
        updateStatsUI();

        // Verifica Game Over istantaneo (blocco occupato allo spawn)
        if (!isValidPosition(type, 0, spawnX, spawnY)) {
            triggerGameOver();
        }
    }

    // ─── MOVIMENTI E ROTAZIONI (SRS) ──────────────────────────────────────
    function moveLeft() {
        if (!canControl()) return;
        var p = STATE.currentPiece;
        if (isValidPosition(p.type, p.rotation, p.x - 1, p.y)) {
            p.x--;
            p.lastMoveWasRotate = false;
            handleLockMovement();
            SFX.move();
        }
    }

    function moveRight() {
        if (!canControl()) return;
        var p = STATE.currentPiece;
        if (isValidPosition(p.type, p.rotation, p.x + 1, p.y)) {
            p.x++;
            p.lastMoveWasRotate = false;
            handleLockMovement();
            SFX.move();
        }
    }

    function rotatePiece(direction) {
        // direction: +1 per senso orario, -1 per senso antiorario
        if (!canControl()) return;
        var p = STATE.currentPiece;
        if (p.type === 'O') return;

        var oldRot = p.rotation;
        var newRot = (oldRot + direction + 4) % 4;
        var kickKey = oldRot + '->' + newRot;
        var kicks = (p.type === 'I') ? KICKS_I[kickKey] : KICKS_JLSTZ[kickKey];

        if (!kicks) kicks = [[0, 0]];

        for (var i = 0; i < kicks.length; i++) {
            var kx = kicks[i][0];
            var ky = -kicks[i][1];

            if (isValidPosition(p.type, newRot, p.x + kx, p.y + ky)) {
                p.rotation = newRot;
                p.x += kx;
                p.y += ky;
                p.lastMoveWasRotate = true;
                handleLockMovement();
                SFX.rotate();
                return;
            }
        }
    }

    function softDrop() {
        if (!canControl()) return;
        var p = STATE.currentPiece;
        if (isValidPosition(p.type, p.rotation, p.x, p.y + 1)) {
            p.y++;
            STATE.score += 1;
            updateStatsUI();
            STATE.lastDropTime = Date.now();
            SFX.drop();
        } else {
            lockPiece();
        }
    }

    function hardDrop() {
        if (!canControl()) return;
        var p = STATE.currentPiece;
        var startY = p.y;
        var ghostY = getGhostY();
        var droppedRows = ghostY - startY;

        p.y = ghostY;
        STATE.score += droppedRows * 2;
        updateStatsUI();

        createHardDropParticles(p.x, ghostY, p.type);
        SFX.hardDrop();
        lockPiece(true);
    }

    function holdPieceAction() {
        if (!canControl() || !STATE.canHold) return;
        var p = STATE.currentPiece;
        var currentType = p.type;

        clearLockTimer();

        if (!STATE.holdPiece) {
            STATE.holdPiece = currentType;
            spawnPiece();
        } else {
            var temp = STATE.holdPiece;
            STATE.holdPiece = currentType;
            var m = getPieceMatrix(temp, 0);
            var size = m.length;
            var spawnX = Math.floor((COLS - size) / 2);
            var spawnY = (temp === 'I') ? -1 : 0;

            STATE.currentPiece = {
                type: temp,
                rotation: 0,
                x: spawnX,
                y: spawnY,
                lastMoveWasRotate: false
            };
            STATE.stats[temp]++;
            updateStatsUI();
        }

        STATE.canHold = false;
        SFX.hold();
        renderHold();
    }

    // ─── GESTIONE LOCK DELAY ──────────────────────────────────────────────
    function handleLockMovement() {
        var p = STATE.currentPiece;
        if (!p) return;
        if (!isValidPosition(p.type, p.rotation, p.x, p.y + 1)) {
            if (STATE.lockResets < STATE.maxLockResets) {
                STATE.lockResets++;
                clearLockTimer();
                startLockTimer();
            }
        } else {
            clearLockTimer();
        }
    }

    function startLockTimer() {
        if (STATE.lockTimer) return;
        STATE.lockTimer = setTimeout(function () {
            lockPiece();
        }, STATE.lockDelay);
    }

    function clearLockTimer() {
        if (STATE.lockTimer) {
            clearTimeout(STATE.lockTimer);
            STATE.lockTimer = null;
        }
    }

    // ─── BLOCCO PEZZO E PULIZIA LINEE ─────────────────────────────────────
    function lockPiece(isHardDrop) {
        clearLockTimer();
        if (!STATE.currentPiece) return;

        var p = STATE.currentPiece;
        var m = getPieceMatrix(p.type, p.rotation);
        var size = m.length;
        var isTSpin = checkTSpin(p);

        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (m[r][c]) {
                    var gridX = p.x + c;
                    var gridY = p.y + r;
                    if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
                        STATE.grid[gridY][gridX] = p.type;
                    } else if (gridY < 0) {
                        triggerGameOver();
                        return;
                    }
                }
            }
        }

        STATE.currentPiece = null;

        // Controlla linee piene
        var fullLines = [];
        for (var row = 0; row < ROWS; row++) {
            var full = true;
            for (var col = 0; col < COLS; col++) {
                if (STATE.grid[row][col] === null) {
                    full = false;
                    break;
                }
            }
            if (full) fullLines.push(row);
        }

        if (fullLines.length > 0) {
            handleLinesCleared(fullLines, isTSpin);
        } else {
            STATE.combo = -1;
            spawnPiece();
        }
    }

    function checkTSpin(p) {
        if (p.type !== 'T' || !p.lastMoveWasRotate) return false;
        var cx = p.x + 1;
        var cy = p.y + 1;
        var corners = [
            [cx - 1, cy - 1],
            [cx + 1, cy - 1],
            [cx - 1, cy + 1],
            [cx + 1, cy + 1]
        ];
        var occupied = 0;
        for (var i = 0; i < corners.length; i++) {
            var x = corners[i][0];
            var y = corners[i][1];
            if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && STATE.grid[y][x] !== null)) {
                occupied++;
            }
        }
        return occupied >= 3;
    }

    function handleLinesCleared(lines, isTSpin) {
        var count = lines.length;
        STATE.clearingLines = lines;
        STATE.clearAnimTime = Date.now();

        var basePoints = [0, 100, 300, 500, 800];
        var points = basePoints[count] * STATE.level;
        var isDifficult = count === 4 || isTSpin;

        if (isTSpin) {
            var tSpinPoints = [0, 800, 1200, 1600];
            points = (tSpinPoints[count] || 400) * STATE.level;
        }

        // Back-to-Back bonus (1.5x)
        if (isDifficult) {
            if (STATE.backToBack) {
                points = Math.floor(points * 1.5);
                showActionBanner(TXT.backToBack + (count === 4 ? ' ' + TXT.tetraClear : ' ' + TXT.tspin));
            } else {
                if (count === 4) showActionBanner(TXT.tetraClear);
                else if (isTSpin) showActionBanner(TXT.tspin);
            }
            STATE.backToBack = true;
        } else {
            STATE.backToBack = false;
            if (count === 1) showActionBanner(TXT.single);
            else if (count === 2) showActionBanner(TXT.double);
            else if (count === 3) showActionBanner(TXT.triple);
        }

        // Combo bonus
        STATE.combo++;
        if (STATE.combo > 0) {
            points += 50 * STATE.combo * STATE.level;
        }

        STATE.score += points;
        STATE.lines += count;

        if (count === 4) {
            SFX.tetraClear();
        } else {
            SFX.lineClear(count);
        }

        // Avanzamento livello (ogni 10 righe in Marathon)
        var oldLevel = STATE.level;
        if (CONFIG.mode === 'marathon') {
            STATE.level = Math.floor(STATE.lines / 10) + CONFIG.startLevel;
            if (STATE.level > oldLevel) {
                SFX.levelUp();
                showActionBanner(TXT.levelUp);
            }
        }

        updateStatsUI();

        // Controllo vittoria Sprint 40 righe
        if (CONFIG.mode === 'sprint' && STATE.lines >= 40) {
            setTimeout(function () {
                finishSprint();
            }, 250);
            return;
        }

        setTimeout(function () {
            lines.forEach(function (r) {
                STATE.grid.splice(r, 1);
                var emptyRow = [];
                for (var c = 0; c < COLS; c++) emptyRow.push(null);
                STATE.grid.unshift(emptyRow);
            });

            STATE.clearingLines = [];
            spawnPiece();
        }, 180);
    }

    // ─── BANNER AZIONE / COMBO / BACK-TO-BACK ─────────────────────────────
    var bannerTimeout = null;
    function showActionBanner(text) {
        var banner = document.getElementById('tetra-action-banner');
        if (!banner) return;
        banner.textContent = text;
        banner.classList.add('show');
        if (bannerTimeout) clearTimeout(bannerTimeout);
        bannerTimeout = setTimeout(function () {
            banner.classList.remove('show');
        }, 1200);
    }

    // ─── GESTIONE EFFETTI PARTICELLE ──────────────────────────────────────
    function createHardDropParticles(pieceX, pieceY, pieceType) {
        var color = PIECE_COLORS[pieceType].light;
        for (var i = 0; i < 16; i++) {
            STATE.particles.push({
                x: (pieceX + Math.random() * 3) * BLOCK_SIZE,
                y: (pieceY + 2) * BLOCK_SIZE,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 1) * 5,
                color: color,
                alpha: 1,
                size: Math.random() * 4 + 2
            });
        }
    }

    function updateParticles() {
        for (var i = STATE.particles.length - 1; i >= 0; i--) {
            var pt = STATE.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.2;
            pt.alpha -= 0.035;
            if (pt.alpha <= 0) {
                STATE.particles.splice(i, 1);
            }
        }
    }

    // ─── RENDERING GRAFICO ────────────────────────────────────────────────
    function drawBlock(c, x, y, type, alpha) {
        if (!type || !PIECE_COLORS[type]) return;
        var pCol = PIECE_COLORS[type];
        var px = x * BLOCK_SIZE;
        var py = y * BLOCK_SIZE;
        var s = BLOCK_SIZE;

        c.save();
        if (alpha !== undefined) c.globalAlpha = alpha;

        c.fillStyle = pCol.main;
        c.fillRect(px, py, s, s);

        c.fillStyle = pCol.light;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + s, py);
        c.lineTo(px + s - 3, py + 3);
        c.lineTo(px + 3, py + 3);
        c.lineTo(px + 3, py + s - 3);
        c.lineTo(px, py + s);
        c.closePath();
        c.fill();

        c.fillStyle = pCol.dark;
        c.beginPath();
        c.moveTo(px + s, py);
        c.lineTo(px + s, py + s);
        c.lineTo(px, py + s);
        c.lineTo(px + 3, py + s - 3);
        c.lineTo(px + s - 3, py + s - 3);
        c.lineTo(px + s - 3, py + 3);
        c.closePath();
        c.fill();

        c.fillStyle = 'rgba(255, 255, 255, 0.25)';
        c.fillRect(px + 5, py + 5, s - 10, s - 10);

        c.strokeStyle = pCol.shadow;
        c.lineWidth = 1;
        c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);

        c.restore();
    }

    function renderBoard() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (var c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * BLOCK_SIZE, 0);
            ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            ctx.stroke();
        }
        for (var r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * BLOCK_SIZE);
            ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
            ctx.stroke();
        }

        for (var row = 0; row < ROWS; row++) {
            var isClearing = STATE.clearingLines.indexOf(row) !== -1;
            for (var col = 0; col < COLS; col++) {
                var cell = STATE.grid[row][col];
                if (cell) {
                    if (isClearing) {
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = '#ffd700';
                        ctx.shadowBlur = 10;
                        ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                        ctx.shadowBlur = 0;
                    } else {
                        drawBlock(ctx, col, row, cell);
                    }
                }
            }
        }

        if (CONFIG.ghostEnabled && STATE.currentPiece && STATE.clearingLines.length === 0) {
            var p = STATE.currentPiece;
            var gy = getGhostY();
            var m = getPieceMatrix(p.type, p.rotation);
            var size = m.length;

            for (var gr = 0; gr < size; gr++) {
                for (var gc = 0; gc < size; gc++) {
                    if (m[gr][gc]) {
                        var gX = p.x + gc;
                        var gY = gy + gr;
                        if (gY >= 0 && gY < ROWS) {
                            drawBlock(ctx, gX, gY, p.type, 0.22);
                        }
                    }
                }
            }
        }

        if (STATE.currentPiece && STATE.clearingLines.length === 0) {
            var cp = STATE.currentPiece;
            var cm = getPieceMatrix(cp.type, cp.rotation);
            var csize = cm.length;

            for (var pr = 0; pr < csize; pr++) {
                for (var pc = 0; pc < csize; pc++) {
                    if (cm[pr][pc]) {
                        var posX = cp.x + pc;
                        var posY = cp.y + pr;
                        if (posY >= 0 && posY < ROWS) {
                            drawBlock(ctx, posX, posY, cp.type, 1.0);
                        }
                    }
                }
            }
        }

        for (var i = 0; i < STATE.particles.length; i++) {
            var pt = STATE.particles[i];
            ctx.save();
            ctx.globalAlpha = Math.max(pt.alpha, 0);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function renderHold() {
        if (!holdCtx) return;
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (!STATE.holdPiece) return;

        var type = STATE.holdPiece;
        var m = getPieceMatrix(type, 0);
        var size = m.length;
        var miniSize = 20;

        var totalW = 0;
        var totalH = 0;
        if (type === 'I') { totalW = 4 * miniSize; totalH = 1 * miniSize; }
        else if (type === 'O') { totalW = 2 * miniSize; totalH = 2 * miniSize; }
        else { totalW = 3 * miniSize; totalH = 2 * miniSize; }

        var offsetX = Math.floor((holdCanvas.width - totalW) / 2);
        var offsetY = Math.floor((holdCanvas.height - totalH) / 2);

        var alpha = STATE.canHold ? 1.0 : 0.45;

        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (m[r][c]) {
                    var px = offsetX + c * miniSize;
                    var py = offsetY + r * miniSize;
                    drawMiniBlock(holdCtx, px, py, miniSize, type, alpha);
                }
            }
        }
    }

    function renderNext() {
        if (!nextCtx) return;
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        var miniSize = 18;
        var visibleCount = 3;

        for (var i = 0; i < visibleCount; i++) {
            var type = STATE.nextQueue[i];
            if (!type) continue;
            var m = getPieceMatrix(type, 0);
            var size = m.length;

            var totalW = (type === 'I') ? 4 * miniSize : (type === 'O' ? 2 * miniSize : 3 * miniSize);
            var offsetX = Math.floor((nextCanvas.width - totalW) / 2);
            var slotOffsetY = i * 62 + 8;

            for (var r = 0; r < size; r++) {
                for (var c = 0; c < size; c++) {
                    if (m[r][c]) {
                        var px = offsetX + c * miniSize;
                        var py = slotOffsetY + r * miniSize;
                        drawMiniBlock(nextCtx, px, py, miniSize, type, 1.0);
                    }
                }
            }
        }
    }

    function drawMiniBlock(c, px, py, s, type, alpha) {
        var pCol = PIECE_COLORS[type];
        c.save();
        if (alpha !== undefined) c.globalAlpha = alpha;

        c.fillStyle = pCol.main;
        c.fillRect(px, py, s, s);

        c.fillStyle = pCol.light;
        c.fillRect(px, py, s, 2);
        c.fillRect(px, py, 2, s);

        c.fillStyle = pCol.dark;
        c.fillRect(px, py + s - 2, s, 2);
        c.fillRect(px + s - 2, py, 2, s);

        c.strokeStyle = pCol.shadow;
        c.lineWidth = 1;
        c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);

        c.restore();
    }

    // ─── GAME LOOP PRINCIPALE ─────────────────────────────────────────────
    var animFrameId = null;
    function gameLoop(timestamp) {
        if (!STATE.isPlaying) return;

        if (!STATE.isPaused && !STATE.isGameOver) {
            var now = Date.now();
            var gravity = getGravityInterval(STATE.level);

            if (STATE.currentPiece && STATE.clearingLines.length === 0) {
                if (now - STATE.lastDropTime >= gravity) {
                    if (isValidPosition(STATE.currentPiece.type, STATE.currentPiece.rotation, STATE.currentPiece.x, STATE.currentPiece.y + 1)) {
                        STATE.currentPiece.y++;
                        STATE.lastDropTime = now;
                        handleLockMovement();
                    } else {
                        startLockTimer();
                    }
                }
            }

            updateParticles();
            renderBoard();
            renderHold();
            renderNext();
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    // ─── STATISTICHE & UI ─────────────────────────────────────────────────
    function updateStatsUI() {
        var scoreEl = document.getElementById('stat-score');
        var linesEl = document.getElementById('stat-lines');
        var levelEl = document.getElementById('stat-level');

        if (scoreEl) scoreEl.textContent = STATE.score;
        if (linesEl) linesEl.textContent = STATE.lines;
        if (levelEl) levelEl.textContent = STATE.level;

        renderRecords();

        // Visualizzazione dinamica del box tempo (solo se significativo: Sprint o Ultra)
        var boxTempoContainer = document.getElementById('box-tempo-container');
        var lblTempoBox = document.getElementById('lbl-tempo-box');
        if (boxTempoContainer) {
            if (CONFIG.mode === 'sprint' || CONFIG.mode === 'ultra') {
                boxTempoContainer.style.display = 'flex';
                if (lblTempoBox) {
                    lblTempoBox.textContent = CONFIG.mode === 'ultra' ? (isEn ? '⏱️ Remaining' : '⏱️ Rimanente') : (isEn ? '⏱️ Time' : '⏱️ Tempo');
                }
            } else {
                boxTempoContainer.style.display = 'none';
            }
        }

        ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].forEach(function (type) {
            var el = document.getElementById('stat-piece-' + type);
            if (el) el.textContent = STATE.stats[type];
        });
    }

    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = (seconds % 60).toFixed(1);
        return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    // ─── TIMER MODALITÀ SPRINT & ULTRA ────────────────────────────────────
    function startModeTimer() {
        clearInterval(STATE.timerInterval);
        STATE.startTime = Date.now();

        var timeDisplay = document.getElementById('stat-tempo');
        if (CONFIG.mode === 'ultra') {
            if (timeDisplay) timeDisplay.textContent = '02:00.0';
        } else if (CONFIG.mode === 'sprint') {
            if (timeDisplay) timeDisplay.textContent = '00:00.0';
        }

        if (CONFIG.mode === 'marathon') return;

        STATE.timerInterval = setInterval(function () {
            if (!STATE.isPlaying || STATE.isPaused || STATE.isGameOver) return;
            var now = Date.now();
            STATE.elapsedTime = (now - STATE.startTime) / 1000;

            var timeDisplay = document.getElementById('stat-tempo');
            if (CONFIG.mode === 'ultra') {
                var remaining = Math.max(120 - STATE.elapsedTime, 0);
                if (timeDisplay) timeDisplay.textContent = formatTime(remaining);
                if (remaining <= 0) {
                    finishUltra();
                }
            } else if (CONFIG.mode === 'sprint') {
                if (timeDisplay) timeDisplay.textContent = formatTime(STATE.elapsedTime);
            }
        }, 100);
    }

    // ─── GESTIONE FINE PARTITA & RECORD ───────────────────────────────────
    function triggerGameOver() {
        STATE.isGameOver = true;
        STATE.isPlaying = false;
        clearInterval(STATE.timerInterval);
        clearLockTimer();
        SFX.gameOver();

        var isNewRecord = false;
        if (CONFIG.mode === 'marathon' || CONFIG.mode === 'ultra') {
            isNewRecord = aggiornaRecords(CONFIG.mode, STATE.score);
        }

        showGameOverModal(TXT.gameOver, isNewRecord);
    }

    function finishSprint() {
        STATE.isPlaying = false;
        clearInterval(STATE.timerInterval);
        clearLockTimer();
        SFX.levelUp();

        var timeTaken = parseFloat(STATE.elapsedTime.toFixed(2));
        var isNewRecord = aggiornaRecords('sprint', timeTaken);

        showGameOverModal(TXT.sprintComplete, isNewRecord, true);
    }

    function finishUltra() {
        STATE.isPlaying = false;
        clearInterval(STATE.timerInterval);
        clearLockTimer();
        SFX.levelUp();

        var isNewRecord = aggiornaRecords('ultra', STATE.score);

        showGameOverModal(TXT.ultraComplete, isNewRecord);
    }

    function showGameOverModal(titleText, isNewRecord, isSprint) {
        var modal = document.getElementById('modale-fine');
        var schermo = document.getElementById('schermo');
        var titoloEl = document.getElementById('fine-titolo');
        var badgeRecord = document.getElementById('badge-nuovo-record');
        var valPunti = document.getElementById('fine-val-punti');
        var valRighe = document.getElementById('fine-val-righe');
        var valLivello = document.getElementById('fine-val-livello');
        var valTempo = document.getElementById('fine-val-tempo');

        if (titoloEl) titoloEl.textContent = titleText;
        if (badgeRecord) badgeRecord.style.display = isNewRecord ? 'inline-block' : 'none';
        if (valPunti) valPunti.textContent = STATE.score;
        if (valRighe) valRighe.textContent = STATE.lines;
        if (valLivello) valLivello.textContent = STATE.level;
        if (valTempo) valTempo.textContent = formatTime(STATE.elapsedTime);

        if (modal) {
            modal.style.display = 'flex';
            if (typeof setupAmazonFinishBanner === 'function') {
                setupAmazonFinishBanner('modale-fine', {
                    modalStyle: { overflow: 'visible' },
                    targetTop: 430,
                    applyModalTop: false,
                    bannerHeight: 300,
                    bannerTopOffset: 325,
                    leftOffset: 0
                });
            }
        }
    }

    // ─── CONTROLLO STATO & MODALI ─────────────────────────────────────────
    function canControl() {
        return STATE.isPlaying && !STATE.isPaused && !STATE.isGameOver && STATE.clearingLines.length === 0;
    }

    window.togglePause = function () {
        if (!STATE.isPlaying || STATE.isGameOver) return;
        STATE.isPaused = !STATE.isPaused;

        var btn = document.getElementById('btn-pausa');
        var modalePausa = document.getElementById('modale-pausa');
        var schermo = document.getElementById('schermo');
        var msgStato = document.getElementById('messaggio-stato-tetra');

        if (STATE.isPaused) {
            if (btn) btn.classList.add('attivo');
            if (modalePausa) modalePausa.style.display = 'flex';
            if (schermo) schermo.style.display = 'block';
            if (msgStato) msgStato.textContent = TXT.paused;
        } else {
            if (btn) btn.classList.remove('attivo');
            if (modalePausa) modalePausa.style.display = 'none';
            if (schermo) schermo.style.display = 'none';
            if (msgStato) msgStato.textContent = TXT.resumed;
            STATE.lastDropTime = Date.now();
        }
    };

    window.toggleGhost = function () {
        CONFIG.ghostEnabled = !CONFIG.ghostEnabled;
        var btn = document.getElementById('btn-ghost');
        if (btn) {
            if (CONFIG.ghostEnabled) btn.classList.add('attivo');
            else btn.classList.remove('attivo');
        }
    };

    window.apriModaleInizio = function () {
        chiudiModali();
        STATE.isPlaying = false;
        STATE.isPaused = false;
        clearInterval(STATE.timerInterval);
        clearLockTimer();
        if (animFrameId) cancelAnimationFrame(animFrameId);

        var modale = document.getElementById('modale-inizio');
        var schermo = document.getElementById('schermo');
        if (modale) modale.style.display = 'flex';
        if (schermo) schermo.style.display = 'block';
    };

    window.apriConfermaNuova = function () {
        chiudiModali();
        var modale = document.getElementById('confermatermina');
        var schermo = document.getElementById('schermo');
        if (modale) {
            modale.style.display = 'flex';
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
        if (schermo) schermo.style.display = 'block';
    };

    window.apriModaleControlli = function () {
        chiudiModali();
        var modale = document.getElementById('modale-controlli');
        var schermo = document.getElementById('schermo');
        if (modale) modale.style.display = 'flex';
        if (schermo) schermo.style.display = 'block';
    };

    window.chiudiModali = function () {
        var modali = document.querySelectorAll('.form-tetra');
        modali.forEach(function (m) { m.style.display = 'none'; });
        var schermo = document.getElementById('schermo');
        if (schermo) schermo.style.display = 'none';
        document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
    };

    window.selezionaModalita = function (mode) {
        CONFIG.mode = mode;
        var btns = document.querySelectorAll('#modale-inizio .opzione-gruppo:nth-child(2) .btn-opzione-sel');
        btns.forEach(function (b) { b.classList.remove('attiva'); });
        var activeBtn = document.getElementById('btn-mode-' + mode);
        if (activeBtn) activeBtn.classList.add('attiva');

        var badge = document.getElementById('modalita-badge');
        if (badge) {
            if (mode === 'marathon') badge.textContent = TXT.modeMarathon;
            else if (mode === 'sprint') badge.textContent = TXT.modeSprint;
            else if (mode === 'ultra') badge.textContent = TXT.modeUltra;
        }

        updateStatsUI();
    };

    window.selezionaLivelloIniziale = function (lvl) {
        CONFIG.startLevel = parseInt(lvl, 10);
        var btns = document.querySelectorAll('#modale-inizio .opzione-gruppo:nth-child(3) .btn-opzione-sel');
        btns.forEach(function (b) { b.classList.remove('attiva'); });
        var activeBtn = document.getElementById('btn-lvl-' + lvl);
        if (activeBtn) activeBtn.classList.add('attiva');
    };

    window.holdPieceAction = function () {
        holdPieceAction();
    };

    window.avviaNuovaPartita = function () {
        chiudiModali();

        STATE.grid = createEmptyGrid();
        STATE.bag = [];
        STATE.nextQueue = [];
        STATE.holdPiece = null;
        STATE.canHold = true;
        STATE.score = 0;
        STATE.lines = 0;
        STATE.level = CONFIG.startLevel;
        STATE.combo = -1;
        STATE.backToBack = false;
        STATE.stats = { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 };
        STATE.isPlaying = true;
        STATE.isPaused = false;
        STATE.isGameOver = false;
        STATE.clearingLines = [];
        STATE.particles = [];
        STATE.lastDropTime = Date.now();

        refillNextQueue();
        spawnPiece();
        updateStatsUI();
        startModeTimer();

        var msgStato = document.getElementById('messaggio-stato-tetra');
        if (msgStato) msgStato.textContent = TXT.title;

        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(gameLoop);
    };

    // ─── GESTIONE EVENTI TASTIERA ─────────────────────────────────────────
    var keyState = {};
    window.addEventListener('keydown', function (e) {
        var code = e.code || '';
        var key = (e.key || '').toLowerCase();

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(code) !== -1 ||
            ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(key) !== -1) {
            e.preventDefault();
        }

        if (e.repeat) return;
        keyState[code] = true;

        if (code === 'KeyP' || key === 'p' || code === 'Escape' || key === 'escape') {
            window.togglePause();
            return;
        }

        if (!canControl()) return;

        if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'a') {
            moveLeft();
            clearTimeout(dasTimeout);
            clearInterval(dasInterval);
            dasTimeout = setTimeout(function () {
                dasInterval = setInterval(moveLeft, 45);
            }, 160);
        } else if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'd') {
            moveRight();
            clearTimeout(dasTimeout);
            clearInterval(dasInterval);
            dasTimeout = setTimeout(function () {
                dasInterval = setInterval(moveRight, 45);
            }, 160);
        } else if (code === 'ArrowDown' || code === 'KeyS' || key === 'arrowdown' || key === 's') {
            softDrop();
            clearTimeout(dasTimeout);
            clearInterval(dasInterval);
            dasTimeout = setTimeout(function () {
                dasInterval = setInterval(softDrop, 45);
            }, 100);
        } else if (code === 'ArrowUp' || code === 'KeyX' || code === 'KeyW' || key === 'arrowup' || key === 'x' || key === 'w') {
            rotatePiece(1);
        } else if (code === 'KeyZ' || code === 'ControlLeft' || code === 'ControlRight' || key === 'z' || key === 'control') {
            rotatePiece(-1);
        } else if (code === 'Space' || key === ' ') {
            hardDrop();
        } else if (code === 'KeyC' || code === 'ShiftLeft' || code === 'ShiftRight' || key === 'c' || key === 'shift') {
            e.preventDefault();
            holdPieceAction();
        }
    });

    window.addEventListener('keyup', function (e) {
        keyState[e.code] = false;
        if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].indexOf(e.code) !== -1) {
            clearTimeout(dasTimeout);
            clearInterval(dasInterval);
        }
    });

    // ─── GESTIONE CONTROLLI TOUCH ─────────────────────────────────────────
    function initTouchControls() {
        var btnLeft = document.getElementById('touch-left');
        var btnRight = document.getElementById('touch-right');
        var btnDown = document.getElementById('touch-down');
        var btnHard = document.getElementById('touch-hard');
        var btnRotCW = document.getElementById('touch-rot-cw');
        var btnRotCCW = document.getElementById('touch-rot-ccw');
        var btnHold = document.getElementById('touch-hold');

        var setupTouchRepeat = function (elem, actionFn, repeatDelay) {
            if (!elem) return;
            var tTimer = null;
            var tInterval = null;

            var startAction = function (e) {
                if (e.cancelable) e.preventDefault();
                actionFn();
                tTimer = setTimeout(function () {
                    tInterval = setInterval(actionFn, repeatDelay || 50);
                }, 160);
            };

            var endAction = function (e) {
                clearTimeout(tTimer);
                clearInterval(tInterval);
            };

            elem.addEventListener('touchstart', startAction, { passive: false });
            elem.addEventListener('touchend', endAction, { passive: true });
            elem.addEventListener('touchcancel', endAction, { passive: true });

            elem.addEventListener('mousedown', function (e) {
                if (e.button !== 0) return;
                startAction(e);
                var upHandler = function () {
                    endAction();
                    window.removeEventListener('mouseup', upHandler);
                };
                window.addEventListener('mouseup', upHandler);
            });
        };

        var setupTouchSingle = function (elem, actionFn) {
            if (!elem) return;
            elem.addEventListener('touchstart', function (e) {
                if (e.cancelable) e.preventDefault();
                actionFn();
            }, { passive: false });

            elem.addEventListener('click', function (e) {
                e.preventDefault();
                actionFn();
            });
        };

        setupTouchRepeat(btnLeft, moveLeft, 50);
        setupTouchRepeat(btnRight, moveRight, 50);
        setupTouchRepeat(btnDown, softDrop, 50);
        setupTouchSingle(btnHard, hardDrop);
        setupTouchSingle(btnRotCW, function () { rotatePiece(1); });
        setupTouchSingle(btnRotCCW, function () { rotatePiece(-1); });
        setupTouchSingle(btnHold, holdPieceAction);
    }

    // ─── INIZIALIZZAZIONE GIOCO ALL'AVVIO ──────────────────────────────────
    function init() {
        // Se l'overlay dell'interstitial è presente a schermo, aspetta la sua chiusura
        if (document.getElementById('interstitial-overlay')) {
            var checkOverlay = setInterval(function () {
                if (!document.getElementById('interstitial-overlay')) {
                    clearInterval(checkOverlay);
                    init();
                }
            }, 100);
            return;
        }

        canvas = document.getElementById('tetra-canvas');
        if (canvas) {
            canvas.width = COLS * BLOCK_SIZE;
            canvas.height = ROWS * BLOCK_SIZE;
            ctx = canvas.getContext('2d');
        }

        holdCanvas = document.getElementById('hold-canvas');
        if (holdCanvas) {
            holdCanvas.width = 100;
            holdCanvas.height = 70;
            holdCtx = holdCanvas.getContext('2d');

            var onHoldTrigger = function (e) {
                if (e.cancelable) e.preventDefault();
                holdPieceAction();
            };
            holdCanvas.addEventListener('click', onHoldTrigger);
            holdCanvas.addEventListener('touchstart', onHoldTrigger, { passive: false });

            var holdParent = holdCanvas.closest('.tetra-box');
            if (holdParent) {
                holdParent.addEventListener('click', onHoldTrigger);
            }
        }

        nextCanvas = document.getElementById('next-canvas');
        if (nextCanvas) {
            nextCanvas.width = 100;
            nextCanvas.height = 190;
            nextCtx = nextCanvas.getContext('2d');
        }

        if (window.initAudioToggle) {
            window.initAudioToggle('#btn-audio');
        } else {
            var btnAudio = document.getElementById('btn-audio');
            if (btnAudio) {
                if (window.audioMuted) btnAudio.classList.add('muted');
                btnAudio.addEventListener('click', function () {
                    window.audioMuted = !window.audioMuted;
                    localStorage.setItem('site-audio-muted', window.audioMuted);
                    if (window.audioMuted) btnAudio.classList.add('muted');
                    else btnAudio.classList.remove('muted');
                });
            }
        }

        caricaRecords();

        var resetBtns = document.querySelectorAll('.btn-reset-record-tetra');
        resetBtns.forEach(function (btn) {
            btn.addEventListener('click', azzeraRecordSingolo);
        });

        initTouchControls();
        updateStatsUI();

        // Assicuriamoci che il layout si adegui
        if (typeof adjustLayout === 'function') {
            adjustLayout();
        }

        // Avvia Riquadro Affiliati Rotante (pubblicità adattabile) come in Battaglia Navale e Calcolo
        // Parte da qui e non da DOMContentLoaded perché init attende la chiusura dell'interstitial:
        // ruotare mentre l'overlay copre la pagina conterebbe impression mai viste.
        if (typeof setupRotatingAffiliateBanner === 'function') {
            var boxAff = document.getElementById('banner-rotante');
            if (boxAff) {
                setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
            }
        }

        var modaleInizio = document.getElementById('modale-inizio');
        var schermo = document.getElementById('schermo');
        if (modaleInizio) modaleInizio.style.display = 'flex';
        if (schermo) schermo.style.display = 'block';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (typeof window.waitForInterstitial === 'function') {
                window.waitForInterstitial(init);
            } else {
                init();
            }
        });
    } else {
        if (typeof window.waitForInterstitial === 'function') {
            window.waitForInterstitial(init);
        } else {
            init();
        }
    }

})();
