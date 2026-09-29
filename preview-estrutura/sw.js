const CACHE="doctemplate-preview-estrutura-1";
const ASSETS=["./","./index.html","./styles.css?v=4.12.2-estrutura-1","./data.js?v=4.12.2-estrutura-1","./core.js?v=4.12.2-estrutura-1","./app.js?v=4.12.2-estrutura-1","./anatomy/body-front.svg","./anatomy/body-back.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith("doctemplate-preview-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>cached)));});
self.addEventListener("message",e=>{if(e.data==="SKIP_WAITING")self.skipWaiting();});