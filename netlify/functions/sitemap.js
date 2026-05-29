const SITE_URL = "https://house-of-redemption.netlify.app";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tSdbg0by8DZH635tdZdV9Q_OrHMvm5r";
const SITEMAP_CACHE_TTL = 10 * 60 * 1000;
let sitemapCache = null;

exports.handler = async () => {
  if (sitemapCache && Date.now() - sitemapCache.cachedAt < SITEMAP_CACHE_TTL) {
    return xml(sitemapCache.body);
  }

  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${SITE_URL}/product.html`, priority: "0.8", changefreq: "daily" },
  ];

  const products = await fetchProducts();
  const productUrls = products.map((product) => ({
    loc: `${SITE_URL}/p/${encodeURIComponent(product.id || product.name)}`,
    priority: "0.9",
    changefreq: "daily",
    lastmod: product.created_at ? new Date(product.created_at).toISOString().slice(0, 10) : "",
  }));

  const urls = [...staticUrls, ...productUrls];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(renderUrl).join("\n")}
</urlset>
`;

  sitemapCache = { cachedAt: Date.now(), body };
  return xml(body);
};

async function fetchProducts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const query = new URLSearchParams({
    select: "id,name,created_at",
    is_active: "eq.true",
    order: "created_at.desc",
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/products?${query.toString()}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function renderUrl(item) {
  return `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    ${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ""}
    <changefreq>${escapeXml(item.changefreq)}</changefreq>
    <priority>${escapeXml(item.priority)}</priority>
  </url>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xml(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
    body,
  };
}
