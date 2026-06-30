const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

// Parse groups using simple tag matching
// We want to find the structure of groups that contain the card rects.
// Each card seems to have:
// <g transform="matrix(a b c d e f)" ...>
//   <g transform="matrix(0.70046 0 0 1.0004 298.31 -.79223)" ...>
//     <rect x="996.13" y="1754.4" width="223.23" height="311.81" .../>

// Let's write a parser to find all outer groups and their matrix
const cardRegex = /<g\s+transform="matrix\(([^)]+)\)"[^>]*>[\s\S]*?<g\s+transform="matrix\(0\.70046\s+0\s+0\s+1\.0004\s+298\.31\s+-\.79223\)"[^>]*>[\s\S]*?<rect\s+x="996\.13"\s+y="1754\.4"/g;

let match;
const cards = [];
while ((match = cardRegex.exec(content))) {
    const matrixStr = match[1];
    const matrix = matrixStr.trim().split(/\s+/).map(Number);
    // matrix is [a, b, c, d, e, f]
    // The base rect coordinates are: x=996.13, y=1754.4, w=223.23, h=311.81
    // The inner group transform is: matrix(0.70046, 0, 0, 1.0004, 298.31, -0.79223)
    // Let's calculate the transformation for the rect corners.
    // Inner rect corners in inner group coordinate space:
    // x1 = 996.13, y1 = 1754.4
    // x2 = 996.13 + 223.23 = 1219.36
    // y2 = 1754.4 + 311.81 = 2066.21
    
    // Transform through inner group:
    // x_inner(x, y) = 0.70046 * x + 298.31
    // y_inner(x, y) = 1.0004 * y - 0.79223
    
    // So the inner box corners are:
    // x1' = 0.70046 * 996.13 + 298.31 = 996.06
    // y1' = 1.0004 * 1754.4 - 0.79223 = 1754.31
    // x2' = 0.70046 * 1219.36 + 298.31 = 1152.36
    // y2' = 1.0004 * 2066.21 - 0.79223 = 2066.24
    // So the scaled box is approx: x_min = 996.06, y_min = 1754.31, width = 156.3, height = 311.93
    
    // Now transform through outer group matrix:
    // a = matrix[0], b = matrix[1], c = matrix[2], d = matrix[3], e = matrix[4], f = matrix[5]
    // Since b = 0 and c = 0 (we expect standard translation and maybe scaling/rotation, let's verify):
    const [a, b, c, d, e, f] = matrix;
    
    // Calculate final center or top-left corner
    const finalX = a * 996.06 + c * 1754.31 + e;
    const finalY = b * 996.06 + d * 1754.31 + f;
    
    cards.push({
        matrix,
        x: finalX,
        y: finalY,
        w: a * 156.3, // assuming no rotation
        h: d * 311.93,
        index: match.index
    });
}

console.log("Found card-like groups in SVG:", cards.length);
console.log("Unique outer matrices found:", new Set(cards.map(c => c.matrix.join(','))).size);

// Sort cards by Y then by X
cards.sort((a, b) => (Math.round(a.y) - Math.round(b.y)) || (Math.round(a.x) - Math.round(b.x)));

// Group cards by row (Y coordinate)
const rows = {};
cards.forEach(c => {
    const roundedY = Math.round(c.y);
    if (!rows[roundedY]) rows[roundedY] = [];
    rows[roundedY].push(c);
});

console.log("\nGrid detected:");
Object.keys(rows).forEach(y => {
    const xList = rows[y].map(c => Math.round(c.x));
    console.log(`Row Y = ${y} contains ${rows[y].length} cards. X coordinates:`, xList);
});
