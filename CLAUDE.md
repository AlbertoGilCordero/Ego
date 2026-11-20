# Ágoge — notas para Claude

App personal de Alberto (PWA en GitHub Pages + Supabase). Sin IA dentro de la app: Claude solo interviene desde fuera, editando este repositorio o leyendo la base de datos, cuando Alberto lo pide.

## Dónde se cambia cada cosa
- `plan.js` — CONTENIDO: rangos y XP, misiones (título, descripción, xp, minutos por nivel `base:[t0,t1,t2]`), `order`, temario de finanzas (`fin`, 12 semanas), temas de vídeo (`prompts`), retos semanales (`agon`, grupos de 3), fecha objetivo (`deadline`), mínimo diario (`minDay`), textos del Códice. La mayoría de ajustes del plan se hacen SOLO aquí.
- `citas.js` y `versiculos.js` — más de 1.100 citas y 1.100 versículos. Baraja sin repetición: `S.seed` fija el orden y `S.word.n` avanza solo los días en que se abre la app. Añadir siempre al FINAL; no borrar ni reordenar. El cofre del alba se ajusta en `plan.js` → `dawn`.
- `mentor.js` — frases de Méntor por intención e idioma (es/fr/en). Reglas, no IA.
- `app.js` — lógica (estado, racha, temporizador, protocolos, cuenta, avisos). Tocar solo para cambios de estructura.
- `index.html` — estructura y CSS (paleta de mármol gris; no cambiar el estilo sin que lo pida).
- `sw.js` — caché y push. Si se añaden archivos nuevos a la app, añadirlos a `SHELL` y subir `CACHE` de versión.
- `supabase/functions/notify/index.ts` — textos y horarios de los avisos. Cambiarlo en el repo NO lo despliega: hay que volver a pegarlo en Supabase (o desplegar con el conector de Supabase).

## Reglas
- Estado: un único JSON `S` (`v:1`) en localStorage y en `agoge_state.data`. No romper la forma: si se añade un campo, que sea opcional y con valor por defecto al leer. Si se quita una misión de `order`, los minutos antiguos quedan en `days[fecha].m` y no se borran.
- Nunca subir al repo la clave privada VAPID, la `service_role` ni `CRON_SECRET`.
- Publicar = commit en `main`; GitHub Pages redepliega solo y la app se actualiza al abrirla con red.
- Para leer el progreso: tabla `public.agoge_state` (conector de Supabase) o el botón «Copiar resumen» del Códice.
- `android/` + `.github/workflows/apk.yml` — APK (Trusted Web Activity, paquete `app.agoge.twa`) que abre la web de Pages. Lo compila GitHub Actions y lo publica en la release `apk`. Firma con los secretos `KEYSTORE_B64`/`KEYSTORE_PASSWORD`; la huella está en `para-repo-usuario/.well-known/assetlinks.json`, que debe servirse desde el repo `<usuario>.github.io`. El APK no se recompila para cambios de contenido.
