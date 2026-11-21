const fs = require('node:fs');
const path = require('node:path');

// Publish browser files only. The Node server is for local previews.
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, {recursive:true});
const files = [
  'index.html', 'arkimade.html', 'arkimaison.html',
  'style.css', 'welcome.css', 'brands.css', 'app.js'
];
for (const file of files) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}
fs.cpSync(path.join(__dirname, 'assets'), path.join(output, 'assets'), {recursive:true});
console.log('Static website ready in dist/');
