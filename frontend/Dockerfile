# FROM --platform=${BUILDPLATFORM:-linux/amd64} node:18-alpine AS base


# FROM base AS dev-deps
# WORKDIR /app
# RUN apk add --no-cache libc6-compat
# COPY package.json package-lock.json* ./
# RUN npm ci && npm cache clean --force


# FROM base AS development
# WORKDIR /app

# ARG BUILDPLATFORM
# ARG TARGETPLATFORM
# ENV NODE_ENV=development
# ENV NEXT_DISABLE_TURBOPACK=true
# ENV WATCHPACK_POLLING=true
# ENV CHOKIDAR_USEPOLLING=true
# ENV PORT=3000

# COPY --from=dev-deps /app/node_modules ./node_modules
# COPY . .

# EXPOSE ${PORT}
# CMD ["npm", "run", "dev"]


FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci  

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]