/* ===========================================================================
   WooWoo2 - motore di gioco
   ---------------------------------------------------------------------------
   Meccanica ricavata dal dischetto originale Locomotion (Kingsoft 1992):
   45 schemi, tabella degli scambi a due stati, parametri dei 9 sottolivelli
   di ogni livello. I dati stanno in dev/woowoo2-dati.js. Gli schemi del dischetto
   erano 10x8; il tabellone nostro e' 15x9 e se li tiene in mezzo, col prato
   intorno (vedi dev/woowoo2-allarga.py). I numeri che nell'originale stavano
   nella casella nera del dischetto qui non sono sul quadro: stanno nella
   fascia sopra, al centro (vedi aggiornaHud).

   ATTENZIONE: la grafica di dev/tiles.png e' quella originale Kingsoft,
   grafica di cantiere per validare la meccanica. Sta in dev/ con tutto il
   resto del materiale del dischetto, e quella cartella non si carica sul
   server: e' tutta la regola di pubblicazione.
   Dal 5/10/2026 quel file si carica SOLO se serve, cioe' se in campagna c'e'
   almeno uno schema senza grafica nostra (vedi serveDisco). Nella versione
   pubblicata la campagna sono i quadri nostri, che il dipinto ce l'hanno
   tutti: li' il file non viene nemmeno chiesto, e il gioco gira per intero
   senza una piastrella del dischetto. Lo stile di ogni schema sta nel campo
   `stile` dei file di dati (vedi stileDi).
   =========================================================================== */
(function () {
    'use strict';

    var D = window.W2DATI;

    // Il dischetto porta quindici lettere di livello, ma **A..L sono il gioco e
    // M, W, X servono all'editor**: infatti hanno `s`=0 su tutti e nove i
    // sottolivelli e i loro schemi 1 e 2 sono ottanta caselle di prato vuoto.
    // `dev/woowoo2-dati.js` resta l'estrazione completa del dischetto, il filtro
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
                return r.some(function (v) { return v !== 0; });
            });
        });
    }
    var NOSTRI = MIEI ? MIEI.ordine.filter(disegnato) : [];

    // Nella versione pubblicata il dischetto non si vede: si gioca soltanto sui
    // quadri nostri, e a video non si chiamano M, N, O... ma A, B, C..., perche'
    // per chi gioca sono il primo, il secondo, il terzo livello. La lettera vera
    // resta quella interna -- serve a pescare dentro D.liv -- e quella da
    // mostrare la da' `nome`. In dev_mode non cambia niente: si vedono tutte e
    // due le tendine e le lettere sono quelle vere.
    var DEV = (function () {
        try { return localStorage.getItem('dev_mode') === '1'; } catch (e) { return false; }
    })();
    var CAMPAGNA = (DEV || !NOSTRI.length) ? LIVELLI : NOSTRI;
    function nome(L) {
        if (CAMPAGNA === LIVELLI) return L;
        var i = CAMPAGNA.indexOf(L);
        return i >= 0 ? 'ABCDEFGHIJKL'.charAt(i) : L;
    }

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
        if (!st || typeof st !== 'object') return null;
        // Se atlante o dipinto non sono arrivati lo schema si disegna con le
        // piastrelle del dischetto: brutto ma giocabile, e soprattutto lo si
        // vede. Prima si provava a stenderlo lo stesso e drawImage buttava
        // fuori un errore che fermava il ciclo: il quadro restava congelato
        // sull'ultimo fotogramma e sembrava che il gioco non cambiasse mai
        // livello.
        return st.rotto ? null : st;
    }

    // Tutti i disegni citati dai dati, senza doppioni: servono al caricatore.
    // Dice se lo schema porta un dipinto. Si guarda il dato e non `stileDi`,
    // che torna null quando il dipinto non e' arrivato: la velocita' dei treni
    // non deve dipendere da un file che il server non ha servito.
    function haDipinto(L, n) {
        var liv = D.liv[L];
        var st = liv && liv.stile && liv.stile[n];
        return !!(st && typeof st === 'object' && st.sfondo);
    }

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

    // Serve l'atlante del dischetto? Solo se in campagna c'e' almeno uno
    // schema senza grafica nostra. In dev_mode si gioca anche sui quadri del
    // dischetto e serve sempre; nella versione pubblicata la campagna sono i
    // quadri nostri, che il dipinto ce l'hanno tutti, e quel file non si
    // chiede nemmeno. E' quello che permette a dev/ di restare fuori dal
    // server senza che a video manchi niente.
    function serveDisco() {
        return CAMPAGNA.some(function (L) {
            var liv = D.liv[L];
            if (!liv) return false;
            var st = liv.stile || [];
            return liv.schemi.some(function (_, n) {
                return !(st[n] && typeof st[n] === 'object');
            });
        });
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
        scontro: EN ? 'Crash! Crashes left: {A} of {B}.'
                    : 'Scontro! Scontri rimasti: {A} di {B}.',
        vinto: EN ? 'Board cleared' : 'Quadro superato',
        perso: EN ? 'Game over' : 'Partita finita',
        finale: EN ? 'Congratulations!' : 'Complimenti!',
        finaleTesto: EN ? 'You have cleared every board in the game. New ones are on the way soon.'
                        : 'Hai superato tutti i quadri del gioco. Presto se ne aggiungeranno dei nuovi.',
        annVinto: EN ? 'Mission accomplished!' : 'Missione compiuta!',
        annFinale: EN ? 'Every board cleared!' : 'Tutti i quadri superati!',
        annTempo: EN ? 'Out of time' : 'Tempo scaduto',
        annScontri: EN ? 'Too many crashes' : 'Troppi scontri',
        annFra: EN ? 'summary in {N} s' : 'riepilogo fra {N} s',
        annSubito: EN ? 'summary coming up' : 'riepilogo in arrivo',
        rConsegne: EN ? 'Deliveries' : 'Consegne',
        rScontri: EN ? 'Crashes' : 'Scontri',
        rTempo: EN ? 'Time left' : 'Tempo avanzato',
        avanti: EN ? 'Next board' : 'Quadro successivo',
        ripeti: EN ? 'Replay this board' : 'Ripeti il quadro',
        scegli: EN ? 'Choose a board' : 'Scegli il quadro',
        viaggio: EN ? 'running {N} s' : 'in viaggio {N} s',
        sosta: EN ? 'leaving in {N} s' : 'in partenza tra {N} s',
        fermo: EN ? 'HELD {F} s \u00b7 running {N} s' : 'FERMO {F} s \u00b7 viaggio {N} s',
        fra: EN ? 'in {N} s' : 'tra {N} s',
        vuoto: EN ? 'no orders' : 'nessun ordine',
        voceLiv: EN ? 'Level {L} · board {N}' : 'Livello {L} · quadro {N}',
        capoBase: EN ? 'Disk A–L' : 'Dischetto A–L',
        capoMiei: EN ? 'Mine M–X' : 'Miei M–X',
        capoSolo: EN ? 'Levels' : 'Livelli'
    };
    function t(k, v) {
        return T[k].replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] !== undefined ? v[n] : m; });
    }

    // ---- geometria -------------------------------------------------------
    var CELLA = 32;          // lato della casella in pixel originali
    var SCALA = 2;           // fattore di ingrandimento a video
    var COLS = 15, RIGHE = 9;   // i quadri del dischetto, 10x8, stanno dentro con del prato intorno
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

    // EMISSIONE DEGLI ORDINI. Il ritmo NON si ricava da `sec'. A/1, A/2 e A/3
    // hanno tutti sec 25 e ritmi misurati di 40, 32 e 30 secondi: la vecchia
    // regola "un ordine ogni sec secondi" e' SCARTATA, e con essa il fattore
    // F_RITMO = 1,5 che era tarato sul solo A/1 (37,5 contro 40) e su A/7
    // sbagliava del 75% (31,5 contro 18).
    // La regola vera e':
    //     periodo = (4 + 2 * traf) scatti di contatore
    // cioe' (4 + 2*traf) x 50 pixel di percorso di un treno. Centra tutti e
    // nove i quadri di A misurati su tre partite video. `traf' e' il parametro
    // "traffico" del dischetto sulla scala rovesciata (0 = Maximum, 4 = Tief),
    // quindi da' 4, 6, 8, 10 e 12 scatti dal traffico piu' fitto al piu' rado.
    // Il candidato alternativo era `inc', che pero' sbaglia su A/2; i due
    // campi differiscono nel 39% dei 135 sottolivelli del dischetto, percio' la
    // distinzione e' reale e non una coincidenza. `inc' resta senza significato.
    // Il metronomo gira in secondi reali per conto suo, NON e' agganciato ai
    // cali del contatore: misurati fra due annunci, quei cali vanno da 0 a 58.
    //
    // ANTICIPO E' STATO TOLTO. Faceva 3, 2 o 1 annunci extra ravvicinati
    // all'avvio secondo `traf'. Le tre partite lo smentiscono: A/4, A/5 e A/6
    // (traf 2) partono con 24,0 / 24,0 / 24,0 puliti e A/7, A/8, A/9 (traf 1)
    // con 18,0 / 18,0 / 18,0, senza nessun extra. Era una pezza che compensava
    // il ritmo di base troppo lento; raddrizzato il ritmo, non serve piu'.
    //
    // F_RIPROVA resta: quando l'annuncio non si puo' fare (quadro pieno o
    // tutte le stazioni occupate) non si riprova subito, se no appena si libera
    // un posto parte una raffica. Si riprova dopo una frazione del ritmo.
    // Il tetto `tmax' fa il resto: a quadro pieno l'emissione si ferma e
    // riprende alla prima consegna, quindi l'intervallo non e' mai costante.
    var F_RIPROVA = 0.3;

    // Moltiplicatore del ritmo, da lasciare a 1. Serve solo per confrontare a
    // occhio con UAE senza ricaricare la pagina.
    var F_RITMO = 1;

    // IL CONTATORE NON E' UN OROLOGIO, E NON MISURA NEMMENO IL TEMPO: MISURA
    // LO SPAZIO. Il numero mostrato cala di UNO ogni PXSCATTO pixel percorsi
    // da CIASCUN TRENO presente sul quadro. A quadro vuoto e' fermo, con due
    // treni scende il doppio, con tre il triplo.
    // Misurato fotogramma per fotogramma (campionamento a 100 ms) su tutti e
    // nove i quadri di A: lo scatto vale 4,00 s dove `vel' e' 4 (A/1 e A/2) e
    // 3,00 s dove `vel' e' 3 (da A/3 a A/9), e a quadro vuoto non scatta mai,
    // nemmeno durante l'annuncio. Quelle due velocita' sono 12,5 e 16,67 px/s,
    // e 12,5 x 4,00 = 16,67 x 3,00 = 50 pixel: da li' PXSCATTO.
    // In fotogrammi PAL a 50 Hz sono 200 e 150; sugli altri tre gradini della
    // scala delle velocita' vengono 100, 75 e 50, tutti multipli di 25. E' una
    // conferma di rimbalzo della ricostruzione della scala qui sopra, che per
    // `vel' 1, 2 e 3 era dichiarata solo una stima: il gradino 3 adesso e'
    // misurato, gli altri due cadono su numeri tondi.
    // IL CONTO SI TIENE IN SECONDI, NON IN PIXEL DAVVERO PERCORSI. Il
    // conteggio comincia dalla comparsa in stazione, quindi la sosta in
    // banchina consuma gia' (per questo fallaPartire() mette il treno in
    // S.treni con la sosta ancora da scontare), e per lo stesso motivo un
    // treno fermo a uno scambio continua a consumare.
    // F_LARGO NON ENTRA QUI. Sui quadri nostri i treni corrono di piu' apposta,
    // per compensare i percorsi piu' lunghi; se accelerasse anche lo scatto la
    // compensazione si annullerebbe e un quadro largo costerebbe comunque di
    // piu'. Lo scatto si prende dalla velocita' nuda del sottolivello.
    var PXSCATTO = 50;
    var TRENOSEC = [];
    for (var iv = 0; iv < VELOCITA.length; iv++) TRENOSEC[iv] = PXSCATTO / (VELOCITA[iv] * 32);

    // ACCELERATORE. Nell'originale si tiene premuto il tasto destro del mouse
    // per far correre il gioco piu' in fretta. Moltiplica il tempo, quindi
    // accelera TUTTO: treni, annunci e anche il consumo del contatore.
    // Fattore 4, verificato dall'utente in UAE il 25/09/2026 (non 2).
    var TURBO = 4;

    // QUADRI LARGHI. Il tabellone e' 15x9; i quadri del dischetto sono 10x8 con
    // l'erba intorno, quelli nostri usano tutto lo spazio e hanno percorsi piu'
    // lunghi. Il contatore non e' un orologio, si consuma in treni-secondo:
    // a parita' di velocita' una consegna su un quadro largo tiene il treno in
    // pista piu' a lungo, costa di piu', e il budget tarato sul dischetto non
    // basta. Si rimette in pari accelerando i treni - il viaggio torna a durare
    // quanto prima, quindi il consumo torna quello di prima e il contatore
    // finale non ci rimette niente. Accelerare NON toglie tempo: il tempo lo
    // mangiano i treni in pista, non l'orologio.
    // La sosta in stazione (0,33 x sec) non si tocca: non e' cresciuta col
    // tabellone, e infatti non dev'essere compensata.
    // Il riconoscimento e' il dipinto: i quadri larghi li disegniamo noi e
    // hanno tutti uno sfondo nostro, quelli del dischetto nessuno.
    var F_LARGO = 1.35;

    // Manopole di taratura, per confrontare a occhio con UAE senza ricaricare.
    window.W2TARA = {
        velocita: VELOCITA, fAnnuncio: F_ANNUNCIO, fSosta: F_SOSTA,
        fRitmo: F_RITMO, fRiprova: F_RIPROVA,
        trenoSec: TRENOSEC, pxScatto: PXSCATTO,
        fLargo: F_LARGO,
        turbo: TURBO
    };

    // Valore iniziale del contatore. La vecchia ipotesi `ord*sec+inc' e'
    // SCARTATA: su A/2 avrebbe dato 260 e `inc' vale 10 su tutti e tre i primi
    // quadri, quindi il conto tornava su A/1 solo per coincidenza.
    // VERIFICATO il 29/09/2026 su tutti e nove i quadri di A, letti da tre
    // partite video indipendenti: 135, 270, 270, 250, 220, 240, 345, 300, 330.
    // `ord*(sec+2)` li azzecca tutti e nove senza scarto. Cade cosi' l'altra
    // lettura rimasta aperta, `sec*1,08`, che su A/8 (ord 15, sec 18) avrebbe
    // dato 292 invece dei 300 misurati.
    // Nota: il budget NON e' proporzionale ai soli ordini, come sembrava
    // quando si conoscevano i tre quadri con sec 25. Vale da 22 a 27 unita'
    // per ordine a seconda di sec. In secondi-treno sono quattro volte tanto.
    function contatoreIniziale(p) { return p.ord * (p.sec + 2); }
    function tara() { return window.W2TARA; }

    var COLORI = ['#cc0000', '#eecc00', '#22aaee', '#ee7700', '#bb44cc', '#22cc66'];

    // Il colore distingue un convoglio dall'altro, non dice dove va: si pesca
    // a caso fra quelli che in questo momento non sono in giro, cosi' due treni
    // contemporanei non si somigliano mai. Si evita anche il colore appena
    // usato, altrimenti due annunci di fila escono uguali. Se sono tutti presi
    // si ripesca dall'intero mazzo.
    var ultimoColore = '';

    function coloreACaso() {
        var usati = S.treni.map(function (t) { return t.colore; })
            .concat(S.coda.map(function (o) { return o.colore; }));
        usati.push(ultimoColore);
        var liberi = COLORI.filter(function (c) { return usati.indexOf(c) < 0; });
        var mazzo = liberi.length ? liberi : COLORI;
        ultimoColore = mazzo[Math.floor(Math.random() * mazzo.length)];
        return ultimoColore;
    }

    // ---- stato -----------------------------------------------------------
    var S = {
        livello: 'A', sub: 0,
        griglia: null,      // [r][c] codice
        stato: null,        // [r][c] stato dello scambio (0/1)
        stazioni: [],       // {r,c,lettera,uscita}
        treni: [],
        coda: [],           // ordini annunciati non ancora comparsi
        consegnati: 0, scontri: 0, persi: 0,
        tempo: 0, tempoMax: 0, prossimo: 0,
        attivo: false, finito: null, largo: false,
        lampeggio: 0,
        turbo: false
    };

    window.W2STATO = S;          // sonda per la console e per il banco di prova

    // ---- registro delle uscite -------------------------------------------
    // Si scrive una riga a ogni fatto della vita di un treno:
    //   annunciato          la lettera comincia a lampeggiare
    //   tetto tmax          il metronomo ha suonato ma la pista e' piena
    //   stazioni occupate   il metronomo ha suonato ma nessuna stazione e' libera
    //   consegnato          arrivato alla sua meta
    //   sbagliata           entrato nella stazione sbagliata e rimbalzato fuori
    //   scontro             due treni sovrapposti: una riga per ciascuno
    //   fuori quadro        uscito dal bordo del tabellone (non dovrebbe capitare)
    // Sul ritmo: la colonna `dal_prec' (secondi fra un annuncio e il precedente)
    // va confrontata con `atteso', che e' `(4 + 2*traf) * scatto'. Sui treni:
    // `durata' e' quanto e' vissuto il convoglio dalla comparsa, sosta compresa.
    // Il tempo e' quello di gioco, quindi il turbo non falsa il conto. Il registro non si azzera a fine quadro: la colonna `run'
    // numera le esecuzioni, cosi' si gioca tutta la partita e si scarica una
    // volta sola.
    // Dalla console: W2LOGCSV() stampa, W2LOGSCARICA() salva il file,
    // W2LOGAZZERA() ricomincia da capo.
    var LOG = [], LOGMAX = 5000, logPrec = null, logRun = 0;
    var LOGCOL = ['run', 'quadro', 't', 'esito', 'part', 'dest', 'dove',
                  'dal_prec', 'atteso', 'durata', 'in_pista', 'in_coda', 'tmax',
                  'consegnati', 'persi', 'emessi', 'contatore'];

    function treniInPista() {
        var n = 0;
        for (var i = 0; i < S.treni.length; i++) if (!S.treni[i].morto) n++;
        return n;
    }

    // `d' porta i dati dell'avvenimento: part (stazione di partenza), dest
    // (lettera della meta), dove (stazione in cui e' capitato il fatto), durata.
    function registra(esito, d) {
        if (LOG.length >= LOGMAX) return;
        d = d || {};
        var p = parametri();
        LOG.push({
            run: logRun,
            quadro: S.livello + '/' + (S.sub + 1),
            t: S.orologio,
            esito: esito,
            part: d.part || '',
            dest: d.dest || '',
            dove: d.dove || '',
            dal_prec: esito !== 'annunciato' ? '' : (logPrec === null ? 0 : S.orologio - logPrec),
            atteso: (4 + 2 * p.traf) * tara().trenoSec[p.vel] * tara().fRitmo,
            durata: d.durata === undefined ? '' : d.durata,
            in_pista: treniInPista(),
            in_coda: S.coda.length,
            tmax: p.tmax,
            consegnati: S.consegnati,
            persi: S.persi,
            emessi: S.emessi,
            contatore: S.tempo
        });
        if (esito === 'annunciato') logPrec = S.orologio;
    }

    // Comodo per le righe che riguardano un treno.
    function datiTreno(tr, dove) {
        return { part: tr.partenza, dest: tr.dest, dove: dove || '',
                 durata: S.orologio - tr.nato };
    }

    // ---- scheda per treno -------------------------------------------------
    // Stesse colonne dei CSV ricavati dai filmati del gioco vero: quattro
    // momenti nella vita del convoglio (annuncio, comparsa, partenza dopo la
    // sosta, fine) e per ognuno il tempo E il valore del contatore, che la' si
    // chiama `virtual_timer'. Serve per incrociare riga per riga il nostro
    // motore con l'originale: stessa griglia di colonne, stesse unita'.
    // Due avvertenze per il confronto: i tempi dei filmati sono l'orologio del
    // video (mm:ss.xx) mentre i nostri ripartono da zero a ogni quadro, quindi
    // si confrontano le DIFFERENZE; e nei loro CSV la colonna
    // `estimated_speed_px_s' e la distanza spawn->departure sono ricostruite a
    // tavolino, non misurate, quindi non fanno testo.
    var TRENI = [], logId = 0;
    var TRECOL = ['run', 'quadro', 'treno', 'colore', 'part', 'dest',
                  't_annuncio', 'c_annuncio', 't_comparsa', 'c_comparsa',
                  't_partenza', 'c_partenza', 'esito', 'dove', 't_fine', 'c_fine'];
    var NOMICOL = ['Rosso', 'Giallo', 'Azzurro', 'Arancio', 'Viola', 'Verde'];

    function nomeColore(c) {
        var i = COLORI.indexOf(c);
        return i < 0 ? c : NOMICOL[i];
    }

    function schedaNuova(o) {
        if (TRENI.length >= LOGMAX) return;
        TRENI.push({
            run: logRun, quadro: S.livello + '/' + (S.sub + 1),
            treno: o.id, colore: nomeColore(o.colore),
            part: o.part.lettera, dest: o.dest.lettera,
            t_annuncio: S.orologio, c_annuncio: S.tempo,
            t_comparsa: '', c_comparsa: '', t_partenza: '', c_partenza: '',
            esito: '', dove: '', t_fine: '', c_fine: ''
        });
    }

    function scheda(id) {
        for (var i = TRENI.length - 1; i >= 0; i--) {
            if (TRENI[i].treno === id && TRENI[i].run === logRun) return TRENI[i];
        }
        return null;
    }

    function segna(id, campi) {
        var s = scheda(id);
        if (!s) return;
        for (var k in campi) if (campi.hasOwnProperty(k)) s[k] = campi[k];
    }

    function fineScheda(tr, esito, dove) {
        segna(tr.id, { esito: esito, dove: dove, t_fine: S.orologio, c_fine: S.tempo });
    }

    // CSV all'italiana: punto e virgola, virgola decimale, BOM per Excel.
    function csv(col, righe) {
        var out = [col.join(';')];
        righe.forEach(function (r) {
            out.push(col.map(function (k) {
                var v = r[k];
                if (typeof v !== 'number') return v;
                return (Math.round(v * 100) / 100).toString().replace('.', ',');
            }).join(';'));
        });
        return out.join('\r\n');
    }

    function salva(nome, testo) {
        var b = new Blob(['\ufeff' + testo], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = nome;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    window.W2LOG = LOG;
    window.W2TRENI = TRENI;
    window.W2LOGCSV = function () { var s = csv(LOGCOL, LOG); console.log(s); return s; };
    window.W2TRENICSV = function () { var s = csv(TRECOL, TRENI); console.log(s); return s; };
    window.W2LOGAZZERA = function () {
        LOG.length = 0; TRENI.length = 0; logPrec = null;
        return 'registro azzerato';
    };
    window.W2LOGSCARICA = function () {
        salva('woowoo2-avvenimenti.csv', csv(LOGCOL, LOG));
        salva('woowoo2-treni.csv', csv(TRECOL, TRENI));
        return LOG.length + ' avvenimenti, ' + TRENI.length + ' treni';
    };

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
    // si legge soltanto nel riepilogo di fine quadro, e non vale niente.
    // Riempie una tendina con le lettere passate. La prima voce e' il
    // capofila: non e' un quadro, serve da titolo e da posizione di riposo
    // quando la scelta e' stata fatta nell'altra tendina.
    function riempi(sel, lettere, capo) {
        var o = document.createElement('option');
        o.value = ''; o.textContent = capo; sel.appendChild(o);
        lettere.forEach(function (l) {
            for (var i = 0; i < D.liv[l].sub.length; i++) {
                var x = document.createElement('option');
                // Il valore porta la lettera vera, il testo quella mostrata.
                x.value = l + ':' + i;
                x.textContent = t('voceLiv', { L: nome(l), N: i + 1 });
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

    // RICOMINCIA rifa' il quadro che si sta giocando, non ricarica la pagina:
    // ricaricando si tornava al primo quadro e si perdeva la scelta fatta.
    function montaRicomincia() {
        var b = el('w2-ricomincia');
        if (!b) return;
        b.onclick = function () {
            if (!pronto) return;            // il primo quadro non c'e' ancora
            var e = el('w2-modale');
            if (e) e.style.display = 'none';
            carica(S.livello, S.sub);
        };
    }

    function montaSelettori() {
        var a = el('w2-scelta'), b = el('w2-scelta2');
        if (CAMPAGNA === LIVELLI) {
            if (a) riempi(a, LIVELLI, t('capoBase'));
            if (b) riempi(b, NOSTRI, t('capoMiei'));
        } else {
            // Una tendina sola, con i nostri quadri: l'altra non ha niente da
            // mostrare e sparisce, titolo compreso.
            if (a) { riempi(a, CAMPAGNA, t('capoSolo')); a.title = t('capoSolo'); }
            if (b) b.style.display = 'none';
        }
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
        S.largo = haDipinto(liv, p.s);
        var sch = D.liv[liv].schemi[p.s];

        S.griglia = sch.map(function (r) { return r.slice(); });
        S.stato = [];
        // Millisecondi di movimento che restano a ogni scambio. Vive a fianco
        // di S.stato e non dentro: lo stato cambia di scatto e comanda il
        // gioco, questo e' solo il disegno che lo rincorre.
        S.mossa = [];
        for (var r = 0; r < RIGHE; r++) {
            S.stato.push([]); S.mossa.push([]);
            for (var c = 0; c < COLS; c++) { S.stato[r].push(0); S.mossa[r].push(0); }
        }

        // stazioni in ordine di lettura, lettera A, B, C...
        S.stazioni = [];
        for (var r2 = 0; r2 < RIGHE; r2++) {
            for (var c2 = 0; c2 < COLS; c2++) {
                var u = D.staz[S.griglia[r2][c2]];
                if (u) S.stazioni.push({ r: r2, c: c2, uscita: u, lettera: '', annuncio: 0 });
            }
        }
        S.stazioni.forEach(function (s, i) {
            s.lettera = String.fromCharCode(65 + i);
            var ci = cifraStazione(i);
            s.serie = ci.serie;
            s.colpi = ci.colpi;
        });

        S.stazioni.forEach(function (s) { s.mete = raggiungibili(s); });

        S.treni = []; S.coda = [];
        S.consegnati = 0; S.scontri = 0; S.persi = 0;
        S.tempo = contatoreIniziale(p);
        S.tempoMax = S.tempo;            // tetto della barra
        S.orologio = 0;                  // secondi veri, per la schedulazione
        S.prossimo = 2;                  // il primo annuncio arriva quasi subito
        S.emessi = 0;                    // ordini gia' annunciati
        logRun++; logPrec = null;        // nuova esecuzione nel registro
        S.attivo = true; S.finito = null; S.turbo = false; S.pausa = false;
        annullaFine();                   // il cartello del quadro di prima

        messaggio(t('quadro', { L: nome(liv), N: sub + 1, M: D.liv[liv].sub.length,
                                O: p.ord, S: S.stazioni.length }));
        aggiornaHud();
        aggiornaPausa();
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

    // C'e' un treno fermo sulla casella della stazione? O e' in sosta prima
    // di partire, o si e' piantato li' sopra: in tutt'e due i casi la lettera
    // deve continuare a lampeggiare, se no l'annuncio finisce e il treno in
    // attesa resta senza segnalazione.
    function fermoSu(st) {
        for (var j = 0; j < S.treni.length; j++) {
            var tr = S.treni[j];
            if (tr.morto || tr.r !== st.r || tr.c !== st.c) continue;
            if (tr.sosta > 0 || tr.fermo) return true;
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
            id: ++logId,
            part: part, dest: part.mete[Math.floor(Math.random() * part.mete.length)],
            resta: p.sec * tara().fAnnuncio,
            colore: coloreACaso(),
            modello: Math.floor(Math.random() * MODELLI.length)
        });
        part.annuncio = p.sec * tara().fAnnuncio;
        schedaNuova(S.coda[S.coda.length - 1]);
        suona('annuncio', part);
        return true;
    }

    function fallaPartire(o) {
        var p = parametri();
        var st = o.part;
        S.treni.push({
            r: st.r, c: st.c,
            ea: OPP[st.uscita], xa: st.uscita, t: 0.5,
            dest: o.dest.lettera, colore: o.colore, modello: o.modello,
            partenza: st.lettera, nato: S.orologio, id: o.id,   // per il registro
            sosta: p.sec * tara().fSosta, fischiato: false, fischioDa: 0,
            // Due marcatempo per l'orario: quando si e' mosso la prima volta
            // e da quando sta fermo (null se cammina). Si leggono per
            // differenza da S.orologio, che e' il tempo di gioco.
            mosso: null, daFermo: null,
            fermo: false, uscito: false
        });
        segna(o.id, { t_comparsa: S.orologio, c_comparsa: S.tempo });
    }

    // Prova a far entrare il treno nella casella successiva.
    function avanza(tr) {
        var d = DIR[tr.xa];
        var nr = tr.r + d.dr, nc = tr.c + d.dc;
        if (!dentro(nr, nc)) {
            tr.morto = true;
            registra('fuori quadro', datiTreno(tr));
            fineScheda(tr, 'fuori quadro', '');
            return;
        }

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

        // Dentro c'e' gia' un treno che aspetta di partire: si sbatte, e non
        // conta se questa era la stazione giusta o quella sbagliata.
        var occupante = inAttesa(r, c, tr);
        if (occupante) {
            tr.r = r; tr.c = c; tr.ea = entrata; tr.xa = entrata; tr.t = 0.5;
            tr.fermo = false; tr.uscito = true;
            scontro(tr, occupante);
            return;
        }

        if (st && st.lettera === tr.dest) {
            tr.morto = true;                  // consegnato: sparisce subito
            S.consegnati++;
            // La fanfara della consegna e' la stessa del quadro vinto: se
            // l'ultima consegna le suonasse tutte e due si sentirebbe doppia.
            // Qui suona solo quando il quadro va avanti; alla fine ci pensa
            // `fine`, che sa anche se e' l'ultimo quadro di tutti.
            if (S.consegnati < parametri().ord) suona('arrivo');
            messaggio(t('consegna', { S: st.lettera, A: S.consegnati, B: parametri().ord }));
            registra('consegnato', datiTreno(tr, st.lettera));
            fineScheda(tr, 'consegnato', st.lettera);
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
        registra('sbagliata', datiTreno(tr, st ? st.lettera : '?'));
    }

    // =======================================================================
    //  aggiornamento
    // =======================================================================

    // Il cronometro del treno bloccato: parte quando si pianta, si azzera
    // appena riparte. Va chiamato dopo avanza(), che e' l'unico a muovere
    // `fermo' nei due versi.
    function orologioFermo(tr) {
        if (tr.fermo) { if (tr.daFermo === null) tr.daFermo = S.orologio; }
        else tr.daFermo = null;
    }

    function passo(dt) {
        // Il movimento degli scambi scorre anche a quadro finito, se no uno
        // scambio commutato all'ultimo resterebbe congelato a mezza strada.
        // In turbo scatta piu' svelto, come tutto il resto.
        if (S.mossa) {
            for (var mr = 0; mr < RIGHE; mr++) {
                for (var mc = 0; mc < COLS; mc++) {
                    if (S.mossa[mr][mc] > 0) {
                        S.mossa[mr][mc] = Math.max(0, S.mossa[mr][mc] - dt * 1000);
                    }
                }
            }
        }
        if (!S.attivo) return;
        var p = parametri();

        S.lampeggio += dt;
        S.orologio += dt;

        // Il contatore scende solo per i treni presenti sul quadro (comparsi e
        // non ancora spariti), uno ogni TRENOSEC secondi ciascuno.
        var inPista = 0;
        for (var q = 0; q < S.treni.length; q++) if (!S.treni[q].morto) inPista++;
        S.tempo -= inPista * dt / tara().trenoSec[p.vel];
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
        // raffica, uno dietro l'altro. Da li' le partenze ammucchiate che
        // nell'originale non si vedono.
        S.prossimo -= dt;
        var ritmo = (4 + 2 * p.traf) * tara().trenoSec[p.vel] * tara().fRitmo;
        // Il metronomo non si ferma mai. Qui c'era un freno nostro, non del
        // dischetto: si smetteva di annunciare appena fra consegnati, treni in
        // pista e coda si arrivava a `ord`, e cosi' la parte finale del quadro
        // restava deserta. Nel gioco vero i treni continuano ad arrivare fino
        // all'ultima consegna. Tolto il 29/09/2026: a limitare l'emissione
        // restano solo `tmax' e le stazioni libere.
        if (S.prossimo <= 0) {
            // `tmax' conta i treni VISIBILI, non anche gli annunci in corso.
            // Ricostruendo la comparsa come annuncio + 0,52*sec sui 361 treni
            // delle tre partite, il massimo di treni insieme non supera mai
            // `tmax' in nessuna delle 25 esecuzioni di quadro e lo tocca in
            // nove; contando anche la coda il tetto risulterebbe sfondato su
            // cinque quadri. Sommare S.coda soffocava l'emissione.
            var posto = S.treni.length < p.tmax;
            if (posto && nuovoOrdine()) {
                S.emessi++;
                S.prossimo = ritmo;
                var ann = S.coda[S.coda.length - 1];
                registra('annunciato', { part: ann.part.lettera, dest: ann.dest.lettera });
            } else {
                // niente posto o nessuna stazione libera: si riprova piu' tardi,
                // non al primo fotogramma utile.
                S.prossimo = ritmo * tara().fRiprova;
                registra(posto ? 'stazioni occupate' : 'tetto tmax', null);
            }
        }

        // treni
        var v = tara().velocita[p.vel] * (S.largo ? tara().fLargo : 1);
        for (var k = 0; k < S.treni.length; k++) {
            var tr = S.treni[k];
            if (tr.sosta > 0) {
                tr.sosta -= dt;
                // Il fischio annuncia la partenza, quindi va prima: comincia
                // quando alla sosta resta esattamente la sua durata, e l'ultima
                // nota cade sullo scatto delle ruote. Se la sosta e' piu' corta
                // del fischio non si puo' anticipare di piu' e parte subito.
                if (!tr.fischiato && tr.sosta <= durataFischio()) {
                    tr.fischiato = true;
                    tr.fischioDa = S.orologio;
                    suona('partenza');
                }
                if (tr.sosta <= 0) {
                    tr.mosso = S.orologio;
                    segna(tr.id, { t_partenza: S.orologio, c_partenza: S.tempo });
                }
                continue;
            }
            if (tr.fermo) { avanza(tr); orologioFermo(tr); continue; }   // riprova a ogni giro: riparte da solo
            tr.t += v * dt;
            while (tr.t >= 1 && !tr.morto && !tr.fermo) {
                var resto = tr.t - 1;
                avanza(tr);
                if (!tr.morto && !tr.fermo) tr.t = resto;   // il residuo non va perso
            }
            if (tr.fermo) tr.t = 1;   // resta appoggiato al confine della casella
            orologioFermo(tr);
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
                if (dx * dx + dy * dy < 25) { scontro(a, b); return; }
            }
        }
    }

    // Il treno fermo in stazione che aspetta di partire non e' al riparo: chi
    // arriva mentre lui e' ancora li' gli finisce addosso. Durante il solo
    // annuncio non succede niente, perche' il treno non c'e' ancora.
    function inAttesa(r, c, tranne) {
        for (var i = 0; i < S.treni.length; i++) {
            var tr = S.treni[i];
            if (tr === tranne || tr.morto) continue;
            if (tr.r === r && tr.c === c && tr.sosta > 0) return tr;
        }
        return null;
    }

    function scontro(a, b) {
        a.morto = b.morto = true;
        // `inc` (Unfall-Zaehler) conta TRENI PERSI, non scontri: uno scontro
        // ne brucia due, e infatti sui 108 quadri `inc` e' sempre pari (4, 6,
        // 8, 10), cioe' 2, 3, 4 o 5 scontri.
        S.scontri++; S.persi += 2;
        suona('scontro');
        var tot = Math.floor(parametri().inc / 2);
        messaggio(t('scontro', { A: Math.max(0, tot - S.scontri), B: tot }));
        registra('scontro', datiTreno(a));
        registra('scontro', datiTreno(b));
        fineScheda(a, 'scontro', b.partenza + '>' + b.dest);
        fineScheda(b, 'scontro', a.partenza + '>' + a.dest);
        if (S.persi >= parametri().inc) fine(false);
    }

    function mondo(tr) {
        var p = punto(tr.t, tr.ea, tr.xa);
        return [tr.c * CELLA + p[0], tr.r * CELLA + p[1]];
    }

    // Il quadro dopo sta nella stessa lettera, oppure nella lettera seguente
    // della campagna. L'ultimo quadro dell'ultima lettera non ha un dopo: li'
    // il bottone giallo non compare e, se il quadro e' vinto, la campagna e'
    // finita. Se la lettera che si gioca non e' in campagna -- in dev_mode si
    // puo' giocare la M mentre la campagna e' il dischetto -- non c'e' nessun
    // dopo da offrire, ma non e' nemmeno la fine di niente.
    function quadroDopo() {
        var i = CAMPAGNA.indexOf(S.livello);
        if (S.sub + 1 < D.liv[S.livello].sub.length) return [S.livello, S.sub + 1];
        if (i >= 0 && i < CAMPAGNA.length - 1) return [CAMPAGNA[i + 1], 0];
        return null;
    }

    function inCampagna() { return CAMPAGNA.indexOf(S.livello) >= 0; }

    function fine(vinto) {
        if (!S.attivo) return;
        S.attivo = false;
        S.pausa = false; aggiornaPausa();
        var p = parametri();
        // Punteggio non ce n'e' piu': il quadro si supera o no, e a fine quadro
        // si legge come e' andata -- consegne, scontri, tempo avanzato -- senza
        // che niente si trasformi in punti.
        // Vinto l'ultimo quadro della campagna non c'e' piu' niente dopo: li'
        // non e' un quadro superato, e' il gioco finito, e si festeggia.
        var finale = vinto && inCampagna() && !quadroDopo();
        S.finito = {
            vinto: vinto, finale: finale,
            // Il perche', che serve al cartello: la modale non lo dice, lei
            // mostra i tre numeri e si capisce da quelli.
            causa: vinto ? (finale ? 'Finale' : 'Vinto')
                         : (S.tempo <= 0 ? 'Tempo' : 'Scontri'),
            consegne: S.consegnati, ordini: p.ord, scontri: S.scontri,
            avanzo: Math.floor(Math.max(0, S.tempo))
        };
        suona(finale ? 'applauso' : vinto ? 'vittoria' : 'perso');
        // L'ultima lettura va scritta qui: se il quadro finisce per tempo scaduto
        // `passo` esce prima di arrivare al suo aggiornaHud() di coda, e la barra
        // in alto resterebbe ferma sui valori di un fotogramma prima.
        aggiornaHud();
        annunciaFine();
    }

    // ---- il cartello di fine quadro --------------------------------------
    // La modale non salta su nell'istante in cui il quadro finisce. Prima si
    // mette un cartello sopra il quadro, piccolo e che non lo copre, e la
    // modale arriva tre secondi dopo. Due motivi, tutti e due di Luciano:
    // il quadro che sparisce di colpo su un evento che magari non stavi
    // guardando e' brutto, e una modale che compare mentre stai cliccando uno
    // scambio si prende il clic -- nel caso peggiore sul banner, che e' un
    // annuncio, e un clic su un annuncio non deve mai partire per sbaglio.
    // Per lo stesso motivo non basta il tempo: la modale aspetta anche che il
    // mouse stia fermo, cioe' nessun tasto premuto e un momento dall'ultimo
    // rilascio. Cosi' va a posto da solo anche il guaio del tasto destro.
    var FINE_ANNUNCIO = 3000;       // quanto resta il cartello da solo
    var FINE_QUIETE = 400;          // e quanto il mouse deve stare fermo
    var fineAttesa = false;         // c'e' una modale in attesa
    var fineDa = 0;                 // quando il quadro e' finito
    var fineTimer = 0, fineTick = 0;

    function annunciaFine() {
        annullaFine();
        fineAttesa = true;
        fineDa = Date.now();
        var e = el('w2-annuncio');
        if (e) {
            e.innerHTML = '<b>' + T['ann' + S.finito.causa] + '</b>' +
                          '<span id="w2-annuncio-attesa"></span>';
            e.className = 'w2-annuncio su ' + (S.finito.vinto ? 'bene' : 'male');
        }
        attesaFine();
        fineTick = setInterval(attesaFine, 250);
        provaModale();
    }

    // Il conto alla rovescia sul cartello: non e' un vezzo, dice che sta
    // arrivando qualcosa. Se l'attesa si allunga perche' il mouse non sta
    // fermo, al posto dei secondi resta la riga senza numero.
    function attesaFine() {
        var e = el('w2-annuncio-attesa');
        if (!e) return;
        var manca = FINE_ANNUNCIO - (Date.now() - fineDa);
        e.textContent = manca > 0 ? t('annFra', { N: Math.ceil(manca / 1000) })
                                  : T.annSubito;
    }

    function provaModale() {
        if (!fineAttesa) return;
        if (fineTimer) { clearTimeout(fineTimer); fineTimer = 0; }
        // Tasto ancora premuto: non si decide niente, ci ripensa il rilascio.
        if (tastoGiu) return;
        var ora = Date.now();
        var manca = Math.max(FINE_ANNUNCIO - (ora - fineDa),
                             FINE_QUIETE - (ora - ultimoSu));
        if (manca > 0) { fineTimer = setTimeout(provaModale, manca); return; }
        annullaFine();
        // Se nel frattempo si e' ricominciato non c'e' piu' niente da dire.
        if (!S.attivo && S.finito) mostraFine();
    }

    function annullaFine() {
        fineAttesa = false;
        if (fineTimer) { clearTimeout(fineTimer); fineTimer = 0; }
        if (fineTick) { clearInterval(fineTick); fineTick = 0; }
        var e = el('w2-annuncio');
        if (e) e.className = 'w2-annuncio';
    }

    // =======================================================================
    //  disegno
    // =======================================================================

    // ---- la stazione disegnata da Luciano --------------------------------
    // Una piastrella sola, disegnata col binario che entra da levante. Le
    // altre tre sono la stessa girata, secondo il lato scritto in D.staz.
    //
    // Il quadrato della lettera va ridisegnato SOPRA al treno: il treno che si
    // ferma in stazione ci finisce sotto e ne resta fuori solo la coda, che e'
    // piu' lunga del quadrato. Per questo del quadrato si tiene una copia a
    // parte, gia' girata come la piastrella.
    var STAZ_SRC = 'images/woowoo2/stazione-tua.png?v=1.0';
    var STAZ_VERSO = 'E';                   // da che parte entra il binario nel file
    var STAZ_QUADRO = [19, 19, 23, 25];     // il quadrato della lettera, misurato nel file
    var STAZ_LATO = 64;                     // la piastrella del file
    var ANG_STAZ = { O: 0, E: Math.PI, N: Math.PI / 2, S: -Math.PI / 2 };
    // Il raccordo disegnato nel file e' rimasto del formato vecchio: accanto
    // ai binari ridisegnati da W2BINARI si vede subito che e' di un'altra
    // mano, piu' stretto e piu' scuro, e al confine della casella fa gradino.
    // La tacca si richiude tirandoci dentro il tetto, e il raccordo lo rifa'
    // W2BINARI insieme a tutto il resto della rete.
    var STAZ_TACCA = [42, 20, 22, 24];      // la tacca del binario, misurata nel file
    var quadri = null;                      // cod -> { piena, cv, x, y, w, h }

    function giroStaz(cod) {
        return (ANG_STAZ[D.staz[cod]] || 0) - ANG_STAZ[STAZ_VERSO];
    }

    // La stazione col buco del binario richiuso. Il colmo del tetto passa
    // proprio in mezzo alla tacca - falda al sole sopra, in ombra sotto - e
    // allora si allunga una riga per parte fino a meta': il colmo resta dov'e'
    // e non si vede la giunta.
    function senzaRaccordo(img) {
        var L = STAZ_LATO, t = STAZ_TACCA, meta = t[1] + t[3] / 2;
        var cv = document.createElement('canvas');
        cv.width = cv.height = L;
        var g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0, L, L);
        g.drawImage(cv, t[0], t[1] - 1, t[2], 1, t[0], t[1], t[2], meta - t[1]);
        g.drawImage(cv, t[0], t[1] + t[3], t[2], 1, t[0], meta, t[2], t[1] + t[3] - meta);
        return cv;
    }

    // La piastrella girata, su una tela di 64: serve sia per l'atlante sia
    // per ritagliarne il quadrato. Il raccordo si rimette dopo il giro, gia'
    // nel verso della bocca: e' roba disegnata, non pescata dall'immagine,
    // e girarla non avrebbe cambiato niente se non i bordi.
    function stazioneGirata(img, cod) {
        var L = STAZ_LATO;
        var cv = document.createElement('canvas');
        cv.width = cv.height = L;
        var g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.translate(L / 2, L / 2); g.rotate(giroStaz(cod)); g.translate(-L / 2, -L / 2);
        g.drawImage(img, 0, 0, L, L);
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (window.W2BINARI)
            g.drawImage(W2BINARI.raccordo(D.staz[cod], L - STAZ_TACCA[0]), 0, 0, L, L);
        return cv;
    }

    // Dove finisce il quadrato dopo il giro. Gli angoli sono tutti multipli di
    // 90 gradi, percio' il rettangolo resta dritto: bastano i quattro vertici.
    function quadroGirato(cod) {
        var a = giroStaz(cod);
        var co = Math.round(Math.cos(a)), si = Math.round(Math.sin(a));
        var q = STAZ_QUADRO, m = STAZ_LATO / 2;
        var xs = [], ys = [], i, j, dx, dy;
        for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
            dx = q[0] + i * q[2] - m; dy = q[1] + j * q[3] - m;
            xs.push(m + dx * co - dy * si);
            ys.push(m + dx * si + dy * co);
        }
        var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
        return [x0, y0, Math.max.apply(null, xs) - x0, Math.max.apply(null, ys) - y0];
    }

    function preparaStazioni(img) {
        quadri = null;
        if (!img || !img.naturalWidth || !D.staz) return;
        quadri = {};
        var pulita = window.W2BINARI ? senzaRaccordo(img) : img;
        Object.keys(D.staz).forEach(function (k) {
            var cod = +k;
            var piena = stazioneGirata(pulita, cod);
            var r = quadroGirato(cod);
            var cv = document.createElement('canvas');
            cv.width = r[2]; cv.height = r[3];
            var g = cv.getContext('2d');
            g.imageSmoothingEnabled = false;
            g.drawImage(piena, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
            quadri[cod] = { piena: piena, cv: cv, x: r[0], y: r[1], w: r[2], h: r[3] };
        });
    }

    // Le quattro stazioni entrano nell'atlante dello stile nostro al posto di
    // quelle del dischetto. Solo li': dove si gioca con le piastrelle del
    // dischetto il disegno e' un altro e questa stonerebbe in mezzo.
    function montaStazioni(tela, cella) {
        if (!quadri) return;
        var g = tela.getContext('2d');
        g.imageSmoothingEnabled = false;
        Object.keys(quadri).forEach(function (k) {
            var x = (+k) * cella;
            if (x + cella > tela.width) return;
            g.clearRect(x, 0, cella, cella);
            g.drawImage(quadri[+k].piena, x, 0, cella, cella);
        });
    }

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
                // Senza atlante non c'e' niente da ritagliare. Si arriva qui
                // solo se un file non e' arrivato: meglio un quadro spoglio
                // che drawImage che butta fuori un errore e ferma il ciclo.
                if (!atl) continue;
                var st = (D.scambio.indexOf(cod) >= 0 || D.segnale.indexOf(cod) >= 0) ? S.stato[r][c] : 0;
                // Scambio in movimento: la piastrella non viene dall'atlante
                // ma da un fotogramma disegnato. La massicciata sta ferma, si
                // spostano rotaie e traversine, incernierate sulla punta.
                // Solo negli schemi con la grafica nostra: dove si gioca
                // con le piastrelle del dischetto il disegno e' un altro e
                // una casella nel nostro stile stonerebbe in mezzo.
                var mv = (sty && S.mossa) ? S.mossa[r][c] : 0;
                if (mv > 0 && window.W2BINARI) {
                    var q = 1 - mv / W2BINARI.DURATA;
                    var sm = q * q * (3 - 2 * q);         // parte piano e arriva piano
                    ctx.drawImage(W2BINARI.cella(cod, st ? sm : 1 - sm),
                                  c * CELLA, r * CELLA, CELLA, CELLA);
                    continue;
                }
                ctx.drawImage(atl, cod * cel, st * cel, cel, cel, c * CELLA, r * CELLA, CELLA, CELLA);
            }
        }

        // Il quadrato della partenza. Mentre il treno fischia, la casella
        // della stazione lampeggia di rosso a tempo con le fischiate - una
        // lampata per fischiata, due in tutto - cosi' l'occhio e l'orecchio
        // dicono la stessa cosa e il lampo non si confonde con quello lento
        // della lettera, che vuol dire solo "qui c'e' un treno fermo". Va
        // prima dei treni: il treno ci sta sopra e resta scoperta la cornice.
        S.treni.forEach(function (tr) {
            if (tr.sosta <= 0 || !tr.fischiato) return;
            if (!fischioAcceso(S.orologio - tr.fischioDa)) return;
            ctx.fillStyle = 'rgba(255, 32, 32, 0.45)';
            ctx.fillRect(tr.c * CELLA, tr.r * CELLA, CELLA, CELLA);
            ctx.strokeStyle = '#ff2020';
            ctx.lineWidth = 2;
            ctx.strokeRect(tr.c * CELLA + 1, tr.r * CELLA + 1, CELLA - 2, CELLA - 2);
        });

        // treni
        S.treni.forEach(function (tr) { disegnaTreno(tr); });

        // Le stazioni vanno per ultime, dopo i treni. Con le piastrelle
        // nostre si ridisegna qui il quadrato della lettera, ritagliato dalla
        // piastrella stessa: il treno fermo ci finisce sotto invece di
        // passarci sopra. Con quelle del dischetto il quadrato non c'e' e
        // resta il riquadro nero di sempre. In tutti e due i casi la lettera
        // lampeggia durante l'annuncio e finche' il treno sta fermo li'.
        S.stazioni.forEach(function (s) {
            var lampeggia = (s.annuncio > 0 || fermoSu(s)) &&
                            (Math.floor(S.lampeggio * 4) % 2 === 0);
            var q = (sty && quadri) ? quadri[S.griglia[s.r][s.c]] : null;
            var k, x, y;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (q) {
                k = CELLA / STAZ_LATO;
                ctx.drawImage(q.cv, s.c * CELLA + q.x * k, s.r * CELLA + q.y * k,
                              q.w * k, q.h * k);
                x = s.c * CELLA + (q.x + q.w / 2) * k;
                y = s.r * CELLA + (q.y + q.h / 2) * k;
                // A lampeggiare e' tutto il riquadro, non la sola lettera:
                // da lontano un quadrato che si accende si vede, una lettera
                // che cambia colore no. Acceso e' BIANCO -- il bianco e' quello
                // che stacca di piu' da tutto il resto del quadro -- con la
                // lettera nera sopra. Il bordo scuro del disegno resta, percio'
                // il bianco si stende solo dentro.
                if (lampeggia) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(s.c * CELLA + (q.x + 2) * k, s.r * CELLA + (q.y + 2) * k,
                                 (q.w - 4) * k, (q.h - 4) * k);
                }
                ctx.font = 'bold 10px monospace';
                ctx.lineWidth = 2; ctx.lineJoin = 'round';
                ctx.strokeStyle = lampeggia ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.75)';
                ctx.strokeText(s.lettera, x, y);
                ctx.fillStyle = lampeggia ? '#000000' : '#eecc00';
                ctx.fillText(s.lettera, x, y);
                return;
            }
            ctx.font = 'bold 13px monospace';
            x = s.c * CELLA + 16; y = s.r * CELLA + 16;
            ctx.fillStyle = lampeggia ? '#ffffff' : '#000000';
            ctx.fillRect(x - 7, y - 8, 14, 16);
            ctx.fillStyle = lampeggia ? '#000000' : '#eecc00';
            ctx.fillText(s.lettera, x, y);
        });

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---- i corpi dei treni ------------------------------------------------
    // Quattro modelli disegnati a vettori, tutti col muso a nord, centrati
    // nell'origine e nello stesso ingombro 16x28. disegnaTreno li riduce di
    // meta', cosi' sul quadro occupano 8x14 come lo sprite di prima ma con il
    // doppio del dettaglio, perche' il canvas e' gia' a SCALA 2.

    function schiara(col, perc) {
        var n = parseInt(col.replace('#', ''), 16), d = Math.round(2.55 * perc);
        var r = (n >> 16) + d, g = ((n >> 8) & 255) + d, b = (n & 255) + d;
        function m(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
        return '#' + (0x1000000 + m(r) * 0x10000 + m(g) * 0x100 + m(b)).toString(16).slice(1);
    }

    function rrect(c, x, y, w, h, r) {
        c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
        c.fill();
    }

    // ---- 1. locomotore da manovra ------------------------------------------

    function modManovra(c, col) {
        var scuro = schiara(col, -35), chiaro = schiara(col, 25);

        c.fillStyle = '#111418';                      // telaio
        c.fillRect(-8, -14, 16, 28);

        c.fillStyle = '#2d333b';                      // respingenti
        c.fillRect(-7.5, -15.5, 3.5, 2.5); c.fillRect(4, -15.5, 3.5, 2.5);
        c.fillRect(-7.5, 13, 3.5, 2.5);    c.fillRect(4, 13, 3.5, 2.5);
        c.fillStyle = '#4a5568';
        c.fillRect(-8, -16, 4.5, 1);  c.fillRect(3.5, -16, 4.5, 1);
        c.fillRect(-8, 15, 4.5, 1);   c.fillRect(3.5, 15, 4.5, 1);
        c.fillStyle = '#1a202c';                      // gancio di trazione
        c.fillRect(-1.5, -15.5, 3, 2); c.fillRect(-1.5, 13.5, 3, 2);

        c.fillStyle = '#d97706';                      // pancone a strisce
        c.fillRect(-7, -14, 14, 2); c.fillRect(-7, 12, 14, 2);
        c.fillStyle = '#111418';
        c.fillRect(-4, -14, 2, 2); c.fillRect(2, -14, 2, 2);
        c.fillRect(-4, 12, 2, 2);  c.fillRect(2, 12, 2, 2);

        c.fillStyle = col;                            // cofano motore
        rrect(c, -6.5, -12, 13, 24, 2);
        c.fillStyle = chiaro; c.fillRect(-6, -11, 1.5, 22);
        c.fillStyle = scuro;  c.fillRect(4.5, -11, 1.5, 22);

        c.fillStyle = '#111418';                      // griglia del radiatore
        rrect(c, -4.5, -11.5, 9, 3, 1);
        c.fillStyle = '#475569'; c.fillRect(-4, -10.5, 8, 0.7);

        c.fillStyle = '#1e293b';                      // ventola
        c.beginPath(); c.arc(0, -5, 2.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0f172a';
        c.beginPath(); c.arc(0, -5, 1.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#090d12'; c.fillRect(-1, -1.5, 2, 1.5);        // scarico

        c.fillStyle = scuro;     c.fillRect(-6, 0.5, 12, 9);          // cabina
        c.fillStyle = '#1e293b'; c.fillRect(-5.5, 1, 11, 8);
        c.fillStyle = '#0f172a'; c.fillRect(-4.5, 1.5, 9, 2.5);       // parabrezza
        c.fillStyle = '#38bdf8'; c.fillRect(-4, 2, 8, 1.5);
        c.fillStyle = '#ffffff'; c.fillRect(-3, 2, 2.5, 1.5);
        c.fillStyle = '#0284c7';                                      // finestrini
        c.fillRect(-5, 4.5, 1, 3.5); c.fillRect(4, 4.5, 1, 3.5);
        c.fillStyle = col;       c.fillRect(-5, 4, 10, 4.5);          // tettuccio
        c.fillStyle = chiaro;    c.fillRect(-4, 4.5, 8, 1);

        c.fillStyle = '#334155';                      // fari anteriori
        c.fillRect(-5, -13.5, 2.5, 2); c.fillRect(2.5, -13.5, 2.5, 2);
        c.fillStyle = '#fef08a';
        c.beginPath();
        c.arc(-3.75, -12.5, 1, 0, Math.PI * 2);
        c.arc(3.75, -12.5, 1, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = '#ef4444';                      // fanali di coda
        c.beginPath();
        c.arc(-4.5, 12.5, 0.8, 0, Math.PI * 2);
        c.arc(4.5, 12.5, 0.8, 0, Math.PI * 2);
        c.fill();
    }


    // ---- 2. berlina a due teste ("retro HD") -------------------------------
    // Simmetrica come lo sprite originale: due parabrezza, quattro fari
    // d'angolo, feritoia scura lungo tutto il tetto.

    function modRetro(c, col) {
        var scuro = schiara(col, -40), chiaro = schiara(col, 35);

        c.fillStyle = '#0a0d11'; rrect(c, -8, -14, 16, 28, 3);
        c.fillStyle = '#171c24';
        c.fillRect(-6, -14.5, 12, 1.5); c.fillRect(-6, 13, 12, 1.5);

        c.fillStyle = col;                            // scocca in due tronconi
        rrect(c, -7, -13, 14, 11, 2);
        rrect(c, -7, 2, 14, 11, 2);
        c.fillStyle = chiaro;
        c.fillRect(-6.5, -12, 1.5, 9.5); c.fillRect(-6.5, 2.5, 1.5, 9.5);
        c.fillStyle = scuro;
        c.fillRect(5, -12, 1.5, 9.5);    c.fillRect(5, 2.5, 1.5, 9.5);

        c.fillStyle = '#11161d'; c.fillRect(-1.5, -13, 3, 26);   // feritoia

        c.fillStyle = '#0f172a'; rrect(c, -4.5, -6, 9, 3.5, 1);  // parabrezza nord
        c.fillStyle = '#e2e8f0'; c.fillRect(-4, -5.5, 8, 2.5);
        c.fillStyle = '#38bdf8'; c.fillRect(-2, -5.5, 5, 2.5);

        c.fillStyle = '#1e293b'; c.fillRect(-6.5, -2, 13, 4);    // fascia centrale
        c.fillStyle = col;       c.fillRect(-5.5, -1.5, 11, 3);

        c.fillStyle = '#0f172a'; rrect(c, -4.5, 2.5, 9, 3.5, 1); // parabrezza sud
        c.fillStyle = '#e2e8f0'; c.fillRect(-4, 3, 8, 2.5);
        c.fillStyle = '#38bdf8'; c.fillRect(-3, 3, 5, 2.5);

        var ang = [[-5.2, -13.2], [5.2, -13.2], [-5.2, 13.2], [5.2, 13.2]];
        ang.forEach(function (f) {
            c.fillStyle = '#0f172a';
            c.beginPath(); c.arc(f[0], f[1], 1.6, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ffffff';
            c.beginPath(); c.arc(f[0], f[1], 1.1, 0, Math.PI * 2); c.fill();
        });
    }

    // ---- 3. freccia ad alta velocita' --------------------------------------
    // Muso a ogiva, visiera scura avvolgente, pantografo dietro. Unico modello
    // che ha un davanti e un dietro veri.

    function modFreccia(c, col) {
        var chiaro = schiara(col, 30);

        c.fillStyle = '#0f141a'; rrect(c, -7.5, -13, 15, 27, 3);

        c.fillStyle = col;                            // carlinga
        c.beginPath();
        c.moveTo(0, -15);
        c.bezierCurveTo(-6, -14, -7, -8, -7, -2);
        c.lineTo(-7, 12);
        c.quadraticCurveTo(-7, 14, -4, 14.5);
        c.lineTo(4, 14.5);
        c.quadraticCurveTo(7, 14, 7, 12);
        c.lineTo(7, -2);
        c.bezierCurveTo(7, -8, 6, -14, 0, -15);
        c.closePath(); c.fill();

        c.fillStyle = chiaro;                         // riflesso di curvatura
        c.beginPath();
        c.moveTo(0, -14);
        c.bezierCurveTo(-4, -13, -5.5, -8, -5.5, -2);
        c.lineTo(-5.5, 12); c.lineTo(-4.5, 12); c.lineTo(-4.5, -2);
        c.bezierCurveTo(-4.5, -7, -3, -12, 0, -14);
        c.fill();

        c.fillStyle = '#334155'; rrect(c, -2.5, -5, 5, 17, 1.5); // dorso metallico
        c.fillStyle = '#64748b'; c.fillRect(-1.5, -4, 3, 15);
        c.fillStyle = '#cbd5e1'; c.fillRect(-2, 8, 4, 1);        // pantografo
        c.fillStyle = '#e2e8f0'; c.fillRect(-0.7, 7, 1.4, 3);

        c.fillStyle = '#090d14';                      // visiera
        c.beginPath();
        c.moveTo(0, -12); c.lineTo(-5, -6.5); c.lineTo(-5, -4);
        c.lineTo(5, -4); c.lineTo(5, -6.5);
        c.closePath(); c.fill();
        c.fillStyle = '#38bdf8';
        c.beginPath();
        c.moveTo(0, -11.2); c.lineTo(-4, -6.5); c.lineTo(0, -6.5);
        c.closePath(); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(-1, -10.5); c.lineTo(-3, -7.5); c.lineTo(-1.5, -7.5);
        c.closePath(); c.fill();

        c.fillStyle = '#fef08a';                      // fari a virgola
        c.beginPath();
        c.moveTo(-2, -13); c.lineTo(-4, -10.5); c.lineTo(-3, -10);
        c.closePath(); c.fill();
        c.beginPath();
        c.moveTo(2, -13); c.lineTo(4, -10.5); c.lineTo(3, -10);
        c.closePath(); c.fill();

        c.fillStyle = '#ef4444'; c.fillRect(-5, 13.5, 10, 1);    // barra di coda
    }

    // ---- 4. modellino gommoso ----------------------------------------------
    // Tondo, bordo scuro spesso, un solo fanale grosso davanti.

    function modModellino(c, col) {
        var scuro = schiara(col, -30), chiaro = schiara(col, 45);

        c.fillStyle = '#0f172a'; rrect(c, -8, -14, 16, 28, 5);

        c.fillStyle = '#334155';                      // respingenti tondi
        c.beginPath();
        c.arc(-5, -14, 1.8, 0, Math.PI * 2); c.arc(5, -14, 1.8, 0, Math.PI * 2);
        c.arc(-5, 14, 1.8, 0, Math.PI * 2);  c.arc(5, 14, 1.8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#94a3b8';
        c.beginPath();
        c.arc(-5, -14.5, 0.8, 0, Math.PI * 2); c.arc(5, -14.5, 0.8, 0, Math.PI * 2);
        c.arc(-5, 14.5, 0.8, 0, Math.PI * 2);  c.arc(5, 14.5, 0.8, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = col;    rrect(c, -6.5, -12.5, 13, 25, 4);  // scocca bombata
        c.fillStyle = scuro;  rrect(c, -6.5, 4, 13, 8.5, 3);
        c.fillStyle = chiaro; rrect(c, -5, -10, 10, 16, 3);      // cupola

        c.fillStyle = '#ffffff';                      // punto di luce
        c.beginPath(); c.ellipse(-2, -5, 2, 4, -Math.PI / 6, 0, Math.PI * 2); c.fill();

        c.fillStyle = '#0f172a'; rrect(c, -5, -11, 10, 4, 1.5);  // parabrezza
        c.fillStyle = '#38bdf8'; c.fillRect(-4, -10.5, 8, 2.5);
        c.fillStyle = '#ffffff'; c.fillRect(-2.5, -10.5, 3, 1.2);

        c.fillStyle = '#0f172a'; rrect(c, -4.5, 8.5, 9, 3, 1.5); // lunotto
        c.fillStyle = '#38bdf8'; c.fillRect(-3.5, 9, 7, 1.8);

        c.fillStyle = '#475569';                      // fanale unico
        c.beginPath(); c.arc(0, -13, 2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fef08a';
        c.beginPath(); c.arc(0, -13, 1.3, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(-0.4, -13.4, 0.5, 0, Math.PI * 2); c.fill();
    }

    // Ogni convoglio pesca un modello a caso fra questi quattro.
    var MODELLI = [modManovra, modRetro, modFreccia, modModellino];

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
        ctx.scale(0.5, 0.5);       // il corpo e' disegnato 16x28, sul quadro va 8x14
        (MODELLI[tr.modello] || MODELLI[0])(ctx, tr.colore);
        ctx.restore();

        // la lettera di destinazione sta sempre a nord del convoglio
        if (parametri().dest) {
            // niente riquadro: la lettera si legge da sola grazie al contorno
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.strokeText(tr.dest, p[0], p[1] - 11);
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
        testo('w2-livello', nome(S.livello) + ' · ' + (S.sub + 1) + '/' + D.liv[S.livello].sub.length);
        // I due contatori del centro vanno a scendere, come nell'originale:
        // quante consegne restano da fare e quanti scontri si possono ancora
        // fare. Il primo che arriva a zero decide il quadro, e da fermo si
        // legge quanto manca invece di quanto e' andato.
        //
        // `inc` conta treni persi, e in uno scontro se ne perdono sempre due:
        // diviso due da il numero di scontri, che e' quello che il giocatore
        // guarda davvero.
        testo('w2-consegne', String(Math.max(0, p.ord - S.consegnati)));
        testo('w2-scontri', String(Math.max(0, Math.floor((p.inc - S.persi) / 2))));
        testo('w2-tempo', String(resta));
        var barra = el('w2-barra');
        if (barra) barra.style.width = Math.max(0, 100 * S.tempo / (S.tempoMax || 1)) + '%';
        testo('w2-turbo', S.turbo ? '×' + tara().turbo : '');

        var q = el('w2-coda');
        if (q) {
            var righe = S.coda.map(function (o) {
                return '<div class="w2-voce annuncio"><b>' + o.part.lettera + ' → ' +
                       o.dest.lettera + '</b><span>' + t('fra', { N: Math.ceil(o.resta) }) +
                       '</span></div>';
            }).concat(S.treni.map(function (tr) {
                // Da quanto e' in giro e, se e' bloccato, da quanto sta fermo.
                // Senza i due numeri un treno piantato dietro uno scambio
                // storto si riconosce solo guardando il quadro.
                var vg = tr.mosso === null ? 0 : Math.floor(S.orologio - tr.mosso);
                var ff = tr.daFermo === null ? 0 : Math.floor(S.orologio - tr.daFermo);
                var stato = tr.sosta > 0 ? t('sosta', { N: Math.ceil(tr.sosta) })
                          : (tr.fermo ? t('fermo', { F: ff, N: vg })
                                      : t('viaggio', { N: vg }));
                // Quattro bande di colore: annuncio, in partenza, in viaggio,
                // bloccato. Il blocco vince sempre, e' la cosa da guardare.
                var classe = tr.fermo ? ' allarme' : (tr.sosta > 0 ? ' partenza' : '');
                return '<div class="w2-voce' + classe +
                       '"><b>' + tr.partenza + ' → ' + tr.dest +
                       '</b><span>' + stato + '</span></div>';
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
        var dopo = quadroDopo();
        // A quadro perso il bottone del quadro dopo non si offre: si ripete
        // questo o si va a scegliere.
        var avanti = f.vinto && !!dopo;
        e.innerHTML =
            '<div class="w2-riquadro" id="w2-riquadro">' +
            '<h2>' + (f.finale ? T.finale : f.vinto ? T.vinto : T.perso) + '</h2>' +
            (f.finale ? '<p class="w2-finale">' + T.finaleTesto + '</p>' : '') +
            '<div class="w2-schede">' +
            cartellino(T.rConsegne, f.consegne + '/' + f.ordini) +
            cartellino(T.rScontri, f.scontri) +
            cartellino(T.rTempo, f.avanzo + ' s') +
            '</div>' +
            '<div class="w2-bottoni">' +
            '<button id="w2-fine-ripeti">' + T.ripeti + '</button>' +
            (avanti ? '<button id="w2-fine-avanti" class="giallo">' + T.avanti + '</button>' : '') +
            '<button id="w2-fine-scegli">' + T.scegli + '</button>' +
            '</div>' +
            '<div class="w2-angolo sx"></div><div class="w2-angolo dx"></div>' +
            '</div>';
        e.style.display = 'flex';

        // Negli angoli in basso i due rimandi del piedino, copiati di peso: in
        // questo modo restano uguali a quelli della pagina -- testo, indirizzo
        // e lingua -- senza riscriverli qui.
        copiaLink('.link-giochi-w2 a[href^="regole-"]', e.querySelector('.w2-angolo.sx'));
        copiaLink('.link-giochi-w2 .pulsante-home-w2', e.querySelector('.w2-angolo.dx'));

        function chiudi() { e.style.display = 'none'; }
        var b = el('w2-fine-ripeti');
        if (b) b.onclick = function () { chiudi(); carica(S.livello, S.sub); };
        b = el('w2-fine-avanti');
        if (b) b.onclick = function () { chiudi(); carica(dopo[0], dopo[1]); };
        b = el('w2-fine-scegli');
        if (b) b.onclick = function () {
            chiudi();
            // Si apre la tendina dove sta il quadro che si sta giocando: in
            // dev_mode ce ne sono due, e se si gioca su un quadro nostro quella
            // da aprire e' la seconda, non quella del dischetto.
            var ora = S.livello + ':' + S.sub;
            var sel = el('w2-scelta');
            var due = el('w2-scelta2');
            if (due && due.style.display !== 'none' &&
                Array.prototype.some.call(due.options, function (o) { return o.value === ora; })) sel = due;
            if (!sel) return;
            sel.focus();
            // showPicker apre la tendina da sola dove c'e' (Chrome): dove non
            // c'e', resta il fuoco e la tendina si apre con un clic.
            try { sel.showPicker(); } catch (x) { }
        };

        // Il banner di fine partita, come negli altri giochi: sta sopra il
        // riquadro, che per questo e' basso e largo 700 come loro. Si attacca
        // al riquadro, non alla velatura, se no il left:0 non tornerebbe.
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('w2-riquadro', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,
                bannerWidth: 700,
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }
    function cartellino(n, v) {
        return '<div class="w2-scheda"><div class="lbl">' + n +
               '</div><div class="val">' + v + '</div></div>';
    }
    function copiaLink(sel, dove) {
        var a = document.querySelector(sel);
        if (!a || !dove) return;
        var c = a.cloneNode(true);
        c.removeAttribute('id');
        dove.appendChild(c);
    }

    // =======================================================================
    //  comandi
    // =======================================================================

    function click(ev) {
        if (!S.attivo || S.pausa) return;
        var b = cv.getBoundingClientRect();
        var x = (ev.clientX - b.left) / b.width * LARG;
        var y = (ev.clientY - b.top) / b.height * ALT;
        var c = Math.floor(x / CELLA), r = Math.floor(y / CELLA);
        if (!dentro(r, c)) return;
        var cod = S.griglia[r][c];
        if (D.scambio.indexOf(cod) < 0 && D.segnale.indexOf(cod) < 0) return;
        S.stato[r][c] = S.stato[r][c] ? 0 : 1;
        // Lo stato cambia subito e l'instradamento lo legge subito: il treno
        // che arriva nello stesso fotogramma va per la strada nuova. Il
        // movimento che segue e' solo cosmetico, nessuna regola lo guarda.
        if (D.scambio.indexOf(cod) >= 0 && window.W2BINARI) S.mossa[r][c] = W2BINARI.DURATA;
        suona('scambio');
    }

    // Acceleratore. Nell'originale si tiene premuto il tasto destro del mouse
    // sul quadro; qui vale anche la barra spaziatrice, che serve a chi gioca
    // col trackpad e a chi non ha il tasto destro. Si rilascia da solo se il
    // mouse esce dalla finestra o se la pagina perde il fuoco, altrimenti il
    // gioco resterebbe accelerato senza che nessuno tenga premuto niente.
    // Il menu contestuale del browser e' un guaio a parte: non esce quando si
    // preme il destro ma mentre lo si tiene, e in mezzo quello che sta sotto
    // il mouse puo' essere cambiato. Finche' c'e' un destro partito dal
    // quadro, allora, il menu si butta via dovunque arrivi. Quello che non si
    // puo' fare e' toglierlo da sopra il banner di fine partita, che e' un
    // iframe di un altro sito: li' il preventDefault nostro non arriva
    // nemmeno. Per quello la modale non compare a mouse premuto (vedi
    // annunciaFine): se sotto il cursore non c'e' il banner, il problema non
    // si pone.
    var destroGiu = false;      // il destro e' giu', ed e' partito dal quadro
    var tastoGiu = false;       // un tasto qualunque, sempre partito dal quadro
    var ultimoSu = 0;           // quando si e' lasciato l'ultimo tasto

    function mouseGiu(e) {
        tastoGiu = true;
        if (e.button !== 2) return;
        destroGiu = true;
        if (S.attivo && !S.pausa) S.turbo = true;
    }
    function mouseSu(e) {
        S.turbo = false;
        if (e && e.type === 'mouseup') {
            // Un tick di ritardo per il destro, e non e' un vezzo: dove il
            // menu contestuale arriva DOPO il mouseup deve trovare destroGiu
            // ancora alzato per farsi buttare via.
            if (e.button === 2) setTimeout(function () { destroGiu = false; }, 0);
            // I `buttons' sono quelli ANCORA premuti, senza quello appena
            // lasciato: tenendo giu' il destro si puo' cliccare uno scambio
            // col sinistro, e il mouse non e' fermo.
            if (e.buttons) return;
        } else {
            destroGiu = false;      // la finestra ha perso il fuoco: molla tutto
        }
        tastoGiu = false;
        ultimoSu = Date.now();
        provaModale();
    }

    // Pausa. Il gioco si ferma ma il quadro resta com'e': niente velo sopra,
    // niente oscuramento, cosi' si puo' studiare la situazione. A dire che si
    // e' fermi e' il tasto, che lampeggia di giallo.
    function pausa(v) {
        if (!S.attivo) return;
        S.pausa = (v === undefined) ? !S.pausa : v;
        if (S.pausa) S.turbo = false;
        aggiornaPausa();
    }
    function aggiornaPausa() {
        var b = el('w2-pausa');
        if (b) { b.classList.toggle('inpausa', !!S.pausa); b.setAttribute('aria-pressed', S.pausa ? 'true' : 'false'); }
    }

    function tasti(e) {
        if (e.altKey) return;
        if (e.key === 'r' || e.key === 'R') carica(S.livello, S.sub);
        if (e.key === ' ' && S.attivo && !S.pausa) { S.turbo = true; e.preventDefault(); }
    }
    function tastiSu(e) { if (e.key === ' ') S.turbo = false; }

    // =======================================================================
    //  suoni
    // =======================================================================
    // L'annuncio e' una campana da passaggio a livello, calcolata e non
    // scaricata: niente file, niente licenza, niente crediti da scrivere.
    // I numeri non sono inventati: sono misurati su una registrazione vera di
    // campana da passaggio a livello, un parziale per volta. Modi, ampiezze,
    // tempi di spegnimento, passo fra un colpo e l'altro, durata dell'attacco.
    // La resintesi e' stata poi rimisurata con lo stesso metodo e combacia
    // entro 0,3 dB su tutti gli undici parziali. Dentro al nostro file non
    // finisce nessun byte di quella registrazione: e' ricalcolata da zero.
    //
    // Due cose che si imparano solo misurando, e che prima avevo sbagliato:
    // 1) il carattere del passaggio a livello e' l'INSISTENZA, non la
    //    risonanza. Sono colpi asciutti ripetuti ogni 0,438 s, ognuno quasi
    //    spento quando arriva il successivo. Una campana con la coda lunga
    //    suona da chiesa, non da ferrovia.
    // 2) il parziale piu' forte (5,267 volte il ronzio, cioe' 2470 Hz) muore
    //    in 9 centesimi: e' lo schiocco del martelletto, non la nota. La nota
    //    che resta e' il gruppo 1033-1667 Hz.
    // I rapporti 1,0 / 1,84 / 2,20 / 2,98 sono quelli di una campana vera:
    // ronzio, primo, terza, quinta. Le due coppie 9,44/9,49 e 11,83/11,87
    // sono modi appaiati, sdoppiati di una ventina di Hz: una campana non
    // perfettamente rotonda li ha, e si sente battere. Anche questo e' preso
    // dalla registrazione, non aggiunto a gusto.
    // Non ci sono piu' segnaposto: ogni suono del gioco e' una registrazione
    // o una sintesi misurata.
    var audioOn = true;
    var VOL = {                   // una manopola per suono
        campana: 0.09,            // l'annuncio della stazione
        fischio: 0.09,            // il fischio della partenza
        arrivo: 0.35,             // tada.mp3: e' una fanfara e sta forte
        scambio: 0.50,            // slitta2.mp3
        scontro: 0.40,            // crash.mp3: la disgrazia si sente, senza spaventare
        perso: 0.35,              // haiperso.mp3: il quadro finito male
        applauso: 0.35            // applause.mp3: l'ultimo quadro della campagna
    };

    // Questi tre non sono calcolati, sono registrazioni. La fanfara e' quella
    // di scala40; gli altri due stanno nella cartella del gioco, e slitta2 e'
    // slitta senza il silenzio in testa, cosi' il colpo cade sul clic invece
    // che un attimo dopo.
    var SUONI = {
        arrivo: 'sounds/scala40/tada.mp3',       // la consegna fatta
        scambio: 'sounds/woowoo2/slitta2.mp3',   // lo scambio che si muove
        scontro: 'sounds/woowoo2/crash.mp3',     // due treni che si prendono
        // Fine del quadro. La fanfara del quadro vinto e' la stessa della
        // consegna -- tada.mp3, gia' caricata qui sopra come `arrivo` -- e non
        // si scarica due volte: la vittoria la suona riusando quel campione.
        perso: 'sounds/scala40/haiperso.mp3',    // il quadro finito male
        applauso: 'sounds/scala40/applause.mp3'  // l'ultimo quadro di tutti
    };

    // Il ronzio, cioe' il modo piu' grave: tutti i rapporti sono riferiti a lui.
    var RONZIO = 469;

    // rapporto sul ronzio, ampiezza, secondi di spegnimento (tutto misurato)
    var MODI = [
        [1.000, 0.0348, 0.98],    //  469 Hz  il ronzio, l'unico che dura
        [1.840, 0.0584, 0.12],    //  863 Hz  il primo
        [2.203, 0.1101, 0.35],    // 1033 Hz  la terza
        [2.983, 0.0252, 0.26],    // 1399 Hz  la quinta
        [3.555, 0.0734, 0.43],    // 1667 Hz
        [5.267, 1.0000, 0.09],    // 2470 Hz  lo schiocco del martelletto
        [7.252, 0.1152, 0.13],    // 3401 Hz
        [9.440, 0.0915, 0.10],    // 4427 Hz  coppia appaiata, batte con...
        [9.488, 0.1652, 0.11],    // 4450 Hz  ...questa, 23 Hz piu' su
        [11.833, 0.1998, 0.08],   // 5550 Hz  l'altra coppia appaiata
        [11.867, 0.0440, 0.11]    // 5566 Hz
    ];

    // Le manopole della campana. PASSO e' misurato (0,429-0,444, mediano
    // 0,439); ATTACCO e' la salita del singolo colpo, un gradino netto
    // farebbe un clic; CODA e' quanto si lascia suonare un colpo nel buffer.
    var PASSO = 0.438, ATTACCO = 0.004, CODA = 0.50;

    // Il primo colpo e' pieno, gli altri un filo diversi fra loro: nel vero
    // il martelletto non batte mai due volte allo stesso modo. Fissi e non a
    // caso, cosi' l'annuncio di una stazione e' sempre lo stesso annuncio.
    var FORZA = [1.00, 0.90, 0.96, 0.88, 0.93];

    // Come si riconosce una stazione a orecchio. Non per altezza: distribuire
    // le stazioni su due ottave suona finto, nessun impianto ferroviario vero
    // ha campane a un'ottava di distanza. Si riconosce QUANTI colpi batte -
    // da due a cinque - e, se le stazioni sono piu' di quattro, da una seconda
    // e una terza campana un po' piu' alte: due toni e quattro toni sopra la
    // prima. Niente tre toni, che e' il tritono e stride.
    // Quattro conteggi per tre serie fanno dodici combinazioni, ed e'
    // esattamente il massimo di stazioni che c'e' in un quadro (E/3 e G/2).
    // Il prezzo: contare richiede tempo, cinque colpi sono 2,7 secondi, e due
    // annunci accavallati non si contano piu'. Un'altezza si riconosce subito,
    // un conteggio no. Scelta sua, misurata contro il suono vero.
    var SERIE = [0, 4, 8];        // semitoni sopra la campana di base
    var COLPI_MIN = 2;            // la A ne batte due, la D cinque

    // A -> 2 colpi serie 0, B -> 3, C -> 4, D -> 5, E -> 2 colpi serie 1, ...
    function cifraStazione(i) {
        var k = i % (SERIE.length * 4);
        return { serie: Math.floor(k / 4), colpi: COLPI_MIN + (k % 4) };
    }

    // UN SOLO COLPO, non la scampanellata intera. La scampanellata si fa
    // facendo partire questo buffer piu' volte a 0,438 s di distanza, e c'e'
    // un motivo preciso per farla cosi' invece di cuocere l'intera suonata in
    // un buffer: se l'altezza si facesse con playbackRate, un buffer letto
    // piu' veloce accorcerebbe ANCHE il passo fra i colpi, e il passo qui
    // porta l'informazione - e' quello che si conta. Una campana per serie,
    // tre buffer da mezzo secondo in tutto, e il passo resta identico per
    // tutte le stazioni.
    function campana(C, serie) {
        if (!campana.buf) campana.buf = {};
        if (campana.buf[serie]) return campana.buf[serie];
        var sr = C.sampleRate;
        var alza = Math.pow(2, (SERIE[serie] || 0) / 12);
        var n = Math.ceil(sr * CODA);
        var buf = C.createBuffer(1, n, sr);
        var d = buf.getChannelData(0);
        var seme = 123456789;
        function caso() {               // rumore ripetibile: il martelletto
            // Math.imul e non *: in JavaScript seme * 1103515245 sfonda il
            // piu' grande intero esatto e i bit bassi si perdono
            // nell'arrotondamento, cosi' il generatore degenera e il
            // martelletto diventa un clic tonale invece di uno schiocco.
            seme = (Math.imul(seme, 1103515245) + 12345) & 0x7fffffff;
            return (seme / 0x7fffffff) * 2 - 1;
        }
        for (var k = 0; k < MODI.length; k++) {
            var f = RONZIO * MODI[k][0] * alza;
            if (f > sr / 2.2) continue;
            var w = 2 * Math.PI * f / sr, amp = MODI[k][1], tau = MODI[k][2];
            var fase = (k * 2.39) % (2 * Math.PI);
            for (var i = 0; i < n; i++) {
                var t = i / sr;
                // salita invece di gradino: un gradino e' un clic
                d[i] += amp * (1 - Math.exp(-t / ATTACCO))
                      * Math.exp(-t / tau) * Math.sin(w * i + fase);
            }
        }
        var batt = Math.round(sr * 0.004);
        for (var j = 0; j < batt && j < n; j++)
            d[j] += caso() * 0.9 * Math.exp(-j / (sr * 0.0012));
        // porta il picco a -3 dB, poi arrotonda le punte invece di tagliarle
        var picco = 0;
        for (var x = 0; x < n; x++) picco = Math.max(picco, Math.abs(d[x]));
        var g = picco ? 0.707 / picco : 1;
        for (var y = 0; y < n; y++) d[y] = Math.tanh(d[y] * g * 1.2);
        // dissolvenza in coda: senza, il buffer finisce di netto e fa un clic
        var q = Math.round(sr * 0.025);
        for (var z = 0; z < q; z++)
            d[n - q + z] *= 0.5 * (1 + Math.cos(Math.PI * z / q));
        campana.buf[serie] = buf;
        return buf;
    }

    // =======================================================================
    //  il fischio della partenza
    // =======================================================================
    // Anche questo e' calcolato e non scaricato, quindi non porta dentro audio
    // di nessuno: i numeri vengono da un fischio vero a tre canne (una
    // locomotiva Shay a vapore), misurato riga per riga come la campana.
    //
    // Le tre canne stanno a 400,2 / 478,8 / 657,2 Hz - una terza minore, poi
    // un'altra quarta e mezza - e sono quasi seni puri: le loro armoniche
    // stanno fra i 18 e i 28 dB sotto la propria fondamentale. Un fischio non
    // e' una canna d'organo, e' aria che taglia uno spigolo. I ventun livelli
    // di F_RIGHE (tre canne per sette armoniche, in dB sulla riga piu' forte)
    // sono calibrati a ciclo chiuso contro la registrazione: sintetizza,
    // rimisura con lo stesso metro, sottrai lo scarto, ripeti. Chiudono a 0,00
    // dB su tutte e ventuno.
    //
    // Ma la cosa che fa il suono e' un'altra: il volume e l'intonazione hanno
    // due curve SEPARATE. Nel vero il volume arriva a regime in 70 millesimi,
    // l'intonazione ci mette 150 - a volume ormai pieno il fischio e' ancora
    // mezzo semitono sotto, e ci sale dopo. In chiusura cala di due semitoni e
    // mezzo a 0,031 semitoni al millesimo, e comincia a cadere un filo dopo il
    // volume. Legare le due curve - che e' il primo errore che ho fatto - fa
    // consumare il glissato mentre il suono sta ancora salendo, e il glissato
    // non si sente piu'. Con le curve separate il glissato della sintesi
    // ricalca quello misurato entro due decimi di semitono ai due capi.
    var F_CANNE = [400.2, 478.8, 657.2];
    var F_NARM = 7;
    var F_RIGHE = [
        -3.85, -29.51, -21.79, -27.58, -26.16, -30.61, -32.65,   // 400,2 Hz
         0.00, -24.73, -26.81, -26.85, -30.61, -32.91, -38.49,   // 478,8 Hz
        -11.22, -28.82, -26.16, -31.84, -39.01, -39.68, -43.67   // 657,2 Hz
    ];

    // Il soffio e' solo il 3,4% dell'energia delle note, ma senza di lui il
    // fischio e' un sintetizzatore. E non e' rumore bianco: si distribuisce
    // per bande, e queste cinque quote sono misurate sul vero.
    // da Hz, a Hz, quota di energia sulle note
    var F_SOFFIO = [
        [120, 350, 0.000212], [350, 900, 0.007806], [900, 2200, 0.013732],
        [2200, 5000, 0.010071], [5000, 14000, 0.002487]
    ];

    // il volume: salita, tenuta, caduta, e la pausa fra le due fischiate
    var F_SAL = 0.070, F_TEN = 0.285, F_CAL = 0.130, F_PAU = 0.095;
    // Le fischiate con le pause in mezzo: serve al treno, che deve cominciare
    // a fischiare tanto prima quanto il fischio dura. Senza argomento sono due,
    // cioe' la partenza regolare.
    function durataFischio(quante) {
        var una = F_SAL + F_TEN + F_CAL + 0.10;
        var q = quante || 2;
        return q * una + (q - 1) * F_PAU;
    }
    // Sta suonando adesso? `trascorso' e' quanto e' passato dall'inizio del
    // fischio. Vero mentre una fischiata e' in aria, falso nella coda muta e
    // nella pausa in mezzo. Serve al quadro, che lampeggia a tempo col
    // fischio invece che per conto suo.
    function fischioAcceso(trascorso) {
        var una = F_SAL + F_TEN + F_CAL + 0.10;
        return (trascorso % (una + F_PAU)) < F_SAL + F_TEN + F_CAL;
    }
    // l'intonazione: F_GIU semitoni sotto all'attacco, riassorbiti in F_TSU;
    // F_DERIVA quanto sale ancora durante la tenuta; F_CADE semitoni al
    // millesimo in chiusura; F_RIT quanto tardi comincia a cadere.
    var F_GIU = 2.85, F_TSU = 0.150, F_DERIVA = 0.15, F_CADE = 0.031, F_RIT = 0.015;

    // Di quanti semitoni sale il fischio del rimbalzo rispetto a quello della
    // partenza. Le fischiate erano gia' tre contro due, ma il numero si conta
    // solo a mente: a orecchio erano lo stesso suono, e il rimbalzo si deve
    // riconoscere dalla prima nota. Tre semitoni sono una terza minore - si
    // sente subito e resta dentro la famiglia, mezza ottava sarebbe un altro
    // fischio. Salgono tutte e tre le canne insieme, cosi' e' lo stesso
    // strumento, solo piu' piccolo.
    var F_SU_RIMBALZO = 3;

    // Le due fischiate intere in un buffer solo, calcolato la prima volta che
    // serve e poi tenuto. Qui, al contrario della campana, non c'e' niente da
    // contare: il fischio e' sempre lo stesso, e un buffer solo basta.
    // `quante' e' il numero di fischiate: due la partenza, tre il treno
    // respinto dalla stazione sbagliata che riparte. `su' e' di quanti
    // semitoni alzare le canne. Un buffer in cache per ogni combinazione -
    // oggi sono due, e tanto restano.
    function fischio(C, quante, su) {
        var q = quante || 2, sem = su || 0;
        var chiave = q + '/' + sem;
        if (!fischio.buf) fischio.buf = {};
        if (fischio.buf[chiave]) return fischio.buf[chiave];
        var tono = Math.pow(2, sem / 12);
        var sr = C.sampleRate;
        var nf = Math.round(sr * (F_SAL + F_TEN + F_CAL + 0.10));
        var npau = Math.round(sr * F_PAU);
        var n = nf * q + npau * (q - 1);
        var buf = C.createBuffer(1, n, sr);
        var d = buf.getChannelData(0);

        // Una fischiata sola, scritta dentro d a partire da off. Le due
        // fischiate del vero non sono la stessa copiata due volte, e qui si
        // distinguono per il seme: cambiano le fasi e il tremolo, non le note.
        function fischiata(off, seme) {
            function caso() {
                // Math.imul e non *, per lo stesso motivo della campana: il
                // prodotto sfonda il piu' grande intero esatto e i bit bassi
                // si perdono nell'arrotondamento.
                seme = (Math.imul(seme, 1103515245) + 12345) & 0x7fffffff;
                return (seme / 0x7fffffff) * 2 - 1;
            }
            var i, t, p, semi, s;
            var pres = new Float64Array(nf), bend = new Float64Array(nf);
            for (i = 0; i < nf; i++) {
                t = i / sr;
                if (t < F_SAL) p = 1 - Math.exp(-t / (F_SAL * 0.32));
                else if (t < F_SAL + F_TEN) p = 1;
                else p = Math.exp(-(t - F_SAL - F_TEN) / (F_CAL * 0.42));
                pres[i] = p;
                if (t < F_SAL + F_TEN) {
                    s = Math.min(1, t / F_TSU);
                    semi = -F_GIU * (1 - s) * (1 - s) + F_DERIVA * s * s;
                } else {
                    semi = F_DERIVA
                         - F_CADE * Math.max(0, t - F_SAL - F_TEN - F_RIT) * 1000;
                }
                bend[i] = Math.pow(2, semi / 12);
            }

            // il tremolo: il vapore non esce liscio
            var tr = new Float64Array(nf), v = 0, mira = 0;
            var passo = Math.round(sr * 0.055);
            for (i = 0; i < nf; i++) {
                if (i % passo === 0) mira = caso() * 0.09;
                v += (mira - v) * 0.0035;
                tr[i] = 1 + v;
            }

            // Le ventuno righe. La fase si ACCUMULA invece di calcolare
            // sin(w*i): moltiplicando, il bend non piega niente - cambia solo
            // il passo del seno istante per istante e l'intonazione resta
            // dov'era. Il glissato sta tutto in questa somma.
            var q = 0;
            for (var ci = 0; ci < F_CANNE.length; ci++) {
                for (var k = 1; k <= F_NARM; k++) {
                    var a = Math.pow(10, F_RIGHE[q++] / 20);
                    var f = F_CANNE[ci] * tono * k;
                    if (f > sr / 2.2) continue;
                    var fase = (caso() + 1) * Math.PI;
                    for (i = 0; i < nf; i++) {
                        fase += 2 * Math.PI * f * bend[i] / sr;
                        d[off + i] += a * pres[i] * tr[i] * Math.sin(fase);
                    }
                }
            }

            // Il soffio, banda per banda, con un passabanda a biquad. Non si
            // trasporta con le canne: e' vapore che esce da un buco, e il
            // rumore del vapore non ha una nota da alzare.
            var gr = new Float64Array(nf);
            for (i = 0; i < nf; i++) gr[i] = caso();
            var y = new Float64Array(nf);
            for (var bi = 0; bi < F_SOFFIO.length; bi++) {
                var lo = F_SOFFIO[bi][0], hi = F_SOFFIO[bi][1];
                var fc = Math.sqrt(lo * hi), Q = Math.max(0.4, fc / (hi - lo));
                var w0 = 2 * Math.PI * fc / sr, al = Math.sin(w0) / (2 * Q);
                var den = 1 + al;
                var b0 = al / den, b2 = -al / den;
                var a1 = -2 * Math.cos(w0) / den, a2 = (1 - al) / den;
                var x1 = 0, x2 = 0, y1 = 0, y2 = 0, en = 0, u;
                for (i = 0; i < nf; i++) {
                    u = b0 * gr[i] + b2 * x2 - a1 * y1 - a2 * y2;
                    y[i] = u; en += u * u;
                    x2 = x1; x1 = gr[i]; y2 = y1; y1 = u;
                }
                en /= nf;
                var g = en > 0 ? Math.sqrt(F_SOFFIO[bi][2] / en) : 0;
                for (i = 0; i < nf; i++) d[off + i] += g * pres[i] * y[i];
            }
        }

        // Le fischiate del vero non sono la stessa copiata: un seme diverso
        // per ognuna, e cambiano fasi e tremolo, non le note.
        var SEMI = [4242, 9191, 7373];
        for (var z = 0; z < q; z++) fischiata(z * (nf + npau), SEMI[z % SEMI.length]);

        // Le stesse tre rifiniture dell'ascolto che e' stato scelto: picco a
        // -3 dB, punte arrotondate invece che tagliate, e sei millesimi di
        // dissolvenza ai due capi - un buffer che finisce di netto fa un clic.
        var picco = 0, x;
        for (x = 0; x < n; x++) picco = Math.max(picco, Math.abs(d[x]));
        var gg = picco ? 0.707 / picco : 1;
        for (x = 0; x < n; x++) d[x] = Math.tanh(d[x] * gg * 1.1);
        var qd = Math.round(sr * 0.006);
        for (x = 0; x < qd; x++) { d[x] *= x / qd; d[n - 1 - x] *= x / qd; }
        fischio.buf[chiave] = buf;
        return buf;
    }

    // I due suoni in prestito dagli altri giochi sono mp3 gia' mixati. Non
    // passano da un elemento <audio>: si scaricano una volta, si decodificano
    // nel nostro contesto e poi suonano come la campana e il fischio, dallo
    // stesso limitatore e con la stessa manopola.
    //
    // La ragione non e' l'eleganza. site.js dirotta la play() di ogni elemento
    // audio del sito sulla Web Audio API con una sua fetch, un suo contesto e
    // un suo interruttore di silenzio, e scarta il suono se scaricare e
    // decodificare supera il mezzo secondo: l'elemento resta fermo a zero, la
    // promessa si risolve e non si sente niente senza che nessuno protesti.
    // Passando dal nostro contesto quella strada si evita per intero.
    var CAMPIONI = {};        // chiave di SUONI -> AudioBuffer decodificato

    // Un contesto per tutto il gioco. Nasce sospeso quando il quadro si carica
    // prima che l'utente abbia toccato qualcosa, quindi si chiede di accenderlo.
    function ctxAudio() {
        if (!window.AudioContext) return null;
        var C = suona.ctx || (suona.ctx = new AudioContext());
        if (C.state === 'suspended' && C.resume) C.resume();
        return C;
    }

    function precarica(C) {
        if (precarica.fatto || !C) return;
        precarica.fatto = true;
        for (var k in SUONI) {
            if (SUONI.hasOwnProperty(k)) scarica(C, k, SUONI[k]);
        }
    }

    function scarica(C, k, url) {
        try {
            fetch(url).then(function (r) {
                if (!r.ok) throw new Error('risposta ' + r.status);
                return r.arrayBuffer();
            }).then(function (dati) {
                return C.decodeAudioData(dati);
            }).then(function (buf) {
                CAMPIONI[k] = buf;
            })['catch'](function (e) {
                // Questo resta a parlare: un campione che non arriva e' un
                // guasto, e un guasto muto costa mezza giornata a trovarlo.
                console.log('woowoo2: ' + url + ' non si carica: ' + e);
            });
        } catch (err) {
            console.log('woowoo2: ' + url + ' non si carica: ' + err);
        }
    }

    // Due colpi vicini si sovrappongono invece di tagliarsi: ogni colpo e' una
    // sorgente nuova sullo stesso buffer, e gli scambi si toccano uno dietro
    // l'altro.
    function campione(C, che, vol) {
        var buf = CAMPIONI[che];
        if (!buf) return;      // chiesto nel primo secondo, non ancora decodificato
        var s = C.createBufferSource(), g = C.createGain();
        s.buffer = buf;
        g.gain.value = vol;
        s.connect(g); g.connect(uscitaAudio(C));
        // Un filo di anticipo: si prenota l'orologio dell'audio, e un istante
        // gia' passato non si puo' prenotare.
        s.start(C.currentTime + 0.02);
    }

    // Da scrivere in console: prova i due campioni fuori dal gioco.
    window.W2PROVASUONI = function () {
        var C = ctxAudio();
        console.log('woowoo2 audio: audioOn=' + audioOn
            + ', contesto=' + (C ? C.state : 'assente')
            + ', silenzio del sito=' + !!window.audioMuted
            + ', pronti=' + Object.keys(CAMPIONI).join(' '));
        if (!C) return 'niente contesto audio';
        precarica(C);
        campione(C, 'arrivo', VOL.arrivo);
        setTimeout(function () { campione(C, 'scambio', VOL.scambio); }, 2000);
        return 'provo arrivo adesso e scambio fra due secondi';
    };


    // Tutti i suoni passano di qui: un volume generale e un limitatore. Tre
    // campane sovrapposte sommano le ampiezze, e senza freno gracchiano.
    // Si chiama uscitaAudio e non uscita: uscita e' gia' presa, e' quella
    // della stazione (riga 496). Due funzioni con lo stesso nome nello stesso
    // ambito non convivono, la seconda cancella la prima.
    function uscitaAudio(C) {
        if (uscitaAudio.nodo) return uscitaAudio.nodo;
        var g = C.createGain();
        g.gain.value = 0.8;
        var lim = C.createDynamicsCompressor();
        lim.threshold.value = -12; lim.knee.value = 6; lim.ratio.value = 12;
        lim.attack.value = 0.002; lim.release.value = 0.15;
        g.connect(lim); lim.connect(C.destination);
        uscitaAudio.nodo = g;
        return g;
    }

    // `chi' e' la stazione che annuncia, e serve solo all'annuncio.
    function suona(che, chi) {
        if (!audioOn) return;
        try {
            var C = ctxAudio();
            if (!C) return;
            if (che === 'arrivo') { campione(C, 'arrivo', VOL.arrivo); return; }
            if (che === 'scambio') { campione(C, 'scambio', VOL.scambio); return; }
            if (che === 'scontro') { campione(C, 'scontro', VOL.scontro); return; }
            // Il quadro vinto suona la stessa fanfara della consegna.
            if (che === 'vittoria') { campione(C, 'arrivo', VOL.arrivo); return; }
            if (che === 'perso') { campione(C, 'perso', VOL.perso); return; }
            if (che === 'applauso') { campione(C, 'applauso', VOL.applauso); return; }
            if (che === 'annuncio') {
                var serie = chi && chi.serie ? chi.serie : 0;
                var colpi = chi && chi.colpi ? chi.colpi : COLPI_MIN;
                var buf = campana(C, serie);
                // Un filo di anticipo: si sta programmando l'orologio
                // dell'audio, e un istante gia' passato non si puo' prenotare.
                var t0 = C.currentTime + 0.02;
                for (var c = 0; c < colpi; c++) {
                    var s = C.createBufferSource(), gc = C.createGain();
                    s.buffer = buf;
                    gc.gain.value = VOL.campana * FORZA[c % FORZA.length];
                    s.connect(gc); gc.connect(uscitaAudio(C));
                    s.start(t0 + c * PASSO);
                }
                return;
            }
            if (che === 'partenza' || che === 'rimbalzo') {
                // Partenza: due fischiate, intonazione di casa. Rimbalzo: tre
                // fischiate e piu' acuto, che sono due segni invece di uno.
                var rim = che === 'rimbalzo';
                var sf = C.createBufferSource(), gf = C.createGain();
                sf.buffer = fischio(C, rim ? 3 : 2, rim ? F_SU_RIMBALZO : 0);
                gf.gain.value = VOL.fischio;
                sf.connect(gf); gf.connect(uscitaAudio(C));
                // un filo di anticipo: un istante gia' passato non si prenota
                sf.start(C.currentTime + 0.02);
                return;
            }
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
        cv.addEventListener('mousedown', mouseGiu);
        // Non sulla sola tela: il destro parte da li' ma il menu puo' uscire
        // altrove, perche' esce al rilascio e nel frattempo il mouse si e'
        // mosso o il quadro e' finito. Fuori da questi due casi il destro
        // resta quello del browser, nel resto della pagina.
        document.addEventListener('contextmenu', function (e) {
            if (e.target === cv || destroGiu) e.preventDefault();
        });
        window.addEventListener('mouseup', mouseSu);
        window.addEventListener('blur', mouseSu);
        document.addEventListener('keydown', tasti);
        document.addEventListener('keyup', tastiSu);

        // Due tendine distinte: il dischetto A..L e i quadri nostri M..X.
        // Vale sempre l'ultima toccata, e l'altra torna sul suo capofila per
        // dire a colpo d'occhio da quale banco si sta giocando.
        montaSelettori();
        montaRicomincia();
        precarica(ctxAudio());   // i due mp3, prima che servano
        var bp = el('w2-pausa');
        if (bp) bp.onclick = function () { pausa(); };
        var ba = el('w2-audio');
        if (ba) ba.onclick = function () { audioOn = !audioOn; ba.textContent = audioOn ? '🔊' : '🔇'; };

        // Si parte quando sono arrivate tutte: l'atlante del dischetto piu'
        // atlante e dipinto di ogni stile nominato nei dati.
        var stili = stiliUsati();
        var disco = serveDisco();
        var lista = disco ? ['dev/tiles.png?v=1.1'] : [];
        var base = lista.length;
        stili.forEach(function (x) { lista.push(x.atlante, x.sfondo); });
        lista.push(STAZ_SRC);               // la stazione di Luciano, ultima
        immagini(lista, function (im) {
            atlante = disco ? im[0] : null;
            preparaStazioni(im[base + stili.length * 2]);
            stili.forEach(function (x, i) {
                x.img = im[base + i * 2];
                x.fondoImg = im[base + 1 + i * 2];
                // immagini() richiama anche quando un file non c'e': una
                // figura mai arrivata ha larghezza zero.
                x.rotto = !x.img.naturalWidth || !x.fondoImg.naturalWidth;
                if (x.rotto) console.warn('WooWoo: manca ' +
                    (x.img.naturalWidth ? x.sfondo : x.atlante) +
                    (disco ? ', quello schema va con le piastrelle del dischetto'
                           : ', e non c\'e\' nessun atlante di riserva'));
                // I binari non vengono piu' dall'immagine: le loro colonne si
                // ridisegnano sopra una copia dell'atlante, partendo dalla
                // rotta scritta nei codici. Dell'immagine resta tutto il
                // resto - prato, ponte, stazioni, paesaggio.
                if (!x.rotto && window.W2BINARI) x.img = W2BINARI.rifaiAtlante(x.img, x.cella);
                // e sopra la copia dell'atlante vanno le quattro stazioni
                if (!x.rotto && x.img.getContext) montaStazioni(x.img, x.cella);
            });
            pronto = true; carica(CAMPAGNA[0], 0); ciclo();
        });
    }

    var prec = 0;
    function ciclo(ts) {
        // La prenotazione del fotogramma dopo sta qui in cima apposta: se la
        // mettiamo in fondo, il primo errore dentro passo() o disegna() la
        // salta e il gioco si ferma per sempre, senza dire niente.
        requestAnimationFrame(ciclo);
        var dt = prec ? Math.min(0.1, (ts - prec) / 1000) : 0;
        prec = ts;
        // Il tetto va messo PRIMA del moltiplicatore, se no un fotogramma
        // lungo verrebbe amplificato e il treno salterebbe delle caselle.
        if (S.pausa) dt = 0;
        else if (S.turbo) dt *= tara().turbo;
        passo(dt);
        disegna();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
})();
