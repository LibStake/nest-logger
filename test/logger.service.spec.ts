import type { Logger as WinstonLogger } from 'winston';
import { LoggerService } from '../src/logger.service';

function makeService() {
  const log = jest.fn();
  const service = new LoggerService({ log } as unknown as WinstonLogger);
  return { service, log };
}

describe('LoggerService', () => {
  it('maps Nest levels to winston levels', () => {
    const { service, log } = makeService();
    service.log('a');
    service.warn('b');
    service.debug('c');
    service.verbose('d');
    service.fatal('e');

    expect(log.mock.calls.map((c) => c[0].level)).toEqual([
      'info',
      'warn',
      'debug',
      'verbose',
      'error',
    ]);
  });

  it('treats a trailing string argument as the Nest context', () => {
    const { service, log } = makeService();
    service.log('user created', 'UsersService');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', message: 'user created', context: 'UsersService' }),
    );
  });

  it('captures Error message and stack', () => {
    const { service, log } = makeService();
    const err = new Error('boom');
    service.error(err, 'AppService');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error', message: 'boom', context: 'AppService' }),
    );
    expect(log.mock.calls[0][0].stack).toContain('boom');
  });

  it('treats error(message, stack, context) per Nest convention', () => {
    const { service, log } = makeService();
    service.error('failed', 'STACKTRACE', 'AppService');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'failed',
        stack: 'STACKTRACE',
        context: 'AppService',
      }),
    );
  });

  it('merges object messages into the log record', () => {
    const { service, log } = makeService();
    service.log({ message: 'structured', userId: 7 });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', message: 'structured', userId: 7 }),
    );
  });
});
