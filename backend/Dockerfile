FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# RUN npm install cors

# Generar Prisma Client dentro del contenedor
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "dev"]
