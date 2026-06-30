const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\parse_svg_hierarchy.js', 'utf8');

// We can just use the parsing logic from our previous script to build a 2D map
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
        
        const cx = 1107.745;
        const cy = 1910.305;
        const xi = innerM[0]*cx + innerM[2]*cy + innerM[4];
        const yi = innerM[1]*cx + innerM[3]*cy + innerM[5];
        const xf = outerM[0]*xi + outerM[2]*yi + outerM[4];
        const yf = outerM[1]*xi + outerM[3]*yi + outerM[5];
        
        cardsList.push({ x: xf, y: yf });
    }
}

// Find unique X and Y coordinates (rounded to nearest 5 units to group them)
const roundX = x => Math.round(x / 5) * 5;
const roundY = y => Math.round(y / 5) * 5;

const uniqueXs = Array.from(new Set(cardsList.map(c => roundX(c.x)))).sort((a, b) => a - b);
const uniqueYs = Array.from(new Set(cardsList.map(c => roundY(c.y)))).sort((a, b) => a - b);

console.log("Unique X columns (rounded):", uniqueXs);
console.log("Unique Y rows (rounded):", uniqueYs);

// Build 2D grid representation
const grid = {};
uniqueYs.forEach(y => {
    grid[y] = {};
    uniqueXs.forEach(x => {
        grid[y][x] = false;
    });
});

cardsList.forEach(c => {
    const rx = roundX(c.x);
    const ry = roundY(c.y);
    if (grid[ry] && grid[ry][rx] !== undefined) {
        grid[ry][rx] = true;
    }
});

console.log("\nGrid Representation (Y \\ X):");
uniqueYs.forEach(y => {
    let rowStr = `${y.toString().padStart(5)}: `;
    uniqueXs.forEach(x => {
        rowStr += grid[y][x] ? ' [X] ' : ' [ ] ';
    });
    console.log(rowStr);
});
