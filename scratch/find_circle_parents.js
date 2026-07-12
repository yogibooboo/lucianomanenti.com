const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

const targetStr = 'cx="2205.7"';
const idx = svgText.indexOf(targetStr);

if (idx !== -1) {
    console.log("Found circle with cx=2205.7 at index", idx);
    // Let's print the preceding 1000 characters to see the parent tags
    console.log("--- Preceding content ---");
    console.log(svgText.substring(Math.max(0, idx - 1200), idx));
} else {
    console.log("Circle cx=2205.7 not found.");
}
