import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Campos de formulário acessíveis.
 *
 * O trabalho pesado aqui é a ligação entre rótulo, campo e mensagem de erro:
 *
 *  - `useId()` gera um id único e estável (funciona com SSR) — sem ele, dois
 *    campos com o mesmo `id` na mesma tela quebrariam o clique no `<label>`.
 *  - `aria-invalid` marca o campo como inválido para o leitor de tela.
 *  - `aria-describedby` aponta para a mensagem de erro, fazendo o leitor
 *    anunciar *qual* é o problema, não apenas que existe um.
 *
 * Sem esses três, um formulário "com validação" é utilizável só por quem
 * enxerga a borda vermelha.
 */

interface BaseFieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

function FieldShell({ label, error, hint, children }: BaseFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-900">
        {label}
      </label>

      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}

      {/* `role="alert"` faz o leitor de tela anunciar o erro assim que ele
          aparece, sem esperar o usuário navegar até o campo. */}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink-900 transition-colors ' +
  'placeholder:text-ink-500/60 focus:outline-2 focus:outline-offset-0 disabled:opacity-60';

const controlState = (hasError: boolean) =>
  hasError
    ? 'border-red-400 focus:outline-red-500'
    : 'border-slate-300 focus:border-brand-500 focus:outline-brand-500';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function TextField({ label, error, hint, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(aria) => (
        <input
          {...aria}
          {...rest}
          className={cn(controlBase, controlState(Boolean(error)), className)}
        />
      )}
    </FieldShell>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function TextAreaField({ label, error, hint, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(aria) => (
        <textarea
          {...aria}
          {...rest}
          className={cn(controlBase, controlState(Boolean(error)), 'resize-y', className)}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: Array<{ value: string; label: string }>;
};

export function SelectField({ label, error, hint, options, className, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(aria) => (
        <select
          {...aria}
          {...rest}
          className={cn(controlBase, controlState(Boolean(error)), 'appearance-none', className)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
