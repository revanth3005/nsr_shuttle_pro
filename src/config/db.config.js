// Database connection settings.
// -----------------------------------------------------------------------------
// The app talks to libSQL/SQLite through one client, and libSQL speaks both
// dialects of the same protocol — so PROD and LOCAL differ only by the URL:
//
//   prod   ->  libsql://<db>-<org>.turso.io   (hosted Turso, needs an authToken)
//   local  ->  file:./data/badminton.db       (a plain SQLite file on disk)
//
// Nothing else in the codebase changes between the two: same schema, same SQL,
// same store.js. Resolution order:
//
//   1. TURSO_DATABASE_URL / TURSO_AUTH_TOKEN env vars  <- how prod is configured
//   2. The hardcoded values below                      <- paste-and-go for dev
//   3. Local SQLite file fallback                      <- automatic, zero setup
//
// The fallback works for `npm run dev` AND `npm start` on your own machine. It
// is refused only on hosts whose disk is ephemeral (see EPHEMERAL_HOST_VARS),
// where it would silently lose data.
//
// How to get Turso values (free):
//   1. Sign up at https://turso.tech
//   2. Create a database:       turso db create shuttlepro
//   3. Get the connection URL:  turso db show shuttlepro --url
//   4. Create an auth token:    turso db tokens create shuttlepro

import path from "node:path";

// Optional: paste Turso values here instead of using env vars. Leaving these
// blank is fine — you'll get the local SQLite file automatically.
const MANUAL = {
  url: "",
  authToken: "",
};

// Where the local SQLite file lives. DATA_DIR (already used for the old Excel
// workbook) still overrides it, so both stores stay in the same place.
export function localDbPath() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dir, process.env.LOCAL_DB_FILE || "badminton.db");
}

// A file: URL is how libSQL addresses a local SQLite file. Absolute paths on
// POSIX already start with "/", so "file:" + path is the correct form; on
// Windows a backslash path needs the slashes flipped first.
function fileUrl(absPath) {
  return `file:${absPath.replace(/\\/g, "/")}`;
}

// Hosts that run from an EPHEMERAL filesystem — a SQLite file written there is
// thrown away on the next deploy or container restart, so falling back to one
// would quietly reset the tournament data instead of failing loudly. Each
// platform sets its own marker variable; presence is what we test, not value.
//
// NODE_ENV is deliberately NOT the signal here: `next start` sets it to
// "production" even when you're just running a production build on your own
// laptop, where the disk is perfectly real and the file is what you want.
const EPHEMERAL_HOST_VARS = [
  "VERCEL",                   // Vercel
  "NETLIFY",                  // Netlify
  "RENDER",                   // Render
  "FLY_APP_NAME",             // Fly.io
  "RAILWAY_ENVIRONMENT",      // Railway
  "AWS_LAMBDA_FUNCTION_NAME", // AWS Lambda / SST / Amplify
  "K_SERVICE",                // Google Cloud Run
  "WEBSITE_INSTANCE_ID",      // Azure App Service
  "DYNO",                     // Heroku
  "CF_PAGES",                 // Cloudflare Pages
  "KUBERNETES_SERVICE_HOST",  // any Kubernetes pod
];

function ephemeralHost() {
  return EPHEMERAL_HOST_VARS.find((v) => process.env[v]);
}

// Escape hatch for a managed host that genuinely has a persistent volume
// mounted at DATA_DIR (a Fly volume, a Render disk, a k8s PVC).
function localExplicitlyAllowed() {
  return process.env.ALLOW_LOCAL_DB === "1" || process.env.ALLOW_LOCAL_DB === "true";
}

// Turso embedded replica: keep a local SQLite copy that reads are served
// from, while writes still go to the hosted database and sync back. Reads
// stop being network round trips entirely, which is the single biggest win
// available for a read-heavy app like this one.
//
// Off by default, because it needs two things that aren't always true:
//   * a writable, PERSISTENT disk — on Vercel/Lambda only /tmp is writable
//     and it vanishes between invocations, so the replica would re-sync
//     constantly and cost more than it saves;
//   * tolerance for brief staleness — a write made by a DIFFERENT server
//     instance isn't visible locally until the next sync (syncInterval
//     seconds). With a single app server, which is the normal setup here,
//     that case never arises.
function replicaSettings() {
  const on = process.env.TURSO_EMBEDDED_REPLICA === "1" || process.env.TURSO_EMBEDDED_REPLICA === "true";
  if (!on) return null;
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return {
    path: path.join(dir, process.env.TURSO_REPLICA_FILE || "turso-replica.db"),
    syncInterval: Number(process.env.TURSO_SYNC_INTERVAL || 60),
  };
}

export function resolveDbConfig() {
  const envUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  const envToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
  if (envUrl) {
    return {
      url: envUrl,
      authToken: envToken || undefined,
      mode: "turso",
      source: "env",
      replica: replicaSettings(),
    };
  }

  const manualUrl = (MANUAL.url || "").trim();
  const manualToken = (MANUAL.authToken || "").trim();
  if (manualUrl) {
    const manualIsFile = manualUrl.startsWith("file:");
    return {
      url: manualUrl,
      authToken: manualToken || undefined,
      // A file: URL pasted into MANUAL is still a local file, not Turso.
      mode: manualIsFile ? "local" : "turso",
      source: "db.config.js",
      replica: manualIsFile ? null : replicaSettings(),
    };
  }

  const host = ephemeralHost();
  if (host && !localExplicitlyAllowed()) {
    return {
      url: "",
      mode: "unconfigured",
      source: "none",
      error:
        `No database configured. This looks like a hosted deployment (${host} is set), where the ` +
        "filesystem is ephemeral — a local SQLite file would be wiped on the next deploy or " +
        "restart. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in the deployment environment. " +
        "If this host has a persistent volume mounted at DATA_DIR, set ALLOW_LOCAL_DB=1 to use " +
        "the file anyway.",
    };
  }

  const file = localDbPath();
  return { url: fileUrl(file), authToken: undefined, mode: "local", source: "fallback", file };
}

// Kept as a named export for backwards compatibility with existing imports.
export const DB_CONFIG = resolveDbConfig();
