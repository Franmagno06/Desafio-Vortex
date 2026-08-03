import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * Botão do design system.
 *
 * Aceita `to` para virar um link de navegação mantendo a mesma aparência.
 * Isso importa para acessibilidade: um "botão" que navega deve ser um `<a>`,
 * para funcionar com Ctrl+clique, abrir em nova aba e ser anunciado como link
 * por leitores de tela.
 */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 hover:shadow-md active:scale-[0.98]',
  secondary:
    'border border-brand-200 bg-white text-brand-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.98]',
  ghost: 'text-ink-700 hover:bg-slate-100 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

interface ButtonProps
  extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  to?: undefined;
}

interface LinkProps extends BaseProps {
  /** Rota interna. Torna o componente um `<Link>` em vez de `<button>`. */
  to: string;
}

export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', size = 'md', className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, to: _t, ...rest } = props;

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
