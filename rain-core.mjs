// 우산 판단: 지금(또는 아침)부터 귀가 시각까지 시간별 비를 보고 "챙겨요 / 접이식이면 안심 / 두고 가도 돼요"
// 네트워크·화면 없음, 자동 검사 대상
import {finite} from './core.mjs';
export const TAKE_CHANCE=40;     // 기존 우산 기준과 같게 (강수확률 40% 이상이면 챙기기)
export const MAYBE_CHANCE=20;    // 20~39%: 접이식이면 안심
export const HEAVY_MM=3;         // 시간당 3mm 이상이면 장우산
const wet=h=>(finite(h.rain)&&h.rain>=0.1)||(finite(h.chance)&&h.chance>=TAKE_CHANCE);
const maybe=h=>!wet(h)&&finite(h.chance)&&h.chance>=MAYBE_CHANCE;
// 연속된 시간을 "15~18시"로 (시간별 자료는 그 시각부터 1시간 구간)
export function hourRange(hours){if(!hours.length)return '';const a=hours[0],b=hours.at(-1)+1;return b-a<=1?`${a}시`:`${a}~${b}시`;}
function firstBlock(rows,test){const i=rows.findIndex(test);if(i<0)return [];const out=[];for(let j=i;j<rows.length&&test(rows[j]);j++)out.push(rows[j]);return out;}
// rows: [{hour,rain,chance}] (오늘, 시각 순). from: 판단 시작 시각, to: 귀가 시각(포함)
export function umbrellaPlan(rows,from,to){
  const win=(rows||[]).filter(h=>h.hour>=from&&h.hour<=to);
  if(!win.length||win.every(h=>!finite(h.rain)&&!finite(h.chance)))return null;
  const max=Math.max(...win.map(h=>finite(h.chance)?h.chance:0)),mm=Math.max(...win.map(h=>finite(h.rain)?h.rain:0));
  if(win.some(wet)){
    const block=firstBlock(win,wet),range=hourRange(block.map(h=>h.hour)),bmax=Math.max(...block.map(h=>finite(h.chance)?h.chance:0));
    const heavy=mm>=HEAVY_MM,last=win.slice(-2),dryReturn=last.length===2&&last.every(h=>!wet(h)&&!maybe(h))&&block.at(-1).hour<last[0].hour;
    return {level:'take',size:heavy?'long':'folding',title:heavy?'장우산 챙겨요':'우산 챙겨요',detail:`${range} 비${bmax?` ${bmax}%`:''}${heavy?' · 비가 세요':''}`,
      reminder:dryReturn?'돌아올 땐 그쳐요 · 우산 놓고 오지 마세요':'',range,max,mm};
  }
  if(win.some(maybe)){const block=firstBlock(win,maybe);return {level:'maybe',size:'folding',title:'접이식 우산이면 안심',detail:`${hourRange(block.map(h=>h.hour))} 비 가능성 ${Math.max(...block.map(h=>h.chance))}%`,reminder:'',max,mm};}
  return {level:'skip',size:null,title:'우산은 두고 가도 돼요',detail:`${to+1}시까지 비 소식 없어요`,reminder:'',max,mm};
}
// 가족 카드·문구용 짧은 말
export function umbrellaShort(u){return !u?'':u.level==='take'?`☂ ${u.title} (${u.detail})`:u.level==='maybe'?`☂ ${u.title}`:'☂ 우산은 필요 없어요';}
