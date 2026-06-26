import { trace, type Span } from '@opentelemetry/api';
import { traceContextFormat } from '../src/winston/formats/trace-context.format';

function fakeSpan(traceId: string, spanId: string, traceFlags: number): Span {
  return {
    spanContext: () => ({ traceId, spanId, traceFlags, isRemote: false }),
  } as unknown as Span;
}

describe('traceContextFormat', () => {
  afterEach(() => jest.restoreAllMocks());

  it('injects trace_id/span_id/trace_flags from a valid active span', () => {
    jest
      .spyOn(trace, 'getSpan')
      .mockReturnValue(fakeSpan('0af7651916cd43dd8448eb211c80319c', 'b7ad6b7169203331', 1));

    const info = traceContextFormat().transform({ level: 'info', message: 'hi' });

    expect(info).not.toBe(false);
    expect(info).toMatchObject({
      trace_id: '0af7651916cd43dd8448eb211c80319c',
      span_id: 'b7ad6b7169203331',
      trace_flags: '01',
    });
  });

  it('leaves the record untouched when there is no active span', () => {
    jest.spyOn(trace, 'getSpan').mockReturnValue(undefined);

    const info = traceContextFormat().transform({ level: 'info', message: 'hi' });

    expect(info).toMatchObject({ message: 'hi' });
    expect((info as Record<string, unknown>).trace_id).toBeUndefined();
  });

  it('ignores an invalid (all-zero) span context', () => {
    jest
      .spyOn(trace, 'getSpan')
      .mockReturnValue(fakeSpan('00000000000000000000000000000000', '0000000000000000', 0));

    const info = traceContextFormat().transform({ level: 'info', message: 'hi' });

    expect((info as Record<string, unknown>).trace_id).toBeUndefined();
  });
});
