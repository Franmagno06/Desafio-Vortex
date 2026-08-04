# Diário de Bordo da IA — registro bruto

Esta pasta guarda o registro **cru** de cada sessão de trabalho com IA. A seção
`🤖 Diário de Bordo da IA` do [README principal](../../README.md) é a versão **curada**:
os melhores prompts, a reflexão crítica e o link do histórico.

## Por que manter os dois

O edital (Seção 3) pede prompts reais copiados na íntegra e um relato honesto de quando a IA
errou. Reconstruir isso de memória no último dia produz um texto genérico — e a banca
identifica. Registrar na hora produz material específico e verificável.

## Convenção de arquivos

```
AAAA-MM-DD-sessao-NN.md
```

## Template

````markdown
# Sessão NN — DD/MM/AAAA

**Sprint:** N · **Ferramenta:** <qual IA> · **Duração:** ~Xh

## Objetivo

O que eu queria resolver nesta sessão.

## Prompts relevantes

### Prompt N.1 — <título curto>

```
<prompt copiado na íntegra, sem edição>
```

**Retorno:** o que a IA entregou.
**Minha avaliação:** aceitei / rejeitei / adaptei — e por quê.

## Onde a IA errou

| Sintoma | Causa raiz | Como eu identifiquei | Correção |
| ------- | ---------- | -------------------- | -------- |

## O que eu implementei sozinho

## O que aprendi
````

## Índice de sessões

| Sessão                        | Data       | Sprint | Tema                                               |
| ----------------------------- | ---------- | ------ | -------------------------------------------------- |
| [01](2026-07-31-sessao-01.md) | 31/07/2026 | 0      | Planejamento de arquitetura e fundação do monorepo |
| [02](2026-08-01-sessao-02.md) | 01/08/2026 | 1      | Modelagem, CRUD de anúncios, validação e OpenAPI   |
| [03](2026-08-03-sessao-03.md) | 03/08/2026 | 2 e 3  | Autenticação JWT, bcrypt e Landing Page            |
| [04](2026-08-04-sessao-04.md) | 04/08/2026 | 4      | App mobile, correção do CI e tema UNIFOR           |
