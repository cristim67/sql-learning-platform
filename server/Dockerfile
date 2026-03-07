FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

# Copy prisma and generate client
COPY prisma ./prisma
RUN bunx prisma generate

# Copy source
COPY . .

# Run migrations and start
EXPOSE 3001
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/index.ts"]
