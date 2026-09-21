import { readSheet, findById, insertRow, updateRow, deleteRow, search, filter, where } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso } from "../utils.js";

export async function listTournaments() {
  const rows = await readSheet(SHEETS.Tournaments);
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getTournament(id) {
  return findById(SHEETS.Tournaments, id);
}

export async function searchTournaments(term) {
  return search(SHEETS.Tournaments, term, ["name", "venue", "category", "organizer", "status"]);
}

export async function createTournament(data, organizer) {
  const t = {
    id: genId("TRN"),
    name: data.name || "",
    description: data.description || "",
    venue: data.venue || "",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    organizer: organizer?.name || data.organizer || "",
    organizerId: organizer?.id || data.organizerId || "",
    category: data.category || "Singles",
    format: data.format || "Knockout",
    status: data.status || "Draft",
    createdAt: nowIso(),
  };
  await insertRow(SHEETS.Tournaments, t);
  return t;
}

export async function updateTournament(id, patch) {
  return updateRow(SHEETS.Tournaments, id, patch);
}

// Cascade delete: also remove this tournament's matches, teams and
// registrations — so deleting a tournament never leaves orphaned rows behind.
// Player stats/rankings are always fully recomputed from whatever remains in
// the Matches sheet (see ranking.service's recalculateRankings), so deleting
// the rows and resyncing once at the end is enough — no per-match revert
// bookkeeping needed.
export async function removeTournament(id) {
  const matches = await where(SHEETS.Matches, { tournamentId: id });
  for (const m of matches) await deleteRow(SHEETS.Matches, m.id);

  const teams = await where(SHEETS.Teams, { tournamentId: id });
  for (const t of teams) await deleteRow(SHEETS.Teams, t.id);

  const regs = await where(SHEETS.Registrations, { tournamentId: id });
  for (const r of regs) await deleteRow(SHEETS.Registrations, r.id);

  if (matches.length) {
    const { recalculateRankings } = await import("./ranking.service.js");
    await recalculateRankings();
  }

  return deleteRow(SHEETS.Tournaments, id);
}

export async function tournamentsByOrganizer(organizerId) {
  const rows = await listTournaments();
  return rows.filter((t) => String(t.organizerId) === String(organizerId));
}
