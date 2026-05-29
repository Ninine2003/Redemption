const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const publicEntries = [
  "index.html",
  "dashboard.html",
  "product.html",
  "wave-payment.html",
  "payment-success.html",
  "style.css",
  "script.js",
  "analytics.js",
  "sw.js",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "google43b0437b5fff73cf.html",
  "logo.svg",
  "assets",
  "img",
  "logo wave",
  "image hero",
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of publicEntries) {
  const source = path.join(root, entry);
  const target = path.join(outDir, entry);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing required public entry: ${entry}`);
  }

  fs.cpSync(source, target, { recursive: true });
}

const version = Date.now().toString(36);
const buildDate = new Date().toISOString();
for (const htmlFile of ["index.html", "dashboard.html", "product.html", "wave-payment.html", "payment-success.html"]) {
  const filePath = path.join(outDir, htmlFile);
  let html = fs.readFileSync(filePath, "utf8");
  html = html
    .replace(/href="style\.css(?:\?v=[^"]*)?"/g, `href="style.css?v=${version}"`)
    .replace(/src="script\.js(?:\?v=[^"]*)?"/g, `src="script.js?v=${version}"`)
    .replace(/src="analytics\.js(?:\?v=[^"]*)?"/g, `src="analytics.js?v=${version}"`)
    .replace(/href="manifest\.webmanifest(?:\?v=[^"]*)?"/g, `href="manifest.webmanifest?v=${version}"`);

  if (htmlFile === "dashboard.html" || htmlFile === "product.html") {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

    if (supabaseUrl && supabaseAnonKey) {
      html = html
        .replace('const SUPABASE_URL = "YOUR_SUPABASE_URL";', `const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};`)
        .replace('const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";', `const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};`);
    }
  }

  if (htmlFile === "dashboard.html") {
    const dashboardUsername = process.env.DASHBOARD_USERNAME || "";
    const dashboardPassword = process.env.DASHBOARD_PASSWORD || "";

    if (dashboardUsername && dashboardPassword) {
      html = html
        .replace('const DASHBOARD_USERNAME = "YOUR_DASHBOARD_USERNAME";', `const DASHBOARD_USERNAME = ${JSON.stringify(dashboardUsername)};`)
        .replace('const DASHBOARD_PASSWORD = "YOUR_DASHBOARD_PASSWORD";', `const DASHBOARD_PASSWORD = ${JSON.stringify(dashboardPassword)};`);
    }
  }

  fs.writeFileSync(filePath, html);
}

fs.writeFileSync(
  path.join(outDir, "deploy-version.txt"),
  [
    "House of Redemption deployment",
    `version=${version}`,
    `built_at=${buildDate}`,
  ].join("\n") + "\n"
);

const scriptPath = path.join(outDir, "script.js");
if (fs.existsSync(scriptPath)) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (supabaseUrl && supabaseAnonKey) {
    let script = fs.readFileSync(scriptPath, "utf8");
    script = script
      .replace('const SUPABASE_URL = "YOUR_SUPABASE_URL";', `const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};`)
      .replace('const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";', `const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};`);
    fs.writeFileSync(scriptPath, script);
  }
}

const publicDir = path.join(root, "public");

if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir)) {
    fs.cpSync(path.join(publicDir, entry), path.join(outDir, entry), { recursive: true });
  }
}

console.log(`Static site built in ${path.relative(root, outDir)}`);
