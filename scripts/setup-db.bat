@echo off
REM e-VACCIN Database Setup Script for Windows
REM This script sets up the database with Prisma

echo 🗄️  Setting up e-VACCIN database...

cd backend

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call npx prisma generate

REM Run migrations
echo 🔄 Running database migrations...
call npx prisma migrate dev --name init

REM Seed database (optional)
echo 🌱 Seeding database...
call npx prisma db seed

echo ✅ Database setup completed!
echo You can now view your database with: npx prisma studio
