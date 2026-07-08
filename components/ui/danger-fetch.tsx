"use client";
// Universal danger-password prompt. Installed ONCE in the authenticated app shell, it wraps
// window.fetch: when a request comes back `403 { danger: true }` (the server's requireDangerForSuper
// signal for a super-admin hard delete), it opens a password dialog and transparently RETRIES the same
// request with the `x-danger-password` header. This means every existing and future destructive fetch
// is gated with zero per-component wiring. Cancelling returns the original 403 so the caller's normal
// error handling runs. See lib/danger.ts + DECISIONS #98.
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { ShieldAlert } from "lucide-react";

const DANGER_HEADER = "x-danger-password";

// Module-level bridge so the wrapper (plain function) can drive the React dialog.
let openPrompt: ((wrong: boolean) => Promise<string | null>) | null = null;

async function askDanger(wrong: boolean): Promise<string | null> {
  if (!openPrompt) return null;
  return openPrompt(wrong);
}

export function DangerFetchInstaller() {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);

  useEffect(() => {
    openPrompt = (isWrong: boolean) =>
      new Promise<string | null>((resolve) => {
        setWrong(isWrong);
        setValue("");
        setOpen(true);
        resolver.current = resolve;
      });

    const native = window.fetch.bind(window);
    // Guard against double-install (Fast Refresh / remount).
    if ((window as unknown as { __dangerWrapped?: boolean }).__dangerWrapped) return;
    (window as unknown as { __dangerWrapped?: boolean }).__dangerWrapped = true;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const res = await native(input, init);
      if (res.status !== 403) return res;
      // Only intercept the specific danger signal; read a CLONE so the original body stays readable.
      let isDanger = false;
      try { isDanger = !!(await res.clone().json())?.danger; } catch { /* not JSON → not ours */ }
      if (!isDanger) return res;

      let last = res;
      for (let attempt = 0; attempt < 3; attempt++) {
        const pw = await askDanger(attempt > 0);
        if (pw == null) return last; // cancelled → hand back the 403 for normal error handling
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        headers.set(DANGER_HEADER, pw);
        last = await native(input, { ...init, headers });
        if (last.status !== 403) return last;
        try { if (!(await last.clone().json())?.danger) return last; } catch { return last; }
      }
      return last;
    };

    return () => { window.fetch = native; (window as unknown as { __dangerWrapped?: boolean }).__dangerWrapped = false; };
  }, []);

  function submit() {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }
  function cancel() {
    setOpen(false);
    resolver.current?.(null);
    resolver.current = null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cancel(); }}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-danger" /> Danger password required</DialogTitle>
        <DialogDescription>
          This permanent delete is protected. Enter the platform danger password to continue.
          {wrong ? " That password was incorrect." : ""}
        </DialogDescription>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-4 space-y-4">
          <FloatInput
            type="password"
            label="Danger password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancel}>Cancel</Button>
            <Button type="submit" variant="danger" size="sm" disabled={!value}>Confirm delete</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
