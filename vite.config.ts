import { defineConfig } from 'vite';

export default defineConfig({
  base: '/image-improver/',
  
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
