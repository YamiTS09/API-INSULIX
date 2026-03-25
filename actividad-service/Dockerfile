FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Compilar TypeScript
RUN npm run build

EXPOSE 3003

CMD ["npm", "start"]
