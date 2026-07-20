import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(20000),
  kind: z.enum(["sms", "email"]).default("sms"),
});

const ResultSchema = z.object({
  prediction: z.enum(["Safe", "Spam"]),
  risk_level: z.enum(["Low", "Medium", "High", "Critical"]),
  risk_score: z.number(),
  confidence: z.number(),
  keywords: z.array(z.string()),
  features: z.array(z.string()),
  recommendation: z.string(),
  reasoning: z.string(),
});

export type DetectionResult = z.infer<typeof ResultSchema> & {
  model: string;
  input: string;
  kind: "sms" | "email";
  analyzed_at: string;
};

const SYSTEM_PROMPT = `You are SafeInbox, an expert spam and phishing detector for SMS and email.
Analyze the provided message and classify it. Be strict about phishing, scams, OTP theft, lottery/prize fraud, crypto scams, bank impersonation, and suspicious links.

Return a JSON object with these fields:
- prediction: "Safe" or "Spam"
- risk_level: "Low" (0-30), "Medium" (31-60), "High" (61-85), or "Critical" (86-100)
- risk_score: integer 0-100 matching the risk_level band
- confidence: number 0-100, how sure you are of the prediction
- keywords: array of up to 8 suspicious words/phrases found VERBATIM in the message (empty array if safe)
- features: array of short labels e.g. "Suspicious Link", "Urgency", "Money Request", "OTP Request", "Impersonation", "Too Many Capitals", "Shortened URL", "Phone Number", "Cryptocurrency", "Attachment Request"
- recommendation: one short actionable sentence for the user
- reasoning: 1-2 sentence plain explanation of why you classified it this way

Be concise. Never invent keywords that are not literally present in the message.`;

export const detectMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<DetectionResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const modelId = "google/gemini-3.5-flash";
    const model = gateway(modelId);

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: ResultSchema }),
        system: SYSTEM_PROMPT,
        prompt: `Message type: ${data.kind.toUpperCase()}\n\nMessage:\n"""\n${data.text}\n"""\n\nReturn the JSON analysis.`,
      });

      return {
        ...output,
        risk_score: Math.max(0, Math.min(100, Math.round(output.risk_score))),
        confidence: Math.max(0, Math.min(100, Number(output.confidence.toFixed(2)))),
        keywords: output.keywords.slice(0, 8),
        features: output.features.slice(0, 10),
        model: modelId,
        input: data.text,
        kind: data.kind,
        analyzed_at: new Date().toISOString(),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("The AI could not analyze this message. Please try again.");
      }
      throw error;
    }
  });
