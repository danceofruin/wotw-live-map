export const ICONS = ['styke','vesper','valeria','ogre','soldier','boggard','undead','mage','beast','unknown'];
export const MARKERS = ['crate','tree','rock','fire','door','stairs','pillar','chest','table','bed','barrel','shelf','rack','lever','anvil','alarm'];
export const COLORS = {party:'#487fc4',ally:'#4b9b73',hostile:'#c95559',neutral:'#c99d52',unknown:'#956fc1'};
export function letters(n) { let s=''; for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s; return s; }
export function square(value,cols,rows,size=1) {
 const m=/^([A-Z]+)([1-9]\d*)$/i.exec(value||'');if(!m)throw Error('Ungültiges Feld: '+value);
 const x=[...m[1].toUpperCase()].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1,y=+m[2]-1;
 if(x+size>cols||y+size>rows)throw Error('Token außerhalb der Karte: '+value);
 return {x,y,square:letters(x)+(y+1)};
}
const finite = (v,min,max,label) => {if(!Number.isFinite(v)||v<min||v>max)throw Error('Ungültig: '+label);return v;};
const integer=(v,min,max,label)=>{finite(v,min,max,label);if(!Number.isInteger(v))throw Error('Ganzzahl erforderlich: '+label);return v;};
const text=(v,fallback='')=>typeof v==='string'?v.slice(0,200):fallback;
export function safeAsset(value) {
 if(!value)return '';
 if(typeof value!=='string'||!/^([\w/-]+\.(png|jpe?g|webp|svg)|https:\/\/[^\s]+)$/i.test(value)||value.split('/').includes('..'))throw Error('Ungültiger Bildpfad.');
 return value;
}
export function normalize(raw) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![1,2].includes(raw.schema_version))throw Error('Unbekanntes Kartenformat.');
 if(typeof raw.active!=='boolean')throw Error('active muss true/false sein.');
 if(typeof raw.revision!=='string'&&typeof raw.revision!=='number')throw Error('revision fehlt.');
 const common={active:raw.active,revision:String(raw.revision),scene_id:text(raw.scene_id),title:text(raw.title,'WotW Live Map'),generated_at:text(raw.generated_at),tokens:[]};
 if(!raw.active)return common;
 const legacy=raw.schema_version===1,g=legacy?raw.map?.grid:raw.grid;
 if(!g)throw Error('Raster fehlt.');
 const cols=integer(legacy?g.columns:g.cols,1,400,'Spalten'),rows=integer(g.rows,1,400,'Zeilen');
 const offset_x=integer(g.offset_x??0,0,100000,'Globaler Ursprung X'),offset_y=integer(g.offset_y??0,0,100000,'Globaler Ursprung Y');
 const cw=finite(legacy?g.cell_px?.width:64,1,1024,'Feldbreite'),ch=finite(legacy?g.cell_px?.height:64,1,1024,'Feldhöhe');
 const ox=finite(legacy?g.origin_px?.x:32,0,10000,'Ursprung X'),oy=finite(legacy?g.origin_px?.y:32,0,10000,'Ursprung Y');
 const width=finite(legacy?raw.map?.width_px:cols*cw+64,1,120000,'Breite'),height=finite(legacy?raw.map?.height_px:rows*ch+64,1,120000,'Höhe');
 const map=raw.map||{};
 if((raw.tokens?.length||0)>300)throw Error('Zu viele Tokens.');
 const ids=new Set(),tokens=(raw.tokens||[]).filter(t=>t.visible!==false).map(t=>{
  if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id))throw Error('Token-ID fehlt oder doppelt.');ids.add(t.id);
  const size=integer(t.size??1,1,20,'Tokengröße'),p=square(t.square,cols,rows,size);
  return {...p,display_square:letters(p.x+offset_x)+(p.y+offset_y+1),id:t.id,name:text(t.name,t.id),label:text(t.label,t.id).slice(0,12),size,icon:ICONS.includes(t.icon)?t.icon:ICONS.includes(t.id)?t.id:'unknown',faction:COLORS[t.faction]?t.faction:'unknown',statuses:Array.isArray(t.statuses)?t.statuses.filter(s=>typeof s==='string').slice(0,12):[],hp:text(t.hp),elevation_ft:finite(t.elevation_ft??0,-10000,10000,'Höhe')};
 });
 const areas=(map.terrain||[]).filter(a=>a.visible!==false).map(a=>{
  if(!['floor','water','grass','forest','rubble','void','road'].includes(a.type))throw Error('Unbekanntes Gelände.');
  if(Array.isArray(a.points)){if(a.points.length<3||a.points.length>1000)throw Error('Ungültiges Bodenpolygon');return {type:a.type,points:a.points.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('Polygonpunkt fehlt');return [finite(p[0],0,cols,'Boden X'),finite(p[1],0,rows,'Boden Y')];})};}
  const x=finite(a.x,0,cols,'Gelände X'),y=finite(a.y,0,rows,'Gelände Y'),w=finite(a.w,.1,cols-x,'Geländebreite'),h=finite(a.h,.1,rows-y,'Geländehöhe');return {type:a.type,x,y,w,h};
 });
 const walls=(map.walls||[]).filter(a=>a.visible!==false).map(a=>{
  const point=p=>{if(!Array.isArray(p)||p.length!==2)throw Error('Wandpunkt fehlt.');return [finite(p[0],0,cols,'Wand X'),finite(p[1],0,rows,'Wand Y')];};return {from:point(a.from),to:point(a.to)};
 });
 const doors=(map.doors||[]).map(a=>{const point=p=>{if(!Array.isArray(p)||p.length!==2)throw Error('Türpunkt fehlt');return [finite(p[0],0,cols,'Tür X'),finite(p[1],0,rows,'Tür Y')];};const kind=['portal','portcullis'].includes(a.kind)?a.kind:'door';
  const state=a.state??(kind==='portcullis'?(a.open?'raised':'lowered'):(a.open?'open':'closed'));
  if(!(kind==='portcullis'?['raised','lowered','destroyed','under_construction']:['open','closed','destroyed']).includes(state))throw Error('Ungültiger Tür-/Gatterzustand');
  return {id:text(a.id),from:point(a.from),to:point(a.to),state,open:['open','raised','destroyed'].includes(state),kind,material:['wood','iron','steel','stone'].includes(a.material)?a.material:'wood'};});
 const markers=(map.markers||[]).filter(a=>a.visible!==false).map(a=>{
  if(!MARKERS.includes(a.type))throw Error('Unbekannter Marker.');
  const x=finite(a.x,0,cols,'Marker X'),y=finite(a.y,0,rows,'Marker Y');return {type:a.type,x,y,w:finite(a.w??1,.1,cols-x,'Markerbreite'),h:finite(a.h??1,.1,rows-y,'Markerhöhe'),rotation:finite(a.rotation??0,-360,360,'Drehung'),open:a.open===true,label:text(a.label)};
 });
 const lines=(map.lines||[]).map(a=>{const point=p=>{if(!Array.isArray(p)||p.length!==2)throw Error('Linienpunkt fehlt');return [finite(p[0],0,cols,'Linie X'),finite(p[1],0,rows,'Linie Y')];};return {from:point(a.from),to:point(a.to),kind:['low_wall','arrow_slit'].includes(a.kind)?a.kind:'service',label:text(a.label)};});
 const labels=(map.labels||[]).map(a=>({x:finite(a.x,0,cols,'Text X'),y:finite(a.y,0,rows,'Text Y'),w:finite(a.w??Math.min(4,cols),.1,cols,'Textbreite'),text:text(a.text)}));
 if(areas.length+walls.length+markers.length+doors.length+lines.length+labels.length>4000)throw Error('Zu viele Geländeobjekte.');
 return {...common,tokens,grid:{cols,rows,cw,ch,ox,oy,offset_x,offset_y,feet:finite(legacy?(g.feet_per_cell??5):(g.feet??5),1,100,'Maßstab'),baked:legacy&&g.baked_in_base===true},map:{width,height,asset:safeAsset(map.asset),asset_revision:text(map.asset_revision),terrain:areas,walls,markers,doors,lines,labels}};
}


