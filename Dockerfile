# syntax=docker/dockerfile:1

# ---------- deps: todas las dependencias (para compilar) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build: compila Next.js ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- prod-deps: solo dependencias de producción ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
# tzdata para que TZ=America/New_York funcione dentro del contenedor
RUN apk add --no-cache tzdata
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.mjs tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
COPY content ./content
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]
