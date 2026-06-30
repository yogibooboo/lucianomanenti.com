const fs = require('fs');

const svgText = fs.readFileSync('c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg', 'utf8');

// A more robust tag parser that handles newlines
const tagRegex = /<([\w:-]+)([\s\S]*?)>/g;
let match;

console.log("Searching for <g> transforms near card rects...");

// Let's find rects of width ~223.23 and walk upwards to find all parent <g> tags
// We will do this by parsing the file hierarchically using a standard recursive descent parser in JS
function parseSVG(text) {
    let pos = 0;
    const len = text.length;
    
    function parseNode() {
        // Skip whitespace and comments
        while (pos < len) {
            if (text.startsWith('<!--', pos)) {
                pos = text.indexOf('-->', pos) + 3;
            } else if (/\s/.test(text[pos])) {
                pos++;
            } else {
                break;
            }
        }
        
        if (pos >= len) return null;
        
        if (text[pos] !== '<') {
            // Text node
            const nextTag = text.indexOf('<', pos);
            const end = nextTag === -1 ? len : nextTag;
            const content = text.substring(pos, end);
            pos = end;
            return { type: 'text', content };
        }
        
        if (text.startsWith('</', pos)) {
            // Closing tag
            const end = text.indexOf('>', pos);
            const tagName = text.substring(pos + 2, end).trim();
            pos = end + 1;
            return { type: 'close', name: tagName };
        }
        
        // Opening tag
        const end = text.indexOf('>', pos);
        let tagContent = text.substring(pos + 1, end);
        pos = end + 1;
        
        const isSelfClosing = tagContent.endsWith('/');
        if (isSelfClosing) {
            tagContent = tagContent.slice(0, -1);
        }
        
        const nameMatch = tagContent.match(/^([\w:-]+)/);
        if (!nameMatch) return null;
        const name = nameMatch[1];
        
        const attrs = {};
        const attrRegex = /([\w:-]+)\s*=\s*"([^"]*?)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(tagContent)) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }
        
        // Also match single-quoted attributes
        const attrRegexSingle = /([\w:-]+)\s*=\s*'([^']*?)'/g;
        while ((attrMatch = attrRegexSingle.exec(tagContent)) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }
        
        const node = { type: 'element', name, attrs, children: [] };
        if (isSelfClosing) {
            return node;
        }
        
        // Parse children
        while (pos < len) {
            const child = parseNode();
            if (!child) break;
            if (child.type === 'close') {
                if (child.name === name) break;
                // Mismatched close tag, just break
                break;
            }
            node.children.push(child);
        }
        return node;
    }
    
    return parseNode();
}

const root = parseSVG(svgText);
console.log("SVG parsed successfully!");

// Find rects and print their ancestor chain with all attributes
const rects = [];
function findRects(node, ancestors = []) {
    if (node.type === 'element') {
        const chain = [...ancestors, node];
        if (node.name === 'rect') {
            const w = parseFloat(node.attrs.width || '0');
            const h = parseFloat(node.attrs.height || '0');
            if (Math.abs(w - 223.23) < 1 && Math.abs(h - 311.81) < 1) {
                rects.push(chain);
            }
        }
        node.children.forEach(child => findRects(child, chain));
    }
}
findRects(root);

console.log(`Found ${rects.length} card rects.`);
if (rects.length > 0) {
    console.log("\nAncestor chain for Rect 24:");
    const chain = rects[24];
    chain.forEach((node, idx) => {
        console.log(`Level ${idx}: <${node.name} ${JSON.stringify(node.attrs)}>`);
    });
}
