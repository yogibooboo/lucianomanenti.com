const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

console.log("Searching for groups in the SVG...");
// Find all <g> tags with display="none"
const gRegex = /<g\b([^>]*)>/g;
let match;
let count = 0;

while ((match = gRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    if (attrs.includes('display="none"') || attrs.includes('display:none') || attrs.includes('id=')) {
        count++;
        console.log(`Group #${count}: ${attrs.substring(0, 120)}...`);
    }
}

console.log(`\nTotal g elements found: ${count}`);
