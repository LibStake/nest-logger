import { createOtlpLogExporter } from '../src/otel/exporter.factory';
import type { OtlpProtocol } from '../src/interfaces/logger-options.interface';

describe('createOtlpLogExporter', () => {
  it.each<OtlpProtocol>(['http/protobuf', 'http/json', 'grpc'])(
    'builds an exporter for protocol %s',
    async (protocol) => {
      const exporter = await createOtlpLogExporter({ protocol, endpoint: 'http://localhost:4318' });
      expect(exporter).toBeDefined();
      expect(typeof exporter.export).toBe('function');
      expect(typeof exporter.shutdown).toBe('function');
      await exporter.shutdown();
    },
  );

  it('defaults to http/protobuf when no protocol is given', async () => {
    const exporter = await createOtlpLogExporter({});
    expect(exporter.constructor.name).toBe('OTLPLogExporter');
    await exporter.shutdown();
  });

  it('throws on an unsupported protocol', async () => {
    await expect(
      createOtlpLogExporter({ protocol: 'thrift' as unknown as OtlpProtocol }),
    ).rejects.toThrow(/Unsupported OTLP protocol/);
  });
});
