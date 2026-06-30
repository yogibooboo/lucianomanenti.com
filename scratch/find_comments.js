const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

const commentRegex = /<!--([\s\S]*?)-->/g;
let match;
const comments = [];
while ((match = commentRegex.exec(content))) {
    comments.push(match[1].trim());
}

console.log("Total comments found:", comments.length);
console.log("Comments:", comments.slice(0, 30));
