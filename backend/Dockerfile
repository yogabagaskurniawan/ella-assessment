FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 3000

# Jalankan seed (yang sudah handle existing data) langsung start server
# Migration dijalankan manual atau saat pertama setup
CMD ["sh", "-c", "bun run src/db/seed.ts && bun run src/index.ts"]