import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DetectionResult } from "./detect.functions";

export type StoredScan = DetectionResult & { id: string };

const ScanInput = z.object({
  kind: z.enum(["sms", "email"]),
  input: z.string(),
  prediction: z.enum(["Safe", "Spam"]),
  risk_level: z.enum(["Low", "Medium", "High", "Critical"]),
  risk_score: z.number(),
  confidence: z.number(),
  keywords: z.array(z.string()),
  features: z.array(z.string()),
  recommendation: z.string(),
  reasoning: z.string(),
  model: z.string(),
  analyzed_at: z.string(),
});

function rowToScan(r: Record<string, unknown>): StoredScan {
  return {
    id: r.id as string,
    kind: r.kind as "sms" | "email",
    input: r.input as string,
    prediction: r.prediction as "Safe" | "Spam",
    risk_level: r.risk_level as StoredScan["risk_level"],
    risk_score: Number(r.risk_score),
    confidence: Number(r.confidence),
    keywords: (r.keywords as string[]) ?? [],
    features: (r.features as string[]) ?? [],
    recommendation: (r.recommendation as string) ?? "",
    reasoning: (r.reasoning as string) ?? "",
    model: (r.model as string) ?? "",
    analyzed_at: r.analyzed_at as string,
  };
}

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredScan[]> => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("*")
      .order("analyzed_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToScan);
  });

export const saveScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data, context }): Promise<StoredScan> => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToScan(row);
  });

export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearScans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("scans")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
