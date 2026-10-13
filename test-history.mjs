import assert from 'node:assert/strict';
import {MapHistory,snapshotAsset} from './history.mjs';
const sha=n=>String(n).repeat(40);
const entry=n=>({sha:sha(n),commit:{message:'Map '+n,author:{date:'2026-10-13T10:00:00Z'}}});
const calls=[];
const h=new MapHistory(async url=>{
 calls.push(url);
 if(url.includes('api.github.com')){
  const page=new URL(url).searchParams.get('page');
  return {ok:true,headers:{get:()=>page==='1'?'<next>; rel="next"':null},json:async()=>page==='1'?[entry(1),entry(2),entry(3)]:[entry(3),entry(4),{sha:'invalid'}]};
 }
 return {ok:true,json:async()=>({active:!url.includes('/'+sha(1)+'/'),revision:url})};
});
const [a,b]=await Promise.all([h.load(0),h.load(0)]);
assert.equal(a.entry.sha,sha(2));assert.equal(b.entry.sha,sha(2));
assert.equal(calls.filter(url=>url.includes('api.github.com')).length,1);
assert.equal(calls.filter(url=>url.includes('/'+sha(2)+'/')).length,1);
assert.equal((await h.load(3)).entry.sha,sha(4));
assert.equal(h.entries.length,4);assert.equal(h.done,true);
assert.equal(await h.load(0,-1),null);assert.equal(await h.load(4),null);
assert.equal(h.hasNewer(1),false);assert.equal(h.hasOlder(3),false);
assert.equal(h.visible().length,3);
assert.equal(snapshotAsset('maps/room.png',sha(2)),`https://raw.githubusercontent.com/danceofruin/wotw-live-map/${sha(2)}/maps/room.png`);
assert.equal(snapshotAsset('https://example.test/map.png',sha(2)),'https://example.test/map.png');
let fail=true;
const retry=new MapHistory(async()=>fail?{ok:false,status:429}:{ok:true,headers:{get:()=>null},json:async()=>[]});
await assert.rejects(()=>retry.more(),/Anfragelimit/);assert.equal(retry.page,1);
fail=false;await retry.more();assert.equal(retry.done,true);
console.log('PASS: paginated read-only history, idle skipping, concurrent cache, deduplication, navigation boundaries, immutable assets, API error/retry.');
