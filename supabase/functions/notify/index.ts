// Ágoge — función `notify` (Supabase Edge Functions, Deno).
// La invoca pg_cron cada 10 minutos. Recorre las suscripciones de agoge_push y
// envía, como mucho una vez por día local y por tipo, tres avisos Web Push:
//   am    -> mañana       [am, am+60 min)
//   guard -> racha        [18:30, 19:30) si faltan minutos (no domingos)
//   pm    -> cierre       [pm, pm+60 min)
// Escrita en JavaScript puro (sin anotaciones de tipos) a propósito.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const TITLE = "Ágoge";
const MIN_DAY = 120; // minutos mínimos diarios
const WINDOW = 60; // duración de cada ventana, en minutos
const GUARD_START = 18 * 60 + 30; // 18:30
const MAX_BODY = 180;
const DEFAULT_TZ = "Europe/Paris";

// ---------------------------------------------------------------- utilidades

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// Fecha y hora locales en la zona horaria indicada.
function localNow(tz, now) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || DEFAULT_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch (_e) {
    return localNow(DEFAULT_TZ, now);
  }
  const p = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  const y = Number(p.year);
  const mo = Number(p.month);
  const d = Number(p.day);
  const hh = Number(p.hour) % 24;
  const mm = Number(p.minute);
  return {
    date: p.year + "-" + p.month + "-" + p.day,
    hhmm: pad(hh) + ":" + pad(mm),
    minutes: hh * 60 + mm,
    dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(), // 0 = domingo
    doy: Math.floor((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 86400000),
  };
}

// Suma (o resta) días a una fecha "YYYY-MM-DD".
function shiftDate(dateStr, delta) {
  const a = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(a[0], a[1] - 1, a[2] + delta));
  return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(t.getUTCDate());
}

function dowOf(dateStr) {
  const a = dateStr.split("-").map(Number);
  return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay();
}

// "HH:MM" -> minutos desde medianoche (o el valor por defecto si no es válido).
function parseHHMM(s, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return fallback;
  return h * 60 + mi;
}

// Minutos transcurridos desde el inicio de la ventana (admite cruce de medianoche).
function sinceStart(nowMin, startMin) {
  return (nowMin - startMin + 1440) % 1440;
}

function totalMinutes(data, dateStr) {
  const day = data && data.days ? data.days[dateStr] : null;
  if (!day || !day.m) return 0;
  let sum = 0;
  for (const k of Object.keys(day.m)) {
    const v = Number(day.m[k]);
    if (Number.isFinite(v) && v > 0) sum += v;
  }
  return Math.round(sum);
}

function pick(list, n) {
  return list[((n % list.length) + list.length) % list.length];
}

function clamp(text) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= MAX_BODY) return t;
  return t.slice(0, MAX_BODY - 1).trimEnd() + "…";
}

// Primera acción del día, lista para citar.
function firstAction(data) {
  let f = data && typeof data.first === "string" ? data.first.replace(/\s+/g, " ").trim() : "";
  if (!f) return "graba el vídeo";
  f = f.replace(/["«»]/g, "");
  if (f.length > 44) f = f.slice(0, 43).trimEnd() + "…";
  return "«" + f + "»";
}

// ------------------------------------------------------------------ mensajes

function morningBody(data, now) {
  const n = now.doy;

  if (now.dow === 0) {
    return clamp(pick([
      "Domingo. Hoy se descansa y se revisa la semana: qué funcionó, qué se corrige. Sin prisa, con honestidad.",
      "Día de descanso. Reserva un rato para la revisión semanal y deja decidida la primera acción del lunes.",
      "Domingo: recuperar también es disciplina. Luz, aire y la revisión de la semana. Lo demás puede esperar.",
      "Hoy no hay mínimo. Descansa de verdad y cierra la semana con su revisión. El lunes se empieza limpio.",
    ], n));
  }

  const f = firstAction(data);
  const yesterday = shiftDate(now.date, -1);
  let ack = "";
  // Solo se valora ayer si fue día de trabajo y la cuenta ya existía.
  if (data && dowOf(yesterday) !== 0 && typeof data.created === "string" && data.created <= yesterday) {
    if (totalMinutes(data, yesterday) >= MIN_DAY) {
      ack = pick(["Ayer cumpliste. ", "Ayer, hecho. ", "Buen trabajo ayer. ", "Ayer sumó. "], n);
    } else {
      ack = pick([
        "Ayer no salió; hoy se vuelve. ",
        "Ayer quedó corto. Sin drama: hoy se vuelve. ",
        "Lo de ayer ya pasó; hoy se vuelve. ",
        "Ayer no; hoy se vuelve. ",
      ], n);
    }
  }

  const core = pick([
    "Tu cofre del alba y la palabra de hoy te esperan. Ábrelos y luego móvil lejos. Lo primero: " + f + ".",
    "En pie. Abre Ágoge: cofre y palabra del día. Después, luz de la calle y " + f + ".",
    "Buenos días. El cofre se cierra pronto: ábrelo, lee la palabra de hoy y a por " + f + ".",
    "Hay una frase y un premio esperándote. Un minuto en Ágoge, luego luz y " + f + ".",
  ], n);

  return clamp(ack + core);
}

function guardBody(missing, now) {
  const n = now.doy;
  return clamp(pick([
    "Faltan " + missing + " min para el mínimo de hoy. Queda tiempo: un bloque ahora y la racha sigue en pie.",
    "Racha en juego: te faltan " + missing + " min. No hace falta un gran día, solo cerrar este. Empieza por diez.",
    "Aviso sereno: " + missing + " min pendientes para llegar a " + MIN_DAY + ". Elige un bloque y hazlo antes de cenar.",
    "Hoy aún no está ganado: faltan " + missing + " min. Tú decides cómo acaba. Un bloque, ahora.",
  ], n));
}

function eveningBody(data, dateStr, now) {
  const n = now.doy;
  const sunday = dowOf(dateStr) === 0;
  const day = data && data.days ? data.days[dateStr] : null;
  const revDone = !!(day && day.rev);
  const missing = sunday ? 0 : Math.max(0, MIN_DAY - totalMinutes(data, dateStr));

  if (sunday) {
    if (revDone) {
      return clamp(pick([
        "Semana cerrada. Descansa; mañana se empieza limpio.",
        "Domingo en orden. A dormir pronto: el lunes cuenta.",
        "Revisión hecha. Buen descanso.",
      ], n));
    }
    return clamp(pick([
      "Cierra la semana: revisión semanal y primera acción del lunes decidida. Diez minutos y a descansar.",
      "Antes de dormir: revisa la semana con honestidad y deja escrita la primera acción de mañana.",
      "Domingo noche. Falta el cierre: qué mantener, qué corregir y con qué empiezas el lunes.",
    ], n));
  }

  if (!revDone && missing > 0) {
    return clamp(pick([
      "Toca cerrar el día: revisión y primera acción de mañana. Te faltan " + missing + " min para el mínimo; si aún cabe un bloque, hazlo.",
      "Cierre del día pendiente. Faltan " + missing + " min para " + MIN_DAY + ". Suma lo que puedas, revisa y decide con qué empiezas mañana.",
      "Antes de dormir: revisión honesta y primera acción de mañana. Hoy faltan " + missing + " min; anótalo sin excusas ni castigo.",
      "El día no se cierra solo. " + missing + " min pendientes y la revisión por hacer. Hazte cargo y deja mañana decidido.",
    ], n));
  }

  if (!revDone) {
    return clamp(pick([
      "Mínimo cumplido. Falta cerrar: revisión del día y primera acción de mañana. Dos minutos.",
      "Hoy has cumplido. Remátalo: qué salió bien, qué se corrige y con qué empiezas mañana.",
      "Trabajo hecho. Queda el cierre: revisa el día y decide la primera acción de mañana.",
      "Buen día de trabajo. Ciérralo como toca: revisión y primera acción de mañana decidida.",
    ], n));
  }

  if (missing > 0) {
    return clamp(pick([
      "Día revisado, con " + missing + " min pendientes. Si cabe un bloque, hazlo; si no, mañana se vuelve.",
      "Revisión hecha. Faltaron " + missing + " min: queda anotado, sin drama. Mañana, primera acción a primera hora.",
      "Cierre hecho y " + missing + " min por debajo del mínimo. Aún puedes sumar; si no, descansa y mañana se vuelve.",
    ], n));
  }

  return clamp(pick([
    "Día cumplido y cerrado. Descansa.",
    "Hecho y revisado. Así se construye. A dormir.",
    "Mínimo cumplido, día cerrado. Buen trabajo.",
    "Orden cumplida. Mañana, otra vez.",
  ], n));
}

// --------------------------------------------------------------------- envío

async function send(row, tag, body) {
  const payload = JSON.stringify({ title: TITLE, body: body, tag: tag, url: "./" });
  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  await webpush.sendNotification(subscription, payload, { TTL: 3600, urgency: "high" });
}

// ------------------------------------------------------------------- handler

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "missing environment variables" }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Configuración: primero los secretos de la función; los que falten se leen de la
  // tabla privada agoge_secrets (sin políticas: solo la ve la clave service_role).
  const NAMES = ["CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  const cfg = {};
  for (const k of NAMES) cfg[k] = Deno.env.get(k) || "";
  if (NAMES.some((k) => !cfg[k])) {
    const sec = await supabase.from("agoge_secrets").select("name, value");
    if (!sec.error) {
      for (const r of sec.data || []) if (!cfg[r.name]) cfg[r.name] = r.value;
    }
  }

  if (!cfg.CRON_SECRET || req.headers.get("x-cron-secret") !== cfg.CRON_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!cfg.VAPID_PUBLIC_KEY || !cfg.VAPID_PRIVATE_KEY || !cfg.VAPID_SUBJECT) {
    return json({ error: "missing VAPID configuration" }, 500);
  }

  try {
    webpush.setVapidDetails(cfg.VAPID_SUBJECT.trim(), cfg.VAPID_PUBLIC_KEY.trim(), cfg.VAPID_PRIVATE_KEY.trim());
  } catch (e) {
    return json({ error: "invalid VAPID configuration: " + (e && e.message ? e.message : String(e)) }, 500);
  }

  const subs = await supabase.from("agoge_push").select("*");
  if (subs.error) return json({ error: subs.error.message }, 500);
  const rows = subs.data || [];

  // Estado de cada usuario con suscripción.
  const states = {};
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  if (userIds.length > 0) {
    const st = await supabase.from("agoge_state").select("user_id, data").in("user_id", userIds);
    if (st.error) return json({ error: st.error.message }, 500);
    for (const s of st.data || []) states[s.user_id] = s.data;
  }

  const instant = new Date();
  let sent = 0;
  let removed = 0;
  let checked = 0;
  const errors = [];

  for (const row of rows) {
    checked++;
    let gone = false;

    // Envía un aviso y marca el día; devuelve false si la suscripción ya no existe.
    const deliver = async (tag, column, dateStr, body) => {
      try {
        await send(row, tag, body);
        sent++;
        const patch = {};
        patch[column] = dateStr;
        const up = await supabase.from("agoge_push").update(patch).eq("endpoint", row.endpoint);
        if (up.error) errors.push(tag + ": " + up.error.message);
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) {
          gone = true;
          const del = await supabase.from("agoge_push").delete().eq("endpoint", row.endpoint);
          if (del.error) errors.push("delete: " + del.error.message);
          else removed++;
        } else {
          errors.push(tag + ": " + (code || "") + " " + (e && e.message ? e.message : String(e)));
        }
      }
    };

    try {
      const data = states[row.user_id] || null;
      const now = localNow(row.tz, instant);
      const amStart = parseHHMM(row.am, 7 * 60 + 15);
      const pmStart = parseHHMM(row.pm, 21 * 60 + 15);

      // --- mañana
      if (sinceStart(now.minutes, amStart) < WINDOW && row.last_am !== now.date) {
        await deliver("am", "last_am", now.date, morningBody(data, now));
      }

      // --- racha en peligro
      if (!gone && row.guard && now.dow !== 0 && row.last_guard !== now.date &&
          now.minutes >= GUARD_START && now.minutes < GUARD_START + WINDOW) {
        const missing = MIN_DAY - totalMinutes(data, now.date);
        if (missing > 0) {
          await deliver("guard", "last_guard", now.date, guardBody(missing, now));
        }
      }

      // --- cierre (si la ventana cruza la medianoche, el día que se cierra es el anterior)
      if (!gone && sinceStart(now.minutes, pmStart) < WINDOW) {
        const pmDate = now.minutes < pmStart ? shiftDate(now.date, -1) : now.date;
        if (row.last_pm !== pmDate) {
          await deliver("pm", "last_pm", pmDate, eveningBody(data, pmDate, now));
        }
      }
    } catch (e) {
      errors.push("row: " + (e && e.message ? e.message : String(e)));
    }
  }

  const summary = { sent: sent, removed: removed, checked: checked };
  if (errors.length > 0) summary.errors = errors.slice(0, 10);
  return json(summary, 200);
});
