// scale.js v1.2

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
        completedErrors: EN ? 'Completed (with errors)' : 'Completato (con errori)',
        error:   EN ? 'Audio samples load error'    : 'Errore caricamento campioni audio'
    };

    var SCALES = [
        // Liv 1 — Base
        { id: 'maj',    name: 'Maggiore',       intervals: [2, 2, 1, 2, 2, 2, 1] },
        { id: 'min',    name: 'Minore Nat.',    intervals: [2, 1, 2, 2, 1, 2, 2] },
        // Liv 2 — Facile
        { id: 'minarm', name: 'Minore Arm.',    intervals: [2, 1, 2, 2, 1, 3, 1] },
        { id: 'minmel', name: 'Minore Mel.',    intervals: [2, 1, 2, 2, 2, 2, 1] },
        // Liv 3 — Medio (Modi)
        { id: 'dor',    name: 'Dorico',         intervals: [2, 1, 2, 2, 2, 1, 2] },
        { id: 'fri',    name: 'Frigio',         intervals: [1, 2, 2, 2, 1, 2, 2] },
        { id: 'lid',    name: 'Lidio',          intervals: [2, 2, 2, 1, 2, 2, 1] },
        { id: 'mis',    name: 'Misolidio',      intervals: [2, 2, 1, 2, 2, 1, 2] },
        { id: 'eol',    name: 'Eolio',          intervals: [2, 1, 2, 2, 1, 2, 2] },
        { id: 'loc',    name: 'Locrio',         intervals: [1, 2, 2, 1, 2, 2, 2] },
        // Liv 4 — Esperto
        { id: 'pent',   name: 'Pentatonica',    intervals: [2, 2, 3, 2, 3] },
        { id: 'blues',  name: 'Blues',          intervals: [3, 2, 1, 1, 3, 2] },
        { id: 'dim',    name: 'Diminuita',      intervals: [2, 1, 2, 1, 2, 1, 2, 1] },
        // Liv 5 — Avanzate
        { id: 'aug',    name: 'Aumentata',      intervals: [3, 1, 3, 1, 3, 1] },
        { id: 'alts',   name: 'Alterata',       intervals: [1, 2, 1, 2, 2, 2, 2] }
    ];

    var DIFFICULTY_IDS = {
        1: ['maj', 'min'],
        2: ['maj', 'min', 'minarm', 'minmel'],
        3: ['maj', 'min', 'minarm', 'minmel', 'dor', 'fri', 'lid', 'mis', 'eol', 'loc'],
        4: ['maj', 'min', 'minarm', 'minmel', 'dor', 'fri', 'lid', 'mis', 'eol', 'loc', 'pent', 'blues', 'dim'],
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
        difficulty:     1,
        direction:      'up',
        rootFixed:      true,
        rootMidi:       60,
        currentRootMidi: 60,
        currentScale:   null,
        lastScaleId:    null,
        score:          0,
        total:          0,
        answered:       false,
        triedIds:       [],
        userNotes:      [],
        wrongNotes:     [],
        hasErrors:      false
    };

    var sampler = new Tone.Sampler({
        urls: {
            'C1': 'C1.mp3', 'C#1': 'Db1.mp3', 'D1': 'D1.mp3', 'D#1': 'Eb1.mp3', 'E1': 'E1.mp3', 'F1': 'F1.mp3',
            'F#1': 'Gb1.mp3', 'G1': 'G1.mp3', 'G#1': 'Ab1.mp3', 'A1': 'A1.mp3', 'A#1': 'Bb1.mp3', 'B1': 'B1.mp3',
            'C2': 'C2.mp3', 'C#2': 'Db2.mp3', 'D2': 'D2.mp3', 'D#2': 'Eb2.mp3', 'E2': 'E2.mp3', 'F2': 'F2.mp3',
            'F#2': 'Gb2.mp3', 'G2': 'G2.mp3', 'G#2': 'Ab2.mp3', 'A2': 'A2.mp3', 'A#2': 'Bb2.mp3', 'B2': 'B2.mp3',
            'C3': 'C3.mp3', 'C#3': 'Db3.mp3', 'D3': 'D3.mp3', 'D#3': 'Eb3.mp3', 'E3': 'E3.mp3', 'F3': 'F3.mp3',
            'F#3': 'Gb3.mp3', 'G3': 'G3.mp3', 'G#3': 'Ab3.mp3', 'A3': 'A3.mp3', 'A#3': 'Bb3.mp3', 'B3': 'B3.mp3',
            'C4': 'C4.mp3', 'C#4': 'Db4.mp3', 'D4': 'D4.mp3', 'D#4': 'Eb4.mp3', 'E4': 'E4.mp3', 'F4': 'F4.mp3',
            'F#4': 'Gb4.mp3', 'G4': 'G4.mp3', 'G#4': 'Ab4.mp3', 'A4': 'A4.mp3', 'A#4': 'Bb4.mp3', 'B4': 'B4.mp3',
            'C5': 'C5.mp3', 'C#5': 'Db5.mp3', 'D5': 'D5.mp3', 'D#5': 'Eb5.mp3', 'E5': 'E5.mp3', 'F5': 'F5.mp3',
            'F#5': 'Gb5.mp3', 'G5': 'G5.mp3', 'G#5': 'Ab5.mp3', 'A5': 'A5.mp3', 'A#5': 'Bb5.mp3', 'B5': 'B5.mp3'
        },
        baseUrl: '../sounds/piano/',
        onload: onSamplerReady,
        onerror: function () { setFeedback(T.error, '#e74c3c'); }
    }).toDestination();

    function onSamplerReady() {
        buildKeyboard();
        buildStaff();
        document.getElementById('btn-play').disabled = false;
        setFeedback(T.ready, 'rgba(255,255,255,0.35)');
        updateScaleButtons();
        updateRootNoteDisplay();
        newQuestion(false);
    }

    function setFeedback(text, color) {
        var fb = document.getElementById('feedback');
        fb.textContent = text;
        fb.style.color = color || 'white';
    }

    function getScale(scaleId) {
        for (var i = 0; i < SCALES.length; i++) {
            if (SCALES[i].id === scaleId) return SCALES[i];
        }
        return null;
    }

    function getScaleMidis(rootMidi, scale, direction) {
        var midisUp = [rootMidi];
        var current = rootMidi;
        for (var i = 0; i < scale.intervals.length; i++) {
            current += scale.intervals[i];
            midisUp.push(current);
        }

        var descScale = scale;
        if (scale.id === 'minmel') {
            descScale = getScale('min');
        }

        var midisDown = [midisUp[midisUp.length - 1]];
        var currentDesc = midisUp[midisUp.length - 1];
        for (var i = descScale.intervals.length - 1; i >= 0; i--) {
            currentDesc -= descScale.intervals[i];
            midisDown.push(currentDesc);
        }

        if (direction === 'up') {
            return midisUp;
        } else if (direction === 'down') {
            return midisDown;
        } else if (direction === 'both') {
            return midisUp.concat(midisDown.slice(1));
        }
        return midisUp;
    }

    function playScale(scaleId) {
        if (!sampler.loaded) return;
        sampler.triggerRelease();
        var scale = getScale(scaleId);
        if (!scale) return;
        Tone.start().then(function () {
            var midis = getScaleMidis(state.currentRootMidi, scale, state.direction);
            var now = Tone.now();
            midis.forEach(function (midi, i) {
                sampler.triggerAttackRelease(midiToNote(midi), '8n', now + i * 0.2);
            });
        });
    }

    // ── Staff ─────────────────────────────────────────────────────────────────

    var SVG_NS     = 'http://www.w3.org/2000/svg';
    var STAFF_STEP = 6;
    var STAFF_Y_MC = 73;
    var STAFF_X1   = 52;
    var STAFF_X2   = 212;
    var NOTE_X     = 95;
    var TREBLE_LINES = [12, 14, 16, 18, 20];
    var BASS_LINES   = [0,  2,  4,  6,  8];
    var DIATONIC     = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    var ACCID        = ['', '♯', '', '♯', '', '', '♯', '', '♯', '', '♯', ''];

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

    function drawStaffNote(container, midi, color, xPos) {
        var pos = midiToStaffPos(midi);
        var y   = staffY(pos);
        var acc = ACCID[midi % 12];
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
            var at = svgEl('text', { x: xPos - 15, y: y + 4, 'font-size': '13', fill: color, 'font-family': 'serif' });
            at.textContent = acc;
            container.appendChild(at);
        }
        container.appendChild(svgEl('ellipse', {
            cx: xPos, cy: y, rx: '6.5', ry: '4.5', fill: color,
            transform: 'rotate(-15,' + xPos + ',' + y + ')'
        }));
    }

    function updateStaff() {
        var ng = document.getElementById('staff-notes');
        if (!ng) return;
        while (ng.firstChild) ng.removeChild(ng.firstChild);
        if (!state.currentScale) return;

        if (state.answered) {
            var midis = getScaleMidis(state.currentRootMidi, state.currentScale, state.direction);
            var step = (STAFF_X2 - NOTE_X) / (midis.length - 1);
            midis.forEach(function (midi, i) {
                var color = (i === 0 || i === midis.length - 1) ? '#ffd700' : '#2ecc71';
                drawStaffNote(ng, midi, color, NOTE_X + i * step);
            });
        } else {
            drawStaffNote(ng, state.currentRootMidi, '#ffd700', NOTE_X);
        }
    }

    // ── Keyboard ─────────────────────────────────────────────────────────────

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
        if (!keys.length || !state.currentScale) return;
        var scaleMidis = getScaleMidis(state.currentRootMidi, state.currentScale, state.direction);

        for (var i = 0; i < keys.length; i++) {
            var key  = keys[i];
            var midi = parseInt(key.getAttribute('data-midi'));
            key.classList.remove('root', 'correct', 'wrong');
            
            if (midi === state.currentRootMidi) {
                key.classList.add('root');
            } else if (state.answered) {
                if (scaleMidis.indexOf(midi) !== -1) {
                    key.classList.add('correct');
                }
                if (state.wrongNotes && state.wrongNotes.indexOf(midi) !== -1) {
                    key.classList.add('wrong');
                }
            } else {
                if (state.userNotes && state.userNotes.indexOf(midi) !== -1) {
                    key.classList.add('correct');
                } else if (state.wrongNotes && state.wrongNotes.indexOf(midi) !== -1) {
                    key.classList.add('wrong');
                }
            }
        }
    }

    function onKeyClick(midi) {
        if (!sampler.loaded) return;

        if (state.answered) {
            Tone.start().then(function () {
                sampler.triggerAttackRelease(midiToNote(midi), '8n', Tone.now());
            });
            return;
        }

        var maxMidi = state.currentRootMidi;
        if (state.currentScale) {
            var correctMidis = getScaleMidis(state.currentRootMidi, state.currentScale, 'up');
            maxMidi = correctMidis[correctMidis.length - 1];
        }

        if (midi < state.currentRootMidi || midi > maxMidi) {
            Tone.start().then(function () {
                sampler.triggerAttackRelease(midiToNote(midi), '8n', Tone.now());
            });
            return;
        }

        var correctMidis = getScaleMidis(state.currentRootMidi, state.currentScale, 'up');

        if (correctMidis.indexOf(midi) !== -1) {
            Tone.start().then(function () {
                sampler.triggerAttackRelease(midiToNote(midi), '8n', Tone.now());
            });

            if (state.userNotes.indexOf(midi) === -1) {
                state.userNotes.push(midi);
            }

            updateKeyboard();

            var allPressed = true;
            for (var i = 0; i < correctMidis.length; i++) {
                var m = correctMidis[i];
                if (m !== state.currentRootMidi && state.userNotes.indexOf(m) === -1) {
                    allPressed = false;
                    break;
                }
            }

            if (allPressed) {
                state.answered = true;
                state.total++;

                if (!state.hasErrors) {
                    state.score++;
                    setFeedback(T.correct, '#2ecc71');
                    var btn = document.querySelector('.btn-scale[data-id="' + state.currentScale.id + '"]');
                    if (btn) btn.classList.add('correct');
                } else {
                    setFeedback(T.completedErrors, '#e74c3c');
                    var btn = document.querySelector('.btn-scale[data-id="' + state.currentScale.id + '"]');
                    if (btn) btn.classList.add('correct');
                }

                updateScore();
                updateKeyboard();
                updateStaff();

                setTimeout(function () {
                    playScale(state.currentScale.id);
                }, 400);
            }
        } else {
            Tone.start().then(function () {
                sampler.triggerAttackRelease(midiToNote(midi), '8n', Tone.now());
            });

            if (state.wrongNotes.indexOf(midi) === -1) {
                state.wrongNotes.push(midi);
            }

            state.hasErrors = true;
            setFeedback(T.wrong, '#e74c3c');
            updateKeyboard();
        }
    }

    function answer(scaleId) {
        if (state.answered) return;
        var correct = state.currentScale.id === scaleId;
        var btn = document.querySelector('.btn-scale[data-id="' + scaleId + '"]');

        if (correct) {
            state.answered = true;
            if (state.triedIds.length === 0 && !state.hasErrors) state.score++;
            setFeedback(T.correct, '#2ecc71');
            if (btn) btn.classList.add('correct');
            playScale(scaleId);
            state.total++;
            updateScore();
            updateKeyboard();
            updateStaff();
        } else {
            setFeedback(T.wrong, '#e74c3c');
            if (btn) btn.classList.add('wrong');
            state.triedIds.push(scaleId);
            state.hasErrors = true;
        }
    }

    function updateScaleButtonsAvailability() {
        var diffIds = DIFFICULTY_IDS[state.difficulty];
        if (!diffIds) diffIds = SCALES.map(function (s) { return s.id; });
        var enabledButtons = document.querySelectorAll('.btn-scale');
        enabledButtons.forEach(function (btn) {
            var scaleId = btn.getAttribute('data-id');
            var isEnabled = diffIds.indexOf(scaleId) !== -1;
            if (state.direction === 'down' && scaleId === 'minmel') {
                isEnabled = false;
            }
            btn.disabled = !isEnabled;
            btn.classList.toggle('active', isEnabled);
        });
    }

    function newQuestion(playAuto) {
        state.answered = false;
        state.triedIds = [];
        state.userNotes = [];
        state.wrongNotes = [];
        state.hasErrors = false;
        setFeedback('', 'transparent');
        document.querySelectorAll('.btn-scale').forEach(function (b) { b.classList.remove('correct', 'wrong'); });

        updateScaleButtonsAvailability();

        state.currentRootMidi = state.rootFixed ? state.rootMidi : (ROOT_MIN + Math.floor(Math.random() * (ROOT_MAX - ROOT_MIN + 1)));
        updateRootNoteDisplay();

        var diffIds = DIFFICULTY_IDS[state.difficulty];
        if (!diffIds) diffIds = SCALES.map(function (s) { return s.id; });
        var pool = diffIds.length > 1 ? diffIds.filter(function (id) { return id !== state.lastScaleId; }) : diffIds;
        
        if (state.direction === 'down') {
            pool = pool.filter(function (id) { return id !== 'minmel'; });
        }

        state.currentScale = getScale(pool[Math.floor(Math.random() * pool.length)]);
        state.lastScaleId = state.currentScale.id;
        updateKeyboard();
        updateStaff();
        if (playAuto !== false) playScale(state.currentScale.id);
    }

    function updateScore() {
        document.getElementById('score').textContent = state.score + ' / ' + state.total;
    }

    function updateScaleButtons() {
        document.querySelectorAll('.btn-scale').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var scaleId = this.getAttribute('data-id');
                if (this.disabled) return;
                if (state.triedIds.indexOf(scaleId) !== -1) {
                    playScale(scaleId);
                } else if (!state.answered) {
                    answer(scaleId);
                } else {
                    playScale(scaleId);
                }
            });
        });
    }

    function updateRootNoteDisplay() {
        var el = document.getElementById('root-note-display');
        if (el) el.textContent = midiToDisplay(state.rootMidi);
        var btnRandom = document.getElementById('btn-root-random');
        if (btnRandom) btnRandom.classList.toggle('active', !state.rootFixed);
        var ns = document.getElementById('note-selector');
        if (ns) ns.classList.toggle('fixed', state.rootFixed);
    }

    // MIDI Input Support
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(function(midiAccess) {
            function setupInputs() {
                for (var input of midiAccess.inputs.values()) {
                    input.onmidimessage = function(event) {
                        var cmd = event.data[0] & 0xf0;
                        var noteNum = event.data[1];
                        var velocity = event.data[2];

                        if (cmd === 0x90 && velocity > 0 && noteNum >= KEY_MIDI_START && noteNum <= KEY_MIDI_END) {
                            onKeyClick(noteNum);
                        }
                    };
                }
            }
            setupInputs();
            midiAccess.onstatechange = function() {
                setupInputs();
            };
        });
    }

    // Event listeners
    document.getElementById('btn-play').addEventListener('click', function () {
        if (!sampler.loaded) return;
        if (state.answered) newQuestion(true);
        else playScale(state.currentScale.id);
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        state.score = 0; state.total = 0;
        updateScore();
        if (sampler.loaded) newQuestion(true);
    });

    document.querySelectorAll('.btn-dir').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.direction = this.getAttribute('data-dir');
            document.querySelectorAll('.btn-dir').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            
            if (state.direction === 'down' && state.currentScale && state.currentScale.id === 'minmel') {
                if (sampler.loaded) newQuestion(true);
            } else {
                updateScaleButtonsAvailability();
                if (sampler.loaded && state.currentScale) playScale(state.currentScale.id);
            }
        });
    });

    document.querySelectorAll('.btn-diff').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.difficulty = parseInt(this.getAttribute('data-diff'), 10);
            state.score = 0; state.total = 0;
            updateScore();
            document.querySelectorAll('.btn-diff').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (sampler.loaded) newQuestion(true);
        });
    });

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

})();
