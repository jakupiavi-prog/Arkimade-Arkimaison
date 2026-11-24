// Exercise the owner workflow without a browser or any real publishing credentials.
// This is a DOM test double, not a visual browser test.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const seed = JSON.parse(fs.readFileSync('content/site.json','utf8'));
function dashboard(configured) {
  class Element {
    constructor(id='') {this.id=id;this.dataset={};this.listeners={};this.attributes={};this.textContent='';this.innerHTML='';this.value='';this.disabled=false;this.hidden=false;this.open=false;this.classList={toggle(){}};}
    addEventListener(type,handler){this.listeners[type]=handler;}
    setAttribute(key,value){this.attributes[key]=value;}
    removeAttribute(key){delete this.attributes[key];}
    querySelector(selector){if(selector==='button'||selector==='button[type="submit"]')return this.button;return null;}
    querySelectorAll(selector){if(selector==='button')return this.buttons||[];return [];}
    showModal(){this.open=true;}
    close(){this.open=false;}
    matches(selector){return selector==='[data-field]'&&this.dataset.field;}
    reportValidity(){return true;}
  }
  const html=fs.readFileSync('admin.html','utf8');const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>['#'+match[1],new Element(match[1])]));
  const nav=['arkimade','arkimaison'].map(page=>{const node=new Element();node.dataset.page=page;node.closest=()=>node;return node;});
  nodes.get('#page-nav').buttons=nav;
  for(const id of ['login-form','project-form','session-form'])nodes.get('#'+id).button=new Element();
  const events={},calls=[];let published;
  const document={querySelector(selector){
    if(nodes.has(selector))return nodes.get(selector);
    const descendant=selector.match(/^(#[\w-]+) (.+)$/);
    if(descendant&&nodes.has(descendant[1]))return nodes.get(descendant[1]).querySelector(descendant[2]);
    throw Error('Missing editor element: '+selector);
  },querySelectorAll(){return [];},addEventListener(type,handler){events[type]=handler;}};
  const response=data=>({ok:true,json:async()=>data,text:async()=>html});
  const context={document,window:{addEventListener(){}},URL,AbortSignal,structuredClone,Map,Date,Blob,setTimeout,confirm:()=>true,location:{reload(){}},fetch:async(url,options)=>{
    calls.push({url,options});
    if(url==='/content/site.json')return response(structuredClone(seed));
    const action=new URL(url,'https://studio.example').searchParams.get('action');
    if(action==='status')return response({configured,authenticated:false});
    if(action==='login') {assert.equal(JSON.parse(options.body).password,'owner-fixture');return response({ok:true});}
    if(action==='content'&&options.method==='GET')return response({content:structuredClone(seed),sha:'a'.repeat(40)});
    if(action==='content'&&options.method==='PUT'){published=JSON.parse(options.body);return response({sha:'b'.repeat(40),message:'Changes saved.'});}
    throw Error('Unexpected CMS request: '+url);
  }};
  vm.runInNewContext(fs.readFileSync('assets/admin.js','utf8'),context);
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
  const click=async(selector,target)=>{const element=nodes.get(selector);await element.listeners.click({target:target||{closest:()=>null}});await settle();};
  const submit=async(selector)=>{const element=nodes.get(selector);await element.listeners.submit({preventDefault(){},target:element});await settle();};
  return {nodes,events,nav,calls,settle,click,submit,published:()=>published};
}
test('unconfigured CMS requires setup rather than offering a non-publishing demo',async()=>{
  const ui=dashboard(false);await ui.settle();
  assert.equal(ui.nodes.get('#password').disabled,true);
  assert.equal(ui.nodes.has('#try-preview'),false);
  assert.equal(ui.nodes.has('#backup'),false);
});

test('owner signs in, edits a project, retains the change across pages and publishes',async()=>{
  const ui=dashboard(true);await ui.settle();ui.nodes.get('#password').value='owner-fixture';
  await ui.submit('#login-form');
  assert.equal(ui.nodes.get('#dashboard').hidden,false);
  assert.equal(ui.nodes.get('#password').value,'');
  await ui.click('#page-nav',ui.nav[0]);
  const edit={dataset:{editProject:'0'},hasAttribute:key=>key==='data-edit-project'};
  await ui.click('#editor',{closest:()=>edit});
  assert.equal(ui.nodes.get('#project-editor').open,true);
  const field={dataset:{field:'name',scope:'draft'},value:'Owner edited villa',matches:selector=>selector==='[data-field]'};
  ui.events.input({target:field});
  await ui.submit('#project-form');
  assert.match(ui.nodes.get('#editor').innerHTML,/Owner edited villa/);
  await ui.click('#page-nav',ui.nav[1]);
  assert.equal(ui.nodes.get('#publish').disabled,false);
  await ui.click('#publish');
  assert.equal(ui.published().content.studios.arkimade.projects[0].name,'Owner edited villa');
  assert.equal(ui.published().content.studios.arkimaison.projects[0].name,'The Quiet Living Room');
  assert.equal(ui.published().sha,'a'.repeat(40));
  assert.equal(ui.nodes.get('#publish').disabled,true);
  assert.equal(ui.nodes.get('#save-state').textContent,'All changes saved');
});


test('owner manages separate studio staff lists and publishes staff edits',async()=>{
  const ui=dashboard(true);await ui.settle();ui.nodes.get('#password').value='owner-fixture';await ui.submit('#login-form');
  await ui.click('#page-nav',ui.nav[0]);
  await ui.click('#section-tabs',{closest:()=>({dataset:{tab:'staff'}})});
  assert.match(ui.nodes.get('#editor').innerHTML,/Add staff member/);
  assert.doesNotMatch(ui.nodes.get('#section-tabs').innerHTML,/Journal/);
  const action=(key,dataset={})=>({closest:()=>({hasAttribute:value=>value===key,dataset})});
  await ui.click('#editor',action('data-add-staff'));
  for(const [field,value] of [['staff.0.name','Test Person'],['staff.0.role','Architect'],['staff.0.bio','Studio biography']])
    ui.events.input({target:{dataset:{field,scope:'page'},value,matches:selector=>selector==='[data-field]'}});
  await ui.click('#page-nav',ui.nav[1]);await ui.click('#section-tabs',{closest:()=>({dataset:{tab:'staff'}})});
  assert.doesNotMatch(ui.nodes.get('#editor').innerHTML,/Test Person/);
  await ui.click('#publish');
  assert.equal(ui.published().content.studios.arkimade.staff[0].name,'Test Person');
  assert.equal(ui.published().content.studios.arkimaison.staff.length,0);
  await ui.click('#page-nav',ui.nav[0]);await ui.click('#section-tabs',{closest:()=>({dataset:{tab:'staff'}})});
  await ui.click('#editor',action('data-remove-staff',{removeStaff:'0'}));await ui.click('#publish');
  assert.equal(ui.published().content.studios.arkimade.staff.length,0);
});
