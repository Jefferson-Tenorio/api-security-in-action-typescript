# Natter — API Security in Action (TypeScript)

Projeto de estudo adaptado do livro *API Security in Action* (Neil Madden), implementado em TypeScript.
O foco é entender autenticação segura além do uso básico de JWT:

- tokens opacos com validação no banco de dados
- tokens stateless com JWT e assinatura `RS256`
- cookies `httpOnly` + `SameSite=Strict`
- `express-rate-limit` para brute force
- `bcrypt` com salt para senhas seguras em repouso

## Tecnologias

- Node.js + Express
- TypeScript
- PostgreSQL
- bcrypt
- jsonwebtoken (RS256)
- cookie-parser
- express-rate-limit
- helmet
- vitest
- pnpm

## O que está neste projeto

- autenticação com cookies seguros
- JWT `RS256` assinado e verificado matematicamente
- proteção CSRF com `SameSite=Strict`
- proteção XSS com cookie `httpOnly`
- rate limiting para login e endpoints críticos
- senhas armazenadas com `bcrypt`
- arquitetura modular e middleware de segurança

## Pré-requisitos

- Node.js 22+ (recomendado via `nvm`)
- pnpm
- PostgreSQL local ou via Docker
- OpenSSL (opcional para gerar chaves RSA)

## Instalação

### Backend

```bash
cd back
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

### Frontend (opcional)

```bash
cd front
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

## Configuração do ambiente

Crie ou ajuste `back/.env` com as variáveis abaixo:

```env
JWT_SECRET=minha_chave_super_secreta_123
PORT=3000

POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=board

DATABASE_URL=postgres://admin:admin@localhost:5432/board
```

> O backend já contém chaves RSA de desenvolvimento em `back/private.pem` e `back/public.pem`.

## Banco de dados

### Usando Docker Compose

```bash
cd back
docker-compose up -d
```

### Sem Docker

Verifique se o PostgreSQL está rodando localmente e que `DATABASE_URL` aponta para o banco correto.

## Gerar chaves RSA

Para gerar um par RSA novo:

```bash
cd back
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

> Em produção, mantenha a chave privada fora do código e fora do controle de versão.

## Rodar a aplicação

### Desenvolvimento backend

```bash
cd back
pnpm dev
```

### Build e execução local backend

```bash
cd back
pnpm build
pnpm start
```

### Rodar com ambiente carregado

```bash
cd back
pnpm dev:env
```

## Testes

```bash
cd back
pnpm test
pnpm test:run
pnpm coverage
```

## Lint e formatação

```bash
cd back
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

## Frontend (opcional)

```bash
cd front
pnpm dev
```

## Endpoints principais

- `POST /auth/register` — criar usuário
- `POST /auth/login` — login e criação de cookie seguro
- `POST /auth/logout` — encerrar sessão
- `GET /natter` — rota protegida de exemplo

## Segurança aplicada

- `RS256` com chave privada no servidor
- validação JWT com chave pública
- cookie `httpOnly` para mitigar XSS
- `SameSite=Strict` para mitigar CSRF
- `express-rate-limit` para força bruta
- senha com `bcrypt` e salt

## Documentação adicional

- `back/docs/setup.md` — guia de setup de Node/TypeScript/Vitest
- `back/tsconfig.json` e `back/tsconfig.build.json` — configuração TypeScript
- `back/vitest.config.ts` — configuração de testes

---

Projeto feito para estudar autenticação e segurança real em APIs usando TypeScript.

