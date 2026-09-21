// libSQL client + schema bootstrap — hosted Turso in prod, a local SQLite
// file in development.
// -----------------------------------------------------------------------------
// Both are the same client and the same SQL; only the URL differs (see
// src/config/db.config.js for the resolution order). The client connects
// lazily — nothing here runs at import time, so the app builds fine before
// anything is configured; only a request that touches the database needs it.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { resolveDbConfig } from "@/config/db.config.js";
import { SHEETS, COLUMNS } from "../excel/schema.js";
import { buildSeedData } from "../excel/seed-data.js";

// Points_Config is the only table whose natural primary key isn't "id".
const PRIMARY_KEYS = {
  [SHEETS.Points_Config]: "key",
};

export function primaryKeyOf(table) {
  return PRIMARY_KEYS[table] || "id";
}

export function quoteIdent(name) {
  return `"${name}"`;
}

// Every column is declared as TEXT (matching the original loose Excel-style
// schema), so pre-format values ourselves before binding rather than letting
// SQLite convert them: it binds JS numbers as REAL, and converting a REAL
// into a TEXT-affinity column appends ".0" (e.g. 80 -> "80.0"). Formatting
// numbers to a clean string ourselves avoids that entirely.
export function normalizeValue(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return String(v);
  return v;
}

// Cached on globalThis (not a plain module-level `let`) because Next.js dev
// mode can give different route bundles their own instance of this module —
// a plain module-level singleton would then re-init per route. globalThis is
// shared across the whole Node process regardless of module instance.
export function getClient() {
  if (globalThis.__tursoClient) return globalThis.__tursoClient;

  // Resolved per connection rather than at import time, so a process that sets
  // env vars late (or a test that swaps them) still picks up the right target.
  const cfg = resolveDbConfig();
  if (!cfg.url) throw new Error(cfg.error || "No database configured.");

  // SQLite creates the .db file itself, but not the directory holding it — a
  // fresh clone has no data/ dir (it's gitignored), so make it first or the
  // very first request fails with an unhelpful SQLITE_CANTOPEN.
  if (cfg.mode === "local" && cfg.file) fs.mkdirSync(path.dirname(cfg.file), { recursive: true });

  if (cfg.replica) {
    // Embedded replica: the local file is the read path, syncUrl is the
    // hosted database writes go to and reads sync from.
    fs.mkdirSync(path.dirname(cfg.replica.path), { recursive: true });
    globalThis.__tursoClient = createClient({
      url: `file:${cfg.replica.path.replace(/\\/g, "/")}`,
      syncUrl: cfg.url,
      authToken: cfg.authToken,
      syncInterval: cfg.replica.syncInterval,
    });
  } else {
    globalThis.__tursoClient = createClient(
      // A file: URL takes no authToken — passing one (even empty) is rejected.
      cfg.authToken ? { url: cfg.url, authToken: cfg.authToken } : { url: cfg.url }
    );
  }
  globalThis.__dbMode = cfg.mode;


  // One line per process so it's never a mystery which database you're on —
  // especially which side of the prod/local split a stray dataset came from.
  console.log(
    cfg.mode === "local"
      ? `[DB] local SQLite file -> ${cfg.file || cfg.url}`
      : cfg.replica
        ? `[DB] Turso -> ${cfg.url} (via ${cfg.source}) + embedded replica at ${cfg.replica.path}, sync every ${cfg.replica.syncInterval}s`
        : `[DB] Turso -> ${cfg.url} (via ${cfg.source})`
  );

  return globalThis.__tursoClient;
}

function createTableSql(table) {
  const cols = COLUMNS[table];
  const pk = primaryKeyOf(table);
  const colDefs = cols.map((c) => `${quoteIdent(c)} TEXT${c === pk ? " PRIMARY KEY" : ""}`);
  return `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (${colDefs.join(", ")})`;
}

function insertRowStatement(table, row) {
  const cols = COLUMNS[table];
  return {
    sql: `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    args: cols.map((c) => normalizeValue(row[c])),
  };
}

// Create every table (if missing) and seed demo data the first time the
// database is empty (Users table has zero rows). Cached on globalThis (see
// getClient above) so this genuinely runs once per server process — not once
// per route module instance. All CREATE TABLEs go in a single batch (1 round
// trip instead of 11); the one-time seed insert is also a single batch across
// every table's rows instead of one round trip per row.
// Add any column that exists in COLUMNS but not yet in the live table.
// CREATE TABLE IF NOT EXISTS is a no-op once a table exists, so a database
// created before a column was introduced would otherwise keep the old shape
// and every INSERT naming the new column would fail. Runs on both the local
// SQLite file and a hosted Turso database.
async function migrateColumns(client) {
  const missing = [];
  for (const table of Object.values(SHEETS)) {
    const info = await client.execute(`PRAGMA table_info(${quoteIdent(table)})`);
    const existing = new Set(info.rows.map((r) => r.name));
    for (const col of COLUMNS[table]) {
      if (!existing.has(col)) {
        missing.push({ table, col });
      }
    }
  }
  for (const { table, col } of missing) {
    // One statement at a time: SQLite allows only a single ADD COLUMN per
    // ALTER, and a batch would roll every add back if any one of them failed.
    await client.execute(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(col)} TEXT`);
    console.log(`[DB] migrated: added ${table}.${col}`);
  }
}

export function ensureSchema() {
  if (globalThis.__schemaReady) return globalThis.__schemaReady;
  globalThis.__schemaReady = (async () => {
    const client = getClient();
    await client.batch(Object.values(SHEETS).map((table) => createTableSql(table)), "write");
    await migrateColumns(client);

    const { rows } = await client.execute(`SELECT COUNT(*) as count FROM ${quoteIdent(SHEETS.Users)}`);
    const count = Number(rows[0]?.count || 0);
    if (count === 0) {
      const data = buildSeedData();
      const statements = Object.values(SHEETS).flatMap((table) =>
        (data[table] || []).map((row) => insertRowStatement(table, row))
      );
      if (statements.length) await client.batch(statements, "write");
    }
  })().catch((err) => {
    globalThis.__schemaReady = null; // allow retry on next call instead of caching a failure
    throw err;
  });
  return globalThis.__schemaReady;
}
