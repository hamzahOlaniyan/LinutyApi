# Use Node.js 20 Alpine
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install --save-dev @types/pg

# Copy prisma first (with .env placeholder)
COPY prisma ./prisma

# Copy the rest of your app
COPY . .

# # Set DATABASE_URL for Prisma generation
# # You can either hardcode a placeholder or use ARG/ENV
# ARG DATABASE_URL
# ENV DATABASE_URL=$DATABASE_URL
# Set a dummy DATABASE_URL just for prisma generate
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Run the compiled app
CMD ["node", "dist/index.js"]
