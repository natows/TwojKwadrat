FROM node:18-alpine

WORKDIR /app

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_DISABLE_TURBOPACK=true
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

COPY package.json package-lock.json* ./

RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev"]