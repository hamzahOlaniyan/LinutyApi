FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

RUN npm install --save-dev @types/pg

# Copy source code
COPY . .

RUN npx prisma generate

# Build TypeScript → JavaScript
RUN npm run build

# Cloud Run listens on PORT env
ENV PORT=8080
EXPOSE 8080

# Run the built JS file, not the TS source
CMD ["node", "dist/index.js"]
