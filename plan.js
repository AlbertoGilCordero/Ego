/* PLAN DE ÁGOGE — el contenido de la app. Este es el archivo que se edita para cambiar
   misiones, rangos, retos semanales, temario, fecha objetivo o el mínimo diario.
   No contiene lógica: app.js lo lee al arrancar. */
(function(){
var RANKS=[["Neófito",0],["Efebo",150],["Hoplita",400],["Lochagós",800],["Taxiarca",1400],["Estratego",2200],["Polemarca",3300],["Arconte",4800],["Héroe",6800],["Olímpico",9500]];
var M={
 cuerpo:{t:"Cuerpo",d:"Correr, fuerza o caminar rápido. Al aire libre si puedes.",xp:20,base:[20,30,40]},
 /* kind:"count" = se cuenta en unidades (páginas), no en minutos. kind:"notes" = n apuntes de texto. */
 lectura:{t:"Lectura",d:"Abre Códice y lee. Papel o pantalla, pero sin saltar a otra app.",xp:25,kind:"count",unit:"pág",step:5,base:[10,15,20]},
 pulso:{t:"Pulso",d:"Lee Pulso y después, sin mirar, anota tres noticias de memoria. Serán el tema de tu vídeo.",xp:25,kind:"notes",n:3,base:[3,3,3]},
 voz:{t:"Voz",d:"Vídeo privado de 2–3 minutos.",xp:25,base:[10,10,10]},
 oficio:{t:"Oficio",d:"Búsqueda de empleo: candidaturas, seguimiento, contactos.",xp:40,base:[60,75,90]},
 obra:{t:"Obra",d:"RenU: propuesta EIC. Trabajo profundo, móvil fuera.",xp:40,base:[60,75,90]},
 capital:{t:"Capital",d:"Finanzas e inversión.",xp:30,base:[30,45,60]}
};
var ORDER=["cuerpo","lectura","pulso","voz","oficio","obra","capital"];
var FIN=["Leer una cuenta de resultados","Balance y flujo de caja","Ratios: margen, ROCE, deuda","Valor del dinero en el tiempo y WACC","DCF: proyectar flujos","DCF: valor terminal y sensibilidades","Múltiplos y comparables","Modela una empresa real que conozcas","LBO: la lógica y las fuentes y usos","LBO: construir el modelo","Turnaround: diagnóstico y plan de 100 días","Caso completo y presentación de 5 minutos"];
var PROMPTS=["Explica un concepto financiero que aprendiste ayer.","Presenta RenU en 2 minutos a un inversor.","Cuenta tu mayor logro en Sidel con cifras.","Explica por qué la red eléctrica necesita inercia.","Responde: ¿por qué deberíamos contratarte?","Resume una noticia de energía de esta semana y da tu opinión.","Explica qué harías en tus primeros 90 días en un puesto nuevo.","Cuenta un fracaso y qué cambiaste después.","Explica el ciclo del combustible nuclear a un niño de 12 años.","Defiende una decisión difícil que tomaste."];
var AGON=[["Enviar 3 candidaturas","Escribir 1 página del EIC","Terminar 1 modelo en Excel"],["Tener 2 cafés o llamadas con contactos","Cerrar la idea central del EIC en 5 frases","Ver 3 vídeos tuyos y anotar 1 mejora"],["Enviar 3 candidaturas","Borrador de 3 páginas del EIC","Explicar un DCF en vídeo sin notas"],["Pedir feedback a 1 persona sobre el EIC","Hacer 1 simulación de entrevista","Leer 1 capítulo de finanzas y resumirlo"]];
var EIC=new Date(2027,1,25);
var MIN_DAY=120;
var CODICE=[
   ["Por qué un mínimo de 2 horas","Los hábitos sobreviven por los días malos, no por los buenos. Un mínimo claro evita el «ya da igual» después de fallar. <small>Base: investigación sobre formación de hábitos y el efecto de violación de la abstinencia (Marlatt). Evidencia sólida.</small>"],
   ["Si X, entonces Y","Decidir de antemano cuándo y dónde harás algo duplica o triplica la probabilidad de hacerlo. Por eso la revisión de la noche te pide la primera acción de mañana. <small>Intenciones de implementación (Gollwitzer). Evidencia muy sólida.</small>"],
   ["Luz y nada de móvil al despertar","La luz exterior por la mañana ancla tu reloj interno y mejora el sueño de la noche. Empezar el día con el móvil te mete en modo reactivo justo en tu punto débil. <small>La luz como sincronizador circadiano está bien establecida; los minutos exactos son orientativos.</small>"],
   ["Golpe recibido","Poner nombre a lo que sientes baja su intensidad. Exhalar largo calma el cuerpo en minutos. Moverte corta la rumiación. Después, una acción pequeña te devuelve el control. <small>Etiquetado afectivo (Lieberman) y respiración con exhalación prolongada (Balban, 2023). Evidencia moderada.</small>"],
   ["Tentación","Las ganas suben, tocan techo y bajan solas en 10–20 minutos si no las alimentas. Observarlas sin obedecer es una habilidad que se entrena. <small>«Urge surfing» (Marlatt, Bowen). Evidencia moderada-buena.</small>"],
   ["Explicar para aprender","Explicar en voz alta lo que estudiaste obliga a recuperarlo de memoria, y eso fija más que releer. El vídeo diario une estudio y comunicación. <small>Práctica de recuperación (Roediger y Karpicke). Evidencia muy sólida.</small>"],
   ["Bloques de 60–90 minutos","La atención profunda aguanta ciclos de más o menos una hora y media. Empiezas en 60 y subes con tu rango: carga progresiva, como en el entrenamiento físico. <small>Orientativo; lo importante es una sola tarea y el móvil fuera de la vista.</small>"],
   ["Rachas, escudos y rangos","Ver tu progreso y no querer romper la cadena motiva de verdad. Los escudos existen para que un tropiezo no lo tire todo: un fallo es un dato, dos seguidos son un hábito. <small>Seguimiento del progreso y metas flexibles. Evidencia buena.</small>"],
   ["Lo que no prometo","Ninguna app cambia una vida sola. Los «detox de dopamina» y muchos protocolos de moda tienen poca evidencia. Aquí solo hay lo que funciona razonablemente: sueño, luz, movimiento, planes concretos, constancia y honestidad contigo."]
  ];
/* Cofre del alba: premio grande si abres la app antes de `before`; pequeño hasta `late`; `week` = extra por 7 albas seguidas. */
var DAWN={before:8,late:12,week:50};
window.AGOGE_PLAN={dawn:DAWN,ranks:RANKS,missions:M,order:ORDER,fin:FIN,prompts:PROMPTS,agon:AGON,deadline:EIC,minDay:MIN_DAY,codice:CODICE};
})();
