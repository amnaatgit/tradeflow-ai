# AI Disclosure

## Product AI

Provider: Google Gemini (Generative Language API) called via the server route /api/parse. The model names are defined in lib/ai/config.ts (DEFAULT_MODEL and FALLBACK_MODEL). The server requests JSON output (generationConfig.responseMimeType = "application/json") and includes the API key in the x-goog-api-key header. The AI only performs structured field extraction (with per-field confidence scores); extracted data is shown to the seller for review and nothing is saved until the seller confirms.

## Development AI

Code in this repository was produced with assistance from the Devmarketplace AI builder agent (GPT-4.1 mini and GPT-5 mini) guided by AGENTS.md and SPEC.md. The coding agent helped assemble and edit files; human reviewers tested and adjusted the code.

## Other AI tools used by the team

[team to fill in]

## Open-source components

The project uses the dependencies declared in package.json. See package.json for the full list of dependencies and their licenses.

## Code origin

Code was generated with the Devmarketplace builder agent from AGENTS.md and SPEC.md, then reviewed, tested and edited by the team.