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
        MID["cors → express.json → httpLogger(requestId) → helmet → cookieParser → auditMiddleware"]
        AUTH["/auth: register · login"]
        NAT["/natter: message CRUD · space CRUD (exige cookie)"]
        ERR["globalErrorHandler → JSON {error:{message}}"]
        RL["rate-limit: leitura 100 · escrita 20 (15min)"]
    end

    subgraph DB["PostgreSQL (board)"]
        T1["users"]
        T2["spaces"]
        T3["messages"]
        T4["audit_logs"]
    end

    UI -->|"fetch credentials:'include'"| AUTH
    AUTH -->|"Set-Cookie: token"| CK
    CK -.->|"envio automático"| NAT
    MID --> ERR
    NAT --> DB
    AUTH --> DB
    MID --> DB
```

## 2. Sequência register → login (o caminho do cookie)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Front (5173)
    participant A as API (3000)
    participant D as PostgreSQL

    Note over U,D: REGISTER
    F->>A: POST /auth/register {username, password}
    A->>D: SELECT * FROM users WHERE username
    alt já existe
        A-->>F: 409 {"error":{"message":"Username already exists"}}
    else
        A->>A: bcrypt.hash(password, 10)
        A->>D: INSERT INTO users
        A-->>F: 201 {"message":"User created"} — SEM cookie
        F->>F: navigate('/login')
    end

    Note over U,D: LOGIN
    F->>A: POST /auth/login {username, password} (credentials:'include')
    A->>D: SELECT * FROM users
    A->>A: bcrypt.compare → signToken RS256 (15min)
    A-->>F: 200 {"message":"Login successful"} + Set-Cookie token (HttpOnly, SameSite=strict, secure só em prod, maxAge 15min)
    Note over F: Browser guarda o cookie (JS não consegue ler — HttpOnly)<br/>navigate('/home') ⚠
```

## 3. O que cada endpoint retorna

| Endpoint | Auth | Body | Sucesso | Erros |
|---|---|---|---|---|
| POST `/auth/register` | — | `{username, password}` | **201** `{message:"User created"}` | 409 `Username already exists` |
| POST `/auth/login` | — | `{username, password}` | **200** `{message:"Login successful"}` + **Set-Cookie `token`** | 401 `Invalid credentials` |
| POST `/natter/message` | cookie | `{content, space_id, author}` | **200** `{id, author, msg_time, msg_text, space_id}` | 400 · 401 · 429 |
| GET `/natter/message` | cookie | — | **200** `[{id, msg_time, msg_text}]` ⚠ sem author/space_id | 401 |
| GET `/natter/message/:id` | cookie | — | **200** `{id, author, msg_time, msg_text, space_id}` | 401 · 422 |
| PUT `/natter/message/:id` | cookie | `{content}` | **200** `{...message}` | 400 (content vazio) · 404 · 401 |
| DELETE `/natter/message/:id` | cookie | — | **204** corpo vazio | 401 |
| POST `/natter/space` | cookie | `{name, owner}` | **200** `{id, name, owner}` | 400 · 401 · 429 |
| GET `/natter/space` | cookie | — | **200** `[{id, name, owner}]` | 401 |
| GET `/natter/space/:id` | cookie | — | **200** `{id, name, owner}` | 401 · 422 |
| DELETE `/natter/space/:id` | cookie | — | **204** | 401 |

## 4. Cookies / localStorage

- **Único mecanismo de sessão: cookie `token`** (JWT RS256, 15min), setado pelo back no login. `HttpOnly` → o JS do front não lê nem altera; o browser envia sozinho nas requests para `localhost:3000`.
- **localStorage: não existe** em nenhum arquivo do front (`useAuth.ts` está vazio; Home é estática).
- O front **nunca chama** os endpoints `/natter` — o cookie é setado mas não é exercitado pela UI hoje.

## 5. Problemas reais que os diagramas expõem (front)

1. `Login.tsx:20` navega para `/home`, mas o `App.tsx` só tem `/`, `/login`, `/register` → tela em branco após login
2. `Login.tsx:23` e `Register.tsx:20` leem `data.message`, mas a API retorna `{error:{message}}` → erro nunca aparece na tela
3. Campo "email" do Register não envia nada; back só usa username/password