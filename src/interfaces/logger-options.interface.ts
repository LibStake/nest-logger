import type { LoggerProvider } from '@opentelemetry/sdk-logs';

/** OTLP wire protocol. Default is `http/protobuf`. */
export type OtlpProtocol = 'http/protobuf' | 'grpc' | 'http/json';

/** BatchLogRecordProcessor tuning (maps 1:1 to the SDK's BufferConfig). */
export interface OtlpBatchOptions {
  maxQueueSize?: number;
  maxExportBatchSize?: number;
  scheduledDelayMillis?: number;
  exportTimeoutMillis?: number;
}

export interface OtlpOptions {
  /** Attach the OTLP transport at all. Default: `true`. */
  enabled?: boolean;
  /** Wire protocol. Default: `http/protobuf`. */
  protocol?: OtlpProtocol;
  /**
   * Base collector endpoint, e.g. `http://localhost:4318`. For HTTP protocols
   * `/v1/logs` is appended automatically when missing. When omitted, the
   * exporter falls back to `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` /
   * `OTEL_EXPORTER_OTLP_ENDPOINT`.
   */
  endpoint?: string;
  /** Extra OTLP headers (e.g. authentication). HTTP protocols only. */
  headers?: Record<string, string>;
  /** BatchLogRecordProcessor tuning. */
  batch?: OtlpBatchOptions;
  /**
   * Reuse the LoggerProvider already registered globally by the host app
   * (e.g. an existing NodeSDK). The library will not create or own one.
   * Default: `false`.
   */
  useGlobalProvider?: boolean;
}

export interface ConsoleOptions {
  /**
   * Human-friendly, colorized single-line output. When `false`, the console
   * transport emits JSON. Default: enabled outside `production`.
   */
  pretty?: boolean;
}

export interface LoggerModuleOptions {
  /** OTel resource `service.name`. */
  serviceName: string;
  /** OTel resource `service.version`. */
  serviceVersion?: string;
  /** OTel resource `deployment.environment.name`. Defaults to `process.env.NODE_ENV`. */
  environment?: string;
  /** Additional static OTel resource attributes. */
  resourceAttributes?: Record<string, string>;
  /** Winston log level. Default: `process.env.LOG_LEVEL` or `info`. */
  level?: string;
  /** Console transport. `false` to disable, or presentation options. Default: enabled. */
  console?: boolean | ConsoleOptions;
  /** Static metadata attached to every log record. */
  defaultMeta?: Record<string, unknown>;
  /**
   * Inject `trace_id`/`span_id`/`trace_flags` into console & JSON output.
   * (OTLP records are correlated automatically from the active span.)
   * Default: `true`.
   */
  traceContext?: boolean;
  /** OTLP export configuration. */
  otlp?: OtlpOptions;
  /**
   * Provide an existing LoggerProvider. It will be registered globally so the
   * Winston transport uses it, and the library will not own/shut it down.
   */
  loggerProvider?: LoggerProvider;
}
