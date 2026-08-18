# Fluxos de dados e da API

## 1. Fluxo de dados geral

```mermaid
flowchart TD
    subgraph Browser["Browser — React (localhost:5173)"]
        UI["Login.tsx | Register.tsx | Home.tsx"]
        CK["Cookie 'token' (HttpOnly) — guardado e enviado pelo browser"]
        LS["localStorage: NÃO USADO"]
    end

    subgraph API["Express (HTTPS localhost:3000)"]
        MID["requestContext → cors → express.json(100kb) → httpLogger(requestId) → helmet → no-store → cookieParser → auditMiddleware"]
        AUTH["/auth: register · login · logout"]
        NAT["/natter: message CRUD · space CRUD (exige cookie + authenticate)"]
        ERR["globalErrorHandler → JSON {error:{message}}"]
        RL["rate-limit (RATE_LIMIT_ENABLED): leitura 100 · escrita 20 · login 20/username (15min)"]
    end

    subgraph DB["PostgreSQL (board)"]
        T1["users"]
        T2["spaces"]
        T3["messages"]
        T4["audit_logs"]
        T5["token_denylist (jti revogados)"]
    end

    UI -->|"fetch credentials:'include'"| AUTH
    AUTH -->|"Set-Cookie: token (login)"| CK
    AUTH -->|"logout: jti → token_denylist + clearCookie"| T5
    CK -.->|"envio automático"| NAT
    MID --> ERR
    NAT --> DB
    AUTH --> DB
    MID --> DB
```

## 2. Sequência register → login → logout

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Front (5173)
    participant A as API (3000)
    participant D as PostgreSQL

    Note over U,D: REGISTER
    F->>A: POST /v1/auth/register {username, password}
    A->>D: SELECT * FROM users WHERE username
    alt já existe
        A-->>F: 409 {"error":{"message":"Username already exists"}}
    else
        A->>A: zod valida · bcrypt.hash(password, 10)
        A->>D: INSERT INTO users
        A-->>F: 201 {"message":"User created"} — SEM cookie
        F->>F: navigate('/login')
    end

    Note over U,D: LOGIN
    F->>A: POST /v1/auth/login {username, password} (credentials:'include')
    A->>D: SELECT * FROM users
    A->>A: bcrypt.compare → JWT RS256 {iss, aud, jti, userId, username, exp} (15min)
    A-->>F: 200 {"message":"Login successful"} + Set-Cookie token (HttpOnly, SameSite=strict, secure só em prod, maxAge 15min)
    Note over F: Browser guarda o cookie (JS não consegue ler — HttpOnly)<br/>navigate('/home') — rota existe em App.tsx

    Note over U,D: LOGOUT
    F->>A: POST /v1/auth/logout (cookie enviado automaticamente)
    A->>A: verify token → extrai jti
    A->>D: INSERT INTO token_denylist (jti, user_id, expires_at)
    A-->>F: 200 {"message":"Logged out"} + clearCookie
    Note over A: JWT reusado após logout → 401 (authenticate consulta a deny-list)
```

## 3. O que cada endpoint retorna

| Endpoint | Auth | Body/Query | Sucesso | Erros |
|---|---|---|---|---|
| POST `/v1/auth/register` | — | `{username, password}` (zod, strict) | **201** `{message:"User created"}` | 400 validação · 409 `Username already exists` |
| POST `/v1/auth/login` | — | `{username, password}` | **200** `{message:"Login successful"}` + **Set-Cookie `token`** | 400 · 401 `Invalid credentials` · 429 |
| POST `/v1/auth/logout` | cookie (opcional) | — | **200** `{message:"Logged out"}` + revoga o token | — |
| POST `/v1/natter/message` | cookie | `{content, space_id}` (`author` vem da sessão) | **200** `{id, author, content, msg_time, space_id}` | 400 · 401 · 429 |
| GET `/v1/natter/message?limit&offset` | cookie | `limit` 1–100 (default 20), `offset` ≥ 0 | **200** `[{id, author, content, msg_time, space_id}]` | 400 query inválida · 401 |
| GET `/v1/natter/message/:id` | cookie | — | **200** `{id, author, content, msg_time, space_id}` | 400 id inválido · 401 · 404 (não é seu) |
| PUT `/v1/natter/message/:id` | cookie | `{content}` | **200** `{...message}` | 400 · 401 · 404 |
| DELETE `/v1/natter/message/:id` | cookie | — | **204** corpo vazio | 400 · 401 · 404 |
| POST `/v1/natter/space` | cookie | `{name}` (`owner` vem da sessão) | **200** `{id, name, owner}` | 400 · 401 · 429 |
| GET `/v1/natter/space?limit&offset` | cookie | idem message | **200** `[{id, name, owner}]` | 400 · 401 |
| GET `/v1/natter/space/:id` | cookie | — | **200** `{id, name, owner}` | 400 · 401 · 404 |
| DELETE `/v1/natter/space/:id` | cookie | — | **204** | 400 · 401 · 404 |

## 4. Sessão, JWT e cookies

- **Único mecanismo de sessão: cookie `token`** (JWT RS256, 15min), setado pelo back no login. `HttpOnly` → o JS do front não lê nem altera; o browser envia sozinho nas requests para `localhost:3000`.
- **Contrato do token (claims)**: `iss` = `JWT_ISSUER` (default `natter-api`), `aud` = `JWT_AUDIENCE` (default `natter-web`), `jti` (UUID único por login), `userId`, `username`, `iat`, `exp`. `verify` valida assinatura (RS256 fixo), `iss`, `aud` e `exp`.
- **Revogação**: `logout` insere o `jti` na tabela `token_denylist` (expira junto com o token); `authenticate` rejeita com 401 qualquer token presente na deny-list.
- **localStorage: não existe** em nenhum arquivo do front; `Home` é estática e o front **nunca chama** os endpoints `/natter` hoje.
- **Rate limit** (flag `RATE_LIMIT_ENABLED=true`): chave = `userId` quando autenticado, IP quando anônimo; login limitado por username+IP; 429 em formato `{error:{message}}` com header `Retry-After`.

## 5. Notas sobre o front (verificadas no código)

1. `Login.tsx:21` navega para `/home` e `App.tsx:10` define a rota `/home` — funcionando.
2. `Login.tsx:24` e `Register.tsx:21` leem `data.error?.message` — bate com o formato `{error:{message}}` da API.
3. `Register.tsx` não possui campo email; o back valida `username`/`password` com zod (400 + detalhes).
4. O front não exercita `/natter` — cookie de sessão é setado, mas não há UI consumindo as rotas protegidas.