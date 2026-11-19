/* Durable foreground-session log. No network credentials are bundled here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShowerSessions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'shower-clock.sessions.v1';
  const uuid = () => globalThis.crypto.randomUUID();
  class SessionLog {
    constructor(storage, now = Date.now, id = uuid) {
      this.storage = storage; this.now = now; this.id = id; this.error = null;
      this.state = { version: 1, active: null, sessions: [] };
      try {
        const raw = storage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.version !== 1 || !Array.isArray(saved.sessions)) throw new Error('Invalid saved log');
          this.state = saved;
        }
      } catch (e) { this.error = 'Saved log could not be read. Export before clearing browser data.'; this.blocked = true; }
    }
    save() {
      if (this.blocked) return false;
      try { const raw = this.storage.getItem(KEY);
        if (raw) {
          const disk = JSON.parse(raw);
          const all = new Map((disk.sessions || []).map(s => [s.id, s]));
          this.state.sessions.forEach(s => all.set(s.id, {...s, synced: s.synced || !!all.get(s.id)?.synced}));
          this.state.sessions = [...all.values()];
        }
        this.storage.setItem(KEY, JSON.stringify(this.state)); this.error = null; return true; }
      catch (e) { this.error = 'Could not save on this device. Keep this page open and export your log.'; return false; }
    }
    recover() {
      if (!this.state.active) return;
      // An OS kill may omit the final visibility event. Never invent an exact end.
      this.finish('interrupted', this.state.active.lastSeen, true);
    }
    start() {
      if (this.state.active) return this.state.active;
      const t = this.now();
      this.state.active = { id: this.id(), start: t, lastSeen: t, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      this.save(); return this.state.active;
    }
    heartbeat() { if (this.state.active) { this.state.active.lastSeen = this.now(); this.save(); } }
    finish(reason = 'hidden', at = this.now(), estimated = false) {
      const a = this.state.active; if (!a) return null;
      const end = Math.max(a.start, at);
      const row = { id: a.id, start: a.start, end, durationMs: end - a.start, timezone: a.timezone,
        reason, estimated, synced: false };
      this.state.sessions.push(row); this.state.active = null; this.save(); return row;
    }
    pending() { return this.state.sessions.filter(s => !s.synced); }
    acknowledge(ids) {
      const allowed = new Set(ids);
      this.state.sessions.forEach(s => { if (allowed.has(s.id)) s.synced = true; }); this.save();
    }
    csv() {
      const quote = s => '"' + String(s).replaceAll('"', '""') + '"';
      const rows = [['Date','Shower start','Shower end','Duration (seconds)','Time zone','End status','Session ID']];
      for (const s of this.state.sessions) rows.push([
        new Date(s.start).toLocaleDateString('en-CA', { timeZone: s.timezone }),
        new Date(s.start).toISOString(), new Date(s.end).toISOString(), s.durationMs / 1000,
        s.timezone, s.estimated ? 'Estimated: app interrupted' : s.reason, s.id
      ]);
      return rows.map(r => r.map(quote).join(',')).join('\r\n');
    }
  }
  function validEndpoint(url) {
    try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'script.google.com' && /^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname) && !u.search && !u.hash; }
    catch { return false; }
  }
  class Sync {
    constructor(log, config, send = (...args) => fetch(...args)) { this.log = log; this.config = config; this.send = send; this.busy = false; this.message = ''; }
    async flush() {
      const c = this.config();
      if (this.busy || !c || !validEndpoint(c.url) || !/^[a-f0-9]{64}$/.test(c.token)) return;
      const batch = this.log.pending().slice(0, 20); if (!batch.length) return;
      this.busy = true;
      try {
        const response = await this.send(c.url, { method: 'POST', redirect: 'follow', credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ token: c.token, sessions: batch }), keepalive: true });
        if (!response.ok) throw new Error('Receiver unavailable');
        const result = await response.json();
        if (result.ok !== true || !Array.isArray(result.accepted)) throw new Error('Receiver did not acknowledge');
        const sent = new Set(batch.map(s => s.id));
        this.log.acknowledge(result.accepted.filter(id => sent.has(id)));
        this.message = this.log.pending().length ? 'More sessions waiting to sync' : 'Synced to Google Sheets';
      } catch { this.message = 'Saved on this device. Sheets sync will retry when open.'; }
      finally { this.busy = false; }
    }
  }
  return { SessionLog, Sync, validEndpoint, KEY };
});
