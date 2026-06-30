const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

// Let's search for every <rect x="996.13" y="1754.4" width="223.23" height="311.81"...>
// and traverse upwards to find its parent groups and their transform attributes.
// To do this simply, we split the file by `<rect x="996.13" y="1754.4" width="223.23" height="311.81"`
// and look backwards for the preceding <g> tags.

const parts = content.split('<rect x="996.13" y="1754.4" width="223.23" height="311.81"');
console.log("Total parts split:", parts.length);

const cardsList = [];

for (let i = 1; i < parts.length; i++) {
    // The content BEFORE this rect is parts[i-1]
    const beforeContent = parts[i-1];
    
    // Let's find the last two <g transform="..."> tags in beforeContent
    // Since beforeContent goes from the start of the file or previous rect to here,
    // we search from the end of beforeContent.
    const gMatches = [];
    const gRegex = /<g\b[^>]*\btransform="([^"]+)"[^>]*>/g;
    let m;
    while ((m = gRegex.exec(beforeContent))) {
        gMatches.push({
            transform: m[1],
            index: m.index,
            fullTag: m[0]
        });
    }
    
    // We need the last two matches
    if (gMatches.length >= 2) {
        const innerG = gMatches[gMatches.length - 1];
        const outerG = gMatches[gMatches.length - 2];
        
        // Let's parse the matrices
        // They can be matrix(a b c d e f) or translate(x y)
        // Let's extract numbers from transform
        function parseTransform(t) {
            const matMatch = t.match(/matrix\(([^)]+)\)/);
            if (matMatch) {
                return matMatch[1].trim().split(/[\s,]+/).map(Number);
            }
            const transMatch = t.match(/translate\(([^)]+)\)/);
            if (transMatch) {
                const [x, y] = transMatch[1].trim().split(/[\s,]+/).map(Number);
                return [1, 0, 0, 1, x, y || 0];
            }
            return [1, 0, 0, 1, 0, 0];
        }
        
        const innerM = parseTransform(innerG.transform);
        const outerM = parseTransform(outerG.transform);
        
        // Let's calculate the final position of the center of the rect:
        // Base rect center: cx = 996.13 + 223.23/2 = 1107.745
        // cy = 1754.4 + 311.81/2 = 1910.305
        
        // Transform through inner:
        // x_i = innerM[0]*cx + innerM[2]*cy + innerM[4]
        // y_i = innerM[1]*cx + innerM[3]*cy + innerM[5]
        const cx = 1107.745;
        const cy = 1910.305;
        const xi = innerM[0]*cx + innerM[2]*cy + innerM[4];
        const yi = innerM[1]*cx + innerM[3]*cy + innerM[5];
        
        // Transform through outer:
        const xf = outerM[0]*xi + outerM[2]*yi + outerM[4];
        const yf = outerM[1]*xi + outerM[3]*yi + outerM[5];
        
        cardsList.push({
            index: i,
            outerTransform: outerG.transform,
            innerTransform: innerG.transform,
            xf,
            yf,
            outerM,
            innerM
        });
    }
}

console.log("Extracted cards count:", cardsList.length);

// Group by rounded final coordinates to see unique card positions
const uniquePos = {};
cardsList.forEach(c => {
    const key = `${Math.round(c.xf)},${Math.round(c.yf)}`;
    if (!uniquePos[key]) uniquePos[key] = [];
    uniquePos[key].push(c);
});

console.log("\nUnique card positions (X,Y) count:", Object.keys(uniquePos).length);
console.log("Positions and counts:");
Object.keys(uniquePos).sort().forEach(k => {
    console.log(`Position [${k}]: ${uniquePos[k].length} rects. Sample outerTransform: ${uniquePos[k][0].outerTransform}`);
});
