import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Trash2, Copy, ExternalLink, BarChart3, Clock, Link2, Pencil } from "lucide-react";
import {
  fetchShortLinkHistory,
  deleteShortLink,
  type ShortLinkItem,
} from "@/apis/history";
import StatsDialog from "./StatsDialog";
import EditLinkDialog from "./EditLinkDialog";

function relativeTime(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  if (diff < 0) {
    if (minutes < 1) return "Expired";
    if (minutes < 60) return `Expired ${minutes}m ago`;
    if (hours < 24) return `Expired ${hours}h ago`;
    return `Expired ${days}d ago`;
  }
  if (minutes < 1) return "Expires now";
  if (minutes < 60) return `Expires in ${minutes}m`;
  if (hours < 24) return `Expires in ${hours}h`;
  return `Expires in ${days}d`;
}

interface Props {
  refetchTrigger?: number;
  onDelete?: () => void;
}

const ShortLinkHistory: React.FC<Props> = ({
  refetchTrigger = 0,
  onDelete,
}) => {
  const [items, setItems] = useState<ShortLinkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const genRef = useRef(0);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [statsSlug, setStatsSlug] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<ShortLinkItem | null>(null);

  const load = useCallback(async (reset = false) => {
    const gen = ++genRef.current;
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await fetchShortLinkHistory(20, currentOffset);
      if (gen !== genRef.current) return;
      if (res) {
        if (reset) {
          setItems(res.items);
          setOffset(res.items.length);
        } else {
          setItems((prev) => [...prev, ...res.items]);
          setOffset((prev) => prev + res.items.length);
        }
        setTotal(res.total);
        setHasMore(res.hasMore);
      } else {
        setItems([]);
        setTotal(0);
        setHasMore(false);
      }
    } catch (e) {
      if (gen !== genRef.current) return;
      toast.error(
        e instanceof Error ? e.message : "Failed to load history",
      );
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [offset]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchTrigger]);

  const handleCopy = async (item: ShortLinkItem) => {
    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${item.slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(item.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDelete = async (item: ShortLinkItem) => {
    setDeletingSlug(item.slug);
    try {
      const ok = await deleteShortLink(item.slug);
      if (ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setTotal((prev) => prev - 1);
        toast.success("Link deleted");
      } else {
        toast.error("Failed to delete link");
      }
    } catch {
      toast.error("Failed to delete link");
    } finally {
      setDeletingSlug(null);
    }
  };

  const totalClicks = items.reduce((sum, i) => sum + i.clickCount, 0);
  /* eslint-disable react-hooks/purity */
  const activeLinks = items.filter(
    (i) => new Date(i.expiredAt).getTime() > Date.now(),
  ).length;
  /* eslint-enable react-hooks/purity */

  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Link2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No links yet
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Shorten a URL and it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{totalClicks} total clicks</span>
        </div>
        <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Link2 className="h-3.5 w-3.5" />
          <span>{activeLinks} active</span>
        </div>
        <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{total} total</span>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const shortUrl = `/${item.slug}`;
          const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${item.slug}`;
          /* eslint-disable react-hooks/purity */
          const isExpired =
            new Date(item.expiredAt).getTime() < Date.now();
          /* eslint-enable react-hooks/purity */

          return (
            <li
              key={item.id}
              className="group relative rounded-xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 transition-colors hover:border-gray-300 dark:hover:border-gray-700"
            >
              <div className="flex items-start gap-3">
                {item.ogImage ? (
                  <img
                    src={item.ogImage}
                    alt=""
                    className="hidden sm:block h-16 w-24 shrink-0 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {shortUrl}
                    </a>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hidden sm:inline-flex shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {item.ogTitle && (
                    <p className="mt-0.5 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.ogTitle}
                    </p>
                  )}
                  {item.ogDescription && (
                    <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {item.ogDescription}
                    </p>
                  )}
                  <p
                    className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400"
                    title={item.url}
                  >
                    {item.url}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {item.clickCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className={isExpired ? "text-red-500 dark:text-red-400" : ""}>
                        {relativeTime(item.expiredAt)}
                      </span>
                    </span>
                    {isExpired && (
                      <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                  <button
                    type="button"
                    onClick={() => setStatsSlug(item.slug)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                    title="View stats"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLink(item)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                    title="Edit link"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                    title="Copy link"
                  >
                    {copiedSlug === item.slug ? (
                      <span className="text-[10px] font-medium text-green-500 px-1">Copied</span>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingSlug === item.slug}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete link"
                  >
                    {deletingSlug === item.slug ? (
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => load(false)}
          disabled={loadingMore}
          className="w-full rounded-xl border border-gray-200/60 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loadingMore ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          ) : (
            `Show more (${total - items.length} remaining)`
          )}
        </button>
      )}

      <StatsDialog
        open={!!statsSlug}
        onOpenChange={(open) => {
          if (!open) setStatsSlug(null);
        }}
        slug={statsSlug ?? ""}
      />

      <EditLinkDialog
        open={!!editingLink}
        onOpenChange={(open) => {
          if (!open) setEditingLink(null);
        }}
        link={editingLink}
        onSuccess={() => {
          setEditingLink(null);
          onDelete?.();
        }}
      />
    </div>
  );
};

export default ShortLinkHistory;
