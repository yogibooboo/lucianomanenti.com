/* ============================================================================
   TRESSETTE & CIAPANÒ - Motore di Gioco (JavaScript)
   Regole ufficiali italiane per Tressette (2v2 a coppie) e
   Ciapanò / Traversone / Chi perde vince (tutti contro tutti a 4).
   Gerarchia di presa: 3 > 2 > Asso > Re > Cavallo > Fante > 7 > 6 > 5 > 4
   Rigido obbligo di risposta a seme (bussare/rispondere).
   AI avanzata a 3 livelli per entrambe le modalità.
   Supporto mazzi: Napoletane, Bresciane, Francesi.
   ============================================================================ */

window.scriptVersion = '1.29';

// === TESTI MULTILINGUA ===
const TRESSETTE_LANG = (window.currentLang === 'en') ? {
    titoloTressette: 'Luciano\'s Tressette',
    titoloCiapano: 'Luciano\'s Traversone <span class="titolo-sottotitolo">(Ciapanò)</span>',
    traversone: 'TRAVERSONE',
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
    semi: { F: 'Clubs/Swords', Q: 'Diamonds/Coins', C: 'Hearts/Cups', P: 'Spades/Batons' },
    semiItaliani: { F: 'Swords', Q: 'Coins', C: 'Cups', P: 'Batons' },
    semiFrancesi: { F: 'Clubs', Q: 'Diamonds', C: 'Hearts', P: 'Spades' },
    assoSpecialeNome: function (isFr) { return isFr ? 'Ace of Spades' : 'Ace of Batons'; },
    assoSpecialeNota: function (isFr) { return isFr ? '(+11 Spades)' : '(+11 Batons)'; },
    napoliNome: function (semeNome, pt) {
        return 'Napoli of ' + semeNome + (pt > 3 ? ' (' + pt + ')' : '');
    },
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
    totaleSmazzata: 'Hand Total',
    totalePrecedente: 'Previous Total',
    nuovaSmazzata: 'New Hand',
    totaleGenerale: 'Grand Total',
    traguardo: 'Target',
    limite: 'Limit',
    penalita: 'Penalties',
    punti: 'Points',
    fineSmazzataTitolo: function (num) { return 'END OF HAND #' + num; },
    puntiUltimaMano: 'Last Hand Points',
    totalePartita: 'Match Total',
    bilancio: 'Balance',
    bilancioCiapanoHeader: 'BALANCE (4 PLAYERS)',
    vinte: 'Won',
    perse: 'Lost',
    patte: 'Tied',
    giocatoreEst: 'East',
    giocatoreNord: 'North',
    giocatoreOvest: 'West',
    bilancioCiapanoTitolo: 'Match Balance (4 Players)',
    bilancioCiapanoStorico: function (s, nomi) {
        const n0 = (nomi && nomi[0]) ? nomi[0].nome : 'You';
        const n1 = (nomi && nomi[1]) ? nomi[1].nome : 'P1';
        const n2 = (nomi && nomi[2]) ? nomi[2].nome : 'P2';
        const n3 = (nomi && nomi[3]) ? nomi[3].nome : 'P3';
        return 'Wins balance: ' + n0 + ' ' + s[0] + ' — ' + n1 + ' ' + s[1] + ' — ' + n2 + ' ' + s[2] + ' — ' + n3 + ' ' + s[3];
    },
    ultimaPresaPt: 'Last trick (+1 pt)',
    prossimaSmazzata: 'NEXT HAND ➡️',
    nuovaPartita: 'NEW MATCH 🔄',
    vittoriaPer: function (mie, sue, diff) { return 'Victory by ' + mie + ' to ' + sue + ' (+' + diff + ' pt margin)'; },
    sconfittaPer: function (mie, sue, diff) { return 'Defeat by ' + sue + ' to ' + mie + ' (-' + diff + ' pt margin)'; },
    pattaPer: function (pt) { return 'Tie game at ' + pt + ' points'; },
    bilancioCiapano: function (nome, min, distacco) {
        return nome + ' wins with ' + min + ' penalties' + (distacco > 0 ? ' (' + distacco + ' pt ahead)' : '');
    },
    dichiaraAccusa: function (nome, accusa, pt) {
        return '<span class="showcase-giocatore">' + nome + '</span> declares ' + accusa + ' <span class="showcase-punti">(+' + pt + ' pt)</span>';
    },
    dichiariAccusa: function (accusa, pt) {
        return 'You declare ' + accusa + ' <span class="showcase-punti">(+' + pt + ' pt)</span>';
    },
    cliccaPerContinuareAccusa: 'Click anywhere to continue'
} : {
    titoloTressette: 'Tressette Luciano',
    titoloCiapano: 'Traversone Luciano <span class="titolo-sottotitolo">(Ciapanò)</span>',
    traversone: 'TRAVERSONE',
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
    semiFrancesi: { F: 'Fiori', Q: 'Quadri', C: 'Cuori', P: 'Picche' },
    assoSpecialeNome: function (isFr) { return isFr ? 'Asso di Picche' : 'Asso di Bastoni'; },
    assoSpecialeNota: function (isFr) { return isFr ? '(+11 Picche)' : '(+11 Bastoni)'; },
    napoliNome: function (semeNome, pt) {
        return 'Napoli di ' + semeNome + (pt > 3 ? ' (' + pt + ')' : '');
    },
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
    totaleSmazzata: 'Totale smazzata',
    totalePrecedente: 'Totale precedente',
    nuovaSmazzata: 'Nuova smazzata',
    totaleGenerale: 'Totale generale',
    traguardo: 'Traguardo',
    limite: 'Limite',
    penalita: 'Penalità',
    punti: 'Punti',
    fineSmazzataTitolo: function (num) { return 'FINE SMAZZATA #' + num; },
    puntiUltimaMano: 'Punti Ultima Mano',
    totalePartita: 'Totale Partita',
    bilancio: 'Bilancio',
    bilancioCiapanoHeader: 'BILANCIO (4 GIOCATORI)',
    vinte: 'Vinte',
    perse: 'Perse',
    patte: 'Patte',
    giocatoreEst: 'Est',
    giocatoreNord: 'Nord',
    giocatoreOvest: 'Ovest',
    bilancioCiapanoTitolo: 'Bilancio Partita (4 Giocatori)',
    bilancioCiapanoStorico: function (s, nomi) {
        const n0 = (nomi && nomi[0]) ? nomi[0].nome : 'Tu';
        const n1 = (nomi && nomi[1]) ? nomi[1].nome : 'P1';
        const n2 = (nomi && nomi[2]) ? nomi[2].nome : 'P2';
        const n3 = (nomi && nomi[3]) ? nomi[3].nome : 'P3';
        return 'Bilancio vittorie: ' + n0 + ' ' + s[0] + ' — ' + n1 + ' ' + s[1] + ' — ' + n2 + ' ' + s[2] + ' — ' + n3 + ' ' + s[3];
    },
    ultimaPresaPt: 'Ultima presa (+1 pt)',
    prossimaSmazzata: 'PROSSIMA SMAZZATA ➡️',
    nuovaPartita: 'NUOVA PARTITA 🔄',
    vittoriaPer: function (mie, sue, diff) { return 'Vittoria per ' + mie + ' a ' + sue + ' (+ ' + diff + ' pt di vantaggio)'; },
    sconfittaPer: function (mie, sue, diff) { return 'Sconfitta per ' + sue + ' a ' + mie + ' (- ' + diff + ' pt di svantaggio)'; },
    pattaPer: function (pt) { return 'Pareggio a ' + pt + ' punti'; },
    bilancioCiapano: function (nome, min, distacco) {
        return nome + ' vince con sole ' + min + ' penalità' + (distacco > 0 ? ' (' + distacco + ' pt di vantaggio)' : '');
    },
    dichiaraAccusa: function (nome, accusa, pt) {
        return '<span class="showcase-giocatore">' + nome + '</span> dichiara ' + accusa + ' <span class="showcase-punti">(+' + pt + ' pt)</span>';
    },
    dichiariAccusa: function (accusa, pt) {
        return 'Dichiari ' + accusa + ' <span class="showcase-punti">(+' + pt + ' pt)</span>';
    },
    cliccaPerContinuareAccusa: 'Clicca ovunque per continuare'
};

// === COSTANTI DI GIOCO ===
// Gerarchia di presa del Tressette: 3 > 2 > 1 > 10 > 9 > 8 > 7 > 6 > 5 > 4
const FORZA_TRESSETTE = { 3: 10, 2: 9, 1: 8, 10: 7, 9: 6, 8: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
// Punti netti in terzi: Asso = 3 terzi (1 pt intero), 3/2/10/9/8 = 1 terzo ciascuno
const TERZI_CARTA = { 1: 3, 3: 1, 2: 1, 10: 1, 9: 1, 8: 1 };

const SEMI = ['F', 'Q', 'C', 'P'];
const VALORI_SEMI = { F: 0, Q: 1, C: 2, P: 3 };

function getTemaMazzoAttivo() {
    try {
        return localStorage.getItem('tressette-deck-theme') || 'napoletane';
    } catch (e) {
        return 'napoletane';
    }
}

function getNomeSeme(suit, tema) {
    const t = tema || getTemaMazzoAttivo();
    const isFr = (t === 'francesi');
    const dict = isFr ? TRESSETTE_LANG.semiFrancesi : TRESSETTE_LANG.semiItaliani;
    return (dict && dict[suit]) || suit;
}

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
let inAttesaClickAccuse = false;
let codaAccuseDaMostrare = [];
let timerMossaAI = null;

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
            const carteCoinvolte = mano.filter(c => c.number === n);
            accuse.push({ tipo: 'bongioco', dettaglio: nomeCarta, nome: 'Bongioco (' + nomeCarta + ')', punti: 3, carte: carteCoinvolte });
        } else if (cnt === 4) {
            const carteCoinvolte = mano.filter(c => c.number === n);
            accuse.push({ tipo: 'bongioco', dettaglio: 'Super ' + nomeCarta, nome: 'Super Bongioco (' + nomeCarta + ')', punti: 4, carte: carteCoinvolte });
        }
    });

    // Napoli: Asso, Due e Tre dello stesso seme (+1 per ogni carta consecutiva, es. 4)
    for (const s of SEMI) {
        const carte = perSeme[s];
        if (carte.includes(1) && carte.includes(2) && carte.includes(3)) {
            let pt = 3;
            let nSeq = 4;
            while (carte.includes(nSeq)) { pt++; nSeq++; }
            const nomeSeme = getNomeSeme(s);
            const carteNumeri = [1, 2, 3];
            for (let num = 4; num < nSeq; num++) carteNumeri.push(num);
            const carteCoinvolte = mano.filter(c => c.suit === s && carteNumeri.includes(c.number));
            carteCoinvolte.sort((a, b) => a.number - b.number);
            accuse.push({
                tipo: 'napoli',
                seme: s,
                dettaglio: nomeSeme,
                nome: TRESSETTE_LANG.napoliNome(nomeSeme, pt),
                punti: pt,
                carte: carteCoinvolte
            });
        }
    }
    return accuse;
}

function mostraBannerAccusa(testo) {
    const banner = document.getElementById('banner-accusa');
    if (!banner) return;
    banner.innerHTML = testo;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 3200);
}

function mostraProssimaAccusa() {
    const sc = document.getElementById('showcase-accusa');
    const campo = document.getElementById('campogioco');

    if (!codaAccuseDaMostrare || codaAccuseDaMostrare.length === 0) {
        inAttesaClickAccuse = false;
        if (sc) {
            sc.style.display = 'none';
            sc.innerHTML = '';
        }
        if (campo) {
            campo.classList.remove('in-attesa-accuse');
        }
        prossimaMossa();
        return;
    }

    inAttesaClickAccuse = true;
    if (campo) {
        campo.classList.add('in-attesa-accuse');
    }

    const item = codaAccuseDaMostrare.shift();
    if (!sc) {
        mostraProssimaAccusa();
        return;
    }

    const nomeG = (item.g === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[item.g].nome);
    const testoTitolo = (item.g === 0)
        ? TRESSETTE_LANG.dichiariAccusa(item.nome, item.punti)
        : TRESSETTE_LANG.dichiaraAccusa(nomeG, item.nome, item.punti);

    let html = '<div class="showcase-accusa-box">';
    html += '  <div class="showcase-accusa-titolo">' + testoTitolo + '</div>';
    html += '  <div class="showcase-accusa-carte" id="showcase-accusa-carte-cont"></div>';
    html += '  <div class="showcase-accusa-prompt">' + TRESSETTE_LANG.cliccaPerContinuareAccusa + '</div>';
    html += '</div>';

    sc.innerHTML = html;
    sc.style.display = 'flex';
    sc.onclick = (e) => {
        e.stopPropagation();
        mostraProssimaAccusa();
    };

    const contCarte = document.getElementById('showcase-accusa-carte-cont');
    if (contCarte && Array.isArray(item.carte)) {
        item.carte.forEach(c => {
            const el = elementoCarta(c, false, false);
            contCarte.appendChild(el);
        });
    }

    riproduciAudio('sounds/scala40/cardplace1.mp3');
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
    try { sessionStorage.removeItem('tressette-partita-in-corso'); } catch (e) {}
    if (timerMossaAI) { clearTimeout(timerMossaAI); timerMossaAI = null; }
    undoStack = [];
    smazzataNumero = 1;
    inAttesaClickAccuse = false;
    codaAccuseDaMostrare = [];
    const sc = document.getElementById('showcase-accusa');
    if (sc) {
        sc.style.display = 'none';
        sc.innerHTML = '';
    }
    document.getElementById('campogioco')?.classList.remove('in-attesa-accuse');
    aggiornaStatoUndoUI();

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
    renderStatisticheUI();
    iniziaNuovaSmazzata();
}

function aggiornaTitoloGioco() {
    const el = document.getElementById('titolo-gioco');
    if (!el) return;
    if (varianteGioco === 'ciapano') {
        el.innerHTML = TRESSETTE_LANG.titoloCiapano;
    } else {
        el.innerHTML = TRESSETTE_LANG.titoloTressette;
    }
}

function iniziaNuovaSmazzata() {
    if (timerMossaAI) { clearTimeout(timerMossaAI); timerMossaAI = null; }
    undoStack = [];
    inAttesaClickFinePresa = false;
    callbackIncassaPresa = null;
    document.getElementById('campogioco')?.classList.remove('in-attesa-fine-presa');
    inAttesaClickAccuse = false;
    codaAccuseDaMostrare = [];
    const sc = document.getElementById('showcase-accusa');
    if (sc) {
        sc.style.display = 'none';
        sc.innerHTML = '';
    }
    document.getElementById('campogioco')?.classList.remove('in-attesa-accuse');
    aggiornaStatoUndoUI();

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
                    codaAccuseDaMostrare.push({ g: g, tipo: a.tipo, dettaglio: a.dettaglio, nome: a.nome, punti: a.punti, carte: a.carte });
                });
            }
        }
    }

    renderTutto();

    if (codaAccuseDaMostrare.length > 0) {
        mostraProssimaAccusa();
    } else {
        prossimaMossa();
    }
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
    if (timerMossaAI) clearTimeout(timerMossaAI);
    timerMossaAI = setTimeout(() => {
        timerMossaAI = null;
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
    if (partitaFinita || animando || turno !== 0 || inAttesaClickFinePresa || inAttesaClickAccuse || tavolo.length >= modalitaGiocatori) return;

    const legali = carteGiocabili(0);
    if (!legali.includes(carta)) {
        // Feedback visivo obbligo di seme
        const leadSuit = tavolo[0].carta.suit;
        const nomeSeme = getNomeSeme(leadSuit);
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

    // Se Asso di Bastoni / Asso di Picche nel Ciapanò:
    if (varianteGioco === 'ciapano' && assoBastoniSpeciale) {
        const haBastoni = tavolo.some(t => t.carta.suit === 'P' && t.carta.number === 1);
        if (haBastoni) {
            puntiTorneo[vincitore] += 11;
            penalitaSpecialiTorneo[vincitore] += 11;
            const isFr = (getTemaMazzoAttivo() === 'francesi');
            const nomeAsso = TRESSETTE_LANG.assoSpecialeNome(isFr);
            const msg = (window.currentLang === 'en')
                ? (nomeAsso + ' to ' + nomeVincitore + '! (+11 penalty)')
                : (nomeAsso + ' a ' + nomeVincitore + '! (+11 penalità)');
            mostraBannerAccusa(msg);
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
    aggiornaStatoUndoUI();

    callbackIncassaPresa = () => {
        inAttesaClickFinePresa = false;
        callbackIncassaPresa = null;
        if (campogiocoEl) campogiocoEl.classList.remove('in-attesa-fine-presa');
        aggiornaStatoUndoUI();

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

            // Verifica fine della smazzata (tutte le 10 prese concluse)
            if (mani.every(m => m.length === 0)) {
                fineSmazzata(vincitore); // calcola punti smazzata e valuta fine partita a smazzata conclusa
                return;
            }

            animando = false;
            prossimaMossa();
        });
    };
}

let ultimoDatiSmazzata = null;

// Fine della smazzata: conteggio dei punti/penalità e valutazione fine partita
function fineSmazzata(ultimoVincitore) {
    animando = true;

    const labelNoi = modalitaGiocatori === 4 ? TRESSETTE_LANG.noi : TRESSETTE_LANG.tu;
    const labelLoro = modalitaGiocatori === 4 ? TRESSETTE_LANG.loro : TRESSETTE_LANG.pc;
    const target = parseInt(targetPunti, 10);

    if (varianteGioco === 'tressette') {
        const assi = [0, 0];
        const pezze = [0, 0];
        const ptCarte = [0, 0];
        const ptUltima = [0, 0];
        const sqUltima = squadraDi(ultimoVincitore);
        ptUltima[sqUltima] = 1;

        for (let sq = 0; sq < 2; sq++) {
            const giocatori = (modalitaGiocatori === 4) ? [sq, sq + 2] : [sq];
            giocatori.forEach(g => {
                cartePrese[g].forEach(c => {
                    if (c.number === 1) assi[sq]++;
                    else if ([3, 2, 10, 9, 8].includes(c.number)) pezze[sq]++;
                });
            });
            ptCarte[sq] = assi[sq] + Math.floor(pezze[sq] / 3);
            totaleCarteTorneo[sq] += (ptCarte[sq] + ptUltima[sq]);
            puntiTorneo[sq] += (ptCarte[sq] + ptUltima[sq]);
        }

        const accSmazz = [
            accuseSmazzata[0].reduce((s, a) => s + a.punti, 0),
            accuseSmazzata[1].reduce((s, a) => s + a.punti, 0)
        ];

        const totSmazz = [
            ptCarte[0] + ptUltima[0] + accSmazz[0],
            ptCarte[1] + ptUltima[1] + accSmazz[1]
        ];
        const totPrec = [
            puntiTorneo[0] - totSmazz[0],
            puntiTorneo[1] - totSmazz[1]
        ];

        ultimoDatiSmazzata = {
            smazzataNum: smazzataNumero,
            variante: 'tressette',
            labelNoi: labelNoi,
            labelLoro: labelLoro,
            assi: assi,
            pezze: pezze,
            ptCarte: ptCarte,
            ptUltima: ptUltima,
            sqUltima: sqUltima,
            accSmazz: accSmazz,
            totSmazzata: totSmazz,
            totPrecedente: totPrec,
            totPartita: [puntiTorneo[0], puntiTorneo[1]],
            target: target
        };

        renderTutto();

        // Controllo vittoria partita solo a fine smazzata
        const noiRaggiunto = puntiTorneo[0] >= target;
        const loroRaggiunto = puntiTorneo[1] >= target;

        if (noiRaggiunto || loroRaggiunto || target === 11) {
            concludiPartitaTressette();
            return;
        }

        // Partita non finita: mostra modale intermedia di fine smazzata
        mostraFineSmazzata();

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

            if (ptG[g] === 11 || (modalitaGiocatori === 4 && cartePrese[g].length === 40)) chiPrendeTutto = g;
        }

        const penalitaSmazzata = [0, 0, 0, 0];
        if (chiPrendeTutto !== -1) {
            // Regola del CAPPOTTO in Ciapanò:
            // Chi fa cappotto prende 0 penalità, tutti gli altri prendono 11 penalità!
            const nomeCap = (chiPrendeTutto === 0 ? TRESSETTE_LANG.tu : nomiGiocatori[chiPrendeTutto].nome);
            mostraBannerAccusa(TRESSETTE_LANG.cappottoAltro(nomeCap));
            riproduciAudio('sounds/scala40/tada.mp3');
            for (let g = 0; g < modalitaGiocatori; g++) {
                if (g !== chiPrendeTutto) {
                    penalitaSmazzata[g] = 11;
                    puntiTorneo[g] += 11;
                    penalitaSpecialiTorneo[g] += 11;
                } else {
                    penalitaSmazzata[g] = 0;
                }
            }
        } else {
            for (let g = 0; g < modalitaGiocatori; g++) {
                penalitaSmazzata[g] = ptG[g];
                puntiTorneo[g] += ptG[g];
                penalitaCarteTorneo[g] += ptG[g];
            }
        }

        ultimoDatiSmazzata = {
            smazzataNum: smazzataNumero,
            variante: 'ciapano',
            chiPrendeTutto: chiPrendeTutto,
            ultimoVincitore: ultimoVincitore,
            penalitaSmazzata: penalitaSmazzata,
            totPartita: puntiTorneo.slice(),
            target: target
        };

        renderTutto();

        // Controllo fine partita Ciapanò solo a fine smazzata
        const qualcunoFuori = puntiTorneo.some(p => p >= target);
        if (qualcunoFuori || target === 11) {
            concludiPartitaCiapano();
            return;
        }

        // Partita non finita: mostra modale intermedia di fine smazzata
        mostraFineSmazzata();
    }
}

// Formatta il riepilogo grafico dei punti per la modale di fine smazzata e fine partita
function formattaRiepilogoHTML(dati, isFinale) {
    if (!dati) return '';
    let html = '';

    if (dati.variante === 'tressette') {
        const noi = dati.labelNoi;
        const loro = dati.labelLoro;
        const haAccuse = (dati.accSmazz[0] > 0 || dati.accSmazz[1] > 0);
        const totPrecNoi = (dati.totPrecedente && typeof dati.totPrecedente[0] === 'number') ? dati.totPrecedente[0] : (dati.totPartita[0] - dati.totSmazzata[0]);
        const totPrecLoro = (dati.totPrecedente && typeof dati.totPrecedente[1] === 'number') ? dati.totPrecedente[1] : (dati.totPartita[1] - dati.totSmazzata[1]);

        html += '<div class="riepilogo-box-modale">';

        // Colonna 1: Punti Ultima Mano (colonne Noi e Loro con valori punti)
        html += '<div class="riepilogo-col-modale">';
        html += '<div class="riepilogo-col-titolo">' + TRESSETTE_LANG.puntiUltimaMano + ' (#' + dati.smazzataNum + ')</div>';
        html += '<div class="riepilogo-griglia-tab">';
        html += '  <div class="riepilogo-tab-head"></div>';
        html += '  <div class="riepilogo-tab-head noi">' + noi + '</div>';
        html += '  <div class="riepilogo-tab-head loro">' + loro + '</div>';

        html += '  <div class="riepilogo-tab-label">' + TRESSETTE_LANG.carte + '</div>';
        html += '  <div class="riepilogo-tab-val noi">' + dati.ptCarte[0] + ' pt</div>';
        html += '  <div class="riepilogo-tab-val loro">' + dati.ptCarte[1] + ' pt</div>';

        if (haAccuse) {
            html += '  <div class="riepilogo-tab-label">' + TRESSETTE_LANG.accuse + '</div>';
            html += '  <div class="riepilogo-tab-val noi">' + (dati.accSmazz[0] > 0 ? ('+' + dati.accSmazz[0] + ' pt') : '—') + '</div>';
            html += '  <div class="riepilogo-tab-val loro">' + (dati.accSmazz[1] > 0 ? ('+' + dati.accSmazz[1] + ' pt') : '—') + '</div>';
        }

        html += '  <div class="riepilogo-tab-label">' + TRESSETTE_LANG.ultimaPresaPt + '</div>';
        html += '  <div class="riepilogo-tab-val noi">' + (dati.sqUltima === 0 ? '+1 pt' : '—') + '</div>';
        html += '  <div class="riepilogo-tab-val loro">' + (dati.sqUltima === 1 ? '+1 pt' : '—') + '</div>';

        html += '  <div class="riepilogo-tab-label totale">' + TRESSETTE_LANG.totaleSmazzata + '</div>';
        html += '  <div class="riepilogo-tab-val noi totale">' + dati.totSmazzata[0] + ' pt</div>';
        html += '  <div class="riepilogo-tab-val loro totale">' + dati.totSmazzata[1] + ' pt</div>';
        html += '</div>';
        html += '</div>';

        // Colonna 2: Totale Partita (colonne Noi e Loro; righe: Totale precedente, Nuova smazzata, Totale generale)
        html += '<div class="riepilogo-col-modale">';
        html += '<div class="riepilogo-col-titolo">' + TRESSETTE_LANG.totalePartita + ' (' + TRESSETTE_LANG.traguardo + ' ' + dati.target + ' pt)</div>';
        html += '<div class="riepilogo-griglia-tab">';
        html += '  <div class="riepilogo-tab-head"></div>';
        html += '  <div class="riepilogo-tab-head noi">' + noi + '</div>';
        html += '  <div class="riepilogo-tab-head loro">' + loro + '</div>';

        html += '  <div class="riepilogo-tab-label">' + TRESSETTE_LANG.totalePrecedente + '</div>';
        html += '  <div class="riepilogo-tab-val noi">' + totPrecNoi + ' pt</div>';
        html += '  <div class="riepilogo-tab-val loro">' + totPrecLoro + ' pt</div>';

        html += '  <div class="riepilogo-tab-label">' + TRESSETTE_LANG.nuovaSmazzata + '</div>';
        html += '  <div class="riepilogo-tab-val noi">+' + dati.totSmazzata[0] + ' pt</div>';
        html += '  <div class="riepilogo-tab-val loro">+' + dati.totSmazzata[1] + ' pt</div>';

        const inTestaNoi = dati.totPartita[0] > dati.totPartita[1];
        const inTestaLoro = dati.totPartita[1] > dati.totPartita[0];
        html += '  <div class="riepilogo-tab-label totale">' + TRESSETTE_LANG.totaleGenerale + '</div>';
        html += '  <div class="riepilogo-tab-val noi totale ' + (inTestaNoi ? 'in-testa' : '') + '">' + dati.totPartita[0] + ' pt</div>';
        html += '  <div class="riepilogo-tab-val loro totale ' + (inTestaLoro ? 'in-testa' : '') + '">' + dati.totPartita[1] + ' pt</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>';

        if (isFinale) {
            const diff = Math.abs(dati.totPartita[0] - dati.totPartita[1]);
            let badgeHtml = '';
            if (dati.totPartita[0] > dati.totPartita[1]) {
                badgeHtml = '<div class="riepilogo-bilancio-badge vittoria">' + TRESSETTE_LANG.vittoriaPer(dati.totPartita[0], dati.totPartita[1], diff) + '</div>';
            } else if (dati.totPartita[1] > dati.totPartita[0]) {
                badgeHtml = '<div class="riepilogo-bilancio-badge sconfitta">' + TRESSETTE_LANG.sconfittaPer(dati.totPartita[0], dati.totPartita[1], diff) + '</div>';
            } else {
                badgeHtml = '<div class="riepilogo-bilancio-badge patta">' + TRESSETTE_LANG.pattaPer(dati.totPartita[0]) + '</div>';
            }
            html += badgeHtml;
        }

    } else {
        // CIAPANÒ
        html += '<div class="riepilogo-box-modale">';

        // Colonna 1: Penalità Ultima Mano
        html += '<div class="riepilogo-col-modale">';
        html += '<div class="riepilogo-col-titolo">' + TRESSETTE_LANG.puntiUltimaMano + ' (#' + dati.smazzataNum + ')</div>';
        for (let g = 0; g < modalitaGiocatori; g++) {
            const nome = (g === 0 ? TRESSETTE_LANG.tu : (nomiGiocatori[g] ? nomiGiocatori[g].nome : 'P' + g));
            html += '<div class="riepilogo-riga-dettaglio"><span>' + nome + ':</span><span>+' + dati.penalitaSmazzata[g] + ' pt</span></div>';
        }
        html += '</div>';

        // Colonna 2: Totale Partita
        let minPt = Infinity;
        let vinc = 0;
        let secondMin = Infinity;
        for (let g = 0; g < modalitaGiocatori; g++) {
            if (dati.totPartita[g] < minPt) {
                secondMin = minPt;
                minPt = dati.totPartita[g];
                vinc = g;
            } else if (dati.totPartita[g] < secondMin) {
                secondMin = dati.totPartita[g];
            }
        }

        html += '<div class="riepilogo-col-modale">';
        html += '<div class="riepilogo-col-titolo">' + TRESSETTE_LANG.totalePartita + ' (' + TRESSETTE_LANG.limite + ' ' + dati.target + ' pt)</div>';
        for (let g = 0; g < modalitaGiocatori; g++) {
            const nome = (g === 0 ? TRESSETTE_LANG.tu : (nomiGiocatori[g] ? nomiGiocatori[g].nome : 'P' + g));
            const inTesta = (dati.totPartita[g] === minPt);
            html += '<div class="riepilogo-riga-dettaglio" style="' + (inTesta ? 'font-weight: bold; color: #7fff7f;' : '') + '"><span>' + nome + ':</span><span>' + dati.totPartita[g] + ' pt</span></div>';
        }
        html += '</div>';

        html += '</div>';

        if (isFinale) {
            // Ordina i 4 giocatori per punteggio di penalità crescente (chi ha meno punti è 1°)
            const classifica = [];
            for (let g = 0; g < modalitaGiocatori; g++) {
                const nomeG = (g === 0 ? TRESSETTE_LANG.tu : (nomiGiocatori[g] ? nomiGiocatori[g].nome : 'P' + g));
                classifica.push({ g: g, nome: nomeG, pt: dati.totPartita[g] });
            }
            classifica.sort((a, b) => a.pt - b.pt);

            const minP = classifica[0].pt;
            const vincG = classifica[0].g;
            const badgeCls = (vincG === 0) ? 'vittoria' : 'sconfitta';

            let bilVoci = classifica.map((c, idx) => {
                const pos = (idx + 1) + '°';
                const distacco = c.pt - minP;
                const distStr = (idx === 0) ? '🏆' : ('+' + distacco + ' pt');
                return `<div class="ciapano-bilancio-chip ${c.g === 0 ? 'tu' : ''}">` +
                    `<span class="chip-pos">${pos}</span> ` +
                    `<span class="chip-nome">${c.nome}</span>: ` +
                    `<b>${c.pt} pt</b> ` +
                    `<span class="chip-dist">${distStr}</span>` +
                    `</div>`;
            }).join('');

            const sCiap = caricaStatisticheCiapano();
            const storicoTxt = TRESSETTE_LANG.bilancioCiapanoStorico(sCiap, nomiGiocatori);

            html += `<div class="riepilogo-bilancio-ciapano-wrapper">` +
                `<div class="ciapano-bilancio-titolo-bar ${badgeCls}">` +
                `<span>${TRESSETTE_LANG.bilancioCiapanoTitolo}</span>` +
                `<span class="ciapano-storico-inline">${storicoTxt}</span>` +
                `</div>` +
                `<div class="ciapano-bilancio-griglia-chips">${bilVoci}</div>` +
                `</div>`;
        }
    }

    return html;
}

// Mostra modale intermedia di fine smazzata con banner finish
function mostraFineSmazzata() {
    partitaFinita = false;
    animando = false;

    const msg = document.getElementById('smazzata-messaggio');
    const dett = document.getElementById('smazzata-dettagli');
    const btn = document.getElementById('btn-prossima-smazzata');

    if (msg && ultimoDatiSmazzata) msg.innerHTML = TRESSETTE_LANG.fineSmazzataTitolo(ultimoDatiSmazzata.smazzataNum);
    if (dett) dett.innerHTML = formattaRiepilogoHTML(ultimoDatiSmazzata, false);
    if (btn) btn.innerHTML = TRESSETTE_LANG.prossimaSmazzata;

    setTimeout(function () {
        const sch = document.getElementById('schermo');
        if (sch) sch.style.display = 'block';
        const modal = document.getElementById('finesmazzata');
        if (modal) modal.style.display = 'flex';
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('finesmazzata', {
                modalStyle: { overflow: 'visible' },
                targetTop: 430,
                applyModalTop: false,
                bannerHeight: 300,
                bannerTopOffset: 325,
                leftOffset: 0
            });
        }
    }, 1200);
}

// Continua alla smazzata successiva salvando lo stato in sessionStorage ed eseguendo reload per rinfrescare i banner pubblicitari
function continuaProssimaSmazzata() {
    try {
        sessionStorage.setItem('tressette-partita-in-corso', JSON.stringify({
            smazzataNumero: smazzataNumero + 1,
            puntiTorneo: puntiTorneo.slice(),
            totaleCarteTorneo: totaleCarteTorneo.slice(),
            totaleAccuseTorneo: totaleAccuseTorneo.slice(),
            penalitaCarteTorneo: penalitaCarteTorneo.slice(),
            penalitaSpecialiTorneo: penalitaSpecialiTorneo.slice(),
            targetPunti: targetPunti,
            varianteGioco: varianteGioco,
            modalitaGiocatori: modalitaGiocatori,
            difficolta: difficolta,
            nomiGiocatori: nomiGiocatori,
            assoBastoniSpeciale: assoBastoniSpeciale,
            accuseAttive: accuseAttive
        }));
    } catch (e) {
        console.warn('Errore salvataggio sessione smazzata:', e);
    }
    location.reload();
}

// Conclusione partita Tressette
function concludiPartitaTressette() {
    partitaFinita = true;
    try { sessionStorage.removeItem('tressette-partita-in-corso'); } catch (e) {}

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

    if (dettFine) {
        dettFine.innerHTML = formattaRiepilogoHTML(ultimoDatiSmazzata, true) +
            '<div style="font-size: 11px; color: #aed6ae; margin-top: 3px;">Smazzate giocate: ' + smazzataNumero + '</div>';
    }

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
    try { sessionStorage.removeItem('tressette-partita-in-corso'); } catch (e) {}

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
    aggiornaStatistiche(vinte ? 'vinta' : 'persa', vincitore);

    const msgFine = document.getElementById('fine-messaggio');
    const dettFine = document.getElementById('fine-dettagli');

    if (vinte) {
        msgFine.innerHTML = TRESSETTE_LANG.vittoria;
        riproduciAudio('sounds/scala40/tada.mp3');
    } else {
        msgFine.innerHTML = TRESSETTE_LANG.sconfitta;
        riproduciAudio('sounds/scala40/haiperso.mp3');
    }

    if (dettFine) {
        dettFine.innerHTML = formattaRiepilogoHTML(ultimoDatiSmazzata, true) +
            '<div style="font-size: 11px; color: #aed6ae; margin-top: 3px;">Smazzate giocate: ' + smazzataNumero + '</div>';
    }

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
        const isMioTurno = (turno === 0 && !animando && !partitaFinita && !inAttesaClickFinePresa && !inAttesaClickAccuse && tavolo.length < modalitaGiocatori);
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
                let desc;
                if (a.tipo === 'napoli') {
                    const nomeSeme = a.seme ? getNomeSeme(a.seme) : a.dettaglio;
                    desc = TRESSETTE_LANG.napoliNome(nomeSeme, a.punti);
                } else {
                    desc = a.dettaglio.startsWith('Super') ? a.dettaglio : 'Bongioco ' + a.dettaglio;
                }
                const valNoi = a.sq === 0 ? ('+' + a.punti + ' pt') : '—';
                const valLoro = a.sq === 1 ? ('+' + a.punti + ' pt') : '—';
                righeAccuse += `
                    <div class="row-label-punti" title="${desc}">${desc}</div>
                    <div class="val-punti ${a.sq === 0 ? 'accusa-val' : ''}">${valNoi}</div>
                    <div class="val-punti ${a.sq === 1 ? 'accusa-val' : ''}">${valLoro}</div>
                `;
            });
        }

        // Totale smazzata (Carte + Accuse) - sempre presente in fondo alla relativa sezione
        const totIntNoi = carteIntNoi + accSmazz[0];
        const totStrNoi = formatVal(totIntNoi, carteRestNoi);
        const totIntLoro = carteIntLoro + accSmazz[1];
        const totStrLoro = formatVal(totIntLoro, carteRestLoro);
        const rigaTotaleSmazzata = `
            <div class="row-label-punti totale-label">${TRESSETTE_LANG.totale}</div>
            <div class="val-punti totale-val">${totStrNoi}</div>
            <div class="val-punti totale-val">${totStrLoro}</div>
        `;

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
            <div class="griglia-punti-smazzata">
                <div class="row-label-punti">${TRESSETTE_LANG.punti}</div>
                <div class="val-punti val-partita ${noiPt > loroPt ? 'in-testa' : ''}">${noiPt} pt</div>
                <div class="val-punti val-partita ${loroPt > noiPt ? 'in-testa' : ''}">${loroPt} pt</div>
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
            const isFr = (getTemaMazzoAttivo() === 'francesi');
            const notaAsso = TRESSETTE_LANG.assoSpecialeNota(isFr);

            rowsSmazzata += `
                <div class="ciapano-punti-row ${g === 0 ? 'tu' : ''}">
                    <span>${nome}</span>
                    <span>
                        <b class="ciapano-val-penalita">${parzStr}</b>
                        ${haBastoniSmazz ? `<span class="ciapano-bastoni-note">${notaAsso}</span>` : ''}
                    </span>
                </div>
            `;
        }

        pnl.innerHTML = `
            <div class="punti-main-header">
                <span>${TRESSETTE_LANG.traversone || 'TRAVERSONE'}</span>
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
        accuseSmazzata: [accuseSmazzata[0].slice(), accuseSmazzata[1].slice()],
        carteGiocateIds: Object.assign({}, carteGiocateIds),
        mazzo: mazzo ? mazzo.slice() : []
    };
    undoStack.push(snap);
    aggiornaStatoUndoUI();
}

function annullaMossa() {
    if (undoStack.length === 0 || partitaFinita || inAttesaClickAccuse) return;
    if (animando && !inAttesaClickFinePresa) return;

    if (timerMossaAI) {
        clearTimeout(timerMossaAI);
        timerMossaAI = null;
    }

    if (inAttesaClickFinePresa) {
        inAttesaClickFinePresa = false;
        callbackIncassaPresa = null;
        const campogiocoEl = document.getElementById('campogioco');
        if (campogiocoEl) campogiocoEl.classList.remove('in-attesa-fine-presa');
        const banner = document.getElementById('banner-accusa');
        if (banner) banner.style.display = 'none';
    }

    animando = false;

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
    carteGiocateIds = snap.carteGiocateIds ? Object.assign({}, snap.carteGiocateIds) : {};
    if (snap.mazzo) mazzo = snap.mazzo.slice();

    riproduciAudio('sounds/teck.wav');
    impostaMessaggioStato(TRESSETTE_LANG.mossaAnnullata);
    aggiornaEvidenzaTurno();
    renderTutto();
    aggiornaStatoUndoUI();
}

function aggiornaStatoUndoUI() {
    const btn = document.getElementById('btn-undo');
    if (!btn) return;
    const canUndo = (undoStack.length > 0 && !partitaFinita && !inAttesaClickAccuse && ((turno === 0 && !animando) || inAttesaClickFinePresa));
    btn.disabled = !canUndo;
}

// === STATISTICHE LOCALI ===
function caricaStatisticheTressette() {
    const k = 'tressette-stats-' + difficolta;
    try {
        let s = JSON.parse(localStorage.getItem(k));
        if (!s) s = JSON.parse(localStorage.getItem('tressette-stats-tressette'));
        if (s && typeof s.v === 'number') return s;
    } catch (e) {}
    return { v: 0, p: 0, n: 0 };
}

function salvaStatisticheTressette(s) {
    try {
        localStorage.setItem('tressette-stats-' + difficolta, JSON.stringify(s));
        localStorage.setItem('tressette-stats-tressette', JSON.stringify(s));
    } catch (e) {}
}

function caricaStatisticheCiapano() {
    const k = 'ciapano-stats-4-' + difficolta;
    try {
        let s = JSON.parse(localStorage.getItem(k));
        if (!s) s = JSON.parse(localStorage.getItem('ciapano-stats-4'));
        if (Array.isArray(s) && s.length === 4) return s;
    } catch (e) {}
    return [0, 0, 0, 0];
}

function salvaStatisticheCiapano(s) {
    try {
        localStorage.setItem('ciapano-stats-4-' + difficolta, JSON.stringify(s));
        localStorage.setItem('ciapano-stats-4', JSON.stringify(s));
    } catch (e) {}
}

function caricaStatistiche() {
    return (varianteGioco === 'ciapano') ? caricaStatisticheCiapano() : caricaStatisticheTressette();
}

function salvaStatistiche(s) {
    if (varianteGioco === 'ciapano') {
        salvaStatisticheCiapano(s);
    } else {
        salvaStatisticheTressette(s);
    }
}

function aggiornaStatistiche(esito, vincitoreG) {
    if (varianteGioco === 'ciapano') {
        const s = caricaStatisticheCiapano();
        const vincIdx = (typeof vincitoreG === 'number' && vincitoreG >= 0 && vincitoreG < 4) ? vincitoreG : 0;
        s[vincIdx] = (s[vincIdx] || 0) + 1;
        salvaStatisticheCiapano(s);
    } else {
        const s = caricaStatisticheTressette();
        if (esito === 'vinta') s.v++;
        else if (esito === 'persa') s.p++;
        else s.n++;
        salvaStatisticheTressette(s);
    }
    renderStatisticheUI();
}

function renderStatisticheUI() {
    const cont = document.getElementById('stats-righe');
    const headerTitolo = document.getElementById('stats-header-titolo');

    if (varianteGioco === 'ciapano') {
        if (headerTitolo) headerTitolo.textContent = TRESSETTE_LANG.bilancioCiapanoHeader || 'BILANCIO (4 GIOCATORI)';
        if (cont) {
            if (!nomiGiocatori || nomiGiocatori.length < 4) {
                scegliNomi();
            }
            const s = caricaStatisticheCiapano();
            let rowsHtml = '';
            for (let g = 0; g < 4; g++) {
                const nomeG = (g === 0 ? TRESSETTE_LANG.tu : (nomiGiocatori[g] ? nomiGiocatori[g].nome : 'P' + g));
                const winCount = s[g] || 0;
                const winUnit = (window.currentLang === 'en')
                    ? (winCount === 1 ? 'win' : 'wins')
                    : (winCount === 1 ? 'vinta' : 'vinte');
                rowsHtml += `
                    <div class="ciapano-stat-riga ${g === 0 ? 'tu' : ''}">
                        <span class="ciapano-stat-nome">${nomeG}</span>
                        <span class="ciapano-stat-val">${winCount} <span class="ciapano-stat-unit">${winUnit}</span></span>
                    </div>
                `;
            }
            cont.innerHTML = `<div class="ciapano-stats-lista">${rowsHtml}</div>`;
        }
    } else {
        if (headerTitolo) headerTitolo.textContent = TRESSETTE_LANG.bilancio || 'BILANCIO';
        if (cont) {
            const s = caricaStatisticheTressette();
            cont.innerHTML = `
                <div class="info-blocco">
                    <div class="info-label">${TRESSETTE_LANG.vinte}</div>
                    <div class="stat-valore" id="stat-vinte" style="color: #7fe07f;">${s.v}</div>
                </div>
                <div class="info-blocco">
                    <div class="info-label">${TRESSETTE_LANG.perse}</div>
                    <div class="stat-valore" id="stat-perse" style="color: #ff8f8f;">${s.p}</div>
                </div>
                <div class="info-blocco">
                    <div class="info-label">${TRESSETTE_LANG.patte}</div>
                    <div class="stat-valore" id="stat-patte" style="color: #ffd700;">${s.n}</div>
                </div>
            `;
        }
    }
}

function resetStatistiche() {
    if (!confirm(TRESSETTE_LANG.resetChiedi)) return;
    if (varianteGioco === 'ciapano') {
        salvaStatisticheCiapano([0, 0, 0, 0]);
    } else {
        salvaStatisticheTressette({ v: 0, p: 0, n: 0 });
    }
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

    // Aggiorna nomi delle accuse in corso se cambia mazzo
    accuseSmazzata.forEach(coppia => {
        coppia.forEach(a => {
            if (a.tipo === 'napoli' && a.seme) {
                const ns = getNomeSeme(a.seme, tema);
                a.dettaglio = ns;
                a.nome = TRESSETTE_LANG.napoliNome(ns, a.punti);
            }
        });
    });
    codaAccuseDaMostrare.forEach(a => {
        if (a.tipo === 'napoli' && a.seme) {
            const ns = getNomeSeme(a.seme, tema);
            a.dettaglio = ns;
            a.nome = TRESSETTE_LANG.napoliNome(ns, a.punti);
        }
    });

    aggiornaTestoOpzioneAssoBastoni();
    renderTutto();
}

function aggiornaTestoOpzioneAssoBastoni() {
    const lbl = document.getElementById('lbl-gruppo-bastoni') || document.querySelector('#gruppo-opz-bastoni .opzione-label');
    const txt = document.getElementById('lbl-asso-bastoni-testo');
    const isFr = (getTemaMazzoAttivo() === 'francesi');
    if (window.currentLang === 'en') {
        if (lbl) lbl.textContent = isFr ? 'Ace of Spades rule in Traversone:' : 'Ace of Batons rule in Traversone:';
        if (txt) txt.textContent = isFr ? 'Ace of Spades penalty (+11 pt)' : 'Ace of Batons penalty (+11 pt)';
    } else {
        if (lbl) lbl.textContent = isFr ? 'Regola Asso di Picche nel Traversone:' : 'Regola Asso di Bastoni nel Traversone:';
        if (txt) txt.textContent = isFr ? 'Asso di Picche penalità (+11 pt)' : 'Asso di Bastoni penalità (+11 pt)';
    }
    const btn = document.getElementById('btn-asso-bastoni');
    if (btn) btn.textContent = isFr ? (window.currentLang === 'en' ? 'ACE OF SPADES PENALTY (+11 pt)' : 'ASSO DI PICCHE PENALITÀ (+11 pt)') : (window.currentLang === 'en' ? 'ACE OF BATONS PENALTY (+11 pt)' : 'ASSO DI BASTONI PENALITÀ (+11 pt)');
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
    caricaOpzioniSalvate();
    aggiornaTestoOpzioneAssoBastoni();
    apriModale('modale-inizio');
}

function richiediNuovaPartita() {
    // Partita conclusa: il reload rinnova pubblicità, interstitial e statistiche
    if (partitaFinita) {
        try { sessionStorage.removeItem('tressette-partita-in-corso'); } catch (e) {}
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
    try { localStorage.setItem('tressette-variante', v); } catch (e) {}
    document.querySelectorAll('[data-opt-variante]').forEach(b => {
        b.classList.toggle('attiva', b.getAttribute('data-opt-variante') === v);
    });
    // Mostra/nascondi opzioni specifiche Ciapanò o Accuse Tressette
    const grpBastoni = document.getElementById('gruppo-opz-bastoni');
    const grpAccuse = document.getElementById('gruppo-opz-accuse');
    if (grpBastoni) grpBastoni.style.display = (v === 'ciapano' ? 'block' : 'none');
    if (grpAccuse) grpAccuse.style.display = (v === 'tressette' ? 'block' : 'none');
    aggiornaTitoloGioco();
    renderStatisticheUI();
}

function selezionaModalita(n) {
    modalitaGiocatori = n;
    try { localStorage.setItem('tressette-modalita', n); } catch (e) {}
    document.querySelectorAll('[data-opt-modalita]').forEach(b => {
        b.classList.toggle('attiva', parseInt(b.getAttribute('data-opt-modalita'), 10) === n);
    });
}

function selezionaDifficolta(d) {
    difficolta = d;
    try { localStorage.setItem('tressette-difficolta', d); } catch (e) {}
    document.querySelectorAll('[data-opt-diff]').forEach(b => {
        b.classList.toggle('attiva', b.getAttribute('data-opt-diff') === d);
    });
    renderStatisticheUI();
}

function selezionaTarget(t) {
    targetPunti = parseInt(t, 10);
    try { localStorage.setItem('tressette-target', targetPunti); } catch (e) {}
    document.querySelectorAll('[data-opt-target]').forEach(b => {
        b.classList.toggle('attiva', parseInt(b.getAttribute('data-opt-target'), 10) === targetPunti);
    });
}

function toggleAssoBastoni(val) {
    if (typeof val === 'boolean') {
        assoBastoniSpeciale = val;
    } else {
        assoBastoniSpeciale = !assoBastoniSpeciale;
    }
    try { localStorage.setItem('tressette-asso-bastoni', assoBastoniSpeciale ? 'true' : 'false'); } catch (e) {}
    const chk = document.getElementById('chk-asso-bastoni');
    if (chk) chk.checked = assoBastoniSpeciale;
    const btn = document.getElementById('btn-asso-bastoni');
    if (btn) btn.classList.toggle('attiva', assoBastoniSpeciale);
}

function toggleAccuse(val) {
    if (typeof val === 'boolean') {
        accuseAttive = val;
    } else {
        accuseAttive = !accuseAttive;
    }
    try { localStorage.setItem('tressette-accuse', accuseAttive ? 'true' : 'false'); } catch (e) {}
    const chk = document.getElementById('chk-accuse');
    if (chk) chk.checked = accuseAttive;
    const btn = document.getElementById('btn-accuse');
    if (btn) btn.classList.toggle('attiva', accuseAttive);
}

function caricaOpzioniSalvate() {
    try {
        const vSalvata = localStorage.getItem('tressette-variante');
        if (vSalvata === 'ciapano' || vSalvata === 'tressette') {
            selezionaVariante(vSalvata);
        } else {
            selezionaVariante('tressette');
        }

        const tSalvato = localStorage.getItem('tressette-target');
        if (tSalvato) {
            const tNum = parseInt(tSalvato, 10);
            if ([21, 31, 11].includes(tNum)) {
                selezionaTarget(tNum);
            }
        } else {
            selezionaTarget(21);
        }

        const accSalvate = localStorage.getItem('tressette-accuse');
        if (accSalvate !== null) {
            accuseAttive = (accSalvate === 'true');
        } else {
            accuseAttive = false;
        }
        const chkAcc = document.getElementById('chk-accuse');
        if (chkAcc) chkAcc.checked = accuseAttive;
        const btnAcc = document.getElementById('btn-accuse');
        if (btnAcc) btnAcc.classList.toggle('attiva', accuseAttive);

        const bastoniSalvati = localStorage.getItem('tressette-asso-bastoni');
        if (bastoniSalvati !== null) {
            assoBastoniSpeciale = (bastoniSalvati === 'true');
        } else {
            assoBastoniSpeciale = false;
        }
        const chkBast = document.getElementById('chk-asso-bastoni');
        if (chkBast) chkBast.checked = assoBastoniSpeciale;
        const btnBast = document.getElementById('btn-asso-bastoni');
        if (btnBast) btnBast.classList.toggle('attiva', assoBastoniSpeciale);
    } catch (e) {
        console.warn('Errore lettura opzioni salvate:', e);
    }
}

function confermaEAvviaPartita() {
    try {
        localStorage.setItem('tressette-variante', varianteGioco);
        localStorage.setItem('tressette-target', targetPunti);
        localStorage.setItem('tressette-accuse', accuseAttive ? 'true' : 'false');
        localStorage.setItem('tressette-asso-bastoni', assoBastoniSpeciale ? 'true' : 'false');
    } catch (e) {}
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
    addEv('btn-si-termina', 'click', function () {
        try { sessionStorage.removeItem('tressette-partita-in-corso'); } catch (e) {}
        location.reload();
    });
    addEv('btn-undo', 'click', function (e) { e.stopPropagation(); annullaMossa(); });
    addEv('btn-scoperte', 'click', toggleScoperte);
    addEv('btn-mazzo', 'click', cambiaMazzo);
    addEv('btn-reset-stats', 'click', resetStatistiche);

    // Click ovunque per avanzare la dichiarazione di accuse o per depositare le carte a fine presa
    document.addEventListener('click', (e) => {
        if (inAttesaClickAccuse) {
            if (e.target.closest('button, a, .lang-switch-header, .form-tressette')) return;
            mostraProssimaAccusa();
            return;
        }
        if (inAttesaClickFinePresa && typeof callbackIncassaPresa === 'function') {
            if (e.target.closest('button, a, .lang-switch-header, .form-tressette')) return;
            callbackIncassaPresa();
        }
    });

    if (!nomiGiocatori || nomiGiocatori.length < 4) {
        scegliNomi();
    }
    renderStatisticheUI();

    // Ripristino partita da sessionStorage (reload tra smazzate per refresh banner pubblicitari)
    const salvata = sessionStorage.getItem('tressette-partita-in-corso');
    if (salvata) {
        sessionStorage.removeItem('tressette-partita-in-corso');
        try {
            const s = JSON.parse(salvata);
            smazzataNumero = s.smazzataNumero || 1;
            puntiTorneo = s.puntiTorneo || [0, 0];
            totaleCarteTorneo = s.totaleCarteTorneo || [0, 0];
            totaleAccuseTorneo = s.totaleAccuseTorneo || [0, 0];
            penalitaCarteTorneo = s.penalitaCarteTorneo || [0, 0, 0, 0];
            penalitaSpecialiTorneo = s.penalitaSpecialiTorneo || [0, 0, 0, 0];
            targetPunti = s.targetPunti || 21;
            varianteGioco = s.varianteGioco || 'tressette';
            modalitaGiocatori = s.modalitaGiocatori || 4;
            difficolta = s.difficolta || 'difficile';
            if (s.nomiGiocatori && s.nomiGiocatori.length) nomiGiocatori = s.nomiGiocatori;
            assoBastoniSpeciale = !!s.assoBastoniSpeciale;
            accuseAttive = !!s.accuseAttive;
            window._modalita4 = (modalitaGiocatori === 4);

            aggiornaTitoloGioco();
            chiudiModali();
            iniziaNuovaSmazzata();

            window.addEventListener('resize', posizionaAvatarDinamici);
            if (typeof window.registerLayoutResizeListener === 'function') {
                window.registerLayoutResizeListener(() => {
                    posizionaAvatarDinamici();
                });
            }
            return;
        } catch (e) {
            console.warn('Errore ripristino partita da sessionStorage:', e);
        }
    }

    apriModaleInizio();

    window.addEventListener('resize', posizionaAvatarDinamici);
    if (typeof window.registerLayoutResizeListener === 'function') {
        window.registerLayoutResizeListener(() => {
            posizionaAvatarDinamici();
        });
    }
}
