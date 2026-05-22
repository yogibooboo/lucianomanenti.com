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
    if (window.audioMuted || game.fastMode) return;
    const audio = game.suoni[nome];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
    }
}

// Helper per ritardo (usato da AI)
function delay(ms) {
    if (game.fastMode) return Promise.resolve();
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
        personaggi: game.giocatori.map(g => g.personaggio ? g.personaggio.id : null),
        nomiGiocatori: game.giocatori.map(g => g.nome),
        fase: game.fase,
        haPescato: game.haPescato,
        turno: game.turno,
        giocatoreCorrente: game.giocatoreCorrente
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

    if (snapshot.turno !== undefined) game.turno = snapshot.turno;
    if (snapshot.giocatoreCorrente !== undefined) game.giocatoreCorrente = snapshot.giocatoreCorrente;

    // Ripristina personaggi dei bot
    game.giocatori.forEach((g, i) => {
        if (g.isUmano) return;
        let pers = null;
        // File nuovi: cerca per ID (campo personaggi)
        if (snapshot.personaggi && snapshot.personaggi[i]) {
            pers = PERSONAGGI.find(p => p.id === snapshot.personaggi[i]);
        }
        // Fallback per file vecchi: cerca per nome (campo nomiGiocatori)
        if (!pers && snapshot.nomiGiocatori && snapshot.nomiGiocatori[i]) {
            pers = PERSONAGGI.find(p => p.nome === snapshot.nomiGiocatori[i]);
        }
        if (pers) {
            g.personaggio = pers;
            g.nome = pers.nome; // g.nome è proprietà normale, va aggiornata esplicitamente
        }
    });

    // Ri-calcola il max delle combinazioni per evitare ID collidenti
    const maxNoi = game.combinazioniNoi.length ? Math.max(...game.combinazioniNoi.map(c => c.id)) : -1;
    const maxLoro = game.combinazioniLoro.length ? Math.max(...game.combinazioniLoro.map(c => c.id)) : -1;
    nextCombinazioneId = Math.max(maxNoi, maxLoro) + 1;
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
    game.undoStack = [];
    game.turno = 0;
    game.ultimoTurno = false;

    // Crea giocatori
    creaGiocatori();

    // Crea mazzo
    creaMazzo();

    // Mischia
    if (game.automaConfig && game.automaConfig.useSeedDb &&
            window.BURRACO_MAZZI_SEEDS && window.seededShuffle) {
        var _idx = game._seedDbIndex || 0;
        var _seed = window.BURRACO_MAZZI_SEEDS[_idx % window.BURRACO_MAZZI_SEEDS.length];
        window.seededShuffle(game.mazzo, _seed);
        game._seedDbIndex = _idx + 1;
    } else {
        shuffle(game.mazzo);
        shuffle(game.mazzo);
    }

    // Distribuisci carte
    distribuisciCarte();

    // Render iniziale
    render();

    // Determina mazziere:
    // 1. Dal torneo se stiamo continuando una mano
    // 2. Da localStorage se è una nuova partita ma non il primissimo sorteggio
    // 3. Casuale solo la prima volta in assoluto
    if (game.torneo && game.torneo.mazziere !== undefined) {
        game.mazziere = game.torneo.mazziere;
    } else {
        var mazzieresSalvato = null;
        try { mazzieresSalvato = localStorage.getItem('burraco_mazziere'); } catch(e) {}
        if (mazzieresSalvato !== null) {
            game.mazziere = parseInt(mazzieresSalvato);
        } else {
            game.mazziere = Math.floor(Math.random() * game.giocatori.length);
        }
        try { localStorage.setItem('burraco_mazziere', game.mazziere); } catch(e) {}
    }

    // Override mazziere per modalità automa
    if (game.autoRun && game.automaConfig && game.automaConfig.mazziere !== 'casuale') {
        var _acfg = game.automaConfig;
        var _nG   = game.giocatori.length;
        var _mazP = Math.min(_acfg.mazzierePosizione || 0, _nG - 1);
        if (_acfg.mazziere === 'fisso') {
            game.mazziere = _mazP;
        } else if (_acfg.mazziere === 'rotazione') {
            game.mazziere = (game._automaLastMazziere === undefined)
                ? _mazP
                : (game._automaLastMazziere + 1) % _nG;
            game._automaLastMazziere = game.mazziere;
        }
    }

    // Il primo giocatore è quello dopo il mazziere in senso orario (indice +1)
    var n = game.giocatori.length;
    game.giocatoreCorrente = (game.mazziere + 1) % n;
    game.fase = 'pesca';
    game.haPescato = false;

    aggiornaIndicatoreTurno();

    // Salva Snapshot Iniziale in memoria (dopo aver impostato fase/turno corretti)
    if (typeof creaSnapshot === 'function') {
        try {
            window.burraco_seed_snapshot = creaSnapshot();
            console.log("Snapshot iniziale salvato. CTRL+ALT+I = stato iniziale, CTRL+ALT+A = stato attuale.");
        } catch (err) {
            console.warn("Impossibile generare il backup iniziale:", err);
        }
    }

    // Snapshot iniziale (permette di annullare anche la prima pesca)
    salvaStato('inizio-partita');

    // Notifica UI per animazione distribuzione e avvio AI se il primo giocatore non è umano
    if (typeof window.burracoOnInizio === 'function') {
        window.burracoOnInizio();
    } else if (!game.giocatori[game.giocatoreCorrente].isUmano) {
        setTimeout(turnoAI, 1000);
    }
}

function creaGiocatori() {
    game.giocatori = [];

    // Seleziona personaggi per i bot (in tuttiAI anche il posto "bottom" è un bot)
    // Array resultante: [left, top, right, bottom?] per 2v2, [left, bottom?] per 1v1
    const numBot = game.modalita === '2v2' ? (game.tuttiAI ? 4 : 3) : (game.tuttiAI ? 2 : 1);
    let personaggiSelezionati;

    const _automaCfg = game.tuttiAI && game.automaConfig && game.automaConfig.modoPersonaggi !== 'casuale'
        ? game.automaConfig : null;

    if (_automaCfg) {
        personaggiSelezionati = _automaPersonaggiDaConfig(_automaCfg);
    } else if (game.torneo && game.torneo.personaggiIndici) {
        personaggiSelezionati = game.torneo.personaggiIndici.map(i => PERSONAGGI[i]);
    } else {
        personaggiSelezionati = selezionaPersonaggiCasuali(numBot);
        if (game.torneo) {
            game.torneo.personaggiIndici = personaggiSelezionati.map(p => PERSONAGGI.indexOf(p));
            try { localStorage.setItem('burraco_torneo', JSON.stringify(game.torneo)); } catch (e) { }
        }
    }

    if (game.modalita === '2v2') {
        // 2 vs 2
        // Posizione bottom: umano in gioco normale, bot in modalità automa
        if (game.tuttiAI) {
            game.giocatori.push(new Giocatore(null, 'bottom', false, personaggiSelezionati[3]));
        } else {
            game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        }
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
        if (game.tuttiAI) {
            game.giocatori.push(new Giocatore(null, 'bottom', false, personaggiSelezionati[1]));
        } else {
            game.giocatori.push(new Giocatore('Tu', 'bottom', true));
        }
        game.giocatori[0].squadra = 0;

        // Avversario (personaggio casuale)
        game.giocatori.push(new Giocatore(null, 'left', false, personaggiSelezionati[0]));
        game.giocatori[1].squadra = 1;
    }

    // Salva personaggi selezionati nel game per riferimento
    game.personaggiInGioco = personaggiSelezionati;

    // Assegna motore AI ai giocatori non umani
    game.giocatori.forEach(function(g) {
        if (!g.isUmano) g.engine = _getEngineById(
            (game.autoRun && game.automaConfig)
                ? (g.squadra === 0 ? (game.automaConfig.engineNoi  || 'A')
                                   : (game.automaConfig.engineLoro || 'A'))
                : 'A'
        );
    });

    // Log per debug
    game.giocatori.forEach((g) => {
        if (!g.isUmano && g.personaggio) {
            const coeff = g.coefficienti;
            console.log(`${g.nome}: ${g.descrizione}`);
            console.log(`  Coefficienti: fretta=${coeff.frettaChiusura}, attacco=${coeff.propensioAttacco}, memoria=${coeff.memoria}`);
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

    // Separa jolly veri dalle pinelle e dalle altre carte
    const jollyVeri = carte.filter(c => c.isJolly);
    const pinelle = carte.filter(c => c.isPinella);
    const altreNormali = carte.filter(c => !c.isJolly && !c.isPinella);

    // Determina il seme della scala dalle carte non-jolly
    let seme;
    if (altreNormali.length > 0) {
        seme = altreNormali[0].seme;
        if (!altreNormali.every(c => c.seme === seme)) {
            return { valida: false, motivo: 'Semi diversi in scala' };
        }
    } else if (pinelle.length > 0) {
        seme = pinelle[0].seme;
    } else {
        return { valida: false, motivo: 'Servono carte normali' };
    }

    // Per le pinelle dello stesso seme, proviamo due opzioni:
    // A) pinella come carta naturale (posizione 2)
    // B) pinella come matta
    const pinelleStesoSeme = pinelle.filter(c => c.seme === seme);
    const pinelleAltroSeme = pinelle.filter(c => c.seme !== seme);

    const opzioni = [];
    if (pinelleStesoSeme.length > 0) {
        // Opzione A: pinella come naturale
        opzioni.push({
            normali: [...altreNormali, ...pinelleStesoSeme],
            jolly: [...jollyVeri, ...pinelleAltroSeme]
        });
        // Opzione B: pinella come matta
        opzioni.push({
            normali: [...altreNormali],
            jolly: [...jollyVeri, ...pinelleStesoSeme, ...pinelleAltroSeme]
        });
    } else {
        opzioni.push({
            normali: [...altreNormali],
            jolly: [...jollyVeri, ...pinelleAltroSeme]
        });
    }

    for (const opz of opzioni) {
        const ris = _verificaScalaOpzione(opz.normali, opz.jolly, carte, seme);
        if (ris.valida) return ris;
    }

    return { valida: false, motivo: 'Sequenza non valida' };
}

// Helper: verifica una scala con una specifica assegnazione di normali/jolly
function _verificaScalaOpzione(normali, jolly, carteOriginali, seme) {
    if (normali.length === 0) {
        return { valida: false, motivo: 'Servono carte normali' };
    }
    if (jolly.length > 1) {
        return { valida: false, motivo: 'Max 1 jolly o pinella' };
    }

    const numeri = normali.map(c => c.numero).sort((a, b) => a - b);

    // Controlla duplicati
    for (let i = 1; i < numeri.length; i++) {
        if (numeri[i] === numeri[i - 1]) {
            return { valida: false, motivo: 'Numeri duplicati' };
        }
    }

    // Prova scala con Asso basso (A=1)
    if (verificaSequenza(numeri, jolly.length)) {
        const max = Math.max(...numeri);
        if (jolly.length > 0 && max >= 12) {
            let indiceMatta = -1;
            let indiceUltimaNormale = -1;
            for (let i = 0; i < carteOriginali.length; i++) {
                if ((carteOriginali[i].isJolly || carteOriginali[i].isPinella) && indiceMatta === -1) {
                    indiceMatta = i;
                }
                if (!carteOriginali[i].isJolly && !carteOriginali[i].isPinella) {
                    indiceUltimaNormale = i;
                }
            }
            if (indiceMatta > indiceUltimaNormale && max === 13) {
                return { valida: true, tipo: TIPO_SCALA, seme: seme, assoAlto: true };
            }
        }
        return { valida: true, tipo: TIPO_SCALA, seme: seme };
    }

    // Prova scala con Asso alto (A=14)
    if (numeri.includes(1)) {
        const numeriAssoAlto = numeri.map(n => n === 1 ? 14 : n).sort((a, b) => a - b);
        const haCarteBasse = numeriAssoAlto.some(n => n === 2);
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
function ordinaScalaConJolly(carte, assoAlto = false) {
    // Separa jolly veri dalle pinelle e dalle altre carte
    const jollyVeri = carte.filter(c => c.isJolly);
    const pinelle = carte.filter(c => c.isPinella);
    const altreNormali = carte.filter(c => !c.isJolly && !c.isPinella);

    // Determina il seme della scala
    let semeScala;
    if (altreNormali.length > 0) {
        semeScala = altreNormali[0].seme;
    } else if (pinelle.length > 0) {
        semeScala = pinelle[0].seme;
    } else {
        return carte; // Solo jolly, non dovrebbe succedere
    }

    // Determina se le pinelle dello stesso seme vanno come naturali o come matte
    // provando entrambe le opzioni
    const pinelleStesoSeme = pinelle.filter(c => c.seme === semeScala);
    const pinelleAltroSeme = pinelle.filter(c => c.seme !== semeScala);

    let normali, jolly;
    if (pinelleStesoSeme.length > 0) {
        // Prova come naturale: verifica se la sequenza e' valida
        const normaliTest = [...altreNormali, ...pinelleStesoSeme];
        const jollyTest = [...jollyVeri, ...pinelleAltroSeme];
        const numeriTest = normaliTest.map(c => {
            let num = c.numero;
            if (assoAlto && num === 1) num = 14;
            return num;
        }).sort((a, b) => a - b);

        if (jollyTest.length <= 1 && verificaSequenza(numeriTest, jollyTest.length)) {
            // Pinella come naturale funziona
            normali = normaliTest;
            jolly = jollyTest;
        } else {
            // Pinella come matta
            normali = [...altreNormali];
            jolly = [...jollyVeri, ...pinelleStesoSeme, ...pinelleAltroSeme];
        }
    } else {
        normali = [...altreNormali];
        jolly = [...jollyVeri, ...pinelleAltroSeme];
    }

    // Reset jollycomeNumero per pinelle trattate come carte naturali
    for (const c of normali) {
        if (c.isPinella) c.jollycomeNumero = null;
    }

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

    // Se non ci sono jolly/matte, ritorna le carte ordinate
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
        bucheTotali += numeriNormali[i] - numeriNormali[i - 1] - 1;
    }

    // Regola posizionamento matte:
    // - Se c'e' un buco nella sequenza: matta nel buco
    // - Se la scala inizia con Asso (min=1, non assoAlto): matta in alto (alla fine dell'array)
    // - Altrimenti: matta in basso (all'inizio dell'array, prima del min)
    let mattaAllaFine = false; // default: matta in basso (all'inizio)
    if (bucheTotali > 0) {
        // C'e' un buco nella sequenza: matta nel buco
        mattaAllaFine = null; // segnala di usare i buchi
    } else if (min === 1 && !assoAlto) {
        // Scala che inizia con Asso: matta in alto (alla fine)
        mattaAllaFine = true;
    }
    // Altrimenti mattaAllaFine rimane false (matta in basso)

    console.log('ordinaScalaConJolly: mattaAllaFine=' + mattaAllaFine + ', min=' + min + ', max=' + max);

    // Assegna i numeri ai jolly
    let jollyIdx = 0;

    if (mattaAllaFine === null) {
        // Metti i jolly nei buchi
        for (let i = 1; i < numeriNormali.length && jollyIdx < jolly.length; i++) {
            const gap = numeriNormali[i] - numeriNormali[i - 1] - 1;
            for (let j = 0; j < gap && jollyIdx < jolly.length; j++) {
                let numJolly = numeriNormali[i - 1] + j + 1;
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

// Ordina un tris mettendo le matte (jolly/pinella) in basso (alla fine dell'array)
function ordinaTrisConJolly(carte, numeroTris) {
    const normali = carte.filter(c => !c.isJolly && !c.isPinella);
    const matte = carte.filter(c => c.isJolly || c.isPinella);

    // Imposta jollycomeNumero sulle matte
    for (const c of matte) {
        c.jollycomeNumero = numeroTris;
    }

    // Matte alla fine (in basso visivamente sullo schermo)
    return [...normali, ...matte];
}

// Verifica se i numeri formano una sequenza continua con i jolly disponibili
function verificaSequenza(numeri, jollyDisponibili) {
    for (let i = 1; i < numeri.length; i++) {
        const gap = numeri[i] - numeri[i - 1] - 1;
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
    // Approccio semplice: prendi le carte esistenti + la nuova e verifica se formano una combinazione valida
    const carteTest = [...combinazione.carte, carta];
    const risultato = verificaCombinazione(carteTest);

    if (risultato.valida) {
        // Verifica se c'e' una sostituzione di matta
        // (la nuova carta prende il posto di una matta esistente)
        const matta = combinazione.carte.find(c => isCartaMatta(c));
        if (matta && matta.jollycomeNumero === carta.numero) {
            return { sostituzione: true, matta: matta };
        }
        // Caso speciale: pinella naturale sostituita da un 2 reale
        if (carta.numero === 2 && combinazione.tipo === TIPO_SCALA) {
            const pinellaNaturale = combinazione.carte.find(c =>
                c.isPinella && c.jollycomeNumero === null
            );
            if (pinellaNaturale) {
                return { sostituzione: true, matta: pinellaNaturale };
            }
        }
        return true;
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

    // Se resterebbe 0 o 1 carta, serve un burraco per chiudere
    const carteRimanenti = giocatore.carte.length - carte.length;
    if (carteRimanenti <= 1 && game.pozzetti[giocatore.squadra].length === 0) {
        const combinazioniSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
        const haBurraco = combinazioniSquadra.some(c => c.isBurraco);
        const diventeraBurraco = carte.length >= 7;
        if (!haBurraco && !diventeraBurraco) {
            console.log(`AI ${giocatore.nome}: blocco deposito, resterebbe ${carteRimanenti} carte senza burraco`);
            return;
        }
    }

    // Ordina le carte e imposta jollycomeNumero per le matte
    let carteOrdinate = [...carte];
    if (risultato.tipo === TIPO_SCALA) {
        carteOrdinate = ordinaScalaConJolly(carteOrdinate, risultato.assoAlto);
    } else if (risultato.tipo === TIPO_TRIS) {
        // Per i tris, ordina con matte alla fine (in basso visivamente)
        carteOrdinate = ordinaTrisConJolly(carteOrdinate, risultato.numero);
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
        
        // Assicurati che anche la carta "reale" nello stato globale sia faceUp
        // (nel caso 'carta' sia un clone usato durante l'analisi)
        const realCard = tutteLeCarte[carta.id];
        if (realCard) realCard.faceUp = true;
    }

    combinazioni.push(comb);

    // Rimuovi carte depositate da carteConosciute
    if (giocatore.carteConosciute) {
        const idDepositate = new Set(carte.map(c => c.id));
        giocatore.carteConosciute = giocatore.carteConosciute.filter(
            cc => !idDepositate.has(cc.cartaId)
        );
    }

    // Registra nella storia
    registraMossa(AZIONE_COMBINAZIONE, {
        carte: comb.carte.map(c => c.id),
        combinazione: comb.id,
        tipo: comb.tipo
    });

    // Suono e render
    if (comb.isBurraco) {
        playSound('tada');
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

    // Se resterebbe 0 o 1 carta, serve un burraco per chiudere
    if (giocatore.carte.length <= 2 && game.pozzetti[giocatore.squadra].length === 0) {
        const combinazioniSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
        const haBurraco = combinazioniSquadra.some(c => c.isBurraco);
        const diventeraBurraco = combo.carte.length + 1 >= 7;
        if (!haBurraco && !diventeraBurraco) {
            console.log(`AI ${giocatore.nome}: blocco calata, resterebbe ${giocatore.carte.length - 1} carte senza burraco`);
            return;
        }
    }

    // Rimuovi dalla mano
    const idx = giocatore.carte.indexOf(carta);
    if (idx > -1) giocatore.carte.splice(idx, 1);

    // Aggiungi alla combinazione
    carta.inCombinazione = true;
    carta.idCombinazione = combo.id;
    carta.faceUp = true;  // Le combinazioni sono sempre visibili

    // Assicurati che anche la carta "reale" nello stato globale sia faceUp
    // (nel caso 'carta' sia un clone usato durante l'analisi)
    const realCard = tutteLeCarte[carta.id];
    if (realCard) realCard.faceUp = true;

    if (combo.tipo === TIPO_SCALA) {
        // Aggiungi e riverifica la scala per ottenere assoAlto aggiornato (come fa il codice umano)
        combo.carte.push(carta);
        const riVer = verificaScala(combo.carte);
        if (riVer.valida) combo.assoAlto = riVer.assoAlto || false;
        combo.carte = ordinaScalaConJolly(combo.carte, combo.assoAlto);
    } else if (combo.tipo === TIPO_TRIS) {
        // Per i tris, aggiungi e riordina con matta alla fine (in basso visivamente)
        combo.carte.push(carta);
        combo.carte = ordinaTrisConJolly(combo.carte, combo.numero);
    } else {
        combo.carte.push(carta);
    }

    // Rimuovi carta da carteConosciute
    if (giocatore.carteConosciute) {
        giocatore.carteConosciute = giocatore.carteConosciute.filter(
            cc => cc.cartaId !== carta.id
        );
    }

    // Registra nella storia
    registraMossa(AZIONE_ATTACCO, {
        carta: carta.id,
        combinazione: combo.id
    });

    // Controlla se la calata ha formato un burraco
    const cartePrima = combo.carte.length - 1; // -1 perche' la carta e' gia' stata aggiunta
    if (combo.isBurraco && cartePrima < 7) {
        playSound('tada');
    } else {
        playSound('ordina');
    }
    calcolaPunteggi();
    render();

    console.log(`AI ${giocatore.nome}: calata ${Strategia.nomeCarta(carta)} su combinazione ${combo.id}`);
}

function controlloMazzoEsaurito() {
    // Preavviso: mazzo quasi esaurito (ripetuto ad ogni pesca)
    if (game.mazzo.length <= 8 && !game.ultimoTurno) {
        mostraMessaggio('Mazzo quasi esaurito. La partita termina quando restano 2 carte!', 'info');
        setTimeout(nascondiMessaggio, 4000);
    }
    // Fine partita: mazzo effettivamente esaurito
    if (!game.ultimoTurno && game.mazzo.length <= 2) {
        game.ultimoTurno = true;
    }
}

function prossimoTurno() {
    game.giocatoreCorrente = (game.giocatoreCorrente + 1) % game.giocatori.length;
    game.turno++;
    game.haPescato = false;  // Reset per ogni turno

    aggiornaIndicatoreTurno();

    if (!game.giocatori[game.giocatoreCorrente].isUmano) {
        if (game.fastMode) _fastTick(turnoAI); else setTimeout(turnoAI, 1000);
    } else {
        // Turno dell'umano: salva stato post-AI come punto di ripristino
        salvaStato('inizio-turno');
    }
}

/**
 * Pausa debug AI: mostra info e aspetta SPAZIO per continuare.
 * @param {Giocatore} giocatore - Il giocatore AI corrente
 * @param {string} fase - Descrizione della fase (es. "Inizio turno", "Dopo pesca")
 */
async function pausaDebugAI(giocatore, fase, defaultScenario) {
    if (!game.debugAI) return;

    // Apri/aggiorna la finestra debug con lo scenario di default corretto per questa fase
    mostraPannelloGiocatore(game.giocatoreCorrente, `AI Debug - ${fase}`, defaultScenario || 'scarti');

    // Mostra ultimo pensiero strategico
    const ultimoPensiero = giocatore.osservazioni?.logStrategico?.slice(-3) || [];
    const pensieriTxt = ultimoPensiero.map(p => p.messaggio).join(' | ');

    // Aspetta che l'utente prema SPAZIO per continuare
    game.debugAIContinua = false;
    mostraMessaggio(
        `[${fase}] ${giocatore.nome} | ${pensieriTxt || 'Analisi...'} | SPAZIO per continuare`,
        'info'
    );

    while (!game.debugAIContinua) {
        await delay(100);
    }

    nascondiMessaggio();
}

// Dereferenzia una carta clone (da generaAnalisiParallela) alla carta reale in mano
function derefCard(cloneCard, giocatore) {
    if (!cloneCard) return null;
    const refId = cloneCard._origineRef ? cloneCard._origineRef.id : cloneCard.id;
    return giocatore.carte.find(c => c.id === refId) || null;
}

// Dereferenzia tutte le carte nei mosse da clone → reali
function derefMosse(mosse, giocatore) {
    if (!mosse) return [];
    return mosse.map(m => {
        if (m.tipo === 'tris' || m.tipo === 'scala') {
            return { ...m, carte: (m.carte || []).map(c => derefCard(c, giocatore) || c) };
        } else if (m.tipo === 'calata') {
            return { ...m, carta: derefCard(m.carta, giocatore) || m.carta };
        }
        return m;
    });
}

async function turnoAI() {

    // Automa fermato: stoppa la catena senza terminare la partita
    if (!game.autoRun && game.giocatori.every(g => !g.isUmano)) {
        render();
        return;
    }

    const giocatore = game.giocatori[game.giocatoreCorrente];
    const selettoreCarte = getSelettoreCarteGiocatore(giocatore);
    const isLaterale = giocatore.posizione === 'left' || giocatore.posizione === 'right';

    await delay(500);

    // ===== ANALISI PARALLELA: scenari ['mano','scarti'] — identico a elaboraOpz =====
    // 'mano' = baseline con sole carte in mano (→ pescheremo dal mazzo)
    // 'scarti' = mano + scarti (→ pescheremo dagli scarti)
    const best = giocatore.engine(giocatore, false, false, 'prePesca');

    const pescaScarti = best?.scenario === 'scarti' && game.scarti.length > 0;
    console.log(`AI ${giocatore.nome}: elabora → ${best?.scenario?.toUpperCase() || '?'} → pesca ${pescaScarti ? 'SCARTI' : 'MAZZO'} | score=${best?.score?.toFixed(1) ?? '?'}`);

    // ========== DEBUG PAUSE 1: prima della scelta scarti/mazzo ==========
    await pausaDebugAI(giocatore, `Turno ${game.turno} - Scelta: ${pescaScarti ? 'SCARTI' : 'MAZZO'}`);

    // ===== HELPER LOCALE: esegui le mosse dell'opzione =====
    const eseguiMosseBest = async (mosse) => {
        const mosseReali = derefMosse(mosse, giocatore);
        const calateRimaste = [];

        for (const mossa of mosseReali) {
            await delay(400);
            if (mossa.tipo === 'tris' || mossa.tipo === 'scala') {
                await depositaCombinazioneAI(giocatore, mossa);
            } else if (mossa.tipo === 'calata') {
                if (puoAggiungereACombinazione(mossa.carta, mossa.combo)) {
                    await eseguiCalataAI(giocatore, mossa);
                } else {
                    calateRimaste.push(mossa); // non ancora adiacente, riprova dopo
                }
            }
        }

        // Retry calate che non erano adiacenti al primo giro (es. scala estesa in più passi)
        // Esempio: Jolly→combo[11P,12P,13P] sblocca 9P, che sblocca 8P, che sblocca 7P
        let maxIter = calateRimaste.length;
        while (calateRimaste.length > 0 && maxIter-- > 0) {
            const rimaste = [];
            for (const mossa of calateRimaste) {
                await delay(400);
                if (puoAggiungereACombinazione(mossa.carta, mossa.combo)) {
                    await eseguiCalataAI(giocatore, mossa);
                } else {
                    rimaste.push(mossa);
                }
            }
            if (rimaste.length === calateRimaste.length) break; // nessun progresso
            calateRimaste.length = 0;
            calateRimaste.push(...rimaste);
        }

        ordinaCarte(giocatore.carte);
    };

    // ===== HELPER LOCALE: esegui lo scarto =====
    const eseguiScarto = async (cartaClone) => {
        // Dereferenzia: trova la carta reale in mano
        let cartaDaScartare = derefCard(cartaClone, giocatore);
        // Fallback: usa la vecchia strategia se non trovata o se la carta non è in mano
        if (!cartaDaScartare || giocatore.carte.indexOf(cartaDaScartare) < 0) {
            cartaDaScartare = Strategia.scegliCartaDaScartare(giocatore);
        }
        if (!cartaDaScartare) return;

        // Non scartare l'ultima carta senza burraco
        if (giocatore.carte.length === 1 && game.pozzetti[giocatore.squadra].length === 0) {
            const combinazioniSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
            if (!combinazioniSquadra.some(c => c.isBurraco)) {
                render();
                return false; // segnala che non si è scartato
            }
        }

        const idxScarto = giocatore.carte.indexOf(cartaDaScartare);
        if (idxScarto >= 0) giocatore.carte.splice(idxScarto, 1);
        console.log(`AI ${giocatore.nome}: scarta ${Strategia.nomeCarta(cartaDaScartare)}`);

        if (giocatore.carteConosciute) {
            giocatore.carteConosciute = giocatore.carteConosciute.filter(cc => cc.cartaId !== cartaDaScartare.id);
        }
        registraMossa(AZIONE_SCARTO, { carta: cartaDaScartare.id });
        cartaDaScartare.faceUp = true;
        game.scarti.push(cartaDaScartare);
        render();

        // Animazione scarto
        const container = $(selettoreCarte);
        const ultimaCartaEl = container ? container.lastElementChild : null;
        const partenzaRect = ultimaCartaEl ? ultimaCartaEl.getBoundingClientRect() : null;
        if (partenzaRect) {
            const scartiContainer = $('#scarti-container');
            const cards = scartiContainer.querySelectorAll('.scarto');
            const cartaElFinale = cards[cards.length - 1];
            if (cartaElFinale) {
                cartaElFinale.style.visibility = 'hidden';
                const fakePartenza = document.createElement('div');
                fakePartenza.style.cssText = `position:fixed;left:${partenzaRect.left}px;top:${partenzaRect.top}px;width:1px;height:1px`;
                document.body.appendChild(fakePartenza);
                playSound('scarta');
                await animaCarta(cartaDaScartare, fakePartenza, cartaElFinale, {
                    mostraFronte: true,
                    rotazioneIniziale: isLaterale ? 90 : 0,
                    rotazioneFinale: 0
                });
                fakePartenza.remove();
                cartaElFinale.style.visibility = 'visible';
            }
        }
        return true; // scartato
    };

    // ===== HELPER LOCALE: pesca pozzetto =====
    const pescaPozzetto = () => {
        const pozzIdx = giocatore.squadra;
        if (game.pozzetti[pozzIdx].length === 0) return false;
        for (const c of game.pozzetti[pozzIdx]) {
            c.faceUp = game.mostraTutteCarteScoperte || giocatore.isUmano;
            giocatore.carte.push(c);
        }
        game.pozzetti[pozzIdx] = [];
        giocatore.haPozzetto = true;
        game.giocatori.forEach(g => { if (g.squadra === giocatore.squadra) g.haPozzetto = true; });
        playSound('magic');
        render();
        return true;
    };

    // ===== FASE 1: PESCA =====
    let bestUsato = best; // aggiornato nel ramo mazzo dopo re-analisi
    if (pescaScarti) {
        // Pesca tutti gli scarti
        const cartePescate = [...game.scarti];
        game.scarti = [];
        for (const carta of cartePescate) {
            carta.faceUp = game.mostraTutteCarteScoperte || giocatore.isUmano;
            giocatore.carte.push(carta);
        }
        if (giocatore.carteConosciute) {
            for (const carta of cartePescate) {
                giocatore.carteConosciute.push({ cartaId: carta.id, turnoScoperta: game.turno });
            }
        }
        registraMossa(AZIONE_PESCA_SCARTI, { carte: cartePescate.map(c => c.id) });
        render();
        playSound('dindon');
        console.log(`AI ${giocatore.nome}: pescate ${cartePescate.length} carte dagli scarti`);

        // ========== DEBUG PAUSE 2 (scarti): prima dell'esecuzione ==========
        await pausaDebugAI(giocatore, `Turno ${game.turno} - Esecuzione scarti`, 'scarti');

        // Esegui mosse già decise
        await eseguiMosseBest(best?.opz?.mosse || []);

    } else {
        // Pesca dal mazzo
        const carta = game.mazzo.pop();
        if (carta) {
            carta.faceUp = game.mostraTutteCarteScoperte || giocatore.isUmano;
            giocatore.carte.push(carta);
            registraMossa(AZIONE_PESCA_MAZZO, { carta: carta.id });
            render();

            const container = $(selettoreCarte);
            const ultimaCarta = container ? container.lastElementChild : null;
            if (ultimaCarta) {
                ultimaCarta.style.visibility = 'hidden';
                playSound('pesca');
                await animaCartaDa(carta, '#mazzo', ultimaCarta, {
                    mostraFronte: game.mostraTutteCarteScoperte,
                    rotazioneIniziale: 0,
                    rotazioneFinale: isLaterale ? 90 : 0
                });
                ultimaCarta.style.visibility = 'visible';
            }
            controlloMazzoEsaurito();
        }

        // Re-analisi con la nuova carta in mano (identico a elaboraOpz per scenario 'mano')
        const bestMazzo = giocatore.engine(giocatore, true, false, 'postPesca');

        // ========== DEBUG PAUSE 2 (mazzo): prima dell'esecuzione ==========
        await pausaDebugAI(giocatore, `Turno ${game.turno} - Esecuzione mazzo`, 'mano');

        await eseguiMosseBest(bestMazzo?.opz?.mosse || []);
        bestUsato = bestMazzo || best;
    }

    // ===== FASE 2: CONTROLLO 0 CARTE PRIMA DELLO SCARTO (pozzetto senza scarto) =====
    if (giocatore.carte.length === 0 && !giocatore.haPozzetto) {
        if (pescaPozzetto()) {
            const bestPoz = giocatore.engine ? giocatore.engine(giocatore, true, false, 'postPozzetto') : null;

            // ========== DEBUG PAUSE 3: dopo pozzetto, prima dell'analisi ==========
            await pausaDebugAI(giocatore, `Turno ${game.turno} - Dopo pozzetto (senza scarto)`, 'mano');

            await eseguiMosseBest(bestPoz?.opz?.mosse || []);

            await delay(500);
            const scartato = await eseguiScarto(bestPoz?.scarto);
            if (scartato === false) { render(); prossimoTurno(); return; }

            // ===== CONTROLLO 0 CARTE DOPO AVER GIOCATO IL POZZETTO =====
            if (giocatore.carte.length === 0) {
                finePartita(giocatore.squadra === 0);
                return;
            }
        } else {
            finePartita(giocatore.squadra === 0);
            return;
        }
    } else {
        // ===== FASE 3: SCARTO NORMALE =====
        await delay(500);
        const scartato = await eseguiScarto(bestUsato?.scarto);
        if (scartato === false) { render(); prossimoTurno(); return; }

        // ===== FASE 4: CONTROLLO 0 CARTE DOPO LO SCARTO =====
        if (giocatore.carte.length === 0) {
            if (!giocatore.haPozzetto) {
                // Caso standard: pozzetto dopo scarto (nessuna analisi aggiuntiva, turno finisce)
                if (!pescaPozzetto()) {
                    finePartita(giocatore.squadra === 0);
                    return;
                }
            } else {
                // Post-pozzetto con 0 carte: serve burraco per chiudere
                finePartita(giocatore.squadra === 0);
                return;
            }
        }
    }

    render();

    if (game.ultimoTurno) {
        finePartita(null);
        return;
    }

    ordinaCarte(giocatore.carte);
    prossimoTurno();
}

function aggiornaIndicatoreTurno() {
    if (game.fastMode) return;
    // Rimuovi la classe turno-attivo e deve-pescare da tutte le aree
    $$('.area-giocatore').forEach(el => {
        el.classList.remove('turno-attivo');
        el.classList.remove('deve-pescare');
    });

    const giocatore = game.giocatori[game.giocatoreCorrente];
    let area = null;

    switch (giocatore.posizione) {
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
        // Bordo rosso per il giocatore umano se non ha ancora pescato
        if (giocatore.isUmano && !game.haPescato) {
            area.classList.add('deve-pescare');
        }
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

function finePartita(haVintoNoi) {
    game.fase = 'finito';

    // Scopri tutte le carte
    for (const giocatore of game.giocatori) {
        for (const carta of giocatore.carte) {
            carta.faceUp = true;
        }
    }

    // Renderizza per mostrare le carte scoperte
    render();

    // ===== CALCOLO DETTAGLIATO PUNTEGGI =====
    const risultato = { noi: {}, loro: {} };

    for (const chiave of ['noi', 'loro']) {
        const squadra = chiave === 'noi' ? 0 : 1;
        const combinazioni = chiave === 'noi' ? game.combinazioniNoi : game.combinazioniLoro;
        const giocatoriSquadra = game.giocatori.filter(g => g.squadra === squadra);
        const r = risultato[chiave];

        // 1. Punti carte nelle combinazioni
        r.puntiCarte = combinazioni.reduce((sum, c) => sum + c.puntiCarte, 0);

        // 2. Bonus burraco (dettaglio per ogni burraco)
        r.burracos = [];
        for (const c of combinazioni) {
            if (c.isBurraco) {
                const labelCarte = window.t('label-carte') || 'carte';
                const labelScala = window.t('label-scala') || 'scala';
                const labelTris = window.t('label-tris') || 'tris';
                r.burracos.push({
                    desc: `${c.carte.length} ${labelCarte} (${c.tipo === TIPO_SCALA ? labelScala : labelTris})`,
                    tipo: c.tipoBurraco,
                    punti: c.puntiBurraco
                });
            }
        }
        r.puntiBurraco = r.burracos.reduce((sum, b) => sum + b.punti, 0);

        // 3. Bonus chiusura (null = mazzo esaurito, nessuno chiude)
        if (haVintoNoi === null) {
            r.chiusura = false;
        } else {
            r.chiusura = (chiave === 'noi' && haVintoNoi) || (chiave === 'loro' && !haVintoNoi);
        }
        r.puntiChiusura = r.chiusura ? PUNTI_CHIUSURA : 0;

        // 4. Penalita' carte in mano
        r.carteMano = [];
        for (const g of giocatoriSquadra) {
            const punti = g.carte.reduce((sum, c) => sum + c.punti, 0);
            r.carteMano.push({ nome: g.nome, numCarte: g.carte.length, punti: punti });
        }
        r.penalitaMano = r.carteMano.reduce((sum, cm) => sum + cm.punti, 0);

        // 5. Penalita' pozzetto non preso
        const haPozzetto = giocatoriSquadra.some(g => g.haPozzetto);
        r.pozzettoNonPreso = !haPozzetto;
        r.penalitaPozzetto = r.pozzettoNonPreso ? 100 : 0;

        // TOTALE
        r.totale = r.puntiCarte + r.puntiBurraco + r.puntiChiusura
            - r.penalitaMano - r.penalitaPozzetto;
    }

    // Aggiorna punteggi globali della mano
    game.puntiNoi = risultato.noi.totale;
    game.puntiLoro = risultato.loro.totale;

    // Determina vincitore della mano dal punteggio
    const vinceNoi = game.puntiNoi >= game.puntiLoro;

    // ===== AGGIORNA TORNEO =====
    if (game.torneo) {
        game.torneo.totNoi += game.puntiNoi;
        game.torneo.totLoro += game.puntiLoro;
        // Persisti su localStorage
        try { localStorage.setItem('burraco_torneo', JSON.stringify(game.torneo)); } catch (e) { }
    }

    // ===== MOSTRA SCHERMATA RISULTATI =====
    if (!game.fastMode) mostraRisultatoFinale(risultato, vinceNoi);

    // Musica: riflette l'esito della partita (torneo) se conclusa, altrimenti della mano
    const _torneo = game.torneo;
    let _suonaVittoria;
    if (_torneo && (_torneo.totNoi >= _torneo.limite || _torneo.totLoro >= _torneo.limite)) {
        _suonaVittoria = _torneo.totNoi >= _torneo.totLoro;
    } else {
        _suonaVittoria = vinceNoi;
    }
    if (!game.autoRun) playSound(_suonaVittoria ? 'applauso' : 'sconfitta');
    renderPunteggi();

    // Auto-restart per modalità automa
    if (game.autoRun) {
        _automaAccumulaStats(risultato, vinceNoi);
        var _maxPart = (game.automaConfig && game.automaConfig.maxPartite) || 0;
        var _seedLimit = (game.automaConfig && game.automaConfig.useSeedDb && window.BURRACO_MAZZI_SEEDS)
            ? window.BURRACO_MAZZI_SEEDS.length : 0;
        var _effMax = (_maxPart > 0 && _seedLimit > 0) ? Math.min(_maxPart, _seedLimit)
                    : (_maxPart > 0 ? _maxPart : _seedLimit);
        if (_effMax > 0 && window._automaStats.partite >= _effMax) {
            fermaAutoma();
            return;
        }
        var _delay = game.autoRunDelay !== undefined ? game.autoRunDelay : 1500;
        if (game.fastMode) {
            _fastTick(function () { if (game.autoRun) { chiudiModals(); iniziaPartita(); } });
        } else {
            setTimeout(function () { if (game.autoRun) { chiudiModals(); iniziaPartita(); } }, _delay);
        }
    }
}

function mostraRisultatoFinale(risultato, vinceNoi) {
    // Genera tabella per una squadra
    function tabellaSquadra(r, nome) {
        let html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';

        // Punti carte
        html += riga(window.t('punti-carte-campo') || 'Punti carte in campo', r.puntiCarte, '#8f8');

        // Burracos
        for (const b of r.burracos) {
            let etichetta = '';
            if (b.tipo === 'pulito') etichetta = window.t('burraco-pulito') || 'Burraco pulito';
            else if (b.tipo === 'semipulito') etichetta = window.t('burraco-semipulito') || 'Burraco semipulito';
            else etichetta = window.t('burraco-sporco') || 'Burraco sporco';
            
            const colore = b.tipo === 'pulito' ? '#4f4' :
                b.tipo === 'semipulito' ? '#ff0' : '#f80';
            html += riga(`${etichetta} (${b.desc})`, b.punti, colore);
        }
        if (r.burracos.length === 0) {
            html += riga(window.t('nessun-burraco') || 'Nessun burraco', 0, '#888');
        }

        // Chiusura
        if (r.chiusura) {
            html += riga(window.t('bonus-chiusura') || 'Bonus chiusura', r.puntiChiusura, '#4f4');
        }

        // Penalita' mano
        for (const cm of r.carteMano) {
            if (cm.punti > 0) {
                const labelMano = (window.t('carte-in-mano') || 'Carte in mano') + ` ${cm.nome} (${cm.numCarte})`;
                html += riga(labelMano, -cm.punti, '#f44');
            }
        }

        // Penalita' pozzetto
        if (r.pozzettoNonPreso) {
            html += riga(window.t('pozzetto-non-preso-label') || 'Pozzetto non preso', -r.penalitaPozzetto, '#f44');
        }

        // Totale
        html += '<tr style="border-top:2px solid #888;font-weight:bold;font-size:15px">' +
            '<td style="padding:8px 4px 4px;color:#fff">' + nome + '</td>' +
            '<td style="padding:8px 4px 4px;text-align:right;color:' +
            (r.totale >= 0 ? '#4f4' : '#f44') + '">' + r.totale + '</td></tr>';

        html += '</table>';
        return html;
    }

    function riga(label, valore, colore) {
        const segno = valore > 0 ? '+' : '';
        return '<tr>' +
            '<td style="padding:3px 4px;color:#ccc">' + label + '</td>' +
            '<td style="padding:3px 4px;text-align:right;font-family:monospace;color:' +
            colore + '">' + segno + valore + '</td></tr>';
    }

    // ===== Titolo e sottotitolo =====
    const torneo = game.torneo;
    let titoloColore, titolo;
    let torneoConcluso = false;

    if (torneo) {
        const vinceTorneoNoi = (torneo.totNoi >= torneo.limite) && (torneo.totNoi >= torneo.totLoro);
        const vinceTorneoLoro = (torneo.totLoro >= torneo.limite) && (torneo.totLoro > torneo.totNoi);
        torneoConcluso = torneo.totNoi >= torneo.limite || torneo.totLoro >= torneo.limite;
        if (torneoConcluso) {
            titoloColore = vinceTorneoNoi ? '#4f4' : '#f44';
            if (vinceTorneoNoi && !vinceNoi) {
                titolo = (window.currentLang === 'it' ? 'Hai perso la mano ma hai vinto la partita!' : 'You lost the hand but won the match!');
            } else if (!vinceTorneoNoi && vinceNoi) {
                titolo = (window.currentLang === 'it' ? 'Hai vinto la mano ma hai perso la partita!' : 'You won the hand but lost the match!');
            } else {
                titolo = vinceTorneoNoi ? window.t('titolo-vinto-partita') : window.t('titolo-perso-partita');
            }
        } else {
            titoloColore = vinceNoi ? '#4f4' : '#f44';
            titolo = (vinceNoi ? window.t('mano-vinta') : window.t('mano-persa')) + ' - ' + (window.currentLang === 'it' ? 'Mano ' : 'Hand ') + torneo.mano;
        }
    } else {
        titoloColore = vinceNoi ? '#4f4' : '#f44';
        titolo = vinceNoi ? window.t('titolo-vinto') : window.t('titolo-perso');
    }

    const sottotitolo = game.ultimoTurno
        ? `<p style="text-align:center;color:#fc8;margin:0 0 8px;font-size:13px">${window.t('msg-mazzo-finito-no-bonus')}</p>`
        : '';

    // ===== Riepilogo torneo: questa mano / totale precedente / totale generale =====
    const rigaTorneo = torneo ? (function () {
        const prevNoi = torneo.totNoi - risultato.noi.totale;
        const prevLoro = torneo.totLoro - risultato.loro.totale;
        function cellVal(v, big) {
            const col = v > 0 ? '#4f4' : v < 0 ? '#f88' : '#aaa';
            const pre = v > 0 ? '+' : '';
            const sz = big ? 'font-size:15px;font-weight:bold' : '';
            return '<td style="text-align:right;font-family:monospace;padding:4px 8px;color:' + col + ';' + sz + '">' + pre + v + '</td>';
        }
        return '<div style="margin:8px 0;background:rgba(0,0,0,0.25);border-radius:6px;padding:6px 8px">' +
            '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
            '<tr><th></th>' +
            '<th style="text-align:right;color:#8cf;padding:4px 8px">' + window.t('label-noi').toUpperCase() + '</th>' +
            '<th style="text-align:right;color:#fc8;padding:4px 8px">' + window.t('label-loro').toUpperCase() + '</th></tr>' +
            '<tr style="border-bottom:1px solid #444"><td style="padding:4px 4px;color:#ccc">' + (window.currentLang === 'it' ? 'Questa mano' : 'This hand') + '</td>' +
            cellVal(risultato.noi.totale, false) + cellVal(risultato.loro.totale, false) + '</tr>' +
            '<tr><td style="padding:4px 4px;color:#999">' + (window.currentLang === 'it' ? 'Totale precedente' : 'Previous total') + '</td>' +
            cellVal(prevNoi, false) + cellVal(prevLoro, false) + '</tr>' +
            '<tr style="border-top:2px solid #666;background:rgba(0,0,0,0.2)">' +
            '<td style="padding:6px 4px;color:#fff;font-weight:bold;font-size:14px">' + window.t('label-totale') + '</td>' +
            cellVal(torneo.totNoi, true) + cellVal(torneo.totLoro, true) + '</tr>' +
            '<tr><td colspan="3" style="text-align:right;color:#888;font-size:11px;padding:2px 4px">' + (window.currentLang === 'it' ? 'Limite: ' : 'Limit: ') + torneo.limite + '</td></tr>' +
            '</table></div>';
    })() : '';

    const html = '<div style="padding:16px 20px">' +
        '<h2 style="text-align:center;color:' + titoloColore + ';margin:0 0 4px;font-size:22px">' + titolo + '</h2>' +
        sottotitolo + rigaTorneo +
        '<div style="display:flex;gap:20px">' +
        '<div style="flex:1">' +
        '<h3 style="color:#8cf;margin:0 0 8px;font-size:14px;text-transform:uppercase">' + window.t('label-noi').toUpperCase() + '</h3>' +
        tabellaSquadra(risultato.noi, window.t('label-totale').toUpperCase() + ' ' + window.t('label-noi').toUpperCase()) +
        '</div>' +
        '<div style="width:1px;background:#555"></div>' +
        '<div style="flex:1">' +
        '<h3 style="color:#fc8;margin:0 0 8px;font-size:14px;text-transform:uppercase">' + window.t('label-loro').toUpperCase() + '</h3>' +
        tabellaSquadra(risultato.loro, window.t('label-totale').toUpperCase() + ' ' + window.t('label-loro').toUpperCase()) +
        '</div>' +
        '</div>' +
        '</div>';

    // ===== Bottoni =====
    let bottoni;
    if (torneo && !torneoConcluso) {
        // Torneo in corso: pulsante "PROSSIMA MANO" + abbandona
        bottoni = '<div style="display:flex;gap:10px;justify-content:center;margin:12px auto">' +
            '<button class="btn-modal btn-trasparenza" title="...">' + window.t('btn-vedi-carte') + '</button>' +
            '<button class="btn-modal btn-abbandona-torneo">' + window.t('btn-abbandona') + '</button>' +
            '<button class="btn-modal btn-prossima-mano">' + window.t('btn-prossima-mano') + '</button>' +
            '</div>';
    } else {
        bottoni = '<div style="display:flex;gap:10px;justify-content:center;margin:12px auto">' +
            '<button class="btn-modal btn-trasparenza" title="...">' + window.t('btn-vedi-carte') + '</button>' +
            '<button class="btn-modal btn-nuova-partita">' + window.t('btn-nuova-partita') + '</button>' +
            '</div>';
    }

    // Usa il modal vittoria/sconfitta esistente
    const modalEl = (torneo && !torneoConcluso)
        ? (vinceNoi ? $('#modal-vittoria') : $('#modal-sconfitta'))
        : (torneo ? (torneo.totNoi >= torneo.limite ? $('#modal-vittoria') : $('#modal-sconfitta'))
            : (vinceNoi ? $('#modal-vittoria') : $('#modal-sconfitta')));

    modalEl.innerHTML = html + bottoni;
    modalEl.style.width = '480px';
    modalEl.style.maxHeight = '600px';

    // Riattacca eventi
    modalEl.querySelector('.btn-trasparenza').addEventListener('click', () => {
        modalEl.classList.toggle('trasparente');
    });

    if (torneo && !torneoConcluso) {
        // Prossima mano: ricarica la pagina mantenendo il torneo
        modalEl.querySelector('.btn-prossima-mano').addEventListener('click', () => {
            if (torneo) {
                torneo.mano++;
                // Ruota mazziere in senso antiorario (indice -1)
                var nG = game.giocatori.length;
                torneo.mazziere = (game.mazziere !== undefined)
                    ? (game.mazziere - 1 + nG) % nG
                    : 0;
                try { localStorage.setItem('burraco_mazziere', torneo.mazziere); } catch(e) {}
            }
            try {
                localStorage.setItem('burraco_torneo', JSON.stringify(torneo));
                localStorage.setItem('burraco_nuova', game.modalita);
            } catch (e) { }
            location.reload();
        });
        // Abbandona torneo
        modalEl.querySelector('.btn-abbandona-torneo').addEventListener('click', () => {
            try { localStorage.removeItem('burraco_torneo'); } catch (e) { }
            var nGA = game.giocatori.length;
            try { localStorage.setItem('burraco_mazziere', (game.mazziere - 1 + nGA) % nGA); } catch (e) { }
            game.torneo = null;
            chiudiModals();
            mostraModal('modal-nuova');
        });
    } else {
        // Fine: nuova partita (azzera torneo)
        modalEl.querySelector('.btn-nuova-partita').addEventListener('click', () => {
            try { localStorage.removeItem('burraco_torneo'); } catch (e) { }
            var nGB = game.giocatori.length;
            try { localStorage.setItem('burraco_mazziere', (game.mazziere - 1 + nGB) % nGB); } catch (e) { }
            game.torneo = null;
            chiudiModals();
            mostraModal('modal-nuova');
        });
    }

    mostraModal(modalEl.id);
}

// ============================================================================
// AUTOMA — partite AI vs AI per test statistico
// ============================================================================

function avviaAutoma(cfg) {
    // Supporto chiamata legacy: avviaAutoma(1500) con solo delay numerico
    if (typeof cfg === 'number') cfg = { delay: cfg };
    cfg = cfg || {};
    game.autoRun = true;
    game.fastMode = !!cfg.fastMode;
    game.autoRunDelay = cfg.fastMode ? 0 : (cfg.delay !== undefined ? cfg.delay : 1500);
    game.automaConfig = cfg;
    game.tuttiAI = true;
    game.torneo = null;
    game.debugAI = false;
    game._automaLastMazziere = undefined;
    game._seedDbIndex = 0;
    window._automaStats = {
        partite: 0, vittorieNoi: 0, vittorieLoro: 0, pareggi: 0,
        punteggiNoi: [], punteggiLoro: [],
        puntiTotNoi: 0, puntiTotLoro: 0,
        burracosNoi:  { puliti: 0, semipuliti: 0, sporchi: 0 },
        burracosLoro: { puliti: 0, semipuliti: 0, sporchi: 0 },
        pozzettiNoi: 0, pozzettiLoro: 0,
        chiusureNoi: 0, chiusureLoro: 0,
        mazzoEsaurito: 0
    };
    try { localStorage.removeItem('burraco_torneo'); } catch (e) { }
    if (cfg.fastMode && !window._origConsoleLog) {
        window._origConsoleLog = console.log;
        console.log = function () {};
    }
    chiudiModals();
    if (typeof window.aggiornaAutomaBanner === 'function') window.aggiornaAutomaBanner();
    iniziaPartita();
}

function fermaAutoma() {
    game.autoRun = false;
    game.tuttiAI = false;
    game.fastMode = false;
    // Ripristina console.log e stampa report finale
    if (window._origConsoleLog) {
        console.log = window._origConsoleLog;
        delete window._origConsoleLog;
    }
    var s = window._automaStats;
    if (s && s.partite > 0) {
        var avgNoi  = Math.round(s.puntiTotNoi  / s.partite);
        var avgLoro = Math.round(s.puntiTotLoro / s.partite);
        console.log('[Automa] Fermato dopo ' + s.partite + ' partite.');
        if (typeof console.table === 'function') {
            console.table({
                Noi:  { Vittorie: s.vittorieNoi,  'Avg punti': avgNoi,  'Burr.puliti': s.burracosNoi.puliti,  'Burr.semi': s.burracosNoi.semipuliti,  'Burr.sporchi': s.burracosNoi.sporchi,  Pozzetti: s.pozzettiNoi,  Chiusure: s.chiusureNoi  },
                Loro: { Vittorie: s.vittorieLoro, 'Avg punti': avgLoro, 'Burr.puliti': s.burracosLoro.puliti, 'Burr.semi': s.burracosLoro.semipuliti, 'Burr.sporchi': s.burracosLoro.sporchi, Pozzetti: s.pozzettiLoro, Chiusure: s.chiusureLoro }
            });
        }
        console.log('[Automa] Pareggi: ' + s.pareggi + ', Mazzo esaurito: ' + s.mazzoEsaurito);
    }
    if (typeof window._aggiornaTurnoFast === 'function') window._aggiornaTurnoFast();
    if (typeof window.aggiornaAutomaBanner === 'function') window.aggiornaAutomaBanner();
    // Hook per lo scan automatico: viene chiamato dal loop scan dopo ogni simulazione
    if (typeof game._scanCallback === 'function') {
        var _cb = game._scanCallback;
        game._scanCallback = null;
        _cb();
    }
}

function _automaAccumulaStats(risultato, vinceNoi) {
    if (!window._automaStats) {
        window._automaStats = {
            partite: 0, vittorieNoi: 0, vittorieLoro: 0, pareggi: 0,
            punteggiNoi: [], punteggiLoro: [],
            puntiTotNoi: 0, puntiTotLoro: 0,
            burracosNoi:  { puliti: 0, semipuliti: 0, sporchi: 0 },
            burracosLoro: { puliti: 0, semipuliti: 0, sporchi: 0 },
            pozzettiNoi: 0, pozzettiLoro: 0,
            chiusureNoi: 0, chiusureLoro: 0,
            mazzoEsaurito: 0
        };
    }
    var s = window._automaStats;
    s.partite++;
    s.punteggiNoi.push(risultato.noi.totale);
    s.punteggiLoro.push(risultato.loro.totale);
    s.puntiTotNoi  += risultato.noi.totale;
    s.puntiTotLoro += risultato.loro.totale;
    if      (risultato.noi.totale  > risultato.loro.totale) s.vittorieNoi++;
    else if (risultato.loro.totale > risultato.noi.totale)  s.vittorieLoro++;
    else                                                     s.pareggi++;

    // Burracos per tipo
    ['noi', 'loro'].forEach(function(team) {
        var r = risultato[team];
        var target = team === 'noi' ? s.burracosNoi : s.burracosLoro;
        (r.burracos || []).forEach(function(b) {
            if      (b.tipo === 'pulito')     target.puliti++;
            else if (b.tipo === 'semipulito') target.semipuliti++;
            else                              target.sporchi++;
        });
        if (!r.pozzettoNonPreso) {
            if (team === 'noi') s.pozzettiNoi++;
            else                s.pozzettiLoro++;
        }
        if (r.chiusura) {
            if (team === 'noi') s.chiusureNoi++;
            else                s.chiusureLoro++;
        }
    });
    if (!risultato.noi.chiusura && !risultato.loro.chiusura) s.mazzoEsaurito++;

    if (typeof window.aggiornaAutomaBanner === 'function') window.aggiornaAutomaBanner();
    if (s.partite % 10 === 0) {
        var avgNoi  = Math.round(s.puntiTotNoi  / s.partite);
        var avgLoro = Math.round(s.puntiTotLoro / s.partite);
        var bn = s.burracosNoi,  bl = s.burracosLoro;
        console.log('[Automa] ' + s.partite + ' part — Noi ' + s.vittorieNoi + 'V/' + s.vittorieLoro + 'V/' + s.pareggi + 'P' +
            ' — avg ' + avgNoi + '/' + avgLoro +
            ' — BurrNoi P:' + bn.puliti + '/S:' + bn.semipuliti + '/X:' + bn.sporchi +
            ' BurrLoro P:' + bl.puliti + '/S:' + bl.semipuliti + '/X:' + bl.sporchi +
            ' — Pozz ' + s.pozzettiNoi + '/' + s.pozzettiLoro +
            ' — MazzoEs:' + s.mazzoEsaurito);
    }
}

window.avviaAutoma = avviaAutoma;
window.fermaAutoma = fermaAutoma;

// Scheduler non throttolato per fast mode: usa MessageChannel invece di setTimeout(fn,0)
// I setTimeout vengono limitati a ~1s dal browser nelle tab in background; MessageChannel no.
var _fastTick = (function () {
    if (typeof MessageChannel === 'undefined') return function (fn) { setTimeout(fn, 0); };
    var _queue = [];
    var _mc = new MessageChannel();
    _mc.port1.onmessage = function () { var fn = _queue.shift(); if (fn) fn(); };
    return function (fn) { _queue.push(fn); _mc.port2.postMessage(null); };
})();

function _getEngineById(id) {
    if (id === 'B' && typeof window.scegliBestOpzioneAI_B === 'function')
        return window.scegliBestOpzioneAI_B;
    return scegliBestOpzioneAI;
}

window._getAvailableEngines = function () {
    var list = [{ id: 'A', nome: 'Motore A (predefinito)' }];
    if (typeof window.scegliBestOpzioneAI_B === 'function')
        list.push({ id: 'B', nome: 'Motore B' });
    return list;
};

// Ritorna [left, top, right, bottom] per 2v2 oppure [left, bottom] per 1v1
// usando i dati della configurazione automa (modoPersonaggi != 'casuale')
function _automaPersonaggiDaConfig(cfg) {
    function findP(id) { return PERSONAGGI.find(function(p){ return p.id === id; }) || PERSONAGGI[0]; }
    if (game.modalita === '2v2') {
        if (cfg.modoPersonaggi === 'perSquadra') {
            var sq0 = findP(cfg.sq0Id), sq1 = findP(cfg.sq1Id);
            return [sq1, sq0, sq1, sq0]; // left(1), top(0), right(1), bottom(0)
        } else { // individuali
            return [findP(cfg.leftId), findP(cfg.topId), findP(cfg.rightId), findP(cfg.bottomId)];
        }
    } else { // 1v1
        if (cfg.modoPersonaggi === 'perSquadra') {
            return [findP(cfg.sq1Id), findP(cfg.sq0Id)]; // left(1), bottom(0)
        } else { // individuali
            return [findP(cfg.leftId), findP(cfg.bottomId)];
        }
    }
}

// ============================================================================
// UNDO
// ============================================================================

// Salva uno snapshot PRIMA di ogni azione del giocatore umano
function salvaStato(azione) {
    if (!game.undoStack) game.undoStack = [];
    game.undoStack.push({
        azione: azione,
        turno: game.turno,
        snapshot: creaSnapshot()
    });
    renderUndoButton();
}

function undo() {
    if (game.fase === 'finito') return;
    // Inibito durante il turno AI
    if (!game.giocatori[game.giocatoreCorrente]?.isUmano) return;
    // Serve almeno 2 elementi: lo stato base + almeno un'azione
    if (!game.undoStack || game.undoStack.length <= 1) return;

    // Se siamo a inizio turno (prima della pesca), il top e' 'inizio-turno'
    // che e' lo stesso stato attuale: saltarlo e tornare allo scarto precedente
    const quanti = (!game.haPescato && game.undoStack.length > 2) ? 2 : 1;
    for (let i = 0; i < quanti - 1; i++) game.undoStack.pop();
    const stato = game.undoStack.pop();
    ripristinaSnapshot(stato.snapshot);

    // Ripristina il turno
    game.turno = stato.turno;
    game.giocatoreCorrente = 0;

    // Ricalcola punteggi
    calcolaPunteggi();

    playSound('ordina');
    render();
    aggiornaIndicatoreTurno();
    renderUndoButton();
    console.log('Undo:', stato.azione, '- stack rimasto:', game.undoStack.length);
}
