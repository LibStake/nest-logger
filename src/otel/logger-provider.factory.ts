import { logs } from '@opentelemetry/api-logs';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import type { Attributes } from '@opentelemetry/api';
import type { LoggerModuleOptions } from '../interfaces/logger-options.interface';
import { createOtlpLogExporter } from './exporter.factory';

export interface ResolvedLoggerProvider {
  /** The LoggerProvider the Winston transport will use, or `undefined` if OTLP is off. */
  provider: LoggerProvider | undefined;
  /** Whether this library created the provider (and is therefore responsible for shutdown). */
  owned: boolean;
}

function resolveEnvironment(options: LoggerModuleOptions): string | undefined {
  return options.environment ?? process.env.NODE_ENV;
}

function buildResource(options: LoggerModuleOptions) {
  const env = resolveEnvironment(options);
  const attributes: Attributes = {
    [ATTR_SERVICE_NAME]: options.serviceName,
    ...(options.serviceVersion ? { [ATTR_SERVICE_VERSION]: options.serviceVersion } : {}),
    ...(env ? { [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env } : {}),
    ...(options.resourceAttributes ?? {}),
  };
  return defaultResource().merge(resourceFromAttributes(attributes));
}

/**
 * Resolves the OTel LoggerProvider according to the configured ownership mode:
 *  1. OTLP disabled        -> no provider.
 *  2. `loggerProvider` set  -> register it globally, do not own it.
 *  3. `useGlobalProvider`   -> reuse the host's global provider, do not own it.
 *  4. otherwise            -> build + register + own a provider.
 *
 * The provider is registered as the global LoggerProvider because
 * `OpenTelemetryTransportV3` resolves its logger via `logs.getLogger()`.
 */
export async function resolveLoggerProvider(
  options: LoggerModuleOptions,
): Promise<ResolvedLoggerProvider> {
  const otlp = options.otlp ?? {};

  if (otlp.enabled === false) {
    return { provider: undefined, owned: false };
  }

  if (options.loggerProvider) {
    logs.setGlobalLoggerProvider(options.loggerProvider);
    return { provider: options.loggerProvider, owned: false };
  }

  if (otlp.useGlobalProvider) {
    return { provider: logs.getLoggerProvider() as LoggerProvider, owned: false };
  }

  const exporter = await createOtlpLogExporter(otlp);
  const processor = new BatchLogRecordProcessor(exporter, otlp.batch);
  const provider = new LoggerProvider({
    resource: buildResource(options),
    processors: [processor],
  });
  logs.setGlobalLoggerProvider(provider);
  return { provider, owned: true };
}
