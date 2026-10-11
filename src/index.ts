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
import { Tracer } from "./lib/tracer.js";

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

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.keys(InternalSOPs).map((uri) => ({
      uri,
      name: uri.replace("sop://support/", "").replace("-", " ").toUpperCase(),
      mimeType: "text/markdown"
    }))
  };
});

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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_tickets_by_category") {
    // 1. Trace session create karein
    const trace = Tracer.createTrace("query_tickets_by_category");

    try {
      // Span 1: Input Validation time trace karein
      const parsed = await trace.measureSpan("input_schema_validation", () => {
        const result = QueryTicketsSchema.safeParse(request.params.arguments);
        if (!result.success) {
          throw new Error(`Validation Error: ${JSON.stringify(result.error.format())}`);
        }
        return result.data;
      });

      // Span 2: Actual DB/Tool Execution time trace karein
      const data = await trace.measureSpan("database_execution", async () => {
        return await executeQueryTickets(parsed);
      });

      // Trace complete karein
      const record = trace.finish("success");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...data,
              _telemetry: {
                traceId: record.traceId,
                totalDurationMs: record.totalDurationMs,
                spans: record.spans
              }
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      trace.finish("error", error.message);
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
