'use strict';

// ============================================================================
// BURRACO - Gioco di carte italiano
// Versione 3.0 - Riscrittura completa
// Supporta 1v1 e 2v2
//
// FILE: burraco-core.js
// Costanti, Classi, Stato del gioco
// ============================================================================

// ============================================================================
// I18N - Internazionalizzazione
// ============================================================================

const burracoTranslations = {
    it: {
        // UI Labels
        'label-noi': 'Noi',
        'label-loro': 'Loro',
        'label-pozzetto': 'Pozzetto',
        'label-burraco': 'Burraco',
        'label-carte': 'carte',
        'label-scala': 'scala',
        'label-tris': 'tris',
        'label-totale': 'Totale',
        'label-scarti': 'Scarti',
        'label-giocatore': 'Giocatore',
        'btn-istruzioni': 'ISTRUZIONI',
        'btn-nuova': 'NUOVA',
        'btn-scoperte': 'SCOPERTE',
        'modal-nuova-titolo': 'Nuova Partita',
        'label-modalita': "Modalita':",
        'label-compagno-desc': 'con compagno',
        'label-tipo-partita': 'Tipo partita:',
        'label-mano-singola': 'Mano singola',
        'label-partita-punti': 'Partita a punti fino a:',
        'label-limite-custom': 'Personalizzata...',
        'label-limite-pers': 'Limite personalizzato:',
        'btn-inizia': 'INIZIA',
        'modal-vittoria-titolo': 'HAI VINTO!',
        'label-complimenti': 'Complimenti!',
        'label-punteggio-finale': 'Punteggio finale:',
        'btn-nuova-partita': 'NUOVA PARTITA',
        'modal-sconfitta-titolo': 'HAI PERSO',
        'label-peccato': 'Peccato!',

        // Messaggi di gioco
        'msg-pesca-scarto': 'Pescare prima di scartare',
        'msg-pesca-attacco': 'Pescare prima di attaccare',
        'msg-scarto-vietato': 'Non puoi scartare la carta appena pescata dagli scarti',
        'msg-serve-burraco': 'Serve almeno un burraco per chiudere',
        'msg-mazzo-quasi-finito': 'Mazzo quasi esaurito! Ultimo turno!',
        'msg-pop-bloccato': 'Popup bloccato! Abilita i popup per questo sito.',
        
        // Titoli Vittoria/Sconfitta (da game.js)
        'titolo-vinto-partita': 'HAI VINTO LA PARTITA!',
        'titolo-perso-partita': 'HAI PERSO LA PARTITA',
        'titolo-vinto': 'HAI VINTO!',
        'titolo-perso': 'HAI PERSO',
        
        // Punteggi
        'info-torneo': 'partita a {limite} - mano {mano}',
        'mano-vinta': 'Mano vinta',
        'mano-persa': 'Mano persa',
        'torneo-vinto-sub': 'Torneo completato con successo!',
        'torneo-perso-sub': 'Torneo perso, riprova!',
        'msg-mazzo-finito-no-bonus': 'Mazzo esaurito - nessun bonus chiusura',
        'btn-vedi-carte': 'VEDI CARTE',
        'punti-carte-campo': 'Punti carte in campo',
        'burraco-pulito': 'Burraco pulito',
        'burraco-semipulito': 'Burraco semipulito',
        'burraco-sporco': 'Burraco sporco',
        'nessun-burraco': 'Nessun burraco',
        'bonus-chiusura': 'Bonus chiusura',
        'carte-in-mano': 'Carte in mano',
        'pozzetto-non-preso-label': 'Pozzetto non preso',
        'msg-scarti-nota': "Ho aggiornato l'algoritmo di gioco, dovrebbe essere migliorato<br>Certamente non è finito, ma fatemi sapere cosa ne pensate!",
        'label-privacy': 'Privacy Policy',
        'label-gestisci-cookie': 'Gestisci Cookie',
        'label-chi-sono': 'Chi Sono',
        'label-1v1': '1 vs 1 (in arrivo)',
        'label-2v2': '2 vs 2',
        'label-mazziere': 'Mazziere',
        'btn-prossima-mano': 'PROSSIMA MANO',
        'btn-abbandona': 'ABBANDONA',
        'label-mazziere-e': 'Mazziere:'
    },
    en: {
        // UI Labels
        'label-noi': 'Us',
        'label-loro': 'Them',
        'label-pozzetto': 'Pot',
        'label-burraco': 'Burraco',
        'label-carte': 'cards',
        'label-scala': 'sequence',
        'label-tris': 'set',
        'label-totale': 'Total',
        'label-scarti': 'Discard',
        'label-giocatore': 'Player',
        'btn-istruzioni': 'RULES',
        'btn-nuova': 'NEW',
        'btn-scoperte': 'FACE UP',
        'modal-nuova-titolo': 'New Game',
        'label-modalita': "Mode:",
        'label-compagno-desc': 'with partner',
        'label-1v1': '1 vs 1 (coming soon)',
        'label-2v2': '2 vs 2',
        'label-tipo-partita': 'Game type:',
        'label-mano-singola': 'Single hand',
        'label-partita-punti': 'Points game up to:',
        'label-limite-custom': 'Custom...',
        'label-limite-pers': 'Custom limit:',
        'btn-inizia': 'START',
        'modal-vittoria-titolo': 'YOU WON!',
        'label-complimenti': 'Congratulations!',
        'label-punteggio-finale': 'Final score:',
        'btn-nuova-partita': 'NEW GAME',
        'modal-sconfitta-titolo': 'YOU LOST',
        'label-peccato': 'Bad luck!',

        // Game Messages
        'msg-pesca-scarto': 'Draw before discarding',
        'msg-pesca-attacco': 'Draw before playing',
        'msg-scarto-vietato': 'You cannot discard the card you just drew from the discard pile',
        'msg-serve-burraco': 'You need at least one Burraco to close',
        'msg-mazzo-quasi-finito': 'Deck almost empty! Last turn!',
        'msg-pop-bloccato': 'Popup blocked! Please enable popups for this site.',
        
        // Victory/Defeat Titles (from game.js)
        'titolo-vinto-partita': 'YOU WON THE GAME!',
        'titolo-perso-partita': 'YOU LOST THE GAME',
        'titolo-vinto': 'YOU WON!',
        'titolo-perso': 'YOU LOST',
        
        // Scores
        'info-torneo': 'game to {limite} - hand {mano}',
        'mano-vinta': 'Hand won',
        'mano-persa': 'Hand lost',
        'torneo-vinto-sub': 'Tournament completed successfully!',
        'torneo-perso-sub': 'Tournament lost, try again!',
        'msg-mazzo-finito-no-bonus': 'Deck empty - no closing bonus',
        'btn-prossima-mano': 'NEXT HAND',
        'btn-abbandona': 'ABANDON',
        'label-mazziere-e': 'Dealer:',
        'btn-vedi-carte': 'SEE CARDS',
        'punti-carte-campo': 'Points cards on table',
        'burraco-pulito': 'Clean Burraco',
        'burraco-semipulito': 'Semi-clean Burraco',
        'burraco-sporco': 'Dirty Burraco',
        'nessun-burraco': 'No Burraco',
        'bonus-chiusura': 'Closing bonus',
        'carte-in-mano': 'Cards in hand',
        'pozzetto-non-preso-label': 'Pot not taken',
        'msg-scarti-nota': "I've updated the game algorithm, it should be improved.<br>It's certainly not finished, but let me know what you think!",
        'label-privacy': 'Privacy Policy',
        'label-gestisci-cookie': 'Manage Cookies',
        'label-chi-sono': 'About Me',
        'label-mazziere': 'Dealer'
    }
};

window.currentLang = window.currentLang || 'it';

window.t = function(key) {
    if (!burracoTranslations[window.currentLang]) return key;
    return burracoTranslations[window.currentLang][key] || key;
};

const SEMI = ['C', 'Q', 'F', 'P']; // Cuori, Quadri, Fiori, Picche
const NOMI_SEMI = { C: 'Cuori', Q: 'Quadri', F: 'Fiori', P: 'Picche', J: 'Jolly' };
const VALORI_SEMI = { F: 0, Q: 1, C: 2, P: 3, J: 4 };

// Dimensioni carta nello sprite originale (conjollyplus.png)
const CARTA_W = 71;
const CARTA_H = 96;
const SPRITE_W = 1233;  // 71 * 17 colonne + qualcosa
const SPRITE_H = 384;   // 96 * 4 righe

// Tipi di combinazione
const TIPO_TRIS = 1;
const TIPO_SCALA = 2;

// Punti carte
const PUNTI_CARTE = {
    1: 15,  // Asso
    2: 20,  // Pinella (può essere usata come matta)
    3: 5, 4: 5, 5: 5, 6: 5, 7: 5,
    8: 10, 9: 10, 10: 10, 11: 10, 12: 10, 13: 10,
    50: 30, 51: 30  // Jolly
};

// Punti burraco
const PUNTI_BURRACO_PULITO = 200;      // 7+ carte naturali (senza matte o pinella al posto naturale)
const PUNTI_BURRACO_SEMIPULITO = 150;  // 7+ carte naturali + 1 matta all'estremità
const PUNTI_BURRACO_SPORCO = 100;      // 7+ carte con matta all'interno o ovunque
const PUNTI_CHIUSURA = 100;

// Azioni per storia
const AZIONE_PESCA_MAZZO = 1;
const AZIONE_PESCA_SCARTI = 2;
const AZIONE_SCARTO = 3;
const AZIONE_COMBINAZIONE = 4;
const AZIONE_ATTACCO = 5;
const AZIONE_POZZETTO = 6;

// Obiettivi strategici AI
// Immediati (focus turno corrente)
const OBJ_BURRACO_EXTEND = 1;     // Estendi combo esistente a burraco
const OBJ_POZZETTO_RUSH = 2;      // Forza calate per raggiungere pozzetto
const OBJ_BLOCCO_AVVERSARIO = 3;  // Blocca progressi avversari
const OBJ_MANO_PULIZIA = 4;       // Pulisci mano da carte inutili
// Setup/Futuri (payoff successivo)
const OBJ_SETUP_BURRACO = 5;      // Prepara per burraco futuro
const OBJ_SETUP_POZZETTO = 6;     // Prepara per pozzetto
const OBJ_SETUP_BLOCCO = 7;       // Prepara blocco avversario
const OBJ_SETUP_MATTA = 8;        // Gestisci/conserva matta per futuro

// ============================================================================
// PERSONAGGI PREDEFINITI
// Ogni personaggio ha coefficienti 0-10 che definiscono il suo stile di gioco
// ============================================================================

/*
 * COEFFICIENTI (tutti 0-10):
 *
 * PESCA:
 * - premioScarti: 0=raccoglie tutto, 10=solo pile grosse e utili
 * - compressione:      0=mai, 10=raccoglie sempre per togliere agli altri
 *
 * CALATA:
 * - valoreCentralita:  0=carte tutte uguali, 10=protegge 7/8/6/9 a ogni costo
 * - prefScale:         0=preferisce tris, 10=preferisce scale
 * - sogliaDeposito:    0=deposita subito, 10=accumula prima di depositare
 * - prefBurracoPulito: 0=sporco va bene, 10=aspetta il pulito
 * - parsimoniaMatte:   0=usa subito, 10=solo per chiusura/burraco
 *
 * SCARTO:
 * - prudenzaScarto:    0=scarta senza guardare, 10=analisi profonda avversari
 * - cooperazione:      0=gioca per se, 10=legge e aiuta il socio
 *
 * RUOLO E CHIUSURA:
 * - propensioAttacco:  0=difensore, 10=attaccante (va al pozzetto)
 * - frettaChiusura:    0=gioca a lungo, 10=chiude appena puo
 *
 * STRATEGIA:
 * - tendenzaControgioco: 0=ignora avversari, 10=blocca attivamente
 *
 * OSSERVAZIONE E TATTICA:
 * - memoria:           0=smemorato, 10=ricorda tutto
 * - letturaAvversario: 0=nessuna deduzione, 10=deduce la mano altrui
 * - audacia:           0=gioco ortodosso, 10=trappole e bluff
 */

const PERSONAGGI = [
    // === AGGRESSIVI (frettaChiusura alta, propensioAttacco alta) ===
    {
        id: 'giuseppe',
        nome: 'Giuseppe',
        descrizione: 'Veterano impetuoso, vuole sempre chiudere per primo',
        coefficienti: {
            premioScarti: 6, compressione: 2,
            valoreCentralita: 3, prefScale: 4, sogliaDeposito: 2,
            prefBurracoPulito: 2, parsimoniaMatte: 2,
            prudenzaScarto: 3, cooperazione: 4,
            propensioAttacco: 9, frettaChiusura: 9,
            tendenzaControgioco: 2,
            memoria: 5, letturaAvversario: 3, audacia: 6
        }
    },
    {
        id: 'rocco',
        nome: 'Rocco',
        descrizione: 'Esperto spietato, non dimentica nulla e chiude senza pieta',
        coefficienti: {
            premioScarti: 5, compressione: 3,
            valoreCentralita: 6, prefScale: 7, sogliaDeposito: 4,
            prefBurracoPulito: 4, parsimoniaMatte: 5,
            prudenzaScarto: 6, cooperazione: 5,
            propensioAttacco: 7, frettaChiusura: 7,
            tendenzaControgioco: 5,
            memoria: 10, letturaAvversario: 8, audacia: 5
        }
    },
    {
        id: 'teresa',
        nome: 'Teresa',
        descrizione: 'Aggressiva ma calcolatrice, ama pescare dagli scarti',
        coefficienti: {
            premioScarti: 2, compressione: 7,
            valoreCentralita: 5, prefScale: 5, sogliaDeposito: 3,
            prefBurracoPulito: 3, parsimoniaMatte: 3,
            prudenzaScarto: 5, cooperazione: 5,
            propensioAttacco: 8, frettaChiusura: 8,
            tendenzaControgioco: 4,
            memoria: 7, letturaAvversario: 6, audacia: 7
        }
    },

    // === DIFENSIVI (prudenzaScarto alta, propensioAttacco bassa) ===
    {
        id: 'maria',
        nome: 'Maria',
        descrizione: 'Prudente e strategica, non regala niente agli avversari',
        coefficienti: {
            premioScarti: 5, compressione: 4,
            valoreCentralita: 7, prefScale: 6, sogliaDeposito: 6,
            prefBurracoPulito: 6, parsimoniaMatte: 7,
            prudenzaScarto: 9, cooperazione: 6,
            propensioAttacco: 2, frettaChiusura: 3,
            tendenzaControgioco: 6,
            memoria: 7, letturaAvversario: 7, audacia: 2
        }
    },
    {
        id: 'antonio',
        nome: 'Antonio',
        descrizione: 'Paziente, aspetta sempre il burraco pulito',
        coefficienti: {
            premioScarti: 6, compressione: 3,
            valoreCentralita: 8, prefScale: 8, sogliaDeposito: 8,
            prefBurracoPulito: 10, parsimoniaMatte: 8,
            prudenzaScarto: 7, cooperazione: 5,
            propensioAttacco: 2, frettaChiusura: 2,
            tendenzaControgioco: 4,
            memoria: 6, letturaAvversario: 5, audacia: 1
        }
    },
    {
        id: 'lucia',
        nome: 'Lucia',
        descrizione: 'Nonna astuta, ricorda ogni carta e legge il gioco altrui',
        coefficienti: {
            premioScarti: 4, compressione: 5,
            valoreCentralita: 6, prefScale: 5, sogliaDeposito: 6,
            prefBurracoPulito: 7, parsimoniaMatte: 6,
            prudenzaScarto: 8, cooperazione: 7,
            propensioAttacco: 3, frettaChiusura: 3,
            tendenzaControgioco: 7,
            memoria: 10, letturaAvversario: 9, audacia: 4
        }
    },

    // === BILANCIATI (valori medi, nessun estremo) ===
    {
        id: 'paolo',
        nome: 'Paolo',
        descrizione: 'Giocatore solido, nessun punto debole',
        coefficienti: {
            premioScarti: 5, compressione: 3,
            valoreCentralita: 5, prefScale: 5, sogliaDeposito: 5,
            prefBurracoPulito: 5, parsimoniaMatte: 5,
            prudenzaScarto: 5, cooperazione: 5,
            propensioAttacco: 5, frettaChiusura: 5,
            tendenzaControgioco: 5,
            memoria: 5, letturaAvversario: 5, audacia: 5
        }
    },
    {
        id: 'francesca',
        nome: 'Francesca',
        descrizione: 'Equilibrata, ama le scale pulite e gioca in squadra',
        coefficienti: {
            premioScarti: 5, compressione: 3,
            valoreCentralita: 7, prefScale: 7, sogliaDeposito: 5,
            prefBurracoPulito: 8, parsimoniaMatte: 6,
            prudenzaScarto: 6, cooperazione: 8,
            propensioAttacco: 4, frettaChiusura: 4,
            tendenzaControgioco: 4,
            memoria: 6, letturaAvversario: 6, audacia: 3
        }
    },
    {
        id: 'marco',
        nome: 'Marco',
        descrizione: 'Tranquillo ma attento, segue il gioco con cura',
        coefficienti: {
            premioScarti: 5, compressione: 2,
            valoreCentralita: 5, prefScale: 5, sogliaDeposito: 4,
            prefBurracoPulito: 5, parsimoniaMatte: 5,
            prudenzaScarto: 6, cooperazione: 6,
            propensioAttacco: 5, frettaChiusura: 5,
            tendenzaControgioco: 4,
            memoria: 8, letturaAvversario: 6, audacia: 3
        }
    },

    // === OPPORTUNISTI (audacia alta, letturaAvversario alta) ===
    {
        id: 'carla',
        nome: 'Carla',
        descrizione: 'Imprevedibile, cambia tattica ogni turno',
        coefficienti: {
            premioScarti: 3, compressione: 5,
            valoreCentralita: 4, prefScale: 5, sogliaDeposito: 3,
            prefBurracoPulito: 4, parsimoniaMatte: 4,
            prudenzaScarto: 5, cooperazione: 5,
            propensioAttacco: 6, frettaChiusura: 6,
            tendenzaControgioco: 6,
            memoria: 6, letturaAvversario: 7, audacia: 9
        }
    },
    {
        id: 'sergio',
        nome: 'Sergio',
        descrizione: 'Furbo, approfitta di ogni occasione e tende trappole',
        coefficienti: {
            premioScarti: 4, compressione: 4,
            valoreCentralita: 5, prefScale: 5, sogliaDeposito: 3,
            prefBurracoPulito: 3, parsimoniaMatte: 3,
            prudenzaScarto: 5, cooperazione: 4,
            propensioAttacco: 7, frettaChiusura: 8,
            tendenzaControgioco: 5,
            memoria: 7, letturaAvversario: 7, audacia: 8
        }
    },
    {
        id: 'anna',
        nome: 'Anna',
        descrizione: 'Scaltra, legge gli avversari e adatta la strategia',
        coefficienti: {
            premioScarti: 4, compressione: 5,
            valoreCentralita: 6, prefScale: 6, sogliaDeposito: 4,
            prefBurracoPulito: 5, parsimoniaMatte: 5,
            prudenzaScarto: 7, cooperazione: 7,
            propensioAttacco: 5, frettaChiusura: 5,
            tendenzaControgioco: 7,
            memoria: 8, letturaAvversario: 10, audacia: 7
        }
    }
];

// Funzione per selezionare personaggi casuali non duplicati
function selezionaPersonaggiCasuali(numero) {
    const disponibili = [...PERSONAGGI];
    const selezionati = [];

    for (let i = 0; i < numero && disponibili.length > 0; i++) {
        const idx = Math.floor(Math.random() * disponibili.length);
        selezionati.push(disponibili.splice(idx, 1)[0]);
    }

    return selezionati;
}

// ============================================================================
// FUNZIONE GLOBALE: isCartaAttaccabileACombo
// Unica fonte di verità — usata da core.js, burraco-ui.js e popup analisi
// ============================================================================
window.isCartaAttaccabileACombo = function(carta, combo) {
    var fisiche = combo.carte.filter(function(c) { return !c.isJolly && !c.isPinella; });
    var numMatte = combo.carte.length - fisiche.length;
    if (fisiche.length === 0) return false;
    if (carta.isJolly || carta.isPinella) return numMatte === 0;
    var isTris = fisiche.every(function(c) { return c.numero === fisiche[0].numero; });
    if (isTris) return carta.numero === fisiche[0].numero;
    if (carta.seme !== fisiche[0].seme) return false;
    var nums = fisiche.map(function(c) { return c.numero; }).sort(function(a,b){ return a-b; });
    // Asso-alto: se la scala ha Asso(1) con carte ≥10 (es. QF KF AF), l'Asso vale 14
    if (nums[0] === 1 && nums.some(function(n){ return n >= 10; })) {
        nums = nums.slice(1).concat([14]).sort(function(a,b){ return a-b; });
    }
    // Asso-alto: carta in mano con numero=1 vale 14 nel contesto di una scala alta
    var numCarta = carta.numero;
    if (numCarta === 1 && nums.some(function(n){ return n >= 10; })) numCarta = 14;
    // Una scala non può contenere due carte dello stesso numero
    if (nums.indexOf(numCarta) !== -1) return false;
    if (numCarta === nums[0] - 1) return true;
    if (numCarta === nums[nums.length - 1] + 1) return true;
    if (numMatte > 0) {
        for (var i = 0; i < nums.length - 1; i++) {
            if (nums[i+1] - nums[i] - 2 <= numMatte && numCarta > nums[i] && numCarta < nums[i+1]) return true;
        }
        var hasInternalGap = false;
        for (var gi = 0; gi < nums.length - 1; gi++) { if (nums[gi+1] - nums[gi] > 1) { hasInternalGap = true; break; } }
        if (!hasInternalGap) {
            if (numCarta === nums[nums.length - 1] + 2) return true;
            if (numCarta === nums[0] - 2) return true;
        }
    }
    if (numCarta === 1 && nums[nums.length - 1] === 13) return true;
    return false;
};

// ============================================================================
// CLASSE CARTA
// ============================================================================

class Carta {
    constructor(seme, numero, mazzo, id) {
        this.id = id;
        this.seme = seme;
        this.numero = numero;  // 1-13 per carte normali, 50-51 per jolly
        this.mazzo = mazzo;    // 0 o 1 (due mazzi)
        this.faceUp = false;
        this.selezionata = false;
        this.elemento = null;

        // Per combinazioni
        this.inCombinazione = false;
        this.idCombinazione = -1;

        // Per jolly usati come altra carta
        this.jollyComeSeme = null;
        this.jollycomeNumero = null;
    }

    get isJolly() {
        return this.numero >= 50;
    }

    get isPinella() {
        return this.numero === 2;
    }

    get punti() {
        return PUNTI_CARTE[this.numero] || 5;
    }

    get nome() {
        if (this.isJolly) return 'Jolly';
        const nomi = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return nomi[this.numero] + NOMI_SEMI[this.seme];
    }

    get nomeBreve() {
        if (this.isJolly) return 'Jolly';
        const nomi = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return nomi[this.numero] + this.seme;
    }

    // Calcola posizione nello sprite (come scala40)
    // Le coordinate sono per lo sprite originale 1233x384
    // Il CSS ridimensionera' automaticamente
    getSpritePosition() {
        const stepX = -71;  // larghezza carta nello sprite originale
        const stepY = -96;  // altezza carta nello sprite originale

        if (!this.faceUp) {
            // Retro carta: colonna 16
            return { x: stepX * 16, y: stepY * this.mazzo };
        }

        if (this.isJolly) {
            // Jolly: colonna 13
            const jollyRow = this.numero - 50;  // 0 o 1
            return { x: stepX * 13, y: stepY * jollyRow };
        }

        // Carte normali: colonne 0-12, righe per seme
        const col = this.numero - 1;  // A=0, 2=1, ... K=12
        const row = VALORI_SEMI[this.seme];  // F=0, Q=1, C=2, P=3
        return { x: stepX * col, y: stepY * row };
    }
}

// ============================================================================
// CLASSE COMBINAZIONE
// ============================================================================

class Combinazione {
    constructor(id, tipo, carte) {
        this.id = id;
        this.tipo = tipo;  // TIPO_TRIS o TIPO_SCALA
        this.carte = carte || [];
        this.seme = null;  // Per scale
        this.numero = null; // Per tris
    }

    get isBurraco() {
        return this.carte.length >= 7;
    }

    // Conta le matte (jolly e pinelle NON al posto naturale)
    get matteUsate() {
        return this.carte.filter((c, idx) => {
            if (c.isJolly) return true;
            if (c.isPinella) {
                // Pinella al posto naturale (posizione 2 in una scala) non conta come matta
                if (this.tipo === TIPO_SCALA || this.tipo === 'scala') {
                    // Troviamo la prima carta "ancora" sicura (non jolly, non pinella)
                    let anchorIdx = -1;
                    let anchorNum = -1;
                    for (let i = 0; i < this.carte.length; i++) {
                        const carta = this.carte[i];
                        if (!carta.isJolly && !carta.isPinella) {
                            anchorIdx = i;
                            anchorNum = carta.numero;
                            // Se è un Asso (1), determina se in questa scala vale 1 o 14
                            if (anchorNum === 1) {
                                if (i > 0 && this.carte[i - 1] && this.carte[i - 1].numero === 13) anchorNum = 14;
                                else if (i === this.carte.length - 1 && this.carte.length > 1) anchorNum = 14;
                            }
                            break;
                        }
                    }

                    if (anchorIdx !== -1) {
                        const startNum = anchorNum - anchorIdx;
                        const expectedNum = startNum + idx;
                        // Se la pinella è in posizione logica dove dovrebbe esserci il 2 fisico, è naturale
                        if (expectedNum === 2 && c.seme === this.seme) return false;

                        // Edge case Burrachi cortissimi (praticamente folli o da check progressivo) superato
                    }
                }
                return true; // Pinella usata come matta
            }
            return false;
        });
    }

    // Tipo di burraco: 'pulito', 'semipulito', 'sporco', o null se non è burraco
    get tipoBurraco() {
        if (!this.isBurraco) return null;

        const matte = this.matteUsate;
        if (matte.length === 0) return 'pulito';

        // Semipulito: esattamente 1 matta e si trova all'estremità
        if (matte.length === 1) {
            const mattaIdx = this.carte.findIndex(c => c === matte[0]);
            if (mattaIdx === 0 || mattaIdx === this.carte.length - 1) {
                return 'semipulito';
            }
        }

        return 'sporco';
    }

    get isPulito() {
        return this.tipoBurraco === 'pulito';
    }

    get isSemipulito() {
        return this.tipoBurraco === 'semipulito';
    }

    get isSporco() {
        return this.tipoBurraco === 'sporco';
    }

    get puntiBurraco() {
        switch (this.tipoBurraco) {
            case 'pulito': return PUNTI_BURRACO_PULITO;
            case 'semipulito': return PUNTI_BURRACO_SEMIPULITO;
            case 'sporco': return PUNTI_BURRACO_SPORCO;
            default: return 0;
        }
    }

    get puntiCarte() {
        return this.carte.reduce((sum, c) => sum + c.punti, 0);
    }

    get puntiTotali() {
        return this.puntiCarte + this.puntiBurraco;
    }
}

// ============================================================================
// STRATEGIA (logica decisionale AI)
// Oggetto con metodi che ricevono il giocatore come parametro
// Usa i coefficienti del personaggio (0-10) per le decisioni
// ============================================================================

const Strategia = {
    // Coefficienti di default (usati se mancano nel personaggio)
    defaultCoeff: {
        premioScarti: 5, compressione: 3,
        valoreCentralita: 5, prefScale: 5, sogliaDeposito: 5,
        prefBurracoPulito: 5, parsimoniaMatte: 5,
        prudenzaScarto: 5, cooperazione: 5,
        propensioAttacco: 5, frettaChiusura: 5,
        tendenzaControgioco: 5,
        memoria: 5, letturaAvversario: 5, audacia: 5
    },

    // Helper formattazione per UI Debug
    nomeCarta(c) {
        if (!c) return 'N/A';
        if (c.isVirtuale) return c.cartaVisualizzata || 'M';
        if (c.isJolly) return 'Jolly';
        const num = c.numero === 1 ? 'A' :
            c.numero === 11 ? 'J' :
                c.numero === 12 ? 'Q' :
                    c.numero === 13 ? 'K' : c.numero;
        return `${num}${c.seme}`;
    },

    descrizioneCarte(carte, mattaUsata = null) {
        if (!carte || carte.length === 0) return 'Vuoto';
        return carte.map(c => {
            if (mattaUsata && c.id === mattaUsata.id) return 'M';
            if (c.isJolly || c.isPinella) return 'M';
            return this.nomeCarta(c);
        }).join(' ');
    },

    // Helper per ottenere i coefficienti
    getCoeff(giocatore) {
        return giocatore.coefficienti || this.defaultCoeff;
    },

    // ========== LOG ==========

    /**
     * Logga un "pensiero" del bot (per debug/analisi)
     * @param {Giocatore} giocatore
     * @param {string} messaggio - Testo breve da mostrare nel log
     * @param {Object} dettagli - (opzionale) Dati extra per visualizzazione dettagliata cliccabile
     */
    logPensiero(giocatore, messaggio, dettagli = null) {
        if (!giocatore.osservazioni?.logStrategico) return;
        const entry = {
            turno: game.turno,
            messaggio: messaggio,
            timestamp: Date.now()
        };
        // Se ci sono dettagli, li aggiungiamo (rende la riga cliccabile nella UI)
        if (dettagli) {
            entry.dettagli = dettagli;
        }
        giocatore.osservazioni.logStrategico.push(entry);
        // Limita a ultimi 100 pensieri per performance
        if (giocatore.osservazioni.logStrategico.length > 100) {
            giocatore.osservazioni.logStrategico.shift();
        }
    },

    // ========== ANALISI MANO ==========

    // Analizza la mano e popola le osservazioni
    analizzaMano(giocatore) {
        if (!giocatore.osservazioni) return;

        const combinazioniSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;

        // Sfruttiamo il nuovo motore puro e onnicomprensivo
        const analisi = this.analizzaCarte(giocatore.carte, combinazioniSquadra);

        const oss = giocatore.osservazioni;
        oss.possibiliTris = analisi.possibiliTris;
        oss.possibiliScale = analisi.possibiliScale;
        oss.possibiliCalate = analisi.possibiliCalate;
        oss.matte = analisi.matte;

        // Trova carte morte (non usate in nessuna combinazione possibile)
        const carteUsate = new Set();
        oss.possibiliTris.forEach(t => t.carte.forEach(c => carteUsate.add(c.id)));
        oss.possibiliScale.forEach(s => s.carte.forEach(c => carteUsate.add(c.id)));
        oss.possibiliCalate.forEach(seq => {
            const arr = Array.isArray(seq) ? seq : [seq];
            arr.forEach(c => carteUsate.add(c.carta.id));
        });

        oss.carteMorte = giocatore.carte.filter(c => !carteUsate.has(c.id) && !c.isJolly && !c.isPinella);

        // Genera opzioni di gioco
        this.generaOpzioniGioco(giocatore);

        this.logPensiero(giocatore, `Analisi: ${oss.possibiliTris.length} tris, ${oss.possibiliScale.length} scale, ${oss.possibiliCalate.length} calate, ${oss.carteMorte.length} morte`);
    },

    // Trova tutte le possibili calate su combinazioni esistenti
    trovaCalate(giocatore) {
        const calate = [];
        const combinazioni = giocatore.squadra === 0 ?
            game.combinazioniNoi : game.combinazioniLoro;

        for (const carta of giocatore.carte) {
            for (const combo of combinazioni) {
                if (typeof puoAggiungereACombinazione === 'function') {
                    const posizione = puoAggiungereACombinazione(carta, combo);
                    if (posizione) {
                        calate.push({
                            carta: carta,
                            comboId: combo.id,
                            posizione: posizione, // 'inizio', 'fine', o true
                            combo: combo
                        });
                    }
                }
            }
        }

        return calate;
    },

    // Genera le opzioni di gioco combinando possibilità non conflittuali
    // Algoritmo: per ogni opzione singola, genera TUTTE le combinazioni
    // possibili guardando solo le opzioni successive (no duplicati)
    generaOpzioniGioco(giocatore, analisiCustom = null, numCarteVirtuale = null, isPostPesca = true) {
        const oss = analisiCustom || giocatore.osservazioni;
        if (!oss) return [];
        const numCarteMano = numCarteVirtuale !== null ? numCarteVirtuale : giocatore.carte.length;

        // Array di opzioni singole (base)
        const opzioniSingole = [];

        // Genera opzioni da singoli tris
        for (const tris of oss.possibiliTris) {
            const carteIds = new Set(tris.carte.map(c => c.id));
            opzioniSingole.push({
                mosse: [{ tipo: 'tris', ...tris }],
                carteUsate: carteIds,
                puntiTotali: tris.punti,
                descCarte: `T: ${this.descrizioneCarte(tris.carte, tris.mattaUsata)}`
            });
        }

        // Genera opzioni da singole scale
        for (const scala of oss.possibiliScale) {
            const carteIds = new Set(scala.carte.map(c => c.id));
            opzioniSingole.push({
                mosse: [{ tipo: 'scala', ...scala }],
                carteUsate: carteIds,
                puntiTotali: scala.punti,
                descCarte: `S${scala.seme}: ${this.descrizioneCarte(scala.carte, scala.mattaUsata)}`
            });
        }

        // Genera opzioni da calate (singole o multiple a cascata)
        for (const seqCalata of oss.possibiliCalate) {
            // Supporto retro-compatibile: garantiamo un array iterabile (che la calata sia una o n-catena)
            const seq = Array.isArray(seqCalata) ? seqCalata : [seqCalata];

            const carteIds = new Set(seq.map(c => c.carta.id));
            const puntiTotali = seq.reduce((acc, c) => acc + c.carta.punti, 0);

            // Rimappiamo l'oggetto semplice annotando l'intent "tipo: calata" per l'esecutore UI
            const mosse = seq.map(c => ({ tipo: 'calata', ...c }));
            const descCarte = seq.map(c => `C: ${this.nomeCarta(c.carta)}`).join(' + ');

            opzioniSingole.push({
                mosse: mosse,
                carteUsate: carteIds,
                puntiTotali: puntiTotali,
                descCarte: descCarte
            });
        }

        // Risultato: tutte le opzioni
        oss.opzioniGioco = [];

        // Opzione 0: Non fare nulla (solo scartare)
        oss.opzioniGioco.push({
            mosse: [],
            carteUsate: new Set(),
            puntiTotali: 0,
            descCarte: '(passa)',
            valutazione: 0.1
        });

        // Helper: verifica se due opzioni sono compatibili (non condividono carte)
        const sonoCompatibili = (opt1, opt2) => {
            for (const id of opt1.carteUsate) {
                if (opt2.carteUsate.has(id)) return false;
            }
            return true;
        };

        // Helper: combina N opzioni in una
        const combinaOpzioni = (opzioni) => {
            const mosseCombo = opzioni.flatMap(o => o.mosse);
            const carteCombo = new Set();
            opzioni.forEach(o => o.carteUsate.forEach(id => carteCombo.add(id)));
            const puntiCombo = opzioni.reduce((s, o) => s + o.puntiTotali, 0);
            const descCombo = opzioni.map(o => o.descCarte).join(' + ');

            return {
                mosse: mosseCombo,
                carteUsate: carteCombo,
                puntiTotali: puntiCombo,
                descCarte: descCombo,
                isCombinazione: opzioni.length > 1
            };
        };

        // Limite max combinazioni per evitare esplosione combinatoria
        const MAX_COMBINAZIONI = 200;
        let numCombinazioni = 0;

        const poolCarte = oss.carteOriginali || giocatore.carte;

        // Rescue Routine (ID Swap): Tenta di curare un conflitto di firme fisiche con carte identiche libere (doppioni o matte libere)
        const tentaSwapID = (optDaAggiungere, carteGiaUsate) => {
            let conflitti = [];
            for (const id of optDaAggiungere.carteUsate) {
                if (carteGiaUsate.has(id)) conflitti.push(id);
            }
            if (conflitti.length === 0) return optDaAggiungere; // Nessun conflitto, giocabile

            // Clona shallow dell'opzione per prepararla allo swap
            const cloneOpt = {
                ...optDaAggiungere,
                mosse: optDaAggiungere.mosse.map(m => {
                    const mossaClone = { ...m };
                    if (m.carte) mossaClone.carte = [...m.carte];
                    return mossaClone;
                }),
                carteUsate: new Set(optDaAggiungere.carteUsate)
            };

            const carteLibere = poolCarte.filter(c => !carteGiaUsate.has(c.id) && !cloneOpt.carteUsate.has(c.id));

            for (const idConflitto of conflitti) {
                const cartaConflitto = poolCarte.find(c => c.id === idConflitto);
                if (!cartaConflitto) return null; // Safe fallback

                let idxSost = -1;
                if (cartaConflitto.isJolly || cartaConflitto.isPinella) {
                    idxSost = carteLibere.findIndex(c => c.isJolly || c.isPinella); // Tappiamo con altra Matta
                } else {
                    idxSost = carteLibere.findIndex(c => c.numero === cartaConflitto.numero && c.seme === cartaConflitto.seme); // Cerchiamo una Faccia Gemella (es. altro 10 cuori)
                }

                if (idxSost !== -1) {
                    const cartaSostitutiva = carteLibere[idxSost];
                    carteLibere.splice(idxSost, 1); // Rimuoviamo la carta dalle libere

                    cloneOpt.carteUsate.delete(idConflitto);
                    cloneOpt.carteUsate.add(cartaSostitutiva.id);

                    // Riversiamo il clone fisico aggiornato nei rami delle mosse
                    for (let mossa of cloneOpt.mosse) {
                        if (mossa.carte) {
                            const idxC = mossa.carte.findIndex(c => c.id === idConflitto);
                            if (idxC !== -1) mossa.carte[idxC] = cartaSostitutiva;
                        } else if (mossa.carta && mossa.carta.id === idConflitto) {
                            mossa.carta = cartaSostitutiva;
                        }
                        if (mossa.mattaUsata && mossa.mattaUsata.id === idConflitto) {
                            mossa.mattaUsata = cartaSostitutiva;
                        }
                    }
                } else {
                    // ==========================================
                    // PIANO B: DYNAMIC SHRINKING TRIS
                    // Se lo swap fallisce, controlla se la carta contesa
                    // può essere semplicemente Dimenticata (accorciando il Tris)
                    // ==========================================
                    let mossaSalvabile = false;

                    for (let m = 0; m < cloneOpt.mosse.length; m++) {
                        let mossa = cloneOpt.mosse[m];
                        // Lo Shrinking Logico si applica solo ai TRIS estesi che subiscono una potatura
                        if (mossa.tipo === 'tris' && mossa.carte) {
                            const idxC = mossa.carte.findIndex(c => c.id === idConflitto);
                            if (idxC !== -1) {
                                const cartaMorta = mossa.carte[idxC];
                                // Simuliamo la potatura della carta contesa
                                const carteFuture = [...mossa.carte];
                                carteFuture.splice(idxC, 1);

                                // Se dopo lo spoglio il Tris si regge autonomo (>= 3 carte), si SALVA!
                                if (carteFuture.length >= 3) {
                                    mossaSalvabile = true;
                                    mossa.carte = carteFuture;

                                    // Sistemo l'eventuale decurtazione Matta
                                    if (mossa.mattaUsata && mossa.mattaUsata.id === idConflitto) {
                                        mossa.usaMatta = false;
                                        mossa.mattaUsata = null;
                                    }

                                    // Aggiorno i punti di pertinenza
                                    mossa.punti -= cartaMorta.punti;
                                    cloneOpt.puntiTotali -= cartaMorta.punti;
                                    cloneOpt.carteUsate.delete(idConflitto);

                                    break; // Esce dalla scansione mosse, avendo curato il conflitto ID
                                }
                            }
                        }
                    }

                    if (!mossaSalvabile) {
                        return null; // Impossibile sanare e impossibile rimpicciolire: opzione disidratata, cestiniamola.
                    }
                }
            }
            return cloneOpt;
        };

        // Genera TUTTE le combinazioni non conflittuali
        // Per ogni indice di partenza, genera tutti i subset validi guardando solo avanti
        const generaCombinazioni = (startIdx, opzioniCorrenti) => {
            if (numCombinazioni >= MAX_COMBINAZIONI) return;

            if (opzioniCorrenti.length > 0) {
                const combo = combinaOpzioni(opzioniCorrenti);
                const evalObj = this.valutaOpzione(giocatore, combo.mosse, combo.carteUsate, numCarteMano);
                combo.valutazione = evalObj.punteggio;
                combo.breakdown = evalObj.breakdown;
                combo.puntiTavoloCalcolati = evalObj.puntiTotali;
                oss.opzioniGioco.push(combo);
                numCombinazioni++;
            }

            const carteGiaUsate = new Set();
            opzioniCorrenti.forEach(o => o.carteUsate.forEach(id => carteGiaUsate.add(id)));

            // Pre-calcola le posizioni calata già occupate (comboId+numero) nelle opzioni correnti
            const posizioniCalataUsate = new Set();
            opzioniCorrenti.forEach(o => {
                if (o.mosse) o.mosse.forEach(m => {
                    if (m.tipo === 'calata' && m.carta) posizioniCalataUsate.add(m.comboId + ':' + m.carta.numero);
                });
            });

            for (let i = startIdx; i < opzioniSingole.length; i++) {
                if (numCombinazioni >= MAX_COMBINAZIONI) break;

                const nuovaOpt = opzioniSingole[i];

                // Verifica che le calate della nuova opzione non occupino posizioni già usate
                let calataConflitto = false;
                if (nuovaOpt.mosse) {
                    for (const m of nuovaOpt.mosse) {
                        if (m.tipo === 'calata' && m.carta && posizioniCalataUsate.has(m.comboId + ':' + m.carta.numero)) {
                            calataConflitto = true;
                            break;
                        }
                    }
                }
                if (calataConflitto) continue;

                // Verifica che le calate sullo stesso combo scala siano valide insieme
                // (es. singola1=[6P,4P→combo] con pinella a 5P + singola2=[JP→combo] con pinella a 10P = invalido)
                if (nuovaOpt.mosse && typeof verificaCombinazione === 'function') {
                    const calateNuovePerCombo = {};
                    nuovaOpt.mosse.forEach(m => {
                        if (m.tipo === 'calata' && m.carta && m.combo && m.combo.tipo === TIPO_SCALA)
                            (calateNuovePerCombo[m.comboId] = calateNuovePerCombo[m.comboId] || { combo: m.combo, carte: [] }).carte.push(m.carta);
                    });
                    for (const [cid, info] of Object.entries(calateNuovePerCombo)) {
                        const carteEsist = [];
                        opzioniCorrenti.forEach(o => { if (o.mosse) o.mosse.forEach(em => {
                            if (em.tipo === 'calata' && em.carta && String(em.comboId) === cid) carteEsist.push(em.carta);
                        }); });
                        if (carteEsist.length === 0) continue;
                        if (!verificaCombinazione([...info.combo.carte, ...carteEsist, ...info.carte]).valida) { calataConflitto = true; break; }
                    }
                }
                if (calataConflitto) continue;

                // Tentiamo il match o lo Swap (Rescue Routine)
                const optRisolta = tentaSwapID(nuovaOpt, carteGiaUsate);

                if (optRisolta) {
                    // Ricorsione: aggiungi la versione compatibile e continua in profondità
                    generaCombinazioni(i + 1, [...opzioniCorrenti, optRisolta]);
                }
            }
        };

        // Genera partendo da ogni indice
        for (let i = 0; i < opzioniSingole.length; i++) {
            if (numCombinazioni >= MAX_COMBINAZIONI) break;
            generaCombinazioni(i + 1, [opzioniSingole[i]]);
        }

        // =========================================================
        // SECONDO PASS: augmentazione delle opzioni già generate
        // Per ogni opzione combinata, prova ad aggiungere singole non
        // ancora incluse — usando tentaSwapID con PIANO B già incorporato.
        // Cattura casi come "scala usa KC, tris_K parziale [KF,KP,KQ] salvabile".
        // =========================================================
        const MAX_AUGMENTAZIONI = 100;
        let numAugmentazioni = 0;
        const opzioniBase = [...oss.opzioniGioco]; // snapshot prima del secondo pass
        for (const opt of opzioniBase) {
            if (opt.carteUsate.size === 0) continue; // skip opzione "passa"
            for (const singola of opzioniSingole) {
                if (numAugmentazioni >= MAX_AUGMENTAZIONI) break;
                // Salta se tutte le carte della singola sono già usate (inclusa completamente)
                const tutteUsate = [...singola.carteUsate].every(id => opt.carteUsate.has(id));
                if (tutteUsate) continue;
                // Salta se nessuna carta della singola è in conflitto (sarebbe già stata combinata nel primo pass)
                const nessunConflitto = [...singola.carteUsate].every(id => !opt.carteUsate.has(id));
                if (nessunConflitto) continue;
                // Caso interessante: conflitto parziale → tentaSwapID con PIANO B
                const optRisolta = tentaSwapID(singola, opt.carteUsate);
                if (!optRisolta) continue;
                // Verifica che la combinazione non crei due calate alla stessa posizione (comboId:numero)
                const _posOpt = new Set();
                opt.mosse.forEach(m => { if (m.tipo==='calata'&&m.carta) _posOpt.add(m.comboId+':'+m.carta.numero); });
                let _calataConflitto2 = false;
                if (optRisolta.mosse) {
                    for (const m of optRisolta.mosse) {
                        if (m.tipo==='calata'&&m.carta&&_posOpt.has(m.comboId+':'+m.carta.numero)) { _calataConflitto2=true; break; }
                    }
                }
                if (_calataConflitto2) continue;
                // Verifica che le calate sullo stesso combo scala siano valide insieme (secondo pass)
                if (optRisolta.mosse && typeof verificaCombinazione === 'function') {
                    const _calateNuovePerCombo = {};
                    optRisolta.mosse.forEach(m => {
                        if (m.tipo === 'calata' && m.carta && m.combo && m.combo.tipo === TIPO_SCALA)
                            (_calateNuovePerCombo[m.comboId] = _calateNuovePerCombo[m.comboId] || { combo: m.combo, carte: [] }).carte.push(m.carta);
                    });
                    for (const [cid, info] of Object.entries(_calateNuovePerCombo)) {
                        const _carteEsist = [];
                        opt.mosse.forEach(em => { if (em.tipo==='calata'&&em.carta&&String(em.comboId)===cid) _carteEsist.push(em.carta); });
                        if (_carteEsist.length === 0) continue;
                        if (!verificaCombinazione([...info.combo.carte, ..._carteEsist, ...info.carte]).valida) { _calataConflitto2 = true; break; }
                    }
                }
                if (_calataConflitto2) continue;
                const nuovaCombo = combinaOpzioni([opt, optRisolta]);
                const evalObj = this.valutaOpzione(giocatore, nuovaCombo.mosse, nuovaCombo.carteUsate, numCarteMano);
                nuovaCombo.valutazione = evalObj.punteggio;
                nuovaCombo.breakdown = evalObj.breakdown;
                nuovaCombo.puntiTavoloCalcolati = evalObj.puntiTotali;
                oss.opzioniGioco.push(nuovaCombo);
                numAugmentazioni++;
            }
            if (numAugmentazioni >= MAX_AUGMENTAZIONI) break;
        }

        // =========================================================
        // NUOVO FILTRO MASSIMIZZANTE (Rimozione Sottoinsiemi Logici)
        // Se un'opzione A utilizza un set di carte che è interamente
        // contenuto nel set di carte di un'opzione B (più grande), 
        // l'opzione A viene scartata per snellire l'albero.
        // =========================================================
        const isSubset = (subsetSet, supersetSet) => {
            if (subsetSet.size >= supersetSet.size) return false;
            for (let item of subsetSet) {
                if (!supersetSet.has(item)) return false;
            }
            return true;
        };

        oss.opzioniGioco = oss.opzioniGioco.filter((optCandidata, idx) => {
            if (optCandidata.carteUsate.size === 0) return true; // Salvaguardiamo il "Passo base" nudo
            const isSottomessa = oss.opzioniGioco.some((altOpt, altIdx) => {
                if (idx === altIdx) return false;
                if (!isSubset(optCandidata.carteUsate, altOpt.carteUsate)) return false;
                // Non eliminare se il candidato ha una mossa individuale più lunga dell'alt
                // (es: tris 4c non deve essere eliminato da un'opzione che usa gli stessi Fanti
                // distribuiti tra scala+tris 3c, anche se il set di carte è un sottoinsieme)
                const hasMossaPiuLunga = (optCandidata.mosse || []).some(mc => {
                    if (mc.tipo !== 'tris' && mc.tipo !== 'scala') return false;
                    const lenCand = (mc.carte || []).length;
                    const maxLenAlt = (altOpt.mosse || [])
                        .filter(ma => ma.tipo === mc.tipo)
                        .reduce((max, ma) => Math.max(max, (ma.carte || []).length), 0);
                    return lenCand > maxLenAlt;
                });
                // Non eliminare se il candidato ha una scala/tris PURA (senza matte) mentre
                // l'alternativa usa una matta per la stessa posizione — rappresentano strategie diverse
                // (es: SP: JP QP KP pura vs SP: Jolly JP QP + calata KP)
                const hasMossaPiuPura = (optCandidata.mosse || []).some(mc => {
                    if (mc.tipo !== 'tris' && mc.tipo !== 'scala') return false;
                    if (mc.usaMatta) return false; // il candidato già usa matta, non è "più puro"
                    const lenCand = (mc.carte || []).length;
                    return (altOpt.mosse || []).some(ma =>
                        ma.tipo === mc.tipo &&
                        ma.usaMatta === true &&
                        (ma.carte || []).length === lenCand &&
                        (mc.tipo !== 'scala' || ma.seme === mc.seme)
                    );
                });
                return !hasMossaPiuLunga && !hasMossaPiuPura;
            });
            return !isSottomessa;
        });

        // =========================================================
        // VALUTAZIONE OLISTICA STRATEGICA SU TUTTE LE OPZIONI (FILTRATE)
        // =========================================================
        const coeff = this.getCoeff(giocatore);
        const ruolo = this.determinaRuoloDinamico(giocatore);
        // Calcolo inline perché puoPrenderePozzetto() non era un metodo globale
        const combinazioniSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
        const puoPozzetto = !giocatore.haPozzetto && combinazioniSquadra.length > 0;

        for (let opz of oss.opzioniGioco) {
            // Clona shallow dell'osservazione pre-esistente per non sporcare il genitore
            const testAnalisi = { ...oss };
            testAnalisi.puntiDepositabili = opz.puntiTotali;
            testAnalisi.punteggioOpzioneNetto = opz.valutazione;
            testAnalisi.bonusOpzioneInterni = opz.valutazione - opz.puntiTotali;
            testAnalisi.breakdownMigliorOpzione = opz.breakdown || [];

            // Conta quanti Burrachi (Scale >= 7) genera DAVVERO QUESTA operazione
            testAnalisi.numBurraco = opz.mosse.filter(m => m.tipo === 'scala' && m.isBurraco).length;

            if (oss.carteOriginali) {
                // Calcolo vitale dei cadaveri restanti se scegliamo questa specifica mossa
                testAnalisi.carteMorte = oss.carteOriginali.filter(c => !opz.carteUsate.has(c.id) && !c.isJolly && !c.isPinella);
                testAnalisi.puntiCadaveri = testAnalisi.carteMorte.reduce((s, c) => s + c.punti, 0);
                testAnalisi.carteResidue = oss.carteOriginali.length - opz.carteUsate.size;

                // Quali e Quante Matte restano fuori dalle calate in QUESTA mossa?
                testAnalisi.matteResidue = oss.carteOriginali.filter(c => !opz.carteUsate.has(c.id) && (c.isJolly || c.isPinella));
            } else {
                // Fallback di sicurezza (non dovrebbe mai innescarsi col nuovo core)
                testAnalisi.carteMorte = [];
                testAnalisi.puntiCadaveri = 0;
                testAnalisi.carteResidue = numCarteMano - opz.carteUsate.size;
                testAnalisi.matteResidue = [];
            }

            // Applica la Scienza (Malus Cadaveri, Bonus Pozzetto Dinamico, Matte Residue calate sul Ruolo)
            const scoreGlobale = this.valutaSituazione(testAnalisi, coeff, numCarteMano, puoPozzetto, ruolo, isPostPesca);

            // Salviamo i risultati iniettandoli nell'opzione prima di passarla alla cronologia/log
            opz.valutazioneAttuale = opz.valutazione; // Conserviamo il vecchio Punteggio Tavola + Helper per UI Legacy
            opz.valoreGlobaleNetto = scoreGlobale;
            opz.breakdownGlobale = testAnalisi.scoreDettagli; // La matematica esatta che compone il Globale
        }

        // ORDINAMENTO VERO: Ordina per valore globale netto decrescente
        oss.opzioniGioco.sort((a, b) => {
            // Spareggio: a parità perfetta di punti, si mettono in cima le opzioni con più Scale (maggior potenziale)
            if (b.valoreGlobaleNetto === a.valoreGlobaleNetto) {
                const numScaleA = (a.mosse || []).filter(m => m.tipo === 'scala').length;
                const numScaleB = (b.mosse || []).filter(m => m.tipo === 'scala').length;
                return numScaleB - numScaleA;
            }
            return b.valoreGlobaleNetto - a.valoreGlobaleNetto;
        });

        // DEDUPLICAZIONE: rimuove opzioni equivalenti (stesse carte, stesse mosse in ordine diverso)
        const _chiaveOpz = (opt) => {
            const ids = [];
            if (opt.carteUsate) opt.carteUsate.forEach(id => ids.push(id));
            ids.sort();
            const mosseKeys = [];
            if (opt.mosse) {
                opt.mosse.forEach(m => {
                    if (m.tipo === 'tris' || m.tipo === 'scala') {
                        const mIds = (m.carte || []).filter(c => c).map(c => c.id).sort();
                        mosseKeys.push(m.tipo + ':' + mIds.join(','));
                    } else if (m.tipo === 'calata') {
                        const cid = m.combo ? m.combo.id : '?';
                        const mid = m.carta ? m.carta.id : '?';
                        mosseKeys.push('C:' + cid + ':' + mid);
                    }
                });
            }
            mosseKeys.sort();
            return ids.join(',') + '|' + mosseKeys.join('|');
        };
        const _viste = new Set();
        oss.opzioniGioco = oss.opzioniGioco.filter(opt => {
            const chiave = _chiaveOpz(opt);
            if (_viste.has(chiave)) return false;
            _viste.add(chiave);
            return true;
        });

        return oss.opzioniGioco;
    },

    // Valuta un'opzione di gioco (set di mosse simultanee)
    // Ritorna un punteggio assoluto in cui i "Punti Tavola" sono preponderanti,
    // e i tratti caratteriali agiscono come bonus/malus percentuali secondari.
    //
    // NOTA: questo punteggio (valutazione/valoreGlobaleNetto) viene usato SOLO per
    // ordinare e filtrare le opzioni durante generaOpzioniGioco. I valori hardcoded
    // qui dentro (+10/calata, +15 se ≥5c, +50 se burraco) NON influenzano la
    // decisione finale dell'AI, che usa invece calcolaScoreOpz() in burraco-ui.js
    // con i coefficienti configurabili (coeffScoreOpz).
    valutaOpzione(giocatore, mosse, _carteUsate, numCarteVirtuale = null) {
        const coeff = this.getCoeff(giocatore);
        const carteInMano = numCarteVirtuale !== null ? numCarteVirtuale : giocatore.carte.length;
        const breakdown = [];

        // Base: somma nuda e cruda dei punti delle combinazioni formabili
        let puntiTotali = mosse.reduce((s, m) => s + (m.punti || m.carta?.punti || 0), 0);
        let valutazione = puntiTotali;
        breakdown.push({ label: 'Punti Tavolo Base', valore: puntiTotali });

        // Bonus Scala: Flat point bonus per ogni scala
        const numScale = mosse.filter(m => m.tipo === 'scala').length;
        if (numScale > 0) {
            // Esempio: coeff.prefScale=5 -> 10 punti per scala. prefScale=10 -> 20 punti per scala.
            const bonusScale = numScale * ((coeff.prefScale || 5) * 2);
            valutazione += bonusScale;
            breakdown.push({ label: `Bonus Scale (${numScale})`, valore: bonusScale, coeff: coeff.prefScale });
        }


        // Bonus Calate pre-esistenti (ottime per svuotarsi e fare burrachi)
        let bonusCalate = 0;
        for (const m of mosse) {
            if (m.tipo === 'calata') {
                bonusCalate += 10; // Forzatura positiva
                if (m.combo) {
                    const len = m.combo.carte.length;
                    if (len === 6) bonusCalate += 50;      // Diventa Burraco! PRIORITY
                    else if (len >= 5) bonusCalate += 15;  // Si avvicina
                }
            }
        }
        if (bonusCalate > 0) {
            valutazione += bonusCalate;
            breakdown.push({ label: 'Bonus Legature Carte', valore: bonusCalate });
        }

        // Malus Deposito: Rimosso per la fase di Valutazione Preventiva Pesca.
        // L'utente ha giustamente osservato che avere combinazioni in mano è
        // sempre positivo indipendentemente dalla loro idoneità al calo immediato.
        /*
        let malusScelte = 0;
        for (const m of mosse) {
            if ((m.tipo === 'tris' || m.tipo === 'scala') && m.carte) {
                if (!this.dovrebbiDepositare(giocatore, m.carte, carteInMano)) {
                    malusScelte -= 12; // Scoraggia le aperture tristi
                }
            }
        }
        if (malusScelte < 0) {
            valutazione += malusScelte;
            breakdown.push({ label: `Malus Apertura Inopportuna`, valore: malusScelte });
        }
        */

        // Fretta Chiusura: superbonus se le mosse ci sfoltiscono brutalmente la mano
        if (coeff.frettaChiusura > 5 && carteInMano <= 6) {
            const carteUsate = new Set();
            mosse.forEach(m => m.carte?.forEach(c => carteUsate.add(c.id)));
            // Se posiamo tanta roba e restiamo con <= 2 carte, bonus gigantesco
            if ((carteInMano - carteUsate.size) <= 2) {
                const bonusFretta = (coeff.frettaChiusura * 5);
                valutazione += bonusFretta;
                breakdown.push({ label: `Bonus Rush Pozzetto/Chiusura [C:${coeff.frettaChiusura}]`, valore: bonusFretta });
            }
        }

        // Se l'operazione fa punteggio miserabile e siamo accumulatori seriali:
        if (puntiTotali < 25 && coeff.sogliaDeposito > 6) {
            const malusSoglia = -((coeff.sogliaDeposito - 6) * 5);
            valutazione += malusSoglia;
            breakdown.push({ label: `Malus Deposito Magro [C:${coeff.sogliaDeposito}]`, valore: malusSoglia });
        }

        valutazione = Math.max(0, valutazione);
        breakdown.push({ label: 'MIGLIOR OPZIONE PREVENTIVATA', subtotale: true, valore: valutazione });

        return { punteggio: valutazione, breakdown: breakdown, puntiTotali: puntiTotali };
    },

    // ========== ANALISI AVVERSARI ==========

    // Analizza la storia per capire cosa fanno gli avversari
    analizzaScartiAvversari(giocatore) {
        const coeff = this.getCoeff(giocatore);
        // Memoria: 0 = ricorda 2 carte, 10 = ricorda 12 carte
        const memoria = 2 + coeff.memoria;

        // Filtra scarti degli avversari (squadra opposta)
        const scartiAvv = game.storia.filter(m =>
            m.azione === AZIONE_SCARTO &&
            game.giocatori[m.giocatore] &&
            game.giocatori[m.giocatore].squadra !== giocatore.squadra
        );

        // Ritorna ultimi N in base alla memoria
        return scartiAvv.slice(-memoria).map(m => ({
            giocatore: m.giocatore,
            carta: tutteLeCarte[m.carta]
        }));
    },

    // Analizza pesche da scarti per dedurre cosa cercano
    analizzaPescheScarti(giocatore) {
        return game.storia.filter(m =>
            m.azione === AZIONE_PESCA_SCARTI &&
            game.giocatori[m.giocatore] &&
            game.giocatori[m.giocatore].squadra !== giocatore.squadra
        );
    },

    // ========== VALUTAZIONE PESCA (MAZZO vs SCARTI) ==========

    /**
     * Analizza un set di carte e ritorna le possibili combinazioni.
     * Funzione PURA: non modifica nessuno stato, lavora solo sui dati passati.
     *
     * @param {Carta[]} carte - Array di carte da analizzare
     * @param {Combinazione[]} combinazioniSquadra - Combinazioni esistenti della squadra
     * @returns {Object} Oggetto con tris, scale, calate possibili e carte morte
     */
    analizzaCarte(carte, combinazioniSquadra) {
        const risultato = {
            possibiliTris: [],
            possibiliScale: [],
            possibiliCalate: [],
            carteMorte: [],
            matte: [],
            migliorOpzione: null,      // La migliore combinazione di mosse
            puntiDepositabili: 0,      // Punti totali depositabili
            numBurraco: 0,             // Numero di burraco possibili
            puntiCadaveri: 0           // Punti delle carte che restano in mano
        };

        if (!carte || carte.length === 0) return risultato;

        // ===== 1. TROVA MATTE (Jolly e Pinelle) =====
        risultato.matte = carte.filter(c => c.isJolly || c.isPinella);

        // ===== 2 E 3. ESTRAZIONE ASTRATTA E MASSIMIZZATA (TRIS E SCALE) =====
        const tuttiI_Tris = [];
        const tutteLe_Scale = [];

        // Raggruppa fisicamente le carte
        const perNumero = new Map();
        const perSeme = new Map();

        carte.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perNumero.has(c.numero)) perNumero.set(c.numero, []);
                perNumero.get(c.numero).push(c);

                if (!perSeme.has(c.seme)) perSeme.set(c.seme, new Map());
                if (!perSeme.get(c.seme).has(c.numero)) perSeme.get(c.seme).set(c.numero, []);
                perSeme.get(c.seme).get(c.numero).push(c);
            }
        });

        const matte = risultato.matte;

        // Generazione Tris Estesi (Poker, 5+, ecc.)
        perNumero.forEach((carteFisiche, numero) => {
            // Tris massimale pulito (3 o più carte)
            if (carteFisiche.length >= 3) {
                tuttiI_Tris.push({
                    carte: [...carteFisiche],
                    punti: carteFisiche.reduce((s, c) => s + c.punti, 0),
                    usaMatta: false,
                    numero: numero
                });
            }
            // Tris massimale con matta (RIGOROSAMENTE solo se ho esattamente 2 carte fisiche)
            if (carteFisiche.length === 2 && matte.length > 0) {
                const matta = matte[0];
                tuttiI_Tris.push({
                    carte: [...carteFisiche, matta],
                    punti: carteFisiche.reduce((s, c) => s + c.punti, 0) + matta.punti,
                    usaMatta: true,
                    mattaUsata: matta,
                    numero: numero
                });
            }
        });

        // Generazione Scale Logiche Assemblando Tutte le Carte Fisiche Multiple
        const generaRami = (semeMap, start, end) => {
            let rami = [[]];
            for (let n = start; n <= end; n++) {
                let carteHoc = [];
                if (semeMap.has(n)) carteHoc = semeMap.get(n);
                else if (n === 14 && semeMap.has(1)) carteHoc = semeMap.get(1); // Asso Alto

                if (carteHoc.length === 0) {
                    rami.forEach(r => r.push(null));
                } else {
                    const nuoviRami = [];
                    for (const r of rami) {
                        for (const c of carteHoc) nuoviRami.push([...r, c]);
                    }
                    rami = nuoviRami;
                }
            }
            return rami;
        };

        perSeme.forEach((semeMap, seme) => {
            for (let start = 1; start <= 12; start++) {
                // Lunghezze accettabili: da 3 a 14 carte continue
                for (let end = start + 2; end <= 14; end++) {
                    const ramiFisici = generaRami(semeMap, start, end);
                    for (const ramo of ramiFisici) {
                        const numBuchi = ramo.filter(c => c === null).length;

                        // Scala Puramente Vera
                        if (numBuchi === 0) {
                            tutteLe_Scale.push({
                                carte: [...ramo],
                                punti: ramo.reduce((s, c) => s + c.punti, 0),
                                usaMatta: false,
                                seme: seme,
                                lunghezza: ramo.length
                            });
                        }
                        // Scala Tappata da 1 Matta
                        else if (numBuchi === 1 && matte.length > 0) {
                            const idx = ramo.findIndex(c => c === null);
                            const numCarteFisiche = ramo.length - numBuchi;

                            // Permessa matta appesa (in cima o in coda) SOLO se le carte fisiche sono esattamente 2
                            // (es. 4F-5F-Matta è vitale, ma 4F-5F-6F-Matta è inutile). Se è un buco interno, sempre permesso.
                            if ((idx > 0 && idx < ramo.length - 1) || numCarteFisiche === 2) {
                                const valBuco = start + idx;
                                const matta = matte[0];
                                const colmata = [...ramo];
                                colmata[idx] = matta;
                                tutteLe_Scale.push({
                                    carte: colmata,
                                    punti: colmata.reduce((s, c) => s + c.punti, 0),
                                    usaMatta: true,
                                    mattaUsata: matta,
                                    seme: seme,
                                    lunghezza: ramo.length,
                                    posizioneMatta: valBuco
                                });
                            }
                        }
                    }
                }
            }
        });

        // ===== 3a. RIMOZIONE TRASVERSALE DEI SOTTOINSIEMI FISICI =====
        // Spazziamo via "6-7-Matta" se quegli STESSI ID Formano "4-5-6-7-Matta".
        const tutteComb = [...tuttiI_Tris, ...tutteLe_Scale];
        const viste = new Set();
        const combMap = [];

        for (const c of tutteComb) {
            const ids = c.carte.map(x => x.id).sort((a, b) => a - b);
            const key = ids.join(',');
            // La dedoppiazione è fisiologica se c'è "scorrimento" della matta lungo il vagone 
            if (!viste.has(key)) {
                viste.add(key);
                combMap.push({ comb: c, ids: ids });
            }
        }

        const massimizzate = combMap.filter((cA, i, arr) => {
            return !arr.some(cB => {
                if (cB === cA) return false;
                if (cB.ids.length <= cA.ids.length) return false; // Deve divorarla
                // È A un esatto e rigido sottoinsieme ID di B? Morte.
                if (!cA.ids.every(id => cB.ids.includes(id))) return false;
                // Eccezione: se le carte extra in B sono tutte wildcard (jolly/matte),
                // non eliminare A — potrebbe servire quando il jolly è usato altrove.
                const extraCards = cB.comb.carte.filter(c => !cA.ids.includes(c.id));
                if (extraCards.every(c => c.isJolly || c.isPinella)) return false;
                return true;
            });
        }).map(item => item.comb);

        // ===== 3b. DEDUPLICA VISIVA DEI CLONI FISICI =====
        // Rimuoviamo i doppioni estetici causati da carte gemelle (es. due "10C" distinti generano varianti del medesimo tris astratto).
        // Sara' "generaOpzioniGioco" a preoccuparsi di scambiare dinamicamente gli ID equivalenti in caso di collisione.
        const firmeVisive = new Set();
        const massimizzateAstratte = massimizzate.filter(c => {
            // Estraiamo i tratti visivi (Numero + Seme), li ordiniamo per avere una firma stabile
            const facce = c.carte.map(carta => {
                if (c.usaMatta && carta.id === c.mattaUsata.id) return 'M';
                if (carta.isJolly) return 'M';
                return `${carta.numero}${carta.seme || 'J'}`;
            }).sort().join('|');
            const signature = `${c.seme ? 'scala' : 'tris'}_${facce}`;
            if (firmeVisive.has(signature)) return false; // clone visivo già censito
            firmeVisive.add(signature);
            return true;
        });

        risultato.possibiliTris = massimizzateAstratte.filter(c => !c.seme);
        risultato.possibiliScale = massimizzateAstratte.filter(c => !!c.seme);

        // ===== 4. TROVA POSSIBILI CALATE (su combinazioni esistenti) =====
        if (combinazioniSquadra && combinazioniSquadra.length > 0) {

            // Esploratore Ricorsivo: concatena attacchi successivi sbloccati da attacchi precedenti
            const esploraCalate = (comboOrigine, comboSimulata, carteDisponibili, calateCorrenti) => {
                for (let i = 0; i < carteDisponibili.length; i++) {
                    const carta = carteDisponibili[i];
                    if (carta.isJolly || carta.isPinella) continue; // Temporaneamente disabilitate le matte a cascata

                    if (typeof puoAggiungereACombinazione === 'function') {
                        const posizione = puoAggiungereACombinazione(carta, comboSimulata);
                        if (posizione) {
                            const nuovaCalata = {
                                carta: carta,
                                comboId: comboOrigine.id,
                                combo: comboOrigine,
                                punti: carta.punti
                            };

                            const nuovaSequenza = [...calateCorrenti, nuovaCalata];
                            risultato.possibiliCalate.push(nuovaSequenza);

                            // Prepariamo la combo virtuale allungata per testare un eventuale attacco di livello 2
                            const nuovaComboSimulata = {
                                id: comboSimulata.id,
                                tipo: comboSimulata.tipo,
                                carte: [...comboSimulata.carte, carta]
                                // Non importa se la matta scivola, verificaCombinazione() usata da puoAggiungere ordina e ricalcola tutto autonomamente.
                            };

                            // Togliamo la carta spesa e affondiamo nel Livello successivo
                            const rimanenti = carteDisponibili.filter(c => c.id !== carta.id);
                            esploraCalate(comboOrigine, nuovaComboSimulata, rimanenti, nuovaSequenza);
                        }
                    }
                }
            };

            for (const combo of combinazioniSquadra) {
                esploraCalate(combo, combo, carte, []);
            }
        }

        // ===== 5 e 6. TROVA MIGLIORE OPZIONE DI GIOCO (GREEDY PACKING) E CARTE MORTE =====
        // Combina tris, scale e calate per massimizzare i punti depositabili
        let tutteOpzioni = [];
        risultato.possibiliTris.forEach(t => tutteOpzioni.push({ tipo: 'tris', punti: t.punti, carte: t.carte, isBurraco: false }));
        risultato.possibiliScale.forEach(s => tutteOpzioni.push({ tipo: 'scala', punti: s.punti + (s.lunghezza >= 7 ? 200 : 0), carte: s.carte, isBurraco: s.lunghezza >= 7 }));

        risultato.possibiliCalate.forEach(seq => {
            const sequenceArray = Array.isArray(seq) ? seq : [seq];
            const sumPunti = sequenceArray.reduce((acc, c) => acc + c.carta.punti, 0);
            const carteCoinvolte = sequenceArray.map(c => c.carta);
            tutteOpzioni.push({ tipo: 'calata', punti: sumPunti, carte: carteCoinvolte, isBurraco: false });
        });

        // Ordina per punti decrescenti
        tutteOpzioni.sort((a, b) => b.punti - a.punti);

        let carteUsate = new Set();
        let puntiTotali = 0;
        let numBurraco = 0;

        for (const opz of tutteOpzioni) {
            let conflitto = false;
            for (const c of opz.carte) {
                if (carteUsate.has(c.id)) { conflitto = true; break; }
            }
            if (!conflitto) {
                // Aggiungiamo l'opzione
                for (const c of opz.carte) { carteUsate.add(c.id); }
                puntiTotali += opz.tipo === 'scala' && opz.isBurraco ? (opz.punti - 200) : opz.punti;
                if (opz.isBurraco) numBurraco++;
                if (!risultato.migliorOpzione) risultato.migliorOpzione = opz;
            }
        }

        // Calcola carte morte (scarti puri) dopo aver ottimizzato la calata
        risultato.carteMorte = carte.filter(c => !carteUsate.has(c.id) && !c.isJolly && !c.isPinella);
        risultato.puntiCadaveri = risultato.carteMorte.reduce((s, c) => s + c.punti, 0);

        risultato.numBurraco = numBurraco;
        risultato.puntiDepositabili = puntiTotali;

        // Salvataggio per calcoli Olistici successivi in generaOpzioniGioco
        risultato.carteOriginali = carte;

        return risultato;
    },

    /**
     * Valuta una situazione di gioco e ritorna un punteggio.
     * Usata per confrontare "prima pesca" vs "dopo pesca scarti".
     *
     * @param {Object} analisi - Risultato di analizzaCarte()
     * @param {Object} coeff - Coefficienti del personaggio
     * @param {number} numCarteInMano - Numero totale di carte in mano
     * @param {boolean} puoPozzetto - Se può prendere il pozzetto
     * @param {string} ruolo - Ruolo dinamico dell'IA (Attaccante, Difensore, Neutro)
     * @param {boolean} isPostPesca - Se la mano ha lo scarto assicurato (-1 zavorra)
     * @returns {number} Punteggio della situazione
     */
    valutaSituazione(analisi, coeff, numCarteInMano, puoPozzetto, ruolo = 'neutro', isPostPesca = true) {
        let punteggio = 0;

        // ===== GUADAGNI =====

        // 1. Punti depositabili (base fisica carte)
        punteggio += analisi.punteggioOpzioneNetto !== undefined ? analisi.punteggioOpzioneNetto : analisi.puntiDepositabili;

        // 2. Bonus burraco (pesato su prefBurracoPulito)
        const pesoBurraco = 150 + (coeff.prefBurracoPulito * 10);
        punteggio += analisi.numBurraco * pesoBurraco;

        // 3. Bonus pozzetto Dinamico a gradoni
        let bonusPozzettoApplicato = 0;
        let coeffPozzettoUsato = '-';
        if (puoPozzetto) {
            const carteResidue = analisi.carteResidue !== undefined ? analisi.carteResidue : numCarteInMano;
            let scalare = 0;
            if (carteResidue <= 0) scalare = 450;
            else if (carteResidue <= 2) scalare = 250;

            if (scalare > 0) {
                // Modulazione su propensioAttacco (5 = base)
                const prop = coeff.propensioAttacco || 5;
                const modAttacco = 1 + (prop - 5) * 0.05; // +/- 5% per tick
                scalare = scalare * modAttacco;

                if (ruolo === 'DIFENSORE') {
                    scalare = scalare / 2; // Dimezzato se difensore
                    coeffPozzettoUsato = `DIF/Att:${prop}`;
                } else {
                    coeffPozzettoUsato = `Att:${prop}`;
                }
            }
            bonusPozzettoApplicato = scalare;
            punteggio += bonusPozzettoApplicato;
        }

        // 4. Bonus matte LIBERE in mano (pesato su parsimoniaMatte)
        //    parsimoniaMatte: 0=usa subito (bonus basso di tenuta = 30), 10=conserva (bonus alto di tenuta = 80)
        //    L'utente ha acutamente notato che il bonus andava scomputato se la matta veniva calata!
        const pesoMatte = 30 + ((coeff.parsimoniaMatte || 5) * 5); // 30-80
        const quantitaMatteValutate = (analisi.matteResidue !== undefined) ? analisi.matteResidue.length : analisi.matte.length;
        punteggio += quantitaMatteValutate * pesoMatte;

        // ===== COSTI =====

        // 5. Penalità cadaveri (Zavorra) dipendente dal Ruolo
        //    L'utente ha stabilito che la penalità temporaneamente non si baserà 
        //    sulla somma dei punti della carta morta, ma sul numero di carte fisiche da sfoltire,
        //    tolta una (quella che inevitabilmente verrà scartata a fine turno).
        let pesoCadaveri = 2 + ((coeff.prudenzaScarto || 5) * 0.5); // Da 2 a 7 punti di penalità per ogni carta morta
        let descRuoloZavorra = (coeff.prudenzaScarto || 5);

        if (ruolo === 'ATTACCANTE') {
            pesoCadaveri *= 1.5; // L'attaccante odia bloccarsi con carte morte
            descRuoloZavorra = `Att: ${pesoCadaveri.toFixed(1)}`;
        } else if (ruolo === 'DIFENSORE') {
            pesoCadaveri *= 0.5; // Il difensore tollera la zavorra per fare muro
            descRuoloZavorra = `Dif: ${pesoCadaveri.toFixed(1)}`;
        }

        const scontoScarto = isPostPesca ? 1 : 0;
        const numCarteMorteReali = Math.max(0, (analisi.carteMorte ? analisi.carteMorte.length : 0) - scontoScarto);
        const malusCadaveri = -(numCarteMorteReali * pesoCadaveri);
        punteggio += malusCadaveri;

        // 6. Rimosso Malus Troppe Carte.

        analisi.scoreDettagli = {
            base: { val: analisi.puntiDepositabili, coeff: '-' },
            breakdownBase: analisi.breakdownMigliorOpzione || [],
            burraco: { val: analisi.numBurraco * pesoBurraco, coeff: coeff.prefBurracoPulito },
            pozzetto: { val: bonusPozzettoApplicato, coeff: coeffPozzettoUsato },
            matte: { val: quantitaMatteValutate * pesoMatte, coeff: coeff.parsimoniaMatte || 5 },
            cadaveri: { val: malusCadaveri, coeff: descRuoloZavorra },
            troppeCarte: { val: 0, coeff: '-' },
            totale: punteggio
        };

        return punteggio;
    },

    /**
     * Calcola il "valore atteso" di pescare dal mazzo.
     * Considera: valore medio carta + bonus per combinazioni quasi complete.
     *
     * @param {Carta[]} mano - Carte in mano
     * @returns {Object} { bonusBase, bonusRicercate, totale, carteRicercate }
     */
    calcolaValoreAttesoPescaMazzo(mano) {
        // Bonus base: valore medio di una carta (~10 punti)
        const bonusBase = 10;

        // Bonus per carte ricercate (combinazioni a -1 dal completamento)
        let bonusRicercate = 0;
        const carteRicercate = [];

        // Raggruppa carte per numero (per trovare tris a -1)
        const perNumero = new Map();
        mano.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perNumero.has(c.numero)) perNumero.set(c.numero, []);
                perNumero.get(c.numero).push(c);
            }
        });

        // Tris a -1: ho 2 carte dello stesso numero
        perNumero.forEach((carte, numero) => {
            if (carte.length === 2) {
                // Ci sono 8 carte di questo numero nel mazzo (4 semi × 2 mazzi)
                // Meno le 2 che ho = 6 potenziali nel mazzo
                // Probabilità approssimata: 6/~80 carte ≈ 7.5%
                // Valore: punti del tris (3 × valore carta)
                const valoreTris = carte[0].punti * 3;
                const probabilita = 0.08; // ~8%
                const valoreAtteso = valoreTris * probabilita;
                bonusRicercate += valoreAtteso;
                carteRicercate.push(`${carte[0].punti === 15 ? 'A' : numero}×2`);
            }
        });

        // Raggruppa carte per seme (per trovare scale a -1)
        const perSeme = new Map();
        mano.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perSeme.has(c.seme)) perSeme.set(c.seme, []);
                perSeme.get(c.seme).push(c.numero);
            }
        });

        // Scale a -1: ho 2 carte consecutive dello stesso seme
        perSeme.forEach((numeri, seme) => {
            numeri.sort((a, b) => a - b);
            for (let i = 0; i < numeri.length - 1; i++) {
                if (numeri[i + 1] - numeri[i] === 1) {
                    // Ho 2 consecutive, cerco la terza (prima o dopo)
                    // Probabilità: 2 carte utili / ~80 nel mazzo ≈ 2.5%
                    const valoreScala = 15; // ~5 punti × 3 carte
                    const probabilita = 0.025;
                    const valoreAtteso = valoreScala * probabilita;
                    bonusRicercate += valoreAtteso;
                    carteRicercate.push(`${numeri[i]}-${numeri[i + 1]}${seme}`);
                }
            }
        });

        // Arrotonda e limita il bonus ricercate
        bonusRicercate = Math.min(Math.round(bonusRicercate), 30);

        return {
            bonusBase,
            bonusRicercate,
            totale: bonusBase + bonusRicercate,
            carteRicercate
        };
    },

    // ========== HELPER PESCA ==========

    /**
     * Centralita' di una carta: quanto e' versatile per formare burraco.
     * 7/8 appaiono in 7 scale possibili su 8 → massima centralita'.
     * @param {number} numero - Numero della carta (1-13)
     * @returns {number} 0.0-1.0
     */
    getCentralita(numero) {
        // Scala delle centralita' (quante scale di 7+ includono questo numero)
        // 7,8 → 7/8, 6,9 → 6/8, 5,10 → 5/8, 4,11 → 4/8, 3,12 → 3/8, 2,13(K) → 2/8, 1(A) → 2/8
        const mappa = {
            1: 0.25, 2: 0.25, 3: 0.38, 4: 0.50, 5: 0.63, 6: 0.75,
            7: 0.88, 8: 0.88, 9: 0.75, 10: 0.63, 11: 0.50, 12: 0.38, 13: 0.25
        };
        return mappa[numero] || 0;
    },

    /**
     * Valuta l'utilita' di una singola carta per il giocatore.
     * Restituisce un punteggio 0-5+ che indica quanto la carta sarebbe utile.
     * Usata per decidere se raccogliere dagli scarti.
     *
     * @param {Carta} carta - La carta da valutare
     * @param {Giocatore} giocatore - Il giocatore
     * @param {Combinazione[]} combinazioniSquadra - Combo esistenti della squadra
     * @returns {Object} { utilita, motivi[] }
     */
    valutaUtilitaCarta(carta, giocatore, combinazioniSquadra) {
        let utilita = 0;
        const motivi = []; // Array di { label, valore }
        const mano = giocatore.carte;
        const coeff = this.getCoeff(giocatore);

        // Jolly e pinella sono sempre utili
        if (carta.isJolly) {
            return { utilita: 5, motivi: [{ label: 'Jolly!', valore: 5 }] };
        }
        if (carta.isPinella) {
            return { utilita: 4, motivi: [{ label: 'Pinella', valore: 4 }] };
        }

        // 1. Completa un tris? (ho gia' 2+ carte dello stesso numero)
        const stessoNumero = mano.filter(c =>
            c.numero === carta.numero && !c.isJolly && !c.isPinella
        );
        if (stessoNumero.length >= 2) {
            utilita += 3;
            motivi.push({ label: `Completa tris di ${carta.numero} (ho ${stessoNumero.length})`, valore: 3 });
        } else if (stessoNumero.length === 1) {
            utilita += 0.5;
            motivi.push({ label: `Avvicina tris di ${carta.numero}`, valore: 0.5 });
        }

        // 2. Completa o allunga una scala?
        if (carta.seme) {
            const stessoSeme = mano.filter(c =>
                c.seme === carta.seme && !c.isJolly && !c.isPinella
            ).map(c => c.numero).sort((a, b) => a - b);

            // Cerca se completa una scala di 3 (ho 2 consecutive e questa e' la terza)
            let completaScala = false;
            for (let i = 0; i < stessoSeme.length - 1; i++) {
                if (stessoSeme[i + 1] - stessoSeme[i] === 1) {
                    // Ho 2 consecutive: la carta completa prima o dopo?
                    if (carta.numero === stessoSeme[i] - 1 || carta.numero === stessoSeme[i + 1] + 1) {
                        utilita += 3;
                        motivi.push({ label: `Completa scala ${stessoSeme[i]}-${stessoSeme[i + 1]}${carta.seme}`, valore: 3 });
                        completaScala = true;
                        break;
                    }
                }
            }
            if (!completaScala) {
                // Riempie un buco? (ho N e N+2, questa e' N+1)
                for (let i = 0; i < stessoSeme.length - 1; i++) {
                    if (stessoSeme[i + 1] - stessoSeme[i] === 2 &&
                        carta.numero === stessoSeme[i] + 1) {
                        utilita += 2;
                        motivi.push({ label: `Riempie buco ${stessoSeme[i]}-?-${stessoSeme[i + 1]}${carta.seme}`, valore: 2 });
                        break;
                    }
                }
                // Allunga una scala esistente (ho gia' 3+ consecutive)?
                if (stessoSeme.length >= 3) {
                    const min = stessoSeme[0];
                    const max = stessoSeme[stessoSeme.length - 1];
                    if (carta.numero === min - 1 || carta.numero === max + 1) {
                        utilita += 2;
                        motivi.push({ label: `Allunga scala ${min}-${max}${carta.seme}`, valore: 2 });
                    }
                }
            }
        }

        // 3. Calabile su combo esistente?
        // Scala vale piu' del tris (cresce verso burraco)
        // Bonus prossimita' burraco per combo lunghe
        // Bonus extra se la squadra non ha ancora un burraco
        if (combinazioniSquadra && combinazioniSquadra.length > 0) {
            for (const combo of combinazioniSquadra) {
                if (typeof puoAggiungereACombinazione === 'function') {
                    if (puoAggiungereACombinazione(carta, combo)) {
                        // Scala vale piu' del tris
                        const bonusCalata = combo.tipo === TIPO_SCALA ? 2.5 : 1.5;
                        utilita += bonusCalata;
                        const tipoDesc = combo.tipo === TIPO_SCALA ? 'scala' : 'tris';
                        motivi.push({ label: `Calabile su ${tipoDesc} #${combo.id}`, valore: bonusCalata });

                        // Bonus prossimita' burraco
                        const lunghezza = combo.carte.length;
                        if (lunghezza >= 4) {
                            let bonusProssimita = 0;
                            if (lunghezza === 6) {
                                bonusProssimita = 3.0; // Questa carta FA burraco!
                            } else if (lunghezza === 5) {
                                bonusProssimita = 1.5;
                            } else if (lunghezza === 4) {
                                bonusProssimita = 0.5;
                            }
                            if (bonusProssimita > 0) {
                                utilita += bonusProssimita;
                                const descB = lunghezza === 6
                                    ? 'FA burraco!'
                                    : `combo ${lunghezza}\u2192${lunghezza + 1}/7`;
                                motivi.push({ label: `Verso burraco (${descB})`, valore: bonusProssimita });

                                // Bonus extra se la squadra non ha ancora nessun burraco
                                const haBurraco = combinazioniSquadra.some(c => c.isBurraco);
                                if (!haBurraco) {
                                    const bonusPrimo = bonusProssimita * 0.5;
                                    utilita += bonusPrimo;
                                    motivi.push({ label: 'Primo burraco squadra', valore: bonusPrimo });
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }

        // 4. Bonus centralita' (modulato dal coefficiente)
        const centralita = this.getCentralita(carta.numero);
        const bonusCentralita = centralita * ((coeff.valoreCentralita || 5) / 10);
        if (bonusCentralita > 0.3) {
            utilita += bonusCentralita;
            motivi.push({ label: `Centralita' (${carta.numero}: ${centralita.toFixed(2)})`, valore: bonusCentralita });
        }

        return { utilita, motivi };
    },

    /**
     * Trova il prossimo avversario nell'ordine di turno.
     * In 2v2 il giocatore dopo e' sempre di squadra opposta.
     * @param {Giocatore} giocatore
     * @returns {Giocatore|null}
     */
    getProssimoAvversario(giocatore) {
        const n = game.giocatori.length;
        const idx = game.giocatoreCorrente;
        // In 2v2 il prossimo e' sempre avversario (le squadre alternano)
        for (let i = 1; i < n; i++) {
            const g = game.giocatori[(idx + i) % n];
            if (g.squadra !== giocatore.squadra) return g;
        }
        return null;
    },

    /**
     * Verifica se il giocatore e' a 1 pescata dall'obiettivo (pozzetto o chiusura).
     * "A 1 pescata" = dopo aver pescato 1 carta dal mazzo, potrebbe raggiungere
     * l'obiettivo in questo turno.
     *
     * @param {Giocatore} giocatore
     * @param {Combinazione[]} combinazioniSquadra
     * @returns {Object} { vicino: bool, tipo: string, carteInMano: number }
     */
    aDistanzaDaObiettivo(giocatore, combinazioniSquadra) {
        const haGiaCalato = combinazioniSquadra.length > 0;
        const numCarte = giocatore.carte.length;

        // Vicino al pozzetto: ha gia' calato, non ha pozzetto, poche carte
        // Con 1-3 carte + pesca 1 = 2-4 carte → deve depositare/calare tutto tranne 1
        if (haGiaCalato && !giocatore.haPozzetto && numCarte <= 3) {
            return { vicino: true, tipo: 'pozzetto', carteInMano: numCarte };
        }

        // Vicino alla chiusura: ha pozzetto, ha burraco, poche carte
        if (giocatore.haPozzetto && numCarte <= 3) {
            const haBurraco = combinazioniSquadra.some(c => c.isBurraco);
            if (haBurraco) {
                return { vicino: true, tipo: 'chiusura', carteInMano: numCarte };
            }
        }

        return { vicino: false, tipo: null, carteInMano: numCarte };
    },

    /**
     * Determina il ruolo dinamico del giocatore in base allo scarto carte col compagno
     */
    determinaRuoloDinamico(giocatore) {
        let ruolo = 'neutro';
        const idx = game.giocatori.findIndex(g => g.nome === giocatore.nome);
        if (idx === -1) return ruolo; // failsafe

        let compagno = null;
        for (let i = 1; i < game.giocatori.length; i++) {
            const g = game.giocatori[(idx + i) % game.giocatori.length];
            if (g.squadra === giocatore.squadra) { compagno = g; break; }
        }
        if (compagno) {
            // Se ho palesemente meno carte corro al pozzetto, se ho molte carte difendo/comprimo.
            if (giocatore.carte.length < compagno.carte.length - 2) ruolo = 'ATTACCANTE';
            if (giocatore.carte.length > compagno.carte.length + 2) ruolo = 'DIFENSORE';
        }

        if (!giocatore.osservazioni) giocatore.osservazioni = {};
        giocatore.osservazioni.ruoloDinamico = ruolo;

        return ruolo;
    },

    /**
     * Decisione: pescare da scarti o da mazzo?
     * Nuova Logica: SIMULAZIONE COMBINATORIA GEMINI
     */
    decidiFontePesca(giocatore) {
        const coeff = this.getCoeff(giocatore);
        const numScarti = game.scarti.length;
        const combinazioniSquadra = giocatore.squadra === 0
            ? game.combinazioniNoi
            : game.combinazioniLoro;

        // Registro delle regole valutate (per UI debug)
        const regole = [];
        let decisione = null;
        let motivo = '';

        // ===== REGOLA 0: Scarti vuoti → mazzo =====
        if (numScarti === 0) {
            this.logPensiero(giocatore, 'Pesca: >>> MAZZO (scarti vuoti)');
            return 'mazzo';
        }

        const cartaInCima = game.scarti[numScarti - 1];
        const nomeCima = this.nomeCarta(cartaInCima);

        // ===== REGOLA 1: Matta in cima -> SEMPRE scarti tranne chiusura con troppe carte =====
        if (cartaInCima.isJolly || cartaInCima.isPinella) {
            const obiettivo = this.aDistanzaDaObiettivo(giocatore, combinazioniSquadra);
            if (obiettivo.vicino && obiettivo.tipo === 'chiusura' && numScarti > 3) {
                regole.push({ regola: 'Matta in cima', esito: 'eccezione', desc: 'Troppi scarti per chiudere' });
            } else {
                decisione = 'scarti';
                motivo = `${cartaInCima.isJolly ? 'JOLLY' : 'PINELLA'} in cima!`;
                regole.push({ regola: 'Matta in cima', esito: 'scarti', desc: 'Raccoglie sempre' });
            }
        }

        if (!decisione) {
            // Modulazione Ruolo (Attaccante vs Difensore) leggendo mosse del socio
            const ruolo = this.determinaRuoloDinamico(giocatore);

            // === SIMULAZIONE COMBINATORIA AI GEMINI ===
            const manoAttuale = giocatore.carte;
            const manoVirtuale = [...manoAttuale, ...game.scarti];
            const puoPozzetto = !giocatore.haPozzetto && combinazioniSquadra.length > 0;

            const analisiBase = this.analizzaCarte(manoAttuale, combinazioniSquadra);
            const opzioniBase = this.generaOpzioniGioco(giocatore, analisiBase, manoAttuale.length, false);
            if (opzioniBase.length > 0) {
                const best = opzioniBase[0];
                analisiBase.puntiDepositabili = best.puntiTotali;
                analisiBase.breakdownMigliorOpzione = best.breakdown;
                analisiBase.numBurraco = best.mosse.filter(m => m.tipo === 'scala' && m.carte.length >= 7).length;
                analisiBase.carteMorte = manoAttuale.filter(c => !best.carteUsate.has(c.id) && !c.isJolly && !c.isPinella);
                analisiBase.puntiCadaveri = analisiBase.carteMorte.reduce((s, c) => s + c.punti, 0);
                analisiBase.carteResidue = manoAttuale.length - best.carteUsate.size;
                analisiBase.matteResidue = manoAttuale.filter(c => !best.carteUsate.has(c.id) && (c.isJolly || c.isPinella));
            } else {
                analisiBase.carteResidue = manoAttuale.length;
                analisiBase.matteResidue = manoAttuale.filter(c => c.isJolly || c.isPinella);
            }
            const scoreBase = this.valutaSituazione(analisiBase, coeff, manoAttuale.length, puoPozzetto, ruolo, false);

            const analisiVirtuale = this.analizzaCarte(manoVirtuale, combinazioniSquadra);
            const opzioniVirtuale = this.generaOpzioniGioco(giocatore, analisiVirtuale, manoVirtuale.length, true);
            if (opzioniVirtuale.length > 0) {
                const best = opzioniVirtuale[0];
                analisiVirtuale.puntiDepositabili = best.puntiTotali;
                analisiVirtuale.breakdownMigliorOpzione = best.breakdown;
                analisiVirtuale.numBurraco = best.mosse.filter(m => m.tipo === 'scala' && m.carte.length >= 7).length;
                analisiVirtuale.carteMorte = manoVirtuale.filter(c => !best.carteUsate.has(c.id) && !c.isJolly && !c.isPinella);
                analisiVirtuale.puntiCadaveri = analisiVirtuale.carteMorte.reduce((s, c) => s + c.punti, 0);
                analisiVirtuale.carteResidue = manoVirtuale.length - best.carteUsate.size;
                analisiVirtuale.matteResidue = manoVirtuale.filter(c => !best.carteUsate.has(c.id) && (c.isJolly || c.isPinella));
            } else {
                analisiVirtuale.carteResidue = manoVirtuale.length;
                analisiVirtuale.matteResidue = manoVirtuale.filter(c => c.isJolly || c.isPinella);
            }
            const scoreVirtuale = this.valutaSituazione(analisiVirtuale, coeff, manoVirtuale.length, puoPozzetto, ruolo, true);

            // Salviamo per la UI nel log del giocatore
            if (giocatore.osservazioni) {
                giocatore.osservazioni.analisiBase = analisiBase;
                giocatore.osservazioni.analisiVirtuale = analisiVirtuale;
            }

            const delta = scoreVirtuale - scoreBase;

            // Premio Scarti (sostituisce la vecchia Soglia)
            // L'utente ha notato che avere la "certezza" della carta sul tavolo 
            // merita un PREMIO extra e non una soglia punitiva da scavalcare.
            // Il coefficiente 'premioScarti' (rinominabile in seguito) fornisce il bonus base.
            let basePremio = -1; // FORZATURA TEST: originariamente era coeff.premioScarti;
            let modRuolo = 0;

            if (ruolo === 'ATTACCANTE') modRuolo = -(coeff.frettaChiusura * 3); // L'attaccante riduce il premio extra
            if (ruolo === 'DIFENSORE') modRuolo = 15; // Il difensore riceve spinta extra a raccogliere

            let premioScarti = basePremio + modRuolo;

            // Creazione Dettagli Premio per UI
            const dettagliPremio = {
                base: basePremio,
                coeffBase: coeff.premioScarti,
                ruolo: ruolo,
                modRuolo: modRuolo,
                totale: premioScarti
            };

            const deltaTotale = delta + premioScarti;

            if (deltaTotale >= 0) {
                decisione = 'scarti';
                motivo = `Simulaz: Delta(+${delta.toFixed(1)}) + Premio(${premioScarti.toFixed(1)}) >= 0`;
            } else {
                decisione = 'mazzo';
                motivo = `Simulaz: Delta(${delta.toFixed(1)}) + Premio(${premioScarti.toFixed(1)}) < 0`;
            }

            regole.push({
                regola: 'Simulazione Combinatoria',
                esito: decisione,
                desc: `${numScarti} carte. Ruolo: ${ruolo}, Delta+Premio: ${deltaTotale.toFixed(1)} >= 0`,
                simulazione: {
                    scoreBase: scoreBase.toFixed(1),
                    scoreVirtuale: scoreVirtuale.toFixed(1),
                    delta: delta.toFixed(1),
                    premio: premioScarti.toFixed(1),
                    dettagliPremio: dettagliPremio,
                    soglia: 0, // Fallback legacy per non rompere l'UI temporaneamente
                    dettagliSoglia: dettagliPremio, // Fallback legacy

                    puntiBase: analisiBase.puntiDepositabili,
                    puntiVirtuale: analisiVirtuale.puntiDepositabili,
                    cadaveriBase: analisiBase.puntiCadaveri,
                    cadaveriVirtuale: analisiVirtuale.puntiCadaveri,
                    dettagliBase: analisiBase.scoreDettagli,
                    dettagliVirtuale: analisiVirtuale.scoreDettagli
                }
            });
        }

        // PREPARA DETTAGLI PER UI DEBUG
        const dettagli = {
            tipo: 'pesca',
            decisione,
            motivo,
            regole,
            scarti: {
                numCarte: numScarti,
                cartaInCima: nomeCima,
                isJolly: cartaInCima?.isJolly,
                isPinella: cartaInCima?.isPinella
            },
            coeff: {
                premioScarti: coeff.premioScarti,
                frettaChiusura: coeff.frettaChiusura,
                compressione: coeff.compressione
            }
        };

        const mark = decisione === 'mazzo' ? '>>> MAZZO' : '>>> SCARTI';
        this.logPensiero(giocatore, `${mark} | ${motivo}`, dettagli);

        return decisione;
    },

    // Verifica se carta forma combinazione con la mano
    cartaFormaCombinazione(carta, mano) {
        // Crea mano temporanea con la carta aggiunta
        const manoTemp = [...mano, carta];

        // Cerca tris
        const stessoNumero = manoTemp.filter(c => c.numero === carta.numero && !c.isJolly);
        if (stessoNumero.length >= 3) return true;

        // Cerca scale (semplificato: 3 carte consecutive stesso seme)
        const stessoSeme = manoTemp.filter(c => c.seme === carta.seme && !c.isJolly)
            .sort((a, b) => a.numero - b.numero);

        for (let i = 0; i < stessoSeme.length - 2; i++) {
            if (stessoSeme[i + 1].numero === stessoSeme[i].numero + 1 &&
                stessoSeme[i + 2].numero === stessoSeme[i].numero + 2) {
                return true;
            }
        }

        return false;
    },

    // Verifica se carta può attaccare combinazione esistente
    cartaPuoAttaccare(giocatore, carta) {
        const combinazioni = giocatore.squadra === 0 ?
            game.combinazioniNoi : game.combinazioniLoro;

        for (const comb of combinazioni) {
            if (typeof puoAggiungereACombinazione === 'function') {
                if (puoAggiungereACombinazione(carta, comb)) return true;
            }
        }
        return false;
    },

    // Decisione: quale carta scartare?
    scegliCartaDaScartare(giocatore) {
        const mano = giocatore.carte;
        if (mano.length === 0) return null;

        // Calcola punteggio per ogni carta (piu' alto = piu' scartabile)
        const punteggi = mano.map(carta => {
            const risultato = this.calcolaPunteggioScarto(giocatore, carta);
            return {
                carta: carta,
                punteggio: risultato.totale,
                breakdown: risultato.breakdown
            };
        });

        // Ordina per punteggio decrescente
        punteggi.sort((a, b) => b.punteggio - a.punteggio);

        // Log dettagli per debug UI
        const top = punteggi.slice(0, Math.min(10, punteggi.length));
        const dettagli = {
            tipo: 'scarto',
            cartaScelta: this.nomeCarta(punteggi[0].carta),
            punteggioScelto: punteggi[0].punteggio,
            breakdownScarto: punteggi[0].breakdown,
            classifica: top.map(p => ({
                carta: this.nomeCarta(p.carta),
                punteggio: p.punteggio,
                breakdown: p.breakdown
            }))
        };
        this.logPensiero(giocatore,
            `Scarto: ${dettagli.cartaScelta} (${punteggi[0].punteggio.toFixed(2)})`,
            dettagli
        );

        return punteggi[0].carta;
    },

    calcolaPunteggioScarto(giocatore, carta) {
        const coeff = this.getCoeff(giocatore);
        const mano = giocatore.carte;
        const combinazioniSquadra = giocatore.squadra === 0
            ? game.combinazioniNoi : game.combinazioniLoro;
        let punteggio = 0;
        const breakdown = [];

        // Helper locale per aggiungere score
        const addScore = (label, val, coeffStr) => {
            if (val === 0) return;
            punteggio += val;
            breakdown.push({ label, valore: val, coeffStr });
        };

        // 1. Utilita' invertita: carta utile = NON scartarla
        const valCarta = this.valutaUtilitaCarta(carta, giocatore, combinazioniSquadra);
        if (valCarta.motivi && valCarta.motivi.length > 0) {
            valCarta.motivi.forEach(m => {
                addScore('Utilità: ' + m.label, -(m.valore * 0.15), 'Peso Fisso: x0.15');
            });
        }

        // 2. Carte isolate per tris (nessun'altra carta uguale)
        const stessoNumero = mano.filter(c =>
            c.numero === carta.numero && !c.isJolly && !c.isPinella && c !== carta
        ).length;
        if (stessoNumero === 0) addScore('Isolamento Tris (+ scartabile)', 0.3, 'Bonus Isolamento: +0.3');

        // 3. Carte isolate per scala (nessun vicino dello stesso seme)
        if (carta.seme) {
            const vicini = mano.filter(c =>
                c.seme === carta.seme && !c.isJolly && !c.isPinella &&
                c !== carta && Math.abs(c.numero - carta.numero) <= 2
            ).length;
            if (vicini === 0) addScore('Isolamento Scala (+ scartabile)', 0.2, 'Bonus Isolamento: +0.2');
        }

        // 4. Carte alte pesano di piu' se non chiudi
        addScore('Peso Punti Base', (carta.punti / 15) * 0.2, 'Formula: Punti/15 x0.2');

        // 5. Centralita' bassa = piu' sicuro da scartare (A,K: +0.15; 7,8: +0.02)
        const centralita = this.getCentralita(carta.numero);
        addScore('Decentralizzazione Estr.', (1 - centralita) * 0.2, 'Formula: (1 - Centr.) x0.2');

        // 6. Jolly e pinelle: MAI scartare
        if (carta.isJolly) {
            addScore('Jolly (Protezione Max)', -(0.5 + ((coeff.parsimoniaMatte || 5) * 0.1)), 'parsimoniaMatte: ' + (coeff.parsimoniaMatte || 5));
        }
        if (carta.isPinella) {
            addScore('Pinella (Protezione Max)', -(0.5 + ((coeff.parsimoniaMatte || 5) * 0.05)), 'parsimoniaMatte: ' + (coeff.parsimoniaMatte || 5));
        }

        // 7. Sicurezza: analisi avversari
        if (coeff.prudenzaScarto > 3) {
            const scartiAvv = this.analizzaScartiAvversari(giocatore);
            // Se avversari hanno scartato carte dello stesso numero → sicuro
            const avvHaScartato = scartiAvv.some(s =>
                s.carta && s.carta.numero === carta.numero
            );
            if (avvHaScartato) {
                addScore('Ignorata Avv. (+ sicura)', 0.15, 'prudenzaScarto: ' + coeff.prudenzaScarto); // Loro non cercano questo numero
            } else if (coeff.prudenzaScarto > 5) {
                addScore('Sconosciuta Avv. (Cautela)', -((coeff.prudenzaScarto - 5) * 0.04), 'prudenzaScarto: ' + coeff.prudenzaScarto); // Cautela: 0 a -0.2
            }
        }

        return { totale: punteggio, breakdown: breakdown };
    },

    // Decisione: depositare combinazione?
    dovrebbiDepositare(giocatore, carte, numCarteVirtuale = null) {
        // Verifica se è combinazione valida
        if (typeof verificaCombinazione === 'function') {
            const risultato = verificaCombinazione(carte);
            if (!risultato.valida) return false;
        }

        const coeff = this.getCoeff(giocatore);
        const numCarte = carte.length;
        const carteInMano = numCarteVirtuale !== null ? numCarteVirtuale : giocatore.carte.length;

        // sogliaDeposito: 0=deposita subito, 10=accumula
        // Con sogliaDeposito basso, deposita con 3+ carte
        // Con sogliaDeposito alto, aspetta 5+ carte
        const sogliaMinima = 3 + Math.floor(coeff.sogliaDeposito / 5); // 3, 4, o 5

        if (numCarte >= 7) return true; // Burraco: sempre depositare

        // prefBurracoPulito: se alto, aspetta di avere 7 carte
        if (coeff.prefBurracoPulito >= 8 && numCarte >= 5 && numCarte < 7) {
            // Aspetta il burraco
            return false;
        }

        // frettaChiusura: se alto, deposita se ha poche carte in mano
        if (coeff.frettaChiusura >= 7 && carteInMano <= 5) {
            return true;
        }

        return numCarte >= sogliaMinima;
    },

    // ============================================================================
    // ANALISI PARALLELA UNIFICATA (Sandbox)
    // ============================================================================

    valutaCartaAnalisiParallela(carta, mano, contesto) {
        let punteggio = 0;
        const breakdown = [];

        // contesto: { tris: [...], scale: [...], attacchi: [...] }
        const { tris = [], scale = [], attacchi = [] } = contesto || {};

        const addScore = (label, val, coeffStr) => {
            if (val === 0) return;
            punteggio += val;
            breakdown.push({ label, valore: val, coeffStr });
        };

        if (carta.isJolly || carta.isPinella) {
            addScore('Matta', -50.0, 'Valore Fisso');
            return { punteggio, breakdown };
        }

        // 1. Decentralizzazione (0 = asse, 1.0 = 7/8) -> (1 - centralita)
        const centralita = this.getCentralita(carta.numero);
        // Diamo un po' più peso alla decentralizzazione per spingere gli scarti ignobili (x 5.0)
        addScore('Decentralizzazione', (1 - centralita) * 5.0, 'Base: (1-c) * 5.0');

        // 2. Coppia per Tris
        const uguali = mano.filter(c => c.numero === carta.numero && !c.isJolly && !c.isPinella && c !== carta).length;
        if (uguali > 0) {
            addScore('Coppia per Tris', -15.0 * uguali, 'Fisso: -15.0 x N');
        }

        // 3. Coppia per Scala e Scala con Buco
        if (carta.seme) {
            const stessoSeme = mano.filter(c => c.seme === carta.seme && !c.isJolly && !c.isPinella && c !== carta);

            // Attigui (distanza 1)
            const attigui = stessoSeme.filter(c => Math.abs(c.numero - carta.numero) === 1).length;
            if (attigui > 0) {
                addScore('Coppia per Scala', -12.0 * attigui, 'Fisso: -12.0 x N');
            }

            // Buchi (distanza 2)
            const buchi = stessoSeme.filter(c => Math.abs(c.numero - carta.numero) === 2).length;
            if (buchi > 0) {
                addScore('Coppia per Scala (Buco)', -6.0 * buchi, 'Fisso: -6.0 x N');
            }
        }

        let numUsiPositivi = 0;

        const addScoreEnhanced = (label, val, coeffStr, usaMatta) => {
            if (val === 0) return;
            punteggio += val;
            breakdown.push({ label, valore: val, coeffStr, usaMatta });
            if (val < 0) numUsiPositivi++; // Numeri negativi sono "premi" per la conservazione in questa logica
        };

        // 4. In Tris completi (T1, T2, ecc.)
        tris.forEach((t, index) => {
            if (t.carte.some(c => c.id === carta.id)) {
                const desc = t.carte.map(c => c.nomeBreve).join(' ');
                addScoreEnhanced(`T${index + 1} (${desc})`, -30.0, 'Fisso: -30.0', t.usaMatta);
            }
        });

        // 5. In Scale complete (S1, S2, ecc.)
        scale.forEach((s, index) => {
            if (s.carte.some(c => c.id === carta.id)) {
                const desc = s.carte.map(c => c.nomeBreve).join(' ');
                addScoreEnhanced(`S${index + 1} (${desc})`, -30.0, 'Fisso: -30.0', s.usaMatta);
            }
        });

        // 6. Attacco a combinazioni a terra (C)
        const attacchiDellaCarta = attacchi.filter(a => a.carta && a.carta.id === carta.id);
        if (attacchiDellaCarta.length > 0) {
            // Per brevità mostriamo la descrizione del primo, ma incrementiamo comunque gli usi
            const primoAttacco = attacchiDellaCarta[0];
            const desc = primoAttacco.combo.carte.map(c => c.nomeBreve).join(' ');
            addScoreEnhanced(`C (Attacco su: ${desc})`, -40.0, 'Fisso: -40.0', false); // C non ha "usaMatta" come le combo virtuali
            // numUsiPositivi += (attacchiDellaCarta.length - 1); // Se vogliamo contare gli attacchi multipli come overlap ulteriori
        }

        const isConflitto = numUsiPositivi > 1;

        return { punteggio, breakdown, isConflitto };
    },

    generaAnalisiParallela(giocatore, scenario = 'scarti') {
        const classifica = [];
        let mano = [];

        // Funzione di utility per clonare in sandbox senza perdere il prototipo di "Carta" (isJolly, isPinella ec)
        const clonaInSandbox = (cartaOrig, origine) => {
            const clone = Object.assign(Object.create(Object.getPrototypeOf(cartaOrig)), cartaOrig);
            clone._origineRef = cartaOrig;
            clone._origine = origine;
            return clone;
        };

        // Mappiamo le carte con l'origine per l'UI
        giocatore.carte.forEach(c => mano.push(clonaInSandbox(c, 'mano')));

        // Aggiunta carte extra in base allo scenario richiesto dall'esterno
        if (scenario === 'scarti' && game.scarti.length > 0) {
            game.scarti.forEach(c => mano.push(clonaInSandbox(c, 'scarto')));
        } else if (scenario === 'mazzo' && game.mazzo.length > 0) {
            // Prende l'effettiva carta in cima al mazzo (l'ultima dell'array mazzo)
            const cartaMazzo = game.mazzo[game.mazzo.length - 1];
            mano.push(clonaInSandbox(cartaMazzo, 'mazzo'));
        }

        // Calcoliamo i set completi sulla mano virtuale (come AnalizzaMano ma sandbox)
        // Usiamo un clone per non sporcare la vera analisi
        const cloneGiocatore = { carte: mano, isUmano: false, nome: 'Sandbox', squadra: giocatore.squadra };

        // Attacchi possibili sulle combinazioni a terra (della squadra)
        const squadraCombo = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;

        // Tris e Scale in mano
        const analisiVirtuale = this.analizzaCarte(mano, squadraCombo);
        const trisVirtuali = analisiVirtuale.possibiliTris || [];
        const scaleVirtuali = analisiVirtuale.possibiliScale || [];
        const attacchiPossibili = [];

        const isAttaccabile = (carta, combo) => window.isCartaAttaccabileACombo(carta, combo);

        mano.forEach(c => {
            for (let i = 0; i < squadraCombo.length; i++) {
                if (isAttaccabile(c, squadraCombo[i])) {
                    attacchiPossibili.push({ carta: c, combo: squadraCombo[i] });
                    break;
                }
            }
        });

        // Attacchi possibili sulle combinazioni AVVERSARIE (carte da non scartare)
        const combinazioniAvversarie = giocatore.squadra === 0 ? game.combinazioniLoro : game.combinazioniNoi;
        const attacchiAvversari = [];
        mano.forEach(c => {
            for (let i = 0; i < combinazioniAvversarie.length; i++) {
                if (isAttaccabile(c, combinazioniAvversarie[i])) {
                    attacchiAvversari.push({
                        carta: c,
                        combo: combinazioniAvversarie[i],
                        lunghezzaRaggiunta: combinazioniAvversarie[i].carte.length + 1
                    });
                    break;
                }
            }
        });

        const contestoLocale = { tris: trisVirtuali, scale: scaleVirtuali, attacchi: attacchiPossibili };

        // Calcola le opzioni di gioco per lo scenario corrente (non dalla cache che usa sempre tutti gli scarti)
        const manoOriginali = mano.map(c => c._origineRef || c);
        const analisiScenario = this.analizzaCarte(manoOriginali, squadraCombo);
        const opzioniScenario = this.generaOpzioniGioco(giocatore, analisiScenario, manoOriginali.length, scenario !== 'mano');

        // Pre-calcolo lunghezze target cumulative per calate alla stessa combo (per ogni opzione)
        const mossaTargetLengthsPerOpz = opzioniScenario ? opzioniScenario.map(function(opt) {
            const tl = {};
            const accumLen = {};
            if (opt.mosse) {
                for (let m = 0; m < opt.mosse.length; m++) {
                    const mossa = opt.mosse[m];
                    if (mossa.tipo === 'calata' && mossa.combo) {
                        const cid = mossa.combo.id;
                        if (accumLen[cid] === undefined) accumLen[cid] = mossa.combo.carte.length;
                        accumLen[cid]++;
                        tl[m] = accumLen[cid];
                    }
                }
            }
            return tl;
        }) : [];

        // Calcoliamo lo score usando la mano virtuale su TUTTE le carte valutate
        for (let i = 0; i < mano.length; i++) {
            const cartaVirtuale = mano[i];
            const result = this.valutaCartaAnalisiParallela(cartaVirtuale._origineRef, mano.map(m => m._origineRef), contestoLocale);

            // --- INIEZIONE OPZIONI DI GIOCO ---
            const opzioni = opzioniScenario;

            if (opzioni && opzioni.length > 0) {
                // Mostra tutte le opzioni disponibili
                const maxOpz = opzioni.length;
                for (let o = 0; o < maxOpz; o++) {
                    const opt = opzioni[o];
                    const labelOpz = 'OPZ' + (o + 1);

                    // Verifico se questa carta (Ref originale) partecipa a una delle mosse di questa opzione
                    let partecipa = false;
                    let comboId = '';
                    let isCalata = false;
                    let descBreve = '';
                    let puntiGiocata = 0;
                    let targetBadge = '';
                    let targetLength = 0;
                    let mossaIdxForColor = 0;
                    let mossaUsaMatta = false;

                    if (opt.mosse) {
                        for (let m = 0; m < opt.mosse.length; m++) {
                            const mossa = opt.mosse[m];
                            let carteMossa = [];
                            let currentTargetBadge = '';
                            let currentTargetLength = 0;
                            let currentMossaUsaMatta = false;

                            if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                                carteMossa = mossa.carte || [];
                                isCalata = false;
                                descBreve = (mossa.tipo === 'tris' ? 'T' : 'S') + (mossa.numero || mossa.seme || '');
                                currentMossaUsaMatta = carteMossa.some(cM => {
                                    if (!cM) return false;
                                    let hasMatta = (cM.isJolly || cM.isPinella || cM.valore === 15);
                                    if (!hasMatta && cM._origineRef) {
                                        hasMatta = (cM._origineRef.isJolly || cM._origineRef.isPinella || cM._origineRef.valore === 15);
                                    }
                                    return hasMatta;
                                });
                            } else if (mossa.tipo === 'calata') {
                                carteMossa = [mossa.carta]; // La calata ha la proprietà 'carta' (singola)
                                isCalata = true;
                                descBreve = 'C';

                                // Verifica se il target a cui attacchiamo (o l'attacco stesso) usa una matta
                                currentMossaUsaMatta = false;
                                if (mossa.combo && mossa.combo.carte) {
                                    currentMossaUsaMatta = mossa.combo.carte.some(cM => {
                                        if (!cM) return false;
                                        let hasMatta = (cM.isJolly || cM.isPinella || cM.valore === 15);
                                        if (!hasMatta && cM._origineRef) {
                                            hasMatta = (cM._origineRef.isJolly || cM._origineRef.isPinella || cM._origineRef.valore === 15);
                                        }
                                        return hasMatta;
                                    });
                                }
                                if (!currentMossaUsaMatta && mossa.carta) {
                                    let cM = mossa.carta;
                                    currentMossaUsaMatta = (cM.isJolly || cM.isPinella || cM.valore === 15);
                                    if (!currentMossaUsaMatta && cM._origineRef) {
                                        currentMossaUsaMatta = (cM._origineRef.isJolly || cM._origineRef.isPinella || cM._origineRef.valore === 15);
                                    }
                                }

                                // Composizione Badge Testuale per Interfaccia
                                if (mossa.combo && mossa.combo.carte) {
                                    // Usa la lunghezza cumulativa se più calate attaccano la stessa combo
                                    currentTargetLength = (mossaTargetLengthsPerOpz[o] && mossaTargetLengthsPerOpz[o][m] !== undefined)
                                        ? mossaTargetLengthsPerOpz[o][m]
                                        : mossa.combo.carte.length + 1;
                                    const tipoDesc = mossa.combo.tipo === 1 ? 'T' : 'S'; // 1 Tris, 2 Scala
                                    const siglaTarget = mossa.combo.tipo === 1 ? mossa.combo.numero : mossa.combo.seme;
                                    currentTargetBadge = `[${currentTargetLength}${tipoDesc}${siglaTarget || ''}]`;
                                }
                            }

                            // La carta virtuale fa parte in sostanza di carteMossa? Controllo ID dell'original ref
                            const trovata = carteMossa.find(cM => cM && cM.id === cartaVirtuale._origineRef.id);
                            if (trovata) {
                                partecipa = true;
                                // comboId univoco: Differenziamo la chiave target per colorazioni avanzate
                                comboId = isCalata ? labelOpz + '-ATTACCO-' + (mossa.combo ? mossa.combo.id : '') : labelOpz + '-' + m + '-' + descBreve;
                                puntiGiocata = cartaVirtuale._origineRef.punti;
                                // Aggiorno le variabili per il breakdown prima del break:
                                targetBadge = currentTargetBadge;
                                targetLength = currentTargetLength;
                                mossaUsaMatta = currentMossaUsaMatta;

                                // Memorizzo l'indice della mossa per sincronizzare i colori
                                mossaIdxForColor = m;
                                break;
                            }
                        }
                    }

                    if (partecipa) {
                        result.breakdown.push({
                            label: labelOpz,
                            valore: puntiGiocata, // Il valore puro della singola carta giocata
                            comboSegreta: comboId,
                            isCalata: isCalata,
                            badgeTesto: targetBadge,     // Es Stringa: "[4SP]"
                            targetLength: targetLength,  // Es Int: 4
                            mossaIdx: mossaIdxForColor,  // Es: 0, 1, 2...
                            mossaUsaMatta: mossaUsaMatta // True se la combo usa matta (per triangolo visivo)
                        });
                    }
                }
            }
            // --- FINE OPZIONI ---

            const avvAttacco = attacchiAvversari.find(a => a.carta.id === cartaVirtuale._origineRef.id);
            classifica.push({
                carta: this.nomeCarta(cartaVirtuale._origineRef) + (cartaVirtuale._origine !== 'mano' ? '*' : ''),
                cartaRef: cartaVirtuale._origineRef, // Aggiunto per ordinamento dinamico UI (Numero/Seme)
                origine: cartaVirtuale._origine,
                isMatta: cartaVirtuale._origineRef.isJolly || cartaVirtuale._origineRef.isPinella,
                punteggio: result.punteggio,
                breakdown: result.breakdown,
                isConflitto: result.isConflitto,
                avversaria: avvAttacco ? {
                    lunghezza: avvAttacco.lunghezzaRaggiunta,
                    comboDesc: avvAttacco.combo.carte.map(c => this.nomeCarta(c)).join(' '),
                    tipoCombo: avvAttacco.combo.tipo === 1 ? 'T' : 'S'
                } : null
            });
        }

        return {
            giocatore: giocatore.nome,
            scenario: scenario,
            classifica: classifica,
            opzioniScenario: opzioniScenario,
            attacchiAvversari: attacchiAvversari.map(a => ({
                carta: this.nomeCarta(a.carta._origineRef || a.carta),
                comboDesc: a.combo.carte.map(c => this.nomeCarta(c)).join(' '),
                lunghezzaRaggiunta: a.lunghezzaRaggiunta,
                tipoCombo: a.combo.tipo === 1 ? 'T' : 'S'
            }))
        };
    }
};

// ============================================================================
// CLASSE GIOCATORE
// ============================================================================

class Giocatore {
    // Può ricevere un personaggio predefinito o parametri singoli
    constructor(nome, posizione, isUmano = false, personaggio = null) {
        this.posizione = posizione; // 'bottom', 'top', 'left', 'right'
        this.isUmano = isUmano;
        this.carte = [];
        this.haPozzetto = false;
        this.haChiuso = false;
        this.squadra = 0; // 0 = noi, 1 = loro

        // Personaggio (contiene tutti i dati innati: nome, descrizione, coefficienti)
        this.personaggio = personaggio;

        // Nome: da personaggio o passato come parametro (per giocatore umano)
        this.nome = personaggio?.nome || nome;

        // Record storico (persistente tra partite)
        this.scoreRecord = {
            vittorie: 0,
            sconfitte: 0,
            mediaPunti: 0,
            streak: 0,
            burrachiTotali: 0
        };

        // Carte che gli altri giocatori sanno che questo giocatore ha in mano
        // Si riempie quando pesca dagli scarti, si svuota quando scarta/cala
        // Ogni elemento: { cartaId, turnoScoperta }
        this.carteConosciute = [];

        // Osservazioni durante la partita (solo per bot)
        // Usate da Strategia per prendere decisioni
        if (!isUmano) {
            this.osservazioni = {
                // ========== ANALISI MANO (ricalcolata ogni turno) ==========
                // Possibili tris formabili: [{carte: [c1,c2,c3], punti, usaMatta}]
                possibiliTris: [],
                // Possibili scale formabili: [{carte: [...], punti, usaMatta, seme}]
                possibiliScale: [],
                // Possibili calate su combo esistenti: [{carta, comboId, posizione}]
                possibiliCalate: [],
                // Carte isolate che non formano nulla
                carteMorte: [],
                // Jolly e pinelle in mano
                matte: [],

                // ========== OPZIONI DI GIOCO ==========
                // Combinazioni di mosse non conflittuali, ordinate per valutazione
                // [{mosse: [...], carteUsate: Set, puntiTotali, valutazione}]
                opzioniGioco: [],

                // ========== MEMORIA AVVERSARI ==========
                // Carte che avversari sembrano cercare (da pesche scarti)
                carteRicercateAvversari: new Map(),
                // Ultimi scarti degli avversari (per inferire cosa NON cercano)
                scartiAvversari: [],

                // ========== LOG ==========
                logStrategico: []
            };
        }
    }

    // Getter per accesso rapido ai coefficienti del personaggio
    get coefficienti() {
        return this.personaggio?.coefficienti || null;
    }

    get descrizione() {
        return this.personaggio?.descrizione || '';
    }

    get numCarte() {
        return this.carte.length;
    }

    // Placeholder per persistenza
    caricaRecord() {
        // TODO: localStorage.getItem(`burraco_bot_${this.nome}`)
    }

    salvaRecord() {
        // TODO: localStorage.setItem(`burraco_bot_${this.nome}`, ...)
    }

    aggiornaRecord(esito, punti, burrachi = 0) {
        if (esito === 'vittoria') {
            this.scoreRecord.vittorie++;
            this.scoreRecord.streak++;
        } else {
            this.scoreRecord.sconfitte++;
            this.scoreRecord.streak = 0;
        }
        const totPartite = this.scoreRecord.vittorie + this.scoreRecord.sconfitte;
        if (totPartite > 0) {
            this.scoreRecord.mediaPunti =
                ((this.scoreRecord.mediaPunti * (totPartite - 1)) + punti) / totPartite;
        }
        this.scoreRecord.burrachiTotali += burrachi;
        this.salvaRecord();
    }
}

// ============================================================================
// STATO DEL GIOCO
// ============================================================================

const game = {
    // Configurazione
    modalita: '2v2',  // '1v1' o '2v2'

    // Giocatori
    giocatori: [],
    giocatoreCorrente: 0,

    // Mazzi e pile
    mazzo: [],
    scarti: [],
    pozzetti: [[], []],  // Due pozzetti

    // Combinazioni per squadra
    combinazioniNoi: [],
    combinazioniLoro: [],

    // Stato turno
    fase: 'attesa',  // 'attesa', 'pesca', 'gioco', 'scarta', 'finito'
    haPescato: false,
    carteSelezionate: [],
    ultimoTurno: false,  // true quando restano <= 2 carte nel mazzo

    // Punteggi
    puntiNoi: 0,
    puntiLoro: 0,

    // Undo
    stati: [],

    // Storia mosse
    storia: [],
    turno: 0,

    // Audio
    suoni: {},

    // UI
    trascinamento: null,

    // Combinazione su cui si puo' ancora spostare la matta (finestra temporale)
    combinazioneModificabile: null,

    // Torneo (partita a punti su più mani)
    // null = partita singola, oppure { limite, totNoi, totLoro, mano }
    torneo: null,

    // Debug/Cheat
    mostraTutteCarteScoperte: false,
    debugAI: false,           // Pausa l'AI per vedere le osservazioni (D per toggle)
    debugAIContinua: false,   // Flag per continuare dopo la pausa
};

// Esponi game globalmente per debug nei dev tools
window.game = game;
window.Strategia = Strategia;

// Mappa globale di tutte le carte per ID (per restore veloce)
let tutteLeCarte = {};
