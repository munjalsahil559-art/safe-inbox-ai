import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useScanHistory } from "@/lib/scan-history";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ShieldAlert, ShieldCheck, Gauge, Activity, Mail, MessageSquare, DollarSign, Lock, Info, Eye, Smartphone, UserCircle2, QrCode, CheckCircle2, XCircle, Clock } from "lucide-react";
import { extractMoneyUSD, formatUSD } from "@/lib/money";
import { useAuth } from "@/lib/auth";
import { getGmailConnectionStatus, type GmailConnectionStatus } from "@/lib/gmail.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeInbox" },
      { name: "description", content: "Overview of your scans, risk trends and detections." },
    ],
  }),
  component: DashboardPage,
});


function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tint = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tint?: "primary" | "safe" | "danger" | "warn";
}) {
  const tints: Record<string, string> = {
    primary: "var(--primary)",
    safe: "var(--safe)",
    danger: "var(--danger)",
    warn: "var(--warn)",
  };
  const color = tints[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div
          className="h-9 w-9 rounded-xl grid place-items-center"
          style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-display font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}

function DashboardPage() {
  const { items } = useScanHistory();

  const stats = useMemo(() => {
    const total = items.length;
    const spam = items.filter((i) => i.prediction === "Spam").length;
    const safe = total - spam;
    const avgRisk = total ? Math.round(items.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
    const avgConf = total
      ? Math.round(items.reduce((a, b) => a + b.confidence, 0) / total)
      : 0;
    const today = new Date().toDateString();
    const todayCount = items.filter(
      (i) => new Date(i.analyzed_at).toDateString() === today,
    ).length;
    const sms = items.filter((i) => i.kind === "sms").length;
    const email = total - sms;
    const scamEmails = items.filter((i) => i.kind === "email" && i.prediction === "Spam").length;
    const scamSms = items.filter((i) => i.kind === "sms" && i.prediction === "Spam").length;
    const moneyAtRisk = items
      .filter((i) => i.prediction === "Spam")
      .reduce((sum, i) => sum + extractMoneyUSD(i.input), 0);
    return { total, spam, safe, avgRisk, avgConf, todayCount, sms, email, scamEmails, scamSms, moneyAtRisk };
  }, [items]);

  const riskBuckets = useMemo(() => {
    const buckets = { Low: 0, Medium: 0, High: 0, Critical: 0 } as Record<string, number>;
    for (const i of items) buckets[i.risk_level] = (buckets[i.risk_level] ?? 0) + 1;
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [items]);

  const daily = useMemo(() => {
    const map = new Map<string, { day: string; spam: number; safe: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { day: d.toLocaleDateString(undefined, { weekday: "short" }), spam: 0, safe: 0 });
    }
    for (const i of items) {
      const key = new Date(i.analyzed_at).toISOString().slice(0, 10);
      const b = map.get(key);
      if (!b) continue;
      if (i.prediction === "Spam") b.spam++;
      else b.safe++;
    }
    return Array.from(map.values());
  }, [items]);

  const RISK_COLORS: Record<string, string> = {
    Low: "oklch(0.72 0.17 155)",
    Medium: "oklch(0.8 0.17 75)",
    High: "oklch(0.72 0.2 45)",
    Critical: "oklch(0.65 0.24 25)",
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your scan activity, stored locally on this device.
          </p>
        </div>
        <Link
          to="/detect"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
        >
          New scan
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-accent text-accent-foreground mb-4">
            <Activity className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-semibold">No scans yet</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Run your first analysis to populate the dashboard.
          </p>
          <Link
            to="/detect"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            Scan a message
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Activity} label="Total scans" value={stats.total} hint={`${stats.todayCount} today`} />
            <Stat icon={ShieldAlert} label="Spam detected" value={stats.spam} tint="danger" />
            <Stat icon={ShieldCheck} label="Safe messages" value={stats.safe} tint="safe" />
            <Stat icon={Gauge} label="Avg. risk" value={`${stats.avgRisk}`} hint={`avg. confidence ${stats.avgConf}%`} tint="warn" />
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat
              icon={Mail}
              label="Scam emails"
              value={stats.scamEmails}
              hint={`of ${stats.email} email scans`}
              tint="danger"
            />
            <Stat
              icon={MessageSquare}
              label="Scam SMS"
              value={stats.scamSms}
              hint={`of ${stats.sms} SMS scans`}
              tint="danger"
            />
            <Stat
              icon={DollarSign}
              label="Money at risk"
              value={formatUSD(stats.moneyAtRisk)}
              hint="sum of amounts in scam messages"
              tint="warn"
            />
          </div>

          <AccessPanel />


          <div className="mt-6 grid lg:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Last 7 days</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--danger)" }} />
                    Spam
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--safe)" }} />
                    Safe
                  </span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <XAxis dataKey="day" stroke="oklch(0.68 0.03 255)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.68 0.03 255)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                      contentStyle={{
                        background: "oklch(0.21 0.035 262)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="safe" stackId="a" fill="var(--safe)" radius={[0, 0, 6, 6]} />
                    <Bar dataKey="spam" stackId="a" fill="var(--danger)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Risk distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskBuckets}
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskBuckets.map((r) => (
                        <Cell key={r.name} fill={RISK_COLORS[r.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.21 0.035 262)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {riskBuckets.map((r) => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_COLORS[r.name] }} />
                    <span className="text-muted-foreground">{r.name}</span>
                    <span className="ml-auto font-mono">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent scans</h3>
              <Link to="/history" className="text-xs text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {items.slice(0, 5).map((i) => (
                <div key={i.id} className="py-3 flex items-center gap-4">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: RISK_COLORS[i.risk_level] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{i.input}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.kind.toUpperCase()} · {new Date(i.analyzed_at).toLocaleString()}
                    </div>
                  </div>
                  <div
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      color: RISK_COLORS[i.risk_level],
                      borderColor: `color-mix(in oklab, ${RISK_COLORS[i.risk_level]} 40%, transparent)`,
                      background: `color-mix(in oklab, ${RISK_COLORS[i.risk_level]} 12%, transparent)`,
                    }}
                  >
                    {i.risk_level}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AccessPanel() {
  const { user, loading } = useAuth();
  const getStatus = useServerFn(getGmailConnectionStatus);
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>({
    connected: false,
    setupRequired: false,
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    const refresh = () => {
      if (!user) {
        setGmailStatus({ connected: false, setupRequired: false });
        return;
      }
      getStatus()
        .then(setGmailStatus)
        .catch((error) =>
          setGmailStatus({
            connected: false,
            setupRequired: false,
            error: error instanceof Error ? error.message : "Could not check Gmail connection.",
          }),
        );
    };
    refresh();
    window.addEventListener("safeinbox:gmail-status", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("safeinbox:gmail-status", refresh);
    };
  }, [getStatus, user]);

  const signedIn = !!user && !loading;
  const gmailState: "connected" | "pending" | "off" = gmailStatus.connected
    ? "connected"
    : gmailStatus.setupRequired
      ? "pending"
      : "off";

  type Row = {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    status: "on" | "pending" | "off";
    statusLabel: string;
    action?: { to: "/detect" | "/permissions" | "/auth"; label: string };
  };

  const rows: Row[] = [
    {
      icon: UserCircle2,
      title: "Account & cloud sync",
      body: signedIn
        ? `Signed in as ${user?.email ?? "your account"}. Scans sync across your devices.`
        : "Sign in to sync scan history and analytics across devices.",
      status: signedIn ? "on" : "off",
      statusLabel: signedIn ? "Signed in" : "Signed out",
      action: signedIn ? undefined : { to: "/auth", label: "Sign in" },
    },
    {
      icon: Mail,
      title: "Gmail inbox",
      body:
        gmailState === "connected"
          ? `Connected${gmailStatus.emailAddress ? ` as ${gmailStatus.emailAddress}` : ""}. Read-only Gmail access is active.`
          : gmailState === "pending"
            ? "Gmail OAuth setup is needed before inbox scanning can start."
            : signedIn
              ? "Connect Gmail with the Google permission popup — no invitation email needed."
              : "Sign in first, then connect Gmail from Access.",
      status: gmailState === "connected" ? "on" : gmailState === "pending" ? "pending" : "off",
      statusLabel:
        gmailState === "connected" ? "Connected" : gmailState === "pending" ? "Setup needed" : "Not connected",
      action: { to: signedIn ? "/permissions" : "/auth", label: gmailState === "connected" ? "Manage" : signedIn ? "Connect Gmail" : "Sign in" },
    },
    {
      icon: MessageSquare,
      title: "Paste SMS to scan",
      body: "Paste any suspicious text message — instant AI verdict, no permissions needed.",
      status: "on",
      statusLabel: "Available now",
      action: { to: "/detect", label: "Scan SMS" },
    },
    {
      icon: Mail,
      title: "Paste email to scan",
      body: "Paste sender, subject and body — SafeInbox flags links, tone and urgency.",
      status: "on",
      statusLabel: "Available now",
      action: { to: "/detect", label: "Scan email" },
    },
    {
      icon: QrCode,
      title: "QR code detection",
      body: "Upload a QR screenshot — SafeInbox decodes and analyzes the payload.",
      status: "on",
      statusLabel: "Available now",
      action: { to: "/detect", label: "Scan QR" },
    },
    {
      icon: Smartphone,
      title: "Auto-read device SMS",
      body: "Browsers can't read your phone's SMS inbox. Coming to the SafeInbox Android app.",
      status: "off",
      statusLabel: "Not on web",
    },
  ];

  const availableCount = rows.filter((r) => r.status === "on").length;
  const StatusIcon = { on: CheckCircle2, pending: Clock, off: XCircle } as const;
  const statusColor = {
    on: "var(--safe)",
    pending: "var(--warn)",
    off: "var(--muted-foreground)",
  } as const;

  return (
    <div className="mt-6 glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Permission status</h3>
          <span
            className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border font-medium"
            style={{
              color: "var(--safe)",
              borderColor: "color-mix(in oklab, var(--safe) 40%, transparent)",
              background: "color-mix(in oklab, var(--safe) 12%, transparent)",
            }}
          >
            {availableCount} scans available now
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Live · updated {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          What SafeInbox can scan for you right now. Nothing is read from your device without you sharing it.
        </span>
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const Icon = StatusIcon[r.status];
          const color = statusColor[r.status];
          return (
            <div
              key={r.title}
              className="rounded-xl border border-border bg-background/40 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <r.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{r.title}</span>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border"
                  style={{
                    color,
                    borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
                    background: `color-mix(in oklab, ${color} 12%, transparent)`,
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {r.statusLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{r.body}</p>
              {r.action && (
                <Link
                  to={r.action.to}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold hover:bg-accent transition"
                >
                  {r.action.label} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
