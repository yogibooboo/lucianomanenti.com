const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

const rectRegex = /<rect\b[^>]*x="([0-9.-]+)"\s+y="([0-9.-]+)"\s+width="([0-9.-]+)"\s+height="([0-9.-]+)"/g;
let match;
const rects = [];
while ((match = rectRegex.exec(content))) {
    rects.push({
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        w: parseFloat(match[3]),
        h: parseFloat(match[4]),
        raw: match[0]
    });
}

console.log("Total matched rects:", rects.length);

// Unique dimensions
const dims = new Set(rects.map(r => `${r.w}x${r.h}`));
console.log("Unique rect dimensions:", Array.from(dims));

// Let's sort rects by Y then by X
rects.sort((a, b) => (a.y - b.y) || (a.x - b.x));

// Group by unique Y values
const rows = {};
rects.forEach(r => {
    // Round Y to avoid precision issues
    const roundedY = Math.round(r.y * 10) / 10;
    if (!rows[roundedY]) rows[roundedY] = [];
    rows[roundedY].push(r.x);
});

console.log("\nRows detected (by Y coordinate):");
Object.keys(rows).forEach(y => {
    // Sort columns
    rows[y].sort((a, b) => a - b);
    const uniqueX = Array.from(new Set(rows[y].map(x => Math.round(x * 10) / 10)));
    console.log(`Y = ${y}: contains ${rows[y].length} rects. Unique X coords (${uniqueX.length}):`, uniqueX);
});
