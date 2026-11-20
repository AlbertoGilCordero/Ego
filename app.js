/* Ágoge — lógica de la app. El contenido vive en plan.js y las frases de Méntor en mentor.js. */
(function(){
"use strict";
var P=window.AGOGE_PLAN,CFG=window.AGOGE_CONFIG||{};
var RANKS=P.ranks,M=P.missions,ORDER=P.order,FIN=P.fin,PROMPTS=P.prompts,AGON=P.agon,EIC=P.deadline,MIN_DAY=P.minDay;

/* ---------- estado ---------- */
var S=null, tab="hoy", sb=null, user=null, dirty=null, tick=null;
function blank(){return{v:1,xp:0,days:{},oath:false,first:"",timer:null,chat:[],agon:{},lang:"es",created:today(),updated:0}}
function pad(n){return(n<10?"0":"")+n}
function key(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function today(){return key(new Date())}
function day(k){k=k||today();if(!S.days[k])S.days[k]={m:{},done:{},am:{},rev:null,sos:0,xp:0};return S.days[k]}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function lvl(){var l=0;for(var i=0;i<RANKS.length;i++)if(S.xp>=RANKS[i][1])l=i;return l}
function tier(){var l=lvl();return l<2?0:l<4?1:2}
function target(k){return M[k].base[tier()]}
function total(d){var t=0;ORDER.forEach(function(k){t+=d.m[k]||0});return t}
function weekNo(){var a=new Date(S.created+"T00:00:00"),b=new Date();return Math.max(0,Math.floor((b-a)/6048e5))}
function isoWeek(){var d=new Date();var o=new Date(d.getFullYear(),0,1);return d.getFullYear()+"-"+Math.ceil(((d-o)/864e5+o.getDay()+1)/7)}

function streakInfo(){
  var s=0,sh=1,best=0,d=new Date(S.created+"T00:00:00"),end=new Date();end.setHours(0,0,0,0);
  while(d<end){var r=S.days[key(d)],ok=r&&total(r)>=MIN_DAY;
    if(ok){s++;if(s%7===0)sh=Math.min(2,sh+1)}
    else if(d.getDay()===0){}
    else if(sh>0&&s>0){sh--}
    else s=0;
    best=Math.max(best,s);d.setDate(d.getDate()+1)}
  var t=S.days[today()];if(t&&total(t)>=MIN_DAY){s++;best=Math.max(best,s)}
  return{s:s,sh:sh,best:best}
}
function cleanRun(){var n=0,d=new Date();for(var i=0;i<400;i++){var r=S.days[key(d)];if(r&&r.rev){if(r.rev.clean)n++;else break}else if(i>0)break;d.setDate(d.getDate()-1)}return n}
/* ---------- guardar ---------- */
function save(){
  S.updated=Date.now();
  try{localStorage.setItem("agoge",JSON.stringify(S))}catch(e){}
  if(!sb||!user)return;
  clearTimeout(dirty);dirty=setTimeout(pushState,1200);
}
function toast(t){var el=document.getElementById("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){el.hidden=true},2600)}
function addXP(n,why){
  var before=lvl();S.xp+=n;day().xp+=n;save();
  toast("+"+n+" XP · "+why);
  var after=lvl();
  if(after>before)setTimeout(function(){overlay('<div class="card"><div class="eyebrow">Ascenso</div><h1>'+esc(RANKS[after][0]).toUpperCase()+'</h1><p>Nivel '+(after+1)+'. '+(tier()>0&&[2,4].indexOf(after)>-1?'Tus bloques se alargan: más carga, mismo método.':'Has ganado este rango con trabajo, no con suerte.')+'</p><div class="btns" style="justify-content:center"><button class="btn solid" data-act="close">Seguir</button></div></div>')},500);
  header();
}

/* ---------- cabecera ---------- */
function header(){
  var l=lvl(),cur=RANKS[l][1],nx=RANKS[l+1]?RANKS[l+1][1]:null;
  document.getElementById("rank").textContent=RANKS[l][0].toUpperCase();
  document.getElementById("ranksub").textContent="Nivel "+(l+1)+" · "+S.xp+" XP"+(nx?" · faltan "+(nx-S.xp):"");
  document.getElementById("rankimg").src="art/r"+l+".webp";
  document.getElementById("heroart").src="art/"+({hoy:"angel",senda:"david2",mentor:"angel2",codice:"vitruvio"}[tab]||"angel")+".webp";
  document.getElementById("xpfill").style.width=(nx?Math.min(100,(S.xp-cur)/(nx-cur)*100):100)+"%";
}

/* ---------- HOY ---------- */
function videoLang(){var g=new Date().getDay();return g===0?null:g===6?"el idioma que elijas":(g%2===1?"francés":"inglés")}
function mission(k){
  var d=day(),m=M[k],tg=target(k),mn=d.m[k]||0,done=!!d.done[k],run=S.timer&&S.timer.k===k,desc=m.d;
  if(k==="voz"){var vl=videoLang();desc=(vl?"Hoy en "+vl+". ":"")+PROMPTS[(new Date().getDate())%PROMPTS.length]}
  if(k==="capital")desc="Semana "+(Math.min(11,weekNo())+1)+" de 12: "+FIN[Math.min(11,weekNo())]+".";
  if(k==="obra"){var left=Math.ceil((EIC-new Date())/864e5);desc=m.d+(left>0?" Quedan "+left+" días para el 25 de febrero.":"")}
  var h='<section class="slab'+(done?" done":"")+'"><div class="mrow"><img class="micon ink" alt="" src="art/i-'+k+'.webp" onerror="this.remove()"><div class="grow"><div class="row"><div class="mtitle">'+m.t.toUpperCase()+(done?" ✓":"")+'</div><div class="mins" id="mins-'+k+'">'+(k==="voz"?(done?"hecho":""):mn+" / "+tg+" min")+'</div></div><div class="mdesc">'+esc(desc)+'</div>';
  if(k!=="voz")h+='<div class="prog"><i style="width:'+Math.min(100,mn/tg*100)+'%"></i></div>';
  h+='<div class="btns">';
  if(k==="voz"){h+=done?'':'<button class="btn solid" data-act="done" data-k="voz">Grabado</button>'}
  else{
    h+=run?'<button class="btn solid" data-act="stop">Parar · <span id="clock">0:00</span></button>':'<button class="btn'+(done?" ghost":" solid")+'" data-act="start" data-k="'+k+'">'+(mn?"Seguir":"Empezar")+'</button>';
    if(!run)h+='<button class="btn ghost" data-act="plus" data-k="'+k+'">+10 min</button>';
    if(!done&&!run)h+='<button class="btn ghost" data-act="done" data-k="'+k+'">Hecho</button>';
  }
  return h+'</div></div></div></section>';
}
var IC={flame:'<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-2.6 1.7-4.2 3-6 .9-1.3 1.4-2.8 1.2-5.4 2.6 1.3 4.3 3.6 4.6 6.2.9-.5 1.5-1.3 1.8-2.3 1.3 1.7 2.4 3.9 2.4 6.6 0 3.8-2.8 6.5-7 6.5z"/>',clock:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5M12 3v3"/>',shield:'<path d="M12 3l7.5 2.5v6c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5v-6z"/>',glass:'<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 9.5h16M8 3v4M16 3v4M8 13h2M14 13h2M8 16.5h2"/>'};
function ico(n){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+IC[n]+'</svg>'}
function viewHoy(){
  var d=day(),t=total(d),st=streakInfo(),dow=new Date().getDay(),h="";
  h+='<div class="stats"><div class="stat"><b>'+st.s+'</b><span>'+ico("flame")+'Racha</span></div><div class="stat"><b>'+t+'</b><span>'+ico("clock")+'Min hoy</span></div><div class="stat"><b>'+st.sh+'</b><span>'+ico("shield")+'Escudos</span></div></div>';
  if(dow===0)h+='<div class="banner"><b>Domingo: descanso.</b> La racha no se rompe hoy. Haz la revisión de la semana y prepara el lunes.</div>';
  else if(t>=MIN_DAY)h+='<div class="banner"><b>Mínimo cumplido.</b> La racha de hoy está a salvo. Lo que hagas ahora es ventaja.</div>';
  else h+='<div class="banner"><b>Faltan '+(MIN_DAY-t)+' minutos</b> para tu mínimo de 2 horas. Ese mínimo mantiene la racha.</div>';
  h+=palabra();
  if(S.first)h+='<div class="slab"><div class="eyebrow">Primera acción de hoy, decidida anoche</div><div style="margin-top:6px;color:var(--light)">'+esc(S.first)+'</div></div>';
  // amanecer
  var am=d.am,A=[["phone","30 minutos sin móvil, salvo abrir el cofre"],["light","5–10 minutos de luz exterior"],["water","Agua y moverte un poco"]];
  h+='<section class="slab deco-ciudad"><div class="mrow"><img class="micon ink" alt="" src="art/i-sol.webp"><div class="grow"><div class="row"><h2>AMANECER</h2><span class="eyebrow">+15 XP</span></div><div class="list">';
  A.forEach(function(a){h+='<button class="item'+(am[a[0]]?" on":"")+'" data-act="am" data-k="'+a[0]+'"><span class="check'+(am[a[0]]?" on":"")+'">'+(am[a[0]]?"✓":"")+'</span><span>'+a[1]+'</span></button>'});
  h+='</div></div></div></section>';
  ORDER.forEach(function(k){h+=mission(k)});
  // auxilio
  h+='<section><div class="eyebrow" style="margin-bottom:8px">Cuando la cosa se tuerce</div><div class="sos"><button class="btn warn" data-act="golpe">Golpe recibido</button><button class="btn warn" data-act="urge">Tentación</button></div></section>';
  // agón
  var w=isoWeek(),set=AGON[weekNo()%AGON.length],ag=S.agon[w]||[];
  h+='<section class="slab deco-corazon"><div class="row"><h2>AGÓN DE LA SEMANA</h2><span class="eyebrow">+50 XP</span></div><div class="list">';
  set.forEach(function(x,i){h+='<button class="item'+(ag[i]?" on":"")+'" data-act="agon" data-k="'+i+'"><span class="check'+(ag[i]?" on":"")+'">'+(ag[i]?"✓":"")+'</span><span>'+x+'</span></button>'});
  h+='</div></section>';
  // revisión
  h+='<section class="slab deco-cerebro"><div class="row"><h2>REVISIÓN DE LA NOCHE</h2><span class="eyebrow">+15 XP</span></div>';
  if(d.rev)h+='<p class="mdesc" style="margin-top:8px">Hecha. Mañana empiezas por: <b style="color:var(--light)">'+esc(d.rev.first||"—")+'</b></p>';
  else h+='<label for="rv1">¿Qué hice bien hoy?</label><textarea id="rv1"></textarea><label for="rv2">¿Qué corrijo mañana?</label><textarea id="rv2"></textarea><label for="rv3">Mañana, lo primero que hago es…</label><input type="text" id="rv3" placeholder="Si son las 9:00, entonces abro el EIC y escribo la sección 1"><label for="rv4">¿Hoy sin videojuegos, TikTok ni anime?</label><select id="rv4"><option value="1">Sí, día limpio</option><option value="0">No, he caído</option></select><div class="btns"><button class="btn solid" data-act="review">Cerrar el día</button></div>';
  h+='</section>';
  return h;
}

/* ---------- SENDA ---------- */
function viewSenda(){
  var st=streakInfo(),tot=0,per={},n=0,h="";
  ORDER.forEach(function(k){per[k]=0});
  Object.keys(S.days).forEach(function(k){var r=S.days[k];ORDER.forEach(function(q){per[q]+=r.m[q]||0});var t=total(r);tot+=t;if(t>0)n++});
  h+='<div class="stats"><div class="stat"><b>'+st.best+'</b><span>'+ico("flame")+'Mejor racha</span></div><div class="stat"><b>'+Math.round(tot/60)+'</b><span>'+ico("glass")+'Horas</span></div><div class="stat"><b>'+cleanRun()+'</b><span>'+ico("cal")+'Días limpios</span></div></div>';
  h+='<section class="slab"><h2>ÚLTIMOS 28 DÍAS</h2><div class="heat">';
  var d=new Date();d.setDate(d.getDate()-27);
  for(var i=0;i<28;i++){var r=S.days[key(d)],t=r?total(r):0,a=Math.min(1,t/180);h+='<i title="'+key(d)+': '+t+' min" style="background:rgba(63,41,23,'+(t?0.12+a*0.78:0)+')"></i>';d.setDate(d.getDate()+1)}
  h+='</div><p class="mdesc" style="margin-top:8px">Cuanto más cargada la tinta, más minutos de trabajo ese día.</p></section>';
  h+='<section class="slab"><h2>HORAS POR PILAR</h2><div class="list" style="gap:0">';
  ORDER.forEach(function(k){if(k==="voz")return;h+='<div class="pillar"><img class="ink" alt="" src="art/i-'+k+'.webp"><span>'+M[k].t+'</span><span class="mins">'+(per[k]/60).toFixed(1)+' h</span></div>'});
  h+='</div></section>';
  h+='<section class="slab"><h2>RANGOS</h2><div class="ladder">';var l=lvl();
  RANKS.forEach(function(r,i){h+='<div class="rung'+(i===l?" now":i<l?" past":"")+'"><img class="ink" alt="" src="art/r'+i+'.webp"><b>'+(i+1)+'. '+r[0]+'</b><span>'+r[1]+' XP</span></div>'});
  h+='</div><p class="mdesc" style="margin-top:8px">En Hoplita y en Taxiarca los bloques se alargan. La carga sube cuando ya dominas la anterior.</p></section>';
  return h;
}

/* ---------- MÉNTOR ---------- */
var CHIPS=["Briefing de la mañana","Me han rechazado","No tengo ganas","He recaído","Revisa mi día","Tengo miedo de no conseguirlo"];
function viewMentor(){
  var h='<section class="slab"><div class="row"><h2>MENTOR</h2><select id="lang" style="width:auto" aria-label="Idioma de Méntor"><option value="es">Español</option><option value="fr">Français</option><option value="en">English</option></select></div><p class="mdesc">Firme y cercano. Te exige porque confía en ti. Cambia el idioma para practicar.</p></section><div class="chat" id="chat">';
  if(!S.chat.length)h+='<div class="msg m">Estoy aquí. Dime cómo vas hoy, sin adornos, y decidimos el siguiente paso.</div>';
  S.chat.forEach(function(c){h+='<div class="msg '+(c.r==="u"?"u":"m")+'">'+esc(c.t)+'</div>'});
  h+='</div><div class="chips">';CHIPS.forEach(function(c){h+='<button class="chip" data-act="chip" data-k="'+esc(c)+'">'+c+'</button>'});
  h+='</div><div class="send"><textarea id="say" placeholder="Escribe a Mentor…" aria-label="Mensaje"></textarea><button class="btn solid" data-act="say">Enviar</button></div>';
  return h;
}
function ctx(){
  var d=day(),st=streakInfo(),now=new Date();
  return{minutes:total(d),min:MIN_DAY,streak:st.s,shields:st.sh,rank:RANKS[lvl()][0],clean:cleanRun(),sos:d.sos,first:S.first||"",hour:now.getHours(),dow:now.getDay(),rev:!!d.rev,
    eic:Math.ceil((EIC-now)/864e5),
    pending:ORDER.filter(function(k){return !d.done[k]}).map(function(k){return{k:k,t:M[k].t,left:k==="voz"?3:Math.max(1,target(k)-(d.m[k]||0))}})};
}
function say(text){
  text=(text||"").trim();if(!text)return;
  S.chat.push({r:"u",t:text.slice(0,600)});
  var r;try{r=window.Mentor.reply(text,ctx(),S.lang||"es")}catch(e){r="Una acción concreta, diez minutos. Empieza."}
  S.chat.push({r:"m",t:r});S.chat=S.chat.slice(-30);save();render();scrollChat();
}
function scrollChat(){setTimeout(function(){window.scrollTo(0,document.body.scrollHeight)},30)}

/* ---------- CÓDICE ---------- */
function viewCodice(){
  var C=P.codice,h='<section class="slab"><h2>EL CÓDICE</h2><p class="mdesc">Por qué cada parte de Ágoge está aquí, y cuánta ciencia hay detrás.</p></section>';
  C.forEach(function(c){h+='<details><summary>'+c[0]+'</summary><p>'+c[1]+'</p></details>'});
  h+='<section class="slab"><h2>TUS JURAMENTOS</h2><div class="list"><div class="oath"><b>Si me despierto,</b> entonces el móvil se queda cargando lejos de la cama y salgo a la luz.</div><div class="oath"><b>Si recibo un rechazo,</b> entonces abro Ágoge y pulso «Golpe recibido» antes de tocar nada más.</div></div></section>';
  h+=viewCuenta();
  return h;
}
function viewCuenta(){
  var h='<section class="slab"><h2>CLAUDE</h2><p class="mdesc" style="margin-top:6px">Copia un resumen de tus últimos 14 días y pégalo en Claude para que revise tu progreso o ajuste el plan.</p><div class="btns"><button class="btn ghost" data-act="export">Copiar resumen</button></div></section><section class="slab"><h2>CUENTA Y COPIA</h2>';
  if(!CFG.supabaseUrl||!CFG.supabaseAnonKey){return h+'<p class="mdesc" style="margin-top:6px">Modo local: tus datos viven solo en este teléfono. Para tener copia en tu servidor y avisos automáticos, sigue la guía del proyecto y rellena <b>config.js</b>.</p></section>'}
  if(!sb){return h+'<p class="mdesc" style="margin-top:6px">Sin conexión con el servidor ahora mismo. La app sigue funcionando y sincronizará al volver la red.</p></section>'}
  if(!user){
    h+='<p class="mdesc" style="margin-top:6px">Entra para guardar tu progreso en tu servidor.</p><label for="em">Correo</label><input type="email" id="em" autocomplete="email"><label for="pw">Contraseña (mínimo 8 caracteres)</label><input type="password" id="pw" autocomplete="current-password"><div class="btns"><button class="btn solid" data-act="signin">Entrar</button><button class="btn ghost" data-act="signup">Crear cuenta</button></div></section>';
    return h;
  }
  h+='<p class="mdesc" style="margin-top:6px">Sesión: <b style="color:var(--light)">'+esc(user.email||"")+'</b>. '+esc(syncMsg)+'</p><div class="btns"><button class="btn ghost" data-act="sync">Sincronizar ahora</button><button class="btn ghost" data-act="signout">Cerrar sesión</button></div></section>';
  h+='<section class="slab"><h2>AVISOS</h2>';
  if(!CFG.vapidPublicKey||!("PushManager" in window)||!("serviceWorker" in navigator)){return h+'<p class="mdesc" style="margin-top:6px">'+(!CFG.vapidPublicKey?'Falta la clave pública de avisos en config.js.':'Este navegador no admite avisos. Usa Chrome en Android con la app instalada.')+'</p></section>'}
  h+='<p class="mdesc" style="margin-top:6px">'+(S.push?'Avisos activados en este teléfono.':'Recibe el aviso de la mañana, el de la noche y el de racha en peligro.')+'</p><label for="tam">Aviso de la mañana</label><input type="time" id="tam" value="'+esc(S.am||"07:15")+'"><label for="tpm">Aviso de la noche</label><input type="time" id="tpm" value="'+esc(S.pm||"21:15")+'"><label for="tgd">Racha en peligro (18:30, si no llegas al mínimo)</label><select id="tgd"><option value="1"'+(S.guard!==false?" selected":"")+'>Activado</option><option value="0"'+(S.guard===false?" selected":"")+'>Desactivado</option></select><div class="btns"><button class="btn solid" data-act="pushon">'+(S.push?"Guardar horarios":"Activar avisos")+'</button>'+(S.push?'<button class="btn ghost" data-act="pushoff">Desactivar</button>':'')+'</div></section>';
  return h;
}

/* ---------- servidor propio ---------- */
var syncMsg="";
function pushState(){
  if(!sb||!user)return;
  var snap=JSON.parse(JSON.stringify(S));
  sb.from("agoge_state").upsert({user_id:user.id,data:snap,updated_at:new Date().toISOString()}).then(function(r){syncMsg=r.error?"No se pudo guardar: "+r.error.message:"Guardado en tu servidor a las "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})+".";if(tab==="codice"&&!document.activeElement.matches("input,select,textarea"))render()},function(){syncMsg="Sin red. Se guardará más tarde."});
}
function pullState(){
  if(!sb||!user)return Promise.resolve();
  return sb.from("agoge_state").select("data").eq("user_id",user.id).maybeSingle().then(function(r){
    if(r.error){syncMsg="No se pudo leer: "+r.error.message;return}
    var d=r.data&&r.data.data;
    if(d&&d.v===1&&(d.updated||0)>(S.updated||0)){S=d;S.days=S.days||{};S.chat=S.chat||[];S.agon=S.agon||{};try{localStorage.setItem("agoge",JSON.stringify(S))}catch(e){}syncMsg="Progreso recuperado de tu servidor.";closeOv();if(!S.oath)oath()}
    else pushState();
    render();
  },function(){syncMsg="Sin red."});
}
function auth(kind){
  var em=(document.getElementById("em").value||"").trim(),pw=document.getElementById("pw").value||"";
  if(!em||pw.length<8){toast("Escribe tu correo y una contraseña de 8 caracteres o más.");return}
  var p=kind==="signup"?sb.auth.signUp({email:em,password:pw}):sb.auth.signInWithPassword({email:em,password:pw});
  p.then(function(r){
    if(r.error){toast(r.error.message);return}
    user=(r.data&&r.data.session&&r.data.session.user)||null;
    if(!user){toast("Cuenta creada. Confirma el correo y entra.");return}
    toast("Dentro.");pullState();render();
  },function(){toast("Sin conexión.")});
}
function u8(b){var p="=".repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,"+").replace(/_/g,"/")),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
function pushOn(){
  var am=document.getElementById("tam").value||"07:15",pm=document.getElementById("tpm").value||"21:15",gd=document.getElementById("tgd").value==="1";
  S.am=am;S.pm=pm;S.guard=gd;
  Notification.requestPermission().then(function(perm){
    if(perm!=="granted"){toast("Permiso de notificaciones denegado. Actívalo en los ajustes del teléfono.");return}
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){return sub||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(CFG.vapidPublicKey)})});
    }).then(function(sub){
      var j=sub.toJSON();
      return sb.from("agoge_push").upsert({endpoint:j.endpoint,user_id:user.id,p256dh:j.keys.p256dh,auth:j.keys.auth,tz:Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Paris",am:am,pm:pm,guard:gd});
    }).then(function(r){
      if(r&&r.error){toast("No se pudo activar: "+r.error.message);return}
      S.push=true;save();render();toast("Avisos activados.");
    });
  }).catch(function(e){toast("No se pudo activar: "+(e&&e.message||"error"))});
}
function pushOff(){
  navigator.serviceWorker.ready.then(function(reg){return reg.pushManager.getSubscription()}).then(function(sub){
    if(!sub)return;
    var ep=sub.endpoint;return sub.unsubscribe().then(function(){return sb.from("agoge_push").delete().eq("endpoint",ep)});
  }).then(function(){S.push=false;save();render();toast("Avisos desactivados.")}).catch(function(){toast("No se pudo desactivar.")});
}

function exportText(){
  var st=streakInfo(),out=["ÁGOGE · resumen al "+today(),"Rango: "+RANKS[lvl()][0]+" ("+S.xp+" XP). Racha: "+st.s+" (mejor "+st.best+"). Escudos: "+st.sh+". Días limpios seguidos: "+cleanRun()+".","Fecha | min totales | "+ORDER.join(" ")+" | amanecer | revisión | limpio | SOS"],d=new Date();
  d.setDate(d.getDate()-13);
  for(var i=0;i<14;i++){var k=key(d),r=S.days[k];
    if(r)out.push(k+" | "+total(r)+" | "+ORDER.map(function(q){return r.m[q]||0}).join(" ")+" | "+(r.amxp?"sí":"no")+" | "+(r.rev?"sí":"no")+" | "+(r.rev?(r.rev.clean?"sí":"no"):"-")+" | "+(r.sos||0)+(r.rev&&r.rev.fix?" | corregir: "+r.rev.fix:""));
    else out.push(k+" | sin datos");d.setDate(d.getDate()+1)}
  return out.join("\n");
}
function doExport(){var t=exportText();
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast("Resumen copiado. Pégalo en Claude.")},function(){showExport(t)});else showExport(t)}
function showExport(t){overlay('<div class="card"><h1>RESUMEN</h1><textarea style="min-height:240px" readonly>'+esc(t)+'</textarea><div class="btns" style="justify-content:center"><button class="btn solid" data-act="close">Cerrar</button></div></div>')}

/* ---------- ALBA: palabra del día y cofre ---------- */
var CT=window.AGOGE_CITAS||{};CT.quotes=CT.quotes||[];CT.verses=CT.verses||[];var DAWN=P.dawn||{before:8,late:12,week:50};
/* Baraja sin repetición: el orden depende de una semilla propia de esta instalación y solo se avanza una carta
   los días en que abres la app, así que no se repite ninguna hasta haberlas visto todas. */
function fnv(t){var h=2166136261;for(var i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
var decks={};
function deck(name){
  if(decks[name]&&decks[name].seed===S.seed)return decks[name].o;
  var arr=CT[name]||[],o=arr.map(function(x,i){return[fnv(S.seed+":"+x[0]),i]}).sort(function(a,b){return a[0]-b[0]||a[1]-b[1]}).map(function(x){return x[1]});
  decks[name]={seed:S.seed,o:o};return o;
}
function wordOfDay(){
  if(!S.seed){S.seed=Math.floor(Math.random()*1e9)+1}
  var t=today();
  if(!S.word||S.word.d!==t){S.word={d:t,n:S.word?S.word.n+1:0};save()}
  var q=deck("quotes"),v=deck("verses"),n=S.word.n;
  return{q:q.length?CT.quotes[q[n%q.length]]:null,v:v.length?CT.verses[v[n%v.length]]:null,n:n,total:Math.min(q.length||1e9,v.length||1e9)}
}
function wordHTML(){var w=wordOfDay(),h="";
  if(w.q)h+='<blockquote class="cita">«'+esc(w.q[0])+'»<cite>'+esc(w.q[1])+'</cite></blockquote>';
  if(w.v)h+='<blockquote class="cita verso">«'+esc(w.v[0])+'»<cite>'+esc(w.v[1])+'</cite></blockquote>';
  return h}
function palabra(){var w=wordHTML();if(!w)return"";var x=wordOfDay();return'<section class="slab"><div class="eyebrow">Palabra del día · '+(x.n%x.total+1)+' de '+x.total+'</div>'+w+'</section>'}
function albaRun(){var n=0,d=new Date();for(var i=0;i<400;i++){var r=S.days[key(d)];if(r&&r.alba&&r.alba.early)n++;else if(i>0)break;d.setDate(d.getDate()-1)}return n}
function maybeAlba(){
  if(!S||!S.oath)return;var o=document.getElementById("overlay");if(!o.hidden)return;
  var d=day();if(d.alba)return;
  var hr=new Date().getHours(),early=hr>=4&&hr<DAWN.before,late=!early&&hr<DAWN.late,run=albaRun();
  var line=early?"Has llegado antes de las "+DAWN.before+":00. El cofre del alba es tuyo."+(run?" Llevas "+run+" albas seguidas.":""):late?"El alba ya pasó, pero has venido. Hay algo para ti; mañana, antes de las "+DAWN.before+":00, hay más.":"Hoy el cofre del alba se quedó cerrado. Mañana, antes de las "+DAWN.before+":00. La palabra de hoy sigue siendo tuya.";
  overlay('<div class="card"><div class="eyebrow">Alba · '+new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})+'</div><h1>'+(early?"BUENOS DÍAS":"PALABRA DEL DÍA")+'</h1>'+wordHTML()+'<p id="albaline">'+line+'</p><div id="cofre"></div><div class="btns" style="justify-content:center" id="albabtns">'+(early||late?'<button class="btn solid" data-act="cofre">Abrir el cofre</button>':'<button class="btn solid" data-act="cofre">A por el día</button>')+'</div></div>');
}
function openCofre(){
  var d=day();if(d.alba){closeOv();render();return}
  var hr=new Date().getHours(),early=hr>=4&&hr<DAWN.before,late=!early&&hr<DAWN.late,xp=0,name="";
  if(early){var r=Math.random();if(r<0.1){xp=40;name="Corona de oro"}else if(r<0.4){xp=25;name="Corona de plata"}else{xp=15;name="Corona de bronce"}}
  else if(late){xp=5;name="Moneda de cobre"}
  d.alba={xp:xp,early:early,t:Date.now()};save();
  if(!xp){closeOv();render();return}
  var run=albaRun(),bonus=early&&run>0&&run%7===0;
  var nx=ORDER.filter(function(k){return !d.done[k]})[0];
  document.getElementById("cofre").innerHTML='<div class="premio"><div class="big">+'+xp+'</div><div class="eyebrow">'+name+' · XP</div></div>';
  document.getElementById("albaline").textContent=(early?"Alba número "+run+" seguida. ":"")+(bonus?"Siete albas: +"+DAWN.week+" XP extra. ":"")+(S.first?"Tu primera acción: "+S.first:nx?"Empieza por "+M[nx].t+".":"");
  document.getElementById("albabtns").innerHTML='<button class="btn solid" data-act="albago">A por el día</button>';
  addXP(xp,name);if(bonus)setTimeout(function(){addXP(DAWN.week,"Siete albas")},1200);
}

/* ---------- protocolos ---------- */
function overlay(html){var o=document.getElementById("overlay");o.innerHTML='<div class="veil">'+html+'</div>';o.hidden=false}
function closeOv(){var o=document.getElementById("overlay");o.hidden=true;o.innerHTML="";clearInterval(proto.t)}
var proto={t:null};
function runProto(kind){
  var steps=kind==="golpe"?[["Ponle nombre","Di en voz alta qué ha pasado y qué sientes. Una frase. «Me han rechazado y estoy frustrado.»",20],["Respira","Inhala por la nariz, otra inhalación corta encima, y exhala muy despacio por la boca. Repite.",90],["Muévete","De pie. Camina, sal a la calle si puedes. El móvil en el bolsillo.",300],["Una acción","Elige la tarea más pequeña de hoy y hazla dos minutos. Solo dos.",0]]
   :[["Míralas","Tienes ganas de escapar. No las obedezcas ni las pelees: obsérvalas. ¿Dónde las notas en el cuerpo?",30],["Aguanta la ola","Suben, tocan techo y bajan. Quédate aquí respirando mientras pasa.",240],["Cambia de sitio","Levántate y cambia de habitación o sal a la puerta. El entorno manda más que la voluntad.",60],["Vuelve","Abre el bloque más corto que te quede y haz diez minutos.",0]];
  var i=0;
  function show(){
    var s=steps[i],left=s[2];
    overlay('<div class="card"><div class="eyebrow">'+(kind==="golpe"?"Golpe recibido":"Tentación")+' · paso '+(i+1)+' de '+steps.length+'</div><h1>'+s[0].toUpperCase()+'</h1><p>'+s[1]+'</p>'+(left?'<div class="big" id="pclock">'+fmt(left)+'</div>':'')+'<div class="btns" style="justify-content:center"><button class="btn solid" data-act="pnext">'+(i===steps.length-1?"Hecho":"Siguiente")+'</button><button class="btn ghost" data-act="close">Salir</button></div></div>');
    clearInterval(proto.t);
    if(left)proto.t=setInterval(function(){left--;var c=document.getElementById("pclock");if(c)c.textContent=fmt(Math.max(0,left));if(left<=0)clearInterval(proto.t)},1000);
  }
  proto.next=function(){i++;if(i>=steps.length){closeOv();day().sos++;addXP(kind==="golpe"?20:15,kind==="golpe"?"Temple":"Ola superada");render()}else show()};
  show();
}
function fmt(s){return Math.floor(s/60)+":"+pad(s%60)}

/* ---------- acciones ---------- */
function complete(k,d){if(d.done[k])return;d.done[k]=true;addXP(M[k].xp,M[k].t);if(ORDER.every(function(q){return d.done[q]})&&!d.perfect){d.perfect=true;setTimeout(function(){addXP(30,"Día completo")},900)}}
function addMin(k,n){var d=day(),before=total(d);d.m[k]=Math.min(600,(d.m[k]||0)+n);if(before<MIN_DAY&&total(d)>=MIN_DAY)toast("Mínimo de 2 horas cumplido. Racha a salvo.");if(d.m[k]>=target(k))complete(k,d);save()}
function stopTimer(){if(!S.timer)return;var mins=Math.max(1,Math.min(240,Math.round((Date.now()-S.timer.s)/6e4))),k=S.timer.k;S.timer=null;addMin(k,mins);save()}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-act],[data-tab]");if(!b)return;
  if(b.dataset.tab){tab=b.dataset.tab;render();window.scrollTo(0,0);return}
  var a=b.dataset.act,k=b.dataset.k,d=day();
  if(a==="start"){if(S.timer)stopTimer();S.timer={k:k,s:Date.now()};save()}
  else if(a==="stop")stopTimer();
  else if(a==="plus")addMin(k,10);
  else if(a==="done"){if(k==="voz"){d.m.voz=10}else d.m[k]=Math.max(d.m[k]||0,target(k));complete(k,d);save()}
  else if(a==="am"){d.am[k]=!d.am[k];if(d.am.phone&&d.am.light&&d.am.water&&!d.amxp){d.amxp=true;addXP(15,"Amanecer")}save()}
  else if(a==="agon"){var w=isoWeek();S.agon[w]=S.agon[w]||[];S.agon[w][+k]=!S.agon[w][+k];if([0,1,2].every(function(i){return S.agon[w][i]})&&!S.agon[w+"x"]){S.agon[w+"x"]=true;addXP(50,"Agón ganado")}save()}
  else if(a==="review"){var f=document.getElementById("rv3").value.trim(),cl=document.getElementById("rv4").value==="1";d.rev={good:document.getElementById("rv1").value.trim().slice(0,400),fix:document.getElementById("rv2").value.trim().slice(0,400),first:f.slice(0,200),clean:cl};S.first=f.slice(0,200);addXP(15,"Día cerrado");if(!cl)setTimeout(function(){toast("Registrado. Una caída es un dato, no un veredicto.")},2800)}
  else if(a==="golpe"||a==="urge"){runProto(a);return}
  else if(a==="pnext"){proto.next();return}
  else if(a==="close"){closeOv();return}
  else if(a==="oath"){S.oath=true;save();closeOv();maybeAlba()}
  else if(a==="cofre"){openCofre();return}
  else if(a==="albago"){closeOv();render();return}
  else if(a==="chip"){say(k);return}
  else if(a==="say"){var t=document.getElementById("say");var v=t.value;t.value="";say(v);return}
  else if(a==="export"){doExport();return}
  else if(a==="signin"||a==="signup"){auth(a);return}
  else if(a==="signout"){sb.auth.signOut().then(function(){user=null;syncMsg="";render()});return}
  else if(a==="sync"){pullState().then(function(){toast(syncMsg||"Sincronizado.")});return}
  else if(a==="pushon"){pushOn();return}
  else if(a==="pushoff"){pushOff();return}
  render();
});
document.addEventListener("change",function(e){if(e.target.id==="lang"){S.lang=e.target.value;save()}});

/* ---------- render ---------- */
function render(){
  header();
  ["hoy","senda","mentor","codice"].forEach(function(t){document.getElementById("tab-"+t).setAttribute("aria-current",t===tab)});
  var keep={};["rv1","rv2","rv3","say","em","pw","tam","tpm"].forEach(function(id){var el=document.getElementById(id);if(el)keep[id]=el.value});
  var v=document.getElementById("view");
  v.innerHTML='<div style="display:flex;flex-direction:column;gap:14px">'+(tab==="hoy"?viewHoy():tab==="senda"?viewSenda():tab==="mentor"?viewMentor():viewCodice())+'</div>';
  Object.keys(keep).forEach(function(id){var el=document.getElementById(id);if(el)el.value=keep[id]});
  var L=document.getElementById("lang");if(L)L.value=S.lang||"es";
  clearInterval(tick);
  if(S.timer&&tab==="hoy"){var up=function(){var c=document.getElementById("clock");if(c)c.textContent=fmt(Math.floor((Date.now()-S.timer.s)/1000))};up();tick=setInterval(up,1000)}
}
function oath(){overlay('<div class="card"><div class="eyebrow">Ágoge · el entrenamiento</div><h1>EL JURAMENTO</h1><p>Aquí no se sube de rango por talento. Se sube por minutos de trabajo, día tras día.</p><div class="oath"><b>Mi mínimo:</b> 2 horas al día. Aunque el día sea malo.</div><div class="oath"><b>Si me despierto,</b> entonces el móvil se queda lejos de la cama y salgo a la luz.</div><div class="oath"><b>Si recibo un rechazo,</b> entonces abro Ágoge y pulso «Golpe recibido» antes de tocar nada más.</div><div class="btns" style="justify-content:center"><button class="btn solid" data-act="oath">Lo juro</button></div></div>')}

/* ---------- arranque ---------- */
function boot(){
  try{var raw=localStorage.getItem("agoge");if(raw)S=JSON.parse(raw)}catch(e){}
  if(!S||S.v!==1)S=blank();
  render();if(!S.oath)oath();else maybeAlba();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(function(){});
  if(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase&&window.supabase.createClient){
    try{sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey)}catch(e){sb=null}
    if(sb){
      sb.auth.getSession().then(function(r){user=(r.data&&r.data.session&&r.data.session.user)||null;if(user)pullState();else if(tab==="codice")render()},function(){});
      sb.auth.onAuthStateChange(function(ev,session){var u=session&&session.user||null;if((u&&u.id)!==(user&&user.id)){user=u;if(tab==="codice")render()}});
    }
  }
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"){if(user)pullState();else render();maybeAlba()}});
}
boot();
})();
