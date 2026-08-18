# Plano de Segurança — Natter API Security (continuação)

Documento de continuidade do plano de hardening. Objetivo: permitir retomar o trabalho em qualquer sessão/máquina apenas lendo este arquivo e o relatório de auditoria (`auditoria.md`).

## Estado atual (2026-08-18)

- Branch: `security/hardening` (12 commits, todos pushados).
- Fase 0 + P0 + P1 concluídas. 31 testes verdes, lint/type-check/build OK, `pnpm audit` = 0 vulnerabilidades.
- Suíte de segurança em `back/src/security/`: `bola.test.ts`, `input-validation.test.ts`, `pagination.test.ts`, `http-hardening.test.ts`.
- CI: `.github/workflows/ci.yml` (lint → type-check → build → test → `pnpm audit`, Postgres service container, chaves RSA geradas via openssl).
- Docker: imagem multi-stage, non-root, sem secrets (`.dockerignore` exclui `certs/` e `.env`).
- PR para `developer` **pendente de abrir** (gh CLI não instalado na máquina original; abrir via
  https://github.com/Jefferson-Tenorio/api-security-in-action-typescript/pull/new/security/hardening ).
- Issues do GitHub a partir da auditoria: **não criadas** (mesmo motivo).
- Docs drift pendente: `fluxos.md` descreve front que não corresponde ao código; README aponta chaves em `back/private.pem` mas estão em `back/certs/`.

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

- [ ] `env.ts`: adicionar `jwt.issuer` (`JWT_ISSUER`, default `natter-api`) e `jwt.audience` (`JWT_AUDIENCE`, default `natter-web`).
- [ ] `jwt-service.ts` (`sign`): payload passa a incluir `iss`, `aud`, `jti` (uuid) — além de `userId`/`username`.
- [ ] `verify`: validar `issuer`, `audience` via opções do `jsonwebtoken`; retorno tipado inclui `jti`.
- [ ] `authenticate-middleware.ts`: nada muda na interface (o `verify` já rejeita claims inválidos).
- [ ] Documentar o contrato do token (claims, TTL) no README ou docs.
- [ ] Testes (`security/jwt.test.ts`):
  - [ ] token assinado com chave errada → 401.
  - [ ] token adulterado (payload alterado) → 401.
  - [ ] token expirado (`expiresIn` curto via env de teste) → 401.
  - [ ] token com `iss` errado → 401.
  - [ ] token com `aud` errado → 401.

### P2.12 — Revogação: `jti` + deny-list

Estratégia escolhida: deny-list em tabela (mais simples que refresh token rotation; adequado ao estudo).

- [ ] Migração nova: tabela `token_denylist` (`jti` PK, `user_id`, `expires_at TIMESTAMPTZ`, criada com `created_at`).
- [ ] Novo `TokenDenylistRepository` (módulo auth) com `add(jti, userId, expiresAt)` e `isDenied(jti)`.
- [ ] `AuthModule` injeta o repository no `authenticate` (via `createAuthenticate(tokenService, denylist)`).
- [ ] `authenticate`: após `verify`, consulta deny-list; se `jti` presente → 401 (`Invalid or expired token`).
- [ ] `logout` (controller/service): extrai `jti` do cookie, insere na deny-list com TTL = `env.jwt.expiresInMs`, limpa cookie.
- [ ] Limpeza periódica: opcional — `DELETE WHERE expires_at < NOW()` no boot ou lazy check no `isDenied` (query com `expires_at > now()`).
- [ ] Testes (`security/revocation.test.ts`):
  - [ ] após logout, o mesmo token → 401 (reuso bloqueado).
  - [ ] token de outro usuário não é afetado pelo logout.
  - [ ] registro de `jti` duplicado não quebra (idempotência).

### P2.13 — Rate limit por identidade + brute force

- [ ] Desacoplar bypass de teste: `rate-limit.ts` passa a usar `RATE_LIMIT_ENABLED` (env) em vez de `NODE_ENV === 'test'`, para permitir testes reais de 429.
- [ ] `keyGenerator` por identidade: `userId` de `requestContext.getUser()` quando autenticado; IP quando anônimo.
- [ ] Limite específico de login: por username além de IP (key `login:{username}`), via `keyGenerator` customizado no `AuthRouter`.
- [ ] Lockout progressivo (opcional): penalidade crescente após N falhas por username.
- [ ] Documentar limites (valores e janelas) no README.
- [ ] Testes (`security/rate-limit.test.ts`): ultrapassar limite → 429 com `Retry-After`; endpoints não sensíveis não afetados.

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

- [ ] Testes de enumeração de usuários (register 409 vs login 401 — sem vazamento indevido).
- [ ] Testes de exposição de informação (respostas de erro 400/401/404/409/429/500 com formato consistente).

### P3.15 — Eventos de auditoria semânticos

- [ ] Separar request logging de security events.
- [ ] Criar evento explícito por ação: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_LOGOUT`, `AUTHZ_DENIED`, `RESOURCE_CREATED`, `RESOURCE_UPDATED`, `RESOURCE_DELETED`.
- [ ] Campos: `actor` (userId), `action`, `resource`, `outcome`, `requestId`, `timestamp`.
- [ ] Nunca registrar senha/token (redação já existe no `http-logger`; aplicar também no novo logger de eventos).
- [ ] Definir retenção dos audit logs (política + limpeza).

### P3.16 — Logging estruturado (JSON)

- [ ] Migrar `http-logger.ts` para saída JSON (uma linha por evento).
- [ ] Níveis: `debug`, `info`, `warn`, `error` (via env `LOG_LEVEL`).
- [ ] Campos comuns: `requestId`, `userId` (quando disponível), `status`, `durationMs`, `method`, `path`.
- [ ] Manter redaction centralizado (`sanitize`).
- [ ] `global-error-handler` loga como `error` estruturado.

### P3.17 — CI/CD e scanners

- [ ] CI atual já cobre lint/type-check/build/test/`pnpm audit`. Adicionar:
- [ ] Scanner de container (ex.: Trivy) na imagem do Dockerfile.
- [ ] Scanner de dependências em profundidade (ex.: `pnpm audit` já; avaliar `osv-scanner`).
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

- [ ] Corrigir `fluxos.md` (front atual: `App.tsx` tem `/home`; front lê `data.error?.message`).
- [ ] Corrigir README (caminho das chaves: `back/certs/`).
- [ ] Criar issues no GitHub a partir da auditoria (instalar `gh`).
- [ ] Abrir PR `security/hardening` → `developer`.