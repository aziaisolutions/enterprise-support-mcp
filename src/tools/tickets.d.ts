import { z } from "zod";
export declare const QueryTicketsSchema: z.ZodObject<{
    category: z.ZodEnum<{
        billing: "billing";
        general_query: "general_query";
        technical_bug: "technical_bug";
        urgent_escalation: "urgent_escalation";
    }>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type QueryTicketsInput = z.infer<typeof QueryTicketsSchema>;
export declare function executeQueryTickets(params: QueryTicketsInput): Promise<{
    count: number;
    tickets: {
        id: string;
        customer: string;
        category: string;
        issue: string;
        priority: string;
    }[];
}>;
//# sourceMappingURL=tickets.d.ts.map