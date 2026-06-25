// Création d'une session de paiement Money Fusion.
// Le client envoie sa commande ; on construit le payload Money Fusion, on appelle
// l'API marchande, et on renvoie l'URL de paiement (où le client est redirigé).
//
// Variable d'environnement requise :
//   MONEYFUSION_API_URL  lien API marchand (ex: https://pay.moneyfusion.net/<slug>/<id>/pay/)

const MONEYFUSION_API_URL = process.env.MONEYFUSION_API_URL;
const SITE_URL = process.env.URL || "https://house-of-redemption.netlify.app";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!MONEYFUSION_API_URL) {
    return json(501, { error: "Money Fusion n'est pas configuré (MONEYFUSION_API_URL)." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Requête invalide" });
  }

  const reference = String(body.reference || "").trim().slice(0, 120);
  const customerName = String(body.customerName || "").trim().slice(0, 120) || "Client Redemption";
  const customerPhone = String(body.customerPhone || "").replace(/\s+/g, "").slice(0, 30);
  const items = Array.isArray(body.items) ? body.items : [];

  // Montant recalculé côté serveur à partir des articles (on ne fait pas confiance
  // au total envoyé par le client).
  const article = buildArticle(items);
  const totalPrice = article.reduce((sum, entry) =>
    sum + Object.values(entry).reduce((a, b) => a + (Number(b) || 0), 0), 0);

  if (!reference) return json(400, { error: "Référence manquante" });
  if (!customerPhone) return json(400, { error: "Numéro du client manquant" });
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return json(400, { error: "Montant invalide" });
  }

  const paymentData = {
    totalPrice,
    article,
    personal_Info: [{ orderId: reference }],
    numeroSend: customerPhone,
    nomclient: customerName,
    return_url: `${SITE_URL}/payment-success.html?ref=${encodeURIComponent(reference)}`,
    webhook_url: `${SITE_URL}/.netlify/functions/moneyfusion-webhook`,
  };

  let mfRes;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    mfRes = await fetch(MONEYFUSION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  } catch (err) {
    console.error("Money Fusion network error:", err);
    return json(502, { error: "Impossible de joindre Money Fusion." });
  }

  const data = await mfRes.json().catch(() => ({}));
  if (!mfRes.ok || !data.statut || !data.url) {
    console.error("Money Fusion refused:", mfRes.status, data);
    return json(mfRes.status === 200 ? 502 : mfRes.status, {
      error: data.message || "Money Fusion a refusé la requête.",
    });
  }

  return json(200, {
    url: data.url,
    token: data.token || "",
    amount: totalPrice,
  });
};

// Construit le champ `article` attendu par Money Fusion : un tableau contenant un
// objet { libellé: prix }. Les libellés en double sont suffixés pour rester uniques.
function buildArticle(items) {
  const entry = {};
  const seen = {};
  for (const item of items) {
    const price = Math.round(Number(item?.price) || 0);
    if (price <= 0) continue;
    let label = String(item?.name || "Article").trim().slice(0, 60) || "Article";
    if (seen[label]) {
      seen[label] += 1;
      label = `${label} (${seen[label]})`;
    } else {
      seen[label] = 1;
    }
    entry[label] = price;
  }
  if (!Object.keys(entry).length) entry["Commande Redemption"] = 0;
  return [entry];
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
