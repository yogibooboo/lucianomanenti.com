/* ============================================================================
   CODICE SEGRETO - Logica di gioco
   Gioco di deduzione: il computer nasconde una fila di colori, il giocatore
   prova a indovinarla e a ogni tentativo riceve due numeri - quanti colori
   sono giusti e al posto giusto, quanti sono giusti ma spostati.
   Stessa impalcatura del Calcolo Enigmatico: timer, record, matrice delle
   possibilita', suggerimento a due livelli con penalita', salvataggio.
   ============================================================================ */

/* === DIZIONARIO === */
const COD_LANG_IT = {
    titolo: 'Codice Segreto<br>Luciano',
    // Colori: il nome serve al suggerimento e alla modale di sconfitta
    colori: ['Rosso', 'Blu', 'Verde', 'Giallo', 'Arancio', 'Viola', 'Bianco', 'Nero'],
    tentativi: 'Tentativi',
    tempo: 'Tempo',
    prova: 'Prova',
    svuota: 'Svuota',
    completaRiga: 'Completa la fila e premi PROVA',
    rigaPronta: 'Premi PROVA per il verdetto',
    appuntiErrore: (p, c) => 'Gli indizi smentiscono un appunto: casella ' + p + ', colore ' + c,
    appuntiErroreVago: 'I tuoi appunti contraddicono gli indizi',
    appuntiErroreSol: (p, c) => 'Appunto sbagliato: casella ' + p + ', colore ' + c,
    restanti: (n) => n === 1 ? 'Resta 1 sola combinazione possibile'
                             : 'Combinazioni ancora possibili: ' + n,
    restantiTante: 'Combinazioni ancora possibili: più di 5.000',
    giaProvata: 'Questa fila l\'hai già provata',
    nonRipetibile: 'In questa partita ogni colore compare una volta sola',
    esito: (n, b) => 'Al posto giusto: ' + n + '  ·  colore giusto, posto sbagliato: ' + b,
    vinto: 'CODICE APERTO!',
    perso: 'Tentativi finiti',
    ilCodiceEra: 'Il codice era:',
    vediSchemaBtn: 'VEDI LO SCHEMA',
    tornaAlRisultatoBtn: 'TORNA AL RISULTATO',
    nuovaPartitaBtn: 'NUOVA PARTITA',
    vintoDettagli: (t, tp) => 'Aperto in ' + t + (t === 1 ? ' tentativo' : ' tentativi') + ' – tempo ' + tp,
    recordAll: 'Record',
    recordWeek: 'Settimana',
    recordDay: 'Oggi',
    nuovoRecord: 'NUOVO RECORD!',
    nuovoRecordSett: 'RECORD DELLA SETTIMANA!',
    nuovoRecordGiorno: 'RECORD DI OGGI!',
    nessunRecord: '–',
    // Suggerimento
    hintTitolo: 'Suggerimento',
    hintOfferta1: (p) => 'Posso scartare due colori dalla <b>casella ' + p + '</b>.',
    hintOfferta2: (p) => 'Posso dirti il colore esatto della <b>casella ' + p + '</b>.',
    hintPenalita1: 'Costa <b>+10 secondi</b> sul tempo di gara.',
    hintPenalita2: 'Costa <b>+20 secondi</b> sul tempo di gara.',
    hintEsito1: (p, a, b) => 'La <b>casella ' + p + '</b> non è né <b>' + a + '</b> né <b>' + b + '</b>.',
    hintEsito2: (p, c) => 'La <b>casella ' + p + '</b> è <b>' + c + '</b>.',
    hintEsito1uno: (p, a) => 'La <b>casella ' + p + '</b> non è <b>' + a + '</b>.',
    hintApplica: 'Accetto',
    hintAvanti: 'Dimmi di più',
    hintChiudi: 'Chiudi',
    hintFinito: 'Su questa casella non ho altro da dirti.',
    hintNiente: 'Hai già dedotto tutte le caselle.',
    // Modale d'avvio
    scegliDifficolta: 'Scegli la difficoltà',
    facile: 'Facile',
    classico: 'Classico',
    esperto: 'Esperto',
    descFacile: '4 caselle, 6 colori, 10 tentativi',
    descClassico: '4 caselle, 8 colori, 10 tentativi',
    descEsperto: '5 caselle, 8 colori, 12 tentativi',
    ripetizioni: 'Il codice può ripetere lo stesso colore',
    inizia: 'Inizia',
    riprendi: 'Riprendi la partita',
    // Conferma
    confermaTermina: 'Vuoi abbandonare la partita in corso?',
    si: 'SÌ',
    no: 'NO',
    // Opzioni
    optAppunti: 'Avvisami se i miei appunti contraddicono gli indizi',
    optRestanti: 'Mostrami quante combinazioni restano possibili',
    optSoluzione: 'Avvisami se i miei appunti contraddicono la soluzione',
    // Matrice
    matriceTitolo: 'Possibilità',
    coloriTitolo: 'Colori',
    senzaRipSigla: 'colori unici',
    pinEsatto: 'al posto giusto',
    pinPresente: 'colore giusto, posto sbagliato',
    intestaEsito: 'Esito',
    modoEscludi: 'Escludi',
    modoAssegna: 'Assegna',
    scorciatoiaEscludi: 'click',
    scorciatoiaAssegna: 'click destro'
};

const COD_LANG_EN = {
    titolo: 'Secret Code<br>Luciano',
    colori: ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'White', 'Black'],
    tentativi: 'Guesses',
    tempo: 'Time',
    prova: 'Guess',
    svuota: 'Clear',
    completaRiga: 'Fill the row and press GUESS',
    rigaPronta: 'Press GUESS for the verdict',
    appuntiErrore: (p, c) => 'The clues rule out one of your notes: slot ' + p + ', colour ' + c,
    appuntiErroreVago: 'Your notes contradict the clues you have',
    appuntiErroreSol: (p, c) => 'Wrong note: slot ' + p + ', colour ' + c,
    restanti: (n) => n === 1 ? 'Only 1 possible combination left'
                             : 'Combinations still possible: ' + n,
    restantiTante: 'Combinations still possible: more than 5,000',
    giaProvata: 'You have already tried this row',
    nonRipetibile: 'In this game each colour appears only once',
    esito: (n, b) => 'Right place: ' + n + '  ·  right colour, wrong place: ' + b,
    vinto: 'CODE CRACKED!',
    perso: 'Out of guesses',
    ilCodiceEra: 'The code was:',
    vediSchemaBtn: 'VIEW THE BOARD',
    tornaAlRisultatoBtn: 'BACK TO RESULT',
    nuovaPartitaBtn: 'NEW GAME',
    vintoDettagli: (t, tp) => 'Cracked in ' + t + (t === 1 ? ' guess' : ' guesses') + ' – time ' + tp,
    recordAll: 'Record',
    recordWeek: 'This week',
    recordDay: 'Today',
    nuovoRecord: 'NEW RECORD!',
    nuovoRecordSett: 'RECORD OF THE WEEK!',
    nuovoRecordGiorno: 'RECORD OF THE DAY!',
    nessunRecord: '–',
    hintTitolo: 'Hint',
    hintOfferta1: (p) => 'I can rule out two colours for <b>slot ' + p + '</b>.',
    hintOfferta2: (p) => 'I can tell you the exact colour of <b>slot ' + p + '</b>.',
    hintPenalita1: 'It costs <b>+10 seconds</b> on your race time.',
    hintPenalita2: 'It costs <b>+20 seconds</b> on your race time.',
    hintEsito1: (p, a, b) => '<b>Slot ' + p + '</b> is neither <b>' + a + '</b> nor <b>' + b + '</b>.',
    hintEsito2: (p, c) => '<b>Slot ' + p + '</b> is <b>' + c + '</b>.',
    hintEsito1uno: (p, a) => '<b>Slot ' + p + '</b> is not <b>' + a + '</b>.',
    hintApplica: 'I accept',
    hintAvanti: 'Tell me more',
    hintChiudi: 'Close',
    hintFinito: 'Nothing more to say about this slot.',
    hintNiente: 'You have already worked out every slot.',
    scegliDifficolta: 'Choose the difficulty',
    facile: 'Easy',
    classico: 'Classic',
    esperto: 'Expert',
    descFacile: '4 slots, 6 colours, 10 guesses',
    descClassico: '4 slots, 8 colours, 10 guesses',
    descEsperto: '5 slots, 8 colours, 12 guesses',
    ripetizioni: 'The code may repeat the same colour',
    inizia: 'Start',
    riprendi: 'Resume game',
    confermaTermina: 'Do you want to abandon the game in progress?',
    si: 'YES',
    no: 'NO',
    optAppunti: 'Warn me if my notes contradict the clues',
    optRestanti: 'Show me how many combinations are still possible',
    optSoluzione: 'Warn me if my notes contradict the solution',
    matriceTitolo: 'Possibilities',
    coloriTitolo: 'Colours',
    senzaRipSigla: 'unique colours',
    pinEsatto: 'right place',
    pinPresente: 'right colour, wrong place',
    intestaEsito: 'Result',
    modoEscludi: 'Exclude',
    modoAssegna: 'Assign',
    scorciatoiaEscludi: 'click',
    scorciatoiaAssegna: 'right click'
};

const T = (window.currentLang === 'en') ? COD_LANG_EN : COD_LANG_IT;

/* === TAVOLOZZA ===
   Otto colori scelti perche' restino distinti anche sul feltro verde. Il campo
   "testo" dice se il numero stampato sopra va scritto scuro o chiaro: sul
   giallo e sul bianco una cifra bianca sparirebbe. */
const COLORI = [
    { hex: '#e03131', testo: 'scuro'  },  // 1 rosso
    { hex: '#1c7ed6', testo: 'scuro'  },  // 2 blu
    { hex: '#2f9e44', testo: 'scuro'  },  // 3 verde
    { hex: '#f2d024', testo: 'chiaro' },  // 4 giallo
    { hex: '#f76707', testo: 'scuro'  },  // 5 arancio
    { hex: '#9c36b5', testo: 'scuro'  },  // 6 viola
    { hex: '#f1f3f5', testo: 'chiaro' },  // 7 bianco
    { hex: '#212529', testo: 'scuro'  }   // 8 nero
];

const COD_LIVELLI = {
    facile:   { posizioni: 4, colori: 6, maxTentativi: 10 },
    classico: { posizioni: 4, colori: 8, maxTentativi: 10 },
    esperto:  { posizioni: 5, colori: 8, maxTentativi: 12 }
};

/* Enumerare tutti i codici serve per contare quanti ne restano compatibili.
   Il caso peggiore e' 8^5 = 32.768: si fa a mano senza scomodare nulla. */
const LIMITE_ENUMERAZIONE = 40000;

/* === STATO ===
   Chi arriva qui per la prima volta parte dal grado piu' basso e senza colori
   ripetuti: e' la versione in cui la matrice delle possibilita' fa quasi tutto
   il lavoro, e serve a capire il gioco prima di alzare l'asticella. Chi ha gia'
   giocato ritrova la sua scelta, che il localStorage se la ricorda. */
let livello = 'facile';
let conRipetizioni = false;
let nPos = 4, nCol = 6, maxTentativi = 10;
let codice = [];               // la soluzione
let tentativi = [];            // [{ fila:[...], neri, bianchi }]
let bozza = [];                // la fila in composizione, -1 = buco
let cursore = 0;
let escluseMano = [];          // escluseMano[pos][col] = true se barrata a mano
let assegnate = [];            // assegnate[pos] = col oppure -1
let posizioneSel = 0;          // colonna della matrice evidenziata
// La cella che un avviso indica come sbagliata, { pos, col } oppure null: la
// matrice la accende di rosso, cosi' l'avviso non costringe a cercarla a mano.
let segnoSbagliato = null;
let modoAssegna = false;       // il prossimo click sulla matrice assegna
let partitaInCorso = false;
// Quale modale di fine partita e' aperta ('haivinto' / 'haiperso' / ''): serve a
// "vedi lo schema" per sapere dove tornare e se il codice va svelato.
let modaleFineAperta = '';
let secondi = 0;
let timerId = null;
let hintPos = -1;
let hintFase = 0;              // 0 = nessun aiuto sulla casella, 1 = primo dato
let records = {};

/* === UTILITA' === */
function elem(id) { return document.getElementById(id); }

function formattaTempo(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function nomeColore(c) { return T.colori[c]; }

/* Tre nomi diversi per tre cose diverse, che prima erano tutte numeri: il
   colore e' una lettera (A..H), la posizione nel codice e' un numero (1..n,
   in testa alle colonne dei tentativi e a quelle della matrice), il
   tentativo e' R1..Rn. */
function siglaColore(c) { return String.fromCharCode(65 + c); }
function siglaTentativo(r) { return 'R' + (r + 1); }

/* Un breve tono, senza file audio: il gioco non ha versi da fare, servono solo
   un tocco e una campana. Se l'utente ha spento l'audio non suona nulla. */
function suona(freq, durata, tipo) {
    if (window.audioMuted) return;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!window._codAudioCtx) window._codAudioCtx = new Ctx();
        const ctx = window._codAudioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tipo || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durata);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durata);
    } catch (e) { /* audio non disponibile: pazienza */ }
}

/* === IL CUORE DEL GIOCO: il confronto ===
   Prima si contano le caselle esatte e si tolgono di mezzo; solo sul resto si
   contano i colori presenti ma spostati, con un conteggio per colore. Farlo in
   un giro solo produrrebbe doppi conteggi sui codici con colori ripetuti. */
function confronta(fila, soluzione) {
    let neri = 0;
    const restoFila = [], restoSol = [];
    for (let i = 0; i < soluzione.length; i++) {
        if (fila[i] === soluzione[i]) neri++;
        else { restoFila.push(fila[i]); restoSol.push(soluzione[i]); }
    }
    const contaSol = {};
    for (const c of restoSol) contaSol[c] = (contaSol[c] || 0) + 1;
    let bianchi = 0;
    for (const c of restoFila) {
        if (contaSol[c] > 0) { bianchi++; contaSol[c]--; }
    }
    return { neri: neri, bianchi: bianchi };
}

/* Tutte le combinazioni che sopravvivono agli indizi raccolti finora.
   Si scorre l'intero spazio: e' piccolo, e cosi' il conto e' esatto invece che
   stimato. Restituisce null se lo spazio e' troppo grande per valere la pena.
   L'elenco serve a due cose - contare le superstiti e controllare gli appunti -
   percio' si tiene in cache: la chiave e' l'insieme degli indizi, quindi si
   rifa' da sola quando arriva un tentativo nuovo o comincia un'altra partita. */
let cacheCompatibili = null;
let cacheChiave = null;

function elencaCompatibili() {
    const chiave = livello + '|' + (conRipetizioni ? 'rip' : 'uni') + '|' +
        tentativi.map(t => t.fila.join(',') + ':' + t.neri + '-' + t.bianchi).join('|');
    if (cacheChiave === chiave) return cacheCompatibili;
    cacheChiave = chiave;
    const totale = Math.pow(nCol, nPos);
    if (totale > LIMITE_ENUMERAZIONE) { cacheCompatibili = null; return null; }
    const lista = [];
    const fila = new Array(nPos).fill(0);
    for (let n = 0; n < totale; n++) {
        let resto = n;
        for (let i = 0; i < nPos; i++) { fila[i] = resto % nCol; resto = Math.floor(resto / nCol); }
        if (!conRipetizioni) {
            const visti = new Set(fila);
            if (visti.size !== nPos) continue;
        }
        let ok = true;
        for (const t of tentativi) {
            const r = confronta(t.fila, fila);
            if (r.neri !== t.neri || r.bianchi !== t.bianchi) { ok = false; break; }
        }
        if (ok) lista.push(fila.slice());
    }
    cacheCompatibili = lista;
    return lista;
}

function contaCompatibili() {
    const lista = elencaCompatibili();
    return lista === null ? -1 : lista.length;
}

/* Gli appunti sono sbagliati? Non si guarda la soluzione - quella il gioco non
   la consulta mai - ma solo gli indizi gia' avuti: se nessuna delle combinazioni
   ancora in piedi rispetta le crocette e le assegnazioni segnate a mano, allora
   uno di quei segni e' sbagliato di sicuro, e dirlo non svela niente che gli
   indizi non dicessero gia'. Se togliendo un solo segno i conti tornano il
   colpevole e' quello e si puo' nominare; se i segni sbagliati sono piu' d'uno
   si dice soltanto che qualcosa non torna.
   Restituisce { pos, col } sul colpevole unico, {} sull'errore non attribuibile,
   null se gli appunti reggono (o se lo spazio e' troppo grande da enumerare). */
function appuntiSbagliati() {
    const lista = elencaCompatibili();
    if (!lista || !lista.length) return null;
    const segni = [];
    for (let p = 0; p < nPos; p++) {
        if (assegnate[p] !== -1) segni.push({ pos: p, col: assegnate[p], croce: false });
        for (let c = 0; c < nCol; c++) {
            if (escluseMano[p][c]) segni.push({ pos: p, col: c, croce: true });
        }
    }
    if (!segni.length) return null;
    const rispetta = (cod, salta) => {
        for (const s of segni) {
            if (s === salta) continue;
            if (s.croce) { if (cod[s.pos] === s.col) return false; }
            else if (cod[s.pos] !== s.col) return false;
        }
        return true;
    };
    if (lista.some(cod => rispetta(cod, null))) return null;
    const colpevoli = segni.filter(s => lista.some(cod => rispetta(cod, s)));
    return colpevoli.length === 1 ? colpevoli[0] : {};
}

/* L'altro controllo, quello che il codice lo guarda davvero: un segno e'
   sbagliato se barra il colore giusto o se assegna quello sbagliato. Qui il
   colpevole c'e' sempre e ha nome e cognome, e proprio per questo l'opzione
   parte spenta: non e' una deduzione, e' un aiuto. Dice quale segno rifare, non
   quale sia il colore buono: quello resta da trovare.
   Restituisce { pos, col } sul primo segno sbagliato, null se gli appunti sono
   tutti veri. */
function appuntiControSoluzione() {
    for (let p = 0; p < nPos; p++) {
        if (assegnate[p] !== -1 && assegnate[p] !== codice[p]) return { pos: p, col: assegnate[p] };
        for (let c = 0; c < nCol; c++) {
            if (escluseMano[p][c] && codice[p] === c) return { pos: p, col: c };
        }
    }
    return null;
}

function generaCodice() {
    const nuovo = [];
    if (conRipetizioni) {
        for (let i = 0; i < nPos; i++) nuovo.push(Math.floor(Math.random() * nCol));
    } else {
        const urna = [];
        for (let c = 0; c < nCol; c++) urna.push(c);
        for (let i = urna.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [urna[i], urna[j]] = [urna[j], urna[i]];
        }
        for (let i = 0; i < nPos; i++) nuovo.push(urna[i]);
    }
    return nuovo;
}

/* === DISEGNO DEL TABELLONE === */

function creaPiolo(colore, extraClasse) {
    const d = document.createElement('div');
    d.className = 'piolo' + (extraClasse ? ' ' + extraClasse : '');
    if (colore === undefined || colore === null || colore < 0) {
        d.classList.add('vuoto');
    } else {
        d.style.backgroundColor = COLORI[colore].hex;
        d.classList.add(COLORI[colore].testo);
        d.textContent = siglaColore(colore);
    }
    return d;
}

function creaRisposta(neri, bianchi) {
    const box = document.createElement('div');
    box.className = 'risposta';
    for (let i = 0; i < nPos; i++) {
        const p = document.createElement('div');
        // L'ordine e' sempre neri-bianchi-buchi: dire QUALE casella e' giusta
        // svuoterebbe il gioco, quindi i pin non seguono le posizioni.
        p.className = 'pin ' + (i < neri ? 'pin-esatto' : (i < neri + bianchi ? 'pin-presente' : 'pin-vuoto'));
        box.appendChild(p);
    }
    return box;
}

/* I numeri sopra le colonne dei pioli sono le posizioni del codice: le stesse
   che stanno in testa alle colonne della matrice delle possibilita'. */
function disegnaIntestaPosizioni() {
    const testa = elem('intesta-posizioni');
    testa.innerHTML = '';
    for (let i = 0; i < nPos; i++) {
        const c = document.createElement('span');
        c.className = 'h-pos';
        c.textContent = String(i + 1);
        testa.appendChild(c);
    }
}

function disegnaTentativi() {
    disegnaIntestaPosizioni();
    const lista = elem('lista-tentativi');
    lista.innerHTML = '';
    for (let r = 0; r < maxTentativi; r++) {
        const riga = document.createElement('div');
        riga.className = 'riga-tentativo';

        const num = document.createElement('div');
        num.className = 'num-tentativo';
        num.textContent = siglaTentativo(r);
        riga.appendChild(num);

        const pioli = document.createElement('div');
        pioli.className = 'pioli-riga';

        if (r < tentativi.length) {
            const t = tentativi[r];
            for (let i = 0; i < nPos; i++) pioli.appendChild(creaPiolo(t.fila[i]));
            riga.appendChild(pioli);
            riga.appendChild(creaRisposta(t.neri, t.bianchi));
        } else if (r === tentativi.length && partitaInCorso) {
            riga.classList.add('corrente');
            for (let i = 0; i < nPos; i++) {
                const extra = (i === cursore ? 'cursore' : '') +
                              (i === hintPos && hintFase > 0 ? ' suggerito' : '');
                const p = creaPiolo(bozza[i], extra.trim());
                p.dataset.pos = String(i);
                p.addEventListener('click', () => { cursore = i; disegnaTentativi(); });
                p.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    bozza[i] = -1;
                    cursore = i;
                    aggiornaTutto();
                });
                pioli.appendChild(p);
            }
            riga.appendChild(pioli);
            riga.appendChild(creaRisposta(0, 0));
        } else {
            riga.classList.add('futura');
            for (let i = 0; i < nPos; i++) pioli.appendChild(creaPiolo(-1));
            riga.appendChild(pioli);
            riga.appendChild(creaRisposta(0, 0));
        }
        lista.appendChild(riga);
    }
}

function disegnaTavolozza() {
    const tav = elem('tavolozza');
    tav.innerHTML = '';
    for (let c = 0; c < nCol; c++) {
        const b = document.createElement('button');
        b.className = 'btn-colore ' + COLORI[c].testo;
        b.style.backgroundColor = COLORI[c].hex;
        b.textContent = siglaColore(c);
        b.title = nomeColore(c) + ' (' + siglaColore(c) + ')';
        b.addEventListener('click', () => posaColore(c));
        tav.appendChild(b);
    }
}

/* === MATRICE DELLE POSSIBILITA' ===
   Sono appunti del giocatore, non un oracolo: di suo il gioco non ci mette le
   mani e non impedisce di barrare la casella giusta. I controlli sono due, tutti
   e due a richiesta, e non sono la stessa cosa: uno guarda gli indizi gia'
   ricevuti - deduzione, niente di regalato - l'altro guarda la soluzione, ed e'
   un aiuto vero, percio' parte spento. Le sole celle spente "da sole" sono
   quelle che discendono da un'assegnazione, e si distinguono a vista. */

function esclusaAuto(p, c) {
    if (assegnate[p] !== -1 && assegnate[p] !== c) return true;
    if (!conRipetizioni) {
        for (let q = 0; q < nPos; q++) if (q !== p && assegnate[q] === c) return true;
    }
    return false;
}

function coloreGiaPreso(c) {
    if (conRipetizioni) return false;
    for (let q = 0; q < nPos; q++) if (assegnate[q] === c) return true;
    return false;
}

/* La matrice e' orientata come lo storico dei tentativi: le caselle del codice
   sono le colonne, numerate 1..n, e i colori sono le righe. Cosi' il numero che
   si legge in cima a una colonna qui e' lo stesso numero che si legge la', e
   non c'e' niente da ribaltare con la testa passando dall'una all'altra. */
function disegnaMatrice() {
    const griglia = elem('matrice-possibilita');
    griglia.innerHTML = '';
    griglia.style.gridTemplateColumns = '30px repeat(' + nPos + ', 1fr)';

    const angolo = document.createElement('div');
    angolo.className = 'mat-angolo';
    griglia.appendChild(angolo);

    // Intestazione: i numeri delle caselle. Sono bottoni, scelgono la casella
    // su cui si sta ragionando.
    for (let p = 0; p < nPos; p++) {
        const et = document.createElement('button');
        et.className = 'btn-posizione' + (p === posizioneSel ? ' selezionata' : '');
        et.textContent = String(p + 1);
        et.addEventListener('click', () => { posizioneSel = p; cursore = p; aggiornaTutto(); });
        griglia.appendChild(et);
    }

    // Quanti colori restano in piedi su ogni casella: se ne resta uno solo, la
    // deduzione e' chiusa e quella cella si accende.
    const superstiti = [];
    for (let p = 0; p < nPos; p++) {
        const vivi = [];
        for (let c = 0; c < nCol; c++) {
            if (!escluseMano[p][c] && !esclusaAuto(p, c)) vivi.push(c);
        }
        superstiti.push(vivi);
    }

    for (let c = 0; c < nCol; c++) {
        const h = document.createElement('div');
        h.className = 'mat-intestazione ' + COLORI[c].testo;
        h.style.backgroundColor = COLORI[c].hex;
        h.textContent = siglaColore(c);
        if (coloreGiaPreso(c)) h.classList.add('col-presa');
        griglia.appendChild(h);

        for (let p = 0; p < nPos; p++) {
            const cella = document.createElement('button');
            cella.className = 'mat-cella';
            if (p === posizioneSel) cella.classList.add('mat-col-sel');

            if (assegnate[p] === c) {
                cella.classList.add('mat-assegnata');
                cella.textContent = '●';
            } else if (escluseMano[p][c]) {
                cella.classList.add('mat-esclusa');
                cella.textContent = '✕';
            } else if (esclusaAuto(p, c)) {
                cella.classList.add('mat-esclusa-auto');
                cella.textContent = '✕';
            } else {
                cella.textContent = '';
                if (superstiti[p].length === 1 && superstiti[p][0] === c) cella.classList.add('mat-unica');
            }
            if (segnoSbagliato && segnoSbagliato.pos === p && segnoSbagliato.col === c) {
                cella.classList.add('mat-sbagliata');
            }

            cella.addEventListener('click', (e) => {
                e.preventDefault();
                posizioneSel = p;
                if (modoAssegna) { assegna(p, c); armaAssegna(false); }
                else commutaEsclusione(p, c);
            });
            cella.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                posizioneSel = p;
                assegna(p, c);
                armaAssegna(false);
            });
            griglia.appendChild(cella);
        }
    }
}

function commutaEsclusione(p, c) {
    if (assegnate[p] === c) { assegnate[p] = -1; aggiornaTutto(); return; }
    escluseMano[p][c] = !escluseMano[p][c];
    suona(escluseMano[p][c] ? 320 : 420, 0.06, 'square');
    aggiornaTutto();
}

/* Assegnare vuol dire due cose insieme: fissare l'appunto sulla matrice e
   mettere quel colore nella fila in composizione. Sono la stessa decisione,
   separarle costringerebbe a rifare il gesto due volte. */
function assegna(p, c) {
    if (assegnate[p] === c) assegnate[p] = -1;
    else {
        assegnate[p] = c;
        escluseMano[p][c] = false;
        bozza[p] = c;
        cursore = prossimoBuco(p);
        suona(660, 0.09, 'triangle');
    }
    aggiornaTutto();
}

function armaAssegna(stato) {
    modoAssegna = stato;
    const radioE = elem('radio-escludi'), radioA = elem('radio-assegna');
    if (radioE) radioE.checked = !stato;
    if (radioA) radioA.checked = stato;
    elem('modo-escludi').classList.toggle('attivo', !stato);
    elem('modo-assegna').classList.toggle('attivo', stato);
    elem('pannello-matrice').classList.toggle('pannello-assegna', stato);
    elem('sprite-assegna').classList.toggle('visibile', stato);
}

/* === COMPOSIZIONE DELLA FILA === */

function prossimoBuco(da) {
    for (let i = da + 1; i < nPos; i++) if (bozza[i] < 0) return i;
    for (let i = 0; i < nPos; i++) if (bozza[i] < 0) return i;
    return Math.min(da + 1, nPos - 1);
}

function posaColore(c) {
    if (!partitaInCorso) return;
    // Senza ripetizioni il colore gia' posato altrove non si ripete: e' una
    // regola della partita, non un'opinione, quindi si blocca sul nascere.
    if (!conRipetizioni) {
        for (let i = 0; i < nPos; i++) {
            if (i !== cursore && bozza[i] === c) { messaggio(T.nonRipetibile, 'msg-rosso'); return; }
        }
    }
    bozza[cursore] = c;
    suona(520, 0.05, 'triangle');
    cursore = prossimoBuco(cursore);
    aggiornaTutto();
}

function svuotaBozza() {
    bozza = new Array(nPos).fill(-1);
    cursore = 0;
    aggiornaTutto();
}

/* === MESSAGGIO DI STATO === */
function messaggio(testo, classe) {
    const m = elem('messaggio-stato');
    m.textContent = testo;
    m.className = classe || '';
}

function aggiornaMessaggio() {
    segnoSbagliato = null;
    if (!partitaInCorso) return;
    // L'errore negli appunti riguarda la matrice, non la fila: si segnala
    // subito, anche mentre la fila e' ancora a meta'.
    // Il confronto con la soluzione viene prima perche' e' il piu' preciso dei
    // due: il colpevole lo nomina sempre.
    if (elem('chk-soluzione').checked) {
        const errato = appuntiControSoluzione();
        if (errato) {
            segnoSbagliato = errato;
            messaggio(T.appuntiErroreSol(errato.pos + 1, siglaColore(errato.col)), 'msg-rosso');
            return;
        }
    }
    if (elem('chk-appunti').checked) {
        const sbaglio = appuntiSbagliati();
        if (sbaglio) {
            // Colpevole non attribuibile: si dice che qualcosa non torna, ma
            // non si punta il dito su una cella a caso.
            if (sbaglio.pos !== undefined) segnoSbagliato = sbaglio;
            messaggio(sbaglio.pos === undefined ? T.appuntiErroreVago
                : T.appuntiErrore(sbaglio.pos + 1, siglaColore(sbaglio.col)), 'msg-rosso');
            return;
        }
    }
    if (bozza.some(c => c < 0)) {
        if (elem('chk-restanti').checked) {
            const n = contaCompatibili();
            messaggio(n < 0 ? T.restantiTante : T.restanti(n), '');
        } else {
            messaggio(T.completaRiga, '');
        }
        return;
    }
    if (elem('chk-restanti').checked) {
        const n = contaCompatibili();
        messaggio(n < 0 ? T.restantiTante : T.restanti(n), 'msg-verde');
        return;
    }
    messaggio(T.rigaPronta, 'msg-verde');
}

function aggiornaInfo() {
    const restanti = maxTentativi - tentativi.length;
    const v = elem('info-tentativi');
    v.textContent = restanti + '/' + maxTentativi;
    v.classList.toggle('in-riserva', restanti <= 2);
    elem('info-tempo').textContent = formattaTempo(secondi);
}

function aggiornaTutto() {
    disegnaTentativi();
    disegnaTavolozza();
    // Prima il messaggio, poi la matrice: e' il messaggio a stabilire quale
    // cella e' sbagliata, e la matrice deve gia' saperlo quando la disegna.
    aggiornaMessaggio();
    disegnaMatrice();
    aggiornaInfo();
    elem('btn-prova').disabled = !partitaInCorso || bozza.some(c => c < 0);
    salvaPartita();
}

/* === IL TENTATIVO === */
function provaFila() {
    if (!partitaInCorso || bozza.some(c => c < 0)) return;
    // Ributtare una fila gia' giocata non porta informazione e brucia un
    // tentativo: si avvisa invece di lasciarlo fare in silenzio.
    for (const t of tentativi) {
        if (t.fila.every((v, i) => v === bozza[i])) { messaggio(T.giaProvata, 'msg-rosso'); return; }
    }

    const fila = bozza.slice();
    const r = confronta(fila, codice);
    tentativi.push({ fila: fila, neri: r.neri, bianchi: r.bianchi });

    if (r.neri === nPos) { vittoria(); return; }

    if (tentativi.length >= maxTentativi) { sconfitta(); return; }

    suona(r.neri > 0 ? 700 : 300, 0.09, 'sine');
    // Le assegnazioni valgono per la fila appena giocata: si tengono, ma la
    // bozza riparte da quello che il giocatore ha dato per certo.
    bozza = new Array(nPos).fill(-1);
    for (let p = 0; p < nPos; p++) if (assegnate[p] !== -1) bozza[p] = assegnate[p];
    cursore = bozza.indexOf(-1) === -1 ? 0 : bozza.indexOf(-1);
    hintPos = -1;
    hintFase = 0;
    aggiornaTutto();
    messaggio(T.esito(r.neri, r.bianchi), r.neri > 0 ? 'msg-giallo' : '');
}

/* === SUGGERIMENTO A DUE LIVELLI ===
   Stessa scala del Calcolo Enigmatico: il primo aiuto restringe, il secondo
   risolve, e tutti e due costano tempo di gara. Le penalita' non fermano il
   cronometro: si sommano ai secondi, cosi' il record resta confrontabile. */

function posizioneDaAiutare() {
    // Si aiuta la prima casella non ancora decisa dal giocatore.
    for (let p = 0; p < nPos; p++) if (assegnate[p] === -1) return p;
    return -1;
}

function apriHint() {
    if (!partitaInCorso) return;
    if (hintPos === -1) {
        hintPos = posizioneDaAiutare();
        hintFase = 0;
    }
    const pan = elem('pannello-hint');
    if (hintPos === -1) {
        elem('hint-testo').textContent = T.hintNiente;
        elem('hint-penalita').textContent = '';
        elem('btn-hint-applica').style.display = 'none';
    } else {
        elem('btn-hint-applica').style.display = '';
        if (hintFase === 0) {
            elem('hint-testo').innerHTML = T.hintOfferta1(hintPos + 1);
            elem('hint-penalita').innerHTML = T.hintPenalita1;
        } else {
            elem('hint-testo').innerHTML = T.hintOfferta2(hintPos + 1);
            elem('hint-penalita').innerHTML = T.hintPenalita2;
        }
        elem('btn-hint-applica').textContent = T.hintApplica;
    }
    pan.classList.add('aperto');
}

function chiudiHint() {
    elem('pannello-hint').classList.remove('aperto');
}

function mostraPenalita(x, y, testo) {
    const s = document.createElement('div');
    s.className = 'penalita-volante';
    s.textContent = testo;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 2700);
}

function applicaHint(evento) {
    if (hintPos === -1) { chiudiHint(); return; }
    const rect = elem('pannello-hint').getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (hintFase === 0) {
        // Due colori sbagliati per quella casella, scelti tra quelli ancora in
        // piedi: se sono gia' tutti barrati non c'e' niente da scartare.
        const candidati = [];
        for (let c = 0; c < nCol; c++) {
            if (c === codice[hintPos]) continue;
            if (escluseMano[hintPos][c] || esclusaAuto(hintPos, c)) continue;
            candidati.push(c);
        }
        if (candidati.length < 1) { hintFase = 1; apriHint(); return; }
        for (let i = candidati.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidati[i], candidati[j]] = [candidati[j], candidati[i]];
        }
        const scelti = candidati.slice(0, 2);
        for (const c of scelti) escluseMano[hintPos][c] = true;
        secondi += 10;
        mostraPenalita(cx, cy, '+10s');
        elem('hint-testo').innerHTML = scelti.length === 2
            ? T.hintEsito1(hintPos + 1, nomeColore(scelti[0]), nomeColore(scelti[1]))
            : T.hintEsito1uno(hintPos + 1, nomeColore(scelti[0]));
        hintFase = 1;
        elem('hint-penalita').innerHTML = T.hintPenalita2;
        elem('btn-hint-applica').textContent = T.hintAvanti;
    } else {
        const c = codice[hintPos];
        assegnate[hintPos] = c;
        escluseMano[hintPos][c] = false;
        bozza[hintPos] = c;
        secondi += 20;
        mostraPenalita(cx, cy, '+20s');
        elem('hint-testo').innerHTML = T.hintEsito2(hintPos + 1, nomeColore(c));
        elem('hint-penalita').textContent = T.hintFinito;
        elem('btn-hint-applica').style.display = 'none';
        hintPos = -1;
        hintFase = 0;
    }
    suona(880, 0.12, 'sine');
    aggiornaTutto();
}

/* === TIMER === */
function avviaTimer() {
    fermaTimer();
    timerId = setInterval(() => {
        secondi++;
        elem('info-tempo').textContent = formattaTempo(secondi);
        if (secondi % 10 === 0) salvaPartita();
    }, 1000);
}
function fermaTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
}

/* === RECORD ===
   Il punteggio naturale di questo gioco e' il numero di tentativi; il tempo
   fa da spareggio. Un record per ogni combinazione livello + ripetizioni,
   perche' senza ripetizioni lo spazio e' molto piu' piccolo e i due numeri non
   sarebbero confrontabili. */

function chiaveConfig() { return livello + (conRipetizioni ? '-rip' : '-norip'); }

function chiaveOggi() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function chiaveSettimana() {
    const d = new Date();
    const giovedi = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    giovedi.setDate(giovedi.getDate() + 3 - ((giovedi.getDay() + 6) % 7));
    const primoGiovedi = new Date(giovedi.getFullYear(), 0, 4);
    const settimana = 1 + Math.round(((giovedi - primoGiovedi) / 86400000 - 3 + ((primoGiovedi.getDay() + 6) % 7)) / 7);
    return giovedi.getFullYear() + '-W' + settimana;
}

function caricaRecords() {
    try { records = JSON.parse(localStorage.getItem('codice-records')) || {}; }
    catch (e) { records = {}; }
    renderRecord();
}

function salvaRecords() {
    try { localStorage.setItem('codice-records', JSON.stringify(records)); } catch (e) {}
}

function megli(a, b) {
    // "a batte b": meno tentativi, e a parita' di tentativi meno tempo.
    if (!b) return true;
    if (a.tent !== b.tent) return a.tent < b.tent;
    return a.sec < b.sec;
}

function formattaRecord(r) {
    if (!r) return T.nessunRecord;
    return r.tent + ' · ' + formattaTempo(r.sec);
}

function renderRecord() {
    const k = chiaveConfig();
    const blocco = records[k] || {};
    const oggi = chiaveOggi(), sett = chiaveSettimana();
    // L'intestazione dice a quale configurazione si riferiscono i tre numeri:
    // senza, cambiando difficolta' i record sembrerebbero azzerati da soli.
    elem('record-diff').textContent = T[livello] + (conRipetizioni ? '' : ' · ' + T.senzaRipSigla);
    elem('record-all').textContent = formattaRecord(blocco.all);
    elem('record-week').textContent = (blocco.weekly && blocco.weekly.k === sett)
        ? formattaRecord(blocco.weekly) : T.nessunRecord;
    elem('record-day').textContent = (blocco.daily && blocco.daily.k === oggi)
        ? formattaRecord(blocco.daily) : T.nessunRecord;
}

function aggiornaRecords(tent, sec) {
    const k = chiaveConfig();
    if (!records[k]) records[k] = {};
    const blocco = records[k];
    const oggi = chiaveOggi(), sett = chiaveSettimana();
    const nuovo = { tent: tent, sec: sec };
    const esiti = { all: false, weekly: false, daily: false };

    if (megli(nuovo, blocco.all)) { blocco.all = nuovo; esiti.all = true; }
    if (!blocco.weekly || blocco.weekly.k !== sett || megli(nuovo, blocco.weekly)) {
        blocco.weekly = { tent: tent, sec: sec, k: sett }; esiti.weekly = true;
    }
    if (!blocco.daily || blocco.daily.k !== oggi || megli(nuovo, blocco.daily)) {
        blocco.daily = { tent: tent, sec: sec, k: oggi }; esiti.daily = true;
    }
    salvaRecords();
    renderRecord();
    return esiti;
}

/* Azzeramento in due tempi: il primo click arma il pulsante, il secondo entro
   tre secondi cancella. Un record buttato per sbaglio non si recupera. */
function azzeraRecordSingolo(btn, campo) {
    if (btn._timerConferma) {
        clearTimeout(btn._timerConferma);
        btn._timerConferma = null;
        btn.classList.remove('conferma');
        btn.textContent = '⟲';
        const k = chiaveConfig();
        if (records[k]) { delete records[k][campo]; salvaRecords(); }
        renderRecord();
        return;
    }
    btn.classList.add('conferma');
    btn.textContent = '?';
    btn._timerConferma = setTimeout(() => {
        btn.classList.remove('conferma');
        btn.textContent = '⟲';
        btn._timerConferma = null;
    }, 3000);
}

/* === SALVATAGGIO === */
function salvaPartita() {
    if (!partitaInCorso) return;
    try {
        localStorage.setItem('codice-save', JSON.stringify({
            livello: livello,
            ripetizioni: conRipetizioni,
            codice: codice,
            tentativi: tentativi,
            bozza: bozza,
            cursore: cursore,
            escluseMano: escluseMano,
            assegnate: assegnate,
            posizioneSel: posizioneSel,
            secondi: secondi
        }));
    } catch (e) {}
}

function cancellaSalvataggio() {
    try { localStorage.removeItem('codice-save'); } catch (e) {}
}

function caricaPartita() {
    try {
        const s = JSON.parse(localStorage.getItem('codice-save'));
        if (!s || !s.codice || !COD_LIVELLI[s.livello]) return null;
        return s;
    } catch (e) { return null; }
}

function riprendiPartita(s) {
    livello = s.livello;
    conRipetizioni = !!s.ripetizioni;
    const cfg = COD_LIVELLI[livello];
    nPos = cfg.posizioni; nCol = cfg.colori; maxTentativi = cfg.maxTentativi;
    codice = s.codice;
    tentativi = s.tentativi || [];
    bozza = s.bozza || new Array(nPos).fill(-1);
    cursore = s.cursore || 0;
    escluseMano = s.escluseMano || creaMatriceVuota();
    assegnate = s.assegnate || new Array(nPos).fill(-1);
    posizioneSel = s.posizioneSel || 0;
    secondi = s.secondi || 0;
    hintPos = -1; hintFase = 0;
    partitaInCorso = true;
    armaAssegna(false);
    chiudiModali();
    aggiornaTutto();
    renderRecord();
    avviaTimer();
}

function creaMatriceVuota() {
    const m = [];
    for (let p = 0; p < nPos; p++) m.push(new Array(nCol).fill(false));
    return m;
}

/* === FINE PARTITA === */
function vittoria() {
    partitaInCorso = false;
    fermaTimer();
    cancellaSalvataggio();
    suona(880, 0.15, 'sine');
    setTimeout(() => suona(1175, 0.25, 'sine'), 150);

    const esiti = aggiornaRecords(tentativi.length, secondi);
    aggiornaTutto();
    disegnaTentativi();

    elem('vittoria-titolo').textContent = T.vinto;
    elem('vittoria-dettagli').textContent = T.vintoDettagli(tentativi.length, formattaTempo(secondi));

    const badge = elem('vittoria-record');
    const modale = elem('haivinto');
    if (esiti.all)          badge.textContent = T.nuovoRecord;
    else if (esiti.weekly)  badge.textContent = T.nuovoRecordSett;
    else if (esiti.daily)   badge.textContent = T.nuovoRecordGiorno;
    else                    badge.textContent = '';
    const conRecord = !!badge.textContent;
    badge.style.display = conRecord ? 'block' : 'none';
    modale.classList.toggle('con-record', conRecord);

    if (typeof gtag === 'function') {
        gtag('event', (window.gameConfig && window.gameConfig.gaPrefix ? window.gameConfig.gaPrefix : '') + 'game_won', {
            livello: livello,
            ripetizioni: conRipetizioni ? 'si' : 'no',
            tentativi: tentativi.length,
            tempo: secondi
        });
    }

    modaleFineAperta = 'haivinto';
    modale.style.display = 'flex';
    if (typeof window.setupAmazonFinishBanner === 'function') {
        window.setupAmazonFinishBanner('haivinto', {
            modalStyle: { overflow: 'visible' },
            targetTop: 430,
            applyModalTop: false,
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

function sconfitta() {
    partitaInCorso = false;
    fermaTimer();
    cancellaSalvataggio();
    suona(220, 0.4, 'sawtooth');
    aggiornaTutto();
    disegnaTentativi();

    elem('sconfitta-titolo').textContent = T.perso;
    const svelato = elem('codice-svelato');
    svelato.innerHTML = '';
    for (let i = 0; i < nPos; i++) svelato.appendChild(creaPiolo(codice[i]));

    if (typeof gtag === 'function') {
        gtag('event', (window.gameConfig && window.gameConfig.gaPrefix ? window.gameConfig.gaPrefix : '') + 'game_lost', {
            livello: livello,
            ripetizioni: conRipetizioni ? 'si' : 'no',
            tempo: secondi
        });
    }

    modaleFineAperta = 'haiperso';
    elem('haiperso').style.display = 'flex';
    if (typeof window.setupAmazonFinishBanner === 'function') {
        window.setupAmazonFinishBanner('haiperso', {
            modalStyle: { overflow: 'visible' },
            targetTop: 430,
            applyModalTop: false,
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

/* === MODALI === */
function chiudiModali() {
    ['modale-inizio', 'haivinto', 'haiperso', 'confermatermina', 'codice-minimal-panel'].forEach(id => {
        const m = elem(id);
        if (m) m.style.display = 'none';
    });
    elem('schermo').style.display = 'none';
    modaleFineAperta = '';
    chiudiHint();
}

/* "Vedi lo schema": toglie di mezzo la modale di fine partita per lasciar
   guardare i tentativi e la matrice, e lascia in basso i due comandi essenziali
   (come il "vedi carte" di Scala 40). Dopo una sconfitta il pannellino si porta
   dietro il codice svelato, che se ne andrebbe insieme alla modale. */
function vediSchema() {
    elem('haivinto').style.display = 'none';
    elem('haiperso').style.display = 'none';
    elem('schermo').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());

    let pannello = elem('codice-minimal-panel');
    if (!pannello) {
        pannello = document.createElement('div');
        pannello.id = 'codice-minimal-panel';
        pannello.innerHTML =
            '<div class="min-codice"><span class="min-etichetta"></span><div class="min-pioli"></div></div>' +
            '<button type="button" class="btn-min-1">' + T.nuovaPartitaBtn + '</button>' +
            '<button type="button" class="btn-min-2">' + T.tornaAlRisultatoBtn + '</button>';
        elem('campogioco').appendChild(pannello);
        pannello.querySelector('.btn-min-1').addEventListener('click', () => { chiudiModali(); nuovaPartita(); });
        pannello.querySelector('.btn-min-2').addEventListener('click', tornaAlRisultato);
    }

    const box = pannello.querySelector('.min-codice');
    if (modaleFineAperta === 'haiperso') {
        box.querySelector('.min-etichetta').textContent = T.ilCodiceEra;
        const pioli = box.querySelector('.min-pioli');
        pioli.innerHTML = '';
        for (let i = 0; i < nPos; i++) pioli.appendChild(creaPiolo(codice[i]));
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
    pannello.style.display = 'flex';
}

function tornaAlRisultato() {
    const pannello = elem('codice-minimal-panel');
    if (pannello) pannello.style.display = 'none';
    if (modaleFineAperta) elem(modaleFineAperta).style.display = 'flex';
}

function apriModaleInizio(mostraRiprendi) {
    fermaTimer();
    chiudiModali();
    elem('btn-riprendi').style.display = mostraRiprendi ? '' : 'none';
    elem('schermo').style.display = 'block';
    elem('modale-inizio').style.display = 'flex';
    selezionaDifficolta(livello);
}

function selezionaDifficolta(liv) {
    livello = liv;
    ['facile', 'classico', 'esperto'].forEach(l => {
        elem('btn-liv-' + l).classList.toggle('attiva', l === liv);
    });
    renderRecordPreview();
}

function renderRecordPreview() {
    // Il record mostrato in cima si riferisce alla configurazione scelta: se
    // cambia nella modale, deve cambiare anche dietro.
    conRipetizioni = elem('chk-ripetizioni').checked;
    renderRecord();
}

function confermaEAvviaPartita() {
    conRipetizioni = elem('chk-ripetizioni').checked;
    try {
        localStorage.setItem('codice-config', JSON.stringify({ livello: livello, ripetizioni: conRipetizioni }));
    } catch (e) {}
    nuovaPartita();
}

function nuovaPartita() {
    const cfg = COD_LIVELLI[livello];
    nPos = cfg.posizioni; nCol = cfg.colori; maxTentativi = cfg.maxTentativi;
    // Senza ripetizioni servono almeno tante tinte quante caselle: con i
    // livelli attuali e' sempre vero, ma la guardia costa nulla.
    if (!conRipetizioni && nCol < nPos) conRipetizioni = true;

    codice = generaCodice();
    tentativi = [];
    bozza = new Array(nPos).fill(-1);
    cursore = 0;
    escluseMano = creaMatriceVuota();
    assegnate = new Array(nPos).fill(-1);
    posizioneSel = 0;
    hintPos = -1; hintFase = 0;
    secondi = 0;
    partitaInCorso = true;

    armaAssegna(false);
    chiudiModali();
    renderRecord();
    aggiornaTutto();
    avviaTimer();
}

function richiediNuovaPartita() {
    if (partitaInCorso && tentativi.length > 0) {
        fermaTimer();
        elem('schermo').style.display = 'block';
        elem('confermatermina').style.display = 'flex';
        // Anche l'abbandono e' una fine partita: il banner ci va come sulla
        // vittoria e sulla sconfitta. targetTop 470 e' il top della modale
        // nel CSS, il banner gli si appoggia sotto.
        if (typeof window.setupAmazonFinishBanner === 'function') {
            window.setupAmazonFinishBanner('confermatermina', {
                modalStyle: { overflow: 'visible' },
                targetTop: 470,
                applyModalTop: false, // posizione gia' definita nel CSS
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    } else {
        apriModaleInizio(false);
    }
}

/* === TASTIERA === */
function gestisciTasto(e) {
    // Alt e' della barra del browser e delle scorciatoie di sistema: quando e'
    // premuto il gioco non tocca nulla. Convenzione comune a tutti i giochi.
    if (e.altKey) return;
    if (!partitaInCorso) {
        if (e.key === 'Enter' && elem('modale-inizio').style.display === 'flex') {
            e.preventDefault();
            confermaEAvviaPartita();
        }
        return;
    }
    // I colori si posano con la loro lettera. Le cifre restano attive come
    // alias: chi aveva imparato "3 = verde" non deve reimparare niente.
    if (e.key.length === 1) {
        const su = e.key.toUpperCase();
        if (su >= 'A' && su <= 'H') {
            const c = su.charCodeAt(0) - 65;
            if (c < nCol) { e.preventDefault(); posaColore(c); return; }
        }
        if (e.key >= '1' && e.key <= '8') {
            const c = parseInt(e.key, 10) - 1;
            if (c < nCol) { e.preventDefault(); posaColore(c); return; }
        }
    }
    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            provaFila();
            break;
        case 'Backspace':
            e.preventDefault();
            if (bozza[cursore] >= 0) bozza[cursore] = -1;
            else { cursore = Math.max(0, cursore - 1); bozza[cursore] = -1; }
            aggiornaTutto();
            break;
        case 'Delete':
            e.preventDefault();
            svuotaBozza();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            cursore = (cursore - 1 + nPos) % nPos;
            disegnaTentativi();
            break;
        case 'ArrowRight':
            e.preventDefault();
            cursore = (cursore + 1) % nPos;
            disegnaTentativi();
            break;
        case 'ArrowUp':
            e.preventDefault();
            posizioneSel = (posizioneSel - 1 + nPos) % nPos;
            disegnaMatrice();
            break;
        case 'ArrowDown':
            e.preventDefault();
            posizioneSel = (posizioneSel + 1) % nPos;
            disegnaMatrice();
            break;
        // La A ora e' un colore: il modo assegna sta sulla S di "segna"
        case 's': case 'S':
            e.preventDefault();
            armaAssegna(!modoAssegna);
            break;
        case 'Escape':
            e.preventDefault();
            if (modoAssegna) armaAssegna(false);
            else chiudiHint();
            break;
    }
}

/* === ETICHETTE (una sola stesura, IT o EN) === */
function scriviEtichette() {
    // Il titolo porta il <br> davanti a "Luciano": va scritto come HTML
    elem('titolo-gioco').innerHTML = T.titolo;
    elem('lbl-tentativi').textContent = T.tentativi;
    elem('lbl-tempo').textContent = T.tempo;
    elem('btn-prova').textContent = T.prova;
    elem('btn-svuota').textContent = T.svuota;
    elem('lbl-record-all').textContent = T.recordAll;
    elem('lbl-record-week').textContent = T.recordWeek;
    elem('lbl-record-day').textContent = T.recordDay;
    elem('lbl-matrice').textContent = T.matriceTitolo;
    elem('lbl-tavolozza').textContent = T.coloriTitolo;
    elem('lbl-pin-esatto').textContent = T.pinEsatto;
    elem('lbl-pin-presente').textContent = T.pinPresente;
    elem('intesta-esito').textContent = T.intestaEsito;
    elem('btn-suggerimento').textContent = T.hintTitolo;
    elem('lbl-modo-escludi').textContent = T.modoEscludi;
    elem('lbl-modo-assegna').textContent = T.modoAssegna;
    elem('lbl-scorc-escludi').textContent = T.scorciatoiaEscludi;
    elem('lbl-scorc-assegna').textContent = T.scorciatoiaAssegna;
    elem('lbl-opt-appunti').textContent = T.optAppunti;
    elem('lbl-opt-restanti').textContent = T.optRestanti;
    elem('lbl-opt-soluzione').textContent = T.optSoluzione;
    elem('hint-titolo').textContent = T.hintTitolo;
    elem('btn-hint-chiudi').textContent = T.hintChiudi;
    elem('titolo-inizio').textContent = T.scegliDifficolta;
    elem('btn-liv-facile').textContent = T.facile;
    elem('btn-liv-classico').textContent = T.classico;
    elem('btn-liv-esperto').textContent = T.esperto;
    elem('desc-facile').textContent = T.descFacile;
    elem('desc-classico').textContent = T.descClassico;
    elem('desc-esperto').textContent = T.descEsperto;
    elem('lbl-ripetizioni').textContent = T.ripetizioni;
    elem('btn-continua').textContent = T.inizia;
    elem('btn-riprendi').textContent = T.riprendi;
    elem('conferma-testo').textContent = T.confermaTermina;
    elem('btn-conferma-si').textContent = T.si;
    elem('btn-conferma-no').textContent = T.no;
    elem('lbl-codice-era').textContent = T.ilCodiceEra;
    elem('btn-vedi-schema').textContent = T.vediSchemaBtn;
    elem('btn-vedi-schema-perso').textContent = T.vediSchemaBtn;
}

/* === AVVIO === */
function initCodice() {
    // L'interstitial copre il campo: partire con lui a schermo vorrebbe dire
    // far correre il cronometro su una partita che nessuno sta guardando.
    const overlay = document.getElementById('interstitial-overlay');
    if (overlay && overlay.style.display !== 'none' && overlay.offsetParent !== null) {
        setTimeout(initCodice, 300);
        return;
    }

    scriviEtichette();

    if (typeof window.initAudioToggle === 'function') window.initAudioToggle('#btn-audio');
    if (typeof window.adjustLayout === 'function') window.adjustLayout();

    const banner = document.getElementById('banner-rotante');
    if (banner && typeof window.setupRotatingAffiliateBanner === 'function') {
        window.setupRotatingAffiliateBanner(banner, { intervalMs: 45000 });
    }

    // Opzioni: si ricordano fra una partita e l'altra, sono preferenze d'uso.
    try {
        const opt = JSON.parse(localStorage.getItem('codice-opzioni')) || {};
        elem('chk-appunti').checked  = opt.appunti  !== undefined ? !!opt.appunti  : true;
        elem('chk-restanti').checked = !!opt.restanti;
        elem('chk-soluzione').checked = !!opt.soluzione;
    } catch (e) { elem('chk-appunti').checked = true; }

    function salvaOpzioni() {
        try {
            localStorage.setItem('codice-opzioni', JSON.stringify({
                appunti: elem('chk-appunti').checked,
                restanti: elem('chk-restanti').checked,
                soluzione: elem('chk-soluzione').checked
            }));
        } catch (e) {}
        aggiornaMessaggio();
    }
    ['chk-appunti', 'chk-restanti', 'chk-soluzione'].forEach(id => {
        elem(id).addEventListener('change', salvaOpzioni);
    });

    // Ultima configurazione usata: la modale si apre gia' su quella.
    try {
        const cfg = JSON.parse(localStorage.getItem('codice-config'));
        if (cfg && COD_LIVELLI[cfg.livello]) {
            livello = cfg.livello;
            conRipetizioni = !!cfg.ripetizioni;
        }
    } catch (e) {}
    elem('chk-ripetizioni').checked = conRipetizioni;

    // Comandi
    elem('btn-prova').addEventListener('click', provaFila);
    elem('btn-svuota').addEventListener('click', svuotaBozza);
    elem('btn-nuova-partita').addEventListener('click', richiediNuovaPartita);
    elem('btn-suggerimento').addEventListener('click', apriHint);
    elem('btn-hint-applica').addEventListener('click', applicaHint);
    elem('btn-hint-chiudi').addEventListener('click', chiudiHint);

    elem('modo-escludi').addEventListener('click', () => armaAssegna(false));
    elem('modo-assegna').addEventListener('click', () => armaAssegna(true));

    elem('btn-liv-facile').addEventListener('click', () => selezionaDifficolta('facile'));
    elem('btn-liv-classico').addEventListener('click', () => selezionaDifficolta('classico'));
    elem('btn-liv-esperto').addEventListener('click', () => selezionaDifficolta('esperto'));
    elem('chk-ripetizioni').addEventListener('change', renderRecordPreview);
    elem('btn-continua').addEventListener('click', confermaEAvviaPartita);
    elem('btn-riprendi').addEventListener('click', () => {
        const s = caricaPartita();
        if (s) riprendiPartita(s); else confermaEAvviaPartita();
    });

    elem('btn-conferma-si').addEventListener('click', () => {
        partitaInCorso = false;
        cancellaSalvataggio();
        apriModaleInizio(false);
    });
    elem('btn-conferma-no').addEventListener('click', () => {
        chiudiModali();
        if (partitaInCorso) avviaTimer();
    });

    elem('btn-rivincita').addEventListener('click', () => { chiudiModali(); nuovaPartita(); });
    elem('btn-rivincita-perso').addEventListener('click', () => { chiudiModali(); nuovaPartita(); });
    elem('btn-vedi-schema').addEventListener('click', vediSchema);
    elem('btn-vedi-schema-perso').addEventListener('click', vediSchema);

    elem('btn-reset-all').addEventListener('click', function () { azzeraRecordSingolo(this, 'all'); });
    elem('btn-reset-week').addEventListener('click', function () { azzeraRecordSingolo(this, 'weekly'); });
    elem('btn-reset-day').addEventListener('click', function () { azzeraRecordSingolo(this, 'daily'); });

    document.addEventListener('keydown', gestisciTasto);

    // Il pallino appeso al puntatore col modo "assegna" armato
    const sprite = elem('sprite-assegna');
    document.addEventListener('mousemove', (e) => {
        if (!modoAssegna) return;
        sprite.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    });

    caricaRecords();

    const salvata = caricaPartita();
    if (salvata) {
        livello = salvata.livello;
        conRipetizioni = !!salvata.ripetizioni;
        elem('chk-ripetizioni').checked = conRipetizioni;
        apriModaleInizio(true);
    } else {
        apriModaleInizio(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.waitForInterstitial === 'function') window.waitForInterstitial(initCodice);
    else initCodice();
});
