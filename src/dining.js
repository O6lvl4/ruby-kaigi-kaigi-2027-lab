// Filter the bounded, genuine Rails-rendered cards; no extra requests or runtime.
export function initDiningGuide() {
  const select = document.getElementById('dining-capacity');
  if (!select) return;
  const cards = [...document.querySelectorAll('[data-restaurant-id]')];
  const update = () => {
    const minimum = Number(select.value);
    let matches = 0, unknown = 0;
    for (const card of cards) {
      const capacity = card.dataset.groupCapacity;
      const known = capacity !== '';
      const included = known && Number(capacity) >= minimum;
      card.hidden = known && !included;
      if (included) matches++;
      if (!known) unknown++;
    }
    document.getElementById('dining-results').textContent = minimum
      ? `掲載上限が${minimum}人以上の候補 ${matches}件 · 人数要確認 ${unknown}件（別枠で表示）`
      : `${matches + unknown}件を掲載（うち人数要確認 ${unknown}件）`;
    document.getElementById('dining-empty').hidden = minimum === 0 || matches > 0;
  };
  select.addEventListener('change', update);
  update();
}
