import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Link2, Copy, Check, ArrowRight } from "lucide-react";
import client from "./apis/client";
import { authClient } from "./lib/auth-client";
import { QRCodeCanvas } from "qrcode.react";
import Header from "./components/Header";
import ShortLinkHistory from "./components/ShortLinkHistory";
import ResetPasswordDialog from "./components/auth/ResetPasswordDialog";

function App() {
  const { useSession } = authClient;
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [ogTitle, setOgTitle] = useState<string | null>(null);
  const [ogDescription, setOgDescription] = useState<string | null>(null);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyRefetchTrigger, setHistoryRefetchTrigger] = useState(0);

  const resetToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? undefined;
  }, []);
  const [resetOpen, setResetOpen] = useState(!!resetToken);

  useEffect(() => {
    if (resetToken) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [resetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShortUrl("");
    setExpiredAt("");
    setOgTitle(null);
    setOgDescription(null);
    setOgImage(null);
    setCopied(false);

    try {
      const normalizedUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`;
      const body: { url: string; slug?: string } = { url: normalizedUrl };
      if (slug.trim()) body.slug = slug.trim();

      const response = await client.api.url.$post({ json: body });
      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData?.error || "Failed to shorten URL");
      }

      const data = await response.json();
      setShortUrl(data.shortUrl);
      setExpiredAt(data.expiredAt);
      setOgTitle(data.ogTitle ?? null);
      setOgDescription(data.ogDescription ?? null);
      setOgImage(data.ogImage ?? null);
      setHistoryRefetchTrigger((n) => n + 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to shorten URL";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const formatExpiry = (dateStr: string) =>
    new Date(dateStr).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const isLoggedIn = !!session;

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div
          className={
            isLoggedIn
              ? "mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:py-12"
              : "mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:py-20"
          }
        >
          {/* Left column: branding + form + result */}
          <div className="flex flex-col">
            {/* Compact branding */}
            <div className="mb-8 flex items-center gap-3 sm:mb-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">
                  Keep It <span className="text-blue-600">Short</span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Shorten URLs in seconds
                </p>
              </div>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="url"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Paste your long URL
                  </label>
                  <input
                    id="url"
                    type="text"
                    placeholder="https://example.com/very-long-url-here"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="slug"
                    className="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    Custom slug{" "}
                    <span className="text-gray-400 dark:text-gray-500">
                      (optional)
                    </span>
                  </label>
                  <div className="flex rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-all focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-950 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <span className="hidden sm:flex items-center pl-4 text-sm text-gray-400 dark:text-gray-500 select-none">
                      kis.cc/
                    </span>
                    <input
                      id="slug"
                      type="text"
                      placeholder="my-link"
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.replace(/[^0-9A-Za-z_-]/g, ""))
                      }
                      maxLength={16}
                      className="flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    4-16 chars: letters, numbers, hyphens, underscores
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-400 dark:disabled:bg-blue-800"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-5 w-5 animate-spin"
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
                      Shortening...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Shorten URL
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </button>
              </form>

              {/* Success result */}
              {shortUrl && (
                <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Link created
                    </span>
                  </div>

                  <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 p-4">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shortUrl}
                        className="flex-1 bg-transparent text-sm font-semibold text-blue-700 dark:text-blue-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2 rounded-lg bg-white/60 dark:bg-gray-900/50 p-2.5">
                        <QRCodeCanvas
                          value={shortUrl}
                          size={72}
                          bgColor="transparent"
                          fgColor="currentColor"
                          className="text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-gray-500 dark:text-gray-400">
                          Expires
                        </div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {formatExpiry(expiredAt)}
                        </div>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Open link <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    {(ogTitle || ogDescription || ogImage) && (
                      <div className="mt-3 rounded-lg border border-gray-200/60 dark:border-gray-800 bg-white/60 dark:bg-gray-950/50 p-3">
                        <div className="flex items-start gap-3">
                          {ogImage && (
                            <img
                              src={ogImage}
                              alt=""
                              className="h-14 w-20 shrink-0 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            {ogTitle && (
                              <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {ogTitle}
                              </p>
                            )}
                            {ogDescription && (
                              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                                {ogDescription}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column: history (logged in only) */}
          {isLoggedIn && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Your links
                  </h2>
                </div>
                <div className="max-h-[calc(100vh-16rem)] overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
                  <ShortLinkHistory
                    refetchTrigger={historyRefetchTrigger}
                    onDelete={() =>
                      setHistoryRefetchTrigger((n) => n + 1)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {resetToken && (
        <ResetPasswordDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          token={resetToken}
        />
      )}
    </>
  );
}

export default App;
