FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3333

# Cria as tabelas, insere o cardápio inicial (se o banco estiver vazio) e sobe a API
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/server.js"]
