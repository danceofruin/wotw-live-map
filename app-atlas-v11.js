import {normalize,letters,COLORS} from './model-atlas-v11.mjs';
import {MapHistory,snapshotAsset} from './history.mjs';
const RAW='https://raw.githubusercontent.com/danceofruin/wotw-live-map/main/';
const STATE_API='https://api.github.com/repos/danceofruin/wotw-live-map/contents/state.json?ref=main';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
let current=null,mode='live',zoom=1,showGrid=true,showCoords=true,showProps=true,showNames=true,showLighting=true,timer,busy=false,layoutKey='',sceneId='',selected='',generation=0;
const nodes=new Map(),history=new MapHistory((...args)=>fetch(...args));
let historyIndex=-1,historyEntry=null,historyBusy=false;
for(const id of ['terrain','lighting-layer','grid-layer','props-layer','walls','labels-layer','coords-layer','tokens'])$('canvas').append(svg('g',{id}));
const group=id=>$('canvas').querySelector('#'+id);
const asset=path=>mode==='history'&&historyEntry?snapshotAsset(path,historyEntry.sha):path.startsWith('https://')?path:RAW+path;
function connection(message,error=false){$('connection').textContent=message;$('connection').classList.toggle('error',error);}
function scale(){if(!current?.active)return;$('stage').style.width=current.map.width+'px';$('stage').style.height=current.map.height+'px';$('stage').style.transform=`scale(${zoom})`;$('sizer').style.width=current.map.width*zoom+'px';$('sizer').style.height=current.map.height*zoom+'px';}
function fit(){if(!current?.active)return;zoom=Math.max(.05,Math.min(1,($('viewport').clientWidth-26)/current.map.width,($('viewport').clientHeight-26)/current.map.height));scale();}
function coords(g,x,y){return [g.ox+x*g.cw,g.oy+y*g.ch];}
function layout(state){
 const g=state.grid,{terrain,walls,markers}=state.map;
 for(const id of ['terrain','lighting-layer','grid-layer','props-layer','walls','labels-layer','coords-layer'])group(id).replaceChildren();
 const fills={forest:'#263e2f',floor:'#484741',water:'#29465d',grass:'#344b3d',rubble:'#645d51',void:'#11151a',road:'#75694f'};
 for(const a of terrain){if(a.points){group('terrain').append(svg('polygon',{points:a.points.map(p=>coords(g,...p).join(',')).join(' '),fill:fills[a.type]}));}else{const [x,y]=coords(g,a.x,a.y);group('terrain').append(svg('rect',{x,y,width:a.w*g.cw,height:a.h*g.ch,fill:fills[a.type]}));}}
 for(const [y,line] of (state.map.lighting?.rows||[]).entries()){let x=0;while(x<line.length){let end=x+1;while(end<line.length&&line[end]===line[x])end++;const tier=line[x],[px,py]=coords(g,x,y);group('lighting-layer').append(svg('rect',{x:px,y:py,width:(end-x)*g.cw,height:g.ch,fill:tier==='2'?'#bf8944':'#02050c',opacity:tier==='2'?.07:tier==='1'?.34:.74,class:'lighting-cell'}));x=end;}}
 for(let c=0;c<=g.cols;c++){const x=g.ox+c*g.cw;group('grid-layer').append(svg('line',{x1:x,y1:g.oy,x2:x,y2:g.oy+g.rows*g.ch,class:'gridline'}));}
 for(let r=0;r<=g.rows;r++){const y=g.oy+r*g.ch;group('grid-layer').append(svg('line',{x1:g.ox,y1:y,x2:g.ox+g.cols*g.cw,y2:y,class:'gridline'}));}
 for(const wall of walls){const [x1,y1]=coords(g,...wall.from),[x2,y2]=coords(g,...wall.to);group('walls').append(svg('line',{x1,y1,x2,y2,class:'wall'}));}
 for(const d of state.map.doors||[]){
  const [x1,y1]=coords(g,...d.from),[x2,y2]=coords(g,...d.to);
  if(d.kind==='portcullis'){
   const gate=svg('g',{'data-feature-id':d.id,'data-state':d.state,'aria-label':`Fallgatter: ${d.state}`,opacity:d.state==='raised'?.45:d.state==='destroyed'?.3:1});
   const title=svg('title');title.textContent=`Fallgatter · ${{raised:'hochgezogen',lowered:'heruntergelassen',destroyed:'zerstört',under_construction:'im Bau'}[d.state]}`;gate.append(title);
   const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
   gate.append(svg('line',{x1,y1,x2,y2,stroke:'#c6d5e0','stroke-width':g.cw*.06,'stroke-dasharray':d.state==='raised'?'6 5':d.state==='under_construction'?'3 7':d.state==='destroyed'?'2 12':''}));
   if(d.state==='lowered')for(let i=1,n=Math.ceil(length/(g.cw*.22));i<n;i++){
    const x=x1+dx*i/n,y=y1+dy*i/n,r=g.cw*.11;
    gate.append(svg('line',{x1:x-nx*r,y1:y-ny*r,x2:x+nx*r,y2:y+ny*r,stroke:'#c6d5e0','stroke-width':g.cw*.045}));
   }
   group('walls').append(gate);
  }else group('walls').append(svg('line',{x1,y1,x2,y2,stroke:d.kind==='portal'?'#b995dc':d.material==='wood'?'#c38a57':'#b6c3cd','stroke-width':g.cw*.18,'stroke-linecap':'butt',opacity:d.open?.35:1,'stroke-dasharray':d.open?'8 6':''}));
 }
 for(const m of markers){const [x,y]=coords(g,m.x,m.y),w=m.w*g.cw,h=m.h*g.ch;const el=m.type==='door'?svg('rect',{x,y,width:w,height:h,fill:'#b57449',stroke:'#d1ad83','stroke-width':1,transform:`rotate(${m.rotation},${x+w/2},${y+h/2})`,opacity:m.open?.4:1}):svg('image',{href:`assets/markers/${m.type}.svg`,x,y,width:w,height:h,transform:`rotate(${m.rotation},${x+w/2},${y+h/2})`,opacity:m.open?.4:1});const fixture=svg('g',{class:'map-fixture'+(m.state==='broken'?' prop-broken':''),'data-prop-id':m.id,'data-prop-state':m.state});if(m.label){const title=svg('title');title.textContent=m.label+(m.state==='broken'?' · beschädigt':'')+(m.cover_candidate==='possible'?' · mögliche Deckung (GM entscheidet)':'');fixture.append(title);}fixture.append(el);group('props-layer').append(fixture);}
 for(const l of state.map.lights||[]){if(l.x<0||l.x>=g.cols||l.y<0||l.y>=g.rows)continue;const [cx,cy]=coords(g,l.x,l.y),z=g.cw*.8;const el=svg('g',{class:'light-fixture','data-light-id':l.id,'data-light-state':l.state});const title=svg('title');title.textContent=l.label+' · '+(l.state==='lit'?'entzündet':l.state==='unlit'?'erloschen':'zerstört')+' · '+l.bright_ft+' ft normal + '+l.dim_ft+' ft dämmrig';el.append(title);el.append(svg('image',{href:'assets/markers/'+l.kind+'.svg',x:cx-z/2,y:cy-z/2,width:z,height:z,opacity:l.state==='lit'?1:.3}));group('props-layer').append(el);}
 for(let c=0;c<g.cols;c++){const el=svg('text',{x:g.ox+(c+.5)*g.cw,y:g.oy-12,class:'coord'});el.textContent=letters(c+(g.offset_x||0));group('coords-layer').append(el);}
 for(let r=0;r<g.rows;r++){const el=svg('text',{x:g.ox-16,y:g.oy+(r+.5)*g.ch+4,class:'coord'});el.textContent=r+1+(g.offset_y||0);group('coords-layer').append(el);}
 for(const label of state.map.labels||[]){const [x,y]=coords(g,label.x,label.y),font=Math.min(40,Math.max(20,g.cols*.65)),limit=Math.max(8,Math.floor(label.w*g.cw/(font*.62))),lines=[];for(const part of label.text.split(' / ')){let line='';for(const word of part.split(' ')){if(line&&(line+' '+word).length>limit){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);}const el=svg('text',{x,y:y-(lines.length-1)*font*.6,fill:'#ddd9cb','font-size':font,'text-anchor':'middle','paint-order':'stroke',stroke:'#222','stroke-width':3});lines.forEach((part,i)=>{const span=svg('tspan',{x,dy:i?font*1.2:0});span.textContent=part;el.append(span);});group('labels-layer').append(el);}
 for(const line of state.map.lines||[]){const [x1,y1]=coords(g,...line.from),[x2,y2]=coords(g,...line.to);if(line.kind==='arrow_slit'){const slit=svg('g',{class:'arrow-slit'});if(line.label){const title=svg('title');title.textContent=line.label;slit.append(title);}slit.append(svg('line',{x1,y1,x2,y2,stroke:'#191b1e','stroke-width':g.cw*.18,'stroke-linecap':'round'}));slit.append(svg('line',{x1,y1,x2,y2,stroke:'#d9b783','stroke-width':g.cw*.075,'stroke-linecap':'round'}));group('walls').append(slit);}else group('walls').append(svg('line',{x1,y1,x2,y2,stroke:line.kind==='low_wall'?'#ada792':'#65b8db','stroke-width':4,'stroke-dasharray':line.kind==='low_wall'?'':'10 7'}));}
 visibility();
}
function visibility(){group('grid-layer').style.display=showGrid&&!current?.grid?.baked?'':'none';group('coords-layer').style.display=showCoords?'':'none';group('props-layer').style.display=showProps?'':'none';group('labels-layer').style.display=showNames?'':'none';group('lighting-layer').style.display=showLighting?'':'none';}
function detail(id){
 selected=id;const t=current?.tokens.find(t=>t.id===id);$('detail').replaceChildren();
 if(!t){$('detail').textContent='Token anklicken für Details.';return;}
 const title=document.createElement('strong');title.textContent=t.name;
 $('detail').append(title,document.createTextNode(`${t.display_square} · ${t.size}×${t.size} Felder`),document.createElement('br'),document.createTextNode(t.statuses.length?t.statuses.join(', '):'Kein Status'));
 if(t.hp)$('detail').append(document.createElement('br'),document.createTextNode('HP '+t.hp));
 if(t.elevation_ft)$('detail').append(document.createElement('br'),document.createTextNode('Höhe '+t.elevation_ft+' ft'));
}
function tokens(state){
 const live=new Set(state.tokens.map(t=>t.id));for(const [id,node]of nodes)if(!live.has(id)){node.remove();nodes.delete(id);}
 $('roster').replaceChildren();
 for(const t of state.tokens){
  let node=nodes.get(t.id);if(!node){node=svg('g',{class:'token',tabindex:0,role:'button'});node.addEventListener('click',()=>detail(t.id));node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(t.id);}});group('tokens').append(node);nodes.set(t.id,node);}
  const statuses=t.statuses,r=Math.min(state.grid.cw,state.grid.ch)*t.size*.42;
  node.setAttribute('class','token'+(statuses.some(s=>['hidden','invisible','stealth'].includes(s))?' hidden-token':'')+(statuses.includes('dead')?' dead':''));
  node.setAttribute('aria-label',t.name+' '+t.display_square);
  node.style.transform=`translate(${state.grid.ox+(t.x+t.size/2)*state.grid.cw}px,${state.grid.oy+(t.y+t.size/2)*state.grid.ch}px)`;
  const signature=JSON.stringify([t.label,t.icon,t.faction,t.size,statuses,state.grid.cw,state.grid.ch]);
  if(node.dataset.signature!==signature){
   node.dataset.signature=signature;node.replaceChildren();node.append(svg('circle',{r,class:'rim',stroke:COLORS[t.faction]}));
   const img=svg('image',{href:`assets/tokens/${t.icon}.svg`,x:-r*.83,y:-r*.83,width:r*1.66,height:r*1.66});node.append(img);
   const label=svg('text',{x:0,y:r+13,class:'name'});label.textContent=t.label;node.append(label);
   if(statuses.includes('dead'))node.append(svg('path',{d:`M ${-r*.6} ${-r*.6} L ${r*.6} ${r*.6} M ${r*.6} ${-r*.6} L ${-r*.6} ${r*.6}`,class:'cross'}));
   else if(statuses.length){node.append(svg('circle',{cx:r*.7,cy:-r*.7,r:9,fill:statuses.includes('down')?'#d88b38':'#6a587e'}));const b=svg('text',{x:r*.7,y:-r*.7+4,class:'badge'});b.textContent=statuses.includes('down')?'!':'•';node.append(b);}
  }
  const row=document.createElement('button');row.className='roster-token';const icon=document.createElement('img');icon.src=`assets/tokens/${t.icon}.svg`;icon.alt='';const name=document.createElement('span');name.textContent=t.name;const pos=document.createElement('small');pos.textContent=t.display_square;row.append(icon,name,pos);row.onclick=()=>detail(t.id);$('roster').append(row);
 }
 detail(selected);
}
function render(raw){
 $('history-live').disabled=mode==='live';
 const next=normalize(raw),newScene=sceneId!==next.scene_id;current=next;sceneId=next.scene_id;
 $('title').textContent=next.title;$('mode').textContent=mode==='live'?'LIVE':mode==='history'?'VERLAUF · GESPEICHERTER STAND':mode==='atlas'?'ATLAS · AUSGESTATTETER GRUNDRISS':mode==='demo'?'DEMO · KEIN KAMPAGNENSTAND':'LOKALE VORSCHAU';
 $('empty').hidden=next.active;$('sizer').hidden=!next.active;
 $('meta').textContent=next.active?`${next.grid.cols} × ${next.grid.rows} · ${next.grid.feet} ft / Feld${next.grid.offset_x||next.grid.offset_y?' · globaler Ausschnitt':''}\nStand: ${next.generated_at?new Date(next.generated_at).toLocaleString():'—'}`:'Keine aktive Begegnung.';
 if(!next.active){$('roster').replaceChildren();$('detail').textContent='Token anklicken für Details.';return;}
 if(newScene){nodes.clear();group('tokens').replaceChildren();selected='';layoutKey='';}
 $('canvas').setAttribute('viewBox',`0 0 ${next.map.width} ${next.map.height}`);
 const key=JSON.stringify([next.grid,next.map]);if(key!==layoutKey){layout(next);layoutKey=key;}
 const src=next.map.asset?asset(next.map.asset)+(next.map.asset.includes('?')?'&':'?')+'asset='+encodeURIComponent(next.map.asset_revision||next.map.asset):'';
 if(src!==$('base').dataset.asset){$('base').dataset.asset=src;$('base').hidden=!src;if(src){$('base').onerror=()=>{$('base').hidden=true;connection('Hintergrund fehlt; Raster bleibt sichtbar',true);};$('base').src=src;}else $('base').removeAttribute('src');}
 tokens(next);scale();if(newScene)fit();
}
const rawStamp=raw=>Date.parse(raw?.generated_at||'')||0;
async function apiState(){
 const response=await fetch(STATE_API+'&t='+Date.now(),{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('GitHub API '+response.status);
 const envelope=await response.json(),binary=atob(String(envelope.content||'').replace(/\s/g,''));
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function rawState(){
 const response=await fetch(RAW+'state.json?t='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
async function poll(){
 clearTimeout(timer);if(mode!=='live'||document.hidden||busy)return;
 busy=true;const requestGeneration=generation;
 try{
  const raw=current?await rawState():await apiState().catch(()=>rawState());
  if(mode!=='live'||requestGeneration!==generation)return;
  const stale=current&&rawStamp(raw)&&rawStamp(current)&&rawStamp(raw)<rawStamp(current);
  if(!stale&&(!current||String(raw.revision)!==current.revision||raw.active!==current.active||raw.scene_id!==current.scene_id))render(raw);
  connection(stale?'Verbunden · Raw-Cache wird ignoriert':'Verbunden');$('error').textContent='';
 }catch(e){if(mode==='live'&&requestGeneration===generation){connection('Verbindung unterbrochen',true);$('error').textContent=e.message;}}
 finally{busy=false;if(mode==='live'&&!document.hidden)timer=setTimeout(poll,2000);}
}
async function demo(){mode='demo';historyBusy=false;historyControls();const requestGeneration=++generation;clearTimeout(timer);try{const r=await fetch('demo.json');if(!r.ok)throw Error('Demo konnte nicht geladen werden.');const raw=await r.json();if(mode!=='demo'||generation!==requestGeneration)return;render(raw);connection('Demo · lokal');$('demo').textContent='Live';}catch(e){if(mode==='demo'&&generation===requestGeneration)$('error').textContent=e.message;}}
function live(){mode='live';historyBusy=false;historyControls();generation++;current=null;clearTimeout(timer);$('demo').textContent='Demo';connection('Verbinden …');poll();}
function historyControls(){
 if(mode!=='history'){$('history-select').value='';$('history-status').textContent='Älter öffnet den letzten gespeicherten Kampfstand.';}
 $('history-older').disabled=historyBusy||(mode==='history'&&historyIndex>=0&&!history.hasOlder(historyIndex));
 $('history-newer').disabled=historyBusy||mode!=='history'||historyIndex<0||!history.hasNewer(historyIndex);
 $('history-select').disabled=historyBusy||!history.entries.length;
 $('history-more').disabled=historyBusy||history.done;
 $('history-live').disabled=mode==='live';
}
function historyOptions(){
 $('history-select').replaceChildren();
 const prompt=document.createElement('option');prompt.value='';prompt.textContent='Kartenstand auswählen';$('history-select').append(prompt);
 for(const {entry,index} of history.visible()){
  const opt=document.createElement('option');opt.value=String(index);
  const cached=history.cache.get(entry.sha);
  const date=entry.date?new Date(entry.date).toLocaleString():'';
  opt.textContent=`${date} · ${cached?.title||entry.message}`;
  $('history-select').append(opt);
 }
 $('history-select').value=mode==='history'?String(historyIndex):'';
 historyControls();
}
async function showHistory(index,direction=1){
 const requestGeneration=++generation;
 if(mode!=='history'){historyIndex=-1;historyEntry=null;}
 mode='history';clearTimeout(timer);historyBusy=true;historyControls();
 connection('Kartenstand laden …');$('history-status').textContent='Verlauf wird geladen …';
 try{
  const found=await history.load(index,direction);
  if(mode!=='history'||generation!==requestGeneration)return;
  if(!found){
   $('history-status').textContent=historyIndex<0?'Noch keine gespeicherten Kampfkarten.':direction<0?'Neuester gespeicherter Kartenstand.':'Ältester gespeicherter Kartenstand.';
   if(historyIndex<0)live();else connection('Verlauf · gespeichert');
   return;
  }
  normalize(found.raw);historyIndex=found.index;historyEntry=found.entry;
  render(found.raw);$('demo').textContent='Live';$('error').textContent='';
  $('history-status').textContent=new Date(found.entry.date).toLocaleString()+' · '+found.entry.message;
  connection('Verlauf · gespeichert');
 }catch(e){if(mode==='history'&&generation===requestGeneration){connection('Verlauf nicht verfügbar',true);$('history-status').textContent=e.message;}}
 finally{if(generation===requestGeneration){historyBusy=false;historyOptions();}}
}
$('history-older').onclick=()=>showHistory(mode==='history'?Math.max(0,historyIndex+1):0,1);
$('history-newer').onclick=()=>showHistory(historyIndex-1,-1);
$('history-select').onchange=()=>{const value=$('history-select').value;if(value!=='')showHistory(Number(value),1);};
$('history-live').onclick=live;
$('history-more').onclick=async()=>{
 const requestGeneration=generation;historyBusy=true;historyControls();
 try{await history.more();if(requestGeneration===generation)historyOptions();}
 catch(e){if(requestGeneration===generation)$('history-status').textContent=e.message;}
 finally{if(requestGeneration===generation){historyBusy=false;historyControls();}}
};

let atlasCatalogue=null;
async function openAtlas(preferredId,preferredView){
 const requestGeneration=++generation;mode='atlas';historyBusy=false;historyControls();clearTimeout(timer);connection('Atlas laden …');
 try{
  if(!atlasCatalogue){const r=await fetch(RAW+'atlas/index.json?t='+Date.now());if(!r.ok)throw Error('Atlas nicht verfügbar');atlasCatalogue=await r.json();
   $('atlas-select').replaceChildren();for(const a of atlasCatalogue.maps){const o=document.createElement('option');o.value=a.id;o.textContent=a.title;$('atlas-select').append(o);}
  }
  if(typeof preferredId==='string'&&atlasCatalogue.maps.some(a=>a.id===preferredId))$('atlas-select').value=preferredId;
  const id=$('atlas-select').value||atlasCatalogue.maps[0].id,variant=$('atlas-variant').value;
  const entryView=id==='horn-level-1'&&$('atlas-view').value==='entry'||id==='horn-level-1'&&preferredView==='entry';
  $('atlas-view').disabled=id!=='horn-level-1';if(entryView)$('atlas-view').value='entry';
  const r=await fetch(RAW+(atlasCatalogue.geometry_revision>=2?atlasCatalogue.asset_root:'atlas/prepared-v2/')+id+'.'+variant+(entryView?'.entry':'')+'.json');if(!r.ok)throw Error('Karte nicht verfügbar');const raw=await r.json();
  if(mode!=='atlas'||generation!==requestGeneration)return;render(raw);$('demo').textContent='Live';$('error').textContent='';
  connection(variant==='planned'?'Atlas · Ausbauplan':'Atlas · Basiskarte');
  const entry=atlasCatalogue.maps.find(a=>a.id===id);$('atlas-note').textContent=entry?.note||'Leere Basiskarte; aktuelle Wachen und Figuren setzt der GM.';
 }catch(e){if(mode==='atlas'&&generation===requestGeneration){connection('Atlas nicht verfügbar',true);$('error').textContent=e.message;}}
}
$('atlas-open').onclick=()=>openAtlas();$('atlas-view').onchange=()=>{if(atlasCatalogue)openAtlas();};$('atlas-select').onchange=()=>{if(atlasCatalogue)openAtlas();};$('atlas-variant').onchange=()=>{if(atlasCatalogue)openAtlas();};

$('demo').onclick=()=>mode==='live'?demo():live();$('empty-demo').onclick=demo;$('live').onclick=live;
$('preview').onclick=()=>{try{const raw=JSON.parse($('json').value);normalize(raw);mode='preview';historyBusy=false;historyControls();generation++;clearTimeout(timer);render(raw);connection('Lokale Vorschau');$('demo').textContent='Live';$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('grid').onclick=()=>{showGrid=!showGrid;$('grid').setAttribute('aria-pressed',showGrid);visibility();};$('coords').onclick=()=>{showCoords=!showCoords;$('coords').setAttribute('aria-pressed',showCoords);visibility();};
$('props').onclick=()=>{showProps=!showProps;$('props').setAttribute('aria-pressed',showProps);visibility();};$('names').onclick=()=>{showNames=!showNames;$('names').setAttribute('aria-pressed',showNames);visibility();};
$('lighting').onclick=()=>{showLighting=!showLighting;$('lighting').setAttribute('aria-pressed',showLighting);visibility();};
$('fit').onclick=fit;$('minus').onclick=()=>{zoom=Math.max(.05,zoom/1.25);scale();};$('plus').onclick=()=>{zoom=Math.min(4,zoom*1.25);scale();};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{connection('Vollbild nicht verfügbar',true);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(mode==='live')poll();});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,80);}).observe($('viewport'));
historyControls();
const query=new URLSearchParams(location.search);if(query.has('atlas'))openAtlas(query.get('atlas'),query.get('view'));else if(query.has('demo'))demo();else poll();




