---
marp: true
theme: default
paginate: true
---

# Sufle
## Enterprise RAG Platform

**On-Premise AI Infrastructure**

Technical Architecture & Capabilities

---

# What is Sufle?

**Beyond Basic RAG** - Three unified capabilities:

- 🔍 **Document Retrieval** - Semantic search across docs
- 🛠️ **Custom Tools** - Domain-specific functions & APIs
- 🔌 **MCP Servers** - Database & external service access

**LLM autonomously decides** which combination to use per query

**OpenAI-compatible API** - Drop-in replacement

---

# Architecture

```
         User Query
              │
              ▼
      ┌──────────────┐
      │  API Server  │  ← OpenAI-compatible
      │ Fastify+Bun  │  ← Multi-tenant
      └──────┬───────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
  RAG    Custom    MCP
         Tools   Servers
```

**Background Workers**: Index → Vectorize → Reduce

---

# Component Architecture

**API Server** (Port 3000)
- OpenAI `/v1/chat/completions` endpoint
- Multi-tenant workspace permissions
- LibSQL/SQLite database

**CLI Workers** (Background)
- **Index**: Scans directories, MD5 hashing
- **Vectorize**: Generates embeddings
- **Reduce**: Cleanup deleted documents

**Deploy**: Single instance | Docker Compose | Kubernetes

---

# On-Premise: Critical for Corporations

**Why On-Premise?**
- ✅ **Data Sovereignty** - Full control
- ✅ **Compliance** - GDPR, HIPAA, SOC2
- ✅ **Security** - Your infrastructure only
- ✅ **Cost Control** - No per-query pricing

**Deployment Options**
- Local development (single machine)
- Docker Compose (included, production-ready)
- Kubernetes (distributed scaling)
- Storage: Local filesystem or S3/GCS

---

# Tool Calling & Configuration

```yaml
tools:
  - tool: weather
    opts:
      api_key: ${WEATHER_API_KEY}

mcp_servers:
  - server: postgres
    command: npx
    args: ["@modelcontextprotocol/server-postgres"]

permissions:
  - users: [eng@corp.com]
    workspaces: [docs:rw, code:r]
```

**Extensible** - Add tools via config, no code changes

---

# Summary

**Technical**
- Hybrid RAG + Tool Calling in one API
- Distributed architecture (scale independently)
- OpenAI-compatible

**Enterprise**
- 100% On-Premise deployment
- Docker Compose included
- Multi-tenant permissions
- MIT Licensed
