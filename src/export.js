/* ---------- 수리계산서 (화면 · docx 공용 블록) ---------- */
const NTBL=[["관거","시멘트관","0.011 ~ 0.015"],["관거","벽돌","0.013 ~ 0.017"],["관거","주철관","0.011 ~ 0.015"],["관거","콘크리트 (매끄러운 표면)","0.012 ~ 0.014"],["관거","콘크리트 (거친 표면)","0.015 ~ 0.017"],["관거","콘크리트관","0.011 ~ 0.015"],["관거","주름형 금속관","0.014 ~ 0.018"],["관거","아스팔트 라이닝","0.011 ~ 0.015"],["관거","플라스틱관 (매끄러운 표면)","0.011 ~ 0.015"],["관거","점토 (도관)","0.011 ~ 0.015"],["관거","점토 (깔판)","0.013 ~ 0.017"],["개거","아스팔트","0.013 ~ 0.017"],["개거","벽돌","0.012 ~ 0.018"],["개거","콘크리트","0.011 ~ 0.020"],["개거","자갈","0.020 ~ 0.035"],["개거","식물","0.030 ~ 0.040"]];
function reportBlocks(Rr,l){
  const c=Rr.c,k=Rr.k,B=[],last=Rr.rows[Rr.rows.length-1]||{};
  B.push({k:"title",t:"우수 수리계산서"},{k:"sub",t:`${ST.proj.name||""}${ST.proj.name?" · ":""}${l.name} · ${new Date().toLocaleDateString("ko-KR")}`});
  B.push({k:"h1",t:"1. 설계 개요"});
  B.push({k:"tb",head:["항목","내용"],w:[28,72],rows:[
    ["공사명",ST.proj.name||"-"],["노선",l.name],["관로",`${Rr.rows.length}구간, 연장 ${fx(Rr.len,2)} m`],["총 유역면적",`${fx(Rr.Atot,3)} ha`],
    ["설계빈도",`${Rr.T}년`],["강우강도",k.type==="wamis"?`${k.src} (${k.region}). 1시간 미만: ${WSUB[k.sub||"ratio"]}`:`${k.region} 지점 ${RTYPES[k.type||"road"].nm} (${k.src})`],
    ["계획우수량","합리식 Qd = 1/360 · I · ΣC·A (KDS 61 10 00 1.5.1)"],
    ["도달시간",`${c.road?`유입시간 ${c.tRoad}분(고정)`:"유입시간(Kerby 식)"} + 최상류 관로부터의 관내 유하시간, 강우지속기간 5분 이상`],
    ["관로 유량","Manning 식. 통수능 수심 원형관 "+(c.dPipe===1?"만류":c.dPipe)+", BOX 높이의 "+c.dBox*100+"% (KDS 61 40 00 1.2)"],
    ["허용 유속",`계획우수량에 대하여 ${c.vmin} ~ ${c.vmax} m/s (KDS 61 40 00 1.3)`],["토피",`적용 ${c.cvUse??1} m. 최소 흙두께 원칙 ${CVMIN} m (KDS 61 40 00 3.2), 불가피해도 ${CVABS} m 이상 + 보호공 (부산시 설계지침서 2025)`],["관 접합 단차",`적용 ${c.dropUse??0.05} m. 규정(고정): 최소 ${DROP.min} m (KDS 61 40 00 7.2, 3~10 cm), 최대 ${DROP.max} m (5.1, 1개소 1.5 m 이내), 부관 ${DROP.sub} m 이상 (5.1)`]]});
  B.push({k:"h1",t:"2. 강우강도"});
  const road=isRoad(k),P=rainParams(k);
  B.push({k:"eq",t:`${RTYPES[k.type||"road"].nm}   ${RTYPES[k.type||"road"].eq}    (mm/hr)\nT : 재현기간(년),  t : 강우지속시간(분)${road?",  a·b·c·d·n : 지역상수":""}`});
  if(k.type==="wamis"){const sub=k.sub||"ratio";
    B.push({k:"eq",t:`1시간 이상: I(t) = P(t) / t,  P : WAMIS 지속기간별 확률강우량(mm), 지속기간 사이는 ln I – ln t 보간\n${WSUBEQ[sub]}${sub!=="gen"&&k.ref?`   (I기준: 지침(2025) ${k.ref.region} 지점 확률강우강도표)`:""}`});
    B.push({k:"p",t:`${k.region} 지점(${k.basin||""}, ${k.agency||""} ${k.code})의 확률강우량은 환경부 홍수량 산정 표준지침(2019)의 지역빈도해석 결과(WAMIS, 2017년까지 강우자료)를 씁니다. 도로 배수시설 설계 및 관리지침(2025) 4.3.2에 따라 설계강우강도를 WAMIS 자료로 정했습니다. WAMIS 확률강우량은 1시간 이상만 있으므로, 1시간 미만은 "${WSUB[sub]}" 방법으로 구했습니다. 이 방법은 발주청과 협의한 것으로 합니다.`});
    B.push({k:"tb",cap:`- ${k.region} 지점 확률강우량 (mm)`,head:P.head,rows:P.rows});
    if(sub==="gen"&&k.gen)B.push({k:"tb",cap:`- 1시간 미만용 General형 식 I = a/(tⁿ+b) 상수 (위 확률강우량 1~${k.genFit||24}시간 강우강도에 ln 최소제곱으로 맞춤)`,head:["T (년)","a","b","n"],rows:k.gen.map(g=>[g.T+"년",fx(g.a,1),fx(g.b,3),fx(g.n,4)])});}
  else if(k.type==="table")B.push({k:"p",t:`${k.region} 지점 확률강우강도는 ${k.src||"입력한 표"}의 지속시간별 값을 쓰고, 표 사이 지속시간·재현기간은 로그 보간합니다. 값은 아래 확률 강우강도 표와 같습니다.`});
  else B.push({k:"tb",cap:road?`- ${k.region} 지점 지역상수 (단·장기간 분리 ${k.sep}분)`:`- ${k.region} 강우강도식 상수 (${k.src})`,head:P.head,rows:P.rows});
  if(road)B.push({k:"p",t:`관로마다 강우지속기간이 ${k.sep}분보다 짧으면 단기간, 길면 장기간 상수를 씁니다.`});
  else if(k.type!=="table"&&k.type!=="wamis")B.push({k:"p",t:"재현기간별 상수로 강우강도를 구하고, 표에 없는 재현기간은 ln T에 대해 보간합니다."});
  const dd=[5,10,20,30,60,120,180,360,720,1440];
  B.push({k:"tb",cap:"- 확률 강우강도 (mm/hr)",head:["T",...dd.map(d=>d+"분")],rows:rainRps(k).map(T=>[T+"년",...dd.map(d=>fx(rainI(k,T,d),1))])});
  B.push({k:"fig",svg:idfChartSVG(true),cap:"강우강도-지속시간 곡선"});
  B.push({k:"h1",t:"3. 도달시간"});
  B.push({k:"p",t:"도달시간은 유입시간과 유하시간의 합이며, 유하시간은 최상류 관로의 시작부터 해당 관로 끝까지의 거리를 계획유량에 대응한 유속으로 나누어 구합니다 (KDS 61 10 00 1.5.1(4)). 강우지속기간은 5분 이상을 적용합니다 (도로 배수시설 설계 및 관리지침 4.3.2)."});
  B.push({k:"h2",t:"3.1 유입시간 (t₁)"});
  if(c.road) B.push({k:"p",t:`유입시간은 ${c.tRoad}분을 고정값으로 적용합니다(참고: Kerby 식 값 ${fx(Rr.t1k,2)}분). KDS 61 10 00 1.5.1은 유입시간을 최소단위 배수구역의 지표면 특성으로 구하도록 하므로, 고정값은 다음 경우에 씁니다: 노면 배수처럼 집수 거리가 짧아 계산값이 5분보다 작은 경우 5분(도로 배수시설 설계 및 관리지침 4.3.2, 강우지속기간 5분 이상), 하수도정비기본계획이나 발주청이 유입시간을 정한 경우 그 값.`});
  B.push({k:"eq",t:`Kerby 식  t₁ = 36.264 · (L · N)^0.467 / S^0.2335   (L: km)  =  1.44 · (L · N / S^0.5)^0.467   (L: m)\nL = ${fx(l.inflow.L,1)} m,  H = ${fx(l.inflow.zTop,2)} − ${fx(l.inflow.zBot,2)} = ${fx(Rr.Hd,2)} m,  S = H / L = ${fx(Rr.S,4)}\nN = Σ(N·a)/Σa = ${fx(Rr.nK,3)}\nt₁ = 1.44 × (${fx(l.inflow.L,1)} × ${fx(Rr.nK,3)} / ${fx(Rr.S,4)}^0.5)^0.467 = ${isFinite(Rr.t1k)?fx(Rr.t1k,2)+" 분":"계산 불가 (S ≤ 0)"}${c.road?`  →  적용 ${c.tRoad}분`:Rr.t1Min?"  →  5분 미만이므로 5분 적용 (도로 배수시설 설계 및 관리지침 2025, 4.3.2)":""}`});
  B.push({k:"tb",cap:"- Kerby 식 조도 상수 N (도로 배수시설 설계 및 관리지침 2025, 표 4.3.4)",head:["표면 형태","N","적용면적 (ha)"],w:[60,20,20],rows:KERBY.map(([lab],i)=>[lab,fx(l.inflow.kerby[i].n,2),l.inflow.kerby[i].a?fx(l.inflow.kerby[i].a,2):"-"]).concat([["계","",fx(Rr.sumKA,2)]])});
  B.push({k:"h2",t:"3.2 유하시간 (t₂)"});
  B.push({k:"eq",t:"t₂ = L / V / 60   (분)\nL : 관로 연장(m),  V : 계획우수량이 흐를 때의 평균유속(m/s, Manning 식 등류수심)\n도달시간 t = t₁ + Σt₂ (최상류 관로부터 해당 관로까지)"});
  B.push({k:"h1",t:"4. 유출계수 및 유역면적"});
  const used=l.cvals.map((_,j)=>j).filter(j=>l.pipes.some(p=>+p.areas[j]));
  B.push({k:"tb",cap:"- 합리식 유출계수 C (도로 배수시설 설계 및 관리지침 2025, 표 4.3.1)",head:["유역 상태","C","유역 상태","C"],rows:Array.from({length:6},(_,i)=>[C_LABELS[i],String(l.cvals[i]),C_LABELS[i+6],String(l.cvals[i+6])])});
  B.push({k:"tb",cap:"- 관로별 유역면적 (ha)",head:["관로",...used.map(j=>`${C_LABELS[j]} (C=${l.cvals[j]})`),"계 A","가중 C"],rows:Rr.rows.map(r=>[String(r.no),...used.map(j=>+r.p.areas[j]?fx(+r.p.areas[j],3):"-"),fx(r.A,3),fx(r.C,3)]).concat([["계",...used.map(j=>fx(l.pipes.reduce((s,p)=>s+(+p.areas[j]||0),0),3)),fx(Rr.Atot,3),""]])});
  B.push({k:"h1",t:"5. 계획우수량"});
  B.push({k:"eq",t:`Qd = 1/360 · I · ΣC·A   (m³/s)\nI : 도달시간에 대한 강우강도(mm/hr, ${Rr.T}년 빈도),  ΣC·A : 해당 관로까지 상류 유역의 유출계수 × 면적 합(ha)`});
  const anyIn=Rr.rows.some(r=>r.inCA>0);
  B.push({k:"tb",head:["관로","A (ha)","C",...(anyIn?["인입 A (ha)","인입 ΣC·A (ha)"]:[]),"ΣC·A (ha)","t₁ (min)","t₂ (min)","Σt₂ (min)","t (min)","I (mm/hr)","Qd (m³/s)"],
    rows:Rr.rows.map(r=>[String(r.no),fx(r.A,3),fx(r.C,3),...(anyIn?[r.inA?fx(r.inA,3):"-",r.inCA?fx(r.inCA,4):"-"]:[]),fx(r.CA,4),fx(Rr.t1,2),fx(r.t2,2),fx(r.t2acc,2),fx(r.t,2),fx(r.I,2),fx(r.Qd,3)])});
  Rr.rows.filter(r=>r.inCA>0).forEach(r=>B.push({k:"p",t:`※ 관로 ${r.no}: 인입 관로 ${r.inl.filter(q=>!q.err).map(q=>`${q.id}(${q.line}, 면적 ${fx(q.A,3)} ha, ΣC·A ${fx(q.CA,4)} ha, 도달시간 ${fx(q.t,2)}분)`).join(", ")}의 유량을 합산했습니다. 시점 도달시간은 본선 상류와 인입 관로 중 큰 값 ${fx(r.tUp,2)}분을 씁니다.`}));
  B.push({k:"h1",t:"6. 관로 수리검토"});
  B.push({k:"eq",t:"V = 1/n · R^(2/3) · I^(1/2),   Q = A · V\nV : 평균유속(m/s),  n : 조도계수,  R = A/P : 경심(m),  I : 관저경사,  A : 통수단면적(m²),  P : 윤변(m)\n통수능: 원형관 "+(c.dPipe===1?"만류":"수심비 "+c.dPipe)+", BOX 높이의 "+c.dBox*100+"%.  유속 판정: 계획우수량이 흐를 때의 등류 유속"});
  B.push({k:"tb",cap:"- 관로 제원",grp:[["관로",1],["관로 측점",2],["연장 (m)",1],["지반고 (m)",2],["토피 (m)",2],["관저고 (m)",2],["시점 단차 (m)",1],["경사 (%)",1],["규격",1],["도로 측점",2]],
    head:["관로","시점","종점","연장 (m)","시점","종점","시점","종점","시점","종점","시점 단차 (m)","경사 (%)","규격","시점","종점"],w:[4,7.5,7.5,5.5,6.5,6.5,5.5,5.5,7,7,6,5.5,9,8,9],
    rows:Rr.rows.map(r=>[String(r.no),r.psta1,r.psta2,fx(r.len,2),fx(r.gl1,2),fx(r.gl2,2),fx(r.cv1,2),fx(r.cv2,2),fx(r.inv1,3),fx(r.inv2,3),isNum(r.drop)?fx(r.drop,3):"-",r.size?fx(r.slope*100,3):"-",r.size?r.size.label+(r.nrow>1?"×"+r.nrow:""):"?",String(r.sta1??""),String(r.sta2??"")])});
  B.push({k:"tb",cap:"- 통수능 및 유속 검토",head:["관로","통수 수심 (m)","A (m²)","R (m)","n","통수능 Q (m³/s)","Qd (m³/s)","흐름 수심 (m)","유속 V (m/s)","유속","유량","사용률"],
    rows:Rr.rows.filter(r=>r.size).map(r=>[String(r.no),fx(r.depth,3),fx(r.Aw,4),fx(r.R,4),fx(r.n,3),fx(r.Qc,3),fx(r.Qd,3),r.sur?"만관":fx(r.yd,3),fx(r.V,2),OKS(r.okV),OKS(r.okQ),fx(r.use*100,1)+"%"])});
  B.push({k:"tb",cap:"- 조도계수 n (참고)",head:["구분","재료","n"],w:[16,54,30],rows:NTBL});
  B.push({k:"h1",t:"7. 검토 결과"});
  const ng=Rr.rows.filter(r=>r.size&&!(r.okV&&r.okQ&&r.okJ!==false));
  B.push({k:"p",t:ng.length?`관로 ${ng.map(r=>r.no).join(", ")}이(가) 기준을 만족하지 않습니다. ${ng.map(r=>`${r.no}: ${!r.okV?`유속 ${fx(r.V,2)} m/s`:""}${!r.okV&&!r.okQ?", ":""}${!r.okQ?`통수능 ${fx(r.Qc,3)} < ${fx(r.Qd,3)} m³/s`:""}${r.okJ===false?`${!r.okV||!r.okQ?", ":""}접합 ${r.jWhy.join(", ")}`:""}`).join("; ")}.`
    :`${Rr.rows.length}개 관로 모두 계획우수량에 대한 유속 ${c.vmin}~${c.vmax} m/s, 통수능 ≥ 계획우수량을 만족합니다 (최종 계획우수량 ${fx(Rr.Qd,3)} m³/s, 최대 사용률 ${fx(Math.max(...Rr.rows.map(r=>r.use||0))*100,1)}%).`});
  Rr.notes.forEach(s=>B.push({k:"p",t:"※ "+s}));
  B.push({k:"land"},{k:"h1",t:"8. 도면"});
  profileSheets(Rr).sheets.forEach((s,i,a)=>B.push({k:"fig",svg:toSVG(s),cap:`우수 종단면도${a.length>1?` (${i+1}/${a.length})`:""}`,wide:true}));
  sectionSheets().forEach(s=>B.push({k:"fig",svg:toSVG(s),cap:"관로 단면도 (전체 노선)",wide:true}));
  if(l.img)B.push({k:"img",src:l.img,cap:"우수 유역도"});
  return B;
}
function renderReport(){
  const B=reportBlocks(R,LN());
  $("report").innerHTML=B.map(b=>{
    if(b.k==="title")return `<h2 style="border:0;font-size:22px;text-align:center;margin-top:6px">${XE(b.t)}</h2>`;
    if(b.k==="sub")return `<p class="note" style="text-align:center;max-width:none">${XE(b.t)}</p>`;
    if(b.k==="h1")return `<h2>${XE(b.t)}</h2>`; if(b.k==="h2")return `<h4>${XE(b.t)}</h4>`;
    if(b.k==="p")return `<p>${XE(b.t)}</p>`; if(b.k==="eq")return `<div class="eq">${XE(b.t)}</div>`;
    if(b.k==="tb")return `${b.cap?`<h4>${XE(b.cap.replace(/^- /,""))}</h4>`:""}<div class="tblwrap"><table class="t"><thead>${b.grp?(()=>{let j=0,top="",sub="";b.grp.forEach(([t,s])=>{if(s>1){top+=`<th colspan="${s}">${XE(t)}</th>`;for(let q=0;q<s;q++)sub+=`<th>${XE(b.head[j+q])}</th>`;}else top+=`<th rowspan="2">${XE(t)}</th>`;j+=s;});return `<tr>${top}</tr><tr>${sub}</tr>`;})():`<tr>${b.head.map(h=>`<th>${XE(h)}</th>`).join("")}</tr>`}</thead><tbody>${b.rows.map(r=>`<tr>${r.map(v=>`<td class="${v==="N.G"?"badc":v==="O.K"?"okc":""}">${XE(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    if(b.k==="fig")return `<div class="fig">${b.svg}</div><p class="cap">${XE(b.cap)}</p>`;
    if(b.k==="img")return `<div class="fig"><img src="${b.src}" alt="${XE(b.cap)}"></div><p class="cap">${XE(b.cap)}</p>`;
    return "";}).join("");
}

/* ---------- 파일 저장 ---------- */
let DL=null;const STANDALONE=!(window.claude&&window.claude.use);
(async()=>{try{DL=window.claude&&window.claude.use?await window.claude.use("downloads"):null;}catch(e){DL=null;}
  if(!DL&&!STANDALONE){["btnDxf","btnDocx","btnHwpx","btnXlsx","svExport"].forEach(id=>$(id).disabled=true);$("dlNote").textContent="이 화면에서는 파일 저장을 쓸 수 없습니다.";}})();
async function save(filename,data){
  if(!DL){if(STANDALONE){const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return;}toast("이 화면에서는 파일 저장을 쓸 수 없습니다.");return;}
  try{await DL.save({filename,data});toast(filename+" 저장을 요청했습니다.");}
  catch(e){const c=e&&e.code;toast(c==="declined"?"저장을 취소했습니다.":c==="rate_limited"?"이미 저장 창이 열려 있습니다. 잠시 후 다시 누르세요.":"저장하지 못했습니다 ("+(c||"오류")+").");}
}
function withLine(i,fn){const keep=LN0;LN0=()=>ST.lines[i];try{return fn();}finally{LN0=keep;}}
$("btnDxf").addEventListener("click",async()=>{
  if(typeof JSZip==="undefined"){toast("압축 라이브러리를 불러오지 못했습니다.");return;}
  const z=new JSZip();
  ST.lines.forEach((l,i)=>withLine(i,()=>{const Rr=RALL[i],nm=safe(l.name||"노선"+(i+1));
    const p=profileSheets(Rr).sheets; if(p.length)z.file(`${nm}_우수종단면도.dxf`,toDXF(p));
}));
  {const s=sectionSheets(); if(s.length)z.file(`관로단면도_전체노선.dxf`,toDXF(s));}
  {const P=planDraw((PLAN&&PLAN.S)||500);if(P.cnt)z.file(`우수관로_평면도_1-${(PLAN&&PLAN.S)||500}.dxf`,toDXF([P.d]));}
  z.file("읽어보기.txt",["우수 수리계산서 · CAD 도면","단위: mm (A3 용지 1:1). 여러 장은 가로로 30 mm 간격을 두고 나란히 놓았습니다.","글꼴: STANDARD (malgun.ttf). 종단면도 축척은 표제란에 적혀 있습니다.","레이어: GL 지반선 / PIPE 관로 / CONC 슬라브 / WATER 계획수위 / STR 접합부 / BAND 하단표 / DIM 치수 / NG 기준 미달"].join("\r\n"));
  save(`우수_CAD도면_${safe(ST.proj.name||"작업")}.zip`,await z.generateAsync({type:"blob"}));
});
$("btnXlsx").addEventListener("click",()=>{
  if(typeof XLSX==="undefined"){toast("엑셀 라이브러리를 불러오지 못했습니다.");return;}
  const wb=XLSX.utils.book_new();
  const add=(name,aoa,cols)=>{aoa=aoa.map(r=>(r||[]).map(v=>typeof v==="number"&&!isFinite(v)?"-":v==null?"":(typeof v==="object"?String(v):v)));const ws=XLSX.utils.aoa_to_sheet(aoa); /* NaN·Infinity 숫자는 엑셀이 손상으로 봄 → "-" */if(cols)ws["!cols"]=cols.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));};
  ST.lines.forEach((l,i)=>{const Rr=RALL[i],sfx=ST.lines.length>1?`(${i+1})`:"",k=Rr.k;
    add("설계조건"+sfx,[["◈ 설계조건",l.name],["공사명",ST.proj.name],["설계빈도(년)",Rr.T],["강우강도식",`${k.region} · ${k.src}`],["식 형태",`${RTYPES[k.type||"road"].nm}  ${RTYPES[k.type||"road"].eq}`],
      ...(k.type==="wamis"?[["1시간 미만",WSUB[k.sub||"ratio"]+(k.sub!=="gen"&&k.ref?` (기준지점 ${k.ref.region})`:"")],["확률강우량(mm)"]]:[]),
      rainParams(k).head,...rainParams(k).rows,[],
      ["유입시간 (Kerby)"],["유역면적 A(ha)",l.inflow.A],["유로연장 L(m)",l.inflow.L],["표고차 H(m)",Rr.Hd],["경사 S",Rr.S],["지체계수 n",Rr.nK],["t1 (Kerby, 분)",Rr.t1k],["적용 t1(분)",Rr.t1],[],
      ["도달시간","t1 + 최상류부터 누가 유하시간 (유속: 계획유량 등류)"],["유속 기준(m/s)",Rr.c.vmin,Rr.c.vmax],["수심비 원형/BOX",Rr.c.dPipe,Rr.c.dBox],["적용 토피(m)",Rr.c.cvUse??1],["최소 토피(m) 규정 원칙",CVMIN],["최소 토피(m) 불가피 시",CVABS],["최소 단차(m) 규정",DROP.min],["최대 단차(m) 규정",DROP.max],["부관 설치 단차(m) 규정",DROP.sub],["적용 단차(m)",Rr.c.dropUse??0.05]],[22,16,12,12,12,12]);
    add("유출량계산"+sfx,[["◈ 계획우수량(m³/s) [합리식] - "+l.name],["관로","A(ha)","C","인입 A(ha)","인입 ΣCA(ha)","인입 관로","ΣCA(ha)","t1(min)","t2(min)","Σt2(min)","t(min)","지속기간(min)","I(mm/hr)","Qd(m³/s)"],
      ...Rr.rows.map(r=>[r.no,RX(r.A,4),RX(r.C,3),r.inA?RX(r.inA,3):"",r.inCA?RX(r.inCA,4):"",(r.inl||[]).filter(q=>!q.err).map(q=>q.id).join(", "),RX(r.CA,4),RX(Rr.t1,2),RX(r.t2,2),RX(r.t2acc,2),RX(r.t,2),RX(r.tI,2),RX(r.I,2),RX(r.Qd,4)]),["계",RX(Rr.Atot,4),"","","","","","","","","","","",RX(Rr.Qd,4)]],[8,10,8,10,11,12,10,9,9,10,9,11,10,11]);
    add("관로계산"+sfx,[["◈ 계획관 검토 - "+l.name+` (${Rr.T}년 빈도)`],["번호","관로 측점 시점","관로 측점 종점","연장(m)","지반고 시점","지반고 종점","토피 시점","토피 종점","관저고 시점","관저고 종점","시점 단차(m)","경사(%)","규격","련수","통수 수심(m)","A(m²)","P(m)","R(m)","n","만류 V(m/s)","통수능 Q(m³/s)","Qd(m³/s)","흐름 수심(m)","계획 유속(m/s)","유속","유량","사용률","t2(min)","도로 측점 시점","도로 측점 종점"],
      ...Rr.rows.map(r=>[r.no,r.psta1,r.psta2,r.len,r.gl1,r.gl2,r.cv1,r.cv2,RX(r.inv1,3),RX(r.inv2,3),isNum(r.drop)?RX(r.drop,3):"",r.size?RX(r.slope*100,3):"",r.size?r.size.label:String(r.p.size),r.nrow,RX(r.depth,3),r.size?RX(r.Aw,4):"",r.size?RX(r.Pw,4):"",r.size?RX(r.R,4):"",r.n,RX(r.Vf,2),RX(r.Qc,3),RX(r.Qd,4),r.sur?"만관":RX(r.yd,3),RX(r.V,2),r.size?OKS(r.okV):"",r.size?OKS(r.okQ):"",r.size?RX(r.use,3):"",RX(r.t2,2),String(r.sta1??""),String(r.sta2??"")])],[6,11,11,8,9,9,8,8,9,9,9,8,12,5,9,8,8,8,7,9,10,9,9,10,6,6,7,7,11,11]);
    add("유역면적"+sfx,[["관로",...C_LABELS,"계 A","가중 C"],["C",...l.cvals],...Rr.rows.map(r=>[r.no,...r.p.areas.map(v=>+v||0),r.A,RX(r.C,3)])],[6,...C_LABELS.map(()=>11),9,8]);
  });
  const k=R.k; add("강우강도",[["◈ 강우강도(mm/hr) - "+k.region],["T(년) \\ t(분)",...DUR],...rainRps(k).map(T=>[T,...DUR.map(d=>RX(rainI(k,T,d),2))])],[12,...DUR.map(()=>8)]);
  save(`우수_수리계산표_${safe(ST.proj.name||"작업")}.xlsx`,new Uint8Array(XLSX.write(wb,{type:"array",bookType:"xlsx"})));
});
function svgToPng(svg,maxW=2400){return new Promise((res,rej)=>{const img=new Image();
  img.onload=()=>{let W=img.naturalWidth||1680,H=img.naturalHeight||1188;const sc=Math.min(8,maxW/W); /* 벡터라 작은 그림도 키워서 래스터 (흐림 방지) */W=Math.round(W*sc);H=Math.round(H*sc);const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const ctx=cv.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.drawImage(img,0,0,W,H);cv.toBlob(b=>b?b.arrayBuffer().then(buf=>res({buf,W,H,ext:"png"})):rej(new Error("png")),"image/png");};
  img.onerror=()=>rej(new Error("svg"));img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);});}
function dataUrlImg(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{fetch(src).then(r=>r.arrayBuffer()).then(buf=>res({buf,W:img.naturalWidth,H:img.naturalHeight,ext:"jpeg"})).catch(()=>{const b=atob(src.split(",")[1]);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);res({buf:u.buffer,W:img.naturalWidth,H:img.naturalHeight,ext:"jpeg"});});};img.onerror=rej;img.src=src;});}
async function buildDocx(){
  const B=reportBlocks(R,LN()),FONT="맑은 고딕",MONO="Consolas";
  const run=(t,o={})=>`<w:r><w:rPr><w:rFonts w:ascii="${o.mono?MONO:FONT}" w:hAnsi="${o.mono?MONO:FONT}" w:eastAsia="${FONT}"/>${o.b?"<w:b/>":""}${o.color?`<w:color w:val="${o.color}"/>`:""}<w:sz w:val="${o.sz||20}"/><w:szCs w:val="${o.sz||20}"/></w:rPr><w:t xml:space="preserve">${XE(t)}</w:t></w:r>`;
  const para=(inner,o={})=>`<w:p><w:pPr>${o.keep?"<w:keepNext/>":""}${o.border?`<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="1D5E88"/></w:pBdr>`:""}${o.shd?`<w:shd w:val="clear" w:color="auto" w:fill="${o.shd}"/>`:""}<w:spacing w:before="${o.before||0}" w:after="${o.after??80}"/>${o.ind?`<w:ind w:left="${o.ind}"/>`:""}${o.jc?`<w:jc w:val="${o.jc}"/>`:""}</w:pPr>${inner}</w:p>`;
  const TW=9638;
  const tbl=(head,rows,w,grp)=>{const ws=(w||head.map(()=>100/head.length)).map(v=>Math.round(TW*v/100)),sz=head.length>9?14:17;
    const cell=(t,wd,hd,x)=>{const s=String(t);const col=s==="N.G"?"B3261E":s==="O.K"?"2C7A4B":null;
      return `<w:tc><w:tcPr><w:tcW w:w="${wd}" w:type="dxa"/>${x||""}${hd?'<w:shd w:val="clear" w:color="auto" w:fill="E6ECF0"/>':""}<w:vAlign w:val="center"/></w:tcPr>${para(run(s,{sz,b:hd||!!col,color:col}),{jc:"center",after:0})}</w:tc>`;};
    return `<w:tbl><w:tblPr><w:tblW w:w="${TW}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(b=>`<w:${b} w:val="single" w:sz="4" w:space="0" w:color="8A949A"/>`).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="25" w:type="dxa"/><w:left w:w="50" w:type="dxa"/><w:bottom w:w="25" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map(x=>`<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid>${grp?(()=>{let j=0,a="",b2="";grp.forEach(([t,s])=>{const wd=ws.slice(j,j+s).reduce((p,q)=>p+q,0);
        if(s>1){a+=cell(t,wd,true,`<w:gridSpan w:val="${s}"/>`);for(let q=0;q<s;q++)b2+=cell(head[j+q],ws[j+q],true);}
        else{a+=cell(t,wd,true,'<w:vMerge w:val="restart"/>');b2+=cell("",wd,true,"<w:vMerge/>");}j+=s;});
      return `<w:tr><w:trPr><w:tblHeader/></w:trPr>${a}</w:tr><w:tr><w:trPr><w:tblHeader/></w:trPr>${b2}</w:tr>`;})():""}${(grp?rows:[head,...rows]).map((r,i)=>`<w:tr>${i===0&&!grp?'<w:trPr><w:tblHeader/></w:trPr>':""}${r.map((t,j)=>cell(t,ws[j],i===0&&!grp)).join("")}</w:tr>`).join("")}</w:tbl>`+para("",{after:120});};
  const imgs=[];let body="";
  let land=false;
  const pic=(im,cxCm,cap)=>{const maxH=land?15.2:22;cxCm=Math.min(cxCm,maxH*im.W/im.H);const id=imgs.length+1;imgs.push(im);const cx=Math.round(cxCm*360000),cy=Math.round(cx*im.H/im.W);
    return `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="그림 ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="fig${id}.${im.ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`+para(run(cap,{sz:18,color:"5B6970"}),{jc:"center",after:200});};
  for(const b of B){
    if(b.k==="title")body+=para(run(b.t,{b:true,sz:40}),{jc:"center",before:400,after:120});
    else if(b.k==="sub")body+=para(run(b.t,{sz:20,color:"5B6970"}),{jc:"center",after:360});
    else if(b.k==="h1")body+=para(run(b.t,{b:true,sz:26}),{before:300,after:120,border:true,keep:true});
    else if(b.k==="h2")body+=para(run(b.t,{b:true,sz:22}),{before:160,after:80,keep:true});
    else if(b.k==="p")body+=para(run(b.t,{sz:20}));
    else if(b.k==="eq")body+=b.t.split("\n").map((ln,i,a)=>para(run(ln,{mono:true,sz:18}),{shd:"F1F4F6",ind:200,after:i===a.length-1?120:0,keep:i<a.length-1})).join("");
    else if(b.k==="tb"){if(b.cap)body+=para(run(b.cap,{sz:20,b:true}),{keep:true});body+=tbl(b.head,b.rows,b.w,b.grp);}
    else if(b.k==="land"){body+=`<w:p><w:pPr><w:sectPr><w:footerReference w:type="default" r:id="rIdFt"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="851" w:footer="709" w:gutter="0"/></w:sectPr></w:pPr></w:p>`;land=true;}
    else if(b.k==="fig")body+=pic(await svgToPng(b.svg,3200),land?25:15.5,b.cap);
    else if(b.k==="img")body+=pic(await dataUrlImg(b.src),land?25:16.5,b.cap);
  }
  const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFt"/>${land?'<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1418" w:bottom="1134" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/>':'<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="851" w:footer="709" w:gutter="0"/>'}</w:sectPr></w:body></w:document>`;
  const fr=t=>`<w:r><w:rPr><w:sz w:val="16"/></w:rPr>${t}</w:r>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${fr(`<w:t xml:space="preserve">${XE(LN().name)} 우수 수리계산서  -  </w:t>`)}${fr('<w:fldChar w:fldCharType="begin"/>')}${fr('<w:instrText xml:space="preserve"> PAGE </w:instrText>')}${fr('<w:fldChar w:fldCharType="separate"/>')}${fr("<w:t>1</w:t>")}${fr('<w:fldChar w:fldCharType="end"/>')}</w:p></w:ftr>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const drels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${imgs.map((im,i)=>`<Relationship Id="rIdImg${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/fig${i+1}.${im.ext}"/>`).join("")}</Relationships>`;
  const z=new JSZip();z.file("[Content_Types].xml",ct);z.file("_rels/.rels",rels);z.file("word/document.xml",doc);z.file("word/styles.xml",styles);z.file("word/footer1.xml",footer);z.file("word/_rels/document.xml.rels",drels);
  imgs.forEach((im,i)=>z.file(`word/media/fig${i+1}.${im.ext}`,im.buf));
  return z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
/* ---------- 한글(HWPX) 수리계산서: 같은 내용(reportBlocks)을 OWPML로 ---------- */
function rotPng(im){return new Promise((res,rej)=>{const blob=new Blob([im.buf],{type:"image/png"}),u=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const cv=document.createElement("canvas");cv.width=img.naturalHeight;cv.height=img.naturalWidth;const c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,cv.width,cv.height);
    c.translate(0,cv.height);c.rotate(-Math.PI/2);c.drawImage(img,0,0);URL.revokeObjectURL(u);cv.toBlob(b=>b?b.arrayBuffer().then(buf=>res({buf,W:cv.width,H:cv.height,ext:"png"})):rej(new Error("png")),"image/png");};
  img.onerror=()=>rej(new Error("rot"));img.src=u;});}
async function buildHwpx(){
  const B=reportBlocks(R,LN()),T=HWPX_T,TW=48190,MM=283.465; // 본문 폭 170 mm (좌우 여백 20 mm)
  let head=T.head;const cnt=(tag,n)=>{head=head.replace(new RegExp(`<hh:${tag} itemCnt="(\\d+)"`),(m,c)=>`<hh:${tag} itemCnt="${+c+n}"`);};
  // 테두리·배경
  const BF=[],bfx=(o)=>{const id=3+BF.length,side=(nm,on)=>`<hh:${nm} type="${on?"SOLID":"NONE"}" width="${o.w||"0.12 mm"}" color="${o.c||"#8A949A"}"/>`,all=!!o.all,bt=all||o.bottom;
    BF.push(`<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>${side("leftBorder",all)}${side("rightBorder",all)}${side("topBorder",all)}${side("bottomBorder",bt)}<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>${o.fill?`<hc:fillBrush><hc:winBrush faceColor="${o.fill}" hatchColor="#999999" alpha="0"/></hc:fillBrush>`:""}</hh:borderFill>`);return id;};
  const bfCell=bfx({all:true}),bfHead=bfx({all:true,fill:"#E6ECF0"}),bfEq=bfx({fill:"#F1F4F6"}),bfH1=bfx({bottom:true,c:"#1D5E88",w:"0.4 mm"});
  // 글자 모양
  const CP=[],cpMap=new Map(),cp=(pt,color="#000000",bold=false)=>{const k=pt+color+bold;if(cpMap.has(k))return cpMap.get(k);const id=7+CP.length,L="hangul latin hanja japanese other symbol user".split(" "),at=v=>L.map(x=>`${x}="${v}"`).join(" ");
    CP.push(`<hh:charPr id="${id}" height="${Math.round(pt*100)}" textColor="${color}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef ${at(0)}/><hh:ratio ${at(100)}/><hh:spacing ${at(0)}/><hh:relSz ${at(100)}/><hh:offset ${at(0)}/>${bold?"<hh:bold/>":""}<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#B2B2B2" offsetX="10" offsetY="10"/></hh:charPr>`);cpMap.set(k,id);return id;};
  // 문단 모양 (간격: pt)
  const PP=[],ppMap=new Map(),pp=(o={})=>{const al=o.al||"JUSTIFY",k=JSON.stringify(o);if(ppMap.has(k))return ppMap.get(k);const id=20+PP.length,hu=v=>Math.round((v||0)*100),
      mg=`<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="${Math.round((o.ind||0)*MM)}" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="${hu(o.before)}" unit="HWPUNIT"/><hc:next value="${hu(o.after??4)}" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="${o.ls||150}" unit="HWPUNIT"/>`;
    PP.push(`<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="0" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="${al}" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="${o.keep?1:0}" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">${mg}</hp:case><hp:default>${mg}</hp:default></hp:switch><hh:border borderFillIDRef="${o.bf||2}" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="${o.bf?150:0}" connect="0" ignoreMargin="0"/></hh:paraPr>`);ppMap.set(k,id);return id;};
  let pid=1;const P=(text,c,p)=>`<hp:p id="${pid++}" paraPrIDRef="${p}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${c}">${text===""?"<hp:t/>":`<hp:t>${XE(text)}</hp:t>`}</hp:run></hp:p>`;
  // 표
  const tbl=(head0,rows,w,grp)=>{const n=head0.length,ws=(w||head0.map(()=>100/n)).map(v=>Math.round(TW*v/100));ws[n-1]+=TW-ws.reduce((a,b)=>a+b,0);const pt=n>9?7:8.5;
    const H=[];if(grp){const r1=[],r2=[];let j=0;grp.forEach(([t,s])=>{if(s>1){r1.push({t,c:j,cs:s,rs:1,h:1});for(let q=0;q<s;q++)r2.push({t:head0[j+q],c:j+q,cs:1,rs:1,h:1});}else r1.push({t,c:j,cs:1,rs:2,h:1});j+=s;});H.push(r1,r2);}
    else H.push(head0.map((t,c)=>({t,c,cs:1,rs:1,h:1})));
    const body=rows.map(r=>r.map((t,c)=>({t,c,cs:1,rs:1,h:0}))),all=[...H,...body],RH=1100;
    const tc=(x,ri)=>{const s=String(x.t??""),col=s==="N.G"?"#B3261E":s==="O.K"?"#2C7A4B":"#000000",wd=ws.slice(x.c,x.c+x.cs).reduce((a,b)=>a+b,0);
      return `<hp:tc name="" header="${x.h}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${x.h?bfHead:bfCell}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${P(s,cp(pt,col,!!x.h||col!=="#000000"),pp({al:"CENTER",after:0,ls:130}))}</hp:subList><hp:cellAddr colAddr="${x.c}" rowAddr="${ri}"/><hp:cellSpan colSpan="${x.cs}" rowSpan="${x.rs}"/><hp:cellSz width="${wd}" height="${RH*x.rs}"/><hp:cellMargin left="200" right="200" top="80" bottom="80"/></hp:tc>`;};
    return `<hp:p id="${pid++}" paraPrIDRef="${pp({al:"CENTER",after:6})}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${cp(10)}"><hp:tbl id="${1000+pid}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${all.length}" colCnt="${n}" cellSpacing="0" borderFillIDRef="${bfCell}" noAdjust="0"><hp:sz width="${TW}" widthRelTo="ABSOLUTE" height="${RH*all.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="200" right="200" top="80" bottom="80"/>${all.map((r,ri)=>`<hp:tr>${r.map(x=>tc(x,ri)).join("")}</hp:tr>`).join("")}</hp:tbl></hp:run></hp:p>`;};
  // 그림
  const imgs=[];const pic=(im,wMax,hMax,cap)=>{let w=wMax,h=Math.round(w*im.H/im.W);if(h>hMax){h=hMax;w=Math.round(h*im.W/im.H);}const k=imgs.length+1,ref=`BIN${String(k).padStart(4,"0")}`,id=5000+k;imgs.push({im,ref});
    return `<hp:p id="${pid++}" paraPrIDRef="${pp({al:"CENTER",after:2,keep:true,ls:100})}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${cp(10)}"><hp:pic textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" reverse="0" id="${id}" zOrder="${k}" numberingType="PICTURE" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${id}"><hp:offset x="0" y="0"/><hp:orgSz width="${w}" height="${h}"/><hp:curSz width="${w}" height="${h}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${Math.round(w/2)}" centerY="${Math.round(h/2)}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/></hp:imgRect><hp:imgClip left="0" right="${w}" top="0" bottom="${h}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${w}" dimheight="${h}"/><hc:img binaryItemIDRef="${ref}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:effects/><hp:sz width="${w}" height="${h}" widthRelTo="ABSOLUTE" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:shapeComment/></hp:pic></hp:run></hp:p>`+(cap?P(cap,cp(9,"#5B6970"),pp({al:"CENTER",after:10})):"");};
  let body="",land=false;const HMAX=Math.round(190*MM) /* 본문 높이 232 mm에서 캡션·문단 간격 뺌 */;
  for(const b of B){
    if(b.k==="title")body+=P(b.t,cp(20,"#000000",true),pp({al:"CENTER",before:20,after:6}));
    else if(b.k==="sub")body+=P(b.t,cp(10,"#5B6970"),pp({al:"CENTER",after:18}));
    else if(b.k==="h1")body+=P(b.t,cp(13,"#000000",true),pp({before:15,after:6,keep:true,bf:bfH1}));
    else if(b.k==="h2")body+=P(b.t,cp(11,"#000000",true),pp({before:8,after:4,keep:true}));
    else if(b.k==="p")body+=P(b.t,cp(10),pp({}));
    else if(b.k==="eq"){const ls=b.t.split("\n");body+=ls.map((ln,i)=>P(ln,cp(9),pp({ind:4,after:i===ls.length-1?6:0,keep:i<ls.length-1,bf:bfEq,ls:140}))).join("");}
    else if(b.k==="tb"){if(b.cap)body+=P(b.cap,cp(10,"#000000",true),pp({keep:true}));body+=tbl(b.head,b.rows,b.w,b.grp);}
    else if(b.k==="land")land=true; // 가로 도면은 90° 돌려 세로 쪽에 넣음
    else if(b.k==="fig"){let im=await svgToPng(b.svg,3200);if(land&&im.W>im.H)im=await rotPng(im);body+=pic(im,TW,HMAX,b.cap);}
    else if(b.k==="img"){const im=await dataUrlImg(b.src);body+=pic(im,TW,HMAX,b.cap);}
  }
  // 머리 (header.xml)
  head=head.replace("</hh:borderFills>",BF.join("")+"</hh:borderFills>");cnt("borderFills",BF.length);
  head=head.replace("</hh:charProperties>",CP.join("")+"</hh:charProperties>");cnt("charProperties",CP.length);
  head=head.replace("</hh:paraProperties>",PP.join("")+"</hh:paraProperties>");cnt("paraProperties",PP.length);
  if(imgs.length)head=head.replace("</hh:refList>",`<hh:binDataList itemCnt="${imgs.length}">${imgs.map((x,i)=>`<hh:binItem id="${i}" Type="Embedding" BinData="${x.ref}.${x.im.ext==="jpeg"?"jpg":"png"}" Format="${x.im.ext==="jpeg"?"jpg":"png"}"/>`).join("")}</hh:binDataList></hh:refList>`);
  // 본문 (section0.xml): 첫 문단에 쪽 설정 + 쪽 번호
  const secPr=T.secPr.replace('left="8504" right="8504"','left="5669" right="5669"');
  const first=secPr.replace(/<hp:run charPrIDRef="0">/,`<hp:run charPrIDRef="0">`)+`<hp:ctrl><hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"/></hp:ctrl></hp:run><hp:run charPrIDRef="0"><hp:t/></hp:run></hp:p>`;
  const sec=T.secOpen+first+body+"</hs:sec>";
  const title=`${LN().name} 우수 수리계산서`,now=new Date().toISOString().replace(/\.\d+Z$/,"Z");
  let hpf=T.hpf.replace("<opf:title/>",`<opf:title>${XE(title)}</opf:title>`).replace(/synthetic-fixture-author/g,"우수 수리계산서").replace(/2025-09-17T04:3\d:\d\dZ/g,now).replace(/<opf:meta name="date" content="text">[^<]*<\/opf:meta>/,`<opf:meta name="date" content="text">${now}</opf:meta>`);
  hpf=hpf.replace("</opf:manifest>",imgs.map(x=>`<opf:item id="${x.ref}" href="BinData/${x.ref}.${x.im.ext==="jpeg"?"jpg":"png"}" media-type="image/${x.im.ext==="jpeg"?"jpeg":"png"}" isEmbeded="1"/>`).join("")+"</opf:manifest>");
  const z=new JSZip(),F=(n,d,o={})=>z.file(n,d,{createFolders:false,...o});F("mimetype","application/hwp+zip",{compression:"STORE"});F("version.xml",T.version);F("Contents/header.xml",head);F("Contents/section0.xml",sec);
  F("Preview/PrvText.txt",title);F("settings.xml",T.settings);F("META-INF/container.rdf",T.rdf);F("Contents/content.hpf",hpf);F("META-INF/container.xml",T.container);F("META-INF/manifest.xml",T.manifest);
  imgs.forEach(x=>F(`BinData/${x.ref}.${x.im.ext==="jpeg"?"jpg":"png"}`,x.im.buf));
  return z.generateAsync({type:"blob",mimeType:"application/hwp+zip",compression:"DEFLATE"});
}
$("btnHwpx").addEventListener("click",async()=>{
  if(typeof JSZip==="undefined"){toast("압축 라이브러리를 불러오지 못했습니다.");return;}
  $("btnHwpx").disabled=true;toast("한글 수리계산서를 만드는 중입니다…");
  try{const blob=await buildHwpx(),nm=`${safe(LN().name)}_우수수리계산서`;if(!DL){await save(nm+".hwpx",blob);}else{ /* 이 화면의 저장 기능은 .hwpx 확장자를 받지 않음 → .zip 안에 넣어 줌 */const z=new JSZip();z.file(nm+".hwpx",blob,{compression:"STORE"});await save(nm+"_한글.zip",await z.generateAsync({type:"blob"}));toast("한글 파일은 이 화면에서 바로 저장할 수 없어 zip으로 묶었습니다. 압축을 풀면 .hwpx 파일이 나옵니다.");}}catch(e){toast("한글 수리계산서를 만들지 못했습니다: "+(e.message||e));}
  finally{$("btnHwpx").disabled=false;}
});
$("btnDocx").addEventListener("click",async()=>{
  if(typeof JSZip==="undefined"){toast("압축 라이브러리를 불러오지 못했습니다.");return;}
  $("btnDocx").disabled=true;toast("수리계산서를 만드는 중입니다…");
  try{const blob=await buildDocx();await save(`${safe(LN().name)}_우수수리계산서.docx`,blob);}catch(e){toast("수리계산서를 만들지 못했습니다: "+(e.message||e));}
  finally{$("btnDocx").disabled=false;}
});

/* ---------- 엑셀 양식(V5.0) 불러오기 ---------- */
$("impXlsx").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  if(typeof XLSX==="undefined"){toast("엑셀 라이브러리를 불러오지 못했습니다.");return;}
  const fr=new FileReader();fr.onload=()=>{try{importWorkbook(XLSX.read(new Uint8Array(fr.result),{type:"array",cellFormula:true}),f.name);}catch(err){showImp([`<b>읽지 못했습니다.</b> ${XE(err.message||err)}`]);}};fr.readAsArrayBuffer(f);});
function showImp(lines){const p=$("impPanel");p.hidden=false;p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><b>엑셀 불러오기</b><button class="btn small" type="button" id="impClose">닫기</button></div><ul>${lines.map(s=>`<li>${s}</li>`).join("")}</ul>`;$("impClose").onclick=()=>p.hidden=true;}
function importWorkbook(wb,fname){
  if(wb.SheetNames.includes("관로입력")){importBasic(wb,fname);return;} // 기본양식
  const sheet=pre=>wb.SheetNames.filter(n=>n.replace(/\s/g,"").startsWith(pre));
  const V=(ws,a)=>{const c=ws&&ws[a];return c?c.v:undefined;}, N=(ws,a)=>{const v=V(ws,a);return typeof v==="number"?v:parseFloat(v);};
  const sfx=n=>{const m=n.match(/\(([^)]*)\)\s*$/);return m?m[1].toLowerCase():"";};
  const pipeS=sheet("관로계산"); if(!pipeS.length)throw new Error("'관로계산' 시트가 없습니다. 우수 수리계산 V5.0 양식인지 확인하세요.");
  const rainWs=wb.Sheets[sheet("강우강도(").concat(sheet("강우강도"))[0]];
  const log=[],added=[];
  pipeS.forEach(pn=>{
    const tag=sfx(pn), pick=pre=>{const c=sheet(pre);return wb.Sheets[c.find(n=>sfx(n)===tag)||c[0]];};
    const P=wb.Sheets[pn],Q=pick("유출량계산"),I=pick("유입시");
    const l=SAMPLE_LINE(); l.img=null; l.rain=ROAD_RAIN();
    l.name=String(V(Q,"A2")||pn).replace(/^[-\s]+/,"").trim()||pn;
    // 강우강도
    if(rainWs){const r=rainWs;
      if(V(r,"B7"))l.rain.region=String(V(r,"B7")); if(isFinite(N(r,"C7")))l.rain.sep=N(r,"C7");
      const g=row=>({a:N(r,"E"+row),b:N(r,"G"+row),c:N(r,"I"+row),d:N(r,"K"+row),n:N(r,"M"+row)});
      const s=g(7),lg=g(8); if(Object.values(s).every(isFinite))l.rain.short=s; if(Object.values(lg).every(isFinite))l.rain.long=lg;
      if(V(r,"B2"))l.rain.src=String(V(r,"B2")).replace(/공식\(|\)$/g,m=>m==="공식("?"공식 · ":"");
      const rps=[],idx=[];for(let row=13;row<=40;row++){const T=N(r,"B"+row);if(isFinite(T)&&T>0){rps.push(T);idx.push([N(r,"X"+row),T]);}}
      if(rps.length)l.rain.rps=rps;
      const sel=N(Q,"AZ9"); const hit=idx.find(x=>x[0]===sel); if(hit)l.cond.T=hit[1]; else if(isFinite(N(Q,"AY13")))l.cond.T=N(Q,"AY13");
    }
    // 유출량 시트 조건
    if(Q){
      l.cond.road=String(V(Q,"AR9")||"").trim().toUpperCase()==="Y";
      for(let i=0;i<6;i++){const a=N(Q,"X"+(4+i)),b=N(Q,"AI"+(4+i));if(isFinite(a))l.cvals[i]=a;if(isFinite(b))l.cvals[6+i]=b;}
      
    }
    // 유입시간
    if(I){const g=a=>N(I,a); if(isFinite(g("G2")))l.inflow.A=g("G2"); if(isFinite(g("G3")))l.inflow.L=g("G3");
      if(isFinite(g("L4")))l.inflow.zTop=g("L4"); if(isFinite(g("P4")))l.inflow.zBot=g("P4");
      l.inflow.kerby=Array.from({length:6},(_,i)=>({n:isFinite(g("O"+(14+i)))?g("O"+(14+i)):KERBY[i][1],a:isFinite(g("Q"+(14+i)))?g("Q"+(14+i)):0}));}
    // 관로 조건
    const v1=N(P,"AZ1"),v2=N(P,"AZ2"),vmin=N(P,"BE2"),vmax=N(P,"BG2"),ch=N(P,"T2");
    if(isFinite(vmin))l.cond.vmin=vmin; if(isFinite(vmax))l.cond.vmax=vmax; if(isFinite(ch)&&ch>0)l.cond.chain=ch;
    const areaRow={}; if(Q){for(let row=13;row<=200;row++){const no=N(Q,"A"+row);if(!isFinite(no)){if(String(V(Q,"A"+row)??"").trim()==="계")break;continue;}if(areaRow[no])break;areaRow[no]=["B","D","F","H","J","L","N","P","R","T","V","X"].map(c=>{const v=N(Q,c+row);return isFinite(v)?v:0;});}}
    l.pipes=[];
    for(let row=4;row<=200;row++){const no=N(P,"B"+row);if(!isFinite(no))break;
      const sta=(a,b)=>{const x=V(P,a),y=V(P,b);return x==null&&y==null?"":`${x??0}+${y??0}`;};
      const size=V(P,"Q"+row);
      l.pipes.push({sta1:sta("C"+row,"E"+row),sta2:sta("G"+row,"I"+row),dir:String(V(P,"J"+row)??""),gl1:N(P,"K"+row),gl2:N(P,"L"+row),cv1:N(P,"M"+row),cv2:N(P,"N"+row),
        size:String(size??""),thk:N(P,"R"+row)||0,len:N(P,"AD"+row),nrow:N(P,"BA"+row)||1,n:N(P,"BF"+row)||0.013,areas:(areaRow[no]||Array(12).fill(0)).slice(0,12)});
    }
    if(!l.pipes.length){log.push(`<b>${XE(pn)}</b>: 관로 행이 없어 건너뜁니다.`);return;}
    l.pipes.forEach((p,i)=>{if(i>0){if(p.sta1===l.pipes[i-1].sta2)p.sta1="";if(p.gl1===l.pipes[i-1].gl2)p.gl1="";}});
    normLine(l);
    const g25=BUILTIN_RAIN.find(x=>x.g==="g2025"&&x.st===l.rain.region); let rainMsg="강우강도식은 엑셀에 적힌 식을 그대로 가져왔습니다.";
    if(g25){l.rain=normRain(JSON.parse(JSON.stringify(g25.rain)));rainMsg=`강우강도는 엑셀의 도로설계편람 식 대신 같은 지점(${g25.name})의 2025 지침 부록 표를 적용했습니다.`;}
    const Rr=compute(l), xl=(()=>{for(let row=4;row<=200;row++){if(!isFinite(N(P,"B"+row)))return N(P,"AM"+(row-1));}})();
    log.push(`<b>${XE(l.name)}</b> (${XE(pn)}): 관로 ${l.pipes.length}개, 유역 ${fx(Rr.Atot,3)} ha, ${l.cond.T}년 빈도. 최종 유출량 ${fx(Rr.Qd,3)} m³/s${isFinite(xl)?` (엑셀 저장값 ${fx(xl,3)} m³/s. 도구는 기준식으로 다시 계산하므로 값이 다릅니다)`:""}. ${rainMsg}`);
    added.push(l);
  });
  if(!added.length){showImp(log.length?log:["불러올 관로가 없습니다."]);return;}
  ST.lines.push(...added); ST.active=ST.lines.length-added.length; full();
  showImp([`${XE(fname)}에서 노선 ${added.length}개를 새 탭으로 추가했습니다. 기존 노선은 그대로 있습니다.`,...log,"유역도 그림은 엑셀에서 가져오지 않습니다. 유역도 탭에서 따로 넣어 주세요."]);
}

/* ---------- 시작 ---------- */
full(); showTab(TAB);
