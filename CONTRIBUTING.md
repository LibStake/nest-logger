# Contributing

For maintainers/contributors. For library usage, see the [README](./README.md).

## Development

```bash
pnpm install
pnpm build       # tsup: ESM + CJS + d.ts
pnpm test        # jest
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
```

## Testing notes

- Unit/integration tests verify the Winston -> OpenTelemetry bridge using an in-memory exporter (`InMemoryLogRecordExporter`).
- The real OTLP/HTTP exporter uses an internal dynamic `import()`, which **does not work under jest's VM** (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`). So the real HTTP export is verified at the Node level. After building, point it at a mock receiver on port 4318:

```js
require('http')
  .createServer((req, res) => {
    let n = 0;
    req.on('data', (c) => (n += c.length));
    req.on('end', () => {
      console.log('OTLP', req.url, n, 'bytes');
      res.writeHead(200, { 'content-type': 'application/x-protobuf' }).end();
    });
  })
  .listen(4318, () => console.log('listening on :4318'));
```

## DI / bundling note

tsup (esbuild) does not emit `emitDecoratorMetadata`. To avoid relying on type metadata for DI, all dependencies are wired as **`useFactory` providers with an explicit `inject`**, and class providers use **`@Inject(TOKEN)`**. Follow the same rule when adding new providers.

## Publishing (GitHub Packages)

`publishConfig.registry` in `package.json` points at GitHub Packages, and publishing is handled by CI (`.github/workflows/publish.yml`). The trigger is a **push to the `release` branch**.

1. Bump the version on `master`: `pnpm version patch` (or `minor`/`major`) — this creates a version commit.
2. Push the changes to the **`release` branch** (e.g. merge/fast-forward `master` into `release` and push). The workflow runs:
   - `actions/setup-node` sets the `@libstake` scope to the GitHub registry and authenticates with the workflow's `packages: write` permission + `GITHUB_TOKEN` (→ `NODE_AUTH_TOKEN`).
   - install → build → test → version check → `pnpm publish --no-git-checks` if the version is new.
   - **If the current version is already published, the publish step is skipped automatically**, so pushing to `release` without a version bump won't fail (and won't publish).
3. For manual publishing, run the workflow from the Actions tab via **workflow_dispatch**. To publish locally, put a `write:packages` PAT in user-level config (`pnpm config set "//npm.pkg.github.com/:_authToken" <PAT>`) and run `pnpm publish`.

> Package visibility (public/private) is set on GitHub after the first publish.
