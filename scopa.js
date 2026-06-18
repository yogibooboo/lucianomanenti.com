/* ============================================================================
   SCOPA - Logica di Gioco (JavaScript)
   Regole ufficiali della Scopa con stile grafico del Burraco
   ============================================================================ */

/// === CONFIGURAZIONE E STATO GLOBALE ===
let puntiTarget = 11; // target di default
let modalitaGioco = '2P'; // '2P' o '4P'
let puntiPartitaTu = 0; // Punti match Team 1 (Noi: Tu + Partner in 4P; Tu in 2P)
let puntiPartitaPC = 0; // Punti match Team 2 (Loro: Carlo + Bruno in 4P; PC in 2P)

let scopeRoundTu = 0; // Scope Team 1 in questo round
let scopeRoundPC = 0; // Scope Team 2 in questo round
let cartePreseTu = []; // Carte catturate da Team 1 (Noi)
let cartePresePC = []; // Carte catturate da Team 2 (Loro)

// Mani dei giocatori: 0 = Tu (Basso), 1 = Carlo (Sinistra), 2 = Partner/PC (Alto), 3 = Bruno (Destra)
let mani = [[], [], [], []];
let carteTavolo = []; // Carte sul tavolo
let mazzo = []; // Carte rimaste nel mazzo

let ultimoCatturato = null; // 'giocatore' (Team 1) o 'computer' (Team 2)
let statoGioco = 'inizio'; // 'inizio', 'turno-giocatore', 'turno-computer', 'animazione', 'finito'
let chiIniziaQuestoRound = 0; // Indice del giocatore (0..3) che gioca per primo nel round
let giocatoreAttivo = 0; // Indice del giocatore attivo (0..3)
let mazziere = 2; // Indice del mazziere (0..3)
let carteScoperteAttive = false; // Stato pulsante "Scopri Carte"

let cartaSelezionata = null; // Carta selezionata nella mano del giocatore (Tu)
let tavoloSelezionate = []; // Carte selezionate sul tavolo per la presa
let combinazioniPresaDisponibili = []; // Tutte le combinazioni valide per la carta selezionata

// Costanti dei semi e dei loro valori di riga nello sprite
const SEMI = ['F', 'Q', 'C', 'P']; // Fiori (riga 0), Quadri (riga 1), Cuori (riga 2), Picche (riga 3)
const VALORI_SEMI = { F: 0, Q: 1, C: 2, P: 3 };

// Valori Primiera ufficiali Scopa
const PRIMIERA_VALORI = {
    7: 21,
    6: 18,
    1: 16, // Asso
    5: 15,
    4: 14,
    3: 13,
    2: 12,
    8: 10, // Jack
    9: 10, // Donna
    10: 10 // Re
};

// Riproduci audio rispettando la disattivazione globale del sito
function riproduciAudio(src) {
    if (window.audioMuted) return;
    const audio = new Audio(src);
    audio.play().catch(e => console.log("Blocco riproduzione audio:", e));
}

// === CLASSE CARTA ===
class Carta {
    constructor(suit, number) {
        this.suit = suit; // 'F', 'Q', 'C', 'P'
        this.number = number; // 1-10 (1=Asso, 8=J, 9=Q, 10=K)
        this.id = `${number}_${suit}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        this.valore = number; // Valore numerico per somme e prese
    }

    getSpritePosition() {
        const stepX = -88.75;
        const stepY = -120;
        
        let col = 0;
        if (this.number <= 7) {
            col = this.number - 1; // 1 -> Col 0, ..., 7 -> Col 6
        } else if (this.number === 8) {
            col = 10; // Jack -> Col 10
        } else if (this.number === 9) {
            col = 11; // Regina -> Col 11
        } else if (this.number === 10) {
            col = 12; // Re -> Col 12
        }
        
        const row = VALORI_SEMI[this.suit];
        return { x: stepX * col, y: stepY * row };
    }
}

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione impostazioni salvate da localStorage
    modalitaGioco = localStorage.getItem('scopa-game-mode') || '2P';
    puntiTarget = parseInt(localStorage.getItem('scopa-score-target')) || 11;
    tempMode = modalitaGioco;
    tempTarget = puntiTarget;
    
    // Inizializza pulsanti attivi nel modale iniziale
    selezionaModalita(modalitaGioco);
    selezionaTarget(puntiTarget);

    // Inizializzazione audio toggle
    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }
    
    // Assicuriamoci che il layout si adegui
    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }
    
    // Gestione mazzo (Napoletane / Francesi)
    const btnMazzo = document.getElementById('btn-mazzo');
    const campogioco = document.getElementById('campogioco');
    
    let temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
    if (temaCorrente === 'napoletane') {
        campogioco.classList.add('napoletane');
        btnMazzo.textContent = "Usa Carte Francesi";
    }
    
    if (btnMazzo) {
        btnMazzo.addEventListener('click', () => {
            if (campogioco.classList.contains('napoletane')) {
                campogioco.classList.remove('napoletane');
                btnMazzo.textContent = "Usa Carte Napoletane";
                localStorage.setItem('scopa-deck-theme', 'francesi');
            } else {
                campogioco.classList.add('napoletane');
                btnMazzo.textContent = "Usa Carte Francesi";
                localStorage.setItem('scopa-deck-theme', 'napoletane');
            }
            // Rinfresca il rendering di tutte le carte attive per aggiornare lo sfondo
            renderManoGiocatore();
            renderManoAvversario(2, 'carte-computer');
            if (modalitaGioco === '4P') {
                renderManoAvversario(1, 'carte-sinistra');
                renderManoAvversario(3, 'carte-destra');
            }
            renderTavolo();
        });
    }

    // Gestione Scopri Carte
    const btnScopri = document.getElementById('btn-scopri');
    if (btnScopri) {
        btnScopri.addEventListener('click', () => {
            carteScoperteAttive = !carteScoperteAttive;
            btnScopri.textContent = carteScoperteAttive ? "Copri Carte" : "Scopri Carte";
            renderManoAvversario(2, 'carte-computer');
            if (modalitaGioco === '4P') {
                renderManoAvversario(1, 'carte-sinistra');
                renderManoAvversario(3, 'carte-destra');
            }
        });
    }
    
    // Gestione del click sul tavolo per deselezionare o depositare
    document.getElementById('tavolo').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tavolo')) {
            if (statoGioco === 'turno-giocatore' && cartaSelezionata && combinazioniPresaDisponibili.length === 0) {
                eseguiScartoGiocatore();
            } else {
                deselezionaTutto();
            }
        }
    });

    // Gestione click sul bottone Prendi
    document.getElementById('btn-prendi').addEventListener('click', () => {
        if (statoGioco === 'turno-giocatore' && cartaSelezionata && tavoloSelezionate.length > 0) {
            eseguiPresaGiocatore();
        }
    });
});

// === FUNZIONI DEL FLUSSO DI GIOCO ===

let tempMode = '2P';
let tempTarget = 11;

function mostraInizioPartita() {
    document.getElementById('haivinto').style.display = 'none';
    document.getElementById('haiperso').style.display = 'none';
    document.getElementById('modale-punteggi').style.display = 'none';
    
    document.getElementById('modale-inizio').style.display = 'flex';
    document.getElementById('schermo').style.display = 'block';
    statoGioco = 'inizio';
    
    // Inizializza pulsanti attivi nel modale
    selezionaModalita(modalitaGioco);
    selezionaTarget(puntiTarget);
}

function selezionaModalita(mode) {
    tempMode = mode;
    document.getElementById('btn-mode-2p').classList.remove('attiva');
    document.getElementById('btn-mode-4p').classList.remove('attiva');
    if (mode === '2P') {
        document.getElementById('btn-mode-2p').classList.add('attiva');
    } else {
        document.getElementById('btn-mode-4p').classList.add('attiva');
    }
}

function selezionaTarget(target) {
    tempTarget = target;
    document.getElementById('btn-target-11').classList.remove('attiva');
    document.getElementById('btn-target-21').classList.remove('attiva');
    if (target === 11) {
        document.getElementById('btn-target-11').classList.add('attiva');
    } else {
        document.getElementById('btn-target-21').classList.add('attiva');
    }
}

function confermaEAvviaPartita() {
    modalitaGioco = tempMode;
    puntiTarget = tempTarget;
    
    // Salva le selezioni in localStorage
    localStorage.setItem('scopa-game-mode', modalitaGioco);
    localStorage.setItem('scopa-score-target', puntiTarget.toString());
    
    // Configura layout UI
    const campogioco = document.getElementById('campogioco');
    const areaSinistra = document.getElementById('area-sinistra');
    const areaDestra = document.getElementById('area-destra');
    const labelNoi = document.getElementById('label-noi');
    const labelLoro = document.getElementById('label-loro');
    const nomeTop = document.getElementById('nome-top');
    const thNoi = document.getElementById('header-punti-noi');
    const thLoro = document.getElementById('header-punti-loro');
    
    if (modalitaGioco === '4P') {
        campogioco.classList.add('quattro-giocatori');
        areaSinistra.style.display = 'flex';
        areaDestra.style.display = 'flex';
        labelNoi.textContent = "NOI";
        labelLoro.textContent = " LORO";
        nomeTop.textContent = "Compagno";
        if (thNoi) thNoi.textContent = "Noi";
        if (thLoro) thLoro.textContent = "Loro";
    } else {
        campogioco.classList.remove('quattro-giocatori');
        areaSinistra.style.display = 'none';
        areaDestra.style.display = 'none';
        labelNoi.textContent = "TU";
        labelLoro.textContent = " PC";
        nomeTop.textContent = "Computer";
        if (thNoi) thNoi.textContent = "Tu";
        if (thLoro) thLoro.textContent = "PC";
    }
    
    document.getElementById('torneo-info').textContent = `Target: ${puntiTarget} punti`;
    
    // Reset punteggi
    puntiPartitaTu = 0;
    puntiPartitaPC = 0;
    aggiornaPannelloPunteggio();
    
    // Chiudi modale
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    
    // Determina primo di mano e dealer
    chiIniziaQuestoRound = 0; // Il giocatore 0 gioca per primo
    mazziere = modalitaGioco === '2P' ? 2 : 3; // PC (2) o Bruno (3) fanno il mazziere
    
    avviaRound();
}

function avviaRound() {
    scopeRoundTu = 0;
    scopeRoundPC = 0;
    cartePreseTu = [];
    cartePresePC = [];
    mani = [[], [], [], []];
    carteTavolo = [];
    ultimoCatturato = null;
    deselezionaTutto();
    aggiornaInterfacciaPrese();
    
    // Svuota e resetta i contenitori DOM laterali se siamo a 2P
    if (modalitaGioco === '2P') {
        document.getElementById('carte-sinistra').innerHTML = '';
        document.getElementById('carte-destra').innerHTML = '';
        document.getElementById('ncarte-sinistra').textContent = 'Carte: 0';
        document.getElementById('ncarte-destra').textContent = 'Carte: 0';
    }
    
    creaMazzo();
    mescolaMazzo();
    distribuisciIniziale();
}

function creaMazzo() {
    mazzo = [];
    SEMI.forEach(suit => {
        for (let number = 1; number <= 10; number++) {
            mazzo.push(new Carta(suit, number));
        }
    });
}

function mescolaMazzo() {
    for (let i = mazzo.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
    }
}

function verificaTavoloIniziale(carte) {
    const conteggi = {};
    carte.forEach(c => {
        conteggi[c.number] = (conteggi[c.number] || 0) + 1;
    });
    for (let num in conteggi) {
        if (conteggi[num] >= 3) return false;
    }
    return true;
}

function prossimoGiocatore(idx) {
    if (modalitaGioco === '2P') {
        return idx === 0 ? 2 : 0;
    } else {
        return (idx + 1) % 4;
    }
}

function ottieniNomeGiocatore(idx) {
    if (idx === 0) return "Tu";
    if (idx === 1) return "Carlo";
    if (idx === 2) return modalitaGioco === '2P' ? "Il Computer" : "Il tuo Partner";
    if (idx === 3) return "Bruno";
    return "";
}

function distribuisciIniziale() {
    statoGioco = 'animazione';
    aggiornaMessaggioStato("Distribuzione carte...");
    
    let carteProposteTavolo = mazzo.slice(0, 4);
    while (!verificaTavoloIniziale(carteProposteTavolo)) {
        console.log("Smazzata nulla sul tavolo (3 o più carte uguali). Rimescolo...");
        mescolaMazzo();
        carteProposteTavolo = mazzo.slice(0, 4);
    }
    mazzo.splice(0, 4);
    
    const coda = [];
    
    // La smazzata parte dal giocatore a sinistra del mazziere
    let curr = prossimoGiocatore(mazziere);
    const activeCount = modalitaGioco === '2P' ? 2 : 4;
    
    for (let round = 0; round < 3; round++) {
        let p = curr;
        for (let i = 0; i < activeCount; i++) {
            coda.push({
                tipo: p === 0 ? 'giocatore' : (p === 2 ? 'computer' : (p === 1 ? 'sinistra' : 'destra')),
                playerIndex: p,
                card: mazzo.shift()
            });
            p = prossimoGiocatore(p);
        }
    }
    
    for (let i = 0; i < 4; i++) {
        coda.push({ tipo: 'tavolo', card: carteProposteTavolo[i] });
    }
    
    eseguiCodaDistribuzione(coda, () => {
        giocatoreAttivo = chiIniziaQuestoRound;
        if (giocatoreAttivo === 0) {
            statoGioco = 'turno-giocatore';
            aggiornaMessaggioStato("È il tuo turno! Gioca una carta.");
        } else {
            statoGioco = 'turno-computer';
            const nomeIA = ottieniNomeGiocatore(giocatoreAttivo);
            aggiornaMessaggioStato(`${nomeIA} sta pensando...`);
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 1800);
        }
    });
}

function eseguiCodaDistribuzione(coda, callback) {
    if (coda.length === 0) {
        if (callback) callback();
        return;
    }
    
    const azione = coda.shift();
    const mazzoBlocco = document.getElementById('mazzo-blocco');
    
    let destEl = null;
    if (azione.tipo === 'computer') {
        destEl = document.getElementById('carte-computer');
    } else if (azione.tipo === 'giocatore') {
        destEl = document.getElementById('carte-giocatore');
    } else if (azione.tipo === 'sinistra') {
        destEl = document.getElementById('carte-sinistra');
    } else if (azione.tipo === 'destra') {
        destEl = document.getElementById('carte-destra');
    } else if (azione.tipo === 'tavolo') {
        destEl = document.getElementById('tavolo');
    }
    
    document.getElementById('mazzo-count').textContent = mazzo.length;
    if (mazzo.length === 0) {
        mazzoBlocco.style.display = 'none';
    } else {
        mazzoBlocco.style.display = 'block';
    }
    
    const scale = window.gameScale || 1;
    const cg = document.getElementById('campogioco');
    const cgRect = cg.getBoundingClientRect();
    const mazzoRect = mazzoBlocco.getBoundingClientRect();
    
    const startX = (mazzoRect.left - cgRect.left) / scale;
    const startY = (mazzoRect.top - cgRect.top) / scale;
    
    const tempCard = document.createElement('div');
    tempCard.className = 'carta carta-volante coperta-blu';
    tempCard.style.transition = 'all 0.12s ease-out';
    tempCard.style.left = `${startX}px`;
    tempCard.style.top = `${startY}px`;
    cg.appendChild(tempCard);
    
    tempCard.offsetHeight; // force reflow
    
    let destX = startX + 100;
    let destY = startY;
    if (destEl) {
        const destRect = destEl.getBoundingClientRect();
        destX = (destRect.left + destRect.width/2 - 44 - cgRect.left) / scale;
        destY = (destRect.top + destRect.height/2 - 60 - cgRect.top) / scale;
    }
    
    tempCard.style.left = `${destX}px`;
    tempCard.style.top = `${destY}px`;
    
    // Suono della distribuzione rimosso su richiesta dell'utente
    
    setTimeout(() => {
        tempCard.remove();
        
        if (azione.tipo === 'tavolo') {
            carteTavolo.push(azione.card);
            renderTavolo();
        } else {
            const p = azione.playerIndex;
            mani[p].push(azione.card);
            if (p === 0) {
                renderManoGiocatore();
            } else if (p === 1) {
                renderManoAvversario(1, 'carte-sinistra');
            } else if (p === 2) {
                renderManoAvversario(2, 'carte-computer');
            } else if (p === 3) {
                renderManoAvversario(3, 'carte-destra');
            }
        }
        
        setTimeout(() => {
            eseguiCodaDistribuzione(coda, callback);
        }, 35);
    }, 120);
}

function distribuisciNuoveMani() {
    statoGioco = 'animazione';
    aggiornaMessaggioStato("Distribuzione nuove carte...");
    
    const coda = [];
    let curr = prossimoGiocatore(mazziere);
    const activeCount = modalitaGioco === '2P' ? 2 : 4;
    
    for (let round = 0; round < 3; round++) {
        let p = curr;
        for (let i = 0; i < activeCount; i++) {
            coda.push({
                tipo: p === 0 ? 'giocatore' : (p === 2 ? 'computer' : (p === 1 ? 'sinistra' : 'destra')),
                playerIndex: p,
                card: mazzo.shift()
            });
            p = prossimoGiocatore(p);
        }
    }
    
    eseguiCodaDistribuzione(coda, () => {
        // Ripristina l'indice di gioco
        giocatoreAttivo = chiIniziaQuestoRound;
        if (giocatoreAttivo === 0) {
            statoGioco = 'turno-giocatore';
            aggiornaMessaggioStato("È il tuo turno! Gioca una carta.");
        } else {
            statoGioco = 'turno-computer';
            const nomeIA = ottieniNomeGiocatore(giocatoreAttivo);
            aggiornaMessaggioStato(`${nomeIA} sta pensando...`);
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 1800);
        }
    });
}

// === RENDER DOM ===

function renderManoGiocatore() {
    const container = document.getElementById('carte-giocatore');
    container.innerHTML = '';
    
    document.getElementById('ncarte-giocatore').textContent = `Carte: ${mani[0].length}`;
    
    mani[0].forEach(card => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.id = `card-player-0-${card.id}`;
        
        const pos = card.getSpritePosition();
        el.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        
        if (cartaSelezionata && cartaSelezionata.id === card.id) {
            el.classList.add('selezionata');
        }
        
        el.addEventListener('click', () => {
            if (statoGioco !== 'turno-giocatore') return;
            selezionaCartaGiocatore(card);
        });
        
        container.appendChild(el);
    });
    
    posizionaManoVentaglio(container, mani[0].length);
}

function renderManoAvversario(idx, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    let labelId = '';
    if (idx === 1) labelId = 'ncarte-sinistra';
    else if (idx === 2) labelId = 'ncarte-computer';
    else if (idx === 3) labelId = 'ncarte-destra';
    
    document.getElementById(labelId).textContent = `Carte: ${mani[idx].length}`;
    
    const scopriSempre = (carteScoperteAttive === true);
    
    mani[idx].forEach(card => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.id = `card-player-${idx}-${card.id}`;
        
        if (scopriSempre) {
            const pos = card.getSpritePosition();
            el.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        } else {
            el.classList.add('coperta-blu');
        }
        
        container.appendChild(el);
    });
    
    posizionaManoVentaglio(container, mani[idx].length);
}

function renderTavolo() {
    const container = document.getElementById('tavolo');
    container.innerHTML = '';
    
    // Le carte a terra sono posizionate in flex relativo
    carteTavolo.forEach(card => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.id = `card-tavolo-${card.id}`;
        
        const pos = card.getSpritePosition();
        el.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        
        if (tavoloSelezionate.some(c => c.id === card.id)) {
            el.classList.add('selezionata');
        }
        
        // Click sulla carta a terra
        el.addEventListener('click', () => {
            if (statoGioco !== 'turno-giocatore' || !cartaSelezionata) return;
            selezionaCartaTavolo(card);
        });
        
        container.appendChild(el);
    });
}

function posizionaManoVentaglio(container, count) {
    const cards = container.children;
    if (cards.length === 0) return;
    
    const isVerticale = container.parentElement.classList.contains('area-giocatore-verticale');
    
    if (isVerticale) {
        // Disposizione verticale per Carlo (1) e Bruno (3) con carte ruotate e distanziate
        const gap = -19; // Margine negativo per lasciare esattamente 12px di spazio come per il giocatore
        for (let i = 0; i < cards.length; i++) {
            cards[i].style.position = 'relative';
            cards[i].style.flexShrink = '0';
            cards[i].style.margin = (i === 0) ? '0' : `${gap}px 0 0 0`;
        }
    } else {
        // Disposizione orizzontale per Tu (0) e Compagno (2)
        const gap = 12;
        for (let i = 0; i < cards.length; i++) {
            cards[i].style.position = 'relative';
            cards[i].style.flexShrink = '0';
            cards[i].style.margin = `0 ${gap / 2}px`;
        }
    }
}

function aggiornaInterfacciaPrese() {
    const presaTu = document.getElementById('presa-giocatore');
    const presaPC = document.getElementById('presa-computer');
    
    document.getElementById('presa-count-player').textContent = `Prese: ${cartePreseTu.length}`;
    document.getElementById('presa-count-pc').textContent = `Prese: ${cartePresePC.length}`;
    
    // Rimuove carte precedenti all'interno del blocco
    const vecchieCarteTu = presaTu.querySelectorAll('.carta');
    vecchieCarteTu.forEach(el => el.remove());
    const vecchieCartePC = presaPC.querySelectorAll('.carta');
    vecchieCartePC.forEach(el => el.remove());
    
    // Se ci sono carte prese, mostra il retro come mazzetto (grandi come le altre)
    if (cartePreseTu.length > 0) {
        const dorso = document.createElement('div');
        dorso.className = 'carta coperta-blu';
        dorso.style.cursor = 'default';
        presaTu.appendChild(dorso);
    }
    
    if (cartePresePC.length > 0) {
        const dorso = document.createElement('div');
        dorso.className = 'carta coperta-blu';
        dorso.style.cursor = 'default';
        presaPC.appendChild(dorso);
    }
}

function aggiornaMessaggioStato(msg) {
    document.getElementById('messaggio-stato').textContent = msg;
}

function aggiornaPannelloPunteggio() {
    document.getElementById('punti-noi').textContent = puntiPartitaTu;
    document.getElementById('punti-loro').textContent = puntiPartitaPC;
}

// === LOGICA PRESE E SELEZIONE GIOCATORE ===

function selezionaCartaGiocatore(card) {
    // Se è la stessa carta, la deseleziona
    if (cartaSelezionata && cartaSelezionata.id === card.id) {
        deselezionaTutto();
        return;
    }
    
    // Seleziona nuova carta
    cartaSelezionata = card;
    tavoloSelezionate = [];
    document.getElementById('btn-prendi').style.display = 'none';
    
    // Calcola le possibili scelte di presa
    combinazioniPresaDisponibili = calcolaSceltePresa(card.valore, carteTavolo);
    
    // Aggiorna grafica
    renderManoGiocatore();
    
    if (combinazioniPresaDisponibili.length === 0) {
        aggiornaMessaggioStato("Nessuna presa. Clicca sul tavolo da gioco per depositarla.");
        renderTavolo(); // Rendi normale
    } else if (combinazioniPresaDisponibili.length === 1) {
        // Presa automatica immediata per accelerare il gioco se c'è solo un'opzione!
        aggiornaMessaggioStato("Presa automatica!");
        tavoloSelezionate = [...combinazioniPresaDisponibili[0]];
        renderTavolo();
        setTimeout(eseguiPresaGiocatore, 400);
    } else {
        // Scelte multiple disponibili (es. gioca 6, a terra ci sono 6, e anche 4+2 | oppure gioca 5 con 4+1 e 3+2)
        // Nota: se c'è la carta singola dello stesso valore, calcolaSceltePresa restituisce SOLO quella (regola ufficiale).
        // Quindi le scelte multiple si presentano solo se ci sono più combinazioni di somme a terra (es. gioca 5 con 4+1 e 3+2).
        aggiornaMessaggioStato("Scegli le carte sul tavolo per fare somma.");
        evidenziaCarteTavoloEleggibili();
    }
}

function selezionaCartaTavolo(card) {
    // Controlla se la carta fa parte di almeno una combinazione valida
    const faParteDiCombinazioneValida = combinazioniPresaDisponibili.some(comb => 
        comb.some(c => c.id === card.id)
    );
    
    if (!faParteDiCombinazioneValida) return; // Non cliccabile
    
    const index = tavoloSelezionate.findIndex(c => c.id === card.id);
    if (index >= 0) {
        tavoloSelezionate.splice(index, 1); // Deseleziona
    } else {
        tavoloSelezionate.push(card); // Seleziona
    }
    
    renderTavolo();
    evidenziaCarteTavoloEleggibili();
    
    // Controlla se la selezione corrente del tavolo corrisponde esattamente ad una delle combinazioni valide
    const combinazioneValidaSelezionata = combinazioniPresaDisponibili.find(comb => {
        if (comb.length !== tavoloSelezionate.length) return false;
        return comb.every(c => tavoloSelezionate.some(sel => sel.id === c.id));
    });
    
    const btnPrendi = document.getElementById('btn-prendi');
    if (combinazioneValidaSelezionata) {
        btnPrendi.style.display = 'block';
    } else {
        btnPrendi.style.display = 'none';
    }
}

function evidenziaCarteTavoloEleggibili() {
    // Trova tutte le carte che appartengono a QUALSIASI combinazione valida
    const carteEleggibili = [];
    combinazioniPresaDisponibili.forEach(comb => {
        comb.forEach(c => {
            if (!carteEleggibili.some(x => x.id === c.id)) {
                carteEleggibili.push(c);
            }
        });
    });
    
    // Applica classe o stile opaco alle non eleggibili
    carteTavolo.forEach(card => {
        const el = document.getElementById(`card-tavolo-${card.id}`);
        if (el) {
            const eleggibile = carteEleggibili.some(x => x.id === card.id);
            if (eleggibile) {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            } else {
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
            }
        }
    });
}

function deselezionaTutto() {
    cartaSelezionata = null;
    tavoloSelezionate = [];
    combinazioniPresaDisponibili = [];
    document.getElementById('btn-prendi').style.display = 'none';
    
    renderManoGiocatore();
    renderTavolo();
    
    // Ripristina opacità carte tavolo
    carteTavolo.forEach(card => {
        const el = document.getElementById(`card-tavolo-${card.id}`);
        if (el) {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
}

// Calcolo delle combinazioni di presa possibili (Algoritmo Scopa)
function calcolaSceltePresa(playedVal, tavoloCards) {
    // 1. Regola della presa su carta singola: se c'è una carta dello stesso valore, DEVI prendere quella
    let corrispondenzeSingole = tavoloCards.filter(c => c.valore === playedVal);
    if (corrispondenzeSingole.length > 0) {
        // Ciascuna carta dello stesso valore costituisce una scelta singola obbligatoria
        return corrispondenzeSingole.map(c => [c]);
    }
    
    // 2. Se non c'è una corrispondenza singola dello stesso valore, cerca le somme
    let scelte = [];
    trovaCombinazioniSomma(tavoloCards, playedVal, 0, [], scelte);
    return scelte;
}

function trovaCombinazioniSomma(cards, target, startIndex, combinazioneCorrente, risultati) {
    let somma = combinazioneCorrente.reduce((acc, c) => acc + c.valore, 0);
    if (somma === target) {
        risultati.push([...combinazioneCorrente]);
        return;
    }
    if (somma > target) return;
    
    for (let i = startIndex; i < cards.length; i++) {
        combinazioneCorrente.push(cards[i]);
        trovaCombinazioniSomma(cards, target, i + 1, combinazioneCorrente, risultati);
        combinazioneCorrente.pop();
    }
}

// === AZIONI DI GIOCO GIOCATORE ===

function eseguiScartoGiocatore() {
    statoGioco = 'animazione';
    aggiornaMessaggioStato("Calo carta...");
    
    const card = cartaSelezionata;
    const startEl = document.getElementById(`card-player-0-${card.id}`);
    const posHand = ottieniCoordinateElemento(startEl);
    
    // Crea carta temporanea a terra per calcolare coordinate prima di animare
    const dummyCard = new Carta(card.suit, card.number);
    dummyCard.id = card.id;
    carteTavolo.push(dummyCard);
    renderTavolo();
    
    const targetEl = document.getElementById(`card-tavolo-${card.id}`);
    const posDest = ottieniCoordinateElemento(targetEl);
    
    // Rimuovi dalla mano e dal tavolo temporaneo
    mani[0] = mani[0].filter(c => c.id !== card.id);
    carteTavolo = carteTavolo.filter(c => c.id !== card.id);
    renderManoGiocatore();
    renderTavolo();
    deselezionaTutto();
    
    animaCarta(card, posHand, posDest, () => {
        // Aggiungi a terra definitivamente
        carteTavolo.push(card);
        renderTavolo();
        riproduciAudio("sounds/scala40/cardplace1.mp3");
        
        passaAlProssimoTurno();
    });
}

function eseguiPresaGiocatore() {
    statoGioco = 'animazione';
    
    const card = cartaSelezionata;
    const preseTavolo = [...tavoloSelezionate];
    
    // Elementi di partenza nel DOM
    const startHandEl = document.getElementById(`card-player-0-${card.id}`);
    const startTableEls = preseTavolo.map(p => document.getElementById(`card-tavolo-${p.id}`));
    const destEl = document.getElementById('presa-giocatore');
    
    // Evidenzia immediatamente le carte
    if (startHandEl) startHandEl.classList.add('evidenziata-presa');
    startTableEls.forEach(el => {
        if (el) el.classList.add('evidenziata-presa');
    });
    
    aggiornaMessaggioStato("Hai fatto una presa!");
    
    // Attendi 2 secondi prima che volino
    setTimeout(() => {
        // Pre-calcola le posizioni prima di rimuovere gli elementi dal DOM
        const posHand = ottieniCoordinateElemento(startHandEl);
        const posTable = startTableEls.map(el => ottieniCoordinateElemento(el));
        const posDest = ottieniCoordinateElemento(destEl);
        
        // Rimuovi dalla mano e dal tavolo
        mani[0] = mani[0].filter(c => c.id !== card.id);
        carteTavolo = carteTavolo.filter(c => !preseTavolo.some(p => p.id === c.id));
        
        // Aggiorna DOM immediato
        renderManoGiocatore();
        renderTavolo();
        deselezionaTutto();
        
        riproduciAudio("sounds/scala40/cardslide1.mp3");
        
        let animateCount = 0;
        const totaleCarteInPresa = preseTavolo.length + 1;
        
        function completedAnimation() {
            animateCount++;
            if (animateCount === totaleCarteInPresa) {
                // Salva carte prese
                cartePreseTu.push(card);
                preseTavolo.forEach(p => cartePreseTu.push(p));
                ultimoCatturato = 'giocatore';
                
                aggiornaInterfacciaPrese();
                
                // Verifica Scopa!
                const tuttiSenzaCarte = mani.every(h => h.length === 0);
                const ultimaManoDelRound = (mazzo.length === 0 && tuttiSenzaCarte);
                if (carteTavolo.length === 0 && !ultimaManoDelRound) {
                    creaNotificaScopa('giocatore');
                }
                
                passaAlProssimoTurno();
            }
        }
        
        // Anima tutte le carte catturate verso la pila delle prese del giocatore
        animaCarta(card, posHand, posDest, completedAnimation);
        preseTavolo.forEach((p, idx) => {
            animaCarta(p, posTable[idx], posDest, completedAnimation);
        });
    }, 2000);
}

function creaNotificaScopa(chi) {
    riproduciAudio("sounds/scala40/magic.mp3");
    
    // Floating "+1 Scopa"
    const container = document.getElementById('campogioco');
    const floatText = document.createElement('div');
    floatText.className = 'punti-floating';
    floatText.textContent = '+1 Scopa';
    
    // Floating position
    if (chi === 'giocatore') {
        scopeRoundTu++;
        floatText.style.bottom = '180px';
        floatText.style.left = '48%';
    } else {
        scopeRoundPC++;
        floatText.style.top = '180px';
        floatText.style.left = '48%';
    }
    container.appendChild(floatText);
    
    // Banner gigante "SCOPA!"
    const banner = document.createElement('div');
    banner.className = 'notifica-scopa';
    banner.textContent = 'SCOPA!';
    container.appendChild(banner);
    
    setTimeout(() => {
        floatText.remove();
        banner.remove();
    }, 2000);
}

// === CONTROLLO TURNI E LOGICA DI FINE ROUND ===

function passaAlProssimoTurno() {
    // Controlliamo se tutti i giocatori attivi hanno finito le carte in mano
    let tutteVuote = true;
    if (modalitaGioco === '2P') {
        tutteVuote = (mani[0].length === 0 && mani[2].length === 0);
    } else {
        tutteVuote = (mani[0].length === 0 && mani[1].length === 0 && mani[2].length === 0 && mani[3].length === 0);
    }
    
    if (tutteVuote) {
        if (mazzo.length > 0) {
            // Distribuisci altre 3 carte ciascuno
            setTimeout(distribuisciNuoveMani, 600);
        } else {
            // Round terminato! Assegna le carte rimaste a terra a chi ha fatto l'ultima presa
            setTimeout(risolviFineRound, 600);
        }
    } else {
        // Passa al prossimo giocatore attivo
        giocatoreAttivo = prossimoGiocatore(giocatoreAttivo);
        
        if (giocatoreAttivo === 0) {
            statoGioco = 'turno-giocatore';
            aggiornaMessaggioStato("È il tuo turno! Gioca una carta.");
        } else {
            statoGioco = 'turno-computer';
            const nomeIA = ottieniNomeGiocatore(giocatoreAttivo);
            aggiornaMessaggioStato(`${nomeIA} sta pensando...`);
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 1800);
        }
    }
}

function risolviFineRound() {
    statoGioco = 'animazione';
    aggiornaMessaggioStato("Calcolo dei punteggi...");
    
    // Se ci sono carte rimaste sul tavolo, vanno a chi ha fatto l'ultima presa
    if (carteTavolo.length > 0) {
        const destId = (ultimoCatturato === 'computer') ? 'presa-computer' : 'presa-giocatore';
        const destEl = document.getElementById(destId);
        const posDest = ottieniCoordinateElemento(destEl);
        
        const tavoloCarteCopie = [...carteTavolo];
        
        // Calcola le posizioni degli elementi tavolo prima di rimuoverli dal DOM
        const posMap = {};
        tavoloCarteCopie.forEach(card => {
            const startEl = document.getElementById(`card-tavolo-${card.id}`);
            posMap[card.id] = ottieniCoordinateElemento(startEl);
        });
        
        carteTavolo = [];
        renderTavolo(); // Rimuovi dal DOM
        
        riproduciAudio("sounds/scala40/cardslide1.mp3");
        
        let animateCount = 0;
        tavoloCarteCopie.forEach(card => {
            animaCarta(card, posMap[card.id], posDest, () => {
                animateCount++;
                if (ultimoCatturato === 'computer') {
                    cartePresePC.push(card);
                } else {
                    cartePreseTu.push(card);
                }
                
                if (animateCount === tavoloCarteCopie.length) {
                    aggiornaInterfacciaPrese();
                    calcolaPunteggiRound();
                }
            });
        });
    } else {
        calcolaPunteggiRound();
    }
}

function calcolaPunteggiRound() {
    // 1. Calcolo del numero di carte
    const nCarteTu = cartePreseTu.length;
    const nCartePC = cartePresePC.length;
    let ptCarteTu = 0;
    let ptCartePC = 0;
    if (nCarteTu > 20) ptCarteTu = 1;
    else if (nCartePC > 20) ptCartePC = 1;
    
    // 2. Calcolo dei Quadri (Denari)
    const nQuadriTu = cartePreseTu.filter(c => c.suit === 'Q').length;
    const nQuadriPC = cartePresePC.filter(c => c.suit === 'Q').length;
    let ptQuadriTu = 0;
    let ptQuadriPC = 0;
    if (nQuadriTu > 5) ptQuadriTu = 1;
    else if (nQuadriPC > 5) ptQuadriPC = 1;
    
    // 3. Settebello (7 di Quadri)
    const settebelloTu = cartePreseTu.some(c => c.suit === 'Q' && c.number === 7);
    const settebelloPC = cartePresePC.some(c => c.suit === 'Q' && c.number === 7);
    const ptSettebelloTu = settebelloTu ? 1 : 0;
    const ptSettebelloPC = settebelloPC ? 1 : 0;
    
    // 4. Primiera
    const primValTu = calcolaPrimiera(cartePreseTu);
    const primValPC = calcolaPrimiera(cartePresePC);
    let ptPrimieraTu = 0;
    let ptPrimieraPC = 0;
    if (primValTu > primValPC) ptPrimieraTu = 1;
    else if (primValPC > primValTu) ptPrimieraPC = 1;
    
    // Somma dei punti round
    const ptRoundTu = scopeRoundTu + ptCarteTu + ptQuadriTu + ptSettebelloTu + ptPrimieraTu;
    const ptRoundPC = scopeRoundPC + ptCartePC + ptQuadriPC + ptSettebelloPC + ptPrimieraPC;
    
    // Aggiornamento punteggio totale della partita
    puntiPartitaTu += ptRoundTu;
    puntiPartitaPC += ptRoundPC;
    
    // Aggiorna Modale Punteggi nel DOM
    document.getElementById('dettaglio-scope-tu').textContent = scopeRoundTu;
    document.getElementById('dettaglio-scope-pc').textContent = scopeRoundPC;
    
    document.getElementById('dettaglio-carte-tu').textContent = `${nCarteTu} (${ptCarteTu})`;
    document.getElementById('dettaglio-carte-pc').textContent = `${nCartePC} (${ptCartePC})`;
    
    document.getElementById('dettaglio-quadri-tu').textContent = `${nQuadriTu} (${ptQuadriTu})`;
    document.getElementById('dettaglio-quadri-pc').textContent = `${nQuadriPC} (${ptQuadriPC})`;
    
    document.getElementById('dettaglio-settebello-tu').textContent = settebelloTu ? "Sì (1)" : "No (0)";
    document.getElementById('dettaglio-settebello-pc').textContent = settebelloPC ? "Sì (1)" : "No (0)";
    
    document.getElementById('dettaglio-primiera-tu').textContent = `${primValTu} (${ptPrimieraTu})`;
    document.getElementById('dettaglio-primiera-pc').textContent = `${primValPC} (${ptPrimieraPC})`;
    
    document.getElementById('round-punti-tu').textContent = ptRoundTu;
    document.getElementById('round-punti-pc').textContent = ptRoundPC;
    
    document.getElementById('match-punti-tu').textContent = puntiPartitaTu;
    document.getElementById('match-punti-pc').textContent = puntiPartitaPC;
    
    // Mostra modale dei punteggi
    document.getElementById('modale-punteggi').style.display = 'flex';
    document.getElementById('schermo').style.display = 'block';
    
    // Suono di riepilogo
    riproduciAudio("sounds/scala40/tada.mp3");
}

function calcolaPrimiera(prese) {
    const maxValPerSeme = { C: 0, Q: 0, F: 0, P: 0 };
    prese.forEach(card => {
        const valPrimiera = PRIMIERA_VALORI[card.number] || 0;
        if (valPrimiera > maxValPerSeme[card.suit]) {
            maxValPerSeme[card.suit] = valPrimiera;
        }
    });
    return maxValPerSeme.C + maxValPerSeme.Q + maxValPerSeme.F + maxValPerSeme.P;
}

function continuaProssimoRound() {
    document.getElementById('modale-punteggi').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    
    // Verifica se la partita è finita
    // La partita finisce se almeno uno supera puntiTarget (11 o 21) ed i punteggi sono differenti.
    // In caso di pareggio, si prosegue ad oltranza.
    if ((puntiPartitaTu >= puntiTarget || puntiPartitaPC >= puntiTarget) && puntiPartitaTu !== puntiPartitaPC) {
        aggiornaPannelloPunteggio();
        if (puntiPartitaTu > puntiPartitaPC) {
            riproduciAudio("sounds/scala40/applause.mp3");
            document.getElementById('haivinto').style.display = 'flex';
            document.getElementById('schermo').style.display = 'block';
        } else {
            riproduciAudio("sounds/scala40/haiperso.mp3");
            document.getElementById('haiperso').style.display = 'flex';
            document.getElementById('schermo').style.display = 'block';
        }
        statoGioco = 'finito';
    } else {
        // Altrimenti, continua con un nuovo round alternando il mazziere
        aggiornaPannelloPunteggio();
        
        // Il mazziere passa al prossimo
        mazziere = prossimoGiocatore(mazziere);
        chiIniziaQuestoRound = prossimoGiocatore(mazziere);
        avviaRound();
    }
}

// === INTELLIGENZA ARTIFICIALE (MOSSA DEL COMPUTER) ===

function eseguiMossaComputer(giocatoreIdx) {
    if (statoGioco !== 'turno-computer') return;
    
    if (giocatoreIdx === undefined) giocatoreIdx = giocatoreAttivo;
    
    const manoCorrente = mani[giocatoreIdx];
    
    // Analizziamo tutte le mosse possibili
    const mossePossibili = []; // Array di oggetti: { card: Carta, captureSet: [Carta], score: number }
    
    manoCorrente.forEach(card => {
        const scelte = calcolaSceltePresa(card.valore, carteTavolo);
        if (scelte.length === 0) {
            // Discard play
            mossePossibili.push({
                card: card,
                captureSet: [],
                score: calcolaPunteggioScartoIA(card)
            });
        } else {
            // Capture play(s)
            scelte.forEach(subset => {
                mossePossibili.push({
                    card: card,
                    captureSet: subset,
                    score: calcolaPunteggioPresaIA(card, subset)
                });
            });
        }
    });
    
    // Ordina le mosse per punteggio decrescente
    mossePossibili.sort((a, b) => b.score - a.score);
    
    // Scegli la mossa migliore
    const mossaScelta = mossePossibili[0];
    const cardPC = mossaScelta.card;
    
    // Trova l'elemento di partenza nella mano del computer (prima di rimuovere la carta!)
    let compHandContainerId = 'carte-computer';
    if (giocatoreIdx === 1) compHandContainerId = 'carte-sinistra';
    else if (giocatoreIdx === 3) compHandContainerId = 'carte-destra';
    
    const compHandContainer = document.getElementById(compHandContainerId);
    let startPCEl = document.getElementById(`card-player-${giocatoreIdx}-${cardPC.id}`);
    if (!startPCEl && compHandContainer) {
        startPCEl = compHandContainer.querySelector('.carta');
    }
    
    // Rivela a faccia in su la carta che il computer decide di giocare e la evidenzia
    if (startPCEl) {
        startPCEl.classList.remove('coperta-blu');
        const pos = cardPC.getSpritePosition();
        startPCEl.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
        startPCEl.classList.add('evidenziata-presa');
    }
    
    const isNoi = (giocatoreIdx === 0 || giocatoreIdx === 2);
    const nomeIA = ottieniNomeGiocatore(giocatoreIdx);
    
    if (mossaScelta.captureSet.length === 0) {
        // Esegui uno Scarto a terra
        statoGioco = 'animazione';
        aggiornaMessaggioStato(`${nomeIA} scarta il ${cardPC.number}.`);
        
        // Attendi 1.2 secondi prima di lanciare la carta
        setTimeout(() => {
            const posHand = ottieniCoordinateElemento(startPCEl);
            
            // Aggiungi carta temporaneamente al tavolo per calcolare posizione finale
            const dummyCard = new Carta(cardPC.suit, cardPC.number);
            dummyCard.id = cardPC.id;
            carteTavolo.push(dummyCard);
            renderTavolo();
            
            const targetEl = document.getElementById(`card-tavolo-${cardPC.id}`);
            const posDest = ottieniCoordinateElemento(targetEl);
            
            // Rimuovi dalla mano e dal tavolo temporaneo
            mani[giocatoreIdx] = mani[giocatoreIdx].filter(c => c.id !== cardPC.id);
            carteTavolo = carteTavolo.filter(c => c.id !== cardPC.id);
            
            // Render delle mani e del tavolo
            if (giocatoreIdx === 1) renderManoAvversario(1, 'carte-sinistra');
            else if (giocatoreIdx === 2) renderManoAvversario(2, 'carte-computer');
            else if (giocatoreIdx === 3) renderManoAvversario(3, 'carte-destra');
            renderTavolo();
            
            animaCarta(cardPC, posHand, posDest, () => {
                carteTavolo.push(cardPC);
                renderTavolo();
                riproduciAudio("sounds/scala40/cardplace1.mp3");
                
                passaAlProssimoTurno();
            });
        }, 1200);
    } else {
        // Esegui una Presa
        statoGioco = 'animazione';
        
        const preseTavolo = [...mossaScelta.captureSet];
        
        // Evidenzia le carte sul tavolo prese dal computer
        const startTableEls = preseTavolo.map(p => document.getElementById(`card-tavolo-${p.id}`));
        startTableEls.forEach(el => {
            if (el) el.classList.add('evidenziata-presa');
        });
        
        aggiornaMessaggioStato(`${nomeIA} gioca il ${cardPC.number} e prende!`);
        
        // Attendi 2 secondi prima che volino
        setTimeout(() => {
            const posHand = ottieniCoordinateElemento(startPCEl);
            const posTable = startTableEls.map(el => ottieniCoordinateElemento(el));
            const destPilaId = isNoi ? 'presa-giocatore' : 'presa-computer';
            const destEl = document.getElementById(destPilaId);
            const posDest = ottieniCoordinateElemento(destEl);
            
            // Rimuovi dalla mano e dal tavolo
            mani[giocatoreIdx] = mani[giocatoreIdx].filter(c => c.id !== cardPC.id);
            carteTavolo = carteTavolo.filter(c => !preseTavolo.some(p => p.id === c.id));
            
            // Render delle mani e del tavolo aggiornati
            if (giocatoreIdx === 1) renderManoAvversario(1, 'carte-sinistra');
            else if (giocatoreIdx === 2) renderManoAvversario(2, 'carte-computer');
            else if (giocatoreIdx === 3) renderManoAvversario(3, 'carte-destra');
            renderTavolo();
            
            riproduciAudio("sounds/scala40/cardslide1.mp3");
            
            let animateCount = 0;
            const totaleCarteInPresa = preseTavolo.length + 1;
            
            function completedAnimation() {
                animateCount++;
                if (animateCount === totaleCarteInPresa) {
                    // Salva presa
                    if (isNoi) {
                        cartePreseTu.push(cardPC);
                        preseTavolo.forEach(p => cartePreseTu.push(p));
                        ultimoCatturato = 'giocatore';
                    } else {
                        cartePresePC.push(cardPC);
                        preseTavolo.forEach(p => cartePresePC.push(p));
                        ultimoCatturato = 'computer';
                    }
                    
                    aggiornaInterfacciaPrese();
                    
                    // Verifica Scopa
                    const tuttiSenzaCarte = mani.every(h => h.length === 0);
                    const ultimaManoDelRound = (mazzo.length === 0 && tuttiSenzaCarte);
                    if (carteTavolo.length === 0 && !ultimaManoDelRound) {
                        creaNotificaScopa(isNoi ? 'giocatore' : 'computer');
                    }
                    
                    passaAlProssimoTurno();
                }
            }
            
            // Anima carta giocata da PC
            animaCarta(cardPC, posHand, posDest, completedAnimation);
            // Anima carte a terra catturate
            preseTavolo.forEach((p, idx) => {
                animaCarta(p, posTable[idx], posDest, completedAnimation);
            });
        }, 2000);
    }
}

// Calcola un peso per una mossa di presa
function calcolaPunteggioPresaIA(card, captureSet) {
    let score = 0;
    
    // 1. Controlla se fa Scopa (Priorità massima!)
    // Ma attenzione: non si fa scopa all'ultima mano del round
    const totalCardsInHands = mani.reduce((sum, h) => sum + h.length, 0);
    const ultimaManoRound = (mazzo.length === 0 && totalCardsInHands === 1);
    if (captureSet.length === carteTavolo.length && !ultimaManoRound) {
        score += 500; // Valore enorme per assicurarsi la Scopa
    }
    
    // 2. Controlla se cattura il Settebello
    const haSettebello = captureSet.some(c => c.suit === 'Q' && c.number === 7) || (card.suit === 'Q' && card.number === 7);
    if (haSettebello) {
        score += 120;
    }
    
    // 3. Valore dei 7 in primiera (danno 21 punti ciascuno)
    captureSet.forEach(c => {
        if (c.number === 7) score += 25;
        else if (c.number === 6) score += 18;
        else if (c.number === 1) score += 12; // Asso
        else if (c.number === 5) score += 8;
    });
    // Se la carta che gioca il PC è un 7 o un 6 catturato, conta
    if (card.number === 7) score += 25;
    else if (card.number === 6) score += 18;
    else if (card.number === 1) score += 12;
    
    // 4. Valore di seme (Quadri/Denari)
    captureSet.forEach(c => {
        if (c.suit === 'Q') score += 10;
    });
    if (card.suit === 'Q') score += 10;
    
    // 5. Quantità delle carte (più carte prende, meglio è per il punto Carte)
    score += (captureSet.length + 1) * 3;
    
    return score;
}

// Calcola un peso per lo scarto (cerca di scartare la carta meno pericolosa)
function calcolaPunteggioScartoIA(card) {
    let score = 0;
    
    // Calcola la somma del tavolo se scartiamo questa carta
    const sommaTavolo = carteTavolo.reduce((sum, c) => sum + c.valore, 0);
    const nuovaSomma = sommaTavolo + card.valore;
    
    // Regola strategica: superare il 10 impedisce all'avversario di fare Scopa al prossimo turno!
    if (nuovaSomma > 10) {
        score += 60; // Sicurezza dal dare una Scopa
    }
    
    // Evita di scartare il Settebello a terra se possibile
    if (card.suit === 'Q' && card.number === 7) {
        score -= 90;
    }
    
    // Evita di scartare altri 7 o 6 (fondamentali per Primiera)
    if (card.number === 7) score -= 40;
    else if (card.number === 6) score -= 25;
    else if (card.number === 1) score -= 15; // Asso
    
    // Evita di regalare carte di Quadri
    if (card.suit === 'Q') {
        score -= 10;
    }
    
    // Penalizza leggermente le carte alte perché sono più facili da catturare sommando
    // Ma favorisci lo scarto di carte basse (2, 3, 4) se sono "sicure"
    score -= card.valore * 1.5;
    
    return score;
}

// === FUNZIONE UTILITY PER ANIMAZIONE ===
function ottieniCoordinateElemento(el) {
    if (!el) return { x: 0, y: 0, id: '' };
    const scale = window.gameScale || 1;
    const cg = document.getElementById('campogioco');
    if (!cg) return { x: 0, y: 0, id: '' };
    const cgRect = cg.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
        x: (rect.left - cgRect.left) / scale,
        y: (rect.top - cgRect.top) / scale,
        id: el.id
    };
}

function animaCarta(card, startEl, endEl, callback) {
    if (!startEl || !endEl) {
        if (callback) callback();
        return;
    }
    
    const scale = window.gameScale || 1;
    const cg = document.getElementById('campogioco');
    const cgRect = cg.getBoundingClientRect();
    
    let startX, startY;
    if (startEl && typeof startEl.x === 'number') {
        startX = startEl.x;
        startY = startEl.y;
    } else if (startEl && typeof startEl.getBoundingClientRect === 'function') {
        const startRect = startEl.getBoundingClientRect();
        startX = (startRect.left - cgRect.left) / scale;
        startY = (startRect.top - cgRect.top) / scale;
    } else {
        if (callback) callback();
        return;
    }
    
    let endX, endY;
    if (endEl && typeof endEl.x === 'number') {
        endX = endEl.x;
        endY = endEl.y;
    } else if (endEl && typeof endEl.getBoundingClientRect === 'function') {
        const endRect = endEl.getBoundingClientRect();
        endX = (endRect.left - cgRect.left) / scale;
        endY = (endRect.top - cgRect.top) / scale;
    } else {
        if (callback) callback();
        return;
    }
    
    const flying = document.createElement('div');
    flying.className = 'carta carta-volante';
    
    // Mostriamo sempre la faccia della carta durante il volo.
    const pos = card.getSpritePosition();
    flying.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
    
    flying.style.left = `${startX}px`;
    flying.style.top = `${startY}px`;
    cg.appendChild(flying);
    
    // Forza reflow
    flying.offsetHeight;
    
    // Applica transizione
    flying.style.left = `${endX}px`;
    flying.style.top = `${endY}px`;
    
    // Applica rotazione se vola alla pila delle prese avversarie a 4P, altrimenti nessuna scala
    const endId = endEl.id || '';
    if (endId.includes('presa')) {
        if (endId === 'presa-computer' && modalitaGioco === '4P') {
            flying.style.transform = 'rotate(90deg)';
        } else {
            flying.style.transform = 'none';
        }
    }
    
    setTimeout(() => {
        flying.remove();
        if (callback) callback();
    }, 480);
}
