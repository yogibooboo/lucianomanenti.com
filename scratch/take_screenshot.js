const { execSync } = require('child_process');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotPath = path.join(__dirname, 'slice_screenshot.png');
const htmlPath = 'file:///' + path.join(__dirname, 'slice_french.html').replace(/\\/g, '/');

const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1920,1080 --screenshot="${screenshotPath}" "${htmlPath}"`;
console.log("Running command:", cmd);
execSync(cmd);
console.log("Screenshot captured successfully!");
