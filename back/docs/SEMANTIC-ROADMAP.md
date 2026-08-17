# Semantic Roadmap — mudanças justificadas pela auditoria

Documento derivado de `SEMANTIC-AUDIT.md`. Cada item é independente, pequeno e validável.
Princípio: preservar comportamento quando possível; mudança de comportamento apenas quando o contrato está quebrado (P1) e acompanhada de teste.

## R1 — Contrato de identidade (F-01, F-02)

**Mudanças:**
- Remover `author`/`owner` do payload de entrada (validators deixam de exigir; types deixam de expor)
- Derivar identidade de `store.user` (do `requestContext`) no service: `author = store.user.username`
- Adicionar checagem de ownership nas operações de escrita: `UPDATE/DELETE ... WHERE id = $1 AND author = $2`
- Resposta de escrita volta com identidade derivada (nunca a do cliente)

**Validação:** type-check, lint, teste de contrato (payload sem `author` deve funcionar; `author` divergente da sessão deve ser ignorado); smoke test.

## R2 — Contrato de erro e fluxo (F-04, F-05, F-08, F-11)

**Mudanças:**
- Front: ler `error.message` do shape `{error:{message}}` (helper de parse)
- Front: rota `/home` (ou redirect `/home` → `/`)
- Back: `HttpError.notFound` para recurso ausente (422 → 404)
- Back: DELETE sem corpo (`204` + `end()`)

**Validação:** type-check, lint, teste E2E manual (erro de login visível, fluxo login → home), curl dos status codes.

## R3 — Contrato de shape (F-06, F-07)

**Mudanças (escolher UMA):**
- Opção A: mapper no repositório devolvendo shape de domínio (`msg_text` → `content` em todas as saídas)
- Opção B: adotar `msg_text` como nome canônico em todo o fluxo (inclui types)

**Recomendação:** Opção A (preserva o domínio em camelCase e unifica listagem/detalhe — `SELECT *` em ambos).

**Validação:** type-check, lint, testes de contrato (mesmo shape em listagem e detalhe).

## R4 — Segurança de log (F-10)

**Mudanças:**
- `httpLogger` redige `password` (e futuros campos sensíveis) antes de serializar o body

**Validação:** type-check, lint, teste unitário do redactor; verificação visual do log após login.

## R5 — Fronteira de dados (F-03, F-15, F-16)

**Mudanças:**
- Remover `JWT_SECRET` do `.env` (e do `.env.example` se presente)
- `.env`: manter `DATABASE_URL`/`DATABASE_URL_ADMIN` documentando que hoje apontam para o mesmo banco; quando as roles forem ativadas, apontar `DATABASE_URL` para `app_user`
- Front: centralizar `API_BASE_URL` (constante ou env do Vite `VITE_API_URL`)
- Decidir campo e-mail: implementar envio (contrato com back) ou remover o input

**Validação:** type-check, lint, smoke test.

## R6 — Naming e schema (F-12, F-13, F-14)

**Mudanças:**
- `findAllMessage` → `findAllMessages` (controller)
- Renomear coluna `createdat` → `created_at` via nova migration (com `down`)
- Documentar a migration 1777260392910 (nome enganoso) no README de migrations

**Validação:** type-check, lint, `pnpm migrate:up` em banco limpo e em banco já migrado.

## R7 — Primeira camada de testes (F-17)

**Mudanças:**
- Configurar supertest + vitest no back
- Testes de contrato:
  1. `register` → 201 e 409 (duplicado)
  2. `login` → 200 + Set-Cookie `token` (HttpOnly); 401 com credencial errada
  3. `POST /natter/*` sem cookie → 401
  4. Identidade derivada: `author` divergente da sessão é ignorado (prova de F-01)
  5. Ownership: usuário B não atualiza/apaga mensagem do usuário A → 404
  6. Shapes: listagem e detalhe retornam o mesmo shape (F-07)
  7. 404 para recurso inexistente (F-08)

**Validação:** `pnpm test:run`, type-check, lint.

---

## Ordem sugerida

R4 (segurança, baixo risco) → R1 (domínio) → R2 (contrato) → R3 (shape) → R6 (naming) → R5 (fronteira) → R7 (testes como rede de regressão para tudo acima).

Cada item vira um commit conventional (`fix:`, `feat:`, `refactor:`, `test:`), validado antes do push na `developer`.