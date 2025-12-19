# Usage Guide

This guide covers using Sufle's API endpoints and CLI commands.

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