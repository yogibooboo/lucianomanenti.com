// site.js
// Utility globali condivise da tutte le pagine del sito (giochi e testo).
// - Lingua della pagina: window.currentLang ricavata da <html lang> se manca
// - Memoria del browser bloccata (tutti i cookie vietati): una memoria finta al
//   posto di localStorage, un avviso al giocatore, l'evento storage_blocked
// - Google Analytics: definisce gtag() e carica la libreria fuori da dev_mode
// - Icone del sito: crea le righe <link> delle favicon se mancano
// - Registrazione Service Worker (navigazione PWA corretta su Android)
// - Audio: mute/unmute globale via Web Audio API (localStorage key 'site-audio-muted')
// - Fix navigazione: replace() per evitare accumulo history su mobile
// - Layout dei giochi: scala il campo nella finestra e gestisce le due colonne;
//   cosa ci va dentro lo decide un fornitore (sitoSpazi.registra)
//   (pubblicita.js se l'interruttore PUBBLICITA e' acceso, altrimenti
//   promozioni.js, con i messaggi del sito)
// - Riquadro di consenso: nasconde il riquadro del gestore, che si sovrappone al
//   gioco; la sua funzione la fa il link "Gestisci Cookie" nel pie' di pagina
// - Pie' di pagina: riempie i <div class="nav-links" data-comune> con le voci
//   comuni (Home, Privacy, Chi sono / Scrivetemi)
// - "Gestisci Cookie": c'e' solo a pubblicita' accesa, sia la voce messa qui
//   nel pie' di pagina sia il link scritto a mano nelle pagine di gioco
//
// I commenti qui sotto dicono il perche' di una riga e i tranelli da non
// ripetere. Il resto -- da quante pagine viene ogni pezzo, le misure, la storia
// delle decisioni -- sta in doc/testa-canonica.md, sezioni 3 e 8.
(function () {
    // ── L'INTERRUTTORE DELLA PUBBLICITA' ──────────────────────────────────
    // false: il sito e' senza pubblicita'. pubblicita.js non viene chiesto al
    //        server (puo' anche non esserci), le colonne ai lati del gioco e il
    //        riquadro di fine partita restano a questo file.
    // true:  sulle pagine di gioco si carica pubblicita.js, che si registra
    //        come fornitore degli spazi (vedi "Layout dei giochi", piu' sotto).
    // Vale per le pagine convertite, quelle senza il tag di game-layout.js: le
    // altre fanno ancora da se', con la pubblicita' che game-layout.js porta
    // dentro.
    var PUBBLICITA = false;

    // ── L'INTERRUTTORE DELLE PROMOZIONI ───────────────────────────────────
    // Conta solo a pubblicita' spenta.
    // true:  le colonne e il riquadro di fine partita li riempie
    //        promozioni.js con i messaggi del sito.
    // false: promozioni.js non viene chiesto al server e quegli spazi
    //        restano vuoti; il gioco sta al centro come sempre.
    var PROMOZIONI = true;

    // ── L'INTERRUTTORE DEL RIQUADRO DI FINE PARTITA ───────────────────────
    // Conta solo a pubblicita' spenta: a pubblicita' accesa decide
    // ENABLE_BANNER_ON_FINISH di pubblicita.js.
    // true:  a fine partita, sopra la finestra dei risultati, compare il
    //        riquadro col messaggio di promozioni.js.
    // false: niente riquadro; le colonne ai lati restano come sono.
    // I giochi lo leggono come window.ENABLE_BANNER_ON_FINISH (klondike ci
    // dispone la finestra dei record), e sitoSpazi.finePartita lo rispetta
    // anche per i giochi che non lo guardano.
    var FINE_PARTITA = true;

    // A pubblicita' spenta gli stessi spazi (colonne, fine partita) li riempie
    // promozioni.js con i messaggi del sito: vedi "Quel che resta di casa".
    // Questo secondo interruttore riguarda solo l'interstitial, la schermata a
    // tutta pagina prima della partita, qui col messaggio del sito al posto
    // dell'annuncio: il meccanismo c'e', spento.
    var INTERSTITIAL = false;
    var INTERSTITIAL_MINUTI_SESSIONE = 10;    // minuti sul sito prima della prima volta
    var INTERSTITIAL_MINUTI_INTERVALLO = 30;  // minuti fra una volta e la successiva

    // ── Lingua della pagina ───────────────────────────────────────────────
    // L'attributo lang sta sulla riga 2 del file, quindi qui e' gia' leggibile.
    // Si crea solo se manca: una pagina non ancora convertita tiene la sua riga
    // e qui non si fa niente.
    // Sigle corte in tutto il sito ('it', 'en'): un 'it-IT' metterebbe in
    // currentLang un valore che poi === 'it' non riconosce.
    // Chi cambia lingua a partita in corso (setLanguage) riscrive la variabile
    // dopo: qui si decide solo il valore di partenza.
    if (!window.currentLang) {
        window.currentLang = document.documentElement.lang || 'it';
    }

    // ── La memoria del browser, quando e' bloccata ────────────────────────
    // Chi nel browser ha vietato TUTTI i cookie si vede rifiutare anche
    // localStorage e sessionStorage: basta nominarli e parte un errore. I
    // giochi li leggono alla prima riga, senza rete, e morivano li' senza
    // dire niente. Qui, prima di chiunque altro, al posto di quello bloccato
    // si mette una memoria finta che dura finche' la pagina resta aperta: il
    // gioco parte, ma non ricorda niente da una pagina all'altra (scala40
    // ricarica a ogni mano, e li' perde anche i totali). Un avviso lo dice al
    // giocatore e un evento, storage_blocked, lo conta: vedi piu' sotto.
    // Una memoria PIENA non e' una memoria bloccata: scrivere fallisce anche
    // li', ma dentro c'e' roba buona e non si tocca. La si riconosce perche'
    // non e' vuota.
    // Vale dove questo file sta in testa alla pagina, cioe' sulle pagine
    // convertite: sulle altre game-layout.js arriva prima e muore da se'.
    function memoriaFinta() {
        var dati = {};
        return {
            // Il segno per chi deve sapere che questa memoria non passa le
            // ricariche (la scelta della versione di Scala 40, per esempio).
            finta: true,
            getItem: function (k) { k = String(k); return dati.hasOwnProperty(k) ? dati[k] : null; },
            setItem: function (k, v) { dati[String(k)] = String(v); },
            removeItem: function (k) { delete dati[String(k)]; },
            clear: function () { dati = {}; },
            key: function (i) { var n = 0; for (var k in dati) { if (dati.hasOwnProperty(k)) { if (n === i) return k; n++; } } return null; },
            length: 0
        };
    }
    function memoriaFunziona(nome) {
        var m;
        try {
            m = window[nome];
            if (!m) return false;
            m.setItem('__prova_memoria', '1');
            m.removeItem('__prova_memoria');
            return true;
        } catch (e) {
            try { return !!m && m.length > 0; } catch (e2) { return false; }
        }
    }
    var memoriaBloccata = false;
    var nomiMemoria = ['localStorage', 'sessionStorage'];
    for (var iMem = 0; iMem < nomiMemoria.length; iMem++) {
        if (memoriaFunziona(nomiMemoria[iMem])) continue;
        // Si avvisa per quella che conta: sessionStorage da sola non porta
        // via niente al giocatore.
        if (nomiMemoria[iMem] === 'localStorage') memoriaBloccata = true;
        try {
            Object.defineProperty(window, nomiMemoria[iMem], { configurable: true, value: memoriaFinta() });
        } catch (e) { }
    }

    // ── I testi di questo file, lingua per lingua ─────────────────────────
    // Tutto quello che site.js scrive nella pagina con parole sue sta qui, e
    // nel resto del file non c'e' nessun "se inglese, altrimenti italiano".
    // PER AGGIUNGERE UNA LINGUA: un blocco in piu' qui sotto, con la sigla
    // che le pagine portano in <html lang>, e nient'altro in questo file.
    // "suffisso" e' quello dei nomi dei file (rummy-en.html): serve per i link
    // del pie' di pagina a index, privacy e aboutme, che quindi devono
    // esistere in quella lingua. In "casa" il segno {posta} diventa il link
    // all'indirizzo di posta.
    // Una lingua che qui non c'e' riceve il blocco italiano tutto intero,
    // suffisso compreso: testi italiani che portano a pagine italiane, mai
    // un link a una pagina che non esiste.
    var TESTI = {
        it: {
            suffisso: '',
            chiSono: 'Chi sono / Scrivetemi',
            cookie: 'Gestisci Cookie',
            casa: 'Ho deciso di togliere la pubblicità, ma il sito continua.<br><br>' +
                'Ho fatto una pesante ristrutturazione del sito e si potrebbero presentare delle anomalie: nel caso segnalatemele a ' +
                '{posta}.<br>Grazie per la collaborazione.',
            continua: 'CONTINUA',
            memoria: '<b>Il tuo browser blocca i cookie di questo sito.</b> Puoi giocare, ma punteggi e ' +
                'impostazioni non verranno ricordati. Per salvarli, consenti i cookie per ' +
                'lucianomanenti.com nelle impostazioni del browser.',
            chiudi: 'Chiudi'
        },
        en: {
            suffisso: '-en',
            chiSono: 'About Me / Write to Me',
            cookie: 'Manage Cookies',
            casa: 'I have decided to remove the advertising, but the site goes on.<br><br>' +
                'I have heavily restructured the site and some glitches may show up: if you find one, please report it to ' +
                '{posta}.<br>Thank you for your help.',
            continua: 'CONTINUE',
            memoria: '<b>Your browser is blocking cookies for this site.</b> You can play, but scores and ' +
                'settings will not be remembered. To keep them, allow cookies for ' +
                'lucianomanenti.com in your browser settings.',
            chiudi: 'Close'
        }
    };

    // Si legge a ogni uso e non una volta sola: setLanguage puo' cambiare
    // currentLang a partita in corso.
    function testi() {
        return TESTI[window.currentLang] || TESTI.it;
    }

    // Toglie un elemento dalla pagina. Al posto di el.remove(), che ai browser
    // piu' vecchi manca.
    function togli(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ── Google Analytics ──────────────────────────────────────────────────
    // La guardia su window.gtag fa convivere le due forme: se la pagina ha
    // ancora il suo blocco scritto dentro, qui non si fa niente.
    // gtag() viene definita SEMPRE, perche' il resto del codice la chiama per
    // gli eventi; e' la libreria di Google che non si carica nelle sessioni di
    // prova, cosi' non finiscono nelle statistiche.
    if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        var inProva = false;
        try { inProva = (localStorage.getItem('dev_mode') === '1'); } catch (e) { }

        // Ogni evento lascia una riga in console, cosi' si vede cosa parte e
        // con quali parametri senza aprire Analytics. Sta qui e non in chi
        // manda l'evento: da qui passano tutti, anche quelli che verranno.
        window.gtag = function () {
            window.dataLayer.push(arguments);
            if (arguments[0] === 'event') {
                try {
                    console.log('GA evento' + (inProva ? ' (prova, non inviato)' : '') + ': ' + arguments[1], arguments[2] || {});
                } catch (e) { }
            }
        };

        if (!inProva) {
            var tagGa = document.createElement('script');
            tagGa.async = true;
            tagGa.src = 'https://www.googletagmanager.com/gtag/js?id=G-WRBDRDQ4L8';
            document.head.appendChild(tagGa);
            window.gtag('js', new Date());
            window.gtag('config', 'G-WRBDRDQ4L8');
            // L'identificativo del browser che Analytics ha gia' nel suo cookie
            // viene rimandato come proprieta' dell'utente (browser_id), cosi'
            // viaggia su tutti gli eventi e si puo' leggere anche dai rapporti.
            // Non si scrive niente sul dispositivo: e' lo stesso numero di _ga.
            // Il primissimo page_view di una visita puo' partire senza.
            window.gtag('get', 'G-WRBDRDQ4L8', 'client_id', function (id) {
                if (id) window.gtag('set', 'user_properties', { browser_id: String(id) });
            });
        }
    }

    // ── Gli eventi dei giochi per Analytics ───────────────────────────────
    // Due eventi soli, con lo stesso nome su tutti i giochi e senza prefisso:
    // game_start e game_end. Il gioco e' un parametro, la lingua si legge
    // dall'indirizzo della pagina che Analytics registra da solo. I giochi
    // non chiamano gtag: chiamano sitoPartita, che aggiunge il resto.
    //   sitoPartita.inizio('classico/torneo/100')   quando parte una partita
    //   sitoPartita.fine('won')                     quando finisce: won, lost, draw
    //       Quello che serve in piu' al singolo gioco va in un parametro solo,
    //       dettagli, con coppie chiave=valore unite da ';':
    //       sitoPartita.fine('won', { dettagli: 'errori=2;aiuti=0' })
    //   sitoPartita.riprende('classico/torneo/100') una partita gia' contata
    //       che continua dopo una ricarica: non manda niente, serve solo
    //       perche' la fine sappia di che partita si tratta
    // Tutti e due gli eventi portano mano_torneo: 'mano' per la partita, 'torneo'
    // per il torneo, cioe' una serie di partite fino a un punteggio. Dove ogni
    // mano e' una partita compiuta (il burraco) il gioco chiama, AL POSTO di
    // inizio e fine e non in aggiunta:
    //   sitoPartita.torneo.inizio('2v2/torneo/1005')      alla prima mano
    //   sitoPartita.torneo.fine('won', '2v2/torneo/1005') alla mano che lo chiude
    // inizio e torneo.inizio prendono un secondo argomento facoltativo, le
    // opzioni di gioco accese (regole di casa e simili), che finisce nel
    // parametro opzioni di game_start: parole brevi unite da '+', sempre nello
    // stesso ordine, 'nessuna' se non ce n'e'. Chi non ha opzioni non lo passa
    // e il parametro non parte. Esempio: 'jolly+unacarta+asso' (scala40).
    // Un evento solo: che con il torneo cominci o finisca anche una mano e'
    // sottinteso. Quindi le mani sono gli eventi 'mano' PIU' quelli 'torneo'.
    // La fine del torneo vale anche a mano gia' chiusa (lo si lascia dalla
    // schermata dei punti), percio' la variante la ripete il gioco; non porta
    // seconds, che sarebbero quelli dell'ultima mano e non del torneo.
    // L'elenco degli eventi e dei parametri sta in doc/ga4-events-reference.html.

    // "rummy" per rummy.html e rummy-en.html, "musica/accordi" per
    // musica/accordi/index.html.
    function nomeGioco() {
        var p = location.pathname.replace(/^\/+/, '').replace(/\.html?$/, '').replace(/-[a-z]{2}$/, '');
        p = p.replace(/\/?index$/, '').replace(/\/$/, '');
        return p || 'index';
    }

    // La larghezza di ognuna delle due colonne ai lati del gioco, a fasce:
    // quello che avanza della finestra, diviso due. Si calcola e non si misura
    // la colonna, cosi' vale anche dove le colonne non ci sono. Le soglie sono
    // le larghezze dei riquadri classici, 160 e 300.
    function fasciaColonne() {
        // Pagina che le colonne non le prevede (machiavelli: campo largo 1600,
        // niente .main-container): il conto qui sotto, fatto sul gioco da
        // 1024x750, darebbe un numero a caso. '0' = non utilizzabile.
        var contenitore = document.querySelector('.main-container');
        var campo = document.getElementById('campogioco');
        if (!contenitore || !campo || !contenitore.contains(campo)) return '0';
        var l =document.documentElement.clientWidth || window.innerWidth;
        var a = document.documentElement.clientHeight || window.innerHeight;
        var px = Math.round((l - GIOCO_L * Math.min(l / GIOCO_L, a / GIOCO_A)) / 2);
        return px < 1 ? '0' : (px < 160 ? '1-159' : (px < 300 ? '160-299' : '300+'));
    }

    // La durata conta solo il tempo con la scheda in vista: una partita
    // lasciata li' la sera e finita la mattina non deve durare dodici ore.
    // Niente contatore delle partite (games_in_session, tolto il 17/11/2026):
    // i giochi ricominciano ricaricando la pagina, e valeva quasi sempre 1.
    var partita = null;         // { variante, visto, da } oppure niente
    document.addEventListener('visibilitychange', function () {
        if (!partita) return;
        if (document.hidden) {
            if (partita.da) { partita.visto += Date.now() - partita.da; partita.da = 0; }
        } else if (!partita.da) {
            partita.da = Date.now();
        }
    });

    function apriPartita(variante, cronometro) {
        partita = { variante: String(variante || ''), visto: 0, da: document.hidden ? 0 : Date.now(), cronometro: cronometro };
    }

    function mandaInizio(manoTorneo, opzioni) {
        var dati = { game: nomeGioco(), variant: partita.variante, mano_torneo: manoTorneo, side_width: fasciaColonne() };
        if (opzioni !== undefined && opzioni !== null) dati.opzioni = String(opzioni);
        window.gtag('event', 'game_start', dati);
    }

    window.sitoPartita = {
        inizio: function (variante, opzioni) {
            apriPartita(variante, true);
            mandaInizio('mano', opzioni);
        },
        riprende: function (variante) {
            // Senza cronometro: quanto era durata prima della ricarica non si sa.
            apriPartita(variante, false);
        },
        fine: function (esito, altri) {
            // Una fine senza inizio non si conta: sarebbe una partita doppia.
            if (!partita) return;
            var dati = { game: nomeGioco(), variant: partita.variante, mano_torneo: 'mano', result: esito };
            if (partita.cronometro) {
                var visto = partita.visto + (partita.da ? Date.now() - partita.da : 0);
                dati.seconds = Math.round(visto / 1000);
            }
            for (var k in altri) { if (altri.hasOwnProperty(k)) dati[k] = altri[k]; }
            partita = null;
            window.gtag('event', 'game_end', dati);
        },
        torneo: {
            inizio: function (variante, opzioni) {
                apriPartita(variante, true);
                mandaInizio('torneo', opzioni);
            },
            fine: function (esito, variante) {
                var dati = { game: nomeGioco(), variant: String(variante || ''), mano_torneo: 'torneo', result: esito };
                // Se c'era una mano aperta finisce qui anche lei.
                partita = null;
                window.gtag('event', 'game_end', dati);
            }
        }
    };

    // Gli errori di JavaScript: l'unico modo di sapere che a qualcuno un
    // gioco si e' rotto. Solo i file del sito (un'estensione del browser che
    // sbaglia non ci riguarda) e al massimo due per pagina: un errore dentro
    // un ciclo ne produrrebbe migliaia.
    var erroriMandati = 0;
    function mandaErrore(messaggio, file, riga) {
        if (erroriMandati >= 2) return;
        erroriMandati++;
        window.gtag('event', 'js_error', {
            game: nomeGioco(),
            message: String(messaggio || '').substring(0, 100),
            file: String(file || '').split('/').pop().split('?')[0],
            line: riga || 0,
            non_interaction: true
        });
    }
    window.addEventListener('error', function (e) {
        // Senza nome di file e' un errore di un'altra origine, o di una
        // risorsa che non si e' caricata: niente da leggere.
        if (!e || !e.filename || e.filename.indexOf(location.origin) !== 0) return;
        mandaErrore(e.message, e.filename, e.lineno);
    });
    window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        // Solo gli errori veri: una promessa rifiutata con un testo qualsiasi
        // (l'audio che non parte senza un gesto, per dire) non e' un guasto.
        if (!(r instanceof Error)) return;
        // Il primo file del sito nella traccia; se non ce n'e' non e' roba nostra.
        var qui = location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var dove = new RegExp(qui + '/([^\\s:?)]+)[^:\\s]*:(\\d+)').exec(r.stack || '');
        if (!dove) return;
        mandaErrore(r.message, dove[1], parseInt(dove[2], 10));
    });

    // ── L'avviso della memoria bloccata ───────────────────────────────────
    // Vedi "La memoria del browser", in cima. Una volta per pagina: non c'e'
    // dove ricordare che il giocatore l'ha gia' chiuso. Non copre il gioco e
    // se ne va con un clic.
    function avvisoMemoria() {
        if (document.getElementById('avviso-memoria') || !document.body) return;
        var avviso = document.createElement('div');
        avviso.id = 'avviso-memoria';
        avviso.setAttribute('role', 'alert');
        avviso.style.cssText = 'position:fixed;left:50%;bottom:12px;z-index:100000;width:560px;max-width:92%;' +
            'margin:0;-webkit-transform:translateX(-50%);-ms-transform:translateX(-50%);transform:translateX(-50%);' +
            '-webkit-box-sizing:border-box;box-sizing:border-box;padding:12px 14px;background:#fff8dc;color:#222;' +
            'border:2px solid #c9a227;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.45);' +
            'font:15px/1.4 Arial,Helvetica,sans-serif;text-align:left;';
        var testo = document.createElement('div');
        testo.innerHTML = testi().memoria;
        var chiudi = document.createElement('button');
        chiudi.type = 'button';
        chiudi.appendChild(document.createTextNode(testi().chiudi));
        chiudi.style.cssText = 'display:block;margin:10px 0 0 auto;padding:6px 16px;font:bold 14px Arial,Helvetica,sans-serif;' +
            'color:#222;background:#f0d060;border:1px solid #a08020;border-radius:5px;cursor:pointer;';
        chiudi.onclick = function () {
            if (avviso.parentNode) avviso.parentNode.removeChild(avviso);
        };
        avviso.appendChild(testo);
        avviso.appendChild(chiudi);
        document.body.appendChild(avviso);
    }
    if (memoriaBloccata) {
        window.gtag('event', 'storage_blocked', { game: nomeGioco(), non_interaction: true });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', avvisoMemoria);
        } else {
            avvisoMemoria();
        }
    }

    // ── Icone del sito ────────────────────────────────────────────────────
    // Indirizzo assoluto, cosi' vale a qualunque profondita': otto pagine
    // stanno in musica/{argomento}/ e scrivevano il prefisso relativo.
    // Ogni riga si crea solo se manca: le pagine non ancora convertite hanno le
    // loro e qui non si fa niente, senza doppioni.
    // Il manifest NON sta qui: e' la riga che rende il sito installabile e
    // resta scritta nelle pagine finche' il punto P11 e' aperto.
    var icone = [
        { sel: 'link[rel="icon"][type="image/png"]', attr: { rel: 'icon', type: 'image/png', href: '/favicon/favicon-96x96.png', sizes: '96x96' } },
        { sel: 'link[rel="icon"][type="image/svg+xml"]', attr: { rel: 'icon', type: 'image/svg+xml', href: '/favicon/favicon.svg' } },
        { sel: 'link[rel="shortcut icon"]', attr: { rel: 'shortcut icon', href: '/favicon/favicon.ico' } },
        { sel: 'link[rel="apple-touch-icon"]', attr: { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-touch-icon.png' } }
    ];
    for (var ic = 0; ic < icone.length; ic++) {
        if (document.querySelector(icone[ic].sel)) continue;
        var tagIcona = document.createElement('link');
        for (var attrIcona in icone[ic].attr) {
            tagIcona.setAttribute(attrIcona, icone[ic].attr[attrIcona]);
        }
        document.head.appendChild(tagIcona);
    }

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
            .then(function (buf) {
                // La forma con le due funzioni va anche sui Safari fino al 14,
                // dove decodeAudioData non restituisce una promessa.
                return new Promise(function (ok, ko) {
                    var p = ctx.decodeAudioData(buf, ok, ko);
                    if (p && typeof p.then === 'function') p.then(null, function () { });
                });
            })
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
        if (window.audioMuted) return window.Promise ? Promise.resolve() : undefined;

        var src = this.src || this.currentSrc;
        var self = this;

        // Senza fetch o Promise (Safari fino al 10) la via veloce si
        // romperebbe dentro play() e fermerebbe il gioco: si suona alla
        // vecchia. Il try copre gli errori immediati, il catch quelli dopo.
        if (src && (window.AudioContext || window.webkitAudioContext) &&
            typeof window.fetch === 'function' && typeof window.Promise === 'function') {
            try {
                return playBuffer(src, self.volume, self).catch(function () {
                    return _origPlay.call(self);
                });
            } catch (e) {
                return _origPlay.call(self);
            }
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
    // Lo replace() vale solo dove serve, e sono due casi:
    //   - pagine di gioco (window.gameConfig): e' il caso per cui il fix e'
    //     nato, una partita accumula decine di voci in cronologia;
    //   - cronologia lunga 1, cioe' scheda appena aperta: non c'e' niente da
    //     sostituire, quindi replace() si comporta come un clic normale.
    // Sulle pagine di testo con cronologia piu' lunga NO: chi arriva da Google
    // sulle regole e clicca un link del pie' di pagina si vedrebbe cancellare la
    // pagina dalla cronologia, e il tasto indietro lo butterebbe fuori dal sito.
    // Attenzione: la condizione va letta QUI DENTRO, a ogni clic, non fuori dal
    // listener. Su una pagina di gioco site.js e' bloccante e gira PRIMA dello
    // script che assegna window.gameConfig: al momento della registrazione
    // gameConfig non esiste ancora, al momento del clic si'.
    document.addEventListener('click', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        // Un link che ha il suo onclick decide da se' dove andare: sono i due
        // pulsanti di uscita delle pagine di regole, che portano nell'href
        // l'indirizzo del gioco (per Google e per il clic centrale) ma al clic
        // chiamano goBack(). Questo ascoltatore gira PRIMA dell'onclick: senza
        // la guardia, in una scheda appena aperta farebbe replace() verso il
        // gioco mentre goBack() prova a chiuderla.
        if (!el || el.target === '_blank' || el.hasAttribute('onclick')) return;
        var href = el.getAttribute('href');
        if (!href || href.indexOf('javascript:') === 0 || href.charAt(0) === '#') return;
        try {
            var url = new URL(href, window.location.href);
            if (url.hostname !== window.location.hostname) return;
            if (window.gameConfig || window.history.length <= 1) {
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

    // ── Pie' di pagina comune: le voci di <div class="nav-links"> ─────────
    // Si riempie SOLO un blocco che porta l'attributo data-comune: una pagina
    // non ancora convertita ha le sue voci scritte dentro, non ha l'attributo e
    // qui non si tocca. Cosi' non si fanno doppioni e non conta l'ordine con cui
    // le cose salgono sul server.
    // Le voci si AGGIUNGONO in coda a quello che il blocco ha gia' dentro: serve
    // alle otto pagine in musica/{argomento}/, che tengono scritta la loro voce
    // di ritorno alla sezione e poi ricevono le quattro comuni.
    // Indirizzi assoluti, come per le icone: valgono a qualunque profondita'.
    function riempiNavLinks() {
        var tx = testi();
        var suff = tx.suffisso;
        var voci = [
            { href: '/index' + suff + '.html', testo: 'Home' },
            { href: '/privacy' + suff + '.html', testo: 'Privacy' },
            { href: '/aboutme' + suff + '.html', testo: tx.chiSono }
        ];
        // "Gestisci Cookie" apre il gestore del consenso di Google, che arriva
        // insieme alla libreria degli annunci: a pubblicita' spenta non c'e', e
        // il link non porterebbe a niente.
        if (PUBBLICITA) {
            voci.splice(2, 0, { href: 'javascript:googlefc.callbackQueue.push(googlefc.showRevocationMessage)', testo: tx.cookie });
        }
        var blocchi = document.querySelectorAll('div.nav-links[data-comune]');
        for (var b = 0; b < blocchi.length; b++) {
            var blocco = blocchi[b];
            if (blocco.getAttribute('data-comune-fatto')) continue;
            blocco.setAttribute('data-comune-fatto', '1');
            // Il separatore va prima di ogni voce, tranne la prima di un blocco
            // che era vuoto. Si guarda il testo e non i nodi figli, perche' un
            // blocco scritto su due righe ha dentro uno spazio.
            var primo = blocco.textContent.trim().length === 0;
            for (var v = 0; v < voci.length; v++) {
                if (!primo) blocco.appendChild(document.createTextNode(' | '));
                primo = false;
                var a = document.createElement('a');
                a.setAttribute('href', voci[v].href);
                a.textContent = voci[v].testo;
                blocco.appendChild(a);
            }
        }
    }

    // ── Layout dei giochi ─────────────────────────────────────────────────
    // Scala il campo di gioco (fisso 1024x750) dentro la finestra e gestisce
    // le due colonne ai lati. Viene da game-layout.js, di cui era il solo pezzo
    // che non fosse pubblicita'.
    //
    // Cosa mettere nelle colonne e negli altri spazi NON si decide qui: lo dice
    // un "fornitore", che si registra con sitoSpazi.registra(). Senza fornitore
    // le colonne restano vuote e gli altri agganci non fanno niente. Il
    // fornitore puo' definire, tutte facoltative:
    //   geometria(avanzo, altezza) -> 'dual' | 'single-left' | 'none'
    //   colonne({sinistra, destra, modo, larghezzaSinistra, larghezzaDestra,
    //            altezza, scala})      chiamata a ogni ricalcolo del layout
    //   finePartita(formId, opzioni)   il riquadro di fine partita
    //   rotante(contenitore, opzioni)  il riquadro a rotazione
    //   interstitial(callback)                prima dell'avvio del gioco
    //   ricarica()                     al posto di location.reload()
    //
    // I nomi globali che i giochi chiamano restano quelli di game-layout.js:
    // gameScale (8 file, e scala40 ci divide senza rete), adjustLayout (11),
    // registerLayoutResizeListener (5), waitForInterstitial (22),
    // reloadWithInterstitial (2), ENABLE_BANNER_ON_FINISH (6),
    // setupAmazonFinishBanner (26), setupRotatingAffiliateBanner (7).
    // woowoo.js usa l'esistenza di waitForInterstitial per capire se gira
    // dentro il sito: deve esserci.
    //
    // Convivenza con le pagine non ancora convertite, che caricano ancora
    // game-layout.js: li' questo layout non deve partire. Non si puo' guardare
    // se adjustLayout esiste gia', perche' su 42 pagine site.js sta PRIMA di
    // game-layout.js a fine corpo, e in quel momento il suo tag non e' ancora
    // nemmeno nel DOM. Si guarda il tag a documento letto. Su 5 pagine l'ordine
    // e' l'opposto: per quelle ogni nome globale si definisce solo se manca.
    var GIOCO_L = 1024;
    var GIOCO_A = 750;
    var fornitore = null;

    var vecchioVisto = false;
    var vecchioEscluso = false;
    function cePureIlVecchioLayout() {
        if (vecchioVisto) return true;
        if (vecchioEscluso) return false;
        if (document.querySelector('script[src*="game-layout.js"]')) {
            vecchioVisto = true;
            return true;
        }
        // Il "no" vale per sempre solo a documento letto: prima, il tag puo'
        // stare piu' sotto.
        if (document.readyState !== 'loading') vecchioEscluso = true;
        return false;
    }

    function creaColonna(id, contenitore, prima) {
        var col = document.getElementById(id);
        if (!col) {
            col = document.createElement('div');
            col.id = id;
            col.className = 'sidebar';
            contenitore.insertBefore(col, prima);
        }
        return col;
    }

    // ── Quel che resta di casa ────────────────────────────────────────────
    // A pubblicita' spenta gli spazi li riempie promozioni.js, che si
    // registra come fornitore al pari di pubblicita.js. Qui resta quello che
    // serve anche senza di lui: la geometria (gioco al centro), il posto del
    // riquadro di fine partita e l'interstitial di casa, che promozioni.js
    // non gestisce.
    // La classe dei riquadri e' "spazio-sito" e non qualcosa con "ad" o
    // "banner" nel nome: i blocchi della pubblicita' nascondono gli elementi
    // a seconda del nome.
    var POSTA = '<a href="mailto:postmaster@lucianomanenti.com" style="color:#ffd700;">postmaster@lucianomanenti.com</a>';

    function testoDiCasa() {
        return testi().casa.replace('{posta}', POSTA);
    }

    function riquadroDiCasa(largh, alt) {
        var r = document.createElement('div');
        r.className = 'spazio-sito';
        r.style.cssText = 'box-sizing:border-box;width:' + largh + 'px;' + (alt ? 'height:' + alt + 'px;' : 'min-height:250px;') +
            'display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;' +
            'border:2px dashed rgba(255,255,255,0.55);border-radius:8px;background:rgba(0,0,0,0.35);' +
            'color:#fff;font:15px/1.5 Arial,Helvetica,sans-serif;overflow-wrap:anywhere;';
        r.innerHTML = '<span>' + testoDiCasa() + '</span>';
        return r;
    }

    function ePassato(deposito, chiave, minuti) {
        var quando = 0;
        try { quando = parseInt(deposito.getItem(chiave), 10) || 0; } catch (e) { }
        return Date.now() - quando >= minuti * 60000;
    }

    // Il posto del riquadro di fine partita: mette la finestra dove il gioco
    // la vuole e restituisce le misure del riquadro che le sta sopra. Ogni
    // gioco passa le sue nelle opzioni, e i valori di ripiego sono quelli di
    // pubblicita.js. Chi riempie il riquadro (promozioni.js) parte da qui.
    function postoFinePartita(formId, opzioni) {
        var modale = document.getElementById(formId);
        if (!modale) return null;
        opzioni = opzioni || {};
        var stile = opzioni.modalStyle || { overflow: 'visible' };
        for (var prop in stile) {
            if (stile.hasOwnProperty(prop)) modale.style[prop] = stile[prop];
        }
        var sopra = opzioni.targetTop;
        if (sopra === undefined) {
            var giocatore = document.getElementById('giocatore');
            var campo = document.getElementById('campogioco');
            var base = giocatore ? giocatore.offsetTop : (campo ? (campo.offsetHeight || GIOCO_A) : GIOCO_A);
            sopra = base - (modale.offsetHeight || 280) - 5;
        }
        if (opzioni.applyModalTop !== false) modale.style.top = sopra + 'px';
        var vecchio = modale.querySelector('.spazio-sito');
        togli(vecchio);
        if (typeof opzioni.onSetupButtons === 'function') opzioni.onSetupButtons(modale);
        return {
            modale: modale,
            larghezza: opzioni.bannerWidth !== undefined ? opzioni.bannerWidth : 700,
            altezza: opzioni.bannerHeight !== undefined ? opzioni.bannerHeight : Math.max(sopra - 15, 150),
            su: opzioni.bannerTopOffset !== undefined ? opzioni.bannerTopOffset : (sopra - 5),
            sinistra: opzioni.leftOffset !== undefined ? opzioni.leftOffset : -200
        };
    }

    var diCasa = {
        // Il gioco resta sempre al centro, con due colonne uguali: spostarlo
        // di lato per fare posto a una colonna sola aveva senso per un
        // annuncio, non per un messaggio nostro.
        geometria: function (avanzo) {
            return avanzo >= 2 ? 'dual' : 'none';
        },
        // Senza promozioni.js (file mancante, o non ancora arrivato) a fine
        // partita la finestra va comunque messa al suo posto e i suoi
        // pulsanti preparati: il riquadro sopra resta vuoto.
        finePartita: function (formId, opzioni) {
            postoFinePartita(formId, opzioni);
        },
        // L'interstitial, la schermata prima della partita. Spenta (INTERSTITIAL), il gioco parte
        // subito.
        interstitial: function (callback) {
            var via = function () { if (typeof callback === 'function') callback(); };
            if (!INTERSTITIAL || !document.body) { via(); return; }
            try {
                // L'inizio della visita sta in sessionStorage: dura quanto la
                // scheda e passa le ricariche, che e' come i giochi ricominciano.
                if (!sessionStorage.getItem('sito_interstitial_inizio')) {
                    sessionStorage.setItem('sito_interstitial_inizio', String(Date.now()));
                }
            } catch (e) { via(); return; }
            if (!ePassato(sessionStorage, 'sito_interstitial_inizio', INTERSTITIAL_MINUTI_SESSIONE) ||
                !ePassato(localStorage, 'sito_interstitial_vista', INTERSTITIAL_MINUTI_INTERVALLO)) { via(); return; }
            try { localStorage.setItem('sito_interstitial_vista', String(Date.now())); } catch (e) { }

            var velo = document.createElement('div');
            velo.className = 'spazio-sito-interstitial';
            velo.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:100000;' +
                'background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;';
            var r = riquadroDiCasa(Math.min((document.documentElement.clientWidth || 600) - 40, 700), 250);
            r.style.fontSize = '20px';
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = testi().continua;
            b.style.cssText = 'margin-top:30px;padding:14px 50px;font:bold 22px Arial,Helvetica,sans-serif;' +
                'color:#fff;background:#c33;border:0;border-radius:8px;cursor:pointer;';
            b.onclick = function () { togli(velo); via(); };
            velo.appendChild(r);
            velo.appendChild(b);
            document.body.appendChild(velo);
        }
    };

    // Chi riempie gli spazi adesso. Finche' si aspetta pubblicita.js nessuno:
    // il messaggio di casa non deve lampeggiare prima degli annunci.
    function chiRiempie() {
        if (fornitore) return fornitore;
        return fornitoreAtteso ? null : diCasa;
    }

    function layout() {
        if (cePureIlVecchioLayout()) return;
        // Il segnale e' lo stesso di game-layout.js: .main-container con dentro
        // #campogioco. Non basta #campogioco, che hanno anche index e
        // machiavelli; e serve gameConfig, che index non ha.
        if (!window.gameConfig) return;
        var contenitore = document.querySelector('.main-container');
        var campo = document.getElementById('campogioco');
        if (!contenitore || !campo || !contenitore.contains(campo)) return;

        var sinistra = creaColonna('sidebar-left', contenitore, contenitore.firstChild);
        var destra = creaColonna('sidebar-right', contenitore, sinistra.nextSibling);

        // clientWidth/Height e non innerWidth: su schermi ad alta densita' con
        // zoom (Surface) innerWidth da' valori incoerenti.
        var largh = document.documentElement.clientWidth || window.innerWidth;
        var alt = document.documentElement.clientHeight || window.innerHeight;
        var scala = Math.min(largh / GIOCO_L, alt / GIOCO_A);
        window.gameScale = scala;

        var avanzo = largh - GIOCO_L * scala;
        // In attesa di pubblicita.js (un istante, al caricamento) il gioco sta
        // al centro come a pubblicita' spenta.
        var chi = chiRiempie();
        var geo = (chi && typeof chi.geometria === 'function') ? chi : diCasa;
        var modo = geo.geometria(avanzo, alt) || 'none';

        // Il campo scala dal suo centro: si mette il riquadro non scalato col
        // centro dove deve cadere il centro del gioco.
        var cx = (modo === 'single-left') ? largh - (GIOCO_L * scala) / 2 : largh / 2;
        campo.style.top = Math.round(alt / 2 - GIOCO_A / 2) + 'px';
        campo.style.left = Math.round(cx - GIOCO_L / 2) + 'px';
        campo.style.marginTop = '0px';
        campo.style.marginLeft = '0px';
        campo.style.transform = 'scale(' + scala + ')';
        campo.style.msTransform = 'scale(' + scala + ')';
        campo.style.webkitTransform = 'scale(' + scala + ')';

        var ascoltatori = window._layoutResizeListeners || [];
        if (ascoltatori.length) {
            var rect = campo.getBoundingClientRect();
            for (var i = 0; i < ascoltatori.length; i++) {
                ascoltatori[i](rect.left, rect.top, scala);
            }
        }

        var larghSx = 0, larghDx = 0;
        if (modo === 'dual') { larghSx = avanzo / 2; larghDx = avanzo / 2; }
        else if (modo === 'single-left') { larghSx = avanzo; }
        sinistra.style.width = larghSx + 'px';
        sinistra.style.display = larghSx > 0 ? 'flex' : 'none';
        destra.style.width = larghDx + 'px';
        destra.style.display = larghDx > 0 ? 'flex' : 'none';

        if (chi && typeof chi.colonne === 'function') {
            chi.colonne({
                sinistra: sinistra, destra: destra, modo: modo,
                larghezzaSinistra: larghSx, larghezzaDestra: larghDx,
                altezza: alt, scala: scala
            });
        }

        // Il segnalino delle sessioni di prova: in dev_mode Analytics non
        // parte, e conviene vederlo.
        var inDev = false;
        try { inDev = (localStorage.getItem('dev_mode') === '1'); } catch (e) { }
        var segnalino = document.getElementById('dev-mode-badge-small');
        if (inDev && !segnalino) {
            segnalino = document.createElement('div');
            segnalino.id = 'dev-mode-badge-small';
            segnalino.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;background:#c00;color:#fff;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:4px;opacity:0.6;';
            segnalino.textContent = 'DEV';
            document.body.appendChild(segnalino);
        } else if (!inDev && segnalino) {
            togli(segnalino);
        }
    }

    // Il fornitore si carica da qui e non con un tag nelle pagine, cosi'
    // accendere o spegnere e' una riga sola e le pagine di testo non lo
    // chiedono mai: pubblicita.js a pubblicita' accesa, promozioni.js a
    // pubblicita' spenta, mai tutti e due.
    // Arriva DOPO che la pagina e' stata letta, e i giochi chiamano
    // waitForInterstitial(init) appena letta la pagina. Per pubblicita.js
    // quelle chiamate aspettano in coda finche' non si sa se arriva, perche'
    // l'interstitial e' suo; se il file manca o non si registra, la coda si
    // scioglie e il gioco parte lo stesso. Per promozioni.js non si aspetta
    // niente: il gioco parte subito e le schede compaiono quando arrivano.
    var fornitoreAtteso = PUBBLICITA;
    var inCoda = [];

    function sciogliCoda() {
        fornitoreAtteso = false;
        var coda = inCoda;
        inCoda = [];
        for (var i = 0; i < coda.length; i++) window.waitForInterstitial(coda[i]);
        // Se pubblicita.js non e' arrivato, gli spazi tornano al sito.
        if (!fornitore && document.body) layout();
    }

    function chiediFornitore() {
        if (fornitore || !window.gameConfig || cePureIlVecchioLayout()) { sciogliCoda(); return; }
        // Ne' pubblicita' ne' promozioni: non si chiede niente, resta la casa.
        if (!PUBBLICITA && !PROMOZIONI) { sciogliCoda(); return; }
        // Pagina che gli spazi non li vuole (gameConfig.spazi === false): le
        // pagine indice come musica/, dove un messaggio ai lati confonde e
        // basta. Niente pubblicita' ne' promozioni, le colonne restano vuote.
        if (window.gameConfig.spazi === false) { sciogliCoda(); return; }
        var s = document.createElement('script');
        s.src = PUBBLICITA ? '/pubblicita.js' : '/promozioni.js';
        if (PUBBLICITA) {
            s.onload = sciogliCoda;
            s.onerror = sciogliCoda;
        }
        document.head.appendChild(s);
    }

    window.sitoSpazi = {
        registra: function (f) {
            fornitore = f || null;
            // Via quel che ci avesse gia' messo il sito.
            var casa = document.querySelectorAll('.spazio-sito');
            for (var i = 0; i < casa.length; i++) togli(casa[i]);
            sciogliCoda();
            if (document.body) layout();
        },
        finePartita: function (formId, opzioni) {
            if (!PUBBLICITA && !FINE_PARTITA) return;
            var chi = chiRiempie();
            if (chi && typeof chi.finePartita === 'function') {
                return chi.finePartita(formId, opzioni);
            }
        },
        // Per chi riempie il riquadro di fine partita: vedi postoFinePartita.
        postoFinePartita: postoFinePartita,
        rotante: function (contenitore, opzioni) {
            if (fornitore && typeof fornitore.rotante === 'function') {
                return fornitore.rotante(contenitore, opzioni);
            }
        }
    };

    window._layoutResizeListeners = window._layoutResizeListeners || [];
    if (typeof window.registerLayoutResizeListener !== 'function') {
        window.registerLayoutResizeListener = function (callback) {
            if (typeof callback !== 'function') return;
            window._layoutResizeListeners.push(callback);
            // Se il layout e' gia' pronto, chi si registra lo sa subito.
            var campo = document.getElementById('campogioco');
            if (campo && window.gameScale !== undefined) {
                var rect = campo.getBoundingClientRect();
                callback(rect.left, rect.top, window.gameScale);
            }
        };
    }
    if (typeof window.adjustLayout !== 'function') {
        window.adjustLayout = layout;
    }
    if (typeof window.waitForInterstitial !== 'function') {
        window.waitForInterstitial = function (callback) {
            if (fornitoreAtteso && !fornitore) { inCoda.push(callback); return; }
            // promozioni.js non ha un suo interstitial: resta quello di casa.
            var chi = chiRiempie();
            if (!chi || typeof chi.interstitial !== 'function') chi = diCasa;
            return chi.interstitial(callback);
        };
    }
    if (typeof window.reloadWithInterstitial !== 'function') {
        window.reloadWithInterstitial = function () {
            if (fornitore && typeof fornitore.ricarica === 'function') return fornitore.ricarica();
            location.reload();
        };
    }
    if (window.ENABLE_BANNER_ON_FINISH === undefined) {
        window.ENABLE_BANNER_ON_FINISH = PUBBLICITA ? true : FINE_PARTITA;
    }
    if (typeof window.setupAmazonFinishBanner !== 'function') {
        window.setupAmazonFinishBanner = window.sitoSpazi.finePartita;
    }
    if (typeof window.setupRotatingAffiliateBanner !== 'function') {
        window.setupRotatingAffiliateBanner = window.sitoSpazi.rotante;
    }

    // Il link "Gestisci Cookie" scritto a mano nelle pagine di gioco. Apre il
    // gestore del consenso di Google, che arriva con la libreria degli annunci:
    // a pubblicita' spenta non c'e', e il link darebbe un errore in console e
    // niente a video. Si toglie invece di nasconderlo, cosi' il gioco che ne
    // traduce l'etichetta per id non lo trova e passa oltre (lo fanno tutti con
    // la guardia "if (el)").
    // Solo sulle pagine convertite: le altre hanno ancora la pubblicita' di
    // game-layout.js, e le due index il loro tag scritto dentro.
    function togliGestisciCookie() {
        if (PUBBLICITA || !window.gameConfig || cePureIlVecchioLayout()) return;
        var link = document.querySelectorAll('a[href*="showRevocationMessage"]');
        for (var i = 0; i < link.length; i++) togli(link[i]);
    }

    // Le pagine che non sono un gioco ma vogliono la libreria AdSense (la home,
    // <body data-pubblicita="libreria">): a pubblicita' accesa si chiede
    // pubblicita.js, che li' carica la sola libreria e si ferma. Cosi' i codici
    // del conto restano in un posto solo, il blocco CONTO di pubblicita.js, e
    // nessuna pagina porta il tag scritto dentro.
    function chiediLibreriaAnnunci() {
        if (!PUBBLICITA || window.gameConfig || !document.body) return;
        if (document.body.getAttribute('data-pubblicita') !== 'libreria') return;
        var s = document.createElement('script');
        s.src = '/pubblicita.js';
        document.head.appendChild(s);
    }

    function alDocumentoLetto() {
        layout();
        chiediFornitore();
        chiediLibreriaAnnunci();
        togliGestisciCookie();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', alDocumentoLetto);
    } else {
        alDocumentoLetto();
    }
    window.addEventListener('load', layout);
    window.addEventListener('resize', layout);

    // Ctrl+Alt+Q: entra ed esce dalla modalita' di prova (dev_mode), che ferma
    // Analytics e, a pubblicita' accesa, mette annunci finti al posto dei veri.
    // Sulle pagine non convertite lo fa gia' game-layout.js: due ascoltatori
    // sullo stesso tasto la accenderebbero e spegnerebbero nello stesso colpo.
    document.addEventListener('keydown', function (e) {
        if (!e.ctrlKey || !e.altKey) return;
        if (e.code !== 'KeyQ' && String(e.key).toLowerCase() !== 'q') return;
        if (!window.gameConfig || cePureIlVecchioLayout()) return;
        e.preventDefault();
        var inProva = false;
        try {
            inProva = (localStorage.getItem('dev_mode') === '1');
            localStorage.setItem('dev_mode', inProva ? '0' : '1');
        } catch (err) { return; }
        location.reload();
    });

    // Ctrl+Alt+P: il riquadro di controllo dell'interstitial di casa, cioe' i
    // due orologi che decidono se la schermata esce (minuti dall'inizio della
    // visita, minuti dall'ultima volta) e i pulsanti per forzarla senza
    // aspettare. A pubblicita' accesa lo stesso tasto lo ascolta gia'
    // pubblicita.js, col suo riquadro e i suoi orologi; sulle pagine non
    // convertite game-layout.js. Qui si risponde solo quando non c'e' nessuno
    // dei due, altrimenti si aprirebbero due riquadri insieme.
    document.addEventListener('keydown', function (e) {
        if (!e.ctrlKey || !e.altKey) return;
        if (e.code !== 'KeyP' && String(e.key).toLowerCase() !== 'p') return;
        if (PUBBLICITA || !window.gameConfig || cePureIlVecchioLayout()) return;
        e.preventDefault();

        var gia = document.getElementById('sito-interstitial-controllo');
        if (gia) { togli(gia); return; }

        function leggi(deposito, chiave) {
            try { return parseInt(deposito.getItem(chiave), 10) || 0; } catch (err) { return 0; }
        }
        var ora = Date.now();
        var inizio = leggi(sessionStorage, 'sito_interstitial_inizio');
        var vista = leggi(localStorage, 'sito_interstitial_vista');
        var minInizio = inizio ? (ora - inizio) / 60000 : null;
        var minVista = vista ? (ora - vista) / 60000 : null;
        var visitaOk = minInizio !== null && minInizio >= INTERSTITIAL_MINUTI_SESSIONE;
        var intervalloOk = minVista === null || minVista >= INTERSTITIAL_MINUTI_INTERVALLO;
        var pronto = INTERSTITIAL && visitaOk && intervalloOk;

        function riga(nome, valore, ok) {
            var col = ok === true ? '#6f6' : ok === false ? '#f66' : '#ccc';
            return '<tr><td style="padding:2px 12px 2px 0;color:#999;white-space:nowrap">' + nome + '</td>' +
                '<td style="color:' + col + ';font-weight:bold">' + valore + '</td></tr>';
        }
        function pulsante(id, testo, fondo) {
            return '<button type="button" data-fa="' + id + '" style="flex:1;background:' + fondo +
                ';color:#fff;border:none;border-radius:4px;padding:6px;cursor:pointer;font-size:11px">' + testo + '</button>';
        }

        var q = document.createElement('div');
        q.id = 'sito-interstitial-controllo';
        q.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.9);border:1px solid #555;' +
            'border-radius:8px;padding:14px;z-index:9999999;font-family:monospace;font-size:12px;min-width:280px;';
        q.innerHTML = '<div style="color:#e8d870;font-weight:bold;margin-bottom:8px">Interstitial di casa ' +
            '<span style="color:#555;font-size:10px">Ctrl+Alt+P per chiudere</span></div>' +
            '<table style="border-collapse:collapse;width:100%">' +
            riga('INTERSTITIAL', INTERSTITIAL, INTERSTITIAL) +
            riga('inizio visita', inizio ? new Date(inizio).toLocaleTimeString() : 'non segnato', !!inizio) +
            riga('durata visita', minInizio !== null ? minInizio.toFixed(1) + ' min' : '—', visitaOk) +
            riga('minimo richiesto', INTERSTITIAL_MINUTI_SESSIONE + ' min', null) +
            riga('ultima volta', vista ? new Date(vista).toLocaleTimeString() : 'mai', null) +
            riga('tempo trascorso', minVista !== null ? minVista.toFixed(1) + ' min' : '—', intervalloOk) +
            riga('intervallo richiesto', INTERSTITIAL_MINUTI_INTERVALLO + ' min', null) +
            riga('▶ PRONTO?', pronto ? 'SÌ' : 'NO', pronto) +
            '</table><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
            pulsante('ora', 'Forza ora', '#2a6a4a') +
            pulsante('prossima', 'Forza prossima', '#2a6a2a') +
            pulsante('azzera', 'Reset tutto', '#6a2a2a') +
            pulsante('chiudi', '✕', '#333') + '</div>';
        document.body.appendChild(q);

        // "Forza ora" non fa uscire la schermata in quel momento: mette i due
        // orologi a posto, e la schermata esce alla prossima partita. Come nel
        // riquadro di pubblicita.js.
        q.addEventListener('click', function (ev) {
            var b = ev.target.closest ? ev.target.closest('button[data-fa]') : null;
            if (!b) return;
            var fa = b.getAttribute('data-fa');
            try {
                if (fa === 'ora') {
                    sessionStorage.setItem('sito_interstitial_inizio',
                        String(Date.now() - (INTERSTITIAL_MINUTI_SESSIONE + 1) * 60000));
                    localStorage.removeItem('sito_interstitial_vista');
                } else if (fa === 'prossima') {
                    localStorage.removeItem('sito_interstitial_vista');
                } else if (fa === 'azzera') {
                    sessionStorage.removeItem('sito_interstitial_inizio');
                    localStorage.removeItem('sito_interstitial_vista');
                }
            } catch (err) { }
            togli(q);
        });
    });

    // ── Riquadro di consenso ──────────────────────────────────────────────
    // Il gestore del consenso di Google (googlefc) lascia in pagina, dopo che la
    // scelta e' stata fatta, un suo riquadro per tornarci sopra. Qui lo si
    // nasconde perche' si sovrappone al gioco: resta sopra il tavolo, e su
    // schermo piccolo si prende una parte del campo.
    //
    // Non si perde una funzione, si sposta: quello che il riquadro fa --
    // riaprire la scelta sui cookie e revocare il consenso -- lo fa il link
    // "Gestisci Cookie" nel pie' di pagina, che chiama lo stesso comando,
    // googlefc.callbackQueue.push(googlefc.showRevocationMessage). Dove la
    // pagina non lo porta scritto, lo mette riempiNavLinks() qui sotto.
    //
    // Come si riconosce, che non ha ne' identificativo ne' classe: un div figlio
    // diretto di body, senza classe, con uno shadowRoot e uno style scritto
    // dentro di oltre 5000 caratteri.
    // La guardia sul body serve perche' site.js oggi sta a fine corpo, ma
    // dovra' spostarsi nell'<head>, dove document.body non esiste ancora.
    function nascondiRiquadroConsenso() {
        var divs = document.querySelectorAll('body > div');
        for (var i = 0; i < divs.length; i++) {
            if (divs[i].shadowRoot && !divs[i].className && (divs[i].getAttribute('style') || '').length > 5000) {
                divs[i].style.setProperty('display', 'none', 'important');
                return true;
            }
        }
        return false;
    }

    function sorvegliaConsenso() {
        // Un controllo subito: l'observer vede solo le aggiunte che arrivano dopo
        // observe(), e il riquadro puo' essere gia' stato inserito prima che
        // site.js parta (oggi sta a fine corpo).
        if (nascondiRiquadroConsenso()) return;

        var observer = new MutationObserver(function () {
            if (nascondiRiquadroConsenso()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true });
    }

    // Commuta gli elementi condizionati alla pubblicita' (es. in privacy.html):
    // nel markup statico .solo-noad e' visibile e .solo-ad ha l'attributo hidden,
    // cosi' a pubblicita' spenta la pagina e' gia' pronta anche senza JS.
    function applicaVariantePubblicita() {
        var noad = document.querySelectorAll('.solo-noad');
        for (var i = 0; i < noad.length; i++) noad[i].hidden = PUBBLICITA;
        var ad = document.querySelectorAll('.solo-ad');
        for (var j = 0; j < ad.length; j++) ad[j].hidden = !PUBBLICITA;
    }

    // Le cose che hanno bisogno del corpo: nascondere il riquadro di consenso,
    // riempire il pie' di pagina e adeguare gli elementi .solo-noad / .solo-ad.
    function alCorpoPronto() {
        sorvegliaConsenso();
        riempiNavLinks();
        applicaVariantePubblicita();
    }

    if (document.body) {
        alCorpoPronto();
    } else {
        document.addEventListener('DOMContentLoaded', alCorpoPronto);
    }
})();
