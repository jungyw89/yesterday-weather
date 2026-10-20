// 커뮤니티 공유·추천 계산 (네트워크 없음, 자동 검사 대상)
import {groups,cities,feelings,finite,shiftDate,dates} from './core.mjs';
export const COMMUNITY_VERSION='1.0';
export const SHARE_DAYS=7;          // 서버도 같은 기간만 받음
export const MIN_OK=5;              // 이 수보다 적으면 커뮤니티 추천을 보여주지 않음
export const MIN_MINE=5;            // 체질 보정에 필요한 내 기록 수
export const MATCH_RANGE=2;         // 비슷한 체감 = ±2°
const order=groups.flatMap(g=>g.items);
// 옷 한 벌의 보온 점수 (대략적인 겹 수)
const WARMTH={'반팔':1,'긴팔':2,'셔츠':2,'니트':3,'긴바지':2,'긴 청바지':2,'반바지':0,'치마':1,'원피스':2,'가디건':2,'재킷':3,'코트':5,'패딩':6};
export function canonicalClothes(clothes){return [...new Set(clothes)].filter(c=>order.includes(c)).sort((a,b)=>order.indexOf(a)-order.indexOf(b));}
export function warmth(clothes){return canonicalClothes(clothes).reduce((s,c)=>s+WARMTH[c],0);}
export function regionOf(context){const c=cities.find(c=>c.lat===context?.lat&&c.lon===context?.lon);return c?c.name:'기타';}
const median=list=>{const s=[...list].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};

// 내 기록 → 서버로 보낼 익명 자료. 보낼 수 없으면 {skip:이유}
export function shareRow(record,today=dates().today){
  if(!record?.feeling||!Object.hasOwn(feelings,record.feeling))return {skip:'체감 평가가 있어야 공유돼요.'};
  if(record.experience?.place==='indoor')return {skip:'실내에서 느낀 기록은 공유하지 않아요.'};
  const snap=record.weatherSnapshot;
  if(!finite(snap?.feels)||snap.feels< -40||snap.feels>50||!Number.isInteger(snap.hour))return {skip:'저장할 때의 체감 날씨가 있어야 공유돼요.'};
  if(record.date>today||record.date<shiftDate(today,-SHARE_DAYS))return {skip:`최근 ${SHARE_DAYS}일 이내 기록만 공유돼요.`};
  const clothes=canonicalClothes(record.clothes||[]);
  if(!clothes.length)return {skip:'옷을 골라야 공유돼요.'};
  return {row:{p_date:record.date,p_hour:snap.hour,p_feels:Math.round(snap.feels*10)/10,p_feeling:record.feeling,p_clothes:clothes,p_place:record.experience?.place==='outdoor'?'outdoor':'unknown',p_region:regionOf(snap.queryContext||record.context)}};
}

// 체질 보정: +면 평균보다 추위를 더 탐, −면 더위를 더 탐 (°C)
export function sensitivity(myRecords,rows){
  const ok=rows.filter(r=>r.feeling==='ok'&&finite(r.feels));
  const samples=[];
  for(const rec of myRecords){
    if(!rec.feeling||rec.experience?.place==='indoor'||!finite(rec.weatherSnapshot?.feels))continue;
    const w=warmth(rec.clothes||[]);if(!w)continue;
    const similar=ok.filter(r=>Math.abs(warmth(r.clothes)-w)<=1).map(r=>r.feels);
    if(similar.length<3)continue;
    const comfortable=rec.weatherSnapshot.feels+{cold:3,ok:0,hot:-3}[rec.feeling];
    samples.push(comfortable-median(similar));
  }
  if(samples.length<MIN_MINE)return {available:false,count:samples.length,need:MIN_MINE};
  const offset=Math.max(-5,Math.min(5,Math.round(median(samples)*2)/2));
  return {available:true,count:samples.length,offset};
}
export function sensitivityText(s){
  if(!s?.available)return `내 기록 ${s?.count||0}/${s?.need||MIN_MINE}개 · 더 쌓이면 체질을 맞춰 드려요`;
  if(Math.abs(s.offset)<1)return `추위·더위를 평균과 비슷하게 느껴요 (기록 ${s.count}개 기준)`;
  return `평균보다 ${s.offset>0?'추위':'더위'}를 약 ${Math.abs(s.offset)}° 더 타요 (기록 ${s.count}개 기준)`;
}

// 오늘 체감에서 "적당했다"는 사람들이 입은 조합
export function communityPick(rows,todayFeels,offset=0){
  if(!finite(todayFeels))return {available:false,reason:'오늘 체감 날씨를 확인한 뒤 보여드릴게요.',total:0};
  const target=Math.round((todayFeels-offset)*10)/10;
  const near=rows.filter(r=>finite(r.feels)&&Math.abs(r.feels-target)<=MATCH_RANGE&&Object.hasOwn(feelings,r.feeling));
  const ok=near.filter(r=>r.feeling==='ok');
  const dist={cold:0,ok:0,hot:0};near.forEach(r=>dist[r.feeling]++);
  const base={target,range:[Math.round((target-MATCH_RANGE)*10)/10,Math.round((target+MATCH_RANGE)*10)/10],total:near.length,okCount:ok.length,dist};
  if(ok.length<MIN_OK)return {...base,available:false,reason:`비슷한 체감의 공유 기록이 아직 ${ok.length}건이에요. ${MIN_OK}건부터 보여드려요.`};
  const counts=new Map();
  for(const r of ok){const c=canonicalClothes(r.clothes);if(!c.length)continue;const key=c.join('|');counts.set(key,(counts.get(key)||0)+1);}
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([key,count])=>({clothes:key.split('|'),count,pct:Math.round(count/ok.length*100)}));
  return {...base,available:true,top};
}
