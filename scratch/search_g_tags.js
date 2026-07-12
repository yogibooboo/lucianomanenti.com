const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

const gRegex = /<g\b([^>]*)>/g;
let match;
let count = 0;

console.log("Listing first 30 g tags...");
while ((match = gRegex.exec(svgText)) !== null && count < 30) {
    count++;
    console.log(`Tag #${count}: <g ${match[1].trim()}>`);
}
