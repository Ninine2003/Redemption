/**
 * Netlify function : envoie une notification push à tous les abonnés.
 *
 * Méthode : POST ou GET
 * Protection : paramètre ?secret=ADMIN_SECRET (ou dans le body)
 *
 * Body JSON optionnel :
 *   { "secret": "...", "title": "...", "body": "...", "url": "/boutique.html" }
 *
 * Variables d'environnement Netlify requises :
 *   ADMIN_SECRET      — mot de passe admin pour déclencher l'envoi
 *   VAPID_PRIVATE_KEY — clé privée VAPID (base64url, 32 octets)
 *   VAPID_PUBLIC_KEY  — clé publique VAPID (base64url, 65 octets)  [optionnel si défaut ci-dessous]
 *   SUPABASE_URL      — URL de la base Supabase
 *   SUPABASE_SERVICE_KEY — clé service-role Supabase (pour lire push_subscriptions)
 */

const crypto = require("crypto");

const VAPID_PUBLIC_KEY_DEFAULT = "BC0_hV2-coQl7HMa4rB6I8U8zObPz12IZIkmtE9jLwaf8T5l8uwK0jA0SV8qc_ViDPckbaDZRGv8Q2JjKkFeUvU";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:kremekoreseau@gmail.com";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY_DEFAULT;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tSdbg0by8DZH635tdZdV9Q_OrHMvm5r";

exports.handler = async (event) => {
  // --- Auth ---
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const secret = event.queryStringParameters?.secret || body.secret || "";

  if (!ADMIN_SECRET) return json(500, { error: "ADMIN_SECRET not configured." });
  if (secret !== ADMIN_SECRET) return json(401, { error: "Unauthorized." });
  if (!VAPID_PRIVATE_KEY) return json(500, { error: "VAPID_PRIVATE_KEY not configured." });

  const title = body.title || "House of Redemption";
  const message = body.body || "Nouvelle mise à jour disponible.";
  const url = body.url || "/";
  const icon = body.icon || "/img/logo.jpg";

  // --- Lire les abonnements ---
  const subscriptions = await fetchSubscriptions();
  if (!subscriptions.length) {
    return json(200, { sent: 0, failed: 0, message: "Aucun abonné." });
  }

  let sent = 0;
  let failed = 0;
  const expired = [];

  for (const sub of subscriptions) {
    try {
      await sendPush(sub, { title, body: message, url, icon });
      sent++;
    } catch (err) {
      failed++;
      if (err.httpStatus === 404 || err.httpStatus === 410) {
        expired.push(sub.endpoint);
      }
    }
  }

  // Supprimer les abonnements expirés
  for (const endpoint of expired) {
    await deleteSubscription(endpoint);
  }

  return json(200, { sent, failed, expired: expired.length });
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchSubscriptions() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`,
      { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function deleteSubscription(endpoint) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
      }
    );
  } catch {}
}

// ─── Envoi d'un push ──────────────────────────────────────────────────────────

async function sendPush(subscription, payload) {
  const { endpoint, p256dh, auth } = subscription;
  const content = JSON.stringify(payload);

  const { body: ciphertext } = await encryptPayload(content, p256dh, auth);
  const jwt = await createVapidJwt(endpoint);
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body: ciphertext,
  });

  if (!res.ok) {
    const err = new Error(`Push HTTP ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
}

// ─── Chiffrement du payload (RFC 8291 + RFC 8188 aes128gcm) ──────────────────

function base64urlDecode(str) {
  const padded = str + "=".repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function base64urlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function hkdf(salt, ikm, info, length) {
  // RFC 5869 : extract then expand (1 bloc, longueur ≤ 32 octets)
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  const t = crypto.createHmac("sha256", prk)
    .update(Buffer.concat([Buffer.isBuffer(info) ? info : Buffer.from(info), Buffer.from([0x01])]))
    .digest();
  return t.slice(0, length);
}

async function encryptPayload(plaintext, p256dhBase64, authBase64) {
  // Générer la paire de clés éphémère côté serveur
  const ephemeral = crypto.createECDH("prime256v1");
  ephemeral.generateKeys();

  const serverPublicKeyBytes = ephemeral.getPublicKey(); // 65 octets, format non compressé
  const receiverPublicKeyBytes = base64urlDecode(p256dhBase64);
  const authSecret = base64urlDecode(authBase64);
  const salt = crypto.randomBytes(16);

  // Secret partagé ECDH
  const sharedSecret = ephemeral.computeSecret(receiverPublicKeyBytes);

  // Dériver IKM
  const ikm = hkdf(
    authSecret,
    sharedSecret,
    Buffer.concat([Buffer.from("WebPush: info\x00"), receiverPublicKeyBytes, serverPublicKeyBytes]),
    32
  );

  // Dériver CEK (16 octets) et Nonce (12 octets)
  const cek = hkdf(salt, ikm, "Content-Encoding: aes128gcm\x00", 16);
  const nonce = hkdf(salt, ikm, "Content-Encoding: nonce\x00", 12);

  // Chiffrement AES-128-GCM
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const paddedPlaintext = Buffer.concat([Buffer.from(plaintext, "utf8"), Buffer.from([0x02])]); // délimiteur de fin
  const encrypted = Buffer.concat([cipher.update(paddedPlaintext), cipher.final(), cipher.getAuthTag()]);

  // Construire le corps selon RFC 8188 (aes128gcm)
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const keyidLen = Buffer.from([serverPublicKeyBytes.length]);

  const body = Buffer.concat([salt, rs, keyidLen, serverPublicKeyBytes, encrypted]);
  return { body };
}

// ─── VAPID JWT (ES256) ────────────────────────────────────────────────────────

async function createVapidJwt(endpoint) {
  const origin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 86400;

  const header = base64urlEncode(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64urlEncode(
    Buffer.from(JSON.stringify({ aud: origin, exp, sub: VAPID_SUBJECT }))
  );
  const content = `${header}.${payload}`;

  // Reconstituer le JWK depuis la clé publique (x, y) et la clé privée (d)
  const pubBytes = base64urlDecode(VAPID_PUBLIC_KEY);
  const x = pubBytes.slice(1, 33).toString("base64");
  const y = pubBytes.slice(33, 65).toString("base64");
  const d = base64urlDecode(VAPID_PRIVATE_KEY).toString("base64");

  const privateKey = crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", d, x, y },
    format: "jwk",
  });

  // Signer en ES256 (ECDSA P-256 SHA-256)
  const signer = crypto.createSign("SHA256");
  signer.update(content);
  const derSig = signer.sign(privateKey);

  // Convertir DER → IEEE P1363 (R‖S, 32 octets chacun)
  const sig = derToP1363(derSig);
  return `${content}.${base64urlEncode(sig)}`;
}

function derToP1363(der) {
  // Structure DER : 30 [len] 02 [rLen] [r] 02 [sLen] [s]
  let offset = 2;
  offset += 1; // sauter le tag 0x02 de R
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  offset += 1; // sauter le tag 0x02 de S
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);

  // Supprimer l'octet de signe nul éventuel
  if (r[0] === 0x00) r = r.slice(1);
  if (s[0] === 0x00) s = s.slice(1);

  const result = Buffer.alloc(64);
  r.copy(result, 32 - r.length);
  s.copy(result, 64 - s.length);
  return result;
}

// ─── Utilitaire JSON response ─────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
