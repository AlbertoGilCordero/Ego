# Ágoge — guía de despliegue

App personal de hábitos y disciplina. Es una PWA: una web estática (GitHub Pages) que se instala en el móvil como una app, con Supabase para sincronizar datos y enviar avisos push a Android.

Tiempo total: unos 40 minutos. Los pasos B y C bastan para usarla; del D al H se añaden copia en la nube y notificaciones.

Los nombres de los menús de Supabase y GitHub cambian de vez en cuando: donde no coincidan exactamente, busca el equivalente más parecido.

---

## A. Qué hay en la carpeta

| Ruta | Qué es |
|---|---|
| `index.html`, `app.js` | La app (estructura y lógica) |
| `plan.js` | El contenido: misiones, rangos, retos, temario, mínimo diario |
| `citas.js`, `versiculos.js` | Citas de filósofos y versículos del día (más de 1.100 de cada) |
| `mentor.js` | Las frases de Méntor (reglas, sin IA) |
| `vendor/supabase.js` | Cliente de Supabase, incluido para no depender de servidores externos |
| `CLAUDE.md` | Notas para que Claude sepa dónde cambiar cada cosa |
| `sw.js` | Service worker: funcionamiento sin conexión y recepción de avisos |
| `manifest.webmanifest`, `icons/` | Lo que permite instalarla como app |
| `config.js` | **El único archivo que tendrás que editar** (3 valores) |
| `tools/vapid.html` | Generador de claves para las notificaciones |
| `supabase/schema.sql` | Tablas, seguridad y tarea programada |
| `supabase/functions/notify/index.ts` | Función que decide y envía los avisos |

Todos los archivos del frontend van en la **raíz** del repositorio, no dentro de una subcarpeta.

---

## B. Publicar la app (GitHub Pages)

1. En github.com: **+ → New repository**. Nombre, por ejemplo, `agoge`. Visibilidad **Public** (GitHub Pages gratis lo exige; el repositorio no contiene ningún dato tuyo). **Create repository**.
2. En el repositorio: **Add file → Upload files**. Arrastra todo el contenido de la carpeta (incluidas `icons/`, `tools/` y `supabase/`) y pulsa **Commit changes**. Comprueba que `index.html` queda en la raíz.
   - Alternativa con git: `git init && git add . && git commit -m "Ágoge" && git branch -M main && git remote add origin https://github.com/<usuario>/<repo>.git && git push -u origin main`
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
4. Espera 1–2 minutos. La app queda en `https://<usuario>.github.io/<repo>/`.

En este punto la app **ya funciona en modo local**: los datos se guardan en el teléfono, sin cuenta y sin notificaciones.

---

## C. Instalar en Android

1. Abre `https://<usuario>.github.io/<repo>/` en **Chrome**.
2. Menú **⋮ → "Instalar aplicación"** (en algunas versiones, "Añadir a pantalla de inicio" → "Instalar").
3. Ábrela siempre desde el icono de la pantalla de inicio.

---

## D. Supabase: proyecto, tablas y acceso

1. Crea una cuenta en supabase.com y pulsa **New project**. Elige una región de la UE (p. ej. *West EU (Paris)* o *Central EU (Frankfurt)*), define una contraseña de base de datos y guárdala. Tarda un par de minutos en crearse.
2. **SQL Editor → New query**. Pega **solo el BLOQUE 1** de `supabase/schema.sql` (desde el inicio hasta `FIN DEL BLOQUE 1`) y pulsa **Run**. Debe responder "Success. No rows returned".
3. **Authentication → Sign In / Providers → Email**: desactiva **Confirm email** y guarda. Así podrás crear tu cuenta en la app sin depender del correo de confirmación.
4. Copia dos valores (los usarás en el paso G):
   - **Project URL**: `https://<PROJECT-REF>.supabase.co` (en **Project Settings → Data API**, o en el botón **Connect** de la cabecera).
   - **Clave `anon` `public`**: en **Project Settings → API Keys**, pestaña **Legacy API Keys**. Es un texto largo que empieza por `eyJ...`. Usa esta y no la nueva `sb_publishable_...` (ver nota del paso F).
5. **Más adelante**, cuando ya hayas creado tu cuenta en la app (paso G): vuelve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**. Nadie más podrá registrarse en tu proyecto.

---

## E. Claves VAPID (identifican a tu servidor ante el servicio push)

1. Abre en tu propio dispositivo `https://<usuario>.github.io/<repo>/tools/vapid.html`.
2. La página genera un par de claves **en local** (no se envían a ningún sitio). Cópialas a un lugar seguro, por ejemplo tu gestor de contraseñas:
   - **Clave pública** → irá en `config.js` y también en los secretos de Supabase.
   - **Clave privada** → **solo** en los secretos de Supabase. Nunca en el repositorio.
3. No vuelvas a generar otras después: si cambias las claves, hay que reactivar los avisos en el teléfono.

---

## F. Función `notify`

1. En Supabase: **Edge Functions → Deploy a new function → Via Editor**.
2. Nombre de la función: `notify` (exacto, en minúsculas). Borra el código de ejemplo y pega el contenido completo de `supabase/functions/notify/index.ts`. Pulsa **Deploy function**.
3. **Edge Functions → Secrets** (puede variar ligeramente; a veces aparece como "Manage secrets"). Añade estos cuatro:

   | Nombre | Valor |
   |---|---|
   | `VAPID_PUBLIC_KEY` | la clave pública del paso E |
   | `VAPID_PRIVATE_KEY` | la clave privada del paso E |
   | `VAPID_SUBJECT` | `mailto:tu-correo@ejemplo.com` (con el prefijo `mailto:`) |
   | `CRON_SECRET` | una cadena larga y aleatoria, solo letras y números (40 caracteres o más) |

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase automáticamente: no los añadas.
4. Guarda el valor de `CRON_SECRET`: lo necesitas en el paso H.

**Nota sobre claves.** La función exige por defecto que la llamada lleve un JWT válido del proyecto; la clave `anon` heredada (`eyJ...`) lo es. Si tu proyecto solo ofrece claves nuevas (`sb_publishable_...`), abre la función → **Details / Settings** y desactiva **Verify JWT** (el nombre puede variar ligeramente). No pierde seguridad: la función rechaza todo lo que no lleve el `CRON_SECRET` correcto.

Alternativa con la CLI de Supabase: `supabase link --project-ref <PROJECT-REF> && supabase functions deploy notify && supabase secrets set CRON_SECRET=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...`

---

## G. Conectar la app

1. En GitHub abre `config.js` → icono del lápiz (**Edit this file**). Rellena los tres valores y pulsa **Commit changes**:
   - `supabaseUrl`: la Project URL del paso D.
   - `supabaseAnonKey`: la clave `anon public` del paso D.
   - `vapidPublicKey`: la clave **pública** del paso E.
2. Espera 1–2 minutos a que Pages vuelva a publicar (pestaña **Actions** del repositorio: marca verde).
3. En el teléfono, cierra la app del todo y vuelve a abrirla. Si no aparece la opción de cuenta, ciérrala y ábrela una segunda vez (la primera apertura descarga la versión nueva; la segunda la usa).
4. En la app: **Códice → Cuenta** → crea tu cuenta con correo y contraseña.
5. Pulsa **Activar avisos** y acepta el permiso de notificaciones de Android.
6. Ahora sí: desactiva los registros nuevos en Supabase (paso D.5).

Comprobación: en Supabase, **Table Editor** → `agoge_state` debe tener una fila y `agoge_push` otra.

---

## H. Programar los avisos y probarlos

1. Copia el **BLOQUE 2** de `supabase/schema.sql` en **SQL Editor → New query** y sustituye los tres marcadores:
   - `<PROJECT-REF>` → la parte de tu Project URL anterior a `.supabase.co`
   - `<ANON-KEY>` → la clave `anon public`
   - `<CRON_SECRET>` → el mismo valor que guardaste como secreto
2. Pulsa **Run**. A partir de ahí la función se ejecuta cada 10 minutos.

**Los avisos solo se envían dentro de su ventana horaria**, una vez al día cada uno:

| Aviso | Ventana (hora local del teléfono) |
|---|---|
| Mañana | desde la hora `am` (07:15 por defecto) durante 60 min |
| Racha en peligro | 18:30–19:30, solo si faltan minutos para los 120 y no es domingo |
| Cierre | desde la hora `pm` (21:15 por defecto) durante 60 min |

**Prueba rápida.** En los ajustes de avisos de la app, pon la hora de la mañana (`am`) a la hora actual y guarda. Después lanza la función a mano, de una de estas dos formas:

```bash
curl -i -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/notify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON-KEY>" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -d '{}'
```

```sql
select net.http_post(
  url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/notify',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <ANON-KEY>',
    'x-cron-secret', '<CRON_SECRET>'
  ),
  body    := '{}'::jsonb
);
-- La respuesta aparece unos segundos después aquí:
select status_code, content, error_msg from net._http_response order by created desc limit 3;
```

Respuesta esperada: `{"sent":1,"removed":0,"checked":1}` y la notificación en el teléfono. Con `"sent":0` la función va bien, pero estás fuera de ventana o ese aviso ya salió hoy. Para repetir la prueba el mismo día, vacía la marca: `update agoge_push set last_am = null;`. Al terminar, devuelve `am` a su hora real.

Para detener los avisos: `select cron.unschedule('agoge-notify');`

---

## I. Problemas frecuentes, privacidad y costes

**No llega la notificación**

1. **Ventana horaria**: fuera de ella no se envía nada, y cada aviso sale una sola vez al día (columnas `last_am`, `last_pm`, `last_guard` de `agoge_push`).
2. **Permiso**: Ajustes de Android → Aplicaciones → Ágoge (o Chrome) → Notificaciones: activadas. Revisa también el modo No molestar.
3. **Batería**: Ajustes → Aplicaciones → Chrome → Batería → **Sin restricciones**. En Xiaomi, Huawei, Oppo y algunos Samsung, el ahorro agresivo retrasa o elimina los avisos; permite también el inicio automático.
4. **Suscripción**: si `agoge_push` está vacía, pulsa de nuevo **Activar avisos**. La función borra sola las suscripciones caducadas (`"removed":1`).
5. **Registros de la función**: **Edge Functions → notify → Logs** e **Invocations**. Respuestas típicas:
   - `401 {"error":"unauthorized"}` → el `CRON_SECRET` de la llamada no coincide con el secreto.
   - `401` con mensaje sobre JWT → la clave del `Authorization` no es la `anon` heredada (ver nota del paso F).
   - `500 missing environment variables` → falta algún secreto del paso F.
   - Campo `errors` con `403` → la clave pública de `config.js` no es pareja de la privada de Supabase. Corrige y reactiva los avisos.
6. **La tarea no corre**: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;`

**La app no muestra los cambios**: ciérrala del todo y ábrela con conexión (carga siempre la última versión cuando hay red). Como último recurso, Ajustes → Aplicaciones → Ágoge → Almacenamiento → borrar datos; hazlo solo con la sincronización activa, porque sin ella se pierden los datos locales.

**Privacidad**

- La clave `anon` es pública por diseño y puede estar en el repositorio. Quien la tenga no puede leer nada: las políticas RLS limitan cada fila a su propietario con sesión iniciada.
- **Nunca** subas al repositorio la clave VAPID privada, la `service_role` ni el `CRON_SECRET`. Viven solo en Supabase.
- Con los registros nuevos desactivados (paso D.5), tu proyecto tiene un único usuario: tú.
- El texto de los avisos (incluida tu primera acción del día) pasa cifrado por el servicio push de Google; solo tu teléfono lo descifra.

**Costes**

- GitHub Pages y el plan gratuito de Supabase cubren de sobra este uso: unas 4.300 ejecuciones de la función al mes y una base de datos de pocos kilobytes.
- Supabase **pausa los proyectos gratuitos tras aproximadamente una semana sin actividad**. La tarea de cada 10 minutos genera actividad constante y debería evitarlo, pero no está garantizado: compruébalo durante las primeras semanas. Si recibes un correo de aviso de pausa, entra en el panel y pulsa **Restore project**; los datos se conservan.
- Mientras el proyecto esté pausado, la app sigue funcionando en local y sincroniza al volver.

---

## J. Conectar con Claude (para que Claude cambie la app sin pagar ninguna API)

La app no llama a Claude ni a ninguna IA: funciona sola. Claude interviene **desde fuera**, dentro de tu suscripción, de dos maneras:

1. **Cambiar la app (GitHub).** En Claude: **Ajustes → Conectores → GitHub**, conecta tu cuenta y da acceso al repositorio `agoge`. A partir de ahí puedes pedirle en un chat cosas como «sube Obra a 90 minutos», «añade una misión de lectura» o «cambia los retos de esta semana». Claude edita `plan.js` (contenido), `mentor.js` (frases) o `app.js` (estructura), hace el commit, GitHub Pages publica solo y la app se actualiza al abrirla con conexión.
2. **Leer tu progreso.** Dos opciones:
   - Sin configurar nada: en la app, **Códice → Claude → Copiar resumen** y pégalo en el chat.
   - Automático: si conectas Supabase a Claude desde los conectores (si está disponible en tu cuenta), Claude puede leer la tabla `agoge_state` directamente y también volver a desplegar la función `notify` cuando cambien los avisos.

Límites: Claude solo actúa cuando tú se lo pides en un chat; Méntor, dentro de la app, sigue siendo un conjunto de reglas. Los cambios en `supabase/functions/notify/index.ts` no se despliegan con el commit: hay que volver a pegarlos en Supabase (paso F) o hacerlo con el conector de Supabase.

---

## K. Tenerla como APK

El APK es una envoltura ligera: abre a pantalla completa la app publicada en GitHub Pages. No lleva la app dentro, así que **los cambios del repositorio llegan sin reinstalar**. Lo compila GitHub por ti (pestaña **Actions**); no hace falta instalar nada en tu ordenador.

Antes necesitas tener hechos los pasos B (app publicada) y, para los avisos, D–H.

1. **Guarda las claves.** Junto con este proyecto recibiste `agoge-release.jks`, `keystore_b64.txt` y `claves-apk.txt`. Guárdalos fuera del repositorio. **No los subas a GitHub.**
2. **Secretos de firma.** En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**, y crea dos:
   - `KEYSTORE_B64`: pega el contenido completo de `keystore_b64.txt`.
   - `KEYSTORE_PASSWORD`: la contraseña que aparece en `claves-apk.txt`.
3. **Comprueba que se subieron `android/` y `.github/workflows/apk.yml`.** Al arrastrar carpetas, algunos sistemas ocultan las que empiezan por punto. Si `.github` no está, créalo a mano: **Add file → Create new file**, escribe como nombre `.github/workflows/apk.yml` y pega el contenido del archivo.
4. **Compila.** Pestaña **Actions → Construir APK → Run workflow**. Tarda unos 3–5 minutos. Si falla, copia el error del registro y pásaselo a Claude.
5. **Instala.** En el móvil, abre la página del repositorio → **Releases → Ágoge APK → agoge.apk**. Android pedirá permiso para instalar apps desde el navegador: acéptalo. Abre Ágoge, entra con tu cuenta (Códice → Cuenta) y activa los avisos.
6. **Quitar la barra de dirección (recomendado).** Sin este paso la app funciona, pero muestra arriba una barra con la dirección web. Para que Android confíe en que la web es tuya:
   - Crea otro repositorio público llamado exactamente `TU-USUARIO.github.io`.
   - Sube dentro el contenido de la carpeta `para-repo-usuario/` de este proyecto: el archivo `.nojekyll` y `.well-known/assetlinks.json`. Si la carpeta con punto no se sube al arrastrar, créala con **Add file → Create new file** escribiendo `.well-known/assetlinks.json` y pegando el contenido.
   - Activa Pages en ese repositorio (Settings → Pages → rama `main`).
   - Comprueba que `https://TU-USUARIO.github.io/.well-known/assetlinks.json` se abre en el navegador. Después, cierra y abre la app; puede tardar unos minutos (o requerir reinstalar el APK) hasta que desaparezca la barra.

Notas:
- El APK necesita **Chrome** instalado en el teléfono: lo usa por dentro, y por eso funcionan las notificaciones y el modo sin conexión.
- Si ya tenías la app instalada desde Chrome (paso C), desinstala esa versión para no tener dos iconos. Tus datos se recuperan al entrar con tu cuenta.
- Solo hay que recompilar el APK si cambia algo de `android/`. Para todo lo demás (contenido, citas, lógica) basta el commit.

