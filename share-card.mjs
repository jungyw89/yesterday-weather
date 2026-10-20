// 가족에게 보내는 옷차림 카드 이미지 (1080×1350 PNG) 만들기 + 공유
import {shirt} from './visuals.mjs';
import {shareText} from './quick-core.mjs';
const FONT='"Apple SD Gothic Neo","Noto Sans KR",-apple-system,sans-serif';
const TONE={cold:'#476d86',warm:'#994c30',same:'#294b3a'};
function loadSvg(svg){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="160" height="170" '));});}
function round(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function fitText(g,text,max,size,weight=700){let s=size;do{g.font=`${weight} ${s}px ${FONT}`;s-=2;}while(g.measureText(text).width>max&&s>28);}
export async function makeCardBlob(v,{place,dateText}){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const g=c.getContext('2d');
  g.fillStyle='#f6f7f2';g.fillRect(0,0,1080,1350);g.textAlign='center';g.textBaseline='alphabetic';
  g.fillStyle='#68766d';g.font=`600 38px ${FONT}`;g.fillText(`${place} · ${dateText} 아침`,540,150);
  g.fillStyle=TONE[v.tone]||TONE.same;fitText(g,v.headline,920,84,800);g.fillText(v.headline,540,265);
  g.fillStyle='#e8eddc';round(g,80,330,920,560,48);g.fill();
  const icons=await Promise.all(v.clothes.map(c=>loadSvg(shirt(c)))),w=Math.min(220,860/icons.length),start=540-w*icons.length/2;
  icons.forEach((img,i)=>g.drawImage(img,start+i*w+(w-180)/2,400,180,191));
  g.fillStyle='#263b33';fitText(g,v.full,840,70,800);g.fillText(v.full,540,720);
  const rainText=v.umbrella||(v.rain?'☂ 우산도 챙겨요':'');if(rainText){g.fillStyle='#476d86';fitText(g,rainText,880,42,700);g.fillText(rainText,540,810);}
  if(v.plan){g.fillStyle='#294b3a';fitText(g,v.plan,860,40,700);g.fillText(v.plan,540,rainText?870:810);}
  g.fillStyle='#294b3a';g.font=`800 60px ${FONT}`;g.fillText(v.closing,540,1050);
  g.fillStyle='#294b3a';round(g,300,1170,480,6,3);g.fill();
  g.fillStyle='#68766d';g.font=`600 34px ${FONT}`;g.fillText('기온 말고, 어제. — 어제와 비교해서',540,1250);
  return await new Promise(r=>c.toBlob(r,'image/png'));
}
// 결과: 'shared' | 'cancelled' | 'fallback' (공유 창이 없는 기기: 이미지·문구를 돌려줌)
export async function shareCard(v,info){
  const text=shareText(v,info.place,info.url),blob=await makeCardBlob(v,info);
  const file=new File([blob],'오늘의옷차림.png',{type:'image/png'});
  try{
    if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],text});return {result:'shared'};}
    if(navigator.share){await navigator.share({text});return {result:'shared'};}
  }catch(e){if(e.name==='AbortError')return {result:'cancelled'};}
  let copied=false;try{await navigator.clipboard.writeText(text);copied=true;}catch{}
  return {result:'fallback',blob,text,copied};
}
