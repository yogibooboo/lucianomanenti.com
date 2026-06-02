// klondike.js v1.18

var CUORI = 'C', QUADRI = 'Q', FIORI = 'F', PICCHE = 'P';
var SEMI = [FIORI, QUADRI, CUORI, PICCHE];
var valoreseme = { 'F': 0, 'Q': 1, 'C': 2, 'P': 3 };
var SPRITE_W = 71, SPRITE_H = 96;  // dimensioni cella nello sprite sheet

// Layout adattivo: carte grandi su smartphone, originali su tablet/desktop
var _isPhone = Math.min(screen.width, screen.height) < 600;

var CARD_W  = _isPhone ? 130 : 85;
var CARD_H  = _isPhone ? 176 : 115;
var COL_PITCH = _isPhone ? 134 : 140;
var COL_X   = _isPhone ? [10, 144, 278, 412, 546, 680, 814]
                       : [50, 190, 330, 470, 610, 750, 890];
var STOCK_X = _isPhone ? 680 : 750,  STOCK_Y = 12;
var WASTE_X = _isPhone ? 814 : 890,  WASTE_Y = 12;
var FOUND_X = _isPhone ? [10, 144, 278, 412] : [50, 190, 330, 470];
var FOUND_Y = 12;
var TAB_Y   = _isPhone ? 200 : 135;
var FD_PITCH = _isPhone ? 14 : 22;
var FU_PITCH = _isPhone ? 40 : 30;
var ANIM_DUR = 220; // ms per card flight
var DRAG_THRESHOLD = 8;

if (_isPhone) {
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.pulsantecomments').forEach(function(btn) {
            btn.style.fontSize   = '24px';
            btn.style.height     = '40px';
            btn.style.lineHeight = '40px';
            btn.style.width      = '130px';
            btn.style.top        = '692px';
            var href = btn.getAttribute('href') || '';
            if (href.indexOf('aboutme') !== -1) {
                btn.style.left = '215px';
            } else if (href.indexOf('regole') !== -1) {
                btn.style.left = '358px';
            }
        });

        // Pulsantiera giochi: primo tap espande, secondo tap naviga
        var linkGiochi = document.querySelector('.link-giochi');
        if (linkGiochi) {
            var lnkExpanded = false;
            var lnkCooldown = false;

            // Intercetta touchend per espandere e bloccare il click sintetico successivo
            linkGiochi.addEventListener('touchend', function(e) {
                if (!lnkExpanded) {
                    e.preventDefault();      // blocca il click sintetico
                    e.stopPropagation();
                    lnkExpanded = true;
                    lnkCooldown = true;
                    linkGiochi.classList.add('link-giochi-open');
                    setTimeout(function() { lnkCooldown = false; }, 500);
                }
            }, true);

            // Blocca anche eventuali click residui durante il cooldown
            linkGiochi.addEventListener('click', function(e) {
                if (!lnkExpanded || lnkCooldown) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            // Collassa toccando fuori
            document.addEventListener('touchend', function(e) {
                if (lnkExpanded && !lnkCooldown && !linkGiochi.contains(e.target)) {
                    lnkExpanded = false;
                    linkGiochi.classList.remove('link-giochi-open');
                }
            });
        }
    });
}

var canvas, ctx, spriteImg, spriteImgBlu;
var showFaceDown = false;

var stock = [], waste = [], foundations = [[], [], [], []], tableau = [];
var moves = 0, seconds = 0, gameWon = false;
var timerInterval = null;
var undoStack = [];
var dragging = null;
var dragStart = null;

// anim = { cards, sx, sy, tx, ty, cx, cy, t0, dur, skip, done }
// skip = { type:'stock'|'waste'|'found'|'tab', fi?, col?, ci? }
var anim = null;
var autoCompleting = false;
var acDrawsSincePlay = 0;

// --- Records (localStorage) ---
var cachedRecords = { daily: null, ever: null };

function fmtTime(secs) {
    var m = Math.floor(secs / 60), s = secs % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function loadRecords() {
    var daily = null, ever = null;
    try {
        var today = new Date().toISOString().slice(0, 10);
        var ds = localStorage.getItem('klondike_best_daily');
        if (ds) { ds = JSON.parse(ds); if (ds.date === today) daily = ds; }
        var es = localStorage.getItem('klondike_best_ever');
        if (es) ever = JSON.parse(es);
    } catch(ex) {}
    return { daily: daily, ever: ever };
}

function saveRecords(secs, mvs) {
    var result = { newDaily: false, newEver: false };
    try {
        var today = new Date().toISOString().slice(0, 10);
        var isBetter = function(cur, cand) {
            return !cur || cand.secs < cur.secs || (cand.secs === cur.secs && cand.moves < cur.moves);
        };
        var cand = { secs: secs, moves: mvs };
        var ds = localStorage.getItem('klondike_best_daily');
        var daily = ds ? JSON.parse(ds) : null;
        if (!daily || daily.date !== today) daily = null;
        if (isBetter(daily, cand)) {
            localStorage.setItem('klondike_best_daily', JSON.stringify({ date: today, secs: secs, moves: mvs }));
            result.newDaily = true;
        }
        var es = localStorage.getItem('klondike_best_ever');
        var ever = es ? JSON.parse(es) : null;
        if (isBetter(ever, cand)) {
            localStorage.setItem('klondike_best_ever', JSON.stringify({ secs: secs, moves: mvs }));
            result.newEver = true;
        }
    } catch(ex) {}
    cachedRecords = loadRecords();
    return result;
}

function Card(n, s) { this.numero = n; this.seme = s; this.faceUp = false; }
Card.prototype.isRed = function() { return this.seme === CUORI || this.seme === QUADRI; };
// Trova il mazzetto di fondamenta corretto per una carta:
// - se già esiste un mazzetto dello stesso seme → quello
// - se la carta è un asso → primo slot vuoto
// - altrimenti → -1 (nessuna destinazione valida)
function getFoundIdx(card) {
    for (var fi = 0; fi < 4; fi++)
        if (foundations[fi].length > 0 && foundations[fi][0].seme === card.seme) return fi;
    if (card.numero === 1)
        for (var fi = 0; fi < 4; fi++)
            if (foundations[fi].length === 0) return fi;
    return -1;
}

// --- Undo ---
function serializeState() {
    function ser(col) {
        return col.map(function(c) { return c.numero + '|' + c.seme + '|' + (c.faceUp ? 1 : 0); });
    }
    return JSON.stringify({
        s: ser(stock), w: ser(waste),
        f: foundations.map(ser), t: tableau.map(ser), m: moves
    });
}
function deserializeState(str) {
    function des(col) {
        return col.map(function(s) {
            var p = s.split('|');
            var c = new Card(parseInt(p[0]), p[1]);
            c.faceUp = p[2] === '1';
            return c;
        });
    }
    var d = JSON.parse(str);
    stock = des(d.s); waste = des(d.w);
    foundations = d.f.map(des);
    tableau = d.t.map(des);
    moves = d.m;
}
function pushUndo() {
    undoStack.push(serializeState());
    if (undoStack.length > 100) undoStack.shift();
}
function doUndo() {
    if (anim) return;
    autoCompleting = false; acDrawsSincePlay = 0;
    if (!undoStack.length) return;
    deserializeState(undoStack.pop());
    dragging = null; dragStart = null;
    renderAll();
}

// --- Init ---
function initGame() {
    anim = null; autoCompleting = false; acDrawsSincePlay = 0;
    var deck = [];
    for (var si = 0; si < SEMI.length; si++)
        for (var n = 1; n <= 13; n++) deck.push(new Card(n, SEMI[si]));
    for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    tableau = [];
    for (var col = 0; col < 7; col++) {
        tableau.push([]);
        for (var row = 0; row <= col; row++) {
            var c = deck.pop(); c.faceUp = (row === col);
            tableau[col].push(c);
        }
    }
    stock = deck; waste = []; foundations = [[], [], [], []];
    moves = 0; seconds = 0; gameWon = false; dragging = null; dragStart = null; undoStack = [];
    cachedRecords = loadRecords();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() { if (!gameWon) { seconds++; renderAll(); } }, 1000);
    renderAll();
}

// --- Drawing ---
function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function drawCard(x, y, card, hilite) {
    if (!spriteImg || !spriteImg.complete || !spriteImg.naturalWidth) return;
    if (hilite) { ctx.save(); ctx.shadowColor = 'gold'; ctx.shadowBlur = 14; }
    // sorgente: coordinate fisse nel sprite (71×96), dest: CARD_W×CARD_H scalato
    var showVal = card.faceUp || showFaceDown;
    var img = (!card.faceUp && showFaceDown && spriteImgBlu && spriteImgBlu.complete) ? spriteImgBlu : spriteImg;
    var sx = showVal ? SPRITE_W * (card.numero - 1) : SPRITE_W * 16;
    var sy = showVal ? SPRITE_H * valoreseme[card.seme] : 0;
    ctx.drawImage(img, sx, sy, SPRITE_W, SPRITE_H, x, y, CARD_W, CARD_H);
    if (hilite) ctx.restore();
}
function drawEmptySlot(x, y, label) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    rrect(x, y, CARD_W, CARD_H, 7); ctx.stroke();
    if (label) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x + CARD_W / 2, y + CARD_H / 2);
    }
    ctx.restore();
}
function getColPitches(col) {
    if (!_isPhone) return { fd: FD_PITCH, fu: FU_PITCH };
    var col_arr = tableau[col];
    var nd = 0, nu = 0;
    for (var i = 0; i < col_arr.length - 1; i++) {
        if (col_arr[i].faceUp) nu++;
        else nd++;
    }
    var avail = canvas.height - TAB_Y - CARD_H;
    var needed = nd * FD_PITCH + nu * FU_PITCH;
    if (needed <= avail) return { fd: FD_PITCH, fu: FU_PITCH };
    var fu = Math.max(FD_PITCH, Math.floor((avail - nd * FD_PITCH) / Math.max(nu, 1)));
    if (nu === 0 || nd * FD_PITCH + nu * fu <= avail) return { fd: FD_PITCH, fu: fu };
    var ratio = avail / needed;
    return { fd: Math.max(6, Math.floor(FD_PITCH * ratio)), fu: Math.max(6, Math.floor(FU_PITCH * ratio)) };
}
function getTabCardY(col, ci) {
    var p = getColPitches(col);
    var y = TAB_Y;
    for (var i = 0; i < ci; i++)
        y += (tableau[col][i].faceUp ? p.fu : p.fd);
    return y;
}

// --- Render ---
function renderAll() {
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var sk = anim ? anim.skip : null;

    // Stock
    var sIdx = stock.length - 1 - (sk && sk.type === 'stock' ? 1 : 0);
    if (sIdx >= 0) drawCard(STOCK_X, STOCK_Y, stock[sIdx], false);
    else drawEmptySlot(STOCK_X, STOCK_Y, '↺');

    // Waste
    var wHide = (dragging && dragging.started && dragging.source === 'waste');
    var wIdx = waste.length - 1 - ((sk && sk.type === 'waste') || wHide ? 1 : 0);
    if (wIdx >= 0) drawCard(WASTE_X, WASTE_Y, waste[wIdx], false);
    else drawEmptySlot(WASTE_X, WASTE_Y, '');

    // Foundations (slot dinamici: 'A' su slot vuoto)
    for (var fi = 0; fi < 4; fi++) {
        var fSkip = sk && sk.type === 'found' && sk.fi === fi;
        var fHide = dragging && dragging.started && dragging.source === 'found' && dragging.fi === fi;
        var fIdx = foundations[fi].length - 1 - ((fSkip || fHide) ? 1 : 0);
        if (fIdx >= 0) drawCard(FOUND_X[fi], FOUND_Y, foundations[fi][fIdx], false);
        else drawEmptySlot(FOUND_X[fi], FOUND_Y, 'A');
    }

    // Tableau
    for (var col = 0; col < 7; col++) {
        var tSkipFrom = (sk && sk.type === 'tab' && sk.col === col) ? sk.ci : Infinity;
        if (tableau[col].length === 0) {
            drawEmptySlot(COL_X[col], TAB_Y, 'K');
            continue;
        }
        var drawn = false;
        for (var ci = 0; ci < tableau[col].length; ci++) {
            if (ci >= tSkipFrom) continue;
            // also skip dragged cards (solo se il drag è davvero iniziato)
            if (dragging && dragging.started && dragging.source === 'tab' && dragging.tabCol === col && ci >= dragging.cardIdx) continue;
            drawCard(COL_X[col], getTabCardY(col, ci), tableau[col][ci], false);
            drawn = true;
        }
        // If entire column is skipped (flying) and nothing drawn, show empty slot
        if (!drawn && tSkipFrom === 0) drawEmptySlot(COL_X[col], TAB_Y, 'K');
    }

    // Dragging cards: solo dopo che il cursore si è mosso oltre la soglia
    if (dragging && dragging.started) {
        for (var di = 0; di < dragging.cards.length; di++)
            drawCard(dragging.curX, dragging.curY + di * FU_PITCH, dragging.cards[di], true);
    }

    // Flying cards (animation overlay)
    if (anim && anim.cx !== undefined) {
        for (var ai = 0; ai < anim.cards.length; ai++)
            drawCard(anim.cx, anim.cy + ai * FU_PITCH, anim.cards[ai], false);
    }

    // HUD — riquadro in basso a sinistra
    var LANG = window.currentLang || 'it';
    var isIT = LANG === 'it';
    var LH = 18, PAD = 8, BOX_W = 196;
    var BOX_H = 3 * LH + PAD * 2;
    var BOX_X = 10, BOX_Y = canvas.height - BOX_H - 10;
    var dr = cachedRecords.daily, er = cachedRecords.ever;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    rrect(BOX_X, BOX_Y, BOX_W, BOX_H, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((isIT ? 'Mosse: ' : 'Moves: ') + moves + '   ' + fmtTime(seconds),
        BOX_X + PAD, BOX_Y + PAD);
    ctx.fillText((isIT ? 'Oggi:   ' : 'Today:  ') + (dr ? fmtTime(dr.secs) + '  (' + dr.moves + ')' : '–'),
        BOX_X + PAD, BOX_Y + PAD + LH);
    ctx.fillText('Record: ' + (er ? fmtTime(er.secs) + '  (' + er.moves + ')' : '–'),
        BOX_X + PAD, BOX_Y + PAD + LH * 2);
    ctx.restore();
}

// --- Animation ---
function animStep(ts) {
    if (!anim) return;
    var t = Math.min(1, (ts - anim.t0) / anim.dur);
    // ease-out cubic: decelerates as it lands
    var e = 1 - Math.pow(1 - t, 3);
    anim.cx = anim.sx + (anim.tx - anim.sx) * e;
    anim.cy = anim.sy + (anim.ty - anim.sy) * e;
    renderAll();
    if (t < 1) {
        requestAnimationFrame(animStep);
    } else {
        var done = anim.done;
        anim = null;
        done();
    }
}

// Start a card-flight animation; doneFn is called when complete (should apply state + renderAll)
function fly(cards, fromX, fromY, toX, toY, skip, doneFn, dur) {
    anim = {
        cards: cards,
        sx: fromX, sy: fromY,
        tx: toX,   ty: toY,
        cx: fromX, cy: fromY,
        t0: performance.now(),
        dur: dur || ANIM_DUR,
        skip: skip || {},
        done: doneFn
    };
    requestAnimationFrame(animStep);
}

// --- Hit testing ---
function hitPile(mx, my, x, y) {
    return mx >= x && mx < x + CARD_W && my >= y && my < y + CARD_H;
}
function getTarget(mx, my) {
    if (hitPile(mx, my, STOCK_X, STOCK_Y)) return { type: 'stock' };
    if (waste.length > 0 && hitPile(mx, my, WASTE_X, WASTE_Y)) return { type: 'waste' };
    for (var fi = 0; fi < 4; fi++)
        if (hitPile(mx, my, FOUND_X[fi], FOUND_Y)) return { type: 'found', fi: fi };
    for (var col = 0; col < 7; col++) {
        if (mx < COL_X[col] || mx >= COL_X[col] + CARD_W) continue;
        var len = tableau[col].length;
        if (len === 0) {
            if (my >= TAB_Y && my < TAB_Y + CARD_H) return { type: 'tabEmpty', col: col };
            continue;
        }
        for (var ci = len - 1; ci >= 0; ci--) {
            var cy = getTabCardY(col, ci);
            var nextY = (ci === len - 1) ? cy + CARD_H : getTabCardY(col, ci + 1);
            if (my >= cy && my < nextY) return { type: 'tab', col: col, ci: ci };
        }
    }
    return null;
}
function getDropTarget(mx, my) {
    for (var fi = 0; fi < 4; fi++)
        if (hitPile(mx, my, FOUND_X[fi], FOUND_Y)) return { type: 'found', fi: fi };
    if (my >= TAB_Y - 40)
        for (var col = 0; col < 7; col++)
            if (mx >= COL_X[col] - 14 && mx < COL_X[col] + CARD_W + 14)
                return { type: 'tab', col: col };
    return null;
}

// --- Move validation ---
function canTableau(card, col) {
    if (tableau[col].length === 0) return card.numero === 13;
    var top = tableau[col][tableau[col].length - 1];
    return top.faceUp && card.isRed() !== top.isRed() && card.numero === top.numero - 1;
}
function canFoundation(card, fi) {
    var f = foundations[fi];
    if (f.length === 0) return card.numero === 1;          // qualsiasi asso in slot vuoto
    if (f[0].seme !== card.seme) return false;             // seme sbagliato
    return card.numero === f[f.length - 1].numero + 1;
}

// --- Source helpers ---
function buildSkip(src) {
    if (src.source === 'waste') return { type: 'waste' };
    if (src.source === 'found') return { type: 'found', fi: src.fi };
    return { type: 'tab', col: src.tabCol, ci: src.cardIdx };
}
function applyRemove(src) {
    if (src.source === 'waste') {
        waste.pop();
    } else if (src.source === 'found') {
        foundations[src.fi].pop();
    } else {
        tableau[src.tabCol].splice(src.cardIdx);
        var col = tableau[src.tabCol];
        if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
    }
}

function fmtTime(secs) {
    var m = Math.floor(secs / 60), s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function buildWinRecordHtml(newFlags) {
    var isAmazon = window.ENABLE_AMAZON_ON_FINISH;
    var isEn = document.documentElement.lang === 'en';
    var rec = cachedRecords;
    var movesWord = isEn ? 'moves' : 'mosse';
    var newWord   = isEn ? 'new!' : 'nuovo!';
    var labelDay  = isEn ? 'Daily record'    : 'Rec. giornaliero';
    var labelEver = isEn ? 'All-time record' : 'Rec. assoluto';

    var dailyTxt  = rec.daily ? (fmtTime(rec.daily.secs) + (isAmazon ? '<br>' : ' &nbsp; ') + rec.daily.moves + ' ' + movesWord) : '—';
    var everTxt   = rec.ever  ? (fmtTime(rec.ever.secs)  + (isAmazon ? '<br>' : ' &nbsp; ') + rec.ever.moves  + ' ' + movesWord) : '—';

    var styleRecords = isAmazon ? 'position: absolute; top: 0px; left: 500px; width: 200px; height: 280px; padding: 15px 12px; box-sizing: border-box; font-family: Slackey, sans-serif; color: #fff; background: rgba(0,0,0,0.18); border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: center; gap: 8px;' : '';
    var styleRow = isAmazon ? 'padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.08); margin: 0; min-height: 90px; box-sizing: border-box;' : '';
    var styleLabel = isAmazon ? 'font-size: 13px; opacity: 0.75; display: block; margin-bottom: 2px; line-height: 1.2;' : '';
    var styleBottom = isAmazon ? 'display: block; position: relative;' : '';
    var styleVal = isAmazon ? 'font-size: 18px; line-height: 1.2; display: block;' : '';
    var styleStar = isAmazon ? 'font-size: 14px; color: gold; text-shadow: 0 0 6px rgba(255,215,0,0.7); display: block; margin-top: 2px;' : '';

    var html = '<div class="win-records" style="' + styleRecords + '">';
    
    var rowClass1 = 'win-rec-row' + (newFlags.newDaily ? ' win-rec-new' : '');
    var rowStyle1 = styleRow + (newFlags.newDaily && isAmazon ? ' background: rgba(255, 215, 0, 0.22); outline: 1px solid rgba(255, 215, 0, 0.5);' : '');
    html += '<div class="' + rowClass1 + '" style="' + rowStyle1 + '">';
    html += '<span class="win-rec-label" style="' + styleLabel + '">' + labelDay + '</span>';
    html += '<div class="win-rec-bottom" style="' + styleBottom + '">';
    html += '<span class="win-rec-val" style="' + styleVal + '">' + dailyTxt + '</span>';
    if (newFlags.newDaily) html += '<span class="win-rec-star" style="' + styleStar + '">&#9733; ' + newWord + '</span>';
    html += '</div></div>';
    
    var rowClass2 = 'win-rec-row' + (newFlags.newEver ? ' win-rec-new' : '');
    var rowStyle2 = styleRow + (newFlags.newEver && isAmazon ? ' background: rgba(255, 215, 0, 0.22); outline: 1px solid rgba(255, 215, 0, 0.5);' : '');
    html += '<div class="' + rowClass2 + '" style="' + rowStyle2 + '">';
    html += '<span class="win-rec-label" style="' + styleLabel + '">' + labelEver + '</span>';
    html += '<div class="win-rec-bottom" style="' + styleBottom + '">';
    html += '<span class="win-rec-val" style="' + styleVal + '">' + everTxt + '</span>';
    if (newFlags.newEver) html += '<span class="win-rec-star" style="' + styleStar + '">&#9733; ' + newWord + '</span>';
    html += '</div></div>';
    
    html += '</div>';
    return html;
}

// --- Win & sounds ---
function checkWin() {
    for (var fi = 0; fi < 4; fi++) if (foundations[fi].length < 13) return;
    gameWon = true;
    if (timerInterval) clearInterval(timerInterval);
    var newFlags = saveRecords(seconds, moves);
    playSound('tada');
    renderAll();
    setTimeout(function() {
        var box = document.getElementById('haivinto');
        var existing = box.querySelector('.win-records');
        if (existing) existing.remove();
        box.insertAdjacentHTML('beforeend', buildWinRecordHtml(newFlags));

        if (window.ENABLE_AMAZON_ON_FINISH) {
            if (typeof setupAmazonFinishBanner === 'function') {
                setupAmazonFinishBanner('haivinto', {
                    modalStyle: {
                        width: '700px',
                        height: '340px',
                        left: '162px',
                        backgroundPosition: 'left top',
                        backgroundSize: '500px 280px',
                        overflow: 'visible'
                    },
                    targetTop: 310,
                    bannerHeight: 300,
                    bannerTopOffset: 305,
                    leftOffset: 0,
                    showVediCarte: false,
                    onSetupButtons: function (modal) {
                        var buttons = modal.querySelectorAll('button');
                        for (var i = 0; i < buttons.length; i++) {
                            buttons[i].style.top = '285px';
                            buttons[i].style.width = '280px';
                            buttons[i].style.fontSize = '24px';
                            buttons[i].style.left = '210px';
                        }
                    }
                });
            }
        } else {
            // Ripristina layout originale se Amazon non è attivo
            box.style.width = '';
            box.style.height = ''; 
            box.style.top = ''; 
            box.style.left = '';
            box.style.backgroundPosition = '';
            box.style.backgroundSize = '';
            box.style.overflow = '';
            var buttons = box.querySelectorAll('button');
            for (var b = 0; b < buttons.length; b++) {
                if (buttons[b].className !== 'btn-vedi-carte') {
                    buttons[b].style.top = ''; 
                    buttons[b].style.width = ''; 
                    buttons[b].style.fontSize = ''; 
                    buttons[b].style.left = '110px'; 
                }
            }
        }
        document.getElementById('schermo').style.display = 'block';
        box.style.display = 'block';
    }, 800);
}
function confirmNewGame() {
    if (moves === 0) {
        location.reload();
        return;
    }
    var box = document.getElementById('confermatermina');
    if (!box) return;

    if (window.ENABLE_AMAZON_ON_FINISH) {
        if (typeof setupAmazonFinishBanner === 'function') {
            setupAmazonFinishBanner('confermatermina', {
                modalStyle: {
                    width: '700px',
                    height: '180px',
                    left: '162px',
                    background: '#2d5a4a',
                    overflow: 'visible'
                },
                targetTop: 470,
                bannerHeight: 460,
                bannerTopOffset: 465,
                leftOffset: 0,
                showVediCarte: false,
                onSetupButtons: function (modal) {
                    var btnNo = modal.querySelector('.btn-no-continua');
                    var btnSi = modal.querySelector('.btn-si-termina');
                    if (btnNo) {
                        btnNo.style.top = '110px';
                        btnNo.style.width = '240px';
                        btnNo.style.left = '80px';
                        btnNo.style.fontSize = '20px';
                    }
                    if (btnSi) {
                        btnSi.style.top = '110px';
                        btnSi.style.width = '240px';
                        btnSi.style.left = '380px';
                        btnSi.style.fontSize = '20px';
                    }
                    var msg = modal.querySelector('.confirm-message');
                    if (msg) {
                        msg.style.marginTop = '20px';
                    }
                }
            });
        }
    } else {
        box.style.width = '';
        box.style.height = ''; 
        box.style.top = ''; 
        box.style.left = '';
        box.style.background = '';
        box.style.overflow = '';
        var btnNo = box.querySelector('.btn-no-continua');
        var btnSi = box.querySelector('.btn-si-termina');
        if (btnNo) {
            btnNo.style.top = ''; 
            btnNo.style.width = ''; 
            btnNo.style.fontSize = ''; 
            btnNo.style.left = '110px'; 
        }
        if (btnSi) {
            btnSi.style.top = ''; 
            btnSi.style.width = ''; 
            btnSi.style.fontSize = ''; 
            btnSi.style.left = '110px'; 
        }
        var msg = box.querySelector('.confirm-message');
        if (msg) {
            msg.style.marginTop = '';
        }
    }
    document.getElementById('schermo').style.display = 'block';
    box.style.display = 'block';
}
function playSound(id) {
    try { var el = document.getElementById(id); if (el) { el.currentTime = 0; el.play(); } } catch(e) {}
}

// --- Autocomplete ---
function checkAutoComplete() {
    if (gameWon || autoCompleting || anim) return;
    for (var col = 0; col < 7; col++)
        for (var ci = 0; ci < tableau[col].length; ci++)
            if (!tableau[col][ci].faceUp) return;
    var remaining = waste.length + stock.length;
    for (var col = 0; col < 7; col++) remaining += tableau[col].length;
    if (remaining === 0) return;
    autoCompleting = true;
    setTimeout(doAutoCompleteStep, 200);
}

function doAutoCompleteStep() {
    if (gameWon) { autoCompleting = false; return; }
    // Cerca waste
    if (waste.length > 0) {
        var card = waste[waste.length - 1];
        var fi = getFoundIdx(card);
        if (fi >= 0 && canFoundation(card, fi)) {
            acDrawsSincePlay = 0;
            fly([card], WASTE_X, WASTE_Y, FOUND_X[fi], FOUND_Y, { type: 'waste' }, function() {
                waste.pop(); foundations[fi].push(card);
                moves++; renderAll(); checkWin();
                if (!gameWon) setTimeout(doAutoCompleteStep, 80);
                else autoCompleting = false;
            }, 150);
            return;
        }
    }
    // Cerca colonne tableau
    for (var col = 0; col < 7; col++) {
        if (tableau[col].length === 0) continue;
        var card = tableau[col][tableau[col].length - 1];
        var fi = getFoundIdx(card);
        if (fi >= 0 && canFoundation(card, fi)) {
            acDrawsSincePlay = 0;
            var fromX = COL_X[col], fromY = getTabCardY(col, tableau[col].length - 1);
            var acCol = col;
            fly([card], fromX, fromY, FOUND_X[fi], FOUND_Y,
                { type: 'tab', col: col, ci: tableau[col].length - 1 },
                function() {
                    tableau[acCol].pop(); foundations[fi].push(card);
                    moves++; renderAll(); checkWin();
                    if (!gameWon) setTimeout(doAutoCompleteStep, 80);
                    else autoCompleting = false;
                }, 150);
            return;
        }
    }
    // Nessuna carta va in fondamenta: pesca dal mazzo
    if (stock.length > 0) {
        if (acDrawsSincePlay >= 52) { autoCompleting = false; return; } // loop guard
        acDrawsSincePlay++;
        var c = stock[stock.length - 1];
        fly([c], STOCK_X, STOCK_Y, WASTE_X, WASTE_Y, { type: 'stock' }, function() {
            stock.pop(); c.faceUp = true; waste.push(c);
            renderAll();
            setTimeout(doAutoCompleteStep, 80);
        }, 150);
        return;
    }
    // Mazzo vuoto: ricicla lo sfrido e riprova
    if (waste.length > 0) {
        if (acDrawsSincePlay >= 52) { autoCompleting = false; return; } // loop guard
        while (waste.length) { var w = waste.pop(); w.faceUp = false; stock.push(w); }
        renderAll();
        setTimeout(doAutoCompleteStep, 80);
        return;
    }
    autoCompleting = false;
}

// --- Mouse/touch ---
function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    var src = (e.touches && e.touches.length) ? e.touches[0]
            : (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0]
            : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
}

function onDown(e) {
    if (anim || autoCompleting) return;
    if (gameWon) return;
    e.preventDefault();
    var p = getPos(e), mx = p.x, my = p.y;
    var tgt = getTarget(mx, my);
    if (!tgt) return;

    // Stock click: flip or reset
    if (tgt.type === 'stock') {
        pushUndo();
        if (stock.length > 0) {
            var c = stock[stock.length - 1];
            // animate top stock card flying to waste
            fly([c], STOCK_X, STOCK_Y, WASTE_X, WASTE_Y, { type: 'stock' }, function() {
                stock.pop(); c.faceUp = true; waste.push(c);
                moves++; renderAll(); playSound('pesca'); checkAutoComplete();
            });
        } else if (waste.length > 0) {
            while (waste.length) { var c2 = waste.pop(); c2.faceUp = false; stock.push(c2); }
            moves++; renderAll();
        } else {
            undoStack.pop();
        }
        return;
    }

    if (tgt.type === 'waste') {
        if (!waste.length) return;
        dragStart = { x: mx, y: my, tgt: tgt };
        var ox = WASTE_X, oy = WASTE_Y;
        dragging = {
            source: 'waste',
            cards: [waste[waste.length - 1]],
            origX: ox, origY: oy,
            offsetX: mx - ox, offsetY: my - oy,
            curX: ox, curY: oy,
            started: false
        };
        return;   // nessuna renderAll: visivamente nulla cambia finché non si trascina
    }

    if (tgt.type === 'found') {
        var fi = tgt.fi;
        if (!foundations[fi].length) return;
        dragStart = { x: mx, y: my, tgt: tgt };
        var ox = FOUND_X[fi], oy = FOUND_Y;
        dragging = {
            source: 'found', fi: fi,
            cards: [foundations[fi][foundations[fi].length - 1]],
            origX: ox, origY: oy,
            offsetX: mx - ox, offsetY: my - oy,
            curX: ox, curY: oy,
            started: false
        };
        return;
    }

    if (tgt.type === 'tab') {
        var col = tgt.col, ci = tgt.ci;
        var card = tableau[col][ci];
        if (!card.faceUp) {
            if (ci === tableau[col].length - 1) {
                pushUndo(); card.faceUp = true; moves++; renderAll(); playSound('scarta'); checkAutoComplete();
            }
            return;
        }
        dragStart = { x: mx, y: my, tgt: tgt };
        var ox = COL_X[col], oy = getTabCardY(col, ci);
        dragging = {
            source: 'tab', tabCol: col, cardIdx: ci,
            cards: tableau[col].slice(ci),
            origX: ox, origY: oy,
            offsetX: mx - ox, offsetY: my - oy,
            curX: ox, curY: oy,
            started: false
        };
        return;
    }
}

function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    var p = getPos(e);
    var newX = p.x - dragging.offsetX;
    var newY = p.y - dragging.offsetY;
    if (!dragging.started) {
        var dx = newX - dragging.origX, dy = newY - dragging.origY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
            dragging.started = true;
    }
    if (dragging.started) {
        dragging.curX = newX;
        dragging.curY = newY;
        renderAll();
    }
}

function onUp(e) {
    if (!dragging) return;
    e.preventDefault();

    // Smart click: il drag non è mai partito → instrada la carta automaticamente
    if (dragStart) {
        var tgt = dragStart.tgt;
        dragStart = null;
        if (!dragging.started) {
            dragging = null;
            smartClick(tgt);
            return;
        }
    }

    // Drop with animation
    var dropX = dragging.curX + CARD_W / 2;
    var dropY = dragging.curY + CARD_H / 2;
    var drop = getDropTarget(dropX, dropY);

    if (drop) {
        var fromX = dragging.curX, fromY = dragging.curY;
        var cards = dragging.cards.slice();
        var src = { source: dragging.source, fi: dragging.fi, tabCol: dragging.tabCol, cardIdx: dragging.cardIdx };
        var skip = buildSkip(src);

        if (drop.type === 'found' && cards.length === 1 && canFoundation(cards[0], drop.fi)) {
            var toX = FOUND_X[drop.fi], toY = FOUND_Y;
            var dropFi = drop.fi;
            pushUndo();
            dragging = null;
            fly(cards, fromX, fromY, toX, toY, skip, function() {
                applyRemove(src);
                foundations[dropFi].push(cards[0]);
                moves++; checkWin(); renderAll(); playSound('scarta'); checkAutoComplete();
            });
            return;
        }
        if (drop.type === 'tab' && canTableau(cards[0], drop.col)) {
            if (!(src.source === 'tab' && src.tabCol === drop.col)) {
                var destCol = drop.col;
                var toX2 = COL_X[destCol], toY2 = getTabCardY(destCol, tableau[destCol].length);
                pushUndo();
                dragging = null;
                fly(cards, fromX, fromY, toX2, toY2, skip, function() {
                    applyRemove(src);
                    for (var di = 0; di < cards.length; di++) tableau[destCol].push(cards[di]);
                    moves++; renderAll(); playSound('pesca'); checkAutoComplete();
                });
                return;
            }
        }
    }

    dragging = null;
    renderAll();
}

// --- Smart click: click without drag routes to best destination ---
function smartClick(tgt) {
    if (anim) return;

    if (tgt.type === 'waste') {
        if (!waste.length) return;
        var card = waste[waste.length - 1];
        var fi = getFoundIdx(card);
        if (fi >= 0 && canFoundation(card, fi)) {
            var toX = FOUND_X[fi], toY = FOUND_Y;
            pushUndo();
            fly([card], WASTE_X, WASTE_Y, toX, toY, { type: 'waste' }, function() {
                waste.pop(); foundations[fi].push(card);
                moves++; checkWin(); renderAll(); playSound('scarta'); checkAutoComplete();
            });
            return;
        }
        for (var col = 0; col < 7; col++) {
            if (canTableau(card, col)) {
                var toX2 = COL_X[col], toY2 = getTabCardY(col, tableau[col].length);
                pushUndo();
                fly([card], WASTE_X, WASTE_Y, toX2, toY2, { type: 'waste' }, function() {
                    waste.pop(); tableau[col].push(card);
                    moves++; renderAll(); playSound('pesca'); checkAutoComplete();
                });
                return;
            }
        }

    } else if (tgt.type === 'tab') {
        var tcol = tgt.col, ci = tgt.ci;
        if (!tableau[tcol].length || !tableau[tcol][ci].faceUp) return;
        var cards = tableau[tcol].slice(ci);
        var fromX = COL_X[tcol], fromY = getTabCardY(tcol, ci);
        var isTop = (ci === tableau[tcol].length - 1);
        var skip = { type: 'tab', col: tcol, ci: ci };

        // Foundation first (top card only)
        if (isTop) {
            var card0 = cards[0];
            var fi0 = getFoundIdx(card0);
            if (fi0 >= 0 && canFoundation(card0, fi0)) {
                var toX3 = FOUND_X[fi0], toY3 = FOUND_Y;
                pushUndo();
                fly([card0], fromX, fromY, toX3, toY3, skip, function() {
                    tableau[tcol].splice(ci);
                    var src = tableau[tcol];
                    if (src.length > 0 && !src[src.length - 1].faceUp) src[src.length - 1].faceUp = true;
                    foundations[fi0].push(card0);
                    moves++; checkWin(); renderAll(); playSound('scarta'); checkAutoComplete();
                });
                return;
            }
        }

        // Then tableau (move sub-stack)
        for (var destCol = 0; destCol < 7; destCol++) {
            if (destCol === tcol) continue;
            if (canTableau(cards[0], destCol)) {
                var toX4 = COL_X[destCol], toY4 = getTabCardY(destCol, tableau[destCol].length);
                var snapCards = cards; // closure ok — we return immediately
                pushUndo();
                fly(snapCards, fromX, fromY, toX4, toY4, skip, function() {
                    tableau[tcol].splice(ci);
                    var src2 = tableau[tcol];
                    if (src2.length > 0 && !src2[src2.length - 1].faceUp) src2[src2.length - 1].faceUp = true;
                    for (var di = 0; di < snapCards.length; di++) tableau[destCol].push(snapCards[di]);
                    moves++; renderAll(); playSound('pesca'); checkAutoComplete();
                });
                return;
            }
        }

    } else if (tgt.type === 'found') {
        var fi2 = tgt.fi;
        if (!foundations[fi2].length) return;
        var card2 = foundations[fi2][foundations[fi2].length - 1];
        var fromX2 = FOUND_X[fi2], fromY2 = FOUND_Y;
        for (var col2 = 0; col2 < 7; col2++) {
            if (canTableau(card2, col2)) {
                var toX5 = COL_X[col2], toY5 = getTabCardY(col2, tableau[col2].length);
                pushUndo();
                fly([card2], fromX2, fromY2, toX5, toY5, { type: 'found', fi: fi2 }, function() {
                    foundations[fi2].pop(); tableau[col2].push(card2);
                    moves++; renderAll(); playSound('pesca'); checkAutoComplete();
                });
                return;
            }
        }
    }
}

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('canvasgioco');
    ctx = canvas.getContext('2d');

    spriteImg = new Image();
    spriteImg.onload = function() { initGame(); };
    spriteImg.src = 'images/scala40/conjollyplus.png';

    spriteImgBlu = new Image();
    spriteImgBlu.src = 'images/scala40/conjollyselblu.png';

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });

    document.getElementById('nuovo').addEventListener('click', confirmNewGame);
    document.getElementById('pulsante2').addEventListener('click', function() { doUndo(); });

    var btnScoperte = document.getElementById('scoperte');
    if (btnScoperte) btnScoperte.addEventListener('click', function() {
        showFaceDown = !showFaceDown;
        this.style.borderColor = showFaceDown ? 'yellow' : '';
        renderAll();
    });

    var btnDaily = document.getElementById('btn-reset-daily');
    if (btnDaily) btnDaily.addEventListener('click', function() {
        localStorage.removeItem('klondike_best_daily');
        cachedRecords = loadRecords();
        renderAll();
    });
    var btnEver = document.getElementById('btn-reset-ever');
    if (btnEver) btnEver.addEventListener('click', function() {
        localStorage.removeItem('klondike_best_ever');
        cachedRecords = loadRecords();
        renderAll();
    });

    var btnNo = document.querySelector('#confermatermina .btn-no-continua');
    if (btnNo) {
        btnNo.addEventListener('click', function() {
            document.getElementById('schermo').style.display = 'none';
            document.getElementById('confermatermina').style.display = 'none';
            // Reset modal styles
            var box = document.getElementById('confermatermina');
            box.style.width = '';
            box.style.height = ''; 
            box.style.top = ''; 
            box.style.left = '';
            box.style.background = '';
            box.style.overflow = '';
            var oldBanner = box.querySelector('.amazon-finish-banner');
            if (oldBanner) oldBanner.remove();
        });
    }

    var btnSi = document.querySelector('#confermatermina .btn-si-termina');
    if (btnSi) {
        btnSi.addEventListener('click', function() {
            location.reload();
        });
    }

    var winBtn = document.querySelector('#haivinto .bottone1');
    if (winBtn) winBtn.addEventListener('click', function() { location.reload(); });
});
