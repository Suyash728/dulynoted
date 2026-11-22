# AI disclosure
- Build method: 100% prompt-driven with Claude Code (Anthropic) in VS Code. Every prompt is in PROMPTS.md, in order.
- Runtime models: Groq openai/gpt-oss-120b (extraction), openai/gpt-oss-20b (digest), Google gemini-3.5-flash-lite (fallback + image OCR).
- MCP/tools used while building: Context7 (docs), Supabase MCP (schema), Playwright MCP (demo test), GitHub CLI, Vercel CLI.
- What AI generated: (fill at submit)
- What I verified by hand: (fill at submit)
- Deterministic (non-AI) parts: date normalisation, audience routing, clash detection, .ics generation, Telegram delivery.
