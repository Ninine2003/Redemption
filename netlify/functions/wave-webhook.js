const crypto = require("crypto");

const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const rawBody = event.body || "";

  if (WAVE_WEBHOOK_SECRET) {
    const header = event.headers["wave-signature"] || "";
    const parts = Object.fromEntries(
      header.split(",").map((part) => part.split("="))
    );
    const timestamp = parts.t;
    const receivedSig = parts.v1;

    if (!timestamp || !receivedSig) {
      return { statusCode: 401, body: "Missing signature" };
    }

    const age = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (age > 5 * 60 * 1000) {
      return { statusCode: 401, body: "Timestamp too old" };
    }

    const expected = crypto
      .createHmac("sha256", WAVE_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expected))) {
      return { statusCode: 401, body: "Invalid signature" };
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (payload.type === "checkout.session.completed") {
    const session = payload.data || {};
    const reference = session.client_reference;
    const status = session.payment_status;

    if (reference && SUPABASE_SERVICE_KEY) {
      await updateOrderPaymentStatus(reference, status, session.id);
    }
  }

  return { statusCode: 200, body: "OK" };
};

async function updateOrderPaymentStatus(reference, paymentStatus, checkoutId) {
  const newStatus = paymentStatus === "succeeded" ? "paid" : "failed";

  const body = JSON.stringify({
    payment_status: newStatus,
    wave_checkout_id: checkoutId,
    paid_at: newStatus === "paid" ? new Date().toISOString() : null,
  });

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
      body,
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
      body: JSON.stringify({ status: newStatus, wave_checkout_id: checkoutId }),
    }
  );
}
