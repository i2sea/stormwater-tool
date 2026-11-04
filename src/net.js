/* ---------- 계획도 레이어 지정 · 도면에서 관로 입력 만들기 ----------
   레이어 이름에 적은 글자가 들어 있으면 그 쓰임으로 읽는다 (쉼표로 여러 개, 앞에 - 를 붙이면 제외) */
const BS_LAY0={cl:"중심선, UW_CL",edge:"도로끝선, UW_EDGE",pipe:"(우수) - 관, UW_PIPE",line:"UW_LINE",no:"UW_NO",river:"E002, E003, E005, G002, 하천, UW_RIVER",ang:0};
function bsLay(){if(ST.bsLay&&!ST.bsLay.angV3){if(+ST.bsLay.ang===10||+ST.bsLay.ang===0.1)ST.bsLay.ang=BS_LAY0.ang;ST.bsLay.angV3=1;}const L={...BS_LAY0,...(ST.bsLay||{})};if(L.river==="E002, E003, E005, 하천, UW_RIVER")L.river=BS_LAY0.river;return L;}
function lyIs(name,key){const spec=bsLay()[key]||"",n=String(name).toUpperCase().replace(/\s+/g,"");let inc=false;
  for(const t0 of spec.split(",")){const t=t0.trim();if(!t)continue;const ex=t.startsWith("-")&&t.length>1&&t[1]!==" ",w=(ex?t.slice(1):t).toUpperCase().replace(/\s+/g,"");if(!w)continue;
    if(n.includes(w)){if(ex)return false;inc=true;}}
  return inc;}
/* 관로망: 선 조각을 이어 붙이고, 꺾인 점·갈림점·끝점을 맨홀로 보고 맨홀~맨홀을 관로 하나로 */
function netBuild(ents,zAt){
  const tol=0.5,nodes=[],key=new Map(),nid=p=>{const k=Math.round(p[0]/tol)+","+Math.round(p[1]/tol);if(key.has(k))return key.get(k);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const k2=(Math.round(p[0]/tol)+dx)+","+(Math.round(p[1]/tol)+dy);if(key.has(k2)){const n=nodes[key.get(k2)];if(Math.hypot(n.p[0]-p[0],n.p[1]-p[1])<=tol){key.set(k,n.i);return n.i;}}}
    const n={i:nodes.length,p:[p[0],p[1]],adj:[]};nodes.push(n);key.set(k,n.i);return n.i;};
  let edges=[];const brk=new Set(); /* 폴리선 끝점 = 맨홀 (이어져 있어도 끊어진 곳은 관로 경계) */
  ents.forEach(e=>{if(!lyIs(e.layer,"pipe")||!e.pts||e.pts.length<2)return;const ext=/외부/.test(e.layer);for(let k=1;k<e.pts.length;k++){const a=nid(e.pts[k-1]),b=nid(e.pts[k]);if(a!==b)edges.push({a,b,ext});}if(!e.closed){brk.add(nid(e.pts[0]));brk.add(nid(e.pts[e.pts.length-1]));}});
  if(!edges.length)return null;
  // T자 접속: 끝점이 다른 선 중간에 닿으면 그 선을 나눔
  const deg=()=>{nodes.forEach(n=>n.d=0);edges.forEach(e=>{nodes[e.a].d++;nodes[e.b].d++;});};deg();
  nodes.filter(n=>n.d===1).forEach(n=>{for(let q=0;q<edges.length;q++){const e=edges[q];if(e.a===n.i||e.b===n.i)continue;const A=nodes[e.a].p,B=nodes[e.b].p;
      if(segD2(n.p,A,B)<=tol*tol){edges.splice(q,1,{a:e.a,b:n.i,ext:e.ext},{a:n.i,b:e.b,ext:e.ext});break;}}});
  deg();edges.forEach((e,i)=>{e.i=i;nodes[e.a].adj.push(i);nodes[e.b].adj.push(i);});
  // 꺾임이 작은 점(차수 2, 기본 10° 미만 — 곡선 도로를 따라 그린 점)은 맨홀이 아님 → 합침
  const angLim=isFinite(+bsLay().ang)?+bsLay().ang:0;const isMH=n=>{if(n.d!==2||brk.has(n.i)||angLim<=0)return true; /* 0이면 폴리선 꼭짓점 모두 맨홀 */const [e1,e2]=n.adj.map(i=>edges[i]),o1=nodes[e1.a===n.i?e1.b:e1.a].p,o2=nodes[e2.a===n.i?e2.b:e2.a].p;
    const a1=Math.atan2(n.p[1]-o1[1],n.p[0]-o1[0]),a2=Math.atan2(o2[1]-n.p[1],o2[0]-n.p[0]);let d=Math.abs(a1-a2);if(d>Math.PI)d=2*Math.PI-d;return d>angLim*Math.PI/180;};
  nodes.forEach(n=>{n.mh=isMH(n);n.z=zAt?zAt(n.p):NaN;});
  // 맨홀 사이 관로(여러 조각을 이은 선)
  const used=new Set(),pipes=[];
  nodes.filter(n=>n.mh).forEach(n=>n.adj.forEach(ei=>{if(used.has(ei))return;const path=[n.i];let cur=n.i,e=edges[ei],ext=e.ext;
    for(let g=0;g<edges.length+2;g++){used.add(e.i);const nx=e.a===cur?e.b:e.a;path.push(nx);ext=ext||e.ext;cur=nx;if(nodes[cur].mh)break;const ne=nodes[cur].adj.find(x=>!used.has(x));if(ne==null)break;e=edges[ne];}
    pipes.push({nodes:path,u:path[0],v:path[path.length-1],ext,len:path.slice(1).reduce((s,q,i)=>s+Math.hypot(nodes[q].p[0]-nodes[path[i]].p[0],nodes[q].p[1]-nodes[path[i]].p[1]),0)});}));
  // 출구: 끝점(관로 하나만 닿는 맨홀) 중 가장 낮은 곳 (지형이 없으면 첫 끝점)
  const madj=new Map();pipes.forEach((p,i)=>{[p.u,p.v].forEach(x=>{if(!madj.has(x))madj.set(x,[]);madj.get(x).push(i);});});
  const ends=[...madj.keys()].filter(x=>madj.get(x).length===1);if(!ends.length)return {err:"관로망에 끝점이 없습니다 (닫힌 고리)."};
  const comps=[],seen=new Set();
  ends.concat([...madj.keys()]).forEach(s=>{if(seen.has(s))return;const comp=[],st=[s];seen.add(s);while(st.length){const x=st.pop();comp.push(x);madj.get(x).forEach(pi=>{const p=pipes[pi],o=p.u===x?p.v:p.u;if(!seen.has(o)){seen.add(o);st.push(o);}});}comps.push(comp);});
  const trees=comps.map(comp=>{const ce=comp.filter(x=>madj.get(x).length===1);let out=ce[0];if(zAt&&ce.length)out=ce.reduce((a,b)=>(nodes[b].z<nodes[a].z?b:a));
    // 출구에서 거슬러 올라가며 방향을 정함 (관로 = 상류 맨홀 → 하류 맨홀)
    const down=new Map(),order=[out],vis=new Set([out]);down.set(out,null);
    for(let q=0;q<order.length;q++){const x=order[q];madj.get(x).forEach(pi=>{const p=pipes[pi],o=p.u===x?p.v:p.u;if(vis.has(o))return;vis.add(o);down.set(o,pi);order.push(o);if(p.v!==x){p.nodes.reverse();[p.u,p.v]=[p.v,p.u];}});}
    // 상류로 가장 긴 길이 (본선 고르기)
    const up=new Map();[...order].reverse().forEach(x=>{const kids=madj.get(x).filter(pi=>pipes[pi].v===x&&down.get(pipes[pi].u)===pi);up.set(x,Math.max(0,...kids.map(pi=>pipes[pi].len+up.get(pipes[pi].u))));});
    return {out,down,up,order};});
  // 끊긴 곳: 서로 다른 관로망의 끝점이 10 m 안에 있으면 알림
  const compOf=new Map();comps.forEach((c,ci)=>c.forEach(x=>compOf.set(x,ci)));const gaps=[];
  for(let a=0;a<ends.length;a++)for(let b=a+1;b<ends.length;b++){const A=nodes[ends[a]],B=nodes[ends[b]],d=Math.hypot(A.p[0]-B.p[0],A.p[1]-B.p[1]);if(d<10&&compOf.get(ends[a])!==compOf.get(ends[b]))gaps.push({a:A.p,b:B.p,d});}
  return {nodes,pipes,madj,trees,gaps};
}
/* 관로망 → 노선 (본선 = 출구에서 가장 긴 상류 길, 갈라지는 곳마다 지선 노선) */
function netLines(N){ // 관로망 → 노선: 본선 = 출구에서 가장 긴 상류 길, 갈라지는 맨홀마다 지선 노선 (받는 관로 = 그 맨홀에서 나가는 관)
  const lines=[];
  N.trees.forEach((T,ti)=>{const grp=ti+1;let sub=0;
    const kids=x=>N.madj.get(x).filter(pi=>N.pipes[pi].v===x&&T.down.get(N.pipes[pi].u)===pi);
    const longest=ks=>ks.reduce((a,b)=>N.pipes[b].len+T.up.get(N.pipes[b].u)>N.pipes[a].len+T.up.get(N.pipes[a].u)?b:a);
    const line=(first,recv)=>{ // first: 이 노선 맨 하류 관
      const seq=[first];let x=N.pipes[first].u,cut=false;for(let g=0;g<N.pipes.length;g++){const ks=kids(x);if(!ks.length)break;const pk=longest(ks);
        if(!!N.pipes[pk].ext!==!!N.pipes[seq[0]].ext){cut=true;break;} /* 일반 관 ↔ 외부처리 관이 바뀌면 다른 노선 */
        seq.unshift(pk);x=N.pipes[pk].u;}
      sub++;lines.push({code:`${grp}-${sub}`,seq,recv});
      if(cut)kids(x).forEach(q=>line(q,seq[0]));
      for(let k=1;k<seq.length;k++){const at=N.pipes[seq[k]].u;kids(at).filter(q=>q!==seq[k-1]).forEach(q=>line(q,seq[k]));}};
    const ks=kids(T.out);if(!ks.length)return;const main=longest(ks);line(main,null);ks.filter(q=>q!==main).forEach(q=>line(q,null));});
  return lines;
}
function netMake(){ // 관로 입력 노선 만들기
  if(!DXF)return toast("먼저 계획도(또는 수치지형도)를 넣으세요.");
  const ents=DXF.ents,zs=[];ents.forEach(e=>{if(isContour(e.layer))e.pts.forEach((p,k)=>{if(!(isFinite(p[2])&&p[2]!==0))return;zs.push(p);const q=e.pts[k+1];if(q){const L=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.min(200,Math.floor(L/5));for(let m=1;m<n;m++)zs.push([p[0]+(q[0]-p[0])*m/n,p[1]+(q[1]-p[1])*m/n,p[2]]);}});else if(isSpot(e.layer)&&isFinite(e.z)&&e.z!==0)zs.push([e.x,e.y,e.z]);});
  const zT=zs.length?zIndex(zs):null,RZ=roadZf(ents),zAt=(zT||RZ)?(pt=>{const r=RZ?RZ(pt):NaN;return isFinite(r)?r:(zT?zT(pt):NaN);}):null,N=netBuild(ents,zAt); // 계획 종단이 있으면 맨홀 지반고 = 계획고
  if(!N)return toast(`우수관로 레이어(${bsLay().pipe})를 찾지 못했습니다. 레이어 지정을 확인하세요.`);if(N.err)return toast(N.err);
  const LS=netLines(N),cur=LN(),cond=JSON.parse(JSON.stringify(cur.cond)),rain=JSON.parse(JSON.stringify(cur.rain)),cvals=(cur.cvals||C_VALUES).slice(),cv=+cond.cvUse||1,d0=String(+cond.dPlan||450);
  const r2=v=>Math.round(v*100)/100,idOf=new Map();
  LS.forEach(L=>L.seq.forEach((pk,k)=>idOf.set(pk,`${L.code}-${pad2(k+1)}`)));
  const lines=LS.map(L=>{const l=normLine(JSON.parse(JSON.stringify({...SAMPLE_LINE(),cond,rain,cvals})));l.name=`우수 ${L.code} Line`;l.code=L.code;l.img=null;l.mh={};l.geo={};
    l.inflow={...l.inflow,A:0,L:0};l.inflow.kerby=l.inflow.kerby.map(k=>({n:k.n,a:0}));
    l.pipes=L.seq.map((pk,k)=>{const P=N.pipes[pk],za=N.nodes[P.u].z,zb=N.nodes[P.v].z,id=idOf.get(pk);l.geo[id]=P.nodes.map(i=>[Math.round(N.nodes[i].p[0]*1000)/1000,Math.round(N.nodes[i].p[1]*1000)/1000]);
      return {id,sta1:"",sta2:"",dir:"",gl1:k===0&&isFinite(za)?r2(za):"",gl2:isFinite(zb)?r2(zb):"",cv1:k===0?cv:"",cv2:cv,size:d0,thk:0,len:r2(P.len),nrow:1,n:k===0?(+cond.n||0.013):"",inv2fix:"",inl:[],areas:Array(12).fill(0),ext:P.ext||undefined};});
    return l;});
  // 지선이 들어가는 관로에 인입 관로 번호
  LS.forEach((L,li)=>{if(L.recv==null)return;const rid=idOf.get(L.recv),last=idOf.get(L.seq[L.seq.length-1]);lines.forEach(l=>l.pipes.forEach(p=>{if(p.id===rid)p.inl.push(last);}));});
  // 지선을 먼저 (계산 순서는 recalc가 알아서 정함) — 보기 좋게 본선부터
  NETBK=JSON.stringify(ST);ST.lines=lines;ST.active=0;full();
  $("netUndo").hidden=false;
  const np=lines.reduce((s,l)=>s+l.pipes.length,0),ext=lines.reduce((s,l)=>s+l.pipes.filter(p=>p.ext).length,0);
  BSN.gaps=N.gaps;toast(`관로 입력을 새로 만들었습니다: 관로망 ${N.trees.length}개, 노선 ${lines.length}개, 관로 ${np}개${ext?` (외부처리 ${ext}개 포함)`:""}${N.gaps.length?` · 끊긴 곳 ${N.gaps.length}군데 (유역도에 빨간 원)`:""}. ${RZ?"지반고는 도로 안 맨홀은 계획 종단 계획고, 도로 밖은 지형(등고선) 값입니다.":"지반고는 지형(등고선) 값이니 계획 종단을 넣거나 계획고로 바꾸세요."}`);
  BSN.res=null;BSN.autoApply=true;bsRun(); // 유역도가 다시 그려지면 면적·유입시간을 바로 넣음
}
var NETBK=null;
$("netMake").addEventListener("click",e=>{const b=e.currentTarget;if(b.dataset.armed!=="1"){b.dataset.armed="1";const t=b.textContent;b.textContent="지금 노선을 모두 바꿉니다 — 한 번 더 누르세요";b.classList.add("danger");setTimeout(()=>{b.dataset.armed="";b.textContent=t;b.classList.remove("danger");},3500);return;}
  b.dataset.armed="";b.textContent="도면에서 관로 입력 만들기";b.classList.remove("danger");netMake();});
$("netUndo").addEventListener("click",()=>{if(!NETBK)return;ST=JSON.parse(NETBK);ST.lines.forEach(normLine);NETBK=null;$("netUndo").hidden=true;full();BSN.res=null;bsRun();toast("관로 입력을 만들기 전으로 되돌렸습니다.");});
function renderLay(){const L=bsLay();$("layBox").innerHTML=[["cl","계획 도로 중심선"],["edge","도로 끝선"],["pipe","우수관로"],["line","노선 번호 글자 (선택)"],["no","관로 번호 글자 (선택)"],["river","하천·저수지 (물이 빠지는 곳)"]].map(([k,t])=>`<label class="f"><span>${t}</span><input data-ly="${k}" value="${XE(L[k])}"></label>`).join("")+`<label class="f"><span>맨홀로 볼 꺾임 (° 이상, 0 = 꼭짓점 모두)</span><input data-ly="ang" type="number" min="0" max="90" step="0.1" value="${isFinite(+L.ang)?+L.ang:0}"></label>`;}
$("layBox").addEventListener("change",e=>{const el=e.target.closest("[data-ly]");if(!el)return;ST.bsLay=ST.bsLay||{};ST.bsLay[el.dataset.ly]=el.value;persist();bsInfo();BSN.res=null;bsRun();});
renderLay();
