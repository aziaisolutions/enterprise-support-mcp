export const InternalSOPs: Record<string, string> = {
  "sop://support/billing-escalation": `
# Billing Escalation Standard Operating Procedure
1. Verify the duplicate transaction ID from payment logs.
2. Issue a temporary credit balance if the customer is on an enterprise plan.
3. Escalate ticket directly to the Accounts Lead within 2 hours.
  `.trim(),

  "sop://support/technical-outage": `
# Critical Bug Standard Operating Procedure
1. Isolate the broken microservice or API route.
2. Enable circuit breaker to stop cascading failures.
3. Notify the DevOps on-call engineer immediately.
  `.trim()
};