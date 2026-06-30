const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

const idRegex = /id="([^"]+)"/g;
let match;
const ids = [];
while ((match = idRegex.exec(content))) {
    ids.push(match[1]);
}

console.log("Total IDs found:", ids.length);
console.log("First 50 IDs:", ids.slice(0, 50));

// Search for Brescian suit names or names like "bastoni", "coppe", "denari", "spade", "jolly", "matta", etc.
const keywords = ['bastoni', 'coppe', 'denari', 'spade', 'jolly', 'matta', 'card', 'retro', 'back', 'dorso', 'bresciane'];
console.log("\nMatching keywords in IDs:");
keywords.forEach(kw => {
    const matches = ids.filter(id => id.toLowerCase().includes(kw));
    console.log(`Keyword "${kw}": ${matches.length} matches. Sample:`, matches.slice(0, 10));
});

// Let's also print group tags that have id attributes
console.log("\nGroups with IDs:");
const gIdRegex = /<g\b[^>]*\bid="([^"]+)"[^>]*>/g;
let gMatch;
let gCount = 0;
while ((gMatch = gIdRegex.exec(content)) && gCount < 30) {
    console.log(gMatch[0]);
    gCount++;
}
