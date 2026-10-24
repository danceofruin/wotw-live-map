import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as model from './model-atlas-v12.mjs';
const registry=new Map();class El{constructor(tag='div'){this.tag=tag;this.attrs={};this.style={};this.dataset={};this.children=[];this.textContent='';this.hidden=false;this.clientWidth=1100;this.clientHeight=800;this.classList={toggle(){}};this.listeners={};}setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')registry.set(v,this);}append(...els){for(const e of els){this.children.push(e);if(e&&typeof e==='object')e.parent=this;}}replaceChildren(...els){this.children=[];this.append(...els);}querySelector(sel){return registry.get(sel.slice(1));}remove(){this.parent.children=this.parent.children.filter(e=>e!==this);}removeAttribute(k){delete this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}set src(v){this.attrs.src=v;}get src(){return this.attrs.src;}}
for(const id of ['canvas','stage','sizer','viewport','title','mode','empty','meta','base','roster','detail','connection','error','demo','empty-demo','live','preview','json','grid','coords','props','names','lighting','fit','minus','plus','full','history-older','history-newer','history-select','history-more','history-live','history-status','atlas-open','atlas-select','atlas-variant','atlas-view','atlas-note','roll-count','roll-empty','roll-list'])registry.set(id,new El());

const valid=JSON.parse(fs.readFileSync(new URL('./state.json',import.meta.url)));
const invalid=structuredClone(valid);invalid.revision+='-invalid';invalid.map.markers.push({type:'bell',x:1,y:1});
assert.throws(()=>model.normalize(invalid),/Unbekannter Marker: bell/);
let incoming=invalid,networkFailure=false;
class MapHistory{constructor(){this.entries=[];this.done=false;}}
const ctx={...model,MapHistory,snapshotAsset:()=>'',console,URLSearchParams,location:{search:''},setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}},document:{hidden:false,getElementById:id=>registry.get(id),createElement:tag=>new El(tag),createElementNS:(ns,tag)=>new El(tag),createTextNode:text=>({textContent:text}),addEventListener(){}},fetch:async url=>{
 if(networkFailure)throw Error('Network offline');
 if(url.includes('api.github.com'))throw Error('API unavailable');
 return {ok:true,json:async()=>incoming};
}};
vm.createContext(ctx);
let code=fs.readFileSync(new URL('./app-atlas-v12.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
code+='\nglobalThis.testing={poll,get:()=>current};';
vm.runInContext(code,ctx);
await new Promise(r=>setImmediate(r));
assert.match(registry.get('connection').textContent,/Kartendaten ungültig/);
assert.match(registry.get('error').textContent,/bell/);
assert.equal(ctx.testing.get(),null);
incoming=valid;await ctx.testing.poll();
assert.equal(registry.get('connection').textContent,'Verbunden');
assert.equal(ctx.testing.get().revision,valid.revision);
assert.equal(registry.get('tokens').children.length,valid.tokens.length);
const previous=ctx.testing.get(),token=registry.get('tokens').children[0];
incoming=invalid;await ctx.testing.poll();
assert.match(registry.get('connection').textContent,/Kartendaten ungültig · letzter gültiger Stand/);
assert.equal(ctx.testing.get(),previous);
assert.equal(registry.get('tokens').children[0],token);
networkFailure=true;await ctx.testing.poll();
assert.equal(registry.get('connection').textContent,'Verbindung unterbrochen');
assert.equal(ctx.testing.get(),previous);
networkFailure=false;incoming={...valid,revision:valid.revision+'-recovered'};await ctx.testing.poll();
assert.equal(registry.get('connection').textContent,'Verbunden');
assert.equal(registry.get('error').textContent,'');
assert.equal(ctx.testing.get().revision,incoming.revision);
console.log('PASS: invalid startup; precise marker error; real state renders; invalid update preserves map; network errors distinguished; recovery.');
