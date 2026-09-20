#!/bin/bash

# e-VACCIN Build Script
# This script builds the entire project for production

echo "🔨 Building e-VACCIN for production..."

# Build backend
echo "📦 Building backend..."
cd backend
npm install
npm run build
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build completed!"
echo "Backend build: backend/dist"
echo "Frontend build: frontend/dist"
