(function () {
  'use strict';
  const CONFIG = 'shower-clock.sync.v1';
  let storage; try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('Unavailable')},setItem(){throw Error('Unavailable')}}; }
  let log = new ShowerSessions.SessionLog(storage);
  const status = document.getElementById('log-status');
  const dialog = document.getElementById('session-dialog');
  let config = null;
  try { config = JSON.parse(localStorage.getItem(CONFIG)); } catch {}
  const sync = new ShowerSessions.Sync(log, () => config);
  let releaseLock = null, requested = false;
  const showStatus = () => {
    status.textContent = log.error || (config ? (sync.message || `${log.pending().length} session(s) waiting to sync`) : 'Saved on this device. Google Sheets is not connected yet.');
    document.getElementById('session-count').textContent = `${log.state.sessions.length} completed session(s)`;
  };
  const flush = async () => { await sync.flush(); showStatus(); };
  async function begin() {
    if (document.hidden || requested || releaseLock) return;
    if (!navigator.locks) { status.textContent = 'Session tracking needs an updated browser with Web Locks support.'; return; }
    requested = true;
    await navigator.locks.request('shower-clock-tracking', async () => {
      requested = false;
      if (document.hidden) return;
      log = new ShowerSessions.SessionLog(storage); sync.log = log;
      log.recover();
      const a = log.start(); window.resetSessionTimer(a.start); flush();
      await new Promise(resolve => { releaseLock = resolve; });
      releaseLock = null;
    });
  }
  function end(reason) { if (!releaseLock) return; log.finish(reason); showStatus(); flush(); releaseLock(); }
  document.addEventListener('visibilitychange', () => document.hidden ? end('hidden') : begin());
  window.addEventListener('pagehide', () => end('pagehide'));
  window.addEventListener('pageshow', () => { if (!document.hidden) begin(); });
  window.addEventListener('online', flush);
  setInterval(() => { if (!document.hidden && releaseLock) { log.heartbeat(); flush(); } }, 15000);
  // A timer reset changes only the displayed stopwatch, not the foreground session record.
  document.getElementById('session-log-btn').addEventListener('click', e => {
    e.stopPropagation(); showStatus(); dialog.showModal();
  });
  dialog.addEventListener('click', e => e.stopPropagation());
  document.getElementById('log-close').addEventListener('click', () => dialog.close());
  document.getElementById('log-export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([log.csv()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'shower-clock-log.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  document.getElementById('sync-settings').addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('sync-url').value.trim();
    const token = document.getElementById('sync-token').value.trim();
    if (!ShowerSessions.validEndpoint(url) || !/^[a-f0-9]{64}$/.test(token)) {
      status.textContent = 'Use the deployed Google Apps Script URL and its 64-character connection key.'; return;
    }
    try { localStorage.setItem(CONFIG, JSON.stringify({ url, token })); config = { url, token }; }
    catch { status.textContent = 'Unable to save connection settings on this device.'; return; }
    document.getElementById('sync-token').value = ''; flush();
  });
  document.getElementById('sync-disconnect').addEventListener('click', () => {
    localStorage.removeItem(CONFIG); config = null; sync.message = ''; showStatus();
  });
  begin(); showStatus();
})();
