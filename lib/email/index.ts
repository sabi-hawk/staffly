// Email behind an interface. Logs to console when RESEND_API_KEY is blank (§ build rule),
// swaps to the real Resend client when a key is present — same call sites either way.

export interface EmailMessage {
  to: string | string[];
  subject: string;
  /** Plain text or simple HTML body. */
  html: string;
  from?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id: string }>;
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "Staffly <noreply@staffly.test>";

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  async send(msg: EmailMessage): Promise<{ id: string }> {
    const id = `console-${Date.now()}`;
    // eslint-disable-next-line no-console
    console.log(
      `\n📧 [email:console] (RESEND_API_KEY blank — not actually sent)\n` +
        `   from:    ${msg.from || DEFAULT_FROM}\n` +
        `   to:      ${Array.isArray(msg.to) ? msg.to.join(", ") : msg.to}\n` +
        `   subject: ${msg.subject}\n` +
        `   body:    ${msg.html.replace(/<[^>]+>/g, " ").trim().slice(0, 200)}\n`
    );
    return { id };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private apiKey: string) {}
  async send(msg: EmailMessage): Promise<{ id: string }> {
    // Lazy import so the dependency isn't required when the stub is in use.
    const { Resend } = await import("resend");
    const resend = new Resend(this.apiKey);
    const { data, error } = await resend.emails.send({
      from: msg.from || DEFAULT_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    return { id: data?.id ?? "unknown" };
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  const key = process.env.RESEND_API_KEY?.trim();
  provider = key ? new ResendEmailProvider(key) : new ConsoleEmailProvider();
  return provider;
}

export async function sendEmail(msg: EmailMessage): Promise<{ id: string }> {
  return getEmailProvider().send(msg);
}

/** Test seam: override the provider (e.g. an in-memory spy). */
export function __setEmailProvider(p: EmailProvider | null) {
  provider = p;
}
