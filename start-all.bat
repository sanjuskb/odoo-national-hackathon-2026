@echo off
echo ========================================================
echo  Brightloop Subscription Management System
echo  Odoo National-Level Hackathon 2026
echo ========================================================
echo Starting Backend API Server (Port 5000)...
start "Brightloop Backend (Port 5000)" cmd /k "cd backend && npm start"

echo Starting Frontend Web App (Port 5173)...
start "Brightloop Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Application running at:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:5000/api/v1
echo.
echo Verified Supabase Demo Accounts:
echo   - Admin:    smoke-admin@example.com   / Admin2026!
echo   - Customer: customer@brightloop.io    / Customer2026!
echo ========================================================

