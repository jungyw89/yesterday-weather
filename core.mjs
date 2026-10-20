export const cities = [
  ['서울',37.5665,126.978],['부산',35.1796,129.0756],['인천',37.4563,126.7052],
  ['대구',35.8714,128.6014],['대전',36.3504,127.3845],['광주',35.1595,126.8526],
  ['울산',35.5384,129.3114],['수원',37.2636,127.0286],['제주',33.4996,126.5312]
].map(([name,lat,lon])=>({name,lat,lon}));
export const groups=[{name:'상의',items:['반팔','긴팔','셔츠','니트']},{name:'하의 · 한 벌',items:['긴바지','긴 청바지','반바지','치마','원피스']},{name:'겉옷',items:['가디건','재킷','코트','패딩']}];
export const feelings={cold:'추움',ok:'적당함',hot:'더움'};
export const outers=['가디건','재킷','코트','패딩'];
export const RULE_VERSION='2.1';
export const finite=Number.isFinite;
export function shiftDate(date,amount){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function dates(now=new Date()) {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const today=`${p.year}-${p.month}-${p.day}`;return {today,yesterday:shiftDate(today,-1)};}
export function currentHour(now=new Date()){return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(now));}
export function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&finite(new Date(v+'T12:00:00Z').valueOf())&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function validContext(v){return v&&finite(v.lat)&&Math.abs(v.lat)<=90&&finite(v.lon)&&Math.abs(v.lon)<=180&&Number.isInteger(v.hour)&&v.hour>=0&&v.hour<24;}
export function contextEqual(a,b){return !!a&&!!b&&a.lat===b.lat&&a.lon===b.lon&&a.hour===b.hour;}
// 점심·저녁 시각: 아침(설정 시각)보다 늦을 때만 사용
export function slotHours(settings){const m=settings.hour,n=settings.noonHour??13,e=settings.eveningHour??19;const noon=Number.isInteger(n)&&n>m&&n<24?n:null;const evening=Number.isInteger(e)&&e>(noon??m)&&e<24?e:null;return {noon,evening};}
export function weatherKey(settings,today){const s=slotHours(settings);return [settings.lat,settings.lon,today,settings.hour,s.noon,s.evening].join('|');}
export function parseWeather(data,today,hour,slots={noon:null,evening:null}){
  if(!Array.isArray(data?.hourly?.time))throw Error('날씨 자료를 읽지 못했어요. 다시 확인해 주세요.');
  const h=data.hourly;
  const read=(date,at)=>{const index=h.time.indexOf(`${date}T${String(at).padStart(2,'0')}:00`);const row={date,hour:at};
    for(const [key,col] of Object.entries({temp:'temperature_2m',feels:'apparent_temperature',wind:'wind_speed_10m',humidity:'relative_humidity_2m',rain:'precipitation',chance:'precipitation_probability',code:'weather_code'})){
      const value=index<0?null:h[col]?.[index];row[key]=finite(value)?value:null;
    } return row;
  };
  const outlook=read(hour===23?shiftDate(today,1):today,(hour+1)%24);
  const pick=date=>Object.fromEntries(['noon','evening'].map(k=>[k,Number.isInteger(slots[k])?read(date,slots[k]):null]));
  return {today:read(today,hour),yesterday:read(shiftDate(today,-1),hour),outlook,slots:{today:pick(today),yesterday:pick(shiftDate(today,-1))},timezone:data.timezone||'Asia/Seoul'};
}
export function experienceLevel(record,settings,today,weather){
  if(!record||record.date!==shiftDate(today,-1)||!record.clothes?.length||!record.feeling)return 'basic';
  const e=record.experience;
  if(e?.place==='indoor'||(e?.location&&!contextEqual({...e.location,hour:settings.hour},settings))||(Number.isInteger(e?.hour)&&e.hour!==settings.hour))return 'excluded';
  if(e?.place!=='outdoor'||!validContext({...e?.location,hour:e?.hour}))return 'reference';
  return finite(weather?.today?.feels)&&finite(weather?.yesterday?.feels)?'personal':'reference';
}
export function direction(feeling,delta){const band=delta< -2?0:delta>2?2:1;return {cold:['add','add','base'],ok:['add','reuse','reduce'],hot:['base','reduce','reduce']}[feeling]?.[band]||'base';}
// 옷 한 벌의 보온 점수 (대략적인 겹 수)
export const WARMTH={'반팔':1,'긴팔':2,'셔츠':2,'니트':3,'긴바지':2,'긴 청바지':2,'반바지':0,'치마':1,'원피스':2,'가디건':2,'재킷':3,'코트':5,'패딩':6};
export function warmth(clothes){return [...new Set(clothes)].reduce((s,c)=>s+(WARMTH[c]??0),0);}
export function baseOutfit(a){
  if(a<10)return {clothes:['니트','긴바지','코트'],outer:'따뜻한 외투',action:'wear'};
  if(a<16)return {clothes:['긴팔','긴바지','재킷'],outer:'보온 겉옷',action:'wear'};
  if(a<21)return {clothes:['긴팔','긴바지','가디건'],outer:'얇은 겉옷',action:'wear'};
  return {clothes:['반팔',a>=26?'반바지':'긴바지'],outer:'겉옷',action:'leave'};
}
function complete(clothes){return clothes.includes('원피스')||(clothes.some(c=>['반팔','긴팔','셔츠','니트'].includes(c))&&clothes.some(c=>['긴바지','긴 청바지','반바지','치마'].includes(c)));}
export function recommend(weather,record,settings,today=dates().today){
  const a=weather?.today?.feels,y=weather?.yesterday?.feels,level=experienceLevel(record,settings,today,weather);
  if(!finite(a))return {available:false,level,clothes:[],reason:'체감 날씨를 확인하면 옷차림을 알려드릴게요.'};
  const result={available:true,...baseOutfit(a),level,delta:finite(y)?a-y:null,reason:'오늘의 체감온도를 기준으로 골랐어요.',rule:RULE_VERSION};
  if(level==='reference')result.reason='어제 경험은 참고만 했어요. 느낀 시간·장소를 알면 더 맞출 수 있어요.';
  if(level==='excluded')result.reason='어제 경험의 장소나 시간이 달라 오늘 날씨를 기준으로 골랐어요.';
  if(level==='personal'){
    const d=direction(record.feeling,result.delta);
    result.reason=`어제 ${feelings[record.feeling]}으로 남긴 야외 경험을 반영했어요.`;
    if(d==='reduce'&&a<16){
      // 어제 더웠던 차림보다 두껍게 권하지 않는다 (겉옷은 유지)
      if(complete(record.clothes)&&record.clothes.some(c=>outers.includes(c))&&warmth(record.clothes)<warmth(result.clothes)&&warmth(record.clothes)>=warmth(result.clothes)-2){result.clothes=[...new Set(record.clothes)];result.action='wear';result.reason='어제 더웠던 차림보다 두껍게 입지 않도록 어제 옷을 기준으로 했어요. 오늘은 체감이 낮아 겉옷은 입고 출발하세요.';}
      else result.reason='어제 더웠어도 오늘은 체감이 낮아 겉옷을 입는 쪽을 권해요.';
    }
    else if(d==='reduce'){
      result.clothes=result.clothes.filter(c=>!outers.includes(c));result.action='leave';
      if(a>=21)result.clothes=result.clothes.map(c=>['긴팔','니트','셔츠'].includes(c)?'반팔':c);
      result.reason='어제 경험을 반영해 한 겹 가볍게 시작해 보세요.';
    }else if(d==='add'&&a>=26)result.reason='오늘은 체감이 높아 보온을 더하지 않았어요. 어제 느낀 상황을 다시 확인해 주세요.';
    else if(d==='add'){
      if(!result.clothes.some(c=>outers.includes(c)))result.clothes.push('가디건');
      else if(!result.clothes.includes('니트'))result.clothes=result.clothes.map(c=>c==='긴팔'?'니트':c);
      result.action='wear';result.reason='어제 경험을 반영해 얇은 한 겹으로 보온을 더해 보세요.';
    }else if(d==='reuse'&&complete(record.clothes)&&!record.clothes.some(c=>['코트','패딩'].includes(c))&&a>=16&&a<26){
      const hasOuter=record.clothes.some(c=>outers.includes(c));
      if((a<21&&hasOuter)||(a>=21&&!hasOuter)){result.clothes=[...record.clothes];result.action=hasOuter?'wear':'leave';result.reason='어제 편안했던 조합을 오늘도 먼저 입어 보세요.';}
    }
  }
  if(finite(weather.today.wind)&&weather.today.wind>=5&&a<21){
    if(!result.clothes.some(c=>outers.includes(c)))result.clothes.push('재킷');
    result.action='wear';result.reason='바람을 막을 수 있는 겉옷을 입고 출발하세요. 오늘 바람을 우선했어요.';
  }
  result.outer=result.clothes.find(c=>outers.includes(c))||record?.clothes?.find(c=>outers.includes(c))||'겉옷';
  result.outerLabel=result.action==='wear'?'입고 출발':'지금은 벗고 출발';
  const outlook=weather.outlook;
  result.rain=finite(outlook?.rain)||finite(outlook?.chance)?(outlook.rain>0||outlook.chance>=40):null;
  result.rainRange=`${String(settings.hour).padStart(2,'0')}:00–${String((settings.hour+1)%24).padStart(2,'0')}:00`;
  return result;
}
export function validateBackup(value,today=dates().today){
  if(![1,2].includes(value?.version)||!Array.isArray(value.records)||value.records.length>3000)throw Error('이 앱의 백업 파일을 선택해 주세요.');
  const names=groups.flatMap(g=>g.items),seen=new Set();
  return value.records.map(r=>{
    if(!validDate(r.date)||r.date>today||seen.has(r.date)||!Array.isArray(r.clothes)||!r.clothes.length||r.clothes.some(c=>!names.includes(c))||(r.feeling!==null&&!Object.hasOwn(feelings,r.feeling))||!validContext(r.context)||r.photo&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.photo)||r.photo.length>3*1024*1024))throw Error('올바르지 않은 기록이 있어 가져오기를 중단했어요. 기존 기록은 그대로예요.');
    seen.add(r.date);
    let experience=null;
    if(r.experience){const e=r.experience;
      if(!['unknown','indoor','outdoor'].includes(e.place)||(e.hour!==null&&(!Number.isInteger(e.hour)||e.hour<0||e.hour>23))||(e.location!==null&&!validContext({...e.location,hour:0})))throw Error('경험 정보가 올바르지 않아요.');
      experience={place:e.place,hour:e.hour,location:e.location?{name:String(e.location.name).slice(0,50),lat:e.location.lat,lon:e.location.lon}:null};
    }
    const slotFeel=v=>['cold','ok','hot','indoor'].includes(v)?v:null;
    const slots=r.slots&&typeof r.slots==='object'?{noon:{feeling:slotFeel(r.slots.noon?.feeling)},evening:{feeling:slotFeel(r.slots.evening?.feeling)}}:undefined;
    return {...r,slots,date:r.date,clothes:[...new Set(r.clothes)],photo:r.photo||null,experience,context:{name:String(r.context.name||'지역 미확인').slice(0,50),lat:r.context.lat,lon:r.context.lon,hour:r.context.hour},schemaVersion:2};
  });
}
