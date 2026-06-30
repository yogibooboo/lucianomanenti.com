const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');

const parts = svgContent.split('<rect x="996.13" y="1754.4" width="223.23" height="311.81"');
const cardsList = [];

for (let i = 1; i < parts.length; i++) {
    const beforeContent = parts[i-1];
    const gRegex = /<g\b[^>]*\btransform="([^"]+)"[^>]*>/g;
    let m;
    const gMatches = [];
    while ((m = gRegex.exec(beforeContent))) {
        gMatches.push({ transform: m[1] });
    }
    if (gMatches.length >= 2) {
        const innerG = gMatches[gMatches.length - 1];
        const outerG = gMatches[gMatches.length - 2];
        
        function parseTransform(t) {
            const matMatch = t.match(/matrix\(([^)]+)\)/);
            if (matMatch) return matMatch[1].trim().split(/[\s,]+/).map(Number);
            const transMatch = t.match(/translate\(([^)]+)\)/);
            if (transMatch) {
                const [x, y] = transMatch[1].trim().split(/[\s,]+/).map(Number);
                return [1, 0, 0, 1, x, y || 0];
            }
            return [1, 0, 0, 1, 0, 0];
        }
        
        const innerM = parseTransform(innerG.transform);
        const outerM = parseTransform(outerG.transform);
        
        // Base rect top-left corner is (996.13, 1754.4)
        // Let's compute the transformed top-left corner
        const x_base = 996.13;
        const y_base = 1754.4;
        
        // Inner transform
        const xi = innerM[0]*x_base + innerM[2]*y_base + innerM[4];
        const yi = innerM[1]*x_base + innerM[3]*y_base + innerM[5];
        
        // Outer transform
        const xf = outerM[0]*xi + outerM[2]*yi + outerM[4];
        const yf = outerM[1]*xi + outerM[3]*yi + outerM[5];
        
        cardsList.push({
            index: i,
            x: xf,
            y: yf
        });
    }
}

// Keep only unique card positions (since each card has a fill rect and stroke rect)
const uniqueCards = [];
const seen = new Set();
cardsList.forEach(c => {
    const key = `${Math.round(c.x)},${Math.round(c.y)}`;
    if (!seen.has(key)) {
        seen.add(key);
        uniqueCards.push(c);
    }
});

console.log("Total unique cards:", uniqueCards.length);

// Sort by Y first, then X
uniqueCards.sort((a, b) => {
    const dy = Math.round(a.y) - Math.round(b.y);
    if (Math.abs(dy) > 10) return dy; // group rows within 10 units
    return Math.round(a.x) - Math.round(b.x);
});

// Group into rows
const rows = [];
let currentRow = [];
let currentY = -9999;

uniqueCards.forEach(c => {
    if (currentY === -9999 || Math.abs(c.y - currentY) > 10) {
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        currentRow = [c];
        currentY = c.y;
    } else {
        currentRow.push(c);
    }
});
if (currentRow.length > 0) {
    rows.push(currentRow);
}

console.log("\nVisual Rows in SVG:");
rows.forEach((row, idx) => {
    console.log(`\nRow ${idx} (Avg Y = ${Math.round(row.reduce((sum, c) => sum + c.y, 0) / row.length)}): contains ${row.length} cards`);
    row.forEach(c => {
        console.log(`  Card index: ${c.index}, X: ${Math.round(c.x)}, Y: ${Math.round(c.y)}`);
    });
});
