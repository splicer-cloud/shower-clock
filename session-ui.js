(function () {
  'use strict';
  const CONFIG = 'shower-clock.sync.v1';
  let storage; try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('Unavailable')},setItem(){throw Error('Unavailable')}}; }
  let log = new ShowerSessions.SessionLog(storage);
  const status = document.getElementById('log-status');
  const dialog = document.getElementById('session-dialog');
  const urlInput = document.getElementById('sync-url');
  const keyInput = document.getElementById('sync-token');
  const submit = document.getElementById('sync-submit');
  const disconnect = document.getElementById('sync-disconnect');
  const connectionStatus = document.getElementById('connection-status');
  let config = null;
  try {
    const saved = JSON.parse(storage.getItem(CONFIG));
    if (saved && ShowerSessions.validEndpoint(saved.url) && /^[a-f0-9]{64}$/.test(saved.token)) config = saved;
  } catch {}
  let sync = new ShowerSessions.Sync(log, () => config);
  let connectionNotice = '', verified = false;
  function displaySettings() {
    urlInput.value = config?.url || '';
    keyInput.value = '';
    keyInput.placeholder = config ? 'Saved key on this device' : '';
    submit.textContent = config ? 'Check connection and sync' : 'Connect and sync';
    disconnect.hidden = !config;
  }
  let releaseLock = null, requested = false;
  const showStatus = () => {
    status.textContent = log.error || (config ? (sync.message || `${log.pending().length} session(s) waiting to sync`) : 'Saved on this device. Google Sheets is not connected yet.');
    document.getElementById('session-count').textContent = `${log.state.sessions.length} completed session(s)`;
    let message = connectionNotice;
    if (!message && config) {
      const saved = verified ? 'Connected to Google Sheets.' : 'Connection settings saved on this device.';
      const next = sync.message || (log.pending().length ? 'Completed sessions are waiting to sync.' : 'No completed sessions waiting to sync.');
      message = saved + ' ' + next;
    }
    if (connectionStatus.textContent !== message) connectionStatus.textContent = message;
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
  document.getElementById('sync-settings').addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    const url = urlInput.value.trim();
    const token = keyInput.value.trim() || (url === config?.url ? config.token : '');
    if (!ShowerSessions.validEndpoint(url)) {
      connectionNotice = 'Paste the Google Apps Script deployment URL ending in /exec.';
      showStatus(); return;
    }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      connectionNotice = 'Paste the 64-character value of CONNECTION_KEY for this URL.';
      showStatus(); return;
    }
    const candidate = { url, token };
    submit.disabled = disconnect.disabled = true;
    urlInput.readOnly = keyInput.readOnly = true;
    connectionNotice = 'Checking the connection with Google…';
    showStatus();
    try {
      // An authenticated empty batch tests the key without creating a shower entry.
      await sync.sendBatch(candidate, [], AbortSignal.timeout(20000));
      try { storage.setItem(CONFIG, JSON.stringify(candidate)); }
      catch { connectionNotice = 'Google accepted the key, but this browser could not save it.'; return; }
      config = candidate;
      verified = true;
      sync = new ShowerSessions.Sync(log, () => config);
      connectionNotice = '';
      displaySettings();
      flush();
    } catch (error) {
      connectionNotice = error.message === 'Receiver declined the request'
        ? 'Google declined the connection. Check the deployment URL and connection key, then try again.'
        : 'Could not confirm the connection. Check your internet connection and deployment URL, then try again.';
    } finally {
      submit.disabled = disconnect.disabled = false;
      urlInput.readOnly = keyInput.readOnly = false;
      showStatus();
    }
  });
  disconnect.addEventListener('click', () => {
    try { storage.removeItem(CONFIG); }
    catch { connectionNotice = 'This browser could not remove the saved connection.'; showStatus(); return; }
    config = null; sync = new ShowerSessions.Sync(log, () => config);
    verified = false; connectionNotice = 'Disconnected from Google Sheets.';
    displaySettings(); showStatus();
  });
  displaySettings(); submit.disabled = false;
  begin(); showStatus();
})();
