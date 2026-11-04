/* ---------- WAMIS 자료 새로 넣기 (확률강우량(지역빈도해석).xlsx) ---------- */
const WAMIS_BUILTIN={T:WAMIS_T,ST:WAMIS_ST,D:WAMIS_D,SRC:WAMIS_SRC,META:WAMIS_META,INFO:LIBINFO.wamis};
const WDB={name:"usu-wamis",store:"d",key:"wamis"};
function wdb(mode,fn){return new Promise((res,rej)=>{try{const q=indexedDB.open(WDB.name,1);q.onupgradeneeded=()=>q.result.createObjectStore(WDB.store);
  q.onsuccess=()=>{try{const tx=q.result.transaction(WDB.store,mode),st=tx.objectStore(WDB.store),r=fn(st);tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error);}catch(e){rej(e);}};q.onerror=()=>rej(q.error);}catch(e){rej(e);}});}
function wamisRefFor(ST2){ // 지침(2025) 기준지점: 기상청 같은 지점, 없으면 TM 좌표로 가장 가까운 지점
  const g=BUILTIN_RAIN.filter(e=>e.g==="g2025"),gc=new Set(g.map(e=>+e.code)),pos={};
  ST2.forEach(s=>{if(s.ag==="기상청"&&gc.has(s.c%1000)&&isFinite(s.x))pos[s.c%1000]=[s.x,s.y];});
  g.forEach(e=>{if(!pos[+e.code]){const m=ST2.find(s=>(s.n===e.st||s.o===e.st)&&isFinite(s.x));if(m)pos[+e.code]=[m.x,m.y];}});
  const ks=Object.keys(pos).map(Number);
  return s=>{if(s.ag==="기상청"&&pos[s.c%1000])return s.c%1000;if(!isFinite(s.x)||!ks.length)return 159;
    return ks.reduce((b,k)=>{const d=(pos[k][0]-s.x)**2+(pos[k][1]-s.y)**2;return d<b[0]?[d,k]:b;},[1e99,159])[1];};
}
function parseWamisWB(wb,fname){
  const rowsOf=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null});
  const iN=wb.SheetNames.find(n=>/index/i.test(n)),pN=wb.SheetNames.find(n=>n!==iN&&/확률강우량/.test(n))||wb.SheetNames.find(n=>n!==iN);
  if(!iN)throw new Error('"지역빈도해석 강우관측소 Index" 시트가 없습니다.');
  if(!pN)throw new Error("확률강우량 시트가 없습니다.");
  const ST2=rowsOf(iN).filter(r=>isFinite(+r[0])&&+r[0]>1e6).map(r=>({c:+r[0],b:String(r[1]||"").trim(),o:String(r[2]||"").trim(),n:String(r[3]||r[2]||"").trim(),ag:String(r[4]||"").trim(),x:+r[7],y:+r[8]}));
  if(!ST2.length)throw new Error("Index 시트에서 지점코드를 찾지 못했습니다.");
  const P=rowsOf(pN);let hr=P.findIndex(r=>r.some(v=>/관측소\s*코드/.test(String(v||""))));
  if(hr<0)throw new Error('확률강우량 시트에 "관측소코드" 머리글이 없습니다.');
  const ci=P[hr].findIndex(v=>/관측소\s*코드/.test(String(v||""))),durC=[];
  for(let j=ci+2;j<P[hr].length;j++){const h=+P[hr][j];if(isFinite(h)&&h===durC.length+1)durC.push(j);else if(durC.length)break;}
  if(durC.length<24)throw new Error(`지속기간 열이 ${durC.length}개뿐입니다(1시간부터 이어진 숫자 머리글이 필요합니다).`);
  const data={};
  P.slice(hr+1).forEach(r=>{const c=+r[ci],T=+r[ci+1];if(!(c>1e6&&T>0))return;const v=durC.map(j=>+r[j]);if(v.some(x=>!(x>0)))return;(data[c]=data[c]||{})[T]=v;});
  const codes=Object.keys(data).map(Number);if(!codes.length)throw new Error("확률강우량 값을 읽지 못했습니다.");
  const Ts=[...new Set(codes.flatMap(c=>Object.keys(data[c]).map(Number)))].sort((a,b)=>a-b);
  const ref=wamisRefFor(ST2),info=new Map(ST2.map(s=>[s.c,s])),ST3=[],D={};let skip=0;
  codes.forEach(c=>{if(!Ts.every(T=>data[c][T])){skip++;return;}const s=info.get(c)||{c,b:"기타",n:String(c),o:"",ag:""};
    ST3.push([c,s.n,s.b||"기타",s.ag,ref(s),s.o&&s.o!==s.n?s.o:""]);
    D[c]=Ts.map(T=>{let p=0;return data[c][T].map(v=>{const q=Math.round(v*10),d=q-p;p=q;return d;}).join(",");}).join(";");});
  const ym=(pN.match(/(19|20)\d\d/)||[])[0];
  return {T:Ts,ST:ST3,D,meta:{user:true,name:fname,year:ym?+ym:null,n:ST3.length,hours:durC.length,skip,date:new Date().toISOString().slice(0,10)}};
}
function wamisUse(o){
  if(o){WAMIS_T=o.T;WAMIS_ST=o.ST;WAMIS_D=o.D;WAMIS_META=o.meta;
    WAMIS_SRC=`WAMIS 지역빈도해석 확률강우량 (${o.meta.year?o.meta.year+"년까지 강우자료, ":""}${o.meta.name}, ${o.meta.date} 불러옴)`;
    LIBINFO.wamis=`WAMIS에서 받아 넣은 지역빈도해석 확률강우량입니다. ${o.meta.name} · ${o.meta.n}개 관측소, 재현기간 ${o.T[0]}~${o.T[o.T.length-1]}년, 지속기간 1~${o.meta.hours}시간${o.meta.year?`, ${o.meta.year}년까지 강우자료`:""}. 1시간 미만은 아래 식 형태 칸에서 채우는 방법을 고릅니다.`;}
  else{const B=WAMIS_BUILTIN;WAMIS_T=B.T;WAMIS_ST=B.ST;WAMIS_D=B.D;WAMIS_SRC=B.SRC;WAMIS_META=B.META;LIBINFO.wamis=B.INFO;}
  buildWLIB();wamisStat();
}
function wamisStat(){
  const m=WAMIS_META;$("wReset").hidden=!m.user;
  $("wStat").innerHTML=m.user?`지금 목록: <b>불러온 자료</b> · ${XE(m.name)} · ${m.n}개 지점${m.year?` · ${m.year}년까지 강우자료`:""} · ${m.date} 불러옴${m.skip?` (재현기간이 빠진 ${m.skip}개 지점 제외)`:""}`
    :`지금 목록: <b>내장 자료</b> · 환경부 홍수량 산정 표준지침(2019) · 2017년까지 강우자료 · ${m.n}개 지점`;
}
$("wFile").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  if(typeof XLSX==="undefined"){toast("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.");return;}
  $("wStat").textContent=`${f.name} 읽는 중…`;
  const fr=new FileReader();fr.onload=async()=>{try{
      const o=parseWamisWB(XLSX.read(new Uint8Array(fr.result),{type:"array"}),f.name);wamisUse(o);
      try{await wdb("readwrite",st=>st.put(o,WDB.key));}catch(err){toast("이 브라우저에 저장하지 못해, 새로 열면 내장 자료로 돌아갑니다.");}
      renderLib();$("kLibSrc").value="wamis";fillLibSt("wamis");
      toast(`WAMIS 자료 ${o.meta.n}개 지점을 넣었습니다. 이미 적용한 노선은 지점을 다시 골라 "이 노선에 적용"을 눌러야 바뀝니다.`);
    }catch(err){wamisStat();toast("읽지 못했습니다: "+(err.message||err));}};
  fr.readAsArrayBuffer(f);});
let wResetArm=false;
$("wReset").addEventListener("click",async e=>{const b=e.target;
  if(!wResetArm){wResetArm=true;b.textContent="한 번 더 누르면 되돌립니다";setTimeout(()=>{wResetArm=false;b.textContent="내장 자료로 되돌리기";},4000);return;}
  wResetArm=false;b.textContent="내장 자료로 되돌리기";try{await wdb("readwrite",st=>st.delete(WDB.key));}catch(err){}
  wamisUse(null);renderLib();$("kLibSrc").value="wamis";fillLibSt("wamis");toast("내장 WAMIS 자료로 되돌렸습니다.");});
wamisStat();
wdb("readonly",st=>st.get(WDB.key)).then(o=>{if(o&&o.ST&&o.D){wamisUse(o);renderLib(true);}}).catch(()=>{});
