const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('default browser transport sends and acknowledges a session', async () => {
  let request;
  const context = {
    module: {exports: {}}, URL,
    fetch: async function(url, options) {
      'use strict';
      // Window.fetch rejects an unrelated object as its receiver.
      if (this !== undefined) throw new TypeError('Illegal invocation');
      request = {url, options};
      const body = JSON.parse(options.body);
      return {ok: true, json: async () => ({ok: true, accepted: body.sessions.map(s => s.id)})};
    }
  };
  const source = fs.readFileSync(path.join(__dirname, '../session-log.js'), 'utf8');
  vm.runInNewContext(source, context);
  const {SessionLog, Sync} = context.module.exports;
  let saved = null, now = 1000;
  const log = new SessionLog({getItem: () => saved, setItem: (_, value) => saved = value},
    () => now, () => '11111111-1111-4111-8111-111111111111');
  log.start(); now = 61000; log.finish();
  const sync = new Sync(log, () => ({url: 'https://script.google.com/macros/s/test/exec', token: 'a'.repeat(64)}));
  await sync.flush();
  assert.ok(request, 'the browser transport must be invoked successfully');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).sessions[0].durationMs, 60000);
  assert.equal(log.pending().length, 0);
  assert.equal(sync.message, 'Synced to Google Sheets');
});
