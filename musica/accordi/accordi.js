// accordi.js v1.0

(function () {
    'use strict';

    if (typeof Tone === 'undefined') {
        document.getElementById('feedback').textContent = 'Errore: Tone.js non trovato in musica/lib/tone.js';
        document.getElementById('feedback').style.color = '#e74c3c';
        return;
    }

    var EN = window.currentLang === 'en';
    var T = {
        ready:   EN ? 'Ready — press ▶ to listen' : 'Pronto — premi ▶ per ascoltare',
        correct: EN ? 'Correct! ✓'                 : 'Corretto! ✓',
        wrong:   EN ? 'Wrong — try again!'          : 'Sbagliato — riprova!',
        error:   EN ? 'Audio samples load error'    : 'Errore caricamento campioni audio',
        invOff:  EN ? '♭ Off'                       : '♭ Disattive',
        invOn:   EN ? '♭ On'                        : '♭ Attive',
        manual:  EN ? '⏸ Manual'                    : '⏸ Manuale',
        auto:    EN ? '▶▶ Auto'                     : '▶▶ Auto'
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

    var NOTE_DISPLAY = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
    var NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

    var ROOT_MIN = 48;  // C3
    var ROOT_MAX = 60;  // C4

    function midiToNote(midi) {
        return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    }
    function midiToDisplay(midi) {
        return NOTE_DISPLAY[midi % 12] + (Math.floor(midi / 12) - 1);
    }

    var state = {
        mode:             'arpeggio-up',
        difficulty:       1,
        inversions:       false,
        autoAdvance:      false,
        rootFixed:        true,
        rootMidi:         60,
        currentRootMidi:  60,
        currentChord:     null,
        currentInversion: 0,
        triedIds:         [],
        foundMidis:       [],
        wrongKeyClick:    false,
        score:            0,
        total:            0,
        answered:         false
    };

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
        onerror: function () { setFeedback('Errore caricamento campioni audio', '#e74c3c'); }
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
        var ids = DIFFICULTY_IDS[state.difficulty];
        return ids ? CHORDS.filter(function (c) { return ids.indexOf(c.id) !== -1; })
                   : CHORDS.slice();
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Restituisce le midi note dell'accordo nell'inversione indicata
    function getChordMidis(rootMidi, chord, inversion) {
        var notes = [0].concat(chord.intervals).map(function (i) { return rootMidi + i; });
        for (var i = 0; i < inversion; i++) {
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
        var active = getActiveChords();
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
        resetButtonStyles();
        document.querySelectorAll('.piano-key').forEach(function (k) { k.classList.remove('wrong'); });
        setFeedback('', 'transparent');
        updateKeyboard();
        updateStaff();
        if (autoPlay !== false) playCurrentChord();
    }

    function playChordById(chordId) {
        var chord = null;
        for (var i = 0; i < CHORDS.length; i++) {
            if (CHORDS[i].id === chordId) { chord = CHORDS[i]; break; }
        }
        if (!chord || !sampler.loaded) return;
        Tone.start().then(function () {
            var notes = getChordMidis(state.currentRootMidi, chord, state.currentInversion);
            var now   = Tone.now();
            if (state.mode === 'arpeggio-up') {
                notes.forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.32); });
            } else if (state.mode === 'arpeggio-down') {
                notes.slice().reverse().forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.32); });
            } else {
                notes.forEach(function (midi, i) { sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.008); });
            }
        });
    }

    function playCurrentChord() {
        if (!sampler.loaded) return;
        Tone.start().then(function () {
            var notes = getChordMidis(state.currentRootMidi, state.currentChord, state.currentInversion);
            var now   = Tone.now();
            if (state.mode === 'arpeggio-up') {
                notes.forEach(function (midi, i) {
                    sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.32);
                });
            } else if (state.mode === 'arpeggio-down') {
                notes.slice().reverse().forEach(function (midi, i) {
                    sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.32);
                });
            } else {
                notes.forEach(function (midi, i) {
                    sampler.triggerAttackRelease(midiToNote(midi), '2n', now + i * 0.008);
                });
            }
        });
    }

    function answer(chordId) {
        if (state.answered || !sampler.loaded) return;
        var correct = state.currentChord.id === chordId;
        var btn = document.querySelector('.btn-accord[data-id="' + chordId + '"]');
        if (correct) {
            state.answered = true;
            state.total++;
            if (state.triedIds.length === 0) state.score++;
            setFeedback(T.correct, '#2ecc71');
            if (btn) btn.classList.add('correct');
            updateKeyboard();
            updateStaff();
            updateScore();
            if (state.autoAdvance) {
                setTimeout(function () { newQuestion(true); }, 1400);
            }
        } else {
            state.triedIds.push(chordId);
            if (btn) btn.classList.add('wrong');
            setFeedback(T.wrong, '#e74c3c');
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

    function resetButtonStyles() {
        var btns = document.querySelectorAll('.btn-accord');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('correct', 'wrong');
    }

    function updateChordButtons() {
        var active   = getActiveChords();
        var activeIds = active.map(function (c) { return c.id; });
        var btns = document.querySelectorAll('.btn-accord');
        for (var i = 0; i < btns.length; i++) {
            var id      = btns[i].getAttribute('data-id');
            var inLevel = activeIds.indexOf(id) !== -1;
            btns[i].disabled = !sampler.loaded || !inLevel;
            btns[i].classList.toggle('inactive', !inLevel);
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
        return { staffPos: staffPos, accidental: acc };
    }

    function noteInfoForChord(chord, rootMidi, noteMidi) {
        var rootPc      = rootMidi % 12;
        var notePc      = noteMidi % 12;
        var semitones   = (notePc - rootPc + 12) % 12;
        var keyCenterPc = getKeyCenterPc(chord, rootPc);
        var useFlats    = USE_FLATS[keyCenterPc];
        var diatArr     = useFlats ? DIATONIC_FLAT : DIATONIC;
        var accArr      = useFlats ? ACCID_FLAT    : ACCID;
        if (semitones === 0) {
            var oct = Math.floor(noteMidi / 12) - 1;
            return { staffPos: (oct - 4) * 7 + diatArr[notePc] + 10, accidental: accArr[notePc] };
        }
        var idx = chord.intervals.indexOf(semitones);
        if (idx === -1) {
            var oct2 = Math.floor(noteMidi / 12) - 1;
            return { staffPos: (oct2 - 4) * 7 + diatArr[notePc] + 10, accidental: accArr[notePc] };
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
        for (var p = -2; p >= pos; p -= 2) ledger(p);

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
        if (state.answered) return;

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
        state.total++;
        if (!state.wrongKeyClick) state.score++;
        setFeedback('Corretto! ✓', '#2ecc71');
        var btn = document.querySelector('.btn-accord[data-id="' + state.currentChord.id + '"]');
        if (btn) btn.classList.add('correct');
        updateKeyboard();
        updateStaff();
        updateScore();
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
            for (var input of midiAccess.inputs.values()) {
                input.onmidimessage = function(event) {
                    var cmd = event.data[0] & 0xf0;
                    var noteNum = event.data[1];
                    var velocity = event.data[2];

                    if (cmd === 0x90 && velocity > 0 && noteNum >= 48 && noteNum <= 72) {
                        onKeyClick(noteNum);
                    }
                };
            }
        });
    }

    // ── Event listeners ───────────────────────────────────────────────────────

    document.getElementById('btn-play').addEventListener('click', function () {
        if (!sampler.loaded) return;
        if (state.answered || !state.currentChord) newQuestion(true);
        else playCurrentChord();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        state.score = 0; state.total = 0;
        updateScore();
        if (sampler.loaded) newQuestion(true);
    });

    document.querySelectorAll('.btn-mode').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.mode = this.getAttribute('data-mode');
            document.querySelectorAll('.btn-mode').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.btn-diff').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.difficulty = parseInt(this.getAttribute('data-diff'), 10);
            state.score = 0; state.total = 0;
            updateScore();
            document.querySelectorAll('.btn-diff').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
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
            if (sampler.loaded) newQuestion(true);
        });
    }

    document.getElementById('root-note-display').addEventListener('click', function () {
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded) newQuestion(true);
    });

    document.getElementById('btn-root-random').addEventListener('click', function () {
        state.rootFixed = false;
        updateRootNoteDisplay();
        if (sampler.loaded) newQuestion(true);
    });

    document.getElementById('btn-root-prev').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi <= ROOT_MIN ? ROOT_MAX : state.rootMidi - 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded) newQuestion(true);
    });

    document.getElementById('btn-root-next').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi >= ROOT_MAX ? ROOT_MIN : state.rootMidi + 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded) newQuestion(true);
    });

    document.querySelectorAll('.btn-accord').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (this.classList.contains('inactive')) return;
            var id = this.getAttribute('data-id');
            if (state.answered || this.classList.contains('wrong')) {
                if (state.currentChord && id === state.currentChord.id) playCurrentChord();
                else playChordById(id);
            } else {
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
        });
    }

})();
