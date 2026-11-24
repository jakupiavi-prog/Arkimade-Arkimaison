(() => {
  const group = document.querySelector('.project-toolbar');
  if (!group) return;
  const categorySelect = group.querySelector('[data-project-category]');
  const cards = [...document.querySelectorAll('.project-card[data-project]')];
  if (!cards.length) return;
  const status = document.querySelector('.project-filter-status');
  const empty = document.querySelector('.project-empty');
  const inquiry = empty.querySelector('[data-category-inquiry]');
  let selectedLabel = '';

  function selectFilter() {
    const category = categorySelect.value;
    selectedLabel = category === 'all' ? '' : categorySelect.options[categorySelect.selectedIndex].textContent.trim();
    let count = 0;
    cards.forEach(card => {
      const categories = (card.dataset.categories || '').split(' ');
      card.hidden = category !== 'all' && !categories.includes(category);
      if (!card.hidden) count++;
    });
    status.textContent = count + (count === 1 ? ' project' : ' projects');
    status.hidden = false;
    empty.hidden = count > 0;
    empty.querySelector('[data-empty-category]').textContent = selectedLabel;
  }

  categorySelect.addEventListener('change', selectFilter);
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
  selectFilter();
})();
