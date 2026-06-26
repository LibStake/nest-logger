import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { OTEL_LOGGER_PROVIDER } from './logger.constants';
import type { ResolvedLoggerProvider } from './otel/logger-provider.factory';

/**
 * Flushes and shuts down the OTel LoggerProvider on application shutdown so
 * batched log records are not lost. Only acts on a provider this library owns;
 * an injected or host-owned provider is left for its owner to manage.
 *
 * Requires `app.enableShutdownHooks()` in the host application.
 */
@Injectable()
export class LoggerLifecycleService implements OnApplicationShutdown {
  constructor(
    @Inject(OTEL_LOGGER_PROVIDER) private readonly resolved: ResolvedLoggerProvider,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    const { provider, owned } = this.resolved;
    if (!owned || !provider) {
      return;
    }
    try {
      await provider.forceFlush();
    } finally {
      await provider.shutdown();
    }
  }
}
