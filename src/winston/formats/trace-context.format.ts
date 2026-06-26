import { context, trace } from '@opentelemetry/api';
import { format, type Logform } from 'winston';

/**
 * Winston format that copies the active span's trace context onto the log
 * record so it appears in console/JSON output. Records exported via OTLP are
 * correlated automatically by the Logs SDK, so this is purely for human-readable
 * and file output.
 */
export const traceContextFormat: Logform.FormatWrap = format((info) => {
  const span = trace.getSpan(context.active());
  if (!span) {
    return info;
  }
  const spanContext = span.spanContext();
  if (!trace.isSpanContextValid(spanContext)) {
    return info;
  }
  info.trace_id = spanContext.traceId;
  info.span_id = spanContext.spanId;
  info.trace_flags = spanContext.traceFlags.toString(16).padStart(2, '0');
  return info;
});
