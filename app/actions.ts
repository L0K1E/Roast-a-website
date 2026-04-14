"use server";

import { analyzeWebsite } from "@/lib/roast/analyze";

export async function analyzeWebsiteAction(input: unknown) {
  return analyzeWebsite(input);
}
