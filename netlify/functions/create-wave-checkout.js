exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.WAVE_API_KEY || process.env.WAVE_SECRET_KEY || "";
  if (!apiKey) {
    return json(501, { error: "Wave API key is not configured" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const amount = Math.round(Number(payload.amount || 0));
  const reference = String(payload.reference || "").slice(0, 120);
  const successUrl = String(payload.success_url || "");
  const errorUrl = String(payload.error_url || "");

  if (!amount || amount < 1 || !successUrl || !errorUrl) {
    return json(400, { error: "Missing checkout parameters" });
  }

  try {
    const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: "XOF",
        client_reference: reference,
        success_url: successUrl,
        error_url: errorUrl,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(response.status, { error: data.message || data.error || "Wave checkout failed" });
    }

    return json(200, data);
  } catch {
    return json(502, { error: "Wave checkout unavailable" });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
