const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let handler;
const server = {on(){return this;},listen(){return this;}};
vm.runInNewContext(fs.readFileSync('server.cjs','utf8'), {
  require: id => id === 'node:http' ? {createServer:callback => {handler=callback;return server;}} : require(id),
  __dirname:process.cwd(),process:{env:{}},console,URL,Buffer
});
async function request(url,method='GET') {
  let status,headers,body;
  await handler({url,method},{writeHead(code,values){status=code;headers=values||{};},end(data){body=data;}});
  return {status,headers,body};
}
(async()=>{
  for(const url of ['/','/index.html','/arkimaison.html','/arkimade.html','/arkimade-staff.html','/arkimaison-staff.html','/admin','/admin.html','/content/site.json','/assets/admin.js','/assets/admin.css','/assets/content-render.js','/assets/content.css','/style.css','/brands.css','/welcome.css','/app.js','/assets/reference.png','/assets/arki-mark.svg']) {
    const response=await request(url);
    assert.equal(response.status,200,url);
    assert.ok(response.body.length>0,url+' has content');
    assert.equal(Number(response.headers['Content-Length']),response.body.length);
    console.log('PASS GET '+url);
  }
  for(const url of ['/arkimaison.html','/arkimade.html']) {
    const response=await request(url,'HEAD');
    assert.equal(response.status,200);
    assert.equal(response.body,undefined);
    assert.match(response.headers['Content-Type'],/^text\/html/);
  }
  assert.equal((await request('/app.js','POST')).status,405);
  for(const url of ['/server.cjs','/package.json','/.env','/.env.example','/lib/content.cjs','/api/cms.js','/CMS-SETUP.md','/assets/../server.cjs','/assets/%2e%2e%5cserver.cjs','/assets/.private','/missing.html']) {
    assert.equal((await request(url)).status,404,url);
  }
  for(const name of ['index.html','arkimaison.html','arkimade.html']) {
    const html=fs.readFileSync(name,'utf8');
    assert.doesNotMatch(html,/Zenith|ZENITH|\ufffd|[\x18\x19\x7f]/,name+' has clean branding and text');
    for(const [,value] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if(/^(?:https?:|data:|#)/.test(value))continue;
      const [file,fragment]=value.split('#');
      assert.ok(fs.existsSync(file),name+' references '+file);
      if(fragment)assert.ok(fs.readFileSync(file,'utf8').includes('id="'+fragment+'"'));
    }
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(ids.length,new Set(ids).size,name+' has unique IDs');
    if(name!=='index.html') {
      assert.equal((html.match(/data-project="/g)||[]).length,3);
      for(const id of ['contact-form','project-dialog','contact-dialog','year','download-brief','brief-success'])assert.ok(ids.includes(id),id);
    }
  }
  const interior=fs.readFileSync('arkimaison.html','utf8');
  assert.match(interior,/The Quiet Living Room/);
  assert.match(interior,/Complete home interiors/);
  assert.doesNotMatch(interior,/Aether Heights|Single storey|300 m²/);
  console.log('PASS HEAD, restricted paths, studio links, local assets, branding, and interior content');
})().catch(error=>{console.error(error);process.exitCode=1;});
