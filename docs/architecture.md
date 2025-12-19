# Architecture

Sufle is built as a distributed system with separate components for serving requests and processing documents. This design allows scaling each part independently based on workload.

## Components

### API Server

HTTP server that handles client requests and provides OpenAI-compatible endpoints.

**Technology:** Fastify + Bun  
**Port:** 3000  
**Database:** LibSQL (SQLite)

**Key responsibilities:**
- Authenticate requests via API keys or bearer tokens
- Handle chat completion requests with RAG
- Manage document and embedding CRUD operations
- Enforce workspace-based permissions
- Coordinate with LLM providers and vector store

**Main routes:**
- `POST /v1/chat/completions` - OpenAI-compatible chat endpoint
- `GET /v1/models` - List available models
- `POST /documents` - Create document metadata
- `POST /documents/:id/embeddings` - Store embeddings

### CLI Workers

Background processes that run scheduled tasks for document management.

**Technology:** Bun + toad-scheduler  
**Database:** LibSQL (SQLite, shared with API)

**Three worker types:**

#### Index Worker
Scans configured workspaces for documents and tracks changes.

- Lists files in workspace directories
- Computes MD5 hashes to detect changes
- Creates document records and versions
- Runs on cron schedule (e.g., every 5 minutes)

#### Vectorize Worker
Processes documents into embeddings and stores them.

- Fetches unprocessed documents from API
- Converts files to markdown/text
- Chunks content semantically
- Generates embeddings via configured provider
- Stores embeddings through API
- Processes in batches to manage memory
- Runs on cron schedule (e.g., every 2 minutes)

#### Reduce Worker
Cleanup process that removes deleted documents.

- Checks if indexed documents still exist
- Removes stale records from database
- Runs on cron schedule (e.g., hourly)

## Data Flow

```
1. Index Worker discovers files
   → Creates document records in database
   → Marks documents as pending vectorization

2. Vectorize Worker processes documents
   → Fetches document content from storage
   → Generates embeddings
   → Stores embeddings via API
   → Updates document processing status

3. User sends chat request to API
   → API retrieves relevant embeddings (vector similarity search)
   → Constructs context from matched documents
   → Sends prompt + context to LLM
   → Returns generated response

4. Reduce Worker maintains consistency
   → Verifies documents still exist
   → Removes orphaned records
```

## Storage Architecture

### Document Storage
Physical files stored in configured locations:
- **Local:** Direct filesystem access
- **rclone:** Remote storage via rclone daemon (S3, GCS, etc.)

### Metadata Database (LibSQL/SQLite)
Stores document metadata, versions, and processing state.

**Key tables:**
- `documents` - Document paths, workspaces, hashes, timestamps
- `embeddings` - Vector embeddings with associated content chunks

### Vector Store
Embeddings stored in LibSQL with vector similarity search support.

The API component handles all vector operations through LangChain's LibSQLVectorStore.

## Permission Model

Workspace-based access control defined in configuration:

```yaml
permissions:
  - users: [user@example.com]
    api_keys: [key-123]
    workspaces: [workspace-1:rw, workspace-2:r]
```

**Access levels:**
- `r` - Read (query documents, get embeddings)
- `w` - Write (create/update/delete documents)
- `rw` - Read + Write

Each request is validated against the user's workspace permissions. Documents belong to a single workspace, and queries are scoped to accessible workspaces only.

## RAG Pipeline

When processing a chat request:

1. **Authentication** - Verify API key/bearer token
2. **Permission Check** - Filter accessible workspaces
3. **Embedding Query** - Generate embedding for user question
4. **Vector Search** - Find top-k similar document chunks (cosine similarity)
5. **Context Building** - Assemble retrieved chunks into context
6. **LLM Query** - Send question + context to output model
7. **Response** - Return generated answer with token counts

The system uses LangChain for RAG orchestration, allowing flexible provider configurations.

## Extensibility

### Custom Tools

Add domain-specific functionality by creating tool packages:

```yaml
tools:
  - tool: weather
    opts:
      api_key: YOUR_KEY
```

Tools are loaded dynamically and made available to the LLM during chat completions.

### MCP Servers

Integrate with Model Context Protocol servers for external data sources:

```yaml
mcp_servers:
  - server: database
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/app.db"]
    instructions: "Query guidelines..."
```

MCP servers provide tools that the LLM can use during conversations.

## Deployment Patterns

### Single Instance
Run all components on one machine for small workloads:
- 1 API server process
- 3 CLI worker processes (index, vectorize, reduce)
- Shared SQLite database

### Docker Compose
Containerized deployment with service orchestration (included in repository):
- Separate containers for API and each worker
- Volume mounts for database and documents
- Optional rclone sidecar for remote storage

### Distributed
Scale workers independently:
- 1+ API servers behind load balancer
- Multiple vectorize workers for parallel processing
- Shared database (can migrate to Turso for distributed LibSQL)
- Remote document storage (S3, GCS via rclone)

## Configuration Management

Configuration is YAML-based with environment variable override support.

**Loading priority:**
1. Load YAML file
2. Override with environment variables (e.g., `EMBEDDINGS__API_KEY`)
3. Validate against schema (Zod)
4. Convert to camelCase for code usage

This allows Docker/K8s-friendly deployments while maintaining readable configs.