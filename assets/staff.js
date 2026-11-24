(() => {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.header nav');
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
})();
