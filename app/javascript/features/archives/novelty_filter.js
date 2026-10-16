// 年ごとの記録: narrows the Rails-rendered novelty cards by kind, how they were handed
// out, and whether the source article has photos. Everything is already in the page;
// filtering only toggles `hidden`.
export function matchesNovelty(item, { kind = 'all', reach = 'all', photo = false }) {
  return (
    (kind === 'all' || item.kind === kind) &&
    (reach === 'all' || item.reach === reach) &&
    (!photo || item.photo === 'yes')
  );
}

export function initNoveltyFilter(root) {
  const explorer = root.querySelector('[data-novelty-explorer]');
  const form = explorer?.querySelector('[data-novelty-filters]');
  if (!form) return () => {};
  const cards = [...explorer.querySelectorAll('[data-novelty-id]')];
  const editions = [...explorer.querySelectorAll('[data-archive-year]')];
  const result = explorer.querySelector('[data-novelty-result]');
  const empty = explorer.querySelector('[data-novelty-empty]');
  let filtered = false;

  function criteria() {
    const data = new FormData(form);
    return { kind: data.get('kind') || 'all', reach: data.get('reach') || 'all', photo: data.has('photo') };
  }

  function apply() {
    const chosen = criteria();
    filtered = chosen.kind !== 'all' || chosen.reach !== 'all' || chosen.photo;
    let shown = 0;
    for (const card of cards) {
      card.hidden = !matchesNovelty(card.dataset, chosen);
      if (!card.hidden) shown += 1;
    }
    // While filtering, a year without matches (or without novelties) steps aside,
    // and the year's photos give way to the matching items.
    for (const edition of editions) {
      const visible = edition.querySelectorAll('[data-novelty-id]:not([hidden])').length;
      edition.hidden = filtered && visible === 0;
      const count = edition.querySelector('[data-novelty-year-count]');
      if (count) count.textContent = String(visible);
      for (const figure of edition.querySelectorAll('[data-novelty-figure]')) figure.hidden = filtered;
    }
    result.textContent = filtered ? `${cards.length}件中 ${shown}件` : `${cards.length}件`;
    form.classList.toggle('is-filtered', filtered);
    empty.hidden = shown > 0;
  }

  function clear() {
    form.reset();
    apply();
  }

  // Links from the comparison table and year navigation must land on something visible.
  function onJump(event) {
    if (filtered && event.target.closest('[data-novelty-jump]')) clear();
    if (event.target.closest('[data-novelty-clear]')) clear();
  }

  const onReset = () => requestAnimationFrame(apply);
  form.addEventListener('change', apply);
  form.addEventListener('reset', onReset);
  root.addEventListener('click', onJump, true);
  apply();
  return () => {
    form.removeEventListener('change', apply);
    form.removeEventListener('reset', onReset);
    root.removeEventListener('click', onJump, true);
  };
}
