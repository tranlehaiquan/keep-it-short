import React, { useEffect, useState } from "react";
import {
  fetchShortLinkHistory,
  type ShortLinkItem,
} from "@/apis/history";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  );
}

interface Props {
  refetchTrigger?: number;
}

const ShortLinkHistory: React.FC<Props> = ({ refetchTrigger = 0 }) => {
  const [data, setData] = useState<ShortLinkItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchShortLinkHistory();
      setData(res?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refetchTrigger]);

  const handleCopy = async (item: ShortLinkItem) => {
    const shortUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${item.slug}`;
    const ok = await copyToClipboard(shortUrl);
    if (ok) {
      setCopiedSlug(item.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  };

  if (loading && !data) {
    return (
      <div className="mt-8 bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.07)] border border-gray-100 p-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Your links</h2>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.07)] border border-gray-100 p-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Your links</h2>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="mt-8 w-full max-w-lg bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.07)] border border-gray-100 p-8 sm:p-10">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Your links</h2>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No short links yet. Shorten a URL above and it will appear here.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const shortUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${item.slug}`;
            const isExpired =
              new Date(item.expiredAt).getTime() < Date.now();
            return (
              <li
                key={item.id}
                className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-600 hover:underline break-all text-sm"
                    >
                      {shortUrl}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      className="shrink-0 text-xs px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                    >
                      {copiedSlug === item.slug ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm truncate" title={item.url}>
                    → {item.url}
                  </p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{item.clickCount} clicks</span>
                    <span>Expires: {formatDate(item.expiredAt)}</span>
                    {isExpired && (
                      <span className="text-amber-600 font-medium">Expired</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ShortLinkHistory;
