"use strict";
const $=id=>document.getElementById(id);
const isNum=v=>typeof v==="number"&&isFinite(v);
const fx=(v,n=3)=>isNum(v)?Number(v).toLocaleString("ko-KR",{minimumFractionDigits:n,maximumFractionDigits:n,useGrouping:false}):"-";
const XE=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const OKS=v=>v?"O.K":"N.G";
const DUR=[5,10,15,20,30,40,50,60,90,120,180,240,360,540,720,900,1080,1440,2880,4320];
let toastT=null;
function toast(s){const t=$("toast");t.textContent=s;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);}

/* ---------- 상태 ---------- */
const KEY="usu-calc-v1";
function validProj(p){return p&&Array.isArray(p.lines)&&p.lines.length&&p.lines.every(l=>l&&l.cond&&l.rain&&l.inflow&&Array.isArray(l.pipes));}
function normRain(r){const s=ROAD_RAIN();r={...s,...(r||{})};if(!r.type)r.type="road";
  if(r.type==="wamis"&&Array.isArray(r.tbl)&&r.genFit!==WGEN_H)wamisGen(r);
  if(!Array.isArray(r.rows))r.rows=[];if(!Array.isArray(r.durs))r.durs=[10,20,30,60,120,180];if(!Array.isArray(r.tbl))r.tbl=[];return r;}
function normLine(l){
  const s=SAMPLE_LINE();
  if(l.cond&&!(+l.cond.dMin>0))l.cond.dMin=250;
  if(l.cond&&!(+l.cond.dPlan>0))l.cond.dPlan=450;
  if((l.pipes||[]).some(p=>p.id==null||p.id==="")){const pre=lineCode(l);const used=new Set(l.pipes.map(p=>p.id));l.pipes.forEach((p,i)=>{if(p.id==null||p.id===""){let k=i+1,id;do{id=`${pre}-${pad2(k++)}`;}while(used.has(id));p.id=id;used.add(id);}});}
  (l.pipes||[]).forEach(p=>{if(p.thk==null){const z=parseSize(p.size);p.thk=z&&z.kind==="box"?(+p.slab||0):(+p.wall||0);}delete p.slab;delete p.wall;});
  if(l.cond&&l.cond.cvMin!=null&&l.cond.cvUse==null)l.cond.cvUse=l.cond.cvMin; if(l.cond)delete l.cond.cvMin;
  l.cond={...s.cond,...(l.cond||{})}; delete l.cond.dropMin; delete l.cond.dropMax; delete l.cond.dropSub; l.rain=normRain(l.rain);
  l.inflow={...s.inflow,...(l.inflow||{})}; if(!Array.isArray(l.inflow.kerby)||l.inflow.kerby.length!==6)l.inflow.kerby=s.inflow.kerby;
  if(!Array.isArray(l.cvals)||l.cvals.length!==12)l.cvals=s.cvals.slice();
  if(!l.mig26){ // 엑셀식 → 기준식 전환: Kerby N 표(2025 지침), BOX 수심 90%
    const kb=l.inflow.kerby;if(kb.map(x=>+x.n).join()===KERBY_OLD.join()){const o=kb.map(x=>+x.a||0);l.inflow.kerby=[[0,o[0]],[1,o[1]],[2,o[2]],[3,o[4]],[4,o[3]],[5,o[5]]].map(([i,v])=>({n:KERBY[i][1],a:v}));}
    if(+l.cond.dBox===0.8)l.cond.dBox=0.9; delete l.cond.mode; delete l.cond.share; l.mig26=true;}
  l.inflow.kerby.forEach((k,i)=>{k.n=KERBY[i][1];}); /* N은 규정값 고정 */
  if(!l.nInh){let prevN=null;(l.pipes||[]).forEach((p,i)=>{const v=p.n===""||p.n==null?prevN:+p.n;if(i>0&&prevN!=null&&v===prevN)p.n="";prevN=v;});l.nInh=true;} /* 조도계수: 앞 관로와 같으면 비워서 따라가게 */
  l.pipes.forEach(p=>{if(!Array.isArray(p.areas))p.areas=[];while(p.areas.length<12)p.areas.push(0);});
  return l;
}
let ST=null;
try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(validProj(v))ST=v;}catch(e){}
if(!ST)ST=SAMPLE_PROJ();
ST.proj={...SAMPLE_PROJ().proj,...(ST.proj||{})}; ST.lines.forEach(normLine);
if(!ST.dPlanMig){ST.lines.forEach(l=>{l.cond.dMin=250;l.cond.dPlan=450;});ST.dPlanMig=true;} // 최소관경(규정) 250 · 계획관경(자동) 450
{const mf=Math.max(0,...ST.lines.map(l=>+l.cond.mhFree||0));ST.lines.forEach(l=>{l.cond.mhFree=mf;});} // 여유고 전 노선 공통 (다르면 큰 값)
if(!Array.isArray(ST.rainLib))ST.rainLib=[]; ST.rainLib=ST.rainLib.filter(e=>e.id!=="busan-road2012"); ST.rainLib.forEach(e=>{e.g="user";e.rain=normRain(e.rain);});
if(!ST.mig25){ST.lines.forEach(l=>{if(isRoad(l.rain)&&/도로설계편람/.test(l.rain.src||""))l.rain=normRain(G25_BUSAN());});ST.mig25=true;}
if(!(ST.active>=0&&ST.active<ST.lines.length))ST.active=0;
const LN=()=>ST.lines[ST.active];
let saveWarned=false;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){if(!saveWarned){saveWarned=true;toast("브라우저 자동 저장 공간이 부족합니다. 파일로 내보내 보관하세요.");}}}
const getP=(o,p)=>p.split(".").reduce((a,k)=>a?.[k],o);
const setP=(o,p,v)=>{const ks=p.split(".");const last=ks.pop();ks.reduce((a,k)=>a[k],o)[last]=v;};

let R=null, RALL=[];
function recalc(){ // 인입 관로가 있는 노선은 상류(지류) 노선을 먼저 계산
  const n=ST.lines.length,idx=new Map(),res=new Array(n),st=new Array(n).fill(0);
  ST.lines.forEach((l,li)=>l.pipes.forEach((p,ri)=>{const k=String(p.id??"").trim();if(k&&!idx.has(k))idx.set(k,{li,ri});}));
  const deps=li=>{const s=new Set();ST.lines[li].pipes.forEach(p=>(p.inl||[]).forEach(id=>{const o=idx.get(String(id??"").trim());if(o&&o.li!==li)s.add(o.li);}));return [...s];};
  const run=li=>{if(st[li])return;st[li]=1;deps(li).forEach(run);
    res[li]=compute(ST.lines[li],id=>{const o=idx.get(id);if(!o)return {err:"없는 관로 번호"};if(o.li===li)return {err:"같은 노선 관로는 이미 상류로 합산됩니다"};
      const r2=res[o.li];if(!r2)return {err:"노선끼리 서로 인입되어 순환합니다"};const r=r2.rows[o.ri];return {CA:r.CA,A:r.Acum,t:r.t,Qd:r.Qd,line:ST.lines[o.li].name,size:r.size,inv2:r.inv2,gl2:r.gl2,nrow:r.nrow};});st[li]=2;};
  for(let i=0;i<n;i++)run(i); RALL=res; R=RALL[ST.active];}

/* ---------- 좌측 입력 ---------- */
function fillRpSelect(){
  const l=LN(), sel=$("cT"), rps=rainRps(l.rain); sel.innerHTML=rps.map(t=>`<option value="${t}">${t}년</option>`).join("");
  if(!rps.includes(+l.cond.T)){sel.insertAdjacentHTML("beforeend",`<option value="${l.cond.T}">${l.cond.T}년</option>`);}
  sel.value=String(l.cond.T);
}
function fillForm(){
  const l=LN();
  document.querySelectorAll("[data-k]").forEach(el=>{const v=getP(l,el.dataset.k);if(el.type==="checkbox")el.checked=!!v;else if(el.id!=="cT")el.value=v??"";});
  document.querySelectorAll("[data-g]").forEach(el=>{el.value=getP(ST,el.dataset.g)??"";});
  fillRpSelect();
  renderRainEd(); renderLib();
  $("kerbyTbl").innerHTML=KERBY.map(([lab],i)=>`<tr><td class="l">${lab}</td><td><input type="text" value="${KERBY[i][1].toFixed(2)}" readonly tabindex="-1" class="fixed" title="Kerby 지체계수 N 규정값 (수정 불가)" aria-label="${lab} n"></td><td><input type="number" step="0.01" data-ky="${i}.a" value="${l.inflow.kerby[i].a}" aria-label="${lab} 면적"></td></tr>`).join("");
  $("lName").value=l.name;
}
$("frm").addEventListener("input",e=>{
  const el=e.target,l=LN();
  if(el.dataset.k){let v=el.type==="checkbox"?el.checked:el.type==="number"?parseFloat(el.value):el.value;
    if(el.type==="number"&&!isFinite(v))return; if(el.id==="cT")v=+v; setP(l,el.dataset.k,v);
    if(["cond.mhFree","cond.dMin","cond.dPlan"].includes(el.dataset.k)){const kk=el.dataset.k.slice(5);ST.lines.forEach(x=>{x.cond[kk]=kk==="mhFree"?v:+v;});}} /* 맨홀 여유고·최소관경은 전 노선 공통 */
  else if(el.dataset.g) setP(ST,el.dataset.g,el.value);
  else if(el.dataset.kk){const [s,c]=el.dataset.kk.split(".");const v=parseFloat(el.value);if(!isFinite(v))return;l.rain[s][c]=v;}
  else if(el.dataset.ky){const [i,c]=el.dataset.ky.split(".");const v=parseFloat(el.value);l.inflow.kerby[+i][c]=isFinite(v)?v:0;}
  else if(el.id==="kRps"){const a=el.value.split(/[,\s]+/).map(Number).filter(v=>v>0);if(a.length){l.rain.rps=[...new Set(a)].sort((x,y)=>x-y);fixT();fillRpSelect();}}
  else if(el.id==="kType"&&el.value==="wamis"){if(l.rain.type!=="wamis"){l.rain=normRain(wamisRain(23021159));renderLib();}renderRainEd();fixT();fillRpSelect();}
  else if(el.id==="kWSub"){l.rain.sub=el.value;}
  else if(el.id==="kWRef"){const r=g25Ref(+el.value);if(r)l.rain.ref=r;renderRainEd();}
  else if(el.id==="kType"){if(l.rain.type==="wamis"){l.rain.src="";$("kSrc").value="";}l.rain.type=el.value;if(el.value!=="road"&&/도로설계편람/.test(l.rain.src||"")){l.rain.src="";$("kSrc").value="";}seedRain(l.rain);renderRainEd();fixT();fillRpSelect();}
  else if(el.dataset.kr){const [i,f]=el.dataset.kr.split(".");const v=parseFloat(el.value);l.rain.rows[+i][f]=isFinite(v)?v:"";if(f==="T"){fixT();fillRpSelect();}}
  else if(el.dataset.kt){const [i,j]=el.dataset.kt.split(".");const v=parseFloat(el.value);if(j==="T"){l.rain.tbl[+i].T=isFinite(v)?v:"";fixT();fillRpSelect();}else l.rain.tbl[+i].v[+j]=isFinite(v)?v:"";}
  else if(el.id==="kDurs"){const d=el.value.split(/[,\s]+/).map(Number).filter(v=>v>0);if(d.length){l.rain.durs=d;l.rain.tbl.forEach(r=>{r.v=d.map((_,j)=>r.v[j]??"");});}}
  else if(el.id==="kPaste"||el.id==="kLib")return;
  update();
});

/* ---------- 노선 탭 ---------- */
function renderLineTabs(){
  $("ltabs").innerHTML=ST.lines.map((l,i)=>`<button type="button" class="ltab" role="tab" aria-selected="${i===ST.active}" data-i="${i}"><span class="dot ${RALL[i]?.allOk?"ok":"bad"}"></span><span class="nm">${XE(l.name||"노선 "+(i+1))}</span></button>`).join("");
}
$("ltabs").addEventListener("click",e=>{const b=e.target.closest(".ltab");if(!b)return;ST.active=+b.dataset.i;full();});
$("lName").addEventListener("input",e=>{LN().name=e.target.value;persist();renderLineTabs();renderAll();});
$("lDup").addEventListener("click",()=>{const c=normLine(JSON.parse(JSON.stringify(LN())));c.name=(c.name||"노선")+" 복사";ST.lines.splice(ST.active+1,0,c);ST.active++;
  {const base=lineCode(ST.lines[ST.active-1]),all=new Set(ST.lines.flatMap(x=>x===c?[]:x.pipes.map(p=>String(p.id))));let k=2,pre;do{pre=`${base}-${k++}`;}while([...all].some(id=>id.startsWith(pre+"-")));c.code=pre;renumber(c,pre);}
  full();toast(`복사한 노선의 관로 번호를 ${c.code}-01부터 새로 매겼습니다.`);});
$("lNew").addEventListener("click",()=>{const c=SAMPLE_LINE();{const cur=ST.lines[ST.active];if(cur){c.cond=JSON.parse(JSON.stringify(cur.cond));c.rain=JSON.parse(JSON.stringify(cur.rain));}} /* 새 노선은 지금 노선의 설계조건·강우강도식을 그대로 */c.name="새 노선";c.pipes=[{sta1:"0+0",sta2:"1+0",dir:"좌",gl1:10,gl2:9.8,cv1:+(ST.lines[ST.active]?.cond?.cvUse)||1,cv2:+(ST.lines[ST.active]?.cond?.cvUse)||1,size:"300",thk:0,len:20,nrow:1,n:0.013,areas:Array(12).fill(0)}];c.pipes[0].areas[5]=0.1;c.inflow={...c.inflow,A:0.1,kerby:c.inflow.kerby.map((k,i)=>({n:k.n,a:i===2?0.1:0}))};c.img=null;ST.lines.push(c);ST.active=ST.lines.length-1;c.pipes[0].id=nextId(c);full();});
let delArm=false,delT=null;
$("lDel").addEventListener("click",()=>{
  if(ST.lines.length<2){toast("노선이 하나뿐이라 지울 수 없습니다.");return;}
  if(!delArm){delArm=true;$("lDel").textContent="한 번 더 누르면 삭제";$("lDelAsk").textContent=`"${LN().name}"을 지웁니다.`;clearTimeout(delT);delT=setTimeout(()=>{delArm=false;$("lDel").textContent="삭제";$("lDelAsk").textContent="";},4000);return;}
  delArm=false;$("lDel").textContent="삭제";$("lDelAsk").textContent="";ST.lines.splice(ST.active,1);ST.active=Math.max(0,ST.active-1);full();});

/* ---------- 관로 입력표 ---------- */
const PF=[["sta1","도로 측점","시점","text","w-sta"],["sta2","","종점","text","w-sta"],["gl1","지반고 (m)","시점","number","w-gl rgt"],["gl2","","종점","number","w-gl rgt"],
  ["cv1","토피 (m)","시점","number","w-m rgt"],["cv2","","종점","number","w-m rgt"],["size","규격","(mm)","text","w-l ctr"],["thk","두께","(mm)","number","w-xs ctr"],["len","연장","(m)","number","w-s rgt"],["nrow","련수","","number","w-xxs"],["n","조도계수","n","number","w-s ctr"]];
function renderPipeTbl(){
  const l=LN();
  let h=`<thead><tr><th rowspan="2">판정</th><th rowspan="2">관로<br>번호</th>`;
  for(let j=0;j<PF.length;j++){const f=PF[j];if(f[1]===""&&j>0)continue;const span=(PF[j+1]&&PF[j+1][1]==="")?2:1;h+=`<th colspan="${span}"${span===1&&!f[2]?' rowspan="2"':""}>${f[1]}</th>`;}
  h+=`<th>유출계수</th><th colspan="2">관저고 (m)</th><th rowspan="2" class="nw" title="비우면 토피로 계산. 넣으면 종점 관저고가 이 값 이상이 되도록 함 (토피로 낸 관저고가 더 낮을 때만 이 값으로 올림 · 자동 작성도 지킴)">종점<br>관저고<br>지정 (이상)</th><th rowspan="2" class="nw">시점<br>단차<br>(m)</th><th rowspan="2" class="nw">기타</th><th rowspan="2" class="nw">경사<br>(%)</th><th rowspan="2" class="nw">유속<br>(m/s)</th><th rowspan="2" class="nw" title="계획우수량 ÷ 통수능 × 100 (100% 넘으면 N.G)">통수량<br>(%)</th><th rowspan="2">인입 관로</th><th rowspan="2">편집</th></tr><tr>`;
  for(const f of PF){if(f[2])h+=`<th>${f[2]}</th>`;}
  h+=`<th>C</th><th>시점</th><th>종점</th></tr></thead><tbody>`;
  l.pipes.forEach((p,i)=>{
    h+=`<tr data-r="${i}"><td class="st" id="st_${i}"></td><td><input data-f="id" class="w-id" type="text" value="${XE(p.id??"")}" aria-label="${i+1}번째 관로 번호"></td>`;
    for(const [k,,,t,c] of PF){
      if(t==="dir") h+=`<td><select data-f="dir" aria-label="${i+1}번 방향">${["좌","중","우",""].map(o=>`<option${p.dir===o?" selected":""}>${o}</option>`).join("")}</select></td>`;
      else h+=`<td><input data-f="${k}" class="${c}" type="${t==="number"?"number":"text"}" step="any" value="${XE(["len","cv1","cv2","gl1","gl2","inv2fix"].includes(k)&&p[k]!==""&&p[k]!=null&&isFinite(+p[k])?(+p[k]).toFixed(2):(p[k]??""))}" aria-label="${i+1}번 ${k}"></td>`;
    }
    h+=`<td class="calc ctr cc" id="cC_${i}" title="유역면적 입력 탭의 가중 유출계수"></td><td class="calc invc" id="inv1_${i}"></td><td class="calc invc" id="inv2_${i}"></td><td><input data-f="inv2fix" class="w-gl rgt" type="number" step="any" value="${XE(p.inv2fix!==""&&p.inv2fix!=null&&isFinite(+p.inv2fix)?(+p.inv2fix).toFixed(2):"")}" placeholder="-" title="종점 관저고가 이 값 이상이 되도록 (최소값)" aria-label="${i+1}번 종점 관저고 지정 (최소)"></td><td class="calc" id="drop_${i}"></td><td class="calc ctr" id="sub_${i}"></td><td class="calc" id="slp_${i}"></td><td class="calc" id="vel_${i}"></td><td class="calc" id="qc_${i}"></td><td class="inl" data-inl="${i}">${inlCell(p)}<div class="outl" id="outl_${i}"></div></td>
      <td style="white-space:nowrap"><button type="button" class="rowbtn auto" data-a="auto" title="이 관로 관경·관저고 자동 계획" aria-label="${i+1}번 관저고 자동">자동</button> <button type="button" class="rowbtn" data-a="ins" title="아래에 관로 넣기" aria-label="${i+1}번 아래에 넣기">＋</button> <button type="button" class="rowbtn" data-a="up" title="위로" aria-label="${i+1}번 위로">↑</button> <button type="button" class="rowbtn" data-a="del" title="이 관로 지우기" aria-label="${i+1}번 지우기">✕</button></td></tr>`;
  });
  $("pipeTbl").innerHTML=h+"</tbody>";
  updatePipeCalc();
}
function pipeSumRows(rows){ // 규격별 연장 합 (원형관 관경 순, BOX 단면 순)
  const m=new Map();rows.forEach(r=>{const k=r.size?r.size.label:"규격 미상";const o=m.get(k)||{k,s:r.size,n:0,len:0,plen:0};o.n++;o.len+=r.len;o.plen+=r.len*r.nrow;m.set(k,o);});
  const key=o=>!o.s?[2,0]:o.s.kind==="box"?[1,o.s.B*o.s.H]:[0,o.s.D];
  return [...m.values()].sort((a,b)=>{const x=key(a),y=key(b);return x[0]-y[0]||x[1]-y[1];});
}
function renderPipeSum(){
  const rows=R.rows,L=pipeSumRows(rows),multi=rows.some(r=>r.nrow>1),tot=rows.reduce((s,r)=>s+r.len,0),ptot=rows.reduce((s,r)=>s+r.len*r.nrow,0);
  $("pipeSum").innerHTML=`<h4 style="margin:0 0 6px">규격별 연장</h4><table class="t"><thead><tr><th>규격</th><th>구간 수</th><th>연장 (m)</th>${multi?"<th>관 길이 (m, 련수 반영)</th>":""}</tr></thead><tbody>
    ${L.map(o=>`<tr><td>${XE(o.k)}</td><td class="n">${o.n}</td><td class="n">${fx(o.len,2)}</td>${multi?`<td class="n">${fx(o.plen,2)}</td>`:""}</tr>`).join("")}
    <tr class="tot"><td>총연장</td><td class="n">${rows.length}</td><td class="n">${fx(tot,2)}</td>${multi?`<td class="n">${fx(ptot,2)}</td>`:""}</tr></tbody></table>`;
}
function inlCell(p){const a=(p.inl||[]).filter(v=>String(v??"").trim()!=="");return [...a,""].map((v,k)=>`<input data-f="inl" data-k="${k}" class="w-id" type="text" value="${XE(v)}" placeholder="+" title="이 관로 시점으로 들어오는 다른 노선 관로 번호" aria-label="인입 관로 ${k+1}">`).join("");}
function updatePipeCalc(){
  renderPipeSum();
  R.rows.forEach((r,i)=>{
    const c=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
    {const st=$("st_"+i);if(st){const why=[];if(!r.size)why.push("규격 확인");else{if(!r.okQ)why.push(`통수능 ${fx(r.Qc,3)} < Qd ${fx(r.Qd,3)} m³/s`);if(!r.okV)why.push(`유속 ${fx(r.V,2)} m/s (${R.c.vmin}~${R.c.vmax})`);if(r.okJ===false)why.push(...r.jWhy);}
      const ok=!why.length;st.innerHTML=`<span class="chip ${ok?"ok":"bad"}" style="margin:0">${ok?"O.K":"N.G"}</span>`;st.title=ok?`통수능 ${fx(r.Qc,3)} ≥ Qd ${fx(r.Qd,3)} m³/s, 유속 ${fx(r.V,2)} m/s`:why.join(" / ");}}
    {const ol=$("outl_"+i);if(ol){const to=[];RALL.forEach(R2=>R2&&R2.rows.forEach(t=>(t.inl||[]).forEach(q=>{if(!q.err&&q.id===r.no)to.push(t);})));
      ol.innerHTML=to.map(t=>`<span title="이 관로가 ${XE(t.no)} 시점 맨홀로 들어갑니다 (그 관로 시점 관저고)">${XE(t.no)}<br>${fx(t.inv1,2)}</span>`).join("");ol.hidden=!to.length;}}
    c("cC_"+i,r.A>0?fx(r.C,3):"-"); c("inv1_"+i,fx(r.inv1,2));c("inv2_"+i,fx(r.inv2,2));c("slp_"+i,isNum(r.slope)?fx(r.slope*100,3):"-");
    const tr=document.querySelector(`#pipeTbl tr[data-r="${i}"]`); if(!tr)return;
    const prev=R.rows[i-1];
    const g=tr.querySelector('[data-f="gl1"]'); if(g) g.placeholder=prev?fx(prev.gl2,2):"";
    const cv=tr.querySelector('[data-f="cv1"]'); if(cv) cv.placeholder=prev&&r.cvAuto&&isNum(r.cv1)?fx(r.cv1,2):(prev?"자동":"");
    {const ne=tr.querySelector('[data-f="n"]');if(ne){ne.placeholder=fx(r.n,3);ne.title=r.nAuto?`비어 있음: 앞 관로 조도계수 ${fx(r.n,3)}를 따라감 (값을 넣으면 이 관부터 아래 관로가 그 값을 따라감)`:"";}}
    {const e2=tr.querySelector('[data-f="cv2"]');if(e2){if(r.inv2Fixed){e2.readOnly=true;e2.classList.add("fixedcv");e2.title="종점 관저고가 지정값(최소)보다 낮아 지정값으로 올려 계산한 토피";if(document.activeElement!==e2)e2.value=fx(r.cv2,2);}else if(e2.readOnly){e2.readOnly=false;e2.classList.remove("fixedcv");e2.value=isFinite(+LN().pipes[i].cv2)?(+LN().pipes[i].cv2).toFixed(2):"";}}}
    ["cv1","cv2"].forEach(f=>{const e=tr.querySelector(`[data-f="${f}"]`);if(!e)return;const v=r[f];e.classList.remove("cvbad","cvwarn");
      if(isNum(v)&&v<CVABS-1e-9){e.classList.add("cvbad");e.title=`토피 ${fx(v,2)} m < ${CVABS} m (부산시 지침서 불가피 시 최소값)`;}
      else if(isNum(v)&&v<CVMIN-1e-9&&r.prot){e.classList.add("cvwarn");e.title=`토피 ${fx(v,2)} m < ${CVMIN} m (KDS 61 40 00 3.2 원칙) · 관 보호공 검토`;}else e.title="";});
    c("vel_"+i,r.size&&isNum(r.V)?fx(r.V,2):"-");{const ve=$("vel_"+i);if(ve){const bad=r.size&&!r.okV;ve.style.color=bad?"var(--bad)":"";ve.style.fontWeight=bad?"600":"";ve.title=r.size?`계획우수량이 흐를 때 유속 (허용 ${R.c.vmin}~${R.c.vmax} m/s)${r.sur?" · 만관":""}`:"";}}
    c("qc_"+i,r.size&&isNum(r.use)?fx(r.use*100,1):"-");{const qe=$("qc_"+i);if(qe){const bad=r.size&&!r.okQ;qe.style.color=bad?"var(--bad)":"";qe.style.fontWeight=bad?"600":"";qe.title=r.size?`통수능 Qc ${fx(r.Qc,3)} ${r.okQ?"≥":"<"} 계획우수량 Qd ${fx(r.Qd,3)} m³/s (사용률 ${fx(r.use*100,1)}%)`:"";}}
    c("drop_"+i,isNum(r.drop)?fx(r.drop,2):"-");
    {const W=r.jWhy||[],mark=(el,bad,tip)=>{if(!el)return;el.style.color=bad?"var(--bad)":"";el.style.fontWeight=bad?"600":"";if(tip!=null)el.title=bad?tip:"";}; // N.G 원인 칸은 빨간 글씨
      mark($("drop_"+i),W.some(w=>/단차|역단차/.test(w)&&!/^인입/.test(w)),W.filter(w=>/단차/.test(w)).join(" / "));
      mark($("slp_"+i),isNum(r.slope)&&r.slope<=0,"역경사 · 경사 0");
      mark($("inv1_"+i),W.some(w=>/역단차/.test(w)),W.filter(w=>/역단차/.test(w)).join(" / "));
      const sz=tr.querySelector('[data-f="size"]');if(sz){const b=W.some(w=>/관경/.test(w));sz.style.color=b?"var(--bad)":"";sz.style.fontWeight=b?"600":"";sz.title=b?W.filter(w=>/관경/.test(w)).join(" / "):"";}
      tr.querySelectorAll('[data-f="inl"]').forEach(inp=>{const v=inp.value.trim();if(!v)return;const b=W.some(w=>w.startsWith("인입 "+v));if(b){inp.style.color="var(--bad)";inp.style.fontWeight="600";inp.title=W.filter(w=>w.startsWith("인입 "+v)).join(" / ");}else{inp.style.color="";inp.style.fontWeight="";}});}
    {const sb=$("sub_"+i);if(sb){const tags=[],tips=[];
      if(isNum(r.drop)&&r.drop>=DROP.sub-1e-9){tags.push(`<span class="chip ${r.drop>DROP.max+1e-6?"bad":"warn"}" style="margin:0">부관</span>`);tips.push(`단차 ${fx(r.drop,2)} m ≥ ${DROP.sub} m: 부관 설치 (KDS 61 40 00 5.1, 부산시 지침서)${r.drop>DROP.max+1e-6?` · 최대 단차 ${DROP.max} m 초과`:""}`);}
      const mc=Math.min(r.cv1,r.cv2);if(isNum(mc)&&mc<CVMIN-1e-9&&(r.prot||mc<CVABS-1e-9)){tags.push(`<span class="chip ${mc<CVABS-1e-9?"bad":"warn"}" style="margin:0">${r.prot?"보호공":"토피 부족"}</span>`);tips.push(`토피 ${fx(mc,2)} m < ${r.prot?CVMIN:CVABS} m: ${r.prot?"관 보호공":"BOX는 보호공 없음 · 토피 확보 필요"} (KDS 61 40 00 3.2, 부산시 지침서${mc<CVABS-1e-9?` · ${CVABS} m 미만`:""})`);}
      if(r.dSmall){const dm=+R.c.dMin||250;tags.push(`<span class="chip warn" style="margin:0">관경 부족</span>`);tips.push(`최소관경 부족: D${Math.round(r.size.D*1000)} < ${dm} mm (판정에는 넣지 않음)`);}
      sb.innerHTML=tags.length?tags.join(" "):"-";sb.title=tips.join("\n");}}
    const s=tr.querySelector('[data-f="sta1"]'); if(s) s.placeholder=prev?String(prev.sta2??""):"";
    const sz=tr.querySelector('[data-f="size"]'); if(sz) sz.style.outline=r.size?"":"2px solid var(--bad)";
    tr.querySelectorAll('[data-f="inl"]').forEach(inp=>{const v=inp.value.trim(),o=(r.inl||[]).find(q=>q.id===v);
      inp.style.outline=v&&o&&o.err?"2px solid var(--bad)":"";inp.title=!v?"이 관로 시점으로 들어오는 다른 노선 관로 번호":o&&o.err?o.err:o?`${o.line} · ΣC·A ${fx(o.CA,4)} ha · t ${fx(o.t,2)}분 · Qd ${fx(o.Qd,3)} m³/s`:"";});
    const th=tr.querySelector('[data-f="thk"]'); if(th){const bx=r.size&&r.size.kind==="box";th.placeholder=bx?"슬라브":"관";th.title=bx?"BOX 상부 슬라브 두께 T (mm) — 관저고 = 지반고 − 토피 − H − T":"관 두께 t (mm) — 관저고 = 지반고 − 토피 − D − t";}
  });
}
/* 자동값 칸(시점 측점·지반고·토피): 누르면 자동값을 채워 고칠 수 있게, 안 고치고 나가면 다시 자동 */
const AUTOF=["sta1","gl1","cv1","n"];
$("pipeTbl").addEventListener("focusin",e=>{const el=e.target;if(!AUTOF.includes(el.dataset.f)||el.value!==""||!el.placeholder||el.placeholder==="자동")return;
  el.value=el.placeholder;el.dataset.auto="1";setTimeout(()=>{try{el.select();}catch(err){}},0);});
$("pipeTbl").addEventListener("change",e=>{if(["len","cv1","cv2","gl1","gl2","inv2fix"].includes(e.target.dataset.f)&&e.target.value!==""&&isFinite(+e.target.value))e.target.value=(+e.target.value).toFixed(2);});
$("pipeTbl").addEventListener("change",e=>{const el=e.target;if(el.dataset.f!=="inl"||el.value.trim()!=="")return;const tr=el.closest("tr[data-r]"),p=LN().pipes[+tr.dataset.r];
  p.inl=(p.inl||[]).map(v=>String(v??"").trim()).filter(Boolean);const cell=el.closest("td");cell.innerHTML=inlCell(p)+`<div class="outl" id="outl_${tr.dataset.r}"></div>`;updatePipeCalc();});
$("pipeTbl").addEventListener("focusout",e=>{const el=e.target;if(el.dataset.auto==="1"){delete el.dataset.auto;el.value="";}});
$("pipeTbl").addEventListener("input",e=>{if(e.target.dataset)delete e.target.dataset.auto;},true);
$("pipeTbl").addEventListener("input",e=>{
  const el=e.target,tr=el.closest("tr[data-r]");if(!tr||!el.dataset.f)return;
  const p=LN().pipes[+tr.dataset.r],f=el.dataset.f;
  if(f==="inl"){const k=+el.dataset.k,cell=el.closest("td");p.inl=(p.inl||[]).slice();while(p.inl.length<k)p.inl.push("");p.inl[k]=el.value.trim();
    const ins=cell.querySelectorAll('[data-f="inl"]');if(el.value.trim()!==""&&ins[ins.length-1]===el){const n=document.createElement("input");n.dataset.f="inl";n.dataset.k=String(k+1);n.className="w-id";n.type="text";n.placeholder="+";n.setAttribute("aria-label",`인입 관로 ${k+2}`);cell.appendChild(n);}
    update({keepPipe:true});return;}
  if(["sta1","sta2","size","dir","id"].includes(f))p[f]=f==="id"?el.value.trim():el.value;
  else if(el.value===""&&(f==="gl1"||f==="inv2fix"||((f==="cv1"||f==="n")&&+tr.dataset.r>0)))p[f]="";
  else{const v=parseFloat(el.value);if(!isFinite(v))return;p[f]=v;}
  update({keepPipe:true});
});
$("pipeTbl").addEventListener("click",e=>{
  const b=e.target.closest(".rowbtn");if(!b)return;const i=+b.closest("tr").dataset.r,ps=LN().pipes;
  if(b.dataset.a==="del"){if(ps.length<2){toast("관로가 하나뿐이라 지울 수 없습니다.");return;}ps.splice(i,1);}
  else if(b.dataset.a==="up"){if(i===0)return;[ps[i-1],ps[i]]=[ps[i],ps[i-1]];}
  else if(b.dataset.a==="auto"){autoSnap();const m=autoPipe(i);recalc();autoPipe(i);update();toast(m.msg);return;}
  else if(b.dataset.a==="ins"){const np=newPipe(ps[i]);np.id=insId(LN(),ps[i].id);ps.splice(i+1,0,np);}
  update();
});
function lineCode(l){if(l.code)return l.code;const m=String(l.name||"").match(/\d+(?:-\d+)*/);return m?m[0]:String(Math.max(1,(ST&&ST.lines?ST.lines.indexOf(l):0)+1));}
function pad2(n){return String(n).padStart(2,"0");}
function idSeq(id,pre){const m=String(id||"").match(/^(.*)-(\d+)([a-z]*)$/);return m&&m[1]===pre?+m[2]:null;}
function nextId(l){const pre=lineCode(l);let mx=0;l.pipes.forEach(p=>{const q=idSeq(p.id,pre);if(q!=null)mx=Math.max(mx,q);});return `${pre}-${pad2(mx+1)}`;}
function insId(l,prevId){const base=String(prevId||"").replace(/[a-z]+$/,"");if(!base)return nextId(l);const used=new Set(ST.lines.flatMap(x=>x.pipes.map(p=>p.id)));
  for(const ch of "abcdefghijklmnopqrstuvwxyz")if(!used.has(base+ch))return base+ch;return nextId(l);}
function renumber(l,pre){pre=pre||lineCode(l);l.pipes.forEach((p,i)=>p.id=`${pre}-${pad2(i+1)}`);}
function dupIds(){const m=new Map();ST.lines.forEach(l=>l.pipes.forEach(p=>{const k=String(p.id??"").trim();if(k)m.set(k,(m.get(k)||0)+1);}));return [...m].filter(([,n])=>n>1).map(([k])=>k);}
/* ---------- 관저고 자동 작성 ----------
   종점 토피 = 적용 토피, 시점 = 상류관 관저고 − 적용 단차(첫 관로는 적용 토피).
   경사가 유속 상한을 넘으면 시점 맨홀 단차를 키워 경사를 줄이고, 유속 하한·통수능에 모자라면 종점을 더 낮춘다. */
function slopeForV(r,q,vt){let lo=1e-6,hi=0.6;if(flowDepth(r.size,r.n,hi,q).V<vt)return hi;for(let k=0;k<60;k++){const m=Math.sqrt(lo*hi);if(flowDepth(r.size,r.n,m,q).V<vt)lo=m;else hi=m;}return Math.sqrt(lo*hi);}
const PIPE_D=[250,300,350,400,450,500,600,700,800,900,1000,1100,1200,1350,1500,1650,1800,2000,2200,2400];
function planPipe(i){ // 지금 규격으로 관저고 계획
  const r=R.rows[i],pv=R.rows[i-1],c=R.c;
  const cvu=+c.cvUse>0?+c.cvUse:1, du=isFinite(+c.dropUse)?+c.dropUse:0.05, h=r.hStruct, q=(r.Qd||0)/r.nrow;
  const sCap=r.Qd>0?Math.pow(r.Qd/(r.Aw*r.R23/r.n*r.nrow),2):0;
  const sVmin=q>0?slopeForV(r,q,c.vmin):0, sVmax=q>0?slopeForV(r,q,c.vmax):0.6;
  const sLo=Math.max(sCap,sVmin)*1.02, sHi=sVmax*0.98, small=sLo>sHi;
  const auto1=!!(pv&&pv.size);
  let inv1max=auto1?pv.inv2-du-Math.max(0,r.hIn-pv.hIn):r.gl1-cvu-h;
  (r.inl||[]).filter(q=>!q.err&&q.size&&isFinite(q.inv2)).forEach(q=>{const qh=q.size.kind==="box"?q.size.H:q.size.D;inv1max=Math.min(inv1max,q.inv2-du-Math.max(0,r.hIn-qh));}); // 인입관보다 낮게
  const am=AUTOMIN.li===ST.active?AUTOMIN.m.get(i):undefined,xm=XMIN.m.get(String(r.no)),mn=Math.max(isFinite(r.inv2Min)?r.inv2Min:-Infinity,isFinite(am)?am:-Infinity,isFinite(xm)?xm:-Infinity),base=r.gl2-cvu-h;let fixed=base<mn-1e-9; /* 종점 관저고 지정 = 이 값 이상 */
  const plan=(fx0)=>{const inv2t=fx0?mn:base;
  let inv1=inv1max,inv2=inv2t,drop=false;const sNat=(inv1-inv2)/r.len;
  if(fx0){ // 종점 고정: 시점만 조정 (경사가 급하면 시점 단차 확대)
    let raise=null,xr=[];
    if(!small&&sNat>sHi){inv1=inv2+sHi*r.len;drop=auto1;} else if(small&&sNat>sLo){inv1=inv2+sLo*r.len;drop=auto1;}
    else if(sNat<sLo-1e-9){inv1=inv2+sLo*r.len;if(auto1)raise=inv1+du+Math.max(0,r.hIn-pv.hIn); /* 종점을 못 내리면 시점을 올림 (토피 부족은 감수) → 상류 관로 종점도 올려야 함 */
      xr=(r.inl||[]).filter(q=>!q.err&&q.size&&isFinite(q.inv2)).map(q=>{const qh=q.size.kind==="box"?q.size.H:q.size.D;return {id:String(q.id),v:inv1+du+Math.max(0,r.hIn-qh)};});} /* 인입 노선 끝도 올려야 함 */
    return {r,h,cvu,auto1,inv1,inv2,drop,small,fixed:true,raise,xr,sLo,sHi,mn};}
  if(small){inv2=Math.min(inv2t,inv1-sLo*r.len);if((inv1-inv2t)/r.len>sLo){inv2=inv2t;inv1=inv2+sLo*r.len;drop=auto1;}}
  else if(sNat>sHi){inv1=inv2+sHi*r.len;drop=auto1;}
  else if(sNat<sLo){inv2=inv1-sLo*r.len;}
  return {r,h,cvu,auto1,inv1,inv2,drop,small,sLo,sHi,mn};};
  let P=plan(fixed);if(!fixed&&P.inv2<mn-1e-9)P=plan(true); /* 경사를 맞추다 지정값보다 내려가면 지정값에 맞춤 */
  return P;
}
function applyPlan(p,P){const r2=v=>Math.round(v*100)/100,r=P.r;
  if(P.fixed){p.cv1=(P.auto1&&!P.drop)?"":Math.floor((r.gl1-P.inv1-P.h)*100+1e-6)/100;p.cv2=Math.floor((r.gl2-P.inv2-P.h)*100+1e-6)/100;} /* 관저고가 목표 이상이 되게 토피는 내림 */
  else{p.cv1=(P.auto1&&!P.drop)?"":(P.drop?Math.ceil((r.gl1-P.inv1-P.h)*100-1e-6)/100:r2(r.gl1-P.inv1-P.h)); /* 단차를 둘 때 시점 토피는 올림 (경사가 유속 한계를 넘지 않게) */
    p.cv2=Math.max(P.cvu,r2(r.gl2-P.inv2-P.h));}
  // 토피를 0.01 m로 끊을 때 경사가 통수능·유속 범위를 벗어나지 않게 (짧은 관로는 1 cm에도 경사가 크게 바뀜): 시점·종점 토피를 1 cm씩 바꿔 가장 가까운 조합
  const i1Of=c=>c===""?P.inv1:r.gl1-c-P.h,i2Of=c=>r.gl2-c-P.h,lo=(P.sLo||0)/1.02-1e-9,hi=P.small||!P.sHi?Infinity:P.sHi/0.98+1e-9,mn=isFinite(P.mn)?P.mn-1e-6:-Infinity;
  const good=(c1,c2)=>{const v=(i1Of(c1)-i2Of(c2))/r.len;return v>=lo&&v<=hi&&i2Of(c2)>=mn;};
  if(good(p.cv1,p.cv2))return;
  const b1=p.cv1,b2=p.cv2,base1=b1===""?Math.ceil((r.gl1-P.inv1-P.h)*100-1e-6)/100:b1,c1s=[b1];
  for(let k=1;k<=10;k++){if(P.auto1)c1s.push(r2(base1+0.01*(k-1)));else c1s.push(r2(base1-0.01*k),r2(base1+0.01*k));} /* 이어받는 관은 시점을 올릴 수 없음 (역단차) */
  let best=null;c1s.forEach((c1,i)=>{for(let k=-10;k<=10;k++){const c2=r2(b2+0.01*k);if(!good(c1,c2))continue;const sc=i*1.0+Math.abs(k)+(c2<P.cvu-1e-9&&!P.fixed?50:0);if(!best||sc<best.sc)best={c1,c2,sc};}});
  if(best){p.cv1=best.c1;p.cv2=best.c2;}}
/* 단차가 최대(1.5 m)를 넘는 맨홀: 넘는 만큼 위쪽 관로를 통째로 내려(경사 그대로) 위 맨홀들 단차로 나눠 받음 */
function fixDrops(){const mx=DROP.max,l=LN(),r3=v=>Math.ceil(v*100-1e-6)/100,pin=new Set();let moved=0;
  for(let guard=0;guard<200;guard++){recalc();const i=R.rows.findIndex((r,k)=>k>0&&isFinite(r.drop)&&r.drop>mx+1e-6);if(i<0)break;
    let e=r3(R.rows[i].drop-mx+0.005),k=i-1,okMove=false;
    const stuck=k=>{const r=R.rows[k],am=AUTOMIN.li===ST.active?AUTOMIN.m.get(k):undefined;return pin.has(k)||r.inv2Fixed||(isFinite(r.inv2Min)&&r.inv2-e<r.inv2Min-1e-6)||(isFinite(am)&&r.inv2-e<am-1e-6);};
    if(R.rows[i-1]&&stuck(i-1)){ /* 위 관로를 못 내리면(종점 관저고 지정) 이 관로를 통째로 올림 (경사 그대로, 토피 부족 감수) */
      const r=R.rows[i],p=l.pipes[i];p.cv1=Math.floor((r.cv1-e)*100+1e-6)/100;p.cv2=Math.floor((r.cv2-e)*100+1e-6)/100;pin.add(i);moved++;continue;}
    while(k>=0&&e>0){const r=R.rows[k],p=l.pipes[k];if(stuck(k))break;
      p.cv1=Math.round((r.cv1+e)*100)/100;p.cv2=Math.round((r.cv2+e)*100)/100;okMove=true;moved++;recalc();
      const d=R.rows[k].drop;if(k>0&&isFinite(d)&&d>mx+1e-6){e=r3(d-mx+0.005);k--;}else break;}
    if(!okMove)break;}
  return moved;}
function autoPipe(i){
  const l=LN(),p=l.pipes[i];let r=R.rows[i];
  if(!r||!r.size||!(r.len>0)||!(r.gl1>0)||!(r.gl2>0))return {skip:true,msg:`관로 ${r?r.no:i+1}: 지반고·규격·연장이 있어야 자동 작성할 수 있습니다.`};
  const orig=p.size,origLab=r.size.label;let resized=false;
  if(r.size.kind==="pipe"){ // 원형관: 최소 계획관경부터 유속·통수능을 맞출 수 있는 가장 작은 관경 (상류·인입 관경 이상)
    const pv=R.rows[i-1],minD=Math.max(+LN().cond.dPlan>0?+LN().cond.dPlan:450,pv&&pv.size&&pv.size.kind==="pipe"?pv.size.D*1000-1e-6:0,...(r.inl||[]).filter(q=>!q.err&&q.size&&q.size.kind==="pipe").map(q=>q.size.D*1000-1e-6)); // 인입관보다 작게 안 함
    const cands=PIPE_D.filter(d=>d>=minD);let ok=false;
    const keepCv=[p.cv1,p.cv2];
    for(const d of cands){p.size=String(d);recalc();const P0=planPipe(i);if(P0.small)continue;
      applyPlan(p,P0);recalc();const t=R.rows[i];p.cv1=keepCv[0];p.cv2=keepCv[1]; // 실제로 적용해 보고 유속·통수능이 맞으면 그 관경
      if((t.okV&&t.okQ)||(P0.raise!=null&&!P0.small)){ok=true;break;}} /* 위 관로를 올려야 맞는 경우도 됨 (다음 반복에서 올림) */
    if(!ok)for(const d of cands){p.size=String(d);recalc();if(!planPipe(i).small){ok=true;break;}}
    if(!ok){p.size=orig;recalc();}
    resized=String(p.size)!==String(orig);
  }
  const P=planPipe(i);applyPlan(p,P);r=P.r;
  if(P.raise!=null&&i>0){if(AUTOMIN.li!==ST.active)AUTOMIN={li:ST.active,m:new Map()};const o=AUTOMIN.m.get(i-1);if(!(o>=P.raise-0.005)){AUTOMIN.m.set(i-1,Math.ceil(P.raise*100-1e-6)/100);AUTOMIN.ch=true;}}
  (P.xr||[]).forEach(x=>{const o=XMIN.m.get(x.id);if(!(o>=x.v-0.005)){XMIN.m.set(x.id,Math.ceil(x.v*100-1e-6)/100);XMIN.ch=true;}});
  return {small:P.small,drop:P.drop,resized,from:origLab,to:r.size.label,
    msg:`관로 ${r.no}: ${resized?`${origLab} → ${r.size.label}, `:""}관저고 ${fx(P.inv1,2)} → ${fx(P.inv2,2)} m, 경사 ${fx((P.inv1-P.inv2)/r.len*100,2)}%${P.drop?" (시점 단차 확대)":""}${P.small?` — ${r.size.kind==="box"?"BOX 규격은 자동으로 바꾸지 않습니다. ":""}유속·통수능을 함께 맞출 수 없어 통수능 기준으로 작성했습니다. 규격을 키우세요.`:""}`};
}
var autoSnapData=null,AUTOMIN={li:-1,m:new Map()},XMIN={m:new Map()}; /* XMIN: 다른 노선 관로 종점 최소 관저고 (전 노선 자동에서 받는 관로를 올릴 때) */
/* 자동 계획 반복: 아래 관로가 위 관로를 올려야 하면(토피 부족 감수) 다시 돌림 */
function autoLine(){AUTOMIN={li:ST.active,m:new Map()};const n=LN().pipes.length;let res=[];
  for(let pass=0;pass<n+4;pass++){AUTOMIN.ch=false;res=[];for(let i=0;i<n;i++){recalc();res.push(autoPipe(i));}if(pass>=2&&!AUTOMIN.ch)break;}
  return res;} /* AUTOMIN은 남겨 둠: 이어서 도는 fixDrops가 올린 관로를 다시 내리지 않게 */
function autoSnap(){autoSnapData={li:ST.active,cv:LN().pipes.map(p=>[p.cv1,p.cv2,p.size])};$("pUndo").hidden=false;}
function cvU(){const v=+LN().cond.cvUse;return isFinite(v)&&v>0?v:1;}
function newPipe(prev){return {sta1:"",sta2:"",dir:prev?.dir||"좌",gl1:"",gl2:prev?+prev.gl2-0.3:10,cv1:prev?"":cvU(),cv2:cvU(),size:prev?.size||"300",thk:prev?.thk||0,len:20,nrow:1,n:prev?"":LN().cond.n,areas:Array(12).fill(0)};}
let autoArm=false;
$("pAuto").addEventListener("click",e=>{const b=e.currentTarget;
  autoSnap();const snapAll=JSON.stringify(ST.lines.map(l=>l.pipes.map(p=>[p.cv1,p.cv2,p.size])));let res=autoLine();
  const fd=fixDrops();
  /* 이 노선이 들어가는 노선(하류)은 인입 관저고가 바뀌었으니 이어서 다시 계획 */
  const keep=ST.active,down=[];{let cur=[keep];const idsOf=li=>new Set(ST.lines[li].pipes.map(p=>String(p.id||"").trim()));
    for(let g=0;g<ST.lines.length&&cur.length;g++){const nx=[];cur.forEach(a=>{const ids=idsOf(a);ST.lines.forEach((l,b)=>{if(b===a||down.includes(b)||b===keep)return;if(l.pipes.some(p=>(p.inl||[]).some(id=>ids.has(String(id).trim())))){down.push(b);nx.push(b);}});});cur=nx;}}
  let extra=[];if(down.length||XMIN.ch){const R2=autoLines([keep,...down]);extra=R2.lines.filter(li=>li!==keep);if(extra.length){NETAUTO=snapAll;$("pUndoAll").hidden=false;}ST.active=keep;full();}
  update();const sk=res.filter(x=>x.skip).length,dr=res.filter(x=>x.drop).length,sm=res.map((x,i)=>x.small?R.rows[i].no:null).filter(Boolean),
    rz=LN().pipes.map((p,i)=>String(p.size)!==String(autoSnapData.cv[i]?.[2])?`${R.rows[i].no} ${R.rows[i].size?.label}`:null).filter(Boolean);
  toast(`관로 계획 자동: ${res.length-sk}개 관로${sk?`, ${sk}개 건너뜀`:""}${rz.length?` · 관경 변경 ${rz.join(", ")}`:""}${dr?` · 단차 확대 ${dr}곳`:""}${fd?` · 최대 단차 ${DROP.max} m를 넘는 곳은 위쪽 관로를 내려 나눔`:""}${sm.length?` · 규격 부족 ${sm.join(", ")}`:""}${extra.length?` · 이어진 노선 ${extra.map(li=>ST.lines[li].name).join(", ")}도 다시 계획`:""}`);});
/* 여러 노선 자동: 지선(다른 노선으로 들어가는 노선)부터. 받는 관로를 올리려면 인입 노선 끝도 올려야 하니(XMIN) 그 노선도 넣어 다시 */
function autoLines(set){const n=ST.lines.length,ids=ST.lines.map(l=>new Set(l.pipes.map(p=>String(p.id||"").trim())));
  const feeds=(a,b)=>ST.lines[b].pipes.some(p=>(p.inl||[]).some(id=>ids[a].has(String(id).trim())));
  const order=[],done=new Set();for(let g=0;g<n&&order.length<n;g++)for(let a=0;a<n;a++){if(done.has(a))continue;if([...Array(n).keys()].some(c=>c!==a&&!done.has(c)&&feeds(c,a)))continue;order.push(a);done.add(a);}
  for(let a=0;a<n;a++)if(!done.has(a))order.push(a);
  const S=new Set(set);let cnt=0;XMIN={m:new Map()};
  for(let round=0;round<6;round++){XMIN.ch=false;cnt=0;order.filter(li=>S.has(li)).forEach(li=>{ST.active=li;autoLine();fixDrops();cnt+=LN().pipes.length;});
    if(!XMIN.ch)break;[...XMIN.m.keys()].forEach(id=>{const li=ids.findIndex(s=>s.has(id));if(li>=0)S.add(li);});}
  XMIN={m:new Map()};return {cnt,lines:[...S]};}
/* 전 노선 관저고 자동: 지선(다른 노선으로 들어가는 노선)부터 */
$("pAutoAll").addEventListener("click",()=>{const keep=ST.active,n=ST.lines.length,ids=ST.lines.map(l=>new Set(l.pipes.map(p=>String(p.id||"").trim())));
  const feeds=(a,b)=>ST.lines[b].pipes.some(p=>(p.inl||[]).some(id=>ids[a].has(String(id).trim()))); // a 노선이 b 노선으로 들어감
  const order=[],done=new Set();for(let g=0;g<n&&order.length<n;g++)for(let a=0;a<n;a++){if(done.has(a))continue;if([...Array(n).keys()].some(c=>c!==a&&!done.has(c)&&feeds(c,a)))continue;order.push(a);done.add(a);}
  for(let a=0;a<n;a++)if(!done.has(a))order.push(a);
  NETAUTO=JSON.stringify(ST.lines.map(l=>l.pipes.map(p=>[p.cv1,p.cv2,p.size])));const cnt=autoLines([...Array(n).keys()]).cnt;
  ST.active=keep;full();$("pUndoAll").hidden=false;const ng=RALL.reduce((s,Rr)=>s+(Rr?Rr.rows.filter(r=>!(r.okV&&r.okQ&&r.okJ!==false)).length:0),0);
  toast(`전 노선 관로 계획 자동: 노선 ${n}개, 관로 ${cnt}개${ng?` · 아직 N.G ${ng}개 (판정 칸에 이유)`:" · 모두 O.K"}`);});
var NETAUTO=null;
$("pUndoAll").addEventListener("click",()=>{if(!NETAUTO)return;const v=JSON.parse(NETAUTO);ST.lines.forEach((l,li)=>l.pipes.forEach((p,i)=>{const q=v[li]&&v[li][i];if(q){p.cv1=q[0];p.cv2=q[1];p.size=q[2];}}));NETAUTO=null;$("pUndoAll").hidden=true;full();toast("전 노선 자동 작성 전으로 되돌렸습니다.");});
$("pUndo").addEventListener("click",()=>{if(!autoSnapData)return;const l=ST.lines[autoSnapData.li];if(l)autoSnapData.cv.forEach((v,i)=>{if(l.pipes[i]){l.pipes[i].cv1=v[0];l.pipes[i].cv2=v[1];if(v[2]!=null)l.pipes[i].size=v[2];}});
  autoSnapData=null;$("pUndo").hidden=true;full();toast("자동 작성 전으로 되돌렸습니다.");});
$("pAdd").addEventListener("click",()=>{const l=LN(),ps=l.pipes,np=newPipe(ps[ps.length-1]);np.id=nextId(l);ps.push(np);update();});
let renArm=false;
$("pRenum").addEventListener("click",e=>{const b=e.currentTarget,l=LN();
  if(!renArm){renArm=true;b.textContent=`한 번 더 누르면 ${lineCode(l)}-01부터 다시 매김`;setTimeout(()=>{renArm=false;b.textContent="번호 다시 매기기";},4000);return;}
  renArm=false;b.textContent="번호 다시 매기기";renumber(l);update();toast(`관로 번호를 ${lineCode(l)}-01부터 순서대로 다시 매겼습니다.`);});

/* ---------- 유역면적 입력표 ---------- */
function renderAreaTbl(){
  const l=LN();
  let h=`<thead><tr><th rowspan="2">관로<br>번호</th>${C_LABELS.map(s=>`<th style="white-space:normal;min-width:74px;font-size:11.5px">${s}</th>`).join("")}<th rowspan="2">계 A<br>(ha)</th><th rowspan="2">가중 C</th></tr>
    <tr>${l.cvals.map((v,j)=>`<th><input type="number" step="0.05" data-c="${j}" value="${v}" class="w-s" aria-label="${C_LABELS[j]} C"></th>`).join("")}</tr></thead><tbody>`;
  l.pipes.forEach((p,i)=>{h+=`<tr data-r="${i}"><td>${XE(p.id||String(i+1))}</td>${p.areas.map((v,j)=>`<td><input type="number" step="0.01" data-a="${j}" value="${v||""}" placeholder="0" class="w-s" aria-label="${i+1}번 ${C_LABELS[j]} 면적"></td>`).join("")}<td class="calc" id="aA_${i}"></td><td class="calc" id="aC_${i}"></td></tr>`;});
  h+=`<tr class="tot"><td>계</td>${C_LABELS.map((_,j)=>`<td class="n" id="aS_${j}"></td>`).join("")}<td class="n" id="aStot"></td><td></td></tr></tbody>`;
  $("areaTbl").innerHTML=h; updateAreaCalc();
}
function updateAreaCalc(){
  const l=LN();
  R.rows.forEach((r,i)=>{const a=$("aA_"+i),c=$("aC_"+i);if(a)a.textContent=fx(r.A,3);if(c)c.textContent=r.A>0?fx(r.C,3):"-";});
  C_LABELS.forEach((_,j)=>{const el=$("aS_"+j);if(el){const s=l.pipes.reduce((t,p)=>t+(+p.areas[j]||0),0);el.textContent=s?fx(s,3):"";}});
  const t=$("aStot");if(t)t.textContent=fx(R.Atot,3);
}
$("areaTbl").addEventListener("input",e=>{
  const el=e.target,l=LN(),v=parseFloat(el.value);
  if(el.dataset.c!=null){if(!isFinite(v))return;l.cvals[+el.dataset.c]=v;}
  else if(el.dataset.a!=null){const i=+el.closest("tr").dataset.r;l.pipes[i].areas[+el.dataset.a]=isFinite(v)?v:0;}
  update({keepArea:true});
});

/* ---------- 결과 ---------- */
function renderModeHelp(){
  const el=$("modeHelp");if(!el||!R)return;
  const c=R.c,k=R.k,l=LN(),inf=l.inflow,dif=(v,s)=>+v!==s?` <span class="mhx">기준 ${s}와 다름</span>`:"";
  const src=k.type==="wamis"?`WAMIS 지역빈도해석 확률강우량 · ${XE(k.region)} (${XE(k.agency||"")} ${k.code})<br>1시간 미만: ${XE(WSUB[k.sub||"ratio"])}${k.sub!=="gen"&&k.ref?` (기준지점 ${XE(k.ref.region)})`:""}`
    :`${XE(k.region||"")} · ${XE(RTYPES[k.type||"road"].nm)}${k.src?` (${XE(k.src)})`:""}`;
  const st=[
    ["강우강도 I",`${src}<br>설계빈도 ${R.T}년${R.T<10?` <span class="mhx">KDS 61 최소 지선 10년·간선 30년</span>`:""}`],
    ["유입시간 t₁",(c.road?`고정값 ${c.tRoad}분 <span class="mhs">(Kerby 식 값 ${fx(R.t1k,2)}분)</span>`:`Kerby 식 t₁ = 1.44 (L·N/√S)^0.467 = <b>${isFinite(R.t1k)?fx(R.t1k,2)+"분":"계산 불가"}</b>${R.t1Min?` → <b>5분 적용</b> <span class="mhx">${isFinite(R.t1k)?"5분 미만":"경사 없음(S ≤ 0)"} · 지침 4.3.2</span>`:""} <span class="mhs">(L ${fx(inf.L,1)} m, N ${fx(R.nK,3)}, S ${fx(R.S,4)} · 지침 2025 표 4.3.4)</span>${inf.L>400?` <span class="mhx">Kerby 식 도시유역 적용범위 L ≤ 0.4 km 초과</span>`:""}`)
      +`<div class="mhcond"><b>고정값을 쓰는 경우</b> <span class="mhs">(KDS 61 10 00은 유입시간을 지표면 특성으로 구하도록 하므로, 아래 경우가 아니면 Kerby 식)</span><br>
      · 노면 배수처럼 집수 거리가 짧아 Kerby 값이 5분보다 작을 때 → 5분 (지침 2025 4.3.2 강우지속기간 5분 이상)<br>
      · 하수도정비기본계획이나 발주청이 유입시간을 정해 준 경우 → 그 값<br>
      · 참고: (구)하수도시설기준 관행값 간선 5분, 지선 7~10분. 현행 기준에는 값이 없어 근거를 적어 두어야 합니다.</div>`],
    ["유하시간 t₂","관로 연장 ÷ 계획우수량이 흐를 때의 유속 <span class=\"mhs\">(Manning 등류수심, t·I·Qd·V 반복계산)</span>"],
    ["도달시간 t","t₁ + 최상류 관로부터 해당 관로까지 t₂ 합 <span class=\"mhs\">(KDS 61 10 00 1.5.1)</span><br>강우지속기간 = 도달시간, 5분보다 짧으면 5분 <span class=\"mhs\">(지침 2025 4.3.2)</span>"],
    ["계획우수량 Qd","합리식 Qd = 1/360 · I · ΣC·A <span class=\"mhs\">(해당 관로까지 상류 전체, C는 지침 2025 표 4.3.1)</span>"],
    ["통수능 Qc",`Manning 식, 원형관 ${+c.dPipe===1?"만류":"수심비 "+c.dPipe}${dif(c.dPipe,1)}, BOX 높이의 ${fx(c.dBox*100,0)}%${dif(c.dBox,0.9)}, 기본 n ${c.n} <span class="mhs">(KDS 61 40 00 1.2)</span>`],
    ["토피",`적용 토피 ${c.cvUse??1} m <span class="mhs">(새 관로 토피 칸의 처음 자동값)</span>${+(c.cvUse??1)<CVMIN?` <span class="mhx">최소 흙두께 원칙 ${CVMIN} m보다 작음</span>`:""}<br>최소 흙두께 원칙 ${CVMIN} m (KDS 61 40 00 3.2), 불가피해도 ${CVABS} m 이상 + 보호공 (부산시 설계지침서 2025) — 고정<br><span class="mhs">0.6~1.0 m: 관 보호공 검토 안내 / 0.6 m 미만: 경고</span><br>관 보호공: 토피 1.0 m 미만 관로에 관 둘레 콘크리트 t = ${c.protT??0.15} m (종단면도·관로 단면도에 표시)`],
    ["관 접합 단차",`규정값(고정) 최소 ${DROP.min} m · 최대 ${DROP.max} m · 부관 ${DROP.sub} m 이상 · 적용 ${c.dropUse??0.05} m${+(c.dropUse??0.05)<DROP.min?` <span class="mhx">적용 단차가 최소 단차보다 작음</span>`:""}<br>단차 = 상류관 종점 관저고 − 하류관 시점 관저고 (관경이 커지는 곳은 관정 높이 차)<br>관로 입력에서 시점 토피를 비우면 시점 관저고 = 상류관 관저고 − 적용 단차 (관경이 커지면 관정접합만큼 더 낮춤)
      <div class="mhcond"><b>단차 규정</b><br>· 상류관과 인버트 저부 단차 3~10 cm <span class="mhs">(KDS 61 40 00 7.2(1)④, 부산시 설계지침서 "확보")</span><br>· 단차접합 1개소당 1.5 m 이내 <span class="mhs">(KDS 61 40 00 5.1(2))</span><br>· 0.6 m 이상이면 부관 <span class="mhs">(KDS: 합류관·오수관 원칙 / 부산시: 하수관로 단차 0.6 m 이상 부관, 2호 이상 맨홀은 내부 부관)</span><br>· 계단접합은 1단 0.3 m 이내 (대구경·현장타설 관로), 곤란하면 감세공·드롭샤프트 <span class="mhs">(5.1(2))</span><br>· 관경이 바뀌거나 합류하면 수면접합 또는 관정접합 원칙 <span class="mhs">(5.1(1))</span></div>`],
    ["맨홀",`규격: KDS 61 40 00 표 1.7.1 표준맨홀 (연결 관경·합류 여부로 1~5호 자동)<br>맨홀 높이 = 지반고 − 최저 관저고 + 여유고 ${c.mhFree??0} m, 0.1 m 단위 올림 <span class="mhs">(여유고는 관저에서 아래로)</span>`],
    ["관경",`최소관경 ${+c.dMin||250} mm <span class="mhs">(KDS 61 40 00 2.3: 오수 200, 우수·합류 250 mm 표준 — 유지관리 · KDS 44 40 05 4.3.1: 중앙분리대 종·횡배수관 450 mm 이상)</span> — 미달은 "관경 부족" 알림만<br>최소 계획관경 ${+c.dPlan||450} mm — 관저고 자동 작성 시작 관경 <span class="mhs">(발주처·지자체 지침 값을 넣고 근거를 함께 적어 두세요)</span><br>관경 감소: 하류관이 상류관·인입관보다 작으면 N.G</span>`],
    ["판정",`Qd ≤ Qc, 접합 단차 ${DROP.min} ~ ${DROP.max} m (역단차·역경사 N.G, 인입관 포함), 관경 감소 N.G (최소관경 ${+c.dMin>0?+c.dMin:250} mm 미만은 알림만), 계획우수량 유속 ${c.vmin} ~ ${c.vmax} m/s${(+c.vmin!==0.8||+c.vmax!==3)?` <span class="mhx">기준 0.8~3.0과 다름</span>`:""} <span class="mhs">(KDS 61 40 00 1.3)</span>`]];
  el.innerHTML=`<div class="mh on"><b>계산 방법 · ${XE(l.name)}</b><ol class="mhol">${st.map(([h,t])=>`<li><b>${h}</b><br>${t}</li>`).join("")}</ol></div>`;
}
function renderSummary(){renderModeHelp();
  const ok=R.rows.filter(r=>r.size&&r.okV&&r.okQ&&r.okJ!==false).length, last=R.rows[R.rows.length-1]||{};
  const k=(t,v,u="",chip="")=>`<div class="kpi"><span class="k">${t}</span><span class="v">${v} <small>${u}</small>${chip}</span></div>`;
  $("summary").innerHTML=
    k("총 유역면적",fx(R.Atot,3),"ha")+
    k("관로 연장",fx(R.len,1),"m")+
    k(R.c.road?"유입시간 (고정)":R.t1Min?"유입시간 (Kerby 5분 미만 → 5분)":"유입시간 t₁ (Kerby)",fx(R.t1,2),"min")+
    k(`강우강도 · ${R.T}년`,fx(last.I,1),"mm/hr")+
    k("최종 유출량 Qd",fx(R.Qd,3),"m³/s")+
    k("관로 판정",`${ok}/${R.rows.length}`,"구간",`<span class="chip ${R.allOk?"ok":"bad"}">${OKS(R.allOk)}</span>`);
  const w=[...R.warns];
  {const d=dupIds();if(d.length)w.unshift(`관로 번호 ${d.join(", ")}이(가) 겹칩니다. 관로 번호는 고유해야 합니다(다른 노선 포함).`);
   const e=LN().pipes.map((p,i)=>(p.id==null||String(p.id).trim()==="")?i+1:0).filter(Boolean);if(e.length)w.unshift(`${e.join(", ")}번째 관로의 번호가 비어 있습니다.`);}
  R.rows.forEach(r=>{if(!r.size)return;
    if(!r.okV)w.push(`관로 ${r.no}: 계획우수량이 흐를 때 유속 ${fx(r.V,2)} m/s가 허용범위 ${R.c.vmin}~${R.c.vmax} m/s를 벗어납니다. ${r.V>R.c.vmax?"경사를 낮추거나(단차 설치) 관경을 조정하세요.":"경사를 높이거나 관경을 줄이세요."}`);
    if(!r.okQ)w.push(`관로 ${r.no}: 통수능 ${fx(r.Qc,3)} m³/s가 계획우수량 ${fx(r.Qd,3)} m³/s보다 작습니다. 규격을 키우거나 경사를 높이세요.`);});
  $("warns").innerHTML=w.map(s=>`<div class="warn">${XE(s)}</div>`).join("")+R.notes.map(s=>`<div class="warn info">${XE(s)}</div>`).join("");
  const kn=R.k.type==="wamis"?`${WSUBEQ[R.k.sub||"ratio"]} · 재현기간 ${rainRps(R.k).join(", ")}년. 표에 없는 재현기간은 ln T로 보간합니다.`:!isRoad(R.k)?`${RTYPES[R.k.type].nm} · 재현기간 ${rainRps(R.k).join(", ")}년. 표에 없는 재현기간은 ln T로 보간합니다.`:`관로마다 강우지속기간이 ${R.k.sep}분보다 짧으면 단기간, 길면 장기간 상수를 씁니다.`;
  $("kNote").innerHTML=`${RTYPES[R.k.type||"road"].eq}<br>${kn}`;
  $("iNote").innerHTML=`H = ${fx(R.Hd,2)} m, S = H/L = <b>${fx(R.S,4)}</b>, 가중 N = <b>${fx(R.nK,3)}</b> (면적 계 ${fx(R.sumKA,2)} ha)<br>t₁ = 1.44 (L·N/√S)^0.467 = <b>${fx(R.t1k,2)} 분</b> (L: m) = 36.264 (L·N)^0.467 / S^0.2335 (L: km)${R.c.road?` · 유입시간 고정이라 ${R.t1}분 적용`:R.t1Min?` · <b>${isFinite(R.t1k)?"5분 미만":"경사 없음(S ≤ 0)"}이라 5분 적용</b> (지침 4.3.2)`:""}`;
}
function cls(ok){return ok?"okc":"badc";}
function renderFlow(){
  let h=`<table class="t"><thead><tr><th>관로<br>번호</th><th>유역면적<br>A (ha)</th><th>유출계수<br>C</th><th>인입 면적<br>A (ha)</th><th>인입 ΣC·A<br>(ha)</th><th>누가 ΣC·A<br>(ha)</th><th>유입시간<br>t₁ (min)</th><th>구간 유하시간<br>t₂ (min)</th><th>누가 유하시간<br>Σt₂ (min)</th><th>도달시간<br>t (min)</th><th>강우지속기간<br>(min)</th><th>강우강도<br>I (mm/hr)</th><th>계획우수량<br>Qd (m³/s)</th></tr></thead><tbody>`;
  R.rows.forEach(r=>{h+=`<tr><td>${r.no}</td><td class="n">${fx(r.A,3)}</td><td class="n">${fx(r.C,3)}</td><td class="n">${r.inA?fx(r.inA,3):"-"}</td><td class="n" title="${XE((r.inl||[]).filter(q=>!q.err).map(q=>`${q.id} (${q.line}) A ${fx(q.A,3)} ha, ΣCA ${fx(q.CA,4)}, t ${fx(q.t,2)}분`).join(" / "))}">${r.inCA?`${fx(r.inCA,4)}<br><small>${XE(r.inl.filter(q=>!q.err).map(q=>q.id).join(", "))}</small>`:"-"}</td><td class="n">${fx(r.CA,4)}</td><td class="n">${fx(R.t1,2)}</td><td class="n">${fx(r.t2,2)}</td><td class="n">${fx(r.t2acc,2)}</td><td class="n">${fx(r.t,2)}</td><td class="n">${fx(r.tI,2)}</td><td class="n">${fx(r.I,2)}</td><td class="n">${fx(r.Qd,3)}</td></tr>`;});
  h+=`<tr class="tot"><td>계</td><td class="n">${fx(R.Atot,3)}</td><td></td><td class="n">${fx(R.rows.reduce((s,r)=>s+(r.inA||0),0)||0,3)}</td><td class="n">${fx(R.rows.reduce((s,r)=>s+(r.inCA||0),0)||0,4)}</td><td class="n">${fx(R.rows.at(-1)?.CA,4)}</td><td colspan="6"></td><td class="n">${fx(R.Qd,3)}</td></tr></tbody></table>`;
  h+=`<p class="note">Qd = 1/360 · I · ΣC·A. 도달시간은 유입시간에 최상류 관로부터 그 관로 끝까지의 유하시간을 더한 값이고, 유하시간은 관로 길이를 계획유량이 흐를 때의 유속으로 나눈 값입니다. 강우지속기간은 5분 이상으로 둡니다. 인입 관로가 있으면 그 관로 끝의 ΣC·A를 더하고, 도달시간은 본선 상류와 인입 관로 중 큰 값을 씁니다.</p>`;
  $("flowTbl").innerHTML=h;
}
function renderHyd(){
  let h=`<table class="t"><thead><tr><th rowspan="2">번호</th><th rowspan="2">관로 측점</th><th rowspan="2">도로 측점</th><th rowspan="2">연장<br>(m)</th><th colspan="2">관저고 (m)</th><th rowspan="2">경사<br>(%)</th><th rowspan="2">규격</th><th colspan="6">통수능 (설계수심)</th><th colspan="3">계획우수량이 흐를 때</th><th colspan="2">판정</th><th rowspan="2">사용률<br>(Qd/Q)</th><th colspan="2">만류 기준 허용경사 (%)</th><th rowspan="2">t₂<br>(min)</th></tr>
  <tr><th>시점</th><th>종점</th><th>수심<br>(m)</th><th>A<br>(m²)</th><th>P<br>(m)</th><th>R<br>(m)</th><th>V<br>(m/s)</th><th>Q<br>(m³/s)</th><th>Qd<br>(m³/s)</th><th>수심<br>(m)</th><th>유속<br>(m/s)</th><th>유속</th><th>유량</th><th>최소</th><th>최대</th></tr></thead><tbody>`;
  R.rows.forEach(r=>{const s=r.size;
    h+=`<tr><td>${r.no}</td><td>${r.psta1} ~ ${r.psta2}</td><td>${XE(r.sta1??"")} ~ ${XE(r.sta2??"")}</td><td class="n">${fx(r.len,2)}</td><td class="n">${fx(r.inv1,3)}</td><td class="n">${fx(r.inv2,3)}</td><td class="n">${s?fx(r.slope*100,3):"-"}</td><td>${s?s.label+(r.nrow>1?" ×"+r.nrow:""):"?"}</td>`;
    if(!s){h+=`<td colspan="17" class="badc">규격 확인</td></tr>`;return;}
    h+=`<td class="n">${fx(r.depth,3)}</td><td class="n">${fx(r.Aw,4)}</td><td class="n">${fx(r.Pw,3)}</td><td class="n">${fx(r.R,4)}</td><td class="n">${fx(r.Vf,2)}</td><td class="n">${fx(r.Qc,3)}</td><td class="n">${fx(r.Qd,3)}</td><td class="n">${r.sur?"만관":fx(r.yd,3)}</td><td class="n">${fx(r.V,2)}</td><td class="${cls(r.okV)}">${OKS(r.okV)}</td><td class="${cls(r.okQ)}">${OKS(r.okQ)}</td><td class="n">${fx(r.use*100,1)}%</td><td class="n">${fx(r.Imin,2)}</td><td class="n">${fx(r.Imax,2)}</td><td class="n">${fx(r.t2,2)}</td></tr>`;});
  h+=`</tbody></table><p class="note">V = 1/n · R^(2/3) · I^(1/2) (Manning), Q = A · V × 련수. 통수능 수심은 원형관 ${R.c.dPipe===1?"만류":"관경의 "+R.c.dPipe*100+"%"}, BOX 높이의 ${R.c.dBox*100}%. 유속 판정은 계획우수량이 흐를 때의 등류 유속으로 하며(KDS 61 40 00 1.3), 통수능을 넘으면 만관 유속으로 봅니다. 관저고 = 지반고 − 토피 − 관경 − 관 두께 (BOX는 내공높이 + 상부 슬라브 두께).</p>`;
  $("hydTbl").innerHTML=h;
}
function idfTable(rows,durs){
  const k=R.k;
  return `<table class="t"><thead><tr><th>재현기간</th>${durs.map(d=>`<th>${d}분</th>`).join("")}</tr></thead><tbody>${rows.map(T=>`<tr${T===R.T?' class="tot"':""}><td>${T}년</td>${durs.map(d=>`<td class="n">${fx(rainI(k,T,d),1)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function rainParams(k){ // 보고서·화면 공용 상수표
  if(isRoad(k))return {head:["구분","a","b","c","d","n"],rows:["short","long"].map(s=>[s==="short"?`단기간 (t < ${k.sep}분)`:`장기간 (t ≥ ${k.sep}분)`,...["a","b","c","d","n"].map(c=>String(k[s][c]))])};
  if(k.type==="wamis"){const H=[1,2,3,6,12,18,24,48,72];return {head:["T (년)",...H.map(h=>h+"시간")],rows:k.tbl.map(r=>[r.T+"년",...H.map(h=>fx(r.d[h-1],1))]),mm:true};}
  if(k.type==="table")return {head:["T (년)",...k.durs.map(d=>d+"분")],rows:k.tbl.filter(r=>+r.T>0).map(r=>[r.T+"년",...k.durs.map((_,j)=>r.v[j]===""||r.v[j]==null?"-":String(r.v[j]))])};
  const ps=RTYPES[k.type].p;return {head:["T (년)",...ps],rows:k.rows.filter(r=>+r.T>0).map(r=>[r.T+"년",...ps.map(p=>String(r[p]??""))])};
}
function renderRain(){
  const k=R.k,road=isRoad(k),P=rainParams(k),rps=rainRps(k);
  $("rainPane").innerHTML=`<h3>강우강도식 · ${XE(k.region)}</h3>
   <div class="rep"><div class="eq">${RTYPES[k.type||"road"].nm}  ${RTYPES[k.type||"road"].eq}    [mm/hr]
T : 재현기간(년), t : 강우지속시간(분)${road?", a·b·c·d·n : 지점별 지역상수":""}${k.src?` (${XE(k.src)})`:""}</div></div>
   <div class="tblwrap"><table class="t" style="max-width:${road?640:900}px"><thead><tr>${P.head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>
   ${P.rows.map((r,i)=>`<tr${!road&&parseFloat(r[0])===R.T?' class="tot"':""}>${r.map((v,j)=>`<td class="${j?"n":""}">${XE(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
   ${k.type==="wamis"?`<p class="note">위 표는 ${XE(k.region)} 지점(${XE(k.agency||"")} ${k.code}) 지속기간별 확률강우량(mm)입니다. 1시간 이상은 I = P(t)/t를 지속기간 사이에서 로그 보간합니다. 1시간 미만: ${XE(WSUB[k.sub||"ratio"])}${k.sub!=="gen"&&k.ref?` (기준지점 ${XE(k.ref.region)})`:""}${k.sub==="gen"&&k.gen?(g=>g?` · ${g.T}년 식: I = ${fx(g.a,1)} / (t^${fx(g.n,4)} + ${fx(g.b,3)})`:"")(k.gen.find(g=>+g.T===+R.T)):""}. 1시간 미만 강우강도 산정 방법은 발주청과 협의해 정하세요.</p>`:""}
   <h3>확률 강우강도 (mm/hr)</h3><div class="tblwrap">${idfTable(rps,DUR)}</div>
   <p class="note">${road?"지속시간마다 단·장기간 상수를 따로 적용한 값입니다.":k.type==="wamis"?"WAMIS 확률강우량에서 구한 값입니다.":k.type==="table"?"표 사이의 지속시간은 로그 눈금으로 보간한 값입니다.":"재현기간별 상수로 계산한 값입니다."} 굵은 줄이 설계빈도입니다.</p>
   <h3>강우강도-지속시간 곡선</h3><div class="chart">${idfChartSVG()}</div>`;
}
function idfChartSVG(print){
  const k=R.k, W=820,H=380,ml=58,mr=90,mt=16,mb=44, x0=Math.log10(5),x1=Math.log10(1440);
  const rp=rainRps(k);let Ts=rp.length>9?rp.filter(t=>[2,5,10,20,30,50,80,100,200].includes(t)):rp.slice(); if(!Ts.includes(R.T))Ts.push(R.T);
  // 양대수(log-log) 그래프
  const vmaxD=Math.max(...Ts.map(T=>rainI(k,T,5)).filter(isFinite),1),vminD=Math.min(...Ts.map(T=>rainI(k,T,1440)).filter(v=>isFinite(v)&&v>0),vmaxD);
  const TK=[1,2,5,10,20,50,100,200,500,1000],ymax=TK.find(v=>v>=vmaxD)||1000,ymin=[...TK].reverse().find(v=>v<=vminD)||1;
  const y0=Math.log10(ymin),y1=Math.log10(ymax);
  const X=d=>ml+(Math.log10(d)-x0)/(x1-x0)*(W-ml-mr), Y=v=>H-mb-(Math.log10(Math.max(v,ymin))-y0)/(y1-y0)*(H-mt-mb);
  const col=print?{ink:"#1a2226",mut:"#5b6970",grid:"#d3dade",acc:"#1d5e88",line:"#9aa7ad",bg:"#fff"}:{ink:"var(--ink)",mut:"var(--muted)",grid:"var(--line)",acc:"var(--accent)",line:"var(--muted)",bg:"var(--panel)"};
  let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Sans KR,Malgun Gothic,sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="${col.bg}"/>`;
  for(let dec=Math.pow(10,Math.floor(y0));dec<ymax*1.0001;dec*=10)for(let m=1;m<10;m++){const v=dec*m;if(v<ymin-1e-9||v>ymax+1e-9)continue;const major=[1,2,5].includes(m);
    s+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${col.grid}" stroke-width="${major?1:0.5}"${major?"":` stroke-dasharray="2 3"`}/>`+(major?`<text x="${ml-6}" y="${Y(v)+4}" text-anchor="end" fill="${col.mut}">${v}</text>`:"");}
  [5,10,20,30,60,120,180,360,720,1440].forEach(d=>{s+=`<line y1="${mt}" y2="${H-mb}" x1="${X(d)}" x2="${X(d)}" stroke="${col.grid}" stroke-width="1"/><text x="${X(d)}" y="${H-mb+16}" text-anchor="middle" fill="${col.mut}">${d}</text>`;});
  s+=`<text x="${(ml+W-mr)/2}" y="${H-8}" text-anchor="middle" fill="${col.mut}">강우지속시간 t (분, 로그 눈금)</text><text x="14" y="${(mt+H-mb)/2}" fill="${col.mut}" transform="rotate(-90 14 ${(mt+H-mb)/2})" text-anchor="middle">강우강도 I (mm/hr, 로그 눈금)</text>`;
  const labs=[];Ts.sort((a,b)=>a-b).forEach(T=>{const pts=[];for(let lg=x0;lg<=x1+1e-9;lg+=0.02){const d=Math.pow(10,lg);const v=rainI(k,T,d);if(isFinite(v)&&v>0)pts.push([X(d),Y(Math.min(v,ymax))]);}if(!pts.length)return;
    const des=T===R.T;s+=`<polyline points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${des?col.acc:col.line}" stroke-width="${des?2.4:1.1}"/>`;
    labs.push({T,y:pts[pts.length-1][1],x:pts[pts.length-1][0],des});});
  labs.sort((a,b)=>a.y-b.y);for(let i=1;i<labs.length;i++)if(labs[i].y-labs[i-1].y<13)labs[i].y=labs[i-1].y+13;
  const over=labs.length?labs[labs.length-1].y-(H-mb+4):0;if(over>0)labs.forEach(l=>l.y-=over);
  labs.forEach(l=>{s+=`<text x="${l.x+8}" y="${l.y+4}" fill="${l.des?col.acc:col.mut}" font-weight="${l.des?600:400}">${l.T}년</text>`;});
  const last=R.rows[R.rows.length-1]; if(last&&isNum(last.I)&&last.tI>=5){const px=X(last.tI),py=Y(last.I);
    s+=`<circle cx="${px}" cy="${py}" r="5" fill="${col.acc}"/><text x="${px+9}" y="${py-8}" fill="${col.ink}" font-weight="600">t = ${fx(last.tI,2)}분, I = ${fx(last.I,1)}</text>`;}
  return s+`</svg>`;
}

/* ---------- 유역도 그림 ---------- */
function renderBasin(){
  if(typeof BSN!=="undefined"&&BSN){bsEnsure();if(!BSN.res&&DXF)bsRun();else renderBsn();}
  const img=LN().img; $("imgDel").hidden=!img;
  $("imgView").innerHTML=img?`<img src="${img}" alt="${XE(LN().name)} 우수 유역도">`:`<p class="note">아직 그림이 없습니다.</p>`;
}
function loadImage(file){
  if(!file||!/^image\/(png|jpeg)$/.test(file.type)){toast("JPG나 PNG 그림을 골라 주세요.");return;}
  const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{
    const sc=Math.min(1,2000/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);
    const ctx=cv.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);
    LN().img=cv.toDataURL("image/jpeg",0.82);persist();renderBasin();renderReport();toast("유역도를 넣었습니다.");};im.src=fr.result;};fr.readAsDataURL(file);
}
$("imgFile").addEventListener("change",e=>{loadImage(e.target.files[0]);e.target.value="";});
const drop=$("drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
drop.addEventListener("drop",e=>loadImage(e.dataTransfer.files[0]));
$("imgDel").addEventListener("click",()=>{LN().img=null;persist();renderBasin();renderReport();});

/* ---------- 탭 ---------- */
let TAB="pipe";
try{const t=localStorage.getItem(KEY+"-tab");if(t)TAB=t;}catch(e){}
function showTab(t){TAB=t;{const sb=$("btnSave");if(sb)sb.setAttribute("aria-pressed",t==="save");}document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",b.dataset.t===t));document.querySelectorAll(".pane").forEach(p=>p.hidden=p.dataset.p!==t);try{localStorage.setItem(KEY+"-tab",t);}catch(e){}renderActive();}
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(b)showTab(b.dataset.t);});
$("btnSave").addEventListener("click",()=>{showTab("save");const p=document.querySelector('.pane[data-p="save"]');if(p)p.scrollIntoView({behavior:"smooth",block:"start"});}); /* 저장·불러오기: 위 버튼 줄에서 */

/* ---------- 갱신 ---------- */
function noteBreaks(){ // 표·입력 아래 작은 설명 글씨: 문장마다 줄을 바꿈 (수리계산서 제외)
  document.querySelectorAll('.pane:not([data-p="rep"]) .note,.pane:not([data-p="rep"]) .calcline').forEach(p=>{if(p.querySelector("input,select,textarea,button,table"))return;
    const h=p.innerHTML,n=h.replace(/([.)])\s+(?=[^\s<])/g,(m,c)=>c===")"?m:".<br>");if(n!==h)p.innerHTML=n;});}
new MutationObserver(()=>{clearTimeout(noteBreaks.t);noteBreaks.t=setTimeout(noteBreaks,0);}).observe(document.body,{childList:true,subtree:true,characterData:true});
function renderActive(){if(TAB==="save"&&typeof GD!=="undefined"&&GD.on&&Date.now()-(GD.t||0)>20000){GD.t=Date.now();gdRefresh();}
  if(TAB==="flow")renderFlow();else if(TAB==="hyd")renderHyd();else if(TAB==="rain")renderRain();
  else if(TAB==="prof")renderProfile();else if(TAB==="sec")renderSections();else if(TAB==="basin")renderBasin();else if(TAB==="rep")renderReport();else if(TAB==="mh")renderMh();else if(TAB==="plan")renderPlan();else if((TAB==="inflow"||TAB==="area")&&typeof renderInfBs==="function"){const rr=()=>{renderInfBs();renderAreaBs();};rr();if(typeof BSN!=="undefined"&&BSN&&!BSN.res)bsEnsure().then(()=>{if(DXF&&!BSN.res){try{BSN.res=bsAnalyze(DXF.ents,{mode:$("bsMode").value,reach:Math.max(10,+$("bsReach").value||100),defC:+$("bsDefC").value});}catch(e){}}rr();});}
  noteBreaks();
}
function renderAll(){renderSummary();renderActive();}
function update(o={}){
  recalc(); persist();
  if(o.keepPipe)updatePipeCalc();else renderPipeTbl();
  if(o.keepArea)updateAreaCalc();else renderAreaTbl();
  renderLineTabs(); renderAll();
}
function full(){recalc();persist();fillForm();renderPipeTbl();renderAreaTbl();renderLineTabs();renderAll();}

/* ---------- 저장 파일 ---------- */
$("svExport").addEventListener("click",()=>save(`우수수리계산_${safe(ST.proj.name||"작업")}.json`,JSON.stringify(ST,null,1)));
$("svImport").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const fr=new FileReader();fr.onload=()=>{try{const v=JSON.parse(fr.result);if(!validProj(v))throw 0;ST=v;ST.proj={...SAMPLE_PROJ().proj,...(ST.proj||{})};ST.lines.forEach(normLine);ST.active=0;full();toast("작업 파일을 불러왔습니다.");}catch(err){toast("이 파일은 우수 수리계산 작업 파일이 아닙니다.");}};fr.readAsText(f);});
let smpArm=false;
$("svSample").addEventListener("click",()=>{if(!smpArm){smpArm=true;$("svAsk").textContent="지금 입력이 모두 예제로 바뀝니다. 한 번 더 누르면 바꿉니다.";setTimeout(()=>{smpArm=false;$("svAsk").textContent="";},4000);return;}
  smpArm=false;$("svAsk").textContent="";ST=SAMPLE_PROJ();full();toast("예제(우수 1-1 Line)로 되돌렸습니다.");});
const safe=s=>String(s).replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"_").slice(0,40);


/* ---------- 강우강도식: 형태별 입력 · 목록 ---------- */
function seedRain(k){
  if(k.type==="wamis")return;
  const T0=rainRps(k).length?rainRps(k):[2,3,5,10,20,30,50,80,100];
  if(k.type==="table"){if(!k.tbl.length)k.tbl=[10,20,30,50,100].map(T=>({T,v:k.durs.map(()=>"")}));}
  else if(!isRoad(k)&&!k.rows.length)k.rows=[10,20,30,50,100].map(T=>({T,a:"",b:"",n:""}));
}
function fixT(){const l=LN(),rps=rainRps(l.rain);if(rps.length&&!rps.includes(+l.cond.T))l.cond.T=rps.reduce((b,v)=>Math.abs(v-l.cond.T)<Math.abs(b-l.cond.T)?v:b,rps[0]);}
function renderRainEd(){
  const k=LN().rain,t=k.type||"road",num=(v,attr,lab)=>`<input type="number" step="any" ${attr} value="${v??""}" aria-label="${lab}">`;
  $("kType").value=t;
  let h="";
  if(t==="wamis"){
    const refs=BUILTIN_RAIN.filter(e=>e.g==="g2025");
    h=`<div class="calcline" style="margin-top:16px">${XE(k.region)} · ${XE(k.basin||"")} · ${XE(k.agency||"")} ${k.code} · 재현기간 ${rainRps(k).join(", ")}년 · 지속기간 1~72시간 확률강우량</div>
      <div class="grid2" style="grid-template-columns:minmax(0,530px)"><div class="f"><label for="kWSub">1시간 미만 강우강도</label><select id="kWSub">${["g25","gen","ratio"].map(v=>`<option value="${v}"${(k.sub||"ratio")===v?" selected":""}>${WSUB[v]}${v==="ratio"?" (기본)":""}</option>`).join("")}</select></div>
      <div class="f"><label for="kWRef">지침(2025) 기준지점 (①·③에 쓰는 1시간 미만 형태)</label><select id="kWRef">${refs.map(e=>`<option value="${e.code}"${k.ref&&+k.ref.code===+e.code?" selected":""}>${XE(e.name)}</option>`).join("")}</select></div></div>
      <p class="note" style="max-width:760px">WAMIS 확률강우량은 1시간부터 있습니다. 도시 관로처럼 도달시간이 1시간보다 짧으면 위에서 고른 방법으로 채웁니다. ③은 WAMIS 1시간 값에 맞추고 지속시간에 따른 변화만 가까운 지침 지점에서 빌려 옵니다. ②는 WAMIS 식을 1시간 아래로 늘린 값이라 짧은 지속시간에서 작게 나오는 편입니다. 어느 방법을 쓸지는 발주청과 협의하세요.</p>`;
  }else if(t==="road"){
    h=`<div class="grid2"><div class="f"><label for="kSep">단·장기간 분리 (분)</label><input id="kSep" type="number" step="10" data-k="rain.sep" value="${k.sep}"></div></div>
      <table class="mini"><thead><tr><th>상수</th><th>단기간</th><th>장기간</th></tr></thead><tbody>${["a","b","c","d","n"].map(c=>`<tr><th>${c}</th>${[["short","단기간"],["long","장기간"]].map(([s,lab])=>`<td>${num(k[s][c],`data-kk="${s}.${c}"`,lab+" "+c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <div class="f" style="max-width:530px"><label for="kRps">재현기간 목록 (년, 쉼표로 구분)</label><input id="kRps" type="text" value="${k.rps.join(", ")}"></div>`;
  }else if(t==="table"){
    h=`<div class="f" style="max-width:530px"><label for="kDurs">지속시간 (분, 쉼표로 구분)</label><input id="kDurs" type="text" value="${k.durs.join(", ")}"></div>
      <div class="tblwrap"><table class="mini rtab" style="max-width:none;width:auto"><thead><tr><th>T (년)</th>${k.durs.map(d=>`<th>${d}분</th>`).join("")}<th></th></tr></thead><tbody>${k.tbl.map((r,i)=>`<tr><td>${num(r.T,`data-kt="${i}.T"`,"재현기간")}</td>${k.durs.map((_,j)=>`<td>${num(r.v[j],`data-kt="${i}.${j}"`,"강우강도")}</td>`).join("")}<td><button type="button" class="rowbtn" data-kdel="${i}" aria-label="${r.T}년 줄 지우기">✕</button></td></tr>`).join("")}</tbody></table></div>`;
  }else{
    const ps=RTYPES[t].p;
    h=`<table class="mini rtab" style="max-width:${120+ps.length*130}px"><thead><tr><th>T (년)</th>${ps.map(p=>`<th>${p}</th>`).join("")}<th style="width:40px"></th></tr></thead><tbody>${k.rows.map((r,i)=>`<tr><td>${num(r.T,`data-kr="${i}.T"`,"재현기간")}</td>${ps.map(p=>`<td>${num(r[p],`data-kr="${i}.${p}"`,p)}</td>`).join("")}<td><button type="button" class="rowbtn" data-kdel="${i}" aria-label="${r.T}년 줄 지우기">✕</button></td></tr>`).join("")}</tbody></table>`;
  }
  if(t!=="road"&&t!=="wamis")h+=`<div class="toolbar" style="margin-top:8px"><button type="button" class="btn small" id="kAddRow">재현기간 줄 추가</button></div>
    <details class="pastebox"><summary>엑셀·PDF 표에서 붙여넣기</summary><p class="note">${t==="table"?"첫 줄에 지속시간(분), 다음 줄부터 재현기간과 강우강도를":"한 줄에 재현기간 "+RTYPES[t].p.join(", ")+" 순서로"} 넣으세요. 엑셀에서 복사한 칸(탭)이나 쉼표·공백으로 나뉜 값이면 됩니다.</p>
    <textarea id="kPaste" rows="5" aria-label="붙여넣을 표"></textarea><div class="toolbar"><button type="button" class="btn small primary" id="kPasteGo">표로 바꾸기</button></div></details>`;
  $("kEd").innerHTML=h;
}
const LIBSRC=[["wamis","WAMIS 지역빈도해석 · 확률강우량"],["g2025","도로 배수시설 설계 및 관리지침(2025) 부록 I · 확률강우강도표"],["p2011","확률강우량도 개선 및 보완 연구(2011) 부록 Ⅲ · 6차 다항식"],["user","직접 저장한 식"]];
const LIBINFO={  wamis:"환경부 홍수량 산정 표준지침(2019)의 지역빈도해석 확률강우량(WAMIS 제공, 2017년까지 강우자료)입니다. 전국 615개 관측소(기상청·환경부·수자원공사), 재현기간 2~500년, 지속기간 1~72시간. 도로 배수시설 지침(2025) 4.3.2가 설계강우강도를 WAMIS로 정하도록 한 자료입니다. 1시간 미만은 아래 식 형태 칸에서 채우는 방법을 고릅니다.",
  g2025:"국토교통부 도로 배수시설 설계 및 관리지침(2025.02) 부록 I의 지점별 확률강우강도(mm/hr) 표입니다. 69개 지점, 재현기간 2~500년, 지속시간 5분~72시간. 표 사이 값은 로그 보간합니다. 지침 본문은 설계강우강도를 WAMIS로 정하도록 하고 있으니, 최신 값이 필요하면 WAMIS 값을 표로 넣으세요.",
  p2011:"국토해양부 확률강우량도 개선 및 보완 연구(2011) 부록 Ⅲ의 지점별 6차 다항식 계수입니다. 69개 지점. 2025 지침 부록 표와 같은 자료에서 나온 식이라 값이 거의 같습니다(대부분 1% 이내).",
  user:"이 작업 파일에 직접 저장한 식입니다. 아래에서 형태와 상수를 넣고 \"지금 식을 목록에 저장\"을 누르면 여기에 들어갑니다."};
let WLIB=[];const buildWLIB=()=>{WLIB=WAMIS_ST.map(s=>({id:"w-"+s[0],g:"wamis",st:s[1],code:s[0],basin:s[2],name:`${s[1]} (${s[3]} ${s[0]})`,get rain(){return wamisRain(s[0]);}}));};buildWLIB();
const allLib=()=>[...WLIB,...BUILTIN_RAIN,...ST.rainLib.map(e=>({...e,g:"user"}))];
const libHit=(e,k)=>e.g==="wamis"?(k.type==="wamis"&&+e.code===+k.code):(k.type!=="wamis"&&e.rain.src===k.src&&e.rain.region===k.region);
function renderLib(keepSrc){
  const ss=$("kLibSrc"),cur=keepSrc?ss.value:null,lib=allLib(),k=LN().rain;
  ss.innerHTML=LIBSRC.map(([g,n])=>`<option value="${g}">${n} (${lib.filter(e=>e.g===g).length})</option>`).join("");
  let g=cur;if(!g){const m=lib.find(e=>libHit(e,k));g=m?m.g:(k.type==="table"?"g2025":k.type==="poly6"?"p2011":"g2025");}
  ss.value=g;fillLibSt(g);
}
function fillLibSt(g){
  const lib=allLib().filter(e=>e.g===g),sel=$("kLib"),k=LN().rain;
  if(g==="wamis"){const B=[...new Set(lib.map(e=>e.basin))].sort((a,b)=>a.localeCompare(b,"ko"));
    sel.innerHTML=B.map(b=>`<optgroup label="${XE(b)}">${lib.filter(e=>e.basin===b).sort((x,y)=>x.st.localeCompare(y.st,"ko")).map(e=>`<option value="${e.id}">${XE(e.name)}</option>`).join("")}</optgroup>`).join("");}
  else sel.innerHTML=lib.map(e=>`<option value="${e.id}">${XE(e.name)}</option>`).join("")||`<option value="">(비어 있음)</option>`;
  const m=lib.find(e=>libHit(e,k))||lib.find(e=>e.st===k.region&&(g!=="wamis"||e.code===23021159))||lib.find(e=>e.st==="부산");
  if(m)sel.value=m.id;
  $("kLibDel").hidden=g!=="user"; $("kLibInfo").textContent=LIBINFO[g]||""; $("wUp").hidden=g!=="wamis";
}
document.addEventListener("change",e=>{if(e.target.id==="kLibSrc")fillLibSt(e.target.value);});
const libName=k=>`${k.region||"지점 미상"} · ${k.src||RTYPES[k.type||"road"].nm}`;
const findLib=id=>allLib().find(x=>x.id===id);
document.querySelector('[data-p="rain_in"]').addEventListener("click",e=>{
  const l=LN(),k=l.rain,b=e.target.closest("button");if(!b)return;
  if(b.id==="kAddRow"){if(k.type==="table")k.tbl.push({T:"",v:k.durs.map(()=>"")});else k.rows.push({T:"",a:"",b:"",n:""});renderRainEd();update();}
  else if(b.dataset.kdel!=null){(k.type==="table"?k.tbl:k.rows).splice(+b.dataset.kdel,1);renderRainEd();fixT();fillRpSelect();update();}
  else if(b.id==="kPasteGo"){
    const lines=$("kPaste").value.trim().split(/\r?\n/).map(s=>s.trim().split(/[\t,;]+|\s+/).map(x=>x.replace(/년|분/g,"")).filter(x=>x!=="")).filter(x=>x.length);
    if(!lines.length){toast("붙여넣을 값이 없습니다.");return;}
    if(k.type==="table"){const head=lines[0].map(Number);const durs=(isFinite(head[0])&&head.length&&lines.length>1&&lines[0].length<lines[1].length?head:head.slice(1)).filter(v=>v>0);
      if(!durs.length){toast("첫 줄에 지속시간(분)을 넣어 주세요.");return;}
      k.durs=durs;k.tbl=lines.slice(1).map(r=>({T:+r[0],v:durs.map((_,j)=>isFinite(+r[j+1])?+r[j+1]:"")})).filter(r=>r.T>0);}
    else{const ps=RTYPES[k.type].p;const rows=lines.map(r=>r.map(Number)).filter(r=>r.length>=ps.length+1&&r.every(isFinite)&&r[0]>0);
      if(!rows.length){toast(`한 줄에 재현기간과 ${ps.join(", ")} 값이 있어야 합니다.`);return;}
      k.rows=rows.map(r=>{const o={T:r[0]};ps.forEach((p,j)=>o[p]=r[j+1]);return o;});}
    renderRainEd();fixT();fillRpSelect();update();toast("표를 넣었습니다.");}
  else if(b.id==="kLibApply"){const en=findLib($("kLib").value);if(!en)return;const sub=l.rain.type==="wamis"?l.rain.sub:null;l.rain=normRain(JSON.parse(JSON.stringify(en.rain)));if(sub&&l.rain.type==="wamis")l.rain.sub=sub;fixT();full();toast(`${en.name} · ${RTYPES[en.rain.type||"road"].nm}을 이 노선에 적용했습니다.`);}
  else if(b.id==="kLibSave"){const name=libName(k),ex=ST.rainLib.find(x=>x.name===name&&(x.rain.type||"road")===(k.type||"road"));
    if(ex){ex.rain=JSON.parse(JSON.stringify(k));toast(`목록의 "${name}"을 지금 식으로 고쳤습니다.`);}
    else{const id="r"+Date.now().toString(36);ST.rainLib.push({id,g:"user",st:k.region,name,rain:JSON.parse(JSON.stringify(k))});toast(`"${name}"을 직접 저장한 식에 넣었습니다.`);}
    persist();$("kLibSrc").value="user";fillLibSt("user");}
  else if(b.id==="kLibDel"){const id=$("kLib").value,en=ST.rainLib.find(x=>x.id===id);if(!en){toast("직접 저장한 식만 지울 수 있습니다.");return;}
    if(!libDelArm){libDelArm=true;b.textContent="한 번 더 누르면 삭제";setTimeout(()=>{libDelArm=false;b.textContent="목록에서 삭제";},4000);return;}
    libDelArm=false;b.textContent="목록에서 삭제";ST.rainLib=ST.rainLib.filter(x=>x.id!==id);fillLibSt("user");persist();toast(`"${en.name}"을 목록에서 지웠습니다. 노선에 적용된 식은 그대로입니다.`);}
});
let libDelArm=false;

$("cAll").addEventListener("click",()=>{const cur=LN(),n=ST.lines.length-1;if(!n){toast("노선이 하나뿐입니다.");return;}
  ST.lines.forEach(l=>{if(l!==cur)l.cond=JSON.parse(JSON.stringify(cur.cond));});full();toast(`설계조건(여유고 ${fx(mhFreeOf(cur.cond),2)} m 등)을 전 노선 ${n+1}개에 적용했습니다.`);});
/* 표 입력 칸: 화살표로 옆·위·아래 칸 이동 (엑셀처럼). 글자 칸의 ←→는 커서가 끝에 있을 때만. 표가 다시 그려져도 같은 자리로 */
(function(){
  const ok=x=>x&&!x.disabled&&!x.readOnly&&x.type!=="hidden"&&x.offsetParent!==null&&!/^(checkbox|radio|file|button)$/.test(x.type);
  const ins=c=>[...c.querySelectorAll("input,select")].filter(ok);
  const tablesOf=root=>[...root.querySelectorAll("table")];
  function find(P){const root=P.root&&P.root.isConnected?P.root:document;const tb=tablesOf(root)[P.t];if(!tb)return null;const tr=tb.rows[P.r];if(!tr)return null;
    if(P.h!=null)return ins(tr)[P.h]||null;const c=tr.cells[P.c];if(!c)return null;const cs=ins(c);return cs[Math.min(P.w,cs.length-1)]||null;}
  function go(P){const nx=find(P);if(!nx)return;nx.focus();try{nx.select&&nx.select();}catch(_){}}
  document.addEventListener("keydown",e=>{
    const el=e.target;if(!el||!/^(INPUT|SELECT)$/.test(el.tagName)||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
    if(/^(checkbox|radio|file)$/.test(el.type))return;
    const k=e.key;if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"].includes(k))return;
    const td=el.closest("td,th"),tr=td&&td.closest("tr"),tb=tr&&tr.closest("table");if(!tb)return;
    const root=tb.closest("[data-p]")||document,t=tablesOf(root).indexOf(tb),rows=[...tb.rows],ri=rows.indexOf(tr);let P=null;
    if(k==="ArrowLeft"||k==="ArrowRight"){
      if(el.tagName==="INPUT"&&el.type==="text"){try{const a=el.selectionStart,b=el.selectionEnd;if(a!==b)return;if(k==="ArrowLeft"&&a>0)return;if(k==="ArrowRight"&&a<el.value.length)return;}catch(_){}}
      const row=ins(tr),i=row.indexOf(el)+(k==="ArrowRight"?1:-1);if(i<0||i>=row.length)return;P={root,t,r:ri,h:i};}
    else{if(k==="Enter"&&el.tagName==="SELECT")return;
      const dir=k==="ArrowUp"?-1:1,w=Math.max(0,ins(td).indexOf(el)),c=td.cellIndex;
      for(let r=ri+dir;r>=0&&r<rows.length;r+=dir){const cc=rows[r].cells[c];if(cc&&ins(cc).length){P={root,t,r,c,w};break;}}
      if(!P)return;}
    e.preventDefault();
    if(el.tagName==="INPUT")el.dispatchEvent(new Event("change",{bubbles:true})); /* 값 확정 → 표가 다시 그려질 수 있음 */
    go(P);setTimeout(()=>{const a=document.activeElement;if(!a||a===document.body||!a.isConnected)go(P);},30);
  });
})();
