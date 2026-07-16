// Receiving-account types + display helpers — plain module, safe on server AND client.
// A receiving account is any mechanism a client's payment lands in; its `type` is the "method".

export const RECEIVING_TYPES = [
  { value: "bank", label: "Bank transfer" },
  { value: "payoneer", label: "Payoneer" },
  { value: "wise", label: "Wise" },
  { value: "western_union", label: "Western Union" },
  { value: "other", label: "Other" },
] as const;

export const receivingTypeLabel = (t: string | null | undefined) =>
  RECEIVING_TYPES.find((x) => x.value === t)?.label ?? "Bank transfer";

// The fields that matter per type — drives which inputs the settings form shows.
export const RECEIVING_FIELDS: Record<string, string[]> = {
  bank: ["bank_name", "account_number", "iban", "swift_code", "branch_code", "branch_address"],
  payoneer: ["email"],
  wise: ["email"],
  western_union: ["cnic"],
  other: [],
};

type AccountLike = {
  type?: string | null; label?: string | null; holder_name?: string | null;
  bank_name?: string | null; account_number?: string | null; email?: string | null;
};

/** A one-line label for pickers/banners: "{Type} · {identity}". Prefers an explicit label. */
export function receivingAccountLabel(a: AccountLike | null | undefined): string {
  if (!a) return "—";
  const type = receivingTypeLabel(a.type);
  if (a.label?.trim()) return `${type} · ${a.label.trim()}`;
  let detail = a.holder_name ?? "";
  if (a.type === "bank") detail = [a.bank_name, a.account_number].filter(Boolean).join(" ") || a.holder_name || "";
  else if (a.type === "payoneer" || a.type === "wise") detail = a.email || a.holder_name || "";
  return detail ? `${type} · ${detail}` : type;
}
