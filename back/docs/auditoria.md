# Auditoria de Features de API Security

Projeto: Natter — API Security in Action (TypeScript)
Data: 2026-08-18 (atualizada em 2026-08-18 — correções P0 aplicadas na branch `security/hardening`)

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
| Testes | `back/src/app.test.ts` — 9 testes de contrato (vitest + supertest), 100% verdes |
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
| Revogação/invalidação | AUSENTE | `logout` só limpa o cookie; sem blacklist/deny-list — JWT continua válido até expirar |
| Validação de assinatura | IMPLEMENTADO | `verifyToken` com chave pública (`jwt-service.ts:26-28`) |
| Algoritmo explicitamente validado | IMPLEMENTADO | `algorithms: ['RS256']` (`jwt-service.ts:28`) |
| Claims validados | PARCIAL | só assinatura; sem `iss`/`aud`/`jti` |
| Proteção contra reuso de tokens | AUSENTE | sem `jti`/registro de uso |
| Credenciais seguras em repouso | IMPLEMENTADO | `bcrypt.hash(password, 10)` (`auth-service.ts:27`) |
| Proteção brute force | PARCIAL | rate-limit IP-only (`writeLimiter`, 20/15min, `rate-limit.ts`), sem lockout por conta, sem atraso adaptativo |
| Política p/ endpoints sensíveis | IMPLEMENTADO | `/natter` todo exige cookie (`natter-router.ts:10`); login/register limitados |

Gaps: sem refresh token, sem revogação, sem lockout por conta; `register`/`login` sem validação de entrada (username/password vazios → erro de banco 500 em vez de 400, já que `users.username` é `VARCHAR(50)`).

---

## 3. Autorização e controle de acesso

| Item | Status | Evidência |
|---|---|---|
| Autorização além da autenticação | IMPLEMENTADO | ownership em SQL (`natter-repository.ts:31-44,79-88`; teste em `app.test.ts:147-170`) |
| Roles/perfis | AUSENTE (só no banco) | roles `app_read_write`/`app_admin` existem só na migração (`migrations/1777260392910_create-users-table.ts:30-31`) |
| Permissions/scopes | AUSENTE | |
| RBAC | AUSENTE | |
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
| Inputs validados | PARCIAL | auth validado com zod (P0); natter ainda com guards manuais |
| Schema validation | PARCIAL | zod em `auth-schemas.ts` (register/login, strict); natter pendente |
| Body validado | PARCIAL | `auth-schemas.ts` (zod) + `natter-validation.ts:3-29` |
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
| Limite de payload | PARCIAL | default 100kb implícito do `express.json` |
| Request abuse | PARCIAL | só rate-limit |
| Rate limiting | IMPLEMENTADO | 100 leitura/20 escrita por 15min (`rate-limit.ts:21-22`) |
| Limites p/ endpoints sensíveis | IMPLEMENTADO | `writeLimiter` em login/register (`auth-router.ts:8-9`) |
| Timeout de requests | AUSENTE | nenhum `server.timeout`/timeout por handler |
| Requisições gigantes | PARCIAL | só o default do body parser |

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
| Análise de vulnerabilidades | PARCIAL | `pnpm audit --audit-level high` no CI (`.github/workflows/ci.yml`) |
| Dependências desnecessárias | PARCIAL | `pg` e `@types/pg` mortos (`package.json`, nenhum import) — remoção pendente |
| Docker seguro | PARCIAL | imagem oficial `node:22-alpine`, `USER node` (não-root) ✔; **sem `.dockerignore`** (node_modules/chaves do host podem entrar), `npm install` sem lockfile, `CMD` roda servidor dev (`Dockerfile:5-9`) |
| Container não-root | IMPLEMENTADO | `USER node` |
| Secrets na imagem | PARCIAL | `COPY . .` + sem `.dockerignore` → `certs/private.pem` iria para a imagem |
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
| Rate limiting | AUSENTE | limiter é bypass em teste (`rate-limit.ts:5-9`) |
| Cenários negativos | PARCIAL | 401/404/409 cobertos |
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
| Paginação limitada | AUSENTE | lists sem limit/offset |
| Filtros validados | N/A | |
| Ordenação validada | N/A | |
| Endpoints internos expostos | AUSENTE | |
| Endpoints admin separados | N/A | |
| Versionamento | AUSENTE | sem `/v1` |
| Docs sem secrets | IMPLEMENTADO | README/`fluxos.md` sem segredos |

---

## 13. Classificação final

**IMPLEMENTADO (22):** auth JWT RS256 com algoritmo fixo · expiração · bcrypt · cookie HttpOnly/SameSite · helmet · CORS restrito · rate limit · ownership em escrita **e leitura (P0)** · mass assignment coberto · SQLi protegido · parsing de id · **validação zod em auth (P0)** · erro centralizado/formato único · requestId · redação de logs · audit log · HTTPS · env/`.env.example` · chaves fora do git · container não-root · testes de contrato auth+authz · **testes BOLA e input validation (P0)** · **CI/CD com audit de dependências (P0)**.

**PARCIAL (8):** claims JWT · validação de entrada (natter ainda com guards manuais) · payload size implícito · logs não-JSON · audit sem eventos semânticos · Dockerfile (lockfile/dockerignore/dev CMD) · dependências mortas · confidencialidade XSS (nada renderiza hoje).

**AUSENTE (12):** refresh token · revogação · RBAC/scopes · timeout · paginação · métricas · alertas · CI/CD · audit de dependências · testes de validação/rate-limit · versionamento · política de senha/validação de registro.

**N/A (6):** NoSQLi · command injection · SSRF · path traversal · deserialization · BFLA/admin.

**INCERTO:** nenhum item relevante.

---

## 14. Resultado da auditoria

### Vulnerabilidades encontradas

1. **[MÉDIO] BOLA/IDOR de leitura** — **CORRIGIDO (P0)**: reads filtrados por owner/author; recurso alheio → 404; regressão em `src/security/bola.test.ts`.
2. **[BAIXO] Sem revogação de token** — logout é cosmético; JWT sobrevive 15min. Pendente (Fase P2: `jti` + deny-list).
3. **[BAIXO] Sem paginação + rate limit por IP** — consumo de recurso sem fronteiras; limitador contornável por rotação de IP. Pendente (Fase P1/P2).

### Misconfigurations encontradas

- Senhas de roles do banco versionadas na migração — **CORRIGIDO (P0)**: migração `1787063356263_drop-app-roles` remove as roles (up/down verificados).
- Sem `.dockerignore` + `npm install` sem lockfile + CMD dev no Dockerfile. Pendente (Fase P1).
- Docs drift: `fluxos.md` descreve front que não corresponde ao código atual; README aponta caminho de chaves errado (`back/private.pem` vs `back/certs/`). Pendente.
- `pg`/`@types/pg` instalados e não usados. Pendente (Fase P1).

### Débitos de segurança

- ~~Validação zero em register/login~~ — **CORRIGIDO (P0)** com zod (`auth-schemas.ts`).
- Sem testes para caminhos 400 — **CORRIGIDO (P0)** (`input-validation.test.ts`).
- Sem CI — **CORRIGIDO (P0)** (`.github/workflows/ci.yml`).

### Quick wins (1–2h)

- ~~Filtrar leituras por autor/owner + teste de regressão (BOLA)~~ — feito (P0).
- ~~Validar register/login (strings não vazias, limites) + teste 400~~ — feito (P0, zod).
- `.dockerignore` + `pnpm install --frozen-lockfile` + `CMD ["pnpm","start"]` no Dockerfile.
- Remover `pg`/`@types/pg`; ~~adicionar script `pnpm audit`~~ — feito (P0, no CI).
- ~~Remover senhas das migrações~~ — feito (P0).

### Riscos críticos

Nenhum para o estágio atual (estudo local, sem dados reais).

### Recomendações de médio prazo

- Paginação (limit/offset) com limites e validação.
- Revogação: lista de deny (jti/blacklist) ou refresh token com rotação.
- Rate limit por usuário (não só IP) + lockout por conta em login.
- GitHub Actions: lint → type-check → build → test → `pnpm audit`.
- Logs JSON estruturados com nível/severidade.

### Recomendações estruturais

- Introduzir validação de schema (ex.: zod) substituindo os guards manuais — cobre body, params e query com uma fonte.
- Decidir a estratégia de autorização antes de crescer features: RBAC (roles na app) ou per-recurso (ABAC) — hoje só existe ownership de escrita, o que não escala para `spaces` compartilhados.
- Extrair a política de segurança (CORS, cookie, headers, limites) para um módulo de configuração único e testável, hoje espalhada entre `app.ts` e `auth-controller.ts`.
