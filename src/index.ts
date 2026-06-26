export { LoggerModule } from './logger.module';
export { LoggerService } from './logger.service';
export { LoggerLifecycleService } from './logger-lifecycle.service';
export { createBootstrapLogger } from './bootstrap';

export { WINSTON_LOGGER, OTEL_LOGGER_PROVIDER } from './logger.constants';
export { MODULE_OPTIONS_TOKEN } from './logger.module-definition';
export type { LoggerModuleExtraOptions } from './logger.module-definition';

export { resolveLoggerProvider } from './otel/logger-provider.factory';
export type { ResolvedLoggerProvider } from './otel/logger-provider.factory';
export { createOtlpLogExporter } from './otel/exporter.factory';
export { traceContextFormat } from './winston/formats/trace-context.format';
export { createWinstonLogger } from './winston/winston-logger.factory';

export type {
  LoggerModuleOptions,
  OtlpOptions,
  OtlpProtocol,
  OtlpBatchOptions,
  ConsoleOptions,
} from './interfaces/logger-options.interface';
