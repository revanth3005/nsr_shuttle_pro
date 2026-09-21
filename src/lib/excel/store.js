// SQL storage layer (Turso / libSQL).
// -----------------------------------------------------------------------------
// Backs the exact same primitives the rest of the app depends on: readSheet,
// writeSheet, insertRow, insertRows, updateRow, deleteRow, findById, search,
// filter, aggregate, replaceSheet. Every service file calls these the same
// way as before — only the implementation moved from a local Excel file to a
// hosted SQLite (Turso) database. The one real difference: reads are now
// async too (writes always were), since a network database can't be queried
// synchronously the way a local file could.

import { AsyncLocalStorage } from "node:async_hooks";
import { COLUMNS, NUMERIC_COLUMNS } from "./schema.js";
import { getClient, ensureSchema, primaryKeyOf, quoteIdent, normalizeValue } from "../db/client.js";

// ---------------------------------------------------------------------------
// Per-request read cache
// ---------------------------------------------------------------------------
// One API request fans out through several services, and they kept asking for
// the same rows: recording a result read the Players and Teams tables three
// times each and the Tournament row four times. Over a network database every
// one of those is a round trip the user waits for.
//
// The cache lives in AsyncLocalStorage, so it is scoped to a single request
// and can never leak stale rows into the next one. Any write to a table drops
// that table's cached reads immediately, so a read after a write in the same
// request still sees the new data.
const requestCache = new AsyncLocalStorage();

export function withRequestCache(fn) {
  return requestCache.run(new Map(), fn);
}

async function cached(key, table, load) {
  const store = requestCache.getStore();
  if (!store) return load();
  const hit = store.get(key);
  if (hit !== undefined) return hit;
  const value = await load();
  // A write may have landed while this query was in flight — only keep the
  // value if the table hasn't been invalidated since.
  if (!store.get(`__dirty:${table}`)) store.set(key, value);
  return value;
}

function invalidate(table) {
  const store = requestCache.getStore();
  if (!store) return;
  for (const key of store.keys()) {
    if (key === `${table}` || String(key).startsWith(`${table}:`)) store.delete(key);
  }
  store.set(`__dirty:${table}`, true);
  // The flag is only meant to protect in-flight reads of THIS table, so clear
  // it on the next tick rather than disabling caching for the rest of the
  // request.
  queueMicrotask(() => store.delete(`__dirty:${table}`));
}

function rowsFromResult(result, name) {
  const numericCols = NUMERIC_COLUMNS[name];
  return result.rows.map((r) => {
    const obj = {};
    for (const col of result.columns) {
      const v = r[col];
      obj[col] = numericCols?.includes(col) && v !== null && v !== "" ? Number(v) : v;
    }
    return obj;
  });
}

async function client() {
  await ensureSchema();
  return getClient();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function readSheet(name) {
  return cached(String(name), name, async () => {
    const c = await client();
    const result = await c.execute(`SELECT * FROM ${quoteIdent(name)}`);
    return rowsFromResult(result, name);
  });
}

export async function findById(name, id) {
  return cached(`${name}:id:${id}`, name, async () => {
    const c = await client();
    const pk = primaryKeyOf(name);
    const result = await c.execute({
      sql: `SELECT * FROM ${quoteIdent(name)} WHERE ${quoteIdent(pk)} = ? LIMIT 1`,
      args: [id],
    });
    const rows = rowsFromResult(result, name);
    return rows[0] || null;
  });
}

export async function search(name, term, fields) {
  const q = String(term || "").toLowerCase().trim();
  const rows = await readSheet(name);
  if (!q) return rows;
  return rows.filter((row) => {
    const keys = fields && fields.length ? fields : Object.keys(row);
    return keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
  });
}

export async function filter(name, predicate) {
  const rows = await readSheet(name);
  return rows.filter(predicate);
}

// Filter IN SQL instead of pulling the whole table across the network and
// filtering in JS. `conditions` is a plain { column: value } map, AND-ed.
// Against Turso this is the difference between shipping every match in the
// database over the wire and shipping one tournament's worth.
export async function where(name, conditions) {
  const keys = Object.keys(conditions || {}).sort();
  if (!keys.length) return readSheet(name);
  const key = `${name}:w:${keys.map((k) => `${k}=${conditions[k]}`).join("&")}`;
  return cached(key, name, async () => {
    const c = await client();
    const result = await c.execute({
      sql: `SELECT * FROM ${quoteIdent(name)} WHERE ${keys.map((k) => `${quoteIdent(k)} = ?`).join(" AND ")}`,
      args: keys.map((k) => normalizeValue(conditions[k])),
    });
    return rowsFromResult(result, name);
  });
}

// Aggregate: group rows by a key and reduce. reducer(acc, row) => acc.
export async function aggregate(name, groupBy, reducer, seed) {
  const rows = await readSheet(name);
  const groups = {};
  for (const row of rows) {
    const key = row[groupBy];
    if (!(key in groups)) groups[key] = typeof seed === "function" ? seed() : { ...seed };
    groups[key] = reducer(groups[key], row);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
export async function writeSheet(name, rows) {
  invalidate(name);
  const c = await client();
  const cols = COLUMNS[name] || (rows[0] ? Object.keys(rows[0]) : []);
  const statements = [{ sql: `DELETE FROM ${quoteIdent(name)}`, args: [] }];
  for (const row of rows) {
    statements.push({
      sql: `INSERT INTO ${quoteIdent(name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((col) => normalizeValue(row[col])),
    });
  }
  await c.batch(statements, "write");
  return rows;
}

export async function insertRow(name, row) {
  invalidate(name);
  const c = await client();
  const cols = COLUMNS[name] || Object.keys(row);
  await c.execute({
    sql: `INSERT INTO ${quoteIdent(name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    args: cols.map((col) => normalizeValue(row[col])),
  });
  return row;
}

export async function insertRows(name, newRows) {
  if (!newRows.length) return newRows;
  invalidate(name);
  const c = await client();
  const cols = COLUMNS[name] || Object.keys(newRows[0]);
  const statements = newRows.map((row) => ({
    sql: `INSERT INTO ${quoteIdent(name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    args: cols.map((col) => normalizeValue(row[col])),
  }));
  await c.batch(statements, "write");
  return newRows;
}

export async function updateRow(name, id, patch) {
  invalidate(name);
  const c = await client();
  const pk = primaryKeyOf(name);
  const keys = Object.keys(patch);
  if (!keys.length) return findById(name, id);
  const setClause = keys.map((k) => `${quoteIdent(k)} = ?`).join(", ");
  const result = await c.execute({
    sql: `UPDATE ${quoteIdent(name)} SET ${setClause} WHERE ${quoteIdent(pk)} = ?`,
    args: [...keys.map((k) => normalizeValue(patch[k])), id],
  });
  if (!result.rowsAffected) return null;
  return findById(name, id);
}

export async function deleteRow(name, id) {
  invalidate(name);
  const c = await client();
  const pk = primaryKeyOf(name);
  const result = await c.execute({
    sql: `DELETE FROM ${quoteIdent(name)} WHERE ${quoteIdent(pk)} = ?`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

// Replace an entire table's contents — used by engines that recompute a whole
// sheet at once (e.g. rankings, player stat resync). Only reads the current
// rows when actually needed (i.e. computeRows is a transform function) — a
// caller that already has the full row set can pass it directly and skip
// that round trip entirely.
export async function replaceSheet(name, computeRows) {
  if (typeof computeRows !== "function") return writeSheet(name, computeRows);
  const current = await readSheet(name);
  const rows = await computeRows(current);
  return writeSheet(name, rows);
}
