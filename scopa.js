/* ============================================================================
   SCOPA - Logica di Gioco (JavaScript)
   Regole ufficiali della Scopa con stile grafico del Burraco
   ============================================================================ */

// === INTERCETTAZIONE E TRACCIAMENTO DEI TIMEOUT (PER INTERRUZIONE UNDO) ===
let activeTimeouts = [];
const originalSetTimeout = window.setTimeout;
window.setTimeout = function (callback, delay, ...args) {
    let timerId;
    const wrappedCallback = function () {
        activeTimeouts = activeTimeouts.filter(id => id !== timerId);
        callback(...args);
    };
    timerId = originalSetTimeout(wrappedCallback, delay);
    activeTimeouts.push(timerId);
    return timerId;
};
const originalClearTimeout = window.clearTimeout;
window.clearTimeout = function (id) {
    activeTimeouts = activeTimeouts.filter(x => x !== id);
    originalClearTimeout(id);
};

function clearAllGameTimeouts() {
    activeTimeouts.forEach(id => originalClearTimeout(id));
    activeTimeouts = [];
}

/// === CONFIGURAZIONE E STATO GLOBALE ===
let puntiTarget = 11; // target di default
let modalitaGioco = '2P'; // '2P' o '4P'
let variante = 'classica'; // 'classica' o 'bresciana'
let puntiPartitaTu = 0; // Punti match Team 1 (Noi: Tu + Partner in 4P; Tu in 2P)
let puntiPartitaPC = 0; // Punti match Team 2 (Loro: Carlo + Bruno in 4P; PC in 2P)

let scopeRoundTu = 0; // Scope Team 1 in questo round
let scopeRoundPC = 0; // Scope Team 2 in questo round
let piccateRoundTu = 0; // Piccate Team 1 in questo round (solo bresciana)
let piccateRoundPC = 0; // Piccate Team 2 in questo round (solo bresciana)
let similiRoundTu = 0; // Simili Team 1 in questo round (solo bresciana)
let similiRoundPC = 0; // Simili Team 2 in questo round (solo bresciana)
let quadriglieRoundTu = 0; // Quadriglie/Cinquine Team 1 in questo round (solo bresciana)
let quadriglieRoundPC = 0; // Quadriglie/Cinquine Team 2 in questo round (solo bresciana)
let _napolaImpossibile = false; // true quando 1/2/3 di spade sono divisi tra i due giocatori
let _napolaCimaPrec = { tu: 0, pc: 0 }; // ultima cima sequenza notificata per evitare ripetizioni
let cartePreseTu = []; // Carte catturate da Team 1 (Noi)
let cartePresePC = []; // Carte catturate da Team 2 (Loro)

// Mani dei giocatori: 0 = Tu (Basso), 1 = Carlo (Sinistra), 2 = Partner/PC (Alto), 3 = Bruno (Destra)
let mani = [[], [], [], []];
let carteTavolo = []; // Carte sul tavolo
let mazzo = []; // Carte rimaste nel mazzo

let ultimoCatturato = null; // 'giocatore' (Team 1) o 'computer' (Team 2)
let ultimaCartaCalataTavolo = null; // Ultima carta calata a terra (per rilevare picca)
let statoGioco = 'inizio'; // 'inizio', 'turno-giocatore', 'turno-computer', 'animazione', 'finito'
let chiIniziaQuestoRound = 0; // Indice del giocatore (0..3) che gioca per primo nel round
let giocatoreAttivo = 0; // Indice del giocatore attivo (0..3)
let mazziere = 2; // Indice del mazziere (0..3)
let carteScoperteAttive = false; // Stato pulsante "Scopri Carte"

let timerMossaGiocatore = null; // Timer per scarto o presa automatica del giocatore
let cartaSelezionata = null; // Carta selezionata nella mano del giocatore (Tu)
let tavoloSelezionate = []; // Carte selezionate sul tavolo per la presa
let combinazioniPresaDisponibili = []; // Tutte le combinazioni valide per la carta selezionata
let giocatoriSessione = null; // Giocatori della sessione (nome e avatar)
let confirmModalOpen = false; // Stato della modale di conferma reset (per sospendere l'IA)
let cronologiaMosse = []; // Storico degli snapshot di gioco per l'Undo
let notificaCarteTuFatta = false;
let notificaCartePCFatta = false;
let notificaQuadriTuFatta = false;
let notificaQuadriPCFatta = false;

// Restituisce "Denari" o "Quadri" in base al tema corrente
function nomeQuadri() {
    const tema = localStorage.getItem('scopa-deck-theme') || 'francesi';
    if (tema === 'francesi') return window.currentLang === 'en' ? 'Diamonds' : 'Quadri';
    return window.currentLang === 'en' ? 'Coins' : 'Denari';
}

// Costanti dei semi e dei loro valori di riga nello sprite
const SEMI = ['F', 'Q', 'C', 'P']; // Fiori (riga 0), Quadri (riga 1), Cuori (riga 2), Picche (riga 3)
// Nelle bresciane: riga 0 = Spade, riga 1 = Denari, riga 2 = Coppe, riga 3 = Bastoni
const SEME_SPADE_BRESCIANE = 'F'; // riga 0 dello sprite bresciano = Spade
const SEME_COPPE_BRESCIANE = 'C'; // riga 2 dello sprite bresciano = Coppe
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
        this.valore = number >= 11 ? 0 : number; // Figure valgono 0 nelle somme
        this.isFigura = number >= 11;
    }

    getSpritePosition() {
        const temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
        const scala = (temaCorrente === 'bresciane') ? 1.2 : 1;
        const stepX = -88.75 * scala;
        const stepY = -120 * scala;

        let col = 0;
        if (this.number <= 7) {
            col = this.number - 1;      // 1→0, 2→1, ..., 7→6
        } else if (this.number === 8) {
            col = temaCorrente === 'bresciane' ? 7 : 10;  // bresciane: col 7 (8 numerico); altre: Jack
        } else if (this.number === 9) {
            col = temaCorrente === 'bresciane' ? 8 : 11;  // bresciane: col 8 (9 numerico); altre: Donna
        } else if (this.number === 10) {
            col = temaCorrente === 'bresciane' ? 9 : 12;  // bresciane: col 9 (10 numerico); altre: Re
        } else if (this.number === 11) {
            col = 10; // Fante bresciano
        } else if (this.number === 12) {
            col = 11; // Donna bresciana
        } else if (this.number === 13) {
            col = 12; // Re bresciano
        }

        const row = VALORI_SEMI[this.suit];
        let posX = stepX * col;
        let posY = stepY * row;

        // Se il mazzo è bresciano, spostiamo a sinistra per escludere la trasparenza (scalato)
        if (temaCorrente === 'bresciane') {
            posX -= 14.375 * scala;
        }

        return { x: posX, y: posY };
    }
}

function inizializzaGiocatoriSessione() {
    const saved = sessionStorage.getItem('scopa-giocatori-sessione');
    if (saved) {
        giocatoriSessione = JSON.parse(saved);
        // Forza "Tu" / "You" a seconda della lingua corrente
        const nomeUmano = (window.currentLang === 'en') ? "You" : "Tu";
        if (giocatoriSessione[0] && giocatoriSessione[0].nome !== nomeUmano) {
            giocatoriSessione[0].nome = nomeUmano;
            sessionStorage.setItem('scopa-giocatori-sessione', JSON.stringify(giocatoriSessione));
        }
        return;
    }
    
    const listaAvversari = [
        { nome: "Anna", avatar: "images/avatar/Anna.jpg" },
        { nome: "Antonio", avatar: "images/avatar/Antonio.jpg" },
        { nome: "Carla", avatar: "images/avatar/Carla.jpg" },
        { nome: "Francesca", avatar: "images/avatar/Francesca.jpg" },
        { nome: "Giuseppe", avatar: "images/avatar/Giuseppe.jpg" },
        { nome: "Lucia", avatar: "images/avatar/Lucia.jpg" },
        { nome: "Marco", avatar: "images/avatar/Marco.jpg" },
        { nome: "Maria", avatar: "images/avatar/Maria.jpg" },
        { nome: "Paolo", avatar: "images/avatar/Paolo.jpg" },
        { nome: "Rocco", avatar: "images/avatar/Rocco.jpg" },
        { nome: "Sergio", avatar: "images/avatar/Sergio.jpg" },
        { nome: "Teresa", avatar: "images/avatar/Teresa.jpg" }
    ];
    
    // Scegli 3 avversari casuali e distinti
    const shuffled = [...listaAvversari].sort(() => Math.random() - 0.5);
    
    giocatoriSessione = {
        0: { nome: (window.currentLang === 'en') ? "You" : "Tu", avatar: "favicon/apple-touch-icon.png" },
        1: shuffled[0],
        2: shuffled[1],
        3: shuffled[2]
    };
    
    sessionStorage.setItem('scopa-giocatori-sessione', JSON.stringify(giocatoriSessione));
}

function applicaGiocatoriUI() {
    if (!giocatoriSessione) return;
    
    for (let i = 0; i < 4; i++) {
        const giocatore = giocatoriSessione[i];
        let nomeEl = null;
        let avatarEl = null;
        
        if (i === 0) {
            nomeEl = document.querySelector('#area-giocatore .nome-giocatore');
            avatarEl = document.querySelector('#area-giocatore .avatar');
        } else if (i === 1) {
            nomeEl = document.querySelector('#area-sinistra .nome-giocatore');
            avatarEl = document.querySelector('#area-sinistra .avatar');
        } else if (i === 2) {
            nomeEl = document.getElementById('nome-top');
            avatarEl = document.getElementById('avatar-top');
        } else if (i === 3) {
            nomeEl = document.querySelector('#area-destra .nome-giocatore');
            avatarEl = document.querySelector('#area-destra .avatar');
        }
        
        if (nomeEl) {
            if (i === 2) {
                if (modalitaGioco === '2P') {
                    nomeEl.textContent = giocatore.nome;
                    nomeEl.style.whiteSpace = 'nowrap';
                } else {
                    nomeEl.style.whiteSpace = 'normal';
                    nomeEl.innerHTML = `${giocatore.nome}<br>${(window.currentLang === 'en') ? '(partner)' : '(compagno)'}`;
                }
            } else if (i === 1) {
                nomeEl.textContent = (window.currentLang === 'en') ? `${giocatore.nome} (L)` : `${giocatore.nome} (Sx)`;
            } else if (i === 3) {
                nomeEl.textContent = (window.currentLang === 'en') ? `${giocatore.nome} (R)` : `${giocatore.nome} (Dx)`;
            } else {
                nomeEl.textContent = giocatore.nome;
            }
        }
        if (avatarEl) {
            avatarEl.src = giocatore.avatar;
            avatarEl.alt = giocatore.nome;
        }
    }
}

// === INIZIALIZZAZIONE DELLA PAGINA ===
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.waitForInterstitial === 'function') {
        window.waitForInterstitial(initScopa);
    } else {
        initScopa();
    }
});

function initScopa() {
    // Se l'overlay dell'interstitial è presente a schermo, aspetta la sua chiusura prima di avviare il gioco
    if (document.getElementById('interstitial-overlay')) {
        var checkOverlay = setInterval(function() {
            if (!document.getElementById('interstitial-overlay')) {
                clearInterval(checkOverlay);
                initScopa();
            }
        }, 100);
        return;
    }

    // Inizializzazione giocatori per la sessione
    inizializzaGiocatoriSessione();

    // Inizializzazione impostazioni salvate da localStorage
    modalitaGioco = localStorage.getItem('scopa-game-mode') || '2P';
    puntiTarget = parseInt(localStorage.getItem('scopa-score-target')) || 11;
    variante = localStorage.getItem('scopa-variante') || 'classica';
    
    let temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
    tempMazzo = temaCorrente;
    ultimoMazzoScelto = temaCorrente;

    tempMode = modalitaGioco;
    tempTarget = puntiTarget;
    tempVariante = variante;

    // Inizializza pulsanti attivi nel modale iniziale
    selezionaModalita(modalitaGioco);
    selezionaTarget(puntiTarget);
    selezionaMazzoStart(temaCorrente);
    selezionaVariante(variante);

    // Inizializzazione audio toggle
    if (window.initAudioToggle) {
        window.initAudioToggle('#btn-audio');
    }
    
    // Assicuriamoci che il layout si adegui
    if (typeof adjustLayout === 'function') {
        adjustLayout();
    }
    
    // Gestione mazzo (Francesi / Napoletane / Bresciane)
    const btnMazzo = document.getElementById('btn-mazzo');
    const campogioco = document.getElementById('campogioco');
    
    temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
    
    // Rimuove eventuali classi residue
    campogioco.classList.remove('napoletane', 'bresciane');
    if (temaCorrente !== 'francesi') {
        campogioco.classList.add(temaCorrente);
    }
    aggiornaTestoBottoneMazzo(temaCorrente);
    
    if (btnMazzo) {
        btnMazzo.addEventListener('click', () => {
            apriModaleMazzo();
        });
    }

    // Gestione Scopri Carte
    const btnScopri = document.getElementById('btn-scopri');
    if (btnScopri) {
        btnScopri.addEventListener('click', () => {
            carteScoperteAttive = !carteScoperteAttive;
            btnScopri.textContent = carteScoperteAttive ? ((window.currentLang === 'en') ? "Hide Cards" : "Copri Carte") : ((window.currentLang === 'en') ? "Reveal Cards" : "Scopri Carte");
            renderManoAvversario(2, 'carte-computer');
            if (modalitaGioco === '4P') {
                renderManoAvversario(1, 'carte-sinistra');
                renderManoAvversario(3, 'carte-destra');
            }
        });
    }

    // Gestione Nuova Partita
    const btnNuova = document.getElementById('btn-nuova-partita');
    if (btnNuova) {
        btnNuova.addEventListener('click', () => {
            if (timerMossaGiocatore) {
                clearTimeout(timerMossaGiocatore);
                timerMossaGiocatore = null;
            }
            if (statoGioco === 'inizio' || statoGioco === 'finito') {
                location.reload();
            } else {
                confirmModalOpen = true;
                aggiornaStatoUndoUI();
                if (window.ENABLE_BANNER_ON_FINISH && typeof setupAmazonFinishBanner === 'function') {
                    setupAmazonFinishBanner('confermatermina', {
                        modalStyle: {
                            width: '700px',
                            height: '300px',
                            left: '162px',
                            top: '380px',
                            background: '#1a4224 url(images/scala40/tappetoverde.png)',
                            border: '4px solid #b8860b',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '25px',
                            color: 'white',
                            boxSizing: 'border-box'
                        },
                        targetTop: 380,
                        bannerHeight: 300,
                        bannerTopOffset: 310,
                        leftOffset: 0,
                        showVediCarte: false,
                        onSetupButtons: function (modal) {
                            var btnNo = modal.querySelector('.btn-no-continua');
                            var btnSi = modal.querySelector('.btn-si-termina');
                            if (btnNo) {
                                btnNo.style.position = 'absolute';
                                btnNo.style.top = '190px';
                                btnNo.style.width = '240px';
                                btnNo.style.left = '80px';
                                btnNo.style.fontSize = '20px';
                                btnNo.style.margin = '0';
                            }
                            if (btnSi) {
                                btnSi.style.position = 'absolute';
                                btnSi.style.top = '190px';
                                btnSi.style.width = '240px';
                                btnSi.style.left = '380px';
                                btnSi.style.fontSize = '20px';
                                btnSi.style.margin = '0';
                            }
                            var msg = modal.querySelector('.confirm-message');
                            if (msg) {
                                msg.style.marginTop = '60px';
                                msg.style.marginBottom = '20px';
                                msg.style.fontSize = '24px';
                            }
                        }
                    });
                } else {
                    // Stile fallback default (centrato standard 500x520)
                    const modal = document.getElementById('confermatermina');
                    modal.style.width = '500px';
                    modal.style.height = '520px';
                    modal.style.left = '262px';
                    modal.style.top = '115px';
                    modal.style.background = '#1a4224 url(images/scala40/tappetoverde.png)';
                    modal.style.overflow = 'hidden';
                    
                    var btnNo = modal.querySelector('.btn-no-continua');
                    var btnSi = modal.querySelector('.btn-si-termina');
                    if (btnNo) {
                        btnNo.style.position = '';
                        btnNo.style.top = '';
                        btnNo.style.width = '280px';
                        btnNo.style.left = '';
                        btnNo.style.fontSize = '16px';
                        btnNo.style.margin = '0 auto 10px auto';
                    }
                    if (btnSi) {
                        btnSi.style.position = '';
                        btnSi.style.top = '';
                        btnSi.style.width = '280px';
                        btnSi.style.left = '';
                        btnSi.style.fontSize = '16px';
                        btnSi.style.margin = '0 auto';
                    }
                    var msg = modal.querySelector('.confirm-message');
                    if (msg) {
                        msg.style.marginTop = '40px';
                        msg.style.marginBottom = '40px';
                        msg.style.fontSize = '24px';
                    }
                }
                document.getElementById('confermatermina').style.display = 'flex';
                document.getElementById('schermo').style.display = 'block';
            }
        });
    }

    // Bottoni della modale di conferma abbandono
    const btnNoContinua = document.getElementById('btn-no-continua');
    if (btnNoContinua) {
        btnNoContinua.addEventListener('click', () => {
            confirmModalOpen = false;
            aggiornaStatoUndoUI();
            document.getElementById('confermatermina').style.display = 'none';
            document.getElementById('schermo').style.display = 'none';
        });
    }

    const btnSiTermina = document.getElementById('btn-si-termina');
    if (btnSiTermina) {
        btnSiTermina.addEventListener('click', () => {
            confirmModalOpen = false;
            document.getElementById('confermatermina').style.display = 'none';
            location.reload();
        });
    }
    
    // Gestione del click sul tavolo per deselezionare o depositare
    document.getElementById('tavolo').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tavolo')) {
            // const figuraOpzionale = variante === 'bresciana' && cartaSelezionata && cartaSelezionata.isFigura && combinazioniPresaDisponibili.length > 0;
            if (statoGioco === 'turno-giocatore' && cartaSelezionata && (combinazioniPresaDisponibili.length === 0 /* || figuraOpzionale */)) {
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

    // Gestione click sul bottone Annulla (Undo)
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            eseguiUndo();
        });
    }

    applicaGiocatoriUI();

    // Ripristino stato partita da sessionStorage (reload tra mani intermedie)
    const savedState = sessionStorage.getItem('scopa-partita-in-corso');
    if (savedState) {
        sessionStorage.removeItem('scopa-partita-in-corso');
        const s = JSON.parse(savedState);
        puntiPartitaTu = s.puntiPartitaTu;
        puntiPartitaPC = s.puntiPartitaPC;
        puntiTarget = s.puntiTarget;
        modalitaGioco = s.modalitaGioco;
        mazziere = s.mazziere;
        chiIniziaQuestoRound = s.chiIniziaQuestoRound;
        if (s.variante) variante = s.variante;
        if (s.temaCorrente) selezionaMazzo(s.temaCorrente);
        tempMode = modalitaGioco;
        tempTarget = puntiTarget;
        confermaEAvviaRoundDiretto();
    }

    // Auto-apertura per il testing tramite screenshot headless
    if (new URLSearchParams(window.location.search).get('test_modal') === '1') {
        setTimeout(() => {
            apriModaleMazzo();
        }, 300);
    }
}

// === FUNZIONI DEL FLUSSO DI GIOCO ===

let tempMode = '2P';
let tempTarget = 11;
let tempMazzo = 'francesi';
let ultimoMazzoScelto = 'francesi';

function selezionaMazzoStart(tema) {
    tempMazzo = tema;
    if (tempVariante !== 'bresciana') {
        ultimoMazzoScelto = tema;
    }
    ['btn-deck-francesi', 'btn-deck-napoletane', 'btn-deck-bresciane'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('attiva');
    });
    const selEl = document.getElementById(`btn-deck-${tema}`);
    if (selEl) selEl.classList.add('attiva');
}

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
    
    const temaSaved = localStorage.getItem('scopa-deck-theme') || 'francesi';
    tempMazzo = temaSaved;
    ultimoMazzoScelto = temaSaved;
    selezionaMazzoStart(temaSaved);
    
    selezionaVariante(variante);
}

function resetPartitaCompleto() {
    confirmModalOpen = false;
    if (timerMossaGiocatore) {
        clearTimeout(timerMossaGiocatore);
        timerMossaGiocatore = null;
    }
    deselezionaTutto();
    
    // Pulisci le mani e il tavolo per evitare che si vedano carte residue sotto l'overlay
    mani = [[], [], [], []];
    carteTavolo = [];
    renderManoGiocatore();
    renderManoAvversario(2, 'carte-computer');
    if (modalitaGioco === '4P') {
        renderManoAvversario(1, 'carte-sinistra');
        renderManoAvversario(3, 'carte-destra');
    }
    renderTavolo();
    
    // Resetta i punteggi cumulativi
    puntiPartitaTu = 0;
    puntiPartitaPC = 0;
    aggiornaPannelloPunteggio();
    
    // Pulisci pile prese e i contatori
    cartePreseTu = [];
    cartePresePC = [];
    aggiornaInterfacciaPrese();
    
    // Nascondi i badge mazziere e i bordi attivi
    document.querySelectorAll('.area-giocatore, .area-giocatore-verticale').forEach(el => el.classList.remove('attivo'));
    for (let i = 0; i < 4; i++) {
        const badge = document.getElementById(`dealer-badge-${i}`);
        if (badge) badge.style.display = 'none';
    }
    
    // Resetta lo storico dell'Undo
    cronologiaMosse = [];
    aggiornaStatoUndoUI();

    // Mostra il modale iniziale
    mostraInizioPartita();
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
    ['btn-target-31', 'btn-target-11', 'btn-target-21'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('attiva');
    });
    const selId = target === 31 ? 'btn-target-31' : target === 21 ? 'btn-target-21' : 'btn-target-11';
    const selEl = document.getElementById(selId);
    if (selEl) selEl.classList.add('attiva');
}

let tempVariante = 'classica';
function selezionaVariante(v) {
    const isChanging = (tempVariante !== v);
    tempVariante = v;
    document.getElementById('btn-var-classica').classList.toggle('attiva', v === 'classica');
    document.getElementById('btn-var-bresciana').classList.toggle('attiva', v === 'bresciana');
    
    // Gestione abilitazione/disabilitazione mazzi nel modale start
    if (v === 'bresciana') {
        selezionaMazzoStart('bresciane');
        ['btn-deck-francesi', 'btn-deck-napoletane'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = true;
                el.style.opacity = '0.3';
                el.style.pointerEvents = 'none';
            }
        });
    } else {
        ['btn-deck-francesi', 'btn-deck-napoletane'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
                el.style.opacity = '';
                el.style.pointerEvents = '';
            }
        });
        if (isChanging) {
            const targetDeck = (ultimoMazzoScelto === 'bresciane') ? 'francesi' : ultimoMazzoScelto;
            selezionaMazzoStart(targetDeck);
        }
    }
    
    if (isChanging) {
        if (v === 'bresciana') {
            selezionaTarget(31);
        } else if (v === 'classica') {
            selezionaTarget(11);
        }
    }
    
    const nota = document.getElementById('nota-variante');
    if (nota) {
        const isEn = window.currentLang === 'en';
        if (v === 'bresciana') {
            nota.textContent = isEn
                ? 'Bresciana variant: 52 cards, 4 cards per hand, special scoring.'
                : 'Variante Bresciana: 52 carte, 4 carte per mano, punti speciali.';
        } else {
            nota.textContent = isEn
                ? 'Rules: 40 cards, French suits (Diamonds = Gold), classic Primiera and Scopa.'
                : 'Regole: 40 carte, semi francesi (Quadri = Denari), Primiera Scopa classica.';
        }
    }
}

function confermaEAvviaPartita() {
    modalitaGioco = tempMode;
    puntiTarget = tempTarget;
    variante = tempVariante;

    // Con variante bresciana inviamo l'evento analytics
    if (variante === 'bresciana') {
        if (typeof gtag === 'function') {
            gtag('event', 'start_game_bresciana', {
                'game_mode': modalitaGioco,
                'target_score': puntiTarget
            });
        }
    }

    // Salva le selezioni in localStorage
    localStorage.setItem('scopa-game-mode', modalitaGioco);
    localStorage.setItem('scopa-score-target', puntiTarget.toString());
    localStorage.setItem('scopa-variante', variante);

    // Applica e salva il mazzo selezionato
    selezionaMazzo(tempMazzo);

    // Configura layout UI
    const campogioco = document.getElementById('campogioco');

    // Aggiorna titolo in base alla variante
    const titoloEl = document.getElementById('titolo-gioco');
    if (titoloEl) {
        const isEn = window.currentLang === 'en';
        titoloEl.textContent = variante === 'bresciana'
            ? (isEn ? 'Scopa Bresciana by Luciano' : 'Scopa Bresciana di Luciano')
            : (isEn ? 'Scopa by Luciano' : 'Scopa di Luciano');
    }
    const areaSinistra = document.getElementById('area-sinistra');
    const areaDestra = document.getElementById('area-destra');
    const labelNoi = document.getElementById('label-noi');
    const labelLoro = document.getElementById('label-loro');
    const thNoi = document.getElementById('header-punti-noi');
    const thLoro = document.getElementById('header-punti-loro');
    const progHeaderNoi = document.getElementById('prog-header-noi');
    const progHeaderLoro = document.getElementById('prog-header-loro');
    
    if (modalitaGioco === '4P') {
        campogioco.classList.add('quattro-giocatori');
        areaSinistra.style.display = 'flex';
        areaDestra.style.display = 'flex';
        labelNoi.textContent = (window.currentLang === 'en') ? "US" : "NOI";
        labelLoro.textContent = (window.currentLang === 'en') ? " THEM" : " LORO";
        if (thNoi) thNoi.textContent = (window.currentLang === 'en') ? "Us" : "Noi";
        if (thLoro) thLoro.textContent = (window.currentLang === 'en') ? "Them" : "Loro";
        if (progHeaderNoi) progHeaderNoi.textContent = (window.currentLang === 'en') ? "Us" : "Noi";
        if (progHeaderLoro) progHeaderLoro.textContent = (window.currentLang === 'en') ? "Them" : "Loro";
    } else {
        campogioco.classList.remove('quattro-giocatori');
        areaSinistra.style.display = 'none';
        areaDestra.style.display = 'none';
        labelNoi.textContent = (window.currentLang === 'en') ? "YOU" : "TU";
        const oppNome = (giocatoriSessione && giocatoriSessione[2]) ? giocatoriSessione[2].nome : "PC";
        labelLoro.textContent = " " + oppNome.toUpperCase();
        if (thNoi) thNoi.textContent = (window.currentLang === 'en') ? "You" : "Tu";
        if (thLoro) thLoro.textContent = oppNome;
        if (progHeaderNoi) progHeaderNoi.textContent = (window.currentLang === 'en') ? "You" : "Tu";
        if (progHeaderLoro) progHeaderLoro.textContent = oppNome;
    }
    
    applicaGiocatoriUI();
    
    document.getElementById('torneo-info').textContent = (window.currentLang === 'en') ? `Target: ${puntiTarget} points` : `Target: ${puntiTarget} punti`;
    
    // Reset punteggi
    puntiPartitaTu = 0;
    puntiPartitaPC = 0;
    aggiornaPannelloPunteggio();
    if (typeof aggiornaDettaglioProgressivo === 'function') {
        aggiornaDettaglioProgressivo();
    }
    
    // Chiudi modale
    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    
    // Determina il dealer iniziale in modo casuale
    if (modalitaGioco === '2P') {
        mazziere = Math.random() < 0.5 ? 0 : 2; // Scegli a caso tra Tu (0) e PC (2)
    } else {
        mazziere = Math.floor(Math.random() * 4); // Scegli a caso tra i 4 giocatori (0..3)
    }
    chiIniziaQuestoRound = prossimoGiocatore(mazziere); // Il giocatore a destra (antiorario) del mazziere gioca per primo
    
    avviaRound();
}

function avviaRound() {
    cronologiaMosse = [];
    aggiornaStatoUndoUI();
    
    scopeRoundTu = 0;
    scopeRoundPC = 0;
    piccateRoundTu = 0;
    piccateRoundPC = 0;
    similiRoundTu = 0;
    similiRoundPC = 0;
    quadriglieRoundTu = 0;
    quadriglieRoundPC = 0;
    _napolaImpossibile = false;
    _napolaCimaPrec = { tu: 0, pc: 0 };
    ultimaCartaCalataTavolo = null;
    cartePreseTu = [];
    cartePresePC = [];
    notificaCarteTuFatta = false;
    notificaCartePCFatta = false;
    notificaQuadriTuFatta = false;
    notificaQuadriPCFatta = false;
    mani = [[], [], [], []];
    carteTavolo = [];
    ultimoCatturato = null;
    deselezionaTutto();
    aggiornaInterfacciaPrese();
    aggiornaMazziereUI();
    document.querySelectorAll('.area-giocatore, .area-giocatore-verticale').forEach(el => el.classList.remove('attivo'));
    
    // Svuota e resetta i contenitori DOM laterali se siamo a 2P
    if (modalitaGioco === '2P') {
        document.getElementById('carte-sinistra').innerHTML = '';
        document.getElementById('carte-destra').innerHTML = '';
        document.getElementById('ncarte-sinistra').textContent = (window.currentLang === 'en') ? 'Cards: 0' : 'Carte: 0';
        document.getElementById('ncarte-destra').textContent = (window.currentLang === 'en') ? 'Cards: 0' : 'Carte: 0';
    }
    
    creaMazzo();
    mescolaMazzo();
    distribuisciIniziale();
}

function creaMazzo() {
    if (variante === 'bresciana') {
        creaMazzoBresciana();
    } else {
        creaMazzoClassica();
    }
}

function creaMazzoClassica() {
    mazzo = [];
    SEMI.forEach(suit => {
        for (let number = 1; number <= 10; number++) {
            mazzo.push(new Carta(suit, number));
        }
    });
}

function creaMazzoBresciana() {
    mazzo = [];
    SEMI.forEach(suit => {
        for (let number = 1; number <= 13; number++) {
            const c = new Carta(suit, number);
            mazzo.push(c);
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
        return (idx - 1 + 4) % 4; // Tradizione classica: senso antiorario
    }
}

function ottieniNomeGiocatore(idx) {
    if (giocatoriSessione && giocatoriSessione[idx]) {
        return giocatoriSessione[idx].nome;
    }
    if (idx === 0) return "Tu";
    if (idx === 1) return "Carlo";
    if (idx === 2) return modalitaGioco === '2P' ? "Computer" : "Partner";
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
    
    const cartePerMano = variante === 'bresciana' ? 4 : 3;

    for (let round = 0; round < cartePerMano; round++) {
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
        aggiornaGiocatoreAttivoUI();
        if (giocatoreAttivo === 0) {
            statoGioco = 'turno-giocatore';
            aggiornaMessaggioStato("È il tuo turno! Gioca una carta.");
        } else {
            statoGioco = 'turno-computer';
            const nomeIA = ottieniNomeGiocatore(giocatoreAttivo);
            aggiornaMessaggioStato(`${nomeIA} sta pensando...`);
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 450);
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
    ultimaCartaCalataTavolo = null; // La picca non vale tra una mano e l'altra
    statoGioco = 'animazione';
    aggiornaMessaggioStato("Distribuzione nuove carte...");
    
    const coda = [];
    let curr = prossimoGiocatore(mazziere);
    const activeCount = modalitaGioco === '2P' ? 2 : 4;
    const cartePerMano = variante === 'bresciana' ? 4 : 3;

    for (let round = 0; round < cartePerMano; round++) {
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
        aggiornaGiocatoreAttivoUI();
        if (giocatoreAttivo === 0) {
            statoGioco = 'turno-giocatore';
            aggiornaMessaggioStato("È il tuo turno! Gioca una carta.");
        } else {
            statoGioco = 'turno-computer';
            const nomeIA = ottieniNomeGiocatore(giocatoreAttivo);
            aggiornaMessaggioStato(`${nomeIA} sta pensando...`);
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 450);
        }
    });
}

// === RENDER DOM ===

function renderManoGiocatore() {
    const container = document.getElementById('carte-giocatore');
    container.innerHTML = '';
    
    document.getElementById('ncarte-giocatore').textContent = (window.currentLang === 'en') ? `Cards: ${mani[0].length}` : `Carte: ${mani[0].length}`;
    
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
    
    document.getElementById(labelId).textContent = (window.currentLang === 'en') ? `Cards: ${mani[idx].length}` : `Carte: ${mani[idx].length}`;
    
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

function aggiornaGraficaSelezioneMano() {
    mani[0].forEach(card => {
        const el = document.getElementById(`card-player-0-${card.id}`);
        if (el) {
            if (cartaSelezionata && cartaSelezionata.id === card.id) {
                el.classList.add('selezionata');
            } else {
                el.classList.remove('selezionata');
            }
        }
    });
}

function aggiornaGraficaSelezioneTavolo() {
    carteTavolo.forEach(card => {
        const el = document.getElementById(`card-tavolo-${card.id}`);
        if (el) {
            if (tavoloSelezionate.some(c => c.id === card.id)) {
                el.classList.add('selezionata');
            } else {
                el.classList.remove('selezionata');
            }
        }
    });
}

function posizionaManoVentaglio(container, count) {
    const cards = container.children;
    if (cards.length === 0) return;
    
    const isVerticale = container.parentElement.classList.contains('area-giocatore-verticale');
    
    if (isVerticale) {
        // Disposizione verticale per Carlo (1) e Bruno (3) con carte ruotate e distanziate
        // Le carte bresciane sono più alte (144px vs 120px) quindi ruotate occupano più spazio orizzontale
        const temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
        const gap = (temaCorrente === 'bresciane') ? -68 : -19;
        for (let i = 0; i < cards.length; i++) {
            cards[i].style.position = 'relative';
            cards[i].style.flexShrink = '0';
            cards[i].style.margin = (i === 0) ? '0' : `${gap}px 0 0 0`;
        }
    } else {
        // Disposizione orizzontale per Tu (0) e Compagno (2)
        const temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
        const gap = (temaCorrente === 'bresciane') ? 4 : 12;
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
    
    document.getElementById('presa-count-player').textContent = (window.currentLang === 'en') ? `Tricks: ${cartePreseTu.length}` : `Prese: ${cartePreseTu.length}`;
    document.getElementById('presa-count-pc').textContent = (window.currentLang === 'en') ? `Tricks: ${cartePresePC.length}` : `Prese: ${cartePresePC.length}`;
    
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
    
    aggiornaDettaglioProgressivo();
}

function aggiornaDettaglioProgressivo() {
    // Mostra/nascondi righe in base alla variante
    document.querySelectorAll('.prog-row-classica').forEach(r => r.style.display = variante === 'bresciana' ? 'none' : '');
    document.querySelectorAll('.prog-row-bresciana').forEach(r => r.style.display = variante === 'bresciana' ? '' : 'none');

    if (variante === 'bresciana') {
        const nCarteTu = cartePreseTu.length;
        const nCartePC = cartePresePC.length;
        const nSpadeTu = cartePreseTu.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
        const nSpadePC = cartePresePC.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;

        // Napola progressiva (solo completa 1-2-3 vale punti)
        const napolaTu = calcolaCimaNapola(cartePreseTu);
        const napolaPC = calcolaCimaNapola(cartePresePC);

        // Carte speciali (Matta + Dieci Denari + Fante Coppe)
        const specialiTu = (cartePreseTu.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number === 2) ? 1 : 0)
                         + (cartePreseTu.some(c => c.suit === 'Q' && c.number === 10) ? 1 : 0)
                         + (cartePreseTu.some(c => c.suit === SEME_COPPE_BRESCIANE && c.number === 11) ? 1 : 0);
        const specialiPC = (cartePresePC.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number === 2) ? 1 : 0)
                         + (cartePresePC.some(c => c.suit === 'Q' && c.number === 10) ? 1 : 0)
                         + (cartePresePC.some(c => c.suit === SEME_COPPE_BRESCIANE && c.number === 11) ? 1 : 0);

        const set = (id, val, soglia) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = val;
            el.style.color = (soglia !== undefined && val >= soglia) ? '#ffd700' : '';
            el.style.fontWeight = (soglia !== undefined && val >= soglia) ? 'bold' : 'normal';
        };
        set('prog-b-scope-tu', scopeRoundTu + piccateRoundTu + similiRoundTu + quadriglieRoundTu);
        set('prog-b-scope-pc', scopeRoundPC + piccateRoundPC + similiRoundPC + quadriglieRoundPC);
        set('prog-b-carte-tu', nCarteTu, 27);
        set('prog-b-carte-pc', nCartePC, 27);
        set('prog-b-spade-tu', nSpadeTu, 7);
        set('prog-b-spade-pc', nSpadePC, 7);
        // Aggiorna sequenza napola colorata
        const spadeTu = cartePreseTu.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number);
        const spadePC = cartePresePC.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number);
        for (let n = 1; n <= 13; n++) {
            const el = document.getElementById(`prog-b-napola-carta-${n}`);
            if (!el) continue;
            if (spadeTu.includes(n)) { el.style.color = '#4cff4c'; }
            else if (spadePC.includes(n)) { el.style.color = '#ff3344'; }
            else { el.style.color = '#555'; }
        }
        set('prog-b-speciali-tu', specialiTu);
        set('prog-b-speciali-pc', specialiPC);
        return;
    }

    const scopeTu = scopeRoundTu;
    const scopePC = scopeRoundPC;
    const nCarteTu = cartePreseTu.length;
    const nCartePC = cartePresePC.length;
    const nQuadriTu = cartePreseTu.filter(c => c.suit === 'Q').length;
    const nQuadriPC = cartePresePC.filter(c => c.suit === 'Q').length;
    const settebelloTu = cartePreseTu.some(c => c.suit === 'Q' && c.number === 7);
    const settebelloPC = cartePresePC.some(c => c.suit === 'Q' && c.number === 7);

    let primTu = 0;
    let primPC = 0;
    if (typeof calcolaPrimiera === 'function') {
        primTu = calcolaPrimiera(cartePreseTu);
        primPC = calcolaPrimiera(cartePresePC);
    }

    // Aggiorna etichetta Quadri/Denari in base al tema
    const elQuadriLabel = document.querySelector('.prog-row-classica td:first-child[data-voce="quadri"]');
    if (elQuadriLabel) elQuadriLabel.textContent = nomeQuadri();

    const elScopeTu = document.getElementById('prog-scope-tu');
    const elScopePC = document.getElementById('prog-scope-pc');
    const elCarteTu = document.getElementById('prog-carte-tu');
    const elCartePC = document.getElementById('prog-carte-pc');
    const elQuadriTu = document.getElementById('prog-quadri-tu');
    const elQuadriPC = document.getElementById('prog-quadri-pc');
    const elSettebelloTu = document.getElementById('prog-settebello-tu');
    const elSettebelloPC = document.getElementById('prog-settebello-pc');
    const elPrimieraTu = document.getElementById('prog-primiera-tu');
    const elPrimieraPC = document.getElementById('prog-primiera-pc');

    if (elScopeTu) elScopeTu.textContent = scopeTu;
    if (elScopePC) elScopePC.textContent = scopePC;

    if (elCarteTu) {
        elCarteTu.textContent = nCarteTu;
        elCarteTu.style.color = (nCarteTu >= 21) ? '#ffd700' : '';
        elCarteTu.style.fontWeight = (nCarteTu >= 21) ? 'bold' : 'normal';
    }
    if (elCartePC) {
        elCartePC.textContent = nCartePC;
        elCartePC.style.color = (nCartePC >= 21) ? '#ffd700' : '';
        elCartePC.style.fontWeight = (nCartePC >= 21) ? 'bold' : 'normal';
    }

    if (elQuadriTu) {
        elQuadriTu.textContent = nQuadriTu;
        elQuadriTu.style.color = (nQuadriTu >= 6) ? '#ffd700' : '';
        elQuadriTu.style.fontWeight = (nQuadriTu >= 6) ? 'bold' : 'normal';
    }
    if (elQuadriPC) {
        elQuadriPC.textContent = nQuadriPC;
        elQuadriPC.style.color = (nQuadriPC >= 6) ? '#ffd700' : '';
        elQuadriPC.style.fontWeight = (nQuadriPC >= 6) ? 'bold' : 'normal';
    }

    if (elSettebelloTu) {
        elSettebelloTu.textContent = settebelloTu ? ((window.currentLang === 'en') ? "Yes" : "Sì") : "No";
        elSettebelloTu.style.color = settebelloTu ? "#ffd700" : "#aaa";
        elSettebelloTu.style.fontWeight = settebelloTu ? "bold" : "normal";
    }
    if (elSettebelloPC) {
        elSettebelloPC.textContent = settebelloPC ? ((window.currentLang === 'en') ? "Yes" : "Sì") : "No";
        elSettebelloPC.style.color = settebelloPC ? "#ffd700" : "#aaa";
        elSettebelloPC.style.fontWeight = settebelloPC ? "bold" : "normal";
    }

    if (elPrimieraTu) elPrimieraTu.textContent = primTu;
    if (elPrimieraPC) elPrimieraPC.textContent = primPC;
    
    // Notifiche di superamento soglia metà + 1 (21 per Carte, 6 per Quadri)
    if (nCarteTu >= 21 && !notificaCarteTuFatta) {
        notificaCarteTuFatta = true;
        creaNotificaPuntoSicuro('Noi', 'Carte');
    }
    if (nCartePC >= 21 && !notificaCartePCFatta) {
        notificaCartePCFatta = true;
        creaNotificaPuntoSicuro('Loro', 'Carte');
    }
    
    if (nQuadriTu >= 6 && !notificaQuadriTuFatta) {
        notificaQuadriTuFatta = true;
        creaNotificaPuntoSicuro('Noi', 'Quadri');
    }
    if (nQuadriPC >= 6 && !notificaQuadriPCFatta) {
        notificaQuadriPCFatta = true;
        creaNotificaPuntoSicuro('Loro', 'Quadri');
    }
}

function aggiornaMessaggioStato(msg) {
    let finalMsg = msg;
    if (window.currentLang === 'en') {
        const translations = {
            "Distribuzione carte...": "Dealing cards...",
            "È il tuo turno! Gioca una carta.": "It's your turn! Play a card.",
            "Distribuzione nuove carte...": "Dealing new cards...",
            "Nessuna presa. Calo in corso...": "No capture possible. Discarding...",
            "Presa automatica!": "Automatic capture!",
            "Scegli le carte sul tavolo per fare somma.": "Choose cards on the table to sum up.",
            "Calo carta...": "Discarding card...",
            "Hai fatto una presa!": "You made a capture!",
            "Calcolo dei punteggi...": "Calculating scores...",
            "Mossa annullata! È di nuovo il tuo turno.": "Move undone! It's your turn again."
        };
        
        if (translations[msg]) {
            finalMsg = translations[msg];
        } else {
            if (msg.includes(" sta pensando...")) {
                const nome = msg.replace(" sta pensando...", "");
                finalMsg = `${nome} is thinking...`;
            }
            else if (msg.includes(" scarta il ")) {
                const parti = msg.split(" scarta il ");
                finalMsg = `${parti[0]} discards the ${parti[1]}`;
            }
            else if (msg.includes(" gioca il ") && msg.includes(" e prende!")) {
                const nome = msg.split(" gioca il ")[0];
                const resto = msg.split(" gioca il ")[1];
                const cardNum = resto.split(" e prende!")[0];
                finalMsg = `${nome} plays the ${cardNum} and captures!`;
            }
        }
    }
    const el = document.getElementById('messaggio-stato');
    if (el) el.textContent = finalMsg;
}

function aggiornaPannelloPunteggio() {
    document.getElementById('punti-noi').textContent = puntiPartitaTu;
    document.getElementById('punti-loro').textContent = puntiPartitaPC;
}

function aggiornaMazziereUI() {
    for (let i = 0; i < 4; i++) {
        const badge = document.getElementById(`dealer-badge-${i}`);
        if (badge) {
            badge.style.display = (i === mazziere) ? 'block' : 'none';
        }
    }
}

function aggiornaGiocatoreAttivoUI() {
    // Rimuovi la classe 'attivo' da tutte le aree dei giocatori
    document.querySelectorAll('.area-giocatore, .area-giocatore-verticale').forEach(el => {
        el.classList.remove('attivo');
    });
    
    // Aggiungi la classe 'attivo' solo all'area del giocatore attivo corrente
    let areaId = '';
    if (giocatoreAttivo === 0) areaId = 'area-giocatore';
    else if (giocatoreAttivo === 1) areaId = 'area-sinistra';
    else if (giocatoreAttivo === 2) areaId = 'area-computer';
    else if (giocatoreAttivo === 3) areaId = 'area-destra';
    
    const activeArea = document.getElementById(areaId);
    if (activeArea) {
        activeArea.classList.add('attivo');
    }
    
    // Gestisci la classe 'turno-giocatore' su #campogioco per attivare hover ed effetti cursore
    const campogioco = document.getElementById('campogioco');
    if (campogioco) {
        if (giocatoreAttivo === 0 && statoGioco === 'turno-giocatore') {
            campogioco.classList.add('turno-giocatore');
        } else {
            campogioco.classList.remove('turno-giocatore');
        }
    }
    aggiornaStatoUndoUI();
}

// === LOGICA PRESE E SELEZIONE GIOCATORE ===

function selezionaCartaGiocatore(card) {
    if (timerMossaGiocatore) {
        clearTimeout(timerMossaGiocatore);
        timerMossaGiocatore = null;
    }

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
    combinazioniPresaDisponibili = calcolaSceltePresa(card.valore, carteTavolo, card);
    
    // Aggiorna grafica
    aggiornaGraficaSelezioneMano();
    
    // Nella variante bresciana le figure possono essere scartate anche se c'è una presa disponibile
    // const figuraOpzionale = variante === 'bresciana' && card.isFigura && combinazioniPresaDisponibili.length > 0;

    if (combinazioniPresaDisponibili.length === 0) {
        aggiornaMessaggioStato("Nessuna presa. Calo in corso...");
        aggiornaGraficaSelezioneTavolo();
        timerMossaGiocatore = setTimeout(() => {
            if (statoGioco === 'turno-giocatore' && cartaSelezionata && cartaSelezionata.id === card.id) {
                eseguiScartoGiocatore();
            }
        }, 0);
    } else if (false /* figuraOpzionale — decommentare per abilitare scelta figura bresciana */) {
        // Figura bresciana: il giocatore sceglie se prendere o scartare
        const msgTakeFigura = window.currentLang === 'en'
            ? 'Click the card on the table to capture, or click the table to discard.'
            : 'Clicca la figura a terra per prenderla, o clicca il tavolo per scartare.';
        aggiornaMessaggioStato(msgTakeFigura);
        evidenziaCarteTavoloEleggibili();
    } else if (combinazioniPresaDisponibili.length === 1) {
        aggiornaMessaggioStato("Presa automatica!");
        tavoloSelezionate = [...combinazioniPresaDisponibili[0]];
        aggiornaGraficaSelezioneTavolo();
        timerMossaGiocatore = setTimeout(() => {
            if (statoGioco === 'turno-giocatore' && cartaSelezionata && cartaSelezionata.id === card.id) {
                eseguiPresaGiocatore();
            }
        }, 400);
    } else {
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
    
    aggiornaGraficaSelezioneTavolo();
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
    if (timerMossaGiocatore) {
        clearTimeout(timerMossaGiocatore);
        timerMossaGiocatore = null;
    }
    cartaSelezionata = null;
    tavoloSelezionate = [];
    combinazioniPresaDisponibili = [];
    document.getElementById('btn-prendi').style.display = 'none';
    
    aggiornaGraficaSelezioneMano();
    aggiornaGraficaSelezioneTavolo();
    
    // Ripristina opacità carte tavolo
    carteTavolo.forEach(card => {
        const el = document.getElementById(`card-tavolo-${card.id}`);
        if (el) {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
}

// Dispatcher: sceglie l'algoritmo giusto in base alla variante
function calcolaSceltePresa(playedVal, tavoloCards, carta) {
    if (variante === 'bresciana') {
        return calcolaSceltePresaBresciana(carta, tavoloCards);
    }
    return calcolaSceltePresaClassica(playedVal, tavoloCards);
}

// Algoritmo Scopa classica
function calcolaSceltePresaClassica(playedVal, tavoloCards) {
    // 1. Se c'è una carta dello stesso valore, DEVI prendere quella
    let corrispondenzeSingole = tavoloCards.filter(c => c.valore === playedVal);
    if (corrispondenzeSingole.length > 0) {
        return corrispondenzeSingole.map(c => [c]);
    }
    // 2. Cerca le somme
    let scelte = [];
    trovaCombinazioniSomma(tavoloCards, playedVal, 0, [], scelte);
    return scelte;
}

// Algoritmo variante Bresciana
function calcolaSceltePresaBresciana(carta, tavoloCards) {
    if (carta.isFigura) {
        // Le figure prendono solo figure dello stesso tipo (stesso number), NON obbligatoriamente
        const simili = tavoloCards.filter(c => c.isFigura && c.number === carta.number);
        if (simili.length > 0) {
            return simili.map(c => [c]); // opzionale: la gestione "non obbligatoria" è nel chiamante
        }
        return []; // nessuna presa disponibile
    }
    // Carte numeriche: tutte le opzioni disponibili (singola + somme), nessun obbligo
    const tavoloNumeriche = tavoloCards.filter(c => !c.isFigura);
    const scelte = [];
    trovaCombinazioniSomma(tavoloNumeriche, carta.valore, 0, [], scelte);
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
    salvaStatoCronologia();
    statoGioco = 'animazione';
    aggiornaGiocatoreAttivoUI();
    aggiornaMessaggioStato("Calo carta...");
    
    const card = cartaSelezionata;
    const startEl = document.getElementById(`card-player-0-${card.id}`);
    
    // Avvia immediatamente il volo della carta
    setTimeout(() => {
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
            ultimaCartaCalataTavolo = card;
            renderTavolo();
            riproduciAudio("sounds/scala40/cardplace1.mp3");

            passaAlProssimoTurno();
        });
    }, 0);
}

function eseguiPresaGiocatore() {
    salvaStatoCronologia();
    statoGioco = 'animazione';
    aggiornaGiocatoreAttivoUI();
    
    const card = cartaSelezionata;
    const preseTavolo = [...tavoloSelezionate];
    
    // Elementi di partenza nel DOM
    const startHandEl = document.getElementById(`card-player-0-${card.id}`);
    const startTableEls = preseTavolo.map(p => document.getElementById(`card-tavolo-${p.id}`));
    const destEl = document.getElementById('presa-giocatore');
    
    aggiornaMessaggioStato("Hai fatto una presa!");

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
        
        // Salva carte prese logiche e aggiorna interfaccia prima che inizi l'animazione per sovrapporre i banner
        const cartePreseQuestaMossa = [card, ...preseTavolo];
        cartePreseTu.push(card);
        preseTavolo.forEach(p => cartePreseTu.push(p));
        ultimoCatturato = 'giocatore';
        
        aggiornaInterfacciaPrese();
        
        // Verifica Settebello / Carte speciali bresciane
        const haPresoSettebello = cartePreseQuestaMossa.some(c => c.suit === 'Q' && c.number === 7);
        if (variante === 'bresciana') {
            creaNotificaCarteSpecialiBresciane('giocatore', cartePreseQuestaMossa);
            const nSpadePresi = cartePreseQuestaMossa.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
            if (nSpadePresi > 0) creaNotificaQuadri('giocatore', nSpadePresi, false, 'S');
            verificaPuntoSpade('giocatore', nSpadePresi);
            if (nSpadePresi > 0) verificaNapola('giocatore');
            if (preseTavolo.length > 1 && cartePreseQuestaMossa.every(c => c.suit === card.suit)) {
                similiRoundTu++;
                riproduciAudio("sounds/scala40/magic.mp3");
                _creaBanner('notifica-settebello', 'SIMILE!', 2000);
                aggiornaDettaglioProgressivo();
            }
            if (preseTavolo.length >= 3) {
                quadriglieRoundTu++;
                riproduciAudio("sounds/scala40/magic.mp3");
                _creaBanner('notifica-settebello', preseTavolo.length >= 4 ? 'CINQUINA!' : 'QUADRIGLIA!', 2000);
                aggiornaDettaglioProgressivo();
            }
        } else {
            if (haPresoSettebello) creaNotificaSettebello('giocatore');
            const nQuadriPresi = cartePreseQuestaMossa.filter(c => c.suit === 'Q').length;
            if (nQuadriPresi > 0) creaNotificaQuadri('giocatore', nQuadriPresi, haPresoSettebello);
        }

        // Verifica Picca (solo bresciana) e Scopa
        const tuttiSenzaCarte = mani.every(h => h.length === 0);
        const ultimaManoDelRound = (mazzo.length === 0 && tuttiSenzaCarte);
        const eScopa = carteTavolo.length === 0 && !ultimaManoDelRound;
        if (variante === 'bresciana' && preseTavolo.length === 1 && ultimaCartaCalataTavolo && preseTavolo[0].id === ultimaCartaCalataTavolo.id) {
            creaNotificaPicca('giocatore', eScopa);
        } else if (eScopa) {
            creaNotificaScopa('giocatore');
        }
        ultimaCartaCalataTavolo = null;

        let animateCount = 0;
        const totaleCarteInPresa = preseTavolo.length + 1;
        
        function completedAnimation() {
            animateCount++;
            if (animateCount === totaleCarteInPresa) {
                passaAlProssimoTurno();
            }
        }
        
        // Anima tutte le carte catturate verso la pila delle prese del giocatore
        animaCarta(card, posHand, posDest, completedAnimation);
        preseTavolo.forEach((p, idx) => {
            animaCarta(p, posTable[idx], posDest, completedAnimation);
        });
    }, 0);
}


function _getNotificheCentro() {
    let el = document.getElementById('notifiche-centro');
    if (!el) {
        el = document.createElement('div');
        el.id = 'notifiche-centro';
        document.getElementById('campogioco').appendChild(el);
    }
    return el;
}

function _creaBanner(className, testo, durata = 2000) {
    const container = _getNotificheCentro();
    const banner = document.createElement('div');
    banner.className = className;
    banner.textContent = testo;
    container.appendChild(banner);
    setTimeout(() => banner.remove(), durata);
    return banner;
}

function isTeamTu(chi) {
    return chi === 'giocatore' || chi === 'compagno';
}

function creaNotificaScopa(chi) {
    riproduciAudio("sounds/scala40/magic.mp3");

    if (isTeamTu(chi)) scopeRoundTu++;
    else scopeRoundPC++;

    aggiornaDettaglioProgressivo();
    _creaBanner('notifica-scopa', 'SCOPA!', 2000);
}

function creaNotificaPicca(chi, conScopa) {
    riproduciAudio("sounds/scala40/magic.mp3");

    if (isTeamTu(chi)) {
        piccateRoundTu++;
        if (conScopa) scopeRoundTu++;
    } else {
        piccateRoundPC++;
        if (conScopa) scopeRoundPC++;
    }

    _creaBanner('notifica-scopa', conScopa ? 'PICCA E SCOPA!' : 'PICCA!', 2000);
    aggiornaDettaglioProgressivo();
}

function calcolaCimaNapola(prese) {
    const numeri = prese.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number);
    if (!numeri.includes(1) || !numeri.includes(2) || !numeri.includes(3)) return 0;
    let cima = 3;
    while (numeri.includes(cima + 1)) cima++;
    return cima;
}

function verificaNapola(chi) {
    if (_napolaImpossibile) return;

    const isEn = window.currentLang === 'en';

    // Controlla se la napola diventa impossibile
    const spadeTu = cartePreseTu.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number);
    const spadePC = cartePresePC.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number);
    const base = [1, 2, 3];
    const tuHaAlcune = base.some(n => spadeTu.includes(n));
    const pcHaAlcune = base.some(n => spadePC.includes(n));
    if (tuHaAlcune && pcHaAlcune) {
        _napolaImpossibile = true;
        riproduciAudio("sounds/scala40/chimes.mp3");
        _creaBanner('notifica-settebello', isEn ? 'NAPOLA LOST!' : 'NAPOLA IMPOSSIBILE!', 2500);
        aggiornaDettaglioProgressivo();
        return;
    }

    // Controlla se la sequenza del giocatore corrente si è allungata
    const isTu = isTeamTu(chi);
    const cimaPrec = isTu ? _napolaCimaPrec.tu : _napolaCimaPrec.pc;
    const prese = isTu ? cartePreseTu : cartePresePC;
    const cimaNuova = calcolaCimaNapola(prese);
    if (cimaNuova > cimaPrec) {
        if (isTu) _napolaCimaPrec.tu = cimaNuova;
        else _napolaCimaPrec.pc = cimaNuova;
        const testo = isEn ? `NAPOLA TO ${cimaNuova}!` : `NAPOLA FINO AL ${cimaNuova}!`;
        riproduciAudio(cimaPrec === 0 ? "sounds/scala40/magic.mp3" : "sounds/scala40/chimes.mp3");
        _creaBanner('notifica-settebello', testo, 2500);
        aggiornaDettaglioProgressivo();
    }
}

function verificaPuntoSpade(chi, nSpadePresiQuestaMossa) {
    if (nSpadePresiQuestaMossa === 0) return;
    const isTu = isTeamTu(chi);
    const prese = isTu ? cartePreseTu : cartePresePC;
    const totaleSpade = prese.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
    const precedente = totaleSpade - nSpadePresiQuestaMossa;
    if (precedente < 7 && totaleSpade >= 7) {
        riproduciAudio("sounds/scala40/magic.mp3");
        _creaBanner('notifica-settebello', window.currentLang === 'en' ? 'SWORDS POINT!' : 'PUNTO SPADE!', 2000);
    }
}

function creaNotificaCarteSpecialiBresciane(chi, cartePreseSet) {
    const isEn = window.currentLang === 'en';
    const haDueDiSpade = cartePreseSet.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number === 2);
    const haDieciDenari = cartePreseSet.some(c => c.suit === 'Q' && c.number === 10);
    const haFanteCoppe = cartePreseSet.some(c => c.suit === SEME_COPPE_BRESCIANE && c.number === 11);

    const container = document.getElementById('campogioco');
    const nomi = [];
    if (haDueDiSpade) nomi.push(isEn ? '2 of Swords' : '2 di Spade');
    if (haDieciDenari) nomi.push(isEn ? '10 of Coins' : '10 di Denari');
    if (haFanteCoppe) nomi.push(isEn ? 'Jack of Cups' : 'Fante di Coppe');

    if (nomi.length > 0) {
        riproduciAudio("sounds/scala40/chimes.mp3");
        nomi.forEach(nome => _creaBanner('notifica-settebello', '+1 ' + nome, 2000));
    }
}

function creaNotificaSettebello(chi) {
    riproduciAudio("sounds/scala40/chimes.mp3");
    
    const container = document.getElementById('campogioco');
    
    // Floating "+1 Settebello 7♦"
    const floatText = document.createElement('div');
    floatText.className = 'punti-floating';
    floatText.style.color = '#ffd700';
    floatText.style.textShadow = '1px 1px 2px #000, 0 0 8px #ffd700';
    floatText.textContent = '+1 Settebello';
    
    // Floating position
    if (isTeamTu(chi)) {
        floatText.style.bottom = '180px';
        floatText.style.left = '48%';
    } else {
        floatText.style.top = '180px';
        floatText.style.left = '48%';
    }
    container.appendChild(floatText);
    
    _creaBanner('notifica-settebello', 'SETTEBELLO!', 2000);

    setTimeout(() => floatText.remove(), 2000);
}

function creaNotificaQuadri(chi, quanti, silenziato, simboloOverride) {
    const container = document.getElementById('campogioco');
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '50%';
    const isTu = isTeamTu(chi);
    if (isTu) {
        wrapper.style.top = '56%'; // Centro-basso (Noi)
    } else {
        wrapper.style.top = '40%'; // Centro-alto (Loro)
    }
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '55000';
    
    // Floating "+nQ"
    const floatText = document.createElement('div');
    floatText.className = 'punti-floating';
    floatText.style.position = 'relative';
    floatText.style.fontSize = '38px';
    floatText.style.color = '#ff3344';
    floatText.style.textShadow = '2px 2px 2px #000, 0 0 10px #ff3344, 0 0 20px #ff0000, 0 0 30px #ff0000';
    let testoSeme;
    let totale;
    const prese = isTu ? cartePreseTu : cartePresePC;
    if (simboloOverride) {
        testoSeme = simboloOverride === 'S'
            ? (window.currentLang === 'en' ? 'Swords' : 'Spade')
            : simboloOverride;
        totale = prese.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
    } else {
        const isFrancesi = (localStorage.getItem('scopa-deck-theme') || 'francesi') === 'francesi';
        testoSeme = isFrancesi
            ? (window.currentLang === 'en' ? 'Diamonds' : 'Quadri')
            : (window.currentLang === 'en' ? 'Coins' : 'Denari');
        totale = prese.filter(c => c.suit === 'Q').length;
    }
    floatText.textContent = `+${quanti} ${testoSeme} (${totale})`;
    
    wrapper.appendChild(floatText);
    container.appendChild(wrapper);
    
    setTimeout(() => {
        wrapper.remove();
    }, 1500);
}

function creaNotificaPuntoSicuro(chi, tipo) {
    const container = document.getElementById('campogioco');
    const existing = container.querySelector('.notifica-punto-sicuro');
    
    const delayedCall = () => {
        riproduciAudio("sounds/scala40/dindon.mp3");
        
        const banner = document.createElement('div');
        banner.className = 'notifica-punto-sicuro';
        
        let testo = '';
        if (window.currentLang === 'en') {
            const engTipo = (tipo === 'Carte') ? 'Cards' : nomeQuadri();
            let engChi = (chi === 'Noi') ? 'Us' : 'Them';
            if (modalitaGioco === '2P' && chi === 'Loro') {
                engChi = ottieniNomeGiocatore(2);
            }
            testo = `${engTipo} point to ${engChi}!`;
        } else {
            let detChi = chi;
            if (modalitaGioco === '2P' && chi === 'Loro') {
                detChi = ottieniNomeGiocatore(2);
            }
            const tipoLabel = (tipo === 'Quadri') ? nomeQuadri() : tipo;
        testo = `Punto ${tipoLabel} a ${detChi}!`;
        }
        
        _creaBanner('notifica-punto-sicuro', testo, 2000);
    };

    if (existing) {
        setTimeout(delayedCall, 1800);
    } else {
        delayedCall();
    }
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
            setTimeout(() => eseguiMossaComputer(giocatoreAttivo), 450);
        }
        aggiornaGiocatoreAttivoUI();
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
        
        // Verifica Settebello / Carte speciali bresciane alla pulizia tavolo
        const haSettebello = tavoloCarteCopie.some(c => c.suit === 'Q' && c.number === 7);
        const chi4P = ultimoCatturato === 'computer' ? 'computer' : 'giocatore';
        const nQuadriPresi = tavoloCarteCopie.filter(c => c.suit === 'Q').length;
        if (variante === 'bresciana') {
            creaNotificaCarteSpecialiBresciane(chi4P, tavoloCarteCopie);
            const nSpadePresi = tavoloCarteCopie.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
            if (nSpadePresi > 0) creaNotificaQuadri(chi4P, nSpadePresi, false, 'S');
            verificaPuntoSpade(chi4P, nSpadePresi);
            if (nSpadePresi > 0) verificaNapola(chi4P);
        } else {
            if (haSettebello) creaNotificaSettebello(chi4P);
            if (nQuadriPresi > 0) creaNotificaQuadri(chi4P, nQuadriPresi, haSettebello);
        }
        
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
                    
                    if (haSettebello || nQuadriPresi > 0) {
                        setTimeout(calcolaPunteggiRound, 1500);
                    } else {
                        calcolaPunteggiRound();
                    }
                }
            });
        });
    } else {
        calcolaPunteggiRound();
    }
}

function calcolaPunteggiRound() {
    if (variante === 'bresciana') {
        calcolaPunteggiRoundBresciana();
        return;
    }
    calcolaPunteggiRoundClassica();
}

function calcolaPunteggiRoundBresciana() {
    const isEn = window.currentLang === 'en';

    // 1. Carte (27+)
    const nCarteTu = cartePreseTu.length;
    const nCartePC = cartePresePC.length;
    let ptCarteTu = 0, ptCartePC = 0;
    if (nCarteTu >= 27) ptCarteTu = 1;
    else if (nCartePC >= 27) ptCartePC = 1;

    // 2. Spade (7+) — in bresciana Spade = riga 0 sprite = 'F'
    const nSpadeTu = cartePreseTu.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
    const nSpadePC = cartePresePC.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
    let ptSpadeTu = 0, ptSpadePC = 0;
    if (nSpadeTu >= 7) ptSpadeTu = 1;
    else if (nSpadePC >= 7) ptSpadePC = 1;

    // 3. Napola: Asso+2+3 di Spade = 3 pt base, +1 per ogni carta aggiuntiva in sequenza
    function calcolaNapola(prese) {
        const spade = prese.filter(c => c.suit === SEME_SPADE_BRESCIANE).map(c => c.number).sort((a, b) => a - b);
        if (!spade.includes(1) || !spade.includes(2) || !spade.includes(3)) return 0;
        let pt = 3;
        let next = 4;
        while (spade.includes(next)) { pt++; next++; }
        return pt;
    }
    const napolaTu = calcolaNapola(cartePreseTu);
    const napolaPC = calcolaNapola(cartePresePC);

    // 4. Due di Spade ('F' = riga 0 bresciane = Spade)
    const mattaTu = cartePreseTu.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number === 2) ? 1 : 0;
    const mattaPC = cartePresePC.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number === 2) ? 1 : 0;

    // 5. Dieci di Denari: 10 di Quadri ('Q' = riga 1 bresciane = Denari)
    const diecidenaroTu = cartePreseTu.some(c => c.suit === 'Q' && c.number === 10) ? 1 : 0;
    const diecidenaroPC = cartePresePC.some(c => c.suit === 'Q' && c.number === 10) ? 1 : 0;

    // 6. Fante di Coppe: 11 di Coppe ('C' = riga 2 bresciane = Coppe)
    const fanteCoppe = cartePreseTu.some(c => c.suit === SEME_COPPE_BRESCIANE && c.number === 11) ? 1 : 0;
    const fanteCoppePC = cartePresePC.some(c => c.suit === SEME_COPPE_BRESCIANE && c.number === 11) ? 1 : 0;

    // 7. Scope + Piccate + Simili + Quadriglie
    const ptScopePiccateSimiliTu = scopeRoundTu + piccateRoundTu + similiRoundTu + quadriglieRoundTu;
    const ptScopePiccateSimiliPC = scopeRoundPC + piccateRoundPC + similiRoundPC + quadriglieRoundPC;
    const ptRoundTu = ptCarteTu + ptSpadeTu + napolaTu + mattaTu + diecidenaroTu + fanteCoppe + ptScopePiccateSimiliTu;
    const ptRoundPC = ptCartePC + ptSpadePC + napolaPC + mattaPC + diecidenaroPC + fanteCoppePC + ptScopePiccateSimiliPC;

    puntiPartitaTu += ptRoundTu;
    puntiPartitaPC += ptRoundPC;

    // Carte speciali aggregate (Matta + Dieci Denari + Fante Coppe)
    const specialiTu = mattaTu + diecidenaroTu + fanteCoppe;
    const specialiPC = mattaPC + diecidenaroPC + fanteCoppePC;

    // Popola la modale con i dati bresciani
    mostraModalePunteggiGenerica({
        righe: [
            { label: 'Scope / Piccate / Simili / Quadriglie', tu: ptScopePiccateSimiliTu, pc: ptScopePiccateSimiliPC },
            { label: isEn ? 'Cards (27+)' : 'Carte (27+)',   tu: `${nCarteTu} (${ptCarteTu})`,   pc: `${nCartePC} (${ptCartePC})` },
            { label: isEn ? 'Spades (7+)' : 'Spade (7+)',    tu: `${nSpadeTu} (${ptSpadeTu})`,   pc: `${nSpadePC} (${ptSpadePC})` },
            { label: 'Napola',                                tu: _napolaImpossibile && napolaTu === 0 ? '<span style="color:#ff3344;font-weight:bold">X</span>' : napolaTu, pc: _napolaImpossibile && napolaPC === 0 ? '<span style="color:#ff3344;font-weight:bold">X</span>' : napolaPC },
            { label: isEn ? '2 of Spades' : 'Due di Spade',  tu: mattaTu,                         pc: mattaPC },
            { label: isEn ? '10 of Coins' : 'Dieci Denari',  tu: diecidenaroTu,                   pc: diecidenaroPC },
            { label: isEn ? 'Jack of Cups' : 'Fante Coppe',  tu: fanteCoppe,                      pc: fanteCoppePC },
        ],
        ptRoundTu, ptRoundPC,
        specialiTu, specialiPC
    });
}

function calcolaPunteggiRoundClassica() {
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

    const isEn = window.currentLang === 'en';
    mostraModalePunteggiGenerica({
        righe: [
            { label: isEn ? 'Sweeps' : 'Scope',             tu: scopeRoundTu,                                   pc: scopeRoundPC },
            { label: isEn ? 'Cards (Total)' : 'Carte (Tot)', tu: `${nCarteTu} (${ptCarteTu})`,                  pc: `${nCartePC} (${ptCartePC})` },
            { label: `${nomeQuadri()} (Tot)`, tu: `${nQuadriTu} (${ptQuadriTu})`,              pc: `${nQuadriPC} (${ptQuadriPC})` },
            { label: isEn ? 'Settebello (7♦)' : 'Settebello (7♦)', tu: settebelloTu ? (isEn ? 'Yes (1)' : 'Sì (1)') : 'No (0)', pc: settebelloPC ? (isEn ? 'Yes (1)' : 'Sì (1)') : 'No (0)' },
            { label: isEn ? 'Primiera (Value)' : 'Primiera (Val)', tu: `${primValTu} (${ptPrimieraTu})`,        pc: `${primValPC} (${ptPrimieraPC})` },
        ],
        ptRoundTu, ptRoundPC,
        ptMatchTu: ptRoundTu, ptMatchPC: ptRoundPC
    });
}

function mostraModalePunteggiGenerica({ righe, ptRoundTu, ptRoundPC, ptMatchTu, ptMatchPC }) {
    const modal = document.getElementById('modale-punteggi');
    const isEn = window.currentLang === 'en';

    // Popola la tabella dinamicamente
    const tbody = modal.querySelector('.tabella-punti tbody');
    if (tbody) {
        // Rimuovi righe dinamiche precedenti (mantieni solo totale-row e totale-partita)
        const righeEsistenti = tbody.querySelectorAll('tr:not(.totale-row):not(.totale-partita)');
        righeEsistenti.forEach(r => r.remove());
        const totaleRow = tbody.querySelector('.totale-row');
        righe.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.label}</td><td id="_dyn-tu">${r.tu}</td><td id="_dyn-pc">${r.pc}</td>`;
            tbody.insertBefore(tr, totaleRow);
        });
    }

    document.getElementById('round-punti-tu').textContent = ptRoundTu;
    document.getElementById('round-punti-pc').textContent = ptRoundPC;
    document.getElementById('match-punti-tu').textContent = puntiPartitaTu;
    document.getElementById('match-punti-pc').textContent = puntiPartitaPC;

    const targetLabel = document.getElementById('modale-target-label');
    if (targetLabel) {
        const isEn = window.currentLang === 'en';
        targetLabel.textContent = isEn ? `Target: ${puntiTarget} points` : `Target: ${puntiTarget} punti`;
    }

    const isPartitaFinita = (puntiPartitaTu >= puntiTarget || puntiPartitaPC >= puntiTarget) && puntiPartitaTu !== puntiPartitaPC;
    let finePartitaStato = '';

    const titleEl = modal.querySelector('.form-scopa-title');
    const btnEl = modal.querySelector('.btn-continua');

    let manoStato = '';
    if (ptRoundTu > ptRoundPC) manoStato = 'vinto';
    else if (ptRoundPC > ptRoundTu) manoStato = 'perso';
    else manoStato = 'pareggiato';
    
    if (isPartitaFinita) {
        statoGioco = 'finito';
        const partitaVinta = puntiPartitaTu > puntiPartitaPC;
        finePartitaStato = partitaVinta ? 'vinto' : 'perso';
        
        let testoTitolo = '';
        if (window.currentLang === 'en') {
            if (partitaVinta) {
                if (manoStato === 'perso') {
                    testoTitolo = 'You lost the round but won the game';
                } else if (manoStato === 'pareggiato') {
                    testoTitolo = 'Round tied, you won the game';
                } else {
                    testoTitolo = 'YOU WON THE GAME!';
                }
            } else {
                if (manoStato === 'vinto') {
                    testoTitolo = 'You won the round but lost the game';
                } else if (manoStato === 'pareggiato') {
                    testoTitolo = 'Round tied, you lost the game';
                } else {
                    testoTitolo = 'YOU LOST THE GAME!';
                }
            }
        } else {
            if (partitaVinta) {
                if (manoStato === 'perso') {
                    testoTitolo = 'Hai perso la mano ma hai vinto la partita';
                } else if (manoStato === 'pareggiato') {
                    testoTitolo = 'Mano pareggiata, hai vinto la partita';
                } else {
                    testoTitolo = 'HAI VINTO LA PARTITA!';
                }
            } else {
                if (manoStato === 'vinto') {
                    testoTitolo = 'Hai vinto la mano ma hai perso la partita';
                } else if (manoStato === 'pareggiato') {
                    testoTitolo = 'Mano pareggiata, hai perso la partita';
                } else {
                    testoTitolo = 'HAI PERSO LA PARTITA!';
                }
            }
        }
        
        if (titleEl) {
            titleEl.textContent = testoTitolo;
            titleEl.style.color = partitaVinta ? '#ffd700' : '#ff5555';
        }
        if (btnEl) btnEl.textContent = (window.currentLang === 'en') ? 'NEW GAME' : 'NUOVA PARTITA';
    } else {
        let testoTitolo = '';
        if (window.currentLang === 'en') {
            if (manoStato === 'vinto') testoTitolo = 'You won the round!';
            else if (manoStato === 'perso') testoTitolo = 'You lost the round!';
            else testoTitolo = 'Round tied!';
        } else {
            if (manoStato === 'vinto') testoTitolo = 'Hai vinto la mano!';
            else if (manoStato === 'perso') testoTitolo = 'Hai perso la mano!';
            else testoTitolo = 'Mano pareggiata!';
        }
        
        if (titleEl) {
            titleEl.textContent = testoTitolo;
            titleEl.style.color = '#ffffff';
        }
        if (btnEl) btnEl.textContent = (window.currentLang === 'en') ? 'CONTINUE' : 'CONTINUA';
    }

    if (window.ENABLE_BANNER_ON_FINISH && typeof setupAmazonFinishBanner === 'function') {
        setupAmazonFinishBanner('modale-punteggi', {
            modalStyle: {
                width: '700px',
                height: '300px',
                left: '162px',
                top: '380px',
                background: '#1a4224 url(images/scala40/tappetoverde.png)',
                border: '4px solid #b8860b',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                padding: '25px',
                color: 'white',
                boxSizing: 'border-box'
            },
            targetTop: 380,
            bannerHeight: 300,
            bannerTopOffset: 310,
            leftOffset: 0,
            showVediCarte: false,
            onSetupButtons: function (m) {
                var btn = m.querySelector('.btn-continua');
                if (btn) {
                    btn.style.position = 'absolute';
                    btn.style.top = '190px';
                    btn.style.width = '240px';
                    btn.style.left = '35px';
                    btn.style.fontSize = '20px';
                    btn.style.margin = '0';
                }
                var targetLbl = m.querySelector('#modale-target-label');
                if (targetLbl) {
                    targetLbl.style.position = 'absolute';
                    targetLbl.style.top = '240px';
                    targetLbl.style.left = '35px';
                    targetLbl.style.width = '240px';
                    targetLbl.style.textAlign = 'center';
                }
                var title = m.querySelector('.form-scopa-title');
                if (title) {
                    title.style.position = 'absolute';
                    title.style.top = '50px';
                    title.style.left = '35px';
                    title.style.width = '240px';
                    title.style.fontSize = '26px';
                    title.style.margin = '0';
                    title.style.textAlign = 'center';
                    title.style.lineHeight = '1.3';
                }
                var table = m.querySelector('.tabella-punti');
                if (table) {
                    table.style.position = 'absolute';
                    table.style.top = '5px';
                    table.style.right = '35px';
                    table.style.width = '370px';
                    table.style.margin = '0';
                    table.style.fontSize = '13px';
                    var cells = table.querySelectorAll('th, td');
                    for (var i = 0; i < cells.length; i++) {
                        cells[i].style.padding = '5px 8px';
                    }
                    var totalRow = table.querySelector('.totale-partita');
                    if (totalRow) {
                        var totalCells = totalRow.querySelectorAll('td');
                        for (var j = 0; j < totalCells.length; j++) {
                            totalCells[j].style.fontSize = '16px';
                            totalCells[j].style.paddingTop = '6px';
                            totalCells[j].style.paddingBottom = '4px';
                        }
                    }
                }
            }
        });
    } else {
        // Ripristina layout originale se Amazon non è attivo
        modal.style.width = '500px';
        modal.style.height = '540px';
        modal.style.left = '262px';
        modal.style.top = '105px';
        modal.style.background = '#1a4224 url(images/scala40/tappetoverde.png)';
        modal.style.border = '4px solid #b8860b';
        modal.style.borderRadius = '12px';
        modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        modal.style.overflow = 'hidden';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.padding = '25px';
        modal.style.color = 'white';
        modal.style.boxSizing = 'border-box';
        
        var btn = modal.querySelector('.btn-continua');
        if (btn) {
            btn.style.position = '';
            btn.style.top = '';
            btn.style.width = '';
            btn.style.left = '';
            btn.style.fontSize = '';
            btn.style.margin = '';
        }
        var title = modal.querySelector('.form-scopa-title');
        if (title) {
            title.style.position = '';
            title.style.top = '';
            title.style.left = '';
            title.style.width = '';
            title.style.fontSize = '';
            title.style.margin = '';
            title.style.textAlign = '';
            title.style.lineHeight = '';
        }
        var table = modal.querySelector('.tabella-punti');
        if (table) {
            table.style.position = '';
            table.style.top = '';
            table.style.right = '';
            table.style.width = '';
            table.style.margin = '';
            table.style.fontSize = '';
            var cells = table.querySelectorAll('th, td');
            for (var i = 0; i < cells.length; i++) {
                cells[i].style.padding = '';
            }
        }
    }
    
    // Aggiorna subito il pannello laterale del punteggio
    aggiornaPannelloPunteggio();
    
    modal.style.display = 'flex';
    document.getElementById('schermo').style.display = 'block';
    
    // Suono di riepilogo
    if (isPartitaFinita) {
        if (finePartitaStato === 'vinto') {
            riproduciAudio("sounds/scala40/applause.mp3");
        } else {
            riproduciAudio("sounds/scala40/haiperso.mp3");
        }
    } else {
        riproduciAudio("sounds/scala40/tada.mp3");
    }
}

// Funzione helper per testare le modali di fine partita (vittoria/sconfitta) da console
window.testModaleFinePartita = function(esito) {
    puntiPartitaTu = (esito === 'vittoria') ? 21 : 10;
    puntiPartitaPC = (esito === 'vittoria') ? 10 : 21;
    puntiTarget = 11;
    
    cartePreseTu = [];
    cartePresePC = [];
    for(var i=0; i<22; i++) cartePreseTu.push({suit: 'F', number: 1});
    for(var i=0; i<18; i++) cartePresePC.push({suit: 'F', number: 1});
    cartePreseTu.push({suit: 'Q', number: 7});
    scopeRoundTu = 1;
    scopeRoundPC = 0;
    
    calcolaPunteggiRound();
    console.log(`[Test] Visualizzazione modale di fine partita (${esito}) avviata.`);
};

// Funzione helper per testare la modale di fine mano (punteggio del round) da console
window.testModaleFineRound = function() {
    puntiPartitaTu = 5;
    puntiPartitaPC = 3;
    puntiTarget = 21;
    
    cartePreseTu = [];
    cartePresePC = [];
    for(var i=0; i<22; i++) cartePreseTu.push({suit: 'F', number: 1});
    for(var i=0; i<18; i++) cartePresePC.push({suit: 'F', number: 1});
    cartePreseTu.push({suit: 'Q', number: 7});
    scopeRoundTu = 1;
    scopeRoundPC = 0;
    
    calcolaPunteggiRound();
    console.log("[Test] Visualizzazione modale di fine mano (punteggio del round) avviata.");
};

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

    if (statoGioco === 'finito') {
        location.reload();
        return;
    }

    // Mano intermedia: avanza il mazziere e salva stato in sessionStorage prima del reload
    mazziere = prossimoGiocatore(mazziere);
    chiIniziaQuestoRound = prossimoGiocatore(mazziere);

    sessionStorage.setItem('scopa-partita-in-corso', JSON.stringify({
        puntiPartitaTu,
        puntiPartitaPC,
        puntiTarget,
        modalitaGioco,
        mazziere,
        chiIniziaQuestoRound,
        variante,
        temaCorrente: localStorage.getItem('scopa-deck-theme') || 'francesi'
    }));
    location.reload();
}

function confermaEAvviaRoundDiretto() {
    // Configura UI esattamente come fa confermaEAvviaPartita, senza resettare i punteggi
    const campogioco = document.getElementById('campogioco');
    const areaSinistra = document.getElementById('area-sinistra');
    const areaDestra = document.getElementById('area-destra');
    const labelNoi = document.getElementById('label-noi');
    const labelLoro = document.getElementById('label-loro');
    const thNoi = document.getElementById('header-punti-noi');
    const thLoro = document.getElementById('header-punti-loro');
    const progHeaderNoi = document.getElementById('prog-header-noi');
    const progHeaderLoro = document.getElementById('prog-header-loro');

    if (modalitaGioco === '4P') {
        campogioco.classList.add('quattro-giocatori');
        areaSinistra.style.display = 'flex';
        areaDestra.style.display = 'flex';
        labelNoi.textContent = (window.currentLang === 'en') ? "US" : "NOI";
        labelLoro.textContent = (window.currentLang === 'en') ? " THEM" : " LORO";
        if (thNoi) thNoi.textContent = (window.currentLang === 'en') ? "Us" : "Noi";
        if (thLoro) thLoro.textContent = (window.currentLang === 'en') ? "Them" : "Loro";
        if (progHeaderNoi) progHeaderNoi.textContent = (window.currentLang === 'en') ? "Us" : "Noi";
        if (progHeaderLoro) progHeaderLoro.textContent = (window.currentLang === 'en') ? "Them" : "Loro";
    } else {
        campogioco.classList.remove('quattro-giocatori');
        areaSinistra.style.display = 'none';
        areaDestra.style.display = 'none';
        labelNoi.textContent = (window.currentLang === 'en') ? "YOU" : "TU";
        const oppNome = (giocatoriSessione && giocatoriSessione[2]) ? giocatoriSessione[2].nome : "PC";
        labelLoro.textContent = " " + oppNome.toUpperCase();
        if (thNoi) thNoi.textContent = (window.currentLang === 'en') ? "You" : "Tu";
        if (thLoro) thLoro.textContent = oppNome;
        if (progHeaderNoi) progHeaderNoi.textContent = (window.currentLang === 'en') ? "You" : "Tu";
        if (progHeaderLoro) progHeaderLoro.textContent = oppNome;
    }

    applicaGiocatoriUI();

    document.getElementById('modale-inizio').style.display = 'none';
    document.getElementById('schermo').style.display = 'none';
    document.getElementById('torneo-info').textContent = (window.currentLang === 'en') ? `Target: ${puntiTarget} points` : `Target: ${puntiTarget} punti`;

    aggiornaPannelloPunteggio();
    if (typeof aggiornaDettaglioProgressivo === 'function') {
        aggiornaDettaglioProgressivo();
    }

    avviaRound();
}

// === INTELLIGENZA ARTIFICIALE (MOSSA DEL COMPUTER) ===

function eseguiMossaComputer(giocatoreIdx) {
    if (confirmModalOpen) {
        // Se la modale di conferma abbandono è aperta, rimanda la mossa
        setTimeout(() => eseguiMossaComputer(giocatoreIdx), 1000);
        return;
    }
    if (statoGioco !== 'turno-computer') return;
    
    if (giocatoreIdx === undefined) giocatoreIdx = giocatoreAttivo;
    
    const manoCorrente = mani[giocatoreIdx];
    
    // Analizziamo tutte le mosse possibili
    const mossePossibili = []; // Array di oggetti: { card: Carta, captureSet: [Carta], score: number }
    
    manoCorrente.forEach(card => {
        const scelte = calcolaSceltePresa(card.valore, carteTavolo, card);
        if (scelte.length === 0) {
            // Discard play
            mossePossibili.push({
                card: card,
                captureSet: [],
                score: calcolaPunteggioScartoIA(card, giocatoreIdx)
            });
        } else {
            // Capture play(s)
            scelte.forEach(subset => {
                mossePossibili.push({
                    card: card,
                    captureSet: subset,
                    score: calcolaPunteggioPresaIA(card, subset, giocatoreIdx)
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
    
    const isNoi = (modalitaGioco === '4P') ? (giocatoreIdx === 0 || giocatoreIdx === 2) : (giocatoreIdx === 0);
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
                ultimaCartaCalataTavolo = cardPC;
                renderTavolo();
                riproduciAudio("sounds/scala40/cardplace1.mp3");

                passaAlProssimoTurno();
            });
        }, 300);
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
            
            // Salva presa logicamente e aggiorna interfaccia prima dell'inizio dell'animazione
            const cartePreseQuestaMossa = [cardPC, ...preseTavolo];
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
            
            // Verifica Settebello / Carte speciali bresciane (mossa IA)
            const haPresoSettebello = cartePreseQuestaMossa.some(c => c.suit === 'Q' && c.number === 7);
            const chiIA = isNoi ? 'giocatore' : 'computer';
            if (variante === 'bresciana') {
                creaNotificaCarteSpecialiBresciane(chiIA, cartePreseQuestaMossa);
                const nSpadePresi = cartePreseQuestaMossa.filter(c => c.suit === SEME_SPADE_BRESCIANE).length;
                if (nSpadePresi > 0) creaNotificaQuadri(chiIA, nSpadePresi, false, 'S');
                verificaPuntoSpade(chiIA, nSpadePresi);
                if (nSpadePresi > 0) verificaNapola(chiIA);
                if (preseTavolo.length > 1 && cartePreseQuestaMossa.every(c => c.suit === cardPC.suit)) {
                    (isNoi ? similiRoundTu++ : similiRoundPC++);
                    riproduciAudio("sounds/scala40/magic.mp3");
                    _creaBanner('notifica-settebello', 'SIMILE!', 2000);
                    aggiornaDettaglioProgressivo();
                }
                if (preseTavolo.length >= 3) {
                    (isNoi ? quadriglieRoundTu++ : quadriglieRoundPC++);
                    riproduciAudio("sounds/scala40/magic.mp3");
                    _creaBanner('notifica-settebello', preseTavolo.length >= 4 ? 'CINQUINA!' : 'QUADRIGLIA!', 2000);
                    aggiornaDettaglioProgressivo();
                }
            } else {
                if (haPresoSettebello) creaNotificaSettebello(chiIA);
                const nQuadriPresi = cartePreseQuestaMossa.filter(c => c.suit === 'Q').length;
                if (nQuadriPresi > 0) creaNotificaQuadri(chiIA, nQuadriPresi, haPresoSettebello);
            }
            
            // Verifica Picca (solo bresciana) e Scopa
            const tuttiSenzaCarte = mani.every(h => h.length === 0);
            const ultimaManoDelRound = (mazzo.length === 0 && tuttiSenzaCarte);
            const eScopa = carteTavolo.length === 0 && !ultimaManoDelRound;
            if (variante === 'bresciana' && preseTavolo.length === 1 && ultimaCartaCalataTavolo && preseTavolo[0].id === ultimaCartaCalataTavolo.id) {
                creaNotificaPicca(chiIA, eScopa);
            } else if (eScopa) {
                creaNotificaScopa(chiIA);
            }
            ultimaCartaCalataTavolo = null;

            let animateCount = 0;
            const totaleCarteInPresa = preseTavolo.length + 1;
            
            function completedAnimation() {
                animateCount++;
                if (animateCount === totaleCarteInPresa) {
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

// Dispatcher IA
function calcolaPunteggioPresaIA(card, captureSet, giocatoreIdx) {
    if (variante === 'bresciana') return calcolaPunteggioPresaIABresciana(card, captureSet, giocatoreIdx);
    return calcolaPunteggioPresaIAClassica(card, captureSet);
}

function calcolaPunteggioScartoIA(card, giocatoreIdx) {
    if (variante === 'bresciana') return calcolaPunteggioScartoIABresciana(card, giocatoreIdx);
    return calcolaPunteggioScartoIAClassica(card);
}

// Calcola il valore positivo individuale di una singola carta per una determinata squadra
function calcolaValorePositivoCarta(card, isTeamTu) {
    let val = 0;

    // Determina miePrese e oppPrese
    const miePrese = isTeamTu ? cartePreseTu : cartePresePC;
    const oppPrese = isTeamTu ? cartePresePC : cartePreseTu;

    // 1. Carte speciali bresciane: 10 di Denari, Fante di Coppe, 2 di Spade (matta)
    // Ciascuna vale 100 punti
    if (card.suit === 'Q' && card.number === 10) val += 100;          // Dieci Denari
    else if (card.suit === SEME_COPPE_BRESCIANE && card.number === 11) val += 100; // Fante Coppe
    else if (card.suit === SEME_SPADE_BRESCIANE && card.number === 2) val += 100;  // 2 di Spade (matta)

    // 2. Punto Spade: 30 punti per ogni spada, a meno che il punto spade non sia già stato assegnato (7+ spade da uno dei due team)
    const spadeDeciso = (cartePreseTu.filter(c => c.suit === SEME_SPADE_BRESCIANE).length >= 7 || 
                         cartePresePC.filter(c => c.suit === SEME_SPADE_BRESCIANE).length >= 7);
    if (!spadeDeciso && card.suit === SEME_SPADE_BRESCIANE) {
        val += 30;
    }

    // 3. Napola
    if (card.suit === SEME_SPADE_BRESCIANE) {
        const cimaMia = calcolaCimaNapola(miePrese);
        const cimaOpp = calcolaCimaNapola(oppPrese);
        const X = card.number;

        if (cimaMia < 3 && cimaOpp < 3) {
            // Caso A: Napola non ancora assegnata a nessuno dei due team
            // a meno che non ci sia una spada di numero inferiore già conquistata dagli avversari
            const hasOppLowerSpade = oppPrese.some(c => c.suit === SEME_SPADE_BRESCIANE && c.number < X);
            if (!hasOppLowerSpade) {
                if (X <= 3) val += 60;
                else if (X === 4) val += 40;
                else if (X === 5) val += 30;
                else if (X === 6) val += 20;
                else if (X === 7) val += 10;
            }
        } else if (cimaMia >= 3) {
            // Caso B: Napola già conquistata da noi
            // 50 punti per ogni spada di valore inferiore a quella più bassa conquistata dall'avversario
            const minOppSpade = oppPrese.filter(c => c.suit === SEME_SPADE_BRESCIANE).reduce((min, c) => Math.min(min, c.number), 14);
            if (X < minOppSpade) {
                val += 50;
            }
            // Nota: I 100 punti per ogni spada che allunga la napola sono calcolati a livello di presa
        } else if (cimaOpp >= 3) {
            // Caso C: Napola già conquistata dall'avversario
            // 80 punti per ogni spada che allungherebbe la napola dell'avversario (cioè oppCimaNapola + 1)
            if (X === cimaOpp + 1) {
                val += 80;
            }
            // 40 punti per ogni spada comunque inferiore alla più bassa conquistata da noi
            const minMiaSpade = miePrese.filter(c => c.suit === SEME_SPADE_BRESCIANE).reduce((min, c) => Math.min(min, c.number), 14);
            if (X < minMiaSpade) {
                val += 40;
            }
        }
    }

    return val;
}

// IA Bresciana — presa
function calcolaPunteggioPresaIABresciana(card, captureSet, giocatoreIdx) {
    let score = 100; // Baseline per qualsiasi presa
    const totalCardsInHands = mani.reduce((sum, h) => sum + h.length, 0);
    const ultimaManoRound = (mazzo.length === 0 && totalCardsInHands === 1);
    const allCards = [card, ...captureSet];

    // Determina la pila delle carte già prese dal proprio team
    const isTeamTu = (giocatoreIdx === 0 || giocatoreIdx === 2);
    const miePrese = isTeamTu ? cartePreseTu : cartePresePC;

    // Scopa: 100 punti
    if (captureSet.length === carteTavolo.length && !ultimaManoRound) score += 100;

    // Picca: 100 punti
    if (ultimaCartaCalataTavolo && captureSet.length === 1 && captureSet[0].id === ultimaCartaCalataTavolo.id) {
        score += 100;
    }

    // Simili: 100 punti (richiede almeno 2 carte dal tavolo)
    if (captureSet.length >= 2) {
        const primoSeme = allCards[0].suit;
        if (allCards.every(c => c.suit === primoSeme)) score += 100;
    }

    // Quadriglia/Cinquina: +120 se 3 carte dal tavolo (Quadriglia), +140 se >= 4 dal tavolo (Cinquina)
    if (captureSet.length === 3) {
        score += 120;
    } else if (captureSet.length >= 4) {
        score += 140;
    }

    // Aggiungi valore positivo per ciascuna carta coinvolta nella presa
    allCards.forEach(c => {
        score += calcolaValorePositivoCarta(c, isTeamTu);
    });

    // Se la Napola è già nostra, aggiungi 100 punti per ogni spada che allunga la Napola
    const cimaMia = calcolaCimaNapola(miePrese);
    if (cimaMia >= 3) {
        const allSpades = allCards.filter(c => c.suit === SEME_SPADE_BRESCIANE);
        const cimaFutura = calcolaCimaNapola([...miePrese, ...allSpades]);
        if (cimaFutura > cimaMia) {
            score += (cimaFutura - cimaMia) * 100;
        }
    }

    // Bonus generico per quantità carte
    score += (captureSet.length + 1) * 3;
    return score;
}

// IA Bresciana — scarto
function calcolaPunteggioScartoIABresciana(card, giocatoreIdx) {
    let score = 0;
    const isTeamTu = (giocatoreIdx === 0 || giocatoreIdx === 2);

    // Difesa anti-scopa: se scartando questa carta la somma totale tavolo supera 10,
    // l'avversario non può fare scopa al prossimo turno con una singola carta
    const sommaTavolo = carteTavolo.reduce((s, c) => s + c.valore, 0);
    if (sommaTavolo + card.valore > 10) score += 60;

    // Valorizzazione negativa dello scarto: la metà del valore positivo che la carta avrebbe per l'avversario
    const valorePositivoPerAvversario = calcolaValorePositivoCarta(card, !isTeamTu);
    score -= (valorePositivoPerAvversario / 2);

    // Penalizza lo scarto di figure (sebbene valgano 0 nelle somme, possono essere prese dall'avversario)
    if (card.isFigura) score -= 5;
    
    // Penalizza leggermente le carte con valore numerico alto per evitare prese facili
    score -= card.valore * 1.5;
    
    return score;
}

// Calcola un peso per una mossa di presa (classica)
function calcolaPunteggioPresaIAClassica(card, captureSet) {
    let score = 100; // Baseline di 100 punti per garantire che qualsiasi presa sia preferita a qualsiasi scarto
    
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

// Calcola un peso per lo scarto classica (cerca di scartare la carta meno pericolosa)
function calcolaPunteggioScartoIAClassica(card) {
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

// === FUNZIONI DI ANNULLA (UNDO) ===
function clonaCarta(c) {
    if (!c) return null;
    const nuova = new Carta(c.suit, c.number);
    nuova.id = c.id;
    return nuova;
}

function clonaListaCarte(lista) {
    if (!lista) return [];
    return lista.map(c => clonaCarta(c));
}

function clonaMani(maniOriginali) {
    if (!maniOriginali) return [[], [], [], []];
    return maniOriginali.map(mano => clonaListaCarte(mano));
}

function salvaStatoCronologia() {
    const snapshot = {
        mani: clonaMani(mani),
        carteTavolo: clonaListaCarte(carteTavolo),
        cartePreseTu: clonaListaCarte(cartePreseTu),
        cartePresePC: clonaListaCarte(cartePresePC),
        scopeRoundTu: scopeRoundTu,
        scopeRoundPC: scopeRoundPC,
        mazzo: clonaListaCarte(mazzo),
        ultimoCatturato: ultimoCatturato,
        giocatoreAttivo: giocatoreAttivo,
        mazziere: mazziere,
        chiIniziaQuestoRound: chiIniziaQuestoRound,
        notificaCarteTuFatta: notificaCarteTuFatta,
        notificaCartePCFatta: notificaCartePCFatta,
        notificaQuadriTuFatta: notificaQuadriTuFatta,
        notificaQuadriPCFatta: notificaQuadriPCFatta
    };
    cronologiaMosse.push(snapshot);
    aggiornaStatoUndoUI();
}

function eseguiUndo() {
    if (statoGioco === 'finito' || statoGioco === 'inizio') {
        return;
    }
    if (cronologiaMosse.length === 0) {
        return;
    }
    
    // Ferma tutti i timeout attivi del gioco (incluso il gioco automatico del computer e animazioni)
    clearAllGameTimeouts();
    if (timerMossaGiocatore) {
        timerMossaGiocatore = null;
    }
    
    // Ripristina l'ultimo snapshot salvato
    const snapshot = cronologiaMosse.pop();
    
    // Ripristina le variabili di stato globale
    mani = clonaMani(snapshot.mani);
    carteTavolo = clonaListaCarte(snapshot.carteTavolo);
    cartePreseTu = clonaListaCarte(snapshot.cartePreseTu);
    cartePresePC = clonaListaCarte(snapshot.cartePresePC);
    scopeRoundTu = snapshot.scopeRoundTu;
    scopeRoundPC = snapshot.scopeRoundPC;
    mazzo = clonaListaCarte(snapshot.mazzo);
    ultimoCatturato = snapshot.ultimoCatturato;
    giocatoreAttivo = snapshot.giocatoreAttivo;
    mazziere = snapshot.mazziere;
    chiIniziaQuestoRound = snapshot.chiIniziaQuestoRound;
    notificaCarteTuFatta = snapshot.notificaCarteTuFatta;
    notificaCartePCFatta = snapshot.notificaCartePCFatta;
    notificaQuadriTuFatta = snapshot.notificaQuadriTuFatta;
    notificaQuadriPCFatta = snapshot.notificaQuadriPCFatta;
    
    // Imposta lo stato del gioco come turno giocatore
    statoGioco = 'turno-giocatore';
    
    // Pulisci selezioni ed evidenziazioni correnti
    deselezionaTutto();
    
    // Rinfresca l'interfaccia eliminando le notifiche DOM fluttuanti o carte volanti
    document.querySelectorAll('.punti-floating, .notifica-scopa, .notifica-settebello, .notifica-punto-sicuro, .carta-volante').forEach(el => el.remove());
    const nc = document.getElementById('notifiche-centro');
    if (nc) nc.remove();
    
    // Re-renderizza tutto
    renderManoGiocatore();
    renderManoAvversario(2, 'carte-computer');
    if (modalitaGioco === '4P') {
        renderManoAvversario(1, 'carte-sinistra');
        renderManoAvversario(3, 'carte-destra');
    }
    renderTavolo();
    aggiornaInterfacciaPrese();
    
    const mazzoCountEl = document.getElementById('mazzo-count');
    if (mazzoCountEl) {
        mazzoCountEl.textContent = mazzo.length;
    }
    const mazzoBlocco = document.getElementById('mazzo-blocco');
    if (mazzoBlocco) {
        mazzoBlocco.style.display = (mazzo.length === 0) ? 'none' : 'block';
    }
    
    if (typeof aggiornaDettaglioProgressivo === 'function') {
        aggiornaDettaglioProgressivo();
    }
    aggiornaMazziereUI();
    aggiornaGiocatoreAttivoUI();
    aggiornaMessaggioStato("Mossa annullata! È di nuovo il tuo turno.");
    
    // Riproduci un effetto sonoro per l'undo
    riproduciAudio("sounds/scala40/cardplace1.mp3");
}

function aggiornaStatoUndoUI() {
    const btnUndo = document.getElementById('btn-undo');
    if (!btnUndo) return;
    
    const abilitato = (statoGioco !== 'finito' && statoGioco !== 'inizio' && cronologiaMosse.length > 0 && !confirmModalOpen);
    
    if (abilitato) {
        btnUndo.style.opacity = '1';
        btnUndo.style.cursor = 'pointer';
        btnUndo.style.pointerEvents = 'auto';
    } else {
        btnUndo.style.opacity = '0.4';
        btnUndo.style.cursor = 'not-allowed';
        btnUndo.style.pointerEvents = 'none';
    }
}

// === FUNZIONE UTILITY PER ANIMAZIONE ===
function ottieniCoordinateElemento(el) {
    if (!el) return { x: 0, y: 0, id: '', evidenziata: false };
    const scale = window.gameScale || 1;
    const cg = document.getElementById('campogioco');
    if (!cg) return { x: 0, y: 0, id: '', evidenziata: false };
    const cgRect = cg.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
        x: (rect.left - cgRect.left) / scale,
        y: (rect.top - cgRect.top) / scale,
        id: el.id,
        evidenziata: el.classList.contains('evidenziata-presa') || el.classList.contains('selezionata')
    };
}

function animaCarta(card, startEl, endEl, callback) {
    if (!startEl || !endEl) {
        if (callback) callback();
        return;
    }
    
    const scale = window.gameScale || 1;
    const cg = document.getElementById('campogioco');
    
    let startX, startY;
    if (startEl && typeof startEl.x === 'number') {
        startX = startEl.x;
        startY = startEl.y;
    } else if (startEl && typeof startEl.getBoundingClientRect === 'function') {
        const cgRect = cg.getBoundingClientRect();
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
        const cgRect = cg.getBoundingClientRect();
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
    
    // Configura aspetto e scala iniziale in modo che corrispondano perfettamente allo stato selezionato/evidenziato
    if (startEl && startEl.evidenziata) {
        flying.style.boxShadow = '0 0 25px #ffd700, 0 0 10px #ff0000, inset 0 0 0 3px #ffd700';
        
        const startId = startEl.id || '';
        if (startId.includes('card-player-1-')) {
            flying.style.transform = 'rotate(90deg) scale(1.1)';
        } else if (startId.includes('card-player-3-')) {
            flying.style.transform = 'rotate(-90deg) scale(1.1)';
        } else {
            flying.style.transform = 'scale(1.1)';
        }
    } else {
        // Se non evidenziata ma avversario laterale, mantieni comunque la rotazione iniziale
        const startId = startEl.id || '';
        if (startId.includes('card-player-1-')) {
            flying.style.transform = 'rotate(90deg) scale(1.0)';
        } else if (startId.includes('card-player-3-')) {
            flying.style.transform = 'rotate(-90deg) scale(1.0)';
        }
    }
    
    cg.appendChild(flying);
    
    // Forza reflow
    flying.offsetHeight;
    
    // Applica coordinate di arrivo
    flying.style.left = `${endX}px`;
    flying.style.top = `${endY}px`;
    
    // Ripristina l'ombra predefinita per la carta in volo (sfuma il bagliore dorato)
    flying.style.boxShadow = '';
    
    // Applica rotazione se vola alla pila delle prese avversarie a 4P, altrimenti nessuna scala
    const endId = endEl.id || '';
    if (endId.includes('presa')) {
        if (endId === 'presa-computer' && modalitaGioco === '4P') {
            flying.style.transform = 'rotate(90deg)';
        } else {
            flying.style.transform = 'none';
        }
    } else {
        flying.style.transform = 'none';
    }
    
    setTimeout(() => {
        flying.remove();
        if (callback) callback();
    }, 480);
}

// === GESTIONE MODALE SELEZIONE MAZZO (Francesi, Napoletane, Bresciane) ===
function apriModaleMazzo() {
    if (variante === 'bresciana') return;
    const modaleMazzo = document.getElementById('modale-mazzo');
    const schermo = document.getElementById('schermo');
    const temaCorrente = localStorage.getItem('scopa-deck-theme') || 'francesi';
    
    if (document.getElementById('btn-mazzo-francesi')) {
        document.getElementById('btn-mazzo-francesi').classList.toggle('attiva', temaCorrente === 'francesi');
    }
    if (document.getElementById('btn-mazzo-napoletane')) {
        document.getElementById('btn-mazzo-napoletane').classList.toggle('attiva', temaCorrente === 'napoletane');
    }
    if (document.getElementById('btn-mazzo-bresciane')) {
        document.getElementById('btn-mazzo-bresciane').classList.toggle('attiva', temaCorrente === 'bresciane');
    }
    
    if (modaleMazzo && schermo) {
        modaleMazzo.style.display = 'flex';
        schermo.style.display = 'block';
    }
}
window.apriModaleMazzo = apriModaleMazzo;

function chiudiModaleMazzo() {
    const modaleMazzo = document.getElementById('modale-mazzo');
    const schermo = document.getElementById('schermo');
    if (modaleMazzo) {
        modaleMazzo.style.display = 'none';
        
        // Chiudiamo lo schermo solo se non ci sono altre modali attive
        const inizio = document.getElementById('modale-inizio');
        const punteggi = document.getElementById('modale-punteggi');
        const termina = document.getElementById('confermatermina');
        
        const inizioDisplay = inizio ? window.getComputedStyle(inizio).display : 'none';
        const punteggiDisplay = punteggi ? window.getComputedStyle(punteggi).display : 'none';
        const terminaDisplay = termina ? window.getComputedStyle(termina).display : 'none';
        
        if (inizioDisplay === 'none' && punteggiDisplay === 'none' && terminaDisplay === 'none' && schermo) {
            schermo.style.display = 'none';
        }
    }
}
window.chiudiModaleMazzo = chiudiModaleMazzo;

function selezionaMazzo(tema) {
    const campogioco = document.getElementById('campogioco');
    if (campogioco) {
        campogioco.classList.remove('napoletane', 'bresciane');
        if (tema !== 'francesi') {
            campogioco.classList.add(tema);
        }
    }
    localStorage.setItem('scopa-deck-theme', tema);
    tempMazzo = tema;
    if (variante !== 'bresciana') {
        ultimoMazzoScelto = tema;
    }
    aggiornaTestoBottoneMazzo(tema);
    
    // Rinfresca il rendering di tutte le carte attive per caricare la nuova immagine
    if (typeof renderManoGiocatore === 'function') renderManoGiocatore();
    if (typeof renderManoAvversario === 'function') {
        renderManoAvversario(2, 'carte-computer');
        if (modalitaGioco === '4P') {
            renderManoAvversario(1, 'carte-sinistra');
            renderManoAvversario(3, 'carte-destra');
        }
    }
    if (typeof renderTavolo === 'function') renderTavolo();
    
    chiudiModaleMazzo();
}
window.selezionaMazzo = selezionaMazzo;

function aggiornaTestoBottoneMazzo(tema) {
    const btnMazzo = document.getElementById('btn-mazzo');
    if (!btnMazzo) return;
    
    const isEn = (window.currentLang === 'en');
    if (tema === 'francesi') {
        btnMazzo.textContent = isEn ? "Deck: French" : "Mazzo: Francesi";
    } else if (tema === 'napoletane') {
        btnMazzo.textContent = isEn ? "Deck: Neapolitan" : "Mazzo: Napoletane";
    } else if (tema === 'bresciane') {
        btnMazzo.textContent = isEn ? "Deck: Brescian" : "Mazzo: Bresciane";
    }
}
window.aggiornaTestoBottoneMazzo = aggiornaTestoBottoneMazzo;
