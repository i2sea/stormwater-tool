/* ---------- 계정 저장소 (작업 이름 붙여 보관 · 나만 보임) ---------- */
const SV={col:null,list:[]};
const svDate=t=>{try{return new Date(t).toLocaleString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch(e){return "";}};
function svSummary(){const n=ST.lines.length,p=ST.lines.reduce((s,l)=>s+l.pipes.length,0);return `노선 ${n}개 · 관로 ${p}개`;}
function svPack(){ // 256 KiB 한도: 넘으면 유역도 그림을 빼고 저장
  let j=JSON.stringify(ST),noImg=false;
  if(j.length>240000){const c=JSON.parse(j);c.lines.forEach(l=>{l.img=null;});j=JSON.stringify(c);noImg=true;}
  return {j,noImg,too:j.length>250000};
}
function renderSaved(){
  const box=$("svList");
  if(!SV.col){box.innerHTML=`<p class="note">이 화면에서는 계정 저장소를 쓸 수 없습니다. 아래 파일 내보내기·가져오기를 쓰세요.</p>`;return;}
  if(!SV.list.length){box.innerHTML=`<p class="note">저장한 작업이 없습니다. 이름을 넣고 저장하면 여기에 쌓입니다.</p>`;return;}
  box.innerHTML=SV.list.map(d=>`<div class="sv-row" data-id="${XE(d.id)}"><div class="sv-meta"><b>${XE(d.name||"이름 없음")}</b><small>${XE(svDate(d.savedAt))} · ${XE(d.summary||"")}${d.noImg?" · 유역도 그림 제외":""}</small></div>
    <div class="sv-btns"><button type="button" class="btn small" data-act="load">불러오기</button><button type="button" class="btn small" data-act="over">덮어쓰기</button><button type="button" class="btn small" data-act="del">삭제</button></div></div>`).join("");
}
(async function svInit(){
  try{
    const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
    if(!db||!user){renderSaved();return;}
    const uid=await user.id();if(!uid){renderSaved();return;}
    SV.col=db.collection("data/users/"+uid);$("svBtn").disabled=false;
    SV.col.orderBy("savedAt","desc").onSnapshot(snap=>{SV.list=snap.docs.map(s=>({id:s.id,...s.data()}));renderSaved();},
      ()=>{SV.col=null;$("svBtn").disabled=true;renderSaved();});
  }catch(e){renderSaved();}
})();
async function svWrite(ref,name){
  const P=svPack();if(P.too){toast("작업이 너무 커서 계정 저장소에 넣을 수 없습니다. 파일로 내보내세요.");return false;}
  await ref.set({name,savedAt:Date.now(),summary:svSummary(),noImg:P.noImg,data:P.j});
  if(P.noImg)toast("유역도 그림이 커서 빼고 저장했습니다. 그림은 이 브라우저에 그대로 있습니다.");
  return true;
}
$("svBtn").addEventListener("click",async()=>{
  if(!SV.col)return;
  const name=$("svName").value.trim()||`${ST.proj.name||"우수 수리계산"} (${svDate(Date.now())})`,same=SV.list.find(d=>d.name===name);
  $("svBtn").disabled=true;
  try{if(await svWrite(same?SV.col.doc(same.id):SV.col.doc(),name)){$("svName").value="";toast(same?`"${name}"을 새 값으로 덮어썼습니다.`:`"${name}"으로 저장했습니다.`);}}
  catch(e){toast(e&&e.code==="quota_exceeded"?"저장 공간이 가득 찼습니다. 안 쓰는 작업을 지우세요.":"저장하지 못했습니다. 잠시 후 다시 시도하세요.");}
  finally{$("svBtn").disabled=false;}
});
$("svName").addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();$("svBtn").click();}});
$("svList").addEventListener("click",async ev=>{
  const b=ev.target.closest("[data-act]");if(!b)return;
  const id=b.closest(".sv-row").dataset.id,d=SV.list.find(x=>x.id===id);if(!d)return;const act=b.dataset.act;
  if(act==="load"){try{const v=JSON.parse(d.data);if(!validProj(v))throw 0;
      const keepImg=new Map(ST.lines.map(l=>[l.name,l.img]));ST=v;ST.proj={...SAMPLE_PROJ().proj,...(ST.proj||{})};ST.lines.forEach(normLine);
      if(d.noImg)ST.lines.forEach(l=>{if(!l.img&&keepImg.get(l.name))l.img=keepImg.get(l.name);});
      ST.active=0;full();toast(`"${d.name}"을 불러왔습니다.`);}catch(e){toast("이 저장본을 읽지 못했습니다.");}return;}
  if(b.dataset.armed!=="1"){const lbl=b.textContent;b.dataset.armed="1";b.textContent=act==="del"?"정말 삭제":"정말 덮어쓰기";b.classList.add("danger");
    setTimeout(()=>{b.dataset.armed="";b.textContent=lbl;b.classList.remove("danger");},3000);return;}
  try{if(act==="del"){await SV.col.doc(id).delete();toast(`"${d.name}"을 지웠습니다.`);}
    else if(await svWrite(SV.col.doc(id),d.name))toast(`"${d.name}"을 지금 값으로 덮어썼습니다.`);}
  catch(e){toast("처리하지 못했습니다. 잠시 후 다시 시도하세요.");}
});
