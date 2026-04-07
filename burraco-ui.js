// ============================================================================
// BURRACO - Gioco di carte italiano
// FILE: burraco-ui.js
// Rendering, animazioni, eventi, modali, diagnostica
// Richiede: burraco-core.js, burraco-game.js
// ============================================================================

// ============================================================================
// ###COEFFICIENTI### — Scoring opzioni AI (modificabili anche dal pannello debug)
// ============================================================================
if (!window.coeffScoreOpz) {
    window.coeffScoreOpz = {
        valCarte:          0.5,
        premioTris:        10,
        premioScala:       20,
        premioTrisEstremo:  5,
        premio4c:          10,
        premio5c:          20,
        premio6c:          40,
        premioBurraco:    100,
        premioOltreBurraco: 0,
        penMattaBase:      15,
        coeffScartoDecent:  3,
        coeffScartoConn:    4,
        penScarto6c:       25,
        penScarto5c:       15,
        penScarto4c:        7,
        penScartoCalabile:  7,
        premioLiberaMattaInterna: 15,
        premioLiberaMattaBordo:   10,
        premioMattaSolitaria:    200,
        penCalataMatta:           20,
        premioPrimoBurraco:       50,
        premioMazzo:               5,
        penCartaOrfana:            2,
        // Bonus D) "carta sottratta all'avversario" — scala separata da premioXc
        bonusAvv4c:               10,
        bonusAvv5c:               20,
        bonusAvv6c:               40,
        bonusAvv7c:              100,
        bonusAvv8c:                0,
        // Premio per svuotare la mano in fase pre-pozzetto
        premioPozzetto:          100
    };
}
// ============================================================================

// ============================================================================
// I18N - Internazionalizzazione (Logica UI)
// ============================================================================

window.setLanguage = function(lang) {
    console.log('setLanguage called with:', lang);
    window.currentLang = lang;
    localStorage.setItem('userLanguage', lang);
    window.updateUILabels();
    
    // Aggiorna bottoni switcher
    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.4)';
        btn.style.borderColor = '#6b9b7a';
        btn.style.color = '#fff';
    });
    const activeBtn = document.getElementById('btn-lang-' + lang);
    if (activeBtn) {
        activeBtn.style.background = '#ffd700';
        activeBtn.style.borderColor = '#ffd700';
        activeBtn.style.color = '#2c3e50';
    }
    
    // Rendi nuovamente (per aggiornare scritte dinamiche come "Carte: X")
    // Solo se il gioco è già inizializzato
    if (typeof render === 'function' && game && game.fase && game.fase !== 'attesa') {
        render();
    }
}

window.updateUILabels = function() {
    console.log('updateUILabels called, currentLang:', window.currentLang);
    const labels = [
        'label-noi', 'label-loro', 'label-scarti', 'label-giocatore',
        'modal-nuova-titolo', 'label-modalita', 'label-compagno-desc',
        'label-tipo-partita', 'label-mano-singola', 'label-partita-punti',
        'label-limite-custom', 'label-limite-pers', 'btn-inizia',
        'modal-vittoria-titolo', 'label-complimenti', 'label-punteggio-finale-v',
        'label-punteggio-finale-p', 'modal-sconfitta-titolo', 'label-peccato',
        'btn-nuova-v', 'btn-nuova-s', 'label-privacy', 'label-gestisci-cookie',
        'label-1v1', 'label-2v2'
    ];
    
    labels.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let key = id;
            if (id === 'label-punteggio-finale-v' || id === 'label-punteggio-finale-p') key = 'label-punteggio-finale';
            if (id === 'btn-nuova-v' || id === 'btn-nuova-s') key = 'btn-nuova-partita';
            
            // Per note con HTML (br), usa innerHTML
            if (id === 'label-scarti-nota') {
                el.innerHTML = window.t('msg-scarti-nota');
            } else {
                el.textContent = window.t(key);
            }
        }
    });

    // Aggiungi label-scarti-nota alla lista delle etichette (se non c'è già)
    const extraLabels = ['label-scarti-nota'];
    extraLabels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = window.t('msg-scarti-nota');
    });
    
    const btnIstr = document.getElementById('btn-istruzioni');
    if (btnIstr) btnIstr.textContent = window.t('btn-istruzioni');
    
    const btnNuova = document.getElementById('btn-nuova');
    if (btnNuova) btnNuova.textContent = window.t('btn-nuova');
    
    const btnScoperte = document.getElementById('btn-scoperte');
    if (btnScoperte) btnScoperte.textContent = window.t('btn-scoperte');

    const pozzettoNoi = document.getElementById('label-pozzetto-noi');
    if (pozzettoNoi) {
        const val = pozzettoNoi.textContent.split(': ')[1] || '-100';
        pozzettoNoi.textContent = window.t('label-pozzetto') + ': ' + val;
    }
    const pozzettoLoro = document.getElementById('label-pozzetto-loro');
    if (pozzettoLoro) {
        const val = pozzettoLoro.textContent.split(': ')[1] || '-100';
        pozzettoLoro.textContent = window.t('label-pozzetto') + ': ' + val;
    }
}

// Check language on load
window.addEventListener('load', () => {
    // solo layout/analytics, lingua e init già gestiti su DOMContentLoaded
});

// SETUP EVENTI
// ============================================================================

function setupEventi() {
    // Pulsanti
    $('#btn-istruzioni').addEventListener('click', () => {
        const rulesUrl = window.currentLang === 'en' ? 'regole-burraco-en.html' : 'regole-burraco.html';
        window.open(rulesUrl, '_blank');
    });
    $('#btn-nuova').addEventListener('click', () => mostraModal('modal-nuova'));
    $('#btn-undo').addEventListener('click', undo);

    // Mostra/nasconde input limite custom nel modal nuova partita
    var selLimite = document.getElementById('sel-limite-torneo');
    var divCustom = document.getElementById('div-limite-custom');
    if (selLimite && divCustom) {
        selLimite.addEventListener('change', function () {
            divCustom.style.display = this.value === 'custom' ? '' : 'none';
        });
    }
    $('#btn-scoperte').addEventListener('click', toggleScoperte);
    $('#btn-ordina-numero').addEventListener('click', ordinaPerNumero);
    $('#btn-ordina-seme').addEventListener('click', ordinaPerSeme);

    // Scorciatoie di Debug per Import/Export Stato (Seed) della Partita su disco fisico
    document.addEventListener('keydown', (e) => {
        // CTRL+ALT+I: Scarica lo snapshot INIZIALE (come erano le carte a inizio partita)
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            if (window.burraco_seed_snapshot) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.burraco_seed_snapshot, null, 2));
                const nomeData = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "burraco_inizio_" + nomeData + ".json");
                dlAnchorElem.click();
                console.log("Salvataggio snapshot INIZIALE avviato.");
            } else {
                console.warn("Nessun snapshot iniziale disponibile. Inizia una partita prima.");
            }
        }

        // CTRL+ALT+A: Scarica lo snapshot ATTUALE (stato corrente del gioco)
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (typeof creaSnapshot === 'function' && game.fase !== 'attesa') {
                const snapAttuale = creaSnapshot();
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapAttuale, null, 2));
                const nomeData = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "burraco_attuale_" + nomeData + ".json");
                dlAnchorElem.click();
                console.log("Salvataggio snapshot ATTUALE avviato (turno " + game.turno + ", fase " + game.fase + ").");
            } else {
                console.warn("Nessuna partita in corso da salvare.");
            }
        }

        // CTRL+ALT+B: Carica (Scegli) un file .json dal computer e ripristina quel seed!
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            const inputElement = document.createElement("input");
            inputElement.type = "file";
            inputElement.accept = ".json";
            inputElement.addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (onloadEvent) => {
                    try {
                        const parsedJson = JSON.parse(onloadEvent.target.result);
                        ripristinaSnapshot(parsedJson);
                        render();
                        if (typeof aggiornaIndicatoreTurno === 'function') aggiornaIndicatoreTurno();
                        console.log("🛠️ Partita caricata e ripristinata dal file: " + file.name);
                    } catch (err) {
                        console.error("Errore nel parser o nel ripristino di quel Log / Seed Burraco:", err);
                        alert("File non valido o corrotto!");
                    }
                };
                reader.readAsText(file);
            });
            inputElement.click(); // apre la modale di Windows per selezionare il json
        }
    });

    // Modal
    $$('.btn-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            chiudiModals();
        });
    });

    $('#btn-inizia').addEventListener('click', function () {
        // Salva modalita scelta e ricarica pagina per rinfrescare AdSense
        var modalita = '2v2';
        var radio = document.querySelector('input[name="modalita"]:checked');
        if (radio) modalita = radio.value;

        // Tipo partita: singola o torneo
        var tipoPartita = 'singola';
        var radioTipo = document.querySelector('input[name="tipo-partita"]:checked');
        if (radioTipo) tipoPartita = radioTipo.value;

        var limiteTorneo = null;
        var limiteSelVal = null;
        if (tipoPartita === 'torneo') {
            var sel = document.getElementById('sel-limite-torneo');
            limiteSelVal = sel.value;
            if (limiteSelVal === 'custom') {
                limiteTorneo = parseInt(document.getElementById('inp-limite-custom').value) || 1505;
            } else {
                limiteTorneo = parseInt(limiteSelVal);
            }
        }

        // Salva preferenze per la prossima apertura del modale
        try {
            localStorage.setItem('burraco_prefs', JSON.stringify({
                tipoPartita: tipoPartita,
                limiteSelVal: limiteSelVal,
                limiteCustom: tipoPartita === 'torneo' && limiteSelVal === 'custom'
                    ? parseInt(document.getElementById('inp-limite-custom').value) || 1505
                    : null
            }));
        } catch (e) { }

        try {
            localStorage.setItem('burraco_nuova', modalita);
            if (tipoPartita === 'torneo') {
                // Nuova partita: sempre torneo fresco da zero
                localStorage.setItem('burraco_torneo', JSON.stringify({
                    limite: limiteTorneo, totNoi: 0, totLoro: 0, mano: 1
                }));
            } else {
                localStorage.removeItem('burraco_torneo');
            }
        } catch (e) { }
        location.reload();
    });

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

    // Scarti: scarta la carta selezionata (se una sola), altrimenti pesca dagli scarti
    $('#scarti-container').addEventListener('click', function () {
        if (game.carteSelezionate.length === 1 && game.fase === 'gioco' && game.haPescato) {
            scartaCarta(game.carteSelezionate[0]);
        } else {
            pescaDaScarti();
        }
    });

    // Aree combinazioni (entrambe funzionano per depositare, in caso di overflow)
    $('#combinazioni-noi').addEventListener('click', depositaCombinazione);
    $('#combinazioni-loro').addEventListener('click', depositaCombinazione);

    // DEBUG: click su pozzetto1 aggiunge carta a ogni giocatore
    $('#pozzetto1').addEventListener('click', testAggiungiCarta);

    // Click su avatar per aprire finestra info giocatore
    $('#avatar-compagno').addEventListener('click', () => mostraPannelloGiocatore(2, 'Compagno'));
    $('#avatar-avv-sx').addEventListener('click', () => mostraPannelloGiocatore(1, 'Avversario SX'));
    $('#avatar-avv-dx').addEventListener('click', () => mostraPannelloGiocatore(3, 'Avversario DX'));

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
    aggiornaDealerBadge();
}

function renderMazzo() {
    const mazzoEl = $('#mazzo');

    // Aggiorna contatore mazzo
    const mazzoInfo = $('#mazzo-info');
    if (mazzoInfo) {
        const countEl = mazzoInfo.querySelector('.mazzo-count');
        if (countEl) countEl.textContent = game.mazzo.length;
    }

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
    const nota = container.querySelector('#scarti-nota');
    container.innerHTML = '';

    // Aggiorna indicatore scarti (stesso stile di Noi/Loro)
    const scartiInfo = $('#scarti-info');
    if (scartiInfo) {
        const numScarti = game.scarti.length;
        const puntiScarti = game.scarti.reduce((sum, c) => sum + (c.punti || 0), 0);
        const numEl = scartiInfo.querySelector('.punti-numero');
        const valEl = scartiInfo.querySelector('.punti-valore');
        if (numEl) numEl.textContent = `${t('label-carte')}: ${numScarti}`;
        if (valEl) valEl.textContent = `${t('label-totale')}: ${puntiScarti}`;
    }

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
    if (nota) container.appendChild(nota);
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
        renderAvatar('#avatar-compagno', game.giocatori[2]);

        // Avversario sinistra
        renderManoAvversario(game.giocatori[1], '#carte-avv-sx', '#ncarte-avv-sx');
        $('#nome-avv-sx').textContent = game.giocatori[1].nome;
        renderAvatar('#avatar-avv-sx', game.giocatori[1]);

        // Avversario destra
        renderManoAvversario(game.giocatori[3], '#carte-avv-dx', '#ncarte-avv-dx');
        $('#nome-avv-dx').textContent = game.giocatori[3].nome;
        renderAvatar('#avatar-avv-dx', game.giocatori[3]);
    } else {
        // 1v1 - solo avversario in alto
        renderManoAvversario(game.giocatori[1], '#carte-avv-sx', '#ncarte-avv-sx');
        $('#nome-avv-sx').textContent = game.giocatori[1].nome;
        renderAvatar('#avatar-avv-sx', game.giocatori[1]);
    }
}

function renderAvatar(selector, giocatore) {
    const avatarEl = $(selector);
    if (avatarEl && giocatore && giocatore.personaggio) {
        avatarEl.src = `images/avatar/${giocatore.personaggio.nome}.jpg`;
        avatarEl.alt = giocatore.personaggio.nome;
    }
}

function renderManoGiocatore(giocatore, containerSel) {
    const container = $(containerSel);
    container.innerHTML = '';

    // Aggiorna indicatore carte (stesso stile di Scarti)
    const giocatoreInfo = $('#giocatore-info');
    if (giocatoreInfo) {
        const numCarte = giocatore.carte.length;
        const puntiMano = giocatore.carte.reduce((sum, c) => sum + (c.punti || 0), 0);
        const numEl = giocatoreInfo.querySelector('.punti-numero');
        const valEl = giocatoreInfo.querySelector('.punti-valore');
        if (numEl) numEl.textContent = `${t('label-carte')}: ${numCarte}`;
        if (valEl) valEl.textContent = `${t('label-totale')}: ${puntiMano}`;
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
        // Non mostrare i punti degli avversari/compagno (informazione nascosta)
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

    // Calcola punti
    let puntiBurraco = 0;
    let puntiCarte = 0;
    for (const comb of combinazioni) {
        puntiBurraco += comb.puntiBurraco || 0;
        puntiCarte += comb.puntiCarte || 0;
    }

    // Verifica pozzetto
    const isNoi = containerSel.includes('noi');
    const squadra = isNoi ? 0 : 1;
    const giocatoriSquadra = game.giocatori.filter(g => g.squadra === squadra);
    const haPozzetto = giocatoriSquadra.some(g => g.haPozzetto);

    // Pozzetto: -100 se non preso, 0 se preso
    const puntiPozzetto = haPozzetto ? 0 : -100;
    const totale = puntiBurraco + puntiCarte + puntiPozzetto;

    // Aggiorna display punti nel titolo
    if (titolo) {
        const puntiBurracoEl = titolo.querySelector('.punti-burraco');
        const puntiCarteEl = titolo.querySelector('.punti-carte');
        const puntiPozzettoEl = titolo.querySelector('.punti-pozzetto');
        const puntiTotaleEl = titolo.querySelector('.punti-totale');

        const haBurraco = combinazioni.some(c => c.isBurraco);
        if (puntiBurracoEl) {
            puntiBurracoEl.textContent = `${t('label-burraco')}: ${puntiBurraco}`;
            puntiBurracoEl.classList.toggle('raggiunto', haBurraco);
        }
        if (puntiCarteEl) {
            puntiCarteEl.textContent = `${t('label-carte')}: ${puntiCarte}`;
            puntiCarteEl.classList.toggle('negativo', puntiCarte < 0);
        }
        if (puntiPozzettoEl) {
            puntiPozzettoEl.textContent = `${t('label-pozzetto')}: ${puntiPozzetto}`;
            puntiPozzettoEl.classList.toggle('raggiunto', haPozzetto);
        }
        if (puntiTotaleEl) {
            puntiTotaleEl.textContent = `= ${totale}`;
            puntiTotaleEl.classList.toggle('negativo', totale < 0);
        }
    }

    for (const comb of combinazioni) {
        const combEl = document.createElement('div');
        combEl.className = 'combinazione';

        if (comb.isBurraco) {
            // Usa il nuovo sistema a 3 livelli
            if (comb.isPulito) combEl.classList.add('burraco-pulito');
            else if (comb.isSemipulito) combEl.classList.add('burraco-semipulito');
            else combEl.classList.add('burraco-sporco');
        }

        // Per le scale, visualizza in ordine discendente (dal valore piu' alto al piu' basso)
        let carteOrdinare = comb.carte;
        if (comb.tipo === TIPO_SCALA) {
            // Ricava il valore di ogni carta (incluse matte con jollycomeNumero null)
            const _val = (c) => {
                let v = isCartaMatta(c) ? c.jollycomeNumero : c.numero;
                if (v === null || v === undefined) {
                    // Jolly senza jollycomeNumero: ricava il buco dalla sequenza
                    const valNormali = comb.carte
                        .filter(x => x !== c)
                        .map(x => {
                            let n = isCartaMatta(x) ? (x.jollycomeNumero ?? 0) : x.numero;
                            if (comb.assoAlto && n === 1) n = 14;
                            return n;
                        })
                        .filter(n => n > 0)
                        .sort((a, b) => a - b);
                    // Trova il primo intero mancante nella sequenza
                    for (let i = 0; i < valNormali.length - 1; i++) {
                        if (valNormali[i + 1] - valNormali[i] > 1) { v = valNormali[i] + 1; break; }
                    }
                    if (v === null || v === undefined) v = 0;
                }
                if (comb.assoAlto && v === 1) v = 14;
                return v;
            };
            carteOrdinare = [...comb.carte].sort((a, b) => _val(b) - _val(a)); // Discendente
        }

        for (const carta of carteOrdinare) {
            // Le carte in campo sono sempre scoperte
            carta.faceUp = true;
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

    // Comprimi combinazioni se debordano orizzontalmente
    comprimiCombinazioni(container, containerSel);
}

function comprimiCombinazioni(container, containerSel) {
    const combElements = container.querySelectorAll('.combinazione');
    if (combElements.length === 0) return;

    var isLoro = containerSel.includes('loro');
    var marginProp = isLoro ? 'marginLeft' : 'marginRight';

    // Reset margini e z-index precedenti
    for (var i = 0; i < combElements.length; i++) {
        combElements[i].style[marginProp] = '';
        combElements[i].style.zIndex = '';
    }

    // Per "loro" (row-reverse): le prime nel DOM sono a destra,
    // devono stare sopra (z-index decrescente)
    if (isLoro) {
        for (var i = 0; i < combElements.length; i++) {
            combElements[i].style.zIndex = combElements.length - i;
        }
    }

    if (combElements.length <= 1) return;

    // Larghezza disponibile (meno padding)
    var containerWidth = container.clientWidth - 10;

    // Larghezza visuale di ogni combinazione: carta scalata a 0.73
    var cartaWidth = Math.round(71 * 0.73); // 52px
    var sommaLarghezze = 0;
    for (var i = 0; i < combElements.length; i++) {
        sommaLarghezze += cartaWidth + 2; // +2 per padding combinazione
    }

    if (sommaLarghezze > containerWidth) {
        // Calcola il margine negativo necessario distribuito su n-1 gap
        var eccesso = sommaLarghezze - containerWidth;
        var margineNeg = -Math.ceil(eccesso / (combElements.length - 1));
        for (var i = 0; i < combElements.length - 1; i++) {
            combElements[i].style[marginProp] = margineNeg + 'px';
        }
    }
}

function renderPunteggi() {
    // Pannello torneo: visibile solo in modalita torneo
    const pannello = $('#pannello-torneo');
    if (pannello) pannello.style.display = game.torneo ? '' : 'none';

    const pNoi = game.torneo ? game.torneo.totNoi : 0;
    const pLoro = game.torneo ? game.torneo.totLoro : 0;
    const verde = 'rgb(58,255,88)', rosso = 'rgb(255,52,52)';
    $('#punti-noi').textContent = pNoi;
    $('#punti-loro').textContent = pLoro;
    $('#punti-noi').style.color = pNoi >= pLoro ? verde : rosso;
    $('#punti-loro').style.color = pLoro >= pNoi ? verde : rosso;

    // Scritta limite torneo
    const torneoInfo = $('#torneo-info');
    if (torneoInfo && game.torneo) {
        torneoInfo.textContent = t('info-torneo')
            .replace('{limite}', game.torneo.limite)
            .replace('{mano}', game.torneo.mano);
    }

    // Barra punteggi: usa il punteggio corrente della mano (come punti-totale)
    const _calcTot = (combs, squadra) => {
        let pb = 0, pc = 0;
        for (const c of combs) { pb += c.puntiBurraco || 0; pc += c.puntiCarte || 0; }
        const haPoz = game.giocatori.filter(g => g.squadra === squadra).some(g => g.haPozzetto);
        return pb + pc + (haPoz ? 0 : -100);
    };
    const scoreNoi = _calcTot(game.combinazioniNoi, 0);
    const scoreLoro = _calcTot(game.combinazioniLoro, 1);
    const diff = scoreNoi - scoreLoro;
    const pctNoi = Math.max(5, Math.min(95, 50 + diff / 500 * 50));
    const pctLoro = 100 - pctNoi;
    const bNoi = $('#barra-noi'), bLoro = $('#barra-loro');
    if (bNoi) { bNoi.style.width = pctNoi + '%'; bNoi.style.backgroundColor = diff >= 0 ? verde : rosso; }
    if (bLoro) { bLoro.style.width = pctLoro + '%'; bLoro.style.backgroundColor = diff <= 0 ? verde : rosso; }
}

function renderUndoButton() {
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
// DEALER BADGE
// ============================================================================

function aggiornaDealerBadge() {
    ['dealer-badge-bottom', 'dealer-badge-top', 'dealer-badge-left', 'dealer-badge-right'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (game.mazziere === undefined || !game.giocatori || !game.giocatori[game.mazziere]) return;

    var pos = game.giocatori[game.mazziere].posizione;
    var badgeId = { 'bottom': 'dealer-badge-bottom', 'top': 'dealer-badge-top', 'left': 'dealer-badge-left', 'right': 'dealer-badge-right' }[pos];
    if (!badgeId) return;
    var badge = document.getElementById(badgeId);
    if (!badge) return;

    badge.textContent = window.t('label-mazziere');

    // Calcola scale factor del campogioco (coordinate virtuali 1024×750)
    var campo = document.getElementById('campogioco');
    if (!campo) { badge.style.display = ''; return; }
    var campoR = campo.getBoundingClientRect();
    var scale = campoR.width / 1024;

    badge.style.left = 'auto';
    badge.style.right = 'auto';
    badge.style.top = 'auto';
    badge.style.bottom = 'auto';

    if (pos === 'bottom') {
        // Affianca #giocatore-info a destra, allineato verticalmente
        var info = document.getElementById('giocatore-info');
        if (info) {
            var r = info.getBoundingClientRect();
            if (r.width > 0) {
                badge.style.left   = ((r.right  - campoR.left) / scale + 8) + 'px';
                badge.style.bottom = ((campoR.bottom - r.bottom) / scale) + 'px';
            }
        }
    } else {
        // Posiziona sotto il nome del giocatore AI
        var nameMap = { 'top': 'nome-compagno', 'left': 'nome-avv-sx', 'right': 'nome-avv-dx' };
        var nameEl = document.getElementById(nameMap[pos]);
        if (nameEl) {
            var r = nameEl.getBoundingClientRect();
            if (r.width > 0) {
                badge.style.left = ((r.left - campoR.left) / scale) + 'px';
                badge.style.top  = ((r.bottom - campoR.top) / scale + 3) + 'px';
            }
        }
    }

    badge.style.display = '';
}

function _mostraToastMazziere(onComplete) {
    var nomeMazziere = (game.mazziere !== undefined && game.giocatori[game.mazziere])
        ? game.giocatori[game.mazziere].nome
        : '?';

    var toast = document.createElement('div');
    toast.textContent = window.t('label-mazziere-e') + ' ' + nomeMazziere;
    toast.style.cssText = [
        'position:absolute',
        'top:50%',
        'left:50%',
        'transform:translate(-50%,-50%)',
        'background:rgba(0,0,0,0.78)',
        'color:#ffd700',
        'font-size:22px',
        'font-weight:bold',
        'padding:18px 36px',
        'border-radius:10px',
        'border:2px solid #c06020',
        'z-index:99999',
        'pointer-events:none',
        'text-align:center',
        'white-space:nowrap'
    ].join(';');

    var campo = document.getElementById('campogioco');
    if (campo) campo.appendChild(toast);

    setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        if (onComplete) onComplete();
    }, 1200);
}

// ============================================================================
// ANIMAZIONE DISTRIBUZIONE
// ============================================================================

function _animaVoloDeal(fromR, toR, duration, callback) {
    const el = document.createElement('div');
    el.className = 'carta coperta mazzo-0';
    el.style.position = 'fixed';
    el.style.left = fromR.left + 'px';
    el.style.top = fromR.top + 'px';
    el.style.width = '71px';
    el.style.height = '96px';
    el.style.transform = 'scale(0.73)';
    el.style.transformOrigin = 'top left';
    el.style.zIndex = '10000';
    el.style.pointerEvents = 'none';
    el.style.boxShadow = '3px 3px 8px rgba(0,0,0,0.4)';
    el.style.transition = 'left ' + duration + 'ms ease-out, top ' + duration + 'ms ease-out';
    document.body.appendChild(el);
    el.getBoundingClientRect(); // force reflow
    el.style.left = toR.left + 'px';
    el.style.top = toR.top + 'px';
    var done = false;
    function finish() { if (done) return; done = true; el.remove(); if (callback) callback(); }
    el.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, duration + 200);
}

function animaDealBurraco(onComplete) {
    const mazzoEl = document.getElementById('mazzo');
    if (!mazzoEl) { if (onComplete) onComplete(); return; }

    const containerMap = {
        'bottom': document.getElementById('carte-giocatore'),
        'top':    document.getElementById('carte-compagno'),
        'left':   document.getElementById('carte-avv-sx'),
        'right':  document.getElementById('carte-avv-dx')
    };

    const numGiocatori = game.giocatori.length;
    const numCarte = 11;
    const cardIndices = {};
    game.giocatori.forEach(function (_g, i) { cardIndices[i] = 0; });

    // Sequenza round-robin: prima il giocatore dopo il mazziere
    const sequence = [];
    for (let round = 0; round < numCarte; round++) {
        for (let i = 0; i < numGiocatori; i++) {
            const playerIdx = (game.mazziere + 1 + i) % numGiocatori;
            const container = containerMap[game.giocatori[playerIdx].posizione];
            if (!container) { cardIndices[playerIdx]++; continue; }
            const cardEls = Array.from(container.querySelectorAll('.carta'));
            const cardIdx = cardIndices[playerIdx];
            const cardEl = cardEls[cardIdx] || null;
            cardIndices[playerIdx]++;
            sequence.push({ cardEl: cardEl });
        }
    }

    // Cattura rects PRIMA di nascondere
    const rects = sequence.map(function (item) {
        return item.cardEl ? item.cardEl.getBoundingClientRect() : null;
    });

    // Nascondi tutte le carte
    Object.values(containerMap).forEach(function (c) {
        if (c) c.querySelectorAll('.carta').forEach(function (el) { el.style.visibility = 'hidden'; });
    });

    const total = sequence.length;
    if (total === 0) { if (onComplete) onComplete(); return; }

    const STAGGER = 45;
    const ANIM_DURATION = 280;
    let landed = 0;
    const mazzoR = mazzoEl.getBoundingClientRect();

    playSound('deal');

    function onLanded() {
        landed++;
        if (landed >= total) {
            if (game.suoni.deal) { game.suoni.deal.pause(); game.suoni.deal.currentTime = 0; }
            if (onComplete) onComplete();
        }
    }

    sequence.forEach(function (item, idx) {
        const toR = rects[idx];
        if (!item.cardEl || !toR) { setTimeout(onLanded, idx * STAGGER); return; }
        setTimeout(function () {
            _animaVoloDeal(mazzoR, toR, ANIM_DURATION, function () {
                item.cardEl.style.visibility = '';
                onLanded();
            });
        }, idx * STAGGER);
    });
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
    aggiornaIndicatoreTurno();
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

    // Controlla se il mazzo e' quasi esaurito
    controlloMazzoEsaurito();
}

function pescaDaScarti() {
    if (game.fase !== 'pesca') return;
    if (game.haPescato) return;
    if (!game.giocatori[game.giocatoreCorrente].isUmano) return;
    if (game.scarti.length === 0) return;

    salvaStato('pesca-scarti');
    game.combinazioneModificabile = null;

    // Se c'era una sola carta, quella non potrà essere scartata (regola burraco)
    game.cartaVietataScarto = game.scarti.length === 1 ? game.scarti[0].id : null;

    // Prendi tutte le carte dagli scarti
    const carteRaccolte = game.scarti.splice(0);
    for (const c of carteRaccolte) {
        c.faceUp = true;
        game.giocatori[0].carte.push(c);
    }

    // Aggiorna carteConosciute: tutti vedono cosa c'era negli scarti
    const giocatoreUmano = game.giocatori[0];
    if (giocatoreUmano.carteConosciute) {
        for (const c of carteRaccolte) {
            giocatoreUmano.carteConosciute.push({
                cartaId: c.id,
                turnoScoperta: game.turno
            });
        }
    }

    // Registra nella storia
    registraMossa(AZIONE_PESCA_SCARTI, { carte: carteRaccolte.map(c => c.id) });

    ordinaCarte(game.giocatori[0].carte);

    game.haPescato = true;
    game.fase = 'gioco';
    aggiornaIndicatoreTurno();

    playSound('dindon');
    render();
}

async function scartaCarta(carta) {
    if (game.fase !== 'gioco') {
        mostraMessaggio('Pescare prima di scartare', 'error');
        setTimeout(nascondiMessaggio, 2000);
        return;
    }
    if (!game.haPescato) {
        mostraMessaggio('Pescare prima di scartare', 'error');
        setTimeout(nascondiMessaggio, 2000);
        return;
    }

    // Rimuovi carta dalla mano
    const idx = game.giocatori[0].carte.indexOf(carta);
    if (idx === -1) return;

    // Regola: se pescato dagli scarti con una sola carta, quella non può essere scartata
    if (game.cartaVietataScarto !== null && game.cartaVietataScarto !== undefined && carta.id === game.cartaVietataScarto) {
        mostraMessaggio('Non puoi scartare la carta appena pescata dagli scarti', 'error');
        setTimeout(nascondiMessaggio, 2500);
        return;
    }

    // Se e' l'ultima carta e il pozzetto della squadra e' gia' stato preso, serve almeno un burraco per chiudere
    if (game.giocatori[0].carte.length === 1 && game.pozzetti[0].length === 0) {
        const haBurraco = game.combinazioniNoi.some(c => c.isBurraco);
        if (!haBurraco) {
            mostraMessaggio('Serve almeno un burraco per chiudere', 'error');
            setTimeout(nascondiMessaggio, 2000);
            return;
        }
    }

    salvaStato('scarta');

    // Rimuovi da carteConosciute (non e' piu' in mano)
    if (game.giocatori[0].carteConosciute) {
        game.giocatori[0].carteConosciute = game.giocatori[0].carteConosciute.filter(
            cc => cc.cartaId !== carta.id
        );
    }

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
        // Trova l'ultima carta negli scarti (escludendo la nota testuale)
        const scartiContainer = $('#scarti-container');
        const cards = scartiContainer.querySelectorAll('.scarto');
        const cartaElFinale = cards[cards.length - 1];

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

    // Se ultimo turno (mazzo esaurito), fine partita senza chiusura
    if (game.ultimoTurno) {
        finePartita(null);
        return;
    }

    // Passa al prossimo giocatore
    game.haPescato = false;
    game.cartaVietataScarto = null;
    game.fase = 'pesca';
    prossimoTurno();
}

function toggleSelezioneCarta(carta) {
    if (game.fase !== 'gioco') {
        mostraMessaggio('Pescare prima di attaccare', 'error');
        setTimeout(nascondiMessaggio, 2000);
        return;
    }
    if (!game.haPescato) {
        mostraMessaggio('Pescare prima di attaccare', 'error');
        setTimeout(nascondiMessaggio, 2000);
        return;
    }

    carta.selezionata = !carta.selezionata;

    if (carta.selezionata) {
        game.carteSelezionate.push(carta);
    } else {
        const idx = game.carteSelezionate.indexOf(carta);
        if (idx > -1) game.carteSelezionate.splice(idx, 1);
    }

    render();
}

async function depositaCombinazione(e) {
    if (game.fase !== 'gioco') return;

    // Se ci sono carte selezionate e si clicca su una combinazione, prova ad attaccarle
    if (game.carteSelezionate.length > 0) {
        const combEl = e.target.closest('.combinazione');
        if (combEl) {
            const combElements = Array.from($('#combinazioni-noi').querySelectorAll('.combinazione'));
            const combIndex = combElements.indexOf(combEl);
            if (combIndex >= 0) {
                const combinazione = game.combinazioniNoi[combIndex];
                const riuscito = await attaccaCarteSelezionateACombinazione(combinazione);
                if (riuscito !== false) return;
                // Se non si attaccano, prosegui per provare a depositare come nuova combinazione
            }
        }
    }

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

    // Se depositare lascerebbe 0 o 1 carte (obbligato a scartare), serve un burraco
    const carteRimanenti = game.giocatori[0].carte.length - game.carteSelezionate.length;
    if (carteRimanenti <= 1 && game.pozzetti[0].length === 0) {
        const haBurracoEsistente = game.combinazioniNoi.some(c => c.isBurraco);
        const diventeraBurraco = game.carteSelezionate.length >= 7;
        if (!haBurracoEsistente && !diventeraBurraco) {
            mostraMessaggio('Serve almeno un burraco per chiudere', 'error');
            setTimeout(nascondiMessaggio, 2000);
            return;
        }
    }

    salvaStato('combinazione');

    // Ordina le carte per la combinazione
    let carteOrdinate = [...game.carteSelezionate];

    if (risultato.tipo === TIPO_SCALA) {
        // Per le scale, ordina e posiziona il jolly nel buco
        carteOrdinate = ordinaScalaConJolly(carteOrdinate, risultato.assoAlto);
    } else if (risultato.tipo === TIPO_TRIS) {
        // Per i tris, ordina con matte alla fine (in basso visivamente)
        carteOrdinate = ordinaTrisConJolly(carteOrdinate, risultato.numero);
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

    // Rimuovi carte depositate da carteConosciute
    if (game.giocatori[0].carteConosciute) {
        const idDepositate = new Set(comb.carte.map(c => c.id));
        game.giocatori[0].carteConosciute = game.giocatori[0].carteConosciute.filter(
            cc => !idDepositate.has(cc.cartaId)
        );
    }

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
        playSound('tada');
    } else {
        playSound('combinazione');
    }

    // Controlla se ha finito le carte
    if (game.giocatori[0].carte.length === 0) {
        if (game.pozzetti[0].length > 0) {
            prendiPozzetto(0);
        } else {
            finePartita(true);
            return;
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
function aggiungiCartaACombinazione(carta, combinazione, skipRenderAndSound = false, skipValidazione = false) {
    if (!skipValidazione) {
        if (game.fase !== 'gioco') {
            mostraMessaggio('Pescare prima di attaccare', 'error');
            setTimeout(nascondiMessaggio, 2000);
            return;
        }
        if (!game.haPescato) {
            mostraMessaggio('Pescare prima di attaccare', 'error');
            setTimeout(nascondiMessaggio, 2000);
            return;
        }

        // Verifica che la carta possa essere aggiunta (o sostituire una matta)
        const risultato = puoAggiungereACombinazione(carta, combinazione);
        if (!risultato) {
            render();
            return;
        }

        // Se resterebbe 0 o 1 carta (obbligato a scartare), serve un burraco
        if (game.giocatori[0].carte.length <= 2 && game.pozzetti[0].length === 0) {
            const haBurracoEsistente = game.combinazioniNoi.some(c => c.isBurraco);
            const diventeraBurraco = combinazione.carte.length + 1 >= 7;
            if (!haBurracoEsistente && !diventeraBurraco) {
                mostraMessaggio('Serve almeno un burraco per chiudere', 'error');
                setTimeout(nascondiMessaggio, 2000);
                return;
            }
        }
    }

    salvaStato('aggiungi-carta');

    // Rimuovi la carta dalla mano del giocatore
    const idx = game.giocatori[0].carte.indexOf(carta);
    if (idx > -1) {
        game.giocatori[0].carte.splice(idx, 1);
    }

    // Rimuovi da carteConosciute
    if (game.giocatori[0].carteConosciute) {
        game.giocatori[0].carteConosciute = game.giocatori[0].carteConosciute.filter(
            cc => cc.cartaId !== carta.id
        );
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
        sostituzione: (typeof risultato !== 'undefined' && risultato.sostituzione) || false
    });

    // Riordina la combinazione
    if (combinazione.tipo === TIPO_SCALA) {
        // Riverifica la scala completa per ottenere assoAlto aggiornato
        const riVer = verificaScala(combinazione.carte);
        if (riVer.valida) combinazione.assoAlto = riVer.assoAlto || false;
        combinazione.carte = ordinaScalaConJolly(combinazione.carte, combinazione.assoAlto);
    } else if (combinazione.tipo === TIPO_TRIS) {
        // Per i tris, riordina con matta alla fine (in basso visivamente)
        combinazione.carte = ordinaTrisConJolly(combinazione.carte, combinazione.numero);
    }

    // Aggiorna punteggio
    calcolaPunteggi();

    if (!skipRenderAndSound) {
        // Controlla burraco
        if (combinazione.isBurraco && combinazione.carte.length === 7) {
            playSound('tada');
        } else {
            playSound('combinazione');
        }

        // Controlla se ha finito le carte
        if (game.giocatori[0].carte.length === 0) {
            if (game.pozzetti[0].length > 0) {
                prendiPozzetto(0);
            } else {
                finePartita(true);
                return;
            }
        }

        render();
    }
}

// Attacca tutte le carte selezionate a una combinazione esistente
async function attaccaCarteSelezionateACombinazione(combinazione) {
    if (game.carteSelezionate.length === 0) return false;

    // Salva il numero di carte prima dell'aggiunta per il check burraco
    const cartePrima = combinazione.carte.length;

    // Test: combinazione esistente + carte selezionate formano una combinazione valida?
    const carteDaTestare = [...combinazione.carte, ...game.carteSelezionate];
    const risultatoTest = verificaCombinazione(carteDaTestare);

    if (!risultatoTest.valida) {
        return false;
    }

    // Se attaccare lascerebbe 0 o 1 carte (obbligato a scartare), serve un burraco
    const carteRimanenti = game.giocatori[0].carte.length - game.carteSelezionate.length;
    if (carteRimanenti <= 1 && game.pozzetti[0].length === 0) {
        const haBurracoEsistente = game.combinazioniNoi.some(c => c.isBurraco);
        const diventeraBurraco = carteDaTestare.length >= 7;
        if (!haBurracoEsistente && !diventeraBurraco) {
            mostraMessaggio('Serve almeno un burraco per chiudere', 'error');
            setTimeout(nascondiMessaggio, 2000);
            return false;
        }
    }

    // Salva le posizioni di partenza di tutte le carte selezionate
    const posizioniPartenza = [];
    for (const carta of game.carteSelezionate) {
        const cartaEl = document.querySelector(`#carte-giocatore .carta[data-carta-id="${carta.id}"]`);
        if (cartaEl) {
            posizioniPartenza.push({
                carta: carta,
                rect: cartaEl.getBoundingClientRect()
            });
        }
    }

    // Ordina le carte selezionate per numero per aggiungerle in ordine logico
    const carteOrdinate = [...game.carteSelezionate].sort((a, b) => a.numero - b.numero);

    // Deseleziona tutte le carte prima di aggiungerle
    game.carteSelezionate = [];

    // Usa la funzione già esistente per ogni carta, senza render/sound
    for (const carta of carteOrdinate) {
        aggiungiCartaACombinazione(carta, combinazione, true, true);
    }

    // Render unico dopo tutte le aggiunte
    render();

    // Suono appropriato: tada se si è appena formato il burraco (da <7 a >=7)
    if (combinazione.isBurraco && cartePrima < 7) {
        playSound('tada');
    } else {
        playSound('combinazione');
    }

    // Anima tutte le carte in parallelo
    console.log('Carte da animare:', posizioniPartenza.length);
    const animazioni = posizioniPartenza.map(pos => {
        const carta = pos.carta;
        const cartaElFinale = document.querySelector(`#combinazioni-noi .carta[data-carta-id="${carta.id}"]`);
        console.log('Carta', carta.id, 'trovata:', !!cartaElFinale, 'rect:', !!pos.rect);

        if (cartaElFinale && pos.rect) {
            // Nascondi temporaneamente la carta finale
            cartaElFinale.style.visibility = 'hidden';

            // Crea un elemento fittizio per la posizione di partenza
            const fakePartenza = document.createElement('div');
            fakePartenza.style.position = 'fixed';
            fakePartenza.style.left = pos.rect.left + 'px';
            fakePartenza.style.top = pos.rect.top + 'px';
            fakePartenza.style.width = '1px';
            fakePartenza.style.height = '1px';
            document.body.appendChild(fakePartenza);

            // Anima e poi pulisci
            return animaCarta(carta, fakePartenza, cartaElFinale, { mostraFronte: true, durata: 400 })
                .then(() => {
                    fakePartenza.remove();
                    cartaElFinale.style.visibility = 'visible';
                });
        }
        return Promise.resolve();
    });

    // Aspetta che tutte le animazioni finiscano
    await Promise.all(animazioni);

    // Controlla se ha finito le carte
    if (game.giocatori[0].carte.length === 0) {
        if (game.pozzetti[0].length > 0) {
            prendiPozzetto(0);
        } else {
            finePartita(true);
            return true;
        }
    }
    return true;
}

function prendiPozzetto(squadra) {
    const pozzetto = squadra === 0 ? game.pozzetti[0] : game.pozzetti[1];
    if (pozzetto.length === 0) return;

    const giocatore = game.giocatori[squadra === 0 ? 0 : 1];

    for (const carta of pozzetto) {
        // Carte visibili solo per il giocatore umano
        carta.faceUp = giocatore.isUmano;
        giocatore.carte.push(carta);
    }

    if (squadra === 0) {
        game.pozzetti[0] = [];
    } else {
        game.pozzetti[1] = [];
    }

    giocatore.haPozzetto = true;
    game.giocatori.forEach(function(g) { if (g.squadra === giocatore.squadra) g.haPozzetto = true; });
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

        // Scala: 1.0 = dimensione originale
        // Le carte nelle combinazioni sono scale 0.73, come quelle del giocatore
        let scala = 1.0;

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

        // Verifica collisione angolo superiore sinistro con carte delle combinazioni
        verificaCollisioneCombinazioni(e.clientX - offsetXScaled, e.clientY - offsetYScaled, carta);
    }
}

// Verifica se il punto (angolo superiore sinistro del fantasma) tocca il campo di una combinazione
function verificaCollisioneCombinazioni(puntoX, puntoY, cartaTrascinata) {
    // Rimuovi evidenziazione precedente
    if (game.trascinamento.combinazioneTargetEl) {
        game.trascinamento.combinazioneTargetEl.classList.remove('combinazione-target');
        game.trascinamento.combinazioneTargetEl = null;
        game.trascinamento.combinazioneTarget = null;
    }

    // Cerca solo nelle combinazioni del giocatore umano (noi)
    // Un giocatore può attaccare carte solo alle proprie combinazioni
    const tutteCombi = [
        ...game.combinazioniNoi.map(c => ({ comb: c, area: 'noi' }))
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
        const rect = combEl.getBoundingClientRect();

        // Verifica se il punto e' dentro il campo della combinazione
        if (puntoX >= rect.left && puntoX <= rect.right &&
            puntoY >= rect.top && puntoY <= rect.bottom) {

            // Verifica se la carta trascinata puo' essere aggiunta a questa combinazione
            if (puoAggiungereACombinazione(cartaTrascinata, comb)) {
                // Evidenzia l'intera combinazione
                combEl.classList.add('combinazione-target');
                game.trascinamento.combinazioneTargetEl = combEl;
                game.trascinamento.combinazioneTarget = comb;
                return;
            }
        }
    }
}

function onMouseUp(e) {
    if (!game.trascinamento) return;

    const { carta, elemento, moved, fantasma, combinazioneTargetEl, combinazioneTarget } = game.trascinamento;

    // Rimuovi il fantasma se esiste
    if (fantasma) {
        fantasma.remove();
    }

    // Rimuovi evidenziazione combinazione target
    if (combinazioneTargetEl) {
        combinazioneTargetEl.classList.remove('combinazione-target');
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

        // Scala: 1.0 = dimensione originale
        // Le carte nelle combinazioni sono scale 0.73, come quelle del giocatore
        let scala = 1.0;

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

        // Verifica collisione angolo superiore sinistro con carte delle combinazioni
        verificaCollisioneCombinazioni(touch.clientX - offsetXScaled, touch.clientY - offsetYScaled, carta);
    }
}

function onTouchEnd(e) {
    if (!game.trascinamento) return;

    const { carta, elemento, moved, fantasma, combinazioneTargetEl, combinazioneTarget } = game.trascinamento;

    // Rimuovi il fantasma se esiste
    if (fantasma) {
        fantasma.remove();
    }

    // Rimuovi evidenziazione combinazione target
    if (combinazioneTargetEl) {
        combinazioneTargetEl.classList.remove('combinazione-target');
    }

    // Ripristina la visibilita' dell'elemento originale
    elemento.style.visibility = '';
    elemento.classList.remove('trascinando');

    if (!moved) {
        toggleSelezioneCarta(carta);
    } else {
        // Fine trascinamento - controlla dove e' stata rilasciata
        if (combinazioneTarget) {
            // Rilasciata su una combinazione valida - aggiungi la carta
            aggiungiCartaACombinazione(carta, combinazioneTarget);
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
    $$('.modal').forEach(m => m.classList.remove('trasparente'));
    $$('.modal').forEach(m => m.style.display = 'none');
}

// Finestre info giocatore (popup browser separati)
// Finestra debug unica (mantiene posizione riutilizzando la stessa finestra)
let debugWindow = null;

function mostraPannelloGiocatore(indiceGiocatore, ruolo, defaultScenario) {
    const giocatore = game.giocatori[indiceGiocatore];
    if (!giocatore || !giocatore.personaggio) return;

    // Se la finestra esiste ed è aperta, RIUTILIZZALA (mantiene posizione!)
    if (debugWindow && !debugWindow.closed) {
        // Aggiorna solo il contenuto senza chiudere/riaprire
        debugWindow.document.open();
        debugWindow.document.write(getGiocatoreHTML(indiceGiocatore, ruolo, defaultScenario));
        debugWindow.document.close();
        // Sposta il focus solo se esplicitamente richiesto o se era minimizzata
        // debugWindow.focus();
        return;
    }

    // Prima apertura: crea la finestra
    const features = 'width=1100,height=700,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no';
    const win = window.open('', 'BurracoDebug', features);

    if (!win) {
        console.error('Impossibile aprire la finestra (popup bloccato?)');
        alert(t('msg-pop-bloccato'));
        return;
    }

    debugWindow = win;

    // Scrivi il contenuto HTML
    win.document.open();
    win.document.write(getGiocatoreHTML(indiceGiocatore, ruolo, defaultScenario));
    win.document.close();

    // Togli il focus dal popup per restituirlo al gioco
    win.blur();
}

// Aggiorna il contenuto della finestra debug già aperta
function aggiornaFinestraGiocatore(indiceGiocatore) {
    if (!debugWindow || debugWindow.closed) return;

    const ruolo = `AI Debug - Turno ${game.turno}`;

    // Riscrivi l'intero documento
    debugWindow.document.open();
    debugWindow.document.write(getGiocatoreHTML(indiceGiocatore, ruolo));
    debugWindow.document.close();

    // Togli il focus dal popup per restituirlo al gioco
    debugWindow.blur();
}

function _isAttaccabileAdAvversario(carta, combo) {
    return window.isCartaAttaccabileACombo(carta, combo);
}

window.calcolaScoreOpz = function(opzIdx, silent) {
    var con = silent ? { group: function(){}, groupEnd: function(){}, log: function(){}, warn: function(){} } : console;
    var d = window._analisiData;
    if (!d) { con.log('[ScoreOpz] Nessun dato analisi disponibile'); return null; }
    var _w = window.opener || window;
    var game = _w.game;
    var Strategia = _w.Strategia;
    var giocatore = game.giocatori[window._analisiGiocatoreIdx];
    var comboAvversarie = giocatore.squadra === 0 ? game.combinazioniLoro : game.combinazioniNoi;
    var comboSquadra   = giocatore.squadra === 0 ? game.combinazioniNoi  : game.combinazioniLoro;

    var opt = opzIdx === -1 ? { mosse: [], descCarte: 'OPZ0' } : (d.opzioniScenario ? d.opzioniScenario[opzIdx] : null);
    if (!opt && opzIdx !== -1) { con.log('[ScoreOpz] OPZ' + (opzIdx + 1) + ' non trovata'); return null; }

    var opzLabel = opzIdx === -1 ? 'OPZ0' : 'OPZ' + (opzIdx + 1);
    var mosse = opt.mosse || [];

    // Calcola scarto anticipatamente per mostrarlo prima del gruppo score
    var _scartoInter = window.calcolaScartoPer(opzIdx, true);
    if (!silent && _scartoInter && _scartoInter._candidati) {
        var _nc = _scartoInter._nomeC;
        console.group('--- Scarto candidati (fase1=' + _scartoInter._fase1Count + '/' + _scartoInter._totCount + ') ---');
        _scartoInter._candidati.forEach(function(s) {
            var isScelta = (s === _scartoInter._candidatoFinale);
            var label = _nc(s.r) + ' → ' + s.score.toFixed(1) + (isScelta ? ' ◄ SCARTO' : '');
            if (isScelta) console.log('%c' + label, 'font-weight:bold; color:#fa0'); else console.log(label);
            s.righe.forEach(function(riga) { console.log(riga); });
        });
        console.groupEnd();
        console.log('%c  → Scarto scelto: ' + _scartoInter.carta + ' (sc=' + _scartoInter.score.toFixed(1) + ')', 'font-weight:bold; color:#fff; background:#222; padding:2px 6px');
    }

    con.group('=== SCORE OPZ per ' + opzLabel + ' [' + (opt.descCarte || '?') + '] ===');

    if (mosse.length === 0) {
        con.log('Nessuna mossa.');
    }

    var cf = window.coeffScoreOpz;

    function premioBase(tipo, lunghezza) {
        if (lunghezza < 3) return 0;
        var p = tipo === 'scala' ? cf.premioScala : cf.premioTris;
        if (lunghezza >= 4) p += cf.premio4c;
        if (lunghezza >= 5) p += cf.premio5c;
        if (lunghezza >= 6) p += cf.premio6c;
        if (lunghezza >= 7) p += cf.premioBurraco;
        if (lunghezza >= 8) p += (lunghezza - 7) * (cf.premioOltreBurraco || 0);
        return p;
    }
    function premioIncrementale(n) {
        if (n === 3) return cf.premioTris;
        if (n === 4) return cf.premio4c;
        if (n === 5) return cf.premio5c;
        if (n === 6) return cf.premio6c;
        if (n === 7) return cf.premioBurraco;
        if (n >= 8) return (cf.premioOltreBurraco || 0);
        return 0;
    }
    function premioIncrementaleAvv(n) {
        if (n === 3) return 0;
        if (n === 4) return cf.bonusAvv4c !== undefined ? cf.bonusAvv4c : cf.premio4c;
        if (n === 5) return cf.bonusAvv5c !== undefined ? cf.bonusAvv5c : cf.premio5c;
        if (n === 6) return cf.bonusAvv6c !== undefined ? cf.bonusAvv6c : cf.premio6c;
        if (n === 7) return cf.bonusAvv7c !== undefined ? cf.bonusAvv7c : cf.premioBurraco;
        if (n >= 8) return cf.bonusAvv8c !== undefined ? cf.bonusAvv8c : 0;
        return 0;
    }
    function nomeC(c) {
        return Strategia && Strategia.nomeCarta ? Strategia.nomeCarta(c) : ((c.numero || '') + (c.seme || ''));
    }
    function isFisica(c) { return !c.isJolly && !c.isPinella; }

    var totalScore = 0;
    var breakdown = [];
    var comboCurrentLen = {};
    comboSquadra.forEach(function(cb) { comboCurrentLen[cb.id] = cb.carte.length; });

    mosse.forEach(function(mossa) {
        var mossoScore = 0;
        var righe = [];
        if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
            var carte = mossa.carte || [];
            var fisiche = carte.filter(isFisica);
            var numMatte = carte.length - fisiche.length;
            var lunghezza = carte.length;

            var valoreCarte = fisiche.reduce(function(s, c) { return s + (c.punti || 0); }, 0) * cf.valCarte;
            mossoScore += valoreCarte;
            righe.push('  A) Valore carte ×' + cf.valCarte + ': +' + valoreCarte.toFixed(1) + ' [' + fisiche.map(nomeC).join(' ') + ']');

            var premio = premioBase(mossa.tipo, lunghezza);
            mossoScore += premio;
            righe.push('  B) Premio ' + mossa.tipo + ' ' + lunghezza + 'c: +' + premio);

            if (mossa.tipo === 'tris' && fisiche.length > 0) {
                var numTris = fisiche[0].numero;
                if (numTris === 1 || numTris === 3 || numTris === 13) {
                    mossoScore += cf.premioTrisEstremo;
                    righe.push('  B2) Bonus tris estremo (' + nomeC(fisiche[0]) + '): +' + cf.premioTrisEstremo);
                }
            }

            if (numMatte > 0) {
                var penMatta = -cf.penMattaBase * (lunghezza - 2);
                mossoScore += penMatta;
                righe.push('  C) Penalità matta (-' + cf.penMattaBase + '×' + (lunghezza - 2) + '): ' + penMatta.toFixed(1));
            }

            fisiche.forEach(function(carta) {
                var bestLen = 0;
                comboAvversarie.forEach(function(combo) {
                    if (_isAttaccabileAdAvversario(carta, combo)) {
                        var nl = combo.carte.length + 1; if (nl > bestLen) bestLen = nl;
                    }
                });
                if (bestLen > 0) {
                    var bonusAvv = premioIncrementaleAvv(bestLen);
                    mossoScore += bonusAvv;
                    righe.push('  D) Bonus sottratta avv [' + nomeC(carta) + '] →' + bestLen + 'c: +' + bonusAvv);
                }
            });

            con.log(mossa.tipo.toUpperCase() + ' [' + fisiche.map(nomeC).join(' ') + (numMatte > 0 ? ' M' : '') + '] → +' + mossoScore.toFixed(1));
            righe.forEach(function(r) { con.log(r); });

        } else if (mossa.tipo === 'calata') {
            var carta = mossa.carta;
            if (!carta) return;
            var combo = mossa.combo;
            if (!combo && mossa.comboId !== undefined) {
                combo = comboSquadra.find(function(cb) { return cb.id === mossa.comboId; });
            }
            var _cid = combo ? combo.id : null;
            var _baseLenC = (_cid !== null && comboCurrentLen[_cid] !== undefined) ? comboCurrentLen[_cid] : (combo ? combo.carte.length : 0);
            var lunghRisultante = _baseLenC + 1;
            if (_cid !== null) comboCurrentLen[_cid] = lunghRisultante;

            var valoreCarta = (carta.punti || 0) * cf.valCarte;
            mossoScore += valoreCarta;
            righe.push('  A) Valore carta ×' + cf.valCarte + ': +' + valoreCarta.toFixed(1) + ' [' + nomeC(carta) + ']');

            var premioCalata = premioIncrementale(lunghRisultante);
            mossoScore += premioCalata;
            righe.push('  B) Premio calata →' + lunghRisultante + 'c: +' + premioCalata);

            if (lunghRisultante >= 7) {
                var bonusPB = cf.premioPrimoBurraco !== undefined ? cf.premioPrimoBurraco : 50;
                mossoScore += bonusPB;
                righe.push('  B2) Premio primo burraco: +' + bonusPB);
            }

            var bestLen = 0;
            comboAvversarie.forEach(function(comboAvv) {
                if (_isAttaccabileAdAvversario(carta, comboAvv)) {
                    var nl = comboAvv.carte.length + 1; if (nl > bestLen) bestLen = nl;
                }
            });
            if (bestLen > 0) {
                var bonusAvv = premioIncrementale(bestLen);
                mossoScore += bonusAvv;
                righe.push('  D) Bonus sottratta avv [' + nomeC(carta) + '] →' + bestLen + 'c: +' + bonusAvv);
            }

            // Premio calata che libera una matta (solo su scale)
            if (combo && combo.tipo === 2 /* TIPO_SCALA */) {
                var _puoAgg = _w.puoAggiungereACombinazione ? _w.puoAggiungereACombinazione(carta, combo) : false;
                if (_puoAgg && _puoAgg.sostituzione) {
                    var _fisC = combo.carte.filter(function(c) { return !c.isJolly && !c.isPinella; });
                    var _numsC = _fisC.map(function(c) { return c.numero; }).sort(function(a,b){ return a-b; });
                    var _isBordo = _numsC.length === 0 || carta.numero < _numsC[0] || carta.numero > _numsC[_numsC.length-1];
                    var _bonusMatta = _isBordo ? (cf.premioLiberaMattaBordo || 10) : (cf.premioLiberaMattaInterna || 15);
                    mossoScore += _bonusMatta;
                    righe.push('  E) Libera matta ' + (_isBordo ? 'bordo' : 'interna') + ': +' + _bonusMatta);
                }
            }

            // Premio matta solitaria (opzione generata da _calcolaVariantiM)
            if (mossa.isMattaSolitaria) {
                var _bonusMS = cf.premioMattaSolitaria || 200;
                mossoScore += _bonusMS;
                righe.push('  F) Bonus matta solitaria: +' + _bonusMS);
            }

            // Penalità calata matta (jolly/pinella): scoraggia calate non decisive
            if (!isFisica(carta)) {
                var _penCM = cf.penCalataMatta !== undefined ? cf.penCalataMatta : 20;
                mossoScore -= _penCM;
                righe.push('  G) Penalità calata matta: -' + _penCM);
            }

            con.log('CALATA [' + nomeC(carta) + '] → combo#' + mossa.comboId + ' (' + lunghRisultante + 'c) → +' + mossoScore.toFixed(1));
            righe.forEach(function(r) { con.log(r); });
        }
        totalScore += mossoScore;
        breakdown.push({ tipo: mossa.tipo, score: mossoScore });
    });

    // _scartoInter già calcolato prima del gruppo score
    var _scartoScore = _scartoInter ? _scartoInter.score : 0;
    var scartoId = _scartoInter && _scartoInter.cartaRef ? _scartoInter.cartaRef.id : null;

    // H) Penalità carte orfane rimaste in mano dopo l'opzione
    var _nOrfane = 0;
    var _penCO = cf.penCartaOrfana !== undefined ? cf.penCartaOrfana : 2;
    var _origManoFn = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
    var _cuSet = (opt && opt.carteUsate) ? opt.carteUsate : new Set();
    var _rimaste = d.classifica.filter(function(r) {
        return _origManoFn(r) && !r.isMatta && !_cuSet.has(r.cartaRef.id) &&
            (!scartoId || r.cartaRef.id !== scartoId);
    });
    var _orfaneIds = new Set();
    _rimaste.forEach(function(r) {
        var _conn = _rimaste.some(function(x) {
            if (x.cartaRef.id === r.cartaRef.id) return false;
            if (x.cartaRef.numero === r.cartaRef.numero) return true;
            if (x.cartaRef.seme && x.cartaRef.seme === r.cartaRef.seme) {
                return Math.abs((x.cartaRef.numero || 0) - (r.cartaRef.numero || 0)) <= 2;
            }
            return false;
        });
        if (!_conn) { _nOrfane++; _orfaneIds.add(r.cartaRef.id); }
    });
    if (_penCO > 0 && _nOrfane > 0) {
        var _penOrfaneTot = -(_penCO * _nOrfane);
        totalScore += _penOrfaneTot;
        con.log('H) Penalità carte orfane (' + _nOrfane + ' carte): ' + _penOrfaneTot.toFixed(1));
    }

    // Controlla se anche la carta scartata era orfana rispetto alle rimaste
    var _scartoOrfana = false;
    if (scartoId) {
        var _scartoEntry = d.classifica.find(function(r) { return r.cartaRef && r.cartaRef.id === scartoId; });
        if (_scartoEntry && !_scartoEntry.isMatta) {
            _scartoOrfana = !_rimaste.some(function(x) {
                if (x.cartaRef.numero === _scartoEntry.cartaRef.numero) return true;
                if (x.cartaRef.seme && x.cartaRef.seme === _scartoEntry.cartaRef.seme)
                    return Math.abs((x.cartaRef.numero || 0) - (_scartoEntry.cartaRef.numero || 0)) <= 2;
                return false;
            });
        }
    }

    var _totaleCombinato = totalScore + _scartoScore;
    con.log('%c✓ SCORE TOTALE: ' + _totaleCombinato.toFixed(1) + ' (opz=' + totalScore.toFixed(1) + ' sc=' + _scartoScore.toFixed(1) + ')', 'font-size:14px; font-weight:bold; color:#ff8; background:#030');
    con.groupEnd();
    return {
        score: _totaleCombinato,
        opzScore: totalScore,
        scartoScore: _scartoScore,
        cartaScarto: _scartoInter ? _scartoInter.carta : '-',
        cartaRef: _scartoInter ? _scartoInter.cartaRef : null,
        breakdown: breakdown,
        orfane: _nOrfane,
        orfaneIds: _orfaneIds,
        scartoOrfana: _scartoOrfana
    };
};

// Costruisce una versione proiettata di comboSquadra simulando le calate nelle mosse.
// Ogni mossa tipo 'calata' con carta e comboTarget aggiunge virtualmente la carta alla combo.
window._proiettaComboConCalate = function(comboSquadra, mosse) {
    if (!mosse || mosse.length === 0) return comboSquadra;
    var calate = mosse.filter(function(m) { return m.tipo === 'calata' && m.carta && m.combo; });
    if (calate.length === 0) return comboSquadra;
    return comboSquadra.map(function(combo) {
        var carteExtra = calate.filter(function(m) { return m.combo === combo; }).map(function(m) { return m.carta; });
        if (carteExtra.length === 0) return combo;
        return Object.assign({}, combo, { carte: combo.carte.concat(carteExtra) });
    });
};

window.calcolaScartoPer = function(opzIdx, _silent, comboSquadraOverride) {
    var d = window._analisiData;
    if (!d || !d.opzioniScenario) return null;
    var opt = opzIdx === -1 ? null : d.opzioniScenario[opzIdx];
    if (!opt && opzIdx !== -1) return null;
    var _w = window.opener || window;
    var game = _w.game;
    var Strategia = _w.Strategia;
    var giocatore = game.giocatori[window._analisiGiocatoreIdx];
    var comboAvversarie = giocatore.squadra === 0 ? game.combinazioniLoro : game.combinazioniNoi;
    var comboSquadra = comboSquadraOverride || window._comboSquadraOverride || (giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro);

    var carteUsateSet = opt ? opt.carteUsate : new Set();
    // Se c'è una sola carta negli scarti, non può essere scartata (regola: carta appena pescata)
    var _scartiUnici = d.classifica.filter(function(r) { return r.origine === 'scarto'; });
    var _idVietato = _scartiUnici.length === 1 ? _scartiUnici[0].cartaRef.id : null;
    var candidati = d.classifica.filter(function(r) {
        if (r.origine !== 'mano' && r.origine !== 'mazzo' && r.origine !== 'scarto') return false;
        if (carteUsateSet.has(r.cartaRef.id)) return false;
        if (_idVietato !== null && r.cartaRef.id === _idVietato) return false;
        return true;
    });
    if (candidati.length === 0) return null;

    var pericoliAvversari = {};
    candidati.forEach(function(r) {
        var pericoli = [];
        comboAvversarie.forEach(function(combo) {
            if (_isAttaccabileAdAvversario(r.cartaRef, combo))
                pericoli.push({ lunghezza: combo.carte.length + 1 });
        });
        pericoliAvversari[r.cartaRef.id] = pericoli;
    });

    var pericoliPropri = {};
    candidati.forEach(function(r) {
        var n = 0;
        comboSquadra.forEach(function(combo) { if (_isAttaccabileAdAvversario(r.cartaRef, combo)) n++; });
        pericoliPropri[r.cartaRef.id] = n;
    });

    var fase1 = candidati.filter(function(r) {
        if (r.isMatta) return false;
        return !(pericoliAvversari[r.cartaRef.id] || []).some(function(p) { return p.lunghezza >= 7; });
    });
    if (fase1.length === 0) { fase1 = candidati.filter(function(r) { return !r.isMatta; }); if (fase1.length === 0) fase1 = candidati; }

    var connettivita = {};
    fase1.forEach(function(r) {
        var conn = 0;
        fase1.filter(function(x) { return x.cartaRef.id !== r.cartaRef.id; }).forEach(function(x) {
            if (x.isMatta || r.isMatta) return;
            if (x.cartaRef.numero === r.cartaRef.numero) { conn++; return; }
            if (x.cartaRef.seme && x.cartaRef.seme === r.cartaRef.seme) {
                var dist = Math.abs((x.cartaRef.numero||0) - (r.cartaRef.numero||0));
                if (dist === 1) conn++; else if (dist === 2) conn += 0.5;
            }
        });
        connettivita[r.cartaRef.id] = conn;
    });

    var nomeC = function(r) { return Strategia && Strategia.nomeCarta ? Strategia.nomeCarta(r.cartaRef) : (r.cartaRef.numero + r.cartaRef.seme); };
    var scoreFase3 = fase1.map(function(r) {
        var score = 0;
        var righe = [];
        var cf = window.coeffScoreOpz;
        var centralita = Strategia.getCentralita ? Strategia.getCentralita(r.cartaRef.numero) : 0.5;
        var sDec = (1 - centralita) * (cf.coeffScartoDecent || 5);
        score += sDec;
        righe.push('  decent: +' + sDec.toFixed(1));
        var conn = connettivita[r.cartaRef.id] || 0;
        if (conn > 0) { var sConn = -(conn * (cf.coeffScartoConn || 8)); score += sConn; righe.push('  conn(' + conn.toFixed(1) + '): ' + sConn.toFixed(1)); }
        var pericoli = pericoliAvversari[r.cartaRef.id] || [];
        if (pericoli.length > 0) {
            var peggiore = pericoli.reduce(function(w, p) { return p.lunghezza > w.lunghezza ? p : w; }, pericoli[0]);
            var pen = peggiore.lunghezza >= 6 ? -(cf.penScarto6c || 25) : peggiore.lunghezza === 5 ? -(cf.penScarto5c || 15) : -(cf.penScarto4c || 5);
            score += pen;
            righe.push('  pericolo avv ' + peggiore.lunghezza + 'c: ' + pen);
        }
        var nPropri = pericoliPropri[r.cartaRef.id] || 0;
        if (nPropri > 0) { var sProp = -(nPropri * (cf.penScartoCalabile || 7)); score += sProp; righe.push('  calabile propri(' + nPropri + '): ' + sProp.toFixed(1)); }
        return { r: r, score: score, righe: righe };
    });
    scoreFase3.sort(function(a, b) { return b.score - a.score; });
    var candidatoFinale = scoreFase3[0];
    if (candidatoFinale && candidatoFinale.r.isMatta && scoreFase3.length > 1) candidatoFinale = scoreFase3[1];

    return candidatoFinale ? {
        carta: candidatoFinale.r.carta, cartaRef: candidatoFinale.r.cartaRef,
        origine: candidatoFinale.r.origine, score: candidatoFinale.score,
        _candidati: scoreFase3, _candidatoFinale: candidatoFinale,
        _fase1Count: fase1.length, _totCount: candidati.length,
        _nomeC: nomeC
    } : null;
};

window._calcolaVariantiB = function(d, game, giocatoreIdx) {
    var giocatore = game.giocatori[giocatoreIdx];
    var comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
    if (!d || !d.opzioniScenario || comboSquadra.length === 0) return { bLabelMap: {}, bFirstIdx: d ? d.opzioniScenario.length : 0 };

    var origMano = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
    var matteHand = d.classifica.filter(function(r){ return origMano(r) && r.isMatta; }).length;

    function buildModMosse(bOpt, freeCalate, sacrificed) {
        var mm = bOpt.mosse.map(function(m){ return m.carte ? Object.assign({},m,{carte:m.carte.slice()}) : Object.assign({},m); });
        if (sacrificed && sacrificed.length > 0) {
            var byM = {};
            var stealIdx = new Set();
            sacrificed.forEach(function(sc){
                if (sc.mossoTipo === 'calata') {
                    stealIdx.add(sc.mossoIdx); // rimuovi la calata originale dal base-opt
                } else {
                    if(!byM[sc.mossoIdx]) byM[sc.mossoIdx]=[];
                    byM[sc.mossoIdx].push(sc.carta.id);
                }
            });
            Object.keys(byM).forEach(function(mi){
                var m = mm[parseInt(mi)]; if(!m||!m.carte) return;
                m.carte = m.carte.filter(function(c){ return byM[mi].indexOf(c.id)===-1; });
                if (m.carte.length < 3) mm[parseInt(mi)] = null;
            });
            mm = mm.filter(function(m, idx){ return m !== null && !stealIdx.has(idx); });
            sacrificed.forEach(function(sc){ mm.push({tipo:'calata',carta:sc.carta,combo:sc.comboTarget,comboId:sc.comboTarget.id}); });
        }
        freeCalate.forEach(function(fc){ mm.push({tipo:'calata',carta:fc.carta,combo:fc.comboTarget,comboId:fc.comboTarget.id}); });
        return mm;
    }

    // Calcola le carte calabili sulla combo cb per un dato bOpt.
    // Ritorna { cb, freeList, sacList, cardIds } oppure null se nessuna carta.
    function computeComboCandidate(bOpt, cb) {
        var fisicheCombo = cb.carte.filter(function(c){return !c.isJolly&&!c.isPinella;});
        if (fisicheCombo.length === 0) return null;
        var matteCombo = cb.carte.length - fisicheCombo.length;
        var avail = [];
        d.classifica.forEach(function(r){ if(!origMano(r)||r.isMatta) return; if(bOpt.carteUsate&&bOpt.carteUsate.has(r.cartaRef.id)) return; avail.push({carta:r.cartaRef,mossoIdx:-1}); });
        bOpt.mosse.forEach(function(mossa,mIdx){ if(mossa.tipo!=='tris'&&mossa.tipo!=='scala') return; (mossa.carte||[]).forEach(function(carta){ if(!carta.isJolly&&!carta.isPinella) avail.push({carta:carta,mossoIdx:mIdx}); }); });
        // Calate del base-opt verso ALTRI combo: possono essere "rubate" e reindirizzate
        bOpt.mosse.forEach(function(mossa, mIdx) {
            if (mossa.tipo !== 'calata') return;
            var carta = mossa.carta;
            if (!carta || carta.isJolly || carta.isPinella) return;
            var origCId = mossa.comboId !== undefined ? mossa.comboId : (mossa.combo ? mossa.combo.id : null);
            if (origCId === cb.id) return; // già verso questo combo, già in physNums
            avail.push({ carta: carta, mossoIdx: mIdx, mossoTipo: 'calata' });
        });
        var matteTotal = Math.min(1, matteCombo + matteHand);
        var freeList = [], sacList = [];
        if (cb.tipo === 1) {
            var num = fisicheCombo[0].numero;
            avail.forEach(function(ac){ if(ac.carta.numero!==num) return; if(ac.mossoIdx<0) freeList.push({carta:ac.carta,comboTarget:cb}); else sacList.push({carta:ac.carta,mossoIdx:ac.mossoIdx,mossoTipo:ac.mossoTipo,comboTarget:cb}); });
        } else {
            var seme = fisicheCombo[0].seme;
            var physNums = fisicheCombo.map(function(c){return c.numero;}).sort(function(a,b){return a-b;});
            // Includi numeri di calate già presenti in bOpt sullo stesso combo (evita posizioni duplicate nella scala)
            bOpt.mosse.forEach(function(m) {
                if (m.tipo==='calata' && m.carta && !m.carta.isJolly && !m.carta.isPinella
                    && (m.comboId===cb.id || (m.combo&&m.combo.id===cb.id)) && m.carta.seme===seme)
                    physNums.push(m.carta.numero);
            });
            physNums = physNums.filter(function(n,i,a){return a.indexOf(n)===i;}).sort(function(a,b){return a-b;});
            var cMin = physNums[0], cMax = physNums[physNums.length-1];
            var sameAvail = avail.filter(function(ac){return ac.carta.seme===seme;});
            if (sameAvail.length === 0) return null;
            var allNums = physNums.concat(sameAvail.map(function(ac){return ac.carta.numero;}));
            allNums = allNums.filter(function(n,i,a){return a.indexOf(n)===i;}).sort(function(a,b){return a-b;});
            var bestExt = cb.carte.length, bLo = cMin, bHi = cMax;
            for (var lo = cMin; lo >= 1; lo--) {
                for (var hi = cMax; hi <= 13; hi++) {
                    var pin = 0; allNums.forEach(function(n){if(n>=lo&&n<=hi)pin++;});
                    var gaps = (hi-lo+1)-pin;
                    if (gaps<=matteTotal && (hi-lo+1)>bestExt) { bestExt=hi-lo+1; bLo=lo; bHi=hi; }
                }
            }
            if (bestExt <= cb.carte.length) return null;
            var used = {}; physNums.forEach(function(n){used[n]=true;});
            sameAvail.forEach(function(ac){ var n=ac.carta.numero; if(n<bLo||n>bHi||used[n]) return; used[n]=true; if(ac.mossoIdx<0) freeList.push({carta:ac.carta,comboTarget:cb}); else sacList.push({carta:ac.carta,mossoIdx:ac.mossoIdx,mossoTipo:ac.mossoTipo,comboTarget:cb}); });
            // Se ci sono gap nel range non coperti da carte fisiche, serve una matta dalla mano
            var coveredNums = {}; physNums.forEach(function(n){coveredNums[n]=true;});
            freeList.forEach(function(fc){coveredNums[fc.carta.numero]=true;});
            sacList.forEach(function(sc){coveredNums[sc.carta.numero]=true;});
            var gapScoperti = 0; for (var gn=bLo; gn<=bHi; gn++) { if (!coveredNums[gn]) gapScoperti++; }
            if (gapScoperti > matteCombo && matteHand > 0) {
                var mattaHandR = d.classifica.find(function(r){ return origMano(r) && r.isMatta && !(bOpt.carteUsate && bOpt.carteUsate.has(r.cartaRef.id)); });
                if (mattaHandR) freeList.unshift({ carta: mattaHandR.cartaRef, comboTarget: cb });
            }
        }
        if (freeList.length === 0 && sacList.length === 0) return null;
        var cardIds = new Set();
        freeList.forEach(function(fc){ cardIds.add(fc.carta.id); });
        sacList.forEach(function(sc){ cardIds.add(sc.carta.id); });
        return { cb: cb, freeList: freeList, sacList: sacList, cardIds: cardIds };
    }

    var bLabelMap = {}, bFirstIdx = d.opzioniScenario.length;

    // Lista base OPZ da esplorare: OPZ0 (non fa nulla) + tutte le OPZ esistenti
    var opz0 = { mosse: [], carteUsate: new Set(), descCarte: 'OPZ0' };
    var baseList = [{ opt: opz0, isOPZ0: true, baseIdx: -1 }];
    d.opzioniScenario.slice(0, bFirstIdx).forEach(function(opt, i) {
        baseList.push({ opt: opt, isOPZ0: false, baseIdx: i });
    });

    baseList.forEach(function(entry) {
        var bOpt = entry.opt;
        if (!bOpt || !bOpt.mosse) return;
        var isOPZ0 = entry.isOPZ0;
        var baseIdx = entry.baseIdx;
        var baseLabel = isOPZ0 ? '0' : String(baseIdx + 1);

        // OPZ0 non è in d.opzioniScenario: la inseriamo temporaneamente per poter chiamare calcolaScoreOpz
        var opzIdx;
        if (isOPZ0) {
            opzIdx = d.opzioniScenario.length;
            d.opzioniScenario.push(bOpt);
        } else {
            opzIdx = baseIdx;
        }

        var baseRes = window.calcolaScoreOpz(opzIdx, true);
        var bestScore = baseRes ? baseRes.score : 0;
        var bestMosse = null;

        // Calcola i candidati per ogni combo in campo (una entry per combo)
        var comboCandidates = [];
        comboSquadra.forEach(function(cb) {
            var cand = computeComboCandidate(bOpt, cb);
            if (cand) comboCandidates.push(cand);
        });

        // Prova tutti i sottoinsiemi non vuoti (powerset) dei comboCandidates
        var n = comboCandidates.length;
        var nProve = 0;
        var _w2 = window.opener || window;
        var _nomeCarta = function(c) { return _w2.Strategia && _w2.Strategia.nomeCarta ? _w2.Strategia.nomeCarta(c) : (c.numero + c.seme); };
        if (game.debugAI && n > 0) {
            console.log('[VariantiB] OPZ' + baseLabel + ' → ' + n + ' candidati:');
            comboCandidates.forEach(function(cand, ci) {
                var freeNames = cand.freeList.map(function(fc){ return _nomeCarta(fc.carta); }).join(',');
                var sacNames = cand.sacList.map(function(sc){ return _nomeCarta(sc.carta); }).join(',');
                var ids = Array.from(cand.cardIds).join(',');
                console.log('  [' + ci + '] combo#' + cand.cb.id + ' free=[' + freeNames + '] sac=[' + sacNames + '] ids={' + ids + '}');
            });
            console.log('  base score=' + (baseRes ? baseRes.score.toFixed(2) : 'null'));
        }
        for (var mask = 1; mask < (1 << n); mask++) {
            // Verifica che le carte usate dai combo selezionati siano disgiunte
            var allCardIds = new Set();
            var valid = true;
            var selectedCandidates = [];
            for (var i = 0; i < n; i++) {
                if (!(mask & (1 << i))) continue;
                var cand = comboCandidates[i];
                var conflict = false;
                cand.cardIds.forEach(function(id){ if (allCardIds.has(id)) conflict = true; });
                if (conflict) { valid = false; break; }
                cand.cardIds.forEach(function(id){ allCardIds.add(id); });
                selectedCandidates.push(cand);
            }
            if (!valid) {
                if (game.debugAI) console.log('  mask=' + mask + ' CONFLICT → skip');
                continue;
            }
            nProve++;

            var combinedFree = [], combinedSac = [];
            selectedCandidates.forEach(function(cand){
                combinedFree = combinedFree.concat(cand.freeList);
                combinedSac = combinedSac.concat(cand.sacList);
            });

            var mm = buildModMosse(bOpt, combinedFree, combinedSac);
            var origMosse = bOpt.mosse; bOpt.mosse = mm;
            // Expand carteUsate with free calate so orfane penalty counts them as used
            var origCU = bOpt.carteUsate;
            var expandedCU = new Set(origCU);
            combinedFree.forEach(function(fc) { expandedCU.add(fc.carta.id); });
            bOpt.carteUsate = expandedCU;
            var res = window.calcolaScoreOpz(opzIdx, true);
            bOpt.mosse = origMosse;
            bOpt.carteUsate = origCU;
            var improved = res && res.score > bestScore;
            if (game.debugAI) {
                var combLabels = selectedCandidates.map(function(c){ return 'combo#'+c.cb.id; }).join('+');
                var freeStr = combinedFree.map(function(fc){ return _nomeCarta(fc.carta); }).join(',');
                var sacStr = combinedSac.map(function(sc){ return _nomeCarta(sc.carta); }).join(',');
                console.log('  mask=' + mask + ' [' + combLabels + '] free=[' + freeStr + '] sac=[' + sacStr + '] → score=' + (res ? res.score.toFixed(2) : 'null') + (improved ? ' ◄ NUOVO BEST' : ''));
            }
            if (improved) { bestScore = res.score; bestMosse = mm; }
        }

        if (game.debugAI && n > 0) {
            var baseScoreVal = baseRes ? baseRes.score : 0;
            var deltaStr = bestMosse ? '+' + (bestScore - baseScoreVal).toFixed(1) : 'nessun miglioramento';
            console.log('[VariantiB] OPZ' + baseLabel + ' (' + n + ' combo): ' + nProve + ' combinazioni provate → ' + deltaStr + ' vs base (bestScore=' + bestScore.toFixed(2) + ')');
        }

        // Ripristina d.opzioniScenario se avevamo inserito OPZ0 temporaneamente
        if (isOPZ0) d.opzioniScenario.pop();

        if (!bestMosse) return;
        var bIdx = d.opzioniScenario.length;
        bLabelMap['OPZ' + (bIdx + 1)] = 'OPZ' + baseLabel;
        var bCU = new Set();
        bestMosse.forEach(function(m){ if(m.tipo==='tris'||m.tipo==='scala'){(m.carte||[]).forEach(function(c){bCU.add(c.id);});} else if(m.tipo==='calata'&&m.carta){bCU.add(m.carta.id);} });
        if (game.debugAI) {
            var bestMosseStr = bestMosse.map(function(m){
                if (m.tipo==='calata') return 'calata('+_nomeCarta(m.carta)+'→combo#'+m.comboId+')';
                if (m.tipo==='tris'||m.tipo==='scala') return m.tipo+'['+(m.carte||[]).map(_nomeCarta).join(',')+']';
                return m.tipo;
            }).join(', ');
            console.log('[VariantiB] OPZ' + baseLabel + 'B mosse: [' + bestMosseStr + '] bCU={' + Array.from(bCU).join(',') + '}');
        }
        d.opzioniScenario.push({ mosse: bestMosse, carteUsate: bCU, descCarte: 'OPZ' + baseLabel + 'B' });
    });
    return { bLabelMap: bLabelMap, bFirstIdx: bFirstIdx };
};

// ============================================================
// Varianti C: sacrifica una carta della mano per sbloccare il vincolo
// Usata quando faseVincoloMano=true e la miglior opzione scarti viola rim<1.
// Per ogni carta della mano nelle mosse dell'opzione violante, la rimuove
// temporaneamente e rigenera l'analisi scarti sul resto.
// Ritorna { cartaSacrificata, opzIdx, opz, score, analisiData, opzCLabel } o null.
// ============================================================
window._calcolaVariantiC = function(d, game, giocatore, giocatoreIdx) {
    // Non ha senso calcolare varianti C se tutta la mano è composta da matte/jolly:
    // qualsiasi sacrificio rimuoverebbe una matta, producendo una simulazione distorta.
    if (giocatore.carte.length > 0 && giocatore.carte.every(function(c) { return c.isJolly || c.isPinella; })) {
        console.log('[_calcolaVariantiC] mano composta solo da matte/jolly → skip');
        return null;
    }

    var _w = window.opener || window;
    var Strategia = _w.Strategia;
    var origMano = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };

    var savedAnalisi = window._analisiData;
    var savedScenario = window._analisiScenario;
    var savedIdx = window._analisiGiocatoreIdx;

    window._analisiData = d;
    window._analisiScenario = 'scarti';
    window._analisiGiocatoreIdx = giocatoreIdx;

    var totalCarteD = d.classifica.filter(origMano).length;
    var opzioniLen = d.opzioniScenario ? d.opzioniScenario.length : 0;

    // Trova la miglior opzione violante (rim<1, no burraco)
    var bestViolIdx = -1, bestViolScore = -Infinity;
    for (var i = 0; i < opzioniLen; i++) {
        var opzV = d.opzioniScenario[i];
        if (!opzV) continue;
        var usateV = opzV.carteUsate ? opzV.carteUsate.size : 0;
        var rimV = totalCarteD - usateV - 1;
        var burrV = (opzV.mosse || []).some(function(m) { return (m.tipo==='tris'||m.tipo==='scala') && m.carte && m.carte.length >= 7; });
        if (rimV < 1 && !burrV) {
            var srV = window.calcolaScoreOpz(i, true);
            var scV = srV ? srV.score : 0;
            if (scV > bestViolScore) { bestViolScore = scV; bestViolIdx = i; }
        }
    }
    console.log('[_calcolaVariantiC] bestViolIdx=' + bestViolIdx + ' (score=' + bestViolScore.toFixed(1) + ') totalCarteD=' + totalCarteD);
    if (bestViolIdx < 0) {
        window._analisiData = savedAnalisi; window._analisiScenario = savedScenario; window._analisiGiocatoreIdx = savedIdx;
        return null;
    }

    var opzViolante = d.opzioniScenario[bestViolIdx];

    // Raccoglie carte presenti nelle mosse dell'opzione violante (sia mano che scarto)
    var carteDaProvare = new Map(); // id -> { card, isScarto }
    (opzViolante.mosse || []).forEach(function(m) {
        var refs = m.tipo === 'calata' ? [m.carta] : (m.carte || []);
        refs.forEach(function(c) {
            if (!c) return;
            var refId = c._origineRef ? c._origineRef.id : c.id;
            var realCard = giocatore.carte.find(function(rc) { return rc.id === refId; });
            if (realCard && !carteDaProvare.has(realCard.id)) {
                carteDaProvare.set(realCard.id, { card: realCard, isScarto: false });
                return;
            }
            // Prova anche tra le carte scarto
            if (!realCard) {
                var scartoCard = game.scarti.find(function(sc) { return sc.id === refId; });
                if (scartoCard && !carteDaProvare.has(scartoCard.id)) {
                    carteDaProvare.set(scartoCard.id, { card: scartoCard, isScarto: true });
                }
            }
        });
    });

    function _provaSacrificio(cartaDaRimuovere, isScarto) {
        var idx;
        if (isScarto) {
            idx = game.scarti.indexOf(cartaDaRimuovere);
            if (idx < 0) return;
            game.scarti.splice(idx, 1);
        } else {
            idx = giocatore.carte.indexOf(cartaDaRimuovere);
            if (idx < 0) return;
            giocatore.carte.splice(idx, 1);
        }

        var dC = Strategia.generaAnalisiParallela(giocatore, 'scarti');
        window._analisiData = dC;
        window._analisiScenario = 'scarti';
        window._analisiGiocatoreIdx = giocatoreIdx;
        window._calcolaVariantiB(dC, game, giocatoreIdx);

        var totalCarteDC = dC.classifica.filter(origMano).length;
        var opzioniLenC = dC.opzioniScenario ? dC.opzioniScenario.length : 0;
        var opzIdxList = [];
        for (var oi = 0; oi < opzioniLenC; oi++) opzIdxList.push(oi);
        if (opzIdxList.length === 0) opzIdxList.push(-1);

        opzIdxList.forEach(function(oi) {
            var sr = window.calcolaScoreOpz(oi, true);
            var sc = sr ? sr.score : 0;
            var opzData = oi === -1 ? null : dC.opzioniScenario[oi];
            var opz = opzData || { mosse: [], carteUsate: new Set() };
            var usate = opzData && opzData.carteUsate ? opzData.carteUsate.size : 0;
            var burraco = (opz.mosse || []).some(function(m) { return (m.tipo==='tris'||m.tipo==='scala') && m.carte && m.carte.length >= 7; });
            if (totalCarteDC - usate - 1 >= 1 || burraco) {
                if (!bestC || sc > bestC.score) {
                    bestC = { cartaSacrificata: cartaDaRimuovere, opzIdx: oi, opz: opz, score: sc, analisiData: dC };
                }
            }
        });

        if (isScarto) {
            game.scarti.splice(idx, 0, cartaDaRimuovere);
        } else {
            giocatore.carte.splice(idx, 0, cartaDaRimuovere);
        }
    }

    var bestC = null;
    carteDaProvare.forEach(function(entry) {
        _provaSacrificio(entry.card, entry.isScarto);
    });

    console.log('[_calcolaVariantiC] carteDaProvare.size=' + carteDaProvare.size + ' → bestC=' + (bestC ? bestC.opzIdx + ' score=' + bestC.score.toFixed(1) : 'null'));
    if (bestC) bestC.opzCLabel = 'OPZ' + (bestViolIdx + 1) + 'C';

    window._analisiData = savedAnalisi;
    window._analisiScenario = savedScenario;
    window._analisiGiocatoreIdx = savedIdx;
    return bestC;
};

// ============================================================
// ============================================================
// Varianti M: se dopo le mosse restano esattamente 2 carte (1 matta + 1 da scartare)
// e la matta è calabile su una combo di squadra, aggiunge la calata nelle mosse
// con tag isMattaSolitaria=true per ricevere il premioMattaSolitaria in calcolaScoreOpz.
// Si applica solo quando NON siamo in fase di vincolo mano (post-pozzetto pre-burraco).
// ============================================================
window._calcolaVariantiM = function(d, game, giocatoreIdx) {
    var giocatore = game.giocatori[giocatoreIdx];
    var comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
    var mFirstIdx = d ? d.opzioniScenario.length : 0;
    if (!d || !d.opzioniScenario || comboSquadra.length === 0)
        return { mFirstIdx: mFirstIdx, mLabelMap: {} };

    var _w = window.opener || window;
    var origMano = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
    var mLabelMap = {};

    // Combos con 6+ carte: opportunità burraco via calata matta
    // (generaOpzioniGioco in core.js non genera queste calate per scelta progettuale)
    var burracoTargets = comboSquadra.filter(function(cb) { return cb.carte.length >= 6; });

    // Itera su OPZ0 (nessuna mossa base) + tutte le opzioni generate
    var baseOptions = [{ _opzIdx: -1, mosse: [], carteUsate: new Set() }];
    d.opzioniScenario.slice(0, mFirstIdx).forEach(function(opt, i) {
        if (opt && opt.mosse) baseOptions.push({ _opzIdx: i });
    });

    baseOptions.forEach(function(wrapper) {
        var opzIdx = wrapper._opzIdx;
        var opt = opzIdx === -1 ? wrapper : d.opzioniScenario[opzIdx];
        if (!opt || !opt.mosse) return;

        // Carte rimanenti dopo questa opzione (escluse quelle usate)
        var carteRim = d.classifica.filter(function(r) {
            return origMano(r) && !(opt.carteUsate && opt.carteUsate.has(r.cartaRef.id));
        });

        var mattaEntry = carteRim.find(function(r) { return r.isMatta; });
        if (!mattaEntry) return; // nessuna matta disponibile

        // Modalità "fine partita": esattamente 2 carte rimaste (matta + 1 non-matta) → prova tutte le combo
        // Si applica solo post-pesca (classifica include una carta di origine 'scarto' o 'mazzo').
        // In pre-pesca (scenario='mano' senza carta pescata) non possiamo sapere la mano finale.
        var hasPescato = d.classifica.some(function(r) { return r.origine === 'scarto' || r.origine === 'mazzo'; });
        var isTwoRemaining = hasPescato && carteRim.length === 2 && carteRim.some(function(r) { return !r.isMatta; });
        // Modalità "burraco opportunity": matta disponibile + combo da 6+ carte sul tavolo
        var isBurracoOpp = burracoTargets.length > 0;

        if (!isTwoRemaining && !isBurracoOpp) return;

        // Combo da tentare: se solo burraco-opp, limita a 6-card combo; altrimenti tutte
        var targetCombos = (isTwoRemaining) ? comboSquadra : burracoTargets;

        var matta = mattaEntry.cartaRef;
        var baseRes = window.calcolaScoreOpz(opzIdx, true);
        var baseScore = baseRes ? baseRes.score : 0;
        var bestScore = baseScore;
        var bestMosse = null;

        targetCombos.forEach(function(combo) {
            var puoAgg = _w.puoAggiungereACombinazione ? _w.puoAggiungereACombinazione(matta, combo) : false;
            if (!puoAgg) return;

            var mm = (opt.mosse || []).map(function(m) {
                return m.carte ? Object.assign({}, m, { carte: m.carte.slice() }) : Object.assign({}, m);
            });
            mm.push({ tipo: 'calata', carta: matta, combo: combo, comboId: combo.id, isMattaSolitaria: isTwoRemaining });

            // Usa temp push/pop per calcolare score (funziona anche per OPZ0)
            var tempCU = new Set(opt.carteUsate || []);
            mm.forEach(function(m) {
                if (m.tipo === 'tris' || m.tipo === 'scala') { (m.carte || []).forEach(function(c) { tempCU.add(c.id); }); }
                else if (m.tipo === 'calata' && m.carta) { tempCU.add(m.carta.id); }
            });
            var tempIdx = d.opzioniScenario.length;
            d.opzioniScenario.push({ mosse: mm, carteUsate: tempCU });
            var res = window.calcolaScoreOpz(tempIdx, true);
            d.opzioniScenario.pop();

            if (res && res.score > bestScore) { bestScore = res.score; bestMosse = mm; }
        });

        if (!bestMosse) return;

        var mIdx = d.opzioniScenario.length;
        var mLabel = opzIdx === -1 ? 'OPZ0M' : ('OPZ' + (opzIdx + 1) + 'M');
        mLabelMap['OPZ' + (mIdx + 1)] = mLabel;

        var mCU = new Set(opt.carteUsate || []);
        bestMosse.forEach(function(m) {
            if (m.tipo === 'tris' || m.tipo === 'scala') { (m.carte || []).forEach(function(c) { mCU.add(c.id); }); }
            else if (m.tipo === 'calata' && m.carta) { mCU.add(m.carta.id); }
        });
        d.opzioniScenario.push({ mosse: bestMosse, carteUsate: mCU, descCarte: mLabel });
    });

    return { mFirstIdx: mFirstIdx, mLabelMap: mLabelMap };
};

// ============================================================
// Varianti P: se dopo le mosse resta esattamente 1 carta non-matta (il futuro scarto)
// e tutte le matte rimanenti trovano posto su combo della squadra,
// genera una variante che le cala tutte → pozzBonus applicato automaticamente.
// Si applica solo quando !giocatore.haPozzetto.
// ============================================================
window._calcolaVariantiP = function(d, game, giocatoreIdx) {
    var giocatore = game.giocatori[giocatoreIdx];
    var pFirstIdx = d ? d.opzioniScenario.length : 0;
    var pLabelMap = {};

    if (!d || !d.opzioniScenario || giocatore.haPozzetto) {
        return { pFirstIdx: pFirstIdx, pLabelMap: pLabelMap };
    }

    var _w = window.opener || window;
    var origMano = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
    var comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;

    if (comboSquadra.length === 0) return { pFirstIdx: pFirstIdx, pLabelMap: pLabelMap };

    // Opzioni base: OPZ0 + tutte le opzioni già generate (B, M incluse)
    var baseOptions = [{ _opzIdx: -1, mosse: [], carteUsate: new Set() }];
    d.opzioniScenario.slice(0, pFirstIdx).forEach(function(opt, i) {
        if (opt && opt.mosse) baseOptions.push({ _opzIdx: i });
    });

    baseOptions.forEach(function(wrapper) {
        var opzIdx = wrapper._opzIdx;
        var opt = opzIdx === -1 ? wrapper : d.opzioniScenario[opzIdx];
        if (!opt || !opt.mosse) return;

        // Carte rimanenti dopo questa opzione
        var carteRim = d.classifica.filter(function(r) {
            return origMano(r) && !(opt.carteUsate && opt.carteUsate.has(r.cartaRef.id));
        });

        // Serve esattamente 1 non-matta (il futuro scarto) e ≥1 matta
        var nonMatte = carteRim.filter(function(r) { return !r.isMatta; });
        var matte = carteRim.filter(function(r) { return r.isMatta; });
        if (nonMatte.length !== 1 || matte.length === 0) return;

        // Assegnazione greedy: ogni matta su una combo diversa della squadra
        var comboUsate = new Set();
        var assegnazioni = [];
        for (var mi = 0; mi < matte.length; mi++) {
            var matta = matte[mi].cartaRef;
            var trovata = null;
            for (var ci = 0; ci < comboSquadra.length; ci++) {
                var combo = comboSquadra[ci];
                if (comboUsate.has(combo.id)) continue;
                var puoAgg = _w.puoAggiungereACombinazione ? _w.puoAggiungereACombinazione(matta, combo) : false;
                if (puoAgg) { trovata = combo; break; }
            }
            if (!trovata) { assegnazioni = null; break; }
            comboUsate.add(trovata.id);
            assegnazioni.push({ matta: matta, combo: trovata });
        }
        if (!assegnazioni) return;

        // Costruisci le mosse extra (copia base + calate matte)
        var mm = (opt.mosse || []).map(function(m) {
            return m.carte ? Object.assign({}, m, { carte: m.carte.slice() }) : Object.assign({}, m);
        });
        assegnazioni.forEach(function(a) {
            mm.push({ tipo: 'calata', carta: a.matta, combo: a.combo, comboId: a.combo.id });
        });

        // Calcola score con temp push/pop
        var tempCU = new Set(opt.carteUsate || []);
        mm.forEach(function(m) {
            if (m.tipo === 'tris' || m.tipo === 'scala') { (m.carte || []).forEach(function(c) { tempCU.add(c.id); }); }
            else if (m.tipo === 'calata' && m.carta) { tempCU.add(m.carta.id); }
        });
        var tempIdx = d.opzioniScenario.length;
        d.opzioniScenario.push({ mosse: mm, carteUsate: tempCU });
        var res = window.calcolaScoreOpz(tempIdx, true);
        d.opzioniScenario.pop();

        // Genera solo se lo score migliora rispetto alla base
        var baseRes = window.calcolaScoreOpz(opzIdx, true);
        var baseScore = baseRes ? baseRes.score : 0;
        if (!res || res.score <= baseScore) return;

        var pIdx = d.opzioniScenario.length;
        var rawBase = opzIdx === -1 ? 'OPZ0' : 'OPZ' + (opzIdx + 1);
        var pLabel = rawBase + 'P';
        pLabelMap['OPZ' + (pIdx + 1)] = pLabel;

        var pCU = new Set(opt.carteUsate || []);
        mm.forEach(function(m) {
            if (m.tipo === 'tris' || m.tipo === 'scala') { (m.carte || []).forEach(function(c) { pCU.add(c.id); }); }
            else if (m.tipo === 'calata' && m.carta) { pCU.add(m.carta.id); }
        });
        d.opzioniScenario.push({ mosse: mm, carteUsate: pCU, descCarte: pLabel });

        console.log('[VariantiP] ' + pLabel + ' → ' + matte.length + ' matt' + (matte.length > 1 ? 'e' : 'a') + ' calat' + (matte.length > 1 ? 'e' : 'a') + ' su ' + assegnazioni.map(function(a) { return 'combo#' + a.combo.id; }).join(',') + ' → score=' + res.score.toFixed(1));
    });

    return { pFirstIdx: pFirstIdx, pLabelMap: pLabelMap };
};

// ============================================================
// Varianti V: in faseVincoloMano, per ogni opzione 'scarti' che viola il vincolo
// (rim < 1) e contiene ≥2 calate, genera versioni "potate" rimuovendo le calate
// finali finché rim ≥ 1. Restituisce il miglior candidato potato.
// Sicuro: rimuove sempre dalla fine della sequenza calate, preservando il prefisso valido.
// ============================================================
window._calcolaVariantiV = function(candidatiScartiViolanti, totalCarteD) {
    var bestV = null;

    candidatiScartiViolanti.forEach(function(cand) {
        var d = cand.analisiData;
        if (!d || cand.opzIdx < 0) return;
        var opz = d.opzioniScenario[cand.opzIdx];
        if (!opz || !opz.mosse) return;

        // Considera solo le calate (le mosse che consumano 1 carta ciascuna)
        var calate = opz.mosse.filter(function(m) { return m.tipo === 'calata'; });
        if (calate.length < 2) return; // con 1 sola calata non c'è nulla da potare

        // Prova a rimuovere le calate finali (1 alla volta) finché il vincolo è soddisfatto
        for (var trim = 1; trim < calate.length; trim++) {
            var calateRimaste = calate.slice(0, calate.length - trim);
            // Ricostruisce l'insieme completo di mosse: non-calate + calate rimaste
            var mosseTrim = opz.mosse.filter(function(m) {
                return m.tipo !== 'calata' || calateRimaste.indexOf(m) >= 0;
            });

            // Calcola carteUsate per le mosse trimmate
            var cuTrim = new Set();
            mosseTrim.forEach(function(m) {
                if (m.tipo === 'calata' && m.carta) cuTrim.add(m.carta.id);
                else (m.carte || []).forEach(function(c) { cuTrim.add(c.id); });
            });

            var rimTrim = totalCarteD - cuTrim.size - 1;
            if (rimTrim < 1) continue; // ancora violante, prova a togliere un'altra calata

            // Calcola score con una push/pop temporanea
            var tempIdx = d.opzioniScenario.length;
            d.opzioniScenario.push({ mosse: mosseTrim, carteUsate: cuTrim });
            window._analisiData = d;
            window._analisiScenario = 'scarti';
            var sr = window.calcolaScoreOpz(tempIdx, true);
            d.opzioniScenario.pop();

            var sc = sr ? sr.score : 0;
            if (!bestV || sc > bestV.score) {
                bestV = {
                    score:       sc,
                    mosse:       mosseTrim,
                    carteUsate:  cuTrim,
                    rimTrim:     rimTrim,
                    srcCand:     cand,
                    analisiData: d,
                    scoreRes:    sr
                };
            }
            break; // trovata la versione potata minima valida per questa opzione
        }
    });

    return bestV;
};

// scegliBestOpzioneAI — identico a elaboraOpz (usa calcolaScoreOpz)
// Se soloMano=true usa solo 'mano' (dopo aver già pescato dal mazzo)
// Ritorna { scenario, opzIdx, opz, score, scarto, rispettaVincolo, analisiData }
// ============================================================
function scegliBestOpzioneAI(giocatore, soloMano, verbose, fase) {
    if (!Strategia || !game) return null;

    // Logger capturante: salva sempre i log in _diagLines, li stampa in console solo se verbose
    const _diagLines = [];
    const _indent = { v: 0 };
    function _fmt(...args) {
        // Converti argomenti in stringa leggibile (salta direttive %c)
        const s = args.map(a => typeof a === 'string' ? a.replace(/%c/g, '') : String(a)).join(' ');
        return '  '.repeat(_indent.v) + s.trim();
    }
    const con = {
        group:    (...a) => { _diagLines.push(_fmt(...a)); _indent.v++; if (verbose) console.group(...a); },
        groupEnd: ()    => { _indent.v = Math.max(0, _indent.v - 1); if (verbose) console.groupEnd(); },
        log:      (...a) => { _diagLines.push(_fmt(...a)); if (verbose) console.log(...a); },
        warn:     (...a) => { _diagLines.push('⚠ ' + _fmt(...a)); if (verbose) console.warn(...a); }
    };
    const nomeC = c => Strategia.nomeCarta ? Strategia.nomeCarta(c) : (c.numero + (c.seme || ''));

    const giocatoreIdx = game.giocatori.indexOf(giocatore);
    const comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
    const squadraHaBurraco = comboSquadra.some(cb => cb.isBurraco);
    const faseVincoloMano = giocatore.haPozzetto && !squadraHaBurraco;
    const origMano = r => r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo';

    function _makesBurraco(mosse) {
        const lenMap = {};
        comboSquadra.forEach(cb => { lenMap[cb.id] = cb.carte.length; });
        for (const m of (mosse || [])) {
            if ((m.tipo === 'tris' || m.tipo === 'scala') && m.carte && m.carte.length >= 7) return true;
            if (m.tipo === 'calata' && m.combo) {
                lenMap[m.combo.id] = (lenMap[m.combo.id] || m.combo.carte.length) + 1;
                if (lenMap[m.combo.id] >= 7) return true;
            }
        }
        return false;
    }

    const scenariDaUsare = soloMano ? ['mano'] : ['mano', 'scarti'];
    const candidati = [];

    con.group('=== ELABORA: scelta migliore OPZ ===');
    con.log('Giocatore:', giocatore.nome || ('idx=' + giocatoreIdx));
    con.log('Fase vincolo mano (post-pozzetto pre-burraco):', faseVincoloMano, '| haPozzetto:', giocatore.haPozzetto, '| squadraHaBurraco:', squadraHaBurraco, '| squadra:', giocatore.squadra);

    const _analisiDataPerScenario = {};

    for (const scenario of scenariDaUsare) {
        if (scenario === 'scarti' && game.scarti.length === 0) continue;

        const d = Strategia.generaAnalisiParallela(giocatore, scenario);
        // Salva d PRIMA delle varianti (copia shallow di opzioniScenario)
        // così _diagData.analisiDataPerScenario[scenario] è clean (solo OPZ base)
        _analisiDataPerScenario[scenario] = Object.assign({}, d, { opzioniScenario: d.opzioniScenario.slice() });

        // Imposta contesto globale per calcolaScoreOpz / calcolaScartoPer
        window._analisiData = d;
        window._analisiScenario = scenario;
        window._analisiGiocatoreIdx = giocatoreIdx;

        const totalCarteD = d.classifica.filter(origMano).length;

        // Aggiungi varianti B, M e P — mutano d.opzioniScenario in-place
        const bInfo = window._calcolaVariantiB(d, game, giocatoreIdx);
        const mInfo = window._calcolaVariantiM(d, game, giocatoreIdx);
        const pInfo = window._calcolaVariantiP(d, game, giocatoreIdx);
        const bLabelMap = bInfo ? bInfo.bLabelMap : {};
        const mLabelMap = mInfo ? mInfo.mLabelMap : {};
        const pLabelMap = pInfo ? pInfo.pLabelMap : {};

        const opzioniLen = d.opzioniScenario ? d.opzioniScenario.length : 0;
        const opzIdxList = [-1]; // OPZ0: non giocare nulla (sempre disponibile)
        for (let i = 0; i < opzioniLen; i++) opzIdxList.push(i);

        const nB = mInfo ? mInfo.mFirstIdx - bInfo.bFirstIdx : 0;
        const nM = pInfo ? pInfo.pFirstIdx - mInfo.mFirstIdx : 0;
        const nP = pInfo ? opzioniLen - pInfo.pFirstIdx : 0;
        con.group('--- Scenario: ' + scenario + ' ---');
        con.log('OPZ disponibili:', opzIdxList.length, '(di cui B:', nB, 'M:', nM, 'P:', nP + ')');

        for (const opzIdx of opzIdxList) {
            const scoreRes = window.calcolaScoreOpz(opzIdx, true);
            const opzScore = scoreRes ? scoreRes.score : 0;  // include sc interno
            const mazzBonus = (scenario === 'mano' && window.coeffScoreOpz.premioMazzo !== undefined) ? window.coeffScoreOpz.premioMazzo : 0;
            const opzData = opzIdx === -1 ? null : (d.opzioniScenario ? d.opzioniScenario[opzIdx] : null);
            const opz = opzData || { mosse: [], carteUsate: new Set() };
            const scartoCarta = scoreRes ? scoreRes.cartaScarto : '-';

            let rispettaVincolo = true;
            let carteRim = null;
            let pozzBonus = 0;
            const _usate = opzData && opzData.carteUsate ? opzData.carteUsate.size : 0;
            const _burraco = opzData && opzData.mosse ? _makesBurraco(opzData.mosse) : false;
            // Premio pozzetto: si applica in fase pre-pozzetto (indipendentemente da faseVincoloMano)
            // scarti: rimane 1 carta in mano che viene scartata → carteRim=0
            // mano: tutte le carte usate nelle mosse → niente scarto
            if (!giocatore.haPozzetto && !_burraco) {
                const remAfterMoves = totalCarteD - _usate;
                const isPozzetto = scenario === 'scarti' ? remAfterMoves === 1 : remAfterMoves === 0;
                if (isPozzetto) pozzBonus = window.coeffScoreOpz.premioPozzetto || 0;
            }
            if (faseVincoloMano) {
                carteRim = totalCarteD - _usate - 1;
                if (scenario === 'scarti') {
                    rispettaVincolo = carteRim >= 1 || _burraco;
                } else {
                    rispettaVincolo = (totalCarteD - _usate) >= 1 || _burraco;
                }
            }
            if (verbose) {
                const rawLabel = opzIdx === -1 ? 'OPZ0' : 'OPZ' + (opzIdx + 1);
                const opzLabel = bLabelMap[rawLabel] ? bLabelMap[rawLabel] + 'B' : mLabelMap[rawLabel] ? mLabelMap[rawLabel] + 'M' : pLabelMap[rawLabel] ? pLabelMap[rawLabel] : rawLabel;
                if (faseVincoloMano) {
                    con.log(opzLabel + ' [' + scenario + '] → score=' + (opzScore + mazzBonus + pozzBonus).toFixed(1) + ' (opz=' + opzScore.toFixed(1) + (mazzBonus ? ' mazzo=+' + mazzBonus : '') + (pozzBonus ? ' pozzetto=+' + pozzBonus : '') + ') | scarto=' + scartoCarta + ' | rim=' + carteRim + (_burraco ? ' [BURRACO]' : '') + (pozzBonus ? ' [POZZETTO]' : '') + (rispettaVincolo ? '' : ' ⚠ viola vincolo'));
                } else {
                    con.log(opzLabel + ' → score=' + (opzScore + mazzBonus + pozzBonus).toFixed(1) + ' (opz=' + opzScore.toFixed(1) + (mazzBonus ? ' mazzo=+' + mazzBonus : '') + (pozzBonus ? ' pozzetto=+' + pozzBonus : '') + ') | scarto=' + scartoCarta + (_burraco ? ' [BURRACO]' : '') + (pozzBonus ? ' [POZZETTO]' : ''));
                }
            }
            const score = opzScore + mazzBonus + pozzBonus;

            candidati.push({ scenario, opzIdx, opz, score, opzScore, mazzBonus, pozzBonus, scarto: scoreRes?.cartaRef || null, scartoCarta, rispettaVincolo, carteRim, analisiData: d, _labelMaps: { bLabelMap, mLabelMap, pLabelMap }, _scoreRes: scoreRes });
        }
        con.groupEnd();
    }

    if (candidati.length === 0) { con.groupEnd(); return null; }

    // ===== OPZnC: sacrifica una carta per sbloccare la fase vincolata =====
    if (faseVincoloMano && !soloMano) {
        const dScarti = candidati.find(c => c.scenario === 'scarti')?.analisiData;
        if (dScarti) {
            const bestC = window._calcolaVariantiC(dScarti, game, giocatore, giocatoreIdx);
            if (bestC) {
                // Scarto reale: calcolaScartoPer su dScarti (carta sacrificata ancora candidata)
                const _cCUD = new Set();
                (dScarti.classifica || []).forEach(function(r) {
                    if (!r.cartaRef) return;
                    const oid = r.cartaRef._origineRef ? r.cartaRef._origineRef.id : r.cartaRef.id;
                    const used = (bestC.opz && bestC.opz.mosse || []).some(function(m) {
                        const refs = m.tipo === 'calata' ? [m.carta] : (m.carte || []);
                        return refs.some(function(c) { return c && (c._origineRef ? c._origineRef.id : c.id) === oid; });
                    });
                    if (used) _cCUD.add(r.cartaRef.id);
                });
                const _cVIdx = dScarti.opzioniScenario.length;
                dScarti.opzioniScenario.push({ mosse: [], carteUsate: _cCUD, descCarte: bestC.opzCLabel });
                window._analisiData = dScarti; window._analisiGiocatoreIdx = giocatoreIdx;
                const scartoC = window.calcolaScartoPer(_cVIdx, true);
                dScarti.opzioniScenario.pop();
                con.log(`[OPZnC] ${bestC.opzCLabel}: esclusa=${nomeC(bestC.cartaSacrificata)} scarto=${scartoC ? scartoC.carta : '?'} score=${bestC.score.toFixed(1)}`);
                candidati.push({
                    scenario: 'scarti',
                    opzIdx: bestC.opzIdx,
                    opz: bestC.opz,
                    score: bestC.score,
                    scartoCarta: scartoC ? scartoC.carta : nomeC(bestC.cartaSacrificata),
                    scarto: scartoC?.cartaRef || bestC.cartaSacrificata,
                    rispettaVincolo: true,
                    analisiData: dScarti,
                    isOpzC: true,
                    opzCLabel: bestC.opzCLabel
                });
            }
        }
    }

    // ===== OPZnV: pota le calate finali delle opzioni violanti per soddisfare il vincolo =====
    if (faseVincoloMano) {
        const _violantiScarti = candidati.filter(c => c.scenario === 'scarti' && !c.rispettaVincolo && c.opzIdx >= 0);
        if (_violantiScarti.length > 0) {
            const dScartiV = _violantiScarti[0].analisiData;
            const _totalCarteV = dScartiV ? dScartiV.classifica.filter(origMano).length : 0;
            window._analisiData = dScartiV;
            window._analisiScenario = 'scarti';
            window._analisiGiocatoreIdx = giocatoreIdx;
            const bestV = window._calcolaVariantiV(_violantiScarti, _totalCarteV);
            if (bestV) {
                // Calcola scarto sulla versione potata, con combo proiettate post-calata
                const _vIdx = bestV.analisiData.opzioniScenario.length;
                bestV.analisiData.opzioniScenario.push({ mosse: bestV.mosse, carteUsate: bestV.carteUsate });
                window._analisiData = bestV.analisiData; window._analisiGiocatoreIdx = giocatoreIdx;
                const _giocV = game.giocatori[giocatoreIdx];
                const _comboSqV = _giocV.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
                const _comboSqVProj = window._proiettaComboConCalate(_comboSqV, bestV.mosse);
                const scartoV = window.calcolaScartoPer(_vIdx, true, _comboSqVProj);
                bestV.analisiData.opzioniScenario.pop();
                const _srcLm = bestV.srcCand._labelMaps || {};
                const _srcRaw = bestV.srcCand.opzIdx === -1 ? 'OPZ0' : 'OPZ' + (bestV.srcCand.opzIdx + 1);
                const _srcLbl = (_srcLm.bLabelMap && _srcLm.bLabelMap[_srcRaw]) ? _srcLm.bLabelMap[_srcRaw] + 'B'
                    : (_srcLm.mLabelMap && _srcLm.mLabelMap[_srcRaw]) ? _srcLm.mLabelMap[_srcRaw] + 'M' : _srcRaw;
                const vLabel = _srcLbl + 'V';
                con.log('[OPZnV] ' + vLabel + ': potata da ' + _srcLbl + ' scarto=' + (scartoV ? scartoV.carta : '?') + ' score=' + bestV.score.toFixed(1) + ' rim=' + bestV.rimTrim);
                candidati.push({
                    scenario: 'scarti',
                    opzIdx: -1,
                    opz: { mosse: bestV.mosse, carteUsate: bestV.carteUsate },
                    score: bestV.score,
                    opzScore: bestV.score,
                    mazzBonus: 0,
                    pozzBonus: 0,
                    scartoCarta: scartoV ? scartoV.carta : '-',
                    scarto: scartoV ? scartoV.cartaRef : null,
                    rispettaVincolo: true,
                    carteRim: bestV.rimTrim,
                    analisiData: bestV.analisiData,
                    isOpzV: true,
                    opzVLabel: vLabel,
                    _labelMaps: {}
                });
            }
        }
    }

    candidati.sort((a, b) => b.score - a.score);
    const validati = candidati.filter(c => c.rispettaVincolo);
    const best = validati.length > 0 ? validati[0] : candidati[0];
    const usaFallback = validati.length === 0 && faseVincoloMano;

    con.log('--- TUTTI I CANDIDATI (ordinati per score) ---');
    // Risolve label display (OPZ0M, OPZ1, ecc.) per ogni candidato — usata anche in _diagData
    function _opzLabel(c, bLM, mLM, pLM) {
        if (c.opzCLabel) return c.opzCLabel;
        if (c.opzVLabel) return c.opzVLabel;
        const raw = c.opzIdx === -1 ? 'OPZ0' : 'OPZ' + (c.opzIdx + 1);
        if (bLM && bLM[raw]) return bLM[raw] + 'B';
        if (mLM && mLM[raw]) return mLM[raw] + 'M';
        if (pLM && pLM[raw]) return pLM[raw];
        return raw;
    }
    // Associa a ogni candidato le mappe label del suo scenario
    const _scenarioLabelMaps = {};
    for (const scenario of scenariDaUsare) {
        _scenarioLabelMaps[scenario] = candidati.find(c => c.scenario === scenario)?._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
    }
    candidati.forEach(c => {
        const marker = c === best ? ' ◄ MIGLIORE' : '';
        const vincTag = c.carteRim !== null && !c.rispettaVincolo ? ' ⚠' : '';
        const lm = c._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
        const lbl = _opzLabel(c, lm.bLabelMap, lm.mLabelMap, lm.pLabelMap);
        con.log('[' + c.scenario + '] ' + lbl + ' → score=' + c.score.toFixed(1) + ' (opz=' + (c.opzScore||0).toFixed(1) + (c.mazzBonus ? ' mazzo=+' + c.mazzBonus : '') + (c.pozzBonus ? ' pozzetto=+' + c.pozzBonus : '') + ') | scarto=' + (c.scartoCarta||'-') + vincTag + marker);
    });
    if (usaFallback) con.warn('Nessuna opzione lascia ≥1 carta in mano: scelto il miglior fallback disponibile.');
    if (best) {
        const bestLm = best._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
        const bestLbl = _opzLabel(best, bestLm.bLabelMap, bestLm.mLabelMap, bestLm.pLabelMap);
        con.log('→ SCELTA: [' + best.scenario + '] ' + bestLbl + ' → scarto: ' + (best.scartoCarta||'-') + ' (score=' + best.score.toFixed(1) + (best.carteRim !== null ? ', rim=' + best.carteRim : '') + ')');
    }
    con.groupEnd();

    // Lascia il contesto debug puntato sull'analisi scelta
    if (best) {
        window._analisiData = best.analisiData;
        window._analisiScenario = best.scenario;
        window._analisiGiocatoreIdx = giocatoreIdx;
    }

    // ===== Salva dati diagnostici in window._diagData =====
    const _fase = fase || (soloMano ? 'postPesca' : 'prePesca');
    window._diagData = window._diagData || {};
    window._diagData[_fase] = {
        giocatoreIdx: giocatoreIdx,
        giocatore: giocatore.nome || ('idx=' + giocatoreIdx),
        scenari: scenariDaUsare,
        candidati: candidati.map(c => {
            const lm = c._labelMaps || { bLabelMap: {}, mLabelMap: {} };
            return Object.assign({}, c, { label: _opzLabel(c, lm.bLabelMap, lm.mLabelMap) });
        }),
        best: best ? Object.assign({}, best, {
            label: _opzLabel(best, (best._labelMaps||{}).bLabelMap||{}, (best._labelMaps||{}).mLabelMap||{})
        }) : null,
        logLines: _diagLines.slice(),
        logPerOpz: {},   // verrà popolato on-demand al click colonna
        analisiDataPerScenario: _analisiDataPerScenario
    };
    // Propaga ai turni precedenti non ancora salvati
    if (_fase === 'postPesca') {
        window._diagData['prePesca'] = window._diagData['prePesca'] || window._diagData['postPesca'];
    }

    return best;
}

// ============================================================================
// SISTEMA MESSAGGI DEBUG
// ============================================================================

let messaggioOverlay = null;

function mostraMessaggio(testo, tipo = 'info') {
    // Prova a tradurre se è una chiave, altrimenti usa il testo così com'è
    let msg = testo;
    if (window.currentLang === 'en') {
        const lower = testo.toLowerCase().trim();
        if (lower === 'pescare prima di scartare') msg = window.t('msg-pesca-scarto');
        else if (lower === 'pescare prima di attaccare') msg = window.t('msg-pesca-attacco');
        else if (lower === 'non puoi scartare la carta appena pescata dagli scarti') msg = window.t('msg-scarto-vietato');
        else if (lower === 'serve almeno un burraco per chiudere') msg = window.t('msg-serve-burraco');
        else if (lower === 'mazzo quasi esaurito! ultimo turno!') msg = window.t('msg-mazzo-quasi-finito');
        else {
            // Se non è una delle frasi fisse, prova a vedere se è già una chiave
            msg = window.t(testo);
        }
    }

    console.log('📢 mostraMessaggio() - Lingua:', window.currentLang, '| Input:', testo, '| Output:', msg);
    // Crea l'overlay se non esiste
    if (!messaggioOverlay) {
        console.log('📢 Creando nuovo overlay...');
        messaggioOverlay = document.createElement('div');
        messaggioOverlay.id = 'debug-messaggio-overlay';
        messaggioOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 15px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            background: ${tipo === 'info' ? '#2196F3' : '#f44336'};
            color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(messaggioOverlay);
        console.log('📢 Overlay creato e aggiunto al body');
    }

    messaggioOverlay.textContent = msg;
    messaggioOverlay.style.display = 'block';
    messaggioOverlay.style.background = tipo === 'info' ? '#2196F3' : '#f44336';
    console.log('📢 Overlay aggiornato. Display:', messaggioOverlay.style.display);
    console.log('📢 Overlay elemento:', messaggioOverlay);
}

function nascondiMessaggio() {
    if (messaggioOverlay) {
        messaggioOverlay.style.display = 'none';
    }
}

// Event listener per il debug AI
document.addEventListener('keydown', (e) => {
    // SPAZIO: continua l'AI dopo la pausa
    if (game.debugAI && e.code === 'Space' && !game.debugAIContinua) {
        e.preventDefault();
        game.debugAIContinua = true;
    }

    // D: attiva/disattiva modalità debug AI
    if (e.code === 'KeyD' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Non attivare se stiamo scrivendo in un input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }
        game.debugAI = !game.debugAI;
        mostraMessaggio(
            game.debugAI ? 'Debug AI ATTIVATO - Premi D per disattivare' : 'Debug AI DISATTIVATO',
            'info'
        );
        setTimeout(nascondiMessaggio, 2000);
    }
});

function getGiocatoreHTML(indiceGiocatore, ruolo, defaultScenario) {
    // Nota: questa funzione genera solo la shell della debug window.
    // Tutto il contenuto (analisi parallela) viene renderizzato inline da mostraAnalisiParallela.

    return `<!DOCTYPE html>
<html>
<head>
    <title>${ruolo}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, sans-serif;
            font-size: 13px;
            background: linear-gradient(135deg, #2a5a3a 0%, #1a4a2a 100%);
            color: #fff;
            min-height: 100vh;
            padding: 12px;
        }
        .container { max-width: 1080px; }
        .tre-colonne { display: flex; gap: 12px; }
        .colonna { flex: 1; min-width: 0; }
        .colonna-log { flex: 1.2; min-width: 0; } /* Colonna log leggermente più larga */
        .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .ruolo { font-size: 16px; color: #ffd700; font-weight: bold; }

        /* Personaggio compatto */
        .personaggio {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }
        .avatar {
            width: 50px; height: 50px;
            border-radius: 50%;
            border: 2px solid #ffd700;
            object-fit: cover;
            flex-shrink: 0;
        }
        .info-base { flex: 1; min-width: 0; }
        .nome { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .desc { font-style: italic; color: #aaa; font-size: 11px; line-height: 1.3; }

        /* Sezioni */
        .sezione {
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(0,0,0,0.15);
            border-radius: 6px;
        }
        .sezione-titolo {
            font-size: 11px;
            color: #ffd700;
            font-weight: bold;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Coefficienti griglia compatta (3 colonne per 15 coefficienti) */
        .coeff-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 4px 10px;
        }
        .coeff-item { display: flex; align-items: center; gap: 4px; }
        .coeff-label { width: 70px; text-align: right; color: #bbb; font-size: 10px; }
        .coeff-bar { flex: 1; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; min-width: 40px; }
        .coeff-fill { height: 100%; background: linear-gradient(90deg, #4a9 0%, #ffd700 100%); border-radius: 4px; }
        .coeff-value { width: 18px; text-align: center; color: #fff; font-size: 10px; font-weight: bold; }

        /* Osservazioni */
        .oss-empty { color: #888; font-style: italic; font-size: 11px; }
        .oss-item { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
        .oss-label { color: #bbb; }
        .oss-value { color: #fff; font-weight: bold; }

        /* Combinazioni e attacchi */
        .combo-info { display: flex; justify-content: space-between; font-size: 10px; color: #aaa; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .combo-list { display: flex; flex-direction: column; gap: 3px; max-height: 150px; overflow-y: auto; }
        .combo-item { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 3px; font-size: 10px; }
        .combo-item.tris { background: rgba(255,100,100,0.15); border-left: 2px solid #f66; }
        .combo-item.scala { background: rgba(100,150,255,0.15); border-left: 2px solid #69f; }
        .combo-item.calata { background: rgba(100,255,100,0.15); border-left: 2px solid #6f6; }
        .combo-tipo { font-weight: bold; color: #ffd700; width: 12px; }
        .combo-desc { flex: 1; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .combo-punti { color: #ffd700; font-weight: bold; min-width: 30px; text-align: right; }
        .combo-legenda { font-size: 9px; color: #777; margin-top: 6px; text-align: center; }

        /* Stato */
        .strat-item { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
        .strat-label { color: #bbb; }
        .strat-value { color: #fff; font-weight: bold; }

        /* Opzioni di Gioco */
        .obj-item { display: flex; align-items: center; gap: 6px; margin: 4px 0; padding: 2px 4px; border-radius: 3px; }
        .obj-item.combo { background: rgba(100,200,100,0.15); border-left: 2px solid #4a9; }
        .obj-rank { width: 20px; font-size: 10px; color: #888; flex-shrink: 0; }
        .obj-nome { flex: 1; font-size: 10px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .obj-bar { width: 40px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
        .obj-fill { height: 100%; background: linear-gradient(90deg, #f80 0%, #0f0 100%); }
        .obj-pri { width: 28px; text-align: right; font-size: 10px; color: #ffd700; font-weight: bold; flex-shrink: 0; }

        /* Log */
        .log-scroll { max-height: 450px; overflow-y: auto; }
        .log-item { margin: 4px 0; font-size: 11px; line-height: 1.4; padding: 2px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; }
        .log-turno { color: #888; margin-right: 6px; font-weight: bold; flex-shrink: 0; }
        .log-msg { color: #ddd; flex: 1; }
        .log-clickable { cursor: pointer; background: rgba(255,215,0,0.1); border-radius: 3px; }
        .log-clickable:hover { background: rgba(255,215,0,0.25); }
        .log-icon { margin-left: 6px; font-size: 12px; flex-shrink: 0; }

        /* Modal dettagli */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: linear-gradient(135deg, #1a4a2a 0%, #0d2d1a 100%); border: 2px solid #ffd700; border-radius: 10px; padding: 16px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); }
        .modal-title { font-size: 16px; font-weight: bold; color: #ffd700; }
        .modal-close { cursor: pointer; font-size: 20px; color: #888; }
        .modal-close:hover { color: #fff; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .modal-col { background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px; }
        .modal-col-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .modal-col-title.selected { color: #4f4; }
        .modal-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
        .modal-label { color: #aaa; }
        .modal-value { color: #fff; font-weight: bold; }
        .modal-total { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 14px; }
        .modal-footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; color: #888; }
    </style>
</head>
<body style="margin:0;padding:0;background:#0a1628;">
    <div id="debug-topbar" style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:#111;border-bottom:1px solid #333;font-size:11px;color:#888;">
        <span>${ruolo}</span>
        <button onclick="scaricaStatoJSON()" style="background:#2a5;border:none;border-radius:3px;color:#fff;padding:3px 8px;cursor:pointer;font-size:10px;">⬇️ JSON</button>
    </div>
    <div id="analisi-root"></div>
    <script>

        window.mostraAnalisiParallela = function(giocatoreIdx, scenario) {
            try {
                if (!window.opener || !window.opener.game || !window.opener.Strategia) {
                    alert('Impossibile agganciarsi al gioco base!');
                    return;
                }
                
                // Imposta scenario di default se non passato
                scenario = scenario || 'scarti';

                // Usa d pre-calcolato da _diagData (stato al momento della decisione AI)
                var _diagOpener = window.opener._diagData;
                var _diagFase = null, _diagPhaseData = null;
                if (_diagOpener) {
                    // Per scenario 'mano' preferire postPesca (mano dopo aver pescato) su prePesca,
                    // MA solo se postPesca appartiene allo stesso giocatore (stesso turno).
                    // Se postPesca è di un turno precedente (giocatore diverso), usare prePesca.
                    var _faseOrder = ['prePesca', 'postPesca', 'postPozzetto'];
                    if (scenario === 'mano') {
                        var _postP = _diagOpener['postPesca'];
                        var _preP  = _diagOpener['prePesca'];
                        var _samePlayer = _postP && _preP && _postP.giocatoreIdx === _preP.giocatoreIdx;
                        if (_samePlayer) _faseOrder = ['postPesca', 'postPozzetto', 'prePesca'];
                    }
                    _faseOrder.forEach(function(f) {
                        if (!_diagFase && _diagOpener[f] && _diagOpener[f].analisiDataPerScenario &&
                                _diagOpener[f].analisiDataPerScenario[scenario]) {
                            _diagFase = f;
                            _diagPhaseData = _diagOpener[f];
                        }
                    });
                }
                var d;
                if (_diagPhaseData) {
                    var _dStored = _diagPhaseData.analisiDataPerScenario[scenario];
                    // Crea copia di lavoro per non mutare il d salvato in _diagData
                    d = Object.assign({}, _dStored, {
                        classifica: _dStored.classifica.map(function(r) {
                            return Object.assign({}, r, { breakdown: (r.breakdown || []).slice() });
                        }),
                        opzioniScenario: _dStored.opzioniScenario.slice()
                    });
                } else {
                    var g = window.opener.game.giocatori[giocatoreIdx];
                    d = window.opener.Strategia.generaAnalisiParallela(g, scenario);
                }
                window._analisiData = d;
                window._analisiGiocatoreIdx = giocatoreIdx;
                window._analisiScenario = scenario;
                
                var bodyHTML = '';
                
                // Ordinamento GLOBALE (default = punteggio)
                if (!window.analisiSortPath) window.analisiSortPath = 'numero';

                // Menu Header con Scenari
                var btnStyle = 'padding:6px 12px; margin-right:8px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;';
                var btnMano = scenario === 'mano' ? 'background:#4a9; color:#fff;' : 'background:#244; color:#8aa;';
                var btnScarti = scenario === 'scarti' ? 'background:#f80; color:#fff;' : 'background:#430; color:#aa6;';
                var btnAttivo = 'border:2px solid #fff;';

                var _mostraScartBtn = !_diagFase || _diagFase === 'prePesca';
                bodyHTML += '<div style="padding:12px; border-bottom:1px solid #444; background:rgba(0,0,0,0.3); display:flex; flex-wrap:wrap; align-items:center; gap:8px;">' +
                    '<div style="font-size:12px; color:#ccc; margin-right:12px;">Sandbox: <strong style="color:#fff;">' + d.giocatore + '</strong></div>' +
                    (_mostraScartBtn ? '<button onclick="mostraAnalisiParallela(' + giocatoreIdx + ', &apos;scarti&apos;)" style="' + btnStyle + btnScarti + '">+ Predizione Scarti</button>' : '') +
                    '<button onclick="mostraAnalisiParallela(' + giocatoreIdx + ', &apos;mano&apos;)" style="' + btnStyle + btnMano + '">Solo Mano</button>' +
                    '<div style="width:1px; height:24px; background:#555; margin:0 4px;"></div>' +
                    '<button onclick="window.analisiSortPath=&apos;numero&apos;; mostraAnalisiParallela(' + giocatoreIdx + ', &apos;' + scenario + '&apos;)" style="' + btnStyle + 'background:#334;color:#aaa;' + (window.analisiSortPath==='numero'?btnAttivo:'') + '">Ord. Numero</button>' +
                    '<button onclick="window.analisiSortPath=&apos;seme&apos;; mostraAnalisiParallela(' + giocatoreIdx + ', &apos;' + scenario + '&apos;)" style="' + btnStyle + 'background:#334;color:#aaa;' + (window.analisiSortPath==='seme'?btnAttivo:'') + '">Ord. Seme</button>' +
                    '<div style="width:1px; height:24px; background:#555; margin:0 8px;"></div>' +
                    '<button onclick="mostraCoefficienti()" style="' + btnStyle + 'background:#334;color:#adf;">⚙ Coeff</button>' +
                    '<button onclick="elaboraOpz()" style="' + btnStyle + 'background:#353;color:#afa;">&#9654; Elabora</button>' +
                '</div>';
                
                if (d.classifica && d.classifica.length > 0 && d.classifica[0].breakdown) {
                    // 1. Etichette Uniche
                    var labelsMap = {};
                    for (var r = 0; r < d.classifica.length; r++) {
                        var cb = d.classifica[r].breakdown;
                        if (cb) {
                            for (var b = 0; b < cb.length; b++) {
                                labelsMap[cb[b].label] = true;
                            }
                        }
                    }
                    var uniqueLabels = [];
                    var uniqueOpzLabels = [];
                    var labelsKeys = Object.keys(labelsMap).sort();
                    for(var k=0; k<labelsKeys.length; k++) {
                        if (labelsKeys[k].startsWith('OPZ')) {
                            // Ordinamento numerico OPZ1, OPZ10...
                            if (!uniqueOpzLabels.includes(labelsKeys[k])) uniqueOpzLabels.push(labelsKeys[k]);
                        } else {
                            uniqueLabels.push(labelsKeys[k]);
                        }
                    }
                    // Assicura che tutte le opzioni in d.opzioniScenario abbiano una label
                    // (alcune opzioni con score=0 non compaiono nel breakdown e sarebbero ignorate dall'OPZnB block)
                    if (d && d.opzioniScenario) {
                        d.opzioniScenario.forEach(function(_, i) {
                            var lbl = 'OPZ' + (i + 1);
                            if (!uniqueOpzLabels.includes(lbl)) uniqueOpzLabels.push(lbl);
                        });
                    }
                    uniqueOpzLabels.sort((a,b) => parseInt(a.replace('OPZ','')) - parseInt(b.replace('OPZ','')));

                    // Nota: la deduplicazione è già applicata a monte in generaOpzioniGioco (burraco-core.js)
                    var noOpz = uniqueOpzLabels.length === 0;
                    if (noOpz) uniqueOpzLabels.push('OPZ0');

                    var alphabet = 'ABDEFGHIKLMNOPQRUVWXYZ'; 
                    var accLettera = 0;
                    var labelToLetter = {};
                    var labelUsaMatta = {}; // Traccia se la combo usa matta
                    for (var l = 0; l < uniqueLabels.length; l++) {
                        var lbl = uniqueLabels[l];
                        
                        // Cerco nei breakdown se questa etichetta ha usaMatta = true
                        var usaMatta = false;
                        for (var r1 = 0; r1 < d.classifica.length; r1++) {
                            var cb1 = d.classifica[r1].breakdown;
                            if (cb1) {
                                var found = cb1.find(b => b.label === lbl);
                                if (found && found.usaMatta) usaMatta = true;
                            }
                        }
                        labelUsaMatta[lbl] = usaMatta;

                        var charCode = '';
                        if (lbl.startsWith('T') && !isNaN(lbl.charAt(1))) {
                            charCode = lbl.split(' ')[0]; // Es: T1
                        } else if (lbl.startsWith('S') && !isNaN(lbl.charAt(1))) {
                            charCode = lbl.split(' ')[0]; // Es: S1
                        } else if (lbl.startsWith('C (Attacco')) {
                            charCode = 'C';
                        } else {
                            charCode = (accLettera < alphabet.length) ? alphabet.charAt(accLettera++) : accLettera;
                        }
                        labelToLetter[lbl] = charCode;
                    }

                    // 2. Legende in layout Flex
                    bodyHTML += '<div style="display:flex; flex-wrap:wrap; gap:20px; padding:8px 12px; border-bottom:1px solid #444">' +
                        // -- LEGENDA METRICHE PURE
                        '<div style="flex:1; min-width:300px;">' +
                        '<div style="font-size:13px;font-weight:bold;margin-bottom:8px;color:#ddd">Legenda Metriche Pure:</div>' +
                        '<table style="font-size:11px;border-collapse:collapse;width:100%">';
                    for (var l2 = 0; l2 < uniqueLabels.length; l2++) {
                        var key = uniqueLabels[l2];
                        var coeffStr = '';
                        for (var rr = 0; rr < d.classifica.length; rr++) {
                            var cbb = d.classifica[rr].breakdown;
                            if (cbb) {
                                for (var bb = 0; bb < cbb.length; bb++) {
                                    if (cbb[bb].label === key && cbb[bb].coeffStr) {
                                        coeffStr = ' <span style="color:#858; font-size:9px;">[' + cbb[bb].coeffStr + ']</span>';
                                        break;
                                    }
                                }
                            }
                            if (coeffStr !== '') break;
                        }
                        bodyHTML += '<tr style="border-bottom:1px solid #333">' +
                            '<td style="padding:2px 4px; color:#4a9; font-weight:bold; width:20px;">' + labelToLetter[key] + '</td>' +
                            '<td style="padding:2px 4px; color:#bbb">' + key + coeffStr + '</td>' +
                        '</tr>';
                    }
                    bodyHTML += '</table></div>';
                    
                    // -- LEGENDA OPZIONI DI GIOCO API
                    if (uniqueOpzLabels.length > 0) {
                        bodyHTML += '<div style="flex:1; min-width:300px; border-left:1px dashed #555; padding-left:12px;">' +
                        '<div style="font-size:13px;font-weight:bold;margin-bottom:8px;color:#ddd">Opzioni di Gioco Globali:</div>' +
                        '<table style="font-size:11px;border-collapse:collapse;width:100%">';
                        
                        var opzioniTopInfo = [];
                        if (giocatoreIdx !== undefined && window.opener && window.opener.game) {
                            var pOss = window.opener.game.giocatori[giocatoreIdx].osservazioni;
                            opzioniTopInfo = (pOss && pOss.analisiVirtuale && scenario !== 'mano') 
                                ? pOss.analisiVirtuale.opzioniGioco 
                                : (pOss ? pOss.opzioniGioco : []);
                        }

                        for (var lOpz = 0; lOpz < uniqueOpzLabels.length; lOpz++) {
                            var opzKey = uniqueOpzLabels[lOpz];
                            var idxOpz = parseInt(opzKey.replace('OPZ','')) - 1;
                            var descOpz = idxOpz === -1 ? 'Nessuna combinazione calabile' : 'Opzione Generica';
                            if (idxOpz >= 0 && d.opzioniScenario && idxOpz < d.opzioniScenario.length) {
                                descOpz = d.opzioniScenario[idxOpz].descCarte || descOpz;
                            } else if (idxOpz >= 0 && opzioniTopInfo && idxOpz < opzioniTopInfo.length) {
                                descOpz = opzioniTopInfo[idxOpz].descCarte || descOpz;
                            }
                            
                            bodyHTML += '<tr style="border-bottom:1px solid #333; cursor:pointer;" onclick="analizzaOpz(' + idxOpz + ')" title="Clicca per dettaglio scarto e score su console">' +
                                '<td style="padding:2px 4px; color:#dd6; font-weight:bold; width:30px;">' + opzKey + '</td>' +
                                '<td style="padding:2px 4px; color:#bbb">' + descOpz + '</td>' +
                                '<td style="padding:2px 4px; color:#888; font-size:10px; width:20px; text-align:center;">🎯</td>' +
                            '</tr>';
                        }
                        bodyHTML += '</table></div>';
                    }
                    // -- TERZA COLONNA: Carte utili agli avversari
                    if (d.attacchiAvversari && d.attacchiAvversari.length > 0) {
                        bodyHTML += '<div style="flex:1; min-width:220px; border-left:1px dashed #855; padding-left:12px;">' +
                            '<div style="font-size:13px;font-weight:bold;margin-bottom:8px;color:#f88">&#9888; Utili agli avversari:</div>' +
                            '<table style="font-size:11px;border-collapse:collapse;width:100%">';
                        for (var av = 0; av < d.attacchiAvversari.length; av++) {
                            var avv = d.attacchiAvversari[av];
                            var avvColore = avv.lunghezzaRaggiunta >= 7 ? '#f00' : avv.lunghezzaRaggiunta >= 5 ? '#f88' : '#f44';
                            bodyHTML += '<tr style="border-bottom:1px solid #333">' +
                                '<td style="padding:2px 4px; color:#f88; font-weight:bold; width:30px;">' + avv.carta + '</td>' +
                                '<td style="padding:2px 4px; color:#999; font-size:10px;">' + avv.comboDesc + '</td>' +
                                '<td style="padding:2px 4px; color:' + avvColore + '; font-weight:bold; width:28px; text-align:center;" title="Lunghezza combo avversaria dopo calata">' + avv.lunghezzaRaggiunta + avv.tipoCombo + '</td>' +
                            '</tr>';
                        }
                        bodyHTML += '</table></div>';
                    }

                    bodyHTML += '</div>'; // Chiude contenitore Flex Legende

                    // 3. Tabella a Matrice (Header unito)
                    var tutteLeColonneAVisualizzare = uniqueOpzLabels; // metric columns removed, replaced by combo columns below

                    // ============================================================
                    // COLONNE COMBO: estensione massima delle combo in campo
                    // ============================================================
                    var _gameC = window.opener.game;
                    var _giocC = _gameC.giocatori[giocatoreIdx];
                    var _comboSquadra = _giocC.squadra === 0 ? _gameC.combinazioniNoi : _gameC.combinazioniLoro;
                    var _origManoC = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
                    var _allFisicheClf = d.classifica.filter(function(r) { return _origManoC(r) && !r.isMatta && r.cartaRef; }).map(function(r) { return r.cartaRef; });
                    var _matteHandClf = d.classifica.filter(function(r) { return _origManoC(r) && r.isMatta; }).length;

                    function _calcolaEstensione(combo) {
                        var fisicheCombo = combo.carte.filter(function(c) { return !c.isPinella && !c.isJolly; });
                        var matteCombo = combo.carte.length - fisicheCombo.length;
                        if (fisicheCombo.length === 0) return null;
                        if (combo.tipo === 1) {
                            var numTris = fisicheCombo[0].numero;
                            var attachable = _allFisicheClf.filter(function(c) { return c.numero === numTris; });
                            var maxLen = combo.carte.length + attachable.length;
                            return { maxCon: maxLen, maxSenza: maxLen, usedIds: new Set(attachable.map(function(c) { return c.id; })), mattaReplacerIds: new Set() };
                        }
                        var semeSc = fisicheCombo[0].seme;
                        var physComboNums = fisicheCombo.map(function(c) { return c.numero; }).sort(function(a,b){return a-b;});
                        // Asso-alto: se la combo ha Asso(1) con carte ≥10, rimappalo a 14
                        // (es. JF QF KF AF → [11,12,13,14] invece di [1,11,12,13])
                        if (physComboNums[0] === 1 && physComboNums.some(function(n){ return n >= 10; })) {
                            physComboNums = physComboNums.slice(1).concat([14]).sort(function(a,b){return a-b;});
                        }
                        var comboMinSc = physComboNums[0], comboMaxSc = physComboNums[physComboNums.length-1];
                        var sameSemeHand = _allFisicheClf.filter(function(c) { return c.seme === semeSc; });
                        // Asso-alto in mano: se il contesto è scala alta (combo con carte ≥10),
                        // un Asso in mano può attaccarsi come 14 (es. AF su scala ...QF KF)
                        var _comboHasHighCards = physComboNums.some(function(n){ return n >= 10; });
                        var _assoManoAlto = _comboHasHighCards && sameSemeHand.some(function(c){ return c.numero === 1; });
                        var _maxHi = (_comboHasHighCards || comboMaxSc >= 10) ? 14 : 13;
                        var physAllNums = physComboNums.concat(sameSemeHand.map(function(c) { return c.numero; }));
                        if (_assoManoAlto && physAllNums.indexOf(14) === -1) physAllNums.push(14); // posizione virtuale 14 per Asso in mano
                        physAllNums = physAllNums.filter(function(n, idx, a) { return a.indexOf(n) === idx; }).sort(function(a,b){return a-b;});
                        function findMaxWin(matteAvail) {
                            var bestLen = combo.carte.length, bestLo = comboMinSc, bestHi = comboMaxSc;
                            for (var lo = comboMinSc; lo >= 1; lo--) {
                                for (var hi = comboMaxSc; hi <= _maxHi; hi++) {
                                    var physInWin = 0;
                                    for (var pk = 0; pk < physAllNums.length; pk++) { if (physAllNums[pk] >= lo && physAllNums[pk] <= hi) physInWin++; }
                                    var gaps = (hi - lo + 1) - physInWin;
                                    if (gaps <= matteAvail && (hi - lo + 1) > bestLen) { bestLen = hi - lo + 1; bestLo = lo; bestHi = hi; }
                                }
                            }
                            return { len: bestLen, lo: bestLo, hi: bestHi };
                        }
                        // Una combo può avere al massimo 1 matta (regola burraco)
                        var resCon = findMaxWin(Math.min(1, matteCombo + _matteHandClf));
                        var resSenza = findMaxWin(Math.min(1, matteCombo));
                        // usedIds solo se c'è estensione reale rispetto alla combo originale
                        // dedup per numero effettivo (Asso→14 se finestra arriva a 14)
                        var usedIdsSc;
                        if (resCon.len > combo.carte.length) {
                            var _seenNums = {};
                            usedIdsSc = new Set(sameSemeHand.filter(function(c) {
                                // Asso in mano trattato come 14 se la finestra ottimale arriva a 14
                                var nEff = (_assoManoAlto && c.numero === 1 && resCon.hi === 14) ? 14 : c.numero;
                                if (nEff < resCon.lo || nEff > resCon.hi) return false;
                                if (_seenNums[nEff]) return false;
                                _seenNums[nEff] = true;
                                return true;
                            }).map(function(c) { return c.id; }));
                            // Aggiunge anche il Jolly/Pinella in mano se serve per riempire un gap
                            if (_matteHandClf > 0) {
                                var _covNums = {}; physComboNums.forEach(function(n){_covNums[n]=true;});
                                sameSemeHand.forEach(function(c){
                                    var nEff2 = (_assoManoAlto && c.numero===1 && resCon.hi===14) ? 14 : c.numero;
                                    if(nEff2>=resCon.lo&&nEff2<=resCon.hi) _covNums[nEff2]=true;
                                });
                                var _needsMatta = false;
                                for (var _gn=resCon.lo; _gn<=resCon.hi; _gn++) { if (!_covNums[_gn]) { _needsMatta=true; break; } }
                                if (_needsMatta) {
                                    var _mattaClf = d.classifica.find(function(r){ return _origManoC(r) && r.isMatta; });
                                    if (_mattaClf) usedIdsSc.add(_mattaClf.cartaRef.id);
                                }
                            }
                        } else {
                            usedIdsSc = new Set();
                        }
                        // mattaReplacerIds: carte che liberano una matta, ma solo se effettivamente usate nell'estensione
                        var mattaRepIds = new Set();
                        if (matteCombo > 0 && usedIdsSc.size > 0) {
                            for (var mri = 0; mri < physComboNums.length - 1; mri++) {
                                var gLo = physComboNums[mri] + 1, gHi = physComboNums[mri+1] - 1;
                                if (gHi >= gLo) { sameSemeHand.forEach(function(c) { if (usedIdsSc.has(c.id) && c.numero >= gLo && c.numero <= gHi) mattaRepIds.add(c.id); }); }
                            }
                        }
                        return { maxCon: resCon.len, maxSenza: resSenza.len, usedIds: usedIdsSc, mattaReplacerIds: mattaRepIds };
                    }
                    var _comboEstensioni = _comboSquadra.map(function(combo) { return _calcolaEstensione(combo); });
                    // Mostra solo combo con almeno una carta attaccabile
                    var _comboVis = _comboSquadra.map(function(c, i) { return { combo: c, est: _comboEstensioni[i] }; })
                        .filter(function(x) { return x.est && x.est.usedIds.size > 0; });
                    function _premioBaseCombo(tipoNum, n) {
                        var cf = window.coeffScoreOpz || {};
                        if (n < 3) return 0;
                        var p = tipoNum === 1 ? (cf.premioTris || 10) : (cf.premioScala || 20);
                        if (n >= 4) p += (cf.premio4c || 10);
                        if (n >= 5) p += (cf.premio5c || 20);
                        if (n >= 6) p += (cf.premio6c || 40);
                        if (n >= 7) p += (cf.premioBurraco || 100);
                        if (n >= 8) p += (n - 7) * (cf.premioOltreBurraco || 0);
                        return p;
                    }
                    function _labelCombo(combo) {
                        var fis = combo.carte.filter(function(c) { return !c.isPinella && !c.isJolly; });
                        var n = combo.carte.length;
                        return n + (combo.tipo === 1 ? 'T' + (fis.length > 0 ? fis[0].numero : '?') : 'S' + (fis.length > 0 ? fis[0].seme : '?'));
                    }

                    var opzBPreCalc = {}; // var qui: hoistata a funzione, inizializzata prima della sezione OPZnB
                    var _bLabelMap = {};  // bLabel -> origLabel (per display header; popolato da OPZnB block)
                    var _mLabelMap = {};  // mLabel -> display M label (es. 'OPZ5' -> 'OPZ1M'; popolato da OPZnM block)

                    // Ordinamento GLOBALE (default = punteggio)
                    // Ordina dal più alto (più scartabile) al più basso. L'ui js è indipendente.
                    d.classifica.sort((a, b) => {
                        if (window.analisiSortPath === 'punteggio') {
                            return b.punteggio - a.punteggio;
                        } else if (window.analisiSortPath === 'numero') {
                            var vA = a.cartaRef ? a.cartaRef.numero : 0;
                            var vB = b.cartaRef ? b.cartaRef.numero : 0;
                            if (vA === vB) {
                                var sA = a.cartaRef ? a.cartaRef.seme : '';
                                var sB = b.cartaRef ? b.cartaRef.seme : '';
                                return sA.localeCompare(sB);
                            }
                            return vA - vB;
                        } else if (window.analisiSortPath === 'seme') {
                            var sA = a.cartaRef ? a.cartaRef.seme : '';
                            var sB = b.cartaRef ? b.cartaRef.seme : '';
                            if (sA === sB) {
                                var vA = a.cartaRef ? a.cartaRef.numero : 0;
                                var vB = b.cartaRef ? b.cartaRef.numero : 0;
                                return vA - vB;
                            }
                            return sA.localeCompare(sB);
                        }
                    });

                    // Inizializzazione Palette Colori Autogenerati per OPZ
                    var currentOpzColorIdx = 0;
                    var assignedOpzColors = {}; // Mappa comboSegreta -> bgColor
                    // Array di 9 colori vivaci ma con opacità media (0.65) per leggibilità. Azzurro escluso (riservato matte).
                    var opzPalette = [
                        'rgba(255, 0, 0, 0.65)',      // Rosso Primario
                        'rgba(218, 165, 32, 0.65)',   // Oro / Ocra (Al posto dell'azzurro)
                        'rgba(255, 230, 0, 0.65)',    // Giallo Sole
                        'rgba(0, 210, 0, 0.65)',      // Verde Brillante
                        'rgba(255, 140, 0, 0.65)',    // Arancione Forte
                        'rgba(0, 128, 128, 0.65)',    // Teal / Verdeacqua scuro (al posto del blu scuro)
                        'rgba(180, 255, 0, 0.65)',    // Verde Lime (Acido)
                        'rgba(255, 105, 180, 0.65)',  // Hot Pink
                        'rgba(180, 100, 50, 0.65)'    // Marrone Rame
                    ];
                    var opzColorCalata = 'rgba(160, 100, 240, 0.4)'; // Colore pervasivo fisso (Violetto) per Attacchi (tutti) - Rimane semi-trasparente per supportare l'alpha scalabile? Utente ha detto "Non usare il viola/fucsia già usato per i doppioni". Aspetta, l'utente ha detto: "Non metterei il viola/fucsia già usato per i doppioni".
                    // Sostituiamo il Violetto (Calate) con un grigio o un blu scuro se richiesto, oppure lasciamo l'Alpha del targetBadge.
                    // "falli totalmente opachi" -> Tolgo del tutto il violetto scalabile? O lo tengo scalabile ma con tonalità diversa? L'utente dice "Non usare viola/fucsia".
                    // Cambio base calata in opaco grigio piombo, scalando la luminosità anziché alpha.
                    // Aspetta, manteniamo opzPalette intatta per le combo, e cambiamo rendering.

                    // Pre-calcola scarto consigliato per ogni OPZ (usato per highlight celle)
                    var scartiPreCalc = {};
                    var scoreOpzPreCalc = {};
                    var statOpzPreCalc = {};

                    // Totali matte e carte per tutto il turno (base per calcoli residui)
                    var _originiMano = function(r) { return r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo'; };
                    var _totalMatteDisp = d.classifica.filter(function(r) { return _originiMano(r) && r.isMatta; }).length;
                    var _totalCarteDisp = d.classifica.filter(_originiMano).length;
                    // Mappa id -> isMatta per lookup rapido
                    var _idIsMatta = {};
                    d.classifica.forEach(function(r) { if (r.cartaRef) _idIsMatta[r.cartaRef.id] = r.isMatta; });

                    // Scale in campo (usate per scalabili noi / scalabili loro)
                    var _game2 = window.opener.game;
                    var _gioc2 = _game2.giocatori[giocatoreIdx];
                    var _scalaNoi  = (_gioc2.squadra === 0 ? _game2.combinazioniNoi  : _game2.combinazioniLoro).filter(function(cb) { return cb.tipo !== 1; });
                    var _scalaLoro = (_gioc2.squadra === 0 ? _game2.combinazioniLoro : _game2.combinazioniNoi ).filter(function(cb) { return cb.tipo !== 1; });

                    // Per scenario 'mano', il premioMazzo (+5) viene aggiunto sopra il punteggio opzione
                    var _mazzoBonusDisplay = (window._analisiScenario === 'mano' && window.coeffScoreOpz && window.coeffScoreOpz.premioMazzo !== undefined)
                        ? window.coeffScoreOpz.premioMazzo : 0;

                    for (var scPre = 0; scPre < uniqueOpzLabels.length; scPre++) {
                        var opzLblPre = uniqueOpzLabels[scPre];
                        var opzIdxPre = parseInt(opzLblPre.replace('OPZ','')) - 1;
                        var _rawScore = window.calcolaScoreOpz(opzIdxPre, true) || null;
                        if (_rawScore && _mazzoBonusDisplay) {
                            _rawScore = Object.assign({}, _rawScore, { score: _rawScore.score + _mazzoBonusDisplay });
                        }
                        scoreOpzPreCalc[opzLblPre] = _rawScore;
                        scartiPreCalc[opzLblPre] = scoreOpzPreCalc[opzLblPre] ? { carta: scoreOpzPreCalc[opzLblPre].cartaScarto, cartaRef: scoreOpzPreCalc[opzLblPre].cartaRef } : null;

                        var _opt = opzIdxPre === -1 ? { carteUsate: new Set() } : (d.opzioniScenario ? d.opzioniScenario[opzIdxPre] : null);
                        if (_opt) {
                            var _matteUs = 0;
                            if (_opt.carteUsate) { _opt.carteUsate.forEach(function(id) { if (_idIsMatta[id]) _matteUs++; }); }
                            var _nUsate = _opt.carteUsate ? _opt.carteUsate.size : 0;

                            // Carte rimanenti fisiche (non usate in OPZ, non matte, esclusa la carta da scartare)
                            // (usate solo per scalNoi/scalLoro — orfane viene da calcolaScoreOpz)
                            var _scartoId = (scartiPreCalc[opzLblPre] && scartiPreCalc[opzLblPre].cartaRef) ? scartiPreCalc[opzLblPre].cartaRef.id : null;
                            var _carteRimFis = d.classifica.filter(function(r) {
                                return _originiMano(r) && !r.isMatta &&
                                    !(_opt.carteUsate && _opt.carteUsate.has(r.cartaRef.id)) &&
                                    r.cartaRef.id !== _scartoId;
                            });

                            // Scal noi/loro: attaccabili a una scala in campo
                            var _scalNoi  = _carteRimFis.filter(function(r) { return _scalaNoi.some(function(cb)  { return _isAttaccabileAdAvversario(r.cartaRef, cb); }); }).length;
                            var _scalLoro = _carteRimFis.filter(function(r) { return _scalaLoro.some(function(cb) { return _isAttaccabileAdAvversario(r.cartaRef, cb); }); }).length;

                            // Orfane: lette direttamente da calcolaScoreOpz (fonte unica)
                            var _orfane = (scoreOpzPreCalc[opzLblPre] && scoreOpzPreCalc[opzLblPre].orfane !== undefined) ? scoreOpzPreCalc[opzLblPre].orfane : 0;

                            // premioPozzetto: stesso criterio di scegliBestOpzioneAI
                            if (!_gioc2.haPozzetto && scoreOpzPreCalc[opzLblPre]) {
                                var _remAfterBase = _totalCarteDisp - _nUsate;
                                var _isPozzBase = window._analisiScenario === 'scarti' ? _remAfterBase === 1 : _remAfterBase === 0;
                                var _isBurrBase = (_opt.mosse || []).some(function(m) { return (m.tipo==='tris'||m.tipo==='scala') && m.carte && m.carte.length >= 7; });
                                if (_isPozzBase && !_isBurrBase) {
                                    var _pbBase = window.coeffScoreOpz.premioPozzetto || 0;
                                    scoreOpzPreCalc[opzLblPre] = Object.assign({}, scoreOpzPreCalc[opzLblPre], { score: scoreOpzPreCalc[opzLblPre].score + _pbBase });
                                }
                            }

                            statOpzPreCalc[opzLblPre] = {
                                matteUsate: _matteUs,
                                matteRim:   _totalMatteDisp - _matteUs,
                                carteRim:   _totalCarteDisp - _nUsate - 1,
                                orfane:     _orfane,
                                scalNoi:    _scalNoi,
                                scalLoro:   _scalLoro
                            };
                        }
                    }

                    // ---- OPZnB: variante B per ogni opzione (via _calcolaVariantiB) ----
                    if (!noOpz && d.opzioniScenario && window.opener && window.opener._calcolaVariantiB) {
                        // Swap contesto opener come fa la delegazione di calcolaScoreOpz
                        var _bSavedD  = window.opener._analisiData;
                        var _bSavedI  = window.opener._analisiGiocatoreIdx;
                        var _bSavedCF = window.opener.coeffScoreOpz;
                        window.opener._analisiData         = d;
                        window.opener._analisiGiocatoreIdx = giocatoreIdx;
                        window.opener.coeffScoreOpz        = window.coeffScoreOpz;
                        var _bVarRes = window.opener._calcolaVariantiB(d, window.opener.game, giocatoreIdx);
                        window.opener._analisiData         = _bSavedD;
                        window.opener._analisiGiocatoreIdx = _bSavedI;
                        window.opener.coeffScoreOpz        = _bSavedCF;
                        _bLabelMap = _bVarRes.bLabelMap;
                        var _bFirstIdx = _bVarRes.bFirstIdx;

                        // Reverse map: baseLbl → [bLabel, ...] per interleaving
                        var _baseToB = {};
                        Object.keys(_bLabelMap).forEach(function(bLabel) {
                            var baseLbl = _bLabelMap[bLabel];
                            if (!_baseToB[baseLbl]) _baseToB[baseLbl] = [];
                            _baseToB[baseLbl].push(bLabel);
                        });

                        // Ricostruisce uniqueOpzLabels interleaving base e B
                        var _newOpzLabels = [];
                        uniqueOpzLabels.forEach(function(baseLbl) {
                            _newOpzLabels.push(baseLbl);
                            (_baseToB[baseLbl] || []).forEach(function(bLabel) { _newOpzLabels.push(bLabel); });
                        });
                        // Aggiunge B labels la cui base non era in uniqueOpzLabels (es. OPZ0B)
                        var _coveredLabels = new Set(_newOpzLabels);
                        Object.keys(_bLabelMap).sort(function(a,b){return parseInt(a.replace('OPZ',''))-parseInt(b.replace('OPZ',''));}).forEach(function(bLabel) {
                            if (!_coveredLabels.has(bLabel)) { _newOpzLabels.push(bLabel); _coveredLabels.add(bLabel); }
                        });
                        uniqueOpzLabels = _newOpzLabels;
                        tutteLeColonneAVisualizzare = uniqueOpzLabels;

                        // Aggiunge breakdown per ogni B variant già iniettata da _calcolaVariantiB
                        for (var _bvi = _bFirstIdx; _bvi < d.opzioniScenario.length; _bvi++) {
                            var _bvOpt = d.opzioniScenario[_bvi];
                            var _bvLabel = 'OPZ' + (_bvi + 1);
                            var _bBD = {};
                            var _bComboLen = {};
                            _comboSquadra.forEach(function(cb){ _bComboLen[cb.id] = cb.carte.length; });
                            (_bvOpt.mosse || []).forEach(function(mossa, mIdx) {
                                if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                                    var fisiche = (mossa.carte||[]).filter(function(c){return !c.isJolly&&!c.isPinella;});
                                    var usaMatta = (mossa.carte||[]).some(function(c){return c.isJolly||c.isPinella;});
                                    var db = mossa.tipo==='tris' ? ('T'+(fisiche[0]?fisiche[0].numero:'?')) : ('S'+(fisiche[0]?fisiche[0].seme:'?'));
                                    var cs = _bvLabel+'-'+mIdx+'-'+db;
                                    (mossa.carte||[]).forEach(function(c){ _bBD[c.id]={label:_bvLabel,valore:1,comboSegreta:cs,isCalata:false,badgeTesto:null,targetLength:mossa.carte.length,mossaIdx:mIdx,mossaUsaMatta:usaMatta}; });
                                } else if (mossa.tipo === 'calata' && mossa.carta) {
                                    var cid = mossa.combo ? mossa.combo.id : null;
                                    var baseLen = (cid !== null && _bComboLen[cid] !== undefined) ? _bComboLen[cid] : (mossa.combo ? mossa.combo.carte.length : 0);
                                    var tl = baseLen + 1;
                                    if (cid !== null) _bComboLen[cid] = tl;
                                    _bBD[mossa.carta.id]={label:_bvLabel,valore:1,comboSegreta:null,isCalata:true,badgeTesto:String(tl),targetLength:tl,mossaIdx:mIdx,mossaUsaMatta:false};
                                }
                            });
                            d.classifica.forEach(function(r){ if(r.cartaRef&&r.breakdown&&_bBD[r.cartaRef.id]) r.breakdown.push(_bBD[r.cartaRef.id]); });
                        }

                        // Pre-calc (scarto, score, stat) per le B labels
                        Object.keys(_bLabelMap).forEach(function(bLabel) {
                            var idx = parseInt(bLabel.replace('OPZ','')) - 1;
                            scoreOpzPreCalc[bLabel] = window.calcolaScoreOpz(idx, true) || null;
                            scartiPreCalc[bLabel] = scoreOpzPreCalc[bLabel] ? { carta: scoreOpzPreCalc[bLabel].cartaScarto, cartaRef: scoreOpzPreCalc[bLabel].cartaRef } : null;
                            var _bSid = scoreOpzPreCalc[bLabel] && scoreOpzPreCalc[bLabel].cartaRef ? scoreOpzPreCalc[bLabel].cartaRef.id : null;
                            var _bOpt2 = d.opzioniScenario[idx];
                            if (_bOpt2) {
                                var _bMu=0; if(_bOpt2.carteUsate){_bOpt2.carteUsate.forEach(function(id){if(_idIsMatta[id])_bMu++;});}
                                var _bNu=_bOpt2.carteUsate?_bOpt2.carteUsate.size:0;
                                if (!_gioc2.haPozzetto && scoreOpzPreCalc[bLabel]) {
                                    var _bRemAfter = _totalCarteDisp - _bNu;
                                    var _bIsPozz = window._analisiScenario === 'scarti' ? _bRemAfter === 1 : _bRemAfter === 0;
                                    var _bIsBurr = (_bOpt2.mosse || []).some(function(m) { return (m.tipo==='tris'||m.tipo==='scala') && m.carte && m.carte.length >= 7; });
                                    if (_bIsPozz && !_bIsBurr) {
                                        var _pbB = window.coeffScoreOpz.premioPozzetto || 0;
                                        scoreOpzPreCalc[bLabel] = Object.assign({}, scoreOpzPreCalc[bLabel], { score: scoreOpzPreCalc[bLabel].score + _pbB });
                                    }
                                }
                                var _bRim=d.classifica.filter(function(r){return _originiMano(r)&&!r.isMatta&&!(_bOpt2.carteUsate&&_bOpt2.carteUsate.has(r.cartaRef.id))&&r.cartaRef.id!==_bSid;});
                                var _bSn=_bRim.filter(function(r){return _scalaNoi.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                var _bSl=_bRim.filter(function(r){return _scalaLoro.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                var _bOrf=(scoreOpzPreCalc[bLabel]&&scoreOpzPreCalc[bLabel].orfane!==undefined)?scoreOpzPreCalc[bLabel].orfane:0;
                                statOpzPreCalc[bLabel]={matteUsate:_bMu,matteRim:_totalMatteDisp-_bMu,carteRim:_totalCarteDisp-_bNu-1,orfane:_bOrf,scalNoi:_bSn,scalLoro:_bSl};
                            }
                        });
                    }

                    // ---- OPZnC: variante sacrificio carta (fase vincolata) ----
                    var _opzCBestC = null;
                    if (!noOpz && scenario === 'scarti' && window.opener._calcolaVariantiC) {
                        var _gameOC = window.opener.game;
                        var _giocOC = _gameOC.giocatori[giocatoreIdx];
                        var _comboOC = _giocOC.squadra === 0 ? _gameOC.combinazioniNoi : _gameOC.combinazioniLoro;
                        var _faseVincOC = _giocOC.haPozzetto && !_comboOC.some(function(cb) { return cb.isBurraco; });
                        if (_faseVincOC) {
                            _opzCBestC = window.opener._calcolaVariantiC(d, _gameOC, _giocOC, giocatoreIdx);
                        }
                    }
                    if (_opzCBestC) {
                        var _opzCLabel = _opzCBestC.opzCLabel;
                        // Store for analizzaOpzC click handler
                        window._opzCData = _opzCBestC.analisiData;
                        window._opzCOpzIdx = _opzCBestC.opzIdx;
                        window._opzCGiocIdx = giocatoreIdx;
                        var _nCB = window.opener.Strategia && window.opener.Strategia.nomeCarta;
                        window._opzCSacrificataLabel = _opzCBestC.cartaSacrificata ? (_nCB ? _nCB(_opzCBestC.cartaSacrificata) : (_opzCBestC.cartaSacrificata.numero + (_opzCBestC.cartaSacrificata.seme || ''))) : '?';

                        // Build breakdown map keyed by origineRef.id (OPZnC mosse come from dC)
                        var _cBDMap = {};
                        var _cComboLenC = {};
                        _comboSquadra.forEach(function(cb) { _cComboLenC[cb.id] = cb.carte.length; });
                        (_opzCBestC.opz.mosse || []).forEach(function(mossa, mIdx) {
                            if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                                var fisiche = (mossa.carte||[]).filter(function(c){return !c.isJolly&&!c.isPinella;});
                                var usaMatta = (mossa.carte||[]).some(function(c){return c.isJolly||c.isPinella;});
                                var db = mossa.tipo==='tris' ? ('T'+(fisiche[0]?fisiche[0].numero:'?')) : ('S'+(fisiche[0]?fisiche[0].seme:'?'));
                                var cs = _opzCLabel+'-'+mIdx+'-'+db;
                                (mossa.carte||[]).forEach(function(c) {
                                    var oid = c._origineRef ? c._origineRef.id : c.id;
                                    _cBDMap[oid] = {label:_opzCLabel,valore:1,comboSegreta:cs,isCalata:false,badgeTesto:null,targetLength:mossa.carte.length,mossaIdx:mIdx,mossaUsaMatta:usaMatta};
                                });
                            } else if (mossa.tipo === 'calata' && mossa.carta) {
                                var cid = mossa.combo ? mossa.combo.id : null;
                                var baseLen = (cid !== null && _cComboLenC[cid] !== undefined) ? _cComboLenC[cid] : (mossa.combo ? mossa.combo.carte.length : 0);
                                var tl = baseLen + 1;
                                if (cid !== null) _cComboLenC[cid] = tl;
                                var oid = mossa.carta._origineRef ? mossa.carta._origineRef.id : mossa.carta.id;
                                _cBDMap[oid] = {label:_opzCLabel,valore:1,comboSegreta:null,isCalata:true,badgeTesto:String(tl),targetLength:tl,mossaIdx:mIdx,mossaUsaMatta:false};
                            }
                        });

                        // Inject breakdown entries into d.classifica (match via origineRef.id)
                        d.classifica.forEach(function(r) {
                            if (!r.cartaRef || !r.breakdown) return;
                            var oid = r.cartaRef._origineRef ? r.cartaRef._origineRef.id : r.cartaRef.id;
                            if (_cBDMap[oid]) r.breakdown.push(_cBDMap[oid]);
                        });

                        tutteLeColonneAVisualizzare.push(_opzCLabel);

                        // Pre-calc scarto: calcolaScartoPer su d (analisi COMPLETA, non dC)
                        // La carta sacrificata rimane in mano come candidata allo scarto.
                        // Costruiamo carteUsate per d mappando le carte delle mosse dC → d via origineRef.id
                        var _cCarteUsateD = new Set();
                        d.classifica.forEach(function(r) {
                            if (!r.cartaRef) return;
                            var oid = r.cartaRef._origineRef ? r.cartaRef._origineRef.id : r.cartaRef.id;
                            if (_cBDMap[oid]) _cCarteUsateD.add(r.cartaRef.id);
                        });
                        var _cVirtualIdx = d.opzioniScenario.length;
                        d.opzioniScenario.push({ mosse: [], carteUsate: _cCarteUsateD, descCarte: _opzCLabel });
                        var _savedAC = window._analisiData, _savedSC = window._analisiScenario, _savedIC = window._analisiGiocatoreIdx;
                        window._analisiData = d; window._analisiScenario = 'scarti'; window._analisiGiocatoreIdx = giocatoreIdx;
                        var _cScartoResult = window.calcolaScartoPer(_cVirtualIdx, true);
                        window._analisiData = _savedAC; window._analisiScenario = _savedSC; window._analisiGiocatoreIdx = _savedIC;
                        d.opzioniScenario.pop(); // rimuovi opzione virtuale
                        scartiPreCalc[_opzCLabel] = _cScartoResult || null;

                        // Store per analizzaOpzC: d completo + carteUsate mappate
                        window._opzCFullData = d;
                        window._opzCCarteUsateD = _cCarteUsateD;

                        scoreOpzPreCalc[_opzCLabel] = { score: _opzCBestC.score };
                        var _cNuC = _cCarteUsateD.size; // usiamo la versione mappata su d
                        var _cMatteUsC = 0;
                        Object.keys(_cBDMap).forEach(function(oid) { if (_idIsMatta[oid]) _cMatteUsC++; });
                        statOpzPreCalc[_opzCLabel] = {
                            matteUsate: _cMatteUsC,
                            matteRim: _totalMatteDisp - _cMatteUsC,
                            carteRim: _totalCarteDisp - _cNuC - 1,
                            orfane: 0, scalNoi: 0, scalLoro: 0
                        };
                    }

                    // ---- OPZnM: variante matta solitaria (2 carte rimaste: matta + scarto) ----
                    if (!noOpz && d.opzioniScenario && window._calcolaVariantiM) {
                        var _mFirstIdx2 = d.opzioniScenario.length;
                        var _mInfo2 = window._calcolaVariantiM(d, _gameC, giocatoreIdx);
                        _mLabelMap = _mInfo2.mLabelMap || {};
                        for (var _mi = _mFirstIdx2; _mi < d.opzioniScenario.length; _mi++) {
                            var _mLblI = 'OPZ' + (_mi + 1);
                            uniqueOpzLabels.push(_mLblI);
                            var _mOptI = d.opzioniScenario[_mi];
                            if (_mOptI && _mOptI.mosse) {
                                var _mBD = {};
                                var _mComboLenI = {};
                                _comboSquadra.forEach(function(cb){ _mComboLenI[cb.id] = cb.carte.length; });
                                _mOptI.mosse.forEach(function(mossa, mIdx) {
                                    if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                                        var fisiche = (mossa.carte||[]).filter(function(c){return !c.isJolly&&!c.isPinella;});
                                        var usaMattaM = (mossa.carte||[]).some(function(c){return c.isJolly||c.isPinella;});
                                        var dbM = mossa.tipo==='tris' ? ('T'+(fisiche[0]?fisiche[0].numero:'?')) : ('S'+(fisiche[0]?fisiche[0].seme:'?'));
                                        var csM = _mLblI+'-'+mIdx+'-'+dbM;
                                        (mossa.carte||[]).forEach(function(c){ _mBD[c.id]={label:_mLblI,valore:1,comboSegreta:csM,isCalata:false,badgeTesto:null,targetLength:mossa.carte.length,mossaIdx:mIdx,mossaUsaMatta:usaMattaM}; });
                                    } else if (mossa.tipo === 'calata' && mossa.carta) {
                                        var cidM = mossa.combo ? mossa.combo.id : null;
                                        var baseLenM = (cidM !== null && _mComboLenI[cidM] !== undefined) ? _mComboLenI[cidM] : (mossa.combo ? mossa.combo.carte.length : 0);
                                        var tlM = baseLenM + 1;
                                        if (cidM !== null) _mComboLenI[cidM] = tlM;
                                        _mBD[mossa.carta.id]={label:_mLblI,valore:1,comboSegreta:null,isCalata:true,badgeTesto:String(tlM),targetLength:tlM,mossaIdx:mIdx,mossaUsaMatta:!!mossa.isMattaSolitaria};
                                    }
                                });
                                d.classifica.forEach(function(r){ if(r.cartaRef&&r.breakdown&&_mBD[r.cartaRef.id]) r.breakdown.push(_mBD[r.cartaRef.id]); });
                            }
                        }
                        tutteLeColonneAVisualizzare = uniqueOpzLabels;
                        // Pre-calc scarto, score, stat per le M labels
                        Object.keys(_mLabelMap).forEach(function(mLblKey) {
                            var idx = parseInt(mLblKey.replace('OPZ','')) - 1;
                            scoreOpzPreCalc[mLblKey] = window.calcolaScoreOpz(idx, true) || null;
                            scartiPreCalc[mLblKey] = scoreOpzPreCalc[mLblKey] ? { carta: scoreOpzPreCalc[mLblKey].cartaScarto, cartaRef: scoreOpzPreCalc[mLblKey].cartaRef } : null;
                            var _mSid = scoreOpzPreCalc[mLblKey] && scoreOpzPreCalc[mLblKey].cartaRef ? scoreOpzPreCalc[mLblKey].cartaRef.id : null;
                            var _mOpt2 = d.opzioniScenario[idx];
                            if (_mOpt2) {
                                var _mMu=0; if(_mOpt2.carteUsate){_mOpt2.carteUsate.forEach(function(id){if(_idIsMatta[id])_mMu++;});}
                                var _mNu=_mOpt2.carteUsate?_mOpt2.carteUsate.size:0;
                                if (!_gioc2.haPozzetto && scoreOpzPreCalc[mLblKey]) {
                                    var _mRemAfter = _totalCarteDisp - _mNu;
                                    var _mIsPozz = window._analisiScenario === 'scarti' ? _mRemAfter === 1 : _mRemAfter === 0;
                                    var _mIsBurr = (_mOpt2.mosse || []).some(function(m) { return (m.tipo==='tris'||m.tipo==='scala') && m.carte && m.carte.length >= 7; });
                                    if (_mIsPozz && !_mIsBurr) {
                                        var _pbM = window.coeffScoreOpz.premioPozzetto || 0;
                                        scoreOpzPreCalc[mLblKey] = Object.assign({}, scoreOpzPreCalc[mLblKey], { score: scoreOpzPreCalc[mLblKey].score + _pbM });
                                    }
                                }
                                var _mRim=d.classifica.filter(function(r){return _originiMano(r)&&!r.isMatta&&!(_mOpt2.carteUsate&&_mOpt2.carteUsate.has(r.cartaRef.id))&&r.cartaRef.id!==_mSid;});
                                var _mSn=_mRim.filter(function(r){return _scalaNoi.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                var _mSl=_mRim.filter(function(r){return _scalaLoro.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                var _mOrf=(scoreOpzPreCalc[mLblKey]&&scoreOpzPreCalc[mLblKey].orfane!==undefined)?scoreOpzPreCalc[mLblKey].orfane:0;
                                statOpzPreCalc[mLblKey]={matteUsate:_mMu,matteRim:_totalMatteDisp-_mMu,carteRim:_totalCarteDisp-_mNu-1,orfane:_mOrf,scalNoi:_mSn,scalLoro:_mSl};
                            }
                        });
                    }

                    // ---- OPZnV: variante V per faseVincoloMano (pota calate violanti) ----
                    var _vLabelMap = {};
                    if (!noOpz && scenario === 'scarti' && window.opener && window.opener._calcolaVariantiV) {
                        var _gameV2 = window.opener.game;
                        var _giocV2 = _gameV2.giocatori[giocatoreIdx];
                        var _comboV2 = _giocV2.squadra === 0 ? _gameV2.combinazioniNoi : _gameV2.combinazioniLoro;
                        var _faseVincV2 = _giocV2.haPozzetto && !_comboV2.some(function(cb) { return cb.isBurraco; });
                        if (_faseVincV2) {
                            // Costruisce lista opzioni violanti (rim < 1)
                            var _violantiV2 = [];
                            uniqueOpzLabels.forEach(function(lbl) {
                                var idx = parseInt(lbl.replace('OPZ','')) - 1;
                                if (idx < 0) return;
                                var opt = d.opzioniScenario[idx];
                                if (!opt) return;
                                var _nu = opt.carteUsate ? opt.carteUsate.size : 0;
                                if (_totalCarteDisp - _nu - 1 < 1) {
                                    _violantiV2.push({ opzIdx: idx, analisiData: d, _labelMaps: { bLabelMap: _bLabelMap, mLabelMap: _mLabelMap } });
                                }
                            });
                            if (_violantiV2.length > 0) {
                                var _vSavedD2  = window.opener._analisiData;
                                var _vSavedI2  = window.opener._analisiGiocatoreIdx;
                                var _vSavedS2  = window.opener._analisiScenario;
                                window.opener._analisiData = d;
                                window.opener._analisiGiocatoreIdx = giocatoreIdx;
                                window.opener._analisiScenario = 'scarti';
                                var bestVP = window.opener._calcolaVariantiV(_violantiV2, _totalCarteDisp);
                                window.opener._analisiData = _vSavedD2;
                                window.opener._analisiGiocatoreIdx = _vSavedI2;
                                window.opener._analisiScenario = _vSavedS2;

                                if (bestVP) {
                                    var vIdxP = d.opzioniScenario.length;
                                    var vLblP = 'OPZ' + (vIdxP + 1);
                                    d.opzioniScenario.push({ mosse: bestVP.mosse, carteUsate: bestVP.carteUsate, descCarte: vLblP });
                                    // Calcola score/scarto/stat per la V variant, con combo proiettate post-calata
                                    window._analisiData = d;
                                    window._analisiGiocatoreIdx = giocatoreIdx;
                                    var _vComboSqRaw = _giocV2.squadra === 0 ? _gameV2.combinazioniNoi : _gameV2.combinazioniLoro;
                                    window.opener._comboSquadraOverride = window.opener._proiettaComboConCalate(_vComboSqRaw, bestVP.mosse);
                                    scoreOpzPreCalc[vLblP] = window.calcolaScoreOpz(vIdxP, true) || null;
                                    window.opener._comboSquadraOverride = null;
                                    // Inietta breakdown V in d.classifica (come per B variant)
                                    var _vBD = {};
                                    var _vComboLen = {};
                                    _comboSquadra.forEach(function(cb){ _vComboLen[cb.id] = cb.carte.length; });
                                    (bestVP.mosse || []).forEach(function(mossa, mIdx) {
                                        if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                                            var fisiche = (mossa.carte||[]).filter(function(c){return !c.isJolly&&!c.isPinella;});
                                            var usaMatta = (mossa.carte||[]).some(function(c){return c.isJolly||c.isPinella;});
                                            var db = mossa.tipo==='tris' ? ('T'+(fisiche[0]?fisiche[0].numero:'?')) : ('S'+(fisiche[0]?fisiche[0].seme:'?'));
                                            var cs = vLblP+'-'+mIdx+'-'+db;
                                            (mossa.carte||[]).forEach(function(c){ _vBD[c.id]={label:vLblP,valore:1,comboSegreta:cs,isCalata:false,badgeTesto:null,targetLength:mossa.carte.length,mossaIdx:mIdx,mossaUsaMatta:usaMatta}; });
                                        } else if (mossa.tipo === 'calata' && mossa.carta) {
                                            var cid = mossa.combo ? mossa.combo.id : null;
                                            var baseLen = (cid !== null && _vComboLen[cid] !== undefined) ? _vComboLen[cid] : (mossa.combo ? mossa.combo.carte.length : 0);
                                            var tl = baseLen + 1;
                                            if (cid !== null) _vComboLen[cid] = tl;
                                            _vBD[mossa.carta.id]={label:vLblP,valore:1,comboSegreta:null,isCalata:true,badgeTesto:String(tl),targetLength:tl,mossaIdx:mIdx,mossaUsaMatta:false};
                                        }
                                    });
                                    d.classifica.forEach(function(r){ if(r.cartaRef&&r.breakdown&&_vBD[r.cartaRef.id]) r.breakdown.push(_vBD[r.cartaRef.id]); });
                                    scartiPreCalc[vLblP] = scoreOpzPreCalc[vLblP] ? { carta: scoreOpzPreCalc[vLblP].cartaScarto, cartaRef: scoreOpzPreCalc[vLblP].cartaRef } : null;
                                    var _vSidP = scoreOpzPreCalc[vLblP] && scoreOpzPreCalc[vLblP].cartaRef ? scoreOpzPreCalc[vLblP].cartaRef.id : null;
                                    var _vOpt = d.opzioniScenario[vIdxP];
                                    if (_vOpt) {
                                        var _vMu=0; if(_vOpt.carteUsate){_vOpt.carteUsate.forEach(function(id){if(_idIsMatta[id])_vMu++;});}
                                        var _vNu=_vOpt.carteUsate?_vOpt.carteUsate.size:0;
                                        var _vRim2=d.classifica.filter(function(r){return _originiMano(r)&&!r.isMatta&&!(_vOpt.carteUsate&&_vOpt.carteUsate.has(r.cartaRef.id))&&r.cartaRef.id!==_vSidP;});
                                        var _vSn=_vRim2.filter(function(r){return _scalaNoi.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                        var _vSl=_vRim2.filter(function(r){return _scalaLoro.some(function(cb){return _isAttaccabileAdAvversario(r.cartaRef,cb);});}).length;
                                        var _vOrf=(scoreOpzPreCalc[vLblP]&&scoreOpzPreCalc[vLblP].orfane!==undefined)?scoreOpzPreCalc[vLblP].orfane:0;
                                        statOpzPreCalc[vLblP]={matteUsate:_vMu,matteRim:_totalMatteDisp-_vMu,carteRim:_totalCarteDisp-_vNu-1,orfane:_vOrf,scalNoi:_vSn,scalLoro:_vSl};
                                    }
                                    // Risolve label leggibile (es. OPZ1V)
                                    var _vSrcRaw = bestVP.srcCand.opzIdx === -1 ? 'OPZ0' : 'OPZ' + (bestVP.srcCand.opzIdx + 1);
                                    var _vSrcLbl = (_bLabelMap[_vSrcRaw] ? _bLabelMap[_vSrcRaw] + 'B' : (_mLabelMap[_vSrcRaw] ? _mLabelMap[_vSrcRaw] + 'M' : _vSrcRaw));
                                    _vLabelMap[vLblP] = _vSrcLbl + 'V';
                                    uniqueOpzLabels.push(vLblP);
                                    tutteLeColonneAVisualizzare = uniqueOpzLabels;
                                }
                            }
                        }
                    }

                    // Build tabella: header (ora dopo OPZnB injection, con B columns incluse)
                    bodyHTML += '<div style="padding:8px 12px; overflow-x:auto;">' +
                        '<table style="font-size:11px;border-collapse:collapse;width:100%">';
                    bodyHTML += '<tr style="border-bottom:1px solid #777; color:#fff;">' +
                        '<th style="text-align:left; padding:4px;">CARTA</th>';
                    for (var ci = 0; ci < _comboVis.length; ci++) {
                        var ciLabel = _labelCombo(_comboVis[ci].combo);
                        bodyHTML += '<th style="text-align:center; padding:4px; color:#9cf; border-left:2px solid #446;" title="' + ciLabel + '">' + ciLabel + '</th>';
                    }
                    var avvHeaderInserito = false;
                    for (var l3 = 0; l3 < tutteLeColonneAVisualizzare.length; l3++) {
                        var testataId = tutteLeColonneAVisualizzare[l3];
                        var labelVisuale = testataId;
                        var headerBg = '';
                        if (!avvHeaderInserito && testataId.startsWith('OPZ')) {
                            bodyHTML += '<th style="text-align:center; padding:4px; color:#f66; border-left:2px solid #844;" title="Lunghezza combo avversaria se si calasse questa carta">AVV</th>';
                            avvHeaderInserito = true;
                        }
                        if (testataId.startsWith('OPZ')) {
                            var _origBase = _bLabelMap[testataId];
                            if (_opzCBestC && testataId === _opzCBestC.opzCLabel) {
                                // OPZnC — colonna sacrificio carta (amber)
                                headerBg = 'background-color:rgba(255,160,0,0.2); border-left:2px solid #a80;';
                                bodyHTML += '<th style="cursor:pointer; text-align:center; padding:4px; color:#fb4; ' + headerBg + '" title="Sacrifica carta per rispettare vincolo mano" onclick="analizzaOpzC()">' + testataId + '</th>';
                            } else if (_origBase) {
                                labelVisuale = _origBase + 'B';
                                headerBg = 'background-color:rgba(50,150,50,0.15); border-left:1px dotted #585;';
                                var opzHIdx = parseInt(testataId.replace('OPZ','')) - 1;
                                bodyHTML += '<th style="cursor:pointer; text-align:center; padding:4px; color:#4a9; ' + headerBg + '" title="' + testataId + '" onclick="analizzaOpz(' + opzHIdx + ')">' + labelVisuale + '</th>';
                            } else if (_mLabelMap[testataId]) {
                                labelVisuale = _mLabelMap[testataId];
                                headerBg = 'background-color:rgba(200,130,0,0.15); border-left:1px dotted #885;';
                                var opzHIdx = parseInt(testataId.replace('OPZ','')) - 1;
                                bodyHTML += '<th style="cursor:pointer; text-align:center; padding:4px; color:#fc8; ' + headerBg + '" title="' + testataId + '" onclick="analizzaOpz(' + opzHIdx + ')">' + labelVisuale + '</th>';
                            } else if (_vLabelMap[testataId]) {
                                labelVisuale = _vLabelMap[testataId];
                                headerBg = 'background-color:rgba(100,180,255,0.15); border-left:1px dotted #46a;';
                                var opzHIdx = parseInt(testataId.replace('OPZ','')) - 1;
                                bodyHTML += '<th style="cursor:pointer; text-align:center; padding:4px; color:#8cf; ' + headerBg + '" title="' + testataId + '" onclick="analizzaOpz(' + opzHIdx + ')">' + labelVisuale + '</th>';
                            } else {
                                headerBg = 'background-color:rgba(100,100,100,0.2); border-left:2px solid #555;';
                                var opzHIdx = parseInt(testataId.replace('OPZ','')) - 1;
                                bodyHTML += '<th style="cursor:pointer; text-align:center; padding:4px; color:#4a9; ' + headerBg + '" title="' + testataId + '" onclick="analizzaOpz(' + opzHIdx + ')">' + labelVisuale + '</th>';
                            }
                        } else {
                            var isCST = testataId.startsWith('T') || testataId.startsWith('S') || testataId.startsWith('C');
                            labelVisuale = labelToLetter[testataId];
                            if (isCST && !testataId.startsWith('C')) {
                                headerBg = labelUsaMatta[testataId] ? 'background-color:rgba(255,165,0,0.2);' : 'background-color:rgba(255,120,0,0.5);';
                            }
                            bodyHTML += '<th style="text-align:center; padding:4px; color:#4a9; border-left:1px dotted #555; ' + headerBg + '" title="' + testataId + '">' + labelVisuale + '</th>';
                        }
                    }
                    if (!avvHeaderInserito) {
                        bodyHTML += '<th style="text-align:center; padding:4px; color:#f66; border-left:2px solid #844;" title="Lunghezza combo avversaria se si calasse questa carta">AVV</th>';
                    }
                    bodyHTML += '</tr>';

                    for (var i = 0; i < d.classifica.length; i++) {
                        var c = d.classifica[i];

                        var colorCarta = '#ddd';
                        if (c.origine === 'scarto') colorCarta = '#f80';
                        if (c.origine === 'mazzo') colorCarta = '#a49';
                        if (c.isMatta) colorCarta = '#0cf'; // Azzurro prevale sugli altri

                        bodyHTML += '<tr style="border-bottom:1px dotted #444;">' +
                            '<td style="padding:4px; color:' + colorCarta + '; font-weight:bold; white-space:nowrap;">' + c.carta + '</td>';

                        // Celle combo in campo (solo visibili)
                        for (var ci2 = 0; ci2 < _comboVis.length; ci2++) {
                            var est = _comboVis[ci2].est;
                            var ciCell = '-', ciCol = '#555';
                            if (est && c.cartaRef && est.usedIds.has(c.cartaRef.id)) {
                                var isRep = est.mattaReplacerIds.has(c.cartaRef.id);
                                ciCell = est.maxCon + '/' + est.maxSenza + (isRep ? '*' : '');
                                ciCol = '#9cf';
                            }
                            bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; color:' + ciCol + '; border-left:2px solid #446;">' + ciCell + '</td>';
                        }

                        var valMap = {};
                        var comboMapInfo = {};
                        if (c.breakdown) {
                            for (var k = 0; k < c.breakdown.length; k++) {
                                valMap[c.breakdown[k].label] = c.breakdown[k].valore;
                                comboMapInfo[c.breakdown[k].label] = {
                                    comboSegreta: c.breakdown[k].comboSegreta,
                                    isCalata: c.breakdown[k].isCalata,
                                    badgeTesto: c.breakdown[k].badgeTesto,
                                    targetLength: c.breakdown[k].targetLength,
                                    mossaIdx: c.breakdown[k].mossaIdx,
                                    mossaUsaMatta: c.breakdown[k].mossaUsaMatta // Nuovo flag
                                };
                            }
                        }

                        var avvCellaInserita = false;
                        for (var l4 = 0; l4 < tutteLeColonneAVisualizzare.length; l4++) {
                            var colName = tutteLeColonneAVisualizzare[l4];

                            // Inserisce cella AVV prima delle OPZ
                            if (!avvCellaInserita && colName.startsWith('OPZ')) {
                                var avvLungh = c.avversaria ? c.avversaria.lunghezza : null;
                                var avvStr = avvLungh ? String(avvLungh) : '-';
                                var avvCol = avvLungh ? (avvLungh >= 7 ? '#f00' : avvLungh >= 5 ? '#f88' : '#f44') : '#555';
                                bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; font-weight:bold; color:' + avvCol + '; border-left:2px solid #844;">' + avvStr + '</td>';
                                avvCellaInserita = true;
                            }

                            var valRow = valMap[colName];
                            var comboInfo = comboMapInfo[colName] || {};

                            var cellStr = '-';
                            var cellCol = '#555';
                            var bgCol = '';
                            var borderMod = '';

                            if (colName.startsWith('OPZ')) {
                                if (_bLabelMap[colName]) {
                                    borderMod = 'border-left:1px dotted #585;';
                                } else if (_mLabelMap[colName]) {
                                    borderMod = 'border-left:1px dotted #885;';
                                } else if (_opzCBestC && colName === _opzCBestC.opzCLabel) {
                                    borderMod = 'border-left:2px solid #a80;';
                                } else if (_vLabelMap[colName]) {
                                    borderMod = 'border-left:1px dotted #46a;';
                                } else {
                                    borderMod = 'border-left:2px solid #555;';
                                }
                            }

                            // Highlight scarto consigliato (blu) se cella non ha gia' uno sfondo
                            var isScartoPer = colName.startsWith('OPZ') && scartiPreCalc[colName] && c.cartaRef && scartiPreCalc[colName].cartaRef && scartiPreCalc[colName].cartaRef.id === c.cartaRef.id;

                            if (valRow !== undefined && valRow !== 0) {
                                var vPos = (valRow > 0);
                                cellCol = vPos ? '#4f4' : '#f44';
                                cellStr = (vPos ? '+' : '') + Number(valRow).toFixed(1);

                                // Gestione Sfondo Colori Combinazioni per OPZ e Target Badge
                                if (colName.startsWith('OPZ')) {
                                    // Per le colonne OPZ mostra la sigla della combo invece del valore numerico
                                    if (comboInfo.isCalata) {
                                        cellStr = '\u2192' + (comboInfo.badgeTesto || comboInfo.targetLength || '?');
                                    } else if (comboInfo.comboSegreta) {
                                        var _segParts = comboInfo.comboSegreta.split('-');
                                        var _descBreve = _segParts[_segParts.length - 1]; // es. 'T3' o 'SP'
                                        var _comboLen = '';
                                        if (_opzCBestC && colName === _opzCBestC.opzCLabel) {
                                            // OPZnC: mosse da bestC.opz
                                            var _mossaC = _opzCBestC.opz.mosse && comboInfo.mossaIdx !== undefined ? _opzCBestC.opz.mosse[comboInfo.mossaIdx] : null;
                                            if (_mossaC && _mossaC.carte) _comboLen = _mossaC.carte.length;
                                        } else {
                                            var _opzIdxForLen = parseInt(colName.replace('OPZ', '')) - 1;
                                            var _opzData = _opzIdxForLen === -1 ? null : (d.opzioniScenario ? d.opzioniScenario[_opzIdxForLen] : null);
                                            if (_opzData && _opzData.mosse && comboInfo.mossaIdx !== undefined && comboInfo.mossaIdx !== null) {
                                                var _mossa = _opzData.mosse[comboInfo.mossaIdx];
                                                if (_mossa && _mossa.carte) _comboLen = _mossa.carte.length;
                                            }
                                        }
                                        cellStr = _comboLen + _descBreve;
                                    }
                                    // Matta in OPZ -> testo azzurro per il punteggio
                                    if (c.isMatta) {
                                        cellCol = '#0cf'; // Azzurro
                                        // per avere contrasto, i background opachi non devono coprire l'azzurro
                                        // ma ok, ha chiesto testo punteggio azzurro
                                    }

                                    if (comboInfo.isCalata) {
                                        // Attacco in OPZ: niente viola, uso gradazione scala di grigio (scuro per combo corte, chiaro per combo lunghe).
                                        // targetLen ora include già la singola carta che si sta attaccando. Partiamo da minimo 4 carte (tris originale di 3 + 1 carta stendibile).
                                        var targetLen = comboInfo.targetLength || 4;
                                        // Gradazione di grigio da 60 (Dark, si maschera bene nei temi scuri) a salire di 25 per ogni target in più (diventa sempre più chiaro)
                                        var luminanza = Math.min(220, 60 + ((targetLen - 4) * 25));
                                        bgCol = 'background-color:rgb(' + luminanza + ', ' + luminanza + ', ' + luminanza + ');';
                                        
                                    } else if (comboInfo.comboSegreta) {
                                        // Usa l'indice mossa (0, 1, 2...) dal core, così OPZ1.mossa0 e OPZ2.mossa0 avranno = colore
                                        var idx = comboInfo.mossaIdx;
                                        if (idx === undefined || isNaN(idx)) {
                                            if (!assignedOpzColors[comboInfo.comboSegreta]) {
                                                assignedOpzColors[comboInfo.comboSegreta] = currentOpzColorIdx++;
                                            }
                                            idx = assignedOpzColors[comboInfo.comboSegreta];
                                        }
                                        var coloreCombo = opzPalette[idx % opzPalette.length];
                                        
                                        // Se la combinazione è sporca (usa matta), taglia lo sfondo a triangolo 
                                        // usando un linear gradient
                                        if (comboInfo.mossaUsaMatta) {
                                            bgCol = 'background: linear-gradient(135deg, transparent 50%, ' + coloreCombo + ' 50%);';
                                        } else {
                                            bgCol = 'background-color:' + coloreCombo + ';';
                                        }
                                        
                                        // Assicuriamo leggibilità del testo su sfondo opaco intenso (testo nero / ombra per #4f4 o azzurro)
                                        if (cellCol === '#0cf') {
                                            // Il testo è azzurro (matta testuale), lascialo cosi (#0cf).
                                        } else if (!comboInfo.mossaUsaMatta) {
                                            // Se non usa matta lo sfondo copre tutta la cella (alfa ~0.65) -> testo nero 
                                            cellCol = '#111';
                                        } else {
                                            // Se usa matta lo sfondo copre solo mezza cella. La leggibilità potrebbe essere
                                            // compromessa dal contrasto col grigio scuro globale o col colore. Lascio originale (#4f4/#f44)
                                        }
                                    }
                                } else {
                                    // Logica originale per i Conflitti sulle Metriche T/S/C
                                    var isCombinazioneMetrica = colName.startsWith('T') || colName.startsWith('S') || colName.startsWith('C');
                                    if (c.isConflitto && isCombinazioneMetrica) {
                                        bgCol = 'background-color:rgba(255, 0, 255, 0.2);'; 
                                    }
                                }
                            }

                            // Mostra "orf" se la carta rimane orfana in questa opzione
                            if (cellStr === '-' && colName.startsWith('OPZ') && c.cartaRef) {
                                var _sOPZ = scoreOpzPreCalc[colName];
                                if (_sOPZ && _sOPZ.orfaneIds && _sOPZ.orfaneIds.has(c.cartaRef.id)) {
                                    cellStr = 'orf';
                                    cellCol = '#666';
                                } else if (isScartoPer && _sOPZ && _sOPZ.scartoOrfana) {
                                    // La carta è lo scarto consigliato ed era orfana
                                    cellStr = 'orf';
                                    cellCol = '#666';
                                }
                            }

                            if (isScartoPer && bgCol === '') { bgCol = 'background-color:rgba(0,60,200,0.45);'; }
                            bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; color:' + cellCol + '; border-left:1px dotted #555; ' + borderMod + bgCol + '">' + cellStr + '</td>';

                        }
                        if (!avvCellaInserita) {
                            var avvLungh = c.avversaria ? c.avversaria.lunghezza : null;
                            var avvStr = avvLungh ? String(avvLungh) : '-';
                            var avvCol = avvLungh ? (avvLungh >= 7 ? '#f00' : avvLungh >= 5 ? '#f88' : '#f44') : '#555';
                            bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; font-weight:bold; color:' + avvCol + '; border-left:2px solid #844;">' + avvStr + '</td>';
                        }
                        bodyHTML += '</tr>';
                    }
                    // ---- Righe SCARTO e SCORE in fondo alla tabella ----
                    if (uniqueOpzLabels.length > 0) {
                        var colsSpan = 1 + _comboVis.length + 1; // CARTA + combo cols visibili + AVV
                        var rowBase = 'border-top:2px solid #666; background:rgba(0,0,60,0.5);';
                        bodyHTML += '<tr style="' + rowBase + '">';
                        bodyHTML += '<td colspan="' + colsSpan + '" style="padding:4px 6px; color:#8af; font-size:10px; font-weight:bold; letter-spacing:1px;">SCARTO</td>';
                        for (var scIdx = 0; scIdx < uniqueOpzLabels.length; scIdx++) {
                            var scLabel = uniqueOpzLabels[scIdx];
                            var scRes = scartiPreCalc[scLabel];
                            var scNome = scRes ? scRes.carta : '?';
                            var scBorder = _bLabelMap[scLabel] ? 'border-left:1px dotted #585;' : _mLabelMap[scLabel] ? 'border-left:1px dotted #885;' : _vLabelMap[scLabel] ? 'border-left:1px dotted #46a;' : 'border-left:2px solid #446;';
                            bodyHTML += '<td style="padding:4px; text-align:center; font-weight:bold; color:#4f4; ' + scBorder + '">' + scNome + '</td>';
                        }
                        bodyHTML += '</tr>';
                        bodyHTML += '<tr style="' + rowBase + '">';
                        bodyHTML += '<td style="padding:4px 6px; color:#8af; font-size:10px; font-weight:bold; letter-spacing:1px;">SCORE OPZ</td>';
                        // Punteggi incrementali per ogni combo in campo (solo visibili)
                        for (var ci_sc = 0; ci_sc < _comboVis.length; ci_sc++) {
                            var combo_sc = _comboVis[ci_sc].combo;
                            var est_sc = _comboVis[ci_sc].est;
                            var scComboTxt = '-';
                            if (est_sc && est_sc.maxCon > combo_sc.carte.length) {
                                var pCon = _premioBaseCombo(combo_sc.tipo, est_sc.maxCon) - _premioBaseCombo(combo_sc.tipo, combo_sc.carte.length);
                                var pSenza = _premioBaseCombo(combo_sc.tipo, est_sc.maxSenza) - _premioBaseCombo(combo_sc.tipo, combo_sc.carte.length);
                                scComboTxt = pCon + '/' + pSenza;
                            }
                            bodyHTML += '<td style="padding:4px; text-align:center; color:#ff8; border-left:2px solid #446;">' + scComboTxt + '</td>';
                        }
                        // Cella AVV
                        bodyHTML += '<td style="padding:4px; text-align:center; color:#555; border-left:2px solid #844;">-</td>';
                        for (var scIdx2 = 0; scIdx2 < uniqueOpzLabels.length; scIdx2++) {
                            var _lbl2 = uniqueOpzLabels[scIdx2];
                            var scRes2 = scoreOpzPreCalc[_lbl2];
                            var scScore2 = scRes2 ? scRes2.score.toFixed(1) : '-';
                            var scCol2 = _bLabelMap[_lbl2] ? '#af8' : _mLabelMap[_lbl2] ? '#fc8' : _vLabelMap[_lbl2] ? '#8cf' : '#ff8';
                            var scBorder2 = _bLabelMap[_lbl2] ? 'border-left:1px dotted #585;' : _mLabelMap[_lbl2] ? 'border-left:1px dotted #885;' : _vLabelMap[_lbl2] ? 'border-left:1px dotted #46a;' : 'border-left:2px solid #446;';
                            bodyHTML += '<td style="padding:4px; text-align:center; color:' + scCol2 + '; ' + scBorder2 + '">' + scScore2 + '</td>';
                        }
                        bodyHTML += '</tr>';
                        // Riga MATTE usate/rimanenti
                        bodyHTML += '<tr style="' + rowBase + '">';
                        bodyHTML += '<td colspan="' + colsSpan + '" style="padding:4px 6px; color:#8af; font-size:10px; font-weight:bold; letter-spacing:1px;">MATTE us/rim</td>';
                        for (var scIdx3 = 0; scIdx3 < uniqueOpzLabels.length; scIdx3++) {
                            var stRes3 = statOpzPreCalc[uniqueOpzLabels[scIdx3]];
                            var stTxt3 = stRes3 ? stRes3.matteUsate + '/' + stRes3.matteRim : '-';
                            var stCol3 = stRes3 && stRes3.matteUsate > 0 ? '#faa' : '#888';
                            var stBorder3 = _bLabelMap[uniqueOpzLabels[scIdx3]] ? 'border-left:1px dotted #585;' : _mLabelMap[uniqueOpzLabels[scIdx3]] ? 'border-left:1px dotted #885;' : _vLabelMap[uniqueOpzLabels[scIdx3]] ? 'border-left:1px dotted #46a;' : 'border-left:2px solid #446;';
                            bodyHTML += '<td style="padding:4px; text-align:center; color:' + stCol3 + '; ' + stBorder3 + '">' + stTxt3 + '</td>';
                        }
                        bodyHTML += '</tr>';
                        // Riga CARTE RIMANENTI / ORFANE
                        bodyHTML += '<tr style="' + rowBase + '">';
                        bodyHTML += '<td colspan="' + colsSpan + '" style="padding:4px 6px; color:#8af; font-size:10px; font-weight:bold; letter-spacing:1px;">rim/Orfane</td>';
                        for (var scIdx4 = 0; scIdx4 < uniqueOpzLabels.length; scIdx4++) {
                            var stRes4 = statOpzPreCalc[uniqueOpzLabels[scIdx4]];
                            var rim4 = stRes4 !== undefined ? stRes4.carteRim : '-';
                            var orf4 = stRes4 !== undefined ? stRes4.orfane : '-';
                            var colRim4 = stRes4 && stRes4.carteRim <= 1 ? '#f84' : '#aaa';
                            var colOrf4 = stRes4 && stRes4.orfane >= 3 ? '#f44' : stRes4 && stRes4.orfane >= 1 ? '#f84' : '#666';
                            var cell4 = '<span style="color:' + colRim4 + ';">' + rim4 + '</span>' +
                                        '<span style="color:#555;">/</span>' +
                                        '<span style="color:' + colOrf4 + ';">' + orf4 + '</span>';
                            var stBorder4 = _bLabelMap[uniqueOpzLabels[scIdx4]] ? 'border-left:1px dotted #585;' : _mLabelMap[uniqueOpzLabels[scIdx4]] ? 'border-left:1px dotted #885;' : _vLabelMap[uniqueOpzLabels[scIdx4]] ? 'border-left:1px dotted #46a;' : 'border-left:2px solid #446;';
                            bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; ' + stBorder4 + '">' + cell4 + '</td>';
                        }
                        bodyHTML += '</tr>';
                        // Riga SCALABILI NOI / LORO
                        bodyHTML += '<tr style="' + rowBase + '">';
                        bodyHTML += '<td colspan="' + colsSpan + '" style="padding:4px 6px; color:#8af; font-size:10px; font-weight:bold; letter-spacing:1px;">Scal noi/loro</td>';
                        for (var scIdx5 = 0; scIdx5 < uniqueOpzLabels.length; scIdx5++) {
                            var stRes5 = statOpzPreCalc[uniqueOpzLabels[scIdx5]];
                            var noi5  = stRes5 !== undefined ? stRes5.scalNoi  : '-';
                            var loro5 = stRes5 !== undefined ? stRes5.scalLoro : '-';
                            var colNoi5  = stRes5 && stRes5.scalNoi  > 0 ? '#4f8' : '#666';
                            var colLoro5 = stRes5 && stRes5.scalLoro > 0 ? '#f44' : '#666';
                            var cell5 = '<span style="color:' + colNoi5 + ';">' + noi5 + '</span>' +
                                        '<span style="color:#555;">/</span>' +
                                        '<span style="color:' + colLoro5 + ';">' + loro5 + '</span>';
                            var stBorder5 = _bLabelMap[uniqueOpzLabels[scIdx5]] ? 'border-left:1px dotted #585;' : _mLabelMap[uniqueOpzLabels[scIdx5]] ? 'border-left:1px dotted #885;' : _vLabelMap[uniqueOpzLabels[scIdx5]] ? 'border-left:1px dotted #46a;' : 'border-left:2px solid #446;';
                            bodyHTML += '<td style="padding:4px; text-align:center; font-family:monospace; ' + stBorder5 + '">' + cell5 + '</td>';
                        }
                        bodyHTML += '</tr>';
                    }
                    bodyHTML += '</table></div>';
                    // d viene letto da _diagData (stato al momento della decisione AI) con copia di lavoro.
                    // Le opzioni B/M iniettate sono valide per tutta la sessione di visualizzazione.
                }

                // Renderizza inline nella debug window (no modal overlay)
                var root = document.getElementById('analisi-root');
                if (root) root.innerHTML = bodyHTML;
            } catch(e) {
                alert("Errore Analisi Parallela: " + e.message + "\\n" + e.stack);
            }
        }

        // Helper: apre un modal generico
        function apriModal(titolo, body, footer, contentStyle) {
            var cs = contentStyle || 'width:1080px; max-width:95vw; min-height:80vh; max-height:95vh; overflow-y:auto; position:absolute; right:20px; top:20px; margin:0;';
            var html = '<div class="modal-overlay" onclick="chiudiModal(event)">' +
                '<div class="modal-content" onclick="event.stopPropagation()" style="' + cs + '">' +
                    '<div class="modal-header">' +
                        '<span class="modal-title">' + titolo + '</span>' +
                        '<span class="modal-close" onclick="chiudiModal()">&times;</span>' +
                    '</div>' +
                    body +
                    (footer ? '<div class="modal-footer" style="font-size:11px;color:#999;border-top:1px solid #444;padding:6px 12px">' +
                        footer + '</div>' : '') +
                '</div></div>';
            document.body.insertAdjacentHTML('beforeend', html);
        }

        function chiudiModal(event) {
            if (event && event.target.className !== 'modal-overlay') return;
            var modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
        }

        function scaricaStatoJSON() {
            try {
                if (!window.opener || !window.opener.game) {
                    alert('Impossibile accedere allo stato del gioco principale.');
                    return;
                }
                var g = window.opener.game;
                
                // Creiamo un clone filtrato per evitare riferimenti circolari
                var cloneSafe = {
                    turno: g.turno,
                    fase: g.fase,
                    giocatoreCorrente: g.giocatoreCorrente,
                    mazzoCopertoSize: g.mazzo.length,
                    scarti: g.scarti.map(c => ({id: c.id, num: c.numero, seme: c.seme, punti: c.punti})),
                    giocatori: g.giocatori.map(p => ({
                        nome: p.nome, squadra: p.squadra, carteSize: p.carte.length, haPozzetto: p.haPozzetto,
                        personaggio: p.personaggio ? p.personaggio.nome : 'umano',
                        coeff: p.coefficienti || {},
                        carteScoperte: p.carte.map(c => ({id: c.id, num: c.numero, seme: c.seme, punti: c.punti})), // baro un po' e salvo le carte
                        osservazioni: p.osservazioni // salva l'intero storico limitato delle analisi
                    })),
                    combinazioniNoi: g.combinazioniNoi.map(cb => ({carte: cb.carte.map(c=>c.id), isBurraco: cb.isBurraco, punti: cb.punti})),
                    combinazioniLoro: g.combinazioniLoro.map(cb => ({carte: cb.carte.map(c=>c.id), isBurraco: cb.isBurraco, punti: cb.punti})),
                    diagData: (function() {
                        var dd = window.opener._diagData;
                        if (!dd) return null;
                        var out = {};
                        ['prePesca', 'postPesca', 'postPozzetto'].forEach(function(fase) {
                            if (!dd[fase]) return;
                            var fd = dd[fase];
                            out[fase] = {
                                giocatore: fd.giocatore,
                                scenari: fd.scenari,
                                candidati: (fd.candidati || []).map(function(c) {
                                    return {
                                        scenario: c.scenario,
                                        label: c.label,
                                        score: c.score,
                                        opzScore: c.opzScore,
                                        mazzBonus: c.mazzBonus,
                                        pozzBonus: c.pozzBonus,
                                        scartoCarta: c.scartoCarta,
                                        rispettaVincolo: c.rispettaVincolo,
                                        carteRim: c.carteRim
                                    };
                                }),
                                best: fd.best ? {
                                    scenario: fd.best.scenario,
                                    label: fd.best.label,
                                    score: fd.best.score,
                                    opzScore: fd.best.opzScore,
                                    mazzBonus: fd.best.mazzBonus,
                                    pozzBonus: fd.best.pozzBonus,
                                    scartoCarta: fd.best.scartoCarta
                                } : null,
                                logLines: fd.logLines
                            };
                        });
                        return out;
                    })()
                };

                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cloneSafe, null, 2));
                var dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "burraco_debug_turno_" + g.turno + ".json");
                document.body.appendChild(dlAnchorElem); // richiesto da firefox
                dlAnchorElem.click();
                dlAnchorElem.remove();
            } catch (err) {
                alert('Errore durante esportazione JSON: ' + err.message);
            }
        }

        // ============================================================
        // CALCOLO SCARTO per OPZ selezionata (Algoritmo B - scoring ex-novo)
        // ============================================================

        function _isAttaccabileAdAvversario(carta, combo) {
            return (window.opener || window).isCartaAttaccabileACombo(carta, combo);
        }

        window.calcolaScartoPer = function(opzIdx, silent) {
            var con = window.opener ? window.opener.console : console;
            if (silent) { con = { group: function(){}, groupEnd: function(){}, log: function(){}, warn: function(){} }; }
            var d = window._analisiData;
            if (!d || !d.opzioniScenario) { con.log('[Scarto] Nessun dato analisi disponibile'); return null; }
            var opt = d.opzioniScenario[opzIdx];
            if (!opt && opzIdx !== -1) { con.log('[Scarto] OPZ' + (opzIdx + 1) + ' non trovata'); return null; }

            var _w = window.opener || window;
            var game = _w.game;
            var Strategia = _w.Strategia;
            var giocatore = game.giocatori[window._analisiGiocatoreIdx];
            var comboAvversarie = giocatore.squadra === 0 ? game.combinazioniLoro : game.combinazioniNoi;
            var comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;

            var opzLabel = opzIdx === -1 ? 'OPZ0' : ('OPZ' + (opzIdx + 1));
            var opzDesc = opt ? (opt.descCarte || '?') : 'nessuna combinazione';
            con.group('=== CALCOLO SCARTO per ' + opzLabel + ' [' + opzDesc + '] ===');
            con.log('Scenario:', window._analisiScenario, '| Giocatore:', d.giocatore, '| Combo avversarie a terra:', comboAvversarie.length);

            var carteUsateSet = opt ? opt.carteUsate : new Set();
            var candidati = d.classifica.filter(function(r) {
                return (r.origine === 'mano' || r.origine === 'mazzo' || r.origine === 'scarto') && !carteUsateSet.has(r.cartaRef.id);
            });
            con.log('Carte residue candidabili (' + candidati.length + '): ' + candidati.map(function(r) { return r.carta; }).join(', '));
            if (candidati.length === 0) { con.log('Nessuna carta residua'); con.groupEnd(); return null; }

            // Pre-calcola pericoli avversari (tutte le combo, non solo la prima)
            var pericoliAvversari = {};
            candidati.forEach(function(r) {
                var pericoli = [];
                comboAvversarie.forEach(function(combo) {
                    if (_isAttaccabileAdAvversario(r.cartaRef, combo)) {
                        pericoli.push({ lunghezza: combo.carte.length + 1, tipo: combo.tipo === 1 ? 'T' : 'S',
                            desc: combo.carte.map(function(cc) { return Strategia.nomeCarta ? Strategia.nomeCarta(cc) : (cc.numero + (cc.seme||'')); }).join(' ') });
                    }
                });
                pericoliAvversari[r.cartaRef.id] = pericoli;
            });

            // Pre-calcola utilità propria (combo della propria squadra)
            var pericoliPropri = {};
            candidati.forEach(function(r) {
                var propri = [];
                comboSquadra.forEach(function(combo) {
                    if (_isAttaccabileAdAvversario(r.cartaRef, combo)) {
                        propri.push({ lunghezza: combo.carte.length + 1, tipo: combo.tipo === 1 ? 'T' : 'S',
                            desc: combo.carte.map(function(cc) { return Strategia.nomeCarta ? Strategia.nomeCarta(cc) : (cc.numero + (cc.seme||'')); }).join(' ') });
                    }
                });
                pericoliPropri[r.cartaRef.id] = propri;
            });

            // FASE 1: Esclusioni assolute
            con.group('FASE 1 — Esclusioni assolute');
            var fase1 = [];
            candidati.forEach(function(r) {
                if (r.isMatta) { con.log('[ESCLUSA] ' + r.carta + ' -> jolly / pinella'); return; }
                var complBurraco = (pericoliAvversari[r.cartaRef.id] || []).some(function(p) { return p.lunghezza >= 7; });
                if (complBurraco) {
                    var pb = pericoliAvversari[r.cartaRef.id].find(function(p) { return p.lunghezza >= 7; });
                    con.log('[ESCLUSA] ' + r.carta + ' -> completerebbe burraco! (' + pb.desc + ' -> ' + pb.lunghezza + pb.tipo + ')');
                    return;
                }
                fase1.push(r);
            });
            if (fase1.length === 0) { fase1 = candidati.filter(function(r) { return !r.isMatta; }); if (fase1.length === 0) fase1 = candidati; }
            con.log('Rimanenti (' + fase1.length + '): ' + fase1.map(function(r) { return r.carta; }).join(', '));
            con.groupEnd();

            // FASE 2: Connettivita residua
            con.group('FASE 2 — Connettivita residua nella mano ridotta');
            var connettivita = {};
            fase1.forEach(function(r) {
                var conn = 0; var detConn = [];
                fase1.filter(function(x) { return x.cartaRef.id !== r.cartaRef.id; }).forEach(function(x) {
                    if (x.isMatta || r.isMatta) return;
                    if (x.cartaRef.numero === r.cartaRef.numero) { conn++; detConn.push(x.carta + '(T)'); return; }
                    if (x.cartaRef.seme && x.cartaRef.seme === r.cartaRef.seme) {
                        var dist = Math.abs((x.cartaRef.numero||0) - (r.cartaRef.numero||0));
                        if (dist === 1) { conn++; detConn.push(x.carta + '(S)'); }
                        else if (dist === 2) { conn += 0.5; detConn.push(x.carta + '(S~buco)'); }
                    }
                });
                connettivita[r.cartaRef.id] = conn;
                con.log(r.carta + (conn === 0 ? ' -> ORFANA' : ' -> conn=' + conn + ' [' + detConn.join(', ') + ']'));
            });
            con.groupEnd();

            // FASE 3: Scoring ex-novo
            con.group('FASE 3 — Scoring ex-novo  (A:decentralizzazione | B:connettivita | C:pericolo avv | D:utile propria)');
            var scoreFase3 = fase1.map(function(r) {
                var score = 0; var righe = [];
                var centralita = Strategia.getCentralita ? Strategia.getCentralita(r.cartaRef.numero) : 0.5;
                var cff = window.coeffScoreOpz;
                var scoreDecent = (1 - centralita) * (cff.coeffScartoDecent || 5);
                score += scoreDecent;
                righe.push('  A) Decentralizzazione: num=' + r.cartaRef.numero + ', getCentralita=' + centralita.toFixed(2) + '  =>  (1-' + centralita.toFixed(2) + ')*' + (cff.coeffScartoDecent || 5) + ' = ' + scoreDecent.toFixed(1));
                var conn = connettivita[r.cartaRef.id] || 0;
                var scoreConn = -(conn * (cff.coeffScartoConn || 8));
                if (conn > 0) { score += scoreConn; righe.push('  B) Connettivita: ' + conn + ' conn * -' + (cff.coeffScartoConn || 8) + ' = ' + scoreConn.toFixed(1)); }
                else { righe.push('  B) Connettivita: orfana, nessuna penalita'); }
                var pericoli = pericoliAvversari[r.cartaRef.id] || [];
                if (pericoli.length > 0) {
                    var peggiore = pericoli.reduce(function(w, p) { return p.lunghezza > w.lunghezza ? p : w; }, pericoli[0]);
                    var altriDesc = pericoli.length > 1 ? ' (altri ignorati: ' + pericoli.filter(function(p) { return p !== peggiore; }).map(function(p) { return p.lunghezza + p.tipo; }).join(', ') + ')' : '';
                    var cf = window.coeffScoreOpz;
                    var pen = peggiore.lunghezza >= 6 ? -(cf.penScarto6c || 25) : peggiore.lunghezza === 5 ? -(cf.penScarto5c || 15) : -(cf.penScarto4c || 5);
                    score += pen;
                    righe.push('  C) Pericolo avversario: [' + peggiore.desc + '] raggiunge ' + peggiore.lunghezza + peggiore.tipo + altriDesc + '  =>  ' + pen);
                } else { righe.push('  C) Pericolo avversario: nessuno'); }
                var propri = pericoliPropri[r.cartaRef.id] || [];
                if (propri.length > 0) {
                    var cf2 = window.coeffScoreOpz;
                    var penProp = -(propri.length * (cf2.penScartoCalabile || 7));
                    score += penProp;
                    righe.push('  D) Utile propria combo: ' + propri.map(function(p) { return '['+p.desc+'] +1→'+p.lunghezza+p.tipo; }).join(', ') + '  =>  ' + penProp.toFixed(1));
                } else { righe.push('  D) Utile propria combo: nessuna'); }
                con.log(r.carta + '  =>  SCORE = ' + score.toFixed(1));
                righe.forEach(function(riga) { con.log(riga); });
                return { r: r, score: score };
            });
            scoreFase3.sort(function(a, b) { return b.score - a.score; });
            con.log('Classifica: ' + scoreFase3.map(function(x) { return x.r.carta + '(' + x.score.toFixed(1) + ')'; }).join(' > '));
            con.groupEnd();

            // FASE 4: Override matta
            con.group('FASE 4 — Override matta');
            var candidatoFinale = scoreFase3[0];
            if (candidatoFinale && candidatoFinale.r.isMatta && scoreFase3.length > 1) { con.log('Candidato sarebbe matta — uso seconda scelta'); candidatoFinale = scoreFase3[1]; }
            else { con.log('Nessun override necessario'); }
            con.groupEnd();

            if (candidatoFinale) {
                con.log('%c✓ CARTA CONSIGLIATA: ' + candidatoFinale.r.carta + '   (score=' + candidatoFinale.score.toFixed(1) + ')', 'font-size:14px; font-weight:bold; color:#4f4; background:#030');
            } else { con.log('Nessun candidato disponibile'); }
            con.groupEnd();
            return candidatoFinale ? { carta: candidatoFinale.r.carta, cartaRef: candidatoFinale.r.cartaRef, origine: candidatoFinale.r.origine, score: candidatoFinale.score } : null;
        };

        // ============================================================
        // COEFFICIENTI SCORE OPZ (persistono tra rebuild della modale)
        // ============================================================
        // Usa sempre l'oggetto del main window (stessa referenza → modifiche nel popup propagano al gioco)
        window.coeffScoreOpz = window.opener.coeffScoreOpz;

        window.chiudiPannelloCoeff = function() {
            var el = document.getElementById('pannello-coeff');
            if (el) el.remove();
        };

        window.mostraCoefficienti = function() {
            if (document.getElementById('pannello-coeff')) { window.chiudiPannelloCoeff(); return; }
            var cf = window.coeffScoreOpz;
            var campiOpz = [
                ['valCarte',          'Coeff. valore carte',      0,   2, 0.05],
                ['premioTris',        'Premio tris (3c)',          0,  50,    1],
                ['premioScala',       'Premio scala (3c)',         0,  50,    1],
                ['premioTrisEstremo', 'Bonus tris estremo A/3/K', 0,  30,    1],
                ['premio4c',          'Premio 4a carta',           0,  50,    1],
                ['premio5c',          'Premio 5a carta',           0, 100,    1],
                ['premio6c',          'Premio 6a carta',           0, 200,    1],
                ['premioBurraco',     'Premio burraco (7a carta)', 0, 500,    5],
                ['premioOltreBurraco','Premio 8a carta e oltre',   0, 200,    5],
                ['penMattaBase',      'Pen. matta (per carta >2)', 0,  50,    1],
                ['penCartaOrfana',    'Penalità carta orfana',     0,  20,    1]
            ];
            var campiOpz2 = [
                ['premioLiberaMattaInterna', 'Libera matta interna',       0,  50,    1],
                ['premioLiberaMattaBordo',   'Libera matta bordo',         0,  50,    1],
                ['premioMattaSolitaria',     'Matta solitaria (fine part.)',0, 500,    5],
                ['penCalataMatta',           'Pen. calata matta',          0, 100,    5],
                ['premioPrimoBurraco',       'Premio primo burraco',       0, 200,    5],
                ['bonusAvv4c', 'Bonus sottr. avv →4c', 0,  50,  1],
                ['bonusAvv5c', 'Bonus sottr. avv →5c', 0, 100,  1],
                ['bonusAvv6c', 'Bonus sottr. avv →6c', 0, 200,  1],
                ['bonusAvv7c', 'Bonus sottr. avv →7c', 0, 500,  5],
                ['bonusAvv8c', 'Bonus sottr. avv →8c+',0, 200,  5]
            ];
            var campiScarti = [
                ['coeffScartoDecent', 'Coeff. decentralizzazione',      0,  20, 0.5],
                ['coeffScartoConn',   'Coeff. connettività',             0,  30, 0.5],
                ['penScarto6c',       'Pen. scarto → avv 6c',           0, 100,   1],
                ['penScarto5c',       'Pen. scarto → avv 5c',           0,  50,   1],
                ['penScarto4c',       'Pen. scarto → avv ≤4c',          0,  30,   1],
                ['penScartoCalabile', 'Pen. scarto calabile su propria', 0,  30,   1]
            ];
            var campiVari = [
                ['premioMazzo', 'Premio mazzo (pesca dal mazzo)', 0, 50, 1],
                ['premioPozzetto', 'Premio pozzetto (svuota mano pre-pozzetto)', 0, 200, 5]
            ];
            function rigaCampo(c) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">' +
                    '<label style="flex:1;">' + c[1] + '</label>' +
                    '<input id="coeff-' + c[0] + '" type="number" value="' + cf[c[0]] + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" ' +
                    'style="width:66px;text-align:right;background:#2a2a3e;border:1px solid #556;color:#fff;padding:3px 5px;border-radius:3px;"></div>';
            }
            var colStyle = 'flex:1;min-width:220px;';
            var titStyle = 'font-weight:bold;margin-bottom:10px;font-size:12px;padding-bottom:5px;border-bottom:1px solid #446;';
            var html = '<div id="pannello-coeff" style="position:fixed;top:60px;right:20px;z-index:9999;background:#1a1a2e;border:2px solid #668;border-radius:8px;padding:16px;font-size:12px;color:#ccc;box-shadow:0 4px 24px rgba(0,0,0,0.6);">' +
                '<div style="display:flex;gap:20px;">' +
                '<div style="' + colStyle + '">' +
                '<div style="' + titStyle + 'color:#adf;">Coefficienti Score OPZ</div>';
            campiOpz.forEach(function(c) { html += rigaCampo(c); });
            html += '</div>' +
                '<div style="width:1px;background:#446;margin:0 4px;"></div>' +
                '<div style="' + colStyle + '">' +
                '<div style="' + titStyle + 'color:#adf;">Score OPZ (bonus/avv)</div>';
            campiOpz2.forEach(function(c) { html += rigaCampo(c); });
            html += '</div>' +
                '<div style="width:1px;background:#446;margin:0 4px;"></div>' +
                '<div style="' + colStyle + '">' +
                '<div style="' + titStyle + 'color:#fda;">Coefficienti Calcolo Scarti</div>';
            campiScarti.forEach(function(c) { html += rigaCampo(c); });
            html += '</div>' +
                '<div style="width:1px;background:#446;margin:0 4px;"></div>' +
                '<div style="' + colStyle + '">' +
                '<div style="' + titStyle + 'color:#afa;">Vari</div>';
            campiVari.forEach(function(c) { html += rigaCampo(c); });
            html += '</div></div>' +
                '<div style="margin-top:14px;display:flex;gap:8px;">' +
                '<button onclick="applicaCoefficienti(window._analisiGiocatoreIdx,window._analisiScenario)" style="flex:1;padding:6px;background:#4a9;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold;">Applica e Ricalcola</button>' +
                '<button onclick="chiudiPannelloCoeff()" style="padding:6px 12px;background:#633;border:none;color:#fff;border-radius:4px;cursor:pointer;">X</button>' +
                '</div></div>';
            document.body.insertAdjacentHTML('beforeend', html);
        };

        window.applicaCoefficienti = function(gIdx, scen) {
            var cf = window.coeffScoreOpz;
            ['valCarte','premioTris','premioScala','premioTrisEstremo','premio4c','premio5c','premio6c','premioBurraco','premioOltreBurraco','penMattaBase','penCartaOrfana','premioLiberaMattaInterna','premioLiberaMattaBordo','premioMattaSolitaria','penCalataMatta','premioPrimoBurraco','bonusAvv4c','bonusAvv5c','bonusAvv6c','bonusAvv7c','bonusAvv8c','coeffScartoDecent','coeffScartoConn','penScarto6c','penScarto5c','penScarto4c','penScartoCalabile','premioMazzo','premioPozzetto'].forEach(function(k) {
                var el = document.getElementById('coeff-' + k);
                if (el) cf[k] = parseFloat(el.value) || 0;
            });
            window.chiudiPannelloCoeff();
            window.opener.mostraAnalisiParallela(gIdx, scen);
        };

        // Delega calcolaScoreOpz all'opener (definizione unica) con il contesto del popup
        window.calcolaScoreOpz = function(opzIdx, silent) {
            var op = window.opener;
            var saved_d  = op._analisiData;
            var saved_i  = op._analisiGiocatoreIdx;
            var saved_cf = op.coeffScoreOpz;
            op._analisiData          = window._analisiData;
            op._analisiGiocatoreIdx  = window._analisiGiocatoreIdx;
            op.coeffScoreOpz         = window.coeffScoreOpz;
            var r = op.calcolaScoreOpz(opzIdx, silent);
            op._analisiData          = saved_d;
            op._analisiGiocatoreIdx  = saved_i;
            op.coeffScoreOpz         = saved_cf;
            return r;
        };

        // Wrapper: esegue scarto + score con log completo al click OPZ
        window.analizzaOpz = function(opzIdx) {
            window.calcolaScoreOpz(opzIdx, false);
        };

        // OPZnC: usa analisiData del dC (mano ridotta) per mostrare scarto+score corretto
        window.analizzaOpzC = function() {
            var con = window.opener ? window.opener.console : console;
            if (!window._opzCData || !window._opzCFullData) { con.log('[OPZnC] Nessun dato disponibile'); return; }
            var savedData = window._analisiData;
            var savedScenario = window._analisiScenario;
            var savedIdx = window._analisiGiocatoreIdx;
            con.log('--- OPZnC: carta esclusa dalle calate = ' + (window._opzCSacrificataLabel || '?') + ' ---');
            // Score OPZ (include scarto calcolato su dC):
            window._analisiData = window._opzCData;
            window._analisiScenario = 'scarti';
            window._analisiGiocatoreIdx = window._opzCGiocIdx;
            window.calcolaScoreOpz(window._opzCOpzIdx, false);
            // Ripristina
            window._analisiData = savedData;
            window._analisiScenario = savedScenario;
            window._analisiGiocatoreIdx = savedIdx;
        };

        // Delega _calcolaVariantiB all'opener (definizione unica) con il contesto del popup
        window._calcolaVariantiB = function(d, game, giocatoreIdx) {
            var op = window.opener;
            var saved_d  = op._analisiData;
            var saved_i  = op._analisiGiocatoreIdx;
            op._analisiData         = d;
            op._analisiGiocatoreIdx = giocatoreIdx;
            var r = op._calcolaVariantiB(d, game, giocatoreIdx);
            op._analisiData         = saved_d;
            op._analisiGiocatoreIdx = saved_i;
            return r;
        };

        // Delega _calcolaVariantiM all'opener (definizione unica) con il contesto del popup
        window._calcolaVariantiM = function(d, game, giocatoreIdx) {
            var op = window.opener;
            var saved_d  = op._analisiData;
            var saved_i  = op._analisiGiocatoreIdx;
            op._analisiData         = d;
            op._analisiGiocatoreIdx = giocatoreIdx;
            var r = op._calcolaVariantiM(d, game, giocatoreIdx);
            op._analisiData         = saved_d;
            op._analisiGiocatoreIdx = saved_i;
            return r;
        };

        // scegliBestOpzioneAI è definita a livello globale nella main window (burraco-ui.js)

        // ============================================================
        // ELABORA: confronta tutti gli scenari/OPZ e sceglie il meglio
        // ============================================================
        // elaboraOpz: wrapper sottile su scegliBestOpzioneAI (fonte unica di logica)
        // Usa i coefficienti del popup (potrebbero differire dal main window se modificati nel pannello)
        window.elaboraOpz = function() {
            var op = window.opener;
            // Mostra log pre-salvato da _diagData se disponibile
            var diagData = op._diagData;
            // Stessa logica di mostraAnalisiParallela: preferisci postPesca solo se stesso giocatore
            var _elaboraFaseOrder = ['prePesca', 'postPesca', 'postPozzetto'];
            if (window._analisiScenario === 'mano') {
                var _ePP  = diagData && diagData['postPesca'];
                var _ePre = diagData && diagData['prePesca'];
                if (_ePP && _ePre && _ePP.giocatoreIdx === _ePre.giocatoreIdx)
                    _elaboraFaseOrder = ['postPesca', 'postPozzetto', 'prePesca'];
            }
            var fase = null, faseData = null;
            _elaboraFaseOrder.forEach(function(f) {
                if (!fase && diagData && diagData[f] && diagData[f].analisiDataPerScenario &&
                        diagData[f].analisiDataPerScenario[window._analisiScenario]) {
                    fase = f; faseData = diagData[f];
                }
            });
            if (!faseData) { fase = 'prePesca'; faseData = diagData && diagData['prePesca']; }
            if (faseData && faseData.logLines && faseData.logLines.length > 0) {
                var con = window.opener ? window.opener.console : console;
                con.group('%c▶ Log Analisi AI — ' + fase, 'font-size:13px;font-weight:bold;color:#4af;background:#001a30');
                faseData.logLines.forEach(function(l) { con.log(l); });
                con.groupEnd();
                return;
            }
            // Fallback: riesegui AI (verbose) se _diagData non disponibile
            var g = op.game.giocatori[window._analisiGiocatoreIdx];
            var savedCf = op.coeffScoreOpz;
            op.coeffScoreOpz = window.coeffScoreOpz;
            var soloMano = (window._analisiScenario === 'mano' || window._analisiScenario === 'mazzo');
            op.scegliBestOpzioneAI(g, soloMano, true);
            op.coeffScoreOpz = savedCf;
            window._analisiData          = op._analisiData;
            window._analisiScenario      = op._analisiScenario;
            window._analisiGiocatoreIdx  = op._analisiGiocatoreIdx;
        };

        // Chiudi con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') chiudiModal();
        });

        // Auto-apri analisi parallela all'apertura della pagina debug
        setTimeout(function() { window.mostraAnalisiParallela(${indiceGiocatore}, '${defaultScenario || "scarti"}'); }, 200);
    </script>
</body>
</html>`;
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
registraMossa = function (azione, dettagli = {}) {
    originalRegistraMossa(azione, dettagli);
    // Aggiorna la finestra diagnostica se aperta
    setTimeout(aggiornaDiagnostica, 100);
};

// Chiudi tutte le finestre popup quando si chiude la pagina
window.addEventListener('beforeunload', () => {
    if (diagWindow && !diagWindow.closed) {
        diagWindow.close();
    }
    if (detailWindow && !detailWindow.closed) {
        detailWindow.close();
    }
    // Chiudi finestra debug AI
    if (debugWindow && !debugWindow.closed) {
        debugWindow.close();
    }
});

// ============================================================================
// MODAL TRASPARENZA
// ============================================================================

// ============================================================================
// AVVIO
// ============================================================================

function init() {
    console.log('Burraco 3.0 - Inizializzazione');

    // Carica suoni
    game.suoni = {
        deal: $('#snd-deal'),
        pesca: $('#snd-pesca'),
        scarta: $('#snd-scarta'),
        combinazione: $('#snd-combinazione'),
        ordina: $('#snd-ordina'),
        tada: $('#snd-vittoria'),
        applauso: $('#snd-burraco'),
        sconfitta: $('#snd-sconfitta'),
        pozzetto: $('#snd-pozzetto'),
        magic: $('#snd-pozzetto'),
        dindon: $('#snd-dindon')
    };

    // Setup eventi UI
    setupEventi();

    // Hook chiamato da iniziaPartita() dopo render():
    // mostra dealer badge, anima la distribuzione, avvia AI se primo giocatore non è umano
    window.burracoOnInizio = function () {
        aggiornaDealerBadge();
        _mostraToastMazziere(function () {
            animaDealBurraco(function () {
                if (!game.giocatori[game.giocatoreCorrente].isUmano) {
                    setTimeout(turnoAI, 800);
                }
            });
        });
    };

    // Se c'e' un flag localStorage da reload, leggi modalita e avvia
    var autoModalita = null;
    try {
        autoModalita = localStorage.getItem('burraco_nuova');
        if (autoModalita) localStorage.removeItem('burraco_nuova');
    } catch (e) { }

    // Leggi stato torneo da localStorage (persiste tra reload)
    try {
        var torneoSalvato = JSON.parse(localStorage.getItem('burraco_torneo') || 'null');
        if (torneoSalvato) game.torneo = torneoSalvato;
    } catch (e) { }

    if (autoModalita) {
        // Imposta il radio button corrispondente
        var radio = document.querySelector('input[name="modalita"][value="' + autoModalita + '"]');
        if (radio) radio.checked = true;
        iniziaPartita();
    } else {
        // Mostra il modal di scelta partita, ripristinando le preferenze salvate
        _ripristinaPrefsModal();
        mostraModal('modal-nuova');
    }
}

function _ripristinaPrefsModal() {
    var selLimite = document.getElementById('sel-limite-torneo');
    var divCustom = document.getElementById('div-limite-custom');

    // Ripristina preferenze salvate (o imposta default: torneo 1005)
    try {
        var prefs = JSON.parse(localStorage.getItem('burraco_prefs') || 'null');
        if (prefs) {
            var radioTipo = document.querySelector('input[name="tipo-partita"][value="' + prefs.tipoPartita + '"]');
            if (radioTipo) radioTipo.checked = true;
            if (prefs.tipoPartita === 'torneo' && selLimite) {
                selLimite.value = prefs.limiteSelVal || '1005';
                if (prefs.limiteSelVal === 'custom' && prefs.limiteCustom) {
                    document.getElementById('inp-limite-custom').value = prefs.limiteCustom;
                    if (divCustom) divCustom.style.display = '';
                }
            }
        }
        // Se non ci sono prefs, il default HTML (torneo + 1005) è già corretto
    } catch (e) { }
}

document.addEventListener('DOMContentLoaded', () => {
    // Priority: 1. Explicit window.currentLang (from HTML shell)
    // 2. LocalStorage 3. URL param 4. Default 'it'
    let lang = window.currentLang;
    if (!lang) {
        lang = localStorage.getItem('userLanguage');
        if (!lang) {
            const urlParams = new URLSearchParams(window.location.search);
            lang = urlParams.get('lang');
        }
    }
    if (!lang) lang = 'it';
    setLanguage(lang);
    init();
});
