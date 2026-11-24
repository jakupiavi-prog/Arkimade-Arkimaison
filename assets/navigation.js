(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  const nav = header.querySelector('nav');
  const toggle = header.querySelector('.menu-button');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => ({link,section:document.querySelector(link.getAttribute('href'))})).filter(item => item.section);
  let scheduled = false;

  function updateCurrentSection() {
    scheduled = false;
    const readingLine = header.getBoundingClientRect().height + 80;
    const current = sections.find(({section}) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= readingLine && bounds.bottom > readingLine;
    });
    links.forEach(link => {
      if (current && current.link === link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleUpdate() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateCurrentSection);
    }
  }
  function dismissMenu() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  }
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) dismissMenu();
  });
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      dismissMenu();
      toggle.focus();
    }
  });
  window.addEventListener('scroll', scheduleUpdate, {passive:true});
  window.addEventListener('resize', scheduleUpdate, {passive:true});
  window.addEventListener('pageshow', scheduleUpdate);
  scheduleUpdate();
})();
