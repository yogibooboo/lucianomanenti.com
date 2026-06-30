const fs = require('fs');
const { exec } = require('child_process');

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

const url = 'http://localhost:9999/scopa-en.html?test_modal=1';
const screenshotPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\scopa_modal_test.png';
const logPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\scratch\\chrome_scopa.log';

const cmd = `"${chromePath}" --headless --disable-gpu --virtual-time-budget=5000 --enable-logging --log-file="${logPath}" --screenshot="${screenshotPath}" --window-size=1280,1024 "${url}"`;
console.log("Running command:", cmd);

exec(cmd, (err, stdout, stderr) => {
    if (err) {
        console.error("Error running Chrome:", err);
        process.exit(1);
    }
    console.log("Screenshot taken successfully and saved to:", screenshotPath);
});
