# Installation & Configuration

This guide covers installing Sufle and configuring both the API server and CLI workers.

## Prerequisites

- **Bun** 1.2.13 or higher ([installation guide](https://bun.sh))
- **Embedding Provider** - One of:
  - Google AI API key (recommended)
  - OpenAI API key
  - Ollama instance (for local embeddings)
- **LLM Provider** - Currently supports:
  - Google Gemini API key

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/gokceno/sufle.git
cd sufle

# Install dependencies
bun install
```

### Using Docker Compose

```bash
# Clone and configure
git clone https://github.com/gokceno/sufle.git
cd sufle

# Create configuration files (see Configuration section)
cp apps/api/sufle.yml.example apps/api/sufle.yml
cp apps/cli/sufle.yml.example apps/cli/sufle.yml

# Edit configuration files with your settings
# Then start all services
docker-compose up -d
```

## Configuration

Sufle uses YAML configuration files. You need separate configs for the API server and CLI workers.

### API Configuration

Create `apps/api/sufle.yml`:

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

permissions:
  - users:
      - user@example.com
    api_keys:
      - your-api-key-here
    workspaces:
      - docs:rw
      - reports:r
```

**Configuration fields:**

#### `output_models`
Define LLM models exposed through the API.

- `id` - Model identifier used in API requests
- `owned_by` - Model owner/provider name
- `chat.provider` - LLM provider (`google` only currently)
- `chat.opts.model` - Provider-specific model name
- `chat.opts.api_key` - Provider API key
- `chat.opts.temprature` - Temperature for generation (0-1)
- `chat.opts.max_messages` - Maximum conversation history
- `chat.opts.max_tokens` - Maximum output tokens
- `chat.opts.max_message_length` - Maximum input message length

#### `rag`
RAG pipeline configuration.

- `provider` - RAG implementation (`langchain`)
- `embeddings.provider` - Embedding provider (`google`, `openai`, `ollama`)
- `embeddings.opts.model` - Embedding model name
- `embeddings.opts.api_key` - API key (not needed for Ollama)
- `embeddings.opts.base_url` - Base URL (for Ollama or custom endpoints)
- `retriever.opts.k` - Number of document chunks to retrieve
- `vector_store.provider` - Vector store backend (`libsql`)

#### `tools` (optional)
Custom tools to extend LLM capabilities.

```yaml
tools:
  - tool: weather
    opts:
      api_key: YOUR_WEATHER_API_KEY
  - tool: exchangeRates
```

#### `mcp_servers` (optional)
Model Context Protocol server integrations.

```yaml
mcp_servers:
  - server: database
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/app.db"]
    env:
      DATABASE_URL: "sqlite:///data/app.db"
    instructions: |
      Guidelines for using this MCP server...
```

#### `permissions`
Workspace access control.

- `users` - Email addresses with access
- `api_keys` - API keys with access
- `workspaces` - Workspace IDs with access level (`workspace-id:r`, `workspace-id:w`, `workspace-id:rw`)

### CLI Configuration

Create `apps/cli/sufle.yml`:

```yaml
backend:
  api_key: your-api-key-here
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
    api_key: YOUR_GOOGLE_API_KEY

workspaces:
  - id: docs
    remote: disk
    dirs:
      - /path/to/documents
      - /another/path
```

**Configuration fields:**

#### `backend`
Connection to API server.

- `api_key` - API key matching one in API's permissions
- `base_url` - API server URL

#### `schedule`
Cron expressions for each worker.

- `index` - When to scan for new/changed documents
- `reduce` - When to cleanup deleted documents
- `vectorize` - When to process pending documents

Examples:
- `"* * * * *"` - Every minute
- `"*/5 * * * *"` - Every 5 minutes
- `"0 * * * *"` - Every hour
- `"0 0 * * *"` - Daily at midnight

#### `storage`
Document storage backend.

**Local filesystem:**
```yaml
storage:
  provider: local
```

**rclone (S3, GCS, etc.):**
```yaml
storage:
  provider: rclone
  opts:
    url: http://rclone:5572
    username: admin
    password: password
```

Requires running rclone daemon. See `docker-compose.yml` for example setup.

#### `embeddings`
Must match API configuration.

- `provider` - `google`, `openai`, or `ollama`
- `opts.model` - Embedding model name
- `opts.api_key` - API key (if required)
- `opts.base_url` - Base URL (for Ollama)

#### `workspaces`
Document collections to index.

- `id` - Workspace identifier (must match API permissions)
- `remote` - Remote name in rclone config (for rclone provider)
- `dirs` - Array of directory paths to index

## Environment Variables

Configuration values can be overridden with environment variables using double underscores:

```bash
# Override embedding API key
export EMBEDDINGS__OPTS__API_KEY="new-key"

# Override backend URL
export BACKEND__BASE_URL="https://api.example.com"

# Set log level
export LOG_LEVEL="debug"
```

Standard environment variables:

- `LOG_LEVEL` - `debug`, `info`, `warn`, `error` (default: `info`)
- `CONFIG_PATH` - Path to config file (default: `./sufle.yml`)
- `DB_PATH` - Database path (default: `./db/db.sqlite`)
- `DB_MIGRATIONS_APPLY` - Apply migrations on start (`true`/`false`)

## Database Setup

Sufle uses LibSQL (SQLite-compatible) for metadata and embeddings.

### Automatic Migration

Set `DB_MIGRATIONS_APPLY=true` to run migrations automatically on startup (recommended for development and Docker).

### Manual Migration

```bash
# API migrations
cd apps/api
bun run drizzle-kit migrate

# CLI migrations
cd apps/cli
bun run cli:db migrate
```

## Provider Setup

### Google AI

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to configuration:

```yaml
embeddings:
  provider: google
  opts:
    model: text-embedding-004
    api_key: YOUR_KEY

output_models:
  - chat:
      provider: google
      opts:
        model: gemini-2.5-flash
        api_key: YOUR_KEY
```

### OpenAI

```yaml
embeddings:
  provider: openai
  opts:
    model: text-embedding-3-small
    api_key: YOUR_OPENAI_KEY
```

### Ollama (Local)

```bash
# Start Ollama
ollama serve

# Pull embedding model
ollama pull nomic-embed-text
```

```yaml
embeddings:
  provider: ollama
  opts:
    model: nomic-embed-text
    base_url: http://localhost:11434
```

## Storage Setup

### Local Filesystem

No additional setup required. Ensure CLI has read access to configured directories.

### rclone (Remote Storage)

1. Create `apps/cli/rclone.conf`:

```ini
[s3-remote]
type = s3
provider = AWS
access_key_id = YOUR_KEY
secret_access_key = YOUR_SECRET
region = us-east-1
```

2. Start rclone daemon (or use Docker Compose):

```bash
rclone rcd --rc-addr=:5572 --rc-user=admin --rc-pass=password
```

3. Configure CLI:

```yaml
storage:
  provider: rclone
  opts:
    url: http://localhost:5572
    username: admin
    password: password

workspaces:
  - id: docs
    remote: s3-remote
    dirs:
      - bucket-name/documents
```

## Verification

Start components and verify setup:

```bash
# Terminal 1: Start API
cd apps/api
bun src/index.ts

# Terminal 2: Check API health
curl http://localhost:3000
# Expected: {"server":"running"}

# Terminal 3: Start indexer
cd apps/cli
bun src/main.js index

# Terminal 4: Start vectorizer
bun src/main.js vectorize

# Check logs for successful indexing
```

## Troubleshooting

**"Config file not found"**
- Verify `CONFIG_PATH` points to correct location
- Check file permissions

**"Invalid config: ..."**
- Validate YAML syntax
- Check required fields against schema
- Review field types (strings vs numbers)

**"No permissions set for user"**
- Verify API key exists in `permissions` array
- Check workspace IDs match between API and CLI configs

**"Document not found or not enough permissions"**
- Ensure workspace ID in CLI matches API permissions
- Check access level (`r`, `w`, or `rw`)

**"Error storing embeddings"**
- Verify embedding dimensions match between provider and vector store
- Check API connectivity from CLI
- Review API logs for details

**Workers not processing documents**
- Verify cron expressions are valid
- Check file permissions on document directories
- Review worker logs for errors
- Ensure API is reachable from CLI