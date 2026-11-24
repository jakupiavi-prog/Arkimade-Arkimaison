const fs = require('node:fs');
const path = require('node:path');
const {validateContent} = require('./lib/content.cjs');
const {render} = require('./lib/render.cjs');
const content = validateContent(JSON.parse(fs.readFileSync(path.join(__dirname, 'content/site.json'), 'utf8')));

// Build browser assets and baseline HTML; Vercel routes live pages through api/page.js.
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, {recursive:true});
const files = [
  'index.html', 'arkimade.html', 'arkimaison.html', 'arkimade-staff.html', 'arkimaison-staff.html',
  'style.css', 'welcome.css', 'brands.css', 'app.js', 'admin.html'
];
for (const file of files) {
  if (file.endsWith('.html') && file !== 'admin.html') {
    fs.writeFileSync(path.join(output, file), render(fs.readFileSync(path.join(__dirname, file), 'utf8'), content, file));
  } else fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}
fs.cpSync(path.join(__dirname, 'assets'), path.join(output, 'assets'), {recursive:true});
fs.mkdirSync(path.join(output, 'content'), {recursive:true});
fs.writeFileSync(path.join(output, 'content/site.json'), JSON.stringify(content));
console.log('Static website ready in dist/');
