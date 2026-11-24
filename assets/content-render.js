(() => {
'use strict';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const lines = value => escape(value).replace(/\n/g, '<br>');
function picture(image, classes, eager = false) {
  const crop = image.crop;
  const style = crop ? ` style="--x:${crop.x};--y:${crop.y};--w:${crop.w};--h:${crop.h}"` : '';
  return `<div class="crop ${classes}${crop ? '' : ' cms-photo'}"${style}><img src="${escape(image.src)}" alt="${escape(image.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>${crop && classes === 'hero-image' ? '<div class="hero-cleanup"></div>' : ''}</div>`;
}
function projectCards(page, brand) {
  if (!page.projects.length) return '<p class="cms-no-projects">New projects are coming soon.</p>';
  return page.projects.map((project, index) => `<button type="button" class="project-card" data-project="${index}"${brand === 'arkimade' ? ` data-categories="${escape(project.categories.join(' '))}"` : ''}>
${picture(project.image, 'project-image')}<div class="project-summary"><h3>${escape(project.name)}</h3>${brand === 'arkimaison' ? `<span>${String(index + 1).padStart(2, '0')} / ${String(page.projects.length).padStart(2, '0')}</span>` : ''}</div><p>${escape(project.subtitle)}</p><div class="project-meta"><span>${escape(project.area)}</span><span>${escape(project.floors)}</span><span>${escape(project.type)}</span></div></button>`).join('\n');
}
function block(html, key, value) {
  const pattern = new RegExp('<!-- cms:' + key + ' -->[\\s\\S]*?<!-- /cms:' + key + ' -->', 'g');
  return html.replace(pattern, () => `<!-- cms:${key} -->${value}<!-- /cms:${key} -->`);
}
function contactDetails(source) {
  const details=[];
  if(source.contactEmail) details.push('<a href="mailto:' + escape(source.contactEmail) + '">' + escape(source.contactEmail) + '</a>');
  if(source.contactPhone) details.push('<a href="tel:' + source.contactPhone.replace(/[^+\d]/g,'') + '">' + escape(source.contactPhone) + '</a>');
  if(source.contactAddress) details.push('<span>' + lines(source.contactAddress) + '</span>');
  return details.length ? '<address class="cms-contact-details" aria-label="Contact details">' + details.join('') + '</address>' : '';
}
function render(html, content, file) {
  const brand = /^arkimade(?:-staff)?\.html$/.test(file) ? 'arkimade' : /^arkimaison(?:-staff)?\.html$/.test(file) ? 'arkimaison' : null;
  const source = brand ? content.studios[brand] : Object.fromEntries(Object.entries(content.welcome).flatMap(([key, panel]) => Object.entries(panel).map(([field, value]) => [key + '.' + field, value])));
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-cms="([\w.]+)"[^>]*>)[\s\S]*?(<\/\2>)/gi, (match, start, tag, key, end) => {
    let value = source[key];
    if (key.startsWith('step.')) {const [,index,field] = key.split('.'); value = source.steps?.[index]?.[field];}
    return typeof value === 'string' ? start + lines(value) + end : match;
  });
  if (!brand) {
    for (const key of ['arkimade', 'arkimaison']) html = block(html, key + 'Image', `<img class="panel-image cms-welcome-image" src="${escape(content.welcome[key].image.src)}" alt="${escape(content.welcome[key].image.alt)}" fetchpriority="high">`);
    // Keep the original screenshot positioning until the owner replaces that photograph.
    if (content.welcome.arkimade.image.crop) html = block(html, 'arkimadeImage', `<div class="architecture-image" aria-hidden="true"><img src="${escape(content.welcome.arkimade.image.src)}" alt=""></div>`);
    const contacts = ['arkimade','arkimaison'].map(key => {
      const details=contactDetails(content.studios[key]);
      return details ? '<section><h2>' + (key==='arkimade'?'Arkimade':'Arkimaison') + '</h2>' + details + '</section>' : '';
    }).join('');
    html=block(html,'welcomeContact',contacts ? '<footer class="welcome-contact" aria-label="Studio contacts">' + contacts + '</footer>' : '');
    return html;
  }
  html = block(html, 'projects', projectCards(source, brand));
  html = block(html, 'heroImage', picture(source.heroImage, 'hero-image', true) + (source.heroImage.crop ? '<style>.hero-image{position:relative}.hero-image:after{content:"";position:absolute;top:0;left:0;width:17%;height:15%;background:#202020}</style>' : ''));
  html = block(html, 'studioImage', picture(source.studioImage, 'collection-image'));
  html = block(html, 'staff', (source.staff || []).map(member => `<article class="staff-card"><div class="staff-identity"><h2>${escape(member.name)}</h2>${member.role ? '<p class="staff-role">' + escape(member.role) + '</p>' : ''}</div>${member.bio ? '<p class="staff-bio">' + lines(member.bio) + '</p>' : ''}</article>`).join('') || '<div class="staff-empty"><h2>Good work begins with people.</h2><p>Get to know the voices, ideas, and experience behind our studio. Team introductions are coming soon.</p></div>');
  html = block(html, 'contactDetails', contactDetails(source));
  html = block(html, 'projectData', `<script id="studio-data" type="application/json">${JSON.stringify(source.projects).replace(/</g, '\\u003c')}</script>`);
  return html;
}
const exported = {render, escape, picture};
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
else globalThis.ArkiContentRender = exported;

})();
