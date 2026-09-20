@echo off
REM e-VACCIN Build Script for Windows
REM This script builds the entire project for production

echo 🔨 Building e-VACCIN for production...

REM Build backend
echo 📦 Building backend...
cd backend
call npm install
call npm run build
cd ..

REM Build frontend
echo 🎨 Building frontend...
cd frontend
call npm install
call npm run build
cd ..

echo ✅ Build completed!
echo Backend build: backend\dist
echo Frontend build: frontend\dist
