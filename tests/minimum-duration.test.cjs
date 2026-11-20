const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SessionLog,Sync,KEY}=require('../session-log.js');
function fixture(){const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};let time=1000;const log=new SessionLog(storage,()=>time,()=> 'session');return {data,storage,log,advance:ms=>time+=ms};}
test('under one minute is discarded; exactly one minute is recorded',()=>{
 for(const duration of [0,59999,60000,60001]){
  const {log,storage,advance}=fixture();log.start();advance(duration);const row=log.finish();
  assert.equal(!!row,duration>=60000);assert.equal(log.state.active,null);
  assert.equal(new SessionLog(storage).state.sessions.length,duration>=60000?1:0);
 }
});
test('short sessions never initiate an upload',async()=>{
 const {log,advance}=fixture();log.start();advance(59999);log.finish();let calls=0;
 const sync=new Sync(log,()=>({url:'https://script.google.com/macros/s/test/exec',token:'a'.repeat(64)}),async()=>{calls++;throw Error('unexpected upload');});
 await sync.flush();assert.equal(calls,0);
});
test('legacy short sessions stay excluded after storage merging',()=>{
 const {data,storage}=fixture();
 const sessions=[{id:'short',durationMs:59999,synced:false},{id:'long',durationMs:60000,synced:false}];
 data.set(KEY,JSON.stringify({version:1,active:null,sessions}));
 const log=new SessionLog(storage);assert.equal(log.state.sessions.length,1);log.save();
 assert.deepEqual(JSON.parse(data.get(KEY)).sessions.map(s=>s.id),['long']);
});
test('interrupted short session is discarded, full minute checkpoint survives',()=>{
 for(const duration of [59000,60000]){
  const {log,storage,advance}=fixture();log.start();advance(duration);log.heartbeat();
  const recovered=new SessionLog(storage);recovered.recover();
  assert.equal(recovered.state.sessions.length,duration>=60000?1:0);
  if(duration>=60000)assert.equal(recovered.state.sessions[0].estimated,true);
 }
});
