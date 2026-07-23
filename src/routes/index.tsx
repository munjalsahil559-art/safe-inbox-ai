import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  Eye,
  BarChart3,
  MessageSquareWarning,
  Mail,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: ShieldCheck,
    title: "AI-powered detection",
    body: "Modern language models catch phishing, scams, and social engineering that keyword filters miss.",
  },
  {
    icon: Eye,
    title: "Explainable results",
    body: "See risk score, confidence, suspicious keywords, and a plain-English reason for every verdict.",
  },
  {
    icon: Zap,
    title: "Real-time analysis",
    body: "Paste an SMS or email and get a full breakdown in seconds — no setup, no accounts required.",
  },
  {
    icon: BarChart3,
    title: "Scan history & trends",
    body: "Track everything you've scanned, filter by risk, and export for later review.",
  },
];

const threats = [
  { icon: MessageSquareWarning, label: "OTP theft" },
  { icon: MessageSquareWarning, label: "Bank impersonation" },
  { icon: MessageSquareWarning, label: "Lottery / prize scams" },
  { icon: MessageSquareWarning, label: "Crypto fraud" },
  { icon: MessageSquareWarning, label: "Phishing links" },
  { icon: MessageSquareWarning, label: "Investment scams" },
];

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Real-time AI threat analysis
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-[1.02] tracking-tight">
              Stop spam before it{" "}
              <span className="gradient-text">reaches you.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              SafeInbox analyzes SMS and email in real time, scoring risk and
              explaining why — so you know exactly what to trust.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/detect"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 glow transition"
              >
                Scan a message
                <Zap className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-semibold hover:bg-accent transition"
              >
                View dashboard
              </Link>
            </div>
          </motion.div>

          {/* Preview card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-16 grid md:grid-cols-[1.1fr_1fr] gap-4"
          >
            <div className="glass rounded-3xl p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Incoming SMS
              </div>
              <p className="font-mono text-sm leading-relaxed text-foreground/90">
                <mark className="bg-transparent" style={{ background: "color-mix(in oklab, var(--danger) 25%, transparent)", color: "oklch(0.95 0.15 25)", padding: "0 4px", borderRadius: 4 }}>Congratulations!</mark> You've been selected to
                receive a <mark style={{ background: "color-mix(in oklab, var(--danger) 25%, transparent)", color: "oklch(0.95 0.15 25)", padding: "0 4px", borderRadius: 4 }}>FREE iPhone 16 Pro</mark>.{" "}
                <mark style={{ background: "color-mix(in oklab, var(--danger) 25%, transparent)", color: "oklch(0.95 0.15 25)", padding: "0 4px", borderRadius: 4 }}>Click here now</mark> to
                claim: bit.ly/claim-prize-2026. Offer expires in 1 hour!
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["FREE", "Click here", "Congratulations", "Shortened URL", "Urgency"].map((k) => (
                  <span
                    key={k}
                    className="text-xs rounded-full px-2.5 py-1 border"
                    style={{
                      background: "color-mix(in oklab, var(--danger) 12%, transparent)",
                      borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)",
                      color: "oklch(0.88 0.15 25)",
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Verdict
                </div>
                <div className="mt-2 text-4xl font-display font-bold" style={{ color: "oklch(0.65 0.24 25)" }}>
                  Critical
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Risk score 96 / 100</div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Confidence</span>
                  <span className="font-mono">99.4%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[99%] bg-gradient-to-r from-primary to-[oklch(0.7_0.19_190)]" />
                </div>
              </div>
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                Classic prize-scam pattern with urgency, shortened URL, and free-gift bait.
                Don't tap the link.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Built for the way scams actually work.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every scan returns a full risk report — not just a yes/no.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-6"
            >
              <div className="h-10 w-10 rounded-xl grid place-items-center bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Threats */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="glass rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Catches the threats that matter.
              </h2>
              <p className="mt-3 text-muted-foreground">
                From smishing to sophisticated phishing, SafeInbox is trained to recognize
                today's most common attacks.
              </p>
              <Link
                to="/detect"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
              >
                Try it now
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {threats.map((t) => (
                <div
                  key={t.label}
                  className="rounded-2xl border border-border bg-background/40 p-4 flex items-center gap-3"
                >
                  <div
                    className="h-8 w-8 rounded-lg grid place-items-center"
                    style={{ background: "color-mix(in oklab, var(--danger) 15%, transparent)", color: "oklch(0.85 0.2 25)" }}
                  >
                    <t.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.7_0.19_190)] glow mb-6">
          <Mail className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold">
          Ready to check a suspicious message?
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Paste it in and get an instant, explained verdict. No sign-up.
        </p>
        <Link
          to="/detect"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 glow transition"
        >
          Open the detector
          <Zap className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
