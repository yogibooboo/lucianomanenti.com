// quindici.js -- Gioco del 15 (15 puzzle).
//
// Facile e Normale nascono dalla posizione risolta applicando mosse valide a
// caso senza mai annullare la mossa appena fatta. Completo dispone le tessere
// del tutto a caso e corregge la parita' quando lo schema verrebbe
// impossibile. In tutti e due i casi ogni partita e' risolvibile.

(function () {
    'use strict';

    // ── Testi ────────────────────────────────────────────────────────────
    var TESTI = {
        it: {
            istruzioni: 'Clicca una tessera nella riga o colonna dello spazio vuoto (o usa le frecce)',
            vinto: 'Risolto!',
            vintoTesto: function (mosse, tempo) {
                return 'Hai rimesso in ordine tutte le tessere in ' + mosse + ' mosse (' + tempo + ').';
            },
            facile: 'Facile',
            normale: 'Normale',
            difficile: 'Completo'
        },
        en: {
            istruzioni: 'Click a tile in the same row or column as the empty space (or use arrow keys)',
            vinto: 'Solved!',
            vintoTesto: function (mosse, tempo) {
                return 'You put all fifteen tiles back in order in ' + mosse + ' moves (' + tempo + ').';
            },
            facile: 'Easy',
            normale: 'Normal',
            difficile: 'Full'
        }
    };

    function t(chiave) {
        var l = (window.currentLang === 'en') ? 'en' : 'it';
        return TESTI[l][chiave];
    }

    // ── Stato ────────────────────────────────────────────────────────────

    // Quante mosse casuali (senza inversione immediata) si fanno dallo schema
    // ordinato per ciascun livello. Completo non ha passi: e' una disposizione
    // a caso (mescolaCompleto).
    var PASSI_MESCOLA = {
        facile: 15,
        normale: 35
    };

    // tavolo[0..15]: da 1 a 15 per le tessere, 0 per la casella vuota.
    var tavolo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    var finita = true;
    var difficolta = 'normale';
    var mosse = 0;
    var secondi = 0;
    var timerId = null;

    // Statistiche di sessione (conservate attraverso la ricarica di "un'altra")
    var sessione = {
        risolte: 0,
        minMosse: null,
        minTempo: null
    };

    // ── Suoni ────────────────────────────────────────────────────────────
    function suona(id) {
        var a = document.getElementById(id);
        if (!a) return;
        try {
            a.currentTime = 0;
            var p = a.play();
            if (p && p.catch) p.catch(function () { });
        } catch (e) { }
    }

    // ── Logica del tabellone 4x4 ─────────────────────────────────────────

    function indiceVuoto(tav) {
        for (var i = 0; i < 16; i++) {
            if (tav[i] === 0) return i;
        }
        return 15;
    }

    function quanteAPosto(tav) {
        var n = 0;
        for (var i = 0; i < 15; i++) {
            if (tav[i] === i + 1) n++;
        }
        return n;
    }

    function eRisolto(tav) {
        return quanteAPosto(tav) === 15 && tav[15] === 0;
    }

    // Caselle adiacenti ortogonalmente all'indice dato.
    function viciniDi(idx) {
        var r = Math.floor(idx / 4);
        var c = idx % 4;
        var v = [];
        if (r > 0) v.push(idx - 4);
        if (r < 3) v.push(idx + 4);
        if (c > 0) v.push(idx - 1);
        if (c < 3) v.push(idx + 1);
        return v;
    }

    // Mescola partendo dallo schema ordinato con N scambi validi della casella
    // vuota, evitando di tornare subito sulla casella appena lasciata.
    function mescolaTavolo(passi) {
        var tav = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
        var vuoto = 15;
        var precedente = -1;

        for (var p = 0; p < passi; p++) {
            var vicini = viciniDi(vuoto);
            var candidati = [];
            for (var i = 0; i < vicini.length; i++) {
                if (vicini[i] !== precedente) candidati.push(vicini[i]);
            }
            var scelto = candidati[Math.floor(Math.random() * candidati.length)];
            tav[vuoto] = tav[scelto];
            tav[scelto] = 0;
            precedente = vuoto;
            vuoto = scelto;
        }

        // Nel caso rarissimo in cui il mescolamento riporti allo schema gia'
        // risolto, fa ancora un passo.
        if (eRisolto(tav)) {
            var v0 = viciniDi(vuoto)[0];
            tav[vuoto] = tav[v0];
            tav[v0] = 0;
        }
        return tav;
    }

    // Completo: le quindici tessere in un ordine qualsiasi con il vuoto in
    // basso a destra. Con il vuoto li' lo schema e' risolvibile solo se il
    // numero di inversioni (coppie di tessere in ordine sbagliato) e' pari:
    // se e' dispari basta scambiare due tessere. Poi il vuoto fa qualche passo
    // a caso, che non cambia la risolvibilita', per non stare sempre nello
    // stesso angolo.
    function mescolaCompleto() {
        var tessere = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        for (var i = tessere.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var x = tessere[i]; tessere[i] = tessere[j]; tessere[j] = x;
        }
        var inversioni = 0;
        for (var a = 0; a < 15; a++) {
            for (var b = a + 1; b < 15; b++) {
                if (tessere[a] > tessere[b]) inversioni++;
            }
        }
        if (inversioni % 2 === 1) {
            var y = tessere[0]; tessere[0] = tessere[1]; tessere[1] = y;
        }
        var tav = tessere.concat([0]);
        var vuoto = 15, precedente = -1;
        // 20 o 21 passi: con un numero fisso il vuoto starebbe sempre su
        // caselle dello stesso colore della scacchiera.
        var passi = 20 + Math.floor(Math.random() * 2);
        for (var p = 0; p < passi; p++) {
            var vicini = viciniDi(vuoto), candidati = [];
            for (var k = 0; k < vicini.length; k++) {
                if (vicini[k] !== precedente) candidati.push(vicini[k]);
            }
            var scelto = candidati[Math.floor(Math.random() * candidati.length)];
            tav[vuoto] = tav[scelto];
            tav[scelto] = 0;
            precedente = vuoto;
            vuoto = scelto;
        }
        // Lo schema gia' risolto per caso: si rifa'.
        if (eRisolto(tav)) return mescolaCompleto();
        return tav;
    }

    // Sposta tutte le tessere comprese fra l'indice cliccato e la casella vuota
    // (se sono sulla stessa riga o sulla stessa colonna). Restituisce true se
    // almeno una tessera si e' mossa.
    function scorriVersoVuoto(idx) {
        var vuoto = indiceVuoto(tavolo);
        if (idx === vuoto) return false;

        var rIdx = Math.floor(idx / 4), cIdx = idx % 4;
        var rVuoto = Math.floor(vuoto / 4), cVuoto = vuoto % 4;

        if (rIdx !== rVuoto && cIdx !== cVuoto) return false;

        var passo;
        if (rIdx === rVuoto) {
            passo = (idx < vuoto) ? -1 : 1;
        } else {
            passo = (idx < vuoto) ? -4 : 4;
        }

        var curr = vuoto;
        while (curr !== idx) {
            var prossimo = curr + passo;
            tavolo[curr] = tavolo[prossimo];
            curr = prossimo;
        }
        tavolo[idx] = 0;
        return true;
    }

    // ── Orologio ─────────────────────────────────────────────────────────

    function formattaTempo(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function fermaTimer() {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function avviaTimer() {
        fermaTimer();
        timerId = setInterval(function () {
            if (finita || document.hidden) return;
            secondi++;
            var el = document.getElementById('valore-tempo');
            if (el) el.textContent = formattaTempo(secondi);
        }, 1000);
    }

    // ── Il tabellone a video ─────────────────────────────────────────────

    // In una griglia 4x4 a scacchiera, la casella d'arrivo della tessera val
    // ha indice (val - 1), cioe' riga Math.floor((val - 1) / 4) e colonna
    // (val - 1) % 4. La parita' di (riga + colonna) determina il colore fisso
    // della tessera: a schema risolto (1..15) le tessere formano una scacchiera
    // perfetta (1, 3, 6, 8, 9, 11, 14 di un colore; 2, 4, 5, 7, 10, 12, 13, 15
    // dell'altro).
    function classeScacchiera(val) {
        var idxFinale = val - 1;
        var r = Math.floor(idxFinale / 4);
        var c = idxFinale % 4;
        return ((r + c) % 2 === 0) ? ' pari' : ' dispari';
    }

    function disegna(vittoria) {
        var vuoto = indiceVuoto(tavolo);
        var rVuoto = Math.floor(vuoto / 4);
        var cVuoto = vuoto % 4;

        for (var i = 0; i < 16; i++) {
            var cella = document.getElementById('c' + i);
            if (!cella) continue;
            var val = tavolo[i];
            if (val === 0) {
                cella.textContent = '';
                cella.className = 'casella vuota';
            } else {
                cella.textContent = String(val);
                var r = Math.floor(i / 4);
                var c = i % 4;
                var allineata = !finita && (r === rVuoto || c === cVuoto);
                var giusta = (val === i + 1);
                cella.className = 'casella tessera'
                    + classeScacchiera(val)
                    + (allineata ? ' cliccabile' : '')
                    + (giusta ? ' corretta' : '')
                    + (vittoria ? ' vincente' : '');
            }
        }
    }

    function scriviMessaggio(testo) {
        var m = document.getElementById('messaggio');
        if (m) m.textContent = testo;
    }

    function scriviPannelli() {
        var d = document.getElementById('valore-difficolta');
        var mo = document.getElementById('valore-mosse');
        var te = document.getElementById('valore-tempo');
        var ap = document.getElementById('valore-aposto');
        if (d) d.textContent = t(difficolta);
        if (mo) mo.textContent = String(mosse);
        if (te) te.textContent = formattaTempo(secondi);
        if (ap) ap.textContent = quanteAPosto(tavolo) + ' / 15';

        var ri = document.getElementById('punti-risolte');
        var rm = document.getElementById('record-mosse');
        var rt = document.getElementById('record-tempo');
        if (ri) ri.textContent = String(sessione.risolte);
        if (rm) rm.textContent = (sessione.minMosse !== null) ? String(sessione.minMosse) : '\u2014';
        if (rt) rt.textContent = (sessione.minTempo !== null) ? formattaTempo(sessione.minTempo) : '\u2014';
    }

    // ── Modali ───────────────────────────────────────────────────────────

    function modaleAperta() {
        var s = document.getElementById('schermo');
        return !!(s && s.style.display === 'block');
    }

    function apri(id) {
        var s = document.getElementById('schermo');
        var m = document.getElementById(id);
        if (s) s.style.display = 'block';
        if (m) m.style.display = 'block';
    }

    function chiudi(id) {
        var s = document.getElementById('schermo');
        var m = document.getElementById(id);
        if (m) m.style.display = 'none';
        if (s) s.style.display = 'none';
    }

    function valoreScelto(nome, perDifetto) {
        var caselle = document.querySelectorAll('input[name="' + nome + '"]');
        for (var i = 0; i < caselle.length; i++) {
            if (caselle[i].checked) return caselle[i].value;
        }
        return perDifetto;
    }

    function impostaRadio(nome, valore) {
        var caselle = document.querySelectorAll('input[name="' + nome + '"]');
        for (var i = 0; i < caselle.length; i++) {
            caselle[i].checked = (caselle[i].value === valore);
        }
    }

    // ── Partita ──────────────────────────────────────────────────────────

    function variante() {
        return difficolta;
    }

    // La partita comincia davvero alla prima mossa: li' partono il
    // cronometro e game_start (eseguiMossa). Uno schema aperto e lasciato li'
    // senza toccarlo non conta come partita.
    function nuovaPartita() {
        fermaTimer();
        tavolo = (difficolta === 'difficile')
            ? mescolaCompleto()
            : mescolaTavolo(PASSI_MESCOLA[difficolta] || 35);
        finita = false;
        mosse = 0;
        secondi = 0;

        scriviPannelli();
        disegna(false);
        scriviMessaggio(t('istruzioni'));
    }

    // Ripartenza dalla finestra di fine partita tramite reloadWithInterstitial
    // (11.3 del canonico). Conserva livello e statistiche di sessione.
    var SEGNO_RIPARTENZA = 'quindici_ripartenza';

    function altraPartita() {
        try {
            sessionStorage.setItem(SEGNO_RIPARTENZA, JSON.stringify({
                difficolta: difficolta,
                sessione: sessione
            }));
        } catch (e) { }
        if (typeof window.reloadWithInterstitial === 'function') {
            window.reloadWithInterstitial();
        } else {
            location.reload();
        }
    }

    function ripartenza() {
        var grezzo = null;
        try {
            grezzo = sessionStorage.getItem(SEGNO_RIPARTENZA);
            sessionStorage.removeItem(SEGNO_RIPARTENZA);
        } catch (e) { return null; }
        if (!grezzo) return null;
        try { return JSON.parse(grezzo); } catch (e) { return null; }
    }

    function eseguiMossa(idx) {
        if (finita || modaleAperta()) return;
        if (!scorriVersoVuoto(idx)) return;

        if (mosse === 0) {
            if (window.sitoPartita) window.sitoPartita.inizio(variante());
            avviaTimer();
        }
        mosse++;
        suona('snd-mossa');

        if (eRisolto(tavolo)) {
            finita = true;
            fermaTimer();
            sessione.risolte++;
            if (sessione.minMosse === null || mosse < sessione.minMosse) {
                sessione.minMosse = mosse;
            }
            if (sessione.minTempo === null || secondi < sessione.minTempo) {
                sessione.minTempo = secondi;
            }
            scriviPannelli();
            disegna(true);
            finePartita();
            return;
        }

        scriviPannelli();
        disegna(false);
    }

    function finePartita() {
        var titolo = t('vinto');
        var testo = t('vintoTesto')(mosse, formattaTempo(secondi));
        scriviMessaggio(titolo);

        var ti = document.getElementById('fine-titolo');
        var te = document.getElementById('fine-testo');
        if (ti) ti.textContent = titolo;
        if (te) te.textContent = testo;

        suona('snd-vinta');

        if (window.sitoPartita) {
            window.sitoPartita.fine('won', {
                dettagli: 'mosse=' + mosse + ';tempo=' + secondi
            });
        }

        setTimeout(function () {
            if (typeof window.setupAmazonFinishBanner === 'function') {
                window.setupAmazonFinishBanner('modal-fine', {
                    modalStyle: { overflow: 'visible' },
                    targetTop: 375,
                    applyModalTop: false,
                    bannerWidth: 700,
                    bannerHeight: 250,
                    bannerTopOffset: 265,
                    leftOffset: -150
                });
            }
            apri('modal-fine');
        }, 700);
    }

    // ── Tastiera ─────────────────────────────────────────────────────────
    // Le frecce fanno scorrere una tessera adiacente dentro lo spazio vuoto
    // nella direzione della freccia premuta (es. Freccia Su sposta verso l'alto
    // la tessera che sta sotto lo spazio vuoto).
    function gestisciTastiera(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (finita || modaleAperta()) return;

        var vuoto = indiceVuoto(tavolo);
        var r = Math.floor(vuoto / 4);
        var c = vuoto % 4;
        var bersaglio = -1;

        if (e.key === 'ArrowUp' && r < 3) bersaglio = vuoto + 4;
        else if (e.key === 'ArrowDown' && r > 0) bersaglio = vuoto - 4;
        else if (e.key === 'ArrowLeft' && c < 3) bersaglio = vuoto + 1;
        else if (e.key === 'ArrowRight' && c > 0) bersaglio = vuoto - 1;

        if (bersaglio >= 0) {
            e.preventDefault();
            eseguiMossa(bersaglio);
        }
    }

    // ── Avvio ────────────────────────────────────────────────────────────

    function collega() {
        for (var i = 0; i < 16; i++) {
            (function (n) {
                var cella = document.getElementById('c' + n);
                if (cella) cella.addEventListener('click', function () { eseguiMossa(n); });
            })(i);
        }

        document.addEventListener('keydown', gestisciTastiera);

        var bn = document.getElementById('btn-nuova');
        if (bn) bn.addEventListener('click', function () {
            if (!finita && mosse > 0) {
                apri('modal-conferma');
                return;
            }
            impostaRadio('difficolta', difficolta);
            apri('modal-nuova');
        });

        var bSi = document.getElementById('btn-conferma-si');
        if (bSi) bSi.addEventListener('click', function () {
            chiudi('modal-conferma');
            fermaTimer();
            if (!finita && mosse > 0 && window.sitoPartita) {
                window.sitoPartita.fine('abandoned', {
                    dettagli: 'mosse=' + mosse + ';tempo=' + secondi
                });
            }
            finita = true;
            impostaRadio('difficolta', difficolta);
            apri('modal-nuova');
        });

        var bNo = document.getElementById('btn-conferma-no');
        if (bNo) bNo.addEventListener('click', function () {
            chiudi('modal-conferma');
        });

        var bi = document.getElementById('btn-inizia');
        if (bi) bi.addEventListener('click', function () {
            difficolta = valoreScelto('difficolta', 'normale');
            chiudi('modal-nuova');
            nuovaPartita();
        });

        var br = document.getElementById('btn-rigioca');
        if (br) br.addEventListener('click', altraPartita);

        var bc = document.getElementById('btn-cambia');
        if (bc) bc.addEventListener('click', function () {
            chiudi('modal-fine');
            impostaRadio('difficolta', difficolta);
            apri('modal-nuova');
        });
    }

    function init() {
        collega();

        var torna = ripartenza();
        if (torna) {
            difficolta = torna.difficolta || 'normale';
            impostaRadio('difficolta', difficolta);
            if (torna.sessione) {
                sessione.risolte = Number(torna.sessione.risolte) || 0;
                sessione.minMosse = (torna.sessione.minMosse !== null && torna.sessione.minMosse !== undefined)
                    ? Number(torna.sessione.minMosse) : null;
                sessione.minTempo = (torna.sessione.minTempo !== null && torna.sessione.minTempo !== undefined)
                    ? Number(torna.sessione.minTempo) : null;
            }
            nuovaPartita();
            return;
        }

        scriviPannelli();
        disegna(false);
        scriviMessaggio('');
        apri('modal-nuova');
    }

    function avvia() {
        if (typeof window.waitForInterstitial === 'function') {
            window.waitForInterstitial(init);
        } else {
            init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', avvia);
    } else {
        avvia();
    }

})();
