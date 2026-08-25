import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Mail, MessageSquare, Smartphone, ShieldCheck, Info, Check, Lock, ExternalLink, Sparkles, Wrench, ChevronDown, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  completeGmailConnect,
  disconnectGmailConnect,
  getGmailConnectionStatus,
  startGmailConnect,
  type GmailConnectionStatus,
} from "@/lib/gmail.functions";

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

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "google_mail" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete" && typeof event.data?.code === "string") {
        resolve(event.data.code);
        return;
      }
      popup.close();
      reject(new Error("Gmail permission was not completed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("Gmail permission window closed before completion."));
    }, 500);
  });
}

function PermissionsPage() {
  const { user } = useAuth();
  const startConnect = useServerFn(startGmailConnect);
  const completeConnect = useServerFn(completeGmailConnect);
  const getStatus = useServerFn(getGmailConnectionStatus);
  const disconnectConnect = useServerFn(disconnectGmailConnect);
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>({
    connected: false,
    setupRequired: false,
  });
  const [gmailLoading, setGmailLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("safeinbox:gmail-requested");
    if (!user) {
      setGmailStatus({ connected: false, setupRequired: false });
      return;
    }
    let active = true;
    getStatus()
      .then((status) => {
        if (active) setGmailStatus(status);
      })
      .catch((error) => {
        if (active) {
          setGmailStatus({
            connected: false,
            setupRequired: false,
            error: error instanceof Error ? error.message : "Could not check Gmail connection.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [getStatus, user]);

  async function requestGmail() {
    if (!user) {
      toast.error("Sign in first", {
        description: "You need an account to connect Gmail so the permission is saved to you.",
      });
      return;
    }
    const popup = window.open("", "safeinbox-gmail-oauth", "width=600,height=720");
    if (!popup) {
      toast.error("Popup blocked", {
        description: "Allow popups for this site, then press Connect Gmail again.",
      });
      return;
    }

    setGmailLoading(true);
    try {
      const completion = waitForOAuthCompletion(popup);
      const { authorizationUrl } = await startConnect();
      popup.location.href = authorizationUrl;
      const code = await completion;
      const status = await completeConnect({ data: { code } });
      setGmailStatus(status);
      window.dispatchEvent(new Event("safeinbox:gmail-status"));
      toast.success("Gmail connected", {
        description: status.emailAddress
          ? `${status.emailAddress} is ready for read-only scam scanning.`
          : "Your Gmail permission is saved for read-only scam scanning.",
      });
    } catch (error) {
      popup.close();
      toast.error("Gmail connection failed", {
        description: error instanceof Error ? error.message : "Try connecting Gmail again.",
      });
    } finally {
      setGmailLoading(false);
    }
  }

  async function disconnectGmailAccount() {
    if (!user) return;
    setGmailLoading(true);
    try {
      await disconnectConnect();
      setGmailStatus({ connected: false, setupRequired: false });
      window.dispatchEvent(new Event("safeinbox:gmail-status"));
      toast.success("Gmail disconnected");
    } catch (error) {
      toast.error("Could not disconnect Gmail", {
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setGmailLoading(false);
    }
  }

  const gmailNote = !user
    ? "Sign in first, then connect your own Gmail account."
    : gmailStatus.connected
      ? `Connected${gmailStatus.emailAddress ? ` as ${gmailStatus.emailAddress}` : ""}. Read-only Gmail access is active.`
      : gmailStatus.setupRequired
        ? "Gmail OAuth needs workspace setup before users can connect. Add the connector callback URL in Google Cloud."
        : "Press Connect Gmail to open the Google permission popup now. No email invitation is required.";

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
          status={gmailStatus.connected ? "granted" : "pending"}
          action={
            !user ? (
              <Button asChild className="rounded-full">
                <Link to="/auth">Sign in to connect</Link>
              </Button>
            ) : gmailStatus.connected ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={requestGmail} disabled={gmailLoading} className="rounded-full">
                  {gmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Reconnect
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnectGmailAccount}
                  disabled={gmailLoading}
                  className="rounded-full"
                >
                  <Unplug className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={requestGmail} disabled={gmailLoading} className="rounded-full">
                {gmailLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening Google…
                </>
              ) : (
                <>
                  Connect Gmail <ExternalLink className="h-3.5 w-3.5" />
                </>
              )}
              </Button>
            )
          }
          note={gmailStatus.error ? `${gmailNote} ${gmailStatus.error}` : gmailNote}
          troubleshooting={[
            {
              problem: "\"Connect Gmail\" says you need to sign in",
              fix: "Gmail access is saved to your SafeInbox account. Create an account or sign in with Google, then return to this page and press Connect Gmail again.",
              link: { label: "Go to sign in", href: "/auth" },
            },
            {
              problem: "The Google consent window never opens or closes instantly",
              fix: "Your browser is blocking popups. Allow popups for this site in the address-bar icon, disable strict tracking protection, then retry.",
              link: {
                label: "Chrome popup settings help",
                href: "https://support.google.com/chrome/answer/95472",
              },
            },
            {
              problem: "Google shows \"app isn't verified\" or blocks the sign-in",
              fix: "Choose Advanced → Continue to SafeInbox, or use a personal Google account. Workspace accounts often need an admin to approve third-party apps.",
              link: {
                label: "Workspace app access help",
                href: "https://support.google.com/a/answer/7281227",
              },
            },
            {
              problem: "You expected an email invitation",
              fix: "SafeInbox now connects Gmail directly in a Google permission popup. No invitation email is sent; sign in to SafeInbox and press Connect Gmail on this page.",
            },
            {
              problem: "You connected but no emails are being scanned",
              fix: "Read-only Gmail scope must be granted. Revoke SafeInbox in your Google account's third-party access list, then reconnect and tick every requested permission.",
              link: {
                label: "Manage Google app access",
                href: "https://myaccount.google.com/connections",
              },
            },
          ]}
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
          troubleshooting={[
            {
              problem: "No \"Allow SMS\" prompt appears on your phone",
              fix: "Expected on web: mobile browsers have no SMS-read API, so there is nothing to grant. Use the paste-SMS scanner until the Android app ships.",
              link: { label: "Scan an SMS now", href: "/detect" },
            },
            {
              problem: "You granted SMS permission but nothing imports",
              fix: "You likely granted it to your default messaging app, not SafeInbox. Check Settings → Apps → SafeInbox → Permissions; if SMS isn't listed, the web app cannot use it.",
              link: {
                label: "Android permission settings help",
                href: "https://support.google.com/android/answer/9431959",
              },
            },
            {
              problem: "You want protection right now on mobile",
              fix: "Add SafeInbox to your home screen, then long-press any suspicious message → Copy → paste it into Detect. Results sync to your account across devices.",
              link: { label: "Open the detector", href: "/detect" },
            },
          ]}
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

type FixStep = {
  problem: string;
  fix: string;
  link?: { label: string; href: string };
};

function PermissionCard({
  icon: Icon,
  title,
  body,
  status,
  action,
  note,
  troubleshooting,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  status: Status;
  action?: React.ReactNode;
  note?: string;
  troubleshooting?: FixStep[];
}) {
  const meta = STATUS_META[status];
  const [open, setOpen] = useState(false);
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

      {troubleshooting && troubleshooting.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-foreground/90 hover:text-foreground transition"
          >
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              Troubleshooting ({troubleshooting.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <motion.ol
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              {troubleshooting.map((step, i) => (
                <li key={i} className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-accent text-accent-foreground grid place-items-center text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{step.problem}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.fix}</p>
                      {step.link && (
                        <a
                          href={step.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {step.link.label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </motion.ol>
          )}
        </div>
      )}
    </motion.div>
  );
}
