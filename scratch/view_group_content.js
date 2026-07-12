const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

const targetStr = 'transform="translate(0 216.12)" display="none"';
const idx = svgText.indexOf(targetStr);

if (idx !== -1) {
    console.log("Found the target group at index", idx);
    // Let's print the next 2000 characters to inspect its content
    console.log(svgText.substring(idx - 20, idx + 2000));
} else {
    console.log("Target group string not found.");
}
