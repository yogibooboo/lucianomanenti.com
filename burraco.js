'use strict';

// ============================================================================
// BURRACO - Gioco di carte italiano
// Versione 3.0 - Riscrittura completa
// Supporta 1v1 e 2v2
// ============================================================================

// ============================================================================
// COSTANTI
// ============================================================================

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
    2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5,
    8: 10, 9: 10, 10: 10, 11: 10, 12: 10, 13: 10,
    50: 30, 51: 30  // Jolly
};

// Punti burraco
const PUNTI_BURRACO_PULITO = 100;
const PUNTI_BURRACO_SPORCO = 50;
const PUNTI_CHIUSURA = 100;

// Azioni per storia
const AZIONE_PESCA_MAZZO = 1;
const AZIONE_PESCA_SCARTI = 2;
const AZIONE_SCARTO = 3;
const AZIONE_COMBINAZIONE = 4;
const AZIONE_ATTACCO = 5;
const AZIONE_POZZETTO = 6;

// Tipi di bot
const BOT_AGGRESSIVO = 1;    // Deposita subito, cerca chiusura rapida
const BOT_DIFENSIVO = 2;     // Aspetta burrachi, evita rischi
const BOT_BILANCIATO = 3;    // Mix equilibrato
const BOT_OPPORTUNISTA = 4;  // Adatta strategia in base al gioco

// Tratti speciali bot
const TRATTO_MEMORIA_LUNGA = 1;      // Ricorda più scarti avversari
const TRATTO_BURRACO_SPECIALIST = 2; // Preferisce burrachi puliti
const TRATTO_BLOCCANTE = 3;          // Evita scartare carte utili agli altri
const TRATTO_CHIUSURA_RAPIDA = 4;    // Cerca di chiudere velocemente
const TRATTO_PESCATORE = 5;          // Preferisce pescare da scarti

// ============================================================================
// PERSONAGGI PREDEFINITI
// ============================================================================

const PERSONAGGI = [
    // Aggressivi
    {
        id: 'giuseppe',
        nome: 'Giuseppe',
        avatar: 'giuseppe',
        botType: BOT_AGGRESSIVO,
        tratti: [TRATTO_CHIUSURA_RAPIDA],
        descrizione: 'Veterano impetuoso, vuole sempre chiudere per primo'
    },
    {
        id: 'rocco',
        nome: 'Rocco',
        avatar: 'rocco',
        botType: BOT_AGGRESSIVO,
        tratti: [TRATTO_MEMORIA_LUNGA],
        descrizione: 'Giocatore esperto, non dimentica nulla'
    },
    {
        id: 'teresa',
        nome: 'Teresa',
        avatar: 'teresa',
        botType: BOT_AGGRESSIVO,
        tratti: [TRATTO_PESCATORE],
        descrizione: 'Aggressiva ma calcolatrice, ama pescare dagli scarti'
    },

    // Difensivi
    {
        id: 'maria',
        nome: 'Maria',
        avatar: 'maria',
        botType: BOT_DIFENSIVO,
        tratti: [TRATTO_BLOCCANTE],
        descrizione: 'Prudente e strategica, non regala niente agli avversari'
    },
    {
        id: 'antonio',
        nome: 'Antonio',
        avatar: 'antonio',
        botType: BOT_DIFENSIVO,
        tratti: [TRATTO_BURRACO_SPECIALIST],
        descrizione: 'Paziente, aspetta sempre il burraco pulito'
    },
    {
        id: 'lucia',
        nome: 'Lucia',
        avatar: 'lucia',
        botType: BOT_DIFENSIVO,
        tratti: [TRATTO_MEMORIA_LUNGA, TRATTO_BLOCCANTE],
        descrizione: 'Nonna astuta, ricorda ogni carta scartata'
    },

    // Bilanciati
    {
        id: 'paolo',
        nome: 'Paolo',
        avatar: 'paolo',
        botType: BOT_BILANCIATO,
        tratti: [],
        descrizione: 'Giocatore solido, nessun punto debole'
    },
    {
        id: 'francesca',
        nome: 'Francesca',
        avatar: 'francesca',
        botType: BOT_BILANCIATO,
        tratti: [TRATTO_BURRACO_SPECIALIST],
        descrizione: 'Equilibrata ma ama i burrachi puliti'
    },
    {
        id: 'marco',
        nome: 'Marco',
        avatar: 'marco',
        botType: BOT_BILANCIATO,
        tratti: [TRATTO_MEMORIA_LUNGA],
        descrizione: 'Tranquillo ma attento, segue il gioco con cura'
    },

    // Opportunisti
    {
        id: 'carla',
        nome: 'Carla',
        avatar: 'carla',
        botType: BOT_OPPORTUNISTA,
        tratti: [TRATTO_PESCATORE],
        descrizione: 'Imprevedibile, si adatta a ogni situazione'
    },
    {
        id: 'sergio',
        nome: 'Sergio',
        avatar: 'sergio',
        botType: BOT_OPPORTUNISTA,
        tratti: [TRATTO_CHIUSURA_RAPIDA],
        descrizione: 'Furbo, approfitta di ogni occasione per chiudere'
    },
    {
        id: 'anna',
        nome: 'Anna',
        avatar: 'anna',
        botType: BOT_OPPORTUNISTA,
        tratti: [TRATTO_BLOCCANTE, TRATTO_PESCATORE],
        descrizione: 'Scaltra, cambia strategia a seconda degli avversari'
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

    get isPulito() {
        if (!this.isBurraco) return false;
        return !this.carte.some(c => c.isJolly || c.isPinella);
    }

    get puntiBurraco() {
        if (!this.isBurraco) return 0;
        return this.isPulito ? PUNTI_BURRACO_PULITO : PUNTI_BURRACO_SPORCO;
    }

    get puntiCarte() {
        return this.carte.reduce((sum, c) => sum + c.punti, 0);
    }

    get puntiTotali() {
        return this.puntiCarte + this.puntiBurraco;
    }
}

// ============================================================================
// CLASSE TRATTI INNATI (per AI)
// ============================================================================

class TrattiInnate {
    constructor(botType, scoreRecord = null, trattiPredefiniti = []) {
        this.botType = botType;

        // Pesi base (0.0 - 1.0) che influenzano le decisioni
        this.pesi = {
            aggressivita: 0.5,      // Tendenza a depositare subito
            prudenza: 0.5,          // Evita scartare carte "pericolose"
            memoria: 5,             // Quanti scarti ricorda (numero)
            preferenzaBurraco: 0.5, // Preferenza per burrachi vs chiusura rapida
            adattamento: 0.5        // Velocità di adattamento durante partita
        };

        // Tratti speciali (array di costanti TRATTO_*)
        this.tratti = [];

        // Configura pesi in base al tipo bot
        this.configuraPesiDaTipo(botType);

        // Usa tratti predefiniti se forniti, altrimenti genera da tipo
        if (trattiPredefiniti.length > 0) {
            this.tratti = [...trattiPredefiniti];
        } else {
            this.generaTrattiDaTipo(botType);
        }

        // Bonus da scoreRecord (se disponibile)
        if (scoreRecord) {
            this.applicaBonusRecord(scoreRecord);
        }
    }

    configuraPesiDaTipo(botType) {
        switch (botType) {
            case BOT_AGGRESSIVO:
                this.pesi.aggressivita = 0.8;
                this.pesi.prudenza = 0.3;
                this.pesi.preferenzaBurraco = 0.3;
                break;

            case BOT_DIFENSIVO:
                this.pesi.aggressivita = 0.3;
                this.pesi.prudenza = 0.8;
                this.pesi.preferenzaBurraco = 0.8;
                this.pesi.memoria = 8;
                break;

            case BOT_BILANCIATO:
                // Valori default già bilanciati
                this.pesi.memoria = 6;
                break;

            case BOT_OPPORTUNISTA:
                this.pesi.adattamento = 0.8;
                this.pesi.memoria = 10;
                break;
        }
    }

    generaTrattiDaTipo(botType) {
        // Tratti di default per tipo (usati solo se non ci sono tratti predefiniti)
        switch (botType) {
            case BOT_AGGRESSIVO:
                this.tratti.push(TRATTO_CHIUSURA_RAPIDA);
                break;
            case BOT_DIFENSIVO:
                this.tratti.push(TRATTO_BURRACO_SPECIALIST);
                break;
            case BOT_OPPORTUNISTA:
                this.tratti.push(TRATTO_MEMORIA_LUNGA);
                this.tratti.push(TRATTO_PESCATORE);
                break;
            // BOT_BILANCIATO: nessun tratto speciale di default
        }
    }

    applicaBonusRecord(scoreRecord) {
        // Bot "veterano" con molte vittorie
        if (scoreRecord.vittorie > 10) {
            this.pesi.adattamento += 0.1;
        }
        // In forma (streak positiva)
        if (scoreRecord.streak > 3) {
            this.pesi.aggressivita += 0.1;
        }
        // Specialista burraco
        if (scoreRecord.burrachiTotali > 20) {
            if (!this.tratti.includes(TRATTO_BURRACO_SPECIALIST)) {
                this.tratti.push(TRATTO_BURRACO_SPECIALIST);
            }
        }
    }

    haTratti(tratto) {
        return this.tratti.includes(tratto);
    }
}

// ============================================================================
// CLASSE STRATEGIA (logica decisionale AI)
// ============================================================================

class Strategia {
    constructor(giocatore) {
        this.giocatore = giocatore;
        this.tratti = giocatore.trattiInnate;

        // Osservazioni durante la partita
        this.osservazioni = {
            carteVerniciateAvversari: new Map(), // Carte che avversari sembrano cercare
            probabiliScale: [],                   // Scale probabili degli avversari
            probabiliTris: []                     // Tris probabili degli avversari
        };
    }

    // Analizza la storia per capire cosa fanno gli avversari
    analizzaScartiAvversari() {
        const squadraBot = this.giocatore.squadra;
        const memoria = this.tratti.pesi.memoria;

        // Filtra scarti degli avversari (squadra opposta)
        const scartiAvv = game.storia.filter(m =>
            m.azione === AZIONE_SCARTO &&
            game.giocatori[m.giocatore] &&
            game.giocatori[m.giocatore].squadra !== squadraBot
        );

        // Ritorna ultimi N in base alla memoria
        return scartiAvv.slice(-memoria).map(m => ({
            giocatore: m.giocatore,
            carta: tutteLeCarte[m.carta]
        }));
    }

    // Analizza pesche da scarti per dedurre cosa cercano
    analizzaPescheScarti() {
        const squadraBot = this.giocatore.squadra;

        return game.storia.filter(m =>
            m.azione === AZIONE_PESCA_SCARTI &&
            game.giocatori[m.giocatore] &&
            game.giocatori[m.giocatore].squadra !== squadraBot
        );
    }

    // Decisione: pescare da scarti o da mazzo?
    decidiFontePesca() {
        if (game.scarti.length === 0) return 'mazzo';

        const cartaInCima = game.scarti[game.scarti.length - 1];
        const mano = this.giocatore.carte;

        // Controlla se la carta forma combinazione immediata
        const formaCombinazione = this.cartaFormaCombinazione(cartaInCima, mano);

        // Controlla se può attaccare a combinazione esistente
        const puoAttaccare = this.cartaPuoAttaccare(cartaInCima);

        // Calcola punteggio decisione
        let punteggio = 0;

        if (formaCombinazione) punteggio += 0.6;
        if (puoAttaccare) punteggio += 0.3;

        // Aggressivo: più propenso a pescare da scarti
        punteggio += (this.tratti.pesi.aggressivita - 0.5) * 0.2;

        // Tratto pescatore: bonus
        if (this.tratti.haTratti(TRATTO_PESCATORE)) {
            punteggio += 0.15;
        }

        // Ma attenzione: pescare da scarti prende TUTTE le carte
        if (game.scarti.length > 5) {
            punteggio -= 0.1; // Penalità per troppe carte
        }

        return punteggio > 0.4 ? 'scarti' : 'mazzo';
    }

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
            if (stessoSeme[i+1].numero === stessoSeme[i].numero + 1 &&
                stessoSeme[i+2].numero === stessoSeme[i].numero + 2) {
                return true;
            }
        }

        return false;
    }

    // Verifica se carta può attaccare combinazione esistente
    cartaPuoAttaccare(carta) {
        const combinazioni = this.giocatore.squadra === 0 ?
            game.combinazioniNoi : game.combinazioniLoro;

        for (const comb of combinazioni) {
            // Usa la funzione esistente se disponibile
            if (typeof puoAggiungereACombinazione === 'function') {
                if (puoAggiungereACombinazione(carta, comb)) return true;
            }
        }
        return false;
    }

    // Decisione: quale carta scartare?
    scegliCartaDaScartare() {
        const mano = this.giocatore.carte;
        if (mano.length === 0) return null;

        // Calcola punteggio per ogni carta (più alto = più scartabile)
        const punteggi = mano.map(carta => ({
            carta: carta,
            punteggio: this.calcolaPunteggioScarto(carta)
        }));

        // Ordina per punteggio decrescente
        punteggi.sort((a, b) => b.punteggio - a.punteggio);

        return punteggi[0].carta;
    }

    calcolaPunteggioScarto(carta) {
        let punteggio = 0;
        const mano = this.giocatore.carte;

        // Carte isolate (non formano combinazioni) sono più scartabili
        const stessoNumero = mano.filter(c => c.numero === carta.numero).length;
        const stessoSeme = mano.filter(c => c.seme === carta.seme).length;

        if (stessoNumero === 1) punteggio += 0.3;  // Carta isolata per tris
        if (stessoSeme <= 2) punteggio += 0.2;     // Poche carte stesso seme

        // Carte alte valgono più punti negativi se restano in mano
        punteggio += (carta.punti / 15) * 0.2;

        // Jolly e pinelle: MAI scartare (punteggio molto basso)
        if (carta.isJolly) punteggio -= 1.0;
        if (carta.isPinella) punteggio -= 0.5;

        // Prudenza: evita scartare carte che potrebbero servire agli avversari
        if (this.tratti.pesi.prudenza > 0.5) {
            const scartiAvv = this.analizzaScartiAvversari();
            // Se avversari scartano carte simili, probabilmente non le cercano
            const avvHaScartato = scartiAvv.some(s =>
                s.carta && s.carta.numero === carta.numero
            );
            if (!avvHaScartato) {
                punteggio -= this.tratti.pesi.prudenza * 0.2;
            }
        }

        // Tratto bloccante: penalizza carte che potrebbero aiutare avversari
        if (this.tratti.haTratti(TRATTO_BLOCCANTE)) {
            // Carte medie (5-9) sono più "pericolose"
            if (carta.numero >= 5 && carta.numero <= 9) {
                punteggio -= 0.15;
            }
        }

        return punteggio;
    }

    // Decisione: depositare combinazione?
    dovrebbiDepositare(carte) {
        // Verifica se è combinazione valida
        if (typeof verificaCombinazione === 'function') {
            const risultato = verificaCombinazione(carte);
            if (!risultato.valida) return false;
        }

        const numCarte = carte.length;

        // Aggressivo: deposita sempre
        if (this.tratti.pesi.aggressivita > 0.7) return true;

        // Specialist burraco: aspetta se vicino a 7 carte
        if (this.tratti.haTratti(TRATTO_BURRACO_SPECIALIST)) {
            if (numCarte >= 5 && numCarte < 7) {
                // Controlla se può facilmente arrivare a 7
                return false;
            }
        }

        // Chiusura rapida: deposita se ha poche carte
        if (this.tratti.haTratti(TRATTO_CHIUSURA_RAPIDA)) {
            if (this.giocatore.carte.length <= 5) return true;
        }

        // Default: deposita se >= 4 carte o burraco
        return numCarte >= 4 || numCarte >= 7;
    }
}

// ============================================================================
// CLASSE GIOCATORE
// ============================================================================

class Giocatore {
    // Può ricevere un personaggio predefinito o parametri singoli
    constructor(nome, posizione, isUmano = false, personaggioOBotType = null) {
        this.posizione = posizione; // 'bottom', 'top', 'left', 'right'
        this.isUmano = isUmano;
        this.carte = [];
        this.haPozzetto = false;
        this.haChiuso = false;
        this.squadra = 0; // 0 = noi, 1 = loro

        // Se è un personaggio predefinito (oggetto con id, avatar, etc.)
        if (personaggioOBotType && typeof personaggioOBotType === 'object') {
            this.personaggio = personaggioOBotType;
            this.nome = personaggioOBotType.nome;
            this.avatar = personaggioOBotType.avatar;
            this.botType = personaggioOBotType.botType;
            this.trattiPredefiniti = personaggioOBotType.tratti || [];
            this.descrizione = personaggioOBotType.descrizione;
        } else {
            // Fallback: parametri singoli (per retrocompatibilità e giocatore umano)
            this.nome = nome;
            this.avatar = null;
            this.botType = personaggioOBotType || BOT_BILANCIATO;
            this.trattiPredefiniti = [];
            this.descrizione = '';
        }

        this.scoreRecord = {
            vittorie: 0,
            sconfitte: 0,
            mediaPunti: 0,
            streak: 0,
            burrachiTotali: 0
        };

        // Tratti e strategia (solo per bot)
        if (!isUmano) {
            this.trattiInnate = new TrattiInnate(this.botType, this.scoreRecord, this.trattiPredefiniti);
            this.strategia = new Strategia(this);
        }
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

    // Debug/Cheat
    mostraTutteCarteScoperte: false,
};

// Esponi game globalmente per debug nei dev tools
window.game = game;

// ============================================================================
// FUNZIONI UTILITA
// ============================================================================

function $(sel) {
    return document.querySelector(sel);
}

function $$(sel) {
    return document.querySelectorAll(sel);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function playSound(nome) {
    const audio = game.suoni[nome];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// Crea uno snapshot dello stato corrente del gioco
function creaSnapshot() {
    // Funzione helper per estrarre stato carte speciali (jolly/pinella usate come matta)
    const estraiCarteSpeciali = () => {
        const speciali = {};
        // Cerca in tutte le combinazioni
        [...game.combinazioniNoi, ...game.combinazioniLoro].forEach(comb => {
            comb.carte.forEach(c => {
                if (c.jollycomeNumero !== null) {
                    speciali[c.id] = { jollycomeNumero: c.jollycomeNumero };
                }
            });
        });
        return speciali;
    };

    // Funzione helper per estrarre stato faceUp di tutte le carte
    const estraiFaceUp = () => {
        const faceUpMap = {};
        Object.values(tutteLeCarte).forEach(c => {
            faceUpMap[c.id] = c.faceUp;
        });
        return faceUpMap;
    };

    // Funzione helper per serializzare una combinazione
    const serializzaCombinazione = (comb) => ({
        id: comb.id,
        tipo: comb.tipo,
        carte: comb.carte.map(c => c.id),
        seme: comb.seme,
        numero: comb.numero,
        assoAlto: comb.assoAlto || false
    });

    return {
        mazzo: game.mazzo.map(c => c.id),
        scarti: game.scarti.map(c => c.id),
        pozzetti: [
            game.pozzetti[0].map(c => c.id),
            game.pozzetti[1].map(c => c.id)
        ],
        mani: game.giocatori.map(g => g.carte.map(c => c.id)),
        combinazioniNoi: game.combinazioniNoi.map(serializzaCombinazione),
        combinazioniLoro: game.combinazioniLoro.map(serializzaCombinazione),
        carteSpeciali: estraiCarteSpeciali(),
        faceUp: estraiFaceUp(),
        puntiNoi: game.puntiNoi,
        puntiLoro: game.puntiLoro,
        haPozzetto: game.giocatori.map(g => g.haPozzetto),
        fase: game.fase,
        haPescato: game.haPescato
    };
}

// Mappa globale di tutte le carte per ID (per restore veloce)
let tutteLeCarte = {};

// Ripristina lo stato del gioco da uno snapshot
function ripristinaSnapshot(snapshot) {
    // Helper per trovare carta per ID
    const getCarta = (id) => tutteLeCarte[id];

    // Ripristina mazzo
    game.mazzo = snapshot.mazzo.map(getCarta);

    // Ripristina scarti
    game.scarti = snapshot.scarti.map(getCarta);

    // Ripristina pozzetti
    game.pozzetti[0] = snapshot.pozzetti[0].map(getCarta);
    game.pozzetti[1] = snapshot.pozzetti[1].map(getCarta);

    // Ripristina mani giocatori
    game.giocatori.forEach((g, i) => {
        g.carte = snapshot.mani[i].map(getCarta);
        g.haPozzetto = snapshot.haPozzetto[i];
    });

    // Reset stato carte (prima di ricostruire combinazioni)
    Object.values(tutteLeCarte).forEach(c => {
        c.inCombinazione = false;
        c.idCombinazione = -1;
        c.jollycomeNumero = null;
        c.selezionata = false;
    });

    // Ripristina combinazioni Noi
    game.combinazioniNoi = snapshot.combinazioniNoi.map(snapComb => {
        const comb = new Combinazione(snapComb.id, snapComb.tipo, []);
        comb.carte = snapComb.carte.map(getCarta);
        comb.seme = snapComb.seme;
        comb.numero = snapComb.numero;
        comb.assoAlto = snapComb.assoAlto;
        // Marca carte come in combinazione
        comb.carte.forEach(c => {
            c.inCombinazione = true;
            c.idCombinazione = comb.id;
        });
        return comb;
    });

    // Ripristina combinazioni Loro
    game.combinazioniLoro = snapshot.combinazioniLoro.map(snapComb => {
        const comb = new Combinazione(snapComb.id, snapComb.tipo, []);
        comb.carte = snapComb.carte.map(getCarta);
        comb.seme = snapComb.seme;
        comb.numero = snapComb.numero;
        comb.assoAlto = snapComb.assoAlto;
        comb.carte.forEach(c => {
            c.inCombinazione = true;
            c.idCombinazione = comb.id;
        });
        return comb;
    });

    // Ripristina stato carte speciali (jolly/pinella come matta)
    Object.entries(snapshot.carteSpeciali).forEach(([id, stato]) => {
        const carta = getCarta(parseInt(id));
        if (carta) {
            carta.jollycomeNumero = stato.jollycomeNumero;
        }
    });

    // Ripristina stato faceUp di tutte le carte
    if (snapshot.faceUp) {
        Object.entries(snapshot.faceUp).forEach(([id, faceUp]) => {
            const carta = getCarta(parseInt(id));
            if (carta) {
                carta.faceUp = faceUp;
            }
        });
    }

    // Ripristina punteggi e stato
    game.puntiNoi = snapshot.puntiNoi;
    game.puntiLoro = snapshot.puntiLoro;
    game.fase = snapshot.fase;
    game.haPescato = snapshot.haPescato;
    game.carteSelezionate = [];
    game.combinazioneModificabile = null;
}

// Registra una mossa nella storia (con snapshot)
function registraMossa(azione, dettagli = {}) {
    const mossa = {
        turno: game.turno,
        giocatore: game.giocatoreCorrente,
        azione: azione,
        snapshot: creaSnapshot(),
        ...dettagli
    };
    game.storia.push(mossa);
    if (game.debugMode) {
        console.log('Storia:', mossa);
    }
}

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================

function init() {
    console.log('Burraco 3.0 - Inizializzazione');

    // Carica suoni
    game.suoni = {
        pesca: $('#snd-pesca'),
        scarta: $('#snd-scarta'),
        combinazione: $('#snd-combinazione'),
        ordina: $('#snd-ordina'),
        vittoria: $('#snd-vittoria'),
        sconfitta: $('#snd-sconfitta'),
        pozzetto: $('#snd-pozzetto'),
        burraco: $('#snd-burraco')
    };

    // Setup eventi UI
    setupEventi();

    // Avvia partita direttamente in modalita 2v2
    iniziaPartita();
}

function setupEventi() {
    // Pulsanti
    $('#btn-istruzioni').addEventListener('click', () => mostraModal('modal-istruzioni'));
    $('#btn-nuova').addEventListener('click', () => mostraModal('modal-nuova'));
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-scoperte').addEventListener('click', toggleScoperte);
    $('#btn-ordina-numero').addEventListener('click', ordinaPerNumero);
    $('#btn-ordina-seme').addEventListener('click', ordinaPerSeme);

    // Modal
    $$('.btn-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            chiudiModals();
        });
    });

    $('#btn-inizia').addEventListener('click', iniziaPartita);

    $$('.btn-nuova-partita').forEach(btn => {
        btn.addEventListener('click', () => {
            chiudiModals();
            mostraModal('modal-nuova');
        });
    });

    // Mazzo
    $('#mazzo').addEventListener('click', pescaDaMazzo);

    // Click su area giocatore (spazio vuoto) = pesca da mazzo
    $('#area-giocatore').addEventListener('click', (e) => {
        // Solo se click su area vuota (non su una carta)
        if (!e.target.classList.contains('carta')) {
            pescaDaMazzo();
        }
    });

    // Scarti
    $('#scarti-container').addEventListener('click', pescaDaScarti);

    // Aree combinazioni (entrambe funzionano per depositare, in caso di overflow)
    $('#combinazioni-noi').addEventListener('click', depositaCombinazione);
    $('#combinazioni-loro').addEventListener('click', depositaCombinazione);

    // DEBUG: click su pozzetto1 aggiunge carta a ogni giocatore
    $('#pozzetto1').addEventListener('click', testAggiungiCarta);

    // Eventi globali mouse/touch per trascinamento
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('contextmenu', onRightClick);

    // Touch
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    // DEBUG: Ctrl+Alt+T per mettere tutte le carte del mazzo nella mano del giocatore
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            if (game.mazzo && game.mazzo.length > 0) {
                console.log('DEBUG: Spostamento tutte le carte del mazzo al giocatore');
                while (game.mazzo.length > 0) {
                    const carta = game.mazzo.pop();
                    carta.faceUp = true;
                    game.giocatori[0].carte.push(carta);
                }
                ordinaCarte(game.giocatori[0].carte);
                render();
                console.log('DEBUG: Carte nella mano del giocatore:', game.giocatori[0].carte.length);
            } else {
                console.log('DEBUG: Mazzo vuoto o partita non iniziata');
            }
        }
        // Ctrl+Alt+D per finestra diagnostica
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            toggleDiagnostica();
        }
    });
}

// ============================================================================
// GESTIONE PARTITA
// ============================================================================

function iniziaPartita() {
    console.log('Nuova partita');
    chiudiModals();

    // Leggi modalita
    const modalitaRadio = document.querySelector('input[name="modalita"]:checked');
    game.modalita = modalitaRadio ? modalitaRadio.value : '2v2';

    // Applica classe CSS per modalita
    document.body.classList.remove('modalita-1v1', 'modalita-2v2');
    document.body.classList.add('modalita-' + game.modalita);

    // Reset stato
    game.stati = [];
    game.carteSelezionate = [];
    game.combinazioniNoi = [];
    game.combinazioniLoro = [];
    game.puntiNoi = 0;
    game.puntiLoro = 0;
    game.storia = [];
    game.turno = 0;

    // Crea giocatori
    creaGiocatori();

    // Crea mazzo
    creaMazzo();

    // Mischia
    shuffle(game.mazzo);
    shuffle(game.mazzo);

    // Distribuisci carte
    distribuisciCarte();

    // Render iniziale
    render();

    // Inizia turno giocatore
    game.giocatoreCorrente = 0;
    game.fase = 'pesca';
    game.haPescato = false;

    aggiornaIndicatoreTurno();
}

function creaGiocatori() {
    game.giocatori = [];

    // Seleziona personaggi casuali per i bot
    const numBot = game.modalita === '2v2' ? 3 : 1;
    const personaggiSelezionati = selezionaPersonaggiCasuali(numBot);

    if (game.modalita === '2v2') {
        // 2 vs 2
        // Giocatore umano
        game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        game.giocatori[0].squadra = 0;

        // Avversario 1 (personaggio casuale)
        game.giocatori.push(new Giocatore(null, 'left', false, personaggiSelezionati[0]));
        game.giocatori[1].squadra = 1;

        // Compagno (personaggio casuale)
        game.giocatori.push(new Giocatore(null, 'top', false, personaggiSelezionati[1]));
        game.giocatori[2].squadra = 0;

        // Avversario 2 (personaggio casuale)
        game.giocatori.push(new Giocatore(null, 'right', false, personaggiSelezionati[2]));
        game.giocatori[3].squadra = 1;
    } else {
        // 1 vs 1
        game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        game.giocatori[0].squadra = 0;

        // Avversario (personaggio casuale)
        game.giocatori.push(new Giocatore(null, 'left', false, personaggiSelezionati[0]));
        game.giocatori[1].squadra = 1;
    }

    // Salva personaggi selezionati nel game per riferimento
    game.personaggiInGioco = personaggiSelezionati;

    // Log per debug
    const NOMI_TRATTI = {
        [TRATTO_MEMORIA_LUNGA]: 'Memoria Lunga',
        [TRATTO_BURRACO_SPECIALIST]: 'Specialista Burraco',
        [TRATTO_BLOCCANTE]: 'Bloccante',
        [TRATTO_CHIUSURA_RAPIDA]: 'Chiusura Rapida',
        [TRATTO_PESCATORE]: 'Pescatore'
    };
    const NOMI_BOT = ['', 'Aggressivo', 'Difensivo', 'Bilanciato', 'Opportunista'];

    game.giocatori.forEach((g) => {
        if (!g.isUmano) {
            const tipoBotNome = NOMI_BOT[g.botType] || 'Sconosciuto';
            const trattiNomi = g.trattiInnate.tratti.map(t => NOMI_TRATTI[t] || t).join(', ') || 'nessuno';
            console.log(`${g.nome}: ${tipoBotNome} - Tratti: ${trattiNomi}`);
            if (g.descrizione) {
                console.log(`  "${g.descrizione}"`);
            }
        }
    });
}

function creaMazzo() {
    game.mazzo = [];
    game.scarti = [];
    game.pozzetti = [[], []];

    let id = 0;

    // Due mazzi di carte
    for (let m = 0; m < 2; m++) {
        // Carte normali
        for (const seme of SEMI) {
            for (let num = 1; num <= 13; num++) {
                game.mazzo.push(new Carta(seme, num, m, id++));
            }
        }
        // Jolly
        game.mazzo.push(new Carta('J', 50, m, id++));
        game.mazzo.push(new Carta('J', 51, m, id++));
    }

    // Crea mappa globale per lookup veloce
    tutteLeCarte = {};
    game.mazzo.forEach(c => tutteLeCarte[c.id] = c);

    console.log('Mazzo creato:', game.mazzo.length, 'carte');
}

function distribuisciCarte() {
    const numCarte = 11;

    // Distribuisci a ogni giocatore
    for (const giocatore of game.giocatori) {
        giocatore.carte = [];
        for (let i = 0; i < numCarte; i++) {
            const carta = game.mazzo.pop();
            if (giocatore.isUmano) {
                carta.faceUp = true;
            }
            giocatore.carte.push(carta);
        }
        // Ordina carte
        ordinaCarte(giocatore.carte);
    }

    // Crea pozzetti (11 carte ciascuno)
    for (let p = 0; p < 2; p++) {
        game.pozzetti[p] = [];
        for (let i = 0; i < 11; i++) {
            game.pozzetti[p].push(game.mazzo.pop());
        }
    }

    // Prima carta negli scarti
    const primaScarto = game.mazzo.pop();
    primaScarto.faceUp = true;
    game.scarti.push(primaScarto);

    console.log('Carte distribuite');
    console.log('Mazzo rimanente:', game.mazzo.length);
    console.log('Pozzetti:', game.pozzetti[0].length, game.pozzetti[1].length);
}

// ============================================================================
// RENDERING
// ============================================================================

function render() {
    renderMazzo();
    renderScarti();
    renderPozzetti();
    renderGiocatori();
    renderCombinazioni();
    renderPunteggi();
    renderUndoButton();
}

function renderMazzo() {
    const mazzoEl = $('#mazzo');
    if (game.mazzo.length === 0) {
        mazzoEl.style.opacity = '0.3';
        mazzoEl.style.backgroundPosition = '-1136px 0';  // Retro rosso default
    } else {
        mazzoEl.style.opacity = '1';
        const cartaCima = game.mazzo[game.mazzo.length - 1];
        // Se scoperte attivo, mostra la carta in cima
        if (game.mostraTutteCarteScoperte) {
            const pos = getCartaSpritePosition(cartaCima, true);
            mazzoEl.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        } else {
            // Mostra il dorso corretto in base al mazzo della carta in cima
            const pos = getCartaSpritePosition(cartaCima, false);
            mazzoEl.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        }
    }
}

// Helper per calcolare posizione sprite
function getCartaSpritePosition(carta, faceUp) {
    const stepX = -71;
    const stepY = -96;

    if (!faceUp) {
        return { x: stepX * 16, y: stepY * carta.mazzo };
    }

    if (carta.numero >= 50) {
        // Jolly
        const jollyRow = carta.numero - 50;
        return { x: stepX * 13, y: stepY * jollyRow };
    }

    // Carte normali
    const col = carta.numero - 1;
    const row = VALORI_SEMI[carta.seme];
    return { x: stepX * col, y: stepY * row };
}

function renderScarti() {
    const container = $('#scarti-container');
    container.innerHTML = '';

    // Mostra tutte le carte scartate
    const overlap = 20;

    for (let i = 0; i < game.scarti.length; i++) {
        const carta = game.scarti[i];
        const el = creaElementoCarta(carta);
        el.classList.add('scarto');
        el.style.position = 'absolute';
        el.style.left = (-5 + i * overlap) + 'px';
        el.style.top = '-7px';
        el.style.zIndex = i;
        container.appendChild(el);
    }
}

function renderPozzetti() {
    const poz1 = $('#pozzetto1');
    const poz2 = $('#pozzetto2');

    if (game.pozzetti[0].length === 0) {
        poz1.classList.add('nascosto');
    } else {
        poz1.classList.remove('nascosto');
        const cartaCima = game.pozzetti[0][game.pozzetti[0].length - 1];
        // Se scoperte attivo, mostra la carta in cima
        if (game.mostraTutteCarteScoperte) {
            const pos = getCartaSpritePosition(cartaCima, true);
            poz1.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        } else {
            // Mostra il dorso corretto in base al mazzo della carta in cima
            const pos = getCartaSpritePosition(cartaCima, false);
            poz1.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        }
    }

    if (game.pozzetti[1].length === 0) {
        poz2.classList.add('nascosto');
    } else {
        poz2.classList.remove('nascosto');
        const cartaCima = game.pozzetti[1][game.pozzetti[1].length - 1];
        // Se scoperte attivo, mostra la carta in cima
        if (game.mostraTutteCarteScoperte) {
            const pos = getCartaSpritePosition(cartaCima, true);
            poz2.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        } else {
            // Mostra il dorso corretto in base al mazzo della carta in cima
            const pos = getCartaSpritePosition(cartaCima, false);
            poz2.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        }
    }
}

function renderGiocatori() {
    // Giocatore principale (bottom)
    renderManoGiocatore(game.giocatori[0], '#carte-giocatore');

    if (game.modalita === '2v2') {
        // Compagno (top)
        renderManoAvversario(game.giocatori[2], '#carte-compagno', '#ncarte-compagno');
        $('#nome-compagno').textContent = game.giocatori[2].nome;

        // Avversario sinistra
        renderManoAvversario(game.giocatori[1], '#carte-avv-sx', '#ncarte-avv-sx');
        $('#nome-avv-sx').textContent = game.giocatori[1].nome;

        // Avversario destra
        renderManoAvversario(game.giocatori[3], '#carte-avv-dx', '#ncarte-avv-dx');
        $('#nome-avv-dx').textContent = game.giocatori[3].nome;
    } else {
        // 1v1 - solo avversario in alto
        renderManoAvversario(game.giocatori[1], '#carte-avv-sx', '#ncarte-avv-sx');
        $('#nome-avv-sx').textContent = game.giocatori[1].nome;
    }
}

function renderManoGiocatore(giocatore, containerSel) {
    const container = $(containerSel);
    container.innerHTML = '';

    // Aggiorna contatore carte
    const contatore = $('#ncarte-giocatore');
    if (contatore) {
        contatore.textContent = giocatore.carte.length;
    }

    const numCarte = giocatore.carte.length;
    // Carte piccole: 52px di larghezza visiva (71px * 0.73 scale)
    const cartaW = 52;
    // Overlap di 2/3: mostra solo 1/3 della carta = ~17px
    const overlapBase = 17;
    const maxWidth = 620;

    // Calcola overlap - usa overlapBase ma riduci se troppe carte
    const spazioNecessario = (numCarte - 1) * overlapBase + cartaW;
    let overlap;
    if (spazioNecessario <= maxWidth) {
        overlap = overlapBase;
    } else {
        // Riduci overlap per far stare tutte le carte
        overlap = (maxWidth - cartaW) / Math.max(1, numCarte - 1);
    }

    giocatore.carte.forEach((carta, i) => {
        const el = creaElementoCarta(carta);
        el.style.position = 'absolute';
        el.style.left = (i * overlap) + 'px';
        el.style.bottom = '0px';
        el.style.zIndex = i;

        if (carta.selezionata) {
            el.classList.add('selezionata');
        }

        container.appendChild(el);
        carta.elemento = el;
    });
}

function renderManoAvversario(giocatore, containerSel, contatoreSel) {
    const container = $(containerSel);
    const contatore = $(contatoreSel);

    container.innerHTML = '';

    if (contatore) {
        contatore.textContent = giocatore.carte.length;
    }

    // Mostra carte sovrapposte
    const numCarte = giocatore.carte.length;
    const isVertical = giocatore.posizione === 'left' || giocatore.posizione === 'right';
    const isRightPlayer = giocatore.posizione === 'right';
    const isTopPlayer = giocatore.posizione === 'top';
    const overlap = isVertical ? 15 : 20;

    for (let i = 0; i < numCarte; i++) {
        const carta = giocatore.carte[i];
        let el;

        if (carta.faceUp) {
            // Carta scoperta - usa creaElementoCarta
            el = creaElementoCarta(carta);
        } else {
            // Carta coperta
            el = document.createElement('div');
            el.className = 'carta coperta mazzo-' + carta.mazzo;
        }

        if (isVertical) {
            el.classList.add('piccola');
        }
        el.style.position = 'absolute';

        if (isVertical) {
            el.style.left = '40px';
            if (isRightPlayer) {
                // Avversario destra: prima carta vicino al fondo dello schermo
                el.style.bottom = (-45 + i * overlap) + 'px';
                el.style.top = 'auto';
            } else {
                // Avversario sinistra: prima carta vicino alla cima dello schermo
                el.style.top = (5 + i * overlap) + 'px';
            }
        } else {
            if (isTopPlayer) {
                // Compagno: prima carta al bordo destro, le altre verso sinistra
                el.style.right = (-210 + i * overlap) + 'px';
                el.style.left = 'auto';
                el.style.top = '-35px';
            } else {
                el.style.left = (i * overlap) + 'px';
                el.style.top = '0px';
            }
        }
        el.style.zIndex = i;

        container.appendChild(el);
    }
}

function renderCombinazioni() {
    renderAreaCombinazioni(game.combinazioniNoi, '#combinazioni-noi');
    renderAreaCombinazioni(game.combinazioniLoro, '#combinazioni-loro');
}

function renderAreaCombinazioni(combinazioni, containerSel) {
    const container = $(containerSel);
    // Mantieni il titolo
    const titolo = container.querySelector('.titolo-area');
    container.innerHTML = '';
    if (titolo) container.appendChild(titolo);

    for (const comb of combinazioni) {
        const combEl = document.createElement('div');
        combEl.className = 'combinazione';

        if (comb.isBurraco) {
            combEl.classList.add(comb.isPulito ? 'burraco-pulito' : 'burraco-sporco');
        }

        // Per le scale, visualizza in ordine discendente (dal valore piu' alto al piu' basso)
        let carteOrdinare = comb.carte;
        if (comb.tipo === TIPO_SCALA) {
            carteOrdinare = [...comb.carte].sort((a, b) => {
                // Gestisci matte: mettile in base alla loro posizione logica
                // Per pinella naturale (jollycomeNumero = null), usa c.numero
                let numA = isCartaMatta(a) ? a.jollycomeNumero : a.numero;
                let numB = isCartaMatta(b) ? b.jollycomeNumero : b.numero;
                // Asso alto (dopo il K) vale 14 SOLO se la scala e' assoAlto
                if (comb.assoAlto) {
                    if (numA === 1) numA = 14;
                    if (numB === 1) numB = 14;
                }
                return numB - numA; // Discendente
            });
        }

        for (const carta of carteOrdinare) {
            const cartaEl = creaElementoCarta(carta);
            cartaEl.style.position = 'relative';
            // Usa sprite blu per matte (jolly e pinella usata come matta)
            if (isCartaMatta(carta)) {
                cartaEl.style.backgroundImage = 'url(images/scala40/conjollyselblu.png)';
            }
            combEl.appendChild(cartaEl);
        }

        container.appendChild(combEl);
    }
}

function renderPunteggi() {
    $('#punti-noi').textContent = game.puntiNoi;
    $('#punti-loro').textContent = game.puntiLoro;
}

function renderUndoButton() {
    // Conta quanti turni del giocatore umano ci sono nella storia
    const turniUmano = game.storia.filter(m =>
        m.giocatore === 0 &&
        (m.azione === AZIONE_PESCA_MAZZO || m.azione === AZIONE_PESCA_SCARTI)
    ).length;
    $('#btn-undo').textContent = `UNDO (${turniUmano})`;
}

function creaElementoCarta(carta) {
    const el = document.createElement('div');
    el.className = 'carta';
    el.dataset.cartaId = carta.id;

    const pos = carta.getSpritePosition();
    el.style.backgroundPosition = `${pos.x}px ${pos.y}px`;

    return el;
}

// ============================================================================
// ANIMAZIONE CARTE
// ============================================================================

function animaCarta(carta, daElemento, aElemento, opzioni = {}) {
    return new Promise((resolve) => {
        const durata = opzioni.durata || 300;
        const mostraFronte = opzioni.mostraFronte !== undefined ? opzioni.mostraFronte : carta.faceUp;
        const rotazioneIniziale = opzioni.rotazioneIniziale || 0;
        const rotazioneFinale = opzioni.rotazioneFinale || 0;

        // Calcola posizioni assolute nel viewport
        const daRect = daElemento.getBoundingClientRect();
        const aRect = aElemento.getBoundingClientRect();

        // Crea elemento carta volante con position fixed per evitare problemi di coordinate
        const cartaVolante = document.createElement('div');
        cartaVolante.className = 'carta';

        // Imposta l'aspetto della carta
        if (mostraFronte) {
            const pos = carta.getSpritePosition();
            cartaVolante.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        } else {
            const pos = getCartaSpritePosition(carta, false);
            cartaVolante.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        }

        // Posizione iniziale usando fixed (coordinate viewport)
        // Compensa l'offset se la carta di partenza è ruotata di 90 gradi
        let inizioLeft = daRect.left;
        let inizioTop = daRect.top;
        if (rotazioneIniziale === 90) {
            inizioLeft += 70;  // Compensa lo spostamento causato dalla rotazione (altezza carta scalata)
        }
        cartaVolante.style.position = 'fixed';
        cartaVolante.style.left = inizioLeft + 'px';
        cartaVolante.style.top = inizioTop + 'px';
        cartaVolante.style.width = '71px';
        cartaVolante.style.height = '96px';
        cartaVolante.style.zIndex = '10000';
        cartaVolante.style.pointerEvents = 'none';
        cartaVolante.style.transform = `scale(0.73) rotate(${rotazioneIniziale}deg)`;
        cartaVolante.style.transformOrigin = 'top left';
        cartaVolante.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.5)';

        document.body.appendChild(cartaVolante);

        // Forza reflow
        cartaVolante.offsetHeight;

        // Applica transizione e muovi
        cartaVolante.style.transition = `left ${durata}ms ease-out, top ${durata}ms ease-out, transform ${durata}ms ease-out`;

        // Compensa l'offset dovuto alla rotazione (altezza carta scalata = 96 * 0.73 ≈ 70px)
        let finalLeft = aRect.left;
        let finalTop = aRect.top;
        if (rotazioneFinale === 90) {
            finalLeft += 70;  // Compensa lo spostamento causato dalla rotazione
        }

        cartaVolante.style.left = finalLeft + 'px';
        cartaVolante.style.top = finalTop + 'px';
        cartaVolante.style.transform = `scale(0.73) rotate(${rotazioneFinale}deg)`;

        // Al termine dell'animazione
        setTimeout(() => {
            cartaVolante.remove();
            resolve();
        }, durata);
    });
}

// Versione semplificata per animare da/verso selettori o coordinate
function animaCartaDa(carta, daSelettore, aSelettore, opzioni = {}) {
    const daEl = typeof daSelettore === 'string' ? $(daSelettore) : daSelettore;
    const aEl = typeof aSelettore === 'string' ? $(aSelettore) : aSelettore;

    if (!daEl || !aEl) {
        return Promise.resolve();
    }

    return animaCarta(carta, daEl, aEl, opzioni);
}

// ============================================================================
// INTERAZIONE GIOCATORE
// ============================================================================

async function pescaDaMazzo() {
    if (game.fase !== 'pesca') return;
    if (game.haPescato) return;
    if (!game.giocatori[game.giocatoreCorrente].isUmano) return;

    salvaStato('pesca');
    game.combinazioneModificabile = null;

    const carta = game.mazzo.pop();
    if (!carta) {
        // Mazzo vuoto - rimescola scarti
        if (game.scarti.length > 1) {
            const ultima = game.scarti.pop();
            game.mazzo = game.scarti;
            game.scarti = [ultima];
            shuffle(game.mazzo);
            return pescaDaMazzo();
        }
        return;
    }

    carta.faceUp = true;

    // Registra nella storia
    registraMossa(AZIONE_PESCA_MAZZO, { carta: carta.id });

    // Aggiungi la carta alla mano e renderizza per ottenere la posizione finale
    game.giocatori[0].carte.push(carta);
    game.haPescato = true;
    game.fase = 'gioco';
    render();

    // Trova l'elemento della carta appena aggiunta (l'ultima)
    const cartaEl = carta.elemento;
    if (cartaEl) {
        // Nascondi temporaneamente la carta renderizzata
        cartaEl.style.visibility = 'hidden';

        // Anima la carta dal mazzo alla posizione finale
        playSound('pesca');
        await animaCartaDa(carta, '#mazzo', cartaEl, { mostraFronte: true });

        // Mostra la carta renderizzata
        cartaEl.style.visibility = 'visible';
    } else {
        playSound('pesca');
    }
}

function pescaDaScarti() {
    if (game.fase !== 'pesca') return;
    if (game.haPescato) return;
    if (!game.giocatori[game.giocatoreCorrente].isUmano) return;
    if (game.scarti.length === 0) return;

    salvaStato('pesca-scarti');
    game.combinazioneModificabile = null;

    // Prendi tutte le carte dagli scarti
    const carteRaccolte = game.scarti.splice(0);
    for (const c of carteRaccolte) {
        c.faceUp = true;
        game.giocatori[0].carte.push(c);
    }

    // Registra nella storia
    registraMossa(AZIONE_PESCA_SCARTI, { carte: carteRaccolte.map(c => c.id) });

    ordinaCarte(game.giocatori[0].carte);

    game.haPescato = true;
    game.fase = 'gioco';

    playSound('pesca');
    render();
}

async function scartaCarta(carta) {
    if (game.fase !== 'gioco') return;
    if (!game.haPescato) return;

    // Rimuovi carta dalla mano
    const idx = game.giocatori[0].carte.indexOf(carta);
    if (idx === -1) return;

    salvaStato('scarta');

    // Registra nella storia
    registraMossa(AZIONE_SCARTO, { carta: carta.id });

    // Chiude la finestra temporale per modificare la matta
    game.combinazioneModificabile = null;

    // Salva la posizione di partenza della carta
    const cartaElPartenza = carta.elemento;
    const partenzaRect = cartaElPartenza ? cartaElPartenza.getBoundingClientRect() : null;

    game.giocatori[0].carte.splice(idx, 1);
    carta.selezionata = false;

    // Deseleziona tutto
    game.carteSelezionate = [];
    game.giocatori[0].carte.forEach(c => c.selezionata = false);

    // Aggiungi agli scarti e renderizza per ottenere la posizione finale
    game.scarti.push(carta);
    render();

    playSound('scarta');

    // Anima la carta dalla posizione originale alla posizione finale negli scarti
    if (partenzaRect) {
        // Trova l'ultimo elemento negli scarti (la carta appena aggiunta)
        const scartiContainer = $('#scarti-container');
        const cartaElFinale = scartiContainer.lastElementChild;

        if (cartaElFinale) {
            // Nascondi temporaneamente la carta finale
            cartaElFinale.style.visibility = 'hidden';

            // Crea un elemento fittizio per la posizione di partenza
            const fakePartenza = document.createElement('div');
            fakePartenza.style.position = 'fixed';
            fakePartenza.style.left = partenzaRect.left + 'px';
            fakePartenza.style.top = partenzaRect.top + 'px';
            fakePartenza.style.width = '1px';
            fakePartenza.style.height = '1px';
            document.body.appendChild(fakePartenza);

            await animaCarta(carta, fakePartenza, cartaElFinale, { mostraFronte: true });

            fakePartenza.remove();
            cartaElFinale.style.visibility = 'visible';
        }
    }

    // Controlla se ha finito le carte
    if (game.giocatori[0].carte.length === 0) {
        // Prende pozzetto o chiude
        if (!game.giocatori[0].haPozzetto && game.pozzetti[0].length > 0) {
            prendiPozzetto(0);
        } else {
            finePartita(true);
            return;
        }
    }

    // Passa al prossimo giocatore
    game.haPescato = false;
    game.fase = 'pesca';
    prossimoTurno();
}

function toggleSelezioneCarta(carta) {
    if (game.fase !== 'gioco') return;
    if (!game.haPescato) return;

    carta.selezionata = !carta.selezionata;

    if (carta.selezionata) {
        game.carteSelezionate.push(carta);
    } else {
        const idx = game.carteSelezionate.indexOf(carta);
        if (idx > -1) game.carteSelezionate.splice(idx, 1);
    }

    render();
}

function depositaCombinazione(e) {
    if (game.fase !== 'gioco') return;

    // Se non ci sono carte selezionate, verifica se il click e' su una combinazione modificabile
    if (game.carteSelezionate.length === 0) {
        // Verifica se il click e' su una combinazione per spostare la matta
        const combEl = e.target.closest('.combinazione');
        console.log('Click su combinazioni: combEl=' + !!combEl + ', combinazioneModificabile=' + !!game.combinazioneModificabile);
        if (combEl && game.combinazioneModificabile) {
            // Trova quale combinazione e' stata cliccata
            const combElements = Array.from($('#combinazioni-noi').querySelectorAll('.combinazione'));
            const combIndex = combElements.indexOf(combEl);
            console.log('combIndex=' + combIndex + ', match=' + (game.combinazioniNoi[combIndex] === game.combinazioneModificabile));
            if (combIndex >= 0 && game.combinazioniNoi[combIndex] === game.combinazioneModificabile) {
                console.log('Chiamando spostaMattaCombinazione...');
                spostaMattaCombinazione(game.combinazioneModificabile);
                return;
            }
        }
        return;
    }

    if (game.carteSelezionate.length < 3) return;

    // Verifica che sia una combinazione valida
    const risultato = verificaCombinazione(game.carteSelezionate);
    if (!risultato.valida) {
        console.log('Combinazione non valida:', risultato.motivo);
        return;
    }

    salvaStato('combinazione');

    // Ordina le carte per la combinazione
    let carteOrdinate = [...game.carteSelezionate];

    if (risultato.tipo === TIPO_SCALA) {
        // Per le scale, ordina e posiziona il jolly nel buco
        carteOrdinate = ordinaScalaConJolly(carteOrdinate, risultato.assoAlto);
    }

    // Crea la combinazione
    const comb = new Combinazione(
        game.combinazioniNoi.length,
        risultato.tipo,
        carteOrdinate
    );
    comb.seme = risultato.seme;
    comb.numero = risultato.numero;
    comb.assoAlto = risultato.assoAlto || false;

    // Rimuovi carte dalla mano
    for (const carta of game.carteSelezionate) {
        const idx = game.giocatori[0].carte.indexOf(carta);
        if (idx > -1) game.giocatori[0].carte.splice(idx, 1);
        carta.selezionata = false;
        carta.inCombinazione = true;
        carta.idCombinazione = comb.id;
    }

    game.combinazioniNoi.push(comb);
    game.carteSelezionate = [];

    // Registra nella storia
    registraMossa(AZIONE_COMBINAZIONE, {
        carte: comb.carte.map(c => c.id),
        combinazione: comb.id,
        tipo: comb.tipo
    });

    // Se e' una scala con matta, permetti di spostarla
    // La pinella e' matta solo se jollycomeNumero != 2 (cioe' non e' nella posizione naturale)
    const haMatta = comb.carte.some(c => {
        console.log('haMatta check: numero=' + c.numero + ', isJolly=' + c.isJolly + ', isPinella=' + c.isPinella + ', jollycomeNumero=' + c.jollycomeNumero);
        if (c.isJolly) return true;
        if (c.isPinella && c.jollycomeNumero !== 2) return true;
        return false;
    });
    console.log('haMatta=' + haMatta + ', tipo=' + comb.tipo);
    if (comb.tipo === TIPO_SCALA && haMatta) {
        game.combinazioneModificabile = comb;
        console.log('Combinazione modificabile impostata');
    } else {
        game.combinazioneModificabile = null;
    }

    // Aggiorna punteggio
    calcolaPunteggi();

    // Controlla burraco
    if (comb.isBurraco) {
        playSound('burraco');
    } else {
        playSound('combinazione');
    }

    // Controlla se ha finito le carte
    if (game.giocatori[0].carte.length === 0) {
        if (!game.giocatori[0].haPozzetto && game.pozzetti[0].length > 0) {
            prendiPozzetto(0);
        }
    }

    render();
}

// Sposta la matta da un'estremita' all'altra della scala
function spostaMattaCombinazione(combinazione) {
    if (combinazione.tipo !== TIPO_SCALA) return;

    // Trova la matta nella combinazione (solo se effettivamente agisce come matta)
    const matta = combinazione.carte.find(c => isCartaMatta(c));
    if (!matta) return;

    // Trova i numeri delle carte normali (incluse pinelle in posizione naturale)
    const normali = combinazione.carte.filter(c => !isCartaMatta(c));
    const numeriNormaliBase = normali.map(c => c.numero).sort((a, b) => a - b);

    const minBase = numeriNormaliBase[0];
    const maxBase = numeriNormaliBase[numeriNormaliBase.length - 1];

    // Determina dove e' attualmente la matta
    const mattaNumero = matta.jollycomeNumero;

    console.log('spostaMatta: mattaNumero=' + mattaNumero + ', min=' + minBase + ', max=' + maxBase + ', assoAlto=' + combinazione.assoAlto);

    // Determina la nuova posizione e se cambiare assoAlto
    let nuovaPosizione;
    let nuovoAssoAlto = combinazione.assoAlto;

    if (mattaNumero < minBase) {
        // Matta all'inizio -> prova a spostarla alla fine
        if (maxBase === 13) {
            // La matta puo' andare a 14 (Asso alto)
            nuovaPosizione = 14;
            nuovoAssoAlto = true;
        } else if (maxBase < 13) {
            // La matta puo' andare dopo il max
            nuovaPosizione = maxBase + 1;
        } else {
            // Non puo' muoversi
            console.log('La matta non puo essere spostata');
            return;
        }
    } else if (mattaNumero > maxBase || (combinazione.assoAlto && mattaNumero === 14)) {
        // Matta alla fine -> prova a spostarla all'inizio
        if (minBase === 1) {
            // Non puo' andare prima dell'Asso
            console.log('La matta non puo andare prima dell Asso');
            return;
        } else if (minBase > 1) {
            // La matta puo' andare prima del min
            nuovaPosizione = minBase - 1;
            // Se stavamo in assoAlto e ora andiamo all'inizio, possiamo togliere assoAlto
            if (combinazione.assoAlto && nuovaPosizione <= 13) {
                nuovoAssoAlto = false;
            }
        } else {
            console.log('La matta non puo essere spostata');
            return;
        }
    } else {
        // Matta in mezzo (buco) -> spostala alla fine
        if (maxBase === 13) {
            nuovaPosizione = 14;
            nuovoAssoAlto = true;
        } else {
            nuovaPosizione = maxBase + 1;
        }
    }

    // Verifica limiti
    if (nuovaPosizione < 1 || (nuovaPosizione > 13 && !nuovoAssoAlto)) {
        console.log('Posizione non valida: ' + nuovaPosizione);
        return;
    }

    console.log('spostaMatta: nuovaPosizione=' + nuovaPosizione + ', nuovoAssoAlto=' + nuovoAssoAlto);

    matta.jollycomeNumero = nuovaPosizione;
    combinazione.assoAlto = nuovoAssoAlto;

    // Riordina le carte della combinazione
    combinazione.carte.sort((a, b) => {
        let numA = (a.isJolly || a.isPinella) ? a.jollycomeNumero : a.numero;
        let numB = (b.isJolly || b.isPinella) ? b.jollycomeNumero : b.numero;
        if (combinazione.assoAlto) {
            if (numA === 1) numA = 14;
            if (numB === 1) numB = 14;
        }
        return numA - numB;
    });

    console.log('Ordine carte dopo sort:', combinazione.carte.map(c => c.numero + '(pos:' + (c.jollycomeNumero || c.numero) + ')').join(', '));

    playSound('combinazione');
    render();
}

// Riordina le carte nella mano: sposta cartaOrigine nella posizione di cartaDest
function riordinaCartaMano(cartaOrigine, cartaDest) {
    const mano = game.giocatori[0].carte;
    const idxOrigine = mano.indexOf(cartaOrigine);
    const idxDest = mano.indexOf(cartaDest);

    if (idxOrigine === -1 || idxDest === -1) return;
    if (idxOrigine === idxDest) return;

    // Rimuovi la carta dalla posizione originale
    mano.splice(idxOrigine, 1);

    // Inserisci nella nuova posizione
    // Se la carta era prima della destinazione, l'indice dest è già corretto
    // Se era dopo, l'indice dest è diminuito di 1 dopo la rimozione
    const nuovoIdx = idxOrigine < idxDest ? idxDest : idxDest;
    mano.splice(nuovoIdx, 0, cartaOrigine);

    render();
}

// Aggiunge una carta a una combinazione esistente
function aggiungiCartaACombinazione(carta, combinazione) {
    if (game.fase !== 'gioco') return;
    if (!game.haPescato) return;

    // Verifica che la carta possa essere aggiunta (o sostituire una matta)
    const risultato = puoAggiungereACombinazione(carta, combinazione);
    if (!risultato) {
        render();
        return;
    }

    salvaStato('aggiungi-carta');

    // Gestisci sostituzione matta (la matta si sposta a un'estremita', non torna in mano)
    let mattaSpostata = null;
    if (risultato.sostituzione && risultato.matta) {
        mattaSpostata = risultato.matta;

        if (combinazione.tipo === TIPO_SCALA) {
            // Per le scale: sposta la matta a un'estremita'
            // Trova min e max delle carte normali (esclusa la matta che stiamo spostando)
            // Include pinelle in posizione naturale (jollycomeNumero = null)
            const carteNormali = combinazione.carte.filter(c => c !== mattaSpostata && !isCartaMatta(c));
            // Aggiungi anche la nuova carta che stiamo inserendo
            carteNormali.push(carta);
            const numeri = carteNormali.map(c => c.numero).sort((a, b) => a - b);
            const min = numeri[0];
            const max = numeri[numeri.length - 1];

            // Metti la matta all'inizio (sotto) di default
            if (min > 1) {
                mattaSpostata.jollycomeNumero = min - 1;
            } else {
                // Se min e' 1 (Asso), metti alla fine
                mattaSpostata.jollycomeNumero = max + 1;
            }

            console.log('Matta spostata a posizione:', mattaSpostata.jollycomeNumero);
        }
        // Per i tris: la matta resta dov'e' (nessun cambio di posizione necessario)
    }

    // Chiude la finestra temporale per modificare la matta (verra' riaperta dopo se necessario)
    game.combinazioneModificabile = null;

    // Rimuovi la carta dalla mano del giocatore
    const idx = game.giocatori[0].carte.indexOf(carta);
    if (idx > -1) {
        game.giocatori[0].carte.splice(idx, 1);
    }

    // Deseleziona la carta
    carta.selezionata = false;
    carta.inCombinazione = true;
    carta.idCombinazione = combinazione.id;

    // Rimuovi dalla lista delle selezionate se presente
    const idxSel = game.carteSelezionate.indexOf(carta);
    if (idxSel > -1) {
        game.carteSelezionate.splice(idxSel, 1);
    }

    // Aggiungi la carta alla combinazione
    combinazione.carte.push(carta);

    // Registra nella storia
    registraMossa(AZIONE_ATTACCO, {
        carta: carta.id,
        combinazione: combinazione.id,
        sostituzione: risultato.sostituzione || false
    });

    // Se e' una scala, gestisci jolly/pinella e riordina
    if (combinazione.tipo === TIPO_SCALA) {
        // Se stiamo aggiungendo un jolly/pinella COME MATTA (non come sostituzione), imposta jollycomeNumero
        // Se e' una sostituzione, la carta sostituisce la matta e rimane come carta naturale
        const isAggiuntaComeMatta = (carta.isJolly || carta.isPinella) && !carta.jollycomeNumero && !risultato.sostituzione;

        if (isAggiuntaComeMatta) {
            // Trova min e max delle carte normali ESCLUDENDO la carta appena aggiunta
            const carteNormali = combinazione.carte.filter(c => c !== carta && !isCartaMatta(c));
            const numeri = carteNormali.map(c => c.numero).sort((a, b) => a - b);
            const min = numeri[0];
            const max = numeri[numeri.length - 1];
            const semeScala = carteNormali[0].seme;

            // Per la pinella, controlla se puo' andare nella posizione naturale (2)
            // Naturale solo se posizione 2 E stesso seme della scala
            if (carta.isPinella) {
                // La pinella puo' essere naturale se 2 e' adiacente a min o max E stesso seme
                if ((min === 3 || max === 1) && carta.seme === semeScala) {
                    // Posizione 2 e' valida come carta naturale, non serve jollycomeNumero
                    carta.jollycomeNumero = null;
                } else {
                    // Posizione 2 non e' valida, metti come matta a un'estremita'
                    if (min > 1) {
                        carta.jollycomeNumero = min - 1;
                    } else {
                        carta.jollycomeNumero = max + 1;
                    }
                    // Permetti di spostare la matta cliccando
                    game.combinazioneModificabile = combinazione;
                }
            } else {
                // Jolly: metti a un'estremita'
                if (min > 1) {
                    carta.jollycomeNumero = min - 1;
                } else {
                    carta.jollycomeNumero = max + 1;
                }
                // Permetti di spostare la matta cliccando
                game.combinazioneModificabile = combinazione;
            }
        }

        // Se e' una sostituzione con pinella, puo' essere naturale solo se stesso seme
        if (risultato.sostituzione && carta.isPinella) {
            const carteNormaliPerSeme = combinazione.carte.filter(c => c !== carta && !isCartaMatta(c));
            const semeScala = carteNormaliPerSeme.length > 0 ? carteNormaliPerSeme[0].seme : carta.seme;
            if (carta.seme === semeScala) {
                carta.jollycomeNumero = null;
                console.log('Pinella aggiunta come sostituzione, stesso seme, jollycomeNumero = null');
            } else {
                // Pinella di seme diverso: agisce come matta in posizione 2
                carta.jollycomeNumero = 2;
                console.log('Pinella aggiunta come sostituzione, seme diverso, jollycomeNumero = 2');
            }
        }

        // Ordina per numero effettivo (jollycomeNumero per matte)
        combinazione.carte.sort((a, b) => {
            let numA = isCartaMatta(a) ? a.jollycomeNumero : a.numero;
            let numB = isCartaMatta(b) ? b.jollycomeNumero : b.numero;
            if (combinazione.assoAlto) {
                if (numA === 1) numA = 14;
                if (numB === 1) numB = 14;
            }
            return numA - numB;
        });

        // Se c'e' stata una sostituzione, permetti di spostare la matta cliccando
        if (mattaSpostata) {
            game.combinazioneModificabile = combinazione;
        }
    }

    // Aggiorna punteggio
    calcolaPunteggi();

    // Controlla burraco
    if (combinazione.isBurraco && combinazione.carte.length === 7) {
        playSound('burraco');
    } else {
        playSound('combinazione');
    }

    // Controlla se ha finito le carte
    if (game.giocatori[0].carte.length === 0) {
        if (!game.giocatori[0].haPozzetto && game.pozzetti[0].length > 0) {
            prendiPozzetto(0);
        }
    }

    render();
}

function prendiPozzetto(squadra) {
    const pozzetto = squadra === 0 ? game.pozzetti[0] : game.pozzetti[1];
    if (pozzetto.length === 0) return;

    const giocatore = game.giocatori[squadra === 0 ? 0 : 1];

    for (const carta of pozzetto) {
        if (giocatore.isUmano) carta.faceUp = true;
        giocatore.carte.push(carta);
    }

    if (squadra === 0) {
        game.pozzetti[0] = [];
    } else {
        game.pozzetti[1] = [];
    }

    giocatore.haPozzetto = true;
    ordinaCarte(giocatore.carte);

    // Registra nella storia
    registraMossa(AZIONE_POZZETTO, { squadra: squadra });

    playSound('pozzetto');
    render();
}

function ordinaPerNumero() {
    game.giocatori[0].carte.sort((a, b) => {
        // Prima per numero
        if (a.numero !== b.numero) return a.numero - b.numero;
        // Poi per seme
        return VALORI_SEMI[a.seme] - VALORI_SEMI[b.seme];
    });
    playSound('ordina');
    render();
}

function ordinaPerSeme() {
    game.giocatori[0].carte.sort((a, b) => {
        // Prima per seme
        if (a.seme !== b.seme) return VALORI_SEMI[a.seme] - VALORI_SEMI[b.seme];
        // Poi per numero
        return a.numero - b.numero;
    });
    playSound('ordina');
    render();
}

function ordinaCarte(carte) {
    carte.sort((a, b) => {
        // Prima per numero
        if (a.numero !== b.numero) return a.numero - b.numero;
        // Poi per seme
        return VALORI_SEMI[a.seme] - VALORI_SEMI[b.seme];
    });
}

// ============================================================================
// VERIFICA COMBINAZIONI
// ============================================================================

function verificaCombinazione(carte) {
    if (carte.length < 3) {
        return { valida: false, motivo: 'Servono almeno 3 carte' };
    }

    // Prova tris
    const tris = verificaTris(carte);
    if (tris.valida) return tris;

    // Prova scala
    const scala = verificaScala(carte);
    if (scala.valida) return scala;

    return { valida: false, motivo: 'Non e\' una combinazione valida' };
}

function verificaTris(carte) {
    // Burraco: nessun limite massimo di carte per un tris
    // (si possono avere piu' carte dello stesso valore, anche stesso seme da mazzi diversi)

    const jolly = carte.filter(c => c.isJolly || c.isPinella);
    const normali = carte.filter(c => !c.isJolly && !c.isPinella);

    if (normali.length === 0) {
        return { valida: false, motivo: 'Servono carte normali' };
    }

    // Tutte le carte normali devono avere lo stesso numero
    const numero = normali[0].numero;
    if (!normali.every(c => c.numero === numero)) {
        return { valida: false, motivo: 'Numeri diversi' };
    }

    // Burraco: semi duplicati sono permessi (carte da mazzi diversi)

    // Max 1 jolly/pinella per combinazione
    if (jolly.length > 1) {
        return { valida: false, motivo: 'Max 1 jolly o pinella' };
    }

    return { valida: true, tipo: TIPO_TRIS, numero: numero };
}

function verificaScala(carte) {
    if (carte.length < 3) {
        return { valida: false, motivo: 'Scala min 3 carte' };
    }

    // Jolly e pinelle contano come jolly
    const jolly = carte.filter(c => c.isJolly || c.isPinella);
    const normali = carte.filter(c => !c.isJolly && !c.isPinella);

    if (normali.length === 0) {
        return { valida: false, motivo: 'Servono carte normali' };
    }

    // Max 1 jolly/pinella per combinazione
    if (jolly.length > 1) {
        return { valida: false, motivo: 'Max 1 jolly o pinella' };
    }

    // Tutte le carte normali devono avere lo stesso seme
    const seme = normali[0].seme;
    if (!normali.every(c => c.seme === seme)) {
        return { valida: false, motivo: 'Semi diversi in scala' };
    }

    const numeri = normali.map(c => c.numero).sort((a, b) => a - b);

    // Controlla duplicati
    for (let i = 1; i < numeri.length; i++) {
        if (numeri[i] === numeri[i-1]) {
            return { valida: false, motivo: 'Numeri duplicati' };
        }
    }

    // Prova scala con Asso basso (A=1)
    if (verificaSequenza(numeri, jolly.length)) {
        // Se c'e' un jolly e max e' Q o K, potrebbe essere anche asso alto
        // Determiniamo in base alla posizione del jolly nell'ordine originale
        const max = Math.max(...numeri);
        if (jolly.length > 0 && max >= 12) {
            // Trova la posizione del jolly rispetto alle carte normali
            let indiceMatta = -1;
            let indiceUltimaNormale = -1;
            for (let i = 0; i < carte.length; i++) {
                if ((carte[i].isJolly || carte[i].isPinella) && indiceMatta === -1) {
                    indiceMatta = i;
                }
                if (!carte[i].isJolly && !carte[i].isPinella) {
                    indiceUltimaNormale = i;
                }
            }
            // Se il jolly e' posizionato dopo l'ultima carta normale e max e' 13 (K),
            // l'utente vuole probabilmente Q-K-A (asso alto)
            if (indiceMatta > indiceUltimaNormale && max === 13) {
                return { valida: true, tipo: TIPO_SCALA, seme: seme, assoAlto: true };
            }
        }
        return { valida: true, tipo: TIPO_SCALA, seme: seme };
    }

    // Prova scala con Asso alto (A=14, dopo il K)
    if (numeri.includes(1)) {
        const numeriAssoAlto = numeri.map(n => n === 1 ? 14 : n).sort((a, b) => a - b);
        // Verifica che non ci sia il "giro" (es. K-A-2 non valido)
        const haCarteBasse = numeriAssoAlto.some(n => n >= 2 && n <= 3);
        const haCarteAlte = numeriAssoAlto.some(n => n >= 12 && n <= 14);
        if (haCarteBasse && haCarteAlte) {
            return { valida: false, motivo: 'Giro A-2 non valido' };
        }
        if (verificaSequenza(numeriAssoAlto, jolly.length)) {
            return { valida: true, tipo: TIPO_SCALA, seme: seme, assoAlto: true };
        }
    }

    return { valida: false, motivo: 'Sequenza non valida' };
}

// Ordina una scala e posiziona i jolly nei buchi corretti
// Rispetta la posizione della matta nell'ordine originale delle carte
function ordinaScalaConJolly(carte, assoAlto = false) {
    const jolly = carte.filter(c => c.isJolly || c.isPinella);
    const normali = carte.filter(c => !c.isJolly && !c.isPinella);

    // Ordina le carte normali per numero
    normali.sort((a, b) => {
        let numA = a.numero;
        let numB = b.numero;
        if (assoAlto) {
            if (numA === 1) numA = 14;
            if (numB === 1) numB = 14;
        }
        return numA - numB;
    });

    // Se non ci sono jolly, ritorna le carte ordinate
    if (jolly.length === 0) {
        return normali;
    }

    // Trova i numeri delle carte normali
    const numeriNormali = normali.map(c => {
        let num = c.numero;
        if (assoAlto && num === 1) num = 14;
        return num;
    });

    const min = numeriNormali[0];
    const max = numeriNormali[numeriNormali.length - 1];

    // Determina il seme della scala (per verificare se pinella e' naturale)
    const semeScala = normali[0].seme;

    // Conta i buchi nella sequenza
    let bucheTotali = 0;
    for (let i = 1; i < numeriNormali.length; i++) {
        bucheTotali += numeriNormali[i] - numeriNormali[i-1] - 1;
    }

    // Determina dove mettere la matta in base alla posizione originale
    // Trova l'indice della prima matta e della prima/ultima carta normale nell'array originale
    let indiceMatta = -1;
    let indicePrimaNormale = -1;
    let indiceUltimaNormale = -1;

    for (let i = 0; i < carte.length; i++) {
        if ((carte[i].isJolly || carte[i].isPinella) && indiceMatta === -1) {
            indiceMatta = i;
        }
        if (!carte[i].isJolly && !carte[i].isPinella) {
            if (indicePrimaNormale === -1) indicePrimaNormale = i;
            indiceUltimaNormale = i;
        }
    }

    // Decidi dove posizionare la matta
    let mattaAllaFine = true; // default
    if (bucheTotali > 0) {
        // C'e' un buco nella sequenza: matta nel buco
        mattaAllaFine = null; // segnala di usare i buchi
    } else if (indiceMatta < indicePrimaNormale) {
        // Matta posizionata prima delle carte normali: va all'inizio
        mattaAllaFine = false;
    } else if (indiceMatta > indiceUltimaNormale) {
        // Matta posizionata dopo le carte normali: va alla fine
        mattaAllaFine = true;
    }

    console.log('ordinaScalaConJolly: indiceMatta=' + indiceMatta + ', indicePrimaNormale=' + indicePrimaNormale +
        ', indiceUltimaNormale=' + indiceUltimaNormale + ', mattaAllaFine=' + mattaAllaFine +
        ', min=' + min + ', max=' + max);

    // Assegna i numeri ai jolly
    let jollyIdx = 0;

    if (mattaAllaFine === null) {
        // Metti i jolly nei buchi
        for (let i = 1; i < numeriNormali.length && jollyIdx < jolly.length; i++) {
            const gap = numeriNormali[i] - numeriNormali[i-1] - 1;
            for (let j = 0; j < gap && jollyIdx < jolly.length; j++) {
                let numJolly = numeriNormali[i-1] + j + 1;
                if (assoAlto && numJolly === 14) {
                    numJolly = 1;
                }
                // Pinella naturale solo se posizione 2 E stesso seme della scala
                if (jolly[jollyIdx].isPinella && numJolly === 2 && jolly[jollyIdx].seme === semeScala) {
                    jolly[jollyIdx].jollycomeNumero = null;
                    console.log('Pinella in buco posizione naturale (2), stesso seme, jollycomeNumero = null');
                } else {
                    jolly[jollyIdx].jollycomeNumero = numJolly;
                }
                jollyIdx++;
            }
        }
        // Eventuali jolly rimanenti vanno alla fine
        while (jollyIdx < jolly.length) {
            let numJolly = max + (jollyIdx - bucheTotali) + 1;
            // Pinella naturale solo se posizione 2 E stesso seme della scala
            if (jolly[jollyIdx].isPinella && numJolly === 2 && jolly[jollyIdx].seme === semeScala) {
                jolly[jollyIdx].jollycomeNumero = null;
                console.log('Pinella rimanente posizione naturale (2), stesso seme, jollycomeNumero = null');
            } else {
                jolly[jollyIdx].jollycomeNumero = numJolly;
            }
            jollyIdx++;
        }
    } else if (mattaAllaFine) {
        // Matta alla fine della scala (dopo il max)
        for (let j = 0; j < jolly.length; j++) {
            let numJolly = max + j + 1;
            if (numJolly > 13 && !assoAlto) {
                // Non puo' andare oltre il K, mettila all'inizio
                numJolly = min - (jolly.length - j);
            }
            // Pinella naturale solo se posizione 2 E stesso seme della scala
            if (jolly[j].isPinella && numJolly === 2 && jolly[j].seme === semeScala) {
                jolly[j].jollycomeNumero = null;
                console.log('Pinella alla fine posizione naturale (2), stesso seme, jollycomeNumero = null');
            } else {
                jolly[j].jollycomeNumero = numJolly;
                console.log('Matta alla fine: jollycomeNumero=' + numJolly + ', isPinella=' + jolly[j].isPinella);
            }
        }
    } else {
        // Matta all'inizio della scala (prima del min)
        for (let j = 0; j < jolly.length; j++) {
            let numJolly = min - (jolly.length - j);
            if (numJolly < 1 && !assoAlto) {
                // Non puo' andare sotto l'A, mettila alla fine
                numJolly = max + j + 1;
            }
            // Pinella naturale solo se posizione 2 E stesso seme della scala
            if (jolly[j].isPinella && numJolly === 2 && jolly[j].seme === semeScala) {
                jolly[j].jollycomeNumero = null;
                console.log('Pinella in posizione naturale (2), stesso seme, jollycomeNumero = null');
            } else {
                jolly[j].jollycomeNumero = numJolly;
                console.log('Matta all inizio: jollycomeNumero=' + numJolly + ', isPinella=' + jolly[j].isPinella);
            }
        }
    }

    // Ora ordina tutte le carte insieme usando il valore effettivo
    const tutteCarte = [...normali, ...jolly];
    tutteCarte.sort((a, b) => {
        // Per matte: usa jollycomeNumero, ma se e' null (pinella naturale) usa c.numero
        let numA = (a.isJolly || a.isPinella) ? (a.jollycomeNumero !== null ? a.jollycomeNumero : a.numero) : a.numero;
        let numB = (b.isJolly || b.isPinella) ? (b.jollycomeNumero !== null ? b.jollycomeNumero : b.numero) : b.numero;
        if (assoAlto) {
            if (numA === 1) numA = 14;
            if (numB === 1) numB = 14;
        }
        return numA - numB;
    });

    return tutteCarte;
}

// Verifica se i numeri formano una sequenza continua con i jolly disponibili
function verificaSequenza(numeri, jollyDisponibili) {
    for (let i = 1; i < numeri.length; i++) {
        const gap = numeri[i] - numeri[i-1] - 1;
        if (gap > jollyDisponibili) {
            return false;
        }
        jollyDisponibili -= gap;
    }
    return true;
}

// Helper: verifica se una carta sta agendo come matta (non in posizione naturale)
// Una pinella e' matta se jollycomeNumero e' impostato (qualsiasi valore)
// jollycomeNumero = null significa che la pinella e' in posizione naturale (2) con stesso seme
function isCartaMatta(c) {
    if (c.isJolly) return true;
    if (c.isPinella && c.jollycomeNumero !== null) return true;
    return false;
}

// Verifica se una carta puo' essere aggiunta a una combinazione esistente
// Ritorna: false, true, oppure { sostituzione: true, matta: cartaDaSostituire }
function puoAggiungereACombinazione(carta, combinazione) {
    // Verifica jolly: max 1 matta per combinazione
    if (carta.isJolly) {
        const haGiaMatta = combinazione.carte.some(c => isCartaMatta(c));
        if (haGiaMatta) {
            return false;
        }
        return true;
    }

    // Per le pinelle: potrebbero essere aggiunte come matta O come carta naturale (in posizione 2)
    // Se la scala ha una matta in posizione 2 e la pinella ha stesso seme, puo' sostituirla
    if (carta.isPinella && combinazione.tipo === TIPO_SCALA) {
        const carteNormali = combinazione.carte.filter(c => !isCartaMatta(c));
        if (carteNormali.length > 0) {
            const semeScala = carteNormali[0].seme;
            // Se la pinella ha stesso seme e c'e' una matta in posizione 2, puo' sostituirla
            if (carta.seme === semeScala) {
                const mattaInPos2 = combinazione.carte.find(c => isCartaMatta(c) && c.jollycomeNumero === 2);
                if (mattaInPos2) {
                    return { sostituzione: true, matta: mattaInPos2 };
                }
            }
        }
        // Altrimenti, la pinella vuole essere aggiunta come matta
        const haGiaMatta = combinazione.carte.some(c => isCartaMatta(c));
        if (haGiaMatta) {
            return false;
        }
        return true;
    }

    // Pinella in tris: comportamento standard (come matta)
    if (carta.isPinella) {
        const haGiaMatta = combinazione.carte.some(c => isCartaMatta(c));
        if (haGiaMatta) {
            return false;
        }
        return true;
    }

    // Cerca se c'e' una matta che puo' essere sostituita
    const matta = combinazione.carte.find(c => isCartaMatta(c));

    if (combinazione.tipo === TIPO_TRIS) {
        // Burraco: per un tris basta stesso numero, nessun limite di semi
        // Considera come "normali" anche le pinelle in posizione naturale
        const carteNormali = combinazione.carte.filter(c => !isCartaMatta(c));
        if (carteNormali.length === 0) return false;
        const numeroTris = carteNormali[0].numero;

        // La carta deve avere lo stesso numero
        if (carta.numero !== numeroTris) {
            return false;
        }

        // Se c'e' una matta, questa e' una sostituzione
        if (matta) {
            return { sostituzione: true, matta: matta };
        }
        return true;
    }

    if (combinazione.tipo === TIPO_SCALA) {
        // Per una scala: stesso seme, numero consecutivo alle estremita' OPPURE sostituzione matta
        // Considera come "normali" anche le pinelle in posizione naturale
        const carteNormali = combinazione.carte.filter(c => !isCartaMatta(c));
        if (carteNormali.length === 0) return false;
        const semeScala = carteNormali[0].seme;

        // La carta deve avere lo stesso seme
        if (carta.seme !== semeScala) {
            return false;
        }

        // Verifica se la carta puo' sostituire la matta
        if (matta && matta.jollycomeNumero === carta.numero) {
            return { sostituzione: true, matta: matta };
        }

        // Caso speciale: pinella in posizione naturale (2) puo' essere sostituita da un 2 reale
        if (carta.numero === 2) {
            const pinellaNaturale = combinazione.carte.find(c =>
                c.isPinella && c.jollycomeNumero === null
            );
            if (pinellaNaturale) {
                return { sostituzione: true, matta: pinellaNaturale };
            }
        }

        // Trova tutti i numeri nella scala
        const numeri = [];
        for (const c of combinazione.carte) {
            if (isCartaMatta(c)) {
                // Matta: usa jollycomeNumero
                if (c.jollycomeNumero) {
                    numeri.push(c.jollycomeNumero);
                }
            } else {
                // Carta normale (inclusa pinella in posizione naturale)
                numeri.push(c.numero);
            }
        }

        // Calcola il numero minimo e massimo della scala
        const numeriOrdinati = numeri.sort((a, b) => a - b);
        const min = numeriOrdinati[0];
        const max = numeriOrdinati[numeriOrdinati.length - 1];

        // Verifica se la carta puo' essere aggiunta in fondo (dopo il max)
        // Caso speciale: Asso puo' andare dopo il K (come 14)
        if (carta.numero === max + 1) {
            return true;
        }
        if (max === 13 && carta.numero === 1) {
            // Asso dopo il Re
            return true;
        }

        // Verifica se la carta puo' essere aggiunta in cima (prima del min)
        if (carta.numero === min - 1) {
            return true;
        }
        if (min === 2 && carta.numero === 1) {
            // Asso prima del 2
            return true;
        }

        return false;
    }

    return false;
}

// ============================================================================
// AI AVVERSARI
// ============================================================================

function prossimoTurno() {
    game.giocatoreCorrente = (game.giocatoreCorrente + 1) % game.giocatori.length;
    game.turno++;

    aggiornaIndicatoreTurno();

    if (!game.giocatori[game.giocatoreCorrente].isUmano) {
        setTimeout(turnoAI, 1000);
    }
}

// Helper per ottenere il selettore delle carte di un giocatore
function getSelettoreCarteGiocatore(giocatore) {
    switch (giocatore.posizione) {
        case 'bottom': return '#carte-giocatore';
        case 'left': return '#carte-avv-sx';
        case 'right': return '#carte-avv-dx';
        case 'top': return '#carte-compagno';
        default: return null;
    }
}

// Helper per ritardo
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function turnoAI() {
    const giocatore = game.giocatori[game.giocatoreCorrente];
    const selettoreCarte = getSelettoreCarteGiocatore(giocatore);
    const isLaterale = giocatore.posizione === 'left' || giocatore.posizione === 'right';

    // Ritardo prima della pesca
    await delay(500);

    // Pesca dal mazzo
    const carta = game.mazzo.pop();
    if (carta) {
        // Se modalita scoperte attiva, mostra la carta
        if (game.mostraTutteCarteScoperte) {
            carta.faceUp = true;
        }
        giocatore.carte.push(carta);

        // Registra nella storia
        registraMossa(AZIONE_PESCA_MAZZO, { carta: carta.id });

        render();

        // Anima la carta dal mazzo alla mano del giocatore
        const container = $(selettoreCarte);
        const ultimaCarta = container ? container.lastElementChild : null;
        if (ultimaCarta) {
            ultimaCarta.style.visibility = 'hidden';
            playSound('pesca');
            // Ruota di 90 gradi se giocatore laterale
            const opzioniAnim = {
                mostraFronte: game.mostraTutteCarteScoperte,
                rotazioneIniziale: 0,
                rotazioneFinale: isLaterale ? 90 : 0
            };
            await animaCartaDa(carta, '#mazzo', ultimaCarta, opzioniAnim);
            ultimaCarta.style.visibility = 'visible';
        }
    }

    // AI semplice: scarta la carta con valore piu' alto
    ordinaCarte(giocatore.carte);

    // Cerca combinazioni possibili
    // Per ora AI semplice: non fa combinazioni

    // Ritardo prima dello scarto
    await delay(500);

    // Scarta ultima carta (valore piu' alto)
    if (giocatore.carte.length > 0) {
        // Salva la posizione dell'ultima carta PRIMA di rimuoverla
        const container = $(selettoreCarte);
        const ultimaCartaEl = container ? container.lastElementChild : null;
        const partenzaRect = ultimaCartaEl ? ultimaCartaEl.getBoundingClientRect() : null;

        const cartaDaScartare = giocatore.carte.pop();

        // Registra nella storia
        registraMossa(AZIONE_SCARTO, { carta: cartaDaScartare.id });

        cartaDaScartare.faceUp = true;
        game.scarti.push(cartaDaScartare);
        render();

        // Anima lo scarto
        if (partenzaRect) {
            const scartiContainer = $('#scarti-container');
            const cartaElFinale = scartiContainer.lastElementChild;

            if (cartaElFinale) {
                cartaElFinale.style.visibility = 'hidden';

                const fakePartenza = document.createElement('div');
                fakePartenza.style.position = 'fixed';
                fakePartenza.style.left = partenzaRect.left + 'px';
                fakePartenza.style.top = partenzaRect.top + 'px';
                fakePartenza.style.width = '1px';
                fakePartenza.style.height = '1px';
                document.body.appendChild(fakePartenza);

                playSound('scarta');
                // Ruota da 90 a 0 gradi se giocatore laterale
                const opzioniAnim = {
                    mostraFronte: true,
                    rotazioneIniziale: isLaterale ? 90 : 0,
                    rotazioneFinale: 0
                };
                await animaCarta(cartaDaScartare, fakePartenza, cartaElFinale, opzioniAnim);

                fakePartenza.remove();
                cartaElFinale.style.visibility = 'visible';
            }
        }
    }

    // Controlla se ha finito
    if (giocatore.carte.length === 0) {
        const pozzIdx = giocatore.squadra;
        if (game.pozzetti[pozzIdx].length > 0) {
            for (const c of game.pozzetti[pozzIdx]) {
                // Se modalita scoperte attiva, mostra la carta
                if (game.mostraTutteCarteScoperte) {
                    c.faceUp = true;
                }
                giocatore.carte.push(c);
            }
            game.pozzetti[pozzIdx] = [];
            giocatore.haPozzetto = true;
        } else {
            finePartita(false);
            return;
        }
    }

    render();

    // Passa al prossimo
    prossimoTurno();
}

function aggiornaIndicatoreTurno() {
    // Rimuovi la classe turno-attivo da tutte le aree
    $$('.area-giocatore').forEach(el => el.classList.remove('turno-attivo'));

    const giocatore = game.giocatori[game.giocatoreCorrente];
    let area = null;

    switch(giocatore.posizione) {
        case 'bottom':
            area = $('#area-giocatore');
            break;
        case 'left':
            area = $('#area-avversario-sx');
            break;
        case 'right':
            area = $('#area-avversario-dx');
            break;
        case 'top':
            area = $('#area-compagno');
            break;
    }

    if (area) {
        area.classList.add('turno-attivo');
    }
}

// ============================================================================
// PUNTEGGIO
// ============================================================================

function calcolaPunteggi() {
    // Punti dalle combinazioni
    game.puntiNoi = game.combinazioniNoi.reduce((sum, c) => sum + c.puntiTotali, 0);
    game.puntiLoro = game.combinazioniLoro.reduce((sum, c) => sum + c.puntiTotali, 0);

    renderPunteggi();
}

function finePartita(haVintoGiocatore) {
    game.fase = 'finito';

    calcolaPunteggi();

    // Sottrai punti carte in mano
    for (const g of game.giocatori) {
        const puntiMano = g.carte.reduce((sum, c) => sum + c.punti, 0);
        if (g.squadra === 0) {
            game.puntiNoi -= puntiMano;
        } else {
            game.puntiLoro -= puntiMano;
        }
    }

    // Bonus chiusura
    if (haVintoGiocatore) {
        game.puntiNoi += PUNTI_CHIUSURA;
        playSound('vittoria');
        $('#punteggio-finale-vinto').textContent = game.puntiNoi;
        mostraModal('modal-vittoria');
    } else {
        game.puntiLoro += PUNTI_CHIUSURA;
        playSound('sconfitta');
        $('#punteggio-finale-perso').textContent = game.puntiNoi;
        mostraModal('modal-sconfitta');
    }

    renderPunteggi();
}

// ============================================================================
// UNDO
// ============================================================================

// DEPRECATO: lo stato viene salvato negli snapshot della storia
// Mantenuto per compatibilità con chiamate esistenti
function salvaStato(_azione) {
    // No-op: il salvataggio avviene tramite registraMossa() con snapshot
    renderUndoButton();
}

function undo() {
    if (game.fase === 'finito') return;
    if (game.storia.length === 0) return;

    // Trova l'ultimo inizio turno del giocatore umano (giocatore 0)
    // Cerchiamo la pesca del giocatore 0, che segna l'inizio del suo turno
    let indiceTurnoUmano = -1;
    for (let i = game.storia.length - 1; i >= 0; i--) {
        const mossa = game.storia[i];
        if (mossa.giocatore === 0 &&
            (mossa.azione === AZIONE_PESCA_MAZZO || mossa.azione === AZIONE_PESCA_SCARTI)) {
            indiceTurnoUmano = i;
            break;
        }
    }

    if (indiceTurnoUmano === -1) {
        console.log('Undo: nessun turno umano da annullare');
        return;
    }

    // Ripristina lo snapshot PRIMA di quella mossa
    const mossa = game.storia[indiceTurnoUmano];
    ripristinaSnapshot(mossa.snapshot);

    // Ripristina il turno
    game.turno = mossa.turno;
    game.giocatoreCorrente = 0;
    game.fase = 'pesca';
    game.haPescato = false;

    // Tronca la storia da quel punto
    game.storia = game.storia.slice(0, indiceTurnoUmano);

    // Ricalcola punteggi
    calcolaPunteggi();

    playSound('ordina');
    render();
    aggiornaIndicatoreTurno();
    console.log('Undo completato, storia troncata a', game.storia.length, 'mosse');
}

// ============================================================================
// EVENTI MOUSE/TOUCH
// ============================================================================

function onMouseDown(e) {
    if (game.fase === 'finito') return;

    const cartaEl = e.target.closest('.carta');
    if (!cartaEl) return;

    const cartaId = parseInt(cartaEl.dataset.cartaId);
    if (isNaN(cartaId)) return;

    // Trova la carta
    const carta = trovaCarta(cartaId);
    if (!carta) return;

    // Se e' nella mano del giocatore
    if (game.giocatori[0].carte.includes(carta)) {
        if (e.button === 0) {
            // Click sinistro - inizia trascinamento o seleziona
            game.trascinamento = {
                carta: carta,
                elemento: cartaEl,
                startX: e.clientX,
                startY: e.clientY,
                moved: false
            };
        }
    }
}

function onMouseMove(e) {
    if (!game.trascinamento) return;

    const dx = e.clientX - game.trascinamento.startX;
    const dy = e.clientY - game.trascinamento.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        game.trascinamento.moved = true;

        // Crea il fantasma se non esiste ancora
        if (!game.trascinamento.fantasma) {
            const carta = game.trascinamento.carta;
            const elemento = game.trascinamento.elemento;
            const rect = elemento.getBoundingClientRect();

            // Calcola l'offset del mouse rispetto all'angolo superiore sinistro della carta renderizzata
            game.trascinamento.offsetX = e.clientX - rect.left;
            game.trascinamento.offsetY = e.clientY - rect.top;

            // Salva dimensioni iniziali della carta renderizzata
            game.trascinamento.widthIniziale = rect.width;
            game.trascinamento.heightIniziale = rect.height;

            // Crea un elemento fantasma per il trascinamento
            const fantasma = document.createElement('div');
            fantasma.style.position = 'fixed';
            fantasma.style.zIndex = '50000';
            fantasma.style.pointerEvents = 'none';
            fantasma.style.boxShadow = '5px 5px 20px rgba(0,0,0,0.5)';
            fantasma.style.backgroundImage = 'url(images/scala40/conjollyselplus.png)';
            fantasma.style.borderRadius = '5px';

            // Dimensioni iniziali (stesse della carta renderizzata)
            fantasma.style.width = rect.width + 'px';
            fantasma.style.height = rect.height + 'px';

            // Background-size proporzionale - scala separata per larghezza e altezza
            // Sprite originale: 1233x384 (17 colonne x 4 righe, carte 71x96)
            const bgScaleX = rect.width / 71;
            const bgScaleY = rect.height / 96;
            fantasma.style.backgroundSize = (1233 * bgScaleX) + 'px ' + (384 * bgScaleY) + 'px';

            // Posizione sprite della carta usando getSpritePosition
            const pos = carta.getSpritePosition();
            fantasma.style.backgroundPosition = `${pos.x * bgScaleX}px ${pos.y * bgScaleY}px`;

            document.body.appendChild(fantasma);
            game.trascinamento.fantasma = fantasma;

            // Nascondi l'elemento originale
            elemento.style.visibility = 'hidden';
        }

        const fantasma = game.trascinamento.fantasma;
        const widthIniziale = game.trascinamento.widthIniziale;
        const heightIniziale = game.trascinamento.heightIniziale;

        // Verifica se siamo nell'area combinazioni (sopra il limite inferiore delle aree)
        const campo = $('#campogioco');
        const campoRect = campo.getBoundingClientRect();
        const limiteInferioreAree = campoRect.top + 515; // 115px top + 400px altezza

        // Scala: 1.0 = dimensione originale, ridotta nell'area combinazioni
        // Le carte nelle combinazioni sono scale 0.5, quelle del giocatore 0.73
        let scala = 1.0;
        if (e.clientY < limiteInferioreAree) {
            scala = 0.5 / 0.73; // ~0.685
        }

        // Dimensioni carta
        const width = widthIniziale * scala;
        const height = heightIniziale * scala;

        // Posiziona il fantasma seguendo il mouse, mantenendo l'offset relativo
        const offsetXScaled = game.trascinamento.offsetX * scala;
        const offsetYScaled = game.trascinamento.offsetY * scala;

        fantasma.style.width = width + 'px';
        fantasma.style.height = height + 'px';
        fantasma.style.left = (e.clientX - offsetXScaled) + 'px';
        fantasma.style.top = (e.clientY - offsetYScaled) + 'px';

        // Background-size proporzionale - scala separata per larghezza e altezza
        // Sprite originale: 1233x384 (17 colonne x 4 righe, carte 71x96)
        const bgScaleX = width / 71;
        const bgScaleY = height / 96;
        fantasma.style.backgroundSize = (1233 * bgScaleX) + 'px ' + (384 * bgScaleY) + 'px';

        // Background-position per mostrare la carta corretta
        const carta = game.trascinamento.carta;
        const pos = carta.getSpritePosition();
        fantasma.style.backgroundPosition = `${pos.x * bgScaleX}px ${pos.y * bgScaleY}px`;

        // Verifica collisione angolo superiore destro con carte delle combinazioni
        verificaCollisioneCombinazioni(e.clientX - offsetXScaled + width, e.clientY - offsetYScaled, carta);
    }
}

// Verifica se il punto (angolo superiore destro del fantasma) tocca una carta in una combinazione
function verificaCollisioneCombinazioni(puntoX, puntoY, cartaTrascinata) {
    // Rimuovi evidenziazione precedente
    if (game.trascinamento.cartaTarget) {
        game.trascinamento.cartaTarget.classList.remove('carta-target');
        game.trascinamento.cartaTarget = null;
        game.trascinamento.combinazioneTarget = null;
    }

    // Cerca in tutte le combinazioni (noi e loro)
    const tutteCombi = [
        ...game.combinazioniNoi.map(c => ({ comb: c, area: 'noi' })),
        ...game.combinazioniLoro.map(c => ({ comb: c, area: 'loro' }))
    ];

    for (const { comb, area } of tutteCombi) {
        // Trova l'elemento DOM della combinazione
        const containerSel = area === 'noi' ? '#combinazioni-noi' : '#combinazioni-loro';
        const container = $(containerSel);
        const combElements = container.querySelectorAll('.combinazione');

        // Trova l'indice della combinazione
        const combIndex = area === 'noi'
            ? game.combinazioniNoi.indexOf(comb)
            : game.combinazioniLoro.indexOf(comb);

        if (combIndex < 0 || combIndex >= combElements.length) continue;

        const combEl = combElements[combIndex];
        const carteEl = combEl.querySelectorAll('.carta');

        // Controlla ogni carta nella combinazione DALL'ULTIMA ALLA PRIMA
        // (le carte successive hanno z-index maggiore perche' sono sovrapposte)
        for (let i = carteEl.length - 1; i >= 0; i--) {
            const cartaEl = carteEl[i];
            const rect = cartaEl.getBoundingClientRect();

            // Verifica se il punto e' dentro questa carta
            if (puntoX >= rect.left && puntoX <= rect.right &&
                puntoY >= rect.top && puntoY <= rect.bottom) {

                // Verifica se la carta trascinata puo' essere aggiunta a questa combinazione
                if (puoAggiungereACombinazione(cartaTrascinata, comb)) {
                    cartaEl.classList.add('carta-target');
                    game.trascinamento.cartaTarget = cartaEl;
                    game.trascinamento.combinazioneTarget = comb;
                    return;
                }
            }
        }
    }
}

function onMouseUp(e) {
    if (!game.trascinamento) return;

    const { carta, elemento, moved, fantasma, cartaTarget, combinazioneTarget } = game.trascinamento;

    // Rimuovi il fantasma se esiste
    if (fantasma) {
        fantasma.remove();
    }

    // Rimuovi evidenziazione carta target
    if (cartaTarget) {
        cartaTarget.classList.remove('carta-target');
    }

    // Ripristina la visibilita' dell'elemento originale
    elemento.style.visibility = '';
    elemento.classList.remove('trascinando');

    if (!moved) {
        // Click semplice - seleziona/deseleziona
        toggleSelezioneCarta(carta);
    } else {
        // Fine trascinamento - controlla dove e' stata rilasciata
        if (combinazioneTarget) {
            // Rilasciata su una combinazione valida - aggiungi la carta
            aggiungiCartaACombinazione(carta, combinazioneTarget);
        } else {
            const rect = $('#scarti-container').getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                // Rilasciata sugli scarti
                scartaCarta(carta);
            } else {
                // Verifica se rilasciata su un'altra carta nella mano per riordinare
                const cartaDestEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.carta');
                if (cartaDestEl && cartaDestEl !== elemento) {
                    const cartaDestId = parseInt(cartaDestEl.dataset.cartaId);
                    const cartaDest = trovaCarta(cartaDestId);
                    if (cartaDest && game.giocatori[0].carte.includes(cartaDest)) {
                        // Riordina: sposta la carta trascinata nella posizione della carta destinazione
                        riordinaCartaMano(carta, cartaDest);
                    } else {
                        render();
                    }
                } else {
                    // Rilasciata altrove - rimetti a posto
                    render();
                }
            }
        }
    }

    game.trascinamento = null;
}

function onRightClick(e) {
    e.preventDefault();

    const cartaEl = e.target.closest('.carta');
    if (!cartaEl) return;

    const cartaId = parseInt(cartaEl.dataset.cartaId);
    const carta = trovaCarta(cartaId);

    if (carta && game.giocatori[0].carte.includes(carta)) {
        // Click destro - scarta direttamente
        if (game.haPescato) {
            scartaCarta(carta);
        }
    }
}

function onTouchStart(e) {
    if (game.fase === 'finito') return;

    const touch = e.touches[0];
    const cartaEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.carta');
    if (!cartaEl) return;

    e.preventDefault();

    const cartaId = parseInt(cartaEl.dataset.cartaId);
    const carta = trovaCarta(cartaId);

    if (carta && game.giocatori[0].carte.includes(carta)) {
        game.trascinamento = {
            carta: carta,
            elemento: cartaEl,
            startX: touch.clientX,
            startY: touch.clientY,
            moved: false
        };
    }
}

function onTouchMove(e) {
    if (!game.trascinamento) return;

    const touch = e.touches[0];
    const dx = touch.clientX - game.trascinamento.startX;
    const dy = touch.clientY - game.trascinamento.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        game.trascinamento.moved = true;

        // Crea il fantasma se non esiste ancora
        if (!game.trascinamento.fantasma) {
            const carta = game.trascinamento.carta;
            const elemento = game.trascinamento.elemento;
            const rect = elemento.getBoundingClientRect();

            // Calcola l'offset del touch rispetto all'angolo superiore sinistro della carta renderizzata
            game.trascinamento.offsetX = touch.clientX - rect.left;
            game.trascinamento.offsetY = touch.clientY - rect.top;

            // Salva dimensioni iniziali della carta renderizzata
            game.trascinamento.widthIniziale = rect.width;
            game.trascinamento.heightIniziale = rect.height;

            // Crea un elemento fantasma per il trascinamento
            const fantasma = document.createElement('div');
            fantasma.style.position = 'fixed';
            fantasma.style.zIndex = '50000';
            fantasma.style.pointerEvents = 'none';
            fantasma.style.boxShadow = '5px 5px 20px rgba(0,0,0,0.5)';
            fantasma.style.backgroundImage = 'url(images/scala40/conjollyselplus.png)';
            fantasma.style.borderRadius = '5px';

            // Dimensioni iniziali (stesse della carta renderizzata)
            fantasma.style.width = rect.width + 'px';
            fantasma.style.height = rect.height + 'px';

            // Background-size proporzionale - scala separata per larghezza e altezza
            // Sprite originale: 1233x384 (17 colonne x 4 righe, carte 71x96)
            const bgScaleX = rect.width / 71;
            const bgScaleY = rect.height / 96;
            fantasma.style.backgroundSize = (1233 * bgScaleX) + 'px ' + (384 * bgScaleY) + 'px';

            // Posizione sprite della carta usando getSpritePosition
            const pos = carta.getSpritePosition();
            fantasma.style.backgroundPosition = `${pos.x * bgScaleX}px ${pos.y * bgScaleY}px`;

            document.body.appendChild(fantasma);
            game.trascinamento.fantasma = fantasma;

            // Nascondi l'elemento originale
            elemento.style.visibility = 'hidden';
        }

        const fantasma = game.trascinamento.fantasma;
        const widthIniziale = game.trascinamento.widthIniziale;
        const heightIniziale = game.trascinamento.heightIniziale;

        // Verifica se siamo nell'area combinazioni (sopra il limite inferiore delle aree)
        const campo = $('#campogioco');
        const campoRect = campo.getBoundingClientRect();
        const limiteInferioreAree = campoRect.top + 515; // 115px top + 400px altezza

        // Scala: 1.0 = dimensione originale, ridotta nell'area combinazioni
        let scala = 1.0;
        if (touch.clientY < limiteInferioreAree) {
            scala = 0.5 / 0.73; // ~0.685
        }

        // Dimensioni carta
        const width = widthIniziale * scala;
        const height = heightIniziale * scala;

        // Posiziona il fantasma seguendo il touch, mantenendo l'offset relativo
        const offsetXScaled = game.trascinamento.offsetX * scala;
        const offsetYScaled = game.trascinamento.offsetY * scala;

        fantasma.style.width = width + 'px';
        fantasma.style.height = height + 'px';
        fantasma.style.left = (touch.clientX - offsetXScaled) + 'px';
        fantasma.style.top = (touch.clientY - offsetYScaled) + 'px';

        // Background-size proporzionale - scala separata per larghezza e altezza
        // Sprite originale: 1233x384 (17 colonne x 4 righe, carte 71x96)
        const bgScaleX = width / 71;
        const bgScaleY = height / 96;
        fantasma.style.backgroundSize = (1233 * bgScaleX) + 'px ' + (384 * bgScaleY) + 'px';

        // Background-position per mostrare la carta corretta
        const carta = game.trascinamento.carta;
        const pos = carta.getSpritePosition();
        fantasma.style.backgroundPosition = `${pos.x * bgScaleX}px ${pos.y * bgScaleY}px`;
    }
}

function onTouchEnd(e) {
    if (!game.trascinamento) return;

    const { carta, elemento, moved, fantasma } = game.trascinamento;

    // Rimuovi il fantasma se esiste
    if (fantasma) {
        fantasma.remove();
    }

    // Ripristina la visibilita' dell'elemento originale
    elemento.style.visibility = '';
    elemento.classList.remove('trascinando');

    if (!moved) {
        toggleSelezioneCarta(carta);
    } else {
        const touch = e.changedTouches[0];
        const rect = $('#scarti-container').getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            scartaCarta(carta);
        } else {
            render();
        }
    }

    game.trascinamento = null;
}

function trovaCarta(id) {
    // Cerca in tutte le posizioni
    for (const g of game.giocatori) {
        const carta = g.carte.find(c => c.id === id);
        if (carta) return carta;
    }

    let carta = game.mazzo.find(c => c.id === id);
    if (carta) return carta;

    carta = game.scarti.find(c => c.id === id);
    if (carta) return carta;

    for (const poz of game.pozzetti) {
        carta = poz.find(c => c.id === id);
        if (carta) return carta;
    }

    return null;
}

// ============================================================================
// MODALI
// ============================================================================

function mostraModal(id) {
    $('#schermo').style.display = 'block';
    $('#' + id).style.display = 'block';
}

function chiudiModals() {
    $('#schermo').style.display = 'none';
    $$('.modal').forEach(m => m.style.display = 'none');
}

// ============================================================================
// DEBUG / CHEAT
// ============================================================================

// Funzione di test: aggiunge una carta a ogni giocatore
function testAggiungiCarta() {
    const carteDiTest = [
        new Carta('C', 7, 0, 900),   // 7 di Cuori per giocatore 0
        new Carta('Q', 10, 0, 901),  // 10 di Quadri per giocatore 1
        new Carta('F', 5, 0, 902),   // 5 di Fiori per giocatore 2
        new Carta('P', 12, 0, 903)   // Regina di Picche per giocatore 3
    ];

    for (let i = 0; i < game.giocatori.length; i++) {
        const carta = carteDiTest[i];
        if (game.mostraTutteCarteScoperte || i === 0) {
            carta.faceUp = true;
        }
        game.giocatori[i].carte.push(carta);
    }

    render();
    console.log('Aggiunta una carta a ogni giocatore');
}

function toggleScoperte() {
    game.mostraTutteCarteScoperte = !game.mostraTutteCarteScoperte;

    // Aggiorna stato faceUp di tutte le carte degli avversari
    for (const giocatore of game.giocatori) {
        if (!giocatore.isUmano) {
            for (const carta of giocatore.carte) {
                carta.faceUp = game.mostraTutteCarteScoperte;
            }
        }
    }

    // Aggiorna testo pulsante
    $('#btn-scoperte').textContent = game.mostraTutteCarteScoperte ? 'COPERTE' : 'SCOPERTE';

    render();
}

// ============================================================================
// DIAGNOSTICA (finestra separata)
// ============================================================================

// Mappa nomi azioni per visualizzazione
const AZIONE_NOMI = {
    [AZIONE_PESCA_MAZZO]: 'Pesca mazzo',
    [AZIONE_PESCA_SCARTI]: 'Pesca scarti',
    [AZIONE_SCARTO]: 'Scarto',
    [AZIONE_COMBINAZIONE]: 'Combinazione',
    [AZIONE_ATTACCO]: 'Attacco',
    [AZIONE_POZZETTO]: 'Pozzetto'
};

// Riferimento alla finestra diagnostica
let diagWindow = null;

function toggleDiagnostica() {
    // Se la finestra esiste ed è aperta, la chiudiamo
    if (diagWindow && !diagWindow.closed) {
        diagWindow.close();
        diagWindow = null;
        return;
    }

    // Apri nuova finestra
    diagWindow = window.open('', 'BurracoDiagnostica',
        'width=700,height=500,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!diagWindow) {
        console.error('Impossibile aprire la finestra diagnostica (popup bloccato?)');
        return;
    }

    // Scrivi il contenuto HTML della finestra
    diagWindow.document.write(getDiagnosticaHTML());
    diagWindow.document.close();

    // Aggiorna il contenuto
    aggiornaDiagnostica();
}

function getDiagnosticaHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Burraco - Diagnostica</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            background: #1a1a2e;
            color: #ddd;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #2a2a4e;
            color: #aaf;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 14px;
            border-bottom: 1px solid #4a4a6a;
        }
        .content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .footer {
            background: #2a2a4e;
            color: #888;
            padding: 8px 15px;
            font-size: 11px;
            border-top: 1px solid #4a4a6a;
        }
        .storia-riga {
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 3px;
            display: flex;
            gap: 10px;
            cursor: pointer;
        }
        .storia-riga:hover { background: #3a3a5e; }
        .storia-riga.selected { background: #4a4a7e; }
        .storia-riga.giocatore-0 { border-left: 3px solid #4a4; }
        .storia-riga.giocatore-1 { border-left: 3px solid #a44; }
        .storia-riga.giocatore-2 { border-left: 3px solid #44a; }
        .storia-riga.giocatore-3 { border-left: 3px solid #a4a; }
        .storia-turno { color: #888; width: 40px; }
        .storia-giocatore { color: #aaa; width: 100px; }
        .storia-azione { color: #8cf; width: 100px; }
        .storia-dettagli { color: #ccc; flex: 1; }
        .btn-refresh {
            background: #4a4;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 15px;
        }
        .btn-refresh:hover { background: #5b5; }
    </style>
</head>
<body>
    <div class="header">
        Diagnostica - Storia Mosse
        <button class="btn-refresh" onclick="window.opener.aggiornaDiagnostica()">Aggiorna</button>
    </div>
    <div id="content" class="content">
        <!-- Contenuto generato da JS -->
    </div>
    <div id="footer" class="footer">
        Turno: 0 | Mosse: 0
    </div>
    <script>
        let detailWin = null;
        function apriDettaglio(indice, el) {
            // Rimuovi selezione precedente
            document.querySelectorAll('.storia-riga').forEach(r => r.classList.remove('selected'));
            if (el) el.classList.add('selected');
            // Chiedi al parent di generare HTML e aprilo qui
            const html = window.opener.getDettaglioHTML(window.opener.game.storia[indice], indice);
            if (!detailWin || detailWin.closed) {
                detailWin = window.open('', 'BurracoDettaglio',
                    'width=600,height=500,resizable=yes,scrollbars=yes');
            }
            if (detailWin) {
                detailWin.document.open();
                detailWin.document.write(html);
                detailWin.document.close();
                detailWin.focus();
            }
        }
    </script>
</body>
</html>`;
}

function aggiornaDiagnostica() {
    if (!diagWindow || diagWindow.closed) return;

    const content = diagWindow.document.getElementById('content');
    const footer = diagWindow.document.getElementById('footer');
    if (!content || !footer) return;

    if (game.storia.length === 0) {
        content.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">Nessuna mossa registrata</div>';
        footer.textContent = 'Turno: 0 | Mosse: 0';
        return;
    }

    // Helper per ottenere nome giocatore
    const nomeGiocatore = (idx) => {
        if (!game.giocatori || !game.giocatori[idx]) return `Giocatore ${idx}`;
        return game.giocatori[idx].nome;
    };

    // Helper per nome breve carta (7C, 8Q, JK per jolly)
    const nomeBreve = (id) => {
        const c = tutteLeCarte[id];
        if (!c) return `#${id}`;
        if (c.isJolly) return 'JK';
        const numNomi = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return numNomi[c.numero] + c.seme;
    };

    // Helper per formattare dettagli
    const formattaDettagli = (mossa) => {
        const parti = [];

        if (mossa.carta !== undefined) {
            parti.push(nomeBreve(mossa.carta));
        }

        if (mossa.carte && mossa.carte.length > 0) {
            const nomi = mossa.carte.map(nomeBreve);
            parti.push(`[${nomi.join(' ')}]`);
        }

        if (mossa.combinazione !== undefined) {
            parti.push(`comb: #${mossa.combinazione}`);
        }

        if (mossa.tipo !== undefined) {
            parti.push(`tipo: ${mossa.tipo === TIPO_TRIS ? 'Tris' : 'Scala'}`);
        }

        if (mossa.sostituzione) {
            parti.push('(sostituzione)');
        }

        if (mossa.squadra !== undefined) {
            parti.push(`squadra: ${mossa.squadra}`);
        }

        return parti.join(' | ');
    };

    // Genera HTML
    let html = '';
    for (let i = 0; i < game.storia.length; i++) {
        const mossa = game.storia[i];
        const azioneNome = AZIONE_NOMI[mossa.azione] || `Azione ${mossa.azione}`;
        const dettagli = formattaDettagli(mossa);

        html += `<div class="storia-riga giocatore-${mossa.giocatore}" data-indice="${i}" onclick="apriDettaglio(${i}, this)">
            <span class="storia-turno">T${mossa.turno}</span>
            <span class="storia-giocatore">${nomeGiocatore(mossa.giocatore)}</span>
            <span class="storia-azione">${azioneNome}</span>
            <span class="storia-dettagli">${dettagli}</span>
        </div>`;
    }

    content.innerHTML = html;
    footer.textContent = `Turno: ${game.turno} | Mosse: ${game.storia.length}`;

    // Scroll to bottom
    content.scrollTop = content.scrollHeight;
}

// Finestra dettaglio snapshot
let detailWindow = null;

function mostraDettaglioMossa(indice, elemento) {
    if (indice < 0 || indice >= game.storia.length) return;

    const mossa = game.storia[indice];

    // Rimuovi selezione precedente e aggiungi nuova
    if (diagWindow && !diagWindow.closed) {
        const righe = diagWindow.document.querySelectorAll('.storia-riga');
        righe.forEach(r => r.classList.remove('selected'));
        if (elemento) elemento.classList.add('selected');
    }

    // Se la finestra non esiste o è chiusa, creala
    if (!detailWindow || detailWindow.closed) {
        detailWindow = window.open('', 'BurracoDettaglio',
            'width=600,height=500,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no'
        );
        if (!detailWindow) {
            console.error('Impossibile aprire finestra dettaglio');
            return;
        }
    }

    // Genera HTML per lo snapshot
    const html = getDettaglioHTML(mossa, indice);
    detailWindow.document.open();
    detailWindow.document.write(html);
    detailWindow.document.close();
    detailWindow.focus();
}

function getDettaglioHTML(mossa, indice) {
    const nomeGiocatore = (idx) => {
        if (!game.giocatori || !game.giocatori[idx]) return `Giocatore ${idx}`;
        return game.giocatori[idx].nome;
    };

    const azioneNome = AZIONE_NOMI[mossa.azione] || `Azione ${mossa.azione}`;
    const snapshot = mossa.snapshot;

    // Helper per nome breve carta (7C, 8Q, JK per jolly)
    const nomeBreve = (id) => {
        const c = tutteLeCarte[id];
        if (!c) return `#${id}`;
        if (c.isJolly) return 'JK';
        const numNomi = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return numNomi[c.numero] + c.seme;
    };

    // Helper per formattare array di carte
    const formattaCarte = (ids) => {
        if (!ids || ids.length === 0) return '(vuoto)';
        return ids.map(nomeBreve).join(' ');
    };

    // Helper per formattare combinazioni
    const formattaCombinazioni = (combs) => {
        if (!combs || combs.length === 0) return '(nessuna)';
        return combs.map(c => {
            const tipo = c.tipo === TIPO_TRIS ? 'Tris' : 'Scala';
            const carte = formattaCarte(c.carte);
            return `<div style="margin-left:15px; margin-bottom:5px;">#${c.id} ${tipo}: ${carte}</div>`;
        }).join('');
    };

    return `<!DOCTYPE html>
<html>
<head>
    <title>Dettaglio Mossa #${indice}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            background: #1a1a2e;
            color: #ddd;
            padding: 15px;
            overflow-y: auto;
        }
        .header {
            background: #2a2a4e;
            color: #aaf;
            padding: 10px 15px;
            margin: -15px -15px 15px -15px;
            font-weight: bold;
            font-size: 14px;
        }
        .section {
            background: #252540;
            border: 1px solid #3a3a5a;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
        }
        .section-title {
            color: #8cf;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid #3a3a5a;
            padding-bottom: 5px;
        }
        .field { margin: 4px 0; }
        .label { color: #888; }
        .value { color: #cfc; }
        .carte-list { color: #ffc; margin-left: 15px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="header">
        Mossa #${indice} - Turno ${mossa.turno} - ${nomeGiocatore(mossa.giocatore)} - ${azioneNome}
    </div>

    <div class="section">
        <div class="section-title">Dettagli Mossa</div>
        <div class="field"><span class="label">Turno:</span> <span class="value">${mossa.turno}</span></div>
        <div class="field"><span class="label">Giocatore:</span> <span class="value">${nomeGiocatore(mossa.giocatore)}</span></div>
        <div class="field"><span class="label">Azione:</span> <span class="value">${azioneNome}</span></div>
        ${mossa.carta !== undefined ? `<div class="field"><span class="label">Carta:</span> <span class="value">${nomeBreve(mossa.carta)}</span></div>` : ''}
        ${mossa.carte ? `<div class="field"><span class="label">Carte:</span> <span class="value">${formattaCarte(mossa.carte)}</span></div>` : ''}
        ${mossa.combinazione !== undefined ? `<div class="field"><span class="label">Combinazione:</span> <span class="value">#${mossa.combinazione}</span></div>` : ''}
    </div>

    <div class="section">
        <div class="section-title">Snapshot (stato PRIMA della mossa)</div>
        <div class="field"><span class="label">Fase:</span> <span class="value">${snapshot.fase}</span></div>
        <div class="field"><span class="label">Ha pescato:</span> <span class="value">${snapshot.haPescato}</span></div>
    </div>

    <div class="section">
        <div class="section-title">Mazzo (${snapshot.mazzo.length} carte)</div>
        <div class="carte-list">${formattaCarte(snapshot.mazzo)}</div>
    </div>

    <div class="section">
        <div class="section-title">Scarti (${snapshot.scarti.length} carte)</div>
        <div class="carte-list">${formattaCarte(snapshot.scarti)}</div>
    </div>

    <div class="section">
        <div class="section-title">Pozzetto Noi (${snapshot.pozzetti[0].length} carte)</div>
        <div class="carte-list">${formattaCarte(snapshot.pozzetti[0])}</div>
    </div>

    <div class="section">
        <div class="section-title">Pozzetto Loro (${snapshot.pozzetti[1].length} carte)</div>
        <div class="carte-list">${formattaCarte(snapshot.pozzetti[1])}</div>
    </div>

    ${snapshot.mani.map((mano, i) => `
    <div class="section">
        <div class="section-title">${nomeGiocatore(i)} (${mano.length} carte)</div>
        <div class="carte-list">${formattaCarte(mano)}</div>
    </div>
    `).join('')}

    <div class="section">
        <div class="section-title">Combinazioni Noi</div>
        ${formattaCombinazioni(snapshot.combinazioniNoi)}
    </div>

    <div class="section">
        <div class="section-title">Combinazioni Loro</div>
        ${formattaCombinazioni(snapshot.combinazioniLoro)}
    </div>

    <div class="section">
        <div class="section-title">Punteggi</div>
        <div class="field"><span class="label">Noi:</span> <span class="value">${snapshot.puntiNoi}</span></div>
        <div class="field"><span class="label">Loro:</span> <span class="value">${snapshot.puntiLoro}</span></div>
    </div>
</body>
</html>`;
}

// Aggiorna automaticamente la finestra diagnostica ad ogni mossa
const originalRegistraMossa = registraMossa;
registraMossa = function(azione, dettagli = {}) {
    originalRegistraMossa(azione, dettagli);
    // Aggiorna la finestra diagnostica se aperta
    setTimeout(aggiornaDiagnostica, 100);
};

// Chiudi finestre diagnostiche quando si chiude la pagina
window.addEventListener('beforeunload', () => {
    if (diagWindow && !diagWindow.closed) {
        diagWindow.close();
    }
    if (detailWindow && !detailWindow.closed) {
        detailWindow.close();
    }
});

// ============================================================================
// AVVIO
// ============================================================================

document.addEventListener('DOMContentLoaded', init);
