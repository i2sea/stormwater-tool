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

/* ---------- 구글 드라이브 저장: 사용자의 Google Drive 커넥터로 "내 드라이브 › - GitHub 작업 - › 우수 수리계산" 폴더에 .storm.json ---------- */
const GD={server:"Google Drive",parent:"- GitHub 작업 -",folder:"우수 수리계산",ctx:null,list:null,on:false,busy:false};
async function gdCall(tool,input){const mcp=window.claude&&window.claude.use?await window.claude.use("mcp"):null;if(!mcp)throw {code:"not_granted",message:"이 화면에서는 구글 드라이브를 쓸 수 없습니다"};
  const r=await mcp.callTool(GD.server,tool,input,{cache:false});return {payload:r.payload,result:r};}
const gdErr=e=>{const c=e&&e.code;return c==="needs_reauth"?"구글 드라이브 연결이 만료되었습니다. claude.ai 설정 → 커넥터에서 Google Drive를 다시 연결해 주세요.":c==="server_not_connected"?"claude.ai 설정 → 커넥터에서 Google Drive를 추가해 주세요.":(c==="approval_required"||c==="not_in_manifest"||c==="consent_required")?"이 도구가 구글 드라이브를 쓰도록 허용해야 합니다(허용 창에서 \"허용\").":c==="selection_required"?"연결된 Google Drive가 여러 개라 하나를 골라야 합니다.":(c==="not_granted"||c==="capability_disabled"||c==="unavailable")?"이 화면에서는 구글 드라이브를 쓸 수 없습니다(claude.ai에서 도구를 열어 주세요).":(e&&(e.message||e.code))||String(e);};
async function gdFolder(){if(GD.ctx)return GD.ctx.folder;
  const q=t=>`title = '${t.replace(/'/g,"\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const par=((await gdCall("search_files",{query:q(GD.parent),excludeContentSnippets:true,pageSize:5})).payload||{}).files||[];const pid=par[0]&&par[0].id;
  const fnd=((await gdCall("search_files",{query:q(GD.folder)+(pid?` and parentId = '${pid}'`:""),excludeContentSnippets:true,pageSize:5})).payload||{}).files||[];
  let folder=fnd[0]&&fnd[0].id;
  if(!folder){const c=(await gdCall("create_file",{title:GD.folder,contentMimeType:"application/vnd.google-apps.folder",...(pid?{parentId:pid}:{})})).payload||{};folder=c.id;}
  if(!folder)throw new Error("구글 드라이브 폴더를 만들지 못했습니다");
  let fileArgs=false;try{const mcp=await window.claude.use("mcp");fileArgs=!!(await mcp.listTools()).fileArgs;}catch(e){}
  GD.ctx={folder,fileArgs,where:pid?`내 드라이브 › ${GD.parent} › ${GD.folder}`:`내 드라이브 › ${GD.folder}`};$("gdWhere").textContent=GD.ctx.where;return folder;}
const gdB64=b=>{const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder().decode(u);};
const gdKb=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
async function gdLoadList(){const folder=await gdFolder();
  const fs=((await gdCall("search_files",{query:`parentId = '${folder}' and trashed = false and title contains '.storm.json'`,excludeContentSnippets:true,pageSize:100})).payload||{}).files||[];
  GD.list=fs.map(x=>({id:x.id,name:String(x.title||"").replace(/\.storm\.json$/i,""),ts:Date.parse(x.modifiedTime)||0,size:+x.fileSize||0,url:x.viewUrl})).sort((a,b)=>b.ts-a.ts);}
function gdRender(msg){const box=$("gdList");
  if(msg){box.innerHTML=`<p class="note">${XE(msg)}</p>`;return;}
  if(!GD.list){box.innerHTML=`<p class="note">"목록 보기"를 누르면 드라이브 폴더의 저장본이 나옵니다.</p>`;return;}
  if(!GD.list.length){box.innerHTML=`<p class="note">드라이브 폴더에 저장본이 없습니다. 이름을 넣고 "구글 드라이브에 저장"을 누르세요.</p>`;return;}
  box.innerHTML=GD.list.map(d=>`<div class="sv-row" data-gid="${XE(d.id)}"><div class="sv-meta"><b>${XE(d.name)}</b><small>${XE(svDate(d.ts))} · ${gdKb(d.size)}${d.url?` · <a href="${XE(d.url)}" target="_blank" rel="noopener">드라이브에서 보기</a>`:""}</small></div>
    <div class="sv-btns"><button type="button" class="btn small" data-gact="load">불러오기</button><button type="button" class="btn small" data-gact="over">덮어쓰기</button><button type="button" class="btn small" data-gact="del">삭제</button></div></div>`).join("");}
async function gdRefresh(){if(GD.busy)return;GD.busy=true;gdRender("구글 드라이브에서 목록을 받는 중…");
  try{await gdLoadList();GD.on=true;gdRender();}catch(e){GD.list=null;gdRender("지금은 구글 드라이브를 쓸 수 없습니다: "+gdErr(e));}finally{GD.busy=false;}}
async function gdPut(name,oldId){const folder=await gdFolder(),data=JSON.stringify(ST),title=`${name.replace(/[\\/]/g,"_")}.storm.json`;
  const base={title,parentId:folder,contentMimeType:"application/json",disableConversionToGoogleType:true},bytes=new TextEncoder().encode(data).length;let input;
  if(bytes<700000)input={...base,textContent:data};
  else if(GD.ctx.fileArgs)input={...base,base64Content:{$file:{data:new Blob([data],{type:"application/json"}),name:"project.json",type:"application/json"}}};
  else throw new Error(`저장본이 ${gdKb(bytes)}라 이 화면에서는 구글 드라이브로 바로 올릴 수 없습니다. "파일로 내보내기" 후 드라이브에 올려 주세요.`);
  await gdCall("create_file",input);if(oldId)await gdCall("trash_file",{fileId:oldId});} /* 덮어쓰기 = 새로 저장 후 이전 파일은 휴지통 */
async function gdGet(id){const {payload,result}=await gdCall("download_file_content",{fileId:id});
  if(payload&&typeof payload.content==="string")return gdB64(payload.content);
  const blk=((result&&result.content)||[]).find(c=>c.resource&&(c.resource.blob||c.resource.text));if(blk)return blk.resource.text||gdB64(blk.resource.blob);
  if(typeof payload==="string")return payload;throw new Error("파일 내용을 받지 못했습니다");}
$("gdRefresh").addEventListener("click",gdRefresh);
$("gdSave").addEventListener("click",async()=>{const b=$("gdSave");if(b.disabled)return;
  const name=$("gdName").value.trim()||`${ST.proj.name||"우수 수리계산"} (${svDate(Date.now()).replace(/[:]/g,".")})`,same=(GD.list||[]).find(d=>d.name===name);
  b.disabled=true;toast("구글 드라이브에 저장하는 중…");
  try{await gdPut(name,same&&same.id);$("gdName").value="";toast(same?`"${name}"을 새 값으로 덮어썼습니다 (구글 드라이브).`:`"${name}"으로 구글 드라이브에 저장했습니다.`);await gdLoadList();GD.on=true;gdRender();}
  catch(e){toast("구글 드라이브에 저장하지 못했습니다: "+gdErr(e));}finally{b.disabled=false;}});
$("gdName").addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();$("gdSave").click();}});
$("gdList").addEventListener("click",async ev=>{const b=ev.target.closest("[data-gact]");if(!b)return;
  const id=b.closest(".sv-row").dataset.gid,d=(GD.list||[]).find(x=>x.id===id);if(!d)return;const act=b.dataset.gact;
  if(b.dataset.armed!=="1"){const lbl=b.textContent;b.dataset.armed="1";b.textContent=act==="del"?"정말 삭제":act==="over"?"정말 덮어쓰기":"지금 작업을 바꿈";b.classList.add("danger");
    setTimeout(()=>{if(!b.isConnected)return;b.dataset.armed="";b.textContent=lbl;b.classList.remove("danger");},3000);return;}
  b.disabled=true;
  try{if(act==="load"){toast("구글 드라이브에서 받는 중…");const v=JSON.parse(await gdGet(id));if(!validProj(v))throw new Error("우수 수리계산 작업 파일이 아닙니다");
      ST=v;ST.proj={...SAMPLE_PROJ().proj,...(ST.proj||{})};ST.lines.forEach(normLine);ST.active=0;full();toast(`"${d.name}"을 구글 드라이브에서 불러왔습니다.`);return;}
    if(act==="del"){await gdCall("trash_file",{fileId:id});toast(`"${d.name}"을 드라이브 휴지통으로 옮겼습니다.`);}
    else{await gdPut(d.name,id);toast(`"${d.name}"을 지금 값으로 덮어썼습니다 (구글 드라이브).`);}
    await gdLoadList();gdRender();}
  catch(e){toast("처리하지 못했습니다: "+gdErr(e));b.disabled=false;}});
