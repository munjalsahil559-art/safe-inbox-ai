import { getRequest } from "@tanstack/react-start/server";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  deleteConnectionKeyForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "@/server/appUserConnections.server";

const CONNECTOR_ID = "google_mail";
const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export type GmailConnectionStatus = {
  connected: boolean;
  setupRequired: boolean;
  emailAddress?: string;
  messagesTotal?: number;
  error?: string;
};

function clientApiKey(): string {
  const key = process.env["GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!key) {
    throw new Error(
      "Gmail OAuth is not configured yet. Link a Gmail App User Connector client, then add https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback as the authorized redirect URI in Google Cloud.",
    );
  }
  return key;
}

function getReturnUrl() {
  const request = getRequest();
  if (!request) throw new Error("Gmail connection must start from the app.");
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return new URL(
    "/oauth/google-mail/return",
    sandboxHost ? `https://${sandboxHost}` : url.origin,
  ).toString();
}

export async function startGmailOAuth(userId: string) {
  const connectionAPIKey = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  const { authorizationUrl } = await authorizeAppUserOAuth({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectorId: CONNECTOR_ID,
    appUserId: userId,
    clientAPIKey: clientApiKey(),
    returnUrl: getReturnUrl(),
    connectionAPIKey: connectionAPIKey ?? undefined,
    credentialsConfiguration: { scopes: GOOGLE_SCOPES },
  });
  return { authorizationUrl };
}

export async function completeGmailOAuth(userId: string, code: string) {
  const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
  if (connectorId !== CONNECTOR_ID) {
    throw new Error("Google returned a connection for the wrong service.");
  }
  await saveConnectionKeyForUser(userId, connectorId, connectionAPIKey);
  return getGmailStatus(userId);
}

export async function getGmailStatus(userId: string): Promise<GmailConnectionStatus> {
  const setupRequired = !process.env["GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  const connectionAPIKey = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!connectionAPIKey) {
    return { connected: false, setupRequired };
  }

  try {
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/gmail/v1/users/me/profile",
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        connected: true,
        setupRequired,
        error: `Gmail profile check failed (${res.status}): ${text || res.statusText}`,
      };
    }
    const profile = text
      ? (JSON.parse(text) as { emailAddress?: string; messagesTotal?: number })
      : {};
    return {
      connected: true,
      setupRequired,
      emailAddress: profile.emailAddress,
      messagesTotal: profile.messagesTotal,
    };
  } catch (error) {
    return {
      connected: true,
      setupRequired,
      error: error instanceof Error ? error.message : "Gmail profile check failed.",
    };
  }
}

export async function disconnectGmail(userId: string) {
  const connectionAPIKey = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!connectionAPIKey) return { ok: true };
  await disconnectAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: CONNECTOR_ID,
  });
  await deleteConnectionKeyForUser(userId, CONNECTOR_ID);
  return { ok: true };
}