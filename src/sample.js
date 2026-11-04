/* 예제: 업로드한 엑셀(V5.0) 우수 1-1 Line 값 */
/* 엑셀 양식에서 불러온 노선용 기본값 (도로설계편람 식 형태) */
const ROAD_RAIN=()=>({type:"road",region:"부산",src:"도로설계편람(2012, 국토해양부) 식 310.9",sep:90,
    short:{a:253.5492,b:159.1007,c:1.6795,d:0.147,n:0.0109},
    long:{a:380.9872,b:118.4,c:-0.521,d:0.0627,n:0.2784},
    rps:[2,3,5,10,20,30,50,70,80,100,200,300,500]});
const G25_BUSAN=()=>JSON.parse(JSON.stringify((typeof BUILTIN_RAIN!=="undefined"?BUILTIN_RAIN:require("./raindata.js").BUILTIN_RAIN).find(e=>e.id==="g25-159").rain));
const SAMPLE_LINE=()=>({
  name:"우수 1-1 Line",
  cond:{T:50,road:false,tRoad:5,vmin:0.8,vmax:3.0,dPipe:1.0,dBox:0.9,n:0.013,chain:20,cvUse:1.0,dropUse:0.05,mhFree:0,protT:0.15,dMin:250,dPlan:450},
  rain:G25_BUSAN(),
  inflow:{A:2.07,L:162.6,zTop:41.9,zBot:24,kerby:[{n:0.02,a:0},{n:0.1,a:0},{n:0.2,a:2.07},{n:0.4,a:0},{n:0.6,a:0},{n:0.8,a:0}]},
  cvals:[0.9,0.8,0.8,0.8,0.7,0.7,0.7,0.6,0.5,0.6,0.3,0.2],
  pipes:[
    {sta1:"2+10.23",sta2:"2+0",dir:"좌",gl1:33.29,gl2:31.95,cv1:1,cv2:0.5,size:"300",thk:0,len:30,nrow:1,n:0.013,areas:[0,0,0,0,0,0.07,0,0,0,0,0,0]},
    {sta1:"",sta2:"1+0",dir:"좌",gl1:"",gl2:30.94,cv1:1,cv2:0.5,size:"300",thk:0,len:30,nrow:1,n:0.013,areas:[0,0,0,0,0,0.04,0,0,0,0,0,0]},
    {sta1:"",sta2:"0+9.56",dir:"중",gl1:"",gl2:30.15,cv1:1,cv2:0.5,size:"300",thk:0,len:15,nrow:1,n:0.013,areas:[0,0,0,0,0,0.41,0,0,0,0,0,0]},
    {sta1:"",sta2:"0+1.14",dir:"중",gl1:"",gl2:28.93,cv1:1,cv2:0.5,size:"300",thk:0,len:15,nrow:1,n:0.013,areas:[0,0,0,0,0,0.02,0,0,0,0,0,0]},
    {sta1:"",sta2:"0+9.12",dir:"중",gl1:"",gl2:27.14,cv1:1,cv2:0.5,size:"300",thk:0,len:29.5,nrow:1,n:0.013,areas:[0,0,0,0,0,0.02,0,0,0,0,0,0]},
    {sta1:"",sta2:"1+0",dir:"우",gl1:"",gl2:26.5,cv1:0.7,cv2:0.5,size:"300",thk:0,len:14.5,nrow:1,n:0.013,areas:[0,0,0,0,0,0.04,0,0,0,0,0,0]},
    {sta1:"",sta2:"2+0",dir:"우",gl1:"",gl2:25.21,cv1:1.2,cv2:0.5,size:"300",thk:0,len:14.5,nrow:1,n:0.013,areas:[0,0,0,0,0,0.02,0,0,0,0,0,0]},
    {sta1:"",sta2:"2+11.67",dir:"우",gl1:"",gl2:24.09,cv1:1.5,cv2:0.5,size:"600x700",thk:300,len:9.3,nrow:1,n:0.013,areas:[0,0,0,0,0,1.08,0,0,0,0,0,0]}
  ],
  img:null
});
const SAMPLE_RAINLIB=()=>[];
const SAMPLE_PROJ=()=>({rainLib:[],proj:{name:"일광신도시~황계마을 도시계획도로 개설공사",owner:"부산광역시 기장군",firm:"",drawNo:""},lines:[SAMPLE_LINE()],active:0});
if(typeof module!=="undefined") module.exports={SAMPLE_LINE,SAMPLE_PROJ,SAMPLE_RAINLIB,ROAD_RAIN};
