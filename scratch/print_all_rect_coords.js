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

console.log(`Found ${cardRects.length} rects.`);

// Function to calculate global coordinate of a node
function getGlobalCoords(node) {
    let curr = node;
    let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    
    while (curr && curr.name !== 'svg') {
        if (curr.attrs.transform) {
            const tStr = curr.attrs.transform.trim();
            let localMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
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
            
            // Multiply parentMatrix * localMatrix
            const a = matrix.a * localMatrix.a + matrix.c * localMatrix.b;
            const b = matrix.b * localMatrix.a + matrix.d * localMatrix.b;
            const c = matrix.a * localMatrix.c + matrix.c * localMatrix.d;
            const d = matrix.b * localMatrix.c + matrix.d * localMatrix.d;
            const e = matrix.a * localMatrix.e + matrix.c * localMatrix.f + matrix.e;
            const f = matrix.b * localMatrix.e + matrix.d * localMatrix.f + matrix.f;
            matrix = { a, b, c, d, e, f };
        }
        curr = curr.parent;
    }
    
    const x_base = parseFloat(node.attrs.x || '0');
    const y_base = parseFloat(node.attrs.y || '0');
    const w_base = parseFloat(node.attrs.width || '0');
    const h_base = parseFloat(node.attrs.height || '0');
    
    const xf = matrix.a * x_base + matrix.c * y_base + matrix.e;
    const yf = matrix.b * x_base + matrix.d * y_base + matrix.f;
    const wf = matrix.a * w_base + matrix.c * h_base;
    const hf = matrix.b * w_base + matrix.d * h_base;
    
    return { x: xf, y: yf, w: wf, h: hf, fill: node.parent.attrs.fill || '' };
}

const calculated = cardRects.map((r, idx) => ({ id: idx, ...getGlobalCoords(r) }));

// Group by X (tolerance 40)
const columns = [];
calculated.forEach(card => {
    let col = columns.find(c => Math.abs(c.avgX - card.x) < 40);
    if (!col) {
        col = { avgX: card.x, cards: [] };
        columns.push(col);
    }
    col.cards.push(card);
    // update avgX
    col.avgX = col.cards.reduce((sum, c) => sum + c.x, 0) / col.cards.length;
});

// Sort columns by avgX
columns.sort((a, b) => a.avgX - b.avgX);

columns.forEach((col, cIdx) => {
    console.log(`\nColumn ${cIdx + 1} (avgX = ${col.avgX.toFixed(2)}):`);
    // Sort cards by Y
    col.cards.sort((a, b) => a.y - b.y);
    col.cards.forEach(card => {
        console.log(`  Card ID: ${card.id}, X: ${card.x.toFixed(2)}, Y: ${card.y.toFixed(2)}, W: ${card.w.toFixed(2)}, H: ${card.h.toFixed(2)}, fill: ${card.fill}`);
    });
});
