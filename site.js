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

    function playBuffer(src, vol, el) {
        var ctx = getCtx();
        var gain = (typeof vol === 'number' && vol >= 0 && vol !== 1) ? vol : 1;
        var startTime = Date.now();

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
            /* Traccia i source attivi sull'elemento <audio> di provenienza,
               così pause() (patchata sotto) può fermarli davvero: il suono
               è un AudioBufferSourceNode, non l'elemento. */
            if (el) {
                if (!el._waSources) el._waSources = [];
                el._waSources.push(source);
                source.onended = function () {
                    var i = el._waSources ? el._waSources.indexOf(source) : -1;
                    if (i >= 0) el._waSources.splice(i, 1);
                };
            }
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
                if (Date.now() - startTime > 500) return; // stale: troppo tardi, scartiamo
                if (ctx.state === 'suspended') {
                    // Contesto non ancora pronto: aspettiamo il resume e poi suoniamo
                    return ctx.resume().then(function () {
                        if (Date.now() - startTime <= 500) doPlay(decoded);
                    });
                }
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
            return playBuffer(src, self.volume, self).catch(function () {
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

    // ── Monkey-patch HTMLAudioElement.pause() ─────────────────────────────
    // Il play() patchato suona via Web Audio: l'elemento resta "paused" e la
    // pause() nativa non fermerebbe nulla. Qui si stoppano i source attivi
    // registrati da playBuffer, poi si delega comunque alla pause() nativa
    // (copre il percorso di fallback HTML Audio).
    var _origPause = HTMLAudioElement.prototype.pause;
    HTMLAudioElement.prototype.pause = function () {
        if (this._waSources) {
            var attivi = this._waSources;
            this._waSources = [];
            for (var i = 0; i < attivi.length; i++) {
                try { attivi[i].stop(); } catch (e) { }
            }
        }
        return _origPause.call(this);
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
