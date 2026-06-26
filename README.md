# @libstake/nest-logger

A NestJS library that ships your Winston logs to OpenTelemetry as **OTLP logs** and correlates them with the active span's trace context.

- Winston-based, full NestJS `LoggerService` replacement (`app.useLogger()` + bootstrap logs + DI injection)
- OTLP log export — to any OTLP receiver: OpenTelemetry Collector, Grafana Loki/Alloy/Cloud, SigNoz, etc.
- Trace correlation: OTLP records are correlated automatically from the active span; console/JSON output gets `trace_id`/`span_id` injected
- Pluggable exporter protocol: `http/protobuf` (default) · `grpc` · `http/json`
- Selectable LoggerProvider ownership: self-created / injected / reuse host global

## Installation

This package is published to **GitHub Packages**. In the consuming project, map the `@libstake` scope to the GitHub registry via `.npmrc`.

```ini
# .npmrc (project root, safe to commit)
@libstake:registry=https://npm.pkg.github.com
```

Keep the auth token (a PAT with `read:packages`) in **user-level** config, not in the committed `.npmrc`. Since pnpm 10/11 no longer expands environment variables in a repo-committed `.npmrc` for security reasons, use `pnpm config`:

```bash
pnpm config set "//npm.pkg.github.com/:_authToken" "YOUR_GITHUB_PAT"
```

> In CI, use `actions/setup-node` with `registry-url`/`scope` plus `NODE_AUTH_TOKEN` — it writes the auth to the user-level `.npmrc` automatically.

Install:

```bash
pnpm add @libstake/nest-logger
# peer deps (skip any your app already has)
pnpm add @nestjs/common @nestjs/core @opentelemetry/api winston
```

To use a protocol other than the default `http/protobuf`, install the matching exporter:

```bash
pnpm add @opentelemetry/exporter-logs-otlp-grpc   # protocol: 'grpc'
pnpm add @opentelemetry/exporter-logs-otlp-http   # protocol: 'http/json'
```

## Quick start

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from '@libstake/nest-logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      serviceName: 'orders-api',
      serviceVersion: '1.2.0',
      environment: process.env.NODE_ENV,
      otlp: {
        endpoint: 'http://localhost:4318', // '/v1/logs' is appended automatically
      },
    }),
  ],
})
export class AppModule {}
```

## Replacing the default NestJS logger

Use `bufferLogs: true` to buffer bootstrap logs, then swap in the DI logger. Also call `enableShutdownHooks()` so buffered logs are flushed on shutdown.

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@libstake/nest-logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(LoggerService)); // routes bootstrap logs through Winston -> OTLP
  app.enableShutdownHooks(); // ensures the OTLP batch is flushed on shutdown
  await app.listen(3000);
}
bootstrap();
```

Inject it inside services:

```ts
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@libstake/nest-logger';

@Injectable()
export class OrdersService {
  constructor(private readonly logger: LoggerService) {}

  create() {
    this.logger.log('order created', 'OrdersService');
  }
}
```

> If you just want to keep the standard NestJS `Logger`, `app.useLogger()` is enough. `LoggerModule` is registered globally (`isGlobal` defaults to `true`), so `LoggerService` is injectable anywhere.

## Async configuration (`forRootAsync`)

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@libstake/nest-logger';

LoggerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    serviceName: config.getOrThrow('SERVICE_NAME'),
    level: config.get('LOG_LEVEL', 'info'),
    otlp: { endpoint: config.get('OTEL_EXPORTER_OTLP_ENDPOINT') },
  }),
});
```

## Export targets

For any OTLP receiver, just change `otlp.endpoint` (and `headers` if needed). Pass a base URL to `endpoint` and `/v1/logs` is appended for you.

```ts
// OpenTelemetry Collector / SigNoz
otlp: { endpoint: 'http://collector:4318' }

// Grafana Loki (3.x, native OTLP)
otlp: { endpoint: 'http://loki:3100/otlp' }

// Grafana Alloy
otlp: { endpoint: 'http://alloy:4318' }

// Grafana Cloud (Basic auth)
otlp: {
  endpoint: 'https://otlp-gateway-<zone>.grafana.net/otlp',
  headers: { Authorization: `Basic ${base64('<instanceID>:<token>')}` },
}
```

## LoggerProvider ownership

Three modes, depending on whether the host app already configured an OpenTelemetry SDK (e.g. for tracing).

| Mode | Configuration | Behavior |
| --- | --- | --- |
| Self-created (default) | options only | Creates the exporter + `LoggerProvider`, registers it globally, and flushes/shuts it down on shutdown |
| Injected | `loggerProvider: myProvider` | Registers the given provider globally only; the caller owns and shuts it down |
| Reuse global | `otlp.useGlobalProvider: true` | Uses the global `LoggerProvider` the host already registered |

## Options reference

| Option | Default | Description |
| --- | --- | --- |
| `serviceName` | (required) | OTel resource `service.name` |
| `serviceVersion` | – | `service.version` |
| `environment` | `process.env.NODE_ENV` | `deployment.environment.name` |
| `resourceAttributes` | – | Extra OTel resource attributes |
| `level` | `process.env.LOG_LEVEL` ?? `'info'` | Winston level |
| `console` | dev=pretty, prod=json | `false` to disable, or `{ pretty }` |
| `defaultMeta` | – | Static metadata attached to every log |
| `traceContext` | `true` | Inject `trace_id`/`span_id` into console/JSON output |
| `otlp.enabled` | `true` | Whether to attach the OTLP transport |
| `otlp.protocol` | `'http/protobuf'` | `'http/protobuf'` · `'grpc'` · `'http/json'` |
| `otlp.endpoint` | env fallback | Base endpoint (HTTP appends `/v1/logs`) |
| `otlp.headers` | – | OTLP headers (HTTP only) |
| `otlp.batch` | SDK defaults | `BatchLogRecordProcessor` tuning |
| `otlp.useGlobalProvider` | `false` | Reuse the host's global provider |
| `loggerProvider` | – | Inject an existing `LoggerProvider` |

## Environment variables

If `otlp.endpoint`/`otlp.headers` are omitted, the OTLP exporter reads the standard variables.

- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` (full path) or `OTEL_EXPORTER_OTLP_ENDPOINT` (base)
- `OTEL_EXPORTER_OTLP_HEADERS`

## License

MIT
