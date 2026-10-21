export const DEFAULT_MODEL = "gemini-3.1-flash-lite";
// Tried in order when the main model is busy (429/500/503) or not found (404).
export const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"];
export const FALLBACK_MODEL = FALLBACK_MODELS[0];
export const MODEL = process.env.AI_MODEL || DEFAULT_MODEL;
