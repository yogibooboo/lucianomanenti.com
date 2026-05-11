// audio-toggle.js v1.2
// Gestione mute/unmute audio globale per tutto il sito.
// Usa localStorage key 'site-audio-muted'.
// Intercetta TUTTI i .play() tramite monkey-patch: nessun gioco richiede modifiche al codice.
// Ogni gioco include questo file e chiama initAudioToggle('#btn-audio').
(function () {
    window.audioMuted = localStorage.getItem('site-audio-muted') === 'true';

    // Intercetta ogni HTMLAudioElement.play() a livello globale
    var _origPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function () {
        if (window.audioMuted) return Promise.resolve();
        return _origPlay.apply(this, arguments);
    };

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
