const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 9876;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/save_napoletane') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const buffer = Buffer.from(data.image, 'base64');
                const targetPath = path.join(ROOT_DIR, 'images', 'scala40', 'carte_napoletane.png');
                
                // Backup old image if exists
                const backupPath = path.join(ROOT_DIR, 'images', 'scala40', 'carte_napoletane_old.png');
                if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
                    fs.copyFileSync(targetPath, backupPath);
                }

                fs.writeFileSync(targetPath, buffer);
                console.log(`[SERVER] Saved HD sprite sheet to ${targetPath} (${buffer.length} bytes)!`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

                setTimeout(() => {
                    console.log("[SERVER] Task completed. Exiting.");
                    process.exit(0);
                }, 1000);
            } catch (err) {
                console.error("[SERVER] Error saving:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/scratch/generate_napoletane_hd.html';

    const filePath = path.join(ROOT_DIR, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'text/html';
        if (ext === '.svg') mime = 'image/svg+xml';
        else if (ext === '.js') mime = 'application/javascript';
        else if (ext === '.png') mime = 'image/png';

        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`[SERVER] Running at http://localhost:${PORT}`);

    // Determine browser path
    let browserCmd = null;
    const paths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            browserCmd = p;
            break;
        }
    }

    if (!browserCmd) {
        console.error("No Edge or Chrome found.");
        process.exit(1);
    }

    console.log(`[SERVER] Launching ${browserCmd}...`);
    const browserProc = spawn(browserCmd, [
        '--headless',
        '--disable-gpu',
        `http://localhost:${PORT}/scratch/generate_napoletane_hd.html`
    ]);

    browserProc.stdout.on('data', d => console.log(`[BROWSER] ${d}`));
    browserProc.stderr.on('data', d => console.log(`[BROWSER LOG] ${d}`));
});
