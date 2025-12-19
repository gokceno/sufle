# Developing Tools

Tools extend Sufle's capabilities beyond document retrieval, allowing the LLM to access external APIs, perform calculations, query databases, or execute any custom logic you define.

## What Are Tools?

Tools are functions that the LLM can call during conversation. When a user asks a question, the LLM decides whether to:
- Retrieve from documents only
- Call one or more tools
- Combine document context with tool results

Each tool has:
- **Name** - Unique identifier
- **Description** - Instructions for when and how the LLM should use it
- **Schema** - Zod schema defining input parameters
- **Provider** - Async function that executes the tool's logic

## Tool Structure

Every tool follows this pattern:

```typescript
import { z } from "zod";

export const name = "toolName";

export const description = `
  Clear instructions for the LLM about:
  - What this tool does
  - When to use it
  - What it returns
  - Any important constraints
`;

export const create = (opts) => {
  const schema = z.object({
    param1: z.string().describe("What this parameter is for"),
    param2: z.number().describe("What this parameter is for"),
  });
  
  const provider = async (input: any) => {
    const { param1, param2 } = schema.parse(input);
    
    // Your tool logic here
    const result = await someOperation(param1, param2);
    
    return result;
  };
  
  return { provider, schema, name, description };
};
```

## Example: Weather Tool

Here's a complete real-world example from Sufle:

```typescript
// packages/tool-weather/src/index.ts
import { z } from "zod";

export const name = "weather";

export const description = `
  Get weather information for any city. 
  When asked about weather for ANY city, you MUST call the "weather" tool with that city name.
`;

const baseUrl = "http://api.openweathermap.org";

export const create = (opts) => {
  const schema = z.object({
    city: z.string().describe("Name of the city to find the weather for."),
  });
  
  const provider = async (input: any) => {
    const { city } = schema.parse(input);
    
    // Get coordinates for city
    const { lat, lon } = await geocode(city, opts);
    
    // Fetch weather data
    const { weather, main } = await find(lat, lon, opts);
    
    return {
      ...main,
      weather: weather.map((w) => w.description),
    };
  };
  
  return { provider, schema, name, description };
};

const geocode = async (city: string, opts: { apiKey: string }) => {
  const { apiKey } = opts;
  const request = await fetch(
    `${baseUrl}/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`
  );
  const [response] = await request.json();
  return {
    lat: response.lat,
    lon: response.lon,
  };
};

const find = async (lat: number, lon: number, opts: { apiKey: string }) => {
  const { apiKey } = opts;
  const request = await fetch(
    `${baseUrl}/data/2.5/weather?units=metric&lon=${lon}&lat=${lat}&appid=${apiKey}`
  );
  const response = await request.json();
  return {
    weather: response.weather,
    main: {
      feelsLike: response.main.feels_like,
      minTemprature: response.main.temp_min,
      maxTemprature: response.main.temp_max,
    },
  };
};
```

## Creating a New Tool

### Step 1: Create Package Structure

```bash
mkdir -p packages/tool-yourname/src
cd packages/tool-yourname
```

Create `package.json`:

```json
{
  "name": "@sufle/tool-yourname",
  "type": "module",
  "version": "0.0.1",
  "main": "src/index.ts",
  "module": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "license": "MIT",
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "zod": "^4.1.11"
  }
}
```

### Step 2: Implement Tool

Create `src/index.ts`:

```typescript
import { z } from "zod";

export const name = "yourTool";

export const description = `
  Detailed description of what your tool does.
  Be explicit about when the LLM should use it.
  Include examples if helpful.
`;

export const create = (opts) => {
  // Define input schema
  const schema = z.object({
    requiredParam: z.string().describe("Clear parameter description"),
    optionalParam: z.number().optional().describe("Optional parameter"),
  });
  
  // Implement tool logic
  const provider = async (input: any) => {
    const { requiredParam, optionalParam } = schema.parse(input);
    
    // Your implementation
    const result = await yourLogic(requiredParam, optionalParam, opts);
    
    // Return data that will be useful to the LLM
    return result;
  };
  
  return { provider, schema, name, description };
};

const yourLogic = async (param1: string, param2: number | undefined, opts: any) => {
  // Implementation details
  return { data: "example" };
};
```

### Step 3: Register Tool

Add to `apps/api/src/tools/index.ts`:

```typescript
export * as weather from "@sufle/tool-weather";
export * as exchangeRates from "@sufle/tool-exchange-rates";
export * as yourTool from "@sufle/tool-yourname"; // Add this line
```

Add to `apps/api/package.json` dependencies:

```json
{
  "dependencies": {
    "@sufle/tool-yourname": "*"
  }
}
```

### Step 4: Configure Tool

Add to `apps/api/sufle.yml`:

```yaml
tools:
  - tool: yourTool
    opts:
      apiKey: YOUR_API_KEY
      customOption: value
```

### Step 5: Test

Start the API and query:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sufle/default",
    "messages": [{
      "role": "user",
      "content": "Use yourTool to do something"
    }]
  }'
```

Check logs to see tool invocation and results.

## Writing Good Tool Descriptions

The description is critical - it tells the LLM when and how to use your tool.

**Bad description:**
```typescript
export const description = "Gets stock data";
```

**Good description:**
```typescript
export const description = `
  Get real-time stock price and volume data for a given stock ticker symbol.
  
  When to use:
  - User asks about current/latest stock prices
  - User asks about trading volume
  - User mentions specific ticker symbols (e.g., AAPL, GOOGL)
  
  MUST be called with valid stock ticker symbols (uppercase, 1-5 letters).
  Returns: current price, day change, volume, and market status.
`;
```

**Key elements:**
- **What it does** - Clear functionality statement
- **When to use** - Explicit triggers for the LLM
- **Input requirements** - Format, constraints, examples
- **Output description** - What the LLM will receive

## Schema Best Practices

Use Zod's `.describe()` to provide parameter guidance:

```typescript
const schema = z.object({
  // Good: Clear description with example
  ticker: z.string()
    .describe("Stock ticker symbol (e.g., 'AAPL', 'GOOGL')"),
  
  // Good: Explains constraints
  days: z.number()
    .min(1)
    .max(365)
    .describe("Number of days of historical data (1-365)"),
  
  // Good: Explains optional behavior
  includeNews: z.boolean()
    .optional()
    .describe("Include related news articles. Defaults to false."),
});
```

## Return Value Guidelines

Return structured data that's useful for the LLM:

**Good returns:**
```typescript
// Structured object with clear fields
return {
  price: 150.25,
  change: "+2.5%",
  volume: "52.3M",
  status: "market_open"
};

// Array of relevant items
return [
  { title: "Article 1", summary: "..." },
  { title: "Article 2", summary: "..." }
];

// Simple value when appropriate
return "42";
```

**Avoid:**
```typescript
// Don't return raw API responses
return rawApiResponse; // Contains irrelevant fields

// Don't return unclear structures
return { a: 1, b: { c: { d: [1, 2, { e: 3 }] } } };

// Don't return error objects
return { error: "Something failed" }; // Throw instead
```

## Error Handling

Throw meaningful errors that help users and developers:

```typescript
const provider = async (input: any) => {
  const { ticker } = schema.parse(input); // Zod handles validation
  
  // Validate business logic
  if (!isValidTicker(ticker)) {
    throw new Error(`Invalid ticker symbol: ${ticker}`);
  }
  
  // Handle external API errors
  const response = await fetch(`https://api.example.com/stock/${ticker}`);
  if (!response.ok) {
    throw new Error(`Stock API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Validate response data
  if (!data.price) {
    throw new Error(`No price data available for ${ticker}`);
  }
  
  return data;
};
```

## Configuration Options

Tools receive `opts` from your configuration:

```yaml
tools:
  - tool: stockData
    opts:
      apiKey: YOUR_KEY
      baseUrl: https://api.example.com
      timeout: 5000
      cacheEnabled: true
```

Access in your tool:

```typescript
export const create = (opts) => {
  const { apiKey, baseUrl, timeout, cacheEnabled } = opts;
  
  const provider = async (input: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`${baseUrl}/endpoint`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal
      });
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  return { provider, schema, name, description };
};
```

## Advanced Patterns

### Tool with State

```typescript
export const create = (opts) => {
  // Shared state across invocations
  const cache = new Map();
  
  const provider = async (input: any) => {
    const { key } = schema.parse(input);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = await fetchData(key);
    cache.set(key, result);
    return result;
  };
  
  return { provider, schema, name, description };
};
```

### Tool with Multiple Operations

```typescript
export const create = (opts) => {
  const schema = z.object({
    operation: z.enum(["get", "list", "search"]),
    query: z.string(),
  });
  
  const provider = async (input: any) => {
    const { operation, query } = schema.parse(input);
    
    switch (operation) {
      case "get":
        return await getItem(query);
      case "list":
        return await listItems(query);
      case "search":
        return await searchItems(query);
    }
  };
  
  return { provider, schema, name, description };
};
```

### Tool with Dependencies

```typescript
import { DatabaseClient } from "./db";
import { CacheService } from "./cache";

export const create = (opts) => {
  const db = new DatabaseClient(opts.dbUrl);
  const cache = new CacheService(opts.cacheUrl);
  
  const provider = async (input: any) => {
    const { id } = schema.parse(input);
    
    // Check cache first
    const cached = await cache.get(id);
    if (cached) return cached;
    
    // Query database
    const result = await db.query("SELECT * FROM items WHERE id = ?", [id]);
    
    // Update cache
    await cache.set(id, result);
    
    return result;
  };
  
  return { provider, schema, name, description };
};
```

## Testing Tools

Create a test file:

```typescript
// packages/tool-yourname/src/index.test.ts
import { create } from "./index";
import { expect, test } from "bun:test";

test("tool returns expected data", async () => {
  const { provider, schema } = create({ apiKey: "test-key" });
  
  const input = { param: "test-value" };
  const result = await provider(input);
  
  expect(result).toEqual({ expected: "output" });
});

test("tool validates input", async () => {
  const { provider, schema } = create({ apiKey: "test-key" });
  
  expect(() => provider({ invalid: "input" })).toThrow();
});
```

Run tests:

```bash
bun test packages/tool-yourname/src/index.test.ts
```

## Tool Examples

### Calculator Tool

```typescript
export const name = "calculator";
export const description = "Perform mathematical calculations. Use for any arithmetic operations.";

export const create = (opts) => {
  const schema = z.object({
    expression: z.string().describe("Math expression (e.g., '2 + 2', '10 * 5')"),
  });
  
  const provider = async (input: any) => {
    const { expression } = schema.parse(input);
    
    // Safely evaluate (use a proper math parser in production)
    const result = eval(expression);
    
    return { expression, result };
  };
  
  return { provider, schema, name, description };
};
```

### Database Query Tool

```typescript
export const name = "queryDatabase";
export const description = "Query the application database. Use when user asks about stored data.";

export const create = (opts) => {
  const schema = z.object({
    table: z.enum(["users", "orders", "products"]),
    conditions: z.record(z.any()).optional(),
  });
  
  const provider = async (input: any) => {
    const { table, conditions } = schema.parse(input);
    
    const db = await connect(opts.connectionString);
    const results = await db.select(table, conditions);
    
    return results;
  };
  
  return { provider, schema, name, description };
};
```

### HTTP Request Tool

```typescript
export const name = "httpRequest";
export const description = "Make HTTP requests to external APIs.";

export const create = (opts) => {
  const schema = z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    body: z.any().optional(),
  });
  
  const provider = async (input: any) => {
    const { url, method, body } = schema.parse(input);
    
    const response = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
      },
    });
    
    return await response.json();
  };
  
  return { provider, schema, name, description };
};
```

## Debugging Tools

Enable debug logging:

```bash
export LOG_LEVEL=debug
bun start:api
```

Logs will show:
- Tool registration at startup
- Tool invocations during queries
- Tool parameters and results
- Any errors

## Best Practices Summary

1. **Clear descriptions** - Tell the LLM exactly when to use your tool
2. **Strong schemas** - Use Zod with detailed `.describe()` annotations
3. **Useful returns** - Return structured data the LLM can work with
4. **Good errors** - Throw meaningful errors for debugging
5. **Configuration** - Accept options for API keys and settings
6. **Type safety** - Use TypeScript for better tooling
7. **Testing** - Write tests for your tool logic
8. **Documentation** - Comment complex logic
9. **Performance** - Cache when appropriate, handle timeouts
10. **Security** - Validate inputs, sanitize outputs, protect credentials

## Next Steps

- See [MCP Integration](mcp-integration.md) for integrating pre-built MCP server tools
- Check the `packages/tool-weather` and `packages/tool-exchange-rates` directories for complete examples
- Review [Usage Guide](usage.md) for testing tool invocations