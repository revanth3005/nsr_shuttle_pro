import { insertRow, readSheet } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso } from "../utils.js";

// Fire-and-forget audit logging. Never let a logging failure break the request.
export async function logAudit({ userId, userName, action, entity, details }) {
  try {
    await insertRow(SHEETS.Audit_Log, {
      id: genId("LOG"),
      userId: userId || "",
      userName: userName || "",
      action,
      entity: entity || "",
      details: typeof details === "string" ? details : JSON.stringify(details || {}),
      timestamp: nowIso(),
    });
  } catch (e) {
    console.error("[AUDIT] failed", e.message);
  }
}

export async function listAudit() {
  const rows = await readSheet(SHEETS.Audit_Log);
  return rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}
