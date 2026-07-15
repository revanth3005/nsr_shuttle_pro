"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setResult(res);
      toast("If the account exists, a reset token was generated.", "info");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll generate a reset token"
      footer={<Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Working..." : "Generate reset token"}
        </Button>
      </form>

      {result?.token && (
        <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
          <p className="text-muted-foreground">
            No mail server is configured, so your reset token is shown here for the demo:
          </p>
          <code className="block break-all rounded bg-background p-2 font-mono">{result.token}</code>
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}&token=${result.token}`}
            className="inline-block font-medium text-primary hover:underline"
          >
            Continue to reset →
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
