// A response counts as a page only if Rails/ActionView rendered it inside Ruby/Wasm
// (see app/controllers/concerns/browser_rendered.rb). Nothing else is ever shown.
export const RENDERER = 'Rails-ActionView-ERB';

export function isRailsRendered(response, { html = true } = {}) {
  return (
    response.status === 200 &&
    response.headers['x-renderer'] === RENDERER &&
    response.headers['x-ruby-platform'] === 'wasm32-wasi' &&
    (!html || (typeof response.body === 'string' && response.body.includes('data-renderer="rails-erb"')))
  );
}
