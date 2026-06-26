/** DI token for the configured Winston logger instance. */
export const WINSTON_LOGGER = 'NEST_LOGGER:WINSTON_LOGGER';

/**
 * DI token for the resolved OTel LoggerProvider wrapper
 * (see `ResolvedLoggerProvider`).
 */
export const OTEL_LOGGER_PROVIDER = 'NEST_LOGGER:OTEL_LOGGER_PROVIDER';
