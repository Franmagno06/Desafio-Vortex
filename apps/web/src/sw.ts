/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

/**
 * ════════════════════════════════════════════════════════════════════════
 * SERVICE WORKER DO CIRCULA
 *
 * Escrito à mão (estratégia `injectManifest` do vite-plugin-pwa), e não
 * gerado automaticamente. O edital pede que o candidato explique "a lógica
 * do Service Worker" no vídeo — para isso é preciso ter escrito as regras.
 *
 * O que é um Service Worker: um script que roda em uma thread separada da
 * página e funciona como um **proxy entre o app e a rede**. Toda requisição
 * passa por ele antes de sair, e ele decide se responde do cache, vai à rede,
 * ou os dois. É isso que permite a aplicação abrir sem internet.
 *
 * Ciclo de vida: install → activate → fetch. Um SW novo fica "esperando"
 * enquanto o antigo controla abas abertas — daí o `skipWaiting` no final.
 * ════════════════════════════════════════════════════════════════════════
 */

// O escopo global de um SW não é `window`, é `ServiceWorkerGlobalScope`.
declare const self: ServiceWorkerGlobalScope;

/** Sufixo comum para achar todos os caches do app no DevTools. */
const CACHE_PREFIX = 'circula';

// ───────────────────────────────────────────────────────────────────────
// 1. PRECACHE — o "app shell"
//
// `self.__WB_MANIFEST` é um marcador: no build, o vite-plugin-pwa o
// substitui pela lista de todos os arquivos gerados (JS, CSS, ícones) com
// um hash de revisão. São eles que fazem a aplicação **abrir** offline.
//
// O hash importa: quando um arquivo muda, seu hash muda, e só ele é
// rebaixado — o resto do cache permanece.
// ───────────────────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);

/** Remove caches de versões anteriores do SW, que só ocupariam espaço. */
cleanupOutdatedCaches();

// ───────────────────────────────────────────────────────────────────────
// 2. NAVEGAÇÃO — o app abre offline
//
// Numa SPA, qualquer rota (`/explorar`, `/app/perfil`) é servida pelo mesmo
// `index.html`. Esta rota devolve o index do precache para toda navegação,
// então abrir o app instalado sem internet funciona.
//
// As exclusões evitam sequestrar o que não é navegação da SPA.
// ───────────────────────────────────────────────────────────────────────
const navigationHandler = createHandlerBoundToURL('/index.html');

registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//, // chamadas à API
      /^\/docs/, // Swagger, servido pelo backend
      /\.[^/]+$/, // qualquer coisa com extensão (arquivos)
    ],
  }),
);

// ───────────────────────────────────────────────────────────────────────
// 3. LISTAGENS DA API — Stale-While-Revalidate
//
// A estratégia mais importante do app, e a que responde ao bônus do edital
// ("visualização offline de dados já carregados").
//
// Como funciona: responde IMEDIATAMENTE com a versão em cache (stale) e, em
// paralelo, busca a versão nova na rede para a próxima visita (revalidate).
//
//   1ª visita  → rede (nada em cache ainda)
//   2ª visita  → cache instantâneo + atualização em segundo plano
//   sem rede   → cache, e a vitrine continua navegável
//
// Por que aqui e não `NetworkFirst`: a vitrine tolera estar alguns minutos
// desatualizada, e a resposta instantânea vale mais que o dado do segundo.
// ───────────────────────────────────────────────────────────────────────
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /\/api\/v1\/(announcements|categories|catalog|stats)/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: `${CACHE_PREFIX}-api`,
    plugins: [
      // Sem isto, respostas de erro (4xx/5xx) entrariam no cache e seriam
      // servidas como se fossem válidas. `0` cobre respostas opacas.
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 24 * 60 * 60, // 1 dia
        // Libera o espaço assim que o navegador avisa que está no limite.
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// ───────────────────────────────────────────────────────────────────────
// 4. AUTENTICAÇÃO — Network-First, nunca cache puro
//
// `/auth/me` decide se a sessão é válida. Servir do cache manteria alguém
// "logado" com um token já expirado, ou pior: mostraria os dados do usuário
// anterior depois de trocar de conta.
//
// NetworkFirst = tenta a rede; só cai no cache se ela falhar. O timeout de
// 3s evita que uma conexão ruim trave a abertura do app.
// ───────────────────────────────────────────────────────────────────────
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/v1/auth'),
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-auth`,
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 })],
  }),
);

// ───────────────────────────────────────────────────────────────────────
// 5. IMAGENS — Cache-First
//
// As fotos dos anúncios são URLs externas que não mudam: a mesma URL sempre
// devolve a mesma imagem. Não faz sentido ir à rede duas vezes pelo mesmo
// byte, então servimos do cache e só buscamos o que ainda não temos.
//
// É a estratégia que mais economiza dados móveis do usuário.
// ───────────────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}-images`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// ───────────────────────────────────────────────────────────────────────
// 6. BACKGROUND SYNC — publicar anúncio offline
//
// O recurso mais interessante do SW aqui. Se a pessoa toca em "Publicar" sem
// rede, a requisição **não se perde**: o SW a coloca numa fila no IndexedDB
// e o navegador a reenvia sozinho quando a conexão voltar — mesmo que o app
// já tenha sido fechado.
//
// É o comportamento que separa "site que quebra offline" de "aplicativo".
// ───────────────────────────────────────────────────────────────────────
const announcementSyncPlugin = new BackgroundSyncPlugin(`${CACHE_PREFIX}-announcement-queue`, {
  // Depois de 24h a tentativa é descartada: um anúncio de ontem provavelmente
  // já não faz sentido, e a fila não pode crescer para sempre.
  maxRetentionTime: 24 * 60,

  async onSync({ queue }) {
    let replayed = 0;

    let entry = await queue.shiftRequest();
    while (entry) {
      try {
        await fetch(entry.request.clone());
        replayed += 1;
      } catch {
        // Falhou de novo: devolve para a fila e para, mantendo a ordem.
        await queue.unshiftRequest(entry);
        break;
      }
      entry = await queue.shiftRequest();
    }

    if (replayed > 0) {
      // Avisa as abas abertas para atualizarem a lista.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SYNC_COMPLETED', count: replayed });
      }
    }
  },
});

registerRoute(
  ({ url, request }) =>
    request.method === 'POST' && url.pathname.startsWith('/api/v1/announcements'),
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-mutations`,
    plugins: [announcementSyncPlugin],
  }),
  'POST',
);

// ───────────────────────────────────────────────────────────────────────
// 7. CICLO DE VIDA
// ───────────────────────────────────────────────────────────────────────

/**
 * Por padrão, um SW novo espera todas as abas fecharem para assumir. Isso
 * deixaria o usuário com a versão antiga por tempo indeterminado.
 *
 * Aqui a página pergunta se ele quer atualizar (ver `pwa.ts`) e, ao aceitar,
 * envia esta mensagem — o SW novo assume e a página recarrega.
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

/**
 * `clients.claim()` faz este SW controlar as abas já abertas imediatamente
 * após ativar, sem esperar um novo carregamento.
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
