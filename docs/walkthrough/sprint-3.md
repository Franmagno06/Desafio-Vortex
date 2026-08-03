# Sprint 3 — Landing Page desktop

**Data:** 03/08/2026 · **Status:** ✅ concluída

> Relatório técnico de estudo. Ao final há testes manuais de interface e responsividade.

---

## 1. Objetivo da sprint

Entregar a Landing Page que o edital descreve, com dados reais vindos da API:

| Requisito do edital                                    | Status                    |
| ------------------------------------------------------ | ------------------------- |
| Página que explica a proposta de economia circular     | ✅                        |
| Estatísticas do sistema                                | ✅ (reais, não simuladas) |
| Vitrine pública com os últimos itens anunciados        | ✅                        |
| Filtros básicos por categoria                          | ✅ com contagem por chip  |
| CTAs claros para anunciar ou buscar                    | ✅                        |
| Interface polida, feedback de carregamento, transições | 🎁 Bônus ✅               |

---

## 2. O que foi entregue

| Item                                   | Onde                                              |
| -------------------------------------- | ------------------------------------------------- |
| Cache e configuração do TanStack Query | `src/lib/query-client.ts`                         |
| Chamadas HTTP dos anúncios             | `src/features/announcements/api.ts`               |
| Hooks de leitura                       | `src/features/announcements/hooks.ts`             |
| Card do anúncio                        | `src/features/announcements/AnnouncementCard.tsx` |
| Chips de filtro por categoria          | `src/features/announcements/CategoryFilter.tsx`   |
| Primitivos (Button, Badge, Skeleton)   | `src/components/ui/`                              |
| Header e Footer                        | `src/components/layout/`                          |
| Seções da landing                      | `src/pages/landing/`                              |
| Rotas e layout compartilhado           | `src/app/router.tsx`                              |

---

## 3. Conceitos para estudar

### 3.1 Por que TanStack Query em vez de `useState` + `useEffect`

O padrão que quase todo tutorial ensina:

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch(url)
    .then((r) => r.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, [url]);
```

Funciona — e some com quatro problemas quando o app cresce:

1. **Sem cache.** Voltar para uma tela já visitada refaz a requisição e mostra spinner de novo.
2. **Race condition.** Trocar de filtro rápido dispara duas requisições; se a primeira responder
   depois da segunda, a tela mostra o resultado do filtro errado.
3. **Duplicação.** Dois componentes que precisam do mesmo dado fazem duas requisições.
4. **Boilerplate.** Os mesmos três `useState` repetidos em cada tela.

O `useQuery` resolve os quatro. E a chave de cache inclui os filtros:

```ts
queryKey: queryKeys.announcements.list(query);
```

Trocar de categoria vira **outra query, com cache próprio** — voltar para a anterior mostra o
resultado instantaneamente, sem rede.

---

### 3.2 `placeholderData`: a lista não pisca ao trocar de filtro

```ts
placeholderData: (previous) => previous;
```

Sem isso, cada clique num chip substituiria a vitrine inteira por skeletons por alguns
centésimos de segundo. Com isso, a lista anterior fica visível — apenas esmaecida — enquanto
a nova carrega:

```tsx
className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}
```

A diferença entre `isPending` e `isFetching` é o que torna isso possível:

| Estado       | Significado                              | O que a UI faz  |
| ------------ | ---------------------------------------- | --------------- |
| `isPending`  | Nunca houve dado — primeiro carregamento | skeletons       |
| `isFetching` | Já existe dado, mas está revalidando     | esmaece o atual |

---

### 3.3 Não repetir requisição que vai falhar de novo

```ts
retry: (failureCount, error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};
```

Um 404 ou 422 é determinístico: tentar de novo dá o mesmo resultado e só atrasa a mensagem de
erro em alguns segundos. Já falha de rede ou 5xx costuma ser transitória — aí duas novas
tentativas valem a pena. Distinguir os dois casos é a diferença entre "resiliente" e
"teimoso".

---

### 3.4 Quatro estados, não dois

A maior parte das telas mal feitas trata só "carregando" e "pronto". A vitrine trata **quatro**,
e cada um tem desenho próprio:

| Estado     | O que aparece                                     |
| ---------- | ------------------------------------------------- |
| Carregando | 8 skeletons com a forma exata dos cards           |
| Erro       | Ícone, explicação e botão **Tentar de novo**      |
| Vazio      | "Nenhum item nesta categoria" + CTA para anunciar |
| Com dados  | A vitrine                                         |

O estado **vazio** é o mais esquecido e o mais visível numa demo: filtrar por uma categoria
sem itens numa tela que só trata carregando/pronto resulta numa área em branco que parece bug.

---

### 3.5 Skeleton em vez de spinner

O skeleton ocupa **o mesmo espaço** do conteúdo que vai chegar. Duas consequências:

- o layout não salta quando os dados carregam (o que o Google chama de _layout shift_);
- a espera parece menor, porque a pessoa já vê a forma da página.

Detalhe de acessibilidade: os skeletons têm `aria-hidden="true"`. Quem usa leitor de tela não
ganha nada ouvindo "caixa vazia" oito vezes — recebe o aviso pelo `aria-busy` do contêiner.

---

### 3.6 Acessibilidade que veio de escolhas, não de remendo

| Escolha                                   | Por quê                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Chips são `<button>`, não `<div onClick>` | Foco por teclado, Enter/Espaço e anúncio correto vêm de graça                     |
| `aria-pressed` no chip ativo              | A cor sozinha só comunica para quem enxerga                                       |
| `aria-live="polite"` na vitrine           | Trocar o filtro anuncia o novo resultado                                          |
| Card inteiro é **um** `<a>`               | Dois links para o mesmo destino exigiriam dois Tab e seriam anunciados duas vezes |
| `alt=""` na imagem do card                | A imagem é decorativa; o título logo abaixo já descreve o item                    |
| `:focus-visible` com contorno de 2px      | Navegação por teclado sempre visível                                              |
| `prefers-reduced-motion` no CSS base      | Respeita quem desativou animações no sistema                                      |

O ponto: nada disso foi acrescentado depois com uma auditoria. São decisões tomadas na hora de
escrever cada componente — sai mais barato e fica mais correto.

---

### 3.7 Cor comunicando hierarquia

A paleta tem **uma** cor de destaque (âmbar) e ela é reservada para **doação**:

```ts
DOACAO: 'bg-accent-100 text-accent-600 ring-1 ring-accent-400/30',
VENDA:  'bg-brand-50 text-brand-800 ring-1 ring-brand-200',
TROCA:  'bg-slate-100 text-ink-700 ring-1 ring-slate-200',
```

É decisão de produto, não estética: o olho encontra as doações primeiro ao varrer a vitrine, e
doação é o comportamento que a plataforma quer incentivar. Se tudo fosse colorido, nada teria
destaque.

Note também que a informação **nunca depende só da cor**: o selo tem texto ("Doação"), e o
preço mostra a palavra. Quem não distingue cores recebe a mesma informação.

---

### 3.8 Imagens externas quebram — e o card precisa sobreviver

As URLs de imagem são informadas pelo usuário. Link quebrado é questão de tempo:

```tsx
const [imageFailed, setImageFailed] = useState(false);
<img onError={() => setImageFailed(true)} />;
```

Sem esse fallback, o card apareceria rasgado com o ícone de imagem quebrada do navegador. Com
ele, vira um bloco cinza com "Imagem indisponível" — e o resto do card continua útil.

---

### 3.9 Query string: omitir ≠ mandar vazio

```ts
if (value === undefined || value === null || value === '') continue;
```

`?category=` (vazio) **não** é o mesmo que omitir o parâmetro. O primeiro chega à API como
string vazia e é rejeitado pelo enum do Zod com 422. Só entram na URL os filtros realmente
preenchidos — é o que faz o botão "Todos" funcionar limpando o filtro em vez de mandar vazio.

---

### 3.10 Responsividade: uma base, dois layouts

O edital exige adaptação "de uma Landing Page rica no desktop para uma experiência fluida de
aplicativo no mobile". As decisões desta sprint:

| Elemento         | Desktop   | Mobile                                    |
| ---------------- | --------- | ----------------------------------------- |
| Grid de cards    | 4 colunas | 1 coluna                                  |
| Contadores       | 4 colunas | 2 colunas                                 |
| Nav do header    | visível   | oculta (barra inferior chega na Sprint 4) |
| Título principal | 60px      | 36px                                      |

Tudo com prefixos do Tailwind (`sm:`, `lg:`) — sem detectar dispositivo em JavaScript, o que
quebraria ao redimensionar a janela.

---

## 4. 🔬 Testes manuais de interface

### Preparação

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run dev
```

Abra <http://localhost:5173>.

---

### Teste 1 — Os números são reais

Confira os contadores no topo: devem mostrar **26 / 8 / 6 / 28**.

Agora compare com a API:

```powershell
Invoke-RestMethod "http://localhost:4000/api/v1/stats" | ConvertTo-Json
```

✅ **Esperado:** os mesmos números. Não são valores fixos no código — saem de `COUNT` no
PostgreSQL.

---

### Teste 2 — Filtro por categoria

Clique em **Livros**.

✅ **Esperado:** a vitrine passa de 8 para 5 cards, todos livros, e o chip fica verde escuro.

❓ **Observe o comportamento:** ao clicar, a lista antiga **esmaece** em vez de sumir. É o
`placeholderData` evitando o piscar de skeletons.

❓ **Clique em Livros e depois em Todos, e volte para Livros.** A segunda vez é instantânea —
o resultado veio do cache, sem tocar a rede. Confirme na aba **Network** do DevTools.

---

### Teste 3 — Categoria vazia

Todos os chips têm contagem. Se algum mostrar `0`, ele fica **desabilitado** em vez de sumir.

❓ **Por que não esconder?** Porque a lista mudaria de tamanho a cada carregamento e a pessoa
perderia a referência de onde clicar.

---

### Teste 4 — Estado de erro

Derrube só a API (deixe o front rodando):

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Recarregue a página.

✅ **Esperado:** os contadores **somem** (a seção inteira se esconde), e a vitrine mostra
"Não foi possível carregar os anúncios" com botão **Tentar de novo**.

❓ **Repare na diferença de tratamento:** a seção de estatísticas desaparece silenciosamente,
enquanto a vitrine mostra erro explícito. Contadores são enfeite — melhor uma página completa
sem eles do que uma faixa de erro no meio do conteúdo. Já a vitrine é o conteúdo principal:
esconder seria mentir sobre o estado da página.

Suba tudo de novo (`npm run dev`) e clique em **Tentar de novo**.

---

### Teste 5 — Responsividade (requisito obrigatório)

Abra o DevTools (F12) e ative o modo dispositivo (Ctrl+Shift+M). Teste em **375px**:

✅ **Esperado:**

- cards em **1 coluna**
- contadores em **2 colunas**
- links "Explorar / Como funciona" **somem** do header
- título encolhe de 60px para 36px
- **nenhuma barra de rolagem horizontal**

Depois volte para 1280px e confirme 4 colunas.

> A rolagem horizontal é o erro mais comum em responsividade e o mais fácil de notar num
> vídeo. Verifique sempre.

---

### Teste 6 — Navegação por teclado

Clique na barra de endereço e pressione **Tab** repetidamente.

✅ **Esperado:** um contorno verde visível acompanha cada elemento — logo, links, botões,
chips de filtro, cards. Pressione **Enter** num chip: o filtro aplica.

❓ **Isto só funciona** porque os chips são `<button>` de verdade. Com `<div onClick>` eles
seriam invisíveis para o teclado.

---

### Teste 7 — Imagem quebrada

No DevTools → Network, ative **Offline** e recarregue. Ou edite um `imageUrl` no banco para
uma URL inválida.

✅ **Esperado:** o card mostra "Imagem indisponível" num bloco cinza — não o ícone de imagem
quebrada do navegador.

---

### Teste 8 — Qualidade do código

```powershell
npm run typecheck
```

```powershell
npm run lint
```

✅ **Esperado:** silêncio nos dois.

---

## 5. Problemas reais enfrentados

| #   | Sintoma                                                              | Causa raiz                                                | Como foi detectado            | Correção                                      |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| 1   | `tsc`: `AnnouncementQuery` não aceito como `Record<string, unknown>` | Interface declarada não tem index signature               | `npm run typecheck`           | Tipo da chave de cache relaxado para `object` |
| 2   | Extração de texto da página não mostrava cards nem contadores        | Ferramenta de inspeção lendo antes da hidratação do React | Consulta direta ao DOM via JS | Nenhuma — a página estava correta             |

O **item 2** repete o padrão da Sprint 2: a primeira ferramenta disse que a vitrine estava
vazia. Consultando o DOM diretamente, havia 8 cards e os contadores `26/8/6/28` renderizados.
**Quarta vez neste projeto que a evidência inicial engana** — vale mais confirmar por um
segundo caminho do que "corrigir" um problema que não existe.

Sobre o **item 1**: `Record<string, unknown>` exige index signature, que interfaces declaradas
não têm (tipos com `type` têm). Para uma chave de cache, o requisito real é apenas ser
serializável — `object` expressa isso sem forçar a interface a virar um mapa aberto.

---

## 6. Perguntas que a banca pode fazer

<details>
<summary><b>"Por que TanStack Query e não fetch com useEffect?"</b></summary>

Por cache, deduplicação de requisições, proteção contra race condition ao trocar filtros
rápido e eliminação do boilerplate de três `useState` por tela. Na Sprint 5 ele também vira a
base do funcionamento offline, persistindo o cache no navegador.

</details>

<details>
<summary><b>"As estatísticas são reais?"</b></summary>

Sim. O edital pedia simuladas, mas `GET /api/v1/stats` executa `COUNT` no PostgreSQL. Dá para
provar ao vivo: compare os números da tela com a resposta da API.

</details>

<details>
<summary><b>"Como a interface se comporta se a API cair?"</b></summary>

Os contadores desaparecem em silêncio (são complementares) e a vitrine mostra erro explícito
com botão de tentar de novo (é o conteúdo principal). Nenhum dos dois quebra a página.

</details>

<details>
<summary><b>"Como você garante acessibilidade?"</b></summary>

Por escolhas de estrutura, não por auditoria depois: elementos semânticos (`button`, `a`,
`dl`), `aria-pressed` nos filtros, `aria-live` na vitrine, foco visível, `alt=""` em imagem
decorativa e respeito a `prefers-reduced-motion`.

</details>

<details>
<summary><b>"Por que o âmbar só aparece em doação?"</b></summary>

Porque é a única cor de destaque da paleta e doação é o comportamento que queremos incentivar.
Se tudo fosse colorido, nada teria destaque. E a informação nunca depende só da cor — o selo
tem texto.

</details>

---

## 7. Próxima sprint

**Sprint 4 — App mobile:** shell com barra inferior, login/cadastro consumindo `/auth`,
formulário de anúncio com React Hook Form (reusando os mesmos schemas Zod da API) e a tela
"meus anúncios" com editar e excluir.
