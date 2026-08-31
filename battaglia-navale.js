/* ============================================================================
   BATTAGLIA NAVALE CLASSICA A 2 (vs Computer / 2 Giocatori) - Logica di Gioco
   lucianomanenti.com
   ============================================================================ */

(function () {
    'use strict';

    const isEn = (window.currentLang === 'en');

    // === DEFINIZIONE FLOTTA STANDARD (10 Navi, 20 Caselle) ===
    const FLEET_DEF = [
        { id: 'corazzata_1', name: isEn ? 'Battleship' : 'Corazzata', size: 4 },
        { id: 'incrociatore_1', name: isEn ? 'Cruiser 1' : 'Incrociatore 1', size: 3 },
        { id: 'incrociatore_2', name: isEn ? 'Cruiser 2' : 'Incrociatore 2', size: 3 },
        { id: 'caccia_1', name: isEn ? 'Destroyer 1' : 'Cacciatorpediniere 1', size: 2 },
        { id: 'caccia_2', name: isEn ? 'Destroyer 2' : 'Cacciatorpediniere 2', size: 2 },
        { id: 'caccia_3', name: isEn ? 'Destroyer 3' : 'Cacciatorpediniere 3', size: 2 },
        { id: 'sottomarino_1', name: isEn ? 'Submarine 1' : 'Sottomarino 1', size: 1 },
        { id: 'sottomarino_2', name: isEn ? 'Submarine 2' : 'Sottomarino 2', size: 1 },
        { id: 'sottomarino_3', name: isEn ? 'Submarine 3' : 'Sottomarino 3', size: 1 },
        { id: 'sottomarino_4', name: isEn ? 'Submarine 4' : 'Sottomarino 4', size: 1 }
    ];

    const GRID_SIZE = 10;
    const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    // === STATO DEL GIOCO ===
    let gameMode = 'ai'; // 'ai' o 'pvp'
    let aiDifficulty = 'medio'; // 'facile', 'medio', 'difficile'
    let gamePhase = 'placement'; // 'placement', 'battle', 'finished'
    let currentTurn = 'player'; // 'player' o 'opponent' (computer)

    // Griglia Giocatore: matrice 10x10 { shipId: null/string, hit: boolean, water: boolean }
    let playerGrid = [];
    let playerShips = []; // array delle navi posizionate con coordinate e stato

    // Griglia Nemico (Computer): matrice 10x10
    let opponentGrid = [];
    let opponentShips = [];

    // Stato piazzamento navi
    let selectedShipId = FLEET_DEF[0].id; // id della nave selezionata per il piazzamento
    let placementOrientation = 'H'; // 'H' (orizzontale) o 'V' (verticale)
    let lastHoverR = null;
    let lastHoverC = null;

    // Statistiche partita in corso
    let statsPartita = {
        playerShots: 0,
        playerHits: 0,
        opponentShots: 0,
        opponentHits: 0,
        startTime: null,
        endTime: null
    };

    // AI Memory & State (per Caccia / Ammiraglio)
    let aiHuntTarget = null; // primo colpo a segno della nave in corso di affondamento
    let aiLastHit = null;    // ultimo colpo a segno
    let aiHuntDirection = null; // 'N', 'S', 'E', 'W'
    let aiPendingTargets = []; // celle candidate da colpire

    // Audio & Suoni
    let audioEnabled = localStorage.getItem('navale2_audio') !== '0';
    let audioCtx = null;

    // Statistiche globali salvate
    let globalStats = {
        vinte: 0,
        perse: 0
    };

    // === INIZIALIZZAZIONE AUDIO WEB AUDIO API ===
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!audioEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (type === 'splash') {
                // Acqua / Colpo a vuoto: rumore filtrato a goccia/spruzzo
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (type === 'hit') {
                // Colpito: boom corto ed energico
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.36);
            } else if (type === 'sunk') {
                // Affondato: doppio accordo drammatico
                [160, 110, 75].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + (i * 0.12));
                    gain.gain.setValueAtTime(0.35, now + (i * 0.12));
                    gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.12) + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (i * 0.12));
                    osc.stop(now + (i * 0.12) + 0.45);
                });
            } else if (type === 'win') {
                // Vittoria: fanfara squillante
                const notes = [261.63, 329.63, 392.00, 523.25];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, now + (i * 0.14));
                    gain.gain.setValueAtTime(0.2, now + (i * 0.14));
                    gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.14) + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (i * 0.14));
                    osc.stop(now + (i * 0.14) + 0.4);
                });
            } else if (type === 'lose') {
                // Sconfitta: toni discendenti
                [300, 260, 220, 180].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + (i * 0.16));
                    gain.gain.setValueAtTime(0.25, now + (i * 0.16));
                    gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.16) + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (i * 0.16));
                    osc.stop(now + (i * 0.16) + 0.35);
                });
            }
        } catch (e) {
            console.error('Errore riproduzione audio:', e);
        }
    }

    // === CREAZIONE MATRICI VUOTE ===
    function createEmptyGrid() {
        const grid = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            grid[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                grid[r][c] = {
                    shipId: null,
                    hit: false,
                    water: false
                };
            }
        }
        return grid;
    }

    // === VALIDAZIONE POSIZIONAMENTO (Nessun contatto né orizzontale/verticale né diagonale) ===
    function canPlaceShip(grid, r, c, size, orientation) {
        for (let i = 0; i < size; i++) {
            const currR = orientation === 'H' ? r : r + i;
            const currC = orientation === 'H' ? c + i : c;

            // Fuori dai bordi
            if (currR < 0 || currR >= GRID_SIZE || currC < 0 || currC >= GRID_SIZE) {
                return false;
            }

            // Casella occupata o adiacente ad altra nave (tutti gli 8 vicini + casella stessa)
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = currR + dr;
                    const nc = currC + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                        if (grid[nr][nc].shipId !== null) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    function placeShipOnGrid(grid, shipsArray, shipDef, r, c, orientation) {
        const coords = [];
        for (let i = 0; i < shipDef.size; i++) {
            const currR = orientation === 'H' ? r : r + i;
            const currC = orientation === 'H' ? c + i : c;
            grid[currR][currC].shipId = shipDef.id;
            coords.push({ r: currR, c: currC });
        }
        shipsArray.push({
            id: shipDef.id,
            name: shipDef.name,
            size: shipDef.size,
            orientation: orientation,
            coords: coords,
            hits: 0,
            sunk: false
        });
    }

    // Generazione casuale flotta
    function placeRandomFleet(grid, shipsArray) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                grid[r][c].shipId = null;
                grid[r][c].hit = false;
                grid[r][c].water = false;
            }
        }
        shipsArray.length = 0;

        for (let i = 0; i < FLEET_DEF.length; i++) {
            const shipDef = FLEET_DEF[i];
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 1000) {
                attempts++;
                const orientation = Math.random() < 0.5 ? 'H' : 'V';
                const r = Math.floor(Math.random() * GRID_SIZE);
                const c = Math.floor(Math.random() * GRID_SIZE);

                if (canPlaceShip(grid, r, c, shipDef.size, orientation)) {
                    const coords = [];
                    for (let s = 0; s < shipDef.size; s++) {
                        const currR = orientation === 'H' ? r : r + s;
                        const currC = orientation === 'H' ? c + s : c;
                        grid[currR][currC].shipId = shipDef.id;
                        coords.push({ r: currR, c: currC });
                    }
                    shipsArray.push({
                        id: shipDef.id,
                        name: shipDef.name,
                        size: shipDef.size,
                        orientation: orientation,
                        coords: coords,
                        hits: 0,
                        sunk: false
                    });
                    placed = true;
                }
            }
        }
    }

    // === GENERAZIONE DOM DELLE GRIGLIE ===
    function toggleOrientation() {
        if (gamePhase !== 'placement') return;
        placementOrientation = placementOrientation === 'H' ? 'V' : 'H';
        updatePlacementUI();
        if (lastHoverR !== null && lastHoverC !== null) {
            onPlayerCellHover(lastHoverR, lastHoverC);
        }
    }

    function buildGridDOM(containerId, isPlayerGrid) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        if (isPlayerGrid) {
            container.oncontextmenu = (e) => {
                if (gamePhase === 'placement') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleOrientation();
                }
            };
            container.onmousedown = (e) => {
                if (gamePhase === 'placement' && e.button === 2) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleOrientation();
                }
            };
            container.onmouseleave = () => {
                lastHoverR = null;
                lastHoverC = null;
                onPlayerCellLeave();
            };
        }

        // Angolo in alto a sinistra vuoto
        const emptyCorner = document.createElement('div');
        emptyCorner.className = 'coord-cell';
        container.appendChild(emptyCorner);

        // Intestazioni Colonne (A-J)
        for (let c = 0; c < GRID_SIZE; c++) {
            const header = document.createElement('div');
            header.className = 'coord-cell';
            header.textContent = COLS[c];
            container.appendChild(header);
        }

        // Righe (1-10) con celle
        for (let r = 0; r < GRID_SIZE; r++) {
            const rowHeader = document.createElement('div');
            rowHeader.className = 'coord-cell';
            rowHeader.textContent = (r + 1).toString();
            container.appendChild(rowHeader);

            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'mare-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.id = `${isPlayerGrid ? 'p' : 'e'}_cell_${r}_${c}`;

                if (isPlayerGrid) {
                    cell.addEventListener('mouseenter', () => onPlayerCellHover(r, c));
                    cell.addEventListener('click', (e) => {
                        if (e.button === 0) onPlayerCellClick(r, c, e);
                    });
                    cell.addEventListener('contextmenu', (e) => {
                        if (gamePhase === 'placement') {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    });
                } else {
                    cell.addEventListener('click', () => onOpponentCellClick(r, c));
                }

                container.appendChild(cell);
            }
        }
    }

    // === UTILITY SCHIERAMENTO ===
    function getShipDef(id) {
        return FLEET_DEF.find(s => s.id === id);
    }

    function getUnplacedShipIds() {
        const placedIds = new Set(playerShips.map(s => s.id));
        return FLEET_DEF.filter(s => !placedIds.has(s.id)).map(s => s.id);
    }

    function selectShipForPlacement(shipId) {
        if (gamePhase !== 'placement') return;
        // Se la nave è già piazzata, la rimuoviamo prima per risposizionarla
        const isPlaced = playerShips.some(s => s.id === shipId);
        if (isPlaced) {
            removePlacedShip(shipId);
        } else {
            selectedShipId = shipId;
            updatePlacementUI();
            if (lastHoverR !== null && lastHoverC !== null) {
                onPlayerCellHover(lastHoverR, lastHoverC);
            }
        }
    }

    function removePlacedShip(shipId) {
        if (gamePhase !== 'placement') return;
        const ship = playerShips.find(s => s.id === shipId);
        if (!ship) return;
        ship.coords.forEach(pt => {
            playerGrid[pt.r][pt.c].shipId = null;
        });
        playerShips = playerShips.filter(s => s.id !== shipId);
        selectedShipId = shipId;
        playSound('splash');
        onPlayerCellLeave();
        updatePlacementUI();
    }

    // === LOGICA SCHIERAMENTO GIOCATORE ===
    function updatePlacementUI() {
        const infoEl = document.getElementById('info-posizionamento-testo');
        const btnAvvia = document.getElementById('btn-avvia-battaglia');
        const btnRuota = document.getElementById('btn-ruota-direzione');

        if (btnRuota) {
            btnRuota.textContent = isEn
                ? `Orientation: ${placementOrientation === 'H' ? 'Horizontal ➔' : 'Vertical ⬇'}`
                : `Orientamento: ${placementOrientation === 'H' ? 'Orizzontale ➔' : 'Verticale ⬇'}`;
        }

        const unplaced = getUnplacedShipIds();
        const numPiazzate = playerShips.length;

        if (numPiazzate < FLEET_DEF.length) {
            if (!selectedShipId || !unplaced.includes(selectedShipId)) {
                selectedShipId = unplaced[0];
            }
            const currentShip = getShipDef(selectedShipId);
            if (infoEl) {
                infoEl.innerHTML = isEn
                    ? `Place: <b style="color:#ffd700;">${currentShip.name}</b> (${currentShip.size} cell${currentShip.size === 1 ? '' : 's'})<br><span style="font-size:10px; color:#a8d5ba;">Deployed: ${numPiazzate}/10 &bull; Right-click or Space: rotate</span>`
                    : `Posiziona: <b style="color:#ffd700;">${currentShip.name}</b> (${currentShip.size} casell${currentShip.size === 1 ? 'a' : 'e'})<br><span style="font-size:10px; color:#a8d5ba;">Schierate: ${numPiazzate}/10 &bull; Click DX o Spazio: ruota</span>`;
            }
            if (btnAvvia) btnAvvia.disabled = true;
        } else {
            selectedShipId = null;
            if (infoEl) {
                infoEl.innerHTML = isEn
                    ? `<span style="color:#2ecc71; font-weight:bold;">All ships deployed (10/10)!</span><br><span style="font-size:10.5px; color:#cde8cd;">Click a ship to move it or start the battle.</span>`
                    : `<span style="color:#2ecc71; font-weight:bold;">Tutta la flotta è schierata (10/10)!</span><br><span style="font-size:10.5px; color:#cde8cd;">Clicca una nave per spostarla o avvia la battaglia.</span>`;
            }
            if (btnAvvia) btnAvvia.disabled = false;
        }

        renderPlayerGrid();
        renderFleetStatusList('lista-navi-player', playerShips, FLEET_DEF);
    }

    function onPlayerCellHover(r, c) {
        lastHoverR = r;
        lastHoverC = c;
        if (gamePhase !== 'placement') return;
        onPlayerCellLeave();

        const cell = playerGrid[r][c];
        // Se la cella ha già una nave, evidenziala tutta per indicare che si può cliccare per spostarla/rimuoverla
        if (cell.shipId !== null) {
            const ship = playerShips.find(s => s.id === cell.shipId);
            if (ship) {
                ship.coords.forEach(pt => {
                    const cellEl = document.getElementById(`p_cell_${pt.r}_${pt.c}`);
                    if (cellEl) cellEl.classList.add('preview-sposta');
                });
            }
            return;
        }

        if (!selectedShipId) return;
        const currentShip = getShipDef(selectedShipId);
        if (!currentShip) return;

        const isValid = canPlaceShip(playerGrid, r, c, currentShip.size, placementOrientation);

        for (let i = 0; i < currentShip.size; i++) {
            const currR = placementOrientation === 'H' ? r : r + i;
            const currC = placementOrientation === 'H' ? c + i : c;
            if (currR >= 0 && currR < GRID_SIZE && currC >= 0 && currC < GRID_SIZE) {
                const cellEl = document.getElementById(`p_cell_${currR}_${currC}`);
                if (cellEl) {
                    cellEl.classList.add(isValid ? 'preview-valida' : 'preview-invalida');
                }
            }
        }
    }

    function onPlayerCellLeave() {
        const previews = document.querySelectorAll('#griglia-giocatore .mare-cell');
        previews.forEach(cell => {
            cell.classList.remove('preview-valida', 'preview-invalida', 'preview-sposta');
        });
    }

    function onPlayerCellClick(r, c, e) {
        if (gamePhase !== 'placement') return;

        const cell = playerGrid[r][c];

        // 1. Se clicco su una casella già occupata, raccolgo/sposto quella nave
        if (cell.shipId !== null) {
            const clickedShipId = cell.shipId;
            removePlacedShip(clickedShipId);
            onPlayerCellHover(r, c);
            return;
        }

        // 2. Se sto piazzando una nave
        if (!selectedShipId) {
            const unplaced = getUnplacedShipIds();
            if (unplaced.length > 0) selectedShipId = unplaced[0];
            else return;
        }

        const currentShip = getShipDef(selectedShipId);
        if (!currentShip) return;

        if (canPlaceShip(playerGrid, r, c, currentShip.size, placementOrientation)) {
            const coords = [];
            for (let i = 0; i < currentShip.size; i++) {
                const currR = placementOrientation === 'H' ? r : r + i;
                const currC = placementOrientation === 'H' ? c + i : c;
                playerGrid[currR][currC].shipId = currentShip.id;
                coords.push({ r: currR, c: currC });
            }
            playerShips.push({
                id: currentShip.id,
                name: currentShip.name,
                size: currentShip.size,
                orientation: placementOrientation,
                coords: coords,
                hits: 0,
                sunk: false
            });

            // Seleziona automaticamente la prossima nave da piazzare
            const remaining = getUnplacedShipIds();
            selectedShipId = remaining.length > 0 ? remaining[0] : null;

            playSound('splash');
            onPlayerCellLeave();
            updatePlacementUI();

            if (selectedShipId) {
                onPlayerCellHover(r, c);
            }
        }
    }

    function azzeraSchieramento() {
        playerGrid = createEmptyGrid();
        playerShips = [];
        selectedShipId = FLEET_DEF[0].id;
        onPlayerCellLeave();
        updatePlacementUI();
    }

    function schieraCasualeGiocatore() {
        playerGrid = createEmptyGrid();
        playerShips = [];
        placeRandomFleet(playerGrid, playerShips);
        selectedShipId = null;
        onPlayerCellLeave();
        updatePlacementUI();
    }

    // === RENDERING GRIGLIE ===
    function renderPlayerGrid() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cellEl = document.getElementById(`p_cell_${r}_${c}`);
                if (!cellEl) continue;

                const cellData = playerGrid[r][c];
                cellEl.className = 'mare-cell';

                if (cellData.shipId !== null) {
                    cellEl.classList.add('occupata-nave');
                    if (gamePhase === 'placement') {
                        cellEl.title = 'Clicca per spostare o rimuovere questa nave';
                    } else {
                        cellEl.removeAttribute('title');
                    }
                }
                if (cellData.water) {
                    cellEl.classList.add('esito-acqua');
                }
                if (cellData.hit) {
                    // Controlla se la nave è affondata
                    const ship = playerShips.find(s => s.id === cellData.shipId);
                    if (ship && ship.sunk) {
                        cellEl.classList.add('esito-affondato');
                    } else {
                        cellEl.classList.add('esito-colpito');
                    }
                }
            }
        }
    }

    function renderOpponentGrid() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cellEl = document.getElementById(`e_cell_${r}_${c}`);
                if (!cellEl) continue;

                const cellData = opponentGrid[r][c];
                cellEl.className = 'mare-cell';

                if (gamePhase === 'battle' && currentTurn === 'player' && !cellData.hit && !cellData.water) {
                    cellEl.classList.add('bersaglio-attivo');
                }

                if (cellData.water) {
                    cellEl.classList.add('esito-acqua');
                }
                if (cellData.hit) {
                    const ship = opponentShips.find(s => s.id === cellData.shipId);
                    if (ship && ship.sunk) {
                        cellEl.classList.add('esito-affondato');
                    } else {
                        cellEl.classList.add('esito-colpito');
                    }
                }
            }
        }
    }

    function renderFleetStatusList(containerId, shipsArray, fleetDef) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const isPlayerContainer = containerId === 'lista-navi-player';

        fleetDef.forEach(def => {
            const ship = shipsArray.find(s => s.id === def.id);
            const isPlaced = Boolean(ship);
            const isCurrentSelected = isPlayerContainer && gamePhase === 'placement' && selectedShipId === def.id;

            const tag = document.createElement('div');
            tag.className = 'nave-tag';

            if (gamePhase === 'battle') {
                if (ship && ship.sunk) tag.classList.add('affondata');
            } else if (gamePhase === 'placement' && isPlayerContainer) {
                if (isPlaced) {
                    tag.classList.add('piazzata');
                    tag.title = isEn ? 'Ship placed. Click to remove or move' : 'Nave piazzata. Clicca per rimuoverla o spostarla';
                    tag.onclick = (e) => {
                        e.stopPropagation();
                        removePlacedShip(def.id);
                    };
                } else if (isCurrentSelected) {
                    tag.classList.add('in-posizionamento');
                    tag.title = isEn ? 'Ship currently selected for placement' : 'Nave attualmente selezionata per il piazzamento';
                } else {
                    tag.classList.add('da-piazzare');
                    tag.title = isEn ? 'Click to select this ship for placement' : 'Clicca per selezionare questa nave da posizionare';
                    tag.onclick = (e) => {
                        e.stopPropagation();
                        selectShipForPlacement(def.id);
                    };
                }
            }

            const puntiBox = document.createElement('div');
            puntiBox.className = 'nave-tag-punti';
            for (let p = 0; p < def.size; p++) {
                const punto = document.createElement('div');
                punto.className = 'punto-nave';
                puntiBox.appendChild(punto);
            }

            tag.appendChild(puntiBox);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'nave-tag-nome';
            nameSpan.textContent = def.name;
            tag.appendChild(nameSpan);

            // Icona di stato o tasto rimozione
            if (gamePhase === 'placement' && isPlayerContainer) {
                if (isPlaced) {
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'nave-tag-rimuovi';
                    removeBtn.innerHTML = ' &times;';
                    removeBtn.title = isEn ? 'Remove' : 'Rimuovi';
                    tag.appendChild(removeBtn);
                } else if (isCurrentSelected) {
                    const selBadge = document.createElement('span');
                    selBadge.className = 'nave-tag-sel-badge';
                    selBadge.textContent = ' ➔';
                    tag.appendChild(selBadge);
                }
            }

            container.appendChild(tag);
        });
    }

    // === AVVIO DELLA BATTAGLIA ===
    function avviaBattaglia() {
        if (playerShips.length < FLEET_DEF.length) return;

        gamePhase = 'battle';
        currentTurn = 'player';

        // Prepara flotta nemica (Computer)
        opponentGrid = createEmptyGrid();
        opponentShips = [];
        placeRandomFleet(opponentGrid, opponentShips);

        // Resetta AI memory
        aiHuntTarget = null;
        aiLastHit = null;
        aiHuntDirection = null;
        aiPendingTargets = [];

        // Resetta statistiche
        statsPartita = {
            playerShots: 0,
            playerHits: 0,
            opponentShots: 0,
            opponentHits: 0,
            startTime: Date.now(),
            endTime: null
        };

        // Aggiorna UI
        document.getElementById('pannello-schieramento').style.display = 'none';
        document.getElementById('pannello-battaglia-attiva').style.display = 'flex';
        setMessaggioStato(isEn
            ? 'The battle has begun! It\'s your turn: fire on the Enemy Radar.'
            : 'La battaglia ha inizio! È il tuo turno: fai fuoco sul Radar Nemico.');
        aggiornaTurnoUI();

        renderPlayerGrid();
        renderOpponentGrid();
        renderFleetStatusList('lista-navi-enemy', opponentShips, FLEET_DEF);
    }

    function setMessaggioStato(msg) {
        const el = document.getElementById('messaggio-stato');
        if (el) el.innerHTML = msg;
    }

    function aggiungiLog(msg) {
        const logBox = document.getElementById('log-tiri');
        if (!logBox) return;
        const riga = document.createElement('div');
        riga.innerHTML = msg;
        logBox.prepend(riga);
    }

    function aggiornaTurnoUI() {
        const boxTurno = document.getElementById('box-turno-stato');
        if (!boxTurno) return;

        if (currentTurn === 'player') {
            boxTurno.className = 'box-turno-corrente turno-tuo';
            boxTurno.textContent = isEn ? '🎯 YOUR TURN TO FIRE' : '🎯 TUO TURNO DI TIRO';
        } else {
            boxTurno.className = 'box-turno-corrente turno-nemico';
            boxTurno.textContent = isEn ? '⏳ COMPUTER\'S TURN...' : '⏳ TURNO DEL COMPUTER...';
        }
    }

    // === TIRO DEL GIOCATORE ===
    function onOpponentCellClick(r, c) {
        if (gamePhase !== 'battle' || currentTurn !== 'player') return;

        const cell = opponentGrid[r][c];
        if (cell.hit || cell.water) return; // Già sparato qui

        statsPartita.playerShots++;
        const coordName = `${COLS[c]}-${r + 1}`;

        if (cell.shipId !== null) {
            // COLPITO
            cell.hit = true;
            statsPartita.playerHits++;
            const ship = opponentShips.find(s => s.id === cell.shipId);
            ship.hits++;

            if (ship.hits >= ship.size) {
                // AFFONDATO
                ship.sunk = true;
                playSound('sunk');
                setMessaggioStato(isEn
                    ? `🔥 <b style="color:#ffd700;">SUNK!</b> You destroyed the enemy <b>${ship.name}</b> at ${coordName}!`
                    : `🔥 <b style="color:#ffd700;">AFFONDATO!</b> Hai distrutto la <b>${ship.name}</b> nemica in ${coordName}!`);
                aggiungiLog(isEn
                    ? `🎯 <span style="color:#ffd700;">Sunk ${ship.name}</span> (${coordName})`
                    : `🎯 <span style="color:#ffd700;">Affondata ${ship.name}</span> in ${coordName}!`);
                
                // Segna l'acqua attorno alla nave affondata
                marcaAcquaAttornoNave(opponentGrid, ship);

                // Controlla se la flotta nemica è distrutta
                if (opponentShips.every(s => s.sunk)) {
                    concludiPartita(true);
                    return;
                }
            } else {
                playSound('hit');
                setMessaggioStato(isEn
                    ? `💥 <b style="color:#2ecc71;">HIT!</b> Target struck at ${coordName}. Fire again!`
                    : `💥 <b style="color:#2ecc71;">COLPITO!</b> Bersaglio centrato in ${coordName}. Spara ancora!`);
                aggiungiLog(isEn
                    ? `💥 <span style="color:#2ecc71;">Hit</span> at ${coordName}`
                    : `💥 <span style="color:#2ecc71;">Colpito</span> in ${coordName}`);
            }

            renderOpponentGrid();
            renderFleetStatusList('lista-navi-enemy', opponentShips, FLEET_DEF);
            // Il giocatore spara di nuovo!
        } else {
            // ACQUA
            cell.water = true;
            playSound('splash');
            setMessaggioStato(isEn
                ? `💧 <b>Missed (water)</b> at ${coordName}. Computer's turn.`
                : `💧 <b>Acqua</b> in ${coordName}. Turno al Computer.`);
            aggiungiLog(isEn
                ? `💧 Water at ${coordName}`
                : `💧 Acqua in ${coordName}`);
            renderOpponentGrid();

            // Passa il turno al computer
            currentTurn = 'opponent';
            aggiornaTurnoUI();
            setTimeout(eseguiTurnoComputer, 900);
        }
    }

    // Circonda una nave affondata con caselle d'acqua (regola standard)
    function marcaAcquaAttornoNave(grid, ship) {
        ship.coords.forEach(pt => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = pt.r + dr;
                    const nc = pt.c + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                        if (grid[nr][nc].shipId === null) {
                            grid[nr][nc].water = true;
                        }
                    }
                }
            }
        });
    }

    // === INTELLIGENZA ARTIFICIALE DEL COMPUTER ===
    function getAvailableCells(grid) {
        const list = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!grid[r][c].hit && !grid[r][c].water) {
                    list.push({ r, c });
                }
            }
        }
        return list;
    }

    function eseguiTurnoComputer() {
        if (gamePhase !== 'battle' || currentTurn !== 'opponent') return;

        let target = null;

        if (aiDifficulty === 'facile') {
            // Tiri puramente casuali
            const avail = getAvailableCells(playerGrid);
            if (avail.length > 0) {
                target = avail[Math.floor(Math.random() * avail.length)];
            }
        } else if (aiDifficulty === 'medio') {
            // Caccia basilare
            target = getAiTargetMedio();
        } else {
            // Difficile / Ammiraglio: Scacchiera + Probabilità + Caccia mirata
            target = getAiTargetDifficile();
        }

        if (!target) {
            const avail = getAvailableCells(playerGrid);
            if (avail.length > 0) target = avail[Math.floor(Math.random() * avail.length)];
            else return;
        }

        const r = target.r;
        const c = target.c;
        const cell = playerGrid[r][c];
        statsPartita.opponentShots++;
        const coordName = `${COLS[c]}-${r + 1}`;

        if (cell.shipId !== null) {
            // Computer COLPISCE
            cell.hit = true;
            statsPartita.opponentHits++;
            const ship = playerShips.find(s => s.id === cell.shipId);
            ship.hits++;

            if (ship.hits >= ship.size) {
                // Nave affondata
                ship.sunk = true;
                playSound('sunk');
                setMessaggioStato(isEn
                    ? `🚨 The computer <b style="color:#ff4757;">SUNK</b> your <b>${ship.name}</b> at ${coordName}!`
                    : `🚨 Il computer ha <b>AFFONDATO</b> la tua <b>${ship.name}</b> in ${coordName}!`);
                aggiungiLog(isEn
                    ? `🚨 <span style="color:#ff4757;">Enemy sunk your ${ship.name}</span> (${coordName})`
                    : `🚨 <span style="color:#ff4757;">Affondata tua ${ship.name}</span> (${coordName})`);

                marcaAcquaAttornoNave(playerGrid, ship);
                aiHuntTarget = null;
                aiLastHit = null;
                aiPendingTargets = [];

                if (playerShips.every(s => s.sunk)) {
                    concludiPartita(false);
                    return;
                }
            } else {
                playSound('hit');
                setMessaggioStato(isEn
                    ? `⚠️ The computer <b style="color:#ff6b81;">HIT</b> at ${coordName}! Firing again...`
                    : `⚠️ Il computer ha <b style="color:#ff6b81;">COLPITO</b> in ${coordName}! Spara ancora...`);
                aggiungiLog(isEn
                    ? `⚠️ <span style="color:#ff6b81;">Enemy hit</span> at ${coordName}`
                    : `⚠️ <span style="color:#ff6b81;">Nemico ha colpito</span> in ${coordName}`);
                aiLastHit = { r, c };
                if (!aiHuntTarget) aiHuntTarget = { r, c };
            }

            renderPlayerGrid();
            renderFleetStatusList('lista-navi-player', playerShips, FLEET_DEF);
            // Il computer tira ancora se ha colpito
            setTimeout(eseguiTurnoComputer, 1000);
        } else {
            // Computer fa ACQUA
            cell.water = true;
            playSound('splash');
            setMessaggioStato(isEn
                ? `🛡️ Enemy shot at ${coordName} missed (<b>water</b>). Your turn!`
                : `🛡️ Il colpo nemico in ${coordName} è finito in <b>acqua</b>. Tocca a te!`);
            aggiungiLog(isEn
                ? `🛡️ Enemy missed (${coordName})`
                : `🛡️ Nemico in acqua (${coordName})`);
            renderPlayerGrid();

            currentTurn = 'player';
            aggiornaTurnoUI();
            renderOpponentGrid();
        }
    }

    // Trova tutte le caselle colpite appartenenti a navi NON ancora affondate
    function getColpiNaviNonAffondate() {
        const hits = [];
        playerShips.forEach(ship => {
            if (!ship.sunk && ship.hits > 0) {
                ship.coords.forEach(coord => {
                    if (playerGrid[coord.r][coord.c].hit) {
                        hits.push({ r: coord.r, c: coord.c, shipId: ship.id });
                    }
                });
            }
        });
        return hits;
    }

    // Strategia di Caccia: bersaglia sistematicamente e finisce ogni nave colpita
    function trovaBersaglioCaccia() {
        const hits = getColpiNaviNonAffondate();
        if (hits.length === 0) return null;

        // Raggruppa i colpi per singola nave ferita
        const hitsByShip = {};
        hits.forEach(h => {
            if (!hitsByShip[h.shipId]) hitsByShip[h.shipId] = [];
            hitsByShip[h.shipId].push(h);
        });

        for (const shipId in hitsByShip) {
            const shipHits = hitsByShip[shipId];

            // Se la nave ha 2 o più colpi a segno, l'orientamento è certo
            if (shipHits.length >= 2) {
                const rows = shipHits.map(h => h.r);
                const cols = shipHits.map(h => h.c);
                const isHoriz = rows.every(r => r === rows[0]);
                const isVert = cols.every(c => c === cols[0]);

                if (isHoriz) {
                    const r = rows[0];
                    const minC = Math.min(...cols);
                    const maxC = Math.max(...cols);
                    const lineCandidates = [
                        { r, c: minC - 1 },
                        { r, c: maxC + 1 }
                    ].filter(p => p.c >= 0 && p.c < GRID_SIZE && !playerGrid[p.r][p.c].hit && !playerGrid[p.r][p.c].water);

                    if (lineCandidates.length > 0) {
                        return lineCandidates[Math.floor(Math.random() * lineCandidates.length)];
                    }
                } else if (isVert) {
                    const c = cols[0];
                    const minR = Math.min(...rows);
                    const maxR = Math.max(...rows);
                    const lineCandidates = [
                        { r: minR - 1, c },
                        { r: maxR + 1, c }
                    ].filter(p => p.r >= 0 && p.r < GRID_SIZE && !playerGrid[p.r][p.c].hit && !playerGrid[p.r][p.c].water);

                    if (lineCandidates.length > 0) {
                        return lineCandidates[Math.floor(Math.random() * lineCandidates.length)];
                    }
                }
            }

            // Altrimenti prova i 4 vicini adiacenti delle celle colpite di questa nave
            const neighbors = [];
            shipHits.forEach(h => {
                const adj = [
                    { r: h.r - 1, c: h.c },
                    { r: h.r + 1, c: h.c },
                    { r: h.r, c: h.c - 1 },
                    { r: h.r, c: h.c + 1 }
                ].filter(p => p.r >= 0 && p.r < GRID_SIZE && p.c >= 0 && p.c < GRID_SIZE && !playerGrid[p.r][p.c].hit && !playerGrid[p.r][p.c].water);

                adj.forEach(p => {
                    if (!neighbors.some(n => n.r === p.r && n.c === p.c)) {
                        neighbors.push(p);
                    }
                });
            });

            if (neighbors.length > 0) {
                return neighbors[Math.floor(Math.random() * neighbors.length)];
            }
        }

        return null;
    }

    // AI Medio (Capitano): Caccia rigorosa per affondare le navi colpite
    function getAiTargetMedio() {
        const hunt = trovaBersaglioCaccia();
        if (hunt) return hunt;

        const avail = getAvailableCells(playerGrid);
        return avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : null;
    }

    // AI Difficile (Ammiraglio): Caccia rigorosa + ricerca a scacchiera (parità)
    function getAiTargetDifficile() {
        const hunt = trovaBersaglioCaccia();
        if (hunt) return hunt;

        // Strategia Parità / Scacchiera (Checkerboard) per scovare le navi rimanenti
        const avail = getAvailableCells(playerGrid);
        const parityCells = avail.filter(p => (p.r + p.c) % 2 === 0);
        if (parityCells.length > 0) {
            return parityCells[Math.floor(Math.random() * parityCells.length)];
        }
        return avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : null;
    }

    // === FINE PARTITA (Vittoria / Sconfitta) ===
    function concludiPartita(isPlayerWinner) {
        gamePhase = 'finished';
        statsPartita.endTime = Date.now();

        if (isPlayerWinner) {
            globalStats.vinte++;
            playSound('win');
        } else {
            globalStats.perse++;
            playSound('lose');
        }
        salvaStatistiche();

        const durataSec = Math.round((statsPartita.endTime - statsPartita.startTime) / 1000);
        const min = Math.floor(durataSec / 60);
        const sec = durataSec % 60;
        const tempoStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        const precisione = statsPartita.playerShots > 0 ? Math.round((statsPartita.playerHits / statsPartita.playerShots) * 100) : 0;

        const msgTitolo = isPlayerWinner
            ? (isEn ? '🏆 VICTORY! ENEMY FLEET DESTROYED!' : '🏆 VITTORIA! FLOTTA NEMICA DISTRUTTA!')
            : (isEn ? '💥 DEFEAT! YOUR FLEET HAS SUNK!' : '💥 SCONFITTA! LA TUA FLOTTA È AFFONDATA!');
        const modaleVittoria = document.getElementById('haivinto');
        const titEl = document.getElementById('vittoria-messaggio');
        const detEl = document.getElementById('vittoria-dettagli');

        if (titEl) titEl.innerHTML = msgTitolo;
        if (detEl) {
            detEl.innerHTML = isEn
                ? `Time: ${tempoStr} &mdash; Shots fired: ${statsPartita.playerShots} &mdash; Accuracy: ${precisione}%`
                : `Tempo: ${tempoStr} &mdash; Colpi sparati: ${statsPartita.playerShots} &mdash; Precisione: ${precisione}%`;
        }

        document.getElementById('schermo').style.display = 'block';
        if (modaleVittoria) {
            modaleVittoria.style.display = 'flex';
            if (typeof setupAmazonFinishBanner === 'function') {
                setupAmazonFinishBanner('haivinto', {
                    modalStyle: { overflow: 'visible' },
                    targetTop: 430,
                    applyModalTop: false,
                    bannerHeight: 300,
                    bannerTopOffset: 325,
                    leftOffset: 0
                });
            }
        }
    }

    // === GESTIONE STATISTICHE LOCALI ===
    function caricaStatistiche() {
        try {
            const savedDiff = localStorage.getItem('navale2_diff');
            if (savedDiff && ['facile', 'medio', 'difficile'].includes(savedDiff)) {
                aiDifficulty = savedDiff;
                if (typeof window.selezionaDifficolta === 'function') {
                    window.selezionaDifficolta(savedDiff);
                }
            }
            const saved = localStorage.getItem('navale2_stats');
            if (saved) {
                globalStats = JSON.parse(saved);
            }
        } catch (e) {}
        aggiornaStatsTop();
    }

    function salvaStatistiche() {
        try {
            localStorage.setItem('navale2_stats', JSON.stringify(globalStats));
        } catch (e) {}
        aggiornaStatsTop();
    }

    function aggiornaStatsTop() {
        const vEl = document.getElementById('stat-vinte');
        const pEl = document.getElementById('stat-perse');
        if (vEl) vEl.textContent = globalStats.vinte;
        if (pEl) pEl.textContent = globalStats.perse;
    }

    // === GESTIONE MODALI E CONFIGURAZIONE INIZIALE ===
    function apriModaleInizio() {
        document.getElementById('schermo').style.display = 'block';
        document.getElementById('modale-inizio').style.display = 'flex';
    }

    function chiudiModaleInizio() {
        document.getElementById('schermo').style.display = 'none';
        document.getElementById('modale-inizio').style.display = 'none';
    }

    window.selezionaDifficolta = function (diff) {
        aiDifficulty = diff;
        try {
            localStorage.setItem('navale2_diff', diff);
        } catch (e) {}
        ['facile', 'medio', 'difficile'].forEach(d => {
            const btn = document.getElementById(`btn-diff-${d}`);
            if (btn) {
                if (d === diff) btn.classList.add('attiva');
                else btn.classList.remove('attiva');
            }
        });
    };

    window.confermaEAvviaPartita = function () {
        chiudiModaleInizio();
        nuovaPartita();
    };

    function nuovaPartita() {
        gamePhase = 'placement';
        selectedShipId = FLEET_DEF[0].id;
        placementOrientation = 'H';
        playerGrid = createEmptyGrid();
        playerShips = [];
        opponentGrid = createEmptyGrid();
        opponentShips = [];

        document.getElementById('haivinto').style.display = 'none';
        document.getElementById('confermatermina').style.display = 'none';
        document.getElementById('schermo').style.display = 'none';
        document.getElementById('pannello-schieramento').style.display = 'flex';
        document.getElementById('pannello-battaglia-attiva').style.display = 'none';

        const logBox = document.getElementById('log-tiri');
        if (logBox) logBox.innerHTML = '';

        setMessaggioStato('Fase di Schieramento: posiziona le tue 10 navi sulla griglia o premi "Disponi a caso".');
        buildGridDOM('griglia-giocatore', true);
        buildGridDOM('griglia-nemica', false);
        updatePlacementUI();
    }

    // === RIQUADRO AFFILIATI ROTANTE (COME CALCOLO ENIGMATICO) ===
    function avviaBannerRotante() {
        if (typeof setupRotatingAffiliateBanner === 'function') {
            const boxAff = document.getElementById('banner-rotante');
            if (boxAff) {
                setupRotatingAffiliateBanner(boxAff, { intervalMs: 60000 });
            }
        }
    }

    // === BINDING EVENTI INTERFACCIA ===
    document.addEventListener('DOMContentLoaded', () => {
        caricaStatistiche();

        // Bottone Audio
        const btnAudio = document.getElementById('btn-audio');
        if (btnAudio) {
            if (!audioEnabled) btnAudio.classList.add('muted');
            btnAudio.addEventListener('click', () => {
                audioEnabled = !audioEnabled;
                localStorage.setItem('navale2_audio', audioEnabled ? '1' : '0');
                btnAudio.classList.toggle('muted', !audioEnabled);
                if (audioEnabled) playSound('splash');
            });
        }

        // Tasti Schieramento
        const btnRuota = document.getElementById('btn-ruota-direzione');
        if (btnRuota) {
            btnRuota.addEventListener('click', toggleOrientation);
        }

        // Shortcut tastiera: Spazio o R per ruotare nave
        window.addEventListener('keydown', (e) => {
            if (gamePhase === 'placement' && (e.key === ' ' || e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                toggleOrientation();
            }
        });

        const btnAzzera = document.getElementById('btn-azzera-flotta');
        if (btnAzzera) btnAzzera.addEventListener('click', azzeraSchieramento);

        const btnCasuale = document.getElementById('btn-casuale-flotta');
        if (btnCasuale) btnCasuale.addEventListener('click', schieraCasualeGiocatore);

        const btnAvvia = document.getElementById('btn-avvia-battaglia');
        if (btnAvvia) btnAvvia.addEventListener('click', avviaBattaglia);

        // Tasto Nuova Partita
        const btnNuova = document.getElementById('btn-nuova-partita-side');
        if (btnNuova) {
            btnNuova.addEventListener('click', () => {
                if (gamePhase === 'battle') {
                    document.getElementById('schermo').style.display = 'block';
                    document.getElementById('confermatermina').style.display = 'flex';
                    if (typeof setupAmazonFinishBanner === 'function') {
                        setupAmazonFinishBanner('confermatermina', {
                            modalStyle: { overflow: 'visible' },
                            targetTop: 470,
                            applyModalTop: false,
                            bannerHeight: 300,
                            bannerTopOffset: 325,
                            leftOffset: 0
                        });
                    }
                } else {
                    apriModaleInizio();
                }
            });
        }

        const btnSiTermina = document.getElementById('btn-si-termina');
        if (btnSiTermina) {
            btnSiTermina.addEventListener('click', () => {
                location.reload();
            });
        }

        const btnNoContinua = document.getElementById('btn-no-continua');
        if (btnNoContinua) {
            btnNoContinua.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('confermatermina').style.display = 'none';
                document.getElementById('schermo').style.display = 'none';
            });
        }

        const btnVediSchema = document.getElementById('btn-vedi-schema');
        if (btnVediSchema) {
            btnVediSchema.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('haivinto').style.display = 'none';
                document.getElementById('schermo').style.display = 'none';
            });
        }

        avviaBannerRotante();
        apriModaleInizio();
    });

})();
