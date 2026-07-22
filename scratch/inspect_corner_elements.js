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
    
    // Find all tags inside this group
    const tags = chunk.match(/<([a-z0-9]+)[\s\S]*?>/gi) || [];
    console.log(`\nCard [${id}]: total tags ${tags.length}`);
    tags.forEach((t, i) => {
        // Log tag type and id/transform/d/href if present
        const tagName = t.match(/<([a-z0-9]+)/i)[1];
        const tagId = (t.match(/id="([^"]+)"/) || [])[1] || '';
        if (tagName !== 'rect' && tagName !== 'image') {
            console.log(`  Tag #${i}: <${tagName} id="${tagId}"> -> ${t.substring(0, 150)}`);
        }
    });
});
