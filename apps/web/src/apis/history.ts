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
