"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar, MapPin, Trophy, Zap, Users, UsersRound, UserPlus, Trash2, Plus, Shuffle, ListOrdered, Award, Eye,
  LayoutGrid, GitBranch, ChevronRight, Pencil, ArrowLeft, ArrowUp, ArrowDown, ChevronsUpDown,
} from "lucide-react";
import {
  useTournament, useTournamentFixtures, useTournamentRegistrations, useTournamentTeams,
  useTournamentPlayoffs, useMe, usePlayers, useApiMutation,
} from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ROLES, TOURNAMENT_STATUS, TOURNAMENT_CATEGORIES, TOURNAMENT_FORMATS, GROUP_STAGE } from "@/lib/excel/schema";
import { formatDate, cn } from "@/lib/utils";

export default function TournamentDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: me } = useMe();
  const { data: t, isLoading } = useTournament(id);
  const { toast } = useToast();

  const canManage = me && me.role !== ROLES.PLAYER;
  const isDoubles = String(t?.category || "").toLowerCase().includes("doubles");
  const updateStatus = useApiMutation((status) => api.patch(`/api/tournaments/${id}`, { status }), ["tournament", "tournaments"]);
  const updateTournament = useApiMutation((payload) => api.patch(`/api/tournaments/${id}`, payload), ["tournament", "tournaments"]);
  const deleteTournament = useApiMutation(() => api.del(`/api/tournaments/${id}`), ["tournaments"]);

  const [editOpen, setEditOpen] = useState(false);
  const [tForm, setTForm] = useState(null);

  if (isLoading || !t) return <Spinner />;

  function openEditTournament() {
    setTForm({
      name: t.name || "", description: t.description || "", venue: t.venue || "",
      startDate: t.startDate || "", endDate: t.endDate || "", category: t.category, format: t.format,
    });
    setEditOpen(true);
  }

  async function saveTournament(e) {
    e.preventDefault();
    try {
      await updateTournament.mutateAsync(tForm);
      toast("Tournament updated", "success");
      setEditOpen(false);
    } catch (err) { toast(err.message, "error"); }
  }

  async function removeTournament() {
    if (!confirm(`Delete "${t.name}"? This removes all its matches, teams and registrations. This cannot be undone.`)) return;
    try {
      await deleteTournament.mutateAsync();
      toast("Tournament deleted", "success");
      router.push("/tournaments");
    } catch (err) { toast(err.message, "error"); }
  }

  return (
    <div>
      <Link href="/tournaments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Tournaments
      </Link>

      <PageHeader title={t.name} description={t.description}>
        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={openEditTournament}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={removeTournament}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={MapPin} label="Venue" value={t.venue || "TBD"} />
        <InfoTile icon={Calendar} label="Dates" value={`${formatDate(t.startDate) || "?"} → ${formatDate(t.endDate) || "?"}`} />
        <InfoTile icon={Trophy} label="Category" value={t.category} />
        <InfoTile icon={Zap} label="Format" value={t.format} />
      </div>

      {canManage && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Change status:</Label>
              <Select value={t.status} onChange={async (e) => { await updateStatus.mutateAsync(e.target.value); toast("Status updated", "success"); }} className="w-56">
                {TOURNAMENT_STATUS.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Tournament">
          {tForm && (
            <form onSubmit={saveTournament} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input required value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Input value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Venue</Label><Input value={tForm.venue} onChange={(e) => setTForm({ ...tForm, venue: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={tForm.startDate} onChange={(e) => setTForm({ ...tForm, startDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={tForm.endDate} onChange={(e) => setTForm({ ...tForm, endDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Select value={tForm.category} onChange={(e) => setTForm({ ...tForm, category: e.target.value })}>{TOURNAMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
                <div className="space-y-1.5"><Label>Format</Label><Select value={tForm.format} onChange={(e) => setTForm({ ...tForm, format: e.target.value })}>{TOURNAMENT_FORMATS.map((c) => <option key={c}>{c}</option>)}</Select></div>
              </div>
              <p className="text-xs text-warning">Changing the category or format does not regenerate existing matches — use Generate Matches again if you need a fresh bracket.</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateTournament.isPending}>Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </Dialog>
      )}

      <Tabs defaultValue="participants">
        <TabsList className="flex-wrap">
          <TabsTrigger value="participants">Players</TabsTrigger>
          {isDoubles && <TabsTrigger value="teams">Teams</TabsTrigger>}
          <TabsTrigger value="fixtures">Matches & Results</TabsTrigger>
        </TabsList>
        <TabsContent value="participants">
          <Participants tournamentId={id} canManage={canManage} />
        </TabsContent>
        {isDoubles && (
          <TabsContent value="teams">
            <Teams tournamentId={id} canManage={canManage} />
          </TabsContent>
        )}
        <TabsContent value="fixtures">
          <Fixtures tournamentId={id} canManage={canManage} isDoubles={isDoubles} format={t.format} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Players / participants — added directly, no approval.
// ---------------------------------------------------------------------------
function Participants({ tournamentId, canManage }) {
  const { data: regs, isLoading } = useTournamentRegistrations(tournamentId);
  const { data: players } = usePlayers();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const add = useApiMutation((payload) => api.post("/api/registrations", payload), ["tournamentRegs", "tournamentTeams", "fixtures"]);
  const remove = useApiMutation((id) => api.del(`/api/registrations/${id}`), ["tournamentRegs", "tournamentTeams"]);

  const addedIds = new Set((regs || []).map((r) => String(r.playerId)));
  const available = (players || []).filter((p) => !addedIds.has(String(p.id)));
  const filtered = available.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.club || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function openDialog() {
    setSelected(new Set());
    setSearch("");
    setOpen(true);
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function addPlayers(e) {
    e.preventDefault();
    const ids = [...selected];
    if (!ids.length) return toast("Select at least one player", "error");
    setSaving(true);
    let added = 0;
    for (const playerId of ids) {
      try {
        await add.mutateAsync({ tournamentId, playerId, type: "Singles" });
        added++;
      } catch { /* skip duplicates/errors, keep going */ }
    }
    setSaving(false);
    toast(`Added ${added} player${added === 1 ? "" : "s"}`, "success");
    setOpen(false);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openDialog}><UserPlus className="h-4 w-4" /> Add Players</Button>
        </div>
      )}

      {!regs?.length ? (
        <EmptyState title="No players added yet" description={canManage ? "Add players to this tournament." : "No players yet."} icon={Users} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {regs.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <p className="font-medium">{r.participant || "Unknown"}</p>
                {canManage && (
                  <button className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={async () => { await remove.mutateAsync(r.id); toast("Removed", "info"); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Players" description="Select one or more players to add to this tournament.">
        <form onSubmit={addPlayers} className="space-y-3">
          {!available.length ? (
            <p className="text-sm text-muted-foreground">All players are already added.</p>
          ) : (
            <>
              <Input placeholder="Search players…" value={search} onChange={(e) => setSearch(e.target.value)} />

              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={allFilteredSelected} onChange={toggleAll} />
                Select all {search ? "(filtered)" : ""} ({filtered.length})
              </label>

              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
                {filtered.length ? filtered.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/10">
                    <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    <span className="flex-1">{p.firstName} {p.lastName}</span>
                    {p.club && <span className="text-xs text-muted-foreground">{p.club}</span>}
                  </label>
                )) : <p className="px-2 py-3 text-sm text-muted-foreground">No players match “{search}”.</p>}
              </div>

              <p className="text-xs text-muted-foreground">{selected.size} selected</p>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !selected.size}>{saving ? "Adding…" : `Add ${selected.size || ""}`.trim()}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teams (doubles) — add manually or generate randomly from added players.
// ---------------------------------------------------------------------------
function Teams({ tournamentId, canManage }) {
  const { data: teams, isLoading } = useTournamentTeams(tournamentId);
  const { data: regs } = useTournamentRegistrations(tournamentId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ player1Id: "", player2Id: "", name: "" });

  const addTeam = useApiMutation((payload) => api.post("/api/teams", payload), ["tournamentTeams", "fixtures"]);
  const genTeams = useApiMutation(() => api.post(`/api/tournaments/${tournamentId}/teams`), ["tournamentTeams", "fixtures"]);
  const remove = useApiMutation((id) => api.del(`/api/teams/${id}`), ["tournamentTeams", "fixtures"]);

  // Players added to the tournament are the pool for team building.
  const pool = (regs || []).filter((r) => r.playerId).map((r) => ({ id: r.playerId, name: r.participant }));

  async function createTeam(e) {
    e.preventDefault();
    if (form.player1Id === form.player2Id) return toast("Pick two different players", "error");
    try {
      await addTeam.mutateAsync({ ...form, tournamentId });
      toast("Team created", "success");
      setForm({ player1Id: "", player2Id: "", name: "" }); setOpen(false);
    } catch (err) { toast(err.message, "error"); }
  }

  async function generate() {
    try {
      const res = await genTeams.mutateAsync();
      toast(`Generated ${res.teams.length} team(s)${res.unpaired ? " (1 player left unpaired)" : ""}`, "success");
    } catch (err) { toast(err.message, "error"); }
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={generate} disabled={genTeams.isPending}><Shuffle className="h-4 w-4" /> Generate Teams Randomly</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Team</Button>
        </div>
      )}

      {!teams?.length ? (
        <EmptyState title="No teams yet" description={canManage ? "Add players first, then create teams manually or generate them randomly." : "No teams yet."} icon={UsersRound} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((tm) => (
            <Card key={tm.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{tm.name}</p>
                  <p className="text-xs text-muted-foreground">{tm.player1Name} & {tm.player2Name}</p>
                </div>
                {canManage && (
                  <button className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={async () => { await remove.mutateAsync(tm.id); toast("Team removed", "info"); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Team">
        <form onSubmit={createTeam} className="space-y-4">
          <div className="space-y-1.5"><Label>Team name (optional)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-generated if blank" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Player 1</Label>
              <Select required value={form.player1Id} onChange={(e) => setForm({ ...form, player1Id: e.target.value })}>
                <option value="">Select…</option>
                {pool.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Player 2</Label>
              <Select required value={form.player2Id} onChange={(e) => setForm({ ...form, player2Id: e.target.value })}>
                <option value="">Select…</option>
                {pool.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          </div>
          {pool.length < 2 && <p className="text-xs text-warning">Add at least 2 players to the tournament first.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addTeam.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matches & Results — generate randomly, add manually, enter results.
// ---------------------------------------------------------------------------
const SET_TARGETS = { 1: 21, 2: 21, 3: 15 };
const PLAYOFF_LABELS = { "Qualifier 1": true, "Semi Final": true, "Final": true };
// Mirrors KO_ROUND_ORDER in fixture.service.js — kept as a small local
// constant so this client component doesn't need to import a server module.
const KO_ROUND_ORDER = ["Round of 64", "Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Final"];

// Sort rounds: league rounds (Round N) first in numeric order, then the
// playoff stages in Qualifier 1 -> Semi Final -> Final order.
function roundOrder(round) {
  const m = /^round\s+(\d+)/i.exec(round);
  if (m) return Number(m[1]);
  const idx = { "Qualifier 1": 1001, "Semi Final": 1002, "Final": 1003 }[round];
  return idx ?? 900;
}

// Standings columns. `key` is the row field the column sorts on; `numeric`
// decides which way the FIRST click sorts — stats sort best-first (desc),
// names and positions sort A->Z / 1-first (asc). Clicking the same column
// again flips the direction.
const STANDINGS_COLUMNS = [
  { key: "rank", label: "#", title: "Position — Wins first, then NPR" },
  { key: "name", label: "Team / Player", title: "Sort by name" },
  { key: "played", label: "P", numeric: true, title: "Matches played" },
  { key: "wins", label: "W", numeric: true, title: "Matches won" },
  { key: "losses", label: "L", numeric: true, title: "Matches lost" },
  { key: "setDiff", label: "Set +/−", numeric: true, title: "Sets won minus sets lost" },
  {
    key: "netPointsRate", label: "NPR", numeric: true,
    title: "Net Points Rate — (points scored − points conceded) ÷ sets played. The tie-breaker used when two sides have the same number of wins.",
  },
  { key: "points", label: "Pts", numeric: true, title: "Points (2 per win)" },
];

function sortStandings(rows, key, dir) {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (typeof x === "string" || typeof y === "string") {
      return String(x ?? "").localeCompare(String(y ?? "")) * mult || a.rank - b.rank;
    }
    // A side with no sets played yet has a null NPR — keep those rows at the
    // bottom either way instead of letting them top an ascending sort.
    if (x == null && y == null) return a.rank - b.rank;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * mult || a.rank - b.rank;
  });
}

function Standings({ rows, leagueDone, onView, format }) {
  const isKnockout = format === "Knockout";

  // A medal is a FINAL placing, so it only appears once the stage is actually
  // decided — while matches are still being played every row just shows its
  // current position number. Without this, whoever happened to sit in the top
  // three mid-tournament got a 🥇/🥈/🥉, including sides that had not played a
  // single match yet (a side on 0 wins sorts above one that has lost, because
  // it has no negative NPR to drag it down — correct for the table, absurd as
  // a medal). The played > 0 guard also covers a finished bracket where a bye
  // left someone with no matches at all.
  const medalled = (r) => leagueDone && r.rank <= 3 && r.played > 0;
  // Default view = the server's own order (Wins, then NPR), which is exactly
  // what `rank` ascending reproduces.
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });
  const sorted = useMemo(() => sortStandings(rows, sort.key, sort.dir), [rows, sort]);

  function toggleSort(col) {
    setSort((s) =>
      s.key === col.key
        ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key: col.key, dir: col.numeric ? "desc" : "asc" }
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{isKnockout ? "Tournament Standings" : "League Standings"}</h3>
          <Badge variant={leagueDone ? "success" : "warning"}>{leagueDone ? "Complete" : "In progress"}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                {STANDINGS_COLUMNS.map((col) => {
                  const active = sort.key === col.key;
                  return (
                    <th key={col.key} className="py-2 pr-3 font-normal">
                      <button
                        type="button"
                        title={`${col.title} — click to sort ${active && sort.dir === "desc" ? "ascending" : "descending"}`}
                        onClick={() => toggleSort(col)}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/10 hover:text-foreground",
                          active && "font-semibold text-foreground"
                        )}
                      >
                        {col.label}
                        {active ? (
                          sort.dir === "asc"
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    </th>
                  );
                })}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className={`border-b last:border-0 ${medalled(r) ? "font-medium" : ""}`}>
                  <td className="py-2 pr-3">{medalled(r) ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                  <td className="py-2 pr-3">{r.name}<TieBreakTag row={r} rows={rows} /></td>
                  <td className="py-2 pr-3">{r.played}</td>
                  <td className="py-2 pr-3">{r.wins}</td>
                  <td className="py-2 pr-3">{r.losses}</td>
                  <td className="py-2 pr-3">{r.setDiff > 0 ? `+${r.setDiff}` : r.setDiff}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {r.netPointsRate == null ? "—" : r.netPointsRate > 0 ? `+${r.netPointsRate.toFixed(2)}` : r.netPointsRate.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 font-semibold">{r.points}</td>
                  <td className="py-2 text-right">
                    <button
                      className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                      title="View match results"
                      onClick={() => onView?.({ id: r.id, name: r.name })}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Ranked by <b>Wins</b>, then <b>Set +/−</b>, <b>NPR</b> (Net Points Rate), <b>Point +/−</b>,
          <b> head-to-head</b>, and finally a <b>drawing of lots</b> — the BWF order. Hover a tie-break
          tag to see why. Click any column heading to sort ascending / descending.
        </p>
        {!isKnockout && leagueDone && rows.length >= 3 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Playoffs are seeded from the <b>league stage</b> finish (which stays fixed once they start), while the
            table above counts every match including playoffs. <b>Qualifier 1</b> = #1 vs #2 (winner → Final).
            <b> Semi Final</b> = Qualifier 1 loser vs #3. <b>Final</b> = Qualifier 1 winner vs Semi Final winner.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Why a side sits where it does when it was level on matches won. Tie-breaks
// run in BWF order: set +/−, then NPR, then point +/−, then head-to-head,
// then a drawing of lots.
const TIE_LABELS = {
  "set +/-": { text: "SET", rule: "separated on set +/−" },
  NPR: { text: "NPR", rule: "separated on NPR (Net Points Rate)" },
  "point +/-": { text: "PTS", rule: "separated on point +/−" },
  "head-to-head": { text: "H2H", rule: "level on set +/−, NPR and point +/− — separated on head-to-head" },
  lot: { text: "LOT", rule: "level on every criterion — separated by a drawing of lots" },
};

const signed = (n) => (n > 0 ? `+${n}` : String(n));

// The tag is only half the answer: it says a tie-break happened, not what the
// numbers were. The tooltip spells out who was level and — when head-to-head
// or a lot was involved — each side's record in the matches played among ONLY
// the tied sides, which is the part a reader cannot work out from the table.
function TieBreakTag({ row, rows }) {
  const info = TIE_LABELS[row.decidedBy];
  if (!info) return null;

  const siblings = (rows || []).filter((r) => r.tieGroupId && r.tieGroupId === row.tieGroupId);
  const lines = [`Level on ${row.wins} ${row.wins === 1 ? "win" : "wins"} — ${info.rule}.`];

  // Only worth printing the mini-league when it actually mattered.
  if ((row.decidedBy === "head-to-head" || row.decidedBy === "lot") && siblings.length > 1) {
    lines.push("", `Among the ${siblings.length} level sides (these matches only):`);
    for (const r of siblings) {
      const h = r.h2h || { wins: 0, setDiff: 0, pointDiff: 0 };
      lines.push(`  ${r.name}: ${h.wins}W  sets ${signed(h.setDiff)}  points ${signed(h.pointDiff)}`);
    }
  }
  if (row.decidedBy === "lot") {
    lines.push("", "The draw is fixed for this tournament — the order never changes on refresh.");
  }

  return (
    <span
      title={lines.join("\n")}
      className={cn(
        "ml-1.5 cursor-help rounded px-1 py-0.5 align-middle text-[10px] font-medium",
        row.decidedBy === "lot" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
      )}
    >
      {info.text}
    </span>
  );
}

// Group + Knockout: one standings table per pool, side by side. Qualifying
// positions are tinted so it is obvious at a glance who is currently going
// through to the bracket.
function GroupStandings({ groups, qualifiersPerGroup, onView }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <Card key={g.group}>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{g.group}</h3>
              <Badge variant={g.complete ? "success" : "warning"}>{g.complete ? "Complete" : "In progress"}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-normal">#</th>
                    <th className="py-2 pr-3 font-normal">Team / Player</th>
                    <th className="py-2 pr-3 font-normal" title="Matches played">P</th>
                    <th className="py-2 pr-3 font-normal" title="Wins">W</th>
                    <th className="py-2 pr-3 font-normal" title="Losses">L</th>
                    <th className="py-2 pr-3 font-normal" title="Net Points Rate — (points scored − points conceded) ÷ sets played">NPR</th>
                    <th className="py-2 pr-3 font-normal" title="Points (2 per win)">Pts</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => {
                    const qualifying = r.rank <= qualifiersPerGroup;
                    return (
                      <tr
                        key={r.id}
                        className={cn("border-b last:border-0", qualifying && "bg-success/5 font-medium")}
                        title={qualifying ? "Currently qualifying for the knockout bracket" : undefined}
                      >
                        <td className="py-2 pr-3">{r.rank}</td>
                        <td className="py-2 pr-3">{r.name}<TieBreakTag row={r} rows={g.rows} /></td>
                        <td className="py-2 pr-3">{r.played}</td>
                        <td className="py-2 pr-3">{r.wins}</td>
                        <td className="py-2 pr-3">{r.losses}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {r.netPointsRate == null ? "—" : r.netPointsRate > 0 ? `+${r.netPointsRate.toFixed(2)}` : r.netPointsRate.toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 font-semibold">{r.points}</td>
                        <td className="py-2 text-right">
                          <button
                            className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                            title="View match results"
                            onClick={() => onView?.({ id: r.id, name: r.name })}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Top <b>{qualifiersPerGroup}</b> advance. Ranked by <b>Wins</b>, then <b>Set +/−</b>, then <b>NPR</b>,
              then <b>head-to-head</b> (BWF order). Hover a tag to see how a tie was broken.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Shows every match a single participant (player or team) has played, with
// opponent, score and Won/Lost, opened via the "eye" icon in the standings.
function ParticipantResultsDialog({ participant, matches, onClose }) {
  const rows = participant
    ? matches.filter((m) => String(m.side1Id) === String(participant.id) || String(m.side2Id) === String(participant.id))
    : [];

  return (
    <Dialog open={!!participant} onClose={onClose} title={participant ? `${participant.name} — Results` : ""}>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">No matches played yet.</p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {rows.map((m) => {
            const isSide1 = String(m.side1Id) === String(participant.id);
            const opponent = isSide1 ? m.side2Name : m.side1Name;
            const completed = m.status === "Completed";
            const won = completed && String(m.winnerId) === String(participant.id);
            return (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">vs {opponent || "TBD"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.round} • {[m.set1, m.set2, m.set3].filter(Boolean).join(" · ") || "No score yet"}
                  </p>
                </div>
                {completed ? (
                  <Badge variant={won ? "success" : "destructive"}>{won ? "Won" : "Lost"}</Badge>
                ) : (
                  <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

// A single match card, reused in both the league grid and the playoff tree.
//  - "TBD" (dashed border): a future-round placeholder — both sides are still
//    waiting on earlier matches to finish.
//  - "BYE" : one side had no opponent to fill the bracket, so it automatically
//    advances (a walkover) — this is normal bracket padding, not a real result.
//  - Otherwise: a real, scoreable match.
function MatchCard({ m, canManage, onEnterResult, onEdit, onDelete, highlight }) {
  const isBye = m.status === "Walkover";
  const isPlaceholder = !isBye && (!m.side1Id || !m.side2Id);
  const canScore = !!(m.side1Id && m.side2Id);
  const isCompleted = m.status === "Completed";
  return (
    <Card className={highlight ? "border-warning/50" : isPlaceholder ? "border-dashed" : isBye ? "opacity-80" : ""}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{m.court || "Court TBD"}</span>
          <div className="flex items-center gap-1.5">
            {isBye ? (
              <Badge variant="secondary">BYE — auto-advanced</Badge>
            ) : isPlaceholder ? (
              <Badge variant="secondary">TBD</Badge>
            ) : (
              <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
            )}
            {canManage && !isPlaceholder && (
              <>
                <button className="rounded p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground" title="Edit match" onClick={() => onEdit(m)}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete match" onClick={() => onDelete(m)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <Row name={m.side1Name} winner={String(m.winnerId) === String(m.side1Id)} />
        <Row name={m.side2Name} winner={String(m.winnerId) === String(m.side2Id)} />
        {[m.set1, m.set2, m.set3].some(Boolean) && (
          <p className="mt-2 text-xs text-muted-foreground">Score: {[m.set1, m.set2, m.set3].filter(Boolean).join(" · ")}</p>
        )}
        {canManage && canScore && (
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => onEnterResult(m)}>
            {isCompleted ? "Edit Result" : "Enter Result"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Tree/bracket view for the Page-playoff stage: Qualifier 1 and Semi Final
// feed into the Final, connected with simple CSS "brace" connectors. Cards
// appear as soon as matches are generated (as TBD) and fill in automatically
// as results come in.
function PlayoffTree({ matches, canManage, onEnterResult, onEdit, onDelete }) {
  const byRound = (name) => matches.find((m) => m.round === name);
  const q1 = byRound("Qualifier 1");
  const semi = byRound("Semi Final");
  const final = byRound("Final");

  // Only 2 participants in the league — a single Final, no Qualifier/Semi.
  if (!q1 && !semi && final) {
    return (
      <div className="flex justify-center py-2">
        <div className="w-full max-w-xs">
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-warning"><Trophy className="h-3.5 w-3.5" /> Final</p>
          <MatchCard m={final} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} highlight />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px] items-stretch gap-3 py-2">
        <div className="flex w-72 flex-col justify-between gap-10">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Qualifier 1 <span className="font-normal">(#1 vs #2)</span></p>
            {q1 && <MatchCard m={q1} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} />}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Semi Final <span className="font-normal">(Q1 loser vs #3)</span></p>
            {semi && <MatchCard m={semi} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} />}
          </div>
        </div>

        <div className="flex w-8 flex-col justify-center">
          <div className="h-1/2 rounded-br-lg border-b border-r border-border" />
          <div className="h-1/2 rounded-tr-lg border-r border-t border-border" />
        </div>

        <div className="flex w-72 flex-col justify-center">
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-warning"><Trophy className="h-3.5 w-3.5" /> Final</p>
          {final && <MatchCard m={final} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} highlight />}
        </div>
      </div>
    </div>
  );
}

// Tree view for the round-robin league: each round is a column, laid out
// left-to-right with a connector between columns, so the whole league reads
// as one flowing structure instead of stacked lists.
function LeagueTree({ rounds, canManage, onEnterResult, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-stretch gap-2 py-2">
        {rounds.map(([round, ms], idx) => (
          <div key={round} className="flex items-stretch gap-2">
            <div className="w-64 shrink-0">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{round}</p>
              <div className="space-y-3">
                {ms.map((m) => <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            </div>
            {idx < rounds.length - 1 && (
              <div className="flex w-6 shrink-0 items-center justify-center pt-8 text-muted-foreground/40">
                <ChevronRight className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Small view-mode toggle shared by the league section.
function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      <button
        type="button"
        title="Grid view"
        onClick={() => onChange("grid")}
        className={cn("rounded px-2 py-1 transition-colors", view === "grid" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Tree view"
        onClick={() => onChange("tree")}
        className={cn("rounded px-2 py-1 transition-colors", view === "tree" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground")}
      >
        <GitBranch className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Full knockout bracket tree: every round (including future ones) is shown as
// a column left-to-right, connected with simple brace connectors. Later
// rounds start as "TBD vs TBD" placeholder cards and fill in automatically as
// each earlier round's winners are decided.
function KnockoutBracket({ rounds, canManage, onEnterResult, onEdit, onDelete }) {
  if (!rounds.length) return null;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-stretch gap-2 py-2">
        {rounds.map(([round, ms], ci) => (
          <div key={round} className="flex items-stretch gap-2">
            <div className="flex w-64 shrink-0 flex-col justify-around gap-6">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                {round === "Final" && <Trophy className="h-3.5 w-3.5 text-warning" />} {round}
              </p>
              {ms.map((m) => (
                <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={onEnterResult} onEdit={onEdit} onDelete={onDelete} highlight={round === "Final"} />
              ))}
            </div>
            {ci < rounds.length - 1 && (
              <div className="flex flex-col justify-around">
                {Array.from({ length: Math.ceil(ms.length / 2) }).map((_, k) => (
                  <div key={k} className="flex w-8 flex-1 flex-col justify-center">
                    <div className="h-1/2 rounded-br-lg border-b border-r border-border" />
                    <div className="h-1/2 rounded-tr-lg border-r border-t border-border" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Fixtures({ tournamentId, canManage, isDoubles, format }) {
  const isKnockout = format === "Knockout";
  const { data: matches, isLoading } = useTournamentFixtures(tournamentId);
  const { data: regs } = useTournamentRegistrations(tournamentId);
  const { data: teams } = useTournamentTeams(tournamentId);
  const { data: playoffs } = useTournamentPlayoffs(tournamentId);
  const { toast } = useToast();

  const [resultFor, setResultFor] = useState(null);
  // Default to a single set — that covers most club matches. The dropdown in
  // the result dialog switches to 2 or 3 sets whenever a match needs it.
  const [numSets, setNumSets] = useState(1);
  const [scores, setScores] = useState({ set1: "", set2: "", set3: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [mForm, setMForm] = useState({ round: "Round 1", court: "", side1Id: "", side2Id: "", matchDate: "", matchTime: "" });
  const [viewing, setViewing] = useState(null);
  const [leagueView, setLeagueView] = useState("grid");
  const [koView, setKoView] = useState("tree");
  const [editing, setEditing] = useState(null);
  const [eForm, setEForm] = useState({ round: "", court: "", side1Id: "", side2Id: "", matchDate: "", matchTime: "" });

  const generate = useApiMutation(() => api.post(`/api/tournaments/${tournamentId}/fixtures`), ["fixtures", "matches", "playoffs"]);
  const addMatch = useApiMutation((payload) => api.post("/api/matches", payload), ["fixtures", "matches", "playoffs"]);
  const record = useApiMutation(({ id, payload }) => api.post(`/api/matches/${id}/result`, payload), ["fixtures", "matches", "rankings", "playoffs"]);
  const advance = useApiMutation(() => api.post(`/api/tournaments/${tournamentId}/playoffs`), ["fixtures", "matches", "playoffs"]);
  const editMatch = useApiMutation(({ id, payload }) => api.patch(`/api/matches/${id}`, payload), ["fixtures", "matches", "playoffs"]);
  const deleteMatch = useApiMutation((id) => api.del(`/api/matches/${id}`), ["fixtures", "matches", "rankings", "playoffs"]);

  // Sides available for a manual match depend on the tournament type.
  const sides = isDoubles
    ? (teams || []).map((t) => ({ id: t.id, name: t.name }))
    : (regs || []).filter((r) => r.playerId).map((r) => ({ id: r.playerId, name: r.participant }));

  async function genPlayoffs() {
    try {
      const res = await advance.mutateAsync();
      if (res.advanced) toast(`Updated: ${res.stage}`, "success");
      else toast(res.message || "Nothing new to fill in yet", "info");
    } catch (err) { toast(err.message, "error"); }
  }

  async function gen() {
    if (matches?.length && !confirm("This will replace all existing matches for this tournament. Continue?")) return;
    try { await generate.mutateAsync(); toast("Matches generated", "success"); }
    catch (err) { toast(err.message, "error"); }
  }

  async function createManualMatch(e) {
    e.preventDefault();
    if (mForm.side1Id === mForm.side2Id) return toast("Pick two different sides", "error");
    try {
      await addMatch.mutateAsync({ tournamentId, ...mForm, status: "Scheduled" });
      toast("Match added", "success");
      setMForm({ round: "Round 1", court: "", side1Id: "", side2Id: "", matchDate: "", matchTime: "" });
      setAddOpen(false);
    } catch (err) { toast(err.message, "error"); }
  }

  function openResult(m) {
    setResultFor(m);
    // Re-opening a scored match shows however many sets it already has;
    // a fresh match opens on 1 set.
    const filled = [m.set1, m.set2, m.set3].filter(Boolean).length;
    setNumSets(filled || 1);
    setScores({ set1: m.set1 || "", set2: m.set2 || "", set3: m.set3 || "" });
  }

  function openEdit(m) {
    setEditing(m);
    setEForm({
      round: m.round || "",
      court: m.court || "",
      side1Id: m.side1Id || "",
      side2Id: m.side2Id || "",
      matchDate: m.matchDate || "",
      matchTime: m.matchTime || "",
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (eForm.side1Id && eForm.side1Id === eForm.side2Id) return toast("Pick two different sides", "error");
    try {
      await editMatch.mutateAsync({ id: editing.id, payload: eForm });
      toast("Match updated", "success");
      setEditing(null);
    } catch (err) { toast(err.message, "error"); }
  }

  async function handleDelete(m) {
    if (!confirm(`Delete this match (${m.round})? ${m.status === "Completed" ? "Its recorded points will be reversed." : ""}`)) return;
    try {
      await deleteMatch.mutateAsync(m.id);
      toast("Match deleted", "success");
    } catch (err) { toast(err.message, "error"); }
  }

  async function saveResult(e) {
    e.preventDefault();
    // Only send the number of sets chosen; clear the rest.
    const payload = {
      set1: numSets >= 1 ? scores.set1 : "",
      set2: numSets >= 2 ? scores.set2 : "",
      set3: numSets >= 3 ? scores.set3 : "",
      status: "Completed",
    };
    try {
      await record.mutateAsync({ id: resultFor.id, payload });
      toast("Result saved — points & rankings updated", "success");
      setResultFor(null);
    } catch (err) { toast(err.message, "error"); }
  }

  if (isLoading) return <Spinner />;

  const isGroupFormat = format === "Group + Knockout";
  const allMatches = matches || [];
  // Pool fixtures are tagged with groupName; everything else is the bracket.
  const groupFixtures = allMatches.filter((m) => m.groupName);
  const nonGroup = allMatches.filter((m) => !m.groupName);

  // Pool fixtures listed per group, each in round order.
  const groupMatchMap = {};
  groupFixtures.forEach((m) => { (groupMatchMap[m.groupName] = groupMatchMap[m.groupName] || []).push(m); });
  const groupedMatches = Object.entries(groupMatchMap).sort((a, b) => a[0].localeCompare(b[0]));

  const rounds = {};
  nonGroup.forEach((m) => {
    if (!PLAYOFF_LABELS[m.round]) (rounds[m.round] = rounds[m.round] || []).push(m);
  });
  const leagueRounds = Object.entries(rounds).sort((a, b) => roundOrder(a[0]) - roundOrder(b[0]));
  const playoffMatches = nonGroup.filter((m) => PLAYOFF_LABELS[m.round]);
  const target = SET_TARGETS[numSets] || 21;

  const koMap = {};
  if (isKnockout || isGroupFormat) nonGroup.forEach((m) => { (koMap[m.round] = koMap[m.round] || []).push(m); });
  const koRounds = KO_ROUND_ORDER.filter((name) => koMap[name]).map((name) => [name, koMap[name]]);

  const standings = playoffs?.standings || [];
  const groups = playoffs?.groups || [];
  const groupsDone = !!playoffs?.groupsComplete;
  const leagueDone = !!playoffs?.leagueComplete;
  const showPlayoffBtn = canManage && standings.length >= 2 && !playoffMatches.length && !isGroupFormat;
  // Group format: the bracket is built from the qualifiers once every pool is
  // played. Offered as an explicit button too, since recording the last group
  // result already triggers it automatically.
  const showBracketBtn = canManage && isGroupFormat && groups.length > 0 && !koRounds.length;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Match</Button>
          <Button onClick={gen} disabled={generate.isPending}><Zap className="h-4 w-4" /> Generate Matches</Button>
          {showPlayoffBtn && (
            <Button variant="outline" onClick={genPlayoffs} disabled={advance.isPending || !leagueDone} title={leagueDone ? "Create the next playoff stage" : "Complete all league matches first"}>
              <Award className="h-4 w-4" /> Generate Playoffs
            </Button>
          )}
          {showBracketBtn && (
            <Button
              variant="outline"
              onClick={genPlayoffs}
              disabled={advance.isPending || !groupsDone}
              title={groupsDone ? "Build the knockout bracket from the group qualifiers" : "Complete every group match first"}
            >
              <GitBranch className="h-4 w-4" /> Build Knockout Bracket
            </Button>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <GroupStandings
          groups={groups}
          qualifiersPerGroup={GROUP_STAGE.QUALIFIERS_PER_GROUP}
          onView={setViewing}
        />
      )}

      {standings.length > 0 && (
        <Standings rows={standings} leagueDone={leagueDone} onView={setViewing} format={format} />
      )}

      {!matches?.length ? (
        <EmptyState title="No matches yet" description={canManage ? "Add matches manually, or auto-generate them from players/teams." : "Matches haven't been published yet."} icon={Zap} />
      ) : isGroupFormat ? (
        <div className="space-y-8">
          {groupedMatches.map(([group, ms]) => (
            <div key={group}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <LayoutGrid className="h-4 w-4 text-primary" /> {group}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ms.map((m) => (
                  <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}

          {koRounds.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Award className="h-4 w-4 text-warning" /> Knockout Bracket
                </h3>
                <ViewToggle view={koView} onChange={setKoView} />
              </div>
              {koView === "tree" ? (
                <KnockoutBracket rounds={koRounds} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
              ) : (
                <div className="space-y-6">
                  {koRounds.map(([round, ms]) => (
                    <div key={round}>
                      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{round}</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ms.map((m) => (
                          <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : isKnockout ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Award className="h-4 w-4 text-warning" /> Knockout Bracket
            </h3>
            <ViewToggle view={koView} onChange={setKoView} />
          </div>
          {koView === "tree" ? (
            <KnockoutBracket rounds={koRounds} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
          ) : (
            <div className="space-y-6">
              {koRounds.map(([round, ms]) => (
                <div key={round}>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{round}</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ms.map((m) => (
                      <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {leagueRounds.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">League Stage</h3>
                <ViewToggle view={leagueView} onChange={setLeagueView} />
              </div>
              {leagueView === "tree" ? (
                <LeagueTree rounds={leagueRounds} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
              ) : (
                <div className="space-y-6">
                  {leagueRounds.map(([round, ms]) => (
                    <div key={round}>
                      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{round}</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ms.map((m) => (
                          <MatchCard key={m.id} m={m} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {playoffMatches.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Award className="h-4 w-4 text-warning" /> Playoffs
              </h3>
              <PlayoffTree matches={playoffMatches} canManage={canManage} onEnterResult={openResult} onEdit={openEdit} onDelete={handleDelete} />
            </div>
          )}
        </div>
      )}

      {/* Add match dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Match">
        <form onSubmit={createManualMatch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Round</Label><Input value={mForm.round} onChange={(e) => setMForm({ ...mForm, round: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Court</Label><Input value={mForm.court} onChange={(e) => setMForm({ ...mForm, court: e.target.value })} placeholder="Court 1" /></div>
            <div className="space-y-1.5">
              <Label>{isDoubles ? "Team 1" : "Player 1"}</Label>
              <Select required value={mForm.side1Id} onChange={(e) => setMForm({ ...mForm, side1Id: e.target.value })}>
                <option value="">Select…</option>
                {sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isDoubles ? "Team 2" : "Player 2"}</Label>
              <Select required value={mForm.side2Id} onChange={(e) => setMForm({ ...mForm, side2Id: e.target.value })}>
                <option value="">Select…</option>
                {sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={mForm.matchDate} onChange={(e) => setMForm({ ...mForm, matchDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={mForm.matchTime} onChange={(e) => setMForm({ ...mForm, matchTime: e.target.value })} /></div>
          </div>
          {sides.length < 2 && <p className="text-xs text-warning">{isDoubles ? "Create at least 2 teams first." : "Add at least 2 players first."}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addMatch.isPending}>Add Match</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Result dialog with set-format selector */}
      <Dialog open={!!resultFor} onClose={() => setResultFor(null)} title="Enter Match Result" description={resultFor ? `${resultFor.side1Name} vs ${resultFor.side2Name}` : ""}>
        <form onSubmit={saveResult} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Match format</Label>
            <Select value={numSets} onChange={(e) => setNumSets(Number(e.target.value))}>
              <option value={1}>1 Set — play to 21</option>
              <option value={2}>2 Sets — play to 21</option>
              <option value={3}>3 Sets — play to 15</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Enter each set as <code>{target}-{Math.max(target - 6, 0)}</code> (left = {resultFor?.side1Name}, right = {resultFor?.side2Name}). Winner is decided automatically.
            </p>
          </div>
          <div className={`grid gap-3 ${numSets === 1 ? "grid-cols-1" : numSets === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {Array.from({ length: numSets }).map((_, i) => {
              const key = `set${i + 1}`;
              return (
                <div key={key} className="space-y-1.5">
                  <Label>Set {i + 1}</Label>
                  <Input placeholder={`${target}-${Math.max(target - 6, 0)}`} value={scores[key]} onChange={(e) => setScores({ ...scores, [key]: e.target.value })} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResultFor(null)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>Save Result</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ParticipantResultsDialog participant={viewing} matches={matches || []} onClose={() => setViewing(null)} />

      {/* Edit match dialog — round/court/date/time/sides */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit Match">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Round</Label><Input value={eForm.round} onChange={(e) => setEForm({ ...eForm, round: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Court</Label><Input value={eForm.court} onChange={(e) => setEForm({ ...eForm, court: e.target.value })} placeholder="Court 1" /></div>
            <div className="space-y-1.5">
              <Label>{isDoubles ? "Team 1" : "Player 1"}</Label>
              <Select disabled={editing?.status === "Completed"} value={eForm.side1Id} onChange={(e) => setEForm({ ...eForm, side1Id: e.target.value })}>
                <option value="">TBD</option>
                {sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isDoubles ? "Team 2" : "Player 2"}</Label>
              <Select disabled={editing?.status === "Completed"} value={eForm.side2Id} onChange={(e) => setEForm({ ...eForm, side2Id: e.target.value })}>
                <option value="">TBD</option>
                {sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={eForm.matchDate} onChange={(e) => setEForm({ ...eForm, matchDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={eForm.matchTime} onChange={(e) => setEForm({ ...eForm, matchTime: e.target.value })} /></div>
          </div>
          {editing?.status === "Completed" && (
            <p className="text-xs text-warning">This match is already scored, so its sides are locked. To change the players/teams, delete the match and add a new one, or use "Edit Result" to correct the score.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={editMatch.isPending}>Save Changes</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

function Row({ name, winner }) {
  return (
    <div className={`flex items-center justify-between rounded px-2 py-1 ${winner ? "bg-success/10 font-semibold text-success" : ""}`}>
      <span className="truncate text-sm">{name}</span>
      {winner && <Trophy className="h-3.5 w-3.5" />}
    </div>
  );
}
