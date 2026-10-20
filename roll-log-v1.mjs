// Public display projection only. This module never generates or certifies dice.
const text=(value,label,max=500)=>{if(typeof value!=='string'||!value||value.length>max)throw Error('Würfellog: '+label);return value;};
export function receiptLink(commit,path){
 if(!/^[a-f0-9]{40}$/.test(commit||'')||!/^current\/rolls\/[a-z0-9][a-z0-9-]{0,95}\/[a-z0-9][a-z0-9-]{0,95}\.json$/.test(path||''))throw Error('Würfellog: ungültiger Beleg');
 return 'https://github.com/danceofruin/wotwGPT/blob/'+commit+'/'+path;
}
export function normalizeRollLog(raw,sceneId){
 if(raw==null)return {schema_version:1,scene_id:sceneId||'',entries:[]};
 if(raw.schema_version!==1||raw.scene_id!==sceneId||!Array.isArray(raw.entries)||raw.entries.length>2000)throw Error('Würfellog: Szene oder Format ungültig');
 const ids=new Set();
 const entries=raw.entries.map(e=>{
  if(e.visibility!=='public')throw Error('Würfellog: private Einträge dürfen nicht veröffentlicht werden');
  const id=text(e.id,'Wurf-ID',200);if(ids.has(id))throw Error('Würfellog: doppelte Wurf-ID');ids.add(id);
  if(!['rng','player','legacy_unverified'].includes(e.source))throw Error('Würfellog: Herkunft fehlt');
  const m=/^([1-9][0-9]{0,2})d([1-9][0-9]{0,4})$/.exec(e.dice||'');
  if(!m||+m[2]<2||+m[2]>10000||!Array.isArray(e.values)||e.values.length!==+m[1]||!e.values.every(v=>Number.isInteger(v)&&v>=1&&v<=+m[2])||!Number.isInteger(e.modifier)||Math.abs(e.modifier)>100000||e.total!==e.values.reduce((a,b)=>a+b,0)+e.modifier)throw Error('Würfellog: Würfel oder Summe ungültig');
  const proof=e.receipt;if(!proof||!/^[a-f0-9]{64}$/.test(proof.sha256||''))throw Error('Würfellog: Beleg fehlt');
  const href=receiptLink(proof.commit,proof.path);
  // Explicit allow-list. Never render arbitrary URLs, verification badges or private tool outputs.
  return {id,visibility:'public',actor:text(e.actor,'Figur'),purpose:text(e.purpose,'Anlass'),dice:e.dice,values:[...e.values],modifier:e.modifier,total:e.total,source:e.source,created_at:typeof e.created_at==='string'?e.created_at.slice(0,100):'',receipt:{commit:proof.commit,path:proof.path,sha256:proof.sha256,href},trace_available:proof.trace_available===true};
 });
 return {schema_version:1,scene_id:sceneId,entries};
}
