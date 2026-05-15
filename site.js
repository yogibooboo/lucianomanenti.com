// site.js v1.0
// Utility globali condivise da tutti i giochi del sito.
// - Registrazione Service Worker (navigazione PWA corretta su Android)
// - Audio: mute/unmute globale via Web Audio API (localStorage key 'site-audio-muted')
// - Fix navigazione: replace() per evitare accumulo history su mobile
(function () {
    // Registra il service worker per abilitare la navigazione PWA corretta su Android
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }

    window.audioMuted = localStorage.getItem('site-audio-muted') === 'true';

    // ── Web Audio API ─────────────────────────────────────────────────────
    var _ctx = null;
    var _cache = {};  // src (URL assoluto) → AudioBuffer

    function getCtx() {
        if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (_ctx.state === 'suspended') _ctx.resume();
        return _ctx;
    }

    // Risveglia il contesto al primo gesto utente (requisito mobile)
    ['click', 'touchend', 'keydown'].forEach(function (ev) {
        document.addEventListener(ev, function () {
            if (_ctx && _ctx.state === 'suspended') _ctx.resume();
        }, { capture: true, passive: true });
    });

    function playBuffer(src, vol) {
        var ctx = getCtx();
        var gain = (typeof vol === 'number' && vol >= 0 && vol !== 1) ? vol : 1;

        function doPlay(buffer) {
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            if (gain !== 1) {
                var gainNode = ctx.createGain();
                gainNode.gain.value = gain;
                source.connect(gainNode);
                gainNode.connect(ctx.destination);
            } else {
                source.connect(ctx.destination);
            }
            source.start();
        }

        if (_cache[src]) {
            doPlay(_cache[src]);
            return Promise.resolve();
        }

        return fetch(src)
            .then(function (r) { return r.arrayBuffer(); })
            .then(function (buf) { return ctx.decodeAudioData(buf); })
            .then(function (decoded) {
                _cache[src] = decoded;
                doPlay(decoded);
            });
    }

    // ── Monkey-patch HTMLAudioElement.play() ──────────────────────────────
    var _origPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function () {
        if (window.audioMuted) return Promise.resolve();

        var src = this.src || this.currentSrc;
        var self = this;

        if (src && (window.AudioContext || window.webkitAudioContext)) {
            return playBuffer(src, self.volume).catch(function () {
                return _origPlay.call(self);
            });
        }

        // Fallback HTML Audio (browser senza Web Audio API)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = 'none';
            self.addEventListener('ended', function () {
                navigator.mediaSession.playbackState = 'none';
            }, { once: true });
        }
        return _origPlay.call(self);
    };

    // ── Fix navigazione: replace() evita accumulo history su mobile ───────
    document.addEventListener('click', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        if (!el || el.target === '_blank') return;
        var href = el.getAttribute('href');
        if (!href || href.indexOf('javascript:') === 0 || href.charAt(0) === '#') return;
        try {
            var url = new URL(href, window.location.href);
            if (url.hostname === window.location.hostname) {
                e.preventDefault();
                window.location.replace(url.href);
            }
        } catch (ex) {}
    }, true);

    // ── Toggle button audio ───────────────────────────────────────────────
    window.initAudioToggle = function (btnSelector) {
        var btn = document.querySelector(btnSelector || '#btn-audio');
        if (!btn) return;

        function update() {
            btn.classList.toggle('muted', window.audioMuted);
        }

        btn.addEventListener('click', function () {
            window.audioMuted = !window.audioMuted;
            localStorage.setItem('site-audio-muted', String(window.audioMuted));
            update();
        });

        update();
    };
})();
