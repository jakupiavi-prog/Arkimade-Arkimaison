const $ = selector => document.querySelector(selector);
const brand = document.body.dataset.brand || 'Arkimade';
const interior = brand === 'Arkimaison';
const interiorImages = [
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1000&q=85'
];
const projects = interior ? [
  {name:'The Quiet Living Room',area:'Living room',floors:'Interior concept',image:interiorImages[0],description:'An illustrative living space built around soft upholstery, sculptural furniture, and a gentle palette. Layered textures and natural light create a place for everyday comfort.'},
  {name:'The Gathered Kitchen',area:'Kitchen & dining',floors:'Interior concept',image:interiorImages[1],description:'An illustrative kitchen and dining concept centred on daily rituals. Natural surfaces, considered storage, and a welcoming gathering space balance practicality with a quiet elegance.'},
  {name:'The Restful Suite',area:'Bedroom',floors:'Interior concept',image:interiorImages[2],description:'An illustrative bedroom concept with soft textiles, restrained furniture, and layered lighting. A calm material palette creates a restful retreat at the end of the day.'}
] : [
  {name:'Aether Heights',x:101,y:760,w:237,h:237,area:'300 m²',floors:'Single storey',description:'An illustrative study in restraint. Warm timber, textured stone and generous glazing bring the landscape into the home. The low roof creates a protected threshold between intimate interiors and the open garden.'},
  {name:'Azure Sanctuary',x:354,y:760,w:237,h:237,area:'420 m²',floors:'Single storey',description:'An illustrative courtyard concept organised around a reflecting pool, exploring the meeting of architecture and horizon. Deep overhangs temper the light while open living spaces follow the rhythm of the water.'},
  {name:'Summit Pavilion',x:607,y:760,w:236,h:237,area:'490 m²',floors:'Three storeys',description:'An illustrative vertical home with room to breathe. Layered terraces and planted edges offer privacy while keeping the house connected to its surroundings.'}
];
function closeMenu() {
  $('.header nav').classList.remove('open');
  $('.menu-button').setAttribute('aria-expanded','false');
  $('.menu-button').setAttribute('aria-label','Open navigation');
}
function openDialog(id) {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  closeMenu();
  $(id).showModal();
  document.body.classList.add('modal-open');
}
document.querySelectorAll('[data-contact]').forEach(button => button.addEventListener('click',()=>openDialog('#contact-dialog')));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>document.body.classList.toggle('modal-open',Boolean(document.querySelector('dialog[open]'))));
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
});
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{
  const project=projects[Number(button.dataset.project)];
  const image=interior
    ? '<div class="crop" style="--w:3;--h:2"><img src="'+project.image+'" alt="'+project.name+' interior inspiration"></div>'
    : '<div class="crop" style="--x:'+project.x+';--y:'+project.y+';--w:'+project.w+';--h:'+project.h+'"><img src="assets/reference.png" alt="'+project.name+' architectural concept"></div>';
  $('#project-content').innerHTML=image+'<div class="project-detail"><span class="eyebrow">'+(interior?'INTERIOR DESIGN':'ARCHITECTURE')+' / ILLUSTRATIVE CONCEPT</span><h2>'+project.name+'</h2><p>'+project.description+'</p><div class="detail-meta"><span>'+project.area+'</span><span>'+project.floors+'</span><span>'+(interior?'Interiors & styling':'Residential architecture')+'</span></div><button class="button" id="similar-project">DISCUSS YOUR PROJECT</button></div>';
  $('#similar-project').addEventListener('click',()=>{
    openDialog('#contact-dialog');
    $('#contact-form [name=vision]').value="I'm interested in a project inspired by "+project.name+'. ';
  });
  openDialog('#project-dialog');
}));
$('[data-journal]').addEventListener('click',()=>openDialog('#journal-dialog'));
$('.menu-button').addEventListener('click',()=>{
  const expanded=$('.header nav').classList.toggle('open');
  $('.menu-button').setAttribute('aria-expanded',String(expanded));
  $('.menu-button').setAttribute('aria-label',expanded?'Close navigation':'Open navigation');
});
document.querySelectorAll('.header nav a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
let briefUrl;
$('#contact-form').addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.target);
  const text=brand.toUpperCase()+' — '+(interior?'INTERIOR DESIGN':'ARCHITECTURAL')+' PROJECT BRIEF\n\nName: '+data.get('name')+'\nEmail: '+data.get('email')+'\nProject type: '+data.get('type')+'\nLocation: '+data.get('location')+'\n\nVISION\n'+data.get('vision')+'\n\nPrepared with the '+brand+' concept website. This brief has not been sent.\n';
  if(briefUrl)URL.revokeObjectURL(briefUrl);
  briefUrl=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  $('#download-brief').href=briefUrl;
  $('#download-brief').download=brand.toLowerCase()+'-project-brief.txt';
  event.target.hidden=true;
  $('#brief-success').hidden=false;
});
$('.edit-brief').addEventListener('click',()=>{
  $('#contact-form').hidden=false;
  $('#brief-success').hidden=true;
});
$('#year').textContent=new Date().getFullYear();

