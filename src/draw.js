/* ---------- 도면: 공통 그리기 목록 → SVG / DXF ---------- */
const LAY={FRAME:{c:"#1a2226",aci:7,w:.5},TITLE:{c:"#1a2226",aci:7,w:.25},GRID:{c:"#c5ccd0",aci:8,w:.13},BAND:{c:"#1a2226",aci:7,w:.18},
  GL:{c:"#8a6a3c",aci:32,w:.45},PIPE:{c:"#1d5e88",aci:5,w:.35},CONC:{c:"#5b6970",aci:8,w:.3},WATER:{c:"#2f7fb8",aci:140,w:.25},
  STR:{c:"#2c5a3f",aci:3,w:.3},DIM:{c:"#1d5e88",aci:4,w:.18},TEXT:{c:"#1a2226",aci:7,w:.2},NG:{c:"#b3261e",aci:1,w:.25},HATCH:{c:"#8a949a",aci:8,w:.13},INL:{c:"#c0581a",aci:30,w:.3},OUTL:{c:"#2c7a4b",aci:94,w:.3},SUBP:{c:"#8e3fa8",aci:6,w:.45},PROT:{c:"#6b7275",aci:8,w:.3},HGL:{c:"#0b3d91",aci:150,w:.35},
  MHL:{c:"#c0392b",aci:1,w:.3},PL_PIPE:{c:"#1d5e88",aci:5,w:.5},PL_NG:{c:"#b3261e",aci:1,w:.5},PL_MH:{c:"#2c5a3f",aci:3,w:.3},PL_TXT:{c:"#1a2226",aci:7,w:.2},PL_ARW:{c:"#1d5e88",aci:5,w:.3},
  BS_SUB:{c:"#5b6970",aci:8,w:.3},BS_BASIN:{c:"#1a2226",aci:7,w:.6},BS_FLOW:{c:"#3d6f99",aci:150,w:.18},BS_PATH:{c:"#c0581a",aci:30,w:.35},BS_TXT:{c:"#1a2226",aci:7,w:.2},BS_RIVER:{c:"#4aa3df",aci:140,w:.3}};
function Dw(W=420,H=297){
  const it=[];
  return {W,H,it,
    l(lay,pts,o={}){it.push({k:"l",lay,pts,...o});},
    rect(lay,x,y,w,h,o={}){it.push({k:"l",lay,pts:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],closed:true,...o});},
    t(lay,x,y,h,s,o={}){it.push({k:"t",lay,x,y,h,s:String(s),al:o.al||"l",va:o.va||"b",rot:o.rot||0,b:o.b});},
    c(lay,x,y,r,o={}){it.push({k:"c",lay,x,y,r,...o});}};
}
function toSVG(d,cls=""){
  const Y=y=>(d.H-y).toFixed(2), f=v=>(+v).toFixed(2);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.W} ${d.H}" width="${d.W*4}" height="${d.H*4}" class="${cls}" font-family="IBM Plex Sans KR,Malgun Gothic,Apple SD Gothic Neo,sans-serif"><rect width="${d.W}" height="${d.H}" fill="#ffffff"/>`;
  for(const e of d.it){const L=LAY[e.lay]||LAY.TEXT;
    if(e.k==="l"){const pts=e.pts.map(p=>f(p[0])+","+Y(p[1])).join(" ");
      s+=`<${e.closed?"polygon":"polyline"} points="${pts}" fill="${e.fill||"none"}" stroke="${e.noStroke?"none":L.c}" stroke-width="${e.w||L.w}"${e.dash?` stroke-dasharray="${e.dash}"`:""} stroke-linejoin="round"/>`;}
    else if(e.k==="hit") s+=`<polygon fill="transparent" stroke="none" class="phit${PROF.sel===e.pid?" sel":""}" data-pid="${XE(e.pid)}" points="${e.pts.map(p=>f(p[0])+","+Y(p[1])).join(" ")}"/>`;
    else if(e.k==="c") s+=`<circle cx="${f(e.x)}" cy="${Y(e.y)}" r="${f(e.r)}" fill="${e.fill||"none"}" stroke="${L.c}" stroke-width="${e.w||L.w}"/>`;
    else if(e.k==="t"){const an=e.al==="c"?"middle":e.al==="r"?"end":"start",db=e.va==="m"?"central":e.va==="t"?"hanging":"alphabetic";
      s+=`<text x="${f(e.x)}" y="${Y(e.y)}" font-size="${f(e.h*1.18)}" fill="${L.c}" text-anchor="${an}" dominant-baseline="${db}"${e.b?' font-weight="600"':""}${e.rot?` transform="rotate(${-e.rot} ${f(e.x)} ${Y(e.y)})"`:""}>${XE(e.s)}</text>`;}
  }
  return s+"</svg>";
}
const uni=s=>String(s).replace(/[^\x20-\x7e]/g,c=>"\\U+"+c.charCodeAt(0).toString(16).toUpperCase().padStart(4,"0"));
function toDXF(sheets){ // 여러 장을 가로로 나란히 (장 사이 30 mm)
  const o=[],w=(...a)=>{for(let i=0;i<a.length;i+=2)o.push(a[i],a[i+1]);},n=v=>(+v).toFixed(3);
  w(0,"SECTION",2,"HEADER",9,"$ACADVER",1,"AC1009",9,"$DWGCODEPAGE",3,"ANSI_949",9,"$INSUNITS",70,4,0,"ENDSEC");
  w(0,"SECTION",2,"TABLES");
  w(0,"TABLE",2,"LTYPE",70,2,0,"LTYPE",2,"CONTINUOUS",70,0,3,"Solid line",72,65,73,0,40,"0.0",0,"LTYPE",2,"DASHED",70,0,3,"__ __",72,65,73,2,40,"3.0",49,"2.0",49,"-1.0",0,"ENDTAB");
  const ks=Object.keys(LAY);w(0,"TABLE",2,"LAYER",70,ks.length);ks.forEach(k=>w(0,"LAYER",2,k,70,0,62,LAY[k].aci,6,"CONTINUOUS"));w(0,"ENDTAB");
  w(0,"TABLE",2,"STYLE",70,1,0,"STYLE",2,"STANDARD",70,0,40,"0.0",41,"0.9",50,"0.0",71,0,42,"2.5",3,"malgun.ttf",4,"",0,"ENDTAB");
  w(0,"ENDSEC",0,"SECTION",2,"ENTITIES");
  sheets.forEach((d,si)=>{const ox=si*(d.W+30);
    for(const e of d.it){
      if(e.k==="l"){if(e.noStroke)continue;w(0,"POLYLINE",8,e.lay,66,1,10,"0",20,"0",30,"0",70,e.closed?1:0);if(e.dash)w(6,"DASHED");e.pts.forEach(p=>w(0,"VERTEX",8,e.lay,10,n(p[0]+ox),20,n(p[1]),30,"0"));w(0,"SEQEND",8,e.lay);}
      else if(e.k==="c")w(0,"CIRCLE",8,e.lay,10,n(e.x+ox),20,n(e.y),30,"0",40,n(e.r));
      else if(e.k==="t"){const hj=e.al==="c"?1:e.al==="r"?2:0,vj=e.va==="m"?2:e.va==="t"?3:0;
        w(0,"TEXT",8,e.lay,10,n(e.x+ox),20,n(e.y),30,"0",40,n(e.h),1,uni(e.s));if(e.rot)w(50,n(e.rot));w(41,"0.9");if(hj||vj)w(72,hj,73,vj,11,n(e.x+ox),21,n(e.y),31,"0");}
    }});
  w(0,"ENDSEC",0,"EOF");
  return o.join("\r\n")+"\r\n";
}
/* 도면 틀·표제란 (A3, mm) */
function frame(d,title,sub,scale,no,tot){
  d.rect("FRAME",10,10,400,277,{w:.6}); d.rect("FRAME",5,5,410,287,{w:.13});
  const y0=10,y1=27; d.l("TITLE",[[10,y1],[410,y1]],{w:.4});
  const cols=[[10,"공사명",ST.proj.name||""],[165,"도면명",title],[250,"노선",title==="관로 단면도"?"전체 노선":(LN0().name||"")],[312,"축척",scale],[352,"도면번호",`${no} / ${tot}`],[382,"발주처",ST.proj.owner||""]];
  cols.forEach(([x,lab,val],i)=>{const x2=i<cols.length-1?cols[i+1][0]:410;if(i)d.l("TITLE",[[x,y0],[x,y1]]);
    d.t("TEXT",x+2,y1-4,1.8,lab);d.t("TEXT",(x+x2)/2,y0+5,lab==="공사명"?2.6:2.8,fitText(val,(x2-x)-4,lab==="공사명"?2.6:2.8),{al:"c",b:true});});
  if(ST.proj.firm)d.t("TEXT",408,y1+2,2.0,ST.proj.firm,{al:"r"});
  d.t("TEXT",210,276,6,title,{al:"c",b:true}); d.l("TEXT",[[210-title.length*3.4,274],[210+title.length*3.4,274]],{w:.4});
  if(sub)d.t("TEXT",210,268,2.8,sub,{al:"c"});
}
let LN0=()=>LN();
function fitText(s,w,h){s=String(s);const cw=c=>/[\x00-\x7f]/.test(c)?h*0.6:h*1.0;let t=0,out="";for(const c of s){t+=cw(c);if(t>w){return out+"…";}out+=c;}return out;}

/* ---------- 종단면도 ---------- */
const HS=[100,200,250,300,400,500,600,1000,1200,1500,2000,2500,3000,5000];
const VS=[50,100,150,200,250,300,500,1000];
let PROF={sh:0,sv:0}; // 0 = 자동
const PX0=58,PXW=342,BAND_Y=31,PY_TOP=262;
function profileLayout(Rr){
  const rows=Rr.rows.filter(r=>r.size&&isNum(r.inv1)&&isNum(r.gl1));
  const sh=PROF.sh||HS.find(s=>Rr.len*1000/s<=PXW-8)||HS[HS.length-1];
  // 장 나누기
  const pages=[];let cur=[],w=0;
  rows.forEach(r=>{const rw=r.len*1000/sh;if(cur.length&&w+rw>PXW-8){pages.push(cur);cur=[];w=0;}cur.push(r);w+=rw;});
  if(cur.length)pages.push(cur);
  return {sh,pages};
}
const BROWS=[ // [이름, 종류, 높이]
  ["측점","node",12],["지반고 (m)","node",13],["토피 (m)","node2",13],["관저고 (m)","node2",14],["맨홀 높이 (m)","node",12],["맨홀 규격","node",10],
  ["구간 연장 (m)","seg",6.5],["경사 (%)","seg",6.5],["계획유속 V (m/s)","seg",6.5],["유량 Qd / Q (m³/s)","seg",6.5],["관로 번호 · 규격","seg",6.5]];
// 표준맨홀 (KDS 61 40 00 표 1.7.1): 중간·기점 600/900/1200/1500/1800 이하 → 1~5호, 합류 400/600/800/900 이하 → 1~4호
const sizeMM=z=>!z?0:z.kind==="box"?Math.max(z.B,z.H)*1000:z.D*1000;
function mhSpec(D,merge){const T=merge?[[400,"1호"],[600,"2호"],[800,"3호"],[900,"4호"]]:[[600,"1호"],[900,"2호"],[1200,"3호"],[1500,"4호"],[1800,"5호"]];const f=T.find(x=>D<=x[0]+1e-6);return f?f[1]:"특수";}
function mhSpecAt(prev,next,inl){const ps=[prev&&prev.size,next&&next.size,...(inl||[]).filter(q=>!q.err).map(q=>q.size)].filter(Boolean);
  const merge=(inl||[]).some(q=>!q.err);return mhSpec(Math.max(0,...ps.map(sizeMM)),merge);}
function mhSpecOf(R2,t){return mhSpecAt(R2.rows[t.i-1],t,t.inl);}
const MH_D={"1호":0.9,"2호":1.2,"3호":1.5,"4호":1.8,"5호":2.1,"특수":2.4};
function nodeSpecAuto(nd){if(!nd.b&&nd.a){const tg=outTargets(nd.a);if(tg.length){const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.includes(tg[0].t));if(R2)return mhSpecOf(R2,tg[0].t);}}
  return mhSpecAt(nd.a,nd.b,nd.b?nd.b.inl:null);}
function nodeRef(nd,L0){ // 맨홀 설정이 저장된 노선·키 (다른 노선으로 들어가는 끝 맨홀은 받는 쪽)
  let L=L0||(typeof LN0==="function"?LN0():null),key=mhKey(nd);
  if(!nd.b&&nd.a){const tg=outTargets(nd.a);if(tg.length){const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.includes(tg[0].t));if(R2){L=R2.L;const pv=R2.rows[tg[0].t.i-1];key=pv?String(pv.no):"S:"+tg[0].t.no;}}}
  return {L,key};}
function nodeSpec(nd,L0){const {L,key}=nodeRef(nd,L0);const o=mhOvr(L,key);return o.spec&&MH_SPECS.includes(o.spec)?o.spec:nodeSpecAuto(nd);}
function nodeMaxD(nd){const ps=[nd.a&&nd.a.size,nd.b&&nd.b.size,...(nd.b&&nd.b.inl||[]).filter(q=>!q.err).map(q=>q.size)].filter(Boolean);return Math.max(0,...ps.map(sizeMM))/1000;}
function mhSq(nd,L0){ // 특수(사각) 맨홀 치수: 내부 가로(관로 방향)·세로, 벽 두께 (m). 비우면 최대 관경 + 0.6 m (최소 2.0 m), 벽 0.3 m
  const {L,key}=nodeRef(nd,L0),o=mhOvr(L,key),def=Math.max(2.0,Math.ceil((nodeMaxD(nd)+0.6)*10-1e-6)/10),num=v=>{const x=parseFloat(v);return isFinite(x)&&x>0?x:NaN;};
  const a=num(o.sqL),b=num(o.sqB),t=num(o.sqT);return {L:isFinite(a)?a:def,B:isFinite(b)?b:def,T:isFinite(t)?t:0.3,def,setL:isFinite(a),setB:isFinite(b),setT:isFinite(t)};}
const mhFreeOf=c=>{const v=+(c&&c.mhFree);return isFinite(v)&&v>0?v:0;}; // 맨홀 여유고: 관저에서 아래로
function mhFreeAt(L,key){const o=L&&L.mh&&L.mh[key];const v=o&&o.free!=null&&o.free!==""?+o.free:NaN;return isFinite(v)&&v>=0?v:mhFreeOf(L&&L.cond);} // 맨홀별 여유고 (맨홀 탭) 없으면 설계조건
function mhHeight(R2,t){const pv=R2.rows[t.i-1];const lo=Math.min(t.inv1,pv&&isFinite(pv.inv2)?pv.inv2:Infinity,...(t.inl||[]).filter(q=>!q.err&&isFinite(q.inv2)).map(q=>q.inv2));return mhRound(t.gl1-lo+mhFreeAt(R2.L,pv?String(pv.no):"S:"+t.no));}
const mhRound=H=>isFinite(H)?Math.ceil(H*10-1e-6)/10:H; // 맨홀 높이: 0.1 m 올림
function outTargets(r){const out=[];(typeof RALL!=="undefined"?RALL:[]).forEach(R2=>R2&&R2.rows.forEach(t=>(t.inl||[]).forEach(q=>{if(!q.err&&q.id===r.no)out.push({t,mh:mhHeight(R2,t)});})));return out;}
/* 동수경사선 (HGL): 하류단에서 상류로. 관 마찰손실만 (맨홀 손실 제외).
   하류단 = 등류수심 (통수능 초과면 관정), 다른 노선으로 들어가면 받는 관 시점 HGL과 큰 쪽.
   압력류(통수능 초과 또는 하류 수위가 관정 이상): h1 = h2 + Sf·L, Sf = (Q·n / (A·R^2/3))² 만관 기준.
   자유수면: h1 = max(시점 관저 + 등류수심, h2) (배수위는 수평으로 근사). 지반을 넘으면 맨홀 넘침으로 보고 지반고에서 다시 시작 */
const HGLC=new WeakMap();
function hglOf(Rr,depth=0){if(!Rr)return null;if(HGLC.has(Rr))return HGLC.get(Rr);
  const rows=Rr.rows.filter(r=>r.size&&isFinite(r.inv1)&&isFinite(r.inv2)),H=new Map();
  for(let i=rows.length-1;i>=0;i--){const r=rows[i],s=r.size,hIn=r.hIn,yd=Math.min(hIn,Math.max(0,r.yd||0));
    let h2;
    if(i===rows.length-1){h2=r.inv2+(r.sur?hIn:yd);
      const tg=outTargets(r);if(tg.length&&depth<6){const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.includes(tg[0].t));const H2=R2&&hglOf(R2,depth+1);const th=H2&&H2.get(tg[0].t.no);if(th)h2=Math.max(h2,th.h1);}}
    else h2=Math.max(r.inv2+(r.sur?hIn:yd),H.get(rows[i+1].no).h1);
    const A=s.kind==="box"?s.B*s.H:Math.PI*s.D*s.D/4,P=s.kind==="box"?2*(s.B+s.H):Math.PI*s.D,q=(r.Qd||0)/(r.nrow||1),Sf=Math.pow(q*r.n/(A*Math.pow(A/P,2/3)),2);
    const press=r.sur||h2>=r.inv2+hIn-1e-6;
    let h1=press?Math.max(h2+Sf*r.len,r.inv1+yd):Math.max(r.inv1+yd,h2),ov1=0,ov2=0;
    if(i===rows.length-1&&h2>r.gl2){ov2=h2-r.gl2;h2=r.gl2;}
    if(h1>r.gl1){ov1=h1-r.gl1;h1=r.gl1;} // 지반을 넘으면 맨홀에서 넘침 → 수위는 지반고로 (넘침 높이 따로 표시)
    H.set(r.no,{h1,h2,press,Sf,ov1,ov2});}
  HGLC.set(Rr,H);return H;}
function profileSheets(Rr){
  const {sh,pages}=profileLayout(Rr); const out=[];
  pages.forEach((rows,pi)=>{
    const d=Dw(); const d0=rows[0].dist1;
    let zmin=Infinity,zmax=-Infinity; rows.forEach(r=>{zmin=Math.min(zmin,r.inv1,r.inv2);zmax=Math.max(zmax,r.gl1,r.gl2);}); {const last=rows[rows.length-1],tg=last?outTargets(last):[];if(tg.length){zmin=Math.min(zmin,tg[0].t.gl1-tg[0].mh);zmax=Math.max(zmax,tg[0].t.gl1);}
      rows.forEach(r=>(r.inl||[]).forEach(q=>{if(!q.err&&isFinite(q.inv2))zmin=Math.min(zmin,q.inv2);}));}
    {const HG=hglOf(Rr);rows.forEach(r=>{const h=HG&&HG.get(r.no);if(h)zmax=Math.max(zmax,h.h1,h.h2);});}
    zmin-=Math.max(mhFreeOf(Rr.c),...Object.values(Rr.L.mh||{}).map(o=>+o.free||0))+0.15;
    const bandTop=BAND_Y+BROWS.reduce((s,b)=>s+b[2],0), py0=bandTop+8, ph=PY_TOP-py0-6-26; /* 맨홀 인출선 자리 */
    const sv=PROF.sv||VS.find(s=>(zmax-zmin+1.5)*1000/s<=ph)||VS[VS.length-1];
    const step=[0.5,1,2,5,10,20].find(s=>(zmax-zmin+2)/s<=14)||50;
    const DL=Math.floor((zmin-0.6)/step)*step;
    const X=dist=>PX0+4+(dist-d0)*1000/sh, Yz=z=>py0+(z-DL)*1000/sv;
    const xEnd=X(rows[rows.length-1].dist2), yTopZ=Math.min(PY_TOP-2,Yz(zmax+0.6));
    frame(d,"우수 종단면도",`${LN0().name} · 관로 ${rows[0].no}~${rows[rows.length-1].no}`,`H=1:${sh}, V=1:${sv}`,pi+1,pages.length);
    // 표고 눈금
    d.l("GRID",[[PX0,py0],[PX0,yTopZ]],{w:.25});
    for(let z=DL;Yz(z)<=yTopZ+1e-6;z+=step){const y=Yz(z);d.l("GRID",[[PX0,y],[xEnd+4,y]]);d.l("BAND",[[PX0-1.5,y],[PX0,y]]);d.t("TEXT",PX0-2.5,y,2.0,z.toFixed(step<1?1:0),{al:"r",va:"m"});}
    d.t("TEXT",PX0-2.5,yTopZ+3,2.0,"EL.(m)",{al:"r"});
    d.t("TEXT",PX0+2,py0+1.2,2.0,`D.L = ${DL.toFixed(2)}`);
    // 지반선
    const gpts=[];rows.forEach((r,i)=>{if(i===0)gpts.push([X(r.dist1),Yz(r.gl1)]);else if(Math.abs(r.gl1-rows[i-1].gl2)>1e-6)gpts.push([X(r.dist1),Yz(r.gl1)]);gpts.push([X(r.dist2),Yz(r.gl2)]);});
    d.l("GL",gpts,{w:.5});
    for(let i=0;i<gpts.length-1;i++){const [a,b]=[gpts[i],gpts[i+1]],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=2;s<len;s+=3){const t=s/len,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;d.l("GL",[[x,y],[x-1.2,y-1.4]],{w:.18});}}
    // 관로
    rows.forEach(r=>{const x1=X(r.dist1),x2=X(r.dist2),h=r.hIn,s=r.size,ng=!(r.okV&&r.okQ&&r.okJ!==false); // N.G 관은 빨간 선
      const bot=[[x1,Yz(r.inv1)],[x2,Yz(r.inv2)]], top=[[x2,Yz(r.inv2+h)],[x1,Yz(r.inv1+h)]];
      { // 관 안 물: 계획우수량이 흐를 때 수심만큼 (통수능을 넘으면 만관)
        const yw=r.sur?h:Math.min(h,Math.max(0,r.yd||0));
        if(r.prot){const pt=r.protT;d.l("PROT",[[x1,Yz(r.inv1-pt)],[x2,Yz(r.inv2-pt)],[x2,Yz(r.inv2+r.hStruct+pt)],[x1,Yz(r.inv1+r.hStruct+pt)]],{closed:true,fill:"#d9dcda"});} // 관 보호공
        d.l("PIPE",[...bot,...top],{closed:true,fill:"#ffffff",noStroke:true});
        if(yw>0){d.l("WATER",[[x1,Yz(r.inv1)],[x2,Yz(r.inv2)],[x2,Yz(r.inv2+yw)],[x1,Yz(r.inv1+yw)]],{closed:true,fill:r.sur?"#f3c9c4":"#bfdcf0",noStroke:true});
          if(!r.sur)d.l("WATER",[[x1,Yz(r.inv1+yw)],[x2,Yz(r.inv2+yw)]],{w:.25});}
        d.l(ng?"NG":"PIPE",[...bot,...top],{closed:true,w:ng?.6:.35});}
      if(s.kind==="box"&&r.T>0)d.l("CONC",[[x1,Yz(r.inv1+h)],[x2,Yz(r.inv2+h)],[x2,Yz(r.inv2+h+r.T)],[x1,Yz(r.inv1+h+r.T)]],{closed:true,fill:"#dfe3e2"});

      const xm=(x1+x2)/2, ym=Yz((r.inv1+r.inv2)/2+r.hStruct)+5;
      {const hw=Math.max(2.3,String(r.no).length*0.95+1.2);d.l(ng?"NG":"TEXT",[[xm-hw,ym-2],[xm+hw,ym-2],[xm+hw,ym+2],[xm-hw,ym+2]],{closed:true,fill:"#ffffff",w:ng?.4:.25});} d.t(ng?"NG":"TEXT",xm,ym,2.2,r.no,{al:"c",va:"m",b:true});
      d.t("PIPE",xm,ym+4,1.9,`${s.label}${r.nrow>1?"×"+r.nrow:""}  L=${fx(r.len,2)}  S=${fx(r.slope*100,2)}%`,{al:"c"});
      if(!(r.okV&&r.okQ&&r.okJ!==false))d.t("NG",xm,ym+7.2,1.9,"N.G",{al:"c",b:true});
      {const inl=(r.inl||[]).filter(q=>!q.err);if(inl.length){ // 인입 관로: 시점 맨홀에 화살표와 번호
        inl.forEach((q,k)=>{if(!q.size||!isFinite(q.inv2))return; // 맨홀에 인입관 단면 (관저고 위치, 세로 축척)
          const sv=Math.abs(Yz(1)-Yz(0)),xc=x1+(k-(inl.length-1)/2)*0.4;
          if(q.size.kind==="box"){const w=q.size.B*sv,hh=q.size.H*sv,y0=Yz(q.inv2);d.l("INL",[[xc-w/2,y0],[xc+w/2,y0],[xc+w/2,y0+(Yz(q.inv2+q.size.H)-y0)],[xc-w/2,y0+(Yz(q.inv2+q.size.H)-y0)]],{closed:true,fill:"#fbe3d3",w:.3});}
          else{const rr=q.size.D/2*sv;d.c("INL",xc,Yz(q.inv2+q.size.D/2),rr,{fill:"#fbe3d3",w:.3});}});}}
    });
    {const HG=hglOf(Rr);if(HG){ // 동수경사선
      const pts=[];rows.forEach(r=>{const h=HG.get(r.no);if(!h)return;pts.push([X(r.dist1),Yz(h.h1)],[X(r.dist2),Yz(h.h2)]);});
      if(pts.length>1){d.l("HGL",pts,{dash:"3 1.5",w:.35});{const r0=rows[0];d.t("HGL",(X(r0.dist1)+X(r0.dist2))/2,Yz(Math.min(r0.inv1,r0.inv2))-3.2,1.8,"- - 동수경사선 (HGL)",{al:"c",b:true});}}
      const over=[];rows.forEach((r,i)=>{const h=HG.get(r.no);if(!h)return;if(h.ov1>1e-6)over.push([X(r.dist1),Yz(r.gl1),h.ov1]);if(h.ov2>1e-6)over.push([X(r.dist2),Yz(r.gl2),h.ov2]);});
      over.forEach(([x,y,dh])=>{d.c("NG",x,y,1.1,{w:.35});d.t("NG",x-1.5,y+1.4,1.8,"넘침",{al:"r",b:true});});}}
    // 접합부(집수정) · 세로선
    const nodes=[];rows.forEach((r,i)=>{if(i===0)nodes.push({x:X(r.dist1),a:null,b:r,dist:r.dist1});nodes.push({x:X(r.dist2),a:r,b:rows[i+1]||null,dist:r.dist2});});
    nodes.forEach(nd=>{let gl=nd.b?nd.b.gl1:nd.a.gl2, inv=Math.min(nd.a?nd.a.inv2:Infinity,nd.b?nd.b.inv1:Infinity,...(nd.b?(nd.b.inl||[]).filter(q=>!q.err&&isFinite(q.inv2)).map(q=>q.inv2):[]));
      inv-=mhFreeAt(Rr.L,mhKey(nd)); // 맨홀 바닥 = 최저 관저 − 여유고
      inv=gl-mhRound(gl-inv); // 맨홀 높이 0.1 m 올림
      if(!nd.b&&nd.a){const tg=outTargets(nd.a);if(tg.length){gl=tg[0].t.gl1;inv=gl-tg[0].mh;}} // 다른 관로로 인입: 받는 쪽 맨홀 그대로
      {const sv=Math.abs(Yz(1)-Yz(0)),sp=nodeSpec(nd),sq=sp==="특수"?mhSq(nd):null,w=Math.max(1.2,(sq?sq.L:(MH_D[sp]||0.9))*sv),t=(sq?sq.T:0.15)*sv; // 맨홀: 규격 내경(세로 축척), 바닥 슬래브 0.15 m
        d.rect("STR",nd.x-w/2,Yz(inv),w,Yz(gl)-Yz(inv));d.rect("STR",nd.x-w/2-t,Yz(inv)-t,w+2*t,t,{fill:"#dfe3e2"});
        d.l("STR",[[nd.x-w/2-t,Yz(inv)],[nd.x-w/2-t,Yz(gl)]],{w:.18});d.l("STR",[[nd.x+w/2+t,Yz(inv)],[nd.x+w/2+t,Yz(gl)]],{w:.18});
        if(nd.a&&nd.b&&isFinite(nd.b.drop)&&nd.b.drop>=DROP.sub-1e-9){ // 부관: 상류관 관저에서 하류관 관저까지, 높이 표기
          const H=nd.a.inv2-nd.b.inv1,xs=nd.x-w/2-t-0.9,yA=Yz(nd.a.inv2),yB=Yz(nd.b.inv1);
          d.l("SUBP",[[nd.x-w/2-t,yA],[xs,yA],[xs,yB],[nd.x-w/2,yB]],{w:.5});
          d.t(nd.b.drop>DROP.max+1e-6?"NG":"SUBP",xs-0.7,(yA+yB)/2,1.8,`부관 H=${fx(H,2)}`,{al:"r",va:"m",b:true});}}
      d.l("GRID",[[nd.x,bandTop],[nd.x,Yz(inv-0.15)]],{dash:"1 1"});});
    // 맨홀 인출선: 맨홀 위 → 세로 → 사선, 위 = 맨홀명 · 규격, 아래 = 높이. 합류·방류 표기
    {let AG=55*Math.PI/180,ca=Math.cos(AG),sa=Math.sin(AG);const MI=new Map(mhNodesOf(Rr).map(m=>[m.key,m])),tw=(t,h)=>[...String(t)].reduce((w,ch)=>w+(/[\u3131-\uD79D]/.test(ch)?1.0:0.64)*h,0),h1=2.0,h2=1.9;
      const lnm=r=>{const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.includes(r));return R2?String(R2.L.name).replace(/^우수\s*/,""):"";};
      const LD=[]; /* 인출선 목록 → 오른쪽부터 겹치지 않게 세로 길이 정함 */
      const draw=(it)=>{const {x,y0,top,bot,lay}=it,y1=y0+it.v,Ld=it.Ld,ca=it.f?-Math.cos(AG):Math.cos(AG),ex=x+ca*Ld,ey=y1+sa*Ld,ah=1.2,rot=(it.f?-1:1)*AG*180/Math.PI;
        d.l(lay,[[x,y0+ah*1.5],[x,y1],[ex,ey]],{w:.3});d.l(lay,[[x,y0],[x-ah*0.5,y0+ah*1.5],[x+ah*0.5,y0+ah*1.5]],{closed:true,fill:LAY[lay].c});
        const mx=x+ca*(Ld/2+1.2),my=y1+sa*(Ld/2+1.2),rr=rot*Math.PI/180,nx=-Math.sin(rr),ny=Math.cos(rr);
        d.t(lay,mx+nx*0.7,my+ny*0.7,h1,top,{al:"c",rot,b:true});if(bot)d.t(lay,mx-nx*0.7,my-ny*0.7,h2,bot,{al:"c",va:"t",rot,b:true});};
      nodes.forEach(nd=>{const m=MI.get(mhKey(nd));if(!m)return;const gl=m.gl,y0=Yz(Math.max(gl,nd.b?nd.b.inv1+nd.b.hStruct:-Infinity,nd.a?nd.a.inv2+nd.a.hStruct:-Infinity))+0.3;
        const kind=m.spec==="특수"?`사각맨홀 ${fx(m.sq.L,1)}×${fx(m.sq.B,1)}`:`원형맨홀 ${m.spec}`,nm=`${m.name} ${kind}`;
        let top=nm,bot=`H=${fx(m.H,2)}m`;
        if(!nd.b&&nd.a){if(m.tg.length)bot=`H=${fx(m.H,2)}m · ${lnm(m.tg[0].t)} 합류`;else{top="방류";bot=nm;}}
        LD.push({x:nd.x,y0,top,bot,lay:"MHL"});
        const inl=nd.b?(nd.b.inl||[]).filter(q=>!q.err):[];
        if(inl.length){const names=[...new Set(inl.map(q=>{const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.some(t=>String(t.no)===String(q.id)));return R2?String(R2.L.name).replace(/^우수\s*/,""):q.id;}))];
          LD.push({x:nd.x,y0,top:`${names.join(", ")} 합류`,bot:"",lay:"INL"});}});
      LD.forEach(it=>{it.Ld=Math.max(tw(it.top,h1),it.bot?tw(it.bot,h2):0)+3;it.f=false;});
      {let need=55;LD.forEach(it=>{const room=407-it.x;need=Math.max(need,room<=0?90:Math.acos(Math.min(1,room/(it.Ld+1)))*180/Math.PI);});AG=Math.min(72,need)*Math.PI/180;ca=Math.cos(AG);sa=Math.sin(AG);} /* 오른쪽 도곽 안에 들도록 시트별 각도 */
      const SP=6.2;let nxt=Infinity;
      for(let i=LD.length-1;i>=0;i--){const it=LD[i];if(it.f)continue;let v=6;const need=(it.x*sa-(nxt-SP))/ca; /* off = x·sinθ − y·cosθ ≤ 다음 off − SP */
        if(isFinite(need))v=Math.max(v,need-it.y0);it.v=v;nxt=it.x*sa-(it.y0+v)*ca;}
      nxt=Infinity;for(let i=0;i<LD.length;i++){const it=LD[i];if(!it.f)continue;let v=6;const need=(-it.x*sa-(nxt-SP))/ca; /* 왼쪽 위 방향: 거울 */
        if(isFinite(need))v=Math.max(v,need-it.y0);it.v=v;nxt=-it.x*sa-(it.y0+v)*ca;}
      LD.forEach(draw);}
    // 측점 간격(설계조건)마다 중간 측점: 관로 시·종점 사이를 직선 보간
    const CH=+LN0().cond.chain||0,mids=[];
    if(CH>0)rows.forEach(r=>{const L=r.dist2-r.dist1;if(!(L>0))return;
      for(let k=Math.ceil((r.dist1+1e-6)/CH);k*CH<r.dist2-1e-6;k++){const dd=k*CH,x=X(dd);if(nodes.some(nd=>Math.abs(nd.x-x)<3.2))continue;const t=(dd-r.dist1)/L,li=(a,b)=>a+(b-a)*t;
        mids.push({x,dist:dd,gl:li(r.gl1,r.gl2),inv:li(r.inv1,r.inv2),cv:li(r.cv1,r.cv2)});}});
    mids.forEach(m=>d.l("GRID",[[m.x,bandTop],[m.x,Yz(m.gl)]],{dash:"0.6 1.2",w:.12}));
    // 하단 표
    let y=BAND_Y; const bx0=18; d.l("BAND",[[bx0,BAND_Y],[xEnd+4,BAND_Y]],{w:.35});
    const rowsTop=[];[...BROWS].forEach(b=>{rowsTop.push([y,b]);y+=b[2];});
    rowsTop.forEach(([yy,b])=>{d.l("BAND",[[bx0,yy+b[2]],[xEnd+4,yy+b[2]]],{w:b===BROWS[BROWS.length-1]?.35:.18});d.t("TEXT",bx0+2,yy+b[2]/2,2.1,b[0],{va:"m"});});
    d.l("BAND",[[bx0,BAND_Y],[bx0,bandTop]],{w:.35});d.l("BAND",[[PX0,BAND_Y],[PX0,bandTop]],{w:.25});d.l("BAND",[[xEnd+4,BAND_Y],[xEnd+4,bandTop]],{w:.25});
    const th=1.9, vt=(x,yy,hh,s)=>d.t("TEXT",x,yy+hh/2,th,s,{al:"c",va:"m",rot:90});
    rowsTop.forEach(([yy,b])=>{
      const [name,kind,hh]=b;
      if(kind==="seg") rows.forEach(r=>{const x1=X(r.dist1),x2=X(r.dist2),xm=(x1+x2)/2;
        d.l("BAND",[[x1,yy],[x1,yy+hh]]);d.l("BAND",[[x2,yy],[x2,yy+hh]]);
        const v=name.startsWith("구간")?fx(r.len,2):name.startsWith("경사")?fx(r.slope*100,3):name.startsWith("계획유속")?`${fx(r.V,2)}  ${OKS(r.okV)}`:name.startsWith("유량")?`${fx(r.Qd,3)} / ${fx(r.Qc,2)}`:`${r.no}. ${r.size.label}${r.nrow>1?"×"+r.nrow:""}`;
        const ng=(name.startsWith("계획유속")&&!r.okV)||(name.startsWith("유량")&&!r.okQ);
        d.t(ng?"NG":"TEXT",xm,yy+hh/2,Math.min(1.9,(x2-x1-1)/Math.max(4,v.length)*1.7),v,{al:"c",va:"m"});});
      else nodes.forEach(nd=>{
        const pair=(fa,fb)=>{const va=nd.a?fa(nd.a):null,vb=nd.b?fb(nd.b):null;return [va,vb];};
        if(name==="측점"){vt(nd.x,yy,hh,fmtSta(nd.dist,LN0().cond.chain));}
        else if(name.startsWith("지반")){vt(nd.x,yy,hh,fx(nd.b?nd.b.gl1:nd.a.gl2,3));}
        else if(name.startsWith("맨홀 높이")){let v=null;
          if(!nd.b&&nd.a){const tg=outTargets(nd.a);if(tg.length)v=tg[0].mh;} // 다른 관로로 인입되는 끝 맨홀: 받는 맨홀 높이 그대로
          if(v==null){const g=nd.b?nd.b.gl1:nd.a.gl2,lo=Math.min(nd.a?nd.a.inv2:Infinity,nd.b?nd.b.inv1:Infinity,...(nd.b?(nd.b.inl||[]).filter(q=>!q.err&&isFinite(q.inv2)).map(q=>q.inv2):[]));v=isFinite(lo)&&isFinite(g)?mhRound(g-lo+mhFreeAt(Rr.L,mhKey(nd))):null;}
          vt(nd.x,yy,hh,v!=null?fx(v,1):"-");}
        else if(name.startsWith("맨홀 규격")){const sp=nodeSpec(nd),shp=sp==="특수"?"사각":"원형"; // 형상(위) · 규격(아래)
          d.t("TEXT",nd.x,yy+hh*0.68,1.7,sp==="특수"?(()=>{const q=mhSq(nd);return `□${fx(q.L,1)}×${fx(q.B,1)}`;})():shp,{al:"c",va:"m"});d.t("TEXT",nd.x,yy+hh*0.32,1.7,sp,{al:"c",va:"m",b:true});}
        else{const [va,vb]=name.startsWith("토피")?pair(r=>r.cv2,r=>r.cv1):pair(r=>r.inv2,r=>r.inv1);const dg=name.startsWith("토피")?2:3;
          if(va!=null&&vb!=null&&Math.abs(va-vb)>1e-6){vt(nd.x-1.3,yy,hh,fx(va,dg));vt(nd.x+1.3,yy,hh,fx(vb,dg));}
          else vt(nd.x,yy,hh,fx(va??vb,dg));}
        d.l("BAND",[[nd.x,yy],[nd.x,yy+1.2]]);d.l("BAND",[[nd.x,yy+hh-1.2],[nd.x,yy+hh]]);});
      if(kind!=="seg"&&!name.startsWith("맨홀"))mids.forEach(m=>{ // 중간 측점 값
        const v=name==="측점"?fmtSta(m.dist,CH):name.startsWith("지반")?fx(m.gl,3):name.startsWith("토피")?fx(m.cv,2):fx(m.inv,3);
        if(v)d.t("TEXT",m.x,yy+hh/2,1.7,v,{al:"c",va:"m",rot:90});d.l("BAND",[[m.x,yy],[m.x,yy+0.8]]);d.l("BAND",[[m.x,yy+hh-0.8],[m.x,yy+hh]]);});
    });
    d.t("TEXT",20,PY_TOP-2,1.8,"※ 관저고·토피 값이 두 개인 곳: 왼쪽 = 상류 관 종점, 오른쪽 = 하류 관 시점 · 동수경사선은 관 마찰손실만 (맨홀 손실 제외), 하류단 등류수심 기준");
    rows.forEach(r=>{const x1=X(r.dist1),x2=X(r.dist2),g=1.6; // 도면에서 관로 선택용 (화면 전용, DXF에는 안 나감)
      d.it.push({k:"hit",pid:r.no,pts:[[x1,Yz(r.inv1)-g],[x2,Yz(r.inv2)-g],[x2,Yz(r.inv2+r.hStruct)+g],[x1,Yz(r.inv1+r.hStruct)+g]]});
      const xm=(x1+x2)/2,ym=Yz((r.inv1+r.inv2)/2+r.hStruct)+5,hw=Math.max(2.3,String(r.no).length*0.95+1.2);d.it.push({k:"hit",pid:r.no,pts:[[xm-hw,ym-2],[xm+hw,ym-2],[xm+hw,ym+2],[xm-hw,ym+2]]});});
    out.push(d);
  });
  return {sheets:out,sh};
}
function renderProfile(){
  const sel=(id,arr,cur)=>{$(id).innerHTML=`<option value="0">자동</option>`+arr.map(s=>`<option value="${s}">${s}</option>`).join("");$(id).value=String(cur);};
  if(!$("sH").options.length){sel("sH",HS,PROF.sh);sel("sV",VS,PROF.sv);}
  const {sheets,sh}=profileSheets(R);
  {const HG=hglOf(R),ov=[],pr=[];R.rows.forEach(r=>{const h=HG&&HG.get(r.no);if(!h)return;if(h.press)pr.push(r.no);if(h.ov1>1e-6||h.ov2>1e-6)ov.push(r.no);});
   $("profNote").innerHTML=sheets.length?`A3 ${sheets.length}장 · 가로 1:${sh}${pr.length?` · <span style="color:var(--warn)">압력류 ${XE(pr.join(", "))}</span>`:""}${ov.length?` · <b style="color:var(--bad)">맨홀 넘침(시점): ${XE(ov.join(", "))}</b>`:""}`:"";}
  const keep=[...document.querySelectorAll("#profWrap .sheet")].map(sh=>[sh.scrollLeft,sh.scrollTop]);
  $("profWrap").innerHTML=sheets.length?sheets.map(s=>`<div class="sheet">${toSVG(s)}</div>`).join(""):`<p class="note">그릴 관로가 없습니다. 규격과 지반고를 확인하세요.</p>`;
  profZoom(PROF.z||1);
  document.querySelectorAll("#profWrap .sheet").forEach((sh,i)=>{if(keep[i]){sh.scrollLeft=keep[i][0];sh.scrollTop=keep[i][1];}});
  renderPEdit();
}
/* 도면에서 관로를 골라 관저고 고치기: ↑↓ 관 전체, Alt+↑↓ 종점만, Ctrl+↑↓ 시점만, Shift ×10, ←→ 앞뒤 관로, Esc 해제, Ctrl+Z 되돌리기 */
const PUNDO=[];
function pSelRow(){return PROF.sel!=null?R.rows.find(r=>r.no===PROF.sel):null;}
function renderPEdit(){const box=$("pEdit"),r=pSelRow();if(!box)return;
  if(!r){PROF.sel=null;box.innerHTML=`<span class="note">도면에서 관로(관 또는 번호 상자)를 누르면 골라집니다. 고른 뒤 키보드 화살표로 관저고를 고칩니다.</span>`;return;}
  const auto=r.cvAuto?` <span class="chip">시점 자동</span>`:"",fix=r.inv2Fixed?` <span class="chip">종점 지정</span>`:"";
  box.innerHTML=`<b>${XE(r.no)}</b> ${XE(r.size?r.size.label:"")}
    <span>시점 관저고 <b class="num">${fx(r.inv1,3)}</b>${auto}</span><span>종점 관저고 <b class="num">${fx(r.inv2,3)}</b>${fix}</span>
    <span>시점 단차 <b class="num${r.okJ===false?" ng":""}">${isFinite(r.drop)?fx(r.drop,3):"-"}</b></span>${(()=>{const nx=R.rows[R.rows.indexOf(r)+1];return nx&&isFinite(nx.drop)?`<span>종점 단차 <b class="num${nx.drop<DROP.min-1e-6||nx.drop>DROP.max+1e-6?" ng":""}">${fx(nx.drop,3)}</b></span>`:"";})()}
    <span>경사 <b class="num">${fx(r.slope*100,2)}%</b></span>${r.okJ===false?`<span class="ng">N.G: ${XE(r.jWhy.join(", "))}</span>`:""}<span>유속 <b class="num${r.okV?"":" ng"}">${fx(r.V,2)}</b></span><span>토피 <b class="num${Math.min(r.cv1,r.cv2)<CVABS?" ng":""}">${fx(r.cv1,2)} / ${fx(r.cv2,2)}</b></span>
    <span class="pe-btns">전체 <button type="button" class="btn small" data-mv="all,1">▲</button><button type="button" class="btn small" data-mv="all,-1">▼</button>
    시점 <button type="button" class="btn small" data-mv="s,1">▲</button><button type="button" class="btn small" data-mv="s,-1">▼</button>
    종점 <button type="button" class="btn small" data-mv="e,1">▲</button><button type="button" class="btn small" data-mv="e,-1">▼</button></span>
    <label class="note">간격 <input id="pStep" type="number" step="0.01" min="0.001" value="${PROF.step||0.01}" style="width:62px"> m</label>
    <button type="button" class="btn small" id="pUndo2"${PUNDO.length?"":" disabled"}>되돌리기</button><button type="button" class="btn small" id="pDesel">선택 해제</button>`;
}
function pMove(part,dir,mul=1){const r=pSelRow();if(!r)return;const l=LN(),p=l.pipes[r.i];if(!p)return;
  const dz=dir*(+PROF.step||0.01)*mul,rd=v=>Math.round(v*1000)/1000;
  const nr=R.rows[r.i+1],np=l.pipes[r.i+1];
  PUNDO.push({li:ST.active,i:r.i,v:[p.cv1,p.cv2,p.inv2fix],nv:np?np.cv1:undefined});if(PUNDO.length>100)PUNDO.shift();
  if(part!=="s"&&nr&&np&&nr.cvAuto)np.cv1=rd(nr.cv1); // 아래 관로가 시점 자동이면 지금 값으로 고정해서 같이 움직이지 않게
  if(part!=="e")p.cv1=rd(r.cv1-dz);
  if(part!=="s"){if(r.inv2Fixed&&dz<0)p.inv2fix=rd(r.inv2+dz);p.cv2=rd(r.cv2-dz);} /* 지정값(최소)보다 내리면 지정값도 같이 내림 */
  full();
  toast(`관로 입력 반영 · ${r.no} 시점 토피 ${fx(+p.cv1,2)} m, ${r.inv2Fixed?`종점 관저고 지정 ${fx(+p.inv2fix,2)} m`:`종점 토피 ${fx(+p.cv2,2)} m`}`);}
function pUndoMove(){const u=PUNDO.pop();if(!u)return;const p=ST.lines[u.li]&&ST.lines[u.li].pipes[u.i];if(p){[p.cv1,p.cv2,p.inv2fix]=u.v;}const np=ST.lines[u.li]&&ST.lines[u.li].pipes[u.i+1];if(np&&u.nv!==undefined)np.cv1=u.nv;full();}
function pSel(id){PROF.sel=id;document.querySelectorAll("#profWrap .phit").forEach(e=>e.classList.toggle("sel",e.dataset.pid===id));renderPEdit();}
$("profWrap").addEventListener("click",e=>{const h=e.target.closest(".phit");if(h){pSel(h.dataset.pid);}});
$("pEdit").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.mv){const [pt,dr]=b.dataset.mv.split(",");pMove(pt,+dr,e.shiftKey?10:1);}
  else if(b.id==="pUndo2")pUndoMove();else if(b.id==="pDesel")pSel(null);});
$("pEdit").addEventListener("change",e=>{if(e.target.id==="pStep"){const v=+e.target.value;PROF.step=v>0?v:0.01;}});
document.addEventListener("keydown",e=>{
  const pane=document.querySelector('.pane[data-p="prof"]');if(!pane||pane.hidden)return;
  if(e.target.closest&&e.target.closest("input,select,textarea"))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&PUNDO.length){e.preventDefault();pUndoMove();return;}
  const r=pSelRow();if(!r)return;
  if(e.key==="Escape"){pSel(null);return;}
  if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();pMove(e.altKey?"e":(e.ctrlKey||e.metaKey)?"s":"all",e.key==="ArrowUp"?1:-1,e.shiftKey?10:1);return;}
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();const i=R.rows.indexOf(r)+(e.key==="ArrowRight"?1:-1);if(R.rows[i])pSel(R.rows[i].no);}
});
/* 종단면도 확대 · 이동 */
function profZoom(z,sheet,cx,cy){
  z=Math.max(1,Math.min(8,Math.round(z*100)/100));PROF.z=z;$("pzLbl").textContent=Math.round(z*100)+"%";$("profWrap").classList.toggle("zoomed",z>1);
  document.querySelectorAll("#profWrap .sheet").forEach(sh=>{const sv=sh.querySelector("svg");if(!sv)return;
    const r=sh.getBoundingClientRect(),px=sheet===sh&&cx!=null?cx-r.left:sh.clientWidth/2,py=sheet===sh&&cy!=null?cy-r.top:sh.clientHeight/2;
    const fx0=(sh.scrollLeft+px)/(sv.clientWidth||1),fy0=(sh.scrollTop+py)/(sv.clientHeight||1);
    sv.style.width=(z*100)+"%";sv.style.minWidth=(720*z)+"px";
    sh.scrollLeft=fx0*sv.clientWidth-px;sh.scrollTop=fy0*sv.clientHeight-py;});
}
$("pzIn").addEventListener("click",()=>profZoom((PROF.z||1)*1.5));
$("pzOut").addEventListener("click",()=>profZoom((PROF.z||1)/1.5));
$("pzFit").addEventListener("click",()=>profZoom(1));
$("profWrap").addEventListener("wheel",e=>{const sh=e.target.closest(".sheet");if(!sh||!(e.ctrlKey||e.metaKey))return;e.preventDefault();profZoom((PROF.z||1)*(e.deltaY<0?1.2:1/1.2),sh,e.clientX,e.clientY);},{passive:false});
$("profWrap").addEventListener("dblclick",e=>{const sh=e.target.closest(".sheet");if(!sh)return;e.preventDefault();profZoom((PROF.z||1)>=8?1:(PROF.z||1)*2,sh,e.clientX,e.clientY);});
{let dg=null,moved=false; // 끌기는 4 px 넘게 움직였을 때만 (그냥 누르면 관로 선택)
  $("profWrap").addEventListener("pointerdown",e=>{const sh=e.target.closest(".sheet");moved=false;if(!sh||(PROF.z||1)<=1||e.button!==0)return;dg={sh,x:e.clientX,y:e.clientY,l:sh.scrollLeft,t:sh.scrollTop,id:e.pointerId,on:false};});
  $("profWrap").addEventListener("pointermove",e=>{if(!dg)return;const dx=e.clientX-dg.x,dy=e.clientY-dg.y;
    if(!dg.on){if(Math.hypot(dx,dy)<4)return;dg.on=true;moved=true;dg.sh.classList.add("drag");try{dg.sh.setPointerCapture(dg.id);}catch(_){}}
    dg.sh.scrollLeft=dg.l-dx;dg.sh.scrollTop=dg.t-dy;});
  const end=()=>{if(dg){dg.sh.classList.remove("drag");dg=null;}};$("profWrap").addEventListener("pointerup",end);$("profWrap").addEventListener("pointercancel",end);
  $("profWrap").addEventListener("click",e=>{if(moved){e.stopImmediatePropagation();moved=false;}},true);}
["sH","sV"].forEach(id=>document.addEventListener("change",e=>{if(e.target.id===id){PROF[id==="sH"?"sh":"sv"]=+e.target.value;renderProfile();}}));

/* ---------- 관로 단면도 ---------- */
function sectionTypes(rows){ // 모든 노선의 관로를 규격별로 묶음
  const m=new Map();rows.forEach(r=>{if(!r.size)return;const key=r.size.label+"|"+r.T+"|"+r.ratio+"|"+r.nrow+"|"+(r.prot?"P"+r.protT:"");if(!m.has(key))m.set(key,{r,nos:[]});m.get(key).nos.push(r);});
  const k=z=>z.kind==="box"?[1,z.B*z.H]:[0,z.D];
  return [...m.values()].sort((a,b)=>{const x=k(a.r.size),y=k(b.r.size);return x[0]-y[0]||x[1]-y[1]||a.r.nrow-b.r.nrow;});
}
function sectionSheets(){
  const all=(typeof RALL!=="undefined"?RALL:[]).filter(Boolean),types=sectionTypes(all.flatMap(x=>x.rows)), per=6, out=[];
  const dimOf=t=>{const r=t.r,s=r.size,p=r.prot?2*r.protT:0;return {w:(s.kind==="box"?s.B*r.nrow+0.2*(r.nrow-1):s.D*r.nrow+0.1*(r.nrow-1))+p,h:(s.kind==="box"?s.H+r.T:s.D)+p};};
  const BIG=types.length<=3, MW=BIG?100:78, MH=BIG?110:52;
  const SC=[5,10,20,25,30,40,50,60,100,150,200].find(v=>types.every(t=>{const z=dimOf(t);return z.w*1000/v<=MW&&z.h*1000/v<=MH;}))||200;
  for(let p=0;p*per<types.length;p++){
    const d=Dw(), list=types.slice(p*per,(p+1)*per), tot=Math.ceil(types.length/per);
    frame(d,"관로 단면도",`전체 노선 (${all.length}개) · 통수단면 (수심비 원형관 ${LN0().cond.dPipe}, BOX ${LN0().cond.dBox})`,`1:${SC}`,p+1,tot);
    list.forEach((t,i)=>{
      const big=BIG, cx=10+(i%3)*133.3+66.7, cyTop=big?250:(i<3?258:150), r=t.r, s=r.size, th=big?2.6:2.0;
      const pT=r.prot?r.protT:0, outW=dimOf(t).w-2*pT, outH=dimOf(t).h-2*pT, sc=SC, k=1000/sc; // 모든 단면 같은 축척 (보호공은 바깥)
      d.t("TEXT",cx,cyTop,big?4:3.2,`${s.kind==="box"?"BOX":"원형관"} ${s.label}${r.nrow>1?" × "+r.nrow+"련":""}${r.prot?" · 관 보호공":""}`,{al:"c",b:true});
      d.t("TEXT",cx,cyTop-4.5,2.2,`S = 1:${sc}`,{al:"c"});
      const by=cyTop-12-(outH+pT)*k, gw=s.kind==="box"?0.2:0.1, x0=cx-outW*k/2;
      if(pT>0){const px=x0-pT*k,py=by-pT*k,pw=(outW+2*pT)*k,ph=(outH+2*pT)*k;d.rect("PROT",px,py,pw,ph,{fill:"#e3e5e3",w:.35});
        for(let c=2;c<pw+ph;c+=2){const a0=Math.max(0,c-pw),a1=Math.min(ph,c);if(a1-a0>0.05)d.l("HATCH",[[px+c-a0,py+a0],[px+c-a1,py+a1]]);}
        d.t("PROT",px+pw+1,py+ph-1.5,th*0.9,`보호공 콘크리트 t=${Math.round(pT*1000)}`,{b:true});
        if(s.kind==="box")for(let j=0;j<r.nrow;j++)d.rect("PIPE",x0+j*(s.B+gw)*k,by,s.B*k,s.H*k,{fill:"#ffffff",w:.01});
        else for(let j=0;j<r.nrow;j++)d.c("PIPE",x0+j*(s.D+gw)*k+s.D*k/2,by+s.D*k/2,s.D*k/2+Math.max(.8,0.04*s.D*k),{fill:"#ffffff",w:.2});}
      for(let j=0;j<r.nrow;j++){
        if(s.kind==="box"){const x=x0+j*(s.B+gw)*k,w=s.B*k,h=s.H*k;
          d.l("WATER",[[x,by],[x+w,by],[x+w,by+r.depth*k],[x,by+r.depth*k]],{closed:true,fill:"#d6e8f5",noStroke:true});
          d.rect("PIPE",x,by,w,h,{w:.4});
          d.l("WATER",[[x,by+r.depth*k],[x+w,by+r.depth*k]],{dash:"1.2 .8"});
          if(r.T>0){const Tk=r.T*k;d.rect("CONC",x,by+h,w,Tk,{fill:"#e6e9e8"});
            for(let c=1.6;c<w+Tk;c+=1.6){const t0=Math.max(0,c-w),t1=Math.min(Tk,c);if(t1-t0>0.05)d.l("HATCH",[[x+c-t0,by+h+t0],[x+c-t1,by+h+t1]]);}}
        }else{const R0=s.D*k/2,xc=x0+j*(s.D+gw)*k+R0,yc=by+R0,dep=r.depth*k;
          const pts=[];const th=Math.acos(Math.max(-1,Math.min(1,(R0-dep)/R0)));
          for(let a=-Math.PI/2-th;a<=-Math.PI/2+th+1e-9;a+=Math.PI/60)pts.push([xc+R0*Math.cos(a),yc+R0*Math.sin(a)]);
          if(r.ratio>=0.999){const full=[];for(let a=0;a<2*Math.PI;a+=Math.PI/60)full.push([xc+R0*Math.cos(a),yc+R0*Math.sin(a)]);d.l("WATER",full,{closed:true,fill:"#d6e8f5",noStroke:true});}
          else{d.l("WATER",pts,{closed:true,fill:"#d6e8f5",noStroke:true});d.l("WATER",[pts[0],pts[pts.length-1]],{dash:"1.2 .8"});}
          d.c("PIPE",xc,yc,R0,{w:.4});d.c("PIPE",xc,yc,R0+Math.max(.8,0.04*s.D*k),{w:.2});}
      }
      // 치수
      const dimH=(xa,xb,y,txt)=>{d.l("DIM",[[xa,y],[xb,y]]);[xa,xb].forEach(x=>{d.l("DIM",[[x,y-1.2],[x,y+1.2]]);d.l("DIM",[[x-.7,y-.7],[x+.7,y+.7]]);});d.t("DIM",(xa+xb)/2,y+0.8,th,txt,{al:"c"});};
      const dimV=(x,ya,yb,txt)=>{d.l("DIM",[[x,ya],[x,yb]]);[ya,yb].forEach(y=>{d.l("DIM",[[x-1.2,y],[x+1.2,y]]);d.l("DIM",[[x-.7,y-.7],[x+.7,y+.7]]);});d.t("DIM",x-0.9,(ya+yb)/2,th,txt,{al:"c",rot:90});};
      const w1=(s.kind==="box"?s.B:s.D)*k;
      const xr=x0+outW*k+4;
      if(s.kind==="box"){dimH(x0,x0+w1,by-4,String(Math.round(s.B*1000)));dimV(xr,by,by+s.H*k,String(Math.round(s.H*1000)));if(r.T>0)dimV(xr,by+s.H*k,by+(s.H+r.T)*k,String(Math.round(r.T*1000)));
        dimV(x0-4,by,by+r.depth*k,`h=${Math.round(r.depth*1000)}`);}
      else{ // 원형관: 관경 D로 표기 (지름선 + 인출)
        const R0=s.D*k/2,xc=x0+R0,yc=by+R0,a=Math.PI/4,p1=[xc-R0*Math.cos(a),yc-R0*Math.sin(a)],p2=[xc+R0*Math.cos(a),yc+R0*Math.sin(a)],p3=[p2[0]+4,p2[1]+4];
        d.l("DIM",[p1,p2,p3,[p3[0]+8,p3[1]]]);[p1,p2].forEach(q=>d.l("DIM",[[q[0]-.7,q[1]+.7],[q[0]+.7,q[1]-.7]]));
        d.t("DIM",p3[0]+0.5,p3[1]+0.8,th,`D${Math.round(s.D*1000)}`,{b:true});
        if(r.ratio<0.999)dimV(x0-4,by,by+r.depth*k,`h=${Math.round(r.depth*1000)}`);}
      // 제원
      const ty=by-9-pT*k, lines=[`통수 수심 h = ${fx(r.depth,3)} m (수심비 ${r.ratio})`,`통수단면적 A = ${fx(r.Aw,4)} m²   윤변 P = ${fx(r.Pw,3)} m`,`경심 R = A/P = ${fx(r.R,4)} m   n = ${fx(r.n,3)}`,
        `적용 관로: ${t.nos.map(q=>q.no).join(", ")}`,`유속 ${fx(Math.min(...t.nos.map(q=>q.V)),2)}~${fx(Math.max(...t.nos.map(q=>q.V)),2)} m/s, 최대 Qd ${fx(Math.max(...t.nos.map(q=>q.Qd)),3)} m³/s`];
      lines.forEach((s2,j)=>d.t("TEXT",cx-(big?48:40),ty-j*th*1.8,th,s2));
    });
    out.push(d);
  }
  return out;
}
function renderSections(){
  const sh=sectionSheets();
  $("secWrap").innerHTML=sh.length?sh.map(s=>`<div class="sheet">${toSVG(s)}</div>`).join(""):`<p class="note">그릴 관로가 없습니다.</p>`;
}
