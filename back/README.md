# API Security in Action

A hands-on implementation of 'API Security in Action' by Neil Madden, built in TypeScript. Covers authentication, authorization, rate limiting, security configs and real decisions behind building secure APIs

## Table of Contents

1. [Overview](#overview)
2. [Setup](./docs/setup.md)
3. [OpenSSL](#openssl)
4. [Mkcert](#mkcert)
5. [CORs & Helmet](#cors--helmet)
6. [Migrations](#migrations)

## OpenSSL

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

## Roadmaps

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://roadmap.sh/typescript)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://roadmap.sh/javascript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://roadmap.sh/nodejs)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://roadmap.sh/nextjs)
[![Backend](https://img.shields.io/badge/Backend-0A0A0A?style=for-the-badge&logo=server&logoColor=white)](https://roadmap.sh/backend)
