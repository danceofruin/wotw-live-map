const REPO='danceofruin/wotw-live-map';
const API=`https://api.github.com/repos/${REPO}/commits?path=state.json&per_page=100`;
const RAW=`https://raw.githubusercontent.com/${REPO}/`;

export function snapshotAsset(path,sha) {
 return path.startsWith('https://')?path:RAW+sha+'/'+path;
}

// Read-only Git history. No archive maintenance or additional GM writes.
export class MapHistory {
 constructor(fetcher=globalThis.fetch) {
  this.fetcher=fetcher;this.entries=[];this.cache=new Map();this.pending=new Map();
  this.page=1;this.done=false;this.pageRequest=null;
 }
 async more() {
  if(this.done)return;
  if(this.pageRequest)return this.pageRequest;
  this.pageRequest=(async()=>{
   const r=await this.fetcher(API+'&page='+this.page,{headers:{Accept:'application/vnd.github+json'}});
   if(!r.ok)throw Error(r.status===403||r.status===429?'Kartenverlauf momentan nicht verfügbar: GitHub-Anfragelimit.':'Kartenverlauf konnte nicht geladen werden (HTTP '+r.status+').');
   const rows=await r.json();if(!Array.isArray(rows))throw Error('Ungültiger Kartenverlauf.');
   const seen=new Set(this.entries.map(e=>e.sha));
   for(const row of rows) {
    if(!/^[0-9a-f]{40}$/.test(row.sha)||seen.has(row.sha))continue;
    seen.add(row.sha);this.entries.push({sha:row.sha,message:String(row.commit?.message||'Kartenstand').split('\n')[0],date:row.commit?.committer?.date||row.commit?.author?.date||''});
   }
   const link=r.headers?.get?.('link');
   this.done=link!=null?!/rel="next"/.test(link):rows.length<100;
   this.page++;
  })();
  try {await this.pageRequest;}finally {this.pageRequest=null;}
 }
 async state(entry) {
  if(this.cache.has(entry.sha))return this.cache.get(entry.sha);
  if(this.pending.has(entry.sha))return this.pending.get(entry.sha);
  const request=(async()=>{
   const r=await this.fetcher(RAW+entry.sha+'/state.json');
   if(!r.ok)throw Error('Dieser Kartenstand konnte nicht geladen werden (HTTP '+r.status+').');
   const raw=await r.json();if(!raw||typeof raw.active!=='boolean')throw Error('Ungültiger historischer Kartenstand.');
   this.cache.set(entry.sha,raw);return raw;
  })();this.pending.set(entry.sha,request);
  try{return await request;}finally{this.pending.delete(entry.sha);}
 }
 async load(index,direction=1) {
  while(index>=0) {
   while(index>=this.entries.length&&!this.done)await this.more();
   if(index>=this.entries.length)return null;
   const entry=this.entries[index],raw=await this.state(entry);
   if(raw.active)return {index,entry,raw};
   index+=direction; // End/idle commits are not maps to browse.
  }
  return null;
 }
 visible() {
  return this.entries.map((entry,index)=>({entry,index})).filter(({entry})=>this.cache.get(entry.sha)?.active!==false);
 }
 hasNewer(index) {
  return this.visible().some(item=>item.index<index);
 }
 hasOlder(index) {
  return !this.done||this.visible().some(item=>item.index>index);
 }
}
