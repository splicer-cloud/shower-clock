const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('../session-log.js');

test('connection form verifies an empty log, retains rejected input, and reuses a saved key', async () => {
  const key = 'a'.repeat(64);
  const address = 'https://script.google.com/macros/s/test/exec';
  const settings = 'shower-clock.sync.v1';
  const storage = new Map();
  const saved = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  const requests = [];
  let offline = false;
  class Receiver extends api.Sync {
    constructor(log, config) {
      super(log, config, async (url, options) => {
        const { token, sessions } = JSON.parse(options.body);
        requests.push(sessions);
        if (offline) throw new TypeError('Network request failed');
        return { ok: true, json: async () => ({ ok: url === address && token === key, accepted: [] }) };
      });
    }
  }
  function openSettings() {
    const elements = new Map();
    function field(id) {
      if (!elements.has(id)) elements.set(id, {
        value: '', textContent: '',
        addEventListener(event, handler) { this[event] = handler; }
      });
      return elements.get(id);
    }
    const document = { hidden: true, addEventListener() {}, getElementById: field };
    const window = { localStorage: saved, addEventListener() {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../session-ui.js'), 'utf8'), {
      document, window, setInterval() {}, AbortSignal, ShowerSessions: { ...api, Sync: Receiver }
    });
    return { url: field('sync-url'), key: field('sync-token'), status: field('connection-status'),
      submit: () => field('sync-settings').submit({ preventDefault() {} }) };
  }
  let form = openSettings();
  form.url.value = address;
  form.key.value = 'b'.repeat(64);
  await form.submit();
  assert.match(form.status.textContent, /declined/);
  assert.equal(form.key.value, 'b'.repeat(64));
  assert.equal(form.url.value, address);
  assert.equal(storage.has(settings), false);

  form.key.value = key;
  offline = true;
  await form.submit();
  assert.match(form.status.textContent, /Could not confirm/);
  assert.equal(form.key.value, key);
  assert.equal(storage.has(settings), false);
  offline = false;
  await form.submit();
  assert.match(form.status.textContent, /Connected to Google Sheets/);
  assert.deepEqual(JSON.parse(storage.get(settings)), { url: address, token: key });
  assert.equal(form.key.value, '');
  form = openSettings();
  assert.equal(form.url.value, address);
  await form.submit();
  assert.match(form.status.textContent, /Connected to Google Sheets/);
  form.url.value = 'https://script.google.com/macros/s/different/exec';
  await form.submit();
  assert.match(form.status.textContent, /Paste the 64-character value/);
  assert.deepEqual(requests, [[], [], [], []]);
});

test('queued uploads are acknowledged only after the spreadsheet confirms them', async () => {
  const values = new Map();
  const log = new api.SessionLog({
    getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v)
  }, () => 2000, () => 'test-session');
  log.start();
  log.finish();
  const config = { url: 'https://script.google.com/macros/s/test/exec', token: 'a'.repeat(64) };
  let receipt = { ok: true, queued: ['test-session'], accepted: [] };
  const sync = new api.Sync(log, () => config, async () => ({ ok: true, json: async () => receipt }));
  await sync.flush();
  assert.equal(log.pending().length, 1);
  assert.match(sync.message, /Waiting for the spreadsheet/);
  receipt = { ok: true, accepted: ['test-session'], queued: [] };
  await sync.flush();
  assert.equal(log.pending().length, 0);
  assert.equal(sync.message, 'Synced to Google Sheets');
});
