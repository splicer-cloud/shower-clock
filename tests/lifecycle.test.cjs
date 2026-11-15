const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const api=require('../session-log.js');
test('visibility lifecycle resets timer and records once per exit',async()=>{
  let data={}, handlers={}, timerStarts=[],n=0;const storage={getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v};
  const element=()=>({addEventListener(){},textContent:'',value:'',showModal(){},close(){}});const elements={};
  const document={hidden:false,getElementById:id=>elements[id]||=element(),addEventListener:(k,f)=>handlers[k]=f};
  class Log extends api.SessionLog{constructor(s){super(s,()=>Date.now(),()=>`00000000-0000-0000-0000-${String(++n).padStart(12,'0')}`)}}
  const window={localStorage:storage,resetSessionTimer:t=>timerStarts.push(t),addEventListener:(k,f)=>handlers[k]=f};
  vm.runInNewContext(fs.readFileSync(require.resolve('../session-ui.js'),'utf8'),{window,document,localStorage:storage,navigator:{locks:{request:async(_,f)=>await f()}},ShowerSessions:{...api,SessionLog:Log},fetch:async()=>{},setInterval(){},setTimeout(){},URL,Blob});
  await new Promise(setImmediate);assert.equal(timerStarts.length,1);
  handlers.pageshow();await new Promise(setImmediate);assert.equal(timerStarts.length,1);
  document.hidden=true;handlers.visibilitychange();handlers.pagehide();await new Promise(setImmediate);
  assert.equal(JSON.parse(data[api.KEY]).sessions.length,1);
  document.hidden=false;handlers.visibilitychange();await new Promise(setImmediate);assert.equal(timerStarts.length,2);
  document.hidden=true;handlers.visibilitychange();await new Promise(setImmediate);assert.equal(JSON.parse(data[api.KEY]).sessions.length,2);
});
