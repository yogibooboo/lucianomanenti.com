const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const ROOT_DIR = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com';

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const base64Data = body.replace(/^data:image\/png;base64,/, "");
                const targetPath = path.join(ROOT_DIR, 'images', 'scala40', 'carte_bresciane.png');
                
                // Ensure parent directories exist
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                
                fs.writeFileSync(targetPath, base64Data, 'base64');
                console.log(`\n[SUCCESS] Sprite sheet written to: ${targetPath}`);
                
                res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('SUCCESS');
                
                // Shutdown server in 1 second
                setTimeout(() => {
                    console.log("Shutting down generator server...");
                    process.exit(0);
                }, 1000);
            } catch (err) {
                console.error("Error saving image:", err);
                res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end("ERROR: " + err.message);
            }
        });
        return;
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // Static file serving
    let safeUrl = req.url.split('?')[0];
    if (safeUrl === '/') safeUrl = '/scratch/generate_bresciane.html';
    
    const filePath = path.join(ROOT_DIR, safeUrl.replace(/\//g, path.sep));
    
    // Safety check (ensure file is within root directory)
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        let contentType = 'text/html';
        if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
        else if (filePath.endsWith('.js')) contentType = 'application/javascript';
        else if (filePath.endsWith('.css')) contentType = 'text/css';
        else if (filePath.endsWith('.png')) contentType = 'image/png';
        
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/scratch/generate_bresciane.html`;
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Opening ${url} in your default browser...`);
    
    // Automatically open browser
    const startCmd = process.platform === 'win32' ? 'start' : 'open';
    exec(`cmd /c start ${url}`, (err) => {
        if (err) {
            console.log(`Could not open browser automatically. Please open it manually at: ${url}`);
        }
    });
});
