"use client";

import { useEffect, useState } from "react";
import { KeyRound, SlidersHorizontal } from "lucide-react";
import { useMe, usePointsConfig, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/excel/schema";

export default function SettingsPage() {
  const { data: me } = useMe();
  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and, if permitted, system configuration." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChangePasswordCard />
        {me?.role === ROLES.SUPER_ADMIN && <PointsConfigCard />}
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const change = useApiMutation((payload) => api.post("/api/auth/change-password", payload));

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await change.mutateAsync(form);
      toast("Password changed", "success");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Change Password</CardTitle>
        <CardDescription>Update your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Current password</Label><Input type="password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" required minLength={6} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></div>
          <Button type="submit" disabled={change.isPending}>{change.isPending ? "Saving…" : "Update Password"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PointsConfigCard() {
  const { data: config, isLoading } = usePointsConfig();
  const { toast } = useToast();
  const [values, setValues] = useState({});
  const save = useApiMutation((payload) => api.put("/api/points-config", payload), ["pointsConfig"]);

  useEffect(() => {
    if (config) setValues(Object.fromEntries(config.map((c) => [c.key, c.value])));
  }, [config]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await save.mutateAsync(values);
      toast("Points configuration saved", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4 text-primary" /> Points Configuration</CardTitle>
        <CardDescription>Configure points awarded across the tournament ladder.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {config?.map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <Label>{c.label}</Label>
                  <Input type="number" value={values[c.key] ?? ""} onChange={(e) => setValues({ ...values, [c.key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Configuration"}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
