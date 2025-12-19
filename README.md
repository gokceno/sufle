# Sufle

A RAG platform with native tool calling and MCP server integration. Query your documents while leveraging external tools and data sources through a unified, OpenAI-compatible interface.

## What It Does

Sufle combines retrieval-augmented generation with extensible tool calling, letting your LLM seamlessly access:
- **Your documents** - Indexed and vectorized from various storage sources
- **Custom tools** - Domain-specific functionality (weather, exchange rates, etc.)
- **MCP servers** - External data sources via Model Context Protocol (databases, APIs, etc.)

The LLM intelligently decides when to retrieve from documents, when to call tools, and when to combine both.

**Core capabilities:**
- RAG with semantic search across document workspaces
- Tool calling with custom tool development framework
- MCP server integration for external data access
- OpenAI-compatible API endpoints
- Workspace-based permissions for multi-tenant setups
- Multiple embedding and LLM provider support

## Why Tool Calling Matters

Unlike basic RAG systems that only query documents, Sufle gives your LLM the ability to:

- **Access real-time data** (current weather, exchange rates, stock prices)
- **Query external databases** through MCP servers
- **Combine document context with live information** in a single response
- **Execute domain-specific operations** through custom tools
- **Extend functionality without modifying core code**

The LLM automatically determines which combination of documents, tools, and MCP servers to use based on each query.

## Architecture

Sufle consists of two main components:

- **API Server** - Fastify-based HTTP server with OpenAI-compatible endpoints, tool orchestration, and MCP client
- **CLI Workers** - Background processes for document indexing, vectorization, and cleanup

See [Architecture](docs/architecture.md) for details, or jump to [Developing Tools](docs/developing-tools.md) to create your own tools.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.2.13+
- An embedding provider API key (Google, OpenAI, or Ollama instance)
- An LLM provider API key (currently Google Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/gokceno/sufle.git
cd sufle

# Install dependencies
bun install
```

### Configuration

Create `sufle.yml` files for both API and CLI:

**For API** (`apps/api/sufle.yml`):
```yaml
output_models:
  - id: sufle/default
    owned_by: sufle
    chat:
      provider: google
      opts:
        model: gemini-2.5-flash
        api_key: YOUR_GOOGLE_API_KEY
        temprature: 1
        max_messages: 32
        max_tokens: 8192
        max_message_length: 4096

rag:
  provider: langchain
  embeddings:
    provider: google
    opts:
      model: text-embedding-004
      api_key: YOUR_GOOGLE_API_KEY
  retriever:
    opts:
      k: 5
  vector_store:
    provider: libsql

# Add custom tools
tools:
  - tool: weather
    opts:
      api_key: YOUR_WEATHER_API_KEY
  - tool: exchangeRates

# Integrate MCP servers (optional)
mcp_servers:
  - server: database
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/app.db"]
    instructions: |
      This MCP server provides access to the application database.
      Use the execute_sql tool to query the database when needed.

permissions:
  - users:
      - user@example.com
    api_keys:
      - your-api-key-here
    workspaces:
      - workspace-id:rw
```

**For CLI** (`apps/cli/sufle.yml`):
```yaml
backend:
  api_key: your-api-key-here
  base_url: http://localhost:3000

schedule:
  index: "*/5 * * * *"      # Index every 5 minutes
  reduce: "0 * * * *"       # Cleanup every hour
  vectorize: "*/2 * * * *"  # Vectorize every 2 minutes

storage:
  provider: local

embeddings:
  provider: google
  opts:
    model: text-embedding-004
    api_key: YOUR_GOOGLE_API_KEY

workspaces:
  - id: workspace-id
    remote: disk
    dirs:
      - /path/to/documents
```

See [Installation & Configuration](docs/installation.md) for detailed setup instructions.

### Running

```bash
# Start the API server
bun start:api

# In separate terminals, start CLI workers
bun start:cli index
bun start:cli vectorize
bun start:cli reduce
```

Or use Docker Compose:

```bash
docker-compose up
```

### Usage Example

Ask questions that combine document context with tool calls:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user", 
      "content": "What does our Paris office policy say about weather-related delays? Also, what is the current weather in Paris?"
    }]
  }'
```

The LLM will:
1. Retrieve relevant policy documents from your workspace
2. Call the weather tool to get current Paris conditions
3. Synthesize both sources into a coherent response

See [Usage Guide](docs/usage.md) for more examples.

## Developing Custom Tools

Tools extend what your LLM can do beyond retrieving documents. Creating a tool is straightforward:

```typescript
// packages/tool-example/src/index.ts
import { z } from "zod";

export const name = "example";
export const description = "What this tool does and when to use it";

export const create = (opts) => {
  const schema = z.object({
    param: z.string().describe("Description of this parameter"),
  });
  
  const provider = async (input: any) => {
    const { param } = schema.parse(input);
    // Your tool logic here
    return { result: "data" };
  };
  
  return { provider, schema, name, description };
};
```

Then register it:
1. Add to `apps/api/src/tools/index.ts`
2. Configure in your `sufle.yml`

See [Developing Tools](docs/developing-tools.md) for a complete guide.

## Integrating MCP Servers

Model Context Protocol servers provide pre-built tools for databases, APIs, and other services:

```yaml
mcp_servers:
  - server: postgres-db
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://..."]
    instructions: |
      Guidelines for using this database:
      - Table schema
      - Query constraints
      - Best practices
```

The LLM automatically discovers and uses tools from MCP servers alongside your custom tools.

See [MCP Integration Guide](docs/mcp-integration.md) for examples and best practices.

## Documentation

- [Why Sufle?](docs/why-sufle.md) - How Sufle differs from basic RAG systems
- [Quick Reference](docs/quick-reference.md) - Common patterns and examples
- [Architecture](docs/architecture.md) - System design and components
- [Installation & Configuration](docs/installation.md) - Setup guide with all options
- [Usage Guide](docs/usage.md) - API endpoints and CLI commands
- [Developing Tools](docs/developing-tools.md) - Create custom tools
- [MCP Integration Guide](docs/mcp-integration.md) - Connect external data sources

## License

MIT - See [LICENSE](LICENSE) for details.