import { Camera, Handshake, Search } from 'lucide-react';

/**
 * Explicação da proposta de economia circular.
 *
 * Requisito do edital: "uma página de apresentação do projeto que explique a
 * proposta de economia circular no campus".
 *
 * Optei por explicar através do **fluxo de uso** em vez de um texto conceitual
 * sobre sustentabilidade. Três passos concretos comunicam melhor o que a
 * pessoa vai fazer do que um parágrafo sobre o valor do reuso.
 */
const steps = [
  {
    icon: Camera,
    title: 'Anuncie em um minuto',
    description:
      'Tire o item da gaveta: título, categoria, estado de conservação e uma foto. Escolha entre doar, trocar ou vender por um preço justo.',
  },
  {
    icon: Search,
    title: 'Alguém do campus encontra',
    description:
      'A vitrine é organizada por categoria — Livros, Engenharia, Computação e outras. Quem precisa acha sem precisar sair da universidade.',
  },
  {
    icon: Handshake,
    title: 'A entrega é no campus',
    description:
      'Vocês combinam presencialmente. Sem frete, sem intermediário, sem risco de comprar de um desconhecido pela internet.',
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="como-funciona">
      <div className="max-w-2xl">
        <h2
          id="como-funciona"
          className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl"
        >
          Um item, dois semestres, zero desperdício
        </h2>
        <p className="mt-4 text-lg text-ink-700">
          Todo fim de período o mesmo ciclo se repete: veteranos com material parado, calouros
          gastando caro no mesmo material. O Circula fecha esse ciclo dentro do campus.
        </p>
      </div>

      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li
            key={title}
            className="relative rounded-[var(--radius-card)] border border-slate-200 bg-surface p-6"
          >
            <span
              className="absolute top-6 right-6 text-5xl font-bold text-brand-50 select-none"
              aria-hidden="true"
            >
              {index + 1}
            </span>

            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Icon className="size-5" aria-hidden="true" />
            </span>

            <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
