// 커뮤니티 서버 연결 (Supabase). 기기 번호·동의 상태는 이 브라우저 localStorage에 보관.
import {COMMUNITY} from './community-config.mjs';
const DEVICE='yesterday-weather-device-v1',CONSENT='yesterday-weather-share-consent-v1';
const local=['localhost','127.0.0.1'].includes(location.hostname);
// 설정이 비어 있으면: 맥 로컬에서는 개발용 시험 서버, 공개 주소에서는 꺼짐
const api=COMMUNITY.url?{base:COMMUNITY.url.replace(/\/$/,'')+'/rest/v1/rpc/',key:COMMUNITY.key}:local?{base:'http://localhost:18764/rpc/',key:''}:null;
export const communityEnabled=!!api;
export const communityMode=COMMUNITY.url?'live':local?'dev':'off';
function read(key){try{return localStorage.getItem(key);}catch{return null;}}
function write(key,value){try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);return true;}catch{return false;}}
export function deviceId(){let id=read(DEVICE);if(!/^[0-9a-f-]{36}$/.test(id||'')){id=crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));write(DEVICE,id);}return id;}
export const hasConsent=()=>read(CONSENT)==='yes';
export const setConsent=on=>write(CONSENT,on?'yes':null);
async function rpc(name,args,withDevice=true){
  if(!api)throw Error('커뮤니티 서버가 아직 연결되지 않았어요.');
  const headers={'Content-Type':'application/json'};
  if(api.key){headers.apikey=api.key;if(api.key.split('.').length===3)headers.Authorization='Bearer '+api.key;}
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
  try{
    const res=await fetch(api.base+name,{method:'POST',headers,body:JSON.stringify(withDevice?{p_device:deviceId(),...args}:args),signal:ctrl.signal});
    if(!res.ok){let msg='';try{msg=(await res.json()).message||'';}catch{}throw Error(msg==='date out of range'?'최근 7일 이내 기록만 공유돼요.':'커뮤니티 서버가 요청을 받지 않았어요.');}
    return res.status===204?null:await res.json();
  }catch(e){if(e.name==='AbortError'||e.name==='TypeError')throw Error('커뮤니티 서버에 연결하지 못했어요.');throw e;}
  finally{clearTimeout(timer);}
}
export const shareOutfit=row=>rpc('share_outfit',row);
export const unshareOutfit=date=>rpc('unshare_outfit',{p_date:date});
export const deleteMyShares=()=>rpc('delete_my_shares',{});
export const myShareCount=()=>rpc('my_share_count',{});
let cache=null;
export async function communityRows(force=false){
  if(!force&&cache&&Date.now()-cache.at<600000)return cache.rows;
  const rows=await rpc('community_outfits',{});cache={rows,at:Date.now()};return rows;
}
export function clearCommunityCache(){cache=null;}

// 이용 통계: 앱을 연 날짜만 (공유용 번호와 다른 무작위 번호). 공개 주소에서만, 하루 한 번.
const STATS_ID='yesterday-weather-stats-id-v1',STATS_OFF='yesterday-weather-stats-off-v1',STATS_LAST='yesterday-weather-stats-last-v1';
export const statsEnabled=()=>read(STATS_OFF)!=='yes';
export const setStats=on=>write(STATS_OFF,on?null:'yes');
export async function logOpen(today){
  if(!api||!statsEnabled()||read(STATS_LAST)===today)return false;
  if(local&&!location.search.includes('stats-test'))return false;
  let id=read(STATS_ID);if(!/^[0-9a-f-]{36}$/.test(id||'')){id=crypto.randomUUID?crypto.randomUUID():deviceId().replace(/^.{8}/,Math.random().toString(16).slice(2,10).padEnd(8,'0'));write(STATS_ID,id);}
  try{await rpc('log_open',{p_stats:id},false);write(STATS_LAST,today);return true;}catch{return false;}
}
