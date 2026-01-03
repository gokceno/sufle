# Quick Reference

This guide provides quick examples for common Sufle use cases, focusing on tool calling and MCP integration.

## Tool Development Quick Start

### Create a Simple Tool

```typescript
// packages/tool-myname/src/index.ts
import { z } from "zod";

export const name = "myTool";
export const description = "What this tool does and when to use it";

export const create = (opts) => {
  const schema = z.object({
    input: z.string().describe("Input parameter description"),
  });
  
  const provider = async (input: any) => {
    const { input: param } = schema.parse(input);
    // Your logic here
    return { result: "data" };
  };
  
  return { provider, schema, name, description };
};
```

### Register and Use

```typescript
// apps/api/src/tools/index.ts
export * as myTool from "@sufle/tool-myname";
```

```yaml
# apps/api/sufle.yml
tools:
  - tool: myTool
    opts:
      apiKey: YOUR_KEY
```

## MCP Configuration Quick Start

### Database Server

```yaml
mcp_servers:
  - server: db
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://user:pass@host/db"]
    instructions: |
      Database schema:
      - table_name (column1, column2, column3)
      
      Use execute_sql to query. Limit to 100 rows.
```

### File System Server

```yaml
mcp_servers:
  - server: files
    command: npx
    args: ["@modelcontextprotocol/server-filesystem", "/allowed/path"]
    instructions: |
      Read-only access to configuration files.
      Tools: read_file, list_directory
```

### GitHub Server

```yaml
mcp_servers:
  - server: github
    command: npx
    args: ["@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    instructions: |
      GitHub API for repository operations.
      Use for queries about issues, PRs, repos.
```

## Common Query Patterns

### Documents Only

```bash
# Question answered from indexed documents
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"What is our vacation policy?"}]}'
```

### Custom Tool Only

```bash
# Question requiring external API
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"What is the weather in London?"}]}'
```

### MCP Tool Only

```bash
# Question requiring database query
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"How many users signed up last week?"}]}'
```

### Documents + Tool

```bash
# Question combining policy and real-time data
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"Per our travel policy, can I expense a flight to Paris? What is the current EUR exchange rate?"}]}'
```

### Documents + MCP

```bash
# Question combining policy and database
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"What does our SLA say about response times and how many tickets breached SLA this month?"}]}'
```

### All Three Combined

```bash
# Question using documents, custom tools, and MCP
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"Review our weather policy, check weather in Chicago, and query tickets filed in Chicago today"}]}'
```

## Tool Description Templates

### External API Tool

```typescript
export const description = `
  Get [data type] from [service name].
  
  When to use:
  - User asks about [specific keywords]
  - User mentions [specific terms]
  - Query requires [type of information]
  
  Returns: [description of return value]
  Requires: [any prerequisites or constraints]
`;
```

### Calculation Tool

```typescript
export const description = `
  Calculate [what it calculates].
  
  When to use:
  - User asks to calculate [specific calculation]
  - Query involves [mathematical operation]
  - Need to compute [specific value]
  
  Input format: [expected input]
  Output format: [result structure]
`;
```

### Data Access Tool

```typescript
export const description = `
  Access [data source] to retrieve [data type].
  
  When to use:
  - User asks about [data category]
  - Query requires [specific data]
  - Need current/historical [data type]
  
  Available operations: [list operations]
  Constraints: [any limits or rules]
`;
```

## MCP Instructions Templates

### Database MCP

```yaml
instructions: |
  **[Database Name] Database**
  
  ## Schema
  
  ### table1
  - column1 (type) - description
  - column2 (type) - description
  
  ### table2
  - column1 (type) - description
  - column2 (type) - description
  
  ## Query Guidelines
  - Always use WHERE clauses
  - Limit to 100 rows unless specified
  - Join tables using [relationship description]
  - For dates, use [format guidance]
  
  ## Examples
  ```sql
  SELECT * FROM table1 WHERE condition = 'value'
  ```
  
  ## Notes
  - READ ONLY connection
  - All timestamps in UTC
  - [Other important info]
```

### API MCP

```yaml
instructions: |
  **[Service Name] API Integration**
  
  ## Available Tools
  - tool_name: Description of what it does
  
  ## When to Use
  - User asks about [specific topic]
  - Query requires [type of data]
  
  ## Parameters
  - param1: Description and format
  - param2: Description and format
  
  ## Response Format
  Returns: [description of response]
  
  ## Constraints
  - Rate limit: [limit info]
  - Authentication: [auth method]
  - [Other constraints]
```

### File System MCP

```yaml
instructions: |
  **[Location] File System Access**
  
  ## Available Paths
  - /path/to/directory - Description
  
  ## Available Tools
  - read_file: Read file contents
  - list_directory: List directory contents
  
  ## Usage Guidelines
  - Read-only access
  - Supported formats: [file types]
  - Use for: [use cases]
  
  ## File Structure
  - /path/to/configs - Configuration files
  - /path/to/data - Data files
```

## Configuration Snippets

### Complete API Config

```yaml
output_models:
  - id: sufle/default
    owned_by: sufle
    chat:
      provider: google
      opts:
        model: gemini-2.5-flash
        api_key: ${GOOGLE_API_KEY}
        temperature: 1
        max_messages: 32
        max_tokens: 8192
        max_message_length: 4096

rag:
  provider: langchain
  embeddings:
    provider: google
    opts:
      model: text-embedding-004
      api_key: ${GOOGLE_API_KEY}
  retriever:
    opts:
      k: 5
  vector_store:
    provider: libsql

tools:
  - tool: weather
    opts:
      api_key: ${WEATHER_API_KEY}
  - tool: exchangeRates

mcp_servers:
  - server: database
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "${DATABASE_DSN}"]
    instructions: |
      Database with schema documentation here.

permissions:
  - users: [user@example.com]
    api_keys: [your-api-key]
    workspaces: [docs:rw]
```

### Complete CLI Config

```yaml
backend:
  api_key: your-api-key
  base_url: http://localhost:3000

schedule:
  index: "*/5 * * * *"
  reduce: "0 * * * *"
  vectorize: "*/2 * * * *"

storage:
  provider: local

embeddings:
  provider: google
  opts:
    model: text-embedding-004
    api_key: ${GOOGLE_API_KEY}

workspaces:
  - id: docs
    remote: disk
    dirs:
      - /path/to/documents
```

## Debugging Commands

### Check Tool Registration

```bash
export LOG_LEVEL=debug
bun start:api
# Look for: "Loaded tool: toolName"
```

### Test Tool Call

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"sufle/default","messages":[{"role":"user","content":"List available tools"}]}'
```

### Check MCP Server

```bash
# Look for MCP startup logs
[info] Starting MCP server: database
[info] MCP tools available: execute_sql, list_tables
```

### View Tool Execution

```bash
export LOG_LEVEL=debug
# Logs will show:
[debug] Calling tool: weather
[debug] Tool input: {"city": "Paris"}
[debug] Tool result: {"temp": 18, ...}
```

## Common Patterns

### Tool with External API

```typescript
const provider = async (input: any) => {
  const { param } = schema.parse(input);
  
  const response = await fetch(`${opts.baseUrl}/endpoint`, {
    headers: { 'Authorization': `Bearer ${opts.apiKey}` }
  });
  
  return await response.json();
};
```

### Tool with Validation

```typescript
const provider = async (input: any) => {
  const { value } = schema.parse(input);
  
  if (!isValid(value)) {
    throw new Error(`Invalid value: ${value}`);
  }
  
  return processValue(value);
};
```

### Tool with Caching

```typescript
export const create = (opts) => {
  const cache = new Map();
  
  const provider = async (input: any) => {
    const { key } = schema.parse(input);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = await fetchData(key);
    cache.set(key, result);
    return result;
  };
  
  return { provider, schema, name, description };
};
```

## Environment Variables

```bash
# API Configuration
export CONFIG_PATH=/path/to/sufle.yml
export LOG_LEVEL=debug
export DB_PATH=/path/to/db.sqlite
export DB_MIGRATIONS_APPLY=true

# Provider Keys
export GOOGLE_API_KEY=your-key
export WEATHER_API_KEY=your-key
export DATABASE_URL=postgresql://...

# Override Config Values
export EMBEDDINGS__OPTS__API_KEY=override-key
export RAG__RETRIEVER__OPTS__K=10
```

## Testing Checklist

- [ ] API server starts without errors
- [ ] Custom tools load successfully
- [ ] MCP servers connect successfully
- [ ] Tools appear in debug logs
- [ ] Simple document query works
- [ ] Custom tool call works
- [ ] MCP tool call works
- [ ] Combined query works
- [ ] Permissions enforce correctly

## Common Error Solutions

| Error | Solution |
|-------|----------|
| "Configured tool X is not available" | Export tool in `tools/index.ts` |
| "MCP server failed to start" | Check command exists, verify args |
| "Invalid config" | Validate YAML syntax, check schema |
| "No permissions set" | Add API key to permissions array |
| "Tool not being called" | Improve tool description |
| "Document not found" | Check workspace permissions |

## Performance Tips

1. **Use appropriate k value** - Start with 5, adjust based on results
2. **Cache tool results** - Implement caching for expensive operations
3. **Limit MCP queries** - Set row limits in instructions
4. **Index frequently** - Balance freshness vs load
5. **Monitor logs** - Watch for slow tools or queries

## See Also

- [Developing Tools](developing-tools.md) - Complete tool development guide
- [MCP Integration](mcp-integration.md) - Detailed MCP setup and examples
- [Architecture](architecture.md) - System design and data flow
- [Usage Guide](usage.md) - API endpoints and examples
