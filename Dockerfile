# # Use Node.js 20 Alpine
# FROM node:20-alpine

# WORKDIR /app

# # Install dependencies
# COPY package*.json ./

# RUN npm install
# # RUN npm install --save-dev @types/pg

# # Copy prisma first (with .env placeholder)
# COPY prisma ./prisma

# # Copy the rest of your app
# COPY . .

# # Set a dummy DATABASE_URL just for prisma generate
# ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# # Generate Prisma client
# RUN npx prisma generate

# # Build TypeScript
# RUN npm run build

# # Cloud Run port
# ENV PORT=8080
# EXPOSE 8080

# # Run the compiled app
# CMD ["node", "dist/index.js"]

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# RUN npm install
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install

COPY prisma ./prisma
COPY . .

# only for prisma generate during build
ARG DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev 

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# If you need prisma schema at runtime (usually not), also copy /prisma

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
