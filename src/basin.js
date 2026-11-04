/* ---------- 유역도: 등고선 지형에서 물이 흘러가는 관로로 소유역을 나누고 흐름을 그린다 ----------
   1) 수치지형도 등고선·표고점 → 격자 지형 (역거리 보간)
   2) 모든 노선의 관로를 출구로 두고 priority-flood: 낮은 곳부터 차오르며 각 칸이 어느 관로로 흘러가는지 정함
      (웅덩이는 메워서 넘치는 쪽으로). 칸마다 흘러가는 다음 칸(하류)과 관로까지 흐름길이를 기록
   3) 관로별 소유역 = 그 관로로 가는 칸. 전체 유역 = UW_BASIN이 있으면 그 안, 없으면 관로에서 탐색 거리 안 중 관로로 가는 칸
   4) 흐름 화살표, 소유역별 최장 흐름길(최원점 → 관로), 면적표, 실좌표 DXF */
var BSN={res:null,mode:"terrain",reach:100,S:1000};
const LU_COL=["#9aa3a8","#5f8f4e","#a7b86a","#9fd3e6","#8fbf74","#e8d68a","#e39b9b","#d9c7a7","#f0e2a8","#d6e3a0","#4f7d3f","#3f6b35"];
const BS_COL=["#9cc9e8","#f3c79b","#b9dfa8","#d6b7e3","#efe39a","#a9dbd8","#f1b0b0","#c3c6ef","#e2cfa6","#b8e0c3","#f5c6e0","#cfd8a2"];
function bsIdb(){return new Promise((ok,no)=>{try{const r=indexedDB.open("usu-dxf",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}});}
async function bsSaveDxf(name,buf,key="last"){try{const db=await bsIdb();const st=db.transaction("f","readwrite").objectStore("f");if(buf)st.put({name,buf,at:Date.now()},key);else st.delete(key);}catch(e){}}
async function bsLoadDxf(key="last"){try{const db=await bsIdb();return await new Promise(ok=>{const q=db.transaction("f").objectStore("f").get(key);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null);});}catch(e){return null;}}
function bsPipes(ents){ // 모든 노선 관로 번호와 맞춘 관로 선 (상류→하류 방향)
  const ids=new Map();ST.lines.forEach((l,li)=>l.pipes.forEach((p,pi)=>{const id=String(p.id||"").trim();if(id)ids.set(id,{li,pi});}));
  const pipes=ents.filter(e=>lyIs(e.layer,"pipe")&&e.pts&&e.pts.length>=2).map(e=>({pts:e.pts.map(p=>[p[0],p[1]]),id:null}));
  const labels=ents.filter(e=>(e.type==="TEXT"||e.type==="MTEXT")&&(lyIs(e.layer,"no")||lyIs(e.layer,"pipe"))&&e.text.trim()).map(e=>({p:[e.x,e.y],t:e.text.trim()}));
  labels.forEach(lb=>{let best=null,bd=Infinity;pipes.forEach(pp=>{for(let k=1;k<pp.pts.length;k++){const d=segD2(lb.p,pp.pts[k-1],pp.pts[k]);if(d<bd){bd=d;best=pp;}}});if(best&&!best.id)best.id=lb.t;});
  // 번호 글자 없는 우수라인: 가까운 UW_LINE 글자(노선 번호, 예 1-1)로 노선을 찾고 꺾인 점(맨홀)마다 나눠 상류부터 관로 번호를 붙임
  const lineTx=ents.filter(e=>(e.type==="TEXT"||e.type==="MTEXT")&&lyIs(e.layer,"line")&&e.text.trim()).map(e=>({p:[e.x,e.y],t:e.text.trim()}));
  if(lineTx.length){const add=[];pipes.filter(p=>!p.id).forEach(pp=>{let best=null,bd=Infinity;lineTx.forEach(t=>{for(let k=1;k<pp.pts.length;k++){const d=segD2(t.p,pp.pts[k-1],pp.pts[k]);if(d<bd){bd=d;best=t;}}});
      if(!best||bd>40*40)return;const l=ST.lines.find(x=>lineCode(x)===best.t||String(x.name||"").replace(/\s/g,"").includes(best.t));if(!l)return;
      pp.split=true;for(let k=1;k<pp.pts.length&&k-1<l.pipes.length;k++){const id=String(l.pipes[k-1].id||"").trim();if(id)add.push({pts:[pp.pts[k-1],pp.pts[k]],id});}});
    pipes.push(...add);}
  const named=pipes.filter(p=>p.id&&ids.has(p.id));
  // 관로 입력에 저장된 위치(도면에서 만든 관로)도 씀
  ST.lines.forEach((l,li)=>l.pipes.forEach((p,pi)=>{const id=String(p.id||"").trim(),g=l.geo&&l.geo[id];if(!id||!g||g.length<2||named.some(q=>q.id===id))return;named.push({pts:g.map(v=>[v[0],v[1]]),id,geo:true});}));
  // 방향: 같은 노선 다음 관로 쪽이 종점
  named.forEach(p=>{const o=ids.get(p.id),l=ST.lines[o.li],nx=l.pipes[o.pi+1],pv=l.pipes[o.pi-1],g=id=>named.find(q=>q.id===String(id||"").trim());
    const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2,near=(pt,q)=>Math.min(d2(pt,q.pts[0]),d2(pt,q.pts[q.pts.length-1]));
    const n=nx&&g(nx.id),v=pv&&g(pv.id);if(n){if(near(p.pts[0],n)<near(p.pts[p.pts.length-1],n))p.pts.reverse();}else if(v){if(near(p.pts[p.pts.length-1],v)<near(p.pts[0],v))p.pts.reverse();}
    p.li=o.li;p.pi=o.pi;p.first=o.pi===0;});
  return {named,unknown:pipes.filter(p=>p.id&&!ids.has(p.id)).map(p=>p.id),nolab:pipes.filter(p=>!p.id&&!p.split).length};
}
/* 토지이용 (유출계수 구분) 대응표: 수치지형도 2.0 레이어 코드 (앞부분 일치) */
const BS_MAP0={rice:{ly:"D0015211",c:3},field:{ly:"D0015212",c:5},orch:{ly:"D0015213",c:5},parcel:{ly:"D0015112",c:5},bldg:{ly:"B001",c:6},road:{ly:"A001",cl:"A002",c:0},steep:{s:30,c:1},mid:{s:15,c:4}};
function bsMap(){const m=JSON.parse(JSON.stringify(BS_MAP0));const u=ST.bsMap||{};Object.keys(m).forEach(k=>{if(u[k])Object.assign(m[k],u[k]);});return m;}
function segIndex(segs,g){const M=new Map();segs.forEach((s,i)=>{const i0=Math.floor(Math.min(s[0][0],s[1][0])/g),i1=Math.floor(Math.max(s[0][0],s[1][0])/g),j0=Math.floor(Math.min(s[0][1],s[1][1])/g),j1=Math.floor(Math.max(s[0][1],s[1][1])/g);
  for(let a=i0;a<=i1;a++)for(let b=j0;b<=j1;b++){const k=a+","+b;let l=M.get(k);if(!l)M.set(k,l=[]);l.push(i);}});
  return (pt,r)=>{let bd=r*r,bs=null;const i0=Math.floor((pt[0]-r)/g),i1=Math.floor((pt[0]+r)/g),j0=Math.floor((pt[1]-r)/g),j1=Math.floor((pt[1]+r)/g),seen=new Set();
    for(let a=i0;a<=i1;a++)for(let b=j0;b<=j1;b++){const l=M.get(a+","+b);if(!l)continue;for(const i of l){if(seen.has(i))continue;seen.add(i);const d=segD2(pt,segs[i][0],segs[i][1]);if(d<bd){bd=d;bs=segs[i];}}}
    return bs?{d:Math.sqrt(bd),s:bs}:null;};}
function bsLand(ents,G,z,opt){ // 칸마다 유출계수 구분
  const {nx,ny,cs,x0,y0,inside}=G,N=nx*ny,M=bsMap(),lc=new Int8Array(N).fill(-1),src=new Int8Array(N).fill(0),U=v=>String(v).toUpperCase(),has=(ly,pre)=>pre&&U(ly).startsWith(U(pre));
  const cx=i=>x0+(i+.5)*cs,cy=j=>y0+(j+.5)*cs;
  const fill=(pts,v,sv)=>{let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;pts.forEach(p=>{a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);});
    const i0=Math.max(0,Math.floor((a-x0)/cs)),i1=Math.min(nx-1,Math.floor((c-x0)/cs)),j0=Math.max(0,Math.floor((b-y0)/cs)),j1=Math.min(ny-1,Math.floor((d-y0)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*nx+i;if(inside[k]&&pip([cx(i),cy(j)],pts)){lc[k]=v;src[k]=sv;}}};
  // 1) 경사로 산지 (기호·도형 없는 곳), 나머지는 기본
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(!inside[k])continue;let c=opt.defC;
    if(z&&isFinite(z[k])){const zz=(a,b)=>{const ii=Math.min(nx-1,Math.max(0,a)),jj=Math.min(ny-1,Math.max(0,b)),v=z[jj*nx+ii];return isFinite(v)?v:z[k];};
      const w=Math.max(2,Math.round(6/cs)),gx=(zz(i+w,j)-zz(i-w,j))/(2*w*cs),gy=(zz(i,j+w)-zz(i,j-w))/(2*w*cs),sl=Math.hypot(gx,gy)*100;if(sl>=M.steep.s)c=M.steep.c;else if(sl>=M.mid.s)c=M.mid.c;}
    lc[k]=c;src[k]=1;}
  // 2) 경지 구역(닫힌 도형) — 안의 기호로 논·밭·과수원
  const sym=ents.filter(e=>(e.type==="INSERT"||e.type==="POINT")&&isFinite(e.x)).map(e=>({p:[e.x,e.y],k:has(e.layer,M.rice.ly)?"rice":has(e.layer,M.field.ly)?"field":has(e.layer,M.orch.ly)?"orch":null})).filter(q=>q.k);
  let np=0;ents.filter(e=>has(e.layer,M.parcel.ly)&&e.pts&&e.pts.length>=3).forEach(e=>{const cnt={rice:0,field:0,orch:0};sym.forEach(q=>{if(pip(q.p,e.pts))cnt[q.k]++;});
    const kk=Object.keys(cnt).reduce((a,b)=>cnt[b]>cnt[a]?b:a);fill(e.pts,cnt[kk]?M[kk].c:M.parcel.c,2);np++;});
  // 3) 도로: 중심선에서 가까운 칸 중 도로경계 안쪽
  const cl=[],bd=[];ents.forEach(e=>{if(!e.pts||e.pts.length<2)return;const t=has(e.layer,M.road.cl)?cl:has(e.layer,M.road.ly)?bd:null;if(!t)return;for(let q=1;q<e.pts.length;q++)t.push([e.pts[q-1],e.pts[q]]);});
  if(cl.length&&bd.length){const nc=segIndex(cl,15),nb=segIndex(bd,15);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(!inside[k])continue;const pt=[cx(i),cy(j)],c=nc(pt,25);if(!c)continue;
      const [a,b]=c.s,dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;let t=L2?((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));const P=[a[0]+t*dx,a[1]+t*dy],hw=nb(P,25);
      if(hw&&c.d<=hw.d+cs*0.5){lc[k]=M.road.c;src[k]=3;}}}
  // 4) 건물
  let nbld=0;ents.filter(e=>has(e.layer,M.bldg.ly)&&e.pts&&e.pts.length>=3).forEach(e=>{fill(e.pts,M.bldg.c,4);nbld++;});
  // 4-2) 계획 도로: UW_CL(중심선) ~ UW_EDGE(도로 끝선) 안쪽은 포장면 (기존 토지이용·건물보다 우선)
  {const pc=[],pb=[];let nEdgePoly=0;const clPoly=ents.some(e=>lyIs(e.layer,"cl")&&e.type!=="LINE"&&e.pts&&e.pts.length>2);
    ents.forEach(e=>{if(!e.pts||e.pts.length<2)return;
      if(lyIs(e.layer,"edge")&&e.closed&&e.pts.length>=3){fill(e.pts,M.road.c,6);nEdgePoly++;return;} // 도로끝선이 닫힌 선이면 그 안 = 도로
      const t=lyIs(e.layer,"cl")?(clPoly&&e.type==="LINE"?null:pc):lyIs(e.layer,"edge")?pb:null;if(!t)return;for(let q=1;q<e.pts.length;q++)t.push([e.pts[q-1],e.pts[q]]);}); // 중심선 레이어의 짧은 LINE(측점 눈금)은 뺌
    if(pc.length&&pb.length){const nc=segIndex(pc,15),nb=segIndex(pb,15);
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(!inside[k])continue;const pt=[cx(i),cy(j)],c=nc(pt,40);if(!c)continue;
        const [a,b]=c.s,dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;let t=L2?((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));const P=[a[0]+t*dx,a[1]+t*dy],hw=nb(P,40);
        if(hw&&c.d<=hw.d+cs*0.5){lc[k]=M.road.c;src[k]=6;}}}
    var nplan=pc.length+nEdgePoly;}
  // 5) 직접 그린 UW_C01~12
  for(let c=1;c<=12;c++)ents.filter(e=>U(e.layer)==="UW_C"+String(c).padStart(2,"0")&&e.pts&&e.pts.length>=3).forEach(e=>fill(e.pts,c-1,5));
  return {lc,src,nsym:sym.length,nparcel:np,nbld,nroad:cl.length,nplan};
}
function bsAnalyze(ents,opt){
  const by=ly=>ents.filter(e=>e.layer.toUpperCase()===ly);
  const P=bsPipes(ents),pipes=P.named;if(!pipes.length)throw new Error("관로 입력표와 맞는 관로 위치가 없습니다. 계획도를 넣고 \"도면에서 관로 입력 만들기\"를 누르거나, 우수관로에 관로 번호(UW_NO)·노선 번호(UW_LINE) 글자를 넣으세요.");
  const zs=[];ents.forEach(e=>{if(isContour(e.layer))e.pts.forEach((p,k)=>{if(!(isFinite(p[2])&&p[2]!==0))return;zs.push(p);const q=e.pts[k+1];if(q){const L=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.min(200,Math.floor(L/5));for(let m=1;m<n;m++)zs.push([p[0]+(q[0]-p[0])*m/n,p[1]+(q[1]-p[1])*m/n,p[2]]);}});else if(isSpot(e.layer)&&isFinite(e.z)&&e.z!==0)zs.push([e.x,e.y,e.z]);});
  const zAt=zIndex(zs),nz=zs.length;
  const basins=by("UW_BASIN").filter(e=>e.pts.length>=3).map(e=>e.pts),B=basins.length?basins.reduce((a,b)=>polyArea(b)>polyArea(a)?b:a):null;
  const subs=by("UW_SUB").filter(e=>e.pts.length>=3).map(e=>{const lb=ents.find(t=>(t.type==="TEXT"||t.type==="MTEXT")&&pip([t.x,t.y],e.pts)&&pipes.some(p=>p.id===t.text.trim()));return {pts:e.pts,id:lb?lb.text.trim():null};}).filter(s=>s.id);
  const lands=[];for(let c=1;c<=12;c++)by("UW_C"+String(c).padStart(2,"0")).filter(e=>e.pts.length>=3).forEach(e=>lands.push({pts:e.pts,c:c-1}));
  const D=opt.reach||100;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const ext=p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);};
  if(B)B.forEach(ext);else{pipes.forEach(pp=>pp.pts.forEach(ext));x0-=D;y0-=D;x1+=D;y1+=D;}
  x0-=2;y0-=2;x1+=2;y1+=2;
  const cs=Math.max(0.5,Math.max(x1-x0,y1-y0)/380),nx=Math.ceil((x1-x0)/cs),ny=Math.ceil((y1-y0)/cs),N=nx*ny,cx=i=>x0+(i+.5)*cs,cy=j=>y0+(j+.5)*cs;
  const segs=[];pipes.forEach((pp,pk)=>{let s=0;for(let k=1;k<pp.pts.length;k++){const a=pp.pts[k-1],b=pp.pts[k],L=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push({a,b,pk,s0:s,L});s+=L;}pp.len=s;});
  const near=new Int16Array(N).fill(-1),dist=new Float32Array(N).fill(Infinity),along=new Float32Array(N),inside=new Uint8Array(N);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,pt=[cx(i),cy(j)];let bd=Infinity,bs=null;
    for(const sg of segs){const d=segD2(pt,sg.a,sg.b);if(d<bd){bd=d;bs=sg;}}
    const dd=Math.sqrt(bd);dist[k]=dd;near[k]=bs.pk;{const dx=bs.b[0]-bs.a[0],dy=bs.b[1]-bs.a[1],L2=dx*dx+dy*dy;let t=L2?((pt[0]-bs.a[0])*dx+(pt[1]-bs.a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));along[k]=bs.s0+t*bs.L;}
    inside[k]=B?(pip(pt,B)?1:0):(dd<=D?1:0);}
  const lab=new Int16Array(N).fill(-2),par=new Int32Array(N).fill(-1),flen=new Float32Array(N),z=new Float32Array(N).fill(NaN),zf=new Float32Array(N).fill(NaN);
  // UW_SUB로 정한 칸 (지정)
  const subId=new Int16Array(N).fill(-1);if(subs.length)for(let k=0;k<N;k++){if(!inside[k])continue;const pt=[cx(k%nx),cy((k/nx)|0)];const s=subs.find(q=>pip(pt,q.pts));if(s)subId[k]=pipes.findIndex(p=>p.id===s.id);}
  // 지형 높이 · 토지이용 · 계획 도로 높이(종단 계획고)
  if(nz)for(let k=0;k<N;k++)if(inside[k])z[k]=zAt([cx(k%nx),cy((k/nx)|0)]);
  const LU=bsLand(ents,{nx,ny,cs,x0,y0,inside},nz?z:null,opt);
  const RZ=roadZf(ents);let nRoadZ=0;
  const cf=new Int8Array(N); // 계획 도로 성토(1)·절토(-1): 계획고 − 지반고 ±0.3 m
  if(RZ&&nz)for(let k=0;k<N;k++){if(!inside[k]||LU.src[k]!==6)continue;const v=RZ([cx(k%nx),cy((k/nx)|0)]);if(isFinite(v)){const d=v-z[k];cf[k]=d>0.3?1:d<-0.3?-1:0;z[k]=v;nRoadZ++;}}
  // 하천·저수지: 여기 닿은 물은 하천으로 빠짐 (관로 유역 아님)
  const river=new Uint8Array(N),rivL=[],rivP=[];ents.forEach(e=>{if(!lyIs(e.layer,"river")||!e.pts||e.pts.length<2||lyIs(e.layer,"pipe"))return;const P2=e.pts.map(p=>[p[0],p[1]]);if(!P2.some(p=>p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1))return;if(e.closed&&P2.length>=3)rivP.push(P2);rivL.push(P2);});
  if(rivL.length){const sg=[];rivL.forEach(P2=>{for(let q=1;q<P2.length;q++)sg.push([P2[q-1],P2[q]]);});const ix=segIndex(sg,20);
    for(let k=0;k<N;k++){if(!inside[k])continue;const pt=[cx(k%nx),cy((k/nx)|0)];if(ix(pt,cs*0.8))river[k]=1;else if(rivP.length&&rivP.some(P2=>pip(pt,P2)))river[k]=1;}}
  let nRiver=0;for(let k=0;k<N;k++)if(river[k])nRiver++;
  let mode=(opt.mode==="nearest"||!nz)?"nearest":"terrain";
  if(mode==="nearest"){for(let k=0;k<N;k++)if(inside[k]){lab[k]=subId[k]>=0?subId[k]:near[k];flen[k]=dist[k];}}
  else{
    const H=[],push=(zz,k)=>{H.push([zz,k]);let i=H.length-1;while(i){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p;}},
      pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m;}}return t;};
    for(let k=0;k<N;k++){if(!inside[k]||!isFinite(z[k]))continue;const i=k%nx,j=(k/nx)|0;
      if(dist[k]<=cs*0.75){lab[k]=near[k];zf[k]=z[k];push(z[k],k);continue;} // 관로가 지나는 칸 = 출구
      if(river[k]){lab[k]=-1;zf[k]=z[k];push(z[k],k);continue;} // 하천 = 유역 밖 출구
      if(!B){let edge=i===0||j===0||i===nx-1||j===ny-1;if(!edge)for(let a=-1;a<=1&&!edge;a++)for(let b=-1;b<=1;b++){if(!inside[k+b*nx+a]){edge=true;break;}}
        if(edge){lab[k]=-1;zf[k]=z[k];push(z[k],k);}}} // 탐색 범위 밖으로 빠지는 물
    const order=[],ord=new Int32Array(N).fill(-1);
    while(H.length){const [zz,k]=pop(),i=k%nx,j=(k/nx)|0;ord[k]=order.length;order.push(k);
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;
        if(lab[q]!==-2||!inside[q]||!isFinite(z[q]))continue;lab[q]=lab[k];par[q]=k;zf[q]=Math.max(z[q],zz)+1e-5;push(zf[q],q);}}
    // 흐름 방향(D8): 메운 지형에서 가장 가파르게 내려가는 이웃, 평평하면 메울 때 들어온 쪽. 출구부터 차례로 소유역·흐름길이를 다시 정함
    for(const k of order){if(par[k]<0)continue;const i=k%nx,j=(k/nx)|0;let best=-1,bs=0;
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;
        if(ord[q]<0||ord[q]>=ord[k])continue;const sl=(zf[k]-zf[q])/((a&&b)?Math.SQRT2:1);if(sl>bs+1e-9){bs=sl;best=q;}}
      if(best>=0&&bs>2e-4)par[k]=best;const p=par[k],di=Math.abs((p%nx)-i)+Math.abs(((p/nx)|0)-j);
      lab[k]=lab[p];flen[k]=flen[p]+cs*(di===2?Math.SQRT2:1);}
    if(subs.length)for(let k=0;k<N;k++)if(subId[k]>=0&&lab[k]!==-2){lab[k]=subId[k];}}
  // 토지이용
  // 빈틈 메우기: 유역 안쪽에 갇힌 미분류 칸(지형 보간 빈칸·작은 웅덩이)은 둘레 소유역으로 (바깥과 이어진 칸은 유역 밖)
  let nHole=0;{const out=new Uint8Array(N),st=[];for(let i=0;i<nx;i++)for(const j of [0,ny-1]){const k=j*nx+i;if(lab[k]<0&&!out[k]){out[k]=1;st.push(k);}}
    for(let j=0;j<ny;j++)for(const i of [0,nx-1]){const k=j*nx+i;if(lab[k]<0&&!out[k]){out[k]=1;st.push(k);}}
    while(st.length){const k=st.pop(),i=k%nx,j=(k/nx)|0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;if(lab[q]<0&&!out[q]){out[q]=1;st.push(q);}}}
    let hole=[];for(let k=0;k<N;k++)if(lab[k]<0&&!out[k])hole.push(k);nHole=hole.length;
    for(let g=0;g<500&&hole.length;g++){const nxt=[],set=[];hole.forEach(k=>{const i=k%nx,j=(k/nx)|0,c={};for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const v=lab[jj*nx+ii];if(v>=0)c[v]=(c[v]||0)+1;}
        const ks=Object.keys(c);if(ks.length){const v=+ks.reduce((x,y)=>c[y]>c[x]?y:x);set.push([k,v]);}else nxt.push(k);});
      set.forEach(([k,v])=>{lab[k]=v;if(mode==="terrain"){let q=-1,bd=Infinity;const i=k%nx,j=(k/nx)|0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const qq=(j+b)*nx+i+a;if(lab[qq]===v&&flen[qq]<bd){bd=flen[qq];q=qq;}}if(q>=0){par[k]=q;flen[k]=flen[q]+cs;}}if(!inside[k])inside[k]=1;});hole=nxt;if(!set.length)break;}}
  // 소유역 집계
  const cellHa=cs*cs/1e4,R=pipes.map((p,pk)=>({id:p.id,li:p.li,pi:p.pi,first:p.first,areas:Array(12).fill(0),n:0,sx:0,sy:0,far:-1,farLen:-1,col:BS_COL[pk%BS_COL.length]}));
  for(let k=0;k<N;k++){const l=lab[k];if(l<0)continue;const r=R[l],pt=[cx(k%nx),cy((k/nx)|0)];r.n++;r.sx+=pt[0];r.sy+=pt[1];
    r.areas[LU.lc[k]>=0?LU.lc[k]:opt.defC]+=cellHa;
    const L=flen[k]+(mode==="terrain"?0:0);if(L>r.farLen){r.farLen=L;r.far=k;}}
  // 최장 흐름길: 최원점 → (하류 칸) → 관로, 관로 따라 시점 맨홀까지
  R.forEach((r,pk)=>{r.A=r.areas.reduce((a,b)=>a+b,0);if(r.far<0)return;const pts=[];let k=r.far,g=0;
    if(mode==="terrain"){while(k>=0&&g++<N){pts.push([cx(k%nx),cy((k/nx)|0)]);if(par[k]<0)break;k=par[k];}}else{pts.push([cx(k%nx),cy((k/nx)|0)]);}
    const end=k,pp=pipes[pk];r.path=pts;r.Lflow=r.farLen;r.toStart=along[end];r.Lin=r.farLen+along[end]; // 관로를 만난 점에서 관로 시점(맨홀)까지
    r.zTop=zAt(pts[0]);r.zEnd=zAt(pts[pts.length-1]);r.zStart=zAt(pp.pts[0]);
    // 글자 자리: 무게중심에 가장 가까운 소유역 칸
    const gx=r.sx/r.n,gy=r.sy/r.n;let bd=Infinity,bk=-1;for(let q=0;q<N;q+=1){if(lab[q]!==pk)continue;const d=(cx(q%nx)-gx)**2+(cy((q/nx)|0)-gy)**2;if(d<bd){bd=d;bk=q;}}r.lp=bk>=0?[cx(bk%nx),cy((bk/nx)|0)]:[gx,gy];});
  // 경계선: 소유역마다 닫힌 선 (격자 모서리, 같은 직선은 합침)
  const loopsOf=test=>{const E=new Map(),add=(a,b)=>{const k=a[0]+","+a[1];let l=E.get(k);if(!l)E.set(k,l=[]);l.push(b);},M=(i,j)=>i>=0&&j>=0&&i<nx&&j<ny&&test(j*nx+i);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(!M(i,j))continue;if(!M(i,j-1))add([i,j],[i+1,j]);if(!M(i+1,j))add([i+1,j],[i+1,j+1]);if(!M(i,j+1))add([i+1,j+1],[i,j+1]);if(!M(i-1,j))add([i,j+1],[i,j]);}
    const out=[];for(const [k0,l0] of E){while(l0.length){const s=k0.split(",").map(Number),P=[s];let cur=l0.pop();for(let g=0;g<4*N;g++){P.push(cur);const k=cur[0]+","+cur[1];if(k===k0)break;const l=E.get(k);if(!l||!l.length)break;cur=l.pop();}
        const Q=[];for(let m=0;m<P.length-1;m++){const a=Q[Q.length-1],b=P[m],c=P[m+1];if(a&&((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))===0)Q[Q.length-1]=b;else Q.push(b);} // 같은 방향이면 합침
        if(Q.length>=3)out.push(Q.map(([i,j])=>[x0+i*cs,y0+j*cs]));}}
    return out;};
  R.forEach((r,pk)=>{r.loops=r.n?loopsOf(k=>lab[k]===pk):[];});
  const outer=loopsOf(k=>lab[k]>=0),Bout=B?B.map(p=>[p[0],p[1]]):(outer.length?outer.reduce((a,b)=>polyArea(b)>polyArea(a)?b:a):null);
  // 흐름 화살표: 성긴 격자마다 하류 쪽(몇 칸 따라간 방향)
  const step=Math.max(3,Math.round(Math.max(nx,ny)/34)),arrows=[];
  if(mode==="terrain")for(let j=Math.floor(step/2);j<ny;j+=step)for(let i=Math.floor(step/2);i<nx;i+=step){const k=j*nx+i;if(lab[k]<0||par[k]<0)continue;let q=k;for(let g=0;g<4&&par[q]>=0;g++)q=par[q];
    const a=[cx(i),cy(j)],b=[cx(q%nx),cy((q/nx)|0)],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1e-6)continue;arrows.push({p:a,u:[(b[0]-a[0])/L,(b[1]-a[1])/L],len:step*cs*0.7,l:lab[k]});}
  let limitHit=0;if(!B&&mode==="terrain"){let bn=0;for(let k=0;k<N;k++){if(lab[k]<0)continue;const i=k%nx,j=(k/nx)|0;let edge=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(j+b)*nx+i+a;if(i+a<0||j+b<0||i+a>=nx||j+b>=ny||lab[q]<0)edge=true;}if(edge){bn++;if(dist[k]>D-1.5*cs)limitHit++;}}limitHit=bn?limitHit/bn:0;}
  const cfLoops=nRoadZ?[1,-1,0].map(t=>({t,loops:loopsOf(k=>inside[k]&&LU.src[k]===6&&cf[k]===t&&isFinite(z[k]))})).filter(g=>g.loops.length):[];
  const luLoops=[];for(let c=0;c<12;c++){const lp=loopsOf(k=>lab[k]>=0&&LU.lc[k]===c);if(lp.length)luLoops.push({c,loops:lp});}
  return {rivL,rivP,nRiver,nHole,cfLoops,nRoadZ,cellHa:cs*cs/1e4,LU:{nsym:LU.nsym,nparcel:LU.nparcel,nbld:LU.nbld,nroad:LU.nroad,nplan:LU.nplan||0},luLoops,R,pipes,mode,cs,nz,B:Bout,hasB:!!B,subs:subs.length,lands:lands.length,arrows,limitHit,unknown:P.unknown,nolab:P.nolab,tot:R.reduce((s,r)=>s+r.A,0),D};
}
/* 그리기: 실좌표 Dw (DXF용) */
function bsDraw(res,S){
  const d=Dw(0,0),k=S/1000;
  res.R.forEach(r=>r.loops.forEach(lp=>d.l("BS_SUB",lp,{closed:true})));
  if(res.B)d.l("BS_BASIN",res.B,{closed:true,w:.6});
  (res.rivL||[]).forEach(P2=>d.l("BS_RIVER",P2,{}));
  res.arrows.forEach(a=>{const [ux,uy]=a.u,h=a.len,p=a.p,t=[p[0]+ux*h/2,p[1]+uy*h/2],s=[p[0]-ux*h/2,p[1]-uy*h/2],w=h*0.22;
    d.l("BS_FLOW",[s,t],{});d.l("BS_FLOW",[t,[t[0]-ux*w*1.6-uy*w,t[1]-uy*w*1.6+ux*w],[t[0]-ux*w*1.6+uy*w,t[1]-uy*w*1.6-ux*w]],{closed:true});});
  res.R.forEach(r=>{if(r.path&&r.path.length>1)d.l("BS_PATH",r.path,{dash:"2 1"});});
  res.pipes.forEach(p=>d.l("PL_PIPE",p.pts,{w:.5}));
  res.R.forEach(r=>{if(!r.n)return;d.t("BS_TXT",r.lp[0],r.lp[1]+1.4*k,2.2*k,r.id,{al:"c",b:true});d.t("BS_TXT",r.lp[0],r.lp[1]-1.6*k,1.8*k,`A=${fx(r.A,3)} ha`,{al:"c"});});
  return d;
}
/* 미리보기 SVG (소유역 색 채움) */
function bsSVG(res,W=760){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const ext=p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);};
  const sel=BSN.line==null||!ST.lines[BSN.line]?null:BSN.line,on=r=>sel==null||r.li===sel; // 노선별 보기
  res.R.forEach(r=>{if(on(r))r.loops.forEach(l=>l.forEach(ext));});if(res.B&&sel==null)res.B.forEach(ext);res.pipes.forEach(p=>{if(sel==null||p.li===sel)p.pts.forEach(ext);});
  if(!isFinite(x0)){res.R.forEach(r=>r.loops.forEach(l=>l.forEach(ext)));}
  const pad=(x1-x0)*0.03+1,sc=(W-20)/((x1-x0)+2*pad),H=Math.max(200,((y1-y0)+2*pad)*sc+20),X=x=>10+(x-x0+pad)*sc,Y=y=>H-10-(y-y0+pad)*sc;
  const P=pts=>pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join("")+"Z",L=pts=>pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join("");
  let h=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(0)}" width="${W}" height="${H.toFixed(0)}" font-family="IBM Plex Sans KR,Malgun Gothic,sans-serif"><rect width="${W}" height="${H.toFixed(0)}" fill="#ffffff"/>`;
  const lu=BSN.view==="lu";
  if(BSN.view==="cf"){res.cfLoops.forEach(g=>{h+=`<path d="${g.loops.map(P).join("")}" fill="${g.t>0?"#e07b5b":g.t<0?"#5b8fe0":"#c9ccc9"}" fill-opacity=".75" fill-rule="evenodd" stroke="none"/>`;});}
  if(lu)res.luLoops.forEach(g=>{h+=`<path d="${g.loops.map(P).join("")}" fill="${LU_COL[g.c]}" fill-opacity=".8" fill-rule="evenodd" stroke="${LU_COL[g.c]}" stroke-opacity=".8" stroke-width=".9"/>`;});
  res.R.forEach(r=>{if(r.loops.length)h+=`<path d="${r.loops.map(P).join("")}" fill="${lu||BSN.view==="cf"?"none":on(r)?r.col:"#e9ecee"}" fill-opacity="${on(r)?.55:.6}" fill-rule="evenodd" stroke="${lu?"#1a2226":"#5b6970"}" shape-rendering="crispEdges" stroke-width="${lu&&on(r)?1:.6}" stroke-opacity="${on(r)?1:.5}"/>`;});
  if(res.B)h+=`<path d="${P(res.B)}" fill="none" stroke="#1a2226" stroke-width="1.6"/>`;
  if(!lu)res.arrows.forEach(a=>{if(sel!=null&&!(res.R[a.l]&&res.R[a.l].li===sel))return;const [ux,uy]=a.u,hl=a.len*sc,px=X(a.p[0]),py=Y(a.p[1]),dx=ux*hl/2,dy=-uy*hl/2,tx=px+dx,ty=py+dy,w=Math.max(1.4,hl*0.22);
    h+=`<path d="M${(px-dx).toFixed(1)} ${(py-dy).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="#3d6f99" stroke-width=".8" fill="none"/><path d="M${tx.toFixed(1)} ${ty.toFixed(1)}L${(tx-ux*w*1.6+uy*w).toFixed(1)} ${(ty+uy*w*1.6+ux*w).toFixed(1)}L${(tx-ux*w*1.6-uy*w).toFixed(1)} ${(ty+uy*w*1.6-ux*w).toFixed(1)}Z" fill="#3d6f99"/>`;});
  res.R.forEach(r=>{if(on(r)&&r.path&&r.path.length>1)h+=`<path d="${L(r.path)}" fill="none" stroke="#c0581a" stroke-width="1.3" stroke-dasharray="4 3"/><circle cx="${X(r.path[0][0]).toFixed(1)}" cy="${Y(r.path[0][1]).toFixed(1)}" r="2.6" fill="#fff" stroke="#c0581a" stroke-width="1.2"/>`;});
  (res.rivP||[]).forEach(P2=>{h+=`<path d="${P(P2)}" fill="#bfe3f5" fill-opacity=".8" stroke="#4aa3df" stroke-width="1"/>`;});(res.rivL||[]).forEach(P2=>{h+=`<path d="${L(P2)}" fill="none" stroke="#4aa3df" stroke-width="1.4"/>`;});
  res.pipes.forEach(p=>{const o=sel==null||p.li===sel;h+=`<path d="${L(p.pts)}" fill="none" stroke="${o?"#1d5e88":"#9aa7b0"}" stroke-width="${o?2.4:1.2}"/>`;if(!o)return;const e=p.pts[p.pts.length-1];h+=`<circle cx="${X(e[0]).toFixed(1)}" cy="${Y(e[1]).toFixed(1)}" r="2.6" fill="#fff" stroke="#2c5a3f" stroke-width="1.2"/>`;});
  res.R.forEach(r=>{if(!r.n||!on(r))return;const x=X(r.lp[0]),y=Y(r.lp[1]);h+=`<text x="${x.toFixed(1)}" y="${(y-2).toFixed(1)}" font-size="11" font-weight="700" text-anchor="middle" fill="#1a2226" stroke="#fff" stroke-width="3" paint-order="stroke">${XE(r.id)}</text><text x="${x.toFixed(1)}" y="${(y+11).toFixed(1)}" font-size="10" text-anchor="middle" fill="#1a2226" stroke="#fff" stroke-width="3" paint-order="stroke">${fx(r.A,3)} ha</text>`;});
  if(BSN.view==="cf")[["#e07b5b","성토 (계획고가 지반보다 0.3 m 넘게 높음)"],["#5b8fe0","절토 (0.3 m 넘게 낮음)"],["#c9ccc9","거의 같음"]].forEach(([c,t],i)=>{const y=14+i*15;h+=`<rect x="${W-250}" y="${y}" width="12" height="10" fill="${c}"/><text x="${W-234}" y="${y+9}" font-size="10" fill="#1a2226" stroke="#fff" stroke-width="3" paint-order="stroke">${t}</text>`;});
  if(lu){const cs=[...new Set(res.luLoops.map(g=>g.c))];cs.forEach((c,i)=>{const y=14+i*15;h+=`<rect x="${W-150}" y="${y}" width="12" height="10" fill="${LU_COL[c]}" stroke="#0003"/><text x="${W-134}" y="${y+9}" font-size="10" fill="#1a2226" stroke="#fff" stroke-width="3" paint-order="stroke">${C_LABELS[c]} (C ${C_VALUES[c]})</text>`;});}
  (BSN.gaps||[]).forEach(g=>{const x=X((g.a[0]+g.b[0])/2),y=Y((g.a[1]+g.b[1])/2);h+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="#b3261e" stroke-width="2"/><text x="${(x+11).toFixed(1)}" y="${(y+4).toFixed(1)}" font-size="10" fill="#b3261e" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">끊김 ${fx(g.d,1)} m</text>`;});
  // 축척 막대
  {const nice=[5,10,20,50,100,200,500,1000].find(v=>v*sc>=60)||1000,bx=14,by=H-14;h+=`<path d="M${bx} ${by}h${(nice*sc).toFixed(1)}" stroke="#1a2226" stroke-width="2"/><text x="${bx}" y="${by-5}" font-size="10" fill="#1a2226">${nice} m</text>`;}
  return h+"</svg>";
}
function bsT1(res,li){ // 노선 첫 관로 소유역 → 유입시간 (Kerby): L = 최원점 → 관로 → 첫 맨홀 흐름길, 표고 = 최원점 · 첫 맨홀(관로 입력 지반고 우선)
  const r=res.R.find(x=>x.li===li&&x.pi===0);if(!r||!r.path||!r.A)return null;const p=ST.lines[li].pipes[0],zBot=p&&p.gl1!==""&&isFinite(+p.gl1)?+p.gl1:r.zStart;
  const kA=Array(6).fill(0);r.areas.forEach((v,j)=>kA[C_TO_KERBY[j]]+=v);const N=kA.reduce((s,a,i)=>s+a*KERBY[i][1],0)/(r.A||1),S=(r.zTop-zBot)/(r.Lin||1);
  const t1=S>0?1.44*Math.pow(r.Lin*N/Math.sqrt(S),0.467):NaN;return {r,L:r.Lin,zTop:r.zTop,zBot,kA,N,S,t1};}
function renderBsn(){
  const box=$("bsOut"),res=BSN.res;
  if(!res){box.innerHTML=DXF?"":`<p class="note">도면을 넣으면 여기에 유역도가 그려집니다.</p>`;return;}
  const curIds=new Set(LN().pipes.map(p=>String(p.id||"").trim()));
  const sel=BSN.line==null||!ST.lines[BSN.line]?null:BSN.line,rows=res.R.filter(r=>sel==null||r.li===sel).sort((a,b)=>a.li-b.li||a.pi-b.pi);
  const M=bsMap(),opts=c=>C_LABELS.map((t,j)=>`<option value="${j}"${j===c?" selected":""}>${t} (${C_VALUES[j]})</option>`).join(""),row=(k,lab,ly)=>`<tr><td>${lab}</td><td>${ly?`<input data-bm="${k}.ly" value="${XE(M[k].ly)}" style="width:96px">`:""}</td><td><select data-bm="${k}.c">${opts(M[k].c)}</select></td></tr>`;
  const used=[...new Set(res.R.map(r=>r.li))].sort((a,b)=>a-b);
  box.innerHTML=`<div class="toolbar"><label class="f" style="flex-direction:row;align-items:center;gap:6px">노선 <select id="bsLine"><option value="">전체</option>${used.map(li=>`<option value="${li}"${sel===li?" selected":""}>${XE(ST.lines[li].name)} (${res.R.filter(r=>r.li===li).length}개, ${fx(res.R.filter(r=>r.li===li).reduce((a,r)=>a+r.A,0),3)} ha)</option>`).join("")}</select></label><div class="zoomctl"><button type="button" class="btn small" data-bz="out" title="축소">−</button><button type="button" class="btn small" data-bz="fit" title="맞춤">맞춤</button><span class="bzl">${Math.round((BSN.z||1)*100)}%</span><button type="button" class="btn small" data-bz="in" title="확대">+</button></div><div class="seg"><button type="button" class="btn small${BSN.view!=="lu"?" on":""}" data-bv="sub">소유역 · 흐름</button><button type="button" class="btn small${BSN.view==="lu"?" on":""}" data-bv="lu">토지이용</button>${res.cfLoops&&res.cfLoops.length?`<button type="button" class="btn small${BSN.view==="cf"?" on":""}" data-bv="cf">성·절토</button>`:""}</div>
    <span class="note">토지이용: 경지 구역 ${res.LU.nparcel}개(기호 ${res.LU.nsym}개) · 건물 ${res.LU.nbld}개 · 도로 중심선 ${res.LU.nroad}구간${res.LU.nplan?` · 계획 도로 ${res.LU.nplan}구간(포장면)`:""}${res.nRoadZ?` · 계획 종단 높이 적용 ${fx(res.nRoadZ*res.cellHa,2)} ha`:""}</span></div>
    <div class="sheet bsheet" id="bsSheet">${bsSVG(res)}</div><p class="note" style="margin:2px 0 0">확대·축소: + / − 버튼, 그림 위에서 Ctrl + 휠, 또는 더블클릭(그 자리 2배). 맞춤 = 그림 전체가 한 화면에. 끌어서 옮깁니다.</p>
    <details class="bsmap"><summary>토지이용 대응표 (수치지형도 레이어 → 유출계수 구분)</summary>
      <table class="mini dxt"><thead><tr><th>구분</th><th>레이어 (앞부분)</th><th>유출계수 구분</th></tr></thead><tbody>
      ${row("rice","논 기호 (경지 구역 안)",1)}${row("field","밭 기호 (경지 구역 안)",1)}${row("orch","과수원 기호 (경지 구역 안)",1)}${row("parcel","경지 구역 (기호 없음)",1)}${row("bldg","건물",1)}
      <tr><td>도로 (경계 / 중심선)</td><td><input data-bm="road.ly" value="${XE(M.road.ly)}" style="width:44px"> / <input data-bm="road.cl" value="${XE(M.road.cl)}" style="width:44px"></td><td><select data-bm="road.c">${opts(M.road.c)}</select></td></tr>
      <tr><td>그 밖, 경사 <input data-bm="steep.s" type="number" value="${M.steep.s}" style="width:46px">% 이상</td><td></td><td><select data-bm="steep.c">${opts(M.steep.c)}</select></td></tr>
      <tr><td>그 밖, 경사 <input data-bm="mid.s" type="number" value="${M.mid.s}" style="width:46px">% 이상</td><td></td><td><select data-bm="mid.c">${opts(M.mid.c)}</select></td></tr>
      <tr><td>그 밖 (평지)</td><td></td><td>위 "기본 토지이용"</td></tr></tbody></table>
      <p class="note">경지 구역(닫힌 도형) 안에 있는 논·밭·과수원 기호 중 많은 것으로 그 구역을 정합니다. 도로는 중심선에서 도로경계까지 안쪽, 건물은 건물 도형 안입니다.
기호·도형이 없는 곳은 지형 경사로 산지를 나누고, 나머지는 기본 토지이용입니다. UW_C01~UW_C12로 직접 그린 구역이 있으면 그것이 가장 우선입니다.
레이어 코드는 수치지형도 2.0(예: D0015211)을 앞부분 일치로 찾습니다. 판마다 다르면 고쳐 쓰세요. 대응표는 전 노선 공통으로 저장됩니다.</p></details>
    <p class="note">${res.mode==="terrain"?`지형 흐름으로 나눴습니다 (등고선·표고점 ${res.nz}점 보간, 격자 ${fx(res.cs,1)} m). 웅덩이는 메워서 넘치는 쪽으로 보냈습니다.`:`${res.nz?"":"등고선·표고점이 없어 "}가장 가까운 관로로 나눴습니다.`}
${res.hasB?"전체 유역은 UW_BASIN 경계 안입니다.":`전체 유역은 관로에서 ${res.D} m 안에서 관로로 흘러오는 범위입니다.`}${res.limitHit>0.15?` <b>경계의 ${fx(res.limitHit*100,0)}%가 탐색 거리 끝에 닿았습니다. 유역이 더 넓을 수 있으니 탐색 거리를 늘리세요.</b>`:""}
${res.nRiver?`하천·저수지(${XE(bsLay().river)})에 닿는 물은 하천으로 빠지는 것으로 보고 관로 유역에서 뺐습니다. `:""}${res.subs?`UW_SUB로 그린 소유역 ${res.subs}개는 그 경계를 따랐습니다.`:""}${res.unknown.length?` 관로 입력표에 없는 번호: ${XE(res.unknown.join(", "))}.`:""}${res.nolab?` 번호 없는 관로 선 ${res.nolab}개는 뺐습니다.`:""}
주황 점선은 소유역마다 가장 먼 점에서 관로까지 물이 흐르는 길(최장 흐름길)이고, 파란 화살표는 지형에서 물이 흐르는 방향입니다.
도로 경계석·옹벽·담장처럼 등고선에 없는 것은 반영되지 않으니, DXF로 받아 CAD에서 UW_SUB 경계를 고친 뒤 다시 넣으면 그 경계를 따릅니다.</p>
    <table class="mini dxt" style="width:auto;margin-top:6px"><thead><tr><th>관로</th><th>노선</th><th>소유역 (ha)</th><th>가중 C</th><th>현재 입력 (ha)</th><th>차이</th><th>최장 흐름길 (m)</th><th>시점 맨홀까지 (m)</th><th>최원점 표고</th><th>유입시간 t₁ (분)</th></tr></thead><tbody>
    ${rows.map(r=>{const l=ST.lines[r.li],p=l&&l.pipes[r.pi],cur=p?(p.areas||[]).reduce((a,b)=>a+(+b||0),0):0,df=r.A-cur;
      return `<tr${curIds.has(r.id)?"":` class="dim"`}><td><span class="bsdot" style="background:${r.col}"></span>${XE(r.id)}</td><td>${XE(l?l.name:"")}</td><td class="n">${fx(r.A,3)}</td><td class="n">${r.A>0?fx(r.areas.reduce((a,v,j)=>a+v*((l&&l.cvals&&l.cvals[j])??C_VALUES[j]),0)/r.A,2):"-"}</td><td class="n">${fx(cur,3)}</td><td class="n${Math.abs(df)>0.005?" bsd":""}">${df>=0?"+":""}${fx(df,3)}</td><td class="n">${r.path?fx(r.Lflow,1):"-"}</td><td class="n">${r.path?fx(r.Lin,1):"-"}</td><td class="n">${isFinite(r.zTop)?fx(r.zTop,2):"-"}</td><td class="n">${r.pi===0?(()=>{const f=bsT1(res,r.li);return f?(isFinite(f.t1)&&f.t1>=5?`<b>${fx(f.t1,2)}</b>${f.L>400?' <span class="bsd">L&gt;0.4km</span>':""}`:`<span title="${isFinite(f.t1)?`Kerby ${fx(f.t1,2)}분`:"최원점이 첫 맨홀보다 낮아 경사 없음"}">5 (고정)</span>`):"-";})():""}</td></tr>`;}).join("")}
    <tr class="tot"><td>계</td><td></td><td class="n">${fx(res.tot,3)}</td><td></td><td class="n">${fx(rows.reduce((s,r)=>{const p=ST.lines[r.li]&&ST.lines[r.li].pipes[r.pi];return s+(p?(p.areas||[]).reduce((a,b)=>a+(+b||0),0):0);},0),3)}</td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>
    <div class="toolbar" style="margin-top:10px"><button type="button" class="btn small primary" id="bsApplyA">유역면적 입력에 적용 (전 노선)</button><button type="button" class="btn small primary" id="bsApplyT">유입시간에 적용 (${XE(LN().name)})</button><button type="button" class="btn small primary" id="bsApplyTA">유입시간에 적용 (전 노선)</button>
      <button type="button" class="btn small" id="bsDxf">유역도 DXF 받기</button><button type="button" class="btn small" id="bsImg">이 그림을 계산서 유역도로 넣기 (${XE((sel!=null?ST.lines[sel]:LN()).name)})</button></div>`;
}
/* 유역도 확대 · 이동 */
function bsZoom(z,cx,cy){const sh=$("bsSheet");if(!sh)return;const sv=sh.querySelector("svg");if(!sv)return;
  z=Math.max(0.15,Math.min(10,Math.round(z*100)/100));BSN.z=z;const l=document.querySelector("#bsOut .bzl");if(l)l.textContent=Math.round(z*100)+"%";sh.classList.toggle("zoomed",true);
  const r=sh.getBoundingClientRect(),px=cx!=null?cx-r.left:sh.clientWidth/2,py=cy!=null?cy-r.top:sh.clientHeight/2,fx0=(sh.scrollLeft+px)/(sv.clientWidth||1),fy0=(sh.scrollTop+py)/(sv.clientHeight||1);
  sv.style.width=(z*100)+"%";sv.style.maxWidth="none";sv.style.height="auto";sv.style.margin=z<1?"0 auto":"0";sh.scrollLeft=fx0*sv.clientWidth-px;sh.scrollTop=fy0*sv.clientHeight-py;}
$("bsOut").addEventListener("click",e=>{const b=e.target.closest("[data-bz]");if(!b)return;const z=BSN.z||1;bsZoom(b.dataset.bz==="in"?z*1.5:b.dataset.bz==="out"?z/1.5:bsFit());});
function bsFit(){const sh=$("bsSheet"),sv=sh&&sh.querySelector("svg");if(!sv)return 1;const vb=sv.viewBox.baseVal,ar=vb.height/vb.width,w=sh.clientWidth||800,hMax=window.innerHeight*0.78; // 그림 전체가 한 화면에
  return Math.min(1,hMax/(w*ar));}
$("bsOut").addEventListener("wheel",e=>{if(!e.target.closest("#bsSheet")||!(e.ctrlKey||e.metaKey))return;e.preventDefault();bsZoom((BSN.z||1)*(e.deltaY<0?1.2:1/1.2),e.clientX,e.clientY);},{passive:false});
$("bsOut").addEventListener("dblclick",e=>{if(!e.target.closest("#bsSheet"))return;e.preventDefault();bsZoom((BSN.z||1)>=10?bsFit():(BSN.z||1)*2,e.clientX,e.clientY);});
{let dg=null,moved=false;
  $("bsOut").addEventListener("pointerdown",e=>{const sh=e.target.closest("#bsSheet");moved=false;if(!sh||e.button!==0)return;dg={sh,x:e.clientX,y:e.clientY,l:sh.scrollLeft,t:sh.scrollTop,id:e.pointerId,on:false};});
  $("bsOut").addEventListener("pointermove",e=>{if(!dg)return;const dx=e.clientX-dg.x,dy=e.clientY-dg.y;if(!dg.on){if(Math.hypot(dx,dy)<4)return;dg.on=true;moved=true;dg.sh.classList.add("drag");try{dg.sh.setPointerCapture(dg.id);}catch(_){}}dg.sh.scrollLeft=dg.l-dx;dg.sh.scrollTop=dg.t-dy;});
  const end=()=>{if(dg){dg.sh.classList.remove("drag");dg=null;}};$("bsOut").addEventListener("pointerup",end);$("bsOut").addEventListener("pointercancel",end);}
function bsRun(){if(!DXF){BSN.res=null;renderBsn();return;}
  $("bsOut").innerHTML=`<p class="note">유역을 나누는 중입니다…</p>`;
  setTimeout(()=>{try{BSN.res=bsAnalyze(DXF.ents,{mode:$("bsMode").value,reach:Math.max(10,+$("bsReach").value||100),defC:+$("bsDefC").value});}catch(err){BSN.res=null;$("bsOut").innerHTML=`<p class="warn">${XE(err.message||err)}</p>`;return;}renderBsn();},20);}
function bsMerge(){ // 수치지형도 + 계획도 → 하나로
  if(!BSN.topo&&!BSN.plan){DXF=null;return;}
  DXF={name:[BSN.topo&&BSN.topo.name,BSN.plan&&BSN.plan.name].filter(Boolean).join(" + "),ents:[...(BSN.topo?BSN.topo.ents:[]),...(BSN.plan?BSN.plan.ents:[])]};
  try{if(geoRead(DXF.ents).n)persist();}catch(_){}}
async function bsEnsure(){if(BSN.tried)return;BSN.tried=true;
  if(DXF&&!BSN.topo)BSN.topo={name:DXF.name,ents:DXF.ents};
  const [f,g]=await Promise.all([BSN.topo?null:bsLoadDxf("last"),bsLoadDxf("plan")]);
  try{if(f&&f.buf)BSN.topo={name:f.name,ents:dxfParse(dxfDecode(f.buf))};if(g&&g.buf)BSN.plan={name:g.name,ents:dxfParse(dxfDecode(g.buf))};}catch(e){}
  if(BSN.topo||BSN.plan){bsMerge();bsInfo();if(TAB==="basin")bsRun();}}
function bsInfo(){if(typeof renderProf==="function")renderProf();const c=e=>e?e.ents:[];const T=c(BSN.topo),P=c(BSN.plan),lay=new Set(P.map(x=>x.layer.toUpperCase()));
  $("bsName").innerHTML=(BSN.topo?`수치지형도: ${XE(BSN.topo.name)} · 등고선 ${T.filter(x=>isContour(x.layer)).length}개 · 표고점 ${T.filter(x=>isSpot(x.layer)).length}개`:"수치지형도 없음")+"<br>"+
    (BSN.plan?`계획도: ${XE(BSN.plan.name)} · ${[["cl","중심선"],["edge","도로 끝선"],["pipe","우수관로"]].map(([k,t])=>`${t} ${(DXF?DXF.ents:[]).filter(x=>lyIs(x.layer,k)).length}개`).join(" · ")} <button type="button" class="btn small" id="bsPlanDel">계획도 빼기</button>`:"계획도 없음 (수치지형도에 UW 레이어를 같이 그렸으면 없어도 됩니다)");}
const bsRead=(f,cb)=>{const fr=new FileReader();fr.onload=()=>{try{cb(fr.result,dxfParse(dxfDecode(fr.result)));}catch(err){toast("도면을 읽지 못했습니다: "+(err.message||err));}};fr.readAsArrayBuffer(f);};
$("bsFile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;bsRead(f,(buf,ents)=>{BSN.topo={name:f.name,ents};bsSaveDxf(f.name,buf,"last");BSN.tried=true;bsMerge();bsInfo();bsRun();});});
$("bsPlan").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;bsRead(f,(buf,ents)=>{BSN.plan={name:f.name,ents};bsSaveDxf(f.name,buf,"plan");BSN.tried=true;bsMerge();bsInfo();bsRun();});});
$("bsName").addEventListener("click",e=>{if(e.target.id!=="bsPlanDel")return;BSN.plan=null;bsSaveDxf("",null,"plan");bsMerge();bsInfo();bsRun();});
["bsMode","bsReach","bsDefC"].forEach(id=>$(id).addEventListener("change",bsRun));
$("bsOut").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b||!BSN.res)return;const res=BSN.res;
  if(b.id==="bsApplyA"){let n=0;res.R.forEach(r=>{const p=ST.lines[r.li]&&ST.lines[r.li].pipes[r.pi];if(p&&r.n){p.areas=r.areas.map(v=>Math.round(v*1000)/1000);n++;}});full();toast(`관로 ${n}개의 유역면적을 넣었습니다 (전 노선).`);}
  if(b.id==="bsApplyT"||b.id==="bsApplyTA")bsApplyInflow(b.id==="bsApplyT"?[ST.active]:null);
  if(b.id==="bsDxf"){save((DXF.name||"도면").replace(/\.dxf$/i,"")+`_유역도_1-${BSN.S}.dxf`,toDXF([bsDraw(res,BSN.S)]));}
  if(b.id==="bsImg"){const svg=bsSVG(res,1600),img=new Image();img.onload=()=>{const cv=document.createElement("canvas");cv.width=img.width;cv.height=img.height;const c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,cv.width,cv.height);c.drawImage(img,0,0);
      const tl=BSN.line!=null&&ST.lines[BSN.line]?ST.lines[BSN.line]:LN();tl.img=cv.toDataURL("image/jpeg",0.85);persist();renderBasin();toast(`유역도 그림을 ${tl.name} 계산서에 넣었습니다.`);};img.onerror=()=>toast("그림으로 바꾸지 못했습니다.");img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);}
});
$("bsS").addEventListener("change",e=>{BSN.S=+e.target.value||1000;});

$("bsOut").addEventListener("click",e=>{const b=e.target.closest("[data-bv]");if(!b)return;BSN.view=b.dataset.bv;renderBsn();});
$("bsOut").addEventListener("change",e=>{const el=e.target.closest("[data-bm]");if(!el)return;const [k,f]=el.dataset.bm.split(".");ST.bsMap=ST.bsMap||{};ST.bsMap[k]=ST.bsMap[k]||{};
  ST.bsMap[k][f]=f==="ly"||f==="cl"?el.value.trim():+el.value;persist();const op=document.querySelector(".bsmap")?.open;bsRun();setTimeout(()=>{const d=document.querySelector(".bsmap");if(d&&op)d.open=true;},200);});

$("bsOut").addEventListener("change",e=>{if(e.target.id!=="bsLine")return;BSN.line=e.target.value===""?null:+e.target.value;renderBsn();});

{const _r=renderBsn;renderBsn=function(){
  if(BSN.autoApply&&BSN.res){BSN.autoApply=false;let n=0;BSN.res.R.forEach(r=>{const p=ST.lines[r.li]&&ST.lines[r.li].pipes[r.pi];if(p&&r.n){p.areas=r.areas.map(v=>Math.round(v*1000)/1000);n++;}});
    bsApplyInflow(null);toast(`관로 입력을 만들고 유역면적(${n}개 관로)·유입시간(전 노선)까지 넣었습니다. 관로 입력 탭에서 "관로 계획 전체 자동 (전 노선)"을 누르세요.`);}
  _r();if(BSN.res){if(BSN.z==null)BSN.z=bsFit();bsZoom(BSN.z);}};}

/* 유입시간 탭 채우기: 노선마다 첫 관로 소유역 (면적·흐름길 L·표고·표면 형태별 면적) */
function bsApplyInflow(lis){const res=BSN.res;if(!res){toast("유역도 탭에서 도면을 넣어 유역도를 먼저 만드세요.");return;}
  lis=lis||[...new Set(res.R.map(r=>r.li))];let n=0,nf=0,last=null;
  lis.forEach(li=>{const f=bsT1(res,li);if(!f)return;const inf=ST.lines[li].inflow;const ka=f.kA.map(v=>Math.round(v*1000)/1000);inf.A=Math.round(ka.reduce((a,b)=>a+b,0)*1000)/1000; /* 유역면적 = 표면 형태별 면적 합 */inf.L=Math.round(f.L*10)/10;if(isFinite(f.zTop))inf.zTop=Math.round(f.zTop*100)/100;if(isFinite(f.zBot))inf.zBot=Math.round(f.zBot*100)/100;
    inf.kerby=inf.kerby.map((kk,i)=>({n:KERBY[i][1],a:ka[i]}));
    const c=ST.lines[li].cond;if(!(f.t1>=5)){c.road=true;c.tRoad=5;f.fixed=true;nf++;}else c.road=false; // Kerby 5분 미만·경사 없음 → 고정 5분 (지침 4.3.2)
    n++;last=f;});
  if(!n){toast("첫 관로 소유역을 찾지 못했습니다. 유역도에 이 노선 관로가 있는지 확인하세요.");return;}full();
  toast(lis.length===1?`유입시간: ${last.r.id} 소유역 ${fx(last.r.A,3)} ha, 흐름길 L ${fx(last.L,1)} m, 표고 ${fx(last.zTop,2)} → ${fx(last.zBot,2)} m, ${last.fixed?"Kerby 5분 미만 또는 경사 없음 → 고정 5분":`t₁ ≈ ${fx(last.t1,2)}분`}`:`유입시간을 ${n}개 노선에 넣었습니다${nf?` · ${nf}개 노선은 고정 5분`:""}.`);}
function renderInfBs(){const el=$("infBs");if(!el||typeof BSN==="undefined"||!BSN)return;const res=BSN.res,f=res?bsT1(res,ST.active):null;
  el.innerHTML=`<b>유역도에서 가져오기</b> <span class="note">${f?`${XE(f.r.id)} 소유역 ${fx(f.r.A,3)} ha · 흐름길 L ${fx(f.L,1)} m · 표고 ${fx(f.zTop,2)} → ${fx(f.zBot,2)} m · 가중 N ${fx(f.N,3)} · ${isFinite(f.t1)&&f.t1>=5?`t₁ ≈ ${fx(f.t1,2)}분`:"고정 5분"}`:res?"유역도에 이 노선의 첫 관로가 없습니다.":DXF?"유역도 탭을 한 번 열면 계산됩니다.":"유역도 탭에서 수치지형도·계획도를 넣으면 쓸 수 있습니다."}</span>
    <div class="toolbar" style="margin-top:6px"><button type="button" class="btn small primary" id="infBsOne"${f?"":" disabled"}>지금 노선에 넣기</button><button type="button" class="btn small" id="infBsAll"${res?"":" disabled"}>전 노선에 넣기</button></div>
    <p class="note" style="margin:4px 0 0">노선마다 첫 관로(최상류 맨홀)로 흘러드는 소유역을 씁니다: 유역면적, L = 최원점 → 관로 → 첫 맨홀 흐름길, 최고점 = 최원점 지형, 최저점 = 첫 맨홀 지반고, 표면 형태별 면적 = 토지이용(유출계수 구분 → Kerby 표면 형태).</p>`;}
$("infBs").addEventListener("click",e=>{if(e.target.id==="infBsOne")bsApplyInflow([ST.active]);if(e.target.id==="infBsAll")bsApplyInflow(null);renderInfBs();});

/* 유역면적 입력 탭: 유역도 소유역 면적(토지이용별) 가져오기 */
function bsApplyArea(lis){const res=BSN.res;if(!res){toast("유역도 탭에서 도면을 넣어 유역도를 먼저 만드세요.");return;}let n=0;
  res.R.forEach(r=>{if(lis&&!lis.includes(r.li))return;const p=ST.lines[r.li]&&ST.lines[r.li].pipes[r.pi];if(p&&r.n){p.areas=r.areas.map(v=>Math.round(v*1000)/1000);n++;}});
  full();toast(n?`관로 ${n}개의 유역면적을 넣었습니다${lis?"":" (전 노선)"}.`:"유역도에 이 노선 관로가 없습니다.");}
function renderAreaBs(){const el=$("areaBs");if(!el||typeof BSN==="undefined"||!BSN)return;const res=BSN.res;
  const mine=res?res.R.filter(r=>r.li===ST.active):[],tot=mine.reduce((a,r)=>a+r.A,0),cur=LN().pipes.reduce((a,p)=>a+(p.areas||[]).reduce((x,v)=>x+(+v||0),0),0);
  el.innerHTML=`<b>유역도에서 가져오기</b> <span class="note">${res?(mine.length?`이 노선 소유역 ${mine.length}개 · 합계 ${fx(tot,3)} ha (지금 입력 ${fx(cur,3)} ha) · 전 노선 ${fx(res.tot,3)} ha`:"유역도에 이 노선 관로가 없습니다."):DXF?"유역도 탭을 한 번 열면 계산됩니다.":"유역도 탭에서 수치지형도·계획도를 넣으면 쓸 수 있습니다."}</span>
    <div class="toolbar" style="margin-top:6px"><button type="button" class="btn small primary" id="areaBsOne"${mine.length?"":" disabled"}>지금 노선에 넣기</button><button type="button" class="btn small" id="areaBsAll"${res?"":" disabled"}>전 노선에 넣기</button></div>
    <p class="note" style="margin:4px 0 0">관로마다 그 관로로 흘러드는 소유역 면적을 토지이용(유출계수 구분)별로 나눠 넣습니다. 지금 입력한 면적은 바뀝니다.</p>`;}
$("areaBs").addEventListener("click",e=>{if(e.target.id==="areaBsOne")bsApplyArea([ST.active]);if(e.target.id==="areaBsAll")bsApplyArea(null);renderAreaBs();});
