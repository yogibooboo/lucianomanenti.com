const fs = require('fs');
const svgPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\doc\\Carte_bresciane_al_completo.svg';
const content = fs.readFileSync(svgPath, 'utf8');

const parts = content.split('<rect x="996.13" y="1754.4" width="223.23" height="311.81"');

for (let i = 1; i < parts.length; i++) {
    const beforeContent = parts[i-1];
    const gRegex = /<g\b[^>]*\btransform="([^"]+)"[^>]*>/g;
    let m;
    const gMatches = [];
    while ((m = gRegex.exec(beforeContent))) {
        gMatches.push({ transform: m[1] });
    }
    if (gMatches.length >= 2) {
        const innerG = gMatches[gMatches.length - 1];
        const outerG = gMatches[gMatches.length - 2];
        
        function parseTransform(t) {
            const matMatch = t.match(/matrix\(([^)]+)\)/);
            if (matMatch) return matMatch[1].trim().split(/[\s,]+/).map(Number);
            const transMatch = t.match(/translate\(([^)]+)\)/);
            if (transMatch) {
                const [x, y] = transMatch[1].trim().split(/[\s,]+/).map(Number);
                return [1, 0, 0, 1, x, y || 0];
            }
            return [1, 0, 0, 1, 0, 0];
        }
        
        const innerM = parseTransform(innerG.transform);
        const outerM = parseTransform(outerG.transform);
        
        const cx = 1107.745;
        const cy = 1910.305;
        const xi = innerM[0]*cx + innerM[2]*cy + innerM[4];
        const yi = innerM[1]*cx + innerM[3]*cy + innerM[5];
        const xf = outerM[0]*xi + outerM[2]*yi + outerM[4];
        const yf = outerM[1]*xi + outerM[3]*yi + outerM[5];
        
        if (Math.round(yf) > 1800) {
            console.log(`\n--- Card ${i} at Y = ${Math.round(yf)}, X = ${Math.round(xf)} ---`);
            // Let's print the entire outer <g> group XML content
            const rectIndex = content.indexOf('<rect x="996.13" y="1754.4" width="223.23" height="311.81"', beforeContent.length);
            
            // Search backwards for the start of the outer <g> group containing enable-background="new"
            const outerGIndex = beforeContent.lastIndexOf('<g transform="matrix(');
            const excerpt = content.substring(outerGIndex, rectIndex + 400);
            console.log(excerpt);
        }
    }
}
