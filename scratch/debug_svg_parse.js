const fs = require('fs');
const path = require('path');
// We use the custom lightweight parser defined below instead of xmldom
// Wait! Let's check if xmldom is available. If not, we can parse using standard xml regex or a simple tag parser.
// Actually, since Node has no built-in DOM parser, we can just write a lightweight XML node traversal using regex!
// Let's do that! It is 100% self-contained and has no external dependencies.

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

// Find all <rect ... /> elements
const rectRegex = /<rect\s+([^>]*?)>/g;
let match;
let rectCount = 0;
const rects = [];

// To understand nesting without a full parser, we can search for parent groups.
// But wait! We can also parse the SVG using a quick, simple XML parser in JS.
// Let's write a minimal XML parser.
function parseXML(xmlText) {
    const stack = [];
    let root = { name: 'root', attrs: {}, children: [] };
    let current = root;
    stack.push(root);
    
    // Simple tokenizer for tags
    const tagRegex = /<(\/?)([\w:-]+)([^>]*?)>/g;
    let lastIndex = 0;
    
    while ((match = tagRegex.exec(xmlText)) !== null) {
        const isClose = match[1] === '/';
        const tagName = match[2];
        const attrStr = match[3];
        const isSelfClose = attrStr.endsWith('/');
        
        // Parse attributes
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

console.log("Parsing SVG...");
const root = parseXML(svgText);
console.log("Parsed! Searching for card rects...");

// Find all rects of size 223.23x311.81
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

console.log(`Found ${cardRects.length} card rects.`);

let hiddenCount = 0;
let visibleCount = 0;

cardRects.forEach((rect, idx) => {
    let curr = rect;
    let isHidden = false;
    const chain = [];
    while (curr) {
        const id = curr.attrs.id || '';
        const style = curr.attrs.style || '';
        const display = curr.attrs.display || '';
        
        chain.push({ name: curr.name, id, style, display });
        
        if (display === 'none' || style.replace(/\s/g, '').includes('display:none')) {
            isHidden = true;
        }
        curr = curr.parent;
    }
    
    if (isHidden) {
        hiddenCount++;
        if (hiddenCount <= 5) {
            console.log(`\nHidden Rect ${idx}:`);
            chain.reverse().forEach(node => {
                console.log(`  <${node.name} id="${node.id}" style="${node.style}" display="${node.display}">`);
            });
        }
    } else {
        visibleCount++;
    }
});

console.log(`\nSummary:`);
console.log(`Total Rects: ${cardRects.length}`);
console.log(`Visible Rects: ${visibleCount}`);
console.log(`Hidden Rects: ${hiddenCount}`);
