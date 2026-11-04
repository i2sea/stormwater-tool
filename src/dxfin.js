/* ---------- 도면(DXF)에서 유역면적 · 유입시간 구하기 ----------
   수치지형도(국토지리정보원, DXF, 좌표 m) 위에 사용자가 아래 레이어로 그려 넣은 것을 읽는다.
   UW_BASIN 전체 유역 경계(폐합선, 없으면 관로·등고선으로 자동) · UW_PIPE 우수관로 · UW_NO 관로 번호 글자 · UW_SUB 관로별 유역(선택)
   UW_C01~UW_C12 토지이용(유출계수 구분, 선택) · 등고선 F001711x/712x(7111~7124) · 표고점 F0027217(7217) */
const C_TO_KERBY=[0,4,2,3,4,2,0,1,2,2,4,5]; // 유출계수 구분 → Kerby 표면 형태
let DXF=null, DXFRES=null;
function dxfDecode(buf){const u=new Uint8Array(buf);let t;try{t=new TextDecoder("utf-8",{fatal:true}).decode(u);}catch(e){t=new TextDecoder("euc-kr").decode(u);}
  return t.replace(/\\U\+([0-9A-Fa-f]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16)));}
function dxfParse(text){
  const L=text.split(/\r?\n/),pr=[];for(let i=0;i+1<L.length;i+=2)pr.push([+L[i].trim(),L[i+1].replace(/\s+$/,"")]);
  let i=pr.findIndex(p=>p[0]===2&&p[1]==="ENTITIES");if(i<0)i=0;
  const ents=[];let cur=null,poly=null;
  const flush=()=>{if(!cur)return;
    if(cur.type==="VERTEX"&&poly){poly.pts.push([cur.x,cur.y,cur.z]);}
    else if(cur.type!=="VERTEX"&&cur.type!=="SEQEND")ents.push(cur);
    cur=null;};
  for(;i<pr.length;i++){const [c,v]=pr[i];
    if(c===0){flush();if(v==="ENDSEC")break;
      if(v==="SEQEND"){poly=null;continue;}
      cur={type:v,layer:"",pts:[],x:NaN,y:NaN,z:0,text:"",closed:false,elev:0};if(v==="POLYLINE")poly=cur;continue;}
    if(!cur)continue;
    switch(c){case 8:cur.layer=v.trim();break;case 1:case 3:cur.text+=v;break;case 38:cur.elev=+v;break;case 70:if(cur.type==="LWPOLYLINE"||cur.type==="POLYLINE")cur.closed=!!(+v&1);break;
      case 10:if(cur.type==="LWPOLYLINE")cur.pts.push([+v,NaN,NaN]);else cur.x=+v;break;
      case 20:if(cur.type==="LWPOLYLINE"){const p=cur.pts[cur.pts.length-1];if(p)p[1]=+v;}else cur.y=+v;break;
      case 30:cur.z=+v;break;case 11:cur.x2=+v;break;case 21:cur.y2=+v;break;case 31:cur.z2=+v;break;}}
  flush();
  return ents.map(e=>{
    if(e.type==="LWPOLYLINE")e.pts=e.pts.map(p=>[p[0],p[1],e.elev]);
    if(e.type==="LINE")e.pts=[[e.x,e.y,e.z],[e.x2,e.y2,e.z2??e.z]];
    if(e.type==="POLYLINE"&&!e.pts.length)e.pts=[];
    if(e.type==="MTEXT")e.text=e.text.replace(/\\[A-Za-z][^;\\]*;|[{}]|\\P/g,"").trim();
    return e;}).filter(e=>e.type!=="POLYLINE"||e.pts.length);
}
const isContour=ly=>/7(11|12)[1-4]$/.test(ly)||/^F00171[12][1-4]$/i.test(ly), isSpot=ly=>/7217$/.test(ly);
function pip(pt,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi))ins=!ins;}return ins;}
function segD2(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;let t=L2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));const x=a[0]+t*dx-p[0],y=a[1]+t*dy-p[1];return x*x+y*y;}
const polyArea=P=>{let s=0;for(let i=0,j=P.length-1;i<P.length;j=i++)s+=(P[j][0]+P[i][0])*(P[j][1]-P[i][1]);return Math.abs(s/2);};

/* 등고선 표고 빠른 찾기: 20 m 칸 나눔 + 가까운 8점 역거리 가중 */
function zIndex(zs){ // 표고 보간: 사방(4분면)에서 가까운 점 2개씩 역거리 가중 — 등고선 한 줄에만 붙어 평평해지는 것을 막음
  const g=20,M=new Map(),key=(i,j)=>i+","+j;zs.forEach(q=>{const k=key(Math.floor(q[0]/g),Math.floor(q[1]/g));let a=M.get(k);if(!a)M.set(k,a=[]);a.push(q);});
  return pt=>{if(!zs.length)return NaN;const ci=Math.floor(pt[0]/g),cj=Math.floor(pt[1]/g),Q=[[],[],[],[]];
    const add=(d,z,qi)=>{const a=Q[qi];if(a.length<2||d<a[a.length-1][0]){a.push([d,z]);a.sort((x,y)=>x[0]-y[0]);if(a.length>2)a.pop();}};
    for(let r=0;r<40;r++){
      for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++){if(Math.max(Math.abs(i-ci),Math.abs(j-cj))!==r)continue;const a=M.get(key(i,j));if(!a)continue;
        for(const q of a){const dx=q[0]-pt[0],dy=q[1]-pt[1],d=dx*dx+dy*dy;if(d<1e-6)return q[2];add(d,q[2],(dx>=0?0:1)+(dy>=0?0:2));}}
      const lim=(r*g)**2;if(Q.every(a=>a.length>=2&&a[1][0]<lim))break;if(r>=8&&Q.filter(a=>a.length).length>=2&&Q.every(a=>!a.length||a[a.length-1][0]<lim))break;}
    let w=0,s=0;Q.forEach(a=>a.forEach(([d,z])=>{w+=1/d;s+=z/d;}));return w?s/w:NaN;};
}
function dpSimplify(P,tol){if(P.length<4)return P;const t2=tol*tol,keep=new Uint8Array(P.length);keep[0]=keep[P.length-1]=1;const st=[[0,P.length-1]];
  while(st.length){const [a,b]=st.pop();let md=0,mi=-1;for(let i=a+1;i<b;i++){const d=segD2(P[i],P[a],P[b]);if(d>md){md=d;mi=i;}}if(md>t2){keep[mi]=1;st.push([a,mi],[mi,b]);}}
  return P.filter((_,i)=>keep[i]);}
/* UW_BASIN이 없을 때: 관로를 출구로 보고 지형(등고선 보간)에서 물이 관로로 모이는 범위를 찾는다 (priority-flood 유역 분할) */
function autoBasin(pipes,zAt,nz,D){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;pipes.forEach(pp=>pp.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}));
  x0-=D+5;y0-=D+5;x1+=D+5;y1+=D+5;
  const cs=Math.max(1,Math.max(x1-x0,y1-y0)/360),nx=Math.ceil((x1-x0)/cs),ny=Math.ceil((y1-y0)/cs),N=nx*ny,cx=i=>x0+(i+.5)*cs,cy=j=>y0+(j+.5)*cs;
  const dist=new Float32Array(N),segs=[];pipes.forEach(pp=>{for(let k=1;k<pp.pts.length;k++)segs.push([pp.pts[k-1],pp.pts[k]]);});
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const pt=[cx(i),cy(j)];let bd=Infinity;for(const [a,b] of segs){const d=segD2(pt,a,b);if(d<bd)bd=d;}dist[j*nx+i]=Math.sqrt(bd);}
  const inR=k=>dist[k]<=D,mask=new Uint8Array(N);let mode;
  if(!nz){mode="buffer";for(let k=0;k<N;k++)if(inR(k))mask[k]=1;}
  else{mode="terrain";
    const z=new Float32Array(N).fill(NaN);for(let k=0;k<N;k++)if(dist[k]<=D+2*cs)z[k]=zAt([cx(k%nx),cy((k/nx)|0)]);
    const lab=new Int8Array(N).fill(-1),H=[];// 최소 힙 [z,k]
    const push=(zz,k)=>{H.push([zz,k]);let i=H.length-1;while(i){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p;}};
    const pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m;}}return t;};
    for(let k=0;k<N;k++){if(!inR(k)||!isFinite(z[k]))continue;const i=k%nx,j=(k/nx)|0;
      if(dist[k]<=cs*0.75){lab[k]=1;push(z[k],k);continue;}
      let edge=i===0||j===0||i===nx-1||j===ny-1;if(!edge)for(let a=-1;a<=1&&!edge;a++)for(let b=-1;b<=1;b++){const q=k+b*nx+a;if(!inR(q)){edge=true;break;}}
      if(edge){lab[k]=0;push(z[k],k);}}
    while(H.length){const [zz,k]=pop(),i=k%nx,j=(k/nx)|0;
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;
        if(lab[q]!==-1||!inR(q)||!isFinite(z[q]))continue;lab[q]=lab[k];push(Math.max(z[q],zz),q);}}
    for(let k=0;k<N;k++)if(lab[k]===1)mask[k]=1;}
  // 경계 따라가기 (칸 모서리)
  const M=(i,j)=>i>=0&&j>=0&&i<nx&&j<ny&&mask[j*nx+i],E=new Map(),add=(a,b)=>{const k=a[0]+","+a[1];let l=E.get(k);if(!l)E.set(k,l=[]);l.push(b);};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(!M(i,j))continue;
    if(!M(i,j-1))add([i,j],[i+1,j]);if(!M(i+1,j))add([i+1,j],[i+1,j+1]);if(!M(i,j+1))add([i+1,j+1],[i,j+1]);if(!M(i-1,j))add([i,j+1],[i,j]);}
  const loops=[];for(const [k0,l0] of E){while(l0.length){let [a0,b0]=k0.split(",").map(Number);const P=[[a0,b0]];let cur=l0.pop();
      for(let g=0;g<4*N;g++){P.push(cur);const k=cur[0]+","+cur[1];if(k===k0)break;const l=E.get(k);if(!l||!l.length)break;cur=l.pop();}
      if(P.length>4)loops.push(P.map(([i,j])=>[x0+i*cs,y0+j*cs,0]));}}
  if(!loops.length)throw new Error("관로로 모이는 유역을 찾지 못했습니다. 탐색 거리를 늘리거나 UW_BASIN을 그려 주세요.");
  let B=loops.reduce((a,b)=>polyArea(b)>polyArea(a)?b:a);B=dpSimplify(B.slice(0,-1).concat([B[0]]),cs*0.6);B.pop();
  let edgeHit=0,bnd=0;for(let k=0;k<N;k++){if(!mask[k])continue;const i=k%nx,j=(k/nx)|0;if(M(i-1,j)&&M(i+1,j)&&M(i,j-1)&&M(i,j+1))continue;bnd++;if(dist[k]>D-1.5*cs)edgeHit++;}
  return {B,mode,cs,parts:loops.length,limitShare:bnd?edgeHit/bnd:0};
}
function basinDXF(R){const f=v=>(+v).toFixed(3),L=["0","SECTION","2","ENTITIES","0","POLYLINE","8","UW_BASIN","66","1","70","1","10","0","20","0","30","0"];
  R.B.forEach(p=>L.push("0","VERTEX","8","UW_BASIN","10",f(p[0]),"20",f(p[1]),"30","0"));L.push("0","SEQEND","8","UW_BASIN","0","ENDSEC","0","EOF");return L.join("\r\n")+"\r\n";}
function dxfAnalyze(ents,ids,opt){
  const by=ly=>ents.filter(e=>e.layer.toUpperCase()===ly);
  // 관로: 선마다 가장 가까운 관로 번호 글자
  const pipes=by("UW_PIPE").filter(e=>e.pts.length>=2).map(e=>({pts:e.pts,id:null}));
  if(!pipes.length)throw new Error("UW_PIPE 레이어에 우수관로 선이 없습니다.");
  const labels=ents.filter(e=>(e.type==="TEXT"||e.type==="MTEXT")&&(e.layer.toUpperCase()==="UW_NO"||e.layer.toUpperCase()==="UW_PIPE"||e.layer.toUpperCase()==="UW_SUB")&&e.text.trim()).map(e=>({p:[e.x,e.y],t:e.text.trim(),layer:e.layer.toUpperCase()}));
  labels.filter(l=>l.layer!=="UW_SUB").forEach(lb=>{let best=null,bd=Infinity;pipes.forEach(pp=>{for(let k=1;k<pp.pts.length;k++){const d=segD2(lb.p,pp.pts[k-1],pp.pts[k]);if(d<bd){bd=d;best=pp;}}});if(best&&!best.id)best.id=lb.t;});
  const named=pipes.filter(p=>p.id&&ids.includes(p.id)), unknown=pipes.filter(p=>p.id&&!ids.includes(p.id)).map(p=>p.id), nolab=pipes.filter(p=>!p.id).length;
  if(!named.length)throw new Error("관로 번호 글자(UW_NO)를 관로 입력표 번호와 맞출 수 없습니다. 관로 선 가까이에 1-1-01처럼 적어 주세요.");
  // 표고: 등고선 꼭짓점 + 표고점, 가까운 8점 역거리 가중
  const zs=[];ents.forEach(e=>{if(isContour(e.layer))e.pts.forEach((p,k)=>{if(!(isFinite(p[2])&&p[2]!==0))return;zs.push(p);const q=e.pts[k+1];if(q){const L=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.min(200,Math.floor(L/5));for(let m=1;m<n;m++)zs.push([p[0]+(q[0]-p[0])*m/n,p[1]+(q[1]-p[1])*m/n,p[2]]);}}); /* 등고선은 5 m 간격으로 점을 채움 */ else if(isSpot(e.layer)&&isFinite(e.z)&&e.z!==0)zs.push([e.x,e.y,e.z]);});
  const zAt=zIndex(zs);
  // 전체 유역 경계: UW_BASIN이 있으면 그 선, 없으면 자동
  const basins=by("UW_BASIN").filter(e=>e.pts.length>=3).map(e=>e.pts);let B,auto=null;
  if(basins.length)B=basins.reduce((a,b)=>polyArea(b)>polyArea(a)?b:a);
  else{auto=autoBasin(named,zAt,zs.length,opt.reach||100);B=auto.B;}
  // 관로별 유역(선택)
  const subs=by("UW_SUB").filter(e=>e.pts.length>=3).map(e=>{const lb=labels.find(l=>pip(l.p,e.pts)&&ids.includes(l.t));return {pts:e.pts,id:lb?lb.t:null};}).filter(s=>s.id);
  const lands=[];for(let c=1;c<=12;c++){by("UW_C"+String(c).padStart(2,"0")).filter(e=>e.pts.length>=3).forEach(e=>lands.push({pts:e.pts,c:c-1}));}
  // 격자 표본으로 면적 나누기
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;B.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});
  const N=320,dx=(x1-x0)/N,dy=(y1-y0)/N,cellHa=dx*dy/10000;
  const res={};named.forEach(p=>res[p.id]={areas:Array(12).fill(0),pts:[]});
  let tot=0;
  for(let a=0;a<N;a++)for(let b=0;b<N;b++){const pt=[x0+(a+.5)*dx,y0+(b+.5)*dy];if(!pip(pt,B))continue;tot+=cellHa;
    let id=null;const s=subs.find(s=>pip(pt,s.pts));if(s)id=s.id;
    else{let bd=Infinity;named.forEach(pp=>{for(let k=1;k<pp.pts.length;k++){const d=segD2(pt,pp.pts[k-1],pp.pts[k]);if(d<bd){bd=d;id=pp.id;}}});}
    if(!res[id])continue;const ld=lands.find(q=>pip(pt,q.pts));res[id].areas[ld?ld.c:opt.defC]+=cellHa;res[id].pts.push(pt);}
  // 유입시간: 최상류 관로 유역에서 첫 집수정(관로 시점)까지 가장 먼 점
  const first=named.find(p=>p.id===ids[0])||named[0];
  const ends=[first.pts[0],first.pts[first.pts.length-1]],others=named.filter(p=>p!==first).flatMap(p=>p.pts);
  const inlet=others.length?ends.reduce((a,b)=>Math.min(...others.map(o=>(o[0]-b[0])**2+(o[1]-b[1])**2))>Math.min(...others.map(o=>(o[0]-a[0])**2+(o[1]-a[1])**2))?b:a):ends[0];
  const zone=opt.tWhole?Object.values(res).flatMap(r=>r.pts):(res[first.id]?res[first.id].pts:[]);
  // 최원점: 첫 집수정에서 가장 먼 점 (표고를 알면 첫 집수정보다 높은 점 중에서 — 물이 흘러오는 쪽)
  const zIn=zAt(inlet),cand=zone.concat(B.filter(p=>opt.tWhole||(()=>{let bd=Infinity,id=null;named.forEach(pp=>{for(let k=1;k<pp.pts.length;k++){const d=segD2(p,pp.pts[k-1],pp.pts[k]);if(d<bd){bd=d;id=pp.id;}}});return id===first.id;})()))
    .map(p=>[(p[0]-inlet[0])**2+(p[1]-inlet[1])**2,p]).sort((a,b)=>b[0]-a[0]);
  let far=null,fd=-1;
  if(isFinite(zIn)){for(let i=0;i<Math.min(cand.length,3000);i++){if(zAt(cand[i][1])>=zIn-0.01){fd=cand[i][0];far=cand[i][1];break;}}}
  if(!far&&cand.length){fd=cand[0][0];far=cand[0][1];}
  const zoneAreas=Array(12).fill(0);(opt.tWhole?Object.values(res):[res[first.id]]).forEach(r=>r&&r.areas.forEach((v,j)=>zoneAreas[j]+=v));
  const kerbyA=Array(6).fill(0);zoneAreas.forEach((v,j)=>kerbyA[C_TO_KERBY[j]]+=v);
  return {B,named,subs,lands,res,tot,missing:ids.filter(id=>!res[id]),unknown,nolab,inlet,far,L:far?Math.sqrt(fd):NaN,zTop:far?zAt(far):NaN,zBot:zIn,nz:zs.length,auto,firstId:first.id,kerbyA,zoneA:zoneAreas.reduce((a,b)=>a+b,0),bbox:[x0,y0,x1,y1]};
}
function dxfPreview(R){
  const [x0,y0,x1,y1]=R.bbox,W=420,H=Math.max(160,Math.min(420,W*(y1-y0)/(x1-x0||1))),sx=(W-20)/(x1-x0||1),sy=(H-20)/(y1-y0||1),s=Math.min(sx,sy);
  const X=x=>10+(x-x0)*s,Y=y=>H-10-(y-y0)*s,path=P=>P.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join("");
  const cols=["#cfe3f3","#f6dcc4","#d7ecd2","#ead6ef","#f3efc1","#d4e8ea","#f2d0d0","#dfe0f5"];let k=0,h=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;background:var(--panel);border:1px solid var(--line);border-radius:4px">`;
  Object.entries(R.res).forEach(([id,r])=>{const c=cols[k++%cols.length];const step=Math.max(1,Math.floor(r.pts.length/4000));for(let i=0;i<r.pts.length;i+=step){const p=r.pts[i];h+=`<rect x="${(X(p[0])-1).toFixed(1)}" y="${(Y(p[1])-1).toFixed(1)}" width="2.2" height="2.2" fill="${c}"/>`;}});
  h+=`<path d="${path(R.B)}Z" fill="none" stroke="${R.auto?"#7a3fb0":"#5b6970"}" stroke-width="1.4"${R.auto?' stroke-dasharray="5 3"':""}/>`;
  R.named.forEach(p=>{h+=`<path d="${path(p.pts)}" fill="none" stroke="#1d5e88" stroke-width="2"/>`;const m=p.pts[Math.floor(p.pts.length/2)];h+=`<text x="${X(m[0])+3}" y="${Y(m[1])-3}" font-size="10" fill="#1d5e88">${XE(p.id)}</text>`;});
  if(R.far)h+=`<line x1="${X(R.far[0])}" y1="${Y(R.far[1])}" x2="${X(R.inlet[0])}" y2="${Y(R.inlet[1])}" stroke="#c0581a" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="${X(R.inlet[0])}" cy="${Y(R.inlet[1])}" r="3.5" fill="#c0581a"/><circle cx="${X(R.far[0])}" cy="${Y(R.far[1])}" r="3.5" fill="none" stroke="#c0581a" stroke-width="1.5"/>`;
  return h+"</svg>";
}
function dxfRun(){
  if(!DXF)return;const l=LN(),ids=l.pipes.map(p=>String(p.id||"").trim()).filter(Boolean);
  try{DXFRES=dxfAnalyze(DXF.ents,ids,{defC:+$("dxDefC").value,tWhole:$("dxWhole").checked,reach:Math.max(10,+$("dxReach").value||100)});}catch(err){DXFRES=null;$("dxOut").innerHTML=`<p class="warn">${XE(err.message||err)}</p>`;return;}
  const R=DXFRES,S=R.zTop-R.zBot;
  const t1=(S>0&&R.L>0)?1.44*Math.pow(R.L*(R.kerbyA.reduce((s,a,i)=>s+a*KERBY[i][1],0)/(R.zoneA||1))/Math.sqrt(S/R.L),0.467):NaN;
  $("dxOut").innerHTML=`${dxfPreview(R)}
    <table class="mini dxt" style="width:auto;min-width:220px;margin-top:8px"><thead><tr><th>관로</th><th>유역면적 (ha)</th></tr></thead><tbody>${ids.map(id=>`<tr><td>${XE(id)}</td><td class="n">${R.res[id]?fx(R.res[id].areas.reduce((a,b)=>a+b,0),3):"-"}</td></tr>`).join("")}
    <tr class="tot"><td>계</td><td class="n">${fx(R.tot,3)}</td></tr></tbody></table>
    <p class="note">${R.missing.length?`도면에 없는 관로: ${XE(R.missing.join(", "))}. `:""}${R.unknown.length?`관로 입력표에 없는 번호: ${XE(R.unknown.join(", "))}. `:""}${R.nolab?`번호 없는 관로 선 ${R.nolab}개는 뺐습니다. `:""}${R.subs.length?`관로별 유역 ${R.subs.length}개는 그린 경계대로, 나머지는 가장 가까운 관로로 나눴습니다.`:"유역은 가장 가까운 관로로 흘러간다고 보고 나눴습니다."}</p>
    ${R.auto?`<p class="note" style="color:#7a3fb0"><b>UW_BASIN이 없어 전체 유역 경계를 자동으로 그렸습니다 (보라 점선).</b><br>${R.auto.mode==="terrain"?`관로를 출구로 보고 등고선·표고점으로 만든 지형에서 빗물이 관로로 흘러오는 범위입니다 (격자 ${fx(R.auto.cs,1)} m, 관로에서 ${fx(+$("dxReach").value||100,0)} m 안).`:`등고선·표고점이 없어 관로 양쪽 ${fx(+$("dxReach").value||100,0)} m 범위로 잡았습니다. 지형을 반영하려면 등고선이 있는 수치지형도를 넣으세요.`}${R.auto.mode==="terrain"&&R.auto.limitShare>0.15?`<br><b>경계의 ${fx(R.auto.limitShare*100,0)}%가 탐색 거리 끝에 닿았습니다. 유역이 더 넓을 수 있으니 탐색 거리를 늘려 보세요.</b>`:""}${R.auto.parts>1?`<br>떨어진 조각 ${R.auto.parts-1}개는 빼고 가장 큰 유역만 썼습니다.`:""}<br>도로·옹벽·담장처럼 등고선에 없는 경계는 반영되지 않으니, 경계 DXF를 받아 CAD에서 확인·수정한 뒤 UW_BASIN으로 넣으면 그 선을 씁니다.</p>`:""}
    <div class="calcline">유입시간 (${$("dxWhole").checked?"전체 유역":`최상류 관로 ${XE(R.firstId)} 유역`} ${fx(R.zoneA,3)} ha)<br>L = ${fx(R.L,1)} m (최원점 → 첫 집수정 직선거리)<br>
      ${R.nz?`최원점 표고 ${fx(R.zTop,2)} m · 첫 집수정 ${fx(R.zBot,2)} m (등고선·표고점 ${R.nz}점 보간)`:"등고선·표고점이 없어 표고는 직접 넣어야 합니다"}${isFinite(t1)?`<br>t₁ ≈ ${fx(t1,2)}분`:""}${R.L>400?`<br><b>L이 0.4 km를 넘어 도시유역 Kerby 적용범위를 벗어납니다.</b>`:""}</div>
    <div class="toolbar" style="margin-top:8px"><button type="button" class="btn small primary" id="dxApplyA">유역면적 입력에 적용</button><button type="button" class="btn small primary" id="dxApplyT">유입시간에 적용</button>${R.auto?`<button type="button" class="btn small" id="dxBasinOut">자동 유역 경계 DXF 받기</button>`:""}</div>`;
}
if($("dxFile")){ /* 예전 유입시간 탭 도면 칸 (지금은 유역도 탭에서 함) */
$("dxFile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  const fr=new FileReader();fr.onload=()=>{try{const ents=dxfParse(dxfDecode(fr.result));DXF={name:f.name,ents};try{if(geoRead(ents).n)persist();}catch(_){} /* 관로 위치는 평면도용으로 저장 */try{bsSaveDxf(f.name,fr.result);BSN.res=null;}catch(_){}
      const lays=[...new Set(ents.map(x=>x.layer))];
      $("dxName").textContent=`${f.name} · 개체 ${ents.length}개 · UW 레이어 ${lays.filter(x=>/^UW_/i.test(x)).join(", ")||"없음"} · 등고선 ${ents.filter(x=>isContour(x.layer)).length}개 · 표고점 ${ents.filter(x=>isSpot(x.layer)).length}개`;
      dxfRun();}catch(err){toast("도면을 읽지 못했습니다: "+(err.message||err));}};fr.readAsArrayBuffer(f);});
["dxDefC","dxWhole","dxReach"].forEach(id=>$(id).addEventListener("change",dxfRun));
$("dxOut").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||!DXFRES)return;const l=LN(),R=DXFRES;
  if(b.id==="dxBasinOut"){save((DXF.name||"도면").replace(/\.dxf$/i,"")+"_자동유역경계.dxf",new TextEncoder().encode(basinDXF(R)));return;}
  if(b.id==="dxApplyA"){l.pipes.forEach(p=>{const r=R.res[String(p.id||"").trim()];if(r)p.areas=r.areas.map(v=>Math.round(v*1000)/1000);});full();toast("관로별 유역면적을 유역면적 입력에 넣었습니다.");}
  if(b.id==="dxApplyT"){const inf=l.inflow;inf.A=Math.round(R.zoneA*1000)/1000;inf.L=Math.round(R.L*10)/10;if(isFinite(R.zTop))inf.zTop=Math.round(R.zTop*100)/100;if(isFinite(R.zBot))inf.zBot=Math.round(R.zBot*100)/100;
    inf.kerby=inf.kerby.map((k,i)=>({n:k.n,a:Math.round(R.kerbyA[i]*1000)/1000}));full();toast("유입시간(L·표고·표면 형태별 면적)을 넣었습니다.");}});
}
