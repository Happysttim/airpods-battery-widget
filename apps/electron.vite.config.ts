import { defineConfig, swcPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    build: {
      bytecode: true,
      rollupOptions: {
        external: ['airpods-bluetooth', 'node:fs/promises', 'node:path'],
        input: {
          index: resolve('src/main/index.ts'),
        },
        output: {
          format: 'es',
        },
      },
    },
  },
  preload: {
    build: {
      bytecode: true,
      rollupOptions: {
        external: ['airpods-bluetooth', 'node:fs/promises', 'node:path'],
        input: {
          index: resolve('src/preload/index.ts'),
        },
        output: {
          format: 'es',
        },
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          list: resolve('src/renderer/list.html'),
          widget: resolve('src/renderer/widget.html'),
        },
        output: {
          format: 'es',
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@assets': resolve('src/renderer/assets'),
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    plugins: [react(), tailwindcss(), svgr()],
  },
});
