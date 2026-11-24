const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const scripts = ['app.js','server.cjs','build.cjs','api/cms.js','api/page.js','lib/content.cjs','lib/render.cjs','lib/blob-store.cjs',
  ...fs.readdirSync('assets').filter(name=>name.endsWith('.js')).map(name=>'assets/'+name)];
const checks = [...scripts.map(file=>['--check',file]),['qa-site.cjs'],['qa-transitions.cjs'],['--test','qa-cms.cjs','qa-admin.cjs','qa-blob.cjs']];
for(const args of checks) {
  const result = spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error) {console.error(result.error.message);process.exit(1);}
  if(result.status !== 0) process.exit(result.status || 1);
}
console.log('All website and CMS checks passed.');
