import { z } from "zod";

export const roastPayloadSchema = z.object({
  score: z.number().int().min(0).max(100),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(240),
  roasts: z.array(z.string().trim().min(1).max(220)).min(1).max(5),
  fixes: z.array(z.string().trim().min(1).max(220)).min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(5),
});

export const analysisRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  modes: z.object({
    unhinged: z.boolean().optional().default(false),
    investor: z.boolean().optional().default(false),
  }),
});

export const pageSummarySchema = z.object({
  url: z.string().url(),
  finalUrl: z.string().url(),
  title: z.string(),
  description: z.string(),
  headings: z.array(z.string()),
  ctas: z.array(z.string()),
  repeatedPhrases: z.array(z.string()),
  marketingPhrases: z.array(z.string()),
  visibleTextSample: z.array(z.string()),
});

export const analysisResultSchema = roastPayloadSchema.extend({
  analyzedUrl: z.string().url(),
  source: z.enum(["ai", "fallback"]),
  warning: z.string().optional(),
  pageSummary: pageSummarySchema,
});

export type RoastPayload = z.infer<typeof roastPayloadSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type PageSummary = z.infer<typeof pageSummarySchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
