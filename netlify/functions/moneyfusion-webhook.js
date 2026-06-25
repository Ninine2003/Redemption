// Webhook Money Fusion : reçoit les notifications de paiement (payin.session.*),
// re-vérifie le statut réel auprès de l'API Money Fusion (on ne fait pas confiance
// au corps du webhook seul), puis met à jour la commande dans Supabase.
//
// Variables d'environnement requises :
//   SUPABASE_URL                URL du projet Supabase
//   SUPABASE_SERVICE_ROLE_KEY   clé secrète (contourne le RLS, jamais côté client)
//
// Money Fusion doit appeler cette fonction en POST :
//   https://<site>/.netlify/functions/moneyfusion-webhook

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STATUS_API = "https://www.pay.moneyfusion.net/paiementNotif";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const token = String(payload.tokenPay || "").trim();
  const reference = extractReference(payload);

  if (!token || !reference) {
    // Accusé de réception pour éviter que Money Fusion ne réémette à l'infini.
    console.warn("Money Fusion webhook sans token/orderId:", payload?.event);
    return { statusCode: 200, body: "Ignored" };
  }

  // Source de vérité : on interroge l'API Money Fusion avec le token reçu.
  let authoritativeStatus = String(payload.statut || payload.event || "").toLowerCase();
  try {
    const res = await fetch(`${STATUS_API}/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (data?.statut && data?.data?.statut) {
      authoritativeStatus = String(data.data.statut).toLowerCase();
    }
  } catch (err) {
    console.error("Money Fusion status check failed:", err);
    // On retombe sur l'info du webhook plutôt que d'échouer.
  }

  const newStatus = mapStatus(authoritativeStatus);
  if (!newStatus) {
    return { statusCode: 200, body: "Pending" };
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquante : impossible de mettre à jour la commande.");
    return { statusCode: 200, body: "No service key" };
  }

  // Idempotence : on ne réécrit pas si le statut est déjà à jour.
  const current = await getCurrentStatus(reference);
  if (current === newStatus) {
    return { statusCode: 200, body: "No change" };
  }

  await updatePaymentStatus(reference, newStatus, token);
  return { statusCode: 200, body: "OK" };
};

// Money Fusion renvoie l'identifiant de commande dans personal_Info[0].orderId.
function extractReference(payload) {
  const info = Array.isArray(payload?.personal_Info) ? payload.personal_Info[0] : null;
  return String(info?.orderId || "").trim();
}

// Traduit le statut Money Fusion vers notre modèle (paid / failed). Renvoie null
// pour les états transitoires (pending) qui ne déclenchent pas de mise à jour.
function mapStatus(raw) {
  const value = String(raw || "").toLowerCase();
  if (value.includes("paid") || value.includes("success") || value.includes("completed")) {
    return "paid";
  }
  if (value.includes("fail") || value.includes("cancel") || value.includes("no paid") || value.includes("expired")) {
    return "failed";
  }
  return null;
}

async function getCurrentStatus(reference) {
  try {
    const res = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/wave_payments?reference=eq.${encodeURIComponent(reference)}&select=status`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows[0] ? String(rows[0].status) : null;
  } catch {
    return null;
  }
}

async function updatePaymentStatus(reference, newStatus, token) {
  const paidAt = newStatus === "paid" ? new Date().toISOString() : null;

  await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/orders?wave_reference=eq.${encodeURIComponent(reference)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ payment_status: newStatus }),
    }
  );

  await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/wave_payments?reference=eq.${encodeURIComponent(reference)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: newStatus,
        validated_at: newStatus === "paid" ? paidAt : null,
      }),
    }
  );
}
