import {today,parseKm,validate,periods,summary,upsert} from './core.mjs';
const $=s=>document.querySelector(s),KEY='leasing-bil-kilometer-v1',fmt=n=>new Intl.NumberFormat('da-DK').format(n),date=d=>new Date(d+'T12:00:00'),label=d=>new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric'}).format(date(d)),month=d=>new Intl.DateTimeFormat('da-DK',{month:'long',year:'numeric'}).format(date(d));
let rows=[],raw=null,editing=null,writable=true;
function notice(text,bad=false){$('#alert').textContent=text;$('#alert').classList.toggle('bad',bad);$('#alert').hidden=false;$('#alert').scrollIntoView({block:'nearest'});}
try{raw=localStorage.getItem(KEY);rows=raw===null?[]:validate(JSON.parse(raw));localStorage.setItem(KEY+'-probe','1');localStorage.removeItem(KEY+'-probe');}catch{writable=false;notice('Dine gemte tal kan ikke læses, eller lokal lagring er slået fra. Ingen data bliver overskrevet. Prøv at genåbne appen uden privat browsing.',true);}
function persist(next){if(!writable)throw Error('Lokal lagring er ikke tilgængelig.');const clean=validate(next);if(localStorage.getItem(KEY)!==raw)throw Error('Tallene er ændret i et andet vindue. Genindlæs appen først.');const nextRaw=JSON.stringify(clean);try{localStorage.setItem(KEY,nextRaw);}catch{throw Error('Kunne ikke gemme på denne enhed. Ændringen er ikke gemt.');}rows=clean;raw=nextRaw;render();}
function reset(){editing=null;$('#form').reset();$('#date').value=today();$('#date').max=today();$('#form-title').textContent='Ny aflæsning';$('#save').innerHTML='Gem aflæsning <span aria-hidden="true">↗</span>';$('#cancel').hidden=true;$('#form-error').hidden=true;}
function renderChart(){
 const chart=$('#chart'),points=periods(rows).filter(r=>r.distance!==null).slice(-12);chart.replaceChildren();$('#chart-caption').hidden=!points.length;
 if(!points.length){const p=document.createElement('p');p.className='empty';p.textContent='Gem to aflæsninger, så vises dine kørte kilometer som søjler her.';chart.append(p);return;}
 const max=Math.max(...points.map(r=>r.distance),1),scroll=document.createElement('div'),bars=document.createElement('ol');scroll.className='chart-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Søjlediagram over de seneste '+points.length+' forbrugsperioder. Rul vandret ved behov.');bars.className='bars';
 points.forEach((r,i)=>{
  const column=document.createElement('li');column.className='chart-column';
  const value=document.createElement('span');value.className='bar-value';value.textContent=fmt(r.distance);
  const track=document.createElement('div');track.className='bar-track';track.setAttribute('aria-hidden','true');
  const fill=document.createElement('div');fill.className='bar-fill'+(i===points.length-1?' latest':'');fill.style.height=(r.distance/max*100)+'%';track.append(fill);
  const caption=document.createElement('span');caption.className='bar-month';caption.textContent=new Intl.DateTimeFormat('da-DK',{month:'short',year:'2-digit'}).format(date(r.date));
  const period=document.createElement('span');period.className='sr-only';period.textContent=': '+fmt(r.distance)+' kilometer fra '+label(r.previous.date)+' til '+label(r.date)+'.';value.setAttribute('aria-hidden','true');caption.setAttribute('aria-hidden','true');
  column.title=label(r.previous.date)+' → '+label(r.date)+': '+fmt(r.distance)+' km';column.append(value,track,caption,period);bars.append(column);
 });
 scroll.append(bars);chart.append(scroll);scroll.scrollLeft=scroll.scrollWidth;
 const note=document.createElement('p');note.className='chart-note';note.textContent=points.length===1?'1 forbrugsperiode':'Seneste '+points.length+' forbrugsperioder';if(scroll.scrollWidth>scroll.clientWidth)note.textContent+=' · Stryg vandret for at se alle';chart.append(note);
}
function render(){
 $('#save').disabled=!writable;const s=summary(rows),last=s.last;
 $('#distance').textContent=last?.distance===null||!last?'—':fmt(last.distance);
 $('#result-month').textContent=last?month(last.date):'';
 $('#result-title').textContent=last?.consecutive?'Seneste månedsperiode':'Siden sidste aflæsning';
 $('#period').textContent=!last?'Gem din første aflæsning for at starte.':!last.previous?'Dit udgangspunkt er '+fmt(last.km)+' km. Gem igen næste måned.':label(last.previous.date)+' → '+label(last.date);
 $('#comparison').textContent=!last?'Dit overblik starter med to aflæsninger.':s.change===null?'Sammenlign med forrige månedsperiode efter tre aflæsninger i tre måneder i træk.':s.change===0?'Præcis samme antal kilometer som i forrige månedsperiode.':fmt(Math.abs(s.change))+' km '+(s.change>0?'mere':'mindre')+' end i forrige månedsperiode.';
 renderChart();const history=$('#history');history.replaceChildren();$('#count').textContent=rows.length;
 if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='Her kommer dine aflæsninger, når du har gemt den første.';history.append(p);return;}
 for(const r of periods(rows).reverse()){
  const item=document.createElement('article');item.className='row';item.setAttribute('aria-label',label(r.date));
  item.innerHTML=`<div>${label(r.date)}<div class="sub">${r.distance===null?'Første aflæsning':fmt(r.distance)+' km siden sidst'}${r.previous?'<br>Fra '+label(r.previous.date):''}</div></div><div class="reading">${fmt(r.km)} <small>km</small></div><div class="actions"><button class="edit" aria-label="Ret ${label(r.date)}">Ret</button><button class="delete" aria-label="Slet ${label(r.date)}">Slet</button></div>`;
  item.querySelectorAll('button').forEach(b=>b.disabled=!writable);
  item.querySelector('.edit').addEventListener('click',()=>{reset();editing=r.date.slice(0,7);$('#date').value=r.date;$('#km').value=r.km;$('#form-title').textContent='Ret aflæsning';$('#save').textContent='Gem ændring';$('#cancel').hidden=false;$('.entry').scrollIntoView({block:'start'});$('#km').focus();});
  item.querySelector('.delete').addEventListener('click',()=>{if(confirm('Slet aflæsningen '+label(r.date)+' på '+fmt(r.km)+' km?'))try{persist(rows.filter(x=>x.date!==r.date));reset();notice('Aflæsningen er slettet.');}catch(e){notice(e.message,true);}});history.append(item);
 }
}
$('#cancel').addEventListener('click',reset);
$('#form').addEventListener('submit',e=>{e.preventDefault();$('#form-error').hidden=true;try{
 const row={date:$('#date').value,km:parseKm($('#km').value)},target=row.date.slice(0,7),existing=rows.find(r=>r.date.slice(0,7)===target);
 if(editing&&target!==editing&&existing)throw Error('Der findes allerede en aflæsning i den nye måned. Ret den i historikken i stedet.');
 const next=upsert(rows,row,editing);
 if(existing&&!editing&&!confirm('Der findes allerede en aflæsning i '+month(row.date)+'. Erstat den med '+fmt(row.km)+' km den '+label(row.date)+'?'))return;
 persist(next);reset();notice('Aflæsningen er gemt på denne enhed.');
}catch(e){$('#form-error').textContent=e.message;$('#form-error').hidden=false;$('#form-error').scrollIntoView({block:'nearest'});}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){writable=false;notice('Tallene er ændret i et andet vindue. Genindlæs appen for at fortsætte.',true);render();}});
reset();render();
if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('#offline').textContent='Klar til offline. Du kan åbne appen og gemme aflæsninger uden internet, så længe enheden beholder appfilerne.';}).catch(()=>{$('#offline').textContent='Offline er ikke klar. Genåbn med internet for at prøve igen.';});}else $('#offline').textContent='Offline kræver en HTTPS-adresse (eller localhost ved test).';
