import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as model from './model.mjs';import {MapHistory,snapshotAsset} from './history.mjs';
const registry=new Map();class El{constructor(tag='div'){this.tag=tag;this.attrs={};this.style={};this.dataset={};this.children=[];this.textContent='';this.hidden=false;this.clientWidth=1100;this.clientHeight=800;this.classList={toggle(){}};this.listeners={};}setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')registry.set(v,this);}append(...els){for(const e of els){this.children.push(e);if(e&&typeof e==='object')e.parent=this;}}replaceChildren(...els){this.children=[];this.append(...els);}querySelector(sel){return registry.get(sel.slice(1));}remove(){this.parent.children=this.parent.children.filter(e=>e!==this);}removeAttribute(k){delete this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}set src(v){this.attrs.src=v;}get src(){return this.attrs.src;}}
for(const id of ['canvas','stage','sizer','viewport','title','mode','empty','meta','base','roster','detail','connection','error','demo','empty-demo','live','preview','json','grid','coords','props','names','lighting','fit','minus','plus','full','history-older','history-newer','history-select','history-more','history-live','history-status','atlas-open','atlas-select','atlas-variant','atlas-view','atlas-note'])registry.set(id,new El());
const commits=[{sha:'a'.repeat(40),commit:{message:'End encounter',author:{date:'2026-10-13T12:00:00Z'}}},{sha:'b'.repeat(40),commit:{message:'Round 2',author:{date:'2026-10-13T11:00:00Z'}}},{sha:'c'.repeat(40),commit:{message:'Start',author:{date:'2026-10-13T10:00:00Z'}}}];
let delayedHistory=null;
const demo=JSON.parse(fs.readFileSync(new URL('./demo.json',import.meta.url))),idle={schema_version:1,active:false,revision:'idle'};
let scheduled=0;const ctx={...model,MapHistory,snapshotAsset,console,URLSearchParams,location:{search:''},setTimeout:()=>++scheduled,clearTimeout(){},ResizeObserver:class{observe(){}},document:{hidden:false,getElementById:id=>registry.get(id),createElement:tag=>new El(tag),createElementNS:(ns,tag)=>new El(tag),createTextNode:text=>({textContent:text}),addEventListener(){}},fetch:async url=>{if(delayedHistory&&url.includes('/'+commits[2].sha+'/'))return delayedHistory;return {ok:true,headers:{get:()=>null},json:async()=>url.includes('api.github.com')?commits:url==='demo.json'?demo:url.includes('/'+commits[1].sha+'/')?{...demo,scene_id:'archived',revision:'old-2'}:url.includes('/'+commits[2].sha+'/')?{...demo,scene_id:'archived',revision:'old-1'}:idle};}};
vm.createContext(ctx);let code=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');code+='\nglobalThis.testing={render,get:()=>current,history,openAtlas};';vm.runInContext(code,ctx);await new Promise(r=>setImmediate(r));assert.equal(ctx.testing.get().active,false);
await registry.get('demo').onclick();assert.equal(registry.get('mode').textContent,'DEMO · KEIN KAMPAGNENSTAND');assert.equal(registry.get('tokens').children.length,7);assert.equal(registry.get('base').hidden,true);
const token=registry.get('tokens').children[0],terrain=registry.get('terrain').children[0],changed=structuredClone(demo);changed.revision='demo-2';changed.tokens[0].square='F7';ctx.testing.render(changed);assert.equal(registry.get('tokens').children[0],token);assert.equal(registry.get('terrain').children[0],terrain);assert.equal(token.style.transform,'translate(384px,448px)');
changed.tokens=changed.tokens.slice(1);ctx.testing.render(changed);assert.equal(registry.get('tokens').children.length,6);
registry.get('grid').onclick();assert.equal(registry.get('grid-layer').style.display,'none');registry.get('coords').onclick();assert.equal(registry.get('coords-layer').style.display,'none');
const legacy={schema_version:1,active:true,scene_id:'legacy',revision:'1',map:{width_px:640,height_px:480,asset:'maps/a.png',grid:{columns:10,rows:8,cell_px:{width:64,height:60},origin_px:{x:0,y:0}}},tokens:[]};ctx.testing.render(legacy);const imageSrc=registry.get('base').src;legacy.revision='2';ctx.testing.render(legacy);assert.equal(registry.get('base').src,imageSrc);
registry.get('json').value=JSON.stringify(demo);registry.get('preview').onclick();assert.equal(registry.get('mode').textContent,'LOKALE VORSCHAU');
await registry.get('history-older').onclick();assert.equal(ctx.testing.get().revision,'old-2');assert.equal(registry.get('mode').textContent,'VERLAUF · GESPEICHERTER STAND');
await registry.get('history-older').onclick();assert.equal(ctx.testing.get().revision,'old-1');assert.equal(registry.get('history-older').disabled,true);
await registry.get('history-newer').onclick();assert.equal(ctx.testing.get().revision,'old-2');assert.equal(registry.get('history-newer').disabled,true);
registry.get('history-live').onclick();await new Promise(r=>setImmediate(r));assert.equal(ctx.testing.get().active,false);
ctx.testing.history.cache.delete(commits[2].sha);
let resolveOld;delayedHistory=new Promise(r=>{resolveOld=r;});await registry.get('history-older').onclick();const pendingOld=registry.get('history-older').onclick();registry.get('history-live').onclick();resolveOld({ok:true,json:async()=>({...demo,revision:'late-history'})});await pendingOld;await new Promise(r=>setImmediate(r));assert.equal(ctx.testing.get().active,false);assert.equal(registry.get('mode').textContent,'LIVE');assert.equal(registry.get('history-select').value,'');
console.log('PASS: idle/live startup, demo separation, SVG render, token DOM reuse, static terrain reuse, token removal, grid controls, unchanged image URL, JSON preview, archive navigation, idle skipping, return to live, stale history response rejection.');


// Exercise the deployed gate renderer and prepared entry rather than a hand-drawn fixture.
const entry=JSON.parse(fs.readFileSync(new URL('./atlas/prepared-v5/horn-level-1.current.entry.json',import.meta.url)));
for(const d of entry.map.doors)if(d.kind==='portcullis')d.state='lowered';
ctx.testing.render(entry);
const gateNodes=()=>registry.get('walls').children.filter(n=>n.attrs?.['data-feature-id']);
assert.equal(gateNodes().length,2);
assert(registry.get('lighting-layer').children.length>0);
assert(registry.get('props-layer').children.filter(n=>n.attrs?.['data-light-state']==='lit').length>0);
registry.get('lighting').onclick();assert.equal(registry.get('lighting-layer').style.display,'none');registry.get('lighting').onclick();assert.equal(registry.get('lighting-layer').style.display,'');
assert.equal(entry.map.lines.filter(l=>l.kind==='arrow_slit').length,12);assert.equal(entry.map.markers.filter(m=>m.type==='alarm').length,1);
assert.equal(registry.get('walls').children.filter(n=>n.attrs?.class==='arrow-slit').length,12);
registry.get('props').onclick();assert.equal(registry.get('props-layer').style.display,'none');registry.get('props').onclick();assert.equal(registry.get('props-layer').style.display,'');
registry.get('names').onclick();assert.equal(registry.get('labels-layer').style.display,'none');registry.get('names').onclick();
for(const n of gateNodes()){assert.equal(n.attrs['data-state'],'lowered');assert(n.children.length>5);assert(!n.children.some(c=>c.tag==='rect'));assert(n.children.filter(c=>c.tag==='line').every(c=>Number(c.attrs['stroke-width'])<64*.1));}
const terrainNodes=registry.get('terrain').children.map(n=>JSON.stringify(n.attrs));
for(const d of entry.map.doors)if(d.kind==='portcullis')d.state='raised';entry.revision+='-raised';ctx.testing.render(entry);
assert(gateNodes().every(n=>n.attrs['data-state']==='raised'&&n.children.length===2));
assert.deepEqual(registry.get('terrain').children.map(n=>JSON.stringify(n.attrs)),terrainNodes);
assert.equal(fs.readFileSync(new URL('./app-atlas-v7.js',import.meta.url),'utf8'),fs.readFileSync(new URL('./app.js',import.meta.url),'utf8').replace('./model.mjs?v=9','./model-atlas-v7.mjs'));
assert.equal(fs.readFileSync(new URL('./model-atlas-v7.mjs',import.meta.url),'utf8'),fs.readFileSync(new URL('./model.mjs',import.meta.url),'utf8'));
for(const name of fs.readdirSync(new URL('./atlas/prepared-v5/',import.meta.url)))model.normalize(JSON.parse(fs.readFileSync(new URL('./atlas/prepared-v5/'+name,import.meta.url))));
if(process.env.MAP_RENDER_SVG){
 for(const d of entry.map.doors)if(d.kind==='portcullis')d.state='lowered';entry.revision+='-lowered';ctx.testing.render(entry);
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const xml=n=>n?.tag?`<${n.tag} ${Object.entries(n.attrs).map(([k,v])=>k+'="'+esc(v)+'"').join(' ')}>${esc(n.textContent||'')}${n.children.map(xml).join('')}</${n.tag}>`:esc(n?.textContent||'');
 const g=registry.get('canvas');g.tag='svg';g.attrs.xmlns='http://www.w3.org/2000/svg';g.attrs.width=entry.grid.cols*64+64;g.attrs.height=entry.grid.rows*64+64;
 fs.writeFileSync(process.env.MAP_RENDER_SVG,xml(g).replace('>','><style>svg{background:#11151a}.gridline{stroke:#ffffff22;stroke-width:1}.wall{stroke:#b5b4aa;stroke-width:8}.coord{fill:#b5b4aa;font:14px sans-serif;text-anchor:middle}text{fill:#deded7;font:16px sans-serif;text-anchor:middle}</style>'));
}
const atlasRequests=[];
ctx.fetch=async url=>{atlasRequests.push(url);return {ok:true,json:async()=>url.includes('atlas/index.json')?JSON.parse(fs.readFileSync(new URL('./atlas/index.json',import.meta.url))):JSON.parse(fs.readFileSync(new URL('./atlas/prepared-v5/horn-level-1.current.entry.json',import.meta.url)))};};
registry.get('atlas-variant').value='current';registry.get('atlas-view').value='full';
await ctx.testing.openAtlas('horn-level-1','entry');
assert(atlasRequests.some(url=>url.endsWith('atlas/prepared-v5/horn-level-1.current.entry.json')));
assert.equal(ctx.testing.get().grid.cols,30);assert.equal(registry.get('atlas-view').value,'entry');
assert.equal(registry.get('mode').textContent,'ATLAS · AUSGESTATTETER GRUNDRISS');
console.log('PASS: two thin barred gates; raised/lowered render; unchanged floor geometry; all prepared snapshots; deployed source/model parity; atlas entry preview routing.');
