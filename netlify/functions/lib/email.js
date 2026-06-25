// Envoi d'emails transactionnels via Brevo (ex-Sendinblue).
//
// Variables d'environnement requises :
//   BREVO_API_KEY        clé API Brevo (https://app.brevo.com > SMTP & API)
//   BREVO_SENDER_EMAIL   email expéditeur vérifié dans Brevo
//   BREVO_SENDER_NAME    nom affiché (défaut: House of Redemption)

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "House of Redemption";

// Envoie l'email de confirmation de paiement au client.
// Renvoie true si l'email part, false sinon (sans jamais lever d'exception :
// un échec d'email ne doit pas casser le webhook de paiement).
async function sendPaymentConfirmationEmail({ email, firstName, reference, amount, items = [] }) {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.warn("Brevo non configuré (BREVO_API_KEY / BREVO_SENDER_EMAIL manquant) — email ignoré.");
    return false;
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.warn("Email client absent ou invalide — email de confirmation ignoré.");
    return false;
  }

  const name = String(firstName || "").trim() || "cher client";
  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email, name: String(firstName || "").trim() || email }],
    subject: "Paiement confirmé — House of Redemption",
    htmlContent: buildHtml({ name, reference, amount, items }),
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Brevo a refusé l'email:", res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Erreur réseau Brevo:", err);
    return false;
  }
}

function buildHtml({ name, reference, amount, items }) {
  const safeAmount = Number(amount || 0).toLocaleString("fr-FR");
  const itemsRows = (Array.isArray(items) ? items : [])
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;color:#2C3A33;font-size:14px;">${escapeHtml(item.name || "Article")}</td>
        <td style="padding:8px 0;color:#0E7A56;font-size:14px;text-align:right;font-weight:600;">${Number(item.price || 0).toLocaleString("fr-FR")} FCFA</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,26,21,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0B1A14,#0E7A56);padding:34px 36px;text-align:center;">
            <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:3px;">HOUSE OF REDEMPTION</div>
            <div style="color:#C9A227;font-size:13px;letter-spacing:2px;margin-top:6px;">PAIEMENT CONFIRMÉ</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <div style="width:64px;height:64px;border-radius:50%;background:#E7F6EF;color:#0E7A56;font-size:34px;line-height:64px;text-align:center;margin:0 auto 20px;">&#10003;</div>
            <h1 style="margin:0 0 14px;color:#0F1A15;font-size:21px;text-align:center;">Merci ${escapeHtml(name)} !</h1>
            <p style="margin:0 0 18px;color:#2C3A33;font-size:15px;line-height:1.7;text-align:center;">
              Votre paiement a bien été <strong style="color:#0E7A56;">effectué avec succès</strong>.
              Un livreur vous contactera <strong>dans les 24 heures</strong> pour organiser la livraison de votre commande.
            </p>
            ${
              itemsRows
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EEF4F0;border-bottom:1px solid #EEF4F0;margin:18px 0;">
                    ${itemsRows}
                  </table>`
                : ""
            }
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;">
              <tr>
                <td style="color:#6B7C74;font-size:15px;">Total payé</td>
                <td style="color:#0F1A15;font-size:18px;font-weight:800;text-align:right;">${safeAmount} FCFA</td>
              </tr>
            </table>
            ${reference ? `<p style="margin:14px 0 0;color:#6B7C74;font-size:12px;text-align:center;">Référence : ${escapeHtml(reference)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#0B1A14;padding:22px 36px;text-align:center;">
            <p style="margin:0;color:#A9B7B0;font-size:12px;line-height:1.6;">
              House of Redemption — Streetwear chrétien premium · Abidjan, Côte d'Ivoire<br />
              Merci pour votre confiance. 🙏
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = { sendPaymentConfirmationEmail };
