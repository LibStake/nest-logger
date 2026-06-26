import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { LoggerModuleOptions } from './interfaces/logger-options.interface';

export interface LoggerModuleExtraOptions {
  /** Register the module globally so the logger can be injected anywhere. Default: `true`. */
  isGlobal?: boolean;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<LoggerModuleOptions>({ moduleName: 'Logger' })
    .setClassMethodName('forRoot')
    .setExtras<LoggerModuleExtraOptions>({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .build();
