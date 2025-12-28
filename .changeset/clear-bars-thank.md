---
"@sufle/api": patch
---

Sanitize Gemini schemas and improve prompts

Replace the static RAG system prompt with a dynamic prompt builder that adapts to available tools and retrieval capabilities. Add logger debug when initializing the Google chat provider. Fix config: rename 'temprature' to 'temperature' and add a 'streaming' option.
