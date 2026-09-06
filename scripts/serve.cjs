const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
function createServer() {
  return http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-cache' }); fs.createReadStream(file).pipe(res);
  });
}
module.exports = createServer;
if(require.main === module) createServer().listen(4173,'127.0.0.1', () => console.log('DocTemplate: http://127.0.0.1:4173'));
