#!/bin/sh

# Ensure the data directory exists
mkdir -p /app/data

# Run database migrations/sync
npx prisma db push

# Start the WhatsApp integration service in the background
node whatsapp-service.js &

# Start the Next.js production server
npm run start
