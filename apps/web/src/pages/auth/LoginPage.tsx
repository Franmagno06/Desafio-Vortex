import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput, loginSchema } from '@circula/shared';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { login } from '@/features/auth/api';

/**
 * Tela de login.
 *
 * O `zodResolver` conecta o React Hook Form ao **mesmo schema que a API usa**
 * para validar. Consequência prática: é impossível o formulário aceitar algo
 * que o servidor recusaria — a regra existe num arquivo só
 * (`packages/shared/src/schemas/auth.ts`).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  /** Erro vindo do servidor (401, rede) — diferente dos erros de campo. */
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  /**
   * Para onde ir depois de entrar.
   *
   * Se o usuário caiu aqui por tentar acessar uma rota protegida, o
   * `ProtectedRoute` guardou o destino original em `location.state`. Voltamos
   * para lá em vez de jogar todo mundo na home.
   */
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app';

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    try {
      signIn(await login(values));
      void navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof NetworkError) {
        setFormError('Sem conexão com o servidor. Verifique sua internet.');
      } else {
        setFormError('Não foi possível entrar. Tente novamente.');
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Entrar</h1>
      <p className="mt-1 text-sm text-ink-500">
        Acesse para anunciar seus itens e acompanhar seus anúncios.
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-8 space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="seu.nome@edu.unifor.br"
          error={errors.email?.message}
          {...register('email')}
        />

        <TextField
          label="Senha"
          type="password"
          // `current-password` faz o gerenciador de senhas do navegador
          // oferecer a senha salva — e não sugerir uma nova, como no cadastro.
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-brand-700 hover:underline">
          Criar conta
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-surface-muted p-4">
        <p className="text-xs font-semibold text-ink-700">Conta de demonstração</p>
        <p className="mt-1 text-xs text-ink-500">
          <code>ana.lima@edu.unifor.br</code> · senha <code>circula2026</code>
        </p>
      </div>
    </div>
  );
}
