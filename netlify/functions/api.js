const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tSdbg0by8DZH635tdZdV9Q_OrHMvm5r";

const READ_TABLES = {
  products: "is_active=eq.true",
  collections: "is_active=eq.true",
  incoming_products: "is_active=eq.true",
  site_videos: "status=eq.active",
  bestsellers: "is_active=eq.true",
};

// Tables où le site public peut INSÉRER ses soumissions (jamais lire/modifier).
// Les articles populaires (bestsellers) sont gérés par le dashboard via admin-api.
const WRITE_TABLES = new Set([
  "orders",
  "contact_messages",
  "newsletter_subscribers",
  "wave_payments",
  "abandoned_checkouts",
  "push_subscriptions",
]);

const memoryCache = new Map();
const MEMORY_TTL = 60 * 1000;

exports.handler = async (event) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(501, { error: "Supabase is not configured" }, "no-store");
  }

  if (event.httpMethod === "GET") return readTable(event);
  if (event.httpMethod === "POST") return writeRecord(event);
  return json(405, { error: "Method not allowed" }, "no-store");
};

async function readTable(event) {
  const table = String(event.queryStringParameters?.table || "").trim();
  const filter = READ_TABLES[table];
  if (!filter) return json(400, { error: "Unknown public table" }, "no-store");

  const cached = memoryCache.get(table);
  if (cached && Date.now() - cached.cachedAt < MEMORY_TTL) {
    return json(200, cached.data, publicCacheHeaders());
  }

  const query = new URLSearchParams({ select: "*", order: "created_at.desc" });
  const [field, value] = filter.split("=");
  query.set(field, value);

  const response = await supabaseFetch(`${table}?${query.toString()}`, { method: "GET" });
  const data = await response.json().catch(() => []);
  if (!response.ok) return json(response.status, { error: "Supabase read failed" }, "no-store");

  memoryCache.set(table, { cachedAt: Date.now(), data });
  return json(200, data, publicCacheHeaders());
}

async function writeRecord(event) {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" }, "no-store");
  }

  const table = String(body.type || "").trim();
  const payload = body.payload || {};
  if (!WRITE_TABLES.has(table)) return json(400, { error: "Unknown write table" }, "no-store");

  const response = await supabaseFetch(table, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: (table === "abandoned_checkouts" || table === "push_subscriptions") ? "resolution=merge-duplicates,return=minimal" : "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    return json(response.status, { error: error || "Supabase write failed" }, "no-store");
  }

  return json(200, { saved: true }, "no-store");
}

async function supabaseFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(options.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

function publicCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    "Netlify-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
  };
}

function json(statusCode, body, cacheControl) {
  const extraHeaders = typeof cacheControl === "string" ? { "Cache-Control": cacheControl } : cacheControl;
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
