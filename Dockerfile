# Imagem de produção do FisioTrainer para rodar localmente com `docker compose up`
# (mesmo `next build` + `next start` da Vercel). Segredos NÃO entram na imagem: vêm do
# `.env` via `env_file` no docker-compose.yml.

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# `postinstall` roda `prisma generate`, que precisa do schema e de uma URL qualquer.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm ci

FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variáveis NEXT_PUBLIC_* são embutidas no bundle no build.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://build:build@localhost:5432/build"
# Sem `npm run build`: aquele script roda `migrate deploy`, e no build não há banco.
RUN npx prisma generate && npx next build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=build /app ./
EXPOSE 3000
# `npm start` = `prisma migrate deploy && next start`.
CMD ["npm", "start"]
