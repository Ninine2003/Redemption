const { SocksProxyAgent } = require("socks-proxy-agent");
const fetch = require("node-fetch");

const WAVE_API_KEY = process.env.WAVE_API_KEY;
const WAVE_PROXY_URL = process.env.QUOTAGUARD_URL; // socks5://user:pass@proxy.quotaguard.com:1080
const WAVE_API_URL = "https://api.wave.com/v1/checkout/sessions";
const SITE_URL = process.env.URL || "https://house-of-redemption.netlify.app";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  if (!WAVE_API_KEY) {
    return respond(501, { error: "Wave API key not configured" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const { amount, reference, successUrl, errorUrl } = body;

  if (!amount || !reference) {
    return respond(400, { error: "amount and reference are required" });
  }

  const amountInt = Math.round(Number(amount));
  if (!Number.isFinite(amountInt) || amountInt <= 0) {
    return respond(400, { error: "Invalid amount" });
  }

  const success = successUrl || `${SITE_URL}/payment-success.html?ref=${encodeURIComponent(reference)}`;
  const error = errorUrl || `${SITE_URL}/payment-error.html?ref=${encodeURIComponent(reference)}`;

  // Passe par le proxy SOCKS5 si configuré (IP fixe pour Wave whitelist).
  const agent = WAVE_PROXY_URL ? new SocksProxyAgent(WAVE_PROXY_URL) : undefined;

  let waveRes;
  try {
    waveRes = await fetch(WAVE_API_URL, {
      method: "POST",
      agent,
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(amountInt),
        currency: "XOF",
        success_url: success,
        error_url: error,
        client_reference: reference,
      }),
    });
  } catch (err) {
    console.error("Wave API network error:", err);
    return respond(502, { error: "Could not reach Wave API" });
  }

  const data = await waveRes.json().catch(() => ({}));

  if (!waveRes.ok) {
    console.error("Wave API error:", waveRes.status, data);
    return respond(waveRes.status, {
      error: data.message || data.error || "Wave API refused the request",
    });
  }

  return respond(200, {
    checkout_id: data.id,
    wave_url: data.wave_launch_url,
  });
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
