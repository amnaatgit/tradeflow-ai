export const DEFAULT_MODEL = "gemini-3.1-flash-lite";
export const FALLBACK_MODEL = "gemini-flash-latest";
export const MODEL = process.env.AI_MODEL || DEFAULT_MODEL;
