import { motion } from "framer-motion";
import type { UrlFlag } from "@/lib/url-reputation";
import { Link2, QrCode, ShieldAlert, ShieldCheck } from "lucide-react";

const RISK_COLORS: Record<UrlFlag["risk"], string> = {
  Safe: "oklch(0.72 0.17 155)",
  Low: "oklch(0.78 0.15 130)",
  Medium: "oklch(0.8 0.17 75)",
  High: "oklch(0.72 0.2 45)",
  Critical: "oklch(0.65 0.24 25)",
};

export function UrlFlagsPanel({ flags }: { flags: UrlFlag[] }) {
  if (!flags.length) return null;
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Link &amp; QR reputation
        </div>
        <div className="text-xs text-muted-foreground">
          {flags.length} link{flags.length === 1 ? "" : "s"} checked
        </div>
      </div>
      <div className="space-y-2">
        {flags.map((f, i) => {
          const color = RISK_COLORS[f.risk];
          const risky = f.risk !== "Safe";
          return (
            <motion.div
              key={`${f.url}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-background/40 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: `color-mix(in oklab, ${color} 18%, transparent)`,
                    color,
                  }}
                >
                  {f.source === "qr" ? (
                    <QrCode className="h-4 w-4" />
                  ) : risky ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                      style={{
                        color,
                        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
                        background: `color-mix(in oklab, ${color} 12%, transparent)`,
                      }}
                    >
                      {f.risk} · {f.score}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {f.source === "qr" ? "From QR code" : "In message"}
                    </span>
                    <span className="text-xs font-mono truncate max-w-full">{f.domain}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">{f.url}</span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {f.reasons.map((r) => (
                      <li
                        key={r}
                        className="text-[11px] rounded-full px-2 py-0.5 border border-border bg-muted"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
