# Sprint 2 — Autenticação JWT

**Data:** 03/08/2026 · **Status:** ✅ concluída

> Relatório técnico de estudo. Ao final há uma bateria de testes manuais de autenticação.

---

## 1. Objetivo da sprint

Trocar a identificação falsificável da Sprint 1 (`X-User-Id`) por autenticação criptográfica
de verdade — e **provar que o desenho em camadas funciona**, mudando um arquivo só.

Com isso fecha o último bônus da seção 2.1 do edital.

| Requisito do edital                     | Tipo     | Status |
| --------------------------------------- | -------- | ------ |
| Autenticação básica de usuários (JWT)   | 🎁 Bônus | ✅     |
| Tratamento robusto de erros e validação | 🎁 Bônus | ✅     |
| Banco relacional real em nuvem          | 🎁 Bônus | ✅     |

**Os três bônus de backend estão fechados.**

---

## 2. O que foi entregue

| Item                                        | Onde                                       |
| ------------------------------------------- | ------------------------------------------ |
| Schemas de cadastro e login                 | `packages/shared/src/schemas/auth.ts`      |
| Emissão e verificação de JWT                | `apps/api/src/modules/auth/jwt.ts`         |
| Regras de cadastro, login e identidade      | `.../auth/auth.service.ts`                 |
| 3 rotas (`register`, `login`, `me`)         | `.../auth/auth.routes.ts`                  |
| Middleware `requireAuth` / `optionalAuth`   | `apps/api/src/middlewares/authenticate.ts` |
| Rate limit específico para login            | `.../auth/auth.routes.ts`                  |
| Seed com hashes bcrypt reais                | `apps/api/prisma/seed.ts`                  |
| `bearerAuth` no OpenAPI (botão _Authorize_) | `apps/api/src/docs/openapi.ts`             |
| **22 testes novos** (56 no total)           | `apps/api/tests/auth.test.ts`              |

**Arquivo apagado:** `middlewares/identify-user.ts`. Cumpriu o papel de ponte e saiu.

---

## 3. Conceitos para estudar

### 3.1 A prova de que o desenho em camadas valeu a pena

Este é **o ponto para mostrar no vídeo**. Compare o que mudou:

| Camada                      | Mudou?                            |
| --------------------------- | --------------------------------- |
| Rotas de anúncios           | Só o nome do middleware importado |
| Service                     | ❌ nenhuma linha                  |
| Repositório                 | ❌ nenhuma linha                  |
| Mapper                      | ❌ nenhuma linha                  |
| Middleware de identificação | ✅ substituído inteiro            |

Trocamos um cabeçalho que qualquer cliente inventava por verificação criptográfica de
assinatura, e o resto do sistema nem percebeu. O motivo é que todos continuam lendo
`req.userId` — só mudou **quem preenche** esse campo.

Se a leitura do cabeçalho estivesse espalhada dentro de cada rota (`req.header('X-User-Id')`
em seis lugares), esta sprint teria mexido em seis arquivos e cada um seria uma chance de
esquecer um.

---

### 3.2 O que um JWT é — e o que ele **não** é

Um JWT tem três partes separadas por ponto:

```
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxMTExLi4uIn0 . 4f3a9b2c...
      header                  payload              signature
```

As duas primeiras são **base64, não criptografia**. Qualquer pessoa decodifica:

```json
{
  "sub": "11111111-1111-4111-8111-111111111111",
  "iat": 1785783882,
  "exp": 1786388682,
  "iss": "circula-api"
}
```

> ⚠️ **JWT não dá sigilo, dá integridade.** A assinatura prova que o payload não foi
> alterado depois de emitido, porque só quem tem o `JWT_SECRET` consegue produzi-la.
> Por isso o payload aqui só carrega o id do usuário, que já é público. Nunca coloque
> senha, CPF ou qualquer dado sensível ali dentro.

`sub` (subject) é o campo padronizado para "de quem é este token". `iat` = emitido em,
`exp` = expira em, `iss` = quem emitiu.

**Por que isso é melhor que o `X-User-Id`:** aquele cabeçalho era só um texto — bastava
trocar o UUID para virar outra pessoa. Forjar um JWT exigiria descobrir o segredo do
servidor.

---

### 3.3 bcrypt: a lentidão é o recurso

```ts
const BCRYPT_ROUNDS = 12; // 2^12 = 4096 iterações, ~250ms por hash
```

Todo instinto de programador diz para tornar o código mais rápido. Aqui é o contrário:
**o custo é a defesa**. Quem roubar o banco precisa gastar 250ms por tentativa em cada
senha que quiser adivinhar. Com um hash rápido (MD5, SHA-256), o mesmo ataque testaria
bilhões de senhas por segundo.

Duas propriedades do bcrypt que valem entender:

**Salt automático.** Cada hash embute um valor aleatório próprio. Duas pessoas com a senha
`circula2026` produzem hashes completamente diferentes — o que inutiliza _rainbow tables_
(tabelas pré-computadas de senha → hash).

**Limite de 72 bytes.** O bcrypt **trunca silenciosamente** o que passar disso. Sem o
`.max(72)` no schema, duas senhas diferentes com os mesmos 72 primeiros bytes
autenticariam uma à outra. Por isso o limite está no Zod, não só como documentação.

---

### 3.4 Timing attack: o ataque que se enxerga no relógio

Trecho aparentemente estranho do `auth.service.ts`:

```ts
const DUMMY_HASH = bcrypt.hashSync('senha-que-nunca-sera-usada-0000', BCRYPT_ROUNDS);

// no login:
const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
```

Por que comparar contra um hash falso quando o usuário nem existe?

Sem isso:

| Cenário           | O que acontece                     | Tempo  |
| ----------------- | ---------------------------------- | ------ |
| E-mail não existe | Retorna 401 na hora                | ~5ms   |
| E-mail existe     | Roda o bcrypt e depois retorna 401 | ~250ms |

Essa diferença é **mensurável de fora**. Um atacante manda uma lista de e-mails e cronometra
as respostas: os que demoram 250ms têm conta no sistema. Ele acabou de descobrir a base de
usuários sem acertar uma senha sequer. Chama-se **ataque de canal lateral** (_timing attack_)
— o vazamento não está no conteúdo da resposta, está no tempo dela.

Com o `DUMMY_HASH`, os dois caminhos custam o mesmo.

---

### 3.5 A mesma mensagem para dois erros diferentes

```ts
if (!user || !matches) {
  throw unauthorized('E-mail ou senha incorretos.');
}
```

Poderia ser mais útil dizer "esse e-mail não está cadastrado". Seria também um **validador
de e-mails**: qualquer pessoa poderia descobrir quem tem conta no Circula testando
endereços.

Repare no contraste deliberado com o **cadastro**, que devolve `409 CONFLICT` dizendo que o
e-mail já existe. Ali a informação é necessária — a pessoa precisa saber que deve fazer
login. A regra não é "nunca revele nada", é **revelar só onde há motivo legítimo**.

---

### 3.6 Rate limit específico para login

O limite global da API é 100 requisições / 15 min. Para login isso é generoso demais:
100 tentativas de senha por IP a cada 15 minutos viabiliza força bruta contra senhas fracas.

```ts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});
```

`skipSuccessfulRequests` é o detalhe que faz a proteção não atrapalhar: logins bem-sucedidos
não contam. Quem usa o sistema normalmente nunca esbarra no limite; quem está adivinhando
senhas, sim.

---

### 3.7 Normalizar antes de validar — a ordem que quebrou um teste

```ts
z.email().transform((v) => v.trim().toLowerCase()); // ❌
z.string().trim().toLowerCase().pipe(z.email()); // ✅
```

Na primeira forma a validação de formato roda **antes** do trim, então
`"  ana@unifor.br  "` é rejeitado como e-mail inválido. Teclado de celular acrescenta espaço
depois do autocompletar, e colar um endereço quase sempre traz espaço junto.

Normalizar também resolve um problema de banco: `Ana@Unifor.br` e `ana@unifor.br` são o
mesmo endereço, mas para a restrição `UNIQUE` do Postgres são strings diferentes. Sem o
`toLowerCase`, os dois coexistiriam e o login dependeria de como a pessoa digitou no dia do
cadastro.

Um teste pegou isso — está descrito na seção 5.

---

### 3.8 `requireAuth` × `optionalAuth`

Dois middlewares, dois usos:

| Middleware     | Sem token        | Para quê                                  |
| -------------- | ---------------- | ----------------------------------------- |
| `requireAuth`  | responde **401** | criar, editar, excluir, `/auth/me`        |
| `optionalAuth` | **deixa passar** | rotas públicas que mudam se houver sessão |

O `optionalAuth` existe para a Sprint 3/4: a vitrine é pública, mas pode marcar quais
anúncios são do próprio usuário quando ele estiver logado. Um token inválido ali é ignorado
em silêncio, porque a rota funciona sem ele.

---

### 3.9 Por que o token vai no cabeçalho, e não em cookie

`Authorization: Bearer <token>` é o formato do RFC 6750. O esquema (`Bearer`) é
**case-insensitive** — por isso o código faz `scheme.toLowerCase()`, e há um teste para isso.

A alternativa seria cookie `httpOnly`. Escolhemos cabeçalho porque:

- o PWA e a API ficam em **domínios diferentes** (Vercel e Render), e cookie
  cross-site exige `SameSite=None; Secure` mais configuração de CORS com credenciais;
- cabeçalho é imune a **CSRF** por construção: o navegador não anexa sozinho.

O custo: o token fica no `localStorage`, acessível por JavaScript e portanto vulnerável a
XSS. É uma troca consciente — nesta arquitetura, CSRF é o risco mais provável, e a defesa
contra XSS é não injetar HTML de terceiros (o React já escapa por padrão).

---

## 4. 🔬 Testes manuais de autenticação

### Preparação

```powershell
cd "C:\Users\franm\OneDrive\Desktop\Desafio Vortex"
npm run dev
```

Em outro terminal:

```powershell
$API = "http://localhost:4000/api/v1"
```

---

### Teste 1 — Login e o formato do token

```powershell
$login = Invoke-RestMethod -Method Post "$API/auth/login" -ContentType "application/json" -Body (@{ email = "ana.lima@edu.unifor.br"; password = "circula2026" } | ConvertTo-Json)
$login.user.name; $login.expiresIn
```

✅ **Esperado:** `Ana Beatriz Lima` e `604800` (7 dias em segundos).

---

### Teste 2 — Leia o conteúdo do seu próprio token

```powershell
$p = $login.token.Split('.')[1].Replace('-','+').Replace('_','/'); while ($p.Length % 4) { $p += '=' }; [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p))
```

✅ **Esperado:** `{"sub":"1111...","iat":...,"exp":...,"iss":"circula-api"}`

❓ **A lição está aqui:** você acabou de ler o payload **sem nenhuma senha**. JWT não é
sigiloso. Se houvesse dado sensível ali dentro, estaria exposto.

---

### Teste 3 — Rota protegida com e sem token

```powershell
$AUTH = @{ Authorization = "Bearer $($login.token)" }
(Invoke-RestMethod "$API/auth/me" -Headers $AUTH).user | Format-List
```

```powershell
try { Invoke-RestMethod "$API/auth/me" } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** os dados da Ana no primeiro; **401** no segundo.

---

### Teste 4 — Token adulterado

```powershell
$fake = $login.token.Substring(0, $login.token.Length-1) + "X"
try { Invoke-RestMethod "$API/auth/me" -Headers @{ Authorization = "Bearer $fake" } } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **401** "Sessão inválida ou expirada."

❓ **Entenda:** você mudou **um caractere** da assinatura. O payload continua perfeitamente
legível — mas a assinatura não confere mais. É exatamente para isso que o JWT existe.

---

### Teste 5 — As duas falhas de login são indistinguíveis

```powershell
try { Invoke-RestMethod -Method Post "$API/auth/login" -ContentType "application/json" -Body (@{ email = "ana.lima@edu.unifor.br"; password = "errada123" } | ConvertTo-Json) } catch { $_.ErrorDetails.Message }
```

```powershell
try { Invoke-RestMethod -Method Post "$API/auth/login" -ContentType "application/json" -Body (@{ email = "ninguem@edu.unifor.br"; password = "circula2026" } | ConvertTo-Json) } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **mensagem idêntica** nos dois — `"E-mail ou senha incorretos."`

❓ **Cronometre também:** os dois devem demorar praticamente o mesmo (~250ms). É o
`DUMMY_HASH` em ação. Se o segundo fosse instantâneo, daria para enumerar contas.

---

### Teste 6 — O `X-User-Id` da Sprint 1 morreu

```powershell
try { Invoke-RestMethod -Method Post "$API/announcements" -Headers @{ "X-User-Id" = "11111111-1111-4111-8111-111111111111" } -ContentType "application/json" -Body '{}' } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **401**. Aquele cabeçalho não autentica mais nada.

---

### Teste 7 — Cadastro e normalização de e-mail

```powershell
Invoke-RestMethod -Method Post "$API/auth/register" -ContentType "application/json" -Body (@{ name = "Meu Nome Completo"; email = "  MEU.Email@edu.unifor.BR  "; password = "minhasenha123"; course = "ADS" } | ConvertTo-Json)
```

✅ **Esperado:** **201**, e o `email` devolvido **sem espaços e em minúsculas**.

Repita o mesmo comando: ✅ **409 CONFLICT** — e-mail já cadastrado.

---

### Teste 8 — Política de senha

```powershell
try { Invoke-RestMethod -Method Post "$API/auth/register" -ContentType "application/json" -Body (@{ name = "Senha Fraca"; email = "fraco@edu.unifor.br"; password = "abc" } | ConvertTo-Json) } catch { $_.ErrorDetails.Message }
```

✅ **Esperado:** **422** listando _duas_ violações ao mesmo tempo (comprimento e falta de
número) — o Zod acumula os erros em vez de parar no primeiro.

---

### Teste 9 — Propriedade do anúncio, agora com JWT

Crie um anúncio com o token da Ana, depois tente editá-lo com o do Carlos:

```powershell
$carlos = Invoke-RestMethod -Method Post "$API/auth/login" -ContentType "application/json" -Body (@{ email = "carlos.souza@edu.unifor.br"; password = "circula2026" } | ConvertTo-Json)
```

✅ **Esperado:** **403 FORBIDDEN**. A diferença para a Sprint 1 é que agora o Carlos
**precisou provar** que é o Carlos.

---

### Teste 10 — O botão _Authorize_ do Swagger

Abra <http://localhost:4000/docs>, clique em **Authorize** (cadeado no topo), cole o token
e feche. Agora o **Try it out** funciona nas rotas protegidas sem você montar cabeçalho
nenhum.

---

### Teste 11 — Suíte automatizada

```powershell
npm test
```

✅ **Esperado:** **56 testes passando**, ainda sem banco nenhum.

---

## 5. Problemas reais enfrentados

| #   | Sintoma                                        | Causa raiz                                                                  | Como foi detectado        | Correção                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------- |
| 1   | Login com e-mail em maiúsculas dava 422        | `z.email()` valida **antes** do `.transform()` que faz o trim               | Teste automatizado        | `z.string().trim().toLowerCase().pipe(z.email())` |
| 2   | Mensagem de erro parecia truncada (`Bearer .`) | O PowerShell removeu o trecho `<token>` ao exibir, achando que era tag HTML | Comparação com `curl.exe` | Nenhuma — a API estava certa                      |
| 3   | `JWT_SECRET` "já existia" mas não era lido     | Estava **comentado** no `.env` desde a Sprint 1                             | Boot falhou               | Descomentar com segredo gerado                    |

O **item 2** é o mais instrutivo, e repete um tema do projeto: **a ferramenta de diagnóstico
pode mentir**. O `$_.ErrorDetails.Message` do PowerShell tenta interpretar a resposta como
HTML e engoliu `<token>`. Por um instante pareceu bug na API. Conferir com um segundo
cliente (`curl.exe`) mostrou que a resposta estava correta desde o começo.

> É a terceira vez neste projeto que a evidência inicial enganou: na Sprint 0 foi um
> `200 OK` do servidor errado, na Sprint 1 um bloco de código que nunca executava, e agora
> um erro que não existia. **Confirme com uma segunda fonte antes de "corrigir".**

---

## 6. Perguntas que a banca pode fazer

<details>
<summary><b>"Onde a senha fica guardada?"</b></summary>

Só o hash bcrypt, na coluna `passwordHash`. A senha em texto puro nunca é persistida nem
registrada em log. Há um teste verificando que o hash começa com `$2` (prefixo do bcrypt) e
que o valor armazenado é diferente da senha enviada.

</details>

<details>
<summary><b>"Por que 12 rodadas de bcrypt?"</b></summary>

Porque a lentidão é a defesa: ~250ms por hash. Quem roubar o banco precisa gastar isso por
tentativa em cada senha. Com um hash rápido, o mesmo ataque testaria bilhões por segundo.
12 é o equilíbrio atual entre custo para o atacante e latência aceitável no login.

</details>

<details>
<summary><b>"Alguém pode ler o conteúdo do token?"</b></summary>

Sim, e isso é esperado — as duas primeiras partes são base64, não criptografia. O JWT
garante **integridade**, não sigilo. Por isso o payload só carrega o id do usuário, que já é
público. A assinatura é o que impede alterar o conteúdo.

</details>

<details>
<summary><b>"Por que o login não diz se o e-mail existe?"</b></summary>

Porque isso transformaria a tela de login num validador de quais e-mails têm conta. Por isso
também o `DUMMY_HASH`: sem ele, a diferença de tempo entre os dois casos permitiria a mesma
enumeração pelo relógio, mesmo com a mensagem idêntica.

</details>

<details>
<summary><b>"O que precisou mudar nas rotas e no service para o JWT entrar?"</b></summary>

Nas rotas, só o nome do middleware importado. No service e no repositório, nada. Todos
continuam lendo `req.userId` — só mudou quem preenche esse campo. É o retorno prático de ter
isolado a identificação num middleware desde a Sprint 1.

</details>

---

## 7. Próxima sprint

**Sprint 3 — Landing Page desktop:** design system em Tailwind v4, hero, contadores reais
vindos de `/stats`, vitrine com filtros por categoria e CTAs. O backend está completo; daqui
em diante o trabalho é de interface.
