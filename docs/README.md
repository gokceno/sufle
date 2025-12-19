# Sufle Documentation

Welcome to the Sufle documentation. This guide will help you understand, install, and use Sufle effectively.

## What is Sufle?

Sufle is a RAG platform with native tool calling and MCP server integration. It combines document retrieval with extensible custom tools and external data sources, giving your LLM autonomous access to any information or service you define.

## Documentation Overview

### Getting Started

- **[Why Sufle?](why-sufle.md)** - Understand how Sufle differs from basic RAG systems and when to use it
- **[Quick Reference](quick-reference.md)** - Common patterns, examples, and quick answers
- **[Installation & Configuration](installation.md)** - Complete setup guide with all configuration options

### Core Concepts

- **[Architecture](architecture.md)** - System design, components, and data flow
- **[Usage Guide](usage.md)** - API endpoints, CLI commands, and integration examples

### Extending Sufle

- **[Developing Tools](developing-tools.md)** - Create custom tools for domain-specific functionality
- **[MCP Integration Guide](mcp-integration.md)** - Connect databases, APIs, and services via Model Context Protocol

## Quick Navigation

### I want to...

**Understand the system:**
- [What makes Sufle different?](why-sufle.md#the-sufle-approach)
- [How does tool calling work?](architecture.md#tool-calling-architecture)
- [What are MCP servers?](mcp-integration.md#what-is-mcp)

**Get started:**
- [Install Sufle](installation.md#installation)
- [Configure the API server](installation.md#api-configuration)
- [Configure the CLI workers](installation.md#cli-configuration)
- [Start everything up](../README.md#running)

**Use the API:**
- [Chat completions endpoint](usage.md#chat-completions)
- [List available models](usage.md#list-models)
- [Query with tools](usage.md#tool-calling-examples)
- [Integration examples](usage.md#integration-examples)

**Develop custom tools:**
- [Create a simple tool](developing-tools.md#creating-a-new-tool)
- [Write good descriptions](developing-tools.md#writing-good-tool-descriptions)
- [Handle errors properly](developing-tools.md#error-handling)
- [Test your tool](developing-tools.md#testing-tools)

**Integrate MCP servers:**
- [Configure a database server](mcp-integration.md#database-servers)
- [Write effective instructions](mcp-integration.md#writing-effective-instructions)
- [Use multiple MCP servers](mcp-integration.md#complex-example-multi-database-setup)
- [Combine with RAG and tools](mcp-integration.md#combining-mcp-with-rag-and-custom-tools)

**Troubleshoot:**
- [Common installation issues](installation.md#troubleshooting)
- [Tool registration problems](quick-reference.md#common-error-solutions)
- [MCP server debugging](mcp-integration.md#troubleshooting)

## Key Features

### 1. RAG with Semantic Search
Index documents from various sources and query them with natural language. Documents are automatically chunked, embedded, and stored in a vector database for fast similarity search.

### 2. Custom Tool Calling
Create domain-specific tools that the LLM can call automatically. Tools can access APIs, perform calculations, or execute any custom logic you define.

### 3. MCP Server Integration
Connect to databases, file systems, and APIs using pre-built MCP servers. The LLM discovers and uses these tools automatically alongside your custom tools.

### 4. Intelligent Orchestration
The LLM autonomously decides when to:
- Retrieve from documents
- Call custom tools
- Query MCP servers
- Combine all three sources

### 5. OpenAI Compatible API
Works with existing OpenAI client libraries and tools. Simply point your client to Sufle's base URL and everything works.

### 6. Multi-Tenant Permissions
Workspace-based access control lets you separate data by customer, department, or project while running a single instance.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                         User Query                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │     API Server       │
              │  (OpenAI-compatible) │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌──────────┐   ┌────────────┐
    │  RAG   │    │ Custom   │   │    MCP     │
    │Retriever│   │  Tools   │   │  Servers   │
    └────┬───┘    └────┬─────┘   └─────┬──────┘
         │             │               │
         ▼             ▼               ▼
    Documents      Weather API     Database
                   Exchange rates   Filesystem
                   Custom logic    External APIs
```

Background workers (CLI) continuously index and vectorize documents.

## Configuration Example

Minimal configuration to get started:

```yaml
# API Server (apps/api/sufle.yml)
output_models:
  - id: sufle/default
    owned_by: sufle
    chat:
      provider: google
      opts:
        model: gemini-2.5-flash
        api_key: YOUR_API_KEY
        
rag:
  provider: langchain
  embeddings:
    provider: google
    opts:
      model: text-embedding-004
      api_key: YOUR_API_KEY
  retriever:
    opts:
      k: 5
  vector_store:
    provider: libsql

tools:
  - tool: weather
    opts:
      api_key: YOUR_WEATHER_KEY

permissions:
  - api_keys: [your-key]
    workspaces: [docs:rw]
```

See [Installation Guide](installation.md) for complete configuration options.

## Example Queries

**Document only:**
```
Q: "What is our vacation policy?"
A: [Retrieves policy from documents]
```

**Tool only:**
```
Q: "What's the weather in London?"
A: [Calls weather tool]
```

**MCP only:**
```
Q: "How many users signed up last week?"
A: [Queries database via MCP server]
```

**Combined:**
```
Q: "What's our weather delay policy, and was there severe weather 
    in Chicago yesterday affecting our shipments?"
A: [Retrieves policy] + [Calls weather tool] + [Queries shipping database]
   → Synthesized response combining all three sources
```

## Community and Support

- **GitHub:** [github.com/gokceno/sufle](https://github.com/gokceno/sufle)
- **Issues:** Report bugs and request features on GitHub
- **License:** MIT

## Contributing

Contributions welcome! Areas where you can help:

- Create new custom tools
- Build MCP server integrations
- Improve documentation
- Add provider support (embeddings, LLMs)
- Enhance CLI capabilities

See the repository for contribution guidelines.

## Next Steps

1. **New to Sufle?** Start with [Why Sufle?](why-sufle.md) to understand the platform
2. **Ready to install?** Follow the [Installation Guide](installation.md)
3. **Building tools?** Check out [Developing Tools](developing-tools.md)
4. **Integrating data sources?** See [MCP Integration Guide](mcp-integration.md)
5. **Need quick answers?** Use the [Quick Reference](quick-reference.md)