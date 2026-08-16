/* ============================================================================
   CAMPO MINATO - Logica di Gioco (JavaScript)
   Tre livelli standard, mine piazzate dopo il primo click, generazione
   opzionale "sempre risolvibile" con risolutore logico, annulla della mossa
   fatale a prezzo di una penalita' sul tempo.
   Stile e struttura coerenti con Sudoku e Calcolo Enigmatico.
   ============================================================================ */

// === TESTI MULTILINGUA ===
const MINATO_LANG = (window.currentLang === 'en') ? {
    partitaInCorso: 'Game in progress — good luck!',
    primoClick: 'Click any square to start: the first one is always safe',
    generazione: 'Building a solvable field...',
    generazioneFallita: 'No fully logical field found: this one may need a guess',
    modoScava: 'Dig mode — click to uncover',
    modoBandiera: 'Flag mode — click to mark a mine',
    vittoria: 'CONGRATULATIONS!<br>Field cleared!',
    sconfitta: 'BOOM!<br>You hit a mine',
    statoVinta: 'Field cleared!',
    statoPersa: 'Mine hit — all the mines are now shown',
    tempo: 'Time',
    mine: 'Mines',
    annullaFatale: 'Undo the fatal move',
    penalitaFatale: function (s) { return 'Penalty: +' + s + ' s on the clock.'; },
    resetChiedi: 'OK?',
    nuovoRecord: ' — NEW ALL-TIME BEST!',
    diffNames: { principiante: 'Beginner', intermedio: 'Intermediate', esperto: 'Expert' },
    riepilogo: function (diff, tempo) {
        return MINATO_LANG.diffNames[diff] + ' — ' + MINATO_LANG.tempo + ': ' + tempo;
    }
} : {
    partitaInCorso: 'Partita in corso — buona fortuna!',
    primoClick: 'Clicca una casella qualsiasi per cominciare: la prima è sempre sicura',
    generazione: 'Generazione di uno schema risolvibile...',
    generazioneFallita: 'Nessuno schema del tutto logico trovato: questo potrebbe richiedere un tentativo',
    modoScava: 'Modo scava — clicca per scoprire',
    modoBandiera: 'Modo bandierina — clicca per segnare una mina',
    vittoria: 'COMPLIMENTI!<br>Campo bonificato!',
    sconfitta: 'BOOM!<br>Hai preso una mina',
    statoVinta: 'Campo bonificato!',
    statoPersa: 'Mina presa — ora le mine sono tutte visibili',
    tempo: 'Tempo',
    mine: 'Mine',
    annullaFatale: 'Annulla la mossa fatale',
    penalitaFatale: function (s) { return 'Penalità: +' + s + ' s sul cronometro.'; },
    resetChiedi: 'OK?',
    nuovoRecord: ' — NUOVO RECORD ASSOLUTO!',
    diffNames: { principiante: 'Principiante', intermedio: 'Intermedio', esperto: 'Esperto' },
    riepilogo: function (diff, tempo) {
        return MINATO_LANG.diffNames[diff] + ' — ' + MINATO_LANG.tempo + ': ' + tempo;
    }
};

// === CONFIGURAZIONE DIFFICOLTA' ===
// Le tre taglie classiche. `cella` e' il lato in px: cala al crescere della
// griglia perche' il campo di gioco e' fisso (1024x750) e l'Esperto e' 30 colonne
// larghe. A 22px l'esperto occupa 660px, dentro i ~640 utili della colonna di
// sinistra piu' il margine, e i numeri restano leggibili.
// Il lato della cella cala al crescere della griglia perche' il campo di gioco
// e' fisso. Lo spazio utile a sinistra del pannello dei comandi e' 660x580
// (da y=108 a y=688, sopra la barra dei link): il vincolo stringente cambia da
// livello a livello. Principiante e Intermedio sono quadrati e li limita
// l'altezza (58 e 34 px il massimo teorico); si tengono un po' sotto, perche'
// una griglia 9x9 alta quanto tutto il tavolo sembrerebbe fuori scala rispetto
// agli altri giochi del sito. L'Esperto, 30 colonne, e' limitato dalla
// larghezza: 21px x 30 = 630px piu' i bordi, ed e' il massimo che ci sta.
const MINATO_LIVELLI = {
    principiante: { righe: 9,  colonne: 9,  mine: 10, cella: 48 },
    intermedio:   { righe: 16, colonne: 16, mine: 40, cella: 33 },
    esperto:      { righe: 16, colonne: 30, mine: 99, cella: 21 }
};

// === PENALITA' SUL TEMPO (secondi aggiunti al cronometro) ===
// Annullare la mossa fatale non e' gratis: senza prezzo il gioco diventa
// "clicca a caso e torna indietro". 60 secondi sono abbastanza da pesare su un
// Principiante da due minuti e da restare accettabili su un Esperto da dieci.
const PENALITA_FATALE = 60;

// Gli annulli non sono limitati di numero, ma il prezzo raddoppia ogni volta:
// 60, 120, 240, 480... Il primo errore si perdona quasi per intero, il quarto
// costa gia' otto minuti. Cosi' non si perde mezz'ora di Esperto per una
// distrazione, e allo stesso tempo tirare a indovinare a ripetizione resta
// disastroso per il tempo finale: il record non ha bisogno di altre difese.
function costoAnnullo() {
    return PENALITA_FATALE * Math.pow(2, annulliUsati);
}

// === STATO GLOBALE ===
let righe = 9, colonne = 9, numMine = 10, latoCella = 34;
let mine = [];             // booleani: true se la cella contiene una mina
let vicine = [];           // numero di mine adiacenti (0-8)
let scoperte = [];         // booleani: true se la cella e' stata scavata
let bandiere = [];         // booleani: true se la cella porta una bandierina
let difficolta = 'principiante';
let minePiazzate = false;  // le mine si piazzano al primo click, non prima
let sempreRisolvibile = true; // opzione scelta nel modale di avvio
let modoBandiera = false;  // modo del click sinistro: false = scava
let secondi = 0;
let timerId = null;
let partitaFinita = false;
let vinta = false;
let cellaFatale = -1;      // indice della mina che ha chiuso la partita, per l'annulla
let annulliUsati = 0;      // quanti annulli in questa partita: decide il costo del prossimo
let records = {};          // { principiante: { daily:{key,sec}, weekly:{key,sec}, all:{sec,date} }, ... }

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log('Blocco riproduzione audio:', e));
}

// === UTILITA' DI GRIGLIA ===
function idx(r, c) { return r * colonne + c; }
function rigaDi(i) { return Math.floor(i / colonne); }
function colonnaDi(i) { return i % colonne; }
function totaleCelle() { return righe * colonne; }

// Indici delle (massimo) 8 celle adiacenti. Il controllo sulle colonne usa
// colonnaDi e non l'aritmetica sull'indice: senza, la cella di bordo destro
// "vedrebbe" quella di bordo sinistro della riga successiva.
function adiacenti(i) {
    const out = [];
    const r = rigaDi(i), c = colonnaDi(i);
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= righe || nc < 0 || nc >= colonne) continue;
            out.push(idx(nr, nc));
        }
    }
    return out;
}

function formattaTempo(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// === PIAZZAMENTO DELLE MINE ===
// Le mine si piazzano al PRIMO click, non alla creazione della partita: cosi'
// la prima mossa non puo' mai essere fatale. Oltre alla cella cliccata restano
// libere anche le sue 8 vicine, quindi il primo click apre sempre un'area
// invece di scoprire un singolo numero: e' lo standard delle versioni moderne
// e senza di esso la partita comincia spesso con un tentativo alla cieca.
function piazzaMine(primo) {
    const vietate = new Set([primo].concat(adiacenti(primo)));
    const tot = totaleCelle();

    // Con pochissimo spazio libero (Esperto su griglie piccole non capita, ma la
    // guardia costa nulla) si rinuncia al bordo di sicurezza e si protegge solo
    // la cella cliccata: meglio un primo click "stretto" che un ciclo infinito.
    if (tot - vietate.size < numMine) {
        vietate.clear();
        vietate.add(primo);
    }

    const candidate = [];
    for (let i = 0; i < tot; i++) if (!vietate.has(i)) candidate.push(i);

    // Fisher-Yates sulle sole celle ammesse
    for (let i = candidate.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = candidate[i]; candidate[i] = candidate[j]; candidate[j] = t;
    }

    mine = new Array(tot).fill(false);
    for (let k = 0; k < numMine; k++) mine[candidate[k]] = true;
    calcolaVicine();
}

function calcolaVicine() {
    const tot = totaleCelle();
    vicine = new Array(tot).fill(0);
    for (let i = 0; i < tot; i++) {
        if (!mine[i]) continue;
        adiacenti(i).forEach(function (a) { vicine[a]++; });
    }
}

// === RISOLUTORE LOGICO ===
// Serve a rispondere a una domanda sola: "partendo dal primo click, questo
// campo si chiude ragionando, o a un certo punto bisogna tirare a indovinare?".
// Simula un giocatore che applica solo le due deduzioni elementari, le stesse
// che userebbe una persona:
//   1. un numero che ha gia' tante bandierine quante ne dice  -> le altre vicine
//      sono sicure e si possono scavare;
//   2. un numero le cui vicine coperte sono esattamente quante gliene mancano
//      -> sono tutte mine e si possono segnare.
// Non implementa le deduzioni "di coppia" (sottoinsiemi 1-2-1 ecc.): un campo
// che le richiede viene scartato. E' una scelta prudente e voluta: il campo
// accettato e' risolvibile CON CERTEZZA da un giocatore normale, mentre uno
// scartato potrebbe essere risolvibile da un esperto. Meglio scartare qualcosa
// di buono che promettere una logica che poi non basta.
function risolvibileSenzaTentativi(primo) {
    const tot = totaleCelle();
    const sc = new Array(tot).fill(false);  // scoperte nella simulazione
    const bd = new Array(tot).fill(false);  // mine dedotte con certezza

    // Il primo click e la sua cascata: identico a quello che fara' il giocatore
    apriCascataSu(primo, sc);

    let progresso = true;
    while (progresso) {
        progresso = false;

        for (let i = 0; i < tot; i++) {
            if (!sc[i] || vicine[i] === 0) continue;

            const coperte = [];
            let segnate = 0;
            adiacenti(i).forEach(function (a) {
                if (bd[a]) segnate++;
                else if (!sc[a]) coperte.push(a);
            });
            if (coperte.length === 0) continue;

            // Regola 1: il numero e' soddisfatto, il resto e' terreno sicuro
            if (segnate === vicine[i]) {
                coperte.forEach(function (a) {
                    if (!sc[a]) { apriCascataSu(a, sc); progresso = true; }
                });
                continue;
            }
            // Regola 2: le coperte sono esattamente le mine mancanti
            if (segnate + coperte.length === vicine[i]) {
                coperte.forEach(function (a) { bd[a] = true; });
                progresso = true;
            }
        }
    }

    // Risolto se ogni cella senza mina e' stata raggiunta dal ragionamento
    for (let i = 0; i < tot; i++) if (!mine[i] && !sc[i]) return false;
    return true;
}

// Apertura a cascata su un array di scoperte dato (usata sia dal gioco vero sia
// dalla simulazione del risolutore). Iterativa e non ricorsiva: sull'Esperto una
// cascata puo' toccare centinaia di celle e la ricorsione rischia lo stack.
function apriCascataSu(start, sc) {
    if (sc[start]) return;
    const pila = [start];
    while (pila.length) {
        const i = pila.pop();
        if (sc[i]) continue;
        sc[i] = true;
        // Solo dallo zero la cascata prosegue: un numero e' un muro, si scopre
        // ma non propaga.
        if (vicine[i] === 0) {
            adiacenti(i).forEach(function (a) {
                if (!sc[a] && !mine[a]) pila.push(a);
            });
        }
    }
}

// Piazza le mine riprovando finche' il campo non e' risolvibile con la sola
// logica. Il tetto sui tentativi evita di bloccare la pagina, e va calibrato
// sul livello perche' la probabilita' che un campo casuale sia interamente
// deducibile crolla al crescere della densita' di mine. Misurato in browser su
// questo risolutore:
//   Principiante  ~66% a tentativo  -> bastano pochissimi tiri
//   Intermedio    ~18% a tentativo  -> qualche decina
//   Esperto      ~0,15% a tentativo -> in media ~670 tiri, con forte varianza
// Da qui i tetti: 5000 tentativi sull'Esperto costano meno di un secondo
// (~0,2 ms l'uno) e portano la riuscita attorno al 99,9%; con i 300 di un
// primo tentativo di taratura il livello Esperto falliva praticamente sempre.
// Se il tetto scade si tiene l'ultimo campo generato e si avvisa il giocatore
// invece di lasciargli credere che sia garantito.
const MAX_TENTATIVI_RISOLVIBILE = {
    principiante: 500,
    intermedio: 2000,
    esperto: 5000
};

function piazzaMineRisolvibili(primo) {
    const MAX_TENTATIVI = MAX_TENTATIVI_RISOLVIBILE[difficolta] || 1000;
    for (let t = 0; t < MAX_TENTATIVI; t++) {
        piazzaMine(primo);
        if (risolvibileSenzaTentativi(primo)) return true;
    }
    return false;
}

// === PARTITA ===
function nuovaPartita(diff, risolvibile) {
    difficolta = diff;
    sempreRisolvibile = !!risolvibile;
    localStorage.setItem('minato-difficolta', diff);
    localStorage.setItem('minato-risolvibile', risolvibile ? '1' : '0');

    const cfg = MINATO_LIVELLI[diff];
    righe = cfg.righe; colonne = cfg.colonne; numMine = cfg.mine; latoCella = cfg.cella;

    const tot = totaleCelle();
    mine = new Array(tot).fill(false);
    vicine = new Array(tot).fill(0);
    scoperte = new Array(tot).fill(false);
    bandiere = new Array(tot).fill(false);

    minePiazzate = false;
    partitaFinita = false;
    vinta = false;
    cellaFatale = -1;
    annulliUsati = 0;
    modoBandiera = false;
    secondi = 0;

    fermaTimer();
    costruisciGriglia();
    renderTutto();
    renderRecord();
    setMessaggio(MINATO_LANG.primoClick);
    salvaPartita();
}

// Il cronometro parte al primo click, non all'apertura del modale: il tempo
// misurato deve essere quello di gioco.
function avviaTimer() {
    if (timerId) return;
    timerId = setInterval(function () {
        secondi++;
        document.getElementById('info-tempo').textContent = formattaTempo(secondi);
        // Salvataggio periodico: se la scheda viene chiusa di colpo non si perde
        // piu' di 15 secondi di partita.
        if (secondi % 15 === 0) salvaPartita();
    }, 1000);
}

function fermaTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
}

// === COSTRUZIONE E RENDER DELLA GRIGLIA ===
function costruisciGriglia() {
    const cont = document.getElementById('griglia-minato');
    cont.innerHTML = '';
    cont.style.gridTemplateColumns = 'repeat(' + colonne + ', ' + latoCella + 'px)';
    cont.style.gridTemplateRows = 'repeat(' + righe + ', ' + latoCella + 'px)';
    // Il font scala con la cella: sull'Esperto una cifra a 18px non ci starebbe.
    cont.style.fontSize = Math.round(latoCella * 0.55) + 'px';

    const tot = totaleCelle();
    for (let i = 0; i < tot; i++) {
        const el = document.createElement('div');
        el.className = 'cella-minato';
        el.id = 'cella-' + i;
        el.addEventListener('click', function (e) { clickCella(i, e); });
        el.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            clickDestro(i);
        });
        cont.appendChild(el);
    }
}

function renderTutto() {
    const tot = totaleCelle();
    for (let i = 0; i < tot; i++) renderCella(i);
    renderInfo();
}

function renderCella(i) {
    const el = document.getElementById('cella-' + i);
    if (!el) return;

    el.className = 'cella-minato';
    el.textContent = '';

    if (scoperte[i]) {
        el.classList.add('scoperta');
        if (mine[i]) {
            el.classList.add('mina');
            el.textContent = '✹';
            if (i === cellaFatale) el.classList.add('mina-fatale');
        } else if (vicine[i] > 0) {
            el.textContent = vicine[i];
            el.classList.add('n' + vicine[i]);
        }
    } else if (bandiere[i]) {
        el.classList.add('bandiera');
        el.textContent = '⚑';
        // A partita persa una bandierina su una casella senza mina era sbagliata:
        // mostrarlo chiude il conto di dov'e' stato l'errore di ragionamento.
        if (partitaFinita && !vinta && !mine[i]) el.classList.add('bandiera-errata');
    }
}

function renderInfo() {
    let poste = 0;
    for (let i = 0; i < bandiere.length; i++) if (bandiere[i]) poste++;
    // Puo' diventare negativo se si mettono piu' bandierine delle mine: e' un
    // dato utile, dice che se ne sono messe troppe.
    document.getElementById('info-mine').textContent = numMine - poste;
    document.getElementById('info-tempo').textContent = formattaTempo(secondi);
    document.getElementById('info-difficolta').textContent = MINATO_LANG.diffNames[difficolta];

    // Mine prese: gli annulli piu' l'eventuale ultima, quella che non e' stata
    // annullata e ha chiuso la partita. Quest'ultima non e' in annulliUsati e non
    // costa penalita' (la partita e' finita li'), ma resta un errore ed e' giusto
    // vederla nel conto. Accanto si mostra quanto e' costato in secondi, cosi' il
    // prezzo degli annulli e' sempre sotto gli occhi e non solo nella modale.
    const el = document.getElementById('info-errori');
    if (el) {
        const totErrori = annulliUsati + ((partitaFinita && !vinta) ? 1 : 0);
        const persi = costoAnnulliPagato();
        el.textContent = totErrori === 0 ? '0'
            : (persi > 0 ? totErrori + ' (+' + formattaTempo(persi) + ')' : String(totErrori));
        el.classList.toggle('errori-presenti', totErrori > 0);
    }
}

// Secondi gia' pagati in penalita': 60+120+240... cioe' 60*(2^n - 1).
function costoAnnulliPagato() {
    return PENALITA_FATALE * (Math.pow(2, annulliUsati) - 1);
}

function setMessaggio(txt) {
    document.getElementById('messaggio-stato').innerHTML = txt;
}

// === INTERAZIONE ===
function clickCella(i, e) {
    if (partitaFinita) return;

    // Il modo bandierina vale per il click sinistro sul mobile; su desktop il
    // tasto destro resta la via rapida e non cambia modo.
    if (modoBandiera) { alternaBandiera(i); return; }

    // Su una cella gia' scoperta con un numero, il click e' un "chording": se le
    // bandierine attorno sono gia' quante il numero dice, apre tutte le altre
    // vicine in un colpo. E' la mossa che rende il gioco veloce; se il conto non
    // torna non fa nulla, cosi' non e' mai una scorciatoia rischiosa involontaria.
    if (scoperte[i]) { chording(i); return; }

    if (bandiere[i]) return;  // protetta apposta: il click non la scavalca

    if (!minePiazzate) {
        primaMossa(i);
        return;
    }

    scava(i);
}

function clickDestro(i) {
    if (partitaFinita || scoperte[i]) return;
    alternaBandiera(i);
}

function alternaBandiera(i) {
    if (scoperte[i]) return;
    bandiere[i] = !bandiere[i];
    riproduciAudio('sounds/scala40/tick.mp3');
    renderCella(i);
    renderInfo();
    salvaPartita();
}

// Primo click: qui nascono le mine. Con l'opzione "sempre risolvibile" la
// generazione puo' richiedere qualche centinaio di tentativi, quindi si passa
// per un setTimeout: senza, il messaggio di attesa non farebbe in tempo a
// comparire e la pagina sembrerebbe bloccata.
function primaMossa(i) {
    if (!sempreRisolvibile) {
        piazzaMine(i);
        minePiazzate = true;
        avviaTimer();
        setMessaggio(MINATO_LANG.partitaInCorso);
        scava(i);
        return;
    }

    setMessaggio(MINATO_LANG.generazione);
    setTimeout(function () {
        const ok = piazzaMineRisolvibili(i);
        minePiazzate = true;
        avviaTimer();
        setMessaggio(ok ? MINATO_LANG.partitaInCorso : MINATO_LANG.generazioneFallita);
        scava(i);
    }, 20);
}

function scava(i) {
    if (scoperte[i] || bandiere[i]) return;

    if (mine[i]) {
        scoperte[i] = true;
        cellaFatale = i;
        finePartita(false);
        return;
    }

    apriCascataSu(i, scoperte);
    riproduciAudio('sounds/scala40/cardplace1.mp3');
    renderTutto();
    controllaVittoria();
    salvaPartita();
}

// Apre in un colpo le vicine coperte di un numero gia' soddisfatto dalle
// bandierine. Se una bandierina era sbagliata la mossa e' fatale: e' il rischio
// che si accetta usandolo, ed e' cosi' nel gioco originale.
function chording(i) {
    if (!scoperte[i] || vicine[i] === 0) return;

    const coperte = [];
    let segnate = 0;
    adiacenti(i).forEach(function (a) {
        if (bandiere[a]) segnate++;
        else if (!scoperte[a]) coperte.push(a);
    });
    if (segnate !== vicine[i] || coperte.length === 0) return;

    // La mina va cercata PRIMA di aprire: aprendo via via, una cascata potrebbe
    // scoprire mezzo campo e poi la partita finirebbe comunque, con uno stato
    // finale confuso su quale mossa l'ha chiusa.
    for (let k = 0; k < coperte.length; k++) {
        if (mine[coperte[k]]) {
            scoperte[coperte[k]] = true;
            cellaFatale = coperte[k];
            finePartita(false);
            return;
        }
    }

    coperte.forEach(function (a) { apriCascataSu(a, scoperte); });
    renderTutto();
    controllaVittoria();
    salvaPartita();
}

// Vinta quando ogni cella senza mina e' scoperta. Le bandierine non contano:
// obbligare a segnarle tutte allungherebbe la partita senza aggiungere gioco.
function controllaVittoria() {
    const tot = totaleCelle();
    for (let i = 0; i < tot; i++) if (!mine[i] && !scoperte[i]) return;
    finePartita(true);
}

function finePartita(haVinto) {
    partitaFinita = true;
    vinta = haVinto;
    fermaTimer();
    localStorage.removeItem('minato-save');

    if (haVinto) {
        // Le mine restanti si segnano da sole: e' il colpo d'occhio del campo
        // bonificato, e non c'e' piu' niente da dedurre.
        for (let i = 0; i < mine.length; i++) if (mine[i]) bandiere[i] = true;
        renderTutto();
        setMessaggio(MINATO_LANG.statoVinta);
        mostraVittoria();
    } else {
        // Si scoprono tutte le mine: e' il momento in cui si capisce dov'era il
        // ragionamento sbagliato.
        for (let i = 0; i < mine.length; i++) if (mine[i]) scoperte[i] = true;
        renderTutto();
        setMessaggio(MINATO_LANG.statoPersa);
        riproduciAudio('sounds/scala40/knock.mp3');
        mostraSconfitta();
    }
}

// === ANNULLA DELLA MOSSA FATALE ===
// Non e' un undo generico: l'unica mossa che vale la pena annullare in un campo
// minato e' quella che ha chiuso la partita. Si puo' usare quante volte si
// vuole, ma il prezzo raddoppia a ogni uso (vedi costoAnnullo): a frenare non e'
// un tetto, e' il cronometro.
function annullaMossaFatale() {
    if (!partitaFinita || vinta || cellaFatale < 0) return;

    secondi += costoAnnullo();
    annulliUsati++;

    // Si ricopre tutto quello che la sconfitta aveva rivelato: le mine tornano
    // nascoste e la fatale torna coperta, con la sua bandierina di cortesia
    // (quella casella e' una mina certa, ormai lo si e' pagato caro).
    for (let i = 0; i < mine.length; i++) if (mine[i]) scoperte[i] = false;
    bandiere[cellaFatale] = true;
    cellaFatale = -1;

    partitaFinita = false;
    vinta = false;
    chiudiModali();
    avviaTimer();
    renderTutto();
    setMessaggio(MINATO_LANG.partitaInCorso);
    salvaPartita();
}

// === MODO SCAVA / BANDIERINA ===
function impostaModo(bandiera) {
    modoBandiera = !!bandiera;
    document.getElementById('modo-scava').classList.toggle('attivo', !modoBandiera);
    document.getElementById('modo-bandiera').classList.toggle('attivo', modoBandiera);
    document.getElementById('griglia-minato').classList.toggle('modo-bandiera', modoBandiera);
    setMessaggio(modoBandiera ? MINATO_LANG.modoBandiera : MINATO_LANG.modoScava);
}

// === SALVATAGGIO ===
// Gli array di booleani si salvano come stringhe di 0/1: su un Esperto sono
// 480 celle per quattro array, e in JSON come array di booleani sarebbero
// decine di kB per una partita sola.
function bitsToStr(arr) { return arr.map(function (b) { return b ? '1' : '0'; }).join(''); }
function strToBits(s) { return s.split('').map(function (ch) { return ch === '1'; }); }

function salvaPartita() {
    if (partitaFinita) {
        localStorage.removeItem('minato-save');
        return;
    }
    try {
        localStorage.setItem('minato-save', JSON.stringify({
            diff: difficolta,
            mine: bitsToStr(mine),
            sco: bitsToStr(scoperte),
            ban: bitsToStr(bandiere),
            sec: secondi,
            piaz: minePiazzate,
            ris: sempreRisolvibile,
            ann: annulliUsati
        }));
    } catch (e) { /* storage pieno o disabilitato: si continua senza salvataggio */ }
}

function caricaPartita() {
    try {
        const raw = localStorage.getItem('minato-save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        const cfg = MINATO_LIVELLI[s.diff];
        if (!cfg) return false;

        const tot = cfg.righe * cfg.colonne;
        if (!s.mine || s.mine.length !== tot || !s.sco || s.sco.length !== tot) return false;

        difficolta = s.diff;
        righe = cfg.righe; colonne = cfg.colonne; numMine = cfg.mine; latoCella = cfg.cella;
        mine = strToBits(s.mine);
        scoperte = strToBits(s.sco);
        bandiere = strToBits(s.ban);
        secondi = s.sec || 0;
        minePiazzate = !!s.piaz;
        sempreRisolvibile = !!s.ris;
        // "ann" era un booleano finche' l'annulla si poteva usare una volta sola:
        // in una partita salvata da quella versione true vale "un annullo gia'
        // fatto", cosi' il prossimo costa 120 e non 60. Number() da solo non
        // basterebbe: darebbe NaN su valori inattesi e da li' il costo esploderebbe.
        annulliUsati = (typeof s.ann === 'number' && isFinite(s.ann) && s.ann > 0)
            ? Math.floor(s.ann) : (s.ann ? 1 : 0);
        partitaFinita = false;
        vinta = false;
        cellaFatale = -1;
        modoBandiera = false;
        calcolaVicine();
        return true;
    } catch (e) {
        return false;
    }
}

// === RECORD (giornaliero / settimanale / assoluto, per difficolta') ===
// Stesse chiavi e stessa meccanica del Sudoku: chi gioca a entrambi trova la
// stessa cosa nello stesso posto.
function chiaveGiorno(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function chiaveOggi() { return chiaveGiorno(new Date()); }

// Lunedi' della settimana corrente, come chiave della settimana
function chiaveSettimana() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return chiaveGiorno(d);
}

function caricaRecords() {
    try {
        records = JSON.parse(localStorage.getItem('minato-records') || '{}') || {};
    } catch (e) {
        records = {};
    }
}

function salvaRecords() {
    try {
        localStorage.setItem('minato-records', JSON.stringify(records));
    } catch (e) { /* storage non disponibile */ }
}

function aggiornaRecords(sec) {
    const r = records[difficolta] || (records[difficolta] = {});
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();
    let nuovoAssoluto = false;

    if (!r.daily || r.daily.key !== oggi || sec < r.daily.sec) r.daily = { key: oggi, sec: sec };
    if (!r.weekly || r.weekly.key !== settimana || sec < r.weekly.sec) r.weekly = { key: settimana, sec: sec };
    if (!r.all || sec < r.all.sec) { r.all = { sec: sec, date: oggi }; nuovoAssoluto = true; }

    salvaRecords();
    renderRecord();
    return nuovoAssoluto;
}

function renderRecord() {
    const r = records[difficolta] || {};
    const oggi = chiaveOggi();
    const settimana = chiaveSettimana();
    document.getElementById('record-diff').textContent = MINATO_LANG.diffNames[difficolta];
    document.getElementById('record-oggi').textContent =
        (r.daily && r.daily.key === oggi) ? formattaTempo(r.daily.sec) : '--:--';
    document.getElementById('record-settimana').textContent =
        (r.weekly && r.weekly.key === settimana) ? formattaTempo(r.weekly.sec) : '--:--';
    document.getElementById('record-assoluto').textContent =
        r.all ? formattaTempo(r.all.sec) : '--:--';
}

// Azzeramento a due passi del singolo record: il primo click chiede conferma
// per 3 secondi, il secondo azzera. Un solo click per sbaglio non cancella
// niente di irrecuperabile.
let confermaReset = null;
function azzeraRecordSingolo(e) {
    const btn = e.currentTarget;
    const tipo = btn.dataset.tipo;

    if (confermaReset !== tipo) {
        if (confermaReset) ripristinaBottoniReset();
        confermaReset = tipo;
        btn.textContent = MINATO_LANG.resetChiedi;
        btn.classList.add('conferma');
        setTimeout(function () {
            if (confermaReset === tipo) ripristinaBottoniReset();
        }, 3000);
        return;
    }

    const r = records[difficolta];
    if (r) { delete r[tipo]; salvaRecords(); }
    ripristinaBottoniReset();
    renderRecord();
}

function ripristinaBottoniReset() {
    confermaReset = null;
    document.querySelectorAll('.btn-reset-record').forEach(function (b) {
        b.innerHTML = '&#10226;';
        b.classList.remove('conferma');
    });
}

// === MODALI ===
function chiudiModali() {
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('confermatermina').style.display = 'none';
    document.getElementById('haivinto').style.display = 'none';
    document.getElementById('haiperso').style.display = 'none';
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio(mostraRiprendi) {
    document.getElementById('btn-riprendi').style.display = mostraRiprendi ? 'block' : 'none';
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('modale-inizio').style.display = 'flex';
    selezionaDifficolta(localStorage.getItem('minato-difficolta') || 'principiante');
    document.getElementById('chk-risolvibile').checked =
        localStorage.getItem('minato-risolvibile') !== '0';
}

function mostraVittoria() {
    const nuovo = aggiornaRecords(secondi);
    document.getElementById('vittoria-messaggio').innerHTML = MINATO_LANG.vittoria;
    document.getElementById('vittoria-dettagli').textContent =
        MINATO_LANG.riepilogo(difficolta, formattaTempo(secondi)) +
        (nuovo ? MINATO_LANG.nuovoRecord : '');
    document.getElementById('schermo').style.display = 'block';
    document.getElementById('haivinto').style.display = 'flex';
    riproduciAudio('sounds/scala40/tada.mp3');
}

function mostraSconfitta() {
    document.getElementById('sconfitta-messaggio').innerHTML = MINATO_LANG.sconfitta;
    // L'annulla si offre sempre, ma il prezzo e' scritto ogni volta: e' quello a
    // dover far pensare, non un pulsante che sparisce.
    const btn = document.getElementById('btn-annulla-fatale');
    btn.style.display = 'block';
    btn.textContent = MINATO_LANG.annullaFatale;
    document.getElementById('sconfitta-penalita').textContent =
        MINATO_LANG.penalitaFatale(costoAnnullo());
    // Nessun velo scuro, al contrario delle altre modali: la sconfitta si legge
    // nella colonna di destra e il campo rivelato resta in chiaro, che e' proprio
    // quello che si vuole guardare dopo aver perso. I click sulla griglia sono
    // gia' inerti a partitaFinita, quindi l'overlay non serviva a bloccarli.
    document.getElementById('haiperso').style.display = 'flex';
}

function riprendiPartita() {
    chiudiModali();
    costruisciGriglia();
    renderTutto();
    renderRecord();
    // Il cronometro riparte solo se la partita era gia' cominciata: se era stata
    // salvata prima del primo click, si aspetta ancora il primo click.
    if (minePiazzate) {
        avviaTimer();
        setMessaggio(MINATO_LANG.partitaInCorso);
    } else {
        setMessaggio(MINATO_LANG.primoClick);
    }
}

let tempDifficolta = 'principiante';
function selezionaDifficolta(diff) {
    tempDifficolta = diff;
    ['principiante', 'intermedio', 'esperto'].forEach(function (d) {
        document.getElementById('btn-diff-' + d).classList.toggle('attiva', d === diff);
    });
}

function confermaEAvviaPartita() {
    chiudiModali();
    nuovaPartita(tempDifficolta, document.getElementById('chk-risolvibile').checked);
}

// === AVVIO ===
function init() {
    caricaRecords();

    document.getElementById('modo-scava').addEventListener('click', function () { impostaModo(false); });
    document.getElementById('modo-bandiera').addEventListener('click', function () { impostaModo(true); });
    document.getElementById('btn-annulla-fatale').addEventListener('click', annullaMossaFatale);
    document.getElementById('btn-riprendi').addEventListener('click', riprendiPartita);

    document.querySelectorAll('.btn-reset-record').forEach(function (b) {
        b.addEventListener('click', azzeraRecordSingolo);
    });

    // NUOVA PARTITA a partita in corso chiede conferma: un click per sbaglio
    // butterebbe via anche dieci minuti di Esperto.
    document.getElementById('btn-nuova-partita').addEventListener('click', function () {
        if (partitaFinita || !minePiazzate) {
            apriModaleInizio(false);
            return;
        }
        document.getElementById('schermo').style.display = 'block';
        document.getElementById('confermatermina').style.display = 'flex';
    });
    document.getElementById('btn-no-continua').addEventListener('click', chiudiModali);
    document.getElementById('btn-si-termina').addEventListener('click', function () {
        chiudiModali();
        localStorage.removeItem('minato-save');
        apriModaleInizio(false);
    });

    // "Come si Gioca" non ha piu' un listener: e' un normale link a
    // guida-minato.html, che apre la pagina delle regole in una scheda nuova.

    // Barra spaziatrice: cambia modo senza staccare la mano dal mouse. Utile
    // soprattutto su portatile, dove il tasto destro del trackpad e' scomodo.
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key === ' ') {
            e.preventDefault();
            impostaModo(!modoBandiera);
        }
    });

    const ripresa = caricaPartita();
    if (ripresa) {
        costruisciGriglia();
        renderTutto();
    }
    renderRecord();
    apriModaleInizio(ripresa);

    // Riquadro affiliati sotto NUOVA PARTITA. Parte da init() e non dal load
    // perche' init() gira dopo la chiusura dell'interstitial: ruotare mentre
    // l'overlay copre la pagina conterebbe impression mai viste.
    // Non e' AdSense, quindi la rotazione automatica e' legittima.
    if (typeof setupRotatingAffiliateBanner === 'function') {
        const boxAff = document.getElementById('banner-rotante');
        if (boxAff) setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
    }
}

// waitForInterstitial e' fornito da game-layout.js: se e' dovuto un interstitial
// lo mostra e poi chiama init(), altrimenti chiama init() subito.
window.addEventListener('load', function () {
    if (typeof window.waitForInterstitial === 'function') window.waitForInterstitial(init);
    else init();
});
