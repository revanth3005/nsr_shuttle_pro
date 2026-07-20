"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useClubs, useMe, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner } from "@/components/shared";
import { DataGrid } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/excel/schema";

const EMPTY = { name: "", address: "", city: "", state: "", contactPerson: "", contactNumber: "", members: 0 };

export default function ClubsPage() {
  const { data: me } = useMe();
  const { data: clubs, isLoading } = useClubs();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const canWrite = me && me.role !== ROLES.PLAYER;
  const canDelete = me?.role === ROLES.SUPER_ADMIN;

  const save = useApiMutation(
    (payload) => (editing ? api.patch(`/api/clubs/${editing}`, payload) : api.post("/api/clubs", payload)),
    ["clubs"]
  );
  const remove = useApiMutation((id) => api.del(`/api/clubs/${id}`), ["clubs"]);

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Club", minWidth: 180 },
      { field: "city", minWidth: 120 },
      { field: "state", minWidth: 120 },
      { field: "contactPerson", headerName: "Contact", minWidth: 150 },
      { field: "contactNumber", headerName: "Phone", minWidth: 130 },
      { field: "members", width: 110 },
      {
        headerName: "Actions", pinned: "right", width: 120, sortable: false, filter: false,
        cellRenderer: (p) =>
          canWrite ? (
            <div className="flex items-center gap-1">
              <button className="rounded p-1 hover:bg-accent/10" onClick={() => { setEditing(p.data.id); setForm({ ...EMPTY, ...p.data }); setOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={async () => { if (confirm("Delete club?")) { await remove.mutateAsync(p.data.id); toast("Club deleted", "success"); } }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : null,
      },
    ],
    [canWrite, canDelete]
  );

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast(editing ? "Club updated" : "Club created", "success");
      setOpen(false); setEditing(null); setForm(EMPTY);
    } catch (err) {
      toast(err.message, "error");
    }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Clubs" description="Registered clubs and their contacts.">
        {canWrite && <Button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> Add Club</Button>}
      </PageHeader>

      {isLoading ? <Spinner /> : <DataGrid rows={clubs} columns={columns} />}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit Club" : "Add Club"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Club name</Label><Input required value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={set("address")} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
            <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={set("state")} /></div>
            <div className="space-y-1.5"><Label>Contact person</Label><Input value={form.contactPerson} onChange={set("contactPerson")} /></div>
            <div className="space-y-1.5"><Label>Contact number</Label><Input value={form.contactNumber} onChange={set("contactNumber")} /></div>
            <div className="space-y-1.5"><Label>Members</Label><Input type="number" value={form.members} onChange={set("members")} /></div>
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
