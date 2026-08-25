import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  completeGmailOAuth,
  disconnectGmail,
  getGmailStatus,
  startGmailOAuth,
} from "./gmail.server";
import type { GmailConnectionStatus } from "./gmail.server";

export type { GmailConnectionStatus } from "./gmail.server";

export const startGmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => startGmailOAuth(context.userId));

export const completeGmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<GmailConnectionStatus> =>
    completeGmailOAuth(context.userId, data.code),
  );

export const getGmailConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GmailConnectionStatus> => getGmailStatus(context.userId));

export const disconnectGmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => disconnectGmail(context.userId));