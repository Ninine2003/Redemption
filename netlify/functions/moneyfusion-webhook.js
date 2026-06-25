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

const { sendPaymentConfirmationEmail } = require("./lib/email");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// NB : le certificat TLS de Money Fusion ne couvre que pay.moneyfusion.net
// (PAS www.pay.moneyfusion.net), sinon erreur ERR_TLS_CERT_ALTNAME_INVALID.
const STATUS_API = "https://pay.moneyfusion.net/paiementNotif";

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
  console.log(`MoneyFusion webhook reçu — ref=${reference} statut="${authoritativeStatus}" -> ${newStatus || "pending(ignoré)"}`);
  if (!newStatus) {
    return { statusCode: 200, body: "Pending" };
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquante : impossible de mettre à jour la commande.");
    return { statusCode: 200, body: "No service key" };
  }

  // On récupère la ligne de paiement (statut actuel + infos client pour l'email).
  const payment = await fetchPayment(reference);

  // Idempotence : on ne réécrit pas (ni ne renvoie d'email) si déjà à jour.
  if (payment && payment.status === newStatus) {
    return { statusCode: 200, body: "No change" };
  }

  await updatePaymentStatus(reference, newStatus);
  console.log(`Paiement ${reference} mis à jour en base : ${newStatus}`);

  // Email de confirmation : uniquement sur un paiement réussi.
  if (newStatus === "succeeded" && payment) {
    const sent = await sendPaymentConfirmationEmail({
      email: payment.customer_email,
      firstName: payment.customer_first_name,
      reference,
      amount: payment.amount,
      items: Array.isArray(payment.items) ? payment.items : safeParseItems(payment.items),
    });
    console.log(`Email de confirmation pour ${reference} (${payment.customer_email || "sans email"}) : ${sent ? "envoyé" : "non envoyé"}`);
  }

  return { statusCode: 200, body: "OK" };
};

// Money Fusion renvoie l'identifiant de commande dans personal_Info[0].orderId.
function extractReference(payload) {
  const info = Array.isArray(payload?.personal_Info) ? payload.personal_Info[0] : null;
  return String(info?.orderId || "").trim();
}

// Traduit le statut Money Fusion vers notre modèle. On utilise "succeeded" pour
// un paiement réussi (cohérent avec le dashboard) et "failed" pour un échec.
// Renvoie null pour les états transitoires (pending) qui ne déclenchent rien.
function mapStatus(raw) {
  const value = String(raw || "").toLowerCase();
  if (value.includes("paid") || value.includes("success") || value.includes("completed")) {
    return "succeeded";
  }
  if (value.includes("fail") || value.includes("cancel") || value.includes("no paid") || value.includes("expired")) {
    return "failed";
  }
  return null;
}

// Récupère la ligne wave_payments (statut + infos client) pour l'idempotence et l'email.
async function fetchPayment(reference) {
  try {
    const res = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/wave_payments?reference=eq.${encodeURIComponent(reference)}&select=status,customer_email,customer_first_name,amount,items&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

async function updatePaymentStatus(reference, newStatus) {
  const validatedAt = newStatus === "succeeded" ? new Date().toISOString() : null;
  // orders.payment_status reste sur le vocabulaire du site (paid / failed).
  const orderPaymentStatus = newStatus === "succeeded" ? "paid" : "failed";

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
      body: JSON.stringify({ payment_status: orderPaymentStatus }),
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
      body: JSON.stringify({ status: newStatus, validated_at: validatedAt }),
    }
  );
}

function safeParseItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
