import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { QueryTicketsSchema, executeQueryTickets } from "./tools/tickets.js";
import { InternalSOPs } from "./resources/sops.js";
import { TelemetryLogger } from "./lib/telemetry.js";

const server = new Server(
  {
    name: "enterprise-support-mcp",
    version: "1.1.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// 1. Resources List Handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.keys(InternalSOPs).map((uri) => ({
      uri,
      name: uri.replace("sop://support/", "").replace("-", " ").toUpperCase(),
      mimeType: "text/markdown"
    }))
  };
});

// 2. Resource Read Handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const content = InternalSOPs[uri];

  if (!content) {
    throw new Error(`Resource not found for URI: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content
      }
    ]
  };
});

// 3. Tools List Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_tickets_by_category",
        description: "Fetch support tickets deterministically by category with validation guards.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["technical_bug", "billing", "urgent_escalation", "general_query"],
              description: "The ticket classification category"
            },
            limit: {
              type: "number",
              description: "Max number of records to return (1-20)"
            }
          },
          required: ["category"]
        }
      }
    ]
  };
});

// 4. Tool Call Handler with Telemetry & Latency Benchmarking
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = performance.now();
  const traceId = `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (request.params.name === "query_tickets_by_category") {
    try {
      const parsed = QueryTicketsSchema.safeParse(request.params.arguments);

      if (!parsed.success) {
        throw new Error(`Validation Error: ${JSON.stringify(parsed.error.format())}`);
      }

      const data = await executeQueryTickets(parsed.data);
      const latencyMs = performance.now() - startTime;

      TelemetryLogger.record({
        traceId,
        toolName: "query_tickets_by_category",
        status: "success",
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: { category: parsed.data.category, resultCount: data.count }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...data, _telemetry: { traceId, latencyMs: Number(latencyMs.toFixed(2)) } }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      const latencyMs = performance.now() - startTime;
      TelemetryLogger.record({
        traceId,
        toolName: "query_tickets_by_category",
        status: "failure",
        latencyMs,
        timestamp: new Date().toISOString(),
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Enterprise Support MCP Server (v1.1.0) running on stdio with Telemetry & Resources.");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});