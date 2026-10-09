// Every guide page: its Rails path, the JSON it needs, and its JavaScript.
// Pages without behaviour (event, archives) are plain Rails HTML.
import { mapPage } from './map_page.js';
import { restaurantsPage } from './restaurants_page.js';

export function guidePages(rails) {
  const context = {
    request: (path, accept) => rails.request(path, accept),
    rendered: (path, accept = 'application/json') => rails.rendered(path, accept)
  };
  return new Map([
    ['/', mapPage(context)],
    ['/event', {}],
    ['/restaurants', restaurantsPage(context)],
    ['/archives', {}]
  ]);
}

// Anchors from the former single-page guide, so old shared links still land.
export const LEGACY_ANCHORS = {
  orientation: '/',
  overview: '/event',
  access: '/event',
  pending: '/event',
  next: '/event',
  dining: '/restaurants',
  archive: '/archives'
};
