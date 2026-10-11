import { z } from "zod";

export interface Ticket {
  id: string;
  customer: string;
  category: "technical_bug" | "billing" | "urgent_escalation" | "general_query";
  issue: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved";
  assignedAgent?: string;
  notes?: string[];
}

// In-Memory Enterprise Ticket State
export const TicketDatabase: Map<string, Ticket> = new Map([
  [
    "TCK-101",
    {
      id: "TCK-101",
      customer: "Sara Khan",
      category: "billing",
      issue: "Stripe invoice deduction failed twice",
      priority: "high",
      status: "open",
      notes: ["Auto-flagged by payment gateway"]
    }
  ],
  [
    "TCK-102",
    {
      id: "TCK-102",
      customer: "Ahmed Raza",
      category: "technical_bug",
      issue: "Auth callback loop on safari mobile",
      priority: "medium",
      status: "open",
      notes: []
    }
  ],
  [
    "TCK-103",
    {
      id: "TCK-103",
      customer: "Fatima Noor",
      category: "urgent_escalation",
      issue: "Database replication lag exceeding 45 seconds",
      priority: "critical",
      status: "in_progress",
      assignedAgent: "DevOps OnCall",
      notes: ["Incident bridge opened"]
    }
  ]
]);

// 1. Query Schema & Execution
export const QueryTicketsSchema = z.object({
  category: z.enum(["technical_bug", "billing", "urgent_escalation", "general_query"]),
  limit: z.number().int().min(1).max(20).optional().default(5)
});

export type QueryTicketsInput = z.infer<typeof QueryTicketsSchema>;

export async function executeQueryTickets(input: QueryTicketsInput) {
  const allTickets = Array.from(TicketDatabase.values());
  const filtered = allTickets
    .filter((t) => t.category === input.category)
    .slice(0, input.limit);

  return {
    count: filtered.length,
    tickets: filtered
  };
}

// 2. State Mutation Schema & Execution (Ticket Status Update)
export const UpdateTicketStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved"]),
  agentName: z.string().min(2),
  note: z.string().optional()
});

export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>;

export async function executeUpdateTicketStatus(input: UpdateTicketStatusInput) {
  const ticket = TicketDatabase.get(input.ticketId);

  if (!ticket) {
    throw new Error(`Ticket with ID ${input.ticketId} not found`);
  }

  // Update State
  ticket.status = input.status;
  ticket.assignedAgent = input.agentName;
  if (input.note) {
    ticket.notes = ticket.notes || [];
    ticket.notes.push(`[${new Date().toISOString()}] (${input.agentName}): ${input.note}`);
  }

  TicketDatabase.set(input.ticketId, ticket);

  return {
    success: true,
    message: `Ticket ${ticket.id} transitioned to ${ticket.status}`,
    updatedTicket: ticket
  };
}