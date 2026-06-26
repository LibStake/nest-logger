import type { LoggerModuleOptions } from './interfaces/logger-options.interface';
import { resolveLoggerProvider } from './otel/logger-provider.factory';
import { createWinstonLogger } from './winston/winston-logger.factory';
import { LoggerService } from './logger.service';

/**
 * Builds a standalone {@link LoggerService} (and its OTel provider + Winston
 * logger) outside of Nest's DI container.
 *
 * Prefer `NestFactory.create(AppModule, { bufferLogs: true })` followed by
 * `app.useLogger(app.get(LoggerService))` — that reuses the DI instance and
 * still captures buffered bootstrap logs. Use this helper only when you need a
 * logger before the application context exists.
 */
export async function createBootstrapLogger(
  options: LoggerModuleOptions,
): Promise<LoggerService> {
  const resolved = await resolveLoggerProvider(options);
  const logger = createWinstonLogger(options, Boolean(resolved.provider));
  return new LoggerService(logger);
}
