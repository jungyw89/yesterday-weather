// 하루 계획: 아침 옷 기준으로 점심·저녁에 "벗어도 / 다시 입어요 / 챙겨 가요" (네트워크·화면 없음, 자동 검사 대상)
import {finite,baseOutfit,outers,warmth} from './core.mjs';
export const SLOT_NAMES={noon:'점심',evening:'저녁'};
export const SLOT_FEELS={cold:'추움',ok:'적당함',hot:'더움',indoor:'실내'};
const ADJUST=2;        // 어제 그 시간에 추웠다/더웠다 → 체감을 ±2° 옮겨 판단
const SIMILAR=4;       // 어제와 오늘 그 시간 체감 차이가 4° 이내일 때만 어제 경험을 반영

// result: recommend() 결과(아침 옷). record: 어제 기록. 시간대 날씨가 하나도 없으면 null
export function dayPlan(result,weather,record,yesterday){
  if(!result?.available||!result.clothes?.length||!weather?.slots?.today)return null;
  const outer=result.clothes.find(c=>outers.includes(c))||null,mw=warmth(result.clothes),morning=weather.today?.feels;
  const items=[];let removed=false,evaluated=0;
  for(const slot of ['noon','evening']){
    const t=weather.slots.today[slot];if(!finite(t?.feels))continue;evaluated++;
    let e=t.feels;
    const felt=record?.date===yesterday?record.slots?.[slot]?.feeling:null,y=weather.slots.yesterday?.[slot]?.feels;
    if((felt==='cold'||felt==='hot')&&finite(y)&&Math.abs(t.feels-y)<=SIMILAR)e+=felt==='cold'?-ADJUST:ADJUST;
    const need=baseOutfit(e),needOuter=need.action==='wear',needItem=need.clothes.find(c=>outers.includes(c))||'겉옷',name=SLOT_NAMES[slot];
    if(outer&&!needOuter&&!removed){items.push({slot,action:'remove',text:`${name}엔 ${outer} 벗어도 돼요`});removed=true;}
    else if(outer&&needOuter&&removed){items.push({slot,action:'rewear',text:`${name}엔 다시 입어요`});removed=false;}
    else if(!outer&&needOuter){const d=finite(morning)?Math.round(morning-t.feels):0;items.push({slot,action:'carry',text:`${name}엔 ${d>=2?`${d}° `:''}쌀쌀해져요 · ${needItem} 챙겨 가요`});break;}
    else if(outer&&needOuter&&!removed&&warmth(need.clothes)>mw+2){const d=finite(morning)?Math.round(morning-t.feels):0;items.push({slot,action:'warmer',text:`${name}엔 ${d>=2?`${d}° `:''}더 추워요 · ${needItem}처럼 따뜻한 겉옷을 챙겨요`});break;}
  }
  if(!evaluated)return null;
  return {items,text:items.length?items.map(i=>i.text).join(' · '):'하루 종일 이 차림이면 돼요'};
}
// 같은 옷으로 점심·저녁을 기록할지: 그 날짜의 시간대 날씨가 있어야 의미가 있음
export function slotsToAsk(weather,which){const s=weather?.slots?.[which];return ['noon','evening'].filter(k=>finite(s?.[k]?.feels));}
