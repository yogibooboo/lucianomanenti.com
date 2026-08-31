/* ============================================================================
   MAHJONG SOLITARIO (SHANGHAI) - Motore di Gioco Completo & Web Audio
   lucianomanenti.com
   ============================================================================ */

(function () {
    'use strict';

    const isEn = (window.currentLang === 'en');

    // === TRADUZIONI & TESTI ===
    const TXT = {
        turtle: isEn ? 'The Turtle' : 'La Tartaruga',
        pyramid: isEn ? 'Pyramid' : 'Piramide',
        castle: isEn ? 'Fortress' : 'Fortezza',
        arena: isEn ? 'Arena' : 'Arena',
        pairsLeft: isEn ? 'Pairs Available' : 'Coppie Disponibili',
        tilesLeft: isEn ? 'Tiles Left' : 'Tessere Rimaste',
        time: isEn ? 'Time' : 'Tempo',
        score: isEn ? 'Score' : 'Punteggio',
        noMoves: isEn ? 'No more available moves! Shuffle or Undo.' : 'Nessuna mossa disponibile! Rimescola o Annulla.',
        shuffled: isEn ? 'Board shuffled!' : 'Tavolo rimescolato!',
        victoryTitle: isEn ? 'VICTORY! BOARD CLEARED!' : 'VITTORIA! TAVOLO COMPLETATO!',
        victoryMsg: isEn ? 'Congratulations! You cleared all 144 tiles.' : 'Complimenti! Hai rimosso tutte le 144 tessere.',
        newGameConfirm: isEn ? 'Do you want to start a new game?' : 'Vuoi iniziare una nuova partita?'
    };

    // === DEFINIZIONE TESSERE & SEMI (144 Tessere in totale) ===
    // 3 Semi Numerici (1-9 x 4 cad.) = 108
    // Venti (4 x 4) = 16
    // Draghi (3 x 4) = 12
    // Fiori (4 x 1) = 4
    // Stagioni (4 x 1) = 4
    // Totale = 144 tessere (72 coppie)

    const TILE_DEFS = [];

    // 1. Cerchi / Pallini (Dots - Pin)
    for (let i = 1; i <= 9; i++) {
        for (let copy = 0; copy < 4; copy++) {
            TILE_DEFS.push({
                id: `pin_${i}_${copy}`,
                type: 'pin',
                value: i,
                matchGroup: `pin_${i}`,
                name: `${i} ${isEn ? 'Dots' : 'Pallini'}`
            });
        }
    }

    // 2. Bambù (Bamboo - Sou)
    for (let i = 1; i <= 9; i++) {
        for (let copy = 0; copy < 4; copy++) {
            TILE_DEFS.push({
                id: `sou_${i}_${copy}`,
                type: 'sou',
                value: i,
                matchGroup: `sou_${i}`,
                name: `${i} ${isEn ? 'Bamboo' : 'Bambù'}`
            });
        }
    }

    // 3. Caratteri (Characters - Man)
    for (let i = 1; i <= 9; i++) {
        for (let copy = 0; copy < 4; copy++) {
            TILE_DEFS.push({
                id: `man_${i}_${copy}`,
                type: 'man',
                value: i,
                matchGroup: `man_${i}`,
                name: `${i} ${isEn ? 'Characters' : 'Caratteri'}`
            });
        }
    }

    // 4. Venti (Winds)
    const WINDS = ['east', 'south', 'west', 'north'];
    const WIND_NAMES = isEn ? ['East', 'South', 'West', 'North'] : ['Est', 'Sud', 'Ovest', 'Nord'];
    WINDS.forEach((w, idx) => {
        for (let copy = 0; copy < 4; copy++) {
            TILE_DEFS.push({
                id: `wind_${w}_${copy}`,
                type: 'wind',
                value: w,
                matchGroup: `wind_${w}`,
                name: `${isEn ? 'Wind' : 'Vento'} ${WIND_NAMES[idx]}`
            });
        }
    });

    // 5. Draghi (Dragons)
    const DRAGONS = ['red', 'green', 'white'];
    const DRAGON_NAMES = isEn ? ['Red Dragon', 'Green Dragon', 'White Dragon'] : ['Drago Rosso', 'Drago Verde', 'Drago Bianco'];
    DRAGONS.forEach((d, idx) => {
        for (let copy = 0; copy < 4; copy++) {
            TILE_DEFS.push({
                id: `dragon_${d}_${copy}`,
                type: 'dragon',
                value: d,
                matchGroup: `dragon_${d}`,
                name: DRAGON_NAMES[idx]
            });
        }
    });

    // 6. Fiori (Flowers - Qualsiasi fiore si abbina con qualsiasi fiore)
    const FLOWERS = ['plum', 'orchid', 'chrysanthemum', 'bamboo'];
    const FLOWER_NAMES = isEn ? ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'] : ['Prugna', 'Orchidea', 'Crisantemo', 'Bambù'];
    FLOWERS.forEach((f, idx) => {
        TILE_DEFS.push({
            id: `flower_${f}`,
            type: 'flower',
            value: f,
            matchGroup: 'group_flower', // Match comune!
            name: `${isEn ? 'Flower' : 'Fiore'}: ${FLOWER_NAMES[idx]}`
        });
    });

    // 7. Stagioni (Seasons - Qualsiasi stagione si abbina con qualsiasi stagione)
    const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
    const SEASON_NAMES = isEn ? ['Spring', 'Summer', 'Autumn', 'Winter'] : ['Primavera', 'Estate', 'Autunno', 'Inverno'];
    SEASONS.forEach((s, idx) => {
        TILE_DEFS.push({
            id: `season_${s}`,
            type: 'season',
            value: s,
            matchGroup: 'group_season', // Match comune!
            name: `${isEn ? 'Season' : 'Stagione'}: ${SEASON_NAMES[idx]}`
        });
    });

    // === GENERATORE GRAFICO SVG DELLE TESSERE ===
    const CHINESE_NUMS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const CHINESE_WINDS = { east: '東', south: '南', west: '西', north: '北' };
    const CHINESE_DRAGONS = { red: '中', green: '發', white: '白' };
    const CHINESE_FLOWERS = { plum: '梅', orchid: '蘭', chrysanthemum: '菊', bamboo: '竹' };
    const CHINESE_SEASONS = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

    function generateTileSVG(tile) {
        const { type, value } = tile;
        let innerContent = '';
        let cornerLabel = '';

        if (type === 'pin') {
            cornerLabel = value;
            innerContent = renderPinSVG(value);
        } else if (type === 'sou') {
            cornerLabel = value;
            innerContent = renderSouSVG(value);
        } else if (type === 'man') {
            cornerLabel = value;
            const numChar = CHINESE_NUMS[value];
            innerContent = `
                <text x="22" y="24" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="20" font-weight="bold" fill="#1b4d89" text-anchor="middle">${numChar}</text>
                <text x="22" y="44" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="18" font-weight="bold" fill="#b22222" text-anchor="middle">萬</text>
            `;
        } else if (type === 'wind') {
            const char = CHINESE_WINDS[value];
            cornerLabel = value.charAt(0).toUpperCase();
            innerContent = `
                <text x="22" y="37" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="28" font-weight="bold" fill="#1a3320" text-anchor="middle">${char}</text>
            `;
        } else if (type === 'dragon') {
            cornerLabel = value.charAt(0).toUpperCase();
            if (value === 'red') {
                innerContent = `<text x="22" y="38" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="30" font-weight="bold" fill="#c41212" text-anchor="middle">中</text>`;
            } else if (value === 'green') {
                innerContent = `<text x="22" y="38" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="28" font-weight="bold" fill="#0d7c3d" text-anchor="middle">發</text>`;
            } else {
                // Drago Bianco: cornice elegante
                innerContent = `
                    <rect x="7" y="10" width="30" height="34" rx="3" fill="none" stroke="#1b4d89" stroke-width="3" />
                    <rect x="11" y="14" width="22" height="26" fill="#f8f8ff" stroke="#4a89dc" stroke-width="1.5" stroke-dasharray="3,2"/>
                `;
            }
        } else if (type === 'flower') {
            const char = CHINESE_FLOWERS[value];
            cornerLabel = '🌸';
            innerContent = `
                <circle cx="22" cy="18" r="8" fill="#e91e63" opacity="0.85"/>
                <circle cx="16" cy="22" r="5" fill="#ff4081" opacity="0.85"/>
                <circle cx="28" cy="22" r="5" fill="#ff4081" opacity="0.85"/>
                <circle cx="22" cy="18" r="3" fill="#ffd700"/>
                <text x="22" y="45" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="16" font-weight="bold" fill="#c2185b" text-anchor="middle">${char}</text>
            `;
        } else if (type === 'season') {
            const char = CHINESE_SEASONS[value];
            cornerLabel = '🍂';
            innerContent = `
                <path d="M 22 10 Q 30 18 22 28 Q 14 18 22 10 Z" fill="#ff9800" stroke="#e65100" stroke-width="1"/>
                <text x="22" y="45" font-family="'SimHei', 'Microsoft YaHei', sans-serif" font-size="16" font-weight="bold" fill="#e65100" text-anchor="middle">${char}</text>
            `;
        }

        return `
            <div class="tile-face">
                <span class="tile-corner-hint">${cornerLabel}</span>
                <svg class="tile-svg" viewBox="0 0 44 54">
                    ${innerContent}
                </svg>
            </div>
        `;
    }

    // Disegno Cerchi (Pin)
    function renderPinSVG(val) {
        const C_BLUE = '#1b4d89';
        const C_RED = '#c41212';
        const C_GREEN = '#15733d';

        function dot(cx, cy, r, fill, innerFill = '#fff') {
            return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#000" stroke-width="0.5"/>
                    <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="${innerFill}"/>`;
        }

        if (val === 1) {
            return `
                <circle cx="22" cy="27" r="14" fill="${C_RED}" stroke="#b8860b" stroke-width="1.5"/>
                <circle cx="22" cy="27" r="8" fill="#ffd700"/>
                <circle cx="22" cy="27" r="3" fill="${C_RED}"/>
            `;
        }
        if (val === 2) {
            return dot(22, 16, 6, C_GREEN) + dot(22, 38, 6, C_BLUE);
        }
        if (val === 3) {
            return dot(12, 14, 5, C_BLUE) + dot(22, 27, 5, C_RED) + dot(32, 40, 5, C_GREEN);
        }
        if (val === 4) {
            return dot(13, 16, 5.5, C_BLUE) + dot(31, 16, 5.5, C_GREEN) +
                   dot(13, 38, 5.5, C_GREEN) + dot(31, 38, 5.5, C_BLUE);
        }
        if (val === 5) {
            return dot(12, 15, 5, C_BLUE) + dot(32, 15, 5, C_GREEN) +
                   dot(22, 27, 5.5, C_RED) +
                   dot(12, 39, 5, C_GREEN) + dot(32, 39, 5, C_BLUE);
        }
        if (val === 6) {
            return dot(13, 14, 4.5, C_GREEN) + dot(31, 14, 4.5, C_GREEN) +
                   dot(13, 27, 4.5, C_RED) + dot(31, 27, 4.5, C_RED) +
                   dot(13, 40, 4.5, C_RED) + dot(31, 40, 4.5, C_RED);
        }
        if (val === 7) {
            return dot(10, 13, 4, C_GREEN) + dot(22, 17, 4, C_GREEN) + dot(34, 21, 4, C_GREEN) +
                   dot(14, 33, 4.5, C_RED) + dot(30, 33, 4.5, C_RED) +
                   dot(14, 43, 4.5, C_RED) + dot(30, 43, 4.5, C_RED);
        }
        if (val === 8) {
            return dot(13, 12, 4, C_BLUE) + dot(31, 12, 4, C_BLUE) +
                   dot(13, 22, 4, C_BLUE) + dot(31, 22, 4, C_BLUE) +
                   dot(13, 32, 4, C_BLUE) + dot(31, 32, 4, C_BLUE) +
                   dot(13, 42, 4, C_BLUE) + dot(31, 42, 4, C_BLUE);
        }
        if (val === 9) {
            return dot(11, 13, 4.5, C_GREEN) + dot(22, 13, 4.5, C_BLUE) + dot(33, 13, 4.5, C_RED) +
                   dot(11, 27, 4.5, C_GREEN) + dot(22, 27, 4.5, C_BLUE) + dot(33, 27, 4.5, C_RED) +
                   dot(11, 41, 4.5, C_GREEN) + dot(22, 41, 4.5, C_BLUE) + dot(33, 41, 4.5, C_RED);
        }
        return '';
    }

    // Disegno Bambù (Sou)
    function renderSouSVG(val) {
        const C_GREEN = '#15733d';
        const C_RED = '#c41212';
        const C_BLUE = '#1b4d89';

        function stick(x, y, w, h, fill) {
            return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="#09381c" stroke-width="0.6"/>
                    <line x1="${x}" y1="${y + h/2}" x2="${x + w}" y2="${y + h/2}" stroke="#fff" stroke-width="0.8"/>`;
        }

        if (val === 1) {
            // Pavone / Uccello dell'1 di Bambù
            return `
                <path d="M 22 10 C 26 14 30 18 28 26 C 26 34 18 36 15 42 C 20 40 26 40 31 43 C 27 34 26 22 22 10 Z" fill="${C_GREEN}"/>
                <circle cx="18" cy="18" r="5" fill="${C_RED}"/>
                <circle cx="17" cy="17" r="1.5" fill="#fff"/>
                <path d="M 18 23 C 14 26 12 33 16 38" stroke="${C_BLUE}" stroke-width="2" fill="none"/>
                <path d="M 28 26 L 35 22 M 28 30 L 37 30 M 27 34 L 35 37" stroke="${C_GREEN}" stroke-width="1.8"/>
            `;
        }
        if (val === 2) {
            return stick(19, 10, 6, 15, C_GREEN) + stick(19, 29, 6, 15, C_BLUE);
        }
        if (val === 3) {
            return stick(19, 9, 6, 14, C_BLUE) + stick(13, 29, 6, 15, C_GREEN) + stick(25, 29, 6, 15, C_GREEN);
        }
        if (val === 4) {
            return stick(13, 10, 5.5, 15, C_BLUE) + stick(25, 10, 5.5, 15, C_GREEN) +
                   stick(13, 29, 5.5, 15, C_GREEN) + stick(25, 29, 5.5, 15, C_BLUE);
        }
        if (val === 5) {
            return stick(12, 10, 5, 14, C_GREEN) + stick(27, 10, 5, 14, C_BLUE) +
                   stick(19.5, 20, 5, 14, C_RED) +
                   stick(12, 30, 5, 14, C_BLUE) + stick(27, 30, 5, 14, C_GREEN);
        }
        if (val === 6) {
            return stick(11, 10, 5, 14, C_GREEN) + stick(19.5, 10, 5, 14, C_GREEN) + stick(28, 10, 5, 14, C_GREEN) +
                   stick(11, 30, 5, 14, C_BLUE) + stick(19.5, 30, 5, 14, C_BLUE) + stick(28, 30, 5, 14, C_BLUE);
        }
        if (val === 7) {
            return stick(19.5, 8, 5, 12, C_RED) +
                   stick(11, 22, 5, 12, C_GREEN) + stick(19.5, 22, 5, 12, C_GREEN) + stick(28, 22, 5, 12, C_GREEN) +
                   stick(11, 36, 5, 12, C_BLUE) + stick(19.5, 36, 5, 12, C_BLUE) + stick(28, 36, 5, 12, C_BLUE);
        }
        if (val === 8) {
            return `<g transform="translate(4, 2)">
                ${stick(8, 8, 4.5, 12, C_GREEN)}${stick(15, 8, 4.5, 12, C_GREEN)}${stick(22, 8, 4.5, 12, C_GREEN)}
                ${stick(8, 22, 4.5, 12, C_BLUE)}${stick(22, 22, 4.5, 12, C_BLUE)}
                ${stick(8, 36, 4.5, 12, C_GREEN)}${stick(15, 36, 4.5, 12, C_GREEN)}${stick(22, 36, 4.5, 12, C_GREEN)}
            </g>`;
        }
        if (val === 9) {
            return stick(11, 9, 5, 11, C_RED) + stick(19.5, 9, 5, 11, C_BLUE) + stick(28, 9, 5, 11, C_GREEN) +
                   stick(11, 22, 5, 11, C_RED) + stick(19.5, 22, 5, 11, C_BLUE) + stick(28, 22, 5, 11, C_GREEN) +
                   stick(11, 35, 5, 11, C_RED) + stick(19.5, 35, 5, 11, C_BLUE) + stick(28, 35, 5, 11, C_GREEN);
        }
        return '';
    }

    // === DEFINIZIONE SCHEMI & LAYOUT DEL TAVOLO (144 Tessere cad.) ===
    // Sistema a semi-griglia (Half-Tile Grid): ogni tessera occupa 2x2 mezze caselle (larghezza 2, altezza 2).
    // Coordinate: { x, y, z } dove z è il livello (0..4).

    const LAYOUT_BUILDERS = {
        turtle: function () {
            // Classica Tartaruga di Shanghai (144 tessere)
            const slots = [];
            
            // Livello 0 (Base - 87 tessere)
            // Riga centrale estesa a sinistra e destra (ali)
            slots.push({ x: 0, y: 7, z: 0 }); // Estrema sinistra
            slots.push({ x: 2, y: 7, z: 0 });
            slots.push({ x: 26, y: 7, z: 0 });
            slots.push({ x: 28, y: 7, z: 0 }); // Estrema destra

            // Rettangolo principale e profilo tartaruga
            const l0Grid = [
                { y: 1, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
                { y: 3, xs: [6, 8, 10, 12, 14, 16, 18, 20, 22] },
                { y: 5, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
                { y: 7, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
                { y: 9, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
                { y: 11, xs: [6, 8, 10, 12, 14, 16, 18, 20, 22] },
                { y: 13, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] }
            ];

            l0Grid.forEach(row => {
                row.xs.forEach(x => {
                    slots.push({ x, y: row.y, z: 0 });
                });
            });

            // Aggiustamento per raggiungere 144 tessere totali standard
            // Livello 1 (36 tessere: 6x6 da x=8 a 18, y=4 a 10)
            for (let y = 4; y <= 10; y += 2) {
                for (let x = 8; x <= 18; x += 2) {
                    slots.push({ x, y, z: 1 });
                }
            }

            // Livello 2 (16 tessere: 4x4 da x=10 a 16, y=6 a 8)
            for (let y = 5; y <= 9; y += 2) {
                for (let x = 10; x <= 16; x += 2) {
                    slots.push({ x, y, z: 2 });
                }
            }

            // Livello 3 (4 tessere: 2x2 da x=12 a 14, y=6 a 8)
            for (let y = 6; y <= 8; y += 2) {
                for (let x = 12; x <= 14; x += 2) {
                    slots.push({ x, y, z: 3 });
                }
            }

            // Livello 4 (1 tessera picco al centro su x=13, y=7)
            slots.push({ x: 13, y: 7, z: 4 });

            return slots.slice(0, 144);
        },

        pyramid: function () {
            // Schema Piramide
            const slots = [];
            // Livello 0: 8x8 = 64
            for (let y = 1; y <= 15; y += 2) {
                for (let x = 7; x <= 21; x += 2) {
                    slots.push({ x, y, z: 0 });
                }
            }
            // Livello 1: 6x6 = 36
            for (let y = 3; y <= 13; y += 2) {
                for (let x = 9; x <= 19; x += 2) {
                    slots.push({ x, y, z: 1 });
                }
            }
            // Livello 2: 4x4 = 16
            for (let y = 5; y <= 11; y += 2) {
                for (let x = 11; x <= 17; x += 2) {
                    slots.push({ x, y, z: 2 });
                }
            }
            // Livello 3: 2x2 = 4
            for (let y = 7; y <= 9; y += 2) {
                for (let x = 13; x <= 15; x += 2) {
                    slots.push({ x, y, z: 3 });
                }
            }
            // Basi esterne aggiuntive (24 tessere per arrivare a 144 esatte)
            const wings = [
                {x: 3, y: 1}, {x: 5, y: 1}, {x: 23, y: 1}, {x: 25, y: 1},
                {x: 3, y: 5}, {x: 5, y: 5}, {x: 23, y: 5}, {x: 25, y: 5},
                {x: 3, y: 9}, {x: 5, y: 9}, {x: 23, y: 9}, {x: 25, y: 9},
                {x: 3, y: 13}, {x: 5, y: 13}, {x: 23, y: 13}, {x: 25, y: 13},
                {x: 1, y: 7}, {x: 27, y: 7},
                {x: 13, y: 7, z: 4}, // Vertice 144
                {x: 15, y: 7, z: 4},
                {x: 7, y: 7, z: 1}, {x: 21, y: 7, z: 1},
                {x: 14, y: 7, z: 5}, {x: 14, y: 8, z: 5}
            ];
            wings.forEach(w => slots.push({ x: w.x, y: w.y, z: w.z || 0 }));
            return slots.slice(0, 144);
        },

        castle: function () {
            // Fortezza con 4 torri e corte centrale
            const slots = [];
            // Torri 4 angoli a 3 piani
            const towerBases = [
                {x0: 4, y0: 1}, {x0: 20, y0: 1},
                {x0: 4, y0: 11}, {x0: 20, y0: 11}
            ];
            towerBases.forEach(tb => {
                for (let z = 0; z < 3; z++) {
                    for (let dy = 0; dy < 4; dy += 2) {
                        for (let dx = 0; dx < 4; dx += 2) {
                            slots.push({ x: tb.x0 + dx, y: tb.y0 + dy, z });
                        }
                    }
                }
            });
            // Mura di collegamento e cortile
            for (let x = 8; x <= 18; x += 2) {
                slots.push({ x, y: 2, z: 0 }, { x, y: 2, z: 1 });
                slots.push({ x, y: 12, z: 0 }, { x, y: 12, z: 1 });
            }
            for (let y = 4; y <= 10; y += 2) {
                slots.push({ x: 5, y, z: 0 }, { x: 5, y, z: 1 });
                slots.push({ x: 21, y, z: 0 }, { x: 21, y, z: 1 });
            }
            // Maschio centrale
            for (let y = 6; y <= 8; y += 2) {
                for (let x = 11; x <= 15; x += 2) {
                    slots.push({ x, y, z: 0 }, { x, y, z: 1 }, { x, y, z: 2 });
                }
            }
            // Riempi fino a 144 se necessario
            while (slots.length < 144) {
                slots.push({ x: 2 + (slots.length % 26), y: 7, z: 0 });
            }
            return slots.slice(0, 144);
        },

        arena: function () {
            // Arena con cerchi concentrici
            const slots = [];
            for (let x = 2; x <= 26; x += 2) {
                slots.push({ x, y: 1, z: 0 }, { x, y: 13, z: 0 });
            }
            for (let y = 3; y <= 11; y += 2) {
                slots.push({ x: 2, y, z: 0 }, { x: 26, y, z: 0 });
            }
            // Secondo cerchio
            for (let x = 4; x <= 24; x += 2) {
                slots.push({ x, y: 3, z: 1 }, { x, y: 11, z: 1 });
            }
            for (let y = 5; y <= 9; y += 2) {
                slots.push({ x: 4, y, z: 1 }, { x: 24, y, z: 1 });
            }
            // Terzo cerchio
            for (let x = 6; x <= 22; x += 2) {
                slots.push({ x, y: 5, z: 2 }, { x, y: 9, z: 2 });
            }
            for (let y = 6; y <= 8; y += 2) {
                slots.push({ x: 6, y, z: 2 }, { x: 22, y, z: 2 });
            }
            // Centro
            for (let x = 8; x <= 20; x += 2) {
                slots.push({ x, y: 7, z: 3 });
            }
            while (slots.length < 144) {
                slots.push({ x: 10 + (slots.length % 10), y: 7, z: 0 });
            }
            return slots.slice(0, 144);
        }
    };

    // === STATO DEL GIOCO ===
    let activeLayout = 'turtle';
    let boardTiles = []; // Array degli oggetti { id, tileDef, x, y, z, el, removed }
    let selectedTile = null;
    let hintPair = [];
    let moveHistory = []; // Stack per Undo
    let highlightFree = false;

    // Statistiche partita
    let gameTimer = null;
    let secondsElapsed = 0;
    let gameScore = 0;
    let pairsRemoved = 0;
    let comboMultiplier = 1;
    let lastMatchTime = 0;
    let isGameOver = false;

    // Statistiche globali salvate in localStorage
    let globalStats = {
        played: 0,
        won: 0,
        bestTime: null,
        highScore: 0
    };

    // Audio Web Audio API
    let audioEnabled = localStorage.getItem('mahjong_audio') !== '0';
    let audioCtx = null;

    // Dimensioni di rendering
    const TILE_WIDTH = 52;
    const TILE_HEIGHT = 68;
    const HALF_X = 26; // larghezza mezza cella
    const HALF_Y = 34; // altezza mezza cella
    const LAYER_OFFSET_X = -4; // spostamento visuale 3D per layer
    const LAYER_OFFSET_Y = -4;

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

            if (type === 'select') {
                // Click secco e brillante di ceramica
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'match') {
                // Impatto solido di ceramica/avorio + risonanza armonica
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(659.25, now); // Mi5
                osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // La5

                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(1318.5, now); // Mi6
                osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.25);
                osc2.stop(now + 0.25);
            } else if (type === 'locked') {
                // Toc secco sordo (tessera non selezionabile)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'shuffle') {
                // Cascata di tessere mescolate
                for (let i = 0; i < 5; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = now + i * 0.05;
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(400 + Math.random() * 600, t);
                    osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.06);
                }
            } else if (type === 'victory') {
                // Fanfara pentatonica orientale trionfale
                const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Do, Re, Mi, Sol, La, Do
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = now + idx * 0.12;
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.4, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.35);
                });
            }
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    // === ALGORITMO DI RILEVAMENTO TESSERE LIBERE / GIOCABILI ===
    // Una tessera è libera se:
    // 1. Non ha nessuna tessera al livello Z+1 che la sovrappone (anche parzialmente).
    // 2. Ha almeno un lato lungo (Sinistro o Destro) completamente libero al proprio livello Z.

    function isTileBlocked(tile, allTiles) {
        if (tile.removed) return true;

        const activeTiles = allTiles.filter(t => !t.removed && t.id !== tile.id);

        // 1. Controllo sovrapposizione dall'alto (livello Z > tile.z)
        // Poiché una tessera occupa 2x2 mezze coordinate:
        // C'è sovrapposizione se |x1 - x2| < 2 e |y1 - y2| < 2 con z2 > z1
        for (const other of activeTiles) {
            if (other.z > tile.z) {
                if (Math.abs(other.x - tile.x) < 2 && Math.abs(other.y - tile.y) < 2) {
                    return true; // Coperta da sopra
                }
            }
        }

        // 2. Controllo blocchi laterali al medesimo livello Z (o livelli inferiori adiacenti)
        // Lato Sinistro: tessera con x2 = tile.x - 2 e |y1 - y2| < 2 al livello tile.z
        // Lato Destro: tessera con x2 = tile.x + 2 e |y1 - y2| < 2 al livello tile.z
        let leftBlocked = false;
        let rightBlocked = false;

        for (const other of activeTiles) {
            if (other.z === tile.z && Math.abs(other.y - tile.y) < 2) {
                if (other.x === tile.x - 2) {
                    leftBlocked = true;
                }
                if (other.x === tile.x + 2) {
                    rightBlocked = true;
                }
            }
        }

        // Se entrambi i lati sono bloccati, la tessera non è libera
        return leftBlocked && rightBlocked;
    }

    function isTileFree(tile, allTiles) {
        return !isTileBlocked(tile, allTiles);
    }

    // === GENERATORE DI SCHEMI GARANTITI RISOLVIBILI ===
    // Posizioniamo le coppie a ritroso partendo dallo schema completo e simulando
    // la rimozione di tessere libere ad ogni passo. In questo modo esiste SEMPRE
    // una sequenza vincente provata.
    function generateSolvableBoard(layoutSlots) {
        const totalTiles = layoutSlots.length; // 144
        const pairCount = totalTiles / 2; // 72

        // Raccogli e mescola le 72 coppie dal set standard
        const shuffledTileDefs = [...TILE_DEFS];
        for (let i = shuffledTileDefs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTileDefs[i], shuffledTileDefs[j]] = [shuffledTileDefs[j], shuffledTileDefs[i]];
        }

        const pairs = [];
        const used = new Set();
        for (let i = 0; i < shuffledTileDefs.length; i++) {
            if (used.has(i)) continue;
            const t1 = shuffledTileDefs[i];
            for (let j = i + 1; j < shuffledTileDefs.length; j++) {
                if (used.has(j)) continue;
                const t2 = shuffledTileDefs[j];
                if (t1.matchGroup === t2.matchGroup) {
                    pairs.push([t1, t2]);
                    used.add(i);
                    used.add(j);
                    break;
                }
            }
        }

        // Inizializza gli slot
        const board = layoutSlots.map((slot, index) => ({
            id: `tile_${index}`,
            x: slot.x,
            y: slot.y,
            z: slot.z,
            tileDef: null,
            removed: false
        }));

        // Simulazione forward-removal per assegnazione coppie garantite
        let assignedCount = 0;
        let pairIndex = 0;

        while (assignedCount < totalTiles && pairIndex < pairs.length) {
            const activeSlots = board.filter(t => !t.removed);
            const freeSlots = activeSlots.filter(t => isTileFree(t, activeSlots));

            if (freeSlots.length >= 2) {
                // Scegli 2 slot liberi a caso
                const idx1 = Math.floor(Math.random() * freeSlots.length);
                const s1 = freeSlots.splice(idx1, 1)[0];
                const idx2 = Math.floor(Math.random() * freeSlots.length);
                const s2 = freeSlots.splice(idx2, 1)[0];

                const pair = pairs[pairIndex++];
                s1.tileDef = pair[0];
                s1.removed = true;
                s2.tileDef = pair[1];
                s2.removed = true;
                assignedCount += 2;
            } else if (freeSlots.length === 1 && activeSlots.length >= 2) {
                const s1 = freeSlots[0];
                const otherSlots = activeSlots.filter(t => t.id !== s1.id);
                const s2 = otherSlots[Math.floor(Math.random() * otherSlots.length)];

                const pair = pairs[pairIndex++];
                s1.tileDef = pair[0];
                s1.removed = true;
                s2.tileDef = pair[1];
                s2.removed = true;
                assignedCount += 2;
            } else {
                for (let i = 0; i < activeSlots.length && pairIndex < pairs.length; i += 2) {
                    const s1 = activeSlots[i];
                    const s2 = activeSlots[i + 1] || activeSlots[i];
                    const pair = pairs[pairIndex++];
                    s1.tileDef = pair[0];
                    s1.removed = true;
                    if (s2 && s2 !== s1) {
                        s2.tileDef = pair[1];
                        s2.removed = true;
                        assignedCount += 2;
                    } else {
                        assignedCount += 1;
                    }
                }
                break;
            }
        }

        // Ripristina tutte le tessere sul tavolo per iniziare a giocare
        board.forEach(t => { t.removed = false; });
        return board;
    }

    // === TROVA TUTTE LE COPPIE GIOCABILI ATTUALI ===
    function findAvailablePairs() {
        const freeTiles = boardTiles.filter(t => !t.removed && isTileFree(t, boardTiles));
        const matchingPairs = [];

        for (let i = 0; i < freeTiles.length; i++) {
            for (let j = i + 1; j < freeTiles.length; j++) {
                const t1 = freeTiles[i];
                const t2 = freeTiles[j];
                if (t1.tileDef.matchGroup === t2.tileDef.matchGroup) {
                    matchingPairs.push([t1, t2]);
                }
            }
        }

        return matchingPairs;
    }

    // === RIMESCOLAMENTO DEL TAVOLO (SHUFFLE) ===
    function shuffleRemainingTiles() {
        const remainingTiles = boardTiles.filter(t => !t.removed);
        if (remainingTiles.length === 0) return;

        // Raccogli tutte le tileDef rimaste
        const remainingDefs = remainingTiles.map(t => t.tileDef);

        // Mescola le definizioni finché non troviamo almeno una mossa valida (max 50 tentativi)
        let attempts = 0;
        let valid = false;

        while (attempts < 50 && !valid) {
            attempts++;
            // Shuffle array
            for (let i = remainingDefs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingDefs[i], remainingDefs[j]] = [remainingDefs[j], remainingDefs[i]];
            }

            // Assegna temporaneamente
            remainingTiles.forEach((t, idx) => {
                t.tileDef = remainingDefs[idx];
            });

            // Controlla se ci sono coppie giocabili
            const pairs = findAvailablePairs();
            if (pairs.length > 0) {
                valid = true;
            }
        }

        // Ridisegna il contenuto delle tessere
        remainingTiles.forEach(t => {
            if (t.el) {
                const inner = t.el.querySelector('.mahjong-tile-inner');
                if (inner) inner.innerHTML = generateTileSVG(t.tileDef);
            }
        });

        // Pulisci selezioni ed evidenziazioni
        clearSelection();
        clearHint();
        updateBoardStateUI();
        showToast(TXT.shuffled);
        playSound('shuffle');
    }

    // === INTERAZIONE & GESTIONE CLICK TESSERE ===
    function handleTileClick(tile) {
        if (isGameOver || tile.removed) return;

        getAudioContext(); // Attiva audio su user gesture

        const free = isTileFree(tile, boardTiles);

        if (!free) {
            playSound('locked');
            // Feedback visivo blocco
            if (tile.el) {
                tile.el.style.transform = 'translate(-2px, 0)';
                setTimeout(() => { if (tile.el) tile.el.style.transform = ''; }, 100);
            }
            return;
        }

        clearHint();

        // 1. Se non c'è una tessera selezionata, seleziona questa
        if (!selectedTile) {
            selectTile(tile);
            playSound('select');
            return;
        }

        // 2. Se clicca sulla stessa tessera selezionata, deseleziona
        if (selectedTile.id === tile.id) {
            clearSelection();
            playSound('select');
            return;
        }

        // 3. Se clicca su una seconda tessera: verifica se c'è un abbinamento!
        if (selectedTile.tileDef.matchGroup === tile.tileDef.matchGroup) {
            // MATCH VALIDO!
            matchTiles(selectedTile, tile);
        } else {
            // Tessere diverse: passa la selezione alla nuova tessera
            clearSelection();
            selectTile(tile);
            playSound('select');
        }
    }

    function selectTile(tile) {
        selectedTile = tile;
        if (tile.el) tile.el.classList.add('tile-selected');
    }

    function clearSelection() {
        if (selectedTile && selectedTile.el) {
            selectedTile.el.classList.remove('tile-selected');
        }
        selectedTile = null;
    }

    function matchTiles(t1, t2) {
        playSound('match');

        // Calcola combo e punteggio
        const now = Date.now();
        if (now - lastMatchTime < 4000) {
            comboMultiplier = Math.min(comboMultiplier + 1, 5);
        } else {
            comboMultiplier = 1;
        }
        lastMatchTime = now;

        const points = 100 * comboMultiplier + (t1.z + t2.z) * 25;
        gameScore += points;
        pairsRemoved++;

        // Salva mossa per Undo
        moveHistory.push({
            t1Id: t1.id,
            t2Id: t2.id,
            points: points,
            combo: comboMultiplier
        });

        // Rimuovi visivamente
        t1.removed = true;
        t2.removed = true;

        if (t1.el) t1.el.classList.add('tile-removing');
        if (t2.el) t2.el.classList.add('tile-removing');

        setTimeout(() => {
            if (t1.el) t1.el.style.display = 'none';
            if (t2.el) t2.el.style.display = 'none';
            clearSelection();
            updateBoardStateUI();
            checkGameEnd();
        }, 300);
    }

    // === ANNULLA MOSSA (UNDO) ===
    function undoMove() {
        if (moveHistory.length === 0 || isGameOver) return;

        const lastMove = moveHistory.pop();
        const t1 = boardTiles.find(t => t.id === lastMove.t1Id);
        const t2 = boardTiles.find(t => t.id === lastMove.t2Id);

        if (t1 && t2) {
            t1.removed = false;
            t2.removed = false;
            if (t1.el) {
                t1.el.style.display = '';
                t1.el.classList.remove('tile-removing', 'tile-selected');
            }
            if (t2.el) {
                t2.el.style.display = '';
                t2.el.classList.remove('tile-removing', 'tile-selected');
            }
            gameScore = Math.max(0, gameScore - lastMove.points);
            pairsRemoved = Math.max(0, pairsRemoved - 1);
            clearSelection();
            clearHint();
            updateBoardStateUI();
            playSound('select');
        }
    }

    // === SUGGERIMENTO INTELLIGENTE CON SOLVER (HINT) ===
    function findOptimalHintPair() {
        const remainingTiles = boardTiles.filter(t => !t.removed);
        if (remainingTiles.length === 0) return null;

        const pairs = findAvailablePairs();
        if (pairs.length === 0) return null;
        if (pairs.length === 1) return pairs[0];

        // Euristica di punteggio per ciascuna coppia:
        // - Quante tessere sblocca (rimuovendola, quante nuove tessere diventano libere)
        // - Altezza z delle tessere (rimuovere tessere in alto sblocca le pile sottostanti)
        function evaluatePairScore(p, activeTiles) {
            const t1 = p[0];
            const t2 = p[1];
            let score = (t1.z + t2.z) * 10;

            // Simula rimozione
            t1.removed = true;
            t2.removed = true;

            const nextActive = activeTiles.filter(t => !t.removed);
            const newlyFree = nextActive.filter(t => isTileFree(t, nextActive));
            const nextPairs = [];
            for (let i = 0; i < newlyFree.length; i++) {
                for (let j = i + 1; j < newlyFree.length; j++) {
                    if (newlyFree[i].tileDef.matchGroup === newlyFree[j].tileDef.matchGroup) {
                        nextPairs.push([newlyFree[i], newlyFree[j]]);
                    }
                }
            }

            score += newlyFree.length * 6;
            score += nextPairs.length * 10;

            // Ripristina
            t1.removed = false;
            t2.removed = false;
            return score;
        }

        // Ricerca ricorsiva (Depth First Search) con limite di nodi per trovare una sequenza vincente
        let nodesVisited = 0;
        const MAX_NODES = 1500;

        function solveDFS(activeTiles) {
            if (activeTiles.length === 0) return true;
            if (++nodesVisited > MAX_NODES) return false;

            const free = activeTiles.filter(t => isTileFree(t, activeTiles));
            const availablePairs = [];
            for (let i = 0; i < free.length; i++) {
                for (let j = i + 1; j < free.length; j++) {
                    if (free[i].tileDef.matchGroup === free[j].tileDef.matchGroup) {
                        availablePairs.push([free[i], free[j]]);
                    }
                }
            }

            if (availablePairs.length === 0) return false;

            // Ordina le coppie per potenziale euristico
            availablePairs.sort((a, b) => evaluatePairScore(b, activeTiles) - evaluatePairScore(a, activeTiles));

            for (const pair of availablePairs) {
                pair[0].removed = true;
                pair[1].removed = true;

                const nextActive = activeTiles.filter(t => !t.removed);
                const solved = solveDFS(nextActive);

                pair[0].removed = false;
                pair[1].removed = false;

                if (solved) return true;
            }
            return false;
        }

        // Valuta e ordina le coppie con l'euristica
        const scoredPairs = pairs.map(p => ({
            pair: p,
            score: evaluatePairScore(p, remainingTiles)
        }));
        scoredPairs.sort((a, b) => b.score - a.score);

        // Prova a verificare quale mossa porta a una vittoria provata
        for (const item of scoredPairs) {
            const p = item.pair;
            p[0].removed = true;
            p[1].removed = true;
            nodesVisited = 0;

            const nextActive = remainingTiles.filter(t => !t.removed);
            const isWinningMove = solveDFS(nextActive);

            p[0].removed = false;
            p[1].removed = false;

            if (isWinningMove) {
                return p; // Trovata mossa appartenente a un cammino vincente!
            }
        }

        // Se la ricerca approfondita non ha confermato la vittoria nei nodi analizzati,
        // restituisce la coppia con il punteggio euristico più alto (massimo sblocco)
        return scoredPairs[0].pair;
    }

    function provideHint() {
        if (isGameOver) return;
        clearHint();

        const pair = findOptimalHintPair();
        if (pair) {
            hintPair = pair;
            pair[0].el.classList.add('tile-hint');
            pair[1].el.classList.add('tile-hint');
            playSound('select');

            // Penalità minima di 30 punti per il suggerimento
            gameScore = Math.max(0, gameScore - 30);
            updateBoardStateUI();
        } else {
            showToast(TXT.noMoves);
            playSound('locked');
        }
    }

    function clearHint() {
        hintPair.forEach(t => {
            if (t.el) t.el.classList.remove('tile-hint');
        });
        hintPair = [];
    }

    // === AGGIORNAMENTO UI & STATI TESSERE ===
    function updateBoardStateUI() {
        const remainingTiles = boardTiles.filter(t => !t.removed);
        const pairs = findAvailablePairs();

        // Aggiorna classi CSS (tile-free vs tile-blocked)
        boardTiles.forEach(tile => {
            if (!tile.removed && tile.el) {
                const free = isTileFree(tile, boardTiles);
                if (free) {
                    tile.el.classList.add('tile-free');
                    tile.el.classList.remove('tile-blocked');
                } else {
                    tile.el.classList.remove('tile-free');
                    tile.el.classList.add('tile-blocked');
                }
            }
        });

        // Header info
        const elTessere = document.getElementById('stat-tessere');
        const elCoppie = document.getElementById('stat-coppie');
        const elPunti = document.getElementById('stat-punti');
        const btnUndo = document.getElementById('btn-undo');
        const btnHint = document.getElementById('btn-hint');

        if (elTessere) elTessere.textContent = remainingTiles.length;
        if (elCoppie) elCoppie.textContent = pairs.length;
        if (elPunti) elPunti.textContent = gameScore;
        if (btnUndo) btnUndo.disabled = (moveHistory.length === 0);
        if (btnHint) btnHint.disabled = (pairs.length === 0);

        // Se non ci sono mosse e rimangono tessere, avvisa
        if (remainingTiles.length > 0 && pairs.length === 0 && !isGameOver) {
            setTimeout(() => {
                showToast(TXT.noMoves);
            }, 500);
        }
    }

    // === CONTROLLO FINE PARTITA (VITTORIA) ===
    function checkGameEnd() {
        const remainingTiles = boardTiles.filter(t => !t.removed);

        if (remainingTiles.length === 0) {
            // VITTORIA!
            isGameOver = true;
            stopTimer();
            playSound('victory');

            // Salva statistiche
            globalStats.played++;
            globalStats.won++;
            if (!globalStats.bestTime || secondsElapsed < globalStats.bestTime) {
                globalStats.bestTime = secondsElapsed;
            }
            if (gameScore > globalStats.highScore) {
                globalStats.highScore = gameScore;
            }
            saveGlobalStats();

            // Mostra modale vittoria
            showVictoryModal();
        }
    }

    function showVictoryModal() {
        const schermo = document.getElementById('schermo');
        const modale = document.getElementById('haivinto');
        const dettTempo = document.getElementById('vit-tempo');
        const dettPunti = document.getElementById('vit-punti');

        if (dettTempo) dettTempo.textContent = formatTime(secondsElapsed);
        if (dettPunti) dettPunti.textContent = gameScore;

        if (schermo) schermo.style.display = 'block';
        if (modale) {
            modale.style.display = 'flex';
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

    // === TIMER DI GIOCO ===
    function startTimer() {
        stopTimer();
        secondsElapsed = 0;
        updateTimerDisplay();
        gameTimer = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const el = document.getElementById('stat-tempo');
        if (el) el.textContent = formatTime(secondsElapsed);
    }

    // === RENDERING DEL TAVOLO NEL DOM ===
    function renderBoard(board) {
        const container = document.getElementById('board-container');
        if (!container) return;
        container.innerHTML = '';

        // Calcola offset per centrare il layout nel container (960x600)
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        board.forEach(slot => {
            if (slot.x < minX) minX = slot.x;
            if (slot.x > maxX) maxX = slot.x;
            if (slot.y < minY) minY = slot.y;
            if (slot.y > maxY) maxY = slot.y;
        });

        const boardWidthPx = (maxX - minX + 2) * HALF_X;
        const boardHeightPx = (maxY - minY + 2) * HALF_Y;

        const offsetX = Math.max(20, (960 - boardWidthPx) / 2);
        const offsetY = Math.max(10, (590 - boardHeightPx) / 2);

        board.forEach(tile => {
            const el = document.createElement('div');
            el.className = 'mahjong-tile';
            el.dataset.layer = tile.z;
            el.id = tile.id;

            // Calcolo posizionamento assoluto con elevazione 3D (offset per piano Z)
            const leftPx = offsetX + (tile.x - minX) * HALF_X + tile.z * LAYER_OFFSET_X;
            const topPx = offsetY + (tile.y - minY) * HALF_Y + tile.z * LAYER_OFFSET_Y;

            el.style.left = `${leftPx}px`;
            el.style.top = `${topPx}px`;
            // z-index basato su layer Z e coordinata Y per corretto rendering 3D isometrico
            el.style.zIndex = tile.z * 100 + tile.y * 2 + tile.x;

            el.innerHTML = `<div class="mahjong-tile-inner">${generateTileSVG(tile.tileDef)}</div>`;

            el.addEventListener('click', () => handleTileClick(tile));

            tile.el = el;
            container.appendChild(el);
        });

        boardTiles = board;
        updateBoardStateUI();
    }

    // === AVVIO NUOVA PARTITA ===
    function startNewGame(layoutKey) {
        if (layoutKey) activeLayout = layoutKey;

        // Chiudi modali e rimuovi banner finish
        document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
        const schermo = document.getElementById('schermo');
        const modaleInizio = document.getElementById('modale-inizio');
        const modaleVinto = document.getElementById('haivinto');
        const modaleConferma = document.getElementById('confermatermina');
        const modaleRimescola = document.getElementById('confermarimescola');

        if (schermo) schermo.style.display = 'none';
        if (modaleInizio) modaleInizio.style.display = 'none';
        if (modaleVinto) modaleVinto.style.display = 'none';
        if (modaleConferma) modaleConferma.style.display = 'none';
        if (modaleRimescola) modaleRimescola.style.display = 'none';

        // Reset variabili
        isGameOver = false;
        selectedTile = null;
        hintPair = [];
        moveHistory = [];
        gameScore = 0;
        pairsRemoved = 0;
        comboMultiplier = 1;

        // Aggiorna badge titolo
        const badge = document.getElementById('schema-badge');
        if (badge) badge.textContent = TXT[activeLayout] || activeLayout;

        // Genera layout e crea tavolo garantito risolvibile
        const builder = LAYOUT_BUILDERS[activeLayout] || LAYOUT_BUILDERS.turtle;
        const slots = builder();
        const solvableBoard = generateSolvableBoard(slots);

        // Rendering e avvio timer
        renderBoard(solvableBoard);
        startTimer();
    }

    // === GESTIONE MODALI & VIE DI FUGA ===
    window.apriModaleInizio = function () {
        document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
        if (typeof window.selezionaSchema === 'function') {
            window.selezionaSchema(activeLayout || 'turtle');
        }
        const schermo = document.getElementById('schermo');
        const modale = document.getElementById('modale-inizio');
        const modaleVinto = document.getElementById('haivinto');
        const modaleConferma = document.getElementById('confermatermina');
        const modaleRimescola = document.getElementById('confermarimescola');
        if (modaleVinto) modaleVinto.style.display = 'none';
        if (modaleConferma) modaleConferma.style.display = 'none';
        if (modaleRimescola) modaleRimescola.style.display = 'none';
        if (schermo) schermo.style.display = 'block';
        if (modale) modale.style.display = 'flex';
    };

    window.selezionaSchema = function (schemaKey) {
        activeLayout = schemaKey;
        try {
            localStorage.setItem('mahjong_selected_layout', schemaKey);
        } catch (e) { }
        document.querySelectorAll('.btn-schema-sel').forEach(btn => {
            btn.classList.remove('attiva');
        });
        const activeBtn = document.getElementById(`btn-schema-${schemaKey}`);
        if (activeBtn) activeBtn.classList.add('attiva');
    };

    window.confermaEAvviaPartita = function () {
        startNewGame(activeLayout);
    };

    window.chiediNuovaPartita = function () {
        const remaining = boardTiles.filter(t => !t.removed).length;
        if (remaining === 0 || isGameOver) {
            window.apriModaleInizio();
            return;
        }
        const schermo = document.getElementById('schermo');
        const modaleConferma = document.getElementById('confermatermina');
        if (schermo) schermo.style.display = 'block';
        if (modaleConferma) {
            modaleConferma.style.display = 'flex';
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
        }
    };

    // === TOAST NOTIFICA VELOCE ===
    function showToast(msg) {
        const toast = document.getElementById('toast-notifica');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('visibile');
        setTimeout(() => {
            toast.classList.remove('visibile');
        }, 2200);
    }

    // === SALVATAGGIO & CARICAMENTO STATISTICHE ===
    function loadGlobalStats() {
        try {
            const savedLayout = localStorage.getItem('mahjong_selected_layout');
            if (savedLayout && LAYOUT_BUILDERS[savedLayout]) {
                activeLayout = savedLayout;
            }
            const saved = localStorage.getItem('mahjong_stats');
            if (saved) globalStats = Object.assign(globalStats, JSON.parse(saved));
        } catch (e) { }
    }

    function saveGlobalStats() {
        try {
            localStorage.setItem('mahjong_stats', JSON.stringify(globalStats));
        } catch (e) { }
    }

    // === INIZIALIZZAZIONE EVENTI & CONTROLLI ===
    function initEvents() {
        loadGlobalStats();

        // Tasto Audio
        const btnAudio = document.getElementById('btn-audio');
        if (btnAudio) {
            if (!audioEnabled) btnAudio.classList.add('muted');
            btnAudio.addEventListener('click', () => {
                audioEnabled = !audioEnabled;
                localStorage.setItem('mahjong_audio', audioEnabled ? '1' : '0');
                if (audioEnabled) {
                    btnAudio.classList.remove('muted');
                    playSound('select');
                } else {
                    btnAudio.classList.add('muted');
                }
            });
        }

        // Tasto Suggerimento (Hint)
        const btnHint = document.getElementById('btn-hint');
        if (btnHint) btnHint.addEventListener('click', provideHint);

        // Tasto Annulla (Undo)
        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) btnUndo.addEventListener('click', undoMove);

        function onShuffleButtonClick() {
            if (isGameOver) return;
            const remainingTiles = boardTiles.filter(t => !t.removed);
            if (remainingTiles.length === 0) return;

            const pairs = findAvailablePairs();
            if (pairs.length === 0) {
                // Nessuna mossa rimasta: rimescola all'istante
                shuffleRemainingTiles();
            } else {
                // Ci sono ancora mosse: chiedi conferma con modale e banner finish
                const schermo = document.getElementById('schermo');
                const modaleRimescola = document.getElementById('confermarimescola');
                if (schermo) schermo.style.display = 'block';
                if (modaleRimescola) {
                    modaleRimescola.style.display = 'flex';
                    if (typeof setupAmazonFinishBanner === 'function') {
                        setupAmazonFinishBanner('confermarimescola', {
                            modalStyle: { overflow: 'visible' },
                            targetTop: 470,
                            applyModalTop: false,
                            bannerHeight: 300,
                            bannerTopOffset: 325,
                            leftOffset: 0
                        });
                    }
                }
            }
        }

        // Tasto Rimescola (Shuffle)
        const btnShuffle = document.getElementById('btn-shuffle');
        if (btnShuffle) btnShuffle.addEventListener('click', onShuffleButtonClick);

        // Tasto Evidenzia Libere (Highlight Free)
        const btnHighlight = document.getElementById('btn-highlight');
        if (btnHighlight) {
            btnHighlight.addEventListener('click', () => {
                highlightFree = !highlightFree;
                btnHighlight.classList.toggle('active-toggle', highlightFree);
                const campogioco = document.getElementById('campogioco');
                if (campogioco) campogioco.classList.toggle('highlight-free', highlightFree);
                playSound('select');
            });
        }

        // Tasto Nuova Partita Header
        const btnNewGame = document.getElementById('btn-new-game');
        if (btnNewGame) btnNewGame.addEventListener('click', window.chiediNuovaPartita);

        // Bottoni Modale Conferma Abbandono
        const btnNoContinua = document.getElementById('btn-no-continua');
        if (btnNoContinua) {
            btnNoContinua.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('schermo').style.display = 'none';
                document.getElementById('confermatermina').style.display = 'none';
            });
        }

        const btnSiTermina = document.getElementById('btn-si-termina');
        if (btnSiTermina) {
            btnSiTermina.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('confermatermina').style.display = 'none';
                window.apriModaleInizio();
            });
        }

        // Bottoni Modale Conferma Rimescolamento
        const btnNoRimescola = document.getElementById('btn-no-rimescola');
        if (btnNoRimescola) {
            btnNoRimescola.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('schermo').style.display = 'none';
                document.getElementById('confermarimescola').style.display = 'none';
            });
        }

        const btnSiRimescola = document.getElementById('btn-si-rimescola');
        if (btnSiRimescola) {
            btnSiRimescola.addEventListener('click', () => {
                document.querySelectorAll('#campogioco .finish-banner').forEach(b => b.remove());
                document.getElementById('schermo').style.display = 'none';
                document.getElementById('confermarimescola').style.display = 'none';
                shuffleRemainingTiles();
            });
        }

        // Tasti di scelta rapida da tastiera
        window.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') provideHint();
            if (e.key === 'z' || e.key === 'Z' || (e.ctrlKey && e.key === 'z')) undoMove();
            if (e.key === 's' || e.key === 'S') onShuffleButtonClick();
        });

        // Mostra modale inizio partita all'avvio
        window.apriModaleInizio();
    }

    // Avvio al caricamento della pagina
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEvents);
    } else {
        initEvents();
    }

})();
