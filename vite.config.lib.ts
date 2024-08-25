import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// use this for locally serving the demo page, since bun can't
export default defineConfig({
  build: {
    target: 'esnext',
    sourcemap: true,
    minify: true,

    // lib build mode
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },

  plugins: [
    // exports .d.ts files
    dts({ include: 'src/**/*.ts', exclude: '**/*.test.ts' }),
  ],

  clearScreen: false,
  logLevel: 'info',
});
