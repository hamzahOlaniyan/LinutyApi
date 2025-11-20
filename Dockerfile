FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install type definitions for pg (optional)
RUN npm install --save-dev @types/pg

# Copy the prisma folder FIRST (so prisma/.env is available)
COPY prisma ./prisma

# Copy the rest of the source code
COPY . .

# Generate Prisma client (needs prisma/.env)
RUN npx prisma generate

# Build TypeScript → JavaScript
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
