const CACHE='yesterday-weather-shell-v8-1';
const FILES=['./','index.html','style.css','app.mjs','core.mjs','visuals.mjs','community.mjs','community-core.mjs','community-config.mjs','quick-core.mjs','day-core.mjs','rain-core.mjs','push.mjs','share-card.mjs','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('yesterday-weather-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match('index.html'):Response.error());}));});

// 알림: 서버가 보낸 내용을 띄우고, 누르면 앱을 연다
self.addEventListener('push',event=>{let d={};try{d=event.data?.json()||{};}catch{d={body:event.data?.text()||''};}
  event.waitUntil(self.registration.showNotification(d.title||'어제와 비교해서',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||'weather',renotify:true,data:{url:d.url||'./'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification.data?.url||'./',self.location).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if(c.url.startsWith(self.registration.scope)&&'focus'in c)return c.focus();}return clients.openWindow(url);}));});
