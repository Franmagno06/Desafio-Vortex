import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { Query } from '@tanstack/react-query';

/**
 * Persistência do cache do TanStack Query.
 *
 * O Service Worker guarda as **respostas HTTP**; isto guarda o **estado do
 * React Query**. São camadas complementares, e juntas produzem o resultado que
 * o edital pede como bônus ("visualização offline de dados já carregados"):
 *
 *  - só o SW → ao reabrir o app offline, o React Query começa vazio, dispara as
 *    queries, e elas são atendidas pelo cache do SW. Funciona, mas a tela
 *    pisca skeletons antes.
 *  - com o persister → os dados já aparecem na primeira renderização, sem
 *    carregamento nenhum.
 *
 * `localStorage` e não IndexedDB porque a escrita é síncrona e o volume é
 * pequeno (dezenas de anúncios). IndexedDB seria a escolha para volumes
 * grandes ou dados binários.
 */
export const queryPersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'circula:query-cache',

  /**
   * Se o `localStorage` estourar a cota, descarta o cache em vez de derrubar a
   * aplicação com uma exceção. Perder cache é aceitável; travar não é.
   */
  throttleTime: 1000,
});

/**
 * Decide o que vale a pena gravar no disco.
 *
 * Duas exclusões deliberadas:
 *
 *  - **Queries de autenticação.** São revalidadas no boot de qualquer forma, e
 *    persistir dados do usuário no `localStorage` significaria deixá-los
 *    legíveis no disco depois do logout.
 *  - **Queries que falharam.** Guardar um erro faria o app abrir exibindo a
 *    falha da sessão anterior, mesmo com a rede já funcionando.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;

  return query.queryKey[0] !== 'auth';
}

/**
 * Versão do cache persistido.
 *
 * Ao mudar o formato de um DTO, incremente: o React Query descarta caches com
 * `buster` diferente. Sem isso, um usuário com o app antigo instalado leria
 * dados no formato velho e a interface quebraria em campos que não existem
 * mais.
 */
export const CACHE_BUSTER = 'v1';

/** Uma semana. Depois disso, o dado offline é velho demais para ser útil. */
export const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;
