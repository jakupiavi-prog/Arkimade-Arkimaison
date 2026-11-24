const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createBlobStore} = require('./lib/blob-store.cjs');
const seed = require('./content/site.json');
test('real SDK error classes handle an empty store and concurrent publication',async()=>{
  const sdk = require('@vercel/blob');
  const store = createBlobStore({...sdk,
    head:async()=>{throw new sdk.BlobNotFoundError();},
    put:async path=>{if(path==='content/site.json')throw new sdk.BlobPreconditionFailedError();return {};}
  });
  const opened = await store.read();
  assert.equal(opened.source,'seed');
  await assert.rejects(store.write(opened.content,opened.sha),{status:409});
});
function fixture() {
  const files = new Map();let next=0, race=false;
  const error = name => Object.assign(new Error(name),{name});
  const sdk = {
    async head(path) {const file=files.get(path);if(!file)throw error('BlobNotFoundError');return {url:'https://test.public.blob.vercel-storage.com/'+path,etag:file.etag};},
    async get(url) {const parsed=new URL(url),file=files.get(parsed.pathname.slice(1));assert.equal(parsed.searchParams.get('v'),file.etag);return {blob:{etag:'W/"'+file.etag+'"'},stream:new Blob([file.body]).stream()};},
    async put(path,body,options) {
      const previous=files.get(path);
      if(path==='content/site.json'&&race) {race=false;throw error('BlobPreconditionFailedError');}
      if(previous&&!options.allowOverwrite)throw error('BlobAlreadyExistsError');
      if(options.ifMatch&&options.ifMatch!==previous?.etag)throw error('BlobPreconditionFailedError');
      const etag='revision-'+(++next);files.set(path,{body,etag});
      return {etag,url:'https://test.public.blob.vercel-storage.com/'+path};
    }
  };
  return {store:createBlobStore(sdk),files,sdk,race:()=>{race=true;}};
}

test('completed publications read immutable snapshots despite stale mutable CDN content',async()=>{
  const cms=fixture(),opened=await cms.store.read();
  const edited=structuredClone(opened.content);edited.studios.arkimade.staff=[{name:'Test Architect',role:'Architect',bio:'Test biography',image:{src:'',alt:''}}];
  const saved=await cms.store.write(edited,opened.sha);
  const get=cms.sdk.get;
  cms.sdk.get=async url=>{assert.ok(new URL(url).pathname.startsWith('/content/revisions/'));return get(url);};
  const reloaded=await cms.store.read();assert.equal(reloaded.sha,saved.sha);assert.equal(reloaded.content.studios.arkimade.staff[0].name,'Test Architect');
});
test('online content persists, reads its current revision, and rejects stale and racing saves',async()=>{
  const cms=fixture(),opened=await cms.store.read();
  assert.equal(opened.source,'seed');
  const edited=structuredClone(opened.content);edited.studios.arkimade.heroTitle='Owner edited architecture';edited.studios.arkimaison.heroTitle='Owner edited interiors';
  const saved=await cms.store.write(edited,opened.sha);
  const reloaded=await cms.store.read();assert.equal(reloaded.sha,saved.sha);assert.equal(reloaded.content.studios.arkimade.heroTitle,edited.studios.arkimade.heroTitle);assert.equal(reloaded.content.studios.arkimaison.heroTitle,edited.studios.arkimaison.heroTitle);
  await assert.rejects(cms.store.write(edited,opened.sha),{status:409});
  cms.race();await assert.rejects(cms.store.write(edited,saved.sha),{status:409});
  assert.ok([...cms.files.keys()].some(key=>key.startsWith('content/versions/')));
});
test('photo uploads use immutable public URLs and reject arbitrary storage paths',async()=>{
  const cms=fixture(),path='assets/uploads/abcdef-1234.png';const result=await cms.store.upload(path,Buffer.from('photo'));
  assert.match(result,/^https:\/\/test.public.blob.vercel-storage.com\/assets\/uploads\//);
  await assert.rejects(cms.store.upload('../../anything.js',Buffer.from('bad')),{status:400});
});
test('public pages render online edits before any new build and retain the existing page behavior',async()=>{
  const edited=structuredClone(seed);edited.studios.arkimade.heroTitle='Live architecture heading';edited.studios.arkimaison.heroTitle='Live interiors heading';edited.welcome.arkimaison.description='Live welcome wording';
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync('api/page.js','utf8'),{module,require:id=>id==='../lib/blob-store.cjs'?{createBlobStore:()=>({read:async()=>({content:edited,source:'stored'})})}:id.startsWith('../')?require('./'+id.slice(3)):require(id),__dirname:require('node:path').join(process.cwd(),'api'),process:{env:{CMS_STORAGE:'blob'}},Buffer,URL});
  for(const [studio,title] of [['welcome','Live welcome wording'],['arkimade','Live architecture heading'],['arkimaison','Live interiors heading']]) {
    const response={headers:{},setHeader(key,value){this.headers[key]=value;},end(body){this.body=body;}};
    await module.exports({url:'/api/page?studio='+studio,method:'GET'},response);
    assert.equal(response.statusCode,200);assert.equal(response.headers['X-Studio-Content'],'stored');assert.ok(response.body.toString().includes(title));
    if(studio!=='welcome'){assert.match(response.body.toString(),/id="studio-data"/);assert.match(response.body.toString(),/assets\/transitions.js/);}
  }
});
