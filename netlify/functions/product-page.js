const SITE_URL = "https://house-of-redemption.netlify.app";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tSdbg0by8DZH635tdZdV9Q_OrHMvm5r";
const PRODUCT_CACHE_TTL = 5 * 60 * 1000;
const productCache = new Map();
const pendingProducts = new Map();

exports.handler = async (event) => {
  const id = getProductIdFromEvent(event);

  if (!id) {
    return html(400, renderMissingPage("Lien produit incomplet", "Ce lien produit House of Redemption est incomplet."));
  }

  try {
    const product = await fetchProduct(id);
    if (!product) {
      return html(404, renderMissingPage("Produit introuvable", "Ce produit n'est plus disponible ou son lien a change."));
    }

    return html(200, renderProductPage(product));
  } catch {
    return html(502, renderMissingPage("Produit temporairement indisponible", "La fiche produit sera de nouveau accessible dans quelques instants."));
  }
};

function getProductIdFromEvent(event) {
  const queryId = String(event.queryStringParameters?.id || "").trim();
  if (queryId) return queryId;

  const candidates = [event.rawUrl, event.path, event.headers?.referer, event.headers?.referrer]
    .filter(Boolean);

  for (const candidate of candidates) {
    const id = getProductIdFromUrl(candidate);
    if (id) return id;
  }

  return "";
}

function getProductIdFromUrl(value) {
  try {
    const parsed = new URL(value, SITE_URL);
    const queryId = parsed.searchParams.get("id");
    if (queryId) return String(queryId).trim();
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "p" && pathParts[1]) return decodeURIComponent(pathParts[1]);
  } catch {
    const match = String(value || "").match(/\/p\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return "";
}

async function fetchProduct(id) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const cacheKey = String(id || "").trim();
  const cached = productCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < PRODUCT_CACHE_TTL) return cached.product;
  if (pendingProducts.has(cacheKey)) return pendingProducts.get(cacheKey);

  const request = fetchProductFromSupabase(cacheKey)
    .then((product) => {
      productCache.set(cacheKey, { cachedAt: Date.now(), product });
      return product;
    })
    .finally(() => pendingProducts.delete(cacheKey));

  pendingProducts.set(cacheKey, request);
  return request;
}

async function fetchProductFromSupabase(id) {
  const query = new URLSearchParams({
    select: "*",
    is_active: "eq.true",
    limit: "1",
  });

  if (isUuid(id)) {
    query.set("id", `eq.${id}`);
  } else {
    query.set("name", `eq.${id}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/products?${query.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) return null;
  const products = await response.json();
  return Array.isArray(products) ? products[0] : null;
}

function renderProductPage(product) {
  const productName = formatProductName(product);
  const price = Math.max(Number(product.price || 0), 0);
  const description = truncateMeta(
    cleanMetaText(product.description || `${productName} House of Redemption disponible a la commande a Abidjan.`),
    155
  );
  const productPath = `/p/${encodeURIComponent(product.id || product.name)}`;
  const productUrl = `${SITE_URL}${productPath}`;
  const orderUrl = `${SITE_URL}/product.html?id=${encodeURIComponent(product.id || product.name)}`;
  const image = absoluteUrl(getProductImages(product)[0] || "img/logo.jpg");
  const category = product.category_label || formatCategory(product.category);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: productName,
    description,
    image: [image],
    sku: String(product.id || product.name || productName),
    brand: { "@type": "Brand", name: "House of Redemption" },
    category,
    color: product.color || undefined,
    size: parseProductSizes(product.sizes).join(", ") || undefined,
    url: productUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "XOF",
      price: String(price),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: productUrl,
      seller: { "@type": "Organization", name: "House of Redemption" },
    },
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#183d23" />
  <meta name="meta-pixel-id" content="REPLACE_WITH_META_PIXEL_ID" />
  <link rel="canonical" href="${escapeHtml(productUrl)}" />
  <meta property="og:locale" content="fr_CI" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="House of Redemption" />
  <meta property="og:title" content="${escapeHtml(productName)} | House of Redemption" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(productUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:image:alt" content="${escapeHtml(productName)}" />
  <meta property="product:brand" content="House of Redemption" />
  <meta property="product:availability" content="in stock" />
  <meta property="product:condition" content="new" />
  <meta property="product:price:amount" content="${price}" />
  <meta property="product:price:currency" content="XOF" />
  <meta name="product:retailer_item_id" content="${escapeHtml(String(product.id || product.name || productName))}" />
  <meta name="product:price:amount" content="${price}" />
  <meta name="product:price:currency" content="XOF" />
  <meta name="product:availability" content="in stock" />
  <meta name="product:condition" content="new" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(productName)} | House of Redemption" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
  <title>${escapeHtml(productName)} | House of Redemption</title>
  <link rel="icon" type="image/jpeg" href="/img/logo.jpg" />
  <link rel="stylesheet" href="/style.css" />
  <script src="/analytics.js" defer></script>
</head>
<body class="product-page-body">
  <header class="product-page-nav">
    <a href="/" class="nav-logo" aria-label="Accueil Redemption">
      <img src="/img/logo.jpg" alt="Logo Redemption" class="brand-logo" />
    </a>
    <a class="btn btn-secondary" href="/#shop">Retour boutique</a>
  </header>
  <main class="product-detail-page">
    <section class="product-detail-shell">
      <div class="product-detail-gallery">
        <figure class="product-detail-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(productName)}" decoding="async" />
        </figure>
      </div>
      <article class="product-detail-info">
        <p class="eyebrow">${escapeHtml(category)}</p>
        <h1>${escapeHtml(productName)}</h1>
        <p class="product-detail-description">${escapeHtml(description)}</p>
        <div class="product-detail-meta">
          ${product.collection_name ? `<span>${escapeHtml(product.collection_name)}</span>` : ""}
          ${product.color ? `<span>${escapeHtml(product.color)}</span>` : ""}
          ${renderProductSizes(product.sizes)}
          <strong>${formatPrice(price)}</strong>
        </div>
        <div class="product-detail-actions">
          <a class="btn btn-primary" href="${escapeHtml(orderUrl)}">Commander</a>
          <a class="btn btn-secondary" href="${escapeHtml(orderUrl)}">Voir les details</a>
        </div>
      </article>
    </section>
  </main>
  <script>
    window.addEventListener("load", function () {
      if (typeof window.redemptionTrackMeta !== "function") return;
      window.redemptionTrackMeta("ViewContent", {
        content_ids: [${JSON.stringify(String(product.id || product.name || ""))}],
        content_name: ${JSON.stringify(productName)},
        content_type: "product",
        value: ${JSON.stringify(price)},
        currency: "XOF"
      });
    });
  </script>
</body>
</html>`;
}

function renderMissingPage(title, description) {
  const image = `${SITE_URL}/img/logo.jpg`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <meta property="og:title" content="${escapeHtml(title)} | House of Redemption" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="meta-pixel-id" content="REPLACE_WITH_META_PIXEL_ID" />
  <title>${escapeHtml(title)} | House of Redemption</title>
  <link rel="stylesheet" href="/style.css" />
  <script src="/analytics.js" defer></script>
</head>
<body class="product-page-body">
  <main class="product-detail-page">
    <section class="product-detail-shell">
      <article class="product-detail-info">
        <p class="eyebrow">Boutique</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="product-detail-description">${escapeHtml(description)}</p>
        <div class="product-detail-actions">
          <a class="btn btn-primary" href="/#shop">Retour boutique</a>
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

function getProductImages(product) {
  const images = [
    ...normalizeProductImages(product.image_url || product.image),
    ...normalizeProductImages(product.image_urls || product.images),
  ];
  return Array.from(new Set(images.map(normalizeMediaUrl).filter(Boolean)));
}

function renderProductSizes(value) {
  const sizes = parseProductSizes(value);
  if (!sizes.length) return "";
  return `<span class="product-sizes product-detail-sizes">${sizes.map((size) => `<span>${escapeHtml(size)}</span>`).join("")}</span>`;
}

function parseProductSizes(value) {
  if (Array.isArray(value)) return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) || parsed && typeof parsed === "object") return parseProductSizes(parsed);
      if (typeof parsed === "string" && parsed !== value) return parseProductSizes(parsed);
    } catch {
      return Array.from(new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)));
    }
  }
  if (typeof value === "object") {
    const source = Array.isArray(value.sizes) ? value.sizes : Object.values(value);
    return parseProductSizes(source);
  }
  return [];
}

function normalizeProductImages(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (value.includes("\n")) return value.split(/\r?\n/);
    if (!value.trim().startsWith("data:") && value.includes(",")) return value.split(",");
  }

  return [value];
}

function normalizeMediaUrl(value) {
  const url = String(value || "").trim().replace(/\s+/g, " ");
  if (!url) return "";
  if (/^(data:|blob:|\/|\.\/|\.\.\/)/i.test(url)) return url;
  const withProtocol = url.startsWith("www.") ? `https://${url}` : url;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.hostname.includes("drive.google.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const fileIndex = parts.indexOf("file");
      const id = parsed.searchParams.get("id") || (fileIndex >= 0 ? parts[fileIndex + 2] : "");
      return id ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : withProtocol;
    }
    if (parsed.hostname.includes("dropbox.com")) {
      parsed.searchParams.set("raw", "1");
      return parsed.toString();
    }
  } catch {
    return withProtocol;
  }

  return withProtocol;
}

function absoluteUrl(value) {
  const url = normalizeMediaUrl(value);
  if (!url) return `${SITE_URL}/img/logo.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}/${url.replace(/^\.?\//, "")}`;
}

function formatProductName(product) {
  const base = product.name || "Produit";
  const category = formatCategory(product.category);
  const normalizedBase = removeAccents(base).toLowerCase();
  const normalizedCategory = removeAccents(category).toLowerCase();
  const hasCategory = normalizedBase.includes(normalizedCategory)
    || normalizedBase.includes("t-shirt")
    || normalizedBase.includes("tshirt")
    || normalizedBase.includes("manche longue")
    || normalizedBase.includes("pull")
    || normalizedBase.includes("casquette");
  return `${hasCategory ? "" : `${category} `}${base}`.trim();
}

function formatCategory(category) {
  return {
    tshirt: "T-shirt",
    hoodie: "Pull",
    longsleeve: "T-shirt manches longues",
    cap: "Casquette",
  }[category] || "Produit";
}

function formatPrice(price) {
  return `${price.toLocaleString("fr-FR")} FCFA`;
}

function cleanMetaText(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

function truncateMeta(value, maxLength) {
  const text = cleanMetaText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
}

function removeAccents(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function html(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": statusCode === 200 ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" : "no-store",
      "Netlify-CDN-Cache-Control": statusCode === 200 ? "public, s-maxage=86400, stale-while-revalidate=604800" : "no-store",
    },
    body,
  };
}
