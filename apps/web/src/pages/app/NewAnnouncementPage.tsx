import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageOff } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_META,
  type CreateAnnouncementFormInput,
  type CreateAnnouncementInput,
  ITEM_CONDITIONS,
  ITEM_CONDITION_META,
  ITEM_TYPES,
  ITEM_TYPE_META,
  createAnnouncementSchema,
  parsePriceToCents,
  toOptions,
} from '@circula/shared';

import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ApiError, NetworkError } from '@/lib/api-client';
import { useCreateAnnouncement } from '@/features/announcements/mutations';

/**
 * Formulário de anúncio — o fluxo principal do app mobile.
 *
 * Campos exigidos pelo edital: título, descrição, categoria, preço **ou**
 * indicação de doação, e uma URL de imagem simulada.
 *
 * O detalhe mais interessante é o campo de preço: ele **desaparece** quando o
 * tipo é doação ou troca. A regra de negócio (`checkPriceAgainstType`, do
 * pacote compartilhado) é a mesma que a API aplica — mas aqui ela vira desenho
 * de interface: em vez de deixar a pessoa preencher um preço para depois levar
 * um 422, o campo simplesmente não existe naquele contexto.
 */
export function NewAnnouncementPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutateAsync, isPending } = useCreateAnnouncement();

  const [formError, setFormError] = useState<string | null>(null);
  const [priceText, setPriceText] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    // Três genéricos: <entrada do formulário, contexto, saída já parseada>.
    // Necessário porque o `.default(null)` do preço faz entrada e saída
    // divergirem — sem isso o `zodResolver` não tipa.
  } = useForm<CreateAnnouncementFormInput, unknown, CreateAnnouncementInput>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'LIVROS',
      condition: 'SEMINOVO',
      type: 'DOACAO',
      priceCents: null,
      imageUrl: '',
    },
  });

  // `watch` re-renderiza quando estes campos mudam — é o que permite mostrar
  // ou esconder o preço e atualizar a pré-visualização da imagem.
  const type = watch('type');
  const imageUrl = watch('imageUrl');
  const isSale = type === 'VENDA';

  /** Converte "19,90" digitado pela pessoa em 1990 centavos. */
  function handlePriceChange(value: string) {
    setPriceText(value);
    setValue('priceCents', value.trim() === '' ? null : parsePriceToCents(value), {
      shouldValidate: true,
    });
  }

  async function onSubmit(values: CreateAnnouncementInput) {
    setFormError(null);

    try {
      const created = await mutateAsync(values);
      toast.success('Anúncio publicado!');
      void navigate(`/anuncio/${created.id}`, { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof NetworkError
            ? 'Sem conexão. Seu anúncio não foi publicado.'
            : 'Não foi possível publicar. Tente novamente.';

      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Anunciar um item</h1>
      <p className="mt-1 text-sm text-ink-500">
        Tire da gaveta o que ainda serve para alguém do campus.
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-7 space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        <TextField
          label="Título"
          placeholder="Ex.: Cálculo Volume 1 — Stewart"
          error={errors.title?.message}
          {...register('title')}
        />

        <TextAreaField
          label="Descrição"
          rows={4}
          placeholder="Estado de conservação, o que acompanha, onde retirar…"
          hint="Mínimo de 20 caracteres."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            options={toOptions(CATEGORIES, CATEGORY_META).map(({ value, label }) => ({
              value,
              label,
            }))}
            error={errors.category?.message}
            {...register('category')}
          />

          <SelectField
            label="Estado de conservação"
            options={toOptions(ITEM_CONDITIONS, ITEM_CONDITION_META).map(({ value, label }) => ({
              value,
              label,
            }))}
            error={errors.condition?.message}
            {...register('condition')}
          />
        </div>

        <SelectField
          label="Como você quer oferecer?"
          options={toOptions(ITEM_TYPES, ITEM_TYPE_META).map(({ value, label }) => ({
            value,
            label,
          }))}
          error={errors.type?.message}
          {...register('type', {
            // Ao sair de VENDA, zera o preço no formulário e no estado do
            // campo. Sem isso, um valor digitado antes continuaria no payload
            // e a API recusaria com "doações não podem ter preço".
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
              if (event.target.value !== 'VENDA') {
                setPriceText('');
                setValue('priceCents', null, { shouldValidate: true });
              }
            },
          })}
        />

        {isSale ? (
          <TextField
            label="Preço"
            inputMode="decimal"
            placeholder="0,00"
            hint="Em reais. Ex.: 89,90"
            value={priceText}
            onChange={(event) => {
              handlePriceChange(event.target.value);
            }}
            error={errors.priceCents?.message}
          />
        ) : (
          <p className="rounded-xl border border-accent-400/40 bg-accent-100 px-4 py-3 text-sm text-accent-600">
            {type === 'DOACAO'
              ? 'Doações não têm preço — é o coração da economia circular do campus.'
              : 'Trocas não têm preço: combinem o que faz sentido para os dois.'}
          </p>
        )}

        <TextField
          label="URL da imagem"
          type="url"
          placeholder="https://…"
          hint="Cole o link de uma foto do item."
          error={errors.imageUrl?.message}
          {...register('imageUrl')}
        />

        <ImagePreview url={imageUrl} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" size="lg" disabled={isPending} className="flex-1">
            {isPending ? 'Publicando…' : 'Publicar anúncio'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Pré-visualização da imagem.
 *
 * Vale o esforço porque a URL é digitada à mão: ver a foto antes de publicar
 * evita anúncio com link quebrado na vitrine. O `key={url}` força o React a
 * recriar o `<img>` quando a URL muda — sem ele, o estado de erro de uma URL
 * anterior continuaria valendo para a nova.
 */
function ImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || !/^https?:\/\//.test(url)) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {failed ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-ink-500">
          <ImageOff className="size-8" aria-hidden="true" />
          <p className="text-sm">Não conseguimos carregar esta imagem</p>
        </div>
      ) : (
        <img
          key={url}
          src={url}
          alt="Pré-visualização do item anunciado"
          onError={() => {
            setFailed(true);
          }}
          className="aspect-[4/3] w-full object-cover"
        />
      )}
    </div>
  );
}
