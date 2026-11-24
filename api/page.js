const fs = require('node:fs');
const path = require('node:path');
const {render} = require('../lib/render.cjs');
const {validateContent} = require('../lib/content.cjs');
const baseline = require('../content/site.json');
const templates = {};
module.exports = async function page(req, res) {
  if (!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');res.statusCode=405;return res.end('Method not allowed');}
  const studio = new URL(req.url,'http://localhost').searchParams.get('studio') || 'welcome';
  const file = {welcome:'index.html',arkimade:'arkimade.html',arkimaison:'arkimaison.html','arkimade-staff':'arkimade-staff.html','arkimaison-staff':'arkimaison-staff.html'}[studio];
  if (typeof file !== 'string') {res.statusCode=404;return res.end('Not found');}
  try {
    const template = templates[file] ||= fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    let content = validateContent(baseline), source = 'seed';
    if (process.env.CMS_STORAGE === 'blob') {
      try {const saved = await require('../lib/blob-store.cjs').createBlobStore().read();content=saved.content;source=saved.source;}
      catch {source='fallback';}
    }
    const html = Buffer.from(render(template,content,file));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Studio-Content',source);
    res.setHeader('Content-Length',html.length);
    res.statusCode=200;res.end(req.method==='HEAD'?undefined:html);
  } catch {res.statusCode=503;res.end('This page is temporarily unavailable. Please reload in a moment.');}
};
