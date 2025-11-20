FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

RUN npm install --save-dev @types/pg

# Copy prisma schema
COPY prisma ./prisma

# Copy the rest of the code
COPY . .

# Generate Prisma client into /generated/prisma
RUN npx prisma generate

# Build TypeScript → JavaScript
RUN npm run build

# Cloud Run listens on PORT env
ENV PORT=8080
EXPOSE 8080

# Run the built JS file, not the TS source
CMD ["node", "dist/index.js"]
