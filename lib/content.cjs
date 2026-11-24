const categories = [
  ['housing', 'Housing'], ['social-building', 'Social building'], ['education', 'Education'],
  ['urban-planning', 'Urban planning'], ['restoration', 'Restoration'], ['villa', 'Villa'],
  ['apartments', 'Apartments'], ['offices', 'Offices'], ['hotels', 'Hotels'],
  ['restaurants', 'Restaurants'], ['beauty-salons', 'Beauty salons']
];
const pageFields = {
  heroTitle:180, heroDescription:1200, heroButton:80, heroCaption:160,
  projectsTitle:180, projectsIntro:1200, projectsNote:300,
  studioLabel:120, studioTitle:180, studioDescription:2500,
  approachLabel:120, approachTitle:180, approachIntro:1200,
  contactLabel:120, contactTitle:180, contactButton:80,
  contactEmail:254, contactPhone:80, contactAddress:400,
  footerText:300, footerNote:200
};
function fail(message) { const error = new Error(message); error.status = 400; throw error; }
function object(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' is missing.'); }
function string(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (required && !value.trim())) fail('Please check ' + label + '.');
  return value;
}
function image(value, label) {
  object(value, label);
  string(value.src, 2048, label + ' image', true);
  string(value.alt, 300, label + ' image description');
  const local = /^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(value.src);
  let remote = false;
  try { const url = new URL(value.src); remote = url.protocol === 'https:' && !url.username && !url.password; } catch {}
  if (!local && !remote) fail(label + ' must use an uploaded image or an https image address.');
  const result = {src:value.src, alt:value.alt};
  if (value.crop !== undefined) {
    object(value.crop, label + ' crop');
    result.crop = {};
    for (const key of ['x', 'y', 'w', 'h']) {
      const number = value.crop[key];
      if (!Number.isInteger(number) || number < (key === 'w' || key === 'h' ? 1 : 0) || number > 10000) fail('Invalid image crop.');
      result.crop[key] = number;
    }
  }
  return result;
}
function validateContent(input) {
  object(input, 'Website content');
  if (input.version !== 1) fail('Unsupported content version. Please refresh the editor.');
  object(input.welcome, 'Welcome page'); object(input.studios, 'Studios');
  const output = {version:1, welcome:{}, studios:{}};
  for (const key of ['arkimade', 'arkimaison']) {
    const panel = input.welcome[key]; object(panel, key + ' welcome panel');
    const cleanPanel = {};
    for (const field of ['kicker', 'description', 'button', 'bottom']) cleanPanel[field] = string(panel[field], field === 'description' ? 600 : 160, key + ' ' + field);
    cleanPanel.image = image(panel.image, key + ' welcome');
    output.welcome[key] = cleanPanel;
    const page = input.studios[key]; object(page, key + ' page');
    const clean = {};
    for (const [field, max] of Object.entries(pageFields)) clean[field] = string(page[field], max, key + ' ' + field, field === 'heroTitle');
    clean.staffTitle = string(page.staffTitle ?? 'The people behind the studio.', 180, 'staff page title', true);
    clean.staffIntro = string(page.staffIntro ?? 'Meet our team.', 1200, 'staff introduction');
    const staff = page.staff ?? [];
    if (!Array.isArray(staff) || staff.length > 30) fail('Each studio can have up to 30 staff members.');
    clean.staff = staff.map(member => {
      object(member, 'Staff member');
      return {
        name:string(member.name, 160, 'staff member name', true),
        role:string(member.role, 160, 'staff member role'),
        bio:string(member.bio, 3000, 'staff biography'),
        image:member.image?.src === '' ? {src:'',alt:string(member.image.alt,300,'staff photo description')} : image(member.image,'Staff member')
      };
    });
    if (clean.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.contactEmail)) fail('Please enter a valid contact email address.');
    if (clean.contactPhone && !/^[+\d\s().-]{3,80}$/.test(clean.contactPhone)) fail('Please check the contact phone number.');
    for (const field of ['heroImage', 'studioImage']) clean[field] = image(page[field], key + ' ' + field);
    if (!Array.isArray(page.steps) || page.steps.length !== 3) fail('Please keep the three process steps.');
    clean.steps = page.steps.map((step, index) => {
      object(step, 'Process step');
      return {title:string(step.title, 160, 'step title', true), text:string(step.text, 2500, 'step description')};
    });
    if (!Array.isArray(page.projects) || page.projects.length > 60) fail('Each studio can have up to 60 projects.');
    clean.projects = page.projects.map((project, index) => {
      object(project, 'Project ' + (index + 1));
      const result = {};
      for (const [field, max] of Object.entries({name:160, subtitle:400, area:120, floors:120, type:120, description:6000})) result[field] = string(project[field], max, 'project ' + (index + 1) + ' ' + field, field === 'name');
      result.image = image(project.image, 'Project ' + (index + 1));
      if (!Array.isArray(project.categories) || project.categories.length > categories.length || project.categories.some(value => !categories.some(([id]) => id === value))) fail('Please check the project categories.');
      result.categories = key === 'arkimade' ? [...new Set(project.categories)] : [];
      return result;
    });
    output.studios[key] = clean;
  }
  return output;
}
module.exports = {validateContent, categories, pageFields};
