# Roteiro do vídeo — 6 minutos cronometrados

**Circula — Marketplace de Economia Circular do Campus**
Desafio Técnico · Laboratório de Inovação Vortex (UNIFOR)

> O edital estabelece **duração máxima e estrita de 6 minutos**, dividida em quatro
> blocos. Este roteiro respeita essa divisão e indica o que a banca avalia em cada um.

---

## Antes de gravar — checklist de 5 minutos

- [ ] **Acordar a API** (evita 40s de tela branca no cold start da Render):
      abra https://circula-api.onrender.com/health e espere responder
- [ ] Rodar o seed se o banco estiver com dados de teste, para a demo ficar limpa
- [ ] Abrir as abas **na ordem de uso**, da esquerda para a direita:
      (1) a aplicação · (2) `/docs` da API · (3) VS Code com `apps/web/src/sw.ts` aberto ·
      (4) `README.md` na seção do Diário de Bordo
- [ ] Celular com a tela inicial limpa, se for demonstrar a instalação nele
- [ ] Fechar notificações, Slack, WhatsApp Web
- [ ] Zoom do navegador em **110–125%** — a banca assiste em tela pequena
- [ ] Fazer **uma passada seca** sem gravar, cronometrando

> 🎙️ Ritmo: 6 minutos é pouco. Fale em ritmo natural, sem correr, mas **não improvise
> explicações longas**. Cada bloco abaixo tem uma frase-âncora em **negrito** — se o
> tempo apertar, diga pelo menos ela.

---

## 0:00 – 1:00 · Pitch e visão geral

**O que a banca avalia:** capacidade de síntese, comunicação clara e entendimento do
problema de negócio.

**Tela:** a Landing Page publicada.

### Fala

> Oi, meu nome é Francisco Magno, sou candidato ao estágio full-stack do Laboratório
> Vortex.
>
> Todo fim de semestre acontece a mesma coisa no campus: veteranos com livros, jalecos e
> calculadoras parados numa gaveta, e calouros gastando caro exatamente nesses mesmos
> materiais. O material existe — o que falta é um canal confiável ligando os dois lados
> **dentro da universidade**.
>
> **O Circula é esse canal: um marketplace de economia circular do campus, onde o
> estudante doa, troca ou vende o que não usa mais.**
>
> Ele é uma aplicação única com duas caras: no desktop, uma landing page com vitrine
> pública para descoberta; no celular, um aplicativo instalável para anunciar em menos de
> um minuto.
>
> Está tudo no ar, e esses números aqui são reais — vêm de uma consulta ao banco, não são
> simulados.

### Ações na tela

| Quando | O que fazer                                                                      |
| ------ | -------------------------------------------------------------------------------- |
| 0:00   | Landing aberta, rolagem parada no hero                                           |
| 0:35   | Rolar devagar até os contadores e **apontar para eles** ao dizer "números reais" |
| 0:50   | Rolar até a vitrine, deixar visível para o próximo bloco                         |

---

## 1:00 – 3:00 · Demonstração prática

**O que a banca avalia:** funcionalidade real, UI/UX, responsividade e validação do
funcionamento como PWA.

> ⚠️ Este é o bloco mais denso. **Não explique código aqui** — isso é o próximo bloco.
> Mostre a coisa funcionando.

### Sequência cronometrada

**1:00 – 1:25 · Vitrine e filtros (desktop)**

> Esta é a vitrine pública. Os filtros são por categoria, e cada chip mostra **quantos
> itens** existem ali — evita o usuário clicar e cair numa tela vazia.

- Clicar em **Livros** → a lista muda
- Clicar em **Todos** e depois em **Livros** de novo → _"repare que a segunda vez é
  instantânea: veio do cache"_

**1:25 – 1:50 · Mobile e instalação**

> Acessando pelo celular, vira um aplicativo.

- Abrir o DevTools em modo dispositivo (ou usar o celular de verdade)
- Mostrar a **barra de navegação inferior**
- Instalar: ícone na barra de endereço → **Instalar**
- **Abrir pelo ícone** e mostrar que **não tem barra de endereço**

**1:50 – 2:25 · Criar um anúncio (a regra de negócio) ⭐**

> Agora o fluxo principal. Vou anunciar um item.

- Login (`ana.lima@edu.unifor.br` / `circula2026`) — deixe salvo no navegador
- Preencher título e descrição
- **Aqui está o ponto mais importante da demo:**

> Repare no campo "Como você quer oferecer". Está em **Doação**, e **não existe campo de
> preço**. Se eu mudar para Venda…

- Mudar para **Venda** → o campo aparece
- Voltar para **Doação** → o campo some

> **Doação não tem preço — essa é a regra central do produto, e ela está escrita num
> arquivo só, que vale na API e na interface ao mesmo tempo.** Aqui ela virou desenho de
> tela: o estado inválido é impossível de alcançar.

- Colar uma URL de imagem → mostrar a **pré-visualização**
- Publicar → **toast de confirmação**

**2:25 – 2:45 · Meus anúncios e exclusão**

- Ir em **Meus anúncios** → o item recém-criado já está lá
- Excluir → confirmar → some da lista

> A exclusão é **lógica**: a linha continua no banco com uma data de exclusão. Some da
> vitrine, mas o histórico é preservado.

**2:45 – 3:00 · Offline ⭐**

> E agora o que faz dele um PWA de verdade.

- DevTools → Network → marcar **Offline**
- **Recarregar a página**

> Sem internet, o app abre e os itens continuam aparecendo. Quem responde aqui é o
> Service Worker, servindo do cache.

---

## 3:00 – 5:00 · Explicação técnica do código

**O que a banca avalia:** domínio técnico, organização de código, clareza na explicação e
**comprovação de autoria**.

> ⚠️ Este é o bloco que mais pesa na nota. Fale com calma e **mostre o código na tela**.

### 3:00 – 3:20 · Arquitetura em 20 segundos

**Tela:** árvore de pastas no VS Code.

> É um monorepo com npm workspaces: `apps/api` é a API REST em Express 5, `apps/web` é o
> PWA em React, e `packages/shared` é o que os dois compartilham.
>
> **Esse pacote compartilhado é a espinha do projeto:** enums, schemas de validação e as
> regras de negócio vivem lá. É por isso que a mesma regra vale nos dois lados.

### 3:20 – 3:55 · A regra de negócio, dos dois lados ⭐

**Tela:** `packages/shared/src/domain/rules.ts`

> Esta função é a regra que vocês viram na demo. Ela é **pura** — não conhece HTTP, nem
> banco, nem React. Só recebe o tipo e o preço e diz se a combinação é válida.

**Tela:** `packages/shared/src/schemas/announcement.ts` (o `superRefine`)

> Aqui ela é usada na validação da API.

**Tela:** `apps/web/src/pages/app/NewAnnouncementPage.tsx` (o `isSale ?`)

> E aqui, na interface — decidindo se o campo de preço existe.
>
> **Uma regra, três usos, um arquivo. É isso que garante que o front nunca deixe passar
> algo que a API recusaria.**

### 3:55 – 4:20 · O fluxo de uma requisição

**Tela:** `apps/api/src/modules/announcements/` (mostrar os 4 arquivos)

> No backend cada recurso tem quatro camadas: a **rota** só recebe e responde; a
> **validação** com Zod transforma dado da internet em dado confiável; o **service** tem
> a regra de negócio e não sabe o que é HTTP; e o **repositório** fala com o banco.
>
> O repositório é uma **interface**. Em produção entra a implementação com Prisma; nos
> testes, uma em memória. **É por isso que os 67 testes rodam no CI sem precisar de um
> PostgreSQL.**

### 4:20 – 5:00 · O Service Worker ⭐⭐

**Tela:** `apps/web/src/sw.ts`

> E este é o Service Worker, que eu escrevi à mão — usei a estratégia `injectManifest`
> justamente para poder explicar cada regra.
>
> Um Service Worker é um **proxy entre o app e a rede**: toda requisição passa por ele
> antes de sair, e ele decide se responde do cache, vai à rede, ou os dois.

**Rolar mostrando cada bloco:**

> - O **precache** guarda o app shell — é o que faz a aplicação abrir sem internet.
> - As listagens usam **stale-while-revalidate**: responde na hora com o cache e atualiza
>   em segundo plano. Foi isso que vocês viram funcionando offline.
> - As rotas de autenticação usam **network-first**, porque servir sessão do cache
>   manteria alguém logado com um token já expirado.
> - Imagens usam **cache-first**: a mesma URL sempre devolve a mesma imagem.
> - E o mais interessante: **Background Sync**. Se a pessoa toca em "Publicar" sem rede,
>   a requisição vai para uma fila no IndexedDB e o **navegador reenvia sozinho quando a
>   conexão voltar** — mesmo que o app já tenha sido fechado.

---

## 5:00 – 6:00 · Uso prático da Inteligência Artificial

**O que a banca avalia:** maturidade no uso de IA, senso crítico para corrigir erros e
capacidade de curadoria técnica.

**Tela:** `README.md` na seção **🤖 Diário de Bordo da IA**.

### Fala

> Usei o Claude como ferramenta ao longo das sete sprints, e documentei tudo no Diário de
> Bordo. Quero destacar três momentos.
>
> **Primeiro: o uso não começou pedindo código.** Meu primeiro prompt pedia um _plano_ —
> stacks, arquitetura e sprints — para eu autorizar antes de qualquer linha ser escrita.
> Se eu tivesse pedido "faça o projeto", teria recebido código que não saberia defender
> aqui.
>
> **Segundo: eu recusei uma recomendação dela.** A IA sugeriu Fastify no backend,
> argumentando bem. Escolhi Express, que eu já uso — porque o critério mais pesado da
> avaliação é eu explicar o próprio código, e framework novo me deixaria dependente da IA
> até para justificar as escolhas.

**Rolar até a "Reflexão crítica"**

> **Terceiro, e o mais importante: onde ela errou.**

Escolher **um** destes para contar (o do preço é o mais forte):

> Ela gerou um schema onde o `.default(null)` sobrevivia ao `.partial()`. Na prática, um
> usuário que apenas reservasse o próprio anúncio teria **o preço apagado do banco**.
> Peguei porque, antes de construir em cima, rodei um script exercitando cada regra e vi
> `priceCents: null` numa saída onde não deveria estar.

**Fechamento:**

> No total foram **quinze erros documentados**, incluindo um em que ela tentou consertar
> duas vezes por dedução e só acertou quando eu exigi que medisse o estado real.
>
> **Minha conclusão é que a IA acelera muito, mas não substitui verificação: em cinco
> ocasiões a ferramenta de diagnóstico mentiu, e só descobri porque conferi por um
> segundo caminho.**
>
> O projeto está no ar, o código está no GitHub, e obrigado pela oportunidade.

---

## Frases que valem decorar

Se travar, estas quatro sustentam o vídeo inteiro:

1. **"Doação não tem preço — a regra está num arquivo só, e vale na API e na interface."**
2. **"O repositório é uma interface, e por isso 67 testes rodam sem banco no CI."**
3. **"Escrevi o Service Worker à mão para poder explicar cada estratégia de cache."**
4. **"A IA acelera, mas não substitui verificação — documentei quinze erros dela."**

---

## Erros comuns a evitar

| Não faça                         | Faça                                                  |
| -------------------------------- | ----------------------------------------------------- |
| Ler o roteiro em voz monótona    | Falar olhando a tela, com as frases-âncora na cabeça  |
| Explicar código no bloco da demo | Demo = mostrar funcionando; código = bloco seguinte   |
| Passar de 6 minutos              | Cronometrar num ensaio antes                          |
| Mostrar erro de cold start       | Acordar a API antes de gravar                         |
| Dizer "a IA fez isso pra mim"    | Dizer "pedi isso, conferi, e mudei X porque Y"        |
| Esconder os erros da IA          | **São eles que provam curadoria** — o edital valoriza |

---

## Onde hospedar

O edital aceita: **YouTube como não listado**, Google Drive com permissão pública, Loom
ou Vimeo.

> Recomendo YouTube não listado: não expira, não tem limite de visualizações e o link é
> estável. **Teste o link numa aba anônima** antes de enviar — link de Drive sem
> permissão pública é o erro mais comum.
