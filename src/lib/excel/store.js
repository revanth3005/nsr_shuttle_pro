// SQL storage layer (Turso / libSQL).
// -----------------------------------------------------------------------------
// Backs the exact same primitives the rest of the app depends on: readSheet,
// writeSheet, insertRow, insertRows, updateRow, deleteRow, findById, search,
// filter, aggregate, replaceSheet. Every service file calls these the same
// way as before — only the implementation moved from a local Excel file to a
// hosted SQLite (Turso) database. The one real difference: reads are now
// async too (writes always were), since a network database can't be queried
// synchronously the way a local file could.

import { COLUMNS, NUMERIC_COLUMNS } from "./schema.js";
import { getClient, ensureSchema, primaryKeyOf, quoteIdent, normalizeValue } from "../db/client.js";

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
  const c = await client();
  const result = await c.execute(`SELECT * FROM ${quoteIdent(name)}`);
  return rowsFromResult(result, name);
}

export async function findById(name, id) {
  const c = await client();
  const pk = primaryKeyOf(name);
  const result = await c.execute({
    sql: `SELECT * FROM ${quoteIdent(name)} WHERE ${quoteIdent(pk)} = ? LIMIT 1`,
    args: [id],
  });
  const rows = rowsFromResult(result, name);
  return rows[0] || null;
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
