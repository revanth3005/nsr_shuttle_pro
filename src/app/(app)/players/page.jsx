"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { usePlayers, useMe, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner } from "@/components/shared";
import { DataGrid } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ROLES, SKILL_LEVELS } from "@/lib/excel/schema";

const EMPTY = {
  firstName: "", lastName: "", gender: "Male", age: "", mobile: "", email: "",
  city: "", state: "", club: "", skillLevel: "Beginner",
};

export default function PlayersPage() {
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const { data: players, isLoading } = usePlayers(q);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const canWrite = me && me.role !== ROLES.PLAYER;
  const canDelete = me?.role === ROLES.SUPER_ADMIN;

  const save = useApiMutation(
    (payload) =>
      editing ? api.patch(`/api/players/${editing}`, payload) : api.post("/api/players", payload),
    ["players"]
  );
  const remove = useApiMutation((id) => api.del(`/api/players/${id}`), ["players"]);

  const columns = useMemo(
    () => [
      { headerName: "Name", valueGetter: (p) => `${p.data.firstName} ${p.data.lastName}`, minWidth: 160 },
      { field: "gender", width: 100 },
      { field: "club", minWidth: 130 },
      { field: "city", minWidth: 120 },
      { field: "skillLevel", headerName: "Skill", minWidth: 130 },
      { field: "currentPoints", headerName: "Points", width: 110 },
      { field: "matchesPlayed", headerName: "Played", width: 100 },
      { field: "wins", width: 90 },
      { field: "winPercentage", headerName: "Win %", width: 100, valueFormatter: (p) => `${p.value ?? 0}%` },
      {
        headerName: "Actions",
        pinned: "right",
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (p) => (canWrite ? actionButtons(p.data) : null),
      },
    ],
    [canWrite, canDelete]
  );

  function actionButtons(row) {
    return (
      <div className="flex items-center gap-1">
        <button
          className="rounded p-1 hover:bg-accent/10"
          onClick={() => { setEditing(row.id); setForm({ ...EMPTY, ...row }); setOpen(true); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {canDelete && (
          <button
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            onClick={async () => {
              if (!confirm("Delete this player?")) return;
              await remove.mutateAsync(row.id);
              toast("Player deleted", "success");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast(editing ? "Player updated" : "Player created", "success");
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Players" description="Manage player profiles and statistics.">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="w-full pl-9 sm:w-64" placeholder="Search players..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Player
          </Button>
        )}
      </PageHeader>

      {isLoading ? <Spinner /> : <DataGrid rows={players} columns={columns} />}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit Player" : "Add Player"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><Input required value={form.firstName} onChange={set("firstName")} /></Field>
            <Field label="Last name"><Input value={form.lastName} onChange={set("lastName")} /></Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set("gender")}>
                <option>Male</option><option>Female</option><option>Other</option>
              </Select>
            </Field>
            <Field label="Age"><Input type="number" value={form.age} onChange={set("age")} /></Field>
            <Field label="Mobile"><Input value={form.mobile} onChange={set("mobile")} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="City"><Input value={form.city} onChange={set("city")} /></Field>
            <Field label="State"><Input value={form.state} onChange={set("state")} /></Field>
            <Field label="Club"><Input value={form.club} onChange={set("club")} /></Field>
            <Field label="Skill level">
              <Select value={form.skillLevel} onChange={set("skillLevel")}>
                {SKILL_LEVELS.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
