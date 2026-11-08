// 알림(Web Push) 등록·해제·시험. 아이폰은 홈 화면에 추가한 앱(iOS 16.4+)에서만 가능
import {COMMUNITY} from './community-config.mjs';
const base=COMMUNITY.url?COMMUNITY.url.replace(/\/$/,''):'';
const PREFS='yesterday-weather-push-v1';
export const DEFAULT_PREFS={on:false,morning:true,evening:true,mode:'need'};
export function pushPrefs(){try{return {...DEFAULT_PREFS,...JSON.parse(localStorage.getItem(PREFS)||'{}')};}catch{return {...DEFAULT_PREFS};}}
export function savePrefs(p){try{localStorage.setItem(PREFS,JSON.stringify(p));}catch{}}
export const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
// 'ok' | 'ios-home'(홈 화면 앱 필요) | 'unsupported' | 'off'(서버 미연결)
// 서버 알림 함수(send-push) 배포 전에는 false → 설정의 알림 칸을 숨김. 서버 배포 후 true로 바꿔 다시 배포
export const PUSH_READY=false;
export function pushStatus(){
  if(!base||!PUSH_READY)return 'off';
  if(!('serviceWorker'in navigator)||!('Notification'in window)||!isSecureContext)return isIOS()&&!isStandalone()?'ios-home':'unsupported';
  if(!('PushManager'in window))return isIOS()&&!isStandalone()?'ios-home':'unsupported';
  return 'ok';
}
function headers(){const h={'Content-Type':'application/json',apikey:COMMUNITY.key};if(COMMUNITY.key.split('.').length===3)h.Authorization='Bearer '+COMMUNITY.key;return h;}
async function rpc(name,args){const r=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(),body:JSON.stringify(args)});if(!r.ok)throw Error('알림 서버가 요청을 받지 않았어요.');return r.status===204?null:r.json();}
async function fn(body){const r=await fetch(`${base}/functions/v1/send-push`,{method:'POST',headers:headers(),body:JSON.stringify(body)});let j={};try{j=await r.json();}catch{}if(r.status===429)throw Error('1분 뒤에 다시 시험해 주세요.');if(!r.ok)throw Error('알림 서버에 연결하지 못했어요.');return j;}
function keyBytes(b64){const s=(b64+'='.repeat((4-b64.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
export async function currentSub(){const reg=await navigator.serviceWorker.getRegistration();return reg?await reg.pushManager.getSubscription():null;}
// 서버에 보낼 위치: 9개 도시면 그대로, 현재 위치는 서버에서 0.1° 반올림
export async function register(info){
  const sub=await currentSub();if(!sub)throw Error('알림 등록이 없어요. 알림 받기를 다시 켜 주세요.');
  const j=sub.toJSON();
  await rpc('save_push',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_lat:info.lat,p_lon:info.lon,p_city:String(info.city).slice(0,20),p_depart:info.depart,p_return:info.ret,p_morning:info.morning,p_evening:info.evening,p_mode:info.mode});
}
export async function enablePush(info){
  if(pushStatus()!=='ok')throw Error('이 기기에서는 알림을 켤 수 없어요.');
  const perm=await Notification.requestPermission();
  if(perm!=='granted')throw Error(isIOS()?'알림이 허용되지 않았어요. 아이폰 설정 → 알림 → 어제와 비교해서에서 켜 주세요.':'알림이 허용되지 않았어요. 브라우저 설정에서 알림을 허용해 주세요.');
  const reg=await navigator.serviceWorker.ready;
  let key=await rpc('push_public_key',{});if(!key)key=(await fn({action:'init'})).publicKey;
  if(!key)throw Error('알림 서버가 아직 준비되지 않았어요.');
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key)});
  await register(info);
}
export async function disablePush(){const s=await currentSub();if(s){try{await rpc('delete_push',{p_endpoint:s.endpoint});}catch{}await s.unsubscribe();}}
export async function testPush(){const s=await currentSub();if(!s)throw Error('알림 등록이 없어요.');return fn({action:'test',endpoint:s.endpoint});}
// 출발 1시간 전·귀가 1시간 전 (설정 시각 기준). 출발이 0시면 알림 불가
export function pushTimes(settings,slots){const depart=settings.hour,ret=slots.evening??null;return {depart,ret,morningAt:depart>=1?depart-1:null,eveningAt:ret&&ret>=1?ret-1:null};}
