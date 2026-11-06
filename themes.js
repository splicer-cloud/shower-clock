(() => {
  const key = 'shower-clock-theme';
  const button = document.getElementById('theme-toggle');
  const status = document.getElementById('theme-status');
  let theme = 'water';
  try { if (localStorage.getItem(key) === 'wood') theme = 'wood'; } catch (_) {}
  function apply(next) {
    theme = next;
    document.body.dataset.theme = theme;
    button.textContent = theme === 'water' ? 'Swipe right · Walnut →' : '← Ripple · Swipe left';
    button.setAttribute('aria-label', theme === 'water' ? 'Switch to engraved walnut clock' : 'Switch to ripple clock');
    status.textContent = theme === 'water' ? 'Ripple theme' : 'Engraved walnut theme';
    try { localStorage.setItem(key, theme); } catch (_) {}
  }
  button.addEventListener('click', () => apply(theme === 'water' ? 'wood' : 'water'));
  let start = null;
  let suppressClickUntil = 0;
  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || e.target.closest('button,a')) return;
    start = {x:e.clientX, y:e.clientY, id:e.pointerId, at:Date.now()};
  });
  document.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y, duration=Date.now()-start.at;
    start=null;
    if (duration>1500 || Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.5) return;
    suppressClickUntil=Date.now()+500;
    apply(dx>0 ? 'wood' : 'water');
  });
  document.addEventListener('pointercancel', () => {start=null;});
  document.addEventListener('click', e => {
    if (Date.now()<suppressClickUntil && !e.target.closest('#theme-toggle')) {e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select')) return;
    if(e.key==='ArrowRight') {apply('wood');e.preventDefault();}
    if(e.key==='ArrowLeft') {apply('water');e.preventDefault();}
  });
  apply(theme);
})();
