# Getting Started with Sufle

This guide will help you set up and run Sufle in under 30 minutes.

## Quick Setup Checklist

### Prerequisites ✓

- [ ] Bun 1.2.13+ installed ([bun.sh](https://bun.sh))
- [ ] Google AI API key ([get one here](https://makersuite.google.com/app/apikey))
- [ ] (Optional) Weather API key ([openweathermap.org](https://openweathermap.org/api))

### Installation ✓

```bash
# 1. Clone the repository
git clone https://github.com/gokceno/sufle.git
cd sufle

# 2. Install dependencies
bun install

# 3. Copy example configurations
cp apps/api/sufle.yml.example apps/api/sufle.yml
cp apps/cli/sufle.yml.example apps/cli/sufle.yml
```

### Configuration ✓

#### 1. API Server Configuration (`apps/api/sufle.yml`)

```yaml
# Minimum required configuration:

output_models:
  - id: sufle/default
    owned_by: sufle
    chat:
      provider: google
      opts:
        model: gemini-2.0-flash
        api_key: YOUR_GOOGLE_API_KEY_HERE  # ← Add your key
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
      api_key: YOUR_GOOGLE_API_KEY_HERE  # ← Add your key
  retriever:
    opts:
      k: 5
  vector_store:
    provider: libsql

permissions:
  - api_keys:
      - my-secret-key  # ← Change this to a secure key
    workspaces:
      - docs:rw
```

#### 2. CLI Worker Configuration (`apps/cli/sufle.yml`)

```yaml
# Minimum required configuration:

backend:
  api_key: my-secret-key  # ← Must match API permissions
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
    api_key: YOUR_GOOGLE_API_KEY_HERE  # ← Add your key

workspaces:
  - id: docs  # ← Must match API permissions
    remote: disk
    dirs:
      - ./sample/data  # ← Add your document paths
```

### Running Sufle ✓

#### Option A: Run Locally (Development)

```bash
# Terminal 1 - Start API server
cd apps/api
bun src/index.ts

# Terminal 2 - Start indexer
cd apps/cli
bun src/main.js index

# Terminal 3 - Start vectorizer
cd apps/cli
bun src/main.js vectorize

# Terminal 4 - Start reducer (optional)
cd apps/cli
bun src/main.js reduce
```

#### Option B: Docker Compose (Production)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Verify Installation ✓

```bash
# 1. Check API is running
curl http://localhost:3000
# Expected: {"server":"running"}

# 2. List available models
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer my-secret-key"

# 3. Test document query (after indexing completes)
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer my-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{"role": "user", "content": "What documents do you have?"}]
  }'
```

## Next Steps

### Add Your Documents

1. Create a directory for your documents
2. Add the path to `apps/cli/sufle.yml` under `workspaces[].dirs`
3. The indexer will automatically scan and process files

```yaml
workspaces:
  - id: docs
    remote: disk
    dirs:
      - ./sample/data
      - /path/to/your/documents  # ← Add here
```

### Add Custom Tools

Enable the weather tool (example):

```yaml
# In apps/api/sufle.yml
tools:
  - tool: weather
    opts:
      api_key: YOUR_WEATHER_API_KEY
```

Test it:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer my-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{"role": "user", "content": "What is the weather in Paris?"}]
  }'
```

### Add MCP Servers

Connect a database (example):

```yaml
# In apps/api/sufle.yml
mcp_servers:
  - server: mydb
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/app.db"]
    instructions: |
      Database schema:
      - users (id, email, name)
      
      Use execute_sql to query.
```

### Create Your First Custom Tool

See [docs/developing-tools.md](docs/developing-tools.md) for detailed instructions.

Quick example:

```typescript
// packages/tool-myfeature/src/index.ts
import { z } from "zod";

export const name = "myTool";
export const description = "What this tool does";

export const create = (opts) => {
  const schema = z.object({
    input: z.string().describe("Input parameter"),
  });
  
  const provider = async (input: any) => {
    const { input: param } = schema.parse(input);
    // Your logic here
    return { result: "data" };
  };
  
  return { provider, schema, name, description };
};
```

## Common Issues

### "Config file not found"

**Solution:** Ensure you're running commands from the correct directory or set `CONFIG_PATH`:

```bash
export CONFIG_PATH=/full/path/to/sufle.yml
```

### "No permissions set for user"

**Solution:** Check that:
- API key in CLI config matches one in API permissions
- Workspace IDs in CLI config exist in API permissions

### "Configured tool X is not available"

**Solution:** 
1. Export tool in `apps/api/src/tools/index.ts`
2. Add to `package.json` dependencies
3. Run `bun install`

### Workers not processing documents

**Solution:**
- Check logs for errors: `export LOG_LEVEL=debug`
- Verify file permissions on document directories
- Ensure API is reachable from CLI
- Check schedule expressions are valid cron

## Learning Path

**Day 1: Basic RAG**
- Set up API and CLI
- Index sample documents
- Query documents via API
- ✓ You have a working RAG system

**Day 2: Add Tools**
- Enable weather tool
- Test combined queries (docs + weather)
- Review tool calling logs
- ✓ You understand tool orchestration

**Day 3: Create Custom Tool**
- Follow [developing-tools.md](docs/developing-tools.md)
- Build a simple tool (e.g., calculator)
- Test with queries
- ✓ You can extend Sufle

**Day 4: Integrate MCP**
- Set up database MCP server
- Write instructions for the LLM
- Test database queries
- ✓ You can connect external data

**Week 2: Production**
- Configure permissions properly
- Set appropriate worker schedules
- Add monitoring and logging
- Deploy with Docker Compose
- ✓ You're running Sufle in production

## Resources

- **[README.md](README.md)** - Project overview
- **[docs/why-sufle.md](docs/why-sufle.md)** - Understand the platform
- **[docs/quick-reference.md](docs/quick-reference.md)** - Common patterns
- **[docs/developing-tools.md](docs/developing-tools.md)** - Build custom tools
- **[docs/mcp-integration.md](docs/mcp-integration.md)** - Connect data sources
- **[docs/architecture.md](docs/architecture.md)** - System internals
- **[docs/installation.md](docs/installation.md)** - Detailed setup
- **[docs/usage.md](docs/usage.md)** - API and CLI reference

## Getting Help

- **GitHub Issues:** [github.com/gokceno/sufle/issues](https://github.com/gokceno/sufle/issues)
- **Documentation:** Check the `docs/` directory
- **Examples:** Review `apps/api/sufle.yml.example` and `apps/cli/sufle.yml.example`

## Success Indicators

You know Sufle is working when:

- ✓ API responds to health check
- ✓ Workers log successful indexing
- ✓ Document queries return relevant results
- ✓ Tool calls execute successfully
- ✓ Combined queries (docs + tools) work seamlessly
- ✓ MCP servers connect and respond

---

**Ready to start?** Follow the installation steps above and configure your API keys!
