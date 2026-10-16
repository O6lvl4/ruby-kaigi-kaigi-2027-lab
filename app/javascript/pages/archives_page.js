// "/archives" is rendered by Rails; JavaScript adds image enlargement and novelty filters.
import { initPhotoViewer } from '../features/archives/photo_viewer.js';
import { initNoveltyFilter } from '../features/archives/novelty_filter.js';

export function archivesPage() {
  return {
    mount(root) {
      const teardown = [initPhotoViewer(root), initNoveltyFilter(root)];
      return () => teardown.forEach(stop => stop());
    }
  };
}
