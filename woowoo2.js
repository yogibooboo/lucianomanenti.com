/* ===========================================================================
   WooWoo2 - motore di gioco
   ---------------------------------------------------------------------------
   Meccanica ricavata dal dischetto originale Locomotion (Kingsoft 1992):
   45 schemi 10x8, tabella degli scambi a due stati, parametri dei 9
   sottolivelli di ogni livello. I dati stanno in woowoo2-dati.js.

   ATTENZIONE: la grafica caricata da images/woowoo2/tiles.png e' quella originale
   Kingsoft, usata solo come grafica di cantiere per validare la meccanica.
   Va sostituita prima di qualunque pubblicazione. La sostituzione e' in
   collaudo sul livello N: piastrelle nostre su sfondo dipinto. Lo stile di
   ogni schema sta nel campo `stile` dei file di dati (vedi stileDi).
   =========================================================================== */
(function () {
    'use strict';

    var D = window.W2DATI;

    // Il dischetto porta quindici lettere di livello, ma **A..L sono il gioco e
    // M, W, X servono all'editor**: infatti hanno `s`=0 su tutti e nove i
    // sottolivelli e i loro schemi 1 e 2 sono ottanta caselle di prato vuoto.
    // `woowoo2-dati.js` resta l'estrazione completa del dischetto, il filtro
    // sta qui. Restano 12 livelli, 108 quadri.
    var LIVELLI = D.ordine.slice(0, D.ordine.indexOf('L') + 1);

    // I livelli nostri stanno in `woowoo2-mie.js`: dodici lettere dalla M alla
    // X, tre schemi e nove sottolivelli ciascuna, stessa struttura dei dati
    // estratti. Si innestano qui sopra D.liv e nel menu a tendina compaiono
    // solo quelle in cui c'e' davvero un tracciato disegnato -- le altre sono
    // ottanta caselle di prato e non si possono giocare.
    // In LIVELLI non entrano apposta: la campagna resta A..L, cosi' non
    // cambiano ne' il "quadro dopo" ne' la schermata di fine gioco.
    var MIEI = window.W2MIEI;
    if (MIEI) MIEI.ordine.forEach(function (L) { D.liv[L] = MIEI.liv[L]; });
    function disegnato(L) {
        return D.liv[L] && D.liv[L].schemi.some(function (g) {
            return g.some(function (r) {
                return r.some(function (v) { return v !== 33; });
            });
        });
    }
    var NOSTRI = MIEI ? MIEI.ordine.filter(disegnato) : [];

    // ---- grafica per quadro ---------------------------------------------
    // Ogni schema porta con se' il suo stile, nel campo `stile` del file di
    // dati: una voce per schema, accanto a `schemi`.
    //   "orig"  = le piastrelle del dischetto. Ogni piastrella contiene il suo
    //             pezzo di paesaggio (casella 32, disegnata al doppio a video).
    //   oggetto = grafica nostra: un dipinto steso su tutto il quadro e sopra
    //             solo binari, scambi, segnali, ponte e stazioni, a fondo
    //             trasparente. I campi sono `atlante`, `cella` e `sfondo`.
    // Il dipinto e' fatto su misura per quel tracciato: se sposti un binario
    // va ridipinto, e per questo lo stile sta sullo schema e non sulla lettera.
    function stileDi(L, n) {
        var liv = D.liv[L];
        var st = liv && liv.stile && liv.stile[n];
        return (st && typeof st === 'object') ? st : null;
    }

    // Tutti i disegni citati dai dati, senza doppioni: servono al caricatore.
    function stiliUsati() {
        var visti = {}, fuori = [];
        Object.keys(D.liv).forEach(function (L) {
            var st = D.liv[L].stile || [];
            st.forEach(function (x) {
                if (!x || typeof x !== 'object') return;
                var chiave = x.atlante + '|' + x.sfondo;
                if (visti[chiave]) return;
                visti[chiave] = 1; fuori.push(x);
            });
        });
        return fuori;
    }

    // ---- testi -----------------------------------------------------------
    var EN = window.currentLang === 'en';
    var T = {
        quadro: EN ? 'Level {L} — board {N} of {M}. {O} deliveries, {S} stations.'
                   : 'Livello {L} — quadro {N} di {M}. {O} consegne, {S} stazioni.',
        consegna: EN ? 'Delivered at station {S}. {A} of {B}.'
                     : 'Consegna in stazione {S}. {A} di {B}.',
        sbagliata: EN ? 'Wrong station: the train for {D} ended up in {S}.'
                      : "Stazione sbagliata: il treno per {D} e' finito in {S}.",
        scontro: EN ? 'Crash: two trains lost, {A} of {B}.'
                    : 'Scontro: due treni persi, {A} di {B}.',
        vinto: EN ? 'Board cleared' : 'Quadro superato',
        perso: EN ? 'Game over' : 'Partita finita',
        pOrdini: EN ? 'Delivery points' : 'Punti consegne',
        pTempo: EN ? 'Time points' : 'Punti tempo',
        pScontri: EN ? 'Crash points' : 'Punti scontri',
        pExtra: EN ? 'Bonus points' : 'Punti extra',
        pLivello: EN ? 'Level points' : 'Punti livello',
        totale: EN ? 'Total' : 'Totale',
        avanti: EN ? 'Next board' : 'Quadro successivo',
        ancora: EN ? 'Play again' : 'Ricomincia',
        viaggio: EN ? 'running' : 'in viaggio',
        sosta: EN ? 'waiting' : 'in sosta',
        fermo: EN ? 'HELD' : 'FERMO',
        fra: EN ? 'in {N} s' : 'fra {N} s',
        vuoto: EN ? 'no orders' : 'nessun ordine',
        voceLiv: EN ? 'Level {L} · board {N}' : 'Livello {L} · quadro {N}',
        capoBase: EN ? 'Disk A–L' : 'Dischetto A–L',
        capoMiei: EN ? 'Mine M–X' : 'Miei M–X'
    };
    function t(k, v) {
        return T[k].replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] !== undefined ? v[n] : m; });
    }

    // ---- geometria -------------------------------------------------------
    var CELLA = 32;          // lato della casella in pixel originali
    var SCALA = 2;           // fattore di ingrandimento a video
    var COLS = 10, RIGHE = 8;
    var LARG = COLS * CELLA, ALT = RIGHE * CELLA;

    // ---- direzioni -------------------------------------------------------
    // N sale, S scende, E va a destra, O va a sinistra.
    var DIR = { N: { dr: -1, dc: 0 }, S: { dr: 1, dc: 0 }, E: { dr: 0, dc: 1 }, O: { dr: 0, dc: -1 } };
    var OPP = { N: 'S', S: 'N', E: 'O', O: 'E' };
    // punto centrale del lato, in coordinate locali della casella
    var LATO = { N: [16, 0], S: [16, 32], E: [32, 16], O: [0, 16] };

    // ---- tempi e velocita' -----------------------------------------------
    // LA SCALA DI `vel` E `traf` HA SETTE ETICHETTE, NON CINQUE. Lette nella
    // tabella dell'eseguibile (offset 0x4672, coppie tedesco/inglese):
    //   0 Maximum  1 Sehr hoch  2 Hoch  3 Mittel  4 Tief  5 Minimum  6 Aus
    // e' rovesciata, il numero basso e' il valore alto. Sui 135 sottolivelli
    // del dischetto `vel` vale solo 1..4 e `traf` solo 0..3: i due gradini in
    // fondo (Minimum, Aus) non sono mai usati, percio' l'array a cinque voci
    // qui sotto copre tutto quello che il gioco chiede davvero.
    //
    // VELOCITA', UN SOLO GRADINO E' MISURATO. Sul primo quadro di A (vel = 4)
    // dal centro della stazione A in (0,9) all'imbocco della curva in (5,9) ci
    // sono 4,5 caselle, percorse in circa 11 secondi -> 0,41 caselle/s, cioe'
    // 1/4 di pixel per fotogramma a 50 Hz PAL su caselle da 32 px. Quello e' un
    // dato. **Gli altri gradini sono una RICOSTRUZIONE**: ho supposto la scala
    // 1, 2/3, 1/2, 1/3, 1/4 px/frame, che era anche tarata sull'idea sbagliata
    // che i passi fossero cinque. Nel binario una tabella di velocita' non si
    // trova (cercata, vedi memoria), quindi finche' non si cronometra in UAE un
    // quadro con vel = 1, 2 o 3 questi tre numeri restano una stima.
    var VELOCITA = [50 / 32, (100 / 3) / 32, 25 / 32, (50 / 3) / 32, 12.5 / 32];

    // ANNUNCIO e SOSTA non sono costanti ma frazioni di `sec` (Zeit/Auftrag,
    // il tempo assegnato a ogni ordine). Sul primo quadro di A, sec = 25 e le
    // misure sono 13 s di annuncio e 8 s di sosta: 0,52 e 0,33 di sec.
    var F_ANNUNCIO = 0.52;
    var F_SOSTA = 0.33;

    // EMISSIONE DEGLI ORDINI. Non e' un timer fisso: il quadro dura `ord * sec`
    // e deve smaltire `ord` ordini, quindi a regime il ritmo e' per forza
    // UN ORDINE OGNI `sec` SECONDI. `sec` (Zeit/Auftrag) e' la schedulazione,
    // non serve nessuna tabella inventata.
    // Sopra questo ritmo agiscono due freni, entrambi dal disco:
    //   - ANTICIPO: quanti annunci EXTRA il gioco fa all'avvio, ravvicinati,
    //     per riempire un quadro che altrimenti parte vuoto. Indicizzato su
    //     `traf` (0 = Massimo traffico, 4 = Minimo) e tagliato da `tmax`.
    //     Il log UAE di A/1 (traf 3) ha i primi due annunci a 4 s e 43 s, cioe'
    //     **nessun extra**: da li' lo zero in terza e quarta posizione. Gli
    //     altri quattro gradini non sono misurati.
    //   - F_GAP: distanza fra gli annunci extra dell'avvio.
    //   - F_RIPROVA: quando l'annuncio non si puo' fare (quadro pieno, oppure
    //     tutte le stazioni occupate) non si riprova subito, se no appena si
    //     libera un posto parte una raffica. Si riprova dopo una frazione del
    //     ritmo.
    // Il tetto `tmax` fa il resto: a quadro pieno l'emissione si ferma e
    // riprende alla prima consegna, quindi l'intervallo non e' mai costante.
    var ANTICIPO = [3, 2, 1, 0, 0];
    var F_GAP = 0.12;
    var F_RIPROVA = 0.3;

    // Ritmo di base fra due annunci, in frazioni di `sec`. Misurato su A/1 in
    // UAE: 7 annunci in 256 s, cioe' ~37 s con sec = 25.
    var F_RITMO = 1.5;

    // IL CONTATORE NON E' UN OROLOGIO. Misurato su A/1 (partita completa
    // cronometrata dall'utente, 9 treni): il numero mostrato cala di UNO ogni
    // TRENOSEC secondi PER OGNI TRENO PRESENTE sul quadro, dalla comparsa alla
    // stazione fino all'arrivo o allo scontro. A quadro vuoto e' fermo, con due
    // treni scende il doppio, con tre il triplo. Adattamento ai minimi quadrati
    // su 27 letture: divisore 3,965 e valore iniziale 134,4 contro i 4 e 135
    // teorici, scarto 0,64 unita', dentro l'errore di trascrizione dichiarato.
    var TRENOSEC = 4;

    // ACCELERATORE. Nell'originale si tiene premuto il tasto destro del mouse
    // per far correre il gioco piu' in fretta. Moltiplica il tempo, quindi
    // accelera TUTTO: treni, annunci e anche il consumo del contatore.
    // Fattore 4, verificato dall'utente in UAE il 25/09/2026 (non 2).
    var TURBO = 4;

    // Manopole di taratura, per confrontare a occhio con UAE senza ricaricare.
    window.W2TARA = {
        velocita: VELOCITA, fAnnuncio: F_ANNUNCIO, fSosta: F_SOSTA,
        anticipo: ANTICIPO, fGap: F_GAP, fRitmo: F_RITMO, fRiprova: F_RIPROVA,
        trenoSec: TRENOSEC,
        turbo: TURBO
    };

    // Valore iniziale del contatore, su due letture in UAE: A/1 = 135 (ord 5,
    // sec 25) e A/2 = A/3 = 270 (ord 10, sec 25). Il budget e' dunque esatta-
    // mente proporzionale agli ordini, 27 unita' ciascuno, cioe' 108 secondi-
    // treno. La vecchia ipotesi `ord*sec+inc` e' SCARTATA: su A/2 avrebbe dato
    // 260 e `inc` vale 10 su tutti e tre i quadri, quindi il conto tornava su
    // A/1 solo per coincidenza.
    // Restano in piedi due letture della costante, indistinguibili finche' sec
    // vale 25: `sec+2` e `sec*1,08`. Le separa un quadro con sec diverso, per
    // esempio A/8 (ord 15, sec 18): 300 contro 292. Tengo la piu' semplice.
    function contatoreIniziale(p) { return p.ord * (p.sec + 2); }
    function tara() { return window.W2TARA; }

    // ---- il treno, 8x14, ricavato da una schermata originale --------------
    // 0 = nero, 1 = corpo (ricolorabile), 2 = bianco
    var TRENO = [
        '02000020', '11100111', '11100111', '01000010', '10222201', '11000011', '10100101',
        '10100101', '11000011', '10222201', '01000010', '11100111', '11100111', '02000020'
    ];
    var COLORI = ['#cc0000', '#eecc00', '#22aaee', '#ee7700', '#bb44cc', '#22cc66'];

    // ---- stato -----------------------------------------------------------
    var S = {
        livello: 'A', sub: 0,
        griglia: null,      // [r][c] codice
        stato: null,        // [r][c] stato dello scambio (0/1)
        stazioni: [],       // {r,c,lettera,uscita}
        treni: [],
        coda: [],           // ordini annunciati non ancora comparsi
        consegnati: 0, scontri: 0, persi: 0, punti: 0,
        tempo: 0, tempoMax: 0, prossimo: 0,
        attivo: false, finito: null,
        lampeggio: 0,
        turbo: false
    };

    window.W2STATO = S;          // sonda per la console e per il banco di prova

    var cv, ctx, atlante, pronto = false;

    // =======================================================================
    //  percorsi
    // =======================================================================

    // Rotta viva di una casella nello stato corrente: due lettere, es. "NS".
    function rotta(cod, st) {
        var r = D.rotta[cod];
        if (!r) return null;
        return r[Math.min(st, r.length - 1)];
    }

    // Data la casella e il lato da cui il treno entra, restituisce il lato di
    // uscita, oppure null se la via non e' aperta.
    function uscita(cod, st, entrata) {
        // i segnali (9 e 10) hanno la stessa rotta nei due stati: lo stato 1
        // significa "chiuso", il treno si ferma.
        if (D.segnale.indexOf(cod) >= 0 && st === 1) return null;
        var r = rotta(cod, st);
        if (!r || r.indexOf(entrata) < 0) return null;
        return r[0] === entrata ? r[1] : r[0];
    }

    function dentro(r, c) { return r >= 0 && r < RIGHE && c >= 0 && c < COLS; }

    // Posizione lungo la casella: Bezier quadratica fra i due lati passando
    // per il centro. Sui rettilinei degenera in moto uniforme, sulle curve da'
    // una traiettoria morbida senza casi particolari.
    // Il punto di controllo e' il centro della casella, tranne nel rimbalzo
    // (entrata e uscita sullo stesso lato): li' col centro il treno si
    // fermerebbe a meta' strada, quindi si prende il lato opposto, che porta
    // l'apice della curva esattamente sul centro.
    function controllo(ea, xa) {
        if (ea !== xa) return [16, 16];
        return LATO[OPP[ea]];
    }
    function punto(t, ea, xa) {
        var A = LATO[ea], B = LATO[xa], K = controllo(ea, xa), u = 1 - t;
        return [u * u * A[0] + 2 * u * t * K[0] + t * t * B[0],
                u * u * A[1] + 2 * u * t * K[1] + t * t * B[1]];
    }
    function tangente(t, ea, xa) {
        var A = LATO[ea], B = LATO[xa], K = controllo(ea, xa), u = 1 - t;
        return [2 * u * (K[0] - A[0]) + 2 * t * (B[0] - K[0]),
                2 * u * (K[1] - A[1]) + 2 * t * (B[1] - K[1])];
    }

    // =======================================================================
    //  caricamento del sottolivello
    // =======================================================================

    function parametri() { return D.liv[S.livello].sub[S.sub]; }

    // Non tutte le stazioni comunicano: in diversi schemi la rete e' a senso
    // unico (per esempio nello schema 2 del livello E le sei stazioni di
    // sinistra servono solo quelle di destra). Qui si esplora la rete con
    // gli scambi liberi di assumere entrambi gli stati e si tiene l'elenco
    // delle mete effettivamente servite, cosi' gli ordini sono sempre
    // eseguibili.
    function raggiungibili(part) {
        var visti = {}, pila = [[part.r, part.c, part.uscita]], mete = [];
        while (pila.length) {
            var v = pila.pop(), r = v[0], c = v[1], d = v[2];
            var k = r + ',' + c + ',' + d;
            if (visti[k]) continue;
            visti[k] = 1;
            var nr = r + DIR[d].dr, nc = c + DIR[d].dc;
            if (!dentro(nr, nc)) continue;
            var cod = S.griglia[nr][nc], entrata = OPP[d];
            if (D.staz[cod]) {
                if (D.staz[cod] === entrata) {
                    // La meta puo' coincidere con la partenza: nel gioco
                    // originale si vedono ordini B>B, C>C, A>A, e il treno fa
                    // il giro dell'anello per tornare da dove e' uscito.
                    for (var i = 0; i < S.stazioni.length; i++) {
                        var st = S.stazioni[i];
                        if (st.r === nr && st.c === nc && mete.indexOf(st) < 0) mete.push(st);
                    }
                }
                continue;
            }
            for (var s = 0; s < 2; s++) {
                var x = uscita(cod, s, entrata);
                if (x) pila.push([nr, nc, x]);
            }
        }
        return mete;
    }

    // Ogni quadro parte dal suo budget nudo: il tempo avanzato NON si riporta al
    // quadro dopo. (Il riporto c'era stato messo il 25/09/2026 e tolto lo stesso
    // giorno: l'utente lo aveva confuso con un altro gioco.) Il tempo avanzato
    // paga solo in punteggio, la riga `pTempo` della modale di fine quadro.
    // Riempie una tendina con le lettere passate. La prima voce e' il
    // capofila: non e' un quadro, serve da titolo e da posizione di riposo
    // quando la scelta e' stata fatta nell'altra tendina.
    function riempi(sel, lettere, capo) {
        var o = document.createElement('option');
        o.value = ''; o.textContent = capo; sel.appendChild(o);
        lettere.forEach(function (l) {
            for (var i = 0; i < D.liv[l].sub.length; i++) {
                var x = document.createElement('option');
                x.value = l + ':' + i; x.textContent = t('voceLiv', { L: l, N: i + 1 });
                sel.appendChild(x);
            }
        });
    }

    // Porta le due tendine d'accordo con il quadro in corso: quella che lo
    // contiene lo mostra, l'altra torna al capofila.
    function allinea(L, n) {
        [el('w2-scelta'), el('w2-scelta2')].forEach(function (sel) {
            if (!sel) return;
            sel.value = L + ':' + n;
            if (sel.selectedIndex < 0) sel.value = '';
        });
    }

    function montaSelettori() {
        var a = el('w2-scelta'), b = el('w2-scelta2');
        if (a) riempi(a, LIVELLI, t('capoBase'));
        if (b) riempi(b, NOSTRI, t('capoMiei'));
        [a, b].forEach(function (sel) {
            if (!sel) return;
            sel.onchange = function () {
                // Il capofila non e' un quadro: se ci finisce sopra, la
                // tendina torna a segnare quello che si sta giocando.
                if (!sel.value) { allinea(S.livello, S.sub); return; }
                var v = sel.value.split(':');
                carica(v[0], parseInt(v[1], 10));
            };
        });
    }

    function carica(liv, sub) {
        S.livello = liv; S.sub = sub;
        allinea(liv, sub);
        var p = parametri();
        S.stile = stileDi(liv, p.s);
        var sch = D.liv[liv].schemi[p.s];

        S.griglia = sch.map(function (r) { return r.slice(); });
        S.stato = [];
        for (var r = 0; r < RIGHE; r++) {
            S.stato.push([]);
            for (var c = 0; c < COLS; c++) S.stato[r].push(0);
        }

        // stazioni in ordine di lettura, lettera A, B, C...
        S.stazioni = [];
        for (var r2 = 0; r2 < RIGHE; r2++) {
            for (var c2 = 0; c2 < COLS; c2++) {
                var u = D.staz[S.griglia[r2][c2]];
                if (u) S.stazioni.push({ r: r2, c: c2, uscita: u, lettera: '', annuncio: 0 });
            }
        }
        S.stazioni.forEach(function (s, i) { s.lettera = String.fromCharCode(65 + i); });

        // Casella del tabellone: nell'originale e' la casella nera `D.info`,
        // che 39 schemi su 45 hanno gia' dentro il disegno. Per i sei che non
        // ce l'hanno scelgo la casella di sfondo piu' vicina al centro e ci
        // disegno sopra la stessa piastrella, cosi' il quadro non resta muto.
        S.info = null;
        for (var r3 = 0; r3 < RIGHE; r3++) {
            for (var c3 = 0; c3 < COLS; c3++) {
                if (S.griglia[r3][c3] === D.info) S.info = { r: r3, c: c3, finta: false };
            }
        }
        if (!S.info) {
            var mig = 1e9;
            for (var r4 = 0; r4 < RIGHE; r4++) {
                for (var c4 = 0; c4 < COLS; c4++) {
                    if (D.decor.indexOf(S.griglia[r4][c4]) < 0) continue;
                    var d = Math.abs(r4 - 3.5) + Math.abs(c4 - 4.5);
                    if (d < mig) { mig = d; S.info = { r: r4, c: c4, finta: true }; }
                }
            }
        }
        S.stazioni.forEach(function (s) { s.mete = raggiungibili(s); });

        S.treni = []; S.coda = [];
        S.consegnati = 0; S.scontri = 0; S.persi = 0; S.punti = 0;
        S.tempo = contatoreIniziale(p);
        S.tempoMax = S.tempo;            // tetto della barra
        S.orologio = 0;                  // secondi veri, per la schedulazione
        S.prossimo = 2;                  // il primo annuncio arriva quasi subito
        S.emessi = 0;                    // ordini gia' annunciati
        S.extra = Math.min(tara().anticipo[p.traf], p.tmax);   // annunci ravvicinati d'avvio
        S.attivo = true; S.finito = null; S.turbo = false;
        messaggio(t('quadro', { L: liv, N: sub + 1, M: D.liv[liv].sub.length,
                                O: p.ord, S: S.stazioni.length }));
        aggiornaHud();
    }

    // =======================================================================
    //  ordini e treni
    // =======================================================================

    // Una stazione e' occupata se ci sta sopra un treno - in sosta, che sta
    // ancora uscendo, o rimbalzato dentro per errore - oppure se ha gia' un
    // annuncio in corso. Nell'originale non succede mai che due treni partano
    // dalla stessa stazione sovrapposti, e succedeva qui perche' la partenza
    // si sorteggiava fra tutte le stazioni senza guardare se erano libere.
    function trenoSu(st) {
        for (var j = 0; j < S.treni.length; j++) {
            var tr = S.treni[j];
            if (!tr.morto && tr.r === st.r && tr.c === st.c) return true;
        }
        return false;
    }

    function occupata(st) {
        for (var i = 0; i < S.coda.length; i++) if (S.coda[i].part === st) return true;
        return trenoSu(st);
    }

    // Restituisce true solo se l'ordine e' stato davvero annunciato: chi chiama
    // deve poterlo contare, e riprovare piu' tardi se non c'era posto.
    function nuovoOrdine() {
        if (S.stazioni.length < 2) return false;
        var p = parametri();
        // solo stazioni libere e con almeno una meta servita
        var buone = S.stazioni.filter(function (s) {
            return s.mete.length > 0 && !occupata(s);
        });
        if (!buone.length) return false;
        var part = buone[Math.floor(Math.random() * buone.length)];
        S.coda.push({
            part: part, dest: part.mete[Math.floor(Math.random() * part.mete.length)],
            resta: p.sec * tara().fAnnuncio,
            colore: COLORI[S.coda.length % COLORI.length]
        });
        part.annuncio = p.sec * tara().fAnnuncio;
        suona('annuncio');
        return true;
    }

    function fallaPartire(o) {
        var p = parametri();
        var st = o.part;
        S.treni.push({
            r: st.r, c: st.c,
            ea: OPP[st.uscita], xa: st.uscita, t: 0.5,
            dest: o.dest.lettera, colore: o.colore,
            sosta: p.sec * tara().fSosta, fermo: false, uscito: false
        });
    }

    // Prova a far entrare il treno nella casella successiva.
    function avanza(tr) {
        var d = DIR[tr.xa];
        var nr = tr.r + d.dr, nc = tr.c + d.dc;
        if (!dentro(nr, nc)) { tr.morto = true; return; }

        var cod = S.griglia[nr][nc];
        var entrata = OPP[tr.xa];

        // stazione: si entra solo dal suo unico lato
        var us = D.staz[cod];
        if (us) {
            if (us !== entrata) { tr.fermo = true; return; }
            arrivo(tr, nr, nc, entrata);
            return;
        }

        var x = uscita(cod, S.stato[nr][nc], entrata);
        if (!x) { tr.fermo = true; return; }     // scambio storto o segnale chiuso
        tr.fermo = false;
        tr.r = nr; tr.c = nc; tr.ea = entrata; tr.xa = x; tr.t = 0;
        tr.uscito = true;
    }

    function arrivo(tr, r, c, entrata) {
        var st = null;
        for (var i = 0; i < S.stazioni.length; i++) {
            if (S.stazioni[i].r === r && S.stazioni[i].c === c) st = S.stazioni[i];
        }

        if (st && st.lettera === tr.dest) {
            tr.morto = true;                  // consegnato: sparisce subito
            S.consegnati++;
            S.punti += 100;
            suona('arrivo');
            messaggio(t('consegna', { S: st.lettera, A: S.consegnati, B: parametri().ord }));
            if (S.consegnati >= parametri().ord) fine(true);
            return;
        }

        // Stazione sbagliata: il treno entra, arriva al centro e viene
        // rimbalzato fuori dallo stesso lato, in direzione opposta. Entrata e
        // uscita coincidono, ci pensa controllo() a dargli la traiettoria.
        tr.r = r; tr.c = c;
        tr.ea = entrata; tr.xa = entrata; tr.t = 0;
        tr.fermo = false; tr.uscito = true;
        suona('rimbalzo');
        messaggio(t('sbagliata', { D: tr.dest, S: st ? st.lettera : '?' }));
    }

    // =======================================================================
    //  aggiornamento
    // =======================================================================

    function passo(dt) {
        if (!S.attivo) return;
        var p = parametri();

        S.lampeggio += dt;
        S.orologio += dt;

        // Il contatore scende solo per i treni presenti sul quadro (comparsi e
        // non ancora spariti), uno ogni TRENOSEC secondi ciascuno.
        var inPista = 0;
        for (var q = 0; q < S.treni.length; q++) if (!S.treni[q].morto) inPista++;
        S.tempo -= inPista * dt / tara().trenoSec;
        if (S.tempo <= 0) { S.tempo = 0; fine(false); return; }

        // annunci in coda
        for (var i = S.coda.length - 1; i >= 0; i--) {
            var o = S.coda[i];
            o.resta -= dt;
            if (o.resta > 0) { o.part.annuncio = o.resta; continue; }
            o.resta = 0;
            // La stazione era libera quando e' partito l'annuncio, ma nei secondi
            // dell'annuncio un treno ci puo' essere rimbalzato dentro. In quel
            // caso il treno nuovo non compare sopra quello che c'e' gia': aspetta
            // il suo posto e intanto la lettera continua a lampeggiare.
            if (trenoSu(o.part)) { o.part.annuncio = 0.01; continue; }
            o.part.annuncio = 0;
            fallaPartire(o); S.coda.splice(i, 1);
        }

        // NUOVO ORDINE. Un solo appuntamento alla volta, `S.prossimo`: quando
        // scade si prova a fare l'annuncio e si fissa il prossimo. Non si tiene
        // nessun arretrato da smaltire - la versione precedente contava gli
        // ordini "dovuti" dall'inizio del quadro, e ogni volta che il tetto
        // `tmax` bloccava l'emissione il debito cresceva e poi si scaricava in
        // raffica a distanza di F_GAP l'uno dall'altro. Da li' le partenze
        // ammucchiate che nell'originale non si vedono.
        S.prossimo -= dt;
        var ritmo = p.sec * tara().fRitmo;
        // si smette solo quando fra consegnati e roba in pista si arriva a `ord`:
        // se un treno si schianta ne serve un altro, il tetto non e' sugli emessi.
        var bastano = S.consegnati + S.treni.length + S.coda.length >= p.ord;
        if (S.prossimo <= 0 && !bastano) {
            var posto = S.treni.length + S.coda.length < p.tmax;
            if (posto && nuovoOrdine()) {
                S.emessi++;
                // gli annunci d'avvio sono ravvicinati, poi si va a ritmo
                if (S.extra > 0) { S.extra--; S.prossimo = p.sec * tara().fGap; }
                else S.prossimo = ritmo;
            } else {
                // niente posto o nessuna stazione libera: si riprova piu' tardi,
                // non al primo fotogramma utile.
                S.prossimo = ritmo * tara().fRiprova;
            }
        }

        // treni
        var v = tara().velocita[p.vel];
        for (var k = 0; k < S.treni.length; k++) {
            var tr = S.treni[k];
            if (tr.sosta > 0) { tr.sosta -= dt; if (tr.sosta <= 0) suona('partenza'); continue; }
            if (tr.fermo) { avanza(tr); continue; }   // riprova a ogni giro: riparte da solo
            tr.t += v * dt;
            while (tr.t >= 1 && !tr.morto && !tr.fermo) {
                var resto = tr.t - 1;
                avanza(tr);
                if (!tr.morto && !tr.fermo) tr.t = resto;   // il residuo non va perso
            }
            if (tr.fermo) tr.t = 1;   // resta appoggiato al confine della casella
        }

        collisioni();
        S.treni = S.treni.filter(function (x) { return !x.morto; });
        aggiornaHud();
    }

    // Due treni scoppiano quando sono completamente sovrapposti, non quando si
    // sfiorano: chi sopraggiunge non si accoda, entra dentro e poi salta.
    function collisioni() {
        for (var i = 0; i < S.treni.length; i++) {
            var a = S.treni[i]; if (a.morto || a.sosta > 0 || !a.uscito) continue;
            for (var j = i + 1; j < S.treni.length; j++) {
                var b = S.treni[j]; if (b.morto || b.sosta > 0 || !b.uscito) continue;
                var pa = mondo(a), pb = mondo(b);
                var dx = pa[0] - pb[0], dy = pa[1] - pb[1];
                if (dx * dx + dy * dy < 25) {
                    a.morto = b.morto = true;
                    // `inc` (Unfall-Zaehler) conta TRENI PERSI, non scontri: uno
                    // scontro ne brucia due, e infatti sui 108 quadri `inc` e'
                    // sempre pari (4, 6, 8, 10), cioe' 2, 3, 4 o 5 scontri.
                    S.scontri++; S.persi += 2; S.punti -= 50;
                    suona('scontro');
                    messaggio(t('scontro', { A: S.persi, B: parametri().inc }));
                    if (S.persi >= parametri().inc) fine(false);
                    return;
                }
            }
        }
    }

    function mondo(tr) {
        var p = punto(tr.t, tr.ea, tr.xa);
        return [tr.c * CELLA + p[0], tr.r * CELLA + p[1]];
    }

    function fine(vinto) {
        if (!S.attivo) return;
        S.attivo = false;
        var p = parametri();
        var avanzo = vinto ? Math.floor(S.tempo) : 0;   // vale solo in punteggio
        var pTempo = avanzo * 5;
        var pOrdini = S.consegnati * 100;
        var pScontri = -S.scontri * 50;
        var pExtra = (vinto && S.scontri === 0) ? 500 : 0;
        var pLivello = vinto ? (S.livello.charCodeAt(0) - 64) * 50 : 0;
        S.finito = {
            vinto: vinto, avanzo: avanzo, tempo: pTempo, ordini: pOrdini, scontri: pScontri,
            extra: pExtra, livello: pLivello,
            totale: pTempo + pOrdini + pScontri + pExtra + pLivello
        };
        // L'ultima lettura va scritta qui: se il quadro finisce per tempo scaduto
        // `passo` esce prima di arrivare al suo aggiornaHud() di coda, e la barra
        // in alto resterebbe ferma sui valori di un fotogramma prima.
        aggiornaHud();
        mostraFine();
    }

    // =======================================================================
    //  disegno
    // =======================================================================

    function disegna() {
        if (!pronto) return;
        var sty = S.stile;
        var atl = sty ? sty.img : atlante;
        var cel = sty ? sty.cella : 32;
        ctx.setTransform(SCALA, 0, 0, SCALA, 0, 0);
        ctx.imageSmoothingEnabled = false;

        // Lo stile nuovo stende prima il dipinto: le piastrelle che gli vanno
        // sopra sono trasparenti fuori dalla massicciata. Nello stile del
        // dischetto lo sfondo sta dentro le piastrelle e qui non c'e' niente
        // da stendere.
        if (sty) ctx.drawImage(sty.fondoImg, 0, 0, LARG, ALT);

        // caselle
        for (var r = 0; r < RIGHE; r++) {
            for (var c = 0; c < COLS; c++) {
                var cod = S.griglia[r][c];
                // prato, alberi, acqua, case e tabellone: nello stile nuovo non
                // sono piastrelle, li ha gia' disegnati il dipinto
                if (sty && !D.rotta[cod] && !D.staz[cod]) continue;
                var st = (D.scambio.indexOf(cod) >= 0 || D.segnale.indexOf(cod) >= 0) ? S.stato[r][c] : 0;
                ctx.drawImage(atl, cod * cel, st * cel, cel, cel, c * CELLA, r * CELLA, CELLA, CELLA);
            }
        }

        disegnaTabellone();

        // lettere delle stazioni, lampeggianti durante l'annuncio
        S.stazioni.forEach(function (s) {
            var lampeggia = s.annuncio > 0 && (Math.floor(S.lampeggio * 4) % 2 === 0);
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            var x = s.c * CELLA + 16, y = s.r * CELLA + 16;
            ctx.fillStyle = lampeggia ? '#ffffff' : '#000000';
            ctx.fillRect(x - 7, y - 8, 14, 16);
            ctx.fillStyle = lampeggia ? '#cc0000' : '#eecc00';
            ctx.fillText(s.lettera, x, y);
        });

        // treni
        S.treni.forEach(function (tr) { disegnaTreno(tr); });

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Tabellone dell'originale, dentro la casella nera da 32x32: tre numeri
    // impilati, senza etichette. Verde = treni ancora da consegnare, azzurro =
    // scontri ancora concessi prima di perdere, giallo = contatore del tempo.
    // I bordi della piastrella mangiano 2 px a sinistra e 1 in alto e a destra,
    // quindi le basi del testo stanno a 13, 21 e 29.
    function disegnaTabellone() {
        var i = S.info;
        if (!i) return;
        var p = parametri();
        var sty = S.stile;
        if (sty) {
            // Il codice 37 non esiste nell'atlante nuovo: la targa nera si
            // disegna qui, se no i numeri finirebbero a galleggiare sul prato.
            ctx.fillStyle = '#0d0d0d';
            ctx.fillRect(i.c * CELLA + 1, i.r * CELLA + 1, CELLA - 2, CELLA - 2);
            ctx.strokeStyle = '#6b6257'; ctx.lineWidth = 1;
            ctx.strokeRect(i.c * CELLA + 1.5, i.r * CELLA + 1.5, CELLA - 3, CELLA - 3);
        } else if (i.finta) {
            ctx.drawImage(atlante, D.info * 32, 0, 32, 32, i.c * CELLA, i.r * CELLA, CELLA, CELLA);
        }
        var x = i.c * CELLA + 16, y = i.r * CELLA;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#00e05a';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(String(Math.max(0, p.ord - S.consegnati)), x, y + 13);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#4aa8ff';
        ctx.fillText(String(Math.max(0, p.inc - S.persi)), x, y + 21);
        ctx.fillStyle = '#ffe000';
        ctx.fillText(String(Math.ceil(S.tempo)), x, y + 29);
    }

    function disegnaTreno(tr) {
        var p = mondo(tr);
        var g = tangente(tr.t, tr.ea, tr.xa);
        // nel rimbalzo la tangente si annulla esattamente a meta' casella:
        // li' si tiene l'inclinazione del lato di entrata.
        if (g[0] * g[0] + g[1] * g[1] < 0.01) g = [LATO[tr.ea][0] - 16, LATO[tr.ea][1] - 16];
        var ang = Math.atan2(g[1], g[0]) + Math.PI / 2;   // lo sprite e' disegnato verso il nord

        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(ang);
        for (var y = 0; y < TRENO.length; y++) {
            for (var x = 0; x < 8; x++) {
                var v = TRENO[y][x];
                ctx.fillStyle = v === '0' ? '#000000' : (v === '2' ? '#ffffff' : tr.colore);
                ctx.fillRect(x - 4, y - 7, 1, 1);
            }
        }
        ctx.restore();

        // la lettera di destinazione sta sempre a nord del convoglio
        if (parametri().dest) {
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillRect(p[0] - 5, p[1] - 17, 10, 12);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(tr.dest, p[0], p[1] - 11);
        }
        if (tr.fermo) {
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(p[0] + 6, p[1] - 2, 9, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p[0] + 6, p[1] - 2, 2, 4);
        }
    }

    // =======================================================================
    //  interfaccia
    // =======================================================================

    function el(id) { return document.getElementById(id); }

    function aggiornaHud() {
        var p = parametri();
        var resta = Math.ceil(S.tempo);
        testo('w2-livello', S.livello + ' · ' + (S.sub + 1) + '/' + D.liv[S.livello].sub.length);
        testo('w2-consegne', S.consegnati + ' / ' + p.ord);
        testo('w2-scontri', S.persi + ' / ' + p.inc);
        testo('w2-punti', String(Math.max(0, S.punti)).padStart(5, '0'));
        testo('w2-tempo', String(resta));
        var barra = el('w2-barra');
        if (barra) barra.style.width = Math.max(0, 100 * S.tempo / (S.tempoMax || 1)) + '%';
        testo('w2-turbo', S.turbo ? '×' + tara().turbo : '');

        var q = el('w2-coda');
        if (q) {
            var righe = S.coda.map(function (o) {
                return '<div class="w2-voce"><b>' + o.part.lettera + ' → ' + o.dest.lettera +
                       '</b><span>' + t('fra', { N: Math.ceil(o.resta) }) + '</span></div>';
            }).concat(S.treni.map(function (tr) {
                var stato = tr.sosta > 0 ? T.sosta : (tr.fermo ? T.fermo : T.viaggio);
                return '<div class="w2-voce' + (tr.fermo ? ' allarme' : '') +
                       '"><b>→ ' + tr.dest + '</b><span>' + stato + '</span></div>';
            }));
            q.innerHTML = righe.join('') || '<div class="w2-vuoto">' + T.vuoto + '</div>';
        }
    }

    function testo(id, v) { var e = el(id); if (e) e.textContent = v; }
    function messaggio(t) { var e = el('w2-messaggio'); if (e) e.textContent = t; }

    function mostraFine() {
        var f = S.finito;
        var e = el('w2-modale');
        if (!e) return;
        // Il quadro dopo sta nella stessa lettera, oppure nella lettera
        // seguente della campagna. Le lettere fuori campagna (M, N) e l'ultimo
        // quadro di L non hanno un dopo: li' il bottone dice "Ricomincia".
        var iLiv = LIVELLI.indexOf(S.livello);
        var dopo = S.sub + 1 < D.liv[S.livello].sub.length ? [S.livello, S.sub + 1]
                 : (iLiv >= 0 && iLiv < LIVELLI.length - 1) ? [LIVELLI[iLiv + 1], 0]
                 : null;
        var avanti = f.vinto && !!dopo;
        e.innerHTML =
            '<div class="w2-riquadro">' +
            '<h2>' + (f.vinto ? T.vinto : T.perso) + '</h2>' +
            '<table>' +
            riga(T.pOrdini, f.ordini) + riga(T.pTempo, f.tempo) +
            riga(T.pScontri, f.scontri) + riga(T.pExtra, f.extra) +
            riga(T.pLivello, f.livello) +
            '<tr class="tot"><td>' + T.totale + '</td><td>' + f.totale + '</td></tr>' +
            '</table>' +
            '<button id="w2-avanti">' + (avanti ? T.avanti : T.ancora) + '</button>' +
            '</div>';
        e.style.display = 'flex';
        el('w2-avanti').onclick = function () {
            e.style.display = 'none';
            if (avanti) carica(dopo[0], dopo[1]);
            else carica(S.livello, S.sub);
        };
    }
    function riga(n, v) { return '<tr><td>' + n + '</td><td>' + v + '</td></tr>'; }

    // =======================================================================
    //  comandi
    // =======================================================================

    function click(ev) {
        if (!S.attivo) return;
        var b = cv.getBoundingClientRect();
        var x = (ev.clientX - b.left) / b.width * LARG;
        var y = (ev.clientY - b.top) / b.height * ALT;
        var c = Math.floor(x / CELLA), r = Math.floor(y / CELLA);
        if (!dentro(r, c)) return;
        var cod = S.griglia[r][c];
        if (D.scambio.indexOf(cod) < 0 && D.segnale.indexOf(cod) < 0) return;
        S.stato[r][c] = S.stato[r][c] ? 0 : 1;
        suona('scambio');
    }

    // Acceleratore. Nell'originale si tiene premuto il tasto destro del mouse
    // sul quadro; qui vale anche la barra spaziatrice, che serve a chi gioca
    // col trackpad e a chi non ha il tasto destro. Si rilascia da solo se il
    // mouse esce dalla finestra o se la pagina perde il fuoco, altrimenti il
    // gioco resterebbe accelerato senza che nessuno tenga premuto niente.
    function turboOn(e) { if (e.button === 2 && S.attivo) S.turbo = true; }
    function turboOff() { S.turbo = false; }

    function tasti(e) {
        if (e.altKey) return;
        if (e.key === 'r' || e.key === 'R') carica(S.livello, S.sub);
        if (e.key === ' ' && S.attivo) { S.turbo = true; e.preventDefault(); }
    }
    function tastiSu(e) { if (e.key === ' ') S.turbo = false; }

    // =======================================================================
    //  suoni: segnaposto, i campioni originali arriveranno dopo
    // =======================================================================
    var audioOn = true;
    function suona(che) {
        if (!audioOn || !window.AudioContext) return;
        try {
            var C = suona.ctx || (suona.ctx = new AudioContext());
            var o = C.createOscillator(), g = C.createGain();
            var f = { annuncio: 220, partenza: 330, arrivo: 660, scontro: 90, scambio: 1200, rimbalzo: 160 }[che] || 440;
            o.frequency.value = f;
            o.type = che === 'scontro' ? 'sawtooth' : 'square';
            g.gain.value = 0.05;
            o.connect(g); g.connect(C.destination);
            o.start(); o.stop(C.currentTime + (che === 'scontro' ? 0.4 : 0.12));
        } catch (err) { /* audio non disponibile */ }
    }

    // =======================================================================
    //  avvio
    // =======================================================================

    // Carica una lista di immagini e chiama `poi` quando sono tutte ferme,
    // caricate o fallite che siano: un errore non deve piantare l'avvio.
    function immagini(lista, poi) {
        var resta = lista.length, out = [];
        lista.forEach(function (src, i) {
            var im = new Image();
            im.onload = im.onerror = function () { if (--resta === 0) poi(out); };
            im.src = src;
            out[i] = im;
        });
    }

    function avvia() {
        cv = el('w2-canvas');
        if (!cv) return;
        cv.width = LARG * SCALA; cv.height = ALT * SCALA;
        ctx = cv.getContext('2d');
        cv.addEventListener('click', click);
        cv.addEventListener('mousedown', turboOn);
        cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        window.addEventListener('mouseup', turboOff);
        window.addEventListener('blur', turboOff);
        document.addEventListener('keydown', tasti);
        document.addEventListener('keyup', tastiSu);

        // Due tendine distinte: il dischetto A..L e i quadri nostri M..X.
        // Vale sempre l'ultima toccata, e l'altra torna sul suo capofila per
        // dire a colpo d'occhio da quale banco si sta giocando.
        montaSelettori();
        var ba = el('w2-audio');
        if (ba) ba.onclick = function () { audioOn = !audioOn; ba.textContent = audioOn ? '🔊' : '🔇'; };

        // Si parte quando sono arrivate tutte: l'atlante del dischetto piu'
        // atlante e dipinto di ogni stile nominato nei dati.
        var stili = stiliUsati();
        var lista = ['images/woowoo2/tiles.png?v=1.0'];
        stili.forEach(function (x) { lista.push(x.atlante, x.sfondo); });
        immagini(lista, function (im) {
            atlante = im[0];
            stili.forEach(function (x, i) {
                x.img = im[1 + i * 2];
                x.fondoImg = im[2 + i * 2];
            });
            pronto = true; carica('A', 0); ciclo();
        });
    }

    var prec = 0;
    function ciclo(ts) {
        var dt = prec ? Math.min(0.1, (ts - prec) / 1000) : 0;
        prec = ts;
        // Il tetto va messo PRIMA del moltiplicatore, se no un fotogramma
        // lungo verrebbe amplificato e il treno salterebbe delle caselle.
        if (S.turbo) dt *= tara().turbo;
        passo(dt);
        disegna();
        requestAnimationFrame(ciclo);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
})();
