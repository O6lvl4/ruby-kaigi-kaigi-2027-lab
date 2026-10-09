// "/" 宮崎の地図: schematic/real map driven by Rails-rendered scenarios.
import { MAP_SCENARIOS, scenarioPath } from '../features/map/scenarios.js';

export function mapPage({ request }) {
  return {
    data: MAP_SCENARIOS.map(scenarioPath),
    mount(root) {
      let unmount = null;
      let unmounted = false;
      import('../features/map/map_guide.js')
        .then(({ initMapGuide }) => initMapGuide(root, request))
        .then(cleanup => {
          if (unmounted) cleanup?.();
          else unmount = cleanup;
        })
        .catch(error => {
          if (!unmounted) showMapError(root, error);
        });
      return () => {
        unmounted = true;
        unmount?.();
      };
    }
  };
}

function showMapError(root, error) {
  const status = root.querySelector('#map-status');
  if (status) {
    status.textContent = '地図を起動できませんでした。地点カードと公式の出典はそのまま確認できます。';
    status.classList.add('map-warning');
  }
  window.guideApp.mapError = error.message;
}
