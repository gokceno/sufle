# Why Sufle?

Sufle is more than a RAG system. It's a platform that combines document retrieval with extensible tool calling and MCP integration, giving your LLM true autonomy to access any data source or service you define.

## The Problem with Basic RAG

Traditional RAG systems are limited:

```
User: "What's our refund policy?"
RAG: ✓ Retrieves policy from documents

User: "What's the weather in Paris?"
RAG: ✗ Cannot access real-time data

User: "How many refunds did we process last month?"
RAG: ✗ Cannot query databases

User: "What's our policy on weather delays, and did we have any yesterday in Chicago?"
RAG: ✗ Cannot combine document retrieval with real-time data and database queries
```

Basic RAG can only answer questions from pre-indexed documents. For everything else, you need to build separate systems, manage multiple APIs, and manually combine results.

## The Sufle Approach

Sufle gives your LLM three capabilities instead of one:

1. **Document Retrieval (RAG)** - Search indexed documents
2. **Custom Tools** - Call domain-specific functions you create
3. **MCP Servers** - Access databases, APIs, and services through standard protocol

The LLM autonomously decides which combination to use for each query.

```
User: "What's our refund policy?"
Sufle: ✓ Retrieves policy from documents

User: "What's the weather in Paris?"
Sufle: ✓ Calls weather tool

User: "How many refunds did we process last month?"
Sufle: ✓ Queries database via MCP server

User: "What's our policy on weather delays, and did we have any yesterday in Chicago?"
Sufle: ✓ Retrieves policy + calls weather tool + queries database
      ✓ Synthesizes all three sources into one coherent answer
```

## Comparison Table

| Capability | Basic RAG | RAG + Manual Tools | Sufle |
|------------|-----------|-------------------|-------|
| Document search | ✓ | ✓ | ✓ |
| Real-time data | ✗ | Manual API calls | ✓ Automatic |
| Database access | ✗ | Manual queries | ✓ Automatic via MCP |
| Custom logic | ✗ | Separate service | ✓ Custom tools |
| Tool coordination | ✗ | Manual orchestration | ✓ LLM decides |
| Multiple data sources | ✗ | Complex integration | ✓ Unified interface |
| Extensibility | Limited | Code changes | Config-driven |

## Real-World Examples

### Customer Support

**Basic RAG:**
```
Q: "What's our return policy?"
A: [retrieves policy document]
```

**Sufle:**
```
Q: "What's our return policy, and has customer john@example.com returned anything in the past 30 days?"
A: [retrieves policy] + [queries customer database] + [synthesizes response]

"Our return policy allows returns within 30 days. I've checked john@example.com's 
account and found 2 returns in the past 30 days: Order #1234 on Jan 15, and 
Order #5678 on Jan 22."
```

### Business Intelligence

**Basic RAG:**
```
Q: "What does our Q4 report say about sales?"
A: [retrieves Q4 report sections]
```

**Sufle:**
```
Q: "What did our Q4 report project for January sales, and how are we actually performing?"
A: [retrieves Q4 projections] + [queries live sales database] + [synthesizes]

"The Q4 report projected $500K in January sales. Based on current data, we're 
at $425K with 5 days remaining, tracking at 85% of target."
```

### Technical Documentation

**Basic RAG:**
```
Q: "How do I configure the API?"
A: [retrieves configuration documentation]
```

**Sufle:**
```
Q: "How do I configure the API, and show me the current production configuration"
A: [retrieves docs] + [reads config file via MCP] + [synthesizes]

"API configuration requires setting these environment variables: [from docs]. 
Your current production config shows: [actual values from file]. You're missing 
the CACHE_TTL setting mentioned in the docs."
```

## Key Differentiators

### 1. Autonomous Tool Selection

The LLM decides which tools to use based on the query. You don't need to:
- Parse the query yourself
- Determine which API to call
- Write routing logic
- Manually combine results

The LLM does all of this automatically.

### 2. Extensible Without Code Changes

Add new capabilities by:

**Custom tools:** Create a new package
```typescript
// packages/tool-myfeature/src/index.ts
export const create = (opts) => {
  // Your implementation
};
```

**MCP servers:** Add configuration
```yaml
mcp_servers:
  - server: newservice
    command: npx
    args: ["@mcp/server-newservice"]
```

No changes to core Sufle code required.

### 3. Unified Interface

All capabilities accessible through one API:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -d '{
    "model": "sufle/default",
    "messages": [{"role": "user", "content": "Any question"}]
  }'
```

The same endpoint handles:
- Pure document queries
- Pure tool calls
- Pure MCP queries
- Any combination of the three

### 4. OpenAI Compatible

Works with existing tools and libraries:

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_KEY",
    base_url="http://localhost:3000/v1"
)

# That's it - use like normal OpenAI API
# But with document retrieval + tool calling + MCP
```

### 5. Multi-Tenant by Design

Workspace-based permissions let you:
- Separate data by customer/department/project
- Control who can access what
- Run a single instance for multiple teams
- Query only accessible documents

## When to Use Sufle

**Perfect for:**
- Systems that need both documents AND external data
- Applications requiring database access during conversations
- Platforms with multiple data sources to integrate
- Multi-tenant documentation systems
- Customer support with live data needs
- Business intelligence combining reports and live metrics
- Technical support accessing configurations and logs

**Overkill for:**
- Simple document Q&A with no external data needs
- Systems where all information is in documents
- Single-purpose applications with no extensibility requirements

## Architecture Benefits

### Separation of Concerns

- **API server** - Handles requests, orchestrates tools
- **CLI workers** - Process documents in background
- **Custom tools** - Domain logic in isolated packages
- **MCP servers** - External data access in standard format

Each component scales and deploys independently.

### Developer Experience

**Adding a custom tool:**
1. Create package with standard structure
2. Export from tools index
3. Add to configuration
4. Done - LLM can use it

**Adding an MCP server:**
1. Find or build MCP server
2. Add configuration with instructions
3. Done - LLM can use it

**Updating documents:**
- CLI workers handle automatically
- No code changes needed

### Operations

- **Logging** - Debug tool calls and LLM decisions
- **Monitoring** - Track tool usage and performance
- **Configuration** - YAML-based, environment variable overrides
- **Deployment** - Docker Compose or Kubernetes ready

## Real Cost Savings

### Without Sufle

```
RAG system: $X
+ Custom API integration layer: $Y (development time)
+ Database query service: $Z (development time)
+ Orchestration logic: $W (development time)
+ Maintenance of all above: Ongoing

Total: $X + many weeks of development + ongoing maintenance
```

### With Sufle

```
Sufle: $0 (open source)
+ Custom tools: Hours per tool (standard structure)
+ MCP servers: Minutes to configure (pre-built)
+ Maintenance: Minimal (declarative config)

Total: Hours to days of development
```

## Getting Started

The fastest way to see the difference:

1. **Basic RAG test:**
   ```bash
   # Index some documents
   # Query them
   ```

2. **Add a tool:**
   ```yaml
   tools:
     - tool: weather
       opts:
         api_key: YOUR_KEY
   ```

3. **Ask a combined query:**
   ```
   "What does our remote work policy say about weather, 
   and what's the weather like in our NYC office?"
   ```

4. **Watch it work:**
   - LLM retrieves policy from documents
   - LLM calls weather tool for NYC
   - LLM synthesizes both into one answer

That's the power of Sufle.

## Next Steps

- [Installation](installation.md) - Set up Sufle
- [Quick Reference](quick-reference.md) - Common patterns
- [Developing Tools](developing-tools.md) - Create custom tools
- [MCP Integration](mcp-integration.md) - Connect data sources
- [Architecture](architecture.md) - Understand the system