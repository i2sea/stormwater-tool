/* ---------- 평면도: DXF(UW_PIPE·UW_NO)에서 읽은 관로 위치 + 계산 결과 → 실좌표 DXF ---------- */
var PLAN;PLAN=PLAN||{S:500};
function geoRead(ents){ // 모든 노선 관로 번호에 위치 붙이기 (UW_NO 글자 또는 UW_LINE 노선 번호로 나눈 우수라인)
  const P=bsPipes(ents);let n=0;
  P.named.forEach(g=>{const l=ST.lines[g.li];l.geo=l.geo||{};l.geo[g.id]=g.pts.map(v=>[Math.round(v[0]*1000)/1000,Math.round(v[1]*1000)/1000]);n++;});
  return {n,unknown:P.unknown,nolab:P.nolab};
}
function planGeo(Rr){ // 관로별 위치를 상류→하류 방향으로
  const L=Rr.L,G=L.geo||{},rows=Rr.rows,out=new Map();
  rows.forEach((r,i)=>{let g=G[r.no];if(!g||g.length<2)return;g=g.slice();
    const nx=rows[i+1]&&G[rows[i+1].no],pv=rows[i-1]&&G[rows[i-1].no],d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2,near=(p,q)=>Math.min(d2(p,q[0]),d2(p,q[q.length-1]));
    if(nx){if(near(g[0],nx)<near(g[g.length-1],nx))g.reverse();}else if(pv){if(near(g[g.length-1],pv)<near(g[0],pv))g.reverse();}
    out.set(r.no,g);});
  return out;
}
function planDraw(S){ // 실좌표(m) 그리기. S = 축척 (글자 높이용)
  const d=Dw(0,0),k=S/1000,ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]),miss=[],PGS=[];let cnt=0;
  (RALL||[]).forEach(Rr=>{if(!Rr)return;const PG=planGeo(Rr);
    Rr.rows.forEach(r=>{const g=PG.get(r.no);if(!g){miss.push(r.no);return;}cnt++;
      const ng=!(r.okV&&r.okQ&&r.okJ!==false);d.l(ng?"PL_NG":"PL_PIPE",g,{w:.5});
      // 가장 긴 구간 가운데에 화살표·글자
      let bi=1,bl=-1;for(let j=1;j<g.length;j++){const l=Math.hypot(g[j][0]-g[j-1][0],g[j][1]-g[j-1][1]);if(l>bl){bl=l;bi=j;}}
      const a=g[bi-1],b=g[bi],m=[(a[0]+b[0])/2,(a[1]+b[1])/2],t=ang(a,b),c=Math.cos(t),s=Math.sin(t),ah=2.2*k;
      d.l("PL_ARW",[[m[0]+c*ah,m[1]+s*ah],[m[0]-c*ah*0.2-s*ah*0.45,m[1]-s*ah*0.2+c*ah*0.45],[m[0]-c*ah*0.2+s*ah*0.45,m[1]-s*ah*0.2-c*ah*0.45]],{closed:true,fill:LAY[ng?"PL_NG":"PL_ARW"].c});
      let deg=t*180/Math.PI;if(deg>90)deg-=180;if(deg<-90)deg+=180;const rr=deg*Math.PI/180,nx=-Math.sin(rr),ny=Math.cos(rr),off=1.6*k;
      d.t(ng?"PL_NG":"PL_TXT",m[0]+nx*off,m[1]+ny*off,1.8*k,`${r.no}  ${r.size?r.size.label:r.p.size}${r.nrow>1?"×"+r.nrow:""}`,{al:"c",rot:deg,b:true});
      d.t(ng?"PL_NG":"PL_TXT",m[0]-nx*off,m[1]-ny*off,1.5*k,`L=${fx(r.len,2)}  S=${fx(r.slope*100,2)}%${ng?"  N.G":""}`,{al:"c",va:"t",rot:deg});});
    PGS.push([Rr,PG]);});
  // 맨홀: 인출선(관로를 피하는 45° 방향) 위에 맨홀명 · 규격, 아래에 높이
  const ends=[];PGS.forEach(([Rr,PG])=>PG.forEach(g=>{if(g.length<2)return;ends.push([g[0],g[1]],[g[g.length-1],g[g.length-2]]);}));
  const tw=(t,h)=>[...String(t)].reduce((w,ch)=>w+(/[\u3131-\uD79D]/.test(ch)?1.0:0.62)*h,0);
  PGS.forEach(([Rr,PG])=>mhNodesOf(Rr).forEach(m=>{if(m.linked)return;const nd=m.nd,g=nd.b?PG.get(nd.b.no):PG.get(nd.a.no);if(!g)return;const p=nd.b?g[0]:g[g.length-1];
      if(m.spec==="특수"){const q=m.sq,gg=g,t=nd.b?ang(gg[0],gg[1]):ang(gg[gg.length-2],gg[gg.length-1]),c=Math.cos(t),s=Math.sin(t),hl=q.L/2,hb=q.B/2,P=(u,v)=>[p[0]+c*u-s*v,p[1]+s*u+c*v];
        d.l("PL_MH",[P(-hl,-hb),P(hl,-hb),P(hl,hb),P(-hl,hb)],{closed:true,fill:"#ffffff",w:.3});}
      else d.c("PL_MH",p[0],p[1],(MH_D[m.spec]||0.9)/2,{fill:"#ffffff",w:.3});
      // 관로 방향을 피하는 대각선 (같으면 오른쪽 위)
      const dirs=ends.filter(e=>Math.hypot(e[0][0]-p[0],e[0][1]-p[1])<0.6).map(e=>ang(e[0],e[1]));
      const angD=(x,y)=>{let v=Math.abs(x-y)%(2*Math.PI);return v>Math.PI?2*Math.PI-v:v;};
      let best=Math.PI/4,bs=-1;[45,135,-45,-135].forEach((dg,i)=>{const t=dg*Math.PI/180,sc=(dirs.length?Math.min(...dirs.map(x=>angD(x,t))):Math.PI)-i*0.01;if(sc>bs){bs=sc;best=t;}});
      const spec=m.spec==="특수"?`□${fx(m.sq.L,1)}×${fx(m.sq.B,1)}`:m.spec,t1=`${m.name} ${spec}`,t2=`H=${fx(m.H,2)}m`,h1=1.6*k,h2=1.4*k;
      const r0=(m.spec==="특수"?Math.hypot(m.sq.L,m.sq.B)/2:(MH_D[m.spec]||0.9)/2),Ld=Math.max(tw(t1,h1),tw(t2,h2))+2.0*k,c=Math.cos(best),s=Math.sin(best);
      const A=[p[0]+c*r0,p[1]+s*r0],B=[p[0]+c*(r0+Ld),p[1]+s*(r0+Ld)],ah=1.0*k;
      d.l("PL_MH",[A,B],{w:.2});
      d.l("PL_MH",[A,[A[0]+c*ah*1.6-s*ah*0.45,A[1]+s*ah*1.6+c*ah*0.45],[A[0]+c*ah*1.6+s*ah*0.45,A[1]+s*ah*1.6-c*ah*0.45]],{closed:true,fill:LAY.PL_MH.c});
      let deg=best*180/Math.PI;if(deg>90)deg-=180;if(deg<-90)deg+=180;const rr=deg*Math.PI/180,nx=-Math.sin(rr),ny=Math.cos(rr),M=[(A[0]+B[0])/2+c*0.8*k,(A[1]+B[1])/2+s*0.8*k],off=0.6*k;
      d.t("PL_MH",M[0]+nx*off,M[1]+ny*off,h1,t1,{al:"c",rot:deg,b:true});
      d.t("PL_MH",M[0]-nx*off,M[1]-ny*off,h2,t2,{al:"c",va:"t",rot:deg});}));
  return {d,cnt,miss};
}
function planPreview(d){ // 실좌표 → 화면 (가로 400)
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const ext=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);};
  d.it.forEach(e=>{if(e.k==="l")e.pts.forEach(p=>ext(p[0],p[1]));else if(e.k==="c"||e.k==="t")ext(e.x,e.y);});
  const pad=Math.max(x1-x0,y1-y0)*0.06+2,W=400,sc=W/((x1-x0)+2*pad),hc=((y1-y0)+2*pad)*sc,H=Math.max(90,hc),oy=(H-hc)/2,T=(x,y)=>[(x-x0+pad)*sc,(y-y0+pad)*sc+oy];
  const o=Dw(W,H);d.it.forEach(e=>{if(e.k==="l")o.it.push({...e,pts:e.pts.map(p=>T(p[0],p[1])),w:(e.w||.3)});
    else if(e.k==="c"){const [x,y]=T(e.x,e.y);o.it.push({...e,x,y,r:Math.max(0.6,e.r*sc)});}
    else if(e.k==="t"){const [x,y]=T(e.x,e.y);o.it.push({...e,x,y,h:Math.max(1.1,e.h*sc)});}});
  return o;
}
function renderPlan(){
  const {d,cnt,miss}=planDraw((PLAN&&PLAN.S)||500),box=$("planWrap");
  $("planNote").innerHTML=cnt?`관로 ${cnt}개 위치 있음${miss.length?` · <span style="color:var(--warn)">위치 없는 관로 ${XE(miss.join(", "))}</span>`:""}`:"";
  $("planDl").disabled=!cnt;
  if(!cnt){box.innerHTML=`<p class="note">관로 위치가 없습니다. 위 "도면에서 관로 위치 읽기"로 수치지형도 DXF(관로 UW_PIPE, 번호 UW_NO)를 넣으세요. 유입시간 탭에서 넣은 도면도 위치로 저장됩니다.</p>`;return;}
  box.innerHTML=`<div class="sheet">${toSVG(planPreview(d))}</div>`;
}
$("planFile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const fr=new FileReader();
  fr.onload=()=>{try{const r=geoRead(dxfParse(dxfDecode(fr.result)));persist();renderPlan();toast(`관로 위치 ${r.n}개를 읽었습니다.${r.unknown.length?` 입력표에 없는 번호 ${r.unknown.join(", ")}.`:""}${r.nolab?` 번호 없는 선 ${r.nolab}개.`:""}`);}catch(err){toast("도면을 읽지 못했습니다: "+(err.message||err));}};fr.readAsArrayBuffer(f);});
$("planS").addEventListener("change",e=>{PLAN.S=+e.target.value||500;renderPlan();});
$("planDl").addEventListener("click",()=>{const {d,cnt}=planDraw(PLAN.S);if(!cnt)return;save(`우수관로_평면도_1-${PLAN.S}.dxf`,toDXF([d]));});
