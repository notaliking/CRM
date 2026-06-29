FROM node:20-slim

WORKDIR /app

# Install openssl (required by Prisma Client on Linux)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Make start script executable
RUN chmod +x start.sh

# Expose port 3000 for Next.js
EXPOSE 3000

# Set environment variables for production and persistent data path
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/dev.db
ENV SESSIONS_DIR=/app/data/sessions

# Run start script
CMD ["./start.sh"]
