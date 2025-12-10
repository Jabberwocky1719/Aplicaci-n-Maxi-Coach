import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Aplicaci-n-Maxi-Coach/",
  build: {
    outDir: 'dist', // Output directory for the build
    rollupOptions: {
      input: 'index.html', // Entry HTML file
      external: ['react', 'react-dom', '@google/genai'], // Fix: Added 'react' and 'react-dom' to externals
    },
  },
});