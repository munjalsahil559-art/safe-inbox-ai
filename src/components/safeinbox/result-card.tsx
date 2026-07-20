import { motion } from "framer-motion";
import type { DetectionResult } from "@/lib/detect.functions";
import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

const RISK_COLORS: Record<DetectionResult["risk_level"], string> = {
  Low: "oklch(0.72 0.17 155)",
  Medium: "oklch(0.8 0.17 75)",
  High: "oklch(0.72 0.2 45)",
  Critical: "oklch(0.65 0.24 25)",
};

function RiskGauge({ score, level }: { score: number; level: DetectionResult["risk_level"] }) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = RISK_COLORS[level];

  return (
    <div className="relative h-52 w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="oklch(1 0 0 / 0.08)"
          strokeWidth="14"
          fill="none"
        />
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-5xl font-display font-bold tracking-tight"
          style={{ color }}
        >
          {score}
        </motion.div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
          Risk score
        </div>
        <div
          className="mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${color} / 0.15`, color, background: `color-mix(in oklab, ${color} 18%, transparent)` }}
        >
          {level}
        </div>
      </div>
    </div>
  );
}

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  const unique = Array.from(new Set(keywords.filter(Boolean).map((k) => k.trim())))
    .filter((k) => k.length > 0)
    .sort((a, b) => b.length - a.length);
  const escaped = unique.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        regex.test(p) ? (
          <mark
            key={i}
            className="rounded px-1 py-0.5 bg-danger/25 text-danger-foreground border border-danger/40"
            style={{
              background: "color-mix(in oklab, var(--danger) 22%, transparent)",
              color: "oklch(0.98 0.02 25)",
            }}
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

export function ResultCard({ result }: { result: DetectionResult }) {
  const isSpam = result.prediction === "Spam";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-6 md:p-8"
    >
      <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="flex justify-center">
          <RiskGauge score={result.risk_score} level={result.risk_level} />
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            {isSpam ? (
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold bg-danger/15 text-danger border border-danger/30" style={{ background: "color-mix(in oklab, var(--danger) 18%, transparent)", color: "oklch(0.85 0.2 25)" }}>
                <ShieldAlert className="h-4 w-4" />
                Spam detected
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold border" style={{ background: "color-mix(in oklab, var(--safe) 18%, transparent)", color: "oklch(0.9 0.16 155)", borderColor: "color-mix(in oklab, var(--safe) 35%, transparent)" }}>
                <CheckCircle2 className="h-4 w-4" />
                Looks safe
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              via {result.model.split("/")[1] ?? result.model}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Prediction confidence</span>
              <span className="font-mono text-foreground">{result.confidence.toFixed(2)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.7_0.19_190)]"
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-muted/60 border border-border p-4">
            <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="text-sm">
              <div className="font-medium mb-1">Why this classification</div>
              <p className="text-muted-foreground leading-relaxed">{result.reasoning}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-border p-4" style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="text-sm">
              <div className="font-medium mb-1">Recommendation</div>
              <p className="text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </div>
          </div>
        </div>
      </div>

      {(result.keywords.length > 0 || result.features.length > 0) && (
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Suspicious keywords
            </div>
            <div className="flex flex-wrap gap-2 min-h-8">
              {result.keywords.length ? (
                result.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-xs font-medium rounded-full px-2.5 py-1 border"
                    style={{
                      background: "color-mix(in oklab, var(--danger) 12%, transparent)",
                      borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)",
                      color: "oklch(0.88 0.15 25)",
                    }}
                  >
                    {k}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Detected features
            </div>
            <div className="flex flex-wrap gap-2 min-h-8">
              {result.features.length ? (
                result.features.map((f) => (
                  <span
                    key={f}
                    className="text-xs font-medium rounded-full px-2.5 py-1 border border-border bg-muted"
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Message
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm">
          <HighlightedText text={result.input} keywords={result.keywords} />
        </div>
      </div>
    </motion.div>
  );
}
