// Pinch and Ctrl/⌘ + wheel zoom a map, never the whole page; a plain wheel keeps
// scrolling the page and briefly shows how to zoom (as embedded Google Maps does).
//
// Trackpad pinch reaches Chrome, Edge and Firefox as a wheel event with ctrlKey set;
// Safari sends its own gesturestart/gesturechange events instead.
//
//   enableGestureZoom(container, (factor, event) => …)  // factor > 1 zooms in
const WHEEL_UNITS_PER_DOUBLING = 120;
const HINT_MS = 1500;

export function enableGestureZoom(container, onZoom) {
  const hint = document.createElement('p');
  hint.className = 'map-zoom-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = '地図の拡大・縮小は、ピンチ操作か Ctrl（⌘）＋スクロール';
  hint.hidden = true;
  container.append(hint);
  let hintTimer;
  let lastScale = 1;

  const showHint = () => {
    hint.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => (hint.hidden = true), HINT_MS);
  };

  const onWheel = event => {
    if (!event.ctrlKey && !event.metaKey) return showHint();
    event.preventDefault();
    onZoom(2 ** (-event.deltaY / WHEEL_UNITS_PER_DOUBLING), event);
    return undefined;
  };
  const onGestureStart = event => {
    event.preventDefault();
    lastScale = 1;
  };
  const onGestureChange = event => {
    event.preventDefault();
    onZoom(event.scale / lastScale, event);
    lastScale = event.scale;
  };

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('gesturestart', onGestureStart);
  container.addEventListener('gesturechange', onGestureChange);
  return () => {
    clearTimeout(hintTimer);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('gesturestart', onGestureStart);
    container.removeEventListener('gesturechange', onGestureChange);
    hint.remove();
  };
}
