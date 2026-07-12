const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

console.log("Analyzing SVG layers...");
const gIdRegex = /<g\b([^>]*id=['"][^'"]*['"][^>]*)>/g;
let match;
let count = 0;

while ((match = gIdRegex.exec(svgText)) !== null) {
    count++;
    console.log(`Layer #${count}: ${match[1].trim()}`);
}

console.log(`\nTotal layers with IDs: ${count}`);
