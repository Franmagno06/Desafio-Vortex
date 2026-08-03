import { Link } from 'react-router';
import { Leaf } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-ink-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Leaf className="size-4" aria-hidden="true" />
            </span>
            Circula<span className="-ml-2 text-brand-600">.</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            A economia circular do campus. Dê uma segunda vida ao que sobra de um semestre.
          </p>
        </div>

        <nav aria-label="Navegação do rodapé">
          <h2 className="text-sm font-semibold text-ink-900">Plataforma</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <Link to="/explorar" className="hover:text-brand-700">
                Explorar itens
              </Link>
            </li>
            <li>
              <Link to="/anunciar" className="hover:text-brand-700">
                Anunciar um item
              </Link>
            </li>
            <li>
              <Link to="/como-funciona" className="hover:text-brand-700">
                Como funciona
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Sobre</h2>
          <p className="mt-3 text-sm text-ink-500">
            Projeto desenvolvido para o Desafio Técnico do Laboratório de Inovação Vortex — UNIFOR,
            2026.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs text-ink-500">
        Feito com foco em reuso e economia circular no campus.
      </div>
    </footer>
  );
}
