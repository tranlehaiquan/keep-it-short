import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchShortLinkStats, type StatsResponse } from "@/apis/history";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No data yet</p>;
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-20 shrink-0 truncate text-right text-[11px] text-gray-500 dark:text-gray-400" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-5 rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length], minWidth: item.value > 0 ? 4 : 0 }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] font-medium text-gray-700 dark:text-gray-300">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const StatsDialog: React.FC<Props> = ({ open, onOpenChange, slug }) => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchShortLinkStats(slug)
      .then(setStats)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load stats");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, slug, onOpenChange]);

  const totalClicks = stats
    ? stats.daily.reduce((sum, d) => sum + d.clicks, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Click Analytics — /{slug}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{totalClicks} total clicks</span>
            </div>

            <BarChart
              label="Daily Clicks (last 30 days)"
              data={stats.daily.map((d) => ({ label: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: d.clicks }))}
            />

            <BarChart
              label="Browsers"
              data={stats.browsers.map((b) => ({ label: b.name, value: b.clicks }))}
            />

            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Operating Systems
              </div>
              <div className="grid grid-cols-2 gap-2">
                {stats.oses.map((os, i) => (
                  <div key={os.name} className="flex items-center justify-between rounded-lg border border-gray-200/60 dark:border-gray-800 px-3 py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{os.name}</span>
                    <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400" style={{ color: COLORS[i % COLORS.length] }}>
                      {os.clicks}
                    </span>
                  </div>
                ))}
                {stats.oses.length === 0 && (
                  <p className="col-span-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">No data yet</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default StatsDialog;
