FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm@10.4.1
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node", "dist/index.js"]
