import { Inject, Injectable, type LoggerService as NestLoggerService } from '@nestjs/common';
import type { Logger as WinstonLogger } from 'winston';
import { WINSTON_LOGGER } from './logger.constants';

type LogInfo = Record<string, unknown> & { level: string; message: string };

/**
 * Adapts the Winston logger to NestJS's `LoggerService` so it can replace the
 * built-in logger via `app.useLogger(...)` and be injected anywhere.
 *
 * Constructor injection uses the explicit `WINSTON_LOGGER` token (rather than
 * type metadata) so the package stays correct when bundled with esbuild/tsup,
 * which does not emit `emitDecoratorMetadata`.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(@Inject(WINSTON_LOGGER) private readonly logger: WinstonLogger) {}

  /** Exposes the underlying Winston logger for advanced use cases. */
  get winston(): WinstonLogger {
    return this.logger;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    // Nest convention: error(message, stack?, context?)
    let stack: string | undefined;
    let rest = optionalParams;
    if (optionalParams.length >= 2 && typeof optionalParams[0] === 'string') {
      stack = optionalParams[0];
      rest = optionalParams.slice(1);
    }
    this.write('error', message, rest, stack);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    // npm levels have no `fatal`; map to `error`.
    this.write('error', message, optionalParams);
  }

  private write(level: string, message: unknown, params: unknown[], stack?: string): void {
    const { context, meta } = this.parseParams(params);
    const info: LogInfo = { level, message: '' };
    if (context) info.context = context;
    if (stack) info.stack = stack;
    Object.assign(info, meta);

    if (message instanceof Error) {
      info.message = message.message;
      info.stack = info.stack ?? message.stack;
    } else if (message !== null && typeof message === 'object') {
      Object.assign(info, message as Record<string, unknown>);
      const objMessage = (message as Record<string, unknown>).message;
      info.message = typeof objMessage === 'string' ? objMessage : '';
    } else {
      info.message = typeof message === 'string' ? message : String(message);
    }

    this.logger.log(info);
  }

  /** The trailing string argument is treated as the Nest context; the rest is metadata. */
  private parseParams(params: unknown[]): {
    context?: string;
    meta: Record<string, unknown>;
  } {
    if (params.length === 0) return { meta: {} };
    const last = params[params.length - 1];
    if (typeof last === 'string') {
      return { context: last, meta: this.collectMeta(params.slice(0, -1)) };
    }
    return { meta: this.collectMeta(params) };
  }

  private collectMeta(parts: unknown[]): Record<string, unknown> {
    return parts.length ? { params: parts } : {};
  }
}
