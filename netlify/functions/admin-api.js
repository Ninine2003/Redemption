// API admin authentifiée : seule porte d'entrée pour lire/écrire les données sensibles.
// Exige une session admin valide (cookie signé) et utilise la clé service_role
// — jamais exposée au navigateur — pour parler à Supabase.
//
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_SESSION_SECRET (via lib/session)

const { requireSession } = require("./lib/session");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Tables que le dashboard est autorisé à manipuler.
const ALLOWED_TABLES = new Set([
  "orders",
  "products",
  "incoming_products",
  "collections",
  "site_videos",
  "contact_messages",
  "newsletter_subscribers",
  "wave_payments",
  "abandoned_checkouts",
  "bestsellers",
]);

// Colonnes autorisées pour cibler une ligne en update/delete (anti-injection).
const ALLOWED_ID_COLUMNS = new Set(["id", "reference", "email", "created_at"]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  if (!requireSession(event)) {
    return json(401, { ok: false, error: "Session admin requise." });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(501, { ok: false, error: "Supabase service_role non configuré sur le serveur." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Requête invalide" });
  }

  const action = String(body.action || "");
  const table = String(body.table || "");
  const payload = body.payload || {};
  const id = body.id;
  const idColumn = String(body.idColumn || "id");

  if (!ALLOWED_TABLES.has(table)) {
    return json(400, { ok: false, error: "Table non autorisée." });
  }
  if ((action === "update" || action === "delete") && !ALLOWED_ID_COLUMNS.has(idColumn)) {
    return json(400, { ok: false, error: "Colonne d'identifiant non autorisée." });
  }

  try {
    switch (action) {
      case "read":
        return await readTable(table);
      case "insert":
        return await insertRow(table, payload);
      case "update":
        return await updateRow(table, payload, idColumn, id);
      case "delete":
        return await deleteRow(table, idColumn, id);
      default:
        return json(400, { ok: false, error: "Action inconnue." });
    }
  } catch (err) {
    console.error("admin-api error:", err);
    return json(502, { ok: false, error: "Erreur serveur Supabase." });
  }
};

async function readTable(table) {
  const res = await supabaseFetch(`${table}?select=*&order=created_at.desc`, { method: "GET" });
  const data = await res.json().catch(() => []);
  if (!res.ok) return json(res.status, { ok: false, error: "Lecture Supabase échouée." });
  return json(200, { ok: true, data });
}

async function insertRow(table, payload) {
  const res = await supabaseFetch(table, {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return json(res.status, { ok: false, error: errorText(data) });
  return json(200, { ok: true, data });
}

async function updateRow(table, payload, idColumn, id) {
  if (id === undefined || id === null || id === "") {
    return json(400, { ok: false, error: "Identifiant manquant." });
  }
  const path = `${table}?${idColumn}=eq.${encodeURIComponent(id)}`;
  const res = await supabaseFetch(path, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return json(res.status, { ok: false, error: errorText(data) });
  return json(200, { ok: true, data });
}

async function deleteRow(table, idColumn, id) {
  if (id === undefined || id === null || id === "") {
    return json(400, { ok: false, error: "Identifiant manquant." });
  }
  const path = `${table}?${idColumn}=eq.${encodeURIComponent(id)}`;
  const res = await supabaseFetch(path, {
    method: "DELETE",
    headers: { prefer: "return=minimal" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return json(res.status, { ok: false, error: errorText(data) });
  }
  return json(200, { ok: true, data: null });
}

function supabaseFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      ...(options.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

function errorText(data) {
  if (!data) return "Écriture Supabase échouée.";
  return data.message || data.error || data.hint || "Écriture Supabase échouée.";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
