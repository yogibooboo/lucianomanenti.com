// ============================================================================
// MOTORE AI — B
// Richiama scegliBestOpzioneAI sostituendo temporaneamente i coefficienti
// con window.coeffScoreOpzB per tutta la durata della chiamata.
// Sicuro perché il gioco è sincrono (un solo turno alla volta).
// ============================================================================

window.scegliBestOpzioneAI_B = function (giocatore, soloMano, verbose, fase) {
    var saved = window.coeffScoreOpz;
    window.coeffScoreOpz = window.coeffScoreOpzB || saved;
    try {
        return scegliBestOpzioneAI(giocatore, soloMano, verbose, fase);
    } finally {
        window.coeffScoreOpz = saved;
    }
};
