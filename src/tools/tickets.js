"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryTicketsSchema = void 0;
exports.executeQueryTickets = executeQueryTickets;
const zod_1 = require("zod");
// 1. Zod Schema: Input validation taake LLM ulte parameters na bhej sake
exports.QueryTicketsSchema = zod_1.z.object({
    category: zod_1.z.enum(["technical_bug", "billing", "urgent_escalation", "general_query"]).describe("Ticket ki specific category"),
    limit: zod_1.z.number().min(1).max(20).default(5).describe("Kitne tickets fetch karne hain (1-20)")
});
// 2. Mock Support Tickets Data (Testing ke liye)
const mockTicketsDatabase = [
    { id: "TCK-101", customer: "Sara Khan", category: "billing", issue: "Stripe invoice deduction failed twice", priority: "high" },
    { id: "TCK-102", customer: "Ali Raza", category: "technical_bug", issue: "Webhook timeout on endpoint /v1/triage", priority: "critical" },
    { id: "TCK-103", customer: "John Doe", category: "general_query", issue: "How to update team permissions?", priority: "low" },
    { id: "TCK-104", customer: "Hamza Malik", category: "urgent_escalation", issue: "Production database locked out", priority: "critical" }
];
// 3. Execution Function jo MCP server run karega
async function executeQueryTickets(params) {
    const filtered = mockTicketsDatabase.filter(t => t.category === params.category);
    const results = filtered.slice(0, params.limit);
    return {
        count: results.length,
        tickets: results
    };
}
//# sourceMappingURL=tickets.js.map