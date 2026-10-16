// ごはん・人数 list: the column headings reorder the Rails-rendered rows.
// Seats and party sizes sort largest first on the first press; unknown values stay last.
const KEYS = {
  position: card => Number(card.dataset.position),
  name: card => card.dataset.name,
  seats: card => numberOrNull(card.dataset.totalSeats),
  group: card => numberOrNull(card.dataset.groupCapacity)
};
const DESCENDING_FIRST = new Set(['seats', 'group']);

function numberOrNull(value) {
  return value === undefined || value === '' ? null : Number(value);
}

export function compareRows(key, direction) {
  const read = KEYS[key];
  return (a, b) => {
    const [x, y] = [read(a), read(b)];
    if (x === null || y === null) return (x === null) - (y === null);
    const order = typeof x === 'string' ? x.localeCompare(y, 'ja') : x - y;
    return (direction === 'desc' ? -order : order) || KEYS.position(a) - KEYS.position(b);
  };
}

export function initRestaurantSort(page) {
  const grid = page.querySelector('#dining .dining-grid');
  const head = grid?.querySelector('.dining-list-head');
  if (!head) return () => {};
  let current = { key: 'position', direction: 'asc' };

  function sort(key) {
    const direction =
      current.key === key ? (current.direction === 'asc' ? 'desc' : 'asc') : DESCENDING_FIRST.has(key) ? 'desc' : 'asc';
    current = { key, direction };
    const rows = [...grid.querySelectorAll(':scope > [data-restaurant-id]')].sort(compareRows(key, direction));
    grid.append(...rows);
    for (const button of head.querySelectorAll('[data-dining-sort]')) {
      const active = button.dataset.diningSort === key;
      button.setAttribute('aria-pressed', String(active));
      button.dataset.direction = active ? direction : '';
    }
  }

  const onClick = event => {
    const button = event.target.closest('[data-dining-sort]');
    if (button) sort(button.dataset.diningSort);
  };
  head.addEventListener('click', onClick);
  return () => head.removeEventListener('click', onClick);
}
