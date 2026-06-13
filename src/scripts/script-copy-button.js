export function initScriptCopyButtons(root = document) {
  root.querySelectorAll('[data-copy-button]').forEach(button => {
    if (!(button instanceof HTMLButtonElement)) return;
    const value = button.dataset.copyValue || '';
    const label = button.querySelector('[data-copy-label]');
    const original = label?.textContent || button.textContent || 'Copy';

    async function copyValue() {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }

      button.classList.add('is-copied');
      if (label) label.textContent = button.dataset.copiedLabel || 'Copied';
      window.setTimeout(() => {
        button.classList.remove('is-copied');
        if (label) label.textContent = original;
      }, 1800);
    }

    button.addEventListener('click', copyValue);
  });
}
