import fs from "fs";
import path from "path";

export interface Span {
  name: string;
  durationMs: number;
  metadata?: Record<string, any>;
}

export interface TraceRecord {
  traceId: string;
  operation: string;
  status: "success" | "error";
  totalDurationMs: number;
  timestamp: string;
  spans: Span[];
  error?: string;
}

export class Tracer {
  private static logFilePath = path.resolve(process.cwd(), "traces.jsonl");

  // Naya trace start karne ka method
  static createTrace(operation: string) {
    const traceId = `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = performance.now();
    const spans: Span[] = [];

    return {
      traceId,
      // Nested sub-step (span) measure karne ke liye
      async measureSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
        const spanStart = performance.now();
        const result = await fn();
        const durationMs = Number((performance.now() - spanStart).toFixed(3));
        spans.push({ name, durationMs });
        return result;
      },
      // Trace complete karke save karne ke liye
      finish(status: "success" | "error", error?: string) {
        const totalDurationMs = Number((performance.now() - startTime).toFixed(3));
        const record: TraceRecord = {
          traceId,
          operation,
          status,
          totalDurationMs,
          timestamp: new Date().toISOString(),
          spans,
          ...(error ? { error } : {})
        };

        // File mein append karein (JSON Lines format)
        fs.appendFileSync(Tracer.logFilePath, JSON.stringify(record) + "\n", "utf8");
        
        console.error(`[AUDIT TRACE] ID: ${traceId} | ${operation} | ${status.toUpperCase()} | Total: ${totalDurationMs}ms | Spans: ${spans.map(s => `${s.name}:${s.durationMs}ms`).join(", ")}`);
        
        return record;
      }
    };
  }
}