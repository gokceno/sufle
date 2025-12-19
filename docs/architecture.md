# Architecture

Sufle is a RAG platform built around three core capabilities: document retrieval, custom tool calling, and MCP server integration. The distributed architecture separates request serving from document processing, allowing independent scaling of each component.

## Components

### API Server

HTTP server that handles client requests and provides OpenAI-compatible endpoints.

**Technology:** Fastify + Bun  
**Port:** 3000  
**Database:** LibSQL (SQLite)

**Key responsibilities:**
- Authenticate requests via API keys or bearer tokens
- Handle chat completion requests with RAG + tool calling
- Orchestrate custom tools and MCP server tools
- Manage document and embedding CRUD operations
- Enforce workspace-based permissions
- Coordinate with LLM providers, vector store, and external tools

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

## RAG + Tool Calling Pipeline

When processing a chat request, Sufle uses an agent-based approach:

1. **Authentication** - Verify API key/bearer token
2. **Permission Check** - Filter accessible workspaces
3. **Agent Initialization** - Load RAG retriever, custom tools, and MCP tools
4. **LLM Decision Making** - The LLM analyzes the query and decides:
   - Should I retrieve from documents?
   - Should I call tools?
   - Which combination is needed?
5. **Document Retrieval** (if needed):
   - Generate embedding for user question
   - Vector search for top-k similar chunks (cosine similarity)
   - Assemble retrieved context
6. **Tool Execution** (if needed):
   - Call custom tools (weather, exchange rates, etc.)
   - Call MCP server tools (database queries, API calls, etc.)
   - Tools can be called multiple times or in sequence
7. **Synthesis** - LLM combines:
   - Retrieved document context
   - Tool execution results
   - Its general knowledge
8. **Response** - Return generated answer with token counts

The system uses LangChain's agent framework with tool calling capabilities, giving the LLM full control over when and how to use each resource.

## Tool Calling Architecture

Tool calling is a first-class feature in Sufle, not an afterthought. The system treats custom tools and MCP servers equally, presenting all available capabilities to the LLM.

### Custom Tools

Domain-specific functionality built as packages:

```yaml
tools:
  - tool: weather
    opts:
      api_key: YOUR_KEY
  - tool: calculatePrice
    opts:
      discountRules: /config/rules.json
```

**Architecture flow:**
1. Tools defined in `packages/tool-*` directories
2. Exported from `apps/api/src/tools/index.ts`
3. Loaded during API startup based on configuration
4. Registered with LangChain agent as callable functions
5. LLM receives tool name, description, and schema
6. LLM decides when to invoke based on user query
7. Tool execution happens automatically
8. Results integrated into LLM response

See [Developing Tools](developing-tools.md) for implementation details.

### MCP Servers

Pre-built integrations for databases, APIs, and services:

```yaml
mcp_servers:
  - server: database
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/app.db"]
    instructions: |
      Database schema and usage guidelines for the LLM.
```

**Architecture flow:**
1. MCP servers configured with command and arguments
2. API spawns MCP server processes on startup
3. MultiServerMCPClient connects to each server via stdio
4. Tools discovered automatically from each server
5. Instructions added to LLM system prompt
6. LLM treats MCP tools same as custom tools
7. Tool calls routed to appropriate MCP server
8. Results returned to LLM for synthesis

See [MCP Integration Guide](mcp-integration.md) for setup and examples.

### Unified Tool Interface

From the LLM's perspective, custom tools and MCP tools are identical:

```
Available tools:
- weather (custom): Get current weather for any city
- exchangeRates (custom): Get currency exchange rates
- execute_sql (MCP): Query the database
- read_file (MCP): Read file contents
```

The LLM chooses freely among all tools based on the query. It might:
- Use only custom tools: "What's the weather in Tokyo?"
- Use only MCP tools: "Query the database for recent orders"
- Use only RAG: "What does our refund policy say?"
- Combine all three: "What's our policy on weather delays, and did we have any delayed shipments during yesterday's storm in Chicago?"

This unified approach makes the system highly flexible and extensible.

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

## Tool Discovery and Registration

When the API server starts:

```
1. Load configuration (YAML + env overrides)
2. Import all custom tools from tools/index.ts
3. Match configured tools with available implementations
4. Instantiate each tool with its opts
5. Start MCP server processes (if configured)
6. Connect MCP client and discover tools
7. Register all tools with LangChain agent
8. Build unified system prompt with tool descriptions and MCP instructions
9. Ready to handle requests
```

This happens once at startup, keeping request handling fast.

## Configuration Management

Configuration is YAML-based with environment variable override support.

**Loading priority:**
1. Load YAML file
2. Override with environment variables (e.g., `EMBEDDINGS__API_KEY`)
3. Validate against schema (Zod)
4. Convert to camelCase for code usage

This allows Docker/K8s-friendly deployments while maintaining readable configs.

Tools and MCP servers are configured declaratively, making it easy to enable/disable capabilities without code changes.