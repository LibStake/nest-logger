import type { LogRecordExporter } from '@opentelemetry/sdk-logs';
import type { OtlpOptions, OtlpProtocol } from '../interfaces/logger-options.interface';

const EXPORTER_PACKAGE: Record<OtlpProtocol, string> = {
  'http/protobuf': '@opentelemetry/exporter-logs-otlp-proto',
  grpc: '@opentelemetry/exporter-logs-otlp-grpc',
  'http/json': '@opentelemetry/exporter-logs-otlp-http',
};

interface OtlpExporterModule {
  OTLPLogExporter: new (config?: Record<string, unknown>) => LogRecordExporter;
}

/** Append `/v1/logs` to a base HTTP endpoint when the signal path is missing. */
function resolveHttpLogsUrl(endpoint?: string): string | undefined {
  if (!endpoint) return undefined;
  const trimmed = endpoint.replace(/\/+$/, '');
  return /\/v1\/logs$/.test(trimmed) ? trimmed : `${trimmed}/v1/logs`;
}

/**
 * Lazily loads the exporter package for the selected protocol and constructs
 * an OTLP log exporter. Only `http/protobuf` is a hard dependency; the others
 * are optional peers loaded on demand.
 */
export async function createOtlpLogExporter(otlp: OtlpOptions = {}): Promise<LogRecordExporter> {
  const protocol: OtlpProtocol = otlp.protocol ?? 'http/protobuf';
  const pkg = EXPORTER_PACKAGE[protocol];
  if (!pkg) {
    throw new Error(`[nest-logger] Unsupported OTLP protocol: '${protocol}'.`);
  }

  let mod: OtlpExporterModule;
  try {
    mod = (await import(pkg)) as OtlpExporterModule;
  } catch {
    throw new Error(
      `[nest-logger] OTLP protocol '${protocol}' requires the optional package '${pkg}'. ` +
        `Install it, e.g. \`pnpm add ${pkg}\`.`,
    );
  }

  if (protocol === 'grpc') {
    // gRPC takes a base `url` (host:port) and uses metadata/credentials rather
    // than HTTP headers — header mapping is intentionally left to the caller.
    const url = otlp.endpoint?.replace(/\/+$/, '');
    return new mod.OTLPLogExporter(url ? { url } : {});
  }

  const url = resolveHttpLogsUrl(otlp.endpoint);
  return new mod.OTLPLogExporter({
    ...(url ? { url } : {}),
    ...(otlp.headers ? { headers: otlp.headers } : {}),
  });
}
