/* ============================================================================
   TRESSETTE & CIAPANÒ - Motore di Gioco (JavaScript)
   Regole ufficiali italiane per Tressette (2v2 a coppie e 1v1) e
   Ciapanò / Traversone / Chi perde vince (tutti contro tutti a 4 e 1v1).
   Gerarchia di presa: 3 > 2 > Asso > Re > Cavallo > Fante > 7 > 6 > 5 > 4
   Rigido obbligo di risposta a seme (bussare/rispondere).
   AI avanzata a 3 livelli per entrambe le modalità.
   Supporto mazzi: Napoletane, Bresciane, Francesi.
   ============================================================================ */

window.scriptVersion = '1.16';

// === TESTI MULTILINGUA ===
const TRESSETTE_LANG = (window.currentLang === 'en') ? {
    titoloTressette: 'Luciano\'s Tressette',
    titoloCiapano: 'Luciano\'s Ciapanò (Traversone)',
    tuoTurno: 'Your turn — play a card',
    deveRispondere: function (seme) { return 'You must follow suit (' + seme + ')'; },
    inizioTu: 'You lead the first trick',
    inizioAltro: function (nome) { return nome + ' leads the trick'; },
    presaDi: function (nome, pt) { return nome + ' takes the trick' + (pt > 0 ? ' (' + pt + ' pt)' : ''); },
    presaTua: function (pt) { return 'You take the trick' + (pt > 0 ? ' (' + pt + ' pt)' : ''); },
    vittoria: 'YOU WIN!<br>Congratulations!',
    vittoriaCoppia: 'YOUR TEAM WINS!<br>Congratulations!',
    sconfitta: 'YOU LOSE!<br>Better luck next time',
    sconfittaCoppia: 'YOUR TEAM LOSES!<br>Better luck next time',
    cappottoTu: 'SLAM!<br>You took all points (0 penalty)!',
    cappottoAltro: function (nome) { return 'SLAM BY ' + nome + '!<br>All other players receive max penalty!'; },
    patta: 'DRAW!',
    riepilogoTressette: function (mie, sue, target) {
        return (window._modalita4 ? 'Us' : 'You') + ': ' + mie + ' — ' + (window._modalita4 ? 'Them' : 'PC') + ': ' + sue + ' (Target: ' + target + ')';
    },
    riepilogoCiapano: function (nomeVincitore, minPt) {
        return 'Winner: ' + nomeVincitore + ' with only ' + minPt + ' penalty points!';
    },
    resetChiedi: 'Reset statistics?',
    tu: 'You', pc: 'PC', noi: 'Us', loro: 'Them',
    diffNames: { facile: 'Beginner', medio: 'Medium', difficile: 'Expert' },
    mossaAnnullata: 'Move undone — your turn again',
    mazzo: { francesi: 'Deck: French', napoletane: 'Deck: Neapolitan', bresciane: 'Deck: Brescian' },
    semi: { F: 'Spades', Q: 'Diamonds', C: 'Hearts/Cups', P: 'Clubs' },
    semiItaliani: { F: 'Spade', Q: 'Denari', C: 'Coppe', P: 'Bastoni' },
    cliccaPerContinuare: 'Click to continue',
    mazziere: 'Dealer',
    dettaglioPunti: 'POINTS BREAKDOWN',
    dettaglioPenalita: 'PENALTY BREAKDOWN',
    smazzata: 'Hand',
    partita: 'Match',
    smazzataInCorso: 'Current Hand',
    carte: 'Cards',
    accuse: 'Melds',
    assi: 'Aces (1 pt)',
    pezze: 'Pieces (⅓ pt)',
    parziale: 'Subtotal',
    speciali: 'Specials',
    totale: 'Total',
    traguardo: 'Target',
    limite: 'Limit',
    penalita: 'Penalties',
    punti: 'Points'
} : {
    titoloTressette: 'Tressette Luciano',
    titoloCiapano: 'Ciapanò Luciano (Traversone)',
    tuoTurno: 'Tocca a te — gioca una carta',
    deveRispondere: function (seme) { return 'Devi rispondere a ' + seme; },
    inizioTu: 'Apri tu la mano',
    inizioAltro: function (nome) { return 'Apre ' + nome + ' la mano'; },
    presaDi: function (nome, pt) { return 'Presa di ' + nome + (pt > 0 ? ' (' + pt + ' pt)' : ''); },
    presaTua: function (pt) { return 'Presa tua' + (pt > 0 ? ' (' + pt + ' pt)' : ''); },
    vittoria: 'HAI VINTO!<br>Complimenti!',
    vittoriaCoppia: 'LA TUA COPPIA VINCE!<br>Complimenti!',
    sconfitta: 'HAI PERSO!<br>Andrà meglio la prossima volta',
    sconfittaCoppia: 'LA TUA COPPIA PERDE!<br>Andrà meglio la prossima volta',
    cappottoTu: 'CAPPOTTO!<br>Hai preso tutti i punti (0 penalità)!',
    cappottoAltro: function (nome) { return 'CAPPOTTO DI ' + nome + '!<br>Tutti gli altri prendono penalità massima!'; },
    patta: 'PATTA!',
    riepilogoTressette: function (mie, sue, target) {
        return (window._modalita4 ? 'Noi' : 'Tu') + ': ' + mie + ' — ' + (window._modalita4 ? 'Loro' : 'PC') + ': ' + sue + ' (Traguardo: ' + target + ')';
    },
    riepilogoCiapano: function (nomeVincitore, minPt) {
        return 'Vince ' + nomeVincitore + ' con sole ' + minPt + ' penalità!';
    },
    resetChiedi: 'Azzera statistiche?',
    tu: 'Tu', pc: 'PC', noi: 'Noi', loro: 'Loro',
    diffNames: { facile: 'Principiante', medio: 'Medio', difficile: 'Esperto' },
    mossaAnnullata: 'Mossa annullata — di nuovo il tuo turno',
    mazzo: { francesi: 'Mazzo: Francesi', napoletane: 'Mazzo: Napoletane', bresciane: 'Mazzo: Bresciane' },
    semi: { F: 'Spade/Fiori', Q: 'Denari/Quadri', C: 'Coppe/Cuori', P: 'Bastoni/Picche' },
    semiItaliani: { F: 'Spade', Q: 'Denari', C: 'Coppe', P: 'Bastoni' },
    cliccaPerContinuare: 'Clicca per continuare',
    mazziere: 'Mazziere',
    dettaglioPunti: 'DETTAGLIO PUNTI',
    dettaglioPenalita: 'DETTAGLIO PENALITÀ',
    smazzata: 'Smazzata',
    partita: 'Partita',
    smazzataInCorso: 'Smazzata',
    carte: 'Carte',
    accuse: 'Accuse',
    assi: 'Assi (1 pt)',
    pezze: 'Pezze (⅓ pt)',
    parziale: 'Parziale',
    speciali: 'Speciali',
    totale: 'Totale',
    traguardo: 'Traguardo',
    limite: 'Limite',
    penalita: 'Penalità',
    punti: 'Punti'
};

// === COSTANTI DI GIOCO ===
// Gerarchia di presa del Tressette: 3 > 2 > 1 > 10 > 9 > 8 > 7 > 6 > 5 > 4
const FORZA_TRESSETTE = { 3: 10, 2: 9, 1: 8, 10: 7, 9: 6, 8: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
// Punti netti in terzi: Asso = 3 terzi (1 pt intero), 3/2/10/9/8 = 1 terzo ciascuno
const TERZI_CARTA = { 1: 3, 3: 1, 2: 1, 10: 1, 9: 1, 8: 1 };

const SEMI = ['F', 'Q', 'C', 'P'];
const VALORI_SEMI = { F: 0, Q: 1, C: 2, P: 3 };

function terziDi(c) {
    if (!c) return 0;
    return TERZI_CARTA[c.number] || 0;
}

// === CLASSE CARTA (sprite condivisi) ===
class Carta {
    constructor(suit, number) {
        this.suit = suit;     // 'F', 'Q', 'C', 'P'
        this.number = number; // 1-7, 8=Fante, 9=Cavallo, 10=Re
        this.id = number + '_' + suit;
    }

    getSpritePosition() {
        const tema = localStorage.getItem('tressette-deck-theme') || 'napoletane';
        const scala = (tema === 'bresciane') ? 1.2 : 1;
        const stepX = -88.75 * scala;
        const stepY = -120 * scala;

        let col = 0;
        if (this.number <= 7) {
            col = this.number - 1;
        } else {
            col = this.number + 2; // 8=Fante col 10, 9=Cavallo col 11, 10=Re col 12
        }

        const row = VALORI_SEMI[this.suit];
        let posX = stepX * col;
        let posY = stepY * row;
        if (tema === 'bresciane') posX -= 14.375 * scala;
        return { x: posX, y: posY };
    }
}

// === STATO GLOBALE ===
let varianteGioco = 'tressette'; // 'tressette' oppure 'ciapano'
let modalitaGiocatori = 4;       // sempre 4 giocatori (2v2 o tutti contro tutti)
let difficolta = 'difficile';    // default Esperto
let targetPunti = 21;            // 21, 31, o 11 (smazzata secca)
let assoBastoniSpeciale = false;  // nel Ciapanò: Asso di Bastoni vale 11 pt extra
let accuseAttive = false;        // nel Tressette: Bongioco e Napoli attivi

let mazzo = [];
let mani = [[], [], [], []];
let cartePrese = [[], [], [], []];
let puntiTorneo = [0, 0, 0, 0];    // in 4p Tressette: [noi, loro]; in Ciapanò: per ogni giocatore [0, 1, 2, 3]
let totaleCarteTorneo = [0, 0];     // Punti totali da carte nelle smazzate concluse [noi, loro]
let totaleAccuseTorneo = [0, 0];    // Punti totali da accuse/combinazioni [noi, loro]
let accuseSmazzata = [[], []];      // Accuse dichiarate nella smazzata corrente [{ g, nome, punti }]
let penalitaCarteTorneo = [0, 0, 0, 0];    // Ciapanò: penalità accumulate da carte
let penalitaSpecialiTorneo = [0, 0, 0, 0]; // Ciapanò: penalità speciali (Asso di Bastoni o Cappotto)
let puntiSmazzata = [0, 0, 0, 0];
let pezzeSmazzata = [0, 0, 0, 0];  // terzi accumulati nella smazzata
let tavolo = [];                   // presa corrente: [{ g, carta }]
let turno = 0;
let primoDiMano = 0;
let carteGiocateIds = {};
let smazzataNumero = 1;
let partitaFinita = false;
let animando = false;
let nomiGiocatori = [];
let undoStack = [];
let maniScoperte = false;
let inAttesaClickFinePresa = false;
let callbackIncassaPresa = null;

window._modalita4 = true;

// === AVATAR DEI GIOCATORI ===
const AVATAR_POOL = [
    { nome: 'Marco', avatar: 'images/avatar/Marco.jpg' },
    { nome: 'Anna', avatar: 'images/avatar/Anna.jpg' },
    { nome: 'Sergio', avatar: 'images/avatar/Sergio.jpg' },
    { nome: 'Lucia', avatar: 'images/avatar/Lucia.jpg' },
    { nome: 'Antonio', avatar: 'images/avatar/Antonio.jpg' },
    { nome: 'Carla', avatar: 'images/avatar/Carla.jpg' },
    { nome: 'Giuseppe', avatar: 'images/avatar/Giuseppe.jpg' },
    { nome: 'Francesca', avatar: 'images/avatar/Francesca.jpg' }
];

function scegliNomi() {
    const pool = AVATAR_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const tu = { nome: TRESSETTE_LANG.tu, avatar: 'favicon/apple-touch-icon.png' };
    if (modalitaGiocatori === 2) {
        nomiGiocatori = [tu, pool[0]];
    } else {
        // In 4 giocatori: 0 = Tu, 1 = Destra, 2 = Alto (Compagno in 2v2), 3 = Sinistra
        nomiGiocatori = [tu, pool[0], pool[1], pool[2]];
    }
}

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    try {
        const audio = new Audio(src);
        audio.play().catch(e => console.log('Blocco audio:', e));
    } catch (e) {}
}

// Creazione e mescolamento del mazzo di 40 carte
function creaMazzo() {
    const m = [];
    for (const s of SEMI) {
        for (let n = 1; n <= 10; n++) {
            m.push(new Carta(s, n));
        }
    }
    for (let i = m.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
}

// Squadra del giocatore (per Tressette a 4: 0 e 2 = Noi/Tu, 1 e 3 = Loro)
function squadraDi(g) {
    if (varianteGioco === 'ciapano') return g; // nel Ciapanò ognuno per sé!
    return g % 2;
}

// Ordina le carte in mano per seme e forza per una visione ottimale
function ordinaMano(mano) {
    const ordineSemi = { F: 0, Q: 1, C: 2, P: 3 };
    mano.sort((a, b) => {
        if (ordineSemi[a.suit] !== ordineSemi[b.suit]) {
            return ordineSemi[a.suit] - ordineSemi[b.suit];
        }
        return FORZA_TRESSETTE[b.number] - FORZA_TRESSETTE[a.number];
    });
}

// Carte legalmente giocabili dal giocatore (rispetto rigido dell'obbligo di seme)
function carteGiocabili(g) {
    const mano = mani[g] || [];
    if (mano.length === 0) return [];
    if (tavolo.length === 0) return mano.slice();

    const leadSuit = tavolo[0].carta.suit;
    const delSeme = mano.filter(c => c.suit === leadSuit);
    if (delSeme.length > 0) {
        return delSeme;
    }
    // Sprovvisto del seme: piomba, può giocare qualsiasi carta
    return mano.slice();
}

// Indice della carta vincente nella presa corrente sul tavolo
function idxVincente() {
    if (tavolo.length === 0) return 0;
    let best = 0;
    const leadSuit = tavolo[0].carta.suit;
    for (let k = 1; k < tavolo.length; k++) {
        const c = tavolo[k].carta;
        if (c.suit === leadSuit) {
            if (FORZA_TRESSETTE[c.number] > FORZA_TRESSETTE[tavolo[best].carta.number]) {
                best = k;
            }
        }
    }
    return best;
}

// Calcola punti (in terzi) della presa corrente
function terziTavolo() {
    let t = 0;
    for (const item of tavolo) {
        t += terziDi(item.carta);
    }
    return t;
}

// === ACCUSE (BONGIOCO E NAPOLI) ===
function rilevaAccuse(g) {
    if (!accuseAttive || varianteGioco === 'ciapano') return [];
    const mano = mani[g] || [];
    const accuse = [];

    // Conteggio carte per numero (per Bongioco: 3 o 4 Assi, Due, Tre)
    const perNum = {};
    const perSeme = { F: [], Q: [], C: [], P: [] };
    mano.forEach(c => {
        perNum[c.number] = (perNum[c.number] || 0) + 1;
        perSeme[c.suit].push(c.number);
    });

    [1, 2, 3].forEach(n => {
        const cnt = perNum[n] || 0;
        const nomeCarta = (n === 1 ? (window.currentLang === 'en' ? 'Aces' : 'Assi') : (n === 2 ? (window.currentLang === 'en' ? 'Twos' : 'Due') : (window.currentLang === 'en' ? 'Threes' : 'Tre')));
        if (cnt === 3) {
            accuse.push({ tipo: 'bongioco', dettaglio: nomeCarta, nome: 'Bongioco (' + nomeCarta + ')', punti: 3 });
        } else if (cnt === 4) {
            accuse.push({ tipo: 'bongioco', dettaglio: 'Super ' + nomeCarta, nome: 'Super Bongioco (' + nomeCarta + ')', punti: 4 });
        }
    });

    // Napoli: Asso, Due e Tre dello stesso seme (+1 per ogni carta consecutiva, es. 4)
    for (const s of SEMI) {
        const carte = perSeme[s];
        if (carte.includes(1) && carte.includes(2) && carte.includes(3)) {
            let pt = 3;
            let nSeq = 4;
            while (carte.includes(nSeq)) { pt++; nSeq++; }
            const nomeSeme = (TRESSETTE_LANG.semiItaliani[s] || s);
            accuse.push({ tipo: 'napoli', dettaglio: nomeSeme, nome: 'Napoli ' + nomeSeme + (pt > 3 ? ' (' + pt + ')' : ''), punti: pt });
        }
    }
    return accuse;
}

function mostraBannerAccusa(testo) {
    const banner = document.getElementById('banner-accusa');
    if (!banner) return;
    banner.textContent = testo;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 2800);
}

// === INTELLIGENZA ARTIFICIALE ===
function scegliCartaAI(g) {
    const legali = carteGiocabili(g);
    if (legali.length === 1) return legali[0];

    if (varianteGioco === 'ciapano') {
        return scegliCartaCiapano(g, legali);
    } else {
        return scegliCartaTressette(g, legali);
    }
}

// Logica AI per Tressette Classico
function scegliCartaTressette(g, legali) {
    if (difficolta === 'facile') {
        return legali[Math.floor(Math.random() * legali.length)];
    }

    const leadSuit = tavolo.length > 0 ? tavolo[0].carta.suit : null;
    const sq = squadraDi(g);

    // 1. Se è il primo a giocare la presa
    if (!leadSuit) {
        // Se esperto e ha 3 o 2 sicuro, o gioca cartina per esplorare
        const tre = legali.filter(c => c.number === 3);
        if (tre.length > 0 && Math.random() > 0.4) return tre[0];
        const due = legali.filter(c => c.number === 2);
        if (due.length > 0 && Math.random() > 0.5) return due[0];
        // Altrimenti esce con una cartina bassa (4, 5, 6, 7)
        const cartine = legali.filter(c => c.number >= 4 && c.number <= 7);
        if (cartine.length > 0) return cartine[0];
        return legali[0];
    }

    const iv = idxVincente();
    const vincitoreAttuale = tavolo[iv].g;
    const compagnoStaVincendo = (modalitaGiocatori === 4 && squadraDi(vincitoreAttuale) === sq);

    // 2. Se risponde a seme
    const haSeme = (legali[0].suit === leadSuit);
    if (haSeme) {
        const miglioriDelVincente = legali.filter(c => FORZA_TRESSETTE[c.number] > FORZA_TRESSETTE[tavolo[iv].carta.number]);

        if (compagnoStaVincendo) {
            // Compagno sta vincendo: se siamo gli ultimi a giocare o la carta del compagno è un 3 insormontabile
            if (tavolo[iv].carta.number === 3 || tavolo.length === modalitaGiocatori - 1) {
                // Carichiamo punti! Asso o pezza
                const assi = legali.filter(c => c.number === 1);
                if (assi.length > 0) return assi[0];
                const carichi = legali.filter(c => [2, 10, 9, 8].includes(c.number));
                if (carichi.length > 0) return carichi[0];
            }
            // Altrimenti lisciamo basso per non sprecare
            return legali[legali.length - 1];
        }

        // Avversario sta vincendo:
        if (miglioriDelVincente.length > 0) {
            // Se la presa vale punti o siamo all'ultima carta della presa:
            const ptInGioco = terziTavolo();
            if (ptInGioco >= 2 || tavolo.length === modalitaGiocatori - 1) {
                // Supera con la minima vincente per prendere i punti!
                miglioriDelVincente.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
                return miglioriDelVincente[0];
            }
        }
        // Se non conviene superare o non possiamo superare, lisciamo con la minima possibile
        legali.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
        return legali[0];
    }

    // 3. Sprovvisto (Piomba): non può vincere la presa
    if (compagnoStaVincendo && tavolo.length === modalitaGiocatori - 1) {
        // Regala un Asso o un Re al compagno!
        const assi = legali.filter(c => c.number === 1);
        if (assi.length > 0) return assi[0];
        const carichi = legali.filter(c => [10, 9, 8].includes(c.number));
        if (carichi.length > 0) return carichi[0];
    }

    // Altrimenti scarta una cartina insignificante
    const scartine = legali.filter(c => c.number >= 4 && c.number <= 7);
    if (scartine.length > 0) return scartine[0];
    // Se deve scartare una figura/pezza, scarta quella meno forte
    legali.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
    return legali[0];
}

// Logica AI per Ciapanò (Traversone / Rovescino): OBIETTIVO = NON FARE PUNTI!
function scegliCartaCiapano(g, legali) {
    if (difficolta === 'facile') {
        return legali[Math.floor(Math.random() * legali.length)];
    }

    const leadSuit = tavolo.length > 0 ? tavolo[0].carta.suit : null;

    // 1. Apertura della presa (primo di mano)
    if (!leadSuit) {
        // Esce con una cartina bassa (4, 5, 6, 7) per costringere gli altri a giocare carte più alte!
        const scartine = legali.filter(c => c.number >= 4 && c.number <= 7);
        if (scartine.length > 0) {
            scartine.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
            return scartine[0]; // la più bassa in assoluto (es. 4 o 5)
        }
        // Se non ha cartine, gioca la figura più bassa possibile
        legali.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
        return legali[0];
    }

    const iv = idxVincente();
    const leadCard = tavolo[iv].carta;
    const haSeme = (legali[0].suit === leadSuit);

    // 2. Risposta a seme
    if (haSeme) {
        // Cerca carte che STANNO SOTTO a quella attualmente vincente per non prendere!
        const sotto = legali.filter(c => FORZA_TRESSETTE[c.number] < FORZA_TRESSETTE[leadCard.number]);
        if (sotto.length > 0) {
            // Tra le carte che non prendono, se c'è un Asso o figura alta, giocala per liberartene!
            sotto.sort((a, b) => FORZA_TRESSETTE[b.number] - FORZA_TRESSETTE[a.number]);
            return sotto[0];
        }
        // Se è costretto a superare (tutte le sue carte prendono):
        legali.sort((a, b) => FORZA_TRESSETTE[a.number] - FORZA_TRESSETTE[b.number]);
        return legali[0];
    }

    // 3. Sprovvisto (Piomba in Ciapanò): MOMENTO D'ORO!
    if (assoBastoniSpeciale) {
        const assoBastoni = legali.find(c => c.suit === 'P' && c.number === 1);
        if (assoBastoni) return assoBastoni; // Scarica la bomba da 11 punti!
    }
    const assi = legali.filter(c => c.number === 1);
    if (assi.length > 0) return assi[0]; // Scarica un Asso (1 punto intero di penalità)

    const tre = legali.filter(c => c.number === 3);
    if (tre.length > 0) return tre[0]; // Scarica il 3 pericoloso

    const due = legali.filter(c => c.number === 2);
    if (due.length > 0) return due[0];

    const figure = legali.filter(c => [10, 9, 8].includes(c.number));
    if (figure.length > 0) return figure[0];

    // Altrimenti scarta una carta qualsiasi
    return legali[0];
}

// === GESTIONE PARTITA E DISTRIBUZIONE ===
function avviaNuovaPartita() {
    partitaFinita = false;
    animando = false;
    undoStack = [];
    smazzataNumero = 1;

    if (varianteGioco === 'ciapano') {
        puntiTorneo = [0, 0, 0, 0];
    } else {
        puntiTorneo = [0, 0]; // [Noi, Loro]
    }

    totaleCarteTorneo = [0, 0];
    totaleAccuseTorneo = [0, 0];
    accuseSmazzata = [[], []];
    penalitaCarteTorneo = [0, 0, 0, 0];
    penalitaSpecialiTorneo = [0, 0, 0, 0];

    window._modalita4 = (modalitaGiocatori === 4);
    scegliNomi();
    aggiornaTitoloGioco();
    iniziaNuovaSmazzata();
}

function aggiornaTitoloGioco() {
    const el = document.getElementById('titolo-gioco');
    if (!el) return;
    if (varianteGioco === 'ciapano') {
        el.textContent = TRESSETTE_LANG.titoloCiapano;
    } else {
        el.textContent = TRESSETTE_LANG.titoloTressette;
    }
}

function iniziaNuovaSmazzata() {
    inAttesaClickFinePresa = false;
    callbackIncassaPresa = null;
    document.getElementById('campogioco')?.classList.remove('in-attesa-fine-presa');
    mazzo = creaMazzo();
    mani = [[], [], [], []];
    cartePrese = [[], [], [], []];
    puntiSmazzata = [0, 0, 0, 0];
    pezzeSmazzata = [0, 0, 0, 0];
    accuseSmazzata = [[], []];
    tavolo = [];
    carteGiocateIds = {};

    if (modalitaGiocatori === 4) {
        // 10 carte a ciascuno dei 4 giocatori (tutte le 40 carte)
        for (let g = 0; g < 4; g++) {
            mani[g] = mazzo.splice(0, 10);
            ordinaMano(mani[g]);
        }
    } else {
        // 2 giocatori: 10 carte a testa, 20 carte nel mazzo tallone
        mani[0] = mazzo.splice(0, 10);
        mani[1] = mazzo.splice(0, 10);
        ordinaMano(mani[0]);
        ordinaMano(mani[1]);
    }

    // Chi apre la prima presa della smazzata
    turno = (smazzataNumero - 1) % modalitaGiocatori;
    primoDiMano = turno;

    impostaMessaggioStato(turno === 0 ? TRESSETTE_LANG.inizioTu : TRESSETTE_LANG.inizioAltro(nomiGiocatori[turno].nome));

    // Rileva e dichiara eventuali accuse all'inizio della smazzata
    if (accuseAttive && varianteGioco === 'tressette') {
        for (let g = 0; g < modalitaGiocatori; g++) {
            const acc = rilevaAccuse(g);
            if (acc.length > 0) {
                acc.forEach(a => {
                    const sq = squadraDi(g);
                    puntiTorneo[sq] += a.punti;
                    totaleAccuseTorneo[sq] += a.punti;
                    accuseSmazzata[sq].push({ g: g, tipo: a.tipo, dettaglio: a.dettaglio, nome: a.nome, punti: a.punti });
                    const nomeG = (g === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[g].nome);
                    mostraBannerAccusa(nomeG + ': ' + a.nome + ' (+' + a.punti + ' pt)');
                });
            }
        }
    }

    renderTutto();
    prossimaMossa();
}

function impostaMessaggioStato(msg) {
    const el = document.getElementById('messaggio-stato');
    if (el) el.innerHTML = msg;
}

// Ciclo di gioco: controlla di chi è il turno
function prossimaMossa() {
    if (partitaFinita) return;

    // Se la presa corrente sul tavolo è completa (4 o 2 carte):
    if (tavolo.length === modalitaGiocatori) {
        animando = true;
        aggiornaEvidenzaTurno();
        risolviPresa();
        return;
    }

    if (turno === 0) {
        animando = false;
        impostaMessaggioStato(TRESSETTE_LANG.tuoTurno);
        aggiornaEvidenzaTurno();
        aggiornaStatoUndoUI();
        renderTutto();
        return;
    }

    // Turno di un bot AI
    animando = true;
    aggiornaEvidenzaTurno();
    aggiornaStatoUndoUI();
    const tempoAttesa = 600 + Math.random() * 400;
    setTimeout(() => {
        if (partitaFinita) return;
        const carta = scegliCartaAI(turno);
        giocaCarta(turno, carta);
    }, tempoAttesa);
}

function giocaCarta(g, carta) {
    const idx = mani[g].indexOf(carta);
    if (idx === -1) return;

    if (g === 0) creaUndoSnapshot();

    mani[g].splice(idx, 1);
    tavolo.push({ g: g, carta: carta });
    carteGiocateIds[carta.id] = true;

    riproduciAudio('sounds/scala40/cardplace1.mp3');

    // Se la presa non è completa, passa il turno al giocatore successivo
    if (tavolo.length < modalitaGiocatori) {
        turno = (turno + 1) % modalitaGiocatori;
    }

    renderTutto();
    prossimaMossa();
}

function clickCartaGiocatore(carta) {
    if (partitaFinita || animando || turno !== 0 || inAttesaClickFinePresa || tavolo.length >= modalitaGiocatori) return;

    const legali = carteGiocabili(0);
    if (!legali.includes(carta)) {
        // Feedback visivo obbligo di seme
        const leadSuit = tavolo[0].carta.suit;
        const nomeSeme = (TRESSETTE_LANG.semiItaliani[leadSuit] || leadSuit);
        impostaMessaggioStato(TRESSETTE_LANG.deveRispondere(nomeSeme));
        riproduciAudio('sounds/teck.wav');
        return;
    }
    giocaCarta(0, carta);
}

// Risoluzione della presa a tavolo completo
function risolviPresa() {
    const iv = idxVincente();
    const vincitore = tavolo[iv].g;
    const nomeVincitore = (vincitore === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[vincitore].nome);

    // Calcolo terzi della presa
    let terzi = terziTavolo();

    // Se Asso di Bastoni nel Ciapanò:
    if (varianteGioco === 'ciapano' && assoBastoniSpeciale) {
        const haBastoni = tavolo.some(t => t.carta.suit === 'P' && t.carta.number === 1);
        if (haBastoni) {
            puntiTorneo[vincitore] += 11;
            penalitaSpecialiTorneo[vincitore] += 11;
            mostraBannerAccusa('Asso di Bastoni a ' + nomeVincitore + '! (+11 penalità)');
        }
    }

    tavolo.forEach(t => cartePrese[vincitore].push(t.carta));

    // Determina mazzetto di destinazione per animazione
    const destId = (modalitaGiocatori === 4 && squadraDi(vincitore) === 0) || vincitore === 0 ? 'mazzetto-tu' : 'mazzetto-loro';

    // Evidenzia carta vincente
    const slotDi = modalitaGiocatori === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
    const vincenteSlot = document.getElementById(slotDi[vincitore]);
    if (vincenteSlot && vincenteSlot.querySelector('.carta')) {
        vincenteSlot.querySelector('.carta').classList.add('cartavincente');
    }

    const msgBase = vincitore === 0 ? TRESSETTE_LANG.presaTua(Math.floor(terzi / 3)) : TRESSETTE_LANG.presaDi(nomeVincitore, Math.floor(terzi / 3));
    impostaMessaggioStato(msgBase + ' — ' + TRESSETTE_LANG.cliccaPerContinuare);

    // Attesa del click del giocatore prima di depositare le carte nei mazzetti
    inAttesaClickFinePresa = true;
    const campogiocoEl = document.getElementById('campogioco');
    if (campogiocoEl) campogiocoEl.classList.add('in-attesa-fine-presa');

    callbackIncassaPresa = () => {
        inAttesaClickFinePresa = false;
        callbackIncassaPresa = null;
        if (campogiocoEl) campogiocoEl.classList.remove('in-attesa-fine-presa');

        animaPresaVerso(destId, () => {
            tavolo = [];

            // In 2 giocatori: pesca dal mazzo tallone se presente
            if (modalitaGiocatori === 2 && mazzo.length > 0) {
                mani[vincitore].push(mazzo.shift());
                const perdente = 1 - vincitore;
                mani[perdente].push(mazzo.shift());
                ordinaMano(mani[0]);
                ordinaMano(mani[1]);
            }

            primoDiMano = vincitore;
            turno = vincitore;
            renderTutto();

            // Verifica fine della smazzata (tutte le carte in mano esaurite)
            if (mani.every(m => m.length === 0)) {
                fineSmazzata(vincitore); // vincitore dell'ultima presa riceve il punto di ultima
                return;
            }
            animando = false;
            prossimaMossa();
        });
    };
}

// Fine della smazzata: conteggio dei punti/penalità
function fineSmazzata(ultimoVincitore) {
    animando = true;

    // 1. Calcola i punti presi da ciascun giocatore o coppia
    // Punti = Assi (1 pt ciascuno) + Terzi / 3 (scartando le frazioni) + Ultima presa (1 pt)
    if (varianteGioco === 'tressette') {
        const ptCoppia = [0, 0];
        for (let sq = 0; sq < 2; sq++) {
            let assi = 0;
            let pezze = 0;
            const giocatori = (modalitaGiocatori === 4) ? [sq, sq + 2] : [sq];
            giocatori.forEach(g => {
                cartePrese[g].forEach(c => {
                    if (c.number === 1) assi++;
                    else if ([3, 2, 10, 9, 8].includes(c.number)) pezze++;
                });
            });
            ptCoppia[sq] = assi + Math.floor(pezze / 3);
            if (squadraDi(ultimoVincitore) === sq) ptCoppia[sq] += 1; // Punto d'ultima!
            totaleCarteTorneo[sq] += ptCoppia[sq];
            puntiTorneo[sq] += ptCoppia[sq];
        }

        renderTutto();

        // Controllo vittoria Tressette
        const target = targetPunti;
        const noiRaggiunto = puntiTorneo[0] >= target;
        const loroRaggiunto = puntiTorneo[1] >= target;

        if (noiRaggiunto || loroRaggiunto || target === 11) {
            concludiPartitaTressette();
            return;
        }
    } else {
        // CIAPANÒ: calcolo penalità per ciascuno dei giocatori
        const ptG = [0, 0, 0, 0];
        let chiPrendeTutto = -1;

        for (let g = 0; g < modalitaGiocatori; g++) {
            let assi = 0;
            let pezze = 0;
            cartePrese[g].forEach(c => {
                if (c.number === 1) assi++;
                else if ([3, 2, 10, 9, 8].includes(c.number)) pezze++;
            });
            ptG[g] = assi + Math.floor(pezze / 3);
            if (ultimoVincitore === g) ptG[g] += 1; // Ultima presa è 1 punto di penalità!

            // Controllo CAPPOTTO: chi totalizza tutti gli 11 punti della smazzata o tutte le 40 carte!
            if (ptG[g] === 11 || (modalitaGiocatori === 4 && cartePrese[g].length === 40)) chiPrendeTutto = g;
        }

        if (chiPrendeTutto !== -1) {
            // Regola del CAPPOTTO in Ciapanò:
            // Chi fa cappotto prende 0 penalità, tutti gli altri prendono 11 penalità!
            const nomeCap = (chiPrendeTutto === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[chiPrendeTutto].nome);
            mostraBannerAccusa(TRESSETTE_LANG.cappottoAltro(nomeCap));
            riproduciAudio('sounds/scala40/tada.mp3');
            for (let g = 0; g < modalitaGiocatori; g++) {
                if (g !== chiPrendeTutto) {
                    puntiTorneo[g] += 11;
                    penalitaSpecialiTorneo[g] += 11;
                }
            }
        } else {
            for (let g = 0; g < modalitaGiocatori; g++) {
                puntiTorneo[g] += ptG[g];
                penalitaCarteTorneo[g] += ptG[g];
            }
        }

        renderTutto();

        // Controllo fine partita Ciapanò: qualcuno supera la soglia di penalità (21 o 31)
        const qualcunoFuori = puntiTorneo.some(p => p >= targetPunti);
        if (qualcunoFuori || targetPunti === 11) {
            concludiPartitaCiapano();
            return;
        }
    }

    // Altrimenti nuova smazzata del torneo
    smazzataNumero++;
    setTimeout(() => {
        impostaMessaggioStato('Nuova smazzata #' + smazzataNumero);
        setTimeout(iniziaNuovaSmazzata, 1200);
    }, 1500);
}

// Conclusione partita Tressette
function concludiPartitaTressette() {
    partitaFinita = true;
    const vinte = puntiTorneo[0] > puntiTorneo[1];
    const patta = puntiTorneo[0] === puntiTorneo[1];

    aggiornaStatistiche(vinte ? 'vinta' : (patta ? 'patta' : 'persa'));

    const msgFine = document.getElementById('fine-messaggio');
    const dettFine = document.getElementById('fine-dettagli');

    if (vinte) {
        msgFine.innerHTML = (modalitaGiocatori === 4 ? TRESSETTE_LANG.vittoriaCoppia : TRESSETTE_LANG.vittoria);
        riproduciAudio('sounds/scala40/tada.mp3');
    } else if (patta) {
        msgFine.innerHTML = TRESSETTE_LANG.patta;
        riproduciAudio('sounds/scala40/dindon.mp3');
    } else {
        msgFine.innerHTML = (modalitaGiocatori === 4 ? TRESSETTE_LANG.sconfittaCoppia : TRESSETTE_LANG.sconfitta);
        riproduciAudio('sounds/scala40/haiperso.mp3');
    }

    dettFine.innerHTML = TRESSETTE_LANG.riepilogoTressette(puntiTorneo[0], puntiTorneo[1], targetPunti) +
        '<br><span style="font-size: 12px; color: #aed6ae;">Smazzate giocate: ' + smazzataNumero + '</span>';

    setTimeout(function () {
        const sch = document.getElementById('schermo');
        if (sch) sch.style.display = 'block';
        const fine = document.getElementById('finepartita');
        if (fine) fine.style.display = 'flex';
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('finepartita', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 1400);
}

// Conclusione partita Ciapanò
function concludiPartitaCiapano() {
    partitaFinita = true;
    // Vince chi ha il punteggio MINIMO di penalità!
    let minPenalita = Infinity;
    let vincitore = 0;
    for (let g = 0; g < modalitaGiocatori; g++) {
        if (puntiTorneo[g] < minPenalita) {
            minPenalita = puntiTorneo[g];
            vincitore = g;
        }
    }

    const vinte = (vincitore === 0);
    aggiornaStatistiche(vinte ? 'vinta' : 'persa');

    const msgFine = document.getElementById('fine-messaggio');
    const dettFine = document.getElementById('fine-dettagli');

    const nomeVincitore = (vincitore === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[vincitore].nome);

    if (vinte) {
        msgFine.innerHTML = TRESSETTE_LANG.vittoria;
        riproduciAudio('sounds/scala40/tada.mp3');
    } else {
        msgFine.innerHTML = TRESSETTE_LANG.sconfitta;
        riproduciAudio('sounds/scala40/haiperso.mp3');
    }

    let riassunto = '<div style="margin-bottom: 8px;">' + TRESSETTE_LANG.riepilogoCiapano(nomeVincitore, minPenalita) + '</div>';
    riassunto += '<div style="font-size: 12px; display: flex; flex-direction: column; gap: 3px;">';
    for (let g = 0; g < modalitaGiocatori; g++) {
        const nome = (g === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[g].nome);
        const col = (g === vincitore ? '#7fff7f' : '#ff8f8f');
        riassunto += '<div><span style="color: ' + col + '; font-weight: bold;">' + nome + '</span>: ' + puntiTorneo[g] + ' penalità</div>';
    }
    riassunto += '</div>';
    dettFine.innerHTML = riassunto;

    setTimeout(function () {
        const sch = document.getElementById('schermo');
        if (sch) sch.style.display = 'block';
        const fine = document.getElementById('finepartita');
        if (fine) fine.style.display = 'flex';
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('finepartita', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 1400);
}

// Animazione fluida delle carte che scivolano verso il mazzetto
function animaPresaVerso(idMazzetto, callback) {
    const campo = document.getElementById('campogioco');
    const dest = document.getElementById(idMazzetto);
    if (!campo || !dest) { callback(); return; }

    const scale = window.gameScale || 1;
    const campoRect = campo.getBoundingClientRect();
    const destRect = dest.getBoundingClientRect();
    const destX = (destRect.left - campoRect.left) / scale;
    const destY = (destRect.top - campoRect.top) / scale;

    const slotDi = modalitaGiocatori === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
    const cloni = [];

    tavolo.forEach(t => {
        const slot = document.getElementById(slotDi[t.g]);
        const cartaEl = slot && slot.querySelector('.carta');
        if (!cartaEl) return;
        const r = cartaEl.getBoundingClientRect();
        const startX = (r.left - campoRect.left) / scale;
        const startY = (r.top - campoRect.top) / scale;
        const clone = cartaEl.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = startX + 'px';
        clone.style.top = startY + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = 200;
        clone.style.transition = 'left 0.45s ease-in, top 0.45s ease-in, opacity 0.45s ease-in 0.1s';
        campo.appendChild(clone);
        cartaEl.style.visibility = 'hidden';
        cloni.push({ clone: clone, destX: destX, destY: destY });
    });

    riproduciAudio('sounds/scala40/cardslide1.mp3');

    if (cloni.length === 0) { callback(); return; }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cloni.forEach(c => {
                c.clone.style.left = c.destX + 'px';
                c.clone.style.top = c.destY + 'px';
                c.clone.style.opacity = '0';
            });
        });
    });

    setTimeout(() => {
        cloni.forEach(c => c.clone.remove());
        callback();
    }, 500);
}

// === RENDERING GRAFICO ===
function elementoCarta(carta, coperta, vert) {
    const el = document.createElement('div');
    el.className = 'carta';
    if (vert) el.classList.add('orizzontale');
    if (coperta || !carta) {
        el.classList.add('coperta');
        return el;
    }
    const pos = carta.getSpritePosition();
    el.style.backgroundPosition = pos.x + 'px ' + pos.y + 'px';
    return el;
}

function renderTutto() {
    // 1. Mano del giocatore in basso
    const manoTu = document.getElementById('mano-basso');
    if (manoTu) {
        manoTu.innerHTML = '';
        const isMioTurno = (turno === 0 && !animando && !partitaFinita && !inAttesaClickFinePresa && tavolo.length < modalitaGiocatori);
        const legali = isMioTurno ? carteGiocabili(0) : [];
        mani[0].forEach((c, idx) => {
            const el = elementoCarta(c, false, false);
            el.style.zIndex = idx + 1;
            if (isMioTurno) {
                if (legali.includes(c)) {
                    el.classList.add('giocabile');
                } else {
                    el.classList.add('non-giocabile');
                }
            }
            el.addEventListener('click', () => clickCartaGiocatore(c));
            manoTu.appendChild(el);
        });
    }

    // 2. Mani degli altri giocatori
    const posti = modalitaGiocatori === 2 ? { 1: 'mano-alto' } : { 1: 'mano-destra', 2: 'mano-alto', 3: 'mano-sinistra' };
    ['mano-alto', 'mano-sinistra', 'mano-destra'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    for (const g in posti) {
        const cont = document.getElementById(posti[g]);
        if (!cont) continue;
        const vert = (posti[g] !== 'mano-alto');
        mani[g] && mani[g].forEach(c => {
            cont.appendChild(elementoCarta(maniScoperte ? c : null, !maniScoperte, vert));
        });
    }

    // 3. Carte sul tavolo
    const slotDi = modalitaGiocatori === 2
        ? { 0: 'slot-basso', 1: 'slot-alto' }
        : { 0: 'slot-basso', 1: 'slot-destra', 2: 'slot-alto', 3: 'slot-sinistra' };
    ['slot-basso', 'slot-alto', 'slot-sinistra', 'slot-destra'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    tavolo.forEach((t, k) => {
        const el = elementoCarta(t.carta, false, false);
        if (k === 0) el.classList.add('carta-apertura');
        const slot = document.getElementById(slotDi[t.g]);
        if (slot) slot.appendChild(el);
    });

    // 4. Mazzo e mazzetti
    const mazzoBlocco = document.getElementById('mazzo-blocco');
    if (mazzoBlocco) {
        if (modalitaGiocatori === 2 && mazzo.length > 0) {
            mazzoBlocco.style.display = 'block';
            mazzoBlocco.innerHTML = '';
            const dorso = elementoCarta(null, true, false);
            mazzoBlocco.appendChild(dorso);
            const cnt = document.createElement('div');
            cnt.className = 'mazzo-count';
            cnt.textContent = mazzo.length;
            mazzoBlocco.appendChild(cnt);
        } else {
            mazzoBlocco.style.display = 'none';
        }
    }

    // Mazzetti prese
    renderMazzetto('mazzetto-tu', (modalitaGiocatori === 4 ? cartePrese[0].length + cartePrese[2].length : cartePrese[0].length));
    renderMazzetto('mazzetto-loro', (modalitaGiocatori === 4 ? cartePrese[1].length + cartePrese[3].length : cartePrese[1].length));

    // 5. Tabellone punti
    renderPannelloPunti();
    renderAvatar();
    aggiornaEvidenzaTurno();
}

function renderMazzetto(id, n) {
    const cont = document.getElementById(id);
    if (!cont) return;
    let dorso = cont.querySelector('.carta');
    let count = cont.querySelector('.mazzetto-count');
    if (n > 0) {
        if (!dorso) {
            dorso = elementoCarta(null, true, false);
            cont.insertBefore(dorso, cont.firstChild);
        }
        if (!count) {
            count = document.createElement('div');
            count.className = 'mazzetto-count';
            cont.appendChild(count);
        }
        count.textContent = n;
    } else {
        if (dorso) dorso.remove();
        if (count) count.remove();
    }
}

function renderPannelloPunti() {
    const pnl = document.getElementById('pannello-punti');
    if (!pnl) return;

    if (varianteGioco === 'tressette') {
        const noiPt = puntiTorneo[0];
        const loroPt = puntiTorneo[1];
        const labelNoi = modalitaGiocatori === 4 ? TRESSETTE_LANG.noi : TRESSETTE_LANG.tu;
        const labelLoro = modalitaGiocatori === 4 ? TRESSETTE_LANG.loro : TRESSETTE_LANG.pc;

        // Calcolo carte prese nella smazzata in corso
        const assi = [0, 0];
        const pezze = [0, 0];
        for (let sq = 0; sq < 2; sq++) {
            const giocatori = (modalitaGiocatori === 4) ? [sq, sq + 2] : [sq];
            giocatori.forEach(g => {
                (cartePrese[g] || []).forEach(c => {
                    if (c.number === 1) assi[sq]++;
                    else if ([3, 2, 10, 9, 8].includes(c.number)) pezze[sq]++;
                });
            });
        }

        function formatVal(interi, resto) {
            const fraz = (resto === 1) ? '⅓' : (resto === 2 ? '⅔' : '');
            return (interi + fraz) + ' pt';
        }

        const carteIntNoi = assi[0] + Math.floor(pezze[0] / 3);
        const carteRestNoi = pezze[0] % 3;
        const carteStrNoi = formatVal(carteIntNoi, carteRestNoi);

        const carteIntLoro = assi[1] + Math.floor(pezze[1] / 3);
        const carteRestLoro = pezze[1] % 3;
        const carteStrLoro = formatVal(carteIntLoro, carteRestLoro);

        // Accuse nella smazzata corrente
        const accSmazz = [
            accuseSmazzata[0].reduce((s, a) => s + a.punti, 0),
            accuseSmazzata[1].reduce((s, a) => s + a.punti, 0)
        ];
        const haAccuse = (accSmazz[0] > 0 || accSmazz[1] > 0);

        // Righe per ogni accusa dettagliata
        let righeAccuse = '';
        if (haAccuse) {
            const tutteAccuse = [];
            accuseSmazzata[0].forEach(a => tutteAccuse.push({ sq: 0, ...a }));
            accuseSmazzata[1].forEach(a => tutteAccuse.push({ sq: 1, ...a }));

            tutteAccuse.forEach(a => {
                const desc = a.tipo === 'napoli'
                    ? ('Napoli ' + a.dettaglio)
                    : (a.dettaglio.startsWith('Super') ? a.dettaglio : 'Bongioco ' + a.dettaglio);
                const valNoi = a.sq === 0 ? ('+' + a.punti + ' pt') : '—';
                const valLoro = a.sq === 1 ? ('+' + a.punti + ' pt') : '—';
                righeAccuse += `
                    <div class="row-label-punti" title="${desc}">${desc}</div>
                    <div class="val-punti ${a.sq === 0 ? 'accusa-val' : ''}">${valNoi}</div>
                    <div class="val-punti ${a.sq === 1 ? 'accusa-val' : ''}">${valLoro}</div>
                `;
            });
        }

        // Totale smazzata (Carte + Accuse)
        let rigaTotaleSmazzata = '';
        if (haAccuse) {
            const totIntNoi = carteIntNoi + accSmazz[0];
            const totStrNoi = formatVal(totIntNoi, carteRestNoi);
            const totIntLoro = carteIntLoro + accSmazz[1];
            const totStrLoro = formatVal(totIntLoro, carteRestLoro);
            rigaTotaleSmazzata = `
                <div class="row-label-punti totale-label">${TRESSETTE_LANG.totale}</div>
                <div class="val-punti totale-val">${totStrNoi}</div>
                <div class="val-punti totale-val">${totStrLoro}</div>
            `;
        }

        pnl.innerHTML = `
            <div class="punti-main-header">
                <span>TRESSETTE</span>
                <span class="badge-smazzata">${TRESSETTE_LANG.smazzata} #${smazzataNumero}</span>
            </div>

            <!-- SEZIONE SMAZZATA -->
            <div class="sezione-titolo-bar">
                <span>${TRESSETTE_LANG.smazzata}</span>
            </div>
            <div class="griglia-punti-smazzata">
                <div class="col-head-punti"></div>
                <div class="col-head-punti noi">${labelNoi}</div>
                <div class="col-head-punti loro">${labelLoro}</div>

                <div class="row-label-punti">${TRESSETTE_LANG.carte}</div>
                <div class="val-punti noi-col">${carteStrNoi}</div>
                <div class="val-punti loro-col">${carteStrLoro}</div>

                ${righeAccuse}
                ${rigaTotaleSmazzata}
            </div>

            <!-- SEZIONE PARTITA -->
            <div class="sezione-titolo-bar partita-bar">
                <span>${TRESSETTE_LANG.partita}</span>
                <span class="target-tag">${TRESSETTE_LANG.traguardo}: ${targetPunti} pt</span>
            </div>
            <div class="partita-totali-row">
                <div class="partita-squadra-blocco">
                    <span class="partita-sq-nome ${noiPt > loroPt ? 'in-testa' : ''}">${labelNoi}</span>
                    <span class="partita-sq-val ${noiPt > loroPt ? 'in-testa' : ''}">${noiPt} pt</span>
                </div>
                <div class="partita-separatore">-</div>
                <div class="partita-squadra-blocco">
                    <span class="partita-sq-nome ${loroPt > noiPt ? 'in-testa' : ''}">${labelLoro}</span>
                    <span class="partita-sq-val ${loroPt > noiPt ? 'in-testa' : ''}">${loroPt} pt</span>
                </div>
            </div>
        `;
    } else {
        // CIAPANÒ
        let rowsSmazzata = '';
        let rowsPartita = '';

        // Trova minimo punteggio partita per evidenziare chi vince (ha meno penalità)
        let minPtTorneo = Infinity;
        for (let g = 0; g < modalitaGiocatori; g++) {
            if (puntiTorneo[g] < minPtTorneo) minPtTorneo = puntiTorneo[g];
        }

        for (let g = 0; g < modalitaGiocatori; g++) {
            const nome = (g === 0 ? TRESSETTE_LANG.tu : (nomiGiocatori[g] ? nomiGiocatori[g].nome : 'P' + g));
            const totTorneo = puntiTorneo[g];
            const inTesta = (totTorneo === minPtTorneo);

            rowsPartita += `
                <div class="ciapano-punti-row ${g === 0 ? 'tu' : ''} ${inTesta ? 'in-testa' : ''}">
                    <span>${nome}</span>
                    <span class="${inTesta ? 'ciapano-val-minimo' : 'ciapano-val-penalita'}">${totTorneo} pt</span>
                </div>
            `;

            let nA = 0;
            let nP = 0;
            (cartePrese[g] || []).forEach(c => {
                if (c.number === 1) nA++;
                else if ([3, 2, 10, 9, 8].includes(c.number)) nP++;
            });
            const interi = nA + Math.floor(nP / 3);
            const resto = nP % 3;
            const parzStr = interi + (resto === 1 ? '⅓' : (resto === 2 ? '⅔' : '')) + ' pt';
            const haBastoniSmazz = (assoBastoniSpeciale && (cartePrese[g] || []).some(c => c.suit === 'P' && c.number === 1));

            rowsSmazzata += `
                <div class="ciapano-punti-row ${g === 0 ? 'tu' : ''}">
                    <span>${nome}</span>
                    <span>
                        <b class="ciapano-val-penalita">${parzStr}</b>
                        ${haBastoniSmazz ? '<span class="ciapano-bastoni-note">(+11 Bastoni)</span>' : ''}
                    </span>
                </div>
            `;
        }

        pnl.innerHTML = `
            <div class="punti-main-header">
                <span>CIAPANÒ</span>
                <span class="badge-smazzata">${TRESSETTE_LANG.smazzata} #${smazzataNumero}</span>
            </div>

            <!-- SEZIONE SMAZZATA -->
            <div class="sezione-titolo-bar">
                <span>${TRESSETTE_LANG.smazzata}</span>
            </div>
            <div class="ciapano-punti-list">
                ${rowsSmazzata}
            </div>

            <!-- SEZIONE PARTITA -->
            <div class="sezione-titolo-bar partita-bar">
                <span>${TRESSETTE_LANG.partita}</span>
                <span class="target-tag">${TRESSETTE_LANG.limite}: ${targetPunti} pt</span>
            </div>
            <div class="ciapano-punti-list">
                ${rowsPartita}
            </div>
        `;
    }
}

function renderAvatar() {
    const mapPosti = modalitaGiocatori === 2
        ? { 0: 'avatar-basso', 1: 'avatar-alto' }
        : { 0: 'avatar-basso', 1: 'avatar-destra', 2: 'avatar-alto', 3: 'avatar-sinistra' };

    ['avatar-basso', 'avatar-alto', 'avatar-sinistra', 'avatar-destra'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Calcolo mazziere: precede chi apre la prima mano della smazzata in senso orario
    const mazziereG = (primoDiMano - 1 + modalitaGiocatori) % modalitaGiocatori;

    for (const g in mapPosti) {
        const id = mapPosti[g];
        const el = document.getElementById(id);
        if (!el || !nomiGiocatori[g]) continue;
        el.style.display = 'flex';
        const img = el.querySelector('img');
        const span = el.querySelector('.nome-avatar');
        const badge = el.querySelector('.dealer-badge');

        if (img) img.src = nomiGiocatori[g].avatar;
        if (span) {
            let label = nomiGiocatori[g].nome;
            if (modalitaGiocatori === 4) {
                if (id === 'avatar-sinistra') {
                    label += ' (sx)';
                } else if (id === 'avatar-destra') {
                    label += ' (dx)';
                }
            }
            span.innerHTML = label;
        }

        if (badge) {
            badge.textContent = TRESSETTE_LANG.mazziere || 'Mazziere';
            badge.style.display = (parseInt(g, 10) === mazziereG) ? 'block' : 'none';
        }
    }

    posizionaAvatarDinamici();
}

// Posizionamento dinamico degli avatar rispetto ai contenitori delle carte
function posizionaAvatarDinamici() {
    const campo = document.getElementById('campogioco');
    if (!campo) return;
    const campoRect = campo.getBoundingClientRect();
    const scale = window.gameScale || (campoRect.width / 1024) || 1;

    function getCoords(el) {
        const r = el.getBoundingClientRect();
        return {
            left: (r.left - campoRect.left) / scale,
            top: (r.top - campoRect.top) / scale,
            right: (r.right - campoRect.left) / scale,
            bottom: (r.bottom - campoRect.top) / scale,
            width: r.width / scale,
            height: r.height / scale
        };
    }

    // 1. Avatar Basso (Tu): dinamicamente di fianco a sinistra del campo giocatore, spostato più in basso
    const manoBasso = document.getElementById('mano-basso');
    const avBasso = document.getElementById('avatar-basso');
    if (manoBasso && avBasso && avBasso.style.display !== 'none') {
        const rM = getCoords(manoBasso);
        const avW = avBasso.offsetWidth || 56;
        const avH = avBasso.offsetHeight || 65;
        avBasso.style.left = Math.round(rM.left - avW) + 'px';
        avBasso.style.top = Math.round(rM.bottom - avH) + 'px';
        avBasso.style.right = 'auto';
        avBasso.style.bottom = 'auto';
    }

    // 2. Avatar Alto (Compagno in 4 o Avversario in 2): dinamicamente a destra del campo compagno, spostato in alto
    const manoAlto = document.getElementById('mano-alto');
    const avAlto = document.getElementById('avatar-alto');
    if (manoAlto && avAlto && avAlto.style.display !== 'none') {
        const rM = getCoords(manoAlto);
        const avH = avAlto.offsetHeight || 65;
        avAlto.style.left = Math.round(rM.right) + 'px';
        avAlto.style.top = Math.round(rM.top) + 'px';
        avAlto.style.right = 'auto';
        avAlto.style.bottom = 'auto';
    }

    // 3. Avatar Sinistra (Avversario Sx): dinamicamente sopra il campo di sinistra
    const manoSx = document.getElementById('mano-sinistra');
    const avSx = document.getElementById('avatar-sinistra');
    if (manoSx && avSx && avSx.style.display !== 'none') {
        const rM = getCoords(manoSx);
        const avW = avSx.offsetWidth || 70;
        const avH = avSx.offsetHeight || 65;
        avSx.style.left = Math.round(rM.right - (rM.width / 4) - (avW / 2) + 5) + 'px';
        avSx.style.top = Math.round(rM.top - avH) + 'px';
        avSx.style.right = 'auto';
        avSx.style.bottom = 'auto';
    }

    // 4. Avatar Destra (Avversario Dx): dinamicamente sotto il campo di destra
    const manoDx = document.getElementById('mano-destra');
    const avDx = document.getElementById('avatar-destra');
    if (manoDx && avDx && avDx.style.display !== 'none') {
        const rM = getCoords(manoDx);
        const avW = avDx.offsetWidth || 70;
        avDx.style.left = Math.round(rM.left + (rM.width / 4) - (avW / 2) - 5) + 'px';
        avDx.style.top = Math.round(rM.bottom) + 'px';
        avDx.style.right = 'auto';
        avDx.style.bottom = 'auto';
    }

    posizionaMazzettiDinamici();
}

// Posizionamento dinamico dei mazzetti prese ("Noi" e "Loro")
function posizionaMazzettiDinamici() {
    const campo = document.getElementById('campogioco');
    if (!campo) return;
    const campoRect = campo.getBoundingClientRect();
    const scale = window.gameScale || (campoRect.width / 1024) || 1;

    function getCoords(el) {
        const r = el.getBoundingClientRect();
        return {
            left: (r.left - campoRect.left) / scale,
            top: (r.top - campoRect.top) / scale,
            right: (r.right - campoRect.left) / scale,
            bottom: (r.bottom - campoRect.top) / scale,
            width: r.width / scale,
            height: r.height / scale
        };
    }

    // 1. Mazzetto "Noi" / "Tu": dinamicamente sopra il campo giocatore (#mano-basso)
    // Mantiene la posizione orizzontale iniziale (con 10 carte in mano),
    // senza spostarsi man mano che il campo giocatore si restringe durante la smazzata.
    const manoBasso = document.getElementById('mano-basso');
    const mazTu = document.getElementById('mazzetto-tu');
    if (manoBasso && mazTu) {
        const rM = getCoords(manoBasso);
        const mW = mazTu.offsetWidth || 89;
        const mH = mazTu.offsetHeight || 120;

        // Calcola il bordo destro iniziale corrispondente alla mano completa di 10 carte:
        const isBresciane = campo.classList.contains('bresciane');
        const fullHandWidth = isBresciane ? 704 : 856;
        const centerX = (campoRect.width / scale) / 2;
        const initialRight = centerX + (fullHandWidth / 2);

        mazTu.style.left = Math.round(initialRight - mW) + 'px';
        mazTu.style.top = Math.round(rM.top - mH - 10) + 'px';
        mazTu.style.right = 'auto';
        mazTu.style.bottom = 'auto';
    }

    // 2. Mazzetto "Loro": dinamicamente sotto il campo compagno e a sinistra del campo avversario dx (bordo dx vicino a bordo sx di manoDx)
    const manoAlto = document.getElementById('mano-alto');
    const manoDx = document.getElementById('mano-destra');
    const mazLoro = document.getElementById('mazzetto-loro');
    if (mazLoro && manoDx) {
        const rDx = getCoords(manoDx);
        const mW = mazLoro.offsetWidth || 120;
        const mH = mazLoro.offsetHeight || 89;

        // Bordo destro del mazzo vicino al bordo sinistro del campo avversario dx (10px di distanza)
        const leftX = Math.round(rDx.left - mW - 10);

        // Posizionamento verticale: dinamicamente sotto il campo compagno
        let topY = 185;
        if (manoAlto) {
            const rAlto = getCoords(manoAlto);
            topY = Math.round(rAlto.bottom + 10);
        }

        mazLoro.style.top = topY + 'px';
        mazLoro.style.left = leftX + 'px';
        mazLoro.style.right = 'auto';
        mazLoro.style.bottom = 'auto';
    }
}

function aggiornaEvidenzaTurno() {
    ['mano-basso', 'mano-alto', 'mano-sinistra', 'mano-destra'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('turno-attivo');
    });

    const mapMani = modalitaGiocatori === 2
        ? { 0: 'mano-basso', 1: 'mano-alto' }
        : { 0: 'mano-basso', 1: 'mano-destra', 2: 'mano-alto', 3: 'mano-sinistra' };

    const attiva = document.getElementById(mapMani[turno]);
    if (attiva && !partitaFinita) {
        attiva.classList.add('turno-attivo');
    }
}

// === UNDO (ANNULLA MOSSA) ===
function creaUndoSnapshot() {
    const snap = {
        mani: mani.map(m => m.slice()),
        tavolo: tavolo.slice(),
        turno: turno,
        primoDiMano: primoDiMano,
        puntiTorneo: puntiTorneo.slice(),
        cartePrese: cartePrese.map(p => p.slice()),
        totaleCarteTorneo: totaleCarteTorneo.slice(),
        totaleAccuseTorneo: totaleAccuseTorneo.slice(),
        penalitaCarteTorneo: penalitaCarteTorneo.slice(),
        penalitaSpecialiTorneo: penalitaSpecialiTorneo.slice(),
        accuseSmazzata: [accuseSmazzata[0].slice(), accuseSmazzata[1].slice()]
    };
    undoStack.push(snap);
    aggiornaStatoUndoUI();
}

function annullaMossa() {
    if (undoStack.length === 0 || animando || partitaFinita) return;
    const snap = undoStack.pop();
    mani = snap.mani.map(m => m.slice());
    tavolo = snap.tavolo.slice();
    turno = snap.turno;
    primoDiMano = snap.primoDiMano;
    puntiTorneo = snap.puntiTorneo.slice();
    cartePrese = snap.cartePrese.map(p => p.slice());
    totaleCarteTorneo = snap.totaleCarteTorneo ? snap.totaleCarteTorneo.slice() : [0, 0];
    totaleAccuseTorneo = snap.totaleAccuseTorneo ? snap.totaleAccuseTorneo.slice() : [0, 0];
    penalitaCarteTorneo = snap.penalitaCarteTorneo ? snap.penalitaCarteTorneo.slice() : [0, 0, 0, 0];
    penalitaSpecialiTorneo = snap.penalitaSpecialiTorneo ? snap.penalitaSpecialiTorneo.slice() : [0, 0, 0, 0];
    accuseSmazzata = snap.accuseSmazzata ? [snap.accuseSmazzata[0].slice(), snap.accuseSmazzata[1].slice()] : [[], []];

    impostaMessaggioStato(TRESSETTE_LANG.mossaAnnullata);
    renderTutto();
    aggiornaStatoUndoUI();
}

function aggiornaStatoUndoUI() {
    const btn = document.getElementById('btn-undo');
    if (btn) {
        btn.disabled = (undoStack.length === 0 || turno !== 0 || animando || partitaFinita);
    }
}

// === STATISTICHE LOCALI ===
function caricaStatistiche() {
    const k = 'tressette-stats-' + varianteGioco;
    try {
        let s = JSON.parse(localStorage.getItem(k));
        if (!s) s = JSON.parse(localStorage.getItem(k + '-' + difficolta));
        if (s && typeof s.v === 'number') return s;
    } catch (e) {}
    return { v: 0, p: 0, n: 0 };
}

function salvaStatistiche(s) {
    const k = 'tressette-stats-' + varianteGioco;
    localStorage.setItem(k, JSON.stringify(s));
}

function aggiornaStatistiche(esito) {
    const s = caricaStatistiche();
    if (esito === 'vinta') s.v++;
    else if (esito === 'persa') s.p++;
    else s.n++;
    salvaStatistiche(s);
    renderStatisticheUI();
}

function renderStatisticheUI() {
    const s = caricaStatistiche();
    const sv = document.getElementById('stat-vinte');
    const sp = document.getElementById('stat-perse');
    const sn = document.getElementById('stat-patte');
    if (sv) sv.textContent = s.v;
    if (sp) sp.textContent = s.p;
    if (sn) sn.textContent = s.n;
}

function resetStatistiche() {
    if (!confirm(TRESSETTE_LANG.resetChiedi)) return;
    salvaStatistiche({ v: 0, p: 0, n: 0 });
    renderStatisticheUI();
}

// === CAMBIO MAZZO E OPZIONI ===
function cambiaMazzo() {
    const temi = ['napoletane', 'bresciane', 'francesi'];
    const cur = localStorage.getItem('tressette-deck-theme') || 'napoletane';
    const next = temi[(temi.indexOf(cur) + 1) % temi.length];
    impostaTemaMazzo(next);
}

function impostaTemaMazzo(tema) {
    localStorage.setItem('tressette-deck-theme', tema);
    const cg = document.getElementById('campogioco');
    if (cg) {
        cg.classList.remove('napoletane', 'bresciane', 'francesi');
        cg.classList.add(tema);
    }
    const btn = document.getElementById('btn-mazzo');
    if (btn) btn.textContent = TRESSETTE_LANG.mazzo[tema];
    renderTutto();
}

function toggleScoperte() {
    maniScoperte = !maniScoperte;
    const btn = document.getElementById('btn-scoperte');
    if (btn) btn.textContent = maniScoperte ? '👁 COPERTE' : '👁 SCOPERTE';
    renderTutto();
}

// === GESTIONE MODALI ===
function apriModale(id) {
    const sch = document.getElementById('schermo');
    if (sch) sch.style.display = 'block';
    const m = document.getElementById(id);
    if (m) m.style.display = 'flex';
}

function chiudiModali() {
    const sch = document.getElementById('schermo');
    if (sch) sch.style.display = 'none';
    document.querySelectorAll('.form-tressette').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });
}

function apriModaleInizio() {
    apriModale('modale-inizio');
}

function richiediNuovaPartita() {
    // Partita conclusa: il reload rinnova pubblicità, interstitial e statistiche
    if (partitaFinita) {
        location.reload();
        return;
    }
    // Se la partita non è ancora iniziata o le mani sono vuote
    if (!mani || !mani.length || mani.every(function (m) { return !m || m.length === 0; })) {
        apriModaleInizio();
        return;
    }
    const sch = document.getElementById('schermo');
    if (sch) sch.style.display = 'block';
    const conf = document.getElementById('confermatermina');
    if (conf) conf.style.display = 'flex';
    if (typeof setupAmazonFinishBanner === 'function') {
        setupAmazonFinishBanner('confermatermina', {
            modalStyle: { overflow: 'visible' },
            targetTop: 470,
            applyModalTop: false,
            bannerHeight: 300,
            bannerTopOffset: 325,
            leftOffset: 0
        });
    }
}

// Impostazioni da modale inizio partita
function selezionaVariante(v) {
    varianteGioco = v;
    document.querySelectorAll('[data-opt-variante]').forEach(b => {
        b.classList.toggle('attiva', b.getAttribute('data-opt-variante') === v);
    });
    // Mostra/nascondi opzioni specifiche Ciapanò o Accuse Tressette
    const grpBastoni = document.getElementById('gruppo-opz-bastoni');
    const grpAccuse = document.getElementById('gruppo-opz-accuse');
    if (grpBastoni) grpBastoni.style.display = (v === 'ciapano' ? 'block' : 'none');
    if (grpAccuse) grpAccuse.style.display = (v === 'tressette' ? 'block' : 'none');
}

function selezionaModalita(n) {
    modalitaGiocatori = n;
    document.querySelectorAll('[data-opt-modalita]').forEach(b => {
        b.classList.toggle('attiva', parseInt(b.getAttribute('data-opt-modalita'), 10) === n);
    });
}

function selezionaDifficolta(d) {
    difficolta = d;
    document.querySelectorAll('[data-opt-diff]').forEach(b => {
        b.classList.toggle('attiva', b.getAttribute('data-opt-diff') === d);
    });
    renderStatisticheUI();
}

function selezionaTarget(t) {
    targetPunti = t;
    document.querySelectorAll('[data-opt-target]').forEach(b => {
        b.classList.toggle('attiva', parseInt(b.getAttribute('data-opt-target'), 10) === t);
    });
}

function toggleAssoBastoni() {
    assoBastoniSpeciale = !assoBastoniSpeciale;
    const btn = document.getElementById('btn-asso-bastoni');
    if (btn) btn.classList.toggle('attiva', assoBastoniSpeciale);
}

function toggleAccuse() {
    accuseAttive = !accuseAttive;
    const btn = document.getElementById('btn-accuse');
    if (btn) btn.classList.toggle('attiva', accuseAttive);
}

function confermaEAvviaPartita() {
    chiudiModali();
    avviaNuovaPartita();
}

// Inizializzazione pagina al caricamento
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initTressette);
    } else {
        initTressette();
    }
});

function initTressette() {
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function () {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initTressette();
            }
        }, 100);
        return;
    }

    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }

    // Carica preferenze salvate
    const temaSalvato = localStorage.getItem('tressette-deck-theme') || 'napoletane';
    impostaTemaMazzo(temaSalvato);

    // Inizializza pulsante mute audio
    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }

    // Event listeners bottoni
    function addEv(id, type, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(type, fn);
    }

    addEv('btn-nuova-partita', 'click', function (e) { e.stopPropagation(); richiediNuovaPartita(); });
    addEv('btn-no-continua', 'click', function (e) { e.stopPropagation(); chiudiModali(); });
    addEv('btn-si-termina', 'click', function () { location.reload(); });
    addEv('btn-undo', 'click', annullaMossa);
    addEv('btn-scoperte', 'click', toggleScoperte);
    addEv('btn-mazzo', 'click', cambiaMazzo);
    addEv('btn-reset-stats', 'click', resetStatistiche);

    // Click ovunque (sul tavolo o carte) per depositare le carte nei mazzetti a fine mano
    document.addEventListener('click', (e) => {
        if (inAttesaClickFinePresa && typeof callbackIncassaPresa === 'function') {
            if (e.target.closest('button, a, .lang-switch-header, .form-tressette')) return;
            callbackIncassaPresa();
        }
    });

    renderStatisticheUI();
    apriModaleInizio();

    window.addEventListener('resize', posizionaAvatarDinamici);
    if (typeof window.registerLayoutResizeListener === 'function') {
        window.registerLayoutResizeListener(() => {
            posizionaAvatarDinamici();
        });
    }
}
