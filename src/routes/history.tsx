import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  clearHistory,
  deleteHistoryEntry,
  loadHistory,
  type HistoryEntry,
} from "@/lib/scan-history";
import { Search, Trash2, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — SafeInbox" },
      { name: "description", content: "Search and manage every message you've scanned." },
    ],
  }),
  component: HistoryPage,
});

const RISK_COLORS: Record<string, string> = {
  Low: "oklch(0.72 0.17 155)",
  Medium: "oklch(0.8 0.17 75)",
  High: "oklch(0.72 0.2 45)",
  Critical: "oklch(0.65 0.24 25)",
};

function toCsv(items: HistoryEntry[]): string {
  const header = ["date", "kind", "prediction", "risk_level", "risk_score", "confidence", "message"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = items.map((i) =>
    [
      new Date(i.analyzed_at).toISOString(),
      i.kind,
      i.prediction,
      i.risk_level,
      i.risk_score.toString(),
      i.confidence.toString(),
      i.input,
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "spam" | "safe">("all");

  useEffect(() => {
    const sync = () => setItems(loadHistory());
    sync();
    window.addEventListener("safeinbox:history", sync);
    return () => window.removeEventListener("safeinbox:history", sync);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter === "spam" && i.prediction !== "Spam") return false;
      if (filter === "safe" && i.prediction !== "Safe") return false;
      if (q && !i.input.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, q, filter]);

  function exportCsv() {
    if (!items.length) return;
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safeinbox-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} scans`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">History</h1>
          <p className="mt-2 text-muted-foreground">
            {items.length} scan{items.length === 1 ? "" : "s"} stored locally.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!items.length}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              if (!items.length) return;
              if (confirm("Clear all history?")) {
                clearHistory();
                toast.success("History cleared");
              }
            }}
            disabled={!items.length}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 transition"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages…"
            className="w-full rounded-full bg-background/60 border border-border pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          {(["all", "spam", "safe"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">No scans match.</p>
          <Link
            to="/detect"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            Scan a message
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const spam = i.prediction === "Spam";
            const color = RISK_COLORS[i.risk_level];
            return (
              <div key={i.id} className="glass rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${color} 18%, transparent)`,
                      color,
                    }}
                  >
                    {spam ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={{
                          color,
                          borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
                          background: `color-mix(in oklab, ${color} 12%, transparent)`,
                        }}
                      >
                        {i.risk_level} · {i.risk_score}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {i.kind.toUpperCase()} · {new Date(i.analyzed_at).toLocaleString()} ·{" "}
                        {i.confidence.toFixed(1)}% confidence
                      </span>
                    </div>
                    <p className="mt-2 text-sm line-clamp-3 whitespace-pre-wrap">{i.input}</p>
                    {i.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {i.keywords.slice(0, 5).map((k) => (
                          <span
                            key={k}
                            className="text-[11px] rounded-full px-2 py-0.5 border border-border bg-muted"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteHistoryEntry(i.id)}
                    className="text-muted-foreground hover:text-danger transition shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
