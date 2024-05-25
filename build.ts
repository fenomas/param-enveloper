import html from 'bun-plugin-html';
import dts from 'bun-plugin-dts';

// build exported library and types
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  plugins: [dts()],
  target: 'node',
});

// build demo
await Bun.build({
  entrypoints: ['./demo/index.html'],
  outdir: './docs',
  minify: true,
  plugins: [html()],
  target: 'node',
});
