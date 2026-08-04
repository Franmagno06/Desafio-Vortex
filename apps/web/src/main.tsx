import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { setAuthTokenProvider } from './lib/api-client.ts';
import { getStoredToken } from './features/auth/storage.ts';
import './styles/global.css';

/**
 * Liga o cliente HTTP ao token guardado ANTES de o React montar.
 *
 * O `AuthProvider` refaz essa ligação com o token em memória, mas ele só roda
 * durante a renderização. Este registro cobre a janela anterior a isso — sem
 * ele, uma requisição disparada muito cedo sairia sem `Authorization` e
 * voltaria 401.
 */
setAuthTokenProvider(getStoredToken);

/**
 * Bootstrap do React 19.
 *
 * `StrictMode` só roda em desenvolvimento: ele monta cada componente duas
 * vezes de propósito para expor efeitos colaterais mal isolados (por exemplo,
 * um `useEffect` sem função de cleanup). Não afeta o build de produção.
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemento #root não encontrado em index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
