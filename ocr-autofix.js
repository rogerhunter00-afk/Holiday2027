(() => {
  function bindAutoOcr() {
    const input = document.getElementById('screenshot');
    const button = document.getElementById('ocrBtn');
    const found = document.getElementById('ocrFound');
    const progress = document.getElementById('ocrProgress');
    if (!input || !button || input.dataset.autoOcrBound === '1') return;

    input.dataset.autoOcrBound = '1';

    input.addEventListener('change', () => {
      if (!input.files || !input.files[0]) return;

      if (found) {
        found.innerHTML = '<b>Screenshot selected.</b><br>Reading dates, guests and total price automatically…';
        found.classList.add('show');
      }
      if (progress) progress.classList.add('show');

      let attempts = 0;
      const runWhenReady = () => {
        attempts += 1;
        if (!button.disabled) {
          button.click();
          return;
        }
        if (attempts < 20) setTimeout(runWhenReady, 100);
      };
      setTimeout(runWhenReady, 150);
    });

    const observer = new MutationObserver(() => {
      if (!button.disabled && button.textContent === 'Read screenshot' && input.files && input.files[0]) {
        button.textContent = 'Re-read screenshot';
      }
    });
    observer.observe(button, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAutoOcr, { once: true });
  } else {
    bindAutoOcr();
  }
})();
