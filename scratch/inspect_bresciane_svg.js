const fs = require('fs');
const path = require('path');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

console.log("Analyzing SVG file...");
// Let's find all rects, images, or g elements that are around x=2000 to 2200
const parser = require('child_process');

// A simple regex search for elements with high X coordinates
const matches = svgText.match(/<[^>]+x="2[0-9]{3}[^>]+>/g);
if (matches) {
    console.log("Found elements with X >= 2000:");
    matches.forEach(m => console.log(m));
} else {
    console.log("No elements with X >= 2000 found using regex.");
}

// Let's count how many columns of cards are drawn.
// Let's search for rect elements with width="223.23"
const rectMatches = svgText.match(/<rect[^>]+width="223\.23"[^>]*>/g);
console.log(`\nFound ${rectMatches ? rectMatches.length : 0} rects with width 223.23`);
if (rectMatches) {
    const xCoordinates = rectMatches.map(r => {
        const xMatch = r.match(/x="([0-9.]+)"/);
        return xMatch ? parseFloat(xMatch[1]) : null;
    }).filter(x => x !== null);
    const uniqueXs = Array.from(new Set(xCoordinates)).sort((a,b) => a-b);
    console.log("Unique X coordinates of card rects:", uniqueXs);
}
