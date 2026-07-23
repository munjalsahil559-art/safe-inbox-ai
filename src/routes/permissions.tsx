import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, MessageSquare, Smartphone, ShieldCheck, Info, Check, Lock, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Allow Access — SafeInbox" },
      { name: "description", content: "Grant SafeInbox permission to scan your emails and SMS for spam, phishing and scam attempts." },
      { property: "og:title", content: "Allow Access — SafeInbox" },
      { property: "og:description", content: "Connect your Gmail inbox or paste messages so SafeInbox can flag scams in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissionsPage,
});

type Status = "granted" | "manual" | "pending" | "unavailable";

const STATUS_META: Record<Status, { label: string; color: string }> = {
  granted: { label: "Allowed", color: "var(--safe)" },
  manual: { label: "Manual paste", color: "var(--warn)" },
  pending: { label: "Setup required", color: "var(--primary)" },
  unavailable: { label: "Not on web", color: "var(--muted-foreground)" },
};

function PermissionsPage() {
  const { user } = useAuth();
  const [gmailRequested, setGmailRequested] = useState(false);

  useEffect(() => {
    setGmailRequested(localStorage.getItem("safeinbox:gmail-requested") === "1");
  }, []);

  function requestGmail() {
    if (!user) {
      toast.error("Sign in first", {
        description: "You need an account to connect Gmail so we can save the connection to you.",
      });
      return;
    }
    setGmailRequested(true);
    localStorage.setItem("safeinbox:gmail-requested", "1");
    toast.success("Gmail access requested", {
      description:
        "We've queued a Gmail connection for your account. You'll get an email invite to authorize read-only inbox access.",
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Permissions & data access
        </div>
        <h1 className="mt-5 font-display text-4xl md:text-5xl font-bold tracking-tight">
          Allow SafeInbox to scan your{" "}
          <span className="gradient-text">inbox & messages.</span>
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Turn on the sources you want protected. Everything is scanned by our AI in real time —
          your content is never sold, shared or used to train models.
        </p>
      </motion.div>

      {/* Privacy summary */}
      <div className="mt-8 glass rounded-2xl p-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-accent text-accent-foreground shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Read-only, revocable, encrypted at rest.</span>{" "}
          SafeInbox only reads message metadata + body text to compute a risk score. You can revoke
          access anytime from this page.
        </div>
      </div>

      {/* Cards */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <PermissionCard
          icon={Mail}
          title="Gmail inbox"
          body="Connect your Google account and SafeInbox will scan incoming emails for phishing, invoice fraud, and lookalike domains."
          status={gmailRequested ? "pending" : "pending"}
          action={
            <button
              onClick={requestGmail}
              disabled={gmailRequested}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
            >
              {gmailRequested ? (
                <>
                  <Check className="h-4 w-4" /> Requested
                </>
              ) : (
                <>
                  Connect Gmail <ExternalLink className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          }
          note={
            gmailRequested
              ? "You'll receive an email when Gmail OAuth is live for your account."
              : "Google requires app verification before we can grant inbox access."
          }
        />

        <PermissionCard
          icon={Mail}
          title="Paste any email"
          body="Copy the sender, subject and body of any suspicious email into the Detect page for an instant verdict."
          status="granted"
          action={
            <Link
              to="/detect"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold hover:bg-accent transition"
            >
              Open Detect
            </Link>
          }
        />

        <PermissionCard
          icon={MessageSquare}
          title="Paste SMS text"
          body="Paste any suspicious text message — SafeInbox analyzes tone, links, urgency and impersonation signals."
          status="granted"
          action={
            <Link
              to="/detect"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold hover:bg-accent transition"
            >
              Scan an SMS
            </Link>
          }
        />

        <PermissionCard
          icon={Smartphone}
          title="Auto-read device SMS"
          body="Browsers can't read your phone's SMS inbox for security reasons. This will land in our upcoming Android app, which uses the SMS_READ permission."
          status="unavailable"
          note="Coming to the SafeInbox Android app."
        />
      </div>

      <div className="mt-8 glass rounded-2xl p-5 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Some sources aren't available on the web. Modern browsers sandbox apps so they can't reach
          the device's SMS, phone dialer, or third-party email inboxes without explicit OAuth or a
          native mobile installer. We're honest about that instead of asking for permissions we can't use.
        </p>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.7_0.19_190)] glow mb-4">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold">Start scanning now</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          You don't need to wait for Gmail OAuth — paste anything into Detect for a full AI report in seconds.
        </p>
        <Link
          to="/detect"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 glow transition"
        >
          Open the detector
        </Link>
      </div>
    </div>
  );
}

function PermissionCard({
  icon: Icon,
  title,
  body,
  status,
  action,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  status: Status;
  action?: React.ReactNode;
  note?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-2xl p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-medium"
          style={{
            color: meta.color,
            borderColor: `color-mix(in oklab, ${meta.color} 40%, transparent)`,
            background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
          }}
        >
          {meta.label}
        </span>
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{body}</p>
      {note && (
        <p className="mt-3 text-xs text-muted-foreground/80 border-l-2 border-border pl-3 italic">
          {note}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
