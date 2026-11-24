const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {validateContent} = require('./lib/content.cjs');
const {render} = require('./lib/render.cjs');
const cms = require('./api/cms.js');
if (fs.existsSync(path.join(__dirname, '.env')) && process.loadEnvFile) process.loadEnvFile(path.join(__dirname, '.env'));

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/api/cms') return cms(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname === '/admin' ? 'admin.html' : pathname.slice(1);
    const file = path.resolve(root, relative);
    const inside = path.relative(root, file);
    const publicFile = ['index.html', 'arkimaison.html', 'arkimade.html', 'admin.html', 'arkimade-staff.html', 'arkimaison-staff.html', 'content/site.json', 'style.css', 'brands.css', 'welcome.css', 'app.js'].includes(relative)
      || relative.startsWith('assets/');
    if (!publicFile || inside.startsWith('..') || path.isAbsolute(inside)
        || relative.includes('\\') || relative.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(404);
      return res.end('Not found');
    }
    let data = await fs.promises.readFile(file);
    if (['index.html', 'arkimade.html', 'arkimaison.html', 'arkimade-staff.html', 'arkimaison-staff.html'].includes(relative)) {
      const content = validateContent(JSON.parse(await fs.promises.readFile(path.join(root, 'content/site.json'), 'utf8')));
      data = Buffer.from(render(data.toString('utf8'), content, relative));
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status = error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400;
    res.writeHead(status);
    res.end(status === 404 ? 'Not found' : 'Bad request');
  }
});

server.on('error', error => {
  console.error(`Cannot start preview: ${error.message}`);
  process.exit(1);
});
server.listen(port, () => {
  console.log(`Arkimaison and Arkimade preview running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
