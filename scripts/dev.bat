@echo off
REM e-VACCIN Development Script for Windows
REM This script starts all development services

echo 🚀 Starting e-VACCIN development environment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Start Docker containers
echo 📦 Starting Docker containers...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check if services are running
echo 🔍 Checking service status...
docker-compose ps

echo ✅ Development environment started!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:3001
echo 📚 API Documentation: http://localhost:3001/api/docs
echo 🗄️  Database Admin: http://localhost:8080
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
