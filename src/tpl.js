/* ---------- 엑셀 기본양식: 관로 입력 · 유역면적 입력만 (계산식 없음) ---------- */
const TPL_P=[["관로 번호","id"],["도로 측점 시점","sta1"],["도로 측점 종점","sta2"],["지반고 시점 (m)","gl1"],["지반고 종점 (m)","gl2"],["토피 시점 (m)","cv1"],["토피 종점 (m)","cv2"],
  ["규격 (mm)","size"],["두께 (mm)","thk"],["연장 (m)","len"],["련수","nrow"],["조도계수 n","n"],["종점 관저고 지정 (m)","inv2fix"],["인입 관로 (쉼표로 구분)","inl"]];
function tplWorkbook(withData){
  const wb=XLSX.utils.book_new(),l=LN();
  const pr=[["우수 관로 입력",""],["노선 이름",withData?l.name:""],[],TPL_P.map(c=>c[0])];
  if(withData)l.pipes.forEach(p=>pr.push(TPL_P.map(([,k])=>k==="inl"?(p.inl||[]).filter(Boolean).join(", "):(p[k]??""))));
  const ws1=XLSX.utils.aoa_to_sheet(pr);ws1["!cols"]=TPL_P.map(([h])=>({wch:Math.max(9,h.length*1.6)}));ws1["!merges"]=[{s:{r:0,c:0},e:{r:0,c:5}}];
  XLSX.utils.book_append_sheet(wb,ws1,"관로입력");
  const ar=[["우수 유역면적 입력 (ha)",""],["노선 이름",withData?l.name:""],[],["관로 번호",...C_LABELS],["유출계수 C",...(withData?l.cvals:C_VALUES)]];
  if(withData)l.pipes.forEach(p=>ar.push([p.id??"",...p.areas.map(v=>+v||"")]));
  const ws2=XLSX.utils.aoa_to_sheet(ar);ws2["!cols"]=[{wch:12},...C_LABELS.map(h=>({wch:Math.max(10,h.length*1.8)}))];ws2["!merges"]=[{s:{r:0,c:0},e:{r:0,c:5}}];
  XLSX.utils.book_append_sheet(wb,ws2,"유역면적");
  const note=[["작성 방법"],["· 관로입력: 4행 머리글 아래 5행부터 관로 한 줄씩. 관로 번호는 고유번호(예: 1-1-01)."],["· 시점 측점·지반고·토피는 비워 두면 앞 관로 종점 값(토피는 적용 단차)으로 자동."],
    ["· 규격: 원형관 300, BOX 600x700 (폭x높이, mm). 두께: 원형관은 관 두께, BOX는 상부 슬라브 두께."],["· 유역면적: 5행에 유출계수 C, 6행부터 관로 번호별 면적(ha). 관로 번호로 관로입력과 연결됩니다."],
    ["· 계산식은 없습니다. 이 파일을 '엑셀 양식에서 불러오기'로 넣으면 새 노선으로 들어가 계산됩니다."]];
  const ws3=XLSX.utils.aoa_to_sheet(note);ws3["!cols"]=[{wch:90}];XLSX.utils.book_append_sheet(wb,ws3,"작성방법");
  return wb;
}
function importBasic(wb,fname){
  const rows=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:""});
  const P=rows("관로입력"),hr=P.findIndex(r=>String(r[0]).replace(/\s/g,"")==="관로번호");if(hr<0)throw new Error("관로입력 시트 머리글(관로 번호)을 찾지 못했습니다.");
  const head=P[hr].map(h=>String(h).trim()),col=k=>{const t=TPL_P.find(c=>c[1]===k);return head.indexOf(t[0]);};
  const base=LN(),l=normLine(JSON.parse(JSON.stringify({...SAMPLE_LINE(),cond:base.cond,rain:base.rain,inflow:base.inflow,cvals:base.cvals})));
  l.name=String((P.find(r=>String(r[0]).trim()==="노선 이름")||[])[1]||"").trim()||fname.replace(/\.\w+$/,"");l.img=null;l.code=undefined;
  const num=v=>v===""||v==null?"":(isFinite(+v)?+v:"");
  l.pipes=P.slice(hr+1).filter(r=>r.some(v=>String(v).trim()!=="")).map(r=>{const g=k=>{const i=col(k);return i<0?"":r[i];};
    return {id:String(g("id")).trim(),sta1:String(g("sta1")).trim(),sta2:String(g("sta2")).trim(),dir:"",gl1:num(g("gl1")),gl2:num(g("gl2")),cv1:num(g("cv1")),cv2:num(g("cv2")),
      size:String(g("size")).trim(),thk:+num(g("thk"))||0,len:+num(g("len"))||0,nrow:+num(g("nrow"))||1,n:+num(g("n"))||base.cond.n||0.013,inv2fix:num(g("inv2fix")),
      inl:String(g("inl")).split(/[,\s]+/).map(s=>s.trim()).filter(Boolean),areas:Array(12).fill(0)};});
  if(!l.pipes.length)throw new Error("관로입력 시트에 관로가 없습니다.");
  if(l.pipes[0].cv1==="")l.pipes[0].cv1=+base.cond.cvUse||1;
  let ma=0;
  if(wb.Sheets["유역면적"]){const A=rows("유역면적"),ah=A.findIndex(r=>String(r[0]).replace(/\s/g,"")==="관로번호");
    if(ah>=0){const cr=A.find(r=>String(r[0]).replace(/\s/g,"").startsWith("유출계수"));if(cr)for(let j=0;j<12;j++){const v=+cr[j+1];if(isFinite(v)&&String(cr[j+1])!=="")l.cvals[j]=v;}
      A.slice(ah+1).forEach(r=>{const id=String(r[0]).trim();if(!id||/^유출계수/.test(id))return;const p=l.pipes.find(q=>q.id===id);if(!p)return;p.areas=Array.from({length:12},(_,j)=>+r[j+1]||0);ma++;});}}
  ST.lines.push(l);ST.active=ST.lines.length-1;
  const used=new Set(ST.lines.filter(x=>x!==l).flatMap(x=>x.pipes.map(p=>p.id)));let k=1;l.pipes.forEach(p=>{if(!p.id||used.has(p.id)){let id;do{id=`${lineCode(l)}-${pad2(k++)}`;}while(used.has(id)||l.pipes.some(q=>q!==p&&q.id===id));p.id=id;}used.add(p.id);});
  full();showImp([`<b>${XE(l.name)}</b> 노선으로 넣었습니다 (기본양식).`,`관로 ${l.pipes.length}개, 유역면적 연결 ${ma}개.`,"설계조건·강우강도·유입시간은 지금 노선 값을 그대로 가져왔습니다. 필요하면 조건 탭에서 고치세요."]);
}
$("btnTpl").addEventListener("click",()=>{
  if(typeof XLSX==="undefined"){toast("엑셀 라이브러리를 불러오지 못했습니다.");return;}
  save("우수_기본양식.xlsx",new Uint8Array(XLSX.write(tplWorkbook(false),{type:"array",bookType:"xlsx"})));});
