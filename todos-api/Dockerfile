FROM node:14-alpine

EXPOSE 8082

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .

CMD ["sh", "-c", "npm start" ]
