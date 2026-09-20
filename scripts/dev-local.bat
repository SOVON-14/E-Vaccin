@echo off
REM e-VACCIN Local Development Script without Docker
echo ====================================================
echo   e-VACCIN - Demarrage Local (Node.js)
echo ====================================================

echo.
echo [1/2] Pour lancer le Backend API (NestJS sur http://localhost:3001) :
echo       cd backend
echo       npm run start:dev
echo.
echo [2/2] Pour lancer le Frontend Web (Vite sur http://localhost:3000) :
echo       cd frontend
echo       npm run dev
echo.
echo Note : Assurez-vous d'avoir une instance PostgreSQL accessible
echo        configuree dans backend/.env (DATABASE_URL)
echo.
pause
