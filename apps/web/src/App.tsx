import { useState, useRef } from "react";
import client from "./apis/client";
import { QRCodeCanvas } from "qrcode.react";

function App() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShortUrl("");
    setExpiredAt("");

    try {
      const response = await client.url.$post({ json: { url } });
      if (!response.ok) {
        throw new Error("Failed to shorten URL");
      }

      const data = await response.json();
      setShortUrl(data.shortUrl);
      setExpiredAt(data.expiredAt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-100 via-white to-gray-50 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-lg">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-block p-3 rounded-2xl bg-blue-600 shadow-xl shadow-blue-200 mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              ></path>
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-4">
            Keep It <span className="text-blue-600">Short</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-sm mx-auto">
            Transform your long, messy links into clean, powerful short URLs in
            seconds.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,112,184,0.07)] border border-gray-100 p-8 sm:p-10 transition-all hover:shadow-[0_20px_50px_rgba(8,112,184,0.12)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="url"
                className="text-sm font-semibold text-gray-700 ml-1"
              >
                Paste your long URL
              </label>
              <input
                id="url"
                type="url"
                placeholder="https://example.com/very-long-url-here"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all duration-300 text-gray-900 placeholder:text-gray-400 text-base shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all duration-200 flex items-center justify-center text-lg"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Shortening...
                </>
              ) : (
                "Shorten Now"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {shortUrl && (
            <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-500">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                Successfully Shortened
              </p>
              <div className="bg-blue-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                <input
                  readOnly
                  value={shortUrl}
                  className="flex-1 bg-transparent border-none text-blue-700 font-bold break-all outline-none text-center sm:text-left"
                />
              </div>

              {!!shortUrl && (
                <div
                  ref={qrCodeRef}
                  className="mt-4 flex flex-col items-center gap-y-2"
                >
                  <QRCodeCanvas value={shortUrl} size={128} />
                </div>
              )}

              {expiredAt && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Link expires on:{" "}
                  <span className="font-semibold text-gray-700">
                    {formatExpiry(expiredAt)}
                  </span>
                </p>
              )}

              <div className="mt-4 text-center">
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
                >
                  Visit Link &rarr;
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-gray-400 text-sm font-medium">
          Built with <span className="text-blue-500">React</span> &{" "}
          <span className="text-cyan-500">Tailwind CSS</span>
        </p>
      </div>
    </div>
  );
}

export default App;
