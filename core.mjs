export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&Number.isFinite(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function parseKm(s){if(!/^\d{1,7}$/.test(String(s).trim()))throw Error('Skriv kilometertællerens samlede tal uden punktum, komma eller mellemrum.');return Number(String(s).trim());}
export function monthIndex(d){return Number(d.slice(0,4))*12+Number(d.slice(5,7))-1;}
export function validate(rows){
 if(!Array.isArray(rows)||rows.length>2400)throw Error('De gemte data kunne ikke læses.');
 const months=new Set();const sorted=rows.map(r=>{
  if(!r||!validDate(r.date)||r.date>today()||!Number.isInteger(r.km)||r.km<0||r.km>9999999)throw Error('Ugyldig dato eller kilometerstand.');
  const month=r.date.slice(0,7);if(months.has(month))throw Error('Der må kun være én aflæsning pr. måned.');months.add(month);
  return {date:r.date,km:r.km};
 }).sort((a,b)=>a.date.localeCompare(b.date));
 for(let i=1;i<sorted.length;i++)if(sorted[i].km<sorted[i-1].km)throw Error('Kilometerstanden må ikke være lavere end en tidligere aflæsning eller højere end en senere aflæsning. Ret tallene og prøv igen.');
 return sorted;
}
export function periods(rows){return validate(rows).map((r,i,all)=>({...r,previous:all[i-1]??null,distance:i?r.km-all[i-1].km:null,consecutive:i>0&&monthIndex(r.date)-monthIndex(all[i-1].date)===1}));}
export function summary(rows){const p=periods(rows),last=p.at(-1),prior=p.at(-2);return {last,change:last?.consecutive&&prior?.consecutive?last.distance-prior.distance:null};}
export function upsert(rows,row,oldMonth=null){return validate([...rows.filter(r=>r.date.slice(0,7)!==(oldMonth??row.date.slice(0,7))),row]);}
