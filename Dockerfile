FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install type definitions for pg
RUN npm install --save-dev @types/pg

# Copy the prisma folder first (with .env placeholder)
COPY prisma ./prisma

# Copy the rest of the app **excluding prisma** to avoid overwriting
COPY . .

# Generate Prisma client (will now see prisma/.env)
RUN npx prisma generate

# Build TypeScript → JavaScript
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
