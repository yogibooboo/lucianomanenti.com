const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

const targetStr = 'translate(2076.5';
let idx = 0;
let count = 0;

console.log("Searching for translate(2076.5) groups...");
while ((idx = svgText.indexOf(targetStr, idx)) !== -1) {
    count++;
    console.log(`\n--- Match #${count} at index ${idx} ---`);
    console.log(svgText.substring(Math.max(0, idx - 100), idx + 500));
    idx += targetStr.length;
}
