import { createLogger, format, transports, type Logger as WinstonLogger } from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import type { LoggerModuleOptions } from '../interfaces/logger-options.interface';
import { traceContextFormat } from './formats/trace-context.format';

function isProduction(options: LoggerModuleOptions): boolean {
  return (options.environment ?? process.env.NODE_ENV) === 'production';
}

function consoleEnabled(options: LoggerModuleOptions): boolean {
  return options.console !== false;
}

function consolePretty(options: LoggerModuleOptions): boolean {
  if (typeof options.console === 'object' && options.console.pretty !== undefined) {
    return options.console.pretty;
  }
  return !isProduction(options);
}

/** Single-line, colorized, developer-friendly console line. */
function prettyConsoleFormat(useTrace: boolean) {
  return format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    ...(useTrace ? [traceContextFormat()] : []),
    format.colorize(),
    format.printf((info) => {
      const {
        level,
        message,
        timestamp,
        context: ctx,
        stack,
        trace_id,
        span_id,
        trace_flags,
        ...meta
      } = info as Record<string, unknown>;
      const ctxLabel = ctx ? `[${String(ctx)}] ` : '';
      const traceLabel = trace_id ? ` trace_id=${String(trace_id)} span_id=${String(span_id)}` : '';
      const metaKeys = Object.keys(meta);
      const metaLabel = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
      const body = stack ?? message;
      return `${String(timestamp)} ${level} ${ctxLabel}${String(body)}${traceLabel}${metaLabel}`;
    }),
  );
}

/** Structured JSON line for production console / log shippers. */
function jsonConsoleFormat(useTrace: boolean) {
  return format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    ...(useTrace ? [traceContextFormat()] : []),
    format.json(),
  );
}

/**
 * Builds the Winston logger. The OTLP transport is attached only when a
 * LoggerProvider was resolved; it receives structured info (no JSON stringify)
 * and relies on the active span for trace correlation.
 */
export function createWinstonLogger(
  options: LoggerModuleOptions,
  otlpTransportEnabled: boolean,
): WinstonLogger {
  const useTrace = options.traceContext !== false;
  const transportList: WinstonLogger['transports'] = [];

  if (consoleEnabled(options)) {
    transportList.push(
      new transports.Console({
        format: consolePretty(options) ? prettyConsoleFormat(useTrace) : jsonConsoleFormat(useTrace),
      }),
    );
  }

  if (otlpTransportEnabled) {
    transportList.push(
      new OpenTelemetryTransportV3({
        format: format.combine(format.timestamp(), format.errors({ stack: true })),
      }),
    );
  }

  return createLogger({
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    defaultMeta: options.defaultMeta,
    transports: transportList,
  });
}
