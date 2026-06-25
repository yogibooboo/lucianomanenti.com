// Rail Rush v3 — Locomotion-inspired
// Fixed track layouts, player clicks switches to route trains

const CELL = 48;

// Direction helpers
const OPP = { N:'S', S:'N', E:'W', W:'E' };
const DELTA = { N:{r:-1,c:0}, S:{r:1,c:0}, E:{r:0,c:1}, W:{r:0,c:-1} };

// Track exit tables: given entry direction → exit direction
// For switches: array [state0_exits, state1_exits]
const EXITS = {
  H:  { W:'E', E:'W' },
  V:  { N:'S', S:'N' },
  NE: { S:'E', W:'N' },   // curve: from S→go E, from W→go N
  NW: { S:'W', E:'N' },   // curve: from S→go W, from E→go N
  SE: { N:'E', W:'S' },   // curve: from N→go E, from W→go S
  SW: { N:'W', E:'S' },   // curve: from N→go W, from E→go S
  // SWITCH types: two sets of exits depending on switchState
  // SW_H: switch on a horizontal track — state0: pass H, state1: divert via SW curve
  SW_H: [
    { W:'E', E:'W' },           // state 0: straight through
    { W:'S', N:'W', E:'S' },    // state 1: W entry→exits S (goes down), or via SW
  ],
  // SW_E_DOWN: switch where train from W can go E or S
  // Used at junction points on horizontal tracks
  JUNC: [
    { W:'E', E:'W', N:'S', S:'N' },  // state 0: all straight (H+V combined)
    { W:'S', S:'W', N:'E', E:'N' },  // state 1: cross-route
  ],
};

const SWITCH_CELLS = new Set(['SW_H','JUNC']);

const TRAIN_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#e67e22'];
const STA_LABELS   = ['A','B','C','D','E','F'];

// ─── GAME STATE ────────────────────────────────────────────────────────────
let canvas, ctx;
let COLS, ROWS;
let levelIdx = 0;
let score = 0;
let lives = 3;
let running = false;
let animFrame = null;
let lastTime = 0;
let gridMap = {};
let trains = [];
let stations = [];
let pendingTrains = [];
let elapsed = 0;
let delivered = 0;
let goal = 0;
let theme = 'meadow';
let speedMult = 1;

// ─── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  document.getElementById('btn-start').addEventListener('click', toggleStart);
  document.getElementById('btn-slow').addEventListener('click',  () => setSpeed(1));
  document.getElementById('btn-fast').addEventListener('click',  () => setSpeed(2));
  document.getElementById('message-btn').addEventListener('click', onNextLevel);
  canvas.addEventListener('click', onCanvasClick);

  setSpeed(1);
  loadLevel(0);
});

function setSpeed(s) {
  speedMult = s;
  document.getElementById('btn-slow').classList.toggle('active', s === 1);
  document.getElementById('btn-fast').classList.toggle('active', s === 2);
}

// ─── LEVEL LOADING ─────────────────────────────────────────────────────────
function loadLevel(idx) {
  levelIdx = idx;
  const def = LEVELS[idx % LEVELS.length];
  COLS = def.cols; ROWS = def.rows;
  theme = def.theme;
  goal = def.goal;
  delivered = 0; elapsed = 0; trains = [];

  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;

  gridMap = {};
  def.cells.forEach(([r, c, type]) => {
    gridMap[`${r},${c}`] = { type, switchState: 0 };
  });

  stations = def.stations.map(s => ({ ...s, done: false }));
  pendingTrains = def.trains.map(t => ({ ...t }));

  running = false;
  document.getElementById('level').textContent  = idx + 1;
  document.getElementById('score').textContent  = score;
  document.getElementById('lives').textContent  = lives;
  document.getElementById('goal').textContent   = `0/${goal}`;
  document.getElementById('btn-start').textContent = 'START';
  document.getElementById('btn-start').classList.remove('running');
  hideMessage();
  draw();
}

// ─── LEVEL DEFINITIONS ─────────────────────────────────────────────────────
//
// Layout philosophy:
//   • Trains always enter from col 0, going East
//   • The main horizontal track on a given row leads to a station on the right
//   • Switches (JUNC cells) sit ON the horizontal track and offer a vertical exit
//   • Vertical connectors (V cells + SE curve) bridge rows
//   • Player clicks JUNC cells to toggle: straight (pass) vs deviate (go down)
//
// JUNC state 0 = { W→E, E→W }   (train passes through horizontally)
// JUNC state 1 = { W→S }        (train from W diverts south)
//   After going S it hits a V column then a SE curve at the destination row
//   which turns it E toward the station on that row.

const LEVELS = [
  // ── LEVEL 1 ─ Meadow ────────────────────────────────────────────────────
  // 3 horizontal tracks (rows 2,5,8), 2 junction points (col 6 on rows 2 and 5)
  // Trains all enter row 2. Click junctions to route them to B or C stations.
  //
  //  row2: ─────[J1]──────── ➤ [STA A]
  //               ↓ (if J1 active)
  //  row5: ──────[J2]─────── ➤ [STA B]
  //               ↓ (if J2 active)
  //  row8: ─────────────────  ➤ [STA C]
  (() => {
    const cells = [];
    const H = (r, c1, c2) => { for(let c=c1;c<=c2;c++) cells.push([r,c,'H']); };
    const V = (r1, r2, c) => { for(let r=r1;r<=r2;r++) cells.push([r,c,'V']); };

    H(2, 1, 11);        // row 2 main track
    H(5, 1, 11);        // row 5 main track
    H(8, 1, 11);        // row 8 main track

    // Junction 1 at (2,6): pass E or divert S
    cells.push([2, 6, 'JUNC']);
    // Vertical from row2 down to row5
    V(3, 4, 6);
    // SE curve at (5,6) merges vertical into row5 going E
    cells.push([5, 6, 'SE']);

    // Junction 2 at (5,8): pass E or divert S
    cells.push([5, 8, 'JUNC']);
    // Vertical from row5 down to row8
    V(6, 7, 8);
    // SE curve at (8,8) merges into row8 going E
    cells.push([8, 8, 'SE']);

    return {
      label: 'Level 1 — Meadow', theme: 'meadow',
      cols: 14, rows: 11, goal: 6,
      cells,
      stations: [
        { r:2, c:12, color:0, label:'A' },
        { r:5, c:12, color:1, label:'B' },
        { r:8, c:12, color:2, label:'C' },
      ],
      trains: [
        { r:2, c:0, dir:'E', color:0, target:0, delay:800 },
        { r:2, c:0, dir:'E', color:1, target:1, delay:4000 },
        { r:2, c:0, dir:'E', color:2, target:2, delay:7200 },
        { r:2, c:0, dir:'E', color:0, target:0, delay:10400 },
        { r:2, c:0, dir:'E', color:1, target:1, delay:13600 },
        { r:2, c:0, dir:'E', color:2, target:2, delay:16800 },
      ],
    };
  })(),

  // ── LEVEL 2 ─ Desert ────────────────────────────────────────────────────
  // 4 rows, 3 junctions, faster trains
  (() => {
    const cells = [];
    const H = (r,c1,c2) => { for(let c=c1;c<=c2;c++) cells.push([r,c,'H']); };
    const V = (r1,r2,c) => { for(let r=r1;r<=r2;r++) cells.push([r,c,'V']); };

    [1,4,7,10].forEach(r => H(r, 1, 13));

    // Junctions and vertical connectors: col 5 connects rows 1→4, col 7 connects 4→7, col 9 connects 7→10
    [[1,4,5],[4,7,7],[7,10,9]].forEach(([rTop,rBot,c]) => {
      cells.push([rTop, c, 'JUNC']);
      V(rTop+1, rBot-1, c);
      cells.push([rBot, c, 'SE']);
    });

    return {
      label: 'Level 2 — Desert', theme: 'desert',
      cols: 16, rows: 12, goal: 8,
      cells,
      stations: [
        { r:1,  c:14, color:0, label:'A' },
        { r:4,  c:14, color:1, label:'B' },
        { r:7,  c:14, color:2, label:'C' },
        { r:10, c:14, color:3, label:'D' },
      ],
      trains: [0,1,2,3,0,1,2,3].map((color,i) => ({
        r:1, c:0, dir:'E', color, target:color, delay: 800 + i*3000
      })),
    };
  })(),

  // ── LEVEL 3 ─ Night City ────────────────────────────────────────────────
  (() => {
    const cells = [];
    const H = (r,c1,c2) => { for(let c=c1;c<=c2;c++) cells.push([r,c,'H']); };
    const V = (r1,r2,c) => { for(let r=r1;r<=r2;r++) cells.push([r,c,'V']); };

    [1,4,7].forEach(r => H(r, 1, 13));

    [[1,4,5],[4,7,9]].forEach(([rTop,rBot,c]) => {
      cells.push([rTop, c, 'JUNC']);
      V(rTop+1, rBot-1, c);
      cells.push([rBot, c, 'SE']);
    });
    // Extra junction on row1 col 9
    cells.push([1, 9, 'JUNC']);
    V(2, 3, 9);
    cells.push([4, 9, 'SE']);

    return {
      label: 'Level 3 — Night City', theme: 'night',
      cols: 16, rows: 9, goal: 9,
      cells,
      stations: [
        { r:1, c:14, color:0, label:'A' },
        { r:4, c:14, color:1, label:'B' },
        { r:7, c:14, color:2, label:'C' },
      ],
      trains: [0,1,2,0,1,2,0,1,2].map((color,i) => ({
        r:1, c:0, dir:'E', color, target:color, delay: 800 + i*2600
      })),
    };
  })(),

  // ── LEVEL 4 ─ Factory ───────────────────────────────────────────────────
  (() => {
    const cells = [];
    const H = (r,c1,c2) => { for(let c=c1;c<=c2;c++) cells.push([r,c,'H']); };
    const V = (r1,r2,c) => { for(let r=r1;r<=r2;r++) cells.push([r,c,'V']); };

    [1,4,7,10].forEach(r => H(r, 1, 13));

    [[1,4,4],[4,7,4],[7,10,4],[1,4,8],[4,7,8],[7,10,8]].forEach(([rTop,rBot,c]) => {
      cells.push([rTop, c, 'JUNC']);
      V(rTop+1, rBot-1, c);
      cells.push([rBot, c, 'SE']);
    });

    return {
      label: 'Level 4 — Factory', theme: 'factory',
      cols: 16, rows: 12, goal: 10,
      cells,
      stations: [
        { r:1,  c:14, color:0, label:'A' },
        { r:4,  c:14, color:1, label:'B' },
        { r:7,  c:14, color:2, label:'C' },
        { r:10, c:14, color:3, label:'D' },
      ],
      trains: [0,1,2,3,0,1,2,3,0,1].map((color,i) => ({
        r:1, c:0, dir:'E', color, target:color, delay: 800 + i*2400
      })),
    };
  })(),
];

// ─── GAME LOOP ──────────────────────────────────────────────────────────────
function toggleStart() {
  if (!running) {
    running = true;
    document.getElementById('btn-start').textContent = 'STOP';
    document.getElementById('btn-start').classList.add('running');
    lastTime = performance.now();
    animFrame = requestAnimationFrame(loop);
  } else {
    stopGame();
  }
}

function stopGame() {
  running = false;
  cancelAnimationFrame(animFrame);
  document.getElementById('btn-start').textContent = 'START';
  document.getElementById('btn-start').classList.remove('running');
}

function loop(ts) {
  if (!running) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.1) * speedMult;
  lastTime = ts;
  elapsed += dt * 1000;

  // Spawn
  pendingTrains = pendingTrains.filter(pt => {
    if (elapsed >= pt.delay) { spawnTrain(pt); return false; }
    return true;
  });

  updateTrains(dt);
  checkCollisions();
  draw();

  if (delivered >= goal) { levelComplete(); return; }
  animFrame = requestAnimationFrame(loop);
}

function spawnTrain(def) {
  const lvl = LEVELS[levelIdx % LEVELS.length];
  trains.push({
    r: def.r, c: def.c, dir: def.dir,
    color: def.color, target: def.target,
    progress: 0, speed: lvl.speed || 2.2,
    dead: false, arrived: false,
  });
}

function getExitsForCell(cell) {
  const raw = EXITS[cell.type];
  if (!raw) return {};
  if (Array.isArray(raw)) return raw[cell.switchState] || raw[0];
  return raw;
}

function updateTrains(dt) {
  trains.forEach(train => {
    if (train.dead || train.arrived) return;
    train.progress += dt * (train.speed || 2.2);

    while (train.progress >= 1 && !train.dead && !train.arrived) {
      train.progress -= 1;
      const d = DELTA[train.dir];
      const nr = train.r + d.r;
      const nc = train.c + d.c;

      // Off the grid
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
        if (!tryArrive(train, train.r, train.c)) killTrain(train);
        return;
      }

      train.r = nr; train.c = nc;
      if (tryArrive(train, nr, nc)) return;

      const cell = gridMap[`${nr},${nc}`];
      if (!cell) { killTrain(train); return; }

      const exits = getExitsForCell(cell);
      const entry = OPP[train.dir];
      const exitDir = exits[entry];
      if (!exitDir) { killTrain(train); return; }
      train.dir = exitDir;
    }
  });

  trains = trains.filter(t => !t.dead && !t.arrived);
}

function tryArrive(train, r, c) {
  const st = stations.find(s => s.r === r && s.c === c);
  if (!st) return false;
  if (st.color === train.color) {
    train.arrived = true;
    st.done = true;
    delivered++;
    score += 150 * (levelIdx + 1);
    document.getElementById('score').textContent = score;
    document.getElementById('goal').textContent = `${delivered}/${goal}`;
    trains = trains.filter(t => t !== train);
    return true;
  }
  // Wrong station → reverse
  train.dir = OPP[train.dir];
  return false;
}

function killTrain(train) {
  train.dead = true;
  lives = Math.max(0, lives - 1);
  document.getElementById('lives').textContent = lives;
  if (lives <= 0) gameOver();
}

function checkCollisions() {
  for (let i = 0; i < trains.length; i++) {
    for (let j = i+1; j < trains.length; j++) {
      const a = trains[i], b = trains[j];
      if (a.dead || b.dead) continue;
      if (a.r === b.r && a.c === b.c) {
        a.dead = b.dead = true;
        lives = Math.max(0, lives - 1);
        document.getElementById('lives').textContent = lives;
        if (lives <= 0) { gameOver(); return; }
      }
    }
  }
  trains = trains.filter(t => !t.dead);
}

function levelComplete() {
  stopGame();
  const hasNext = (levelIdx + 1) < LEVELS.length;
  showMessage('LEVEL COMPLETE!', `Delivered ${delivered}/${goal}  ·  Score: ${score}`, hasNext ? 'NEXT LEVEL' : 'PLAY AGAIN');
}

function gameOver() {
  stopGame();
  showMessage('GAME OVER', `Final Score: ${score}`, 'TRY AGAIN');
  document.getElementById('message-btn').onclick = () => {
    score = 0; lives = 3; loadLevel(0);
  };
}

function onNextLevel() {
  const next = (levelIdx + 1) < LEVELS.length ? levelIdx + 1 : 0;
  if (next === 0) { score = 0; lives = 3; }
  loadLevel(next);
}

// ─── SWITCH CLICK ──────────────────────────────────────────────────────────
function onCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left)  / CELL);
  const r = Math.floor((e.clientY - rect.top)   / CELL);
  const cell = gridMap[`${r},${c}`];
  if (!cell) return;
  if (SWITCH_CELLS.has(cell.type)) {
    cell.switchState = 1 - cell.switchState;
    if (!running) draw();
  }
}

// ─── THEMES ────────────────────────────────────────────────────────────────
const THEMES = {
  meadow:  { bg:'#4a7c59', tile:'#3d6b4a', ground:'#5a8a65', track:'#8B6914', rail:'#c8a020' },
  desert:  { bg:'#c8a060', tile:'#bc9050', ground:'#d4b070', track:'#7a5010', rail:'#c07820' },
  night:   { bg:'#1a1a3e', tile:'#202045', ground:'#252550', track:'#4090c0', rail:'#70c0f0' },
  factory: { bg:'#3a3a3a', tile:'#303030', ground:'#454545', track:'#888',    rail:'#ccc' },
};

// ─── DRAW ───────────────────────────────────────────────────────────────────
function draw() {
  const th = THEMES[theme] || THEMES.meadow;
  drawBg(th);
  drawTracks(th);
  drawStations();
  drawSpawnHints();
  drawTrains();
}

function drawBg(th) {
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = th.tile;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if ((r+c)%2===0) ctx.fillRect(c*CELL+1, r*CELL+1, CELL-2, CELL-2);

  // Decorations
  if (theme==='meadow')  drawDeco_meadow();
  if (theme==='desert')  drawDeco_desert();
  if (theme==='night')   drawDeco_night();
  if (theme==='factory') drawDeco_factory();
}

function decoAt(r, c) { return !gridMap[`${r},${c}`] && !stations.find(s=>s.r===r&&s.c===c); }

function drawDeco_meadow() {
  const trees = [];
  for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(decoAt(r,c) && (r+c*3)%7===0) trees.push([r,c]);
  trees.forEach(([r,c]) => {
    const x=c*CELL+CELL/2, y=r*CELL+CELL/2;
    ctx.fillStyle='#2d5a27'; ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3d7a35'; ctx.beginPath(); ctx.arc(x-2,y-3,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6b4226'; ctx.fillRect(x-2,y+9,4,6);
  });
  // Ponds
  [[2,10],[6,2],[3,12]].forEach(([r,c]) => {
    if(!decoAt(r,c)) return;
    const x=c*CELL+CELL/2, y=r*CELL+CELL/2;
    ctx.fillStyle='#2980b9'; ctx.beginPath(); ctx.ellipse(x,y,15,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(x-4,y-2,5,3,-0.3,0,Math.PI*2); ctx.fill();
  });
}

function drawDeco_desert() {
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if(!decoAt(r,c)) continue;
    if((r*5+c*3)%11!==0) continue;
    const x=c*CELL+CELL/2, y=r*CELL+CELL/2;
    ctx.strokeStyle='#5a8a30'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(x,y+10); ctx.lineTo(x,y-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-2); ctx.lineTo(x-7,y-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-2); ctx.lineTo(x+7,y-8); ctx.stroke();
  }
}

function drawDeco_night() {
  ctx.fillStyle='rgba(255,255,255,0.6)';
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if(!decoAt(r,c) || (r*7+c*11)%17!==0) continue;
    ctx.beginPath(); ctx.arc(c*CELL+CELL/2, r*CELL+CELL/2, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

function drawDeco_factory() {
  ctx.strokeStyle='#555'; ctx.lineWidth=2;
  for(let r=0;r<ROWS;r+=3) for(let c=0;c<COLS;c+=4) {
    if(!decoAt(r,c)) continue;
    const x=c*CELL+CELL/2, y=r*CELL+CELL/2;
    ctx.strokeRect(x-10,y-8,20,18);
  }
}

// ─── TRACK DRAWING ─────────────────────────────────────────────────────────
function drawTracks(th) {
  Object.entries(gridMap).forEach(([key, cell]) => {
    const [r,c] = key.split(',').map(Number);
    const x=c*CELL, y=r*CELL, m=CELL/2;

    // Ground under track
    ctx.fillStyle = th.ground;
    ctx.fillRect(x+2, y+2, CELL-4, CELL-4);

    const isSwitch = SWITCH_CELLS.has(cell.type);

    if (isSwitch) {
      // Draw both paths: active bright, inactive dim
      const exitSets = EXITS[cell.type];
      if (Array.isArray(exitSets)) {
        // Inactive path (dim)
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#fff';
        drawExitSet(exitSets[1 - cell.switchState], x, y, m);
        ctx.globalAlpha = 1;
        // Active path
        ctx.strokeStyle = cell.switchState === 0 ? '#e67e22' : '#27ae60';
        drawExitSet(exitSets[cell.switchState], x, y, m);
      }
      // Dashed border to signal clickable
      ctx.strokeStyle = cell.switchState === 0 ? '#e67e22' : '#27ae60';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      ctx.strokeRect(x+3, y+3, CELL-6, CELL-6);
      ctx.setLineDash([]);
      // State dot
      ctx.fillStyle = cell.switchState === 0 ? '#e67e22' : '#27ae60';
      ctx.beginPath(); ctx.arc(x+CELL-9, y+9, 5, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.strokeStyle = th.rail;
      drawExitSet(EXITS[cell.type], x, y, m);
    }

    drawSleepers(x, y, m, cell, th);
  });
}

function drawExitSet(exits, x, y, m) {
  if (!exits) return;
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  const done = new Set();
  Object.entries(exits).forEach(([from, to]) => {
    const key = [from,to].sort().join('');
    if (done.has(key)) return;
    done.add(key);
    drawSeg(ctx, x, y, m, from, to);
  });
}

function drawSeg(ctx, x, y, m, from, to) {
  const P = { N:[x+m,y], S:[x+m,y+CELL], E:[x+CELL,y+m], W:[x,y+m] };
  const straight = (a,b) => (a==='N'&&b==='S')||(a==='S'&&b==='N')||(a==='E'&&b==='W')||(a==='W'&&b==='E');

  if (straight(from, to)) {
    ctx.beginPath();
    ctx.moveTo(...P[from]);
    ctx.lineTo(...P[to]);
    ctx.stroke();
    return;
  }

  // Corner arc
  const corners = { NE:[x,y], NW:[x+CELL,y], SE:[x,y+CELL], SW:[x+CELL,y+CELL] };
  const arcParams = {
    'NE': [corners.NE, Math.PI,    Math.PI*1.5, false],
    'NW': [corners.NW, Math.PI*1.5, Math.PI*2,  false],
    'SE': [corners.SE, Math.PI*0.5, Math.PI,    true],
    'SW': [corners.SW, 0,           Math.PI*0.5, true],
  };
  const pairKey = (() => {
    if ((from==='N'&&to==='E')||(from==='E'&&to==='N')) return 'NE';
    if ((from==='N'&&to==='W')||(from==='W'&&to==='N')) return 'NW';
    if ((from==='S'&&to==='E')||(from==='E'&&to==='S')) return 'SE';
    if ((from==='S'&&to==='W')||(from==='W'&&to==='S')) return 'SW';
    return null;
  })();
  if (!pairKey) return;
  const [corner, startA, endA, ccw] = arcParams[pairKey];
  ctx.beginPath();
  ctx.arc(corner[0], corner[1], m, startA, endA, ccw);
  ctx.stroke();
}

function drawSleepers(x, y, m, cell, th) {
  const exits = getExitsForCell(cell);
  const hasH = exits['W']==='E' || exits['E']==='W';
  const hasV = exits['N']==='S' || exits['S']==='N';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2.5;
  if (hasH) for(let i=1;i<=3;i++) {
    const sx = x+(CELL/4)*i;
    ctx.beginPath(); ctx.moveTo(sx,y+m-7); ctx.lineTo(sx,y+m+7); ctx.stroke();
  }
  if (hasV) for(let i=1;i<=3;i++) {
    const sy = y+(CELL/4)*i;
    ctx.beginPath(); ctx.moveTo(x+m-7,sy); ctx.lineTo(x+m+7,sy); ctx.stroke();
  }
}

// ─── STATIONS ──────────────────────────────────────────────────────────────
function drawStations() {
  stations.forEach(st => {
    const x=st.c*CELL, y=st.r*CELL;
    const col = TRAIN_COLORS[st.color];
    ctx.fillStyle = st.done ? '#1a3a1a' : '#1a1a3a';
    ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);
    ctx.fillStyle = col; ctx.fillRect(x+6,y+6,CELL-12,8);
    ctx.fillStyle = st.done ? '#2ecc71' : col;
    ctx.font = `bold ${Math.round(CELL*0.38)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.done ? '✓' : st.label, x+CELL/2, y+CELL*0.65);
  });
}

// ─── SPAWN HINTS ───────────────────────────────────────────────────────────
function drawSpawnHints() {
  const now = elapsed;
  pendingTrains.forEach(pt => {
    const timeLeft = pt.delay - now;
    if (timeLeft > 2000) return;
    const x=pt.c*CELL, y=pt.r*CELL;
    const col = TRAIN_COLORS[pt.color];
    ctx.globalAlpha = 0.5 + 0.5*Math.abs(Math.sin(now/200));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x+2,  y+CELL/2-9);
    ctx.lineTo(x+2,  y+CELL/2+9);
    ctx.lineTo(x+18, y+CELL/2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ─── TRAINS ────────────────────────────────────────────────────────────────
function drawTrains() {
  trains.forEach(train => {
    if (train.dead || train.arrived) return;
    const d = DELTA[train.dir];
    const p = train.progress;
    const px = (train.c + d.c*p)*CELL + CELL/2;
    const py = (train.r + d.r*p)*CELL + CELL/2;
    const col = TRAIN_COLORS[train.color];
    const angle = {N:-Math.PI/2, S:Math.PI/2, E:0, W:Math.PI}[train.dir];

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-15, 7, 30, 6);

    // Body
    ctx.fillStyle = col;
    roundRect(ctx, -16, -10, 32, 20, 4); ctx.fill();

    // Cab
    ctx.fillStyle = lighten(col, 45);
    roundRect(ctx, 6, -8, 10, 16, 3); ctx.fill();

    // Window
    ctx.fillStyle = 'rgba(180,230,255,0.85)';
    ctx.fillRect(8,-6,7,7);

    // Chimney
    ctx.fillStyle = '#222';
    ctx.fillRect(-12,-15,6,6);
    ctx.fillStyle = '#555';
    ctx.fillRect(-13,-17,8,4);

    // Wheels
    [-7,5].forEach(ox => {
      ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(ox,11,4.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#999'; ctx.beginPath(); ctx.arc(ox,11,2,0,Math.PI*2); ctx.fill();
    });

    ctx.restore();

    // Target label floating above
    const tgt = stations[train.target];
    if (tgt) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(tgt.label, px, py-20);
      ctx.fillStyle = TRAIN_COLORS[train.color];
      ctx.fillText(tgt.label, px, py-20);
    }
  });
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function lighten(hex, amt) {
  const n=parseInt(hex.slice(1),16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&255)+amt)},${Math.min(255,(n&255)+amt)})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function showMessage(title, body, btn) {
  document.getElementById('message-title').textContent = title;
  document.getElementById('message-body').textContent  = body;
  document.getElementById('message-btn').textContent   = btn;
  document.getElementById('message-btn').onclick = onNextLevel;
  document.getElementById('message-overlay').classList.remove('hidden');
}

function hideMessage() {
  document.getElementById('message-overlay').classList.add('hidden');
}
