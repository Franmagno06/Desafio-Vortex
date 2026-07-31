import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind v4 roda como plugin do Vite — não existe mais tailwind.config.js
    // nem postcss.config.js. O tema é declarado em CSS (src/styles/global.css).
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Permite `import { X } from '@/components/...'` em vez de '../../../'.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Sem proxy de propósito: em dev o navegador chama a API na porta 3333 e
    // passa pelo CORS de verdade — o mesmo caminho que acontece em produção.
    // Se o CORS estiver mal configurado, a gente descobre agora, não no deploy.
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
