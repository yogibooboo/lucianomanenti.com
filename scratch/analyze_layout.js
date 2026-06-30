const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

// Let's find all tags of the form <g transform="translate(X Y)"> or similar, and print the hierarchy
// We want to see how many groups have translate(...) at the root or first-level
const parser = require('child_process');

// Write a simple JS parser to traverse the XML
// Since we don't have xml2js, let's write a simple regex-based tree walker or check the offsets manually.
// Let's find all occurrences of `<g transform="..."` or just `<g>` and see their child paths or coordinates.
// Specifically, let's check paths that look like card borders (rectangles).
// A card border is usually a path or rect with a stroke and round corners, e.g. rx="...", ry="..." or a path describing a rounded rectangle.
// Let's find rect tags or path tags containing rounded corners.

const pathRegex = /<path\b[^>]*>/g;
let match;
const pathPositions = [];
let rectCount = 0;
const rects = [];
const rectRegex = /<rect\b[^>]*>/g;

while ((match = rectRegex.exec(content))) {
    rects.push(match[0]);
    rectCount++;
}

console.log("Total <rect> elements:", rectCount);
if (rectCount > 0) {
    console.log("Sample rects:", rects.slice(0, 10));
}

// Let's print out all paths that look like card boundaries.
// Brescian card size: Brescian cards are traditionally 42x88 mm or similar, very narrow.
// Let's search the SVG for paths with a d="..." attribute that starts a rectangle-like shape,
// e.g., "m7.5617 741.05h137.24..." (width 137.24, height 289.63?)
// Wait! Let's look at line 505:
// <path d="m7.5617 741.05h137.24c4.0016 0 7.2231 4.7258 7.2231 10.596v289.63c0 5.8702-3.2215 10.596-7.2231 10.596h-137.24c-4.0016 0-7.2231-4.7258-7.2231-10.596v-289.63c0-5.8702 3.2215-10.596 7.2231-10.596z" fill="#f4f2ef" stroke="#000" stroke-width=".82205"/>
// Width of this card shape: 137.24 + 7.2231 + 7.2231 = 151.6862? Or is it 137.24 wide?
// Height: 289.63 + 10.596 + 10.596 = 310.822?
// Wait! Let's write a regex to find all paths that describe a card boundary with a shape like "h[0-9.]+c...v...c...h...c...v...c" or similar.
const cardBorders = [];
const cardBorderRegex = /<path\b[^>]*\bd="m[0-9.-]+\s+[0-9.-]+h137\.[0-9]+c[^"]+"/gi;
let borderMatch;
while ((borderMatch = cardBorderRegex.exec(content))) {
    cardBorders.push(borderMatch[0]);
}
console.log("Card borders found with h137.X:", cardBorders.length);
if (cardBorders.length > 0) {
    console.log("Sample border:", cardBorders[0]);
}

// Let's do a wider search for paths starting with 'm' followed by h (horizontal line) and v (vertical line) of card size.
// Let's inspect the file's first <g> tags that contain paths
console.log("\nSome paths inside <g> elements:");
const matches = content.match(/<g\b[^>]*>[\s\n]*<path\b[^>]*>/g) || [];
console.log("Found", matches.length, "groups starting directly with a path");
console.log(matches.slice(0, 10));
