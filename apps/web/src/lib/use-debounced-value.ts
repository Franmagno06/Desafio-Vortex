import { useEffect, useState } from 'react';

/**
 * Atrasa a propagação de um valor até ele parar de mudar por `delay` ms.
 *
 * Usado na busca: sem isso, digitar "arduino" dispararia sete requisições —
 * uma por letra — e a resposta da terceira poderia chegar depois da sétima,
 * exibindo o resultado da busca errada.
 *
 * O `clearTimeout` no cleanup é o que faz o mecanismo funcionar: cada tecla
 * cancela o timer anterior, então só a última pausa real chega ao fim.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
