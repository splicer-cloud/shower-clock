/* Deploy as owner. Set SPREADSHEET_ID and CONNECTION_KEY in Script Properties.
   CONNECTION_KEY must be a cryptographically random 32-byte lowercase hex secret.
   Never place the key in this file, GitHub, a URL, or the spreadsheet. */
function doPost(e) {
  const reply = x => ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('CONNECTION_KEY');
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (_) { return reply({ok:false}); }
  if (!key || !/^[a-f0-9]{64}$/.test(key) || typeof body.token !== 'string' || body.token.length !== key.length) return reply({ok:false});
  let difference = 0;
  for (let i=0;i<key.length;i++) difference |= key.charCodeAt(i) ^ body.token.charCodeAt(i);
  if (difference || !Array.isArray(body.sessions) || body.sessions.length > 20) return reply({ok:false});
  const valid = s => s && /^[a-f0-9-]{36}$/.test(s.id) && Number.isSafeInteger(s.start) && Number.isSafeInteger(s.end) && s.start > 0 && s.end >= s.start && s.end < Date.now()+86400000 && s.durationMs === s.end-s.start && typeof s.estimated === 'boolean';
  if (!body.sessions.every(valid)) return reply({ok:false});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ok:false});
  try {
    const sheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getSheetByName('Sessions');
    const n = sheet.getLastRow();
    const ids = new Set(n>1 ? sheet.getRange(2,5,n-1,1).getValues().flat() : []);
    const accepted = [];
    for (const s of body.sessions) {
      if (!ids.has(s.id)) {
        const row = sheet.getLastRow()+1;
        const start = new Date(s.start), end = new Date(s.end);
        sheet.getRange(row,1,1,5).setValues([[start,start,end,s.durationMs/86400000,s.id]]);
        sheet.getRange(row,1).setNumberFormat('mmm d, yyyy');
        sheet.getRange(row,2,1,2).setNumberFormat('h:mm:ss AM/PM');
        sheet.getRange(row,4).setNumberFormat('[h]:mm:ss');
        sheet.getRange(row,3).setNote(s.estimated ? 'Estimated end: app was interrupted before a final lifecycle event.' : 'End observed when app became hidden or left page.');
        ids.add(s.id);
      }
      accepted.push(s.id);
    }
    SpreadsheetApp.flush();
    return reply({ok:true,accepted});
  } catch (_) { return reply({ok:false}); }
  finally { lock.releaseLock(); }
}
