/* MÉNTOR — entrenador por reglas, sin IA. Detecta la intención del mensaje y elige una frase
   según el estado del día. Marcadores: {left} minutos que faltan para el mínimo, {min} minutos hechos,
   {next} bloque pendiente más corto, {nmin} sus minutos, {streak}, {first}, {eic}, {clean}.
   Para cambiar su voz, edita las frases de T. */
(function(){
var I=[
 ["crisis",/suicid|matarme|quitarme la vida|no quiero vivir|hacerme da[ñn]o|no puedo m[aá]s|sin salida|me tuer|en finir|kill myself|end it all|self.?harm/],
 ["briefing",/briefing|buenos d[ií]as|despert|bonjour|matin|morning|wake/],
 ["rechazo",/rechaz|deneg|descart|no me han cogido|mala noticia|refus|rejet|reject|turned down|bad news/],
 ["recaida",/reca[ií]|he ca[ií]do|he jugado|videojueg|tiktok|anime|he fallado|la he cagado|rechut|craqu|relaps|slipped|gave in/],
 ["ganas",/ganas|pereza|motivaci|no me apetece|procrastin|envie|flemme|motivation|don.?t feel|lazy/],
 ["revisa",/revisa|c[oó]mo voy|mi d[ií]a|resumen|bilan|ma journ|review|how am i/],
 ["miedo",/miedo|no lo voy a conseguir|no valgo|fracas|ansiedad|agobi|bloquead|\bparo\b|peur|angoiss|[ée]chec|afraid|scared|anxi|fail|stuck/],
 ["cansado",/cansad|agotad|sin energ|dormi|sue[ñn]o|fatigu|[ée]puis|tired|exhaust|sleep/],
 ["logro",/he terminado|ya he hecho|conseguid|entrevista|oferta|j.?ai fini|r[ée]ussi|done|finished|offer|interview/],
 ["gracias",/gracias|merci|thanks|thank you/],
 ["hola",/^(hola|buenas|hey|salut|hello|hi)\b/]
];
var T={
es:{
 crisis:["Para. Lo que cuentas pesa más que cualquier racha, y hoy la exigencia se queda fuera. No lo cargues solo: llama ahora a alguien de confianza y dile lo mismo que me has escrito a mí. Si sientes que estás en peligro, llama al 112 (en Francia también al 3114, gratuito, día y noche). Yo soy un programa con frases escritas; tú necesitas una persona delante. Eso también es disciplina."],
 briefing:["En pie. Móvil lejos, luz en la cara, agua. {firstline}Después, {next}: {nmin} minutos. No negocies con la almohada: la primera victoria del día es pequeña y es tuya.","Buenos días. Tres cosas antes de pensar: móvil fuera, luz exterior, agua. {firstline}Hoy el mínimo son 120 minutos. Empieza por {next}.","Arriba. Quedan {eic} días para el EIC y cada mañana cuenta igual. {firstline}Luz, agua y a {next}. Ya."],
 briefing_tarde:["El briefing era por la mañana, pero el día no ha terminado. Llevas {min} minutos. Si quedan horas, entonces abres {next} y haces {nmin} minutos. Ahora."],
 rechazo:["Duele, y es normal que duela. No controlas su decisión. Controlas los próximos diez minutos. Pulsa «Golpe recibido», respira, camina y vuelve. Después, una candidatura más: la respuesta a un no es otro intento.","Un rechazo es información sobre un puesto, no un veredicto sobre ti. Hoy no decides tu valor; decides tu siguiente acción. Golpe recibido, diez minutos de calle, y luego {next}.","Lo siento. De verdad. Ahora el protocolo: nómbralo en una frase, respira largo, muévete. No abras TikTok ni un juego: ese es justo el momento que entrenamos. Luego, {nmin} minutos de {next}."],
 recaida:["Bien por decirlo. Sin drama: una caída es un dato, dos seguidas son un hábito. Dato registrado. ¿Qué la disparó: aburrimiento, un mal rato, el móvil a mano? Cambia eso una sola vez. Ahora, diez minutos de {next}.","Has caído y has vuelto a escribirme. Lo segundo importa más. No compenses con castigo: compensa con una acción. Si son menos de las 22:00, entonces {nmin} minutos de {next}. Y esta noche, revisión honesta.","Reconocerlo es responsabilidad, no debilidad. Desinstala o aleja lo que te ha hecho caer, ahora, antes de seguir leyendo. Después vuelve al bloque más corto."],
 ganas:["Las ganas no son un requisito. Si no tienes ganas, entonces haces solo diez minutos de {next}. Empieza. La motivación llega después de moverte, no antes.","No te pido ganas. Te pido diez minutos. Pon el temporizador en {next} y, si a los diez quieres parar, paras con la cabeza alta. Casi nunca querrás.","Nadie tiene ganas todos los días. Los que llegan trabajan igual. Móvil en otra habitación, {next}, diez minutos. Ya hablaremos después."],
 revisa_ok:["Llevas {min} minutos: mínimo cumplido. Racha de {streak}. Eso es trabajo real, no suerte. Lo que hagas ahora es ventaja. Te queda {next} si quieres rematar; si no, cierra el día con la revisión.","Bien. {min} minutos y la racha a salvo. No lo celebres de más ni lo desprecies: anótalo y decide la primera acción de mañana."],
 revisa_falta:["Llevas {min} minutos. Faltan {left} para tu mínimo. No es un juicio, es una cuenta. Si empiezas ahora con {next}, llegas. Empieza.","{min} de 120. Faltan {left}. Deja de mirar el número y abre {next}: {nmin} minutos. Luego me cuentas."],
 revisa_cero:["Hoy todavía no hay minutos. No pasa nada todavía, pero el día no se arregla pensando en él. Si lees esto, entonces abres {next} y haces diez minutos. Solo diez."],
 revisa_dom:["Domingo: hoy no se juzga. Haz la revisión de la semana, deja escrita la primera acción del lunes y descansa de verdad. Descansar también es parte del entrenamiento."],
 miedo:["El miedo dice que te importa. No lo discutas: trabaja con él al lado. Tienes un máster, un MBA y dos años de oficio; lo que falta es tiempo y volumen de intentos. Hoy controlas {nmin} minutos de {next}. Eso es todo lo que hay que ganar hoy.","Estar en paro tras un MBA no es un fracaso, es una fase, y las fases se cruzan por días. No resuelvas tu vida esta tarde. Resuelve la próxima hora: {next}. Y si el peso no afloja en días, cuéntaselo a alguien cercano; pedir apoyo es de fuertes.","Bloqueado no es parado: es mirar demasiado lejos. Baja la vista. Una tarea de dos minutos, la más pequeña de {next}. Hazla y vuelve."],
 cansado:["Si estás cansado de verdad, el plan cambia, no desaparece. Cuerpo suave al aire libre, el mínimo de 120 y a dormir pronto. El sueño es entrenamiento, no premio.","Cansancio y pereza se parecen. Prueba: diez minutos de {next}. Si a los diez sigues roto, bajas a mínimo y te acuestas temprano sin pantalla. Sin culpa."],
 logro:["Bien hecho. Sin fuegos artificiales: anótalo en la revisión y mira qué lo hizo posible para repetirlo. Siguiente: {next}.","Eso es. Así se construye, ladrillo a ladrillo. Respira un minuto, y luego {next}."],
 gracias:["A ti por presentarte. Sigue.","No hay de qué. El trabajo es tuyo. A por {next}."],
 hola:["Aquí estoy. Llevas {min} minutos hoy y racha de {streak}. Dime qué pasa o abre {next}."],
 def:["Te leo. Vamos a lo que controlas: ¿qué acción concreta puedes hacer en los próximos diez minutos? Si no lo tienes claro, entonces es {next}, {nmin} minutos.","Entendido. No hace falta que hoy lo resuelvas todo. Una acción, diez minutos, {next}. Después me cuentas cómo ha ido.","Dímelo más simple: ¿rechazo, tentación, cansancio o falta de ganas? Mientras lo piensas, pon el temporizador en {next}."],
 todo:"todo hecho por hoy",firstline:"Tu primera acción, decidida anoche: «{first}». "},
fr:{
 crisis:["Stop. Ce que tu écris compte plus que n'importe quelle série, et aujourd'hui l'exigence reste dehors. Ne porte pas ça seul : appelle maintenant quelqu'un de confiance. Si tu te sens en danger, appelle le 3114 (gratuit, jour et nuit) ou le 112. Je suis un programme avec des phrases écrites ; tu as besoin d'une vraie personne."],
 briefing:["Debout. Téléphone loin, lumière sur le visage, de l'eau. {firstline}Ensuite, {next} : {nmin} minutes. La première victoire de la journée est petite, et elle est à toi."],
 briefing_tarde:["Le briefing, c'était ce matin, mais la journée n'est pas finie. Tu as {min} minutes. Ouvre {next} et fais {nmin} minutes. Maintenant."],
 rechazo:["Ça fait mal, et c'est normal. Tu ne contrôles pas leur décision. Tu contrôles les dix prochaines minutes. Appuie sur « Golpe recibido », respire, marche et reviens. Ensuite, une candidature de plus.","Un refus est une information sur un poste, pas un verdict sur toi. Dix minutes dehors, puis {next}."],
 recaida:["Merci de le dire. Sans drame : une chute est une donnée, deux de suite sont une habitude. Qu'est-ce qui l'a déclenchée ? Change cette seule chose. Maintenant, dix minutes de {next}."],
 ganas:["L'envie n'est pas une condition. Si tu n'as pas envie, alors tu fais seulement dix minutes de {next}. Commence. La motivation vient après le mouvement, pas avant."],
 revisa_ok:["Tu as {min} minutes : minimum atteint, série de {streak}. C'est du vrai travail. Ferme la journée avec la révision."],
 revisa_falta:["Tu as {min} minutes. Il en manque {left}. Ce n'est pas un jugement, c'est un compte. Ouvre {next} : {nmin} minutes."],
 revisa_cero:["Pas encore de minutes aujourd'hui. On ne répare pas une journée en y pensant. Ouvre {next} et fais dix minutes. Seulement dix."],
 revisa_dom:["Dimanche : pas de jugement aujourd'hui. Fais le bilan de la semaine, écris la première action de lundi et repose-toi vraiment."],
 miedo:["La peur dit que ça compte pour toi. Ne discute pas avec elle : travaille à côté d'elle. Ne règle pas ta vie cet après-midi. Règle la prochaine heure : {next}. Et si le poids ne s'allège pas, parles-en à un proche."],
 cansado:["Si tu es vraiment fatigué, le plan change, il ne disparaît pas. Le minimum, puis au lit tôt, sans écran. Le sommeil fait partie de l'entraînement."],
 logro:["Bien joué. Note-le dans la révision et regarde ce qui l'a rendu possible. Suivant : {next}."],
 gracias:["Merci à toi d'être là. Continue."],
 hola:["Je suis là. {min} minutes aujourd'hui, série de {streak}. Dis-moi ce qui se passe ou ouvre {next}."],
 def:["Je te lis. Revenons à ce que tu contrôles : quelle action concrète dans les dix prochaines minutes ? Si tu ne sais pas, alors c'est {next}, {nmin} minutes."],
 todo:"tout est fait pour aujourd'hui",firstline:"Ta première action, décidée hier soir : « {first} ». "},
en:{
 crisis:["Stop. What you just wrote matters more than any streak, and today the standards stay outside. Don't carry this alone: call someone you trust right now. If you feel in danger, call 112 (in France also 3114, free, day and night). I am a program with written lines; you need a real person with you."],
 briefing:["Up. Phone away, light on your face, water. {firstline}Then {next}: {nmin} minutes. The first win of the day is small, and it is yours."],
 briefing_tarde:["The briefing was this morning, but the day is not over. You have {min} minutes. Open {next} and do {nmin} minutes. Now."],
 rechazo:["It hurts, and it should. You don't control their decision. You control the next ten minutes. Press “Golpe recibido”, breathe, walk, come back. Then one more application.","A rejection is information about one role, not a verdict on you. Ten minutes outside, then {next}."],
 recaida:["Good that you said it. No drama: one slip is data, two in a row is a habit. What triggered it? Change that one thing. Now, ten minutes of {next}."],
 ganas:["Feeling like it is not a requirement. If you don't feel like it, then you do just ten minutes of {next}. Start. Motivation shows up after you move, not before."],
 revisa_ok:["You have {min} minutes: minimum met, streak at {streak}. That is real work. Close the day with the review."],
 revisa_falta:["You have {min} minutes. {left} to go. It is not a judgment, it is a count. Open {next}: {nmin} minutes."],
 revisa_cero:["No minutes yet today. You don't fix a day by thinking about it. Open {next} and do ten minutes. Just ten."],
 revisa_dom:["Sunday: no judgment today. Do the weekly review, write down Monday's first action, and rest properly."],
 miedo:["Fear means it matters to you. Don't argue with it: work next to it. Don't solve your life this afternoon. Solve the next hour: {next}. And if the weight doesn't lift, tell someone close to you."],
 cansado:["If you are truly tired, the plan changes, it doesn't vanish. Hit the minimum, then early to bed, no screen. Sleep is part of training."],
 logro:["Well done. Log it in the review and note what made it possible. Next: {next}."],
 gracias:["Thank you for showing up. Keep going."],
 hola:["I'm here. {min} minutes today, streak at {streak}. Tell me what's going on or open {next}."],
 def:["I hear you. Back to what you control: what concrete action can you take in the next ten minutes? If you're not sure, then it is {next}, {nmin} minutes."],
 todo:"everything done for today",firstline:"Your first action, decided last night: “{first}”. "}
};
var n=0;
function pick(a){n++;return a[(n+new Date().getDate())%a.length]}
function reply(text,c,lang){
  var L=T[lang]||T.es,t=String(text||"").toLowerCase(),k="def";
  for(var i=0;i<I.length;i++){if(I[i][1].test(t)){k=I[i][0];break}}
  if(k==="briefing"&&c.hour>=13)k="briefing_tarde";
  if(k==="revisa")k=c.dow===0?"revisa_dom":c.minutes>=c.min?"revisa_ok":c.minutes>0?"revisa_falta":"revisa_cero";
  var p=c.pending.slice().sort(function(a,b){return a.left-b.left})[0];
  var out=pick(L[k]||L.def);
  return out.replace(/\{firstline\}/g,c.first?L.firstline:"")
    .replace(/\{first\}/g,c.first).replace(/\{left\}/g,Math.max(0,c.min-c.minutes)).replace(/\{min\}/g,c.minutes)
    .replace(/\{next\}/g,p?p.t:L.todo).replace(/\{nmin\}/g,p?Math.min(p.left,k==="ganas"?10:p.left):10)
    .replace(/\{streak\}/g,c.streak).replace(/\{eic\}/g,c.eic).replace(/\{clean\}/g,c.clean);
}
window.Mentor={reply:reply};
})();
