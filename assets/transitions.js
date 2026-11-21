(() => {
  const root = document.documentElement;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'arki-studio-arrival';
  const normalizePath = path => path.replace(/\.html\/?$/, '').replace(/\/$/, '') || '/';
  let generation = 0;
  const timers = new Set();
  function later(callback, delay) {
    const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  }
  let pending;
  try {
    pending = JSON.parse(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
  } catch (_) { /* Navigation also works without browser storage. */ }
  const arrival = pending && typeof pending.path === 'string' && Date.now() - pending.time < 30000
    && normalizePath(pending.path) === normalizePath(location.pathname) && ['made', 'maison'].includes(pending.theme);
  if (arrival) root.dataset.studioEntry = pending.theme;

  function makeOverlay(theme, phase) {
    const overlay = document.createElement('div');
    overlay.className = 'studio-transition studio-transition--' + theme + ' is-' + phase + ' is-preparing';
    overlay.setAttribute('aria-hidden', 'true');
    if (theme === 'maison') {
      overlay.innerHTML = '<div class="maison-atmosphere"></div><div class="maison-room"><img class="maison-room-image" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=85" alt="" decoding="async" fetchpriority="high"><div class="maison-light"></div></div>'
        + '<div class="maison-materials">' + [0,1,2,3,4].map(i => '<div class="maison-material" style="--panel:'+i+'"></div>').join('') + '</div>'
        + '<div class="maison-signature"><img class="transition-logo transition-logo--maison" src="assets/arkimaison-logo.png" alt="Arkimaison"></div>'
        + '<div class="maison-grain"></div>';
    } else {
      overlay.innerHTML = '<div class="made-scene"><img class="made-scene-image" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=85" alt="" decoding="async" fetchpriority="high"></div>'
        + '<div class="made-facade">' + [0,1,2,3].map(i => '<div class="made-slab" style="--slab:'+i+'"></div>').join('') + '</div>'
        + '<div class="made-signature"><img class="transition-logo transition-logo--made" src="assets/arkimade-logo.png" alt="Arkimade"></div>';
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  function reset() {
    generation++;
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    root.classList.remove('is-studio-leaving');
    document.body.classList.remove('maison-arriving');
    document.body.classList.remove('made-arriving');
    delete root.dataset.studioEntry;
    document.querySelectorAll('.studio-transition').forEach(node => node.remove());
    document.querySelectorAll('[aria-busy="true"]').forEach(node => node.removeAttribute('aria-busy'));
  }

  async function startOverlay(overlay) {
    // Cold image caches can otherwise leave the logo invisible until after its fade.
    const logo = overlay.querySelector('.transition-logo');
    if (logo && !logo.complete) {
      const loaded = typeof logo.decode === 'function'
        ? logo.decode().catch(() => {})
        : new Promise(resolve => {
            logo.addEventListener('load', resolve, {once:true});
            logo.addEventListener('error', resolve, {once:true});
          });
      await Promise.race([loaded, new Promise(resolve => setTimeout(resolve, 900))]);
    }
    // Give Safari a painted starting frame before starting animation timers.
    await Promise.race([
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise(resolve => setTimeout(resolve, 200))
    ]);
    overlay.classList.remove('is-preparing');
  }

  function initialize() {
    if (arrival) {
      const overlay = makeOverlay(pending.theme, 'entering');
      const current = generation;
      startOverlay(overlay).then(() => {
        if (current !== generation) return;
        delete root.dataset.studioEntry;
        if (!motionPreference.matches) {
          const arrivalClass = pending.theme === 'maison' ? 'maison-arriving' : 'made-arriving';
          document.body.classList.add(arrivalClass);
          later(() => document.body.classList.remove(arrivalClass), 1450);
        }
        later(() => overlay.remove(), motionPreference.matches ? 550 : 1500);
      });
    }
    document.querySelectorAll('.enter-button, .studio-switch').forEach(link => {
      link.addEventListener('click', async event => {
        if (event.defaultPrevented || (typeof event.button === 'number' && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
        const target = new URL(link.href, location.href);
        if (target.origin !== location.origin) return;
        const targetPath = normalizePath(target.pathname);
        const theme = targetPath.endsWith('/arkimade') ? 'made'
          : targetPath.endsWith('/arkimaison') ? 'maison' : null;
        if (!theme) return;
        event.preventDefault();
        if (root.classList.contains('is-studio-leaving')) return;
        root.classList.add('is-studio-leaving');
        link.setAttribute('aria-busy', 'true');
        const overlay = makeOverlay(theme, 'exiting');
        const current = generation;
        await startOverlay(overlay);
        if (current !== generation) return;
        later(() => {
          try { sessionStorage.setItem(key, JSON.stringify({theme, path:target.pathname, time:Date.now()})); } catch (_) {}
          location.assign(target.href);
        }, motionPreference.matches ? 450 : 1250);
        later(reset, 6000);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
})();
