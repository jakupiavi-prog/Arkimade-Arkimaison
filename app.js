const $ = selector => document.querySelector(selector);
const brand = document.body.dataset.brand || 'Arkimade';
const interior = brand === 'Arkimaison';
const projects = JSON.parse(document.querySelector('#studio-data').textContent);
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
  if (!project) return;
  const node=(tag,text,className)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(className)element.className=className;return element;};
  const picture=node('div','','crop'+(project.image.crop?'':' cms-photo'));
  if(project.image.crop)for(const [key,value] of Object.entries(project.image.crop))picture.style.setProperty('--'+key,value);
  const photo=node('img');photo.src=project.image.src;photo.alt=project.image.alt;picture.append(photo);
  const detail=node('div','','project-detail');
  detail.append(node('span',interior?'INTERIOR DESIGN':'ARCHITECTURE','eyebrow'),node('h2',project.name),node('p',project.description));
  const meta=node('div','','detail-meta');
  [project.area,project.floors,project.type].forEach(value=>meta.append(node('span',value)));
  const discuss=node('button','DISCUSS YOUR PROJECT','button');discuss.id='similar-project';
  detail.append(meta,discuss);$('#project-content').replaceChildren(picture,detail);
  $('#similar-project').addEventListener('click',()=>{
    openDialog('#contact-dialog');
    $('#contact-form [name=vision]').value="I'm interested in a project inspired by "+project.name+'. ';
  });
  openDialog('#project-dialog');
}));
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

