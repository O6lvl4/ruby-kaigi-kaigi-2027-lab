export const STAGE_KEY = 'rubykaigi-last-stage-v1';
export function stageLabel(stage) {
  if (/Loading WebAssembly/.test(stage)) return 'Ruby/Wasm を読み込み・コンパイル中';
  if (/Instantiating WebAssembly/.test(stage)) return 'Ruby/Wasm を初期化中';
  if (stage === 'Ruby/Wasm worker startup') return 'Ruby/Wasm の起動準備';
  if (stage.startsWith('Rails GET ')) return 'Rails で本文を生成中';
  if (stage === 'Rails pages and map initialization completed') return 'Rails の本文と地図の初期化が完了';
  return stage;
}
export function saveStage(record) {
  // One local record, no device ID, user agent, personal data, or remote telemetry.
  try {
    localStorage.setItem(
      STAGE_KEY,
      JSON.stringify({
        build: record.build,
        state: record.state,
        stage: stageLabel(record.stage),
        at: record.at,
        source: record.source
      })
    );
    return true;
  } catch {
    return false;
  }
}
export function readStage() {
  try {
    return JSON.parse(localStorage.getItem(STAGE_KEY) || 'null');
  } catch {
    return null;
  }
}
