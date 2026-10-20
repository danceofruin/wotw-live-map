import assert from 'node:assert/strict';
import {normalizeRollLog,receiptLink} from './roll-log-v1.mjs';
import {normalize} from './model.mjs';
const entry={id:'scene:r1:attack',visibility:'public',actor:'Styke',purpose:'Attack',dice:'2d6',values:[3,4],modifier:2,total:9,source:'rng',created_at:'2026-10-20T11:10:00Z',receipt:{commit:'a'.repeat(40),path:'current/rolls/test-only/r1-a1.json',sha256:'b'.repeat(64),trace_available:false}};
const log={schema_version:1,scene_id:'scene',entries:[entry]};
const norm=normalizeRollLog(log,'scene');assert.equal(norm.entries[0].total,9);assert.equal(norm.entries[0].trace_available,false);assert(norm.entries[0].receipt.href.startsWith('https://github.com/danceofruin/wotwGPT/blob/'));
assert.deepEqual(normalizeRollLog(undefined,'scene').entries,[]);
assert.throws(()=>normalizeRollLog(log,'other'),/Szene/);
for(const [key,value] of [['visibility','gm'],['total',10],['values',[0,7]],['source','certified-python']]){
 const bad=structuredClone(log);bad.entries[0][key]=value;assert.throws(()=>normalizeRollLog(bad,'scene'));
}
const injected=structuredClone(log);injected.entries[0].private_note='SECRET';injected.entries[0].verified=true;injected.entries[0].receipt.tool_output='SECRET';
assert(!JSON.stringify(normalizeRollLog(injected,'scene')).includes('SECRET'));assert(!JSON.stringify(normalizeRollLog(injected,'scene')).includes('verified'));
assert.throws(()=>receiptLink('a'.repeat(40),'javascript:alert(1)'),/Beleg/);
assert.throws(()=>receiptLink('a'.repeat(40),'current/rolls/../../secret.json'),/Beleg/);
assert.throws(()=>normalizeRollLog({...log,entries:[entry,entry]},'scene'),/doppelte/);
const idle=normalize({schema_version:2,active:false,revision:'end',scene_id:'scene',roll_log:log});assert.equal(idle.roll_log.entries.length,1);
console.log('PASS: roll source separation, arithmetic/bounds, scene isolation, duplicates, safe evidence links, private-field allow-list, idle retention');
