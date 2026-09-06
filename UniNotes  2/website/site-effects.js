document.addEventListener('DOMContentLoaded', () => {
  const WRITE_MS = 1500;
  const HOLD_MS = 5000;
  const FADE_MS = 400;

  function loopBrand() {
    const logo = document.getElementById('brandLogo');
    if (!logo) return;
    logo.classList.remove('playing', 'hold', 'fading');
    void logo.offsetWidth;
    logo.classList.add('playing');
    setTimeout(() => logo.classList.add('hold'), WRITE_MS);
    setTimeout(() => {
      logo.classList.add('fading');
      setTimeout(loopBrand, FADE_MS);
    }, WRITE_MS + HOLD_MS);
  }
  loopBrand();

  document.querySelector('.board')?.addEventListener('click', event => {
    const note = event.target.closest('.note');
    if (!note) return;
    document.querySelectorAll('.board .note').forEach(item => {
      const selected = item === note;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  });
});
