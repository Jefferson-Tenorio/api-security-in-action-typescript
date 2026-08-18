# Auditoria de Features de API Security

Projeto: Natter — API Security in Action (TypeScript)
Data: 2026-08-18 (atualizada em 2026-08-18 — correções P0/P1 e Fase P2 aplicadas na branch `security/hardening`)

Regra aplicada: nenhuma feature foi marcada como implementada apenas por existir biblioteca, dependência ou nome sugestivo no projeto. Toda marcação tem evidência concreta (arquivo:linha, comportamento observado).

---

## 1. Reconhecimento da arquitetura

| Item | Evidência |
|---|---|
| Linguagem/framework | TypeScript ESM + Express 5 (`back/package.json`, `back/src/app.ts`) |
| Estrutura | `back/src`: `config/`, `modules/` (auth, audit_log, natter), `shared/` (context, db, error, http, utils). Front: `pages/` |
| Endpoints | `POST /auth/register\|login\|logout`; `/natter` CRUD de `message` e `space` (`auth-router.ts:8-10`, `natter-router.ts:13-23`) |
| Middlewares | `requestContextMiddleware` → cors → `express.json` → `httpLogger` → helmet → no-store → cookieParser → audit → rate limiters → `authenticate` → `globalErrorHandler` (`app.ts:28-57`) |
| Autenticação | Cookie `httpOnly` + JWT RS256, 15min (`auth-controller.ts:20-26`, `jwt-service.ts:17-28`) |
| Autorização | Ownership por `author`/`owner` em SQL (`natter-repository.ts:31-44,79-88`); sem roles na aplicação |
| Banco/camada | PostgreSQL, `postgres` (postgres.js), 4 tabelas (`users`, `spaces`, `messages`, `audit_logs`), `node-pg-migrate` |
| Serviços externos | Nenhum |
| Deploy | `Dockerfile` (node:22-alpine, `USER node`), `docker-compose.yml` (só Postgres). Sem CI/CD |
| Config/env | `back/src/config/env.ts` (lê `.env`), `.env.example` versionado; `.env` e `*.pem` no `.gitignore` (confirmado: `git ls-files` só mostra `.env.example`) |
| Testes | `back/src/app.test.ts` (contrato) + `back/src/security/` (BOLA, input-validation, pagination, http-hardening, jwt, revocation, rate-limit) — 44 testes, 100% verdes |
| Documentação | `README.md`, `back/docs/fluxos.md` (parcialmente desatualizado: `fluxos.md:63` diz que `/home` não existe no App, mas `App.tsx:10` tem; e alega `Login.tsx` lê `data.message`, mas o código usa `data.error?.message`) |

---

## 2. Autenticação

| Item | Status | Evidência |
|---|---|---|
| Autenticação de usuários | IMPLEMENTADO | `auth-service.ts:10-19` |
| Autenticação por token | IMPLEMENTADO | cookie `token` setado no login (`auth-controller.ts:20-26`) |
| JWT | IMPLEMENTADO | `jwt-service.ts:17-28` |
| Access/refresh separados | AUSENTE | só um token (15min) |
| Expiração de tokens | IMPLEMENTADO | `expiresInMs` 15min (`env.ts`, `jwt-service.ts`) |
| Revogação/invalidação | IMPLEMENTADO (P2) | deny-list `token_denylist` (jti PK, user_id, expires_at); `logout` insere jti + limpa cookie (`auth-service.ts:20-29`, `token-denylist-repository.ts`); `authenticate` consulta a deny-list após `verify` (`authenticate-middleware.ts:14-19`) |
| Validação de assinatura | IMPLEMENTADO | `verifyToken` com chave pública (`jwt-service.ts:26-28`) |
| Algoritmo explicitamente validado | IMPLEMENTADO | `algorithms: ['RS256']` (`jwt-service.ts:28`) |
| Claims validados | IMPLEMENTADO (P2) | `iss`/`aud`/`jti` no sign + validação de issuer/audience no verify (`jwt-service.ts:20-38`, `env.ts` com `JWT_ISSUER`/`JWT_AUDIENCE`); testes em `security/jwt.test.ts` |
| Proteção contra reuso de tokens | IMPLEMENTADO (P2) | `jti` único por login + deny-list; token reusado após logout → 401 (`security/revocation.test.ts`) |
| Credenciais seguras em repouso | IMPLEMENTADO | `bcrypt.hash(password, 10)` (`auth-service.ts:27`) |
| Proteção brute force | PARCIAL | rate-limit por identidade (`userId` autenticado / IP anônimo) + limite de login por `username`+IP (`rate-limit.ts`, `auth-router.ts`); sem lockout progressivo (opcional, não implementado) |
| Política p/ endpoints sensíveis | IMPLEMENTADO | `/natter` todo exige cookie (`natter-router.ts:10`); login/register limitados |

Gaps: sem refresh token, sem revogação, sem lockout por conta; `register`/`login` sem validação de entrada (username/password vazios → erro de banco 500 em vez de 400, já que `users.username` é `VARCHAR(50)`).

---

## 3. Autorização e controle de acesso

| Item | Status | Evidência |
|---|---|---|
| Autorização além da autenticação | IMPLEMENTADO | ownership em SQL (`natter-repository.ts:31-44,79-88`; teste em `app.test.ts:147-170`) |
| Roles/perfis | IMPLEMENTADO (P4) | roles por espaço `owner`/`member` em `space_members` (migração `1787069944593_space-members.ts`) |
| Permissions/scopes | IMPLEMENTADO (P4) | `space:read`, `space:manage`, `message:write/update/delete` (`src/shared/authz/authz.ts`) |
| RBAC | IMPLEMENTADO (P4) | RBAC+ABAC híbrido; decisão em `docs/plano-seguranca.md` |
| Controle por recurso | IMPLEMENTADO | escrita protegida; leitura protegida após fix (P0) |
| Proteção BOLA/IDOR | CORRIGIDO (P0) | reads filtrados por `author`/`owner` (`natter-repository.ts:47-76`); recurso alheio → 404. Regressão: `src/security/bola.test.ts` |
| Só acessa o que é seu | IMPLEMENTADO | writes e reads: sim (testes `bola.test.ts`) |
| Ownership validado | IMPLEMENTADO (writes) | `WHERE id = $ AND author = $` / `owner` |
| Endpoints admin protegidos | N/A | não existem endpoints admin |
| Least privilege | PARCIAL | bom no banco (roles distintas); na app não há níveis |
| Autorização no servidor | IMPLEMENTADO | toda checagem em SQL, identidade vem da sessão (teste `app.test.ts:90-111`) |

Principal achado da auditoria (BOLA/IDOR de leitura) foi corrigido na branch `security/hardening` com testes de regressão em `src/security/bola.test.ts`.

---

## 4. Validação de entrada

| Item | Status | Evidência |
|---|---|---|
| Inputs validados | IMPLEMENTADO | zod em auth (`auth-schemas.ts`) e natter (`natter-validation.ts`) |
| Schema validation | IMPLEMENTADO | zod em auth e natter; guards manuais substituídos (P1) |
| Body validado | IMPLEMENTADO | `auth-schemas.ts` (strict) + `natter-validation.ts` (zod, strip) |
| Query params validados | N/A | nenhum endpoint usa query |
| Path params validados | IMPLEMENTADO | `parseId` rejeita não-inteiro/≤0 (`natter-validation.ts:37-44`) |
| Headers validados | AUSENTE | sem checagem de Content-Type |
| Tipos validados | PARCIAL | só nos guards acima |
| Tamanho de payload | PARCIAL | só o default do `express.json` (100kb implícito, `app.ts:35`) |
| Campos inesperados rejeitados | AUSENTE | validadores aceitam campos extras silenciosamente |
| Mass assignment | IMPLEMENTADO (por omissão) | repo só usa `data.content`/`data.space_id`/`data.name`; `author`/`owner` do cliente são ignorados (teste `app.test.ts:97,105`) |
| Sanitização | PARCIAL | só redação em logs; sem sanitização de saída de `msg_text` (não há renderização hoje) |
| Cliente não confiável | IMPLEMENTADO | identidade derivada da sessão, nunca do body |

---

## 5. Segurança de dados

| Item | Status | Evidência |
|---|---|---|
| Dados sensíveis identificados | PARCIAL | senha, chaves RSA, credenciais DB |
| Sensíveis fora das respostas | IMPLEMENTADO | `register` retorna só `{id, username}` (`auth-service.ts:30`); nunca password |
| Senhas nunca retornadas | IMPLEMENTADO | `User.password` usado só internamente (`user-repository.ts`) |
| Secrets hardcoded | PARCIAL | `.env`/`.env.example` ok e chaves não versionadas; senhas de roles do banco removidas (migração `1787063356263_drop-app-roles.ts`, P0) |
| Variáveis de ambiente | IMPLEMENTADO | `env.ts` com `required()` |
| Dados em repouso | N/A | sem dados regulados; senhas já protegidas |
| TLS/HTTPS | IMPLEMENTADO | `https.createServer` (`index.ts:19`); certificados dev localhost |
| Credenciais de banco protegidas | IMPLEMENTADO | só em `.env` (não versionado) |
| Logs sem secrets | IMPLEMENTADO | `sanitize` redige `authorization`/`password`/`token` recursivamente (`http-logger.ts:86-98`) |
| Erros não expõem detalhes | IMPLEMENTADO | `globalErrorHandler` — só mensagem, 500 genérico, sem stack (`global-error-handler.ts:34-37`) |

---

## 6. Segurança HTTP/API

| Item | Status | Evidência |
|---|---|---|
| HTTPS | IMPLEMENTADO | servidor HTTPS; cookie `secure` só em produção (`auth-controller.ts:13-16`) |
| CORS configurado | IMPLEMENTADO | `credentials: true` + origin por env (`app.ts:30-34`) |
| CORS não permissivo | IMPLEMENTADO | `*` nunca; default `http://localhost:5173` |
| Security headers | IMPLEMENTADO | `helmet()` (`app.ts:39`) + `Cache-Control: no-store` |
| Content-Type validado | AUSENTE | |
| Métodos HTTP controlados | IMPLEMENTADO | routers só registram métodos usados |
| Limite de payload | IMPLEMENTADO | `express.json({ limit: '100kb' })` explícito + 413/400 (testes em `http-hardening.test.ts`) |
| Request abuse | PARCIAL | só rate-limit |
| Rate limiting | IMPLEMENTADO (P2) | 100 leitura/20 escrita por 15min com chave por `userId` ou IP; login 20 por `username`+IP; flag `RATE_LIMIT_ENABLED` (default off) (`rate-limit.ts`, `auth-router.ts`) |
| Limites p/ endpoints sensíveis | IMPLEMENTADO | `writeLimiter` em register + `loginLimiter` em login (`auth-router.ts:9-11`) |
| Timeout de requests | IMPLEMENTADO | `requestTimeout`/`timeout` 30s + `headersTimeout` 60s (`index.ts`, `REQUEST_TIMEOUT_MS`) |
| Requisições gigantes | IMPLEMENTADO | limite explícito 100kb (413) |

---

## 7. Ataques e vulnerabilidades

| Item | Status | Evidência |
|---|---|---|
| SQL Injection | PROTEGIDO | queries parametrizadas via tagged templates (`user-repository.ts`, `natter-repository.ts`) |
| NoSQL Injection | N/A | Postgres |
| Command Injection | N/A | sem shell/exec |
| XSS | PARCIAL | cookie `httpOnly` + sem `dangerouslySetInnerHTML`/`localStorage` (grep confirma); `msg_text` é retornado cru e nada o renderiza hoje |
| SSRF | N/A | sem chamadas externas |
| Path Traversal | N/A | sem serving de arquivos |
| Deserialization | N/A | JSON nativo |
| Mass assignment | COBERTO | ver §4 |
| BOLA/IDOR | **VULNERÁVEL (leitura)** | ver §3 |
| BFLA | N/A | sem endpoints admin |
| Excessive data exposure | PARCIAL | mensagens expõem `author` (username) — sem excesso grave |
| Unrestricted resource consumption | PARCIAL | rate-limit + 100kb, mas **sem paginação** → `GET /natter/message` pode retornar tudo |
| Security misconfiguration | PARCIAL | senhas de roles no git; README aponta `back/private.pem` mas chaves estão em `back/certs/`; sem `.dockerignore` (chaves entram na imagem se build local); `pg`/`@types/pg` instalados e nunca usados |

---

## 8. Gestão de erros

| Item | Status | Evidência |
|---|---|---|
| Tratamento centralizado | IMPLEMENTADO | `global-error-handler.ts` + `asyncHandler` |
| Formato consistente | IMPLEMENTADO | `{error:{message, details?}}` (`global-error-handler.ts:6-15`) |
| Sem stack trace ao cliente | IMPLEMENTADO | |
| Mensagens sem detalhes internos | IMPLEMENTADO | 500 genérico |
| Códigos HTTP corretos | IMPLEMENTADO | 400/401/404/409/429/500; `HttpError` com factories (`http-error.ts`) |
| Erros de auth tratados | IMPLEMENTADO | 401 uniforme em login e no middleware (sem enumeração) |
| Erros registrados | IMPLEMENTADO | `console.error` com requestId (`global-error-handler.ts:26-31`) |
| Logs sem info sensível | IMPLEMENTADO | redação em `http-logger` |

---

## 9. Observabilidade e auditoria

| Item | Status | Evidência |
|---|---|---|
| Logging estruturado | PARCIAL | consistente e colorido, mas console não-JSON (`http-logger.ts`) |
| Requests rastreáveis | IMPLEMENTADO | `requestId` (UUID) em toda request via AsyncLocalStorage (`request-context-middleware.ts`) |
| Correlation/request ID | IMPLEMENTADO | mesmo `requestId` em logs e na tabela `audit_logs` |
| Eventos de auth registrados | PARCIAL | audit log captura todo request (`audit-middleware.ts`), mas sem evento semântico "login ok/falhou"; senha nunca é logada |
| Falhas de auth registradas | IMPLEMENTADO | audit log grava status + `user_id = anonymous` |
| Falhas de autorização registradas | IMPLEMENTADO | mesmo mecanismo (status 404/401) |
| Alterações críticas auditáveis | PARCIAL | todas as requests vão pra `audit_logs`, mas não há revisão de "operações críticas" em específico |
| Logs com contexto p/ investigação | IMPLEMENTADO | requestId + user + path + status |
| Logs sem dados desnecessários | IMPLEMENTADO | corpos redigidos |
| Métricas | AUSENTE | |
| Alertas | AUSENTE | |

---

## 10. Dependências e infraestrutura

| Item | Status | Evidência |
|---|---|---|
| Processo de atualização | AUSENTE | sem dependabot/renovate |
| Análise de vulnerabilidades | IMPLEMENTADO | `pnpm audit` — **0 vulnerabilidades** (P1); bloqueia no CI |
| Dependências desnecessárias | IMPLEMENTADO | `pg`/`@types/pg` removidos (P1) |
| Docker seguro | IMPLEMENTADO | multi-stage, `pnpm install --frozen-lockfile`, prod-only, `USER node`, `CMD node dist/index.js` (P1) |
| Container não-root | IMPLEMENTADO | `USER node` |
| Secrets na imagem | IMPLEMENTADO | `.dockerignore` exclui `certs/`, `.env`, `node_modules`, `dist` (verificado: imagem sem certs) |
| Config prod/dev separadas | PARCIAL | só via `NODE_ENV` |
| Privilégios minimizados | IMPLEMENTADO (banco) | roles `app_read_write` vs `app_admin` |
| Banco exposto | PARCIAL | porta 5432 publicada no host (`docker-compose.yml:7-8`) — aceitável em dev |
| Serviços internos | N/A | |

---

## 11. Testes de segurança

| Item | Status | Evidência |
|---|---|---|
| Autenticação | IMPLEMENTADO | `app.test.ts:33-80` |
| Autorização | IMPLEMENTADO | ownership write (`app.test.ts:147-170`) |
| Acesso indevido a recursos | IMPLEMENTADO | `bola.test.ts` — listagem e acesso por id (404) |
| Validação de entrada | IMPLEMENTADO (auth) | `input-validation.test.ts` — 9 cenários negativos (400) |
| Endpoints admin | N/A | |
| Rate limiting | IMPLEMENTADO (P2) | `rate-limit.test.ts` — 429 com `Retry-After` (flag `RATE_LIMIT_ENABLED` ativada no arquivo via import dinâmico); chave por `userId` (B não afetado pelo bloqueio de A) e por `username` no login |
| JWT (chave errada/adulterado/expirado/iss/aud) | IMPLEMENTADO (P2) | `jwt.test.ts` — 6 cenários via HTTP (401) |
| Revogação pós-logout | IMPLEMENTADO (P2) | `revocation.test.ts` — reuso bloqueado (401), logout de A não afeta B, idempotência |
| Cenários negativos | IMPLEMENTADO | 400/401/404/409/429 cobertos |
| Integração de segurança | IMPLEMENTADO | supertest sobre `App` real com banco |
| Teste contra vulns conhecidas | AUSENTE | sem OWASP ZAP/trivy etc. |
| Segurança no CI/CD | IMPLEMENTADO | `.github/workflows/ci.yml` — lint → type-check → build → test → `pnpm audit` com Postgres service container |

---

## 12. API design e exposição

| Item | Status | Evidência |
|---|---|---|
| Expõe só o necessário | IMPLEMENTADO | views sem `msg_text` cru no retorno (`natter-types.ts`) |
| Métodos HTTP semânticos | IMPLEMENTADO | POST/GET/PUT/DELETE corretos |
| Autorização consistente | IMPLEMENTADO | `router.use(authenticate)` cobre tudo |
| Paginação limitada | IMPLEMENTADO | `limit` (1–100, default 20) + `offset` validados com zod; `pagination.test.ts` |
| Filtros validados | N/A | |
| Ordenação validada | N/A | |
| Endpoints internos expostos | AUSENTE | |
| Endpoints admin separados | N/A | |
| Versionamento | IMPLEMENTADO (P4) | rotas em `/v1/auth`, `/v1/natter` e `/v1/metrics` |
| Docs sem secrets | IMPLEMENTADO | README/`fluxos.md` sem segredos |

---

## 13. Classificação final

**IMPLEMENTADO (41):** auth JWT RS256 com algoritmo fixo · expiração · **claims iss/aud/jti validados (P2)** · **revogação por deny-list pós-logout (P2)** · bcrypt · cookie HttpOnly/SameSite · helmet · CORS restrito · **rate limit por identidade (userId/IP) e por username no login (P2)** · ownership em escrita e leitura (P0) · **autorização arquitetural RBAC+ABAC com `space_members` e policy centralizada (P4)** · **membros de espaço (add/remove/list) (P4)** · mass assignment coberto · SQLi protegido · **schema validation zod em auth e natter (P0/P1)** · **paginação com limites (P1)** · **payload 100kb explícito + 413 (P1)** · **timeouts (P1)** · erro centralizado/formato único (incl. erros do body-parser) · requestId · redação de logs · audit log · HTTPS · env/`.env.example` · chaves fora do git · **container não-root sem secrets (P1)** · **dependências limpas, `pnpm audit` zero (P1)** · testes de contrato auth+authz · testes BOLA/input-validation/pagination/http-hardening/jwt/revocation/rate-limit · **matriz de autorização (unit + integração) (P4)** · CI/CD com audit de dependências · **eventos de auditoria semânticos (P3)** · **logging JSON estruturado com níveis (P3)** · **suíte de segurança (auth/authz/disclosure) (P3)** · **scanners no CI, trivy/osv-scanner informativos (P3)** · **API versionada `/v1` (P4)** · **métricas por endpoint/status + alerta de anomalia (P4)**.

**PARCIAL (4):** confidencialidade XSS (nada renderiza hoje) · brute force sem lockout progressivo · branch protection no GitHub (bloqueio de merge) · políticas de senha/registro.

**AUSENTE (2):** refresh token · alertas externos (métricas locais com log `metrics_anomaly` existem; integração com e-mail/Slack/etc. não).

**N/A (6):** NoSQLi · command injection · SSRF · path traversal · deserialization · BFLA/admin.

**INCERTO:** nenhum item relevante.

---

## 14. Resultado da auditoria

### Vulnerabilidades encontradas

1. **[MÉDIO] BOLA/IDOR de leitura** — **CORRIGIDO (P0)**: reads filtrados por owner/author; recurso alheio → 404; regressão em `src/security/bola.test.ts`.
2. **[BAIXO] Sem revogação de token** — **CORRIGIDO (P2)**: `jti` por login + deny-list `token_denylist`; logout revoga; reuso pós-logout → 401 (`security/revocation.test.ts`).
3. **[BAIXO] Sem paginação + rate limit por IP** — **CORRIGIDO**: paginação (P1) + rate limit por identidade com limite de login por username (P2). Resta lockout progressivo (opcional).

### Misconfigurations encontradas

- Senhas de roles do banco versionadas na migração — **CORRIGIDO (P0)**: migração `1787063356263_drop-app-roles` remove as roles (up/down verificados).
- Dockerfile com `npm install`/dev CMD/sem `.dockerignore` — **CORRIGIDO (P1)**: multi-stage, lockfile, prod-only, non-root, secrets fora da imagem.
- Docs drift: `fluxos.md` descreve front que não corresponde ao código atual; README aponta caminho de chaves errado (`back/private.pem` vs `back/certs/`). **CORRIGIDO (P2)**: `fluxos.md` e README atualizados (rotas do App.tsx, `data.error?.message`, `certs/`, contrato JWT, rate limiting).
- ~~`pg`/`@types/pg` instalados e não usados~~ — **CORRIGIDO (P1)**: removidos; `pnpm audit` = 0 vulnerabilidades.

### Débitos de segurança

- ~~Validação zero em register/login~~ — **CORRIGIDO (P0)** com zod (`auth-schemas.ts`).
- Sem testes para caminhos 400 — **CORRIGIDO (P0)** (`input-validation.test.ts`).
- Sem CI — **CORRIGIDO (P0)** (`.github/workflows/ci.yml`).

### Quick wins (1–2h)

- ~~Filtrar leituras por autor/owner + teste de regressão (BOLA)~~ — feito (P0).
- ~~Validar register/login (strings não vazias, limites) + teste 400~~ — feito (P0, zod).
- ~~`.dockerignore` + `pnpm install --frozen-lockfile` + `CMD ["pnpm","start"]` no Dockerfile~~ — feito (P1, multi-stage).
- ~~Remover `pg`/`@types/pg`; adicionar `pnpm audit`~~ — feito (P0/P1, zero vulnerabilidades).
- ~~Remover senhas das migrações~~ — feito (P0).

### Riscos críticos

Nenhum para o estágio atual (estudo local, sem dados reais).

### Recomendações de médio prazo

- ~~Paginação (limit/offset) com limites e validação~~ — feito (P1).
- ~~Revogação: deny-list de jti~~ — feito (P2): tabela `token_denylist`, logout insere jti, authenticate rejeita (testes `security/revocation.test.ts`).
- ~~Rate limit por usuário (não só IP)~~ — feito (P2): chave por `userId`/IP + limite de login por username (testes `security/rate-limit.test.ts`). Lockout progressivo: não implementado (opcional no plano).
- ~~CI com lint → type-check → build → test → `pnpm audit`~~ — feito (P0).
- ~~Logs JSON estruturados com nível/severidade~~ — feito (P3): `http-logger` em JSON, `LOG_LEVEL`, redação, `global-error-handler` estruturado (`security/logging.test.ts`).
- ~~Eventos de auditoria semânticos~~ — feito (P3): tabela `security_events`, eventos `AUTH_*`/`AUTHZ_DENIED`/`RESOURCE_*` via `SecurityEventLogger` (`security/audit-events.test.ts`).
- ~~Scanners no CI~~ — feito (P3): Trivy (imagem) + osv-scanner; informativos (não bloqueiam) por decisão do projeto acadêmico.

### Recomendações estruturais

- Introduzir validação de schema (ex.: zod) substituindo os guards manuais — cobre body, params e query com uma fonte.
- ~~Decidir a estratégia de autorização antes de crescer features~~ — **feito (P4)**: RBAC+ABAC híbrido, `space_members`, policy centralizada em `src/shared/authz/authz.ts` e matriz de autorização (`authz.test.ts` + `authz-matrix.test.ts`).
- Extrair a política de segurança (CORS, cookie, headers, limites) para um módulo de configuração único e testável, hoje espalhada entre `app.ts` e `auth-controller.ts`.
