(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const state = {content:null, sha:null, page:'welcome', tab:'projects', dirty:false, busy:false, preview:false};
  const previews = new Map();
  const categories = [['housing','Housing'],['social-building','Social building'],['education','Education'],['urban-planning','Urban planning'],['restoration','Restoration'],['villa','Villa'],['apartments','Apartments'],['offices','Offices'],['hotels','Hotels'],['restaurants','Restaurants'],['beauty-salons','Beauty salons']];
  let draft = null, projectIndex = -1, draftDirty = false;
  const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
  function set(object, path, value) {
    const keys = path.split('.'); const key = keys.pop();
    keys.reduce((result, part) => result[part], object)[key] = value;
  }
  function current() { return state.page === 'welcome' ? state.content.welcome : state.content.studios[state.page]; }
  function message(text, failure = false, target = '#editor-status') {
    const element = $(target); element.textContent = text; element.classList.toggle('error', failure);
    element.setAttribute('role', failure ? 'alert' : 'status');
  }
  function refreshState() {
    $('#save-state').textContent = state.preview ? 'Editor preview' : state.busy ? 'Saving…' : state.dirty ? 'Unpublished changes' : 'All changes saved';
    $('#state-dot').classList.toggle('unsaved', state.dirty);
    $('#publish').disabled = state.preview || state.busy || !state.dirty;
    $('#publish').textContent = state.busy ? 'Please wait…' : 'Publish changes';
    document.querySelectorAll('[data-upload]').forEach(input => {input.disabled = state.preview || state.busy;});
    $('#project-form button[type="submit"]').disabled = state.busy;
  }
  function changed(scope) {
    if (scope === 'draft') draftDirty = true;
    else state.dirty = true;
    refreshState();
  }
  async function api(action, method = 'GET', data) {
    let response;
    try {
      response = await fetch('/api/cms?action=' + action, {method, credentials:'same-origin', cache:'no-store', headers:{'Content-Type':'application/json'}, ...(data ? {body:JSON.stringify(data)} : {}), signal:AbortSignal.timeout(30000)});
    } catch {throw new Error('The editor could not connect. Your edits are still here. Please try again.');}
    let result;
    try { result = await response.json(); } catch {throw new Error('The editing service is unavailable. Check that the latest website version is deployed.');}
    if (!response.ok) {
      if (response.status === 401 && state.content && !['login','logout'].includes(action) && !$('#session-dialog').open) $('#session-dialog').showModal();
      const failure = new Error(result.error || 'Something went wrong. Please try again.');failure.status = response.status;throw failure;
    }
    return result;
  }
  function field(label, path, value, options = {}) {
    const id = (options.scope === 'draft' ? 'project-' : 'field-') + path.replaceAll('.', '-');
    const attrs = `id="${id}" data-field="${path}" data-scope="${options.scope || 'page'}" maxlength="${options.max || 1200}"${options.required ? ' required' : ''}`;
    const control = options.rows ? `<textarea ${attrs} rows="${options.rows}">${esc(value)}</textarea>` : `<input ${attrs} type="${options.type || 'text'}" value="${esc(value)}">`;
    return `<div class="field${options.full ? ' full' : ''}"><label for="${id}">${label}</label>${control}${options.hint ? `<small>${options.hint}</small>` : ''}</div>`;
  }
  function safeSource(value) {
    if (/^assets\/(?:[\w-]+\/)*[\w-]+\.(png|jpe?g|webp)$/i.test(value)) return value;
    try {const url = new URL(value);if (url.protocol === 'https:' && !url.username && !url.password) return value;} catch {}
    return '';
  }
  function photo(image) {
    if (!image.src) return '<div class="photo-preview staff-no-photo">No photo yet</div>';
    const src = previews.get(image.src) || safeSource(image.src);
    const crop = image.crop;
    const style = crop ? ` style="width:${924 / crop.w * 100}%;left:${-crop.x / crop.w * 100}%;top:${-crop.y / crop.h * 100}%"` : '';
    return `<div class="photo-preview${crop ? ' cropped' : ''}"${crop ? ` style="aspect-ratio:${crop.w}/${crop.h}"` : ''}><img src="${esc(src)}" alt="${esc(image.alt)}"${style}></div>`;
  }
  function imageEditor(image, path, scope = 'page') {
    return `<div class="image-editor" data-image-editor="${path}" data-scope="${scope}"><div data-photo-path="${path}" data-scope="${scope}">${photo(image)}</div><div class="image-toolbar"><label class="secondary upload-label">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${path}" data-scope="${scope}"${state.preview ? ' disabled' : ''}></label><p class="image-caption">PNG, JPG, or WebP · up to 2 MB</p></div>${state.preview ? '<p class="image-caption">Photo uploads are available after publishing is connected.</p>' : ''}<details><summary>Photo details</summary>${field('Image address', path + '.src', image.src, {max:2048, scope, hint:'Use a direct https link to a photo.'})}${field('Describe this photo', path + '.alt', image.alt, {max:300, scope, hint:'A short description helps visitors using screen readers.'})}</details></div>`;
  }
  function card(title, intro, body) {return `<section class="editor-card"><h2>${title}</h2>${intro ? `<p>${intro}</p>` : ''}${body}</section>`;}
  function renderWelcome() {
    return '<div class="two-panels">' + ['arkimade','arkimaison'].map(brand => {
      const panel = state.content.welcome[brand];
      return card(brand === 'arkimade' ? 'Arkimade' : 'Arkimaison', '', field('Introduction', brand + '.description', panel.description, {rows:3,max:600}) + '<details class="editor-extra"><summary>Change photo</summary>' + imageEditor(panel.image, brand + '.image') + '</details>');
    }).join('') + '</div>';
  }
  function renderProjects() {
    const page = current();
    let result = `<div class="section-intro"><div><h2>Your projects</h2><p>Add a project, update its story, or arrange the order.</p></div><button type="button" class="primary" data-add-project>Add project</button></div>`;
    if (!page.projects.length) return result + '<p class="empty-projects">Your next project starts here. Add a photo and a few details.</p>';
    return result + '<div class="project-list">' + page.projects.map((project,index) => `<article class="project-row">${photo(project.image)}<div class="project-info"><h3>${esc(project.name)}</h3><p>${esc(project.type || project.area)}</p></div><div class="project-controls"><button type="button" class="quiet" data-edit-project="${index}">Edit project</button><button type="button" class="quiet" data-move-project="${index}" data-direction="-1" aria-label="Move ${esc(project.name)} up"${index === 0 ? ' disabled' : ''}>Up</button><button type="button" class="quiet" data-move-project="${index}" data-direction="1" aria-label="Move ${esc(project.name)} down"${index === page.projects.length - 1 ? ' disabled' : ''}>Down</button><button type="button" class="quiet danger" data-remove-project="${index}" aria-label="Remove ${esc(project.name)}">Remove</button></div></article>`).join('') + '</div>';
  }
  function renderCopy() {
    const page=current();
    return card('Your page', 'Update the main words visitors see.', field('Main heading','heroTitle',page.heroTitle,{rows:2,max:180,required:true}) + field('Introduction','heroDescription',page.heroDescription,{rows:3}) + field('About the studio','studioDescription',page.studioDescription,{rows:5,max:2500}))
      + '<details class="editor-extra"><summary>Change page photos</summary>' + card('Opening photo','',imageEditor(page.heroImage,'heroImage')) + card('Studio photo','',imageEditor(page.studioImage,'studioImage')) + '</details>';
  }
  function renderContact() {
    const page=current();
    return card('Contact details', 'Shown at the bottom of both this studio’s pages. Leave a field empty to hide it.', field('Email','contactEmail',page.contactEmail,{type:'email',max:254}) + field('Phone','contactPhone',page.contactPhone,{type:'tel',max:80}) + field('Address','contactAddress',page.contactAddress,{rows:3,max:400}));
  }
  function renderStaff() {
    const page = current();
    return '<details class="editor-extra"><summary>Edit staff page introduction</summary>' + card('Staff page', '', field('Page heading','staffTitle',page.staffTitle,{max:180,required:true}) + field('Introduction','staffIntro',page.staffIntro,{rows:3})) + '</details>'
      + '<div class="section-intro"><h2>Your staff</h2><button type="button" class="primary" data-add-staff>Add staff member</button></div>'
      + (page.staff.length ? page.staff.map((member,index) => {
        const path = 'staff.' + index;
        return card('Staff member ' + (index + 1), '', field('Full name',path+'.name',member.name,{max:160,required:true}) + field('Role',path+'.role',member.role,{max:160}) + field('Biography',path+'.bio',member.bio,{rows:4,max:3000})
          + `<div class="staff-controls"><button type="button" class="quiet" data-move-staff="${index}" data-direction="-1"${index===0?' disabled':''}>Move up</button><button type="button" class="quiet" data-move-staff="${index}" data-direction="1"${index===page.staff.length-1?' disabled':''}>Move down</button><button type="button" class="quiet danger" data-remove-staff="${index}">Remove member</button></div>`);
      }).join('') : '<p class="empty-projects">Add your first staff member to introduce the team.</p>');
  }
  function render() {
    const welcome = state.page === 'welcome', maison = state.page === 'arkimaison';
    $('#page-title').textContent = welcome ? 'Welcome page' : maison ? 'Arkimaison' : 'Arkimade';
    $('#page-eyebrow').textContent = welcome ? 'THE FIRST IMPRESSION' : maison ? 'INTERIORS & LIVING' : 'ARCHITECTURE & FORM';
    $('#page-description').textContent = welcome ? 'Two studios. One inviting introduction.' : 'A thoughtful space for your latest work.';
    $('#view-site').href = welcome ? 'index.html' : state.page + (state.tab === 'staff' ? '-staff' : '') + '.html';
    $('#page-nav').querySelectorAll('button').forEach(button => {
      if (button.dataset.page === state.page) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    $('#section-tabs').hidden = welcome;
    $('#section-tabs').innerHTML = [['projects','Projects'],['staff','Staff'],['copy','Page'],['contact','Contact']].map(([key,label]) => `<button type="button" data-tab="${key}"${state.tab === key ? ' aria-current="page"' : ''}>${label}</button>`).join('');
    const renderers = {projects:renderProjects,copy:renderCopy,contact:renderContact,staff:renderStaff};
    $('#editor').innerHTML = welcome ? renderWelcome() : renderers[state.tab]();
    refreshState();
  }
  function updatePhotographs() {
    document.querySelectorAll('[data-photo-path]').forEach(container => {
      const source = container.dataset.scope === 'draft' ? draft : current();
      container.innerHTML = photo(get(source,container.dataset.photoPath));
    });
  }
  function openProject(index) {
    projectIndex = index;
    draft = index >= 0 ? structuredClone(current().projects[index]) : {name:'',subtitle:'',area:'',floors:'',type:state.page === 'arkimade' ? 'Architecture' : 'Interior design',description:'',image:structuredClone(current().heroImage),categories:[]};
    draftDirty = false;
    const f = (label,path,options = {}) => field(label,path,get(draft,path),{...options,scope:'draft'});
    $('#project-editor-title').textContent = index < 0 ? 'A new project' : 'Edit project';
    $('#project-fields').innerHTML = f('Project name','name',{required:true,max:160}) + imageEditor(draft.image,'image','draft') + f('Short caption','subtitle',{max:400}) + '<div class="field-grid">' + f('Area or room','area',{max:120,hint:'For example: 300 m² or Living room.'}) + f('Levels or project stage','floors',{max:120,hint:'For example: Two storeys or Completed.'}) + '</div>' + f('Project type','type',{max:120,hint:'For example: Villa, Office, or Interior design.'}) + (state.page === 'arkimade' ? '<fieldset class="category-options"><legend>Show in these categories</legend>' + categories.map(([key,label]) => `<label><input type="checkbox" value="${key}" data-category${draft.categories.includes(key) ? ' checked' : ''}> ${label}</label>`).join('') + '</fieldset>' : '') + f('The story behind this project','description',{rows:5,max:6000});
    $('#project-editor').showModal();refreshState();
  }
  function closeProject() {
    if (state.busy) return;
    if (draftDirty && !confirm('Discard the changes to this project?')) return;
    draftDirty = false;$('#project-editor').close();draft = null;
  }
  async function upload(input) {
    const file = input.files[0];if (!file) return;
    if (state.preview) return;
    if (file.size > 2 * 1024 * 1024) {alert('Choose a photo smaller than 2 MB.');input.value = '';return;}
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {alert('Choose a JPG, PNG, or WebP photo. Export HEIC photos as JPG first.');input.value = '';return;}
    state.busy = true;refreshState();
    const label = input.closest('label');const originalText = label.firstChild.textContent;label.firstChild.textContent = 'Uploading…';
    try {
      const data = await new Promise((resolve,reject) => {const reader = new FileReader();reader.onload = () => resolve(reader.result.split(',')[1]);reader.onerror = () => reject(new Error('The photo could not be read.'));reader.readAsDataURL(file);});
      const result = await api('media','POST',{data});
      const target = input.dataset.scope === 'draft' ? draft : current();
      const image = get(target,input.dataset.upload);image.src = result.src;delete image.crop;
      previews.set(result.src,'data:' + file.type + ';base64,' + data);
      changed(input.dataset.scope);updatePhotographs();
      const link = input.closest('[data-image-editor]').querySelector('input[data-field$=".src"]');if (link) link.value = result.src;
      message('Photo uploaded. Publish your changes when you’re ready.');
    } catch (failure) {alert(failure.message);message(failure.message,true);}
    finally {state.busy = false;refreshState();label.firstChild.textContent = originalText;input.value = '';}
  }
  document.addEventListener('input', event => {
    const input = event.target;
    if (!input.matches('[data-field]') || !state.content) return;
    const scope = input.dataset.scope;
    const target = scope === 'draft' ? draft : current();
    set(target,input.dataset.field,input.value);
    if (input.dataset.field.endsWith('.src')) delete get(target,input.dataset.field.slice(0,-4)).crop;
    changed(scope);
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-upload]')) {upload(input);return;}
    if (input.matches('[data-field$=".src"]')) updatePhotographs();
    if (input.matches('[data-category]')) {draft.categories = [...$('#project-fields').querySelectorAll('[data-category]:checked')].map(checkbox => checkbox.value);changed('draft');}
  });
  $('#page-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-page]');if (!button || state.busy) return;
    state.page = button.dataset.page;state.tab = 'projects';render();
  });
  $('#section-tabs').addEventListener('click', event => {const button = event.target.closest('[data-tab]');if (button && !state.busy) {state.tab = button.dataset.tab;render();}});
  $('#editor').addEventListener('click', event => {
    if (state.busy) return;
    const button = event.target.closest('button');if (!button) return;
    if (button.hasAttribute('data-add-staff')) {
      if (current().staff.length >= 30) {message('Each studio can have up to 30 staff members.',true);return;}
      current().staff.push({name:'',role:'',bio:''});changed();render();
    }
    if (button.hasAttribute('data-remove-staff')) {
      const index = Number(button.dataset.removeStaff);
      if (confirm('Remove this staff member? Publish when ready to apply the change.')) {current().staff.splice(index,1);changed();render();}
    }
    if (button.hasAttribute('data-move-staff')) {
      const staff=current().staff,index=Number(button.dataset.moveStaff),next=index+Number(button.dataset.direction);
      if(next>=0 && next<staff.length){[staff[index],staff[next]]=[staff[next],staff[index]];changed();render();}
    }
    if (button.hasAttribute('data-add-project')) {
      if (current().projects.length >= 60) {message('This studio already has 60 projects. Remove one before adding another.',true);return;}
      openProject(-1);
    }
    if (button.hasAttribute('data-edit-project')) openProject(Number(button.dataset.editProject));
    if (button.hasAttribute('data-remove-project')) {
      const index = Number(button.dataset.removeProject);
      if (confirm('Remove “' + current().projects[index].name + '” from this page? You can publish this change when ready.')) {current().projects.splice(index,1);changed();render();}
    }
    if (button.hasAttribute('data-move-project')) {
      const projects = current().projects, index = Number(button.dataset.moveProject), next = index + Number(button.dataset.direction);
      if (next >= 0 && next < projects.length) {[projects[index],projects[next]] = [projects[next],projects[index]];changed();render();}
    }
  });
  $('#project-form').addEventListener('submit', event => {
    event.preventDefault();if (state.busy) return;
    if (projectIndex < 0) current().projects.push(draft);else current().projects[projectIndex] = draft;
    draftDirty = false;draft = null;$('#project-editor').close();changed();render();
  });
  $('#close-project').addEventListener('click',closeProject);$('#cancel-project').addEventListener('click',closeProject);
  $('#project-editor').addEventListener('cancel', event => {event.preventDefault();closeProject();});
  $('#publish').addEventListener('click', async () => {
    if (state.preview || state.busy || !state.dirty) return;
    for (const field of $('#editor').querySelectorAll('input,textarea')) if (!field.reportValidity()) return;
    const snapshot = JSON.stringify(state.content);
    state.busy = true;refreshState();message('Saving your changes…');
    try {
      const result = await api('content','PUT',{content:JSON.parse(snapshot),sha:state.sha});
      state.sha = result.sha;state.dirty = JSON.stringify(state.content) !== snapshot;
      message(result.message);
    } catch (failure) {message(failure.message,true);}
    finally {state.busy = false;refreshState();}
  });
  $('#preview-changes').addEventListener('click', async () => {
    const button = $('#preview-changes');button.disabled = true;
    try {
      const file = state.page === 'welcome' ? 'index.html' : state.page + (state.tab === 'staff' ? '-staff' : '') + '.html';
      const response = await fetch('/' + file,{cache:'no-store'});
      if (!response.ok) throw new Error('The preview could not be opened. Please try again.');
      let html = globalThis.ArkiContentRender.render(await response.text(),state.content,file);
      for (const [path,data] of previews) html = html.replaceAll('src="' + esc(path) + '"','src="' + data + '"');
      // A sandboxed, script-free frame previews the rendered content without navigation or publishing.
      $('#preview-frame').srcdoc = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      $('#preview-title').textContent = state.page === 'welcome' ? 'Welcome page' : state.page === 'arkimade' ? 'Arkimade' : 'Arkimaison';
      $('#page-preview').showModal();
    } catch (failure) {message(failure.message,true);}
    finally {button.disabled = false;}
  });
  $('#close-preview').addEventListener('click', () => $('#page-preview').close());
  for (const size of ['desktop','phone']) $('#preview-' + size).addEventListener('click', () => {
    $('#preview-frame').classList.toggle('phone',size === 'phone');
    $('#preview-desktop').setAttribute('aria-pressed',String(size === 'desktop'));
    $('#preview-phone').setAttribute('aria-pressed',String(size === 'phone'));
  });
  $('#backup').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.content,null,2) + '\n'],{type:'application/json'}));
    const link = document.createElement('a');link.href = url;link.download = 'studio-content-' + new Date().toISOString().slice(0,10) + '.json';link.click();setTimeout(() => URL.revokeObjectURL(url),1000);
    message('Backup downloaded. It includes your current unpublished edits.');
  });
  async function start(preview = false) {
    if (preview) {
      const response = await fetch('/content/site.json',{cache:'no-store'});
      if (!response.ok) throw new Error('The editor preview could not be loaded.');
      state.content = await response.json();state.sha = null;
    } else {const result = await api('content');state.content = result.content;state.sha = result.sha;}
    state.preview = preview;state.dirty = false;
    $('#preview-notice').hidden = !preview;$('#sign-in').hidden = true;$('#dashboard').hidden = false;
    $('#sign-out').textContent = preview ? 'Leave preview' : 'Sign out';
    render();
  }
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();const button = event.target.querySelector('button');button.disabled = true;
    try {await api('login','POST',{password:$('#password').value});$('#password').value = '';await start();}
    catch (failure) {message(failure.message,true,'#login-status');}
    finally {button.disabled = false;}
  });
  $('#session-form').addEventListener('submit', async event => {
    event.preventDefault();const button = event.target.querySelector('button');button.disabled = true;
    try {await api('login','POST',{password:$('#session-password').value});$('#session-password').value = '';$('#session-dialog').close();message('Signed in again. Your edits are ready to publish.');}
    catch (failure) {$('#session-status').textContent = failure.message;}
    finally {button.disabled = false;}
  });
  $('#cancel-session').addEventListener('click', () => $('#session-dialog').close());
  $('#sign-out').addEventListener('click', async () => {
    if (state.busy || ((state.dirty || draftDirty) && !confirm('Sign out and discard your unpublished changes? Download a backup first if you want to keep them.'))) return;
    try {if (!state.preview) await api('logout','POST',{});state.dirty = false;draftDirty = false;location.reload();} catch (failure) {message(failure.message,true);}
  });
  window.addEventListener('beforeunload', event => {if (state.dirty || draftDirty || state.busy) {event.preventDefault();event.returnValue = '';}});
  async function boot() {
    $('#try-preview').hidden = false;
    $('#try-preview').addEventListener('click', async () => {try {await start(true);} catch (failure) {message(failure.message,true,'#login-status');}});
    try {
      const status = await api('status');
      if (status.authenticated) await start();
      else if (!status.configured) {
        $('#login-form').querySelector('button').disabled = true;$('#password').disabled = true;
        message('Publishing needs one-time setup by the site administrator. You can explore the editor preview now.',false,'#login-status');
      } else message('Sign in with your owner password.',false,'#login-status');
    } catch (failure) {message(failure.message,true,'#login-status');}
  }
  boot();
})();
