import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterInput, registerSchema } from '@circula/shared';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { register as registerAccount } from '@/features/auth/api';

/** Tela de cadastro. Mesmo padrão do login, com o schema `registerSchema`. */
export function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', course: '' },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);

    try {
      signIn(await registerAccount(values));
      void navigate('/app', { replace: true });
    } catch (error) {
      // 409 = e-mail já cadastrado. Em vez de uma faixa genérica no topo,
      // grudamos a mensagem no campo culpado — o usuário sabe o que corrigir.
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: error.message });
        return;
      }

      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof NetworkError) {
        setFormError('Sem conexão com o servidor. Verifique sua internet.');
      } else {
        setFormError('Não foi possível criar a conta. Tente novamente.');
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Criar conta</h1>
      <p className="mt-1 text-sm text-ink-500">
        Leva menos de um minuto. Depois é só anunciar o que está parado.
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
          label="Nome completo"
          autoComplete="name"
          placeholder="Seu nome"
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Mínimo de 8 caracteres, com ao menos uma letra e um número."
          error={errors.password?.message}
          {...register('password')}
        />

        <TextField
          label="Curso (opcional)"
          placeholder="Ex.: Ciência da Computação"
          error={errors.course?.message}
          {...register('course')}
        />

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
