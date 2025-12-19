# Usage Guide

This guide covers using Sufle's API endpoints, CLI commands, and demonstrates how tool calling and MCP integration work in practice.

## API Usage

Sufle provides OpenAI-compatible endpoints, making it easy to integrate with existing tools and libraries.

### Authentication

All API requests require authentication via:

**API Key (for machine-to-machine):**
```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**User Authentication (for web apps):**
Uses email-based verification through OWUI integration.

### Chat Completions

Query your documents using natural language.

**Endpoint:** `POST /v1/chat/completions`

**Request:**
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [
      {"role": "user", "content": "What are the main topics in my documents?"}
    ],
    "stream": false
  }'
```

**Response:**
```json
{
  "id": "chatcmpl-xyz123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "sufle/default",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Based on your documents, the main topics are..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  }
}
```

**Parameters:**
- `model` (required) - Model ID from your configuration
- `messages` (required) - Array of conversation messages
- `stream` (optional) - Streaming not currently supported, must be `false`

### List Models

Get available models from your configuration.

**Endpoint:** `GET /v1/models`

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "sufle/default",
      "owned_by": "sufle",
      "supports_streaming": false,
      "object": "model",
      "created": 1234567890,
      "capabilities": {
        "vision": false,
        "function_calling": false,
        "tool_calling": false
      }
    }
  ]
}
```

### Get Model Details

**Endpoint:** `GET /v1/models/:model`

```bash
curl http://localhost:3000/v1/models/sufle/default \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Document Management

These endpoints are used internally by CLI workers but can be accessed directly if needed.

#### Create Document

**Endpoint:** `POST /documents`

```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "docs",
    "fileRemote": "disk",
    "filePath": "/path/to/document.pdf"
  }'
```

#### Get Document

**Endpoint:** `GET /document`

```bash
curl http://localhost:3000/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-File-Path: /path/to/document.pdf" \
  -H "X-Workspace-Id: docs"
```

#### Update Document

**Endpoint:** `PUT /documents/:id`

```bash
curl -X PUT http://localhost:3000/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fileMd5Hash": "abc123def456"
  }'
```

#### Delete Document

**Endpoint:** `DELETE /documents/:id`

```bash
curl -X DELETE http://localhost:3000/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Tool Calling Examples

These examples demonstrate how Sufle combines document retrieval with custom tools and MCP servers.

### Pure Document Query

Query only retrieves from indexed documents:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "What does our employee handbook say about vacation days?"
    }]
  }'
```

The LLM retrieves relevant sections from your documents and synthesizes an answer.

### Custom Tool Call

Query triggers a custom tool:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "What is the current weather in Paris?"
    }]
  }'
```

The LLM:
1. Recognizes this requires real-time data
2. Calls the `weather` tool with `city: "Paris"`
3. Receives weather data
4. Formats a natural response

### MCP Server Call

Query uses an MCP server tool:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "How many support tickets were opened last week?"
    }]
  }'
```

The LLM:
1. Identifies this needs database access
2. Calls MCP server's `execute_sql` tool
3. Constructs appropriate SQL query
4. Processes results and responds

### Combined: Documents + Tool

Query combines document context with tool calls:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "According to our travel policy, can I get reimbursed for a flight to London? Also, what is the current exchange rate for GBP?"
    }]
  }'
```

The LLM:
1. Retrieves travel policy from documents
2. Calls `exchangeRates` tool with `currency: "GBP"`
3. Combines both sources in the response

### Combined: Documents + MCP

Query combines documents with database access:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "What does our SLA say about response times, and how are we performing against it this month?"
    }]
  }'
```

The LLM:
1. Retrieves SLA document sections
2. Queries database via MCP for actual response time metrics
3. Compares policy vs reality in response

### Combined: All Three

Query uses documents, custom tools, and MCP servers:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "Review our severe weather policy, check current weather in our Dallas office location, and query if we had any incident tickets filed from Dallas in the past 24 hours."
    }]
  }'
```

The LLM:
1. Retrieves severe weather policy from documents
2. Calls `weather` tool for Dallas
3. Calls MCP `execute_sql` to query incident database
4. Synthesizes all information into coherent response

### Multi-Turn Conversations with Tools

Tools work across conversation turns:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"},
      {"role": "assistant", "content": "The current weather in Tokyo is sunny, 22°C..."},
      {"role": "user", "content": "What does our travel policy say about trips to Japan?"}
    ]
  }'
```

The LLM maintains context and can reference previous tool calls.

#### Store Embeddings

**Endpoint:** `POST /documents/:id/embeddings`

```bash
curl http://localhost:3000/documents/DOCUMENT_ID/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, 0.3, ...],
    "chunkText": "Content of this chunk..."
  }'
```

## CLI Usage

The CLI provides three worker commands that run continuously on scheduled intervals.

### Index Command

Scans workspaces for new or changed documents.

```bash
bun start:cli index --config-file ./sufle.yml
```

**What it does:**
1. Lists files in configured workspace directories
2. Computes MD5 hash for each file
3. Creates/updates document records in database
4. Tracks file versions when content changes

**Supported file types:**
- PDF (`.pdf`)
- Markdown (`.md`)
- Text (`.txt`)
- Word (`.docx`)
- HTML (`.html`)

**Options:**
- `--config-file` - Path to configuration file (default: `./sufle.yml`)

**Output:**
```
[info] Indexing job started...
[info] Indexed 5 file(s)
[info] Versioned 2 file(s)
```

### Vectorize Command

Processes documents into embeddings and stores them.

```bash
bun start:cli vectorize --config-file ./sufle.yml
```

**What it does:**
1. Fetches unprocessed documents from API
2. Reads file content from storage
3. Converts to markdown/plain text
4. Chunks content semantically
5. Generates embeddings for each chunk
6. Stores embeddings via API

**Options:**
- `--config-file` - Path to configuration file (default: `./sufle.yml`)

**Processing behavior:**
- Processes 8 chunks concurrently (configurable in code)
- Maintains progress to resume if interrupted
- Updates document status after completion

**Output:**
```
[info] Vectorizing job started...
[info] Loaded 3 document(s)
[info] Loaded file: /path/to/doc.pdf
[info] Started processing total of 45 chunks.
[info] Started processing from 0. chunk.
[info] Processed 8 chunks, completed a total of 8 chunks.
[info] Processed 8 chunks, completed a total of 16 chunks.
...
```

### Reduce Command

Removes documents that no longer exist in storage.

```bash
bun start:cli reduce --config-file ./sufle.yml
```

**What it does:**
1. Loads all documents from database
2. Checks if each file still exists in storage
3. Deletes records for missing files
4. Cleans up associated embeddings (cascading delete)

**Options:**
- `--config-file` - Path to configuration file (default: `./sufle.yml`)

**Output:**
```
[info] Reducing job started...
[info] Loaded 150 documents.
```

## Understanding Tool Behavior

### How the LLM Decides

The LLM automatically determines the best approach based on:

1. **Query keywords** - "current", "weather", "latest" suggest tools
2. **Tool descriptions** - Well-written descriptions guide usage
3. **Available context** - If documents contain the answer, tools may not be needed
4. **Query complexity** - Complex queries may require multiple tools
5. **MCP instructions** - Guidelines in your configuration

### Observing Tool Calls

Enable debug logging to see tool execution:

```bash
export LOG_LEVEL=debug
bun start:api
```

Example log output:
```
[debug] Calling tool: weather
[debug] Tool input: {"city": "Paris"}
[debug] Tool result: {"temp": 18, "conditions": "cloudy"}
[debug] Calling tool: execute_sql
[debug] Tool input: {"query": "SELECT COUNT(*) FROM tickets WHERE created_at > NOW() - INTERVAL '7 days'"}
[debug] Tool result: [{"count": 47}]
```

### Tool Call Failures

If a tool fails, the LLM handles it gracefully:

```json
{
  "role": "assistant",
  "content": "I attempted to check the weather but encountered an error with the weather service. However, based on your documents, your travel policy states..."
}
```

The LLM falls back to available information.

## Integration Examples

### Python with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="sufle/default",
    messages=[
        {"role": "user", "content": "Summarize the quarterly reports"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'http://localhost:3000/v1'
});

const response = await client.chat.completions.create({
  model: 'sufle/default',
  messages: [
    { role: 'user', content: 'What are the key findings?' }
  ]
});

console.log(response.choices[0].message.content);
```

### Python with Tool-Aware Queries

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="http://localhost:3000/v1"
)

# Query that will use tools
response = client.chat.completions.create(
    model="sufle/default",
    messages=[
        {
            "role": "user",
            "content": "What's the weather in our Seattle office and what does our remote work policy say about weather-related work from home?"
        }
    ]
)

print(response.choices[0].message.content)
# Response combines weather tool data with document retrieval
```

### cURL

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is in my documents about Q4 2024?"}
    ]
  }'
```

### LangChain

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="sufle/default",
    openai_api_key="YOUR_API_KEY",
    openai_api_base="http://localhost:3000/v1"
)

response = llm.invoke("What are the main topics?")
print(response.content)
```

## Workspace Permissions

Access is controlled by workspace assignments in your configuration.

**Read-only access:**
```yaml
permissions:
  - api_keys: [key-123]
    workspaces: [docs:r, reports:r]
```

User with `key-123` can query documents but cannot modify them.

**Read-write access:**
```yaml
permissions:
  - api_keys: [key-456]
    workspaces: [docs:rw]
```

User with `key-456` can query and manage documents in the `docs` workspace.

**Queries are automatically scoped:**
When you query, only documents from your accessible workspaces are searched. You don't need to specify workspaces in your requests.

## Tips and Best Practices

### Optimize Retrieval

Adjust `k` in your RAG configuration to control how many document chunks are retrieved:

```yaml
rag:
  retriever:
    opts:
      k: 5  # Retrieve top 5 most relevant chunks
```

- Higher `k` = more context, slower responses, higher token usage
- Lower `k` = faster, cheaper, but may miss relevant info
- Start with 5, adjust based on your needs

### Manage Token Limits

Configure per-model limits to prevent excessive API costs:

```yaml
output_models:
  - id: sufle/default
    chat:
      opts:
        max_messages: 32      # Conversation history limit
        max_tokens: 8192      # Response length limit
        max_message_length: 4096  # Input message limit
```

### Schedule Workers Appropriately

Balance freshness vs resource usage:

```yaml
schedule:
  index: "*/5 * * * *"      # New docs every 5 min (frequent updates)
  vectorize: "*/10 * * * *" # Process every 10 min (expensive operation)
  reduce: "0 * * * *"       # Cleanup hourly (low priority)
```

For production with stable documents:
```yaml
schedule:
  index: "0 */6 * * *"      # Check every 6 hours
  vectorize: "30 */6 * * *" # Process 30 min after indexing
  reduce: "0 2 * * *"       # Cleanup daily at 2 AM
```

### Monitor Processing

Watch logs to ensure workers are functioning:

```bash
# Set debug level for detailed output
export LOG_LEVEL=debug
bun start:cli vectorize
```

### Handle Large Documents

Large files are automatically chunked. Monitor memory usage and adjust concurrency if needed (requires code modification in `vectorize.js`).

### Organize Workspaces

Use workspace IDs that reflect your data structure:

```yaml
workspaces:
  - id: engineering-docs
    dirs: [/docs/engineering]
  - id: customer-docs
    dirs: [/docs/customers]
  - id: legal-docs
    dirs: [/docs/legal]
```

Then grant different teams access to relevant workspaces.