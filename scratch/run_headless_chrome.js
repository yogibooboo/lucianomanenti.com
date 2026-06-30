const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

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
    console.error("Chrome not found in standard paths!");
    process.exit(1);
}

console.log("Found Chrome at:", chromePath);

const url = 'http://localhost:9999/scratch/generate_bresciane.html?t=' + Date.now();
const screenshotPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\screenshot.png';

// Run Chrome headless to take a screenshot after 10 seconds
// Chrome headless screenshot command:
// chrome.exe --headless --disable-gpu --screenshot="path" --window-size=1280,1024 "url"
// Note: to wait for the page to render, we can run a shell script or use a timeout,
// but since the page has a 1 second delay and renders fast, we can run Chrome and let it take the screenshot.
// Wait! Chrome has a flag --virtual-time-budget to wait for page load and timers.
// Or we can write a simple script to launch Chrome and screenshot.
// Let's run the command and save the screenshot.
const logPath = 'c:\\\\Users\\\\Luciano\\\\OneDrive\\\\backup Documents\\\\websites\\\\lucianomanenti.com\\\\scratch\\\\chrome.log';
const cmd = `"${chromePath}" --headless --disable-gpu --virtual-time-budget=10000 --enable-logging --log-file="${logPath}" --screenshot="${screenshotPath}" --window-size=1280,1200 "${url}"`;
console.log("Running command:", cmd);

exec(cmd, (err, stdout, stderr) => {
    if (err) {
        console.error("Error running Chrome:", err);
        process.exit(1);
    }
    console.log("Screenshot taken successfully and saved to:", screenshotPath);
    console.log("Stdout:", stdout);
    console.log("Stderr:", stderr);
});
