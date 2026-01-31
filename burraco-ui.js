// ============================================================================
// BURRACO - Gioco di carte italiano
// FILE: burraco-ui.js
// Rendering, animazioni, eventi, modali, diagnostica
// Richiede: burraco-core.js, burraco-game.js
// ============================================================================

// ============================================================================
// SETUP EVENTI
// ============================================================================

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
    container.innerHTML = '';

    // Aggiorna indicatore scarti (stesso stile di Noi/Loro)
    const scartiInfo = $('#scarti-info');
    if (scartiInfo) {
        const numScarti = game.scarti.length;
        const puntiScarti = game.scarti.reduce((sum, c) => sum + (c.punti || 0), 0);
        const numEl = scartiInfo.querySelector('.punti-numero');
        const valEl = scartiInfo.querySelector('.punti-valore');
        if (numEl) numEl.textContent = `Carte: ${numScarti}`;
        if (valEl) valEl.textContent = `Punti: ${puntiScarti}`;
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
        if (numEl) numEl.textContent = `Carte: ${numCarte}`;
        if (valEl) valEl.textContent = `Punti: ${puntiMano}`;
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

        if (puntiBurracoEl) puntiBurracoEl.textContent = `Burraco: ${puntiBurraco}`;
        if (puntiCarteEl) puntiCarteEl.textContent = `Carte: ${puntiCarte}`;
        if (puntiPozzettoEl) {
            puntiPozzettoEl.textContent = `Pozzetto: ${puntiPozzetto}`;
            puntiPozzettoEl.classList.toggle('non-preso', !haPozzetto);
        }
        if (puntiTotaleEl) puntiTotaleEl.textContent = `= ${totale}`;
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
    } else if (risultato.tipo === TIPO_TRIS) {
        // Per i tris, imposta jollycomeNumero sulle matte (jolly e pinelle)
        const numeroTris = risultato.numero;
        for (const c of carteOrdinate) {
            if (c.isJolly || c.isPinella) {
                c.jollycomeNumero = numeroTris;
            }
        }
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

        // Controlla se stiamo aggiungendo un Asso a una scala che termina con K
        // In tal caso, l'Asso deve andare in fondo (assoAlto = true)
        if (carta.numero === 1 && !combinazione.assoAlto) {
            // Trova il max delle carte nella scala (escluso l'Asso appena aggiunto)
            const numeriEsistenti = combinazione.carte
                .filter(c => c !== carta)
                .map(c => isCartaMatta(c) ? c.jollycomeNumero : c.numero);
            const maxEsistente = Math.max(...numeriEsistenti);
            if (maxEsistente === 13) {
                combinazione.assoAlto = true;
                console.log('Scala diventa assoAlto perche Asso aggiunto dopo K');
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
    } else if (combinazione.tipo === TIPO_TRIS) {
        // Per i tris, imposta jollycomeNumero se è una matta
        if ((carta.isJolly || carta.isPinella) && !risultato.sostituzione) {
            carta.jollycomeNumero = combinazione.numero;
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

// Finestre info giocatore (popup browser separati)
let giocatoreWindows = {}; // { indice: window }

function mostraPannelloGiocatore(indiceGiocatore, ruolo) {
    const giocatore = game.giocatori[indiceGiocatore];
    if (!giocatore || !giocatore.personaggio) return;

    // Se la finestra esiste ed è aperta, la portiamo in primo piano
    if (giocatoreWindows[indiceGiocatore] && !giocatoreWindows[indiceGiocatore].closed) {
        giocatoreWindows[indiceGiocatore].focus();
        return;
    }

    // Apri nuova finestra browser (più ampia per debug, due colonne)
    const win = window.open('', `BurracoGiocatore_${indiceGiocatore}`,
        'width=820,height=700,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!win) {
        console.error('Impossibile aprire la finestra (popup bloccato?)');
        alert('Popup bloccato! Abilita i popup per questo sito.');
        return;
    }

    giocatoreWindows[indiceGiocatore] = win;

    // Scrivi il contenuto HTML
    win.document.write(getGiocatoreHTML(indiceGiocatore, ruolo));
    win.document.close();
}

// Aggiorna il contenuto di una finestra giocatore già aperta
function aggiornaFinestraGiocatore(indiceGiocatore) {
    const win = giocatoreWindows[indiceGiocatore];
    if (!win || win.closed) return;

    const giocatore = game.giocatori[indiceGiocatore];
    const ruolo = `AI Debug - Turno ${game.turno}`;

    // Riscrivi l'intero documento
    win.document.open();
    win.document.write(getGiocatoreHTML(indiceGiocatore, ruolo));
    win.document.close();
}

// ============================================================================
// SISTEMA MESSAGGI DEBUG
// ============================================================================

let messaggioOverlay = null;

function mostraMessaggio(testo, tipo = 'info') {
    // Crea l'overlay se non esiste
    if (!messaggioOverlay) {
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
    }

    messaggioOverlay.textContent = testo;
    messaggioOverlay.style.display = 'block';
    messaggioOverlay.style.background = tipo === 'info' ? '#2196F3' : '#f44336';
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

function getGiocatoreHTML(indiceGiocatore, ruolo) {
    const giocatore = game.giocatori[indiceGiocatore];
    const p = giocatore.personaggio;
    const c = p?.coefficienti || Strategia.defaultCoeff;

    // Labels per i coefficienti (compatti)
    const coeffLabels = {
        pescaScarti: 'Pesca scarti',
        prudenzaScarto: 'Prudenza',
        prefScale: 'Pref. scale',
        sogliaDeposito: 'Deposito',
        prefBurracoPulito: 'Burr. pulito',
        tieneJolly: 'Tiene jolly',
        frettaChiusura: 'Fretta',
        memoria: 'Memoria',
        rischio: 'Rischio',
        adattamento: 'Adattam.'
    };

    // Genera HTML coefficienti (compatto, 2 colonne)
    const coeffKeys = Object.keys(coeffLabels);
    let coeffHTML = '<div class="coeff-grid">';
    for (const key of coeffKeys) {
        const valore = c[key] || 0;
        const perc = valore * 10;
        coeffHTML += `
            <div class="coeff-item">
                <span class="coeff-label">${coeffLabels[key]}</span>
                <div class="coeff-bar"><div class="coeff-fill" style="width:${perc}%"></div></div>
                <span class="coeff-value">${valore}</span>
            </div>`;
    }
    coeffHTML += '</div>';

    // Genera HTML "Combinazioni e attacchi possibili" (singole mosse)
    let comboHTML = '<div class="oss-empty">Nessuna combinazione trovata</div>';
    if (giocatore.osservazioni) {
        const oss = giocatore.osservazioni;
        const items = [];

        // Elenca tutti i tris
        if (oss.possibiliTris?.length > 0) {
            for (const tris of oss.possibiliTris) {
                const desc = Strategia.descrizioneCarte(tris.carte);
                const matta = tris.usaMatta ? ' *' : '';
                items.push(`<div class="combo-item tris" title="Tris${matta}"><span class="combo-tipo">T</span><span class="combo-desc">${desc}</span><span class="combo-punti">${tris.punti}pt</span></div>`);
            }
        }

        // Elenca tutte le scale
        if (oss.possibiliScale?.length > 0) {
            for (const scala of oss.possibiliScale) {
                const desc = Strategia.descrizioneCarte(scala.carte);
                const matta = scala.usaMatta ? ' *' : '';
                items.push(`<div class="combo-item scala" title="Scala ${scala.seme}${matta}"><span class="combo-tipo">S</span><span class="combo-desc">${desc}</span><span class="combo-punti">${scala.punti}pt</span></div>`);
            }
        }

        // Elenca tutte le calate
        if (oss.possibiliCalate?.length > 0) {
            for (const calata of oss.possibiliCalate) {
                const desc = Strategia.nomeCarta(calata.carta);
                items.push(`<div class="combo-item calata" title="Calata su combo"><span class="combo-tipo">C</span><span class="combo-desc">${desc}</span><span class="combo-punti">${calata.carta.punti}pt</span></div>`);
            }
        }

        if (items.length > 0) {
            // Info riassuntiva
            const numMorte = oss.carteMorte?.length || 0;
            const numMatte = oss.matte?.length || 0;
            const matteDesc = oss.matte?.length > 0 ? Strategia.descrizioneCarte(oss.matte) : '';
            comboHTML = `
                <div class="combo-info">
                    <span>Matte: ${numMatte > 0 ? matteDesc : 'nessuna'}</span>
                    <span>Morte: ${numMorte}</span>
                </div>
                <div class="combo-list">${items.join('')}</div>
                <div class="combo-legenda">T=Tris S=Scala C=Calata *=usa matta</div>`;
        }
    }

    // Genera HTML "Opzioni di gioco" (solo combinazioni di più mosse)
    let objHTML = '<div class="oss-empty">Nessuna combinazione multipla</div>';
    if (giocatore.osservazioni?.opzioniGioco?.length > 0) {
        // Filtra solo le combinazioni (più di una mossa)
        const combinazioni = giocatore.osservazioni.opzioniGioco.filter(opt =>
            opt.isCombinazione
        );

        if (combinazioni.length > 0) {
            const numTotale = combinazioni.length;
            objHTML = `<div class="combo-info"><span>Combinazioni: ${numTotale}</span></div>` +
                combinazioni.slice(0, 15).map((opt, i) => {
                const descrizione = opt.descCarte || 'Passa';
                const valPerc = Math.round((opt.valutazione || 0) * 100);
                return `
                <div class="obj-item combo" title="${descrizione}">
                    <span class="obj-rank">#${i + 1}</span>
                    <span class="obj-nome">${descrizione}</span>
                    <div class="obj-bar"><div class="obj-fill" style="width:${valPerc}%"></div></div>
                    <span class="obj-pri">${opt.puntiTotali || 0}pt</span>
                </div>`;
            }).join('');
        }
    }

    // Genera HTML log strategico (ultimi 5 pensieri)
    let logHTML = '<div class="oss-empty">Nessun pensiero registrato</div>';
    if (giocatore.osservazioni?.logStrategico?.length > 0) {
        const ultimi = giocatore.osservazioni.logStrategico.slice(-5).reverse();
        logHTML = ultimi.map(l => `
            <div class="log-item">
                <span class="log-turno">T${l.turno}:</span>
                <span class="log-msg">${l.messaggio}</span>
            </div>`).join('');
    }

    // Genera HTML stato attuale
    let statoHTML = '';
    if (!giocatore.isUmano) {
        statoHTML = `
            <div class="strat-item">
                <span class="strat-label">Carte in mano:</span>
                <span class="strat-value">${giocatore.carte.length}</span>
            </div>
            <div class="strat-item">
                <span class="strat-label">Ha pozzetto:</span>
                <span class="strat-value">${giocatore.haPozzetto ? 'Sì' : 'No'}</span>
            </div>`;
    }

    const avatarSrc = p ? `images/avatar/${p.nome}.jpg` : 'images/avatar/default.jpg';
    const nomeDisplay = p?.nome || giocatore.nome || 'Giocatore';
    const descDisplay = p?.descrizione || '';

    return `<!DOCTYPE html>
<html>
<head>
    <title>${ruolo} - ${nomeDisplay}</title>
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
        .container { max-width: 800px; }
        .due-colonne { display: flex; gap: 12px; }
        .colonna { flex: 1; min-width: 0; }
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

        /* Coefficienti griglia compatta */
        .coeff-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 12px;
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
        .log-item { margin: 3px 0; font-size: 10px; line-height: 1.3; }
        .log-turno { color: #888; margin-right: 4px; }
        .log-msg { color: #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="ruolo">${ruolo}</div>
        </div>

        <div class="personaggio">
            <img class="avatar" src="${avatarSrc}" alt="${nomeDisplay}">
            <div class="info-base">
                <div class="nome">${nomeDisplay}</div>
                <div class="desc">${descDisplay}</div>
            </div>
        </div>

        <div class="sezione">
            <div class="sezione-titolo">Coefficienti</div>
            ${coeffHTML}
        </div>

        ${!giocatore.isUmano ? `
        <div class="due-colonne">
            <div class="colonna">
                <div class="sezione">
                    <div class="sezione-titolo">Combinazioni e Attacchi Possibili</div>
                    ${comboHTML}
                </div>
                <div class="sezione">
                    <div class="sezione-titolo">Stato</div>
                    ${statoHTML}
                </div>
                <div class="sezione">
                    <div class="sezione-titolo">Log Pensieri</div>
                    ${logHTML}
                </div>
            </div>
            <div class="colonna">
                <div class="sezione">
                    <div class="sezione-titolo">Opzioni di Gioco (combinazioni)</div>
                    ${objHTML}
                </div>
            </div>
        </div>
        ` : ''}
    </div>
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
registraMossa = function(azione, dettagli = {}) {
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
    // Chiudi finestre info giocatore
    for (const idx in giocatoreWindows) {
        if (giocatoreWindows[idx] && !giocatoreWindows[idx].closed) {
            giocatoreWindows[idx].close();
        }
    }
});

// ============================================================================
// AVVIO
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

document.addEventListener('DOMContentLoaded', init);
