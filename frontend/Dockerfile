# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .
RUN npm run build

# ---- Runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and required files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm","start"]
