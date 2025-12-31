---
"@sufle/api": patch
---

Send the full conversation to the agent instead of only the latest user message. Map roles to HumanMessage/AIMessage, filter out nulls, and throw if no messages are present.
