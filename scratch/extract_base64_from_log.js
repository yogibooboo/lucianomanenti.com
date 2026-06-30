const fs = require('fs');
const path = require('path');

const logPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\chrome_generate.log';
const targetPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\images\\scala40\\carte_bresciane.png';

console.log("Reading log file...");
const logs = fs.readFileSync(logPath, 'utf8');
console.log("Searching for base64 pattern...");
// Using regex that matches base64 content
const match = logs.match(/SPRITE_BASE64:data:image\/png;base64,([A-Za-z0-9+/=]+)/);

if (!match) {
    console.error("Pattern not found in log!");
    process.exit(1);
}

console.log("Found base64 data! Writing to " + targetPath);
fs.writeFileSync(targetPath, match[1], 'base64');
console.log("Success! File saved.");
