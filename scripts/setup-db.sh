#!/bin/bash

# e-VACCIN Database Setup Script
# This script sets up the database with Prisma

echo "🗄️  Setting up e-VACCIN database..."

cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init

# Seed database (optional)
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database setup completed!"
echo "You can now view your database with: npx prisma studio"
