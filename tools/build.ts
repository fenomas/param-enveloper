import html from 'bun-plugin-html';
import dts from 'bun-plugin-dts';

// build core lib
await Bun.build({
  root: '..',
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  plugins: [dts()],
  target: 'node',
});

// build demo
await Bun.build({
  root: '..',
  entrypoints: ['./demo/index.html'],
  outdir: './docs',
  minify: true,
  plugins: [html()],
  target: 'node',
});
