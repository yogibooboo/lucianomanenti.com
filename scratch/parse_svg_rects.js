const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

// A regex to extract rect elements and their attributes
const rectRegex = /<rect\b([^>]*)>/g;
let match;
let count = 0;

console.log("Analyzing all rects in SVG...");
while ((match = rectRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    const widthMatch = attrs.match(/width="([0-9.]+)"/);
    const heightMatch = attrs.match(/height="([0-9.]+)"/);
    const xMatch = attrs.match(/x="([0-9.]+)"/);
    const yMatch = attrs.match(/y="([0-9.]+)"/);
    
    if (widthMatch && heightMatch) {
        const w = parseFloat(widthMatch[1]);
        const h = parseFloat(heightMatch[1]);
        const x = xMatch ? parseFloat(xMatch[1]) : 0;
        const y = yMatch ? parseFloat(yMatch[1]) : 0;
        
        // Let's print rects that are roughly card-sized (e.g. height between 300 and 320)
        if (h >= 300 && h <= 320) {
            count++;
            console.log(`Rect #${count}: x=${x}, y=${y}, w=${w}, h=${h}, attrs: ${attrs.substring(0, 80)}...`);
        }
    }
}

console.log(`\nTotal card-sized rects found: ${count}`);
