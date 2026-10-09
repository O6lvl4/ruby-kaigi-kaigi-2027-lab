// Remembers how far the last boot got (this tab only), so an interrupted load
// can be reported instead of silently retried. No telemetry leaves the browser.
import { saveStage, stageLabel } from './status.js';

const KEY = 'rubykaigi-boot-checkpoint-v1';

export class BootCheckpoint {
  constructor(build) {
    this.build = build;
    this.step = 'starting';
    try {
      this.previous = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    } catch {
      this.previous = null;
    }
  }

  get interrupted() {
    return this.previous?.state === 'booting';
  }

  record(state, step = this.step) {
    this.step = step;
    const entry = { build: this.build, state, stage: stageLabel(step), at: new Date().toISOString() };
    saveStage({ ...entry, source: 'reading' });
    try {
      sessionStorage.setItem(KEY, JSON.stringify(entry));
    } catch {
      /* storage unavailable: nothing to resume */
    }
  }

  diagnostic(error = '') {
    return JSON.stringify(
      {
        build: this.build,
        time: new Date().toISOString(),
        stage: this.step,
        error,
        previous: this.previous,
        browser: navigator.userAgent
      },
      null,
      2
    );
  }
}
