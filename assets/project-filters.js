(() => {
  const group = document.querySelector('.project-filters');
  if (!group) return;
  const filters = [...group.querySelectorAll('[data-project-filter]')];
  const cards = [...document.querySelectorAll('.project-card[data-project]')];
  const status = document.querySelector('.project-filter-status');
  const empty = document.querySelector('.project-empty');
  const inquiry = empty.querySelector('[data-category-inquiry]');
  let selectedLabel = '';

  function selectFilter(button) {
    const category = button.dataset.projectFilter;
    selectedLabel = category === 'all' ? '' : button.textContent.trim();
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let count = 0;
    cards.forEach(card => {
      const categories = (card.dataset.categories || '').split(' ');
      card.hidden = category !== 'all' && !categories.includes(category);
      if (!card.hidden) count++;
    });
    status.textContent = count + (count === 1 ? ' project' : ' projects')
      + (selectedLabel ? ' in ' + selectedLabel : '');
    status.hidden = false;
    empty.hidden = count > 0;
    empty.querySelector('[data-empty-category]').textContent = selectedLabel;
  }

  filters.forEach(button => button.addEventListener('click', () => selectFilter(button)));
  inquiry.addEventListener('click', () => {
    const form = document.querySelector('#contact-form');
    const type = form.querySelector('[name="type"]');
    if (![...type.options].some(option => option.value === selectedLabel)) {
      const option = document.createElement('option');
      option.value = selectedLabel;
      option.textContent = selectedLabel;
      type.appendChild(option);
    }
    type.value = selectedLabel;
    form.querySelector('[name="vision"]').value = "I'm interested in a " + selectedLabel.toLowerCase() + ' project. ';
  });
  group.hidden = false;
  selectFilter(filters.find(button => button.dataset.projectFilter === 'all'));
})();
