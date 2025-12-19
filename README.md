# Sufle

A RAG (Retrieval-Augmented Generation) system that indexes documents from various sources and provides OpenAI-compatible chat completion endpoints with intelligent document retrieval.

## What It Does

Sufle watches your document workspaces, creates embeddings, and lets you query them through a familiar chat interface. When you ask questions, it retrieves relevant context from your documents and generates answers using LLMs.

**Core capabilities:**
- Index documents from local filesystems or remote storage (via rclone)
- Generate and store embeddings using Google, OpenAI, or Ollama
- Query documents through OpenAI-compatible API endpoints
- Workspace-based permissions for multi-tenant setups
- Extend with custom tools and MCP servers

## Architecture

Sufle consists of two main components:

- **API Server** - Fastify-based HTTP server that provides OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/models`)
- **CLI Workers** - Background processes that handle document indexing, vectorization, and cleanup

See [Architecture](docs/architecture.md) for details.

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

### Usage

Query your documents using the OpenAI-compatible API:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{"role": "user", "content": "What are the key points in my documents?"}]
  }'
```

See [Usage Guide](docs/usage.md) for more examples and integration options.

## Documentation

- [Architecture](docs/architecture.md) - System design and components
- [Installation & Configuration](docs/installation.md) - Setup guide with all configuration options
- [Usage Guide](docs/usage.md) - API endpoints and CLI commands

## License

MIT - See [LICENSE](LICENSE) for details.