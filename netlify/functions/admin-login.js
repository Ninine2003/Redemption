// Authentification admin : vérifie identifiant + mot de passe et délivre un cookie de session signé.
// Aucun identifiant n'est stocké dans le code livré au navigateur.
//
// Variables d'environnement requises :
//   ADMIN_USERNAME        identifiant admin
//   ADMIN_PASSWORD_HASH   SHA-256 (hex) du mot de passe — jamais le mot de passe en clair
//   ADMIN_SESSION_SECRET  clé secrète pour signer les sessions (chaîne aléatoire longue)

const crypto = require("crypto");
const { createToken, buildSetCookie, getSecret, SESSION_TTL_MS } = require("./lib/session");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").toLowerCase();

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !getSecret()) {
    return json(501, { error: "Authentification admin non configurée sur le serveur." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Requête invalide" });
  }

  const username = String(body.username || "");
  const password = String(body.password || "");

  const userOk = safeEqual(username, ADMIN_USERNAME);
  const passOk = safeEqual(sha256Hex(password), ADMIN_PASSWORD_HASH);

  // On évalue toujours les deux comparaisons pour limiter les fuites de timing.
  if (!userOk || !passOk) {
    return json(401, { error: "Identifiants incorrects." });
  }

  const token = createToken(ADMIN_USERNAME);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": buildSetCookie(token, { maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) }),
    },
    body: JSON.stringify({ ok: true }),
  };
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
