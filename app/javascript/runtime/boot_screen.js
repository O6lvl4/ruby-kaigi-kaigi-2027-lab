// The loading / error panel shown until Rails has rendered the guide (index.html #boot-panel).
const $ = id => document.getElementById(id);

export const bootScreen = {
  reset() {
    $('boot-panel').hidden = false;
    $('rails-root').hidden = true;
    $('rails-root').replaceChildren();
    for (const id of ['boot-error', 'retry', 'diagnostics']) $(id).hidden = true;
    $('copy-status').textContent = '';
    document.querySelector('#boot-panel h1').textContent = 'まとめを読み込んでいます';
    $('boot-status').textContent = 'Ruby / Rails を読み込んでいます…';
    $('boot-progress').hidden = false;
    this.setProgress(0);
  },

  progress(message) {
    $('boot-status').textContent = message;
  },

  // fraction: 0–1 of the whole boot (download → Ruby → Rails → pages).
  setProgress(fraction) {
    const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    const bar = $('boot-progress');
    bar.setAttribute('aria-valuenow', String(percent));
    bar.firstElementChild.style.transform = `scaleX(${percent / 100})`;
  },

  failed(message, diagnostic) {
    document.querySelector('#boot-panel h1').textContent = 'まとめを表示できませんでした';
    $('boot-status').textContent = 'Rails/Wasm でまとめを生成できませんでした';
    this.showError(message, diagnostic);
    $('boot-progress').hidden = true;
    $('rails-root').hidden = true;
    $('boot-panel').hidden = false;
  },

  interrupted(stage, diagnostic) {
    $('boot-status').textContent = '前回の読み込みが途中で中断されました';
    this.showError(
      `最後に記録した段階：${stage}。再読み込み・タブ終了・ブラウザの停止など、中断の理由はここでは特定できません。`,
      diagnostic
    );
    $('retry').textContent = '読み込みを再開する';
  },

  showError(message, diagnostic) {
    $('boot-error').textContent = message;
    $('diagnostic-text').textContent = diagnostic;
    for (const id of ['boot-error', 'retry', 'diagnostics']) $(id).hidden = false;
  },

  // Swap the panel for the Rails-rendered guide root.
  showGuide() {
    $('rails-root').hidden = false;
    $('boot-panel').hidden = true;
    return $('rails-root');
  },

  onRetry(handler) {
    $('retry').addEventListener('click', handler);
  },

  onCopyDiagnostics(text) {
    $('copy-diagnostics').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text());
        $('copy-status').textContent = 'コピーしました';
      } catch {
        $('copy-status').textContent = 'コピーできませんでした。上の詳細を選択してコピーしてください';
      }
    });
  }
};

// Friendlier wording for any English progress messages.
export function progressMessage(message) {
  if (/Loading/.test(message)) return 'Ruby/Wasm をダウンロードしています…';
  if (/Instantiating/.test(message)) return 'Ruby/Wasm を起動しています…';
  return message;
}
