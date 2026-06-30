const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

console.log("SVG Length:", content.length);

// Let's count some elements
const gCount = (content.match(/<g\b/g) || []).length;
const pathCount = (content.match(/<path\b/g) || []).length;
console.log("Total <g> elements:", gCount);
console.log("Total <path> elements:", pathCount);

// Let's print the first few group tags to see transforms or IDs
const regex = /<g\b[^>]*>/g;
let match;
let count = 0;
console.log("\nFirst 30 <g> tags:");
while ((match = regex.exec(content)) && count < 30) {
    console.log(`${count}: ${match[0]}`);
    count++;
}
