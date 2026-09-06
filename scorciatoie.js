/**
 * SCORCIATOIE - Gioco da Tavolo su Foglio a Quadretti A3
 * Allineamento matematico 3x3, frecce sottili a penna, solo incroci a 3 vie (T-junctions puliti)
 * Doppia freccia alle estremità dei rami (colore derivato + colore principale)
 */

(function () {
    'use strict';

    // --- CONFIGURAZIONE E COSTANTI GRIGLIA ---
    const GRID_SIZE = 15; // 1 quadretto = 15px (5mm su A3)
    const CELL_UNITS = 3; // Ogni blocco è 3x3 quadretti
    const CELL_PX = GRID_SIZE * CELL_UNITS; // 45px
    const PAD_X = 15; // Offset bordo sinistro
    const PAD_Y = 15; // Offset bordo superiore
    const BOARD_WIDTH = 1200; // 80 quadretti
    const BOARD_HEIGHT = 705; // 47 quadretti

    // --- LOCALIZZAZIONE / TESTI ---
    const lang = window.currentLang || 'it';
    const isEn = lang === 'en';

    const TXT = {
        defaultPlayer1: isEn ? 'You (P1)' : 'Tu (G1)',
        defaultComputer: isEn ? 'Computer ' : 'Computer ',
        rollDiceBtn: isEn ? '🎲 ROLL DICE' : '🎲 LANCIA I DADI',
        rollDiceBtnHolding: isEn ? '🎲 ROLLING...' : '🎲 AGITA I DADI...',
        computerWaiting: isEn ? 'Computer...' : 'Computer...',
        extraRollDouble: isEn ? 'gets an extra roll thanks to the double!' : 'rigioca grazie al doppio!',
        doubleTag: isEn ? ' (DOUBLE!)' : ' (DOPPIO!)',
        isAtJunction: isEn ? 'is on' : 'è su',
        willFollow: isEn ? 'Will follow:' : 'Seguirà:',
        ownArrow: isEn ? 'own color arrow' : 'freccia del proprio colore',
        crossArrow: isEn ? 'intersecting track arrow' : 'freccia del percorso incrociato',
        mancheScoreReason: isEn ? 'Game Victory (100 pts)' : 'Vittoria Mano (100 pt)',
        lastBlackReason: isEn ? 'Last black cell' : 'Ultima casella nera',
        tournamentChampionTitle: isEn ? '🏆 TOURNAMENT CHAMPION!' : '🏆 VINCITORE DELLA PARTITA!',
        tournamentChampionDetails: isEn ? 'reaches %s pts and wins the tournament!' : 'raggiunge %s pt e vince la partita!',
        tournamentChampionLog: isEn ? 'IS THE TOURNAMENT CHAMPION with %s pts!' : 'HA VINTO LA PARTITA con %s pt!',
        tournamentLossTitle: isEn ? '💀 TOURNAMENT LOST!' : '💀 PARTITA PERSA!',
        tournamentLossDetails: isEn ? 'reaches %s pts and wins the tournament!' : 'raggiunge %s pt e vince la partita!',
        legVictoryTitle: isEn ? '🏆 GAME %m VICTORY!' : '🏆 VITTORIA MANO %m!',
        legVictoryDetails: isEn ? 'crosses the finish line (+100 pts)! Points awarded for last black cells.' : 'taglia il traguardo (+100 pt)! Assegnati i punti delle ultime caselle nere.',
        legLossTitle: isEn ? '❌ GAME %m LOST!' : '❌ MANO %m PERSA!',
        legLossDetails: isEn ? 'crosses the finish line (+100 pts). Points awarded for last black cells.' : 'ha tagliato il traguardo (+100 pt). Assegnati i punti delle ultime caselle nere.',
        nextLegBtn: isEn ? 'NEXT GAME ➔' : 'PROSSIMA MANO ➔',
        legFinishedLog: isEn ? 'Game %m concluded: %w (+100 pts), opponents awarded their last black cells!' : 'Mano %m conclusa: %w (+100 pt), avversari premiati con le loro ultime caselle nere!',
        standingsTitle: isEn ? '📊 Game Points & Standings (Target: %t pts)' : '📊 Punti Mano & Classifica Generale (Obiettivo: %t pt)',
        thPlayer: isEn ? 'Player' : 'Giocatore',
        thLegPoints: isEn ? 'Game Points' : 'Punti Mano',
        thTotal: isEn ? 'Total' : 'Totale',
        thRemaining: isEn ? 'Remaining' : 'Mancanti',
        championBadge: isEn ? '👑 CHAMPION' : '👑 VINCITORE',
        singleWinTitle: isEn ? '🏆 %w WINS!' : '🏆 HA VINTO %w!',
        singleWinDetails: isEn ? 'First to cross the checkered finish line!' : 'Ha tagliato per primo il traguardo a scacchi!',
        singleWinLog: isEn ? '🏆 VICTORY! %w wins the game!' : '🏆 VITTORIA! %w vince la partita!',
        singleLossTitle: isEn ? '💀 DEFEAT!' : '💀 HAI PERSO!',
        singleLossDetails: isEn ? '%w crossed the checkered finish line first!' : '%w ha tagliato per primo il traguardo a scacchi!',
        singleLossLog: isEn ? '💀 %w won the game!' : '💀 %w ha vinto la partita!',
        headerLastBlack: isEn ? '⬛ Last Black:' : '⬛ Ultime Nere:',
        headerMatchPrefix: isEn ? '🏆 G%m:' : '🏆 M%m:',
        newTournamentLog: isEn ? '🏆 %t pts Tournament! Game %m begins. %p\'s turn.' : '🏆 Partita a %t pt! Inizia la Mano %m. Turno di %p.',
        newSingleGameLog: isEn ? '🎮 New game! %p starts.' : '🎮 Nuova partita! Inizia %p.',
        pointsAwarded: isEn ? 'receives +%p pts' : 'riceve +%p pt',
        tournamentPoints: isEn ? 'Tournament points:' : 'Punti partita:',
        backToResultsBtn: isEn ? '🏆 BACK TO RESULTS' : '🏆 TORNA AI RISULTATI'
    };

    // Colori Percorsi
    const TRACK_COLORS = {
        main: { stroke: '#000000', fill: '#000000', light: '#f1f5f9', name: isEn ? 'Main Track' : 'Percorso Principale', desc: isEn ? 'The main path to the finish line' : 'La via maestra per il traguardo' },
        green_short: { stroke: '#15803d', fill: '#22c55e', light: '#dcfce7', name: isEn ? 'Green Shortcut' : 'Scorciatoia Verde', desc: isEn ? 'Cuts off an entire loop!' : 'Taglia un intero anello!' },
        orange_detour: { stroke: '#c2410c', fill: '#f97316', light: '#ffedd5', name: isEn ? 'Orange Detour' : 'Allungatoia Arancione', desc: isEn ? 'Longer scenic loop' : 'Giro panoramico più lungo' },
        red_trap: { stroke: '#b91c1c', fill: '#ef4444', light: '#fee2e2', name: isEn ? 'Red Trap' : 'Trappola a Ritroso', desc: isEn ? 'Reverse shortcut: takes you backwards!' : 'Scorciatoia al contrario: ti riporta indietro!' },
        purple_cross: { stroke: '#7e22ce', fill: '#a855f7', light: '#f3e8ff', name: isEn ? 'Purple Crossing' : 'Raccordo Viola', desc: isEn ? 'Connects two sections of the track' : 'Collega due sezioni della mappa' },
        cyan_turbo: { stroke: '#0e7490', fill: '#06b6d4', light: '#cffafe', name: isEn ? 'Cyan Turbo Shortcut' : 'Scorciatoia Finale Turbo', desc: isEn ? 'Straight to the finish line!' : 'Dritto verso il traguardo!' },
        blue_shortcut: { stroke: '#1d4ed8', fill: '#3b82f6', light: '#dbeafe', name: isEn ? 'Blue Shortcut' : 'Taglio Azzurro', desc: isEn ? 'Cuts directly to the lower track!' : 'Taglia direttamente alla parte inferiore!' },
        lime_express: { stroke: '#65a30d', fill: '#84cc16', light: '#ecfccb', name: isEn ? 'Lime Express Link' : 'Raccordo Verde Lime', desc: isEn ? 'Dash towards the final stretch!' : 'Volata verso il traguardo finale!' },
        pink_express: { stroke: '#be185d', fill: '#ec4899', light: '#fce7f3', name: isEn ? 'Pink Shortcut' : 'Scorciatoia Rosa', desc: isEn ? 'Direct cut towards the bottom track!' : 'Taglio diretto verso la parte bassa!' },
        amber_link: { stroke: '#d97706', fill: '#f59e0b', light: '#fef3c7', name: isEn ? 'Amber Link' : 'Raccordo Ambra', desc: isEn ? 'Connects turn 38 to cell 68' : 'Collega la curva 38 alla casella 68' },
        teal_direct: { stroke: '#0f766e', fill: '#14b8a6', light: '#ccfbf1', name: isEn ? 'Teal Direct Drop' : 'Discesa Turchese', desc: isEn ? 'Long vertical leap from 15 to 52!' : 'Lungo salto verticale da 15 a 52!' },
        coral_bridge: { stroke: '#be123c', fill: '#f43f5e', light: '#ffe4e6', name: isEn ? 'Coral Bridge' : 'Ponte Corallo', desc: isEn ? 'Horizontal link from Teal 2 to Lime 7!' : 'Taglio orizzontale da Turchese 2 a Lime 7!' }
    };

    const PLAYER_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706'];

    // --- GENERATORE TRACCIATI IN COORDINATE A BLOCCHI (bx, by) ---
    // NESSUN INCROCIO A 4 VIE: tutti i rami hanno innesti a T rigorosamente separati
    function generateTracks() {
        const tracks = {};

        function makeBlockLine(bx1, by1, bx2, by2) {
            const pts = [];
            const dx = Math.sign(bx2 - bx1);
            const dy = Math.sign(by2 - by1);
            let cx = bx1;
            let cy = by1;
            pts.push({ bx: cx, by: cy });

            while (cx !== bx2 || cy !== by2) {
                if (cx !== bx2) cx += dx;
                else if (cy !== by2) cy += dy;
                pts.push({ bx: cx, by: cy });
            }
            return pts;
        }

        // 1. TRACCIATO PRINCIPALE (NERO)
        let mainPoints = [];
        mainPoints.push(...makeBlockLine(1, 1, 15, 1));   // 0..14 (destra, by=1)
        mainPoints.push(...makeBlockLine(15, 2, 15, 4));  // 15..17 (giù, bx=15)
        mainPoints.push(...makeBlockLine(14, 4, 2, 4));   // 18..30 (sinistra, by=4)
        mainPoints.push(...makeBlockLine(2, 5, 2, 9));    // 31..35 (giù fino a by=9: 31=(2,5), 32=(2,6), 33=(2,7), 34=(2,8), 35=(2,9))
        mainPoints.push(...makeBlockLine(3, 9, 5, 9));    // 36..38 (destra a by=9: 36=(3,9), 37=(4,9), 38=(5,9))
        mainPoints.push(...makeBlockLine(5, 8, 5, 7));    // 39..40 (su verso by=7: 39=(5,8), 40=(5,7))
        mainPoints.push(...makeBlockLine(6, 7, 18, 7));   // 41..53 (destra a by=7)
        mainPoints.push(...makeBlockLine(18, 8, 18, 11)); // 54..57 (giù a by=11: 54=(18,8), 55=(18,9), 56=(18,10), 57=(18,11))
        mainPoints.push(...makeBlockLine(17, 11, 7, 11)); // 58..68 (sinistra a by=11)
        mainPoints.push(...makeBlockLine(7, 12, 7, 13));  // 69..70 (giù a by=13)
        mainPoints.push(...makeBlockLine(8, 13, 24, 13)); // 71..87 (destra a by=13)
        mainPoints.push(...makeBlockLine(24, 12, 24, 1)); // 88..99 (su verso FINISH)

        tracks['main'] = {
            id: 'main',
            colorKey: 'main',
            points: mainPoints,
            isFinish: true
        };

        // 2. SCORCIATOIA VERDE (GREEN)
        // Stacca da Main[5] (bx=6, by=1) e scende dritta fino a Main[26] (bx=6, by=4)
        let greenPoints = makeBlockLine(6, 2, 6, 3); // 2 blocchi (0, 1)
        tracks['green_short'] = {
            id: 'green_short',
            colorKey: 'green_short',
            points: greenPoints,
            confluence: { targetTrack: 'main', targetStep: 26, targetDir: 1 },
            startConfluence: { targetTrack: 'main', targetStep: 5, targetDir: 1 }
        };

        // 3. RACCORDO VIOLA (PURPLE)
        // Stacca da Main[9] (bx=10, by=1), scende dritta verticale e rientra a Main[45] (bx=10, by=7)
        let purplePoints = makeBlockLine(10, 2, 10, 6); // 5 blocchi: 0..(10,2), 1..(10,3), 2..(10,4), 3..(10,5), 4..(10,6)
        tracks['purple_cross'] = {
            id: 'purple_cross',
            colorKey: 'purple_cross',
            points: purplePoints,
            confluence: { targetTrack: 'main', targetStep: 45, targetDir: 1 }, // bx=10, by=7
            startConfluence: { targetTrack: 'main', targetStep: 9, targetDir: 1 }
        };

        // 4. ALLUNGATOIA ARANCIONE (ORANGE DETOUR)
        // Stacca da Main[28] (bx=4, by=4), scende a by=5, gira a sinistra a by=6 (step 1) fino a bx=0 (bordo foglio), scende a by=9 e rientra a Main[35] (bx=2, by=9)
        let orangePoints = [];
        orangePoints.push(...makeBlockLine(4, 5, 4, 6)); // 0: (4,5), 1: (4,6)
        orangePoints.push(...makeBlockLine(3, 6, 0, 6)); // 2: (3,6), 3: (2,6), 4: (1,6), 5: (0,6) sul bordo
        orangePoints.push(...makeBlockLine(0, 7, 0, 9)); // 6: (0,7), 7: (0,8), 8: (0,9)
        orangePoints.push(...makeBlockLine(1, 9, 1, 9)); // 9: (1,9)
        tracks['orange_detour'] = {
            id: 'orange_detour',
            colorKey: 'orange_detour',
            points: orangePoints,
            confluence: { targetTrack: 'main', targetStep: 35, targetDir: 1 }, // bx=2, by=9
            startConfluence: { targetTrack: 'main', targetStep: 28, targetDir: 1 }
        };

        // 5. COLLEGAMENTO AZZURRO (BLUE SHORTCUT)
        // Stacca da Orange[8] (bx=0, by=9), scende lungo il bordo (bx=0, by=10..12) e va verso destra (bx=1..6, by=12) innestandosi a Main[69] (bx=7, by=12)
        let bluePoints = [];
        bluePoints.push(...makeBlockLine(0, 10, 0, 12)); // 0..(0,10), 1..(0,11), 2..(0,12)
        bluePoints.push(...makeBlockLine(1, 12, 6, 12));  // 3..(1,12) .. 8..(6,12)
        tracks['blue_shortcut'] = {
            id: 'blue_shortcut',
            colorKey: 'blue_shortcut',
            points: bluePoints,
            confluence: { targetTrack: 'main', targetStep: 69, targetDir: 1 },
            startConfluence: { targetTrack: 'orange_detour', targetStep: 8, targetDir: 1 }
        };

        // 6. TRAPPOLA A RITROSO ROSSA (RED TRAP)
        // Stacca da Main[50] (bx=15, by=7). Sale verso l'alto e rientra in Main[17] (bx=15, by=4)
        let redPoints = [];
        redPoints.push(...makeBlockLine(15, 6, 15, 5));
        tracks['red_trap'] = {
            id: 'red_trap',
            colorKey: 'red_trap',
            points: redPoints,
            confluence: { targetTrack: 'main', targetStep: 17, targetDir: 1 },
            startConfluence: { targetTrack: 'main', targetStep: 50, targetDir: 1 }
        };

        // 7. SCORCIATOIA FINALE TURBO (CYAN TURBO)
        // Stacca da Main[65] (bx=10, by=11). Sale a by=10 e by=9, taglia verso destra a by=9 fino a Main[91] (bx=24, by=9)
        let cyanPoints = [];
        cyanPoints.push(...makeBlockLine(10, 10, 10, 9)); // 0: (10,10), 1: (10,9)
        cyanPoints.push(...makeBlockLine(11, 9, 23, 9));  // 2..14 (bx=11..23, by=9)
        tracks['cyan_turbo'] = {
            id: 'cyan_turbo',
            colorKey: 'cyan_turbo',
            points: cyanPoints,
            confluence: { targetTrack: 'main', targetStep: 91, targetDir: 1 }, // bx=24, by=9 (step 91 di Main)
            startConfluence: { targetTrack: 'main', targetStep: 65, targetDir: 1 } // bx=10, by=11 (step 65 di Main)
        };

        // 8. RACCORDO VERDE LIME (LIME EXPRESS)
        // Stacca da Main[53] (bx=18, by=7). Prosegue dritto a destra fino a posizione 3 (bx=22, by=7), sale a (bx=22, by=6..3), curva a destra (bx=23, by=3) e confluisce a Main[97] (bx=24, by=3)
        let limePoints = [];
        limePoints.push(...makeBlockLine(19, 7, 22, 7)); // 0..(19,7), 1..(20,7), 2..(21,7), 3..(22,7)
        limePoints.push(...makeBlockLine(22, 6, 22, 3)); // 4..(22,6), 5..(22,5), 6..(22,4), 7..(22,3)
        limePoints.push(...makeBlockLine(23, 3, 23, 3)); // 8..(23,3)
        tracks['lime_express'] = {
            id: 'lime_express',
            colorKey: 'lime_express',
            points: limePoints,
            confluence: { targetTrack: 'main', targetStep: 97, targetDir: 1 }, // bx=24, by=3
            startConfluence: { targetTrack: 'main', targetStep: 53, targetDir: 1 } // bx=18, by=7
        };

        // 9. SCORCIATOIA ROSA (PINK EXPRESS)
        // Stacca da Main[57] (bx=18, by=11), scende a (bx=18, by=12) e confluisce a Main[81] (bx=18, by=13)
        let pinkPoints = makeBlockLine(18, 12, 18, 12);
        tracks['pink_express'] = {
            id: 'pink_express',
            colorKey: 'pink_express',
            points: pinkPoints,
            confluence: { targetTrack: 'main', targetStep: 81, targetDir: 1 },
            startConfluence: { targetTrack: 'main', targetStep: 57, targetDir: 1 }
        };

        // 10. RACCORDO AMBRA (AMBER LINK)
        // Stacca da Main[38] (bx=5, by=9), scende a (bx=5, by=10), va a destra a (bx=6..7, by=10) e confluisce a Main[68] (bx=7, by=11)
        let amberPoints = [];
        amberPoints.push(...makeBlockLine(5, 10, 5, 10)); // 0: (5,10)
        amberPoints.push(...makeBlockLine(6, 10, 7, 10)); // 1: (6,10), 2: (7,10)
        tracks['amber_link'] = {
            id: 'amber_link',
            colorKey: 'amber_link',
            points: amberPoints,
            confluence: { targetTrack: 'main', targetStep: 68, targetDir: 1 },
            startConfluence: { targetTrack: 'main', targetStep: 38, targetDir: 1 }
        };

        // 11. DISCESA TURCHESE (TEAL DIRECT)
        // Stacca da Main[15] (bx=15, by=2), va a destra a (bx=16..17, by=2), scende dritta in verticale su bx=17 fino a (bx=17, by=6) e confluisce a Main[52] (bx=17, by=7)
        let tealPoints = [];
        tealPoints.push(...makeBlockLine(16, 2, 17, 2)); // 0: (16,2), 1: (17,2)
        tealPoints.push(...makeBlockLine(17, 3, 17, 6)); // 2: (17,3), 3: (17,4), 4: (17,5), 5: (17,6)
        tracks['teal_direct'] = {
            id: 'teal_direct',
            colorKey: 'teal_direct',
            points: tealPoints,
            confluence: { targetTrack: 'main', targetStep: 52, targetDir: 1 },
            startConfluence: { targetTrack: 'main', targetStep: 15, targetDir: 1 }
        };

        // 12. PONTE CORALLO (CORAL BRIDGE)
        // Stacca da Turchese[2] (bx=17, by=3), va dritto orizzontale a destra a (bx=18..21, by=3) e confluisce a Verde Chiaro / Lime[7] (bx=22, by=3)
        let coralPoints = makeBlockLine(18, 3, 21, 3); // 0..(18,3), 1..(19,3), 2..(20,3), 3..(21,3)
        tracks['coral_bridge'] = {
            id: 'coral_bridge',
            colorKey: 'coral_bridge',
            points: coralPoints,
            confluence: { targetTrack: 'lime_express', targetStep: 7, targetDir: 1 },
            startConfluence: { targetTrack: 'teal_direct', targetStep: 2, targetDir: 1 }
        };

        // --- DEFINIZIONE TUTTI GLI INCROCI ATTIVI BIDIREZIONALI ---
        const junctions = [
            // 1. Inizio Scorciatoia Verde (in avanti)
            {
                fromTrack: 'main',
                fromStep: 5,
                toTrack: 'green_short',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'green_short',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                stepDelta: 18,
                label: isEn ? 'Green Shortcut (forward)' : 'Scorciatoia Verde (avanti)'
            },
            // 1b. Rientro Scorciatoia Verde (A RITROSO: se ci atterri da Main, vai su a ritroso!)
            {
                fromTrack: 'main',
                fromStep: 26,
                toTrack: 'green_short',
                toStep: greenPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'up',
                branchColorKey: 'green_short',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -24,
                label: isEn ? 'Green Shortcut reverse (Trap!)' : 'Scorciatoia Verde a ritroso (Trappola!)'
            },
            // 2. Inizio Raccordo Viola (in avanti)
            {
                fromTrack: 'main',
                fromStep: 9,
                toTrack: 'purple_cross',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'purple_cross',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                stepDelta: 30,
                label: isEn ? 'Purple Crossing (forward)' : 'Raccordo Viola (avanti)'
            },
            // 2b. Raccordo Viola (A RITROSO: da Main 45 sali indietro a ritroso!)
            {
                fromTrack: 'main',
                fromStep: 45,
                toTrack: 'purple_cross',
                toStep: purplePoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'up',
                branchColorKey: 'purple_cross',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -42,
                label: isEn ? 'Purple Crossing reverse (Trap!)' : 'Raccordo Viola a ritroso (Trappola!)'
            },
            // 2c. Incrocio a 4 vie (Casella 22: incrocio tra Main e Viola)
            {
                fromTrack: 'main',
                fromStep: 22,
                toTrack: 'purple_cross',
                toStep: 3,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'purple_cross',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                is4Way: true,
                mainNext: { track: 'main', step: 23, dir: 1 },
                branchNext: { track: 'purple_cross', step: 3, dir: 1 },
                stepDelta: 21,
                label: isEn ? '4-Way Crossing (22)' : 'Incrocio a 4 vie (22)'
            },
            // 2d. Incrocio a 4 vie arrivando dal ramo viola (step 2)
            {
                fromTrack: 'purple_cross',
                fromStep: 2,
                toTrack: 'main',
                toStep: 23,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'purple_cross',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                is4Way: true,
                skipDrawing: true, // frecce già disegnate da 2c
                mainNext: { track: 'main', step: 23, dir: 1 },
                branchNext: { track: 'purple_cross', step: 3, dir: 1 },
                stepDelta: -20,
                label: isEn ? '4-Way Crossing (from Purple)' : 'Incrocio a 4 vie (dal Viola)'
            },
            // 3. Inizio Allungatoia Arancione (in avanti)
            {
                fromTrack: 'main',
                fromStep: 28,
                toTrack: 'orange_detour',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'orange_detour',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                stepDelta: -4,
                label: isEn ? 'Orange Detour' : 'Allungatoia Arancione'
            },
            // 3b. Allungatoia Arancione (A RITROSO: da Main 35 entri a sinistra a ritroso!)
            {
                fromTrack: 'main',
                fromStep: 35,
                toTrack: 'orange_detour',
                toStep: orangePoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'left',
                branchColorKey: 'orange_detour',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -18,
                label: isEn ? 'Orange Detour reverse (Trap!)' : 'Allungatoia a ritroso'
            },
            // 3c. Bivio Azzurro da Allungatoia Arancione (casella 8: svolta in giù verso il basso!)
            {
                fromTrack: 'orange_detour',
                fromStep: 8,
                toTrack: 'blue_shortcut',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'blue_shortcut',
                mainArrowDir: 'right',
                mainColorKey: 'orange_detour',
                stepDelta: 26,
                label: isEn ? 'Blue Shortcut (forward to 69)' : 'Scorciatoia Azzurra (avanti verso 69)'
            },
            // 3d. Confluenza Azzurra a ritroso da Main[69] (se atterri su Main 69, puoi risalire l'azzurro verso arancione 8!)
            {
                fromTrack: 'main',
                fromStep: 69,
                toTrack: 'blue_shortcut',
                toStep: bluePoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'left',
                branchColorKey: 'blue_shortcut',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -36,
                label: isEn ? 'Blue Shortcut reverse (Trap towards Orange!)' : 'Scorciatoia Azzurra a ritroso (Trappola verso Arancione!)'
            },
            // 3e. Incrocio a 4 vie (Casella 32: incrocio tra Main e Allungatoia Arancione)
            {
                fromTrack: 'main',
                fromStep: 32,
                toTrack: 'orange_detour',
                toStep: 4,
                stepDir: 1,
                branchArrowDir: 'left',
                branchColorKey: 'orange_detour',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                is4Way: true,
                mainNext: { track: 'main', step: 33, dir: 1 },
                branchNext: { track: 'orange_detour', step: 4, dir: 1 },
                stepDelta: -3,
                label: isEn ? '4-Way Crossing (32)' : 'Incrocio a 4 vie (32)'
            },
            // 3f. Incrocio a 4 vie arrivando dal ramo arancione (step 3)
            {
                fromTrack: 'orange_detour',
                fromStep: 3,
                toTrack: 'main',
                toStep: 33,
                stepDir: 1,
                branchArrowDir: 'left',
                branchColorKey: 'orange_detour',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                is4Way: true,
                skipDrawing: true,
                mainNext: { track: 'main', step: 33, dir: 1 },
                branchNext: { track: 'orange_detour', step: 4, dir: 1 },
                stepDelta: 5,
                label: isEn ? '4-Way Crossing (from Orange)' : 'Incrocio a 4 vie (dall\'Arancione)'
            },
            // 4. Inizio Trappola Rossa (in avanti per riportare indietro a 17)
            {
                fromTrack: 'main',
                fromStep: 50,
                toTrack: 'red_trap',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'up',
                branchColorKey: 'red_trap',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -36,
                label: isEn ? 'Red Trap (return to 17!)' : 'Trappola Rossa (ritorno a 17!)'
            },
            // 4b. Trappola Rossa (A RITROSO da 17: salto in avanti verso 50!)
            {
                fromTrack: 'main',
                fromStep: 17,
                toTrack: 'red_trap',
                toStep: redPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'down',
                branchColorKey: 'red_trap',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                stepDelta: 30,
                label: isEn ? 'Red Shortcut forward (leap to 50!)' : 'Scorciatoia Rossa in avanti (salto a 50!)'
            },
            // 5. Inizio Turbo Ciano (in avanti)
            {
                fromTrack: 'main',
                fromStep: 65,
                toTrack: 'cyan_turbo',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'up',
                branchColorKey: 'cyan_turbo',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                stepDelta: 10,
                label: isEn ? 'Cyan Turbo (forward)' : 'Turbo Ciano (avanti)'
            },
            // 5b. Turbo Ciano (A RITROSO da 91: trappola che riporta a 65!)
            {
                fromTrack: 'main',
                fromStep: 91,
                toTrack: 'cyan_turbo',
                toStep: cyanPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'left',
                branchColorKey: 'cyan_turbo',
                mainArrowDir: 'up',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -42,
                label: isEn ? 'Cyan Turbo reverse (Trap!)' : 'Turbo Ciano a ritroso (Trappola!)'
            },
            // 5c. Incrocio a 4 vie (Casella 55: incrocio tra Main e Turbo Ciano)
            {
                fromTrack: 'main',
                fromStep: 55,
                toTrack: 'cyan_turbo',
                toStep: 10,
                stepDir: 1,
                branchArrowDir: 'right',
                branchColorKey: 'cyan_turbo',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                is4Way: true,
                mainNext: { track: 'main', step: 56, dir: 1 },
                branchNext: { track: 'cyan_turbo', step: 10, dir: 1 },
                stepDelta: 31,
                label: isEn ? '4-Way Crossing (55)' : 'Incrocio a 4 vie (55)'
            },
            // 5d. Incrocio a 4 vie arrivando dal Turbo Ciano (step 9)
            {
                fromTrack: 'cyan_turbo',
                fromStep: 9,
                toTrack: 'main',
                toStep: 56,
                stepDir: 1,
                branchArrowDir: 'right',
                branchColorKey: 'cyan_turbo',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                is4Way: true,
                skipDrawing: true,
                mainNext: { track: 'main', step: 56, dir: 1 },
                branchNext: { track: 'cyan_turbo', step: 10, dir: 1 },
                stepDelta: -30,
                label: isEn ? '4-Way Crossing (from Cyan Turbo)' : 'Incrocio a 4 vie (dal Turbo Ciano)'
            },
            // 6. Inizio Raccordo Verde Lime (in avanti da Main 53 verso 97)
            {
                fromTrack: 'main',
                fromStep: 53,
                toTrack: 'lime_express',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'right',
                branchColorKey: 'lime_express',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                stepDelta: 34,
                label: isEn ? 'Lime Express Link (towards 97!)' : 'Raccordo Lime Express (verso 97!)'
            },
            // 6b. Rientro Verde Lime a ritroso (da Main 97 a ritroso verso 53!)
            {
                fromTrack: 'main',
                fromStep: 97,
                toTrack: 'lime_express',
                toStep: limePoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'left',
                branchColorKey: 'lime_express',
                mainArrowDir: 'up',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -54,
                label: isEn ? 'Lime Express reverse (Trap towards 53!)' : 'Lime Express a ritroso (Trappola verso 53!)'
            },
            // 7. Inizio Scorciatoia Rosa (da Main 57 a 81)
            {
                fromTrack: 'main',
                fromStep: 57,
                toTrack: 'pink_express',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'pink_express',
                mainArrowDir: 'left',
                mainColorKey: 'main',
                stepDelta: 22,
                label: isEn ? 'Pink Shortcut (towards 81!)' : 'Scorciatoia Rosa (verso 81!)'
            },
            // 7b. Rientro Scorciatoia Rosa a ritroso (da Main 81 verso 57)
            {
                fromTrack: 'main',
                fromStep: 81,
                toTrack: 'pink_express',
                toStep: pinkPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'up',
                branchColorKey: 'pink_express',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -26,
                label: isEn ? 'Pink Shortcut reverse (Trap towards 57!)' : 'Scorciatoia Rosa a ritroso (Trappola verso 57!)'
            },
            // 8. Inizio Raccordo Ambra (da Main 38 a 68)
            {
                fromTrack: 'main',
                fromStep: 38,
                toTrack: 'amber_link',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'down',
                branchColorKey: 'amber_link',
                mainArrowDir: 'up',
                mainColorKey: 'main',
                stepDelta: 26,
                label: isEn ? 'Amber Link (towards 68!)' : 'Raccordo Ambra (verso 68!)'
            },
            // 8b. Rientro Raccordo Ambra a ritroso (da Main 68 verso 38)
            {
                fromTrack: 'main',
                fromStep: 68,
                toTrack: 'amber_link',
                toStep: amberPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'up',
                branchColorKey: 'amber_link',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -34,
                label: isEn ? 'Amber Link reverse (Trap towards 38!)' : 'Raccordo Ambra a ritroso (Trappola verso 38!)'
            },
            // 9. Inizio Discesa Turchese (da Main 15 a 52)
            {
                fromTrack: 'main',
                fromStep: 15,
                toTrack: 'teal_direct',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'right',
                branchColorKey: 'teal_direct',
                mainArrowDir: 'down',
                mainColorKey: 'main',
                stepDelta: 30,
                label: isEn ? 'Teal Direct Drop (towards 52!)' : 'Discesa Turchese (verso 52!)'
            },
            // 9b. Rientro Discesa Turchese a ritroso (da Main 52 verso 15)
            {
                fromTrack: 'main',
                fromStep: 52,
                toTrack: 'teal_direct',
                toStep: tealPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'up',
                branchColorKey: 'teal_direct',
                mainArrowDir: 'right',
                mainColorKey: 'main',
                isTrap: true,
                stepDelta: -44,
                label: isEn ? 'Teal Direct Drop reverse (Trap towards 15!)' : 'Discesa Turchese a ritroso (Trappola verso 15!)'
            },
            // 10. Inizio Ponte Corallo (da Turchese 2 a Verde Chiaro / Lime 7)
            {
                fromTrack: 'teal_direct',
                fromStep: 2,
                toTrack: 'coral_bridge',
                toStep: 0,
                stepDir: 1,
                branchArrowDir: 'right',
                branchColorKey: 'coral_bridge',
                mainArrowDir: 'down',
                mainColorKey: 'teal_direct',
                stepDelta: 42,
                label: isEn ? 'Coral Bridge (from Teal to Lime)' : 'Ponte Corallo (da Turchese a Lime)'
            },
            // 10b. Rientro Ponte Corallo a ritroso (da Lime 7 verso Turchese 2)
            {
                fromTrack: 'lime_express',
                fromStep: 7,
                toTrack: 'coral_bridge',
                toStep: coralPoints.length - 1,
                stepDir: -1,
                branchArrowDir: 'left',
                branchColorKey: 'coral_bridge',
                mainArrowDir: 'right',
                mainColorKey: 'lime_express',
                isTrap: true,
                stepDelta: -42,
                label: isEn ? 'Coral Bridge reverse (Trap towards Teal!)' : 'Ponte Corallo a ritroso (Trappola verso Turchese!)'
            }
        ];

        return { tracks, junctions };
    }

    // --- SISTEMA AUDIO SINTETIZZATO ---
    const SoundEngine = {
        ctx: null,
        enabled: true,

        get isEnabled() {
            return this.enabled && !window.audioMuted;
        },

        init() {
            if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
            }
        },

        ensureUnlocked() {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        playDiceRoll() {
            if (!this.isEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(140 + Math.random() * 80, now + i * 0.05);
                gain.gain.setValueAtTime(0.18, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.05);
            }
        },

        playDiceRattle() {
            if (!this.isEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150 + Math.random() * 90, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        },

        playDiceDrop() {
            if (!this.isEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            [220, 170, 130].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq + Math.random() * 30, now + i * 0.04);
                gain.gain.setValueAtTime(0.2 / (i + 1), now + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.05);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.04);
                osc.stop(now + i * 0.04 + 0.06);
            });
        },

        playStep() {
            if (!this.isEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        },

        playJunction(isTrap) {
            if (!this.isEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = isTrap ? 'sawtooth' : 'sine';
            if (isTrap) {
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.3);
            } else {
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.1);
                osc.frequency.setValueAtTime(783.99, now + 0.2);
            }
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);
        },

        audioCache: {},

        playAudioFile(src) {
            if (!this.isEnabled) return;
            try {
                if (!this.audioCache[src]) {
                    this.audioCache[src] = new Audio(src);
                }
                const audio = this.audioCache[src];
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } catch (e) {}
        },

        stopAllAudio() {
            Object.values(this.audioCache).forEach(a => {
                try {
                    a.pause();
                    a.currentTime = 0;
                } catch (e) {}
            });
        },

        playHandWin() {
            this.stopAllAudio();
            this.playAudioFile('sounds/scala40/tada.mp3');
        },

        playHandLoss() {
            this.stopAllAudio();
            this.playAudioFile('sounds/scala40/haiperso.mp3');
        },

        playMatchWin() {
            this.stopAllAudio();
            this.playAudioFile('sounds/scala40/applause.mp3');
        },

        playMatchLoss() {
            this.stopAllAudio();
            this.playAudioFile('sounds/scala40/lacrimosa.mp3');
        }
    };

    // --- MOTORE DI GIOCO ---
    const Game = {
        canvas: null,
        ctx: null,
        tracksData: null,
        players: [],
        currentPlayerIdx: 0,
        dice1: 3,
        dice2: 4,
        isRolling: false,
        isMoving: false,
        isHoldingRoll: false,
        holdStartTime: 0,
        rollInterval: null,
        isGameOver: false,
        autoPlay: false,
        tournament: {
            enabled: true,
            targetPoints: 1000,
            pointsPerWin: 100,
            currentMatch: 1,
            scores: {},
            isFinished: false,
            champion: null
        },
        options: {
            doubleRollExtra: true,
            exactFinish: false,
            branchExitMode: 'cross' // 'cross' (segui freccia del percorso incrociato) | 'own' (segui freccia del proprio colore)
        },
        eventLogs: [],
        animationFrameId: null,

        init() {
            // Se l'overlay dell'interstitial è presente a schermo, aspetta la sua chiusura (come in Sudoku)
            if (document.getElementById('interstitial-overlay')) {
                const checkOverlay = setInterval(() => {
                    if (!document.getElementById('interstitial-overlay')) {
                        clearInterval(checkOverlay);
                        this.init();
                    }
                }, 100);
                return;
            }

            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = BOARD_WIDTH;
            this.canvas.height = BOARD_HEIGHT;

            // Inizializzazione audio toggle globale (come in Sudoku)
            if (window.initAudioToggle) {
                window.initAudioToggle('#btn-audio');
            }

            this.tracksData = generateTracks();
            this.setupEvents();
            this.startNewGame([
                { name: TXT.defaultPlayer1, color: PLAYER_COLORS[0], isBot: false },
                { name: TXT.defaultComputer + '1', color: PLAYER_COLORS[1], isBot: true },
                { name: TXT.defaultComputer + '2', color: PLAYER_COLORS[2], isBot: true }
            ]);

            this.startRenderLoop();

            // Mostra la modale delle opzioni/inizio gioco all'avvio
            this.openModal('modale-nuova');
        },

        setupEvents() {
            const btnRoll = document.getElementById('btnRollDice');
            if (btnRoll) {
                // Supporto pressione continua per giocatore umano (Mouse, Touch, Penna)
                btnRoll.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    SoundEngine.ensureUnlocked();
                    this.startHoldingRoll();
                });

                btnRoll.addEventListener('pointerup', () => {
                    this.releaseRoll();
                });

                btnRoll.addEventListener('pointercancel', () => {
                    this.releaseRoll();
                });

                // Supporto tastiera (Spazio o Invio)
                btnRoll.addEventListener('keydown', (e) => {
                    if (e.code === 'Space' || e.code === 'Enter') {
                        if (!e.repeat) {
                            SoundEngine.ensureUnlocked();
                            this.startHoldingRoll();
                        }
                    }
                });

                btnRoll.addEventListener('keyup', (e) => {
                    if (e.code === 'Space' || e.code === 'Enter') {
                        this.releaseRoll();
                    }
                });
            }

            // Sicurezza globale: rilascio puntatore ovunque nella finestra
            window.addEventListener('pointerup', () => {
                if (this.isHoldingRoll) {
                    this.releaseRoll();
                }
            });
            window.addEventListener('pointercancel', () => {
                if (this.isHoldingRoll) {
                    this.releaseRoll();
                }
            });

            const btnOptions = document.getElementById('btn-opzioni-gioco');
            if (btnOptions) {
                btnOptions.addEventListener('click', () => this.openModal('modale-nuova'));
            }

            const btnNew = document.getElementById('btn-nuova-partita');
            if (btnNew) {
                btnNew.addEventListener('click', () => this.requestNewGame());
            }

            const chkAuto = document.getElementById('chkAutoPlayMini');
            if (chkAuto) {
                chkAuto.addEventListener('change', (e) => {
                    this.autoPlay = e.target.checked;
                    if (this.autoPlay && !this.isMoving && !this.isRolling && !this.isGameOver) {
                        this.triggerBotOrAutoTurn();
                    }
                });
            }

            const btnStartCustom = document.getElementById('btnStartCustomGame');
            if (btnStartCustom) {
                btnStartCustom.addEventListener('click', () => this.startCustomGameFromForm());
            }

            const btnNextMatch = document.getElementById('btn-prossima-manche');
            if (btnNextMatch) {
                btnNextMatch.addEventListener('click', () => this.startNextTournamentMatch());
            }

            const schermo = document.getElementById('schermo');
            if (schermo) {
                schermo.addEventListener('click', () => this.closeModals());
            }
        },

        requestNewGame() {
            if (this.isGameOver) {
                this.openModal('modale-nuova');
            } else {
                this.openModal('confermatermina');
            }
        },

        openModal(id) {
            this.closeModals();
            const el = document.getElementById(id);
            const schermo = document.getElementById('schermo');
            if (el && schermo) {
                schermo.style.display = 'block';
                el.style.display = 'flex';

                if (id === 'finepartita' || id === 'confermatermina') {
                    const targetTop = (id === 'confermatermina') ? 470 : 420;
                    if (typeof setupAmazonFinishBanner === 'function') {
                        setupAmazonFinishBanner(id, {
                            modalStyle: { overflow: 'visible' },
                            targetTop: targetTop,
                            applyModalTop: false,
                            bannerHeight: 300,
                            bannerTopOffset: 325,
                            leftOffset: 0
                        });
                    }
                }
            }
        },

        closeModals() {
            const schermo = document.getElementById('schermo');
            if (schermo) schermo.style.display = 'none';
            document.querySelectorAll('.form-scorciatoie').forEach(m => m.style.display = 'none');
            // Rimuove i banner delle modali per evitare annunci duplicati o obsoleti alla riapertura
            document.querySelectorAll('#campogioco .finish-banner').forEach(function (b) { b.remove(); });

            if (this.players && this.players[this.currentPlayerIdx]) {
                const cur = this.players[this.currentPlayerIdx];
                if ((cur.isBot || this.autoPlay) && !this.isMoving && !this.isRolling && !this.isGameOver) {
                    setTimeout(() => this.triggerBotOrAutoTurn(), 400);
                }
            }
        },

        awardPoints(player, points, reason = '') {
            if (!this.tournament.enabled) return;
            const currentScore = (this.tournament.scores[player.name] || 0) + points;
            this.tournament.scores[player.name] = currentScore;
            player.score = currentScore;
            const ptsStr = TXT.pointsAwarded.replace('%p', points);
            this.logEvent(`⭐ ${player.name} ${ptsStr}${reason ? ' (' + reason + ')' : ''}! ${TXT.tournamentPoints} ${currentScore} pt`, 'highlight');
        },

        startNextTournamentMatch() {
            if (!this.tournament.enabled || this.tournament.isFinished) return;
            this.tournament.currentMatch++;
            this.closeModals();

            const playersConfig = this.players.map(p => ({
                name: p.name,
                color: p.color,
                isBot: p.isBot
            }));
            this.startNewGame(playersConfig, true);
        },

        startNewGame(playersConfig, isNextMatchOfTournament = false) {
            SoundEngine.stopAllAudio();
            if (!isNextMatchOfTournament) {
                this.tournament.currentMatch = 1;
                this.tournament.scores = {};
                this.tournament.isFinished = false;
                this.tournament.champion = null;
                playersConfig.forEach(p => {
                    this.tournament.scores[p.name] = 0;
                });
            }

            this.players = playersConfig.map((cfg, idx) => ({
                id: idx,
                name: cfg.name,
                color: cfg.color,
                isBot: cfg.isBot,
                score: this.tournament.scores[cfg.name] || 0,
                lastBlackCell: 0,
                trackId: 'main',
                stepIdx: 0,
                prevTrackId: 'main',
                prevStepIdx: 0,
                renderX: 0,
                renderY: 0,
                headingAngle: 0,
                isWinner: false
            }));

            this.players.forEach(p => {
                const pos = this.getCellCenterPx(p.trackId, p.stepIdx);
                p.renderX = pos.x;
                p.renderY = pos.y;
                p.headingAngle = this.calculateHeading(p.trackId, p.stepIdx);
            });

            this.currentPlayerIdx = 0;
            this.dice1 = 3;
            this.dice2 = 4;
            this.isRolling = false;
            this.isMoving = false;
            this.isGameOver = false;

            const btnRoll = document.getElementById('btnRollDice');
            if (btnRoll) {
                btnRoll.style.background = '';
                btnRoll.style.borderColor = '';
                btnRoll.disabled = false;
                btnRoll.textContent = TXT.rollDiceBtn;
            }

            this.eventLogs = [];
            const miniLog = document.getElementById('miniCronacaBox');
            if (miniLog) miniLog.innerHTML = '';
            const modalLog = document.getElementById('modalEventLog');
            if (modalLog) modalLog.innerHTML = '';

            this.updateDiceUI(3, 4, false);
            this.updatePlayersUI();
            this.updateHeaderUI();

            if (this.tournament.enabled) {
                const logStr = TXT.newTournamentLog
                    .replace('%t', this.tournament.targetPoints)
                    .replace('%m', this.tournament.currentMatch)
                    .replace('%p', this.players[0].name);
                this.logEvent(logStr, 'highlight');
            } else {
                const logStr = TXT.newSingleGameLog.replace('%p', this.players[0].name);
                this.logEvent(logStr, 'highlight');
            }
            this.updateTurnUI();

            if (this.players[0].isBot || this.autoPlay) {
                setTimeout(() => this.triggerBotOrAutoTurn(), 800);
            }
        },

        startCustomGameFromForm() {
            const count = parseInt(document.getElementById('numPlayersSelect').value, 10);
            const doubleRoll = document.getElementById('chkDoubleExtra').checked;
            const exactFin = document.getElementById('chkExactFinish').checked;
            const branchExitSelect = document.getElementById('selBranchExitMode');
            if (branchExitSelect) {
                this.options.branchExitMode = branchExitSelect.value;
            }

            const tournamentTargetSelect = document.getElementById('selTournamentTarget');
            const targetVal = tournamentTargetSelect ? parseInt(tournamentTargetSelect.value, 10) : 1000;
            if (targetVal > 0) {
                this.tournament.enabled = true;
                this.tournament.targetPoints = targetVal;
                this.tournament.pointsPerWin = 100;
            } else {
                this.tournament.enabled = false;
                this.tournament.targetPoints = 0;
            }

            this.options.doubleRollExtra = doubleRoll;
            this.options.exactFinish = exactFin;

            const newPlayers = [];
            for (let i = 0; i < count; i++) {
                const nameInput = document.getElementById(`pname_${i}`);
                const typeSelect = document.getElementById(`ptype_${i}`);
                const defName = (i === 0) ? TXT.defaultPlayer1 : (TXT.defaultComputer + i);
                const name = nameInput ? nameInput.value.trim() || defName : defName;
                const isBot = typeSelect ? typeSelect.value === 'bot' : (i > 0);
                newPlayers.push({
                    name,
                    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                    isBot
                });
            }

            this.closeModals();
            this.startNewGame(newPlayers, false);
        },

        getCellCenterPx(trackId, stepIdx) {
            const track = this.tracksData.tracks[trackId];
            if (!track) return { x: 0, y: 0 };
            const pt = track.points[Math.min(stepIdx, track.points.length - 1)];
            if (!pt) return { x: 0, y: 0 };
            return {
                x: PAD_X + pt.bx * CELL_PX + (CELL_PX / 2),
                y: PAD_Y + pt.by * CELL_PX + (CELL_PX / 2)
            };
        },

        calculateHeading(playerOrTrackId, stepIdx, stepDir) {
            let trackId = (typeof playerOrTrackId === 'object') ? playerOrTrackId.trackId : playerOrTrackId;
            let step = (typeof playerOrTrackId === 'object') ? playerOrTrackId.stepIdx : stepIdx;
            let dir = (typeof playerOrTrackId === 'object') ? (playerOrTrackId.stepDir || 1) : (stepDir || 1);
            const player = (typeof playerOrTrackId === 'object') ? playerOrTrackId : null;

            // Se la pedina è ferma su un incrocio con deviazione programmata, la freccia punta verso il primo blocco del ramo!
            if (player && player.nextBranch) {
                const curTrack = this.tracksData.tracks[player.trackId];
                const branchTrack = this.tracksData.tracks[player.nextBranch.toTrack];
                if (curTrack && branchTrack && branchTrack.points[player.nextBranch.toStep]) {
                    const curPt = curTrack.points[player.stepIdx];
                    const nextPt = branchTrack.points[player.nextBranch.toStep];
                    return Math.atan2(nextPt.by - curPt.by, nextPt.bx - curPt.bx);
                }
            }

            const track = this.tracksData.tracks[trackId];
            if (!track || track.points.length === 0) return 0;

            const curPt = track.points[step];
            let nextPt = null;

            if (dir === -1) {
                // Movimento a ritroso
                if (step - 1 >= 0) {
                    nextPt = track.points[step - 1];
                } else if (track.startConfluence) {
                    const confTrack = this.tracksData.tracks[track.startConfluence.targetTrack];
                    if (confTrack && confTrack.points[track.startConfluence.targetStep]) {
                        nextPt = confTrack.points[track.startConfluence.targetStep];
                    }
                }
            } else {
                // Movimento in avanti
                if (step + 1 < track.points.length) {
                    nextPt = track.points[step + 1];
                } else if (track.confluence) {
                    const confTrack = this.tracksData.tracks[track.confluence.targetTrack];
                    if (confTrack && confTrack.points[track.confluence.targetStep]) {
                        nextPt = confTrack.points[track.confluence.targetStep];
                    }
                }
            }

            if (!curPt || !nextPt) return 0;
            const dx = nextPt.bx - curPt.bx;
            const dy = nextPt.by - curPt.by;
            return Math.atan2(dy, dx);
        },

        startHoldingRoll() {
            if (this.isRolling || this.isMoving) return;
            if (this.isGameOver) {
                this.openModal('finepartita');
                return;
            }
            const current = this.players[this.currentPlayerIdx];
            if (current && current.isBot && !this.autoPlay) return;

            this.isHoldingRoll = true;
            this.isRolling = true;
            this.holdStartTime = Date.now();

            const btnRoll = document.getElementById('btnRollDice');
            if (btnRoll) {
                btnRoll.classList.add('holding');
                btnRoll.textContent = TXT.rollDiceBtnHolding;
            }

            const diceElements = document.querySelectorAll('.dice');
            diceElements.forEach(d => d.classList.add('rolling'));
            SoundEngine.playDiceRoll();

            let tickCount = 0;
            if (this.rollInterval) clearInterval(this.rollInterval);
            this.rollInterval = setInterval(() => {
                const temp1 = Math.floor(Math.random() * 6) + 1;
                const temp2 = Math.floor(Math.random() * 6) + 1;
                this.updateDiceUI(temp1, temp2, true);
                tickCount++;

                // Scuotimento sonoro periodico mentre si tiene premuto
                if (tickCount % 4 === 0) {
                    SoundEngine.playDiceRattle();
                }
            }, 50);
        },

        releaseRoll() {
            if (!this.isHoldingRoll) return;
            this.isHoldingRoll = false;

            const btnRoll = document.getElementById('btnRollDice');
            if (btnRoll) {
                btnRoll.classList.remove('holding');
                btnRoll.disabled = true;
                btnRoll.textContent = TXT.rollDiceBtn;
            }

            const elapsed = Date.now() - (this.holdStartTime || 0);
            const remainingDelay = Math.max(0, 180 - elapsed);

            setTimeout(() => {
                let finishTicks = 0;
                const maxFinishTicks = 4;
                const finishInterval = setInterval(() => {
                    const temp1 = Math.floor(Math.random() * 6) + 1;
                    const temp2 = Math.floor(Math.random() * 6) + 1;
                    this.updateDiceUI(temp1, temp2, true);
                    finishTicks++;

                    if (finishTicks >= maxFinishTicks) {
                        clearInterval(finishInterval);
                        if (this.rollInterval) {
                            clearInterval(this.rollInterval);
                            this.rollInterval = null;
                        }

                        const diceElements = document.querySelectorAll('.dice');
                        diceElements.forEach(d => d.classList.remove('rolling'));

                        this.dice1 = Math.floor(Math.random() * 6) + 1;
                        this.dice2 = Math.floor(Math.random() * 6) + 1;
                        const total = this.dice1 + this.dice2;
                        const isDouble = (this.dice1 === this.dice2);

                        this.updateDiceUI(this.dice1, this.dice2, false);
                        SoundEngine.playDiceDrop();
                        this.isRolling = false;

                        const player = this.players[this.currentPlayerIdx];
                        this.logEvent(`🎲 ${player.name}: ${this.dice1}+${this.dice2} = <b>${total}</b>${isDouble && this.options.doubleRollExtra ? TXT.doubleTag : ''}`);

                        this.executeMove(player, total, isDouble);
                    }
                }, 50);
            }, remainingDelay);
        },

        rollDiceForBot() {
            if (this.isRolling || this.isMoving || this.isGameOver) return;

            this.isRolling = true;
            const btnRoll = document.getElementById('btnRollDice');
            if (btnRoll) {
                btnRoll.disabled = true;
                btnRoll.textContent = TXT.computerWaiting;
            }

            const diceElements = document.querySelectorAll('.dice');
            diceElements.forEach(d => d.classList.add('rolling'));
            SoundEngine.playDiceRoll();

            let rollsCount = 0;
            const maxRolls = 9;
            const rollInterval = setInterval(() => {
                const temp1 = Math.floor(Math.random() * 6) + 1;
                const temp2 = Math.floor(Math.random() * 6) + 1;
                this.updateDiceUI(temp1, temp2, true);
                rollsCount++;

                if (rollsCount >= maxRolls) {
                    clearInterval(rollInterval);
                    diceElements.forEach(d => d.classList.remove('rolling'));

                    this.dice1 = Math.floor(Math.random() * 6) + 1;
                    this.dice2 = Math.floor(Math.random() * 6) + 1;
                    const total = this.dice1 + this.dice2;
                    const isDouble = (this.dice1 === this.dice2);

                    this.updateDiceUI(this.dice1, this.dice2, false);
                    SoundEngine.playDiceDrop();
                    this.isRolling = false;

                    const player = this.players[this.currentPlayerIdx];
                    this.logEvent(`🎲 ${player.name}: ${this.dice1}+${this.dice2} = <b>${total}</b>${isDouble && this.options.doubleRollExtra ? TXT.doubleTag : ''}`);

                    this.executeMove(player, total, isDouble);
                }
            }, 50);
        },

        rollDice() {
            const current = this.players[this.currentPlayerIdx];
            if (current && current.isBot && !this.autoPlay) {
                this.rollDiceForBot();
            } else {
                this.startHoldingRoll();
                setTimeout(() => this.releaseRoll(), 350);
            }
        },

        executeMove(player, totalSteps, isDouble) {
            this.isMoving = true;
            let stepsRemaining = totalSteps;
            const stepDuration = 180;

            const advanceOneStep = () => {
                if (stepsRemaining <= 0 || this.isGameOver) {
                    this.finishMove(player, isDouble);
                    return;
                }

                const prevTrack = player.trackId;
                const prevStep = player.stepIdx;

                let nextTrackId = player.trackId;
                let nextStep;
                let nextDir = player.stepDir || 1;

                if (player.nextBranch) {
                    // La pedina parte dalla casella incrocio e fa il suo primo passo nel percorso secondario
                    nextTrackId = player.nextBranch.toTrack;
                    nextStep = player.nextBranch.toStep;
                    nextDir = player.nextBranch.stepDir || 1;
                    player.nextBranch = null;
                } else {
                    const currentTrack = this.tracksData.tracks[player.trackId];
                    nextStep = player.stepIdx + nextDir;

                    if (nextDir === 1) {
                        if (currentTrack.isFinish && nextStep >= currentTrack.points.length - 1) {
                            player.prevTrackId = prevTrack;
                            player.prevStepIdx = prevStep;
                            player.trackId = nextTrackId;
                            player.stepIdx = currentTrack.points.length - 1;
                            player.stepDir = nextDir;
                            player.headingAngle = this.calculateHeading(player);
                            player.lastBlackCell = player.stepIdx;

                            SoundEngine.playStep();
                            this.updatePlayersUI();
                            this.updateHeaderUI();
                            this.handleVictory(player);
                            return;
                        } else if (nextStep >= currentTrack.points.length) {
                            if (currentTrack.confluence) {
                                nextTrackId = currentTrack.confluence.targetTrack;
                                nextStep = currentTrack.confluence.targetStep;
                                nextDir = currentTrack.confluence.targetDir || 1;

                                const confTrack = this.tracksData.tracks[nextTrackId];
                                if (confTrack && confTrack.isFinish && nextStep >= confTrack.points.length - 1) {
                                    player.prevTrackId = prevTrack;
                                    player.prevStepIdx = prevStep;
                                    player.trackId = nextTrackId;
                                    player.stepIdx = confTrack.points.length - 1;
                                    player.stepDir = nextDir;
                                    player.headingAngle = this.calculateHeading(player);
                                    player.lastBlackCell = player.stepIdx;

                                    SoundEngine.playStep();
                                    this.updatePlayersUI();
                                    this.updateHeaderUI();
                                    this.handleVictory(player);
                                    return;
                                }
                            }
                        }
                    } else if (nextDir === -1) {
                        if (nextStep < 0) {
                            if (currentTrack.startConfluence) {
                                nextTrackId = currentTrack.startConfluence.targetTrack;
                                nextStep = currentTrack.startConfluence.targetStep;
                                nextDir = currentTrack.startConfluence.targetDir || 1;
                            } else {
                                nextStep = 0;
                                nextDir = 1;
                            }
                        }
                    }
                }

                player.prevTrackId = prevTrack;
                player.prevStepIdx = prevStep;

                player.trackId = nextTrackId;
                player.stepIdx = nextStep;
                player.stepDir = nextDir;
                player.headingAngle = this.calculateHeading(player);

                if (player.trackId === 'main') {
                    player.lastBlackCell = player.stepIdx;
                }

                SoundEngine.playStep();
                stepsRemaining--;
                this.updatePlayersUI();
                this.updateHeaderUI();

                if (player.trackId === 'main' && player.stepIdx >= 99) {
                    this.handleVictory(player);
                    return;
                }

                setTimeout(advanceOneStep, stepDuration);
            };

            setTimeout(advanceOneStep, stepDuration);
        },

        finishMove(player, isDouble) {
            this.isMoving = false;

            // Se la pedina si trova sul traguardo finale (casella 99), vittoria immediata
            if (player.trackId === 'main' && player.stepIdx >= 99) {
                this.handleVictory(player);
                return;
            }

            // Controlla se la pedina si è fermata esattamente su un incrocio/bivio
            const junction = this.tracksData.junctions.find(
                j => !j.isConfluence && j.fromTrack === player.trackId && j.fromStep === player.stepIdx
            );

            if (junction) {
                const normalizeRoute = (r) => {
                    if (!r) return null;
                    return {
                        toTrack: r.toTrack || r.track,
                        toStep: (r.toStep !== undefined) ? r.toStep : r.step,
                        stepDir: r.stepDir || r.dir || 1
                    };
                };

                const mainNext = normalizeRoute(junction.mainNext) || { toTrack: junction.fromTrack, toStep: junction.fromStep + 1, stepDir: 1 };
                const branchNext = normalizeRoute(junction.branchNext) || { toTrack: junction.toTrack, toStep: junction.toStep, stepDir: junction.stepDir || 1 };

                // La provenienza effettiva è il colore/tracciato dell'ultima casella immediatamente precedente
                const enterFromTrack = player.prevTrackId || player.trackId;
                const isFromMainTrack = (enterFromTrack === junction.mainColorKey || (enterFromTrack === 'main' && !junction.skipDrawing) || (enterFromTrack === junction.fromTrack));
                const ownRoute = isFromMainTrack ? mainNext : branchNext;
                const crossRoute = isFromMainTrack ? branchNext : mainNext;

                // Opzione: 'own' (segui freccia del proprio colore) vs 'cross' (segui freccia del percorso incrociato)
                const chosen = (this.options.branchExitMode === 'own') ? ownRoute : crossRoute;

                player.nextBranch = {
                    toTrack: chosen.toTrack,
                    toStep: chosen.toStep,
                    stepDir: chosen.stepDir || 1
                };
                player.headingAngle = this.calculateHeading(player);

                SoundEngine.playJunction(junction.isTrap);

                // Mostra il badge/sprite fluttuante quando si imbocca la deviazione (uscita da un tracciato)
                if (chosen.toTrack !== player.trackId && junction.stepDelta !== undefined) {
                    this.spawnStepDeltaSprite(player.trackId, player.stepIdx, junction.stepDelta);
                }

                const displayDelta = -junction.stepDelta;
                const deltaTag = (junction.stepDelta !== undefined && chosen.toTrack !== player.trackId)
                    ? ` (${displayDelta > 0 ? '+' : ''}${displayDelta} ${isEn ? (Math.abs(displayDelta) === 1 ? 'step' : 'steps') : (Math.abs(displayDelta) === 1 ? 'passo' : 'passi')})`
                    : '';

                const modeLabel = (this.options.branchExitMode === 'own') ? TXT.ownArrow : TXT.crossArrow;
                if (junction.isTrap) {
                    this.logEvent(`⚠️ OUCH! ${player.name} ${TXT.isAtJunction} ${junction.label}${deltaTag}! ${TXT.willFollow} ${modeLabel}`, 'danger');
                } else if (junction.is4Way) {
                    this.logEvent(`✨ ${isEn ? '4-WAY CROSSING!' : 'INCROCIO 4 VIE!'} ${player.name} ${TXT.isAtJunction} ${junction.label}${deltaTag}! ${TXT.willFollow} ${modeLabel}`, 'highlight');
                } else {
                    this.logEvent(`✨ ${isEn ? 'JUNCTION!' : 'BIVIO!'} ${player.name} ${TXT.isAtJunction} ${junction.label}${deltaTag}! ${TXT.willFollow} ${modeLabel}`, 'highlight');
                }
                this.updatePlayersUI();
            }

            if (isDouble && this.options.doubleRollExtra && !this.isGameOver) {
                this.logEvent(`🎯 ${player.name} ${TXT.extraRollDouble}`, 'success');
                this.updateTurnUI();
                if (player.isBot || this.autoPlay) {
                    setTimeout(() => this.triggerBotOrAutoTurn(), 600);
                }
            } else if (!this.isGameOver) {
                this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
                this.updateTurnUI();
                const nextPlayer = this.players[this.currentPlayerIdx];
                if (nextPlayer.isBot || this.autoPlay) {
                    setTimeout(() => this.triggerBotOrAutoTurn(), 650);
                }
            }
        },

        triggerBotOrAutoTurn() {
            const schermo = document.getElementById('schermo');
            if (schermo && schermo.style.display === 'block') return;
            if (this.isRolling || this.isMoving || this.isGameOver) return;
            this.rollDice();
        },

        handleVictory(winner) {
            this.isGameOver = true;
            this.isMoving = false;
            winner.isWinner = true;

            const modalMsg = document.getElementById('fine-messaggio');
            const modalDetails = document.getElementById('fine-dettagli');
            const leaderboardBox = document.getElementById('fine-classifica-torneo');
            const btnNextMatch = document.getElementById('btn-prossima-manche');

            const hasHuman = this.players.some(p => !p.isBot);
            const isHumanWinner = !winner.isBot;

            if (this.tournament.enabled) {
                // Al vincitore vengono assegnati 100 punti
                this.awardPoints(winner, 100, TXT.mancheScoreReason);

                // Agli altri giocatori viene assegnato il valore dell'ultima casella nera toccata
                this.players.forEach(p => {
                    if (p.name !== winner.name) {
                        const blackScore = p.lastBlackCell || 0;
                        this.awardPoints(p, blackScore, `${TXT.lastBlackReason} (${blackScore})`);
                    }
                });

                const sortedPlayers = [...this.players].sort((a, b) => {
                    const sA = this.tournament.scores[a.name] || 0;
                    const sB = this.tournament.scores[b.name] || 0;
                    return sB - sA;
                });

                const topPlayer = sortedPlayers[0];
                const topScore = this.tournament.scores[topPlayer.name] || 0;
                const isChampion = topScore >= this.tournament.targetPoints;
                const isHumanChampion = !topPlayer.isBot;

                if (isChampion) {
                    this.tournament.isFinished = true;
                    this.tournament.champion = topPlayer;
                    if (btnNextMatch) btnNextMatch.style.display = 'none';

                    if (hasHuman && !isHumanChampion) {
                        // Partita persa dall'umano (vinta dal bot)
                        if (modalMsg) modalMsg.textContent = TXT.tournamentLossTitle;
                        if (modalDetails) modalDetails.textContent = `💀 ${topPlayer.name.toUpperCase()} ${TXT.tournamentLossDetails.replace('%s', topScore)}`;
                        this.logEvent(`💀 ${topPlayer.name} ${TXT.tournamentChampionLog.replace('%s', topScore)}`, 'warning');
                        SoundEngine.playMatchLoss();
                    } else {
                        // Partita vinta dall'umano (o partita fra bot)
                        if (modalMsg) modalMsg.textContent = TXT.tournamentChampionTitle;
                        if (modalDetails) modalDetails.textContent = `🏅 ${topPlayer.name.toUpperCase()} ${TXT.tournamentChampionDetails.replace('%s', topScore)}`;
                        this.logEvent(`👑 ${topPlayer.name} ${TXT.tournamentChampionLog.replace('%s', topScore)}`, 'success');
                        SoundEngine.playMatchWin();
                    }
                } else {
                    if (btnNextMatch) {
                        btnNextMatch.style.display = 'inline-block';
                        btnNextMatch.textContent = TXT.nextLegBtn.replace('%m', this.tournament.currentMatch + 1);
                    }

                    if (hasHuman && !isHumanWinner) {
                        // Mano persa dall'umano (vinta dal bot)
                        if (modalMsg) modalMsg.textContent = TXT.legLossTitle.replace('%m', this.tournament.currentMatch);
                        if (modalDetails) modalDetails.textContent = `🤖 ${winner.name} ${TXT.legLossDetails}`;
                        this.logEvent(TXT.legFinishedLog.replace('%m', this.tournament.currentMatch).replace('%w', winner.name), 'warning');
                        SoundEngine.playHandLoss();
                    } else {
                        // Mano vinta dall'umano (o mano fra bot)
                        if (modalMsg) modalMsg.textContent = TXT.legVictoryTitle.replace('%m', this.tournament.currentMatch);
                        if (modalDetails) modalDetails.textContent = `🎉 ${winner.name} ${TXT.legVictoryDetails}`;
                        this.logEvent(TXT.legFinishedLog.replace('%m', this.tournament.currentMatch).replace('%w', winner.name), 'success');
                        SoundEngine.playHandWin();
                    }
                }

                // Renderizza la tabella classifica del torneo
                if (leaderboardBox) {
                    leaderboardBox.style.display = 'block';

                    let tableHtml = `
                        <div style="font-weight:bold; color:#ffd700; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; text-align:center; font-size:11px;">
                            ${TXT.standingsTitle.replace('%t', this.tournament.targetPoints)}
                        </div>
                        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:11px;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.2); color:#94a3b8;">
                                    <th style="padding:2px 4px; width:24px;">#</th>
                                    <th style="padding:2px 4px;">${TXT.thPlayer}</th>
                                    <th style="padding:2px 4px; text-align:center;">${TXT.thLegPoints}</th>
                                    <th style="padding:2px 4px; text-align:right;">${TXT.thTotal}</th>
                                    <th style="padding:2px 4px; text-align:right;">${TXT.thRemaining}</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    sortedPlayers.forEach((p, idx) => {
                        const score = this.tournament.scores[p.name] || 0;
                        const remaining = Math.max(0, this.tournament.targetPoints - score);
                        const isWin = (p.name === winner.name);
                        const manchePts = isWin ? 100 : (p.lastBlackCell || 0);
                        const medal = (idx === 0) ? '🥇' : (idx === 1) ? '🥈' : (idx === 2) ? '🥉' : `${idx + 1}`;
                        tableHtml += `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.08); ${isWin ? 'background:rgba(255,215,0,0.18); font-weight:bold;' : ''}">
                                <td style="padding:3px 4px;">${medal}</td>
                                <td style="padding:3px 4px; color:${p.color};">${p.name} ${p.isBot ? '🤖' : '👤'}</td>
                                <td style="padding:3px 4px; text-align:center; color:${isWin ? '#4ade80' : '#cbd5e1'}; font-weight:bold;">+${manchePts} pt ${isWin ? '🏁' : '⬛'}</td>
                                <td style="padding:3px 4px; text-align:right; color:#ffd700; font-weight:bold;">${score} pt</td>
                                <td style="padding:3px 4px; text-align:right; color:#94a3b8;">${remaining === 0 ? TXT.championBadge : remaining + ' pt'}</td>
                            </tr>
                        `;
                    });

                    tableHtml += `</tbody></table>`;
                    leaderboardBox.innerHTML = tableHtml;
                }
            } else {
                if (btnNextMatch) btnNextMatch.style.display = 'none';
                if (leaderboardBox) leaderboardBox.style.display = 'none';

                if (hasHuman && !isHumanWinner) {
                    if (modalMsg) modalMsg.textContent = TXT.singleLossTitle;
                    if (modalDetails) modalDetails.textContent = TXT.singleLossDetails.replace('%w', winner.name);
                    this.logEvent(TXT.singleLossLog.replace('%w', winner.name), 'warning');
                    SoundEngine.playMatchLoss();
                } else {
                    if (modalMsg) modalMsg.textContent = TXT.singleWinTitle.replace('%w', winner.name.toUpperCase());
                    if (modalDetails) modalDetails.textContent = TXT.singleWinDetails;
                    this.logEvent(TXT.singleWinLog.replace('%w', winner.name), 'success');
                    SoundEngine.playMatchWin();
                }
            }

            this.openModal('finepartita');
            this.updateHeaderUI();
            this.updateTurnUI();
        },

        updateDiceUI(d1, d2, isRollingAnim) {
            const dice1El = document.getElementById('dice1');
            const dice2El = document.getElementById('dice2');
            const resultText = document.getElementById('diceResultText');

            if (dice1El) dice1El.setAttribute('data-val', d1);
            if (dice2El) dice2El.setAttribute('data-val', d2);

            if (resultText) {
                resultText.textContent = isRollingAnim ? '...' : `${d1 + d2}`;
            }
        },

        updateHeaderUI() {
            const totalBox = document.getElementById('header-totale-punti');
            const blackBox = document.getElementById('header-casella-nera');

            const getShortName = (name) => {
                return name.replace(/Computer\s*/i, 'C').replace(/\s*\([GP]\d+\)/i, '').trim();
            };

            if (totalBox && this.players.length > 0) {
                const totalItems = this.players.map(p => {
                    const score = this.tournament.enabled ? (this.tournament.scores[p.name] || 0) : (p.score || 0);
                    const sName = getShortName(p.name);
                    return `<span class="player-score-chip" style="color: ${p.color};">
                        <span class="player-dot" style="background: ${p.color};"></span>${sName}: <b style="color: #0f172a;">${score}</b> pt
                    </span>`;
                }).join('<span style="color: rgba(0,0,0,0.22); margin: 0 2px;">|</span>');

                const prefix = this.tournament.enabled ? `<span style="color: #b45309; font-weight: bold; margin-right: 2px;">${TXT.headerMatchPrefix.replace('%m', this.tournament.currentMatch)}</span> ` : '';
                totalBox.innerHTML = prefix + totalItems;
            }

            if (blackBox && this.players.length > 0) {
                const blackItems = this.players.map(p => {
                    const blackVal = (p.lastBlackCell !== undefined) ? p.lastBlackCell : 0;
                    const sName = getShortName(p.name);
                    return `<span class="player-score-chip" style="color: ${p.color};">
                        <span class="player-dot" style="background: ${p.color};"></span>${sName}: <b style="color: #0f172a;">${blackVal}</b>
                    </span>`;
                }).join('<span style="color: rgba(0,0,0,0.22); margin: 0 2px;">|</span>');

                blackBox.innerHTML = `<span style="color: #475569; font-weight: bold; margin-right: 2px;">${TXT.headerLastBlack}</span> ` + blackItems;
            }
        },

        updateTurnUI() {
            const btnRoll = document.getElementById('btnRollDice');

            if (this.isGameOver) {
                if (btnRoll) {
                    btnRoll.disabled = false;
                    btnRoll.classList.remove('holding');
                    btnRoll.style.background = 'linear-gradient(135deg, #ca8a04, #a16207)';
                    btnRoll.style.borderColor = '#ffd700';
                    btnRoll.textContent = TXT.backToResultsBtn;
                }
                this.updateHeaderUI();
                this.updatePlayersUI();
                return;
            }

            if (btnRoll) {
                btnRoll.style.background = '';
                btnRoll.style.borderColor = '';
                const current = this.players[this.currentPlayerIdx];
                if (current.isBot && !this.autoPlay) {
                    btnRoll.disabled = true;
                    btnRoll.textContent = TXT.computerWaiting;
                } else {
                    btnRoll.disabled = this.isRolling || this.isMoving;
                    btnRoll.textContent = TXT.rollDiceBtn;
                }
            }

            this.updateHeaderUI();
            this.updatePlayersUI();
        },

        updatePlayersUI() {
            // Le pedine e le loro posizioni sono già visibili direttamente sul tabellone
        },

        logEvent(msg, styleClass = '') {
            const time = new Date().toLocaleTimeString();
            this.eventLogs.unshift({ msg, styleClass, time });

            // 1. Aggiorna la Cronaca in tempo reale nella barra inferiore a sinistra
            const miniLog = document.getElementById('miniCronacaBox');
            if (miniLog) {
                const item = document.createElement('div');
                item.className = `mini-cronaca-entry ${styleClass}`;
                item.innerHTML = msg;
                miniLog.prepend(item);

                // Mantieni al massimo gli ultimi 20 messaggi nel mini log
                while (miniLog.children.length > 20) {
                    miniLog.removeChild(miniLog.lastChild);
                }
            }

            // 2. Aggiorna il log completo nella modale Regole & Info
            const modalLog = document.getElementById('modalEventLog');
            if (modalLog) {
                const entry = document.createElement('div');
                entry.className = `log-entry ${styleClass}`;
                entry.innerHTML = `<span style="font-size:10px; color:#94a3b8; margin-right:4px;">[${time}]</span> ${msg}`;
                modalLog.prepend(entry);
            }
        },

        startRenderLoop() {
            const render = () => {
                this.draw();
                this.animationFrameId = requestAnimationFrame(render);
            };
            this.animationFrameId = requestAnimationFrame(render);
        },

        draw() {
            const ctx = this.ctx;
            const w = BOARD_WIDTH;
            const h = BOARD_HEIGHT;

            ctx.fillStyle = '#fbfbfa';
            ctx.fillRect(0, 0, w, h);

            this.drawGridBackground(ctx, w, h);
            this.drawFinishDistanceHistograms(ctx);
            this.drawAllTracks(ctx);
            this.drawJunctionArrows(ctx); // Frecce sottili a penna
            this.drawStartFinishMarkers(ctx);
            this.drawPlayers(ctx);
            this.drawFloatingSprites(ctx);
        },

        drawGridBackground(ctx, w, h) {
            ctx.lineWidth = 0.6;
            ctx.strokeStyle = 'rgba(70, 130, 230, 0.15)';

            for (let x = 0; x <= w; x += GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }

            for (let y = 0; y <= h; y += GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(70, 130, 230, 0.28)';
            for (let x = PAD_X; x <= w; x += CELL_PX) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = PAD_Y; y <= h; y += CELL_PX) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
        },

        drawAllTracks(ctx) {
            const allTrackIds = Object.keys(this.tracksData.tracks).filter(id => id !== 'main');
            allTrackIds.push('main');

            allTrackIds.forEach(trackId => {
                const track = this.tracksData.tracks[trackId];
                if (!track) return;
                const style = TRACK_COLORS[track.colorKey] || TRACK_COLORS.main;

                const isMain = (trackId === 'main');

                track.points.forEach((pt, idx) => {
                    const px = PAD_X + pt.bx * CELL_PX;
                    const py = PAD_Y + pt.by * CELL_PX;

                    // Ombra leggera sotto le caselle
                    ctx.fillStyle = isMain ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)';
                    ctx.fillRect(px + 2, py + 2, CELL_PX, CELL_PX);

                    // Sfondo delle caselle
                    ctx.fillStyle = style.light;
                    ctx.fillRect(px, py, CELL_PX, CELL_PX);

                    // Bordo marcato rafforzato
                    ctx.strokeStyle = isMain ? '#000000' : style.stroke;
                    ctx.lineWidth = isMain ? 3.4 : 2;
                    ctx.strokeRect(px + 0.5, py + 0.5, CELL_PX - 1, CELL_PX - 1);

                    // Numero della casella
                    ctx.fillStyle = style.stroke;
                    ctx.font = isMain ? 'bold 12px system-ui, sans-serif' : '600 11px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${idx}`, px + (CELL_PX / 2), py + (CELL_PX / 2));
                });
            });
        },

        // Helper per disegnare una freccia a penna con gambo solido e punta sottile
        drawLongCornerArrow(ctx, startX, startY, endX, endY, color) {
            const dx = endX - startX;
            const dy = endY - startY;
            const angle = Math.atan2(dy, dx);
            const headSize = 8;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // 1. Asta (gambo) della freccia - solida
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // 2. Punta a V della freccia - più sottile ed elegante
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(endX - headSize * Math.cos(angle - Math.PI / 5.5), endY - headSize * Math.sin(angle - Math.PI / 5.5));
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX - headSize * Math.cos(angle + Math.PI / 5.5), endY - headSize * Math.sin(angle + Math.PI / 5.5));
            ctx.stroke();

            ctx.restore();
        },

        // Disegno delle doppie frecce cicciottelle distanziate dai bordi e staccate tra loro
        drawJunctionArrows(ctx) {
            this.tracksData.junctions.forEach(j => {
                if (j.skipDrawing) return;
                const trackId = j.isConfluence ? j.onTrack : j.fromTrack;
                const stepIdx = j.isConfluence ? j.onStep : j.fromStep;
                const track = this.tracksData.tracks[trackId];
                if (!track) return;
                const pt = track.points[stepIdx];
                if (!pt) return;

                const px = PAD_X + pt.bx * CELL_PX;
                const py = PAD_Y + pt.by * CELL_PX;

                const branchStyle = TRACK_COLORS[j.branchColorKey] || TRACK_COLORS.green_short;
                const mainStyle = TRACK_COLORS[j.mainColorKey] || TRACK_COLORS.main;

                const mDir = j.mainArrowDir;
                const bDir = j.branchArrowDir;

                // Margine dai bordi della casella (10px) e gap tra le code delle frecce (6px)
                const m = 10;
                const gap = 6;
                const L = CELL_PX - m; // 35px

                // Definisci coordinate separate per freccia orizzontale e verticale
                function getArrowCoords(dir, corner) {
                    if (dir === 'right') {
                        const y = (corner.includes('T')) ? py + m : py + L;
                        return { sX: px + m + gap, sY: y, eX: px + L, eY: y };
                    } else if (dir === 'left') {
                        const y = (corner.includes('T')) ? py + m : py + L;
                        return { sX: px + L - gap, sY: y, eX: px + m, eY: y };
                    } else if (dir === 'down') {
                        const x = (corner.includes('L')) ? px + m : px + L;
                        return { sX: x, sY: py + m + gap, eX: x, eY: py + L };
                    } else if (dir === 'up') {
                        const x = (corner.includes('L')) ? px + m : px + L;
                        return { sX: x, sY: py + L - gap, eX: x, eY: py + m };
                    }
                }

                const dirs = [mDir, bDir];
                let corner = 'TL';

                if (dirs.includes('right') && dirs.includes('down')) {
                    corner = 'TL';
                } else if (dirs.includes('left') && dirs.includes('down')) {
                    corner = 'TR';
                } else if (dirs.includes('right') && dirs.includes('up')) {
                    corner = 'BL';
                } else if ((dirs.includes('left') && dirs.includes('up')) || (dirs.includes('up') && dirs.includes('left'))) {
                    corner = 'BR';
                } else if (dirs.includes('left') && dirs.includes('right')) {
                    // Confluenza opposta orizzontale
                    this.drawLongCornerArrow(ctx, px + m + gap, py + m, px + L, py + m, mainStyle.stroke);
                    this.drawLongCornerArrow(ctx, px + L - gap, py + L, px + m, py + L, branchStyle.stroke);
                    return;
                } else if (dirs.includes('up') && dirs.includes('down')) {
                    // Confluenza / bivio opposto verticale (es. Main 38 va su, ramo va giù)
                    const upX = px + m;
                    const downX = px + L;
                    const upCoords = { sX: upX, sY: py + L - gap, eX: upX, eY: py + m };
                    const downCoords = { sX: downX, sY: py + m + gap, eX: downX, eY: py + L };
                    const mCoords = (mDir === 'up') ? upCoords : downCoords;
                    const bCoords = (bDir === 'up') ? upCoords : downCoords;
                    this.drawLongCornerArrow(ctx, mCoords.sX, mCoords.sY, mCoords.eX, mCoords.eY, mainStyle.stroke);
                    this.drawLongCornerArrow(ctx, bCoords.sX, bCoords.sY, bCoords.eX, bCoords.eY, branchStyle.stroke);
                    return;
                }

                const mCoords = getArrowCoords(mDir, corner);
                const bCoords = getArrowCoords(bDir, corner);

                // Disegna le due frecce cicciottelle distanziate che NON si toccano
                this.drawLongCornerArrow(ctx, mCoords.sX, mCoords.sY, mCoords.eX, mCoords.eY, mainStyle.stroke);
                this.drawLongCornerArrow(ctx, bCoords.sX, bCoords.sY, bCoords.eX, bCoords.eY, branchStyle.stroke);
            });
        },

        drawStartFinishMarkers(ctx) {
            const mainTrack = this.tracksData.tracks['main'];
            if (mainTrack && mainTrack.points.length > 0) {
                // START
                const startPt = mainTrack.points[0];
                const sx = PAD_X + startPt.bx * CELL_PX;
                const sy = PAD_Y + startPt.by * CELL_PX;

                ctx.save();
                ctx.fillStyle = '#10b981';
                ctx.fillRect(sx, sy, CELL_PX, CELL_PX);
                ctx.strokeStyle = '#047857';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(sx, sy, CELL_PX, CELL_PX);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('START', sx + CELL_PX / 2, sy + CELL_PX / 2);
                ctx.restore();

                // FINISH
                const endPt = mainTrack.points[mainTrack.points.length - 1];
                const ex = PAD_X + endPt.bx * CELL_PX;
                const ey = PAD_Y + endPt.by * CELL_PX;

                ctx.save();
                const checkSize = CELL_PX / 3;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#f8fafc';
                        ctx.fillRect(ex + c * checkSize, ey + r * checkSize, checkSize, checkSize);
                    }
                }
                ctx.strokeStyle = '#e11d48';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(ex, ey, CELL_PX, CELL_PX);

                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('FINISH', ex + CELL_PX / 2, ey + CELL_PX / 2);
                ctx.restore();
            }
        },

        drawPlayers(ctx) {
            const cellGroups = {};
            this.players.forEach(p => {
                const key = `${p.trackId}_${p.stepIdx}`;
                if (!cellGroups[key]) cellGroups[key] = [];
                cellGroups[key].push(p);
            });

            this.players.forEach(p => {
                const targetPos = this.getCellCenterPx(p.trackId, p.stepIdx);
                const group = cellGroups[`${p.trackId}_${p.stepIdx}`] || [p];
                const groupIdx = group.indexOf(p);

                let offsetX = 0;
                let offsetY = 0;
                if (group.length > 1) {
                    const radiusOffset = 11;
                    const angleOffset = (groupIdx / group.length) * Math.PI * 2;
                    offsetX = Math.cos(angleOffset) * radiusOffset;
                    offsetY = Math.sin(angleOffset) * radiusOffset;
                }

                p.renderX += (targetPos.x + offsetX - p.renderX) * 0.25;
                p.renderY += (targetPos.y + offsetY - p.renderY) * 0.25;

                const x = p.renderX;
                const y = p.renderY;
                const radius = (group.length > 1) ? 12.5 : 14.5;

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 2;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                ctx.restore();

                // Indicatore di direzione di moto (freccia marcata e ben visibile sul bordo della pedina)
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(p.headingAngle);

                // Triangolo freccia direzionale sporgente
                ctx.beginPath();
                ctx.moveTo(radius + 9, 0);       // Punta freccia
                ctx.lineTo(radius - 1, -6.5);    // Ala superiore
                ctx.lineTo(radius + 2, 0);       // Rientro centrale
                ctx.lineTo(radius - 1, 6.5);     // Ala inferiore
                ctx.closePath();

                ctx.fillStyle = '#fbbf24';       // Giallo ambra vivo o bianco lucido
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;
                ctx.fill();

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#0f172a';
                ctx.stroke();
                ctx.restore();

                // Iniziale giocatore all'interno della pedina
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px sans-serif';
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 3;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.name.charAt(0).toUpperCase(), x, y);
                ctx.restore();
            });
        },

        floatingSprites: [],

        spawnStepDeltaSprite(trackId, stepIdx, delta) {
            if (delta === 0 || delta === undefined) return;
            const pos = this.getCellCenterPx(trackId, stepIdx);
            if (!this.floatingSprites) this.floatingSprites = [];
            const isGain = (delta > 0);
            // Segno invertito come richiesto (es. -18 per 18 passi risparmiati/guadagnati, +36 per trappola/allungatoia)
            const displayDelta = -delta;
            const sign = (displayDelta > 0) ? '+' : '';
            const stepWord = isEn ? (Math.abs(delta) === 1 ? 'step' : 'steps') : (Math.abs(delta) === 1 ? 'passo' : 'passi');
            const icon = isGain ? '⚡' : '⚠️';
            const text = `${icon} ${sign}${displayDelta} ${stepWord}`;

            this.floatingSprites.push({
                x: pos.x,
                y: pos.y,
                text: text,
                isGain: isGain,
                startTime: performance.now(),
                endTime: performance.now() + 2400
            });
        },

        drawFloatingSprites(ctx) {
            if (!this.floatingSprites || this.floatingSprites.length === 0) return;
            const now = performance.now();
            this.floatingSprites = this.floatingSprites.filter(s => now < s.endTime);

            this.floatingSprites.forEach(s => {
                const elapsed = now - s.startTime;
                const total = s.endTime - s.startTime;
                const progress = Math.min(1, elapsed / total);

                // Pop-in con lieve rimbalzo
                let scale = 1;
                if (progress < 0.12) {
                    scale = 0.4 + (progress / 0.12) * 0.75;
                } else if (progress < 0.22) {
                    scale = 1.15 - ((progress - 0.12) / 0.10) * 0.15;
                }

                // Dissolvenza finale nell'ultimo 25% del tempo
                let alpha = 1;
                if (progress > 0.75) {
                    alpha = 1 - (progress - 0.75) / 0.25;
                }

                // Fluttuazione verso l'alto
                const curY = s.y - (progress * 38);
                const curX = s.x;

                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.translate(curX, curY);
                ctx.scale(scale, scale);

                ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
                const metrics = ctx.measureText(s.text);
                const padX = 10;
                const badgeW = metrics.width + padX * 2;
                const badgeH = 24;
                const bx = -badgeW / 2;
                const by = -badgeH - 14;

                ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 3;

                // Corpo del badge con bordi arrotondati
                ctx.beginPath();
                const r = 12;
                if (ctx.roundRect) {
                    ctx.roundRect(bx, by, badgeW, badgeH, r);
                } else {
                    ctx.moveTo(bx + r, by);
                    ctx.arcTo(bx + badgeW, by, bx + badgeW, by + badgeH, r);
                    ctx.arcTo(bx + badgeW, by + badgeH, bx, by + badgeH, r);
                    ctx.arcTo(bx, by + badgeH, bx, by, r);
                    ctx.arcTo(bx, by, bx + badgeW, by, r);
                    ctx.closePath();
                }
                ctx.fillStyle = s.isGain ? '#15803d' : '#b91c1c';
                ctx.fill();

                ctx.lineWidth = 1.8;
                ctx.strokeStyle = s.isGain ? '#86efac' : '#fca5a5';
                ctx.stroke();

                // Freccia indicatrice a fumetto verso il basso
                ctx.beginPath();
                ctx.moveTo(-5, by + badgeH);
                ctx.lineTo(0, by + badgeH + 5);
                ctx.lineTo(5, by + badgeH);
                ctx.closePath();
                ctx.fillStyle = s.isGain ? '#15803d' : '#b91c1c';
                ctx.fill();

                // Testo con delta passi
                ctx.shadowColor = 'transparent';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.text, 0, by + badgeH / 2);

                ctx.restore();
            });
        },

        calculateStepsFromPosition(trackId, stepIdx, stepDir = 1, visited = new Set()) {
            if (trackId === 'main') {
                return Math.max(0, 99 - stepIdx);
            }
            const key = `${trackId}:${stepIdx}:${stepDir}`;
            if (visited.has(key)) return 99; // Evita eventuali cicli ricorsivi
            visited.add(key);

            const currentTrack = this.tracksData ? this.tracksData.tracks[trackId] : null;
            if (!currentTrack) return 99;

            let branchRemaining = 0;
            if (stepDir === 1) {
                branchRemaining = Math.max(0, currentTrack.points.length - 1 - stepIdx);
                if (currentTrack.confluence) {
                    const conf = currentTrack.confluence;
                    if (conf.targetTrack === 'main') {
                        return Math.max(0, branchRemaining + 1 + (99 - conf.targetStep));
                    } else {
                        // Ramo secondario (es. ponte corallo -> lime express)
                        const nextSteps = this.calculateStepsFromPosition(conf.targetTrack, conf.targetStep, conf.targetDir || 1, visited);
                        return Math.max(0, branchRemaining + 1 + nextSteps);
                    }
                }
            } else {
                // Percorso a ritroso (trappola)
                branchRemaining = Math.max(0, stepIdx);
                if (currentTrack.startConfluence) {
                    const conf = currentTrack.startConfluence;
                    if (conf.targetTrack === 'main') {
                        return Math.max(0, branchRemaining + 1 + (99 - conf.targetStep));
                    } else {
                        const nextSteps = this.calculateStepsFromPosition(conf.targetTrack, conf.targetStep, conf.targetDir || 1, visited);
                        return Math.max(0, branchRemaining + 1 + nextSteps);
                    }
                }
            }

            return 99;
        },

        getStepsToFinish(player) {
            if (player.isWinner || (player.trackId === 'main' && player.stepIdx >= 99)) return 0;

            // Se la pedina si trova su un bivio e ha già programmato la deviazione (nextBranch)
            if (player.nextBranch) {
                const stepsFromBranch = this.calculateStepsFromPosition(
                    player.nextBranch.toTrack,
                    player.nextBranch.toStep,
                    player.nextBranch.stepDir || 1
                );
                return Math.max(0, 1 + stepsFromBranch);
            }

            return this.calculateStepsFromPosition(player.trackId, player.stepIdx, player.stepDir || 1);
        },

        drawFinishDistanceHistograms(ctx) {
            if (!this.players || this.players.length === 0) return;

            const x = 15;
            const y = 604;
            const w = 310;
            const h = 88;
            const r = 6;

            ctx.save();

            // Sfondo card istogrammi
            ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
            ctx.fill();

            ctx.lineWidth = 1.2;
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();

            ctx.shadowColor = 'transparent';

            const n = this.players.length;
            const padX = 14;
            const padY = 12;
            const barX = x + padX;
            const barW = w - (padX * 2);
            const availH = h - (padY * 2);
            const rowHeight = availH / n;
            const barH = (n === 4) ? 10 : (n === 3 ? 12 : 14);

            this.players.forEach((p, idx) => {
                const rowY = y + padY + idx * rowHeight + (rowHeight / 2);
                const barY = rowY - barH / 2;
                const stepsLeft = this.getStepsToFinish(p);
                // La barra mostra quanti passi mancano al traguardo (a inizio mano è piena, man mano che si avanza si accorcia)
                const missingRatio = Math.max(0, Math.min(1, stepsLeft / 99));
                const fillW = missingRatio * barW;

                // 1. Sfondo tracciato barra
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(barX, barY, barW, barH, barH / 2);
                } else {
                    ctx.rect(barX, barY, barW, barH);
                }
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();

                // 2. Barra riempita (passi mancanti) col colore del giocatore
                if (fillW > 0) {
                    const cornerR = Math.min(barH / 2, fillW / 2);
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(barX, barY, fillW, barH, cornerR);
                    } else {
                        ctx.rect(barX, barY, fillW, barH);
                    }
                    ctx.fillStyle = p.color;
                    ctx.fill();
                }
            });

            ctx.restore();
        }
    };

    window.ScorciatoieGame = Game;

    function startApp() {
        if (typeof window.waitForInterstitial === 'function') {
            window.waitForInterstitial(() => Game.init());
        } else {
            Game.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }
})();
