const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com';
const logPath = path.join(ROOT_DIR, 'scratch', 'chrome_generate.log');
const targetPath = path.join(ROOT_DIR, 'images', 'scala40', 'carte_bresciane.png');

const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\Luciano\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];

let chromePath = null;
for (const p of chromePaths) {
    if (fs.existsSync(p)) {
        chromePath = p;
        break;
    }
}

if (!chromePath) {
    console.error("Chrome not found!");
    process.exit(1);
}

const tempScreenshot = path.join(ROOT_DIR, 'scratch', 'temp_screenshot.png');

// Clean up old log and temp files
if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
}
if (fs.existsSync(tempScreenshot)) {
    fs.unlinkSync(tempScreenshot);
}

const url = 'http://localhost:9999/scratch/generate_bresciane.html?t=' + Date.now();
const cmd = `"${chromePath}" --headless --disable-gpu --virtual-time-budget=15000 --enable-logging --log-file="${logPath}" --screenshot="${tempScreenshot}" "${url}"`;
console.log("Running headless Chrome to render and capture base64...");

exec(cmd, (err) => {
    // Delete temp screenshot
    if (fs.existsSync(tempScreenshot)) {
        fs.unlinkSync(tempScreenshot);
    }
    
    if (err) {
        console.error("Error executing Chrome:", err);
        process.exit(1);
    }
    
    if (!fs.existsSync(logPath)) {
        console.error("Log file was not created!");
        process.exit(1);
    }
    
    const logs = fs.readFileSync(logPath, 'utf8');
    const match = logs.match(/SPRITE_BASE64:data:image\/png;base64,([A-Za-z0-9+/=]+)/);
    
    if (!match) {
        console.error("Could not find SPRITE_BASE64 pattern in logs!");
        // Print the logs to see what happened
        console.log("Log contents:\n", logs.substring(0, 1000));
        process.exit(1);
    }
    
    const base64Data = match[1];
    fs.writeFileSync(targetPath, base64Data, 'base64');
    console.log(`\n[SUCCESS] Pixel-perfect sprite sheet generated and saved to: ${targetPath}`);
});
