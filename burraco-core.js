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
 * - sogliaPescaScarti: 0=raccoglie tutto, 10=solo pile grosse e utili
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
            sogliaPescaScarti: 6, compressione: 2,
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
            sogliaPescaScarti: 5, compressione: 3,
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
            sogliaPescaScarti: 2, compressione: 7,
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
            sogliaPescaScarti: 5, compressione: 4,
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
            sogliaPescaScarti: 6, compressione: 3,
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
            sogliaPescaScarti: 4, compressione: 5,
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
            sogliaPescaScarti: 5, compressione: 3,
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
            sogliaPescaScarti: 5, compressione: 3,
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
            sogliaPescaScarti: 5, compressione: 2,
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
            sogliaPescaScarti: 3, compressione: 5,
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
            sogliaPescaScarti: 4, compressione: 4,
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
            sogliaPescaScarti: 4, compressione: 5,
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

    // Conta le matte (jolly e pinelle NON al posto naturale)
    get matteUsate() {
        return this.carte.filter((c, idx) => {
            if (c.isJolly) return true;
            if (c.isPinella) {
                // Pinella al posto naturale (posizione 2 in una scala) non conta come matta
                if (this.tipo === TIPO_SCALA) {
                    // La pinella è al posto naturale se rappresenta il 2 del seme della scala
                    // Assumiamo che le carte siano ordinate per numero
                    const numeriScala = this.carte.map(carta => {
                        if (carta.isJolly || (carta.isPinella && carta.seme !== this.seme)) {
                            return null; // matta, posizione sconosciuta
                        }
                        return carta.numero;
                    });
                    // Trova il primo numero valido e calcola la posizione attesa del 2
                    for (let i = 0; i < numeriScala.length; i++) {
                        if (numeriScala[i] !== null) {
                            const startNum = numeriScala[i] - i;
                            const expectedNum = startNum + idx;
                            // Se la pinella è in posizione dove dovrebbe esserci il 2, è naturale
                            if (expectedNum === 2 && c.numero === 2) return false;
                            break;
                        }
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
        sogliaPescaScarti: 5, compressione: 3,
        valoreCentralita: 5, prefScale: 5, sogliaDeposito: 5,
        prefBurracoPulito: 5, parsimoniaMatte: 5,
        prudenzaScarto: 5, cooperazione: 5,
        propensioAttacco: 5, frettaChiusura: 5,
        tendenzaControgioco: 5,
        memoria: 5, letturaAvversario: 5, audacia: 5
    },

    // Helper: nome sintetico di una carta (es. "7C", "KP", "Jo")
    nomeCarta(carta) {
        if (!carta) return '?';
        if (carta.isJolly) return 'Jo';
        const numeri = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return (numeri[carta.numero] || carta.numero) + (carta.seme || '');
    },

    // Helper: descrizione sintetica di un array di carte
    descrizioneCarte(carte) {
        if (!carte || carte.length === 0) return '';
        return carte.map(c => this.nomeCarta(c)).join(' ');
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
        const oss = giocatore.osservazioni;
        const mano = giocatore.carte;

        // Reset analisi
        oss.possibiliTris = [];
        oss.possibiliScale = [];
        oss.possibiliCalate = [];
        oss.carteMorte = [];
        oss.matte = [];

        // Trova matte (jolly e pinelle)
        oss.matte = mano.filter(c => c.isJolly || c.isPinella);

        // Trova possibili tris
        oss.possibiliTris = this.trovaTris(mano);

        // Trova possibili scale
        oss.possibiliScale = this.trovaScale(mano);

        // Trova possibili calate su combo esistenti
        oss.possibiliCalate = this.trovaCalate(giocatore);

        // Trova carte morte (non usate in nessuna combinazione possibile)
        const carteUsate = new Set();
        oss.possibiliTris.forEach(t => t.carte.forEach(c => carteUsate.add(c.id)));
        oss.possibiliScale.forEach(s => s.carte.forEach(c => carteUsate.add(c.id)));
        oss.possibiliCalate.forEach(c => carteUsate.add(c.carta.id));

        oss.carteMorte = mano.filter(c => !carteUsate.has(c.id) && !c.isJolly && !c.isPinella);

        // Genera opzioni di gioco
        this.generaOpzioniGioco(giocatore);

        this.logPensiero(giocatore, `Analisi: ${oss.possibiliTris.length} tris, ${oss.possibiliScale.length} scale, ${oss.possibiliCalate.length} calate, ${oss.carteMorte.length} morte`);
    },

    // Trova tutti i possibili tris nella mano
    // Regole burraco: max 2 carte stesso seme (2 mazzi), max 1 matta
    trovaTris(mano) {
        const tris = [];
        const perNumero = new Map(); // numero -> [carte]

        // Raggruppa per numero (escluse matte)
        mano.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perNumero.has(c.numero)) perNumero.set(c.numero, []);
                perNumero.get(c.numero).push(c);
            }
        });

        // Trova jolly e pinelle disponibili
        const matte = mano.filter(c => c.isJolly || c.isPinella);

        // Helper: seleziona fino a N carte rispettando max 2 per seme
        const selezionaCarteValide = (carte, maxCarte) => {
            const semeCount = new Map(); // seme -> count
            const selezionate = [];
            for (const c of carte) {
                const count = semeCount.get(c.seme) || 0;
                if (count < 2 && selezionate.length < maxCarte) { // Max 2 per seme (2 mazzi)
                    selezionate.push(c);
                    semeCount.set(c.seme, count + 1);
                }
            }
            return selezionate;
        };

        // Per ogni numero
        perNumero.forEach((carte, numero) => {
            // Tris pulito (3+ carte senza matta)
            if (carte.length >= 3) {
                const trisCarte = selezionaCarteValide(carte, 4); // Max 4 carte (un poker)
                if (trisCarte.length >= 3) {
                    // Genera tris con esattamente 3 carte
                    tris.push({
                        carte: trisCarte.slice(0, 3),
                        punti: trisCarte.slice(0, 3).reduce((s, c) => s + c.punti, 0),
                        usaMatta: false,
                        numero: numero
                    });
                    // Se 4 carte, genera anche il poker
                    if (trisCarte.length >= 4) {
                        tris.push({
                            carte: trisCarte.slice(0, 4),
                            punti: trisCarte.slice(0, 4).reduce((s, c) => s + c.punti, 0),
                            usaMatta: false,
                            numero: numero
                        });
                    }
                }
            }

            // Tris con matta (2+ carte + 1 matta)
            if (carte.length >= 2 && matte.length > 0) {
                const trisCarte = selezionaCarteValide(carte, 2);
                if (trisCarte.length >= 2) {
                    // Genera un tris per ogni matta disponibile
                    for (const matta of matte) {
                        tris.push({
                            carte: [...trisCarte, matta],
                            punti: trisCarte.reduce((s, c) => s + c.punti, 0) + matta.punti,
                            usaMatta: true,
                            mattaUsata: matta,
                            numero: numero
                        });
                    }
                }
            }
        });

        return tris;
    },

    // Trova tutte le possibili scale nella mano
    // Gestisce: scale pulite, matta all'inizio/fine, matta nel mezzo (buco)
    trovaScale(mano) {
        const scale = [];
        const perSeme = new Map(); // seme -> Map(numero -> carta)

        // Raggruppa per seme (escluse matte)
        mano.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perSeme.has(c.seme)) perSeme.set(c.seme, new Map());
                // Se già esiste una carta con lo stesso numero (2 mazzi), tieni entrambe
                const semeMap = perSeme.get(c.seme);
                if (!semeMap.has(c.numero)) {
                    semeMap.set(c.numero, []);
                }
                semeMap.get(c.numero).push(c);
            }
        });

        // Trova matte disponibili
        const matte = mano.filter(c => c.isJolly || c.isPinella);

        // Helper: prova a costruire una scala da 'start' a 'end' con max 1 buco
        const provaScala = (semeMap, seme, start, end) => {
            const risultati = [];
            const carteScala = [];
            let buchi = 0;
            let posizioneBuco = -1;

            for (let n = start; n <= end; n++) {
                if (semeMap.has(n)) {
                    carteScala.push({ numero: n, carta: semeMap.get(n)[0] });
                } else {
                    buchi++;
                    posizioneBuco = n;
                    carteScala.push({ numero: n, carta: null }); // Buco
                }
            }

            const lunghezza = end - start + 1;
            if (lunghezza < 3) return risultati;

            // Scala pulita (nessun buco)
            if (buchi === 0) {
                const carte = carteScala.map(x => x.carta);
                risultati.push({
                    carte: carte,
                    punti: carte.reduce((s, c) => s + c.punti, 0),
                    usaMatta: false,
                    seme: seme,
                    daNumero: start,
                    aNumero: end
                });
            }
            // Scala con 1 buco (riempito da matta)
            else if (buchi === 1 && matte.length > 0) {
                for (const matta of matte) {
                    const carte = carteScala.map(x => x.carta || matta);
                    risultati.push({
                        carte: carte,
                        punti: carte.reduce((s, c) => s.punti ? s + c.punti : c.punti, 0),
                        usaMatta: true,
                        mattaUsata: matta,
                        seme: seme,
                        daNumero: start,
                        aNumero: end,
                        posizioneMatta: posizioneBuco
                    });
                }
            }

            return risultati;
        };

        // Per ogni seme
        perSeme.forEach((semeMap, seme) => {
            const numeri = [...semeMap.keys()].sort((a, b) => a - b);
            if (numeri.length < 2) return; // Serve almeno 2 carte + eventuale matta

            // Prova tutte le scale possibili di lunghezza 3-7
            for (let len = 3; len <= 7; len++) {
                for (let start = 1; start <= 14 - len; start++) {
                    const end = start + len - 1;
                    if (end > 13) continue; // K è 13

                    // Conta quante carte ho in questo range
                    let carteNelRange = 0;
                    for (let n = start; n <= end; n++) {
                        if (semeMap.has(n)) carteNelRange++;
                    }

                    // Serve almeno (len-1) carte per scala con matta, o len per pulita
                    if (carteNelRange >= len) {
                        // Scala pulita possibile
                        scale.push(...provaScala(semeMap, seme, start, end));
                    } else if (carteNelRange === len - 1 && matte.length > 0) {
                        // Scala con 1 buco possibile
                        scale.push(...provaScala(semeMap, seme, start, end));
                    }
                }
            }

            // Aggiungi anche scale con matta all'inizio o alla fine
            // (estensione di 2 carte consecutive)
            for (let i = 0; i < numeri.length - 1; i++) {
                const n1 = numeri[i];
                const n2 = numeri[i + 1];
                if (n2 === n1 + 1 && matte.length > 0) {
                    // Due carte consecutive: posso estendere con matta
                    const c1 = semeMap.get(n1)[0];
                    const c2 = semeMap.get(n2)[0];

                    for (const matta of matte) {
                        // Matta prima (se n1 > 1)
                        if (n1 > 1) {
                            scale.push({
                                carte: [matta, c1, c2],
                                punti: c1.punti + c2.punti + matta.punti,
                                usaMatta: true,
                                mattaUsata: matta,
                                seme: seme,
                                daNumero: n1 - 1,
                                aNumero: n2
                            });
                        }
                        // Matta dopo (se n2 < 13)
                        if (n2 < 13) {
                            scale.push({
                                carte: [c1, c2, matta],
                                punti: c1.punti + c2.punti + matta.punti,
                                usaMatta: true,
                                mattaUsata: matta,
                                seme: seme,
                                daNumero: n1,
                                aNumero: n2 + 1
                            });
                        }
                    }
                }
            }
        });

        // Rimuovi duplicati (stesse carte)
        const uniche = [];
        const viste = new Set();
        for (const s of scale) {
            const key = s.carte.map(c => c.id).sort().join(',');
            if (!viste.has(key)) {
                viste.add(key);
                uniche.push(s);
            }
        }

        return uniche;
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
    generaOpzioniGioco(giocatore) {
        if (!giocatore.osservazioni) return;
        const oss = giocatore.osservazioni;

        // Array di opzioni singole (base)
        const opzioniSingole = [];

        // Genera opzioni da singoli tris
        for (const tris of oss.possibiliTris) {
            const carteIds = new Set(tris.carte.map(c => c.id));
            opzioniSingole.push({
                mosse: [{ tipo: 'tris', ...tris }],
                carteUsate: carteIds,
                puntiTotali: tris.punti,
                descCarte: `T: ${this.descrizioneCarte(tris.carte)}`
            });
        }

        // Genera opzioni da singole scale
        for (const scala of oss.possibiliScale) {
            const carteIds = new Set(scala.carte.map(c => c.id));
            opzioniSingole.push({
                mosse: [{ tipo: 'scala', ...scala }],
                carteUsate: carteIds,
                puntiTotali: scala.punti,
                descCarte: `S${scala.seme}: ${this.descrizioneCarte(scala.carte)}`
            });
        }

        // Genera opzioni da singole calate
        for (const calata of oss.possibiliCalate) {
            const carteIds = new Set([calata.carta.id]);
            opzioniSingole.push({
                mosse: [{ tipo: 'calata', ...calata }],
                carteUsate: carteIds,
                puntiTotali: calata.carta.punti,
                descCarte: `C: ${this.nomeCarta(calata.carta)}`
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

        // Genera TUTTE le combinazioni non conflittuali
        // Per ogni indice di partenza, genera tutti i subset validi guardando solo avanti
        const generaCombinazioni = (startIdx, opzioniCorrenti) => {
            // Limite raggiunto?
            if (numCombinazioni >= MAX_COMBINAZIONI) return;

            // Se abbiamo almeno un'opzione, aggiungi la combinazione
            if (opzioniCorrenti.length > 0) {
                const combo = combinaOpzioni(opzioniCorrenti);
                combo.valutazione = this.valutaOpzione(giocatore, combo.mosse, combo.carteUsate);
                oss.opzioniGioco.push(combo);
                numCombinazioni++;
            }

            // Prova ad aggiungere ogni opzione successiva (da startIdx in poi)
            for (let i = startIdx; i < opzioniSingole.length; i++) {
                if (numCombinazioni >= MAX_COMBINAZIONI) break;

                const nuovaOpt = opzioniSingole[i];

                // Verifica compatibilità con tutte le opzioni correnti
                const isCompatibile = opzioniCorrenti.every(opt => sonoCompatibili(opt, nuovaOpt));

                if (isCompatibile) {
                    // Ricorsione: aggiungi questa opzione e continua a guardare avanti
                    generaCombinazioni(i + 1, [...opzioniCorrenti, nuovaOpt]);
                }
            }
        };

        // Genera partendo da ogni indice
        for (let i = 0; i < opzioniSingole.length; i++) {
            if (numCombinazioni >= MAX_COMBINAZIONI) break;
            generaCombinazioni(i + 1, [opzioniSingole[i]]);
        }

        // Ordina per valutazione decrescente
        oss.opzioniGioco.sort((a, b) => b.valutazione - a.valutazione);
    },

    // Valuta un'opzione di gioco basandosi sui coefficienti
    valutaOpzione(giocatore, mosse, _carteUsate) {
        const coeff = this.getCoeff(giocatore);
        let valutazione = 0;

        // Punti base
        const puntiTotali = mosse.reduce((s, m) => s + (m.punti || m.carta?.punti || 0), 0);
        valutazione += puntiTotali / 100; // Max ~1.0 per 100 punti

        // Bonus per scale se prefScale alto
        const numScale = mosse.filter(m => m.tipo === 'scala').length;
        valutazione += numScale * (coeff.prefScale / 20); // 0 a 0.5

        // Bonus per non usare matte se parsimoniaMatte alto
        const usaMatta = mosse.some(m => m.usaMatta);
        if (!usaMatta) {
            valutazione += (coeff.parsimoniaMatte || 5) / 20; // 0 a 0.5
        }

        // Calate su combo esistenti: quasi sempre buone
        for (const m of mosse) {
            if (m.tipo === 'calata') {
                valutazione += 0.3;
                // Bonus extra se la calata porta verso burraco
                if (m.combo) {
                    const len = m.combo.carte.length;
                    if (len === 6) valutazione += 0.5;      // FA burraco!
                    else if (len >= 5) valutazione += 0.2;   // Vicino
                }
            }
        }

        // dovrebbiDepositare: penalizza depositi nuovi non strategici
        for (const m of mosse) {
            if ((m.tipo === 'tris' || m.tipo === 'scala') && m.carte) {
                if (!this.dovrebbiDepositare(giocatore, m.carte)) {
                    valutazione -= 0.5; // Deposito prematuro
                }
            }
        }

        // Penalita' se sogliaDeposito alto e pochi punti
        if (puntiTotali < 30 && coeff.sogliaDeposito > 5) {
            valutazione -= (coeff.sogliaDeposito - 5) * 0.05;
        }

        // Bonus per frettaChiusura se ha poche carte
        if (coeff.frettaChiusura > 5 && giocatore.carte.length <= 6) {
            valutazione += (coeff.frettaChiusura - 5) * 0.1;
        }

        return Math.max(0, Math.min(1, valutazione));
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

        // ===== 2. TROVA POSSIBILI TRIS =====
        // Raggruppa carte per numero (escluse matte)
        const perNumero = new Map();
        carte.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perNumero.has(c.numero)) perNumero.set(c.numero, []);
                perNumero.get(c.numero).push(c);
            }
        });

        // Per ogni numero, cerca tris (3+ carte stesso numero)
        perNumero.forEach((carteDiNumero, numero) => {
            // Tris pulito (senza matta)
            if (carteDiNumero.length >= 3) {
                const trisCarte = carteDiNumero.slice(0, Math.min(4, carteDiNumero.length));
                risultato.possibiliTris.push({
                    carte: trisCarte.slice(0, 3),
                    punti: trisCarte.slice(0, 3).reduce((s, c) => s + c.punti, 0),
                    usaMatta: false,
                    numero: numero
                });
            }
            // Tris con matta (2 carte + 1 matta)
            if (carteDiNumero.length >= 2 && risultato.matte.length > 0) {
                const matta = risultato.matte[0];
                risultato.possibiliTris.push({
                    carte: [...carteDiNumero.slice(0, 2), matta],
                    punti: carteDiNumero.slice(0, 2).reduce((s, c) => s + c.punti, 0) + matta.punti,
                    usaMatta: true,
                    numero: numero
                });
            }
        });

        // ===== 3. TROVA POSSIBILI SCALE =====
        // Raggruppa carte per seme (escluse matte)
        const perSeme = new Map();
        carte.forEach(c => {
            if (!c.isJolly && !c.isPinella) {
                if (!perSeme.has(c.seme)) perSeme.set(c.seme, new Map());
                const semeMap = perSeme.get(c.seme);
                if (!semeMap.has(c.numero)) semeMap.set(c.numero, []);
                semeMap.get(c.numero).push(c);
            }
        });

        // Per ogni seme, cerca scale (3+ carte consecutive)
        perSeme.forEach((semeMap, seme) => {
            const numeri = [...semeMap.keys()].sort((a, b) => a - b);

            // Scorri cercando sequenze di almeno 3
            for (let i = 0; i < numeri.length; i++) {
                let sequenza = [numeri[i]];
                let j = i + 1;

                // Estendi la sequenza finché sono consecutivi (o c'è 1 buco per matta)
                while (j < numeri.length) {
                    const diff = numeri[j] - sequenza[sequenza.length - 1];
                    if (diff === 1) {
                        sequenza.push(numeri[j]);
                        j++;
                    } else if (diff === 2 && risultato.matte.length > 0 && sequenza.length >= 2) {
                        // Buco di 1: può essere riempito con matta
                        sequenza.push(numeri[j] - 1); // posizione matta
                        sequenza.push(numeri[j]);
                        j++;
                        break; // Solo 1 matta per scala
                    } else {
                        break;
                    }
                }

                // Se abbiamo almeno 3 numeri, è una scala valida
                if (sequenza.length >= 3) {
                    const scalaCarte = [];
                    let usaMatta = false;

                    for (const num of sequenza) {
                        if (semeMap.has(num)) {
                            scalaCarte.push(semeMap.get(num)[0]);
                        } else if (risultato.matte.length > 0) {
                            // Posizione per la matta
                            scalaCarte.push(risultato.matte[0]);
                            usaMatta = true;
                        }
                    }

                    if (scalaCarte.length >= 3) {
                        risultato.possibiliScale.push({
                            carte: scalaCarte.slice(0, 7), // Max 7 per burraco
                            punti: scalaCarte.slice(0, 7).reduce((s, c) => s + c.punti, 0),
                            usaMatta: usaMatta,
                            seme: seme,
                            lunghezza: scalaCarte.length
                        });
                    }
                }
            }
        });

        // ===== 4. TROVA POSSIBILI CALATE (su combinazioni esistenti) =====
        if (combinazioniSquadra && combinazioniSquadra.length > 0) {
            for (const carta of carte) {
                for (const combo of combinazioniSquadra) {
                    if (typeof puoAggiungereACombinazione === 'function') {
                        const posizione = puoAggiungereACombinazione(carta, combo);
                        if (posizione) {
                            risultato.possibiliCalate.push({
                                carta: carta,
                                comboId: combo.id,
                                combo: combo,
                                punti: carta.punti
                            });
                        }
                    }
                }
            }
        }

        // ===== 5. CALCOLA CARTE MORTE (non usate in nessuna combinazione) =====
        const carteUsate = new Set();
        risultato.possibiliTris.forEach(t => t.carte.forEach(c => carteUsate.add(c.id)));
        risultato.possibiliScale.forEach(s => s.carte.forEach(c => carteUsate.add(c.id)));
        risultato.possibiliCalate.forEach(c => carteUsate.add(c.carta.id));

        risultato.carteMorte = carte.filter(c =>
            !carteUsate.has(c.id) && !c.isJolly && !c.isPinella
        );
        risultato.puntiCadaveri = risultato.carteMorte.reduce((s, c) => s + c.punti, 0);

        // ===== 6. TROVA MIGLIORE OPZIONE DI GIOCO =====
        // Sceglie la combinazione di mosse che massimizza i punti depositabili
        let migliorPunti = 0;

        // Valuta tris singoli
        for (const tris of risultato.possibiliTris) {
            if (tris.punti > migliorPunti) {
                migliorPunti = tris.punti;
                risultato.migliorOpzione = { tipo: 'tris', ...tris };
            }
        }

        // Valuta scale (priorità se più lunghe o burraco)
        for (const scala of risultato.possibiliScale) {
            const bonus = scala.lunghezza >= 7 ? 200 : 0; // Bonus burraco
            if (scala.punti + bonus > migliorPunti) {
                migliorPunti = scala.punti + bonus;
                risultato.migliorOpzione = { tipo: 'scala', ...scala };
                if (scala.lunghezza >= 7) risultato.numBurraco++;
            }
        }

        // Conta burraco possibili (scale di 7+)
        risultato.numBurraco = risultato.possibiliScale.filter(s => s.lunghezza >= 7).length;

        // Somma punti depositabili (migliore opzione)
        risultato.puntiDepositabili = migliorPunti;

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
     * @returns {number} Punteggio della situazione
     */
    valutaSituazione(analisi, coeff, numCarteInMano, puoPozzetto) {
        let punteggio = 0;

        // ===== GUADAGNI =====

        // 1. Punti depositabili (base)
        punteggio += analisi.puntiDepositabili;

        // 2. Bonus burraco (pesato su prefBurracoPulito)
        //    prefBurracoPulito: 0=sporco va bene, 10=aspetta pulito
        //    Qui bonus per QUALSIASI burraco, il tipo lo valutiamo dopo
        const pesoBurraco = 150 + (coeff.prefBurracoPulito * 10); // 150-250
        punteggio += analisi.numBurraco * pesoBurraco;

        // 3. Bonus pozzetto (pesato su frettaChiusura)
        //    frettaChiusura: 0=gioca a lungo, 10=chiude appena può
        if (puoPozzetto) {
            const pesoPozzetto = 200 + (coeff.frettaChiusura * 20); // 200-400
            punteggio += pesoPozzetto;
        }

        // 4. Bonus matte in mano (pesato INVERSAMENTE su parsimoniaMatte)
        //    parsimoniaMatte: 0=usa subito (bonus alto), 10=conserva (bonus basso)
        const pesoMatte = 30 + ((10 - (coeff.parsimoniaMatte || 5)) * 5); // 30-80
        punteggio += analisi.matte.length * pesoMatte;

        // ===== COSTI =====

        // 5. Penalità cadaveri (pesato su prudenzaScarto)
        //    prudenzaScarto: 0=scarta qualsiasi, 10=molto attento
        const pesoCadaveri = 0.5 + ((coeff.prudenzaScarto || 5) * 0.1); // 0.5-1.5
        punteggio -= analisi.puntiCadaveri * pesoCadaveri;

        // 6. Penalità troppe carte in mano (pesato su propensioAttacco)
        //    Attaccante (10) vuole mano snella → penalità alta (15)
        //    Difensore (0) tollera mani grosse → penalità bassa (5)
        if (numCarteInMano > 11) {
            const penalitaPerCarta = 5 + (coeff.propensioAttacco || 5); // 5-15
            punteggio -= (numCarteInMano - 11) * penalitaPerCarta;
        }

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
                    carteRicercate.push(`${numeri[i]}-${numeri[i+1]}${seme}`);
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
        const mappa = { 1: 0.25, 2: 0.25, 3: 0.38, 4: 0.50, 5: 0.63, 6: 0.75,
                        7: 0.88, 8: 0.88, 9: 0.75, 10: 0.63, 11: 0.50, 12: 0.38, 13: 0.25 };
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
                        motivi.push({ label: `Completa scala ${stessoSeme[i]}-${stessoSeme[i+1]}${carta.seme}`, valore: 3 });
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
                        motivi.push({ label: `Riempie buco ${stessoSeme[i]}-?-${stessoSeme[i+1]}${carta.seme}`, valore: 2 });
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
     * Decisione: pescare da scarti o da mazzo?
     *
     * Albero decisionale:
     * 0. Scarti vuoti → mazzo
     * 1. Vicino obiettivo → mazzo (eccezione: carta completa obiettivo)
     * 2. Avversari con 2/5 carte → mazzo (eccezione: scarto sicuro)
     * 3. Valutazione utilita' per dimensione pila (1, 2, 3+)
     * 4. OVERRIDE: Jolly/Pinella in cima → scarti (sovrascrive regole 1-3)
     * 5. Compagno vicino a chiudere → mazzo (non appesantirsi)
     * 6. Primo giro con cooperazione alta → scarti
     *
     * @param {Giocatore} giocatore - Il giocatore che deve pescare
     * @returns {string} 'scarti' o 'mazzo'
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

        // ===== REGOLA 1: Vicino all'obiettivo? =====
        // Se a 1 pescata da pozzetto/chiusura → mazzo (non appesantirsi)
        const obiettivo = this.aDistanzaDaObiettivo(giocatore, combinazioniSquadra);

        if (obiettivo.vicino) {
            // ECCEZIONE: carta in cima completa l'obiettivo (e pochi scarti)
            const cimaUtile = this.valutaUtilitaCarta(cartaInCima, giocatore, combinazioniSquadra);
            const cartaCompletaObiettivo = cimaUtile.utilita >= 3 && numScarti <= 2;

            if (cartaCompletaObiettivo) {
                regole.push({
                    regola: 'Obiettivo',
                    esito: 'eccezione',
                    desc: `Vicino ${obiettivo.tipo} MA ${nomeCima} completa (util=${cimaUtile.utilita.toFixed(1)}, ${numScarti} carte)`
                });
                // Non forza mazzo, continua valutazione
            } else {
                regole.push({
                    regola: 'Obiettivo',
                    esito: 'mazzo',
                    desc: `Vicino ${obiettivo.tipo} (${obiettivo.carteInMano} carte) → non appesantirsi`
                });
                decisione = 'mazzo';
                motivo = `Vicino ${obiettivo.tipo} (${obiettivo.carteInMano} carte)`;
            }
        } else {
            regole.push({ regola: 'Obiettivo', esito: 'skip', desc: 'Non vicino' });
        }

        // ===== REGOLA 2: Avversari con 2 o 5 carte? =====
        // Controlla ENTRAMBI gli avversari, non solo il prossimo.
        // In 2v2 l'ordine e': io → avv1 → compagno → avv2
        // Se raccolgo dagli scarti, devo scartare: avv1 potrebbe raccogliere.
        // Ma anche avv2 (dopo il compagno) potrebbe essere pericoloso.
        if (!decisione) {
            const n = game.giocatori.length;
            const idx = game.giocatoreCorrente;
            let avvPericolosoTrovato = false;
            let descAvversari = [];

            for (let i = 1; i < n; i++) {
                const g = game.giocatori[(idx + i) % n];
                const carteG = g.carte.length;

                if (g.squadra === giocatore.squadra) {
                    // Compagno: mostra info ma non e' un pericolo
                    descAvversari.push(`${g.nome} (compagno): ${carteG} carte`);
                    continue;
                }

                const pericoloso = (carteG === 2 || carteG === 5);

                if (pericoloso) {
                    // ECCEZIONE: con alta letturaAvversario, valuta se ha scarto sicuro
                    let scartoSicuro = false;
                    if ((coeff.letturaAvversario || 5) >= 7) {
                        const analisiMano = this.analizzaCarte(giocatore.carte, combinazioniSquadra);
                        scartoSicuro = analisiMano.carteMorte.length > 0;
                    }

                    if (scartoSicuro) {
                        descAvversari.push(`${g.nome}: ${carteG} carte MA ho scarto sicuro`);
                    } else {
                        descAvversari.push(`${g.nome}: ${carteG} carte → PERICOLO`);
                        if (!avvPericolosoTrovato) {
                            avvPericolosoTrovato = true;
                            decisione = 'mazzo';
                            motivo = `${g.nome} ha ${carteG} carte (rischio)`;
                        }
                    }
                } else {
                    descAvversari.push(`${g.nome}: ${carteG} carte (ok)`);
                }
            }

            if (avvPericolosoTrovato) {
                regole.push({
                    regola: 'Avversari',
                    esito: 'mazzo',
                    desc: descAvversari.join(' | ')
                });
            } else if (descAvversari.some(d => d.includes('scarto sicuro'))) {
                regole.push({
                    regola: 'Avversari',
                    esito: 'eccezione',
                    desc: descAvversari.join(' | ') + ` (letturaAvv=${coeff.letturaAvversario})`
                });
            } else {
                regole.push({
                    regola: 'Avversari',
                    esito: 'skip',
                    desc: descAvversari.join(' | ')
                });
            }
        }

        // ===== REGOLA 3: Valutazione utilita' per dimensione pila =====
        // Valuta TUTTE le carte negli scarti (non solo la cima)
        if (!decisione) {
            // Valuta ogni carta negli scarti (dalla cima verso il fondo)
            const vociUtilita = [];
            let utilitaTutteCarte = 0;

            for (let i = game.scarti.length - 1; i >= 0; i--) {
                const cartaScarto = game.scarti[i];
                const valCarta = this.valutaUtilitaCarta(cartaScarto, giocatore, combinazioniSquadra);
                utilitaTutteCarte += valCarta.utilita;
                const nomeCarta = this.nomeCarta(cartaScarto);

                if (i === game.scarti.length - 1) {
                    // Carta in cima: mostra dettagli completi
                    if (valCarta.motivi.length === 0) {
                        vociUtilita.push({ label: `${nomeCarta}: nessuna utilita\'`, valore: 0 });
                    } else {
                        for (const m of valCarta.motivi) {
                            vociUtilita.push(m);
                        }
                    }
                    if (numScarti > 1) {
                        vociUtilita.push({ label: `Cima (${nomeCarta})`, valore: valCarta.utilita, subtotale: true });
                    }
                } else {
                    // Carte sotto la cima: riga riassuntiva
                    if (valCarta.motivi.length > 0) {
                        const desc = valCarta.motivi.map(m => m.label).join(', ');
                        vociUtilita.push({ label: `${nomeCarta}: ${desc}`, valore: valCarta.utilita });
                    } else {
                        vociUtilita.push({ label: `${nomeCarta}: nessuna utilita\'`, valore: 0 });
                    }
                }
            }

            // Subtotale tutte le carte
            if (numScarti > 1) {
                vociUtilita.push({ label: 'Tutte le carte', valore: utilitaTutteCarte, subtotale: true });
            } else {
                vociUtilita.push({ label: 'Utilita\' carta', valore: utilitaTutteCarte, subtotale: true });
            }

            // Soglia base (modulata da sogliaPescaScarti)
            // 0 → soglia 1.0 (raccoglie facile), 10 → soglia 4.0 (molto selettivo)
            const sogliaBase = 1.0 + (coeff.sogliaPescaScarti || 5) * 0.3;

            // Bonus compressione (raccoglie per togliere opzioni)
            // 0 → bonus 0, 10 → bonus 3.0
            const bonusCompressione = (coeff.compressione || 3) * 0.3;

            // Bonus difensore: chi ha bassa propensioAttacco raccoglie piu' facilmente
            const bonusDifensore = Math.max(0, (5 - (coeff.propensioAttacco || 5)) * 0.15);

            // Bonus aggiuntivi nel dettaglio
            if (bonusCompressione > 0) {
                vociUtilita.push({ label: `Compressione (coeff ${(coeff.compressione || 3)})`, valore: bonusCompressione });
            }
            if (bonusDifensore > 0) {
                vociUtilita.push({ label: `Difensore (attacco ${(coeff.propensioAttacco || 5)})`, valore: bonusDifensore });
            }

            const utilitaTotale = utilitaTutteCarte + bonusCompressione + bonusDifensore;
            let sogliaEffettiva;

            if (numScarti === 1) {
                sogliaEffettiva = sogliaBase;
                decisione = utilitaTotale >= sogliaEffettiva ? 'scarti' : 'mazzo';
                motivo = `1 carta (${nomeCima}): util=${utilitaTotale.toFixed(1)} ${decisione === 'scarti' ? '>=' : '<'} soglia=${sogliaEffettiva.toFixed(1)}`;
            } else if (numScarti === 2) {
                sogliaEffettiva = sogliaBase * 0.8;
                decisione = utilitaTotale >= sogliaEffettiva ? 'scarti' : 'mazzo';
                motivo = `${numScarti} carte (cima: ${nomeCima}): util=${utilitaTotale.toFixed(1)} ${decisione === 'scarti' ? '>=' : '<'} soglia=${sogliaEffettiva.toFixed(1)}`;
            } else {
                sogliaEffettiva = Math.max(0.5, sogliaBase * 0.4);
                decisione = utilitaTotale >= sogliaEffettiva ? 'scarti' : 'mazzo';
                motivo = `${numScarti} carte (cima: ${nomeCima}): util=${utilitaTotale.toFixed(1)} ${decisione === 'scarti' ? '>=' : '<'} soglia=${sogliaEffettiva.toFixed(1)}`;
            }

            regole.push({
                regola: `Utilita' (${numScarti} carte)`,
                esito: decisione,
                desc: `${numScarti} carte: ${utilitaTotale.toFixed(1)} vs soglia ${sogliaEffettiva.toFixed(1)}`,
                utilita: {
                    carta: nomeCima,
                    voci: vociUtilita,
                    totale: utilitaTotale,
                    sogliaBase: sogliaBase,
                    sogliaEffettiva: sogliaEffettiva,
                    numScarti: numScarti,
                    risultato: decisione
                }
            });
        }

        // ===== OVERRIDE: Jolly o Pinella in cima → raccogli SEMPRE =====
        // Fuori dal blocco if(!decisione): sovrascrive QUALSIASI decisione precedente.
        // Un Jolly (30pt) o Pinella (20pt) e' troppo prezioso per lasciarlo.
        // Unica eccezione: se sono a 1 carta dalla chiusura E tanti scarti (>3)
        if (cartaInCima.isJolly || cartaInCima.isPinella) {
            const obiettivoMatta = this.aDistanzaDaObiettivo(giocatore, combinazioniSquadra);
            const troppiScartiPerChiudere = obiettivoMatta.vicino && obiettivoMatta.tipo === 'chiusura' && numScarti > 3;

            if (troppiScartiPerChiudere) {
                // Eccezionalmente NON raccoglie: sta per chiudere e gli scarti sono troppi
                regole.push({
                    regola: 'Matta in cima',
                    esito: 'eccezione',
                    desc: `${cartaInCima.isJolly ? 'Jolly' : 'Pinella'} in cima MA chiusura imminente con ${numScarti} carte → troppo rischioso`
                });
            } else {
                decisione = 'scarti';
                motivo += ` | ${cartaInCima.isJolly ? 'JOLLY' : 'PINELLA'} in cima!`;
                regole.push({
                    regola: 'Matta in cima',
                    esito: 'scarti',
                    desc: `${cartaInCima.isJolly ? 'Jolly' : 'Pinella'} in cima → raccogli sempre`
                });
            }
        }

        // ===== REGOLA 5: Compagno vicino a chiudere? =====
        // Se il compagno ha poche carte (vicino a pozzetto/chiusura),
        // preferiamo non appesantirci raccogliendo tanti scarti.
        // Modulato da cooperazione: alta coop → piu' attento al compagno.
        if (decisione === 'scarti' && game.modalita === '2v2' && numScarti >= 3) {
            const n = game.giocatori.length;
            const idx = game.giocatoreCorrente;
            let compagno = null;
            for (let i = 1; i < n; i++) {
                const g = game.giocatori[(idx + i) % n];
                if (g.squadra === giocatore.squadra) { compagno = g; break; }
            }
            if (compagno) {
                const carteCompagno = compagno.carte.length;
                const compagnoVicino = carteCompagno <= 3;
                const cooperazioneAlta = (coeff.cooperazione || 5) >= 5;

                if (compagnoVicino && cooperazioneAlta) {
                    // Compagno sta per finire: non appesantiamoci
                    decisione = 'mazzo';
                    motivo += ` | Compagno ${compagno.nome} ha ${carteCompagno} carte (non rallentare)`;
                    regole.push({
                        regola: 'Compagno',
                        esito: 'mazzo',
                        desc: `${compagno.nome} ha ${carteCompagno} carte, coop=${coeff.cooperazione} → non appesantirsi con ${numScarti} scarti`
                    });
                } else {
                    regole.push({
                        regola: 'Compagno',
                        esito: 'skip',
                        desc: `${compagno.nome} ha ${carteCompagno} carte` +
                            (!cooperazioneAlta ? ` (coop=${coeff.cooperazione}, poco attento)` : ' (ok)')
                    });
                }
            }
        }

        // ===== REGOLA 6: Primo giro - regola del secondo di mano =====
        if (decisione === 'mazzo' && game.turno <= 3 && numScarti <= 2) {
            // Cooperazione alta → segue la regola (raccoglie nel primo giro)
            if ((coeff.cooperazione || 5) >= 6) {
                const valCima = this.valutaUtilitaCarta(cartaInCima, giocatore, combinazioniSquadra);
                if (valCima.utilita >= 0.5) {
                    decisione = 'scarti';
                    motivo += ' | Primo giro (cooperazione)';
                    regole.push({
                        regola: 'Primo giro',
                        esito: 'scarti',
                        desc: `Cooperazione ${coeff.cooperazione} → raccoglie primo giro`
                    });
                }
            }
        }

        // ===== PREPARA DETTAGLI PER UI DEBUG =====
        const dettagli = {
            tipo: 'pesca',
            decisione,
            motivo,
            regole,
            scarti: {
                numCarte: numScarti,
                cartaInCima: nomeCima,
                isJolly: cartaInCima.isJolly,
                isPinella: cartaInCima.isPinella
            },
            coeff: {
                sogliaPescaScarti: coeff.sogliaPescaScarti,
                compressione: coeff.compressione,
                cooperazione: coeff.cooperazione,
                propensioAttacco: coeff.propensioAttacco,
                letturaAvversario: coeff.letturaAvversario,
                memoria: coeff.memoria
            }
        };

        // ===== LOG COMPATTO =====
        const mark = decisione === 'mazzo' ? '>>> MAZZO' : '>>> SCARTI';
        this.logPensiero(giocatore,
            `${mark} | ${motivo}`,
            dettagli
        );

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
            if (stessoSeme[i+1].numero === stessoSeme[i].numero + 1 &&
                stessoSeme[i+2].numero === stessoSeme[i].numero + 2) {
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
        const punteggi = mano.map(carta => ({
            carta: carta,
            punteggio: this.calcolaPunteggioScarto(giocatore, carta)
        }));

        // Ordina per punteggio decrescente
        punteggi.sort((a, b) => b.punteggio - a.punteggio);

        // Log dettagli per debug UI
        const top = punteggi.slice(0, Math.min(8, punteggi.length));
        const dettagli = {
            tipo: 'scarto',
            cartaScelta: this.nomeCarta(punteggi[0].carta),
            punteggioScelto: punteggi[0].punteggio,
            classifica: top.map(p => ({
                carta: this.nomeCarta(p.carta),
                punteggio: p.punteggio
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

        // 1. Utilita' invertita: carta utile = NON scartarla
        const valCarta = this.valutaUtilitaCarta(carta, giocatore, combinazioniSquadra);
        punteggio -= valCarta.utilita * 0.15;

        // 2. Carte isolate per tris (nessun'altra carta uguale)
        const stessoNumero = mano.filter(c =>
            c.numero === carta.numero && !c.isJolly && !c.isPinella && c !== carta
        ).length;
        if (stessoNumero === 0) punteggio += 0.3;

        // 3. Carte isolate per scala (nessun vicino dello stesso seme)
        if (carta.seme) {
            const vicini = mano.filter(c =>
                c.seme === carta.seme && !c.isJolly && !c.isPinella &&
                c !== carta && Math.abs(c.numero - carta.numero) <= 2
            ).length;
            if (vicini === 0) punteggio += 0.2;
        }

        // 4. Carte alte pesano di piu' se non chiudi
        punteggio += (carta.punti / 15) * 0.2;

        // 5. Centralita' bassa = piu' sicuro da scartare (A,K: +0.15; 7,8: +0.02)
        const centralita = this.getCentralita(carta.numero);
        punteggio += (1 - centralita) * 0.2;

        // 6. Jolly e pinelle: MAI scartare
        if (carta.isJolly) {
            punteggio -= 0.5 + ((coeff.parsimoniaMatte || 5) * 0.1);
        }
        if (carta.isPinella) {
            punteggio -= 0.5 + ((coeff.parsimoniaMatte || 5) * 0.05);
        }

        // 7. Sicurezza: analisi avversari
        if (coeff.prudenzaScarto > 3) {
            const scartiAvv = this.analizzaScartiAvversari(giocatore);
            // Se avversari hanno scartato carte dello stesso numero → sicuro
            const avvHaScartato = scartiAvv.some(s =>
                s.carta && s.carta.numero === carta.numero
            );
            if (avvHaScartato) {
                punteggio += 0.15; // Loro non cercano questo numero
            } else if (coeff.prudenzaScarto > 5) {
                punteggio -= (coeff.prudenzaScarto - 5) * 0.04; // Cautela: 0 a -0.2
            }
        }

        return punteggio;
    },

    // Decisione: depositare combinazione?
    dovrebbiDepositare(giocatore, carte) {
        // Verifica se è combinazione valida
        if (typeof verificaCombinazione === 'function') {
            const risultato = verificaCombinazione(carte);
            if (!risultato.valida) return false;
        }

        const coeff = this.getCoeff(giocatore);
        const numCarte = carte.length;

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
        if (coeff.frettaChiusura >= 7 && giocatore.carte.length <= 5) {
            return true;
        }

        return numCarte >= sogliaMinima;
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

    // Debug/Cheat
    mostraTutteCarteScoperte: false,
    debugAI: false,           // Pausa l'AI per vedere le osservazioni (D per toggle)
    debugAIContinua: false,   // Flag per continuare dopo la pausa
};

// Esponi game globalmente per debug nei dev tools
window.game = game;

// Mappa globale di tutte le carte per ID (per restore veloce)
let tutteLeCarte = {};
