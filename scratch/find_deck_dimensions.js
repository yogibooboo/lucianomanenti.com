const fs = require('fs');

const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const svgText = fs.readFileSync(svgPath, 'utf8');

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

console.log(`Found ${cardRects.length} card rects.`);

// Helper to multiply matrices
function multiplyMatrices(m1, m2) {
    // Basic 2D matrix multiplication for SVG transforms:
    // a c e
    // b d f
    // 0 0 1
    const a = m1.a * m2.a + m1.c * m2.b;
    const b = m1.b * m2.a + m1.d * m2.b;
    const c = m1.a * m2.c + m1.c * m2.d;
    const d = m1.b * m2.c + m1.d * m2.d;
    const e = m1.a * m2.e + m1.c * m2.f + m1.e;
    const f = m1.b * m2.e + m1.d * m2.f + m1.f;
    return { a, b, c, d, e, f };
}

function parseMatrix(transformStr) {
    if (!transformStr) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    
    // Clean string and find numbers
    const cleanStr = transformStr.trim();
    if (cleanStr.startsWith('translate')) {
        const numStr = cleanStr.substring(cleanStr.indexOf('(') + 1, cleanStr.indexOf(')'));
        const parts = numStr.split(/[\s,]+/).filter(Boolean).map(parseFloat);
        return { a: 1, b: 0, c: 0, d: 1, e: parts[0] || 0, f: parts[1] || 0 };
    }
    
    if (cleanStr.startsWith('matrix')) {
        const numStr = cleanStr.substring(cleanStr.indexOf('(') + 1, cleanStr.indexOf(')'));
        const parts = numStr.split(/[\s,]+/).filter(Boolean).map(parseFloat);
        return {
            a: parts[0] || 1,
            b: parts[1] || 0,
            c: parts[2] || 0,
            d: parts[3] || 1,
            e: parts[4] || 0,
            f: parts[5] || 0
        };
    }
    
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

// Compute global coordinates
const coords = cardRects.map((rect, idx) => {
    let curr = rect;
    let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    while (curr) {
        if (curr.attrs.transform) {
            const m = parseMatrix(curr.attrs.transform);
            matrix = multiplyMatrices(m, matrix);
        }
        curr = curr.parent;
    }
    
    const x_base = parseFloat(rect.attrs.x || '0');
    const y_base = parseFloat(rect.attrs.y || '0');
    
    // Transform top-left corner
    const xf = matrix.a * x_base + matrix.c * y_base + matrix.e;
    const yf = matrix.b * x_base + matrix.d * y_base + matrix.f;
    
    return { x: xf, y: yf, id: idx };
});

// Group by X coordinate
const grouped = {};
coords.forEach(c => {
    const roundedX = Math.round(c.x);
    // Find close group
    let key = Object.keys(grouped).find(k => Math.abs(parseFloat(k) - c.x) < 40);
    if (!key) {
        key = c.x.toString();
        grouped[key] = [];
    }
    grouped[key].push(c);
});

console.log("\nGrouped by X coordinate:");
Object.keys(grouped).sort((a,b) => parseFloat(a) - parseFloat(b)).forEach((key, idx) => {
    const list = grouped[key];
    console.log(`Column ${idx + 1} (X ≈ ${Math.round(parseFloat(key))}): ${list.length} cards`);
    list.sort((a, b) => a.y - b.y).forEach((c, cIdx) => {
        console.log(`  Card ${cIdx + 1}: Y = ${Math.round(c.y)} (Original ID: ${c.id})`);
    });
});
