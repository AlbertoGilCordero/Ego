/* Service worker de Ágoge: red primero (para recibir cambios al momento), caché como respaldo sin conexión, y avisos push. */
var CACHE="agoge-v7";
var SHELL=["./","index.html","app.js","plan.js","citas.js","versiculos.js","mentor.js","config.js","vendor/supabase.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","art/ala.webp","art/angel.webp","art/angel2.webp","art/cerebro.webp","art/cerebro2.webp","art/ciudad.webp","art/columna.webp","art/corazon.webp","art/craneo.webp","art/craneo2.webp","art/david.webp","art/david2.webp","art/david3.webp","art/i-capital.webp","art/i-cuerpo.webp","art/i-obra.webp","art/i-oficio.webp","art/i-sol.webp","art/i-voz.webp","art/laurel.webp","art/logo.webp","art/r0.webp","art/r1.webp","art/r2.webp","art/r3.webp","art/r4.webp","art/r5.webp","art/r6.webp","art/r7.webp","art/r8.webp","art/r9.webp","art/rosa.webp","art/vitruvio.webp"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}).catch(function(){}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
  var r=e.request;if(r.method!=="GET")return;
  var u=new URL(r.url);if(u.origin!==self.location.origin)return;
  e.respondWith(fetch(r,{cache:"no-cache"}).then(function(res){
    if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(r,copy)})}
    return res;
  }).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match("index.html")})}));
});
self.addEventListener("push",function(e){
  var d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data?e.data.text():""}}
  e.waitUntil(self.registration.showNotification(d.title||"Ágoge",{body:d.body||"",tag:d.tag||"agoge",icon:"icons/icon-192.png",badge:"icons/badge-96.png",data:{url:d.url||"./"}}));
});
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  var url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){if(cs[i].url.indexOf(self.registration.scope)===0&&"focus" in cs[i])return cs[i].focus()}
    return self.clients.openWindow(url);
  }));
});
