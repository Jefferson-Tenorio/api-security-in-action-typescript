# Node

## Install - Node.js via Node Version Manager

Node Version Manager allows you to install and switch between Node versions. Once installed, verify it by running `node -v`.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

nvm install --lts
nvm use --lts
```

We recommend running `echo "22" > .nvmrc` so that when you run `nvm use`, it automatically switches to your specified version.

Now you can run your file:

```bash
node index.js
```

## The package manager - pnpm

First, enable the native package manager manager included in recent versions of Node.js by running `corepack enable`. After that:

```bash
corepack prepare pnpm@latest --activate

pnpm -v
```

## package.json

The `package.json` file declares and standardizes a Node.js project's environment, dependencies, and commands, ensuring it runs consistently across any machine.

```bash
pnpm init
```

Change it to the ESM standard by adding `"type": "module"` so you can use `import`/`export`, and add your initial scripts. Below is a list of essential and useful ones.

### Essential scripts

```bash
"dev":   "node --watch --env-file .env src/index.js",
"start": "node --env-file .env src/index.js"
"test": "node --test"
```

The `--watch` flag works like `nodemon`, and `--env-file .env` injects your environment variables. The `start` script is more production-friendly.

### Useful scripts

```bash
"debugging": "node --inspect src/index.js",
"warning": "node --no-warnings src/index.js",
"performance": "node --trace-gc src/index.js",
"diagnosis": "node --cpu-prof src/index.js",
"test": "node --test"
```

### Run and have fun

```bash
pnpm dev
```

The final package.json for only node.js is:

```json
{
  "name": "board",
  "version": "1.0.0",
  "type": "module",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "node --watch --env-file .env src/index.js",
    "start": "node --env-file .env src/index.js",
    "test": "node --test"
  },
  "keywords": [],
  "author": "Jefferson",
  "license": "MIT",
  "packageManager": "pnpm@10.33.2"
}
```

# Typescript

Uma vez completado a instalação acima do node, vamos instalar o typescript, via pnpm.

```bash
pnpm add -D typescript tsx @types/node
```

O tsx roda .ts sem precisar compilar antes enquanto types/nodes é forma do typescript se comunicar com node.

Agora, para iniciar o `tsconfig`

```bash
pnpm tsc --init
```

Você deve configurar ele corretamente, depois eu faço uma documentação dele. Mas aqui está o padrão:

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "target": "esnext",
    "lib": ["esnext"],
    "types": ["node"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Agora você deve trocar os scripts para rodarem o typescript utilizando o tsc e o tsx.

```json
"dev": "tsx --watch src/index.ts",
"dev:env":    "tsx --watch --env-file .env src/index.ts",
"build": "tsc -p tsconfig.build.json",
"start": "node dist/index.js",
"type-check": "tsc --noEmit"
```

Você deve ter em mente que na hora de buildar você não ira quere passar tudo para a dist, você deve criar um tsconfig.build.json para isso e colocar isso:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist"]
}
```

# ViTest

Instale o runner de testes e o plugin de cobertura, que dira metricas dos testes.

```bash
pnpm add -D vitest @vitest/coverage-v8
```

E adcione os novos scripts no seu packge.json

```json
  "test":     "vitest",
  "test:run": "vitest --run",
  "coverage": "vitest run --coverage"
```

Configuração é a parte mais importante do seu test.
crie manualmente, um vitest.config.ts.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
```

O seu editor e o pnpm type-check vão parar de entender os arquivos de teste — erros de tipo nos testes não serão detectados, imports do Vitest vão aparecer como desconhecidos.
Então, crie um tsconfigu.build.json e adcione os arquivos, é padrão internacional.

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

## Overview

### Commun mactches:

```javascript
// Equality
expect(value).toBe(42); // strict equality (===)
expect(value).toEqual({ a: 1 }); // deep equality (objects/arrays)

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(0);
expect(value).toBeLessThanOrEqual(100);
expect(value).toBeCloseTo(0.3, 5); // floating point

// Strings
expect(str).toContain('hello');
expect(str).toMatch(/^hello/);

// Arrays
expect(arr).toHaveLength(3);
expect(arr).toContain(42);
expect(arr).toEqual(expect.arrayContaining([1, 2]));

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('message');
expect(() => fn()).toThrow(TypeError);

// Async
await expect(promise).resolves.toBe(42);
await expect(promise).rejects.toThrow('error');
```

### Lifecycles Hooks

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';

describe('database', () => {
  beforeAll(async () => {
    // runs once before all tests in this describe
    await db.connect();
  });

  afterAll(async () => {
    // runs once after all tests in this describe
    await db.disconnect();
  });

  beforeEach(() => {
    // runs before each individual test
  });

  afterEach(() => {
    // runs after each individual test
  });

  it('inserts a record', async () => {
    // ...
  });
});
```

### Mocking

#### Function Mock

```typescript
import { vi, expect, it } from 'vitest';

it('calls the callback', () => {
  const callback = vi.fn();
  runWithCallback(callback);
  expect(callback).toHaveBeenCalledOnce();
  expect(callback).toHaveBeenCalledWith('expected-arg');
});
```

#### Module Mock

```typescript
import { vi, it, expect } from 'vitest';
import { sendEmail } from './email.js';

vi.mock('./email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

it('sends a welcome email', async () => {
  await registerUser('user@example.com');
  expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'Welcome');
});
```

#### spy on existing function

```typescript
import { vi, it, expect } from 'vitest';
import * as fs from 'node:fs';

it('reads the config file', () => {
  const spy = vi.spyOn(fs, 'readFileSync').mockReturnValue('mocked content');
  loadConfig();
  expect(spy).toHaveBeenCalledWith('./config.json', 'utf-8');
  spy.mockRestore(); // always restore after spying
});
```

# Bonus

Após todos eles configurados juntos, você pode começar a programar, com ajuda ainda minha.

```bash
mkdir -p src && cat > src/index.ts << 'EOF'
export function helloWorld(): string {
  return 'Hello World';
}
EOF

cat > src/index.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { helloWorld } from './index.js';

describe('helloWorld', () => {
  it('returns Hello World', () => {
    expect(helloWorld()).toBe('Hello World');
  });
});
EOF
```

And gitingore.

```bash
node_modules/
dist/
coverage/
.env
*.js.map
```

comming soon:

env.example
ESLint + Prettier
Variáveis de ambiente tipadas
Path aliases
Docker
GitHub Actions (CI)

# Eslint and pritter.

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-perfectionist eslint-config-prettier prettier @vitest/eslint-plugin
```

Instalado. Agora cria os dois arquivos de configuração.

**1. ESLint — cria `eslint.config.js` na raiz:**

```bash
cat > eslint.config.js << 'EOF'
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import perfectionist from 'eslint-plugin-perfectionist';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  perfectionist.configs['recommended-natural'],
  prettier,
  {
    files: ['**/*.test.ts'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules,
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
);
EOF
```

**2. Prettier — cria `.prettierrc` na raiz:**

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
EOF
```

Depois adiciona os scripts no `package.json`:

```json
"lint":       "eslint .",
"lint:fix":   "eslint --fix .",
"format":     "prettier --write .",
"format:check": "prettier --check ."
```

Cola o output de qualquer erro que aparecer.

# OpenSSL

É um projeto open source que implementa protocolos de comunicação segura (TLS/SSL) e uma biblioteca de criptgrafia de propósito geral, acompanhado de ferramentas de linhas de comando.

Composto por:
- libcrypto -> AES, RSA, ECC, SHA, HMAC..., gera chaves, assinatura digital e funções de hash.
- libssl -> implementação de protocolos (TSL 1.2/1.3), handshake, negociação de cifra, gerenciamento de sessão segura.
- cli -> interface, gerar certificados, testar conexão TLS, criptografar e descriptgrafar dados.

Principais comandos:

Gerar par de chaves RSA 2048:
```bash
# gera a chave privada
openssl genrsa -out private.pem 2048
# extrai a chave pública da privada
openssl rsa -in private.pem -pubout -out public.pem
```

Confirmar se o par de chaves gera o mesmo valor:
```bash
# confirmar que o par bate — os dois devem gerar o mesmo hash
openssl rsa -in private.pem -pubout | openssl md5
openssl rsa -in public.pem -pubin | openssl md5
```

Usos:
```javascript
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as TokenPayload;
}
```


# mkcert

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

Agora você habilita essa configuração para dentro do server.ts

```javascript
const options = {
  key:  fs.readFileSync('localhost+1-key.pem'),
  cert: fs.readFileSync('localhost+1.pem'),
};

const app = new App();
const port = Number(process.env.PORT) || 3000;

https.createServer(options, app.instance).listen(port, () => {
  console.log(`HTTPS rodando em https://localhost:${port}`);
});
```

# CORs & Helmet

Segurança http.


## Roadmaps

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://roadmap.sh/typescript)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://roadmap.sh/javascript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://roadmap.sh/nodejs)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://roadmap.sh/nextjs)
[![Backend](https://img.shields.io/badge/Backend-0A0A0A?style=for-the-badge&logo=server&logoColor=white)](https://roadmap.sh/backend)

