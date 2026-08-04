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
    // Sem proxy de propósito: em dev o navegador chama a API na porta 4000 e
    // passa pelo CORS de verdade — o mesmo caminho que acontece em produção.
    // Se o CORS estiver mal configurado, a gente descobre agora, não no deploy.

    // Expõe o dev server na rede local para abrir o app no celular e testar a
    // instalação do PWA em um aparelho de verdade (Sprint 5). O Vite passa a
    // imprimir a URL "Network:" ao subir.
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
