/* 작업 저장: 구글 드라이브 (계정 저장소는 2026-11-05 뺌 — 드라이브로 대신) */
const svDate=t=>{try{return new Date(t).toLocaleString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch(e){return "";}};
/* ---------- 구글 드라이브 저장: 사용자의 Google Drive 커넥터로 "내 드라이브 › - GitHub 작업 - › 우수 수리계산" 폴더에 .storm.json ---------- */
var GD={server:"Google Drive",parent:"- GitHub 작업 -",folder:"우수 수리계산",ctx:null,list:null,on:false,busy:false};
const gdTO=(p,ms,what)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej({code:"timeout",message:`${what}이(가) ${Math.round(ms/1000)}초 동안 응답이 없습니다. 허용 창이 화면 다른 곳에 떠 있는지 확인하거나, 브라우저의 claude.ai에서 도구를 열어 주세요.`}),ms))]);
async function gdCall(tool,input){gdStep(`구글 드라이브 요청 중… (${tool})`);const mcp=window.claude&&window.claude.use?await gdTO(window.claude.use("mcp"),15000,"드라이브 연결"):null;if(!mcp)throw {code:"not_granted",message:"이 화면에서는 구글 드라이브를 쓸 수 없습니다"};
  const r=await gdTO(mcp.callTool(GD.server,tool,input,{cache:false}),45000,"구글 드라이브");return {payload:r.payload,result:r};}
function gdStep(m){const box=$("gdList");if(box&&GD.busyMsg!==false)box.innerHTML=`<p class="note">${XE(m)}</p>`;}
async function gdPerm(){try{const P=window.claude&&window.claude.use?await gdTO(window.claude.use("permissions"),5000,"권한 확인"):null;if(!P)return "?";return await gdTO(P.state("mcp"),5000,"권한 확인");}catch(e){return "?";}}
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
  try{await gdLoadList();GD.on=true;gdRender();}catch(e){GD.list=null;gdRender("지금은 구글 드라이브를 쓸 수 없습니다: "+gdErr(e)+(e&&e.code?` [${e.code}]`:""));}finally{GD.busy=false;}}
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
function gdDenied(){$("gdList").innerHTML=`<p class="note">구글 드라이브 사용이 이 도구에서 꺼져 있습니다. <button type="button" class="btn small" id="gdManage">권한 설정 열기</button> 에서 Google Drive를 켜 주세요.</p>`;}
$("gdList").addEventListener("click",async ev=>{if(ev.target.id!=="gdManage")return;try{const P=await window.claude.use("permissions");if(P)await P.manage();}catch(e){toast("권한 설정 창을 열지 못했습니다. 화면 위 아티팩트 메뉴의 권한(Permissions)에서 켜 주세요.");}});
$("gdRefresh").addEventListener("click",gdRefresh);
$("gdSave").addEventListener("click",async()=>{const b=$("gdSave");if(b.disabled)return;
  const name=$("gdName").value.trim()||`${ST.proj.name||"우수 수리계산"} (${svDate(Date.now()).replace(/[:]/g,".")})`,same=(GD.list||[]).find(d=>d.name===name);
  b.disabled=true;toast("구글 드라이브에 저장하는 중…");gdStep("구글 드라이브 권한 확인 중…");
  try{const st=await gdPerm();if(st==="denied"){gdDenied();return;}if(st==="unavailable")throw {code:"not_granted",message:"이 화면에서는 구글 드라이브 연결을 쓸 수 없습니다 (권한 상태: unavailable)"};
    await gdPut(name,same&&same.id);$("gdName").value="";toast(same?`"${name}"을 새 값으로 덮어썼습니다 (구글 드라이브).`:`"${name}"으로 구글 드라이브에 저장했습니다.`);await gdLoadList();GD.on=true;gdRender();}
  catch(e){const m="구글 드라이브에 저장하지 못했습니다: "+gdErr(e)+(e&&e.code?` [${e.code}]`:"");toast(m);gdRender(m);try{console.warn("gdrive",e);}catch(_){}}finally{b.disabled=false;}});
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
