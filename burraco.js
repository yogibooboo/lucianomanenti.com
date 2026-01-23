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
// CLASSE GIOCATORE
// ============================================================================

class Giocatore {
    constructor(nome, posizione, isUmano = false) {
        this.nome = nome;
        this.posizione = posizione; // 'bottom', 'top', 'left', 'right'
        this.isUmano = isUmano;
        this.carte = [];
        this.haPozzetto = false;
        this.haChiuso = false;
        this.squadra = 0; // 0 = noi, 1 = loro
    }

    get numCarte() {
        return this.carte.length;
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

    // Audio
    suoni: {},

    // UI
    trascinamento: null,

    // Combinazione su cui si puo' ancora spostare la matta (finestra temporale)
    combinazioneModificabile: null,

    // Debug/Cheat
    mostraTutteCarteScoperte: false,
};

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

    // Scarti
    $('#scarti-container').addEventListener('click', pescaDaScarti);

    // Aree combinazioni
    $('#combinazioni-noi').addEventListener('click', depositaCombinazione);

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

    if (game.modalita === '2v2') {
        // 2 vs 2
        game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        game.giocatori[0].squadra = 0;

        game.giocatori.push(new Giocatore('Avversario 1', 'left', false));
        game.giocatori[1].squadra = 1;

        game.giocatori.push(new Giocatore('Compagno', 'top', false));
        game.giocatori[2].squadra = 0;

        game.giocatori.push(new Giocatore('Avversario 2', 'right', false));
        game.giocatori[3].squadra = 1;
    } else {
        // 1 vs 1
        game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        game.giocatori[0].squadra = 0;

        game.giocatori.push(new Giocatore('Avversario', 'left', false));
        game.giocatori[1].squadra = 1;
    }
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
                // Gestisci jolly: mettili in base alla loro posizione logica
                const numA = a.isJolly ? (a.jollycomeNumero || 0) : a.numero;
                const numB = b.isJolly ? (b.jollycomeNumero || 0) : b.numero;
                // Asso alto (dopo il K) vale 14
                const valA = numA === 1 ? 14 : numA;
                const valB = numB === 1 ? 14 : numB;
                return valB - valA; // Discendente
            });
        }

        for (const carta of carteOrdinare) {
            const cartaEl = creaElementoCarta(carta);
            cartaEl.style.position = 'relative';
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
    $('#btn-undo').textContent = `UNDO (${game.stati.length})`;
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
        cartaVolante.style.position = 'fixed';
        cartaVolante.style.left = daRect.left + 'px';
        cartaVolante.style.top = daRect.top + 'px';
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
        if (combEl && game.combinazioneModificabile) {
            // Trova quale combinazione e' stata cliccata
            const combElements = Array.from($('#combinazioni-noi').querySelectorAll('.combinazione'));
            const combIndex = combElements.indexOf(combEl);
            if (combIndex >= 0 && game.combinazioniNoi[combIndex] === game.combinazioneModificabile) {
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

    // Se e' una scala con matta, permetti di spostarla
    const haMatta = comb.carte.some(c => c.isJolly || c.isPinella);
    if (comb.tipo === TIPO_SCALA && haMatta) {
        game.combinazioneModificabile = comb;
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

    // Trova la matta nella combinazione
    const matta = combinazione.carte.find(c => c.isJolly || c.isPinella);
    if (!matta) return;

    // Trova i numeri delle carte normali
    const normali = combinazione.carte.filter(c => !c.isJolly && !c.isPinella);
    const numeriNormali = normali.map(c => c.numero).sort((a, b) => a - b);
    const min = numeriNormali[0];
    const max = numeriNormali[numeriNormali.length - 1];

    // Determina dove e' attualmente la matta
    const mattaNumero = matta.jollycomeNumero;

    // Sposta la matta all'altra estremita'
    if (mattaNumero < min) {
        // Matta all'inizio -> spostala alla fine
        matta.jollycomeNumero = max + 1;
    } else if (mattaNumero > max) {
        // Matta alla fine -> spostala all'inizio
        matta.jollycomeNumero = min - 1;
    } else {
        // Matta in mezzo (buco) -> spostala alla fine
        matta.jollycomeNumero = max + 1;
    }

    // Verifica limiti (A=1, K=13)
    if (matta.jollycomeNumero < 1) {
        matta.jollycomeNumero = max + 1; // Non puo' andare sotto A, metti alla fine
    }
    if (matta.jollycomeNumero > 13) {
        matta.jollycomeNumero = min - 1; // Non puo' andare sopra K, metti all'inizio
    }

    // Riordina le carte della combinazione
    combinazione.carte.sort((a, b) => {
        const numA = (a.isJolly || a.isPinella) ? a.jollycomeNumero : a.numero;
        const numB = (b.isJolly || b.isPinella) ? b.jollycomeNumero : b.numero;
        return numA - numB;
    });

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

    // Verifica che la carta possa essere aggiunta
    if (!puoAggiungereACombinazione(carta, combinazione)) {
        render();
        return;
    }

    salvaStato('aggiungi-carta');

    // Chiude la finestra temporale per modificare la matta
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

    // Se e' una scala, riordina le carte mantenendo la posizione del jolly
    if (combinazione.tipo === TIPO_SCALA) {
        // Ordina per numero effettivo (jollycomeNumero per jolly/pinella)
        combinazione.carte.sort((a, b) => {
            let numA = (a.isJolly || a.isPinella) ? a.jollycomeNumero : a.numero;
            let numB = (b.isJolly || b.isPinella) ? b.jollycomeNumero : b.numero;
            if (combinazione.assoAlto) {
                if (numA === 1) numA = 14;
                if (numB === 1) numB = 14;
            }
            return numA - numB;
        });
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
                jolly[jollyIdx].jollycomeNumero = numJolly;
                jollyIdx++;
            }
        }
        // Eventuali jolly rimanenti vanno alla fine
        while (jollyIdx < jolly.length) {
            let numJolly = max + (jollyIdx - bucheTotali) + 1;
            jolly[jollyIdx].jollycomeNumero = numJolly;
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
            jolly[j].jollycomeNumero = numJolly;
        }
    } else {
        // Matta all'inizio della scala (prima del min)
        for (let j = 0; j < jolly.length; j++) {
            let numJolly = min - (jolly.length - j);
            if (numJolly < 1 && !assoAlto) {
                // Non puo' andare sotto l'A, mettila alla fine
                numJolly = max + j + 1;
            }
            jolly[j].jollycomeNumero = numJolly;
        }
    }

    // Ora ordina tutte le carte insieme usando il valore effettivo
    const tutteCarte = [...normali, ...jolly];
    tutteCarte.sort((a, b) => {
        let numA = (a.isJolly || a.isPinella) ? a.jollycomeNumero : a.numero;
        let numB = (b.isJolly || b.isPinella) ? b.jollycomeNumero : b.numero;
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

// Verifica se una carta puo' essere aggiunta a una combinazione esistente
function puoAggiungereACombinazione(carta, combinazione) {
    // Verifica jolly/pinella: max 1 per combinazione
    if (carta.isJolly || carta.isPinella) {
        // Controlla se c'e' gia' un jolly o pinella nella combinazione
        const haGiaJolly = combinazione.carte.some(c => c.isJolly || c.isPinella);
        if (haGiaJolly) {
            return false;
        }
        // Jolly/pinella puo' essere aggiunto a qualsiasi combinazione
        return true;
    }

    if (combinazione.tipo === TIPO_TRIS) {
        // Burraco: per un tris basta stesso numero, nessun limite di semi
        // (si possono avere piu' carte dello stesso seme da mazzi diversi)
        const carteNormali = combinazione.carte.filter(c => !c.isJolly && !c.isPinella);
        if (carteNormali.length === 0) return false;
        const numeroTris = carteNormali[0].numero;

        // La carta deve avere lo stesso numero
        if (carta.numero !== numeroTris) {
            return false;
        }
        return true;
    }

    if (combinazione.tipo === TIPO_SCALA) {
        // Per una scala: stesso seme, numero consecutivo alle estremita'
        const carteNormali = combinazione.carte.filter(c => !c.isJolly && !c.isPinella);
        if (carteNormali.length === 0) return false;
        const semeScala = carteNormali[0].seme;

        // La carta deve avere lo stesso seme
        if (carta.seme !== semeScala) {
            return false;
        }

        // Trova tutti i numeri nella scala, inclusi i jolly con jollycomeNumero
        const numeri = [];
        for (const c of combinazione.carte) {
            if (c.isJolly || c.isPinella) {
                // Usa jollycomeNumero se disponibile
                if (c.jollycomeNumero) {
                    numeri.push(c.jollycomeNumero);
                }
            } else {
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
        const cartaDaScartare = giocatore.carte.pop();

        // Trova la posizione della carta prima di rimuoverla (dopo render precedente)
        render();
        const container = $(selettoreCarte);
        // L'ultima carta è stata rimossa, quindi prendiamo l'ultima rimasta come riferimento
        // oppure usiamo il container stesso
        const partenzaEl = container ? container.lastElementChild || container : null;
        const partenzaRect = partenzaEl ? partenzaEl.getBoundingClientRect() : null;

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

function salvaStato(azione) {
    const stato = {
        azione: azione,
        mazzo: game.mazzo.map(c => ({ ...c })),
        scarti: game.scarti.map(c => ({ ...c })),
        pozzetti: [
            game.pozzetti[0].map(c => ({ ...c })),
            game.pozzetti[1].map(c => ({ ...c }))
        ],
        giocatori: game.giocatori.map(g => ({
            ...g,
            carte: g.carte.map(c => ({ ...c }))
        })),
        combinazioniNoi: JSON.parse(JSON.stringify(game.combinazioniNoi)),
        combinazioniLoro: JSON.parse(JSON.stringify(game.combinazioniLoro)),
        fase: game.fase,
        haPescato: game.haPescato,
        puntiNoi: game.puntiNoi,
        puntiLoro: game.puntiLoro,
        giocatoreCorrente: game.giocatoreCorrente
    };

    game.stati.push(stato);
    renderUndoButton();
}

function undo() {
    if (game.stati.length === 0) return;
    if (game.fase === 'finito') return;

    const stato = game.stati.pop();

    // Ripristina stato
    // Nota: questo e' semplificato, in una versione completa
    // bisognerebbe ricreare gli oggetti Carta correttamente

    game.fase = stato.fase;
    game.haPescato = stato.haPescato;
    game.puntiNoi = stato.puntiNoi;
    game.puntiLoro = stato.puntiLoro;
    game.giocatoreCorrente = stato.giocatoreCorrente;

    // Ricrea mazzo e scarti con riferimenti corretti
    // Per semplicita', ricarica la pagina se necessario

    game.carteSelezionate = [];

    playSound('ordina');
    render();
    renderUndoButton();
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
// AVVIO
// ============================================================================

document.addEventListener('DOMContentLoaded', init);
