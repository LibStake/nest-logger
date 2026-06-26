import { Test } from '@nestjs/testing';
import { LoggerModule } from '../src/logger.module';
import { LoggerService } from '../src/logger.service';
import { OTEL_LOGGER_PROVIDER, WINSTON_LOGGER } from '../src/logger.constants';
import type { ResolvedLoggerProvider } from '../src/otel/logger-provider.factory';

describe('LoggerModule (DI wiring)', () => {
  it('wires providers via forRoot with OTLP disabled', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ serviceName: 'di-test', console: false, otlp: { enabled: false } }),
      ],
    }).compile();

    expect(moduleRef.get(LoggerService)).toBeInstanceOf(LoggerService);
    expect(moduleRef.get(WINSTON_LOGGER)).toBeDefined();

    const resolved = moduleRef.get<ResolvedLoggerProvider>(OTEL_LOGGER_PROVIDER);
    expect(resolved.owned).toBe(false);
    expect(resolved.provider).toBeUndefined();

    await moduleRef.close();
  });

  it('wires providers via forRootAsync', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggerModule.forRootAsync({
          useFactory: () => ({ serviceName: 'async-test', console: false, otlp: { enabled: false } }),
        }),
      ],
    }).compile();

    const service = moduleRef.get(LoggerService);
    expect(service).toBeInstanceOf(LoggerService);
    expect(() => service.log('hello', 'Spec')).not.toThrow();

    await moduleRef.close();
  });
});
