# ============================================================
# EasyCheck backend — imagen multi-stage
#   1. build  : compila TypeScript -> dist/ con todas las deps
#   2. deps   : instala SOLO dependencias de producción
#   3. runtime: node:22-alpine liviano con dist/ + node_modules prod
# node:22 = LTS activo, mismo major que el entorno de desarrollo.
# ============================================================

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
# El checkout puede venir de Windows (CRLF). Alpine interpreta el \r del
# shebang como parte del ejecutable y falla con "no such file or directory".
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
EXPOSE 3000
# Secuencia: esperar Postgres -> seed idempotente -> node dist/main.js
ENTRYPOINT ["./docker-entrypoint.sh"]
