# syntax=docker/dockerfile:1

FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json tsconfig*.json .eslintrc.cjs vitest*.config.ts ./
COPY apps ./apps
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build
RUN npm prune --omit=dev || npm install --omit=dev

FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/middleware/src/interfaces/http/openapi ./dist/apps/middleware/src/interfaces/http/openapi
USER nonroot
EXPOSE 3000
CMD ["dist/apps/middleware/src/main.js"]
