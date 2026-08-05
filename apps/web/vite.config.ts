import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind v4 roda como plugin do Vite — não existe mais tailwind.config.js
    // nem postcss.config.js. O tema é declarado em CSS (src/styles/global.css).
    tailwindcss(),

    VitePWA({
      /**
       * `injectManifest` em vez de `generateSW`.
       *
       * `generateSW` produziria o Service Worker automaticamente a partir de
       * opções — mais rápido, porém uma caixa-preta. Com `injectManifest` nós
       * escrevemos `src/sw.ts` inteiro e o plugin apenas injeta nele a lista de
       * arquivos do precache.
       *
       * A escolha é deliberada: o edital pede que o candidato explique "a
       * lógica do Service Worker" no vídeo, e só dá para explicar o que se
       * escreveu.
       */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      /** Permite testar o SW com `npm run dev`, sem precisar de build. */
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },

      /**
       * `prompt` em vez de `autoUpdate`: quando sai uma versão nova, o app
       * avisa e deixa a pessoa escolher quando recarregar. Atualizar sozinho
       * durante o preenchimento de um formulário perderia o que foi digitado.
       */
      registerType: 'prompt',

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },

      /**
       * O manifesto — requisito OBRIGATÓRIO do edital. É ele que diz ao
       * navegador que isto é um aplicativo instalável, e não um site.
       */
      manifest: {
        name: 'Circula — Economia circular do campus',
        /** Usado embaixo do ícone na tela inicial: precisa ser curto. */
        short_name: 'Circula',
        description:
          'Marketplace de economia circular do campus. Doe, venda e encontre livros, jalecos, calculadoras e materiais universitários.',
        lang: 'pt-BR',
        dir: 'ltr',

        /** Abre sem barra de endereço — é o que faz "parecer um app". */
        display: 'standalone',
        orientation: 'portrait',

        /** Rota inicial ao abrir pelo ícone: já entra no app, não na landing. */
        start_url: '/app',
        scope: '/',

        /** Cor da barra de status do sistema quando o app está aberto. */
        theme_color: '#1c319e',
        /** Cor da tela de abertura, antes de o React montar. */
        background_color: '#ffffff',

        categories: ['shopping', 'education', 'lifestyle'],

        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // `maskable` é uma arte separada, com margem de segurança: o Android
          // recorta o ícone na forma do sistema (círculo, squircle) e comeria
          // as bordas da arte comum.
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        /**
         * Atalhos no ícone (toque longo no Android).
         * Detalhe pequeno que reforça a sensação de aplicativo nativo.
         */
        shortcuts: [
          {
            name: 'Anunciar um item',
            short_name: 'Anunciar',
            url: '/app/anunciar',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Explorar a vitrine',
            short_name: 'Explorar',
            url: '/explorar',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
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
