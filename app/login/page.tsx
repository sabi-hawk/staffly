"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const DEMOS = [
  { label: "Super Admin", email: "founder@acme.test", password: "Test@12345" },
  { label: "Admin / HR", email: "hr@acme.test", password: "Test@12345" },
  { label: "Employee", email: "muzammilfaiz.dev@gmail.com", password: "Softonoma@123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e?: React.FormEvent, preset?: { email: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: preset?.email ?? email,
      password: preset?.password ?? password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // best-effort: record login activity (IP + device) for the audit trail
    fetch("/api/audit/login", { method: "POST" }).catch(() => {});
    toast.success("Welcome back");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <Image src="/softonoma-logo.png" alt="Softonoma" width={220} height={56} priority />
        </div>

        <Card className="p-6 shadow-soft">
          <h1 className="text-h2 text-text-primary">Employee Portal</h1>
          <p className="mb-5 text-caption text-text-secondary">Sign in to continue.</p>

          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@acme.test"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-caption text-text-secondary">Quick demo login</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMOS.map((d) => (
                <Button
                  key={d.email}
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => signIn(undefined, { email: d.email, password: d.password })}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
