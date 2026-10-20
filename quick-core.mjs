// 3초룰: 맨 위 결론 한 문장 · 어제 빠른 기록 · 공유 문구 (네트워크·화면 없음, 자동 검사 대상)
import {finite,RULE_VERSION,groups} from './core.mjs';
const order=groups.flatMap(g=>g.items);
const sorted=list=>[...new Set(list)].sort((a,b)=>order.indexOf(a)-order.indexOf(b));

// 어제와 비교한 한 마디. 홈 화면의 '비슷해요' 기준(±2°)과 같게 맞춤
export function deltaPhrase(delta,todayFeels){
  if(!finite(delta))return {tone:'same',text:finite(todayFeels)?`오늘 아침 체감 ${Math.round(todayFeels)}°`:'오늘의 옷차림'};
  if(Math.abs(delta)<=2)return {tone:'same',text:'어제와 비슷해요'};
  const n=Math.round(Math.abs(delta));
  return delta<0?{tone:'cold',text:`어제보다 ${n}° 쌀쌀해요`}:{tone:'warm',text:`어제보다 ${n}° 따뜻해요`};
}
export function outfitDiff(before,after){
  const a=new Set(before),b=new Set(after);
  const added=sorted(after.filter(c=>!a.has(c))),removed=sorted(before.filter(c=>!b.has(c)));
  return {same:!added.length&&!removed.length,added,removed};
}
// 맨 위 결론. 추천이 없으면 null (추측으로 채우지 않음)
export function verdict(r,record,delta,todayFeels,yesterday){
  if(!r?.available||!r.clothes?.length)return null;
  const head=deltaPhrase(delta,todayFeels),clothes=sorted(r.clothes),full=clothes.join(' + ');
  let answer=full,relative=false;
  if(record?.date===yesterday&&record.clothes?.length){
    const d=outfitDiff(record.clothes,clothes);
    if(d.same){answer='어제 그 옷 그대로';relative=true;}
    else if(!d.removed.length){answer=`어제 옷 + ${d.added.join(' + ')}`;relative=true;}
    else if(!d.added.length){answer=`어제 옷에서 ${d.removed.join(' · ')} 빼기`;relative=true;}
  }
  const closing={cold:'따뜻하게 입고 가요',warm:'오늘은 가볍게 입어요',same:'어제처럼 입으면 돼요'}[head.tone];
  return {tone:head.tone,headline:head.text,answer,relative,clothes,full,closing,rain:r.rain===true};
}

// 어제 체감에 맞춘 빠른 선택지 4개 (가벼운 → 따뜻한 순)
export const LADDER=[['반팔','반바지'],['반팔','긴바지'],['긴팔','긴바지'],['긴팔','긴바지','가디건'],['긴팔','긴바지','재킷'],['니트','긴바지','재킷'],['니트','긴바지','코트'],['니트','긴바지','패딩']];
export function quickPresets(feels){
  const center=!finite(feels)?3:feels<5?7:feels<10?6:feels<13?5:feels<16?4:feels<19?3:feels<22?2:feels<26?1:0;
  const start=Math.max(0,Math.min(LADDER.length-4,center-1));
  return LADDER.slice(start,start+4).map(c=>[...c]);
}
// 빠른 기록: 질문 문구가 "어제 {시각} {지역}, 밖에서"로 명시하므로 그 맥락으로 저장
export function quickRecord({clothes,feeling,settings,yesterday,weatherRow,slotRows=null,fetchedAt,now=new Date()}){
  const at=now.toISOString();
  const rec={date:yesterday,clothes:sorted(clothes),feeling,photo:null,context:{name:settings.name,lat:settings.lat,lon:settings.lon,hour:settings.hour},
    experience:{place:'outdoor',hour:settings.hour,location:{name:settings.name,lat:settings.lat,lon:settings.lon}},
    createdAt:at,updatedAt:at,schemaVersion:2,recommendationVersion:RULE_VERSION,quick:true};
  if(weatherRow?.date===yesterday&&finite(weatherRow.feels))rec.weatherSnapshot={...weatherRow,queryContext:{...rec.context},fetchedAt,source:'Open-Meteo model'};
  if(rec.weatherSnapshot&&slotRows){const sl={};for(const k of ['noon','evening'])if(slotRows[k]?.date===yesterday&&finite(slotRows[k].feels))sl[k]={hour:slotRows[k].hour,feels:slotRows[k].feels};if(Object.keys(sl).length)rec.weatherSnapshot.slots=sl;}
  rec.slots={noon:{feeling:null},evening:{feeling:null}};
  return rec;
}
// 가족에게 보내는 문구 (어제 옷 기준 표현은 받는 사람이 모르므로 오늘 옷 전체로)
export function shareText(v,place,url){
  return `${place} 오늘 아침, ${v.headline}.\n${v.full}${v.rain?' · 우산도 챙겨요':''}${v.plan?`\n${v.plan}`:''}\n${v.closing}\n\n${url}`;
}
