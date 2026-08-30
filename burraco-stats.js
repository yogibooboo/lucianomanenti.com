// ============================================================================
// STATISTICHE DI FINE MANO
// ============================================================================
// Vive separato dal motore per due motivi: se qualcosa qui dentro si rompe la
// partita continua lo stesso, e il file si aggiorna senza rimettere in circolo
// burraco-game.js.
//
// COSA PARTE E QUANDO. La riga di una mano contiene punti, chiusura, burrachi,
// pozzetti, mazziere, durata e chi era seduto dove: fatti di una partita a
// carte, che non dicono niente di nessuno. L'IP non viene scritto da nessuna
// parte (vedi stats/burraco.php).
//
// RIACCESA il 29/08/2026, su tutte le mani. Era stata sospesa poche ore prima
// perche' una POST per mano gonfia le pagine viste di SmarterStats; il freno
// c'e' ed e' un numero solo (UNA_MANO_OGNI, piu' sotto), ma sta a 1 per scelta
// - si registra tutto. La domanda a cui serve, adesso, e' quanto vince chi
// gioca.
//
// Gli identificatori sono un'altra cosa. `giocatore_id` e `torneo_id` vivono
// nel localStorage, e leggere o scrivere sul dispositivo di qualcuno e' proprio
// il gesto che ha bisogno di un permesso - a prescindere da quanto siano
// anonimi i dati. Quei due si attaccano SOLO col consenso alle finalita'
// publisher 1 e 10 del CMP, che sono quelle dichiarate nell'informativa; alla
// revoca l'identificatore viene cancellato, sempre come dichiarato.
//
// Vanno via insieme o restano insieme: `torneo_id` lega fra loro le mani dello
// stesso torneo, quindi e' un identificatore anche lui e toglierne uno solo non
// servirebbe a niente.
// ============================================================================

(function () {
    'use strict';

    var ENDPOINT = '/stats/burraco.php';
    var CHIAVE_ID = 'burraco_stat_id';

    // Quanto si aspetta il CMP prima di rinunciare. Il CMP arriva insieme ad
    // adsbygoogle.js, quindi in genere e' piu' lento di questo script.
    var ATTESA_MS = 250;
    var TENTATIVI = 40;      // 10 secondi in tutto

    // ------------------------------------------------------------------
    // Identificatore
    // ------------------------------------------------------------------
    // Caratteri casuali nel formato che il server accetta (^[a-z0-9]{6,20}$).
    // Non deriva da niente del dispositivo: e' un numero estratto a caso,
    // quindi lega fra loro le mani dello stesso browser, non di una persona.

    function _casuale(n) {
        var s = '';
        while (s.length < n) s += Math.random().toString(36).slice(2);
        return s.slice(0, n);
    }

    function _leggiId() {
        try { return localStorage.getItem(CHIAVE_ID); } catch (e) { return null; }
    }

    // Si crea alla prima mano inviata, non all'apertura della pagina: se non
    // giochi non resta niente nel browser.
    function _ottieniId() {
        var id = _leggiId();
        if (id && /^[a-z0-9]{6,20}$/.test(id)) return id;
        id = _casuale(12);
        try { localStorage.setItem(CHIAVE_ID, id); } catch (e) { return null; }
        return id;
    }

    function _cancellaId() {
        try { localStorage.removeItem(CHIAVE_ID); } catch (e) { }
    }

    // ------------------------------------------------------------------
    // Consenso
    // ------------------------------------------------------------------

    var _consenso = null;    // null = il CMP non ha ancora risposto
    var _inAttesa = null;    // mano conclusa prima della risposta

    // L'id dell'ultima mano spedita, tenuto solo per farlo vedere nel pannello
    // Ctrl+Alt+M: serve a chi gioca per dire "la mia mano e' questa" e farsi
    // riconoscere una riga in tabella.
    //
    // Sta in una VARIABILE e non nel localStorage, ed e' voluto. Tutto il
    // ragionamento di questo file (vedi in testa) e' che scrivere sul
    // dispositivo di qualcuno vuole un permesso a prescindere da quanto il dato
    // sia anonimo: mettere qui un identificatore in piu' aprirebbe di nuovo la
    // questione per una comodita' da pannello di servizio. In memoria muore col
    // ricaricamento della pagina, che e' esattamente quel che serve.
    //
    // A differenza di giocatore_id e torneo_id, questo esiste anche senza
    // consenso: mano_id non viene mai tolto dalla riga, nemmeno da quelle nude.
    var _ultimaMano = null;

    // In casa il CMP non c'e'. MISURATO su localhost, non dedotto: adsbygoogle.js
    // si scarica davvero (window.adsbygoogle e googletag ci sono, arriva persino
    // il cookie __eoi), ma __tcfapi resta undefined anche dopo venti secondi e
    // nessun dialogo di consenso compare - Google mostra la CMP solo sui domini
    // registrati in AdSense, e localhost non lo e'.
    //
    // Conseguenza: in casa l'attesa del CMP e' un'attesa di dieci secondi per
    // sentirsi dire che non ha risposto nessuno, e ogni mano finirebbe in tabella
    // senza identificatori. Quindi in casa quella fase SI SALTA e il consenso si
    // da' per dato: e' lo stesso stato in cui arriva online un giocatore che
    // accetta - stessa _applica(true), stessi campi spediti - che e' la strada
    // percorsa dal 70% del traffico vero. A tenerlo fuori da online basta
    // _hostLocale(), che li' e' falsa: non serve nessuna seconda serratura.
    function _hostLocale() {
        var h = location.hostname;
        return h === 'localhost' || h === '127.0.0.1' || h === '::1' ||
               h === '[::1]' || /\.local$/.test(h) || /\.test$/.test(h);
    }

    // Il flag a mano resta, ma ora governa UNA cosa sola: registrare le mani
    // dell'automa, che nel gioco vero sono sempre escluse perche' falserebbero
    // ogni confronto. Quello non e' un caso che capiti online, quindi va chiesto
    // apposta - mentre il consenso in casa e' solo una domanda senza risposta.
    var CHIAVE_PROVA = 'burraco_stats_prova';

    var _prova = (function () {
        if (!_hostLocale()) return false;
        try { return localStorage.getItem(CHIAVE_PROVA) === '1'; } catch (e) { return false; }
    })();

    // ------------------------------------------------------------------
    // Chi raccoglie
    // ------------------------------------------------------------------
    // Fino al 23/08/2026 la raccolta era spenta per tutti tranne chi accendeva
    // questo flag: serviva a mettere in produzione la catena e guardarla
    // scrivere davvero - endpoint, colonne, motori, bracci - senza toccare le
    // partite di chi stava giocando. Collaudo chiuso con le mani 5, 6 e 7 in
    // tabella, una per braccio, motori orientati bene e nessuna riga persa;
    // da qui si raccoglie da chiunque.
    //
    // Il flag e' stato girato tre volte. Il 23/08/2026 da "acceso per chi lo
    // chiede" a "spento per chi si chiama fuori"; il 29/08 al mattino di nuovo a
    // interruttore di inclusione, con la raccolta sospesa per tutti; il 29/08
    // stesso rimesso a ESCLUSIONE, perche' la raccolta e' ripartita.
    //
    // La sospensione non era per privacy ne' per carico: ogni mano faceva una
    // POST a /stats/burraco.php, e SmarterStats su Aruba la conta come una
    // pagina vista. Le statistiche del sito diventavano illeggibili, gonfiate da
    // una riga per mano giocata. Il rimedio non e' spegnere ma CAMPIONARE: vedi
    // UNA_MANO_OGNI qui sotto.
    //
    // Conseguenza voluta e non ovvia: con la raccolta accesa i bracci
    // tornerebbero a girare (vedi `raccolta` piu' sotto). Non e' quel che si
    // vuole adesso - una percentuale di vittorie mescolata su tre bracci non e'
    // la percentuale di niente - quindi l'esperimento si spegne dall'altro capo,
    // con AB_ATTIVO = false in burraco-game.js.
    //
    // Per chiamarsi fuori su un browser: BurracoStats.accendiRaccolta(false),
    // oppure burraco_stats_raccolta = '0' nel localStorage.
    //
    // NON si aggancia a dev_mode, che pure sarebbe stato comodo: dev_mode
    // impedisce il caricamento di adsbygoogle.js, e con lui non arriva il CMP.
    // Si finirebbe a spegnere la raccolta proprio sulle partite in cui il
    // consenso non si puo' nemmeno leggere.
    var CHIAVE_RACCOLTA = 'burraco_stats_raccolta';

    var _raccolta = (function () {
        // Il modo prova e' gia' un'accensione esplicita, e vale solo in casa:
        // chi l'ha acceso vuole vedere scrivere, quindi non gli si chiede una
        // seconda chiave.
        if (_prova) return true;
        // In casa come online si raccoglie da chiunque non si sia chiamato
        // fuori. Se il localStorage non e' leggibile si raccoglie lo stesso:
        // l'assenza di una risposta non e' un rifiuto, e chi rifiuta davvero non
        // ha comunque nessun identificatore in ballo (vedi _spedisci).
        try { return localStorage.getItem(CHIAVE_RACCOLTA) !== '0'; } catch (e) { return true; }
    })();

    // ------------------------------------------------------------------
    // Quante mani si registrano
    // ------------------------------------------------------------------
    // Una mano ogni N, e **oggi N vale 1**: si registra tutto. Questo numero
    // esiste perche' la raccolta e' gia' stata spenta una volta, il 29/08/2026,
    // per un motivo che puo' tornare: ogni riga in tabella e' una POST a
    // /stats/burraco.php, e SmarterStats su Aruba la conta come una pagina
    // vista. Con ~3.500 mani al giorno erano ~3.500 pagine finte al giorno, e le
    // statistiche del sito diventavano illeggibili.
    //
    // Se ricapita, il rimedio e' qui e non e' spegnere: campionare a caso NON
    // sposta la percentuale di vittorie - un campione casuale di mani ha la
    // stessa media dell'insieme, solo con l'errore standard piu' largo di radice
    // di N - quindi mettere 4 divide il disturbo per quattro e lascia ~26.000
    // mani al mese, che su una percentuale valgono tre decimi di punto.
    //
    // Attenzione se un giorno lo si alza: il campione e' per MANO, quindi di
    // ogni persona si vedrebbe una frazione delle partite. La media resta
    // giusta, il conteggio no - e una CLASSIFICA per giocatore si regge sul
    // conteggio. In quel caso o resta a 1, o il campione si sposta sul giocatore
    // invece che sulla mano.
    //
    // Nessun'altra parte del codice conosce questo numero, e il server non se ne
    // accorge.
    var UNA_MANO_OGNI = 1;

    function _campionata() {
        if (UNA_MANO_OGNI <= 1) return true;
        // Il banco vuole tutte le mani: li' si misura, e li' le POST vanno al
        // database di casa senza passare da Aruba.
        if (_prova) return true;
        return Math.random() * UNA_MANO_OGNI < 1;
    }

    function _valuta(tc) {
        var p = (tc && tc.publisher && tc.publisher.consents) || {};
        return !!(p['1'] && p['10']);
    }

    // Vuoto non vuol dire no. MISURATO online il 22/08/2026: un ascoltatore
    // iscritto subito riceve un primo evento piu' povero di quello che riceve,
    // nello stesso istante, chi si iscrive cinque secondi dopo - e su un browser
    // che aveva accettato, con 1 e 10 a `true`, il codice decideva `false` a
    // meno di 5,5 secondi. Il tempo non era scaduto: era arrivato un evento
    // incompleto e lo si era preso per definitivo.
    //
    // Da qui la distinzione: `publisher.consents` POPOLATO con 1 o 10 falsi e'
    // una risposta, e vale come rifiuto; `publisher.consents` VUOTO non e' una
    // risposta, e si continua ad aspettare. A garantire che si decida comunque
    // resta la scadenza dei dieci secondi, che manda la mano nuda.
    function _pubblicoVuoto(tc) {
        var p = tc && tc.publisher && tc.publisher.consents;
        for (var k in p) if (p.hasOwnProperty(k)) return false;
        return true;
    }

    // Diario di cosa consegna il CMP e quando. Serve a chiudere la domanda
    // rimasta aperta - primo evento con `ok=false`, oppure `tcloaded` col
    // riquadro publisher ancora vuoto? - che dal browser non si vede, perche'
    // quando si riesce a incollare in console la decisione e' gia' presa.
    // Si legge con BurracoStats.diario(). Dodici righe bastano e avanzano.
    var _diario = [];

    function _annota(tc, ok) {
        if (_diario.length >= 12) return;
        var p = (tc && tc.publisher && tc.publisher.consents) || null, n = 0, k;
        for (k in p) if (p.hasOwnProperty(k)) n++;
        _diario.push({
            ms: (window.performance && performance.now) ? Math.round(performance.now()) : -1,
            ok: !!ok,
            evento: tc ? tc.eventStatus : null,
            gdpr: tc ? tc.gdprApplies : null,
            nPub: n,
            p1: p ? !!p['1'] : null,
            p10: p ? !!p['10'] : null
        });
    }

    // Cosa fare di un evento, tenuto separato perche' lo usano due ascoltatori:
    // quello permanente e quelli usa-e-getta delle riletture.
    function _esamina(tc, ok) {
        _annota(tc, ok);
        // Non e' un rifiuto, e' un non-risposta: aspettare costa poco, e chi
        // sbaglia qui butta via il consenso di chi l'aveva dato.
        if (!ok) return;
        if (tc.eventStatus !== 'tcloaded' && tc.eventStatus !== 'useractioncomplete') return;
        if (_valuta(tc)) { _applica(true); return; }
        // Fuori dall'area del GDPR non c'e' niente da aspettare: nessuno dara'
        // mai quel consenso, e la mano parte nuda subito invece che fra dieci
        // secondi - dieci secondi in cui la pagina potrebbe gia' essere chiusa.
        if (tc.gdprApplies === false) { _applica(false); return; }
        if (_pubblicoVuoto(tc)) return;
        _applica(false);
    }

    function _applica(ok) {
        _consenso = ok;
        // Consenso mai dato oppure revocato: l'identificatore sparisce dal
        // browser, com'e' scritto nell'informativa. La mano tenuta da parte NON
        // si butta: parte lo stesso, senza gli identificatori.
        if (!ok) _cancellaId();
        var coda = _inAttesa;
        _inAttesa = null;
        if (coda) _spedisci(coda);
    }

    function _ascolta() {
        // Su questo CMP 'getTCData' risponde {ok:false}: l'unica via che
        // funziona e' l'ascolto degli eventi. Il callback torna anche quando
        // l'utente cambia idea, ed e' li' che si intercetta la revoca - per
        // questo l'iscrizione resta, e non si toglie mai.
        window.__tcfapi('addEventListener', 2, _esamina);
        _rileggi(8);
    }

    // Una nuova iscrizione riceve subito lo stato corrente del CMP, ed e'
    // proprio quello il modo in cui si e' scoperto il difetto: a cinque secondi
    // arrivavano dati migliori di quelli visti a duecentocinquanta millisecondi.
    // Quindi finche' non si e' deciso si rilegge, una volta al secondo. Ogni
    // ascoltatore usa-e-getta si toglie da solo dopo il primo evento: quello che
    // deve restare in ascolto per sempre e' un altro, e ne basta uno.
    function _rileggi(rimasti) {
        if (_consenso !== null || rimasti <= 0) return;
        setTimeout(function () {
            if (_consenso !== null) return;
            try {
                window.__tcfapi('addEventListener', 2, function (tc, ok) {
                    if (tc && tc.listenerId !== null && tc.listenerId !== undefined) {
                        try {
                            window.__tcfapi('removeEventListener', 2,
                                            function () { }, tc.listenerId);
                        } catch (e) { }
                    }
                    _esamina(tc, ok);
                });
            } catch (e) { }
            _rileggi(rimasti - 1);
        }, 1000);
    }

    function _aggancia(rimasti) {
        if (typeof window.__tcfapi === 'function') { _ascolta(); return; }
        if (rimasti <= 0) {
            // Nessun CMP: blocco pubblicitario, dev_mode, o sviluppo in locale.
            // Senza prova del consenso le mani partono nude, senza identificatori.
            _applica(false);
            return;
        }
        setTimeout(function () { _aggancia(rimasti - 1); }, ATTESA_MS);
    }

    // ------------------------------------------------------------------
    // Invio
    // ------------------------------------------------------------------

    // La versione non si scrive a mano: si legge dal ?v= del tag <script>, cosi'
    // e' sempre quella che sta davvero girando. Ne servono due, e sono numeri
    // diversi che si muovono per conto loro: burraco-game.js e' la versione del
    // GIOCO (la colonna `versione` della mano), burraco-core.js quella del
    // CODICE CHE DECIDE, ed e' quella che identifica un motore.
    function _versioneDi(file) {
        try {
            var s = document.querySelector('script[src*="' + file + '"]');
            var m = s && s.getAttribute('src').match(/[?&]v=([\w.]{1,10})/);
            return m ? m[1] : '';
        } catch (e) { return ''; }
    }

    function _versione() { return _versioneDi('burraco-game.js'); }

    function _spedisci(dati) {
        dati.mano_id = _casuale(16);
        _ultimaMano = dati.mano_id;
        dati.versione = _versione();

        if (_consenso === true) {
            var id = _ottieniId();
            if (id) dati.giocatore_id = id;
        } else {
            // Riga nuda: niente identificatore del browser e niente filo che
            // leghi fra loro le mani dello stesso torneo. Il server accetta
            // tutti e due a NULL, ed e' l'unica coppia di colonne che accetta.
            delete dati.giocatore_id;
            delete dati.torneo_id;
        }

        var corpo = JSON.stringify(dati);
        try {
            // sendBeacon sopravvive al ricaricamento, che qui arriva subito
            // dopo: ogni mano nuova e' un reload della pagina.
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: 'application/json' }));
                return;
            }
        } catch (e) { }
        try {
            fetch(ENDPOINT, {
                method: 'POST', body: corpo, keepalive: true,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) { }
    }

    // ------------------------------------------------------------------
    // Interfaccia pubblica
    // ------------------------------------------------------------------

    window.BurracoStats = {
        // Riceve i fatti della mano; mano_id, giocatore_id e versione li mette
        // questo file. La mano parte in ogni caso: il consenso decide se
        // portarsi dietro gli identificatori, non SE partire.
        invia: function (dati) {
            // Serratura del collaudo, e sta qui e non solo nel gioco apposta:
            // finche' la raccolta e' spenta non parte niente, da nessuna via.
            if (!_raccolta) return;
            // Il sorteggio si fa QUI e non in _spedisci: una mano scartata non
            // deve nemmeno mettersi in coda ad aspettare il CMP, o resterebbe
            // appesa a un consenso che non le serve piu'. E si azzera l'id
            // dell'ultima mano, altrimenti il pannello Ctrl+Alt+M mostrerebbe
            // quello della mano precedente e sembrerebbe registrata anche questa.
            if (!_campionata()) { _ultimaMano = null; return; }
            // Gia' deciso, in un senso o nell'altro: si spedisce subito.
            if (_consenso !== null) { _spedisci(dati); return; }
            // Ancora in sospeso: si aspetta il CMP, ma solo per sapere se
            // attaccare gli identificatori. Quando risponde - o quando scade il
            // tempo - la mano parte comunque (vedi _applica).
            _inAttesa = dati;
        },

        // Vero solo in casa e col flag acceso: e' il permesso di registrare le
        // mani dell'automa, che nel gioco vero sono sempre escluse perche'
        // falserebbero ogni confronto. NON governa piu' il consenso, che in casa
        // si da' per dato comunque.
        prova: _prova,

        // Vero se su questo browser le mani si registrano, cioe' per chiunque
        // non si sia chiamato fuori. Non dice che LA SINGOLA mano partira': di
        // quello decide il campione (vedi UNA_MANO_OGNI).
        //
        // Lo legge anche burraco-game.js, che quando e' falso tiene tutti i
        // motori su 'A': se non si raccoglie niente, far incontrare il motore in
        // prova a chi passa di qui significherebbe cambiargli la partita senza
        // imparare nulla. Oggi quel ramo non si vede, perche' i bracci sono
        // spenti da AB_ATTIVO.
        raccolta: _raccolta,

        // Una mano ogni quante finisce in tabella. 1 = tutte. Serve a chi legge
        // i numeri: le righe contate vanno moltiplicate per questo per risalire
        // alle mani giocate davvero.
        unaManoOgni: UNA_MANO_OGNI,

        // Versione di un file caricato, letta dal suo ?v=. Serve a chi compone
        // la descrizione dei motori: la versione del codice non deve stare
        // scritta a mano in due posti.
        versioneDi: _versioneDi,

        // Comodita' da console, per non dover ricordare il nome della chiave.
        // Serve SOLO per le mani dell'automa: per giocare a mano in casa non
        // occorre accendere niente. Fuori di casa non fa niente e lo dice.
        accendiProva: function (acceso) {
            if (!_hostLocale()) { console.warn('Modo prova: solo in locale.'); return false; }
            try {
                if (acceso === false) localStorage.removeItem(CHIAVE_PROVA);
                else localStorage.setItem(CHIAVE_PROVA, '1');
            } catch (e) { return false; }
            console.log('Mani dell\'automa: registrazione ' + (acceso === false ? 'spenta' : 'accesa')
                        + '. Ricarica la pagina. (Le partite giocate a mano si registrano comunque.)');
            return true;
        },

        // Chiama fuori QUESTO browser dalla raccolta: accendiRaccolta(false) per
        // smettere di registrare, accendiRaccolta() per tornare come tutti gli
        // altri. Ora che si raccoglie da chiunque, e' lo spegnimento il verso
        // che serve. Vale in casa come online.
        accendiRaccolta: function (acceso) {
            try {
                if (acceso === false) localStorage.setItem(CHIAVE_RACCOLTA, '0');
                else localStorage.removeItem(CHIAVE_RACCOLTA);
            } catch (e) { return false; }
            console.log('Raccolta statistiche ' + (acceso === false ? 'SPENTA' : 'ACCESA')
                + ' su questo browser. Ricarica la pagina.');
            return true;
        },

        // Cosa ha consegnato il CMP, in ordine e col millisecondo. Da console:
        // console.table(BurracoStats.diario()). E' la risposta alla domanda che
        // dal browser non si riusciva a fare in tempo.
        diario: function () { return _diario.slice(); },

        // Per le verifiche da console e per il pannello Ctrl+Alt+M.
        stato: function () {
            return {
                consenso: _consenso, id: _leggiId(), inAttesa: !!_inAttesa,
                prova: _prova, raccolta: _raccolta, eventi: _diario.length,
                unaManoOgni: UNA_MANO_OGNI,
                // null anche quando la raccolta e' accesa: vuol dire che questa
                // mano il campione non l'ha pescata.
                ultimaMano: _ultimaMano
            };
        }
    };

    // In casa il consenso non si aspetta: non c'e' nessuno che lo dia (vedi
    // sopra, __tcfapi misurato undefined su localhost). Si salta l'attesa e si
    // parte dallo stesso stato del giocatore che online accetta.
    if (_hostLocale()) {
        _applica(true);
    } else {
        _aggancia(TENTATIVI);
        // Rete di sicurezza per il caso che _aggancia non copre: il CMP c'e' -
        // quindi l'attesa di __tcfapi finisce subito - ma il suo callback non
        // arriva mai. Senza questa scadenza la mano in coda resterebbe li' per
        // sempre, e la perderemmo in silenzio. Scaduto il tempo si decide
        // "nessun consenso", che adesso non vuol dire buttarla ma mandarla nuda.
        setTimeout(function () {
            if (_consenso === null) _applica(false);
        }, ATTESA_MS * TENTATIVI);
    }
})();
