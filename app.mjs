import {cities,groups,feelings,outers,dates,shiftDate,currentHour,validContext,validDate,finite,weatherKey,parseWeather,recommend,validateBackup,RULE_VERSION} from './core.mjs';
import {shirt,face,sky} from './visuals.mjs';
import {shareRow,shareRows,sensitivity,sensitivityText,communityPick,SHARE_DAYS} from './community-core.mjs';
import {statsEnabled,setStats,logOpen} from './community.mjs';
import {communityEnabled,communityMode,hasConsent,setConsent,shareOutfit,unshareOutfit,deleteMyShares,myShareCount,communityRows,clearCommunityCache} from './community.mjs';
let community={status:'idle',rows:[],error:''},shareCount=null;
import {verdict,quickPresets,quickRecord} from './quick-core.mjs';
import {slotHours} from './core.mjs';
import {dayPlan,slotsToAsk,SLOT_NAMES,SLOT_FEELS} from './day-core.mjs';
const SLOT_SKIP='yesterday-weather-slot-skip-v1';
import {shareCard} from './share-card.mjs';
const QUICK_SKIP='yesterday-weather-quick-skip-v1';let quickSel=null,sharing=false;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SETTINGS='yesterday-weather-settings-v1',CACHE='yesterday-weather-cache-v2';
let settings={...cities[0],hour:8,confirmed:false},records=[],db=null,dbError='',view='today',filter='all',entry='today',draft=null,detailDate='',saving=false,photoBusy=false;
let weather=null,loading=true,error='',stale=false,fetched=0,requestId=0,installPrompt=null,toastTimer;
try{const v=JSON.parse(localStorage.getItem(SETTINGS));if(validContext(v))settings={...v,confirmed:!!v.confirmed};}catch{}
const dateLabel=d=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(d+'T12:00:00+09:00'));
const timeText=h=>`${String(h).padStart(2,'0')}:00`;
const num=(n,d=1)=>finite(n)?n.toFixed(d):'—';
const paths={sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',history:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 9h8M8 13h8M8 17h5',settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4 0a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',wind:'M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3',drop:'M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z',arrow:'M5 12h14m-5-5 5 5-5 5',back:'M19 12H5m5-5-5 5 5 5',refresh:'M20 7V3m0 4h-4M4 17v4m0-4h4M5 7a8 8 0 0 1 13-2l2 2M4 17l2 2a8 8 0 0 0 13-2',check:'m5 12 4 4L19 6',shirt:'m8 4-5 3-2 4 4 2 1-2v10h12V11l1 2 4-2-2-4-5-3c-1 3-7 3-8 0',plus:'M12 5v14M5 12h14',umbrella:'M3 12a9 9 0 0 1 18 0H3Zm9 0v7c0 3 4 3 4 0M12 2v1',chevron:'m7 10 5 5 5-5',chev:'m9 5 7 7-7 7',chevleft:'m15 18-6-6 6-6',down:'M12 5v14m-6-6 6 6 6-6',up:'M12 19V5m-6 6 6-6 6 6',share:'M12 15V3m-5 5 5-5 5 5M5 12v8h14v-8',x:'m6 6 12 12M6 18 18 6'};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.sun}"/></svg>`;}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').style.display='block';toastTimer=setTimeout(()=>$('#toast').style.display='none',4500);}
function confirmBox(title,body,yes='확인'){return new Promise(resolve=>{const d=$('#dialog');d.className='';d.innerHTML=`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="dialog-actions"><button class="secondary" id="cancel-dialog">취소</button><button class="primary" id="yes-dialog">${esc(yes)}</button></div>`;let done=false;const finish=v=>{if(done)return;done=true;d.close();resolve(v);};$('#cancel-dialog').onclick=()=>finish(false);$('#yes-dialog').onclick=()=>finish(true);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();});}
function consentBox(){return new Promise(resolve=>{const d=$('#dialog');d.className='';d.innerHTML=`<h2>익명으로 함께할까요?</h2><p class="consent-lead">내 옷차림이 모이면 비슷한 체감의 사람들에게 추천이 돼요.</p><ul class="consent-list"><li><b>보내는 것</b>입은 옷 종류 · 추움/적당함/더움 · 저장할 때의 체감온도와 시각 · 비교 지역(9개 도시 또는 기타) · 날짜</li><li><b>보내지 않는 것</b>사진 · 정확한 위치 · 이름이나 계정</li><li><b>다른 사람에게 보이는 것</b>날짜와 기기 번호를 뺀 옷·체감 통계만</li><li><b>지우기</b>설정에서 언제든 전부 지울 수 있어요. 단, 브라우저 데이터를 지우면 앱에서 지울 수 없게 돼요.</li></ul><div class="dialog-actions"><button class="secondary" id="cancel-dialog">다음에</button><button class="primary" id="yes-dialog">동의하고 공유</button></div>`;let done=false;const finish=v=>{if(done)return;done=true;d.close();resolve(v);};$('#cancel-dialog').onclick=()=>finish(false);$('#yes-dialog').onclick=()=>finish(true);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();});}
async function joinCommunity(){if(!await consentBox())return false;setConsent(true);toast('참여했어요. 기록을 저장할 때 익명으로 공유돼요.');return true;}
async function loadCommunity(force=false){
  if(!communityEnabled||community.status==='loading')return;
  community={...community,status:'loading',error:''};renderCommunityCard();
  try{community={status:'ready',rows:await communityRows(force),error:''};}catch(e){community={status:'error',rows:[],error:e.message};}
  renderCommunityCard();const line=$('#sensitivity-line');if(line)line.textContent=settingsSensitivity();
}
function settingsSensitivity(){return community.status==='ready'?sensitivityText(sensitivity(records,community.rows)):community.status==='error'?'커뮤니티 정보를 불러오지 못해 체질을 계산하지 못했어요.':'커뮤니티 정보를 불러오면 체질을 계산해요.';}
function communityCardHTML(){
  let meta=communityEnabled?(communityMode==='dev'?'시험 서버':'전국 · 최근 60일'):'',body;
  if(!communityEnabled)body='<div class="row note">커뮤니티 추천을 준비하고 있어요.</div>';
  else if(community.status==='error')body=`<div class="row note">${esc(community.error)} 위의 추천을 참고해 주세요.</div><button class="row link" id="retry-community">다시 확인</button>`;
  else if(community.status!=='ready'||loading)body='<div class="row note">공유된 옷차림을 모으고 있어요…</div>';
  else if(!weather||stale||!finite(weather.today?.feels))body='<div class="row note">오늘 체감 날씨를 확인한 뒤 보여드릴게요.</div>';
  else{
    const s=sensitivity(records,community.rows),offset=s.available?s.offset:0,p=communityPick(community.rows,weather.today.feels,offset);
    meta=`체감 ${num(p.range[0],0)}~${num(p.range[1],0)}°${p.available?` · ${p.okCount}명`:''}`;
    body=p.available?p.top.map((t,i)=>`<div class="row rank"><b class="no">${i+1}</b><div class="rk"><span>${esc(t.clothes.join(' · '))}</span><i style="--w:${t.pct}%"></i></div><b class="pct">${t.pct}%</b></div>`).join(''):`<div class="row note">${esc(p.reason)}</div>`;
    if(p.total)body+=`<div class="row note">이 체감의 공유 ${p.total}건 · 추움 ${p.dist.cold} · 적당 ${p.dist.ok} · 더움 ${p.dist.hot}</div>`;
    if(Math.abs(offset)>=1)body+=`<div class="row note">내 체질을 반영해 오늘 ${num(weather.today.feels)}°를 ${num(p.target)}°로 보고 찾았어요.</div>`;
    body+=`<div class="row note">${esc(sensitivityText(s))}</div>`;
  }
  const join=communityEnabled&&!hasConsent()?'<button class="row link" id="join-community">내 기록도 익명으로 보태기</button>':'';
  return `<section id="community-slot"><p class="section-title">비슷한 체감의 사람들 <em>${esc(meta)}</em></p><div class="group">${body}${join}</div></section>`;
}
function bindCommunity(){bind('#retry-community',()=>loadCommunity(true));bind('#join-community',async()=>{if(await joinCommunity())renderCommunityCard();});}
function renderCommunityCard(){const el=$('#community-slot');if(view==='today'&&el){el.outerHTML=communityCardHTML();bindCommunity();}}
// 로컬 저장 후 서버 공유 상태를 맞춘다. 사용자에게 보여줄 문장을 돌려준다.
async function syncShare(value){
  if(!communityEnabled)return '';
  const save=()=>store('readwrite',st=>st.put(value));
  const unshare=async()=>{if(!value.sharedAt)return '';try{await unshareOutfit(value.date);value.sharedAt=null;await save();shareCount=null;clearCommunityCache();return ' 공유는 취소했어요.';}catch(e){return ` 공유 취소는 실패했어요. ${e.message}`;}};
  if(!value.share||!hasConsent())return unshare();
  const s=shareRows(value);
  if(s.skip)return ` 공유는 하지 않았어요: ${s.skip}${await unshare()}`;
  try{if(value.sharedAt)await unshareOutfit(value.date);for(const row of s.rows)await shareOutfit(row);value.sharedAt=new Date().toISOString();await save();shareCount=null;clearCommunityCache();community.status='idle';return s.rows.length>1?` 익명 공유도 완료했어요 (${s.rows.length}개 시간대).`:' 익명 공유도 완료했어요.';}
  catch(e){return ` 공유는 실패했어요. ${e.message} 다시 저장하면 재시도해요.`;}
}
// 그 날짜의 점심·저녁 모델 체감을 기록에 붙임 (오늘·어제 기록만)
function attachSlotWeather(v){const d=dates(),key=v.date===d.today?'today':v.date===d.yesterday?'yesterday':null;if(!key||!v.weatherSnapshot||stale||!weather?.slots?.[key])return;const sl={...(v.weatherSnapshot.slots||{})};for(const k of ['noon','evening']){const row=weather.slots[key][k];if(!sl[k]&&finite(row?.feels))sl[k]={hour:row.hour,feels:row.feels};}if(Object.keys(sl).length)v.weatherSnapshot.slots=sl;}
const slotText=(r,k)=>{const f=r.slots?.[k]?.feeling,t=r.weatherSnapshot?.slots?.[k]?.feels;return f?`${SLOT_FEELS[f]}${finite(t)&&f!=='indoor'?` · ${num(t)}°`:''}`:'미입력';};
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('yesterday-weather',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'date'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('기록 저장 공간을 열지 못했어요.'));r.onblocked=()=>reject(Error('다른 앱 탭을 닫고 다시 열어 주세요.'));});}
function store(mode,op){return new Promise((resolve,reject)=>{if(!db)return reject(Error('이 브라우저에서 기록 저장을 사용할 수 없어요.'));const tx=db.transaction('records',mode),req=op(tx.objectStore('records'));tx.oncomplete=()=>resolve(req?.result);tx.onerror=tx.onabort=()=>reject(Error('기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.'));});}
async function readRecords(){records=(await store('readonly',s=>s.getAll())).sort((a,b)=>b.date.localeCompare(a.date));}
function bind(id,fn){if($(id))$(id).onclick=fn;}
async function navigate(next){if(view==='outfit'&&next!=='outfit'&&draft?.dirty){if(!await confirmBox('작성 중인 기록이 있어요','저장하지 않은 입력을 취소하고 이동할까요? 기존 기록은 그대로예요.','이동'))return;draft=null;}view=next;render();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}
function navHTML(){return ['today','records','settings'].map((name,i)=>`<button class="tab ${view===name?'on':''}" data-nav="${name}" ${view===name?'aria-current="page"':''}>${icon(['sun','history','settings'][i])}<span>${['오늘','기록','설정'][i]}</span></button>`).join('');}
function renderHeader(){const sub=['outfit','detail'].includes(view);
  $('#header').innerHTML=sub?`<button class="nav-back" id="back">${icon('chevleft')}<span>${entry==='today'?'오늘':'기록'}</span></button><span class="nav-title">${view==='outfit'?'옷차림 기록':'기록 상세'}</span><span class="nav-space"></span>`:`<span class="nav-space"></span><div class="nav-tools">${view==='today'?`<button class="nav-btn" id="refresh" aria-label="날씨 새로고침">${icon('refresh')}</button>`:''}<button class="nav-loc" id="region-button" aria-label="비교 지역과 시각 바꾸기">${icon('pin')}<span>${esc(settings.name)} · ${timeText(settings.hour)}</span></button></div>`;
  $('#nav').className=sub?'hidden':'';$('#nav').innerHTML=navHTML();$('#desktop-nav').innerHTML='';$$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));bind('#back',()=>navigate(entry));bind('#region-button',()=>openCompareSheet());bind('#refresh',()=>loadWeather(true));$('.brand').onclick=e=>{e.preventDefault();navigate('today');};
}
function render(){renderHeader();({today:renderToday,records:renderRecords,settings:renderSettings,outfit:renderOutfit,detail:renderDetail}[view]||renderToday)();}
async function loadWeather(force=false){
  const id=++requestId,context={...settings},date=dates(),key=weatherKey(context,date.today);
  loading=true;weather=null;stale=false;error='';if(view==='today')render();
  let cached;try{const c=JSON.parse(localStorage.getItem(CACHE));if(c?.key===key&&c.weather?.today?.date===date.today&&finite(c.fetched))cached=c;}catch{}
  if(cached&&!force&&navigator.onLine&&Date.now()-cached.fetched>=0&&Date.now()-cached.fetched<1800000){weather=cached.weather;fetched=cached.fetched;loading=false;if(view==='today')render();return;}
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),15000);
  try{
    const q=new URLSearchParams({latitude:context.lat,longitude:context.lon,timezone:'Asia/Seoul',start_date:date.yesterday,end_date:shiftDate(date.today,1),wind_speed_unit:'ms',hourly:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,weather_code'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+q,{signal:ctrl.signal});if(!response.ok)throw Error('날씨 서비스에 연결하지 못했어요.');
    const parsed=parseWeather(await response.json(),date.today,context.hour,slotHours(context));if(id!==requestId)return;
    if(date.today!==dates().today){loadWeather();return;}
    weather=parsed;fetched=Date.now();try{localStorage.setItem(CACHE,JSON.stringify({key,weather,fetched}));}catch{}
  }catch(e){if(id!==requestId)return;error=e.name==='AbortError'?'연결이 오래 걸리고 있어요. 다시 확인해 주세요.':e.name==='TypeError'?'네트워크에 연결하지 못했어요. 기록은 계속 남길 수 있어요.':e.message;if(cached){weather=cached.weather;fetched=cached.fetched;stale=true;}}
  finally{clearTimeout(timeout);if(id===requestId){loading=false;if(view==='today')render();}}
}
function renderToday(){
  const day=dates(),record=records.find(r=>r.date===day.yesterday),r=recommend(weather,record,settings,day.today),w=weather?.today,y=weather?.yesterday;
  const delta=finite(w?.feels)&&finite(y?.feels)?w.feels-y.feels:null;
  let top;
  if(loading)top='<section class="card verdict loading" role="status"><p class="label">날씨 확인 중</p><p class="answer muted">어제와 오늘을 같은 시각으로 맞추고 있어요</p></section>';
  else if(!weather)top=`<section class="card notice" role="alert"><p class="label warn">날씨를 불러오지 못했어요</p><p>${esc(error)}</p><button class="btn-plain" id="retry">다시 확인</button></section>`;
  else top=verdictHTML(r,record,delta)||`<section class="card notice" role="alert"><p class="label warn">${stale?'최신 날씨가 아니에요':'추천을 잠시 보류했어요'}</p><p>${stale?'마지막으로 받은 자료만 보여요. 새 날씨를 확인한 뒤 옷차림을 골라드릴게요.':esc(r.reason)}</p><button class="btn-plain" id="retry-rec">다시 확인</button></section>`;
  const when=fetched?new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(fetched):'';
  const compare=weather&&!loading?`<div class="group"><div class="row compare"><div><small>어제 ${timeText(settings.hour)}</small><b>${num(y.feels)}°</b></div><span class="arrow">${icon('arrow')}</span><div><small>오늘 ${timeText(settings.hour)}</small><b>${num(w.feels)}°</b></div></div><div class="row chips"><span>기온 ${num(w.temp)}°</span><span>바람 ${num(w.wind)}m/s</span><span>습도 ${num(w.humidity,0)}%</span><span>${r.rain===true?'비 예보':r.rain===false?'비 없음':'비 정보 없음'}</span></div>${['noon','evening'].filter(k=>finite(weather.slots?.today?.[k]?.feels)).map(k=>`<div class="row slot-row"><span>${SLOT_NAMES[k]} ${timeText(weather.slots.today[k].hour)}</span><span class="val">어제 ${num(weather.slots.yesterday?.[k]?.feels)}° → <b>오늘 ${num(weather.slots.today[k].feels)}°</b></span></div>`).join('')}</div><p class="foot">체감온도 비교 · 모델 자료${when?` · ${when} 조회`:''}${stale?' · 오래된 자료':''} · <button class="link" id="now-hour">지금 시각으로 보기</button></p>`:'';
  const mine=`<p class="section-title">어제의 나</p><div class="group"><button class="row" id="yesterday-record"><span class="row-main"><b>${record?esc(record.clothes.join(' · ')):'어제 옷차림 남기기'}</b>${record?`<small>아침 ${feelings[record.feeling]||'미입력'}${['noon','evening'].map(k=>record.slots?.[k]?.feeling?` · ${SLOT_NAMES[k]} ${SLOT_FEELS[record.slots[k].feeling]}`:'').join('')}</small>`:'<small>옷과 느낌만 남겨도 충분해요</small>'}</span>${icon('chev')}</button></div>`;
  $('#main').innerHTML=`<header class="large"><h1>오늘</h1><p class="sub">${dateLabel(day.today)}</p>${!settings.confirmed?`<p class="sub small">${esc(settings.name)}은 기본 지역이에요 · <button class="link" id="confirm-region">내 지역 선택</button></p>`:''}</header>${top}${compare}${quickHTML()}${communityCardHTML()}${mine}${dbError?`<p class="form-error" role="alert">${esc(dbError)}</p>`:''}`;
  bind('#retry',()=>loadWeather(true));bind('#retry-rec',()=>loadWeather(true));bind('#confirm-region',()=>openCompareSheet());
  bindCommunity();bindQuick();bind('#share-card',()=>openShare(r,record,delta));if(communityEnabled&&community.status==='idle')loadCommunity();bind('#now-hour',()=>setSettings({...settings,hour:currentHour()}));bind('#yesterday-record',()=>{entry='today';if(record){detailDate=record.date;navigate('detail');}else startDraft(day.yesterday);});
}
const LEVEL={personal:'어제 경험 반영',reference:'경험 참고',excluded:'오늘 날씨 기준',basic:'기본 추천'};
function verdictHTML(r,record,delta){
  if(loading||stale||!weather)return '';
  const v=verdict(r,record,delta,weather.today?.feels,dates().yesterday);if(!v)return '';
  return `<section class="card verdict ${v.tone}" aria-label="오늘의 결론"><p class="label">${v.tone==='cold'?icon('down'):v.tone==='warm'?icon('up'):''}${esc(v.headline)}</p><p class="answer">${esc(v.answer)}</p><div class="items">${v.clothes.map(c=>`<span>${shirt(c)}<small>${c}</small></span>`).join('')}</div>${v.rain?`<p class="rain">${icon('umbrella')}우산도 챙겨요 · ${r.rainRange}</p>`:''}${(()=>{const p=dayPlan(r,weather,record,dates().yesterday);return p?`<p class="plan ${p.items.length?'':'calm'}">${icon('clock')}<span>${esc(p.text)}</span></p>`:'';})()}<p class="why"><b>${LEVEL[r.level]||''}</b> ${esc(r.reason)}</p><button class="row action" id="share-card" ${sharing?'disabled':''}>${icon('share')}<span>가족에게 보내기</span>${icon('chev')}</button></section>`;
}
function quickTarget(){const d=dates(),ev=slotHours(settings).evening;const target=Number.isInteger(ev)&&currentHour()>=ev?d.today:d.yesterday;return {date:target,key:target===d.today?'today':'yesterday',word:target===d.today?'오늘':'어제'};}
function quickHTML(){
  if(loading||stale||!weather||!db)return '';
  const q=quickTarget(),rec=records.find(r=>r.date===q.date),row=weather[q.key];
  if(!rec){
    if(!finite(row?.feels))return '';
    try{if(localStorage.getItem(QUICK_SKIP)===dates().today)return '';}catch{}
    const presets=quickPresets(row.feels);
    return `<section id="quick-card"><p class="section-title">${q.word} 뭐 입었어요? <button class="title-link" id="quick-skip">건너뛰기</button></p><div class="card quick"><p class="hint">${q.word} ${timeText(settings.hour)} ${esc(settings.name)}, 밖에서 기준 · 두 번이면 끝</p><div class="tiles">${presets.map((p,i)=>`<button class="tile ${quickSel===i?'selected':''}" data-preset="${i}" aria-pressed="${quickSel===i}"><i>${p.map(shirt).join('')}</i><span>${p.join(' · ')}</span></button>`).join('')}</div><div class="segment" role="group" aria-label="${q.word} 아침 어땠어요">${Object.entries(feelings).map(([k,t])=>`<button data-quick-feel="${k}" ${quickSel===null||saving?'disabled':''}>${t}</button>`).join('')}</div><button class="btn-plain small" id="quick-other">다른 옷이었어요 · 직접 고르기</button></div></section>`;
  }
  const ask=slotsToAsk(weather,q.key).filter(k=>!rec.slots?.[k]?.feeling);
  if(!ask.length)return '';
  try{if(localStorage.getItem(SLOT_SKIP)===q.date)return '';}catch{}
  return `<section id="slot-card"><p class="section-title">${q.word} 점심·저녁은요? <button class="title-link" id="slot-skip">괜찮아요</button></p><div class="card quick"><p class="hint">같은 옷(${esc(rec.clothes.join(' · '))}) 기준 · 선택이에요. 실내에 있었다면 '실내'를 눌러 주세요.</p>${ask.map(k=>`<div class="slot-q"><span>${SLOT_NAMES[k]} ${timeText(weather.slots[q.key][k].hour)} · ${num(weather.slots[q.key][k].feels)}°</span><div class="segment mini" role="group" aria-label="${SLOT_NAMES[k]} 체감">${Object.entries(SLOT_FEELS).map(([f,t])=>`<button data-qslot="${k}" data-qfeel="${f}" ${saving?'disabled':''}>${t}</button>`).join('')}</div></div>`).join('')}</div></section>`;
}
function bindQuick(){
  const qrow=weather?.[quickTarget().key],presets=finite(qrow?.feels)?quickPresets(qrow.feels):[];
  $$('[data-preset]').forEach(b=>b.onclick=()=>{quickSel=Number(b.dataset.preset);$$('[data-preset]').forEach(x=>{const on=Number(x.dataset.preset)===quickSel;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',on);});$$('[data-quick-feel]').forEach(x=>x.disabled=false);});
  $$('[data-quick-feel]').forEach(b=>b.onclick=()=>saveQuick(presets[quickSel],b.dataset.quickFeel));
  bind('#quick-skip',()=>{try{localStorage.setItem(QUICK_SKIP,dates().today);}catch{}quickSel=null;renderToday();});
  bind('#slot-skip',()=>{try{localStorage.setItem(SLOT_SKIP,quickTarget().date);}catch{}renderToday();});
  $$('[data-qslot]').forEach(b=>b.onclick=()=>saveSlot(b.dataset.qslot,b.dataset.qfeel));
  bind('#quick-other',()=>{entry='today';startDraft(quickTarget().date);});
}
async function saveQuick(clothes,feeling){
  if(!clothes||!db||saving)return;const q=quickTarget();if(records.some(r=>r.date===q.date)){quickSel=null;renderToday();return;}
  const value=quickRecord({clothes,feeling,settings,yesterday:q.date,weatherRow:weather?.[q.key],slotRows:weather?.slots?.[q.key],fetchedAt:fetched});value.share=communityEnabled&&hasConsent();
  saving=true;$$('#quick-card button').forEach(b=>b.disabled=true);
  try{await store('readwrite',s=>s.put(value));const msg=await syncShare(value);await readRecords();saving=false;quickSel=null;if(view==='today')renderToday();toast((q.key==='today'?'오늘 아침을 기록했어요. 내일 추천에 반영돼요.':'어제 기록으로 오늘 옷차림을 맞췄어요.')+(msg||''));}
  catch(e){saving=false;if(view==='today')renderToday();toast(e.message);}
}
async function saveSlot(slot,feeling){
  if(!db||saving)return;const q=quickTarget(),old=records.find(r=>r.date===q.date);if(!old)return;
  const value=structuredClone(old);value.slots={noon:{feeling:null},evening:{feeling:null},...(value.slots||{})};value.slots[slot]={feeling};value.updatedAt=new Date().toISOString();attachSlotWeather(value);
  saving=true;$$('#slot-card button').forEach(b=>b.disabled=true);
  try{await store('readwrite',s=>s.put(value));const msg=await syncShare(value);await readRecords();saving=false;if(view==='today')renderToday();const done=slotsToAsk(weather,q.key).every(k=>value.slots?.[k]?.feeling);toast((done?`${q.word} 하루 기록 완료! 다음 추천에 반영돼요.`:`${SLOT_NAMES[slot]} 기록했어요.`)+(msg||''));}
  catch(e){saving=false;if(view==='today')renderToday();toast(e.message);}
}
async function openShare(r,record,delta){
  if(sharing)return;const v=verdict(r,record,delta,weather?.today?.feels,dates().yesterday);if(!v)return;const plan=dayPlan(r,weather,record,dates().yesterday);v.plan=plan?.items.length?plan.text:'';
  sharing=true;const btn=$('#share-card');if(btn)btn.disabled=true;
  try{
    const out=await shareCard(v,{place:settings.name,dateText:new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:'Asia/Seoul'}).format(new Date()),url:location.origin+location.pathname});
    if(out.result==='fallback'){const d=$('#dialog'),url=URL.createObjectURL(out.blob);d.className='';d.innerHTML=`<h2>오늘 옷차림 카드</h2><img class="share-preview" src="${url}" alt="오늘 옷차림 카드"><p class="form-note">${out.copied?'보낼 문구를 복사했어요. 이미지를 길게 눌러 저장한 뒤 카톡에 함께 붙여 넣으세요.':'이미지를 길게 눌러 저장하거나 아래 문구를 복사해 보내세요.'}</p><textarea class="share-text" readonly rows="5">${esc(out.text)}</textarea><div class="dialog-actions"><a class="secondary" href="${url}" download="오늘의옷차림.png">이미지 저장</a><button class="primary" id="yes-dialog">닫기</button></div>`;$('#yes-dialog').onclick=()=>{d.close();URL.revokeObjectURL(url);};d.oncancel=null;d.showModal();}
  }catch(e){toast('카드를 만들지 못했어요. 다시 시도해 주세요.');}
  finally{sharing=false;const b=$('#share-card');if(b)b.disabled=false;}
}
function openCompareSheet(){const d=$('#dialog');d.className='sheet';d.innerHTML=`<div class="sheet-grabber"></div><div class="sheet-title"><h2>비교 기준</h2><button class="sheet-close" id="close-sheet" aria-label="닫기">${icon('x')}</button></div><div class="field"><label for="sheet-city">비교 지역</label><select id="sheet-city">${cityOptions(settings)}</select></div><div class="field"><label for="sheet-hour">어제 · 오늘 같은 시각</label><select id="sheet-hour">${hourOptions(settings.hour)}</select></div><p class="form-note">시간을 바꾸면 양일 모두 함께 바뀌어요.</p><button class="primary" id="apply-sheet">이 기준으로 보기</button>`;d.oncancel=null;$('#close-sheet').onclick=()=>d.close();$('#apply-sheet').onclick=()=>{const c=$('#sheet-city').value==='custom'?settings:cities[Number($('#sheet-city').value)];const next={...settings,...c,hour:Number($('#sheet-hour').value),confirmed:true};if(setSettings(next))d.close();};d.showModal();}
function cityOptions(value,unknown=false){const index=cities.findIndex(c=>c.lat===value?.lat&&c.lon===value?.lon);return `${unknown?'<option value="unknown">아직 선택하지 않음</option>':''}${index<0&&value?`<option value="custom" selected>${esc(value.name)}</option>`:''}${cities.map((c,i)=>`<option value="${i}" ${i===index?'selected':''}>${c.name}</option>`).join('')}`;}
function hourOptions(value,unknown=false){return `${unknown?`<option value="unknown" ${value===null?'selected':''}>느낀 시각 미입력</option>`:''}${Array.from({length:24},(_,i)=>`<option value="${i}" ${i===value?'selected':''}>${timeText(i)}</option>`).join('')}`;}
function setSettings(next,stay=false){try{localStorage.setItem(SETTINGS,JSON.stringify(next));settings=next;if(!stay)view='today';loadWeather();if(stay)render();toast('비교 기준을 바꿨어요');return true;}catch{toast('설정을 저장하지 못했어요. 이전 설정은 유지돼요.');return false;}}
function startDraft(date){const old=records.find(r=>r.date===date);draft=old?structuredClone(old):{date,clothes:[],feeling:null,photo:null,context:{...settings},createdAt:new Date().toISOString()};draft.experience??={place:'unknown',hour:null,location:null};draft.slots??={noon:{feeling:null},evening:{feeling:null}};draft.share??=!old&&hasConsent();draft.existing=!!old;draft.dirty=false;view='outfit';render();window.scrollTo(0,0);}
function recentCombinations(){const seen=new Set();return records.filter(r=>{const key=[...r.clothes].sort().join('|');if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3);}
function renderOutfit(){
  const recent=recentCombinations();
  $('#main').innerHTML=`<header class="large"><h1>무엇을 입었나요?</h1><p class="sub">옷과 체감만 남겨도 좋아요</p></header>
<div class="group"><label class="row">기록 날짜<input id="record-date" class="row-input" type="date" max="${dates().today}" value="${draft.date}"></label></div>
${recent.length?`<p class="section-title small">최근 조합 <em>옷만 불러와요</em></p><div class="chip-row">${recent.map((r,i)=>`<button class="chip" data-recent="${i}">${esc(r.clothes.join(' · '))}</button>`).join('')}</div>`:''}
${groups.map(g=>`<p class="section-title small">${g.name}</p><div class="card pad"><div class="clothes-grid">${g.items.map(c=>`<button class="clothes-tile ${draft.clothes.includes(c)?'selected':''}" data-cloth="${c}" aria-pressed="${draft.clothes.includes(c)}">${shirt(c)}<span>${c}</span></button>`).join('')}</div></div>`).join('')}
<p class="foot" id="selected-summary">${draft.clothes.length?esc(draft.clothes.join(' · ')):'입은 옷을 하나 이상 골라 주세요.'}</p>
<p class="section-title small">실제로 어땠나요? <button class="title-link" id="clear-feeling">선택 해제</button></p>
<div class="feel-row">${Object.entries(feelings).map(([key,text])=>`<button class="feel ${draft.feeling===key?'selected':''}" data-feeling="${key}" aria-pressed="${draft.feeling===key}">${face(key)}<b>${text}</b><small>${{cold:'더 입고 싶었어요',ok:'편안했어요',hot:'덜 입고 싶었어요'}[key]}</small></button>`).join('')}</div>
<p class="section-title small">점심·저녁은요? <em>선택 · 같은 옷 기준</em></p><div class="group">${['noon','evening'].map(k=>`<div class="row slot-q"><span>${SLOT_NAMES[k]} ${timeText(slotHours(settings)[k]??(k==='noon'?13:19))}</span><div class="segment mini" role="group" aria-label="${SLOT_NAMES[k]} 체감">${Object.entries(SLOT_FEELS).map(([f,t])=>`<button data-slot="${k}" data-slot-feel="${f}" class="${draft.slots?.[k]?.feeling===f?'on':''}" aria-pressed="${draft.slots?.[k]?.feeling===f}">${t}</button>`).join('')}</div></div>`).join('')}</div>
<p class="section-title small">더 맞춰보기 <em>선택</em></p>
<div class="group"><label class="row">느낀 장소<select id="experience-place" class="row-select">${[['unknown','모르겠어요'],['outdoor','밖에서'],['indoor','실내에서']].map(([v,t])=>`<option value="${v}" ${draft.experience.place===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="row">느낀 시각<select id="experience-hour" class="row-select">${hourOptions(draft.experience.hour,true)}</select></label><label class="row">있었던 지역<select id="experience-city" class="row-select">${cityOptions(draft.experience.location,true)}${!draft.experience.location&&!cities.some(c=>c.lat===settings.lat&&c.lon===settings.lon)?'<option value="saved-location">현재 저장한 위치</option>':''}</select></label><label class="row" for="photo">사진 추가<span class="val">이 기기에만 보관</span>${icon('chev')}</label></div><input id="photo" class="visually-hidden" type="file" accept="image/*"><div id="photo-content">${photoHTML()}</div>
${communityEnabled?`<div class="group"><label class="row">익명으로 공유하기<input type="checkbox" class="switch" id="share-toggle" ${draft.share?'checked':''}></label></div><p class="foot">옷·체감·체감온도만 보내요. 체감 평가가 있고 저장할 때 날씨를 확인한 최근 ${SHARE_DAYS}일 이내 기록만 공유돼요.${draft.sharedAt?' 지금 공유 중인 기록이에요.':''}</p>`:''}
<p class="form-error" id="form-error" role="alert"></p>
<div class="save-bar"><button class="btn-primary" id="save-record" ${!draft.clothes.length||photoBusy?'disabled':''}>${draft.feeling?'기록 저장':'옷만 저장'} ${icon('check')}</button></div>`;
  $$('[data-cloth]').forEach(b=>b.onclick=()=>{const c=b.dataset.cloth;draft.clothes=draft.clothes.includes(c)?draft.clothes.filter(x=>x!==c):[...draft.clothes,c];draft.dirty=true;updateSelections();});
  $$('[data-feeling]').forEach(b=>b.onclick=()=>{draft.feeling=b.dataset.feeling;draft.dirty=true;updateSelections();});
  $$('[data-recent]').forEach(b=>b.onclick=()=>{draft.clothes=[...recent[Number(b.dataset.recent)].clothes];draft.dirty=true;updateSelections();toast('옷만 불러왔어요. 체감은 직접 골라 주세요.');});
  bind('#clear-feeling',()=>{draft.feeling=null;draft.dirty=true;updateSelections();});
  $$('[data-slot]').forEach(b=>b.onclick=()=>{const k=b.dataset.slot,f=b.dataset.slotFeel;draft.slots[k]={feeling:draft.slots[k]?.feeling===f?null:f};draft.dirty=true;updateSelections();});
  $('#record-date').onchange=async e=>{const value=e.target.value;if(!validDate(value)||value>dates().today){e.target.value=draft.date;return;}if(draft.dirty&&!await confirmBox('다른 날짜를 열까요?','지금 작성 중인 내용은 취소하고 선택한 날짜의 기록을 열어요.','날짜 변경')){e.target.value=draft.date;return;}startDraft(value);};
  $('#experience-place').onchange=e=>{draft.experience.place=e.target.value;draft.dirty=true;};
  $('#experience-hour').onchange=e=>{draft.experience.hour=e.target.value==='unknown'?null:Number(e.target.value);draft.dirty=true;};
  $('#experience-city').onchange=e=>{const value=e.target.value;draft.experience.location=value==='unknown'?null:value==='custom'?draft.experience.location:value==='saved-location'?{name:settings.name,lat:settings.lat,lon:settings.lon}:{...cities[Number(value)]};draft.dirty=true;};
  $('#photo').onchange=addPhoto;bindPhoto();bind('#save-record',saveDraft);
  if($('#share-toggle'))$('#share-toggle').onchange=async e=>{if(e.target.checked&&!hasConsent()){e.target.checked=false;if(!await joinCommunity())return;e.target.checked=true;}draft.share=e.target.checked;draft.dirty=true;};
}
function updateSelections(){
  $$('[data-cloth]').forEach(b=>{const selected=draft.clothes.includes(b.dataset.cloth);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  $$('[data-feeling]').forEach(b=>{const selected=draft.feeling===b.dataset.feeling;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  $$('[data-slot]').forEach(b=>{const on=draft.slots?.[b.dataset.slot]?.feeling===b.dataset.slotFeel;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  $('#selected-summary').textContent=draft.clothes.length?draft.clothes.join(' · '):'입은 옷을 하나 이상 골라 주세요.';
  $('#save-record').disabled=!draft.clothes.length||photoBusy||saving;$('#save-record').innerHTML=`${draft.feeling?'기록 저장':'옷만 저장'} ${icon('check')}`;
}
function photoHTML(){return draft.photo?`<img class="photo-preview" src="${esc(draft.photo)}" alt="첨부한 옷차림 사진"><button id="remove-photo" class="text-button">사진 첨부 취소</button>`:'';}
function bindPhoto(){bind('#remove-photo',()=>{draft.photo=null;draft.dirty=true;$('#photo-content').innerHTML='';$('#photo').value='';});}
async function addPhoto(e){const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>20*1024*1024){toast('20MB 이하의 사진을 선택해 주세요.');return;}const target=draft;photoBusy=true;updateSelections();$('#form-error').textContent='사진을 준비하고 있어요…';try{const url=URL.createObjectURL(file);let img;try{img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('사진을 읽지 못했어요. JPG나 PNG를 선택해 주세요.'));image.src=url;});}finally{URL.revokeObjectURL(url);}const ratio=Math.min(1,1200/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);if(draft!==target)return;draft.photo=canvas.toDataURL('image/jpeg',.8);draft.dirty=true;if(view==='outfit'){$('#photo-content').innerHTML=photoHTML();bindPhoto();$('#form-error').textContent='';}}catch(e){if(view==='outfit')$('#form-error').textContent=e.message;}finally{photoBusy=false;if(view==='outfit')updateSelections();}}
async function saveDraft(){
  if(saving||photoBusy||!draft?.clothes.length)return;
  if(!db){$('#form-error').textContent=dbError||'기록 저장 공간을 사용할 수 없어요.';return;}
  const old=records.find(r=>r.date===draft.date);
  if(old?.feeling&&!draft.feeling&&!await confirmBox('체감 평가를 비울까요?','옷은 저장하고 기존 평가는 미입력으로 바꿉니다.','평가 비우고 저장'))return;
  saving=true;$$('#main button,#main input,#main select').forEach(b=>b.disabled=true);$('#save-record').textContent='저장 중…';
  try{const {dirty,existing,...value}=structuredClone(draft);value.updatedAt=new Date().toISOString();value.schemaVersion=2;value.recommendationVersion=RULE_VERSION;
    if(weather&&!stale&&!loading&&!value.weatherSnapshot){const row=value.date===dates().today?weather.today:value.date===dates().yesterday?weather.yesterday:null;if(row)value.weatherSnapshot={...structuredClone(row),queryContext:{...settings},fetchedAt:fetched,source:'Open-Meteo model'};}
    attachSlotWeather(value);
    await store('readwrite',s=>s.put(value));const shareMsg=await syncShare(value);await readRecords();draft=null;saving=false;view=entry;render();window.scrollTo(0,0);toast('기록을 저장했어요.'+(shareMsg||' 언제든 수정할 수 있어요.'));
  }catch(e){saving=false;renderOutfit();$('#form-error').textContent=e.message+' 입력은 그대로 남아 있어요.';}
}
function renderRecords(){const selected=records.filter(r=>filter==='all'||r.feeling===filter);
  $('#main').innerHTML=`<header class="large with-action"><div><h1>기록</h1><p class="sub">${records.length?`${records.length}일의 옷차림`:'옷과 체감을 가볍게 남겨 보세요'}</p></div><button class="round-btn" id="add-record" aria-label="새 옷차림 기록">${icon('plus')}</button></header><div class="segment filters" role="group" aria-label="체감별 보기">${[['all','전체'],['cold','추움'],['ok','적당함'],['hot','더움']].map(([v,t])=>`<button class="${filter===v?'on':''}" data-filter="${v}" aria-pressed="${filter===v}">${t}</button>`).join('')}</div>${selected.length?`<div class="group">${selected.map(r=>`<button class="row record" data-date="${r.date}"><span class="thumb">${r.photo?`<img src="${esc(r.photo)}" alt="">`:shirt(r.clothes[0])}</span><span class="row-main"><b>${dateLabel(r.date)}</b><small>${esc(r.clothes.join(' · '))}${r.sharedAt?' · 공유 중':''}</small></span><span class="badge ${r.feeling||''}">${feelings[r.feeling]||'미입력'}</span>${icon('chev')}</button>`).join('')}</div>`:`<section class="card empty">${shirt('재킷')}<b>${records.length?'이 체감의 기록은 아직 없어요':'첫 옷차림을 남겨 보세요'}</b><p>잘 기억나지 않는 건 건너뛰어도 괜찮아요.</p><button class="btn-plain" id="empty-record">어제 기록하기</button></section>`}${dbError?`<p class="form-error">${esc(dbError)}</p>`:''}`;
  $$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderRecords();});$$('[data-date]').forEach(b=>b.onclick=()=>{entry='records';detailDate=b.dataset.date;navigate('detail');});bind('#add-record',()=>{entry='records';startDraft(dates().today);});bind('#empty-record',()=>{entry='records';startDraft(dates().yesterday);});
}
function renderDetail(){const r=records.find(r=>r.date===detailDate);if(!r){view='records';render();return;}const e=r.experience;
  $('#main').innerHTML=`<header class="large"><h1>${dateLabel(r.date)}</h1><p class="sub">${esc(r.clothes.join(' · '))}</p></header><section class="card pad"><div class="items">${r.clothes.map(c=>`<span>${shirt(c)}<small>${c}</small></span>`).join('')}</div>${r.photo?`<img class="detail-photo" src="${esc(r.photo)}" alt="저장한 옷차림 사진">`:''}</section><div class="group"><div class="row">실제 체감<span class="val"><span class="badge ${r.feeling||''}">${feelings[r.feeling]||'미입력'}</span></span></div><div class="row">점심 체감<span class="val">${slotText(r,'noon')}</span></div><div class="row">저녁 체감<span class="val">${slotText(r,'evening')}</span></div><div class="row">느낀 장소<span class="val">${{outdoor:'밖에서',indoor:'실내에서'}[e?.place]||'미입력'}</span></div><div class="row">느낀 시각<span class="val">${Number.isInteger(e?.hour)?timeText(e.hour):'미입력'}</span></div><div class="row">있었던 지역<span class="val">${esc(e?.location?.name||'미입력')}</span></div>${communityEnabled?`<div class="row">익명 공유<span class="val">${r.sharedAt?'공유 중':'공유 안 함'}</span></div>`:''}</div><div class="group"><button class="row link" id="edit-record">기록 수정하기</button></div><p class="section-title small">날씨 조회 당시</p><div class="group"><div class="row note">조회 설정: ${esc(r.context?.name||'미입력')} · ${timeText(r.context?.hour??8)}${r.weatherSnapshot?`<br>저장할 때 모델 체감 ${num(r.weatherSnapshot.feels)}° · ${r.weatherSnapshot.date} ${timeText(r.weatherSnapshot.hour)}`:''}<br>조회 설정은 실제로 입은 시각·장소와 별개예요.</div></div><div class="group"><button class="row danger" id="delete-record">이 날짜 기록 삭제</button></div>`;
  bind('#edit-record',()=>startDraft(r.date));bind('#delete-record',async()=>{if(!await confirmBox('이 기록을 삭제할까요?',`${dateLabel(r.date)}의 옷·체감·사진이 삭제되며 되돌릴 수 없어요. 필요한 경우 설정에서 먼저 백업해 주세요.`,'기록 삭제'))return;try{await store('readwrite',s=>s.delete(r.date));let note='';if(r.sharedAt&&communityEnabled){try{await unshareOutfit(r.date);shareCount=null;clearCommunityCache();note=' 공유한 자료도 지웠어요.';}catch(e){note=' 공유 자료는 지우지 못했어요. 설정에서 공유 기록을 지울 수 있어요.';}}await readRecords();navigate('records');toast('선택한 기록을 삭제했어요.'+note);}catch(e){toast(e.message);}});
}
function renderSettings(){
  $('#main').innerHTML=`<header class="large"><h1>설정</h1></header>
<p class="section-title small">날씨 기준</p><div class="group"><label class="row">지역<select id="city" class="row-select">${cityOptions(settings)}</select></label><label class="row">비교 시각<select id="hour" class="row-select">${hourOptions(settings.hour)}</select></label><label class="row">점심 시각<select id="noon-hour" class="row-select">${hourOptions(settings.noonHour??13)}</select></label><label class="row">저녁 시각<select id="evening-hour" class="row-select">${hourOptions(settings.eveningHour??19)}</select></label><button class="row link" id="gps">현재 위치 사용</button></div><p class="foot">어제와 오늘 같은 시각의 체감을 비교해요. 점심·저녁은 아침보다 늦은 시각일 때만 써요. 날씨 조회에 필요한 좌표만 Open-Meteo에 보내요.</p><p class="form-error" id="settings-error" role="alert"></p>
${communityEnabled?`<p class="section-title small">커뮤니티</p><div class="group"><label class="row">익명 공유<input type="checkbox" class="switch" id="community-switch" ${hasConsent()?'checked':''}></label><div class="row">공유 중인 기록<span class="val" id="share-count">${shareCount??'—'}개</span></div><div class="row note" id="sensitivity-line">${esc(settingsSensitivity())}</div></div><p class="foot">옷 종류·추움/적당함/더움·체감온도와 시각·지역(9개 도시 또는 기타)·날짜를 보내요. 사진과 정확한 위치는 보내지 않고, 다른 사람에게는 날짜·기기 번호를 뺀 통계만 보여요.</p>`:'<p class="section-title small">커뮤니티</p><div class="group"><div class="row note">비슷한 체감의 사람들과 옷차림을 나누는 기능을 준비하고 있어요.</div></div>'}
${communityEnabled?`<p class="section-title small">이용 통계</p><div class="group"><label class="row">앱 사용 통계 보내기<input type="checkbox" class="switch" id="stats-switch" ${statsEnabled()?'checked':''}></label></div><p class="foot">앱을 연 날짜만 무작위 번호로 보내요. 이름·위치·옷 기록은 보내지 않고, 다시 찾는 사람이 얼마나 되는지 확인하는 데만 써요.</p>`:''}
<p class="section-title small">내 기록 <em>${records.length}개</em></p><div class="group"><button class="row" id="export">백업 파일 받기${icon('chev')}</button><label class="row" for="import-backup">백업에서 가져오기${icon('chev')}</label>${communityEnabled?'<button class="row danger" id="delete-shares">공유 기록 모두 지우기</button>':''}</div><input id="import-backup" class="visually-hidden" type="file" accept="application/json,.json"><p class="foot">기록과 사진은 이 기기 브라우저에만 보관돼요. 같은 날짜의 기존 기록은 가져올 때 보존해요. ${communityMode==='dev'?'지금은 이 맥의 시험 서버에 연결돼 있어요.':'브라우저 데이터를 지우면 공유 기록을 앱에서 지울 수 없게 돼요.'}</p>
<p class="section-title small">홈 화면에 추가</p><div class="group"><div class="row note">iPhone Safari: 공유 → 홈 화면에 추가<br>Android Chrome: 메뉴 → 앱 설치</div>${installPrompt?'<button class="row link" id="install">앱 설치하기</button>':''}</div>
<p class="section-title small">추천에 대해</p><div class="group"><div class="row note">오늘 체감을 먼저 보고, 같은 시각·장소의 야외 기록이 있으면 한 겹 조정해요. 어제 더웠다면 어제보다 두껍게 권하지 않아요. 온도별 복장은 시험 기준이에요.</div></div>`;
  $('#city').onchange=()=>{const v=$('#city').value,c=v==='custom'?settings:cities[Number(v)];setSettings({...settings,...c,confirmed:true},true);};
  $('#hour').onchange=()=>setSettings({...settings,hour:Number($('#hour').value),confirmed:true},true);
  $('#noon-hour').onchange=()=>setSettings({...settings,noonHour:Number($('#noon-hour').value)},true);
  $('#evening-hour').onchange=()=>setSettings({...settings,eveningHour:Number($('#evening-hour').value)},true);
  bind('#gps',()=>{if(!navigator.geolocation){$('#settings-error').textContent='지역을 목록에서 직접 선택해 주세요.';return;}$('#gps').disabled=true;$('#gps').textContent='현재 위치를 확인하고 있어요…';navigator.geolocation.getCurrentPosition(pos=>{if(view!=='settings')return;setSettings({...settings,name:'현재 위치',lat:pos.coords.latitude,lon:pos.coords.longitude,confirmed:true},true);},()=>{if(view!=='settings')return;$('#gps').disabled=false;$('#gps').textContent='현재 위치 사용';$('#settings-error').textContent='위치를 확인하지 못했어요. 지역을 직접 선택해 주세요.';},{timeout:10000,maximumAge:300000});});
  bind('#export',()=>{const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),records,settings},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`어제와비교해서_백업_${dates().today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('백업 다운로드를 시작했어요.');});
  $('#import-backup').onchange=importBackup;
  if($('#stats-switch'))$('#stats-switch').onchange=e=>{setStats(e.target.checked);toast(e.target.checked?'이용 통계를 보내요.':'이용 통계를 보내지 않아요.');};
  if(communityEnabled){
    if(shareCount===null)myShareCount().then(n=>{shareCount=n;const el=$('#share-count');if(el)el.textContent=`${n}개`;}).catch(()=>{});
    if(community.status==='idle')loadCommunity();
    $('#community-switch').onchange=async e=>{
      if(e.target.checked){e.target.checked=false;if(await joinCommunity())renderSettings();}
      else{e.target.checked=true;if(!await confirmBox('참여를 그만둘까요?','앞으로 새 기록을 공유하지 않아요. 이미 공유한 기록은 남아 있으니, 지우려면 "공유 기록 모두 지우기"를 눌러 주세요.','그만두기'))return;setConsent(false);renderSettings();toast('참여를 그만뒀어요.');}
    };
    bind('#delete-shares',async()=>{if(!await confirmBox('공유 기록을 모두 지울까요?','이 브라우저에서 공유한 옷차림 자료를 서버에서 모두 지워요. 내 폰의 기록은 그대로예요.','모두 지우기'))return;try{const n=await deleteMyShares();for(const r of records.filter(r=>r.sharedAt)){r.sharedAt=null;r.share=false;await store('readwrite',st=>st.put(r));}shareCount=0;clearCommunityCache();community.status='idle';await readRecords();if(view==='settings')renderSettings();toast(`공유 기록 ${n}개를 지웠어요.`);}catch(e){toast(e.message);}});
  }
  bind('#install',async()=>{await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;renderSettings();});
}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;try{if(file.size>30*1024*1024)throw Error('30MB 이하의 백업을 선택해 주세요.');let parsed;try{parsed=JSON.parse(await file.text());}catch{throw Error('백업 파일을 읽지 못했어요. JSON 백업을 선택해 주세요.');}const incoming=validateBackup(parsed),fresh=incoming.filter(r=>!records.some(old=>old.date===r.date));if(!fresh.length){toast('새로 가져올 기록이 없어요. 기존 기록은 그대로예요.');return;}await store('readwrite',s=>{fresh.forEach(r=>{delete r.sharedAt;delete r.share;s.add(r);});});await readRecords();if(view==='settings')renderSettings();toast(`${fresh.length}개 기록을 가져왔어요. 기존 날짜 ${incoming.length-fresh.length}개는 보존했어요.`);}catch(error){toast(error.message);}finally{if(e.target)e.target.value='';}}
window.addEventListener('beforeunload',e=>{if(draft?.dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(view==='settings')renderSettings();});
window.addEventListener('online',()=>{if(view==='today')loadWeather(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='today'&&(!weather||weather.today.date!==dates().today||Date.now()-fetched>1800000))loadWeather();});
setInterval(()=>{if(view==='today'&&!document.hidden&&weather?.today.date!==dates().today&&!loading)loadWeather();},60000);
async function init(){render();try{db=await openDB();await readRecords();}catch(e){dbError=e.message;}if('serviceWorker'in navigator&&isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});logOpen(dates().today);await loadWeather();}
init();
