# Sprint 5 — PWA: manifesto, Service Worker e offline

**Data:** 04/08/2026 · **Status:** ✅ concluída

> Relatório técnico de estudo. Esta é a sprint que fecha o **último requisito
> obrigatório** do edital, e o Service Worker é o trecho que a banca vai pedir para
> você explicar no vídeo (minuto 3:00–5:00).

---

## 1. Objetivo da sprint

| Requisito do edital                                          | Tipo            | Status |
| ------------------------------------------------------------ | --------------- | ------ |
| Manifesto de aplicativo web válido (`manifest.json`)         | **Obrigatório** | ✅     |
| Service Worker básico que permita "instalar" na tela inicial | **Obrigatório** | ✅     |
| Estratégias de cache para visualização offline               | 🎁 Bônus        | ✅     |

**Com isso, todos os requisitos obrigatórios do edital estão fechados.**

---

## 2. O que foi entregue

| Item                                        | Onde                                  |
| ------------------------------------------- | ------------------------------------- |
| Service Worker autoral com 6 estratégias    | `apps/web/src/sw.ts`                  |
| Manifesto, ícones e atalhos                 | `apps/web/vite.config.ts`             |
| Geração dos ícones (comum + maskable)       | `apps/web/scripts/generate-icons.mjs` |
| Prompt de instalação, atualização e offline | `apps/web/src/features/pwa/`          |
| Persistência do cache de dados              | `apps/web/src/lib/query-persister.ts` |
| Estados de lista (incluindo o "pausado")    | `apps/web/src/lib/query-state.ts`     |

---

## 3. Conceitos para estudar

### 3.1 O que é um Service Worker

Um script que roda **numa thread separada da página** e age como um **proxy entre o
app e a rede**. Toda requisição passa por ele antes de sair, e ele decide se responde
do cache, vai à rede, ou os dois.

É isso — e só isso — que permite a aplicação abrir sem internet.

Três detalhes que valem saber:

- **Ciclo de vida:** `install` → `activate` → `fetch`. Um SW novo fica "esperando"
  enquanto o antigo controla as abas abertas.
- **Escopo global diferente:** dentro do SW não existe `window` nem `document`. O
  global é `self` (`ServiceWorkerGlobalScope`). Por isso o arquivo começa com
  `declare const self: ServiceWorkerGlobalScope`.
- **Só funciona em HTTPS** (ou `localhost`). Um proxy sobre todo o tráfego seria uma
  arma em conexão insegura.

---

### 3.2 Por que escrevemos o SW à mão

O `vite-plugin-pwa` oferece dois modos:

| Modo             | O que faz                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- |
| `generateSW`     | Gera o SW inteiro a partir de opções. Rápido, mas caixa-preta.                      |
| `injectManifest` | **Nós** escrevemos `src/sw.ts`; o plugin só injeta a lista de arquivos do precache. |

Usamos `injectManifest`. A justificativa é direta: o edital pede que o candidato
explique "a lógica do Service Worker", e **só dá para explicar o que se escreveu**.

---

### 3.3 As seis estratégias, e por que cada uma

Esta tabela é o resumo para o vídeo:

| O quê                    | Estratégia                         | Por quê                                                |
| ------------------------ | ---------------------------------- | ------------------------------------------------------ |
| App shell (JS/CSS/HTML)  | **Precache**                       | São eles que fazem o app **abrir** offline             |
| Navegação (rotas da SPA) | **NavigationRoute** → `index.html` | Qualquer rota é servida pelo mesmo HTML                |
| Listagens da API         | **Stale-While-Revalidate**         | Resposta instantânea + atualiza em segundo plano       |
| `/auth/*`                | **Network-First**                  | Cache puro manteria alguém "logado" com token expirado |
| Imagens                  | **Cache-First**                    | A mesma URL sempre devolve a mesma imagem              |
| `POST` de anúncio        | **Background Sync**                | Reenvia sozinho quando a conexão voltar                |

**Stale-While-Revalidate** é a mais importante, e responde ao bônus do edital:

```
1ª visita  → rede (nada em cache ainda)
2ª visita  → cache instantâneo + atualização em background
sem rede   → cache, e a vitrine continua navegável
```

**Background Sync** é a mais interessante: se a pessoa toca em "Publicar" sem rede, a
requisição vai para uma fila no IndexedDB e o **navegador a reenvia sozinho** quando a
conexão voltar — mesmo que o app já tenha sido fechado. É o que separa "site que
quebra offline" de "aplicativo".

---

### 3.4 `CacheableResponsePlugin`: não guardar erro no cache

```ts
new CacheableResponsePlugin({ statuses: [0, 200] });
```

Sem isso, uma resposta 500 entraria no cache e seria servida como se fosse válida —
possivelmente por dias. O `0` cobre respostas opacas (recursos de outra origem, como as
imagens do Unsplash).

---

### 3.5 Duas camadas de cache, e por que ambas

| Camada                   | Guarda                    | Arquivo                      |
| ------------------------ | ------------------------- | ---------------------------- |
| Service Worker           | **respostas HTTP**        | `src/sw.ts`                  |
| Persister do React Query | **estado do React Query** | `src/lib/query-persister.ts` |

São complementares:

- **só o SW** → ao reabrir offline, o React Query começa vazio, dispara as queries e
  elas são atendidas pelo cache do SW. Funciona, mas a tela pisca skeletons antes.
- **com o persister** → os dados aparecem já na primeira renderização, sem
  carregamento nenhum.

O persister exclui de propósito as queries de autenticação: elas são revalidadas no
boot, e persisti-las deixaria dados do usuário legíveis no disco depois do logout.

> ⚠️ Detalhe que quase passou: o `gcTime` precisou subir de 5 minutos para 24 horas.
> Com `gcTime` curto, o React Query descarta a query da memória antes de o app
> reabrir — e não sobra o que persistir.

---

### 3.6 Ícone `maskable`: por que são duas artes

O Android **recorta** o ícone na forma do sistema (círculo, squircle, gota). Se a arte
ocupar as bordas, o recorte come parte dela.

Por isso `generate-icons.mjs` produz duas versões da mesma folha:

| Propósito  | Arte ocupa    | Onde aparece              |
| ---------- | ------------- | ------------------------- |
| `any`      | 62% do canvas | aba do navegador, desktop |
| `maskable` | 44% do canvas | tela inicial do Android   |

Usar a mesma imagem para os dois é o erro clássico — no Android o ícone aparece com as
pontas cortadas.

O iOS ignora o manifesto para isso e exige `<link rel="apple-touch-icon">` no HTML.
Sem essa tag, o iPhone usa **um print da página** como ícone.

---

### 3.7 O prompt de instalação

```ts
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // impede o banner padrão do Chrome
  setInstallEvent(event); // guarda para o NOSSO botão
});
```

O `preventDefault()` bloqueia o banner do navegador para podermos pedir a instalação
num momento melhor, a partir de um botão nosso. O evento só pode ser usado **uma vez**.

**O Safari não implementa isso.** No iPhone a instalação é manual (Compartilhar →
Adicionar à Tela de Início), então o app detecta iOS e mostra as instruções — sem essa
checagem, usuários de iPhone nunca descobririam como instalar.

---

### 3.8 O bug mais instrutivo da sprint: o quarto estado de uma query

Testando com a API fora do ar, a tela de Explorar ficava **presa em skeletons para
sempre** — sem mensagem, sem erro, sem botão. E o "Tentar de novo", quando cheguei a
mostrá-lo, **não fazia nada**.

A investigação revelou algo que eu não sabia: o TanStack Query tem **quatro** estados,
não três.

```
status: 'pending' + fetchStatus: 'fetching'  → carregando de verdade
status: 'pending' + fetchStatus: 'paused'    → PAUSADO, esperando rede
status: 'error'                              → falhou
status: 'success'                            → tem dado
```

Quando a primeira requisição falha por erro de rede, o React Query **pausa** em vez de
reportar erro: ele assume que não adianta insistir sem conexão e vai retomar sozinho
quando ela voltar. Nesse estado ele **não dispara erro, não tenta de novo e ignora
`refetch()`**.

O impasse: quando o que caiu foi o **servidor** e não a rede, o navegador nunca fica
offline, nunca dispara o evento `online`, e a query fica pausada **indefinidamente**.

A correção teve três partes:

1. **`networkMode: 'always'`** no `QueryClient`. O pressuposto "sem rede, não adianta
   tentar" é falso aqui: quem responde offline nesta arquitetura é o **Service
   Worker**, pelo cache. Uma requisição sem internet pode perfeitamente ter sucesso.
2. **Tratar o estado `paused` na interface** (`resolveListState`), com mensagem e
   botão — nunca skeleton.
3. **`resetQueries` no botão**, não `refetch()`. Uma query pausada ignora o refetch
   porque tenta _continuar_ um retryer bloqueado; `resetQueries` a devolve ao estado
   inicial e começa uma busca nova.

> A divisão de responsabilidades ficou explícita:
> **Service Worker** serve o cache · **React Query** busca e propaga erro ·
> **interface** mostra a mensagem e o caminho de volta.

---

## 4. 🔬 Testes manuais do PWA

### Preparação

O Service Worker precisa do **build de produção** para ser exercitado de verdade:

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run build --workspace @circula/web
```

```powershell
npm run preview --workspace @circula/web
```

Abra <http://localhost:4173> (a API precisa estar rodando em outro terminal).

---

### Teste 1 — O Service Worker registrou?

DevTools → **Application** → **Service Workers**.

✅ **Esperado:** um worker com status **activated and is running**, escopo
`http://localhost:4173/`.

---

### Teste 2 — O que está em cache

DevTools → **Application** → **Cache Storage**.

✅ **Esperado:** `workbox-precache-v2...` com ~15 arquivos. Navegue pela vitrine e
aparecerá também **`circula-api`**; role até ver imagens e aparecerá
**`circula-images`**.

❓ **Clique em `circula-api`:** você verá as URLs exatas das listagens. É esse conteúdo
que sustenta o modo offline.

---

### Teste 3 — O manifesto

DevTools → **Application** → **Manifest**.

✅ **Esperado:** nome "Circula — Economia circular do campus", `start_url` `/app`,
`display` **standalone**, 4 ícones (2 deles maskable) e 2 atalhos.

---

### Teste 4 — Instalar o app ⭐

No Chrome, um ícone de instalação aparece na barra de endereço — ou use o banner
"Instale o Circula" do próprio app.

✅ **Esperado:** o app abre **em janela própria, sem barra de endereço**. É a prova de
`display: standalone`.

> Este é o teste que o edital pede para mostrar no vídeo ("instalar na tela inicial").

---

### Teste 5 — Funcionar offline ⭐⭐

Navegue pela vitrine primeiro (para popular o cache). Depois **derrube a API**:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Recarregue a página inicial.

✅ **Esperado:** a landing carrega **completa** — 8 cards, contadores e chips de
categoria — sem nenhuma mensagem de erro. Verificado: a página funcionou com a API
100% fora do ar.

❓ **Agora entre em `/explorar`** (uma consulta que não estava em cache):

✅ **Esperado:** "Sem conexão para buscar" com botão **Tentar de novo** — e **não**
skeletons infinitos. Religue a API e clique no botão: os 12 cards voltam.

---

### Teste 6 — Modo avião de verdade

DevTools → **Network** → marque **Offline**. Recarregue.

✅ **Esperado:** o app abre normalmente e aparece a faixa
**"Você está offline. Os itens já carregados continuam visíveis."**

---

### Teste 7 — Rota profunda offline

Ainda offline, digite `http://localhost:4173/app/perfil` na barra de endereço.

✅ **Esperado:** a página abre. É o `NavigationRoute` devolvendo o `index.html` do
precache para qualquer rota da SPA. Sem ele, só a raiz funcionaria offline.

---

### Teste 8 — No celular (o teste mais convincente para o vídeo)

Com `npm run dev`, o Vite imprime uma URL **Network:** (`http://192.168.x.x:5173`).
Abra essa URL no celular, na mesma rede.

✅ **Esperado:** o app funciona, e o Chrome do Android oferece "Adicionar à tela
inicial". Instale e abra pelo ícone: sem barra de endereço, com a barra de status na
cor do tema.

> O CORS e o cliente HTTP já foram preparados para isso: a API aceita a faixa de rede
> local em desenvolvimento, e o front troca `localhost` pelo host da página.

---

### Teste 9 — Auditoria do Lighthouse

DevTools → **Lighthouse** → marque _Performance_ e _Accessibility_ → **Analyze**.

Rode sempre no **preview** (build de produção); em modo dev os números não valem.

---

### Teste 10 — Qualidade do código

```powershell
npm run lint
```

```powershell
npm test
```

✅ **Esperado:** silêncio no lint e **67 testes** passando.

---

## 5. Problemas reais enfrentados

| #   | Sintoma                                    | Causa raiz                                                           | Como foi detectado               | Correção                                        |
| --- | ------------------------------------------ | -------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| 1   | `/explorar` presa em skeletons para sempre | React Query **pausa** a query em falha de rede, sem erro e sem retry | Teste com a API fora do ar       | `networkMode: 'always'` + tratar `paused` na UI |
| 2   | Botão "Tentar de novo" não fazia nada      | Query pausada ignora `refetch()`                                     | Clique não recuperava            | `resetQueries` no lugar de `refetch`            |
| 3   | Ícone ilegível (uma mancha branca)         | Folha desenhada com preenchimento em vez de traço                    | Olhando o PNG gerado             | Traçado do lucide, com `stroke`                 |
| 4   | `require` dentro do Service Worker         | Não existe `require` num SW em ESM                                   | Revisão antes do build           | Import normal no topo                           |
| 5   | Manifesto "corrompido" (`Circula �`)       | Console do Windows (cp1252) não renderiza travessão                  | Leitura dos **bytes** do arquivo | Nenhuma — o arquivo estava certo                |

**O item 1 é o mais valioso**, e custou várias hipóteses erradas antes de eu chegar à
causa. Duas tentativas minhas falharam (`offlineFirst` e forçar o `onlineManager`)
antes de instrumentar o estado real e descobrir o `fetchStatus: 'paused'`. A lição:
**eu tentei consertar duas vezes por dedução e só acertei quando medi.**

**O item 5 é a quinta vez** neste projeto que a ferramenta de diagnóstico engana —
depois do `200 OK` do servidor errado (Sprint 0), do código inalcançável (Sprint 1), do
erro que o PowerShell inventou (Sprint 2) e da vitrine "vazia" (Sprint 3).

---

## 6. Perguntas que a banca pode fazer

<details>
<summary><b>"Explique o Service Worker do seu projeto."</b></summary>

É um proxy entre o app e a rede, rodando em thread separada. Escrevi seis regras: o
app shell vai para precache (é o que faz o app abrir offline); navegação devolve o
`index.html` para qualquer rota da SPA; as listagens usam stale-while-revalidate
(resposta instantânea do cache + atualização em background); `/auth` usa network-first
porque cache manteria sessão expirada; imagens usam cache-first porque a URL nunca
muda de conteúdo; e o POST de anúncio usa Background Sync, que reenfileira a
publicação feita offline e reenvia sozinho quando a conexão volta.

</details>

<details>
<summary><b>"Por que escreveu o SW à mão em vez de gerar?"</b></summary>

Porque o `generateSW` produziria uma caixa-preta e eu precisava poder explicar cada
decisão de cache. Usei `injectManifest`: escrevo o SW e o plugin só injeta a lista de
arquivos do precache.

</details>

<details>
<summary><b>"Por que dois arquivos de ícone diferentes?"</b></summary>

Porque o Android recorta o ícone na forma do sistema. O `maskable` tem a arte menor,
dentro da zona segura, para não perder as bordas no recorte. Usar a mesma imagem para
os dois faz o ícone aparecer cortado no Android.

</details>

<details>
<summary><b>"O que acontece se eu criar um anúncio sem internet?"</b></summary>

O Background Sync coloca a requisição numa fila no IndexedDB e o navegador a reenvia
quando a conexão voltar, mesmo se o app tiver sido fechado. Ao sincronizar, o SW avisa
as abas abertas para atualizarem a lista.

</details>

<details>
<summary><b>"Qual foi o bug mais difícil?"</b></summary>

Uma tela presa em skeletons com a API fora do ar. Descobri que o TanStack Query tem um
quarto estado — `pending` + `fetchStatus: 'paused'` — em que ele não erra, não tenta de
novo e ignora `refetch()`. Como quem responde offline aqui é o Service Worker, o certo
foi `networkMode: 'always'`, tratar o estado pausado na interface e usar `resetQueries`
no botão de tentar de novo.

</details>

---

## 7. Próxima sprint

**Sprint 6 — Deploy:** API na Render, PWA na Vercel, banco no Neon de produção, CORS e
rate limit de produção, e o keep-alive para o container não hibernar antes da gravação.
Depois disso resta apenas a Sprint 7 (README final, Diário de Bordo consolidado e o
vídeo).
