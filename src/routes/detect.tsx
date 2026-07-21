import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Sparkles, MessageSquare, Mail } from "lucide-react";
import { toast } from "sonner";
import { detectMessage, type DetectionResult } from "@/lib/detect.functions";
import { ResultCard } from "@/components/safeinbox/result-card";
import { saveHistoryEntry } from "@/lib/scan-history";
import { QrScanner, type QrScanResult } from "@/components/safeinbox/qr-scanner";


export const Route = createFileRoute("/detect")({
  head: () => ({
    meta: [
      { title: "Detect — SafeInbox" },
      { name: "description", content: "Paste any SMS or email to get an AI risk analysis." },
    ],
  }),
  component: DetectPage,
});

const SAMPLES: Record<"sms" | "email", { label: string; text: string }[]> = {
  sms: [
    {
      label: "Prize scam",
      text: "Congratulations! You've been selected to receive a FREE iPhone 16 Pro. Click here now to claim: bit.ly/claim-prize-2026. Offer expires in 1 hour!",
    },
    {
      label: "Bank OTP",
      text: "URGENT: Your account will be blocked. Verify with OTP 748291 at http://secure-bank-verify.co within 10 minutes.",
    },
    {
      label: "Legit reminder",
      text: "Hi Alex, just confirming your dentist appointment tomorrow at 3pm. Reply CANCEL to reschedule.",
    },
  ],
  email: [
    {
      label: "Phishing",
      text: "Subject: [Action Required] Password Expiry Notice\n\nDear user, your Microsoft 365 password expires in 24 hours. Confirm your credentials here: http://login-microsoft-security.net/reset to avoid account suspension.",
    },
  ],
};

function DetectPage() {
  const detect = useServerFn(detectMessage);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"sms" | "email">("sms");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [qrs, setQrs] = useState<QrScanResult[]>([]);
  const navigate = useNavigate();


  async function analyze() {
    const trimmed = text.trim();
    if (!trimmed && qrs.length === 0) {
      toast.error("Paste a message or attach a QR code to analyze.");
      return;
    }
    setLoading(true);
    const payload = trimmed || qrs.map((q) => q.payload).join("\n");
    try {
      const r = await detect({
        data: {
          text: payload,
          kind,
          qr_payloads: qrs.map((q) => q.payload),
        },
      });

      setResult(r);
      void saveHistoryEntry(r).catch((err) => console.error(err));
      toast[r.prediction === "Spam" ? "error" : "success"](
        r.prediction === "Spam" ? `Spam detected (${r.risk_level})` : "Message looks safe",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      if (msg.includes("429")) toast.error("Rate limit reached — try again in a moment.");
      else if (msg.includes("402"))
        toast.error("AI credits exhausted. Add credits in your workspace to continue.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Detector
        </div>
        <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight">
          Analyze a message
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Paste the full SMS or email content. SafeInbox returns a risk score, confidence,
          suspicious keywords, and a plain-English explanation.
        </p>
      </motion.div>

      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setKind("sms")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              kind === "sms"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> SMS
          </button>
          <button
            onClick={() => setKind("email")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              kind === "email"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "sms"
              ? "Paste the suspicious SMS here…"
              : "Paste the email (subject + body) here…"
          }
          rows={kind === "email" ? 10 : 6}
          className="w-full resize-none rounded-2xl bg-background/60 border border-border p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          maxLength={20000}
        />

        <div className="mt-4">
          <QrScanner
            results={qrs}
            onAdd={(r) => setQrs((prev) => [...prev, r])}
            onRemove={(i) => setQrs((prev) => prev.filter((_, idx) => idx !== i))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {SAMPLES[kind].map((s) => (
              <button
                key={s.label}
                onClick={() => setText(s.text)}
                className="text-xs rounded-full border border-border bg-background/40 px-3 py-1 hover:bg-accent transition"
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {text.length} chars{qrs.length ? ` · ${qrs.length} QR` : ""}
            </span>
            <button
              onClick={analyze}
              disabled={loading || (!text.trim() && qrs.length === 0)}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed glow transition"
            >

              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-8">
          <ResultCard result={result} />
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate({ to: "/history" })}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              View all scans →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
