export interface ShortLinkItem {
  id: number;
  slug: string;
  url: string;
  clickCount: number;
  createdAt: string | null;
  expiredAt: string;
  createdBy: string | null;
}

export interface HistoryResponse {
  items: ShortLinkItem[];
}

const getApiBase = () =>
  import.meta.env.DEV ? "" : (typeof window !== "undefined" ? window.location.origin : "");

export async function fetchShortLinkHistory(): Promise<HistoryResponse | null> {
  const res = await fetch(`${getApiBase()}/api/url/history`, {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error("Failed to load history");
  }
  return res.json();
}

export async function deleteShortLink(slug: string): Promise<boolean> {
  const res = await fetch(`${getApiBase()}/api/url/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Link not found");
    throw new Error("Failed to delete link");
  }
  return true;
}

export async function updateShortLink(
  slug: string,
  data: { url?: string; expiredAt?: string },
): Promise<ShortLinkItem> {
  const res = await fetch(`${getApiBase()}/api/url/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to update link");
  }
  return res.json();
}

export interface StatsResponse {
  daily: { date: string; clicks: number }[];
  browsers: { name: string; clicks: number }[];
  oses: { name: string; clicks: number }[];
}

export async function fetchShortLinkStats(slug: string): Promise<StatsResponse> {
  const res = await fetch(`${getApiBase()}/api/url/${encodeURIComponent(slug)}/stats`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to load stats");
  }
  return res.json();
}
