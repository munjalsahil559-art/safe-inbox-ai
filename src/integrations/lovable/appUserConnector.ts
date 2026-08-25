/**
 * Server-only App User Connector helpers.
 *
 * These functions call the Lovable connector gateway with server-side secrets.
 * Import only from server functions or server-only helpers.
 */

function requireApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new Error("LOVABLE_API_KEY is not set. Gmail connection requires backend setup.");
  }
  return key;
}

export interface AppUserOAuthAuthorizeParams {
  gatewayBaseUrl: string;
  connectorId: string;
  appUserId: string;
  clientAPIKey: string;
  returnUrl: string;
  connectionAPIKey?: string;
  credentialsConfiguration?: Record<string, unknown>;
}

export interface AppUserOAuthAuthorizeResponse {
  authorizationUrl: string;
  sessionId: string;
}

export async function authorizeAppUserOAuth(
  params: AppUserOAuthAuthorizeParams,
): Promise<AppUserOAuthAuthorizeResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey()}`,
    "Content-Type": "application/json",
    "X-Client-Api-Key": params.clientAPIKey,
  };
  if (params.connectionAPIKey) {
    headers["X-Connection-Api-Key"] = params.connectionAPIKey;
  }

  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      connector_id: params.connectorId,
      app_user_id: params.appUserId,
      return_url: params.returnUrl,
      credentials_configuration: params.credentialsConfiguration,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gmail OAuth start failed (${res.status}): ${text || res.statusText}`);
  }

  let body: { authorization_url?: string; session_id?: string };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Gmail OAuth start returned invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!body.authorization_url) {
    throw new Error("Gmail OAuth start response was missing the Google permission URL.");
  }
  return {
    authorizationUrl: body.authorization_url,
    sessionId: body.session_id ?? "",
  };
}

export interface CallAsAppUserParams {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
  path: string;
  init?: RequestInit;
}

export async function callAsAppUser({
  gatewayBaseUrl,
  connectionAPIKey,
  connectorId,
  path,
  init,
}: CallAsAppUserParams): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${requireApiKey()}`);
  headers.set("X-Connection-Api-Key", connectionAPIKey);
  return fetch(`${gatewayBaseUrl}/${connectorId}${normalizedPath}`, {
    ...init,
    headers,
  });
}

export interface DisconnectAppUserParams {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
}

export async function disconnectAppUser({
  gatewayBaseUrl,
  connectionAPIKey,
  connectorId,
}: DisconnectAppUserParams): Promise<void> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/connection`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionAPIKey,
    },
    body: JSON.stringify({ connector_id: connectorId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gmail disconnect failed (${res.status}): ${text || res.statusText}`);
  }
}

export interface ExchangeAppUserOAuthCodeResult {
  connectionAPIKey: string;
  connectorId: string;
}

export async function exchangeAppUserOAuthCode(
  gatewayBaseUrl: string,
  code: string,
): Promise<ExchangeAppUserOAuthCodeResult> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/oauth2/exchange`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gmail OAuth exchange failed (${res.status}): ${text || res.statusText}`);
  }

  let body: { api_key?: string; connector_id?: string };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Gmail OAuth exchange returned invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!body.api_key || !body.connector_id) {
    throw new Error("Gmail OAuth exchange response did not include a saved connection key.");
  }
  return { connectionAPIKey: body.api_key, connectorId: body.connector_id };
}