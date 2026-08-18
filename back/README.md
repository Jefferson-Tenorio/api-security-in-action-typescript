# API Security in Action

A hands-on implementation of 'API Security in Action' by Neil Madden, built in TypeScript. Covers authentication, authorization, rate limiting, security configs and real decisions behind building secure APIs

## Table of Contents

1. [Overview](#overview)
2. [OpenSSL](#openssl)
3. [Mkcert](#mkcert)
4. [CORs & Helmet](#cors--helmet)
5. [JWT](#jwt)
6. [Rate limiting](#rate-limiting)
7. [Migrations](#migrations)
8. [Project Structure](#project-structure)

## OpenSSL

É um projeto open source que implementa protocolos de comunicação segura (TLS/SSL) e uma biblioteca de criptgrafia de propósito geral, acompanhado de ferramentas de linhas de comando.

Composto por:

- libcrypto -> AES, RSA, ECC, SHA, HMAC..., gera chaves, assinatura digital e funções de hash.
- libssl -> implementação de protocolos (TSL 1.2/1.3), handshake, negociação de cifra, gerenciamento de sessão segura.
- cli -> interface, gerar certificados, testar conexão TLS, criptografar e descriptgrafar dados.

Principais comandos:

Gerar par de chaves RSA 2048 (na pasta `back/certs/`):

```bash
mkdir -p certs
# gera a chave privada
openssl genrsa -out certs/private.pem 2048
# extrai a chave pública da privada
openssl rsa -in certs/private.pem -pubout -out certs/public.pem
```

Confirmar se o par de chaves gera o mesmo valor:

```bash
# confirmar que o par bate — os dois devem gerar o mesmo hash
openssl rsa -in certs/private.pem -pubout | openssl md5
openssl rsa -in certs/public.pem -pubin | openssl md5
```

Usos:

```javascript
export function sign(payload: TokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    audience: 'natter-web',
    expiresIn: 15 * 60 * 1000, // ms
    issuer: 'natter-api',
    jwtid: crypto.randomUUID(),
  });
}

export function verify(token: string): VerifiedToken {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    audience: 'natter-web',
    issuer: 'natter-api',
  }) as VerifiedToken;
}
```

## mkcert

Antes disso você instala o mkcert

```bash
# Instala o mkcert
sudo apt install mkcert
# Habilita o certutil para funcionar no Firefox/Chrome
sudo apt install libnss3-tools
# Criou e instalou a CA local no sistema
mkcert -install
# Gere os certificados mkcert localhost 127.0.0.1, para seu localhost.
mkcert localhost 127.0.0.1
```

Isso gerou os dois arquivos:

- localhost+1.pem — o certificado
- localhost+1-key.pem — a chave privada

Mova-os para a pasta `certs/` junto com as chaves JWT (`private.pem`/`public.pem`):

```bash
mkdir -p certs && mv localhost+1.pem localhost+1-key.pem certs/
```

> A pasta `certs/` está no `.gitignore` — nada de chaves/certificados sobe para o git.

Agora você habilita essa configuração para dentro do server.ts

```javascript
const options = {
  key: fs.readFileSync('localhost+1-key.pem'),
  cert: fs.readFileSync('localhost+1.pem'),
};

const app = new App();
const port = Number(process.env.PORT) || 3000;

https.createServer(options, app.instance).listen(port, () => {
  console.log(`HTTPS rodando em https://localhost:${port}`);
});
```

## CORs & Helmet

Segurança http.

## JWT

- Algoritmo fixo RS256 (nunca HS256) com chaves RSA em `back/certs/`.
- Claims emitidos: `iss` (`JWT_ISSUER`, default `natter-api`), `aud` (`JWT_AUDIENCE`, default `natter-web`), `jti` (UUID por login), `userId`, `username`, `iat`, `exp`.
- `verify` valida assinatura + `iss` + `aud` + `exp`; `authenticate` também consulta a deny-list de `jti` (tabela `token_denylist`) — token revogado via `logout` → 401.
- TTL: `JWT_EXPIRES_IN_MS` (default 15min).

## Rate limiting

- Desligado por padrão; habilite em produção com `RATE_LIMIT_ENABLED=true` (variável lida no boot).
- Janela: 15 minutos. Chave: `userId` quando autenticado, IP quando anônimo.
- Limites: leitura 100 req / escrita 20 req / login 20 por `username`+IP.
- Ultrapassou → **429** `{error:{message:"Too many requests"}}` + header `Retry-After`.

## Migrations

Antes de rodar o servidor pela primeira vez (ou sempre que houver novas migrations), aplique-as no banco:

```bash
pnpm migrate:up
```

Depois, inicie o servidor:

```bash
pnpm dev:env
```

> O servidor espera as tabelas `users`, `spaces`, `messages` e `audit_logs` existirem no banco — sem rodar `migrate:up`, os endpoints retornam `500`.

## Project Structure

```
back/
├── certs/                  # chaves e certificados (gitignored)
│   ├── private.pem         # chave privada JWT (RS256)
│   ├── public.pem          # chave pública JWT (RS256)
│   ├── localhost+1.pem     # certificado TLS (mkcert)
│   └── localhost+1-key.pem # chave privada TLS (mkcert)
├── docs/                   # documentação (auditoria, plano de segurança, fluxos)
├── migrations/             # migrations SQL (node-pg-migrate)
├── src/
│   ├── index.ts            # entrypoint HTTPS
│   ├── app.ts              # montagem do Express (middlewares + rotas)
│   ├── config/
│   │   └── env.ts          # variáveis de ambiente tipadas
│   ├── modules/            # módulos de domínio
│   │   ├── auth/           # register/login/logout, JWT, deny-list, authenticate
│   │   ├── audit_log/      # auditoria de requisições (middleware + repo)
│   │   └── natter/         # domínio principal (controller/service/repo/router/types)
│   ├── security/           # suíte de testes de segurança (BOLA, JWT, revogação, rate limit…)
│   └── shared/
│       ├── context/        # AsyncLocalStorage (requestId por request)
│       ├── db/             # conexões PostgreSQL (user/admin)
│       ├── error/          # HttpError + globalErrorHandler
│       ├── http/           # httpLogger
│       └── utils/          # async-handler, rate-limit
├── .env                    # variáveis locais (gitignored) — veja .env.example
├── .env.example            # modelo das variáveis necessárias
├── database.json           # config do node-pg-migrate
├── docker-compose.yml      # Postgres local
└── Dockerfile
```

Cada módulo segue o mesmo padrão: `controller` (HTTP) → `service` (regras de negócio) → `repository` (SQL) → `router` (rotas), montados por um `*-module.ts`.

## Documentação

- [Fluxos](./docs/fluxos.md) — diagramas de dados, fluxo da API e contratos de endpoints
- [Auditoria de segurança](./docs/auditoria.md) — achados com evidência no código e status por fase
- [Plano de segurança](./docs/plano-seguranca.md) — fases P2–P4 e método de trabalho

## Roadmaps

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://roadmap.sh/typescript)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://roadmap.sh/javascript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://roadmap.sh/nodejs)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://roadmap.sh/nextjs)
[![Backend](https://img.shields.io/badge/Backend-0A0A0A?style=for-the-badge&logo=server&logoColor=white)](https://roadmap.sh/backend)
