# Plano de Segurança — Natter API Security (continuação)

Documento de continuidade do plano de hardening. Objetivo: permitir retomar o trabalho em qualquer sessão/máquina apenas lendo este arquivo e o relatório de auditoria (`auditoria.md`).

## Estado atual (2026-08-18)

- Branch: `security/hardening` (16 commits, todos pushados).
- Fase 0 + P0 + P1 + **P2 concluídas**. 44 testes verdes, lint/type-check/build OK, `pnpm audit` = 0 vulnerabilidades.
- Suíte de segurança em `back/src/security/`: `bola.test.ts`, `input-validation.test.ts`, `pagination.test.ts`, `http-hardening.test.ts`, `jwt.test.ts`, `revocation.test.ts`, `rate-limit.test.ts`.
- CI: `.github/workflows/ci.yml` (lint → type-check → build → test → `pnpm audit`, Postgres service container, chaves RSA geradas via openssl).
- Docker: imagem multi-stage, non-root, sem secrets (`.dockerignore` exclui `certs/` e `.env`).
- PR para `developer` **pendente de abrir** (gh CLI não instalado na máquina original; abrir via
  https://github.com/Jefferson-Tenorio/api-security-in-action-typescript/pull/new/security/hardening ).
- Issues do GitHub a partir da auditoria: **não criadas** (mesmo motivo).
- Docs drift (`fluxos.md` + README certs path): **CORRIGIDO (P2)**.

### Como retomar em outra máquina

```bash
git fetch origin
git checkout security/hardening
cd back && pnpm install
# Postgres local (docker-compose up -d) + migrações (pnpm migrate:up)
pnpm test:run
```

## Regra de execução (todas as fases)

Cada item segue sempre:

```
AUDIT → REPRODUCE → FIX → TEST → VERIFY → DOCUMENT
```

- Toda correção começa com um teste que reproduz a falha (RED) e termina com o teste na suíte permanente (GREEN).
- Nenhuma mudança de segurança é considerada concluída sem teste ou evidência correspondente.
- Nenhuma feature marcada como implementada por existir biblioteca/nome sugestivo: evidência de uso obrigatória.
- Commits convencionais (`fix:`, `feat:`, `refactor:`, `chore:`, `docs:`, `ci:`, `test:`), push por item concluído.

---

## Fase P2 — Fortalecer autenticação

### P2.11 — Claims do JWT (`iss`, `aud`, `jti`)

- [x] `env.ts`: `jwt.issuer` (`JWT_ISSUER`, default `natter-api`) e `jwt.audience` (`JWT_AUDIENCE`, default `natter-web`).
- [x] `jwt-service.ts` (`sign`): payload inclui `iss`, `aud`, `jti` (uuid) — além de `userId`/`username`.
- [x] `verify`: valida `issuer`/`audience` via opções do `jsonwebtoken`; retorno tipado inclui `jti` (`VerifiedToken`).
- [x] `authenticate-middleware.ts`: interface inalterada (o `verify` já rejeita claims inválidos).
- [x] Contrato do token (claims, TTL) documentado no README e em `fluxos.md` §4.
- [x] Testes (`security/jwt.test.ts`): chave errada → 401 · adulterado → 401 · expirado → 401 · `iss` errado → 401 · `aud` errado → 401 · claims `iss`/`aud`/`jti` presentes no login real.

### P2.12 — Revogação: `jti` + deny-list

Estratégia escolhida: deny-list em tabela (mais simples que refresh token rotation; adequado ao estudo).

- [x] Migração `1787065297877_token-denylist.ts`: tabela `token_denylist` (`jti` PK, `user_id`, `expires_at TIMESTAMPTZ`, `created_at`, índice em `expires_at`).
- [x] `TokenDenylistRepository` (`token-denylist-repository.ts`) com `add(jti, userId, expiresAt)` (idempotente, `ON CONFLICT DO NOTHING`) e `isDenied(jti)` (filtra `expires_at > now()` — expirados ignorados, sem job de limpeza).
- [x] `AuthModule` injeta o repository no `authenticate` (via `createAuthenticate(tokenService, denylist)`).
- [x] `authenticate`: após `verify`, consulta deny-list; `jti` presente → 401 (`Invalid or expired token`).
- [x] `logout` (service): extrai `jti` do cookie, insere na deny-list com TTL = `exp` do token, limpa cookie; idempotente sem token.
- [x] Limpeza: lazy via `expires_at > now()` no `isDenied` (sem job — decisão registrada).
- [x] Testes (`security/revocation.test.ts`): reuso pós-logout → 401 · logout de A não afeta B · logout sem token 200 · logout duplo idempotente.

### P2.13 — Rate limit por identidade + brute force

- [x] Bypass de teste desacoplado: `RATE_LIMIT_ENABLED` (env) no lugar de `NODE_ENV === 'test'`; default **off** (suíte existente intacta); `rate-limit.test.ts` ativa a flag antes do import dinâmico do `App`.
- [x] `keyGenerator` por identidade: `userId` de `requestContext.getUser()` quando autenticado; IP quando anônimo.
- [x] Limite específico de login: chave `login:{username}:{ip}` (`loginLimiter`, 20/15min) no `AuthRouter`.
- [x] Handler customizado: 429 no formato `{error:{message}}` + header `Retry-After`.
- [x] Limites documentados no README (valores e janelas).
- [x] Testes (`security/rate-limit.test.ts`): login além do limite → 429 + `Retry-After` · username diferente não afetado · escrita autenticada chaveada por `userId` (A bloqueado, B mesmo IP ok).
- [ ] Lockout progressivo (opcional): **não implementado** — decisão: o limite fixo por username já mitiga brute force no estudo; fica como melhoria futura.

---

## Fase P3 — Security engineering

### P3.14 — Suíte de testes de segurança (estrutura)

Já existe `back/src/security/`; completar com:

```text
security/
├── authentication.test.ts   (401, token inválido/expired)
├── authorization.test.ts    (ownership write + read)
├── bola.test.ts             ✔ existente
├── input-validation.test.ts ✔ existente
├── pagination.test.ts       ✔ existente
├── http-hardening.test.ts   ✔ existente
├── rate-limit.test.ts       (após P2.13)
├── jwt.test.ts              (após P2.11)
├── revocation.test.ts       (após P2.12)
└── information-disclosure.test.ts (erros não vazam stack; redação em logs; senha nunca nas respostas)
```

- [x] Testes de enumeração de usuários (register 409 vs login 401 — sem vazamento indevido).
- [x] Testes de exposição de informação (respostas de erro 400/401/404/409/429/500 com formato consistente).

### P3.15 — Eventos de auditoria semânticos

- [x] Separar request logging de security events.
- [x] Criar evento explícito por ação: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_LOGOUT`, `AUTHZ_DENIED`, `RESOURCE_CREATED`, `RESOURCE_UPDATED`, `RESOURCE_DELETED`.
- [x] Campos: `actor` (userId), `action`, `resource`, `outcome`, `requestId`, `timestamp`.
- [x] Nunca registrar senha/token (redação já existe no `http-logger`; aplicar também no novo logger de eventos).
- [x] Definir retenção dos audit logs (política + limpeza).

### P3.16 — Logging estruturado (JSON)

- [x] Migrar `http-logger.ts` para saída JSON (uma linha por evento).
- [x] Níveis: `debug`, `info`, `warn`, `error` (via env `LOG_LEVEL`).
- [x] Campos comuns: `requestId`, `userId` (quando disponível), `status`, `durationMs`, `method`, `path`.
- [x] Manter redaction centralizado (`sanitize`).
- [x] `global-error-handler` loga como `error` estruturado.

### P3.17 — CI/CD e scanners

- [x] CI atual já cobre lint/type-check/build/test/`pnpm audit`. Adicionar:
- [x] Scanner de container (ex.: Trivy) na imagem do Dockerfile.
- [x] Scanner de dependências em profundidade (ex.: `pnpm audit` já; avaliar `osv-scanner`).
- [ ] Bloquear merge quando checks críticos falharem (branch protection em `developer`/`main`).

---

## Fase P4 — Autorização arquitetural

> Só depois de P0–P3. A auditoria registra que ownership simples não escala para recursos compartilhados (spaces com múltiplos membros).

- [ ] Definir modelo: RBAC (roles), ABAC (per-recurso) ou combinação — decisão registrada em docs.
- [ ] Definir roles e permissions/scopes.
- [ ] Definir ownership e recursos compartilháveis (ex.: membros de um space).
- [ ] Centralizar policy checks em um módulo único (ex.: `shared/authz/`) com helpers testáveis.
- [ ] Testes de matriz de autorização (usuário × recurso × ação → ALLOW/DENY).
- [ ] Versionamento da API (`/v1`) antes de expor público.
- [ ] Métricas (ex.: contadores por endpoint/status) e alertas de comportamento anômalo.

---

## Pendências de documentação/limpeza (qualquer fase)

- [x] Corrigir `fluxos.md` (front atual: `App.tsx` tem `/home`; front lê `data.error?.message`) — **feito (P2)**.
- [x] Corrigir README (caminho das chaves: `back/certs/`; contrato JWT e rate limiting) — **feito (P2)**.
- [ ] Criar issues no GitHub a partir da auditoria (instalar `gh`).
- [ ] Abrir PR `security/hardening` → `developer`.