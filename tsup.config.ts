import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  splitting: false,
  treeshake: true,
  // dependencies + peerDependencies are externalized by tsup automatically;
  // the optional OTLP exporters are loaded lazily via dynamic import().
});
