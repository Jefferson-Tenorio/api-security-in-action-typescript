# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM node:22-alpine AS runtime
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
# certs/ (TLS certificate + RSA signing keys) is excluded by .dockerignore
# and must be provided at runtime (volume mount); secrets are never baked
# into the image.
CMD ["node", "dist/index.js"]