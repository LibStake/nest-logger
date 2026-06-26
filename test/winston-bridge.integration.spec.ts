import { logs } from '@opentelemetry/api-logs';
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { resolveLoggerProvider } from '../src/otel/logger-provider.factory';
import { createWinstonLogger } from '../src/winston/winston-logger.factory';
import type { LoggerModuleOptions } from '../src/interfaces/logger-options.interface';

/**
 * Verifies the Winston -> OpenTelemetry bridge end to end using an in-memory
 * exporter (no HTTP). The real OTLP/HTTP export path is verified at the Node
 * level — see README "Verifying OTLP export". (It cannot run under jest's VM,
 * which blocks the exporter's internal dynamic import.)
 */
describe('Winston -> OTel bridge', () => {
  afterEach(() => logs.disable());

  it('emits Winston logs to an injected LoggerProvider', async () => {
    const exporter = new InMemoryLogRecordExporter();
    const provider = new LoggerProvider({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'bridge-test' }),
      processors: [new SimpleLogRecordProcessor(exporter)],
    });

    const options: LoggerModuleOptions = {
      serviceName: 'bridge-test',
      console: false,
      loggerProvider: provider,
    };

    // Injected-provider mode: the library registers it globally but does not own it.
    const resolved = await resolveLoggerProvider(options);
    expect(resolved.owned).toBe(false);
    expect(resolved.provider).toBe(provider);
    expect(logs.getLoggerProvider()).toBe(provider);

    const logger = createWinstonLogger(options, true);
    logger.info('hello bridge', { userId: 42 });
    await new Promise<void>((resolve) => {
      logger.on('finish', () => resolve());
      logger.end();
    });
    await provider.forceFlush();

    const records = exporter.getFinishedLogRecords();
    expect(records.length).toBeGreaterThan(0);
    const [record] = records;
    expect(record.body).toBe('hello bridge');
    expect(record.severityText).toBe('info');
    expect(record.resource.attributes[ATTR_SERVICE_NAME]).toBe('bridge-test');
    expect(record.attributes.userId).toBe(42);

    await provider.shutdown();
  });
});
