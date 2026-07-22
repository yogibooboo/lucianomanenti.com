const fs = require('fs');
const svg = fs.readFileSync('napoletane.svg', 'utf8');

const figureIds = [
    'club_jack', 'club_queen', 'club_king',
    'diamond_jack', 'diamond_queen', 'diamond_king',
    'heart_jack', 'heart_queen', 'heart_king',
    'spade_jack', 'spade_queen', 'spade_king'
];

figureIds.forEach(id => {
    const startTag = `id="${id}"`;
    const startIdx = svg.indexOf(startTag);
    if (startIdx === -1) return;
    
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < svg.length; i++) {
        if (svg.substring(i, i+2) === '<g') depth++;
        if (svg.substring(i, i+4) === '</g>') {
            if (depth === 0) { endIdx = i + 4; break; }
            else { depth--; }
        }
    }
    const chunk = svg.substring(startIdx, endIdx);
    
    const pathMatches = chunk.match(/<path[\s\S]*?\/>/gi) || [];
    console.log(`\nCard [${id}]: has ${pathMatches.length} path tags:`);
    pathMatches.forEach((p, idx) => {
        const pathId = (p.match(/id="([^"]+)"/) || [])[1] || '';
        console.log(`  Path #${idx} (id=${pathId}): ${p.substring(0, 100)}...`);
    });
});
