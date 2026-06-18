// intervalli.js v1.3

(function () {
    'use strict';

    if (typeof Tone === 'undefined') {
        document.getElementById('feedback').textContent = 'Errore: Tone.js non trovato in musica/lib/tone.js';
        document.getElementById('feedback').style.color = '#e74c3c';
        return;
    }

    var INTERVALS = [
        { id: 'min2',  name: '2ª minore',      semitoni: 1  },
        { id: 'mag2',  name: '2ª maggiore',    semitoni: 2  },
        { id: 'min3',  name: '3ª minore',      semitoni: 3  },
        { id: 'mag3',  name: '3ª maggiore',    semitoni: 4  },
        { id: 'qua4',  name: '4ª giusta',      semitoni: 5  },
        { id: 'tri',   name: 'Tritono',        semitoni: 6  },
        { id: 'qua5',  name: '5ª giusta',      semitoni: 7  },
        { id: 'min6',  name: '6ª minore',      semitoni: 8  },
        { id: 'mag6',  name: '6ª maggiore',    semitoni: 9  },
        { id: 'min7',  name: '7ª minore',      semitoni: 10 },
        { id: 'mag7',  name: '7ª maggiore',    semitoni: 11 },
        { id: 'ott',   name: 'Ottava',         semitoni: 12 },
        { id: 'min9',  name: '9ª minore',      semitoni: 13 },
        { id: 'mag9',  name: '9ª maggiore',    semitoni: 14 },
        { id: 'min10', name: '10ª minore',     semitoni: 15 },
        { id: 'mag10', name: '10ª maggiore',   semitoni: 16 },
        { id: 'qua11', name: '11ª giusta',     semitoni: 17 }
    ];

    // Progressione didattica
    var DIFFICULTY_IDS = {
        1: ['qua4', 'qua5', 'ott'],
        2: ['min3', 'mag3', 'qua4', 'qua5', 'ott'],
        3: ['mag2', 'min3', 'mag3', 'qua4', 'qua5', 'min6', 'mag6', 'ott'],
        4: null,  // tutti i 13 base
        5: null   // tutti i 13 base + 5 estesi
    };

    var EXTENDED_IDS = ['min9', 'mag9', 'min10', 'mag10', 'qua11'];

    var EN = window.currentLang === 'en';
    var T = {
        ready:   EN ? 'Ready — press ▶ to listen'  : 'Pronto — premi ▶ per ascoltare',
        correct: EN ? 'Correct! ✓'                  : 'Corretto! ✓',
        wrong:   EN ? 'Wrong — try again!'           : 'Sbagliato — riprova!',
        error:   EN ? 'Audio samples load error'     : 'Errore caricamento campioni audio'
    };

    // Note display (con ♯ invece di #)
    var NOTE_DISPLAY = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
    var NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

    // Range nota fissa: C3 (MIDI 48) → C4 (MIDI 60)
    var ROOT_MIN = 48;
    var ROOT_MAX = 72;

    function midiToNote(midi) {
        return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    }
    function midiToDisplay(midi) {
        return NOTE_DISPLAY[midi % 12] + (Math.floor(midi / 12) - 1);
    }

    var state = {
        mode:       'ascendente',
        difficulty: 1,
        rootFixed:      true,
        rootMidi:       60,   // nota selezionata manualmente (sempre mostrata)
        currentRootMidi: 60,  // nota effettivamente usata per la domanda corrente
        currentInterval: null,
        triedIds: [],
        score: 0,
        total: 0,
        answered: false
    };

    // Due istanze separate per garantire vera polifonia in modalità armonica.
    // I file vengono serviti dalla cache del browser dopo il primo caricamento.
    var SAMPLER_URLS = {
        'C3':  'C3.mp3',  'Eb3': 'Eb3.mp3',
        'Gb3': 'Gb3.mp3', 'A3':  'A3.mp3',
        'C4':  'C4.mp3',  'Eb4': 'Eb4.mp3',
        'Gb4': 'Gb4.mp3', 'A4':  'A4.mp3',
        'C5':  'C5.mp3'
    };
    var samplerLoadCount = 0;
    function onBothLoaded() {
        samplerLoadCount++;
        if (samplerLoadCount === 2) onSamplerReady();
    }
    // sampler  → centro (nota radice, tutti i modi)
    // sampler2 → destra (+0.5 pan) per la nota superiore in armonico:
    //   evita la cancellazione di fase tra il 2° armonico della nota radice
    //   e la fondamentale della nota superiore (problema tipico dell'ottava).
    var sampler  = new Tone.Sampler({ urls: SAMPLER_URLS, baseUrl: '../sounds/piano/', onload: onBothLoaded, onerror: function () { setFeedback(T.error, '#e74c3c'); } }).toDestination();
    var sampler2 = new Tone.Sampler({ urls: SAMPLER_URLS, baseUrl: '../sounds/piano/', onload: onBothLoaded }).toDestination();

    function onSamplerReady() {
        buildKeyboard();
        buildStaff();
        updateIntervalButtons();
        updateRootNoteDisplay();
        document.getElementById('btn-play').disabled = false;
        setFeedback(T.ready, 'rgba(255,255,255,0.35)');
        newQuestion(false);
    }

    // ── Logica di gioco ───────────────────────────────────────────────────────

    function getActiveIntervals() {
        if (state.difficulty === 5) return INTERVALS; // tutti i 18
        var ids = DIFFICULTY_IDS[state.difficulty];
        return ids ? INTERVALS.filter(function (iv) { return ids.indexOf(iv.id) !== -1; })
                   : INTERVALS.filter(function (iv) { return EXTENDED_IDS.indexOf(iv.id) === -1; });
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function newQuestion(autoPlay) {
        var active = getActiveIntervals();
        var pool = active.length > 1 && state.currentInterval
            ? active.filter(function (iv) { return iv.id !== state.currentInterval.id; })
            : active;
        state.currentInterval = pool[randomInt(0, pool.length - 1)];
        state.currentRootMidi = state.rootFixed ? state.rootMidi : randomInt(ROOT_MIN, ROOT_MAX);
        state.answered = false;
        resetButtonStyles();
        setFeedback('', 'transparent');
        updateKeyboard();
        updateStaff();
        if (autoPlay !== false) playCurrentInterval();
    }

    function playCurrentInterval() {
        Tone.start().then(function () {
            var root  = midiToNote(state.currentRootMidi);
            var upper = midiToNote(state.currentRootMidi + state.currentInterval.semitoni);
            var now   = Tone.now();

            if (state.currentInterval.semitoni === 0) {
                sampler.triggerAttackRelease(root, '2n', now);
                return;
            }

            if (state.mode === 'ascendente') {
                sampler.triggerAttackRelease(root,  '2n', now);
                sampler.triggerAttackRelease(upper, '2n', now + 0.7);
            } else if (state.mode === 'discendente') {
                sampler.triggerAttackRelease(upper, '2n', now);
                sampler.triggerAttackRelease(root,  '2n', now + 0.7);
            } else {
                sampler.triggerAttackRelease(root,  '2n', now);
                sampler2.triggerAttackRelease(upper, '2n', now + 0.02);
            }
        });
    }

    function playIntervalById(id) {
        var interval = null;
        for (var i = 0; i < INTERVALS.length; i++) {
            if (INTERVALS[i].id === id) { interval = INTERVALS[i]; break; }
        }
        if (!interval) return;
        Tone.start().then(function () {
            var root  = midiToNote(state.currentRootMidi);
            var upper = midiToNote(state.currentRootMidi + interval.semitoni);
            var now   = Tone.now();
            if (interval.semitoni === 0) { sampler.triggerAttackRelease(root, '2n', now); return; }
            if (state.mode === 'ascendente') {
                sampler.triggerAttackRelease(root,  '2n', now);
                sampler.triggerAttackRelease(upper, '2n', now + 0.7);
            } else if (state.mode === 'discendente') {
                sampler.triggerAttackRelease(upper, '2n', now);
                sampler.triggerAttackRelease(root,  '2n', now + 0.7);
            } else {
                sampler.triggerAttackRelease(root,  '2n', now);
                sampler2.triggerAttackRelease(upper, '2n', now + 0.02);
            }
        });
    }

    function answer(intervalId) {
        if (state.answered || !sampler.loaded && sampler2.loaded) return;

        var correct = state.currentInterval.id === intervalId;

        if (correct) {
            state.answered = true;
            state.total++;
            if (state.triedIds.length === 0) state.score++;
            setFeedback(T.correct, '#2ecc71');
            var btn = document.querySelector('.btn-interval[data-id="' + intervalId + '"]');
            if (btn) btn.classList.add('correct');
            updateKeyboard();
            updateStaff();
            updateScore();
            setTimeout(function () { newQuestion(true); }, 1200);
        } else {
            state.triedIds.push(intervalId);
            var btn = document.querySelector('.btn-interval[data-id="' + intervalId + '"]');
            if (btn) btn.classList.add('wrong');
            setFeedback(T.wrong, '#e74c3c');
            updateKeyboard();
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
        state.triedIds = [];
        var btns = document.querySelectorAll('.btn-interval');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('correct', 'wrong');
    }

    function highlightButtons(clickedId, correctId, wasCorrect) {
        var btns = document.querySelectorAll('.btn-interval');
        for (var i = 0; i < btns.length; i++) {
            var id = btns[i].getAttribute('data-id');
            if (id === correctId)              btns[i].classList.add('correct');
            else if (id === clickedId && !wasCorrect) btns[i].classList.add('wrong');
        }
    }

    function updateIntervalButtons() {
        var active = getActiveIntervals();
        var activeIds = active.map(function (iv) { return iv.id; });

        var btns = document.querySelectorAll('.btn-interval');
        for (var i = 0; i < btns.length; i++) {
            var id = btns[i].getAttribute('data-id');
            var inLevel = activeIds.indexOf(id) !== -1;
            btns[i].disabled = !sampler.loaded && sampler2.loaded || !inLevel;
            btns[i].classList.toggle('inactive', !inLevel);
        }
        updateKeyboard();
    }

    function updateRootNoteDisplay() {
        var el = document.getElementById('root-note-display');
        if (el) el.textContent = midiToDisplay(state.rootMidi);
        var btnRandom = document.getElementById('btn-root-random');
        if (btnRandom) btnRandom.classList.toggle('active', !state.rootFixed);
        var ns = document.getElementById('note-selector');
        if (ns) ns.classList.toggle('fixed', state.rootFixed);
    }

    // ── Pentagramma ───────────────────────────────────────────────────────────

    var SVG_NS       = 'http://www.w3.org/2000/svg';
    var STAFF_STEP   = 6;    // px per step diatonico (mezza riga)
    var STAFF_Y_MC   = 73;   // y del do centrale (p=10)
    var STAFF_X1     = 52;   // inizio righe (lascia spazio per le chiavi)
    var STAFF_X2     = 212;  // fine righe (~4 tasti bianchi di larghezza dal clef)
    var NOTE_X_ROOT  = 125;  // x nota radice
    var NOTE_X_UPPER = 175;  // x nota superiore

    var TREBLE_LINES = [12, 14, 16, 18, 20]; // E4 G4 B4 D5 F5
    var BASS_LINES   = [0,  2,  4,  6,  8];  // G2 B2 D3 F3 A3

    // Offset diatonico (0=C, 1=D, 2=E, 3=F, 4=G, 5=A, 6=B) per ogni semitono 0-11
    var DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    var ACCID    = ['', '♯', '', '♯', '', '', '♯', '', '♯', '', '♯', ''];

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

        var sc = 'rgba(255,255,255,0.6)'; // staff color

        // Righe pentagramma basso + violino
        BASS_LINES.forEach(function(p) {
            svg.appendChild(svgEl('line', {x1: STAFF_X1, y1: staffY(p), x2: STAFF_X2, y2: staffY(p), stroke: sc, 'stroke-width': '1'}));
        });
        TREBLE_LINES.forEach(function(p) {
            svg.appendChild(svgEl('line', {x1: STAFF_X1, y1: staffY(p), x2: STAFF_X2, y2: staffY(p), stroke: sc, 'stroke-width': '1'}));
        });

        // Stanghetta verticale sinistra
        svg.appendChild(svgEl('line', {x1: STAFF_X1, y1: staffY(0), x2: STAFF_X1, y2: staffY(20), stroke: sc, 'stroke-width': '2'}));

        // Chiave di violino (SVG Wikimedia, fill bianco)
        // x,y = angolo top-left; width/height controllano le dimensioni
        svg.appendChild(svgEl('image', {
            href: '../assets/treble-clef.svg',
            x: '50', y: '10', width: '28', height: '65',
            opacity: '0.7'
        }));

        svg.appendChild(svgEl('image', {
            href: '../assets/bass-clef.svg',
            x: '52', y: '85', width: '30', height: '37',
            opacity: '0.7'
        }));

        // Gruppo note (aggiornato da updateStaff)
        svg.appendChild(svgEl('g', {id: 'staff-notes'}));
    }

    function updateStaff() {
        var ng = document.getElementById('staff-notes');
        if (!ng) return;
        while (ng.firstChild) ng.removeChild(ng.firstChild);
        if (!state.currentRootMidi || !state.currentInterval) return;

        drawStaffNote(ng, state.currentRootMidi, '#ffd700', NOTE_X_ROOT);

        if (state.answered) {
            var upperMidi = state.currentRootMidi + state.currentInterval.semitoni;
            drawStaffNote(ng, upperMidi, '#2ecc71', NOTE_X_UPPER);
        }
    }

    function drawStaffNote(container, midi, color, xPos) {
        var pos = midiToStaffPos(midi);
        var y   = staffY(pos);
        var acc = ACCID[midi % 12];
        var sc  = 'rgba(255,255,255,0.6)';

        // Linee supplementari
        function ledger(p) {
            container.appendChild(svgEl('line', {
                x1: xPos - 11, y1: staffY(p), x2: xPos + 11, y2: staffY(p),
                stroke: sc, 'stroke-width': '1.2'
            }));
        }
        if (pos === 10) ledger(10);                            // do centrale
        for (var p = 22; p <= pos; p += 2) ledger(p);         // sopra violino
        for (var p = -2; p >= pos; p -= 2) ledger(p);         // sotto basso

        // Alterazione
        if (acc) {
            var at = svgEl('text', {x: xPos - 15, y: y + 4, 'font-size': '13', fill: color, 'font-family': 'serif'});
            at.textContent = acc;
            container.appendChild(at);
        }

        // Testa della nota (ellisse inclinata)
        container.appendChild(svgEl('ellipse', {
            cx: xPos, cy: y, rx: '6.5', ry: '4.5', fill: color,
            transform: 'rotate(-15,' + xPos + ',' + y + ')'
        }));

        // Gambo
        var up = pos < 16;
        container.appendChild(svgEl('line', {
            x1: xPos + (up ? 6 : -6), y1: y,
            x2: xPos + (up ? 6 : -6), y2: y + (up ? -34 : 34),
            stroke: color, 'stroke-width': '1.5'
        }));
    }

    // ── Tastiera piano ────────────────────────────────────────────────────────

    var KEY_MIDI_START = 48; // C3
    var KEY_MIDI_END   = 83; // B5  (3 ottave)
    var WHITE_CLASSES  = [0, 2, 4, 5, 7, 9, 11];
    var BLACK_OFFSETS  = { 1: 29, 3: 71, 6: 155, 8: 197, 10: 239 }; // px da inizio ottava
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
            var nc = midi % 12;
            var isWhite = WHITE_CLASSES.indexOf(nc) !== -1;
            var relOctave = Math.floor((midi - KEY_MIDI_START) / 12);

            var key = document.createElement('div');
            key.className = 'piano-key ' + (isWhite ? 'white' : 'black');
            key.setAttribute('data-midi', midi);

            if (isWhite) {
                key.style.left = (whiteIdx * WHITE_KEY_W) + 'px';
                // Etichetta C
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
        if (!keys.length) return;

        var activeIntervals = getActiveIntervals();
        var activeIds = activeIntervals.map(function (iv) { return iv.id; });

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var midi = parseInt(key.getAttribute('data-midi'));
            var semitoni = midi - state.currentRootMidi;

            key.classList.remove('root', 'answer', 'correct', 'wrong');

            if (midi === state.currentRootMidi) {
                key.classList.add('root');
                continue;
            }

            if (semitoni <= 0 || semitoni > 17) continue;

            var interval = null;
            for (var j = 0; j < INTERVALS.length; j++) {
                if (INTERVALS[j].semitoni === semitoni) { interval = INTERVALS[j]; break; }
            }
            if (!interval || activeIds.indexOf(interval.id) === -1) continue;

            if (state.triedIds.indexOf(interval.id) !== -1) {
                key.classList.add('wrong');
            } else if (state.answered && state.currentInterval && state.currentInterval.id === interval.id) {
                key.classList.add('correct');
            } else {
                key.classList.add('answer');
            }
        }
    }

    function onKeyClick(midi) {
        if (!sampler.loaded || !sampler2.loaded) return;

        // Click sulla nota radice → riproduci la radice
        if (midi === state.currentRootMidi) {
            Tone.start().then(function () {
                sampler.triggerAttackRelease(midiToNote(state.currentRootMidi), '2n', Tone.now() + 0.05);
            });
            return;
        }

        var semitoni = midi - state.currentRootMidi;
        if (semitoni <= 0 || semitoni > 17) return;

        var interval = null;
        for (var i = 0; i < INTERVALS.length; i++) {
            if (INTERVALS[i].semitoni === semitoni) { interval = INTERVALS[i]; break; }
        }
        if (!interval) return;

        var btn = document.querySelector('.btn-interval[data-id="' + interval.id + '"]');
        if (!btn || btn.classList.contains('inactive')) return;

        if (btn.classList.contains('wrong')) {
            playIntervalById(interval.id);
        } else if (!state.answered) {
            answer(interval.id);
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
        if (!sampler.loaded && sampler2.loaded) return;
        if (state.answered || state.currentInterval === null) newQuestion(true);
        else playCurrentInterval();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        state.score = 0;
        state.total = 0;
        updateScore();
        if (sampler.loaded && sampler2.loaded) newQuestion(true);
    });

    // Modalità
    document.querySelectorAll('.btn-mode').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.mode = this.getAttribute('data-mode');
            document.querySelectorAll('.btn-mode').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    // Difficoltà
    document.querySelectorAll('.btn-diff').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.difficulty = parseInt(this.getAttribute('data-diff'), 10);
            state.score = 0; state.total = 0;
            updateScore();
            document.querySelectorAll('.btn-diff').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            updateIntervalButtons();
            if (sampler.loaded && sampler2.loaded) newQuestion(true);
        });
    });

    // Nota fissa — click sulla nota stessa
    document.getElementById('root-note-display').addEventListener('click', function () {
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded && sampler2.loaded) newQuestion(true);
    });

    // Nota fissa — pulsante Casuale
    document.getElementById('btn-root-random').addEventListener('click', function () {
        state.rootFixed = false;
        updateRootNoteDisplay();
        if (sampler.loaded && sampler2.loaded) newQuestion(true);
    });

    // Nota fissa — frecce (primo click: fissa senza muovere; click successivi: muove)
    document.getElementById('btn-root-prev').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi <= ROOT_MIN ? ROOT_MAX : state.rootMidi - 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded && sampler2.loaded) newQuestion(true);
    });
    document.getElementById('btn-root-next').addEventListener('click', function () {
        if (state.rootFixed) state.rootMidi = state.rootMidi >= ROOT_MAX ? ROOT_MIN : state.rootMidi + 1;
        state.rootFixed = true;
        updateRootNoteDisplay();
        if (sampler.loaded && sampler2.loaded) newQuestion(true);
    });

    // Risposte
    document.querySelectorAll('.btn-interval').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (this.classList.contains('inactive')) return;
            var id = this.getAttribute('data-id');
            if (this.classList.contains('wrong')) {
                playIntervalById(id); // ri-click su errato: suona per confronto
            } else {
                answer(id);
            }
        });
    });

})();
