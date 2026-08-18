# Semantic Audit — Natter API Security

Escopo: monorepo `back/` (Express + TypeScript + PostgreSQL) e `front/` (React + Vite).
Método: auditoria semântica em 12 passos — mapeamento, vocabulário, rastreamento, comparação de representações, contratos, fronteiras, domínio, testes como evidência.

## Regra de ouro

Cada finding segue o formato:

```
Evidência encontrada → Interpretação → Hipótese
```

Apenas a primeira coluna é fato. A segunda é justificada no código. A terceira precisa de validação antes de virar recomendação.

## Priorização

- **P0** — risco/erro estrutural
- **P1** — quebra de contrato ou domínio
- **P2** — inconsistência relevante
- **P3** — clareza/manutenibilidade

---

## P1 — Quebra de contrato ou domínio

### F-01 — Identidade de autor/owner definida pelo cliente, não pela sessão

- **Evidência:** `back/src/modules/natter/natter-validation.ts:9-11` exige `author` no payload de message; `:21` exige `owner` no payload de space. Em paralelo, `back/src/shared/auth/auth-middleware.ts:17-19` já grava a identidade verificada do token em `store.user`.
- **Interpretação:** a fronteira controller→service aceita identidade fornecida pelo cliente, enquanto o sistema já possui identidade confiável na sessão (`requestContext`).
- **Hipótese:** o campo `author`/`owner` enviado pelo cliente é usado como identidade — permitindo forjar `author: "admin"` em qualquer request autenticado.
- **Impacto:** violação de fronteira de camada; falsificação de identidade (P1 de segurança).
- **Arquivos afetados:** `natter-validation.ts`, `natter-controller.ts`, `natter-service.ts`, `natter-repository.ts`, `auth-middleware.ts`.
- **Recomendação:** derivar `author`/`owner` de `store.user.userId`/`username` no service; remover esses campos do contrato de entrada; validar apenas os campos restantes.

### F-02 — Sem checagem de ownership em update/delete

- **Evidência:** `back/src/modules/natter/natter-service.ts:17-23` (`deleteMessage`/`deleteSpace`) e `:51-54` (`updateMessage`) não recebem o usuário da sessão; `back/src/modules/natter/natter-repository.ts:32-43` e `:78-86` executam `DELETE`/`UPDATE ... WHERE id = $1` sem condição de dono.
- **Interpretação:** qualquer usuário autenticado pode alterar/apagar recurso de qualquer outro.
- **Hipótese:** os endpoints de escrita não verificam se `author`/`owner` do recurso pertence à sessão corrente.
- **Impacto:** quebra de autorização (broken object level authorization).
- **Arquivos afetados:** `natter-service.ts`, `natter-repository.ts`, `natter-controller.ts`.
- **Recomendação:** incluir a identidade da sessão na query (`WHERE id = $1 AND author = $2`) ou verificar no service; retornar 404 (não 403) para evitar enumeração.

### F-03 — Modelo de roles do banco declarado, mas nunca aplicado

- **Evidência:** `back/migrations/1777260392910_create-users-table.ts:26-36` cria roles `app_read_write`/`app_admin` e users `app_user`/`admin_user`; `back/src/shared/db/db.ts:7-8` conecta `dbUser` e `dbAdmin` a partir de `DATABASE_URL` e `DATABASE_URL_ADMIN`, que no `.env` apontam para a mesma URL (`postgres://admin:admin@...` — superuser).
- **Interpretação:** o modelo de privilégios mínimo (app_user = leitura/escrita básica; admin_user = admin) não é exercitado: toda a aplicação roda como superuser.
- **Hipótese:** o TODO em `db.ts` ("organizar a parte de autenticação de rotas") reflete que a separação de conexões está incompleta.
- **Impacto:** autorização declarada é ficção; qualquer vulnerabilidade de SQL/regra de negócio opera com privilégios totais.
- **Arquivos afetados:** `migrations/1777260392910_create-users-table.ts`, `src/shared/db/db.ts`, `.env`.
- **Recomendação:** quando a separação de roles for implementada, apontar `DATABASE_URL` para `app_user` e `DATABASE_URL_ADMIN` para `admin_user`; enquanto não for, remover a duplicação enganosa e documentar.

### F-04 — Contrato de erro quebrado no frontend

- **Evidência:** `back/src/shared/error/global-error-handler.ts:6-14` (`buildErrorBody`) serializa erros como `{error: {message}}`; `front/src/pages/auth/Login.tsx:23` e `front/src/pages/auth/Register.tsx:20` leem `data.message`.
- **Interpretação:** o front espera `{message}`, a API entrega `{error:{message}}` — `data.message` é `undefined` e o estado de erro nunca é exibido.
- **Hipótese:** a UI de erro de login/register está morta desde o início.
- **Impacto:** usuário não vê "Invalid credentials" nem "Username already exists".
- **Arquivos afetados:** `front/src/pages/auth/Login.tsx`, `front/src/pages/auth/Register.tsx`.
- **Recomendação:** ler `data.error.message` (ou criar um helper de parse de erro no front).

### F-05 — Fluxo de login aponta para rota inexistente

- **Evidência:** `front/src/pages/auth/Login.tsx:20` → `navigate('/home')`; `front/src/App.tsx:9-12` registra apenas `/`, `/login`, `/register`.
- **Interpretação:** após login bem-sucedido o React Router não encontra `/home`.
- **Hipótese:** o usuário cai em tela em branco após logar.
- **Impacto:** fluxo principal do produto quebrado.
- **Arquivos afetados:** `Login.tsx`, `App.tsx`.
- **Recomendação:** criar rota `/home` (ou redirecionar `/home` → `/`).

---

## P2 — Inconsistência relevante

### F-06 — Contrato assimétrico: request `content` (camelCase) vs response `msg_text` (snake_case)

- **Evidência:** `back/src/modules/natter/natter-types.ts:3` define `content`; `back/migrations/1777260392910_create-users-table.ts:47` cria a coluna `msg_text`; `back/src/modules/natter/natter-repository.ts:13-17,78-85` mapeia `content` na entrada mas devolve `RETURNING *` (shape do banco) na saída.
- **Interpretação:** o mesmo conceito tem nomes diferentes dependendo da direção do fluxo.
- **Hipótese:** consumidores da API recebem `msg_text` mas o frontend (quando consumir) terá que traduzir de volta para `content`.
- **Impacto:** contrato instável e ambíguo.
- **Arquivos afetados:** `natter-types.ts`, `natter-repository.ts`, migrations.
- **Recomendação:** padronizar o shape de resposta (mapper repo→domain) ou adotar um único nome.

### F-07 — GET `/natter/message` devolve shape diferente de GET `/natter/message/:id`

- **Evidência:** `back/src/modules/natter/natter-repository.ts:45-51` seleciona apenas `m.id, m.msg_time, m.msg_text`; `:61-67` faz `SELECT *`.
- **Interpretação:** listagem e detalhe divergem em campos (`author`, `space_id` ausentes na listagem).
- **Hipótese:** consumidor não pode confiar em um shape único para o mesmo recurso.
- **Impacto:** quebra de contrato de leitura.
- **Arquivos afetados:** `natter-repository.ts`.
- **Recomendação:** unificar o SELECT da listagem com o do detalhe (ou documentar a projeção).

### F-08 — 422 para recurso inexistente

- **Evidência:** `back/src/modules/natter/natter-service.ts:27,33,40,47` lançam `HttpError.unprocessable('Entity not found')` quando o repositório retorna `null`.
- **Interpretação:** 422 significa "payload semanticamente inválido"; recurso ausente é 404.
- **Hipótese:** o uso de 422 mascara a semântica de "não encontrado" no contrato HTTP.
- **Impacto:** clientes não conseguem distinguir validação de ausência.
- **Arquivos afetados:** `natter-service.ts`.
- **Recomendação:** usar `HttpError.notFound` para recursos ausentes em `findById*`/`findAll*`.

### F-09 — Estado de sessão inexistente no frontend; API principal não exercitada

- **Evidência:** `front/src/pages/auth/hooks/useAuth.ts` está vazio (0 linhas); `front/src/pages/Home.tsx` não faz nenhuma chamada a `/natter/*`; o cookie `token` expira em 15min (`back/src/shared/auth/auth-controller.ts` `maxAge: 1000*60*15`) sem qualquer tratamento de expiração no front.
- **Interpretação:** o front só sabe logar; não sabe se está logado, não consome os recursos que a API oferece.
- **Hipótese:** os endpoints `/natter/*` nunca foram exercitados pela UI — bugs de autorização/cookie só aparecerão quando o front consumi-los.
- **Impacto:** o caso de uso principal do sistema não é coberto pela aplicação real.
- **Arquivos afetados:** `useAuth.ts`, `Home.tsx`, `Login.tsx`, `auth-controller.ts`.
- **Recomendação:** implementar estado de autenticação (hook) e tela Home consumindo `/natter/*` com `credentials: 'include'`.

### F-10 — Credenciais em log

- **Evidência:** `back/src/shared/http/http-logger.ts:35-42` serializa `req.body` no log de request — em `POST /auth/login` isso inclui a senha em claro.
- **Interpretação:** credenciais são persistidas em stdout/console.
- **Hipótese:** qualquer leitura de logs expõe senhas.
- **Impacto:** vazamento de credenciais (P1 de segurança, P2 de higiene).
- **Arquivos afetados:** `http-logger.ts`.
- **Recomendação:** redigir `password` (e campos sensíveis) antes de logar o body.

### F-17 — Zero testes no monorepo

- **Evidência:** `glob **/*.{test,spec}.{ts,tsx,js}` → nenhum resultado; `back/vitest.config.ts` existe e `back/package.json` define scripts `test`/`test:run`/`coverage`; `front/package.json` não tem script de teste.
- **Interpretação:** a infraestrutura de teste existe no back, mas nenhum comportamento é registrado como evidência.
- **Hipótese:** os contratos atuais (e os findings deste documento) não têm rede de regressão.
- **Impacto:** qualquer mudança semântica pode quebrar comportamento silenciosamente.
- **Arquivos afetados:** monorepo inteiro.
- **Recomendação:** primeiro conjunto de testes (vitest + supertest) cobrindo auth e natter como contrato declarado.

---

## P3 — Clareza e manutenibilidade

### F-11 — DELETE 204 com corpo

- **Evidência:** `back/src/modules/natter/natter-controller.ts:21-29` responde `204` + `send({message: "Deleted"})`; Express descarta o corpo em 204.
- **Interpretação:** o contrato declara um corpo que nunca chega ao cliente.
- **Impacto:** confusão para quem consome a API.
- **Recomendação:** `res.status(204).end()` ou usar 200 com corpo.

### F-12 — Naming divergente

- **Evidência:** `back/src/modules/natter/natter-controller.ts` expõe `findAllMessage` (singular) enquanto `natter-service.ts:25` e o repositório usam `findAllMessages` (plural); `natter-types.ts:4` mistura `space_id` (snake) com `content` (camel) no mesmo tipo.
- **Impacto:** leitura ambígua do fluxo.
- **Recomendação:** unificar plural/singular e convenção de nomes por camada.

### F-13 — Migration com nome enganoso

- **Evidência:** `back/migrations/1777260392910_create-users-table.ts` não cria a tabela `users` — cria roles, `spaces` e `messages` (a tabela `users` vem em `1778005676735_users.ts`).
- **Impacto:** histórico de schema difícil de seguir.
- **Recomendação:** documentar ou renomear a migration (node-pg-migrate permite renomear com cuidado).

### F-14 — Interface diverge do schema real

- **Evidência:** `back/migrations/1778005676735_users.ts:9` cria coluna `createdat`; `back/src/shared/auth/user-repository.ts:4` declara `created_at` na interface `User`.
- **Interpretação:** `SELECT *` devolve `createdat`, mas o código lê `created_at` — o campo nunca é populado corretamente.
- **Impacto:** `created_at` é `undefined` em todo usuário retornado.
- **Recomendação:** nova migration renomeando `createdat` → `created_at` (ou ajustar a interface).

### F-15 — Variável de ambiente morta

- **Evidência:** `.env` define `JWT_SECRET`, mas `back/src/shared/auth/jwt-service.ts:5-10` usa chaves RSA (`certs/private.pem`/`public.pem`).
- **Impacto:** configuração enganosa.
- **Recomendação:** remover `JWT_SECRET` do `.env`.

### F-16 — Configuração duplicada e campo morto no front

- **Evidência:** `front/src/pages/auth/Login.tsx:12` e `front/src/pages/auth/Register.tsx:10` hardcodam `https://localhost:3000`; `Register.tsx:57` renderiza input EMAIL sem estado/binding.
- **Impacto:** mudança de porta/URL exige editar 2 arquivos; campo de e-mail promete o que não envia.
- **Recomendação:** centralizar a base URL da API (constante/helper) e decidir entre implementar ou remover o campo e-mail.

---

## Lacunas de evidência (não são findings)

- Nenhum teste existe para confirmar ou refutar os contratos declarados (ver F-17).
- O comportamento de `owner`/`author` como identidade (F-01) só pode ser **provado** por um teste que envie `author` divergente da sessão — recomendado como primeiro teste.
- A expiração do cookie/JWT (15min) não tem comportamento definido no front (F-09) — sem UI, é hipótese, não fato.