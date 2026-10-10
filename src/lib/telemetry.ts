export interface ToolTrace {
  traceId: string;
  toolName: string;
  status: "success" | "failure";
  latencyMs: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class TelemetryLogger {
  private static traces: ToolTrace[] = [];

  static record(trace: ToolTrace) {
    this.traces.push(trace);
    // Real enterprise setup mein yeh Langfuse ya OpenTelemetry par push hota hai
    console.error(`[TELEMETRY TRACE] ${trace.toolName} | ${trace.status.toUpperCase()} | ${trace.latencyMs.toFixed(2)}ms | ID: ${trace.traceId}`);
  }

  static getRecentTraces(limit: number = 5): ToolTrace[] {
    return this.traces.slice(-limit);
  }
}