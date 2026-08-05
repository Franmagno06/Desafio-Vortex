import { useCallback } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import type { FetchStatus } from '@tanstack/react-query';
import { queryKeys } from './query-client';

/**
 * Traduz o estado de uma query do TanStack Query no estado que a INTERFACE
 * precisa desenhar.
 *
 * Existe por causa de um bug real, encontrado ao testar o app com a API fora
 * do ar: a tela de Explorar ficava **presa em skeletons para sempre**, sem
 * mensagem e sem botão de tentar de novo.
 *
 * A causa não era um travamento. O TanStack Query tem um quarto estado que é
 * fácil de ignorar:
 *
 *   status: 'pending' + fetchStatus: 'fetching'  → carregando de verdade
 *   status: 'pending' + fetchStatus: 'paused'    → PAUSADO, esperando rede
 *   status: 'error'                              → falhou
 *   status: 'success'                            → tem dado
 *
 * Quando a primeira requisição falha por erro de rede, o React Query **pausa**
 * os retries em vez de reportar erro — ele assume que não adianta insistir sem
 * conexão e vai retomar sozinho quando ela voltar. É um comportamento sensato,
 * mas a interface precisa mostrar isso; tratar `isPending` como "carregando"
 * produz um spinner eterno.
 *
 * Distinguir os quatro casos aqui, num lugar só, evita que cada tela repita
 * (e esqueça) essa checagem.
 */
export type ListDisplayState = 'loading' | 'paused' | 'error' | 'empty' | 'ready';

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  fetchStatus: FetchStatus;
}

export function resolveListState(
  query: QueryLike,
  itemCount: number | undefined,
): ListDisplayState {
  // Pausado: sem conexão e sem nada em cache para mostrar. Precisa virar uma
  // mensagem com saída, nunca um skeleton.
  if (query.isPending && query.fetchStatus === 'paused') return 'paused';

  if (query.isPending) return 'loading';
  if (query.isError) return 'error';
  if (!itemCount) return 'empty';

  return 'ready';
}

/**
 * Retoma uma query pausada e a busca de novo.
 *
 * Necessário porque `refetch()` sozinho **não desbloqueia** uma query pausada:
 * ela só é retomada quando o `onlineManager` do React Query sinaliza que a
 * conexão voltou, e esse sinal vem de um evento `online` do navegador.
 *
 * O impasse aparece quando o que caiu foi o **servidor**, não a rede: o
 * navegador nunca ficou offline, então nunca dispara `online`, e a query fica
 * pausada indefinidamente. O botão "Tentar de novo" não fazia nada.
 *
 * A saída é ressincronizar o `onlineManager` com a realidade. A transição
 * `false → true` é o que faz o React Query liberar o que estava pausado; sem o
 * `false` antes, `setOnline(true)` seria um no-op quando ele já se considera
 * online.
 */
export function useListRetry(): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    // Ressincroniza a noção de conectividade do React Query com a realidade.
    onlineManager.setOnline(navigator.onLine);

    /**
     * `resetQueries` e não `refetch()`.
     *
     * Uma query pausada **ignora `refetch()`**: internamente ela tenta
     * *continuar* um retryer que está bloqueado esperando um sinal de rede que
     * pode nunca chegar (quando o que caiu foi o servidor, e não a conexão, o
     * navegador jamais dispara o evento `online`). Verifiquei em execução: o
     * botão "Tentar de novo" não fazia absolutamente nada.
     *
     * `resetQueries` devolve a query ao estado inicial e começa uma busca
     * **nova**, descartando o retryer travado. É o que faz o botão funcionar
     * de verdade.
     */
    void queryClient.resetQueries({ queryKey: queryKeys.announcements.all });
  }, [queryClient]);
}
