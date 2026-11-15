# Shower sessions

Opening/returning to the visible page starts a fresh timer. Hiding it (including switching apps or locking) ends the session. This measures foreground app use, not whether water is running. Manual stopwatch Reset does not split the log. Records persist locally in this browser; Export CSV backs them up. Clearing browser data removes local records. Logs are not shared between devices.

Visibility change is the primary end signal, with pagehide as fallback. iOS can kill a process without delivering either: a 15-second durable checkpoint supplies an explicitly estimated end on next launch. Web Locks serialize tracking across tabs (Safari 15.4+); unsupported browsers do not record rather than risk overwriting records.

## Google Sheets: setup still required

The local feature works without a Google connection. Automatic sync is NOT configured by shipping these files. `google-apps-script/Code.gs` is an optional receiver requiring owner setup/authorization and end-to-end testing:

1. Create an Apps Script under the Sheet owner's account. Paste Code.gs.
2. Set Script Properties SPREADSHEET_ID to the private destination Sheet, whose tab Sessions has Date, Shower start, Shower end, Duration, Session ID headers. Set CONNECTION_KEY to a cryptographically random 32-byte lowercase hex key generated privately. Never commit/store the key in a URL.
3. Deploy a web app executing as the owner and authorize only the required spreadsheet access. The network endpoint must accept unauthenticated browser POSTs but ALL writes require the secret; no read route exists. Do not deploy if that access model is unsuitable.
4. Enter deployed /exec URL and secret once in the app's Log > connection panel on the intended device. Verify a test session's persisted row and duplicate retry before describing it as connected. Do not use no-cors/opaque responses: only a readable positive acknowledgment removes the pending flag.
5. Keep Sheet private. Rotate Script Property key and device setting to revoke a device. Key lives in device localStorage, so trusted same-origin code can access it. Treat public deployment changes with care.

Offline/interrupted writes retry at next foreground. Server IDs prevent duplicate writes after lost acknowledgments. App does not claim completion until acknowledgment; Google quota/network failure leaves local copies. Export before clearing data. Apps Script deployment/Google authorization cannot be inferred from creation of a Sheet.

References: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event ; https://developer.chrome.com/docs/web-platform/page-lifecycle-api ; https://developers.google.com/apps-script/guides/web ; https://developers.google.com/apps-script/guides/content

Tests: node --test tests/*.cjs
