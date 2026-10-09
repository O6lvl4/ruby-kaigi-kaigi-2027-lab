export function initAddressTools(root) {
  let active = true;
  const onClick = async event => {
    const button = event.target.closest('[data-copy-address]');
    if (!button || !root.contains(button)) return;
    const status = button.closest('.destination-tools').querySelector('.copy-address-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copyAddress);
      if (active) status.textContent = 'コピーしました';
    } catch {
      if (active) status.textContent = 'コピーできませんでした。表示されている名称・住所を選択してコピーしてください';
    }
  };
  root.addEventListener('click', onClick);
  return () => {
    active = false;
    root.removeEventListener('click', onClick);
  };
}
