FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm@10.4.1
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm build
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node dist/index.js"]
