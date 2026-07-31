import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css';

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
