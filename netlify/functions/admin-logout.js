// Termine la session admin : remplace le cookie par un cookie vide expiré.

const { buildSetCookie } = require("./lib/session");

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": buildSetCookie("", { maxAgeSeconds: 0 }),
    },
    body: JSON.stringify({ ok: true }),
  };
};
