import {normalize,letters,COLORS} from './model.mjs';
const RAW='https://raw.githubusercontent.com/danceofruin/wotw-live-map/main/';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
let current=null,mode='live',zoom=1,showGrid=true,showCoords=true,timer,busy=false,layoutKey='',sceneId='',selected='',generation=0;
const nodes=new Map();
for(const id of ['terrain','grid-layer','walls','coords-layer','tokens'])$('canvas').append(svg('g',{id}));
const group=id=>$('canvas').querySelector('#'+id);
const asset=path=>path.startsWith('https://')?path:RAW+path;
function connection(message,error=false){$('connection').textContent=message;$('connection').classList.toggle('error',error);}
function scale(){if(!current?.active)return;$('stage').style.width=current.map.width+'px';$('stage').style.height=current.map.height+'px';$('stage').style.transform=`scale(${zoom})`;$('sizer').style.width=current.map.width*zoom+'px';$('sizer').style.height=current.map.height*zoom+'px';}
function fit(){if(!current?.active)return;zoom=Math.max(.05,Math.min(1,($('viewport').clientWidth-26)/current.map.width,($('viewport').clientHeight-26)/current.map.height));scale();}
function coords(g,x,y){return [g.ox+x*g.cw,g.oy+y*g.ch];}
function layout(state){
 const g=state.grid,{terrain,walls,markers}=state.map;
 for(const id of ['terrain','grid-layer','walls','coords-layer'])group(id).replaceChildren();
 const fills={floor:'#484741',water:'#29465d',grass:'#344b3d',rubble:'#645d51',void:'#11151a',road:'#75694f'};
 for(const a of terrain){const [x,y]=coords(g,a.x,a.y);group('terrain').append(svg('rect',{x,y,width:a.w*g.cw,height:a.h*g.ch,fill:fills[a.type]}));}
 for(let c=0;c<=g.cols;c++){const x=g.ox+c*g.cw;group('grid-layer').append(svg('line',{x1:x,y1:g.oy,x2:x,y2:g.oy+g.rows*g.ch,class:'gridline'}));}
 for(let r=0;r<=g.rows;r++){const y=g.oy+r*g.ch;group('grid-layer').append(svg('line',{x1:g.ox,y1:y,x2:g.ox+g.cols*g.cw,y2:y,class:'gridline'}));}
 for(const wall of walls){const [x1,y1]=coords(g,...wall.from),[x2,y2]=coords(g,...wall.to);group('walls').append(svg('line',{x1,y1,x2,y2,class:'wall'}));}
 for(const m of markers){const [x,y]=coords(g,m.x,m.y),w=m.w*g.cw,h=m.h*g.ch;const el=svg('image',{href:`assets/markers/${m.type}.svg`,x,y,width:w,height:h,transform:`rotate(${m.rotation},${x+w/2},${y+h/2})`,opacity:m.open?.4:1});group('walls').append(el);}
 for(let c=0;c<g.cols;c++){const el=svg('text',{x:g.ox+(c+.5)*g.cw,y:g.oy-12,class:'coord'});el.textContent=letters(c);group('coords-layer').append(el);}
 for(let r=0;r<g.rows;r++){const el=svg('text',{x:g.ox-16,y:g.oy+(r+.5)*g.ch+4,class:'coord'});el.textContent=r+1;group('coords-layer').append(el);}
 visibility();
}
function visibility(){group('grid-layer').style.display=showGrid&&!current?.grid?.baked?'':'none';group('coords-layer').style.display=showCoords?'':'none';}
function detail(id){
 selected=id;const t=current?.tokens.find(t=>t.id===id);$('detail').replaceChildren();
 if(!t){$('detail').textContent='Token anklicken für Details.';return;}
 const title=document.createElement('strong');title.textContent=t.name;
 $('detail').append(title,document.createTextNode(`${t.square} · ${t.size}×${t.size} Felder`),document.createElement('br'),document.createTextNode(t.statuses.length?t.statuses.join(', '):'Kein Status'));
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
  node.setAttribute('aria-label',t.name+' '+t.square);
  node.style.transform=`translate(${state.grid.ox+(t.x+t.size/2)*state.grid.cw}px,${state.grid.oy+(t.y+t.size/2)*state.grid.ch}px)`;
  const signature=JSON.stringify([t.label,t.icon,t.faction,t.size,statuses,state.grid.cw,state.grid.ch]);
  if(node.dataset.signature!==signature){
   node.dataset.signature=signature;node.replaceChildren();node.append(svg('circle',{r,class:'rim',stroke:COLORS[t.faction]}));
   const img=svg('image',{href:`assets/tokens/${t.icon}.svg`,x:-r*.83,y:-r*.83,width:r*1.66,height:r*1.66});node.append(img);
   const label=svg('text',{x:0,y:r+13,class:'name'});label.textContent=t.label;node.append(label);
   if(statuses.includes('dead'))node.append(svg('path',{d:`M ${-r*.6} ${-r*.6} L ${r*.6} ${r*.6} M ${r*.6} ${-r*.6} L ${-r*.6} ${r*.6}`,class:'cross'}));
   else if(statuses.length){node.append(svg('circle',{cx:r*.7,cy:-r*.7,r:9,fill:statuses.includes('down')?'#d88b38':'#6a587e'}));const b=svg('text',{x:r*.7,y:-r*.7+4,class:'badge'});b.textContent=statuses.includes('down')?'!':'•';node.append(b);}
  }
  const row=document.createElement('button');row.className='roster-token';const icon=document.createElement('img');icon.src=`assets/tokens/${t.icon}.svg`;icon.alt='';const name=document.createElement('span');name.textContent=t.name;const pos=document.createElement('small');pos.textContent=t.square;row.append(icon,name,pos);row.onclick=()=>detail(t.id);$('roster').append(row);
 }
 detail(selected);
}
function render(raw){
 const next=normalize(raw),newScene=sceneId!==next.scene_id;current=next;sceneId=next.scene_id;
 $('title').textContent=next.title;$('mode').textContent=mode==='live'?'LIVE':mode==='demo'?'DEMO · KEIN KAMPAGNENSTAND':'LOKALE VORSCHAU';
 $('empty').hidden=next.active;$('sizer').hidden=!next.active;
 $('meta').textContent=next.active?`${next.grid.cols} × ${next.grid.rows} · ${next.grid.feet} ft / Feld\nStand: ${next.generated_at?new Date(next.generated_at).toLocaleString():'—'}`:'Keine aktive Begegnung.';
 if(!next.active){$('roster').replaceChildren();$('detail').textContent='Token anklicken für Details.';return;}
 if(newScene){nodes.clear();group('tokens').replaceChildren();selected='';layoutKey='';}
 $('canvas').setAttribute('viewBox',`0 0 ${next.map.width} ${next.map.height}`);
 const key=JSON.stringify([next.grid,next.map]);if(key!==layoutKey){layout(next);layoutKey=key;}
 const src=next.map.asset?asset(next.map.asset)+(next.map.asset.includes('?')?'&':'?')+'asset='+encodeURIComponent(next.map.asset_revision||next.map.asset):'';
 if(src!==$('base').dataset.asset){$('base').dataset.asset=src;$('base').hidden=!src;if(src){$('base').onerror=()=>{$('base').hidden=true;connection('Hintergrund fehlt; Raster bleibt sichtbar',true);};$('base').src=src;}else $('base').removeAttribute('src');}
 tokens(next);scale();if(newScene)fit();
}
async function poll(){
 clearTimeout(timer);if(mode!=='live'||document.hidden||busy)return;
 busy=true;const requestGeneration=generation;
 try{const response=await fetch(RAW+'state.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const raw=await response.json();if(mode!=='live'||requestGeneration!==generation)return;
  if(!current||String(raw.revision)!==current.revision||raw.active!==current.active||raw.scene_id!==current.scene_id)render(raw);
  connection('Verbunden');$('error').textContent='';
 }catch(e){if(mode==='live'&&requestGeneration===generation){connection('Verbindung unterbrochen',true);$('error').textContent=e.message;}}
 finally{busy=false;if(mode==='live'&&!document.hidden)timer=setTimeout(poll,2000);}
}
async function demo(){mode='demo';generation++;clearTimeout(timer);try{const r=await fetch('demo.json');if(!r.ok)throw Error('Demo konnte nicht geladen werden.');render(await r.json());connection('Demo · lokal');$('demo').textContent='Live';}catch(e){$('error').textContent=e.message;}}
function live(){mode='live';generation++;current=null;clearTimeout(timer);$('demo').textContent='Demo';connection('Verbinden …');poll();}
$('demo').onclick=()=>mode==='live'?demo():live();$('empty-demo').onclick=demo;$('live').onclick=live;
$('preview').onclick=()=>{try{const raw=JSON.parse($('json').value);normalize(raw);mode='preview';generation++;clearTimeout(timer);render(raw);connection('Lokale Vorschau');$('demo').textContent='Live';$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('grid').onclick=()=>{showGrid=!showGrid;$('grid').setAttribute('aria-pressed',showGrid);visibility();};$('coords').onclick=()=>{showCoords=!showCoords;$('coords').setAttribute('aria-pressed',showCoords);visibility();};
$('fit').onclick=fit;$('minus').onclick=()=>{zoom=Math.max(.05,zoom/1.25);scale();};$('plus').onclick=()=>{zoom=Math.min(4,zoom*1.25);scale();};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{connection('Vollbild nicht verfügbar',true);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(mode==='live')poll();});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,80);}).observe($('viewport'));
if(new URLSearchParams(location.search).has('demo'))demo();else poll();
