import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import {
  QueryTicketsSchema,
  UpdateTicketStatusSchema,
  executeQueryTickets,
  executeUpdateTicketStatus,
  TicketDatabase
} from "./tools/tickets.js";
import { InternalSOPs } from "./resources/sops.js";
import { Tracer } from "./lib/tracer.js";

const server = new Server(
  {
    name: "enterprise-support-mcp",
    version: "1.2.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// 1. Resources Handlers
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

// 2. Prompts Handlers (MCP Prompt Templates for LLMs)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "ticket_triage_prompt",
        description: "Template to guide an agent in triaging and resolving a support ticket",
        arguments: [
          {
            name: "ticketId",
            description: "The ticket identifier to prepare context for",
            required: true
          }
        ]
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "ticket_triage_prompt") {
    const ticketId = String(request.params.arguments?.ticketId || "");
    const ticket = TicketDatabase.get(ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found in database`);
    }

    return {
      description: `Triage briefing for ${ticket.id}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an Enterprise Support AI Assistant.
Please triage ticket ${ticket.id} (${ticket.customer}):
- Issue: "${ticket.issue}"
- Category: ${ticket.category}
- Current Priority: ${ticket.priority}
- Current Status: ${ticket.status}

Refer to relevant SOP resources if applicable, formulate an action plan, and update status accordingly.`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${request.params.name}`);
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
      },
      {
        name: "update_ticket_status",
        description: "Update the status, assignment, and internal notes of an existing ticket.",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: {
              type: "string",
              description: "Target ticket identifier (e.g. TCK-101)"
            },
            status: {
              type: "string",
              enum: ["open", "in_progress", "resolved"],
              description: "New status of the ticket"
            },
            agentName: {
              type: "string",
              description: "Name of the agent or AI performing this mutation"
            },
            note: {
              type: "string",
              description: "Optional audit note to append to the ticket history"
            }
          },
          required: ["ticketId", "status", "agentName"]
        }
      }
    ]
  };
});

// 4. Tool Call Handler with Telemetry & Latency Benchmarking
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const trace = Tracer.createTrace(toolName);

  try {
    if (toolName === "query_tickets_by_category") {
      const parsed = await trace.measureSpan("input_schema_validation", () => {
        const result = QueryTicketsSchema.safeParse(request.params.arguments);
        if (!result.success) throw new Error(JSON.stringify(result.error.format()));
        return result.data;
      });

      const data = await trace.measureSpan("database_execution", async () => {
        return await executeQueryTickets(parsed);
      });

      const record = trace.finish("success");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...data, _telemetry: { traceId: record.traceId, totalDurationMs: record.totalDurationMs, spans: record.spans } }, null, 2)
          }
        ]
      };
    }

    if (toolName === "update_ticket_status") {
      const parsed = await trace.measureSpan("input_schema_validation", () => {
        const result = UpdateTicketStatusSchema.safeParse(request.params.arguments);
        if (!result.success) throw new Error(JSON.stringify(result.error.format()));
        return result.data;
      });

      const data = await trace.measureSpan("database_mutation", async () => {
        return await executeUpdateTicketStatus(parsed);
      });

      const record = trace.finish("success");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...data, _telemetry: { traceId: record.traceId, totalDurationMs: record.totalDurationMs, spans: record.spans } }, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  } catch (error: any) {
    trace.finish("error", error.message);
    throw error;
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Enterprise Support MCP Server (v1.2.0) running on stdio with Tools, Resources, Prompts & State.");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});