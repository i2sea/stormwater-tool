/* ===== 우수 수리계산 엔진 · 합리식 + Manning (KDS 61 10 00 / 61 40 00:2025, 도로 배수시설 설계 및 관리지침 2025) ===== */
const RX=(v,d)=>{if(!isFinite(v))return v;const p=Math.pow(10,d);return Math.sign(v)*Math.round(Math.abs(v)*p+1e-9)/p;}; // Excel ROUND
const C_LABELS=["포장면·비탈면","가파른 산지","가파른 계곡 경작지","논","완만한 산지","완만한 경작지","도시지역","잡지","경작하는 평탄지","경작하는 평계곡","수림","밀림수림과 덤불숲"];
const C_VALUES=[0.9,0.8,0.8,0.8,0.7,0.7,0.7,0.6,0.5,0.6,0.3,0.2];
const KERBY=[["매끄러운 불투수 표면 (포장면)",0.02],["매끄러운 나지 (다져진 흙)",0.10],["빈약한 초지·경작지·거친 나지",0.20],["목초지·보통 초지",0.40],["활엽수림",0.60],["밀생 초지·침엽수림·낙엽 깊은 활엽수림",0.80]]; // Kerby 지체계수 N (도로 배수시설 설계 및 관리지침 2025 표 4.3.4, Kerby 1959) — 고정값
const KERBY_OLD=[0.02,0.1,0.2,0.5,0.4,0.8]; // 엑셀 V5.0 표 (기존 저장 작업 변환용)
const AK_LUT={box:[[1,1.25],[0.8,1.25],[0.5,1.33],[0.2,1.48]],pipe:[[1,1.03],[0.8,1.03],[0.5,1.33],[0.2,1.42]]};
function corrA(kind,ratio){let b=null;for(const [r,a] of AK_LUT[kind]) if(r>=ratio-1e-9&&(!b||r<b[0]))b=[r,a];return b?b[1]:AK_LUT[kind][0][1];}
function parseSize(s){
  s=String(s??"").trim().replace(/[×X*]/g,"x");
  const m=s.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/);
  if(m) return {kind:"box",B:+m[1]/1000,H:+m[2]/1000,label:`□${m[1]}×${m[2]}`};
  const d=parseFloat(s); if(isFinite(d)&&d>0) return {kind:"pipe",D:d/1000,label:`D${d}`};
  return null;
}
function secArea(z,n){return (z.kind==="box"?z.B*z.H:Math.PI*z.D*z.D/4)*(n||1);} // 단면적 (련수 포함)
function parseSta(s,chain){ // "2+10.23" → 2*chain+10.23
  const m=String(s??"").trim().match(/^(?:No\.?\s*)?(-?\d+)\s*\+\s*(\d+(?:\.\d+)?)$/i);
  if(!m) {const v=parseFloat(s);return isFinite(v)?v:null;}
  return (+m[1])*chain+(+m[2]);
}
const fmtSta=(d,chain)=>{let no=Math.floor(d/chain+1e-9);let r=RX(d-no*chain,2);if(r>=chain-0.005){no++;r=0;}const w=String(Math.max(1,Math.ceil(chain)-1)).length+3;return `${no}+${r.toFixed(2).padStart(w,"0")}`;}; // 0+00.00
function idf(k,T,t){return (k.a+k.b*Math.log(T/Math.pow(t,k.n)))/(k.c+k.d*Math.log(Math.sqrt(T)/t)+Math.sqrt(t));}
/* 강우강도식 형태 */
const RTYPES={road:{nm:"도로설계편람 일반식",eq:"I = (a + b·ln(T/tⁿ)) / (c + d·ln(√T/t) + √t)",p:[]},
  talbot:{nm:"Talbot형",eq:"I = a / (t + b)",p:["a","b"]},
  sherman:{nm:"Sherman형",eq:"I = a / tⁿ",p:["a","n"]},
  japanese:{nm:"Japanese형",eq:"I = a / (√t + b)",p:["a","b"]},
  general:{nm:"General형",eq:"I = a / (tⁿ + b)",p:["a","b","n"]},
  poly6:{nm:"전대수 6차 다항식",eq:"ln I = a + b·x + c·x² + d·x³ + e·x⁴ + f·x⁵ + g·x⁶,  x = ln t (t: 시간, hr)",p:["a","b","c","d","e","f","g"]},
  table:{nm:"지속시간별 강우강도표",eq:"표의 값을 지속시간·재현기간에 대해 로그 보간",p:[]},
  wamis:{nm:"WAMIS 지역빈도해석 확률강우량",eq:"I = P(t) / t  (P: 지속기간별 확률강우량, 1~72시간 로그 보간)",p:[]}};
const WSUB={g25:"① 1시간 미만은 지침(2025) 기준지점 확률강우강도표 그대로",gen:"② WAMIS 확률강우량(1~24시간)에 맞춘 General형 식을 1시간 미만으로 연장",ratio:"③ WAMIS 1시간 강우강도 × 지침(2025) 기준지점 지속시간 비율"};
const WSUBEQ={g25:"t < 60분: I(t) = I기준(t)",gen:"t < 60분: I(t) = a / (tⁿ + b)  (WAMIS 1~24시간 강우강도에 맞춘 General형, t: 분)",ratio:"t < 60분: I(t) = I₆₀ × I기준(t) / I기준(60)"};
const tblType=k=>k.type==="table"||k.type==="wamis";
function wHour(d,h){ // 1~72시간 확률강우량(mm) → 강우강도, ln I – ln h 보간
  const n=d.length; if(!n)return NaN; if(h<=1)return d[0];
  let i=Math.min(Math.floor(h),n-1); if(i<1)i=1; const h0=i,h1=i+1,I0=d[i-1]/h0,I1=d[i]/h1;
  return Math.exp(Math.log(I0)+(Math.log(I1)-Math.log(I0))*(Math.log(h)-Math.log(h0))/(Math.log(h1)-Math.log(h0)));
}
const isRoad=k=>!k.type||k.type==="road";
function rainRps(k){
  if(isRoad(k))return (k.rps||[]).slice();
  const src=tblType(k)?(k.tbl||[]):(k.rows||[]);
  return [...new Set(src.map(r=>+r.T).filter(v=>v>0))].sort((a,b)=>a-b);
}
function rowI(k,r,t){
  const a=+r.a,b=+r.b||0,n=+r.n;
  switch(k.type){
    case "talbot":return a/(t+b);
    case "sherman":return a/Math.pow(t,n);
    case "japanese":return a/(Math.sqrt(t)+b);
    case "general":return a/(Math.pow(t,n)+b);
    case "poly6":{const x=Math.log(t/60);let y=0;["a","b","c","d","e","f","g"].forEach((k2,i)=>{y+=(+r[k2]||0)*Math.pow(x,i);});return Math.exp(y);}
    case "table":{const d=(k.durs||[]).map(Number),v=(r.v||[]).map(Number),p=d.map((x,i)=>[x,v[i]]).filter(q=>q[0]>0&&q[1]>0).sort((x,y)=>x[0]-y[0]);
      if(!p.length)return NaN; if(p.length===1)return p[0][1];
      let i=p.findIndex(q=>q[0]>=t); if(i<=0)i=i===0?1:p.length-1; const [x0,y0]=p[i-1],[x1,y1]=p[i];
      return Math.exp(Math.log(y0)+(Math.log(y1)-Math.log(y0))*(Math.log(t)-Math.log(x0))/(Math.log(x1)-Math.log(x0)));}
    case "wamis":{const d=(r.d||[]).map(Number); if(t>=60)return wHour(d,t/60);
      const T=+r.T, sub=k.sub||"ratio";
      if(sub==="gen"){const g=(k.gen||[]).find(x=>+x.T===T); if(g)return (+g.a)/(Math.pow(t,+g.n)+(+g.b));}
      if(!k.ref)return NaN; const Ir=rainI(k.ref,T,t); if(sub==="g25")return Ir;
      return d[0]*Ir/rainI(k.ref,T,60);}
  }
  return NaN;
}
function rainI(k,T,t){
  if(isRoad(k))return idf(t<k.sep?k.short:k.long,T,t);
  const src=(tblType(k)?(k.tbl||[]):(k.rows||[])).filter(r=>+r.T>0).sort((x,y)=>x.T-y.T);
  if(!src.length)return NaN;
  const ex=src.find(r=>+r.T===+T); if(ex)return rowI(k,ex,t);
  if(src.length===1)return rowI(k,src[0],t);
  let i=src.findIndex(r=>+r.T>T); if(i<=0)i=i===0?1:src.length-1;
  const r0=src[i-1],r1=src[i],I0=rowI(k,r0,t),I1=rowI(k,r1,t);
  return I0+(I1-I0)*(Math.log(T)-Math.log(r0.T))/(Math.log(r1.T)-Math.log(r0.T));
}
function circSeg(D,ratio){ // 부분 충만 원형관 (ratio = 수심/관경)
  if(ratio>=1-1e-9) return {A:Math.PI*D*D/4,P:Math.PI*D};
  const th=2*Math.acos(1-2*ratio);return {A:D*D/8*(th-Math.sin(th)),P:D*th/2};
}
function secAt(s,y){ // 수심 y의 통수단면 (BOX는 개수로 형태)
  if(s.kind==="box")return {A:s.B*y,P:s.B+2*y};
  return circSeg(s.D,Math.min(1,y/s.D));
}
const manQ=(g,n,I)=>g.P>0?g.A/n*Math.pow(g.A/g.P,2/3)*Math.sqrt(I):0;
function flowDepth(s,n,I,q){ // 유량 q가 흐를 때의 등류수심과 유속. 통수능을 넘으면 만관 유속
  const yMax=s.kind==="box"?s.H:s.D*0.938, gMax=secAt(s,yMax), qMax=manQ(gMax,n,I);
  if(!(q>0)||!(I>0))return {y:0,V:0,sur:false};
  if(q>=qMax){const Af=s.kind==="box"?s.B*s.H:Math.PI*s.D*s.D/4;return {y:s.kind==="box"?s.H:s.D,V:q/Af,sur:true};}
  let lo=0,hi=yMax;for(let k=0;k<60;k++){const m=(lo+hi)/2;if(manQ(secAt(s,m),n,I)<q)lo=m;else hi=m;}
  const y=(lo+hi)/2,g=secAt(s,y);return {y,V:q/g.A,sur:false};
}

const DROP={min:0.03,max:1.5,sub:0.6}; const CVMIN=1.0, CVABS=0.6; // 최소 흙두께 원칙 1.0 m (KDS 61 40 00 3.2), 불가피해도 0.6 m 이상 (부산시 설계지침서 2025) — 고정
 // 관 접합 단차 규정값 (KDS 61 40 00 7.2, 5.1) — 고정
function compute(L,ext){ // ext(id): 다른 노선 관로의 {CA, t} (인입 관로)
  const c=L.cond, k=L.rain, inf=L.inflow, warns=[], notes=[], cvMin=CVMIN, dropMin=DROP.min, dropUse=isFinite(+c.dropUse)&&c.dropUse!==""?+c.dropUse:0.05, dropMax=DROP.max, dropSub=DROP.sub; const dMin=+c.dMin>0?+c.dMin:250;
  // ---- 유입시간 (Kerby: t = 1.44 (L·n/√S)^0.467, L m = 지침 36.264 (L·N)^0.467/S^0.2335, L km) ----
  const Hd=inf.zTop-inf.zBot, S=inf.L>0?Hd/inf.L:0;
  const sumKA=inf.kerby.reduce((s,r)=>s+(+r.a||0),0), sumNA=inf.kerby.reduce((s,r)=>s+(+r.n||0)*(+r.a||0),0);
  const nK=sumKA>0?sumNA/sumKA:0;
  const t1k=(S>0&&nK>0)?1.44*Math.pow(inf.L*nK/Math.sqrt(S),0.467):NaN;
  const t1Min=!c.road&&!(t1k>=5),t1=c.road?(+c.tRoad||5):(t1Min?5:t1k); /* Kerby 5분 미만·경사 없음 → 5분 (지침 4.3.2) */
  if(!c.road&&Math.abs(sumKA-inf.A)>1e-6) warns.push(`유입시간 Kerby n 적용면적 합계 ${RX(sumKA,3)} ha가 유역면적 ${inf.A} ha와 다릅니다.`);
  if(!c.road&&!(t1>0)) warns.push("유입시간을 계산할 수 없습니다. 유로연장·표고차·지체계수를 확인하세요.");
  const tMin=5; // 강우지속기간 5분 이상 (도로 배수시설 설계 및 관리지침 4.3.2)
  // ---- 관로 제원 ----
  const rows=[], small=[], shallow=[], tooShallow=[], big=[], crown=[]; let cum=0, prevGL=null, prevSta=null;
  L.pipes.forEach((p,i)=>{
    const r={i,idx:i+1,no:(p.id!=null&&String(p.id).trim()!=="")?String(p.id).trim():String(i+1),p};
    r.size=parseSize(p.size); r.len=+p.len||0; r.nrow=Math.max(1,+p.nrow||1); r.nAuto=i>0&&(p.n===""||p.n==null);r.n=(p.n!==""&&p.n!=null&&+p.n>0)?+p.n:(i>0&&rows[i-1]?rows[i-1].n:(+c.n||0.013)); // 조도계수: 비우면 앞 관로 값을 따라감 (1번 관은 설계조건 n)
    r.gl1=(p.gl1===""||p.gl1==null)?prevGL:+p.gl1; r.gl2=+p.gl2; r.cv1=+p.cv1; r.cv2=+p.cv2;
    r.cvAuto=i>0&&(p.cv1===""||p.cv1==null);
    r.sta1=(p.sta1===""||p.sta1==null)?prevSta:p.sta1; r.sta2=p.sta2; r.dir=p.dir||"";
    {const th=p.thk!=null?+p.thk||0:null,bx=r.size&&r.size.kind==="box"; // 두께: 원형관은 관 두께, BOX는 상부 슬라브
      r.T=(bx?(th??(+p.slab||0)):0)/1000; r.wall=(!bx?(th??(+p.wall||0)):0)/1000;}
    r.dist1=cum; cum+=r.len; r.dist2=cum;
    r.psta1=fmtSta(r.dist1,c.chain), r.psta2=fmtSta(r.dist2,c.chain);
    const ar=(p.areas||[]).map(v=>+v||0); r.A=ar.reduce((s,v)=>s+v,0);
    r.C=r.A>0?ar.reduce((s,v,j)=>s+v*(L.cvals[j]??0),0)/r.A:0;
    if(r.size){
      const s=r.size; r.hIn=s.kind==="box"?s.H:s.D; r.hStruct=s.kind==="box"?s.H+r.T:s.D+r.wall;
      const pv=rows[i-1];
      if(r.cvAuto&&pv&&pv.size){ // 시점 토피를 비우면: 상류관 관저고 − 적용 단차 (관경이 커지면 관정접합)
        r.inv1=pv.inv2-dropUse-Math.max(0,r.hIn-pv.hIn);
        (p.inl||[]).map(v=>String(v??"").trim()).filter(Boolean).forEach(id=>{const e=ext?ext(id):null;if(e&&!e.err&&e.size&&isFinite(e.inv2)){const qh=e.size.kind==="box"?e.size.H:e.size.D;r.inv1=Math.min(r.inv1,e.inv2-dropUse-Math.max(0,r.hIn-qh));}}); // 인입관보다도 낮게
        r.cv1=r.gl1-r.inv1-r.hStruct;
      }else r.inv1=r.gl1-r.cv1-r.hStruct;
      r.inv2=r.gl2-r.cv2-r.hStruct;
      if(p.inv2fix!==""&&p.inv2fix!=null&&isFinite(+p.inv2fix)){r.inv2Min=+p.inv2fix;if(r.inv2<r.inv2Min-1e-9){r.inv2=r.inv2Min;r.cv2=r.gl2-r.inv2-r.hStruct;r.inv2Fixed=true;}} // 종점 관저고 지정 = 최소값 (토피로 낸 관저고가 이보다 낮으면 이 값으로 올림)
      r.okJ=true;r.jWhy=[];
      r.dSmall=s.kind==="pipe"&&s.D*1000<dMin-1e-6; // 최소관경 부족: 판정(N.G)에는 넣지 않고 알림만
      if(pv&&pv.size&&secArea(s,r.nrow)<secArea(pv.size,pv.nrow)-1e-9){r.okJ=false;r.jWhy.push(`관경 감소 (상류 ${pv.size.label}${pv.nrow>1?"×"+pv.nrow:""} → ${s.label}${r.nrow>1?"×"+r.nrow:""})`);
        warns.push(`관로 ${pv.no}→${r.no}: 하류관(${s.label})이 상류관(${pv.size.label})보다 작습니다. 하수관로는 하류로 갈수록 관경을 줄이지 않습니다.`);}
      if(pv&&pv.size){r.drop=pv.inv2-r.inv1-Math.max(0,r.hIn-pv.hIn); // 단차: 관경이 커지면 관정 기준
        if(r.drop<dropMin-1e-6){r.okJ=false;r.jWhy.push(r.drop<0?`시점이 상류관 ${pv.no}보다 ${RX(-r.drop,3)} m 높음 (역단차)`:`단차 ${RX(r.drop,3)} m < 최소 ${dropMin} m`);}
        if(r.drop>dropMax+1e-6){r.okJ=false;r.jWhy.push(`단차 ${RX(r.drop,3)} m > 최대 ${dropMax} m`);}
        if(r.drop<dropMin-1e-6) warns.push(r.drop<0?`관로 ${pv.no}→${r.no} 접합: 하류관이 상류관보다 ${RX(-r.drop,3)} m 높습니다(관경이 커지면 관정 기준). 최소 단차 ${dropMin} m 이상 낮추세요.`:`관로 ${pv.no}→${r.no} 접합: 단차 ${RX(r.drop,3)} m가 최소 단차 ${dropMin} m보다 작습니다.`);
        if(r.drop>dropMax+1e-6) warns.push(`관로 ${pv.no}→${r.no} 접합: 단차 ${RX(r.drop,3)} m가 최대 단차 ${dropMax} m(KDS 61 40 00 5.1, 1개소 1.5 m 이내)를 넘습니다. 계단접합(1단 0.3 m 이내)·감세공·드롭샤프트를 검토하세요.`);
        if(r.drop>=dropSub-1e-9) big.push(`${pv.no}→${r.no} (${RX(r.drop,2)} m)`);
}
      r.slope=r.len>0?(r.inv1-r.inv2)/r.len:0; if(r.slope<=0&&r.len>0){r.okJ=false;r.jWhy.push(r.slope<0?"역경사 (종점이 시점보다 높음)":"경사 0");} r.Is=Math.max(0,r.slope);
      // 통수능: 원형 만류(수심비 dPipe), 직사각형 높이의 dBox (KDS 61 40 00 1.2)
      r.ratio=s.kind==="box"?c.dBox:c.dPipe; r.depth=r.hIn*r.ratio;
      const g=s.kind==="box"?{A:s.B*r.depth,P:s.B+2*r.depth}:circSeg(s.D,Math.min(1,r.ratio));
      r.Aw=g.A; r.Pw=g.P; r.R=g.P>0?g.A/g.P:0; r.R23=Math.pow(r.R,2/3);
      r.Vf=1/r.n*r.R23*Math.sqrt(r.Is); r.Qc=r.Aw*r.Vf*r.nrow;
      r.Imin=Math.pow(c.vmin*r.n/r.R23,2)*100; r.Imax=Math.pow(c.vmax*r.n/r.R23,2)*100;
      if(r.slope>0&&r.slope<0.001) warns.push(`관로 ${r.no}: 경사 ${RX(r.slope*100,3)}%가 0.1%보다 완만합니다. 시공 오차로 역경사·정체가 생기기 쉬우니 확인하세요.`);
      if(r.slope<=0) warns.push(`관로 ${r.no}: 관저고가 하류로 갈수록 같거나 높습니다 (경사 ${RX(r.slope*100,3)}%). 자연유하가 되지 않습니다.`);
      if(s.kind==="pipe"&&s.D*1000<dMin-1e-6) small.push(r.no);
    } else warns.push(`관로 ${r.no}: 규격 "${p.size}"을 읽을 수 없습니다. 원형관은 300, BOX는 600x700처럼 넣으세요.`);
    if(!(r.gl1>0)) warns.push(`관로 ${r.no}: 시점 지반고가 비어 있습니다.`);
    r.prot=!!(r.size&&r.size.kind!=="box")&&Math.min(r.cv1,r.cv2)<CVMIN-1e-9; // BOX는 보호공 없음
    r.protT=isFinite(+c.protT)&&+c.protT>0?+c.protT:0.15; // 관 보호공 (토피 1.0 m 미만)
    {const mc=Math.min(r.cv1,r.cv2);if(mc<CVABS-1e-9)tooShallow.push(`${r.no} (${RX(mc,2)} m)`);else if(mc<cvMin-1e-9&&r.prot) shallow.push(r.no);}
    prevGL=r.gl2; prevSta=r.sta2; rows.push(r);
  });
  if(small.length)warns.push(`최소관경 부족 — 관로 ${small.join(", ")}: 관경이 최소관경 ${dMin} mm보다 작습니다${dMin===250?" (KDS 61 40 00 2.3 우수관로 표준 250 mm)":""}. 판정에는 넣지 않았으니 확인하세요.`);
  if(big.length)notes.push(`단차 ${dropSub} m 이상 접합 ${big.join(", ")}: 부관 설치 대상입니다(KDS 61 40 00 5.1은 합류관·오수관 원칙, 부산시 설계지침서는 하수관로 단차 0.6 m 이상 부관 설치). 2호 이상 맨홀은 내부 부관.`);
  if(tooShallow.length)warns.push(`관로 ${tooShallow.join(", ")}: 토피가 불가피한 경우의 최소값 ${CVABS} m(부산시 설계지침서 2025)보다 얕습니다. 관로를 낮추거나 계획을 조정하세요.`);
  if(shallow.length)notes.push(`관로 ${shallow.join(", ")}: 토피가 최소 흙두께 원칙 ${cvMin} m(KDS 61 40 00 3.2)보다 얕습니다(0.6 m 이상). 관 보호공 등 조치를 검토하세요.`);
  // ---- 유달시간·강우강도·유출량 (상류부터 차례로) ----
  // 도달시간 = 유입시간 + 최상류 관로 시작부터 해당 관로 끝까지의 유하시간 (KDS 61 10 00 1.5.1)
  // 유하시간 = 관로 길이 ÷ 계획유량이 흐를 때의 유속
  const T=+c.T, road=isRoad(k); let CA=0, Acum=0, tUp=t1;
  const Iat=t=>road?idf(t<k.sep?k.short:k.long,T,t):rainI(k,T,t);
  rows.forEach(r=>{
    // 인입 관로: 다른 노선 관로 끝의 ΣC·A를 더하고, 도달시간은 큰 쪽 (합류점)
    r.inl=[];r.inCA=0;r.inA=0;let tIn=null;
    (r.p.inl||[]).map(v=>String(v??"").trim()).filter(Boolean).forEach(id=>{
      const e=ext?ext(id):{err:"계산 불가"};
      if(!e||e.err){r.inl.push({id,err:e?e.err:"계산 불가"});warns.push(`관로 ${r.no}: 인입 관로 ${id} — ${e?e.err:"계산 불가"}.`);return;}
      if(r.size&&e.size&&isFinite(e.inv2)&&isFinite(r.inv1)){const qh=e.size.kind==="box"?e.size.H:e.size.D,qd=e.inv2-r.inv1-Math.max(0,r.hIn-qh); // 인입관 접합 단차
        if(r.okJ==null){r.okJ=true;r.jWhy=[];}
        if(qd<dropMin-1e-6){r.okJ=false;r.jWhy.push(qd<0?`인입 ${id} 종점이 이 관 시점보다 ${RX(-qd,3)} m 낮음 (역단차)`:`인입 ${id} 단차 ${RX(qd,3)} m < 최소 ${dropMin} m`);warns.push(`관로 ${r.no}: 인입 관로 ${id} 접합 단차 ${RX(qd,3)} m — ${qd<0?"인입관이 받는 관보다 낮아 역류합니다":`최소 단차 ${dropMin} m보다 작습니다`}. 인입관 종점을 올리거나 이 관 시점을 낮추세요.`);}
        if(qd>dropMax+1e-6){r.okJ=false;r.jWhy.push(`인입 ${id} 단차 ${RX(qd,3)} m > 최대 ${dropMax} m`);}
        if(secArea(r.size,r.nrow)<secArea(e.size,e.nrow)-1e-9){r.okJ=false;r.jWhy.push(`인입 ${id}(${e.size.label})보다 관경 작음`);warns.push(`관로 ${r.no}: 인입 관로 ${id}(${e.size.label})보다 받는 관(${r.size.label})이 작습니다.`);}}
      if(isFinite(e.gl2)&&isFinite(r.gl1)&&Math.abs(e.gl2-r.gl1)>0.05+1e-9)warns.push(`관로 ${r.no}: 인입 관로 ${id} 종점 지반고 ${RX(e.gl2,2)} m와 받는 맨홀 지반고 ${RX(r.gl1,2)} m가 ${RX(Math.abs(e.gl2-r.gl1),2)} m 다릅니다. 같은 맨홀이면 지반고를 맞추세요.`);
      r.inl.push({id,CA:e.CA,A:e.A,t:e.t,Qd:e.Qd,line:e.line,size:e.size,inv2:e.inv2});r.inCA+=e.CA;r.inA+=(e.A||0);tIn=Math.max(tIn??-1,e.t);});
    if(tIn!=null&&tIn>tUp)tUp=tIn;
    CA+=r.C*r.A+r.inCA; r.CA=CA; Acum+=r.A+r.inA; r.Acum=Acum; r.tUp=tUp;
    let t2=0;
    for(let it=0;it<40;it++){
      const t=tUp+t2, tI=Math.max(tMin,t), I=Iat(tI), Qd=I*CA/360;
      let V=0,y=0,sur=false;
      if(r.size&&r.Is>0){const f=flowDepth(r.size,r.n,r.Is,Qd/r.nrow);V=f.V;y=f.y;sur=f.sur;}
      const nt2=V>0?r.len/V/60:0;
      Object.assign(r,{t,tI,I,Qd,V,yd:y,sur});
      if(Math.abs(nt2-t2)<1e-6){t2=nt2;break;} t2=nt2;
    }
    r.t2=t2; r.t=tUp+t2; r.tI=Math.max(tMin,r.t); r.t2acc=r.t-t1; r.kset=road?(r.tI<k.sep?"short":"long"):null;
    tUp=r.t;
    if(r.size){
      r.okV=r.V>=c.vmin-1e-9&&r.V<=c.vmax+1e-9; r.okQ=r.Qc>=r.Qd; r.use=r.Qc>0?r.Qd/r.Qc:NaN;
      r.okS=r.slope*100>=r.Imin-1e-9&&r.slope*100<=r.Imax+1e-9;
    }
  });
  if(rows.length&&!isFinite(rows[rows.length-1].I))warns.push("강우강도를 계산할 수 없습니다. 강우강도식 탭에서 상수와 재현기간을 확인하세요.");
  if(rows.some(r=>r.t<tMin))notes.push(`도달시간이 5분보다 짧은 관로는 강우지속기간 5분으로 강우강도를 구했습니다 (도로 배수시설 설계 및 관리지침 4.3.2).`);
  const ok=rows.filter(r=>r.size);
  const allOk=ok.length===rows.length&&rows.length>0&&ok.every(r=>r.okV&&r.okQ&&r.okJ!==false);
  return {L,c,k,T,t1,t1k,t1Min,Hd,S,nK,sumKA,rows,Qd:rows.length?rows[rows.length-1].Qd:0,
    Atot:rows.reduce((s,r)=>s+r.A,0),len:cum,allOk,warns,notes,tMin};
}
if(typeof module!=="undefined") module.exports={WSUB,wHour,compute,idf,rainI,rainRps,RTYPES,parseSize,parseSta,fmtSta,RX,C_LABELS,C_VALUES,KERBY,KERBY_OLD,flowDepth};
