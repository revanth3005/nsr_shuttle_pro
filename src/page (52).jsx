"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: params.get("email") || "",
    token: params.get("token") || "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", form);
      toast("Password reset. Please sign in.", "success");
      router.push("/login");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" required value={form.email} onChange={set("email")} />
      </div>
      <div className="space-y-2">
        <Label>Reset token</Label>
        <Input required value={form.token} onChange={set("token")} />
      </div>
      <div className="space-y-2">
        <Label>New password</Label>
        <Input type="password" required minLength={6} value={form.newPassword} onChange={set("newPassword")} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      footer={<Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
