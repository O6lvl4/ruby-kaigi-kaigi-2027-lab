// "/archives" is rendered by Rails; only image enlargement needs JavaScript.
import { initPhotoViewer } from '../features/archives/photo_viewer.js';

export function archivesPage() {
  return { mount: initPhotoViewer };
}
