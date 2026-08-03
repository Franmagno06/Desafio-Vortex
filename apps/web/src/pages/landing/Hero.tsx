import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Seção de abertura da Landing Page.
 *
 * O edital pede "botões claros de chamada para ação (CTA) convidando o usuário
 * a anunciar ou buscar itens" — são os dois botões abaixo, com hierarquia
 * visual deliberada: anunciar é a ação primária (sólida), buscar é a secundária
 * (contorno). Anunciar alimenta o acervo; sem oferta, não há o que buscar.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Fundo decorativo. `aria-hidden` porque não carrega informação. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-surface-muted to-surface-muted"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-brand-200/30 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800 uppercase">
            Economia circular no campus
          </span>

          <h1 className="mt-5 text-4xl leading-[1.1] font-bold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
            O que sobrou do seu semestre
            <br />
            <span className="text-brand-700">é o começo do semestre de alguém.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-700">
            Livros, jalecos, calculadoras, componentes eletrônicos e móveis que ficariam
            parados numa gaveta. No <strong className="font-semibold">Circula</strong>, eles
            encontram quem está chegando — por doação, troca ou um preço justo entre
            estudantes.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/anunciar" size="lg">
              Anunciar um item
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button to="/explorar" variant="secondary" size="lg">
              <Search className="size-4" aria-hidden="true" />
              Buscar o que preciso
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
