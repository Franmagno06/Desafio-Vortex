# Sprint 4 — Aplicativo mobile

**Data:** 04/08/2026 · **Status:** ✅ concluída

> Relatório técnico de estudo. Ao final há testes manuais de todos os fluxos.

---

## 1. Objetivo da sprint

Entregar a "experiência de aplicativo nativo" que o edital pede quando o sistema é acessado
por um dispositivo móvel.

| Requisito do edital                                       | Status                  |
| --------------------------------------------------------- | ----------------------- |
| Usuário autenticado ou identificado                       | ✅ login e cadastro     |
| Formulário para anunciar um item                          | ✅                      |
| Campos: título, descrição, categoria, preço **ou** doação | ✅                      |
| URL de imagem simulada                                    | ✅ com pré-visualização |
| Visualizar os próprios anúncios cadastrados               | ✅ com exclusão         |
| Experiência de app nativo no mobile                       | ✅ barra inferior       |

---

## 2. O que foi entregue

| Item                              | Onde                                      |
| --------------------------------- | ----------------------------------------- |
| Armazenamento do token            | `src/features/auth/storage.ts`            |
| Contexto de sessão                | `src/features/auth/AuthContext.tsx`       |
| Telas de login e cadastro         | `src/pages/auth/`                         |
| Formulário de anúncio             | `src/pages/app/NewAnnouncementPage.tsx`   |
| Meus anúncios (com excluir)       | `src/pages/app/MyAnnouncementsPage.tsx`   |
| Home do app e perfil              | `src/pages/app/`                          |
| Detalhe do anúncio                | `src/pages/AnnouncementDetailPage.tsx`    |
| Vitrine completa com busca        | `src/pages/ExplorePage.tsx`               |
| Barra de navegação inferior       | `src/components/layout/BottomNav.tsx`     |
| Campos acessíveis                 | `src/components/ui/Field.tsx`             |
| Notificações (toast)              | `src/components/ui/Toast.tsx`             |
| Mutações com invalidação de cache | `src/features/announcements/mutations.ts` |
| Proteção de rotas                 | `src/app/router.tsx`                      |

---

## 3. Conceitos para estudar

### 3.1 A regra de negócio virando desenho de interface

Este é **o ponto para mostrar no vídeo**, porque conecta as quatro sprints.

A regra "doação não tem preço" nasceu na Sprint 1 como função pura
(`checkPriceAgainstType`, em `packages/shared`). Ela já valia em dois lugares: no schema Zod
que valida a requisição e no service que trata o PATCH parcial.

Nesta sprint ela ganha um terceiro papel — **desenho de interface**:

```tsx
{isSale ? <TextField label="Preço" … /> : <p>Doações não têm preço…</p>}
```

O campo de preço **não existe** quando o tipo é doação ou troca. A diferença é sutil e
importante: a alternativa comum seria deixar a pessoa preencher o preço, enviar, e mostrar o
erro 422 que a API devolveria. Aqui o estado inválido é **impossível de alcançar** pela
interface.

Repare que isso não substitui a validação do servidor — ela continua lá, porque a API é
pública e não pode confiar no cliente. O que a interface faz é evitar que o usuário chegue a
um erro previsível.

> **Na banca:** _"onde fica a regra de negócio?"_ → num arquivo só, usado em três lugares:
> validação da API, service (PATCH parcial) e formulário do PWA.

---

### 3.2 Entrada × saída de um schema Zod

O `tsc` recusou o `zodResolver` com um erro longo. A causa é real e vale entender:

```ts
priceCents: priceCentsField.default(null);
```

Um schema com `.default()` tem **dois tipos diferentes**:

| Tipo         | Quando                                       | `priceCents`    |
| ------------ | -------------------------------------------- | --------------- |
| `z.input<>`  | antes do parse — o que o formulário preenche | opcional        |
| `z.output<>` | depois do parse — o que o service recebe     | sempre presente |

O React Hook Form precisa dos dois separados, no formato de três genéricos:

```ts
useForm<CreateAnnouncementFormInput, unknown, CreateAnnouncementInput>();
//       ↑ o que o form edita        ↑ ctx    ↑ o que o submit recebe
```

Sem isso o TypeScript não consegue casar `Resolver<entrada>` com `Resolver<saída>` — é
exatamente o mesmo `.default()` que causou o bug de apagar preços na Sprint 1, agora aparecendo
por outro ângulo.

---

### 3.3 Por que a sessão é Context e não TanStack Query

Todo o resto do estado de servidor usa `useQuery`. O token não:

O TanStack Query cuida de **dados do servidor que podem ser revalidados**. O token é outra
coisa — é o estado local que determina **quem** está fazendo as requisições. Colocá-lo numa
query criaria a dependência circular de precisar do token para buscar o token.

Um detalhe de ordem que quase passou batido:

```ts
useMemo(() => {
  setAuthTokenProvider(() => token);
}, [token]);
```

`useMemo` e não `useEffect` de propósito: `useEffect` roda **depois** da renderização, e a
validação do token que acontece logo abaixo sairia sem o cabeçalho `Authorization`.

---

### 3.4 Injeção de dependência para evitar ciclo de importação

O `api-client` precisa do token, mas **não importa** o módulo de storage:

```ts
let getAuthToken: TokenProvider = () => null;
export function setAuthTokenProvider(provider: TokenProvider) { … }
```

Se importasse, teríamos `api-client → storage` e `auth → api-client`. No dia em que o storage
precisasse reportar algo pela API, o ciclo fecharia e o bundler entregaria `undefined` em um
dos módulos — um bug difícil de diagnosticar. Injetar mantém a seta em um sentido só.

É o mesmo princípio do repositório da Sprint 1, aplicado no frontend.

---

### 3.5 O bug de "deslogou sozinho ao dar F5"

Trecho do `ProtectedRoute`:

```tsx
if (isLoading) return <Spinner />;
if (!isAuthenticated) return <Navigate to="/entrar" … />;
```

A ordem importa e é a origem de um dos bugs mais comuns em SPA com sessão. No primeiro
carregamento existem **três** estados, não dois:

1. validando o token guardado (`isLoading`)
2. autenticado
3. não autenticado

Se o guard tratasse só 2 e 3, todo F5 numa rota protegida redirecionaria para o login — porque
no instante da primeira renderização o `user` ainda é `null`, mesmo com um token válido no
`localStorage`. O usuário veria a sessão "cair" a cada recarregamento.

O mesmo raciocínio vale no `Header`: enquanto carrega, ele não mostra nem "Entrar" nem o
avatar. Mostrar "Entrar" e trocar por avatar meio segundo depois passa a impressão de que o
app deslogou.

---

### 3.6 Invalidação de cache: o que o TanStack Query não adivinha

Depois de criar um anúncio, a vitrine, "meus anúncios", as estatísticas e a contagem dos chips
ficam desatualizados. O React Query **não sabe** que essas listas dependem do que acabou de ser
criado:

```ts
void queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }); // ['announcements']
void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
```

Invalidar pela **raiz** `['announcements']` marca todas as listagens de uma vez, com qualquer
combinação de filtros — é o motivo de as chaves serem hierárquicas
(`['announcements', 'list', filtros]`). O React Query refaz só as que estão na tela; as demais
são revalidadas quando alguém voltar a elas.

Foi verificado na prática: o anúncio criado apareceu em "meus anúncios" sem recarregar a
página.

---

### 3.7 Debounce na busca

```ts
const debouncedSearch = useDebouncedValue(search, 400);
```

Sem isso, digitar "arduino" dispara **sete** requisições — uma por letra. Pior que o
desperdício: a resposta da terceira pode chegar depois da sétima e sobrescrever o resultado
correto (_race condition_).

O mecanismo é o `clearTimeout` no cleanup do `useEffect`: cada tecla cancela o timer anterior,
então só a última pausa real de 400ms chega ao fim.

---

### 3.8 A barra inferior e a ergonomia do polegar

A `BottomNav` fica embaixo por um motivo físico: numa tela de 6 polegadas, o topo está fora do
alcance do polegar de quem segura o aparelho com uma mão. É a mesma razão pela qual todo app
nativo coloca a navegação principal ali.

Dois detalhes:

```tsx
className = '… pb-[env(safe-area-inset-bottom)] md:hidden';
```

- `env(safe-area-inset-bottom)` impede que os botões fiquem embaixo da barra de gestos do
  iPhone quando o PWA roda em tela cheia — só aparece quando instalado, o que torna fácil
  esquecer no navegador.
- `md:hidden` esconde no desktop, onde o header já resolve a navegação.

E o `end` no `NavLink` da raiz:

```tsx
{ to: '/app', label: 'Início', end: true }
```

Sem `end`, `/app` casaria também com `/app/anunciar` e dois itens acenderiam ao mesmo tempo.

---

### 3.9 Campos acessíveis exigem três atributos ligados

`Field.tsx` conecta rótulo, campo e erro:

```tsx
const id = useId();
<label htmlFor={id}>          // clicar no rótulo foca o campo
<input id={id}
       aria-invalid={!!error}          // "este campo está inválido"
       aria-describedby={errorId} />   // "e o problema é ESTE"
<p id={errorId} role="alert">          // anunciado assim que aparece
```

Sem os três, um formulário "com validação" é utilizável apenas por quem enxerga a borda
vermelha. O `useId()` do React 19 garante ids únicos mesmo com dois campos iguais na mesma
tela.

---

### 3.10 Autocomplete correto no gerenciador de senhas

```tsx
<TextField autoComplete="current-password" />  // login
<TextField autoComplete="new-password" />      // cadastro
```

Parece detalhe, mas muda o comportamento do navegador: `current-password` faz oferecer a senha
salva; `new-password` faz sugerir uma senha forte nova. Trocar os dois leva o gerenciador a
sugerir senha nova na tela de login.

---

## 4. 🔬 Testes manuais dos fluxos

### Preparação

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run dev
```

Abra <http://localhost:5173> e **ative o modo dispositivo** no DevTools (Ctrl+Shift+M, 375px).

---

### Teste 1 — Login

Vá em **Entrar** e use a conta de demonstração exibida na própria tela:
`ana.lima@edu.unifor.br` / `circula2026`.

✅ **Esperado:** vai para `/app`, com "Olá, Ana 👋" e a **barra inferior** com Início,
Explorar, Anunciar e Perfil.

❓ **Confira o token:** DevTools → Application → Local Storage → `circula:token`. Cole o valor
em jwt.io e veja o payload — é o mesmo aprendizado da Sprint 2.

---

### Teste 2 — A sessão sobrevive ao F5

Com o app aberto em `/app/meus-anuncios`, pressione **F5**.

✅ **Esperado:** um spinner rápido e você **continua logado** na mesma tela.

❓ **Por que isso é um teste:** se o `ProtectedRoute` não tratasse o estado "validando", você
seria jogado para o login a cada recarregamento. É o bug descrito na seção 3.5.

---

### Teste 3 — Rota protegida sem sessão

Apague o token (Application → Local Storage → botão direito → Delete) e acesse
<http://localhost:5173/app/meus-anuncios>.

✅ **Esperado:** redireciona para `/entrar`.

❓ **Agora faça login:** você volta para `/app/meus-anuncios`, **não** para a home. O destino
original foi guardado em `location.state`.

---

### Teste 4 — A regra do preço na interface ⭐

Vá em **Anunciar**. O tipo começa em **Doação**.

✅ **Esperado:** **não existe campo de preço**, e sim o aviso "Doações não têm preço — é o
coração da economia circular do campus".

Mude "Como você quer oferecer?" para **Venda**.

✅ **Esperado:** o campo **Preço** aparece.

Volte para **Doação**.

✅ **Esperado:** o campo some e qualquer valor digitado é descartado.

❓ **Este é o teste mais importante da sprint.** A mesma função (`checkPriceAgainstType`) que
valida na API está governando o que a interface mostra. O estado inválido é inalcançável.

---

### Teste 5 — Publicar um anúncio

Preencha título, descrição (mín. 20 caracteres) e cole uma URL de imagem, por exemplo:

```
https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800
```

✅ **Esperado:** a **pré-visualização** da imagem aparece abaixo do campo. Ao publicar: toast
verde "Anúncio publicado!" e redirecionamento para o detalhe.

❓ **Teste o fallback:** troque a URL por `https://exemplo.com/nao-existe.jpg`. A
pré-visualização vira "Não conseguimos carregar esta imagem" — sem quebrar o layout.

---

### Teste 6 — Validação dos campos

Tente publicar com o título "ab" e descrição curta.

✅ **Esperado:** mensagens **em cada campo**, em vermelho, vindas do mesmo schema Zod que a API
usa. O formulário nem chega a enviar.

---

### Teste 7 — Meus anúncios e exclusão

Vá em **Perfil → Meus anúncios**.

✅ **Esperado:** apenas os anúncios da Ana (4 dos 29 do banco), incluindo o que você acabou de
criar — sem precisar recarregar a página.

Clique na lixeira de um anúncio e confirme.

✅ **Esperado:** confirmação, toast "Anúncio excluído." e o item some da lista.

❓ **Prove que sumiu da vitrine também:**

```powershell
Invoke-RestMethod "http://localhost:4000/api/v1/announcements?q=parte-do-titulo"
```

Deve retornar `total: 0`. E no Prisma Studio a linha continua lá com `deletedAt` preenchido —
exclusão lógica funcionando ponta a ponta.

---

### Teste 8 — Busca com debounce

Em **Explorar**, digite "arduino" devagar e observe a aba **Network** do DevTools.

✅ **Esperado:** **uma** requisição, disparada ~400ms depois da última tecla — não uma por
letra.

---

### Teste 9 — "Meus anúncios" é decidido pelo servidor

Na aba Network, veja a chamada de `/announcements/mine`.

✅ **Esperado:** a URL **não** contém o id do usuário. Quem decide de quem é a lista é o
servidor, a partir do JWT. Se dependesse de um parâmetro, bastaria trocá-lo para ver a lista
de outra pessoa.

---

### Teste 10 — Logout limpa o cache

Vá em **Perfil → Sair da conta**, depois faça login com **outra** conta
(`carlos.souza@edu.unifor.br` / `circula2026`) e abra "Meus anúncios".

✅ **Esperado:** os anúncios do Carlos, nunca os da Ana. O `queryClient.clear()` no logout
existe exatamente para isso.

---

### Teste 11 — Navegação por teclado no formulário

Na tela de anunciar, navegue só com **Tab** e **Enter**.

✅ **Esperado:** foco visível em cada campo, rótulos clicáveis e mensagens de erro associadas.

---

## 5. Problemas reais enfrentados

| #   | Sintoma                                  | Causa raiz                                        | Como foi detectado  | Correção                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| 1   | `zodResolver` não tipava                 | `.default()` faz `z.input` divergir de `z.output` | `npm run typecheck` | `useForm<Entrada, unknown, Saída>` + tipo `CreateAnnouncementFormInput` exportado |
| 2   | `data` possivelmente `undefined` na home | `isPending` sozinho não estreita o tipo           | `npm run typecheck` | `isPending                                                                        |     | !data` |
| 3   | `Button` importado sem uso               | Sobra de refatoração                              | `noUnusedLocals`    | Import removido                                                                   |

O **item 1** é a mesma armadilha do `.default()` que causou o bug de apagar preços na Sprint 1,
vista de outro ângulo. Lá o problema era em tempo de execução (o default sendo aplicado quando
não devia); aqui é em tempo de compilação (entrada e saída sendo tipos diferentes). Vale como
lembrete de que `.default()` num schema tem consequências além do valor padrão.

---

## 6. Perguntas que a banca pode fazer

<details>
<summary><b>"Onde o token fica guardado e por quê?"</b></summary>

No `localStorage`, porque o PWA e a API vivem em domínios diferentes (Vercel e Render) e cookie
cross-site exigiria `SameSite=None; Secure`, CORS com credenciais e sessão no servidor. A troca
consciente: ficamos vulneráveis a XSS, mas imunes a CSRF por construção. Está registrado no
ADR 010.

</details>

<details>
<summary><b>"Como o app sabe que continuo logado depois de fechar o navegador?"</b></summary>

O token fica no `localStorage`. Ao abrir, o `AuthProvider` chama `/auth/me` para validá-lo: se
responder 401, a sessão é descartada; se for falha de rede, a sessão é mantida — porque estar
sem internet não prova que o token expirou. Esse detalhe importa para o offline da Sprint 5.

</details>

<details>
<summary><b>"O usuário consegue criar uma doação com preço?"</b></summary>

Pela interface, não: o campo não existe quando o tipo é doação. E mesmo se alguém montasse a
requisição na mão, a API recusa com 422 — a mesma função de regra roda nos dois lados.

</details>

<details>
<summary><b>"Como a lista atualiza depois de criar um anúncio?"</b></summary>

Por invalidação de cache do TanStack Query. Invalidamos a raiz `['announcements']`, o que marca
todas as listagens (com qualquer filtro) como obsoletas de uma vez, mais `/stats` e
`/categories`, que dependem da contagem.

</details>

<details>
<summary><b>"Por que a sessão não usa TanStack Query como o resto?"</b></summary>

Porque o token não é dado do servidor revalidável — é o estado local que determina quem faz as
requisições. Numa query, criaria a dependência circular de precisar do token para buscar o
token.

</details>

---

## 7. Próxima sprint

**Sprint 5 — PWA:** manifesto, ícones, Service Worker autoral com estratégias de cache,
funcionamento offline dos dados já carregados e o prompt de instalação na tela inicial. É a
sprint que fecha o último requisito **obrigatório** do edital.
