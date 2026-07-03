import { redirect } from "next/navigation";

// FRD-07: Interviews are now a tab in the CRM Leads hub. Keep this route as a redirect so old
// links/bookmarks land on the right tab (preserving any query string).
export default function CrmInterviewsRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const qs = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v != null) as [string, string][]
  );
  qs.set("tab", "interviews");
  redirect(`/crm/leads?${qs.toString()}`);
}
