"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const DEMOS = [
  { label: "Super Admin", identifier: "super.admin@softonoma.com", password: "Softonoma@SaDM7k29" },
  { label: "Admin / HR", identifier: "admin@softonoma.com", password: "Softonoma@HrAd4n63" },
  { label: "BD Lead (Fatima)", identifier: "fatima.sultan", password: "Softonoma@3310" },
  { label: "BD (Shaiza)", identifier: "shaiza.maheen", password: "Softonoma@1042" },
  { label: "Engineer (Muzammal)", identifier: "muzammil.faiz", password: "Softonoma@6193" },
];

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Which demo button is signing in (so only that one shows a spinner); "" = the main form.
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  async function signIn(e?: React.FormEvent, preset?: { label: string; identifier: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    setActiveDemo(preset?.label ?? null);
    const fail = (msg: string) => { setLoading(false); setActiveDemo(null); toast.error(msg); };
    const supabase = createClient();
    const id = (preset?.identifier ?? identifier).trim();
    const pwd = preset?.password ?? password;

    // Resolve a username to its account email (admins use email directly).
    let loginEmail = id;
    if (!id.includes("@")) {
      const { data, error: rpcErr } = await supabase.rpc("resolve_login_email", { identifier: id });
      if (rpcErr || !data) return fail("Invalid username or password");
      loginEmail = data as string;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: pwd });
    if (error) return fail("Invalid username/email or password");
    // Keep the loading state through the navigation (router.push + refresh take ~1-2s) so the button
    // doesn't flash back to "Sign in" while the app shell loads.
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

          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("disabled") && (
            <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-caption text-danger">
              Your account is deactivated. Please contact an administrator.
            </div>
          )}

          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Username or email</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="first.last  or  you@softonoma.com"
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
              {loading && activeDemo === null ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </form>

          {process.env.NODE_ENV !== "production" && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-caption text-text-secondary">Quick demo login (dev only)</p>
              <div className="flex flex-wrap gap-2">
                {DEMOS.map((d) => (
                  <Button
                    key={d.label}
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    className="whitespace-nowrap"
                    onClick={() => signIn(undefined, { label: d.label, identifier: d.identifier, password: d.password })}
                  >
                    {activeDemo === d.label && <Loader2 className="size-4 animate-spin" />} {d.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
