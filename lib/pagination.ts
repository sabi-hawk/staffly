// Plain constants shared by server pages AND the client Pagination component.
// IMPORTANT: keep these out of the "use client" module — importing values from a client
// module into a server component yields a client-reference proxy, not the value.
export const PAGE_SIZES = [10, 25, 50, 100, 200, 300];
export const DEFAULT_PAGE_SIZE = 10;

/** Parse page/pageSize search params safely (server-side). */
export function parsePaging(searchParams: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = Number(searchParams.pageSize) || DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}
