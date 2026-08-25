import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-mail/return")({
  head: () => ({
    meta: [
      { title: "Gmail Connected — SafeInbox" },
      { name: "description", content: "Completes Gmail permission connection for SafeInbox." },
      { property: "og:title", content: "Gmail Connected — SafeInbox" },
      { property: "og:description", content: "Completes Gmail permission connection for SafeInbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GmailOAuthReturnPage,
});

function GmailOAuthReturnPage() {
  const [message, setMessage] = useState("Finishing Gmail connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notifyOpenerAndClose = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_mail", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Gmail permission was not completed.");
      notifyOpenerAndClose("appUserConnectorOAuthFailed");
      return;
    }

    const code = params.get("code");
    if (!code) {
      setMessage("Gmail permission completed, but offline access was not enabled.");
      notifyOpenerAndClose("appUserConnectorOAuthFailed");
      return;
    }

    notifyOpenerAndClose("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
      <div className="glass rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold">Gmail permission</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}