# MCP Integration Guide

Model Context Protocol (MCP) is a standardized way to connect LLMs with external data sources and tools. Sufle supports MCP servers, allowing you to integrate databases, APIs, and other services without writing custom code.

## What is MCP?

MCP servers expose tools that LLMs can discover and use automatically. Instead of building a custom tool for every data source, you can use existing MCP servers that follow the protocol.

**Benefits:**
- **Pre-built integrations** - Use existing MCP servers for common services
- **Standardized interface** - All MCP servers work the same way
- **Automatic discovery** - The LLM learns available tools from the server
- **Community ecosystem** - Growing library of MCP servers

## MCP vs Custom Tools

| Aspect | Custom Tools | MCP Servers |
|--------|-------------|-------------|
| Development | Write code for each tool | Use existing servers |
| Maintenance | You maintain | Community maintains |
| Flexibility | Full control | Limited to server capabilities |
| Setup | Code + config | Config only |
| Use case | Domain-specific logic | Standard data access patterns |

**When to use custom tools:**
- Unique business logic
- Custom API integrations
- Complex workflows
- Proprietary systems

**When to use MCP servers:**
- Database access
- File system operations
- Common APIs (GitHub, Slack, etc.)
- Standard protocols (HTTP, SQL, etc.)

## Basic Configuration

Add MCP servers to `apps/api/sufle.yml`:

```yaml
mcp_servers:
  - server: database
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"]
    instructions: |
      This server provides access to the main application database.
      Use execute_sql to query data when users ask about stored information.
```

**Configuration fields:**
- `server` - Unique identifier for this MCP server
- `command` - Command to start the server (e.g., `npx`, `node`, `python`)
- `args` - Array of command-line arguments
- `env` - Optional environment variables
- `instructions` - Guidelines for the LLM on how to use this server's tools

## Available MCP Servers

### Database Servers

#### PostgreSQL
```yaml
mcp_servers:
  - server: postgres
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    instructions: |
      PostgreSQL database with the following schema:
      
      **users** table:
      - id (integer, primary key)
      - email (text)
      - created_at (timestamp)
      
      **orders** table:
      - id (integer, primary key)
      - user_id (integer, foreign key to users)
      - total (decimal)
      - status (text: pending, completed, cancelled)
      
      Use execute_sql to query. Always filter by appropriate conditions.
```

#### SQLite via DBHub
```yaml
mcp_servers:
  - server: sqlite
    command: npx
    args: 
      - "@bytebase/dbhub"
      - "--transport"
      - "stdio"
      - "--dsn"
      - "sqlite:///data/app.db"
    instructions: |
      SQLite database containing application data.
      Table: items (id, name, category, price, stock)
      Use execute_sql tool to query inventory and pricing.
```

#### MySQL
```yaml
mcp_servers:
  - server: mysql
    command: npx
    args: ["@modelcontextprotocol/server-mysql", "mysql://user:pass@localhost/db"]
    env:
      MYSQL_SSL: "false"
    instructions: |
      MySQL database for customer data.
      Always use prepared statement syntax for safety.
```

### File System Server

```yaml
mcp_servers:
  - server: filesystem
    command: npx
    args: 
      - "@modelcontextprotocol/server-filesystem"
      - "/path/to/allowed/directory"
    instructions: |
      Access to specific directory for reading configuration files.
      Available tools: read_file, list_directory
      Do not attempt to write or delete files.
```

### GitHub Server

```yaml
mcp_servers:
  - server: github
    command: npx
    args: ["@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: "your-github-token"
    instructions: |
      GitHub API access for repository operations.
      Can search issues, create PRs, list repositories.
      Use when user asks about GitHub repositories or issues.
```

### Google Drive Server

```yaml
mcp_servers:
  - server: gdrive
    command: npx
    args: ["@modelcontextprotocol/server-gdrive"]
    env:
      GOOGLE_APPLICATION_CREDENTIALS: "/path/to/credentials.json"
    instructions: |
      Access to company Google Drive.
      Can search and read documents.
      Use when user asks about shared documents or files.
```

### Slack Server

```yaml
mcp_servers:
  - server: slack
    command: npx
    args: ["@modelcontextprotocol/server-slack"]
    env:
      SLACK_BOT_TOKEN: "xoxb-your-token"
    instructions: |
      Slack workspace integration.
      Can read channels, search messages, post updates.
      Use for team communication queries.
```

## Writing Effective Instructions

The `instructions` field is critical - it tells the LLM how to use the MCP server's tools.

### Bad Instructions

```yaml
instructions: "Database access"
```

### Good Instructions

```yaml
instructions: |
  **Customer Database MCP Server**
  
  This server provides SQL access to the customer database.
  
  ## Available Tool
  - `execute_sql`: Run SQL queries against the database
  
  ## Schema Overview
  
  ### customers table
  | Column | Type | Description |
  |--------|------|-------------|
  | id | integer | Primary key |
  | email | text | Customer email (unique) |
  | name | text | Full name |
  | tier | text | Subscription tier (free, pro, enterprise) |
  | created_at | timestamp | Account creation date |
  
  ### orders table
  | Column | Type | Description |
  |--------|------|-------------|
  | id | integer | Primary key |
  | customer_id | integer | Foreign key to customers.id |
  | amount | decimal | Order total in USD |
  | status | text | Order status (pending, shipped, delivered) |
  | order_date | timestamp | When order was placed |
  
  ## Query Guidelines
  
  1. Always use WHERE clauses to limit results
  2. Use JOINs to combine customer and order data
  3. For date ranges, use `order_date BETWEEN '...' AND '...'`
  4. Limit results to 100 rows unless specifically asked for more
  5. When asked about "recent", interpret as last 30 days
  
  ## Examples
  
  Find customer by email:
  ```sql
  SELECT * FROM customers WHERE email = 'user@example.com'
  ```
  
  Get customer's recent orders:
  ```sql
  SELECT o.* FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE c.email = 'user@example.com'
  AND o.order_date > NOW() - INTERVAL '30 days'
  ORDER BY o.order_date DESC
  ```
  
  ## Important Notes
  
  - This is a READ-ONLY connection
  - All monetary amounts are in USD
  - Timestamps are in UTC
  - Never expose customer emails in responses to other users
```

## Instruction Best Practices

1. **Document the schema** - Tables, columns, types, relationships
2. **Explain available tools** - What each tool does
3. **Provide guidelines** - How to construct queries, what to avoid
4. **Include examples** - Common query patterns
5. **Set constraints** - Query limits, security considerations
6. **Define terminology** - What "recent", "active", etc. mean in your context
7. **Note permissions** - Read-only, write restrictions, etc.

## Complex Example: Multi-Database Setup

```yaml
mcp_servers:
  # Production database (read-only)
  - server: prod-db
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://readonly@prod/app"]
    instructions: |
      **Production Database (READ ONLY)**
      
      Main application database with live customer data.
      
      Schema: customers, orders, products, inventory
      
      **Usage Rules:**
      - READ ONLY - no INSERT/UPDATE/DELETE
      - Queries timeout after 10 seconds
      - Maximum 1000 rows per query
      - Use for current/recent data queries
      
      When user asks about "current", "latest", or "now", use this database.
  
  # Analytics database
  - server: analytics-db
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://analytics@warehouse/data"]
    instructions: |
      **Analytics Data Warehouse**
      
      Historical and aggregated data for reporting.
      
      Schema: daily_sales, monthly_metrics, customer_cohorts
      
      **Usage Rules:**
      - Use for historical analysis
      - Data is denormalized and optimized for aggregation
      - Contains data from 2020-present
      - Pre-aggregated by day/month/year
      
      When user asks about trends, history, or comparisons over time, use this database.
  
  # Ticketing system
  - server: tickets-db
    command: npx
    args: 
      - "@bytebase/dbhub"
      - "--transport"
      - "stdio"
      - "--dsn"
      - "sqlite:///data/tickets.db"
    instructions: |
      **Support Ticket System**
      
      Customer support tickets and interactions.
      
      Schema: tickets (id, customer_id, subject, status, priority, created_at, updated_at)
      
      **Status values:** open, in_progress, waiting_customer, resolved, closed
      **Priority values:** low, medium, high, urgent
      
      When user asks about support issues or customer problems, query this database.
```

## Environment Variables

Sensitive credentials should use environment variables:

```yaml
mcp_servers:
  - server: database
    command: npx
    args: ["@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "${DATABASE_URL}"
      DATABASE_SSL: "true"
      DATABASE_POOL_SIZE: "10"
```

Then set in your environment:

```bash
export DATABASE_URL="postgresql://user:pass@localhost/db"
```

Or in Docker Compose:

```yaml
services:
  api:
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres/db
```

## Testing MCP Servers

### Verify Server Starts

Check API logs on startup:

```bash
bun start:api
```

Look for:
```
[info] Loaded MCP server: database
[info] MCP tools available: execute_sql, list_tables
```

### Test Tool Discovery

Query the LLM:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "What tools do you have access to?"
    }]
  }'
```

The LLM should list MCP server tools alongside custom tools.

### Test Tool Usage

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "Query the database for all customers with tier=pro"
    }]
  }'
```

Check logs for tool invocation:

```
[debug] Calling tool: execute_sql
[debug] Tool input: {"query": "SELECT * FROM customers WHERE tier = 'pro'"}
[debug] Tool result: [{"id": 1, "email": "..."}]
```

## Combining MCP with RAG and Custom Tools

Sufle automatically coordinates between all three:

**Example query:** "What does our refund policy say, and how many refunds did we process last month?"

The LLM will:
1. **Retrieve from documents** - Find the refund policy text
2. **Call MCP tool** - Query database for refund statistics
3. **Synthesize response** - Combine policy details with actual numbers

Configuration:

```yaml
# Custom tool for business logic
tools:
  - tool: calculateRefund
    opts:
      processingFee: 2.50

# MCP server for data access
mcp_servers:
  - server: orders-db
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://..."]
    instructions: |
      Orders database with refunds table.
      Query for refund statistics.

# RAG will automatically search documents
rag:
  provider: langchain
  # ... configuration
```

## Security Considerations

### Database Access

**Use read-only credentials:**
```yaml
args: ["@modelcontextprotocol/server-postgres", "postgresql://readonly_user@localhost/db"]
```

**Limit accessible tables:**
Document in instructions which tables are available and which should never be queried.

**Set query timeouts:**
Configure database timeouts to prevent resource exhaustion.

### API Credentials

**Never hardcode secrets:**
```yaml
# Bad
env:
  API_KEY: "hardcoded-secret-key"

# Good
env:
  API_KEY: "${API_KEY}"
```

**Use environment-specific credentials:**
Different keys for development, staging, production.

### Input Validation

MCP servers should validate inputs, but add instructions:

```yaml
instructions: |
  When constructing queries:
  - Always use parameterized queries
  - Never use string concatenation
  - Validate user input before querying
```

## Troubleshooting

### MCP Server Not Starting

**Check logs:**
```bash
export LOG_LEVEL=debug
bun start:api
```

**Common issues:**
- Command not found (install with `npm install -g`)
- Missing environment variables
- Invalid connection strings
- Permissions issues

### Tools Not Appearing

**Verify registration:**
```javascript
// Check in logs
[info] MCP tools available: tool1, tool2
```

**Check instructions:**
Make sure `instructions` field is properly formatted YAML.

### Tool Execution Failures

**Enable debug logging:**
```bash
export LOG_LEVEL=debug
```

**Check tool parameters:**
The LLM might be passing incorrect parameters based on unclear instructions.

**Review instructions:**
Add more examples and constraints to guide the LLM.

## Building Custom MCP Servers

While Sufle supports standard MCP servers, you can build your own:

### Simple MCP Server (Node.js)

```javascript
// my-mcp-server.js
import { McpServer } from '@modelcontextprotocol/sdk';

const server = new McpServer({
  name: 'my-custom-server',
  version: '1.0.0'
});

server.tool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' }
    },
    required: ['input']
  },
  handler: async ({ input }) => {
    // Your logic here
    return { result: `Processed: ${input}` };
  }
});

server.listen({ transport: 'stdio' });
```

### Configure in Sufle

```yaml
mcp_servers:
  - server: my-server
    command: node
    args: ["/path/to/my-mcp-server.js"]
    instructions: |
      Custom MCP server for specific business logic.
```

See the [MCP SDK documentation](https://github.com/modelcontextprotocol/sdk) for full details.

## Real-World Examples

### Customer Support System

```yaml
mcp_servers:
  # Ticketing database
  - server: tickets
    command: npx
    args: ["@bytebase/dbhub", "--transport", "stdio", "--dsn", "sqlite:///data/tickets.db"]
    instructions: |
      Support ticket database. Query for customer issues, ticket status, resolution times.
  
  # CRM integration
  - server: crm
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://crm_readonly@crm-db/crm"]
    instructions: |
      Customer relationship management data. Query for customer details, interaction history.

tools:
  # Custom tool for creating tickets
  - tool: createTicket
    opts:
      apiUrl: https://tickets.example.com
```

### E-commerce Analytics

```yaml
mcp_servers:
  # Sales database
  - server: sales
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://analytics@warehouse/sales"]
    instructions: |
      Sales data warehouse. Pre-aggregated daily/monthly sales, product performance, customer cohorts.
  
  # Inventory system
  - server: inventory
    command: npx
    args: ["@modelcontextprotocol/server-mysql", "mysql://readonly@inventory/stock"]
    instructions: |
      Real-time inventory levels, reorder points, supplier information.

tools:
  # Custom tool for pricing
  - tool: calculatePrice
    opts:
      discountRules: /config/discounts.json
```

## Best Practices Summary

1. **Clear instructions** - Document schema, provide examples, set constraints
2. **Security first** - Use read-only credentials, never hardcode secrets
3. **Appropriate access** - Only expose necessary data and operations
4. **Good naming** - Use descriptive server identifiers
5. **Error handling** - MCP servers should fail gracefully
6. **Performance** - Set query limits and timeouts
7. **Testing** - Verify tools are discovered and work correctly
8. **Documentation** - Keep instructions up-to-date with schema changes
9. **Monitoring** - Log MCP tool usage for debugging
10. **Coordination** - Design instructions to work with RAG and custom tools

## Next Steps

- See [Developing Tools](developing-tools.md) for creating custom tools
- Check [Architecture](architecture.md) for how MCP integrates with the system
- Review [Usage Guide](usage.md) for testing MCP server integrations