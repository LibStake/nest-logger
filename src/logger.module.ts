import { Module, type Provider } from '@nestjs/common';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './logger.module-definition';
import { OTEL_LOGGER_PROVIDER, WINSTON_LOGGER } from './logger.constants';
import type { LoggerModuleOptions } from './interfaces/logger-options.interface';
import {
  resolveLoggerProvider,
  type ResolvedLoggerProvider,
} from './otel/logger-provider.factory';
import { createWinstonLogger } from './winston/winston-logger.factory';
import { LoggerService } from './logger.service';
import { LoggerLifecycleService } from './logger-lifecycle.service';

const otelLoggerProvider: Provider = {
  provide: OTEL_LOGGER_PROVIDER,
  useFactory: (options: LoggerModuleOptions) => resolveLoggerProvider(options),
  inject: [MODULE_OPTIONS_TOKEN],
};

const winstonLogger: Provider = {
  provide: WINSTON_LOGGER,
  useFactory: (options: LoggerModuleOptions, resolved: ResolvedLoggerProvider) =>
    createWinstonLogger(options, Boolean(resolved.provider)),
  inject: [MODULE_OPTIONS_TOKEN, OTEL_LOGGER_PROVIDER],
};

/**
 * NestJS module that wires Winston to OpenTelemetry OTLP log export with trace
 * correlation. Configure via `LoggerModule.forRoot(options)` or
 * `LoggerModule.forRootAsync(asyncOptions)`.
 */
@Module({
  providers: [otelLoggerProvider, winstonLogger, LoggerService, LoggerLifecycleService],
  exports: [LoggerService, WINSTON_LOGGER, OTEL_LOGGER_PROVIDER],
})
export class LoggerModule extends ConfigurableModuleClass {}
