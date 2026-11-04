/* ---------- 도로 계획 종단: 중심선 선형별 측점 → 계획고. 도로 안 높이와 맨홀 지반고에 씀 ----------
   ST.prof = {cf: 횡단경사 %, al: {"2-324": [[측점 m, 계획고], ...], ...}} */
function alKey(layer){const m=String(layer).match(/\(([^()]*\d[^()]*)\)\s*$/);return m?m[1].trim():String(layer).trim();}
function profAligns(ents){ // 중심선 레이어마다 가장 긴 선 = 선형, 측점 글자(NO 0, NO 1 …)로 측점 맞춤
  const by=new Map();
  ents.forEach(e=>{if(!lyIs(e.layer,"cl")||e.type==="LINE"||!e.pts||e.pts.length<2)return;const k=alKey(e.layer);const L=e.pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-e.pts[i][0],p[1]-e.pts[i][1]),0);
    if(!by.has(k)||by.get(k).len<L)by.set(k,{key:k,layer:e.layer,pts:e.pts.map(p=>[p[0],p[1]]),len:L});});
  const proj=(A,pt)=>{let bd=Infinity,bs=0,s=0,off=0;for(let i=1;i<A.pts.length;i++){const a=A.pts[i-1],b=A.pts[i],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy,L=Math.sqrt(L2);let t=L2?((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));
      const x=a[0]+t*dx,y=a[1]+t*dy,d=Math.hypot(pt[0]-x,pt[1]-y);if(d<bd){bd=d;bs=s+t*L;off=d;}s+=L;}return {s:bs,d:off};};
  const chain=+(LN().cond.chain)||20;
  [...by.values()].forEach(A=>{A.proj=pt=>proj(A,pt);
    const anc=ents.filter(e=>(e.type==="TEXT"||e.type==="MTEXT")&&alKey(e.layer)===A.key&&lyIs(e.layer,"cl")).map(e=>{const m=e.text.replace(/\s/g,"").match(/^NO\.?(\d+)$/i);return m?{sta:+m[1]*chain,s:proj(A,[e.x,e.y]).s,d:proj(A,[e.x,e.y]).d}:null;}).filter(a=>a&&a.d<30);
    A.dir=1;A.b=0;A.nAnc=anc.length;
    if(anc.length>=2){let best=null;[1,-1].forEach(dir=>{const b=anc.reduce((t,a)=>t+a.sta-dir*a.s,0)/anc.length,err=anc.reduce((t,a)=>t+Math.abs(a.sta-dir*a.s-b),0)/anc.length;if(!best||err<best.err)best={dir,b,err};});A.dir=best.dir;A.b=best.b;A.err=best.err;}
    A.sta=pt=>{const q=A.proj(pt);return {sta:A.dir*q.s+A.b,d:q.d};};});
  return [...by.values()];
}
function profGet(){ST.prof=ST.prof||{cf:2,al:{}};ST.prof.al=ST.prof.al||{};if(!isFinite(+ST.prof.cf))ST.prof.cf=2;return ST.prof;}
function profZ(rows,sta){if(!rows||!rows.length)return NaN;if(sta<=rows[0][0])return rows[0][1];for(let i=1;i<rows.length;i++)if(sta<=rows[i][0]){const [a,za]=rows[i-1],[b,zb]=rows[i];return b>a?za+(zb-za)*(sta-a)/(b-a):zb;}return rows[rows.length-1][1];}
function roadZf(ents){ // 점 → 계획 도로 높이 (가장 가까운 선형, 횡단경사로 중심선에서 멀수록 낮게)
  const P=profGet(),AL=profAligns(ents).filter(A=>P.al[A.key]&&P.al[A.key].length>=2);if(!AL.length)return null;const cf=(+P.cf||0)/100;
  return pt=>{let best=null;AL.forEach(A=>{const q=A.sta(pt);if(!best||q.d<best.d)best={...q,A};});if(!best||best.d>40)return NaN;return profZ(P.al[best.A.key],best.sta)-cf*best.d;};}
function profParse(txt){ // "선형, 측점, 계획고" 또는 "측점, 계획고" (탭·쉼표·공백)
  const out={};let cur=null;
  String(txt).split(/\r?\n/).forEach(line=>{const c=line.split(/[\t,;]+|\s+/).map(x=>x.trim()).filter(x=>x!=="");if(!c.length)return;
    const nums=c.map(v=>parseFloat(String(v).replace(/^NO\.?\s*/i,""))),isN=c.map(v=>/^[+-]?\d+(\.\d+)?$/.test(v));
    if(c.length>=3&&!isN[0]&&isN[1]&&isN[2]){cur=alKey(c[0].replace(/^소/,""))||c[0];(out[cur]=out[cur]||[]).push([nums[1],nums[2]]);}
    else if(c.length>=2&&isN[0]&&isN[1]&&cur){out[cur].push([nums[0],nums[1]]);}
    else if(c.length===1&&!isN[0]){cur=alKey(c[0]).replace(/^소/,"");out[cur]=out[cur]||[];}});
  Object.keys(out).forEach(k=>{out[k].sort((a,b)=>a[0]-b[0]);if(!out[k].length)delete out[k];});return out;}
function renderProf(){const box=$("profBox");if(!box)return;const P=profGet(),AL=DXF?profAligns(DXF.ents):[];
  const keys=[...new Set([...AL.map(a=>a.key),...Object.keys(P.al)])];
  box.innerHTML=`<div class="toolbar"><label class="f" style="flex-direction:row;align-items:center;gap:6px">횡단경사 <input id="profCf" type="number" step="0.5" value="${+P.cf}" style="width:60px"> %</label>
    <label class="btn small" for="profFile">종단 표 넣기 (CSV · 엑셀)</label><input id="profFile" type="file" accept=".csv,.txt,.xlsx,.xls" hidden>
    <button type="button" class="btn small" id="profPasteBtn">붙여넣기</button></div>
    <textarea id="profPaste" rows="5" placeholder="엑셀에서 복사해 붙여넣기: 선형, 측점(누가거리 m), 계획고&#10;2-324	0	47.35&#10;2-324	20	48.43&#10;…" hidden></textarea>
    ${keys.length?`<table class="mini dxt" style="width:auto;margin-top:6px"><thead><tr><th>선형</th><th>도면 중심선</th><th>측점 맞춤</th><th>종단 점</th><th>측점 범위</th><th></th></tr></thead><tbody>${keys.map(k=>{const A=AL.find(a=>a.key===k),r=P.al[k]||[];
      return `<tr><td><b>${XE(k)}</b></td><td>${A?`${fx(A.len,1)} m`:"<span class=\"warn-t\">없음</span>"}</td><td>${A?(A.nAnc>=2?`측점 글자 ${A.nAnc}개 (오차 ${fx(A.err,2)} m)`:"선 시작점 = 0"):"-"}</td><td class="n">${r.length||"-"}</td><td>${r.length?`${fx(r[0][0],2)} ~ ${fx(r[r.length-1][0],2)} m · ${fx(r[0][1],2)} → ${fx(r[r.length-1][1],2)}`:"-"}</td><td>${r.length?`<button type="button" class="btn small" data-pdel="${XE(k)}">지우기</button>`:""}</td></tr>`;}).join("")}</tbody></table>`:`<p class="note">계획도에서 중심선을 찾으면 선형이 여기에 나옵니다.</p>`}`;}
function profSet(obj,src){const P=profGet();let n=0;Object.entries(obj).forEach(([k,r])=>{P.al[k]=r;n++;});persist();renderProf();BSN.res=null;bsRun();toast(n?`계획 종단 ${n}개 선형을 넣었습니다 (${src}).`:"읽을 수 있는 종단 자료가 없습니다. 선형, 측점, 계획고 순서로 넣으세요.");}
$("profBox").addEventListener("change",e=>{if(e.target.id==="profCf"){profGet().cf=+e.target.value||0;persist();BSN.res=null;bsRun();}
  if(e.target.id==="profFile"){const f=e.target.files[0];e.target.value="";if(!f)return;const fr=new FileReader();
    if(/\.xlsx?$/i.test(f.name)){fr.onload=()=>{try{const wb=XLSX.read(new Uint8Array(fr.result),{type:"array"});const txt=wb.SheetNames.map(n=>XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n");profSet(profParse(txt),f.name);}catch(err){toast("엑셀을 읽지 못했습니다.");}};fr.readAsArrayBuffer(f);}
    else{fr.onload=()=>profSet(profParse(fr.result),f.name);fr.readAsText(f);}}});
$("profBox").addEventListener("click",e=>{if(e.target.id==="profPasteBtn"){const t=$("profPaste");if(t.hidden){t.hidden=false;t.focus();e.target.textContent="붙여넣은 표 넣기";}else{profSet(profParse(t.value),"붙여넣기");}}
  const d=e.target.closest("[data-pdel]");if(d){delete profGet().al[d.dataset.pdel];persist();renderProf();BSN.res=null;bsRun();}});

if(typeof TAB!=="undefined"&&(TAB==="inflow"||TAB==="area"))setTimeout(()=>renderActive(),0);
