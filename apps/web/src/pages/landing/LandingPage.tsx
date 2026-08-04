import { Hero } from './Hero';
import { StatsSection } from './StatsSection';
import { HowItWorks } from './HowItWorks';
import { Showcase } from './Showcase';
import { Button } from '@/components/ui/Button';

/**
 * Landing Page — a experiência de desktop exigida pelo edital.
 *
 * A ordem das seções segue a jornada de quem chega sem conhecer o projeto:
 * o que é (Hero) → é usado de verdade? (Stats) → como funciona → o que tem
 * disponível (Showcase) → decide (CTA final).
 */
export function LandingPage() {
  return (
    <>
      <Hero />

      <div className="space-y-20 pb-8">
        <StatsSection />
        <HowItWorks />
        <Showcase />
        <FinalCta />
      </div>
    </>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-brand-800 px-6 py-14 text-center sm:px-12">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Tem algo parado que ainda serve?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-brand-100">
          Um livro na estante, um jaleco no armário, uma calculadora na gaveta. Para você é espaço
          ocupado; para um calouro, é o semestre que cabe no orçamento.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/anunciar" size="lg" variant="secondary">
            Anunciar meu primeiro item
          </Button>
          <Button to="/explorar" size="lg" variant="ghostOnDark">
            Explorar a vitrine
          </Button>
        </div>
      </div>
    </section>
  );
}
