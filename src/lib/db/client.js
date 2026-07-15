// Turso (libSQL) client + schema bootstrap.
// -----------------------------------------------------------------------------
// Connection settings come from src/config/db.config.js (not environment
// variables, per project setup). The client connects lazily — nothing here
// runs at import time, so the app builds fine even before the config is
// filled in; only an actual request that touches the database needs it.

import { createClient } from "@libsql/client";
import { DB_CONFIG } from "@/config/db.config.js";
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

let _client = null;
export function getClient() {
  if (_client) return _client;
  if (!DB_CONFIG.url) {
    throw new Error(
      "Turso database is not configured yet — fill in src/config/db.config.js (url + authToken), then restart the server."
    );
  }
  _client = createClient({ url: DB_CONFIG.url, authToken: DB_CONFIG.authToken });
  return _client;
}

function createTableSql(table) {
  const cols = COLUMNS[table];
  const pk = primaryKeyOf(table);
  const colDefs = cols.map((c) => `${quoteIdent(c)} TEXT${c === pk ? " PRIMARY KEY" : ""}`);
  return `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (${colDefs.join(", ")})`;
}

async function insertRowRaw(client, table, row) {
  const cols = COLUMNS[table];
  await client.execute({
    sql: `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    args: cols.map((c) => normalizeValue(row[c])),
  });
}

// Create every table (if missing) and seed demo data the first time the
// database is empty (Users table has zero rows). Cached per warm process so
// repeated calls within the same server instance are free.
let schemaReady = null;
export function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const client = getClient();
    for (const table of Object.values(SHEETS)) {
      await client.execute(createTableSql(table));
    }

    const { rows } = await client.execute(`SELECT COUNT(*) as count FROM ${quoteIdent(SHEETS.Users)}`);
    const count = Number(rows[0]?.count || 0);
    if (count === 0) {
      const data = buildSeedData();
      for (const table of Object.values(SHEETS)) {
        for (const row of data[table] || []) {
          await insertRowRaw(client, table, row);
        }
      }
    }
  })().catch((err) => {
    schemaReady = null; // allow retry on next call instead of caching a failure
    throw err;
  });
  return schemaReady;
}
