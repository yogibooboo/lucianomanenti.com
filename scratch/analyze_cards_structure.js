const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

const rectRegex = /<rect\b[^>]*x="([0-9.-]+)"\s+y="([0-9.-]+)"\s+width="223\.23"\s+height="311\.81"/g;
let match;
const rects = [];
while ((match = rectRegex.exec(content))) {
    rects.push({
        x: parseFloat(match[1]),
        y: parseFloat(match[2])
    });
}

console.log("Total card-sized rects (223.23x311.81):", rects.length);

// Group by rounded X and Y coordinates
const uniqueCoords = Array.from(new Set(rects.map(r => `${Math.round(r.x)},${Math.round(r.y)}`)));
console.log("Unique card positions (X,Y):", uniqueCoords.length);
console.log("Positions:", uniqueCoords);

// Let's also search for <g> elements that wrap these rects and check if they have any transform
// Let's print the parent nodes of some of these rects to see if they are in groups
const lines = content.split('\n');
console.log("\nSome lines of SVG containing 223.23x311.81 rects:");
let printed = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('width="223.23"') && lines[i].includes('height="311.81"') && printed < 5) {
        console.log(`Line ${i+1}: ${lines[i]}`);
        console.log(`Line ${i}: ${lines[i-1]}`);
        console.log(`Line ${i-1}: ${lines[i-2]}`);
        console.log(`Line ${i+2}: ${lines[i+1]}`);
        console.log("-----------------");
        printed++;
    }
}
