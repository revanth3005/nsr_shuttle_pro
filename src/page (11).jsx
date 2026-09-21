"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trophy, Calendar, MapPin, Trash2 } from "lucide-react";
import { useTournaments, useMe, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Badge, statusVariant } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ROLES, TOURNAMENT_CATEGORIES, TOURNAMENT_FORMATS, TOURNAMENT_STATUS } from "@/lib/excel/schema";
import { formatDate } from "@/lib/utils";

const EMPTY = {
  name: "", description: "", venue: "", startDate: "", endDate: "",
  category: "Singles", format: "Knockout", status: "Draft",
};

export default function TournamentsPage() {
  const { data: me } = useMe();
  const { data: tournaments, isLoading } = useTournaments();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const canWrite = me && me.role !== ROLES.PLAYER;
  const create = useApiMutation((payload) => api.post("/api/tournaments", payload), ["tournaments"]);
  const remove = useApiMutation((id) => api.del(`/api/tournaments/${id}`), ["tournaments"]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onDelete(e, t) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? This removes all its matches, teams and registrations. This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(t.id);
      toast("Tournament deleted", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      toast("Tournament created", "success");
      setOpen(false); setForm(EMPTY);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div>
      <PageHeader title="Tournaments" description="Browse and manage tournaments.">
        {canWrite && <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> New Tournament</Button>}
      </PageHeader>

      {isLoading ? (
        <Spinner />
      ) : !tournaments?.length ? (
        <EmptyState title="No tournaments yet" description="Create your first tournament to get started." icon={Trophy} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{t.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      {canWrite && (
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete tournament"
                          onClick={(e) => onDelete(e, t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{t.description || "No description."}</p>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {t.venue || "TBD"}</p>
                    <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {formatDate(t.startDate) || "TBD"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{t.category}</Badge>
                    <Badge variant="outline">{t.format}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="New Tournament">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input required value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={set("description")} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Venue</Label><Input value={form.venue} onChange={set("venue")} /></div>
            <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={form.startDate} onChange={set("startDate")} /></div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={form.endDate} onChange={set("endDate")} /></div>
            <div className="space-y-1.5"><Label>Category</Label><Select value={form.category} onChange={set("category")}>{TOURNAMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Format</Label><Select value={form.format} onChange={set("format")}>{TOURNAMENT_FORMATS.map((c) => <option key={c}>{c}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onChange={set("status")}>{TOURNAMENT_STATUS.map((c) => <option key={c}>{c}</option>)}</Select></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
