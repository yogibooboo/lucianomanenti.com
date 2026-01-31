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
 * - pescaScarti:       0=sempre mazzo, 10=preferisce scarti
 * - prudenzaScarto:    0=scarta qualsiasi, 10=molto attento a non aiutare avversari
 * - prefScale:         0=preferisce tris, 10=preferisce scale
 * - sogliaDeposito:    0=deposita subito, 10=accumula prima di depositare
 * - prefBurracoPulito: 0=sporco va bene, 10=aspetta il pulito
 * - tieneJolly:        0=usa subito, 10=li tiene in mano
 * - frettaChiusura:    0=gioca a lungo, 10=chiude appena può
 * - memoria:           0=smemorato, 10=ricorda tutto
 * - rischio:           0=conservativo, 10=azzardato
 * - adattamento:       0=rigido, 10=si adatta agli avversari
 */

const PERSONAGGI = [
    // === AGGRESSIVI (frettaChiusura alta, sogliaDeposito bassa) ===
    {
        id: 'giuseppe',
        nome: 'Giuseppe',
        descrizione: 'Veterano impetuoso, vuole sempre chiudere per primo',
        coefficienti: {
            pescaScarti: 4, prudenzaScarto: 3, prefScale: 5, sogliaDeposito: 2,
            prefBurracoPulito: 3, tieneJolly: 2, frettaChiusura: 9, memoria: 6,
            rischio: 8, adattamento: 4
        }
    },
    {
        id: 'rocco',
        nome: 'Rocco',
        descrizione: 'Giocatore esperto, non dimentica nulla',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 5, prefScale: 6, sogliaDeposito: 3,
            prefBurracoPulito: 4, tieneJolly: 4, frettaChiusura: 7, memoria: 10,
            rischio: 6, adattamento: 5
        }
    },
    {
        id: 'teresa',
        nome: 'Teresa',
        descrizione: 'Aggressiva ma calcolatrice, ama pescare dagli scarti',
        coefficienti: {
            pescaScarti: 9, prudenzaScarto: 4, prefScale: 5, sogliaDeposito: 3,
            prefBurracoPulito: 4, tieneJolly: 3, frettaChiusura: 8, memoria: 7,
            rischio: 7, adattamento: 6
        }
    },

    // === DIFENSIVI (prudenzaScarto alta, frettaChiusura bassa) ===
    {
        id: 'maria',
        nome: 'Maria',
        descrizione: 'Prudente e strategica, non regala niente agli avversari',
        coefficienti: {
            pescaScarti: 4, prudenzaScarto: 9, prefScale: 5, sogliaDeposito: 6,
            prefBurracoPulito: 6, tieneJolly: 7, frettaChiusura: 3, memoria: 7,
            rischio: 2, adattamento: 5
        }
    },
    {
        id: 'antonio',
        nome: 'Antonio',
        descrizione: 'Paziente, aspetta sempre il burraco pulito',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 7, prefScale: 6, sogliaDeposito: 8,
            prefBurracoPulito: 10, tieneJolly: 8, frettaChiusura: 2, memoria: 6,
            rischio: 2, adattamento: 4
        }
    },
    {
        id: 'lucia',
        nome: 'Lucia',
        descrizione: 'Nonna astuta, ricorda ogni carta scartata',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 8, prefScale: 4, sogliaDeposito: 7,
            prefBurracoPulito: 7, tieneJolly: 6, frettaChiusura: 3, memoria: 10,
            rischio: 3, adattamento: 6
        }
    },

    // === BILANCIATI (valori medi, nessun estremo) ===
    {
        id: 'paolo',
        nome: 'Paolo',
        descrizione: 'Giocatore solido, nessun punto debole',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 5, prefScale: 5, sogliaDeposito: 5,
            prefBurracoPulito: 5, tieneJolly: 5, frettaChiusura: 5, memoria: 5,
            rischio: 5, adattamento: 5
        }
    },
    {
        id: 'francesca',
        nome: 'Francesca',
        descrizione: 'Equilibrata ma ama i burrachi puliti',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 6, prefScale: 6, sogliaDeposito: 6,
            prefBurracoPulito: 8, tieneJolly: 6, frettaChiusura: 4, memoria: 6,
            rischio: 4, adattamento: 5
        }
    },
    {
        id: 'marco',
        nome: 'Marco',
        descrizione: 'Tranquillo ma attento, segue il gioco con cura',
        coefficienti: {
            pescaScarti: 5, prudenzaScarto: 6, prefScale: 5, sogliaDeposito: 5,
            prefBurracoPulito: 5, tieneJolly: 5, frettaChiusura: 5, memoria: 8,
            rischio: 4, adattamento: 6
        }
    },

    // === OPPORTUNISTI (adattamento alto, rischio variabile) ===
    {
        id: 'carla',
        nome: 'Carla',
        descrizione: 'Imprevedibile, si adatta a ogni situazione',
        coefficienti: {
            pescaScarti: 7, prudenzaScarto: 5, prefScale: 5, sogliaDeposito: 4,
            prefBurracoPulito: 5, tieneJolly: 4, frettaChiusura: 6, memoria: 6,
            rischio: 7, adattamento: 9
        }
    },
    {
        id: 'sergio',
        nome: 'Sergio',
        descrizione: 'Furbo, approfitta di ogni occasione per chiudere',
        coefficienti: {
            pescaScarti: 6, prudenzaScarto: 4, prefScale: 5, sogliaDeposito: 3,
            prefBurracoPulito: 4, tieneJolly: 3, frettaChiusura: 8, memoria: 7,
            rischio: 6, adattamento: 8
        }
    },
    {
        id: 'anna',
        nome: 'Anna',
        descrizione: 'Scaltra, cambia strategia a seconda degli avversari',
        coefficienti: {
            pescaScarti: 8, prudenzaScarto: 7, prefScale: 6, sogliaDeposito: 5,
            prefBurracoPulito: 5, tieneJolly: 5, frettaChiusura: 5, memoria: 8,
            rischio: 5, adattamento: 10
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
        pescaScarti: 5, prudenzaScarto: 5, prefScale: 5, sogliaDeposito: 5,
        prefBurracoPulito: 5, tieneJolly: 5, frettaChiusura: 5, memoria: 5,
        rischio: 5, adattamento: 5
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

    // Logga un "pensiero" del bot (per debug/analisi)
    logPensiero(giocatore, messaggio) {
        if (!giocatore.osservazioni?.logStrategico) return;
        giocatore.osservazioni.logStrategico.push({
            turno: game.turno,
            messaggio: messaggio,
            timestamp: Date.now()
        });
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

        // Bonus per non usare matte se tieneJolly alto
        const usaMatta = mosse.some(m => m.usaMatta);
        if (!usaMatta) {
            valutazione += coeff.tieneJolly / 20; // 0 a 0.5
        }

        // Bonus per calate se già vicino a burraco
        const numCalate = mosse.filter(m => m.tipo === 'calata').length;
        valutazione += numCalate * 0.2;

        // Penalità se sogliaDeposito alto e pochi punti
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

    // Decisione: pescare da scarti o da mazzo?
    decidiFontePesca(giocatore) {
        if (game.scarti.length === 0) return 'mazzo';

        const coeff = this.getCoeff(giocatore);
        const cartaInCima = game.scarti[game.scarti.length - 1];
        const mano = giocatore.carte;

        // Controlla se la carta forma combinazione immediata
        const formaCombinazione = this.cartaFormaCombinazione(cartaInCima, mano);

        // Controlla se può attaccare a combinazione esistente
        const puoAttaccare = this.cartaPuoAttaccare(giocatore, cartaInCima);

        // Calcola punteggio decisione (0.0 - 1.0)
        let punteggio = 0;

        if (formaCombinazione) punteggio += 0.6;
        if (puoAttaccare) punteggio += 0.3;

        // pescaScarti: 0=sempre mazzo, 10=preferisce scarti
        punteggio += (coeff.pescaScarti - 5) * 0.04; // -0.2 a +0.2

        // Ma attenzione: pescare da scarti prende TUTTE le carte
        if (game.scarti.length > 5) {
            punteggio -= 0.1; // Penalità per troppe carte
        }

        return punteggio > 0.4 ? 'scarti' : 'mazzo';
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

        // Calcola punteggio per ogni carta (più alto = più scartabile)
        const punteggi = mano.map(carta => ({
            carta: carta,
            punteggio: this.calcolaPunteggioScarto(giocatore, carta)
        }));

        // Ordina per punteggio decrescente
        punteggi.sort((a, b) => b.punteggio - a.punteggio);

        return punteggi[0].carta;
    },

    calcolaPunteggioScarto(giocatore, carta) {
        const coeff = this.getCoeff(giocatore);
        const mano = giocatore.carte;
        let punteggio = 0;

        // Carte isolate (non formano combinazioni) sono più scartabili
        const stessoNumero = mano.filter(c => c.numero === carta.numero).length;
        const stessoSeme = mano.filter(c => c.seme === carta.seme).length;

        if (stessoNumero === 1) punteggio += 0.3;  // Carta isolata per tris
        if (stessoSeme <= 2) punteggio += 0.2;     // Poche carte stesso seme

        // Carte alte valgono più punti negativi se restano in mano
        punteggio += (carta.punti / 15) * 0.2;

        // Jolly e pinelle: MAI scartare (penalità in base a tieneJolly)
        if (carta.isJolly) {
            // tieneJolly: 0=usa subito (penalità -0.5), 10=li tiene (penalità -1.5)
            punteggio -= 0.5 + (coeff.tieneJolly * 0.1);
        }
        if (carta.isPinella) punteggio -= 0.5;

        // prudenzaScarto: 0=scarta qualsiasi, 10=molto attento
        if (coeff.prudenzaScarto > 5) {
            const scartiAvv = this.analizzaScartiAvversari(giocatore);
            // Se avversari scartano carte simili, probabilmente non le cercano
            const avvHaScartato = scartiAvv.some(s =>
                s.carta && s.carta.numero === carta.numero
            );
            if (!avvHaScartato) {
                punteggio -= (coeff.prudenzaScarto - 5) * 0.04; // 0 a -0.2
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
