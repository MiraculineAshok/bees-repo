#!/bin/bash

# Start the Bees Interview Platform with PostgreSQL database connection
export DATABASE_URL="postgresql://neondb_owner:npg_dI2XKrE5lcbZ@ep-crimson-field-adzgxrr5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

echo "🚀 Starting Bees Interview Platform with PostgreSQL database..."
echo "📍 Database: Neon PostgreSQL"
echo "🌐 Server: http://localhost:3001"
echo ""

npm start