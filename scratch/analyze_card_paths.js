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

// Find Rect with Original ID 24 (which we saw is in Column 1, Row 3)
const targetRect = cardRects.find((r, idx) => idx === 24);
if (!targetRect) {
    console.error("Target rect not found!");
    process.exit(1);
}

// Trace ancestors of targetRect and print sibling elements at each level
console.log("Tracing hierarchy for Card 24:");
let curr = targetRect;
while (curr) {
    console.log(`\nElement <${curr.name} id="${curr.attrs.id || 'no-id'}">`);
    if (curr.parent) {
        console.log(`Sibling elements under parent <${curr.parent.name} id="${curr.parent.attrs.id || 'no-id'}">:`);
        curr.parent.children.forEach(sib => {
            if (sib === curr) {
                console.log(`  * <${sib.name} id="${sib.attrs.id || 'no-id'}"> (Self)`);
            } else {
                console.log(`    <${sib.name} id="${sib.attrs.id || 'no-id'}" type="${sib.name}" attrCount="${Object.keys(sib.attrs).length}">`);
            }
        });
    }
    curr = curr.parent;
}
