// ============================================================================
// BURRACO - Gioco di carte italiano
// FILE: burraco-game.js
// Logica di gioco, AI, combinazioni, punteggio
// Richiede: burraco-core.js
// ============================================================================

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

// Helper per ritardo (usato da AI)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// ============================================================================
// SNAPSHOT E STORIA
// ============================================================================

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
    game.giocatori.forEach((g) => {
        if (!g.isUmano && g.personaggio) {
            const coeff = g.coefficienti;
            console.log(`${g.nome}: ${g.descrizione}`);
            console.log(`  Coefficienti: fretta=${coeff.frettaChiusura}, rischio=${coeff.rischio}, memoria=${coeff.memoria}`);
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
    if (carta.isPinella && combinazione.tipo === TIPO_SCALA) {
        const carteNormali = combinazione.carte.filter(c => !isCartaMatta(c));
        if (carteNormali.length > 0) {
            const semeScala = carteNormali[0].seme;

            // Se la pinella ha stesso seme della scala
            if (carta.seme === semeScala) {
                // Trova min e max della scala
                const numeri = combinazione.carte.map(c => {
                    if (isCartaMatta(c)) return c.jollycomeNumero;
                    return c.numero;
                });
                const min = Math.min(...numeri);

                // Se min == 3, la pinella puo' essere aggiunta come carta naturale (posizione 2)
                if (min === 3) {
                    return true;  // Carta naturale, non matta
                }

                // Se c'e' una matta in posizione 2, puo' sostituirla
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

// Deposita una combinazione (tris o scala) per un giocatore AI
async function depositaCombinazioneAI(giocatore, mossa) {
    const carte = mossa.carte;
    if (!carte || carte.length < 3) return;

    // Verifica combinazione
    const risultato = verificaCombinazione(carte);
    if (!risultato.valida) {
        console.log('AI: combinazione non valida', risultato.motivo);
        return;
    }

    // Ordina le carte e imposta jollycomeNumero per le matte
    let carteOrdinate = [...carte];
    if (risultato.tipo === TIPO_SCALA) {
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

    // Crea combinazione
    const combinazioni = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
    const comb = new Combinazione(combinazioni.length, risultato.tipo, carteOrdinate);
    comb.seme = risultato.seme;
    comb.numero = risultato.numero;
    comb.assoAlto = risultato.assoAlto || false;

    // Rimuovi carte dalla mano
    for (const carta of carte) {
        const idx = giocatore.carte.indexOf(carta);
        if (idx > -1) giocatore.carte.splice(idx, 1);
        carta.selezionata = false;
        carta.inCombinazione = true;
        carta.idCombinazione = comb.id;
        carta.faceUp = true;  // Le combinazioni sono sempre visibili
    }

    combinazioni.push(comb);

    // Registra nella storia
    registraMossa(AZIONE_COMBINAZIONE, {
        carte: comb.carte.map(c => c.id),
        combinazione: comb.id,
        tipo: comb.tipo
    });

    // Suono e render
    if (comb.isBurraco) {
        playSound('burraco');
    } else {
        playSound('combinazione');
    }

    calcolaPunteggi();
    render();

    console.log(`AI ${giocatore.nome}: depositato ${risultato.tipo === TIPO_TRIS ? 'tris' : 'scala'} di ${carte.length} carte`);
}

// Esegue una calata (aggiunta carta a combinazione esistente) per AI
async function eseguiCalataAI(giocatore, mossa) {
    const carta = mossa.carta;
    const combo = mossa.combo;
    if (!carta || !combo) return;

    // Verifica che la carta possa essere aggiunta
    const posizione = puoAggiungereACombinazione(carta, combo);
    if (!posizione) {
        console.log('AI: calata non valida');
        return;
    }

    // Rimuovi dalla mano
    const idx = giocatore.carte.indexOf(carta);
    if (idx > -1) giocatore.carte.splice(idx, 1);

    // Aggiungi alla combinazione
    carta.inCombinazione = true;
    carta.idCombinazione = combo.id;
    carta.faceUp = true;  // Le combinazioni sono sempre visibili

    if (combo.tipo === TIPO_SCALA) {
        // Controlla se stiamo aggiungendo un Asso a una scala che termina con K
        if (carta.numero === 1 && !combo.assoAlto) {
            const numeriEsistenti = combo.carte
                .map(c => isCartaMatta(c) ? c.jollycomeNumero : c.numero);
            const maxEsistente = Math.max(...numeriEsistenti);
            if (maxEsistente === 13) {
                combo.assoAlto = true;
                console.log('AI: scala diventa assoAlto perche Asso aggiunto dopo K');
            }
        }
        // Aggiungi in posizione corretta nella scala
        combo.carte.push(carta);
        combo.carte = ordinaScalaConJolly(combo.carte, combo.assoAlto);
    } else if (combo.tipo === TIPO_TRIS) {
        // Per i tris, imposta jollycomeNumero se è una matta
        if (carta.isJolly || carta.isPinella) {
            carta.jollycomeNumero = combo.numero;
        }
        combo.carte.push(carta);
    } else {
        combo.carte.push(carta);
    }

    // Registra nella storia
    registraMossa(AZIONE_ATTACCO, {
        carta: carta.id,
        combinazione: combo.id
    });

    playSound('ordina');
    calcolaPunteggi();
    render();

    console.log(`AI ${giocatore.nome}: calata ${Strategia.nomeCarta(carta)} su combinazione ${combo.id}`);
}

function prossimoTurno() {
    game.giocatoreCorrente = (game.giocatoreCorrente + 1) % game.giocatori.length;
    game.turno++;

    aggiornaIndicatoreTurno();

    if (!game.giocatori[game.giocatoreCorrente].isUmano) {
        setTimeout(turnoAI, 1000);
    }
}

async function turnoAI() {
    const giocatore = game.giocatori[game.giocatoreCorrente];
    const selettoreCarte = getSelettoreCarteGiocatore(giocatore);
    const isLaterale = giocatore.posizione === 'left' || giocatore.posizione === 'right';

    // ========== ANALISI STRATEGICA ==========
    // Analizza la mano e genera opzioni di gioco
    Strategia.analizzaMano(giocatore);

    // ========== DEBUG AI ==========
    // Se debugAI attivo, mostra finestra giocatore e aspetta input
    if (game.debugAI) {
        // Apri la finestra info del giocatore
        mostraPannelloGiocatore(game.giocatoreCorrente, `AI Debug - Turno ${game.turno}`);

        // Aggiorna la finestra con i nuovi dati
        aggiornaFinestraGiocatore(game.giocatoreCorrente);

        // Aspetta che l'utente prema un tasto per continuare
        game.debugAIContinua = false;
        mostraMessaggio(`Debug AI: ${giocatore.nome} - Premi SPAZIO per continuare`, 'info');

        while (!game.debugAIContinua) {
            await delay(100);
        }

        nascondiMessaggio();
    }

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

    // Rianalizza la mano dopo aver pescato
    Strategia.analizzaMano(giocatore);
    ordinaCarte(giocatore.carte);

    // Esegui la mossa migliore (la prima opzione dopo l'ordinamento per valutazione)
    const opzioni = giocatore.osservazioni?.opzioniGioco || [];
    // Cerca la prima opzione con mosse (salta "passa")
    const mossaMigliore = opzioni.find(opt => opt.mosse && opt.mosse.length > 0);

    if (mossaMigliore) {
        console.log(`AI ${giocatore.nome}: eseguo ${mossaMigliore.descCarte} (val: ${mossaMigliore.valutazione?.toFixed(2)})`);

        // Esegui tutte le mosse dell'opzione
        for (const mossa of mossaMigliore.mosse) {
            await delay(400);

            if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                // Deposita nuova combinazione
                await depositaCombinazioneAI(giocatore, mossa);
            } else if (mossa.tipo === 'calata') {
                // Aggiungi carta a combinazione esistente
                await eseguiCalataAI(giocatore, mossa);
            }
        }

        // Riordina le carte dopo le mosse
        ordinaCarte(giocatore.carte);
    }

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
