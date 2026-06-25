// accordi2.js v1.0 — versione migliorata di accordi.js
// Novità: statistiche per accordo (localStorage), streak, livello custom,
// confronto accordi dopo errore, nome+note dopo risposta, scorciatoie tastiera,
// impostazioni persistenti.

(function () {
    'use strict';

    if (typeof Tone === 'undefined') {
        document.getElementById('feedback').textContent = 'Errore: Tone.js non trovato in musica/lib/tone.js';
        document.getElementById('feedback').style.color = '#e74c3c';
        return;
    }

    var EN = window.currentLang === 'en';
    var T = {
        ready:        EN ? 'Ready — press ▶ to listen'        : 'Pronto — premi ▶ per ascoltare',
        correct:      EN ? 'Correct! ✓'                        : 'Corretto! ✓',
        wrong:        EN ? 'Wrong — try again!'                 : 'Sbagliato — riprova!',
        error:        EN ? 'Audio samples load error'           : 'Errore caricamento campioni audio',
        invOff:       EN ? '♭ Off'                              : '♭ Disattive',
        invOn:        EN ? '♭ On'                               : '♭ Attive',
        manual:       EN ? '⏸ Manual'                           : '⏸ Manuale',
        auto:         EN ? '▶▶ Auto'                            : '▶▶ Auto',
        choose:       EN ? 'Choose the chord'                   : 'Scegli l’accordo',
        customHint:   EN ? 'Tap the chords to train (min 2), then ▶' : 'Clicca gli accordi da allenare (min 2), poi ▶',
        customTooFew: EN ? 'Select at least 2 chords'           : 'Seleziona almeno 2 accordi',
        comparing:    EN ? '▶ correct, then ✗ yours'            : '▶ giusto, poi ✗ il tuo',
        inv:          EN ? 'inv.'                               : 'inv.',
        stTries:      EN ? 'Tries'                              : 'Tentativi',
        stOk:         EN ? 'Correct'                            : 'Corrette',
        stChord:      EN ? 'Chord'                              : 'Accordo',
        stConf:       EN ? 'Confused with'                      : 'Confuso con',
        stTotal:      EN ? 'Total'                              : 'Totale',
        stBest:       EN ? 'Best streak'                        : 'Streak record',
        stEmpty:      EN ? 'No data yet — play some rounds!'    : 'Nessun dato — gioca qualche turno!',
        stConfirm:    EN ? 'Reset all statistics?'              : 'Azzerare tutte le statistiche?'
    };

    var CHORDS = [
        // Liv 1                                                               steps: passi diatonici di ogni intervallo
        { id: 'mag',     name: 'Maggiore',   intervals: [4, 7],          steps: [2, 4]    },
        { id: 'min',     name: 'Minore',     intervals: [3, 7],          steps: [2, 4]    },
        // Liv 2
        { id: 'dom7',    name: 'Dom 7ª',     intervals: [4, 7, 10],      steps: [2, 4, 6] },
        { id: 'maj7',    name: 'Maj 7ª',     intervals: [4, 7, 11],      steps: [2, 4, 6] },
        { id: 'min7',    name: 'Min 7ª',     intervals: [3, 7, 10],      steps: [2, 4, 6] },
        // Liv 3
        { id: 'aug',     name: 'Aumentato',  intervals: [4, 8],          steps: [2, 4]    },
        { id: 'dim7',    name: 'Dim 7ª',     intervals: [3, 6, 9],       steps: [2, 4, 5] }, // 9 sem = "6a" pratica (Bbb→A enarm.)
        { id: 'maj6',    name: 'Mag 6ª',     intervals: [4, 7, 9],       steps: [2, 4, 5] },
        { id: 'min6',    name: 'Min 6ª',     intervals: [3, 7, 9],       steps: [2, 4, 5] },
        // Liv 4
        { id: 'semidim', name: 'Semidim.',   intervals: [3, 6, 10],      steps: [2, 4, 6] },
        { id: 'sus2',    name: 'Sus 2',      intervals: [2, 7],          steps: [1, 4]    },
        { id: 'sus4',    name: 'Sus 4',      intervals: [5, 7],          steps: [3, 4]    },
        // Liv 5 jazz
        { id: 'dom9',    name: 'Dom 9ª',     intervals: [4, 7, 10, 14],  steps: [2, 4, 6, 8] },
        { id: 'maj9',    name: 'Maj 9ª',     intervals: [4, 7, 11, 14],  steps: [2, 4, 6, 8] },
        { id: 'min9',    name: 'Min 9ª',     intervals: [3, 7, 10, 14],  steps: [2, 4, 6, 8] },
    ];

    var DIFFICULTY_IDS = {
        1: ['mag', 'min'],
        2: ['mag', 'min', 'dom7', 'maj7', 'min7'],
        3: ['mag', 'min', 'dom7', 'maj7', 'min7', 'aug', 'dim7', 'maj6', 'min6'],
        4: ['mag', 'min', 'dom7', 'maj7', 'min7', 'aug', 'dim7', 'maj6', 'min6', 'semidim', 'sus2', 'sus4'],
        5: null  // tutti
    };

    var NOTE_DISPLAY       = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
    var NOTE_DISPLAY_FLAT  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
    var NOTE_NAMES         = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var LETTERS            = ['C','D','E','F','G','A','B'];

    var ROOT_MIN = 48;  // C3
    var ROOT_MAX = 60;  // C4

    function midiToNote(midi) {
        return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    }
    function midiToDisplay(midi) {
        return NOTE_DISPLAY[midi % 12] + (Math.floor(midi / 12) - 1);
    }
    function findChord(id) {
        for (var i = 0; i < CHORDS.length; i++) if (CHORDS[i].id === id) return CHORDS[i];
        return null;
    }

    // ── Persistenza ───────────────────────────────────────────────────────────

    var LS_SETTINGS = 'accordi2_settings';
    var LS_STATS    = 'accordi2_stats';

    function lsLoad(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function lsSave(key, obj) {
        try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
    }

    var stats = lsLoad(LS_STATS, { perChord: {}, bestStreak: 0 });
    if (!stats.perChord) stats.perChord = {};
    if (!stats.bestStreak) stats.bestStreak = 0;

    function statFor(id) {
        if (!stats.perChord[id]) stats.perChord[id] = { a: 0, c: 0, conf: {} };
        return stats.perChord[id];
    }
    function saveStats() { lsSave(LS_STATS, stats); }

    var state = {
        mode:             'arpeggio-up',
        difficulty:       1,            // 1..5 oppure 'custom'
        inversions:       false,
        autoAdvance:      false,
        rootFixed:        true,
        rootMidi:         60,
        customIds:        ['mag', 'min', 'dom7'],
        selectingCustom:  false,
        currentRootMidi:  60,
        currentChord:     null,
        currentInversion: 0,
        triedIds:         [],
        foundMidis:       [],
        wrongKeyClick:    false,
        confRecorded:     false,
        lastWrongId:      null,
        score:            0,
        total:            0,
        streak:           0,
        answered:         false
    };

    (function loadSettings() {
        var s = lsLoad(LS_SETTINGS, null);
        if (!s) return;
        if (s.mode === 'arpeggio-up' || s.mode === 'arpeggio-down' || s.mode === 'blocco') state.mode = s.mode;
        if (s.difficulty === 'custom' || DIFFICULTY_IDS.hasOwnProperty(s.difficulty)) state.difficulty = s.difficulty;
        if (typeof s.inversions  === 'boolean') state.inversions  = s.inversions;
        if (typeof s.autoAdvance === 'boolean') state.autoAdvance = s.autoAdvance;
        if (typeof s.rootFixed   === 'boolean') state.rootFixed   = s.rootFixed;
        if (typeof s.rootMidi === 'number' && s.rootMidi >= ROOT_MIN && s.rootMidi <= ROOT_MAX) state.rootMidi = s.rootMidi;
        if (Object.prototype.toString.call(s.customIds) === '[object Array]') {
            state.customIds = s.customIds.filter(function (id) { return !!findChord(id); });
        }
        if (state.difficulty === 'custom' && state.customIds.length < 2) state.difficulty = 1;
    })();

    function saveSettings() {
        lsSave(LS_SETTINGS, {
            mode:        state.mode,
            difficulty:  state.difficulty,
            inversions:  state.inversions,
            autoAdvance: state.autoAdvance,
            rootFixed:   state.rootFixed,
            rootMidi:    state.rootMidi,
            customIds:   state.customIds
        });
    }

    var SAMPLER_URLS = {
        'C3':  'C3.mp3',  'Eb3': 'Eb3.mp3',
        'Gb3': 'Gb3.mp3', 'A3':  'A3.mp3',
        'C4':  'C4.mp3',  'Eb4': 'Eb4.mp3',
        'Gb4': 'Gb4.mp3', 'A4':  'A4.mp3',
        'C5':  'C5.mp3'
    };

    var sampler = new Tone.Sampler({
        urls: SAMPLER_URLS,
        baseUrl: '../sounds/piano/',
        onload: onSamplerReady,
        onerror: function () { setFeedback(T.error, '#e74c3c'); }
    }).toDestination();

    function onSamplerReady() {
        buildKeyboard();
        buildStaff();
        updateChordButtons();
        updateRootNoteDisplay();
        document.getElementById('btn-play').disabled = false;
        setFeedback(T.ready, 'rgba(255,255,255,0.35)');
        newQuestion(false);
    }

    // ── Chord utilities ───────────────────────────────────────────────────────

    function getActiveChords() {
        if (state.difficulty === 'custom') {
            return CHORDS.filter(function (c) { return state.customIds.indexOf(c.id) !== -1; });
        }
        var ids = DIFFICULTY_IDS[state.difficulty];
        return ids ? CHORDS.filter(function (c) { return ids.indexOf(c.id) !== -1; })
                   : CHORDS.slice();
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Restituisce le midi note dell'accordo nell'inversione indicata
    function getChordMidis(rootMidi, chord, inversion) {
        var inv = Math.min(inversion, chord.intervals.length);
        var notes = [0].concat(chord.intervals).map(function (i) { return rootMidi + i; });
        for (var i = 0; i < inv; i++) {
            notes[i] += 12;
        }
        notes.sort(function (a, b) { return a - b; });
        return notes;
    }

    // Accordo in posizione fondamentale (sempre, per mostrare sul pentagramma)
    function getRootPositionMidis(rootMidi, chord) {
        return [0].concat(chord.intervals).map(function (i) { return rootMidi + i; });
    }

    // ── Game logic ────────────────────────────────────────────────────────────

    function newQuestion(autoPlay) {
        if (state.selectingCustom) return;
        var active = getActiveChords();
        if (!active.length) return;
        var pool = active.length > 1 && state.currentChord
            ? active.filter(function (c) { return c.id !== state.currentChord.id; })
            : active;
        state.currentChord    = pool[randomInt(0, pool.length - 1)];
        state.currentRootMidi = state.rootFixed ? state.rootMidi : randomInt(ROOT_MIN, ROOT_MAX);
        var maxInv = state.currentChord.intervals.length;
        state.currentInversion = state.inversions ? randomInt(0, maxInv) : 0;
        state.answered      = false;
        state.triedIds      = [];
        state.foundMidis    = [];
        state.wrongKeyClick = false;
        state.confRecorded  = false;
        state.lastWrongId   = null;
        resetButtonStyles();
        hideCompare();
        setLabelChoose();
        document.querySelectorAll('.piano-key').forEach(function (k) { k.classList.remove('wrong'); });
        setFeedback('', 'transparent');
        updateKeyboard();
        updateStaff();
        if (autoPlay !== false) playCurrentChord();
    }

    // Suona un set di note midi secondo la modalità corrente, con offset opzionale.
    // Ritorna la durata complessiva stimata in secondi (per accodare altri suoni).
    function playMidis(midis, now, startOffset) {
        var t0 = now + (startOffset || 0);
        if (state.mode === 'arpeggio-up') {
            midis.forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', t0 + i * 0.32); });
            return midis.length * 0.32 + 0.7;
        }
        if (state.mode === 'arpeggio-down') {
            midis.slice().reverse().forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', t0 + i * 0.32); });
            return midis.length * 0.32 + 0.7;
        }
        midis.forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', t0 + i * 0.008); });
        return 1.3;
    }

    function playChordById(chordId) {
        var chord = findChord(chordId);
        if (!chord || !sampler.loaded) return;
        Tone.start().then(function () {
            playMidis(getChordMidis(state.currentRootMidi, chord, state.currentInversion), Tone.now());
        });
    }

    function playCurrentChord() {
        if (!sampler.loaded || !state.currentChord) return;
        Tone.start().then(function () {
            playMidis(getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion), Tone.now());
        });
    }

    // Suona prima l'accordo corretto, poi quello scelto per errore
    function playComparison() {
        if (!sampler.loaded || !state.currentChord || !state.lastWrongId) return;
        var wrongChord = findChord(state.lastWrongId);
        if (!wrongChord) return;
        Tone.start().then(function () {
            var now = Tone.now();
            var d = playMidis(getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion), now);
            playMidis(getChordMidis(state.currentRootMidi, wrongChord, state.currentInversion), now, d + 0.25);
            setFeedback(T.comparing, '#ffae60');
        });
    }

    // Registra l'esito della domanda: punteggio, streak, statistiche
    function registerResult(firstTry) {
        state.total++;
        if (firstTry) state.score++;
        var s = statFor(state.currentChord.id);
        s.a++;
        if (firstTry) {
            s.c++;
            state.streak++;
            if (state.streak > stats.bestStreak) stats.bestStreak = state.streak;
        } else {
            state.streak = 0;
        }
        saveStats();
        updateScore();
        updateStreakDisplay();
    }

    function answer(chordId) {
        if (state.answered || !sampler.loaded) return;
        var correct = state.currentChord.id === chordId;
        var btn = document.querySelector('.btn-accord[data-id="' + chordId + '"]');
        if (correct) {
            state.answered = true;
            var firstTry = state.triedIds.length === 0 && !state.wrongKeyClick;
            registerResult(firstTry);
            setFeedback(T.correct, '#2ecc71');
            if (btn) btn.classList.add('correct');
            updateKeyboard();
            updateStaff();
            showResult();
            if (state.autoAdvance) {
                setTimeout(function () { newQuestion(true); }, 1400);
            }
        } else {
            state.triedIds.push(chordId);
            state.lastWrongId = chordId;
            if (!state.confRecorded) {
                var s = statFor(state.currentChord.id);
                s.conf[chordId] = (s.conf[chordId] || 0) + 1;
                state.confRecorded = true;
                saveStats();
            }
            if (btn) btn.classList.add('wrong');
            setFeedback(T.wrong, '#e74c3c');
            showCompare();
        }
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    function setFeedback(text, color) {
        var el = document.getElementById('feedback');
        if (!el) return;
        el.textContent = text;
        el.style.color = color || 'transparent';
    }

    function updateScore() {
        var el = document.getElementById('score');
        if (el) el.textContent = state.score + ' / ' + state.total;
    }

    function updateStreakDisplay() {
        var el = document.getElementById('streak');
        if (el) el.textContent = '🔥 ' + state.streak + ' · ' + stats.bestStreak;
    }

    function resetButtonStyles() {
        var btns = document.querySelectorAll('.btn-accord');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('correct', 'wrong');
    }

    function chordLabel(id) {
        var btn = document.querySelector('.btn-accord[data-id="' + id + '"]');
        return btn ? btn.textContent : id;
    }

    function setLabelChoose() {
        var el = document.getElementById('label-scegli');
        if (!el) return;
        el.textContent = T.choose;
        el.classList.remove('result');
    }

    // Mostra "Maggiore = C · E · G" dopo la risposta corretta
    function showResult() {
        var el = document.getElementById('label-scegli');
        if (!el || !state.currentChord) return;
        var midis = getRootPositionMidis(state.currentRootMidi, state.currentChord);
        var names = midis.map(function (m) {
            return noteInfoForChord(state.currentChord, state.currentRootMidi, m).name;
        });
        var txt = chordLabel(state.currentChord.id) + '  =  ' + names.join(' · ');
        if (state.currentInversion > 0) txt += '   (' + state.currentInversion + 'ª ' + T.inv + ')';
        el.textContent = txt;
        el.classList.add('result');
    }

    function showCompare() {
        var el = document.getElementById('btn-compare');
        if (el) el.classList.remove('hidden');
    }
    function hideCompare() {
        var el = document.getElementById('btn-compare');
        if (el) el.classList.add('hidden');
    }

    function updateChordButtons() {
        var active    = getActiveChords();
        var activeIds = active.map(function (c) { return c.id; });
        var btns = document.querySelectorAll('.btn-accord');
        for (var i = 0; i < btns.length; i++) {
            var id      = btns[i].getAttribute('data-id');
            var inLevel = activeIds.indexOf(id) !== -1;
            btns[i].disabled = !sampler.loaded || !inLevel;
            btns[i].classList.toggle('inactive', !inLevel);
            btns[i].classList.remove('selectable', 'selected');
        }
    }

    function updateRootNoteDisplay() {
        var el = document.getElementById('root-note-display');
        if (el) el.textContent = midiToDisplay(state.rootMidi);
        var btnRandom = document.getElementById('btn-root-random');
        if (btnRandom) btnRandom.classList.toggle('active', !state.rootFixed);
        var ns = document.getElementById('note-selector');
        if (ns) ns.classList.toggle('fixed', state.rootFixed);
    }

    // ── Custom level (selezione accordi) ──────────────────────────────────────

    function enterCustomSelect() {
        state.selectingCustom = true;
        state.currentChord = null;
        setFeedback('', 'transparent');
        hideCompare();
        document.querySelectorAll('.piano-key').forEach(function (k) { k.classList.remove('root', 'correct', 'wrong'); });
        var ng = document.getElementById('staff-notes');
        if (ng) { while (ng.firstChild) ng.removeChild(ng.firstChild); }
        var el = document.getElementById('label-scegli');
        if (el) { el.textContent = T.customHint; el.classList.add('result'); }
        var btns = document.querySelectorAll('.btn-accord');
        for (var i = 0; i < btns.length; i++) {
            btns[i].disabled = false;
            btns[i].classList.remove('inactive', 'correct', 'wrong');
            btns[i].classList.add('selectable');
            btns[i].classList.toggle('selected', state.customIds.indexOf(btns[i].getAttribute('data-id')) !== -1);
        }
    }

    function exitCustomSelect(start) {
        state.selectingCustom = false;
        updateChordButtons();
        setLabelChoose();
        state.currentChord = null;
        if (start && sampler.loaded) newQuestion(true);
    }

    function tryStartCustom() {
        if (state.customIds.length >= 2) {
            exitCustomSelect(true);
        } else {
            setFeedback(T.customTooFew, '#e74c3c');
        }
    }

    function toggleCustomChord(id) {
        var idx = state.customIds.indexOf(id);
        if (idx === -1) state.customIds.push(id);
        else state.customIds.splice(idx, 1);
        var btn = document.querySelector('.btn-accord[data-id="' + id + '"]');
        if (btn) btn.classList.toggle('selected', idx === -1);
        if (state.customIds.length >= 2) setFeedback('', 'transparent');
        saveSettings();
    }

    // ── Statistiche (modale) ──────────────────────────────────────────────────

    function statsModalOpen() {
        return !document.getElementById('stats-modal').classList.contains('hidden');
    }

    function renderStats() {
        var sumEl = document.getElementById('stats-summary');
        var table = document.getElementById('stats-table');
        if (!sumEl || !table) return;

        var totA = 0, totC = 0;
        CHORDS.forEach(function (c) {
            var s = stats.perChord[c.id];
            if (s) { totA += s.a; totC += s.c; }
        });
        var pct = totA ? Math.round(100 * totC / totA) : 0;
        sumEl.textContent = T.stTotal + ': ' + totC + ' / ' + totA + ' (' + pct + '%)   —   ' + T.stBest + ': ' + stats.bestStreak;

        var html = '<thead><tr><th>' + T.stChord + '</th><th>' + T.stTries + '</th><th>' + T.stOk +
                   '</th><th>%</th><th>' + T.stConf + '</th></tr></thead><tbody>';
        var any = false;
        CHORDS.forEach(function (c) {
            var s = stats.perChord[c.id];
            if (!s || !s.a) return;
            any = true;
            var p = Math.round(100 * s.c / s.a);
            var confTxt = '—';
            var bestId = null, bestN = 0;
            for (var k in s.conf) {
                if (s.conf[k] > bestN) { bestN = s.conf[k]; bestId = k; }
            }
            if (bestId) confTxt = chordLabel(bestId) + ' (' + bestN + '×)';
            var cls = p >= 80 ? 'pct-good' : (p >= 50 ? 'pct-mid' : 'pct-bad');
            html += '<tr><td>' + chordLabel(c.id) + '</td><td>' + s.a + '</td><td>' + s.c +
                    '</td><td class="' + cls + '">' + p + '%</td><td>' + confTxt + '</td></tr>';
        });
        html += '</tbody>';
        if (!any) html = '<tbody><tr><td class="stats-empty">' + T.stEmpty + '</td></tr></tbody>';
        table.innerHTML = html;
    }

    function openStats() {
        renderStats();
        document.getElementById('stats-modal').classList.remove('hidden');
    }
    function closeStats() {
        document.getElementById('stats-modal').classList.add('hidden');
    }

    // ── Staff ─────────────────────────────────────────────────────────────────

    var SVG_NS     = 'http://www.w3.org/2000/svg';
    var STAFF_STEP = 6;
    var STAFF_Y_MC = 73;
    var STAFF_X1   = 52;
    var STAFF_X2   = 212;
    var NOTE_X     = 148;

    var TREBLE_LINES = [12, 14, 16, 18, 20];
    var BASS_LINES   = [0,  2,  4,  6,  8];
    var DIATONIC       = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // conv. diesis:  C C# D D# E F F# G G# A A# B
    var DIATONIC_FLAT  = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]; // conv. bemolle: C Db D Eb E F Gb G Ab A Bb B
    var ACCID          = ['', '♯', '', '♯', '', '', '♯', '', '♯', '', '♯', ''];
    var ACCID_FLAT     = ['', '♭', '', '♭', '', '', '♭', '', '♭', '', '♭', ''];
    var LETTER_SEMITONES   = [0, 2, 4, 5, 7, 9, 11];
    var PC_TO_LETTER_SHARP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C# D# F# G# A# → C D F G A (con ♯)
    var PC_TO_LETTER_FLAT  = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]; // Db Eb Gb Ab Bb → D E G A B (con ♭)
    // Lato bemolle del circolo delle quinte: Db Eb F Gb Ab Bb
    var USE_FLATS = [false, true, false, true, false, true, true, false, true, false, true, false];

    // Accordi con terza minore → relativa maggiore determina la tonalità
    function getKeyCenterPc(chord, rootPc) {
        return chord.intervals[0] === 3 ? (rootPc + 3) % 12 : rootPc;
    }

    function chordNoteSpelling(rootMidi, noteMidi, semitones, diatonicSteps, useFlats) {
        var rootPc          = rootMidi % 12;
        var rootLetterIdx   = (useFlats ? PC_TO_LETTER_FLAT : PC_TO_LETTER_SHARP)[rootPc];
        var targetLetterIdx = (rootLetterIdx + diatonicSteps) % 7;
        var targetNaturalPc = LETTER_SEMITONES[targetLetterIdx];
        var actualPc        = (rootPc + semitones) % 12;
        var diff = actualPc - targetNaturalPc;
        if (diff > 2)  diff -= 12;
        if (diff < -2) diff += 12;
        var noteOctave = Math.floor(noteMidi / 12) - 1;
        var staffPos   = (noteOctave - 4) * 7 + targetLetterIdx + 10;
        var acc = '';
        if (diff ===  1) acc = '♯';
        if (diff === -1) acc = '♭';
        if (diff ===  2) acc = '𝄪';
        if (diff === -2) acc = '𝄫';
        return { staffPos: staffPos, accidental: acc, name: LETTERS[targetLetterIdx] + acc };
    }

    function noteInfoForChord(chord, rootMidi, noteMidi) {
        var rootPc      = rootMidi % 12;
        var notePc      = noteMidi % 12;
        var semitones   = (notePc - rootPc + 12) % 12;
        var keyCenterPc = getKeyCenterPc(chord, rootPc);
        var useFlats    = USE_FLATS[keyCenterPc];
        var diatArr     = useFlats ? DIATONIC_FLAT : DIATONIC;
        var accArr      = useFlats ? ACCID_FLAT    : ACCID;
        var dispArr     = useFlats ? NOTE_DISPLAY_FLAT : NOTE_DISPLAY;
        if (semitones === 0) {
            var oct = Math.floor(noteMidi / 12) - 1;
            return { staffPos: (oct - 4) * 7 + diatArr[notePc] + 10, accidental: accArr[notePc], name: dispArr[notePc] };
        }
        var idx = chord.intervals.indexOf(semitones);
        if (idx === -1) {
            var oct2 = Math.floor(noteMidi / 12) - 1;
            return { staffPos: (oct2 - 4) * 7 + diatArr[notePc] + 10, accidental: accArr[notePc], name: dispArr[notePc] };
        }
        return chordNoteSpelling(rootMidi, noteMidi, semitones, chord.steps[idx], useFlats);
    }

    function staffY(pos) { return STAFF_Y_MC - (pos - 10) * STAFF_STEP; }

    function midiToStaffPos(midi) {
        var octave = Math.floor(midi / 12) - 1;
        return (octave - 4) * 7 + DIATONIC[midi % 12] + 10;
    }

    function svgEl(tag, attrs) {
        var el = document.createElementNS(SVG_NS, tag);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    function buildStaff() {
        var svg = document.getElementById('staff-svg');
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var sc = 'rgba(255,255,255,0.6)';
        BASS_LINES.forEach(function (p) {
            svg.appendChild(svgEl('line', { x1: STAFF_X1, y1: staffY(p), x2: STAFF_X2, y2: staffY(p), stroke: sc, 'stroke-width': '1' }));
        });
        TREBLE_LINES.forEach(function (p) {
            svg.appendChild(svgEl('line', { x1: STAFF_X1, y1: staffY(p), x2: STAFF_X2, y2: staffY(p), stroke: sc, 'stroke-width': '1' }));
        });
        svg.appendChild(svgEl('line', { x1: STAFF_X1, y1: staffY(0), x2: STAFF_X1, y2: staffY(20), stroke: sc, 'stroke-width': '2' }));
        svg.appendChild(svgEl('image', { href: '../assets/treble-clef.svg', x: '50', y: '10',  width: '28', height: '65', opacity: '0.7' }));
        svg.appendChild(svgEl('image', { href: '../assets/bass-clef.svg',   x: '52', y: '85',  width: '30', height: '37', opacity: '0.7' }));
        svg.appendChild(svgEl('g', { id: 'staff-notes' }));
    }

    function updateStaff() {
        var ng = document.getElementById('staff-notes');
        if (!ng) return;
        while (ng.firstChild) ng.removeChild(ng.firstChild);
        if (!state.currentRootMidi || !state.currentChord) return;

        if (state.answered) {
            var midis = getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion);
            if (midis.indexOf(state.currentRootMidi) === -1) midis.unshift(state.currentRootMidi);
            midis.sort(function (a, b) { return a - b; });
            var spellings = midis.map(function (midi) {
                return noteInfoForChord(state.currentChord, state.currentRootMidi, midi);
            });
            var offsets = computeXOffsets(spellings.map(function (s) { return s.staffPos; }));
            midis.forEach(function (midi, i) {
                var color = (midi === state.currentRootMidi) ? '#ffd700' : '#2ecc71';
                drawStaffNote(ng, midi, color, NOTE_X + offsets[i], spellings[i]);
            });
        } else {
            var rootSpelling = noteInfoForChord(state.currentChord, state.currentRootMidi, state.currentRootMidi);
            drawStaffNote(ng, state.currentRootMidi, '#ffd700', NOTE_X, rootSpelling);
        }
    }

    // Offset orizzontale per note adiacenti (a distanza diatonica 1)
    function computeXOffsets(positions) {
        var offsets = positions.map(function () { return 0; });
        for (var i = 1; i < positions.length; i++) {
            if (Math.abs(positions[i] - positions[i - 1]) <= 1) {
                offsets[i] = offsets[i - 1] === 0 ? 13 : 0;
            }
        }
        return offsets;
    }

    function drawStaffNote(container, midi, color, xPos, spelling) {
        var pos = spelling ? spelling.staffPos : midiToStaffPos(midi);
        var y   = staffY(pos);
        var acc = spelling ? spelling.accidental : ACCID[midi % 12];
        var sc  = 'rgba(255,255,255,0.6)';

        function ledger(p) {
            container.appendChild(svgEl('line', {
                x1: xPos - 11, y1: staffY(p), x2: xPos + 11, y2: staffY(p),
                stroke: sc, 'stroke-width': '1.2'
            }));
        }
        if (pos === 10) ledger(10);
        for (var p = 22; p <= pos; p += 2) ledger(p);
        for (var q = -2; q >= pos; q -= 2) ledger(q);

        if (acc) {
            var isFlat = (acc === '♭' || acc === '𝄫');
            var at = svgEl('text', { x: xPos - 15, y: y + (isFlat ? 7 : 4), 'font-size': isFlat ? '17' : '13', fill: color, 'font-family': 'serif' });
            at.textContent = acc;
            container.appendChild(at);
        }
        container.appendChild(svgEl('ellipse', {
            cx: xPos, cy: y, rx: '6.5', ry: '4.5', fill: color,
            transform: 'rotate(-15,' + xPos + ',' + y + ')'
        }));
    }

    function onKeyClick(midi) {
        if (!sampler.loaded) return;
        Tone.start().then(function () {
            sampler.triggerAttackRelease(midiToNote(midi), '4n', Tone.now() + 0.02);
        });
        if (state.answered || state.selectingCustom) return;

        var chordMidis = getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion);
        var key = document.querySelector('.piano-key[data-midi="' + midi + '"]');

        if (chordMidis.indexOf(midi) !== -1) {
            if (state.foundMidis.indexOf(midi) === -1) state.foundMidis.push(midi);
            if (key) { key.classList.remove('wrong'); key.classList.add('correct'); }
            if (state.foundMidis.length === chordMidis.length) chordFoundByKeyboard();
        } else if (midi !== state.currentRootMidi) {
            state.wrongKeyClick = true;
            if (key) key.classList.add('wrong');
        }
    }

    function chordFoundByKeyboard() {
        state.answered = true;
        var firstTry = !state.wrongKeyClick && state.triedIds.length === 0;
        registerResult(firstTry);
        setFeedback(T.correct, '#2ecc71');
        var btn = document.querySelector('.btn-accord[data-id="' + state.currentChord.id + '"]');
        if (btn) btn.classList.add('correct');
        updateKeyboard();
        updateStaff();
        showResult();
        if (state.autoAdvance) setTimeout(function () { newQuestion(true); }, 1400);
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────

    var KEY_MIDI_START = 48;
    var KEY_MIDI_END   = 83;
    var WHITE_CLASSES  = [0, 2, 4, 5, 7, 9, 11];
    var BLACK_OFFSETS  = { 1: 29, 3: 71, 6: 155, 8: 197, 10: 239 };
    var WHITE_KEY_W    = 42;

    function buildKeyboard() {
        var container = document.getElementById('piano-keyboard');
        if (!container) return;
        container.innerHTML = '';
        var wrapper = document.createElement('div');
        wrapper.className = 'piano-wrapper';
        container.appendChild(wrapper);
        var whiteIdx = 0;
        for (var midi = KEY_MIDI_START; midi <= KEY_MIDI_END; midi++) {
            var nc        = midi % 12;
            var isWhite   = WHITE_CLASSES.indexOf(nc) !== -1;
            var relOctave = Math.floor((midi - KEY_MIDI_START) / 12);
            var key = document.createElement('div');
            key.className = 'piano-key ' + (isWhite ? 'white' : 'black');
            key.setAttribute('data-midi', midi);
            if (isWhite) {
                key.style.left = (whiteIdx * WHITE_KEY_W) + 'px';
                if (nc === 0) {
                    var lbl = document.createElement('span');
                    lbl.className = 'key-label';
                    lbl.textContent = 'C' + (Math.floor(midi / 12) - 1);
                    key.appendChild(lbl);
                }
                whiteIdx++;
            } else {
                key.style.left = (relOctave * 7 * WHITE_KEY_W + BLACK_OFFSETS[nc]) + 'px';
            }
            key.addEventListener('click', function () {
                onKeyClick(parseInt(this.getAttribute('data-midi')));
            });
            wrapper.appendChild(key);
        }
    }

    function updateKeyboard() {
        var keys = document.querySelectorAll('.piano-key');
        if (!keys.length || !state.currentChord) return;

        var correctMidis = getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion);

        for (var i = 0; i < keys.length; i++) {
            var key  = keys[i];
            var midi = parseInt(key.getAttribute('data-midi'));
            key.classList.remove('root', 'correct');

            if (midi === state.currentRootMidi) {
                key.classList.add('root');
            } else if (state.answered && correctMidis.indexOf(midi) !== -1) {
                key.classList.add('correct');
            }
        }
    }

    // ── MIDI Input Support ────────────────────────────────────────────────────
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(function(midiAccess) {
            midiAccess.inputs.forEach(function (input) {
                input.onmidimessage = function(event) {
                    var cmd = event.data[0] & 0xf0;
                    var noteNum = event.data[1];
                    var velocity = event.data[2];

                    if (cmd === 0x90 && velocity > 0 && noteNum >= 48 && noteNum <= 72) {
                        onKeyClick(noteNum);
                    }
                };
            });
        });
    }

    // ── Applicazione impostazioni caricate al DOM ─────────────────────────────

    (function applySettingsToDom() {
        document.querySelectorAll('.btn-mode').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-mode') === state.mode);
        });
        document.querySelectorAll('.btn-diff').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-diff') === String(state.difficulty));
        });
        var bi = document.getElementById('btn-inversions');
        if (bi) {
            bi.classList.toggle('active', state.inversions);
            bi.textContent = state.inversions ? T.invOn : T.invOff;
        }
        var ba = document.getElementById('btn-auto-advance');
        if (ba) {
            ba.classList.toggle('active', state.autoAdvance);
            ba.textContent = state.autoAdvance ? T.auto : T.manual;
        }
        updateRootNoteDisplay();
        updateStreakDisplay();
    })();

    // ── Event listeners ───────────────────────────────────────────────────────

    document.getElementById('btn-play').addEventListener('click', function () {
        if (!sampler.loaded) return;
        if (state.selectingCustom) { tryStartCustom(); return; }
        if (state.answered || !state.currentChord) newQuestion(true);
        else playCurrentChord();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        state.score = 0; state.total = 0; state.streak = 0;
        updateScore();
        updateStreakDisplay();
        if (sampler.loaded && !state.selectingCustom) newQuestion(true);
    });

    document.querySelectorAll('.btn-mode').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.mode = this.getAttribute('data-mode');
            document.querySelectorAll('.btn-mode').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            saveSettings();
            if (sampler.loaded && state.currentChord) playCurrentChord();
        });
    });

    document.querySelectorAll('.btn-diff').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var diff = this.getAttribute('data-diff');
            document.querySelectorAll('.btn-diff').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            state.score = 0; state.total = 0; state.streak = 0;
            updateScore();
            updateStreakDisplay();

            if (diff === 'custom') {
                if (state.difficulty === 'custom' && state.selectingCustom) {
                    tryStartCustom();
                } else {
                    state.difficulty = 'custom';
                    enterCustomSelect();
                }
                saveSettings();
                return;
            }

            if (state.selectingCustom) exitCustomSelect(false);
            state.difficulty = parseInt(diff, 10);
            saveSettings();
            updateChordButtons();
            if (sampler.loaded) newQuestion(true);
        });
    });

    var btnInv = document.getElementById('btn-inversions');
    if (btnInv) {
        btnInv.addEventListener('click', function () {
            state.inversions = !state.inversions;
            this.classList.toggle('active', state.inversions);
            this.textContent = state.inversions ? T.invOn : T.invOff;
            saveSettings();
            if (sampler.loaded && !state.selectingCustom) newQuestion(true);
        });
    }

    document.getElementById('root-note-display').addEventListener('click', function () {
        state.rootFixed = true;
        updateRootNoteDisplay();
        saveSettings();
        if (sampler.loaded && !state.selectingCustom) newQuestion(true);
    });

    document.getElementById('btn-root-random').addEventListener('click', function () {
        state.rootFixed = false;
        updateRootNoteDisplay();
        saveSettings();
        if (sampler.loaded && !state.selectingCustom) newQuestion(true);
    });

    document.getElementById('btn-root-prev').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi <= ROOT_MIN ? ROOT_MAX : state.rootMidi - 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        saveSettings();
        if (sampler.loaded && !state.selectingCustom) newQuestion(true);
    });

    document.getElementById('btn-root-next').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi >= ROOT_MAX ? ROOT_MIN : state.rootMidi + 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        saveSettings();
        if (sampler.loaded && !state.selectingCustom) newQuestion(true);
    });

    document.querySelectorAll('.btn-accord').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            if (state.selectingCustom) { toggleCustomChord(id); return; }
            if (this.classList.contains('inactive')) return;
            if (state.answered || this.classList.contains('wrong')) {
                if (state.currentChord && id === state.currentChord.id) playCurrentChord();
                else playChordById(id);
            } else {
                playChordById(id);
                answer(id);
            }
        });
    });

    var btnAuto = document.getElementById('btn-auto-advance');
    if (btnAuto) {
        btnAuto.addEventListener('click', function () {
            state.autoAdvance = !state.autoAdvance;
            this.classList.toggle('active', state.autoAdvance);
            this.textContent = state.autoAdvance ? T.auto : T.manual;
            saveSettings();
        });
    }

    var btnCompare = document.getElementById('btn-compare');
    if (btnCompare) btnCompare.addEventListener('click', playComparison);

    var btnStats = document.getElementById('btn-stats');
    if (btnStats) btnStats.addEventListener('click', openStats);

    var btnStatsClose = document.getElementById('btn-stats-close');
    if (btnStatsClose) btnStatsClose.addEventListener('click', closeStats);

    var modal = document.getElementById('stats-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeStats();
        });
    }

    var btnStatsReset = document.getElementById('btn-stats-reset');
    if (btnStatsReset) {
        btnStatsReset.addEventListener('click', function () {
            if (!window.confirm(T.stConfirm)) return;
            stats = { perChord: {}, bestStreak: 0 };
            saveStats();
            updateStreakDisplay();
            renderStats();
        });
    }

    // ── Scorciatoie tastiera computer ─────────────────────────────────────────
    // Spazio = ascolta / prossimo · 1-9 = risposta · C = confronta · Esc = chiudi stats

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeStats(); return; }
        if (statsModalOpen()) return;

        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
            document.getElementById('btn-play').click();
            return;
        }
        if (e.key === 'c' || e.key === 'C') {
            if (!btnCompare.classList.contains('hidden')) playComparison();
            return;
        }
        if (e.key >= '1' && e.key <= '9') {
            if (state.selectingCustom) return;
            var enabled = [];
            document.querySelectorAll('.btn-accord').forEach(function (b) {
                if (!b.classList.contains('inactive')) enabled.push(b);
            });
            var idx = parseInt(e.key, 10) - 1;
            if (idx < enabled.length) enabled[idx].click();
        }
    });

    var volCtrl = document.getElementById('volume-control');
    if (volCtrl) {
        var savedVol = localStorage.getItem('lm_volume');
        if (savedVol !== null) volCtrl.value = savedVol;
        sampler.volume.value = parseFloat(volCtrl.value);
        volCtrl.addEventListener('input', function () {
            sampler.volume.value = parseFloat(this.value);
            localStorage.setItem('lm_volume', this.value);
        });
    }

})();
