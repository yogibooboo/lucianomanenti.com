// promozioni.js - I messaggi del sito negli spazi che erano della pubblicita'
//
// Lo carica site.js, sulle pagine di gioco convertite, quando l'interruttore
// PUBBLICITA e' spento: e' l'alternativa a pubblicita.js e si registra come
// fornitore allo stesso modo, con sitoSpazi.registra().
//
// Riempie due posti:
//   - le due colonne ai lati del gioco, con una scheda verticale;
//   - il riquadro di fine partita, con una scheda orizzontale.
// L'interstitial NON e' affare suo: resta in site.js. I riquadri interni ai
// giochi (quello a rotazione del calcolo enigmatico) per ora restano vuoti.
//
// Non ha ?v= nelle pagine: come site.js e' servito senza cache (.htaccess).
// Le immagini invece stanno in cache un anno: per cambiarne una conviene
// darle un nome nuovo (rummy2.jpg) invece di riscrivere quella vecchia.

(function () {
    'use strict';

    if (!window.sitoSpazi || typeof window.sitoSpazi.registra !== 'function') return;

    // I dati qui sotto (interruttori, catalogo, messaggi, etichette) si possono
    // cambiare a mano oppure con dev/promozioni-editor.html, che li riscrive
    // tali e quali: per questo le righe "var GIOCHI = {", "var MESSAGGI = [",
    // "var ETICHETTE = {" e le loro chiusure vanno lasciate come sono.

    // ══ GLI INTERRUTTORI ═════════════════════════════════════════════════

    // Acceso: lo stesso messaggio a sinistra e a destra. Spento: due diversi.
    var COLONNE_UGUALI = true;

    // Acceso: il riquadro di fine partita ripete il messaggio delle colonne.
    // Spento: ne pesca un altro. Conta solo se COLONNE_UGUALI e' acceso (con
    // due messaggi diversi ai lati, a fine partita se ne pesca comunque uno
    // per conto suo).
    var FINE_UGUALE = true;

    // Ogni quanti secondi cambia l'immagine, quando un messaggio ne ha piu'
    // di una.
    var SECONDI_IMMAGINE = 8;

    var CARTELLA = '/promozioni/';

    // La scheda nella colonna e' larga quanto la colonna, margini a parte.
    // Sotto il minimo non si mette niente; il tetto serve solo a non avere
    // una scheda smisurata sugli schermi larghissimi.
    var COLONNA_MINIMA = 160;
    var SCHEDA_MASSIMA = 600;

    // La finestra dell'immagine ha le proporzioni del campo di gioco.
    var PROPORZIONE = 1024 / 750;

    // ══ IL CATALOGO DEI GIOCHI ═══════════════════════════════════════════
    //
    // La chiave e' il nome della pagina: "burraco" vuol dire burraco.html e
    // burraco-en.html, e le immagini burraco1.jpg, burraco2.jpg...
    //   immagini   quante ce ne sono nella cartella, numerate da 1. Vanno
    //              DICHIARATE: il file non le va a cercare. Se la numerazione
    //              ha dei buchi (un'immagine tolta o spenta) al posto del
    //              numero c'e' l'elenco di quelle da mostrare: [1, 3].
    //   immaginiSpente  i numeri delle immagini che ci sono ma non si
    //              mostrano. Qui non serve a niente: e' il promemoria
    //              dell'editor, per poterle riaccendere.
    //   inLingua   quali numeri hanno anche la versione in lingua, per
    //              esempio { en: [1] } se esiste burraco1-en.jpg. Dove c'e'
    //              si usa quella, altrimenti quella senza suffisso.
    //   regole     il nome della pagina di regole, se c'e' (senza .html): il
    //              pulsante REGOLE compare solo allora.
    //   it, en     nome e riga di descrizione.
    //   pagina     solo se la pagina non sta nella radice col nome della
    //              chiave: il percorso dalla radice, senza lingua e senza
    //              .html ('musica/accordi/index'). Allora anche "regole" e'
    //              un percorso dalla radice.
    //   strumento  true per le pagine che non sono un gioco: i pulsanti
    //              dicono APRI e GUIDA invece di GIOCA e REGOLE.
    var GIOCHI = {
        scala40: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-scala40',
            it: { nome: 'Scala 40', testo: 'Si apre con quaranta punti, poi scale, tris e jolly: vince chi resta per primo senza carte.' },
            en: { nome: 'Scala 40', testo: 'Open with forty points, then runs, sets and jokers: the first to get rid of every card wins.' }
        },
        burraco: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-burraco',
            it: { nome: 'Burraco', testo: 'In coppia o da soli contro il computer: scale, combinazioni, pozzetti e burrachi puliti.' },
            en: { nome: 'Burraco', testo: 'With a partner or on your own against the computer: runs, sets, pots and clean burracos.' }
        },
        scopa: {
            immagini: 3, inLingua: { en: [1, 2, 3] }, regole: 'regole-scopa',
            it: { nome: 'Scopa', testo: 'Il classico delle carte italiane: prese, scope, settebello e primiera contro il computer.' },
            en: { nome: 'Scopa', testo: 'The Italian card classic: captures, sweeps, the seven of coins and primiera against the computer.' }
        },
        machiavelli: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-machiavelli',
            it: { nome: 'Machiavelli', testo: 'Il tavolo è di tutti: smonta e ricomponi scale e tris già calati per liberarti delle tue carte.' },
            en: { nome: 'Machiavelli', testo: 'The table belongs to everyone: break up and rebuild the runs and sets already down to get rid of your cards.' }
        },
        rummy: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-rummy',
            it: { nome: 'Gin Rummy', testo: 'Dieci carte, un avversario: combina tris e scale e bussa quando ti resta poco in mano.' },
            en: { nome: 'Gin Rummy', testo: 'Ten cards, one opponent: build sets and runs and knock when there is little left in your hand.' }
        },
        spider: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-spider',
            it: { nome: 'Solitario Spider', testo: 'Dieci colonne e due mazzi: componi le scale dal re all\'asso, a uno, due o quattro semi.' },
            en: { nome: 'Spider Solitaire', testo: 'Ten columns and two decks: build the runs from king down to ace, with one, two or four suits.' }
        },
        klondike: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-klondike',
            it: { nome: 'Solitario Klondike', testo: 'Il solitario per eccellenza: sette colonne, quattro semi da ricomporre dall\'asso al re.' },
            en: { nome: 'Klondike Solitaire', testo: 'The classic patience: seven columns, four suits to build from ace to king.' }
        },
        briscola: {
            immagini: 3, inLingua: { en: [1, 2, 3] }, regole: 'regole-briscola',
            it: { nome: 'Briscola', testo: 'Uno contro uno o in coppia, con le carte napoletane, bresciane o francesi: 120 punti in palio.' },
            en: { nome: 'Briscola', testo: 'One against one or in pairs, with Neapolitan, Brescian or French cards: 120 points to play for.' }
        },
        tressette: {
            immagini: 3, inLingua: { en: [1, 2, 3] }, regole: 'regole-tressette',
            it: { nome: 'Tressette', testo: 'In quattro, a coppie: si risponde al seme e si contano i punti. C\'è anche il Traversone, dove vince chi ne fa meno.' },
            en: { nome: 'Tressette', testo: 'Four players in pairs: follow suit and count the points. There is also Traversone, where the fewest points win.' }
        },
        woowoo: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-woowoo',
            it: { nome: 'WooWoo', testo: 'Gira gli scambi e porta ogni treno alla sua stazione prima che scada il tempo, senza farli scontrare.' },
            en: { nome: 'WooWoo', testo: 'Turn the switches and bring every train to its station before time runs out, without letting them crash.' }
        },
        sudoku: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-sudoku',
            it: { nome: 'Sudoku', testo: 'Tre livelli, la matita per gli appunti e i suggerimenti quando servono.' },
            en: { nome: 'Sudoku', testo: 'Three levels, a pencil for your notes and hints when you need them.' }
        },
        calcolo: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-calcolo',
            it: { nome: 'Calcolo Enigmatico', testo: 'A ogni lettera una cifra: ricostruisci le sei operazioni a forza di logica.' },
            en: { nome: 'Cross Figure', testo: 'One digit for each letter: work out the six sums by logic alone.' }
        },
        quadrati: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-quadrati',
            it: { nome: 'Quadrati', testo: 'Un lato a testa fra i puntini: chi chiude un quadretto se lo prende e gioca ancora.' },
            en: { nome: 'Dots and Boxes', testo: 'One side each between the dots: close a box and it is yours, and you move again.' }
        },
        dama: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-dama',
            it: { nome: 'Dama', testo: 'La dama italiana contro il computer, su tre livelli: la presa è obbligatoria.' },
            en: { nome: 'Checkers', testo: 'Italian checkers against the computer, on three levels: capturing is compulsory.' }
        },
        scacchi: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-scacchi',
            it: { nome: 'Scacchi', testo: 'Una partita a scacchi contro il computer, su tre livelli, con i suggerimenti se li vuoi.' },
            en: { nome: 'Chess', testo: 'A game of chess against the computer, on three levels, with hints if you want them.' }
        },
        mulino: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-mulino',
            it: { nome: 'Mulino (Filetto)', testo: 'Nove pedine a testa: metti in fila tre delle tue e togline una all\'avversario.' },
            en: { nome: 'Nine Men\'s Morris', testo: 'Nine pieces each: line up three of yours and take one from your opponent.' }
        },
        'battaglia-navale': {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-battaglia-navale',
            it: { nome: 'Battaglia Navale', testo: 'Schiera la flotta e affonda quella del computer, un colpo alla volta.' },
            en: { nome: 'Battleship', testo: 'Deploy your fleet and sink the computer\'s, one shot at a time.' }
        },
        navale: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-navale',
            it: { nome: 'Solitario Navale', testo: 'La battaglia navale da risolvere con la logica: i numeri sul bordo dicono dove sono le navi.' },
            en: { nome: 'Battleship Solitaire', testo: 'Battleship as a logic puzzle: the numbers on the edge tell you where the ships are.' }
        },
        mahjong: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-mahjong',
            it: { nome: 'Mahjong', testo: 'Il solitario delle tessere: togli le coppie libere fino a smontare tutta la figura.' },
            en: { nome: 'Mahjong', testo: 'The tile solitaire: remove the free pairs until the whole layout is gone.' }
        },
        domino: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-domino',
            it: { nome: 'Domino', testo: 'Attacca le tessere per numero e resta senza prima del computer, a pesca o a chiusura.' },
            en: { nome: 'Domino', testo: 'Match the tiles by number and run out before the computer, in the draw or the block game.' }
        },
        minato: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-minato',
            it: { nome: 'Campo Minato', testo: 'Scopri le caselle senza toccare le mine: i numeri dicono quante ce ne sono intorno.' },
            en: { nome: 'Minesweeper', testo: 'Uncover the squares without hitting a mine: the numbers tell you how many are around.' }
        },
        'codice-segreto': {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-codice-segreto',
            it: { nome: 'Codice Segreto', testo: 'Indovina la combinazione di colori in dieci tentativi, leggendo gli indizi a ogni prova.' },
            en: { nome: 'Secret Code', testo: 'Guess the colour combination in ten tries, reading the clues after each attempt.' }
        },
        mattoncini: {
            immagini: 1, inLingua: { en: [1] }, regole: 'regole-mattoncini',
            it: { nome: 'Mattoncini', testo: 'I pezzi cadono, tu li giri e li incastri: una riga piena sparisce, e si va sempre più veloci.' },
            en: { nome: 'Bricks', testo: 'The pieces fall, you turn them and fit them in: a full row disappears, and it keeps getting faster.' }
        },
        intervalli: {
            immagini: 1, inLingua: { en: [1] }, strumento: true, pagina: 'musica/intervalli/index', regole: 'musica/intervalli/guida-intervalli',
            it: { nome: 'Intervalli', testo: 'Allena l\'orecchio: ascolta due note e riconosci l\'intervallo, su cinque livelli.' },
            en: { nome: 'Intervals', testo: 'Train your ear: listen to two notes and name the interval, on five levels.' }
        },
        accordi: {
            immagini: 1, inLingua: { en: [1] }, strumento: true, pagina: 'musica/accordi/index', regole: 'musica/accordi/guida-accordi',
            it: { nome: 'Accordi', testo: 'Ascolta l\'accordo e riconoscilo: maggiore, minore, settime e via via fino al jazz.' },
            en: { nome: 'Chords', testo: 'Listen to the chord and name it: major, minor, sevenths and all the way to jazz.' }
        },
        scale: {
            immagini: 1, inLingua: { en: [1] }, strumento: true, pagina: 'musica/scale/index', regole: 'musica/scale/guida-scale',
            it: { nome: 'Scale', testo: 'Ascolta la scala e riconoscila: maggiore, minori, modi, pentatonica e blues.' },
            en: { nome: 'Scales', testo: 'Listen to the scale and name it: major, minors, modes, pentatonic and blues.' }
        },
        metronome: {
            immagini: 1, inLingua: { en: [1] }, strumento: true, regole: 'guida-metronomo',
            it: { nome: 'Metronomo', testo: 'Un metronomo vero nel browser: tempo, suddivisioni e accenti a scelta.' },
            en: { nome: 'Metronome', testo: 'A real metronome in your browser: tempo, subdivisions and accents of your choice.' }
        }
    };

    // ══ I MESSAGGI ═══════════════════════════════════════════════════════
    //
    // Due tipi:
    //   tipo 'gioco'   presenta un gioco del catalogo (campo "gioco"), con i
    //                  pulsanti GIOCA e REGOLE. Non esce mai sulla pagina di
    //                  quel gioco.
    //   tipo 'testo'   un messaggio libero: titolo e testo per lingua, e
    //                  facoltativi "immagine" (un file della cartella, o un
    //                  elenco di file che ruotano), "pulsante" (l'etichetta,
    //                  dentro it/en) e "link" (dove porta). Anche qui
    //                  "immaginiSpente" e' il promemoria dell'editor.
    // Per tutti:
    //   id       il nome con cui il messaggio finisce in Analytics
    //   peso     quante probabilita' ha di uscire rispetto agli altri
    //   dove     ['colonne', 'fine']: in quali posti puo' uscire
    //   spento   facoltativo, true: resta qui ma non esce mai
    //   dal, al  facoltativi, 'AAAA-MM-GG' compresi: fuori da li' non esce
    //   soloSu   facoltativo, elenco di giochi: esce solo su quelle pagine
    //   nonSu    facoltativo, elenco di giochi: su quelle pagine non esce
    var MESSAGGI = [
        { id: 'scala40',          tipo: 'gioco', gioco: 'scala40',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'burraco',          tipo: 'gioco', gioco: 'burraco',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'scopa',            tipo: 'gioco', gioco: 'scopa',            peso: 1, dove: ['colonne', 'fine'] },
        { id: 'machiavelli',      tipo: 'gioco', gioco: 'machiavelli',      peso: 1, dove: ['colonne', 'fine'] },
        { id: 'rummy',            tipo: 'gioco', gioco: 'rummy',            peso: 1, dove: ['colonne', 'fine'] },
        { id: 'spider',           tipo: 'gioco', gioco: 'spider',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'klondike',         tipo: 'gioco', gioco: 'klondike',         peso: 1, dove: ['colonne', 'fine'] },
        { id: 'briscola',         tipo: 'gioco', gioco: 'briscola',         peso: 1, dove: ['colonne', 'fine'] },
        { id: 'tressette',        tipo: 'gioco', gioco: 'tressette',        peso: 1, dove: ['colonne', 'fine'] },
        { id: 'woowoo',           tipo: 'gioco', gioco: 'woowoo',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'sudoku',           tipo: 'gioco', gioco: 'sudoku',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'calcolo',          tipo: 'gioco', gioco: 'calcolo',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'quadrati',         tipo: 'gioco', gioco: 'quadrati',         peso: 1, dove: ['colonne', 'fine'] },
        { id: 'dama',             tipo: 'gioco', gioco: 'dama',             peso: 1, dove: ['colonne', 'fine'] },
        { id: 'scacchi',          tipo: 'gioco', gioco: 'scacchi',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'mulino',           tipo: 'gioco', gioco: 'mulino',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'battaglia-navale', tipo: 'gioco', gioco: 'battaglia-navale', peso: 1, dove: ['colonne', 'fine'] },
        { id: 'navale',           tipo: 'gioco', gioco: 'navale',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'mahjong',          tipo: 'gioco', gioco: 'mahjong',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'domino',           tipo: 'gioco', gioco: 'domino',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'minato',           tipo: 'gioco', gioco: 'minato',           peso: 1, dove: ['colonne', 'fine'] },
        { id: 'codice-segreto',   tipo: 'gioco', gioco: 'codice-segreto',   peso: 1, dove: ['colonne', 'fine'] },
        { id: 'mattoncini',       tipo: 'gioco', gioco: 'mattoncini',       peso: 1, dove: ['colonne', 'fine'] },
        { id: 'intervalli',       tipo: 'gioco', gioco: 'intervalli',       peso: 1, dove: ['colonne', 'fine'] },
        { id: 'accordi',          tipo: 'gioco', gioco: 'accordi',          peso: 1, dove: ['colonne', 'fine'] },
        { id: 'scale',            tipo: 'gioco', gioco: 'scale',            peso: 1, dove: ['colonne', 'fine'] },
        { id: 'metronome',        tipo: 'gioco', gioco: 'metronome',        peso: 1, dove: ['colonne', 'fine'] },
        {
            id: 'scrivetemi', tipo: 'testo', peso: 3, dove: ['colonne', 'fine'],
            immagine: 'busta.svg',
            link: 'mailto:postmaster@lucianomanenti.com',
            it: {
                titolo: 'Scrivetemi',
                testo: 'Questo sito è stato creato solo per il mio e il vostro divertimento. Mi fa piacere ricevere i vostri suggerimenti e le vostre opinioni.',
                pulsante: 'SCRIVIMI'
            },
            en: {
                titolo: 'Write to me',
                testo: 'This site was made only for my enjoyment and yours. I am always glad to receive your suggestions and opinions.',
                pulsante: 'WRITE TO ME'
            }
        },
        {
            id: 'lavori', tipo: 'testo', peso: 3, dove: ['colonne', 'fine'],
            immagine: 'niente-pubblicita2.svg',
            it: {
                titolo: 'Niente più pubblicità',
                testo: 'Ho deciso di togliere la pubblicità, ma il sito continua. Lo sto risistemando un gioco alla volta: se qualcosa non funziona, fatemelo sapere.'
            },
            en: {
                titolo: 'No more advertising',
                testo: 'I have decided to remove the advertising, but the site goes on. I am reworking it one game at a time: if something does not work, please let me know.'
            }
        },
        {
            // Chi gioca una volta spesso non ritrova piu' il sito: le ricerche
            // "(gioco) luciano" portano gia' qui in prima posizione (Search
            // Console, 18/11/2026), e chi le fa clicca quasi sempre.
            id: 'ritrovarmi', tipo: 'testo', peso: 3, dove: ['colonne', 'fine'],
            immagine: 'ritrovarmi.svg',
            it: {
                titolo: 'Per ritrovarmi',
                testo: 'Per tornare a giocare cerca su Google il nome del gioco seguito da Luciano, per esempio «Briscola Luciano».'
            },
            en: {
                titolo: 'To find me again',
                testo: 'To come back and play, search Google for the name of the game followed by Luciano, for example "Briscola Luciano".'
            }
        }
    ];

    // Le etichette dei pulsanti, uguali per tutti i giochi.
    var ETICHETTE = {
        it: { gioca: 'PROVA', regole: 'REGOLE', apri: 'PROVA', guida: 'GUIDA' },
        en: { gioca: 'TRY IT', regole: 'RULES', apri: 'TRY IT', guida: 'GUIDE' }
    };

    // ══ DA QUI IN GIU' IL MECCANISMO ═════════════════════════════════════

    function lingua() { return window.currentLang || 'it'; }
    function perLingua(blocco) { return blocco[lingua()] || blocco.it; }
    // Le pagine e le immagini in lingua hanno il suffisso della lingua,
    // l'italiano non ne ha: rummy.html, rummy-en.html.
    function suffisso() { return lingua() === 'it' ? '' : '-' + lingua(); }

    // Il gioco in cui siamo: il percorso della pagina, senza lingua e senza
    // .html, cercato nel catalogo. Se non c'e' resta il nome della pagina.
    var QUI = (function () {
        var percorso = location.pathname.replace(/^\/+/, '');
        if (!percorso || /\/$/.test(percorso)) percorso += 'index';
        percorso = percorso.replace(/\.html?$/, '').replace(/-[a-z]{2}$/, '');
        for (var k in GIOCHI) {
            if ((GIOCHI[k].pagina || k) === percorso) return k;
        }
        return percorso.split('/').pop();
    })();

    function oggi() {
        var d = new Date();
        function due(n) { return (n < 10 ? '0' : '') + n; }
        return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate());
    }

    function puoUscire(m, dove) {
        if (m.spento) return false;
        if (m.dove && m.dove.indexOf(dove) < 0) return false;
        if (m.tipo === 'gioco' && (m.gioco === QUI || !GIOCHI[m.gioco])) return false;
        if (m.soloSu && m.soloSu.indexOf(QUI) < 0) return false;
        if (m.nonSu && m.nonSu.indexOf(QUI) >= 0) return false;
        var g = oggi();
        if (m.dal && g < m.dal) return false;
        if (m.al && g > m.al) return false;
        return true;
    }

    // Pesca a sorte secondo i pesi, lasciando fuori gli id in "esclusi". Se
    // escludendo non resta niente, pesca fra tutti.
    function pesca(dove, esclusi) {
        var buoni = [], i;
        for (i = 0; i < MESSAGGI.length; i++) {
            if (puoUscire(MESSAGGI[i], dove)) buoni.push(MESSAGGI[i]);
        }
        if (!buoni.length) return null;
        var scelti = [];
        for (i = 0; i < buoni.length; i++) {
            if (!esclusi || esclusi.indexOf(buoni[i].id) < 0) scelti.push(buoni[i]);
        }
        if (!scelti.length) scelti = buoni;
        var totale = 0;
        for (i = 0; i < scelti.length; i++) totale += (scelti[i].peso || 1);
        var r = Math.random() * totale;
        for (i = 0; i < scelti.length; i++) {
            r -= (scelti[i].peso || 1);
            if (r < 0) return scelti[i];
        }
        return scelti[scelti.length - 1];
    }

    // L'ultimo messaggio visto si ricorda per la durata della scheda del
    // browser: i giochi ricominciano ricaricando la pagina, e cosi' a ogni
    // partita nuova il messaggio cambia.
    function ultimoVisto() {
        try { return sessionStorage.getItem('sito_promo_ultimo') || ''; } catch (e) { return ''; }
    }
    function ricordaVisto(id) {
        try { sessionStorage.setItem('sito_promo_ultimo', id); } catch (e) { }
    }

    // I messaggi della pagina: si pescano una volta e restano quelli finche'
    // la pagina non si ricarica.
    var scelta = null;
    function messaggiDellaPagina() {
        if (scelta) return scelta;
        var sx = pesca('colonne', [ultimoVisto()]);
        var dx = sx;
        if (!COLONNE_UGUALI && sx) dx = pesca('colonne', [ultimoVisto(), sx.id]);
        var fine;
        if (COLONNE_UGUALI && FINE_UGUALE && sx && puoUscire(sx, 'fine')) fine = sx;
        else fine = pesca('fine', [sx ? sx.id : '', dx ? dx.id : '']);
        if (sx) ricordaVisto(sx.id);
        scelta = { sinistra: sx, destra: dx, fine: fine };
        return scelta;
    }

    // ── Le immagini ──────────────────────────────────────────────────────

    function immaginiDi(m) {
        var lista = [], i;
        if (m.tipo === 'gioco') {
            var g = GIOCHI[m.gioco];
            var inLingua = (g.inLingua && g.inLingua[lingua()]) || [];
            // Un numero vuol dire "da 1 a quel numero", un elenco e' gia'
            // l'elenco dei numeri.
            var numeri = g.immagini || 0;
            if (typeof numeri === 'number') {
                var quante = numeri;
                numeri = [];
                for (i = 1; i <= quante; i++) numeri.push(i);
            }
            for (i = 0; i < numeri.length; i++) {
                lista.push(CARTELLA + m.gioco + numeri[i] + (inLingua.indexOf(numeri[i]) >= 0 ? suffisso() : '') + '.jpg');
            }
        } else if (m.immagine) {
            var nomi = (typeof m.immagine === 'string') ? [m.immagine] : m.immagine;
            for (i = 0; i < nomi.length; i++) lista.push(CARTELLA + nomi[i]);
        }
        return lista;
    }

    // La rotazione e' una sola per tutta la pagina: un contatore che avanza
    // a tempo, e ogni finestra mostra l'immagine che gli tocca. Cosi' le due
    // colonne cambiano insieme.
    var giro = 0;
    var orologio = null;
    function mostraGiro() {
        var finestre = document.querySelectorAll('.promo-finestra');
        for (var i = 0; i < finestre.length; i++) {
            var img = finestre[i].querySelectorAll('img');
            for (var j = 0; j < img.length; j++) {
                img[j].className = (j === giro % img.length) ? 'promo-accesa' : '';
            }
        }
    }
    function avviaOrologio() {
        if (orologio) return;
        orologio = setInterval(function () {
            // A scheda nascosta non si gira: nessuno guarda.
            if (document.hidden) return;
            giro++;
            mostraGiro();
        }, SECONDI_IMMAGINE * 1000);
    }

    // ── Analytics ────────────────────────────────────────────────────────

    function conta(evento, m, dove, azione) {
        if (typeof window.gtag !== 'function') return;
        var dati = { promo: m.id, dove: dove, pagina: QUI };
        if (azione) dati.azione = azione;
        else dati.non_interaction = true;
        window.gtag('event', evento, dati);
    }
    // Si contano solo i clic (promo_clic). Le comparse (promo_vista) non si
    // mandano piu' dal 16 novembre 2026: erano un evento a ogni pagina e a ogni
    // fine partita, e non servivano.

    // ── La scheda ────────────────────────────────────────────────────────

    function crea(tag, classe, testo) {
        var el = document.createElement(tag);
        if (classe) el.className = classe;
        if (testo) el.textContent = testo;
        return el;
    }

    function collegamento(classe, href, m, dove, azione) {
        var a = crea('a', classe);
        a.href = href;
        a.addEventListener('click', function () { conta('promo_clic', m, dove, azione); });
        return a;
    }

    // Costruisce la scheda di un messaggio. "dove" e' 'colonne' o 'fine': la
    // forma (verticale o orizzontale) la da' la classe, il contenuto e' lo
    // stesso.
    function scheda(m, dove) {
        var s = crea('div', 'spazio-sito promo promo-' + dove);
        var titolo, testo, principale = null, pulsanti = [];
        var et = perLingua(ETICHETTE);

        if (m.tipo === 'gioco') {
            var g = GIOCHI[m.gioco];
            var tx = perLingua(g);
            titolo = tx.nome;
            testo = tx.testo;
            // Dalla radice, cosi' il collegamento vale anche da una
            // pagina che sta in una sottocartella.
            principale = '/' + (g.pagina || m.gioco) + suffisso() + '.html';
            pulsanti.push({ etichetta: g.strumento ? et.apri : et.gioca, href: principale, azione: 'gioca', classe: 'promo-pulsante promo-primo' });
            if (g.regole) {
                pulsanti.push({ etichetta: g.strumento ? et.guida : et.regole, href: '/' + g.regole + suffisso() + '.html', azione: 'regole', classe: 'promo-pulsante' });
            }
        } else {
            var t = perLingua(m);
            titolo = t.titolo;
            testo = t.testo;
            if (m.link) {
                principale = m.link;
                if (t.pulsante) pulsanti.push({ etichetta: t.pulsante, href: m.link, azione: 'pulsante', classe: 'promo-pulsante promo-primo' });
            }
        }

        var immagini = immaginiDi(m);
        if (immagini.length) {
            var finestra = principale ? collegamento('promo-finestra', principale, m, dove, 'immagine') : crea('div', 'promo-finestra');
            for (var i = 0; i < immagini.length; i++) {
                var img = crea('img', i === giro % immagini.length ? 'promo-accesa' : '');
                img.src = immagini[i];
                img.alt = titolo;
                img.draggable = false;
                finestra.appendChild(img);
            }
            s.appendChild(finestra);
            if (immagini.length > 1) avviaOrologio();
        } else {
            s.className += ' promo-senza-immagine';
        }

        var corpo = crea('div', 'promo-corpo');
        if (titolo) corpo.appendChild(crea('div', 'promo-titolo', titolo));
        if (testo) corpo.appendChild(crea('div', 'promo-testo', testo));
        if (pulsanti.length) {
            var riga = crea('div', 'promo-pulsanti');
            for (var p = 0; p < pulsanti.length; p++) {
                var a = collegamento(pulsanti[p].classe, pulsanti[p].href, m, dove, pulsanti[p].azione);
                a.textContent = pulsanti[p].etichetta;
                riga.appendChild(a);
            }
            corpo.appendChild(riga);
        }
        s.appendChild(corpo);
        return s;
    }

    // ── Lo stile ─────────────────────────────────────────────────────────
    // Tutte le misure della scheda sono in em: basta cambiare il corpo del
    // carattere sulla scheda perche' cresca o cali tutta insieme.
    function mettiStile() {
        if (document.getElementById('promo-stile')) return;
        var st = document.createElement('style');
        st.id = 'promo-stile';
        st.textContent =
            '.promo{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#e6e7e9;' +
                'background:#4b4e53;border:1px solid #6a6e74;border-radius:.7em;' +
                'padding:.7em;line-height:1.35;text-align:center;}' +
            '.promo *{box-sizing:border-box;}' +
            '.promo-finestra{display:block;position:relative;width:100%;aspect-ratio:1024/750;' +
                'border-radius:.4em;overflow:hidden;flex-shrink:0;}' +
            '.promo-finestra img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;' +
                'opacity:0;transition:opacity 1s;}' +
            '.promo-finestra img.promo-accesa{opacity:1;}' +
            'a.promo-finestra{cursor:pointer;}' +
            '.promo-titolo{font-size:1.3em;font-weight:bold;color:#fff;margin:.1em 0 .25em;}' +
            '.promo-testo{font-size:1em;color:#d9dadd;}' +
            '.promo-pulsanti{display:flex;flex-wrap:wrap;justify-content:center;gap:.5em;margin-top:.7em;}' +
            'a.promo-pulsante{display:inline-block;padding:.45em 1em;border-radius:.4em;font-size:.95em;' +
                'font-weight:bold;letter-spacing:.04em;text-decoration:none;color:#e6e7e9;' +
                'background:transparent;border:1px solid #8a8e94;cursor:pointer;}' +
            'a.promo-pulsante:hover{background:#5c6066;}' +
            'a.promo-pulsante.promo-primo{background:#2c2e32;border-color:#2c2e32;color:#fff;}' +
            'a.promo-pulsante.promo-primo:hover{background:#1d1f22;}' +
            // nella colonna: in piedi, in alto
            '.promo-colonne{display:flex;flex-direction:column;align-items:center;margin:12px 0 auto;flex-shrink:0;}' +
            '.promo-colonne .promo-corpo{width:100%;margin-top:.6em;}' +
            // a fine partita: sdraiata, immagine a sinistra
            '.promo-fine{position:absolute;z-index:50000;display:flex;align-items:center;gap:16px;' +
                'font-size:15px;padding:12px;background:#4b4e53;box-shadow:0 4px 15px rgba(0,0,0,.3);}' +
            '.promo-fine .promo-finestra{width:auto;height:100%;}' +
            '.promo-fine .promo-corpo{flex:1;min-width:0;}' +
            '.promo-fine.promo-senza-immagine .promo-corpo{padding:0 30px;}';
        document.head.appendChild(st);
    }

    // ── Le colonne ───────────────────────────────────────────────────────

    var inColonna = { sinistra: null, destra: null };

    function sistemaColonna(lato, colonna, larghezza, altezza) {
        var m = messaggiDellaPagina()[lato];
        var s = inColonna[lato];
        if (!m || larghezza < COLONNA_MINIMA) {
            if (s && s.parentNode) s.parentNode.removeChild(s);
            return;
        }
        if (!s) s = inColonna[lato] = scheda(m, 'colonne');
        if (s.parentNode !== colonna) colonna.appendChild(s);

        var margine = Math.max(6, Math.round(larghezza * 0.05));
        var largh = Math.min(larghezza - 2 * margine, SCHEDA_MASSIMA);
        var disponibile = altezza - 2 * margine;
        var finestra = s.querySelector('.promo-finestra');
        var testo = s.querySelector('.promo-testo');

        s.style.display = 'flex';
        s.style.width = largh + 'px';
        // Il carattere cresce con la scheda: 12 px a 150 di larghezza, 20 a 400.
        s.style.fontSize = Math.max(12, Math.min(20, 12 + (largh - 150) * 0.032)) + 'px';
        if (testo) testo.style.display = '';
        if (finestra) { finestra.style.width = '100%'; finestra.style.display = ''; }

        // Se in altezza non ci sta: prima si stringe l'immagine (fino a
        // meta'), poi si toglie il testo, e solo alla fine l'immagine.
        if (s.offsetHeight > disponibile && finestra) {
            var altFinestra = finestra.offsetHeight;
            var serve = altFinestra - (s.offsetHeight - disponibile);
            var minima = altFinestra * 0.5;
            finestra.style.width = Math.round(Math.max(serve, minima) * PROPORZIONE) + 'px';
        }
        if (s.offsetHeight > disponibile && testo) {
            testo.style.display = 'none';
            // Tolto il testo l'immagine puo' riallargarsi.
            if (finestra) {
                finestra.style.width = '100%';
                if (s.offsetHeight > disponibile) {
                    var alt2 = finestra.offsetHeight;
                    var serve2 = alt2 - (s.offsetHeight - disponibile);
                    if (serve2 >= alt2 * 0.4) finestra.style.width = Math.round(serve2 * PROPORZIONE) + 'px';
                    else finestra.style.display = 'none';
                }
            }
        }
        if (s.offsetHeight > disponibile) { s.style.display = 'none'; }
    }

    function colonne(info) {
        mettiStile();
        sistemaColonna('sinistra', info.sinistra, info.larghezzaSinistra, info.altezza);
        sistemaColonna('destra', info.destra, info.larghezzaDestra, info.altezza);
    }

    // ── Il fine partita ──────────────────────────────────────────────────

    function finePartita(formId, opzioni) {
        // Il posto lo calcola site.js, con le misure che il gioco passa.
        var posto = window.sitoSpazi.postoFinePartita(formId, opzioni);
        if (!posto) return;
        var m = messaggiDellaPagina().fine;
        if (!m) return;
        mettiStile();
        var s = scheda(m, 'fine');
        s.style.top = (-posto.su) + 'px';
        s.style.left = posto.sinistra + 'px';
        s.style.width = posto.larghezza + 'px';
        s.style.height = posto.altezza + 'px';
        // Nel riquadro il testo ha le sue righe da rispettare: se l'altezza e'
        // poca, il carattere cala con lei.
        s.style.fontSize = Math.max(11, Math.min(16, posto.altezza / 15)) + 'px';
        posto.modale.appendChild(s);
        mostraGiro();
    }

    // geometria e interstitial non si definiscono: restano quelli di site.js.
    window.sitoSpazi.registra({
        colonne: colonne,
        finePartita: finePartita
    });
})();
