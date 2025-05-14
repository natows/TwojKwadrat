FROM node:18-alpine

ENV NEXT_DISABLE_TURBOPACK=true

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]
