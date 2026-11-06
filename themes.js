(() => {
  const key = 'shower-clock-theme';
  const clock = document.getElementById('time-wrapper');
  const status = document.getElementById('theme-status');
  let theme = 'water';
  try { if (localStorage.getItem(key) === 'wood') theme = 'wood'; } catch (_) {}
  function apply(next) {
    theme = next;
    document.body.dataset.theme = theme;
    clock.setAttribute('aria-label', 'Clock time. Swipe down or press Arrow Down to change clock style.');
    status.textContent = theme === 'water' ? 'Ripple theme' : 'Engraved walnut theme';
    try { localStorage.setItem(key, theme); } catch (_) {}
  }
  let start = null;
  let suppressClickUntil = 0;
  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || !e.target.closest('#time-wrapper')) return;
    start = {x:e.clientX, y:e.clientY, id:e.pointerId, at:Date.now()};
  });
  document.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y, duration=Date.now()-start.at;
    start=null;
    if (duration>1500 || dy<55 || dy<Math.abs(dx)*1.5) return;
    suppressClickUntil=Date.now()+500;
    apply(theme === 'water' ? 'wood' : 'water');
  });
  document.addEventListener('pointercancel', () => {start=null;});
  document.addEventListener('click', e => {
    if (Date.now()<suppressClickUntil) {e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select')) return;
    if(e.key==='ArrowDown' && e.target.closest('#time-wrapper')) {apply(theme === 'water' ? 'wood' : 'water');e.preventDefault();}
  });
  apply(theme);
})();
