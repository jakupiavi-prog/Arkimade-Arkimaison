const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const {validateContent} = require('./lib/content.cjs');
const {render} = require('./lib/render.cjs');
const original = JSON.parse(fs.readFileSync('content/site.json','utf8'));
const clone = () => structuredClone(original);
function fixture(overrides = {}) {
  const calls = []; let saved = clone(), revision = 'a'.repeat(40), clock = Date.now();
  const env = {CMS_PASSWORD:'fixture-password-123456', CMS_SESSION_SECRET:'fixture-signing-secret-12345678901234567890', CMS_GITHUB_TOKEN:'fixture-token', VERCEL:'1', ...overrides};
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync('api/cms.js','utf8'), {
    module, require:id => id === '../lib/content.cjs' ? require('./lib/content.cjs') : require(id),
    process:{env}, Buffer, URL, AbortSignal, Date:class extends Date {static now(){return clock;}},
    fetch:async (url,options) => {
      calls.push({url,options});
      assert.ok(url.startsWith('https://api.github.com/repos/jakupiavi-prog/Arkimade-Arkimaison/contents/'));
      const ok = (status,data) => ({status,ok:status >= 200 && status < 300,json:async()=>data});
      if (options.method === 'GET') return ok(200,{content:Buffer.from(JSON.stringify(saved)).toString('base64'),sha:revision});
      const data = JSON.parse(options.body);
      if (url.includes('/content/site.json')) {
        if (data.sha !== revision) return ok(409,{});
        saved = JSON.parse(Buffer.from(data.content,'base64').toString('utf8'));
        revision = revision === 'a'.repeat(40) ? 'b'.repeat(40) : 'c'.repeat(40);
        return ok(200,{content:{sha:revision},commit:{sha:'d'.repeat(40)}});
      }
      assert.match(url,/\/assets\/uploads\/[a-f0-9-]+\.(png|jpg|webp)$/);
      return ok(201,{content:{sha:'e'.repeat(40)},commit:{sha:'f'.repeat(40)}});
    }
  });
  async function request(action,method='GET',body,headers={}) {
    const response = {headers:{},setHeader(name,value){this.headers[name]=value;},end(value){this.body=JSON.parse(value);}};
    await module.exports({url:'/api/cms?action='+action,method,body,headers:{host:'studio.example',origin:'https://studio.example','content-type':'application/json',...headers}},response);
    return response;
  }
  async function login() {
    const response = await request('login','POST',{password:env.CMS_PASSWORD});
    assert.equal(response.statusCode,200);
    assert.match(response.headers['Set-Cookie'],/HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
    return response.headers['Set-Cookie'].split(';')[0];
  }
  return {request,login,calls,advance:milliseconds=>{clock+=milliseconds;},saved:()=>saved};
}
test('CMS is locked until configured, and status exposes no credentials', async () => {
  const cms = fixture({CMS_GITHUB_TOKEN:''});
  assert.deepEqual((await cms.request('status')).body,{configured:false,authenticated:false});
  assert.equal((await cms.request('content','PUT',{})).statusCode,503);
  assert.equal(cms.calls.length,0);
  const weak = fixture({CMS_PASSWORD:''});
  assert.equal((await weak.request('status')).body.configured,false);
});
test('explicit four-character owner passwords work without a hardcoded default', async () => {
  const cms = fixture({CMS_PASSWORD:'CODE'});
  assert.equal((await cms.request('status')).body.configured,true);
  const cookie = await cms.login();
  assert.equal((await cms.request('status','GET',undefined,{cookie})).body.authenticated,true);
  assert.equal(fixture({CMS_PASSWORD:'abc'}).calls.length,0);
  assert.equal((await fixture({CMS_PASSWORD:'abc'}).request('status')).body.configured,false);
});
test('authentication, CSRF, cookie tampering, logout and expiration', async () => {
  const cms = fixture();
  assert.equal((await cms.request('content')).statusCode,401);
  assert.equal((await cms.request('login','POST',{password:'incorrect'})).statusCode,401);
  assert.equal((await cms.request('login','POST',{}, {origin:'https://other.example'})).statusCode,403);
  assert.equal((await cms.request('login','POST',{}, {origin:''})).statusCode,403);
  const cookie = await cms.login();
  assert.equal((await cms.request('status','GET',undefined,{cookie})).body.authenticated,true);
  assert.equal((await cms.request('content','GET',undefined,{cookie:cookie+'tampered'})).statusCode,401);
  assert.equal((await cms.request('content','PUT',{}, {cookie,origin:'https://other.example'})).statusCode,403);
  assert.equal((await cms.request('content','PUT',{}, {cookie,'content-type':'text/plain'})).statusCode,415);
  const logout = await cms.request('logout','POST',{}, {cookie});
  assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
  cms.advance(8*60*60*1000+1000);
  assert.equal((await cms.request('content','GET',undefined,{cookie})).statusCode,401);
  assert.equal(cms.calls.length,0);
});
test('repeated incorrect passwords are limited', async () => {
  const cms = fixture();
  for(let index=0;index<6;index++) assert.equal((await cms.request('login','POST',{password:'wrong'})).statusCode,401);
  assert.equal((await cms.request('login','POST',{password:'wrong'})).statusCode,429);
  cms.advance(15*60*1000+1);
  assert.equal((await cms.request('login','POST',{password:'wrong'})).statusCode,401);
});
test('content publishes durably through GitHub; stale edits cannot overwrite newer work', async () => {
  const cms = fixture(), cookie = await cms.login();
  const opened = await cms.request('content','GET',undefined,{cookie});
  assert.equal(opened.statusCode,200);
  const edited = opened.body.content;
  edited.studios.arkimade.heroTitle = 'Architecture with a new perspective';
  edited.studios.arkimaison.projects.push({...edited.studios.arkimaison.projects[0],name:'New interior'});
  const published = await cms.request('content','PUT',{content:edited,sha:opened.body.sha},{cookie});
  assert.equal(published.statusCode,200);
  assert.equal(cms.saved().studios.arkimaison.projects.length,4);
  assert.equal(cms.saved().studios.arkimade.heroTitle,edited.studios.arkimade.heroTitle);
  assert.equal((await cms.request('content','PUT',{content:edited,sha:opened.body.sha},{cookie})).statusCode,409);
  assert.equal((await cms.request('content','PUT',{content:edited,sha:'invalid'},{cookie})).statusCode,400);
  assert.equal(JSON.parse(cms.calls[1].options.body).branch,'main');
});
test('uploads accept photos, reject active content and oversized files, and choose their own path', async () => {
  const cms = fixture(), cookie = await cms.login();
  const png = fs.readFileSync('assets/reference.png');
  assert.ok(png.length < 2*1024*1024);
  const uploaded = await cms.request('media','POST',{data:png.toString('base64'),name:'../../api/evil.js'},{cookie});
  assert.equal(uploaded.statusCode,201);
  assert.match(uploaded.body.src,/^assets\/uploads\/[a-f0-9-]+\.png$/);
  assert.equal((await cms.request('media','POST',{data:Buffer.from('<svg onload="alert(1)"/>').toString('base64')},{cookie})).statusCode,400);
  assert.equal((await cms.request('media','POST',{data:'not base64'},{cookie})).statusCode,400);
  assert.equal((await cms.request('media','POST',{data:Buffer.alloc(2*1024*1024+1).toString('base64')},{cookie})).statusCode,413);
  assert.equal(cms.calls.length,1);
});
test('content validation prevents unsafe URLs, invalid categories, oversized fields and broken structures', () => {
  assert.deepEqual(validateContent(original),original);
  for(const url of ['javascript:alert(1)','data:text/html,hi','http://example.org/a.jpg','assets/../api/cms.js','https://user:secret@example.org/a.jpg']) {
    const data = clone();data.studios.arkimade.heroImage.src = url;
    assert.throws(()=>validateContent(data),/https image/);
  }
  const data = clone();data.studios.arkimade.projects[0].categories=['missing'];assert.throws(()=>validateContent(data),/categories/);
  const tooLong = clone();tooLong.studios.arkimade.heroTitle='x'.repeat(181);assert.throws(()=>validateContent(tooLong),/heroTitle/);
  const malformed = clone();malformed.studios.arkimaison.steps=[];assert.throws(()=>validateContent(malformed),/three process steps/);
  const extra = clone();extra.studios.arkimaison.projects[0].categories=['villa'];assert.deepEqual(validateContent(extra).studios.arkimaison.projects[0].categories,[]);
});
test('static rendering updates both pages, project details and welcome panels, escaping stored content', () => {
  const data=clone();const attack='<script>alert("x")</script>';
  for(const brand of ['arkimade','arkimaison']) {
    const page=data.studios[brand];page.heroTitle=attack+'\nA second line';
    page.projects.push({...page.projects[0],name:attack,image:{src:'assets/uploads/test.jpg',alt:'A "quoted" room'}});
    page.heroImage={src:'assets/uploads/hero.jpg',alt:'Hero'};page.contactEmail='owner@example.org';page.contactPhone='+355 69 123 4567';page.journalText='First paragraph\n\nSecond paragraph';
    const html=render(fs.readFileSync(brand+'.html','utf8'),validateContent(data),brand+'.html');
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br>A second line'));
    assert.ok(!html.includes(attack));
    assert.equal((html.match(/data-project="/g)||[]).length,4);
    const projects=JSON.parse(html.match(/id="studio-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(projects.at(-1).name,attack);
    assert.match(html,/cms-photo/);assert.match(html,/mailto:owner@example.org/);assert.match(html,/tel:\+355691234567/);
    assert.doesNotMatch(html,/journal-dialog|data-journal/);
    if(brand==='arkimaison')assert.ok(!html.includes('data-project-category'));
    page.projects=[];assert.match(render(fs.readFileSync(brand+'.html','utf8'),data,brand+'.html'),/New projects are coming soon/);
  }
  data.welcome.arkimade.description='A new welcome';
  assert.match(render(fs.readFileSync('index.html','utf8'),data,'index.html'),/A new welcome/);
});
test('browser draft preview and production use exactly the same renderer', () => {
  const browser={};vm.runInNewContext(fs.readFileSync('assets/content-render.js','utf8'),browser);
  for(const file of ['index.html','arkimade.html','arkimaison.html']) {
    const html=fs.readFileSync(file,'utf8');assert.equal(browser.ArkiContentRender.render(html,original,file),render(html,original,file));
  }
});


test('staff content migrates older publications, ignores legacy photos, and escapes both staff pages',()=>{
  const data=clone();
  for(const brand of ['arkimade','arkimaison']) {
    delete data.studios[brand].staff;delete data.studios[brand].staffTitle;delete data.studios[brand].staffIntro;
    data.studios[brand].journalTitle='Old journal';
  }
  const migrated=validateContent(data);
  assert.deepEqual(migrated.studios.arkimade.staff,[]);
  assert.equal(migrated.studios.arkimade.journalTitle,undefined);
  for(const brand of ['arkimade','arkimaison']) {
    migrated.studios[brand].staff=[{name:'<script>Test</script>',role:'Architect',bio:'Line one\nLine two',image:{src:'',alt:''}}];
    const html=render(fs.readFileSync(brand+'-staff.html','utf8'),validateContent(migrated),brand+'-staff.html');
    assert.ok(html.includes('&lt;script&gt;Test&lt;/script&gt;'));
    assert.ok(html.includes('Line one<br>Line two'));
    assert.doesNotMatch(html,/journal|<script>Test/);
  }
  migrated.studios.arkimade.staff[0].image.src='javascript:alert(1)';
  assert.equal(validateContent(migrated).studios.arkimade.staff[0].image,undefined);
});
