const fs = require('fs');
const htmlPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\generate_bresciane.html';
const content = fs.readFileSync(htmlPath, 'utf8');

// Extract the script contents
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
const match = scriptRegex.exec(content);
if (match) {
    const jsCode = match[1];
    try {
        // Try parsing the JS code by compiling it as a new Function
        new Function('async () => {' + jsCode + '}');
        console.log("Syntax check passed! No syntax errors found in the script.");
    } catch (err) {
        console.error("SYNTAX ERROR FOUND:", err.message);
    }
} else {
    console.error("No script tag found in the HTML file.");
}
