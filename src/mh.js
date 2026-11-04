/* ---------- 맨홀 입력: 노선의 맨홀(관로 접합부) 목록 · 규격 지정 · 수량 ---------- */
const MH_SPECS=["1호","2호","3호","4호","5호","특수"];
function mhKey(nd){return nd.a?String(nd.a.no):"S:"+String(nd.b.no);} // 상류관 번호(첫 맨홀은 S:첫 관로)
function mhOvr(L,key){return (L&&L.mh&&L.mh[key])||{};}
function mhTargetNode(t,depth){ // 다른 노선으로 들어가는 끝 맨홀 → 받는 노선의 그 맨홀
  const R2=(typeof RALL!=="undefined"?RALL:[]).find(x=>x&&x.rows.includes(t));if(!R2||depth>5)return null;
  const pv=R2.rows[t.i-1],key=pv?String(pv.no):"S:"+t.no;return mhNodesOf(R2,depth+1).find(m=>m.key===key)||null;}
function mhNodesOf(Rr,depth=0){const rows=Rr.rows.filter(r=>r.size&&isFinite(r.inv1)&&isFinite(r.inv2)),out=[];
  rows.forEach((r,i)=>{if(i===0)out.push({a:null,b:r});out.push({a:r,b:rows[i+1]||null});});
  return out.map((nd,k)=>{const key=mhKey(nd),o=mhOvr(Rr.L,key),c=Rr.c;
    const gl=nd.b?nd.b.gl1:nd.a.gl2,dist=nd.b?nd.b.dist1:nd.a.dist2;
    const ins=[];if(nd.a)ins.push({no:nd.a.no,lab:nd.a.size.label,inv:nd.a.inv2});
    if(nd.b)(nd.b.inl||[]).filter(q=>!q.err).forEach(q=>ins.push({no:q.id,lab:q.size?q.size.label:"",inv:q.inv2,inl:true}));
    const outp=nd.b?{no:nd.b.no,lab:nd.b.size.label,inv:nd.b.inv1}:null;
    const tg=(!nd.b&&nd.a)?outTargets(nd.a):[];
    const invs=[...ins.map(x=>x.inv),outp?outp.inv:Infinity].filter(isFinite),lo=Math.min(...invs);
    const free=mhFreeAt(Rr.L,key);let H=mhRound(gl-lo+free),glUse=gl;if(tg.length){H=tg[0].mh;glUse=tg[0].t.gl1;}
    const auto=nodeSpecAuto(nd),spec=nodeSpec(nd,Rr.L),sq=mhSq(nd,Rr.L);
    const tm=tg.length?mhTargetNode(tg[0].t,depth):null; // 받는 맨홀 그대로 (수정 불가)
    if(tm)return {sq:tm.sq,k,key,nd,name:tm.name,dist,gl:glUse,ins,outp,tg,lo,H,auto:tm.auto,spec:tm.spec,fixed:tm.fixed,note:tm.note,sub:null,linked:tm,lineName:(RALL.find(x=>x&&x.rows.includes(tg[0].t))||{}).L?.name||""};
    return {sq,free,freeSet:o.free!=null&&o.free!=="",k,key,nd,name:o.name||`MH${lineCode(Rr.L)}-${pad2(k+1)}`,dist,gl:glUse,ins,outp,tg,lo,H,auto,spec,fixed:!!(o.spec&&MH_SPECS.includes(o.spec)),note:o.note||"",
      sub:nd.a&&nd.b&&isFinite(nd.b.drop)&&nd.b.drop>=DROP.sub-1e-9?nd.b.drop:null};});
}
function sqInputs(m){const q=m.sq,f=(k,v,set,ph,tt)=>`<input data-mf="${k}" type="number" step="0.1" min="0" class="mhsq${set?" set":""}" value="${set?v:""}" placeholder="${ph}" title="${tt}">`;
  return `<div class="mhsqbox" title="특수(사각) 맨홀 내부 치수 (m) · 가로 = 관로 방향 · 비우면 최대 관경 + 0.6 m (최소 2.0 m), 벽 0.3 m">□${f("sqL",q.L,q.setL,fx(q.def,1),"내부 가로 (관로 방향, m)")}×${f("sqB",q.B,q.setB,fx(q.def,1),"내부 세로 (m)")} t${f("sqT",q.T,q.setT,"0.3","벽·바닥 두께 (m)")}</div>`;}
function renderMh(){
  const l=LN(),c=R.c,box=$("mhTbl");let N=mhNodesOf(R);
  if(!N.length){box.innerHTML=`<p class="note">계산된 관로가 없습니다. 관로 입력에서 규격·지반고·토피를 넣으세요.</p>`;$("mhSum").innerHTML="";return;}
  const io=a=>a.map(x=>`<span class="${x.inl?"mhinl":""}">${XE(x.no)} ${XE(x.lab)} <b>${fx(x.inv,3)}</b>${x.inl?" (인입)":""}</span>`).join("");
  let h=`<thead><tr><th>맨홀 번호</th><th>측점</th><th>지반고<br>(m)</th><th>들어오는 관<br>번호 · 규격 · 관저고</th><th>나가는 관<br>번호 · 규격 · 관저고</th><th>최저<br>관저고</th><th>여유고<br>(m)</th><th>맨홀 높이<br>(m)</th><th>자동<br>규격</th><th>적용 규격</th><th>형상</th><th>부관<br>H (m)</th><th>비고</th></tr></thead><tbody>`;
  N.forEach(m=>{if(m.linked){h+=`<tr class="mhlink"><td><span class="mhname">${XE(m.name)}</span></td><td class="ctr">${fmtSta(m.dist,+c.chain||20)}</td><td class="n">${fx(m.gl,2)}</td>
    <td class="mhio">${io(m.ins)}</td><td class="mhio"><span class="mhout">${XE(m.tg[0].t.no)} 시점 맨홀로 인입</span></td><td class="n">${fx(m.linked.lo,3)}</td><td class="n">${fx(m.linked.free,2)}</td><td class="n"><b>${fx(m.H,1)}</b></td><td class="ctr">${m.auto}</td>
    <td class="ctr">${m.spec}</td><td class="ctr">${m.spec==="특수"?`사각<br><small>${fx(m.sq.L,1)}×${fx(m.sq.B,1)}</small>`:"원형"}</td><td class="n">-</td><td class="note">${XE(m.lineName)} 맨홀 그대로 (그 노선 맨홀 탭에서 수정)${m.note?` · ${XE(m.note)}`:""}</td></tr>`;return;}
    h+=`<tr data-k="${XE(m.key)}"><td><input data-mf="name" type="text" value="${XE(m.name)}" style="width:92px"></td><td class="ctr">${fmtSta(m.dist,+c.chain||20)}</td><td class="n">${fx(m.gl,2)}</td>
    <td class="mhio">${m.ins.length?io(m.ins):`<span class="note">시점 맨홀</span>`}</td><td class="mhio">${m.outp?io([m.outp]):m.tg.length?`<span class="mhout">${XE(m.tg[0].t.no)} 시점으로 인입<br>(받는 맨홀 높이 적용)</span>`:`<span class="note">종점 (방류)</span>`}</td>
    <td class="n">${fx(m.lo,3)}</td><td><input data-mf="free" type="number" step="0.01" min="0" class="mhfree${m.freeSet?" set":""}" value="${m.freeSet?m.free:""}" placeholder="${fx(mhFreeOf(c),2)}" title="비워 두면 설계조건 여유고 ${fx(mhFreeOf(c),2)} m"></td><td class="n"><b>${fx(m.H,1)}</b></td><td class="ctr">${m.auto}</td>
    <td><select data-mf="spec"><option value="">자동 (${m.auto})</option>${MH_SPECS.map(s=>`<option value="${s}"${m.fixed&&m.spec===s?" selected":""}>${s}${s==="특수"?" (사각)":""}</option>`).join("")}</select>${m.fixed&&MH_SPECS.indexOf(m.spec)<MH_SPECS.indexOf(m.auto)?`<div class="mhbad">자동 규격보다 작음</div>`:""}${m.spec==="특수"?sqInputs(m):""}</td>
    <td class="ctr">${m.spec==="특수"?`사각<br><small>${fx(m.sq.L,1)}×${fx(m.sq.B,1)}</small>`:"원형"}</td><td class="n">${m.sub!=null?`<span class="mhsub">${fx(m.sub,2)}</span>`:"-"}</td>
    <td><input data-mf="note" type="text" value="${XE(m.note)}" style="width:120px"></td></tr>`;});
  box.innerHTML=h+"</tbody>";
  {const trs=[...box.querySelectorAll("tbody tr")];const hh=Math.max(28,...trs.map(tr=>tr.getBoundingClientRect().height)); // 줄 높이 모두 같게 (가장 높은 줄 기준)
    if(hh>0)trs.forEach(tr=>{tr.style.height=Math.ceil(hh)+"px";});}
  const NL=N.filter(m=>m.linked);N=N.filter(m=>!m.linked); // 받는 노선 맨홀은 수량에서 뺌 (중복)
  const by={};N.forEach(m=>{const s=m.spec;(by[s]=by[s]||{n:0,H:0,sub:0}).n++;by[s].H+=m.H;if(m.sub!=null)by[s].sub++;});
  const ks=MH_SPECS.filter(s=>by[s]);
  $("mhSum").innerHTML=`<table class="mini" style="width:auto"><thead><tr><th>규격</th><th>형상</th><th>개수</th><th>높이 합계 (m)</th><th>평균 높이 (m)</th><th>부관</th></tr></thead><tbody>${ks.map(s=>`<tr><td class="ctr">${s}</td><td class="ctr">${s==="특수"?"사각 "+[...new Set(N.filter(m=>m.spec==="특수").map(m=>`${fx(m.sq.L,1)}×${fx(m.sq.B,1)}`))].join(", "):"원형"}</td><td class="n">${by[s].n}</td><td class="n">${fx(by[s].H,1)}</td><td class="n">${fx(by[s].H/by[s].n,2)}</td><td class="n">${by[s].sub||"-"}</td></tr>`).join("")}
    <tr class="tot"><td>계</td><td></td><td class="n">${N.length}</td><td class="n">${fx(N.reduce((a,m)=>a+m.H,0),1)}</td><td class="n">${fx(N.reduce((a,m)=>a+m.H,0)/N.length,2)}</td><td class="n">${N.filter(m=>m.sub!=null).length||"-"}</td></tr></tbody></table>
    <p class="note">${NL.length?`다른 노선으로 들어가는 끝 맨홀 ${NL.map(m=>XE(m.name)).join(", ")}은 받는 노선 맨홀과 같은 것이라 수량에서 뺐습니다 (회색 줄, 수정은 받는 노선에서).
`:""}규격은 KDS 61 40 00 표 1.7.1 표준맨홀(연결 관경·합류 여부로 자동)이고, 적용 규격을 고르면 종단면도에도 그 규격으로 그립니다.
맨홀 높이 = 지반고 − 최저 관저고 + 여유고, 0.1 m 단위로 올림. 여유고 칸은 비워 두면 설계조건 값(${fx(mhFreeOf(c),2)} m, 흐린 글씨)이고, 숫자를 넣으면 그 맨홀만 바뀝니다. 다른 노선으로 들어가는 끝 맨홀은 받는 쪽 맨홀 높이를 씁니다.
특수(사각)를 고르면 아래에 내부 가로(관로 방향)×세로와 벽 두께 칸이 나옵니다. 비우면 최대 관경 + 0.6 m (최소 2.0 m), 벽 0.3 m이고, 종단면도에 그 치수로 그립니다.
맨홀 번호·적용 규격·비고는 관로 번호(상류관)에 묶여 저장되므로 관로 순서를 바꿔도 따라갑니다.</p>`;
}
$("mhTbl").addEventListener("change",e=>{const el=e.target.closest("[data-mf]");if(!el)return;const tr=el.closest("tr"),k=tr.dataset.k,l=LN();
  l.mh=l.mh||{};const o=l.mh[k]=l.mh[k]||{};const v=el.value.trim();if(v){if(["free","sqL","sqB","sqT"].includes(el.dataset.mf)){const n=parseFloat(v);if(!(n>=0))return;o[el.dataset.mf]=n;}else o[el.dataset.mf]=v;}else delete o[el.dataset.mf];if(!Object.keys(o).length)delete l.mh[k];
  persist();renderMh();});
