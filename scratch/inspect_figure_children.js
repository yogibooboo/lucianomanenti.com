const fs = require('fs');
const svg = fs.readFileSync('napoletane.svg', 'utf8');

function inspectGroup(id) {
    const startTag = `id="${id}"`;
    const startIdx = svg.indexOf(startTag);
    if (startIdx === -1) return;
    
    // Find closing group tag </g>
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < svg.length; i++) {
        if (svg.substring(i, i+2) === '<g') depth++;
        if (svg.substring(i, i+4) === '</g>') {
            if (depth === 0) {
                endIdx = i + 4;
                break;
            } else {
                depth--;
            }
        }
    }
    const groupContent = svg.substring(startIdx, endIdx);
    console.log(`=== GROUP ${id} (Length: ${groupContent.length}) ===`);

    // Search for text, path, or sub-groups in groupContent
    const subIds = groupContent.match(/id="[^"]+"/g);
    console.log("Sub-IDs in group:", subIds ? subIds.slice(0, 15) : []);
    
    // Search for text tags
    const textMatches = groupContent.match(/<text[\s\S]*?<\/text>/g);
    console.log("Text elements:", textMatches);
}

inspectGroup('club_jack');
inspectGroup('club_queen');
inspectGroup('club_king');
