const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

const targetStr = 'translate(2076.5';
let idx = 0;
let count = 0;

console.log("Analyzing each card back group...");
while ((idx = svgText.indexOf(targetStr, idx)) !== -1) {
    count++;
    console.log(`\n==========================================`);
    console.log(`CARD BACK #${count} (at index ${idx})`);
    console.log(`==========================================`);
    
    // Find the end of this group tag structure
    // Let's print about 1500 characters
    const segment = svgText.substring(idx - 50, idx + 1000);
    console.log(segment);
    
    idx += targetStr.length;
}
