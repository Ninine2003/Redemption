// Helpers de session admin signés (HMAC).
// Un token = base64url(JSON{ u, exp }) + "." + HMAC-SHA256(payload, secret).
// Aucun secret n'est exposé au navigateur : le cookie est HttpOnly et signé côté serveur.

const crypto = require("crypto");

const COOKIE_NAME = "redemption_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(input) {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Crée un token signé pour l'utilisateur donné.
function createToken(username, secret = getSecret(), ttlMs = SESSION_TTL_MS) {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET manquant");
  const body = base64url(JSON.stringify({ u: username, exp: Date.now() + ttlMs }));
  return `${body}.${sign(body, secret)}`;
}

// Vérifie un token : signature constante + expiration. Retourne le payload ou null.
function verifyToken(token, secret = getSecret()) {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(body, secret);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let data;
  try {
    data = JSON.parse(fromBase64url(body));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== "number" || Date.now() > data.exp) return null;
  return data;
}

// Lit le cookie de session dans l'en-tête Cookie (insensible à la casse).
function readSessionCookie(event) {
  const header = event.headers?.cookie || event.headers?.Cookie || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return "";
}

// Construit l'en-tête Set-Cookie (création ou suppression).
function buildSetCookie(token, { maxAgeSeconds } = {}) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ];
  if (typeof maxAgeSeconds === "number") attrs.push(`Max-Age=${maxAgeSeconds}`);
  return attrs.join("; ");
}

// Renvoie le payload de session valide à partir de la requête, sinon null.
function requireSession(event) {
  return verifyToken(readSessionCookie(event));
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  getSecret,
  createToken,
  verifyToken,
  readSessionCookie,
  buildSetCookie,
  requireSession,
};
