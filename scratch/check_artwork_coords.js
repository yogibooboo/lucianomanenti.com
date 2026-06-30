const fs = require('fs');

const svgText = fs.readFileSync('c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg', 'utf8');

function parseXML(xmlText) {
    const stack = [];
    let root = { name: 'root', attrs: {}, children: [] };
    let current = root;
    stack.push(root);
    
    const tagRegex = /<(\/?)([\w:-]+)([^>]*?)>/g;
    let match;
    
    while ((match = tagRegex.exec(xmlText)) !== null) {
        const isClose = match[1] === '/';
        const tagName = match[2];
        const attrStr = match[3];
        const isSelfClose = attrStr.endsWith('/');
        
        const attrs = {};
        const attrRegex = /([\w:-]+)\s*=\s*"([^"]*?)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }
        
        if (isClose) {
            stack.pop();
            current = stack[stack.length - 1];
        } else {
            const node = { name: tagName, attrs, children: [], parent: current };
            current.children.push(node);
            if (!isSelfClose && tagName !== 'meta' && tagName !== 'link' && tagName !== 'br' && tagName !== 'hr' && tagName !== 'img') {
                stack.push(node);
                current = node;
            }
        }
    }
    return root;
}

const root = parseXML(svgText);
const cardRects = [];
function findCardRects(node) {
    if (node.name === 'rect') {
        const w = parseFloat(node.attrs.width || '0');
        const h = parseFloat(node.attrs.height || '0');
        if (Math.abs(w - 223.23) < 1 && Math.abs(h - 311.81) < 1) {
            cardRects.push(node);
        }
    }
    if (node.children) {
        node.children.forEach(findCardRects);
    }
}
findCardRects(root);

const targetRect = cardRects.find((r, idx) => idx === 24);
const cardContainerGroup = targetRect.parent.parent.parent;

// Child 2 is the artwork group
const artworkGroup = cardContainerGroup.children[2];
console.log(`Artwork Group Name: <${artworkGroup.name}>`);

// Walk the artwork group and find all paths, circles, etc.
// Let's parse their d attributes to extract X coordinates
let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;

function traceArtworkCoords(node, parentMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) {
    let localMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    if (node.attrs.transform) {
        // Parse transform matrix or translate
        const tStr = node.attrs.transform.trim();
        if (tStr.startsWith('translate')) {
            const parts = tStr.substring(tStr.indexOf('(') + 1, tStr.indexOf(')')).split(/[\s,]+/).filter(Boolean).map(parseFloat);
            localMatrix.e = parts[0] || 0;
            localMatrix.f = parts[1] || 0;
        } else if (tStr.startsWith('matrix')) {
            const parts = tStr.substring(tStr.indexOf('(') + 1, tStr.indexOf(')')).split(/[\s,]+/).filter(Boolean).map(parseFloat);
            localMatrix = {
                a: parts[0] || 1, b: parts[1] || 0, c: parts[2] || 0, d: parts[3] || 1, e: parts[4] || 0, f: parts[5] || 0
            };
        }
    }
    
    // Combine matrices
    // a c e
    // b d f
    const a = parentMatrix.a * localMatrix.a + parentMatrix.c * localMatrix.b;
    const b = parentMatrix.b * localMatrix.a + parentMatrix.d * localMatrix.b;
    const c = parentMatrix.a * localMatrix.c + parentMatrix.c * localMatrix.d;
    const d = parentMatrix.b * localMatrix.c + parentMatrix.d * localMatrix.d;
    const e = parentMatrix.a * localMatrix.e + parentMatrix.c * localMatrix.f + parentMatrix.e;
    const f = parentMatrix.b * localMatrix.e + parentMatrix.d * localMatrix.f + parentMatrix.f;
    const currentMatrix = { a, b, c, d, e, f };
    
    // Check elements
    if (node.name === 'path' && node.attrs.d) {
        // Parse all coordinates in d path
        const matches = node.attrs.d.match(/[-+]?\d*\.?\d+/g) || [];
        for (let i = 0; i < matches.length; i += 2) {
            const lx = parseFloat(matches[i]);
            const ly = parseFloat(matches[i+1]);
            if (isNaN(lx) || isNaN(ly)) continue;
            
            // Transform local point (lx, ly) to global SVG coordinate space
            const gx = currentMatrix.a * lx + currentMatrix.c * ly + currentMatrix.e;
            const gy = currentMatrix.b * lx + currentMatrix.d * ly + currentMatrix.f;
            
            minX = Math.min(minX, gx);
            maxX = Math.max(maxX, gx);
            minY = Math.min(minY, gy);
            maxY = Math.max(maxY, gy);
        }
    }
    
    if (node.children) {
        node.children.forEach(child => traceArtworkCoords(child, currentMatrix));
    }
}

// ArtworkGroup is translated relative to cardContainerGroup
// cardContainerGroup is child of root svg, so its parentMatrix is identity
traceArtworkCoords(artworkGroup);

console.log("\nArtwork Bounds in Global SVG Space:");
console.log(`Min X: ${minX}`);
console.log(`Max X: ${maxX}`);
console.log(`Width: ${maxX - minX}`);
console.log(`Min Y: ${minY}`);
console.log(`Max Y: ${maxY}`);
console.log(`Height: ${maxY - minY}`);
