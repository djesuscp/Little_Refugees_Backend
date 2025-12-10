FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compilar TypeScript
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start"]

