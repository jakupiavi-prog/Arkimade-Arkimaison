const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/transitions.js', 'utf8');

function setup({reduced=false, pending=null, path='/index.html', href='/arkimade.html', blockedStorage=false, decode=null}={}) {
  const scheduled = new Map(), events = new Map(), overlays = [], storage = new Map();
  const classes = () => {
    const values = new Set();
    return {add:name=>values.add(name),remove:name=>values.delete(name),contains:name=>values.has(name)};
  };
  let nextTimer=0, destination=null;
  if(pending) storage.set('arki-studio-arrival', JSON.stringify({...pending,time:Date.now()}));
  const root={dataset:{},classList:classes()};
  const link={href:'https://example.test'+href,target:'',listeners:{},setAttribute(){},removeAttribute(){},addEventListener(name,callback){this.listeners[name]=callback;}};
  const body={classList:classes(),appendChild:node=>overlays.push(node)};
  const logo={complete:!decode,decode:decode||(()=>Promise.resolve())};
  const document={
    documentElement:root,body,readyState:'loading',
    addEventListener:(name,callback)=>events.set(name,callback),
    querySelectorAll:selector=>selector==='.studio-transition'?overlays:[link],
    createElement(){
      const node={className:'',innerHTML:'',removed:false,setAttribute(){},remove(){this.removed=true;},querySelector:()=>logo};
      node.classList={remove:name=>{node.className=node.className.split(' ').filter(x=>x!==name).join(' ');}};
      return node;
    }
  };
  vm.runInNewContext(source,{
    document,window:{matchMedia:()=>({matches:reduced}),addEventListener:(name,callback)=>events.set(name,callback)},
    location:{pathname:path,href:'https://example.test'+path,origin:'https://example.test',assign:url=>{destination=url;}},
    sessionStorage:{getItem:key=>{if(blockedStorage)throw Error('blocked');return storage.get(key)||null;},removeItem:key=>storage.delete(key),setItem:(key,value)=>{if(blockedStorage)throw Error('blocked');storage.set(key,value);}},
    requestAnimationFrame:callback=>callback(),
    setTimeout:(callback,delay)=>{const id=++nextTimer;scheduled.set(id,{callback,delay});return id;},
    clearTimeout:id=>scheduled.delete(id),URL,Date,console
  });
  events.get('DOMContentLoaded')();
  return {root,body,overlays,scheduled,storage,events,get destination(){return destination;},
    click:(changes={})=>link.listeners.click({button:0,preventDefault(){},...changes}),
    run(delay){const entry=[...scheduled].find(([,timer])=>timer.delay===delay);assert.ok(entry,'timer '+delay);scheduled.delete(entry[0]);entry[1].callback();}
  };
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
(async()=>{
  for(const theme of ['made','maison']) {
    for(const reduced of [false,true]) {
      const browser=setup({href:'/arki'+theme+'.html',reduced});
      await browser.click({button:undefined});
      assert.equal(browser.overlays.length,1,'touch click creates overlay');
      assert.ok(!browser.overlays[0].className.includes('is-preparing'));
      browser.run(reduced?450:1250);
      assert.equal(browser.destination,'https://example.test/arki'+theme+'.html');
      const arrival=setup({pending:{theme,path:'/arki'+theme+'.html'},path:'/arki'+theme+'/',reduced});
      await flush();
      assert.equal(arrival.overlays.length,1,'clean URL still gets arrival');
      assert.equal(arrival.root.dataset.studioEntry,undefined);
      arrival.run(reduced?550:1500);
      assert.ok(arrival.overlays[0].removed,'arrival overlay clears');
    }
  }
  let resolveLogo;
  const cold=setup({decode:()=>new Promise(resolve=>{resolveLogo=resolve;})});
  const clicking=cold.click();
  assert.ok(cold.overlays[0].className.includes('is-preparing'));
  assert.ok(![...cold.scheduled.values()].some(timer=>timer.delay===1250),'navigation waits for logo');
  resolveLogo();await clicking;
  assert.ok(!cold.overlays[0].className.includes('is-preparing'));
  const failedImage=setup({decode:()=>new Promise(()=>{})});
  const loading=failedImage.click();failedImage.run(900);await loading;failedImage.run(1250);
  assert.ok(failedImage.destination,'slow images cannot block navigation');
  const privateBrowser=setup({blockedStorage:true});await privateBrowser.click();privateBrowser.run(1250);
  assert.ok(privateBrowser.destination,'unavailable storage does not block exit');
  const modified=setup();await modified.click({ctrlKey:true});assert.equal(modified.overlays.length,0);
  const restored=setup();await restored.click();restored.events.get('pageshow')({persisted:true});
  assert.ok(![...restored.scheduled.values()].some(timer=>timer.delay===1250||timer.delay===6000),'back navigation cancels old navigation timers');
  assert.ok(!restored.root.classList.contains('is-studio-leaving'));
  console.log('PASS both themes: touch clicks, normal/reduced motion, clean-URL arrivals, cold/failed images, blocked storage, modified clicks, and back navigation');
})().catch(error=>{console.error(error);process.exitCode=1;});
