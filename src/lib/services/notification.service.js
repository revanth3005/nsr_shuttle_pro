import { insertRow, insertRows, updateRow, filter } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso } from "../utils.js";

export async function notify(userId, type, title, message) {
  return insertRow(SHEETS.Notifications, {
    id: genId("NTF"),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: nowIso(),
  });
}

// Broadcast the same notification to many users (e.g. tournament announcement).
export async function notifyMany(userIds, type, title, message) {
  const rows = userIds.map((userId) => ({
    id: genId("NTF"),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: nowIso(),
  }));
  if (rows.length) await insertRows(SHEETS.Notifications, rows);
  return rows;
}

export async function listForUser(userId) {
  const rows = await filter(SHEETS.Notifications, (n) => String(n.userId) === String(userId));
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// "read" is stored as a SQLite 0/1 integer (booleans have no native type) —
// treat anything falsy/zero as unread.
const isUnread = (n) => !n.read || Number(n.read) === 0;

export async function unreadCount(userId) {
  const rows = await listForUser(userId);
  return rows.filter(isUnread).length;
}

export async function markRead(id) {
  return updateRow(SHEETS.Notifications, id, { read: true });
}

export async function markAllRead(userId) {
  const items = await listForUser(userId);
  for (const n of items) {
    if (isUnread(n)) await markRead(n.id);
  }
  return true;
}
