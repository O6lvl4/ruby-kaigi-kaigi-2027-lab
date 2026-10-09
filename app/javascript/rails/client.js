// Talks to Rails running inside the Ruby/Wasm worker (./worker.js).
//
//   const rails = new RailsClient({ onProgress: message => … });
//   await rails.boot('guide');
//   const page = await rails.request('/restaurants', 'text/html');
//
// Responses can be kept with `prerender` so the worker can be released and the
// pages served afterwards from memory.
export class RailsClient {
  #worker = null;
  #sequence = 0;
  #pending = new Map();
  #rendered = new Map();

  constructor({ onProgress = () => {}, onCrash = () => {}, scriptName = '' } = {}) {
    this.onProgress = onProgress;
    this.onCrash = onCrash;
    this.scriptName = scriptName;
    this.requestCount = 0;
  }

  get running() {
    return this.#worker !== null;
  }

  async boot(mode) {
    this.#worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    this.#worker.onmessage = ({ data }) => this.#receive(data);
    this.#worker.onerror = event => {
      event.preventDefault();
      this.onCrash(new Error(event.message || 'Wasm worker error'));
    };
    return this.#call('boot', { mode });
  }

  call(type, extra) {
    return this.#call(type, extra);
  }

  request(path, accept = 'application/json', { method = 'GET', body } = {}) {
    const key = cacheKey(path, accept);
    if (method === 'GET' && this.#rendered.has(key)) return Promise.resolve(this.#rendered.get(key));
    if (!this.running) return Promise.reject(new Error('この読み取り結果は事前生成されていません'));
    this.requestCount++;
    return this.#call('request', { request: { method, path, accept, body, scriptName: this.scriptName } });
  }

  // Renders each request once and keeps the response for later reads.
  async prerender(requests, verify = () => {}) {
    for (const { path, accept } of requests) {
      const response = await this.request(path, accept);
      verify(response, path);
      this.#rendered.set(cacheKey(path, accept), response);
    }
  }

  rendered(path, accept = 'text/html') {
    return this.#rendered.get(cacheKey(path, accept));
  }

  // Ends the Ruby VM; prerendered responses stay readable.
  release() {
    this.#worker?.terminate();
    this.#worker = null;
  }

  dispose() {
    this.release();
    for (const call of this.#pending.values()) call.reject(new Error('読み込みを中断しました'));
    this.#pending.clear();
    this.#rendered.clear();
    this.requestCount = 0;
  }

  #call(type, extra = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.#sequence;
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ id, type, ...extra });
    });
  }

  #receive(data) {
    if (data.type === 'progress') {
      this.onProgress(data.message);
      return;
    }
    const call = this.#pending.get(data.id);
    if (!call) return;
    this.#pending.delete(data.id);
    if (data.error) call.reject(new Error(data.error));
    else call.resolve(data.result);
  }
}

function cacheKey(path, accept) {
  return `${accept} ${path}`;
}
